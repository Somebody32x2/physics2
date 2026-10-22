import { h, p } from '../ui/dom.js';
import { Player } from '../ui/player.js';
import { PhysView } from '../core/phys-view.js';
import { figure, callout, segmented, toggle } from '../ui/figure.js';
import { checkpoint } from '../ui/quiz.js';
import { equation, eq, readouts } from '../ui/controls.js';
import { bulbCircuit, ladder, LADDER, twoLoop, TWO_LOOP } from '../model/circuits.js';
import { flowDots, num, pickBox } from './circuit-kit.js';

const FLOW = 50; // dot speed, px/s per amp

// ---------- figure 1: bulbs ----------
const BULB = { emf: 12, Rb: 12 };
const yT = 50;
const yB = 230;
/** Geometry of each bulb circuit: bulb positions and wire paths with the bulb whose current they carry ('tot' = battery). */
function bulbLayout(mode) {
  const bat = [[70, yB], [70, yT]];
  if (mode === 'alone' || mode === 'series') {
    const bulbs = mode === 'alone' ? { A: [320, yT] } : { A: [240, yT], B: [420, yT] };
    return { bulbs, paths: [{ pts: [[70, yB], [70, yT], [570, yT], [570, yB], [70, yB]], I: 'tot' }], nodes: [] };
  }
  if (mode === 'parallel') {
    return {
      bulbs: { A: [320, 140], B: [500, 140] },
      paths: [
        { pts: [[320, yB], [70, yB], [70, yT], [320, yT]], I: 'tot' },
        { pts: [[320, yT], [320, yB]], I: 'A' },
        { pts: [[320, yT], [500, yT], [500, yB], [320, yB]], I: 'B' },
      ],
      nodes: [[320, yT], [320, yB]],
    };
  }
  return {
    bulbs: { A: [210, yT], B: [370, 140], C: [530, 150] },
    paths: [
      { pts: [[370, yB], [70, yB], [70, yT], [370, yT]], I: 'tot' },
      { pts: [[370, yT], [370, yB]], I: 'B' },
      { pts: [[370, yT], [530, yT], [530, yB], [370, yB]], I: 'C' },
    ],
    nodes: [[370, yT], [370, yB]],
    sw: [[530, yT + 14], [530, yT + 54]],
  };
}
function bulbDraw(d, p, t) {
  const L = bulbLayout(p.mode);
  const r = bulbCircuit(p.mode, { ...BULB, closed: !!p.closed });
  const Iof = (k) => (k === 'tot' ? r.Itotal : r.I[k]);
  for (const path of L.paths) d.wire(path.pts);
  if (L.sw) {
    // cut the wire for the switch: redraw that stretch as a switch over a surface-colored gap
    d.line(L.sw[0][0], L.sw[0][1], L.sw[1][0], L.sw[1][1], { style: '--c: var(--surface); --w: 5' });
    d.switch(L.sw[0][0], L.sw[0][1], L.sw[1][0], L.sw[1][1], { closed: !!p.closed, id: p.pick ? null : 'sw' });
    d.text(L.sw[0][0] + 22, (L.sw[0][1] + L.sw[1][1]) / 2, 'S', { serif: true, anchor: 'start' });
  }
  d.battery(70, yB, 70, yT, {});
  d.text(90, 140, `${BULB.emf} V`, { serif: true, anchor: 'start' });
  for (const [x, y] of L.nodes) d.node(x, y);
  if (!p.pick) for (const path of L.paths) flowDots(d, path.pts, Iof(path.I) * FLOW * t);
  for (const [k, [x, y]] of Object.entries(L.bulbs)) {
    const P = r.P[k];
    d.bulb(x, y, { r: 13, glow: p.pick && !p.show ? 0 : Math.min(1, P / (BULB.emf ** 2 / BULB.Rb)) });
    if (p.pick) pickBox(d, x, y, 50, 50, `bulb${k}`);
    const top = y === yT;
    d.text(top ? x : x + 26, top ? y + 34 : y - 9, k, { serif: true, anchor: top ? 'middle' : 'start' });
    if (!p.pick || p.show) d.text(top ? x : x + 26, top ? y + 52 : y + 10, `${num(P, 3)} W`, { cls: 'ph-label', anchor: top ? 'middle' : 'start' });
  }
}

