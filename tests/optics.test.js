import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  C, EPS0, MU0, toRad, toDeg, lightSpeed, frequency, wavelength, bFromE, intensity, peakField, radiationPressure, band, colorName,
  malus, polarizerChain, refract, criticalAngle, reflectance, thinLens, principalRays, mirror, pathDifference, twoWaveI,
  doubleSlitI, brightAngle, fringeSpacing, screenPointForPath, thinFilm, reinforced, cancelled, quarterWave, singleSlitI,
  singleSlitDark, centralWidth, gratingI, doubleSlitFiniteI, missingOrders, rayleigh,
} from '../src/model/optics.js';

const near = (a, b, tol = 1e-9) => assert.ok(Math.abs(a - b) <= tol * Math.max(1, Math.abs(b)), `${a} vs ${b}`);

test('c = 1/sqrt(mu0 eps0) comes out as the measured speed of light', () => {
  near(lightSpeed(MU0, EPS0), C, 1e-8);
  assert.ok(Math.abs(lightSpeed() - 3e8) / 3e8 < 0.001);
});

test('c = f lambda: green 500 nm light is 6 x 10^14 Hz; FM radio 100 MHz is 3 m', () => {
  near(frequency(500e-9), C / 500e-9);
  assert.ok(Math.abs(frequency(500e-9) - 6e14) / 6e14 < 0.001);
  assert.ok(Math.abs(wavelength(100e6) - 3) < 0.01);
  near(wavelength(frequency(1.234e-7)), 1.234e-7);
});

test('spectrum bands and visible colors', () => {
  assert.equal(band(550e-9).name, 'Visible');
  assert.equal(band(1e-12).name, 'Gamma rays');
  assert.equal(band(1e-10).name, 'X-rays');
  assert.equal(band(300e-9).name, 'Ultraviolet');
  assert.equal(band(10e-6).name, 'Infrared');
  assert.equal(band(0.12).name, 'Microwaves');
  assert.equal(band(3).name, 'Radio');
  assert.equal(colorName(420), 'violet');
  assert.equal(colorName(530), 'green');
  assert.equal(colorName(650), 'red');
  assert.equal(colorName(800), null);
});

test('B = E/c, intensity goes as E0^2, radiation pressure doubles on reflection', () => {
  near(bFromE(300), 300 / C);
  near(intensity(200) / intensity(100), 4);
  near(peakField(intensity(123)), 123);
  // sunlight ~1000 W/m^2 -> about 3.3 uPa absorbed
  assert.ok(Math.abs(radiationPressure(1000) - 3.34e-6) < 0.01e-6);
  near(radiationPressure(1000, true), 2 * radiationPressure(1000));
});

test("Malus's law and polarizer chains", () => {
  near(malus(1, 0), 1);
  near(malus(1, toRad(60)), 0.25);
  near(malus(1, toRad(90)), 0, 1e-12);
  const crossed = polarizerChain(1, [0, toRad(90)]);
  near(crossed[0], 0.5);
  assert.ok(crossed[1] < 1e-12, 'crossed polarizers block everything');
  const three = polarizerChain(1, [0, toRad(45), toRad(90)]);
  near(three[2], 0.125); // a middle polarizer at 45 deg lets 1/8 through
});

test("Snell's law bends toward the normal entering a slower medium; reversible", () => {
  const th2 = refract(1, 1.5, toRad(30));
  assert.ok(th2 < toRad(30));
  near(Math.sin(th2) * 1.5, Math.sin(toRad(30)));
  near(refract(1.5, 1, th2), toRad(30));
  near(refract(1.33, 1.33, 0.7), 0.7);
});

test('critical angle and total internal reflection', () => {
  near(toDeg(criticalAngle(1.5, 1)), 41.8103148958, 1e-6);
  assert.ok(Math.abs(toDeg(criticalAngle(1.33, 1)) - 48.75) < 0.01);
  assert.equal(criticalAngle(1, 1.5), null);
  const thc = criticalAngle(1.5, 1);
  assert.ok(refract(1.5, 1, thc - 1e-6) !== null);
  assert.equal(refract(1.5, 1, thc + 1e-6), null);
  near(reflectance(1.5, 1, thc + 0.01), 1);
});

