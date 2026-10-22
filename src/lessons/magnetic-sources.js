import { h, p } from '../ui/dom.js';
import { Player } from '../ui/player.js';
import { PhysView } from '../core/phys-view.js';
import { figure, callout, segmented, toggle } from '../ui/figure.js';
import { checkpoint } from '../ui/quiz.js';
import { equation, eq } from '../ui/controls.js';
import { wireField, isolines } from '../model/fields.js';
import { wireB, solenoidB, parallelForcePerLength, wireFlux, loopField, closedLine, cross, lorentz } from '../model/magnetism.js';
import { perpMark, needle, clipToBox, flowDots, dirName, num } from './magnet-kit.js';

// ---------- figure 1: wires through the page (sandbox) ----------
const SBOX = [640, 380];
const PRESETS = {
  1: () => [{ x: 320, y: 190, I: 1 }],
  2: () => [{ x: 230, y: 190, I: 1 }, { x: 410, y: 190, I: -1 }],
  3: () => [{ x: 220, y: 230, I: 1 }, { x: 420, y: 230, I: 1 }, { x: 320, y: 100, I: -1 }],
};
const DPSI = 0.3; // contour spacing: equal steps of the flux function, so line density follows |B|

function wireLines(wires, [w, hgt]) {
  const psi = wireFlux(wires);
  let lo = Infinity;
  let hi = -Infinity;
  for (let x = 8; x < w; x += 16) {
    for (let y = 8; y < hgt; y += 16) {
      if (wires.some((c) => Math.hypot(x - c.x, y - c.y) < 18)) continue;
      const v = psi(x, y);
      lo = Math.min(lo, v);
      hi = Math.max(hi, v);
    }
  }
  const levels = [];
  for (let k = Math.ceil(lo / DPSI); k * DPSI <= hi; k++) levels.push(k * DPSI + DPSI / 2);
  return isolines(psi, levels, { x0: 0, y0: 0, x1: w, y1: hgt, step: 7, maxJump: 0.9 });
}

function wiresDraw(d, p) {
  const { wires, compass } = p;
  const g = d.group({ cls: 'ph-B', opacity: 0.75 });
  for (const { segs } of wireLines(wires, SBOX)) for (const [a, b, c, e] of segs) g.line(a, b, c, e, { w: 1.3 });
  if (compass) {
    const B = wireField(wires);
    for (let x = 32; x < SBOX[0]; x += 64) {
      for (let y = 30; y < SBOX[1]; y += 64) {
        if (wires.some((c) => Math.hypot(x - c.x, y - c.y) < 30)) continue;
        const [bx, by] = B(x, y);
        const m = Math.hypot(bx, by);
        if (m > 1e-9) {
          d.circle(x, y, 14, { cls: 'ph-mute', w: 1, fill: true, style: '--fo: 0.9; fill: var(--surface)' });
          needle(d, x, y, bx / m, by / m, 24);
        }
      }
    }
  }
  wires.forEach((c, i) => perpMark(d, c.x, c.y, c.I > 0 ? 'out' : 'in', { id: `w${i}`, r: 15, w: 2.2, drag: true }));
}

// ---------- figure 2: one loop to a solenoid ----------
const LBOX = [640, 340];
const AXIS_Y = 170;
const LOOP_R = 56;
const STACKS = [
  { n: 1, pitch: 0 },
  { n: 2, pitch: 70 },
  { n: 4, pitch: 36 },
  { n: 8, pitch: 22 },
  { n: 14, pitch: 18 },
];
const loopsOf = ({ n, pitch }) => Array.from({ length: n }, (_, k) => ({ x: 320 + (k - (n - 1) / 2) * pitch, y: AXIS_Y, R: LOOP_R, I: 1 }));
let stackCache = null;
function stackLines() {
  if (stackCache) return stackCache;
  stackCache = STACKS.map((st) => {
    const loops = loopsOf(st);
    const B = loopField(loops, { segs: 40 });
    const lines = [];
    for (const f of [-0.86, -0.62, -0.38, -0.13, 0.13, 0.38, 0.62, 0.86]) {
      const seedX = st.n % 2 ? 320 + st.pitch / 2 : 320;
      const { pts } = closedLine(B, [seedX, AXIS_Y + f * LOOP_R], { ds: 3, maxSteps: 1400, bounds: [-60, -60, LBOX[0] + 60, LBOX[1] + 60] });
      lines.push(...clipToBox(pts, [0, 0, ...LBOX]));
    }
    return lines;
  });
  return stackCache;
}

