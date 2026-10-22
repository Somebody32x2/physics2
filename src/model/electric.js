/**
 * Electrostatics in SI units (chapters "Charge & Coulomb's law" ... "Electric potential").
 * Figure-unit field geometry (lines, grids, contours) lives in fields.js; the figure helpers at the
 * bottom of this file (crossings, conductor sphere, plates) work in the same figure units.
 */
export const K = 8.99e9; // Coulomb constant k = 1 / (4 pi eps0), N m^2 / C^2
export const EPS0 = 8.85e-12; // permittivity of free space, C^2 / (N m^2)
export const E_CHARGE = 1.602e-19; // elementary charge, C
export const M_E = 9.109e-31; // electron mass, kg
export const M_P = 1.673e-27; // proton mass, kg
export const C_LIGHT = 2.998e8; // speed of light, m/s
export const G_EARTH = 9.8; // m/s^2

/** Signed Coulomb force along the line joining two charges: > 0 repels, < 0 attracts. Newtons. */
export const coulomb = (q1, q2, r) => (K * q1 * q2) / (r * r);

/** How the force scales when charges and distance are multiplied by the given factors. */
export const forceRatio = ({ q1 = 1, q2 = 1, r = 1 } = {}) => (q1 * q2) / (r * r);

// ---------- the field ----------

/** Field strength of a point charge q at distance r: k|q|/r^2, N/C. */
export const pointE = (q, r) => (K * Math.abs(q)) / (r * r);

/** Force on a charge q in a field E (signed, same axis as E): F = qE. */
export const forceInField = (q, E) => q * E;

/**
 * Two charges of the SAME sign, q1 at x = 0 and q2 at x = d. The field vanishes between them at the
 * distance from q1 where k q1/x^2 = k q2/(d - x)^2: x = d / (1 + sqrt(q2/q1)). (Nearer the smaller charge.)
 */
export const zeroFieldBetween = (q1, q2, d) => d / (1 + Math.sqrt(q2 / q1));

/** Infinite line charge (lambda, C/m) at distance r: E = 2k lambda / r = lambda / (2 pi eps0 r). */
export const lineE = (lambda, r) => (2 * K * Math.abs(lambda)) / r;

/** Infinite sheet (sigma, C/m^2): E = sigma / (2 eps0), the same at every distance. */
export const sheetE = (sigma) => Math.abs(sigma) / (2 * EPS0);

/** Between two oppositely charged parallel plates (charge density +-sigma): E = sigma / eps0. */
export const platesE = (sigma) => Math.abs(sigma) / EPS0;

/**
 * Field of a total charge Q spread over a sphere of radius R (shell = true: on the surface, as on a
 * conductor; shell = false: uniformly through the volume). Outside, it is a point charge at the center.
 */
export function sphereE(Q, r, R, { shell = true } = {}) {
  if (r >= R) return pointE(Q, r);
  return shell ? 0 : (K * Math.abs(Q) * r) / R ** 3;
}

/**
 * A charged particle entering the gap between deflection plates along the midline.
 * V: plate voltage, d: gap, L: plate length, v0: entry speed (all SI). q, m default to an electron.
 * Returns the field, the acceleration toward the attracting plate, the time in the plates, the
 * sideways deflection at the exit, whether it hits a plate first, and the exit angle (rad).
 */
export function deflection({ V, d, L, v0, q = -E_CHARGE, m = M_E }) {
  const E = V / d;
  const a = (Math.abs(q) * E) / m;
  const t = L / v0;
  const y = 0.5 * a * t * t;
  const hits = y > d / 2;
  const tHit = hits ? Math.sqrt(d / a) : null; // time to drift d/2 sideways
  const angle = Math.atan2(a * t, v0);
  return { E, a, t, y, hits, tHit, xHit: hits ? v0 * tHit : null, angle };
}

// ---------- flux and Gauss ----------

/** Flux of a uniform field E through a flat area A whose normal makes angle theta (radians) with E. */
export const flux = (E, A, theta) => E * A * Math.cos(theta);

/** Gauss's law: net flux out of any closed surface, N m^2 / C. */
export const gaussFlux = (Qenc) => Qenc / EPS0;

// ---------- potential ----------

/** Potential of a point charge (zero at infinity): kq/r, volts. Signed, a scalar. */
export const pointV = (q, r) => (K * q) / r;

/** Potential energy of q at potential V: U = qV, joules. */
export const potentialEnergy = (q, V) => q * V;

/** Uniform field: potential difference across distance d is E d (volts). */
export const uniformDeltaV = (E, d) => E * d;

/**
 * A charge q released from rest falls through a potential difference dV (= V_final - V_initial).
 * Energy conservation: K = -q dV. Returns { K (J), eV, v (m/s) }; K < 0 means it cannot get there.
 */
export function accelerate(q, dV, m) {
  const KE = -q * dV;
  const v = KE > 0 ? Math.sqrt((2 * KE) / m) : 0;
  return { K: KE, eV: KE / E_CHARGE, v };
}

// ---------- figure-unit helpers (no SI) ----------

/** Total charge inside a circle { x, y, r } (figure units). */
export const enclosed = (charges, c) => charges.reduce((s, q) => s + (Math.hypot(q.x - c.x, q.y - c.y) < c.r ? q.q : 0), 0);

