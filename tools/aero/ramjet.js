
    function theta_from_beta(m, beta_deg, g) {
      const b = beta_deg * Math.PI / 180;
      const num = m * m * Math.sin(b) * Math.sin(b) - 1;
      const den = m * m * (g + Math.cos(2 * b)) + 2;
      return Math.atan(2 / Math.tan(b) * num / den) * 180 / Math.PI;
    }

    function beta_solve(m, theta_deg, g) {
      let lo = Math.asin(1 / m) * 180 / Math.PI + 1e-6, hi = 90;
      for (let i = 0; i < 200; i++) {
        const mid = (lo + hi) / 2;
        if (theta_from_beta(m, mid, g) < theta_deg) lo = mid; else hi = mid;
      }
      return (lo + hi) / 2;
    }

    // downstream state of a normal shock: [p2/p1, pt2/pt1, Mn2]
    function normal_shock(mn, g) {
      const p_ratio = 1 + 2 * g / (g + 1) * (mn * mn - 1);
      const pt_ratio = Math.pow((g + 1) * mn * mn / ((g - 1) * mn * mn + 2), g / (g - 1)) *
        Math.pow((g + 1) / (2 * g * mn * mn - (g - 1)), 1 / (g - 1));
      const mn2 = Math.sqrt((1 + (g - 1) / 2 * mn * mn) / (g * mn * mn - (g - 1) / 2));
      return [p_ratio, pt_ratio, mn2];
    }

    function solve_ramjet() {
      const err = document.getElementById("err");
      err.textContent = "";

      const m0 = val("m0"), t0 = val("t0"), p0 = val("p0"), a2 = val("a2");
      const gc = val("gc"), cpc = val("cpc"), gh = val("gh"), cph = val("cph");
      const m3 = val("m3"), m4 = val("m4");
      const bmode = document.getElementById("bmode").value || "tet";
      const tt4_in = val("tt4"), far_in = val("far");
      const etab = val("etab"), lhv = val("lhv");
      const dtt = val("dtt"), cd = val("cd"), cv = val("cv");
      const dif_loss = val("dif_loss"), burn_loss = val("burn_loss"), duct_loss = val("duct_loss");
      if (m0 === null || t0 === null || p0 === null || a2 === null || gc === null || cpc === null ||
          gh === null || cph === null || m3 === null || m4 === null ||
          etab === null || lhv === null || dtt === null || cd === null || cv === null ||
          dif_loss === null || burn_loss === null || duct_loss === null) {
        err.textContent = "fill every field (losses and coefficients included)"; return;
      }
      if (bmode === "tet" && tt4_in === null) { err.textContent = "enter Tt4 in tet mode"; return; }
      if (bmode === "far" && (far_in === null || far_in <= 0)) { err.textContent = "enter a positive fuel-air ratio in far mode"; return; }
      if (m0 <= 1 || t0 <= 0 || p0 <= 0 || a2 <= 0) { err.textContent = "M0 must be supersonic and the state positive"; return; }

      const turns = document.getElementById("turns").value.split(/[\s,]+/).filter(function (x) { return x !== ""; }).map(parseFloat).filter(isFinite);
      if (m0 <= 1) { err.textContent = "ramjet needs a supersonic freestream"; return; }

      const rc = cpc * (gc - 1) / gc, rh = cph * (gh - 1) / gh;

      // inlet: oblique shock per ramp turn, then the terminal normal shock
      let m = m0, ptr = 1;
      for (const th of turns) {
        if (m <= 1) { err.textContent = "flow is subsonic before the last ramp turn"; return; }
        if (th <= 0 || th >= 34) { err.textContent = "ramp turns must be between 0 and 34 degrees here"; return; }
        const beta = beta_solve(m, th, gc);
        const mn = m * Math.sin(beta * Math.PI / 180);
        if (mn <= 1) { err.textContent = "ramp turn is beyond the attachable shock angle at this mach"; return; }
        const ns = normal_shock(mn, gc);
        ptr *= ns[1];
        m = ns[2] / Math.sin((beta - th) * Math.PI / 180);
      }
      let m2 = m;
      if (m2 > 1) {
        const ns = normal_shock(m2, gc);
        ptr *= ns[1];
        m2 = ns[2];
      }

      const tt0 = t0 * (1 + (gc - 1) / 2 * m0 * m0);
      const pt0 = p0 * 1000 * Math.pow(1 + (gc - 1) / 2 * m0 * m0, gc / (gc - 1));
      const pt2 = ptr * pt0;
      const t2 = tt0 / (1 + (gc - 1) / 2 * m2 * m2);
      const p2 = pt2 / Math.pow(1 + (gc - 1) / 2 * m2 * m2, gc / (gc - 1));
      const v2 = m2 * Math.sqrt(gc * rc * t2);
      const mdot = p2 / (rc * t2) * v2 * a2;

      // diffuser exit (station 3)
      const pt3 = (1 - dif_loss) * pt2, tt3 = tt0;
      const t3 = tt3 / (1 + (gc - 1) / 2 * m3 * m3);
      const p3 = pt3 / Math.pow(1 + (gc - 1) / 2 * m3 * m3, gc / (gc - 1));
      const v3 = m3 * Math.sqrt(gc * rc * t3);
      const a3 = mdot / (p3 / (rc * t3) * v3);
      const ht3 = cpc * tt3 / 1000;

      // combustor: forward mode solves f from Tt4, inverted mode solves Tt4 from f
      // burner energy balance: f = (ht4 - ht3) / (etab*LHV - ht4), both directions
      let tt4, f;
      if (bmode === "tet") {
        tt4 = tt4_in;
        const ht4 = cph * tt4 / 1000;
        f = (ht4 - ht3) / (etab * lhv - ht4);
        if (f <= 0) { err.textContent = "burner exit enthalpy is outside the energy balance for this LHV"; return; }
      } else {
        f = far_in;
        // invert: ht4 = (ht3 + f*etab*LHV) / (1 + f), per ICP 1
        const ht4 = (ht3 + f * etab * lhv) / (1 + f);
        tt4 = ht4 / (cph / 1000);
      }
      const mdot4 = (1 + f) * mdot;
      const pt4 = (1 - burn_loss) * pt3;
      const t4 = tt4 / (1 + (gh - 1) / 2 * m4 * m4);
      const p4 = pt4 / Math.pow(1 + (gh - 1) / 2 * m4 * m4, gh / (gh - 1));
      const v4 = m4 * Math.sqrt(gh * rh * t4);
      const a4 = mdot4 / (p4 / (rh * t4) * v4);

      // constant-area duct: mass-flow function match gives the nozzle inlet mach
      const tt7 = tt4 + dtt, pt7 = (1 - duct_loss) * pt4;
      const mfp = function (mm, g) { return mm * Math.pow(1 + (g - 1) / 2 * mm * mm, -(g + 1) / (2 * (g - 1))); };
      const target = pt4 / Math.sqrt(tt4) * mfp(m4, gh);
      let lo = 0.01, hi = 1;
      for (let i = 0; i < 200; i++) {
        const mid = (lo + hi) / 2;
        if (pt7 / Math.sqrt(tt7) * mfp(mid, gh) < target) lo = mid; else hi = mid;
      }
      const m7 = (lo + hi) / 2;

      // choked throat and ideal expansion to ambient
      const gstar = pt7 / Math.sqrt(tt7) * Math.sqrt(gh / rh) * Math.pow(2 / (gh + 1), (gh + 1) / (2 * (gh - 1)));
      const astar = mdot4 / gstar;
      const a8geo = astar / cd;
      const m9 = Math.sqrt(2 / (gh - 1) * (Math.pow(pt7 / (p0 * 1000), (gh - 1) / gh) - 1));
      const ar = 1 / m9 * Math.pow(2 / (gh + 1) * (1 + (gh - 1) / 2 * m9 * m9), (gh + 1) / (2 * (gh - 1)));
      const a9 = astar * ar;
      const t9 = tt7 / (1 + (gh - 1) / 2 * m9 * m9);
      const v9 = cv * m9 * Math.sqrt(gh * rh * t9);
      const v0 = m0 * Math.sqrt(gc * rc * t0);
      const fn = (mdot4 * v9 - mdot * v0) / 1000;

      render_lines("lines", [
        ["inlet recovery pt2/pt0", fmt(ptr, 4)],
        ["final shock exit mach M2", fmt(m2, 4)],
        ["stagnation state Tt0, pt0", fmt(tt0, 4) + " K, " + fmt(pt0 / 1000, 4) + " kPa"],
        ["captured airflow mdot", fmt(mdot, 4) + " kg/s"],
        ["combustor inlet area A3", fmt(a3, 4) + " m&sup2;"],
        ["combustor inlet total enthalpy ht3", fmt(ht3, 4) + " kJ/kg"],
        ["fuel-air ratio f", fmt(f, 4)],
        ["burner exit total temp Tt4", fmt(tt4, 4) + " K"],
        ["burner exit area A4", fmt(a4, 4) + " m&sup2;"],
        ["duct exit state Tt7, pt7", fmt(tt7, 4) + " K, " + fmt(pt7 / 1000, 4) + " kPa"],
        ["nozzle inlet mach M7", fmt(m7, 4)],
        ["ideal throat area A*", fmt(astar, 6) + " m&sup2;"],
        ["geometric throat area A8", fmt(a8geo, 4) + " m&sup2;"],
        ["exit mach M9 and area A9", fmt(m9, 4) + ", " + fmt(a9, 4) + " m&sup2;"],
        ["exit velocity V9", fmt(v9, 4) + " m/s"],
        ["net thrust FN", fmt(fn, 4) + " kN"]
      ]);
    }

    function draw_fig_ramjet() {
      const el = document.getElementById("fig-ramjet");
      const note = document.getElementById("fig-ramjet-note");
      if (!el || !window.fig) return;
      const DEFAULTS = {
        t0: "220", p0: "30", a2: "1", turns: "8, 10, 15",
        gc: "1.4", cpc: "1005", dif_loss: "0.1", m3: "0.1", tt4: "2200",
        gh: "1.33", cph: "1150", etab: "0.95", lhv: "45000", burn_loss: "0.03",
        m4: "0.4", dtt: "-50", duct_loss: "0.02", cd: "0.95", cv: "0.97"
      };
      fig.sweep(el, {
        solve: "solve_ramjet",
        input: "m0",
        min: 2,
        max: 8,
        steps: 42,
        defaults: DEFAULTS,
        width: 560,
        height: 300,
        x_label: "flight mach",
        x_unit: "",
        y_label: "net thrust",
        y_unit: "kN",
        y2_label: "fuel-air ratio",
        y2_unit: "",
        outputs: [
          { match: "net thrust", name: "thrust", label: "net thrust" },
          { match: "fuel-air ratio", name: "far", label: "fuel-air ratio", axis: "y2", cls: "fig-third" }
        ],
        note: function (x) {
          return "Thrust and fuel-air ratio come from the page solver at each flight mach.  " +
            "At M = " + fig.num_fmt(x) + " the inlet shock train has to bring the flow down " +
            "past the burner, and the fuel added scales the heat available to the nozzle.";
        }
      });
      if (note && !note.textContent) {
        note.textContent = "Fill the inlet, burner and nozzle fields to sweep net thrust against flight mach.";
      }
    }

    fig.auto_draw(function () { draw_fig_ramjet(); });
