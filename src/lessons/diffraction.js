import { h, p } from '../ui/dom.js';
import { Player } from '../ui/player.js';
import { PhysView } from '../core/phys-view.js';
import { figure, callout, segmented, toggle } from '../ui/figure.js';
import { checkpoint } from '../ui/quiz.js';
import { equation, eq, slider, controlsRow, readouts } from '../ui/controls.js';
import { singleSlitI, singleSlitDark, centralWidth, gratingI, doubleSlitFiniteI, missingOrders, rayleigh, toDeg } from '../model/optics.js';

const TAU = Math.PI * 2;

function clipped(d, id, x, y, w, hgt) {
  const cp = d.el('clipPath', { id });
  const r = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  for (const [k, v] of Object.entries({ x, y, width: w, height: hgt })) r.setAttribute(k, v);
  cp.append(r);
  const g = d.group();
  g.g.setAttribute('clip-path', `url(#${id})`);
  return g;
}

// ---------- figure 1: Huygens wavelets through a slit (live) ----------
const HW = 640;
const HH = 320;
const BX = 150; // barrier x
const HCY = HH / 2;
const HLAM = 28;
const HV = 36; // px/s
function huygensDraw(d, p, t) {
  const a = p.ratio * HLAM;
  const top = HCY - a / 2;
  const bot = HCY + a / 2;
  const shift = (HV * t) % HLAM;
  // incoming plane waves
  for (let x = shift; x < BX; x += HLAM) d.line(x, 12, x, HH - 12, { cls: 'ph-light', w: 1.8, opacity: 0.6 });
  // barrier
  d.line(BX, 0, BX, top, { cls: 'ph-wire', w: 4 });
  d.line(BX, bot, BX, HH, { cls: 'ph-wire', w: 4 });
  const g = clipped(d, p.clip, BX, 0, HW - BX, HH);
  // wavelets from points across the opening (one recent crest), their envelope is the next front
  if (p.wavelets) {
    const n = Math.max(2, Math.min(9, Math.round(a / 14) + 1));
    const r = shift + HLAM;
    for (let i = 0; i < n; i++) {
      const y = top + (a * i) / (n - 1);
      g.circle(BX, y, r, { cls: 'ph-light', w: 1, opacity: 0.4 });
      g.dot(BX, y, { r: 2.2, cls: 'ph-light' });
    }
  }
  // fronts: points at distance s from the opening (flat middle, rounded ends), brightness from the single-slit pattern
  const bright = (x, y) => {
    const th = Math.atan2(y - HCY, x - BX);
    return 0.06 + 0.9 * Math.sqrt(singleSlitI(th, a, HLAM));
  };
  for (let s = shift + (p.wavelets ? 2 * HLAM : HLAM); s < 560; s += HLAM) {
    if (a > 1) g.line(BX + s, top, BX + s, bot, { cls: 'ph-light', w: 2, opacity: bright(BX + s, HCY).toFixed(2) });
    const steps = 16;
    for (const [cy, sign] of [[top, -1], [bot, 1]]) {
      for (let i = 0; i < steps; i++) {
        const a0 = (i / steps) * (Math.PI / 2);
        const a1 = ((i + 1) / steps) * (Math.PI / 2);
        const x0 = BX + s * Math.cos(a0);
        const y0 = cy + sign * s * Math.sin(a0);
        const x1 = BX + s * Math.cos(a1);
        const y1 = cy + sign * s * Math.sin(a1);
        if (Math.min(y0, y1) > HH + 4 || Math.max(y0, y1) < -4) continue;
        g.line(x0, y0, x1, y1, { cls: 'ph-light', w: 2, opacity: bright((x0 + x1) / 2, (y0 + y1) / 2).toFixed(2) });
      }
    }
  }
  // first dark directions
  const th1 = singleSlitDark(1, a, HLAM);
  if (th1 !== null) {
    for (const sg of [-1, 1]) {
      const L = 520;
      const ex = BX + L * Math.cos(th1);
      const ey = HCY + sg * L * Math.sin(th1);
      d.line(BX, HCY, ex, ey, { cls: 'ph-mute', dash: '5 6', w: 1.4 });
    }
    const lx = BX + 300 * Math.cos(th1);
    const ly = HCY - 300 * Math.sin(th1);
    if (ly > 18) d.text(lx, ly - 12, 'first dark', { cls: 'ph-label', halo: true });
  } else {
    d.text(HW - 12, 20, 'a &lt; \u03bb: no dark fringe at all', { cls: 'ph-label', anchor: 'end', halo: true });
  }
  d.text(BX - 8, top - 12, `a = ${p.ratio.toFixed(1)}\u03bb`, { cls: 'ph-label', anchor: 'end', halo: true });
}

