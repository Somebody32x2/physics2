import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as q from '../src/model/quantum.js';

const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg ?? ''} expected ${b} +/- ${tol}, got ${a}`);

test('hc is about 1240 eV nm; photon energy, momentum, frequency agree', () => {
  near(q.HC_EV_NM, 1240, 1);
  near(q.photonEV(620), 2.0, 0.01);
  near(q.photonNM(q.photonEV(500)), 500, 1e-9);
  near(q.photonEVfromF(q.freqOf(500)), q.photonEV(500), 1e-9);
  // E = pc for a photon
  const lam = 500e-9;
  near(q.photonMomentum(lam) * q.C, q.photonEV(500) * q.E_CHARGE, 1e-21);
});

test('Wien: the Sun (5800 K) peaks near 500 nm; doubling T halves the peak wavelength', () => {
  near(q.wienPeak(5800) * 1e9, 500, 2);
  near(q.wienPeak(6000) / q.wienPeak(3000), 0.5, 1e-12);
});

test('Planck curve peaks where Wien says and grows with T at every wavelength', () => {
  for (const T of [3000, 5800, 9000]) {
    let best = 0;
    let at = 0;
    for (let nm = 100; nm <= 3000; nm += 1) {
      const b = q.planck(nm * 1e-9, T);
      if (b > best) [best, at] = [b, nm];
    }
    near(at, q.wienPeak(T) * 1e9, 2, `peak at ${T} K`);
  }
  for (const nm of [300, 600, 1500]) assert.ok(q.planck(nm * 1e-9, 6000) > q.planck(nm * 1e-9, 5000));
  // total power goes as T^4
  near(q.stefan(2 * 3000) / q.stefan(3000), 16, 1e-9);
});

test('blackbody color gets bluer as T rises; spectrum colors exist only in the visible band', () => {
  const [r1, , b1] = q.blackbodyRGB(3000);
  const [r2, , b2] = q.blackbodyRGB(10000);
  assert.ok(b1 / r1 < b2 / r2);
  assert.equal(q.spectrumRGB(300), null);
  assert.equal(q.spectrumRGB(900), null);
  const red = q.spectrumRGB(650);
  assert.ok(red[0] > red[2]);
});

test('photoelectric: threshold, KEmax = hf - phi, independent of anything else', () => {
  const na = q.metal('sodium');
  near(q.kMax(q.freqOf(400), na.phi), 3.1 - 2.28, 0.01);
  assert.equal(q.kMax(q.freqOf(700), na.phi), 0, 'red light is below the sodium threshold');
  assert.equal(q.ejects(q.freqOf(700), na.phi), false);
  near(q.thresholdNM(na.phi), 544, 1);
  // slope of KEmax vs f is h (in eV s), whatever the metal
  for (const m of q.METALS) {
    const f1 = q.thresholdF(m.phi) * 1.2;
    const f2 = f1 * 1.5;
    near((q.kMax(f2, m.phi) - q.kMax(f1, m.phi)) / (f2 - f1), q.H_EV, 1e-20);
    near(q.kMax(q.thresholdF(m.phi), m.phi), 0, 1e-9);
  }
  near(q.stoppingV(q.freqOf(400), na.phi), q.kMax(q.freqOf(400), na.phi), 1e-12);
  // 1 eV electron moves about 593 km/s
  near(q.electronSpeed(1) / 1e3, 593, 2);
});

test('Compton shift is 0 straight ahead and 2 h/(mc) straight back', () => {
  near(q.COMPTON * 1e12, 2.43, 0.01);
  near(q.comptonShift(0), 0, 1e-20);
  near(q.comptonShift(Math.PI), 2 * q.COMPTON, 1e-20);
});

test('hydrogen: levels, Balmer lines 656, 486, 434, 410 nm, ionization 13.6 eV', () => {
  near(q.levelEV(1), -13.6, 1e-12);
  near(q.levelEV(2), -3.4, 1e-12);
  const lines = q.balmer(6).map((l) => l.nm);
  [656, 486, 434, 410].forEach((nm, i) => near(lines[i], nm, 1.5));
  near(q.transitionEV(2, 1), 10.2, 1e-9);
  assert.equal(q.seriesOf(3, 2), 'Balmer');
  assert.equal(q.seriesOf(1, 4), 'Lyman');
  near(q.ionizationEV(1), 13.6, 1e-12);
  near(q.ionizationEV(2), 3.4, 1e-12);
  // emission and absorption between the same pair of levels give the same wavelength
  near(q.transitionNM(2, 5), q.transitionNM(5, 2), 1e-12);
  // energy bookkeeping: 3 -> 2 -> 1 emits the same total energy as 3 -> 1
  near(q.transitionEV(3, 2) + q.transitionEV(2, 1), q.transitionEV(3, 1), 1e-12);
  // Lyman lines are UV, Paschen lines are IR
  assert.ok(q.transitionNM(2, 1) < 380);
  assert.ok(q.transitionNM(4, 3) > 750);
});

test('Bohr standing waves close only for whole numbers', () => {
  for (const n of [1, 2, 3, 4, 5]) near(q.closureMismatch(n), 0, 1e-12);
  near(q.closureMismatch(2.5), 1, 1e-12);
  near(q.orbitRadius(2) / q.orbitRadius(1), 4, 1e-12);
});

test('de Broglie: electrons are atom-sized, baseballs absurdly small', () => {
  near(q.deBroglie(q.M_E, 1e6) * 1e10, 7.27, 0.02); // about 0.7 nm
  near(q.electronLambdaV(100) * 1e9, 0.1226, 0.001); // 1.23 nm / sqrt(V)
  assert.ok(q.deBroglie(0.145, 40) < 1e-33);
  near(q.deBroglie(q.M_E, 2e6) / q.deBroglie(q.M_E, 1e6), 0.5, 1e-12);
});

test('binding energies from measured masses: He-4 7.07, Fe-56 8.79, U-235 7.59 MeV per nucleon', () => {
  near(q.bindingPerNucleon(q.nuclide('H-2')), 1.112, 0.002);
  near(q.bindingPerNucleon(q.nuclide('He-4')), 7.074, 0.002);
  near(q.bindingPerNucleon(q.nuclide('Fe-56')), 8.790, 0.002);
  near(q.bindingPerNucleon(q.nuclide('U-235')), 7.591, 0.002);
  near(q.U_MEV * 1, 931.5, 0.1);
});

test('liquid-drop curve peaks near iron at about 8.8 MeV and matches heavy nuclei', () => {
  let best = [0, 0];
  for (let A = 4; A <= 260; A++) {
    const b = q.semfCurve(A);
    if (b > best[1]) best = [A, b];
  }
  assert.ok(best[0] >= 50 && best[0] <= 70, `peak at A = ${best[0]}`);
  near(best[1], 8.8, 0.15);
  for (const id of ['Fe-56', 'U-235', 'U-238']) near(q.semfCurve(q.nuclide(id).A), q.bindingPerNucleon(q.nuclide(id)), 0.1, id);
  near(q.stableZ(238), 92, 1.5);
  near(q.stableZ(56), 26, 1.5);
});

test('fusion and fission both release energy; D-T gives 17.6 MeV, U-235 fission ~170-200 MeV', () => {
  near(q.fusionDT(), 17.6, 0.05);
  const f = q.fissionU235();
  assert.ok(f > 150 && f < 210, `fission Q = ${f}`);
  near(q.nuclearRadius(27) * 1e15, 3.6, 1e-9);
});

test('decay rules conserve charge and nucleon number', () => {
  const U = { Z: 92, A: 238 };
  assert.deepEqual(q.decay(U, 'alpha'), { Z: 90, A: 234 });
  assert.deepEqual(q.decay({ Z: 90, A: 234 }, 'betaMinus'), { Z: 91, A: 234 });
  assert.deepEqual(q.decay({ Z: 6, A: 11 }, 'betaPlus'), { Z: 5, A: 11 });
  assert.deepEqual(q.decay(U, 'gamma'), U);
  // particle bookkeeping: daughter + emitted particle charges and nucleon numbers add back to the parent
  const emitted = { alpha: [2, 4], betaMinus: [-1, 0], betaPlus: [1, 0], gamma: [0, 0] };
  for (const [mode, [z, a]] of Object.entries(emitted)) {
    const d = q.decay(U, mode);
    assert.equal(d.Z + z, U.Z, mode);
    assert.equal(d.A + a, U.A, mode);
  }
});

test('U-238 series ends at stable lead-206 after 8 alphas and 6 betas', () => {
  const chain = q.decayChain({ Z: 92, A: 238 }, q.U238_SERIES);
  assert.equal(q.nucName(chain[1]), 'Th-234');
  assert.equal(q.nucName(chain[3]), 'U-234');
  assert.equal(q.nucName(chain.at(-1)), 'Pb-206');
  assert.equal(chain.filter((c) => c.mode === 'alpha').length, 8);
  assert.equal(chain.filter((c) => c.mode === 'betaMinus').length, 6);
});

test('decay law: half-lives, activity, carbon dating; random sample follows it', () => {
  near(q.remaining(1, 3, 1), 1 / 8, 1e-12);
  near(q.remaining(1000, 10, 10), 500, 1e-9);
  near(q.remaining(1, 7, 5), Math.exp(-q.decayConstant(5) * 7), 1e-12);
  near(q.activity(1000, 2) / q.activity(500, 2), 2, 1e-12);
  near(q.ageFromFraction(0.25, q.C14_HALF_LIFE), 11460, 1e-6);
  const lives = q.lifetimes(200000, 3);
  near(q.aliveCount(lives, 1) / lives.length, 0.5, 0.01);
  near(q.aliveCount(lives, 3) / lives.length, 0.125, 0.01);
  // same seed, same sample
  assert.deepEqual(q.lifetimes(10, 9), q.lifetimes(10, 9));
});

test('sci formats with superscript exponents', () => {
  assert.equal(q.sci(7.27e-10), '7.3 \u00d7 10<sup>\u221210</sup>');
  assert.equal(q.sci(9.99e-3), '1.0 \u00d7 10<sup>\u22122</sup>');
  assert.equal(q.sci(2.5), '2.5');
});
