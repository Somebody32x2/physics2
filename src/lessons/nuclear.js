import { h, p } from '../ui/dom.js';
import { Player } from '../ui/player.js';
import { PhysView } from '../core/phys-view.js';
import { figure, callout } from '../ui/figure.js';
import { checkpoint } from '../ui/quiz.js';
import { equation, eq, slider, controlsRow } from '../ui/controls.js';
import {
  nuclide, bindingPerNucleon, bindingEnergy, massDefect, semfCurve, stableZ, fusionDT, fissionU235, nuclearRadius,
  DECAYS, decay, decayChain, U238_SERIES, symbol, ELEMENT_NAMES,
  remaining, decayConstant, ageFromFraction, C14_HALF_LIFE, lifetimes, aliveCount, U_MEV,
} from '../model/quantum.js';

const fmt = (v, d = 2) => v.toFixed(d).replace('-', '\u2212');
const iso = ({ Z, A }) => `<sup>${A}</sup>${symbol(Z)}`;
// Fusion / fission marks: colors without a site-wide physics meaning.
const FUS = 'var(--t4)';
const FIS = 'var(--ink-strong)';

// ---------- figure 1: binding energy per nucleon ----------
const MARKERS = ['H-2', 'He-4', 'C-12', 'Fe-56', 'U-235'].map(nuclide);
const FRAGS = ['Kr-92', 'Ba-141'].map(nuclide);
const BE_BOX = [640, 320];

function beDraw(d, p) {
  const pl = d.plot({
    x: 66, y: 26, w: 530, h: 250, xr: [0, 250], yr: [0, 10],
    xLabel: '', yLabel: 'B/A (MeV per nucleon)',
    ticksX: [50, 100, 150, 200, 250].map((v) => [v, String(v)]),
    ticksY: [2, 4, 6, 8].map((v) => [v, String(v)]),
  });
  d.text(pl.X(250) + 10, pl.Y(0) + 30, 'mass number (nucleons)', { cls: 'ph-label', anchor: 'end', size: 12 });
  // regions
  if (p.zones > 0.01) {
    const op = p.zones.toFixed(2);
    d.rect(pl.X(0), pl.Y(10), pl.X(56) - pl.X(0), pl.Y(0) - pl.Y(10), { style: `--c: ${FUS}; --fo: 0.08; stroke: none`, fill: true, opacity: op });
    d.rect(pl.X(56), pl.Y(10), pl.X(250) - pl.X(56), pl.Y(0) - pl.Y(10), { style: '--c: var(--muted); --fo: 0.07; stroke: none', fill: true, opacity: op });
    const yz = pl.Y(2.4);
    d.arrow(pl.X(52), yz, pl.X(14), yz, { cls: 'ph-F', w: 1.6, opacity: op });
    d.text(pl.X(33), yz - 14, 'fuse light', { size: 12, opacity: op });
    d.arrow(pl.X(60), yz, pl.X(150), yz, { cls: 'ph-F', w: 1.6, opacity: op });
    d.text(pl.X(105), yz - 14, 'split heavy', { size: 12, opacity: op });
    d.text(pl.X(105), yz + 16, 'both climb toward iron', { size: 12, cls: 'ph-label', opacity: op });
  }
  pl.fn(semfCurve, { from: 12, to: 250, cls: 'ph-plot2', w: 2.4 });
  pl.label(175, 6.6, 'liquid-drop formula', { cls: 'ph-plot2', size: 12 });
  const mk = p.mk;
  if (mk > 0.01) {
    for (const n of MARKERS) {
      const b = bindingPerNucleon(n);
      const iron = n.id === 'Fe-56';
      pl.dot(n.A, b, { r: iron ? 4 + 3 * p.iron : 4.5, cls: 'ph-F', opacity: mk.toFixed(2) });
      const lbl = `${iso(n)} ${fmt(b)}`;
      const pos = {
        'H-2': [10, 0, 'start'], 'He-4': [10, 14, 'start'], 'C-12': [10, 2, 'start'], 'O-16': [8, -12, 'start'],
        'Fe-56': [0, -16, 'middle'], 'U-235': [0, 18, 'middle'],
      }[n.id];
      d.text(pl.X(n.A) + pos[0], pl.Y(b) + pos[1], lbl, { anchor: pos[2], size: iron ? 12 + p.iron : 12, opacity: mk.toFixed(2), halo: true, cls: iron && p.iron > 0.5 ? 'ph-F' : '' });
    }
  }
  if (p.fus > 0.01) {
    const a = nuclide('H-2');
    const b = nuclide('He-4');
    const x1 = pl.X(a.A) + 12;
    const y1 = pl.Y(bindingPerNucleon(a)) - 4;
    const y2 = pl.Y(bindingPerNucleon(b)) + 10;
    d.arrow(x1, y1, x1, y1 + (y2 - y1) * p.fus, { style: `--c: ${FUS}`, w: 2.6 });
    d.text(x1 + 10, pl.Y(4.6), 'fusion', { style: `--c: ${FUS}`, anchor: 'start', size: 13, opacity: p.fus.toFixed(2), halo: true });
  }
  if (p.fis > 0.01) {
    const u = nuclide('U-235');
    const x0 = pl.X(u.A);
    const y0 = pl.Y(bindingPerNucleon(u));
    const k = p.fis;
    for (const f of FRAGS) {
      const xf = pl.X(f.A) + 6;
      const yf = pl.Y(bindingPerNucleon(f)) - 6;
      // arc above the curve from U-235 to the fragment
      const qx = (x0 + xf) / 2;
      const qy = Math.min(y0, yf) - 46;
      const at = (s) => [(1 - s) ** 2 * x0 + 2 * (1 - s) * s * qx + s * s * xf, (1 - s) ** 2 * (y0 - 6) + 2 * (1 - s) * s * qy + s * s * yf];
      const pts = [];
      for (let i = 0; i <= 30; i++) pts.push(at((k * i) / 30));
      d.poly(pts.slice(0, -2), { style: `--c: ${FIS}`, w: 2.2 });
      d.arrow(...pts.at(-4), ...pts.at(-1), { style: `--c: ${FIS}`, w: 2.2, head: 9 });
      d.dot(xf - 6, yf + 6, { r: 4.5, style: `--c: ${FIS}`, opacity: k.toFixed(2) });
      d.text(xf - 6, yf + 26, `${iso(f)} ${fmt(bindingPerNucleon(f))}`, { size: 12, style: `--c: ${FIS}`, opacity: k.toFixed(2), halo: true });
    }
    d.text(pl.X(170), pl.Y(9.55), 'fission', { style: `--c: ${FIS}`, size: 13, opacity: k.toFixed(2), halo: true });
  }
}

