
    const T0 = 288.15, P0 = 101325, L = 0.0065, G0 = 9.80665, R = 287.0529, GAMMA = 1.4;
    const RHO0 = P0 / (R * T0);
    const EXP = G0 / (L * R);

    function isa_profile(h) {
      let t, p;
      if (h < 11000) {
        t = T0 - L * h;
        p = P0 * Math.pow(t / T0, EXP);
      } else {
        t = 216.65;
        const p11 = P0 * Math.pow(216.65 / T0, EXP);
        p = p11 * Math.exp(-G0 * (h - 11000) / (R * 216.65));
      }
      return { t: t, p: p, rho: p / (R * t), a: Math.sqrt(GAMMA * R * t) };
    }

    function solve_isa() {
      const err = document.getElementById("err");
      err.textContent = "";

      const h = val("alt");
      if (h === null) { err.textContent = "enter an altitude"; return; }
      if (h < 0 || h > 20000) { err.textContent = "altitude must be between 0 and 20000 m"; return; }

      const s = isa_profile(h);
      const t = s.t, p = s.p, rho = s.rho, a = s.a;

      render_lines("lines", [
        ["temperature T", fmt(t, 4) + " K (" + fmt(t - 273.15, 4) + " &deg;C)"],
        ["pressure p", fmt(p, 4) + " Pa"],
        ["density &rho;", fmt(rho, 6) + " kg/m&sup3;"],
        ["speed of sound a", fmt(a, 4) + " m/s"],
        ["p / p0", fmt(p / P0, 6)],
        ["&rho; / &rho;0", fmt(rho / RHO0, 6)]
      ]);
      draw_figure_isa(h);
    }

    function draw_figure_isa(h_current) {
      const el = document.getElementById("fig-isa");
      if (!el || !window.fig) return;
      const h_now = h_current !== undefined ? h_current : (val("alt") || 0);
      if (h_now < 0 || h_now > 20000) return;

      const ratios = function (h) {
        const s = isa_profile(h);
        return [s.p / P0, s.rho / RHO0, s.t / T0];
      };
      const now = ratios(h_now);

      fig.plot(el, {
        width: 560,
        height: 310,
        x: { label: "altitude", unit: "m", min: 0, max: 20000 },
        y: { label: "fraction of sea level value", unit: "", min: 0.02, max: 1.05, log: true },
        series: [
          { fn: function (h) { return ratios(h)[0]; }, xmin: 0, xmax: 20000, cls: "fig-line", label: "p / p0" },
          { fn: function (h) { return ratios(h)[1]; }, xmin: 0, xmax: 20000, cls: "fig-third", label: "rho / rho0" },
          { fn: function (h) { return ratios(h)[2]; }, xmin: 0, xmax: 20000, cls: "fig-alt", label: "T / T0" }
        ],
        vlines: [{ x: 11000, label: "11 km tropopause" }],
        marker: { x: h_now, y: now[0], label: "h = " + fig.num_fmt(h_now) + " m" },
        driver: true,
        on_drag: function (x) { fig.drive("alt", solve_isa, { min: 0, max: 20000, step: 50 })(x); }
      });

      const note = document.getElementById("fig-isa-note");
      if (note) {
        note.textContent = "drag the marker to change altitude:  p/p0 = " + fig.num_fmt(now[0]) +
          ",  rho/rho0 = " + fig.num_fmt(now[1]) + ",  T/T0 = " + fig.num_fmt(now[2]);
      }
    }

    fig.auto_draw(function () { draw_figure_isa(val("alt")); });
