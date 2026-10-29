
    function solve_nozzle() {
      const err = document.getElementById("err");
      err.textContent = "";

      const pc = val("pc"), pe = val("pe"), g = val("gamma") || 1.2;
      if (pc === null || pe === null) { err.textContent = "fill pc and pe"; return; }
      if (pc <= 0 || pe <= 0 || pc <= pe) { err.textContent = "need pc > pe > 0"; return; }
      if (g <= 1) { err.textContent = "gamma must be greater than 1"; return; }

      const pr = pc / pe;
      const me = Math.sqrt((2 / (g - 1)) * (Math.pow(pr, (g - 1) / g) - 1));
      const term = (2 / (g + 1)) * (1 + (g - 1) / 2 * me * me);
      const aa = (1 / me) * Math.pow(term, (g + 1) / (2 * (g - 1)));

      render_lines("lines", [
        ["pressure ratio pc/pe", fmt(pr, 6)],
        ["exit mach Me", fmt(me, 6)],
        ["area ratio Ae/A*", fmt(aa, 6)]
      ]);
    }

    function draw_fig_nozzle() {
      const el = document.getElementById("fig-nozzle");
      const note = document.getElementById("fig-nozzle-note");
      if (!el || !window.fig) return;

      fig.sweep(el, {
        input: "pe",
        min: 1000.0,
        max: 101000.0,
        steps: 44,
        solve: "solve_nozzle",
        defaults: { pc: "101325", gamma: "1.4" },
        outputs: [
          { match: "pressure ratio", name: "pr", cls: "fig-line", unit: "", label: "pressure ratio pc/pe" },
          { match: "exit mach", name: "me", cls: "fig-third", unit: "", label: "exit mach Me", axis: "y2" },
          { match: "area ratio", name: "aa", cls: "fig-alt", unit: "", label: "area ratio Ae/A*", axis: "y2" }
        ],
        x_label: "exit pressure",
        x_unit: "Pa",
        y_label: "pressure ratio pc/pe",
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
          return ("At an exit pressure of " + fmt(px, 6) + " Pa the chamber-to-exit pressure ratio is " +
            fmt(pv.pr, 6) + ", giving an exit mach of " + fmt(pv.me, 6) +
            " and an area ratio of " + fmt(pv.aa, 6) + ".");
        }
      });
    }

    fig.auto_draw(function () { draw_fig_nozzle(); });
