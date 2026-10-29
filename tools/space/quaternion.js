
    function quat_to_euler() {
      const err = document.getElementById("err");
      err.textContent = "";

      const w = val("qw"), x = val("qx"), y = val("qy"), z = val("qz");
      if (w === null || x === null || y === null || z === null) { err.textContent = "fill all four quaternion parts"; return; }

      const n = Math.sqrt(w * w + x * x + y * y + z * z);
      if (n < 1e-12) { err.textContent = "zero quaternion"; return; }

      const sinp = 2 * (w * y - z * x);
      const pitch = Math.abs(sinp) >= 1 ? Math.sign(sinp) * Math.PI / 2 : Math.asin(sinp);
      const roll = Math.atan2(2 * (w * x + y * z), 1 - 2 * (x * x + y * y));
      const yaw = Math.atan2(2 * (w * z + x * y), 1 - 2 * (y * y + z * z));

      render_lines("lines", [
        ["roll", fmt(roll * 180 / Math.PI, 6) + " &deg;"],
        ["pitch", fmt(pitch * 180 / Math.PI, 6) + " &deg;"],
        ["yaw", fmt(yaw * 180 / Math.PI, 6) + " &deg;"]
      ]);
    }

    function euler_to_quat() {
      const err = document.getElementById("err");
      err.textContent = "";

      const r = (val("roll") || 0) * Math.PI / 180;
      const p = (val("pitch") || 0) * Math.PI / 180;
      const y = (val("yaw") || 0) * Math.PI / 180;

      const cr = Math.cos(r / 2), sr = Math.sin(r / 2);
      const cp = Math.cos(p / 2), sp = Math.sin(p / 2);
      const cy = Math.cos(y / 2), sy = Math.sin(y / 2);

      const w = cr * cp * cy + sr * sp * sy;
      const x = sr * cp * cy - cr * sp * sy;
      const yy = cr * sp * cy + sr * cp * sy;
      const z = cr * cp * sy - sr * sp * cy;

      render_lines("lines", [
        ["q = [w, x, y, z]", "[" + [w, x, yy, z].map(function (v) { return fmt(v, 6); }).join(", ") + "]"]
      ]);
    }

    function draw_fig_attitude() {
      const el = document.getElementById("fig-attitude");
      const note = document.getElementById("fig-attitude-note");
      if (!el || !window.fig) return;
      const DEFAULTS = { qw: "0.7071", qx: "0", qy: "0", qz: "0.7071" };
      const hv = fig.harvest(quat_to_euler, DEFAULTS);
      if (!hv.rows.length) {
        if (note) note.textContent = "fill all four quaternion parts.";
        return;
      }
      const ang = function (frag) {
        for (let i = 0; i < hv.rows.length; i++) {
          if (hv.rows[i].label.toLowerCase().indexOf(frag) >= 0) return hv.rows[i].num;
        }
        return NaN;
      };
      const roll = ang("roll"), pitch = ang("pitch"), yaw = ang("yaw");
      const qw = parseFloat(hv.values.qw), qx = parseFloat(hv.values.qx),
        qy = parseFloat(hv.values.qy), qz = parseFloat(hv.values.qz);
      if (!isFinite(roll) || !isFinite(pitch) || !isFinite(yaw) ||
        !isFinite(qw) || !isFinite(qx) || !isFinite(qy) || !isFinite(qz)) {
        if (note) note.textContent = "fill all four quaternion parts.";
        return;
      }
      const n = Math.hypot(qw, qx, qy, qz);
      const w = qw / n, x = qx / n, y = qy / n, z = qz / n;

      // body axes expressed in the inertial frame, from the rotation matrix
      const r11 = 1 - 2 * (y * y + z * z), r12 = 2 * (x * y - w * z), r13 = 2 * (x * z + w * y);
      const r21 = 2 * (x * y + w * z), r22 = 1 - 2 * (x * x + z * z), r23 = 2 * (y * z - w * x);
      const r31 = 2 * (x * z - w * y), r32 = 2 * (y * z + w * x), r33 = 1 - 2 * (x * x + y * y);

      const W = 440, H = 290;
      const s = fig.scene(el, { width: W, height: H });
      const ox = W / 2, oy = H / 2 + 8;
      const proj = function (v, len) {
        return [ox + (v[0] - 0.45 * v[2]) * len, oy - (v[1] - 0.32 * v[2]) * len];
      };
      const RL = 88, BL = 62;

      const refs = [
        { v: [1, 0, 0], lab: "X" },
        { v: [0, 1, 0], lab: "Y" },
        { v: [0, 0, 1], lab: "Z" }
      ];
      for (const rf of refs) {
        const p = proj(rf.v, RL);
        s.line(ox, oy, p[0], p[1], "fig-ref");
        s.text(p[0] + (rf.v[0] ? 7 : 0), p[1] - (rf.v[1] ? 8 : 14), rf.lab,
          { cls: "fig-ref-label", anchor: rf.v[0] ? "start" : "middle" });
      }

      const axes = [
        { v: [r11, r21, r31], lab: "x", cls: "fig-axis-x", lab_cls: "fig-lab-x" },
        { v: [r12, r22, r32], lab: "y", cls: "fig-axis-y", lab_cls: "fig-lab-y" },
        { v: [r13, r23, r33], lab: "z", cls: "fig-axis-z", lab_cls: "fig-lab-z" }
      ];
      for (const ax of axes) {
        const p = proj(ax.v, BL);
        s.line(ox, oy, p[0], p[1], ax.cls);
        s.circle(p[0], p[1], 3.4, "fig-dot");
        const right = p[0] > ox + 6;
        s.text(p[0] + (right ? 9 : -9), p[1] - 8, ax.lab,
          { cls: ax.lab_cls, anchor: right ? "start" : "end" });
      }
      s.circle(ox, oy, 4, "fig-dot");
      s.text(W / 2, 18, "body frame (colour) in the inertial frame (dashed)", { cls: "fig-label" });
      s.commit();

      if (note) {
        note.textContent = "Grey axes are the inertial frame, coloured axes the rotated body frame.  " +
          "Roll " + fig.num_fmt(roll) + " deg, pitch " + fig.num_fmt(pitch) + " deg, yaw " +
          fig.num_fmt(yaw) + " deg, taken from the page's own conversion.";
      }
    }

    fig.auto_draw(function () { draw_fig_attitude(); });
