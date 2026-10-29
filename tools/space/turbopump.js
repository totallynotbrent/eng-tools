
    function solve_tp() {
      const err = document.getElementById("err");
      err.textContent = "";

      const pm = val("p_mdot"), pr = val("p_rho"), pout = val("p_out"), pin = val("p_in"), pmeas = val("p_meas");
      const tm = val("t_mdot"), ttemp = val("t_temp"), tcp = val("t_cp"), tgam = val("t_gam");
      const tpin = val("t_pin"), tpout = val("t_pout"), tmeas = val("t_meas");

      if (pr === null || pr <= 0 || tm === null || tm <= 0 || ttemp === null || ttemp <= 0 ||
          tcp === null || tcp <= 0 || tgam === null || tgam <= 1) { err.textContent = "check the pump and turbine inputs"; return; }
      if (pout === null || pin === null || tpin === null || tpout === null || pm === null) { err.textContent = "fill every pressure and flow field"; return; }

      const lines = [];

      // pump side
      const dp = (pout - pin) * 1e6;
      const vol = pm / pr;
      const wp = pm * dp / pr;
      lines.push(["pump volumetric flow Q", fmt(vol, 4) + " m&sup3;/s"]);
      lines.push(["pump ideal power", fmt(wp / 1e6, 4) + " MW"]);
      if (pmeas !== null && wp > 0) {
        lines.push(["implied pump efficiency", fmt(pmeas * 1e6 / wp, 4)]);
      }

      // turbine side
      const pr_t = tpout / tpin;
      if (pr_t >= 1) { err.textContent = "turbine exit pressure must be below inlet"; return; }
      const wt = tm * tcp * 1000 * ttemp * (1 - Math.pow(pr_t, (tgam - 1) / tgam));
      lines.push(["turbine pressure ratio", fmt(pr_t, 6)]);
      lines.push(["isentropic temperature drop", fmt(ttemp * (1 - Math.pow(pr_t, (tgam - 1) / tgam)), 4) + " K"]);
      lines.push(["turbine ideal power", fmt(wt / 1e6, 4) + " MW"]);
      if (tmeas !== null && wt > 0) {
        lines.push(["implied turbine efficiency", fmt(tmeas * 1e6 / wt, 4)]);
      }

      render_lines("lines", lines);
    }

    function draw_fig_turbopump() {
      const el = document.getElementById("fig-turbopump");
      const note = document.getElementById("fig-turbopump-note");
      if (!el || !window.fig) return;

      fig.sweep(el, {
        input: "p_out",
        min: 2.0,
        max: 40.0,
        steps: 44,
        solve: "solve_tp",
        defaults: { p_mdot: "350", p_rho: "998", p_in: "0.1", p_meas: "8.5", t_mdot: "80", t_temp: "850", t_cp: "1.4", t_gam: "1.2", t_pin: "40", t_pout: "10", t_meas: "15" },
        outputs: [{ match: "pump ideal power", name: "wp", cls: "fig-line" }, { match: "turbine ideal power", name: "wt", cls: "fig-third", axis: "y2" }],
        x_label: "pump discharge pressure",
        x_unit: "MPa",
        y_label: "shaft power",
        y2_label: "turbine power",
        width: 560,
        height: 300,
        note: function (cur, row) {
          const v = row && row.vals ? row.vals : {};
          return ("Pump needs " + (v.wp||0).toFixed(2) + " MW, turbine gives " + (v.wt||0).toFixed(2) + " MW.");
        }
      });
    }

    fig.auto_draw(function () { draw_fig_turbopump(); });
