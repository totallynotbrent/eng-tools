
    // parse "a b; c d" into a matrix
    function parse_matrix(t) {
      const rows = t.split(";").map(function (r) {
        return r.trim().split(/[\s,]+/).filter(Boolean).map(parseFloat);
      });
      if (rows.some(function (r) { return r.some(isNaN); })) return null;
      return rows;
    }

    function solve_pp() {
      const err = document.getElementById("err");
      err.textContent = "";

      const n = parseInt(document.getElementById("n").value, 10);
      const a = parse_matrix(document.getElementById("a_mat").value);
      const b = parse_matrix(document.getElementById("b_mat").value);
      const poles = document.getElementById("poles").value.trim().split(/[\s,]+/).filter(Boolean).map(parseFloat);
      if (n !== 2 && n !== 3) { err.textContent = "n must be 2 or 3"; return; }
      if (!a || a.length !== n || a.some(function (r) { return r.length !== n; })) { err.textContent = "A must be " + n + "x" + n; return; }
      if (!b || b.length !== n || b.some(function (r) { return r.length !== 1; })) { err.textContent = "B must be " + n + "x1"; return; }
      if (poles.length !== n || poles.some(isNaN)) { err.textContent = "enter exactly " + n + " real pole locations"; return; }

      // controllability matrix
      const cols = [];
      let v = b.map(function (r) { return r[0]; });
      for (let k = 0; k < n; k++) {
        cols.push(v.slice());
        v = matvec(a, v);
      }
      const ctrb = [];
      for (let i = 0; i < n; i++) {
        ctrb.push([]);
        for (let j = 0; j < n; j++) ctrb[i].push(cols[j][i]);
      }
      if (matrank(ctrb) !== n) { err.textContent = "system is not controllable, poles cannot be placed"; return; }

      // desired characteristic polynomial from the requested poles
      let phi = [1];
      for (const p of poles) phi = polymul(phi, [1, -p]);

      // phi(A) = A^n + c1 A^(n-1) + ... + cn I, descending coefficients
      let sum = null;
      for (let k = 0; k <= n; k++) {
        const term = matpow(a, n - k);
        const c = phi[k];
        const scaled = term.map(function (row) { return row.map(function (x) { return x * c; }); });
        sum = sum ? sum.map(function (row, i) { return row.map(function (x, j) { return x + scaled[i][j]; }); }) : scaled;
      }

      // K = last row of C^-1 * phi(A)
      const e_last = new Array(n).fill(0); e_last[n - 1] = 1;
      // solve x^T C = e_last^T  =>  C^T x = e_last
      const ct = [];
      for (let i = 0; i < n; i++) {
        ct.push([]);
        for (let j = 0; j < n; j++) ct[i].push(ctrb[j][i]);
      }
      const x = gauss_solve(ct, e_last);
      if (!x) { err.textContent = "controllability matrix is singular"; return; }
      // K = x^T phi(A), a row-vector product: kx[j] = sum_i x[i] * phi(A)[i][j]
      const kx = sum[0].map(function (_, j) {
        return x.reduce(function (s, xi, i) { return s + xi * sum[i][j]; }, 0);
      });

      // closed-loop verification
      const acl = a.map(function (row, i) {
        return row.map(function (v2, j) { return v2 - b[i][0] * kx[j]; });
      });
      const cp_closed = charpoly(acl);
      const eig_closed = polyroots(cp_closed);
      const max_err = Math.max.apply(null, eig_closed.map(function (r, i) {
        return Math.abs(r[0] - poles[i]);
      }));

      const lines = [];
      lines.push(["gain K", kx.map(function (k) { return fmt(k, 5); }).join(", ")]);
      lines.push(["closed-loop char poly", poly_str(cp_closed)]);
      lines.push(["closed-loop eigs", eig_closed.map(function (r) {
        if (Math.abs(r[1]) < 1e-8) return fmt(r[0], 4);
        return fmt(r[0], 4) + (r[1] >= 0 ? " + " : " &minus; ") + fmt(Math.abs(r[1]), 4) + "j";
      }).join(", ")]);
      lines.push(["max placement error", fmt(max_err, 5)]);

      render_lines("lines", lines);
      document.getElementById("results").style.display = "";
    }

    function draw_fig_poles() {
      const el = document.getElementById("fig-poles");
      const note = document.getElementById("fig-poles-note");
      if (!el || !window.fig) return;
      const DEFAULTS = { n: "2", a_mat: "0 1; -2 -3", b_mat: "0; 1", poles: "-1 -2" };
      const hv = fig.harvest(solve_pp, DEFAULTS);
      if (!hv.rows.length) {
        if (note) note.textContent = "give a controllable system and the poles you want.";
        return;
      }
      const want = hv.values.poles.split(/[\s,]+/).filter(Boolean).map(parseFloat).filter(isFinite);
      const gained = [];
      for (let i = 0; i < hv.rows.length; i++) {
        if (hv.rows[i].label.toLowerCase().indexOf("closed-loop eigs") >= 0) {
          const txt = hv.rows[i].text;
          const parts = txt.split(",").map(function (p) { return p.trim(); }).filter(Boolean);
          parts.forEach(function (p) {
            const cm = p.match(/^(-?[\d.]+)\s*(?:([+-])\s*([\d.]+))?\s*j?$/);
            if (!cm) return;
            const re = parseFloat(cm[1]);
            const im = cm[3] !== undefined ? (cm[2] === "-" ? -parseFloat(cm[3]) : parseFloat(cm[3])) : 0;
            gained.push([re, im]);
          });
        }
      }
      if (!want.length || !gained.length) {
        if (note) note.textContent = "could not read the pole locations for this system.";
        return;
      }
      const all = want.map(function (w) { return [w, 0]; }).concat(gained);
      const maxre = Math.max.apply(null, all.map(function (p) { return Math.abs(p[0]); }));
      const maxim = Math.max.apply(null, all.map(function (p) { return Math.abs(p[1]); }));
      const lim = Math.max(maxre, maxim, 1) * 1.4;

      const W = 520, H = 330, pad = 44;
      const sc = Math.min((W - 2 * pad) / (2 * lim), (H - 2 * pad) / (2 * lim));
      const cx = W / 2, cy = H / 2;
      const PX = function (xr) { return cx + xr * sc; };
      const PY = function (yi) { return cy - yi * sc; };

      const s = fig.scene(el, { width: W, height: H });
      s.rect(pad, pad, PX(0) - pad, H - 2 * pad, "fig-band");
      s.line(PX(0), pad, PX(0), H - pad, "fig-axis");
      s.line(pad, PY(0), W - pad, PY(0), "fig-axis");
      s.text(W - pad, PY(0) - 6, "Re", { cls: "fig-label", anchor: "end" });

      want.forEach(function (w) {
        const px = PX(w), py = PY(0);
        s.rect(px - 5, py - 5, 10, 10, "fig-square");
        s.text(px + 9, py + 14, "desired " + fig.num_fmt(w), { cls: "fig-label", anchor: "start" });
      });
      gained.forEach(function (gp) {
        const px = PX(gp[0]), py = PY(gp[1]);
        s.line(px - 6, py - 6, px + 6, py + 6, "fig-line", { "stroke-width": 2 });
        s.line(px - 6, py + 6, px + 6, py - 6, "fig-line", { "stroke-width": 2 });
        s.text(px + 9, py - 8, "achieved", { cls: "fig-val", anchor: "start" });
      });
      s.commit();

      let worst = 0;
      for (let i = 0; i < Math.min(want.length, gained.length); i++) {
        worst = Math.max(worst, Math.abs(want[i] - gained[i][0]));
      }
      if (note) {
        note.textContent = "Hollow squares are the requested poles, crosses the poles the " +
          "closed loop actually achieves.  Worst mismatch " + fig.num_fmt(worst) + ".";
      }
    }

    fig.auto_draw(function () { draw_fig_poles(); });