function beFrames() {
  const he = nuclide('He-4');
  const fe = nuclide('Fe-56');
  const u = nuclide('U-235');
  const f = (pp, caption) => ({ draw: beDraw, box: BE_BOX, p: { mk: 0, iron: 0, fus: 0, fis: 0, zones: 0, ...pp }, caption });
  return [
    f({}, 'The <b>binding energy per nucleon</b>, B/A: the energy needed to pull a nucleus apart, divided by its number of protons and neutrons. Higher means more tightly bound. The smooth curve is the liquid-drop formula (volume, surface, Coulomb and symmetry terms).'),
    f({ mk: 1 }, `Dots are <b>measured</b>, from masses. A <sup>4</sup>He atom is ${fmt(massDefect(he), 4)} u lighter than 2 hydrogen atoms + 2 neutrons. Times 931.5 MeV/u, that missing mass is <b>${fmt(bindingEnergy(he), 1)} MeV</b>, or ${fmt(bindingPerNucleon(he))} MeV per nucleon. (The smooth formula fails for the lightest nuclei, so the curve starts at A = 12; helium-4 is unusually tightly bound.)`),
    f({ mk: 1, iron: 1 }, `The curve peaks around <b>iron-56: ${fmt(bindingPerNucleon(fe))} MeV per nucleon</b>, the most tightly bound region of all nuclei. Light nuclei have too much surface; heavy ones have too much proton\u2013proton repulsion.`),
    f({ mk: 1, iron: 1, fus: 1 }, `<b>Fusion</b>: join light nuclei and the product sits higher on the curve. The difference comes out as energy. Deuterium + tritium \u2192 helium-4 + neutron releases <b>${fmt(fusionDT(), 1)} MeV</b>. This powers the Sun (by a slower route from plain hydrogen).`),
    f({ mk: 1, iron: 1, fus: 1, fis: 1 }, `<b>Fission</b>: split a heavy nucleus. Uranium-235 sits at ${fmt(bindingPerNucleon(u))} MeV per nucleon; the fragments (here barium-141 and krypton-92) sit near 8.3 to 8.5. n + <sup>235</sup>U \u2192 <sup>141</sup>Ba + <sup>92</sup>Kr + 3n releases <b>${Math.round(fissionU235())} MeV</b> per fission.`),
    f({ mk: 1, iron: 1, fus: 1, fis: 1, zones: 1 }, `Both processes move nuclei <b>toward the peak</b>. Energy released = gain in total binding energy. Per nucleon that is ${fmt(fusionDT() / 5, 1)} MeV for D\u2013T fusion and ${fmt(fissionU235() / 236, 2)} MeV for fission, compared with a few <b>eV</b> per atom for burning fuel: a million times more.`),
  ];
}

