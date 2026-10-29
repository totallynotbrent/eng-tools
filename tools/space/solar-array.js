
    function solve_solar() {
      const err = document.getElementById("err");
      err.textContent = "";

      const p0 = val("p0"), years = val("years");
      const deg = val("deg") || 0.028;
      if (p0 === null || years === null) { err.textContent = "fill P0 and mission life"; return; }
      if (years < 0) { err.textContent = "mission life must be non-negative"; return; }

      const peol = p0 * Math.pow(1 - deg, years);
      const lines = [
        ["EOL power", fmt(peol, 6) + " W"],
        ["power lost", fmt(p0 - peol, 6) + " W"]
      ];

      const load = val("load");
      if (load !== null) {
        const margin = peol - load;
        lines.push(["EOL margin", fmt(margin, 6) + " W (" + fmt(peol / load, 4) + "x load)"]);
      }

      const eta = val("eta");
      if (eta !== null) {
        const flux = val("flux") || 1361;
        if (eta <= 0 || flux <= 0) { err.textContent = "eta and flux must be positive"; return; }
        const area = p0 / (eta * flux);
        lines.push(["array area for P0", fmt(area, 6) + " m&sup2;"]);
      }

      render_lines("lines", lines);
    }

    function draw_fig_solar() {
      const el = document.getElementById("fig-solar");
      const note = document.getElementById("fig-solar-note");
      if (!el || !window.fig) return;

      fig.sweep(el, {
        input: "years",
        min: 0.0,
        max: 15.0,
        steps: 44,
        solve: "solve_solar",
        defaults: { p0: "1000", deg: "0.028", load: "800", eta: "0.85", flux: "1361" },
        outputs: [
          { match: "EOL power", name: "peol", cls: "fig-line", unit: "W", label: "end-of-life power" },
          { match: "power lost", name: "plost", cls: "fig-third", unit: "W", label: "power lost" }
        ],
        x_label: "years in orbit",
        x_unit: "yr",
        y_label: "end-of-life power",
        y_unit: "W",
        width: 560,
        height: 300,
        note: function (cur, row, ctx) {
          const samples = (ctx && ctx.samples) ? ctx.samples : [];
          let pick = null, best = Infinity;
          for (const s of samples) {
            if (!s || !s.vals) continue;
            const dd = Math.abs(s.x - 10);
            if (dd < best) { best = dd; pick = s; }
          }
          const pv = pick ? pick.vals : ((row && row.vals) ? row.vals : {});
          const px = pick ? pick.x : cur;
          let p0 = NaN;
          for (const s of samples) {
            if (s && s.vals && isFinite(s.vals.peol) && s.x === 0) { p0 = s.vals.peol; break; }
          }
          let txt = ("After " + fmt(px, 4) + " years in orbit the array still delivers " +
            fmt(pv.peol, 6) + " W of end-of-life power.");
          if (isFinite(pv.plost)) txt += (" That is " + fmt(pv.plost, 6) + " W below the beginning-of-life rating.");
          if (isFinite(p0)) txt += (" It starts from " + fmt(p0, 6) + " W.");
          return txt;
        }
      });
    }

    fig.auto_draw(function () { draw_fig_solar(); });
