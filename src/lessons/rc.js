import { h, p } from '../ui/dom.js';
import { Player } from '../ui/player.js';
import { PhysView } from '../core/phys-view.js';
import { figure, callout, segmented } from '../ui/figure.js';
import { checkpoint } from '../ui/quiz.js';
import { equation, eq, slider, controlsRow, readouts } from '../ui/controls.js';
import { tau, charging, discharging, chargedFraction, remainingFraction, rcSteadyState } from '../model/circuits.js';
import { flowDots, num, pickBox } from './circuit-kit.js';

// ---------- figure 1: live RC circuit + plots ----------
const EMF = 9;
const T_END = 20; // seconds shown on the plots
const R_RANGE = [2e3, 10e3];
const C_RANGE = [200e-6, 1000e-6];
const QMAX = EMF * C_RANGE[1];
const IMAX = EMF / R_RANGE[0];
const FLOW_TOTAL = 320; // px of dot travel for a full charge Q = C_max * emf

/** Circuit geometry: battery (left), two-way switch, R along the top, C on the right, bypass wire for discharging. */
const G = { bx: 50, top: 60, bot: 262, a: [86, 38], pivot: [124, 60], b: [86, 82], cx: 280, plateTop: 155, plateBot: 167 };
function rcCircuit(d, p, t, s) {
  const { bx, top, bot, a, pivot, b, cx } = G;
  const charge = p.mode === 'charge';
  d.battery(bx, bot, bx, a[1], { opacity: charge ? 1 : 0.45 });
  d.wire([[bx, a[1]], a], { opacity: charge ? 1 : 0.45 });
  d.wire([b, [b[0], bot]]);
  d.wire([[cx, bot], [bx, bot]]);
  d.node(b[0], bot);
  d.dot(...a, { r: 3, cls: 'ph-wire' });
  d.dot(...b, { r: 3, cls: 'ph-wire' });
  d.dot(...pivot, { r: 3, cls: 'ph-wire' });
  const to = charge ? a : b;
  d.line(pivot[0], pivot[1], to[0], to[1], { cls: 'ph-wire', w: 2.6 });
  d.resistor(pivot[0], top, cx, top, {});
  d.capacitor(cx, top, cx, bot, {});
  d.text(30, 182, `${EMF} V`, { serif: true, anchor: 'end', opacity: charge ? 1 : 0.45 });
  d.text((pivot[0] + cx) / 2, top - 28, `R = ${num(p.R / 1000)} k\u03a9`, { serif: true });
  d.text(cx - 24, 186, `C = ${num(p.C * 1e6)} \u03bcF`, { serif: true, anchor: 'end' });
  // charge on the plates: up to 5 signs, proportional to q
  const n = Math.round((5 * s.q) / QMAX);
  for (let i = 0; i < n; i++) {
    const x = cx - ((n - 1) * 7) / 2 + i * 7;
    d.text(x, G.plateTop - 9, '+', { cls: 'ph-pos', size: 12 });
    d.text(x, G.plateBot + 9, '\u2212', { cls: 'ph-neg', size: 12 });
  }
  d.text(cx - 24, 136, `V<sub>C</sub> = ${num(s.q / p.C, 2)} V`, { anchor: 'end', cls: 'ph-label' });
  // current dots: phase = charge that has flowed (so speed follows i = dq/dt)
  const phase = (FLOW_TOTAL * (s.q - p.q0)) / QMAX;
  const paths = charge
    ? [[[bx, bot], [bx, a[1]], a, pivot]]
    : [[[b[0], bot], b, pivot]];
  paths.push([pivot, [cx, top], [cx, G.plateTop - 2]], [[cx, G.plateBot + 2], [cx, bot], [b[0], bot]]);
  if (charge) paths.push([[b[0], bot], [bx, bot]]);
  // phase falls while discharging, so the dots run backward along the charging paths: off the + plate, back through R
  for (const path of paths) flowDots(d, path, phase, { gap: 20 });
}
function rcState(p, ts) {
  return p.mode === 'charge' ? { ...charging(ts, { R: p.R, C: p.C, emf: EMF }), q0: 0 } : { ...discharging(ts, { R: p.R, C: p.C, q0: p.C * EMF }), q0: p.C * EMF };
}
function rcDraw(d, p, t) {
  const ts = p.scrub >= 0 ? p.scrub : Math.min(t, T_END);
  const s = rcState(p, ts);
  rcCircuit(d, { ...p, q0: s.q0 }, t, s);
  const T = tau(p.R, p.C);
  const charge = p.mode === 'charge';
  const ticksX = [0, 5, 10, 15, 20].map((v) => [v, String(v)]);
  const qp = d.plot({ x: 400, y: 22, w: 215, h: 100, xr: [0, T_END], yr: [0, QMAX * 1000], yLabel: 'q (mC)', ticksY: [[0, '0'], [4.5, '4.5'], [9, '9']] });
  const fq = (x) => rcState(p, x).q * 1000;
  qp.fn(fq, { cls: 'ph-plot' });
  if (T <= T_END) qp.vline(T);
  qp.line(ts, 0, ts, QMAX * 1000, { cls: 'ph-axis', w: 1 });
  qp.dot(ts, fq(ts), { r: 5 });
  const yr = charge ? [0, IMAX * 1000] : [-IMAX * 1000, 0];
  const ip = d.plot({ x: 400, y: 172, w: 215, h: 100, xr: [0, T_END], yr, yLabel: charge ? 'i (mA)' : '', ticksX: charge ? ticksX : null, ticksY: charge ? [[0, '0'], [4.5, '4.5']] : [[0, '0'], [-4.5, '\u22124.5']] });
  if (!charge) ip.label(0.4, -IMAX * 1000 - 0.9, 'i (mA), reversed', { anchor: 'start' });
  const fi = (x) => rcState(p, x).i * 1000;
  ip.fn(fi, { cls: 'ph-plot2' });
  if (T <= T_END) {
    ip.vline(T);
    qp.label(T, -0.9, '\u03c4', { serif: true });
  }
  ip.line(ts, yr[0], ts, yr[1], { cls: 'ph-axis', w: 1 });
  ip.dot(ts, fi(ts), { r: 5, cls: 'ph-plot2' });
  d.text(620, charge ? 300 : 186, 't (s)', { cls: 'ph-label', anchor: 'end' });
}

