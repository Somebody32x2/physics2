import { h, p } from '../ui/dom.js';
import { Player } from '../ui/player.js';
import { PhysView } from '../core/phys-view.js';
import { figure, callout, segmented } from '../ui/figure.js';
import { checkpoint } from '../ui/quiz.js';
import { equation, eq, slider, controlsRow, readouts } from '../ui/controls.js';
import { plateC, plateState, pullApart, insertDielectric, capPair, capSeriesParallel, capEnergy } from '../model/circuits.js';
import { fmtRatio, num, pickBox, seeded } from './circuit-kit.js';

// ---------- oblique 3D parallel plates ----------
// A point (u across, v deep, z up) on the plates, drawn with a simple oblique projection.
const SKX = 0.5;
const SKY = 0.35;
const TH = 7; // plate thickness
const P = (x0, y0, u, v, z) => [x0 + u + SKX * v, y0 - z - SKY * v];

function plate(d, x0, y0, s, z, cls) {
  const q = (u, v, w) => P(x0, y0, u, v, w);
  d.poly([q(0, 0, z), q(s, 0, z), q(s, 0, z - TH), q(0, 0, z - TH)], { closed: true, fill: true, cls, style: '--fo: 0.35' });
  d.poly([q(s, 0, z), q(s, s, z), q(s, s, z - TH), q(s, 0, z - TH)], { closed: true, fill: true, cls, style: '--fo: 0.25' });
  d.poly([q(0, 0, z), q(s, 0, z), q(s, s, z), q(0, s, z)], { closed: true, fill: true, cls, style: '--fo: 0.1' });
}

/** Grid positions (u, v) for n charges spread evenly over an s x s plate. */
function grid(n, s) {
  if (n <= 0) return [];
  const cols = Math.ceil(Math.sqrt(n));
  const rows = Math.ceil(n / cols);
  const out = [];
  for (let i = 0; i < n; i++) {
    const r = Math.floor(i / cols);
    const inRow = r === rows - 1 ? n - r * cols : cols;
    const c = i % cols;
    out.push([((c + 0.5 + (cols - inRow) / 2) / cols) * s, ((r + 0.5) / rows) * s]);
  }
  return out;
}

/**
 * Parallel-plate capacitor in 3D: bottom plate top face at z = 0, top plate's lower face at z = gap.
 * o: { x0, y0, s, gap, n (charges = field lines), battery: x of the battery or null, vLabel }
 */
function plates3d(d, o) {
  const { x0, y0, s, gap, n } = o;
  const pts = grid(n, s);
  plate(d, x0, y0, s, 0, 'ph-neg');
  // field lines, one per charge pair, top plate down to bottom plate
  const lines = d.group({ cls: 'ph-E' });
  for (const [u, v] of pts) {
    const [xa, ya] = P(x0, y0, u, v, gap);
    const [, yb] = P(x0, y0, u, v, 0);
    lines.line(xa, ya, xa, yb, { w: 1.3 });
    const ym = (ya + yb) / 2;
    if (yb - ya > 18) lines.arrow(xa, ym - 6, xa, ym + 4, { head: 8, w: 0.01 });
  }
  for (const [u, v] of pts) d.text(...P(x0, y0, u, v, 0), '\u2212', { cls: 'ph-neg', size: 14, halo: true });
  plate(d, x0, y0, s, gap + TH, 'ph-pos');
  for (const [u, v] of pts) d.text(...P(x0, y0, u, v, gap + TH), '+', { cls: 'ph-pos', size: 14, halo: true });
  // labels
  const [lx, ly] = P(x0, y0, 0, 0, gap + TH / 2);
  d.text(lx - 10, ly, '+Q', { cls: 'ph-pos', anchor: 'end', serif: true });
  const [bx2, by2] = P(x0, y0, 0, 0, -TH / 2);
  d.text(bx2 - 10, by2, '\u2212Q', { cls: 'ph-neg', anchor: 'end', serif: true });
  const [rx, ry0] = P(x0, y0, s, s, 0);
  const [, ry1] = P(x0, y0, s, s, gap);
  d.line(rx + 14, ry0, rx + 14, ry1, { cls: 'ph-label', w: 1 });
  d.line(rx + 9, ry0, rx + 19, ry0, { cls: 'ph-label', w: 1 });
  d.line(rx + 9, ry1, rx + 19, ry1, { cls: 'ph-label', w: 1 });
  d.text(rx + 24, (ry0 + ry1) / 2, 'd', { cls: 'ph-label', serif: true, anchor: 'start' });
  const [ax, ay] = P(x0, y0, s * 0.5, s, gap + TH);
  d.text(ax, ay - 12, 'area A', { cls: 'ph-label' });
  if (o.battery != null) {
    const [tx, ty] = P(x0, y0, 0, s / 2, gap + TH / 2);
    const [gx, gy] = P(x0, y0, 0, s / 2, -TH / 2);
    const bx = o.battery;
    d.wire([[tx, ty], [bx, ty]]);
    d.wire([[gx, gy], [bx, gy]]);
    d.battery(bx, gy, bx, ty, {});
    if (o.vLabel) d.text(bx - 26, (ty + gy) / 2, o.vLabel, { anchor: 'end', serif: true });
  }
}

