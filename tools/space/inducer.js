
    function solve_inducer() {
      const err = document.getElementById("err");
      err.textContent = "";

      const mdot = val("mdot"), rho = val("rho"), pv = val("pv"), ptank = val("ptank");
      const dpf = val("dpf"), z = val("z"), marg = val("marg"), dht = val("dht");
      const phi = val("phi"), nss = val("nss"), inc = val("inc"), eta = val("eta"), acoeff = val("acoeff");
      const g = 9.81, m2ft = 3.28084;

      if (mdot === null || rho === null || pv === null || ptank === null || dpf === null || z === null ||
          marg === null || dht === null || phi === null || nss === null || inc === null || eta === null || acoeff === null) {
        err.textContent = "fill every field"; return;
      }
      if (rho <= 0 || mdot <= 0 || phi <= 0 || nss <= 0 || eta <= 0 || acoeff <= 0 || dht >= 1) {
        err.textContent = "check the physical ranges (Dh/Dt must be under 1)"; return;
      }

      const q_vol = mdot / rho;
      const q_gpm = q_vol * 264.172 * 60;
      const p1 = ptank * 1e6 + rho * g * z - dpf * 1e3;
      const npsh_min = (p1 - pv * 1e3) / (rho * g);
      if (npsh_min <= 0) { err.textContent = "inducer eye pressure is below vapor pressure"; return; }
      const npsh_c = npsh_min / (1 + marg);
      const cm = Math.sqrt(2 * g * npsh_c / acoeff);
      const a1 = q_vol / cm;
      const dt = Math.sqrt(4 * a1 / Math.PI / (1 - dht * dht));
      const dh = dht * dt;
      const ut = cm / phi;
      const n_rpm = 60 * ut / (Math.PI * dt);
      const npsh_c_ft = npsh_c * m2ft;
      const nss_ind = n_rpm * Math.sqrt(q_gpm) / Math.pow(npsh_c_ft, 0.75);
      const npsh_i_ft = Math.pow(n_rpm * Math.sqrt(q_gpm) / nss, 4 / 3);
      const npsh_i = npsh_i_ft / m2ft;
      const dh_ind = npsh_i - npsh_min;
      const psi = dh_ind * g / (ut * ut);
      const alpha_i = Math.atan(phi) * 180 / Math.PI;
      const beta_1t = alpha_i + inc;
      const beta_1h = Math.atan(Math.tan(beta_1t * Math.PI / 180) / dht) * 180 / Math.PI;
      const cu2 = g * dh_ind / (eta * ut);
      const beta_2t = Math.atan(cm / (ut - cu2)) * 180 / Math.PI;

      render_lines("lines", [
        ["volumetric flow Q", fmt(q_vol, 6) + " m&sup3;/s (" + fmt(q_gpm, 6) + " gpm)"],
        ["inducer eye pressure P1", fmt(p1 / 1e3, 6) + " kPa"],
        ["minimum NPSH available", fmt(npsh_min, 6) + " m"],
        ["corrected NPSH", fmt(npsh_c, 6) + " m"],
        ["inlet axial velocity cm", fmt(cm, 6) + " m/s"],
        ["tip diameter Dt", fmt(dt * 1000, 6) + " mm"],
        ["hub diameter Dh", fmt(dh * 1000, 6) + " mm"],
        ["tip speed Ut", fmt(ut, 6) + " m/s"],
        ["shaft speed N", fmt(n_rpm, 6) + " rpm"],
        ["inducer suction specific speed", fmt(nss_ind, 6)],
        ["impeller NPSH required", fmt(npsh_i, 6) + " m"],
        ["inducer head rise", fmt(dh_ind, 6) + " m"],
        ["head coefficient psi", fmt(psi, 6)],
        ["inlet flow angle alpha", fmt(alpha_i, 6) + "&deg;"],
        ["tip blade angle beta-1t", fmt(beta_1t, 6) + "&deg;"],
        ["hub blade angle beta-1h", fmt(beta_1h, 6) + "&deg;"],
        ["exit tangential velocity cu2", fmt(cu2, 6) + " m/s"],
        ["tip blade angle beta-2t", fmt(beta_2t, 6) + "&deg;"]
      ]);
    }

    function draw_fig_inducer() {
      const el = document.getElementById("fig-inducer");
      const note = document.getElementById("fig-inducer-note");
      if (!el || !window.fig) return;
      const DEFAULTS = {
        mdot: "40", rho: "997", pv: "2300", ptank: "101325", dpf: "30", z: "1.5",
        marg: "1.15", dht: "0.6", phi: "0.045", nss: "20000", inc: "2", eta: "0.88", acoeff: "0.062"
      };
      const hv = fig.harvest(solve_inducer, DEFAULTS);
      if (!hv.rows.length) {
        if (note) note.textContent = "fill every field to size the inducer.";
        return;
      }
      const get = function (frag) {
        for (let i = 0; i < hv.rows.length; i++) {
          if (hv.rows[i].label.toLowerCase().indexOf(frag) >= 0) return hv.rows[i].num;
        }
        return NaN;
      };
      const cm = get("axial velocity");
      const ut = get("tip speed");
      const cu2 = get("exit tangential");
      const psi = get("head coefficient");
      const alpha = get("inlet flow angle");
      const b1t = get("beta-1t");
      const b2t = get("beta-2t");
      const head = get("head rise");
      if (!isFinite(cm) || !isFinite(ut) || !isFinite(cu2) ||
        !isFinite(alpha) || !isFinite(b1t) || !isFinite(b2t)) {
        if (note) note.textContent = "fill every field to size the inducer.";
        return;
      }

      const W = 660, H = 360;
      const s = fig.scene(el, { width: W, height: H });
      const vmax = Math.max(ut, cm, Math.abs(cu2)) || 1;
      const k = 132 / vmax;

      const panel = function (ox, title) {
        const oy = H - 74;
        s.text(ox, 26, title, { cls: "fig-label" });
        // blade speed, upward from the origin
        s.line(ox, oy, ox, oy - ut * k, "fig-axis");
        s.arrow(ox, oy, ox, oy - ut * k, "fig-line");
        s.text(ox - 12, oy - ut * k, "U", { cls: "fig-val", anchor: "end" });
        return oy;
      };

      // inlet triangle: absolute flow horizontal, relative closing the triangle
      const oy1 = panel(120, "inducer inlet");
      s.line(120, oy1, 120 + cm * k, oy1, "fig-third");
      s.arrow(120, oy1, 120 + cm * k, oy1, "fig-third");
      s.text(120 + cm * k / 2, oy1 + 18, "Cm", { cls: "fig-val" });
      s.poly([[120, oy1 - ut * k], [120 + cm * k, oy1]], "fig-line");
      s.text(120 + cm * k * 0.62, oy1 - ut * k * 0.55, "W1", { cls: "fig-val" });
      // blade line sits at the designed blade angle, incidence opens the gap
      const bl = 96;
      const bxr = ox_bl(bl, b1t);
      s.line(120, oy1, 120 + bxr, oy1 - bl, "fig-dash");
      const fr = ox_fl(alpha, bl * 0.8);
      s.line(120, oy1, 120 + fr[0], oy1 - fr[1], "fig-grid");
      s.text(126, oy1 - 18, "alpha " + fig.num_fmt(alpha) + " deg", { cls: "fig-sub", anchor: "start" });
      s.text(126, oy1 - 34, "beta1t " + fig.num_fmt(b1t) + " deg", { cls: "fig-sub", anchor: "start" });

      // outlet triangle: absolute velocity is tilted by cu2
      const oy2 = panel(430, "impeller outlet");
      const c2x = 430 + cm * k, c2y = oy2 - cu2 * k;
      s.line(430, oy2, c2x, c2y, "fig-line");
      s.arrow(430, oy2, c2x, c2y, "fig-line");
      s.text(c2x + 12, c2y, "C2", { cls: "fig-val", anchor: "start" });
      s.poly([[430, oy2 - ut * k], [c2x, c2y]], "fig-third");
      s.text(430 + cm * k * 0.55, oy2 - ut * k * 0.55 - 12, "W2", { cls: "fig-val" });
      const wr = ox_bl(bl, b2t);
      s.line(430, oy2, 430 + wr, oy2 - bl, "fig-dash");
      s.text(436, oy2 - 18, "cu2 " + fig.num_fmt(cu2) + " m/s", { cls: "fig-sub", anchor: "start" });
      s.text(436, oy2 - 34, "beta2t " + fig.num_fmt(b2t) + " deg", { cls: "fig-sub", anchor: "start" });

      s.text(W / 2, H - 22, "velocity triangles for the design point", { cls: "fig-label" });
      s.commit();

      if (note) {
        note.textContent = "Axial flow " + fig.num_fmt(cm) + " m/s, tip speed " + fig.num_fmt(ut) +
          " m/s.  The exit triangle tilts by the whirl cu2, and the leftover head is " +
          fig.num_fmt(head) + " m (psi = " + fig.num_fmt(psi) + ").";
      }

      function ox_bl(len, angDeg) {
        const rr = angDeg * Math.PI / 180;
        return len * Math.tan(rr);
      }
      function ox_fl(angDeg, len) {
        const rr = angDeg * Math.PI / 180;
        return [len * Math.tan(rr), len];
      }
    }

    fig.auto_draw(function () { draw_fig_inducer(); });
