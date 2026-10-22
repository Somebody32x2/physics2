import { test } from 'node:test';
import assert from 'node:assert/strict';
import { wireField } from '../src/model/fields.js';
import {
  MU0, E_CHARGE, M_PROTON, cross, lorentz, cyclotronRadius, cyclotronPeriod, helixPitch, wireForce, loopTorque, trajectory,
  wireB, loopCenterB, solenoidB, parallelForcePerLength, wireFlux, loopField, closedLine,
  flux, slidingBar, generator, transformer, inducedSense, dipoleFlux, dipoleFluxSlope, magnetCycle,
  inductorEmf, inductorEnergy, solenoidInductance, rlTau, rlCurrent, lcOmega, springOmega, lcState,
} from '../src/model/magnetism.js';

const near = (a, b, tol = 1e-9) => Math.abs(a - b) <= tol * Math.max(1, Math.abs(a), Math.abs(b));
const IN = [0, 0, 1]; // into the page (screen convention: x right, y down, z into the page)

test('F = qv x B: perpendicular to v and B, zero along B, flips with the sign of q', () => {
  const v = [1, 0, 0];
  const F = lorentz(1, v, IN);
  assert.deepEqual(F.map((c) => c + 0), [0, -1, 0], '+q moving right in B into the page is pushed UP the screen');
  assert.deepEqual(lorentz(-1, v, IN).map((c) => c + 0), [0, 1, 0], 'electron goes the other way');
  assert.deepEqual(lorentz(1, [0, 0, 2], IN).map((c) => c + 0), [0, 0, 0], 'v parallel to B: no force');
  const v2 = [0.3, -0.7, 0.2];
  const B2 = [0.5, 0.1, -0.4];
  const F2 = lorentz(2, v2, B2);
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  assert.ok(Math.abs(dot(F2, v2)) < 1e-12 && Math.abs(dot(F2, B2)) < 1e-12);
  assert.deepEqual(cross([1, 0, 0], [0, 1, 0]), [0, 0, 1], 'screen axes are right-handed');
});

test('cyclotron: r = mv/qB scales with v, period does not', () => {
  const r = cyclotronRadius(M_PROTON, 1e6, E_CHARGE, 0.5);
  assert.ok(near(r, 0.02088, 1e-3), `proton at 1e6 m/s in 0.5 T circles with r ~ 2.1 cm, got ${r}`);
  assert.ok(near(cyclotronRadius(M_PROTON, 2e6, E_CHARGE, 0.5) / r, 2));
  assert.ok(near(cyclotronRadius(M_PROTON, 1e6, E_CHARGE, 1) / r, 0.5));
  assert.ok(near(cyclotronPeriod(M_PROTON, E_CHARGE, 0.5), (2 * Math.PI * r) / 1e6), 'T = 2 pi r / v');
  assert.ok(near(helixPitch(M_PROTON, 3e5, E_CHARGE, 0.5), 3e5 * cyclotronPeriod(M_PROTON, E_CHARGE, 0.5)));
});

test('trajectory: entering a field region makes a semicircle, exits 2r away, speed unchanged', () => {
  const r = 60;
  const run = (turn) => trajectory({ start: [0, 200], dir: [1, 0], r, turn, inField: (x) => x >= 100, bounds: [-10, -400, 800, 800], ds: 0.5 });
  const { pts } = run(1);
  const last = pts[pts.length - 1];
  assert.ok(Math.abs(last[1] - (200 - 2 * r)) < 1.5, `positive charge exits 2r higher (y down), got ${last[1]}`);
  assert.ok(last[0] < 0, 'and leaves moving left');
  for (let i = 1; i < pts.length; i++) assert.ok(Math.abs(Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]) - 0.5) < 1e-9, 'B does no work: speed constant');
  const neg = run(-1).pts;
  assert.ok(Math.abs(neg[neg.length - 1][1] - (200 + 2 * r)) < 1.5, 'opposite charge curves the other way');
});

test('force on a wire and torque on a loop', () => {
  assert.ok(near(wireForce(2, 0.5, 0.3), 0.3));
  assert.ok(Math.abs(wireForce(2, 0.5, 0.3, 0)) < 1e-15, 'wire along B: no force');
  assert.ok(near(loopTorque(10, 1, 0.01, 0.5, Math.PI / 2), 0.05));
  assert.ok(Math.abs(loopTorque(10, 1, 0.01, 0.5, 0)) < 1e-15, 'normal along B: no torque');
});

test('sources: wire, loop, solenoid, parallel wires', () => {
  assert.ok(near(wireB(10, 0.02), 1e-4), '10 A at 2 cm is 1e-4 T');
  assert.ok(near(wireB(10, 0.04) / wireB(10, 0.02), 0.5), 'twice as far: half the field');
  assert.ok(near(loopCenterB(1, 0.1), MU0 * 5));
  assert.ok(near(solenoidB(1000, 2), MU0 * 2000));
  assert.ok(near(parallelForcePerLength(1, 1, 1), 2e-7), 'definition-era ampere: 2e-7 N/m');
  assert.ok(parallelForcePerLength(1, -1, 1) < 0, 'antiparallel: repel');
});

