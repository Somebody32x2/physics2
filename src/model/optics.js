/**
 * Optics and electromagnetic-wave model for the Light & optics chapters. Plain numbers, no DOM.
 * SI units unless a name says otherwise (nm, deg). Angles are in radians unless a name ends in Deg.
 */

// ---------- constants ----------
export const EPS0 = 8.8541878128e-12; // F/m
export const MU0 = 1.25663706212e-6; // T·m/A (≈ 4π × 10^-7)
export const C = 299792458; // m/s

/** Scientific notation as HTML: sci(2.998e8) -> '3.00 × 10<sup>8</sup>'. Minus signs use U+2212. */
export function sci(x, digits = 2) {
  if (x === 0) return '0';
  const e = Math.floor(Math.log10(Math.abs(x)));
  let m = x / 10 ** e;
  if (Math.abs(Number(m.toFixed(digits))) >= 10) return sci(Math.sign(x) * 10 ** (e + 1), digits);
  m = m.toFixed(digits);
  if (e === 0) return m;
  return `${m} \u00d7 10<sup>${e < 0 ? '\u2212' : ''}${Math.abs(e)}</sup>`;
}

const DEG = Math.PI / 180;
export const toDeg = (rad) => rad / DEG;
export const toRad = (deg) => deg * DEG;

// ---------- electromagnetic waves ----------

/** Wave speed from the two field constants: c = 1 / sqrt(mu0 eps0). */
export const lightSpeed = (mu0 = MU0, eps0 = EPS0) => 1 / Math.sqrt(mu0 * eps0);

/** c = f lambda, solved for f (Hz) or lambda (m). */
export const frequency = (lambda, v = C) => v / lambda;
export const wavelength = (f, v = C) => v / f;

/** Magnetic amplitude that goes with an electric amplitude in a light wave: B = E / c. */
export const bFromE = (E) => E / C;

/** Time-averaged intensity of a wave with peak field E0: I = c eps0 E0^2 / 2 (W/m^2). */
export const intensity = (E0) => 0.5 * C * EPS0 * E0 * E0;

/** Peak field for a given intensity (inverse of intensity). */
export const peakField = (I) => Math.sqrt((2 * I) / (C * EPS0));

/** Radiation pressure: I/c when absorbed, 2I/c when reflected (Pa). */
export const radiationPressure = (I, reflect = false) => ((reflect ? 2 : 1) * I) / C;

/** The electromagnetic spectrum by wavelength (m). Boundaries are conventional, not sharp. */
export const BANDS = [
  { name: 'Gamma rays', min: 0, max: 1e-11 },
  { name: 'X-rays', min: 1e-11, max: 1e-8 },
  { name: 'Ultraviolet', min: 1e-8, max: 400e-9 },
  { name: 'Visible', min: 400e-9, max: 700e-9 },
  { name: 'Infrared', min: 700e-9, max: 1e-3 },
  { name: 'Microwaves', min: 1e-3, max: 0.3 },
  { name: 'Radio', min: 0.3, max: Infinity },
];

export const band = (lambda) => BANDS.find((b) => lambda >= b.min && lambda < b.max) ?? BANDS[BANDS.length - 1];

/** Color name of a visible wavelength in nm (null outside 400-700 nm). */
export function colorName(nm) {
  if (nm < 400 || nm > 700) return null;
  if (nm < 450) return 'violet';
  if (nm < 495) return 'blue';
  if (nm < 570) return 'green';
  if (nm < 590) return 'yellow';
  if (nm < 620) return 'orange';
  return 'red';
}

/** Malus's law: polarized light of intensity I0 through a polarizer at angle theta to its polarization. */
export const malus = (I0, theta) => I0 * Math.cos(theta) ** 2;

/**
 * Unpolarized light of intensity I0 through a chain of polarizers with transmission axes at the given
 * angles (rad). The first one halves it; each later one applies Malus's law with the angle between
 * neighbors. Returns the intensity after each polarizer.
 */
export function polarizerChain(I0, axes) {
  const out = [];
  let I = I0;
  axes.forEach((a, i) => {
    I = i === 0 ? I / 2 : malus(I, a - axes[i - 1]);
    out.push(I);
  });
  return out;
}

// ---------- rays: reflection and refraction ----------

/** Index of refraction from the speed of light in the material: n = c / v. */
export const indexFromSpeed = (v) => C / v;
export const speedIn = (n) => C / n;

/** Snell's law n1 sin th1 = n2 sin th2. Returns th2 (rad), or null for total internal reflection. */
export function refract(n1, n2, th1) {
  const s = (n1 / n2) * Math.sin(th1);
  if (Math.abs(s) > 1) return null;
  return Math.asin(s);
}

/** Critical angle for going from n1 into n2 (rad); null when n1 <= n2 (no total internal reflection possible). */
export function criticalAngle(n1, n2) {
  if (n1 <= n2) return null;
  return Math.asin(n2 / n1);
}

