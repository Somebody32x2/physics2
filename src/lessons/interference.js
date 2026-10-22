import { h, p } from '../ui/dom.js';
import { Player } from '../ui/player.js';
import { PhysView } from '../core/phys-view.js';
import { figure, callout, segmented } from '../ui/figure.js';
import { checkpoint } from '../ui/quiz.js';
import { equation, eq, slider, controlsRow, readouts } from '../ui/controls.js';
import { pathDifference, twoWaveI, doubleSlitI, fringeSpacing, screenPointForPath, thinFilm, reinforced, cancelled, colorName } from '../model/optics.js';

const TAU = Math.PI * 2;

/** Clip everything drawn into the returned Draw to the rectangle (x, y, w, h). */
function clipped(d, id, x, y, w, hgt) {
  const cp = d.el('clipPath', { id });
  const r = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  for (const [k, v] of Object.entries({ x, y, width: w, height: hgt })) r.setAttribute(k, v);
  cp.append(r);
  const g = d.group();
  g.g.setAttribute('clip-path', `url(#${id})`);
  return g;
}

/** Points of the curve |r_lower - r_upper| = delta (a hyperbola), sources at (sx, cy -/+ dd/2), drawn to the right. */
function hyperbola(sx, cy, dd, delta, sign, xMax) {
  const a = delta / 2;
  const c = dd / 2;
  const b = Math.sqrt(Math.max(1e-9, c * c - a * a));
  const pts = [];
  for (let X = 0; X <= xMax - sx; X += 6) pts.push([sx + X, cy - sign * a * Math.sqrt(1 + (X * X) / (b * b))]);
  return pts;
}

// ---------- figure 1: ripple tank (top view) ----------
const RW = 640;
const RH = 330;
const RSX = 44;
const RCY = RH / 2;
const RV = 40; // px/s wave speed
function rippleDraw(d, p, t) {
  const { dd, lam } = p;
  const s1 = [RSX, RCY - dd / 2];
  const s2 = [RSX, RCY + dd / 2];
  const g = clipped(d, p.clip, RSX, 0, RW - RSX - 30, RH);
  const shift = (RV * t) % lam;
  for (const s of [s1, s2]) {
    for (let r = shift; r < 720; r += lam) if (r > 2) g.circle(s[0], s[1], r, { cls: 'ph-light', w: 1.6, opacity: 0.55 });
  }
  // nodal (dashed) and antinodal (solid) curves
  const xMax = RW - 30;
  for (let m = 0; (m + 0.5) * lam < dd; m++) {
    for (const sg of [1, -1]) g.poly(hyperbola(RSX, RCY, dd, (m + 0.5) * lam, sg, xMax), { cls: 'ph-mute', w: 1.6, dash: '6 5' });
  }
  for (let m = 0; m * lam < dd; m++) {
    for (const sg of m === 0 ? [1] : [1, -1]) g.poly(hyperbola(RSX, RCY, dd, m * lam, sg, xMax), { cls: 'ph-plot', w: 1.4, opacity: 0.7 });
  }
  // screen strip on the right: time-averaged brightness there
  const SX = RW - 22;
  for (let y = 0; y < RH; y += 3) {
    const I = twoWaveI(pathDifference(s1, s2, [SX, y + 1.5]), lam);
    d.rect(SX, y, 16, 3, { cls: 'ph-light', fill: true, style: `--fo: ${(0.05 + 0.9 * I).toFixed(2)}`, w: 0 });
  }
  d.rect(SX, 0, 16, RH, { cls: 'ph-mute', w: 1 });
  // barrier with two openings
  d.line(RSX, 0, RSX, s1[1] - 6, { cls: 'ph-wire', w: 3 });
  d.line(RSX, s1[1] + 6, RSX, s2[1] - 6, { cls: 'ph-wire', w: 3 });
  d.line(RSX, s2[1] + 6, RSX, RH, { cls: 'ph-wire', w: 3 });
  // incoming plane wave
  for (let x = shift - lam; x < RSX - 4; x += lam) if (x > 2) d.line(x, 10, x, RH - 10, { cls: 'ph-light', w: 1.6, opacity: 0.55 });
  d.text(RSX + 10, s1[1] - 12, 'S<sub>1</sub>', { cls: 'ph-label', anchor: 'start', halo: true });
  d.text(RSX + 10, s2[1] + 14, 'S<sub>2</sub>', { cls: 'ph-label', anchor: 'start', halo: true });
}

