// explorer sidebar for the tool pages, injected on load
(function () {
  const groups = [
    { name: "aerodynamics", items: [
      ["standard atmosphere", "tools/aero/standard-atmosphere.html"],
      ["lift and drag", "tools/aero/lift-drag.html"],
      ["range and endurance", "tools/aero/range-endurance.html"],
      ["isentropic flow", "tools/aero/isentropic.html"],
      ["normal shock", "tools/aero/normal-shock.html"],
      ["reynolds number", "tools/aero/reynolds.html"]
    ]},
    { name: "control systems", items: [
      ["pid tuning", "tools/control/pid.html"],
      ["second order response", "tools/control/second-order.html"]
    ]},
    { name: "dynamics", items: [
      ["projectile motion", "tools/dynamics/projectile.html"],
      ["rotational motion", "tools/dynamics/rotation.html"],
      ["impulse and momentum", "tools/dynamics/impulse-momentum.html"],
      ["relative velocity", "tools/dynamics/relative-velocity.html"]
    ]},
    { name: "instrumentation", items: [
      ["strain gauge", "tools/instr/strain-gauge.html"]
    ]},
    { name: "linear algebra", items: [
      ["matrix operations", "tools/linalg/matrix.html"],
      ["eigenvalues and vectors", "tools/linalg/eigenvalues.html"],
      ["linear system solver", "tools/linalg/linear-solver.html"]
    ]},
    { name: "math", items: [
      ["vector operations", "tools/math/vectors.html"],
      ["differential equations", "tools/math/ode.html"]
    ]},
    { name: "physics", items: [
      ["resistors and capacitors", "tools/physics/resistors.html"],
      ["ohm's law and power", "tools/physics/ohms-law.html"],
      ["rc time constant", "tools/physics/rc.html"],
      ["kirchhoff solver", "tools/physics/kirchhoff.html"]
    ]},
    { name: "solid mechanics", items: [
      ["stress and strain", "tools/solids/stress-strain.html"],
      ["mohr's circle", "tools/solids/mohr-circle.html"],
      ["torsion", "tools/solids/torsion.html"],
      ["axial and thermal deformation", "tools/solids/axial-thermal.html"]
    ]},
    { name: "space mechanics", items: [
      ["orbital elements", "tools/space/orbital-elements.html"],
      ["vis-viva", "tools/space/vis-viva.html"],
      ["hohmann transfer", "tools/space/hohmann.html"],
      ["kepler's third law", "tools/space/kepler.html"],
      ["solar array budget", "tools/space/solar-array.html"],
      ["link budget", "tools/space/link-budget.html"],
      ["rocket equation", "tools/space/rocket-equation.html"],
      ["nozzle flow", "tools/space/nozzle.html"],
      ["attitude conversions", "tools/space/quaternion.html"],
      ["inertia tensor", "tools/space/inertia.html"]
    ]},
    { name: "statics", items: [
      ["reaction forces", "tools/statics/reaction-forces.html"],
      ["truss solver", "tools/statics/truss.html"],
      ["centroid and moment of inertia", "tools/statics/centroid.html"]
    ]},
    { name: "thermodynamics", items: [
      ["ideal gas solver", "tools/thermo/ideal-gas.html"],
      ["steam tables", "tools/thermo/steam-tables.html"],
      ["energy balance", "tools/thermo/energy-balance.html"],
      ["entropy change", "tools/thermo/entropy.html"],
      ["power cycles", "tools/thermo/cycles.html"]
    ]}
  ];

  const current = window.location.pathname;

  let html = '<a class="nav-home" href="../../index.html">eng tools</a>';
  for (const g of groups) {
    html += '<div class="nav-group">' + g.name + "</div>";
    for (const pair of g.items) {
      const label = pair[0], href = pair[1];
      const active = current.indexOf(href) !== -1 ? ' class="active"' : "";
      html += '<a' + active + ' href="../../' + href + '">' + label + "</a>";
    }
  }

  const aside = document.createElement("aside");
  aside.className = "side-nav";
  aside.innerHTML = html;
  document.body.appendChild(aside);
  document.body.classList.add("with-sidebar");
})();