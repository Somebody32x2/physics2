/**
 * Circuits in SI units (chapters "Capacitors", "Current & resistance", "DC circuits", "RC circuits").
 * Plain numbers, no DOM: the lessons draw from these and the tests pin them to textbook values.
 */
import { EPS0, E_CHARGE } from './electric.js';

export { EPS0, E_CHARGE };

// ---------- capacitors ----------

/** Parallel-plate capacitance C = kappa eps0 A / d (farads). A in m^2, d in m. */
export const plateC = (A, d, kappa = 1) => (kappa * EPS0 * A) / d;

/** Energy stored in a capacitor, U = 1/2 C V^2 (joules). */
export const capEnergy = (C, V) => 0.5 * C * V * V;

/** Equivalent capacitance: parallel adds C, series adds 1/C. */
export const parallelC = (cs) => cs.reduce((a, c) => a + c, 0);
export const seriesC = (cs) => 1 / cs.reduce((a, c) => a + 1 / c, 0);

/**
 * Full state of a parallel-plate capacitor. Either `V` (held by a battery) or `Q` (isolated) is given.
 * Returns { C, Q, V, E, U, sigma } in SI units.
 */
export function plateState({ A, d, kappa = 1, V = null, Q = null }) {
  const C = plateC(A, d, kappa);
  if (V == null) V = Q / C;
  else Q = C * V;
  return { C, Q, V, E: V / d, U: capEnergy(C, V), sigma: Q / A };
}

/**
 * Change the plate gap by `factor` starting from (A, d0, V0). mode 'battery' keeps V fixed, 'isolated'
 * keeps Q fixed. Returns the new state and its ratios to the starting state.
 */
export function pullApart({ A = 0.02, d0 = 1e-3, V0 = 10, factor, mode }) {
  const start = plateState({ A, d: d0, V: V0 });
  const now = mode === 'battery' ? plateState({ A, d: d0 * factor, V: V0 }) : plateState({ A, d: d0 * factor, Q: start.Q });
  const ratio = {};
  for (const k of ['C', 'Q', 'V', 'E', 'U']) ratio[k] = now[k] / start[k];
  return { start, now, ratio };
}

/** Inserting a slab of dielectric constant kappa that fills an ISOLATED capacitor: Q fixed. Ratios to the empty capacitor. */
export function insertDielectric(kappa) {
  return { C: kappa, Q: 1, V: 1 / kappa, E: 1 / kappa, U: 1 / kappa, boundFraction: 1 - 1 / kappa };
}

/**
 * Two capacitors on a battery, in 'series' or 'parallel'. Returns { Ceq, Q: [Q1, Q2], V: [V1, V2], U: [U1, U2] }.
 */
export function capPair(C1, C2, emf, how) {
  if (how === 'parallel') {
    const Q = [C1 * emf, C2 * emf];
    return { Ceq: parallelC([C1, C2]), Q, V: [emf, emf], U: [capEnergy(C1, emf), capEnergy(C2, emf)] };
  }
  const Ceq = seriesC([C1, C2]);
  const q = Ceq * emf;
  const V = [q / C1, q / C2];
  return { Ceq, Q: [q, q], V, U: [capEnergy(C1, V[0]), capEnergy(C2, V[1])] };
}

/** C1 in series with (C2 || C3) across emf. Returns charges and voltages on each. */
export function capSeriesParallel(C1, C2, C3, emf) {
  const C23 = C2 + C3;
  const Ceq = seriesC([C1, C23]);
  const Q1 = Ceq * emf;
  const V1 = Q1 / C1;
  const V23 = Q1 / C23;
  return { Ceq, Q: [Q1, C2 * V23, C3 * V23], V: [V1, V23, V23] };
}

// ---------- current and resistance ----------

export const RHO = { copper: 1.68e-8, aluminum: 2.65e-8, nichrome: 1.1e-6 }; // resistivity, ohm m
export const N_COPPER = 8.5e28; // free electrons per m^3 in copper

/** R = rho L / A (ohms). */
export const resistance = (rho, L, A) => (rho * L) / A;

/** Drift speed v_d = I / (n e A) (m/s). */
export const driftSpeed = (I, A, n = N_COPPER) => I / (n * E_CHARGE * A);

/** A piece of wire with voltage V across it: { R, I, vd, P }. */
export function wireState({ V, L, A, rho = RHO.copper, n = N_COPPER }) {
  const R = resistance(rho, L, A);
  const I = V / R;
  return { R, I, vd: driftSpeed(I, A, n), P: I * V };
}

/** Power in a resistor three ways; all agree for an ohmic resistor. */
export const powerIV = (I, V) => I * V;
export const powerI2R = (I, R) => I * I * R;
export const powerV2R = (V, R) => (V * V) / R;

/** A real battery (emf, internal r) driving load R: { I, Vterm, Pload, Pinternal }. */
export function realBattery(emf, r, R) {
  const I = emf / (R + r);
  return { I, Vterm: emf - I * r, Pload: I * I * R, Pinternal: I * I * r };
}

