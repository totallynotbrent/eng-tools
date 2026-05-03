const fs = require("fs");
const vm = require("vm");
const path = require("path");

const ROOT = path.join(__dirname, "..");

function make_element() {
  const el = { value: "", textContent: "", innerHTML: "", style: {} };
  el.addEventListener = () => {};
  return el;
}

function make_document() {
  const store = {};
  const doc = {
    getElementById(id) {
      if (!store[id]) store[id] = make_element();
      return store[id];
    },
    querySelectorAll() { return []; },
  };
  doc._store = store;
  return doc;
}

function extract_inline_scripts(html) {
  const re = /<script(?![^>]*src)(?:[^>]*)>([\s\S]*?)<\/script>/g;
  const out = [];
  let m;
  while ((m = re.exec(html)) !== null) out.push(m[1]);
  return out;
}

function load_page(file) {
  const html = fs.readFileSync(path.join(ROOT, file), "utf8");
  const doc = make_document();
  const ctx = { document: doc, Math, parseFloat, isFinite, console, Number, isNaN };
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(ROOT, "js/common.js"), "utf8"), ctx);
  if (file === "tools/thermo/steam-tables.html") {
    vm.runInContext(fs.readFileSync(path.join(ROOT, "tools/thermo/steam-data.js"), "utf8"), ctx);
  }
  for (const s of extract_inline_scripts(html)) vm.runInContext(s, ctx);
  return { ctx, doc };
}

function set(doc, id, v) { doc.getElementById(id).value = String(v); }

function numbers_from(doc, id) {
  const h = doc.getElementById(id).innerHTML;
  return (h.match(/-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/g) || []).map(parseFloat);
}

function has_num(nums, expected, tol) {
  tol = tol || 0.002;
  for (const n of nums) {
    if (isFinite(n) && Math.abs(n - expected) <= tol * Math.max(1, Math.abs(expected))) return true;
  }
  return false;
}

let fails = 0;
function check(name, cond, extra) {
  console.log((cond ? "PASS " : "FAIL ") + name + (cond ? "" : (extra ? "  [" + extra + "]" : "")));
  if (!cond) fails++;
}

// --- thermodynamics ---
{
  const { ctx, doc } = load_page("tools/thermo/ideal-gas.html");
  set(doc, "p", 100); set(doc, "p_unit", "kpa");
  set(doc, "vol", 2); set(doc, "mass", ""); set(doc, "temp", 300); set(doc, "t_unit", "k");
  set(doc, "gas", "0.287");
  ctx.solve();
  check("ideal gas: m = pV/RT = 2.3229 kg", has_num(numbers_from(doc, "lines"), 2.3229), "err=" + doc.getElementById("err").textContent);
}
{
  const { ctx, doc } = load_page("tools/thermo/steam-tables.html");
  set(doc, "sat_t", 100); set(doc, "sat_t_x", "");
  ctx.sat_temp();
  let nums = numbers_from(doc, "lines");
  check("sat T=100C psat 101.42", has_num(nums, 101.42, 0.01));
  check("sat T=100C hf 419.1", has_num(nums, 419.1, 0.01));
  check("sat T=100C vf 0.001043", has_num(nums, 0.001043, 0.01));
  set(doc, "sat_t_x", 0.4);
  ctx.sat_temp();
  check("quality x=0.4 h ~1321.7", has_num(numbers_from(doc, "lines"), 1321.7, 0.005));
  set(doc, "sup_p", 0.1); set(doc, "sup_t", 200);
  ctx.superheat();
  nums = numbers_from(doc, "lines");
  check("superheated 0.1MPa 200C v 2.172", has_num(nums, 2.172, 0.005));
  check("superheated 0.1MPa 200C h 2875.5", has_num(nums, 2875.5, 0.005));
}
{
  const { ctx, doc } = load_page("tools/thermo/energy-balance.html");
  set(doc, "m", 2); set(doc, "emode", "u");
  set(doc, "u1", 200); set(doc, "u2", 250);
  set(doc, "q", ""); set(doc, "w", 30);
  ctx.solve_closed();
  let nums = numbers_from(doc, "lines");
  check("closed du=100", has_num(nums, 100, 0.01));
  check("closed Q=130", has_num(nums, 130, 0.01));
}
{
  const { ctx, doc } = load_page("tools/thermo/entropy.html");
  set(doc, "cp", 1.005); set(doc, "rg", 0.287);
  set(doc, "t1", 300); set(doc, "t2", 600); set(doc, "t_unit", "k");
  set(doc, "p1", 100); set(doc, "p2", 200);
  ctx.solve_ds();
  check("ideal gas ds 0.4977", has_num(numbers_from(doc, "lines"), 0.4977, 0.005));
  set(doc, "k", 1.4); set(doc, "it1", 300); set(doc, "it2", ""); set(doc, "it_unit", "k");
  set(doc, "ip1", 100); set(doc, "ip2", 500);
  ctx.solve_isen();
  check("isentropic T2 475.15", has_num(numbers_from(doc, "lines"), 475.15, 0.01));
}
{
  const { ctx, doc } = load_page("tools/thermo/cycles.html");
  set(doc, "th", 500); set(doc, "tl", 300); set(doc, "ct_unit", "k");
  ctx.solve_carnot();
  check("carnot 40%", has_num(numbers_from(doc, "lines"), 40, 0.01));
  set(doc, "or", 8); set(doc, "ok", 1.4);
  ctx.solve_otto();
  check("otto r=8 56.47%", has_num(numbers_from(doc, "lines"), 56.47, 0.03));
  set(doc, "brp", 8); set(doc, "bk", 1.4);
  ctx.solve_brayton();
  check("brayton rp=8 44.79%", has_num(numbers_from(doc, "lines"), 44.79, 0.05));
}

