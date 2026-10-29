
    function solver_disc(trace, det) { return trace * trace - 4 * det; }

    function eigvec(a, b, c, d, lam) {
      if (b !== 0) return [b, lam - a];
      if (c !== 0) return [lam - d, c];
      return [1, 0];
    }

    function solve_eig() {
      const err = document.getElementById("err");
      err.textContent = "";

      const a = val("a11"), b = val("a12"), c = val("a21"), d = val("a22");
      if (a === null || b === null || c === null || d === null) { err.textContent = "fill all four entries"; return; }

      const trace = a + d, det = a * d - b * c;
      const disc = solver_disc(trace, det);
      const lines = [["trace", fmt(trace, 6)], ["determinant", fmt(det, 6)]];

      if (disc >= 0) {
        const s = Math.sqrt(disc);
        const l1 = (trace + s) / 2, l2 = (trace - s) / 2;
        lines.push(["&lambda;1", fmt(l1, 6)]);
        lines.push(["&lambda;2", fmt(l2, 6)]);
        const v1 = eigvec(a, b, c, d, l1);
        const v2 = eigvec(a, b, c, d, l2);
        lines.push(["v1", "(" + fmt(v1[0], 4) + ", " + fmt(v1[1], 4) + ")"]);
        lines.push(["v2", "(" + fmt(v2[0], 4) + ", " + fmt(v2[1], 4) + ")"]);
      } else {
        const re = trace / 2, im = Math.sqrt(-disc) / 2;
        lines.push(["complex pair", fmt(re, 6) + " &plusmn; " + fmt(im, 6) + " i"]);
      }

      render_lines("lines", lines);
    }

    function draw_fig_eig() {
      const el = document.getElementById("fig-eig");
      const note = document.getElementById("fig-eig-note");
      if (!el || !window.fig) return;
      const DEFAULTS = { a11: "2", a12: "1", a21: "0", a22: "3" };
      const hv = fig.harvest(solve_eig, DEFAULTS);
      if (!hv.rows.length) {
        if (note) note.textContent = "fill all four entries to draw the eigenvectors.";
        return;
      }
      const get = function (id) {
        const v = parseFloat(hv.values[id]);
        return isFinite(v) ? v : 0;
      };
      const a11 = get("a11"), a12 = get("a12"), a21 = get("a21"), a22 = get("a22");
      const trace = a11 + a22, det = a11 * a22 - a12 * a21;
      const disc = trace * trace - 4 * det;

      const W = 480, H = 300;
      const s = fig.scene(el, { width: W, height: H });
      const cx = W / 2, cy = H / 2 + 10;
      const s0 = Math.min(W, H) * 0.36;

      s.line(cx - s0, cy, cx + s0, cy, "fig-grid");
      s.line(cx, cy - s0, cx, cy + s0, "fig-grid");
      s.text(cx + s0, cy + 14, "lambda1", { cls: "fig-label" });
      s.text(cx + 8, cy - s0 + 12, "lambda2", { cls: "fig-label", anchor: "start" });

      const eig_arrow = function (lx, ly, label) {
        const mag = Math.hypot(lx, ly);
        if (!isFinite(mag) || mag < 1e-12) return;
        const k = s0 / Math.max(Math.abs(lx), Math.abs(ly), 1) * 0.75;
        s.arrow(cx, cy, cx + lx * k, cy - ly * k, "fig-line");
        s.text(cx + lx * k + 8, cy - ly * k - 6, label, { cls: "fig-val", anchor: "start" });
      };

      if (disc >= 0) {
        const sq = Math.sqrt(disc);
        const l1 = (trace + sq) / 2, l2 = (trace - sq) / 2;
        eig_arrow(l1, 0, "lambda1");
        eig_arrow(l2, 0, "lambda2");
        s.circle(cx + l1 * (s0 / Math.max(Math.abs(l1), Math.abs(l2), 1) * 0.75), cy, 3.5, "fig-dot");
        s.circle(cx + l2 * (s0 / Math.max(Math.abs(l1), Math.abs(l2), 1) * 0.75), cy, 3.5, "fig-dot");
      } else {
        const re = trace / 2, im = Math.sqrt(-disc) / 2;
        const k = s0 / Math.max(Math.abs(re), im, 1) * 0.8;
        eig_arrow(re, im, "lambda1");
        eig_arrow(re, -im, "lambda2");
        s.circle(cx + re * k, cy - im * k, 3.5, "fig-dot");
        s.circle(cx + re * k, cy + im * k, 3.5, "fig-dot");
        s.text(cx + 8, cy + s0 - 6, "complex pair rotates the state", { cls: "fig-label", anchor: "start" });
      }
      s.commit();

      const stab = disc >= 0
        ? (Math.max((trace + Math.sqrt(disc)) / 2, (trace - Math.sqrt(disc)) / 2) < 0 ? "both roots lie in the left half plane, so the state decays" :
          (Math.min((trace + Math.sqrt(disc)) / 2, (trace - Math.sqrt(disc)) / 2) > 0 ? "both roots lie in the right half plane, so the state grows" :
            "one root lies on each side, so the saddle behaviour is unstable"))
        : (trace < 0 ? "the complex pair has negative real part, so the state spirals in" : "the complex pair has positive real part, so the state spirals out");
      if (note) {
        note.textContent = "Roots on the axes are the eigenvalues; the ray from the origin shows the " +
          "direction each eigenvector points.  " + stab.charAt(0).toUpperCase() + stab.slice(1) + ".";
      }
    }

    fig.auto_draw(function () { draw_fig_eig(); });
