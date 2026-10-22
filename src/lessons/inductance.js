import { h, p } from '../ui/dom.js';
import { Player } from '../ui/player.js';
import { PhysView } from '../core/phys-view.js';
import { figure, callout } from '../ui/figure.js';
import { checkpoint } from '../ui/quiz.js';
import { equation, eq, slider, controlsRow, readouts } from '../ui/controls.js';
import { inductorEnergy, rlTau, rlCurrent, lcOmega, lcState, springOmega } from '../model/magnetism.js';
import { flowDots, coil, spring, num } from './magnet-kit.js';

// ---------- figure 1: the spring <-> LC analogy (stepped) ----------
const ABOX = [640, 368];
const ROW0 = 196;
const ROWH = 26;
const ANALOGY = [
  { spring: 'position x', lc: 'charge Q', role: 'what gets displaced' },
  { spring: 'velocity v', lc: 'current I', role: 'its rate of change' },
  { spring: 'mass m', lc: 'inductance L', role: 'inertia: resists change' },
  { spring: 'stiffness k', lc: '1/C', role: 'restoring push' },
  { spring: '\u00bd kx<sup>2</sup>', lc: 'Q<sup>2</sup>/2C', role: 'stored energy' },
  { spring: '\u00bd mv<sup>2</sup>', lc: '\u00bd LI<sup>2</sup>', role: 'energy of motion' },
  { spring: '\u03c9 = \u221a(k/m)', lc: '\u03c9 = 1/\u221a(LC)', role: 'natural frequency' },
];
const COLX = [118, 318, 510];

function drawSystems(d) {
  d.line(30, 40, 30, 110, { cls: 'ph-wire', w: 3 });
  spring(d, 30, 140, 86, { n: 9 });
  d.rect(140, 64, 46, 44, { cls: 'ph-wire', fill: true, rx: 4, style: '--fo: 0.08' });
  d.text(163, 86, 'm', { serif: true, size: 18 });
  d.line(20, 110, 240, 110, { cls: 'ph-mute' });
  d.text(130, 132, 'mass on a spring', { cls: 'ph-label', size: 13 });
  // LC loop
  const L0 = 300;
  const R0 = 420;
  d.wire([[L0, 64], [L0, 20], [R0, 20], [R0, 40]]);
  d.wire([[L0, 76], [L0, 110], [R0, 110], [R0, 90]]);
  d.line(L0 - 18, 64, L0 + 18, 64, { cls: 'ph-wire ph-element' });
  d.line(L0 - 18, 76, L0 + 18, 76, { cls: 'ph-wire ph-element' });
  coil(d, R0, 40, 90, { n: 4, body: 48 });
  d.text(L0 - 30, 70, 'C', { cls: 'ph-label', serif: true, size: 17, anchor: 'end' });
  d.text(R0 + 26, 66, 'L', { cls: 'ph-label', serif: true, size: 17, anchor: 'start' });
  d.text(360, 132, 'LC circuit', { cls: 'ph-label', size: 13 });
}

function analogyDraw(d, p) {
  drawSystems(d);
  d.text(COLX[0], ROW0 - 28, 'spring', { cls: 'ph-label', size: 13 });
  d.text(COLX[1], ROW0 - 28, 'LC circuit', { cls: 'ph-label', size: 13 });
  d.text(COLX[2], ROW0 - 28, 'role', { cls: 'ph-label', size: 13 });
  d.line(20, ROW0 - 15, 620, ROW0 - 15, { cls: 'ph-mute', w: 1 });
  if (p.hl >= 0) d.rect(20, ROW0 + p.hl * ROWH - ROWH / 2, 600, ROWH, { fill: true, w: 0, rx: 5, style: '--c: var(--t4); --fo: 0.2' });
  ANALOGY.forEach((r, i) => {
    if (i > p.upto) return;
    const y = ROW0 + i * ROWH;
    d.text(COLX[0], y, r.spring, { size: 14 });
    d.text(COLX[1], y, r.lc, { size: 14 });
    d.text(COLX[2], y, r.role, { cls: 'ph-label', size: 13 });
  });
}

