/**
 * Numbers for the two framing chapters ("The big picture" and "Equation sheet in words"):
 * physical constants, the electric-vs-gravity comparison, and the scaling explorer.
 * Plain SI units, no DOM.
 */
export const K = 8.98755e9; // Coulomb constant k = 1/(4 pi eps0), N m^2/C^2
export const EPS0 = 8.854188e-12; // permittivity of free space, C^2/(N m^2)
export const MU0 = 4 * Math.PI * 1e-7; // permeability of free space, T m/A (1.257e-6)
export const E_CHARGE = 1.602177e-19; // elementary charge, C
export const M_E = 9.10938e-31; // electron mass, kg
export const M_P = 1.672622e-27; // proton mass, kg
export const C = 2.99792458e8; // speed of light, m/s
export const H = 6.62607e-34; // Planck constant, J s
export const EV = 1.602177e-19; // one electron-volt, J
export const U = 1.660539e-27; // atomic mass unit, kg
export const G = 6.674e-11; // gravitational constant, N m^2/kg^2

/** hc in eV nm (about 1240): photon energy in eV = HC_EVNM / wavelength in nm. */
export const HC_EVNM = (H * C) / EV / 1e-9;
/** Rest energy of one atomic mass unit in MeV (about 931.5). */
export const U_MEV = (U * C * C) / EV / 1e6;

// ---------- electric vs gravity ----------

/** Electric and gravitational force between two protons a distance r (m) apart, in N. */
export function protonForces(r) {
  const electric = (K * E_CHARGE * E_CHARGE) / (r * r);
  const gravity = (G * M_P * M_P) / (r * r);
  return { electric, gravity, ratio: electric / gravity };
}

/** If the gravity arrow were `gravityLength` meters long, how long would the electric arrow be (m)? */
export const electricArrowLength = (gravityLength) => gravityLength * protonForces(1).ratio;

// ---------- the actual formulas used by the scaling explorer ----------

export const coulombForce = (q1, q2, r) => (K * Math.abs(q1 * q2)) / (r * r);
export const wireField = (I, r) => (MU0 * I) / (2 * Math.PI * r);
export const plateCapacitance = (A, d) => (EPS0 * A) / d;
/** Potential of a point charge q (C) at distance r (m), in volts. */
export const pointPotential = (q, r) => (K * q) / r;
/** Resistance of a round wire: resistivity rho (ohm m), length L (m), diameter D (m). */
export const wireResistance = (rho, L, D) => (rho * L) / (Math.PI * (D / 2) ** 2);
/** Photon energy in J for wavelength lambda in m. */
export const photonEnergy = (lambda) => (H * C) / lambda;
/** Nuclei left after time t with half-life T. */
export const remaining = (N0, t, T) => N0 * 0.5 ** (t / T);

/**
 * The scaling explorer. Each law varies one input; `factor(x)` is the result relative to the start,
 * computed from the real formula with realistic base values. For power laws x MULTIPLIES the input
 * (x = 2 means "double it"); for decay x is the elapsed time in half-lives (start: t = 0).
 */
export const SCALING = {
  coulomb: {
    kind: 'power',
    power: -2,
    factor: (x) => coulombForce(1e-6, 2e-6, 0.05 * x) / coulombForce(1e-6, 2e-6, 0.05),
  },
  potential: {
    kind: 'power',
    power: -1,
    factor: (x) => pointPotential(1e-9, 0.1 * x) / pointPotential(1e-9, 0.1),
  },
  wire: {
    kind: 'power',
    power: -1,
    factor: (x) => wireField(10, 0.02 * x) / wireField(10, 0.02),
  },
  capacitor: {
    kind: 'power',
    power: -1,
    factor: (x) => plateCapacitance(0.01, 1e-3 * x) / plateCapacitance(0.01, 1e-3),
  },
  resistance: {
    kind: 'power',
    power: -2,
    factor: (x) => wireResistance(1.7e-8, 10, 1e-3 * x) / wireResistance(1.7e-8, 10, 1e-3),
  },
  photon: {
    kind: 'power',
    power: -1,
    factor: (x) => photonEnergy(500e-9 * x) / photonEnergy(500e-9),
  },
  decay: {
    kind: 'exp',
    factor: (x) => remaining(1000, 8 * x, 8) / 1000,
  },
};

export const scaleFactor = (law, x) => SCALING[law].factor(x);

/** Coulomb force factor when the charges and the distance are multiplied by the given numbers. */
export const coulombFactor = ({ q1 = 1, q2 = 1, r = 1 } = {}) => coulombForce(q1, q2, r) / coulombForce(1, 1, 1);
