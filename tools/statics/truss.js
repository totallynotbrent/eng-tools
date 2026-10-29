
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

    function truss_model(node_text, member_text, load_text) {
      const node_lines = parse_lines(node_text);
      const member_lines = parse_lines(member_text);
      const load_lines = parse_lines(load_text);

      const nodes = [];
      for (let i = 0; i < node_lines.length; i++) {
        const t = node_lines[i];
        const x = parseFloat(t[0]), y = parseFloat(t[1]);
        if (!isFinite(x) || !isFinite(y)) { return { err: "node " + (i + 1) + " needs x and y" }; }
        let type = "free";
        if (t[2] === "pin" || t[2] === "roller") type = t[2];
        nodes.push({ x: x, y: y, type: type });
      }
      if (nodes.length < 2) { return { err: "add at least two nodes" }; }

      const members = [];
      for (let i = 0; i < member_lines.length; i++) {
        const t = member_lines[i];
        const a = parseInt(t[0]) - 1, b = parseInt(t[1]) - 1;
        if (a < 0 || b < 0 || a >= nodes.length || b >= nodes.length) { return { err: "member " + (i + 1) + " references a bad node" }; }
        if (a === b) { return { err: "member " + (i + 1) + " connects a node to itself" }; }
        members.push([a, b]);
      }

      const loads = [];
      for (let i = 0; i < load_lines.length; i++) {
        const t = load_lines[i];
        const ni = parseInt(t[0]) - 1;
        const fx = parseFloat(t[1]), fy = parseFloat(t[2]);
        if (ni < 0 || ni >= nodes.length || !isFinite(fx) || !isFinite(fy)) { return { err: "load " + (i + 1) + " is malformed" }; }
        loads.push({ n: ni, fx: fx, fy: fy });
      }

      const n = nodes.length, m = members.length;
      const rxn = [];
      for (let i = 0; i < n; i++) {
        if (nodes[i].type === "pin") { rxn.push({ n: i, c: "x" }); rxn.push({ n: i, c: "y" }); }
        else if (nodes[i].type === "roller") { rxn.push({ n: i, c: "y" }); }
      }
      const r = rxn.length;
      const nu = m + r, ne = 2 * n;

      if (ne !== nu) {
        const what = ne < nu ? "statically indeterminate" : "unstable, not enough members/supports";
        err.textContent = "2n = " + ne + " but unknowns = " + nu + " (" + m + " members + " + r + " reactions): " + what;
        return;
      }

      const A = [], P = [];
      for (let e = 0; e < ne; e++) { A.push(new Array(nu).fill(0)); P.push(0); }

      for (let k = 0; k < m; k++) {
        const a = members[k][0], b = members[k][1];
        const dx = nodes[b].x - nodes[a].x;
        const dy = nodes[b].y - nodes[a].y;
        const L = Math.hypot(dx, dy);
        if (L < 1e-9) { return { err: "member " + (k + 1) + " has zero length" }; }
        const ex = dx / L, ey = dy / L;
        A[2 * a][k] -= ex; A[2 * a + 1][k] -= ey;
        A[2 * b][k] += ex; A[2 * b + 1][k] += ey;
      }

      for (let j = 0; j < r; j++) {
        const row = rxn[j].c === "x" ? 2 * rxn[j].n : 2 * rxn[j].n + 1;
        A[row][m + j] = 1;
      }

      for (const ld of loads) { P[2 * ld.n] += ld.fx; P[2 * ld.n + 1] += ld.fy; }
      for (let i = 0; i < ne; i++) P[i] = -P[i];

      const x = gauss_solve(A, P);
      if (x === null) { return { err: "singular system, checks as a mechanism or bad geometry" }; }

      const forces = x.slice(0, m);
      const reactions = x.slice(m);
      let fmax = 0;
      for (let k = 0; k < m; k++) fmax = Math.max(fmax, Math.abs(forces[k]));
      for (let j = 0; j < r; j++) fmax = Math.max(fmax, Math.abs(reactions[j]));

      return {
        nodes: nodes,
        members: members.map(function (mem, i) { return { a: mem[0], b: mem[1], i: i }; }),
        loads: loads,
        rxn: rxn,
        forces: forces,
        reactions: reactions,
        fmax: fmax
      };
    }

    function solve_truss() {
      const err = document.getElementById("err");
      err.textContent = "";

      const model = truss_model(
        document.getElementById("nodes").value,
        document.getElementById("members").value,
        document.getElementById("loads").value
      );
      if (model.err) { return { err: model.err }; }

      const lines = [];
      for (let k = 0; k < model.members.length; k++) {
        const f = model.forces[k];
        const label = "member " + (model.members[k].a + 1) + "-" + (model.members[k].b + 1);
        lines.push([label, fmt(f, 6) + (f > 0 ? "  (tension)" : f < 0 ? "  (compression)" : "")]);
      }
      for (let j = 0; j < model.rxn.length; j++) {
        lines.push(["R" + model.rxn[j].c + " @ node " + (model.rxn[j].n + 1), fmt(model.reactions[j], 6)]);
      }
      render_lines("lines", lines);
    }

    function draw_fig_truss() {
      const el = document.getElementById("fig-truss");
      const note = document.getElementById("fig-truss-note");
      if (!el || !window.fig) return;

      const DEFAULTS = { nodes: "0 0 pin\n4 0 roller\n2 3", members: "1 2\n1 3\n2 3", loads: "3 0 -10" };

      let model = null;
      const harv = fig.harvest(function () {
        model = truss_model(
          document.getElementById("nodes").value,
          document.getElementById("members").value,
          document.getElementById("loads").value
        );
        if (!model.err) {
          const lines = [];
          for (let k = 0; k < model.members.length; k++) {
            const f = model.forces[k];
            lines.push(["member " + (model.members[k].a + 1) + "-" + (model.members[k].b + 1), fmt(f, 6)]);
          }
          render_lines("lines", lines);
        }
      }, DEFAULTS);

      if (!model || model.err) {
        if (note) note.textContent = "describe the nodes, members and loads to draw the truss.";
        return;
      }

      const xs = model.nodes.map(function (nd) { return nd.x; });
      const ys = model.nodes.map(function (nd) { return nd.y; });
      const minx = Math.min.apply(null, xs), maxx = Math.max.apply(null, xs);
      const miny = Math.min.apply(null, ys), maxy = Math.max.apply(null, ys);
      const W = 520, H = 320;
      const pad = 44;
      const spanx = Math.max(maxx - minx, 1e-6), spany = Math.max(maxy - miny, 1e-6);
      const sc = Math.min((W - 2 * pad) / spanx, (H - 2 * pad) / spany);
      const ox = pad + ((W - 2 * pad) - spanx * sc) / 2;
      const oy = H - pad - ((H - 2 * pad) - spany * sc) / 2;
      const px = function (x) { return ox + (x - minx) * sc; };
      const py = function (y) { return oy - (y - miny) * sc; };

      const s = fig.scene(el, { width: W, height: H });

      model.members.forEach(function (mb) {
        const f = model.forces[mb.i];
        const tension = f >= 0;
        const mag = Math.abs(f);
        const wdt = mag > 1e-9 ? 1.4 + Math.min(3.2, Math.sqrt(mag / Math.max(model.fmax, 1e-9)) * 2.6) : 1;
        const na = model.nodes[mb.a], nb = model.nodes[mb.b];
        const extra = { "stroke-width": wdt };
        if (!tension) extra["stroke-dasharray"] = "6 3";
        s.line(px(na.x), py(na.y), px(nb.x), py(nb.y), tension ? "fig-line" : "fig-third", extra);
      });

      model.loads.forEach(function (ld) {
        const nd = model.nodes[ld.n];
        const len = 26;
        const mag = Math.hypot(ld.fx, ld.fy);
        if (mag < 1e-9) return;
        const ux = ld.fx / mag, uy = ld.fy / mag;
        s.arrow(px(nd.x) + ux * len, py(nd.y) - uy * len, px(nd.x), py(nd.y), "fig-alt");
        s.text(px(nd.x) + ux * (len + 16), py(nd.y) - uy * (len + 16),
          "(" + fig.num_fmt(ld.fx) + ", " + fig.num_fmt(ld.fy) + ")",
          { cls: "fig-label" });
      });

      model.nodes.forEach(function (nd, i) {
        s.circle(px(nd.x), py(nd.y), 4, "fig-dot");
        s.text(px(nd.x) + 9, py(nd.y) - 7, String(i + 1), { cls: "fig-val", anchor: "start" });
        if (nd.type === "pin" || nd.type === "roller") {
          const gy = py(nd.y);
          s.poly([[px(nd.x), gy], [px(nd.x) - 9, gy + 13], [px(nd.x) + 9, gy + 13]], "fig-alt");
          if (nd.type === "pin") {
            s.line(px(nd.x) - 12, gy + 14, px(nd.x) + 12, gy + 14, "fig-alt");
            for (let hh = -10; hh <= 10; hh += 5) {
              s.line(px(nd.x) + hh, gy + 14, px(nd.x) + hh - 4, gy + 19, "fig-guide");
            }
          } else {
            s.circle(px(nd.x) - 5, gy + 16, 3, "fig-alt");
            s.circle(px(nd.x) + 5, gy + 16, 3, "fig-alt");
            s.line(px(nd.x) - 12, gy + 20, px(nd.x) + 12, gy + 20, "fig-alt");
          }
        }
      });

      s.commit();

      const tens = model.forces.filter(function (f) { return f > 1e-9; }).length;
      const comp = model.forces.filter(function (f) { return f < -1e-9; }).length;
      if (note) {
        note.textContent = (harv.defaults_used ? "sample case.  " : "") +
          "solid members are in tension, dashed in compression: " + tens + " tensile, " + comp +
          " compressive.  Largest magnitude " + fig.num_fmt(model.fmax) + ".";
      }
    }

    fig.auto_draw(function () { draw_fig_truss(); });
