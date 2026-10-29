
    function solve_impulse() {
      const err = document.getElementById("err");
      err.textContent = "";

      const m = val("mass"), vi = val("vi"), vf = val("vf");
      if (m === null || vi === null || vf === null) { err.textContent = "fill m, vi, and vf"; return; }

      const dv = vf - vi;
      const dp = m * dv;
      const lines = [
        ["change in velocity &Delta;v", fmt(dv, 6) + " m/s"],
        ["momentum change &Delta;p", fmt(dp, 6) + " kg&middot;m/s"],
        ["impulse J", fmt(dp, 6) + " N&middot;s"]
      ];

      const f = val("force"), dt = val("dt");
      if (f !== null && dt !== null) {
        lines.push(["J from F&Delta;t", fmt(f * dt, 6) + " N&middot;s"]);
      } else if (f !== null || dt !== null) {
        err.textContent = "enter both F and dt, or neither";
        return;
      }

      render_lines("lines", lines);
    }

    function draw_fig_impulse() {
      const el = document.getElementById("fig-impulse");
      const note = document.getElementById("fig-impulse-note");
      if (!el || !window.fig) return;
      const DEFAULTS = { mass: "2.5", vi: "12", vf: "30", force: "150", dt: "0.3" };
      const hv = fig.harvest(solve_impulse, DEFAULTS);
      const rows = hv.rows;
      const num = function (frag) {
        for (let i = 0; i < rows.length; i++) {
          if (rows[i].label.toLowerCase().indexOf(frag) >= 0) return rows[i].num;
        }
        return NaN;
      };
      const dv = num("change in velocity"), dp = num("momentum change");
      const jj = num("impulse j");
      const vi = parseFloat(hv.values.vi), vf = parseFloat(hv.values.vf);
      if (!isFinite(dv) || vi === null || vf === null) {
        if (note) note.textContent = "enter a mass and initial and final speeds.";
        return;
      }
      const lo = Math.min(vi, vf), hi = Math.max(vi, vf);
      const padv = 0.22 * Math.max(hi - lo, 1);
      const dmn = lo - padv, dmx = hi + padv;

      fig.plot(el, {
        width: 560,
        height: 210,
        x: { label: "velocity", unit: "m/s", min: dmn, max: dmx },
        y: { label: "", unit: "", min: -1, max: 1 },
        series: [],
        points: [
          { x: vi, y: 0, label: "vi", cls: "fig-dot", r: 5, dx: -10, dy: -10 },
          { x: vf, y: 0, label: "vf", cls: "fig-dot", r: 5, dx: 10, dy: -10 },
          { x: (vi + vf) / 2, y: 0, label: "", cls: "fig-dot", r: 3 }
        ],
        arrows: [{
          x0: vi, y0: 0, x1: vf, y1: 0, cls: "fig-line", marker: "fig-arrow",
          label: "dv = " + fig.num_fmt(dv) + " m/s"
        }],
        labels: [{ text: "momentum change " + fig.num_fmt(dp) + " kg m/s", left: 10, top: -8 }]
      });

      if (note) {
        note.textContent = "Impulse equals the momentum change: " + fig.num_fmt(jj || dp) +
          " N s over a velocity change of " + fig.num_fmt(dv) + " m/s.";
      }
    }

    fig.auto_draw(function () { draw_fig_impulse(); });