// --- statics ---
{
  const { ctx, doc } = load_page("tools/statics/reaction-forces.html");
  set(doc, "len", 10); set(doc, "p1", 20); set(doc, "x1", 5);
  ctx.solve_reactions();
  let nums = numbers_from(doc, "lines");
  check("reactions Ay=10 By=10", has_num(nums, 10, 0.01) && has_num(nums, 20, 0.01), nums.join(","));
  set(doc, "p1", ""); set(doc, "x1", ""); set(doc, "udl", 4);
  ctx.solve_reactions();
  nums = numbers_from(doc, "lines");
  check("reactions udl total=40", has_num(nums, 40, 0.01), nums.join(","));
}
{
  const { ctx, doc } = load_page("tools/statics/truss.html");
  set(doc, "nodes", "0 0 pin\n4 0 roller\n2 3");
  set(doc, "members", "1 2\n1 3\n2 3");
  set(doc, "loads", "3 0 -10");
  ctx.solve_truss();
  const nums = numbers_from(doc, "lines");
  check("truss diagonal tension ~6.01", has_num(nums, 6.01, 0.02), doc.getElementById("err").textContent + " | " + nums.join(","));
  check("truss bottom compression ~-3.33", has_num(nums, -3.33, 0.02), nums.join(","));
  check("truss reaction ~5", has_num(nums, 5, 0.02), nums.join(","));
}
{
  const { ctx, doc } = load_page("tools/statics/centroid.html");
  set(doc, "type1", "rect"); set(doc, "d1a", 2); set(doc, "d1b", 1); set(doc, "cx1", 0.5); set(doc, "cy1", 0.5);
  set(doc, "type2", "rect"); set(doc, "d2a", 2); set(doc, "d2b", 1); set(doc, "cx2", 2.5); set(doc, "cy2", 0.5);
  ctx.solve_centroid();
  const nums = numbers_from(doc, "lines");
  check("centroid area=4", has_num(nums, 4, 0.01), doc.getElementById("err").textContent + " | " + nums.join(","));
  check("centroid x=1.5", has_num(nums, 1.5, 0.01), nums.join(","));
  check("centroid Iyy=5.333", has_num(nums, 5.333, 0.01), nums.join(","));
}