// pick quiz: the spring-side quantities as shuffled chips, without the dictionary
const CHIP_ORDER = [3, 0, 5, 2, 6, 1, 4];
const PBOX = [640, 290];
function analogyPickDraw(d) {
  drawSystems(d);
  CHIP_ORDER.forEach((i, k) => {
    const row = k < 4 ? 0 : 1;
    const col = row ? k - 4 : k;
    const n = row ? 3 : 4;
    const x = 320 + (col - (n - 1) / 2) * 150;
    const y = 190 + row * 60;
    const g = d.group({ id: `sp${i}`, cls: 'ph-F' });
    g.rect(x - 66, y - 21, 132, 42, { fill: true, rx: 8, w: 1.2, style: '--fo: 0.05' });
    g.text(x, y, ANALOGY[i].spring.replace(/^\u03c9 = /, ''), { size: 14 });
  });
}

const ANALOGY_SAY = [
  'A mass on a spring and an LC circuit obey the <b>same equation</b> with different letters. Learn the dictionary once and everything you know about oscillators carries over.',
  '<b>Charge on the capacitor</b> plays the role of <b>position</b>: it is the thing that sloshes back and forth.',
  '<b>Current</b> is the rate of change of charge, just as velocity is the rate of change of position: I = dQ/dt \u2194 v = dx/dt.',
  '<b>Inductance is inertia.</b> A mass resists changes in velocity (F = ma); an inductor resists changes in current (\u2130 = \u2212L dI/dt). Neither cares how fast things are going, only about changing it.',
  'The capacitor is the <b>spring</b>: the more charge you pile on, the harder it pushes back (V = Q/C, like F = kx). A <b>small</b> C is a <b>stiff</b> spring, so k \u2194 1/C.',
  'Stored energy: the spring\u2019s ' + '\u00bdkx\u00b2 becomes the capacitor\u2019s Q\u00b2/2C, energy in the <b>electric field</b> between the plates.',
  'Energy of motion: \u00bdmv\u00b2 becomes \u00bdLI\u00b2, energy in the <b>magnetic field</b> of the coil.',
  'Substitute m \u2192 L and k \u2192 1/C into \u03c9 = \u221a(k/m) and you get the LC frequency <b>\u03c9 = 1/\u221a(LC)</b>, no new physics needed.',
];
function analogyFrames() {
  return ANALOGY_SAY.map((caption, k) => ({ draw: analogyDraw, p: { hl: k - 1, upto: k === 0 ? -1 : k - 1 }, box: ABOX, caption }));
}

// ---------- figure 2: LC oscillation, live, with the spring next to it ----------
const LBOX = [640, 300];
const LREF = 4; // mH
const CREF = 4; // uF
const T_SHOW = 2.4; // s on screen per period at the reference values
const Q0 = 20e-6; // C (20 uC)
const realPeriod = (Lm, Cu) => (2 * Math.PI) / lcOmega(Lm * 1e-3, Cu * 1e-6);
const SLOW = T_SHOW / realPeriod(LREF, CREF);