// ---------- figure 1: sandbox ----------
const QUNIT = 0.1e-9; // one + sign per 0.1 nC
const sandboxGeom = (Acm2, dmm) => ({ s: 100 * Math.sqrt(Acm2 / 100), gap: 30 * dmm });
function sandboxDraw(d, p) {
  const { s, gap } = sandboxGeom(p.A, p.dmm);
  plates3d(d, { x0: 240, y0: 129 + (gap + SKY * s) / 2, s, gap, n: p.n, battery: 120, vLabel: `${num(p.V, 3)} V` });
}

// ---------- figure 2: pulling the plates apart ----------
const PULL = { A: 0.02, d0: 1e-3, V0: 10 };
const N0 = 12;
const QTY = ['C', 'Q', 'V', 'E', 'U'];
function pullDraw(d, p) {
  const n = Math.round(p.n);
  plates3d(d, { x0: 150, y0: 228, s: 140, gap: 40 * p.f, n, battery: p.battery ? 70 : null, vLabel: '10 V' });
  if (!p.battery) {
    d.text(20, 132, 'isolated:', { cls: 'ph-label', anchor: 'start' });
    d.text(20, 150, 'Q is trapped', { cls: 'ph-label', anchor: 'start' });
  }
  const bx = 450;
  const unit = 45;
  d.line(bx + unit, 30, bx + unit, 222, { cls: 'ph-mute', dash: '3 4', w: 1 });
  d.text(bx + unit, 18, 'start', { cls: 'ph-label' });
  QTY.forEach((k, i) => {
    const y = 52 + i * 39;
    const r = p.r[i];
    d.text(bx - 16, y, k, { serif: true, cls: k === 'E' ? 'ph-E' : '' });
    d.rect(bx, y - 9, Math.max(1, unit * r), 18, { fill: true, cls: k === 'E' ? 'ph-E' : 'ph-plot', rx: 3, style: '--fo: 0.55', w: 1 });
    d.text(bx + unit * r + 8, y, fmtRatio(r), { anchor: 'start', cls: 'ph-label' });
  });
}
function pullFrames(mode) {
  const st = (f) => pullApart({ ...PULL, factor: f, mode });
  const s1 = st(1).now;
  const f = (k, caption) => {
    const s = st(k);
    return { draw: pullDraw, p: { f: k, n: N0 * s.ratio.Q, battery: mode === 'battery', r: QTY.map((q) => s.ratio[q]) }, box: [640, 250], caption };
  };
  const pc = (x) => num(x * 1e12, 3);
  const nc = (x) => num(x * 1e9, 3);
  const nj = (x) => num(x * 1e9, 3);
  if (mode === 'battery') {
    const s2 = st(2).now;
    const s3 = st(3).now;
    return [
      f(1, `Plates 1 mm apart on a <b>10 V battery</b>: C = ${pc(s1.C)} pF, Q = CV = ${nc(s1.Q)} nC, U = ${nj(s1.U)} nJ. Twelve + signs, twelve \u2212 signs, one field line from each +.`),
      f(2, `Pull the gap to 2 mm. The battery still holds <b>V = 10 V</b>. C \u221d 1/d halves to ${pc(s2.C)} pF, so <b>Q = CV halves</b> to ${nc(s2.Q)} nC: charge flows back into the battery. E = V/d halves too.`),
      f(3, `At 3 mm: C, Q and E are all <b>\u00d7\u2153</b>. Stored energy U = \u00bdCV\u00b2 falls to ${nj(s3.U)} nJ: with V fixed, U follows C.`),
      f(3, 'Where did the energy go? You did positive work pulling (the plates attract), and the field lost energy too. Both went into <b>pushing charge back into the battery</b>, recharging it.'),
    ];
  }
  const s2 = st(2).now;
  const s3 = st(3).now;
  return [
    f(1, `Same capacitor charged to 10 V, then <b>disconnected</b>. Now nothing can carry charge on or off: Q = ${nc(s1.Q)} nC is trapped.`),
    f(2, `Pull the gap to 2 mm. <b>Q is fixed</b>, so the charge density and the field are unchanged: same 12 lines, same E. C still halves, so <b>V = Q/C doubles</b> to ${num(s2.V)} V.`),
    f(3, `At 3 mm: V = ${num(s3.V)} V (V = Ed with the same E over 3\u00d7 the gap). Energy U = Q\u00b2/2C <b>triples</b> to ${nj(s3.U)} nJ.`),
    f(3, 'The extra energy is the <b>work you did</b> pulling the attracting plates apart. The same field now fills 3\u00d7 the volume, and field energy scales with volume: the energy lives in the field.'),
  ];
}

