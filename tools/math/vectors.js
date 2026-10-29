
    function solve_vec() {
      const err = document.getElementById("err");
      err.textContent = "";

      const ax = val("ax"), ay = val("ay"), az = val("az");
      const bx = val("bx"), by = val("by"), bz = val("bz");
      if (ax === null || ay === null || az === null || bx === null || by === null || bz === null) {
        err.textContent = "fill all six components";
        return;
      }

      const maga = Math.hypot(ax, ay, az);
      const magb = Math.hypot(bx, by, bz);
      const dot = ax * bx + ay * by + az * bz;
      const cx = ay * bz - az * by;
      const cy = az * bx - ax * bz;
      const cz = ax * by - ay * bx;
      const magc = Math.hypot(cx, cy, cz);

      const lines = [
        ["|a|", fmt(maga, 6)],
        ["|b|", fmt(magb, 6)],
        ["a &middot; b", fmt(dot, 6)],
        ["a &times; b", "(" + fmt(cx, 6) + ", " + fmt(cy, 6) + ", " + fmt(cz, 6) + ")"],
        ["|a &times; b|", fmt(magc, 6)]
      ];

      if (magb > 0) {
        const pscalar = dot / magb;
        lines.push(["projection of a onto b", fmt(pscalar, 6) + " &middot; b&circ;"]);
        lines.push(["projection components", "(" + fmt(pscalar * bx / magb, 6) + ", " + fmt(pscalar * by / magb, 6) + ", " + fmt(pscalar * bz / magb, 6) + ")"]);
      } else {
        lines.push(["projection of a onto b", "n/a (b is zero)"]);
      }

      if (maga > 0 && magb > 0) {
        const cos = Math.max(-1, Math.min(1, dot / (maga * magb)));
        lines.push(["angle between", fmt(Math.acos(cos) * 180 / Math.PI, 6) + " &deg;"]);
      }

      render_lines("lines", lines);
    }

    function draw_fig_vec() {
      const el = document.getElementById("fig-vec");
      const note = document.getElementById("fig-vec-note");
      if (!el || !window.fig) return;
      const DEFAULTS = { ax: "3", ay: "4", az: "0", bx: "4", by: "3", bz: "0" };
      const hv = fig.harvest(solve_vec, DEFAULTS);
      if (!hv.rows.length) {
        if (note) note.textContent = "fill all six components.";
        return;
      }
      const get = function (frag) {
        for (let i = 0; i < hv.rows.length; i++) {
          if (hv.rows[i].label.toLowerCase().indexOf(frag) >= 0) return hv.rows[i].num;
        }
        return NaN;
      };
      const ma = get("|a|"), mb = get("|b|"), dot = get("a · b"), mc = get("|a × b|");
      const ang = get("angle between");
      const A = [parseFloat(hv.values.ax), parseFloat(hv.values.ay), parseFloat(hv.values.az)];
      const B = [parseFloat(hv.values.bx), parseFloat(hv.values.by), parseFloat(hv.values.bz)];
      if (!isFinite(ma) || !isFinite(mb) || !A.every(isFinite) || !B.every(isFinite)) {
        if (note) note.textContent = "fill all six components.";
        return;
      }

      const W = 480, H = 380;
      const s = fig.scene(el, { width: W, height: H });
      const ox = 70, oy = H - 70;
      const k = 42;
      const p3 = function (v) { return [ox + v[0] * k, oy - v[1] * k]; };
      const scale = Math.max(ma, mb, 1) * k;

      // axes
      s.line(ox - scale * 1.1, oy, ox + scale * 1.2, oy, "fig-axis");
      s.line(ox, oy + scale * 0.6, ox, oy - scale * 1.1, "fig-axis");
      s.text(ox + scale * 1.2, oy + 16, "x", { cls: "fig-sub" });
      s.text(ox - 14, oy - scale * 1.1, "y", { cls: "fig-sub" });

      // component projection helper shows xy slices
      const pa = p3(A), pb = p3(B);
      s.poly([[ox, oy], [pa[0], oy], [pa[0], pa[1]]], "fig-guide");
      s.poly([[ox, oy], [pb[0], oy], [pb[0], pb[1]]], "fig-guide");
      s.arrow(ox, oy, pa[0], pa[1], "fig-line");
      s.arrow(ox, oy, pb[0], pb[1], "fig-third");
      s.circle(pa[0], pa[1], 4, "fig-dot");
      s.circle(pb[0], pb[1], 4, "fig-third-fill");
      s.text(pa[0] + 8, pa[1] - 8, "a", { cls: "fig-val", anchor: "start" });
      s.text(pb[0] + 8, pb[1] + 14, "b", { cls: "fig-val", anchor: "start" });

      // arc for the angle between them in the xy plane
      const sa = Math.atan2(-A[1], A[0]), sb = Math.atan2(-B[1], B[0]);
      let d = sb - sa;
      while (d <= -Math.PI) d += 2 * Math.PI;
      while (d > Math.PI) d -= 2 * Math.PI;
      const ar = Math.min(Math.abs(d), 40);
      const steps = 14;
      const arc = [];
      for (let i = 0; i <= steps; i++) {
        const th = sa + (i / steps) * Math.sign(d) * ar;
        arc.push([ox + Math.cos(th) * 30, oy - Math.sin(th) * 30]);
      }
      s.path(arc.map(function (p, i) { return (i ? "L" : "M") + p[0] + "," + p[1]; }).join(""), "fig-val-stroke");
      s.text(ox + 44, oy - 22, fig.num_fmt(ang) + " deg", { cls: "fig-val", anchor: "start" });

      s.text(W / 2, 22, "components drawn in the xy plane", { cls: "fig-label" });
      s.commit();

      if (note) {
        note.textContent = "Magnitudes " + fig.num_fmt(ma) + " and " + fig.num_fmt(mb) +
          ", dot product " + fig.num_fmt(dot) + " and cross product magnitude " + fig.num_fmt(mc) +
          ".  The z components " + fig.num_fmt(A[2]) + " and " + fig.num_fmt(B[2]) +
          " are folded into these numbers but are not visible in the slice.";
      }
    }

    fig.auto_draw(function () { draw_fig_vec(); });
