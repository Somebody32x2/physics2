import { h, p } from '../ui/dom.js';
import { Player } from '../ui/player.js';
import { PhysView } from '../core/phys-view.js';
import { figure, callout, segmented } from '../ui/figure.js';
import { checkpoint } from '../ui/quiz.js';
import { equation, eq, readouts, slider, controlsRow } from '../ui/controls.js';
import { E_CHARGE, M_E, M_P, C_LIGHT, FIG_VOLTS, FIG_FIELD, accelerate, idealPlates, pointV } from '../model/electric.js';
import { pointField, pointPotential, chargeFieldLines, isolines } from '../model/fields.js';

const fmt = (v, digits = 2) => {
  if (v === 0) return '0';
  const e = Math.floor(Math.log10(Math.abs(v)));
  if (e >= -2 && e < 4) return v.toFixed(Math.max(0, digits - 1 - e)).replace(/\.0+$/, '');
  const m = v / 10 ** e;
  return `${m.toFixed(digits - 1)} \u00d7 10<sup>${e < 0 ? '\u2212' : ''}${Math.abs(e)}</sup>`;
};
const signed = (v, d = 0) => `${v < 0 ? '\u2212' : v > 0 ? '+' : ''}${Math.abs(v).toFixed(d)}`;

// ---------- figure 1: the landscape along a dipole's axis ----------
// Charges +1 nC and -1 nC, 1 box unit = 1 mm. V along the axis in figure units (q/r) and volts.
const LS = { y: 52, xa: 180, xb: 460 };
const LS_BOX = [640, 360];
const lsCharges = [{ x: LS.xa, y: LS.y, q: 1 }, { x: LS.xb, y: LS.y, q: -1 }];
const lsV = (x) => pointPotential(lsCharges)(x, LS.y);
const lsVolts = (x) => FIG_VOLTS * lsV(x);
const GAP = 26; // the curve stops this close to a charge (it shoots off to infinity there)
const VM = lsV(LS.xa + GAP) * 1.04;
function landscapeDraw(d, p) {
  // top strip: the charges on their axis
  d.line(20, LS.y, 620, LS.y, { cls: 'ph-mute' });
  if (p.showE > 0.01) {
    const field = pointField(lsCharges);
    const g = d.group({ opacity: p.showE.toFixed(2) });
    for (let x = 40; x <= 600; x += 35) {
      if (Math.abs(x - LS.xa) < 30 || Math.abs(x - LS.xb) < 30) continue;
      const [ex] = field(x, LS.y);
      const len = Math.sign(ex) * 30 * Math.min(1, Math.sqrt(Math.abs(ex) / 8e-4)); // grows with |E| (square root, so weak spots stay visible)
      if (Math.abs(len) > 4) g.arrow(x - len / 2, LS.y - 0, x + len / 2, LS.y, { cls: 'ph-E', w: 2.2, head: 8 });
    }
  }
  for (const c of lsCharges) {
    d.line(c.x, LS.y + 20, c.x, 340, { cls: 'ph-mute', dash: '3 5' });
    d.charge(c.x, c.y, c.q, { r: 16, label: c.q > 0 ? '+q' : '\u2212q' });
  }
  // the landscape
  const pl = d.plot({ x: 20, y: 105, w: 600, h: 235, xr: [20, 620], yr: [-VM, VM], yLabel: p.showU > 0.5 ? 'V, U' : 'V', xLabel: 'x' });
  const segs = [[20, LS.xa - GAP], [LS.xa + GAP, LS.xb - GAP], [LS.xb + GAP, 620]];
  for (const [a, b] of segs) pl.fn(lsV, { from: a, to: b, n: 120, w: p.showU > 0.5 ? 1.6 : 2.6, opacity: p.showU > 0.5 ? 0.45 : 1 });
  if (p.showU > 0.01) {
    for (const [a, b] of segs) pl.fn((x) => -lsV(x), { from: a, to: b, n: 120, cls: 'ph-plot2', w: 2.6, opacity: p.showU.toFixed(2) });
    pl.label(612, VM * 0.92, 'U = qV (electron)', { cls: 'ph-plot2', anchor: 'end', opacity: p.showU.toFixed(2) });
  }
  pl.dot(320, 0, { r: 4 });
  pl.label(320, -VM * 0.12, 'V = 0', { halo: true });
  pl.label(LS.xa + 70, VM * 0.8, 'high V near +', { anchor: 'start' });
  pl.label(LS.xb - 70, -VM * 0.8, 'low V near \u2212', { anchor: 'end' });
  // the test charge: on the axis and on the curve it "feels"
  if (p.q !== 0) {
    const curve = (x) => (p.showU > 0.5 ? p.q * lsV(x) : lsV(x));
    const field = pointField(lsCharges);
    const fx = p.q * field(p.bx, LS.y)[0]; // force along x
    const dir = Math.sign(fx);
    d.charge(p.bx, LS.y, p.q, { r: 9, size: 11, label: p.q > 0 ? '+' : '\u2212' });
    d.arrow(p.bx + dir * 12, LS.y - 22, p.bx + dir * 52, LS.y - 22, { cls: 'ph-F', w: 2.4 });
    d.text(p.bx + dir * 32, LS.y - 36, 'F', { cls: 'ph-F', serif: true });
    const X = pl.X(p.bx);
    const Y = pl.Y(curve(p.bx));
    // arrow along the curve, the way the force pushes
    const h = 3;
    const sx = pl.X(p.bx + dir * h) - X;
    const sy = pl.Y(curve(p.bx + dir * h)) - Y;
    const L = Math.hypot(sx, sy) || 1;
    d.arrow(X + (sx / L) * 14, Y + (sy / L) * 14, X + (sx / L) * 54, Y + (sy / L) * 54, { cls: 'ph-F', w: 2.2 });
    d.charge(X, Y, p.q, { r: 10, size: 12, label: p.q > 0 ? '+' : '\u2212' });
  }
}

