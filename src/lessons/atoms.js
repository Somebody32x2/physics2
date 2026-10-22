import { h, p } from '../ui/dom.js';
import { Player } from '../ui/player.js';
import { PhysView } from '../core/phys-view.js';
import { figure, callout, segmented } from '../ui/figure.js';
import { checkpoint } from '../ui/quiz.js';
import { equation, eq, readouts, slider, controlsRow } from '../ui/controls.js';
import {
  levelEV, transitionEV, transitionNM, seriesOf, ionizationEV, balmer, SPECTRA, spectrumRGB, lightColor,
  closureMismatch, deBroglie, electronLambdaV, OBJECTS, M_E, M_P, sci, photonNM,
} from '../model/quantum.js';

const fmt = (v, d = 2) => v.toFixed(d).replace('-', '\u2212');
const nmStr = (nm) => `${Math.round(nm)} nm`;
const region = (nm) => (nm < 380 ? 'ultraviolet' : nm > 750 ? 'infrared' : 'visible');
const nLabel = (n) => (n === Infinity ? '\u221e' : String(n));
const rgb = (nm) => `rgb(${spectrumRGB(nm).join(',')})`;

// ---------- figure 1: element barcodes ----------
const BC = { x0: 110, x1: 620, lo: 380, hi: 720 };
const bcX = (nm) => BC.x0 + ((nm - BC.lo) / (BC.hi - BC.lo)) * (BC.x1 - BC.x0);

function barcodeDraw(d, p) {
  SPECTRA.forEach((s, i) => {
    const y = 14 + i * 40;
    d.text(BC.x0 - 12, y + 14, s.name, { anchor: 'end', size: 13 });
    if (p.absorb) {
      for (let nm = BC.lo; nm < BC.hi; nm += 4) d.rect(bcX(nm), y, bcX(nm + 4) - bcX(nm) + 0.4, 28, { style: `fill: ${rgb(nm + 2)}; stroke: none` });
      for (const nm of s.lines) d.line(bcX(nm), y, bcX(nm), y + 28, { style: '--c: var(--ink)', w: 2.4 });
    } else {
      d.rect(BC.x0, y, BC.x1 - BC.x0, 28, { style: 'fill: var(--ink); stroke: none' });
      for (const nm of s.lines) d.line(bcX(nm), y, bcX(nm), y + 28, { style: `--c: ${rgb(nm)}`, w: 2.4 });
    }
  });
  const ya = 14 + SPECTRA.length * 40;
  for (const nm of [400, 450, 500, 550, 600, 650, 700]) {
    d.line(bcX(nm), ya - 6, bcX(nm), ya - 2, { cls: 'ph-axis' });
    d.text(bcX(nm), ya + 8, String(nm), { cls: 'ph-tick', size: 12 });
  }
  d.text(BC.x1, ya + 26, 'wavelength (nm)', { cls: 'ph-label', anchor: 'end', size: 12 });
}

// ---------- figures 2 and 3: hydrogen energy levels ----------
const Y1 = 322;
const Y2 = 262;
const YINF = 26;
const LX0 = 60;
const LX1 = 296;
const LEVELS = [1, 2, 3, 4, 5, 6, Infinity];
const yOf = (n) => (n === 1 ? Y1 : YINF + (-levelEV(n) * (Y2 - YINF)) / 3.4);
const ST = { x0: 70, x1: 600, y: 360, hgt: 22, lo: 380, hi: 750 };
const stX = (nm) => ST.x0 + ((nm - ST.lo) / (ST.hi - ST.lo)) * (ST.x1 - ST.x0);
const PERIOD = 3.4;

/** Where a photon of wavelength nm lands on the strip (the ends for UV / IR). */
const stripTarget = (nm) => [nm < ST.lo ? ST.x0 - 26 : nm > ST.hi ? ST.x1 + 26 : stX(nm), ST.y + ST.hgt / 2];

function levelDiagram(d, { pickable = false } = {}) {
  // energy axis with a break between n = 1 and n = 2
  d.arrow(26, Y1 + 8, 26, YINF - 14, { cls: 'ph-axis', w: 1.2, head: 7 });
  d.text(14, YINF - 16, 'E', { cls: 'ph-label', serif: true });
  const yb = (Y1 + Y2) / 2;
  d.rect(20, yb - 5, 12, 10, { style: 'fill: var(--surface); stroke: none' });
  d.line(19, yb - 1, 33, yb - 6, { cls: 'ph-axis', w: 1.2 });
  d.line(19, yb + 5, 33, yb, { cls: 'ph-axis', w: 1.2 });
  d.text(LX0 - 8, YINF - 16, 'n', { cls: 'ph-label', anchor: 'end', serif: true });
  for (const n of LEVELS) {
    const y = yOf(n);
    const id = n === Infinity ? 'Linf' : `L${n}`;
    const g = d.group({ id: pickable ? id : null, cls: 'ph-F' });
    if (pickable) g.rect(LX0 - 30, y - 6, LX1 - LX0 + 40, 12, { style: 'fill: transparent; stroke: none' });
    g.line(LX0, y, LX1, y, { w: n === Infinity ? 1.2 : 2, dash: n === Infinity ? '5 4' : null });
    g.text(LX0 - 8, y, nLabel(n), { anchor: 'end', size: 12 });
    const e = n === Infinity ? '0 (free)' : `\u2212${fmt(-levelEV(n))} eV`;
    if (n <= 4 || n === Infinity) g.text(LX1 + 6, y, e, { anchor: 'start', size: 12, cls: 'ph-label' });
  }
}

