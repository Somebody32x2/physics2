import { h, p } from '../ui/dom.js';
import { Player } from '../ui/player.js';
import { PhysView } from '../core/phys-view.js';
import { figure, callout, toggle } from '../ui/figure.js';
import { checkpoint } from '../ui/quiz.js';
import { equation, eq, slider, controlsRow, readouts } from '../ui/controls.js';
import { wireState, resistance, RHO, filamentCurrent, powerV2R, seriesR } from '../model/circuits.js';
import { num, pickBox, seeded } from './circuit-kit.js';

// ---------- figure 1: electrons drifting in a wire (live sandbox) ----------
const DRIFT_PX = 40; // animation px/s per mm/s of real drift speed
const WIRE_PX_PER_M = 260; // drawn wire length per meter
const SPEEDUP = DRIFT_PX / (WIRE_PX_PER_M / 1000); // on-screen speed / real speed
function makeDriftDraw() {
  let phase = 0;
  let lastT = 0;
  const rnd = seeded(3);
  const jig = Array.from({ length: 400 }, () => [rnd() * 6.3, rnd() * 6.3, 0.7 + rnd() * 0.6]);
  return function driftDraw(d, p, t) {
    const dt = t - lastT;
    lastT = t;
    if (dt > 0 && dt < 0.2) phase += p.vd * DRIFT_PX * dt;
    const Lpx = WIRE_PX_PER_M * p.L;
    const hpx = 18 + 20 * p.A;
    const x0 = 320 - Lpx / 2;
    const x1 = 320 + Lpx / 2;
    const yc = 84;
    // circuit: battery under the wire, + on the left, so current runs left to right through the wire
    const yb = 186;
    d.wire([[x0, yc], [x0 - 26, yc], [x0 - 26, yb], [270, yb]]);
    d.wire([[x1, yc], [x1 + 26, yc], [x1 + 26, yb], [370, yb]]);
    d.battery(270, yb, 370, yb, { plus: 'a' });
    d.text(320, yb + 28, `V = ${num(p.V, 2)} V`, { serif: true });
    // the wire segment
    d.rect(x0, yc - hpx / 2, Lpx, hpx, { cls: 'ph-mute', fill: true, rx: hpx / 2, style: '--fo: 0.18' });
    const rows = Math.max(1, Math.floor((hpx - 6) / 11));
    const gap = 20;
    // fixed lattice ions
    for (let r = 0; r < rows; r++) {
      const y = yc - ((rows - 1) * 11) / 2 + r * 11;
      for (let x = x0 + 14; x < x1 - 8; x += gap) d.circle(x + (r % 2) * 10, y, 2.6, { cls: 'ph-mute', w: 1, opacity: 0.6 });
    }
    // electrons: drift left (against the current) plus fast thermal jiggle
    let k = 0;
    for (let r = 0; r < rows; r++) {
      const y = yc - ((rows - 1) * 11) / 2 + r * 11;
      const n = Math.floor((Lpx - 16) / gap);
      for (let i = 0; i < n; i++, k++) {
        const [a, b, s] = jig[k % jig.length];
        const base = i * gap + (r % 2) * 10;
        const span = n * gap;
        const x = x0 + 8 + ((((base - phase) % span) + span) % span);
        d.dot(x + 2.2 * Math.sin(9 * s * t + a), y + 1.8 * Math.sin(11 * s * t + b), { r: 3, cls: 'ph-neg' });
      }
    }
    // arrows: conventional current right, electron drift left
    d.arrow(320 - 50, yc - hpx / 2 - 20, 320 + 50, yc - hpx / 2 - 20, { cls: 'ph-I', w: 2.6 });
    d.text(320, yc - hpx / 2 - 38, `I = ${num(p.I, 3)} A`, { cls: 'ph-I', serif: true });
    d.arrow(320 + 40, yc + hpx / 2 + 16, 320 - 40, yc + hpx / 2 + 16, { cls: 'ph-v', w: 2 });
    d.text(320, yc + hpx / 2 + 34, 'electron drift', { cls: 'ph-v' });
  };
}

