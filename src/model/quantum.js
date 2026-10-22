/**
 * Early quantum theory and nuclear physics (chapters "Photons", "Atoms & matter waves", "Nuclear physics").
 * Plain numbers in SI unless a name says otherwise (eV, nm, MeV, u). No DOM, so tests import it.
 */

// ---------- constants ----------
export const H = 6.626e-34; // Planck's constant, J s
export const HBAR = H / (2 * Math.PI);
export const C = 2.998e8; // speed of light, m/s
export const E_CHARGE = 1.602e-19; // elementary charge, C (also J per eV)
export const K_B = 1.381e-23; // Boltzmann constant, J/K
export const M_E = 9.109e-31; // electron mass, kg
export const M_P = 1.673e-27; // proton mass, kg
export const WIEN = 2.898e-3; // Wien's constant, m K
export const SIGMA = 5.67e-8; // Stefan-Boltzmann constant, W/(m^2 K^4)
export const HC_EV_NM = (H * C) / E_CHARGE / 1e-9; // ~1240 eV nm
export const H_EV = H / E_CHARGE; // Planck's constant in eV s (~4.14e-15)

// ---------- blackbody ----------

/** Planck's law: spectral radiance B(lambda, T) in W / (m^2 sr m), lambda in m. */
export function planck(lambda, T) {
  const x = (H * C) / (lambda * K_B * T);
  if (x > 700) return 0;
  return (2 * H * C * C) / lambda ** 5 / Math.expm1(x);
}

/** Wien's displacement law: wavelength (m) where the blackbody curve peaks. */
export const wienPeak = (T) => WIEN / T;

/** Stefan-Boltzmann: power radiated per square meter of a blackbody surface, sigma T^4 (W/m^2). */
export const stefan = (T) => SIGMA * T ** 4;

/**
 * Approximate sRGB color of a blackbody at temperature T (K), as 'rgb(r, g, b)'.
 * Curve fit to the CIE chromaticity of the Planck locus (Tanner Helland), good for 1000-40000 K.
 */
export function blackbodyRGB(T) {
  const t = T / 100;
  const clamp = (v) => Math.round(Math.max(0, Math.min(255, v)));
  const r = t <= 66 ? 255 : 329.698727446 * (t - 60) ** -0.1332047592;
  const g = t <= 66 ? 99.4708025861 * Math.log(t) - 161.1195681661 : 288.1221695283 * (t - 60) ** -0.0755148492;
  const b = t >= 66 ? 255 : t <= 19 ? 0 : 138.5177312231 * Math.log(t - 10) - 305.0447927307;
  return [clamp(r), clamp(g), clamp(b)];
}

/**
 * Approximate sRGB color of a single visible wavelength (nm), [r, g, b] 0..255; null outside 380-750 nm.
 * Piecewise-linear fit (Bruton), dimmed near the ends where the eye is insensitive.
 */
export function spectrumRGB(nm) {
  if (nm < 380 || nm > 750) return null;
  let r = 0;
  let g = 0;
  let b = 0;
  if (nm < 440) [r, b] = [(440 - nm) / 60, 1];
  else if (nm < 490) [g, b] = [(nm - 440) / 50, 1];
  else if (nm < 510) [g, b] = [1, (510 - nm) / 20];
  else if (nm < 580) [r, g] = [(nm - 510) / 70, 1];
  else if (nm < 645) [r, g] = [1, (645 - nm) / 65];
  else r = 1;
  const f = nm < 420 ? 0.3 + (0.7 * (nm - 380)) / 40 : nm > 700 ? 0.3 + (0.7 * (750 - nm)) / 50 : 1;
  const ch = (v) => Math.round(255 * (v * f) ** 0.8);
  return [ch(r), ch(g), ch(b)];
}

/** CSS color for light of wavelength nm: its visible color, or a fixed violet-grey for UV and dark red for IR. */
export function lightColor(nm) {
  const c = spectrumRGB(nm);
  if (c) return `rgb(${c.join(',')})`;
  return nm < 380 ? 'rgb(118,92,160)' : 'rgb(120,40,40)';
}