// --- math ---
{
  const { ctx, doc } = load_page("tools/math/vectors.html");
  set(doc, "ax", 2); set(doc, "ay", -1); set(doc, "az", 3);
  set(doc, "bx", 1); set(doc, "by", 4); set(doc, "bz", -2);
  ctx.solve_vec();
  const nums = numbers_from(doc, "lines");
  check("vector dot = -8", has_num(nums, -8, 0.02), nums.join(","));
  check("vector cross mag 15.166", has_num(nums, 15.166, 0.01), nums.join(","));
  check("vector angle 117.8", has_num(nums, 117.8, 0.05), nums.join(","));
}

// --- physics ---
{
  const { ctx, doc } = load_page("tools/physics/resistors.html");
  set(doc, "values", "10, 20, 30"); set(doc, "elem", "r"); set(doc, "conn", "series");
  ctx.solve_equiv();
  check("resistors series 60", has_num(numbers_from(doc, "lines"), 60, 0.01));
  set(doc, "conn", "parallel");
  ctx.solve_equiv();
  check("resistors parallel 5.455", has_num(numbers_from(doc, "lines"), 5.455, 0.01));
}
{
  const { ctx, doc } = load_page("tools/physics/ohms-law.html");
  set(doc, "volt", 12); set(doc, "curr", 2); set(doc, "res", "");
  ctx.solve_ohm();
  let nums = numbers_from(doc, "lines");
  check("ohm R=6", has_num(nums, 6, 0.01));
  check("ohm P=24", has_num(nums, 24, 0.01));
}
{
  const { ctx, doc } = load_page("tools/physics/rc.html");
  set(doc, "res", 1000); set(doc, "cap", 0.001); set(doc, "v0", 10); set(doc, "tt", 1);
  ctx.solve_rc();
  const nums = numbers_from(doc, "lines");
  check("rc tau=1", has_num(nums, 1, 0.01), nums.join(","));
  check("rc charge 6.321", has_num(nums, 6.321, 0.01), nums.join(","));
  check("rc discharge 3.679", has_num(nums, 3.679, 0.01), nums.join(","));
}

// --- solid mechanics ---
{
  const { ctx, doc } = load_page("tools/solids/stress-strain.html");
  set(doc, "stress", 2e8); set(doc, "strain", 0.001);
  ctx.solve_hooke();
  check("hooke E = sigma/epsilon = 2e11", has_num(numbers_from(doc, "lines"), 2e11), doc.getElementById("err").textContent);
}
{
  const { ctx, doc } = load_page("tools/solids/mohr-circle.html");
  set(doc, "sx", 100); set(doc, "sy", 20); set(doc, "txy", 30);
  ctx.solve_mohr();
  const nums = numbers_from(doc, "lines");
  check("mohr sigma1 110", has_num(nums, 110, 0.01), nums.join(","));
  check("mohr tau max 50", has_num(nums, 50, 0.01), nums.join(","));
  check("mohr theta 18.435", has_num(nums, 18.435, 0.02), nums.join(","));
}
{
  const { ctx, doc } = load_page("tools/solids/torsion.html");
  set(doc, "torque", 100); set(doc, "length", 2); set(doc, "shear", 8e10); set(doc, "radius", 0.05);
  ctx.solve_torsion();
  const nums = numbers_from(doc, "lines");
  check("torsion J 9.817e-6", has_num(nums, 9.817e-6, 0.01), nums.join(","));
  check("torsion tau max 5.09e5", has_num(nums, 5.09e5, 0.01), nums.join(","));
}
{
  const { ctx, doc } = load_page("tools/solids/axial-thermal.html");
  set(doc, "load", 10000); set(doc, "length", 2); set(doc, "area", 0.001); set(doc, "modulus", 2e11);
  set(doc, "alpha", 12e-6); set(doc, "dt", 100);
  ctx.solve_axial();
  const nums = numbers_from(doc, "lines");
  check("axial total 2.5e-3", has_num(nums, 2.5e-3, 0.01), nums.join(","));
  check("axial sigma 1e7", has_num(nums, 1e7, 0.01), nums.join(","));
}

