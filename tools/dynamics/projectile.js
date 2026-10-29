
    function solve_proj() {
      const err = document.getElementById("err");
      err.textContent = "";

      const v0 = val("v0"), ang = val("angle"), h0 = val("h0") || 0, g = val("grav");
      if (v0 === null || ang === null || g === null) { err.textContent = "fill v0, angle, and g"; return; }
      if (v0 < 0 || g <= 0) { err.textContent = "v0 must be non-negative and g positive"; return; }

      const th = ang * Math.PI / 180;
      const vx = v0 * Math.cos(th), vy = v0 * Math.sin(th);
      const tflight = (vy + Math.sqrt(vy * vy + 2 * g * h0)) / g;
      const range = vx * tflight;
      const hmax = h0 + vy * vy / (2 * g);

      render_lines("lines", [
        ["horizontal vx", fmt(vx, 6) + " m/s"],
        ["vertical vy", fmt(vy, 6) + " m/s"],
        ["flight time", fmt(tflight, 6) + " s"],
        ["range", fmt(range, 6) + " m"],
        ["max height", fmt(hmax, 6) + " m"]
      ]);
    }

    function draw_fig_projectile() {
      const el = document.getElementById("fig-projectile");
      const note = document.getElementById("fig-projectile-note");
      if (!el || !window.fig) return;
      const DEFAULTS = { v0: "60", angle: "45", h0: "0", grav: "9.81" };
      const rows = fig.harvest(solve_proj, DEFAULTS).rows;
      const num = function (frag) {
        for (let i = 0; i < rows.length; i++) {
          if (rows[i].label.toLowerCase().indexOf(frag) >= 0) return rows[i].num;
        }
        return NaN;
      };
      const vx = num("horizontal vx"), vy = num("vertical vy");
      const tfl = num("flight time"), rng = num("range"), hmx = num("max height");
      if (!isFinite(rng) || !isFinite(tfl) || !isFinite(vx)) {
        if (note) note.textContent = "enter a launch speed, angle and gravity to draw the path.";
        return;
      }
      const h0 = num("max height") - vy * vy / (2 * (val("grav") || 9.81));
      const start_h = isFinite(val("h0")) ? val("h0") : 0;

      const pts = [];
      const N = 90;
      for (let i = 0; i <= N; i++) {
        const t = tfl * i / N;
        pts.push([vx * t, start_h + vy * t - 0.5 * (val("grav") || 9.81) * t * t]);
      }
      const maxx = Math.max(rng, 1e-6);
      const maxy = Math.max(hmx, start_h + 1, 1e-6);
      const apx = vx * (vy / (val("grav") || 9.81));
      const alen = 0.18 * Math.max(rng, 10);
      const aden = Math.hypot(vx, vy) || 1;

      fig.plot(el, {
        width: 560,
        height: 300,
        x: { label: "range", unit: "m", min: 0, max: maxx * 1.05 },
        y: { label: "height", unit: "m", min: Math.min(start_h, 0) * 1.1, max: maxy * 1.12 },
        series: [{ pts: pts, cls: "fig-line", label: "trajectory" }],
        points: [
          { x: 0, y: start_h, label: "launch", cls: "fig-dot", r: 4, dx: 8, dy: 12 },
          { x: rng, y: start_h, label: "impact", cls: "fig-dot", r: 4, dx: -8, dy: 12 },
          { x: apx, y: hmx, label: "apex", cls: "fig-dot", r: 4, dx: 8, dy: -8 }
        ],
        arrows: [{
          x0: 0, y0: start_h,
          x1: alen * vx / aden,
          y1: start_h + alen * vy / aden,
          cls: "fig-third", marker: "fig-arrow-blue", label: "v0"
        }]
      });

      if (note) {
        note.textContent = "Flight time " + fig.num_fmt(tfl) + " s, range " + fig.num_fmt(rng) +
          " m, apex " + fig.num_fmt(hmx) + " m.  Components: vx = " + fig.num_fmt(vx) +
          " m/s, vy = " + fig.num_fmt(vy) + " m/s.";
      }
    }

    fig.auto_draw(function () { draw_fig_projectile(); });
