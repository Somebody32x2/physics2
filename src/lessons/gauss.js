import { h, p } from '../ui/dom.js';
import { Player } from '../ui/player.js';
import { PhysView } from '../core/phys-view.js';
import { figure, callout, segmented } from '../ui/figure.js';
import { checkpoint } from '../ui/quiz.js';
import { equation, readouts, slider, controlsRow } from '../ui/controls.js';
import { flux, gaussFlux, lineE, pointE, enclosed, circleCrossings, radialLines, conductorSphereField, conductorSigma } from '../model/electric.js';
import { chargeFieldLines, traceLine } from '../model/fields.js';

const deg = (a) => (a * Math.PI) / 180;
const inBox = (box) => ([x, y]) => x >= 0 && y >= 0 && x <= box[0] && y <= box[1];

// ---------- figure 1: flux through a tilted area ----------
const FX_BOX = [640, 290];
const FX = { cx: 330, cy: 145, L: 200, gap: 20, E: 1000, A: 0.04 };
const FX_YS = Array.from({ length: 13 }, (_, i) => 25 + i * FX.gap);
/** Field lines (at heights FX_YS) that cross the patch tilted by theta (deg). */
const crossingLines = (theta) => FX_YS.filter((y) => Math.abs(y - FX.cy) < (FX.L / 2) * Math.cos(deg(theta)) - 1e-9);
function fluxDraw(d, p) {
  const th = deg(p.theta);
  const hits = new Set(crossingLines(p.theta));
  for (const y of FX_YS) {
    const on = hits.has(y);
    d.arrow(16, y, FX_BOX[0] - 16, y, { cls: 'ph-E', w: on ? 2.2 : 1.1, opacity: on ? 1 : 0.3, head: 8 });
  }
  // the patch, seen edge-on: its normal makes angle theta with E (+x)
  const tx = -Math.sin(th);
  const ty = -Math.cos(th); // along the patch (screen coords)
  const h2 = FX.L / 2;
  const pts = [[FX.cx + tx * h2, FX.cy + ty * h2], [FX.cx - tx * h2, FX.cy - ty * h2]];
  d.line(...pts[0], ...pts[1], { cls: 'ph-glass', w: 7, opacity: 0.55 });
  d.line(...pts[0], ...pts[1], { cls: 'ph-glass', w: 1.6 });
  for (const y of hits) {
    // where this line meets the patch
    const s = (y - FX.cy) / ty;
    const x = FX.cx + tx * s;
    d.dot(x, y, { r: 3.6, cls: 'ph-E' });
  }
  const nx = Math.cos(th);
  const ny = -Math.sin(th);
  d.arrow(FX.cx, FX.cy, FX.cx + nx * 80, FX.cy + ny * 80, { cls: 'ph-F', w: 2.4 });
  d.text(FX.cx + nx * 100, FX.cy + ny * 100, 'normal', { cls: 'ph-F', halo: true });
  if (p.theta > 3) {
    const r = 44;
    const arc = [];
    for (let a = 0; a <= th + 1e-6; a += th / 20) arc.push([FX.cx + r * Math.cos(a), FX.cy - r * Math.sin(a)]);
    d.poly(arc, { cls: 'ph-F', w: 1.2 });
    d.text(FX.cx + 58 * Math.cos(th / 2), FX.cy - 58 * Math.sin(th / 2), '\u03b8', { cls: 'ph-F', serif: true, halo: true });
  }
  // projected height (what the field "sees")
  const hp = h2 * Math.cos(th);
  d.line(FX.cx - 150, FX.cy - hp, FX.cx - 150, FX.cy + hp, { cls: 'ph-F', w: 1.4 });
  d.line(FX.cx - 156, FX.cy - hp, FX.cx - 144, FX.cy - hp, { cls: 'ph-F', w: 1.4 });
  d.line(FX.cx - 156, FX.cy + hp, FX.cx - 144, FX.cy + hp, { cls: 'ph-F', w: 1.4 });
  if (hp > 30) d.text(FX.cx - 162, FX.cy, 'A cos\u03b8', { cls: 'ph-F', anchor: 'end', halo: true });
  d.text(FX_BOX[0] - 20, 14, `${hits.size} lines cross`, { cls: 'ph-F', anchor: 'end', halo: true });
}

