
    function solve_axial() {
      const err = document.getElementById("err");
      err.textContent = "";

      const p = val("load"), l = val("length"), a = val("area"), e = val("modulus");
      const alpha = val("alpha") || 0, dt = val("dt") || 0;
      if (p === null || l === null || a === null || e === null) { err.textContent = "fill P, L, A, and E"; return; }
      if (a <= 0 || e <= 0) { err.textContent = "A and E must be positive"; return; }

      const dmech = p * l / (a * e);
      const dtherm = alpha * l * dt;
      const sigma = p / a;

      render_lines("lines", [
        ["mechanical &delta;", fmt(dmech, 6) + " m"],
        ["thermal &delta;", fmt(dtherm, 6) + " m"],
        ["total &delta;", fmt(dmech + dtherm, 6) + " m"],
        ["axial stress &sigma;", fmt(sigma, 6) + " Pa"]
      ]);
    }

    function draw_fig_axial() {
      const el = document.getElementById("fig-axial");
      const note = document.getElementById("fig-axial-note");
      if (!el || !window.fig) return;

      fig.sweep(el, {
        input: "dt",
        min: -100.0,
        max: 200.0,
        steps: 44,
        solve: "solve_axial",
        defaults: { load: "50000", length: "2", area: "0.001", modulus: "200000000000", alpha: "0.000012" },
        outputs: [
          { match: "thermal &delta;", name: "dthm", cls: "fig-line", unit: "m", label: "thermal elongation" },
          { match: "mechanical &delta;", name: "dmec", cls: "fig-third", unit: "m", label: "elastic elongation", axis: "y2" }
        ],
        x_label: "temperature change",
        x_unit: "\u00b0C",
        y_label: "thermal elongation",
        y_unit: "m",
        y2_label: "elastic elongation",
        y2_unit: "m",
        width: 560,
        height: 300,
        note: function (cur, row, ctx) {
          const samples = (ctx && ctx.samples) ? ctx.samples : [];
          let pick = null, best = Infinity;
          for (const s of samples) {
            if (!s || !s.vals) continue;
            const dd = Math.abs(s.x - 100);
            if (dd < best) { best = dd; pick = s; }
          }
          const pv = pick ? pick.vals : ((row && row.vals) ? row.vals : {});
          const px = pick ? pick.x : cur;
          return ("A temperature change of " + fmt(px, 4) + " \u00b0C stretches the bar " +
            fmt(pv.dthm, 6) + " m thermally, while the tensile load holds a steady elastic extension of " +
            fmt(pv.dmec, 6) + " m.");
        }
      });
    }

    fig.auto_draw(function () { draw_fig_axial(); });