// ---------- figure 2: U-238 chain on the N-Z chart ----------
const CHAIN = decayChain({ Z: 92, A: 238 }, U238_SERIES);
const NZ = { nMin: 123, nMax: 147, zMin: 81, zMax: 93, cw: 21, x0: 92, y0: 12 };
const cx = (N) => NZ.x0 + (N - NZ.nMin) * NZ.cw;
const cy = (Z) => NZ.y0 + (NZ.zMax - Z) * NZ.cw;

function chartGrid(d, { nMin, nMax, zMin, zMax }, X, Y, cw) {
  for (let N = nMin; N <= nMax + 1; N++) d.line(X(N) - cw / 2, Y(zMax) - cw / 2, X(N) - cw / 2, Y(zMin) + cw / 2, { cls: 'ph-grid', w: 1 });
  for (let Z = zMin; Z <= zMax + 1; Z++) d.line(X(nMin) - cw / 2, Y(Z) + cw / 2, X(nMax) + cw / 2, Y(Z) + cw / 2, { cls: 'ph-grid', w: 1 });
  for (let Z = zMin; Z <= zMax; Z++) d.text(X(nMin) - cw / 2 - 6, Y(Z), `${Z} ${symbol(Z)}`, { anchor: 'end', size: 12, cls: 'ph-label' });
}

function chainDraw(d, p) {
  chartGrid(d, NZ, cx, cy, NZ.cw);
  for (let N = 124; N <= NZ.nMax; N += 4) d.text(cx(N), cy(NZ.zMin) + 24, String(N), { cls: 'ph-tick', size: 11 });
  d.text(cx(NZ.nMax) + 10, cy(NZ.zMin) + 42, 'neutron number N \u2192', { cls: 'ph-label', anchor: 'end', size: 12 });
  d.text(18, NZ.y0 - 2, 'Z', { cls: 'ph-label', serif: true });
  // valley of stability from the liquid-drop model
  const vp = [];
  for (let A = 204; A <= 240; A += 1) {
    const Z = stableZ(A);
    vp.push([cx(A - Z), cy(Z)]);
  }
  d.poly(vp, { cls: 'ph-mute', dash: '5 4', w: 1.6 });
  const k = p.k;
  const done = Math.floor(k + 1e-6);
  for (let i = 0; i <= Math.min(done, CHAIN.length - 1); i++) {
    const c = CHAIN[i];
    d.rect(cx(c.N) - NZ.cw / 2 + 1.5, cy(c.Z) - NZ.cw / 2 + 1.5, NZ.cw - 3, NZ.cw - 3, { cls: c.A === 206 && c.Z === 82 ? 'ph-good' : 'ph-F', fill: true, style: '--fo: 0.14', w: 1 });
  }
  for (let i = 1; i <= Math.min(Math.ceil(k - 1e-6), CHAIN.length - 1); i++) {
    const a = CHAIN[i - 1];
    const b = CHAIN[i];
    const frac = Math.min(1, k - (i - 1));
    const x1 = cx(a.N);
    const y1 = cy(a.Z);
    const x2 = x1 + (cx(b.N) - x1) * frac;
    const y2 = y1 + (cy(b.Z) - y1) * frac;
    d.arrow(x1, y1, x2, y2, { cls: b.mode === 'alpha' ? 'ph-pos' : 'ph-neg', w: 2.4, head: 8 });
  }
  // the current nucleus
  const i0 = Math.min(CHAIN.length - 1, Math.floor(k));
  const i1 = Math.min(CHAIN.length - 1, Math.ceil(k));
  const fk = k - Math.floor(k);
  const a = CHAIN[i0];
  const b = CHAIN[i1];
  const X = cx(a.N) + (cx(b.N) - cx(a.N)) * fk;
  const Y = cy(a.Z) + (cy(b.Z) - cy(a.Z)) * fk;
  const cur = CHAIN[Math.round(k)];
  const stable = Math.round(k) === CHAIN.length - 1;
  d.rect(X - NZ.cw / 2, Y - NZ.cw / 2, NZ.cw, NZ.cw, { cls: stable ? 'ph-good' : 'ph-F', w: 2.6, style: 'fill: var(--surface)' });
  d.text(X, Y, symbol(cur.Z), { size: 11.5, cls: stable ? 'ph-good' : '' });
  const left = X > cx(130);
  d.text(X + (left ? -16 : 16), Y + (stable ? 20 : -18), `${iso(cur)}`, { anchor: left ? 'end' : 'start', size: 15, halo: true });
  // legend
  const lx = cx(137);
  const ly = cy(85);
  d.rect(lx - 26, ly - 16, cx(147) - lx + 36, 100, { style: 'fill: var(--surface)', cls: 'ph-grid', w: 1 });
  d.arrow(lx, ly, lx - 16, ly + 16, { cls: 'ph-pos', w: 2.4, head: 8 });
  d.text(lx + 10, ly + 8, '\u03b1: Z \u2212 2, N \u2212 2', { anchor: 'start', size: 12 });
  d.arrow(lx, ly + 44, lx - 16, ly + 28, { cls: 'ph-neg', w: 2.4, head: 8 });
  d.text(lx + 10, ly + 36, '\u03b2<sup>\u2212</sup>: Z + 1, N \u2212 1', { anchor: 'start', size: 12 });
  d.line(lx - 16, ly + 66, lx + 2, ly + 58, { cls: 'ph-mute', dash: '5 4', w: 1.6 });
  d.text(lx + 10, ly + 62, 'most stable Z for each A', { anchor: 'start', size: 12 });
}