// ---------- figure 2: Gaussian surface sandbox ----------
const GS_BOX = [640, 380];
const PER = 8; // lines per unit charge
const GS_PRESETS = {
  two: () => [{ x: 220, y: 190, q: 2 }, { x: 440, y: 190, q: -1 }],
  three: () => [{ x: 190, y: 200, q: 2 }, { x: 410, y: 110, q: -1 }, { x: 470, y: 280, q: 1 }],
};
function gaussDraw(d, p) {
  const { charges, surf, mode } = p;
  const keep = inBox(GS_BOX);
  let lines;
  if (mode === 'each') {
    lines = radialLines(charges, { perUnit: PER, length: 900 });
    for (const l of lines) {
      const vis = l.pts.filter(keep);
      const c = charges[l.of];
      d.fieldLines([vis], { arrows: [c.q > 0 ? 0.12 : 0.88], w: 1.1 });
    }
  } else {
    lines = chargeFieldLines(charges, { perUnit: PER, bounds: [0, 0, GS_BOX[0], GS_BOX[1]], ds: 3, maxSteps: 900 });
    d.fieldLines(lines.map((l) => l.pts), { arrows: [0.3], w: 1.1 });
  }
  const k = circleCrossings(lines, charges, surf);
  d.circle(surf.x, surf.y, surf.r, { id: 'surf', drag: true, cls: 'ph-glass', fill: true, w: 2.2 });
  for (const c of k.crossings) {
    if (!keep([c.x, c.y])) continue;
    if (c.out) d.dot(c.x, c.y, { r: 4.2, cls: 'ph-good' });
    else d.circle(c.x, c.y, 4, { cls: 'ph-bad', w: 2 });
  }
  charges.forEach((c, i) => d.charge(c.x, c.y, c.q, { id: `c${i}`, drag: true, r: 12 + 3 * Math.abs(c.q), label: `${c.q > 0 ? '+' : '\u2212'}${Math.abs(c.q)}` }));
  return k;
}