test('Ampere: circulation of the wire field counts only enclosed current (2 pi I in figure units)', () => {
  const B = wireField([{ x: 0, y: 0, I: 3 }, { x: 200, y: 0, I: -5 }]);
  const circ = (cx, cy, R) => {
    let s = 0;
    const n = 2000;
    for (let k = 0; k < n; k++) {
      const a = ((k + 0.5) * 2 * Math.PI) / n;
      const [bx, by] = B(cx + R * Math.cos(a), cy + R * Math.sin(a));
      // dl for a path that is counterclockwise ON SCREEN (y down): direction (sin a, -cos a)
      s += (bx * Math.sin(a) - by * Math.cos(a)) * R * ((2 * Math.PI) / n);
    }
    return s;
  };
  assert.ok(near(circ(0, 0, 50), 2 * Math.PI * 3, 1e-6));
  assert.ok(near(circ(100, 0, 150), 2 * Math.PI * -2, 1e-6), 'both enclosed: net current');
  assert.ok(Math.abs(circ(100, 300, 80)) < 1e-6, 'none enclosed: zero');
});

test('wireFlux contours are field lines (B is perpendicular to its gradient)', () => {
  const wires = [{ x: 0, y: 0, I: 1 }, { x: 120, y: 40, I: -1 }, { x: 60, y: -90, I: 1 }];
  const B = wireField(wires);
  const psi = wireFlux(wires);
  for (const [x, y] of [[30, 20], [-50, 70], [200, -10]]) {
    const h = 1e-4;
    const gx = (psi(x + h, y) - psi(x - h, y)) / (2 * h);
    const gy = (psi(x, y + h) - psi(x, y - h)) / (2 * h);
    const [bx, by] = B(x, y);
    assert.ok(Math.abs(bx * gx + by * gy) < 1e-6 * Math.hypot(bx, by) * Math.hypot(gx, gy));
    assert.ok(near(Math.hypot(gx, gy), Math.hypot(bx, by), 1e-5), 'contour spacing tracks |B|');
  }
});

test('loop field: on-axis Biot-Savart matches mu0 I R^2 / 2(R^2+x^2)^(3/2); far field ~ 1/x^3', () => {
  const R = 50;
  const B = loopField([{ x: 0, y: 0, R, I: 1 }], { segs: 200 });
  const exact = (x) => (2 * Math.PI * R * R) / (R * R + x * x) ** 1.5; // mu0/4pi = 1
  for (const x of [0, 30, 120]) {
    const [bx, by] = B(x, 0);
    assert.ok(near(bx, exact(x), 1e-3) && Math.abs(by) < 1e-9, `axis x=${x}`);
  }
  assert.ok(near(B(1000, 0)[0] / B(2000, 0)[0], 8, 0.01), 'dipole far field falls like 1/r^3');
});

test('solenoid: uniform inside (B = mu0 n I), weak outside; its field lines close', () => {
  const R = 40;
  const n = 60;
  const pitch = 4;
  const loops = Array.from({ length: n }, (_, k) => ({ x: (k - (n - 1) / 2) * pitch, y: 0, R, I: 1 }));
  const B = loopField(loops, { segs: 64 });
  const inside = B(0, 0)[0];
  const half = (n * pitch) / 2;
  const ideal = 4 * Math.PI * (1 / pitch) * (half / Math.hypot(half, R)); // mu0 n I (mu0 = 4 pi here), times the finite-length factor
  assert.ok(Math.abs(inside / ideal - 1) < 0.01, `inside ${inside} vs ${ideal}`);
  assert.ok(half / Math.hypot(half, R) > 0.94, 'long solenoid: within 6% of the ideal mu0 n I');
  assert.ok(Math.abs(B(0, 20)[0] / inside - 1) < 0.02, 'same field off-axis inside');
  assert.ok(Math.abs(B(0, 90)[0]) < 0.05 * inside, 'outside is weak');
  const one = loopField([{ x: 0, y: 0, R: 50, I: 1 }]);
  const line = closedLine(one, [0, 30], { ds: 1, bounds: [-1e4, -1e4, 1e4, 1e4], maxSteps: 20000 });
  assert.ok(line.closed, 'a loop field line through the loop comes back to where it started');
});