function chainFrames() {
  const f = (k, caption) => ({ draw: chainDraw, box: [640, 340], p: { k }, caption });
  const step = (i) => {
    const a = CHAIN[i - 1];
    const b = CHAIN[i];
    return `${iso(a)} (Z = ${a.Z}) \u2192 ${iso(b)} (Z = ${b.Z})`;
  };
  const name = (c) => ELEMENT_NAMES[c.Z] ?? symbol(c.Z);
  const hl = (i) => CHAIN[i + 1]?.halfLife;
  const last = CHAIN.at(-1);
  const nAlpha = CHAIN.filter((c) => c.mode === 'alpha').length;
  const nBeta = CHAIN.filter((c) => c.mode === 'betaMinus').length;
  return [
    f(0, `Every nucleus is a square on this chart: Z protons up, N neutrons across. Start at <b>uranium-238</b>: Z = 92, N = 146. Its half-life is <b>${hl(0)}</b>, about the age of the Earth, so roughly half of the Earth\u2019s original U-238 is still here.`),
    f(1, `<b>Alpha decay</b>: ${step(1)}. The nucleus throws out a helium-4 nucleus (2 protons + 2 neutrons), so Z drops by 2 and A by 4: <b>two squares down, two left</b>. Thorium-234 lives ${hl(1)}.`),
    f(2, `<b>Beta-minus decay</b>: ${step(2)}. Inside the nucleus a neutron turns into a proton, emitting an electron and an antineutrino. Z goes up by 1, A stays: <b>one up, one left</b>. Alpha decay left the nucleus neutron-rich; beta decay fixes the ratio.`),
    f(3, `Another beta-minus: ${step(3)}. Same element as the start (uranium), different isotope: same Z, different A. Uranium-234 lives ${hl(3)}.`),
    f(4, `Alpha: ${step(4)}, then on down the chain. Each step conserves charge (Z) and nucleon number (A) when you count the emitted particle.`),
    f(5, `Alpha: ${step(5)}, ${name(CHAIN[5])}, the element Marie Curie isolated. Half-life ${hl(5)}.`),
    f(6, `Alpha: ${step(6)}. Radon is a gas (half-life ${hl(6)}): it seeps out of the ground into basements, and it is the largest source of natural radiation dose for most people.`),
    f(CHAIN.length - 1, `The chain continues until it reaches <b>${iso(last)}</b>, lead-206, which is stable (green). In total: <b>${nAlpha} alphas and ${nBeta} beta-minus decays</b>. Check: A drops by ${nAlpha} \u00d7 4 = ${238 - last.A}; Z changes by \u2212${2 * nAlpha} + ${nBeta} = \u2212${92 - last.Z}. The chain zigzags along the valley of stability.`),
  ];
}

// ---------- figure 3: decay sandbox ----------
const GRID = 12;
const N0 = GRID * GRID;
const RUN = 20;
const HOLD = 2.5;
const DC = { x0: 34, y0: 36, cell: 20 };