// ---------- figure 3: three symmetries ----------
const SY_BOX = [640, 300];
const SYM = {
  sphere: { eq: 'E \u00b7 4\u03c0r<sup>2</sup> = Q/\u03b5<sub>0</sub>', res: 'E = kQ/r<sup>2</sup>', f: (r) => 1 / (r * r) },
  line: { eq: 'E \u00b7 2\u03c0rL = \u03bbL/\u03b5<sub>0</sub>', res: 'E = 2k\u03bb/r', f: (r) => 1 / r },
  plane: { eq: 'E \u00b7 2A = \u03c3A/\u03b5<sub>0</sub>', res: 'E = \u03c3/2\u03b5<sub>0</sub>', f: () => 1 },
};
function symDraw(d, p) {
  const cx = 165;
  const cy = 150;
  const R = 92;
  if (p.kind === 'sphere') {
    for (let k = 0; k < 12; k++) {
      const a = (2 * Math.PI * (k + 0.5)) / 12;
      d.arrow(cx + 20 * Math.cos(a), cy + 20 * Math.sin(a), cx + 135 * Math.cos(a), cy + 135 * Math.sin(a), { cls: 'ph-E', w: 1.4, head: 8 });
    }
    d.circle(cx, cy, R, { cls: 'ph-glass', fill: true, w: 2 });
    d.path(`M${cx - R} ${cy}A${R} ${R * 0.28} 0 0 0 ${cx + R} ${cy}`, { cls: 'ph-glass', w: 1.2 });
    d.path(`M${cx - R} ${cy}A${R} ${R * 0.28} 0 0 1 ${cx + R} ${cy}`, { cls: 'ph-glass', w: 1, dash: '4 4' });
    d.charge(cx, cy, 1, { r: 14, label: '+Q' });
    d.text(cx, cy + R + 22, 'Gaussian sphere, radius r', { cls: 'ph-label', halo: true });
  } else if (p.kind === 'line') {
    const top = 25;
    const bot = 275;
    for (const y of [55, 105, 150, 195, 245]) {
      d.arrow(cx + 8, y, cx + 140, y, { cls: 'ph-E', w: 1.4, head: 8 });
      d.arrow(cx - 8, y, cx - 140, y, { cls: 'ph-E', w: 1.4, head: 8 });
    }
    const w = 70;
    const ey = 16;
    d.path(`M${cx - w} 70V230A${w} ${ey} 0 0 0 ${cx + w} 230V70`, { cls: 'ph-glass', fill: true, w: 2 });
    d.path(`M${cx - w} 70A${w} ${ey} 0 0 1 ${cx + w} 70A${w} ${ey} 0 0 1 ${cx - w} 70Z`, { cls: 'ph-glass', fill: true, w: 2 });
    d.line(cx, top, cx, bot, { cls: 'ph-pos', w: 5 });
    for (let y = top + 12; y < bot; y += 26) d.text(cx + 14, y, '+', { cls: 'ph-pos', size: 13 });
    d.text(cx, bot + 14, 'Gaussian cylinder, radius r', { cls: 'ph-label', halo: true });
  } else {
    for (const y of [40, 95, 225, 280]) {
      d.arrow(cx + 10, y, cx + 130, y, { cls: 'ph-E', w: 1.4, head: 8 });
      d.arrow(cx - 10, y, cx - 130, y, { cls: 'ph-E', w: 1.4, head: 8 });
    }
    d.rect(cx - 5, 15, 10, 270, { cls: 'ph-pos', fill: true, w: 1.2 });
    for (let y = 30; y < 285; y += 24) d.text(cx, y, '+', { cls: 'ph-pos', size: 12 });
    d.rect(cx - 80, 125, 160, 50, { cls: 'ph-glass', fill: true, w: 2, rx: 6 });
    d.arrow(cx + 92, 150, cx + 130, 150, { cls: 'ph-E', w: 2.2, head: 9 });
    d.arrow(cx - 92, 150, cx - 130, 150, { cls: 'ph-E', w: 2.2, head: 9 });
    d.text(cx, 196, 'Gaussian pillbox, end area A', { cls: 'ph-label', halo: true });
  }
  // graph of E vs distance for all three; the current one highlighted
  const pl = d.plot({ x: 380, y: 50, w: 230, h: 200, xr: [0, 4], yr: [0, 2], xLabel: 'r', yLabel: 'E', ticksX: [[1, ''], [2, ''], [3, ''], [4, '']] });
  for (const [k, s] of Object.entries(SYM)) {
    const on = k === p.kind;
    pl.fn(s.f, { from: k === 'sphere' ? 0.72 : k === 'line' ? 0.52 : 0.1, to: 4, cls: on ? 'ph-plot' : 'ph-mute', w: on ? 2.6 : 1.4 });
  }
  pl.label(0.86, 1.55, '1/r<sup>2</sup>', { anchor: 'start', cls: p.kind === 'sphere' ? 'ph-plot' : 'ph-label' });
  pl.label(3.4, SYM.line.f(3.4) + 0.16, '1/r', { cls: p.kind === 'line' ? 'ph-plot' : 'ph-label' });
  pl.label(3.4, 1.14, 'constant', { cls: p.kind === 'plane' ? 'ph-plot' : 'ph-label' });
  d.text(495, 20, SYM[p.kind].eq, { serif: true, size: 17, cls: 'ph-F' });
  d.text(495, 282, `\u21d2 ${SYM[p.kind].res}`, { serif: true, size: 17, cls: 'ph-F' });
}

