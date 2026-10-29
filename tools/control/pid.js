
    function solve_pid() {
      const err = document.getElementById("err");
      err.textContent = "";

      const ku = val("ku"), tu = val("tu");
      if (ku === null || tu === null) { err.textContent = "fill Ku and Tu"; return; }
      if (ku <= 0 || tu <= 0) { err.textContent = "Ku and Tu must be positive"; return; }

      const lines = [];
      const p = 0.6 * ku, pi_kp = 0.45 * ku, pi_ti = tu / 1.2;
      const pid_kp = 0.6 * ku, pid_ti = tu / 2, pid_td = tu / 8;

      lines.push(["P only  Kp", fmt(p, 6)]);
      lines.push(["PI      Kp", fmt(pi_kp, 4) + ",  Ti " + fmt(pi_ti, 4)]);
      lines.push(["PID     Kp", fmt(pid_kp, 4) + ",  Ti " + fmt(pid_ti, 4) + ",  Td " + fmt(pid_td, 4)]);

      render_lines("lines", lines);
    }

    function draw_fig_pid() {
      const el = document.getElementById("fig-pid");
      const note = document.getElementById("fig-pid-note");
      if (!el || !window.fig) return;
      let ku = val("ku"), tu = val("tu");
      if (ku === null) ku = 1;
      if (tu === null) tu = 1;
      if (ku <= 0 || tu <= 0) {
        if (note) note.textContent = "Enter Ku and Tu to compare the tuned controllers.";
        return;
      }
      const kp_u = [0.6, 0.45, 0.6];
      const ti_ratio = [null, 1.2, 0.5];
      const td_ratio = [null, null, 0.125];
      fig.bars(el, {
        categories: ["Kp/Ku", "Tu/Ti", "Td/Tu"],
        series: [
          { values: kp_u, cls: "fig-bar", label: "P", show_values: true },
          { values: ti_ratio.map(function (q) { return q === null ? 0 : q; }), cls: "fig-third", label: "PI", show_values: true },
          { values: td_ratio.map(function (q) { return q === null ? 0 : q; }), cls: "fig-alt", label: "PID", show_values: true }
        ],
        y: { label: "normalized coefficient", max: 1.2 },
        width: 560, height: 300, show_values: true
      });
      if (note) note.textContent = "Normalized coefficients compare P, PI, and PID: Kp/Ku, Tu/Ti, and Td/Tu.";
    }

    fig.auto_draw(function () { draw_fig_pid(); });