function strip(d, p, lines, absorb) {
  const { x0, x1, y, hgt } = ST;
  if (absorb) {
    for (let nm = ST.lo; nm < ST.hi; nm += 5) d.rect(stX(nm), y, stX(nm + 5) - stX(nm) + 0.4, hgt, { style: `fill: ${rgb(nm + 2.5)}; stroke: none` });
  } else {
    d.rect(x0, y, x1 - x0, hgt, { style: 'fill: var(--ink); stroke: none' });
  }
  for (const { nm, o } of lines) {
    if (nm < ST.lo || nm > ST.hi) continue;
    d.line(stX(nm), y, stX(nm), y + hgt, { style: absorb ? '--c: var(--ink)' : `--c: ${rgb(nm)}`, w: 3, opacity: o });
  }
  const uv = lines.filter((l) => l.nm < ST.lo && l.o > 0.5);
  const ir = lines.filter((l) => l.nm > ST.hi && l.o > 0.5);
  d.text(x0 - 26, y + hgt / 2, 'UV', { cls: uv.length ? 'ph-F' : 'ph-mute', size: 12 });
  d.text(x1 + 26, y + hgt / 2, 'IR', { cls: ir.length ? 'ph-F' : 'ph-mute', size: 12 });
  for (const nm of [400, 500, 600, 700]) d.text(stX(nm), y + hgt + 12, `${nm} nm`, { cls: 'ph-tick', size: 11 });
}

/**
 * The level diagram with one transition from level `a` to level `b` (emission if b < a, absorption if b > a).
 * frame.found: earlier lines [nm]; frame.prev: earlier arrows [[a, b, x]]; frame.pickable: click targets.
 */
function levelsDraw(d, p, t, frame) {
  const a = p.a;
  const b = p.b;
  const has = a > 0 && b > 0 && a !== b;
  const absorb = has && b > a;
  levelDiagram(d, { pickable: frame.pickable });
  for (const [pa, pb, px] of frame.prev ?? []) {
    const ya = yOf(pa);
    const yb = yOf(pb);
    d.arrow(px, ya, px, yb + (pb > pa ? 4 : -4), { cls: 'ph-F', w: 1.4, opacity: 0.25 });
  }
  const tau = frame.static ? 2.5 : t % PERIOD;
  const nm = has ? transitionNM(a, b) : 0;
  const lines = (frame.found ?? []).map((v) => ({ nm: v, o: 1 }));
  if (has) {
    const x = p.ax;
    const ya = yOf(a);
    const yb = yOf(b);
    d.arrow(x, ya, x, yb + (absorb ? 5 : -5), { cls: 'ph-F', w: 2.4 });
    const small = Math.abs(ya - yb) < 30;
    d.text(x + 8, small ? Math.max(ya, yb) + 12 : (ya + yb) / 2, `${nLabel(a)}\u2192${nLabel(b)}`, { anchor: 'start', size: 12, halo: true });
    // electron: waits, jumps, (photon travels before for absorption, after for emission)
    const jump0 = absorb ? 1.0 : 0.4;
    const k = Math.max(0, Math.min(1, (tau - jump0) / 0.4));
    const ye = ya + (yb - ya) * k;
    if (!(b === Infinity && k >= 1)) d.dot(x, b === Infinity ? Math.max(ye, YINF - 6) : ye, { cls: 'ph-neg', r: 5 });
    // photon
    const [sx, sy] = stripTarget(nm);
    const [ax, ay] = [x + 6, (ya + yb) / 2];
    const s0 = absorb ? 0 : 0.7;
    const u = (tau - s0) / 0.9;
    if (u > 0 && u < 1) {
      const [fx, fy, tx, ty] = absorb ? [sx, sy, ax, ay] : [ax, ay, sx, sy];
      const L = Math.hypot(tx - fx, ty - fy);
      packet(d, fx + (tx - fx) * u, fy + (ty - fy) * u, (tx - fx) / L, (ty - fy) / L, nm);
    }
    const appear = absorb ? Math.min(1, Math.max(0, (tau - 0.8) / 0.3)) : Math.min(1, Math.max(0, (tau - 1.5) / 0.3));
    lines.push({ nm, o: appear });
    // info panel
    const E = transitionEV(a, b);
    const ix = 372;
    d.text(ix, 40, absorb ? (b === Infinity ? 'Ionization (absorbs)' : 'Absorption') : 'Emission', { anchor: 'start', size: 13, cls: 'ph-label' });
    d.text(ix, 66, `n = ${nLabel(a)} \u2192 ${nLabel(b)}`, { anchor: 'start', serif: true, size: 20 });
    d.text(ix, 96, `\u0394E = ${fmt(E)} eV`, { anchor: 'start', size: 13 });
    d.text(ix, 118, `\u03bb = 1240 / ${fmt(E)} = ${nmStr(nm)}`, { anchor: 'start', size: 13 });
    const ser = b === Infinity || a === Infinity ? `series limit (${region(nm)})` : `${seriesOf(a, b)} series, ${region(nm)}`;
    d.text(ix, 140, ser, { anchor: 'start', size: 13 });
  } else if (p.sel > 0) {
    const n = p.sel;
    d.dot(150, yOf(n), { cls: 'ph-neg', r: 5 });
    d.text(372, 66, `Start: n = ${nLabel(n)}`, { anchor: 'start', serif: true, size: 20 });
    d.text(372, 96, 'Now click where it ends.', { anchor: 'start', size: 13, cls: 'ph-label' });
  } else if (p.home > 0) {
    d.dot(150, yOf(p.home), { cls: 'ph-neg', r: 5 });
    if (frame.hint) {
      d.text(372, 66, frame.hint[0], { anchor: 'start', serif: true, size: 20 });
      d.text(372, 96, frame.hint[1], { anchor: 'start', size: 13, cls: 'ph-label' });
    }
  }
  strip(d, p, lines, absorb || frame.absorbStrip);
}