// ---------- photons ----------

/** Photon energy in eV from wavelength in nm: E = hc / lambda (~1240 / lambda). */
export const photonEV = (nm) => HC_EV_NM / nm;
/** Wavelength in nm of a photon with energy E (eV). */
export const photonNM = (eV) => HC_EV_NM / eV;
/** Photon energy in eV from frequency in Hz: E = hf. */
export const photonEVfromF = (f) => H_EV * f;
/** Frequency (Hz) of light with wavelength nm. */
export const freqOf = (nm) => C / (nm * 1e-9);
/** Wavelength (nm) of light with frequency f (Hz). */
export const nmOf = (f) => C / f / 1e-9;
/** Photon momentum p = h / lambda (kg m/s), lambda in m. */
export const photonMomentum = (lambda) => H / lambda;

/** Work functions (eV) of common photocathode metals. */
export const METALS = [
  { id: 'sodium', name: 'Sodium', phi: 2.28 },
  { id: 'calcium', name: 'Calcium', phi: 2.87 },
  { id: 'zinc', name: 'Zinc', phi: 4.31 },
  { id: 'platinum', name: 'Platinum', phi: 5.65 },
];
export const metal = (id) => METALS.find((m) => m.id === id);

/** Threshold frequency (Hz) for a work function phi (eV): h f0 = phi. */
export const thresholdF = (phi) => phi / H_EV;
/** Threshold (longest) wavelength in nm that can eject electrons. */
export const thresholdNM = (phi) => HC_EV_NM / phi;

/** Photoelectric effect: max kinetic energy (eV) of ejected electrons, hf - phi; 0 means none are ejected. */
export const kMax = (f, phi) => Math.max(0, photonEVfromF(f) - phi);
/** True if light of frequency f ejects any electrons from a metal with work function phi. */
export const ejects = (f, phi) => photonEVfromF(f) > phi;
/** Stopping potential (V): e V0 = KEmax, so V0 in volts equals KEmax in eV. */
export const stoppingV = (f, phi) => kMax(f, phi);

/** Speed (m/s) of an electron with kinetic energy KE in eV (non-relativistic). */
export const electronSpeed = (keEV) => Math.sqrt((2 * keEV * E_CHARGE) / M_E);

/** Photons per second in a beam of power P (W) and wavelength nm: P / (hf). */
export const photonRate = (P, nm) => P / (photonEV(nm) * E_CHARGE);

/** Compton wavelength of the electron h / (m c), m. */
export const COMPTON = H / (M_E * C);
/** Compton shift (m) for a photon scattered by an angle theta off a free electron. */
export const comptonShift = (theta) => COMPTON * (1 - Math.cos(theta));

// ---------- hydrogen (Bohr) ----------

export const RYD_EV = 13.6; // hydrogen ground-state binding energy, eV
/** Energy (eV) of hydrogen level n: -13.6 / n^2. */
export const levelEV = (n) => -RYD_EV / (n * n);
/** Bohr radius (m) and orbit radius r_n = n^2 a0. */
export const A0 = 5.29e-11;
export const orbitRadius = (n) => n * n * A0;

/** Energy (eV) of the photon for a jump between levels a and b (either order). */
export const transitionEV = (a, b) => Math.abs(levelEV(a) - levelEV(b));
/** Wavelength (nm) of the photon for a jump between levels a and b. */
export const transitionNM = (a, b) => photonNM(transitionEV(a, b));

export const SERIES = { 1: 'Lyman', 2: 'Balmer', 3: 'Paschen', 4: 'Brackett', 5: 'Pfund' };
/** Series name by the LOWER level of the jump. */
export const seriesOf = (a, b) => SERIES[Math.min(a, b)] ?? `n = ${Math.min(a, b)}`;

