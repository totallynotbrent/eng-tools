
    function mat_vec(m, v) {
      return [
        m[0][0] * v[0] + m[0][1] * v[1] + m[0][2] * v[2],
        m[1][0] * v[0] + m[1][1] * v[1] + m[1][2] * v[2],
        m[2][0] * v[0] + m[2][1] * v[1] + m[2][2] * v[2]
      ];
    }

    function solve_inertia() {
      const err = document.getElementById("err");
      err.textContent = "";

      const m = [
        [val("i11"), val("i12"), val("i13")],
        [val("i21"), val("i22"), val("i23")],
        [val("i31"), val("i32"), val("i33")]
      ];
      for (const row of m) for (const x of row) if (x === null) { err.textContent = "fill all nine entries"; return; }

      // principal moments via the 3x3 eigenvalue polynomial (symmetric real matrix),
      // solved iteratively with jacobi rotations for the numerically robust path
      const a = m.map(function (r) { return r.slice(); });
      const n = 3;
      const v = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];

      for (let it = 0; it < 100; it++) {
        let off = Math.abs(a[0][1]) + Math.abs(a[0][2]) + Math.abs(a[1][2]);
        if (off < 1e-12) break;
        let p = 0, q = 1;
        let maxv = Math.abs(a[0][1]);
        if (Math.abs(a[0][2]) > maxv) { maxv = Math.abs(a[0][2]); p = 0; q = 2; }
        if (Math.abs(a[1][2]) > maxv) { p = 1; q = 2; }

        const app = a[p][p], aqq = a[q][q], apq = a[p][q];
        const tau = (aqq - app) / (2 * apq);
        const t = Math.sign(tau) / (Math.abs(tau) + Math.sqrt(1 + tau * tau));
        const c = 1 / Math.sqrt(1 + t * t);
        const s = t * c;

        for (let k = 0; k < n; k++) {
          const akp = a[k][p], akq = a[k][q];
          a[k][p] = c * akp - s * akq;
          a[k][q] = s * akp + c * akq;
        }
        for (let k = 0; k < n; k++) {
          const apk = a[p][k], aqk = a[q][k];
          a[p][k] = c * apk - s * aqk;
          a[q][k] = s * apk + c * aqk;
        }
        for (let k = 0; k < n; k++) {
          const vkp = v[k][p], vkq = v[k][q];
          v[k][p] = c * vkp - s * vkq;
          v[k][q] = s * vkp + c * vkq;
        }
        a[p][q] = a[q][p] = 0;
      }

      const evals = [a[0][0], a[1][1], a[2][2]];
      const order = [0, 1, 2].sort(function (i, j) { return evals[i] - evals[j]; });

      const lines = [];
      order.forEach(function (idx, k) {
        lines.push(["I" + (k + 1), fmt(evals[idx], 6)]);
        const axis = [v[0][idx], v[1][idx], v[2][idx]];
        const mag = Math.hypot(axis[0], axis[1], axis[2]) || 1;
        lines.push(["axis " + (k + 1), "(" + axis.map(function (x) { return fmt(x / mag, 4); }).join(", ") + ")"]);
      });

      render_lines("lines", lines);
    }

    function draw_fig_principal() {
      const el = document.getElementById("fig-principal");
      const note = document.getElementById("fig-principal-note");
      if (!el || !window.fig) return;
      const DEFAULTS = {
        i11: "1200", i12: "200", i13: "0",
        i21: "200", i22: "800", i23: "100",
        i31: "0", i32: "100", i33: "500"
      };
      const hv = fig.harvest(solve_inertia, DEFAULTS);
      if (!hv.rows.length) {
        if (note) note.textContent = "fill all nine tensor entries.";
        return;
      }
      const moms = [], axes = [];
      for (let i = 0; i < hv.rows.length; i++) {
        const lab = hv.rows[i].label.trim();
        if (/^I\d$/.test(lab)) moms.push(parseFloat(hv.rows[i].text));
        else if (/^axis\s+\d$/i.test(lab)) {
          const nums = String(hv.rows[i].text).replace(/[()]/g, "").split(",").map(parseFloat);
          if (nums.length === 3 && nums.every(isFinite)) axes.push(nums);
        }
      }
      if (moms.length < 3 || axes.length < 3) {
        if (note) note.textContent = "fill all nine tensor entries.";
        return;
      }

      const W = 520, H = 330;
      const s = fig.scene(el, { width: W, height: H });
      const ox = W / 2, oy = H / 2 + 14;
      const proj = function (v, len) {
        return [ox + (v[0] - 0.45 * v[2]) * len, oy - (v[1] - 0.32 * v[2]) * len];
      };

      const imax = Math.max.apply(null, moms.filter(function (m) { return m > 0; }));
      const cols = ["fig-line", "fig-third", "fig-alt"];
      for (let k = 0; k < 3; k++) {
        const av = axes[k];
        const len = 78 * Math.sqrt(Math.max(moms[k], 0) / (imax || 1)) + 18;
        const p = proj(av, len);
        s.line(ox, oy, p[0], p[1], cols[k]);
        s.circle(p[0], p[1], 4.5, "fig-dot");
        const shortlab = "I" + (k + 1);
        s.text(p[0] + (p[0] > ox ? 10 : -10), p[1] - 9, shortlab,
          { cls: "fig-val", anchor: p[0] > ox ? "start" : "end" });
      }
      s.circle(ox, oy, 3.5, "fig-dot");
      s.text(W / 2, 24, "principal axes", { cls: "fig-label" });
      s.commit();

      if (note) {
        note.textContent = "Axis length scales with the square root of the principal moment, so the " +
          "longest axis is the easiest rotation.  Moments " +
          moms.map(function (m, k) { return "I" + (k + 1) + " = " + fig.num_fmt(m); }).join(", ") + ".";
      }
    }

    fig.auto_draw(function () { draw_fig_principal(); });
