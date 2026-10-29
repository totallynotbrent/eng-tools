
    function solve_relv() {
      const err = document.getElementById("err");
      err.textContent = "";

      const va = val("va"), aa = val("aa"), vb = val("vb"), ab = val("ab");
      if (va === null || aa === null || vb === null || ab === null) { err.textContent = "fill both magnitudes and angles"; return; }

      const ta = aa * Math.PI / 180, tb = ab * Math.PI / 180;
      const vax = va * Math.cos(ta), vay = va * Math.sin(ta);
      const vbx = vb * Math.cos(tb), vby = vb * Math.sin(tb);
      const rx = vax - vbx, ry = vay - vby;
      const mag = Math.hypot(rx, ry);
      const dir = Math.atan2(ry, rx) * 180 / Math.PI;

      render_lines("lines", [
        ["vA components", "(" + fmt(vax, 6) + ", " + fmt(vay, 6) + ")"],
        ["vB components", "(" + fmt(vbx, 6) + ", " + fmt(vby, 6) + ")"],
        ["vA/B magnitude", fmt(mag, 6)],
        ["vA/B direction", fmt(dir, 6) + " &deg; from +x"]
      ]);
    }

    function draw_fig_relv() {
      const el = document.getElementById("fig-relv");
      const note = document.getElementById("fig-relv-note");
      if (!el || !window.fig) return;
      const DEFAULTS = { va: "120", aa: "20", vb: "90", ab: "70" };
      const rows = fig.harvest(solve_relv, DEFAULTS).rows;
      const num = function (frag) {
        for (let i = 0; i < rows.length; i++) {
          if (rows[i].label.toLowerCase().indexOf(frag) >= 0) return rows[i].num;
        }
        return NaN;
      };
      const compRow = function (frag) {
        for (let i = 0; i < rows.length; i++) {
          if (rows[i].label.toLowerCase().indexOf(frag) >= 0) return rows[i].nums;
        }
        return [];
      };
      const av = compRow("va components");
      const bv = compRow("vb components");
      const mag = num("magnitude"), dir = num("direction");
      if (!av.length || !bv.length || !isFinite(mag)) {
        if (note) note.textContent = "fill both velocities to draw the triangle.";
        return;
      }
      const vax = av[0], vay = av[1], vbx = bv[0], vby = bv[1];
      const rx = vax - vbx, ry = vay - vby;
      const maxc = Math.max(Math.abs(vax), Math.abs(vay), Math.abs(vbx), Math.abs(vby), Math.abs(rx), Math.abs(ry), 1);
      const W = 520, H = 330;
      const pad = 46;
      const sc = (W - 2 * pad) / (2.15 * maxc);
      const ox = pad + 0.35 * maxc * sc;
      const oy = H - pad - 0.25 * maxc * sc;
      const px = function (x) { return ox + x * sc; };
      const py = function (y) { return oy - y * sc; };

      const s = fig.scene(el, { width: W, height: H });
      s.line(ox, py(0), W - pad, py(0), "fig-grid");
      s.line(ox, py(0), ox, 18, "fig-grid");

      s.arrow(ox, py(0), px(vax), py(vay), "fig-line");
      s.text(px(vax) + 8, py(vay) - 8, "vA", { cls: "fig-val", anchor: "start" });

      s.arrow(px(vbx), py(vby), ox, py(0), "fig-third");
      s.text(px(vbx) - 8, py(vby) - 10, "vB", { cls: "fig-val", anchor: "end" });

      s.arrow(ox, py(0), px(rx), py(ry), "fig-alt");
      s.text(px(rx) + 8, py(ry) + 12, "vA/B", { cls: "fig-val", anchor: "start" });

      s.circle(ox, py(0), 3.5, "fig-dot");
      s.circle(px(vax), py(vay), 3.5, "fig-dot");
      s.circle(px(vbx), py(vby), 3.5, "fig-dot");
      s.text(ox - 10, py(0) + 16, "origin", { cls: "fig-label", anchor: "end" });
      s.commit();

      if (note) {
        note.textContent = "vA/B is the closing side of the triangle: magnitude " + fig.num_fmt(mag) +
          " at " + fig.num_fmt(dir) + " degrees from +x.  vA = (" + fig.num_fmt(vax) + ", " +
          fig.num_fmt(vay) + "), vB = (" + fig.num_fmt(vbx) + ", " + fig.num_fmt(vby) + ").";
      }
    }

    fig.auto_draw(function () { draw_fig_relv(); });
