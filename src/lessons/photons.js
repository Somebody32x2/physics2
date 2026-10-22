import { h, p } from '../ui/dom.js';
import { Player } from '../ui/player.js';
import { PhysView } from '../core/phys-view.js';
import { figure, callout, segmented } from '../ui/figure.js';
import { checkpoint } from '../ui/quiz.js';
import { equation, eq, readouts, slider, controlsRow } from '../ui/controls.js';
import {
  planck, wienPeak, stefan, blackbodyRGB, spectrumRGB, lightColor,
  photonEV, photonEVfromF, freqOf, nmOf, METALS, metal, kMax, ejects, thresholdF, thresholdNM, H_EV,
  photonMomentum, COMPTON, electronSpeed,
} from '../model/quantum.js';

/** Deterministic pseudo-random number in [0, 1) for slot k (visual scatter only). */
const hash = (k, s = 0) => {
  const x = Math.sin(k * 127.1 + s * 311.7 + 0.5) * 43758.5453;
  return x - Math.floor(x);
};
const fmt = (v, d = 2) => v.toFixed(d);
const SODIUM = metal('sodium');

// ---------- figure 1: what the wave theory predicted vs what happened ----------

/** Light beam from (x1, y1) to (x2, y2): moving wavefronts (wave) or little wave packets (photons). */
function beam(d, x1, y1, x2, y2, { nm, I, t, photons = 0 }) {
  const L = Math.hypot(x2 - x1, y2 - y1);
  const ux = (x2 - x1) / L;
  const uy = (y2 - y1) / L;
  const col = `--c: ${lightColor(nm)}`;
  if (I <= 0.01) return;
  if (photons < 0.5) {
    const sp = nm / 24; // wavefront spacing grows with wavelength
    const ph = (t * 70) % sp;
    const hw = 26;
    const op = Math.min(1, 0.25 + 0.3 * I);
    for (let s = ph; s < L; s += sp) {
      const cx = x1 + ux * s;
      const cy = y1 + uy * s;
      d.line(cx - uy * hw, cy + ux * hw, cx + uy * hw, cy - ux * hw, { style: col, w: 2, opacity: op.toFixed(2) });
    }
  } else {
    // photon packets: a slot every 0.09 s, filled with probability ~ intensity
    const dt = 0.09;
    const speed = 150;
    const travel = L / speed;
    const k1 = Math.floor(t / dt);
    for (let k = Math.max(0, Math.floor((t - travel) / dt)); k <= k1; k++) {
      if (hash(k, 9) > 0.18 * I) continue;
      const s = (t - k * dt) * speed;
      const off = (hash(k, 4) - 0.5) * 40;
      packet(d, x1 + ux * s - uy * off, y1 + uy * s + ux * off, ux, uy, nm, col);
    }
  }
}

/** A short wiggle (wave packet) centered at (x, y) heading along (ux, uy); wiggle length grows with wavelength. */
function packet(d, x, y, ux, uy, nm, style) {
  const len = 22;
  const waves = Math.max(1.5, 900 / nm);
  const pts = [];
  for (let i = 0; i <= 24; i++) {
    const s = -len / 2 + (len * i) / 24;
    const env = Math.sin((Math.PI * i) / 24);
    const a = 5 * env * Math.sin((2 * Math.PI * waves * i) / 24);
    pts.push([x + ux * s - uy * a, y + uy * s + ux * a]);
  }
  d.poly(pts, { style, w: 2 });
}

/**
 * Electrons leaving a plate surface at y, from x in [xa, xb], flying up and to the right.
 * rate: relative electrons per second (0 = none); ke: kinetic energy in eV (speed ~ sqrt(KE)).
 */
function electrons(d, { xa, xb, y, xMax, yMin, rate, ke, t, scale = 75, seed = 0 }) {
  if (rate <= 0.01 || ke <= 0.01) return;
  const dt = 0.1;
  const speed = scale * Math.sqrt(ke);
  const life = 4;
  const k1 = Math.floor(t / dt);
  for (let k = Math.max(0, Math.floor((t - life) / dt)); k <= k1; k++) {
    if (hash(k, 1 + seed) > Math.min(0.95, 0.2 * rate)) continue;
    const age = t - k * dt;
    const ang = ((35 + 40 * hash(k, 3 + seed)) * Math.PI) / 180;
    const x = xa + (xb - xa) * hash(k, 2 + seed) + Math.cos(ang) * speed * age;
    const yy = y - 4 - Math.sin(ang) * speed * age;
    if (x > xMax || yy < yMin) continue;
    d.line(x, yy, x - Math.cos(ang) * 10, yy + Math.sin(ang) * 10, { cls: 'ph-neg', w: 1.2, opacity: 0.35 });
    d.dot(x, yy, { cls: 'ph-neg', r: 3.6 });
  }
}