// ---------- figure 2: reducing a ladder network ----------
const LD = ladder();
function hi(d, x, y, w, hgt) {
  d.rect(x - w / 2, y - hgt / 2, w, hgt, { fill: true, rx: 10, style: '--c: var(--t4); --fo: 0.16', w: 1.2, dash: '4 3' });
}
function ladderDraw(d, p) {
  const top = 60;
  const bot = 240;
  const st = p.stage;
  const R = (sym, val) => `${sym} = ${num(val)} \u03a9`;
  d.battery(60, bot, 60, top, {});
  d.text(78, 150, `${LADDER.emf} V`, { serif: true, anchor: 'start' });
  if (st <= 1 || st === 5) {
    if (st === 1) hi(d, 330, 150, 46, 170);
    d.resistor(60, top, 330, top, {});
    d.resistor(330, top, 330, 150, {});
    d.resistor(330, 150, 330, bot, {});
    d.resistor(520, top, 520, bot, {});
    d.wire([[330, top], [520, top]]);
    d.wire([[520, bot], [60, bot]]);
    d.node(330, top);
    d.node(330, bot);
    const lab = st === 5;
    d.text(195, top - 22, R('R<sub>1</sub>', LADDER.R1), { serif: true });
    d.text(352, 105, R('R<sub>2</sub>', LADDER.R2), { serif: true, anchor: 'start' });
    d.text(352, 195, R('R<sub>3</sub>', LADDER.R3), { serif: true, anchor: 'start' });
    d.text(542, 150, R('R<sub>4</sub>', LADDER.R4), { serif: true, anchor: 'start' });
    if (lab) {
      const I = LD.I;
      const dr = LD.drop;
      d.arrow(120, top + 18, 160, top + 18, { cls: 'ph-I', w: 2 });
      d.text(195, top + 18, `${num(I.R1)} A`, { cls: 'ph-I' });
      d.text(195, top + 38, `${num(dr.R1)} V`, { cls: 'ph-label' });
      d.arrow(312, 86, 312, 120, { cls: 'ph-I', w: 2 });
      d.text(300, 103, `${num(I.R2)} A`, { cls: 'ph-I', anchor: 'end' });
      d.text(352, 123, `${num(dr.R2)} V`, { cls: 'ph-label', anchor: 'start' });
      d.text(352, 213, `${num(dr.R3)} V`, { cls: 'ph-label', anchor: 'start' });
      d.arrow(502, 110, 502, 144, { cls: 'ph-I', w: 2 });
      d.text(490, 127, `${num(I.R4)} A`, { cls: 'ph-I', anchor: 'end' });
      d.text(542, 168, `${num(dr.R4)} V`, { cls: 'ph-label', anchor: 'start' });
    }
  } else if (st === 2) {
    hi(d, 330, 150, 46, 120);
    hi(d, 520, 150, 46, 120);
    d.resistor(60, top, 330, top, {});
    d.resistor(330, top, 330, bot, {});
    d.resistor(520, top, 520, bot, {});
    d.wire([[330, top], [520, top]]);
    d.wire([[520, bot], [60, bot]]);
    d.node(330, top);
    d.node(330, bot);
    d.text(195, top - 22, R('R<sub>1</sub>', LADDER.R1), { serif: true });
    d.text(352, 150, R('R<sub>23</sub>', LD.R23), { serif: true, anchor: 'start' });
    d.text(542, 150, R('R<sub>4</sub>', LADDER.R4), { serif: true, anchor: 'start' });
  } else {
    if (st === 3) {
      hi(d, 195, top, 90, 44);
      hi(d, 420, 150, 46, 90);
    }
    d.resistor(60, top, 330, top, { opacity: st === 4 ? 0.12 : 1 });
    if (st === 4) d.wire([[60, top], [420, top]]);
    else d.wire([[330, top], [420, top]]);
    d.resistor(420, top, 420, bot, {});
    d.wire([[420, bot], [60, bot]]);
    if (st === 3) {
      d.text(195, top - 22, R('R<sub>1</sub>', LADDER.R1), { serif: true });
      d.text(442, 150, R('R<sub>234</sub>', LD.R234), { serif: true, anchor: 'start' });
    } else {
      d.text(442, 150, R('R<sub>eq</sub>', LD.Req), { serif: true, anchor: 'start' });
      d.arrow(170, top + 18, 230, top + 18, { cls: 'ph-I', w: 2.2 });
      d.text(200, top + 38, `I = ${num(LADDER.emf / LD.Req)} A`, { cls: 'ph-I' });
    }
  }
}
function ladderFrames() {
  const f = (stage, caption) => ({ draw: ladderDraw, p: { stage }, box: [640, 270], caption });
  const I = LADDER.emf / LD.Req;
  return [
    f(0, 'A network with four resistors. To find the battery current, replace pieces by single equivalent resistors, one safe step at a time.'),
    f(1, `R<sub>2</sub> and R<sub>3</sub> are in <b>series</b>: one path, nothing branches off between them, so they carry the same current. Resistances add: ${LADDER.R2} + ${LADDER.R3} = <b>${num(LD.R23)} \u03a9</b>.`),
    f(2, `R<sub>23</sub> and R<sub>4</sub> are in <b>parallel</b>: both connect the same two nodes, so they share the same voltage. Reciprocals add: 1/${num(LD.R23)} + 1/${LADDER.R4} = 1/<b>${num(LD.R234)} \u03a9</b>. Smaller than either: a second path makes it easier for current.`),
    f(3, `R<sub>1</sub> and R<sub>234</sub> are now in series: ${LADDER.R1} + ${num(LD.R234)} = <b>${num(LD.Req)} \u03a9</b>.`),
    f(4, `One resistor left: I = \u2130/R<sub>eq</sub> = ${LADDER.emf}/${num(LD.Req)} = <b>${num(I)} A</b> out of the battery.`),
    f(5, `Now unfold. R<sub>1</sub> takes ${num(I)} A, so it drops ${num(LD.drop.R1)} V, leaving <b>${num(LD.drop.R4)} V</b> across the parallel part. R<sub>4</sub>: ${num(LD.drop.R4)}/${LADDER.R4} = ${num(LD.I.R4)} A. R<sub>2</sub>+R<sub>3</sub>: ${num(LD.drop.R4)}/${num(LD.R23)} = ${num(LD.I.R2)} A, split ${num(LD.drop.R2)} V + ${num(LD.drop.R3)} V. Check the junction: ${num(LD.I.R2)} + ${num(LD.I.R4)} = ${num(LD.I.R1)} A.`),
  ];
}

