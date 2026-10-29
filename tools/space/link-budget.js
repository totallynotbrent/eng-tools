
    const C_SPEED = 299792458, KB = 1.380649e-23;

    function solve_link() {
      const err = document.getElementById("err");
      err.textContent = "";

      const pt = val("pt"), gt = val("gt"), gr = val("gr"), d = val("dist"), f = val("freq");
      if (pt === null || gt === null || gr === null || d === null || f === null) {
        err.textContent = "fill Pt, Gt, Gr, d, and f";
        return;
      }
      if (d <= 0 || f <= 0 || pt <= 0) { err.textContent = "d, f, and Pt must be positive"; return; }

      const lam = C_SPEED / f;
      const fspl = Math.pow(lam / (4 * Math.PI * d), 2);
      const pr = pt * gt * gr * fspl;
      const pr_dbm = 10 * Math.log10(pr * 1000);

      const lines = [
        ["wavelength &lambda;", fmt(lam, 6) + " m"],
        ["free-space loss", fmt(fspl, 6)],
        ["path loss", fmt(-10 * Math.log10(fspl), 4) + " dB"],
        ["received power Pr", fmt(pr, 6) + " W (" + fmt(pr_dbm, 4) + " dBm)"]
      ];

      const tsys = val("tsys"), bw = val("bw");
      if (tsys !== null && bw !== null) {
        if (tsys <= 0 || bw <= 0) { err.textContent = "Tsys and B must be positive"; return; }
        const cn = pr / (KB * tsys * bw);
        lines.push(["C/N0", fmt(pr / (KB * tsys), 4) + " dB-Hz"]);
        lines.push(["carrier to noise C/N", fmt(cn, 4) + " (" + fmt(10 * Math.log10(cn), 4) + " dB)"]);
      }

      render_lines("lines", lines);
    }

    function draw_fig_linkbudget() {
      const el = document.getElementById("fig-linkbudget");
      const note = document.getElementById("fig-linkbudget-note");
      if (!el || !window.fig) return;

      fig.sweep(el, {
        input: "dist",
        min: 100000.0,
        max: 40000000.0,
        steps: 44,
        solve: "solve_link",
        defaults: { pt: "10", gt: "0.1", gr: "0.5", freq: "2.4e9", tsys: "290", bw: "1e6" },
        outputs: [
          { match: "received power", name: "prdbm", num_index: 1, cls: "fig-line", unit: "dBm", label: "received power" },
          { match: "carrier to noise", name: "cndb", num_index: 1, cls: "fig-third", unit: "dB", label: "carrier-to-noise", axis: "y2" }
        ],
        x_label: "slant range",
        x_unit: "m",
        y_label: "received power",
        y_unit: "dBm",
        y2_label: "carrier-to-noise",
        y2_unit: "dB",
        width: 560,
        height: 300,
        note: function (cur, row, ctx) {
          const samples = (ctx && ctx.samples) ? ctx.samples : [];
          let pick = null, best = Infinity;
          for (const s of samples) {
            if (!s || !s.vals) continue;
            const dd = Math.abs(s.x - 1000000);
            if (dd < best) { best = dd; pick = s; }
          }
          const pv = pick ? pick.vals : ((row && row.vals) ? row.vals : {});
          const px = pick ? pick.x : cur;
          return ("At a slant range of " + fmt(px, 6) + " m the receiver collects " +
            fmt(pv.prdbm, 4) + " dBm for a carrier-to-noise ratio of " + fmt(pv.cndb, 4) + " dB.");
        }
      });
    }

    fig.auto_draw(function () { draw_fig_linkbudget(); });
