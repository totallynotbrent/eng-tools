
    function solve_servo() {
      const err = document.getElementById("err");
      err.textContent = "";

      const k_plant = val("k_plant"), tau = val("tau"), po = val("po"), tp = val("tp");
      if (k_plant === null || tau === null || po === null || tp === null) { err.textContent = "fill K, tau, overshoot, and peak time"; return; }
      if (k_plant <= 0 || tau <= 0 || tp <= 0) { err.textContent = "K, tau, and tp must be positive"; return; }
      if (po <= 0 || po >= 100) { err.textContent = "overshoot must be between 0 and 100 percent"; return; }

      const ln_os = Math.log(po / 100);
      const zeta = -ln_os / Math.sqrt(Math.PI * Math.PI + ln_os * ln_os);
      const wn = Math.PI / (tp * Math.sqrt(1 - zeta * zeta));
      const amp = document.getElementById("amp").value;

      let kp, kv, ki;
      if (amp === "q3") {
        kp = wn * wn / k_plant;
        kv = 2 * zeta * wn / k_plant;
        ki = null;
      } else {
        kp = wn * wn / k_plant * tau;
        kv = (-1 + 2 * zeta * wn * tau) / k_plant;
        ki = wn * wn * tau / k_plant;
      }

      const lines = [
        ["damping ratio zeta", fmt(zeta, 6)],
        ["natural frequency wn", fmt(wn, 6) + " rad/s"],
        ["damped frequency wd", fmt(wn * Math.sqrt(1 - zeta * zeta), 6) + " rad/s"],
        ["proportional gain kp", fmt(kp, 6) + (amp === "q3" ? " V/rad" : " V&middot;s/rad")]
      ];
      if (amp === "q3") {
        lines.push(["velocity gain kv", fmt(kv, 6) + " V&middot;s/rad"]);
      } else {
        lines.push(["integral gain ki", fmt(ki, 6) + " V/rad"]);
      }
      lines.push(["closed-loop overshoot check", fmt(Math.exp(-Math.PI * zeta / Math.sqrt(1 - zeta * zeta)) * 100, 4) + " %"]);
      lines.push(["settling time (two percent)", fmt(4 / (zeta * wn), 6) + " s"]);

      render_lines("lines", lines);
    }

    function draw_fig_servo() {
      const el = document.getElementById("fig-servo");
      const note = document.getElementById("fig-servo-note");
      if (!el || !window.fig) return;
      const DEFAULTS = { k_plant: "1.5", tau: "0.4", po: "5", tp: "1.2" };
      const hv = fig.harvest(solve_servo, DEFAULTS);
      if (!hv.rows.length) {
        if (note) note.textContent = "fill the plant gain, lag, overshoot and peak time.";
        return;
      }
      const num = function (frag) {
        for (let i = 0; i < hv.rows.length; i++) {
          if (hv.rows[i].label.toLowerCase().indexOf(frag) >= 0) return hv.rows[i].num;
        }
        return NaN;
      };
      const zeta = num("damping ratio");
      const wn = num("natural frequency");
      const td = num("damped frequency");
      const ts = num("settling time");
      if (!isFinite(zeta) || !isFinite(wn)) {
        if (note) note.textContent = "fill the plant gain, lag, overshoot and peak time.";
        return;
      }
      const wd = isFinite(td) ? td : wn * Math.sqrt(1 - zeta * zeta);
      // standard second order step response evaluated with the page's own zeta and wn
      const tmax = Math.max(ts * 1.6, 6 / Math.max(zeta * wn, 1e-6));
      const pts = [];
      const N = 160;
      for (let i = 0; i <= N; i++) {
        const t = tmax * i / N;
        const dec = Math.exp(-zeta * wn * t);
        const y = 1 - dec * (Math.cos(wd * t) + (zeta * wn / wd) * Math.sin(wd * t));
        pts.push([t, y]);
      }
      let pk = pts[0], pk_t = 0;
      for (let i = 0; i < pts.length; i++) {
        if (pts[i][1] > pk[1]) { pk = pts[i]; pk_t = pts[i][0]; }
      }

      fig.plot(el, {
        width: 560,
        height: 300,
        x: { label: "time", unit: "s", min: 0, max: tmax },
        y: { label: "normalized output", unit: "", min: Math.min(0, pk[1] - 0.1), max: Math.max(1.25, pk[1] + 0.1) },
        series: [{ pts: pts, cls: "fig-line", label: "step response" }],
        hlines: [
          { y: 1.02, label: "2% band" },
          { y: 0.98, label: "" },
          { y: 1, label: "setpoint" }
        ],
        vlines: [{ x: pk_t, label: "peak" }],
        marker: { x: pk_t, y: pk[1], label: "pk = " + fig.num_fmt(pk[1]), crosshair: false },
        driver: false
      });

      if (note) {
        note.textContent = "Closed loop is a second order system with zeta = " + fig.num_fmt(zeta) +
          " and wn = " + fig.num_fmt(wn) + " rad/s.  Peak " + fig.num_fmt(pk[1]) +
          " at t = " + fig.num_fmt(pk_t) + " s, two percent settling time " + fig.num_fmt(ts) + " s.";
      }
    }

    fig.auto_draw(function () { draw_fig_servo(); });