function landscapeFrames() {
  const f = (p, caption) => ({ draw: landscapeDraw, p: { q: 0, bx: 250, showU: 0, showE: 0, ...p }, box: LS_BOX, caption });
  const v1 = lsVolts(250);
  const v2 = lsVolts(405);
  const drop = v1 - v2;
  return [
    f({}, `Potential V along the line through a dipole (+1 nC and \u22121 nC, 28 cm apart). It is a <b>landscape</b>: a peak at the + charge, a pit at the \u2212 charge, and <b>V = 0</b> exactly halfway. (The curve shoots off to \u00b1\u221e at the charges; it is cut off there.)`),
    f({ q: 1 }, `Put a small <b>positive</b> charge at x = 7 cm from the + charge, where V = ${signed(v1)} V. The force on it points <b>downhill</b> on the V curve, like a ball on a hillside.`),
    f({ q: 1, bx: 405 }, `Let go: it <b>rolls downhill</b> to a spot where V = ${signed(v2)} V. It dropped ${drop.toFixed(0)} V, so it gained kinetic energy q \u00d7 ${drop.toFixed(0)} V. A proton would gain <b>${drop.toFixed(0)} eV</b>.`),
    f({ q: -1, bx: 405 }, 'Now an <b>electron</b> at the same spot. Same field, opposite charge, so the force flips: it is pushed <b>uphill in V</b>, toward the + charge.'),
    f({ q: -1, bx: 405, showU: 1 }, 'The cure for the confusion: plot the electron\u2019s <b>potential energy U = qV</b> (colored curve). With q negative, the landscape <b>flips upside down</b>. On its own energy landscape the electron also rolls <b>downhill</b>.'),
    f({ q: -1, bx: 250, showU: 1 }, `It rolls to the left, gaining ${drop.toFixed(0)} eV, exactly what the proton gained going the other way. <b>Every charge rolls downhill in U</b>; only positive ones also roll downhill in V.`),
    f({ showE: 1 }, 'The field arrows on the axis: <b>E points downhill in V</b> everywhere, and it is longest where the slope is <b>steepest</b> (near the charges). Where V is flat (as halfway between two like charges), E = 0. This is E = \u2212dV/dx.'),
  ];
}