// ---------- figure 2: path difference at points on a screen ----------
const PD = 200; // slit separation (px)
const PL = 400; // slits to screen
const PLAM = 30;
const PSX = 70; // slit x
const PCY = 176;
const PBOX = [640, 352];
const wig = (a, b, lam, ph0, amp) => {
  // sinusoid along segment a->b (crest pattern moving away from a)
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const ux = (b[0] - a[0]) / L;
  const uy = (b[1] - a[1]) / L;
  const pts = [];
  for (let s = 0; s <= L; s += 3) {
    const w = amp * Math.sin((TAU * s) / lam - ph0);
    pts.push([a[0] + ux * s - uy * w, a[1] + uy * s + ux * w]);
  }
  return pts;
};
function pathDraw(d, p, t) {
  const S1 = [PSX, PCY - PD / 2];
  const S2 = [PSX, PCY + PD / 2];
  const SCX = PSX + PL;
  const P = [SCX, PCY - p.y];
  const r1 = Math.hypot(P[0] - S1[0], P[1] - S1[1]);
  const r2 = Math.hypot(P[0] - S2[0], P[1] - S2[1]);
  const delta = r2 - r1;
  const ph = TAU * 0.8 * t;
  // screen with its fringe pattern
  for (let y = 8; y < PBOX[1] - 8; y += 3) {
    const I = twoWaveI(pathDifference(S1, S2, [SCX, y + 1.5]), PLAM);
    d.rect(SCX, y, 10, 3, { cls: 'ph-light', fill: true, style: `--fo: ${(0.05 + 0.85 * I).toFixed(2)}`, w: 0 });
  }
  d.line(SCX, 8, SCX, PBOX[1] - 8, { cls: 'ph-mute', w: 1 });
  d.line(SCX - 6, PCY, SCX + 16, PCY, { cls: 'ph-mute', w: 1, dash: '3 3' });
  // barrier
  d.line(PSX, 6, PSX, S1[1] - 6, { cls: 'ph-wire', w: 3 });
  d.line(PSX, S1[1] + 6, PSX, S2[1] - 6, { cls: 'ph-wire', w: 3 });
  d.line(PSX, S2[1] + 6, PSX, PBOX[1] - 6, { cls: 'ph-wire', w: 3 });
  d.text(PSX - 10, S1[1], 'S<sub>1</sub>', { cls: 'ph-label', anchor: 'end' });
  d.text(PSX - 10, S2[1], 'S<sub>2</sub>', { cls: 'ph-label', anchor: 'end' });
  // the extra length on path 2
  const u = [(P[0] - S2[0]) / r2, (P[1] - S2[1]) / r2];
  const E0 = [S2[0] + u[0] * r1, S2[1] + u[1] * r1];
  if (delta > 1) d.line(E0[0], E0[1], P[0], P[1], { cls: 'ph-plot3', w: 9, opacity: 0.25 });
  d.poly(wig(S1, P, PLAM, ph, 6), { cls: 'ph-plot2', w: 1.8 });
  d.poly(wig(S2, P, PLAM, ph, 6), { cls: 'ph-plot3', w: 1.8 });
  // arc showing equal lengths r1 on both paths
  d.dot(E0[0], E0[1], { r: 3, cls: 'ph-plot3' });
  const I = twoWaveI(delta, PLAM);
  d.circle(P[0], P[1], 7, { cls: I > 0.5 ? 'ph-light' : 'ph-mute', fill: true, style: `--fo: ${(0.15 + 0.8 * I).toFixed(2)}`, w: 2 });
  d.text(P[0] - 12, P[1] - 16, 'P', { cls: 'ph-label', serif: true, anchor: 'end', halo: true });
  const k = delta / PLAM;
  d.text((E0[0] + P[0]) / 2 - 4, (E0[1] + P[1]) / 2 + 22, `\u0394 = ${k < 0.02 ? '0' : `${k.toFixed(2)}\u03bb`}`, { cls: 'ph-plot3', anchor: 'end', halo: true });
  // inset: the two waves arriving at P and their sum
  const ix = 500;
  const iw = 124;
  const rows = [
    ['from S<sub>1</sub>', (x) => Math.sin(x), 'ph-plot2'],
    ['from S<sub>2</sub>', (x) => Math.sin(x - TAU * k), 'ph-plot3'],
    ['sum', (x) => Math.sin(x) + Math.sin(x - TAU * k), 'ph-plot'],
  ];
  rows.forEach(([label, fn, cls], i) => {
    const y0 = 48 + i * 98;
    const pl = d.plot({ x: ix, y: y0, w: iw, h: 60, xr: [0, 2 * TAU], yr: [-2.1, 2.1], axes: false });
    pl.line(0, 0, 2 * TAU, 0, { cls: 'ph-mute', w: 1 });
    pl.fn(fn, { cls, w: 2 });
    d.text(ix, y0 - 8, label, { cls: 'ph-label', anchor: 'start' });
  });
  d.text(ix + iw, 48 + 2 * 98 + 76, I > 0.98 ? 'bright' : I < 0.02 ? 'dark' : 'in between', { cls: I > 0.5 ? 'ph-ray' : 'ph-label', anchor: 'end', size: 14 });
}
function pathFrames() {
  const pts = [0, 0.5, 1, 1.5, 2].map((k) => ({ k, y: screenPointForPath(k * PLAM, PD, PL) }));
  const cap = {
    0: 'Point P straight across from the slits. Both paths have the <b>same length</b>, so the waves arrive crest with crest: <b>constructive</b>, the bright central fringe (m = 0).',
    0.5: 'Move P up. Now the path from S<sub>2</sub> is longer by <b>\u0394 = \u00bd\u03bb</b> (shaded). Its wave arrives half a cycle late, crest on trough: they <b>cancel</b>. The first dark fringe.',
    1: 'Farther up: \u0394 = <b>1\u03bb</b>. One whole cycle late is the same as on time, so crest meets crest again: the <b>m = 1 bright fringe</b>.',
    1.5: '\u0394 = <b>1\u00bd\u03bb</b>: out of step again, so dark. Bright and dark simply alternate as \u0394 grows by half wavelengths.',
    2: '\u0394 = <b>2\u03bb</b>: bright (m = 2). In general: bright where \u0394 = m\u03bb, dark where \u0394 = (m + \u00bd)\u03bb.',
  };
  return pts.map(({ k, y }) => ({ draw: pathDraw, p: { y }, box: PBOX, live: true, caption: cap[k] }));
}