/** Balmer lines (nm) from n = 3..nMax down to 2. */
export const balmer = (nMax = 6) => Array.from({ length: nMax - 2 }, (_, i) => ({ n: i + 3, nm: transitionNM(i + 3, 2) }));

/** Ionization energy (eV) from level n. */
export const ionizationEV = (n = 1) => -levelEV(n);

/** Line spectra (nm, visible part, strongest lines). Hydrogen is computed from Bohr; the others are measured data. */
export const SPECTRA = [
  { id: 'H', name: 'Hydrogen', lines: balmer(6).map((l) => l.nm) },
  { id: 'He', name: 'Helium', lines: [447.1, 471.3, 492.2, 501.6, 587.6, 667.8, 706.5] },
  { id: 'Na', name: 'Sodium', lines: [589.0, 589.6] },
  { id: 'Hg', name: 'Mercury', lines: [404.7, 435.8, 546.1, 577.0, 579.1] },
  { id: 'Ne', name: 'Neon', lines: [585.2, 588.2, 594.5, 603.0, 607.4, 614.3, 616.4, 621.7, 626.6, 633.4, 638.3, 640.2, 650.7, 659.9, 692.9, 703.2] },
];

/**
 * A wave of n wavelengths around a circle (Bohr's picture). Returns the mismatch at the starting point:
 * 0 for whole numbers (the wave joins itself smoothly), up to 1 when it arrives exactly out of phase.
 */
export const closureMismatch = (n) => Math.abs(Math.sin(Math.PI * n));

// ---------- matter waves ----------

/** de Broglie wavelength lambda = h / (m v), m. */
export const deBroglie = (m, v) => H / (m * v);
/** de Broglie wavelength (m) of an electron accelerated from rest through V volts. */
export const electronLambdaV = (V) => H / Math.sqrt(2 * M_E * E_CHARGE * V);

export const OBJECTS = [
  { id: 'electron', name: 'Electron', m: M_E },
  { id: 'proton', name: 'Proton', m: M_P },
  { id: 'c60', name: 'Buckyball C<sub>60</sub>', m: 720 * 1.6605e-27 },
  { id: 'dust', name: 'Dust grain (1 \u03bcm)', m: 1e-15 },
  { id: 'baseball', name: 'Baseball', m: 0.145 },
];

/** Heisenberg: smallest momentum spread (kg m/s) for a position spread dx (m), hbar / (2 dx). */
export const minDeltaP = (dx) => HBAR / (2 * dx);

// ---------- nuclear ----------

export const U_MEV = 931.494; // 1 u of mass = 931.494 MeV of energy
export const M_H1 = 1.00782503; // hydrogen-1 ATOM (proton + electron), u
export const M_N = 1.00866492; // neutron, u

const SYMBOLS = ['n', 'H', 'He', 'Li', 'Be', 'B', 'C', 'N', 'O', 'F', 'Ne'];
const HEAVY = { 26: 'Fe', 28: 'Ni', 36: 'Kr', 56: 'Ba', 80: 'Hg', 81: 'Tl', 82: 'Pb', 83: 'Bi', 84: 'Po', 85: 'At', 86: 'Rn', 87: 'Fr', 88: 'Ra', 89: 'Ac', 90: 'Th', 91: 'Pa', 92: 'U', 93: 'Np', 94: 'Pu' };
export const symbol = (Z) => SYMBOLS[Z] ?? HEAVY[Z] ?? `Z${Z}`;
export const ELEMENT_NAMES = { 82: 'lead', 83: 'bismuth', 84: 'polonium', 86: 'radon', 88: 'radium', 90: 'thorium', 91: 'protactinium', 92: 'uranium' };

