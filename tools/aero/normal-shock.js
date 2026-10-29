
    function solve_shock() {
      const err = document.getElementById("err");
      err.textContent = "";

      const m1 = val("m1"), g = val("gamma") || 1.4;
      if (m1 === null) { err.textContent = "enter upstream mach"; return; }
      if (m1 <= 1) { err.textContent = "a shock needs supersonic flow, M1 > 1"; return; }
      if (g <= 1) { err.textContent = "gamma must be greater than 1"; return; }

      const m2sq = (1 + (g - 1) / 2 * m1 * m1) / (g * m1 * m1 - (g - 1) / 2);
      const m2 = Math.sqrt(m2sq);
      const p2p1 = 1 + 2 * g / (g + 1) * (m1 * m1 - 1);
      const r2r1 = ((g + 1) * m1 * m1) / ((g - 1) * m1 * m1 + 2);
      const t2t1 = p2p1 / r2r1;

      render_lines("lines", [
        ["downstream mach M2", fmt(m2, 6)],
        ["pressure ratio P2 / P1", fmt(p2p1, 6)],
        ["density ratio &rho;2 / &rho;1", fmt(r2r1, 6)],
        ["temperature ratio T2 / T1", fmt(t2t1, 6)]
      ]);
    }

    function draw_fig_normalshock() {
const el = document.getElementById("fig-normalshock");
const note = document.getElementById("fig-normalshock-note");
if (!el || !window.fig) return;
const seed = function (id, v) { const e = document.getElementById(id); if (e && e.value.trim() === "") e.value = v; };
seed("m1", 2);
const scratch = document.createElement("div");
scratch.id = "fig-normalshock-scratch";
const out = fig.sweep(scratch, {
  input: "m1", min: 1.01, max: 15, steps: 72, solve: "solve_shock",
  outputs: [
    { match: "pressure ratio", name: "pr" },
    { match: "temperature ratio", name: "tr" },
    { match: "downstream mach", name: "m2" }
  ]
});
const prPts = [], trPts = [], m2Pts = [];
out.rows.forEach(function (r) {
  if (!r) return;
  if (isFinite(r.vals.pr)) prPts.push([r.x, r.vals.pr]);
  if (isFinite(r.vals.tr)) trPts.push([r.x, r.vals.tr]);
  if (isFinite(r.vals.m2)) m2Pts.push([r.x, r.vals.m2]);
});
if (!prPts.length) { if (note) note.textContent = "enter an upstream mach number above 1 to draw the shock ratios."; return; }
const mNow = val("m1");
let near = null, nd = Infinity;
out.rows.forEach(function (r) { if (!r) return; const d = Math.abs(r.x - mNow); if (d < nd) { nd = d; near = r; } });
const mark = near && isFinite(near.vals.pr) ? { x: near.x, y: near.vals.pr, label: "M1 = " + fig.num_fmt(mNow) } : null;
fig.plot(el, {
  width: 560, height: 320,
  x: { label: "upstream mach", unit: "M1", min: 1.01, max: 15 },
  y: { label: "shock jump ratios", unit: "P2/P1 and T2/T1" },
  y2: { label: "downstream mach", unit: "M2", min: 0, max: 1.05 },
  series: [
    { pts: prPts, cls: "fig-line", label: "P2 / P1" },
    { pts: trPts, cls: "fig-third", label: "T2 / T1" },
    { pts: m2Pts, axis: "y2", cls: "fig-alt", label: "M2" }
  ],
  marker: mark,
  driver: true,
  on_drag: function (x) {
    const e = document.getElementById("m1");
    if (!e) return;
    e.value = String(Math.max(1.01, Math.min(15, x)));
    try { solve_shock(); } catch (err) {}
    draw_fig_normalshock();
  }
});
if (note) {
  note.textContent = "a normal shock trades upstream kinetic energy for pressure and temperature; the downstream mach falls back toward 1 as M1 grows.";
}
    }

    fig.auto_draw(function () { draw_fig_normalshock(); });