// ---------- figure 3: double-slit screen pattern (SI) ----------
const YR = 30; // mm, half range on the screen
function slitDraw(d, p) {
  const { lam, dd, L } = p;
  const x0 = 40;
  const w = 570;
  const Y = (ymm) => x0 + ((ymm + YR) / (2 * YR)) * w;
  const I = (ymm) => doubleSlitI(Math.atan(ymm / 1000 / L), lam, dd);
  // screen strip
  for (let px = 0; px < w; px += 2) {
    const ymm = -YR + ((px + 1) / w) * 2 * YR;
    d.rect(x0 + px, 18, 2, 34, { cls: 'ph-light', fill: true, style: `--fo: ${(0.04 + 0.9 * I(ymm)).toFixed(2)}`, w: 0 });
  }
  d.rect(x0, 18, w, 34, { cls: 'ph-mute', w: 1 });
  const pl = d.plot({ x: x0, y: 82, w, h: 120, xr: [-YR, YR], yr: [0, 1.1], xLabel: 'y (mm)', ticksX: [[-20, '\u221220'], [-10, '\u221210'], [0], [10], [20]] });
  pl.fn(I, { n: 1400, w: 1.8 });
  const dy = fringeSpacing(lam, L, dd) * 1000;
  if (dy < YR * 0.9 && dy > 1.2) {
    const yy = 1.06;
    pl.line(0, yy, dy, yy, { cls: 'ph-F', w: 1.2 });
    pl.line(0, yy - 0.05, 0, yy + 0.05, { cls: 'ph-F', w: 1.2 });
    pl.line(dy, yy - 0.05, dy, yy + 0.05, { cls: 'ph-F', w: 1.2 });
    pl.label(dy / 2, yy + 0.11, '\u0394y', { cls: 'ph-F', serif: true });
  }
}