test('reflectance: about 4% for glass at normal incidence, energy fraction between 0 and 1', () => {
  assert.ok(Math.abs(reflectance(1, 1.5, 0) - 0.04) < 1e-9);
  for (let a = 0; a < 89; a += 7) {
    const R = reflectance(1, 1.5, toRad(a));
    assert.ok(R >= 0 && R <= 1);
  }
  assert.ok(reflectance(1, 1.5, toRad(85)) > reflectance(1, 1.5, toRad(30)), 'grazing light reflects more');
});

test('thin lens: textbook cases', () => {
  const at2f = thinLens(10, 20);
  near(at2f.di, 20);
  near(at2f.m, -1);
  assert.ok(at2f.real && !at2f.upright);
  const far = thinLens(10, 30);
  near(far.di, 15);
  near(far.m, -0.5);
  const between = thinLens(10, 15);
  near(between.di, 30);
  near(between.m, -2);
  assert.ok(thinLens(10, 10).none, 'object at f: no image');
  const inside = thinLens(10, 5);
  near(inside.di, -10);
  near(inside.m, 2);
  assert.ok(!inside.real && inside.upright, 'magnifier: virtual, upright, enlarged');
  const div = thinLens(-10, 30);
  near(div.di, -7.5);
  assert.ok(!div.real && div.upright && div.m < 1, 'diverging lens: always virtual, upright, smaller');
  // 1/f = 1/dO + 1/dI holds
  for (const [f, d] of [[10, 25], [-8, 13], [12, 4]]) {
    const { di } = thinLens(f, d);
    near(1 / d + 1 / di, 1 / f);
  }
  near(mirror(20, 30).di, 15);
});

test('principal rays all meet at (or diverge from) the image point', () => {
  for (const [f, dO] of [[80, 240], [80, 120], [80, 50], [-80, 160], [-80, 40]]) {
    const hO = 40;
    const img = thinLens(f, dO);
    const rays = principalRays(f, dO, hO);
    assert.equal(rays.length, 3);
    for (const r of rays) {
      assert.ok(r.dir[0] > 0, 'light keeps going right');
      // line through hit with direction dir must pass through (di, m hO)
      const t = (img.di - r.hit[0]) / r.dir[0];
      near(r.hit[1] + t * r.dir[1], img.m * hO, 1e-9);
    }
    const par = rays.find((r) => r.id === 'parallel');
    // parallel ray (extended) crosses the axis at x = f
    near(par.hit[1] + (f / par.dir[0]) * par.dir[1], 0, 1e-9);
    const foc = rays.find((r) => r.id === 'focal');
    near(foc.dir[1], 0, 1e-12); // leaves parallel
    // incoming focal ray lies on the line through the near focal point (-f, 0)
    const [x0, y0] = foc.from;
    const slopeIn = (foc.hit[1] - y0) / (0 - x0);
    near(y0 + slopeIn * (-f - x0), 0, 1e-9);
  }
  const atF = principalRays(80, 80, 40);
  assert.equal(atF.length, 2);
  near(atF[0].dir[1] / atF[0].dir[0], atF[1].dir[1] / atF[1].dir[0]); // leave parallel
});

test('two-source interference: path difference m lambda bright, (m + 1/2) lambda dark', () => {
  near(twoWaveI(0, 1), 1);
  near(twoWaveI(2, 1), 1);
  assert.ok(twoWaveI(0.5, 1) < 1e-12);
  assert.ok(twoWaveI(1.5, 1) < 1e-12);
  near(pathDifference([0, 0], [0, 10], [100, 5]), 0);
});

test('double slit: bright fringes at d sin(theta) = m lambda, spacing lambda L / d', () => {
  const lam = 600e-9;
  const d = 0.2e-3;
  const th1 = brightAngle(1, lam, d);
  near(Math.sin(th1) * d, lam);
  near(doubleSlitI(th1, lam, d), 1);
  assert.ok(doubleSlitI(Math.asin((0.5 * lam) / d), lam, d) < 1e-12);
  near(fringeSpacing(lam, 1, d), 3e-3);
  near(fringeSpacing(2 * lam, 1, d) / fringeSpacing(lam, 1, d), 2);
  near(fringeSpacing(lam, 1, 2 * d) / fringeSpacing(lam, 1, d), 0.5);
  assert.equal(brightAngle(5, 1, 3), null);
});

