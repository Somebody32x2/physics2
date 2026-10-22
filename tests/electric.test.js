import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  K, EPS0, E_CHARGE, M_E, M_P, pointE, forceInField, zeroFieldBetween, lineE, sheetE, platesE, sphereE, deflection,
  flux, gaussFlux, pointV, potentialEnergy, uniformDeltaV, accelerate, enclosed, circleCrossings, radialLines,
  conductorSphereField, coulomb, FIG_VOLTS, FIG_FIELD, idealPlates,
} from '../src/model/electric.js';
import { pointField, pointPotential, chargeFieldLines } from '../src/model/fields.js';

const close = (a, b, rel = 1e-3) => Math.abs(a - b) <= rel * Math.abs(b);

test('point-charge field: textbook value and inverse square', () => {
  assert.ok(close(pointE(1e-9, 1), 8.99)); // 1 nC at 1 m
  assert.ok(close(pointE(2e-6, 0.3), 2e5, 2e-3)); // 2 uC at 30 cm: 2.0e5 N/C
  assert.ok(close(pointE(1, 2) / pointE(1, 6), 9));
  // E = F / q: the field times a test charge gives the Coulomb force
  assert.ok(close(forceInField(3e-9, pointE(5e-6, 0.2)), coulomb(3e-9, 5e-6, 0.2)));
});

test('zero-field point between like charges sits nearer the smaller charge', () => {
  assert.ok(close(zeroFieldBetween(1, 4, 0.9), 0.3));
  const x = zeroFieldBetween(2, 5, 1);
  const E = pointField([{ x: 0, y: 0, q: 2 }, { x: 1, y: 0, q: 5 }]);
  assert.ok(Math.abs(E(x, 0)[0]) < 1e-9);
  assert.equal(zeroFieldBetween(3, 3, 2), 1);
});

test('symmetry results: sphere 1/r^2, line 1/r, sheet constant, plates twice a sheet', () => {
  assert.ok(close(lineE(1e-9, 0.02) / lineE(1e-9, 0.06), 3));
  assert.equal(sheetE(1e-6), sheetE(-1e-6));
  assert.ok(close(platesE(1e-6), 2 * sheetE(1e-6)));
  assert.equal(sphereE(1e-9, 0.05, 0.1), 0); // inside a charged shell/conductor
  assert.ok(close(sphereE(1e-9, 0.2, 0.1), pointE(1e-9, 0.2)));
  assert.ok(close(sphereE(1e-9, 0.05, 0.1, { shell: false }), pointE(1e-9, 0.1) / 2)); // solid ball: grows linearly inside
});

test("Gauss's law reproduces Coulomb (K and EPS0 agree)", () => {
  const Q = 3e-9;
  for (const r of [0.1, 1, 7]) assert.ok(close(pointE(Q, r) * 4 * Math.PI * r * r, gaussFlux(Q), 2e-3));
  const lam = 2e-9;
  const L = 0.5;
  const r = 0.03;
  assert.ok(close(lineE(lam, r) * 2 * Math.PI * r * L, gaussFlux(lam * L), 2e-3));
  assert.ok(close(K, 1 / (4 * Math.PI * EPS0), 2e-3));
});

test('flux through a flat area goes as cos(theta)', () => {
  assert.equal(flux(100, 2, 0), 200);
  assert.ok(Math.abs(flux(100, 2, Math.PI / 2)) < 1e-12);
  assert.ok(close(flux(100, 2, Math.PI / 3), 100));
});

test('electron between deflection plates: projectile motion', () => {
  const r = deflection({ V: 300, d: 0.02, L: 0.05, v0: 2.5e7 });
  assert.ok(close(r.E, 1.5e4));
  assert.ok(close(r.a, (E_CHARGE * 1.5e4) / M_E));
  assert.ok(r.a / 9.8 > 1e13, 'gravity is negligible');
  assert.ok(close(r.t, 2e-9));
  assert.ok(close(r.y, 0.5 * r.a * r.t * r.t));
  assert.equal(r.hits, false);
  const fast = deflection({ V: 300, d: 0.02, L: 0.05, v0: 5e7 });
  assert.ok(close(r.y / fast.y, 4), 'twice the speed: a quarter of the deflection');
  const hit = deflection({ V: 900, d: 0.02, L: 0.05, v0: 1.5e7 });
  assert.equal(hit.hits, true);
  assert.ok(hit.xHit < 0.05 && close(0.5 * hit.a * hit.tHit ** 2, 0.01));
});

