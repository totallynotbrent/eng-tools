
    function solve_ld() {
      const err = document.getElementById("err");
      err.textContent = "";

      const rho = val("rho"), v = val("vel"), s = val("area"), cl = val("cl");
      if (rho === null || v === null || s === null || cl === null) { err.textContent = "fill rho, V, S, and CL"; return; }
      if (rho < 0 || v < 0 || s <= 0) { err.textContent = "check rho, V, and S"; return; }

      const q = 0.5 * rho * v * v;
      const lift = q * s * cl;

      let cd = val("cd");
      let mode = "direct";
      if (cd === null) {
        const cd0 = val("cd0"), k = val("k");
        if (cd0 === null || k === null) { err.textContent = "give CD directly or both CD0 and k"; return; }
        cd = cd0 + k * cl * cl;
        mode = "polar";
      }
      const drag = q * s * cd;

      const lines = [
        ["dynamic pressure q", fmt(q, 6) + " Pa"],
        ["lift L", fmt(lift, 6) + " N"],
        ["drag D", fmt(drag, 6) + " N"],
        ["effective CD (" + mode + ")", fmt(cd, 6)],
        ["lift to drag L/D", fmt(lift / drag, 6)]
      ];

      render_lines("lines", lines);
    }

    function draw_fig_liftdrag() {
const el = document.getElementById("fig-liftdrag");
const note = document.getElementById("fig-liftdrag-note");
if (!el || !window.fig) return;
const seed = function (id, v) { const e = document.getElementById(id); if (e && e.value.trim() === "") e.value = v; };
seed("vel", 100); seed("area", 20); seed("cl", 0.5); seed("cd0", 0.02); seed("k", 0.05);
// park a direct cd so the sweep walks the polar instead
const cdEl = document.getElementById("cd");
const cdParked = cdEl.value;
cdEl.value = "";
const scratch = document.createElement("div");
scratch.id = "fig-liftdrag-scratch";
const out = fig.sweep(scratch, {
  input: "cl", min: -1, max: 2, steps: 64, solve: "solve_ld",
  outputs: [{ match: "effective CD", name: "cd" }, { match: "lift to drag L/D", name: "ld" }]
});
cdEl.value = cdParked;
try { solve_ld(); } catch (err) {}
const cdPts = [], ldPts = [];
const clNow = val("cl");
let near = null, nd = Infinity;
out.rows.forEach(function (r) {
  if (!r) return;
  if (isFinite(r.vals.cd)) cdPts.push([r.x, r.vals.cd]);
  if (isFinite(r.vals.ld)) ldPts.push([r.x, r.vals.ld]);
  const d = Math.abs(r.x - clNow);
  if (d < nd) { nd = d; near = r; }
});
const mark = near && isFinite(near.vals.cd) ? { x: near.x, y: near.vals.cd, label: "CL = " + fig.num_fmt(clNow) } : null;
fig.plot(el, {
  width: 560, height: 320,
  x: { label: "lift coefficient", unit: "CL", min: -1, max: 2 },
  y: { label: "drag coefficient", unit: "CD" },
  y2: { label: "lift to drag ratio", unit: "L/D" },
  series: [
    { pts: cdPts, cls: "fig-line", label: "CD (polar)" },
    { pts: ldPts, axis: "y2", cls: "fig-third", label: "L / D" }
  ],
  marker: mark,
  driver: true,
  on_drag: function (x) {
    const e = document.getElementById("cl");
    if (!e) return;
    e.value = String(Math.max(-1, Math.min(2, x)));
    try { solve_ld(); } catch (err2) {}
    draw_fig_liftdrag();
  }
});
let best = null;
ldPts.forEach(function (p) { if (!best || p[1] > best[1]) best = p; });
if (note && best) {
  note.textContent = "polar drag CD = CD0 + k CL^2; the best L/D is " + fig.num_fmt(best[1]) +
    " at CL = " + fig.num_fmt(best[0]) + ", and CL = " + fig.num_fmt(clNow) + " flies at CD = " +
    (mark ? fig.num_fmt(mark.y) : "n/a") + ".";
}
    }

    fig.auto_draw(function () { draw_fig_liftdrag(); });