function stackDraw(d, p, t, f) {
  const loops = loopsOf(STACKS[f.k]);
  const lines = stackLines()[f.k];
  // the loops themselves, in perspective: a thin ellipse, current out of the page at the top, into it at the bottom
  for (const L of loops) d.path(`M${L.x} ${L.y - L.R}a10 ${L.R} 0 0 0 0 ${2 * L.R}`, { cls: 'ph-wire', w: 1.2, opacity: 0.35 });
  d.fieldLines(lines, { cls: 'ph-B', w: 1.4, arrows: [0.25, 0.75] });
  for (const L of loops) {
    perpMark(d, L.x, L.y - L.R, 'out', { r: 7, w: 1.4 });
    perpMark(d, L.x, L.y + L.R, 'in', { r: 7, w: 1.4 });
  }
  if (p.poles) {
    const xs = loops.map((L) => L.x);
    d.text(Math.max(...xs) + 34, AXIS_Y - LOOP_R - 22, 'N', { cls: 'ph-B', size: 22, halo: true });
    d.text(Math.min(...xs) - 34, AXIS_Y - LOOP_R - 22, 'S', { cls: 'ph-label', size: 22, halo: true });
  }
}

const STACK_SAY = [
  'One loop of wire, seen edge-on: current comes <b>out</b> of the page at the top (\u2299) and goes <b>in</b> at the bottom (\u2297). Near each crossing the field circles the wire; through the middle of the loop all those circles point the same way, <b>to the right</b>. Far away the pattern is a <b>dipole</b>, the same shape as a bar magnet\u2019s.',
  'Two loops with the same current: their fields add up inside, where they point the same way, and partly cancel in the gap between the crossings on the outside.',
  'Four loops: the field inside is getting straighter and more even. Lines now enter on the left end and leave on the right end, like a stubby magnet.',
  'Eight closely spaced loops: a <b>solenoid</b>. Inside, the lines are nearly parallel and evenly spaced: a <b>uniform</b> field. Outside, the same lines spread over a huge area, so the field there is weak.',
  'A long, tightly wound solenoid behaves like a <b>bar magnet</b>: lines come out of one end (call it N) and go back in at the other (S). Unlike a magnet\u2019s, you can switch it off, reverse it, and set its strength with the current: an <b>electromagnet</b>. Every line is a closed loop.',
];
function stackFrames() {
  return STACKS.map((st, k) => ({ draw: stackDraw, k, p: { poles: k === STACKS.length - 1 }, box: LBOX, caption: STACK_SAY[k] }));
}

