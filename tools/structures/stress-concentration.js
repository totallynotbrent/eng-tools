
    function solve_kt() {
      const err = document.getElementById("err");
      err.textContent = "";

      const snom = val("snom");
      let kt = val("kt");

      const d = val("d"), w = val("w");
      if (d !== null && w !== null) {
        if (w <= 0 || d <= 0 || d >= w) { err.textContent = "need 0 < d < w"; return; }
        const r = d / w;
        // peterson's fit for a circular hole in an infinite-width plate, widened for finite width
        kt = 3 - 3.13 * r + 3.66 * r * r - 1.53 * r * r * r;
      }

      if (snom === null) { err.textContent = "enter the nominal stress"; return; }
      if (kt === null) { err.textContent = "give Kt directly or both d and w for the hole"; return; }
      if (kt < 1) { err.textContent = "Kt must be at least 1"; return; }

      render_lines("lines", [
        ["stress concentration Kt", fmt(kt, 6)],
        ["peak stress &sigma;_max", fmt(kt * snom, 6) + " Pa"]
      ]);
    }

    function draw_fig_kt() {
      const el = document.getElementById("fig-kt");
      const note = document.getElementById("fig-kt-note");
      if (!el || !window.fig) return;

      fig.sweep(el, {
        input: "d",
        min: 0.001,
        max: 0.099,
        steps: 44,
        solve: "solve_kt",
        defaults: { snom: "100000000.0", w: "0.1" },
        outputs: [{ match: "stress concentration", name: "kt", cls: "fig-line" }, { match: "peak stress", name: "sig", cls: "fig-third", axis: "y2" }],
        x_label: "hole diameter d",
        x_unit: "m",
        y_label: "stress concentration",
        y2_label: "peak stress",
        width: 560,
        height: 300,
        note: function (cur, row) {
          const v = row && row.vals ? row.vals : {};
          return ("Kt = " + (v.kt||0).toFixed(3) + ", peak stress " + (v.sig||0).toExponential(3) + " Pa.");
        }
      });
    }

    fig.auto_draw(function () { draw_fig_kt(); });
