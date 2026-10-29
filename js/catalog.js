// single source for the tool catalogue.
// the sidebar (js/nav.js) and the index grid (js/catalog-view.js) both read this.
window.eng_catalog = [
  {
    name: "aerodynamics",
    items: [
      { path: "tools/aero/standard-atmosphere.html", label: "standard atmosphere", desc: "isa temperature, pressure, density, and speed of sound by altitude" },
      { path: "tools/aero/lift-drag.html", label: "lift and drag", desc: "dynamic pressure, lift, drag, and l/d" },
      { path: "tools/aero/range-endurance.html", label: "range and endurance", desc: "breguet range for jet or prop, plus block time" },
      { path: "tools/aero/reynolds.html", label: "reynolds number", desc: "Re from density, velocity, length, and viscosity" },
    ]
  },
  {
    name: "compressible flow",
    items: [
      { path: "tools/aero/isentropic.html", label: "isentropic flow", desc: "stagnation ratios and area ratio from mach" },
      { path: "tools/aero/normal-shock.html", label: "normal shock", desc: "downstream mach and property jumps" },
      { path: "tools/aero/oblique-shock.html", label: "oblique shock", desc: "wave angle and property ratios from mach and deflection" },
      { path: "tools/aero/prandtl-meyer.html", label: "prandtl-meyer expansion", desc: "exit mach through a centered expansion fan" },
    ]
  },
  {
    name: "propulsion",
    items: [
      { path: "tools/aero/ramjet.html", label: "ramjet cycle", desc: "shock recovery, burner, and nozzle down to net thrust" },
      { path: "tools/aero/turbojet.html", label: "turbojet cycle", desc: "ideal station analysis with specific thrust and tsfc" },
      { path: "tools/aero/turbofan.html", label: "turbofan cycle", desc: "separate-flow two-stream thrust, fan ratios, and efficiency split" },
      { path: "tools/aero/component-efficiency.html", label: "compressor and turbine efficiency", desc: "isentropic and polytropic efficiencies from measured states" },
      { path: "tools/space/nozzle.html", label: "nozzle flow", desc: "exit mach and area ratio from pressure ratio" },
      { path: "tools/space/thrust-coefficient.html", label: "thrust coefficient and c*", desc: "characteristic velocity and nozzle thrust coefficient" },
      { path: "tools/space/turbopump.html", label: "turbopump power balance", desc: "ideal pump and turbine power with implied efficiencies" },
      { path: "tools/space/inducer.html", label: "inducer design", desc: "npsh, tip diameter, speed, and blade angles" },
    ]
  },
  {
    name: "control systems",
    items: [
      { path: "tools/control/pid.html", label: "pid tuning", desc: "ziegler-nichols gains from ultimate gain and period" },
      { path: "tools/control/second-order.html", label: "second order response", desc: "percent overshoot and settling time" },
      { path: "tools/control/tf-response.html", label: "transfer function response", desc: "poles, dc gain, and steady-state errors" },
      { path: "tools/control/servo-design.html", label: "servo controller design", desc: "pv and pi gains from overshoot and peak-time specs" },
      { path: "tools/control/block-reduction.html", label: "block diagram reduction", desc: "series, parallel, and unity feedback to one transfer function" },
      { path: "tools/control/state-space.html", label: "state space analysis", desc: "eigenvalues, stability, and controllability" },
      { path: "tools/control/pole-placement.html", label: "pole placement", desc: "state feedback gain by ackermann's formula" },
    ]
  },
  {
    name: "dynamics",
    items: [
      { path: "tools/dynamics/projectile.html", label: "projectile motion", desc: "flight time, range, and max height" },
      { path: "tools/dynamics/rotation.html", label: "rotational motion", desc: "angular kinematics, torque, and rpm conversion" },
      { path: "tools/dynamics/impulse-momentum.html", label: "impulse and momentum", desc: "change in momentum and the impulse behind it" },
      { path: "tools/dynamics/relative-velocity.html", label: "relative velocity", desc: "velocity of one body as seen from another in 2d" },
    ]
  },
  {
    name: "instrumentation",
    items: [
      { path: "tools/instr/strain-gauge.html", label: "strain gauge", desc: "stress from a wheatstone bridge measurement" },
    ]
  },
  {
    name: "linear algebra",
    items: [
      { path: "tools/linalg/matrix.html", label: "matrix operations", desc: "determinant, inverse, and rref" },
      { path: "tools/linalg/eigenvalues.html", label: "eigenvalues and vectors", desc: "2x2 eigenvalues and eigenvectors" },
      { path: "tools/linalg/linear-solver.html", label: "linear system solver", desc: "solve Ax = b for 2x2 or 3x3" },
    ]
  },
  {
    name: "math",
    items: [
      { path: "tools/math/vectors.html", label: "vector operations", desc: "dot, cross, projections, and angles" },
      { path: "tools/math/ode.html", label: "differential equations", desc: "euler and rk4 for y' = ay + b" },
    ]
  },
  {
    name: "physics",
    items: [
      { path: "tools/physics/resistors.html", label: "resistors and capacitors", desc: "series and parallel equivalents" },
      { path: "tools/physics/ohms-law.html", label: "ohm's law and power", desc: "solve for the missing V, I, or R and get the power" },
      { path: "tools/physics/rc.html", label: "rc time constant", desc: "charge and discharge curves for an rc circuit" },
      { path: "tools/physics/kirchhoff.html", label: "kirchhoff solver", desc: "node voltages in a resistive circuit" },
    ]
  },
  {
    name: "solid mechanics",
    items: [
      { path: "tools/solids/stress-strain.html", label: "stress and strain", desc: "hooke's law and stress from a load" },
      { path: "tools/solids/mohr-circle.html", label: "mohr's circle", desc: "principal stresses and max shear" },
      { path: "tools/solids/torsion.html", label: "torsion", desc: "angle of twist and max shear in a circular shaft" },
      { path: "tools/solids/axial-thermal.html", label: "axial and thermal deformation", desc: "stretch from load and temperature change" },
    ]
  },
  {
    name: "space mechanics",
    items: [
      { path: "tools/space/orbital-elements.html", label: "orbital elements", desc: "orbit shape from radius, speed, and flight path angle" },
      { path: "tools/space/vis-viva.html", label: "vis-viva", desc: "orbital speed from radius and semi-major axis" },
      { path: "tools/space/hohmann.html", label: "hohmann transfer", desc: "delta-v and transfer time between circular orbits" },
      { path: "tools/space/kepler.html", label: "kepler's third law", desc: "period from semi-major axis, or the reverse" },
      { path: "tools/space/rocket-equation.html", label: "rocket equation", desc: "ideal delta-v from exhaust velocity and mass ratio" },
      { path: "tools/space/quaternion.html", label: "attitude conversions", desc: "quaternion to euler and back" },
      { path: "tools/space/inertia.html", label: "inertia tensor", desc: "principal moments and axes" },
    ]
  },
  {
    name: "spacecraft systems",
    items: [
      { path: "tools/space/solar-array.html", label: "solar array budget", desc: "end-of-life power and required array area" },
      { path: "tools/space/link-budget.html", label: "link budget", desc: "received power and carrier to noise ratio" },
    ]
  },
  {
    name: "statics",
    items: [
      { path: "tools/statics/reaction-forces.html", label: "reaction forces", desc: "support reactions for a simply supported beam" },
      { path: "tools/statics/truss.html", label: "truss solver", desc: "member forces and reactions for a planar truss" },
      { path: "tools/statics/centroid.html", label: "centroid and moment of inertia", desc: "composite area centroid and Ixx, Iyy" },
    ]
  },
  {
    name: "structures",
    items: [
      { path: "tools/structures/stress-concentration.html", label: "stress concentration", desc: "peak stress from a hole or fillet" },
      { path: "tools/structures/euler-buckling.html", label: "euler buckling", desc: "critical column load from end conditions" },
      { path: "tools/structures/beam-shear-moment.html", label: "beam shear and moment", desc: "reactions, shear, and moment along a beam" },
      { path: "tools/structures/launch-loads.html", label: "launch vehicle loads", desc: "interface shear, bending, and axial loads from wind or max-q" },
    ]
  },
  {
    name: "thermodynamics",
    items: [
      { path: "tools/thermo/ideal-gas.html", label: "ideal gas solver", desc: "solves pV = mRT for whichever state variable you leave out" },
      { path: "tools/thermo/steam-tables.html", label: "steam tables", desc: "saturated and superheated water property lookup, plus two-phase mixtures" },
      { path: "tools/thermo/energy-balance.html", label: "energy balance", desc: "first law for closed systems and steady-flow control volumes" },
      { path: "tools/thermo/entropy.html", label: "entropy change", desc: "ideal gas entropy change and isentropic relations" },
      { path: "tools/thermo/cycles.html", label: "power cycles", desc: "carnot, otto, diesel, brayton, and rankine efficiency" },
    ]
  }
];