function packet(d, x, y, ux, uy, nm) {
  const len = 26;
  const waves = Math.max(1.5, 1000 / nm);
  const pts = [];
  for (let i = 0; i <= 28; i++) {
    const s = -len / 2 + (len * i) / 28;
    const env = Math.sin((Math.PI * i) / 28);
    const a = 5 * env * Math.sin((2 * Math.PI * waves * i) / 28);
    pts.push([x + ux * s - uy * a, y + uy * s + ux * a]);
  }
  d.poly(pts, { style: `--c: ${lightColor(nm)}`, w: 2.2 });
}

const BOX = [640, 400];

function storyFrames() {
  const B = balmer(6);
  const xs = { 3: 118, 4: 152, 5: 186, 6: 220 };
  const fr = (pp, extra, caption) => ({ draw: levelsDraw, live: true, resetTime: true, box: BOX, p: { a: 0, b: 0, ax: 150, sel: 0, home: 0, ...pp }, caption, ...extra });
  const prevB = (k) => B.slice(0, k).map((l) => [l.n, 2, xs[l.n]]);
  const foundB = (k) => B.slice(0, k).map((l) => l.nm);
  const E32 = transitionEV(3, 2);
  const out = [
    fr({ home: 3 }, { hint: ['Electron in n = 3', 'Kicked up by a collision.'] }, `Hydrogen\u2019s allowed energies, <b>E<sub>n</sub> = \u221213.6 eV / n<sup>2</sup></b>. Negative means bound; 0 (n = \u221e) means the electron just barely escapes. Levels crowd together near the top. An electron has been kicked up to <b>n = 3</b> (in a discharge tube, by a collision).`),
    fr({ a: 3, b: 2, ax: xs[3] }, { found: [], prev: [] }, `It drops from 3 to 2 and emits <b>one photon</b> carrying the difference: ${fmt(levelEV(3))} \u2212 (${fmt(levelEV(2))}) = <b>${fmt(E32)} eV</b>, so \u03bb = 1240/${fmt(E32)} = <b>${nmStr(B[0].nm)}</b>, red. That is hydrogen\u2019s famous red line.`),
  ];
  B.slice(1).forEach((l, i) => {
    const E = transitionEV(l.n, 2);
    const extra = i === 2 ? ' These visible lines, all ending on n = 2, are the <b>Balmer series</b>.' : '';
    out.push(fr({ a: l.n, b: 2, ax: xs[l.n] }, { found: foundB(i + 1), prev: prevB(i + 1) }, `From n = ${l.n} down to 2: ${fmt(E)} eV, <b>${nmStr(l.nm)}</b>. A bigger drop means a more energetic photon and a shorter wavelength.${extra}`));
  });
  const L21 = transitionNM(2, 1);
  out.push(fr({ a: 2, b: 1, ax: 84 }, { found: foundB(4), prev: prevB(4) }, `Down to the ground state, 2 \u2192 1: the gap is huge, <b>${fmt(transitionEV(2, 1))} eV</b>, so \u03bb = <b>${nmStr(L21)}</b>, ultraviolet. Drops to n = 1 form the <b>Lyman</b> series (UV); drops to n = 3 form the <b>Paschen</b> series (infrared).`));
  out.push(fr({ a: 2, b: 3, ax: 254 }, { found: foundB(4), prev: [] }, `Run it backwards. Shine white light through cool hydrogen: an electron in n = 2 can <b>absorb</b> only a photon that exactly fits a gap, such as the ${nmStr(B[0].nm)} one. Those wavelengths go missing, leaving <b>dark lines at the same places</b>. That is how we read the composition of stars.`));
  out.push(fr({ a: 1, b: Infinity, ax: 270 }, { found: [], prev: [] }, `Absorbing <b>${fmt(ionizationEV(1))} eV</b> or more (\u03bb \u2264 ${nmStr(photonNM(ionizationEV(1)))}) lifts the electron from n = 1 all the way to E = 0: the atom is <b>ionized</b>. That is the ionization energy of hydrogen. From n = 2 it would take only ${fmt(ionizationEV(2))} eV.`));
  return out;
}