// ---------- figure 2: I vs V for two resistors and a bulb ----------
const OHM = { R1: 10, R2: 20, Vmax: 12 };
function ohmDraw(d, p) {
  const pl = d.plot({ x: 70, y: 28, w: 470, h: 220, xr: [0, OHM.Vmax], yr: [0, 1.3], yLabel: 'I (amps)', ticksX: [0, 3, 6, 9, 12].map((v) => [v, String(v)]), ticksY: [0, 0.4, 0.8, 1.2].map((v) => [v, String(v)]) });
  pl.fn((v) => v / OHM.R1, { cls: 'ph-plot' });
  pl.fn((v) => v / OHM.R2, { cls: 'ph-plot2' });
  pl.label(OHM.Vmax, OHM.Vmax / OHM.R1 + 0.07, `${OHM.R1} \u03a9`, { cls: 'ph-plot', anchor: 'end' });
  pl.label(OHM.Vmax + 0.15, OHM.Vmax / OHM.R2, `${OHM.R2} \u03a9`, { cls: 'ph-plot2', anchor: 'start' });
  if (p.bulb) {
    pl.fn((v) => filamentCurrent(v), { cls: 'ph-plot3', dash: '6 4' });
    pl.label(OHM.Vmax + 0.15, filamentCurrent(OHM.Vmax), 'bulb', { cls: 'ph-plot3', anchor: 'start' });
  }
  pl.vline(p.V);
  pl.dot(p.V, p.V / OHM.R1, { r: 5, cls: 'ph-plot' });
  pl.dot(p.V, p.V / OHM.R2, { r: 5, cls: 'ph-plot2' });
  if (p.bulb) pl.dot(p.V, filamentCurrent(p.V), { r: 5, cls: 'ph-plot3' });
  pl.label(OHM.Vmax, -0.2, 'V (volts)', { anchor: 'end' });
  pl.label(7, 0.12, 'steeper line = less resistance', { anchor: 'start' });
}

// ---------- figure 3: potential around a loop ----------
const LOOP = { emf: 12, R1: 4, R2: 2 };
const loopI = () => LOOP.emf / seriesR([LOOP.R1, LOOP.R2]);
// corners of the drawn loop: a (bottom left, battery -), b (top left), c (top right), d (bottom right)
const CORN = { a: [56, 270], b: [56, 70], c: [256, 70], d: [256, 270] };
const SEGS = [
  // [from, to, element, dV across the element], element body is the middle 40 px of the side
  ['a', 'b', 'bat', () => LOOP.emf],
  ['b', 'c', 'R1', () => -loopI() * LOOP.R1],
  ['c', 'd', 'R2', () => -loopI() * LOOP.R2],
  ['d', 'a', 'wire', () => 0],
];
const segLen = (s) => Math.hypot(CORN[s[1]][0] - CORN[s[0]][0], CORN[s[1]][1] - CORN[s[0]][1]);
const TOTAL = SEGS.reduce((a, s) => a + segLen(s), 0);
const BODY = 40;
/** Position on the drawn loop and potential there, for arc length u in [0, TOTAL]. */
function loopAt(u) {
  let V = 0;
  for (const s of SEGS) {
    const L = segLen(s);
    const dV = s[3]();
    if (u <= L) {
      const [ax, ay] = CORN[s[0]];
      const [bx, by] = CORN[s[1]];
      const k = u / L;
      const lo = (L - BODY) / 2;
      const f = Math.max(0, Math.min(1, (u - lo) / BODY));
      return { x: ax + (bx - ax) * k, y: ay + (by - ay) * k, V: V + dV * f };
    }
    u -= L;
    V += dV;
  }
  return { x: CORN.a[0], y: CORN.a[1], V };
}
const sAt = (k) => SEGS.slice(0, k).reduce((a, s) => a + segLen(s), 0) / TOTAL; // fraction at corner k

