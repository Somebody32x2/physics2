import { h, p } from '../ui/dom.js';
import { Player } from '../ui/player.js';
import { PhysView } from '../core/phys-view.js';
import { figure, callout, segmented } from '../ui/figure.js';
import { checkpoint } from '../ui/quiz.js';
import { equation, eq, slider, controlsRow, readouts } from '../ui/controls.js';
import { C, EPS0, MU0, lightSpeed, frequency, band, BANDS, colorName, polarizerChain, toRad, sci } from '../model/optics.js';

const TAU = Math.PI * 2;

// ---------- figure 1: an antenna launches a wave (side view: E in the page, B into/out of the page) ----------
// p: { osc (0 static .. 1 oscillating), showB (0..1), labels (0..1), w (angular frequency, rad/s) }
const AX = 64;
const AY = 132;
const BROW = 262;
const V = 110; // px per second: the "speed of light" in this picture
function antennaDraw(d, p, t) {
  const q = (tt) => (1 - p.osc) + p.osc * Math.cos(p.w * tt);
  const qNow = q(t);
  const front = p.osc > 0.5 ? V * t : 150;
  // antenna with an AC source in the middle
  d.line(AX, 66, AX, AY - 12, { cls: 'ph-wire', w: 3 });
  d.line(AX, AY + 12, AX, 198, { cls: 'ph-wire', w: 3 });
  d.circle(AX, AY, 12, { cls: 'ph-wire', opacity: 0.4 + 0.6 * p.osc });
  d.path(`M${AX - 7} ${AY}q3.5 -7 7 0t7 0`, { cls: 'ph-wire', opacity: 0.4 + 0.6 * p.osc });
  const r = 7 + 7 * Math.abs(qNow);
  d.charge(AX, 52, qNow, { r, label: Math.abs(qNow) < 0.25 ? '' : qNow > 0 ? '+' : '\u2212' });
  d.charge(AX, 212, -qNow, { r, label: Math.abs(qNow) < 0.25 ? '' : qNow > 0 ? '\u2212' : '+' });
  // current in the antenna: I = dq/dt (up when the top charge grows)
  const I = -p.osc * Math.sin(p.w * t);
  if (Math.abs(I) > 0.08) d.arrow(AX - 22, AY + 30 * I, AX - 22, AY - 30 * I, { cls: 'ph-I', w: 2.4 });
  if (p.osc > 0.5) d.text(AX - 34, AY, 'I', { cls: 'ph-I', serif: true, anchor: 'end' });

  // axis to the right
  d.line(AX + 20, AY, 626, AY, { cls: 'ph-axis', w: 1 });
  d.line(AX + 20, BROW, 626, BROW, { cls: 'ph-mute', w: 1 });
  d.text(AX + 6, BROW - 22, 'B', { cls: 'ph-B', serif: true, anchor: 'start' });
  d.text(AX + 22, BROW - 22, '(into / out of page)', { cls: 'ph-label', anchor: 'start', size: 11 });
  for (let x = AX + 36; x <= 620; x += 12) {
    const dx = x - AX;
    // static dipole field fades fast; the radiated ripple keeps its size and exists only behind the front
    const stat = (1 - p.osc) / (1 + (dx / 70) ** 3);
    const rad = dx < front ? p.osc * Math.cos(p.w * (t - dx / V)) : 0;
    const E = stat + rad; // > 0: points DOWN (from + on top to - below)
    if (Math.abs(E) > 0.04) d.arrow(x, AY, x, AY + 72 * E, { cls: 'ph-E', w: 1.8, head: 7 });
    const B = rad * p.showB;
    if (Math.abs(B) > 0.12 && (x - AX - 36) % 24 === 0) {
      const o = { r: 2 + 5 * Math.abs(B), opacity: (0.35 + 0.65 * Math.abs(B)).toFixed(2) };
      if (B > 0) d.bIn(x, BROW, o);
      else d.bOut(x, BROW, o);
    }
  }
  if (p.osc > 0.5 && front < 610) {
    d.line(AX + front, 30, AX + front, BROW + 12, { cls: 'ph-mute', dash: '5 5' });
    d.text(AX + front + 6, 36, 'front', { cls: 'ph-label', anchor: 'start' });
  }
  d.text(622, AY - 84, 'E', { cls: 'ph-E', serif: true, size: 20 });
  if (p.labels > 0.01) {
    const lam = (V * TAU) / p.w;
    const x0 = 230;
    const g = d.group({ opacity: p.labels.toFixed(2) });
    g.line(x0, 30, x0 + lam, 30, { cls: 'ph-F', w: 1.2 });
    g.line(x0, 24, x0, 36, { cls: 'ph-F', w: 1.2 });
    g.line(x0 + lam, 24, x0 + lam, 36, { cls: 'ph-F', w: 1.2 });
    g.text(x0 + lam / 2, 16, '\u03bb', { cls: 'ph-F', serif: true, size: 18 });
    g.arrow(560, 18, 620, 18, { cls: 'ph-F', w: 2 });
    g.text(548, 18, 'c', { cls: 'ph-F', serif: true, anchor: 'end' });
  }
}

