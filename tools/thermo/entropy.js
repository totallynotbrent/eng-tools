
    function to_k(n, unit) { return unit === "c" ? n + 273.15 : n; }

    function render(lines) {
      document.getElementById("lines").innerHTML = lines.map(function (l) {
        return '<div class="result-line"><span class="label">' + l[0] + "</span><span class=\"value\">" + l[1] + "</span></div>";
      }).join("");
      document.getElementById("results").style.display = "block";
    }

    function solve_ds() {
      const err = document.getElementById("err");
      err.textContent = "";
      const cp = val("cp"), r = val("rg");
      const t1 = val("t1"), t2 = val("t2");
      const p1 = val("p1"), p2 = val("p2");
      if (cp === null || r === null || t1 === null || t2 === null || p1 === null || p2 === null) {
        err.textContent = "fill every field"; return;
      }
      const unit = document.getElementById("t_unit").value;
      const tk1 = to_k(t1, unit), tk2 = to_k(t2, unit);
      if (tk1 <= 0 || tk2 <= 0 || p1 <= 0 || p2 <= 0) { err.textContent = "temperatures and pressures must be positive"; return; }

      const ds = cp * Math.log(tk2 / tk1) - r * Math.log(p2 / p1);
      render([
        ["&Delta;s", fmt(ds, 6) + " kJ/(kg&middot;K)"]
      ]);
    }

    function solve_isen() {
      const err = document.getElementById("err");
      err.textContent = "";
      const k = val("k");
      const t1 = val("it1"), t2 = val("it2");
      const p1 = val("ip1"), p2 = val("ip2");
      if (k === null || k <= 1) { err.textContent = "enter k > 1"; return; }
      const unit = document.getElementById("it_unit").value;
      const tk1 = t1 === null ? null : to_k(t1, unit);
      const tk2 = t2 === null ? null : to_k(t2, unit);

      const known = [tk1, tk2, p1, p2].filter(function (x) { return x !== null; }).length;
      if (known !== 3) { err.textContent = "leave exactly one of T2, p2 blank"; return; }
      if (tk1 === null || p1 === null) { err.textContent = "T1 and p1 are required"; return; }

      let out_t2 = tk2, out_p2 = p2;
      if (tk2 === null) {
        out_t2 = tk1 * Math.pow(p2 / p1, (k - 1) / k);
      } else if (p2 === null) {
        out_p2 = p1 * Math.pow(tk2 / tk1, k / (k - 1));
      }

      render([
        ["T2", fmt(out_t2, 6) + " K"],
        ["p2", fmt(out_p2, 6)]
      ]);
    }

    document.getElementById("tabs").addEventListener("click", function (e) {
      const tab = e.target.closest(".tab");
      if (!tab) return;
      const mode = tab.getAttribute("data-mode");
      document.querySelectorAll(".tab").forEach(function (el) { el.classList.remove("active"); });
      tab.classList.add("active");
      document.getElementById("panel_ds").style.display = mode === "ds" ? "block" : "none";
      document.getElementById("panel_isen").style.display = mode === "isen" ? "block" : "none";
      document.getElementById("err").textContent = "";
    });

    function draw_fig_entro() {
      const el = document.getElementById("fig-entro");
      const note = document.getElementById("fig-entro-note");
      if (!el || !window.fig) return;

      fig.sweep(el, {
        input: "t2",
        min: 200.0,
        max: 1200.0,
        steps: 44,
        solve: "solve_ds",
        defaults: { cp: "1005", rg: "287", t1: "300", t_unit: "K", p1: "101325", p2: "101325" },
        outputs: [{ match: "\u0394s", name: "ds", cls: "fig-line" }],
        x_label: "final temperature",
        x_unit: "K",
        y_label: "entropy change",
        width: 560,
        height: 300,
        note: function (cur, row) {
          const v = row && row.vals ? row.vals : {};
          return ("Entropy change " + (v.ds||0).toFixed(4) + " kJ/(kg\u00b7K).");
        }
      });
    }

    fig.auto_draw(function () { draw_fig_entro(); });