test('screenPointForPath finds the exact screen point for a given path difference', () => {
  for (const delta of [0, 15, 30, 45]) {
    const y = screenPointForPath(delta, 200, 400);
    near(-pathDifference([0, -100], [0, 100], [400, y]), delta, 1e-7);
  }
  assert.equal(screenPointForPath(250, 200, 400), null);
});

test('thin films: phase flips and the reinforced colors', () => {
  // soap film in air: one flip
  assert.equal(thinFilm({ nf: 1.33, t: 100e-9, lambda: 500e-9 }).flips, 1);
  // MgF2 on glass: two flips
  assert.equal(thinFilm({ n1: 1, nf: 1.38, n3: 1.5, t: 100e-9, lambda: 500e-9 }).flips, 2);
  // very thin soap film looks dark (destructive): t -> 0 with one flip
  assert.ok(thinFilm({ nf: 1.33, t: 1e-10, lambda: 500e-9 }).I < 1e-3);
  // 2nt = (m+1/2) lambda for soap: t = 100 nm, n = 1.33 -> 2nt = 266 nm -> lambda = 532 nm reinforced
  const r = reinforced({ nf: 1.33, t: 100e-9 });
  assert.equal(r.length, 1);
  near(r[0], 532e-9);
  near(thinFilm({ nf: 1.33, t: 100e-9, lambda: r[0] }).I, 1);
  for (const lam of cancelled({ nf: 1.33, t: 400e-9 })) assert.ok(thinFilm({ nf: 1.33, t: 400e-9, lambda: lam }).I < 1e-12);
  // quarter-wave AR coating cancels its design wavelength
  const t = quarterWave(550e-9, 1.38);
  near(t, 99.637681e-9, 1e-6);
  assert.ok(thinFilm({ n1: 1, nf: 1.38, n3: 1.5, t, lambda: 550e-9 }).I < 1e-12);
});

test('single slit: DARK fringes at a sin(theta) = m lambda; central max twice as wide', () => {
  const a = 0.1e-3;
  const lam = 500e-9;
  near(singleSlitI(0, a, lam), 1);
  for (const m of [1, 2, -1, 3]) assert.ok(singleSlitI(singleSlitDark(m, a, lam), a, lam) < 1e-20);
  assert.equal(singleSlitDark(0, a, lam), null);
  near(centralWidth(lam, 1, a), 0.01);
  near(centralWidth(lam, 1, a / 2), 0.02); // narrower slit, wider pattern
  // first secondary max is weak (~4.7%)
  const sec = singleSlitI(Math.asin((1.43 * lam) / a), a, lam);
  assert.ok(sec > 0.045 && sec < 0.05);
});

test('gratings: N = 2 is the double slit; more slits keep peak positions and sharpen them', () => {
  const d = 2e-6;
  const lam = 500e-9;
  for (const th of [0.01, 0.1, 0.2, 0.33]) near(gratingI(th, 2, d, lam), doubleSlitI(th, lam, d));
  for (const N of [2, 5, 20]) near(gratingI(brightAngle(1, lam, d), N, d, lam), 1, 1e-6);
  // width: first zero next to the m = 0 peak is at sin(theta) = lambda / (N d)
  for (const N of [5, 20]) assert.ok(gratingI(Math.asin(lam / (N * d)), N, d, lam) < 1e-12);
  // halfway between peaks: double slit dark, 5 slits has a small secondary max, not a principal one
  const mid = Math.asin((0.5 * lam) / d);
  assert.ok(gratingI(mid, 5, d, lam) < 0.05);
});

test('double slit with finite width: envelope times cos^2; missing orders when d/a is whole', () => {
  const lam = 600e-9;
  const a = 20e-6;
  const d = 60e-6;
  const th3 = brightAngle(3, lam, d);
  assert.ok(doubleSlitFiniteI(th3, a, d, lam) < 1e-20, 'm = 3 falls on the first envelope zero');
  assert.deepEqual(missingOrders(d, a, 9), [3, 6, 9]);
  assert.deepEqual(missingOrders(50e-6, 20e-6, 9), [5]);
  const th1 = brightAngle(1, lam, d);
  near(doubleSlitFiniteI(th1, a, d, lam), singleSlitI(th1, a, lam));
});

test('Rayleigh: 1.22 lambda / D', () => {
  near(rayleigh(550e-9, 0.005), 1.342e-4, 1e-9);
  near(rayleigh(550e-9, 0.01) / rayleigh(550e-9, 0.005), 0.5);
});