function decayDraw(d, p, t) {
  const T = p.T;
  const cycle = Math.floor(t / (RUN + HOLD));
  const tt = Math.min(t - cycle * (RUN + HOLD), RUN);
  const lives = lifetimes(N0, 11 + cycle).map((L) => L * T); // lifetimes in seconds
  const alive = lives.reduce((s, L) => s + (L > tt ? 1 : 0), 0);
  // nuclei
  d.text(DC.x0 + (GRID * DC.cell) / 2 - DC.cell / 2, 14, `${alive} of ${N0} not yet decayed`, { size: 12.5 });
  lives.forEach((L, i) => {
    const x = DC.x0 + (i % GRID) * DC.cell;
    const y = DC.y0 + Math.floor(i / GRID) * DC.cell;
    if (L > tt) {
      d.circle(x, y, 7, { cls: 'ph-F', fill: true, style: '--fo: 0.85', w: 1 });
    } else {
      d.circle(x, y, 7, { cls: 'ph-mute', w: 1.2 });
      const age = tt - L;
      if (age < 0.45 && tt < RUN) d.circle(x, y, 7 + age * 30, { cls: 'ph-F', w: 1.2, opacity: (1 - age / 0.45).toFixed(2) });
    }
  });
  // graph
  const pl = d.plot({
    x: 352, y: 26, w: 262, h: 228, xr: [0, RUN], yr: [0, N0],
    xLabel: 't (s)', yLabel: 'N',
    ticksX: [5, 10, 15].map((v) => [v, String(v)]),
    ticksY: [[N0, String(N0)], [N0 / 2, String(N0 / 2)], [N0 / 4, String(N0 / 4)]],
  });
  for (let m = 1; m * T <= RUN; m++) {
    pl.vline(m * T, { cls: 'ph-grid', dash: '3 3' });
    if (m <= 4) pl.label(m * T, N0 + 10, m === 1 ? 'T<sub>\u00bd</sub>' : `${m}T<sub>\u00bd</sub>`, { size: 11.5 });
  }
  pl.fn((x) => remaining(N0, x, T), { cls: 'ph-plot2', w: 2, dash: '5 4' });
  const pts = [];
  for (let s = 0; s <= tt + 1e-9; s += 0.1) pts.push([s, aliveCount(lives, s)]);
  pts.push([tt, alive]);
  pl.pts(pts, { cls: 'ph-plot', w: 2.2 });
  pl.dot(tt, alive, { r: 4.5 });
  const lx = pl.X(8.5);
  const ly = pl.Y(N0) + 22;
  d.line(lx, ly, lx + 22, ly, { cls: 'ph-plot', w: 2.2 });
  d.text(lx + 28, ly, `this sample: ${alive}`, { anchor: 'start', size: 12, halo: true });
  d.line(lx, ly + 18, lx + 22, ly + 18, { cls: 'ph-plot2', w: 2, dash: '5 4' });
  d.text(lx + 28, ly + 18, `formula: ${remaining(N0, tt, T).toFixed(1)}`, { anchor: 'start', size: 12, halo: true, cls: 'ph-plot2' });
  d.text(lx + 28, ly + 36, `t = ${tt.toFixed(1)} s`, { anchor: 'start', size: 12, halo: true, cls: 'ph-label' });
}

// ---------- quiz ----------
const PK = { nMin: 139, nMax: 145, zMin: 88, zMax: 93, cw: 40 };
const pkX = (N) => 90 + (N - PK.nMin) * PK.cw;
const pkY = (Z) => 20 + (PK.zMax - Z) * PK.cw;
const TH234 = { Z: 90, A: 234 };
function pickChartDraw(d, p) {
  chartGrid(d, PK, pkX, pkY, PK.cw);
  for (let N = PK.nMin; N <= PK.nMax; N++) d.text(pkX(N), pkY(PK.zMin) + PK.cw / 2 + 14, String(N), { cls: 'ph-tick', size: 11.5 });
  d.text(pkX(PK.nMax) + PK.cw / 2, pkY(PK.zMin) + PK.cw / 2 + 32, 'N \u2192', { cls: 'ph-label', anchor: 'end', size: 12 });
  for (let Z = PK.zMin; Z <= PK.zMax; Z++) {
    for (let N = PK.nMin; N <= PK.nMax; N++) {
      const parent = Z === TH234.Z && N === TH234.A - TH234.Z;
      const s = PK.cw - 4;
      if (parent) {
        d.rect(pkX(N) - s / 2, pkY(Z) - s / 2, s, s, { cls: 'ph-F', fill: true, style: '--fo: 0.2', w: 2 });
        d.text(pkX(N), pkY(Z), iso(TH234), { size: 12 });
      } else {
        d.rect(pkX(N) - s / 2, pkY(Z) - s / 2, s, s, { id: `c${Z}-${N}`, style: 'fill: var(--surface)', cls: 'ph-grid', w: 1.5 });
      }
    }
  }
  if (p.reveal) {
    const dd = decay(TH234, 'betaMinus');
    d.arrow(pkX(TH234.A - TH234.Z) - 12, pkY(TH234.Z) - 12, pkX(dd.A - dd.Z) + 8, pkY(dd.Z) + 8, { cls: 'ph-neg', w: 2.4 });
    d.text(pkX(dd.A - dd.Z), pkY(dd.Z) - PK.cw / 2 - 10, iso(dd), { size: 12, halo: true });
  }
}
const daughterRa = decay({ Z: 88, A: 226 }, 'alpha');

