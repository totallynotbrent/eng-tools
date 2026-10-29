
    function solve_eff() {
      const err = document.getElementById("err");
      err.textContent = "";

      const mode = document.getElementById("mode").value;
      const gam = val("gamma"), ttin = val("ttin"), ttout = val("ttout"), ratio = val("ratio");
      if (gam === null || ttin === null || ttout === null || ratio === null) { err.textContent = "fill every field"; return; }
      if (gam <= 1 || ttin <= 0 || ratio <= 0) { err.textContent = "gamma > 1, positive temperatures and ratios"; return; }

      const e = (gam - 1) / gam;
      const lines = [];

      if (mode === "c") {
        if (ttout <= ttin) { err.textContent = "compressor exit temp must exceed inlet"; return; }
        if (ratio < 1) { err.textContent = "compressor pressure ratio must be >= 1"; return; }
        const eta = ttin * (Math.pow(ratio, e) - 1) / (ttout - ttin);
        if (eta <= 0 || eta > 1) { err.textContent = "these states are not a valid compressor (eta out of 0-1)"; return; }
        // polytropic efficiency: dTt/Tt = (e/eta) dpt/pt integrated to a single stage-equivalent
        const ep = Math.log(ratio) * e / Math.log(ttout / ttin);
        lines.push(["isentropic efficiency", fmt(eta, 5)]);
        lines.push(["polytropic efficiency", fmt(ep, 5)]);
        lines.push(["ideal exit temp at eta=1", fmt(ttin * Math.pow(ratio, e), 5) + " K"]);
      } else {
        if (ttout >= ttin) { err.textContent = "turbine exit temp must be below inlet"; return; }
        if (ratio > 1) { err.textContent = "turbine pressure ratio must be <= 1 (exit/inlet)"; return; }
        const eta = (ttin - ttout) / (ttin * (1 - Math.pow(ratio, e)));
        if (eta <= 0 || eta > 1) { err.textContent = "these states are not a valid turbine (eta out of 0-1)"; return; }
        const ep = Math.log(ttout / ttin) / (e * Math.log(ratio));
        lines.push(["isentropic efficiency", fmt(eta, 5)]);
        lines.push(["polytropic efficiency", fmt(ep, 5)]);
        lines.push(["ideal exit temp at eta=1", fmt(ttin * Math.pow(ratio, e), 5) + " K"]);
      }

      render_lines("lines", lines);
      document.getElementById("results").style.display = "";
    }

    function draw_fig_eff() {
      const el = document.getElementById("fig-eff");
      const note = document.getElementById("fig-eff-note");
      if (!el || !window.fig) return;
      const turbine = document.getElementById("mode").value === "t";
      const res = fig.sweep(el, {
        input: "ratio",
        min: turbine ? 0.05 : 1.02,
        max: turbine ? 0.53 : 40.0,
        steps: 44,
        solve: "solve_eff",
        defaults: turbine ? { gamma: "1.4", ttin: "1000", ttout: "840" } : { gamma: "1.4", ttin: "300", ttout: "900" },
        outputs: [
          { match: "isentropic efficiency", name: "ise", cls: "fig-line" },
          { match: "polytropic efficiency", name: "pe", cls: "fig-third" }
        ],
        x_label: turbine ? "exit / inlet pressure ratio" : "total pressure ratio",
        x_unit: "",
        y_label: "efficiency",
        width: 560,
        height: 300,
        note: function (cur, row) {
          const v = row && row.vals ? row.vals : {};
          return ("Isentropic efficiency " + (v.ise||0).toFixed(4) +
            (turbine ? " at this expansion ratio." : " at this pressure ratio."));
        }
      });
      if (note && !(res && res.series && res.series.length)) {
        note.textContent = turbine
          ? "give turbine states with the exit temperature below the inlet temperature"
          : "give compressor states with the exit temperature above the inlet temperature";
      }
    }

    fig.auto_draw(function () { draw_fig_eff(); });
