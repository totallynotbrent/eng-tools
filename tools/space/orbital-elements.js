
    function solve_elements() {
      const err = document.getElementById("err");
      err.textContent = "";

      const r = val("r"), v = val("v"), gamma = (val("gamma") || 0) * Math.PI / 180;
      const mu = val("mu") || 3.986e14;
      if (r === null || v === null) { err.textContent = "fill r and v"; return; }
      if (r <= 0 || mu <= 0) { err.textContent = "r and mu must be positive"; return; }

      const eps = v * v / 2 - mu / r;
      const h = r * v * Math.cos(gamma);
      const a = -mu / (2 * eps);
      const e2 = 1 + 2 * eps * h * h / (mu * mu);
      if (e2 < 0) { err.textContent = "unphysical state, check r, v, and gamma"; return; }
      const e = Math.sqrt(e2);

      const lines = [
        ["specific energy &epsilon;", fmt(eps, 6) + " J/kg"],
        ["specific angular momentum h", fmt(h, 6) + " m&sup2;/s"],
        ["semi-major axis a", fmt(a, 6) + " m"],
        ["eccentricity e", fmt(e, 6)]
      ];
      if (e < 1 && a > 0) {
        lines.push(["periapsis rp", fmt(a * (1 - e), 6) + " m"]);
        lines.push(["apoapsis ra", fmt(a * (1 + e), 6) + " m"]);
        lines.push(["period T", fmt(2 * Math.PI * Math.sqrt(a * a * a / mu), 6) + " s"]);
      } else {
        lines.push(["escape trajectory", "e >= 1, no bound orbit"]);
      }

      render_lines("lines", lines);
    }

    function draw_fig_orbit() {
      const el = document.getElementById("fig-orbit");
      const note = document.getElementById("fig-orbit-note");
      if (!el || !window.fig) return;

      fig.sweep(el, {
        input: "v",
        min: 3000.0,
        max: 12000.0,
        steps: 44,
        solve: "solve_elements",
        defaults: { r: "6771000.0", gamma: "0.0", mu: "398600441800000.0" },
        outputs: [{ match: "semi-major axis", name: "a", cls: "fig-line" }, { match: "eccentricity", name: "e", cls: "fig-third", axis: "y2" }],
        x_label: "orbital speed",
        x_unit: "m/s",
        y_label: "orbit size",
        y2_label: "eccentricity",
        width: 560,
        height: 300,
        note: function (cur, row) {
          const v = row && row.vals ? row.vals : {};
          return ("At this speed the orbit has a = " + (v.a||0).toExponential(3) + " m and e = " + (v.e||0).toFixed(4) + ".");
        }
      });
    }

    fig.auto_draw(function () { draw_fig_orbit(); });
