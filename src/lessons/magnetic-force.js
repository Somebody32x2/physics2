import { h, p } from '../ui/dom.js';
import { Player } from '../ui/player.js';
import { PhysView } from '../core/phys-view.js';
import { figure, callout, segmented } from '../ui/figure.js';
import { checkpoint } from '../ui/quiz.js';
import { equation, eq, slider, controlsRow, readouts } from '../ui/controls.js';
import { lorentz, cyclotronRadius, cyclotronPeriod, wireForce, trajectory, E_CHARGE, AMU, M_PROTON } from '../model/magnetism.js';
import { dirOf, dirName, DIR_WORDS, perpMark, flowDots, num } from './magnet-kit.js';

const V3 = (deg) => [...dirOf(deg), 0];
const B3 = (mode) => (mode === 'in' ? [0, 0, 1] : mode === 'out' ? [0, 0, -1] : [1, 0, 0]);
const angleBetween = (a, b) => {
  const dot = a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  return Math.acos(Math.max(-1, Math.min(1, dot / (Math.hypot(...a) * Math.hypot(...b)))));
};

// ---------- figure 1: right-hand rule, case by case ----------
// p: { q (+1 / -1, tweens through 0), vAng (deg, counterclockwise on screen), bmode: 'in' | 'out' | 'plane' }
function rhrDraw(d, p) {
  const cx = 180;
  const cy = 150;
  if (p.bmode === 'plane') {
    for (const y of [30, 70, 240, 280]) d.arrow(24, y, 340, y, { cls: 'ph-B', w: 1.5, opacity: 0.6 });
    d.text(338, 22, 'B \u2192', { cls: 'ph-B', anchor: 'end', size: 14, halo: true });
  } else {
    d.bGrid(20, 20, 340, 280, p.bmode, { step: 40, opacity: 0.6 });
    d.text(338, 14, p.bmode === 'in' ? 'B into the page' : 'B out of the page', { cls: 'ph-B', anchor: 'end', size: 13, halo: true });
  }
  const v = V3(p.vAng);
  d.arrow(cx + v[0] * 20, cy + v[1] * 20, cx + v[0] * 112, cy + v[1] * 112, { cls: 'ph-v', w: 2.8 });
  d.text(cx + v[0] * 130, cy + v[1] * 130, 'v', { cls: 'ph-v', serif: true, size: 20, halo: true });
  const F = lorentz(p.q, v, B3(p.bmode));
  const inPlane = Math.hypot(F[0], F[1]);
  if (inPlane > 0.03) {
    const ux = F[0] / inPlane;
    const uy = F[1] / inPlane;
    const L = 20 + 92 * inPlane;
    d.arrow(cx + ux * 20, cy + uy * 20, cx + ux * L, cy + uy * L, { cls: 'ph-F', w: 3 });
    d.text(cx + ux * (L + 18), cy + uy * (L + 18), 'F', { cls: 'ph-F', serif: true, size: 20, halo: true });
  }
  if (Math.abs(F[2]) > 0.03) {
    perpMark(d, cx - 62, cy - 50, F[2] > 0 ? 'in' : 'out', { cls: 'ph-F', r: 8 + 8 * Math.abs(F[2]), w: 2.2 });
    d.text(cx - 92, cy - 50, 'F', { cls: 'ph-F', serif: true, size: 20, halo: true });
  }
  d.charge(cx, cy, p.q, { r: 17, size: 20, label: p.q > 0.05 ? '+' : p.q < -0.05 ? '\u2212' : '0' });

  // right panel: the bookkeeping
  const x0 = 384;
  const row = (y, label, value, cls) => {
    d.text(x0, y, label, { cls: 'ph-label', anchor: 'start', size: 14 });
    d.text(x0 + 70, y, value, { cls, anchor: 'start', size: 14 });
  };
  row(46, 'charge', p.q > 0 ? 'positive' : 'negative', p.q > 0 ? 'ph-pos' : 'ph-neg');
  row(86, 'v', '', 'ph-v');
  d.arrow(x0 + 88 - v[0] * 15, 86 - v[1] * 15, x0 + 88 + v[0] * 15, 86 + v[1] * 15, { cls: 'ph-v', w: 2.2 });
  row(126, 'B', p.bmode === 'plane' ? '' : p.bmode === 'in' ? 'into page' : 'out of page', 'ph-B');
  if (p.bmode === 'plane') d.vec(x0 + 70, 126, 34, 0, { cls: 'ph-B', w: 2.2 });
  else perpMark(d, x0 + 168, 126, p.bmode, { cls: 'ph-B', r: 9 });
  const theta = angleBetween(v, B3(p.bmode));
  const mag = Math.abs(p.q) * Math.sin(theta);
  row(166, 'F', DIR_WORDS[dirName(F, 0.03)], 'ph-F');
  d.line(x0, 194, 630, 194, { cls: 'ph-mute', w: 1 });
  d.text(x0, 222, `angle v to B: ${Math.round((theta * 180) / Math.PI)}\u00b0`, { cls: 'ph-label', anchor: 'start', size: 14 });
  d.text(x0, 254, `|F| = ${mag.toFixed(2)} |q|vB`, { cls: 'ph-F', anchor: 'start', size: 15 });
}

