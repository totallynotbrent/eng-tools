
    function solve_cf() {
      const err = document.getElementById("err");
      err.textContent = "";

      const pc = val("pc"), pe = val("pe"), pa = val("pa") || 0, g = val("gamma") || 1.2;
      if (pc === null || pe === null) { err.textContent = "fill pc and pe"; return; }
      if (pc <= 0 || pe <= 0 || pc <= pe) { err.textContent = "need pc > pe > 0"; return; }
      if (g <= 1) { err.textContent = "gamma must be greater than 1"; return; }

      const pr = pc / pe;

      // exit mach and area ratio from the isentropic pressure ratio
      const me = Math.sqrt((2 / (g - 1)) * (Math.pow(pr, (g - 1) / g) - 1));
      const term = (2 / (g + 1)) * (1 + (g - 1) / 2 * me * me);
      const aera_ratio = (1 / me) * Math.pow(term, (g + 1) / (2 * (g - 1)));

      // thrust coefficient: momentum term plus the pressure term
      const mom = Math.sqrt(2 * g * g / (g - 1) * Math.pow(2 / (g + 1), (g + 1) / (g - 1)) * (1 - Math.pow(pe / pc, (g - 1) / g)));
      const cf = mom + (pe - pa) / pc * aera_ratio;

      const lines = [
        ["exit mach Me", fmt(me, 6)],
        ["area ratio Ae/At", fmt(aera_ratio, 6)],
        ["thrust coefficient Cf", fmt(cf, 6)]
      ];

      const t0 = val("t0"), rg = val("rg");
      if (t0 !== null && rg !== null) {
        if (t0 <= 0 || rg <= 0) { err.textContent = "T0 and R must be positive"; return; }
        const Gamma = Math.sqrt(g) * Math.pow(2 / (g + 1), (g + 1) / (2 * (g - 1)));
        const cstar = Math.sqrt(g * rg * t0) / Gamma;
        lines.push(["characteristic velocity c*", fmt(cstar, 4) + " m/s"]);
      }

      render_lines("lines", lines);
    }

    function draw_fig_cf() {
      const el = document.getElementById("fig-cf");
      const note = document.getElementById("fig-cf-note");
      if (!el || !window.fig) return;

      fig.sweep(el, {
        input: "pe",
        min: 1000.0,
        max: 101000.0,
        steps: 44,
        solve: "solve_cf",
        defaults: { pc: "101325", pa: "0", t0: "288.15", rg: "287.05", gamma: "1.4" },
        outputs: [
          { match: "thrust coefficient", name: "cf", cls: "fig-line", unit: "", label: "thrust coefficient Cf" },
          { match: "exit mach", name: "me", cls: "fig-third", unit: "", label: "exit mach Me", axis: "y2" }
        ],
        x_label: "exit pressure",
        x_unit: "Pa",
        y_label: "thrust coefficient Cf",
        y_unit: "",
        y2_label: "exit mach Me",
        y2_unit: "",
        width: 560,
        height: 300,
        note: function (cur, row, ctx) {
          const samples = (ctx && ctx.samples) ? ctx.samples : [];
          let pick = null, best = Infinity;
          for (const s of samples) {
            if (!s || !s.vals) continue;
            const dd = Math.abs(s.x - 10000);
            if (dd < best) { best = dd; pick = s; }
          }
          const pv = pick ? pick.vals : ((row && row.vals) ? row.vals : {});
          const px = pick ? pick.x : cur;
          return ("At an exit pressure of " + fmt(px, 6) + " Pa the thrust coefficient is " +
            fmt(pv.cf, 6) + " at an exit mach of " + fmt(pv.me, 6) + ".");
        }
      });
    }

    fig.auto_draw(function () { draw_fig_cf(); });
