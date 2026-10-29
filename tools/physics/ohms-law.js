
    function solve_ohm() {
      const err = document.getElementById("err");
      err.textContent = "";

      const v = val("volt"), i = val("curr"), r = val("res");
      const known = [v, i, r].filter(function (x) { return x !== null; }).length;
      if (known !== 2) { err.textContent = "leave exactly one of V, I, R blank"; return; }

      let ov = v, oi = i, or = r;
      if (v === null) { ov = i * r; }
      else if (i === null) { if (r === 0) { err.textContent = "R is zero"; return; } oi = v / r; }
      else if (r === null) { if (i === 0) { err.textContent = "I is zero"; return; } or = v / i; }

      const p = ov * oi;
      render_lines("lines", [
        ["voltage", fmt(ov, 6) + " V"],
        ["current", fmt(oi, 6) + " A"],
        ["resistance", fmt(or, 6) + " &Omega;"],
        ["power P = VI", fmt(p, 6) + " W"]
      ]);
    }

    function draw_fig_ohm() {
      const el = document.getElementById("fig-ohm");
      const note = document.getElementById("fig-ohm-note");
      if (!el || !window.fig) return;

      const v = val("volt"), i = val("curr"), r = val("res");
      let resistance = r;
      if (resistance === null && v !== null && i !== null && i !== 0) resistance = v / i;
      if (resistance === null) resistance = 10;
      if (!(resistance > 0)) {
        if (note) note.textContent = "Enter a positive resistance or a nonzero voltage and current.";
        return;
      }

      const v_max = Math.max(v !== null && v > 0 ? v : 10, 1);
      const i_max = v_max / resistance;
      fig.plot(el, {
        width: 560, height: 310,
        x: { label: "voltage", unit: "V", min: 0, max: v_max },
        y: { label: "current", unit: "A", min: 0, max: i_max },
        y2: { label: "power", unit: "W", min: 0, max: v_max * i_max },
        series: [
          { fn: function (vv) { return vv / resistance; }, xmin: 0, xmax: v_max, cls: "fig-line", label: "I = V/R" },
          { fn: function (vv) { return vv * vv / resistance; }, xmin: 0, xmax: v_max, cls: "fig-third", axis: "y2", label: "P = V^2/R" }
        ],
        driver: false
      });
      if (note) note.textContent = "For R = " + fig.num_fmt(resistance) + " Ω, current grows linearly with voltage while power grows quadratically.";
    }

    fig.auto_draw(function () { draw_fig_ohm(); });