// ---------- figure 2: why a sin(theta) = lambda is dark (stepped) ----------
const SA = 176; // slit width, px
const SLAM = 60; // drawn wavelength, px
const SX = 70;
const STOP = 100;
const NR = 12;
const NPH = 24;
function halvesDraw(d, p) {
  const k = p.k; // a sin(theta) / lambda
  const th = Math.asin((k * SLAM) / SA);
  const ux = Math.cos(th);
  const uy = -Math.sin(th); // rays go up-right
  // slit
  d.line(SX, 40, SX, STOP, { cls: 'ph-wire', w: 4 });
  d.line(SX, STOP + SA, SX, STOP + SA + 40, { cls: 'ph-wire', w: 4 });
  // rays from points across the slit; top half teal, bottom half orange
  const L = 130;
  for (let i = 0; i < NR; i++) {
    const y = STOP + (SA * (i + 0.5)) / NR;
    d.arrow(SX, y, SX + ux * L, y + uy * L, { cls: i < NR / 2 ? 'ph-plot2' : 'ph-plot3', w: 1.6, head: 7 });
  }
  if (k > 0.01) {
    // rays go up-right, so the BOTTOM edge's ray travels a sin(theta) farther: drop a perpendicular from the top edge onto it
    const bx = SX;
    const by = STOP + SA;
    const px = bx + SA * Math.sin(th) * ux;
    const py = by + SA * Math.sin(th) * uy;
    d.line(SX, STOP, px, py, { cls: 'ph-mute', dash: '4 4', w: 1.4 });
    d.line(bx, by, px, py, { cls: 'ph-plot3', w: 7, opacity: 0.3 });
    d.text(px + 10, py + 12, `a sin\u03b8 = ${k.toFixed(1)}\u03bb`, { cls: 'ph-plot3', anchor: 'start', halo: true });
  }
  d.text(SX - 10, STOP + SA / 2, 'a', { cls: 'ph-label', serif: true, anchor: 'end' });
  // phasor chain: NPH little arrows, each turned by the phase step between neighboring strips
  const step = (TAU * k) / NPH;
  const len = 240 / NPH;
  let x = 0;
  let y = 0;
  let ang = -((NPH - 1) * step) / 2; // centered so the chain is symmetric
  const pts = [[0, 0]];
  for (let i = 0; i < NPH; i++) {
    x += len * Math.cos(ang);
    y += len * Math.sin(ang);
    pts.push([x, y]);
    ang += step;
  }
  const xs = pts.map((q) => q[0]);
  const ys = pts.map((q) => q[1]);
  const cx = 470 - (Math.min(...xs) + Math.max(...xs)) / 2;
  const cy = 112 - (Math.min(...ys) + Math.max(...ys)) / 2;
  for (let i = 0; i < NPH; i++) {
    d.arrow(cx + pts[i][0], cy - pts[i][1], cx + pts[i + 1][0], cy - pts[i + 1][1], { cls: i < NPH / 2 ? 'ph-plot2' : 'ph-plot3', w: 1.6, head: 5 });
  }
  const res = Math.hypot(x, y);
  if (res > 3) d.arrow(cx, cy, cx + x, cy - y, { cls: 'ph-plot', w: 3 });
  else d.dot(cx, cy, { r: 4, cls: 'ph-plot' });
  d.text(470, 18, 'adding the wavelets head to tail', { cls: 'ph-label' });
  // intensity mini-plot
  const pl = d.plot({ x: 340, y: 236, w: 270, h: 64, xr: [-2.6, 2.6], yr: [0, 1.1], xLabel: 'a sin\u03b8 / \u03bb', ticksX: [[-2, '\u22122'], [-1, '\u22121'], [0], [1]] });
  pl.fn((v) => singleSlitI(Math.asin((v * SLAM) / SA), SA, SLAM), { w: 1.8 });
  pl.dot(k, singleSlitI(th, SA, SLAM), { r: 5, cls: 'ph-ray' });
}
function halvesFrames() {
  const I = (k) => singleSlitI(Math.asin((k * SLAM) / SA), SA, SLAM);
  const fr = (k, caption) => ({ draw: halvesDraw, p: { k }, box: [640, 330], caption });
  return [
    fr(0, 'Straight ahead (\u03b8 = 0): every point of the opening is the same distance from the far screen, so all the wavelets arrive in step. Head to tail, their little arrows make a straight line: the <b>central maximum</b>, I = 1.'),
    fr(0.5, `Tilt so the two <b>edges</b> differ by a sin\u03b8 = \u00bd\u03bb. Neighboring wavelets are slightly out of step, so the chain of arrows curls into a half circle and the sum is shorter: I = ${I(0.5).toFixed(2)}.`),
    fr(1, '<b>a sin\u03b8 = \u03bb</b>. Pair each wavelet in the top half (teal) with the one exactly a/2 below it (orange): every pair differs by \u03bb/2 and cancels. The chain closes into a full circle: <b>dark</b>. This is the first dark fringe, and why the single-slit formula with m\u03bb gives darkness.'),
    fr(1.5, `a sin\u03b8 = 1\u00bd\u03bb: the chain goes around one and a half times. Two thirds of the opening cancel each other and one third survives: a weak <b>side maximum</b>, I = ${I(1.5).toFixed(3)}.`),
    fr(2, 'a sin\u03b8 = 2\u03bb: split the opening into quarters; they cancel in pairs and the chain closes twice. <b>Dark again</b>. In general: dark where a sin\u03b8 = m\u03bb, m = \u00b11, \u00b12, \u2026'),
  ];
}

