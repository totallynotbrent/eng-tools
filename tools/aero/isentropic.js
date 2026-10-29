
    function solve_isen() {
      const err = document.getElementById("err");
      err.textContent = "";

      const m = val("mach"), g = val("gamma") || 1.4;
      if (m === null) { err.textContent = "enter a mach number"; return; }
      if (m < 0) { err.textContent = "mach must be non-negative"; return; }
      if (g <= 1) { err.textContent = "gamma must be greater than 1"; return; }

      const t0t = 1 + (g - 1) / 2 * m * m;
      const p0p = Math.pow(t0t, g / (g - 1));
      const r0r = Math.pow(t0t, 1 / (g - 1));
      const aa = (1 / m) * Math.pow((2 / (g + 1)) * (1 + (g - 1) / 2 * m * m), (g + 1) / (2 * (g - 1)));

      render_lines("lines", [
        ["T / T0", fmt(1 / t0t, 6)],
        ["P / P0", fmt(1 / p0p, 6)],
        ["&rho; / &rho;0", fmt(1 / r0r, 6)],
        ["A / A*", fmt(aa, 6)]
      ]);
    }

    function draw_fig_isentropic() {
const el = document.getElementById("fig-isentropic");
const note = document.getElementById("fig-isentropic-note");
if (!el || !window.fig) return;
const scratch = document.createElement("div");
scratch.id = "fig-isentropic-scratch";
const out = fig.sweep(scratch, {
  input: "mach", min: 0.3, max: 20, steps: 72, solve: "solve_isen",
  outputs: [{ match: "A / A", name: "aa" }, { match: "T / T", name: "tt" }]
});
const aaPts = [], ttPts = [];
out.rows.forEach(function (r) {
  if (!r) return;
  if (isFinite(r.vals.aa)) aaPts.push([r.x, r.vals.aa]);
  if (isFinite(r.vals.tt)) ttPts.push([r.x, r.vals.tt]);
});
if (!aaPts.length) { if (note) note.textContent = "enter a mach number to draw the stagnation ratios."; return; }
let alo = Infinity, ahi = -Infinity;
aaPts.forEach(function (p) { alo = Math.min(alo, p[1]); ahi = Math.max(ahi, p[1]); });
const mNow = val("mach");
let near = null, nd = Infinity;
out.rows.forEach(function (r) { if (!r) return; const d = Math.abs(r.x - mNow); if (d < nd) { nd = d; near = r; } });
const mark = near && isFinite(near.vals.aa) ? { x: near.x, y: near.vals.aa, label: "M = " + fig.num_fmt(mNow) } : null;
fig.plot(el, {
  width: 560, height: 320,
  x: { label: "mach number", unit: "M", min: 0.3, max: 20 },
  y: { label: "area ratio", unit: "A / A*", min: Math.max(alo * 0.85, 0.5), max: ahi * 1.4, log: true },
  y2: { label: "temperature ratio", unit: "T / T0", min: 0, max: 1.05 },
  series: [
    { pts: aaPts, cls: "fig-line", label: "A / A*" },
    { pts: ttPts, axis: "y2", cls: "fig-third", label: "T / T0" }
  ],
  vlines: [{ x: 1, label: "sonic" }],
  marker: mark,
  driver: true,
  on_drag: function (x) {
    const e = document.getElementById("mach");
    if (!e) return;
    e.value = String(Math.max(0.3, Math.min(20, x)));
    try { solve_isen(); } catch (err) {}
    draw_fig_isentropic();
  }
});
if (note) {
  note.textContent = "A / A* dips to 1 at M = 1 and climbs away on both sides; T / T0 falls monotonically with speed.";
}
    }

    fig.auto_draw(function () { draw_fig_isentropic(); });
