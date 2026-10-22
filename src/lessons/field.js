import { h, p } from '../ui/dom.js';
import { Player } from '../ui/player.js';
import { PhysView } from '../core/phys-view.js';
import { figure, callout, segmented } from '../ui/figure.js';
import { checkpoint } from '../ui/quiz.js';
import { equation, eq, readouts, slider, controlsRow } from '../ui/controls.js';
import { FIG_FIELD, G_EARTH, pointE, zeroFieldBetween, deflection } from '../model/electric.js';
import { pointField, chargeFieldLines, traceLine } from '../model/fields.js';

const fmt = (v, digits = 2) => {
  if (v === 0) return '0';
  const e = Math.floor(Math.log10(Math.abs(v)));
  if (e >= -2 && e < 4) return v.toFixed(Math.max(0, digits - 1 - e)).replace(/\.0+$/, '');
  const m = v / 10 ** e;
  return `${m.toFixed(digits - 1)} \u00d7 10<sup>${e < 0 ? '\u2212' : ''}${Math.abs(e)}</sup>`;
};
const qLabel = (q) => (q === 0 ? 'off' : `${q > 0 ? '+' : '\u2212'}${Math.abs(q)}`);
// Field arrows: px per figure unit of field (q / px^2), capped so close-up arrows stay on screen.
const ESCALE = 2.4e6;
const scaled = (fx, fy, cap = 130) => {
  const m = Math.hypot(fx, fy);
  const k = m * ESCALE > cap ? cap / m : ESCALE;
  return [fx * k, fy * k];
};
/** How far one can go from point o along direction v before leaving the box (minus a small margin). */
function roomAlong(o, v, box, margin = 6) {
  const m = Math.hypot(...v) || 1;
  const ux = v[0] / m;
  const uy = v[1] / m;
  let t = Infinity;
  if (ux > 1e-9) t = Math.min(t, (box[0] - margin - o.x) / ux);
  if (ux < -1e-9) t = Math.min(t, (margin - o.x) / ux);
  if (uy > 1e-9) t = Math.min(t, (box[1] - margin - o.y) / uy);
  if (uy < -1e-9) t = Math.min(t, (margin - o.y) / uy);
  return Math.max(0, t);
}

// ---------- figure 1: building a dipole field ----------
// p: { q2 (right charge, tweens 0 -> -1 -> +1), px, py (test point), vec (0/1 show E at P), thru (0/1 line through P) }
const A = { x: 220, y: 170 };
const B = { x: 420, y: 170 };
const DIP_BOX = [640, 340];
function dipoleDraw(d, p) {
  const cs = [{ ...A, q: 1 }, { ...B, q: p.q2 }];
  const active = cs.filter((c) => Math.abs(c.q) > 0.02);
  const lines = chargeFieldLines(active, { perUnit: 12, bounds: [0, 0, 640, 340], ds: 3, maxSteps: 900 });
  d.fieldLines(lines.map((l) => l.pts), { arrows: [0.32] });
  const field = pointField(active);
  if (p.thru > 0.5) {
    const stop = (x, y) => active.some((c) => Math.hypot(x - c.x, y - c.y) < 14);
    const opt = { ds: 3, maxSteps: 700, bounds: [0, 0, 640, 340], stop };
    const fwd = traceLine(field, [p.px, p.py], { ...opt, dir: 1 });
    const back = traceLine(field, [p.px, p.py], { ...opt, dir: -1 });
    d.poly([...back.reverse(), ...fwd.slice(1)], { cls: 'ph-E', w: 3, opacity: 0.55 });
  }
  if (Math.abs(p.q2) > 0.02 || p.show2 > 0) {
    d.charge(B.x, B.y, p.q2, { r: 16, label: p.q2 > 0.02 ? '+q' : p.q2 < -0.02 ? '\u2212q' : '', opacity: Math.min(1, Math.abs(p.q2) * 3 + 0.15).toFixed(2) });
  }
  d.charge(A.x, A.y, 1, { r: 16, label: '+q' });
  if (p.vec > 0.01) {
    const g = d.group({ opacity: p.vec.toFixed(2) });
    const sc = (v) => [v[0] * p.sc, v[1] * p.sc];
    const e1 = sc(pointField([cs[0]])(p.px, p.py));
    const e2 = sc(pointField([cs[1]])(p.px, p.py));
    const net = [e1[0] + e2[0], e1[1] + e2[1]];
    // E2 starts at the tip of E1 (head to tail) when tail = 1, at P when tail = 0
    const o2 = [p.px + p.tail * e1[0], p.py + p.tail * e1[1]];
    g.vec(p.px, p.py, ...e1, { cls: 'ph-E', w: 1.6, dash: '5 4' });
    if (Math.hypot(...e2) > 4) g.vec(...o2, ...e2, { cls: 'ph-E', w: 1.6, dash: '5 4' });
    if (Math.hypot(...net) > 3) g.vec(p.px, p.py, ...net, { cls: 'ph-F', w: 2.8 });
    vecLabel(g, p.px, p.py, e1, 'E<sub>1</sub>', 'ph-E', -1);
    if (Math.hypot(...e2) > 20) vecLabel(g, ...o2, e2, 'E<sub>2</sub>', 'ph-E', -1);
    if (Math.hypot(...net) > 20) g.text(p.px + net[0] + 14 * Math.sign(net[0] || 1), p.py + net[1] + 10, 'E', { cls: 'ph-F', serif: true, halo: true, size: 19 });
    if (Math.hypot(...net) <= 3) g.text(p.px, p.py - 38, 'E = 0', { cls: 'ph-F', serif: true, halo: true });
  }
  if (p.vec > 0.01 || p.thru > 0.5) {
    d.dot(p.px, p.py, { r: 4.5, cls: 'ph-F' });
    d.text(p.px - 12, p.py - 14, 'P', { cls: 'ph-F', halo: true });
  }
}