/** Fraction of unpolarized light reflected at the interface (Fresnel equations); 1 under total internal reflection. */
export function reflectance(n1, n2, th1) {
  const th2 = refract(n1, n2, th1);
  if (th2 === null) return 1;
  const c1 = Math.cos(th1);
  const c2 = Math.cos(th2);
  const rs = (n1 * c1 - n2 * c2) / (n1 * c1 + n2 * c2);
  const rp = (n1 * c2 - n2 * c1) / (n1 * c2 + n2 * c1);
  return (rs * rs + rp * rp) / 2;
}

/** Common materials (visible light). */
export const MEDIA = {
  air: { name: 'air', n: 1.0 },
  water: { name: 'water', n: 1.33 },
  glass: { name: 'glass', n: 1.5 },
  diamond: { name: 'diamond', n: 2.42 },
};

// ---------- thin lenses and mirrors ----------

/**
 * Thin lens (or mirror) equation 1/f = 1/dO + 1/dI with the usual convention:
 * f > 0 converging, f < 0 diverging; dO > 0 for a real object; dI > 0 real image (opposite side of a lens),
 * dI < 0 virtual image (same side as the object). m = -dI/dO: negative = inverted.
 * dO = f gives no image (dI = ±Infinity, rays leave parallel).
 */
export function thinLens(f, dO) {
  const den = dO - f;
  const di = Math.abs(den) < 1e-9 * Math.abs(f) ? Infinity : (f * dO) / den;
  if (!Number.isFinite(di)) return { di: Infinity, m: Infinity, real: false, upright: null, none: true };
  const m = -di / dO;
  return { di, m, real: di > 0, upright: m > 0, none: false };
}

/**
 * The three principal rays from the tip of an upright object (height hO at x = -dO) through a thin lens
 * at x = 0 with focal length f. Model coordinates: x along the axis (light travels +x), y UP.
 * Each ray: { id, from: [x, y] start (object tip), hit: [0, y] where it crosses the lens, dir: [dx, dy] after
 * the lens (dx > 0) }. All outgoing rays pass through the image point (real image) or appear to come from it
 * (virtual image). Ray 'focal' is omitted when the object sits at the near focal point (it never reaches the lens).
 *   parallel: comes in parallel to the axis, leaves through the far focal point (or as if from the near one, f < 0)
 *   center:   through the center of the lens, undeviated
 *   focal:    aimed at the near focal point (x = -f), leaves parallel to the axis
 */
export function principalRays(f, dO, hO) {
  const img = thinLens(f, dO);
  const outDir = (y0) => {
    if (img.none) return [dO, -hO]; // all leave parallel to the central ray
    const s = Math.sign(img.di);
    return [s * img.di, s * (img.m * hO - y0)];
  };
  const from = [-dO, hO];
  const rays = [
    { id: 'parallel', from, hit: [0, hO] },
    { id: 'center', from, hit: [0, 0] },
  ];
  if (Math.abs(dO - f) > 1e-6 * Math.abs(f)) rays.push({ id: 'focal', from, hit: [0, (-hO * f) / (dO - f)] });
  return rays.map((r) => ({ ...r, dir: outDir(r.hit[1]) }));
}

/** Image for a mirror of radius of curvature R (concave R > 0): f = R/2, then the same equation. */
export const mirror = (R, dO) => thinLens(R / 2, dO);

// ---------- interference ----------

/** Path difference (r2 - r1) from two sources [x, y] to a point [x, y]. */
export const pathDifference = (s1, s2, P) => Math.hypot(P[0] - s2[0], P[1] - s2[1]) - Math.hypot(P[0] - s1[0], P[1] - s1[1]);

/** Relative intensity (0..1) of two equal waves with path difference delta: cos^2(pi delta / lambda). */
export const twoWaveI = (delta, lambda) => Math.cos((Math.PI * delta) / lambda) ** 2;

/** Double slit, ideal narrow slits: I/I_max = cos^2(pi d sin(theta) / lambda). */
export const doubleSlitI = (theta, lambda, d) => twoWaveI(d * Math.sin(theta), lambda);

/** Angle of the m-th bright fringe of a double slit / grating, d sin(theta) = m lambda; null if |m lambda| > d. */
export function brightAngle(m, lambda, d) {
  const s = (m * lambda) / d;
  return Math.abs(s) > 1 ? null : Math.asin(s);
}

/** Small-angle fringe spacing on a screen a distance L away: dy = lambda L / d. */
export const fringeSpacing = (lambda, L, d) => (lambda * L) / d;