// ---------- figure 3: two loops, Kirchhoff's rules ----------
const TL = twoLoop();
const X = { l: 110, m: 330, r: 550 };
const TOP = 70;
const BOT = 270;
function loopArrow(d, cx, cy, r, o = {}) {
  const pts = [];
  for (let k = 0; k <= 270; k += 6) {
    const a = o.ccw ? -20 - k : 200 + k;
    pts.push([cx + r * Math.cos((a * Math.PI) / 180), cy + r * Math.sin((a * Math.PI) / 180)]);
  }
  const g = d.group({ style: '--c: var(--t4)', opacity: o.opacity });
  g.poly(pts, { w: 2 });
  const [ax, ay] = pts[pts.length - 2];
  const [bx, by] = pts[pts.length - 1];
  g.arrow(ax, ay, bx + (bx - ax) * 0.8, by + (by - ay) * 0.8, { head: 10, w: 0.01 });
  return g;
}
function twoDraw(d, p, t) {
  const { emf1, emf2, R1, R2, R3 } = TWO_LOOP;
  d.battery(X.l, BOT, X.l, TOP, {});
  d.battery(X.r, BOT, X.r, TOP, {});
  d.resistor(X.l, TOP, X.m, TOP, {});
  d.resistor(X.r, TOP, X.m, TOP, {});
  d.resistor(X.m, TOP, X.m, BOT, {});
  d.wire([[X.l, BOT], [X.r, BOT]]);
  d.node(X.m, TOP);
  d.node(X.m, BOT);
  d.text(X.l + 18, 246, `\u2130<sub>1</sub> = ${emf1} V`, { serif: true, anchor: 'start' });
  d.text(X.r + 18, 170, `\u2130<sub>2</sub> = ${emf2} V`, { serif: true, anchor: 'start' });
  d.text((X.l + X.m) / 2, TOP + 26, `R<sub>1</sub> = ${R1} \u03a9`, { serif: true });
  d.text((X.r + X.m) / 2, TOP + 26, `R<sub>2</sub> = ${R2} \u03a9`, { serif: true });
  d.text(X.m + 22, 170, `R<sub>3</sub> = ${R3} \u03a9`, { serif: true, anchor: 'start' });
  // guessed current directions
  const sol = p.solved > 0.5;
  const lab = (k, v) => (sol ? `I<sub>${k}</sub> = ${num(v)} A` : `I<sub>${k}</sub>`);
  d.arrow(150, TOP - 16, 190, TOP - 16, { cls: 'ph-I', w: 2.2 });
  d.text(170, TOP - 34, lab(1, TL.I1), { cls: 'ph-I', serif: true });
  d.arrow(510, TOP - 16, 470, TOP - 16, { cls: 'ph-I', w: 2.2 });
  d.text(490, TOP - 34, lab(2, TL.I2), { cls: 'ph-I', serif: true });
  d.arrow(X.m - 16, 104, X.m - 16, 140, { cls: 'ph-I', w: 2.2 });
  d.text(X.m - 26, 122, lab(3, TL.I3), { cls: 'ph-I', serif: true, anchor: 'end' });
  // junction
  if (p.jn > 0.01) {
    d.circle(X.m, TOP, 12, { style: '--c: var(--t4)', w: 2, opacity: p.jn });
    d.text(X.m, TOP - 32, 'I<sub>1</sub> + I<sub>2</sub> = I<sub>3</sub>', { serif: true, style: '--c: var(--t4)', opacity: p.jn, halo: true });
  }
  // loops
  if (p.L > 0.01) {
    loopArrow(d, 220, 190, 34, { opacity: p.L });
    d.text(220, BOT + 30, `+${emf1} \u2212 ${R1}I<sub>1</sub> \u2212 ${R3}I<sub>3</sub> = 0`, { serif: true, style: '--c: var(--t4)', opacity: p.L });
  }
  if (p.R > 0.01) {
    loopArrow(d, 440, 190, 34, { opacity: p.R, ccw: true });
    d.text(440, BOT + 30, `+${emf2} \u2212 ${R2}I<sub>2</sub> \u2212 ${R3}I<sub>3</sub> = 0`, { serif: true, style: '--c: var(--t4)', opacity: p.R });
  }
  if (p.solved > 0.01) {
    const g = d.group({ opacity: p.solved });
    flowDots(g, [[X.m, BOT], [X.l, BOT], [X.l, TOP], [X.m, TOP]], TL.I1 * FLOW * t);
    flowDots(g, [[X.m, BOT], [X.r, BOT], [X.r, TOP], [X.m, TOP]], TL.I2 * FLOW * t);
    flowDots(g, [[X.m, TOP], [X.m, BOT]], TL.I3 * FLOW * t);
  }
}
function twoFrames() {
  const f = (q, caption) => ({ draw: twoDraw, p: { jn: 0, L: 0, R: 0, solved: 0, ...q }, box: [640, 310], live: true, caption });
  const { emf1, emf2, R1, R2, R3 } = TWO_LOOP;
  return [
    f({}, 'Two batteries and three branches: no pair of resistors is in series or in parallel, so reduction fails. Step 1: give each branch a current and <b>guess</b> its direction. A wrong guess is harmless; it just comes out negative.'),
    f({ jn: 1 }, '<b>Junction rule</b> (charge conservation): what flows into a node flows out. At the top node I<sub>1</sub> and I<sub>2</sub> arrive, I<sub>3</sub> leaves.'),
    f({ jn: 0.35, L: 1 }, `<b>Loop rule</b> (energy conservation) on the left loop, walking clockwise: up through \u2130<sub>1</sub> from \u2212 to + is <b>+${emf1}</b>; through R<sub>1</sub> along I<sub>1</sub> is <b>\u2212${R1}I<sub>1</sub></b>; down R<sub>3</sub> along I<sub>3</sub> is <b>\u2212${R3}I<sub>3</sub></b>. The sum is zero.`),
    f({ jn: 0.35, L: 0.35, R: 1 }, `Right loop, walking counterclockwise so we again go with the guessed currents: +${emf2} \u2212 ${R2}I<sub>2</sub> \u2212 ${R3}I<sub>3</sub> = 0. Three equations, three unknowns.`),
    f({ solved: 1 }, `Solve: <b>I<sub>1</sub> = ${num(TL.I1)} A, I<sub>2</sub> = ${num(TL.I2)} A, I<sub>3</sub> = ${num(TL.I3)} A</b>. Check: ${num(TL.I1)} + (${num(TL.I2)}) = ${num(TL.I3)}. The dots move at a speed proportional to each current.`),
    f({ solved: 1 }, `I<sub>2</sub> is <b>negative</b>, so it really flows the other way: down through \u2130<sub>2</sub> from + to \u2212. The ${emf1} V battery is <b>charging</b> the ${emf2} V one, which absorbs ${num(-TL.I2 * emf2)} W.`),
  ];
}