function theoryPanel(d, ox, title, o, t) {
  d.text(ox + 155, 14, title, { cls: 'ph-F', size: 13.5 });
  d.rect(ox + 30, 196, 250, 12, { cls: 'ph-mute', fill: true, style: '--fo: 0.35' });
  d.text(ox + 155, 220, 'sodium plate', { cls: 'ph-label', size: 12 });
  beam(d, ox + 18, 36, ox + 100, 192, { nm: o.nm, I: o.I, t, photons: o.photons });
  if (o.wait > 0.5) {
    d.text(ox + 205, 110, 'no electrons yet:', { cls: 'ph-label', size: 12 });
    d.text(ox + 205, 126, 'still soaking up energy', { cls: 'ph-label', size: 12 });
  } else if (o.rate < 0.01) {
    d.text(ox + 205, 150, 'no electrons', { cls: 'ph-bad', size: 13 });
  } else {
    electrons(d, { xa: ox + 70, xb: ox + 150, y: 196, xMax: ox + 305, yMin: 26, rate: o.rate, ke: o.ke, t, seed: ox ? 5 : 0 });
  }
  // bars
  const bx = ox + 118;
  d.text(ox + 108, 246, 'electrons/s', { cls: 'ph-label', anchor: 'end', size: 12 });
  d.text(ox + 108, 272, 'KE<sub>max</sub>', { cls: 'ph-label', anchor: 'end', size: 12 });
  const rate = o.wait > 0.5 ? 0 : o.rate;
  if (rate > 0.01) d.rect(bx, 239, 34 * rate, 14, { cls: 'ph-neg', fill: true, style: '--fo: 0.5' });
  d.text(bx + 34 * rate + 6, 246, rate > 0.01 ? `\u00d7${fmt(rate, rate < 1 ? 2 : 1)}` : 'none', { cls: 'ph-F', anchor: 'start', size: 12 });
  const ke = o.wait > 0.5 ? 0 : o.ke;
  if (ke > 0.01) d.rect(bx, 265, 80 * ke, 14, { cls: 'ph-plot', fill: true, style: '--fo: 0.35' });
  d.text(bx + 80 * ke + 6, 272, ke > 0.01 ? `${fmt(ke)} eV` : 'none', { cls: 'ph-F', anchor: 'start', size: 12 });
}

function theoryDraw(d, p, t) {
  d.line(320, 6, 320, 284, { cls: 'ph-grid' });
  theoryPanel(d, 0, 'Wave theory predicted', { nm: p.nm, I: p.I, rate: p.pRate, ke: p.pKE, wait: p.wait, photons: 0 }, t);
  theoryPanel(d, 330, 'Experiment shows', { nm: p.nm, I: p.I, rate: p.oRate, ke: p.oKE, wait: 0, photons: p.photons }, t);
  d.text(18, 300, `${Math.round(p.nm)} nm light, intensity \u00d7${fmt(p.I, p.I < 1 ? 2 : 1)}`, { cls: 'ph-label', anchor: 'start', size: 12 });
}