// ---------- figure 4: standing waves on a circle ----------
const RING = { cx: 160, cy: 150, r: 96, A: 15 };
function ringDraw(d, p, t) {
  const n = p.n;
  const whole = closureMismatch(n) < 0.03;
  const amp = Math.cos(2.6 * t);
  const { cx, cy, r, A } = RING;
  d.circle(cx, cy, r, { cls: 'ph-mute', dash: '3 4', w: 1 });
  d.circle(cx, cy, 9, { cls: 'ph-pos', fill: true, style: '--fo: 0.5' });
  d.text(cx, cy + 22, 'nucleus', { cls: 'ph-label', size: 12 });
  const pts = [];
  const N = 360;
  for (let i = 0; i <= N; i++) {
    const th = (2 * Math.PI * i) / N;
    const rr = r + A * Math.cos(n * th) * amp;
    pts.push([cx + rr * Math.cos(th - Math.PI / 2), cy + rr * Math.sin(th - Math.PI / 2)]);
  }
  d.poly(pts, { cls: whole ? 'ph-plot2' : 'ph-bad', w: 2.4 });
  if (!whole) {
    const [x0, y0] = pts[0];
    const [x1, y1] = pts[N];
    d.line(x0, y0, x1, y1, { cls: 'ph-bad', w: 3 });
    d.text(cx, cy - r - 32, 'ends don\u2019t meet', { cls: 'ph-bad', size: 12 });
  } else {
    const m = Math.round(n);
    for (let k = 0; k < 2 * m; k++) {
      const th = ((k + 0.5) * Math.PI) / m;
      d.dot(cx + r * Math.cos(th - Math.PI / 2), cy + r * Math.sin(th - Math.PI / 2), { cls: 'ph-plot2', r: 2.6 });
    }
  }
  // unrolled circumference
  const ux0 = 330;
  const ux1 = 620;
  const uy = 150;
  d.text((ux0 + ux1) / 2, 42, 'the circumference, unrolled', { cls: 'ph-label', size: 12 });
  d.line(ux0, uy, ux1, uy, { cls: 'ph-mute', w: 1 });
  d.line(ux0, uy - 40, ux0, uy + 40, { cls: 'ph-axis', w: 1 });
  d.line(ux1, uy - 40, ux1, uy + 40, { cls: 'ph-axis', w: 1 });
  const up = [];
  for (let i = 0; i <= 200; i++) {
    const s = i / 200;
    up.push([ux0 + (ux1 - ux0) * s, uy - 30 * Math.cos(2 * Math.PI * n * s) * amp]);
  }
  d.poly(up, { cls: whole ? 'ph-plot2' : 'ph-bad', w: 2.2 });
  if (!whole) {
    // where the wave must be to join its own start
    d.line(ux1 - 30, up[0][1], ux1 + 8, up[0][1], { cls: 'ph-F', dash: '3 3', w: 1.2 });
    d.line(ux1 + 4, up[0][1], ux1 + 4, up[200][1], { cls: 'ph-bad', w: 3 });
  }
  d.text(ux0, uy + 54, 'start', { cls: 'ph-label', size: 12 });
  d.text(ux1, uy + 54, 'one lap', { cls: 'ph-label', size: 12, anchor: 'end' });
  // one wavelength marker
  const lamPx = (ux1 - ux0) / n;
  if (lamPx < ux1 - ux0 + 1) {
    d.line(ux0, uy + 76, ux0 + lamPx, uy + 76, { cls: 'ph-F', w: 1.4 });
    d.line(ux0, uy + 70, ux0, uy + 82, { cls: 'ph-F', w: 1.4 });
    d.line(ux0 + lamPx, uy + 70, ux0 + lamPx, uy + 82, { cls: 'ph-F', w: 1.4 });
    d.text(ux0 + lamPx / 2, uy + 92, '\u03bb', { serif: true });
  }
  d.text((ux0 + ux1) / 2, 268, whole ? `2\u03c0r = ${Math.round(n)}\u03bb: fits, an allowed orbit` : `2\u03c0r = ${fmt(n)}\u03bb: cancels itself, not allowed`, { cls: whole ? 'ph-good' : 'ph-bad', size: 13 });
}

