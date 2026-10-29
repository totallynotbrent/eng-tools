
    function solve_rocket() {
      const err = document.getElementById("err");
      err.textContent = "";

      const ve = val("ve"), m0 = val("m0"), mf = val("mf");
      if (ve === null || m0 === null || mf === null) { err.textContent = "fill ve, m0, and mf"; return; }
      if (ve <= 0 || m0 <= 0 || mf <= 0 || mf > m0) { err.textContent = "need ve > 0 and 0 < mf <= m0"; return; }

      const mr = m0 / mf;
      const dv = ve * Math.log(mr);
      const prop = m0 - mf;

      render_lines("lines", [
        ["mass ratio m0/mf", fmt(mr, 6)],
        ["propellant mass", fmt(prop, 4) + " kg"],
        ["ideal &Delta;v", fmt(dv, 6) + " m/s"]
      ]);
    }

    function draw_fig_rocket() {
      const el = document.getElementById("fig-rocket");
      const note = document.getElementById("fig-rocket-note");
      if (!el || !window.fig) return;

      fig.sweep(el, {
        input: "mf",
        min: 50.0,
        max: 20000.0,
        steps: 44,
        solve: "solve_rocket",
        defaults: { ve: "4500", m0: "20000" },
        outputs: [{ match: "ideal", name: "dv", cls: "fig-line" }],
        x_label: "final mass",
        x_unit: "kg",
        y_label: "delta-v",
        width: 560,
        height: 300,
        note: function (cur, row) {
          const v = row && row.vals ? row.vals : {};
          return ("Ideal delta-v at this final mass is " + (v.dv||0).toFixed(0) + " m/s.");
        }
      });
    }

    fig.auto_draw(function () { draw_fig_rocket(); });