/** Label beside a vector drawn from (x, y): at its middle, pushed sideways (side = +-1). */
function vecLabel(d, x, y, v, s, cls, side) {
  const L = Math.hypot(...v);
  if (L < 1) return;
  const nx = (-v[1] / L) * side;
  const ny = (v[0] / L) * side;
  d.text(x + v[0] / 2 + nx * 15, y + v[1] / 2 + ny * 15, s, { cls, serif: true, halo: true });
}

function dipoleFrames() {
  const f = (p, caption) => ({ draw: dipoleDraw, p: { show2: 0, thru: 0, sc: 1.1e6, tail: 1, ...p }, box: DIP_BOX, caption });
  const P1 = { px: 290, py: 108 };
  return [
    f({ q2: 0, vec: 0, ...P1 }, 'A lone <b>positive</b> charge. Its field lines point <b>straight out</b> in every direction. The 12 lines spread over bigger and bigger spheres, so the line density (the field strength) falls off as <b>1/r<sup>2</sup></b>.'),
    f({ q2: 0, vec: 1, ...P1 }, 'At point P the field is an arrow <b>away from the + charge</b>, length k q/r<sup>2</sup>. It says: a small positive test charge put at P would be pushed this way.'),
    f({ q2: -1, show2: 1, vec: 0, ...P1 }, 'Add an equal <b>negative</b> charge. Lines now <b>start on + and end on \u2212</b>. Each line bends because the field at every point is the sum of two arrows, one from each charge.'),
    f({ q2: -1, show2: 1, vec: 1, ...P1 }, '<b>Superposition</b> at P: E<sub>1</sub> points away from the + charge, E<sub>2</sub> points toward the \u2212 charge. Placed head to tail they add to the net <b>E</b> (black).'),
    f({ q2: -1, show2: 1, vec: 1, thru: 1, ...P1 }, 'The net E is <b>tangent to the field line</b> through P (highlighted). That is what a field line is: a curve that follows the field arrow at every point.'),
    f({ q2: -1, show2: 1, vec: 1, px: 320, py: 268 }, 'On the midline the two pieces are mirror images: their up/down parts cancel and the net field points <b>parallel to the axis, from + toward \u2212</b>.'),
    f({ q2: 1, show2: 1, vec: 1, tail: 0, sc: 0.45e6, px: 320, py: 170 }, 'Flip the right charge to <b>+</b>. Now the lines push away from each other and nothing ends between the charges. At the midpoint the two fields are <b>equal and opposite</b> (dashed), so <b>E = 0</b>. Field lines never cross; where they would, the field is zero.'),
  ];
}