// ---------- figure 5: de Broglie wavelengths on a log scale ----------
const DB = { x0: 170, x1: 616, lo: -40, hi: -2 };
const dbX = (lam) => DB.x0 + ((Math.log10(lam) - DB.lo) / (DB.hi - DB.lo)) * (DB.x1 - DB.x0);
const REFS = [
  { name: 'nucleus', lo: 2e-15, hi: 1.5e-14 },
  { name: 'atom', lo: 5e-11, hi: 5e-10 },
  { name: 'light', lo: 4e-7, hi: 7e-7 },
];
function dbDraw(d, p) {
  const v = 10 ** p.logv;
  const top = 34;
  const rows = OBJECTS.length;
  const bottom = top + rows * 34;
  for (const r of REFS) {
    const x0 = dbX(r.lo);
    const x1 = dbX(r.hi);
    d.rect(x0, top - 10, Math.max(4, x1 - x0), bottom - top + 4, { cls: 'ph-mute', fill: true, style: '--fo: 0.18; stroke: none' });
    d.text((x0 + x1) / 2, top - 22, r.name, { cls: 'ph-label', size: 12 });
  }
  OBJECTS.forEach((o, i) => {
    const y = top + 8 + i * 34;
    const lam = deBroglie(o.m, v);
    d.text(DB.x0 - 14, y, o.name, { anchor: 'end', size: 12.5 });
    d.line(DB.x0, y, DB.x1, y, { cls: 'ph-grid', w: 1 });
    const x = dbX(lam);
    d.dot(x, y, { cls: i === 0 ? 'ph-neg' : 'ph-F', r: 5 });
    const right = x < DB.x1 - 120;
    d.text(x + (right ? 10 : -10), y - 1, `${sci(lam)} m`, { anchor: right ? 'start' : 'end', size: 12, halo: true });
  });
  const ya = bottom + 6;
  d.line(DB.x0, ya, DB.x1, ya, { cls: 'ph-axis', w: 1.2 });
  for (let e = DB.lo; e <= DB.hi; e += 5) {
    const x = dbX(10 ** e);
    d.line(x, ya - 3, x, ya + 3, { cls: 'ph-axis' });
    d.text(x, ya + 16, `10<sup>\u2212${-e}</sup>`, { cls: 'ph-tick', size: 11.5 });
  }
  d.text(DB.x1, ya + 34, 'de Broglie wavelength (m), log scale', { cls: 'ph-label', anchor: 'end', size: 12 });
}

// ---------- quiz ----------
const QARROWS = [[3, 2], [4, 3], [2, 1], [6, 2]];
const qX = [110, 160, 210, 260];
function quizLevelsDraw(d, p) {
  levelDiagram(d, {});
  QARROWS.forEach(([a, b], i) => {
    const g = d.group({ id: `t${i}`, cls: 'ph-F' });
    g.rect(qX[i] - 12, yOf(a) - 2, 24, yOf(b) - yOf(a) + 4, { style: 'fill: transparent; stroke: none' });
    g.arrow(qX[i], yOf(a), qX[i], yOf(b) - 5, { w: 2.4 });
    g.text(qX[i], Y1 + 18, String.fromCharCode(65 + i), { size: 13 });
    if (p.reveal) d.text(qX[i] + 4, (yOf(a) + yOf(b)) / 2 + (i === 2 ? 0 : 0), nmStr(transitionNM(a, b)), { anchor: 'start', size: 11.5, halo: true, cls: 'ph-label' });
  });
}
const shortest = () => QARROWS.reduce((best, [a, b], i) => (transitionNM(a, b) < transitionNM(...QARROWS[best]) ? i : best), 0);