// ---------- figure 2: equipotential map sandbox ----------
const MAP_BOX = [640, 380];
const LEVELS = Array.from({ length: 17 }, (_, i) => (i - 8) * 25); // -200 ... +200 V in equal 25 V steps
const PLATES = { x1: 220, x2: 420, V1: 50, V2: -50, top: 50, bot: 330 };
const PRESETS = {
  single: () => [{ x: 320, y: 190, q: 1 }],
  dipole: () => [{ x: 220, y: 190, q: 1 }, { x: 420, y: 190, q: -1 }],
  like: () => [{ x: 220, y: 190, q: 1 }, { x: 420, y: 190, q: 1 }],
  plates: () => [],
};
const plates = idealPlates(PLATES);
/** V (volts) and E (V/m) at a point for the current preset. */
function mapProbe(preset, charges, x, y) {
  if (preset === 'plates') {
    const inY = y > PLATES.top && y < PLATES.bot;
    const V = inY ? plates.V(x) : NaN;
    const [ex] = inY ? plates.E(x) : [0];
    return { V, E: [ex * 1000, 0] }; // slope is volts per mm -> V/m
  }
  const V = FIG_VOLTS * pointPotential(charges)(x, y);
  const [ex, ey] = pointField(charges)(x, y);
  return { V, E: [ex * FIG_FIELD, ey * FIG_FIELD] };
}
function mapDraw(d, p) {
  const { preset, charges, test } = p;
  const B = { x0: 0, y0: 0, x1: MAP_BOX[0], y1: MAP_BOX[1] };
  if (preset === 'plates') {
    for (let V = -40; V <= 40; V += 10) {
      const x = PLATES.x1 + ((PLATES.V1 - V) / (PLATES.V1 - PLATES.V2)) * (PLATES.x2 - PLATES.x1);
      d.line(x, PLATES.top + 6, x, PLATES.bot - 6, { cls: 'ph-eqp', w: V === 0 ? 2 : 1.3 });
    }
    for (let y = 70; y < PLATES.bot; y += 40) d.arrow(PLATES.x1 + 10, y, PLATES.x2 - 10, y, { cls: 'ph-E', w: 1.3, opacity: 0.7 });
    d.rect(PLATES.x1 - 8, PLATES.top, 8, PLATES.bot - PLATES.top, { cls: 'ph-pos', fill: true, w: 1.4 });
    d.rect(PLATES.x2, PLATES.top, 8, PLATES.bot - PLATES.top, { cls: 'ph-neg', fill: true, w: 1.4 });
    d.text(PLATES.x1 - 14, PLATES.top - 14, `+${PLATES.V1} V`, { cls: 'ph-pos' });
    d.text(PLATES.x2 + 14, PLATES.top - 14, `\u2212${-PLATES.V2} V`, { cls: 'ph-neg' });
    d.text(320, PLATES.bot + 22, `${(PLATES.x2 - PLATES.x1) / 10} cm apart: E = \u0394V/d = ${((PLATES.V1 - PLATES.V2) / ((PLATES.x2 - PLATES.x1) / 1000)).toFixed(0)} V/m`, { cls: 'ph-label' });
  } else {
    const fn = (x, y) => (charges.some((c) => Math.hypot(x - c.x, y - c.y) < 13) ? NaN : FIG_VOLTS * pointPotential(charges)(x, y));
    const iso = isolines(fn, LEVELS, { ...B, step: 6, maxJump: 400 });
    for (const { level, segs } of iso) {
      const g = d.group({ cls: 'ph-eqp' });
      for (const [x1, y1, x2, y2] of segs) g.line(x1, y1, x2, y2, { w: level === 0 ? 2 : 1.3 });
    }
    const lines = chargeFieldLines(charges, { perUnit: 8, bounds: [0, 0, MAP_BOX[0], MAP_BOX[1]], ds: 3.5, maxSteps: 700 });
    const g = d.group({ opacity: 0.6 });
    g.fieldLines(lines.map((l) => l.pts), { arrows: [0.3], w: 1.1 });
    charges.forEach((c, i) => d.charge(c.x, c.y, c.q, { id: `c${i}`, drag: true, r: 14, label: c.q > 0 ? '+1' : '\u22121' }));
  }
  const pr = mapProbe(preset, charges, test.x, test.y);
  const v = [pr.E[0], pr.E[1]];
  const m = Math.hypot(...v);
  if (m > 0) {
    const len = Math.min(90, 14 + 22 * Math.log10(1 + m / 50));
    d.vec(test.x, test.y, (v[0] / m) * len, (v[1] / m) * len, { cls: 'ph-F', w: 2.4 });
  }
  d.charge(test.x, test.y, 1, { r: 7, label: '', id: 'test', drag: true });
  if (Number.isFinite(pr.V)) d.text(test.x, test.y + 20, `${signed(pr.V)} V`, { cls: 'ph-F', halo: true });
}