// ---------- figure 3: parallel wires ----------
const PBOX = [640, 300];
const PX1 = 220;
const PX2 = 420;
function parallelDraw(d, p, t) {
  const s2 = p.dir2;
  // currents: wire 1 always up (screen -y); wire 2 up (s2 = +1) or down (s2 = -1)
  for (const [x, s] of [[PX1, 1], [PX2, s2]]) {
    d.wire([[x, 296], [x, 4]], { w: 3 });
    flowDots(d, [[x, 296], [x, 4]], 40 * s * t);
    d.vec(x - 24, s > 0 ? 66 : 26, 0, s > 0 ? -40 : 40, { cls: 'ph-I', w: 2.4 });
  }
  d.text(PX1 - 34, 46, 'I<sub>1</sub>', { cls: 'ph-I', serif: true, size: 18, anchor: 'end' });
  d.text(PX2 - 34, 46, 'I<sub>2</sub>', { cls: 'ph-I', serif: true, size: 18, anchor: 'end' });
  // field of each wire at the other one (direction from dl x r_hat)
  const B1at2 = cross([0, -1, 0], [1, 0, 0]); // wire 1 -> wire 2: r_hat = +x
  const B2at1 = cross([0, -s2, 0], [-1, 0, 0]); // wire 2 -> wire 1: r_hat = -x
  for (const y of [110, 190, 250]) {
    perpMark(d, PX2 + 30, y, B1at2[2] > 0 ? 'in' : 'out', { cls: 'ph-B', r: 8, w: 1.4, fill: false });
    perpMark(d, PX1 + 30, y, B2at1[2] > 0 ? 'in' : 'out', { cls: 'ph-B', r: 8, w: 1.4, fill: false });
  }
  d.text(PX2 + 46, 110, 'B<sub>1</sub>', { cls: 'ph-B', serif: true, size: 17, anchor: 'start' });
  d.text(PX1 + 46, 110, 'B<sub>2</sub>', { cls: 'ph-B', serif: true, size: 17, anchor: 'start' });
  // forces: F = I L x B
  const F2 = lorentz(1, [0, -s2, 0], B1at2);
  const F1 = lorentz(1, [0, -1, 0], B2at1);
  for (const [x, F, label] of [[PX1, F1, 'F<sub>1</sub>'], [PX2, F2, 'F<sub>2</sub>']]) {
    if (Math.abs(F[0]) < 0.05) continue;
    const ux = Math.sign(F[0]);
    d.arrow(x + ux * 8, 160, x + ux * 78 * Math.abs(F[0]), 160, { cls: 'ph-F', w: 3 });
    d.text(x + ux * 44 * Math.abs(F[0]), 140, label, { cls: 'ph-F', serif: true, size: 18, halo: true });
  }
}

// ---------- quiz ----------
const QBOX = [420, 220];
const QWIRE = { x: 120, y: 110, I: 1 };
const QP = [270, 110];
function qDraw(d) {
  perpMark(d, QWIRE.x, QWIRE.y, 'out', { r: 16, w: 2.2 });
  d.text(QWIRE.x, QWIRE.y + 34, 'I out of page', { cls: 'ph-I', size: 13 });
  d.dot(QP[0], QP[1], { r: 5, cls: 'ph-F' });
  d.text(QP[0] - 14, QP[1] + 18, 'P', { cls: 'ph-F', serif: true, size: 18 });
  const cand = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  for (const [id, [ux, uy]] of Object.entries(cand)) {
    const g = d.group({ id, cls: 'ph-B' });
    g.arrow(QP[0] + ux * 12, QP[1] + uy * 12, QP[0] + ux * 72, QP[1] + uy * 72, { w: 2.4 });
    g.circle(QP[0] + ux * 84, QP[1] + uy * 84, 12, { fill: true, w: 1 });
  }
}
const qAnswer = () => {
  const [bx, by] = wireField([QWIRE])(...QP);
  return dirName([bx, by, 0]);
};

const solenoidRatio = solenoidB(500 / 0.4, 2) / solenoidB(500 / 0.2, 2);

