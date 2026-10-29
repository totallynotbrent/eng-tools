
    function solve_rc() {
      const err = document.getElementById("err");
      err.textContent = "";

      const r = val("res"), c = val("cap");
      if (r === null || c === null) { err.textContent = "enter R and C"; return; }
      if (r <= 0 || c <= 0) { err.textContent = "R and C must be positive"; return; }

      const tau = r * c;
      const lines = [["time constant &tau; = RC", fmt(tau, 6) + " s"]];

      const v0 = val("v0"), t = val("tt");
      if (v0 !== null && t !== null) {
        const charge = v0 * (1 - Math.exp(-t / tau));
        const discharge = v0 * Math.exp(-t / tau);
        lines.push(["V at t (charging)", fmt(charge, 6) + " V"]);
        lines.push(["V at t (discharging)", fmt(discharge, 6) + " V"]);
      }

      render_lines("lines", lines);
      draw_fig_rc();
    }

    function draw_fig_rc() {
      const el = document.getElementById("fig-rc");
      if (!el || !window.fig) return;
      const r0 = val("res"), c0 = val("cap");
      if (r0 === null || c0 === null || r0 <= 0 || c0 <= 0) {
        fig.seeded({ res: "1000", cap: "0.001", v0: "5" }, draw_fig_rc);
        return;
      }
      const r = val("res"), c = val("cap"), v0 = val("v0");
      const note = document.getElementById("fig-rc-note");
      if (r === null || c === null || r <= 0 || c <= 0) {
        if (note) note.textContent = "enter R and C to draw the charge curve.";
        return;
      }

      const tau = r * c;
      const v_init = v0 === null ? 1 : v0;
      const t_max = Math.max(5 * tau, tau);

      fig.plot(el, {
        width: 560,
        height: 310,
        x: { label: "time", unit: "s", min: 0, max: t_max },
        y: { label: "voltage", unit: "V", min: 0, max: v_init * 1.08 },
        series: [
          { fn: function (t) { return v_init * (1 - Math.exp(-t / tau)); }, xmin: 0, xmax: t_max, cls: "fig-line", label: "charging" },
          { fn: function (t) { return v_init * Math.exp(-t / tau); }, xmin: 0, xmax: t_max, cls: "fig-third", label: "discharging" }
        ],
        vlines: [{ x: tau, label: "tau" }],
        hlines: [{ y: v_init * (1 - Math.exp(-1)), label: "63%" }],
        marker: { x: tau, y: v_init * (1 - Math.exp(-1)), label: "tau = " + fig.num_fmt(tau) + " s" },
        driver: false
      });

      if (note) {
        note.textContent = "tau = RC = " + fig.num_fmt(tau) + " s;  after one tau the capacitor holds "
          + fig.num_fmt(v_init * (1 - Math.exp(-1)) * 100, 4) + "% of V0, and after five tau it is essentially full.";
      }
    }

    fig.auto_draw(function () { draw_fig_rc(); });