function loopCircuit(d, o = {}) {
  const { a, b, c, d: dd } = CORN;
  d.battery(a[0], a[1], b[0], b[1], {});
  d.resistor(b[0], b[1], c[0], c[1], {});
  d.resistor(c[0], c[1], dd[0], dd[1], {});
  d.wire([dd, a]);
  if (o.labels !== false) {
    d.text(a[0] + 24, (a[1] + b[1]) / 2, `\u2130 = ${LOOP.emf} V`, { anchor: 'start', serif: true });
    d.text((b[0] + c[0]) / 2, b[1] - 24, `R<sub>1</sub> = ${LOOP.R1} \u03a9`, { serif: true });
    d.text(c[0] + 22, (c[1] + dd[1]) / 2, `R<sub>2</sub> = ${LOOP.R2} \u03a9`, { serif: true, anchor: 'start' });
  }
}
function loopDraw(d, p) {
  loopCircuit(d);
  const pts = { a: [-14, 12], b: [-14, -12], c: [14, -12], d: [14, 12] };
  for (const [k, [dx, dy]] of Object.entries(pts)) d.text(CORN[k][0] + dx, CORN[k][1] + dy, k, { cls: 'ph-label', serif: true });
  d.arrow(118, 100, 194, 100, { cls: 'ph-I', w: 2.2 });
  d.text(156, 116, `I = ${num(loopI())} A`, { cls: 'ph-I' });
  // height profile
  const pl = d.plot({ x: 360, y: 46, w: 250, h: 210, xr: [0, 1], yr: [0, 13], yLabel: 'V (volts)', ticksY: [[0, '0'], [4, '4'], [8, '8'], [12, '12']] });
  ['a', 'b', 'c', 'd'].forEach((k, i) => pl.label(sAt(i), -1.2, k, { serif: true }));
  pl.label(1, -1.2, 'a', { serif: true });
  const N = 200;
  const curve = [];
  for (let i = 0; i <= N * p.s; i++) curve.push([i / N, loopAt((i / N) * TOTAL).V]);
  curve.push([p.s, loopAt(p.s * TOTAL).V]);
  pl.pts(curve, { cls: 'ph-plot2', w: 2.6 });
  const here = loopAt(p.s * TOTAL);
  pl.dot(p.s, here.V, { r: 5, cls: 'ph-pos' });
  d.charge(here.x, here.y, 1, { r: 9, size: 12 });
}
function loopFrames() {
  const I = loopI();
  const f = (s, caption) => ({ draw: loopDraw, p: { s }, box: [640, 300], caption });
  return [
    f(0, 'Start at <b>a</b>, the battery\u2019s \u2212 terminal, and call its potential 0 V. A + test charge will walk once around the loop in the direction of the current.'),
    f(sAt(1), `Through the battery from \u2212 to +: the potential <b>rises by \u2130 = ${LOOP.emf} V</b>. The battery is the pump: it uses chemical energy to lift charge to a higher potential.`),
    f(sAt(2), `The wire is flat (ideal wires have no resistance). Then across R<sub>1</sub> the potential <b>drops by IR<sub>1</sub> = ${num(I)} \u00d7 ${LOOP.R1} = ${num(I * LOOP.R1)} V</b>: the charge gives up energy as heat.`),
    f(sAt(3), `Across R<sub>2</sub> it drops another <b>IR<sub>2</sub> = ${num(I * LOOP.R2)} V</b>, down to ${num(LOOP.emf - I * (LOOP.R1 + LOOP.R2))} V.`),
    f(1, `Back at a: +${LOOP.emf} \u2212 ${num(I * LOOP.R1)} \u2212 ${num(I * LOOP.R2)} = <b>0</b>. Every rise is paid back by drops, which fixes the current: I = \u2130/(R<sub>1</sub> + R<sub>2</sub>) = ${num(I)} A.`),
  ];
}