// ---------- figure 4: thin film ----------
const FILMS = {
  soap: { label: 'Soap film in air', n1: 1, nf: 1.33, n3: 1, names: ['air', 'soap film', 'air'] },
  coat: { label: 'Coating on glass', n1: 1, nf: 1.38, n3: 1.5, names: ['air', 'MgF<sub>2</sub> coating', 'glass'] },
};
const VIS = [
  [400, 450, '--t1'],
  [450, 495, '--blue'],
  [495, 570, '--green'],
  [570, 590, '--yellow'],
  [590, 620, '--t3'],
  [620, 700, '--red'],
];
const tokenAt = (nm) => VIS.find(([a, b]) => nm >= a && nm < b)?.[2] ?? '--red';
function filmDraw(d, p) {
  const fm = FILMS[p.mode];
  const t = p.t * 1e-9;
  // cross-section
  const top = 120;
  const th = 30 + p.t * 0.09; // drawn thickness grows with t (not to scale)
  d.rect(0, top, 300, th, { cls: 'ph-glass', fill: true, style: '--fo: 0.22', w: 0 });
  if (fm.n3 > 1) d.rect(0, top + th, 300, 270 - top - th, { cls: 'ph-glass', fill: true, style: '--fo: 0.4', w: 0 });
  d.line(0, top, 300, top, { cls: 'ph-glass', w: 1.2 });
  d.line(0, top + th, 300, top + th, { cls: 'ph-glass', w: 1.2 });
  d.text(10, 24, `${fm.names[0]}  n = ${fm.n1.toFixed(2)}`, { cls: 'ph-label', anchor: 'start' });
  d.text(296, top + th / 2, `${fm.names[1]}  n = ${fm.nf.toFixed(2)}`, { cls: 'ph-label', anchor: 'end', halo: true });
  d.text(10, 258, `${fm.names[2]}  n = ${fm.n3.toFixed(2)}`, { cls: 'ph-label', anchor: 'start' });
  const ang = 0.42;
  const A = [80, top];
  const B = [80 + 2 * th * Math.tan(ang * 0.75), top];
  const Cb = [(A[0] + B[0]) / 2, top + th];
  const inStart = [A[0] - 90 * Math.tan(ang), top - 90];
  d.arrow(...inStart, ...A, { cls: 'ph-ray', w: 2.4 });
  d.arrow(...A, A[0] + 100 * Math.tan(ang), top - 100, { cls: 'ph-ray', w: 2.2 });
  d.line(...A, ...Cb, { cls: 'ph-ray', w: 2 });
  d.line(...Cb, ...B, { cls: 'ph-ray', w: 2 });
  d.arrow(...B, B[0] + 100 * Math.tan(ang), top - 100, { cls: 'ph-ray', w: 2.2 });
  d.text(A[0] + 100 * Math.tan(ang) - 4, top - 108, '1', { cls: 'ph-ray', size: 13 });
  d.text(B[0] + 100 * Math.tan(ang) + 4, top - 108, '2', { cls: 'ph-ray', size: 13 });
  const flipTop = fm.nf > fm.n1;
  const flipBot = fm.n3 > fm.nf;
  d.text(A[0] - 6, top + 14, flipTop ? '\u00bd\u03bb flip' : 'no flip', { cls: flipTop ? 'ph-bad' : 'ph-label', anchor: 'end', size: 11.5, halo: true });
  d.text(Cb[0] + 8, top + th + 14, flipBot ? '\u00bd\u03bb flip' : 'no flip', { cls: flipBot ? 'ph-bad' : 'ph-label', anchor: 'start', size: 11.5, halo: true });
  d.text(150, top + th + 34, `t = ${Math.round(p.t)} nm`, { cls: 'ph-label', halo: true });
  // reflectance vs wavelength
  const pl = d.plot({ x: 340, y: 40, w: 280, h: 150, xr: [400, 700], yr: [0, 1.1], xLabel: '\u03bb (nm)', yLabel: 'reflected', ticksX: [[400], [500], [600]] });
  const R = (nm) => thinFilm({ n1: fm.n1, nf: fm.nf, n3: fm.n3, t, lambda: nm * 1e-9 }).I;
  pl.fn(R, { w: 2 });
  for (const lam of reinforced({ n1: fm.n1, nf: fm.nf, n3: fm.n3, t }, 400e-9, 700e-9)) {
    pl.vline(lam * 1e9, { cls: 'ph-ray', dash: '3 3' });
  }
  // what the reflected light looks like: each color weighted by how strongly it reflects
  for (let nm = 400; nm < 700; nm += 5) {
    const x = pl.X(nm);
    d.rect(x, 232, pl.X(nm + 5) - x + 0.5, 26, { fill: true, style: `--c: var(${tokenAt(nm)}); --fo: ${(0.05 + 0.85 * R(nm + 2.5)).toFixed(2)}`, w: 0 });
  }
  d.text(480, 271, 'the reflected mix: deeper = stronger', { cls: 'ph-label', size: 11 });
}

