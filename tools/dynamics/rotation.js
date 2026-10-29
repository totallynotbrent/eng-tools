
    function solve_rot() {
      const err = document.getElementById("err");
      err.textContent = "";

      const w0 = val("w0") || 0, a = val("alpha") || 0, t = val("tt") || 0;
      const lines = [];
      if (t !== null) {
        const w = w0 + a * t;
        const th = w0 * t + 0.5 * a * t * t;
        lines.push(["final &omega;", fmt(w, 6) + " rad/s"]);
        lines.push(["angular displacement &theta;", fmt(th, 6) + " rad (" + fmt(th / (2 * Math.PI), 6) + " rev)"]);
      }

      const rpm = val("rpm");
      if (rpm !== null) lines.push(["rpm in rad/s", fmt(rpm * 2 * Math.PI / 60, 6) + " rad/s"]);

      const inertia = val("inertia");
      if (inertia !== null && a !== null) {
        lines.push(["torque &tau; = I&alpha;", fmt(inertia * a, 6) + " N&middot;m"]);
      }

      if (!lines.length) { err.textContent = "fill at least one section"; return; }
      render_lines("lines", lines);
    }

    function draw_fig_rot() {
      const el = document.getElementById("fig-rot");
      const note = document.getElementById("fig-rot-note");
      if (!el || !window.fig) return;

      fig.sweep(el, {
        input: "alpha",
        min: -20.0,
        max: 20.0,
        steps: 44,
        solve: "solve_rot",
        defaults: { w0: "10", rpm: "120", inertia: "2", torque: "0", tt: "2" },
        outputs: [
          { match: "final &omega;", name: "wf", cls: "fig-line", unit: "rad/s", label: "final angular speed" },
          { match: "angular displacement &theta;", name: "th", cls: "fig-third", unit: "rad", label: "angular displacement", axis: "y2" }
        ],
        x_label: "angular acceleration",
        x_unit: "rad/s^2",
        y_label: "final angular speed",
        y_unit: "rad/s",
        y2_label: "angular displacement",
        y2_unit: "rad",
        width: 560,
        height: 300,
        note: function (cur, row, ctx) {
          const samples = (ctx && ctx.samples) ? ctx.samples : [];
          let pick = null, best = Infinity;
          for (const s of samples) {
            if (!s || !s.vals) continue;
            const dd = Math.abs(s.x - 5);
            if (dd < best) { best = dd; pick = s; }
          }
          const pv = pick ? pick.vals : ((row && row.vals) ? row.vals : {});
          const px = pick ? pick.x : cur;
          let lo_w = Infinity, hi_w = -Infinity, lo_t = Infinity, hi_t = -Infinity;
          for (const s of samples) {
            if (!s || !s.vals) continue;
            if (isFinite(s.vals.wf)) { if (s.vals.wf < lo_w) lo_w = s.vals.wf; if (s.vals.wf > hi_w) hi_w = s.vals.wf; }
            if (isFinite(s.vals.th)) { if (s.vals.th < lo_t) lo_t = s.vals.th; if (s.vals.th > hi_t) hi_t = s.vals.th; }
          }
          let txt = ("Over the acceleration sweep the final angular speed runs from " + fmt(lo_w, 4) +
            " to " + fmt(hi_w, 4) + " rad/s while the accumulated swing runs from " + fmt(lo_t, 4) +
            " to " + fmt(hi_t, 4) + " rad.");
          if (isFinite(pv.wf) && isFinite(pv.th)) {
            txt += (" At " + fmt(px, 4) + " rad/s^2 the shaft swings " + fmt(pv.th, 4) +
              " rad and ends at " + fmt(pv.wf, 4) + " rad/s.");
          }
          return txt;
        }
      });
    }

    fig.auto_draw(function () { draw_fig_rot(); });
