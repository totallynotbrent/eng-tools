
    function solve_second() {
      const err = document.getElementById("err");
      err.textContent = "";

      const zeta = val("zeta"), wn = val("wn");
      if (zeta === null || wn === null) { err.textContent = "fill zeta and wn"; return; }
      if (wn <= 0) { err.textContent = "wn must be positive"; return; }
      if (zeta >= 1) {
        render_lines("lines", [
          ["damping", "overdamped, no overshoot"],
          ["settling time (2%)", fmt(4 / (zeta * wn), 4) + " s"]
        ]);
        return;
      }

      const os = Math.exp(-Math.PI * zeta / Math.sqrt(1 - zeta * zeta)) * 100;
      const ts = 4 / (zeta * wn);

      render_lines("lines", [
        ["percent overshoot", fmt(os, 6) + " %"],
        ["settling time (2%)", fmt(ts, 4) + " s"]
      ]);
    }

    function draw_fig_second() {
      const el = document.getElementById("fig-second");
      const note = document.getElementById("fig-second-note");
      if (!el || !window.fig) return;

      fig.sweep(el, {
        input: "wn",
        min: 0.5,
        max: 20.0,
        steps: 44,
        solve: "solve_second",
        defaults: { zeta: "0.3" },
        outputs: [{ match: "settling time", name: "ts", cls: "fig-line" }, { match: "percent overshoot", name: "po", cls: "fig-third", axis: "y2" }],
        x_label: "natural frequency",
        x_unit: "rad/s",
        y_label: "settling time",
        y2_label: "overshoot",
        width: 560,
        height: 300,
        note: function (cur, row) {
          const v = row && row.vals ? row.vals : {};
          return ("Settling " + (v.ts||0).toFixed(3) + " s, overshoot " + (v.po||0).toFixed(2) + "%.");
        }
      });
    }

    fig.auto_draw(function () { draw_fig_second(); });