/** Point on a screen at x = L (y >= 0) where r1 - r2 equals delta, for sources s1 = (0, -d/2), s2 = (0, d/2). Exact (bisection). */
export function screenPointForPath(delta, d, L) {
  const s1 = [0, -d / 2];
  const s2 = [0, d / 2];
  // For y >= 0 the point is closer to s2, and r1 - r2 grows from 0 (y = 0) toward d (y -> infinity).
  if (delta >= d) return null;
  let lo = 0;
  let hi = 1e6 * (L + d);
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    if (-pathDifference(s1, s2, [L, mid]) < delta) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/**
 * Thin film of index nf and thickness t (m) between media n1 (where the light comes from) and n3.
 * The two reflected rays differ by 2 nf t of path plus a half-wave flip at each reflection off a higher index.
 * Returns { flips (0, 1 or 2), phase (rad), I (relative reflected intensity, 0..1, two equal beams) }.
 */
export function thinFilm({ n1 = 1, nf, n3 = 1, t, lambda }) {
  const flips = (nf > n1 ? 1 : 0) + (n3 > nf ? 1 : 0);
  const phase = (2 * Math.PI * 2 * nf * t) / lambda + (flips % 2) * Math.PI;
  return { flips, phase, I: Math.cos(phase / 2) ** 2 };
}

/**
 * Wavelengths (m) in [lo, hi] that reflect most strongly from the film:
 * one flip: 2 nf t = (m + 1/2) lambda; zero or two flips: 2 nf t = m lambda.
 */
export function reinforced({ n1 = 1, nf, n3 = 1, t }, lo = 380e-9, hi = 750e-9) {
  const { flips } = thinFilm({ n1, nf, n3, t, lambda: 1 });
  const half = flips % 2 ? 0.5 : 0;
  const out = [];
  for (let m = 0; m < 50; m++) {
    const k = m + half;
    if (k <= 0) continue;
    const lam = (2 * nf * t) / k;
    if (lam < lo) break;
    if (lam <= hi) out.push(lam);
  }
  return out;
}

/** Wavelengths (m) in [lo, hi] that cancel in reflection (the opposite condition). */
export function cancelled({ n1 = 1, nf, n3 = 1, t }, lo = 380e-9, hi = 750e-9) {
  const { flips } = thinFilm({ n1, nf, n3, t, lambda: 1 });
  const half = flips % 2 ? 0 : 0.5;
  const out = [];
  for (let m = 0; m < 50; m++) {
    const k = m + half;
    if (k <= 0) continue;
    const lam = (2 * nf * t) / k;
    if (lam < lo) break;
    if (lam <= hi) out.push(lam);
  }
  return out;
}

/** Thinnest anti-reflective coating for wavelength lambda: a quarter wave in the film, t = lambda / (4 nf). */
export const quarterWave = (lambda, nf) => lambda / (4 * nf);

// ---------- diffraction ----------

export const sinc = (x) => (Math.abs(x) < 1e-9 ? 1 : Math.sin(x) / x);

/** Single slit of width a: I/I0 = sinc^2(pi a sin(theta) / lambda). */
export const singleSlitI = (theta, a, lambda) => sinc((Math.PI * a * Math.sin(theta)) / lambda) ** 2;

/** Angle of the m-th DARK fringe of a single slit, a sin(theta) = m lambda (m = ±1, ±2, ...); null if none. */
export function singleSlitDark(m, a, lambda) {
  if (m === 0) return null;
  const s = (m * lambda) / a;
  return Math.abs(s) > 1 ? null : Math.asin(s);
}

/** Small-angle full width of the central maximum on a screen at L: 2 lambda L / a. */
export const centralWidth = (lambda, L, a) => (2 * lambda * L) / a;

/**
 * N equally spaced narrow slits (grating) with spacing d: I/I_max = (sin(N beta) / (N sin beta))^2,
 * beta = pi d sin(theta) / lambda. N = 2 reproduces the double-slit cos^2.
 */
export function gratingI(theta, N, d, lambda) {
  const beta = (Math.PI * d * Math.sin(theta)) / lambda;
  const s = Math.sin(beta);
  if (Math.abs(s) < 1e-9) return 1;
  return (Math.sin(N * beta) / (N * s)) ** 2;
}

/** Real double slit: interference (cos^2) times the single-slit envelope of each slit's width a. */
export const doubleSlitFiniteI = (theta, a, d, lambda) => doubleSlitI(theta, lambda, d) * singleSlitI(theta, a, lambda);

/** Interference orders (m >= 1, up to mMax) that land on a single-slit zero and vanish: m = k d / a. */
export function missingOrders(d, a, mMax = 10) {
  const out = [];
  for (let m = 1; m <= mMax; m++) {
    const k = (m * a) / d; // the bright order m sits at the k-th envelope zero when k is a whole number
    if (Math.abs(k - Math.round(k)) < 1e-6 && Math.round(k) >= 1) out.push(m);
  }
  return out;
}

/** Rayleigh criterion: smallest resolvable angle for a circular aperture of diameter D, 1.22 lambda / D. */
export const rayleigh = (lambda, D) => (1.22 * lambda) / D;