function theoryFrames() {
  const phi = SODIUM.phi;
  const ke450 = kMax(freqOf(450), phi);
  // Wave theory: energy delivered per electron grows with intensity, not frequency. Calibrated to agree at step 1.
  const f = (nm, I, extra, caption) => {
    const on = ejects(freqOf(nm), phi);
    return {
      draw: theoryDraw,
      live: true,
      box: [640, 310],
      p: { nm, I, pRate: I, pKE: ke450 * I, wait: 0, oRate: on ? I : 0, oKE: kMax(freqOf(nm), phi), photons: 0, ...extra },
      caption,
    };
  };
  const E = (nm) => fmt(photonEV(nm));
  return [
    f(450, 1, {}, `Blue light (450 nm) on a sodium plate. Electrons come off, and a stopping voltage measures the fastest ones: <b>KE<sub>max</sub> = ${fmt(ke450)} eV</b>. Both pictures can agree so far.`),
    f(450, 2, {}, `<b>Double the intensity.</b> Wave theory: a stronger wave shakes each electron harder, so KE<sub>max</sub> should double. Experiment: <b>twice as many</b> electrons, but KE<sub>max</sub> stays ${fmt(ke450)} eV.`),
    f(700, 2, {}, `Switch to <b>red light</b> (700 nm), still bright. Wave theory: color should not matter, only intensity. Experiment: <b>no electrons at all</b>.`),
    f(700, 4, {}, `Make the red light twice as bright again. Wave theory: even faster electrons. Experiment: <b>still none</b>. It is not a weak effect; it is zero below a threshold frequency (${Math.round(thresholdNM(phi))} nm for sodium).`),
    f(350, 1, {}, `Ultraviolet light (350 nm) at the original intensity. Wave theory: same as the first step. Experiment: KE<sub>max</sub> jumps to <b>${fmt(kMax(freqOf(350), phi))} eV</b>. Higher frequency, faster electrons.`),
    f(450, 0.15, { wait: 1, pKE: ke450 * 0.15 }, `Very dim blue light. Wave theory: each electron must soak up energy for a while before it can escape, so expect a delay. Experiment: electrons appear <b>instantly</b> (within nanoseconds), just fewer of them, still with KE<sub>max</sub> = ${fmt(ke450)} eV.`),
    f(450, 1, { photons: 1 }, `Einstein's fix (1905): light arrives in <b>photons</b> of energy hf. One photon gives all its energy to one electron. At 450 nm, hf = ${E(450)} eV; ${fmt(phi)} eV pays to leave the metal, leaving <b>${fmt(ke450)} eV</b>. Intensity = how many photons; frequency = energy of each.`),
  ];
}

// ---------- figure 2: blackbody sandbox ----------
const BB = { x: 64, y: 34, w: 520, h: 210, max: 3000 };
const T_MAX = 7500;

function bbDraw(d, p) {
  const { T, fit } = p;
  const peak = wienPeak(T);
  const ref = fit ? planck(peak, T) : planck(wienPeak(T_MAX), T_MAX);
  const top = 1.1;
  const pl = d.plot({
    x: BB.x, y: BB.y, w: BB.w, h: BB.h, xr: [0, BB.max], yr: [0, top],
    xLabel: '\u03bb (nm)', yLabel: 'brightness per unit \u03bb',
    ticksX: [500, 1000, 1500, 2000, 2500].map((v) => [v, String(v)]),
  });
  // visible band: faint wash and a solid strip on the axis
  for (let nm = 380; nm < 750; nm += 5) {
    const c = spectrumRGB(nm + 2.5);
    const x = pl.X(nm);
    const w = pl.X(nm + 5) - x + 0.4;
    d.rect(x, BB.y, w, BB.h, { style: `fill: rgb(${c.join(',')}); stroke: none`, opacity: 0.12 });
    d.rect(x, BB.y + BB.h - 7, w, 7, { style: `fill: rgb(${c.join(',')}); stroke: none` });
  }
  const yb = BB.y + BB.h + 30;
  d.text(pl.X(565), yb, 'visible', { cls: 'ph-label', size: 12 });
  d.text(pl.X(200), yb, '\u2190 UV', { cls: 'ph-label', size: 12 });
  d.text(pl.X(1000), yb, 'infrared \u2192', { cls: 'ph-label', size: 12 });
  if (!fit) {
    for (const Tr of [3000, 4000, 5000, 6000, 7000]) {
      pl.fn((nm) => planck(nm * 1e-9, Tr) / ref, { cls: 'ph-mute', w: 1.2, from: 60 });
      const pk = planck(wienPeak(Tr), Tr) / ref;
      if (pk > 0.12 && Math.abs(Tr - T) > 250) pl.label(wienPeak(Tr) * 1e9 + 40, pk + 0.02, `${Tr} K`, { anchor: 'start', size: 12, cls: 'ph-mute' });
    }
  }
  // the curve, filled
  const pts = [[pl.X(60), pl.Y(0)]];
  for (let nm = 60; nm <= BB.max; nm += 10) pts.push([pl.X(nm), Math.max(BB.y - 4, pl.Y(planck(nm * 1e-9, T) / ref))]);
  pts.push([pl.X(BB.max), pl.Y(0)]);
  d.poly(pts, { cls: 'ph-plot', fill: true, closed: true, w: 2.4, style: '--fo: 0.08' });
  // peak marker
  const pk = planck(peak, T) / ref;
  const xp = pl.X(peak * 1e9);
  if (pk < top) {
    d.line(xp, pl.Y(0), xp, pl.Y(pk), { cls: 'ph-plot', dash: '4 4', w: 1.2 });
    d.dot(xp, pl.Y(pk), { cls: 'ph-plot', r: 4.5 });
    d.text(xp + 10, Math.max(BB.y + 8, Math.min(pl.Y(pk) - 2, pl.Y(0) - 26)), `\u03bb<sub>max</sub> = ${Math.round(peak * 1e9)} nm`, { cls: 'ph-F', anchor: 'start', size: 13, halo: true });
  } else {
    d.text(xp + 10, BB.y + 8, `\u03bb<sub>max</sub> = ${Math.round(peak * 1e9)} nm (curve off the top)`, { cls: 'ph-F', anchor: 'start', size: 13, halo: true });
  }
  // the glow
  const [r, g, b] = blackbodyRGB(T);
  d.circle(548, 74, 26, { style: `fill: rgb(${r},${g},${b}); stroke: var(--line); stroke-width: 1` });
  d.text(548, 116, `${Math.round(T)} K glow`, { cls: 'ph-label', size: 12 });
}