const W0 = TAU * 0.5; // one oscillation every 2 s on screen
function antennaFrames() {
  const box = [640, 290];
  const f = (p, caption, extra = {}) => ({ draw: antennaDraw, p, box, live: true, caption, ...extra });
  const lam0 = (V * TAU) / W0;
  return [
    f({ osc: 0, showB: 0, labels: 0, w: W0 }, 'Two charges at rest on the ends of a wire (an <b>antenna</b>). Their field is the static E from the first chapters: it points from + to \u2212 and <b>fades fast</b> with distance. Nothing moves, nothing travels.', { live: false }),
    f({ osc: 1, showB: 0, labels: 0, w: W0 }, 'Now an AC source <b>sloshes the charges</b> up and down. The field next to the antenna flips with them, but each flip does <b>not</b> show up everywhere at once: the news spreads outward at a finite speed. Behind the dashed front, a ripple of E.', { resetTime: true }),
    f({ osc: 1, showB: 1, labels: 0, w: W0 }, 'The ripple is not E alone. A <b>changing E makes B</b> (Amp\u00e8re\u2013Maxwell) and a <b>changing B makes E</b> (Faraday). Each regenerates the other a little farther along, so the pair carries itself away from the antenna. That self-sustaining pair is an <b>electromagnetic wave</b>.'),
    f({ osc: 1, showB: 1, labels: 1, w: W0 }, `Far out: E (up/down in the page) and B (into/out of the page) are <b>perpendicular</b> to each other and to the direction of travel, peak at the <b>same places</b> (in phase), and E = cB everywhere. Crest to crest is one wavelength \u03bb (here ${Math.round(lam0)} px).`),
    f({ osc: 1, showB: 1, labels: 1, w: 2 * W0 }, `Wiggle the charges <b>twice as fast</b>. The frequency doubles, so the wavelength <b>halves</b> (${Math.round(lam0 / 2)} px), and the front moves at exactly the same speed. Speed is fixed by the vacuum, so c = f\u03bb ties f and \u03bb together.`, { resetTime: true }),
  ];
}

// ---------- figure 2: 3D traveling wave (oblique projection) ----------
// physics coords: x along travel, y up (E), z toward the viewer (B). Screen: z goes down-left.
const OX = 72;
const OY = 138;
const ZX = -0.5;
const ZY = 0.42;
const proj = (x, y, z) => [OX + x + z * ZX, OY - y + z * ZY];
const WL = 490; // drawn length along x
const EA = 82;
const BA = 110;
function waveDraw(d, p, t) {
  const k = TAU / p.lam;
  const ph = (x) => Math.sin(k * x - k * p.v * t);
  // planes (faint)
  const plane = (pts, cls) => d.poly(pts.map((q) => proj(...q)), { cls, closed: true, fill: true, w: 0.8, opacity: 0.55 });
  if (p.showE) plane([[0, EA, 0], [WL, EA, 0], [WL, -EA, 0], [0, -EA, 0]], 'ph-E');
  if (p.showB) plane([[0, 0, BA], [WL, 0, BA], [WL, 0, -BA], [0, 0, -BA]], 'ph-B');
  // B behind, then axis, then E
  const n = 160;
  const curve = (fn) => Array.from({ length: n + 1 }, (_, i) => fn((WL * i) / n));
  if (p.showB) {
    const g = d.group({ cls: 'ph-B' });
    for (let x = 0; x <= WL; x += 13) g.line(...proj(x, 0, 0), ...proj(x, 0, BA * ph(x)), { w: 1.1, opacity: 0.75 });
    g.poly(curve((x) => proj(x, 0, BA * ph(x))), { w: 2.4 });
  }
  d.arrow(...proj(-10, 0, 0), ...proj(WL + 40, 0, 0), { cls: 'ph-axis', w: 1.4 });
  d.text(...proj(WL + 36, 16, 0), 'travel', { cls: 'ph-label', anchor: 'end', halo: true });
  if (p.showE) {
    const g = d.group({ cls: 'ph-E' });
    for (let x = 0; x <= WL; x += 13) g.line(...proj(x, 0, 0), ...proj(x, EA * ph(x), 0), { w: 1.1, opacity: 0.75 });
    g.poly(curve((x) => proj(x, EA * ph(x), 0)), { w: 2.4 });
    d.text(...proj(-6, EA + 6, 0), 'E', { cls: 'ph-E', serif: true, size: 20, anchor: 'end' });
  }
  if (p.showB) d.text(...proj(WL + 14, 0, BA), 'B', { cls: 'ph-B', serif: true, size: 20, anchor: 'start' });
  // wavelength bracket on top
  const x0 = 40;
  const [a1, b1] = proj(x0, EA + 20, 0);
  const [a2] = proj(x0 + p.lam, EA + 20, 0);
  if (x0 + p.lam <= WL) {
    d.line(a1, b1, a2, b1, { cls: 'ph-F', w: 1.2 });
    d.line(a1, b1 - 6, a1, b1 + 6, { cls: 'ph-F', w: 1.2 });
    d.line(a2, b1 - 6, a2, b1 + 6, { cls: 'ph-F', w: 1.2 });
    d.text((a1 + a2) / 2, b1 - 12, '\u03bb', { cls: 'ph-F', serif: true, size: 18 });
  }
}