/**
 * Count crossings of field lines ({ pts, from }, as from chargeFieldLines) through a circle.
 * Each line is extended to the center of the charge it starts on and, if it stops near one, the
 * charge it ends on, so the count is exact topology: out - in = (lines born inside) - (lines dying inside).
 * Returns { out, in, crossings: [{ x, y, out: bool }] }.
 */
export function circleCrossings(lines, charges, c, { r0 = 16 } = {}) {
  const inside = ([x, y]) => Math.hypot(x - c.x, y - c.y) < c.r;
  let nOut = 0;
  let nIn = 0;
  const crossings = [];
  for (const line of lines) {
    const pts = line.pts.slice();
    const src = charges[line.from];
    if (src) pts.unshift([src.x, src.y]);
    const last = pts[pts.length - 1];
    const sink = charges.find((q) => Math.hypot(last[0] - q.x, last[1] - q.y) < r0 && q !== src);
    if (sink) pts.push([sink.x, sink.y]);
    for (let i = 1; i < pts.length; i++) {
      const a = inside(pts[i - 1]);
      const b = inside(pts[i]);
      if (a === b) continue;
      // crossing point by bisection along the segment
      let [x0, y0] = pts[i - 1];
      let [x1, y1] = pts[i];
      for (let k = 0; k < 20; k++) {
        const mx = (x0 + x1) / 2;
        const my = (y0 + y1) / 2;
        if (inside([mx, my]) === a) [x0, y0] = [mx, my];
        else [x1, y1] = [mx, my];
      }
      crossings.push({ x: (x0 + x1) / 2, y: (y0 + y1) / 2, out: a });
      if (a) nOut++;
      else nIn++;
    }
  }
  return { out: nOut, in: nIn, crossings };
}

/** How many of the lines end on each charge (by index). */
export function linesEnding(lines, charges, { r0 = 16 } = {}) {
  const n = charges.map(() => 0);
  for (const line of lines) {
    const last = line.pts[line.pts.length - 1];
    const i = charges.findIndex((q, k) => k !== line.from && Math.hypot(last[0] - q.x, last[1] - q.y) < r0);
    if (i >= 0) n[i]++;
  }
  return n;
}

/**
 * Figure units -> SI when charges are in nC and one box unit is 1 mm (the sandboxes' convention):
 * potential q/r -> volts, field q/r^2 -> V/m (= N/C).
 */
export const FIG_VOLTS = K * 1e-9 / 1e-3;
export const FIG_FIELD = K * 1e-9 / 1e-6;

/**
 * Ideal parallel plates at x1 (potential V1) and x2 (V2), figure units: V is linear between them
 * and flat outside (no fringing). Returns { V(x, y), E(x, y) -> [Ex, Ey] } with E = -dV/dx.
 */
export function idealPlates({ x1, x2, V1, V2 }) {
  const slope = (V2 - V1) / (x2 - x1);
  return {
    V: (x) => (x <= x1 ? V1 : x >= x2 ? V2 : V1 + slope * (x - x1)),
    E: (x) => [x > x1 && x < x2 ? -slope : 0, 0],
  };
}

/**
 * Each charge's OWN field lines, as if it were alone: n|q| straight radial lines (pointing out of +,
 * into -), long enough to leave the figure. Flux adds charge by charge, so counting these through a
 * closed curve is the exact bookkeeping behind Gauss's law. Returns [{ pts, from: -1, of: index }].
 */
export function radialLines(charges, { perUnit = 8, length = 1400, r0 = 0, phase = 0, step = 5 } = {}) {
  const lines = [];
  charges.forEach((c, i) => {
    const n = Math.round(Math.abs(c.q) * perUnit);
    for (let k = 0; k < n; k++) {
      const a = phase + (2 * Math.PI * (k + 0.5)) / n;
      const pts = [];
      for (let s = r0; s <= length; s += step) pts.push([c.x + s * Math.cos(a), c.y + s * Math.sin(a)]);
      if (c.q < 0) pts.reverse();
      lines.push({ pts, from: -1, of: i });
    }
  });
  return lines;
}

/**
 * A conducting sphere (radius R, center cx, cy) in a uniform field E0 along +x, with its induced
 * surface charge built up to the fraction s (0 = none yet, 1 = equilibrium). The induced charge goes as
 * cos(theta) on the surface; it makes a uniform field -s E0 inside and a dipole field outside, so
 *   inside:  E = (1 - s) E0 (uniform; zero at equilibrium)
 *   outside: E = E0 + s * dipole of moment R^3 E0 (perpendicular to the surface at s = 1).
 * Returns field(x, y) -> [Ex, Ey] in figure units.
 */
export function conductorSphereField(E0, R, s, cx = 0, cy = 0) {
  return (x, y) => {
    const dx = x - cx;
    const dy = y - cy;
    const r2 = dx * dx + dy * dy;
    if (r2 < R * R) return [(1 - s) * E0, 0];
    const r = Math.sqrt(r2);
    const p = s * R ** 3 * E0; // dipole moment along +x
    // dipole field: (3 (p.r_hat) r_hat - p) / r^3
    const ux = dx / r;
    const uy = dy / r;
    const pr = p * ux;
    return [E0 + (3 * pr * ux - p) / r ** 3, (3 * pr * uy) / r ** 3];
  };
}

/** Surface charge density on that sphere at polar angle theta from +x: s * 3 eps0 E0 cos(theta) (figure units: s cos(theta)). */
export const conductorSigma = (s, theta) => s * Math.cos(theta);
