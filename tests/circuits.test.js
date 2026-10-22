import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  EPS0, plateC, capEnergy, parallelC, seriesC, plateState, pullApart, insertDielectric, capPair, capSeriesParallel,
  RHO, resistance, driftSpeed, wireState, powerIV, powerI2R, powerV2R, realBattery, filamentCurrent,
  seriesR, parallelR, solveCircuit, bulbCircuit, ladder, LADDER, twoLoop, TWO_LOOP, rcSteadyState,
  tau, charging, discharging, chargedFraction, remainingFraction,
} from '../src/model/circuits.js';

const near = (a, b, tol = 1e-9) => assert.ok(Math.abs(a - b) <= tol * Math.max(1, Math.abs(b)), `${a} vs ${b}`);

// ---------- capacitors ----------

test('parallel plates: 1 m^2 at 1 mm is about 8.85 nF; C scales as A/d and kappa', () => {
  near(plateC(1, 1e-3), 8.85e-9);
  near(plateC(0.01, 1e-3), 88.5e-12);
  near(plateC(2, 1e-3) / plateC(1, 1e-3), 2);
  near(plateC(1, 2e-3) / plateC(1, 1e-3), 0.5);
  near(plateC(1, 1e-3, 3) / plateC(1, 1e-3), 3);
});

test('stored energy: U = CV^2/2 = Q^2/2C = QV/2; doubling V quadruples U', () => {
  const s = plateState({ A: 0.02, d: 2e-3, V: 9 });
  near(s.U, (s.Q * s.Q) / (2 * s.C));
  near(s.U, 0.5 * s.Q * s.V);
  near(capEnergy(s.C, 18) / capEnergy(s.C, 9), 4);
  near(s.E, 9 / 2e-3);
  near(s.E, s.sigma / EPS0, 1e-9);
});

test('pulling plates apart: battery keeps V (Q, E, U drop), isolated keeps Q (V and U rise, E unchanged)', () => {
  const bat = pullApart({ factor: 2, mode: 'battery' }).ratio;
  near(bat.C, 0.5); near(bat.V, 1); near(bat.Q, 0.5); near(bat.E, 0.5); near(bat.U, 0.5);
  const iso = pullApart({ factor: 3, mode: 'isolated' }).ratio;
  near(iso.C, 1 / 3); near(iso.Q, 1); near(iso.V, 3); near(iso.E, 1); near(iso.U, 3);
});

test('dielectric in an isolated capacitor: C x kappa, V and E / kappa', () => {
  const k = insertDielectric(3);
  near(k.C, 3); near(k.V, 1 / 3); near(k.E, 1 / 3); near(k.U, 1 / 3); near(k.boundFraction, 2 / 3);
  const a = plateState({ A: 0.02, d: 1e-3, Q: 1e-9 });
  const b = plateState({ A: 0.02, d: 1e-3, Q: 1e-9, kappa: 3 });
  near(b.V / a.V, k.V);
});

test('combinations: parallel adds C, series adds 1/C; series charges equal, parallel voltages equal', () => {
  near(parallelC([2, 6]), 8);
  near(seriesC([2, 6]), 1.5);
  near(seriesC([4, 4]), 2);
  const par = capPair(2e-6, 6e-6, 12, 'parallel');
  near(par.V[0], 12); near(par.Q[1], 72e-6);
  const ser = capPair(2e-6, 6e-6, 12, 'series');
  near(ser.Q[0], ser.Q[1]); near(ser.Q[0], 18e-6); near(ser.V[0] + ser.V[1], 12); near(ser.V[0], 9);
  const sp = capSeriesParallel(2e-6, 4e-6, 2e-6, 12);
  near(sp.Q[0], sp.Q[1] + sp.Q[2]);
  near(sp.V[0] + sp.V[1], 12);
  near(sp.Q[0], 18e-6);
});

// ---------- current and resistance ----------

test('wire: R = rho L / A; 1 m of 1 mm^2 copper is 0.0168 ohm; drift speed is fractions of a mm/s', () => {
  near(resistance(RHO.copper, 1, 1e-6), 0.0168);
  near(resistance(RHO.copper, 2, 1e-6) / resistance(RHO.copper, 1, 1e-6), 2);
  near(resistance(RHO.copper, 2, 4e-6) / resistance(RHO.copper, 1, 1e-6), 0.5); // double length, double diameter
  const vd = driftSpeed(1, 1e-6); // 1 A in 1 mm^2 copper
  assert.ok(vd > 5e-5 && vd < 1e-4, `vd = ${vd}`);
  const s = wireState({ V: 0.1, L: 1, A: 1e-6 });
  near(s.I, 0.1 / 0.0168);
  near(s.P, s.I * s.I * s.R);
  // drift speed does not depend on the cross-section (more area, more current, same speed)
  near(wireState({ V: 0.1, L: 1, A: 3e-6 }).vd, s.vd);
});

test("power three ways agree; a 60 W 120 V bulb is 240 ohm; internal resistance lowers terminal voltage", () => {
  const R = 240;
  const V = 120;
  const I = V / R;
  near(powerIV(I, V), 60); near(powerI2R(I, R), 60); near(powerV2R(V, R), 60);
  const b = realBattery(12, 1, 5);
  near(b.I, 2); near(b.Vterm, 10); near(b.Pload + b.Pinternal, 12 * b.I);
  near(filamentCurrent(12), 1);
  assert.ok(filamentCurrent(6) > 0.5, 'a cooler filament has lower resistance, so half the voltage gives more than half the current');
});