// ---------- quiz ----------
const QD = 120;
const QLAM = 40;
const qS1 = [40, 140 - QD / 2];
const qS2 = [40, 140 + QD / 2];
// candidate points chosen by their path difference (in wavelengths): computed exactly with the model
const qPoints = [
  { id: 'qa', k: 1, side: -1 },
  { id: 'qb', k: 0.5, side: -1 },
  { id: 'qc', k: 0, side: 1 },
  { id: 'qd', k: 1, side: 1 },
].map((c) => {
  const y = screenPointForPath(c.k * QLAM, QD, 300);
  return { ...c, x: 40 + 300, y: 140 + c.side * (c.k ? y : 0) };
});
function qDraw(d, p) {
  d.line(40, 6, 40, qS1[1] - 5, { cls: 'ph-wire', w: 3 });
  d.line(40, qS1[1] + 5, 40, qS2[1] - 5, { cls: 'ph-wire', w: 3 });
  d.line(40, qS2[1] + 5, 40, 274, { cls: 'ph-wire', w: 3 });
  const g = clipped(d, 'q-int-clip', 40, 0, 330, 280);
  for (const s of [qS1, qS2]) for (let r = QLAM; r < 420; r += QLAM) g.circle(s[0], s[1], r, { cls: 'ph-light', w: 1.4, opacity: 0.5 });
  d.line(340, 6, 340, 274, { cls: 'ph-mute', w: 1 });
  qPoints.forEach((c, i) => {
    d.circle(c.x, c.y, 9, { id: c.id, fill: true, w: 2, style: '--fo: 0.15' });
    d.text(c.x + 16, c.y, 'ABCD'[i], { anchor: 'start', size: 14 });
    if (p.reveal) d.text(c.x - 14, c.y, `\u0394 = ${c.k}\u03bb`, { cls: 'ph-label', anchor: 'end', halo: true });
  });
}
const qAnswer = () => qPoints.filter((c) => twoWaveI(pathDifference(qS1, qS2, [c.x, c.y]), QLAM) < 0.01).map((c) => c.id);

const spacing = fringeSpacing(600e-9, 1.5, 0.2e-3) * 1000;