// ---------- figure 3: dielectric (side view) ----------
const KAPPA = 3;
const DL = { x0: 70, x1: 330, yTop: 60, yBot: 200, n: 12 };
const MOL = (() => {
  const rnd = seeded(7);
  const out = [];
  for (let r = 0; r < 3; r++) for (let c = 0; c < 6; c++) out.push({ u: (2 * c + 1) / 12, w: (r + 0.5) / 3, a: rnd() * Math.PI * 2 });
  return out;
})();
const lineX = (i) => DL.x0 + ((i + 0.5) / DL.n) * (DL.x1 - DL.x0);
const passes = (i) => i % KAPPA === 1;
function dielDraw(d, p) {
  const { x0, x1, yTop, yBot, n } = DL;
  const sy0 = yTop + 12;
  const sy1 = yBot - 12;
  const sx = x0 + p.slab;
  const W = x1 - x0;
  const inside = (x) => x >= sx && x <= sx + W;
  // slab
  d.rect(sx, sy0, W, sy1 - sy0, { cls: 'ph-glass', fill: true, rx: 4 });
  d.text(sx - 10, (sy0 + sy1) / 2, `\u03ba = ${KAPPA}`, { cls: 'ph-label', anchor: 'end', serif: true });
  // field lines: inside the slab, the ones that end on bound charges fade out as the bound layers build up
  const lines = d.group({ cls: 'ph-E' });
  for (let i = 0; i < n; i++) {
    const x = lineX(i);
    const cut = inside(x) && !passes(i);
    lines.line(x, yTop, x, sy0, { w: 1.3 });
    lines.line(x, sy1, x, yBot, { w: 1.3 });
    lines.line(x, sy0, x, sy1, { w: 1.3, opacity: cut ? (1 - p.bound * 0.92).toFixed(2) : 1 });
    if (!cut || p.bound < 0.5) lines.arrow(x, 124, x, 136, { head: 8, w: 0.01, opacity: cut ? (1 - p.bound).toFixed(2) : 1 });
  }
  // molecules: little dipoles, - end blue, + end red, pointing from - to + at angle a
  MOL.forEach((m, k) => {
    const cx = sx + m.u * W;
    const cy = sy0 + 14 + m.w * (sy1 - sy0 - 28);
    const a = p.ang[k];
    const dx = Math.cos(a) * 7;
    const dy = Math.sin(a) * 7;
    d.line(cx - dx, cy - dy, cx + dx, cy + dy, { cls: 'ph-mute', w: 1.2 });
    d.dot(cx - dx, cy - dy, { r: 3.6, cls: 'ph-neg' });
    d.dot(cx + dx, cy + dy, { r: 3.6, cls: 'ph-pos' });
  });
  // bound surface charge layers
  if (p.bound > 0.02) {
    for (let i = 0; i < n; i++) {
      if (passes(i) || !inside(lineX(i))) continue;
      d.text(lineX(i), sy0 + 7, '\u2212', { cls: 'ph-neg', size: 13, opacity: p.bound.toFixed(2) });
      d.text(lineX(i), sy1 - 7, '+', { cls: 'ph-pos', size: 13, opacity: p.bound.toFixed(2) });
    }
  }
  // plates
  d.rect(x0, yTop - 14, W, 14, { cls: 'ph-pos', fill: true, style: '--fo: 0.25' });
  d.rect(x0, yBot, W, 14, { cls: 'ph-neg', fill: true, style: '--fo: 0.25' });
  for (let i = 0; i < n; i++) {
    d.text(lineX(i), yTop - 7, '+', { cls: 'ph-pos', size: 13 });
    d.text(lineX(i), yBot + 7, '\u2212', { cls: 'ph-neg', size: 13 });
  }
  // readout of the ratios to the empty capacitor
  const k = 1 + (KAPPA - 1) * p.bound;
  const rd = insertDielectric(k);
  const rat = (v) => (Math.abs(v - 1) < 0.005 ? '' : `${fmtRatio(v).slice(1)} `);
  const items = ['Q = Q<sub>0</sub>', `E = ${rat(rd.E)}E<sub>0</sub>`, `V = ${rat(rd.V)}V<sub>0</sub>`, `C = ${rat(rd.C)}C<sub>0</sub>`];
  items.forEach((s, i) => d.text(110 + i * 140, 248, s, { serif: true }));
}
function dielFrames() {
  const rand = MOL.map((m) => m.a);
  const aligned = MOL.map(() => Math.PI / 2);
  const f = (q, caption) => ({ draw: dielDraw, p: q, box: [640, 262], caption });
  const r = insertDielectric(KAPPA);
  return [
    f({ slab: 300, ang: rand, bound: 0 }, 'A charged, <b>isolated</b> capacitor: Q is fixed. Twelve field lines run from the + plate to the \u2212 plate. Beside it, a slab of plastic: neutral, but its molecules can stretch.'),
    f({ slab: 0, ang: rand, bound: 0 }, 'Slide the slab in. Each molecule is still neutral overall, so on its own the slab adds no net charge.'),
    f({ slab: 0, ang: aligned, bound: 0 }, 'The field <b>polarizes</b> the molecules: + ends are pushed down (along E), \u2212 ends up. Every molecule becomes a small dipole lined up with the field.'),
    f({ slab: 0, ang: aligned, bound: 1 }, `Inside, neighboring + and \u2212 ends cancel. At the surfaces they don\u2019t: a layer of <b>\u2212 bound charge</b> faces the + plate and + faces the \u2212 plate. ${Math.round(N0 * r.boundFraction)} of the 12 lines end on it; ${Math.round(N0 * r.E)} pass through. <b>E inside = E<sub>0</sub>/\u03ba</b>.`),
    f({ slab: 0, ang: aligned, bound: 1 }, `Q is unchanged, but V = Ed is now V<sub>0</sub>/${KAPPA}, so <b>C = Q/V is ${KAPPA}\u00d7 bigger</b>: C = \u03baC<sub>0</sub>. Stored energy Q\u00b2/2C drops to ${fmtRatio(r.U).slice(1)} of its value: the field pulls the slab in.`),
  ];
}

