
    // parse "a b; c d" into a matrix
    function parse_matrix(t) {
      const rows = t.split(";").map(function (r) {
        return r.trim().split(/[\s,]+/).filter(Boolean).map(parseFloat);
      });
      if (rows.some(function (r) { return r.some(isNaN); })) return null;
      return rows;
    }

    function solve_ss() {
      const err = document.getElementById("err");
      err.textContent = "";

      const n = parseInt(document.getElementById("n").value, 10);
      const a = parse_matrix(document.getElementById("a_mat").value);
      const b = parse_matrix(document.getElementById("b_mat").value);
      if (n !== 2 && n !== 3) { err.textContent = "n must be 2 or 3"; return; }
      if (!a || a.length !== n || a.some(function (r) { return r.length !== n; })) { err.textContent = "A must be " + n + "x" + n; return; }
      if (!b || b.length !== n || b.some(function (r) { return r.length !== 1; })) { err.textContent = "B must be " + n + "x1"; return; }

      // eigenvalues from the characteristic polynomial
      const cp = charpoly(a);
      const eig = polyroots(cp);

      // controllability matrix [B AB A^2B ...]
      const cols = [];
      let v = b;
      for (let k = 0; k < n; k++) {
        cols.push(v.map(function (r) { return r[0]; }));
        v = matvec(a, v.map(function (r) { return r[0]; })).map(function (x) { return [x]; });
      }
      const ctrb = [];
      for (let i = 0; i < n; i++) {
        ctrb.push([]);
        for (let j = 0; j < n; j++) ctrb[i].push(cols[j][i]);
      }
      const rank = matrank(ctrb);
      const stable = eig.every(function (r) { return r[0] < -1e-9; });

      const lines = [];
      lines.push(["characteristic polynomial", poly_str(cp)]);
      lines.push(["eigenvalues", eig.map(function (r) {
        if (Math.abs(r[1]) < 1e-8) return fmt(r[0], 4);
        return fmt(r[0], 4) + (r[1] >= 0 ? " + " : " &minus; ") + fmt(Math.abs(r[1]), 4) + "j";
      }).join(", ")]);
      lines.push(["stability", stable ? "asymptotically stable" : "not asymptotically stable"]);
      lines.push(["controllability rank", rank + " of " + n + (rank === n ? ", controllable" : ", not controllable")]);

      render_lines("lines", lines);
      document.getElementById("results").style.display = "";
    }

    function draw_fig_splane() {
      const el = document.getElementById("fig-splane");
      const note = document.getElementById("fig-splane-note");
      if (!el || !window.fig) return;
      const DEFAULTS = { n: "2", a_mat: "0 1; -2 -3", b_mat: "0; 1" };
      const hv = fig.harvest(solve_ss, DEFAULTS);
      if (!hv.rows.length) {
        if (note) note.textContent = "give a matrix A and a vector B to plot the poles.";
        return;
      }
      const n = parseInt(hv.values.n, 10) || 2;
      const amat = parse_matrix(hv.values.a_mat);
      if (!amat || amat.length !== n) {
        if (note) note.textContent = "matrix A does not match the stated dimension.";
        return;
      }
      const eig = polyroots(charpoly(amat));
      if (!eig.length) {
        if (note) note.textContent = "could not read the eigenvalues from this matrix.";
        return;
      }
      const re_part = eig.map(function (r) { return r[0]; });
      const im_part = eig.map(function (r) { return r[1]; });
      const maxre = Math.max.apply(null, re_part.map(Math.abs));
      const maxim = Math.max.apply(null, im_part.map(Math.abs));
      const lim = Math.max(maxre, maxim, 1) * 1.4;

      const W = 520, H = 330;
      const pad = 44;
      const sc = Math.min((W - 2 * pad) / (2 * lim), (H - 2 * pad) / (2 * lim));
      const cx = W / 2, cy = H / 2;
      const PX = function (xr) { return cx + xr * sc; };
      const PY = function (yi) { return cy - yi * sc; };

      const s = fig.scene(el, { width: W, height: H });
      s.rect(pad, pad, PX(0) - pad, H - 2 * pad, "fig-band");
      s.line(PX(0), pad, PX(0), H - pad, "fig-axis");
      s.line(pad, PY(0), W - pad, PY(0), "fig-axis");
      s.text(PX(0) + 6, pad + 12, "jw", { cls: "fig-label", anchor: "start" });
      s.text(W - pad, PY(0) - 6, "Re", { cls: "fig-label", anchor: "end" });
      s.text(pad + 6, PY(0) - 6, "stable", { cls: "fig-label", anchor: "start" });

      eig.forEach(function (r, i) {
        const px = PX(r[0]), py = PY(r[1]);
        s.circle(px, py, 5, "fig-line");
        s.circle(px, py, 2, "fig-dot");
        s.text(px + 10, py - 8, "L" + (i + 1), { cls: "fig-val", anchor: "start" });
      });
      s.commit();

      const stable = eig.every(function (r) { return r[0] < -1e-9; });
      if (note) {
        note.textContent = "Poles of A sit in the shaded left half plane when the system is " +
          (stable ? "asymptotically stable" : "not asymptotically stable") +
          ".  Imaginary axis is the imaginary axis; distances are in reciprocal seconds.";
      }
    }

    fig.auto_draw(function () { draw_fig_splane(); });