// ---------- figure 4: a conductor reaching equilibrium ----------
const CD_BOX = [640, 320];
const CD = { cx: 320, cy: 160, R: 82 };
const CD_SEEDS = Array.from({ length: 12 }, (_, i) => 34 + i * 23.3);
const ELECTRONS = [[-40, -40], [0, -50], [40, -30], [-50, 0], [-10, 10], [30, 5], [55, 30], [-30, 45], [10, 50], [-5, -20]];
function conductorDraw(d, p) {
  const s = p.s;
  const field = conductorSphereField(1, CD.R, s, CD.cx, CD.cy);
  const bounds = [0, 0, CD_BOX[0], CD_BOX[1]];
  const inside = (x, y) => Math.hypot(x - CD.cx, y - CD.cy) < CD.R - 0.5;
  const lines = [];
  for (const y0 of CD_SEEDS) {
    const ln = traceLine(field, [0, y0], { ds: 3, maxSteps: 600, bounds, stop: s > 0.995 ? (x, y) => inside(x, y) : null });
    lines.push(ln);
    const last = ln[ln.length - 1];
    if (last[0] < CD_BOX[0] - 5) lines.push(ln.map(([x, y]) => [2 * CD.cx - x, y]).reverse()); // mirror image leaving the right side
  }
  if (p.cavity) d.circle(CD.cx, CD.cy, CD.R, { cls: 'ph-mute', w: 0 });
  d.circle(CD.cx, CD.cy, CD.R, { cls: 'ph-mute', fill: true, w: 2.4, style: '--c: var(--muted); --fo: 0.14' });
  if (p.cavity) d.circle(CD.cx, CD.cy, CD.R * 0.55, { cls: 'ph-mute', fill: true, w: 2, style: '--c: var(--surface); --fo: 1' });
  d.fieldLines(lines, { arrows: [0.16, 0.86], w: 1.3 });
  // induced surface charge ~ s cos(theta)
  for (let k = 0; k < 18; k++) {
    const a = (2 * Math.PI * k) / 18;
    const sig = conductorSigma(s, a);
    if (Math.abs(sig) < 0.18) continue;
    const r = CD.R - 9;
    d.charge(CD.cx + r * Math.cos(a), CD.cy + r * Math.sin(a), sig, { r: 6.5, size: 11, opacity: Math.min(1, Math.abs(sig) * 1.2).toFixed(2) });
  }
  // free electrons drifting toward the left surface
  ELECTRONS.forEach(([ex, ey], i) => {
    const a = Math.PI + ((i - 4.5) / 4.5) * 1.05;
    const tx = (CD.R - 24) * Math.cos(a);
    const ty = (CD.R - 24) * Math.sin(a);
    const k = Math.min(1, s * 1.1);
    if (!p.cavity) d.dot(CD.cx + ex + (tx - ex) * k, CD.cy + ey + (ty - ey) * k, { r: 3, cls: 'ph-neg', opacity: (1 - 0.85 * k).toFixed(2) });
  });
  // field inside
  const ein = 1 - s;
  if (ein > 0.02 && !p.cavity) {
    for (const y of [-30, 30]) d.arrow(CD.cx - 28 * ein, CD.cy + y, CD.cx + 28 * ein, CD.cy + y, { cls: 'ph-E', w: 2.6, head: 8 });
  }
  d.text(CD.cx, CD.cy + CD.R + 16, p.cavity ? 'E = 0 in the metal and the cavity' : `E inside = ${Math.round(ein * 100)}% of E<sub>0</sub>`, { cls: 'ph-F', halo: true, size: 13 });
  if (p.perp) {
    // right-angle marks where two lines meet the surface
    for (const a of [Math.PI - 0.62, 0.62]) {
      const x = CD.cx + CD.R * Math.cos(a);
      const y = CD.cy + CD.R * Math.sin(a);
      const n = [Math.cos(a), Math.sin(a)];
      const t = [-n[1], n[0]];
      const m = 9;
      d.poly([[x + t[0] * m, y + t[1] * m], [x + t[0] * m + n[0] * m, y + t[1] * m + n[1] * m], [x + n[0] * m, y + n[1] * m]], { cls: 'ph-F', w: 1.3 });
    }
  }
  d.text(20, 12, 'E<sub>0</sub> (applied)', { cls: 'ph-E', anchor: 'start', halo: true });
}

function conductorFrames() {
  const f = (p, caption) => ({ draw: conductorDraw, p: { perp: 0, cavity: 0, ...p }, box: CD_BOX, caption });
  return [
    f({ s: 0 }, 'A neutral metal ball is dropped into a uniform field E<sub>0</sub>. Field lines go straight through it for the first instant. Its <b>free electrons</b> (blue dots) feel F = qE, <b>opposite to E</b>: to the left.'),
    f({ s: 0.4 }, 'Electrons pile up on the <b>left</b> surface and leave uncovered positive ions on the <b>right</b>. That separated charge makes its own field pointing left inside the metal, which <b>cancels part</b> of E<sub>0</sub>: the inside field drops to 60%.'),
    f({ s: 0.8 }, 'More charge separates, the inside field drops to 20%, and the push on the remaining electrons gets weaker. Field lines now bend toward the ball and land on its charges.'),
    f({ s: 1 }, '<b>Equilibrium: E = 0 inside.</b> With no field there is no force on the free electrons, so they stop moving. This takes far less than a microsecond. The ball is still neutral overall; the charge has only moved to the surface.'),
    f({ s: 1, perp: 1 }, 'Just outside, the field is <b>perpendicular to the surface</b>. Any sideways (tangential) part would push surface charge along the metal, so in equilibrium there is none. Lines end on the \u2212 charges on the left and start again from the + charges on the right.'),
    f({ s: 1, cavity: 1 }, 'Hollow it out: the empty cavity has <b>E = 0</b> too, whatever the field outside does. This is a <b>Faraday cage</b>: a car in a lightning storm, the metal mesh in a microwave door, a shielded cable.'),
  ];
}