// ---------- figure 2: sandbox ----------
const SB_BOX = [640, 380];
const SB_START = () => ({
  charges: [{ x: 200, y: 190, q: 2 }, { x: 440, y: 120, q: -1 }, { x: 470, y: 290, q: 0 }],
  test: { x: 330, y: 300 },
});
// figure units -> SI: charges in nC, 1 box unit = 1 mm
const toNC = (e) => e * FIG_FIELD;
function sandboxDraw(d, p) {
  const { charges, test, mode, sel } = p;
  const active = charges.filter((c) => c.q !== 0);
  const field = pointField(active);
  if (mode !== 'lines' && active.length) {
    d.fieldGrid(field, { x0: 0, y0: 0, x1: SB_BOX[0], y1: SB_BOX[1], step: 32, len: 17, skip: (x, y) => active.some((c) => Math.hypot(x - c.x, y - c.y) < 24) });
  }
  if (mode !== 'grid' && active.length) {
    const lines = chargeFieldLines(active, { perUnit: 8, bounds: [0, 0, SB_BOX[0], SB_BOX[1]], ds: 3.5, maxSteps: 700 });
    d.fieldLines(lines.map((l) => l.pts), { arrows: [0.3], w: 1.2 });
  }
  charges.forEach((c, i) => {
    if (i === sel) d.circle(c.x, c.y, 19 + 3 * Math.abs(c.q), { cls: 'ph-F', w: 1.4, dash: '3 3' });
    if (c.q === 0) d.circle(c.x, c.y, 14, { id: `c${i}`, drag: true, cls: 'ph-mute', dash: '4 3', w: 1.6 });
    else d.charge(c.x, c.y, c.q, { id: `c${i}`, drag: true, r: 12 + 3 * Math.abs(c.q), label: qLabel(c.q) });
    if (c.q === 0) d.text(c.x, c.y, 'off', { cls: 'ph-mute', size: 11, id: `c${i}`, drag: true });
  });
  const e = field(test.x, test.y);
  const v = scaled(...e, Math.min(120, roomAlong(test, e, SB_BOX)));
  if (Math.hypot(...v) > 2) d.vec(test.x, test.y, ...v, { cls: 'ph-F', w: 2.6 });
  d.circle(test.x, test.y, 15, { id: 'test', drag: true, cls: 'ph-mute', w: 0.01, opacity: 0.01 });
  d.charge(test.x, test.y, 1, { r: 7, label: '', id: 'test', drag: true });
  d.text(test.x, test.y + 20, 'q<sub>0</sub>', { cls: 'ph-label', halo: true });
}