const RHR_CASES = [
  { q: 1, vAng: 0, bmode: 'in', say: 'A <b>positive</b> charge moves right through a field pointing <b>into the page</b> (\u2297). Right hand: fingers along <i>v</i>, curl them toward <i>B</i>, and your thumb points along <i>F</i>. Here F points <b>{F}</b>: perpendicular to both v and B, at full strength because v \u22a5 B.' },
  { q: 1, vAng: 90, bmode: 'in', say: 'Same charge, now moving <b>up</b>. The force turns with the velocity and now points <b>{F}</b>. It is always 90\u00b0 from v, which is why it can bend the path but never speed the charge up.' },
  { q: -1, vAng: 90, bmode: 'in', say: 'Swap in an <b>electron</b>. Use the same right hand, then <b>flip</b> the answer: F now points <b>{F}</b>. Forgetting this flip is the most common sign error in the chapter.' },
  { q: 1, vAng: 0, bmode: 'out', say: 'Positive charge moving right, field now <b>out of the page</b> (\u2299). Reversing B reverses F: it points <b>{F}</b>.' },
  { q: 1, vAng: 0, bmode: 'plane', say: 'Field in the plane, pointing right, and v also pointing right: v is <b>parallel</b> to B, sin 0\u00b0 = 0, so the force is <b>zero</b>. A charge moving along a field line feels nothing.' },
  { q: 1, vAng: 30, bmode: 'plane', say: 'Tilt v to 30\u00b0 from B. Only the part of v perpendicular to B counts: |F| = |q|vB sin 30\u00b0 = <b>half</b> the maximum. Both v and B lie in the page, so F sticks <b>{F}</b>.' },
  { q: 1, vAng: 90, bmode: 'plane', say: 'At 90\u00b0 the force is back to full size, still <b>{F}</b>. Whenever v and B both lie in the page, F has to point straight into or out of it.' },
];

function rhrFrames() {
  return RHR_CASES.map(({ say, ...p }) => {
    const F = lorentz(p.q, V3(p.vAng), B3(p.bmode));
    return { draw: rhrDraw, p, box: [640, 300], caption: say.replace('{F}', DIR_WORDS[dirName(F, 1e-6)]) };
  });
}

// ---------- figure 2: cyclotron / mass-spectrometer sandbox ----------
const FIELD_X = 200;
const ENTRY_Y = 200;
const PX = 30; // px of radius per (u x 1e5 m/s / T)
const rPx = (s) => (PX * s.m * s.v) / s.B;
const cycloPath = (s) =>
  trajectory({ start: [-12, ENTRY_Y], dir: [1, 0], r: rPx(s), turn: s.sign, inField: (x) => x >= FIELD_X, bounds: [-20, -40, 660, 440], ds: 2 });