// ---------- quiz ----------
const QUIZ_LOOP = { emf1: 24, emf2: 9, R1: 3, R2: 3, R3: 4 };
const ql = twoLoop(QUIZ_LOOP);
const brightest = () => {
  const P = bulbCircuit('mixed', { ...BULB, closed: true }).P;
  return `bulb${['A', 'B', 'C'].reduce((m, k) => (P[k] > P[m] ? k : m), 'A')}`;
};
const mixOpen = bulbCircuit('mixed', { ...BULB, closed: false });
const mixShut = bulbCircuit('mixed', { ...BULB, closed: true });

const quiz = [
  {
    type: 'pick',
    id: 'dc-circuits.brightest',
    prompt: 'Three identical bulbs: A in series with the parallel pair B, C. Click the <b>brightest</b> bulb.',
    View: PhysView,
    view: { height: 260, box: [640, 252] },
    build: () => ({
      frame: { draw: bulbDraw, p: { mode: 'mixed', closed: 1, pick: 1, show: 0 }, box: [640, 252] },
      answer: [brightest()],
      after: { draw: bulbDraw, p: { mode: 'mixed', closed: 1, pick: 1, show: 1 }, box: [640, 252] },
    }),
    explain: `All the current passes through A (${num(mixShut.I.A, 3)} A), then splits equally between B and C (${num(mixShut.I.B, 3)} A each). Brightness is power I\u00b2R with the same R, so A gets 4\u00d7 the power of B or C: ${num(mixShut.P.A, 3)} W vs ${num(mixShut.P.B, 3)} W.`,
  },
  {
    type: 'mcq',
    id: 'dc-circuits.close-switch',
    prompt: 'Same circuit, but C\u2019s switch starts <b>open</b>, so A and B are simply in series. You close the switch. What happens?',
    choices: ['A gets brighter, B gets dimmer', 'Nothing changes for A and B; C has its own branch', 'A and B both get dimmer: the current is shared by more bulbs', 'A stays the same, B gets dimmer'],
    answer: 0,
    explain: `Closing the switch puts C in parallel with B, which <b>lowers</b> the total resistance from ${num(mixOpen.Req)} to ${num(mixShut.Req)} \u03a9. More current leaves the battery (${num(mixOpen.Itotal, 3)} \u2192 ${num(mixShut.Itotal, 3)} A), all through A: A goes from ${num(mixOpen.P.A, 3)} to ${num(mixShut.P.A, 3)} W. A takes a bigger share of the 12 V, so the voltage across B drops and B goes from ${num(mixOpen.P.B, 3)} to ${num(mixShut.P.B, 3)} W.`,
  },
  {
    type: 'input',
    id: 'dc-circuits.i3',
    prompt: `Same layout as the two-loop figure, new values: \u2130<sub>1</sub> = ${QUIZ_LOOP.emf1} V, \u2130<sub>2</sub> = ${QUIZ_LOOP.emf2} V, R<sub>1</sub> = ${QUIZ_LOOP.R1} \u03a9, R<sub>2</sub> = ${QUIZ_LOOP.R2} \u03a9, R<sub>3</sub> = ${QUIZ_LOOP.R3} \u03a9. What is the current through R<sub>3</sub>, in amps?`,
    accept: (t) => Math.abs(parseFloat(t) - ql.I3) < 0.05,
    placeholder: 'A',
    explain: `Left loop: ${QUIZ_LOOP.emf1} \u2212 ${QUIZ_LOOP.R1}I<sub>1</sub> \u2212 ${QUIZ_LOOP.R3}I<sub>3</sub> = 0. Right loop: ${QUIZ_LOOP.emf2} \u2212 ${QUIZ_LOOP.R2}I<sub>2</sub> \u2212 ${QUIZ_LOOP.R3}I<sub>3</sub> = 0. Junction: I<sub>3</sub> = I<sub>1</sub> + I<sub>2</sub>. Solving: I<sub>1</sub> = ${num(ql.I1)} A, I<sub>2</sub> = ${num(ql.I2)} A, <b>I<sub>3</sub> = ${num(ql.I3)} A</b>. Shortcut: the top node sits at V = I<sub>3</sub>R<sub>3</sub> = ${num(ql.Vtop)} V, and (${QUIZ_LOOP.emf1} \u2212 ${num(ql.Vtop)})/${QUIZ_LOOP.R1} + (${QUIZ_LOOP.emf2} \u2212 ${num(ql.Vtop)})/${QUIZ_LOOP.R2} = ${num(ql.Vtop)}/${QUIZ_LOOP.R3}.`,
  },
  {
    type: 'mcq',
    id: 'dc-circuits.meters',
    prompt: 'You want to measure the <b>current</b> through a resistor in a working circuit. How do you connect the ammeter?',
    choices: ['In series: break the circuit and let the current pass through the meter', 'In parallel, across the resistor, like a voltmeter', 'Either way gives the same reading', 'Across the battery terminals'],
    answer: 0,
    explain: 'An ammeter counts the charge flowing <b>through</b> it, so the current must pass through it: in series. Ideal ammeters have almost zero resistance, so connecting one in parallel would short out the resistor (and, across a battery, draw a huge current). Voltmeters are the opposite: huge resistance, connected in parallel across the element.',
  },
];