// ---------- figure 3: photoelectric sandbox ----------
const PE = { lamp: [42, 44], plate: { x: 70, y: 262, w: 230, h: 14 }, hitA: 110, hitB: 250 };
const F_MAX = 16e14;
const KE_TOP = 4.5;
const KE_BOT = -6;

function peDraw(d, p, t) {
  const m = METALS[p.metal];
  const nm = nmOf(p.f);
  const E = photonEVfromF(p.f);
  const ke = kMax(p.f, m.phi);
  const on = E > m.phi;
  const col = `--c: ${lightColor(nm)}`;
  // lamp
  const [lx, ly] = PE.lamp;
  if (p.I > 0) d.circle(lx, ly, 26 + 10 * p.I, { style: `fill: ${lightColor(nm)}; stroke: none`, opacity: (0.1 + 0.25 * p.I).toFixed(2) });
  d.circle(lx, ly, 16, { cls: 'ph-wire', style: 'fill: var(--surface)' });
  d.circle(lx, ly, 7, { style: `fill: ${lightColor(nm)}; stroke: none`, opacity: p.I > 0 ? 1 : 0.2 });
  d.text(lx + 24, ly - 26, `${Math.round(nm)} nm`, { cls: 'ph-label', size: 12, anchor: 'start' });
  // plate
  const P = PE.plate;
  d.rect(P.x, P.y, P.w, P.h, { cls: 'ph-mute', fill: true, style: '--fo: 0.35' });
  d.text(P.x + P.w / 2, P.y + P.h + 16, `${m.name}, \u03c6 = ${fmt(m.phi)} eV`, { cls: 'ph-label', size: 12 });
  // photons: one slot every 0.06 s, filled with probability = intensity
  const dt = 0.06;
  const speed = 210;
  const k1 = Math.floor(t / dt);
  for (let k = Math.max(0, k1 - 60); k <= k1; k++) {
    if (hash(k, 7) >= p.I * 0.8) continue;
    const tx = PE.hitA + (PE.hitB - PE.hitA) * hash(k, 8);
    const L = Math.hypot(tx - lx, P.y - ly);
    const age = t - k * dt;
    const s = age * speed;
    const ux = (tx - lx) / L;
    const uy = (P.y - ly) / L;
    if (s < 20) continue;
    if (s < L - 4) {
      packet(d, lx + ux * s, ly + uy * s, ux, uy, nm, col);
    } else if (on) {
      // the electron this photon knocked out
      const a = age - L / speed;
      const v = 70 * Math.sqrt(ke);
      const ang = ((40 + 40 * hash(k, 3)) * Math.PI) / 180;
      const x = tx + Math.cos(ang) * v * a;
      const y = P.y - 5 - Math.sin(ang) * v * a;
      if (x > 330 || y < 4 || a > 4) continue;
      d.line(x, y, x - Math.cos(ang) * 10, y + Math.sin(ang) * 10, { cls: 'ph-neg', w: 1.2, opacity: 0.35 });
      d.dot(x, y, { cls: 'ph-neg', r: 3.6 });
    } else if (s < L + 18) {
      d.circle(tx, P.y - 1, 2 + (s - L) / 3, { style: col, opacity: (1 - (s - L) / 22).toFixed(2), w: 1.4 });
    }
  }
  if (!on) d.text(250, 150, 'no electrons', { cls: 'ph-bad', size: 13 });

  // KEmax vs f graph
  const pl = d.plot({
    x: 386, y: 30, w: 226, h: 250, xr: [0, F_MAX], yr: [KE_BOT, KE_TOP],
    xLabel: 'f', yLabel: 'KE<sub>max</sub> (eV)',
    ticksX: [[4e14, '4'], [8e14, '8'], [12e14, '12']],
    ticksY: [[4, '4'], [2, '2'], [-2, '\u22122'], [-4, '\u22124']],
  });
  d.text(pl.X(F_MAX) + 10, pl.Y(0) + 28, '\u00d710<sup>14</sup> Hz', { cls: 'ph-tick', anchor: 'end' });
  METALS.forEach((mm, i) => {
    const f0 = thresholdF(mm.phi);
    const sel = i === p.metal;
    if (sel) pl.line(0, -mm.phi, f0, 0, { cls: 'ph-plot', dash: '4 4', w: 1.4 });
    pl.line(f0, 0, F_MAX, H_EV * F_MAX - mm.phi, { cls: sel ? 'ph-plot' : 'ph-mute', w: sel ? 2.4 : 1.4 });
    if (sel) {
      const u = Math.min(F_MAX, (3.6 + mm.phi) / H_EV);
      pl.label(u - 0.4e14, H_EV * u - mm.phi + 0.2, mm.name, { anchor: 'end', size: 12, cls: 'ph-F' });
    }
  });
  const f0 = thresholdF(m.phi);
  pl.dot(f0, 0, { r: 4 });
  pl.label(f0, -0.7, 'f<sub>0</sub>', { size: 13, cls: 'ph-F' });
  if (m.phi < -KE_BOT) d.text(pl.X(0) + 8, pl.Y(-m.phi), '\u2212\u03c6', { anchor: 'start', size: 13, cls: 'ph-F' });
  pl.vline(p.f, { style: col, dash: '3 3', cls: '' });
  if (on) pl.dot(p.f, ke, { r: 5.5, cls: 'ph-good' });
  else pl.dot(p.f, 0, { r: 5.5, cls: 'ph-bad' });
  pl.label(F_MAX, KE_BOT + 0.6, 'slope = h for every metal', { anchor: 'end', size: 12 });
}