function cycloDraw(d, p, t, f) {
  d.bGrid(FIELD_X, 0, 640, 400, 'in', { step: 40, opacity: 0.45 });
  d.line(FIELD_X, 0, FIELD_X, 400, { cls: 'ph-B', dash: '6 5', opacity: 0.7 });
  d.text(632, 386, 'B into the page', { cls: 'ph-B', anchor: 'end', size: 13, halo: true });
  d.text(FIELD_X - 10, 386, 'no field', { cls: 'ph-label', anchor: 'end', size: 13 });
  const { pts, inField } = f.path;
  d.poly(pts, { cls: 'ph-mute', dash: '3 5', w: 1.2 });
  const last = pts[pts.length - 1];
  if (last[0] < FIELD_X) {
    // completed a half circle: entry and exit are 2r apart (the mass-spectrometer measurement)
    const yExit = pts.findLast((q, i) => i > 0 && q[0] >= FIELD_X)?.[1] ?? ENTRY_Y;
    const xm = FIELD_X - 24;
    d.line(xm, ENTRY_Y, xm, yExit, { cls: 'ph-label', w: 1.2 });
    d.line(xm - 6, ENTRY_Y, xm + 6, ENTRY_Y, { cls: 'ph-label', w: 1.2 });
    d.line(xm - 6, yExit, xm + 6, yExit, { cls: 'ph-label', w: 1.2 });
    d.text(xm - 10, (ENTRY_Y + yExit) / 2, '2r', { cls: 'ph-label', anchor: 'end', serif: true, size: 17 });
  }
  const n = pts.length;
  const speed = 55 * p.v; // px per second: the dot really moves faster when v is bigger
  const k = Math.floor((Math.max(0, t) * speed) / 2) % (n + 40);
  if (k >= n - 1) return;
  const [x, y] = pts[k];
  const [x2, y2] = pts[k + 1];
  const len = Math.hypot(x2 - x, y2 - y) || 1;
  const ux = (x2 - x) / len;
  const uy = (y2 - y) / len;
  d.poly(pts.slice(Math.max(0, k - 45), k + 1), { cls: 'ph-v', w: 2.4, opacity: 0.35 });
  d.arrow(x + ux * 12, y + uy * 12, x + ux * (30 + 9 * p.v), y + uy * (30 + 9 * p.v), { cls: 'ph-v', w: 2.4 });
  if (inField[k]) {
    const F = lorentz(p.sign, [ux, uy, 0], [0, 0, 1]);
    d.arrow(x + F[0] * 12, y + F[1] * 12, x + F[0] * 46, y + F[1] * 46, { cls: 'ph-F', w: 2.4 });
  }
  d.charge(x, y, p.sign, { r: 10, size: 13 });
}

// ---------- figure 3: wire in a field, and the motor ----------
const WIRE_L = 0.2; // m of wire inside the field
function wireDraw(d, p, t) {
  d.bGrid(0, 0, 640, 300, 'in', { step: 40, opacity: 0.35 });
  d.text(632, 290, 'B into the page', { cls: 'ph-B', anchor: 'end', size: 13, halo: true });
  const x = 320;
  d.wire([[x, 296], [x, 4]], { w: 3 });
  if (Math.abs(p.I) > 1e-6) {
    flowDots(d, [[x, 296], [x, 4]], 45 * p.I * t);
    const up = p.I > 0;
    d.vec(x + 22, up ? 90 : 50, 0, up ? -40 : 40, { cls: 'ph-I', w: 2.4 });
    d.text(x + 38, 70, 'I', { cls: 'ph-I', serif: true, size: 20, anchor: 'start' });
  }
  const F = lorentz(p.I, [0, -1, 0], [0, 0, 1]); // I L x B direction (times |I|)
  const mag = Math.abs(wireForce(p.I, WIRE_L, p.B));
  if (mag > 1e-6) {
    const ux = Math.sign(F[0]);
    const L = 30 + 160 * mag;
    d.arrow(x + ux * 10, 170, x + ux * L, 170, { cls: 'ph-F', w: 3.2 });
    d.text(x + ux * (L + 10), 170, `F = ${num(mag, 2)} N`, { cls: 'ph-F', size: 15, halo: true, anchor: ux < 0 ? 'end' : 'start' });
  }
}

