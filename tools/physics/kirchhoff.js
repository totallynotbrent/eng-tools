
    function parse_lines(text) {
      const out = [];
      for (let raw of text.split("\n")) {
        raw = raw.trim();
        if (!raw || raw[0] === "#") continue;
        const tok = raw.split(/[\s,]+/).filter(function (t) { return t; });
        if (tok.length) out.push(tok);
      }
      return out;
    }

    function solve_kirchhoff() {
      const err = document.getElementById("err");
      err.textContent = "";

      const node_lines = parse_lines(document.getElementById("nodes").value);
      const res_lines = parse_lines(document.getElementById("resistors").value);
      const src_lines = parse_lines(document.getElementById("sources").value);
      const gnd = parseInt(document.getElementById("ground").value) || 0;

      const ids = [];
      for (const t of node_lines) ids.push(parseInt(t[0]));
      ids.push(gnd);
      const uniq = Array.from(new Set(ids));
      const idx = {};
      uniq.forEach(function (id, i) { idx[id] = i; });
      const n = uniq.length;
      const gnd_index = idx[gnd];

      const g = [];
      const currents = [];
      for (let i = 0; i < n; i++) { g.push(new Array(n).fill(0)); currents.push(0); }

      for (let i = 0; i < res_lines.length; i++) {
        const t = res_lines[i];
        const a = parseInt(t[0]), b = parseInt(t[1]), r = parseFloat(t[2]);
        if (!(a in idx) || !(b in idx)) { err.textContent = "resistor " + (i + 1) + " references an unknown node"; return; }
        if (r <= 0 || !isFinite(r)) { err.textContent = "resistor " + (i + 1) + " needs a positive resistance"; return; }
        const ia = idx[a], ib = idx[b], c = 1 / r;
        g[ia][ia] += c; g[ib][ib] += c;
        g[ia][ib] -= c; g[ib][ia] -= c;
      }

      for (let i = 0; i < src_lines.length; i++) {
        const t = src_lines[i];
        const a = parseInt(t[0]), b = parseInt(t[1]), v = parseFloat(t[2]);
        if (!(a in idx) || !(b in idx)) { err.textContent = "source " + (i + 1) + " references an unknown node"; return; }
        // pin the from-node of each source as a fixed-voltage reference:
        // not implemented yet, so reject sources for now (resistive nets only)
        err.textContent = "voltage sources need a modified nodal analysis, not supported here yet";
        return;
      }

      // remove the ground row/col by pinning it, then solve the rest
      const keep = [];
      for (let i = 0; i < n; i++) if (i !== gnd_index) keep.push(i);
      const k = keep.length;
      const A = [], bvec = [];
      for (let i = 0; i < k; i++) {
        A.push(keep.map(function (j) { return g[keep[i]][j]; }));
        bvec.push(0);
      }

      const vnode = gauss_solve(A, bvec);
      if (vnode === null) { err.textContent = "singular conductance matrix, check the circuit"; return; }

      const lines = [];
      for (let i = 0; i < k; i++) lines.push(["node " + uniq[keep[i]], fmt(vnode[i], 6) + " V"]);
      if (!lines.length) { err.textContent = "no nodes to solve"; return; }
      render_lines("lines", lines);
    }

    function draw_fig_kirchhoff() {
      const el = document.getElementById("fig-kirchhoff");
      const note = document.getElementById("fig-kirchhoff-note");
      if (!el || !window.fig) return;
      const nodes = [];
      parse_lines(document.getElementById("nodes").value).forEach(function (t) {
        const id = parseInt(t[0]);
        if (isFinite(id) && nodes.indexOf(id) < 0) nodes.push(id);
      });
      const ground = parseInt(document.getElementById("ground").value) || 0;
      if (nodes.indexOf(ground) < 0) nodes.push(ground);
      const edges = [];
      parse_lines(document.getElementById("resistors").value).forEach(function (t) {
        const a = parseInt(t[0]), b = parseInt(t[1]), rv = parseFloat(t[2]);
        if (isFinite(a) && isFinite(b) && isFinite(rv) && rv > 0) edges.push([a, b, rv]);
      });
      if (edges.length > 12) {
        if (note) note.textContent = "Schematic limited to twelve resistors for readability.";
        return;
      }
      const pos = {};
      nodes.forEach(function (id, ni) {
        const angle = -Math.PI / 2 + ni * 2 * Math.PI / Math.max(nodes.length, 1);
        const rx = nodes.length <= 2 ? 150 : 175, ry = nodes.length <= 2 ? 0 : 105;
        pos[id] = [280 + rx * Math.cos(angle), 145 + ry * Math.sin(angle)];
      });
      const s = fig.scene(el, { width: 560, height: 310 });
      edges.forEach(function (edge) {
        const pa = pos[edge[0]], pb = pos[edge[1]];
        if (!pa || !pb) return;
        s.line(pa[0], pa[1], pb[0], pb[1], "fig-wire");
        s.text((pa[0] + pb[0]) / 2, (pa[1] + pb[1]) / 2 - 5, fig.num_fmt(edge[2]) + " Ω", { cls: "fig-val" });
      });
      nodes.forEach(function (id) {
        const p = pos[id];
        s.circle(p[0], p[1], 15, id === ground ? "fig-good" : "fig-band");
        s.text(p[0], p[1] + 4, String(id), { cls: "fig-val" });
        if (id === ground) {
          s.line(p[0], p[1] + 16, p[0], p[1] + 25, "fig-wire");
          s.line(p[0] - 10, p[1] + 25, p[0] + 10, p[1] + 25, "fig-wire");
          s.line(p[0] - 7, p[1] + 29, p[0] + 7, p[1] + 29, "fig-wire");
          s.line(p[0] - 4, p[1] + 33, p[0] + 4, p[1] + 33, "fig-wire");
        }
      });
      s.text(280, 20, "resistive network and ground node", { cls: "fig-label" });
      s.commit();
      if (note) note.textContent = nodes.length + " nodes, " + edges.length + " resistors. Node " + ground + " is held at ground potential.";
    }

    fig.auto_draw(function () { draw_fig_kirchhoff(); });
