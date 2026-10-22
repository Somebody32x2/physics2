import { h, p } from '../ui/dom.js';
import { Player } from '../ui/player.js';
import { PhysView } from '../core/phys-view.js';
import { figure, callout, segmented } from '../ui/figure.js';
import { checkpoint } from '../ui/quiz.js';
import { equation, eq, slider, controlsRow, readouts } from '../ui/controls.js';
import { lorentz, slidingBar, generator, transformer, inducedSense, dipoleFlux, dipoleFluxSlope, magnetCycle } from '../model/magnetism.js';
import { perpMark, flowDots, arcArrow, num } from './magnet-kit.js';

// ---------- figure 1: magnet and coil (live) ----------
const MBOX = [640, 330];
const COIL_X = 330;
const AXY = 112;
const COIL_R = 56;
const TURNS = 5;
const GAP = 16;
const SC = 64; // px per coil radius (the model's distance unit)
const EMF_FULL = 3.4; // emf (model units) that swings the meter to full scale (the fastest setting peaks near it)
const turnXs = Array.from({ length: TURNS }, (_, k) => COIL_X + (k - (TURNS - 1) / 2) * GAP);
const PHASE_WORDS = { in: 'pushing the magnet in', 'hold-in': 'holding it still inside', out: 'pulling it out', 'hold-out': 'holding it still outside' };

function coilState(t, speed, pole) {
  const m = magnetCycle(t, { speed });
  const phi = pole * dipoleFlux(m.z, 1); // flux to the right, per turn
  const emf = -pole * dipoleFluxSlope(m.z, 1) * m.vz; // -dPhi/dt per turn; > 0 drives current whose own field points right
  return { ...m, phi, emf };
}

