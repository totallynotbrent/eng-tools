
    function render(lines) {
      document.getElementById("lines").innerHTML = lines.map(function (l) {
        return '<div class="result-line"><span class="label">' + l[0] + "</span><span class=\"value\">" + l[1] + "</span></div>";
      }).join("");
      document.getElementById("results").style.display = "block";
    }

    function pct(n) {
      return fmt(n * 100, 5) + "%";
    }

    function to_k(n, unit) { return unit === "c" ? n + 273.15 : n; }

    function solve_carnot() {
      const err = document.getElementById("err");
      err.textContent = "";
      const th = val("th"), tl = val("tl");
      if (th === null || tl === null) { err.textContent = "enter both temperatures"; return; }
      const unit = document.getElementById("ct_unit").value;
      const thk = to_k(th, unit), tlk = to_k(tl, unit);
      if (thk <= 0 || tlk <= 0 || thk <= tlk) { err.textContent = "need TH > TL > 0"; return; }
      const eta = 1 - tlk / thk;
      render([
        ["thermal efficiency", pct(eta)],
        ["refrigerator COP (TL/(TH&minus;TL))", fmt(tlk / (thk - tlk), 5)],
        ["heat pump COP (TH/(TH&minus;TL))", fmt(thk / (thk - tlk), 5)]
      ]);
    }

    function solve_otto() {
      const err = document.getElementById("err");
      err.textContent = "";
      const r = val("or"), k = val("ok");
      if (r === null || k === null) { err.textContent = "enter r and k"; return; }
      if (r <= 1 || k <= 1) { err.textContent = "need r > 1 and k > 1"; return; }
      render([["thermal efficiency", pct(1 - 1 / Math.pow(r, k - 1))]]);
    }

    function solve_diesel() {
      const err = document.getElementById("err");
      err.textContent = "";
      const r = val("dr"), rc = val("drc"), k = val("dk");
      if (r === null || rc === null || k === null) { err.textContent = "enter r, rc, and k"; return; }
      if (r <= 1 || rc <= 1 || k <= 1) { err.textContent = "need r, rc, k all greater than 1"; return; }
      const eta = 1 - (Math.pow(rc, k) - 1) / (Math.pow(r, k - 1) * k * (rc - 1));
      render([["thermal efficiency", pct(eta)]]);
    }

    function solve_brayton() {
      const err = document.getElementById("err");
      err.textContent = "";
      const rp = val("brp"), k = val("bk");
      if (rp === null || k === null) { err.textContent = "enter rp and k"; return; }
      if (rp <= 1 || k <= 1) { err.textContent = "need rp > 1 and k > 1"; return; }
      render([["thermal efficiency", pct(1 - 1 / Math.pow(rp, (k - 1) / k))]]);
    }

    function solve_rankine() {
      const err = document.getElementById("err");
      err.textContent = "";
      const h1 = val("rh1"), h2 = val("rh2"), h3 = val("rh3"), h4 = val("rh4");
      if (h1 === null || h2 === null || h3 === null || h4 === null) { err.textContent = "enter all four enthalpies"; return; }
      const wt = h1 - h2;
      const wp = h4 - h3;
      const qin = h1 - h4;
      if (qin <= 0) { err.textContent = "qin must be positive, check your enthalpies"; return; }
      const eta = (wt - wp) / qin;
      render([
        ["turbine work wt", fmt(wt, 6) + " kJ/kg"],
        ["pump work wp", fmt(wp, 6) + " kJ/kg"],
        ["heat in qin", fmt(qin, 6) + " kJ/kg"],
        ["thermal efficiency", pct(eta)]
      ]);
    }

    document.getElementById("tabs").addEventListener("click", function (e) {
      const tab = e.target.closest(".tab");
      if (!tab) return;
      const mode = tab.getAttribute("data-mode");
      document.querySelectorAll(".tab").forEach(function (el) { el.classList.remove("active"); });
      tab.classList.add("active");
      document.querySelectorAll(".section").forEach(function (el) { el.style.display = "none"; });
      document.getElementById("panel_" + mode).style.display = "block";
      document.getElementById("err").textContent = "";
    });

    function draw_fig_cycles() {
      const el = document.getElementById("fig-cycles");
      const note = document.getElementById("fig-cycles-note");
      if (!el || !window.fig) return;

      const tabEl = document.querySelector("#tabs .tab.active");
      const mode = tabEl ? tabEl.getAttribute("data-mode") : "carnot";
      const unitEl = document.getElementById("ct_unit");
      const isC = !!unitEl && unitEl.value === "c";

      const EFF = { match: "thermal efficiency", name: "eta", cls: "fig-line" };
      let cfg = null;

      if (mode === "carnot") {
        cfg = {
          input: "th",
          min: isC ? 100 : 350,
          max: isC ? 1200 : 1600,
          solve: "solve_carnot",
          defaults: { tl: isC ? "26.85" : "300" },
          outputs: [
            EFF,
            { match: "heat pump cop", name: "cop", cls: "fig-third", axis: "y2" }
          ],
          x_label: "hot reservoir temperature",
          x_unit: isC ? "\u00b0C" : "K",
          y_label: "thermal efficiency",
          y2_label: "heat pump COP",
          desc: "The cold reservoir stays at 300 K.  Raising the hot reservoir lifts the " +
                "efficiency and drags the heat pump COP down."
        };
      } else if (mode === "otto") {
        cfg = {
          input: "or",
          min: 1.2,
          max: 20,
          solve: "solve_otto",
          defaults: { ok: "1.4" },
          outputs: [EFF],
          x_label: "compression ratio",
          x_unit: "",
          y_label: "thermal efficiency",
          desc: "Air standard otto efficiency against compression ratio at k = 1.4.  " +
                "Most of the gain arrives above a ratio of ten."
        };
      } else if (mode === "diesel") {
        cfg = {
          input: "dr",
          min: 2.5,
          max: 30,
          solve: "solve_diesel",
          defaults: { drc: "2", dk: "1.4" },
          outputs: [EFF],
          x_label: "compression ratio",
          x_unit: "",
          y_label: "thermal efficiency",
          desc: "Air standard diesel efficiency against compression ratio with a cutoff ratio of 2."
        };
      } else if (mode === "brayton") {
        cfg = {
          input: "brp",
          min: 1.5,
          max: 40,
          solve: "solve_brayton",
          defaults: { bk: "1.4" },
          outputs: [EFF],
          x_label: "pressure ratio",
          x_unit: "",
          y_label: "thermal efficiency",
          desc: "Ideal brayton efficiency against pressure ratio at k = 1.4.  " +
                "The curve flattens as the ratio grows."
        };
      } else {
        cfg = {
          input: "rh1",
          min: 2400,
          max: 4000,
          solve: "solve_rankine",
          defaults: { rh2: "2200", rh3: "300", rh4: "312" },
          outputs: [
            EFF,
            { match: "heat in qin", name: "qin", cls: "fig-third", axis: "y2" }
          ],
          x_label: "turbine inlet enthalpy",
          x_unit: "kJ/kg",
          y_label: "thermal efficiency",
          y2_label: "heat in",
          y2_unit: "kJ/kg",
          desc: "The turbine exit holds at 2200 kJ/kg and the pump rises 12 kJ/kg across " +
                "the cycle."
        };
      }

      cfg.steps = 48;
      cfg.cache_tag = "cycles-" + mode;
      cfg.width = 560;
      cfg.height = 300;
      cfg.note = function (cur, row) {
        const v = row && row.vals ? row.vals : {};
        const eta = isFinite(v.eta) ? v.eta.toFixed(2) + "%" : "no solution";
        let tail = "";
        if (isFinite(v.cop)) tail = "  Heat pump COP " + v.cop.toFixed(3) + ".";
        if (isFinite(v.qin)) tail = "  Heat in " + v.qin.toFixed(0) + " kJ/kg.";
        return "Thermal efficiency " + eta + "." + tail;
      };

      fig.sweep(el, cfg);

      if (note) {
        note.textContent = (note.textContent ? note.textContent + "  " : "") + cfg.desc;
      }

      fig.on_tab_click("tabs", "draw_fig_cycles");
    }

    fig.auto_draw(function () { draw_fig_cycles(); });
