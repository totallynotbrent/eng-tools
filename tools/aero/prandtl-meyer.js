
    function prandtl_meyer(m, g) {
      const k = Math.sqrt((g + 1) / (g - 1));
      const m2m1 = Math.sqrt(m * m - 1);
      return k * Math.atan(m2m1 / k) - Math.atan(m2m1);
    }

    function solve_pm() {
      const err = document.getElementById("err");
      err.textContent = "";

      const m1 = val("m1"), theta_deg = val("theta"), g = val("gamma") || 1.4;
      if (m1 === null || theta_deg === null) { err.textContent = "fill M1 and theta"; return; }
      if (m1 < 1) { err.textContent = "expansion needs supersonic M1 >= 1"; return; }
      if (g <= 1) { err.textContent = "gamma must be greater than 1"; return; }

      const nu1 = prandtl_meyer(m1, g);
      const nu2 = nu1 + theta_deg * Math.PI / 180;
      const nu_max = (Math.PI / 2) * (Math.sqrt((g + 1) / (g - 1)) - 1);
      if (nu2 < 0 || nu2 > nu_max) { err.textContent = "deflection pushes past the vacuum limit"; return; }

      // invert nu(m) with bisection on mach from 1 to a large cap
      let lo = 1.0001, hi = 50;
      for (let i = 0; i < 80; i++) {
        const mid = (lo + hi) / 2;
        if (prandtl_meyer(mid, g) < nu2) lo = mid; else hi = mid;
      }
      const m2 = (lo + hi) / 2;

      render_lines("lines", [
        ["entry &nu;(M1)", fmt(nu1 * 180 / Math.PI, 6) + " &deg;"],
        ["exit &nu;(M2)", fmt(nu2 * 180 / Math.PI, 6) + " &deg;"],
        ["exit mach M2", fmt(m2, 6)]
      ]);
    }

    function draw_fig_pm() {
      const el = document.getElementById("fig-pm");
      const note = document.getElementById("fig-pm-note");
      if (!el || !window.fig) return;

      fig.sweep(el, {
        input: "m1",
        min: 1.05,
        max: 8.0,
        steps: 44,
        solve: "solve_pm",
        defaults: { theta: "15", gamma: "1.4" },
        outputs: [
          { match: "exit &nu;", name: "nu2", cls: "fig-line", unit: "deg", label: "exit turning angle" },
          { match: "exit mach", name: "m2", cls: "fig-third", unit: "", label: "exit mach M2", axis: "y2" }
        ],
        x_label: "inlet mach M1",
        x_unit: "",
        y_label: "exit turning angle",
        y_unit: "deg",
        y2_label: "exit mach M2",
        y2_unit: "",
        width: 560,
        height: 300,
        note: function (cur, row, ctx) {
          const samples = (ctx && ctx.samples) ? ctx.samples : [];
          let pick = null, best = Infinity;
          for (const s of samples) {
            if (!s || !s.vals) continue;
            const dd = Math.abs(s.x - 3);
            if (dd < best) { best = dd; pick = s; }
          }
          const pv = pick ? pick.vals : ((row && row.vals) ? row.vals : {});
          const px = pick ? pick.x : cur;
          return ("Starting at M1 = " + fmt(px, 4) + " the expansion fan turns the flow by " +
            fmt(pv.nu2, 4) + " deg and leaves it at M2 = " + fmt(pv.m2, 4) + ".");
        }
      });
    }

    fig.auto_draw(function () { draw_fig_pm(); });
