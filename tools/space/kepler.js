
    function solve_kepler() {
      const err = document.getElementById("err");
      err.textContent = "";

      let a = val("a"), t = val("t"), mu = val("mu") || 3.986e14;
      const known = (a !== null ? 1 : 0) + (t !== null ? 1 : 0);
      if (known !== 1) { err.textContent = "leave exactly one of a and T blank"; return; }
      if (mu <= 0) { err.textContent = "mu must be positive"; return; }

      if (t === null) {
        if (a <= 0) { err.textContent = "a must be positive"; return; }
        t = 2 * Math.PI * Math.sqrt(a * a * a / mu);
      } else {
        if (t <= 0) { err.textContent = "T must be positive"; return; }
        a = Math.pow(mu * Math.pow(t / (2 * Math.PI), 2), 1 / 3);
      }

      render_lines("lines", [
        ["semi-major axis a", fmt(a, 6) + " m"],
        ["period T", fmt(t, 6) + " s (" + fmt(t / 3600, 4) + " h)"]
      ]);
    }

    function draw_fig_kepler() {
      const el = document.getElementById("fig-kepler");
      const note = document.getElementById("fig-kepler-note");
      if (!el || !window.fig) return;
      let a = val("a"), t = val("t"), mu = val("mu") || 3.986e14;
      if (a === null && t === null) a = 1.496e11;
      if ((a === null) === (t === null)) {
        if (note) note.textContent = "Leave one of a or T blank to draw the orbit relation.";
        return;
      }
      if (a !== null && a <= 0) return;
      if (t !== null && t <= 0) return;
      if (a === null) a = Math.pow(mu * Math.pow(t / (2 * Math.PI), 2), 1 / 3);
      else t = 2 * Math.PI * Math.sqrt(a * a * a / mu);

      const ratio = t * t / (a * a * a);
      const xmax = Math.max(a * 1.35, 1);
      fig.plot(el, {
        width: 560, height: 310,
        x: { label: "semi-major axis", unit: "m", min: 0, max: xmax },
        y: { label: "orbital period squared", unit: "s^2", min: 0, max: t * t * 1.2 },
        series: [
          { fn: function (xx) { return ratio * xx * xx * xx; }, xmin: 0, xmax: xmax, cls: "fig-line", label: "T^2" }
        ],
        marker: { x: a, y: t * t, label: "orbit" },
        driver: false
      });
      if (note) note.textContent = "T^2/a^3 = " + fig.num_fmt(ratio) + " s^2/m^3. The cubic relation is Kepler's third law.";
    }

    fig.auto_draw(function () { draw_fig_kepler(); });