// ---------- figure 3: the spectrum ----------
const SL = [-13, 4]; // log10 range of wavelength (m)
const SX0 = 24;
const SX1 = 616;
const sx = (lg) => SX0 + ((lg - SL[0]) / (SL[1] - SL[0])) * (SX1 - SX0);
const VIS = [
  ['violet', 400, 450, '--t1'],
  ['blue', 450, 495, '--blue'],
  ['green', 495, 570, '--green'],
  ['yellow', 570, 590, '--yellow'],
  ['orange', 590, 620, '--t3'],
  ['red', 620, 700, '--red'],
];
const ZX0 = 120;
const ZX1 = 520;
const zx = (nm) => ZX0 + ((nm - 400) / 300) * (ZX1 - ZX0);
const SHORT = { 'Gamma rays': 'gamma', 'X-rays': 'X-ray', Ultraviolet: 'UV', Visible: '', Infrared: 'infrared', Microwaves: 'micro', Radio: 'radio' };
function spectrumDraw(d, p) {
  const y0 = 54;
  const y1 = 90;
  d.text(SX0, 22, '\u2190 higher frequency', { cls: 'ph-label', anchor: 'start' });
  d.text(SX1, 22, 'longer wavelength \u2192', { cls: 'ph-label', anchor: 'end' });
  BANDS.forEach((b, i) => {
    const a = sx(Math.max(SL[0], b.min > 0 ? Math.log10(b.min) : SL[0]));
    const z = sx(Math.min(SL[1], Number.isFinite(b.max) ? Math.log10(b.max) : SL[1]));
    if (b.name === 'Visible') return;
    d.rect(a, y0, z - a, y1 - y0, { cls: 'ph-mute', fill: true, style: `--fo: ${i % 2 ? 0.25 : 0.1}`, w: 1 });
    d.text((a + z) / 2, (y0 + y1) / 2, SHORT[b.name], { cls: 'ph-label', size: 12 });
  });
  // visible band: tiny on the log bar, expanded below
  VIS.forEach(([, lo, hi, tok]) => d.rect(sx(Math.log10(lo * 1e-9)), y0, sx(Math.log10(hi * 1e-9)) - sx(Math.log10(lo * 1e-9)), y1 - y0, { fill: true, style: `--c: var(${tok}); --fo: 0.7`, w: 0 }));
  const va = sx(Math.log10(400e-9));
  const vb = sx(Math.log10(700e-9));
  for (const [lg, s] of [[-12, '1 pm'], [-9, '1 nm'], [-6, '1 \u03bcm'], [-3, '1 mm'], [0, '1 m'], [3, '1 km']]) {
    d.line(sx(lg), y1, sx(lg), y1 + 5, { cls: 'ph-axis' });
    d.text(sx(lg), y1 + 16, s, { cls: 'ph-label', size: 11.5 });
  }
  const zy0 = 146;
  const zy1 = 172;
  d.poly([[va, y1], [ZX0, zy0], [ZX1, zy0], [vb, y1]], { cls: 'ph-mute', fill: true, style: '--fo: 0.06', w: 0.8, dash: '3 3' });
  VIS.forEach(([name, lo, hi, tok]) => {
    d.rect(zx(lo), zy0, zx(hi) - zx(lo), zy1 - zy0, { fill: true, style: `--c: var(${tok}); --fo: 0.55`, w: 0 });
    d.text((zx(lo) + zx(hi)) / 2, zy1 + (name === 'orange' ? 30 : 14), name, { cls: 'ph-label', size: 11.5 });
  });
  d.text(ZX0 - 8, (zy0 + zy1) / 2, '400 nm', { cls: 'ph-label', anchor: 'end', size: 11.5 });
  d.text(ZX1 + 8, (zy0 + zy1) / 2, '700 nm', { cls: 'ph-label', anchor: 'start', size: 11.5 });
  // marker
  const mx = sx(p.lg);
  d.line(mx, y0 - 10, mx, y1 + 2, { w: 2.4 });
  d.path(`M${mx - 6} ${y0 - 16}L${mx + 6} ${y0 - 16}L${mx} ${y0 - 6}Z`, { cls: 'ph-solid' });
  const nm = 10 ** p.lg * 1e9;
  if (nm >= 400 && nm <= 700) {
    d.line(zx(nm), zy0 - 6, zx(nm), zy1 + 2, { w: 2.4 });
    d.path(`M${zx(nm) - 6} ${zy0 - 12}L${zx(nm) + 6} ${zy0 - 12}L${zx(nm)} ${zy0 - 2}Z`, { cls: 'ph-solid' });
  }
}