// ---------- figure 3: single-slit sandbox (SI) ----------
const YR = 50; // mm on a screen 1 m away
const SL_L = 1;
function singleDraw(d, p) {
  const x0 = 40;
  const w = 570;
  const I = (ymm) => singleSlitI(Math.atan(ymm / 1000 / SL_L), p.a, p.lam);
  for (let px = 0; px < w; px += 2) {
    const ymm = -YR + ((px + 1) / w) * 2 * YR;
    d.rect(x0 + px, 14, 2, 30, { cls: 'ph-light', fill: true, style: `--fo: ${(0.04 + 0.9 * Math.sqrt(I(ymm))).toFixed(2)}`, w: 0 });
  }
  d.rect(x0, 14, w, 30, { cls: 'ph-mute', w: 1 });
  const pl = d.plot({ x: x0, y: 72, w, h: 120, xr: [-YR, YR], yr: [0, 1.1], xLabel: 'y (mm)', ticksX: [[-40, '\u221240'], [-20, '\u221220'], [0], [20]] });
  pl.fn(I, { n: 600, w: 2 });
  const th1 = singleSlitDark(1, p.a, p.lam);
  if (th1 !== null) {
    const y1 = Math.tan(th1) * SL_L * 1000;
    if (y1 < YR) {
      for (const s of [-1, 1]) pl.vline(s * y1, { cls: 'ph-mute' });
      pl.line(-y1, 1.04, y1, 1.04, { cls: 'ph-F', w: 1.2 });
      pl.label(0, 1.14, 'central max', { cls: 'ph-F', halo: true });
    }
  }
}

// ---------- figure 4: N slits, same spacing ----------
function gratingDraw(d, p) {
  const x0 = 40;
  const w = 570;
  const X = 3.4; // range of d sin(theta) / lambda
  const Dl = 4; // d / lambda (any value > X works: the pattern depends only on d sin(theta) / lambda)
  const I = (u) => gratingI(Math.asin(u / Dl), p.N, Dl, 1);
  const pl = d.plot({ x: x0, y: 30, w, h: 150, xr: [-X, X], yr: [0, 1.1], xLabel: 'd sin\u03b8 / \u03bb', ticksX: [[-3, '\u22123'], [-2, '\u22122'], [-1, '\u22121'], [0], [1], [2]] });
  pl.fn(I, { n: 1600, w: 1.8 });
  for (let px = 0; px < w; px += 2) {
    const u = -X + ((px + 1) / w) * 2 * X;
    d.rect(x0 + px, 214, 2, 26, { cls: 'ph-light', fill: true, style: `--fo: ${(0.04 + 0.9 * I(u)).toFixed(2)}`, w: 0 });
  }
  d.rect(x0, 214, w, 26, { cls: 'ph-mute', w: 1 });
}