test('induction: flux, Faraday for a generator, motional emf conserves energy', () => {
  assert.ok(near(flux(0.5, 0.2, 0), 0.1));
  assert.ok(Math.abs(flux(0.5, 0.2, Math.PI / 2)) < 1e-15, 'B in the plane of the loop: no flux');
  const g = { N: 100, B: 0.2, A: 0.01, omega: 2 * Math.PI * 60 };
  for (const t of [0, 0.001, 0.004, 0.009]) {
    const h = 1e-7;
    const dphi = (generator(g, t + h).phi - generator(g, t - h).phi) / (2 * h);
    assert.ok(near(generator(g, t).emf, -dphi, 1e-5), 'emf = -dPhi/dt');
  }
  const quarter = Math.PI / 2 / g.omega;
  assert.ok(Math.abs(generator(g, quarter).phi) < 1e-12 && near(generator(g, quarter).emf, g.N * g.B * g.A * g.omega), 'emf peaks when flux is zero');
  const bar = slidingBar({ B: 0.5, L: 0.2, v: 4, R: 2 });
  assert.ok(near(bar.emf, 0.4) && near(bar.I, 0.2) && near(bar.F, 0.02));
  assert.ok(near(bar.Pmech, bar.Pheat), 'push power = heat power');
  const tr = transformer(120, 50, 500, 2);
  assert.ok(near(tr.Vs, 1200) && near(tr.Vs * tr.Is, 120 * 2));
});

test('Lenz: increasing flux into the page drives a counterclockwise current', () => {
  // flux with the normal out of the page = -B A; B into the page growing makes it more negative
  assert.equal(inducedSense(-1), 'ccw');
  assert.equal(inducedSense(1), 'cw');
  assert.equal(inducedSense(0), 'none');
  // ccw (seen from the viewer) current's own field at the center points out of the page:
  // loopField's I > 0 loop has field +x on axis; a planar ring of wires checks the same rule here.
  const ring = Array.from({ length: 72 }, (_, k) => k);
  let Bz = 0;
  for (const k of ring) {
    const a = (k * 2 * Math.PI) / 72;
    const p = [Math.cos(a), -Math.sin(a), 0]; // y down: this point runs counterclockwise on screen
    const dl = [-Math.sin(a), -Math.cos(a), 0];
    Bz += cross(dl, p.map((c) => -c))[2];
  }
  assert.ok(Bz < 0, 'its own field at the center is out of the page (-z), opposing the growing into-page flux');
});

test('magnet and coil: flux peaks in the coil, emf = -dPhi/dt, zero while held still', () => {
  const a = 1;
  assert.ok(near(dipoleFlux(0, a), 1));
  assert.ok(near(dipoleFlux(20, a) / dipoleFlux(40, a), 8, 0.01), 'far away flux ~ 1/z^3');
  for (const z of [-2, -0.5, 0.7]) {
    const h = 1e-6;
    assert.ok(near(dipoleFluxSlope(z, a), (dipoleFlux(z + h, a) - dipoleFlux(z - h, a)) / (2 * h), 1e-5));
  }
  for (const t of [0.4, 1.0, 2.0, 3.6, 5.5]) {
    const h = 1e-5;
    const m = magnetCycle(t);
    const dz = (magnetCycle(t + h).z - magnetCycle(t - h).z) / (2 * h);
    assert.ok(near(m.vz, dz, 1e-4), `vz at t=${t}`);
  }
  assert.equal(magnetCycle(2).vz, 0, 'held inside: no change, no emf');
  assert.ok(magnetCycle(0.75).vz > 0 && magnetCycle(3.75).vz < 0);
});

test('inductors: emf opposes change, energy, RL rise, solenoid L', () => {
  assert.ok(near(inductorEmf(2, 3), -6));
  assert.ok(near(inductorEnergy(2, 3), 9));
  const L = 0.5;
  const R = 10;
  const emf = 12;
  assert.ok(near(rlTau(L, R), 0.05));
  assert.ok(near(rlCurrent(emf, R, L, rlTau(L, R)) / (emf / R), 1 - Math.exp(-1)), '63% after one tau');
  assert.ok(rlCurrent(emf, R, L, 0) === 0, 'starts at zero');
  for (const t of [0.01, 0.05, 0.12]) {
    const h = 1e-7;
    const I = rlCurrent(emf, R, L, t);
    const dIdt = (rlCurrent(emf, R, L, t + h) - rlCurrent(emf, R, L, t - h)) / (2 * h);
    assert.ok(Math.abs(emf - I * R + inductorEmf(L, dIdt)) < 1e-5, 'Kirchhoff loop: emf - IR - L dI/dt = 0');
  }
  assert.ok(near(solenoidInductance(1000, 1e-4, 0.1), MU0 * 1e6 * 1e-5));
});

test('LC: energy sloshes but the total is constant; C x4 halves the frequency; spring analogy', () => {
  const L = 2e-3;
  const C = 5e-6;
  const Q = 1e-4;
  const U0 = (Q * Q) / (2 * C);
  for (const t of [0, 1e-5, 7e-5, 3.3e-4]) {
    const s = lcState(L, C, Q, t);
    assert.ok(near(s.UE + s.UB, U0, 1e-9));
  }
  const quarter = Math.PI / 2 / lcOmega(L, C);
  const s = lcState(L, C, Q, quarter);
  assert.ok(Math.abs(s.q) < 1e-15 && near(s.UB, U0), 'charge zero = current max, all energy in B');
  assert.ok(near(lcOmega(L, 4 * C) / lcOmega(L, C), 0.5));
  assert.ok(near(lcOmega(L, C), springOmega(1 / C, L)), 'L plays m, 1/C plays k');
});