export default {
  id: 'dc-circuits',
  title: 'DC circuits',
  group: 'Circuits',
  blurb: 'Series and parallel, Kirchhoff\u2019s two rules, and the bulb-brightness questions every exam asks.',
  quiz,
  render(root) {
    root.append(
      p('A circuit is a network of batteries and resistors joined by wires. "Solving" it means finding the current in every branch and the voltage across every element. Two arrangements cover most simple circuits. In <b>series</b>, elements sit one after another on a single path: the <b>same current</b> flows through each, and their voltages add up to the total. In <b>parallel</b>, elements connect across the same two nodes: they share the <b>same voltage</b>, and their currents add up to the total.'),
      equation({
        name: 'Equivalent resistance',
        eq: 'R<sub>series</sub> = R<sub>1</sub> + R<sub>2</sub> + \u2026 \u2003\u2003 <span class="frac"><span>1</span><span>R<sub>parallel</sub></span></span> = <span class="frac"><span>1</span><span>R<sub>1</sub></span></span> + <span class="frac"><span>1</span><span>R<sub>2</sub></span></span> + \u2026',
        says: 'Series makes the path longer, so resistance adds and R<sub>eq</sub> is bigger than any one piece. Parallel adds lanes, so R<sub>eq</sub> is <b>smaller than the smallest</b> branch. Two equal resistors in parallel give half of one.',
        terms: [
          ['R<sub>eq</sub>', 'the single resistor that draws the same current from the same battery', '\u03a9'],
          ['R<sub>1</sub>, R<sub>2</sub>', 'the individual resistors', '\u03a9'],
        ],
      }),
      p('Light bulbs make this visible. Treat each bulb as a resistor; its brightness is the power it dissipates, ' + eq('P = I<sup>2</sup>R = V<sup>2</sup>/R') + '. With identical bulbs, brightness ranks the same as the current through each (or the voltage across each). The battery here is ideal: 12 V no matter what you connect.'),
    );

    // bulbs figure
    const stage = h('div', { class: 'stage' });
    const st = { mode: 'alone', closed: true };
    const ro = readouts([['I', 'battery current'], ['R', 'R<sub>eq</sub>'], ['P', 'total power']]);
    let redraw;
    const view = new PhysView(stage, { height: 280, box: [640, 252], onPick: (id) => id === 'sw' && st.mode === 'mixed' && swChip.click() });
    const swChip = toggle('Switch S closed', true, (v) => ((st.closed = v), redraw()));
    redraw = () => {
      view.show({ draw: bulbDraw, p: { mode: st.mode, closed: st.closed ? 1 : 0 }, box: [640, 252], live: true }, { animate: false });
      swChip.style.display = st.mode === 'mixed' ? '' : 'none';
      const r = bulbCircuit(st.mode, { ...BULB, closed: st.closed });
      ro.set({ I: `${num(r.Itotal, 3)} A`, R: `${num(r.Req, 3)} \u03a9`, P: `${num(r.Itotal * BULB.emf, 3)} W` });
    };
    root.append(
      figure(
        {
          title: 'Bulbs on a 12 V battery',
          tools: [
            segmented(
              [{ value: 'alone', label: 'One bulb' }, { value: 'series', label: 'Series' }, { value: 'parallel', label: 'Parallel' }, { value: 'mixed', label: 'A + (B\u2016C)' }],
              'alone',
              (m) => ((st.mode = m), redraw()),
              { label: 'circuit' },
            ),
            swChip,
          ],
          note: 'Identical 12 \u03a9 bulbs; glow and the number under each bulb are its power. Teal dots move at a speed proportional to the current in that wire. In the last circuit, click the switch (or the chip) to open and close C\u2019s branch.',
        },
        stage,
        ro,
      ),
    );
    redraw();

    const ser = bulbCircuit('series', BULB);
    const par = bulbCircuit('parallel', BULB);
    root.append(
      p(`Adding a second bulb in <b>series</b> doubles the resistance, halves the current, and each bulb gets a quarter of the power (${num(ser.P.A)} W instead of 12 W). Adding it in <b>parallel</b> leaves the first bulb exactly as bright: it still has the full 12 V across it. The battery simply supplies twice the current (${num(par.Itotal)} A) and twice the power. That is how the outlets in your house are wired.`),
      callout('key', 'Series shares current, parallel shares voltage', 'Elements on one path carry the <b>same current</b> and split the voltage. Elements across the same two nodes have the <b>same voltage</b> and split the current. Every reduction step starts by deciding which of the two you are looking at, and only then do you add R or 1/R.'),
      p('With those rules, many networks collapse to a single resistor. Find a pair that is cleanly in series or in parallel, replace it, and repeat; then work back out to get each branch.'),
    );
    const lhost = h('div');
    root.append(figure({ title: 'Reducing a network', note: 'The dashed highlight marks the pair being combined.' }, lhost));
    new Player(lhost, { frames: ladderFrames(), View: PhysView, view: { height: 280 } });

    root.append(
      p('Some circuits do not reduce, typically when there is more than one battery. Then you use the two rules that always work, <b>Kirchhoff\u2019s rules</b>. They are not new physics, just two conservation laws written for circuits.'),
      equation({
        name: 'Kirchhoff\u2019s rules',
        eq: '\u03a3 I<sub>in</sub> = \u03a3 I<sub>out</sub> \u2003\u2003 \u03a3 \u0394V<sub>loop</sub> = 0',
        says: '<b>Junction rule:</b> charge does not pile up at a node, so the current in equals the current out. <b>Loop rule:</b> potential is a property of each point, so walking around any closed loop the rises and drops cancel (energy conservation for a charge that ends where it started).',
        terms: [
          ['+\u2130', 'crossing a battery from \u2212 to + (in the direction you walk)', 'V'],
          ['\u2212IR', 'crossing a resistor in the same direction as its current (going downhill)', 'V'],
          ['+IR', 'crossing a resistor against its current', 'V'],
        ],
      }),
    );
    const thost = h('div');
    root.append(figure({ title: 'Two loops, two rules', note: 'Arrows labeled I are the guessed directions; the circular arrows are the direction you walk each loop.' }, thost));
    new Player(thost, { frames: twoFrames(), View: PhysView, view: { height: 310 } });

    root.append(
      callout('warn', 'Classic mistakes', 'Sign errors in the loop rule: the sign of an IR term depends on whether you <b>walk with or against the current you labeled</b>, not on the direction of the loop. And when a current comes out negative, do not re-solve: the magnitude is right, it just flows the other way. Last, meters: an <b>ammeter</b> goes in series (current must pass through it), a <b>voltmeter</b> goes in parallel across the element.'),
      checkpoint(quiz),
    );
  },
};