// ---------- figure 2: what one time constant means ----------
function tauDraw(d, p) {
  const pl = d.plot({ x: 70, y: 26, w: 500, h: 210, xr: [0, 5.2], yr: [0, 1.05], ticksX: [1, 2, 3, 4, 5].map((v) => [v, `${v}\u03c4`]), ticksY: [[0, '0'], [0.5, '50%'], [1, '100%']] });
  pl.label(5.3, -0.1, 't', { serif: true, anchor: 'end' });
  pl.hline(1, { w: 1 });
  pl.fn((x) => chargedFraction(x), { cls: 'ph-plot', to: 5.2 });
  pl.fn((x) => remainingFraction(x), { cls: 'ph-plot2', to: 5.2, dash: '6 4' });
  pl.label(4.2, 0.9, 'q / C\u2130', { cls: 'ph-plot', serif: true });
  pl.label(4.2, 0.12, 'i / i<sub>0</sub>', { cls: 'ph-plot2', serif: true });
  for (const k of [1, 2, 3, 5]) {
    if (p.n < k - 0.02) continue;
    const f = chargedFraction(k);
    pl.dot(k, f, { r: 4.5 });
    pl.dot(k, remainingFraction(k), { r: 4, cls: 'ph-plot2' });
    pl.label(k, f - 0.08, `${(100 * f).toFixed(1)}%`, { cls: 'ph-plot', anchor: 'start', halo: true });
  }
  pl.line(p.n, 0, p.n, 1.05, { cls: 'ph-axis', w: 1 });
  pl.dot(p.n, chargedFraction(p.n), { r: 6 });
  pl.dot(p.n, remainingFraction(p.n), { r: 6, cls: 'ph-plot2' });
}
function tauFrames() {
  const f = (n, caption) => ({ draw: tauDraw, p: { n }, box: [640, 266], caption });
  const pc = (x) => `${(100 * x).toFixed(1)}%`;
  return [
    f(0, 'At t = 0 the capacitor is empty, so V<sub>C</sub> = 0 and the whole \u2130 sits across R: the current starts at its <b>maximum, i<sub>0</sub> = \u2130/R</b>. An uncharged capacitor acts like a plain wire.'),
    f(1, `After <b>one time constant</b>, q has reached <b>${pc(chargedFraction(1))}</b> of its final value C\u2130, and the current has fallen to ${pc(remainingFraction(1))} of i<sub>0</sub>. The two always add to 100%: V<sub>R</sub> + V<sub>C</sub> = \u2130.`),
    f(2, `After 2\u03c4: <b>${pc(chargedFraction(2))}</b>. Each \u03c4 closes the same fraction (63%) of whatever gap is left, so progress slows down.`),
    f(3, `After 3\u03c4: <b>${pc(chargedFraction(3))}</b>, current ${pc(remainingFraction(3))} of i<sub>0</sub>.`),
    f(5, `After 5\u03c4: <b>${pc(chargedFraction(5))}</b>, which counts as full. Now V<sub>C</sub> = \u2130 and no current flows: a <b>charged capacitor acts like a break</b> in the circuit.`),
  ];
}