const SIZES = [
  [1e-14, 'an atomic nucleus'],
  [1e-10, 'an atom'],
  [1e-8, 'a large molecule'],
  [1e-7, 'a virus'],
  [1e-5, 'a cell'],
  [1e-4, 'the width of a hair'],
  [1e-2, 'a fingertip'],
  [1, 'a person'],
  [1e2, 'a football field'],
  [1e3, 'about ten city blocks'],
];
const sizeOf = (lam) => SIZES.reduce((best, s) => (Math.abs(Math.log10(s[0] / lam)) < Math.abs(Math.log10(best[0] / lam)) ? s : best))[1];
const USES = {
  'Gamma rays': 'nuclear decay, cancer therapy',
  'X-rays': 'medical imaging, crystal structure',
  Ultraviolet: 'sunburn, black lights',
  Visible: 'what your eyes detect',
  Infrared: 'heat radiation, TV remotes',
  Microwaves: 'ovens, Wi-Fi (12 cm), radar',
  Radio: 'FM (3 m), AM (300 m)',
};
function fmtLen(lam) {
  if (lam < 1e-9) return `${(lam * 1e12).toPrecision(3)} pm`;
  if (lam < 1e-6) return `${(lam * 1e9).toPrecision(3)} nm`;
  if (lam < 1e-3) return `${(lam * 1e6).toPrecision(3)} \u03bcm`;
  if (lam < 1) return `${(lam * 1e3).toPrecision(3)} mm`;
  if (lam < 1e3) return `${lam.toPrecision(3)} m`;
  return `${(lam / 1e3).toPrecision(3)} km`;
}

// ---------- figure 4: polarizers (looking along the beam at each station) ----------
// p: { th (deg), three (0|1) }
function polarDraw(d, p) {
  const axes = p.three ? [0, p.th, 90] : [0, p.th];
  const I = polarizerChain(1, axes.map(toRad));
  const n = axes.length;
  const y = 104;
  const x0 = 60;
  const step = p.three ? 112 : 150;
  const px = (i) => x0 + 92 + i * step; // polarizer centers
  const R = 40;
  const barX = 596;
  // beam: brightness per segment
  const segs = [[x0, px(0), 1]];
  for (let i = 0; i < n; i++) segs.push([px(i), i === n - 1 ? barX - 20 : px(i + 1), I[i]]);
  for (const [a, b, inten] of segs) if (inten > 1e-4) d.line(a, y, b, y, { cls: 'ph-light', w: 2 + 14 * inten, opacity: 0.3 + 0.4 * inten });
  // E double arrows between stations
  const dbl = (cx, ang, len) => {
    const s = Math.sin(toRad(ang));
    const c = -Math.cos(toRad(ang));
    if (len < 2) return;
    d.arrow(cx, y, cx + s * len, y + c * len, { cls: 'ph-E', w: 2, head: 7 });
    d.arrow(cx, y, cx - s * len, y - c * len, { cls: 'ph-E', w: 2, head: 7 });
  };
  for (const a of [0, 45, 90, 135]) dbl(x0, a, 28);
  d.text(x0, y + 58, 'unpolarized', { cls: 'ph-label' });
  d.text(x0, y + 74, 'I<sub>0</sub>', { cls: 'ph-label' });
  for (let i = 0; i < n; i++) {
    const cx = px(i);
    d.circle(cx, y, R, { cls: 'ph-glass', fill: true });
    const s = Math.sin(toRad(axes[i]));
    const c = -Math.cos(toRad(axes[i]));
    for (const off of [-24, -12, 12, 24]) {
      const half = Math.sqrt(R * R - off * off) - 3;
      const mx = cx - c * off;
      const my = y + s * off;
      d.line(mx - s * half, my - c * half, mx + s * half, my + c * half, { cls: 'ph-mute', w: 1 });
    }
    d.line(cx - s * (R - 2), y - c * (R - 2), cx + s * (R - 2), y + c * (R - 2), { cls: 'ph-glass', w: 2.4 });
    d.text(cx, y + 58, i === 1 ? `\u03b8 = ${Math.round(axes[i])}\u00b0` : `${Math.round(axes[i])}\u00b0`, { cls: 'ph-label' });
    d.text(cx, y - 56, `polarizer ${i + 1}`, { cls: 'ph-label', size: 11.5 });
    const mid = i === n - 1 ? (cx + barX - 20) / 2 : (cx + px(i + 1)) / 2;
    dbl(mid, axes[i], 30 * Math.sqrt(I[i] / 0.5));
    d.text(mid, y + 74, `${I[i].toFixed(3)} I<sub>0</sub>`, { cls: 'ph-label' });
  }
  // intensity bar
  const top = 40;
  const hgt = 130;
  d.rect(barX - 10, top, 20, hgt, { cls: 'ph-mute', w: 1 });
  const frac = I[n - 1] / 0.5;
  d.rect(barX - 10, top + hgt * (1 - frac), 20, hgt * frac, { cls: 'ph-light', fill: true, style: '--fo: 0.7', w: 0 });
  d.text(barX, top - 14, 'out', { cls: 'ph-label' });
  d.text(barX, top + hgt + 14, 'I<sub>0</sub>/2', { cls: 'ph-tick' });
}