function magnetDraw(d, p, t) {
  const tt = Math.max(0, t);
  const s = coilState(tt, p.speed, p.pole);
  const ell = (x, front) => `M${x} ${AXY - COIL_R}A9 ${COIL_R} 0 0 ${front ? 0 : 1} ${x} ${AXY + COIL_R}`;
  for (const x of turnXs) d.path(ell(x, false), { cls: 'ph-wire', w: 1.6, opacity: 0.4 });
  // magnet: N half purple, S half grey; N faces the coil when pole = +1
  const mx = COIL_X + s.z * SC;
  const halves = p.pole > 0 ? [['S', -1], ['N', 1]] : [['N', -1], ['S', 1]];
  for (const [name, side] of halves) {
    const x0 = side < 0 ? mx - 60 : mx;
    d.rect(x0, AXY - 18, 60, 36, { cls: name === 'N' ? 'ph-B' : 'ph-mute', fill: true, rx: 3, style: name === 'N' ? '--fo: 0.35' : '--fo: 0.45' });
    d.text(x0 + 30, AXY, name, { cls: name === 'N' ? 'ph-B' : 'ph-label', size: 16 });
  }
  for (const x of turnXs) d.path(ell(x, true), { cls: 'ph-wire', w: 2.2 });
  // induced current on the front of each turn: down when the induced field points right
  const k = Math.min(1, Math.abs(s.emf) / 1.2);
  if (k > 0.04) {
    const dir = s.emf > 0 ? 1 : -1;
    for (const x of turnXs) d.vec(x - 9, AXY - 9 * dir, 0, 18 * dir, { cls: 'ph-I', w: 2.2, head: 8, opacity: (0.35 + 0.65 * k).toFixed(2) });
    const ax = COIL_X;
    const ay = AXY - COIL_R - 26;
    d.arrow(ax - 36 * dir, ay, ax + 36 * dir, ay, { cls: 'ph-B', w: 2.2, dash: '5 4' });
    d.text(ax + 46 * dir, ay, 'induced B', { cls: 'ph-B', size: 13, anchor: dir > 0 ? 'start' : 'end', halo: true });
    // the coil's left face acts as a pole facing the magnet
    const left = dir < 0 ? 'N' : 'S';
    d.text(turnXs[0] - 26, AXY + COIL_R + 4, left, { cls: left === 'N' ? 'ph-B' : 'ph-label', size: 16, halo: true });
    d.text(turnXs[TURNS - 1] + 26, AXY + COIL_R + 4, left === 'N' ? 'S' : 'N', { cls: left === 'N' ? 'ph-label' : 'ph-B', size: 16, halo: true });
  }
  // galvanometer between the coil leads
  const gx = COIL_X;
  const gy = 300;
  const gr = (turnXs[TURNS - 1] - turnXs[0]) / 2;
  d.wire([[turnXs[0], AXY + COIL_R], [turnXs[0], gy]]);
  d.wire([[turnXs[TURNS - 1], AXY + COIL_R], [turnXs[TURNS - 1], gy]]);
  d.path(`M${gx - gr} ${gy}A${gr} ${gr} 0 0 1 ${gx + gr} ${gy}Z`, { cls: 'ph-wire', w: 1.6, fill: true, style: '--fo: 0.04' });
  for (const a of [-60, 0, 60]) {
    const r = (a * Math.PI) / 180;
    d.line(gx + Math.sin(r) * (gr - 7), gy - Math.cos(r) * (gr - 7), gx + Math.sin(r) * gr, gy - Math.cos(r) * gr, { cls: 'ph-axis', w: 1.2 });
  }
  const na = (Math.max(-1, Math.min(1, s.emf / EMF_FULL)) * 75 * Math.PI) / 180;
  d.line(gx, gy, gx + Math.sin(na) * (gr - 3), gy - Math.cos(na) * (gr - 3), { cls: 'ph-I', w: 2.4 });
  d.dot(gx, gy, { r: 3, cls: 'ph-wire' });
  d.text(gx + gr + 12, gy - 6, 'meter', { cls: 'ph-label', size: 12, anchor: 'start' });
  d.text(16, 312, PHASE_WORDS[s.phase], { cls: 'ph-label', anchor: 'start', size: 14 });
  // plots over one cycle
  const T = 6 / p.speed;
  const u = (tt % T) / T;
  const pl1 = d.plot({ x: 452, y: 34, w: 168, h: 92, xr: [0, 1], yr: [-1.15, 1.15], yLabel: '\u03a6<sub>B</sub>' });
  pl1.fn((x) => coilState(x * T, p.speed, p.pole).phi, { cls: 'ph-B', n: 120 });
  pl1.vline(u);
  pl1.dot(u, s.phi, { cls: 'ph-B', r: 4.5 });
  const pl2 = d.plot({ x: 452, y: 190, w: 168, h: 92, xr: [0, 1], yr: [-EMF_FULL * 1.1, EMF_FULL * 1.1], yLabel: '\u2130', xLabel: 't' });
  pl2.fn((x) => coilState(x * T, p.speed, p.pole).emf, { cls: 'ph-I', n: 160 });
  pl2.vline(u);
  pl2.dot(u, s.emf, { cls: 'ph-I', r: 4.5 });
}