// ---------- figure 5: double slit with finite slit width ----------
const ELAM = 600e-9;
function envDraw(d, p) {
  const x0 = 40;
  const w = 570;
  const S = 0.1; // sin(theta) range
  const pl = d.plot({ x: x0, y: 34, w, h: 150, xr: [-S, S], yr: [0, 1.12], xLabel: 'sin\u03b8', ticksX: [[-0.1, '\u22120.1'], [-0.05, '\u22120.05'], [0], [0.05]] });
  pl.fn((s) => singleSlitI(Math.asin(s), p.a, ELAM), { cls: 'ph-plot2', w: 1.6, dash: '6 5' });
  pl.fn((s) => doubleSlitFiniteI(Math.asin(s), p.a, p.d, ELAM), { n: 1400, w: 1.8 });
  for (const m of missingOrders(p.d, p.a, 40)) {
    for (const sg of [-1, 1]) {
      const s = (sg * m * ELAM) / p.d;
      if (Math.abs(s) < S) {
        pl.dot(s, 0, { r: 4, cls: 'ph-bad' });
        pl.label(s, 0.12, `m=${sg * m}`.replace('-', '\u2212'), { cls: 'ph-bad', size: 11 });
      }
    }
  }
}

// ---------- quiz ----------
const QA = 20e-6;
const QDD = 60e-6;
const qOrders = [1, 2, 3, 4];
function qEnvDraw(d, p) {
  const x0 = 30;
  const w = 460;
  const S = 0.046;
  const pl = d.plot({ x: x0, y: 20, w, h: 130, xr: [0, S], yr: [0, 1.1], xLabel: 'sin\u03b8', axes: true });
  if (p.reveal) pl.fn((s) => singleSlitI(Math.asin(s), QA, ELAM), { cls: 'ph-plot2', w: 1.4, dash: '6 5' });
  pl.fn((s) => doubleSlitFiniteI(Math.asin(s), QA, QDD, ELAM), { n: 900, w: 1.8 });
  for (const m of qOrders) {
    const s = (m * ELAM) / QDD;
    const g = d.group({ id: `m${m}` });
    g.rect(pl.X(s) - 16, pl.Y(0) + 6, 32, 24, { rx: 5, fill: true, w: 1.6, style: '--fo: 0.08' });
    g.text(pl.X(s), pl.Y(0) + 18, `m=${m}`, { size: 12 });
  }
}

const cw = centralWidth(500e-9, 2, 0.1e-3) * 1000;