// ---------- quiz ----------
const SS = { emf: 12, R1: 2, R2: 4, R3: 6 };
const ss = rcSteadyState(SS);
function ssDraw(d0, p) {
  const d = d0.group({ y: 18 });
  const top = 50;
  const bot = 230;
  d.battery(60, bot, 60, top, {});
  d.text(78, 140, `${SS.emf} V`, { serif: true, anchor: 'start' });
  d.resistor(60, top, 300, top, {});
  d.resistor(300, top, 300, bot, {});
  d.wire([[300, top], [480, top]]);
  d.resistor(480, top, 480, 140, {});
  d.capacitor(480, 140, 480, bot, {});
  d.wire([[480, bot], [60, bot]]);
  d.node(300, top);
  d.node(300, bot);
  const where = { R1: [180, top], R2: [300, 140], R3: [480, 95] };
  const lab = { R1: [180, top - 44, 'middle'], R2: [330, 140, 'start'], R3: [510, 95, 'start'] };
  for (const k of ['R1', 'R2', 'R3']) {
    pickBox(d, ...where[k], k === 'R1' ? 64 : 40, k === 'R1' ? 40 : 64, `res-${k}`);
    const [x, y, anchor] = lab[k];
    d.text(x, y, `R<sub>${k[1]}</sub> = ${SS[k]} \u03a9`, { serif: true, anchor });
    if (p.show) d.text(x, y + 18, `I = ${num(Math.abs(ss.I[k]) < 1e-6 ? 0 : Math.abs(ss.I[k]), 2)} A`, { cls: 'ph-I', anchor });
  }
  d.text(510, 185, 'C', { serif: true, anchor: 'start' });
}
const zeroRes = () => `res-${['R1', 'R2', 'R3'].find((k) => Math.abs(ss.I[k]) < 1e-6)}`;
const tauQ = tau(2000, 50e-6);

const quiz = [
  {
    type: 'input',
    id: 'rc.tau',
    prompt: 'A 2.0 k\u03a9 resistor charges a 50 \u03bcF capacitor. What is the time constant, in <b>seconds</b>?',
    accept: (t) => {
      const v = parseFloat(t);
      const s = /ms/i.test(t) ? v / 1000 : v;
      return Math.abs(s - tauQ) < 0.002;
    },
    placeholder: 's',
    explain: `\u03c4 = RC = (2.0 \u00d7 10<sup>3</sup> \u03a9)(50 \u00d7 10<sup>\u22126</sup> F) = ${num(tauQ)} s. Watch the prefixes: k = 10<sup>3</sup>, \u03bc = 10<sup>\u22126</sup>. Ohms times farads really is seconds.`,
  },
  {
    type: 'mcq',
    id: 'rc.t0',
    prompt: 'An <b>uncharged</b> capacitor, a resistor R and a battery \u2130 are in series. The instant the switch closes, the current is:',
    choices: ['\u2130/R: the empty capacitor acts like a wire', 'Zero: a capacitor blocks DC current', '\u2130/(2R): the voltage is shared between R and C', 'Zero at first, rising to \u2130/R as the capacitor charges'],
    answer: 0,
    explain: 'With no charge on it, V<sub>C</sub> = q/C = 0, so the loop rule puts the full \u2130 across R: i = \u2130/R, the largest current it will ever have. "Blocks DC" is the <b>t \u2192 \u221e</b> answer, once V<sub>C</sub> has risen to \u2130. The current decays from \u2130/R toward 0; it never rises.',
  },
  {
    type: 'input',
    id: 'rc.two-tau',
    prompt: 'A capacitor charges from empty. What <b>percent</b> of its final charge does it have after <b>two</b> time constants?',
    accept: (t) => Math.abs(parseFloat(t) - 100 * chargedFraction(2)) < 0.6,
    placeholder: '%',
    explain: `q/C\u2130 = 1 \u2212 e<sup>\u22122</sup> = 1 \u2212 ${num(remainingFraction(2), 3)} = ${(100 * chargedFraction(2)).toFixed(1)}%. Not 2 \u00d7 63%: each \u03c4 covers 63% of the <i>remaining</i> gap (63% of the way, then 63% of the last 37%).`,
  },
  {
    type: 'pick',
    id: 'rc.no-current',
    prompt: 'The switch has been closed for a <b>long time</b>. Click the resistor that carries <b>no current</b>.',
    View: PhysView,
    view: { height: 268, box: [600, 268] },
    build: () => ({
      frame: { draw: ssDraw, p: { show: 0 }, box: [600, 268] },
      answer: [zeroRes()],
      after: { draw: ssDraw, p: { show: 1 }, box: [600, 268] },
    }),
    explain: `Long after switching, the capacitor is fully charged and passes no current, like a break. R<sub>3</sub> is in series with it, so its current is 0. The rest is a simple series loop: I = ${SS.emf}/(${SS.R1} + ${SS.R2}) = ${num(ss.I.R1)} A through R<sub>1</sub> and R<sub>2</sub>. The capacitor sits at the voltage across R<sub>2</sub>, ${num(ss.Vc, 3)} V (no current in R<sub>3</sub> means no drop across it).`,
  },
];