const L32 = transitionNM(3, 2);
const quiz = [
  {
    type: 'input',
    id: 'atoms.balmer-red',
    prompt: 'A hydrogen electron drops from n = 3 to n = 2. What is the wavelength of the emitted photon, in nm? (E<sub>n</sub> = \u221213.6 eV/n<sup>2</sup>, hc = 1240 eV\u00b7nm)',
    placeholder: 'nm',
    accept: (s) => Math.abs(parseFloat(s) - L32) < 6,
    explain: `E<sub>3</sub> = \u221213.6/9 = ${fmt(levelEV(3))} eV and E<sub>2</sub> = \u221213.6/4 = ${fmt(levelEV(2))} eV. The photon carries the difference, ${fmt(transitionEV(3, 2))} eV, so \u03bb = 1240/${fmt(transitionEV(3, 2))} \u2248 <b>${nmStr(L32)}</b> (red, the H-alpha line).`,
  },
  {
    type: 'mcq',
    id: 'atoms.ionize-n2',
    prompt: 'How much energy does it take to ionize a hydrogen atom whose electron is already in the n = 2 level?',
    choices: ['13.6 eV', '10.2 eV', '3.4 eV', '1.9 eV'],
    answer: 2,
    explain: `Ionizing means lifting the electron to E = 0. From n = 2 (E<sub>2</sub> = ${fmt(levelEV(2))} eV) that costs <b>${fmt(ionizationEV(2))} eV</b>. 13.6 eV is the cost from the ground state; 10.2 eV is the 1 \u2192 2 gap; 1.9 eV is the 2 \u2192 3 gap.`,
  },
  {
    type: 'mcq',
    id: 'atoms.debroglie-mass',
    prompt: 'An electron and a proton move at the same speed. Which has the longer de Broglie wavelength?',
    choices: ['The proton, because it is bigger', 'They are equal, because the speeds are equal', 'The electron', 'Neither: only light has a wavelength'],
    answer: 2,
    explain: `\u03bb = h/(mv). Same v, so the lighter particle has the longer wavelength: the electron\u2019s is m<sub>p</sub>/m<sub>e</sub> \u2248 ${Math.round(M_P / M_E)} times the proton\u2019s. Size has nothing to do with it; momentum does.`,
  },
  {
    type: 'pick',
    id: 'atoms.shortest-lambda',
    prompt: 'Four hydrogen transitions, A to D. Click the one that emits the photon with the <b>shortest wavelength</b>.',
    View: PhysView,
    view: { height: 320, box: [440, 350] },
    build: () => ({
      frame: { draw: quizLevelsDraw, p: { reveal: 0 }, box: [440, 350] },
      answer: [`t${shortest()}`],
      after: { draw: quizLevelsDraw, p: { reveal: 1 }, box: [440, 350] },
    }),
    explain: () =>
      `Shortest wavelength = biggest energy drop. The gaps: ${QARROWS.map(([a, b], i) => `${String.fromCharCode(65 + i)} (${a}\u2192${b}) ${fmt(transitionEV(a, b))} eV`).join(', ')}. The drop into n = 1 dwarfs the rest because the levels go as \u22121/n<sup>2</sup>: arrow ${String.fromCharCode(65 + shortest())} gives ${nmStr(transitionNM(...QARROWS[shortest()]))}, in the ultraviolet. Its arrow only looks short because the diagram squeezes the 10.2 eV gap below n = 2 (see the axis break); read the energies, not the arrow lengths.`,
  },
];