// ---------- figure 3: electron through deflection plates (live) ----------
const PL = { x0: 90, x1: 410, top: 86, bot: 214, mid: 150, gun: 18, screen: 622, pxPerM: 6400 };
const PL_BOX = [640, 290];
const PL_L = (PL.x1 - PL.x0) / PL.pxPerM; // 5 cm
const PL_D = (PL.bot - PL.top) / PL.pxPerM; // 2 cm
const PL_VIS = 75; // on-screen px/s per 10^7 m/s of real speed
const PL_SLOW = (1e7 * PL.pxPerM) / PL_VIS; // real px/s over drawn px/s: how much the animation is slowed
/** Sideways displacement (m, toward the + plate) after x metres past the plate entrance. */
function sideways(r, x, v0) {
  if (x <= 0) return 0;
  if (x <= PL_L) return 0.5 * r.a * (x / v0) ** 2;
  return r.y + Math.tan(r.angle) * (x - PL_L);
}
function platesDraw(d, p, t) {
  const v0 = p.v * 1e7;
  const r = deflection({ V: p.V, d: PL_D, L: PL_L, v0 });
  const endX = r.hits ? PL.x0 + r.xHit * PL.pxPerM : PL.screen;
  const yAt = (xpx) => PL.mid - sideways(r, (xpx - PL.x0) / PL.pxPerM, v0) * PL.pxPerM;
  // plates and field
  d.rect(PL.x0, PL.top - 9, PL.x1 - PL.x0, 9, { cls: 'ph-pos', fill: true, w: 1.4 });
  d.rect(PL.x0, PL.bot, PL.x1 - PL.x0, 9, { cls: 'ph-neg', fill: true, w: 1.4 });
  for (let x = PL.x0 + 20; x < PL.x1; x += 40) {
    d.text(x, PL.top - 22, '+', { cls: 'ph-pos', size: 15 });
    d.text(x, PL.bot + 22, '\u2212', { cls: 'ph-neg', size: 15 });
  }
  if (p.V > 0) {
    const op = Math.min(1, 0.25 + p.V / 600).toFixed(2);
    for (let x = PL.x0 + 40; x < PL.x1; x += 80) d.arrow(x, PL.top + 12, x, PL.bot - 12, { cls: 'ph-E', w: 1.3, opacity: op });
    d.text(PL.x0 + 52, PL.mid + 40, 'E', { cls: 'ph-E', serif: true, halo: true });
  }
  d.line(PL.screen, 40, PL.screen, 260, { cls: 'ph-mute', w: 3 });
  d.text(PL.screen - 6, 28, 'screen', { cls: 'ph-label', anchor: 'end' });
  d.rect(PL.gun - 14, PL.mid - 8, 18, 16, { cls: 'ph-mute', fill: true, rx: 3 });
  // predicted path
  const path = [];
  for (let x = PL.gun; x <= endX; x += 4) path.push([x, yAt(x)]);
  path.push([endX, yAt(endX)]);
  d.poly(path, { cls: 'ph-mute', dash: '4 5', w: 1.4 });
  // moving electron: visual speed proportional to v0
  const vis = PL_VIS * p.v; // px per second (p.v in units of 10^7 m/s)
  const travel = (endX - PL.gun) / vis;
  const tt = t % (travel + 0.9);
  const x = Math.min(endX, PL.gun + vis * tt);
  const y = yAt(x);
  d.poly(path.filter(([px]) => px <= x).concat([[x, y]]), { cls: 'ph-v', w: 2.2, opacity: 0.55 });
  const inside = x > PL.x0 && x < PL.x1 && !(r.hits && x >= endX);
  const xm = (x - PL.x0) / PL.pxPerM;
  const vy = x <= PL.x0 ? 0 : r.a * Math.min(xm, PL_L) / v0; // sideways speed, m/s
  if (!(r.hits && x >= endX)) {
    d.vec(x, y, 46, -46 * (vy / v0), { cls: 'ph-v', w: 2 });
    if (inside && p.V > 0) d.vec(x, y, 0, -34, { cls: 'ph-F', w: 2.4 });
  }
  d.charge(x, y, -1, { r: 8, label: '\u2212', size: 11 });
  d.text(20, 28, 'F = qE points toward the + plate (up)', { cls: 'ph-F', anchor: 'start' });
  d.text(20, 268, 'v (olive): constant forward part, growing sideways part', { cls: 'ph-v', anchor: 'start' });
}

// ---------- quiz ----------
const QP = { box: [480, 150] };
const qPlus = { x: 90, y: 118, q: 1 };
const qMinus = { x: 390, y: 118, q: -1 };
const qP = { x: 240, y: 48 };
const DIRS = Array.from({ length: 8 }, (_, i) => (i * Math.PI) / 4); // screen angles (y down)
const bestDir = () => {
  const [ex, ey] = pointField([qPlus, qMinus])(qP.x, qP.y);
  const a = Math.atan2(ey, ex);
  return DIRS.reduce((b, d, i) => (Math.abs(Math.atan2(Math.sin(d - a), Math.cos(d - a))) < Math.abs(Math.atan2(Math.sin(DIRS[b] - a), Math.cos(DIRS[b] - a))) ? i : b), 0);
};
function pickArrowDraw(d, p) {
  d.line(qPlus.x, qPlus.y, qMinus.x, qMinus.y, { cls: 'ph-mute', dash: '3 5' });
  d.charge(qPlus.x, qPlus.y, 1, { r: 16, label: '+q' });
  d.charge(qMinus.x, qMinus.y, -1, { r: 16, label: '\u2212q' });
  DIRS.forEach((a, i) => d.arrow(qP.x + 12 * Math.cos(a), qP.y + 12 * Math.sin(a), qP.x + 44 * Math.cos(a), qP.y + 44 * Math.sin(a), { id: `a${i}`, w: 2.4, cls: 'ph-mute', style: '--c: var(--ink)' }));
  d.dot(qP.x, qP.y, { r: 4.5, cls: 'ph-F' });
  d.text(qP.x - 52, qP.y, 'P', { cls: 'ph-F', anchor: 'end' });
  if (p.after) {
    const e1 = scaled(...pointField([qPlus])(qP.x, qP.y), 1e9);
    const e2 = scaled(...pointField([qMinus])(qP.x, qP.y), 1e9);
    d.vec(qP.x, qP.y, ...e1, { cls: 'ph-E', dash: '5 4' });
    d.vec(qP.x, qP.y, ...e2, { cls: 'ph-E', dash: '5 4' });
    d.text(qP.x + e1[0] - 8, qP.y + e1[1] + 16, 'E<sub>1</sub>', { cls: 'ph-E', serif: true, halo: true });
    d.text(qP.x + e2[0] + 8, qP.y + e2[1] + 16, 'E<sub>2</sub>', { cls: 'ph-E', serif: true, halo: true });
  }
}

