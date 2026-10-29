
    function parse_rows(id, n) {
      const out = [];
      for (const raw of document.getElementById(id).value.split("\n")) {
        const t = raw.trim();
        if (!t) continue;
        const parts = t.split(/[\s,]+/).map(parseFloat);
        if (parts.length < n || parts.some(function (x) { return !isFinite(x); })) return null;
        out.push(parts);
      }
      return out;
    }

    function solve_loads() {
      const err = document.getElementById("err");
      err.textContent = "";

      const seg_rows = parse_rows("segs", 4);
      if (!seg_rows || seg_rows.length < 2) { err.textContent = "each segment line needs mass, base diameter, tip diameter, and length"; return; }
      const coefs = parse_rows("coefs", 2);
      const q = val("q"), alpha_deg = val("alpha");
      const ax_lo = val("ax_lo"), ax_mq = val("ax_mq");
      const g_rho = val("g_rho"), g_gust = val("g_gust");
      const g = 9.80665;

      if (ax_lo === null || ax_mq === null) { err.textContent = "enter both axial accelerations"; return; }

      const flight = q !== null && alpha_deg !== null;
      const alpha = alpha_deg === null ? 0 : alpha_deg * Math.PI / 180;
      const has_coefs = coefs !== null && coefs.length === seg_rows.length;

      // stations measured from the vehicle base; mq mass defaults to the liftoff mass
      const segs = [];
      let xbase = 0;
      for (let i = 0; i < seg_rows.length; i++) {
        const m = seg_rows[i][0], db = seg_rows[i][1], dt_d = seg_rows[i][2], len = seg_rows[i][3];
        const m_mq = seg_rows[i].length > 4 ? seg_rows[i][4] : m;
        if (m <= 0 || m_mq <= 0 || len <= 0 || db <= 0 || dt_d < 0) { err.textContent = "segment " + (i + 1) + " has bad geometry or mass"; return; }
        const a_ref = (db + dt_d) * len / 2;
        const hc = len * (db + 2 * dt_d) / (3 * (db + dt_d));
        segs.push({ m: m, m_mq: m_mq, a_ref: a_ref, x_ac: xbase + hc, xbase: xbase, cd: has_coefs ? coefs[i][1] : 0.7, cna: has_coefs ? coefs[i][0] : 0 });
        xbase += len;
      }

      const m_lo = segs.reduce(function (s, r) { return s + r.m; }, 0);
      const m_mq_tot = segs.reduce(function (s, r) { return s + r.m_mq; }, 0);
      const x_cg = segs.reduce(function (s, r) { return s + r.m_mq * r.x_ac; }, 0) / m_mq_tot;

      // ground wind loads
      const g_ok = g_rho !== null && g_gust !== null;
      const dg = segs.map(function (s) {
        if (!g_ok) return 0;
        const vss = 9.5 * Math.pow(s.x_ac, 0.2);
        const vr = g_gust * vss;
        return 0.7 * 0.5 * g_rho * vr * vr * s.a_ref;
      });

      // flight loads
      let nz = 0;
      if (flight) {
        const fy = segs.map(function (s) {
          const fn = q * s.cna * alpha * s.a_ref;
          const fd = q * s.cd * s.a_ref;
          return fn * Math.cos(alpha) - fd * Math.sin(alpha);
        });
        const fx = segs.map(function (s) {
          const fn = q * s.cna * alpha * s.a_ref;
          const fd = q * s.cd * s.a_ref;
          return fn * Math.sin(alpha) + fd * Math.cos(alpha);
        });
        // trim thrust at the base balances the pitching moment about the cg
        const ma_cg = fy.reduce(function (s, f, i) { return s + f * (segs[i].x_ac - x_cg); }, 0);
        const ft_y = -ma_cg / (0 - x_cg);
        nz = (fy.reduce(function (s, f) { return s + f; }, 0) + ft_y) / m_mq_tot;
        segs.forEach(function (s, i) {
          s.fy = fy[i];
          s.fx = fx[i];
          s.fnet = fy[i] - s.m_mq * nz;
        });
      }

      const lines = [
        ["vehicle length", fmt(xbase, 6) + " m"],
        ["mass centroid xCG", fmt(x_cg, 6) + " m"]
      ];
      if (flight) {
        const ma_cg = segs.reduce(function (s, r) { return s + r.fy * (r.x_ac - x_cg); }, 0);
        lines.push(["trim thrust FY", fmt(-ma_cg / (0 - x_cg) / 1e3, 6) + " kN"]);
        lines.push(["lateral acceleration nz", fmt(nz, 6) + " m/s&sup2;"]);
      }

      // interface stations: vehicle base, each segment joint, and the nose tip plane
      const stations = [];
      for (let j = 0; j < segs.length; j++) stations.push([segs[j].xbase, j]);
      stations.push([xbase, segs.length]);

      for (const st of stations) {
        const xj = st[0];
        const idx = st[1];  // segments with index >= idx sit above this station
        let vg = 0, mg = 0, vf = 0, mf = 0, m_above = 0, mq_above = 0, fx_sum = 0;
        for (let i = idx; i < segs.length; i++) {
          const s = segs[i];
          m_above += s.m;
          mq_above += s.m_mq;
          vg += dg[i];
          mg += dg[i] * (s.x_ac - xj);
          if (flight) {
            vf += s.fnet;
            mf += s.fy * (s.x_ac - xj) - s.m_mq * nz * (s.x_ac - xj);
            fx_sum += s.fx;
          }
        }
        const name = "station x = " + fmt(xj, 4) + " m";
        if (g_ok) lines.push([name + " (ground)", "V = " + fmt(vg / 1e3, 6) + " kN,  M = " + fmt(mg / 1e3, 6) + " kN&middot;m"]);
        if (flight) {
          lines.push([name + " (flight)", "V = " + fmt(vf / 1e3, 6) + " kN,  M = " + fmt(mf / 1e3, 6) + " kN&middot;m"]);
          lines.push([name + " (axial, max-q)", "N = " + fmt((ax_mq * g * mq_above + fx_sum) / 1e3, 6) + " kN"]);
        }
        lines.push([name + " (axial, liftoff)", "N = " + fmt(ax_lo * g * m_above / 1e3, 6) + " kN"]);
      }

      render_lines("lines", lines);
    }

    function draw_fig_launch() {
      const el = document.getElementById("fig-launch");
      const note = document.getElementById("fig-launch-note");
      if (!el || !window.fig) return;
      const DEFAULTS = {
        segs: "145000 4 4 12 72500\n2100 4 3 3\n56500 3 3 8",
        coefs: "0 0.7\n1.4 0.036\n0 0.7",
        q: "34000", alpha: "40", ax_lo: "1.5", ax_mq: "4.5",
        g_rho: "1.225", g_gust: "0"
      };
      const hv = fig.harvest(solve_loads, DEFAULTS);
      if (!hv.rows.length) {
        if (note) note.textContent = "fill the segment table and the accelerations.";
        return;
      }
      const rows = hv.rows;
      const ground = [], flight = [], liftoff = [];
      let xcg = NaN, length = NaN;
      for (let i = 0; i < rows.length; i++) {
        const lab = rows[i].label, txt = rows[i].text;
        const mx = /x\s*=\s*(-?[0-9.]+)\s*m/i.exec(lab);
        if (!mx) {
          if (lab.indexOf("mass centroid") >= 0) xcg = rows[i].num;
          if (lab.indexOf("vehicle length") >= 0) length = rows[i].num;
          continue;
        }
        const x = parseFloat(mx[1]);
        const vm = /V\s*=\s*(-?[0-9.]+)\s*kN,\s*M\s*=\s*(-?[0-9.]+)/i.exec(txt);
        const nm = /N\s*=\s*(-?[0-9.]+)\s*kN/i.exec(txt);
        if (lab.indexOf("(ground)") >= 0 && vm) ground.push([x, parseFloat(vm[2])]);
        else if (lab.indexOf("(flight)") >= 0 && vm) flight.push([x, parseFloat(vm[2])]);
        else if (lab.indexOf("(axial, liftoff)") >= 0 && nm) liftoff.push([x, parseFloat(nm[1])]);
      }
      if (!liftoff.length && !ground.length) {
        if (note) note.textContent = "fill the segment table and the accelerations.";
        return;
      }

      const series = [];
      if (ground.length) series.push({ pts: ground, cls: "fig-line", label: "bending moment (ground wind)" });
      if (flight.length) series.push({ pts: flight, cls: "fig-third", label: "bending moment (flight)" });
      const xmax = Math.max(length || 0, 1);
      const vals = ground.concat(flight).map(function (p) { return Math.abs(p[1]); });
      const ymax = Math.max.apply(null, vals.concat([1]));

      fig.plot(el, {
        width: 560,
        height: 310,
        x: { label: "station", unit: "m", min: 0, max: xmax },
        y: { label: "bending moment", unit: "kN m", min: 0, max: ymax * 1.12 },
        series: series,
        vlines: isFinite(xcg) ? [{ x: xcg, label: "xCG" }] : [],
        driver: false
      });

      if (note) {
        const top = liftoff.length
          ? "Peak liftoff axial load " + fig.num_fmt(Math.max.apply(null, liftoff.map(function (p) { return p[1]; }))) + " kN. "
          : "";
        note.textContent = top + "Moment grows toward the base where the centre of mass sits at " +
          fig.num_fmt(xcg) + " m, " + fig.num_fmt(length) + " m aft of the tip.";
      }
    }

    fig.auto_draw(function () { draw_fig_launch(); });
