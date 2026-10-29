
    function solve_reactions() {
      const err = document.getElementById("err");
      err.textContent = "";

      const L = val("len");
      if (L === null || L <= 0) { err.textContent = "enter a positive span"; return; }

      const loads = [];
      let total = 0;
      for (let i = 1; i <= 3; i++) {
        const p = val("p" + i), x = val("x" + i);
        if (p !== null && x !== null) {
          if (x < 0 || x > L) { err.textContent = "point load " + i + " must sit on the beam"; return; }
          loads.push([p, x]);
          total += p;
        } else if (p !== null || x !== null) {
          err.textContent = "point load " + i + " needs both a magnitude and a distance";
          return;
        }
      }

      const w = val("udl");
      if (w !== null) total += w * L;

      let sum_m = 0;
      for (const l of loads) sum_m += l[0] * l[1];
      if (w !== null) sum_m += w * L * L / 2;

      const by = sum_m / L;
      const ay = total - by;

      render_lines("lines", [
        ["reaction at A (Ay)", fmt(ay, 6) + " up"],
        ["reaction at B (By)", fmt(by, 6) + " up"],
        ["total downward load", fmt(total, 6)],
        ["moment about A", fmt(sum_m, 6)]
      ]);
    }

    function draw_fig_react() {
      const el = document.getElementById("fig-react");
      const note = document.getElementById("fig-react-note");
      if (!el || !window.fig) return;

      fig.sweep(el, {
        input: "x1",
        min: 0.0,
        max: 6.0,
        steps: 44,
        solve: "solve_reactions",
        defaults: { len: "6", p1: "1000", x2: "3", p2: "0", x3: "0", p3: "0", udl: "0" },
        outputs: [{ match: "reaction at A", name: "ay", cls: "fig-line" }, { match: "reaction at B", name: "by", cls: "fig-third", axis: "y2" }],
        x_label: "load position",
        x_unit: "m",
        y_label: "reaction at A",
        y2_label: "reaction at B",
        width: 560,
        height: 300,
        note: function (cur, row) {
          const v = row && row.vals ? row.vals : {};
          return ("Reaction at A " + (v.ay||0).toFixed(1) + " N, at B " + (v.by||0).toFixed(1) + " N.");
        }
      });
    }

    fig.auto_draw(function () { draw_fig_react(); });
