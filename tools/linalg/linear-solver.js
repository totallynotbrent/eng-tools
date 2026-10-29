
    function solve_ls() {
      const err = document.getElementById("err");
      err.textContent = "";

      const size = parseInt(document.getElementById("size").value) || 2;
      const m = [], b = [];
      if (size === 2) {
        m.push([val("a11"), val("a12")], [val("a21"), val("a22")]);
        b.push(val("b1"), val("b2"));
      } else {
        m.push([val("a11"), val("a12"), val("a13")],
               [val("a21"), val("a22"), val("a23")],
               [val("a31"), val("a32"), val("a33")]);
        b.push(val("b1"), val("b2"), val("b3"));
      }
      for (const row of m) for (const x of row) if (x === null) { err.textContent = "fill every A entry"; return; }
      for (const x of b) if (x === null) { err.textContent = "fill every b entry"; return; }

      const x = gauss_solve(m, b);
      if (x === null) { err.textContent = "singular system, no unique solution"; return; }

      const lines = [];
      for (let i = 0; i < x.length; i++) lines.push(["x" + (i + 1), fmt(x[i], 6)]);
      render_lines("lines", lines);
    }

    function draw_fig_ls() {
      const el = document.getElementById("fig-ls");
      const note = document.getElementById("fig-ls-note");
      if (!el || !window.fig) return;

      fig.sweep(el, {
        input: "b1",
        min: -10.0,
        max: 10.0,
        steps: 44,
        solve: "solve_ls",
        defaults: { size: "2", a11: "2", a12: "1", a21: "1", a22: "3", a23: "0", a31: "0", a32: "0", a33: "1", b2: "1", b3: "0" },
        outputs: [{ match: "x1", name: "x1", cls: "fig-line" }],
        x_label: "right hand side b1",
        x_unit: "",
        y_label: "solution x1",
        width: 560,
        height: 300,
        note: function (cur, row) {
          const v = row && row.vals ? row.vals : {};
          return ("Solving with this rhs gives x1 = " + (v.x1||0).toPrecision(5) + ".");
        }
      });
    }

    fig.auto_draw(function () { draw_fig_ls(); });
