
    function solve_torsion() {
      const err = document.getElementById("err");
      err.textContent = "";

      const t = val("torque"), l = val("length"), g = val("shear"), r = val("radius");
      if (t === null || l === null || g === null || r === null) { err.textContent = "fill all four fields"; return; }
      if (r <= 0 || g <= 0) { err.textContent = "radius and G must be positive"; return; }

      const j = Math.PI * Math.pow(r, 4) / 2;
      const phi = t * l / (g * j);
      const tmax = t * r / j;

      render_lines("lines", [
        ["polar moment J", fmt(j, 6) + " m&#8308;"],
        ["angle of twist &phi;", fmt(phi, 6) + " rad (" + fmt(phi * 180 / Math.PI, 6) + " &deg;)"],
        ["max shear &tau;max", fmt(tmax, 6) + " Pa"]
      ]);
    }

    function draw_fig_torsion() {
      const el = document.getElementById("fig-torsion");
      const note = document.getElementById("fig-torsion-note");
      if (!el || !window.fig) return;

      fig.sweep(el, {
        input: "torque",
        min: 10.0,
        max: 5000.0,
        steps: 44,
        solve: "solve_torsion",
        defaults: { length: "2", shear: "80000000", radius: "0.05" },
        outputs: [
          { match: "angle of twist", name: "phi", cls: "fig-line", unit: "rad", label: "angle of twist" },
          { match: "max shear", name: "tau", cls: "fig-third", unit: "Pa", label: "max shear stress", axis: "y2" }
        ],
        x_label: "applied torque",
        x_unit: "N m",
        y_label: "angle of twist",
        y_unit: "rad",
        y2_label: "max shear stress",
        y2_unit: "Pa",
        width: 560,
        height: 300,
        note: function (cur, row, ctx) {
          const samples = (ctx && ctx.samples) ? ctx.samples : [];
          let pick = null, best = Infinity;
          for (const s of samples) {
            if (!s || !s.vals) continue;
            const dd = Math.abs(s.x - 2505);
            if (dd < best) { best = dd; pick = s; }
          }
          const pv = pick ? pick.vals : ((row && row.vals) ? row.vals : {});
          const px = pick ? pick.x : cur;
          return ("An applied torque of " + fmt(px, 6) + " N m twists the shaft by " + fmt(pv.phi, 6) +
            " rad and puts the outer fibre at " + fmt(pv.tau, 6) + " Pa of shear stress.");
        }
      });
    }

    fig.auto_draw(function () { draw_fig_torsion(); });
