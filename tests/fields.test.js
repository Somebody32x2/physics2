import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pointField, pointPotential, forceOn, wireField, traceLine, chargeFieldLines, isolines } from '../src/model/fields.js';

test('a positive charge pushes outward with inverse-square strength', () => {
  const E = pointField([{ x: 0, y: 0, q: 1 }]);
  const [ex1, ey1] = E(10, 0);
  const [ex2] = E(20, 0);
  assert.ok(ex1 > 0 && Math.abs(ey1) < 1e-12);
  assert.ok(Math.abs(ex1 / ex2 - 4) < 1e-9, 'doubling r quarters E');
});

test('superposition: midpoint of equal like charges has zero field, unlike charges do not', () => {
  const like = pointField([{ x: -50, y: 0, q: 1 }, { x: 50, y: 0, q: 1 }]);
  assert.ok(Math.hypot(...like(0, 0)) < 1e-12);
  const dipole = pointField([{ x: -50, y: 0, q: 1 }, { x: 50, y: 0, q: -1 }]);
  const [ex] = dipole(0, 0);
  assert.ok(ex > 0, 'field points from + toward -');
});

test('potential is a scalar sum; dipole midplane is V = 0', () => {
  const V = pointPotential([{ x: -50, y: 0, q: 1 }, { x: 50, y: 0, q: -1 }]);
  for (const y of [-80, 0, 37]) assert.ok(Math.abs(V(0, y)) < 1e-12);
  assert.ok(V(-20, 0) > 0 && V(20, 0) < 0);
});

test('E points downhill in V (E = -grad V)', () => {
  const charges = [{ x: -40, y: 10, q: 2 }, { x: 60, y: -30, q: -1 }];
  const E = pointField(charges);
  const V = pointPotential(charges);
  const h = 1e-3;
  for (const [x, y] of [[0, 0], [30, 40], [-90, -20]]) {
    const gx = (V(x + h, y) - V(x - h, y)) / (2 * h);
    const gy = (V(x, y + h) - V(x, y - h)) / (2 * h);
    const [ex, ey] = E(x, y);
    assert.ok(Math.abs(ex + gx) < 1e-6 && Math.abs(ey + gy) < 1e-6);
  }
});

test("Newton's third law for Coulomb forces", () => {
  const cs = [{ x: 0, y: 0, q: 2 }, { x: 30, y: 40, q: -3 }];
  const f0 = forceOn(cs, 0);
  const f1 = forceOn(cs, 1);
  assert.ok(Math.abs(f0[0] + f1[0]) < 1e-12 && Math.abs(f0[1] + f1[1]) < 1e-12);
  assert.ok(f0[0] > 0 && f0[1] > 0, 'unlike charges attract');
});

test('wire field circles counterclockwise (current out of page), strength 1/r', () => {
  const B = wireField([{ x: 0, y: 0, I: 1 }]);
  const [bx, by] = B(10, 0); // right of the wire
  assert.ok(Math.abs(bx) < 1e-12 && by < 0, 'points up the screen (y down)');
  assert.ok(Math.abs(Math.hypot(...B(10, 0)) / Math.hypot(...B(20, 0)) - 2) < 1e-9);
});

test('dipole field lines leave + and end on -', () => {
  const charges = [{ x: -60, y: 0, q: 1 }, { x: 60, y: 0, q: -1 }];
  const lines = chargeFieldLines(charges, { perUnit: 8, bounds: [-400, -400, 400, 400] });
  assert.equal(lines.length, 8);
  const ending = lines.filter(({ pts }) => {
    const [x, y] = pts.at(-1);
    return Math.hypot(x - 60, y) < 16;
  });
  assert.ok(ending.length >= 6, `most lines end on the negative charge (${ending.length})`);
});

test('negative-only lines point inward', () => {
  const lines = chargeFieldLines([{ x: 0, y: 0, q: -1 }], { perUnit: 4, bounds: [-200, -200, 200, 200] });
  for (const { pts } of lines) {
    const d0 = Math.hypot(...pts[0]);
    const d1 = Math.hypot(...pts.at(-1));
    assert.ok(d0 > d1, 'trace order runs toward the charge');
  }
});

test('traceLine respects bounds and returns the seed first', () => {
  const pts = traceLine(() => [1, 0], [0, 0], { ds: 5, bounds: [-10, -10, 50, 10] });
  assert.deepEqual(pts[0], [0, 0]);
  assert.ok(pts.at(-1)[0] > 50 && pts.length < 20);
});

test('isolines of x + y lie on the level', () => {
  const [{ segs }] = isolines((x, y) => x + y, [10], { x0: -50, y0: -50, x1: 50, y1: 50, step: 10 });
  assert.ok(segs.length > 5);
  for (const [a, b, c, d] of segs) {
    assert.ok(Math.abs(a + b - 10) < 1e-9 && Math.abs(c + d - 10) < 1e-9);
  }
});
