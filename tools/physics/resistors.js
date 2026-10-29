
    function solve_equiv() {
      const err = document.getElementById("err");
      err.textContent = "";

      const raw = document.getElementById("values").value;
      const nums = raw.split(/[\s,]+/).filter(function (t) { return t !== ""; }).map(parseFloat);
      if (!nums.length || nums.some(function (n) { return !isFinite(n); })) {
        err.textContent = "enter a list of numbers";
        return;
      }
      if (nums.some(function (n) { return n <= 0; })) { err.textContent = "values must be positive"; return; }

      const elem = document.getElementById("elem").value;
      const conn = document.getElementById("conn").value;

      let eq;
      if (elem === "r") {
        if (conn === "series") eq = nums.reduce(function (a, b) { return a + b; }, 0);
        else eq = 1 / nums.reduce(function (a, b) { return a + 1 / b; }, 0);
      } else {
        if (conn === "parallel") eq = nums.reduce(function (a, b) { return a + b; }, 0);
        else eq = 1 / nums.reduce(function (a, b) { return a + 1 / b; }, 0);
      }

      const unit = elem === "r" ? " &Omega;" : " F";
      render_lines("lines", [["equivalent " + (elem === "r" ? "resistance" : "capacitance"), fmt(eq, 6) + unit]]);
    }

    function draw_fig_equivalents() {
      const el = document.getElementById("fig-equivalents");
      const note = document.getElementById("fig-equivalents-note");
      if (!el || !window.fig) return;
      const rawValues = document.getElementById("values").value.trim() || "10, 20, 30";
      const nums = rawValues.split(/[\s,]+/).filter(Boolean).map(Number);
      if (!nums.length || nums.some(function (q) { return !isFinite(q) || q <= 0; })) {
        if (note) note.textContent = "Enter positive component values.";
        return;
      }
      const elem = document.getElementById("elem").value;
      const conn = document.getElementById("conn").value;
      const unit = elem === "r" ? "Ω" : "F";
      let eq;
      if ((elem === "r" && conn === "series") || (elem === "c" && conn === "parallel")) eq = nums.reduce(function (a, b) { return a + b; }, 0);
      else eq = 1 / nums.reduce(function (a, b) { return a + 1 / b; }, 0);

      const s = fig.scene(el, { width: 560, height: 310 });
      const horizontal = conn === "series";
      const spacing = horizontal ? Math.min(150, 440 / Math.max(nums.length, 1)) : 150;
      const bus_y = 205;
      s.line(60, 65, 60, bus_y, "fig-wire");
      s.line(500, 65, 500, bus_y, "fig-wire");
      nums.forEach(function (qv, qi) {
        const x = horizontal ? 60 + spacing * (qi + 0.5) : 60 + (qi % 2) * 440;
        const yy = horizontal ? 145 : 75 + Math.floor(qi / 2) * 120;
        if (!horizontal) s.line(60, bus_y, 60, yy, "fig-wire");
        if (horizontal) {
          s.rect(x - 38, 128, 76, 34, "fig-band");
          s.text(x, 145, fig.num_fmt(qv) + " " + unit, { cls: "fig-val" });
          s.line(60, 145, x - 38, 145, "fig-wire");
          s.line(x + 38, 145, 500, 145, "fig-wire");
        } else {
          s.circle(x, yy, 22, "fig-band");
          s.text(x, yy, fig.num_fmt(qv), { cls: "fig-val" });
          s.line(x, yy + 22, x, bus_y, "fig-wire");
        }
      });
      s.text(280, 28, "individual " + (elem === "r" ? "resistors" : "capacitors"), { cls: "fig-label" });
      s.text(280, 260, "equivalent = " + fig.num_fmt(eq) + " " + unit, { cls: "fig-val" });
      s.commit();
      if (note) note.textContent = (elem === "r" ? "Resistance" : "Capacitance") + " combines by " + conn + ". The displayed equivalent is " + fig.num_fmt(eq) + " " + unit + ".";
    }

    fig.auto_draw(function () { draw_fig_equivalents(); });
