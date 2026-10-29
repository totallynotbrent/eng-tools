
    function solve_centroid() {
      const err = document.getElementById("err");
      err.textContent = "";

      const shapes = [];
      for (let i = 1; i <= 4; i++) {
        const type = document.getElementById("type" + i).value;
        const d1 = val("d" + i + "a"), d2 = val("d" + i + "b");
        const cx = val("cx" + i), cy = val("cy" + i);
        if (d1 === null && d2 === null && cx === null && cy === null) continue;
        if (d1 === null || cx === null || cy === null) {
          err.textContent = "shape " + i + " needs its size and centroid position";
          return;
        }
        if (type !== "circle" && d2 === null) { err.textContent = "shape " + i + " needs both dimensions"; return; }

        let A, ixx, iyy;
        if (type === "rect") {
          const b = d1, h = d2;
          A = b * h; ixx = b * h * h * h / 12; iyy = h * b * b * b / 12;
        } else if (type === "circle") {
          const r = d1;
          A = Math.PI * r * r; ixx = Math.PI * Math.pow(r, 4) / 4; iyy = ixx;
        } else {
          const b = d1, h = d2;
          A = b * h / 2; ixx = b * h * h * h / 36; iyy = h * b * b * b / 36;
        }
        shapes.push({ A: A, ixx: ixx, iyy: iyy, cx: cx, cy: cy });
      }

      if (!shapes.length) { err.textContent = "add at least one shape"; return; }

      let at = 0, sx = 0, sy = 0;
      for (const s of shapes) { at += s.A; sx += s.A * s.cx; sy += s.A * s.cy; }
      const xb = sx / at, yb = sy / at;

      let itx = 0, ity = 0;
      for (const s of shapes) {
        itx += s.ixx + s.A * Math.pow(s.cy - yb, 2);
        ity += s.iyy + s.A * Math.pow(s.cx - xb, 2);
      }

      render_lines("lines", [
        ["total area", fmt(at, 6)],
        ["centroid x", fmt(xb, 6)],
        ["centroid y", fmt(yb, 6)],
        ["Ixx (about centroid)", fmt(itx, 6)],
        ["Iyy (about centroid)", fmt(ity, 6)],
        ["radius of gyration x", fmt(Math.sqrt(itx / at), 6)],
        ["radius of gyration y", fmt(Math.sqrt(ity / at), 6)]
      ]);
    }

    function draw_fig_centroid() {
      const el = document.getElementById("fig-centroid");
      const note = document.getElementById("fig-centroid-note");
      if (!el || !window.fig) return;
      const DEFAULTS = {
        type1: "rect", d1a: "8", d1b: "4", cx1: "0", cy1: "0",
        type2: "circle", d2a: "3", cx2: "7", cy2: "0",
        type3: "tri", d3a: "6", d3b: "4", cx3: "-4", cy3: "5"
      };
      const hv = fig.harvest(solve_centroid, DEFAULTS);
      if (!hv.rows.length) {
        if (note) note.textContent = "give each shape its size and centroid position.";
        return;
      }
      const find = function (frag) {
        for (let i = 0; i < hv.rows.length; i++) {
          if (hv.rows[i].label.toLowerCase().indexOf(frag) >= 0) return hv.rows[i];
        }
        return null;
      };
      const areaRow = find("total area"), xRow = find("centroid x"), yRow = find("centroid y");

      // collect the shapes the page actually used
      const shapes = [];
      for (let i = 1; i <= 4; i++) {
        // read the shape list from the harvested values, not the restored fields
        const type = hv.values["type" + i];
        const a = parseFloat(hv.values["d" + i + "a"]);
        const b = parseFloat(hv.values["d" + i + "b"]);
        const cx = parseFloat(hv.values["cx" + i]);
        const cy = parseFloat(hv.values["cy" + i]);
        if (!type || !isFinite(a) || !isFinite(cx) || !isFinite(cy)) continue;
        if (type !== "circle" && !isFinite(b)) continue;
        shapes.push({ type: type, a: a, b: b, cx: cx, cy: cy });
      }
      if (!shapes.length) {
        if (note) note.textContent = "give each shape its size and centroid position.";
        return;
      }

      // world extents
      let xmin = Infinity, xmax = -Infinity, ymin = Infinity, ymax = -Infinity;
      shapes.forEach(function (sh) {
        let hw, hh;
        if (sh.type === "circle") { hw = sh.a; hh = sh.a; }
        else { hw = sh.a / 2; hh = sh.b / 2; }
        xmin = Math.min(xmin, sh.cx - hw); xmax = Math.max(xmax, sh.cx + hw);
        ymin = Math.min(ymin, sh.cy - hh); ymax = Math.max(ymax, sh.cy + hh);
      });
      const xb = xRow ? xRow.num : NaN, yb = yRow ? yRow.num : NaN;
      if (isFinite(xb)) { xmin = Math.min(xmin, xb); xmax = Math.max(xmax, xb); }
      if (isFinite(yb)) { ymin = Math.min(ymin, yb); ymax = Math.max(ymax, yb); }
      const padw = (xmax - xmin) * 0.16 + 1, padh = (ymax - ymin) * 0.16 + 1;
      xmin -= padw; xmax += padw; ymin -= padh; ymax += padh;

      const W = 560, H = 340;
      const pad = { l: 46, r: 18, t: 24, b: 40 };
      const sx = (W - pad.l - pad.r) / Math.max(xmax - xmin, 1e-6);
      const sy = (H - pad.t - pad.b) / Math.max(ymax - ymin, 1e-6);
      const sc = Math.min(sx, sy);
      const ox = pad.l + (W - pad.l - pad.r - (xmax - xmin) * sc) / 2;
      const oy = H - pad.b - (H - pad.t - pad.b - (ymax - ymin) * sc) / 2;
      const PX = function (x) { return ox + (x - xmin) * sc; };
      const PY = function (y) { return oy - (y - ymin) * sc; };

      const s = fig.scene(el, { width: W, height: H });
      // axes
      s.line(PX(xmin), PY(0), PX(xmax), PY(0), "fig-axis");
      s.line(PX(0), PY(ymin), PX(0), PY(ymax), "fig-axis");
      s.text(PX(xmax), PY(0) + 14, "x", { cls: "fig-lab-x" });
      s.text(PX(0) + 12, PY(ymax) + 4, "y", { cls: "fig-lab-y" });

      // shapes
      shapes.forEach(function (sh, idx) {
        if (sh.type === "circle") {
          s.circle(PX(sh.cx), PY(sh.cy), sh.a * sc, "fig-square");
        } else if (sh.type === "tri") {
          const hl = sh.b / 2, hb = sh.b / 6;
          s.poly([
            [PX(sh.cx - sh.a / 2), PY(sh.cy - hb)],
            [PX(sh.cx + sh.a / 2), PY(sh.cy - hb)],
            [PX(sh.cx), PY(sh.cy + hl * 2 / 3)]
          ], "fig-tri");
        } else {
          s.rect(PX(sh.cx - sh.a / 2), PY(sh.cy + sh.b / 2), sh.a * sc, sh.b * sc, "fig-square");
        }
        s.circle(PX(sh.cx), PY(sh.cy), 3, "fig-dot");
        const hh = sh.type === "circle" ? sh.a : sh.b;
        const ly = sh.type === "tri" ? PY(sh.cy) - hh * sc * 0.62 - 6 : PY(sh.cy) + hh * sc * 0.62 + 14;
        s.text(PX(sh.cx), ly, "shape " + (idx + 1), { cls: "fig-sub" });
      });

      // composite centroid
      if (isFinite(xb) && isFinite(yb)) {
        s.circle(PX(xb), PY(yb), 9, "fig-ring");
        s.line(PX(xb) - 13, PY(yb), PX(xb) + 13, PY(yb), "fig-val-stroke");
        s.line(PX(xb), PY(yb) - 13, PX(xb), PY(yb) + 13, "fig-val-stroke");
        const lab_right = PX(xb) + 16 + 110 < W;
        s.text(PX(xb) + (lab_right ? 16 : -16), PY(yb) - 14,
          "combined centroid", { cls: "fig-val", anchor: lab_right ? "start" : "end" });
      }
      s.commit();

      if (note) {
        let txt = "Combined area " + fig.num_fmt(areaRow ? areaRow.num : NaN) +
          ", centroid at x = " + fig.num_fmt(xb) + ", y = " + fig.num_fmt(yb) + ".  ";
        const ixx = find("ixx"), iyy = find("iyy"), kx = find("radius of gyration x");
        if (ixx) txt += "Ixx about the centroid " + fig.num_fmt(ixx.num) + ".  ";
        if (iyy) txt += "Iyy " + fig.num_fmt(iyy.num) + ".  ";
        if (kx) txt += "Radius of gyration in x " + fig.num_fmt(kx.num) + ".";
        note.textContent = txt;
      }
    }

    fig.auto_draw(function () { draw_fig_centroid(); });