function lcDraw(d, p, t, f) {
  const st = f.state;
  const dt = Math.max(0, Math.min(0.1, t - st.last));
  st.last = t;
  const L = p.L * 1e-3;
  const C = p.C * 1e-6;
  st.tReal += dt / SLOW; // real seconds elapsed in the circuit
  const s = lcState(L, C, Q0, st.tReal);
  const qn = s.q / Q0; // -1..1
  const iMax = Q0 * s.w;
  const inorm = s.i / iMax; // -1..1
  const U = s.UE + s.UB;
  st.flow += 120 * inorm * dt;
  // circuit: capacitor on the left (top plate charge q), coil on the right
  const xl = 60;
  const xr = 230;
  const yt = 40;
  const yb = 260;
  const p1 = 132;
  const p2 = 168;
  d.wire([[xl, p2], [xl, yb], [xr, yb], [xr, yt], [xl, yt], [xl, p1]]);
  flowDots(d, [[xl, p2], [xl, yb], [xr, yb], [xr, yt], [xl, yt], [xl, p1]], st.flow, { gap: 28 });
  d.rect(xr - 4, 96, 22, 108, { fill: true, w: 0, style: '--c: var(--surface); --fo: 1' });
  coil(d, xr, 96, 204, { n: 6, body: 108 });
  d.line(xl - 34, p1, xl + 34, p1, { cls: 'ph-wire', w: 3 });
  d.line(xl - 34, p2, xl + 34, p2, { cls: 'ph-wire', w: 3 });
  const nq = Math.round(Math.abs(qn) * 4);
  for (let k = 0; k < nq; k++) {
    const x = xl + [-28, 28, -16, 16][k];
    d.text(x, p1 - 12, qn > 0 ? '+' : '\u2212', { cls: qn > 0 ? 'ph-pos' : 'ph-neg', size: 15 });
    d.text(x, p2 + 13, qn > 0 ? '\u2212' : '+', { cls: qn > 0 ? 'ph-neg' : 'ph-pos', size: 15 });
  }
  if (Math.abs(qn) > 0.05) {
    for (const x of [xl - 18, xl, xl + 18]) {
      const [a, b] = qn > 0 ? [p1 + 4, p2 - 4] : [p2 - 4, p1 + 4];
      d.arrow(x, a, x, b, { cls: 'ph-E', w: 1.8, head: 7, opacity: Math.abs(qn).toFixed(2) });
    }
  }
  if (Math.abs(inorm) > 0.05) {
    const dir = inorm > 0 ? -1 : 1; // positive i flows up through the coil
    d.arrow(xr + 34, 150 - 40 * dir, xr + 34, 150 + 40 * dir, { cls: 'ph-B', w: 2.6, opacity: Math.abs(inorm).toFixed(2) });
    d.text(xr + 48, 150, 'B', { cls: 'ph-B', serif: true, size: 18, anchor: 'start', opacity: Math.abs(inorm).toFixed(2) });
  }
  d.text(xl - 44, 150, 'C', { cls: 'ph-label', serif: true, size: 17, anchor: 'end' });
  d.text(xr - 16, 150, 'L', { cls: 'ph-label', serif: true, size: 17, anchor: 'end' });
  // energy bars
  const bx = 318;
  const base = 250;
  const hmax = 170;
  d.line(bx - 14, base, bx + 104, base, { cls: 'ph-axis', w: 1.2 });
  d.line(bx - 14, base - hmax, bx + 104, base - hmax, { cls: 'ph-mute', dash: '4 4', w: 1 });
  d.text(bx + 104, base - hmax - 12, 'total', { cls: 'ph-label', size: 12, anchor: 'end' });
  const hE = (hmax * s.UE) / U;
  const hB = (hmax * s.UB) / U;
  d.rect(bx, base - hE, 36, hE, { cls: 'ph-E', fill: true, w: 1.4, style: '--fo: 0.45' });
  d.rect(bx + 54, base - hB, 36, hB, { cls: 'ph-B', fill: true, w: 1.4, style: '--fo: 0.45' });
  d.text(bx + 18, base + 18, 'U<sub>E</sub>', { cls: 'ph-E', serif: true, size: 17 });
  d.text(bx + 72, base + 18, 'U<sub>B</sub>', { cls: 'ph-B', serif: true, size: 17 });
  // mass on a spring with x <-> q and v <-> i
  const wall = 456;
  const xm = 566 + 34 * qn;
  d.line(wall, 120, wall, 196, { cls: 'ph-wire', w: 3 });
  d.line(wall, 196, 632, 196, { cls: 'ph-mute' });
  spring(d, wall, xm - 20, 172, { n: 8, amp: 8 });
  d.rect(xm - 20, 150, 40, 44, { cls: 'ph-wire', fill: true, rx: 4, style: '--fo: 0.08' });
  d.text(xm, 172, 'm', { serif: true, size: 17 });
  d.line(566, 204, 566, 214, { cls: 'ph-mute' });
  if (Math.abs(inorm) > 0.05) d.vec(xm, 136, 40 * inorm, 0, { cls: 'ph-v', w: 2.4, head: 8 });
  d.text(552, 240, 'x \u2194 Q, v \u2194 I', { cls: 'ph-label', size: 13 });
}