// ---------- figure 4: two capacitors, series vs parallel ----------
const PAIR = { C1: 2e-6, C2: 6e-6, emf: 12 };
function pairDraw(d, p) {
  const r = capPair(PAIR.C1, PAIR.C2, PAIR.emf, p.how);
  const uc = (x) => num(x * 1e6, 3);
  const lab = (x, y, i, anchor = 'start') => {
    d.text(x, y - 18, `C<sub>${i + 1}</sub> = ${uc([PAIR.C1, PAIR.C2][i])} \u03bcF`, { anchor, serif: true });
    d.text(x, y + 2, `Q = ${uc(r.Q[i])} \u03bcC`, { anchor, cls: 'ph-pos' });
    d.text(x, y + 20, `V = ${num(r.V[i])} V`, { anchor, cls: 'ph-label' });
  };
  const yT = 40;
  const yB = 200;
  d.battery(70, yB, 70, yT, {});
  d.text(40, (yT + yB) / 2, '12 V', { anchor: 'end', serif: true });
  if (p.how === 'parallel') {
    d.wire([[70, yT], [460, yT], [460, yT]]);
    d.wire([[70, yB], [460, yB]]);
    d.capacitor(250, yT, 250, yB, {});
    d.capacitor(460, yT, 460, yB, {});
    d.node(250, yT);
    d.node(250, yB);
    lab(278, 120, 0);
    lab(488, 120, 1);
  } else {
    d.capacitor(70, yT, 300, yT, {});
    d.capacitor(300, yT, 530, yT, {});
    d.wire([[530, yT], [530, yB], [70, yB]]);
    lab(185, 108, 0, 'middle');
    lab(415, 108, 1, 'middle');
  }
  d.text(220, 232, `C<sub>eq</sub> = ${uc(r.Ceq)} \u03bcF`, { serif: true });
  d.text(420, 232, `total Q = ${uc(r.Ceq * PAIR.emf)} \u03bcC`, { serif: true });
}

