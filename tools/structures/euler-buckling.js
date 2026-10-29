
    function solve_buckling() {
      const err = document.getElementById("err");
      err.textContent = "";

      const e = val("e_mod"), i = val("inertia"), l = val("len");
      if (e === null || i === null || l === null) { err.textContent = "fill E, I, and L"; return; }
      if (e <= 0 || i <= 0 || l <= 0) { err.textContent = "E, I, and L must be positive"; return; }

      const k = parseFloat(document.getElementById("ends").value);
      const pcr = Math.PI * Math.PI * e * i / Math.pow(k * l, 2);

      render_lines("lines", [
        ["critical load P_cr", fmt(pcr, 6) + " N"],
        ["effective length KL", fmt(k * l, 6) + " m"]
      ]);
    }

    function draw_fig_buckle() {
      const el = document.getElementById("fig-buckle");
      const note = document.getElementById("fig-buckle-note");
      if (!el || !window.fig) return;
      const DEFAULTS = { e_mod: "200000000000", inertia: "0.0000125", len: "2" };
      const hv = fig.harvest(solve_buckling, DEFAULTS);
      if (!hv.rows.length) {
        if (note) note.textContent = "fill the elastic modulus, second moment and length.";
        return;
      }
      const num = function (frag) {
        for (let i = 0; i < hv.rows.length; i++) {
          if (hv.rows[i].label.toLowerCase().indexOf(frag) >= 0) return hv.rows[i].num;
        }
        return NaN;
      };
      const pcr = num("critical load");
      const kl = num("effective length");
      const E = parseFloat(hv.values.e_mod), I = parseFloat(hv.values.inertia), L = parseFloat(hv.values.len);
      if (!isFinite(pcr) || !isFinite(E) || !isFinite(I) || !isFinite(L) || !(I > 0) || !(E > 0)) {
        if (note) note.textContent = "fill the elastic modulus, second moment and length.";
        return;
      }
      const PI2EI = Math.PI * Math.PI * E * I;
      const K = kl > 0 ? Math.sqrt(PI2EI / pcr) : 1;
      const leff = K * L;
      const xmax = leff * 2.2;

      const pts = [];
      const N = 120;
      for (let i = 0; i <= N; i++) {
        const x = xmax * i / N;
        pts.push([x, PI2EI / (x * x)]);
      }

      fig.plot(el, {
        width: 560,
        height: 300,
        x: { label: "effective length KL", unit: "m", min: 0, max: xmax },
        y: { label: "critical load", unit: "N", min: 0, max: Math.max(pcr, PI2EI / (xmax * xmax)) * 1.12 },
        series: [{ pts: pts, cls: "fig-line", label: "Pcr = pi^2 EI / (KL)^2" }],
        vlines: [{ x: leff, label: "your case" }],
        marker: { x: leff, y: pcr, label: "Pcr = " + fig.num_fmt(pcr) + " N", crosshair: true },
        driver: false
      });

      if (note) {
        note.textContent = "Effective length factor K = " + fig.num_fmt(K) +
          " for the selected end condition, so the critical load sits at KL = " + fig.num_fmt(leff) +
          " m.  Doubling the effective length quarters the load.";
      }
    }

    fig.auto_draw(function () { draw_fig_buckle(); });
