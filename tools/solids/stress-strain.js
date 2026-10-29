
    function solve_hooke() {
      const err = document.getElementById("err");
      err.textContent = "";

      const e = val("e_mod"), s = val("stress"), ep = val("strain");
      const known = [e, s, ep].filter(function (x) { return x !== null; }).length;
      if (known !== 2) { err.textContent = "fill exactly two of E, sigma, epsilon"; return; }

      let ove = e, ovs = s, ovep = ep;
      if (e === null) { if (ep === 0) { err.textContent = "epsilon is zero"; return; } ove = s / ep; }
      else if (s === null) { ovs = e * ep; }
      else if (ep === null) { if (e === 0) { err.textContent = "E is zero"; return; } ovep = s / e; }

      const lines = [
        ["young's modulus E", fmt(ove, 6) + " Pa"],
        ["stress &sigma;", fmt(ovs, 6) + " Pa"],
        ["strain &epsilon;", fmt(ovep, 6)]
      ];

      const f = val("force"), a = val("area");
      if (f !== null && a !== null) {
        if (a <= 0) { err.textContent = "area must be positive"; return; }
        lines.push(["&sigma; from F/A", fmt(f / a, 6) + " Pa"]);
      } else if (f !== null || a !== null) {
        err.textContent = "enter both F and A, or neither";
        return;
      }

      render_lines("lines", lines);
    }

    function draw_fig_hooke() {
      const el = document.getElementById("fig-hooke");
      const note = document.getElementById("fig-hooke-note");
      if (!el || !window.fig) return;

      fig.sweep(el, {
        input: "stress",
        min: 1000000.0,
        max: 400000000.0,
        steps: 44,
        solve: "solve_hooke",
        defaults: { e_mod: "200e9" },
        clear: ["strain", "force", "area"],
        outputs: [{ match: "strain", name: "eps", cls: "fig-line" }],
        x_label: "stress",
        x_unit: "Pa",
        y_label: "strain",
        width: 560,
        height: 300,
        note: function (cur, row) {
          const v = row && row.vals ? row.vals : {};
          return ("Strain " + (v.eps||0).toExponential(3) + " at this stress.");
        }
      });
    }

    fig.auto_draw(function () { draw_fig_hooke(); });