// ---------- quiz helpers ----------
// candidate B directions at a point, with E up and travel to the right
const CANDS = [
  { id: 'zplus', v: [0, 0, 1] },
  { id: 'zminus', v: [0, 0, -1] },
  { id: 'ydown', v: [0, -1, 0] },
  { id: 'xminus', v: [-1, 0, 0] },
];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const bAnswer = () => CANDS.find((c) => {
  const s = cross([0, 1, 0], c.v); // E x B must point along +x (travel)
  return s[0] > 0.99;
}).id;
function bPickDraw(d, p) {
  const o = [250, 130];
  const P = (x, y, z, L) => [o[0] + L * (x + z * ZX * 1.3), o[1] - L * (y - z * ZY * 1.3)];
  d.arrow(...o, ...P(1, 0, 0, 150), { cls: 'ph-axis', w: 2 });
  d.text(...P(1.1, 0.12, 0, 150), 'travel', { cls: 'ph-label', anchor: 'start' });
  d.arrow(...o, ...P(0, 1, 0, 95), { cls: 'ph-E', w: 3 });
  d.text(...P(0.12, 1, 0, 95), 'E', { cls: 'ph-E', serif: true, size: 20, anchor: 'start' });
  CANDS.forEach((c, i) => {
    const g = d.group({ id: c.id, cls: 'ph-F' });
    const end = P(...c.v, 95);
    g.arrow(...o, ...end, { w: 2.6 });
    g.line(...o, ...end, { w: 16, style: 'stroke-opacity: 0' });
    const lab = P(...c.v, 118);
    g.text(lab[0], lab[1], String(i + 1), { size: 15 });
    if (i === 0) g.text(lab[0], lab[1] + 16, '(toward you)', { cls: 'ph-label', size: 11 });
    if (i === 1) g.text(lab[0] + 12, lab[1], '(into the screen)', { cls: 'ph-label', size: 11, anchor: 'start' });
  });
  if (p.reveal) d.text(16, 20, 'E \u00d7 B points along the travel', { cls: 'ph-label', anchor: 'start' });
}