// ---------- figure 3: accelerating through a potential difference ----------
const AC = { x1: 110, x2: 400, end: 620, y: 95, top: 30, bot: 160 };
const AC_BOX = [640, 270];
function accelDraw(d, p, t) {
  const electron = p.kind === 'electron';
  const q = electron ? -E_CHARGE : E_CHARGE;
  const m = electron ? M_E : M_P;
  // electron: right plate is higher; proton: left plate is higher. dV = V(right) - V(left).
  const dV = electron ? p.V : -p.V;
  const r = accelerate(q, dV, m);
  const leftPos = !electron;
  d.rect(AC.x1 - 8, AC.top, 8, AC.bot - AC.top, { cls: leftPos ? 'ph-pos' : 'ph-neg', fill: true, w: 1.4 });
  d.rect(AC.x2, AC.top, 8, AC.y - 10 - AC.top, { cls: leftPos ? 'ph-neg' : 'ph-pos', fill: true, w: 1.4 });
  d.rect(AC.x2, AC.y + 10, 8, AC.bot - AC.y - 10, { cls: leftPos ? 'ph-neg' : 'ph-pos', fill: true, w: 1.4 });
  d.text(AC.x1 - 4, AC.top - 14, leftPos ? `V = ${p.V} V` : 'V = 0', { cls: leftPos ? 'ph-pos' : 'ph-neg' });
  d.text(AC.x2 + 4, AC.top - 14, leftPos ? 'V = 0' : `V = ${p.V} V`, { cls: leftPos ? 'ph-neg' : 'ph-pos' });
  if (p.V > 0) {
    for (const y of [AC.top + 22, AC.bot - 22]) {
      const a = leftPos ? [AC.x1 + 30, AC.x2 - 30] : [AC.x2 - 30, AC.x1 + 30];
      d.arrow(a[0], y, a[1], y, { cls: 'ph-E', w: 1.3, opacity: (0.3 + 0.7 * Math.min(1, p.V / 1500)).toFixed(2) });
    }
    d.text((AC.x1 + AC.x2) / 2, AC.top + 10, 'E', { cls: 'ph-E', serif: true, halo: true });
  }
  // motion: uniform acceleration across the gap, then coasting. Drawn at a pace that grows as sqrt(V).
  const gap = AC.x2 - AC.x1;
  const tGap = p.V > 0 ? 1.6 * Math.sqrt(1000 / p.V) : Infinity; // seconds on screen to cross the gap
  const vExit = (2 * gap) / tGap; // px per second at the exit
  const tEnd = tGap + (AC.end - AC.x2) / vExit;
  const period = Number.isFinite(tEnd) ? tEnd + 0.8 : 1;
  const tt = t % period;
  let x;
  let frac;
  if (!Number.isFinite(tGap)) {
    x = AC.x1 + 10;
    frac = 0;
  } else if (tt < tGap) {
    frac = (tt / tGap) ** 2;
    x = AC.x1 + 10 + (gap - 10) * frac;
  } else {
    frac = 1;
    x = Math.min(AC.end, AC.x2 + vExit * (tt - tGap));
  }
  const speedFrac = Math.sqrt(frac);
  if (speedFrac > 0.02) d.vec(x, AC.y, 60 * speedFrac, 0, { cls: 'ph-v', w: 2.4 });
  if (frac < 1 && p.V > 0) {
    d.vec(x, AC.y - 22, 34, 0, { cls: 'ph-F', w: 2.2 });
    d.text(x + 44, AC.y - 22, 'F', { cls: 'ph-F', serif: true });
  }
  d.charge(x, AC.y, electron ? -1 : 1, { r: 10, size: 12, label: electron ? '\u2212' : '+' });
  // energy bars: U falls, K rises, total fixed
  const W = 260;
  const bx = 160;
  const K = r.eV * frac;
  const U = r.eV * (1 - frac);
  const scale = r.eV > 0 ? W / Math.max(r.eV, 1) : 0;
  const rows = [['U', U, 'ph-plot2'], ['K', K, 'ph-v'], ['U + K', U + K, 'ph-plot']];
  rows.forEach(([lab, val, cls], i) => {
    const y = 190 + i * 26;
    d.text(bx - 10, y, lab, { cls: 'ph-label', anchor: 'end' });
    d.rect(bx, y - 8, W, 16, { cls: 'ph-mute', w: 1, rx: 3 });
    if (val * scale > 0.5) d.rect(bx, y - 8, val * scale, 16, { cls, fill: true, w: 1.4, rx: 3, style: '--fo: 0.35' });
    d.text(bx + W + 10, y, `${val.toFixed(0)} eV`, { cls: 'ph-label', anchor: 'start' });
  });
}