// ---------- figure 3: RL circuit (sandbox) ----------
const RBOX = [640, 290];
const EMF = 10;
const T_AXIS = 100; // ms shown on the plot
const WALL_PER_MS = 3 / T_AXIS; // 3 s on screen for the 100 ms window
function rlDraw(d, p, t) {
  const tms = p.closed ? Math.max(0, t) / WALL_PER_MS : 0;
  const tauMs = rlTau(p.L, p.R) * 1000;
  const I = p.closed ? rlCurrent(EMF, p.R, p.L, Math.min(tms, T_AXIS) / 1000) : 0;
  const xl = 40;
  const xr = 250;
  const yt = 50;
  const yb = 250;
  d.battery(xl, yb, xl, yt);
  d.text(xl + 24, 150, `\u2130 = ${EMF} V`, { cls: 'ph-label', anchor: 'start', size: 13 });
  d.switch(xl, yt, 130, yt, { closed: p.closed });
  d.resistor(130, yt, xr, yt, { label: `R = ${p.R} \u03a9` });
  coil(d, xr, yt, yb, { n: 6, body: 100 });
  d.wire([[xr, yb], [xl, yb]]);
  d.text(xr + 20, 150, `L = ${num(p.L, 2)} H`, { cls: 'ph-label', anchor: 'start', size: 13 });
  if (I > 1e-4) flowDots(d, [[xl, yb], [xl, yt], [xr, yt], [xr, yb], [xl, yb]], 140 * I * Math.max(0, t), { gap: 28 });
  const Imax = EMF / 10;
  const pl = d.plot({
    x: 384, y: 26, w: 226, h: 210, xr: [0, T_AXIS], yr: [0, Imax * 1.1], yLabel: 'I (A)',
    ticksX: [[25, '25'], [50, '50'], [75, '75'], [100, '100 ms']], ticksY: [[0.5, '0.5'], [1, '1.0']],
  });
  pl.hline(EMF / p.R);
  pl.label(T_AXIS, EMF / p.R + 0.06, '\u2130/R', { anchor: 'end', size: 13 });
  if (tauMs <= T_AXIS) {
    pl.vline(tauMs, { cls: 'ph-I', dash: '3 4' });
    pl.label(tauMs + 2, 0.05, `\u03c4 = ${num(tauMs, 2)} ms`, { anchor: 'start', size: 12, cls: 'ph-I', halo: true });
  }
  if (p.closed && tms > 0) {
    pl.fn((x) => rlCurrent(EMF, p.R, p.L, x / 1000), { to: Math.min(tms, T_AXIS), cls: 'ph-plot2', w: 2.6 });
    if (tms >= tauMs && tauMs <= T_AXIS) pl.dot(tauMs, rlCurrent(EMF, p.R, p.L, tauMs / 1000), { cls: 'ph-I', r: 4.5 });
  }
}

// ---------- quiz ----------
const L_Q = 2e-3;
const C_Q = 5e-6;
const fRatio = lcOmega(L_Q, 4 * C_Q) / lcOmega(L_Q, C_Q);
const PICK_ANALOGY = { draw: analogyPickDraw, p: {}, box: PBOX };