// ---------- quiz helpers ----------
const SP = { C1: 2e-6, C2: 4e-6, C3: 2e-6, emf: 12 };
const sp = () => capSeriesParallel(SP.C1, SP.C2, SP.C3, SP.emf);
function spDraw(d, p) {
  const yT = 30;
  const yB = 180;
  const xs = [180, 330, 470];
  d.battery(60, yB, 60, yT, {});
  d.text(80, 120, '12 V', { anchor: 'start', serif: true });
  d.wire([[60, yB], [470, yB]]);
  d.capacitor(60, yT, 300, yT, {});
  d.wire([[300, yT], [470, yT]]);
  d.capacitor(330, yT, 330, yB, {});
  d.capacitor(470, yT, 470, yB, {});
  d.node(330, yT);
  d.node(330, yB);
  const caps = [SP.C1, SP.C2, SP.C3];
  const centers = [[xs[0], yT], [xs[1], 105], [xs[2], 105]];
  const s = sp();
  centers.forEach(([x, y], i) => {
    pickBox(d, x, y, 56, 56, `cap${i + 1}`);
    const lx = i === 0 ? x : x + 34;
    const ly = i === 0 ? y + 44 : y;
    d.text(lx, ly, `C<sub>${i + 1}</sub> = ${num(caps[i] * 1e6)} \u03bcF`, { serif: true, anchor: i === 0 ? 'middle' : 'start' });
    if (p.show) d.text(lx, ly + 20, `Q = ${num(s.Q[i] * 1e6)} \u03bcC`, { cls: 'ph-pos', anchor: i === 0 ? 'middle' : 'start' });
  });
}
const mostCharged = () => {
  const q = sp().Q;
  return `cap${q.indexOf(Math.max(...q)) + 1}`;
};