const Z = { a: { x: 60, y: 72, q: 1 }, b: { x: 420, y: 72, q: 4 } };
const ZFRACS = [0.2, 1 / 3, 0.5, 2 / 3, 0.8];
const zeroIndex = () => {
  const x = zeroFieldBetween(Z.a.q, Z.b.q, 1);
  return ZFRACS.reduce((b, f, i) => (Math.abs(f - x) < Math.abs(ZFRACS[b] - x) ? i : b), 0);
};
function pickZeroDraw(d, p) {
  d.line(Z.a.x, Z.a.y, Z.b.x, Z.b.y, { cls: 'ph-mute' });
  d.charge(Z.a.x, Z.a.y, 1, { r: 15, label: '+q' });
  d.charge(Z.b.x, Z.b.y, 4, { r: 22, label: '+4q' });
  const field = pointField([Z.a, Z.b]);
  ZFRACS.forEach((f, i) => {
    const x = Z.a.x + f * (Z.b.x - Z.a.x);
    d.circle(x, Z.a.y, 9, { id: `z${i}`, cls: 'ph-F', w: 2, fill: true });
    d.text(x, Z.a.y + 28, String.fromCharCode(65 + i), { cls: 'ph-label' });
    if (p.after) {
      // direction only (the strengths differ by large factors); E = 0 where the two cancel
      const [ex] = field(x, Z.a.y);
      const zero = Math.abs(ex) < 1e-3 * pointField([Z.a])(x, Z.a.y)[0];
      if (!zero) d.arrow(x - 13 * Math.sign(ex), Z.a.y - 28, x + 13 * Math.sign(ex), Z.a.y - 28, { cls: 'ph-E', w: 2 });
      else d.text(x, Z.a.y - 28, 'E = 0', { cls: 'ph-E', serif: true });
    }
  });
}

const E2 = 900;
const r2over6 = pointE(1, 2) / pointE(1, 6);
const quizDefl = deflection({ V: 300, d: PL_D, L: PL_L, v0: 2.5e7 });

