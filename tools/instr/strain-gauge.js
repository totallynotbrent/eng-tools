
    function solve_gauge() {
      const err = document.getElementById("err");
      err.textContent = "";

      const config = document.getElementById("config").value;
      const gf = val("gf"), ratio = val("ratio");
      if (gf === null || ratio === null) { err.textContent = "fill GF and Vout/Vex"; return; }
      if (gf <= 0) { err.textContent = "GF must be positive"; return; }

      const arms = config === "quarter" ? 1 : config === "half" ? 2 : 4;
      const strain = 4 * ratio / (gf * arms);
      const lines = [["strain &epsilon;", fmt(strain, 6)]];

      const e = val("e_mod");
      if (e !== null) lines.push(["stress &sigma;", fmt(e * strain, 6) + " Pa"]);

      render_lines("lines", lines);
    }

    function draw_fig_gauge() {
      const el = document.getElementById("fig-gauge");
      const note = document.getElementById("fig-gauge-note");
      if (!el || !window.fig) return;

      fig.sweep(el, {
        input: "ratio",
        min: 0.0001,
        max: 0.01,
        steps: 44,
        solve: "solve_gauge",
        defaults: { gf: "2", e_mod: "200000000000" },
        outputs: [
          { match: "strain &epsilon;", name: "eps", cls: "fig-line", unit: "", label: "measured strain" },
          { match: "stress &sigma;", name: "sig", cls: "fig-third", unit: "Pa", label: "stress", axis: "y2" }
        ],
        x_label: "bridge output ratio Vout/Vex",
        x_unit: "V/V",
        y_label: "measured strain",
        y_unit: "",
        y2_label: "stress",
        y2_unit: "Pa",
        width: 560,
        height: 300,
        note: function (cur, row, ctx) {
          const samples = (ctx && ctx.samples) ? ctx.samples : [];
          let pick = null, best = Infinity;
          for (const s of samples) {
            if (!s || !s.vals) continue;
            const dd = Math.abs(s.x - 0.002);
            if (dd < best) { best = dd; pick = s; }
          }
          const pv = pick ? pick.vals : ((row && row.vals) ? row.vals : {});
          const px = pick ? pick.x : cur;
          const sel = document.getElementById("config");
          const kind = sel && sel.options ? sel.options[sel.selectedIndex].text : "quarter bridge";
          return ("On the " + kind + " a bridge ratio of " + fmt(px, 6) + " V/V reads a strain of " +
            fmt(pv.eps, 6) + " and a stress of " + fmt(pv.sig, 6) + " Pa.");
        }
      });
    }

    fig.auto_draw(function () { draw_fig_gauge(); });
