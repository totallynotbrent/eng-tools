
    // row layouts, columns are zero-based:
    // satT: [T(degC), psat(kPa), vf, vg, uf, ug, hf, hg, sf, sg]
    // satP: [p(kPa), Tsat(degC), vf, vg, uf, ug, hf, hg, sf, sg]

    function render(values) {
      document.getElementById("lines").innerHTML = values.map(function (l) {
        return '<div class="result-line"><span class="label">' + l[0] + "</span><span class=\"value\">" + l[1] + "</span></div>";
      }).join("");
      document.getElementById("results").style.display = "block";
    }

    function sat_output(row, x, other_label, other_value) {
      const vf = row[2], vg = row[3], uf = row[4], ug = row[5], hf = row[6], hg = row[7], sf = row[8], sg = row[9];
      const out = [
        [other_label, other_value],
        ["v<sub>f</sub>", fmt(vf, 6) + " m&sup3;/kg"],
        ["v<sub>g</sub>", fmt(vg, 6) + " m&sup3;/kg"],
        ["v<sub>fg</sub>", fmt(vg - vf, 6) + " m&sup3;/kg"],
        ["u<sub>f</sub>", fmt(uf, 6) + " kJ/kg"],
        ["u<sub>g</sub>", fmt(ug, 6) + " kJ/kg"],
        ["u<sub>fg</sub>", fmt(ug - uf, 6) + " kJ/kg"],
        ["h<sub>f</sub>", fmt(hf, 6) + " kJ/kg"],
        ["h<sub>g</sub>", fmt(hg, 6) + " kJ/kg"],
        ["h<sub>fg</sub>", fmt(hg - hf, 6) + " kJ/kg"],
        ["s<sub>f</sub>", fmt(sf, 6) + " kJ/(kg&middot;K)"],
        ["s<sub>g</sub>", fmt(sg, 6) + " kJ/(kg&middot;K)"],
        ["s<sub>fg</sub>", fmt(sg - sf, 6) + " kJ/(kg&middot;K)"]
      ];
      if (x !== null) {
        out.push(["mixture at x = " + fmt(x, 4), ""]);
        out.push(["<span class=\"muted\">v</span>", fmt(mix(vf, vg, x), 6) + " m&sup3;/kg"]);
        out.push(["<span class=\"muted\">u</span>", fmt(mix(uf, ug, x), 6) + " kJ/kg"]);
        out.push(["<span class=\"muted\">h</span>", fmt(mix(hf, hg, x), 6) + " kJ/kg"]);
        out.push(["<span class=\"muted\">s</span>", fmt(mix(sf, sg, x), 6) + " kJ/(kg&middot;K)"]);
      }
      render(out);
    }

    function sat_temp() {
      const err = document.getElementById("err");
      err.textContent = "";
      const t = val("sat_t");
      const x = val("sat_t_x");
      if (t === null) { err.textContent = "enter a temperature"; return; }
      if (t < 1 || t > 373) { err.textContent = "temperature out of range (1 to 373 &deg;C)"; return; }
      if (x !== null && (x < 0 || x > 1)) { err.textContent = "quality must be between 0 and 1"; return; }
      const row = table_interp(STEAM_DATA.satT, t, 0);
      sat_output(row, x, "p<sub>sat</sub>", fmt(row[1], 6) + " kPa");
    }

    function sat_press() {
      const err = document.getElementById("err");
      err.textContent = "";
      const p = val("sat_p");
      const x = val("sat_p_x");
      if (p === null) { err.textContent = "enter a pressure"; return; }
      if (p < 1 || p > 22000) { err.textContent = "pressure out of range (1 to 22000 kPa)"; return; }
      if (x !== null && (x < 0 || x > 1)) { err.textContent = "quality must be between 0 and 1"; return; }
      const row = table_interp(STEAM_DATA.satP, p, 0);
      sat_output(row, x, "T<sub>sat</sub>", fmt(row[1], 6) + " &deg;C");
    }

    function tsat_from_p_kpa(p) {
      return table_interp(STEAM_DATA.satP, p, 0)[1];
    }

    function row_interp(rows, t) {
      return table_interp(rows, t, 0);
    }

    function superheat() {
      const err = document.getElementById("err");
      err.textContent = "";
      const p_mpa = val("sup_p");
      const t = val("sup_t");
      if (p_mpa === null || t === null) { err.textContent = "enter both pressure and temperature"; return; }
      const arr = STEAM_DATA.super;
      if (p_mpa < arr[0].p - 1e-9) { err.textContent = "pressure below 0.01 MPa, use the saturated tables"; return; }
      if (p_mpa > arr[arr.length - 1].p + 1e-9) { err.textContent = "pressure above 20 MPa"; return; }

      const tsat = tsat_from_p_kpa(p_mpa * 1000);
      if (t < tsat - 1e-6) {
        err.textContent = "below the saturation temperature here (" + fmt(tsat, 5) + " &deg;C), this is a two-phase state. use saturated tables with a quality";
        return;
      }

      let row;
      for (let i = 1; i < arr.length; i++) {
        if (p_mpa <= arr[i].p) {
          const lo = arr[i - 1], hi = arr[i];
          const rlo = row_interp(lo.rows, t);
          const rhi = row_interp(hi.rows, t);
          const f = (p_mpa - lo.p) / (hi.p - lo.p);
          row = [t];
          for (let c = 1; c < rlo.length; c++) row.push(rlo[c] + (rhi[c] - rlo[c]) * f);
          break;
        }
      }

      render([
        ["state", "superheated vapor"],
        ["p", fmt(p_mpa, 6) + " MPa  (" + fmt(p_mpa * 1000, 6) + " kPa)"],
        ["T", fmt(t, 6) + " &deg;C"],
        ["T<sub>sat</sub>", fmt(tsat, 6) + " &deg;C"],
        ["v", fmt(row[1], 6) + " m&sup3;/kg"],
        ["u", fmt(row[2], 6) + " kJ/kg"],
        ["h", fmt(row[3], 6) + " kJ/kg"],
        ["s", fmt(row[4], 6) + " kJ/(kg&middot;K)"]
      ]);
    }

    document.getElementById("tabs").addEventListener("click", function (e) {
      const tab = e.target.closest(".tab");
      if (!tab) return;
      const mode = tab.getAttribute("data-mode");
      document.querySelectorAll(".tab").forEach(function (el) { el.classList.remove("active"); });
      tab.classList.add("active");
      document.getElementById("panel_satT").style.display = mode === "satT" ? "block" : "none";
      document.getElementById("panel_satP").style.display = mode === "satP" ? "block" : "none";
      document.getElementById("panel_super").style.display = mode === "super" ? "block" : "none";
      document.getElementById("err").textContent = "";
    });

    function draw_fig_steam() {
      const el = document.getElementById("fig-steam");
      const note = document.getElementById("fig-steam-note");
      if (!el || !window.fig) return;

      const tabEl = document.querySelector("#tabs .tab.active");
      const mode = tabEl ? tabEl.getAttribute("data-mode") : "satT";
      let cfg = null;

      if (mode === "satT") {
        cfg = {
          input: "sat_t",
          min: 1,
          max: 373,
          solve: "sat_temp",
          outputs: [
            { match: "hf", name: "hf", cls: "fig-line", exact: true },
            { match: "hg", name: "hg", cls: "fig-third", exact: true },
            { match: "h", name: "hmix", cls: "fig-second", exact: true }
          ],
          x_label: "temperature",
          x_unit: "\u00b0C",
          y_label: "enthalpy",
          desc: "Saturated liquid and vapour enthalpy against temperature.  Add a quality " +
                "and the mixture enthalpy lands between the two curves."
        };
      } else if (mode === "satP") {
        cfg = {
          input: "sat_p",
          min: 1,
          max: 22000,
          x_log: true,
          solve: "sat_press",
          outputs: [
            { match: "tsat", name: "tsat", cls: "fig-line", exact: true },
            { match: "hf", name: "hf", cls: "fig-third", axis: "y2", exact: true },
            { match: "hg", name: "hg", cls: "fig-second", axis: "y2", exact: true }
          ],
          x_label: "pressure",
          x_unit: "kPa",
          y_label: "saturation temperature",
          y2_label: "enthalpy",
          y2_unit: "kJ/kg",
          desc: "Saturation temperature climbs steeply with pressure while the enthalpy gap " +
                "between saturated liquid and vapour narrows."
        };
      } else {
        cfg = {
          input: "sup_t",
          min: 215,
          max: 700,
          solve: "superheat",
          defaults: { sup_p: "2" },
          outputs: [
            { match: "h", name: "h", cls: "fig-line", exact: true },
            { match: "s", name: "s", cls: "fig-third", axis: "y2", exact: true }
          ],
          x_label: "temperature",
          x_unit: "\u00b0C",
          y_label: "enthalpy",
          y2_label: "entropy",
          y2_unit: "kJ/(kg\u00b7K)",
          desc: "Superheated vapour at 2 MPa.  Enter another pressure and the figure follows it."
        };
      }

      cfg.steps = 48;
      cfg.cache_tag = "steam-" + mode;
      cfg.width = 560;
      cfg.height = 300;
      cfg.note = function (cur, row) {
        const v = row && row.vals ? row.vals : {};
        const parts = [];
        if (isFinite(v.hf)) parts.push("hf " + v.hf.toFixed(1));
        if (isFinite(v.hg)) parts.push("hg " + v.hg.toFixed(1));
        if (isFinite(v.hmix)) parts.push("mixture h " + v.hmix.toFixed(1));
        if (isFinite(v.tsat)) parts.push("Tsat " + v.tsat.toFixed(2) + " \u00b0C");
        if (isFinite(v.h)) parts.push("h " + v.h.toFixed(1) + " kJ/kg");
        if (isFinite(v.s)) parts.push("s " + v.s.toFixed(3) + " kJ/(kg\u00b7K)");
        return parts.length ? parts.join("  ") + "." : "";
      };

      fig.sweep(el, cfg);

      if (note) {
        note.textContent = (note.textContent ? note.textContent + "  " : "") + cfg.desc;
      }

      fig.on_tab_click("tabs", "draw_fig_steam");
    }

    fig.auto_draw(function () { draw_fig_steam(); });