const quiz = [
  {
    type: 'input',
    id: 'magnetic-sources.twice-distance',
    prompt: 'At 3 cm from a long straight wire the field is B. What is the field at 6 cm from the same wire, as a multiple of B?',
    accept: (s) => {
      const v = s.includes('/') ? s.split('/').reduce((a, b) => Number(a) / Number(b)) : parseFloat(s);
      return Math.abs(v - wireB(5, 0.06) / wireB(5, 0.03)) < 0.01;
    },
    placeholder: 'e.g. 0.25',
    explain: `B = \u03bc<sub>0</sub>I/(2\u03c0r) falls off as <b>1/r</b>, not 1/r<sup>2</sup>. Twice the distance gives <b>${num(wireB(5, 0.06) / wireB(5, 0.03))} B</b>. (For 5 A: ${num(wireB(5, 0.03) * 1e6, 3)} \u03bcT at 3 cm, ${num(wireB(5, 0.06) * 1e6, 3)} \u03bcT at 6 cm.)`,
  },
  {
    type: 'pick',
    id: 'magnetic-sources.wire-dir',
    prompt: 'A long wire carries current <b>out of the page</b>. Click the direction of its magnetic field at point P.',
    View: PhysView,
    view: { height: 230, box: QBOX },
    build: () => ({ frame: { draw: qDraw, p: {}, box: QBOX }, answer: [qAnswer()] }),
    explain: () => `Grip the wire with your right thumb pointing out of the page (toward you): your fingers curl <b>counterclockwise</b>. On the right side of the wire, counterclockwise is <b>${qAnswer()}</b>. The field circles the wire; it never points toward or away from it (that would be an electric field of a line of charge).`,
  },
  {
    type: 'mcq',
    id: 'magnetic-sources.parallel',
    prompt: 'Two long parallel wires carry currents in the <b>same</b> direction. What do they do?',
    choices: ['Attract each other', 'Repel each other, like charges do', 'Nothing: the field of each wire is parallel to the other wire', 'Twist until the currents are opposite'],
    answer: 0,
    explain: `Wire 1\u2019s field at wire 2 is perpendicular to wire 2, so wire 2 feels F = I L \u00d7 B. Working it out with the right-hand rule gives a pull toward wire 1, and the same for wire 1. <b>Parallel currents attract</b>, antiparallel currents repel: the opposite of the rule for charges. Two wires 1 m apart carrying 1 A each pull with ${num(parallelForcePerLength(1, 1, 1) / 1e-7, 2)} \u00d7 10<sup>\u22127</sup> N per meter.`,
  },
  {
    type: 'mcq',
    id: 'magnetic-sources.stretch',
    prompt: 'A solenoid with 500 turns, 20 cm long, carries 2 A. You stretch it to 40 cm (same 500 turns, same current). The field inside...',
    choices: ['doubles, because it is longer', 'stays the same, since N and I did not change', 'halves', 'drops to a quarter'],
    answer: [2, 1, 0.5, 0.25].findIndex((r) => Math.abs(r - solenoidRatio) < 1e-9),
    explain: `B = \u03bc<sub>0</sub>nI depends on the turns <b>per meter</b>, n. Stretching takes n from 500/0.2 = 2500 to 500/0.4 = 1250 per meter, so B goes from ${num(solenoidB(2500, 2) * 1000, 3)} mT to ${num(solenoidB(1250, 2) * 1000, 3)} mT: <b>halved</b>. The solenoid\u2019s radius does not appear at all.`,
  },
];

