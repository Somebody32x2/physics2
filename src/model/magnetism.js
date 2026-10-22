/**
 * Magnetism model (chapters "Magnetic force", "Where magnetic fields come from", "Induction",
 * "Inductance & oscillations"). Plain JS, no DOM.
 *
 * Screen convention for 3D vectors: x right, y DOWN, z INTO the page. That triple is right-handed
 * (x cross y = z), so cross products computed in screen coordinates are physically correct:
 * "into the page" is +z, "out of the page" is -z.
 */
export const MU0 = 4e-7 * Math.PI; // permeability of free space, T m / A
export const E_CHARGE = 1.602e-19; // C
export const AMU = 1.661e-27; // kg
export const M_PROTON = 1.673e-27; // kg
export const M_ELECTRON = 9.109e-31; // kg

export const cross = ([ax, ay, az], [bx, by, bz]) => [ay * bz - az * by, az * bx - ax * bz, ax * by - ay * bx];

// ---------- magnetic force ----------

/** Force on a moving charge, F = q v x B (vectors [x, y, z] in screen convention). */
export const lorentz = (q, v, B) => cross(v, B).map((c) => q * c);

/** |F| = |q| v B sin(theta), theta = angle between v and B. */
export const forceMagnitude = (q, v, B, theta = Math.PI / 2) => Math.abs(q) * v * B * Math.sin(theta);

/** Radius of the circle of a charge moving perpendicular to B: r = m v / (|q| B). */
export const cyclotronRadius = (m, v, q, B) => (m * v) / (Math.abs(q) * B);

/** Time for one full circle: T = 2 pi m / (|q| B). Independent of speed. */
export const cyclotronPeriod = (m, q, B) => (2 * Math.PI * m) / (Math.abs(q) * B);

/** Distance along B per turn of a helix: the parallel speed times the period. */
export const helixPitch = (m, vPar, q, B) => vPar * cyclotronPeriod(m, q, B);

/** Force on a straight wire: F = I L B sin(theta). */
export const wireForce = (I, L, B, theta = Math.PI / 2) => I * L * B * Math.sin(theta);

/** Torque on a current loop: tau = N I A B sin(theta), theta between the loop's normal and B. */
export const loopTorque = (N, I, A, B, theta) => N * I * A * B * Math.sin(theta);

/**
 * Path of a charge through a region of uniform B perpendicular to the page (figure units, px).
 * start [x, y], dir [ux, uy] (unit), r = radius of the circle in the field, turn = +1 for q*Bz > 0
 * (positive charge, B into page: counterclockwise on screen), -1 for the other sense.
 * inField(x, y) says where the field is. Steps of length ds until the path leaves `bounds`
 * [x0, y0, x1, y1]. Returns { pts, inField: [bool per point] }.
 */
export function trajectory({ start, dir, r, turn, inField, bounds, ds = 2, maxSteps = 6000 }) {
  let [x, y] = start;
  let [ux, uy] = dir;
  const pts = [[x, y]];
  const flags = [inField(x, y)];
  const rot = (a) => {
    const c = Math.cos(a);
    const s = Math.sin(a);
    [ux, uy] = [ux * c - uy * s, ux * s + uy * c];
  };
  for (let i = 0; i < maxSteps; i++) {
    const f = inField(x, y);
    const a = f ? (-turn * ds) / r : 0; // y is down, so a negative math angle turns counterclockwise on screen
    rot(a / 2);
    x += ux * ds;
    y += uy * ds;
    rot(a / 2);
    pts.push([x, y]);
    flags.push(inField(x, y));
    if (x < bounds[0] || y < bounds[1] || x > bounds[2] || y > bounds[3]) break;
  }
  return { pts, inField: flags };
}

// ---------- sources of B ----------

/** Long straight wire: B = mu0 I / (2 pi r). */
export const wireB = (I, r) => (MU0 * I) / (2 * Math.PI * r);

/** Center of a circular loop: B = mu0 I / (2 R). */
export const loopCenterB = (I, R) => (MU0 * I) / (2 * R);

/** Inside a long solenoid: B = mu0 n I (n = turns per meter). */
export const solenoidB = (n, I) => MU0 * n * I;

