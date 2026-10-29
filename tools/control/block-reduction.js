
    // parse a comma or space separated coefficient list, highest power first
    function parse_coeffs(t) {
      const parts = t.split(/[\s,]+/).filter(Boolean).map(parseFloat);
      if (!parts.length || parts.some(isNaN)) return null;
      return parts;
    }

    function solve_block() {
      const err = document.getElementById("err");
      err.textContent = "";

      const mode = document.getElementById("struct").value;
      const g1n = parse_coeffs(document.getElementById("g1n").value);
      const g1d = parse_coeffs(document.getElementById("g1d").value);
      const g2n = parse_coeffs(document.getElementById("g2n").value);
      const g2d = parse_coeffs(document.getElementById("g2d").value);
      if (!g1n || !g1d) { err.textContent = "enter G1 as coefficient lists"; return; }
      if (mode !== "feedback" && (!g2n || !g2d)) { err.textContent = "enter G2 as coefficient lists"; return; }

      let num, den;
      if (mode === "series") {
        num = polymul(g1n, g2n);
        den = polymul(g1d, g2d);
      } else if (mode === "parallel") {
        num = polyadd(polymul(g1n, g2d), polymul(g2n, g1d));
        den = polymul(g1d, g2d);
      } else {
        // unity negative feedback: G/(1+G)
        num = g1n;
        den = polyadd(g1d, g1n);
      }

      // cancel the greatest common polynomial factor via matched roots
      const nr = polyroots(num).map(function (r) { return [r[0], r[1]]; });
      const dr = polyroots(den).map(function (r) { return [r[0], r[1]]; });
      const keep_n = [];
      let cancelled = 0;
      for (const r of nr) {
        let hit = -1;
        for (let i = 0; i < dr.length; i++) {
          if (Math.abs(dr[i][0] - r[0]) < 1e-6 && Math.abs(dr[i][1] - r[1]) < 1e-6) { hit = i; break; }
        }
        if (hit >= 0) { dr.splice(hit, 1); cancelled++; } else keep_n.push(r);
      }

      // dc gain: num(0)/den(0)
      const dc = den[den.length - 1] === 0 ? Infinity : num[num.length - 1] / den[den.length - 1];

      const lines = [];
      lines.push(["reduced numerator", poly_str(num)]);
      lines.push(["reduced denominator", poly_str(den)]);
      if (cancelled > 0) lines.push(["cancelled factors", String(cancelled)]);
      lines.push(["dc gain", isFinite(dc) ? fmt(dc, 5) : "infinite"]);
      lines.push(["poles", dr.map(function (r) {
        if (Math.abs(r[1]) < 1e-8) return fmt(r[0], 4);
        return fmt(r[0], 4) + (r[1] >= 0 ? " + " : " &minus; ") + fmt(Math.abs(r[1]), 4) + "j";
      }).join(", ")]);

      render_lines("lines", lines);
      document.getElementById("results").style.display = "";
    }

    function draw_fig_blocks() {
      const el = document.getElementById("fig-blocks");
      const note = document.getElementById("fig-blocks-note");
      if (!el || !window.fig) return;
      const DEFAULTS = { g1n: "1, 3", g1d: "1, 2, 2", g2n: "1, 1", g2d: "1, 3" };
      const hv = fig.harvest(solve_block, DEFAULTS);
      if (!hv.rows.length) {
        if (note) note.textContent = "enter G1 and G2 as comma separated coefficients.";
        return;
      }
      const txt = function (frag) {
        for (let i = 0; i < hv.rows.length; i++) {
          if (hv.rows[i].label.toLowerCase().indexOf(frag) >= 0) return hv.rows[i].text;
        }
        return "";
      };
      const mode = String(hv.values.mode || hv.values.struct || "");
      const nRed = txt("reduced numerator");
      const dRed = txt("reduced denominator");

      const W = 640, H = 230;
      const s = fig.scene(el, { width: W, height: H });
      const cx = W / 2;
      const bx = 130, bw = 118, bh = 46;
      const by = (H - bh) / 2 - 24;

      const blockAt = function (x, title, sub, cls) {
        s.rect(x, by, bw, bh, cls || "fig-box");
        s.text(x + bw / 2, by + 19, title, { cls: "fig-box-title" });
        s.text(x + bw / 2, by + 36, sub, { cls: "fig-sub" });
      };

      if (mode === "parallel") {
        blockAt(cx - bw - 70, "G1", hv.values.g1n || "", "fig-box");
        blockAt(cx + 70, "G2", hv.values.g2n || "", "fig-box");
        s.line(20, by + bh / 2, cx - bw - 70, by + bh / 2, "fig-wire");
        s.line(cx + bw + 70, by + bh / 2, W - 20, by + bh / 2, "fig-wire");
        s.line(cx - bw - 70, by + bh / 2, cx + 70, by + bh / 2, "fig-wire-mid");
        s.poly([[cx, by + bh / 2], [cx, H - 18]], "fig-wire-mid");
        s.arrow(cx, H - 18, cx, H - 44, "fig-wire");
      } else if (mode === "feedback") {
        blockAt(cx - bw / 2, "G1", hv.values.g1n || "", "fig-box");
        s.line(20, by + bh / 2, cx - bw / 2, by + bh / 2, "fig-wire");
        s.line(cx + bw / 2, by + bh / 2, W - 20, by + bh / 2, "fig-wire");
        const fy = H - 60;
        s.poly([[W - 20, by + bh / 2], [W - 20, fy], [cx - bw / 2, fy]], "fig-wire-mid");
        s.poly([[cx - bw / 2, fy], [cx - bw / 2, by + bh]], "fig-wire-mid");
        s.text(W - 90, fy - 8, "-1", { cls: "fig-sub" });
        s.text(cx + bw / 2 + 12, by + bh / 2 - 8, "feedback", { cls: "fig-sub" });
      } else {
        blockAt(cx - bw - 80, "G1", hv.values.g1n || "", "fig-box");
        blockAt(cx + 80, "G2", hv.values.g2n || "", "fig-box");
        s.line(20, by + bh / 2, cx - bw - 80, by + bh / 2, "fig-wire");
        s.line(cx - bw - 80 + bw, by + bh / 2, cx + 80, by + bh / 2, "fig-wire");
        s.line(cx + 80 + bw, by + bh / 2, W - 20, by + bh / 2, "fig-wire");
      }

      s.text(cx, 30, "(" + nRed + ") / (" + dRed + ")", { cls: "fig-val" });
      s.commit();

      if (note) {
        note.textContent = "Diagram follows the selected topology (" + (mode || "series") +
          ").  Common factors in the unreduced form are cancelled algebraically, so the reduced " +
          "transfer function can have fewer poles than the cascade suggests.";
      }
    }

    fig.auto_draw(function () { draw_fig_blocks(); });