const quiz = [
  {
    type: 'pick',
    id: 'em-waves.b-direction',
    prompt: 'A light wave travels to the right. At this instant its <b>E</b> points up. Which arrow is <b>B</b> at the same point? (Drawn in 3D: arrow 1 points out of the screen toward you, arrow 2 into the screen.)',
    View: PhysView,
    view: { height: 260, box: [520, 260] },
    build: () => ({
      frame: { draw: bPickDraw, p: { reveal: 0 }, box: [520, 260] },
      answer: [bAnswer()],
      after: { draw: bPickDraw, p: { reveal: 1 }, box: [520, 260] },
    }),
    explain: () => `E, B and the direction of travel form a right-handed set: <b>E \u00d7 B points the way the wave moves</b>. Point the fingers of your right hand up (along E) and curl them toward arrow <b>${CANDS.findIndex((c) => c.id === bAnswer()) + 1}</b> (out of the screen): your thumb points right, along the travel. B is perpendicular to E (never opposite to it) and perpendicular to the travel (light is transverse), which rules out arrows 3 and 4.`,
  },
  {
    type: 'input',
    id: 'em-waves.frequency',
    prompt: 'Green light has \u03bb = 500 nm. Its frequency is how many times 10<sup>14</sup> Hz? (Use c = 3.0 \u00d7 10<sup>8</sup> m/s.)',
    placeholder: 'e.g. 4.2',
    accept: (s) => Math.abs(parseFloat(s) - frequency(500e-9, 3e8) / 1e14) < 0.05,
    explain: `f = c/\u03bb = (3.0 \u00d7 10<sup>8</sup> m/s) / (500 \u00d7 10<sup>\u22129</sup> m) = <b>${(frequency(500e-9, 3e8) / 1e14).toFixed(1)} \u00d7 10<sup>14</sup> Hz</b>. Visible light oscillates about 600 trillion times per second; that is why no circuit can follow it directly.`,
  },
  {
    type: 'input',
    id: 'em-waves.malus',
    prompt: 'Unpolarized light of intensity I<sub>0</sub> passes through two polarizers whose axes are 60\u00b0 apart. What fraction of I<sub>0</sub> comes out? (decimal)',
    placeholder: 'fraction',
    accept: (s) => {
      const v = s.includes('/') ? s.split('/').map(Number).reduce((a, b) => a / b) : parseFloat(s);
      return Math.abs(v - polarizerChain(1, [0, toRad(60)])[1]) < 0.002;
    },
    explain: `The first polarizer passes half of unpolarized light: I<sub>0</sub>/2. The second applies Malus: (I<sub>0</sub>/2) cos<sup>2</sup>60\u00b0 = (I<sub>0</sub>/2)(1/4) = <b>${polarizerChain(1, [0, toRad(60)])[1].toFixed(3)} I<sub>0</sub></b>. The classic slip is using cos 60\u00b0 instead of cos<sup>2</sup>, or forgetting the first factor of 1/2.`,
  },
  {
    type: 'mcq',
    id: 'em-waves.three-polarizers',
    prompt: 'Two crossed polarizers (0\u00b0 and 90\u00b0) block all light. You slide a third polarizer at 45\u00b0 <b>between</b> them. What comes out, starting from unpolarized I<sub>0</sub>?',
    choices: ['Still nothing: adding a filter can only remove light', `I<sub>0</sub>/${Math.round(1 / polarizerChain(1, [0, toRad(45), toRad(90)])[2])}`, 'I<sub>0</sub>/4', 'I<sub>0</sub>/2'],
    answer: 1,
    explain: `Each polarizer re-polarizes the light along its own axis. I<sub>0</sub> \u2192 I<sub>0</sub>/2 (first) \u2192 (I<sub>0</sub>/2)cos<sup>2</sup>45\u00b0 = I<sub>0</sub>/4 (middle) \u2192 (I<sub>0</sub>/4)cos<sup>2</sup>45\u00b0 = <b>I<sub>0</sub>/${Math.round(1 / polarizerChain(1, [0, toRad(45), toRad(90)])[2])}</b>. The middle filter turns the polarization halfway, so the last one is no longer at 90\u00b0 to the light.`,
  },
];