// ---------- DC circuit solver ----------

test('solver: series and parallel resistors match the formulas', () => {
  near(seriesR([2, 3, 5]), 10);
  near(parallelR([6, 3]), 2);
  const ser = solveCircuit({ nodes: 3, elements: [
    { id: 'b', type: 'V', a: 0, b: 1, emf: 10 },
    { id: 'r1', type: 'R', a: 1, b: 2, R: 2 },
    { id: 'r2', type: 'R', a: 2, b: 0, R: 3 },
  ] });
  near(ser.I.r1, 2); near(ser.I.r2, 2); near(ser.I.b, 2); near(ser.drop.r1, 4);
  const par = solveCircuit({ nodes: 2, elements: [
    { id: 'b', type: 'V', a: 0, b: 1, emf: 6 },
    { id: 'r1', type: 'R', a: 1, b: 0, R: 6 },
    { id: 'r2', type: 'R', a: 1, b: 0, R: 3 },
  ] });
  near(par.I.b, 3); near(par.I.r1 + par.I.r2, par.I.b);
});

test('solver: power delivered by batteries equals power absorbed by resistors', () => {
  const s = solveCircuit({ nodes: 4, elements: [
    { id: 'e1', type: 'V', a: 0, b: 2, emf: 12 },
    { id: 'R1', type: 'R', a: 2, b: 1, R: 2 },
    { id: 'e2', type: 'V', a: 0, b: 3, emf: 3 },
    { id: 'R2', type: 'R', a: 3, b: 1, R: 3 },
    { id: 'R3', type: 'R', a: 1, b: 0, R: 3 },
  ] });
  near(s.P.e1 + s.P.e2, s.P.R1 + s.P.R2 + s.P.R3);
});

test('bulbs: series quarters the power, parallel keeps it; closing C brightens A and dims B', () => {
  const alone = bulbCircuit('alone');
  near(alone.P.A, 12);
  const ser = bulbCircuit('series');
  near(ser.P.A, 3); near(ser.P.B, 3);
  const par = bulbCircuit('parallel');
  near(par.P.A, 12); near(par.P.B, 12); near(par.Itotal, 2);
  const open = bulbCircuit('mixed', { closed: false });
  const shut = bulbCircuit('mixed', { closed: true });
  near(open.P.A, 3);
  assert.ok(shut.P.A > open.P.A && shut.P.B < open.P.B);
  near(shut.I.A, shut.I.B + shut.I.C); // junction rule
  near(shut.P.A, 12 * (2 / 3) ** 2);
});

test('ladder: reduction and solver agree; junction and loop rules hold', () => {
  const L = ladder();
  near(L.R23, 12); near(L.R234, 6); near(L.Req, 9);
  near(L.I.bat, LADDER.emf / L.Req);
  near(L.I.R1, 2); near(L.I.R2, 1); near(L.I.R4, 1);
  near(L.I.R1, L.I.R2 + L.I.R4);
  near(L.drop.R1 + L.drop.R4, LADDER.emf);
  near(L.drop.R2 + L.drop.R3, L.drop.R4);
});

test('two-loop circuit: I1 = 3 A, I2 = -1 A (battery 2 is being charged), I3 = 2 A; Kirchhoff rules hold', () => {
  const r = twoLoop();
  near(r.I1, 3); near(r.I2, -1); near(r.I3, 2);
  near(r.I1 + r.I2, r.I3);
  const { emf1, emf2, R1, R2, R3 } = TWO_LOOP;
  near(emf1 - r.I1 * R1 - r.I3 * R3, 0); // left loop
  near(emf2 - r.I2 * R2 - r.I3 * R3, 0); // right loop
});

test('RC steady state: the branch with the capacitor carries no current', () => {
  const s = rcSteadyState();
  assert.ok(Math.abs(s.I.R3) < 1e-9);
  near(s.I.R1, 2); near(s.I.R2, 2); near(s.Vc, 8, 1e-6);
});

// ---------- RC ----------

test('RC: tau = RC; 63% after one tau, 99% after 5; charge and current limits', () => {
  near(tau(2000, 50e-6), 0.1);
  near(chargedFraction(1), 0.6321205588, 1e-9);
  assert.ok(chargedFraction(5) > 0.99);
  near(remainingFraction(1), 0.3678794412, 1e-9);
  const p = { R: 1000, C: 1e-3, emf: 9 };
  near(charging(0, p).q, 0); near(charging(0, p).i, 9 / 1000);
  near(charging(1e3, p).q, 9e-3); near(charging(1e3, p).i, 0);
  const s = charging(0.7, p);
  near(s.vc + s.vr, 9); // loop rule at every instant
  const d = discharging(1, { R: 1000, C: 1e-3, q0: 9e-3 });
  near(d.q, 9e-3 * Math.exp(-1));
  assert.ok(d.i < 0);
});

test('RC: current is the rate of change of charge', () => {
  const p = { R: 2000, C: 5e-4, emf: 6 };
  for (const t of [0.1, 0.5, 2]) {
    const h = 1e-6;
    near((charging(t + h, p).q - charging(t - h, p).q) / (2 * h), charging(t, p).i, 1e-6);
    const q0 = 3e-3;
    near((discharging(t + h, { ...p, q0 }).q - discharging(t - h, { ...p, q0 }).q) / (2 * h), discharging(t, { ...p, q0 }).i, 1e-6);
  }
});