/** Force per meter between parallel wires, mu0 I1 I2 / (2 pi d). Positive = attract (currents in the same direction). */
export const parallelForcePerLength = (I1, I2, d) => (MU0 * I1 * I2) / (2 * Math.PI * d);

/**
 * Flux function of wires perpendicular to the page ([{ x, y, I }], same convention as wireField in fields.js).
 * Its contour lines ARE the field lines, and equally spaced contours crowd where B is strong.
 */
export const wireFlux = (wires) => (x, y) => {
  let s = 0;
  for (const w of wires) s += w.I * Math.log(Math.max(1e-9, Math.hypot(x - w.x, y - w.y)));
  return s;
};

/**
 * Field in the plane of the page of coaxial circular loops whose common axis is the horizontal line
 * through their centers ([{ x, y, R, I }], figure units, mu0 / 4 pi = 1), by Biot-Savart: add up
 * dl x r_hat / r^2 from `segs` pieces of every loop. I > 0 means the field on the axis points +x
 * (right): the top crossing carries current out of the page, the bottom crossing into it.
 */
export function loopField(loops, { segs = 48 } = {}) {
  const pieces = [];
  for (const L of loops) {
    for (let k = 0; k < segs; k++) {
      const ph = ((k + 0.5) * 2 * Math.PI) / segs;
      const dphi = (2 * Math.PI) / segs;
      // loop point (x, y, z) = (L.x, L.y + R cos ph, R sin ph); dl = R (0, -sin ph, cos ph) dphi
      pieces.push([L.x, L.y + L.R * Math.cos(ph), L.R * Math.sin(ph), 0, -L.R * Math.sin(ph) * dphi * L.I, L.R * Math.cos(ph) * dphi * L.I]);
    }
  }
  return (x, y) => {
    let bx = 0;
    let by = 0;
    for (const [px, py, pz, , dy, dz] of pieces) {
      const rx = x - px;
      const ry = y - py;
      const rz = -pz;
      const r2 = rx * rx + ry * ry + rz * rz;
      if (r2 < 1e-6) continue;
      const inv = 1 / (r2 * Math.sqrt(r2));
      // dl x r with dl = (0, dy, dz)
      bx += (dy * rz - dz * ry) * inv;
      by += dz * rx * inv;
    }
    return [bx, by];
  };
}

/**
 * Field line through `seed`, followed both ways. Magnetic field lines have no ends, so the line stops
 * when it closes on itself (closed: true) or leaves `bounds`.
 */
export function closedLine(field, seed, { ds = 3, maxSteps = 1500, bounds }) {
  const unit = (x, y, dir) => {
    const [fx, fy] = field(x, y);
    const m = Math.hypot(fx, fy);
    return m < 1e-14 ? null : [(dir * fx) / m, (dir * fy) / m];
  };
  const out = (x, y) => x < bounds[0] || y < bounds[1] || x > bounds[2] || y > bounds[3];
  const run = (dir) => {
    const pts = [[seed[0], seed[1]]];
    let [x, y] = seed;
    for (let s = 0; s < maxSteps; s++) {
      const u1 = unit(x, y, dir);
      if (!u1) break;
      const u2 = unit(x + (u1[0] * ds) / 2, y + (u1[1] * ds) / 2, dir);
      if (!u2) break;
      x += u2[0] * ds;
      y += u2[1] * ds;
      pts.push([x, y]);
      if (s > 10 && Math.hypot(x - seed[0], y - seed[1]) < ds * 0.75) {
        pts.push([seed[0], seed[1]]);
        return { pts, closed: true };
      }
      if (out(x, y)) break;
    }
    return { pts, closed: false };
  };
  const fwd = run(1);
  if (fwd.closed) return fwd;
  const back = run(-1);
  return { pts: [...back.pts.reverse(), ...fwd.pts.slice(1)], closed: false };
}

// ---------- induction ----------

/** Magnetic flux through a flat area: Phi = B A cos(theta), theta between B and the area's normal. */
export const flux = (B, A, theta = 0) => B * A * Math.cos(theta);

/** Sliding bar on rails: emf = B L v, current, drag force I L B (opposes v), mechanical power in = heat out. */
export function slidingBar({ B, L, v, R }) {
  const emf = B * L * v;
  const I = emf / R;
  const F = I * L * B;
  return { emf, I, F, Pmech: F * v, Pheat: I * I * R };
}