/** A light-bulb filament is not ohmic: I grows roughly as V^0.6 as the filament heats up. Rated (V0, I0). */
export const filamentCurrent = (V, V0 = 12, I0 = 1) => (V <= 0 ? 0 : I0 * (V / V0) ** 0.6);

// ---------- DC circuit solver (modified nodal analysis) ----------

export const seriesR = (rs) => rs.reduce((a, r) => a + r, 0);
export const parallelR = (rs) => 1 / rs.reduce((a, r) => a + 1 / r, 0);

/**
 * Solve a DC circuit of resistors and ideal batteries by modified nodal analysis.
 *   nodes: number of nodes (0 .. nodes-1); node 0 is ground (0 V).
 *   elements: [{ id, type: 'R', a, b, R } | { id, type: 'V', a, b, emf }]
 *     resistor current I is counted from a to b (positive = conventional current flows a -> b);
 *     battery: a is the - terminal, b the + terminal (V_b - V_a = emf); I is the current leaving its + terminal
 *     into the circuit (positive = the battery is delivering power). An 'R' of 0 or a 'V' of emf 0 is a plain wire.
 * Returns { V: node potentials, I: { id: current }, drop: { id: V_a - V_b }, P: { id: power absorbed (resistors) or delivered (batteries) } }.
 */
export function solveCircuit({ nodes, elements }) {
  const els = elements.map((e) => (e.type === 'R' && e.R === 0 ? { ...e, type: 'V', emf: 0, wire: true } : e));
  const srcs = els.filter((e) => e.type === 'V');
  const n = nodes - 1 + srcs.length;
  const A = Array.from({ length: n }, () => new Array(n).fill(0));
  const z = new Array(n).fill(0);
  const idx = (node) => node - 1; // ground is dropped
  for (const e of els) {
    if (e.type !== 'R') continue;
    const g = 1 / e.R;
    const [a, b] = [idx(e.a), idx(e.b)];
    if (a >= 0) A[a][a] += g;
    if (b >= 0) A[b][b] += g;
    if (a >= 0 && b >= 0) {
      A[a][b] -= g;
      A[b][a] -= g;
    }
  }
  srcs.forEach((e, k) => {
    const row = nodes - 1 + k;
    const [a, b] = [idx(e.a), idx(e.b)];
    // unknown j = current flowing INTO the source at its + terminal b (MNA convention), out of a
    if (b >= 0) {
      A[b][row] += 1;
      A[row][b] += 1;
    }
    if (a >= 0) {
      A[a][row] -= 1;
      A[row][a] -= 1;
    }
    z[row] = e.emf;
  });
  const x = gauss(A, z);
  const V = [0, ...x.slice(0, nodes - 1)];
  const I = {};
  const drop = {};
  const P = {};
  for (const e of els) {
    drop[e.id] = V[e.a] - V[e.b];
    if (e.type === 'R') {
      I[e.id] = drop[e.id] / e.R;
      P[e.id] = I[e.id] * drop[e.id];
    }
  }
  srcs.forEach((e, k) => {
    I[e.id] = -x[nodes - 1 + k];
    P[e.id] = e.emf * I[e.id];
  });
  return { V, I, drop, P };
}

/** Gaussian elimination with partial pivoting; solves A x = b. */
export function gauss(A, b) {
  const n = b.length;
  const M = A.map((row, i) => [...row, b[i]]);
  for (let c = 0; c < n; c++) {
    let piv = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[piv][c])) piv = r;
    if (Math.abs(M[piv][c]) < 1e-14) throw new Error('singular circuit (floating node or loop of ideal sources)');
    [M[c], M[piv]] = [M[piv], M[c]];
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = M[r][c] / M[c][c];
      if (f !== 0) for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k];
    }
  }
  return M.map((row, i) => row[n] / row[i]);
}

/**
 * The bulb circuits of the "DC circuits" chapter: identical bulbs of resistance Rb on an ideal battery.
 *   'alone'    : A
 *   'series'   : A then B in series
 *   'parallel' : A and B side by side
 *   'mixed'    : A in series with (B || C); `closed` = switch in C's branch closed
 * Returns { P: { A, B, C } (watts, 0 if absent or dark), I: { A, B, C }, Itotal, Req }.
 */
export function bulbCircuit(mode, { emf = 12, Rb = 12, closed = true } = {}) {
  // node 0 = battery -, node 1 = battery +, node 2 = middle
  let nodes = 2;
  const els = [{ id: 'bat', type: 'V', a: 0, b: 1, emf }];
  if (mode === 'alone') els.push({ id: 'A', type: 'R', a: 1, b: 0, R: Rb });
  else if (mode === 'parallel') els.push({ id: 'A', type: 'R', a: 1, b: 0, R: Rb }, { id: 'B', type: 'R', a: 1, b: 0, R: Rb });
  else {
    nodes = 3;
    els.push({ id: 'A', type: 'R', a: 1, b: 2, R: Rb }, { id: 'B', type: 'R', a: 2, b: 0, R: Rb });
    if (mode === 'mixed' && closed) els.push({ id: 'C', type: 'R', a: 2, b: 0, R: Rb });
  }
  const s = solveCircuit({ nodes, elements: els });
  const P = {};
  const I = {};
  for (const k of ['A', 'B', 'C']) {
    P[k] = s.P[k] ?? 0;
    I[k] = s.I[k] ?? 0;
  }
  return { P, I, Itotal: s.I.bat, Req: emf / s.I.bat };
}