export default {
  id: 'rc',
  title: 'RC circuits',
  group: 'Circuits',
  blurb: 'A resistor and a capacitor together: exponential charging, the time constant RC, and the t = 0 and long-time shortcuts.',
  quiz,
  render(root) {
    root.append(
      p('Put a capacitor in a circuit and things start to take <b>time</b>. A resistor alone reacts instantly: the current is V/R the moment you connect it. A capacitor in series with a resistor fills up gradually. At first it is empty and offers no opposition, so current rushes in at \u2130/R. As charge builds up, the capacitor\u2019s own voltage ' + eq('V<sub>C</sub> = q/C') + ' pushes back against the battery, the voltage left for the resistor shrinks, and so does the current. The closer it gets to full, the slower it fills.'),
      p('That "rate proportional to what is left" is the signature of an exponential, the same shape as radioactive decay later in the course or Newton\u2019s law of cooling. In calculus terms the loop rule becomes a differential equation, ' + eq('\u2130 \u2212 R dq/dt \u2212 q/C = 0') + ', whose solution is the exponential below. You do not need to solve it; you need to read its shape.'),
      equation({
        name: 'Time constant',
        eq: '\u03c4 = R C',
        says: 'The one number that sets how fast an RC circuit responds. Bigger R means a smaller current to fill with; bigger C means more charge to deliver. Either one slows it down, in proportion.',
        terms: [
          ['\u03c4', 'time constant (tau)', 's'],
          ['R', 'resistance the charge flows through', '\u03a9'],
          ['C', 'capacitance', 'F'],
        ],
      }),
      equation({
        name: 'Charging (from empty, switch to the battery at t = 0)',
        eq: 'q(t) = C\u2130 (1 \u2212 e<sup>\u2212t/\u03c4</sup>) \u2003\u2003 i(t) = <span class="frac"><span>\u2130</span><span>R</span></span> e<sup>\u2212t/\u03c4</sup>',
        says: 'Charge climbs toward its final value C\u2130 and the current decays from \u2130/R toward zero, both on the same clock \u03c4. The current is the slope of the charge curve: steep at first, flat at the end.',
        terms: [
          ['C\u2130', 'final charge, when V<sub>C</sub> equals the battery', 'C'],
          ['\u2130/R', 'initial current, when the capacitor acts like a wire', 'A'],
          ['e<sup>\u2212t/\u03c4</sup>', 'the fraction still "to go": 37% at t = \u03c4, 0.7% at 5\u03c4', ''],
        ],
      }),
      equation({
        name: 'Discharging (battery removed at t = 0)',
        eq: 'q(t) = Q<sub>0</sub> e<sup>\u2212t/\u03c4</sup> \u2003\u2003 |i(t)| = <span class="frac"><span>Q<sub>0</sub></span><span>RC</span></span> e<sup>\u2212t/\u03c4</sup>',
        says: 'The capacitor now plays the battery, pushing current backward through R. Charge, voltage and current all decay by the same factor each \u03c4.',
        terms: [['Q<sub>0</sub>', 'charge at the moment the discharge starts', 'C']],
      }),
    );

    // live sandbox
    const stage = h('div', { class: 'stage' });
    const view = new PhysView(stage, { height: 330, box: [640, 318] });
    const st = { R: 4e3, C: 500e-6, mode: 'charge', scrub: -1 };
    const ro = readouts([['tau', '\u03c4 = RC'], ['t', 't'], ['q', 'q'], ['i', 'i'], ['v', 'V<sub>C</sub>']]);
    const frame = (reset) => ({ draw: rcDraw, p: { ...st }, box: [640, 318], live: st.scrub < 0, resetTime: reset });
    const update = () => {
      const ts = st.scrub >= 0 ? st.scrub : Math.min(view.t, T_END);
      const s = rcState(st, ts);
      ro.set({ tau: `${num(tau(st.R, st.C), 3)} s`, t: `${ts.toFixed(1)} s`, q: `${num(s.q * 1000, 3)} mC`, i: `${num(s.i * 1000, 3)} mA`, v: `${num(s.q / st.C, 3)} V` });
    };
    const restart = () => {
      st.scrub = -1;
      tSlider.input.value = 0;
      tSlider.querySelector('.slider-val').textContent = 'live';
      view.show(frame(true), { animate: false });
    };
    // keep the readouts in step with the live clock
    const tick = () => {
      if (!stage.isConnected) return;
      update();
      requestAnimationFrame(tick);
    };
    const tSlider = slider({ label: 'Scrub time', min: 0, max: T_END, step: 0.1, value: 0, fmt: (v) => `${v.toFixed(1)} s`, onInput: (v) => ((st.scrub = v), view.show(frame(false), { animate: false })) });
    root.append(
      figure(
        {
          title: 'Charging and discharging, live',
          tools: [
            segmented([{ value: 'charge', label: 'Charge' }, { value: 'discharge', label: 'Discharge' }], 'charge', (m) => ((st.mode = m), restart()), { label: 'mode' }),
            h('button', { class: 'btn ghost small', text: 'Restart', onclick: restart }),
          ],
          note: 'The clock runs in real time from the moment you restart or change a slider; drag "Scrub time" to stop it at any instant. The dashed line marks t = \u03c4. Teal dots: current, moving at a speed proportional to i. Try: double R, then double C. Same effect on \u03c4.',
        },
        stage,
        controlsRow(
          slider({ label: 'R', min: R_RANGE[0] / 1000, max: R_RANGE[1] / 1000, step: 0.5, value: st.R / 1000, fmt: (v) => `${v.toFixed(1)} k\u03a9`, onInput: (v) => ((st.R = v * 1000), restart()) }),
          slider({ label: 'C', min: C_RANGE[0] * 1e6, max: C_RANGE[1] * 1e6, step: 50, value: st.C * 1e6, fmt: (v) => `${v} \u03bcF`, onInput: (v) => ((st.C = v * 1e-6), restart()) }),
          tSlider,
        ),
        ro,
      ),
    );
    restart();
    requestAnimationFrame(tick);

    root.append(
      callout('key', 'Two shortcuts that answer most questions', 'Right after a switch moves, a capacitor\u2019s <b>voltage</b> cannot jump (its charge needs time to change): an empty capacitor acts like a <b>wire</b>. Long afterward, nothing changes any more, so no current flows into it: it acts like a <b>break</b>. Use these to find the currents at t = 0 and t \u2192 \u221e without any exponentials.'),
    );

    const thost = h('div');
    root.append(figure({ title: 'Counting time constants', note: 'Solid: charge as a fraction of its final value. Dashed: current as a fraction of its starting value \u2130/R (also the discharge curve for charge).' }, thost));
    new Player(thost, { frames: tauFrames(), View: PhysView, view: { height: 280 } });

    root.append(
      p('Where it shows up: camera flashes and defibrillators (charge slowly from a battery, dump fast through a small R), the delay in windshield wipers and blinking lights, and every digital circuit, where the RC time of tiny wires and transistor gates limits how fast a chip can switch. In the inductance chapter you will meet the RL circuit, which has the same exponential with \u03c4 = L/R.'),
      callout('warn', 'Classic mistakes', 'Reading \u03c4 as "the time to fully charge". After one \u03c4 it is only 63% charged; "full" takes about 5\u03c4. And unit slips: k\u03a9 \u00d7 \u03bcF gives milliseconds, not seconds.'),
      checkpoint(quiz),
    );
  },
};