// --- dynamics ---
{
  const { ctx, doc } = load_page("tools/dynamics/projectile.html");
  set(doc, "v0", 20); set(doc, "angle", 45); set(doc, "h0", 0); set(doc, "grav", 9.81);
  ctx.solve_proj();
  const nums = numbers_from(doc, "lines");
  check("projectile range 40.77", has_num(nums, 40.77, 0.01), nums.join(","));
  check("projectile max h 10.19", has_num(nums, 10.19, 0.01), nums.join(","));
}
{
  const { ctx, doc } = load_page("tools/dynamics/rotation.html");
  set(doc, "alpha", 2); set(doc, "tt", 3); set(doc, "rpm", 60);
  ctx.solve_rot();
  const nums = numbers_from(doc, "lines");
  check("rotation final omega 6", has_num(nums, 6, 0.002), nums.join(","));
  check("rotation rpm rad/s 6.283", has_num(nums, 6.283, 0.01), nums.join(","));
}
{
  const { ctx, doc } = load_page("tools/dynamics/impulse-momentum.html");
  set(doc, "mass", 2); set(doc, "vi", 3); set(doc, "vf", 7);
  ctx.solve_impulse();
  check("impulse dp 8", has_num(numbers_from(doc, "lines"), 8, 0.01));
}
{
  const { ctx, doc } = load_page("tools/dynamics/relative-velocity.html");
  set(doc, "va", 10); set(doc, "aa", 0); set(doc, "vb", 5); set(doc, "ab", 180);
  ctx.solve_relv();
  check("relative vA/B magnitude 15", has_num(numbers_from(doc, "lines"), 15, 0.01));
}

// --- aerodynamics ---
{
  const { ctx, doc } = load_page("tools/aero/standard-atmosphere.html");
  set(doc, "alt", 11000);
  ctx.solve_isa();
  const nums = numbers_from(doc, "lines");
  check("isa T 216.65", has_num(nums, 216.65, 0.01), nums.join(","));
  check("isa p 22632", has_num(nums, 22632, 0.01), nums.join(","));
  check("isa rho 0.3639", has_num(nums, 0.3639, 0.01), nums.join(","));
  check("isa a 295.07", has_num(nums, 295.07, 0.01), nums.join(","));
}
{
  const { ctx, doc } = load_page("tools/aero/lift-drag.html");
  set(doc, "rho", 1.225); set(doc, "vel", 50); set(doc, "area", 5); set(doc, "cl", 0.5);
  set(doc, "cd0", 0.02); set(doc, "k", 0.05);
  ctx.solve_ld();
  const nums = numbers_from(doc, "lines");
  check("lift 3828", has_num(nums, 3828, 0.01), nums.join(","));
  check("drag 248.8", has_num(nums, 248.8, 0.01), nums.join(","));
  check("l/d 15.38", has_num(nums, 15.38, 0.02), nums.join(","));
}
{
  const { ctx, doc } = load_page("tools/aero/range-endurance.html");
  set(doc, "mode", "jet");
  set(doc, "vel", 200); set(doc, "ld", 15); set(doc, "w0", 10000); set(doc, "w1", 8000); set(doc, "sfc", 3e-4);
  ctx.solve_range();
  const nums = numbers_from(doc, "lines");
  check("range 2.231e6", has_num(nums, 2.231e6, 0.01), nums.join(","));
  check("block time 11157", has_num(nums, 11157, 0.01), nums.join(","));
}

// --- math (ode) ---
{
  const { ctx, doc } = load_page("tools/math/ode.html");
  set(doc, "coef", 1); set(doc, "const", 0); set(doc, "y0", 1); set(doc, "t0", 0); set(doc, "tf", 1); set(doc, "steps", 10);
  ctx.solve_ode();
  const nums = numbers_from(doc, "lines");
  check("ode exact 2.71828", has_num(nums, 2.71828, 0.002), nums.join(","));
  check("ode euler 2.5937", has_num(nums, 2.5937, 0.01), nums.join(","));
}