// ---------- figure 2: sliding bar on rails (sandbox) ----------
const RBOX = [640, 300];
const TOP = 70;
const BOT = 240;
const X0 = 96;
const RAIL_L = 0.5; // m between the rails
const RES = 2; // ohm
function barDraw(d, p, t) {
  const st = slidingBar({ B: p.B, L: RAIL_L, v: p.v, R: RES });
  if (p.B > 0) d.bGrid(0, 0, 640, 300, 'in', { step: 40, opacity: (0.2 + 0.4 * p.B).toFixed(2) });
  const span = 440;
  const xb = 150 + ((((30 * p.v * Math.max(0, t)) % span) + span) % span);
  d.rect(X0, TOP, xb - X0, BOT - TOP, { cls: 'ph-B', fill: true, w: 0, style: `--fo: ${(0.05 + 0.12 * p.B).toFixed(2)}` });
  d.wire([[X0, TOP], [626, TOP]]);
  d.wire([[X0, BOT], [626, BOT]]);
  d.resistor(X0, BOT, X0, TOP);
  d.text(X0 - 18, (TOP + BOT) / 2, `R = ${RES} \u03a9`, { cls: 'ph-label', anchor: 'end', size: 13, halo: true });
  const carrier = lorentz(1, [Math.sign(p.v), 0, 0], [0, 0, 1]); // push on + charges in the bar: q v x B
  const up = carrier[1] < 0;
  if (Math.abs(st.I) > 1e-6) {
    const loop = [[xb, BOT], [xb, TOP], [X0, TOP], [X0, BOT], [xb, BOT]];
    flowDots(d, up ? loop : loop.slice().reverse(), 70 * Math.abs(st.I) * Math.max(0, t), { gap: 26 });
    perpMark(d, (X0 + xb) / 2 + 10, (TOP + BOT) / 2 - 34, up ? 'out' : 'in', { cls: 'ph-B', r: 13, w: 1.8, fill: false });
    d.text((X0 + xb) / 2 + 30, (TOP + BOT) / 2 - 34, 'B<sub>ind</sub>', { cls: 'ph-B', serif: true, size: 17, anchor: 'start', halo: true });
  }
  d.line(xb, TOP - 14, xb, BOT + 14, { cls: 'ph-wire', w: 6 });
  if (Math.abs(p.v) > 1e-6) {
    const sv = Math.sign(p.v);
    d.arrow(xb + sv * 8, TOP - 34, xb + sv * (22 + 14 * Math.abs(p.v)), TOP - 34, { cls: 'ph-v', w: 2.6 });
    d.text(xb + sv * (36 + 14 * Math.abs(p.v)), TOP - 34, 'v', { cls: 'ph-v', serif: true, size: 19 });
  }
  if (st.F > 1e-6) {
    const sv = Math.sign(p.v);
    const L = 24 + 220 * st.F;
    d.arrow(xb - sv * 6, (TOP + BOT) / 2 + 40, xb - sv * L, (TOP + BOT) / 2 + 40, { cls: 'ph-F', w: 3 });
    d.text(xb - sv * (L / 2), (TOP + BOT) / 2 + 22, 'F<sub>B</sub>', { cls: 'ph-F', serif: true, size: 18, halo: true });
    d.arrow(xb + sv * 6, (TOP + BOT) / 2 + 40, xb + sv * L, (TOP + BOT) / 2 + 40, { cls: 'ph-F', w: 2, dash: '6 4' });
    d.text(xb + sv * (L / 2), (TOP + BOT) / 2 + 22, 'push', { cls: 'ph-label', size: 13, halo: true });
  }
  d.text(626, 286, 'B into the page', { cls: 'ph-B', anchor: 'end', size: 13, halo: true });
}

// ---------- figure 3: generator (stepped) ----------
const GBOX = [640, 300];
const GEN = { N: 100, B: 0.2, A: 0.01, omega: 2 * Math.PI * 60 };
const GARM = 82;
function genDraw(d, p, t) {
  const th = ((((p.th + (p.spin ? 80 * Math.max(0, t) : 0)) % 360) + 360) % 360);
  const r = (th * Math.PI) / 180;
  const cx = 160;
  const cy = 150;
  for (const y of [40, 92, 208, 260]) d.arrow(14, y, 306, y, { cls: 'ph-B', w: 1.4, opacity: 0.5 });
  d.text(306, 22, 'B', { cls: 'ph-B', serif: true, size: 19, anchor: 'end' });
  const u = [-Math.sin(r), -Math.cos(r)];
  const n = [Math.cos(r), -Math.sin(r)];
  d.arrow(cx, cy, cx + n[0] * 62, cy + n[1] * 62, { cls: 'ph-label', w: 1.6, dash: '4 3' });
  d.text(cx + n[0] * 78, cy + n[1] * 78, 'n', { cls: 'ph-label', serif: true, size: 18, halo: true });
  const ends = [1, -1].map((k) => [cx + k * GARM * u[0], cy + k * GARM * u[1], k]);
  d.line(ends[0][0], ends[0][1], ends[1][0], ends[1][1], { cls: 'ph-wire', w: 3.4 });
  d.dot(cx, cy, { r: 4, cls: 'ph-mute' });
  const sn = Math.abs(Math.sin(r));
  for (const [x, y, k] of ends) {
    const v = [-k * Math.cos(r), k * Math.sin(r)]; // counterclockwise rotation: velocity of this side (unit)
    d.vec(x + v[0] * 15, y + v[1] * 15, v[0] * 40, v[1] * 40, { cls: 'ph-v', w: 2.4 });
    const F = lorentz(1, [v[0], v[1], 0], [1, 0, 0]); // push on + charges along the wire (z)
    if (sn > 0.05) perpMark(d, x, y, F[2] > 0 ? 'in' : 'out', { r: 12, opacity: (0.3 + 0.7 * sn).toFixed(2) });
    else d.circle(x, y, 12, { cls: 'ph-wire', w: 1.6, fill: true, style: '--fo: 0.05' });
  }
  const ticks = [[0, '0\u00b0'], [90, '90\u00b0'], [180, '180\u00b0'], [270, '270\u00b0'], [360, '360\u00b0']];
  const pl1 = d.plot({ x: 360, y: 26, w: 250, h: 92, xr: [0, 360], yr: [-1.2, 1.2], yLabel: '\u03a6<sub>B</sub>' });
  pl1.fn((x) => Math.cos((x * Math.PI) / 180), { cls: 'ph-B' });
  pl1.vline(th);
  pl1.dot(th, Math.cos(r), { cls: 'ph-B', r: 5 });
  const pl2 = d.plot({ x: 360, y: 176, w: 250, h: 92, xr: [0, 360], yr: [-1.2, 1.2], yLabel: '\u2130' });
  for (const [v, s] of ticks) d.text(pl2.X(v), 286, s, { cls: 'ph-tick', size: 12 });
  pl2.fn((x) => Math.sin((x * Math.PI) / 180), { cls: 'ph-I' });
  pl2.vline(th);
  pl2.dot(th, Math.sin(r), { cls: 'ph-I', r: 5 });
}