// ---------- quiz ----------
const QM_BOX = [480, 250];
const qmCharges = [{ x: 170, y: 125, q: 1 }, { x: 310, y: 125, q: -1 }];
const QM_POINTS = [[240, 125], [240, 40], [420, 210], [60, 60]];
const qmStrength = (i) => Math.hypot(...pointField(qmCharges)(...QM_POINTS[i]));
const qmBest = () => [0, 1, 2, 3].reduce((b, i) => (qmStrength(i) > qmStrength(b) ? i : b), 0);
function qmDraw(d, p) {
  const fn = (x, y) => (qmCharges.some((c) => Math.hypot(x - c.x, y - c.y) < 12) ? NaN : FIG_VOLTS * pointPotential(qmCharges)(x, y));
  const iso = isolines(fn, LEVELS, { x0: 0, y0: 0, x1: QM_BOX[0], y1: QM_BOX[1], step: 5, maxJump: 400 });
  for (const { level, segs } of iso) {
    const g = d.group({ cls: 'ph-eqp' });
    for (const [x1, y1, x2, y2] of segs) g.line(x1, y1, x2, y2, { w: level === 0 ? 2 : 1.3 });
  }
  for (const c of qmCharges) d.charge(c.x, c.y, c.q, { r: 13, label: c.q > 0 ? '+' : '\u2212', style: 'pointer-events: none' });
  QM_POINTS.forEach(([x, y], i) => {
    d.circle(x, y, 9, { id: `m${i}`, cls: 'ph-F', fill: true, w: 2 });
    d.text(x + 16, y - 12, String.fromCharCode(65 + i), { cls: 'ph-F', halo: true });
    if (p.after) d.text(x, y + 22, `${fmt(qmStrength(i) * FIG_FIELD)} V/m`, { cls: 'ph-label', halo: true, size: 12 });
  });
}

const e1000 = accelerate(-E_CHARGE, 1000, M_E);
const quiz = [
  {
    type: 'mcq',
    id: 'potential.dipole-midpoint',
    prompt: 'Point M is exactly halfway between +q and \u2212q. What are V and E there (V = 0 far away)?',
    choices: [
      'V = 0 and E = 0: the two charges cancel',
      'V = 0, but E is not zero: it points toward \u2212q',
      'V is not zero, but E = 0',
      'V = 2kq/r and E = 2kq/r<sup>2</sup>',
    ],
    answer: 1,
    explain: `Potential is a <b>scalar</b>: kq/r + k(\u2212q)/r = 0 (for 1 nC at 10 cm: ${signed(pointV(1e-9, 0.1), 1)} V ${'\u2212'} ${pointV(1e-9, 0.1).toFixed(1)} V = 0). Field is a <b>vector</b>: away from +q and toward \u2212q are the <i>same</i> direction at M, so the two add instead of cancelling. V = 0 only means no net work to bring a charge in from far away, not that the slope is zero.`,
  },
  {
    type: 'mcq',
    id: 'potential.electron-drift',
    prompt: 'In some region the potential rises steadily to the right (V = 0 at the left, +100 V at the right). An electron is released at rest in the middle. Which way does it go?',
    choices: ['Left, downhill toward lower V', 'Right, toward higher V', 'Nowhere: a uniform potential gradient exerts no force', 'Left at first, then it turns around'],
    answer: 1,
    explain: 'E points downhill in V, so here E points <b>left</b>. The electron\u2019s charge is negative, so F = qE points <b>right</b>: electrons go <b>toward higher potential</b>. In energy terms: U = qV <i>decreases</i> to the right for a negative q, so it rolls downhill in U.',
  },
  {
    type: 'input',
    id: 'potential.electron-1000v',
    prompt: 'An electron starts at rest and is accelerated through a potential difference of 1000 V. What is its speed, in units of 10<sup>7</sup> m/s? (m<sub>e</sub> = 9.11 \u00d7 10<sup>\u221231</sup> kg)',
    accept: (s) => Math.abs(parseFloat(s) - e1000.v / 1e7) < 0.04,
    placeholder: '\u00d7 10\u2077 m/s',
    explain: `Energy conservation: K = |q|\u0394V = 1000 eV = ${fmt(e1000.K)} J. Then v = \u221a(2K/m) = \u221a(2 \u00d7 ${fmt(e1000.K)} / 9.11 \u00d7 10<sup>\u221231</sup>) = <b>${(e1000.v / 1e7).toFixed(2)} \u00d7 10<sup>7</sup> m/s</b>, about ${((e1000.v / C_LIGHT) * 100).toFixed(0)}% of the speed of light.`,
  },
  {
    type: 'pick',
    id: 'potential.strongest-field',
    prompt: 'Grey curves: equipotentials of a dipole, one every 25 V. Click the point where the <b>electric field is strongest</b>.',
    View: PhysView,
    view: { height: 260, box: QM_BOX },
    build: () => ({
      frame: { draw: qmDraw, p: {}, box: QM_BOX },
      answer: [`m${qmBest()}`],
      after: { draw: qmDraw, p: { after: 1 }, box: QM_BOX },
    }),
    explain: () => {
      const s = [0, 1, 2, 3].map((i) => fmt(qmStrength(i) * FIG_FIELD));
      return `E is the <b>steepness</b> of V: strong where V changes a lot over a short distance. Point A sits between the charges, where the potential drops from the + hill to the \u2212 pit in a short run and the two charges\u2019 fields add. Field strengths (charges \u00b11 nC, 1 box unit = 1 mm): A ${s[0]}, B ${s[1]}, C ${s[2]}, D ${s[3]} V/m. Note that V = 0 at A: zero potential, strongest field.`;
    },
  },
];