const quiz = [
  {
    type: 'mcq',
    id: 'interference.longer-lambda',
    prompt: 'In a double-slit experiment you switch from blue light to red light (longer \u03bb), keeping the slits and screen the same. The bright fringes\u2026',
    choices: ['move closer together', 'spread farther apart', 'stay where they are; only the color changes', 'disappear, because red light does not interfere'],
    answer: 1,
    explain: 'Fringe spacing is \u0394y = \u03bbL/d, proportional to \u03bb. Red (\u2248 650 nm) versus blue (\u2248 450 nm) spreads the pattern by 650/450 \u2248 1.4\u00d7. Each bright fringe needs a path difference of a whole wavelength, and a longer wavelength takes a bigger angle to build up.',
  },
  {
    type: 'input',
    id: 'interference.spacing',
    prompt: 'Light of 600 nm hits two slits 0.20 mm apart. The screen is 1.5 m away. What is the spacing between bright fringes, in mm?',
    placeholder: 'mm',
    accept: (s) => Math.abs(parseFloat(s) - spacing) < 0.05,
    explain: `\u0394y = \u03bbL/d = (600 \u00d7 10<sup>\u22129</sup> m)(1.5 m)/(0.20 \u00d7 10<sup>\u22123</sup> m) = <b>${spacing.toFixed(1)} mm</b>. Convert everything to meters first; mixing mm and nm is the usual source of a factor-of-1000 error.`,
  },
  {
    type: 'pick',
    id: 'interference.dark-point',
    prompt: 'Two slits send out waves (yellow circles are crests). Which point on the screen stays <b>dark</b>?',
    View: PhysView,
    view: { height: 280, box: [390, 280] },
    build: () => ({
      frame: { draw: qDraw, p: { reveal: 0 }, box: [390, 280] },
      answer: qAnswer(),
      after: { draw: qDraw, p: { reveal: 1 }, box: [390, 280] },
    }),
    explain: () => {
      const dark = qPoints.find((c) => c.id === qAnswer()[0]);
      const others = qPoints.filter((c) => c !== dark).map((c) => `${'ABCD'[qPoints.indexOf(c)]} (\u0394 = ${c.k}\u03bb)`).join(', ');
      return `Dark means the path difference is a half-odd number of wavelengths. Point <b>${'ABCD'[qPoints.indexOf(dark)]}</b> is ${dark.k}\u03bb farther from one slit than the other, so crest meets trough there. The others, ${others}, have whole-wavelength differences and are bright. In the picture, bright points are where crests from both slits cross; at the dark point a crest from one slit sits halfway between crests from the other.`;
    },
  },
  {
    type: 'mcq',
    id: 'interference.thin-soap',
    prompt: 'The top of a vertical soap film thins out to almost zero thickness and looks <b>black</b> in reflected light. Why?',
    choices: [
      'There is no film left there, so nothing reflects',
      'The two reflections are half a wavelength out of step: one flips at the air\u2192soap surface, the other does not',
      'Black means every wavelength is reinforced',
      'The film absorbs light when it is thin',
    ],
    answer: 1,
    explain: `The front reflection (air \u2192 soap, low to high n) gets a half-wave flip; the back one (soap \u2192 air) does not. With t \u2192 0 the extra path 2nt is zero, so the only difference is that flip, and the two reflected waves cancel for <b>every</b> wavelength (computed reflected intensity at t = 1 nm, 550 nm: ${thinFilm({ nf: 1.33, t: 1e-9, lambda: 550e-9 }).I.toFixed(3)}). The film is still there; it just reflects nothing.`,
  },
];