// ---------- quiz ----------
const ZINC = metal('zinc');
const LAMPS = [
  { nm: 700, note: 'very bright', I: 1 },
  { nm: 450, note: 'bright', I: 0.7 },
  { nm: 250, note: 'dim', I: 0.25 },
  { nm: 200, note: 'dim', I: 0.25 },
];
function lampsDraw(d, p) {
  d.rect(30, 196, 500, 14, { cls: 'ph-mute', fill: true, style: '--fo: 0.35' });
  d.text(280, 226, `zinc plate, \u03c6 = ${fmt(ZINC.phi)} eV`, { cls: 'ph-label', size: 12 });
  LAMPS.forEach((l, i) => {
    const x = 90 + i * 127;
    const y = 74;
    const g = d.group({ id: `lamp${l.nm}` });
    g.circle(x, y, 22 + 18 * l.I, { style: `fill: ${lightColor(l.nm)}; stroke: none`, opacity: (0.12 + 0.3 * l.I).toFixed(2) });
    g.circle(x, y, 20, { style: 'fill: var(--surface)', w: 2 });
    g.circle(x, y, 8, { style: `fill: ${lightColor(l.nm)}; stroke: none` });
    g.text(x, y - 52, `${l.nm} nm`, { size: 13 });
    g.text(x, y + 52, l.note, { size: 12, cls: 'ph-label' });
    if (p.reveal) {
      const E = photonEV(l.nm);
      const ok = E > ZINC.phi;
      d.text(x, 150, `${fmt(E)} eV`, { cls: ok ? 'ph-good' : 'ph-bad', size: 13 });
      d.text(x, 170, ok ? 'ejects' : 'too little', { cls: ok ? 'ph-good' : 'ph-bad', size: 12 });
    }
  });
}