// ---------- quiz ----------
const QS_BOX = [520, 170];
const QS = [
  { surf: { x: 65, y: 75, r: 45 }, charges: [{ x: 65, y: 75, q: 1 }] },
  { surf: { x: 195, y: 75, r: 52 }, charges: [{ x: 175, y: 75, q: 1 }, { x: 215, y: 75, q: -1 }] },
  { surf: { x: 325, y: 75, r: 40 }, charges: [{ x: 325, y: 133, q: 2 }] },
  { surf: { x: 455, y: 75, r: 40 }, charges: [{ x: 455, y: 75, q: -1 }, { x: 455, y: 20, q: 2 }] },
];
const zeroSurfaces = () => QS.map((s, i) => (enclosed(s.charges, s.surf) === 0 ? `s${i}` : null)).filter(Boolean);
function qsDraw(d, p) {
  QS.forEach((s, i) => {
    d.circle(s.surf.x, s.surf.y, s.surf.r, { id: `s${i}`, cls: 'ph-glass', fill: true, w: 2.2 });
    for (const c of s.charges) d.charge(c.x, c.y, c.q, { r: 11, size: 12, label: `${c.q > 0 ? '+' : '\u2212'}${Math.abs(c.q)}`, style: 'pointer-events: none' });
    d.text(s.surf.x - s.surf.r + 2, s.surf.y - s.surf.r + 2, String.fromCharCode(65 + i), { cls: 'ph-label', size: 14, anchor: 'end' });
    if (p.after) d.text(s.surf.x, 163, `Q<sub>enc</sub> = ${String(enclosed(s.charges, s.surf)).replace("-", "\u2212")}`, { cls: 'ph-F', size: 12 });
  });
}

const lineR = lineE(1, 0.02) / lineE(1, 0.06);
const quiz = [
  {
    type: 'mcq',
    id: 'gauss.double-radius',
    prompt: 'A point charge sits at the center of a spherical Gaussian surface. You double the sphere\u2019s radius. What happens to the net electric flux through it?',
    choices: ['It drops to a quarter (E goes as 1/r<sup>2</sup>)', 'It halves', 'It stays the same', 'It quadruples (the area goes as r<sup>2</sup>)'],
    answer: 2,
    explain: `Both effects happen and cancel: at twice the radius E is <b>\u00bc</b> as strong, but the area 4\u03c0r<sup>2</sup> is <b>4\u00d7</b> as big. Flux = E \u00b7 A = (\u00bc)(4) = 1\u00d7 the old flux. Gauss says it directly: flux = Q<sub>enc</sub>/\u03b5<sub>0</sub>, and the enclosed charge didn\u2019t change. (For 1 nC that is ${gaussFlux(1e-9).toFixed(0)} N\u00b7m\u00b2/C at any radius.)`,
  },
  {
    type: 'pick',
    id: 'gauss.zero-flux',
    prompt: 'Click <b>every</b> closed surface with zero net electric flux through it.',
    View: PhysView,
    view: { height: 210, box: QS_BOX },
    build: () => ({
      frame: { draw: qsDraw, p: {}, box: QS_BOX },
      answer: zeroSurfaces(),
      after: { draw: qsDraw, p: { after: 1 }, box: QS_BOX },
    }),
    explain: 'Net flux depends only on the charge <b>inside</b>. B encloses +1 and \u22121: Q<sub>enc</sub> = 0, so zero net flux (lines still pass through, as many in as out). C encloses nothing: the +2 just outside sends lines in one side and out the other, net zero. A (+1) and D (\u22121 inside; the +2 outside does not count) are not zero.',
  },
  {
    type: 'mcq',
    id: 'gauss.conductor-charge',
    prompt: 'You put extra negative charge on a solid metal sphere. Once things settle, where is that charge and what is E inside the metal?',
    choices: [
      'Spread evenly through the volume; E inside points inward',
      'On the outer surface; E = 0 everywhere inside the metal',
      'Concentrated at the center; E inside is strongest there',
      'On the outer surface; E inside is kQ/r<sup>2</sup>, as for a point charge',
    ],
    answer: 1,
    explain: 'In equilibrium the free charges stop moving, which needs <b>E = 0</b> inside the metal. Then a Gaussian surface drawn just inside the metal has zero flux, so it encloses <b>zero net charge</b>: all the excess sits on the <b>outer surface</b> (like charges push each other as far apart as they can go). Outside, the sphere acts like a point charge kQ/r<sup>2</sup>; inside, nothing.',
  },
  {
    type: 'input',
    id: 'gauss.line-charge',
    prompt: 'A long charged wire makes a field of 600 N/C at 2 cm from it. What is the field at 6 cm, in N/C?',
    accept: (s) => Math.abs(parseFloat(s) - 600 / lineR) < 0.5,
    placeholder: 'N/C',
    explain: `For a line of charge, Gauss with a cylinder gives E \u00b7 2\u03c0rL = \u03bbL/\u03b5<sub>0</sub>, so <b>E \u221d 1/r</b> (not 1/r<sup>2</sup>). Three times farther: 600/${lineR.toFixed(0)} = <b>${(600 / lineR).toFixed(0)} N/C</b>. (A point charge would give 600/9 \u2248 ${(600 * pointE(1, 0.06) / pointE(1, 0.02)).toFixed(0)}; a big sheet would still give 600.)`,
  },
];

