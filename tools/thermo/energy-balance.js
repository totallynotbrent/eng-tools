
    function emode_ui() {
      const gas = document.getElementById("emode").value === "gas";
      document.getElementById("fields_u").style.display = gas ? "none" : "block";
      document.getElementById("fields_gas").style.display = gas ? "block" : "none";
    }

    function render(lines) {
      document.getElementById("lines").innerHTML = lines.map(function (l) {
        return '<div class="result-line"><span class="label">' + l[0] + "</span><span class=\"value\">" + l[1] + "</span></div>";
      }).join("");
      document.getElementById("results").style.display = "block";
    }

    function solve_closed() {
      const err = document.getElementById("err");
      err.textContent = "";
      const m = val("m");
      if (m === null) { err.textContent = "enter mass"; return; }

      let du;
      if (document.getElementById("emode").value === "gas") {
        const cv = val("cv"), t1 = val("t1"), t2 = val("t2");
        if (cv === null || t1 === null || t2 === null) { err.textContent = "enter cv, T1, T2"; return; }
        du = m * cv * (t2 - t1);
      } else {
        const u1 = val("u1"), u2 = val("u2");
        if (u1 === null || u2 === null) { err.textContent = "enter u1 and u2"; return; }
        du = m * (u2 - u1);
      }

      const q = val("q"), w = val("w");
      let out_q = q, out_w = w;
      if (q === null && w === null) { err.textContent = "leave exactly one of Q, W blank"; return; }
      if (q === null) out_q = du + w;
      if (w === null) out_w = q - du;

      if (!isFinite(out_q) || !isFinite(out_w)) { err.textContent = "bad inputs"; return; }

      const lines = [
        ["&Delta;U = m(u2 &minus; u1)", fmt(du, 6) + " kJ"],
        ["heat Q", fmt(out_q, 6) + " kJ"],
        ["work W", fmt(out_w, 6) + " kJ"]
      ];
      if (q !== null && w !== null) {
        const net = q - w;
        lines.push(["Q &minus; W", fmt(net, 6) + " kJ"]);
        lines.push(["check vs &Delta;U", Math.abs(net - du) < 1e-6 * Math.max(1, Math.abs(du)) ? "balances" : "does not balance"]);
      }
      render(lines);
    }

    function solve_flow() {
      const err = document.getElementById("err");
      err.textContent = "";
      const h1 = val("h1"), h2 = val("h2");
      const v1 = val("v1"), v2 = val("v2");
      const z1 = val("z1"), z2 = val("z2");
      const g = val("g");
      if (h1 === null || h2 === null || v1 === null || v2 === null || z1 === null || z2 === null || g === null) {
        err.textContent = "fill every state field"; return;
      }

      const dh = h2 - h1;
      const dke = (v2 * v2 - v1 * v1) / 2000;
      const dpe = g * (z2 - z1) / 1000;
      const sum = dh + dke + dpe;

      const q = val("qf"), w = val("wf");
      let out_q = q, out_w = w;
      if (q === null && w === null) { err.textContent = "leave exactly one of q, w blank"; return; }
      if (q === null) out_q = sum + w;
      if (w === null) out_w = q - sum;

      const lines = [
        ["&Delta;h", fmt(dh, 6) + " kJ/kg"],
        ["&Delta;ke", fmt(dke, 6) + " kJ/kg"],
        ["&Delta;pe", fmt(dpe, 6) + " kJ/kg"],
        ["q &minus; w", fmt(sum, 6) + " kJ/kg"],
        ["heat q", fmt(out_q, 6) + " kJ/kg"],
        ["work w", fmt(out_w, 6) + " kJ/kg"]
      ];
      render(lines);
    }

    document.getElementById("tabs").addEventListener("click", function (e) {
      const tab = e.target.closest(".tab");
      if (!tab) return;
      const mode = tab.getAttribute("data-mode");
      document.querySelectorAll(".tab").forEach(function (el) { el.classList.remove("active"); });
      tab.classList.add("active");
      document.getElementById("panel_closed").style.display = mode === "closed" ? "block" : "none";
      document.getElementById("panel_flow").style.display = mode === "flow" ? "block" : "none";
      document.getElementById("err").textContent = "";
    });

    function draw_fig_energy() {
      const el = document.getElementById("fig-energy");
      const note = document.getElementById("fig-energy-note");
      if (!el || !window.fig) return;
      // the page has two tabs, so pick the solver that matches the visible panel
      const flowPanel = document.getElementById("panel_flow");
      const isFlow = flowPanel && flowPanel.style.display !== "none";

      const entries = [];
      const grab = function (rows, frag) {
        for (let i = 0; i < rows.length; i++) {
          if (rows[i].label.toLowerCase().indexOf(frag) >= 0) return rows[i].num;
        }
        return NaN;
      };

      if (!isFlow) {
        const DEFAULTS = { m: "2", u1: "100", u2: "300", cv: "1", t1: "300", t2: "500", q: "500" };
        const hv = fig.harvest(solve_closed, DEFAULTS);
        if (!hv.rows.length) {
          if (note) note.textContent = "Enter the mass and the two states, then leave one of Q or W blank.";
          return;
        }
        entries.push({ label: "internal energy change", value: grab(hv.rows, "\u03b4u = m(u2") });
        entries.push({ label: "heat Q", value: grab(hv.rows, "heat q") });
        entries.push({ label: "work W", value: grab(hv.rows, "work w") });
      } else {
        const DEFAULTS = {
          h1: "2800", h2: "2400", v1: "0", v2: "100", z1: "0", z2: "50",
          g: "9.81", wf: "100"
        };
        const hv = fig.harvest(solve_flow, DEFAULTS);
        if (!hv.rows.length) {
          if (note) note.textContent = "Fill every state field for the steady flow balance.";
          return;
        }
        entries.push({ label: "enthalpy change", value: grab(hv.rows, "\u03b4h") });
        entries.push({ label: "kinetic energy", value: grab(hv.rows, "\u03b4ke") });
        entries.push({ label: "potential energy", value: grab(hv.rows, "\u03b4pe") });
        entries.push({ label: "heat q", value: grab(hv.rows, "heat q") });
        entries.push({ label: "work w", value: grab(hv.rows, "work w") });
      }

      fig.ledger(el, {
        entries: entries,
        width: 560,
        height: 56 + entries.length * 30,
        label_width: 150,
        value_width: 96,
        zero_label: isFlow ? "steady flow: q - w = \u0394h + \u0394ke + \u0394pe" : "closed system: Q - W = \u0394U",
        format: function (v) { return fig.num_fmt(v) + (isFlow ? " kJ/kg" : " kJ"); }
      });

      if (note) {
        note.textContent = isFlow ?
          "Heat in less work out has to equal the stream energy change.  " +
          "Bars to the left of zero are losses." :
          "Internal energy rises by the heat in less the work out.  " +
          "Work done on the system pushes its bar left of zero.";
      }

      fig.on_tab_click("tabs", "draw_fig_energy");
    }

    fig.auto_draw(function () { draw_fig_energy(); });