export default {
  id: 'interference',
  title: 'Interference',
  group: 'Light & optics',
  blurb: 'Two waves add crest by crest: path differences of whole wavelengths give bright fringes, half wavelengths give dark ones.',
  quiz,
  render(root) {
    root.append(
      p('Rays explain lenses, but not the colors of a soap bubble or the stripes behind two narrow slits. For those you need the fact that light is a <b>wave</b>, and waves obey <b>superposition</b>: where two waves overlap, their fields simply add. Two crests make a bigger crest (<b>constructive</b> interference); a crest and a trough cancel (<b>destructive</b>).'),
      p('Whether two waves from the same source arrive in step depends on how much farther one traveled. That extra distance is the <b>path difference</b> \u0394. Every interference problem in this course comes down to computing \u0394 and comparing it to the wavelength:'),
      equation({
        name: 'Interference conditions',
        eq: 'bright: \u0394 = m\u03bb \u2003\u2003 dark: \u0394 = (m + \u00bd)\u03bb',
        says: 'A whole number of wavelengths late is the same as on time: bright. Half a wavelength late (or 1\u00bd, 2\u00bd \u2026) puts crest on trough: dark. Only the path difference matters, not the total distance.',
        terms: [
          ['\u0394', 'path difference: extra distance one wave travels (plus any reflection phase shifts, below)', 'm'],
          ['m', 'order: 0, \u00b11, \u00b12, \u2026', ''],
          ['\u03bb', 'wavelength (in the medium the paths are in)', 'm'],
        ],
      }),
    );

    // ripple tank sandbox
    const rStage = h('div', { class: 'stage' });
    const rView = new PhysView(rStage, { height: 340, box: [RW, RH] });
    let dd = 120;
    let lam = 34;
    const rRedraw = () => rView.show({ draw: rippleDraw, p: { dd, lam, clip: 'ripple-clip' }, box: [RW, RH], live: true }, { animate: false });
    root.append(
      figure(
        {
          title: 'Two sources, seen from above',
          note: 'Yellow circles are wave crests spreading from the two openings. Solid dark curves: <b>antinodal lines</b> (always constructive, \u0394 = m\u03bb). Dashed: <b>nodal lines</b> (always cancelling). The strip at the right is the time-averaged brightness a screen would show. Spread the sources apart or shorten \u03bb: more lines, packed closer.',
        },
        rStage,
        controlsRow(
          slider({ label: 'Separation d', min: 40, max: 220, step: 2, value: dd, fmt: (v) => `${(v / lam).toFixed(1)}\u03bb`, onInput: (v) => ((dd = v), rRedraw()) }),
          slider({ label: 'Wavelength \u03bb', min: 20, max: 60, step: 1, value: lam, fmt: (v) => `${v} px`, onInput: (v) => ((lam = v), rRedraw()) }),
        ),
      ),
    );
    rRedraw();

    root.append(
      h('h2', { text: 'Young\u2019s double slit', class: 'reveal' }),
      p('In 1801 Thomas Young sent one beam of light through two narrow slits and saw stripes of light and dark on a far screen: the experiment that settled that light is a wave. One beam through two slits guarantees the two waves start in step, so only the path difference to each point on the screen decides the brightness. Follow a point P up the screen:'),
    );
    const host = h('div');
    root.append(figure({ title: 'Path difference decides bright or dark', note: 'Not to scale: real slits are a fraction of a millimeter apart and the screen is meters away. The shaded stretch is the extra length \u0394 of the path from S<sub>2</sub>. Right: the two waves as they arrive at P, and their sum.' }, host));
    new Player(host, { frames: pathFrames(), View: PhysView, view: { height: 360 } });

    root.append(
      p('With the screen far away (L \u226b d), the two paths are nearly parallel and the path difference is just ' + eq('\u0394 = d sin \u03b8') + ', where \u03b8 is the angle to P. That gives the bright-fringe condition and, for small angles, an evenly spaced row of fringes:'),
      equation({
        name: 'Double-slit bright fringes',
        eq: 'd sin \u03b8 = m\u03bb \u2003\u2003 \u0394y \u2248 <span class="frac"><span>\u03bbL</span><span>d</span></span>',
        says: 'Fringes are spaced by \u03bbL/d on the screen: <b>longer wavelength</b> or a <b>farther screen</b> spreads them out; <b>slits farther apart</b> squeeze them together. Between the bright fringes the intensity falls smoothly to zero (I \u221d cos\u00b2).',
        terms: [
          ['d', 'distance between the slit centers', 'm'],
          ['\u03b8', 'angle from the center line to the fringe', 'rad'],
          ['L', 'slits-to-screen distance', 'm'],
          ['\u0394y', 'distance between neighboring bright fringes on the screen (small angles)', 'm'],
        ],
      }),
    );

    // double-slit sandbox
    const dStage = h('div', { class: 'stage' });
    const dView = new PhysView(dStage, { height: 260, box: [640, 238] });
    let sl = { lam: 550e-9, dd: 0.15e-3, L: 1.5 };
    const dro = readouts([['dy', 'Fringe spacing \u0394y = \u03bbL/d'], ['t1', 'First bright fringe at \u03b8']]);
    const dRedraw = () => {
      dView.show({ draw: slitDraw, p: sl, box: [640, 238] }, { animate: false });
      dro.set({ dy: `${(fringeSpacing(sl.lam, sl.L, sl.dd) * 1000).toFixed(2)} mm`, t1: `${((Math.asin(sl.lam / sl.dd) * 180) / Math.PI).toFixed(3)}\u00b0` });
    };
    root.append(
      figure(
        { title: 'Sandbox: the double-slit pattern', note: 'Top: the screen as it looks. Below: the intensity, computed from I = cos\u00b2(\u03c0 d sin\u03b8/\u03bb) for ideal narrow slits. (Real slits also have a width, which dims the outer fringes: next chapter.) The fringe angles are tiny, a fraction of a degree, which is why the screen must be far away.' },
        dStage,
        controlsRow(
          slider({ label: 'Wavelength \u03bb', min: 400, max: 700, step: 5, value: 550, fmt: (v) => `${v} nm`, onInput: (v) => ((sl = { ...sl, lam: v * 1e-9 }), dRedraw()) }),
          slider({ label: 'Slit separation d', min: 0.05, max: 0.3, step: 0.005, value: 0.15, fmt: (v) => `${v.toFixed(3)} mm`, onInput: (v) => ((sl = { ...sl, dd: v * 1e-3 }), dRedraw()) }),
          slider({ label: 'Screen distance L', min: 0.5, max: 3, step: 0.05, value: 1.5, fmt: (v) => `${v.toFixed(2)} m`, onInput: (v) => ((sl = { ...sl, L: v }), dRedraw()) }),
        ),
        dro,
      ),
    );
    dRedraw();

    root.append(
      callout('key', 'The one idea', 'Compute the <b>path difference</b>, divide by \u03bb. Whole number: bright. Half-odd: dark. For two slits, \u0394 = d sin \u03b8, and fringe spacing \u03bbL/d grows with \u03bb and L and shrinks with d.'),
      h('h2', { text: 'Thin films', class: 'reveal' }),
      p('Soap bubbles and oil slicks are colored for the same reason. Light reflects from the <b>top</b> and the <b>bottom</b> of a thin film, and the second reflection travels an extra ' + eq('2nt') + ' (down and back through thickness t, in a material where the wavelength is shorter by n). There is one more rule: a reflection off a material with <b>higher</b> n flips the wave by half a wavelength (like a rope pulse reflecting off a fixed end); a reflection off a lower n does not.'),
      p('So count the flips first. <b>One</b> flip (soap film in air): reflection is strongest when ' + eq('2nt = (m + \u00bd)\u03bb') + '. <b>Zero or two</b> flips (a coating with an index between air and glass): strongest when ' + eq('2nt = m\u03bb') + ', and cancelled when ' + eq('2nt = (m + \u00bd)\u03bb') + '. An anti-reflective coating is a film a quarter wavelength thick (2nt = \u03bb/2) so the two reflections cancel in the middle of the visible range.'),
    );

    // thin film sandbox
    const fStage = h('div', { class: 'stage' });
    const fView = new PhysView(fStage, { height: 300, box: [640, 280] });
    let mode = 'soap';
    let tnm = 120;
    const fro = readouts([['f', 'Phase flips'], ['r', 'Strongest reflection'], ['c', 'Cancelled']]);
    const nmList = (arr) => (arr.length ? arr.map((l) => `${Math.round(l * 1e9)} nm (${colorName(l * 1e9) ?? '\u2014'})`).join(', ') : 'none in 400\u2013700 nm');
    const fRedraw = () => {
      const fm = FILMS[mode];
      const t = tnm * 1e-9;
      fView.show({ draw: filmDraw, p: { mode, t: tnm }, box: [640, 280] }, { animate: false });
      const flips = thinFilm({ n1: fm.n1, nf: fm.nf, n3: fm.n3, t, lambda: 1 }).flips;
      fro.set({
        f: `${flips} (${flips % 2 ? 'strong when 2nt = (m + \u00bd)\u03bb' : 'strong when 2nt = m\u03bb'})`,
        r: nmList(reinforced({ n1: fm.n1, nf: fm.nf, n3: fm.n3, t }, 400e-9, 700e-9)),
        c: nmList(cancelled({ n1: fm.n1, nf: fm.nf, n3: fm.n3, t }, 400e-9, 700e-9)),
      });
    };
    root.append(
      figure(
        {
          title: 'Sandbox: thin-film colors',
          tools: [segmented(Object.entries(FILMS).map(([value, f]) => ({ value, label: f.label })), mode, (v) => ((mode = v), fRedraw()))],
          note: 'Left: the two reflected rays (drawn at an angle for clarity; the formulas are for light hitting nearly straight on). Right: how strongly each visible wavelength reflects, with the reinforced ones dashed, and the resulting mix of colors underneath. Try the coating near 100 nm: reflection nearly vanishes across the middle of the spectrum.',
        },
        fStage,
        controlsRow(slider({ label: 'Thickness t', min: 0, max: 700, step: 2, value: tnm, fmt: (v) => `${v} nm`, onInput: (v) => ((tnm = v), fRedraw()) })),
        fro,
      ),
    );
    fRedraw();

    root.append(
      callout('warn', 'Classic mistakes', 'Forgetting the <b>half-wave flips</b> (count them for each reflection: low \u2192 high n flips, high \u2192 low does not), and using 2t instead of <b>2nt</b> (the wavelength inside the film is \u03bb/n). Also, the double-slit condition d sin\u03b8 = m\u03bb gives <b>bright</b> fringes; the single-slit formula in the next chapter looks the same but gives dark ones.'),
      checkpoint(quiz),
    );
  },
};