function genFrames() {
  const peak = GEN.N * GEN.B * GEN.A * GEN.omega;
  const at = (deg) => generator(GEN, (deg * Math.PI) / 180 / GEN.omega);
  const f = (th, caption, spin = 0) => ({ draw: genDraw, p: { th, spin }, box: GBOX, live: Boolean(spin), caption });
  return [
    f(0, `The loop (seen end-on) <b>faces</b> the field: its normal n points along B, so the flux is at its <b>maximum</b>, \u03a6 = BA. Yet the emf is <b>zero</b>: the two sides are moving along the field lines (olive velocity arrows parallel to B), not across them.`),
    f(45, `Turned 45\u00b0: \u03a6 = BA cos 45\u00b0 = ${num(at(45).phi / (GEN.N * GEN.B * GEN.A), 2)} of its maximum and falling. The sides now cut across B at an angle, so \u2130 = ${num(at(45).emf / peak, 2)} of its peak.`),
    f(90, `Edge-on to the field: <b>no flux at all</b>, but the flux is <b>changing fastest</b> here, and the sides cut straight across B. The emf <b>peaks</b>: \u2130 = NBA\u03c9 = <b>${num(peak, 2)} V</b> for 100 turns of a 10 cm \u00d7 10 cm coil in 0.2 T at 60 Hz.`),
    f(180, `Half a turn: the flux is maximum again but <b>negative</b> (B now enters the other face). It is momentarily not changing, so \u2130 = ${num(Math.abs(at(180).emf), 2)} V.`),
    f(270, 'Edge-on the other way: the emf peaks again with the <b>opposite sign</b>. The current in the loop has reversed. This is <b>alternating current</b>: it reverses twice per turn.'),
    f(270, 'Spinning steadily: \u03a6 follows cos \u03c9t and \u2130 follows sin \u03c9t, a quarter cycle behind. Each peak of one lines up with a zero of the other. Every power-plant generator works like this; at 60 Hz the loop turns 60 times a second.', 1),
  ];
}

// ---------- quiz ----------
const QBOX = [540, 220];
function lenzQuizDraw(d) {
  d.bGrid(0, 0, 230, 220, 'in', { step: 36, opacity: 0.45 });
  d.rect(40, 40, 150, 140, { cls: 'ph-wire', w: 2.6, rx: 4 });
  d.text(115, 206, 'B into page, growing', { cls: 'ph-B', size: 12, halo: true });
  for (const [id, ccw, x, word] of [['cw', false, 310, 'clockwise'], ['ccw', true, 460, 'counterclockwise']]) {
    const g = d.group({ id, cls: 'ph-I' });
    g.rect(x - 70, 40, 140, 140, { fill: true, rx: 10, w: 1, style: '--fo: 0.06' });
    arcArrow(g, x, 100, 30, ccw ? -60 : 240, ccw ? 240 : -60, { w: 2.6 });
    g.text(x, 160, word, { size: 12 });
  }
}
const lenzAnswer = () => inducedSense(-1); // flux with the normal out of the page is -BA; B grows, so it decreases