/** Measured ATOMIC masses (u) of a few nuclides (AME). Atomic masses include Z electrons, which cancel against M_H1. */
export const NUCLIDES = [
  { id: 'H-2', Z: 1, A: 2, mass: 2.01410178 },
  { id: 'H-3', Z: 1, A: 3, mass: 3.01604928 },
  { id: 'He-4', Z: 2, A: 4, mass: 4.00260325 },
  { id: 'Li-6', Z: 3, A: 6, mass: 6.0151229 },
  { id: 'C-12', Z: 6, A: 12, mass: 12 },
  { id: 'O-16', Z: 8, A: 16, mass: 15.99491462 },
  { id: 'Fe-56', Z: 26, A: 56, mass: 55.9349375 },
  { id: 'Ni-62', Z: 28, A: 62, mass: 61.9283451 },
  { id: 'Kr-92', Z: 36, A: 92, mass: 91.9261731 },
  { id: 'Ba-141', Z: 56, A: 141, mass: 140.9144033 },
  { id: 'U-235', Z: 92, A: 235, mass: 235.0439299 },
  { id: 'U-238', Z: 92, A: 238, mass: 238.0507882 },
];
export const nuclide = (id) => NUCLIDES.find((n) => n.id === id);

/** Mass defect (u): mass of the separate protons (as H atoms) and neutrons minus the mass of the atom. */
export const massDefect = ({ Z, A, mass }) => Z * M_H1 + (A - Z) * M_N - mass;
/** Binding energy (MeV) from the mass defect: E = (dm) c^2. */
export const bindingEnergy = (nuc) => massDefect(nuc) * U_MEV;
export const bindingPerNucleon = (nuc) => bindingEnergy(nuc) / nuc.A;

/** Semi-empirical (liquid-drop) mass formula coefficients, MeV. */
export const SEMF = { aV: 15.8, aS: 18.3, aC: 0.714, aA: 23.2, aP: 12 };

/** Liquid-drop binding energy (MeV) of a nucleus (Z, A): volume - surface - Coulomb - asymmetry +/- pairing. */
export function semfB(Z, A, { pairing = true } = {}) {
  const { aV, aS, aC, aA, aP } = SEMF;
  const N = A - Z;
  let B = aV * A - aS * A ** (2 / 3) - (aC * Z * (Z - 1)) / A ** (1 / 3) - (aA * (A - 2 * Z) ** 2) / A;
  if (pairing && A % 2 === 0) B += (Z % 2 === 0 && N % 2 === 0 ? 1 : -1) * (aP / Math.sqrt(A));
  return B;
}

/** Most tightly bound Z for a given A (continuous; the valley of stability). */
export function stableZ(A) {
  const { aC, aA } = SEMF;
  // dB/dZ = 0 with Z(Z-1) ~ Z^2 - Z: Z = (4 aA + aC A^(-1/3)) / (8 aA / A + 2 aC A^(-1/3))
  const c = aC / A ** (1 / 3);
  return (4 * aA + c) / ((8 * aA) / A + 2 * c);
}

/** Smooth liquid-drop B/A (MeV) along the valley of stability (no pairing term). */
export const semfCurve = (A) => semfB(stableZ(A), A, { pairing: false }) / A;

/** Energy released (MeV) by a reaction, from atomic masses: (mass before - mass after) c^2. Positive = released. */
export const reactionQ = (before, after) => (before.reduce((s, m) => s + m, 0) - after.reduce((s, m) => s + m, 0)) * U_MEV;

/** D + T -> He-4 + n */
export const fusionDT = () => reactionQ([nuclide('H-2').mass, nuclide('H-3').mass], [nuclide('He-4').mass, M_N]);
/** n + U-235 -> Ba-141 + Kr-92 + 3 n */
export const fissionU235 = () => reactionQ([M_N, nuclide('U-235').mass], [nuclide('Ba-141').mass, nuclide('Kr-92').mass, 3 * M_N]);

/** Nuclear radius (m), R = R0 A^(1/3) with R0 = 1.2 fm. */
export const nuclearRadius = (A) => 1.2e-15 * Math.cbrt(A);

// ---------- decay rules ----------

