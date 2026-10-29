
    function solve_range() {
      const err = document.getElementById("err");
      err.textContent = "";

      const mode = document.getElementById("mode").value;
      const v = val("vel"), ld = val("ld"), w0 = val("w0"), w1 = val("w1"), c = val("sfc");
      if (v === null || ld === null || w0 === null || w1 === null || c === null) {
        err.textContent = "fill V, L/D, W0, W1, and c";
        return;
      }
      if (w1 <= 0 || w0 <= w1 || c <= 0) { err.textContent = "need W0 > W1 > 0 and c > 0"; return; }

      const lnr = Math.log(w0 / w1);
      let range;
      if (mode === "jet") {
        range = (v / c) * ld * lnr;
      } else {
        const eta = val("eta");
        if (eta === null) { err.textContent = "propeller needs eta"; return; }
        range = (eta / c) * ld * lnr;
      }
      const endurance = range / v;

      render_lines("lines", [
        ["range", fmt(range, 4) + " m (" + fmt(range / 1000, 4) + " km)"],
        ["block time", fmt(endurance, 4) + " s (" + fmt(endurance / 3600, 4) + " h)"]
      ]);
    }

    function draw_fig_range() {
      const el = document.getElementById("fig-range");
      const note = document.getElementById("fig-range-note");
      if (!el || !window.fig) return;
      let v = val("vel"), ld = val("ld"), w0 = val("w0"), w1 = val("w1"), c = val("sfc");
      const mode = document.getElementById("mode").value;
      let eta = mode === "prop" ? val("eta") : 1;
      if (v === null) v = 250;
      if (ld === null) ld = 15;
      if (w0 === null) w0 = 10000;
      if (w1 === null) w1 = 5000;
      if (c === null) c = 0.00002;
      if (eta === null) eta = 0.8;
      if ([v, ld, w0, w1, c, eta].some(function (q) { return q === null; }) || v <= 0 || ld <= 0 || w0 <= w1 || w1 <= 0 || c <= 0 || eta <= 0) {
        if (note) note.textContent = "Fill the aircraft and propulsion values to draw the range trade.";
        return;
      }
      // mirror the solver: a jet trades range with speed, a propeller trades endurance
      const jet_factor = v * ld / c;
      const prop_factor = eta * ld / c;
      const factor = mode === "prop" ? prop_factor : jet_factor;
      const fmin = Math.min(0.35, w1 / w0 * 0.9), fmax = 0.99;
      // range grows as the remaining weight fraction shrinks, so the axis tops out at fmin
      const range_max = factor * Math.log(1 / fmin);
      fig.plot(el, {
        width: 560, height: 310,
        x: { label: "remaining weight fraction W1/W0", unit: "", min: fmin, max: fmax },
        y: { label: "breguet range", unit: "m", min: 0, max: range_max * 1.05 },
        series: [
          { fn: function (fraction) { return factor * Math.log(1 / fraction); }, xmin: fmin, xmax: fmax, cls: "fig-line", label: "range" }
        ],
        marker: { x: w1 / w0, y: factor * Math.log(w0 / w1), label: "selected" },
        driver: false
      });
      if (note) note.textContent = "At W1/W0 = " + fig.num_fmt(w1 / w0) + ", range is " + fig.num_fmt(factor * Math.log(w0 / w1)) + " m. Range falls logarithmically as final weight rises.";
    }

    fig.auto_draw(function () { draw_fig_range(); });