export default {
  id: 'magnetic-sources',
  title: 'Where magnetic fields come from',
  group: 'Magnetism',
  blurb: 'Currents make magnetic fields: circles around a wire, a dipole from a loop, a uniform field inside a solenoid.',
  quiz,
  render(root) {
    root.append(
      p('The last chapter took B as given. Here is where it comes from: <b>moving charges</b>. Every current makes a magnetic field, and almost every magnetic field you will meet in this course is made by currents (in a permanent magnet, the "currents" are electrons spinning and orbiting inside the atoms, all lined up). The one exception, a changing electric field, comes up in the electromagnetic waves chapter.'),
      p('So moving charges both <b>make</b> magnetic fields and <b>feel</b> them, the same way static charges make and feel electric fields. The simplest source is a long straight wire. Its field lines are <b>circles</b> around the wire. To get the direction, grip the wire with your right hand, thumb along the current: your fingers curl the way B goes. That is the <b>right-hand grip rule</b>.'),
      equation({
        name: 'Field of a long straight wire',
        eq: 'B = <span class="frac"><span>\u03bc<sub>0</sub> I</span><span>2\u03c0 r</span></span>',
        says: 'The field is proportional to the current and falls off as <b>1/r</b>: twice as far, half the field. (A point charge\u2019s E falls as 1/r<sup>2</sup>; a wire is spread out, so its field falls more slowly.)',
        terms: [
          ['B', 'field strength at distance r; direction: circles the wire by the grip rule', 'T'],
          ['I', 'current in the wire', 'A'],
          ['r', 'perpendicular distance from the wire', 'm'],
          ['\u03bc<sub>0</sub>', '= 4\u03c0 \u00d7 10<sup>\u22127</sup>, the magnetic constant (the counterpart of \u03b5<sub>0</sub>)', 'T\u00b7m/A'],
        ],
      }),
      p('For a sense of scale, 10 A at 2 cm makes ' + eq(`B = ${num(wireB(10, 0.02) * 1e6, 2)} \u03bcT`) + ', about twice Earth\u2019s field: enough to swing a compass held right next to a single wire. (A power cord barely affects a compass because its two conductors carry equal and opposite currents, and AC reverses 120 times a second.) It is also why real electromagnets use many turns of wire.'),
    );

    // Sandbox
    const stage = h('div', { class: 'stage' });
    let count = 2;
    let wires = PRESETS[count]();
    let compass = true;
    let dragStart = null;
    const say = h('div', { class: 'caption', 'aria-live': 'polite' });
    const view = new PhysView(stage, {
      height: 400,
      box: SBOX,
      onDrag: (id, x, y, phase) => {
        const i = Number(id.slice(1));
        if (phase === 'start') dragStart = [x, y, wires[i].x, wires[i].y];
        else if (phase === 'move') {
          const nx = Math.max(20, Math.min(SBOX[0] - 20, dragStart[2] + x - dragStart[0]));
          const ny = Math.max(20, Math.min(SBOX[1] - 20, dragStart[3] + y - dragStart[1]));
          wires = wires.map((c, k) => (k === i ? { ...c, x: nx, y: ny } : c));
        } else if (Math.hypot(x - dragStart[0], y - dragStart[1]) < 4) {
          wires = wires.map((c, k) => (k === i ? { ...c, I: -c.I } : c));
        }
        redraw();
      },
    });
    const redraw = () => {
      view.show({ draw: wiresDraw, p: { wires, compass }, box: SBOX }, { animate: false });
      const net = wires.reduce((s, c) => s + c.I, 0);
      const outN = wires.filter((c) => c.I > 0).length;
      const parts = [`${wires.length === 1 ? 'One wire' : `${wires.length} wires`}: ${outN} out of the page, ${wires.length - outN} into it.`];
      if (wires.length === 1) parts.push('Circles, crowded near the wire and spreading out: the spacing grows in proportion to r, because B \u221d 1/r. Out of the page means counterclockwise.');
      else parts.push(`Near each wire the field circles that wire; in between, the fields add as vectors. Far away, the lines circle the whole group as if it were one wire carrying the <b>net</b> current, here <b>${net === 0 ? 'zero' : `${Math.abs(net)} I ${net > 0 ? 'out' : 'in'}`}</b>${net === 0 ? ', so the field dies off quickly' : ''}. That is Amp\u00e8re\u2019s law at work.`);
      say.innerHTML = parts.join(' ');
    };
    root.append(
      figure(
        {
          title: 'Sandbox: wires through the page',
          tools: [
            segmented([1, 2, 3].map((n) => ({ value: n, label: `${n} wire${n > 1 ? 's' : ''}` })), count, (v) => ((count = v), (wires = PRESETS[v]()), redraw()), { label: 'Number of wires' }),
            toggle('Compasses', compass, (v) => ((compass = v), redraw())),
          ],
          note: '<b>Drag</b> a wire to move it; <b>click</b> one to reverse its current (\u2299 out of the page, \u2297 into it). Purple lines are field lines, drawn so that they crowd where the field is strong. Compass needles point along B (purple end = north).',
        },
        stage,
        say,
      ),
    );
    redraw();

    root.append(
      callout('key', 'Currents make B, and B lines never end', 'Electric field lines start on + charges and end on \u2212 charges. Magnetic field lines have <b>no ends</b>: they always close on themselves, because there are no magnetic "charges" (no <b>monopoles</b>). Cut a bar magnet in half and you get two smaller magnets, each with an N and an S.'),
      p('For any other shape of wire, the rule is the <b>Biot\u2013Savart law</b>: chop the wire into tiny pieces, each piece of current makes a little field (strongest broadside, falling as 1/r<sup>2</sup>), and you add up the contributions from every piece. That "add up the pieces" integral is the magnetic version of superposition. For a circular loop it gives ' + eq('B = \u03bc<sub>0</sub>I/(2R)') + ' at the center. In the figure below the field lines are computed exactly that way, piece by piece.'),
    );

    const stackHost = h('div');
    root.append(figure({ title: 'From one loop to a solenoid', note: 'Loops seen edge-on: each loop crosses the page twice. Field lines computed with Biot\u2013Savart, adding up the field of every small piece of every loop.' }, stackHost));
    new Player(stackHost, { frames: stackFrames(), View: PhysView, view: { height: 360 } });

    root.append(
      equation({
        name: 'Field inside a long solenoid',
        eq: 'B = \u03bc<sub>0</sub> n I',
        says: 'Inside, the field is <b>uniform</b>: the same everywhere, independent of the solenoid\u2019s radius and of where you are across it. It depends only on turns per meter and current. Outside, it is nearly zero.',
        terms: [
          ['n', 'turns per meter of length (N / \u2113), not the total number of turns', '1/m'],
          ['I', 'current in the wire', 'A'],
        ],
      }),
      p('For the wire and the solenoid there is a shortcut. <b>Amp\u00e8re\u2019s law</b> plays the role for B that Gauss\u2019s law played for E: draw any closed loop (an "Amp\u00e8rian loop"), walk around it adding up the component of B along your path, and the total equals \u03bc<sub>0</sub> times the current poking through the loop.'),
      equation({
        name: 'Amp\u00e8re\u2019s law',
        eq: '\u222e <span class="vec">B</span> \u00b7 d<span class="vec">\u2113</span> = \u03bc<sub>0</sub> I<sub>enc</sub>',
        says: 'The <b>circulation</b> of B around any closed path equals \u03bc<sub>0</sub> times the net current through it. Currents outside the path do not count. With a symmetric path (a circle around a wire, a rectangle through a solenoid) it hands you B directly.',
        terms: [
          ['\u222e B\u00b7d\u2113', 'walk around the closed path, adding up B along each small step d\u2113', 'T\u00b7m'],
          ['I<sub>enc</sub>', 'net current passing through the path (directions count: in and out cancel)', 'A'],
        ],
      }),
      p('Since currents make fields and currents feel fields, two wires push on each other. Wire 1\u2019s field at wire 2 is ' + eq('\u03bc<sub>0</sub>I<sub>1</sub>/(2\u03c0d)') + ', and wire 2 feels ' + eq('F = I<sub>2</sub>LB') + ' from it, so the force per meter is ' + eq('F/L = \u03bc<sub>0</sub>I<sub>1</sub>I<sub>2</sub>/(2\u03c0d)') + '.'),
    );

    // Parallel wires
    const pStage = h('div', { class: 'stage' });
    const pSay = h('div', { class: 'caption', 'aria-live': 'polite' });
    const pView = new PhysView(pStage, { height: 320, box: PBOX });
    const pShow = (dir2, animate) => {
      pView.show({ draw: parallelDraw, p: { dir2 }, box: PBOX, live: true }, { animate });
      const F = parallelForcePerLength(10, 10, 0.01);
      pSay.innerHTML = dir2 > 0
        ? `Currents in the <b>same</b> direction. Wire 1\u2019s field at wire 2 points into the page (B<sub>1</sub>, \u2297); I<sub>2</sub>L \u00d7 B<sub>1</sub> points left, toward wire 1. By the same rule wire 1 is pulled right. <b>Parallel currents attract.</b> With 10 A each, 1 cm apart: ${num(F * 1000, 2)} mN per meter of wire.`
        : `Currents in <b>opposite</b> directions. B<sub>1</sub> at wire 2 is unchanged, but I<sub>2</sub> is reversed, so its force reverses: <b>antiparallel currents repel</b>, with the same ${num(F * 1000, 2)} mN/m for 10 A at 1 cm. Note: this is the reverse of the rule for charges.`;
    };
    root.append(
      figure(
        {
          title: 'Two parallel wires',
          tools: [segmented([{ value: 1, label: 'Same direction' }, { value: -1, label: 'Opposite' }], 1, (v) => pShow(v, true), { label: 'Current in wire 2' })],
        },
        pStage,
        pSay,
      ),
    );
    pShow(1, false);

    root.append(
      callout('warn', 'Classic mistakes', '(1) Treating the wire\u2019s field like a point charge\u2019s and using <b>1/r<sup>2</sup></b>; for a long wire it is 1/r. (2) Drawing B pointing <b>toward or away from</b> the wire; it circles it. (3) Using the total turns N in \u03bc<sub>0</sub>nI instead of turns per meter. (4) Expecting parallel currents to repel "like charges"; they attract.'),
      checkpoint(quiz),
    );
  },
};