test('potential: scalar sum, zero at the dipole midpoint, E = -dV/dx', () => {
  assert.ok(close(pointV(1e-9, 0.1), 89.9));
  assert.equal(pointV(1e-9, 0.1) + pointV(-1e-9, 0.1), 0);
  const q = 2e-9;
  const x = 0.3;
  const h = 1e-6;
  const slope = (pointV(q, x + h) - pointV(q, x - h)) / (2 * h);
  assert.ok(close(-slope, pointE(q, x), 1e-6));
  assert.equal(uniformDeltaV(1e4, 0.02), 200);
  assert.ok(close(potentialEnergy(-E_CHARGE, 100), -1.602e-17));
  // equipotentials are perpendicular to field lines (figure units)
  const cs = [{ x: 0, y: 0, q: 1 }, { x: 100, y: 30, q: -2 }];
  const E = pointField(cs);
  const V = pointPotential(cs);
  const [ex, ey] = E(40, 60);
  const t = [-ey, ex]; // perpendicular to E
  const n = Math.hypot(...t);
  assert.ok(Math.abs(V(40 + (t[0] / n) * 1e-4, 60 + (t[1] / n) * 1e-4) - V(40, 60)) < 1e-9);
});

test('accelerating through a potential difference: K = -q dV', () => {
  const e = accelerate(-E_CHARGE, 1000, M_E); // electron to a point 1000 V higher
  assert.ok(close(e.eV, 1000));
  assert.ok(close(e.v, 1.875e7, 2e-3));
  const p = accelerate(E_CHARGE, -1000, M_P); // proton falls 1000 V
  assert.ok(close(p.eV, 1000));
  assert.ok(close(e.v / p.v, Math.sqrt(M_P / M_E)));
  assert.ok(accelerate(E_CHARGE, 1000, M_P).K < 0, 'a proton cannot climb on its own');
});

test('Gauss bookkeeping: per-charge line counts give out - in = n Q_enc for any circle', () => {
  const cs = [{ x: 190, y: 190, q: 2 }, { x: 400, y: 110, q: -1 }, { x: 460, y: 270, q: 1 }];
  const n = 8;
  const lines = radialLines(cs, { perUnit: n });
  const circles = [
    { x: 190, y: 190, r: 60 }, { x: 420, y: 190, r: 120 }, { x: 320, y: 190, r: 260 },
    { x: 300, y: 300, r: 40 }, { x: 400, y: 110, r: 30 }, { x: 290, y: 150, r: 125 },
  ];
  for (const c of circles) {
    const k = circleCrossings(lines, cs, c);
    assert.equal(k.out - k.in, n * enclosed(cs, c), JSON.stringify(c));
  }
  // an outside charge's lines go in and come back out
  const lone = circleCrossings(radialLines([{ x: 0, y: 0, q: 1 }], { perUnit: n }), [{ x: 0, y: 0, q: 1 }], { x: 200, y: 0, r: 80 });
  assert.equal(lone.out, lone.in);
  assert.ok(lone.in > 0);
});

test('real field lines: crossings follow the lines born and dying inside', () => {
  const cs = [{ x: 200, y: 180, q: 2 }, { x: 420, y: 180, q: -1 }];
  const lines = chargeFieldLines(cs, { perUnit: 8, bounds: [-600, -600, 1200, 900], ds: 3, maxSteps: 4000 });
  const k = circleCrossings(lines, cs, { x: 200, y: 180, r: 70 });
  assert.equal(k.out - k.in, 16);
});

test('conductor in a uniform field: zero inside, perpendicular at the surface, undisturbed far away', () => {
  const R = 60;
  const f = conductorSphereField(1, R, 1);
  assert.deepEqual(f(10, -20), [0, 0]);
  assert.deepEqual(conductorSphereField(1, R, 0.25)(0, 0), [0.75, 0]);
  for (const th of [0.3, 1, 2, 2.8, -1.2]) {
    const x = (R + 1e-6) * Math.cos(th);
    const y = (R + 1e-6) * Math.sin(th);
    const [ex, ey] = f(x, y);
    const tangential = -ex * Math.sin(th) + ey * Math.cos(th);
    assert.ok(Math.abs(tangential) < 1e-5, `theta ${th}`);
  }
  const [fx, fy] = f(5000, 3000);
  assert.ok(Math.abs(fx - 1) < 1e-3 && Math.abs(fy) < 1e-3);
});

test('figure-unit conversions (nC, mm) and ideal plates', () => {
  assert.ok(close(FIG_VOLTS * pointPotential([{ x: 0, y: 0, q: 1 }])(100, 0), pointV(1e-9, 0.1)));
  assert.ok(close(FIG_FIELD * pointField([{ x: 0, y: 0, q: 2 }])(0, 50)[1], pointE(2e-9, 0.05)));
  const pl = idealPlates({ x1: 200, x2: 400, V1: 50, V2: -50 });
  assert.equal(pl.V(100), 50);
  assert.equal(pl.V(300), 0);
  assert.equal(pl.V(500), -50);
  assert.equal(pl.E(300)[0], 0.5); // 100 V over 200 units, pointing toward lower V (+x)
  assert.equal(pl.E(450)[0], 0);
});