// --- space mechanics ---
{
  const { ctx, doc } = load_page("tools/space/orbital-elements.html");
  set(doc, "r", 6.678e6); set(doc, "v", 7726); set(doc, "gamma", 0);
  ctx.solve_elements();
  const nums = numbers_from(doc, "lines");
  check("orbital a ~6.678e6", has_num(nums, 6.678e6, 0.005), nums.join(","));
  check("orbital period ~5431", has_num(nums, 5431, 0.01), nums.join(","));
}
{
  const { ctx, doc } = load_page("tools/space/vis-viva.html");
  set(doc, "r", 6.678e6); set(doc, "a", 6.678e6);
  ctx.solve_visviva();
  check("vis-viva circular v 7726", has_num(numbers_from(doc, "lines"), 7726, 0.005));
}
{
  const { ctx, doc } = load_page("tools/space/hohmann.html");
  set(doc, "r1", 6.678e6); set(doc, "r2", 42.164e6);
  ctx.solve_hohmann();
  const nums = numbers_from(doc, "lines");
  check("hohmann total dv ~3892", has_num(nums, 3892, 0.01), nums.join(","));
  check("hohmann time ~5.3h", has_num(nums, 5.275, 0.02), nums.join(","));
}
{
  const { ctx, doc } = load_page("tools/space/kepler.html");
  set(doc, "a", 6.678e6); set(doc, "t", "");
  ctx.solve_kepler();
  check("kepler T ~5431", has_num(numbers_from(doc, "lines"), 5431, 0.01));
}

// --- compressible aero ---
{
  const { ctx, doc } = load_page("tools/aero/isentropic.html");
  set(doc, "mach", 2);
  ctx.solve_isen();
  const nums = numbers_from(doc, "lines");
  check("isen T/T0 0.5556", has_num(nums, 0.5556, 0.01), nums.join(","));
  check("isen P/P0 0.1278", has_num(nums, 0.1278, 0.01), nums.join(","));
  check("isen A/A* 1.6875", has_num(nums, 1.6875, 0.01), nums.join(","));
}
{
  const { ctx, doc } = load_page("tools/aero/normal-shock.html");
  set(doc, "m1", 2);
  ctx.solve_shock();
  const nums = numbers_from(doc, "lines");
  check("shock M2 0.5774", has_num(nums, 0.5774, 0.01), nums.join(","));
  check("shock P2/P1 4.5", has_num(nums, 4.5, 0.01), nums.join(","));
  check("shock rho2/rho1 2.667", has_num(nums, 2.667, 0.01), nums.join(","));
}
{
  const { ctx, doc } = load_page("tools/aero/reynolds.html");
  set(doc, "rho", 1.225); set(doc, "vel", 50); set(doc, "len", 1);
  ctx.solve_re();
  check("reynolds 3.424e6", has_num(numbers_from(doc, "lines"), 3.424e6, 0.005));
}

// --- linear algebra ---
{
  const { ctx, doc } = load_page("tools/linalg/matrix.html");
  set(doc, "size", "2"); set(doc, "a11", 1); set(doc, "a12", 2); set(doc, "a21", 3); set(doc, "a22", 4);
  ctx.solve_mat();
  const nums = numbers_from(doc, "lines");
  check("matrix det -2", has_num(nums, -2, 0.01), nums.join(","));
  check("matrix inverse 1.5", has_num(nums, 1.5, 0.01), nums.join(","));
}
{
  const { ctx, doc } = load_page("tools/linalg/eigenvalues.html");
  set(doc, "a11", 2); set(doc, "a12", 1); set(doc, "a21", 1); set(doc, "a22", 2);
  ctx.solve_eig();
  const nums = numbers_from(doc, "lines");
  check("eig lambda 3 and 1", has_num(nums, 3, 0.01) && has_num(nums, 1, 0.01), nums.join(","));
}
{
  const { ctx, doc } = load_page("tools/linalg/linear-solver.html");
  set(doc, "size", "2");
  set(doc, "a11", 2); set(doc, "a12", 1); set(doc, "a21", 1); set(doc, "a22", 3);
  set(doc, "b1", 5); set(doc, "b2", 10);
  ctx.solve_ls();
  const nums = numbers_from(doc, "lines");
  check("solver x = 1, 3", has_num(nums, 1, 0.01) && has_num(nums, 3, 0.01), nums.join(","));
}