/** Rotating-loop generator at time t: flux N B A cos(wt) and emf N B A w sin(wt) (= -dPhi/dt). */
export const generator = ({ N = 1, B, A, omega }, t) => ({
  phi: N * B * A * Math.cos(omega * t),
  emf: N * B * A * omega * Math.sin(omega * t),
});

/** Ideal transformer: V_s = V_p N_s / N_p; current goes the other way so power is the same. */
export const transformer = (Vp, Np, Ns, Ip = 1) => ({ Vs: (Vp * Ns) / Np, Is: (Ip * Np) / Ns });

/** Sense of the induced current for a loop in the page, given dPhi/dt with the normal OUT of the page. */
export const inducedSense = (dPhiOutDt) => (dPhiOutDt < 0 ? 'ccw' : dPhiOutDt > 0 ? 'cw' : 'none');

/**
 * Flux of a small magnet (dipole) through a coaxial coil of radius a at axial distance z, normalized
 * to 1 at z = 0: a^3 / (a^2 + z^2)^(3/2). It peaks when the magnet is in the coil and falls like 1/z^3.
 */
export const dipoleFlux = (z, a) => a ** 3 / (a * a + z * z) ** 1.5;
export const dipoleFluxSlope = (z, a) => (-3 * a ** 3 * z) / (a * a + z * z) ** 2.5;

/**
 * Magnet-and-coil cycle (period 6 s / speed): push in (1.5 s), hold inside, pull out, hold outside.
 * Position z = signed distance from the coil center (negative = to the left of it); smooth ramps.
 * Returns { z, vz, phase: 'in' | 'hold-in' | 'out' | 'hold-out' }.
 */
export function magnetCycle(t, { zFar = -3, zNear = 0, speed = 1 } = {}) {
  const T = 6 / speed;
  const s = (((t % T) + T) % T) / T; // 0..1
  const ramp = (u) => (1 - Math.cos(Math.PI * u)) / 2;
  const dramp = (u) => (Math.PI / 2) * Math.sin(Math.PI * u);
  const D = zNear - zFar;
  const seg = 0.25; // each phase is a quarter of the cycle
  if (s < seg) return { z: zFar + D * ramp(s / seg), vz: (D * dramp(s / seg)) / (seg * T), phase: 'in' };
  if (s < 2 * seg) return { z: zNear, vz: 0, phase: 'hold-in' };
  if (s < 3 * seg) return { z: zNear - D * ramp((s - 2 * seg) / seg), vz: (-D * dramp((s - 2 * seg) / seg)) / (seg * T), phase: 'out' };
  return { z: zFar, vz: 0, phase: 'hold-out' };
}

// ---------- inductance ----------

/** Self-induced emf: emf = -L dI/dt. */
export const inductorEmf = (L, dIdt) => -L * dIdt;

/** Energy stored in an inductor's magnetic field: U = 1/2 L I^2. */
export const inductorEnergy = (L, I) => 0.5 * L * I * I;

/** Inductance of a long solenoid: L = mu0 n^2 A l. */
export const solenoidInductance = (n, A, len) => MU0 * n * n * A * len;

/** RL time constant tau = L / R. */
export const rlTau = (L, R) => L / R;

/** Current after closing the switch on battery + R + L: I = (emf / R)(1 - e^(-t / tau)). */
export const rlCurrent = (emf, R, L, t) => (emf / R) * (1 - Math.exp(-t / rlTau(L, R)));

/** LC angular frequency w = 1 / sqrt(L C). */
export const lcOmega = (L, C) => 1 / Math.sqrt(L * C);

/** Mass on a spring: w = sqrt(k / m). */
export const springOmega = (k, m) => Math.sqrt(k / m);

/**
 * LC circuit started with charge Q0 on the capacitor and no current. State at time t:
 * q = Q0 cos(wt), i = dq/dt = -Q0 w sin(wt), and the two energies.
 */
export function lcState(L, C, Q0, t) {
  const w = lcOmega(L, C);
  const q = Q0 * Math.cos(w * t);
  const i = -Q0 * w * Math.sin(w * t);
  return { q, i, UE: (q * q) / (2 * C), UB: 0.5 * L * i * i, w };
}