const quiz = [
  {
    type: 'pick',
    id: 'field.dipole-direction',
    prompt: 'Point P sits above the midpoint between +q and \u2212q. Click the arrow that shows the direction of the electric field at P.',
    View: PhysView,
    view: { height: 190, box: QP.box },
    build: () => ({
      frame: { draw: pickArrowDraw, p: {}, box: QP.box },
      answer: [`a${bestDir()}`],
      after: { draw: pickArrowDraw, p: { after: 1 }, box: QP.box },
    }),
    explain: 'Add the two pieces. E<sub>1</sub> points <b>away</b> from +q (up and to the right); E<sub>2</sub> points <b>toward</b> \u2212q (down and to the right). P is equally far from both, so the pieces are the same size: the up and down parts cancel and the rights add. Net: <b>parallel to the axis, from + toward \u2212</b>. (Neither "straight up, away from the charges" nor "toward the + charge".)',
  },
  {
    type: 'input',
    id: 'field.triple-distance',
    prompt: `A point charge makes a field of ${E2} N/C at 2 m. What is the field strength at 6 m, in N/C?`,
    accept: (s) => Math.abs(parseFloat(s) - E2 / r2over6) < 0.5,
    placeholder: 'N/C',
    explain: `E = kq/r<sup>2</sup>. Going from 2 m to 6 m multiplies r by 3, so E is divided by 3<sup>2</sup> = ${r2over6.toFixed(0)}: ${E2}/${r2over6.toFixed(0)} = <b>${(E2 / r2over6).toFixed(0)} N/C</b>.`,
  },
  {
    type: 'pick',
    id: 'field.zero-point',
    prompt: 'Charges +q and +4q sit on a line. Click the point where the electric field is <b>zero</b>.',
    View: PhysView,
    view: { height: 160, box: [480, 116] },
    build: () => ({
      frame: { draw: pickZeroDraw, p: {}, box: [480, 116] },
      answer: [`z${zeroIndex()}`],
      after: { draw: pickZeroDraw, p: { after: 1 }, box: [480, 116] },
    }),
    explain: () => {
      const x = zeroFieldBetween(1, 4, 1);
      return `Both charges push a test charge away from themselves, so between them the two fields point opposite ways and can cancel. Cancel needs k q/x<sup>2</sup> = k(4q)/(d \u2212 x)<sup>2</sup>, so d \u2212 x = 2x and <b>x = d/3 = ${x.toFixed(3)} d</b>: point B, <b>closer to the smaller charge</b>. The midpoint is the trap: there the +4q wins by a factor of 4.`;
    },
  },
  {
    type: 'mcq',
    id: 'field.electron-plates',
    prompt: 'An electron enters horizontally between two horizontal plates; the top plate is +, the bottom is \u2212, so E points down. What path does it follow between the plates?',
    choices: [
      'A parabola curving down, along E',
      'A parabola curving up, toward the + plate',
      'A straight line: the field is uniform, so nothing changes',
      'A circular arc, like a ball on a string',
    ],
    answer: 1,
    explain: `F = qE with q negative, so the force on the electron is <b>opposite to E: up</b>. The force is constant (uniform field), so this is projectile motion turned sideways: constant forward speed, constant sideways acceleration, a <b>parabola</b>. With 300 V across 2 cm and 2.5 \u00d7 10<sup>7</sup> m/s, a = ${fmt(quizDefl.a)} m/s<sup>2</sup>, about ${fmt(quizDefl.a / G_EARTH, 1)} g, so gravity is irrelevant.`,
  },
];