const BAR_Q = { B: 0.5, L: 0.2, v: 4, R: 2 };
const quiz = [
  {
    type: 'mcq',
    id: 'induction.gen-peak',
    prompt: 'A coil spins at a steady rate in a uniform magnetic field. At which moment is the induced emf <b>largest</b>?',
    choices: ['When the coil faces the field, so the flux through it is maximum', 'When the coil is edge-on to the field, so the flux through it is zero', 'Halfway between those two positions', 'The emf is the same at every moment because the spin rate is constant'],
    answer: 1,
    explain: () => {
      const g = { ...GEN };
      const T4 = Math.PI / 2 / g.omega;
      return `Emf depends on how fast flux is <b>changing</b>, not on how much there is. Flux \u221d cos \u03c9t changes fastest as it passes through zero. For the 60 Hz coil in the figure, at the edge-on moment \u03a6 = ${num(Math.abs(generator(g, T4).phi), 2)} and \u2130 = ${num(generator(g, T4).emf, 2)} V (the peak); facing the field, \u03a6 is maximum and \u2130 = 0.`;
    },
  },
  {
    type: 'pick',
    id: 'induction.lenz-dir',
    prompt: 'A wire loop lies in the page. The magnetic field through it points <b>into</b> the page and is <b>increasing</b>. Click the direction of the induced current.',
    View: PhysView,
    view: { height: 230, box: QBOX },
    build: () => ({ frame: { draw: lenzQuizDraw, p: {}, box: QBOX }, answer: [lenzAnswer()] }),
    explain: 'The flux into the page is growing. Lenz: the induced current makes its own field to fight that growth, so its field inside the loop points <b>out of</b> the page. Grip rule: a current whose field points out of the page inside the loop runs <b>counterclockwise</b>. (A common trap: making the induced field oppose B itself. It opposes the <b>change</b>. If B were decreasing, the current would be clockwise to prop it up.)',
  },
  {
    type: 'input',
    id: 'induction.bar-emf',
    prompt: `A metal bar slides at ${BAR_Q.v} m/s along rails ${BAR_Q.L * 100} cm apart, in a ${BAR_Q.B} T field perpendicular to the plane of the rails. What emf (in volts) is induced?`,
    accept: (s) => Math.abs(parseFloat(s) - slidingBar(BAR_Q).emf) < 0.005,
    placeholder: 'volts',
    explain: () => {
      const b = slidingBar(BAR_Q);
      return `\u2130 = BLv = ${BAR_Q.B} \u00d7 ${BAR_Q.L} \u00d7 ${BAR_Q.v} = <b>${num(b.emf)} V</b>. Each second the loop gains L\u00b7v = ${num(BAR_Q.L * BAR_Q.v)} m\u00b2 of area, so the flux grows by B\u00b7Lv = ${num(b.emf)} Wb per second. With ${BAR_Q.R} \u03a9 of resistance that drives ${num(b.I)} A, and the field pushes back on the bar with ${num(b.F)} N.`;
    },
  },
  {
    type: 'mcq',
    id: 'induction.magnet-still',
    prompt: 'You push a bar magnet into a coil, then hold it still deep inside, where the flux through the coil is largest. While you hold it still, the current in the coil is...',
    choices: ['largest, because the flux is largest', 'zero, because the flux is not changing', 'steady and nonzero, as the magnet keeps magnetizing the coil', 'reversed from when it was entering'],
    answer: 1,
    explain: () => `Faraday: \u2130 = \u2212N d\u03a6/dt. A big flux that is not changing gives <b>no</b> emf. In the magnet-and-coil figure the meter reads ${num(Math.abs(magnetCycle(2).vz))} the whole time the magnet sits inside, and swings only while it moves.`,
  },
];

