
    const KPA = { kpa: 1, mpa: 1000, bar: 100, atm: 101.325, psia: 6.89476 };

    function custom_gas() {
      document.getElementById("r_custom").style.display =
        document.getElementById("gas").value === "custom" ? "block" : "none";
    }

    function to_kpa(n, unit) { return n * KPA[unit]; }
    function to_kelvin(n, unit) {
      if (unit === "c") return n + 273.15;
      if (unit === "f") return (n - 32) * 5 / 9 + 273.15;
      return n;
    }

    function gas_r() {
      const g = document.getElementById("gas").value;
      if (g === "custom") {
        const rc = val("r_custom");
        return rc === null ? NaN : rc;
      }
      return parseFloat(g);
    }

    function solve() {
      const err = document.getElementById("err");
      err.textContent = "";

      const p = val("p");
      const p_unit = document.getElementById("p_unit").value;
      const v = val("vol");
      const m = val("mass");
      const t = val("temp");
      const t_unit = document.getElementById("t_unit").value;
      const r = gas_r();

      if (!isFinite(r) || r <= 0) { err.textContent = "choose a gas or enter a positive custom R"; return; }

      const p_kpa = p === null ? null : to_kpa(p, p_unit);
      const t_k = t === null ? null : to_kelvin(t, t_unit);
      const known = [p_kpa, v, m, t_k].filter(function (x) { return x !== null; }).length;
      if (known !== 3) { err.textContent = "leave exactly one field empty"; return; }

      let out_p = p_kpa, out_v = v, out_m = m, out_t = t_k;
      let missing = "";
      if (p_kpa === null) { missing = "p"; out_p = m * r * t_k / v; }
      else if (v === null) { missing = "V"; out_v = m * r * t_k / p_kpa; }
      else if (m === null) { missing = "m"; out_m = p_kpa * v / (r * t_k); }
      else if (t_k === null) { missing = "T"; out_t = p_kpa * v / (m * r); }

      if (!isFinite(out_p) || !isFinite(out_v) || !isFinite(out_m) || !isFinite(out_t)) {
        err.textContent = "division by zero, check your inputs";
        return;
      }

      const lines = [];
      const unit = document.getElementById("p_unit").value;
      lines.push(["pressure", fmt(out_p, 6) + " kPa"]);
      lines.push(["volume", fmt(out_v, 6) + " m&sup3;"]);
      lines.push(["mass", fmt(out_m, 6) + " kg"]);
      lines.push(["temperature", fmt(out_t, 6) + " K  (" + fmt(out_t - 273.15, 6) + " &deg;C)"]);
      const v_spec = out_v / out_m;
      lines.push(["specific volume v = V/m", fmt(v_spec, 6) + " m&sup3;/kg"]);
      lines.push(["density &rho; = m/V", fmt(out_m / out_v, 6) + " kg/m&sup3;"]);

      const box = document.getElementById("lines");
      box.innerHTML = lines.map(function (l) {
        return '<div class="result-line"><span class="label">' + l[0] + "</span><span class=\"value\">" + l[1] + "</span></div>";
      }).join("");

      document.getElementById("results").style.display = "block";
    }

    function draw_fig_ideal() {
      const el = document.getElementById("fig-ideal");
      const note = document.getElementById("fig-ideal-note");
      if (!el || !window.fig) return;

      fig.sweep(el, {
        input: "temp",
        min: 200.0,
        max: 1200.0,
        steps: 44,
        solve: "solve",
        defaults: { p: "101.325", vol: "1" },
        clear: ["mass"],
        outputs: [{ match: "specific volume", name: "sv", cls: "fig-line" }, { match: "density", name: "rho", cls: "fig-third", axis: "y2" }],
        x_label: "temperature",
        x_unit: "K",
        y_label: "specific volume",
        y2_label: "density",
        width: 560,
        height: 300,
        note: function (cur, row) {
          const v = row && row.vals ? row.vals : {};
          return ("Specific volume " + (v.sv||0).toFixed(4) + " m^3/kg at this temperature.");
        }
      });
    }

    fig.auto_draw(function () { draw_fig_ideal(); });