export default {
  id: 'atoms',
  title: 'Atoms & matter waves',
  group: 'Quantum & nuclear',
  blurb: 'Why atoms emit sharp spectral lines, the Bohr model of hydrogen, and the wavelength of an electron.',
  quiz,
  render(root) {
    root.append(
      p('Heat a gas or run a current through it and it glows, but not in a rainbow like a hot solid. Through a prism or grating you see a few sharp, bright lines. Every element has its own set, a <b>barcode</b>, and the same element absorbs the same wavelengths out of white light. Nineteenth-century physicists could measure these lines to five digits and had no idea why they existed.'),
      p('The photon idea from the last chapter says each line is a photon of one exact energy. So the atom itself can only have certain energies, and a line is the atom dropping from one allowed energy to a lower one. The spectrum is a direct read-out of the atom\u2019s <b>energy levels</b>.'),
    );

    const bcStage = h('div', { class: 'stage' });
    const bcView = new PhysView(bcStage, { height: 300, box: [640, 266] });
    let absorbBC = false;
    const bcShow = () => bcView.show({ draw: barcodeDraw, p: { absorb: absorbBC ? 1 : 0 }, box: [640, 266] }, { animate: false });
    root.append(
      figure(
        {
          title: 'Every element has a barcode',
          tools: [segmented([{ value: false, label: 'Emission' }, { value: true, label: 'Absorption' }], false, (v) => ((absorbBC = v), bcShow()), { label: 'Spectrum type' })],
          note: 'Visible lines only. Hydrogen\u2019s are computed from the Bohr model below; the others are measured. Switch to <b>Absorption</b>: white light through the cool gas loses exactly the same wavelengths.',
        },
        bcStage,
      ),
    );
    bcShow();

    root.append(
      p('In 1913 Niels Bohr pictured hydrogen\u2019s electron circling the proton like a planet, but allowed only on certain orbits, labeled by a whole number n. On an allowed orbit it does not radiate (classically it should, spiraling into the nucleus in about 10<sup>\u221211</sup> s). Light comes out only when it <b>jumps</b> between orbits.'),
      equation({
        name: 'Bohr energy levels of hydrogen',
        eq: 'E<sub>n</sub> = \u2212<span class="frac"><span>13.6 eV</span><span>n<sup>2</sup></span></span>,&nbsp;&nbsp; n = 1, 2, 3, \u2026',
        says: 'The allowed energies are negative (the electron is bound) and climb toward 0 as n grows, crowding closer together. n = 1 is the <b>ground state</b>; 13.6 eV is the energy needed to pull the electron out from there.',
        terms: [
          ['E<sub>n</sub>', 'total energy of the atom with the electron in level n (0 = electron free and at rest)', 'eV'],
          ['n', 'principal quantum number, a positive whole number', ''],
          ['13.6 eV', 'hydrogen\u2019s ionization energy from the ground state', 'eV'],
        ],
      }),
      equation({
        name: 'Photon from a jump',
        eq: 'hf = <span class="frac"><span>hc</span><span>\u03bb</span></span> = E<sub>upper</sub> \u2212 E<sub>lower</sub>',
        says: 'One jump, one photon, carrying exactly the energy difference. Bigger gaps give higher frequency, shorter wavelength. Going down emits; going up requires absorbing a photon of exactly that energy (or a collision).',
        terms: [
          ['E<sub>upper</sub>, E<sub>lower</sub>', 'energies of the two levels', 'eV'],
          ['\u03bb', 'wavelength of the photon; in nm it is 1240 / (\u0394E in eV)', 'm'],
        ],
      }),
    );

    const host = h('div');
    root.append(figure({ title: 'Hydrogen\u2019s levels make its spectrum', note: 'Energy scale is true from n = 2 upward; the gap down to n = 1 (10.2 eV) is shortened. The strip at the bottom is the visible spectrum; UV and IR lines land off its ends.' }, host));
    new Player(host, { frames: storyFrames(), View: PhysView, view: { height: 460 } });

    root.append(
      callout('key', 'Lines are differences of levels', 'A spectral line never tells you a level; it tells you a <b>gap</b>. Find the two levels, subtract, and convert: \u03bb[nm] = 1240 / \u0394E[eV]. Emission and absorption between the same two levels give the <b>same</b> wavelength.'),
    );

    // sandbox: click two levels
    const sbStage = h('div', { class: 'stage' });
    let sel = 0;
    let tr = null;
    let found = [];
    const ro = readouts([['lines', 'Lines found']]);
    const sbView = new PhysView(sbStage, {
      height: 460,
      box: BOX,
      onPick: (id) => {
        const n = id === 'Linf' ? Infinity : Number(id.slice(1));
        if (!sel || tr) {
          sel = n;
          tr = null;
        } else if (n !== sel) {
          tr = [sel, n];
          const nm = transitionNM(sel, n);
          if (!found.some((v) => Math.abs(v - nm) < 0.01)) found = [...found, nm];
        }
        sbShow(Boolean(tr));
      },
    });
    const sbShow = (reset = false) => {
      const [a, b] = tr ?? [0, 0];
      sbView.show(
        {
          draw: levelsDraw, live: true, resetTime: reset, box: BOX, pickable: true,
          p: { a, b, ax: 180, sel: tr ? 0 : sel, home: 0 },
          found: tr ? found.filter((v) => Math.abs(v - transitionNM(a, b)) > 0.01) : found,
          hint: null,
          roles: tr ? { [a === Infinity ? 'Linf' : `L${a}`]: 'visit', [b === Infinity ? 'Linf' : `L${b}`]: 'visit' } : sel ? { [sel === Infinity ? 'Linf' : `L${sel}`]: 'visit' } : {},
        },
        { animate: false },
      );
      ro.set({ lines: found.length ? [...found].sort((x, y) => x - y).map((v) => `${Math.round(v)}`).join(', ') + ' nm' : 'none yet' });
    };
    root.append(
      figure(
        {
          title: 'Sandbox: make your own lines',
          tools: [h('button', { class: 'btn ghost small', text: 'Clear', onclick: () => ((sel = 0), (tr = null), (found = []), sbShow()) })],
          note: 'Click the level the electron <b>starts</b> on, then the level where it <b>ends</b>. Downward jumps emit, upward jumps absorb. Every line you make is added to the strip. Can you produce all four visible Balmer lines? Which jumps give infrared?',
        },
        sbStage,
        ro,
      ),
    );
    sbShow();

    root.append(
      callout('warn', 'Classic mistakes', 'Using 13.6/n<sup>2</sup> for the photon energy instead of the <b>difference</b> of two levels. Forgetting that the levels are negative, so the "upper" level is the one closer to zero. And mixing units: 1240/\u03bb gives eV only when \u03bb is in <b>nm</b>.'),
      p('Why only certain orbits? In 1924 Louis de Broglie proposed that if light waves can act like particles, particles can act like waves, with a wavelength set by their momentum:'),
      equation({
        name: 'de Broglie wavelength',
        eq: '\u03bb = <span class="frac"><span>h</span><span>p</span></span> = <span class="frac"><span>h</span><span>mv</span></span>',
        says: 'The same relation as for a photon, now for matter. More momentum, shorter wavelength. Because h is so small, only very light particles have wavelengths big enough to notice.',
        terms: [
          ['\u03bb', 'wavelength associated with the moving particle', 'm'],
          ['p = mv', 'its momentum (non-relativistic)', 'kg\u00b7m/s'],
          ['h', 'Planck\u2019s constant, 6.63 \u00d7 10<sup>\u221234</sup>', 'J\u00b7s'],
        ],
      }),
      p('An electron wave going around the nucleus must join itself smoothly after one lap, or it cancels itself out. So the circumference must hold a whole number of wavelengths, ' + eq('2\u03c0r = n\u03bb') + '. That single condition reproduces Bohr\u2019s orbits and the 13.6 eV / n<sup>2</sup> energies.'),
    );

    // ring sandbox
    const rgStage = h('div', { class: 'stage' });
    const rgView = new PhysView(rgStage, { height: 320, box: [640, 290] });
    let nRing = 3;
    const rgShow = () => rgView.show({ draw: ringDraw, live: true, p: { n: nRing }, box: [640, 290] }, { animate: false });
    root.append(
      figure(
        {
          title: 'Bohr orbits are standing waves',
          note: 'Drag the slider through non-whole values: the wave arrives back at the start out of step with itself, so it cancels. Only n = 1, 2, 3, \u2026 survive. (Drawn at one size; real Bohr orbits grow as r<sub>n</sub> = n<sup>2</sup> \u00d7 0.053 nm.)',
        },
        rgStage,
        controlsRow(slider({ label: 'Wavelengths around the orbit', min: 1, max: 5, step: 0.05, value: nRing, fmt: (v) => v.toFixed(2), onInput: (v) => ((nRing = v), rgShow()) })),
      ),
    );
    rgShow();

    const lam1e6 = deBroglie(M_E, 1e6);
    const ball = deBroglie(0.145, 40);
    root.append(
      p(`The idea was confirmed in 1927, when electrons fired at a nickel crystal came off in a <b>diffraction pattern</b>, just like X-rays: the atoms in a crystal are a grating with spacing ~0.1 nm, and electrons have wavelengths of that size. An electron at 10<sup>6</sup> m/s has \u03bb = ${sci(lam1e6)} m; one accelerated through V volts has \u03bb \u2248 1.23 nm/\u221aV (${fmt(electronLambdaV(100) * 1e9, 3)} nm at 100 V). Short electron wavelengths are why an <b>electron microscope</b> resolves far finer detail than a light microscope (resolution is limited by wavelength, the diffraction chapter\u2019s rule). A 145 g baseball at 40 m/s has \u03bb = ${sci(ball)} m, which is why you never see a baseball diffract.`),
    );

    const dbStage = h('div', { class: 'stage' });
    const dbView = new PhysView(dbStage, { height: 300, box: [640, 260] });
    let logv = 6;
    const dbShow = () => dbView.show({ draw: dbDraw, p: { logv }, box: [640, 260] }, { animate: false });
    root.append(
      figure(
        { title: 'Matter wavelengths, same speed, very different sizes', note: `Every object is moving at the speed on the slider. Grey bands: the size of a nucleus, an atom, and the wavelength of visible light. A wave effect is visible only when \u03bb is comparable to the openings or spacings it meets. At equal speeds the electron\u2019s wavelength is ${Math.round(Math.log10(0.145 / M_E))} powers of ten longer than the baseball\u2019s (the mass ratio).` },
        dbStage,
        controlsRow(slider({ label: 'Speed v', min: 0, max: 7, step: 0.05, value: logv, fmt: (v) => `${sci(10 ** v)} m/s`, onInput: (v) => ((logv = v), dbShow()) })),
      ),
    );
    dbShow();

    root.append(
      p('Waves bring a built-in limit. A wave confined to a small region must mix many wavelengths, so its momentum is spread out. <b>Heisenberg\u2019s uncertainty principle</b> makes this precise: ' + eq('\u0394x \u0394p \u2265 \u0127/2') + '. The more precisely you pin down where a particle is, the less precisely its momentum can be defined, and vice versa. This is not a flaw in the instruments; it is what being a wave means. It also explains why the electron doesn\u2019t fall into the nucleus: squeezing it closer would raise its momentum spread, and with it its kinetic energy.'),
      p('Bohr\u2019s neat circular orbits turned out to be a stepping stone. In the full theory (Schr\u00f6dinger\u2019s equation, 1926), the electron is described by a wave function spread around the nucleus, and the orbit becomes an <b>orbital</b>: a cloud showing where the electron is likely to be found. The energies for hydrogen come out exactly as Bohr\u2019s 13.6 eV/n<sup>2</sup>, which is why the Bohr model is still the right tool for spectra in this course.'),
      checkpoint(quiz),
    );
  },
};