/** The ladder network of the "DC circuits" chapter: R1 in series with ((R2 + R3) || R4) on emf. Solved two ways. */
export const LADDER = { emf: 18, R1: 3, R2: 4, R3: 8, R4: 12 };
export function ladder({ emf, R1, R2, R3, R4 } = LADDER) {
  const R23 = seriesR([R2, R3]);
  const R234 = parallelR([R23, R4]);
  const Req = seriesR([R1, R234]);
  // nodes: 0 bottom (battery -), 1 battery +, 2 after R1 (top of parallel block), 3 between R2 and R3
  const s = solveCircuit({
    nodes: 4,
    elements: [
      { id: 'bat', type: 'V', a: 0, b: 1, emf },
      { id: 'R1', type: 'R', a: 1, b: 2, R: R1 },
      { id: 'R2', type: 'R', a: 2, b: 3, R: R2 },
      { id: 'R3', type: 'R', a: 3, b: 0, R: R3 },
      { id: 'R4', type: 'R', a: 2, b: 0, R: R4 },
    ],
  });
  return { R23, R234, Req, I: s.I, drop: s.drop, V: s.V };
}

/**
 * The two-loop circuit of the "DC circuits" chapter:
 *   left branch: emf1 (+ up) and R1, right branch: emf2 (+ up) and R2, middle branch: R3, all between a top
 *   junction and the bottom wire. I1 = up the left branch, I2 = up the right branch, I3 = down the middle.
 * Returns { I1, I2, I3, Vtop } from the solver.
 */
export const TWO_LOOP = { emf1: 12, emf2: 3, R1: 2, R2: 3, R3: 3 };
export function twoLoop({ emf1, emf2, R1, R2, R3 } = TWO_LOOP) {
  // nodes: 0 bottom, 1 top junction, 2 between emf1 + and R1, 3 between emf2 + and R2
  const s = solveCircuit({
    nodes: 4,
    elements: [
      { id: 'e1', type: 'V', a: 0, b: 2, emf: emf1 },
      { id: 'R1', type: 'R', a: 2, b: 1, R: R1 },
      { id: 'e2', type: 'V', a: 0, b: 3, emf: emf2 },
      { id: 'R2', type: 'R', a: 3, b: 1, R: R2 },
      { id: 'R3', type: 'R', a: 1, b: 0, R: R3 },
    ],
  });
  return { I1: s.I.R1, I2: s.I.R2, I3: s.I.R3, Vtop: s.V[1], drop: s.drop };
}

/**
 * Long after the switch closes in the "RC" quiz circuit: battery -> R1 -> node; from the node two branches
 * to ground: R2, and R3 in series with a capacitor. A charged capacitor passes no current (an open circuit).
 */
export function rcSteadyState({ emf = 12, R1 = 2, R2 = 4, R3 = 6 } = {}) {
  const s = solveCircuit({
    nodes: 4,
    elements: [
      { id: 'bat', type: 'V', a: 0, b: 1, emf },
      { id: 'R1', type: 'R', a: 1, b: 2, R: R1 },
      { id: 'R2', type: 'R', a: 2, b: 0, R: R2 },
      { id: 'R3', type: 'R', a: 2, b: 3, R: R3 },
      { id: 'C', type: 'R', a: 3, b: 0, R: 1e12 }, // a charged capacitor: no current, like a break
    ],
  });
  return { I: s.I, Vc: s.V[3] };
}

// ---------- RC circuits ----------

export const tau = (R, C) => R * C;

/** Charging from empty through R by emf: q(t) = C emf (1 - e^(-t/tau)), i(t) = (emf / R) e^(-t/tau). */
export function charging(t, { R, C, emf }) {
  const k = Math.exp(-t / (R * C));
  return { q: C * emf * (1 - k), i: (emf / R) * k, vc: emf * (1 - k), vr: emf * k };
}

/** Discharging from q0 through R: q(t) = q0 e^(-t/tau); i(t) is (q0 / RC) e^(-t/tau), flowing the opposite way (negative). */
export function discharging(t, { R, C, q0 }) {
  const k = Math.exp(-t / (R * C));
  return { q: q0 * k, i: -(q0 / (R * C)) * k, vc: (q0 / C) * k };
}

/** Fraction of the final charge reached after n time constants: 1 - e^-n. */
export const chargedFraction = (n) => 1 - Math.exp(-n);
/** Fraction remaining after n time constants of discharge: e^-n. */
export const remainingFraction = (n) => Math.exp(-n);
