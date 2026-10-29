
    function solve_mohr() {
      const err = document.getElementById("err");
      err.textContent = "";

      const sx = val("sx"), sy = val("sy"), txy = val("txy");
      if (sx === null || sy === null || txy === null) { err.textContent = "fill all three stresses"; return; }

      const avg = (sx + sy) / 2;
      const rd = (sx - sy) / 2;
      const r = Math.hypot(rd, txy);
      const s1 = avg + r, s2 = avg - r;
      const thp = 0.5 * Math.atan2(txy, rd) * 180 / Math.PI;

      render_lines("lines", [
        ["principal stress &sigma;1", fmt(s1, 6) + " Pa"],
        ["principal stress &sigma;2", fmt(s2, 6) + " Pa"],
        ["max shear &tau;max", fmt(r, 6) + " Pa"],
        ["principal angle &theta;p", fmt(thp, 6) + " &deg;"],
        ["average stress &sigma;avg", fmt(avg, 6) + " Pa"]
      ]);
    }

    function draw_fig_mohr() {
      const el = document.getElementById("fig-mohr");
      const note = document.getElementById("fig-mohr-note");
      if (!el || !window.fig) return;
      const SG = "σ", TA = "τ", TH = "θ";
      let sv = val("sx"), su = val("sy"), tv = val("txy");
      if (sv === null || su === null || tv === null) {
        fig.seeded({ sx: "120", sy: "-40", txy: "76" }, draw_fig_mohr);
        return;
      }
      if (sv === null || su === null || tv === null) {
        if (note) note.textContent = "fill all three stresses to draw the circle.";
        return;
      }

      const avg = (sv + su) / 2;
      const rd = (sv - su) / 2;
      const rad = Math.hypot(rd, tv);
      const thp = 0.5 * Math.atan2(tv, rd) * 180 / Math.PI;

      const circ = [];
      for (let i = 0; i <= 72; i++) {
        const a = 2 * Math.PI * i / 72;
        circ.push([avg + rad * Math.cos(a), rad * Math.sin(a)]);
      }

      const half = Math.max(rad, Math.abs(rd), Math.abs(tv), 1) * 1.35;
      const lo = Math.min(avg - rad, sv, su) - half * 0.28;
      const hi = Math.max(avg + rad, sv, su) + half * 0.28;

      fig.plot(el, {
        width: 520,
        height: 350,
        x: { label: "normal stress", unit: "Pa", min: lo, max: hi },
        y: { label: "shear stress", unit: "Pa", min: -half * 1.12, max: half * 1.12 },
        series: [
          { pts: circ, cls: "fig-line" },
          { pts: [[sv, tv], [su, -tv]], cls: "fig-third fig-dash" }
        ],
        points: [
          { x: sv, y: tv, label: "A", cls: "fig-dot", r: 4 },
          { x: su, y: -tv, label: "B", cls: "fig-dot", r: 4 },
          { x: avg + rad, y: 0, label: SG + "1", cls: "fig-dot", r: 4, dy: -8 },
          { x: avg - rad, y: 0, label: SG + "2", cls: "fig-dot", r: 4, dy: -8 },
          { x: avg, y: rad, label: TA + "max", cls: "fig-dot", r: 4, dx: -22, dy: 3 }
        ],
        arrows: [
          { x0: avg, y0: 0, x1: avg + rad, y1: 0, cls: "fig-guide", marker: "fig-arrow-alt", head: "none" },
          { x0: avg, y0: 0, x1: avg, y1: rad, cls: "fig-guide", marker: "fig-arrow-alt", head: "none" }
        ],
        labels: [
          { text: "2" + TH + "p = " + fig.num_fmt(2 * thp) + " deg", left: 8, top: 4 }
        ]
      });

      if (note) {
        note.textContent = SG + "avg = " + fig.num_fmt(avg) + " Pa, R = " + fig.num_fmt(rad) +
          " Pa.  Point A is the element on the " + SG + " axis; rotate the plane by 2" + TH + "p = " +
          fig.num_fmt(2 * thp) + " deg to reach the principal orientation.";
      }
    }

    fig.auto_draw(function () { draw_fig_mohr(); });