// ---------- quiz ----------
const pickPotential = (show) => ({
  draw: (d) => {
    loopCircuit(d);
    d.arrow(118, 100, 194, 100, { cls: 'ph-I', w: 2.2 });
    const V = { a: 0, b: LOOP.emf, c: LOOP.emf - loopI() * LOOP.R1, d: 0 };
    for (const k of ['a', 'b', 'c', 'd']) {
      const [x, y] = CORN[k];
      d.dot(x, y, { r: 4.5, cls: 'ph-wire' });
      pickBox(d, x, y, 34, 34, `pt-${k}`);
      const dx = k === 'a' || k === 'b' ? -26 : 26;
      d.text(x + dx, y + (k === 'a' || k === 'd' ? 16 : -16), show ? `${k}: ${num(V[k])} V` : k, { serif: true, anchor: dx < 0 ? 'end' : 'start', cls: show ? 'ph-label' : '' });
    }
  },
  p: {},
  box: [380, 320],
});
const highest = () => {
  const V = { a: 0, b: LOOP.emf, c: LOOP.emf - loopI() * LOOP.R1, d: 0 };
  return `pt-${Object.keys(V).reduce((m, k) => (V[k] > V[m] ? k : m), 'a')}`;
};
const bulbR = powerV2R(120, 1) / 60; // R = V^2 / P for 60 W at 120 V
const wireFactor = resistance(RHO.copper, 2, 4) / resistance(RHO.copper, 1, 1);

const quiz = [
  {
    type: 'mcq',
    id: 'current.drift-direction',
    prompt: 'Conventional current in a copper wire points to the <b>right</b>. What are the electrons doing?',
    choices: ['Moving right, close to the speed of light', 'Drifting left, about a millimeter per second or slower', 'Drifting right, about a millimeter per second', 'Not moving; only the field moves'],
    answer: 1,
    explain: 'Conventional current is the direction <i>positive</i> charge would flow. In metals the carriers are electrons, which are negative, so they drift the <b>opposite</b> way. And slowly: a few amps in a household wire is a drift of well under a millimeter per second. What travels fast is the field that sets them all moving at once.',
  },
  {
    type: 'input',
    id: 'current.wire-factor',
    prompt: 'You replace a wire with one of the same metal that is <b>twice as long</b> and has <b>twice the diameter</b>. Its resistance is multiplied by what?',
    accept: (t) => Math.abs(parseFloat(t.replace('\u00bd', '0.5').replace('1/2', '0.5')) - wireFactor) < 0.01,
    placeholder: 'factor',
    explain: `R = \u03c1L/A. Doubling L doubles R. Doubling the <b>diameter</b> multiplies the area by 2\u00b2 = 4, which divides R by 4. Net: 2/4 = ${wireFactor}.`,
  },
  {
    type: 'input',
    id: 'current.bulb-r',
    prompt: 'A bulb is rated <b>60 W at 120 V</b>. What is its resistance when lit, in ohms?',
    answers: [String(bulbR)],
    placeholder: '\u03a9',
    explain: `Know P and V, want R: use P = V\u00b2/R, so R = V\u00b2/P = 120\u00b2/60 = ${bulbR} \u03a9. (The current is I = P/V = ${num(60 / 120)} A.)`,
  },
  {
    type: 'pick',
    id: 'current.highest-v',
    prompt: 'Current flows clockwise around this loop. Click the point at the <b>highest potential</b>.',
    View: PhysView,
    view: { height: 300, box: [380, 320] },
    build: () => ({ frame: pickPotential(false), answer: [highest()], after: pickPotential(true) }),
    explain: `Potential is highest right after the pump: at b, the battery\u2019s + terminal, ${LOOP.emf} V. Current flows from high to low potential through each resistor, so c (after R<sub>1</sub>) is lower, at ${num(LOOP.emf - loopI() * LOOP.R1)} V, and d is back down to 0, the same as a since only wire joins them.`,
  },
];