export default {
  id: 'potential',
  title: 'Electric potential',
  group: 'Electric fields',
  blurb: 'Potential as a height map for charges: volts, equipotentials, E as the downhill slope, and energy conservation with qV.',
  quiz,
  render(root) {
    root.append(
      p('In Physics I, gravity had a <b>potential energy</b>: lift a mass m by a height h and you store U = mgh, which comes back as kinetic energy when it falls. The electric force is also conservative, so a charge in an electric field has a potential energy U too. Push a positive charge toward another positive charge and you store energy; let go and it flies off.'),
      p('As with the field, it pays to divide out the charge you place. The <b>electric potential</b> V is the potential energy per coulomb, a number at every point that belongs to the source charges. Think of it as a <b>height map</b>: a landscape with hills at positive charges and pits at negative charges. Its unit, J/C, is the <b>volt</b>.'),
      equation({
        name: 'Potential and potential energy',
        eq: 'V = <span class="frac"><span>U</span><span>q</span></span> \u2003 \u21d4 \u2003 \u0394U = q \u0394V',
        says: 'V is energy per charge at a point. A charge q moved through a potential difference \u0394V changes its potential energy by q\u0394V, so the work you must do on it (slowly) is q\u0394V. Only <b>differences</b> in V matter; "voltage" is a potential difference.',
        terms: [
          ['V', 'electric potential at a point', 'V = J/C'],
          ['U', 'potential energy of charge q there', 'J'],
          ['q', 'the charge (signed)', 'C'],
          ['\u0394V', 'potential difference, V<sub>final</sub> \u2212 V<sub>initial</sub>', 'V'],
        ],
      }),
      p('A 9 V battery keeps one terminal 9 V above the other: every coulomb that goes around the circuit gets 9 J. For a single particle the natural unit is the <b>electron-volt</b>: the energy an electron gains crossing 1 V, ' + eq('1 eV = 1.6 \u00d7 10<sup>\u221219</sup> J') + '. You will meet it again in atoms and nuclei.'),
      p('The picture below is the key to every sign question in this chapter: V along the line through a dipole, drawn as a landscape, with charges rolling on it.'),
    );

    const lhost = h('div');
    root.append(figure({ title: 'Charges on the potential landscape', note: 'Bottom: V along the axis (black). The test charge sits on the curve its energy follows; the black arrow is the force on it.' }, lhost));
    new Player(lhost, { frames: landscapeFrames(), View: PhysView, view: { height: 360 } });

    root.append(
      callout('key', 'Downhill rules', '<b>E points downhill in V.</b> Positive charges are pushed downhill in V, negative charges uphill. Every charge, left alone, moves to <b>lower potential energy</b> U = qV, and the energy it loses becomes kinetic energy.'),
      p('The slope connection works both ways. The field is the downhill slope of the potential; the potential difference is the field times distance. In a uniform field (between parallel plates) it is especially simple:'),
      equation({
        name: 'Field from potential',
        eq: 'E = \u2212<span class="frac"><span>\u0394V</span><span>\u0394x</span></span> \u2003 (uniform field: \u0394V = E d)',
        says: 'The field strength is how fast V changes with distance: steep potential, strong field. The minus sign says E points toward <b>decreasing</b> V. That is why field strength can be quoted in <b>volts per meter</b>, the same unit as N/C. In calculus form, E = \u2212dV/dx.',
        terms: [
          ['E', 'field component along x', 'V/m = N/C'],
          ['\u0394V/\u0394x', 'how much V changes per meter along x', 'V/m'],
          ['d', 'distance along the field (uniform case)', 'm'],
        ],
      }),
      p('For a point charge the potential follows from Coulomb\u2019s law with one power of r fewer than the field:'),
      equation({
        name: 'Potential of a point charge',
        eq: 'V = k <span class="frac"><span>q</span><span>r</span></span>',
        says: 'Positive near a + charge, negative near a \u2212 charge, zero far away. It falls as <b>1/r</b> (slower than E\u2019s 1/r<sup>2</sup>). It is a <b>scalar with a sign</b>: for several charges, just add the numbers. No components, no arrows.',
        terms: [
          ['V', 'potential at distance r (zero at infinity)', 'V'],
          ['q', 'source charge, with its sign', 'C'],
          ['r', 'distance from the charge', 'm'],
        ],
      }),
      h('h2', { text: 'Equipotentials' }),
      p('Connect all the points with the same V and you get <b>equipotential</b> surfaces: the contour lines of the height map. Moving a charge along one takes <b>no work</b> (\u0394V = 0), so the field can have no component along it: <b>field lines cross equipotentials at right angles</b>. Drawn at equal steps of V, the contours crowd together where the field is strong.'),
    );

    // ----- map sandbox -----
    const mstage = h('div', { class: 'stage' });
    let preset = 'dipole';
    let mcharges = PRESETS[preset]();
    let test = { x: 320, y: 300 };
    const mro = readouts([['V', 'V at test charge'], ['E', '|E|'], ['U', 'U = qV for +1 nC']]);
    const mview = new PhysView(mstage, {
      height: 380,
      box: MAP_BOX,
      onDrag: (id, x, y) => {
        const cx = Math.max(14, Math.min(MAP_BOX[0] - 14, x));
        const cy = Math.max(14, Math.min(MAP_BOX[1] - 14, y));
        if (id === 'test') test = { x: cx, y: cy };
        else mcharges = mcharges.map((c, k) => (k === Number(id.slice(1)) ? { ...c, x: cx, y: cy } : c));
        mredraw();
      },
    });
    const mredraw = () => {
      mview.show({ draw: mapDraw, p: { preset, charges: mcharges, test }, box: MAP_BOX }, { animate: false });
      const pr = mapProbe(preset, mcharges, test.x, test.y);
      const ok = Number.isFinite(pr.V);
      mro.set({
        V: ok ? `${signed(pr.V, 1)} V` : '\u2014 (outside the plates)',
        E: `${fmt(Math.hypot(...pr.E))} V/m`,
        U: ok ? `${fmt(pr.V * 1e-9)} J` : '\u2014',
      });
    };
    root.append(
      figure(
        {
          title: 'Sandbox: equipotential map',
          tools: [segmented([{ value: 'single', label: 'Single' }, { value: 'dipole', label: 'Dipole' }, { value: 'like', label: 'Like pair' }, { value: 'plates', label: 'Plates' }], preset, (v) => ((preset = v), (mcharges = PRESETS[v]()), mredraw()))],
          note: 'Grey: equipotentials every 25 V (thicker: 0 V). Orange: field lines. Charges are \u00b11 nC; the box is 64 cm wide. Drag the small test charge to read V; drag the charges too. The field arrow always crosses the grey curves at right angles, pointing toward lower V, and the curves crowd together where the field is strong.',
        },
        mstage,
        mro,
      ),
    );
    mredraw();

    root.append(
      p('Two important cases. Between parallel plates the equipotentials are <b>evenly spaced planes</b>: V drops by the same amount every centimeter, which is what a uniform field means. And every <b>conductor</b> in equilibrium is an equipotential: E = 0 inside means no slope, so the whole piece of metal (surface included) sits at one potential. That is why a wire in a circuit diagram has a single voltage along its length.'),
      callout('warn', 'Classic mistakes', '<b>1.</b> "V = 0 means E = 0." No: V is the height, E is the slope. Halfway between +q and \u2212q the height is zero but the ground is steep. Likewise E = 0 halfway between two + charges, where V is not zero. <b>2.</b> Adding potentials as vectors, or forgetting their signs. V is a signed scalar. <b>3.</b> Getting electron directions backward: electrons go toward <b>higher</b> V.'),
      h('h2', { text: 'Energy conservation with charges' }),
      p('Because the electric force is conservative, K + U is constant for a charge moving in an electrostatic field. Falling through a potential difference turns qV into kinetic energy, exactly like a dropped ball turns mgh into \u00bdmv<sup>2</sup>. This is how every particle accelerator, X-ray tube and old TV tube works.'),
      equation({
        name: 'Energy conservation',
        eq: '\u0394K = \u2212q \u0394V \u2003 \u21d2 \u2003 \u00bd m v<sup>2</sup> = |q| |\u0394V| <span class="up">(from rest)</span>',
        says: 'The kinetic energy gained equals the potential energy lost. An electron (charge \u2212e) crossing a 1000 V difference toward higher V gains 1000 eV. Speed grows as the <b>square root</b> of the voltage: 4\u00d7 the voltage, 2\u00d7 the speed.',
        terms: [
          ['\u0394K', 'change in kinetic energy', 'J (or eV)'],
          ['q', 'the moving charge (signed)', 'C'],
          ['\u0394V', 'potential difference it crosses', 'V'],
          ['m, v', 'its mass and final speed', 'kg, m/s'],
        ],
      }),
    );

    // ----- accelerate -----
    const astage = h('div', { class: 'stage' });
    const ast = { V: 1000, kind: 'electron' };
    const aro = readouts([['K', 'kinetic energy at exit'], ['J', 'in joules'], ['v', 'speed'], ['c', 'fraction of c']]);
    const aview = new PhysView(astage, { height: 300, box: AC_BOX });
    const aredraw = () => {
      aview.show({ draw: accelDraw, p: { ...ast }, box: AC_BOX, live: true }, { animate: false });
      const e = ast.kind === 'electron';
      const r = accelerate(e ? -E_CHARGE : E_CHARGE, e ? ast.V : -ast.V, e ? M_E : M_P);
      aro.set({ K: `${r.eV.toFixed(0)} eV`, J: `${fmt(r.K)} J`, v: `${fmt(r.v)} m/s`, c: `${((r.v / C_LIGHT) * 100).toFixed(r.v / C_LIGHT < 0.01 ? 2 : 1)}%` });
    };
    root.append(
      figure(
        {
          title: 'Accelerating a charge through \u0394V',
          tools: [segmented([{ value: 'electron', label: 'Electron' }, { value: 'proton', label: 'Proton' }], ast.kind, (v) => ((ast.kind = v), aredraw()))],
          note: 'The particle starts at rest at the left plate and exits through a hole in the right plate. An electron needs the right plate <b>higher</b>; a proton needs the left plate higher. Both are drawn at the same pace; the readouts give the real speeds. Same voltage, same energy in eV; the proton, 1836 times heavier, ends up \u221a1836 \u2248 43 times slower.',
        },
        astage,
        controlsRow(slider({ label: 'Potential difference', min: 0, max: 2000, step: 50, value: ast.V, fmt: (v) => `${v} V`, onInput: (v) => ((ast.V = v), aredraw()) })),
        aro,
      ),
    );
    aredraw();

    root.append(
      p('Above a few tens of kilovolts an electron\u2019s speed gets close enough to c that \u00bdmv<sup>2</sup> stops being accurate (relativity takes over), but the energy statement K = e\u0394V stays exactly right. That is one reason physicists quote particle energies in eV.'),
      checkpoint(quiz),
    );
  },
};
