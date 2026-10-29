
    function solve_hohmann() {
      const err = document.getElementById("err");
      err.textContent = "";

      let r1 = val("r1"), r2 = val("r2"), mu = val("mu") || 3.986e14;
      if (r1 === null || r2 === null) { err.textContent = "fill both radii"; return; }
      if (r1 <= 0 || r2 <= 0 || mu <= 0) { err.textContent = "radii and mu must be positive"; return; }
      if (r1 === r2) { err.textContent = "orbits are the same radius"; return; }
      if (r1 > r2) { const tmp = r1; r1 = r2; r2 = tmp; }

      const at = (r1 + r2) / 2;
      const vc1 = Math.sqrt(mu / r1);
      const vc2 = Math.sqrt(mu / r2);
      const vp1 = Math.sqrt(mu * (2 / r1 - 1 / at));
      const va2 = Math.sqrt(mu * (2 / r2 - 1 / at));
      const dv1 = vp1 - vc1;
      const dv2 = vc2 - va2;
      const ttrans = Math.PI * Math.sqrt(at * at * at / mu);

      render_lines("lines", [
        ["transfer semi-major axis", fmt(at, 6) + " m"],
        ["burn 1 &Delta;v", fmt(dv1, 4) + " m/s"],
        ["burn 2 &Delta;v", fmt(dv2, 4) + " m/s"],
        ["total &Delta;v", fmt(dv1 + dv2, 4) + " m/s"],
        ["transfer time", fmt(ttrans, 4) + " s (" + fmt(ttrans / 3600, 4) + " h)"]
      ]);
    }

    function draw_fig_hohmann() {
      const el = document.getElementById("fig-hohmann");
      const note = document.getElementById("fig-hohmann-note");
      if (!el || !window.fig) return;

      fig.sweep(el, {
        input: "r2",
        min: 6720000.0,
        max: 42241000.0,
        steps: 88,
        solve: "solve_hohmann",
        defaults: { r1: "6678000", mu: "398600441800000" },
        outputs: [
          { match: "burn 1", name: "dv1", cls: "fig-line", unit: "m/s", label: "departure delta-v" },
          { match: "burn 2", name: "dv2", cls: "fig-third", unit: "m/s", label: "arrival delta-v" }
        ],
        x_label: "target orbit radius",
        x_unit: "m",
        y_label: "transfer delta-v",
        y_unit: "m/s",
        width: 560,
        height: 300,
        note: function (cur, row, ctx) {
          const samples = (ctx && ctx.samples) ? ctx.samples : [];
          let pick = null, best = Infinity;
          for (const s of samples) {
            if (!s || !s.vals) continue;
            const dd = Math.abs(s.x - 42164000);
            if (dd < best) { best = dd; pick = s; }
          }
          const pv = pick ? pick.vals : ((row && row.vals) ? row.vals : {});
          const px = pick ? pick.x : cur;
          let peak = null;
          for (const s of samples) {
            if (!s || !s.vals || !isFinite(s.vals.dv2)) continue;
            if (!peak || s.vals.dv2 > peak.vals.dv2) peak = s;
          }
          let txt = ("Raising the target radius to " + fmt(px, 6) + " m costs a departure burn of " +
            fmt(pv.dv1, 4) + " m/s and an arrival burn of " + fmt(pv.dv2, 4) + " m/s.");
          if (peak) {
            txt += (" The arrival burn peaks at " + fmt(peak.vals.dv2, 4) + " m/s near r2 = " +
              fmt(peak.x, 6) + " m and then declines.");
          }
          txt += (" Equal burns occur at r2 = r1 * sqrt(2), where the transfer apoapsis passes the outer orbit.");
          return txt;
        }
      });
    }

    fig.auto_draw(function () { draw_fig_hohmann(); });