const quiz = [
  {
    type: 'input',
    id: 'inductance.lc-quad-c',
    prompt: 'An LC circuit oscillates at frequency f. You swap in a capacitor with <b>four times</b> the capacitance. The new frequency is f times what?',
    accept: (s) => {
      const v = s.includes('/') ? s.split('/').reduce((a, b) => Number(a) / Number(b)) : parseFloat(s);
      return Math.abs(v - fRatio) < 0.01;
    },
    placeholder: 'e.g. 2',
    explain: `\u03c9 = 1/\u221a(LC), so C \u00d7 4 gives \u03c9 \u00d7 1/\u221a4 = <b>${num(fRatio)}</b>. For L = 2 mH: C = 5 \u03bcF rings at ${num(lcOmega(L_Q, C_Q) / (2 * Math.PI))} Hz, C = 20 \u03bcF at ${num(lcOmega(L_Q, 4 * C_Q) / (2 * Math.PI))} Hz. Spring version: a softer spring (k \u2192 k/4) oscillates at half the frequency.`,
  },
  {
    type: 'mcq',
    id: 'inductance.rl-instant',
    prompt: 'A battery, resistor, and inductor are in series with an open switch. The instant <b>after</b> you close the switch, what is the current?',
    choices: ['\u2130/R right away, as with a plain resistor', 'Zero: the inductor\u2019s back emf equals the battery voltage at that instant', 'Infinite for an instant, then it settles', '\u2130/R \u00d7 0.63'],
    answer: 1,
    explain: () => `An inductor will not let its current jump; the current was zero, so it is still zero just after closing. All of the battery\u2019s ${EMF} V appears across the inductor as back emf (\u2130 = \u2212L dI/dt with dI/dt = \u2130/L). The current then climbs toward \u2130/R with \u03c4 = L/R: 63% after one \u03c4 (that is where 0.63 comes from), 99% after five. With L = 0.5 H and R = 10 \u03a9, \u03c4 = ${num(rlTau(0.5, 10) * 1000)} ms.`,
  },
  {
    type: 'mcq',
    id: 'inductance.lc-zero-charge',
    prompt: 'In an oscillating LC circuit, at the instant the capacitor\u2019s charge passes through <b>zero</b>, the current is...',
    choices: ['zero too, since there is nothing to push it', 'at its maximum: all the energy is in the inductor\u2019s magnetic field', 'half its maximum', 'reversing direction'],
    answer: 1,
    explain: () => {
      const L = 2e-3;
      const C = 5e-6;
      const s = lcState(L, C, 1e-4, Math.PI / 2 / lcOmega(L, C));
      return `Think of the mass passing through the middle: zero displacement, top speed. Energy is conserved, so U<sub>E</sub> = 0 means U<sub>B</sub> = \u00bdLI<sup>2</sup> holds all of it. Example: 100 \u03bcC on 5 \u03bcF stores ${num((1e-4) ** 2 / (2 * C) * 1000)} mJ; a quarter period later q = 0 and \u00bdLI<sup>2</sup> = ${num(s.UB * 1000)} mJ with I = ${num(Math.abs(s.i))} A. The current reverses when the <i>charge</i> is maximum, not when it is zero.`;
    },
  },
  {
    type: 'pick',
    id: 'inductance.analogy-L',
    prompt: 'In the mass-on-a-spring analogy, which mechanical quantity plays the role of <b>inductance L</b>? Click it.',
    View: PhysView,
    view: { height: 300, box: PBOX },
    build: () => ({ frame: PICK_ANALOGY, answer: [`sp${ANALOGY.findIndex((r) => r.lc === 'inductance L')}`] }),
    explain: () => `<b>Mass.</b> Both resist <b>changes</b> in motion: a mass resists changes in velocity (F = ma), an inductor resists changes in current (\u2130 = \u2212L dI/dt). The formulas agree: for L = 2 mH and C = 5 \u03bcF, 1/\u221a(LC) = ${num(lcOmega(L_Q, C_Q))} rad/s, and \u221a(k/m) with k = 1/C, m = L gives the same ${num(springOmega(1 / C_Q, L_Q))} rad/s. (Stiffness k is the capacitor\u2019s partner, as 1/C.)`,
  },
];