/** How each decay changes (Z, A), and what comes out. */
export const DECAYS = {
  alpha: { name: 'alpha', dZ: -2, dA: -4, emits: 'He-4 nucleus (2p + 2n)' },
  betaMinus: { name: 'beta\u2212', dZ: 1, dA: 0, emits: 'electron + antineutrino (n \u2192 p)' },
  betaPlus: { name: 'beta+', dZ: -1, dA: 0, emits: 'positron + neutrino (p \u2192 n)' },
  gamma: { name: 'gamma', dZ: 0, dA: 0, emits: 'high-energy photon' },
};

/** Daughter nucleus after a decay. */
export function decay({ Z, A }, mode) {
  const d = DECAYS[mode];
  return { Z: Z + d.dZ, A: A + d.dA };
}

/** Label like 'U-238'. */
export const nucName = ({ Z, A }) => `${symbol(Z)}-${A}`;

/** The uranium-238 series down to stable lead-206, with half-lives (measured data). */
export const U238_SERIES = [
  ['alpha', '4.5 billion years'],
  ['betaMinus', '24 days'],
  ['betaMinus', '1.2 minutes'],
  ['alpha', '245,000 years'],
  ['alpha', '75,000 years'],
  ['alpha', '1,600 years'],
  ['alpha', '3.8 days'],
  ['alpha', '3.1 minutes'],
  ['betaMinus', '27 minutes'],
  ['betaMinus', '20 minutes'],
  ['alpha', '160 microseconds'],
  ['betaMinus', '22 years'],
  ['betaMinus', '5.0 days'],
  ['alpha', '138 days'],
];

/** Apply decay modes in order from a parent: returns [{ Z, A, N, mode, halfLife }] starting with the parent. */
export function decayChain(parent, steps) {
  const out = [{ ...parent, N: parent.A - parent.Z, mode: null, halfLife: null }];
  let cur = parent;
  for (const [mode, halfLife] of steps) {
    cur = decay(cur, mode);
    out.push({ ...cur, N: cur.A - cur.Z, mode, halfLife });
  }
  return out;
}

// ---------- decay law ----------

/** Decay constant lambda = ln 2 / T_half. */
export const decayConstant = (Thalf) => Math.LN2 / Thalf;
/** Number left: N0 (1/2)^(t / T) = N0 e^(-lambda t). */
export const remaining = (N0, t, Thalf) => N0 * 2 ** (-t / Thalf);
/** Activity (decays per unit time) R = lambda N. */
export const activity = (N, Thalf) => decayConstant(Thalf) * N;
/** Time for the fraction left to fall to `frac`: t = T log2(1 / frac). */
export const ageFromFraction = (frac, Thalf) => Thalf * Math.log2(1 / frac);
export const C14_HALF_LIFE = 5730; // years

/** Deterministic PRNG (mulberry32): returns () => uniform [0, 1). */
export function rng(seed = 1) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Random lifetimes, in units of the half-life, for n identical nuclei. Each nucleus survives a half-life
 * with probability 1/2 independently, so lifetime = log2(1 / u) for uniform u (an exponential distribution).
 */
export function lifetimes(n, seed = 7) {
  const r = rng(seed);
  return Array.from({ length: n }, () => Math.log2(1 / (1 - r())));
}

/** How many of the given lifetimes (half-lives) are still intact after `halves` half-lives. */
export const aliveCount = (lives, halves) => lives.reduce((s, L) => s + (L > halves ? 1 : 0), 0);

// ---------- formatting (plain strings, no DOM) ----------

/** 7.3e-10 -> '7.3 \u00d7 10<sup>\u221210</sup>' (markup for Draw text and HTML). */
export function sci(x, digits = 2) {
  if (x === 0) return '0';
  const e = Math.floor(Math.log10(Math.abs(x)));
  const m = x / 10 ** e;
  const ms = m.toPrecision(digits);
  if (ms.startsWith('10')) return sci(10 ** (e + 1), digits);
  if (e === 0) return ms;
  return `${ms} \u00d7 10<sup>${e < 0 ? '\u2212' : ''}${Math.abs(e)}</sup>`;
}