const quiz = [
  {
    type: 'mcq',
    id: 'diffraction.trap',
    prompt: 'For a <b>single</b> slit of width a, the angles where a sin\u03b8 = m\u03bb (m = 1, 2, \u2026) are\u2026',
    choices: ['bright fringes, just like d sin\u03b8 = m\u03bb for a double slit', 'dark fringes', 'the edges of the slit\u2019s geometric shadow', 'bright for even m and dark for odd m'],
    answer: 1,
    explain: 'Same-looking formula, opposite meaning. For one slit, a sin\u03b8 = m\u03bb means the opening splits into 2m strips that cancel in pairs: <b>dark</b>. For two slits, d sin\u03b8 = m\u03bb means the two waves are a whole number of wavelengths apart: <b>bright</b>. Check which letter it is: a (width) is single-slit, d (separation) is double-slit or grating.',
  },
  {
    type: 'input',
    id: 'diffraction.central-width',
    prompt: 'Light of 500 nm passes a slit 0.10 mm wide onto a screen 2.0 m away. How wide is the central bright band, in mm?',
    placeholder: 'mm',
    accept: (s) => Math.abs(parseFloat(s) - cw) < 0.2,
    explain: `The first dark fringes are at sin\u03b8 = \u00b1\u03bb/a, so on the screen y = \u00b1\u03bbL/a = \u00b1${(cw / 2).toFixed(0)} mm. The central maximum spans both: <b>2\u03bbL/a = ${cw.toFixed(0)} mm</b>. Forgetting the factor of 2 (half-width vs full width) is the common slip.`,
  },
  {
    type: 'mcq',
    id: 'diffraction.narrower',
    prompt: 'You make the slit <b>narrower</b>. The diffraction pattern on the screen\u2026',
    choices: ['shrinks, because less light gets through', 'spreads out wider', 'stays the same width but gets dimmer', 'turns into a sharp image of the slit'],
    answer: 1,
    explain: 'The first dark fringe is at sin\u03b8 = \u03bb/a: smaller a means a bigger angle, so the pattern <b>spreads</b> (it also gets dimmer, since less light gets through). Squeezing a wave makes it spread more: the same reason a wide telescope mirror gives sharper images.',
  },
  {
    type: 'pick',
    id: 'diffraction.missing-order',
    prompt: `A double slit has slits ${QA * 1e6} \u03bcm wide and ${QDD * 1e6} \u03bcm apart. The boxes mark where the double-slit bright fringes m = 1 to 4 should be. Click the one that is <b>missing</b>.`,
    View: PhysView,
    view: { height: 220, box: [520, 196] },
    build: () => ({
      frame: { draw: qEnvDraw, p: { reveal: 0 }, box: [520, 196] },
      answer: missingOrders(QDD, QA, 4).map((m) => `m${m}`),
      after: { draw: qEnvDraw, p: { reveal: 1 }, box: [520, 196] },
    }),
    explain: () => `The bright fringe of order m sits at sin\u03b8 = m\u03bb/d; the single-slit envelope is zero at sin\u03b8 = \u03bb/a. With d/a = ${QDD / QA}, the order <b>m = ${missingOrders(QDD, QA, 4).join(', ')}</b> lands exactly on the envelope\u2019s first zero (dashed curve), so the interference maximum is multiplied by zero and vanishes.`,
  },
];