const quiz = [
  {
    type: 'input',
    id: 'nuclear.alpha-daughter',
    prompt: 'Radium-226 (Z = 88) undergoes alpha decay. What are Z and A of the daughter nucleus? Type them as "Z, A".',
    placeholder: 'Z, A',
    accept: (s) => {
      const nums = (s.match(/\d+/g) ?? []).map(Number);
      return nums.length === 2 && nums[0] === daughterRa.Z && nums[1] === daughterRa.A;
    },
    explain: `An alpha particle is <sup>4</sup>He: 2 protons, 4 nucleons. Z = 88 \u2212 2 = <b>${daughterRa.Z}</b>, A = 226 \u2212 4 = <b>${daughterRa.A}</b>. Element ${daughterRa.Z} is ${ELEMENT_NAMES[daughterRa.Z]}: ${iso(daughterRa)}. Charge 88 = 86 + 2 and nucleons 226 = 222 + 4 both balance.`,
  },
  {
    type: 'mcq',
    id: 'nuclear.three-half-lives',
    prompt: 'A sample starts with N<sub>0</sub> radioactive nuclei. What fraction is left after three half-lives?',
    choices: ['1/3', '1/6', '1/8', '1/9'],
    answer: 2,
    explain: `Each half-life halves what is left: \u00bd \u00d7 \u00bd \u00d7 \u00bd = <b>${remaining(1, 3, 1) === 1 / 8 ? '1/8' : remaining(1, 3, 1)}</b>. The decay is exponential, not linear: it does not lose a third each time, and it never reaches zero in a fixed time (at the start, 1/8 = ${Math.round(N0 * remaining(1, 3, 1))} of the sandbox\u2019s ${N0}).`,
  },
  {
    type: 'mcq',
    id: 'nuclear.why-energy',
    prompt: 'Why do both fusion of light nuclei and fission of heavy nuclei release energy?',
    choices: [
      'Breaking nuclear bonds always releases energy',
      'In both cases the products are more tightly bound per nucleon, so the total mass goes down',
      'The products have more mass, and the extra mass becomes energy',
      'Fusion releases energy but fission absorbs it; reactors run on the neutrons',
    ],
    answer: 1,
    explain: `The binding-energy curve peaks near iron (${fmt(bindingPerNucleon(nuclide('Fe-56')))} MeV per nucleon). Light nuclei fusing and heavy nuclei splitting both move up toward the peak, so the products are bound more tightly and weigh <b>less</b>; the missing mass comes out as energy, E = \u0394m c<sup>2</sup> (${Math.round(fissionU235())} MeV per U-235 fission). Breaking bonds <i>costs</i> energy.`,
  },
  {
    type: 'pick',
    id: 'nuclear.beta-daughter',
    prompt: 'Thorium-234 (highlighted) undergoes <b>beta-minus</b> decay. Click the square of its daughter nucleus.',
    View: PhysView,
    view: { height: 300, box: [420, 290] },
    build: () => {
      const dd = decay(TH234, 'betaMinus');
      return {
        frame: { draw: pickChartDraw, p: { reveal: 0 }, box: [420, 290] },
        answer: [`c${dd.Z}-${dd.A - dd.Z}`],
        after: { draw: pickChartDraw, p: { reveal: 1 }, box: [420, 290] },
      };
    },
    explain: () => {
      const dd = decay(TH234, 'betaMinus');
      return `In beta-minus decay a neutron becomes a proton: Z goes from 90 to <b>${dd.Z}</b>, N from 144 to <b>${dd.A - dd.Z}</b>, and A stays ${dd.A}. On the chart that is one square <b>up</b> and one <b>left</b>: ${iso(dd)} (${ELEMENT_NAMES[dd.Z]}). Straight up would add a proton without losing a neutron (A would change).`;
    },
  },
];