const qF = 1.5e15;
const H_GIVEN = 4.14e-15; // eV s, the rounded value the question gives
const quiz = [
  {
    type: 'mcq',
    id: 'photons.brighter-red',
    prompt: 'Red light (700 nm) shines on sodium (\u03c6 = 2.28 eV) and ejects no electrons. You make the light 10 times brighter. What happens?',
    choices: [
      'Still no electrons',
      'Electrons come off, but slowly',
      'Electrons come off after a delay while they absorb enough energy',
      'Ten times as many electrons as before',
    ],
    answer: 0,
    explain: `Each 700 nm photon carries hc/\u03bb = ${fmt(photonEV(700))} eV, less than the ${fmt(SODIUM.phi)} eV needed to escape. Brighter light means <b>more</b> photons, each still too weak, and one electron absorbs one photon. Ten times zero is zero.`,
  },
  {
    type: 'input',
    id: 'photons.kemax',
    prompt: 'Light of frequency 1.5 \u00d7 10<sup>15</sup> Hz hits zinc (\u03c6 = 4.31 eV). What is KE<sub>max</sub> of the ejected electrons, in eV? (h = 4.14 \u00d7 10<sup>\u221215</sup> eV\u00b7s)',
    placeholder: 'eV',
    accept: (s) => Math.abs(parseFloat(s) - kMax(qF, ZINC.phi)) < 0.06,
    explain: () => {
      const hf = H_GIVEN * qF;
      const ke = hf - ZINC.phi;
      return `Photon energy hf = (4.14 \u00d7 10<sup>\u221215</sup> eV\u00b7s)(1.5 \u00d7 10<sup>15</sup> Hz) = ${fmt(hf)} eV. Subtract the work function: ${fmt(hf)} \u2212 ${fmt(ZINC.phi)} = <b>${fmt(ke)} eV</b>. The stopping potential would be ${fmt(ke)} V.`;
    },
  },
  {
    type: 'mcq',
    id: 'photons.stopping-intensity',
    prompt: 'Light above the threshold frequency gives a stopping potential of 1.2 V. You double the intensity and keep the frequency. The stopping potential becomes:',
    choices: ['1.2 V (unchanged)', '2.4 V', '1.7 V (\u221a2 times larger)', '0.6 V'],
    answer: 0,
    explain: 'The stopping potential measures KE<sub>max</sub> = hf \u2212 \u03c6, which depends only on the frequency and the metal. Doubling the intensity doubles the number of photons, so the <b>current</b> doubles, but each electron still gets the same hf. eV<sub>0</sub> stays 1.2 eV.',
  },
  {
    type: 'pick',
    id: 'photons.which-lamps',
    prompt: `Click <b>every</b> lamp that will eject electrons from zinc (\u03c6 = ${fmt(ZINC.phi)} eV).`,
    View: PhysView,
    view: { height: 260, box: [560, 240] },
    build: () => ({
      frame: { draw: lampsDraw, p: { reveal: 0 }, box: [560, 240] },
      answer: LAMPS.filter((l) => photonEV(l.nm) > ZINC.phi).map((l) => `lamp${l.nm}`),
      after: { draw: lampsDraw, p: { reveal: 1 }, box: [560, 240] },
    }),
    explain: `Photon energies (1240/\u03bb): ${LAMPS.map((l) => `${l.nm} nm \u2192 ${fmt(photonEV(l.nm))} eV`).join(', ')}. Only photons above ${fmt(ZINC.phi)} eV can free an electron, so only the two <b>ultraviolet</b> lamps work, dim or not. The very bright red lamp sends many photons, but each one is too weak.`,
  },
];