// --- 2026 spring: spacecraft systems, control, instrumentation ---
{
  const { ctx, doc } = load_page("tools/space/rocket-equation.html");
  set(doc, "ve", 3000); set(doc, "m0", 1000); set(doc, "mf", 200);
  ctx.solve_rocket();
  const nums = numbers_from(doc, "lines");
  check("rocket mass ratio 5", has_num(nums, 5, 0.01), nums.join(","));
  check("rocket dv 4828", has_num(nums, 4828, 0.01), nums.join(","));
}
{
  const { ctx, doc } = load_page("tools/space/nozzle.html");
  set(doc, "pc", 100); set(doc, "pe", 1);
  ctx.solve_nozzle();
  const nums = numbers_from(doc, "lines");
  check("nozzle pressure ratio 100", has_num(nums, 100, 0.01), nums.join(","));
  check("nozzle Me 3.40", has_num(nums, 3.3977, 0.01), nums.join(","));
  check("nozzle area ratio 11.87", has_num(nums, 11.871, 0.01), nums.join(","));
}
{
  const { ctx, doc } = load_page("tools/space/solar-array.html");
  set(doc, "p0", 100); set(doc, "deg", 0.028); set(doc, "years", 10);
  ctx.solve_solar();
  const nums = numbers_from(doc, "lines");
  check("solar peol ~75.3", has_num(nums, 75.3, 0.01), nums.join(","));
}
{
  const { ctx, doc } = load_page("tools/space/link-budget.html");
  set(doc, "pt", 10); set(doc, "gt", 100); set(doc, "gr", 100);
  set(doc, "dist", 1000e3); set(doc, "freq", 10e9);
  ctx.solve_link();
  const nums = numbers_from(doc, "lines");
  check("link lambda 0.03", has_num(nums, 0.03, 0.01), nums.join(","));
  check("link pr dbm -92.5", has_num(nums, -92.45, 0.3), nums.join(","));
}
{
  const { ctx, doc } = load_page("tools/space/quaternion.html");
  set(doc, "roll", 0); set(doc, "pitch", 0); set(doc, "yaw", 90);
  ctx.euler_to_quat();
  const nums = numbers_from(doc, "lines");
  check("quat yaw90 w 0.707", has_num(nums, 0.707, 0.01), nums.join(","));
  check("quat yaw90 z 0.707", has_num(nums, 0.707, 0.01), nums.join(","));
}
{
  const { ctx, doc } = load_page("tools/space/inertia.html");
  set(doc, "i11", 10); set(doc, "i12", 0); set(doc, "i13", 0);
  set(doc, "i21", 0); set(doc, "i22", 20); set(doc, "i23", 0);
  set(doc, "i31", 0); set(doc, "i32", 0); set(doc, "i33", 30);
  ctx.solve_inertia();
  const nums = numbers_from(doc, "lines");
  check("inertia principal 10,20,30", has_num(nums, 10, 0.01) && has_num(nums, 20, 0.01) && has_num(nums, 30, 0.01), nums.join(","));
}
{
  const { ctx, doc } = load_page("tools/control/pid.html");
  set(doc, "ku", 10); set(doc, "tu", 2);
  ctx.solve_pid();
  const nums = numbers_from(doc, "lines");
  check("pid Kp 6", has_num(nums, 6, 0.01), nums.join(","));
  check("pid Td 0.25", has_num(nums, 0.25, 0.01), nums.join(","));
}
{
  const { ctx, doc } = load_page("tools/control/second-order.html");
  set(doc, "zeta", 0.5); set(doc, "wn", 2);
  ctx.solve_second();
  const nums = numbers_from(doc, "lines");
  check("second order overshoot 16.3%", has_num(nums, 16.3, 0.2), nums.join(","));
  check("second order ts 4", has_num(nums, 4, 0.01), nums.join(","));
}
{
  const { ctx, doc } = load_page("tools/instr/strain-gauge.html");
  set(doc, "config", "quarter"); set(doc, "gf", 2); set(doc, "ratio", 0.005); set(doc, "e_mod", 2e11);
  ctx.solve_gauge();
  const nums = numbers_from(doc, "lines");
  check("gauge strain 0.01", has_num(nums, 0.01, 0.01), nums.join(","));
  check("gauge stress 2e9", has_num(nums, 2e9, 0.01), nums.join(","));
}
{
  const { ctx, doc } = load_page("tools/physics/kirchhoff.html");
  // two nodes tied to ground through resistors: node1 via 10, node2 via 10, link 1-2 via 10;
  // with no source the only solution is all zero (grounded reference), which the solver returns
  set(doc, "nodes", "1\n2");
  set(doc, "resistors", "1 0 10\n2 0 10\n1 2 10");
  ctx.solve_kirchhoff();
  check("kirchhoff runs without error", doc.getElementById("err").textContent === "", doc.getElementById("err").textContent);
  const nums = numbers_from(doc, "lines");
  check("kirchhoff both nodes 0 V", has_num(nums, 0, 0.001), nums.join(","));
}

