import { wireResistance } from '../src/model/overview.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  K, EPS0, MU0, C, HC_EVNM, U_MEV, protonForces, electricArrowLength,
  SCALING, scaleFactor, coulombFactor, wireField, plateCapacitance, photonEnergy, EV,
} from '../src/model/overview.js';

const close = (a, b, rel = 1e-3) => assert.ok(Math.abs(a - b) <= rel * Math.abs(b), `${a} vs ${b}`);

test('constants are mutually consistent', () => {
  close(K, 1 / (4 * Math.PI * EPS0));
  close(C, 1 / Math.sqrt(EPS0 * MU0));
  close(HC_EVNM, 1240, 2e-3);
  close(U_MEV, 931.5, 2e-3);
});

test('electric beats gravity by ~1.2e36 between two protons, at any distance', () => {
  const a = protonForces(1e-15);
  const b = protonForces(1);
  close(a.ratio, 1.24e36, 0.01);
  close(a.ratio, b.ratio, 1e-9);
  close(a.electric, 230, 0.01); // two protons 1 fm apart push with ~230 N
  // gravity arrow one atom wide (1e-10 m) -> electric arrow ~1e26 m (the observable universe is ~4.4e26 m)
  const L = electricArrowLength(1e-10);
  assert.ok(L > 1e26 && L < 4.4e26);
});

test('scaling explorer factors match the textbook scalings', () => {
  close(scaleFactor('coulomb', 2), 0.25);
  close(scaleFactor('coulomb', 0.5), 4);
  close(scaleFactor('potential', 2), 0.5); // V of a point charge: 1/r, not 1/r^2
  close(scaleFactor('wire', 3), 1 / 3);
  close(scaleFactor('capacitor', 0.5), 2);
  close(scaleFactor('resistance', 2), 0.25);
  close(scaleFactor('photon', 0.5), 2);
  close(scaleFactor('decay', 3), 1 / 8);
  close(scaleFactor('decay', 0), 1);
  for (const [id, law] of Object.entries(SCALING)) {
    if (law.kind === 'power') for (const x of [0.5, 1.5, 3]) close(scaleFactor(id, x), x ** law.power);
    close(scaleFactor(id, id === 'decay' ? 0 : 1), 1);
  }
});

test('decay: equal time steps multiply by equal factors', () => {
  close(scaleFactor('decay', 2.5) / scaleFactor('decay', 1.5), scaleFactor('decay', 1));
});

test('formulas give textbook numbers', () => {
  close(wireField(10, 0.02), 1e-4); // 10 A at 2 cm: 100 microtesla
  close(plateCapacitance(0.01, 1e-3), 8.854e-11);
  close(photonEnergy(500e-9) / EV, 2.48, 2e-3); // green light ~2.5 eV
  close(coulombFactor({ q1: 2, q2: 2, r: 2 }), 1);
  close(wireResistance(1.7e-8, 20, 2e-3) / wireResistance(1.7e-8, 10, 1e-3), 0.5); // R ~ L / D^2
  close(coulombFactor({ q1: 3, r: 0.5 }), 12);
});