const Ctest = plateC(0.01, 1e-3);
const quiz = [
  {
    type: 'input',
    id: 'capacitance.double-v',
    prompt: 'A capacitor stays connected to a battery. You swap in a battery with <b>twice the voltage</b>. The stored energy is multiplied by what?',
    answers: [String(capEnergy(1, 2) / capEnergy(1, 1))],
    placeholder: 'factor',
    explain: `C depends only on the geometry, so it does not change. U = \u00bdCV\u00b2, and V doubled, so U is multiplied by 2\u00b2 = ${capEnergy(1, 2) / capEnergy(1, 1)}. (Q = CV only doubles.)`,
  },
  {
    type: 'mcq',
    id: 'capacitance.isolated-pull',
    prompt: 'A charged capacitor is <b>disconnected</b> from its battery. You pull the plates to twice the separation. What happens to the voltage between the plates?',
    choices: ['It halves, because C halved', 'It stays the same: voltage is set by the battery', 'It doubles', 'It quadruples'],
    answer: 2,
    explain: `Disconnected means Q is fixed. C = \u03b5<sub>0</sub>A/d halves, so V = Q/C is multiplied by ${fmtRatio(pullApart({ factor: 2, mode: 'isolated' }).ratio.V).slice(1)}. Equivalently, E = \u03c3/\u03b5<sub>0</sub> is unchanged and V = Ed with twice the d. "Stays the same" is the battery-connected case.`,
  },
  {
    type: 'input',
    id: 'capacitance.plate-c',
    prompt: 'Two square plates 10 cm on a side (A = 0.01 m\u00b2) sit 1 mm apart in air. What is C, in <b>picofarads</b>?',
    accept: (t) => Math.abs(parseFloat(t) - Ctest * 1e12) < 1,
    placeholder: 'pF',
    explain: `C = \u03b5<sub>0</sub>A/d = (8.85 \u00d7 10<sup>\u221212</sup>)(0.01)/(0.001) = ${num(Ctest * 1e12, 3)} \u00d7 10<sup>\u221212</sup> F \u2248 ${num(Ctest * 1e12, 3)} pF. A farad is enormous: everyday capacitors are pF to mF.`,
  },
  {
    type: 'pick',
    id: 'capacitance.most-charge',
    prompt: 'C<sub>1</sub> is in series with the parallel pair C<sub>2</sub>, C<sub>3</sub>. Click the capacitor that holds the <b>most charge</b>.',
    View: PhysView,
    view: { height: 220, box: [600, 200] },
    build: () => ({
      frame: { draw: spDraw, p: { show: 0 }, box: [600, 200] },
      answer: [mostCharged()],
      after: { draw: spDraw, p: { show: 1 }, box: [600, 200] },
    }),
    explain: () => {
      const s = sp();
      return `All the charge that leaves C<sub>1</sub>\u2019s right-hand plate has to land on C<sub>2</sub> or C<sub>3</sub>, so Q<sub>1</sub> = Q<sub>2</sub> + Q<sub>3</sub>. The pair acts like ${num((SP.C2 + SP.C3) * 1e6)} \u03bcF; in series with 2 \u03bcF that is C<sub>eq</sub> = ${num(s.Ceq * 1e6)} \u03bcF, so Q<sub>1</sub> = ${num(s.Q[0] * 1e6)} \u03bcC, which splits ${num(s.Q[1] * 1e6)} + ${num(s.Q[2] * 1e6)} \u03bcC. The biggest capacitor is not the one with the most charge.`;
    },
  },
];