// --- 2024 fall compressible aero (oblique shock + prandtl-meyer) ---
{
  const { ctx, doc } = load_page("tools/aero/oblique-shock.html");
  set(doc, "m1", 2.5); set(doc, "theta", 15);
  ctx.solve_oblique();
  const nums = numbers_from(doc, "lines");
  // obl shock M1=2.5 theta=15 -> beta ~36.95, M2 ~1.87, p2/p1 ~1.86
  check("obliq beta ~37", has_num(nums, 37, 0.03), nums.join(","));
  check("obliq M2 ~1.87", has_num(nums, 1.87, 0.02), nums.join(","));
}
{
  const { ctx, doc } = load_page("tools/aero/prandtl-meyer.html");
  set(doc, "m1", 2); set(doc, "theta", 10);
  ctx.solve_pm();
  const nums = numbers_from(doc, "lines");
  check("pm nu1 26.38", has_num(nums, 26.38, 0.05), nums.join(","));
  check("pm M2 ~2.38", has_num(nums, 2.38, 0.02), nums.join(","));
}

// --- 2025 fall structures ---
{
  const { ctx, doc } = load_page("tools/structures/stress-concentration.html");
  set(doc, "snom", 100e6); set(doc, "kt", 2.5);
  ctx.solve_kt();
  check("kt sigma max 250e6", has_num(numbers_from(doc, "lines"), 2.5e8, 0.001));
}
{
  const { ctx, doc } = load_page("tools/structures/euler-buckling.html");
  set(doc, "e_mod", 2e11); set(doc, "inertia", 1e-6); set(doc, "len", 2); set(doc, "ends", "1");
  ctx.solve_buckling();
  check("buckling pcr 493480", has_num(numbers_from(doc, "lines"), 493480, 0.01));
}
{
  const { ctx, doc } = load_page("tools/structures/beam-shear-moment.html");
  set(doc, "len", 10); set(doc, "point", "20 5"); set(doc, "xs", "5");
  ctx.solve_beam();
  const nums = numbers_from(doc, "lines");
  check("beam reactions Ra=Rb=10", has_num(nums, 10, 0.01), nums.join(","));
  check("beam M at center 50", has_num(nums, 50, 0.01), nums.join(","));
}

// --- 2026 spring thrust coefficient ---
{
  const { ctx, doc } = load_page("tools/space/thrust-coefficient.html");
  set(doc, "pc", 100); set(doc, "pe", 1); set(doc, "pa", 0);
  set(doc, "t0", 3500); set(doc, "rg", 375); set(doc, "gamma", 1.2);
  ctx.solve_cf();
  const nums = numbers_from(doc, "lines");
  check("cf ~1.76", has_num(nums, 1.763, 0.01), nums.join(","));
  check("cstar ~1935", has_num(nums, 1935, 0.05), nums.join(","));
}

console.log(fails === 0 ? "\nALL PASS" : "\n" + fails + " FAILURES");
process.exit(fails === 0 ? 0 : 1);