export default {
  id: 'diffraction',
  title: 'Diffraction',
  group: 'Light & optics',
  blurb: 'Waves spread through openings; the single-slit pattern, gratings, and why every lens has a resolution limit.',
  quiz,
  render(root) {
    root.append(
      p('A wave squeezing through an opening does not make a sharp-edged beam. It <b>spreads</b>. That spreading is <b>diffraction</b>, and how much it spreads depends on one ratio: the width of the opening compared to the wavelength. Sound (wavelengths around a meter) bends around doorways; light (half a micrometer) mostly casts sharp shadows, until the opening is only a few micrometers wide.'),
      p('The tool for thinking about it is <b>Huygens\u2019 principle</b>: every point of a wavefront acts as a source of little spherical wavelets, and the next wavefront is their envelope. Through a wide opening the wavelets add up to a flat front with slightly rounded edges. Through a narrow one there are only a few wavelets, and the front comes out nearly circular.'),
    );

    // Huygens sandbox
    const hStage = h('div', { class: 'stage' });
    const hView = new PhysView(hStage, { height: 330, box: [HW, HH] });
    let ratio = 3;
    let wavelets = true;
    const hRedraw = () => hView.show({ draw: huygensDraw, p: { ratio, wavelets, clip: 'huy-clip' }, box: [HW, HH], live: true }, { animate: false });
    root.append(
      figure(
        {
          title: 'Huygens\u2019 wavelets through a slit',
          tools: [toggle('Show wavelets', wavelets, (v) => ((wavelets = v), hRedraw()))],
          note: 'Wavefronts are drawn bright where the wave is strong (the single-slit intensity at that angle) and faint where it is weak. Dashed lines: the first dark directions, sin\u03b8 = \u03bb/a. A slit many wavelengths wide passes a nearly straight beam; one about a wavelength wide spreads into a half circle.',
        },
        hStage,
        controlsRow(slider({ label: 'Slit width a', min: 0.6, max: 8, step: 0.1, value: ratio, fmt: (v) => `${v.toFixed(1)} \u03bb`, onInput: (v) => ((ratio = v), hRedraw()) })),
      ),
    );
    hRedraw();

    root.append(
      h('h2', { text: 'The single slit', class: 'reveal' }),
      p('On a far screen, a single slit makes a bright central band with weaker bands on each side. The dark gaps come from wavelets in different parts of the <b>same</b> opening cancelling each other. The figure shows why with the trick of pairing up strips of the opening; the arrows on the right add the wavelets head to tail (each one turned by its phase).'),
    );
    const host = h('div');
    root.append(figure({ title: 'Why a sin\u03b8 = \u03bb is dark', note: 'Rays from the top half in teal, bottom half in orange. Shaded: the extra path a sin\u03b8 of the bottom edge compared with the top edge.' }, host));
    new Player(host, { frames: halvesFrames(), View: PhysView, view: { height: 340 } });

    root.append(
      equation({
        name: 'Single-slit dark fringes',
        eq: 'a sin \u03b8 = m\u03bb \u2003 (m = \u00b11, \u00b12, \u2026)',
        says: 'These are the <b>dark</b> fringes. The central bright band runs from m = \u22121 to m = +1, so it is <b>twice as wide</b> as the side bands. <b>Narrower slit, wider pattern</b>: halve a and every angle (roughly) doubles.',
        terms: [
          ['a', 'width of the slit', 'm'],
          ['\u03b8', 'angle from the straight-through direction', 'rad'],
          ['m', 'which dark fringe; m = 0 is excluded (that is the bright center)', ''],
        ],
      }),
      p('The intensity between them follows ' + eq('I = I<sub>0</sub> [sin \u03b2 / \u03b2]<sup>2</sup>') + ' with ' + eq('\u03b2 = \u03c0a sin\u03b8 / \u03bb') + ': a tall central peak, and side peaks that fall off fast (the first is under 5% of the center). On a screen at distance L the central band is ' + eq('2\u03bbL/a') + ' wide.'),
    );

    // single slit sandbox
    const sStage = h('div', { class: 'stage' });
    const sView = new PhysView(sStage, { height: 240, box: [640, 222] });
    let ss = { a: 40e-6, lam: 600e-9 };
    const sro = readouts([['w', 'Central max width (screen 1 m away)'], ['t', 'First dark at \u03b8']]);
    const sRedraw = () => {
      sView.show({ draw: singleDraw, p: ss, box: [640, 222] }, { animate: false });
      sro.set({ w: `${(centralWidth(ss.lam, SL_L, ss.a) * 1000).toFixed(1)} mm`, t: `${toDeg(singleSlitDark(1, ss.a, ss.lam)).toFixed(2)}\u00b0` });
    };
    root.append(
      figure(
        { title: 'Sandbox: single-slit pattern', note: 'Computed from the sinc\u00b2 formula; the strip on top is the screen (brightness exaggerated so the side bands show). Dashed: the first dark fringes, a sin\u03b8 = \u00b1\u03bb.' },
        sStage,
        controlsRow(
          slider({ label: 'Slit width a', min: 15, max: 200, step: 1, value: 40, fmt: (v) => `${v} \u03bcm`, onInput: (v) => ((ss = { ...ss, a: v * 1e-6 }), sRedraw()) }),
          slider({ label: 'Wavelength \u03bb', min: 400, max: 700, step: 5, value: 600, fmt: (v) => `${v} nm`, onInput: (v) => ((ss = { ...ss, lam: v * 1e-9 }), sRedraw()) }),
        ),
        sro,
      ),
    );
    sRedraw();

    root.append(
      callout('warn', 'The trap: same formula, opposite meaning', '<b>Single slit</b>, a sin\u03b8 = m\u03bb (a = slit <b>width</b>): <b>dark</b> fringes. <b>Double slit or grating</b>, d sin\u03b8 = m\u03bb (d = slit <b>separation</b>): <b>bright</b> fringes. Before using either, ask: is this one opening cancelling itself, or separate openings reinforcing each other?'),
      h('h2', { text: 'Many slits: gratings', class: 'reveal' }),
      p('Add more slits at the same spacing d. The bright fringes stay exactly where d sin\u03b8 = m\u03bb puts them (every slit is a whole number of wavelengths from its neighbor there), but everywhere else the many waves mostly cancel. So the peaks get <b>sharper</b> and the spaces between them get darker. A <b>diffraction grating</b> has thousands of slits per centimeter, which makes razor-thin lines at well-separated angles. Each wavelength lands at its own angle, which is how a <b>spectrometer</b> measures wavelengths (and how the next chapters identify atoms by their spectral lines).'),
    );

    // N slits
    const gStage = h('div', { class: 'stage' });
    const gView = new PhysView(gStage, { height: 260, box: [640, 248] });
    let N = 2;
    const gro = readouts([['w', 'Peak width (to first zero)']]);
    const gRedraw = () => {
      gView.show({ draw: gratingDraw, p: { N }, box: [640, 248] }, { animate: false });
      gro.set({ w: `\u00b1\u03bb/(Nd) = \u00b1${(1 / N).toFixed(2)} of the peak spacing` });
    };
    root.append(
      figure(
        {
          title: 'Same spacing, more slits',
          tools: [segmented([2, 5, 20].map((n) => ({ value: n, label: `N = ${n}` })), N, (v) => ((N = v), gRedraw()))],
          note: 'Intensity of N narrow slits with spacing d, scaled so each main peak is 1 (the real peaks also get N\u00b2 times brighter). The peaks stay at d sin\u03b8 = m\u03bb; only their width changes, as 1/N.',
        },
        gStage,
        gro,
      ),
    );
    gRedraw();

    root.append(
      h('h2', { text: 'Real double slits: interference inside a diffraction envelope', class: 'reveal' }),
      p('Real slits have a width a as well as a separation d, so both effects happen at once. Each slit by itself spreads light into a single-slit pattern; the two slits\u2019 waves then interfere. The result is the double-slit fringes <b>multiplied</b> by the single-slit <b>envelope</b>. Where an interference maximum falls on a zero of the envelope, it vanishes: a <b>missing order</b>, which happens when d/a is a whole number.'),
    );
    const eStage = h('div', { class: 'stage' });
    const eView = new PhysView(eStage, { height: 240, box: [640, 214] });
    let env = { a: 20e-6, d: 60e-6 };
    const ero = readouts([['r', 'd / a'], ['m', 'Missing orders']]);
    const eRedraw = () => {
      eView.show({ draw: envDraw, p: env, box: [640, 214] }, { animate: false });
      const mo = missingOrders(env.d, env.a, 12);
      ero.set({ r: (env.d / env.a).toFixed(2), m: mo.length ? mo.map((m) => `\u00b1${m}`).join(', ') : 'none (d/a not a whole number)' });
    };
    root.append(
      figure(
        { title: 'Sandbox: the envelope', note: '\u03bb = 600 nm. Dashed teal: the single-slit envelope of one slit. Solid: the full pattern. Red dots: orders that land on an envelope zero and disappear.' },
        eStage,
        controlsRow(
          slider({ label: 'Slit width a', min: 10, max: 60, step: 1, value: 20, fmt: (v) => `${v} \u03bcm`, onInput: (v) => ((env = { ...env, a: v * 1e-6 }), eRedraw()) }),
          slider({ label: 'Separation d', min: 30, max: 200, step: 1, value: 60, fmt: (v) => `${v} \u03bcm`, onInput: (v) => ((env = { ...env, d: v * 1e-6 }), eRedraw()) }),
        ),
        ero,
      ),
    );
    eRedraw();

    const eyeTh = rayleigh(550e-9, 3e-3);
    root.append(
      callout('key', 'What to remember', 'Diffraction spreads a wave by an angle of about <b>\u03bb / (opening size)</b>. One opening: darks at a sin\u03b8 = m\u03bb. Many openings: brights at d sin\u03b8 = m\u03bb, sharper the more openings there are. The envelope from the width multiplies the fringes from the spacing.'),
      p('<b>Resolution.</b> A lens or a telescope mirror is itself an opening, so even a perfect one turns a point of light into a small blur. Two points can just be told apart when their angular separation is at least the <b>Rayleigh limit</b> ' + eq('\u03b8 \u2248 1.22 \u03bb/D') + ' for a circular aperture of diameter D. Your pupil (D \u2248 3 mm) at 550 nm gives ' + `${(eyeTh * 1e4).toFixed(1)} \u00d7 10<sup>\u22124</sup> rad` + '; bigger telescopes and shorter wavelengths resolve finer detail.'),
      p('<b>X-ray diffraction.</b> The atoms of a crystal form a three-dimensional grating with spacings near 0.1 nm, comparable to X-ray wavelengths. The angles of the diffracted beams reveal the atomic spacing; that is how the structure of DNA was found.'),
      checkpoint(quiz),
    );
  },
};