export default {
  id: 'em-waves',
  title: 'Electromagnetic waves',
  group: 'Light & optics',
  blurb: "Maxwell's four equations predict waves of E and B that travel at c: light, radio and X-rays are all the same thing.",
  quiz,
  render(root) {
    const c = lightSpeed(MU0, EPS0);
    root.append(
      p('Everything so far comes down to <b>four statements</b> about what makes electric and magnetic fields. Together they are <b>Maxwell\u2019s equations</b>. You have already met all four; here they are side by side as sentences, without the integrals:'),
      h('div', { class: 'table-wrap reveal' },
        h('table', { html: `
          <thead><tr><th>Law</th><th>What makes what</th><th>Says</th></tr></thead>
          <tbody>
            <tr><td>Gauss (E)</td><td>charge \u2192 E</td><td>E field lines start on + charges and end on \u2212 charges. Flux out of a closed surface \u221d charge inside.</td></tr>
            <tr><td>Gauss (B)</td><td>nothing \u2192 net B flux</td><td>B field lines never start or stop: <b>no magnetic monopoles</b>. Net B flux out of any closed surface is zero.</td></tr>
            <tr><td>Faraday</td><td>changing B \u2192 E</td><td>A changing magnetic flux makes a circulating E (the induced emf of the induction chapter).</td></tr>
            <tr><td>Amp\u00e8re\u2013Maxwell</td><td>current <b>and</b> changing E \u2192 B</td><td>Currents make circulating B, and so does a changing electric flux (Maxwell\u2019s addition).</td></tr>
          </tbody>` }),
      ),
      p('Read the last two rows together. A changing B makes an E, and a changing E makes a B. So once you shake a charge, the fields it disturbs can <b>keep regenerating each other</b>, with no charges or wires needed, and the disturbance travels. Maxwell worked out the speed of that travel from the two constants you already know from electrostatics (' + eq('\u03b5<sub>0</sub>') + ') and magnetostatics (' + eq('\u03bc<sub>0</sub>') + '):'),
      equation({
        name: 'Speed of electromagnetic waves',
        eq: 'c = <span class="frac"><span>1</span><span>\u221a<span style="text-decoration: overline">\u03bc<sub>0</sub>\u03b5<sub>0</sub></span></span></span>',
        says: `Plugging in the table values gives ${sci(c, 3)} m/s, exactly the measured speed of light. Two constants from experiments with charges and coils predict the speed of light: <b>light is an electromagnetic wave</b>.`,
        terms: [
          ['c', 'speed of every electromagnetic wave in vacuum, any frequency', 'm/s'],
          ['\u03bc<sub>0</sub>', `permeability of free space, ${sci(MU0, 3)} (\u2248 4\u03c0 \u00d7 10<sup>\u22127</sup>)`, 'T\u00b7m/A'],
          ['\u03b5<sub>0</sub>', `permittivity of free space, ${sci(EPS0, 3)}`, 'C\u00b2/(N\u00b7m\u00b2)'],
        ],
      }),
      p('The figure shows how an antenna launches such a wave. Step through it; the arrows are the E field along a line out to the right of the antenna, and the row of \u2297/\u2299 marks underneath is B (\u2297 into the page, \u2299 out of it).'),
    );

    const host = h('div');
    root.append(figure({ title: 'An antenna launches a wave', note: 'Slowed down about 10<sup>8</sup> times. Orange arrows: E along the line to the right of the antenna. Purple: B. Teal: current in the antenna.' }, host));
    new Player(host, { frames: antennaFrames(), View: PhysView, view: { height: 300 } });

    root.append(
      equation({
        name: 'The two wave relations',
        eq: 'c = f\u03bb \u2003\u2003 E = cB',
        says: 'The first is true of any wave: speed = frequency \u00d7 wavelength. In vacuum the speed is fixed, so <b>higher f means shorter \u03bb</b>. The second says the fields\u2019 sizes are locked together: at every point and instant, E is c times B.',
        terms: [
          ['f', 'frequency: oscillations per second at a fixed point', 'Hz'],
          ['\u03bb', 'wavelength: distance between neighboring crests', 'm'],
          ['E, B', 'field magnitudes at the same point and time (they peak together)', 'V/m, T'],
        ],
      }),
      callout('key', 'The picture to keep', 'Light is a transverse wave of E and B. <b>E \u22a5 B \u22a5 direction of travel</b>, with E \u00d7 B pointing along the travel. They oscillate <b>in phase</b>, E = cB, and in vacuum every frequency moves at the same c.'),
    );

    // ---- sandbox: 3D wave with wavelength slider
    const wStage = h('div', { class: 'stage' });
    const wView = new PhysView(wStage, { height: 300, box: [640, 250] });
    let lamM = 2; // meters (100 px per m)
    let show = 'both';
    const wro = readouts([['l', 'Wavelength'], ['f', 'Frequency f = c/\u03bb'], ['T', 'Period']]);
    const wRedraw = () => {
      wView.show({ draw: waveDraw, p: { lam: lamM * 100, v: 120, showE: show !== 'B', showB: show !== 'E' }, box: [640, 250], live: true }, { animate: false });
      const f = frequency(lamM);
      wro.set({ l: `${lamM.toFixed(2)} m`, f: `${(f / 1e6).toFixed(0)} MHz`, T: `${sci(1 / f)} s` });
    };
    root.append(
      figure(
        {
          title: 'A traveling wave in 3D',
          tools: [segmented([{ value: 'both', label: 'E and B' }, { value: 'E', label: 'E only' }, { value: 'B', label: 'B only' }], 'both', (v) => ((show = v), wRedraw()))],
          note: 'Drawn in perspective: E oscillates in the vertical plane, B in the horizontal plane. Shorten \u03bb and watch any one point: it wiggles faster, because the wave still moves at the same speed. (A radio-wave scale, slowed down about 10<sup>8</sup>\u00d7.)',
        },
        wStage,
        controlsRow(slider({ label: 'Wavelength \u03bb', min: 1.2, max: 4, step: 0.05, value: lamM, fmt: (v) => `${v.toFixed(2)} m`, onInput: (v) => ((lamM = v), wRedraw()) })),
        wro,
      ),
    );
    wRedraw();

    // ---- spectrum
    root.append(
      p('Nothing in Maxwell\u2019s equations picks a wavelength, so every \u03bb is allowed. Radio, microwaves, infrared, visible light, ultraviolet, X-rays and gamma rays are <b>one phenomenon</b>, sorted by wavelength. Your eyes respond to a thin slice from about <b>400 nm (violet) to 700 nm (red)</b>.'),
    );
    const sStage = h('div', { class: 'stage' });
    const sView = new PhysView(sStage, { height: 240, box: [640, 212] });
    let lg = Math.log10(550e-9);
    const sro = readouts([['l', '\u03bb'], ['f', 'f'], ['b', 'Band'], ['s', 'About the size of'], ['u', 'Shows up in']]);
    const sRedraw = () => {
      sView.show({ draw: spectrumDraw, p: { lg }, box: [640, 212] }, { animate: false });
      const lam = 10 ** lg;
      const b = band(lam);
      const col = colorName(lam * 1e9);
      sro.set({ l: fmtLen(lam), f: `${sci(frequency(lam))} Hz`, b: col ? `${b.name} (${col})` : b.name, s: sizeOf(lam), u: USES[b.name] });
    };
    root.append(
      figure(
        { title: 'The electromagnetic spectrum', note: 'Log scale: each tick is 1000\u00d7 longer than the one before. The whole visible range is the thin colored sliver, blown up underneath. Same speed c for all of it.' },
        sStage,
        controlsRow(slider({ label: 'Wavelength (log scale)', min: -12.5, max: 3.5, step: 0.02, value: lg, fmt: (v) => fmtLen(10 ** v), onInput: (v) => ((lg = v), sRedraw()) })),
        sro,
      ),
    );
    sRedraw();

    // ---- energy, intensity, pressure
    root.append(
      p('A wave carries <b>energy</b>. The power per unit area it delivers is its <b>intensity</b> ' + eq('I') + ' (W/m\u00b2), and it goes as the <b>square</b> of the field amplitude: ' + eq('I = \u00bd c\u03b5<sub>0</sub>E<sub>0</sub><sup>2</sup>') + '. Double E<sub>0</sub> and the intensity quadruples. Sunlight at Earth is about 1000 W/m\u00b2, which works out to a peak E of roughly 870 V/m.'),
      p('A wave also carries <b>momentum</b>, so it pushes on whatever absorbs or reflects it: the <b>radiation pressure</b> is ' + eq('I/c') + ' when absorbed and ' + eq('2I/c') + ' when reflected (the light bounces back, like a ball, so twice the momentum change). For sunlight that is only a few micropascals, but it is enough to steer solar sails.'),
    );

    // ---- polarization
    root.append(
      p('Because E is transverse, it has a <b>direction</b> across the beam, called the <b>polarization</b>. Light from a bulb or the sun is <b>unpolarized</b>: its E direction jumps around randomly. A <b>polarizer</b> passes only the component of E along its transmission axis. The first one passes half the intensity of unpolarized light; after that, the light is polarized, and every later polarizer obeys Malus\u2019s law:'),
      equation({
        name: 'Malus\u2019s law',
        eq: 'I = I<sub>0</sub> cos<sup>2</sup>\u03b8',
        says: 'A polarizer passes the component E cos \u03b8, and intensity goes as E\u00b2, hence cos\u00b2. Aligned (\u03b8 = 0) passes everything; crossed (\u03b8 = 90\u00b0) passes nothing.',
        terms: [
          ['I<sub>0</sub>', '<b>polarized</b> intensity arriving at the polarizer', 'W/m\u00b2'],
          ['\u03b8', 'angle between the light\u2019s polarization and the polarizer\u2019s axis', 'deg'],
          ['I', 'intensity that gets through, now polarized along the axis', 'W/m\u00b2'],
        ],
      }),
    );
    const pStage = h('div', { class: 'stage' });
    const pView = new PhysView(pStage, { height: 260, box: [640, 200] });
    let th = 30;
    let three = 0;
    const pro = readouts([['o', 'Out (fraction of I<sub>0</sub>)']]);
    const pRedraw = () => {
      pView.show({ draw: polarDraw, p: { th, three }, box: [640, 200] }, { animate: false });
      const axes = three ? [0, th, 90] : [0, th];
      const I = polarizerChain(1, axes.map(toRad));
      pro.set({ o: `${I[I.length - 1].toFixed(3)} I<sub>0</sub>` });
    };
    root.append(
      figure(
        {
          title: 'Polarizers and Malus\u2019s law',
          tools: [segmented([{ value: 0, label: 'Two polarizers' }, { value: 1, label: 'Crossed pair + one between' }], 0, (v) => ((three = v), pRedraw()))],
          note: 'Each circle is a polarizer seen face-on; the bold line is its transmission axis. Orange double arrows: the E direction of the light, with length \u221d amplitude. The beam\u2019s thickness and the bar show the intensity.',
        },
        pStage,
        controlsRow(slider({ label: 'Polarizer 2 angle \u03b8', min: 0, max: 180, step: 1, value: th, fmt: (v) => `${v}\u00b0`, onInput: (v) => ((th = v), pRedraw()) })),
        pro,
      ),
    );
    pRedraw();

    root.append(
      callout('warn', 'Classic mistakes', 'Using Malus\u2019s law on <b>unpolarized</b> light (the first polarizer always gives exactly I<sub>0</sub>/2, whatever its angle). Writing cos \u03b8 instead of cos<sup>2</sup>\u03b8 (cos \u03b8 is for the field, cos\u00b2 for intensity). And measuring \u03b8 from the original light instead of from the <b>previous</b> polarizer.'),
      p('Polarized sunglasses use this: glare reflected off water and roads is partly polarized horizontally, so lenses with a vertical axis cut it while passing the rest. LCD screens put a liquid crystal between crossed polarizers and twist the light\u2019s polarization pixel by pixel.'),
      checkpoint(quiz),
    );
  },
};
