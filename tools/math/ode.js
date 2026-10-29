
    function exact_y(a, b, y0, t) {
      if (a === 0) return y0 + b * t;
      return (y0 + b / a) * Math.exp(a * t) - b / a;
    }

    function solve_ode() {
      const err = document.getElementById("err");
      err.textContent = "";

      const a = val("coef"), b = val("const"), y0 = val("y0");
      const t0 = val("t0"), tf = val("tf"), n = val("steps");
      if (a === null || b === null || y0 === null || t0 === null || tf === null || n === null) {
        err.textContent = "fill every field";
        return;
      }
      if (n <= 0 || Math.floor(n) !== n) { err.textContent = "steps n must be a positive integer"; return; }
      if (tf <= t0) { err.textContent = "tf must be after t0"; return; }

      const h = (tf - t0) / n;
      let ye = y0, yr = y0, t = t0;
      for (let i = 0; i < n; i++) {
        ye = ye + h * (a * ye + b);
        const k1 = a * yr + b;
        const k2 = a * (yr + h / 2 * k1) + b;
        const k3 = a * (yr + h / 2 * k2) + b;
        const k4 = a * (yr + h * k3) + b;
        yr = yr + h / 6 * (k1 + 2 * k2 + 2 * k3 + k4);
        t += h;
      }
      const exact = exact_y(a, b, y0, tf - t0);

      render_lines("lines", [
        ["step size h", fmt(h, 6)],
        ["exact y(tf)", fmt(exact, 6)],
        ["euler y(tf)", fmt(ye, 6)],
        ["rk4 y(tf)", fmt(yr, 6)]
      ]);
    }

    function draw_fig_ode() {
      const el = document.getElementById("fig-ode");
      const note = document.getElementById("fig-ode-note");
      if (!el || !window.fig) return;
      const DEFAULTS = { coef: "1", const: "0", y0: "1", t0: "0", tf: "4", steps: "8" };
      const hv = fig.harvest(solve_ode, DEFAULTS);
      if (!hv.rows.length) {
        if (note) note.textContent = "fill every field.";
        return;
      }
      const get = function (frag) {
        for (let i = 0; i < hv.rows.length; i++) {
          if (hv.rows[i].label.toLowerCase().indexOf(frag) >= 0) return hv.rows[i].num;
        }
        return NaN;
      };
      const hex = get("exact"), eul = get("euler"), rk4 = get("rk4");
      const a = parseFloat(hv.values.coef), b = parseFloat(hv.values.const),
        y0 = parseFloat(hv.values.y0), t0 = parseFloat(hv.values.t0), tf = parseFloat(hv.values.tf);
      const steps = parseInt(hv.values.steps, 10);
      if (!isFinite(hex) || !isFinite(a) || !isFinite(b) || !isFinite(y0) ||
        !isFinite(t0) || !isFinite(tf) || !isFinite(steps)) {
        if (note) note.textContent = "fill every field.";
        return;
      }

      const h = (tf - t0) / steps;
      const ex = [], eu = [], rk = [];
      let ye = y0, yr = y0;
      ex.push([t0, y0]);
      eu.push([t0, y0]);
      rk.push([t0, y0]);
      for (let i = 0; i < steps; i++) {
        ye = ye + h * (a * ye + b);
        const k1 = a * yr + b;
        const k2 = a * (yr + h / 2 * k1) + b;
        const k3 = a * (yr + h / 2 * k2) + b;
        const k4 = a * (yr + h * k3) + b;
        yr = yr + h / 6 * (k1 + 2 * k2 + 2 * k3 + k4);
        const t = t0 + (i + 1) * h;
        eu.push([t, ye]);
        rk.push([t, yr]);
      }
      const NN = 120;
      for (let i = 0; i <= NN; i++) {
        const t = t0 + (tf - t0) * i / NN;
        ex.push([t, exact_y(a, b, y0, t - t0)]);
      }

      fig.plot(el, {
        width: 560,
        height: 320,
        x: { label: "time", unit: "s", min: t0, max: tf },
        y: { label: "y", unit: "" },
        series: [
          { pts: ex, cls: "fig-line", label: "exact" },
          { pts: eu, cls: "fig-third", label: "euler" },
          { pts: rk, cls: "fig-alt", label: "rk4" }
        ]
      });

      if (note) {
        note.textContent = "Step size h = " + fig.num_fmt(h) + ".  Exact end value " +
          fig.num_fmt(hex) + ", euler " + fig.num_fmt(eul) + " and rk4 " + fig.num_fmt(rk4) +
          ".  The coarse euler path bends away from the exact curve while rk4 stays on it.";
      }
    }

    fig.auto_draw(function () { draw_fig_ode(); });