const ARM = 80;
function motorDraw(d, p, t, f) {
  const st = f.state;
  const dt = Math.max(0, Math.min(0.1, t - st.last));
  st.last = t;
  st.phi += Math.sign(p.I) * 0.9 * dt;
  const cx = 320;
  const cy = 180;
  d.rect(14, 40, 70, 260, { cls: 'ph-B', fill: true, rx: 6 });
  d.text(49, 170, 'N', { cls: 'ph-B', size: 22 });
  d.rect(556, 40, 70, 260, { cls: 'ph-mute', fill: true, rx: 6 });
  d.text(591, 170, 'S', { cls: 'ph-label', size: 22 });
  for (const y of [60, 120, 240, 300]) d.arrow(96, y, 544, y, { cls: 'ph-B', w: 1.4, opacity: 0.5 });
  d.text(540, 40, 'B', { cls: 'ph-B', serif: true, size: 20, anchor: 'end' });
  const c = Math.cos(st.phi);
  const s = Math.sin(st.phi);
  const ends = [[cx + ARM * c, cy - ARM * s], [cx - ARM * c, cy + ARM * s]];
  d.line(...ends[0], ...ends[1], { cls: 'ph-wire', w: 3.4 });
  d.dot(cx, cy, { r: 4, cls: 'ph-mute' });
  const Fl = 18 + 22 * Math.abs(p.I) * p.B;
  for (const [x, y] of ends) {
    // commutator: the side currently on the right always carries current out of the page (for I > 0)
    const out = (x >= cx) === p.I > 0;
    const F = lorentz(Math.abs(p.I) > 1e-9 ? 1 : 0, [0, 0, out ? -1 : 1], [1, 0, 0]);
    if (Math.abs(p.I) > 1e-9) d.arrow(x, y + Math.sign(F[1]) * 16, x, y + Math.sign(F[1]) * (16 + Fl), { cls: 'ph-F', w: 2.8 });
    perpMark(d, x, y, out ? 'out' : 'in', { r: 13 });
  }
  const torque = Math.abs(c) * Math.abs(p.I) * p.B; // N I A B |sin(normal, B)|: the normal is perpendicular to the loop
  d.text(626, 330, 'torque', { cls: 'ph-label', anchor: 'end', size: 13 });
  d.rect(446, 342, 180, 12, { cls: 'ph-mute', rx: 3 });
  if (torque > 1e-3) d.rect(446, 342, (180 * torque) / 3, 12, { cls: 'ph-F', fill: true, rx: 3 });
}

// ---------- quiz ----------
const PICK_BOX = [490, 250];
const PICK_V = [-1, 0, 0]; // electron moving left
function pickDraw(d) {
  const cx = 160;
  const cy = 125;
  d.bGrid(0, 0, 320, 250, 'in', { step: 40, opacity: 0.3 });
  d.text(6, 14, 'B into the page', { cls: 'ph-B', anchor: 'start', size: 12, halo: true });
  d.arrow(cx - 18, cy, cx - 104, cy, { cls: 'ph-v', w: 2.8 });
  d.text(cx - 118, cy, 'v', { cls: 'ph-v', serif: true, size: 20, halo: true });
  const cand = { up: [0, -1], down: [0, 1], right: [1, 0] };
  for (const [id, [ux, uy]] of Object.entries(cand)) {
    const g = d.group({ id, cls: 'ph-F' });
    g.arrow(cx + ux * 20, cy + uy * 20, cx + ux * 92, cy + uy * 92, { w: 2.6 });
    g.circle(cx + ux * 104, cy + uy * 104, 13, { fill: true, w: 1 });
  }
  for (const [id, y, word] of [['in', 85, 'into page'], ['out', 165, 'out of page']]) {
    const g = d.group({ id, cls: 'ph-F' });
    g.rect(342, y - 24, 140, 48, { fill: true, rx: 8, w: 1 });
    perpMark(g, 366, y, id, { cls: 'ph-inherit', r: 11, fill: false });
    g.text(386, y, word, { anchor: 'start', size: 13 });
  }
  d.charge(cx, cy, -1, { r: 16, size: 20 });
}
const pickAnswer = () => dirName(lorentz(-1, PICK_V, [0, 0, 1]));