export default {
  id: 'nuclear',
  title: 'Nuclear physics',
  group: 'Quantum & nuclear',
  blurb: 'What holds the nucleus together, why fusion and fission both release energy, and how radioactive decay works.',
  quiz,
  render(root) {
    const rU = nuclearRadius(238) * 1e15;
    root.append(
      p(`Every atom has a tiny, dense core: the <b>nucleus</b>, made of protons and neutrons (together, <b>nucleons</b>). Nuclei are measured in femtometers (1 fm = 10<sup>\u221215</sup> m): the radius grows as R \u2248 1.2 fm \u00d7 A<sup>1/3</sup>, so even uranium-238 has a radius of only about ${rU.toFixed(1)} fm, roughly 10<sup>\u22124</sup> of the atom\u2019s size. Nearly all the atom\u2019s mass is in there.`),
      equation({
        name: 'Nuclide notation',
        eq: '<sup>A</sup><sub>Z</sub>X,&nbsp;&nbsp; A = Z + N',
        says: 'The chemical symbol X and the proton number Z say the same thing (Z defines the element); A counts all nucleons. <b>Isotopes</b> have the same Z but different N, like carbon-12 and carbon-14.',
        terms: [
          ['Z', 'atomic number: number of protons (= nuclear charge in units of e)', ''],
          ['N', 'number of neutrons', ''],
          ['A', 'mass number: total nucleons. Also the mass in u, roughly', ''],
          ['u', 'atomic mass unit, 1.66 \u00d7 10<sup>\u221227</sup> kg = 931.5 MeV/c<sup>2</sup>', ''],
        ],
      }),
      p('Packing positive protons a few fm apart takes a large force: two protons 2 fm apart repel with about 60 N, on a particle of mass 10<sup>\u221227</sup> kg. What holds them is the <b>strong nuclear force</b>, an attraction between any two nucleons (proton or neutron) that is stronger than the Coulomb force at short range but dies off within about 2 to 3 fm. Each nucleon only feels its nearest neighbors, while Coulomb repulsion reaches across the whole nucleus. That is why heavy nuclei need more neutrons than protons (extra glue, no extra repulsion), and why nothing past bismuth (Z = 83) is stable.'),
      p('Taking a nucleus apart costs energy, so an assembled nucleus has <b>less</b> energy, and therefore less mass, than its separate parts. The missing mass is the <b>mass defect</b>, and Einstein\u2019s E = mc<sup>2</sup> converts it to the <b>binding energy</b>:'),
      equation({
        name: 'Binding energy',
        eq: 'E<sub>B</sub> = (\u0394m) c<sup>2</sup>,&nbsp;&nbsp; \u0394m = Zm<sub>H</sub> + Nm<sub>n</sub> \u2212 M<sub>atom</sub>',
        says: 'Add up the masses of the parts, subtract the mass of the whole, and multiply by c<sup>2</sup>. In nuclear units, <b>1 u of mass = 931.5 MeV</b>. Binding energies are MeV per nucleon, about a million times the eV scale of chemistry.',
        terms: [
          ['E<sub>B</sub>', 'energy needed to separate the nucleus into free protons and neutrons', 'MeV'],
          ['\u0394m', 'mass defect (using hydrogen-atom masses so the electrons cancel)', 'u'],
          ['m<sub>H</sub>, m<sub>n</sub>', 'mass of a hydrogen atom (1.007825 u) and a neutron (1.008665 u)', 'u'],
          ['M<sub>atom</sub>', 'measured mass of the neutral atom', 'u'],
        ],
      }),
    );

    const beHost = h('div');
    root.append(figure({ title: 'The curve of binding energy', note: 'Curve: liquid-drop (semi-empirical) mass formula along the line of most stable nuclei. Dots and numbers: computed from measured atomic masses with the binding-energy equation above.' }, beHost));
    new Player(beHost, { frames: beFrames(), View: PhysView, view: { height: 360 } });

    root.append(
      callout('key', 'Energy comes from climbing the curve', 'Any nuclear reaction that ends higher on the B/A curve releases energy, and the released energy equals the mass that disappears times c<sup>2</sup>. Iron is the bottom of the energy hill: you cannot get energy by fusing iron or by splitting it.'),
      p('Most nuclei are <b>unstable</b>: they eventually transform on their own, emitting radiation. Every decay obeys two bookkeeping rules: <b>charge is conserved</b> (the Z values balance) and <b>nucleon number is conserved</b> (the A values balance), counting the emitted particle.'),
    );

    const rows = [
      ['alpha', 'Alpha (\u03b1)', 'helium-4 nucleus, <sup>4</sup><sub>2</sub>He', 'Heavy nuclei shed mass'],
      ['betaMinus', 'Beta-minus (\u03b2<sup>\u2212</sup>)', 'electron + antineutrino (n \u2192 p)', 'Too many neutrons'],
      ['betaPlus', 'Beta-plus (\u03b2<sup>+</sup>)', 'positron + neutrino (p \u2192 n)', 'Too many protons'],
      ['gamma', 'Gamma (\u03b3)', 'high-energy photon', 'Excited nucleus settles; no change in Z or A'],
    ];
    const sgn = (v) => (v > 0 ? `+${v}` : v < 0 ? `\u2212${-v}` : '0');
    root.append(
      h('div', { class: 'table-wrap reveal' },
        h('table', {},
          h('thead', {}, h('tr', {}, ['Decay', 'Emits', '\u0394Z', '\u0394A', 'When'].map((t) => h('th', { text: t })))),
          h('tbody', {}, rows.map(([mode, name, emits, when]) => h('tr', {},
            h('td', { html: name }), h('td', { html: emits }),
            h('td', { class: 'mono', text: sgn(DECAYS[mode].dZ) }), h('td', { class: 'mono', text: sgn(DECAYS[mode].dA) }),
            h('td', { html: when }),
          ))),
        ),
      ),
    );

    const chHost = h('div');
    root.append(figure({ title: 'A decay chain on the chart of nuclides', note: '<span style="color: var(--red)">Red arrows</span>: alpha decays. <span style="color: var(--blue)">Blue arrows</span>: beta-minus decays. Dashed line: the most stable Z for each A, from the same liquid-drop formula. Half-lives are measured values.' }, chHost));
    new Player(chHost, { frames: chainFrames(), View: PhysView, view: { height: 380 } });

    root.append(
      p('When does a particular nucleus decay? Nobody can say: decay is <b>random</b>. Every nucleus of a given kind has the same chance of decaying in the next second, no matter how long it has already existed. With many nuclei, that turns into a smooth exponential law:'),
      equation({
        name: 'Radioactive decay law',
        eq: 'N = N<sub>0</sub> e<sup>\u2212\u03bbt</sup> = N<sub>0</sub> (\u00bd)<sup>t/T<sub>\u00bd</sub></sup>,&nbsp;&nbsp; \u03bb = <span class="frac"><span>ln 2</span><span>T<sub>\u00bd</sub></span></span>',
        says: 'Every half-life, half of what is left decays. The <b>activity</b> (decays per second) is R = \u03bbN, so it falls by the same factor as N. A short half-life means a high decay rate.',
        terms: [
          ['N, N<sub>0</sub>', 'nuclei left at time t, and at t = 0', ''],
          ['\u03bb', 'decay constant: probability per unit time that one nucleus decays', 's<sup>\u22121</sup>'],
          ['T<sub>\u00bd</sub>', 'half-life', 's'],
          ['R = \u03bbN', 'activity, in becquerels (1 Bq = 1 decay/s)', 'Bq'],
        ],
      }),
    );

    // decay sandbox
    const stage = h('div', { class: 'stage' });
    const view = new PhysView(stage, { height: 330, box: [640, 290] });
    let T = 4;
    const show = (reset) => view.show({ draw: decayDraw, live: true, resetTime: reset, p: { T }, box: [640, 290] }, { animate: false });
    root.append(
      figure(
        {
          title: 'Sandbox: random decays, predictable curve',
          tools: [h('button', { class: 'btn ghost small', text: 'Restart', onclick: () => show(true) })],
          note: `${N0} identical nuclei, each with the same chance per second to decay. Dark = not yet decayed; hollow = decayed. Solid line: this sample; dashed: the formula. Each run uses fresh random numbers, so the sample wanders around the formula, never exactly on it. The clock runs in real seconds; real half-lives range from microseconds to billions of years.`,
        },
        stage,
        controlsRow(slider({ label: 'Half-life T<sub>\u00bd</sub>', min: 1, max: 8, step: 0.5, value: T, fmt: (v) => `${v.toFixed(1)} s`, onInput: (v) => ((T = v), show(true)) })),
      ),
    );
    show(true);

    const age = ageFromFraction(0.25, C14_HALF_LIFE);
    root.append(
      callout('warn', 'Classic mistakes', 'Treating decay as linear ("after two half-lives it\u2019s all gone"): after two half-lives a quarter is left, after three an eighth. Also, in alpha decay A drops by <b>4</b> and Z by <b>2</b>; in beta-minus decay Z goes <b>up</b> by 1 and A does not change. Check every reaction by balancing Z and A on both sides.'),
      p(`<b>Carbon dating</b> puts the decay law to work. Living things keep the same small fraction of carbon-14 as the atmosphere; after death the C-14 decays with T<sub>\u00bd</sub> = ${C14_HALF_LIFE.toLocaleString('en-US')} years and is not replaced. A bone with 25% of the living ratio has been through two half-lives: ${eq('t = T<sub>\u00bd</sub> log<sub>2</sub>(N<sub>0</sub>/N)')} = ${Math.round(age).toLocaleString('en-US')} years. The same idea with uranium-238 (T<sub>\u00bd</sub> = 4.5 billion years) dates the oldest rocks.`),
      p(`One unit check ties the chapter together: ${eq('1 u \u00d7 c<sup>2</sup> = ' + U_MEV.toFixed(1) + ' MeV')}. Nuclear energies are MeV per nucleus; chemical energies are eV per atom. That factor of about a million is the whole difference between a nuclear reactor and a coal furnace, and decay constants like \u03bb = ln 2/T<sub>\u00bd</sub> (${decayConstant(C14_HALF_LIFE).toExponential(2).replace('e-', ' \u00d7 10<sup>\u2212')}</sup> per year for C-14) tell you how fast that energy trickles out.`),
      checkpoint(quiz),
    );
  },
};
