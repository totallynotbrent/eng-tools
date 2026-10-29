
    function solve_re() {
      const err = document.getElementById("err");
      err.textContent = "";

      const rho = val("rho"), v = val("vel"), l = val("len"), mu = val("mu") || 1.789e-5;
      if (rho === null || v === null || l === null) { err.textContent = "fill rho, V, and L"; return; }
      if (mu <= 0 || l <= 0) { err.textContent = "mu and L must be positive"; return; }

      const re = rho * v * l / mu;
      let regime = "laminar-leaning";
      if (re > 4000) regime = "turbulent-leaning";
      else if (re >= 2300) regime = "transitional";

      render_lines("lines", [
        ["reynolds number Re", fmt(re, 6)],
        ["regime (pipe)", regime]
      ]);
    }

    function draw_fig_reynolds() {
const el = document.getElementById("fig-reynolds");
const note = document.getElementById("fig-reynolds-note");
if (!el || !window.fig) return;
const scratch = document.createElement("div");
scratch.id = "fig-reynolds-scratch";
const out = fig.sweep(scratch, {
  input: "vel", min: 0.1, max: 200, steps: 64, solve: "solve_re",
  outputs: [{ match: "reynolds number", name: "re" }]
});
const pts = [];
out.rows.forEach(function (r) { if (r && isFinite(r.vals.re)) pts.push([r.x, r.vals.re]); });
if (!pts.length) { if (note) note.textContent = "fill rho, V, and L to draw the Reynolds curve."; return; }
let lo = Infinity, hi = -Infinity;
pts.forEach(function (p) { lo = Math.min(lo, p[1]); hi = Math.max(hi, p[1]); });
const vNow = val("vel");
let near = null, nd = Infinity;
out.rows.forEach(function (r) { if (!r) return; const d = Math.abs(r.x - vNow); if (d < nd) { nd = d; near = r; } });
const mark = near && isFinite(near.vals.re) ? { x: near.x, y: near.vals.re, label: "V = " + fig.num_fmt(vNow) + " m/s" } : null;
fig.plot(el, {
  width: 560, height: 320,
  x: { label: "velocity", unit: "m/s", min: 0.1, max: 200 },
  y: { label: "reynolds number", unit: "", min: Math.max(lo * 0.8, 1), max: hi * 1.3, log: true },
  series: [{ pts: pts, cls: "fig-line", label: "Re" }],
  hlines: [{ y: 2300, label: "transitional 2300" }, { y: 4000, label: "turbulent 4000" }],
  marker: mark,
  driver: true,
  on_drag: function (x) {
    const e = document.getElementById("vel");
    if (!e) return;
    e.value = String(Math.max(0.1, Math.min(200, x)));
    try { solve_re(); } catch (err) {}
    draw_fig_reynolds();
  }
});
if (note) {
  const mu = val("mu") || 1.789e-5;
  note.textContent = "Re = rho V L / mu is linear in V for fixed L and mu; here L = " +
    fig.num_fmt(val("len")) + " m and mu = " + fig.num_fmt(mu) + " Pa s, so the curve is a straight line.";
}
    }

    fig.auto_draw(function () { draw_fig_reynolds(); });