export default {
  id: 'capacitance',
  title: 'Capacitors',
  group: 'Circuits',
  blurb: 'Two plates, equal and opposite charge: how much charge per volt, where the energy sits, and what dielectrics do.',
  quiz,
  render(root) {
    root.append(
      p('A <b>capacitor</b> is any two conductors near each other, holding equal and opposite charges +Q and \u2212Q. Connect it to a battery and the battery moves charge from one conductor to the other until the voltage between them matches the battery. The more charge a pair of conductors needs to reach a given voltage, the bigger its <b>capacitance</b>.'),
      p('The standard example is two flat plates facing each other across a small gap. From the Gauss chapter, the field between two oppositely charged sheets is uniform, ' + eq('E = \u03c3/\u03b5<sub>0</sub>') + ', and zero outside. From the potential chapter, a uniform field over a gap gives ' + eq('V = Ed') + '. Put those together and charge and voltage are simply proportional. The constant of proportionality is C.'),
      equation({
        name: 'Definition of capacitance',
        eq: 'Q = C V',
        says: 'Charge stored is proportional to the voltage across the capacitor. C is the charge per volt, and it depends only on the <b>shape, size and filling</b> of the conductors, never on Q or V.',
        terms: [
          ['Q', 'charge on the + plate (the other has \u2212Q)', 'C'],
          ['V', 'potential difference between the plates', 'V'],
          ['C', 'capacitance; 1 farad = 1 C/V (huge: real ones are pF to mF)', 'F'],
        ],
      }),
      equation({
        name: 'Parallel-plate capacitor',
        eq: 'C = <span class="frac"><span>\u03ba \u03b5<sub>0</sub> A</span><span>d</span></span>',
        says: 'Bigger plates hold more charge at the same voltage; a smaller gap means less voltage for the same field, so also more C. Filling the gap with an insulator multiplies C by \u03ba.',
        terms: [
          ['A', 'area of each plate', 'm\u00b2'],
          ['d', 'gap between the plates', 'm'],
          ['\u03b5<sub>0</sub>', '8.85 \u00d7 10<sup>\u221212</sup>, permittivity of free space', 'F/m'],
          ['\u03ba', 'dielectric constant of the filling (1 for vacuum or air, 2 to 10 for plastics and glass)', ''],
        ],
      }),
    );

    // sandbox
    const stage = h('div', { class: 'stage' });
    const view = new PhysView(stage, { height: 300, box: [640, 240] });
    const st = { A: 200, dmm: 2, V: 9 };
    const ro = readouts([['C', 'C'], ['Q', 'Q = CV'], ['E', 'E = V/d'], ['U', 'U = \u00bdCV\u00b2']]);
    const redraw = () => {
      const s = plateState({ A: st.A * 1e-4, d: st.dmm * 1e-3, V: st.V });
      view.show({ draw: sandboxDraw, p: { ...st, n: Math.round(s.Q / QUNIT) }, box: [640, 240] }, { animate: false });
      ro.set({ C: `${num(s.C * 1e12, 3)} pF`, Q: `${num(s.Q * 1e9, 3)} nC`, E: `${num(s.E / 1000, 3)} kV/m`, U: `${num(s.U * 1e9, 3)} nJ` });
    };
    root.append(
      figure(
        { title: 'Sandbox: a parallel-plate capacitor', note: 'Each + sign stands for 0.1 nC, and each field line starts on a + and ends on a \u2212. Try: double the area, then halve the gap. Which change also makes the field stronger?' },
        stage,
        controlsRow(
          slider({ label: 'Area A', min: 100, max: 400, step: 25, value: st.A, fmt: (v) => `${v} cm\u00b2`, onInput: (v) => ((st.A = v), redraw()) }),
          slider({ label: 'Gap d', min: 1, max: 4, step: 0.25, value: st.dmm, fmt: (v) => `${v.toFixed(2)} mm`, onInput: (v) => ((st.dmm = v), redraw()) }),
          slider({ label: 'Battery V', min: 0, max: 12, step: 0.5, value: st.V, fmt: (v) => `${v.toFixed(1)} V`, onInput: (v) => ((st.V = v), redraw()) }),
        ),
        ro,
      ),
    );
    redraw();

    root.append(
      p('Notice what the field does. Bigger plates at the same voltage add more charge, but spread over more area, so E = V/d does not change: the extra lines just cover more ground. A smaller gap at the same voltage makes the field stronger and pulls more charge onto the same plates.'),
      p('Charging a capacitor takes work: each new bit of charge has to be pushed onto a plate that already repels it. That work is stored, and you get it back when the capacitor discharges (a camera flash, a defibrillator). The best way to think about where it lives: <b>in the electric field between the plates</b>, about ' + eq('\u00bd\u03b5<sub>0</sub>E<sup>2</sup>') + ' per cubic meter.'),
      equation({
        name: 'Energy stored in a capacitor',
        eq: 'U = \u00bd C V<sup>2</sup> = <span class="frac"><span>Q<sup>2</sup></span><span>2C</span></span> = \u00bd Q V',
        says: 'Three versions of one formula (use Q = CV to switch). Pick the one whose variables are <b>held fixed</b>: with a battery attached V is fixed, so use \u00bdCV\u00b2; for an isolated capacitor Q is fixed, so use Q\u00b2/2C.',
        terms: [
          ['U', 'energy stored in the field', 'J'],
          ['\u00bd', 'not 1: the average voltage while charging up from 0 to V is V/2', ''],
        ],
      }),
    );

    // pull-apart player with mode toggle
    const host = h('div');
    let player;
    root.append(
      figure(
        {
          title: 'Pulling the plates apart',
          tools: [segmented([{ value: 'battery', label: 'Battery connected' }, { value: 'isolated', label: 'Isolated' }], 'battery', (m) => player.load(pullFrames(m)), { label: 'circuit' })],
          note: 'Bars show each quantity relative to its starting value (dashed line). Switch modes and step through again: the gap does the same thing, the consequences do not.',
        },
        host,
      ),
    );
    player = new Player(host, { frames: pullFrames('battery'), View: PhysView, view: { height: 270 } });

    root.append(
      callout('key', 'First ask: what is held fixed?', 'Capacitor problems that change something split into two cases. <b>Connected to a battery: V is fixed</b> (Q adjusts, use U = \u00bdCV\u00b2). <b>Isolated: Q is fixed</b> (V adjusts, use U = Q\u00b2/2C). C itself only changes when the geometry or the filling changes.'),
      p('An insulator in the gap, a <b>dielectric</b>, raises the capacitance. It contains no free charge, but its molecules stretch in the field into tiny dipoles. Their ends cancel inside the slab but not at its surfaces, where a thin layer of "bound" charge partly cancels the field from the plates.'),
    );

    const dhost = h('div');
    root.append(figure({ title: 'What a dielectric does', note: `\u03ba = ${KAPPA} here: one line in ${KAPPA} survives inside the slab.` }, dhost));
    new Player(dhost, { frames: dielFrames(), View: PhysView, view: { height: 280 } });

    root.append(
      p('Capacitors in circuits combine by the opposite rules from resistors (next chapters). Side by side (<b>parallel</b>) they share the same voltage and act like one plate of the combined area: ' + eq('C<sub>eq</sub> = C<sub>1</sub> + C<sub>2</sub>') + '. End to end (<b>series</b>) they carry the same charge (whatever leaves one plate lands on the next), the voltages add, and ' + eq('1/C<sub>eq</sub> = 1/C<sub>1</sub> + 1/C<sub>2</sub>') + ', which is smaller than either: it acts like a wider gap.'),
    );
    const pstage = h('div', { class: 'stage' });
    const pview = new PhysView(pstage, { height: 250, box: [640, 250] });
    const showPair = (how) => pview.show({ draw: pairDraw, p: { how }, box: [640, 250] }, { animate: false });
    root.append(
      figure(
        {
          title: 'Two capacitors on 12 V',
          tools: [segmented([{ value: 'parallel', label: 'Parallel' }, { value: 'series', label: 'Series' }], 'parallel', showPair, { label: 'connection' })],
          note: 'Parallel: same V, charges add. Series: same Q, voltages add, and the <b>smaller</b> capacitor takes the larger share of the voltage.',
        },
        pstage,
      ),
    );
    showPair('parallel');

    root.append(
      callout('warn', 'Classic mistake', 'Using the resistor rules for capacitors. For capacitors, <b>parallel adds directly</b> and <b>series adds reciprocals</b>, the reverse of resistors. A quick check: series C<sub>eq</sub> is always smaller than the smallest capacitor in the chain.'),
      checkpoint(quiz),
    );
  },
};
