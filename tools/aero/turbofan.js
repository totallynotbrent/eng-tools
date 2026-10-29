
    function solve_tf() {
      const err = document.getElementById("err");
      err.textContent = "";

      const m0 = val("m0"), t0 = val("t0"), p0 = val("p0");
      const gc = val("gc"), cpc = val("cpc"), gh = val("gh"), cph = val("cph");
      const md18 = val("md18"), mdc = val("mdc"), mdf = val("mdf"), qb = val("qb");
      const p18 = val("p18"), t18 = val("t18"), m18 = val("m18");
      const p8 = val("p8"), t8 = val("t8"), m8 = val("m8");
      if (m0 === null || t0 === null || p0 === null || gc === null || cpc === null ||
          gh === null || cph === null || md18 === null || mdc === null || mdf === null || qb === null ||
          p18 === null || t18 === null || m18 === null || p8 === null || t8 === null || m8 === null) {
        err.textContent = "fill every field"; return;
      }
      if (t0 <= 0 || p0 <= 0 || md18 <= 0 || mdc <= 0 || mdf < 0 || qb <= 0) { err.textContent = "flows and state must be positive"; return; }
      if (m18 <= 0 || m8 <= 0 || t18 <= 0 || t8 <= 0 || p18 <= 0 || p8 <= 0) { err.textContent = "nozzle exit states must be positive"; return; }

      const rc = cpc * (gc - 1) / gc;
      const rh = cph * (gh - 1) / gh;

      // freestream
      const v0 = m0 * Math.sqrt(gc * rc * t0);
      const md0 = md18 + mdc;
      const bpr = md18 / mdc;
      const fram = md0 * v0 / 1000;

      // nozzle exit velocity from statics (both streams)
      const v18 = m18 * Math.sqrt(gc * rc * t18);
      const rho18 = (p18 * 1000) / (rc * t18);
      const a18 = md18 / (rho18 * v18);
      const fg18 = (md18 * v18 + (p18 * 1000 - p0 * 1000) * a18) / 1000;

      const v8 = m8 * Math.sqrt(gh * rh * t8);
      const rho8 = (p8 * 1000) / (rh * t8);
      const md8 = mdc + mdf;
      const a8 = md8 / (rho8 * v8);
      const fg8 = (md8 * v8 + (p8 * 1000 - p0 * 1000) * a8) / 1000;

      const fn = fg18 + fg8 - fram;
      if (fn <= 0) { err.textContent = "no net thrust at these settings"; return; }
      const tsfc = mdf / fn * 1000; // g/(s*kN): kg/s / kN * 1000

      // fan ratios from the bypass nozzle totals (adiabatic nozzle: Tt18 = Tt13)
      const tt18 = t18 * (1 + (gc - 1) / 2 * m18 * m18);
      const pt18 = p18 * 1000 * Math.pow(1 + (gc - 1) / 2 * m18 * m18, gc / (gc - 1));
      // flight totals feed both streams; fan input = freestream totals
      const tt0 = t0 * (1 + (gc - 1) / 2 * m0 * m0);
      const pt0 = p0 * 1000 * Math.pow(1 + (gc - 1) / 2 * m0 * m0, gc / (gc - 1));
      const tau_f = tt18 / tt0;
      const pi_f = pt18 / pt0;

      // effective velocities: Veff = V + (p - p0)A / mdot (class convention, CP pp. 13-15)
      const v18eff = v18 + (p18 * 1000 - p0 * 1000) * a18 / md18;
      const v8eff = v8 + (p8 * 1000 - p0 * 1000) * a8 / md8;
      const dek = 0.5 * (md18 * v18eff * v18eff + md8 * v8eff * v8eff - md0 * v0 * v0) / 1e6; // MW
      const eta_prop = fn * 1000 * v0 / (dek * 1e6);
      const eta_th = dek * 1e6 / (mdf * qb * 1000);
      const eta_ov = eta_th * eta_prop;

      render_lines("lines", [
        ["bypass ratio", fmt(bpr, 4)],
        ["flight speed V0", fmt(v0, 4) + " m/s"],
        ["ram drag mdot0 V0", fmt(fram, 4) + " kN"],
        ["bypass exit V18, A18", fmt(v18, 4) + " m/s, " + fmt(a18, 4) + " m&sup2;"],
        ["bypass gross thrust FG18", fmt(fg18, 4) + " kN"],
        ["core exit V8, A8", fmt(v8, 4) + " m/s, " + fmt(a8, 4) + " m&sup2;"],
        ["core gross thrust FG8", fmt(fg8, 4) + " kN"],
        ["net thrust FN", fmt(fn, 4) + " kN"],
        ["TSFC", fmt(tsfc, 4) + " g/(s&middot;kN)"],
        ["fan temperature ratio tau_f", fmt(tau_f, 4)],
        ["fan pressure ratio pi_f", fmt(pi_f, 4)],
        ["effective velocities V18eff, V8eff", fmt(v18eff, 4) + ", " + fmt(v8eff, 4) + " m/s"],
        ["kinetic energy rate dEk", fmt(dek, 4) + " MW"],
        ["propulsive efficiency", fmt(eta_prop * 100, 4) + "%"],
        ["thermal efficiency", fmt(eta_th * 100, 4) + "%"],
        ["overall efficiency", fmt(eta_ov * 100, 4) + "%"]
      ]);
      document.getElementById("results").style.display = "";
    }

    function draw_fig_turbofan() {
      const el = document.getElementById("fig-turbofan");
      const note = document.getElementById("fig-turbofan-note");
      if (!el || !window.fig) return;
      const DEFAULTS = {
        m0: "0.8", t0: "220", p0: "22.6", gc: "1.4", cpc: "1005",
        md18: "60", mdc: "20", mdf: "0.4", qb: "43000",
        p18: "101.3", t18: "220", m18: "0.5",
        p8: "50", t8: "900", m8: "0.4", gh: "1.33", cph: "1150"
      };
      const hv = fig.harvest(solve_tf, DEFAULTS);
      if (!hv.rows.length) {
        if (note) note.textContent = "fill every field to draw the stream diagram.";
        return;
      }
      const find = function (frag) {
        for (let i = 0; i < hv.rows.length; i++) {
          if (hv.rows[i].label.toLowerCase().indexOf(frag) >= 0) return hv.rows[i];
        }
        return null;
      };
      const br = find("bypass ratio"), v0r = find("flight speed"),
        ramr = find("ram drag"), fg18r = find("bypass gross thrust"),
        fg8r = find("core gross thrust"), fnr = find("net thrust"),
        tsfcr = find("tsfc"), ep = find("propulsive efficiency"),
        ethr = find("thermal efficiency"), ovr = find("overall efficiency"),
        dek = find("kinetic energy");

      const W = 660, H = 340;
      const s = fig.scene(el, { width: W, height: H });

      const yCold = 96, yHot = 232;
      // freestream
      s.rect(24, yCold + 46, 92, 62, "fig-box");
      s.text(70, yCold + 72, "flight", { cls: "fig-box-title" });
      s.text(70, yCold + 88, "M" + fig.num_fmt(br ? br.num : NaN), { cls: "fig-sub" });
      s.text(70, yCold + 121, "V" + fig.num_fmt(v0r ? v0r.num : NaN), { cls: "fig-sub" });

      // splitter
      s.poly([[116, yCold + 77], [146, yCold + 77], [146, yCold], [176, yCold]], "fig-wire");
      s.poly([[116, yCold + 77], [146, yCold + 77], [146, yHot], [176, yHot]], "fig-wire");

      // bypass lane
      s.rect(176, yCold - 26, 96, 52, "fig-box");
      s.text(224, yCold - 6, "fan", { cls: "fig-box-title" });
      s.text(224, yCold + 10, "cold stream", { cls: "fig-sub" });
      s.arrow(272, yCold, 314, yCold, "fig-wire-mid");
      s.rect(314, yCold - 26, 104, 52, "fig-box");
      s.text(366, yCold - 6, "nozzle 18", { cls: "fig-box-title" });
      s.text(366, yCold + 10, "M" + fig.num_fmt(find("bypass exit") ? find("bypass exit").nums[2] : NaN), { cls: "fig-sub" });
      s.arrow(418, yCold, 468, yCold, "fig-wire-mid");
      s.text(443, yCold - 8, "FG18", { cls: "fig-val" });
      s.text(443, yCold + 16, fig.num_fmt(fg18r ? fg18r.num : NaN) + " kN", { cls: "fig-sub" });

      // core lane
      s.rect(176, yHot - 26, 96, 52, "fig-box");
      s.text(224, yHot - 6, "core", { cls: "fig-box-title" });
      s.text(224, yHot + 10, "hot stream", { cls: "fig-sub" });
      s.arrow(272, yHot, 314, yHot, "fig-wire-mid");
      s.rect(314, yHot - 26, 104, 52, "fig-box");
      s.text(366, yHot - 6, "nozzle 8", { cls: "fig-box-title" });
      s.text(366, yHot + 10, "M" + fig.num_fmt(find("core exit") ? find("core exit").nums[2] : NaN), { cls: "fig-sub" });
      s.arrow(418, yHot, 468, yHot, "fig-wire-mid");
      s.text(443, yHot - 8, "FG8", { cls: "fig-val" });
      s.text(443, yHot + 16, fig.num_fmt(fg8r ? fg8r.num : NaN) + " kN", { cls: "fig-sub" });

      // thrust balance
      s.rect(494, yCold + 22, 142, 152, "fig-box");
      s.text(565, yCold + 44, "thrust", { cls: "fig-box-title" });
      s.text(565, yCold + 64, "FG18 + FG8", { cls: "fig-sub" });
      s.text(565, yCold + 78, "- ram drag", { cls: "fig-sub" });
      s.line(510, yCold + 90, 620, yCold + 90, "fig-ref");
      s.text(565, yCold + 116, "net thrust FN", { cls: "fig-label" });
      s.text(565, yCold + 138, fig.num_fmt(fnr ? fnr.num : NaN) + " kN", { cls: "fig-val" });
      s.text(565, yCold + 158, "TSFC " + fig.num_fmt(tsfcr ? tsfcr.num : NaN), { cls: "fig-sub" });

      s.text(24, 34, "the bypass stream carries most of the thrust", { cls: "fig-label", anchor: "start" });
      s.text(24, 322, "ram drag " + fig.num_fmt(ramr ? ramr.num : NaN) + " kN deducted from both streams",
        { cls: "fig-sub", anchor: "start" });
      s.commit();

      if (note) {
        let txt = "Fan temperature ratio gives a bypass nozzle at the freestream pressure.  ";
        if (ep) txt += "Propulsive efficiency " + fig.num_fmt(ep.num) + "%, ";
        if (ethr) txt += "thermal efficiency " + fig.num_fmt(ethr.num) + "%, ";
        if (ovr) txt += "overall " + fig.num_fmt(ovr.num) + "%.  ";
        if (dek) txt += "Jet kinetic energy rate " + fig.num_fmt(dek.num) + " MW.";
        note.textContent = txt;
      }
    }

    fig.auto_draw(function () { draw_fig_turbofan(); });