export default {
  id: 'field',
  title: 'The electric field',
  group: 'Electric fields',
  blurb: 'The field as the force per coulomb at every point: point charges, superposition, field lines and charges flying through uniform fields.',
  quiz,
  render(root) {
    root.append(
      p('Coulomb\u2019s law gives the force between two charges that both exist. The <b>electric field</b> splits that into two steps. First, a charge (or a whole arrangement of charges) sets up a field in the space around it. Second, any other charge placed in that space feels a force from the field <b>at the spot where it sits</b>. The field is a vector at every point: the force a charge <i>would</i> feel there, <b>per coulomb</b>.'),
      p('This is the same move as going from "the Earth pulls this 2 kg ball with 19.6 N" to "near the Earth, <i>g</i> = 9.8 N/kg points down". The field is the gravity-like part that belongs to the source; the force is that times the charge you put in it. One difference from gravity: charge has a sign, so a <b>negative charge feels a force opposite to the field</b>.'),
      equation({
        name: 'Field and force',
        eq: '<span class="vec">E</span> = <span class="frac"><span><span class="vec">F</span></span><span>q<sub>0</sub></span></span> \u2003 \u21d4 \u2003 <span class="vec">F</span> = q<span class="vec">E</span>',
        says: 'The field is the force per unit charge on a small test charge q<sub>0</sub>. Turned around: put a charge q in a field and it feels qE, along E if q is positive, against E if q is negative.',
        terms: [
          ['<span class="vec">E</span>', 'electric field at a point (a vector)', 'N/C = V/m'],
          ['<span class="vec">F</span>', 'force on the charge placed there', 'N'],
          ['q<sub>0</sub>, q', 'the charge placed in the field (signed)', 'C'],
        ],
      }),
      p('For a single point charge the field follows straight from Coulomb\u2019s law: drop the second charge and you get the force per coulomb.'),
      equation({
        name: 'Field of a point charge',
        eq: 'E = k <span class="frac"><span>|q|</span><span>r<sup>2</sup></span></span>',
        says: 'Strength grows with the source charge and falls as <b>1/r<sup>2</sup></b>: twice as far, a quarter as strong. Direction: <b>away from a + charge, toward a \u2212 charge</b>.',
        terms: [
          ['E', 'field strength at distance r', 'N/C'],
          ['q', 'the source charge making the field', 'C'],
          ['r', 'distance from the source to the point', 'm'],
          ['k', '= 1/(4\u03c0\u03b5<sub>0</sub>) \u2248 8.99 \u00d7 10<sup>9</sup>', 'N\u00b7m\u00b2/C\u00b2'],
        ],
      }),
      p('With several charges, each makes its own field and the fields <b>add as vectors</b> (superposition, exactly as forces did). The picture below builds the most important two-charge field, the <b>dipole</b>: equal and opposite charges.'),
    );

    const host = h('div');
    root.append(figure({ title: 'Building a dipole field', note: 'Orange curves: field lines computed from the two charges. Dashed arrows: each charge\u2019s field at P; black: the vector sum.' }, host));
    new Player(host, { frames: dipoleFrames(), View: PhysView, view: { height: 360 } });

    root.append(
      callout('key', 'Rules for field lines', '<b>1.</b> They start on + charges and end on \u2212 charges (or run off to infinity). <b>2.</b> The number of lines leaving a charge is proportional to its charge. <b>3.</b> Where lines are dense the field is strong. <b>4.</b> The field at a point is <b>tangent</b> to the line through it. <b>5.</b> Lines <b>never cross</b>: the field has one direction at each point.'),
      p('Try it yourself. Drag the charges and watch the lines rearrange; drag the small test charge q<sub>0</sub> to read the field at any point. Click or drag a charge to select it, then change its size or sign (or switch it off).'),
    );

    // ----- sandbox -----
    const stage = h('div', { class: 'stage' });
    let st = SB_START();
    let mode = 'lines';
    let sel = 0;
    const ro = readouts([['e', 'E at q<sub>0</sub>'], ['dir', 'direction'], ['f', 'force on q<sub>0</sub> = +1 nC']]);
    const selHost = h('div', { style: 'display: contents' });
    const view = new PhysView(stage, {
      height: 380,
      box: SB_BOX,
      onDrag: (id, x, y) => {
        const cx = Math.max(16, Math.min(SB_BOX[0] - 16, x));
        const cy = Math.max(16, Math.min(SB_BOX[1] - 16, y));
        if (id === 'test') st.test = { x: cx, y: cy };
        else {
          const i = Number(id.slice(1));
          if (i !== sel) {
            sel = i;
            buildSel();
          }
          st.charges = st.charges.map((c, k) => (k === i ? { ...c, x: cx, y: cy } : c));
        }
        redraw();
      },
    });
    const buildSel = () => {
      selHost.replaceChildren(
        segmented([-2, -1, 0, 1, 2].map((v) => ({ value: v, label: v === 0 ? 'off' : `${v > 0 ? '+' : '\u2212'}${Math.abs(v)}` })), st.charges[sel].q, (v) => {
          st.charges = st.charges.map((c, k) => (k === sel ? { ...c, q: v } : c));
          redraw();
        }, { label: 'selected charge' }),
      );
    };
    const redraw = () => {
      view.show({ draw: sandboxDraw, p: { ...st, mode, sel }, box: SB_BOX }, { animate: false });
      const active = st.charges.filter((c) => c.q !== 0);
      const [ex, ey] = pointField(active)(st.test.x, st.test.y);
      const mag = toNC(Math.hypot(ex, ey));
      const ang = (Math.atan2(-ey, ex) * 180) / Math.PI;
      ro.set({ e: `${fmt(mag)} N/C`, dir: mag > 0 ? `${ang.toFixed(0)}\u00b0 from +x` : '\u2014', f: `${fmt(mag * 1e-9)} N` });
    };
    buildSel();
    root.append(
      figure(
        {
          title: 'Sandbox: field of a few charges',
          tools: [
            segmented([{ value: 'lines', label: 'Lines' }, { value: 'grid', label: 'Arrows' }, { value: 'both', label: 'Both' }], mode, (v) => ((mode = v), redraw())),
            h('button', { class: 'btn ghost small', text: 'Reset', onclick: () => ((st = SB_START()), (sel = 0), buildSel(), redraw()) }),
          ],
          note: 'Charges in nC; the box is 64 cm wide. In <b>Arrows</b> mode every arrow has the same length and fades where the field is weak. Try: in a dipole, compare E at the midpoint with E just outside one charge on the axis; then make two equal + charges and park q<sub>0</sub> where E = 0.',
        },
        stage,
        controlsRow(h('span', { class: 'slider-label', text: 'Selected charge (nC)' }), selHost),
        ro,
      ),
    );
    redraw();

    root.append(
      callout('warn', 'Classic mistake', 'The field arrow tells you the force on a <b>positive</b> charge. An electron at the same point is pushed the <b>opposite</b> way. And the field at a point does not depend on whether anything is sitting there: E belongs to the source charges, F = qE to the pair.'),
      h('h2', { text: 'Continuous charge and uniform fields' }),
      p('Real objects carry charge spread over lines, surfaces and volumes. The recipe is still superposition: chop the object into little pieces, treat each as a point charge, and <b>add up the field of every piece</b>. That sum is an integral, ' + eq('E = \u222b k dq/r<sup>2</sup>') + ' (with directions), and in this course you mostly need its famous results as scaling facts:'),
      h('ul', {},
        h('li', { html: 'A long <b>line</b> of charge: E points straight out from the line and falls off as <b>1/r</b> (slower than a point charge).' }),
        h('li', { html: 'A large flat <b>sheet</b>: E points straight out from the sheet and is the <b>same at every distance</b>, ' + eq('E = \u03c3/2\u03b5<sub>0</sub>') + '.' }),
        h('li', { html: 'Two oppositely charged <b>parallel plates</b>: the sheets\u2019 fields add between the plates and cancel outside. Between them the field is <b>uniform</b>, ' + eq('E = \u03c3/\u03b5<sub>0</sub>') + ', pointing from + to \u2212.' }),
      ),
      p('Gauss\u2019s law (next chapter) is the shortcut that gets these results without the integral. The uniform field between plates is the workhorse of the course. A charge inside it feels a <b>constant force</b> qE, so it moves exactly like a ball thrown in Physics I: constant velocity across the field, constant acceleration along it, a <b>parabola</b>. This is how an old CRT television or an oscilloscope steers its electron beam.'),
    );

    // ----- plates -----
    const pstage = h('div', { class: 'stage' });
    const pst = { V: 300, v: 2.5 };
    const pro = readouts([['E', 'E = V/d'], ['a', 'acceleration'], ['t', 'time between plates'], ['y', 'deflection at exit']]);
    const pview = new PhysView(pstage, { height: 320, box: PL_BOX });
    const predraw = () => {
      pview.show({ draw: platesDraw, p: { ...pst }, box: PL_BOX, live: true }, { animate: false });
      const r = deflection({ V: pst.V, d: PL_D, L: PL_L, v0: pst.v * 1e7 });
      pro.set({
        E: `${fmt(r.E)} V/m`,
        a: `${fmt(r.a)} m/s<sup>2</sup>`,
        t: `${fmt(r.t * 1e9)} ns`,
        y: r.hits ? '<b>hits the + plate</b>' : `${fmt(r.y * 1000)} mm`,
      });
    };
    root.append(
      figure(
        { title: 'An electron through deflection plates', note: `Plates ${(PL_L * 100).toFixed(0)} cm long, ${(PL_D * 100).toFixed(0)} cm apart. Motion slowed down by about ${fmt(PL_SLOW, 1)} (the same at every speed). Halve the speed and the deflection grows <b>4\u00d7</b>: it spends twice as long in the field, and sideways distance goes as t<sup>2</sup>.` },
        pstage,
        controlsRow(
          slider({ label: 'Plate voltage', min: 0, max: 600, step: 10, value: pst.V, fmt: (v) => `${v} V`, onInput: (v) => ((pst.V = v), predraw()) }),
          slider({ label: 'Entry speed', min: 1.5, max: 5, step: 0.1, value: pst.v, fmt: (v) => `${v.toFixed(1)} \u00d7 10<sup>7</sup> m/s`, onInput: (v) => ((pst.v = v), predraw()) }),
        ),
        pro,
      ),
    );
    predraw();

    root.append(
      p('Two things to notice in the readouts. The acceleration is around 10<sup>15</sup> m/s<sup>2</sup>, so <b>gravity is negligible</b> for electrons and ions in any realistic field. And a proton entering the same plates at the same speed would feel the same size force the other way, but with 1836 times the mass it would bend 1836 times less.'),
      checkpoint(quiz),
    );
  },
};