export default {
  id: 'induction',
  title: 'Induction',
  group: 'Magnetism',
  blurb: 'A changing magnetic flux makes an emf: Faraday and Lenz, generators, and transformers.',
  quiz,
  render(root) {
    root.append(
      p('So far currents made magnetic fields. In 1831 Faraday found the reverse: a <b>changing</b> magnetic field makes a current. Move a magnet near a coil of wire and a current flows, with no battery anywhere. This is <b>electromagnetic induction</b>, and it is how nearly all electric power is generated.'),
      p('The quantity that matters is the <b>magnetic flux</b> through a loop: how much field passes through the area it encloses. It is the same idea as electric flux in Gauss\u2019s law, but now through an open surface bounded by a wire.'),
      equation({
        name: 'Magnetic flux',
        eq: '\u03a6<sub>B</sub> = B A cos\u03b8',
        says: 'Flux counts field lines through the loop. It is largest when the loop faces the field (\u03b8 = 0) and zero when the loop is edge-on (\u03b8 = 90\u00b0). For a non-uniform field you add up B\u00b7dA over the area.',
        terms: [
          ['\u03a6<sub>B</sub>', 'magnetic flux through the loop', 'Wb = T\u00b7m\u00b2'],
          ['A', 'area enclosed by the loop', 'm\u00b2'],
          ['\u03b8', 'angle between B and the loop\u2019s normal (the line perpendicular to its face)', ''],
        ],
      }),
      equation({
        name: 'Faraday\u2019s law',
        eq: '\u2130 = \u2212N <span class="frac"><span>d\u03a6<sub>B</sub></span><span>dt</span></span>',
        says: 'The induced emf equals how <b>fast</b> the flux changes, times the number of turns. A huge steady flux induces nothing; a small flux that changes quickly induces a lot. Change B, change A, or change the angle: any of the three works.',
        terms: [
          ['\u2130', 'induced emf around the loop (acts like a battery spread around the wire)', 'V'],
          ['N', 'number of turns in the coil (each turn adds the same emf)', ''],
          ['d\u03a6<sub>B</sub>/dt', 'rate of change of flux through one turn', 'Wb/s = V'],
        ],
      }),
      p('The minus sign is <b>Lenz\u2019s law</b>: the induced current flows in the direction whose own magnetic field <b>opposes the change</b> in flux. Flux increasing? The induced field points against it. Flux decreasing? The induced field points along it, trying to keep it up. It is energy conservation in disguise: if the induced current helped the change, a nudge would run away into free energy.'),
    );

    // Magnet and coil
    const mStage = h('div', { class: 'stage' });
    const ms = { speed: 1, pole: 1 };
    const mView = new PhysView(mStage, { height: 360, box: MBOX });
    const mShow = () => mView.show({ draw: magnetDraw, p: { ...ms }, box: MBOX, live: true }, { animate: false });
    root.append(
      figure(
        {
          title: 'A magnet, a coil, and a meter',
          tools: [segmented([{ value: 1, label: 'N end first' }, { value: -1, label: 'S end first' }], 1, (v) => ((ms.pole = v), mShow()), { label: 'Magnet orientation' })],
          note: 'The magnet goes in, waits, comes out, waits. Right: flux through the coil (purple) and induced emf (teal) over one cycle. While the magnet moves, the coil becomes a magnet itself (letters at its ends) whose near face <b>repels</b> the incoming magnet and <b>attracts</b> the outgoing one. That opposition is Lenz\u2019s law, and it is why you have to do work to generate the current.',
        },
        mStage,
        controlsRow(slider({ label: 'magnet speed', min: 0.5, max: 1.25, step: 0.25, value: 1, fmt: (v) => `\u00d7${v}`, onInput: (v) => ((ms.speed = v), mShow()) })),
      ),
    );
    mShow();

    root.append(
      callout('key', 'Change is what counts', 'The emf comes from the <b>rate of change</b> of flux. A magnet sitting still inside a coil, however strong, induces nothing. Move it twice as fast and the emf doubles (for half as long). And the induced current always opposes the change that caused it.'),
      p('The flux can also change because the <b>area</b> changes. Slide a metal bar along two rails in a field: the circuit\u2019s area grows by L\u00b7v every second, so the flux grows by BLv every second. Equivalently, the charges in the moving bar feel qv \u00d7 B (last chapter\u2019s force) and get pushed along the bar. Both views give the same answer.'),
      equation({
        name: 'Motional emf',
        eq: '\u2130 = B L v',
        says: 'A conductor of length L moving at speed v across a field B has an emf BLv between its ends. Double the speed, double the emf. The current it drives feels a force ILB that <b>opposes the motion</b>: you have to keep pushing.',
        terms: [
          ['L', 'length of the moving bar (distance between the rails)', 'm'],
          ['v', 'speed of the bar, perpendicular to B and to itself', 'm/s'],
        ],
      }),
    );

    // Sliding bar
    const bStage = h('div', { class: 'stage' });
    const bs = { v: 2, B: 0.6 };
    const ro = readouts([['emf', '\u2130 = BLv'], ['I', 'I = \u2130/R'], ['F', 'drag F = ILB'], ['P', 'power Fv = I\u00b2R']]);
    const bView = new PhysView(bStage, { height: 320, box: RBOX });
    const bShow = () => {
      bView.show({ draw: barDraw, p: { ...bs }, box: RBOX, live: true }, { animate: false });
      const st = slidingBar({ B: bs.B, L: RAIL_L, v: bs.v, R: RES });
      ro.set({ emf: `${num(Math.abs(st.emf))} V`, I: `${num(Math.abs(st.I))} A`, F: `${num(Math.abs(st.F))} N`, P: `${num(Math.abs(st.Pmech))} W` });
    };
    root.append(
      figure(
        {
          title: 'Sandbox: a bar sliding on rails',
          note: `Rails ${RAIL_L * 100} cm apart, closed by a ${RES} \u03a9 resistor. The shaded area is the circuit; its flux grows as the bar moves right. The induced current (teal dots) makes its own field B<sub>ind</sub> opposing that growth, and the field pushes back on the bar (F<sub>B</sub>). Your push supplies exactly the power the resistor turns into heat. Set v negative: everything reverses.`,
        },
        bStage,
        controlsRow(
          slider({ label: 'speed v', min: -4, max: 4, step: 0.5, value: bs.v, fmt: (v) => `${num(v, 2)} m/s`, onInput: (v) => ((bs.v = v), bShow()) }),
          slider({ label: 'field B', min: 0, max: 1, step: 0.1, value: bs.B, fmt: (v) => `${v.toFixed(1)} T`, onInput: (v) => ((bs.B = v), bShow()) }),
        ),
        ro,
      ),
    );
    bShow();

    root.append(
      p('The third way to change flux is to change the <b>angle</b>. Spin a coil in a steady field and cos\u03b8 swings between +1 and \u22121, so the flux oscillates and so does the emf. That is a <b>generator</b>: a motor run backwards. Turn the shaft (with steam, water, or wind) and AC comes out.'),
    );

    const gHost = h('div');
    root.append(figure({ title: 'Generator: flux and emf as the loop turns', note: 'Left: the loop end-on; olive arrows are the velocities of its two sides, \u2299/\u2297 the induced current (faded when weak). Right: flux and emf against the angle turned.' }, gHost));
    new Player(gHost, { frames: genFrames(), View: PhysView, view: { height: 320 } });

    const tr = transformer(120, 500, 50);
    root.append(
      callout('warn', 'The classic trap', 'Maximum flux does <b>not</b> mean maximum emf. In the generator the emf is largest when the flux is <b>zero</b> (passing through zero is when it changes fastest), and zero when the flux is at its peak. The same trap shows up on graphs: the emf is the <b>slope</b> of the flux curve, not its height.'),
      p(`Two more applications. A <b>transformer</b> is two coils wound on one iron core. AC in the primary coil makes a changing flux, and the same flux passes through every turn of the secondary, so each coil\u2019s voltage is proportional to its number of turns: ${eq('V<sub>s</sub>/V<sub>p</sub> = N<sub>s</sub>/N<sub>p</sub>')}. A 500-turn primary on 120 V with a 50-turn secondary gives ${num(tr.Vs)} V, and the secondary current is 10\u00d7 larger, so power in equals power out. That is why the grid runs on AC: transformers step it up for long-distance lines and down for your house. They do not work on steady DC, because steady current means unchanging flux.`),
      p('<b>Eddy currents</b> are induced currents swirling inside solid chunks of metal. By Lenz\u2019s law they oppose the motion that creates them, so a magnet falls slowly through a copper pipe, and trains use them as brakes. In transformers they waste energy as heat, which is why transformer cores are made of thin insulated sheets.'),
      checkpoint(quiz),
    );
  },
};