export default {
  id: 'photons',
  title: 'Photons',
  group: 'Quantum & nuclear',
  blurb: 'Light comes in packets of energy hf: blackbody glow, the photoelectric effect, and why brighter is not the same as bluer.',
  quiz,
  render(root) {
    const sunPeak = Math.round(wienPeak(5800) * 1e9);
    root.append(
      p('By the end of the optics chapters, light is a wave: it interferes, it diffracts, and Maxwell\u2019s equations say exactly what is waving. Around 1900 a few experiments refused to fit that picture. Fixing them needed one new idea: light\u2019s energy comes in <b>lumps</b>, called <b>photons</b>, each carrying an energy set by its frequency.'),
      p('The first crack was <b>blackbody radiation</b>, the glow of anything hot (a stove coil, a filament, a star). The spectrum has a peak, and the peak moves to shorter wavelength as the object heats up: ' + eq('\u03bb<sub>max</sub> T = 2.9 \u00d7 10<sup>\u22123</sup> m\u00b7K') + ' (Wien\u2019s law). The Sun, at about 5800 K, peaks near ' + sunPeak + ' nm, in the middle of the visible band. Wave theory predicted the glow should keep growing without limit at short wavelengths (the "ultraviolet catastrophe"). Max Planck got the right curve only by assuming that light is emitted and absorbed in chunks of energy proportional to frequency:'),
      equation({
        name: 'Photon energy (Planck, Einstein)',
        eq: 'E = hf = <span class="frac"><span>hc</span><span>\u03bb</span></span>',
        says: 'Each photon carries an energy proportional to its frequency: blue photons carry more than red ones, X-ray photons far more. A handy form: <b>E [eV] \u2248 1240 / \u03bb [nm]</b>, so a 620 nm photon has 2.0 eV.',
        terms: [
          ['E', 'energy of ONE photon', 'J or eV'],
          ['h', 'Planck\u2019s constant, 6.63 \u00d7 10<sup>\u221234</sup> (= 4.14 \u00d7 10<sup>\u221215</sup> eV\u00b7s)', 'J\u00b7s'],
          ['f, \u03bb', 'frequency and wavelength of the light (c = f\u03bb)', 'Hz, m'],
          ['eV', 'electron-volt, the energy an electron gains across 1 V: 1.60 \u00d7 10<sup>\u221219</sup> J', ''],
        ],
      }),
    );

    // blackbody sandbox
    const bbStage = h('div', { class: 'stage' });
    const bbView = new PhysView(bbStage, { height: 340, box: [640, 300] });
    let T = 5800;
    let fit = true;
    const bbRo = readouts([['peak', '\u03bb<sub>max</sub> = 2.9\u00d710<sup>\u22123</sup>/T'], ['pow', 'Power per m\u00b2 (\u221d T<sup>4</sup>), vs the Sun']]);
    const bbRedraw = () => {
      bbView.show({ draw: bbDraw, p: { T, fit }, box: [640, 300] }, { animate: false });
      bbRo.set({ peak: `${Math.round(wienPeak(T) * 1e9)} nm`, pow: `\u00d7${(stefan(T) / stefan(5800)).toFixed(2)}` });
    };
    root.append(
      figure(
        {
          title: 'Blackbody spectrum: hotter is bluer and much brighter',
          tools: [segmented([{ value: true, label: 'Fit to curve' }, { value: false, label: 'Same scale' }], true, (v) => ((fit = v), bbRedraw()), { label: 'Vertical scale' })],
          note: 'The curve is Planck\u2019s formula. <b>Fit to curve</b> rescales so you can watch the peak slide; <b>Same scale</b> keeps one vertical axis (faint curves at 3000 to 7000 K) so you can see how fast the brightness grows. A tungsten filament (~3000 K) puts most of its output in the infrared.',
        },
        bbStage,
        controlsRow(slider({ label: 'Temperature T', min: 2500, max: T_MAX, step: 50, value: T, fmt: (v) => `${v} K`, onInput: (v) => ((T = v), bbRedraw()) })),
        bbRo,
      ),
    );
    bbRedraw();

    root.append(
      p('The second crack was the <b>photoelectric effect</b>: light shining on a clean metal knocks electrons out of it. You measure how many come out (the current) and how fast the fastest ones are, by applying a reverse voltage just big enough to stop them, the <b>stopping potential</b> ' + eq('V<sub>0</sub>') + '. Wave theory made clear predictions about what brighter or bluer light should do. Step through what actually happened:'),
    );
    const host = h('div');
    root.append(figure({ title: 'What the wave theory predicted vs what happened', note: 'Left: the classical prediction. Right: the measurement. Bars compare the number of electrons per second and their maximum kinetic energy.' }, host));
    new Player(host, { frames: theoryFrames(), View: PhysView, view: { height: 330 } });

    root.append(
      equation({
        name: 'Photoelectric equation',
        eq: 'KE<sub>max</sub> = hf \u2212 \u03c6 = eV<sub>0</sub>',
        says: 'One photon gives its whole energy hf to one electron. The electron spends at least the <b>work function</b> \u03c6 to get out of the metal and keeps the rest as kinetic energy. Below the threshold frequency f<sub>0</sub> = \u03c6/h, nothing comes out, however bright the light.',
        terms: [
          ['KE<sub>max</sub>', 'kinetic energy of the fastest ejected electrons', 'J or eV'],
          ['hf', 'energy of one photon', 'J or eV'],
          ['\u03c6', 'work function: the minimum energy to free an electron from that metal (a few eV)', 'J or eV'],
          ['V<sub>0</sub>', 'stopping potential: the reverse voltage that just stops the fastest electrons. In volts it equals KE<sub>max</sub> in eV', 'V'],
        ],
      }),
      callout('key', 'Intensity counts photons; frequency prices them', 'Brighter light at the same color means <b>more photons per second</b>, so <b>more electrons</b> (more current), each with the same KE<sub>max</sub>. Higher frequency means <b>more energy per photon</b>, so <b>faster electrons</b>. Brightness never makes up for a photon that is individually too weak.'),
    );

    // photoelectric sandbox
    const peStage = h('div', { class: 'stage' });
    const peView = new PhysView(peStage, { height: 360, box: [640, 300] });
    let f = freqOf(450);
    let I = 0.6;
    let mi = METALS.findIndex((m) => m.id === 'sodium');
    const peRo = readouts([['lam', 'Wavelength'], ['E', 'Photon energy hf'], ['phi', 'Work function \u03c6'], ['k', 'KE<sub>max</sub>'], ['v', 'Fastest electron']]);
    const peRedraw = () => {
      peView.show({ draw: peDraw, live: true, p: { f, I, metal: mi }, box: [640, 300] }, { animate: false });
      const m = METALS[mi];
      const ke = kMax(f, m.phi);
      peRo.set({
        lam: `${Math.round(nmOf(f))} nm`,
        E: `${fmt(photonEVfromF(f))} eV`,
        phi: `${fmt(m.phi)} eV`,
        k: ejects(f, m.phi) ? `${fmt(ke)} eV (V<sub>0</sub> = ${fmt(ke)} V)` : 'none ejected',
        v: ejects(f, m.phi) ? `${Math.round(electronSpeed(ke) / 1000)} km/s` : '\u2014',
      });
    };
    root.append(
      figure(
        {
          title: 'Sandbox: the photoelectric effect',
          tools: [segmented(METALS.map((m, i) => ({ value: i, label: m.name })), mi, (v) => ((mi = v), peRedraw()), { label: 'Metal' })],
          note: 'Each wiggle is one photon (its color is the light\u2019s color; violet-grey means ultraviolet). Electron speed on screen grows as \u221aKE. On the graph, the selected metal is a line of slope <b>h</b> starting at its threshold f<sub>0</sub>; extended back (dashed) it meets the axis at \u2212\u03c6. The faint parallel lines are the other metals. Try: find the color where sodium just stops emitting, then turn the intensity all the way up.',
        },
        peStage,
        controlsRow(
          slider({ label: 'Frequency f', min: 3e14, max: F_MAX, step: 1e13, value: f, fmt: (v) => `${(v / 1e14).toFixed(1)}\u00d710<sup>14</sup> Hz`, onInput: (v) => ((f = v), peRedraw()) }),
          slider({ label: 'Intensity', min: 0, max: 1, step: 0.05, value: I, fmt: (v) => `${Math.round(v * 100)}%`, onInput: (v) => ((I = v), peRedraw()) }),
        ),
        peRo,
      ),
    );
    peRedraw();

    const pGreen = photonMomentum(500e-9);
    root.append(
      callout('warn', 'Classic mistake', 'Answering "more intense light gives faster electrons" or "dim light gives slower ones". Intensity only changes <b>how many</b> electrons (the photocurrent). KE<sub>max</sub> and the stopping potential depend <b>only on f and \u03c6</b>. Also watch units: if hf is in eV, then KE<sub>max</sub> comes out in eV and V<sub>0</sub> in volts is the same number.'),
      p('Photons also carry <b>momentum</b>, even though they have no mass. That is what radiation pressure was (EM waves chapter), now counted photon by photon.'),
      equation({
        name: 'Photon momentum',
        eq: 'p = <span class="frac"><span>h</span><span>\u03bb</span></span> = <span class="frac"><span>E</span><span>c</span></span>',
        says: 'Shorter wavelength, more momentum. For visible light it is tiny (a 500 nm photon carries ' + pGreen.toExponential(1).replace('e-', ' \u00d7 10<sup>\u2212') + '</sup> kg\u00b7m/s), but X-ray photons carry enough to knock electrons around.',
        terms: [
          ['p', 'momentum of one photon', 'kg\u00b7m/s'],
          ['\u03bb', 'wavelength', 'm'],
          ['E, c', 'photon energy and the speed of light', 'J, m/s'],
        ],
      }),
      p('<b>Compton scattering</b> (1923) showed this directly: X-rays bouncing off electrons come out with a <b>longer</b> wavelength, exactly as if a photon collided with an electron like two billiard balls and handed it some energy and momentum. The shift is ' + eq('\u0394\u03bb = (h/mc)(1 \u2212 cos \u03b8)') + ', at most twice h/mc = ' + (2 * COMPTON * 1e12).toFixed(2) + ' pm. That is negligible next to visible wavelengths but a measurable few percent for X-rays (~0.1 nm: up to ' + Math.round(((2 * COMPTON) / 0.1e-9) * 100) + '%), which is why it shows up there.'),
      p('So which is light, a wave or a stream of particles? Both descriptions are needed, and each experiment picks one: <b>interference and diffraction</b> need waves; <b>emission and absorption</b> (photoelectric, Compton) happen one photon at a time. The modern statement, <b>wave-particle duality</b>, is that the wave tells you <b>where</b> photons are likely to land, and each one lands as a single lump. Fire photons one at a time through a double slit and the dots slowly build up the interference pattern. The next chapter turns the idea around: particles like electrons have a wavelength too.'),
      checkpoint(quiz),
    );
  },
};
