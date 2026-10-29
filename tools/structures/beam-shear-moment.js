
    function beam_at(L, loads, w) {
      const total = loads.reduce(function (s, ld) { return s + ld[0]; }, 0) + (w !== null ? w * L : 0);
      const sum_m = loads.reduce(function (s, ld) { return s + ld[0] * ld[1]; }, 0) +
        (w !== null ? w * L * L / 2 : 0);
      const rb = sum_m / L;
      const ra = total - rb;
      return {
        ra: ra,
        rb: rb,
        total: total,
        at: function (x) {
          let v = ra;
          let m = ra * x;
          for (const ld of loads) {
            if (x >= ld[1]) { v -= ld[0]; m -= ld[0] * (x - ld[1]); }
          }
          if (w !== null) { v -= w * x; m -= w * x * x / 2; }
          return { v: v, m: m };
        }
      };
    }

    function solve_beam() {
      const err = document.getElementById("err");
      err.textContent = "";

      const L = val("len");
      if (L === null || L <= 0) { err.textContent = "enter a positive span"; return; }

      const loads = [];
      let total = 0, sum_m = 0;
      for (const raw of document.getElementById("point").value.split("\n")) {
        const t = raw.trim();
        if (!t) continue;
        const parts = t.split(/[\s,]+/).filter(function (x) { return x !== ""; });
        if (parts.length !== 2) { err.textContent = "each point load needs magnitude and distance"; return; }
        const p = parseFloat(parts[0]), x = parseFloat(parts[1]);
        if (!isFinite(p) || !isFinite(x)) { err.textContent = "bad point load line: " + t; return; }
        if (x < 0 || x > L) { err.textContent = "load at " + x + " sits off the beam"; return; }
        loads.push([p, x]);
        total += p; sum_m += p * x;
      }

      const w = val("udl");
      if (w !== null) { total += w * L; sum_m += w * L * L / 2; }

      const rb = sum_m / L;
      const ra = total - rb;

      const beam_state = beam_at(L, loads, w);

      const lines = [
        ["reaction at A (Ra)", fmt(ra, 6) + " N"],
        ["reaction at B (Rb)", fmt(rb, 6) + " N"]
      ];

      // evaluate shear and moment at requested positions
      const xs_raw = document.getElementById("xs").value.trim();
      if (xs_raw) {
        for (const tok of xs_raw.split(",")) {
          const x = parseFloat(tok);
          if (!isFinite(x) || x < 0 || x > L) continue;
          const st = beam_state.at(x);
          lines.push(["x = " + fmt(x, 4), "V = " + fmt(st.v, 4) + " N,  M = " + fmt(st.m, 4) + " N&middot;m"]);
        }
      }

      render_lines("lines", lines);
    }

    function draw_fig_beam() {
      const el = document.getElementById("fig-beam");
      const note = document.getElementById("fig-beam-note");
      if (!el || !window.fig) return;
      let L = val("len");
      if (L === null || L <= 0) {
        fig.seeded({ len: "6", udl: "0", point: "18 2.5" }, draw_fig_beam);
        return;
      }
      if (L === null || L <= 0) {
        if (note) note.textContent = "enter a span to draw the shear and moment diagrams.";
        return;
      }

      const loads = [];
      for (const raw of document.getElementById("point").value.split("\n")) {
        const t = raw.trim();
        if (!t) continue;
        const parts = t.split(/[\s,]+/).filter(function (x) { return x !== ""; });
        if (parts.length !== 2) continue;
        const p = parseFloat(parts[0]), x = parseFloat(parts[1]);
        if (!isFinite(p) || !isFinite(x)) continue;
        if (x < 0 || x > L) continue;
        loads.push([p, x]);
      }
      const w = val("udl");
      const st = beam_at(L, loads, w);
      const N = 160;
      const v_pts = [], m_pts = [];
      let v_absmax = 0, m_absmax = 0;
      for (let i = 0; i <= N; i++) {
        const x = L * i / N;
        const s = st.at(x);
        v_pts.push([x, s.v]);
        m_pts.push([x, s.m]);
        v_absmax = Math.max(v_absmax, Math.abs(s.v));
        m_absmax = Math.max(m_absmax, Math.abs(s.m));
      }
      if (v_absmax < 1e-12) v_absmax = 1;
      if (m_absmax < 1e-12) m_absmax = 1;

      fig.plot(el, {
        width: 560,
        height: 340,
        x: { label: "position along the beam", unit: "m", min: 0, max: L },
        y: { label: "shear V", unit: "N", min: -v_absmax * 1.15, max: v_absmax * 1.15 },
        y2: { label: "moment M", unit: "N*m", min: -m_absmax * 1.15, max: m_absmax * 1.15 },
        series: [
          { pts: v_pts, cls: "fig-line", label: "V(x)" },
          { pts: m_pts, axis: "y2", cls: "fig-third", label: "M(x)" }
        ],
        vlines: loads.map(function (ld) { return { x: ld[1] }; }),
        marker: { x: 0, y: st.at(0).v, crosshair: true },
        driver: false
      });

      const vmax_idx = v_pts.reduce(function (bi, p, i) {
        return Math.abs(p[1]) > Math.abs(v_pts[bi][1]) ? i : bi;
      }, 0);
      const peak = v_pts[vmax_idx];
      const mm = st.at(peak[0]).m;
      if (note) {
        note.textContent = "Ra = " + fig.num_fmt(st.ra) + " N, Rb = " + fig.num_fmt(st.rb) +
          " N.  Largest |V| is " + fig.num_fmt(Math.abs(peak[1])) + " N at x = " + fig.num_fmt(peak[0]) +
          " m, where the moment reaches " + fig.num_fmt(mm) + " N*m.";
      }
    }

    fig.auto_draw(function () { draw_fig_beam(); });