export default {
  id: 'inductance',
  title: 'Inductance & oscillations',
  group: 'Magnetism',
  blurb: 'Inductors resist changes in current: electrical inertia, RL rise times, and LC circuits that ring like springs.',
  quiz,
  render(root) {
    root.append(
      p('A coil carrying current makes a magnetic field through itself. If the current changes, that flux changes, and by Faraday\u2019s law the coil induces an emf <b>in itself</b>. By Lenz\u2019s law that emf opposes the change: increase the current and the coil pushes back; cut the current and the coil tries to keep it going (which is why a switch on a big motor can spark). This self-opposing coil is an <b>inductor</b>.'),
      p('How strongly a coil does this is its <b>inductance</b> L, measured in henries (H). It depends only on the coil\u2019s geometry and what fills it: more turns, more area, and an iron core all increase it. A long solenoid has ' + eq('L = \u03bc<sub>0</sub>n<sup>2</sup>A\u2113') + ': n is squared because more turns make more flux <i>and</i> each turn picks up that flux.'),
      equation({
        name: 'Self-induced emf of an inductor',
        eq: '\u2130<sub>L</sub> = \u2212L <span class="frac"><span>dI</span><span>dt</span></span>',
        says: 'The voltage across an inductor depends on how fast the current is <b>changing</b>, not on the current itself. Steady current: no voltage. Fast change: large voltage, opposing the change. That is <b>electrical inertia</b>, just like F = ma resists changes in velocity.',
        terms: [
          ['\u2130<sub>L</sub>', 'back emf across the inductor', 'V'],
          ['L', 'inductance (set by the coil\u2019s shape and core)', 'H = V\u00b7s/A'],
          ['dI/dt', 'rate of change of the current through it', 'A/s'],
        ],
      }),
      equation({
        name: 'Energy stored in an inductor',
        eq: 'U<sub>B</sub> = \u00bd L I<sup>2</sup>',
        says: 'Building up a current against the back emf takes work, which is stored in the coil\u2019s <b>magnetic field</b>. Double the current, four times the energy. Compare \u00bdmv<sup>2</sup> and the capacitor\u2019s \u00bdCV<sup>2</sup>.',
        terms: [
          ['U<sub>B</sub>', 'energy stored in the magnetic field', 'J'],
          ['I', 'current through the inductor', 'A'],
        ],
      }),
    );

    const aHost = h('div');
    root.append(figure({ title: 'The analogy, row by row', note: 'Step through the dictionary between a mass on a spring and an LC circuit.' }, aHost));
    new Player(aHost, { frames: analogyFrames(), View: PhysView, view: { height: 380 } });

    root.append(
      p('Now the RL circuit: a battery, a resistor, and an inductor in series. Close the switch and the current cannot jump to ' + eq('\u2130/R') + ' the way it would with a resistor alone; the inductor\u2019s back emf holds it back. The current climbs smoothly, quickly at first and then more slowly as it approaches \u2130/R, with time constant ' + eq('\u03c4 = L/R') + '. After one \u03c4 it has reached 63% of its final value; after five, over 99%. It is the same exponential shape as charging a capacitor in the RC chapter.'),
    );

    // RL sandbox
    const rStage = h('div', { class: 'stage' });
    const rs = { L: 0.5, R: 20, closed: false };
    const rro = readouts([['tau', '\u03c4 = L/R'], ['If', 'final current \u2130/R'], ['U', 'final energy \u00bdLI<sup>2</sup>']]);
    const rView = new PhysView(rStage, { height: 320, box: RBOX });
    const rShow = (reset = false) => {
      rView.show({ draw: rlDraw, p: { ...rs }, box: RBOX, live: rs.closed, resetTime: reset }, { animate: false });
      const If = EMF / rs.R;
      rro.set({ tau: `${num(rlTau(rs.L, rs.R) * 1000)} ms`, If: `${num(If)} A`, U: `${num(inductorEnergy(rs.L, If) * 1000)} mJ` });
    };
    const closeBtn = h('button', { class: 'btn small', text: 'Close switch', onclick: () => ((rs.closed = true), rShow(true)) });
    const openBtn = h('button', { class: 'btn ghost small', text: 'Reset', onclick: () => ((rs.closed = false), rShow(true)) });
    root.append(
      figure(
        {
          title: 'Sandbox: current rising in an RL circuit',
          tools: [closeBtn, openBtn],
          note: 'Close the switch and watch the current climb (100 ms of real time shown over 3 s). The dashed line is the final current \u2130/R; the teal marker is one time constant. Try a bigger L (slower) and a bigger R (faster, but a smaller final current).',
        },
        rStage,
        controlsRow(
          slider({ label: 'inductance L', min: 0.1, max: 1, step: 0.1, value: rs.L, fmt: (v) => `${v.toFixed(1)} H`, onInput: (v) => ((rs.L = v), rShow()) }),
          slider({ label: 'resistance R', min: 10, max: 50, step: 5, value: rs.R, fmt: (v) => `${v} \u03a9`, onInput: (v) => ((rs.R = v), rShow()) }),
        ),
        rro,
      ),
    );
    rShow();

    root.append(
      callout('warn', 'RL is not RC', 'In RC, \u03c4 = RC: a bigger resistor makes things <b>slower</b>. In RL, \u03c4 = L/R: a bigger resistor makes things <b>faster</b> (and the final current smaller). And the roles flip at the moment of switching: a capacitor starts out acting like a plain wire and ends up blocking current; an inductor starts out blocking (zero current) and ends up acting like a plain wire.'),
      p('Now connect a charged capacitor to an inductor with no resistor. The capacitor starts to discharge through the coil, but the inductor slows the current\u2019s growth. By the time the capacitor is empty, the current is at its peak, and the inductor will not let it stop: it keeps pushing charge onto the other plate until the capacitor is charged the opposite way. Then it all runs back. The energy <b>sloshes</b> between the capacitor\u2019s electric field and the inductor\u2019s magnetic field, exactly like a mass trading spring energy for kinetic energy.'),
      equation({
        name: 'LC oscillation frequency',
        eq: '\u03c9 = <span class="frac"><span>1</span><span>\u221a(LC)</span></span>, &nbsp; f = <span class="frac"><span>\u03c9</span><span>2\u03c0</span></span>',
        says: 'Bigger L (more inertia) or bigger C (a softer spring) means slower oscillation. Because of the square root, quadrupling either one only halves the frequency.',
        terms: [
          ['\u03c9', 'angular frequency of the oscillation', 'rad/s'],
          ['L, C', 'inductance and capacitance', 'H, F'],
          ['f', 'frequency: oscillations per second', 'Hz'],
        ],
      }),
    );

    // LC live sandbox
    const lStage = h('div', { class: 'stage' });
    const ls = { L: LREF, C: CREF };
    const lro = readouts([['f', 'frequency f'], ['T', 'period']]);
    const lView = new PhysView(lStage, { height: 320, box: LBOX });
    const lState = { last: 0, tReal: 0, flow: 0 };
    const lShow = () => {
      lView.show({ draw: lcDraw, p: { ...ls }, box: LBOX, live: true, state: lState }, { animate: false });
      const T = realPeriod(ls.L, ls.C);
      lro.set({ f: `${num(1 / T / 1000)} kHz`, T: `${num(T * 1000)} ms` });
    };
    root.append(
      figure(
        {
          title: 'An LC circuit and its mechanical twin',
          note: `Left: the circuit, with charge on the plates, the E field between them (orange), and current dots; the purple arrow is the coil\u2019s B field. Middle: the energy in each field. Right: a mass on a spring moving in step (x \u2194 Q, v \u2194 I). Slowed down about ${num(SLOW, 2)} times at the starting values. A real circuit also has resistance, which makes the oscillation die away, like friction.`,
        },
        lStage,
        controlsRow(
          slider({ label: 'inductance L', min: 1, max: 9, step: 1, value: ls.L, fmt: (v) => `${v} mH`, onInput: (v) => ((ls.L = v), lShow()) }),
          slider({ label: 'capacitance C', min: 1, max: 9, step: 1, value: ls.C, fmt: (v) => `${v} \u03bcF`, onInput: (v) => ((ls.C = v), lShow()) }),
        ),
        lro,
      ),
    );
    lShow();

    root.append(
      callout('key', 'Two kinds of field energy, trading places', 'An LC circuit stores energy alternately in an <b>electric</b> field (\u00bdQ<sup>2</sup>/C, charge on the capacitor) and a <b>magnetic</b> field (\u00bdLI<sup>2</sup>, current in the coil). Charge is maximum when current is zero and vice versa, and the total stays constant.'),
      p('Two consequences. First, <b>tuning</b>: an LC circuit responds strongly only to signals near its own frequency, so turning a radio dial (changing C) picks one station out of all those in the air. With AC, inductors and capacitors act like frequency-dependent resistors ("reactance"): an inductor fights fast changes, a capacitor blocks slow ones. Second, and bigger: the LC circuit trades energy between an electric and a magnetic field. In empty space a changing E makes B and a changing B makes E directly, with no wires, and the pair travels: an <b>electromagnetic wave</b>, where the next chapter starts.'),
      checkpoint(quiz),
    );
  },
};