const SPEC = { m: M_PROTON, v: 1e6, B: 0.5 };
const quiz = [
  {
    type: 'pick',
    id: 'magnetic-force.electron-dir',
    prompt: 'An <b>electron</b> moves to the left through a magnetic field that points into the page. Click the direction of the magnetic force on it.',
    View: PhysView,
    view: { height: 250, box: PICK_BOX },
    build: () => ({ frame: { draw: pickDraw, p: {}, box: PICK_BOX }, answer: [pickAnswer()] }),
    explain: () => {
      const pos = dirName(lorentz(1, PICK_V, [0, 0, 1]));
      return `Fingers left (along v), curl into the page (toward B): the thumb points <b>${pos}</b>. That is the force on a <i>positive</i> charge. The electron is negative, so flip it: <b>${pickAnswer()}</b>. Into/out of the page is impossible here: F is perpendicular to B, and B already points into the page.`;
    },
  },
  {
    type: 'input',
    id: 'magnetic-force.radius-double-v',
    prompt: 'A proton circles in a uniform magnetic field. Its speed is doubled (same field). By what factor does the radius of its circle change?',
    answers: [String(cyclotronRadius(SPEC.m, 2 * SPEC.v, E_CHARGE, SPEC.B) / cyclotronRadius(SPEC.m, SPEC.v, E_CHARGE, SPEC.B))],
    placeholder: 'factor',
    explain: () => {
      const r1 = cyclotronRadius(SPEC.m, SPEC.v, E_CHARGE, SPEC.B);
      const r2 = cyclotronRadius(SPEC.m, 2 * SPEC.v, E_CHARGE, SPEC.B);
      return `r = mv/(|q|B) is proportional to v, so the radius <b>doubles</b>. For example, at 1.0 \u00d7 10<sup>6</sup> m/s in 0.5 T a proton circles with r = ${num(r1 * 100, 2)} cm; at twice the speed, r = ${num(r2 * 100, 2)} cm.`;
    },
  },
  {
    type: 'mcq',
    id: 'magnetic-force.period-double-v',
    prompt: 'Same proton, same field, speed doubled. What happens to the time it takes to go around once?',
    choices: ['It doubles, because the circle is twice as big', 'It halves, because the proton is twice as fast', 'It stays the same', 'It quadruples'],
    answer: 2,
    explain: () => {
      const T = cyclotronPeriod(SPEC.m, E_CHARGE, SPEC.B);
      return `Twice the circumference at twice the speed: the two effects cancel. T = 2\u03c0m/(|q|B) has no v in it; for a proton in 0.5 T it is ${num(T * 1e9, 3)} ns at <i>any</i> (non-relativistic) speed. That is the principle of the cyclotron.`;
    },
  },
  {
    type: 'mcq',
    id: 'magnetic-force.no-work',
    prompt: 'A proton circles in a uniform magnetic field. What does the field do to its kinetic energy over time?',
    choices: ['Increases it, since there is a nonzero force', 'Nothing: the force is always perpendicular to v, so it does no work', 'Decreases it, as the field slowly drains energy', 'Increases it only while the proton is turning'],
    answer: 1,
    explain: 'Work is F\u00b7d (Physics I). F = qv \u00d7 B is perpendicular to v at every instant, so F\u00b7v = 0: zero power, zero work. Speed and kinetic energy stay constant; only the <b>direction</b> of motion changes. (Electric fields are what speed charges up.)',
  },
];

