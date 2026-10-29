
    // evaluate a polynomial with descending coefficients at a complex point
    function poly_eval_c(p, re, im) {
      let ar = 0, ai = 0;
      for (let i = 0; i < p.length; i++) {
        const nr = ar * re - ai * im + p[i], ni = ar * im + ai * re;
        ar = nr; ai = ni;
      }
      return [ar, ai];
    }

    // durand-kerner root finder for real coefficient polynomials
    function poly_roots(coeffs) {
      const n = coeffs.length - 1;
      const a = coeffs.map(function (c) { return c / coeffs[0]; });
      if (n === 1) return [[-a[1], 0]];
      let roots = [[1, 0]];
      for (let k = 1; k < n; k++) roots.push([0.4 * roots[k - 1][0] - 0.9 * roots[k - 1][1], 0.9 * roots[k - 1][0] + 0.4 * roots[k - 1][1]]);
      for (let it = 0; it < 500; it++) {
        let delta = 0;
        for (let k = 0; k < n; k++) {
          const z = roots[k];
          const num = poly_eval_c(a, z[0], z[1]);
          let dr = 1, di = 0;
          for (let j = 0; j < n; j++) {
            if (j === k) continue;
            const wr = z[0] - roots[j][0], wi = z[1] - roots[j][1];
            const nr = dr * wr - di * wi, ni = dr * wi + di * wr;
            dr = nr; di = ni;
          }
          const den = dr * dr + di * di;
          const qr = (num[0] * dr + num[1] * di) / den, qi = (num[1] * dr - num[0] * di) / den;
          const nz = [z[0] - qr, z[1] - qi];
          delta = Math.max(delta, Math.hypot(nz[0] - z[0], nz[1] - z[1]));
          roots[k] = nz;
        }
        if (delta < 1e-12) break;
      }
      return roots;
    }

    function parse_coeffs(id) {
      const toks = document.getElementById(id).value.split(/[\s,]+/).filter(function (x) { return x !== ""; });
      if (!toks.length) return null;
      const out = [];
      for (const t of toks) {
        const n = parseFloat(t);
        if (!isFinite(n)) return null;
        out.push(n);
      }
      return out;
    }

    function solve_tf() {
      const err = document.getElementById("err");
      err.textContent = "";

      const num = parse_coeffs("num"), den = parse_coeffs("den");
      if (num === null || den === null) { err.textContent = "enter both coefficient lists"; return; }
      if (den.length < 2) { err.textContent = "denominator needs at least one s term"; return; }
      if (den[0] === 0) { err.textContent = "leading denominator coefficient cannot be zero"; return; }
      if (den.length - 1 > 6) { err.textContent = "keep the denominator at sixth order or below"; return; }

      const n = den.length - 1;
      const g0 = num[num.length - 1] / den[den.length - 1];
      const roots = poly_roots(den);
      const stable = roots.every(function (r) { return r[0] < 0; });

      const lines = [
        ["dc gain G(0)", fmt(g0, 6)],
        ["system order", String(n)],
        ["stable", stable ? "yes, all poles in the left half plane" : "no"]
      ];

      // pair complex conjugates and list each pole once
      const listed = [];
      for (const r of roots) {
        if (r[1] < -1e-9) continue;
        listed.push(r);
      }
      const letters = ["a", "b", "c", "d", "e", "f"];
      for (let i = 0; i < listed.length; i++) {
        const r = listed[i];
        const im = Math.abs(r[1]) < 1e-9 ? "" : (r[1] > 0 ? " + " + fmt(r[1], 6) + " j" : " - " + fmt(-r[1], 6) + " j");
        lines.push(["pole " + letters[i] + " (re, im)", fmt(r[0], 6) + im]);
      }

      if (stable) {
        lines.push(["unit step final value", fmt(g0, 6)]);
        lines.push(["steady-state error, unit step", fmt(1 - g0, 6)]);
        if (Math.abs(g0 - 1) < 1e-9) {
          // ess = -G'(0) with G(0) = 1, from the quotient rule on the coefficient lists
          const dn = den[den.length - 1];
          const dnum = num.length > 1 ? num[num.length - 2] : 0;
          const dden = den.length > 1 ? den[den.length - 2] : 0;
          lines.push(["steady-state error, unit ramp", fmt((dn * dnum - num[num.length - 1] * dden) / (dn * dn) * -1, 6)]);
        } else {
          lines.push(["steady-state error, unit ramp", "infinite, the output cannot track a ramp"]);
        }
      } else {
        lines.push(["final values", "none, unstable systems reach no steady state"]);
      }

      if (n === 1) {
        const b1 = den[den.length - 2], b0 = den[den.length - 1];
        const a0 = num[num.length - 1];
        const tau = b1 / b0, k = a0 / b0;
        lines.push(["first order K and tau", fmt(k, 6) + ", " + fmt(tau, 6) + " s"]);
        lines.push(["settling time (five percent)", fmt(-tau * Math.log(0.05), 6) + " s"]);
        lines.push(["settling time (two percent)", fmt(4 * tau, 6) + " s"]);
        const t = val("tt");
        if (t !== null) {
          lines.push(["unit step output at t", fmt(k * (1 - Math.exp(-t / tau)), 6)]);
        }
      }

      render_lines("lines", lines);
    }

    function draw_fig_tfresp() {
      const el = document.getElementById("fig-tfresp");
      const note = document.getElementById("fig-tfresp-note");
      if (!el || !window.fig) return;
      const DEFAULTS = { num: "1", den: "1, 4, 16", tt: "1" };
      const hv = fig.harvest(solve_tf, DEFAULTS);
      if (!hv.rows.length) {
        if (note) note.textContent = "enter the numerator and denominator coefficients.";
        return;
      }
      const coeffs = fig.with_values(hv.values, function () {
        return { n: parse_coeffs("num"), d: parse_coeffs("den") };
      });
      const nc = coeffs.n, dc = coeffs.d;
      if (!nc || !dc || dc.length < 2) {
        if (note) note.textContent = "enter the numerator and denominator coefficients.";
        return;
      }
      const poles = poly_roots(dc);
      const zeros = poly_roots(nc);
      let num = NaN, den = NaN;
      for (let i = 0; i < hv.rows.length; i++) {
        const lab = hv.rows[i].label.toLowerCase();
        if (lab.indexOf("dc gain") >= 0) num = hv.rows[i].num;
        if (lab.indexOf("stable") >= 0) den = hv.rows[i].num;
      }
      void den;

      const all = poles.concat(zeros);
      let rx = 1, ry = 1;
      all.forEach(function (p) {
        rx = Math.max(rx, Math.abs(p[0]) * 1.25);
        ry = Math.max(ry, Math.abs(p[1]) * 1.25);
      });
      const W = 480, H = 380;
      const s = fig.scene(el, { width: W, height: H });
      const ox = W / 2, oy = H / 2 + 10;
      const sc = Math.min((W / 2 - 40) / rx, (H / 2 - 40) / ry);
      const map = function (p) { return [ox + p[0] * sc, oy - p[1] * sc]; };

      s.line(ox - rx * sc, oy, ox + rx * sc, oy, "fig-axis");
      s.line(ox, oy - ry * sc, ox, oy + ry * sc, "fig-axis");
      // imaginary axis emphasised
      s.line(ox, oy - ry * sc, ox, oy + ry * sc, "fig-ref");

      poles.forEach(function (p) {
        const q = map(p);
        s.poly([[q[0] - 6, q[1] - 6], [q[0] + 6, q[1] + 6]], "fig-cross");
        s.poly([[q[0] - 6, q[1] + 6], [q[0] + 6, q[1] - 6]], "fig-cross");
        s.text(q[0] + 10, q[1] + 4, "pole", { cls: "fig-val", anchor: "start" });
      });
      zeros.forEach(function (z) {
        const q = map(z);
        s.circle(q[0], q[1], 6, "fig-ring");
        s.text(q[0] + 10, q[1] + 4, "zero", { cls: "fig-val", anchor: "start" });
      });
      s.text(W / 2, 22, "pole map of G(s)", { cls: "fig-label" });
      s.text(ox + rx * sc, oy + 16, "real", { cls: "fig-sub" });
      s.text(ox - 12, oy - ry * sc, "imag", { cls: "fig-sub", anchor: "end" });
      s.commit();

      if (note) {
        const st = poles.every(function (p) { return p[0] < 0; });
        note.textContent = (st ? "All poles sit in the left half plane, so the response decays.  " :
          "At least one pole is in the right half plane, so the response grows without bound.  ") +
          "Dc gain " + fig.num_fmt(num) + " with " + poles.length + " poles and " + zeros.length + " zeros.";
      }
    }

    fig.auto_draw(function () { draw_fig_tfresp(); });