export default {
  id: 'gauss',
  title: "Gauss's law",
  group: 'Electric fields',
  blurb: 'Flux counts how much field pokes through a surface; the net flux out of any closed surface is the charge inside over epsilon zero.',
  quiz,
  render(root) {
    root.append(
      p('Field lines give a way to <i>count</i> field. <b>Electric flux</b> through a surface is how much field pokes through it: picture the number of field lines crossing it. A big surface facing the field head-on catches many lines; the same surface tilted catches fewer; turned edge-on it catches none.'),
      p('Flux is the electric version of "how much rain falls into a bucket": it depends on how hard it is raining (E), the size of the opening (A), and how the opening is tilted relative to the rain.'),
      equation({
        name: 'Electric flux (uniform field, flat area)',
        eq: '\u03a6<sub>E</sub> = E A cos\u03b8',
        says: 'Flux grows with field strength and area, and is largest when the area faces the field (\u03b8 = 0). At \u03b8 = 90\u00b0 the field skims along the surface and the flux is zero. For curved surfaces or varying fields, add up E A cos\u03b8 over every little patch (an integral).',
        terms: [
          ['\u03a6<sub>E</sub>', 'electric flux through the surface', 'N\u00b7m\u00b2/C'],
          ['E', 'field strength', 'N/C'],
          ['A', 'area of the surface', 'm\u00b2'],
          ['\u03b8', 'angle between E and the surface\u2019s <b>normal</b> (the perpendicular), not the surface itself', ''],
        ],
      }),
    );

    // ----- flux slider -----
    const fstage = h('div', { class: 'stage' });
    const fview = new PhysView(fstage, { height: 300, box: FX_BOX });
    const fro = readouts([['c', 'cos\u03b8'], ['phi', '\u03a6 = EA cos\u03b8']]);
    let theta = 0;
    const fredraw = () => {
      fview.show({ draw: fluxDraw, p: { theta }, box: FX_BOX }, { animate: false });
      fro.set({ c: Math.cos(deg(theta)).toFixed(2), phi: `${flux(FX.E, FX.A, deg(theta)).toFixed(1)} N\u00b7m\u00b2/C` });
    };
    root.append(
      figure(
        { title: 'Flux through a tilted area', note: `A ${Math.sqrt(FX.A) * 100} cm square seen <b>edge-on</b> (blue) in a uniform ${FX.E} N/C field. Only the lines that pierce it (bold) count. Tilting it shrinks the area the field "sees" to A cos\u03b8.` },
        fstage,
        controlsRow(slider({ label: 'Tilt \u03b8 of the normal', min: 0, max: 90, step: 1, value: 0, fmt: (v) => `${v}\u00b0`, onInput: (v) => ((theta = v), fredraw()) })),
        fro,
      ),
    );
    fredraw();

    root.append(
      p('Now wrap a surface all the way around something: a <b>closed</b> surface, like a balloon. By convention, flux leaving counts <b>positive</b> and flux entering counts <b>negative</b>. Gauss\u2019s law says the net flux out depends on just one thing:'),
      equation({
        name: 'Gauss\u2019s law',
        eq: '\u03a6<sub>net</sub> = \u222e <span class="vec">E</span> \u00b7 d<span class="vec">A</span> = <span class="frac"><span>Q<sub>enc</sub></span><span>\u03b5<sub>0</sub></span></span>',
        says: 'The net flux out of <b>any</b> closed surface equals the charge enclosed divided by \u03b5<sub>0</sub>. The shape and size of the surface don\u2019t matter, and charges outside contribute <b>zero net</b> flux (their lines go in and come back out). The circle on the integral means "add up E\u00b7dA over the whole closed surface".',
        terms: [
          ['\u03a6<sub>net</sub>', 'net flux out through the closed surface (out minus in)', 'N\u00b7m\u00b2/C'],
          ['Q<sub>enc</sub>', 'total charge inside the surface, with signs', 'C'],
          ['\u03b5<sub>0</sub>', '= 8.85 \u00d7 10<sup>\u221212</sup>, the permittivity of free space (k = 1/4\u03c0\u03b5<sub>0</sub>)', 'C\u00b2/(N\u00b7m\u00b2)'],
        ],
      }),
      p('In line language: every line that starts inside must cross out, every line that ends inside must cross in, and a line that just passes through crosses in and out once each. So <b>lines out minus lines in</b> counts the charge inside. Test it below.'),
    );

    // ----- Gaussian surface sandbox -----
    const gstage = h('div', { class: 'stage' });
    let preset = 'three';
    let gcharges = GS_PRESETS[preset]();
    let surf = { x: 220, y: 190, r: 90 };
    let gmode = 'each';
    let grab = null;
    const gro = readouts([['q', 'Q<sub>enc</sub>'], ['out', 'lines out'], ['in', 'lines in'], ['net', 'out \u2212 in'], ['phi', '\u03a6<sub>net</sub> = Q<sub>enc</sub>/\u03b5<sub>0</sub>']]);
    const gview = new PhysView(gstage, {
      height: 380,
      box: GS_BOX,
      onDrag: (id, x, y, phase) => {
        const cx = Math.max(10, Math.min(GS_BOX[0] - 10, x));
        const cy = Math.max(10, Math.min(GS_BOX[1] - 10, y));
        if (id === 'surf') {
          if (phase === 'start') grab = [x - surf.x, y - surf.y];
          surf = { ...surf, x: Math.max(0, Math.min(GS_BOX[0], x - grab[0])), y: Math.max(0, Math.min(GS_BOX[1], y - grab[1])) };
        } else {
          const i = Number(id.slice(1));
          gcharges = gcharges.map((c, k) => (k === i ? { ...c, x: cx, y: cy } : c));
        }
        gredraw();
      },
    });
    const rslider = slider({ label: 'Surface radius', min: 30, max: 240, step: 1, value: surf.r, fmt: (v) => `${v}`, onInput: (v) => ((surf = { ...surf, r: v }), gredraw()) });
    const gredraw = () => {
      let k;
      gview.show({ draw: (d, p) => { k = gaussDraw(d, p); }, p: { charges: gcharges, surf, mode: gmode }, box: GS_BOX }, { animate: false });
      const q = enclosed(gcharges, surf);
      const counted = gmode === 'each';
      gro.set({
        q: `${q > 0 ? '+' : q < 0 ? '\u2212' : ''}${Math.abs(q)} nC`,
        out: counted ? String(k.out) : '\u2014',
        in: counted ? String(k.in) : '\u2014',
        net: counted ? `${k.out - k.in} = ${PER} \u00d7 (${q})` : '\u2014',
        phi: `${gaussFlux(q * 1e-9).toFixed(0)} N\u00b7m\u00b2/C`,
      });
    };
    root.append(
      figure(
        {
          title: 'Sandbox: a Gaussian surface',
          tools: [
            segmented([{ value: 'each', label: 'Each charge alone' }, { value: 'real', label: 'Actual field' }], gmode, (v) => ((gmode = v), gredraw())),
            segmented([{ value: 'two', label: '2 charges' }, { value: 'three', label: '3 charges' }], preset, (v) => ((preset = v), (gcharges = GS_PRESETS[v]()), gredraw())),
          ],
          note: `Drag the blue surface or the charges; ${PER} lines per nC. Green dots: lines leaving; red rings: lines entering. <b>Each charge alone</b> draws every charge\u2019s own straight lines (fields add, so fluxes add): the count is exact. <b>Actual field</b> shows the real, curved lines of the total field; same rule, but the drawing is only a sample of lines.`,
        },
        gstage,
        controlsRow(rslider),
        gro,
      ),
    );
    gredraw();

    root.append(
      callout('key', 'What Gauss\u2019s law is really saying', 'Field lines are only created and destroyed by charge. So the flux out of a closed surface measures the charge inside, and nothing else. <b>Outside charges change E on the surface, but not the net flux.</b>'),
      h('h2', { text: 'Using symmetry to find E' }),
      p('Gauss\u2019s law is always true, but it only <i>hands you E</i> when the charge is so symmetric that you can pick a surface where E has the same size everywhere and is perpendicular to it. Then the flux is just E \u00d7 (area), and you solve for E. There are exactly three such shapes, and they give the three scaling laws from the last chapter:'),
    );

    // ----- symmetries -----
    const sstage = h('div', { class: 'stage' });
    const sview = new PhysView(sstage, { height: 300, box: SY_BOX });
    let kind = 'sphere';
    const sredraw = () => sview.show({ draw: symDraw, p: { kind }, box: SY_BOX }, { animate: false });
    root.append(
      figure(
        {
          title: 'Three symmetries, three laws',
          tools: [segmented([{ value: 'sphere', label: 'Sphere' }, { value: 'line', label: 'Line' }, { value: 'plane', label: 'Plane' }], kind, (v) => ((kind = v), sredraw()))],
          note: 'The field\u2019s flux spreads over the Gaussian surface\u2019s area. A sphere\u2019s area grows as r<sup>2</sup>, a cylinder\u2019s side as r, and the pillbox\u2019s ends not at all: that is the whole story of 1/r<sup>2</sup>, 1/r and constant.',
        },
        sstage,
      ),
    );
    sredraw();

    root.append(
      p('The sphere result has a bonus: <b>outside any spherically symmetric charge</b> (a charged ball, a planet, a shell), the field is exactly that of a point charge at the center. Newton needed calculus to prove this for gravity; Gauss makes it one line. Inside a uniform shell, the enclosed charge is zero, so E = 0.'),
      h('h2', { text: 'Conductors' }),
      p('A <b>conductor</b> (any metal) has electrons that are free to move. If there is any field inside, they move. So once everything settles (<b>electrostatic equilibrium</b>), the field inside the metal must be <b>zero</b>. Watch a ball reach that state.'),
    );

    const chost = h('div');
    root.append(figure({ title: 'A conductor cancels the field inside', note: 'Field lines traced from the exact solution for a metal sphere in a uniform field. Inside arrows: the field left in the metal.' }, chost));
    new Player(chost, { frames: conductorFrames(), View: PhysView, view: { height: 330 } });

    root.append(
      p('Gauss\u2019s law finishes the argument. Draw a Gaussian surface just inside the metal\u2019s surface: E = 0 everywhere on it, so the flux is zero, so the enclosed charge is zero. <b>Any excess charge on a conductor sits on its outer surface.</b> The four conductor facts to remember: E = 0 inside; excess charge on the surface; E just outside is perpendicular to the surface (with size \u03c3/\u03b5<sub>0</sub>); a closed metal shell shields its inside.'),
      callout('warn', 'Classic mistakes', '<b>1.</b> "Zero flux means zero field." No: a closed surface with no charge inside can have strong field all over it; it just has as much going in as out. <b>2.</b> Using Gauss to get E where there is no symmetry. The law is still true, but E is not the same over the surface, so you cannot pull it out of the sum. <b>3.</b> Measuring \u03b8 from the surface instead of from its normal.'),
      checkpoint(quiz),
    );
  },
};
