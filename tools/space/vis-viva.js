
    function solve_visviva() {
      const err = document.getElementById("err");
      err.textContent = "";

      const r = val("r"), a = val("a"), mu = val("mu") || 3.986e14;
      if (r === null || a === null) { err.textContent = "fill r and a"; return; }
      if (r <= 0 || a <= 0 || mu <= 0) { err.textContent = "r, a, and mu must be positive"; return; }

      const inside = 2 / r - 1 / a;
      if (inside < 0) { err.textContent = "no real speed: 2/r must be at least 1/a"; return; }

      render_lines("lines", [
        ["speed v", fmt(Math.sqrt(mu * inside), 6) + " m/s"],
        ["circular speed at r (a = r)", fmt(Math.sqrt(mu / r), 6) + " m/s"]
      ]);
    }

    function draw_fig_visviva() {
      const el = document.getElementById("fig-visviva");
      const note = document.getElementById("fig-visviva-note");
      if (!el || !window.fig) return;

      fig.sweep(el, {
        input: "r",
        min: 6570000.0,
        max: 42610000.0,
        steps: 44,
        solve: "solve_visviva",
        defaults: { a: "26560000", mu: "398600441800000" },
        outputs: [
          { match: "speed v", name: "v", cls: "fig-line", unit: "m/s", label: "orbital speed" },
          { match: "circular speed", name: "vc", cls: "fig-third", unit: "m/s", label: "circular speed at r" }
        ],
        x_label: "orbital radius",
        x_unit: "m",
        y_label: "orbital speed",
        y_unit: "m/s",
        width: 560,
        height: 300,
        note: function (cur, row, ctx) {
          const samples = (ctx && ctx.samples) ? ctx.samples : [];
          let pick = null, best = Infinity;
          for (const s of samples) {
            if (!s || !s.vals) continue;
            const dd = Math.abs(s.x - 6771000);
            if (dd < best) { best = dd; pick = s; }
          }
          const pv = pick ? pick.vals : ((row && row.vals) ? row.vals : {});
          const px = pick ? pick.x : cur;
          return ("At an orbital radius of " + fmt(px, 6) + " m the vis-viva equation gives an orbital speed of " +
            fmt(pv.v, 6) + " m/s, while the circular speed for the same radius would be " +
            fmt(pv.vc, 6) + " m/s.");
        }
      });
    }

    fig.auto_draw(function () { draw_fig_visviva(); });
