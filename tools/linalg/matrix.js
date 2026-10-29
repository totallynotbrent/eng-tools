
    function mat_str(m) {
      return m.map(function (row) { return "[" + row.map(function (x) { return fmt(x, 4); }).join(", ") + "]"; }).join(", ");
    }

    function det2(m) { return m[0][0] * m[1][1] - m[0][1] * m[1][0]; }

    function det3(m) {
      return m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1])
        - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0])
        + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
    }

    function rref(m) {
      const a = m.map(function (row) { return row.slice(); });
      const nr = a.length, nc = a[0].length;
      let lead = 0;
      for (let r = 0; r < nr; r++) {
        if (lead >= nc) break;
        let i = r;
        while (a[i][lead] === 0) {
          i++;
          if (i === nr) { i = r; lead++; if (lead === nc) break; }
        }
        if (lead >= nc) break;
        const tmp = a[i]; a[i] = a[r]; a[r] = tmp;
        const lv = a[r][lead];
        for (let c = 0; c < nc; c++) a[r][c] /= lv;
        for (let i2 = 0; i2 < nr; i2++) {
          if (i2 === r) continue;
          const f = a[i2][lead];
          for (let c = 0; c < nc; c++) a[i2][c] -= f * a[r][c];
        }
        lead++;
      }
      return a;
    }

    function solve_mat() {
      const err = document.getElementById("err");
      err.textContent = "";

      const size = parseInt(document.getElementById("size").value) || 2;
      const m = [];
      if (size === 2) {
        m.push([val("a11"), val("a12")], [val("a21"), val("a22")]);
      } else {
        m.push([val("a11"), val("a12"), val("a13")],
               [val("a21"), val("a22"), val("a23")],
               [val("a31"), val("a32"), val("a33")]);
      }
      for (const row of m) for (const x of row) if (x === null) { err.textContent = "fill every entry"; return; }

      const d = size === 2 ? det2(m) : det3(m);
      const lines = [["determinant", fmt(d, 6)], ["rref", mat_str(rref(m))]];

      if (Math.abs(d) < 1e-12) {
        lines.push(["inverse", "singular, no inverse"]);
      } else if (size === 2) {
        const inv = [[m[1][1] / d, -m[0][1] / d], [-m[1][0] / d, m[0][0] / d]];
        lines.push(["inverse", mat_str(inv)]);
      } else {
        const inv = [];
        for (let j = 0; j < 3; j++) {
          const e = [0, 0, 0]; e[j] = 1;
          const col = gauss_solve(m, e);
          if (col === null) { lines.push(["inverse", "singular, no inverse"]); break; }
          for (let i = 0; i < 3; i++) inv[i][j] = col[i];
        }
        if (inv.length === 3) lines.push(["inverse", mat_str(inv)]);
      }

      render_lines("lines", lines);
    }

    function draw_fig_matrix() {
      const el = document.getElementById("fig-matrix");
      const note = document.getElementById("fig-matrix-note");
      if (!el || !window.fig) return;
      const DEFAULTS = { a11: "2", a12: "1", a13: "0", a21: "1", a22: "3", a23: "1", a31: "0", a32: "1", a33: "2" };
      const hv = fig.harvest(solve_mat, DEFAULTS);
      if (!hv.rows.length) {
        if (note) note.textContent = "fill the matrix entries to see how it bends the unit square.";
        return;
      }
      const size = parseInt(document.getElementById("size").value) || 2;
      const get = function (id) {
        const v = parseFloat(hv.values[id]);
        return isFinite(v) ? v : 0;
      };
      const a11 = get("a11"), a12 = get("a12"), a21 = get("a21"), a22 = get("a22");

      const sx = 150, sy = 150, ox = 130, oy = 215;
      const pts = [[0, 0], [1, 0], [1, 1], [0, 1]];
      const img = pts.map(function (p) {
        return [a11 * p[0] + a12 * p[1], a21 * p[0] + a22 * p[1]];
      });
      const all = pts.concat(img);
      const xs = all.map(function (p) { return p[0]; });
      const ys = all.map(function (p) { return p[1]; });
      const lo_x = Math.min.apply(null, xs), hi_x = Math.max.apply(null, xs);
      const lo_y = Math.min.apply(null, ys), hi_y = Math.max.apply(null, ys);
      const spx = Math.max(hi_x - lo_x, 1e-6), spy = Math.max(hi_y - lo_y, 1e-6);
      const sc = Math.min((460 - 2 * ox) / spx, (300 - 2 * (300 - oy)) / spy, 120);
      const cx = (lo_x + hi_x) / 2, cy = (lo_y + hi_y) / 2;
      const PX = function (x) { return ox + (x - cx) * sc; };
      const PY = function (y) { return oy - (y - cy) * sc; };

      const s = fig.scene(el, { width: 500, height: 300 });
      s.line(24, PY(0), 476, PY(0), "fig-grid");
      s.line(PX(0), 278, PX(0), 22, "fig-grid");

      const unit = pts.map(function (p) { return [PX(p[0]), PY(p[1])]; });
      s.poly(unit.concat([unit[0]]), "fig-alt fig-dash");

      const mapped = img.map(function (p) { return [PX(p[0]), PY(p[1])]; });
      s.poly(mapped.concat([mapped[0]]), "fig-region");
      s.poly(mapped.concat([mapped[0]]), "fig-line");

      s.arrow(PX(0), PY(0), PX(img[1][0]), PY(img[1][1]), "fig-third");
      s.arrow(PX(0), PY(0), PX(img[3][0]), PY(img[3][1]), "fig-third");

      s.text(PX(0) + 8, PY(0) + 18, "origin", { cls: "fig-label", anchor: "start" });
      s.text(PX(img[1][0]) + 9, PY(img[1][1]) + 15, "Au", { cls: "fig-val", anchor: "start" });
      s.text(PX(img[3][0]) - 9, PY(img[3][1]) - 8, "Av", { cls: "fig-val", anchor: "end" });
      s.text(PX(0) + 8, PY(0) - 12, "unit square", { cls: "fig-label", anchor: "start" });
      s.commit();

      const detv = a11 * a22 - a12 * a21;
      if (note) {
        note.textContent = "The pale square is the unit square; the amber quadrilateral is its image under A.  " +
          "Column vectors Au and Av multiply the determinant by " +
          (detv < 0 ? "negative" : detv > 0 ? "positive" : "zero") +
          ", so the area scales by " + fig.num_fmt(Math.abs(detv)) + ".";
      }
    }

    fig.auto_draw(function () { draw_fig_matrix(); });
