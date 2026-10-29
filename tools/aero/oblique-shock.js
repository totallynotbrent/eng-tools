
    function theta_beta(m1, beta, g) {
      const s2 = Math.pow(Math.sin(beta), 2);
      const num = 2 * (1 / Math.tan(beta)) * (m1 * m1 * s2 - 1);
      const den = m1 * m1 * (g + Math.cos(2 * beta)) + 2;
      return Math.atan(num / den);
    }

    function solve_oblique() {
      const err = document.getElementById("err");
      err.textContent = "";

      const m1 = val("m1"), theta_deg = val("theta"), g = val("gamma") || 1.4;
      if (m1 === null || theta_deg === null) { err.textContent = "fill M1 and theta"; return; }
      if (m1 <= 1) { err.textContent = "oblique shocks need supersonic M1 > 1"; return; }
      if (g <= 1) { err.textContent = "gamma must be greater than 1"; return; }

      const theta = theta_deg * Math.PI / 180;
      const mu = Math.asin(1 / m1);

      // scan wave angle beta from mach angle up to 90 deg, bracket sign changes of theta-beta
      const roots = [];
      const n = 8000;
      let prev_beta = mu, prev_f = theta_beta(m1, mu, g) - theta;
      for (let i = 1; i <= n; i++) {
        const beta = mu + (Math.PI / 2 - mu) * (i / n);
        const f = theta_beta(m1, beta, g) - theta;
        if (prev_f * f <= 0 && f !== prev_f) {
          let x0 = prev_beta, x1 = beta;
          for (let it = 0; it < 60; it++) {
            const mid = (x0 + x1) / 2;
            if (theta_beta(m1, mid, g) - theta > 0) x1 = mid; else x0 = mid;
          }
          roots.push((x0 + x1) / 2);
        }
        prev_beta = beta; prev_f = f;
      }

      if (!roots.length) { err.textContent = "no shock solution, deflection exceeds the max for this mach"; return; }

      const strong = document.getElementById("branch").value === "strong";
      let beta;
      if (strong && roots.length > 1) beta = roots[roots.length - 1];
      else beta = roots[0];

      const mn1 = m1 * Math.sin(beta);
      const mn2sq = (1 + (g - 1) / 2 * mn1 * mn1) / (g * mn1 * mn1 - (g - 1) / 2);
      const mn2 = Math.sqrt(mn2sq);
      const m2 = mn2 / Math.sin(beta - theta);
      const p2p1 = 1 + 2 * g / (g + 1) * (mn1 * mn1 - 1);
      const r2r1 = ((g + 1) * mn1 * mn1) / ((g - 1) * mn1 * mn1 + 2);
      const t2t1 = p2p1 / r2r1;

      render_lines("lines", [
        ["wave angle &beta;", fmt(beta * 180 / Math.PI, 6) + " &deg;"],
        ["downstream mach M2", fmt(m2, 6)],
        ["pressure ratio P2/P1", fmt(p2p1, 6)],
        ["density ratio &rho;2/&rho;1", fmt(r2r1, 6)],
        ["temperature ratio T2/T1", fmt(t2t1, 6)]
      ]);
    }

    function draw_fig_polar() {
      const el = document.getElementById("fig-polar");
      const note = document.getElementById("fig-polar-note");
      if (!el || !window.fig) return;
      const DEFAULTS = { m1: "3", theta: "20", gamma: "1.4" };
      const hv = fig.harvest(solve_oblique, DEFAULTS);
      if (!hv.rows.length) {
        if (note) note.textContent = "fill the upstream mach and deflection angle.";
        return;
      }
      const num = function (frag) {
        for (let i = 0; i < hv.rows.length; i++) {
          if (hv.rows[i].label.toLowerCase().indexOf(frag) >= 0) return hv.rows[i].num;
        }
        return NaN;
      };
      const beta = num("wave angle");
      const m1 = parseFloat(hv.values.m1);
      const theta = parseFloat(hv.values.theta);
      const gam = parseFloat(hv.values.gamma) || 1.4;
      if (!isFinite(beta) || !isFinite(m1) || !isFinite(theta)) {
        if (note) note.textContent = "fill the upstream mach and deflection angle.";
        return;
      }

      const series = [];
      const shades = [0.95, 0.72, 0.55, 0.42, 0.32];
      for (const mm of [1.5, 2, 3, 5, 10]) {
        if (mm > m1 * 2.2) continue;
        if (Math.abs(mm - m1) < 1e-9) continue;
        const mus = Math.asin(1 / mm);
        const pts = [];
        for (let i = 0; i <= 80; i++) {
          const bg = mus + (Math.PI / 2 - mus) * (i / 80);
          const th = theta_beta(mm, bg, gam) * 180 / Math.PI;
          if (!isFinite(th)) continue;
          pts.push([bg * 180 / Math.PI, th]);
        }
        if (pts.length) {
          series.push({
            pts: pts,
            cls: "fig-alt",
            label: "M1 = " + mm,
            opacity: shades[series.length % shades.length],
            dash: (series.length % 2) ? "2 3" : "7 4"
          });
        }
      }

      const curve = [];
      for (let i = 0; i <= 120; i++) {
        const bt = beta + (90 - beta) * i / 120;
        const th = theta_beta(m1, bt * Math.PI / 180, gam) * 180 / Math.PI;
        if (isFinite(th)) curve.push([bt, th]);
      }

      fig.plot(el, {
        width: 540,
        height: 330,
        x: { label: "wave angle beta", unit: "deg", min: Math.asin(1 / m1) * 180 / Math.PI, max: 90 },
        y: { label: "deflection theta", unit: "deg", min: 0, max: 40 },
        series: series.concat([
          { pts: curve, cls: "fig-line", label: "M1 = " + m1 + " (yours)", stroke: "#e0a458" }
        ]),
        points: [{ x: beta, y: theta, label: "your case", cls: "fig-dot", r: 5, dx: 10, dy: -10 }]
      });

      if (note) {
        note.textContent = "Each curve is the theta-beta relation for one upstream mach.  " +
          "The attached solution is the shallow intersection; the steep branch gives the strong shock.  " +
          "Deflections past the curve maximum detach the shock.";
      }
    }

    fig.auto_draw(function () { draw_fig_polar(); });
