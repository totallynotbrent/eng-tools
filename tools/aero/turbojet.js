
    function solve_tj() {
      const err = document.getElementById("err");
      err.textContent = "";

      const alt = val("alt"), mach = val("mach"), prc = val("prc"), tt4 = val("tt4"), hpr = val("hpr");
      const mdot_in = val("mdot");
      if (alt === null || mach === null || prc === null || tt4 === null || hpr === null) { err.textContent = "fill every field"; return; }
      if (mdot_in !== null && mdot_in <= 0) { err.textContent = "mass flow must be positive"; return; }
      if (alt < 0 || alt > 47000) { err.textContent = "altitude 0 - 47 km"; return; }
      if (mach < 0 || prc < 1) { err.textContent = "M0 >= 0 and compressor ratio >= 1"; return; }
      if (tt4 < 300 || hpr <= 0) { err.textContent = "Tt4 >= 300 K and hPR > 0"; return; }

      const R = 287, gam = 1.4, cp = gam * R / (gam - 1);

      // 1976 standard atmosphere
      let t0, p0;
      if (alt <= 11000) { t0 = 288.15 - 0.0065 * alt; p0 = 101325 * Math.pow(t0 / 288.15, 5.2559); }
      else if (alt <= 20000) { t0 = 216.65; p0 = 22632 * Math.exp(-(alt - 11000) / 6341.6); }
      else { t0 = 216.65 + 0.001 * (alt - 20000); p0 = 5474.9 * Math.pow(t0 / 216.65, -34.163); }
      const a0 = Math.sqrt(gam * R * t0);
      const v0 = mach * a0;

      // ideal diffuser
      const tt2 = t0 * (1 + (gam - 1) / 2 * mach * mach);
      const pt2 = p0 * Math.pow(tt2 / t0, gam / (gam - 1));

      // compressor
      const tt3 = tt2 * Math.pow(prc, (gam - 1) / gam);
      const pt3 = pt2 * prc;
      if (tt4 <= tt3) { err.textContent = "Tt4 must exceed compressor exit temp " + fmt(tt3, 0) + " K"; return; }

      // burner energy balance fixes f
      const f = cp * (tt4 - tt3) / (hpr - cp * tt4);
      if (f <= 0) { err.textContent = "burner exit temp too high for this fuel"; return; }

      // turbine drives the compressor
      const tt5 = tt4 - (tt3 - tt2) / (1 + f);
      const pt5 = pt3 * Math.pow(tt5 / tt4, gam / (gam - 1));

      // nozzle, fully expanded to ambient
      const m9 = Math.sqrt(2 / (gam - 1) * (Math.pow(pt5 / p0, (gam - 1) / gam) - 1));
      const t9 = tt5 / (1 + (gam - 1) / 2 * m9 * m9);
      const v9 = m9 * Math.sqrt(gam * R * t9);

      const sp_thrust = (1 + f) * v9 - v0;
      if (sp_thrust <= 0) { err.textContent = "no net thrust at these settings"; return; }
      const tsfc = f / sp_thrust * 3600;

      const lines = [];
      lines.push(["freestream T0 / p0", fmt(t0, 5) + " K / " + fmt(p0, 5) + " Pa"]);
      lines.push(["face total Tt2 / pt2", fmt(tt2, 5) + " K / " + fmt(pt2, 5) + " Pa"]);
      lines.push(["compressor exit Tt3 / pt3", fmt(tt3, 5) + " K / " + fmt(pt3, 5) + " Pa"]);
      lines.push(["fuel-air ratio f", fmt(f, 5)]);
      lines.push(["turbine exit Tt5 / pt5", fmt(tt5, 5) + " K / " + fmt(pt5, 5) + " Pa"]);
      lines.push(["nozzle exit mach M9", fmt(m9, 5)]);
      lines.push(["nozzle exit velocity V9", fmt(v9, 5) + " m/s"]);
      lines.push(["specific thrust F/mdot", fmt(sp_thrust, 5) + " N/(kg/s)"]);
      lines.push(["thrust specific fuel consumption", fmt(tsfc, 5) + " kg/(N*h)"]);
      if (mdot_in !== null) {
        const gross = mdot_in * (1 + f) * v9 / 1000;
        const ram = mdot_in * v0 / 1000;
        const net = mdot_in * sp_thrust / 1000;
        const fuel = f * mdot_in;
        lines.push(["gross thrust Fmdot9 V9", fmt(gross, 4) + " kN"]);
        lines.push(["ram drag mdot0 V0", fmt(ram, 4) + " kN"]);
        lines.push(["net thrust FN", fmt(net, 4) + " kN"]);
        lines.push(["fuel flow mdotf", fmt(fuel, 5) + " kg/s"]);
      }

      render_lines("lines", lines);
      document.getElementById("results").style.display = "";
    }

    function draw_fig_turbojet() {
      const el = document.getElementById("fig-turbojet");
      const note = document.getElementById("fig-turbojet-note");
      if (!el || !window.fig) return;
      const DEFAULTS = {
        alt: "0", mach: "0.8", prc: "12", tt4: "1650", hpr: "43000000", mdot: "20"
      };
      const hv = fig.harvest(solve_tj, DEFAULTS);
      if (!hv.rows.length) {
        if (note) note.textContent = "fill every field to draw the station diagram.";
        return;
      }
      const find = function (frag) {
        for (let i = 0; i < hv.rows.length; i++) {
          if (hv.rows[i].label.toLowerCase().indexOf(frag) >= 0) return hv.rows[i];
        }
        return null;
      };
      const two = function (frag) {
        const r = find(frag);
        if (!r) return null;
        return { a: r.nums[0], b: r.nums.length > 1 ? r.nums[1] : NaN };
      };

      const fre = two("freestream"),
        face = two("face total"),
        comp = two("compressor exit"),
        turb = two("turbine exit"),
        fRow = find("fuel-air ratio"),
        m9Row = find("nozzle exit mach"),
        v9Row = find("nozzle exit velocity"),
        fstRow = find("specific thrust"),
        tsfcRow = find("thrust specific fuel"),
        grossRow = find("gross thrust"),
        ramRow = find("ram drag"),
        netRow = find("net thrust"),
        ffRow = find("fuel flow");

      if (!fre || !face || !comp || !turb) {
        if (note) note.textContent = "the station values did not come out cleanly.";
        return;
      }

      const W = 640, H = 330;
      const s = fig.scene(el, { width: W, height: H });
      const y0 = 236;
      const dx = 96;
      const x_start = 78;

      // station rail with the thermodynamic path
      s.line(x_start - 26, y0, x_start + dx * 5 + 26, y0, "fig-axis");
      const sts = [
        { x: x_start + dx * 0, name: "free\nstream", label: "0", t: fre.a, p: fre.b },
        { x: x_start + dx * 1, name: "face", label: "2", t: face.a, p: face.b },
        { x: x_start + dx * 2, name: "compressor\nexit", label: "3", t: comp.a, p: comp.b },
        { x: x_start + dx * 3, name: "burner\nexit", label: "4", t: parseFloat(hv.values.tt4), p: NaN },
        { x: x_start + dx * 4, name: "turbine\nexit", label: "5", t: turb.a, p: turb.b },
        { x: x_start + dx * 5, name: "nozzle\nexit", label: "9", t: NaN, p: NaN }
      ];

      let tmin = Infinity, tmax = -Infinity;
      sts.forEach(function (st) {
        if (isFinite(st.t)) { tmin = Math.min(tmin, st.t); tmax = Math.max(tmax, st.t); }
      });
      if (!isFinite(tmin)) { tmin = 0; tmax = 1; }
      const span = Math.max(tmax - tmin, 1);
      const ty = function (t) { return y0 - 26 - (t - tmin) / span * 130; };

      // temperature path
      const path = [];
      sts.forEach(function (st) { if (isFinite(st.t)) path.push([st.x, ty(st.t)]); });
      s.poly(path, "fig-line");
      sts.forEach(function (st) {
        if (!isFinite(st.t)) return;
        s.circle(st.x, ty(st.t), 5, "fig-dot");
        s.text(st.x, ty(st.t) - 12, fig.num_fmt(st.t, 0) + " K", { cls: "fig-val" });
      });
      // pressure path on the same stations
      const pres = [];
      sts.forEach(function (st) { if (isFinite(st.p)) pres.push([st.x, ty(st.p / 1000)]); });
      if (pres.length > 1) s.poly(pres, "fig-third");

      // station boxes
      sts.forEach(function (st) {
        s.rect(st.x - 38, y0 - 1, 76, 42, "fig-box");
        s.text(st.x, y0 + 12, st.name.split("\n")[0], { cls: "fig-box-title" });
        s.text(st.x, y0 + 27, st.name.split("\n")[1] || ("station " + st.label), { cls: "fig-sub" });
        s.text(st.x, y0 + 54, "(" + st.label + ")", { cls: "fig-sub" });
      });
      s.arrow(x_start, y0 - 96, x_start + dx * 5, y0 - 96, "fig-ref");

      s.text(x_start - 24, 26, "total temperature, amber path", { cls: "fig-label", anchor: "start" });
      s.text(x_start - 24, 42, "total pressure, grey path", { cls: "fig-sub", anchor: "start" });
      s.commit();

      if (note) {
        let txt = "Fuel-air ratio " + fig.num_fmt(fRow ? fRow.num : NaN) +
          ", nozzle exit M" + fig.num_fmt(m9Row ? m9Row.num : NaN) +
          " at " + fig.num_fmt(v9Row ? v9Row.num : NaN) + " m/s.";
        if (fstRow) txt += " Specific thrust " + fig.num_fmt(fstRow.num) + " N per kg/s of air.";
        if (grossRow) txt += " Gross thrust " + fig.num_fmt(grossRow.num) + " kN against " +
          fig.num_fmt(ramRow ? ramRow.num : NaN) + " kN of ram drag.";
        if (netRow) txt += " Net thrust " + fig.num_fmt(netRow.num) + " kN.";
        if (tsfcRow) txt += " TSFC " + fig.num_fmt(tsfcRow.num) + " kg per N hour.";
        if (ffRow) txt += " Fuel flow " + fig.num_fmt(ffRow.num) + " kg/s.";
        note.textContent = txt;
      }
    }

    fig.auto_draw(function () { draw_fig_turbojet(); });