export default {
  id: 'current',
  title: 'Current & resistance',
  group: 'Circuits',
  blurb: 'What flows in a wire, how fast, what resists it, and where the energy goes.',
  quiz,
  render(root) {
    root.append(
      p('So far the charges sat still. Connect a battery across a wire and they move: the battery sets up an electric field inside the conductor, and the free electrons respond. The flow of charge is <b>current</b>, the amount of charge passing a point per second.'),
      p('Two conventions trip people up here. Current direction is defined as the way <b>positive</b> charge would move: out of the battery\u2019s + terminal, through the circuit, into its \u2212 terminal. In a metal the moving charges are electrons, so they actually go the <b>other way</b>. Nothing in circuit analysis cares; just never mix the two in one problem. Second, the electrons move absurdly slowly, typically well under a millimeter per second. The light comes on instantly because the field travels through the wire at nearly light speed and starts every electron in the circuit moving at once.'),
      equation({
        name: 'Current',
        eq: 'I = <span class="frac"><span>dQ</span><span>dt</span></span>',
        says: 'Current is the rate at which charge flows past a point. Same idea as gallons per minute in a pipe. One amp is one coulomb every second (about 6 \u00d7 10<sup>18</sup> electrons).',
        terms: [
          ['I', 'current, in the direction + charge would move', 'A = C/s'],
          ['dQ/dt', 'charge crossing a cross-section per unit time', ''],
        ],
      }),
    );

    // drift sandbox
    const stage = h('div', { class: 'stage' });
    const view = new PhysView(stage, { height: 260, box: [640, 236] });
    const driftDraw = makeDriftDraw();
    const st = { V: 0.1, L: 1.5, A: 1.5 };
    const ro = readouts([['R', 'R = \u03c1L/A'], ['I', 'I = V/R'], ['vd', 'drift speed'], ['cross', 'time to cross the wire'], ['P', 'P = IV']]);
    const redraw = () => {
      const s = wireState({ V: st.V, L: st.L, A: st.A * 1e-6 });
      view.show({ draw: driftDraw, p: { ...st, I: s.I, vd: s.vd * 1000 }, box: [640, 236], live: true }, { animate: false });
      ro.set({ R: `${num(s.R * 1000, 3)} m\u03a9`, I: `${num(s.I, 3)} A`, vd: `${num(s.vd * 1000, 2)} mm/s`, cross: s.vd > 0 ? `${num(st.L / s.vd / 60, 2)} min` : '\u221e', P: `${num(s.P, 3)} W` });
    };
    root.append(
      figure(
        { title: 'Inside a copper wire', note: `Blue dots are free electrons; grey rings are the fixed copper ions. The electrons jiggle fast in random directions (thermal motion) and drift slowly to the left. The drift is drawn about ${Math.round(SPEEDUP / 10) * 10} times faster than real; the readouts are real. Try: widen the wire. The current grows, the drift speed does not: there are just more lanes.` },
        stage,
        controlsRow(
          slider({ label: 'Voltage V', min: 0, max: 0.2, step: 0.01, value: st.V, fmt: (v) => `${v.toFixed(2)} V`, onInput: (v) => ((st.V = v), redraw()) }),
          slider({ label: 'Length L', min: 0.5, max: 2, step: 0.1, value: st.L, fmt: (v) => `${v.toFixed(1)} m`, onInput: (v) => ((st.L = v), redraw()) }),
          slider({ label: 'Area A', min: 0.5, max: 2.5, step: 0.1, value: st.A, fmt: (v) => `${v.toFixed(1)} mm\u00b2`, onInput: (v) => ((st.A = v), redraw()) }),
        ),
        ro,
      ),
    );
    redraw();

    root.append(
      p('Why do the electrons drift instead of accelerating forever? They keep colliding with the vibrating ions of the metal, which turns their gained kinetic energy into heat. The net effect is a steady drift speed proportional to the field, and a current proportional to the voltage. The ratio is the <b>resistance</b>, and for a plain wire it depends on the material and the shape the way you would guess for water in a pipe: longer is harder, wider is easier.'),
      equation({
        name: 'Ohm\u2019s law and resistance',
        eq: 'V = I R \u2003\u2003 R = <span class="frac"><span>\u03c1 L</span><span>A</span></span>',
        says: 'The voltage across a resistor equals current times resistance. R grows with length and shrinks with cross-sectional area; the material sets \u03c1. "Ohmic" means R stays constant as V changes, so I vs V is a straight line.',
        terms: [
          ['V', 'potential difference across the resistor', 'V'],
          ['R', 'resistance', '\u03a9 = V/A'],
          ['\u03c1', 'resistivity of the material (copper 1.7 \u00d7 10<sup>\u22128</sup>, nichrome 1.1 \u00d7 10<sup>\u22126</sup>)', '\u03a9\u00b7m'],
          ['L, A', 'length and cross-sectional area', 'm, m\u00b2'],
        ],
      }),
    );

    // Ohm plot
    const ostage = h('div', { class: 'stage' });
    const oview = new PhysView(ostage, { height: 300, box: [640, 292] });
    const os = { V: 6, bulb: false };
    const oro = readouts([['r1', `${OHM.R1} \u03a9`], ['r2', `${OHM.R2} \u03a9`], ['b', 'bulb']]);
    const oredraw = () => {
      oview.show({ draw: ohmDraw, p: { V: os.V, bulb: os.bulb ? 1 : 0 }, box: [640, 292] }, { animate: false });
      const row = (I) => `I = ${num(I, 2)} A, P = ${num(I * os.V, 2)} W`;
      oro.set({ r1: row(os.V / OHM.R1), r2: row(os.V / OHM.R2), b: os.bulb ? `I = ${num(filamentCurrent(os.V), 2)} A, R = ${os.V > 0 ? num(os.V / filamentCurrent(os.V), 2) : '\u2014'} \u03a9` : 'hidden' });
    };
    root.append(
      figure(
        {
          title: 'Ohm\u2019s law: current vs voltage',
          tools: [toggle('Show a light bulb', false, (v) => ((os.bulb = v), oredraw()))],
          note: 'Slope = 1/R: the 10 \u03a9 line is twice as steep as the 20 \u03a9 line. A bulb filament is <b>not</b> ohmic: it heats up as the current grows, its resistance rises, and the curve bends over.',
        },
        ostage,
        controlsRow(slider({ label: 'Voltage V', min: 0, max: 12, step: 0.5, value: os.V, fmt: (v) => `${v.toFixed(1)} V`, onInput: (v) => ((os.V = v), oredraw()) })),
        oro,
      ),
    );
    oredraw();

    root.append(
      p('Resistors turn electrical energy into heat (or light, in a bulb). Each coulomb that drops through a potential difference V gives up V joules, and I coulombs pass every second, so the power is IV. With Ohm\u2019s law you can trade either factor for R.'),
      equation({
        name: 'Power',
        eq: 'P = I V = I<sup>2</sup>R = <span class="frac"><span>V<sup>2</sup></span><span>R</span></span>',
        says: 'Power delivered to a resistor. Use the version whose inputs you know. Same current: bigger R gets more power (I\u00b2R). Same voltage: smaller R gets more power (V\u00b2/R). That is why a 100 W bulb has <i>less</i> resistance than a 60 W one.',
        terms: [
          ['P', 'rate of energy conversion (heat, light)', 'W = J/s'],
          ['I, V, R', 'current through, voltage across, resistance of the same element', 'A, V, \u03a9'],
        ],
      }),
      p('A battery\u2019s job is the opposite of a resistor\u2019s. Its <b>emf</b> ' + eq('\u2130') + ' (an old name, "electromotive force"; it is a voltage, not a force) is the energy per coulomb it gives to charge pushed from its \u2212 terminal to its + terminal. Think of it as a pump that lifts water up a hill; resistors are the paddle wheels the water turns on the way back down. Real batteries also have a small <b>internal resistance</b> r, so under load the voltage at their terminals is a bit less than \u2130: ' + eq('V<sub>terminal</sub> = \u2130 \u2212 Ir') + '.'),
    );

    const lhost = h('div');
    root.append(figure({ title: 'Potential around a loop', note: 'Right: the potential of the test charge as it walks around. Height is a good picture: the battery is a lift, resistors are slopes, wires are level floors.' }, lhost));
    new Player(lhost, { frames: loopFrames(), View: PhysView, view: { height: 300 } });

    root.append(
      callout('key', 'The water picture', 'Voltage is height, current is flow rate, resistance is how narrow the pipe is. The battery lifts charge up by \u2130; every resistor lets it fall; the total fall around any loop equals the lift. Current is not "used up" in a resistor: the same current comes out as went in. What gets used up is <b>potential energy</b>.'),
      callout('warn', 'Classic mistake', 'Thinking a battery supplies a fixed <b>current</b>. A battery supplies a (nearly) fixed <b>voltage</b>; the current depends on what you connect. Short it with a wire and the current is huge; connect a big resistor and it is tiny.'),
      checkpoint(quiz),
    );
  },
};