export default {
  id: 'magnetic-force',
  title: 'Magnetic force',
  group: 'Magnetism',
  blurb: 'A magnetic field pushes sideways on moving charges and currents: circles, helices, and motors.',
  quiz,
  render(root) {
    root.append(
      p('Electric fields push on charges whether they move or not. A <b>magnetic field</b> ' + eq('<span class="vec">B</span>') + ' is pickier: it only pushes on charges that are <b>moving</b>, and it pushes <b>sideways</b>, perpendicular to the motion. Its unit is the <b>tesla</b> (T). A fridge magnet is about 0.01 T near its surface, Earth\u2019s field is about 5 \u00d7 10<sup>\u22125</sup> T, and an MRI magnet is 1.5 to 3 T.'),
      p('Most of the pictures in this unit are flat, but magnetic forces are fully 3D, so you need a way to draw arrows that point into or out of the page. The convention: ' + '<b>\u2297</b> (an arrow\u2019s tail feathers, seen as it flies away) means <b>into</b> the page, <b>\u2299</b> (the arrow\u2019s tip coming at you) means <b>out</b> of the page.'),
      p('The force on a charge q moving with velocity ' + eq('<span class="vec">v</span>') + ' is a <b>cross product</b>. You met cross products for torque in Physics I: the result is perpendicular to both inputs, and its size depends on the sine of the angle between them.'),
      equation({
        name: 'Magnetic force on a moving charge',
        eq: '<span class="vec">F</span> = q <span class="vec">v</span> \u00d7 <span class="vec">B</span>, &nbsp; |F| = |q| v B sin\u03b8',
        says: 'The force is perpendicular to <b>both</b> v and B. It is biggest when v \u22a5 B, zero when the charge moves along B, and it reverses if q, v, or B reverses. Doubling the speed doubles the force.',
        terms: [
          ['F', 'magnetic force on the charge', 'N'],
          ['q', 'charge, with its sign (an electron\u2019s force is opposite a proton\u2019s)', 'C'],
          ['v', 'velocity of the charge', 'm/s'],
          ['B', 'magnetic field at the charge', 'T = N/(A\u00b7m)'],
          ['\u03b8', 'angle between v and B', ''],
        ],
      }),
    );

    const rhrHost = h('div');
    root.append(figure({ title: 'The right-hand rule, case by case', note: 'Olive: velocity. Purple: magnetic field. Black: force. Step through the cases; the right panel keeps score.' }, rhrHost));
    new Player(rhrHost, { frames: rhrFrames(), View: PhysView, view: { height: 320 } });

    root.append(
      callout('key', 'Sideways force, no work', 'Because F is always perpendicular to v, a magnetic field <b>never does work</b> on a charge. It cannot speed a charge up or slow it down; it can only <b>turn</b> it. Constant speed plus a constant-size sideways force is exactly uniform circular motion from Physics I.'),
      p('Set the magnetic force equal to the centripetal force, ' + eq('|q|vB = mv<sup>2</sup>/r') + ', and you get the radius. A heavier or faster particle swings wider; a stronger field or bigger charge curls it tighter.'),
      equation({
        name: 'Circular motion in a uniform field',
        eq: 'r = <span class="frac"><span>mv</span><span>|q|B</span></span>, &nbsp; T = <span class="frac"><span>2\u03c0m</span><span>|q|B</span></span>',
        says: 'The radius grows with momentum mv and shrinks with field. The time for one lap does <b>not</b> depend on the speed: a faster particle runs a bigger circle in the same time.',
        terms: [
          ['r', 'radius of the circle', 'm'],
          ['m', 'mass of the particle', 'kg'],
          ['T', 'period: time for one full circle (frequency f = 1/T is the cyclotron frequency)', 's'],
        ],
      }),
    );

    // Cyclotron sandbox
    const stage = h('div', { class: 'stage' });
    const s = { sign: 1, m: 1, v: 2, B: 1 };
    const ro = readouts([['r', 'radius r'], ['T', 'period T'], ['half', 'time in the field (\u00bd T)']]);
    const view = new PhysView(stage, { height: 400, box: [640, 400] });
    const redraw = () => {
      view.show({ draw: cycloDraw, p: { ...s }, box: [640, 400], live: true, path: cycloPath(s) }, { animate: false });
      const r = cyclotronRadius(s.m * AMU, s.v * 1e5, E_CHARGE, s.B);
      const T = cyclotronPeriod(s.m * AMU, E_CHARGE, s.B);
      ro.set({ r: `${num(r * 1000, 3)} mm`, T: `${num(T * 1e9, 3)} ns`, half: `${num((T / 2) * 1e9, 3)} ns` });
    };
    root.append(
      figure(
        {
          title: 'Sandbox: a charge enters a magnetic field',
          tools: [segmented([{ value: 1, label: 'Positive ion' }, { value: -1, label: 'Negative ion' }], 1, (v) => ((s.sign = v), redraw()), { label: 'Charge sign' })],
          note: 'A singly charged ion (charge \u00b1e) enters the field region from the left. Inside, the black force arrow always points at the center of the circle. Try doubling v: the circle doubles, but the ion still takes the same time to come back out. This is how a <b>mass spectrometer</b> sorts ions: heavier ions land farther away (2r grows with m).',
        },
        stage,
        controlsRow(
          slider({ label: 'speed v', min: 1, max: 4, step: 0.25, value: s.v, fmt: (v) => `${v.toFixed(2)} \u00d7 10<sup>5</sup> m/s`, onInput: (v) => ((s.v = v), redraw()) }),
          slider({ label: 'field B', min: 0.5, max: 2, step: 0.1, value: s.B, fmt: (v) => `${v.toFixed(1)} T`, onInput: (v) => ((s.B = v), redraw()) }),
          slider({ label: 'mass m', min: 1, max: 4, step: 1, value: s.m, fmt: (v) => `${v} u`, onInput: (v) => ((s.m = v), redraw()) }),
        ),
        ro,
      ),
    );
    redraw();

    root.append(
      p('If v has a component <b>along</b> B as well, that part feels no force and just carries on, while the perpendicular part goes around in a circle. The result is a <b>helix</b> wrapped around the field lines. That is how Earth\u2019s field steers charged particles from the Sun toward the poles, where they make the aurora.'),
      p('A current is just many moving charges, so a wire carrying current through a field feels the sum of all their sideways pushes:'),
      equation({
        name: 'Force on a current-carrying wire',
        eq: '<span class="vec">F</span> = I <span class="vec">L</span> \u00d7 <span class="vec">B</span>, &nbsp; |F| = I L B sin\u03b8',
        says: 'Same rule as for one charge, with qv replaced by IL. The force is perpendicular to the wire and to B, and zero for a wire lying along B.',
        terms: [
          ['I', 'current in the wire', 'A'],
          ['L', 'length of wire in the field, pointing along the current', 'm'],
          ['\u03b8', 'angle between the wire and B', ''],
        ],
      }),
      p('Put a rectangular loop in a field and the forces on its two long sides point opposite ways. They do not move the loop anywhere, but they <b>twist</b> it: the torque is ' + eq('\u03c4 = NIAB sin\u03b8') + ', where A is the loop\u2019s area, N its number of turns, and \u03b8 the angle between B and the loop\u2019s normal (the axis perpendicular to its face). That twist is an <b>electric motor</b>.'),
    );

    // Wire / motor figure
    const wStage = h('div', { class: 'stage' });
    const ws = { mode: 'wire', I: 2, B: 0.6 };
    const wSay = h('div', { class: 'caption', 'aria-live': 'polite' });
    const wView = new PhysView(wStage, { height: 360, box: [640, 360] });
    const motorState = { phi: 0.35, last: 0 };
    const wRedraw = () => {
      if (ws.mode === 'wire') {
        wView.show({ draw: wireDraw, p: { I: ws.I, B: ws.B }, box: [640, 300], live: true }, { animate: false });
        const F = wireForce(ws.I, WIRE_L, ws.B);
        wSay.innerHTML = Math.abs(ws.I) < 1e-9
          ? 'No current, no force: a wire with no moving charges ignores the field.'
          : `${WIRE_L * 100} cm of wire with I = ${num(Math.abs(ws.I), 2)} A ${ws.I > 0 ? 'up' : 'down'} in B = ${num(ws.B, 2)} T: <b>F = ILB = ${num(Math.abs(F), 2)} N, pointing ${DIR_WORDS[dirName(lorentz(ws.I, [0, -1, 0], [0, 0, 1]))]}</b>. Fingers along I, curl into the page. Reverse the current and the push reverses.`;
      } else {
        wView.show({ draw: motorDraw, p: { I: ws.I, B: ws.B }, box: [640, 360], live: true, state: motorState }, { animate: false });
        wSay.innerHTML = Math.abs(ws.I) < 1e-9
          ? 'No current: no forces, no torque, the loop sits still.'
          : `The loop seen end-on: its two long sides pierce the page (\u2299 current out, \u2297 current in). Forces on them are <b>equal and opposite</b>, so they cancel as a net force but make a <b>torque</b>. The torque is largest when the loop lies along B and zero when it faces B. A <b>commutator</b> flips the current every half turn, so the side on the right is always pushed ${ws.I > 0 ? 'up' : 'down'} and the motor keeps turning ${ws.I > 0 ? 'counterclockwise' : 'clockwise'}.`;
      }
    };
    root.append(
      figure(
        {
          title: 'Force on a current: wire and motor',
          tools: [segmented([{ value: 'wire', label: 'Straight wire' }, { value: 'motor', label: 'Motor loop' }], 'wire', (v) => ((ws.mode = v), wRedraw()), { label: 'Show' })],
        },
        wStage,
        controlsRow(
          slider({ label: 'current I', min: -3, max: 3, step: 0.5, value: ws.I, fmt: (v) => `${num(v, 2)} A`, onInput: (v) => ((ws.I = v), wRedraw()) }),
          slider({ label: 'field B', min: 0.2, max: 1, step: 0.1, value: ws.B, fmt: (v) => `${v.toFixed(1)} T`, onInput: (v) => ((ws.B = v), wRedraw()) }),
        ),
        wSay,
      ),
    );
    wRedraw();

    root.append(
      callout('warn', 'Classic mistakes', 'Three in one: (1) using the right-hand rule for an <b>electron</b> and forgetting to flip the answer; (2) drawing the force <b>along</b> B, the way you would for an electric field (magnetic forces are always perpendicular to B); (3) thinking a magnetic field can change a particle\u2019s <b>speed</b>. It only ever changes the direction.'),
      checkpoint(quiz),
    );
  },
};
