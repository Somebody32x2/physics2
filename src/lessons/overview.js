import { h, p } from '../ui/dom.js';
import { Player } from '../ui/player.js';
import { PhysView } from '../core/phys-view.js';
import { figure, callout, segmented } from '../ui/figure.js';
import { checkpoint } from '../ui/quiz.js';
import { eq, slider, controlsRow } from '../ui/controls.js';
import { protonForces, electricArrowLength, C } from '../model/overview.js';

const sci = (x, digits = 1) => {
  const e = Math.floor(Math.log10(Math.abs(x)));
  const m = x / 10 ** e;
  return `${m.toFixed(digits)} \u00d7 10<sup>${e < 0 ? '\u2212' : ''}${Math.abs(e)}</sup>`;
};

// ---------- figure 1: the concept map ----------
const NW = 124;
const NH = 40;
const NODES = [
  { id: 'charge', label: 'Charge', x: 90, y: 50, step: 0 },
  { id: 'efield', label: 'E field', x: 320, y: 50, step: 0, cls: 'ph-E' },
  { id: 'potential', label: 'Potential', x: 550, y: 50, step: 1 },
  { id: 'current', label: 'Current', x: 90, y: 190, step: 2, cls: 'ph-I' },
  { id: 'bfield', label: 'B field', x: 320, y: 190, step: 3, cls: 'ph-B' },
  { id: 'induction', label: 'Induction', x: 550, y: 190, step: 4 },
  { id: 'light', label: 'Light', x: 150, y: 330, step: 5, cls: 'ph-light' },
  { id: 'photons', label: 'Photons', x: 350, y: 330, step: 6, cls: 'ph-light' },
  { id: 'nucleus', label: 'Nucleus', x: 550, y: 330, step: 7 },
];
const node = Object.fromEntries(NODES.map((n) => [n.id, n]));
// label: lines of text; lx, ly: label position (box units); anchor: text anchor
const LINKS = [
  { from: 'charge', to: 'efield', bend: -20, label: ['makes'], lx: 205, ly: 15, step: 0, cls: 'ph-E' },
  { from: 'efield', to: 'charge', bend: -20, label: ['pushes'], lx: 205, ly: 86, step: 0, cls: 'ph-F' },
  { from: 'efield', to: 'potential', bend: 0, label: ['energy per', 'charge'], lx: 435, ly: 24, step: 1 },
  { from: 'charge', to: 'current', bend: 0, label: ['flows as'], lx: 98, ly: 120, anchor: 'start', step: 2, cls: 'ph-I' },
  { from: 'current', to: 'bfield', bend: -20, label: ['makes'], lx: 205, ly: 155, step: 3, cls: 'ph-B' },
  { from: 'bfield', to: 'current', bend: -20, label: ['pushes'], lx: 205, ly: 226, step: 3, cls: 'ph-F' },
  { from: 'bfield', to: 'induction', bend: 0, label: ['changing B'], lx: 435, ly: 204, step: 4, cls: 'ph-B' },
  { from: 'induction', to: 'efield', bend: 0, label: ['makes E'], lx: 470, ly: 110, anchor: 'start', step: 4, cls: 'ph-E' },
  { from: 'efield', to: 'bfield', bend: 0, label: ['changing E', 'makes B'], lx: 312, ly: 120, anchor: 'end', step: 5, cls: 'ph-B' },
  { from: 'bfield', to: 'light', bend: 0, label: ['E and B', 'together'], lx: 258, ly: 268, anchor: 'start', step: 5, cls: 'ph-light' },
  { from: 'light', to: 'photons', bend: 0, label: ['in lumps'], lx: 250, ly: 310, step: 6, cls: 'ph-light' },
  { from: 'photons', to: 'nucleus', bend: 0, label: ['zoom in'], lx: 450, ly: 310, step: 7 },
];

/** Where the ray from the node center toward (tx, ty) leaves the node's rectangle (plus a gap). */
function exitPoint(n, tx, ty, gap = 5) {
  const dx = tx - n.x;
  const dy = ty - n.y;
  const k = Math.min((NW / 2 + gap) / Math.abs(dx || 1e-9), (NH / 2 + gap) / Math.abs(dy || 1e-9));
  return [n.x + dx * k, n.y + dy * k];
}

function linkPath(l) {
  const a = node[l.from];
  const b = node[l.to];
  const len = Math.hypot(b.x - a.x, b.y - a.y);
  const nx = -(b.y - a.y) / len;
  const ny = (b.x - a.x) / len;
  const cx = (a.x + b.x) / 2 + nx * l.bend * 2;
  const cy = (a.y + b.y) / 2 + ny * l.bend * 2;
  const s = exitPoint(a, cx, cy);
  const e = exitPoint(b, cx, cy);
  const pts = [];
  for (let i = 0; i <= 24; i++) {
    const t = i / 24;
    pts.push([(1 - t) ** 2 * s[0] + 2 * (1 - t) * t * cx + t * t * e[0], (1 - t) ** 2 * s[1] + 2 * (1 - t) * t * cy + t * t * e[1]]);
  }
  return pts;
}

/** p.n / p.l: how lit each node / link is (0..1); p.hn / p.hl: emphasis for the current step. */
function mapDraw(d, p) {
  LINKS.forEach((l, i) => {
    const lit = p.l[i];
    if (lit < 0.02) return;
    const g = d.group({ cls: l.cls ?? 'ph-plot', opacity: lit.toFixed(2) });
    const pts = linkPath(l);
    const w = 1.5 + 1.1 * p.hl[i];
    g.poly(pts.slice(0, -2), { w });
    g.arrow(...pts[pts.length - 3], ...pts[pts.length - 1], { w, head: 10 });
    l.label.forEach((s, k) => g.text(l.lx, l.ly + (k - (l.label.length - 1) / 2) * 15, s, { anchor: l.anchor, halo: true, size: 12.5 }));
  });
  NODES.forEach((n, i) => {
    const lit = p.n[i];
    const g = d.group({ cls: n.cls, id: p.ids ? `m-${n.id}` : null, opacity: (0.16 + 0.84 * lit).toFixed(2) });
    g.rect(n.x - NW / 2, n.y - NH / 2, NW, NH, { rx: 9, fill: true, w: 1.3 + 1.5 * p.hn[i], style: `--fo:${(0.06 + 0.12 * p.hn[i]).toFixed(2)}` });
    g.text(n.x, n.y + 1, n.label, { size: 15 });
  });
}

const STEP_CAPTIONS = [
  'Start with <b>charge</b>. A charge <b>makes</b> an electric field in the space around it, and the field <b>pushes</b> on any other charge that sits there. That two-step picture replaces "action at a distance". Lives in <a href="#/charge">Charge &amp; Coulomb\u2019s law</a>, <a href="#/field">The electric field</a> and <a href="#/gauss">Gauss\u2019s law</a>.',
  'The same field, told with <b>energy</b>: the potential V is energy per unit charge, a number at each point instead of an arrow. Energy conservation from Physics I carries straight over. Lives in <a href="#/potential">Electric potential</a> and <a href="#/capacitance">Capacitors</a>.',
  'Give charges a closed conducting path and a push (a battery), and they <b>flow</b>: that is <b>current</b>. Circuits are bookkeeping of charge (it is conserved at every junction) and of energy (it is conserved around every loop). Lives in <a href="#/current">Current &amp; resistance</a>, <a href="#/dc-circuits">DC circuits</a> and <a href="#/rc">RC circuits</a>.',
  '<b>Moving</b> charge makes a <b>magnetic field</b>, and a magnetic field pushes only on <b>moving</b> charge, sideways to its motion. A charge at rest neither makes nor feels B. Lives in <a href="#/magnetic-force">Magnetic force</a> and <a href="#/magnetic-sources">Where magnetic fields come from</a>.',
  'A <b>changing</b> magnetic field makes an electric field, and that field drives current around a loop with no battery: generators, transformers, inductors. Lives in <a href="#/induction">Induction</a> and <a href="#/inductance">Inductance &amp; oscillations</a>.',
  `The last link: a <b>changing</b> electric field also makes a magnetic field. Now E and B can keep regenerating each other far from any charge, and the pattern travels at c = ${(C / 1e8).toFixed(2)} \u00d7 10<sup>8</sup> m/s. That traveling pattern is <b>light</b>. Lives in <a href="#/em-waves">Electromagnetic waves</a>, <a href="#/rays">Reflection, refraction &amp; lenses</a>, <a href="#/interference">Interference</a> and <a href="#/diffraction">Diffraction</a>.`,
  'Light also arrives in <b>lumps</b>, photons of energy E = hf. The same lumpiness explains why atoms give off sharp colors and why electrons behave like waves. Lives in <a href="#/photons">Photons</a> and <a href="#/atoms">Atoms &amp; matter waves</a>.',
  `Zoom into the atom: the <b>nucleus</b>. Two protons 1 fm apart repel with about <b>${Math.round(protonForces(1e-15).electric)} N</b>, yet nuclei hold together, so a stronger force must exist; mass turns into energy through E = mc<sup>2</sup>. Lives in <a href="#/nuclear">Nuclear physics</a>.`,
];

function mapFrames() {
  return STEP_CAPTIONS.map((caption, k) => ({
    draw: mapDraw,
    box: [640, 362],
    p: {
      n: NODES.map((n) => (n.step <= k ? 1 : 0)),
      hn: NODES.map((n) => (n.step === k ? 1 : 0)),
      l: LINKS.map((l) => (l.step <= k ? 1 : 0)),
      hl: LINKS.map((l) => (l.step === k ? 1 : 0)),
    },
    caption,
  }));
}

const fullMap = (roles) => ({
  draw: mapDraw,
  box: [640, 362],
  p: { n: NODES.map(() => 1), hn: NODES.map(() => 0), l: LINKS.map(() => 1), hl: LINKS.map(() => 0), ids: true },
  roles,
});

// ---------- figure 2: the field as middleman (a kink spreading out at c) ----------
const CPX = 110; // "speed of light" in the figure, box units per second
const CX = 320;
const CY = 180;
const AMP = 16;
const smooth = (u) => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u));

/** Charge's vertical offset at time s, for the current mode. */
function offsetAt(p, s) {
  if (p.mode === 'wiggle') return -AMP * Math.sin(2 * Math.PI * p.f * s);
  if (p.mode === 'shove') return p.shoves.reduce((y, sh) => y + sh.dy * smooth((s - sh.t0) / 0.3), p.base);
  return 0;
}

function kinkDraw(d, p, t) {
  const lines = [];
  const N = 16;
  for (let k = 0; k < N; k++) {
    const th = (2 * Math.PI * (k + 0.5)) / N;
    const pts = [];
    // each piece of a field line points back to where the charge WAS when the news left it
    for (let r = 16; r <= 420; r += 4) pts.push([CX + r * Math.cos(th), CY + offsetAt(p, t - r / CPX) + r * Math.sin(th)]);
    lines.push(pts);
  }
  d.fieldLines(lines, { arrows: [0.12], w: 1.4 });
  if (p.mode === 'shove' && p.shoves.length) {
    const last = p.shoves[p.shoves.length - 1];
    const R = CPX * (t - last.t0 - 0.15);
    if (R > 20 && R < 420) {
      d.circle(CX, CY + last.from + last.dy / 2, R, { cls: 'ph-mute', dash: '5 5' });
      const ly = CY + R * Math.sin(-0.62) + last.from;
      if (R < 300 && ly > 14) d.text(CX + R * Math.cos(-0.62) + 8, ly, 'news front, moving out at c', { cls: 'ph-label', anchor: 'start', halo: true });
    }
  }
  if (p.mode === 'wiggle') {
    const lam = CPX / p.f;
    const x0 = 24;
    const y = 344;
    d.line(x0, y, x0 + lam, y, { cls: 'ph-label' });
    d.line(x0, y - 6, x0, y + 6, { cls: 'ph-label' });
    d.line(x0 + lam, y - 6, x0 + lam, y + 6, { cls: 'ph-label' });
    d.text(x0 + lam / 2, y - 12, '\u03bb = c / f', { cls: 'ph-label', serif: true, halo: true });
  }
  d.charge(CX, CY + offsetAt(p, t), 1, { r: 13 });
}

// ---------- figure 3: sizes in this course ----------
const LOG0 = -15;
const LOG1 = 3;
const SX = (e) => 30 + ((e - LOG0) / (LOG1 - LOG0)) * 580;
const OBJECTS = [
  { e: -15, label: 'nucleus', href: 'nuclear' },
  { e: -10, label: 'atom', href: 'atoms' },
  { e: -4.15, label: 'hair / slit', href: 'diffraction' },
  { e: -1, label: 'circuit board', href: 'dc-circuits', anchor: 'end' },
  { e: 0.23, label: 'you', href: '' },
];
const BANDS = [
  { a: -15, b: -11, label: '\u03b3 rays' },
  { a: -11, b: -8, label: 'X-rays' },
  { a: -8, b: -6.4, label: 'UV' },
  { a: -6.4, b: -6.15, label: 'visible', light: true },
  { a: -6.15, b: -3, label: 'infrared' },
  { a: -3, b: -0.5, label: 'micro' },
  { a: -0.5, b: 3, label: 'radio' },
];
const TICKS = [[-15, '1 fm'], [-12, '1 pm'], [-9, '1 nm'], [-6, '1 \u03bcm'], [-3, '1 mm'], [0, '1 m'], [3, '1 km']];

function scalesDraw(d) {
  const y = 96;
  d.line(SX(LOG0), y, SX(LOG1), y, { cls: 'ph-axis', w: 1.4 });
  for (const [e, s] of TICKS) {
    d.line(SX(e), y - 5, SX(e), y + 5, { cls: 'ph-axis' });
    d.text(SX(e), y - 16, s, { cls: 'ph-label', size: 12 });
  }
  OBJECTS.forEach((o, i) => {
    const x = SX(o.e);
    const top = 24 + (i % 2) * 22;
    d.line(x, y - 26, x, top + 10, { cls: 'ph-mute' });
    d.dot(x, y, { cls: 'ph-plot', r: 4 });
    d.text(x + (o.anchor === 'end' ? 6 : 0), top, o.label, { size: 13, anchor: o.anchor ?? (i === 0 ? 'start' : 'middle'), cls: 'ph-plot' });
  });
  const by = 128;
  BANDS.forEach((b, i) => {
    const x0 = SX(b.a);
    const x1 = SX(b.b);
    d.rect(x0, by, x1 - x0, 20, { cls: b.light ? 'ph-light' : 'ph-mute', fill: true, style: b.light ? '--fo:0.6' : `--fo:${0.08 + 0.05 * (i % 2)}`, w: 1 });
    if (b.light) {
      d.line((x0 + x1) / 2, by + 20, (x0 + x1) / 2, by + 40, { cls: 'ph-light' });
      d.text((x0 + x1) / 2, by + 50, 'visible light, 400\u2013700 nm', { size: 12.5, cls: 'ph-light' });
    } else if (x1 - x0 > 40) d.text((x0 + x1) / 2, by + 10, b.label, { size: 12, cls: 'ph-label' });
  });
  d.text(SX(LOG0), by + 34, 'EM spectrum, by wavelength \u2192', { size: 12, anchor: 'start', cls: 'ph-label' });
}

// ---------- quiz ----------
const quiz = [
  {
    type: 'mcq',
    id: 'overview.b-source',
    prompt: 'In the storyline of this course, what creates a magnetic field?',
    choices: [
      'Any charge, whether it moves or not',
      'Moving charge (current), and also a changing electric field',
      'Only iron and other magnetic materials',
      'Only a battery connected in a closed circuit',
    ],
    answer: 1,
    explain: 'A charge at rest makes only an electric field. <b>Moving</b> charge makes a magnetic field (a current in a wire, or the spinning and orbiting electrons inside iron), and Maxwell added that a <b>changing electric field</b> does too. A battery matters only because it makes current flow.',
  },
  {
    type: 'mcq',
    id: 'overview.light',
    prompt: 'What is light, in the language of this course?',
    choices: [
      'A stream of tiny charged particles thrown off by hot objects',
      'Electric and magnetic fields regenerating each other, launched by accelerating charges and traveling at c',
      'The static electric field of a charge, spreading outward',
      'A magnetic field on its own, moving at c',
    ],
    answer: 1,
    explain: 'A changing B makes E (induction) and a changing E makes B (Maxwell). Once a charge shakes, the two fields keep regenerating each other and the pattern travels at c = 3.00 \u00d7 10<sup>8</sup> m/s. A charge at rest has a field, but nothing travels. Photons are not charged: they carry energy E = hf but no charge.',
  },
  {
    type: 'pick',
    id: 'overview.induction-pick',
    prompt: 'Click the idea that says a <b>changing magnetic field makes an electric field</b>, the principle behind every generator.',
    View: PhysView,
    view: { height: 300, box: [640, 362] },
    build: () => ({ frame: fullMap({}), answer: ['m-induction'], after: fullMap({ 'm-induction': 'correct' }) }),
    explain: 'That is <b>induction</b> (Faraday\u2019s law). Spin a magnet near a coil and the changing B through the coil makes an electric field that pushes current around it. The arrow from E field down to B field is its mirror image, the changing-E piece Maxwell added, and together the two give light.',
  },
];

export default {
  id: 'overview',
  title: 'The big picture',
  group: 'Start here',
  blurb: 'A map of the whole semester: how charge, fields, circuits, magnetism, light and quanta connect.',
  quiz,
  render(root) {
    const pf = protonForces(1e-15);
    root.append(
      p('Physics I was about motion and the forces that cause it, with gravity as the main named force. Physics II is about <b>one force</b>, the electromagnetic force, and the long chain of things it builds: fields, circuits, magnets, light, and finally the quantum rules that govern atoms and nuclei.'),
      p('The whole semester is one story. <b>Charges make fields, and fields push charges.</b> Moving charges add a magnetic field. Changing fields make each other, and the result is light. Then light turns out to come in lumps, which opens the door to the atom and its nucleus. Each later chapter is one link in that chain, and the map below shows where each one lives.'),
      p('The ideas are new, but the tools are not. You will use F = ma, energy conservation and circular motion constantly; what changes is <b>where the force comes from</b>.'),
    );

    const mapHost = h('div');
    root.append(figure({ title: 'The semester on one page', note: 'Step with the arrow buttons or the arrow keys. Each step lights one link and names the chapters that explain it. On a narrow screen, swipe the map sideways.' }, mapHost));
    const mapPlayer = new Player(mapHost, { frames: mapFrames(), View: PhysView, view: { height: 380 } });
    // Nine labeled boxes do not shrink well: below ~540 px the stage scrolls sideways instead of shrinking.
    mapPlayer.view.svg.style.minWidth = '540px';
    mapPlayer.view.svg.parentElement.style.overflowX = 'auto';

    root.append(
      callout('key', 'The one idea that organizes everything', 'Forces act through <b>fields</b>. A source makes a field everywhere around it; anything that responds to that field feels a force where it sits. Charges make E, moving charges make B, changing B makes E, changing E makes B. Most problems are either "find the field from these sources" or "find the force or motion this field causes".'),
      h('h2', { text: 'Why bother with a middleman?' }),
      p('Coulomb\u2019s law looks like instant action at a distance: move one charge and the other feels it at once. It does not work that way. If you shake a charge, the far-away field finds out only after a delay, because the news travels outward at the speed of light. Between the old field and the new one there is a <b>kink</b>, and that kink carries energy away. A charge that keeps wiggling sends out a train of kinks: a wave. That is the seed of the <a href="#/em-waves">electromagnetic waves</a> chapter, and it is why the field is a real physical thing and not just bookkeeping.'),
    );

    // sandbox: kink spreading out
    const stage = h('div', { class: 'stage' });
    const view = new PhysView(stage, { height: 380, box: [640, 360] });
    const st = { mode: 'shove', f: 0.5, shoves: [], base: 0 };
    const ro = h('p', { class: 'caption' });
    const MSG = {
      still: 'A charge at rest: straight radial lines. Nothing travels, nothing is radiated.',
      shove: 'Outside the dashed circle the lines still point at the old position; inside, at the new one. The kink between them is the news, moving out at c.',
      wiggle: 'Steady wiggling at frequency f sends out a wave with wavelength \u03bb = c/f. The kinks are strongest on the lines perpendicular to the motion, and absent along it.',
    };
    const shove = () => {
      const t0 = view.t + 0.05;
      // fold shoves whose news has left the picture into the base offset
      const old = st.shoves.filter((s) => t0 - s.t0 > 5);
      st.base += old.reduce((y, s) => y + s.dy, 0);
      st.shoves = st.shoves.filter((s) => t0 - s.t0 <= 5);
      const from = st.base + st.shoves.reduce((y, s) => y + s.dy, 0);
      st.shoves.push({ t0, dy: from > 0 ? -2 * AMP : 2 * AMP, from });
      redraw();
    };
    const fSlider = slider({ label: 'Frequency f', min: 0.25, max: 1, step: 0.05, value: st.f, fmt: (v) => `\u03bb = ${(CPX / v).toFixed(0)} px`, onInput: (v) => ((st.f = v), redraw()) });
    const shoveBtn = h('button', { class: 'btn small', text: 'Shove the charge', onclick: shove });
    const redraw = () => {
      view.show({ draw: kinkDraw, p: { ...st, shoves: st.shoves.map((s) => ({ ...s })) }, box: [640, 360], live: true }, { animate: false });
      shoveBtn.style.display = st.mode === 'shove' ? '' : 'none';
      fSlider.style.display = st.mode === 'wiggle' ? '' : 'none';
      ro.innerHTML = MSG[st.mode];
    };
    root.append(
      figure(
        {
          title: 'The field is the messenger',
          tools: [
            segmented([{ value: 'still', label: 'At rest' }, { value: 'shove', label: 'One shove' }, { value: 'wiggle', label: 'Keep wiggling' }], st.mode, (v) => {
              st.mode = v;
              st.shoves = [];
              st.base = 0;
              if (v === 'shove') shove();
              else redraw();
            }),
          ],
          note: 'Each piece of a field line points back to where the charge <b>was</b> when the news left it, so a sudden move shows up far away only later. In the figure c is slowed down to 110 units per second.',
        },
        stage,
        controlsRow(shoveBtn, fSlider),
        ro,
      ),
    );
    redraw();
    shove();

    root.append(
      h('h2', { text: 'Why electromagnetism runs everyday life' }),
      p(`Gravity was the star of Physics I, so it is worth seeing how weak it is. Two protons repel electrically and attract gravitationally, and both forces fall off as 1/r<sup>2</sup>, so their ratio does not depend on distance:`),
      h('div', { class: 'table-wrap' }, h('table', {},
        h('thead', {}, h('tr', {}, h('th', { text: 'Two protons 1 fm apart' }), h('th', { text: 'Force' }), h('th', { text: 'Formula' }))),
        h('tbody', {},
          h('tr', {}, h('td', { text: 'Electric repulsion' }), h('td', { html: `${Math.round(pf.electric)} N` }), h('td', { html: eq('k e<sup>2</sup> / r<sup>2</sup>') })),
          h('tr', {}, h('td', { text: 'Gravitational attraction' }), h('td', { html: `${sci(pf.gravity)} N` }), h('td', { html: eq('G m<sub>p</sub><sup>2</sup> / r<sup>2</sup>') })),
          h('tr', {}, h('td', { html: '<b>Ratio</b>' }), h('td', { html: `<b>${sci(pf.ratio)}</b>` }), h('td', { text: 'same at every distance' })),
        ),
      )),
      p(`If you drew the gravity arrow one atom wide (10<sup>\u221210</sup> m), the electric arrow would be ${sci(electricArrowLength(1e-10))} m long, about the size of the observable universe. Gravity wins for planets only because matter is almost perfectly <b>neutral</b>: positive and negative charges cancel, while mass only adds up. Every contact force from Physics I (normal force, friction, tension, the push of your hand) is electric force between the outer electrons of atoms.`),
      h('h2', { text: 'What carries over, and what is new' }),
      h('div', { class: 'defs-card reveal' },
        h('div', { class: 'defs-col' },
          h('div', { class: 'eyebrow', text: 'From Physics I' }),
          h('dl', {},
            h('dt', { html: '<b>Forces</b>' }), h('dd', { html: `Free-body diagrams and ${eq('F = ma')} work unchanged; electric and magnetic forces are just new entries.` }),
            h('dt', { html: '<b>Energy</b>' }), h('dd', { text: 'Work, potential energy and conservation of energy become voltage and circuit power.' }),
            h('dt', { html: '<b>Circular motion</b>' }), h('dd', { text: 'A charge moving perpendicular to a uniform magnetic field moves in a circle; the magnetic force is the centripetal force.' }),
            h('dt', { html: '<b>Oscillations</b>' }), h('dd', { text: 'An LC circuit is a mass on a spring, with charge sloshing instead of position.' }),
            h('dt', { html: '<b>Waves</b>' }), h('dd', { html: `${eq('v = f\u03bb')}, superposition and standing waves come back as light and matter waves.` }),
          ),
        ),
        h('div', { class: 'defs-col' },
          h('div', { class: 'eyebrow', text: 'New tools' }),
          h('dl', {},
            h('dt', { html: '<b>Vectors in 3D</b>' }), h('dd', { text: 'Fields point in space; into and out of the page (\u00d7 and \u2299) become routine.' }),
            h('dt', { html: '<b>Cross product</b>' }), h('dd', { html: `Magnetic force ${eq('q<span class="vec">v</span> \u00d7 <span class="vec">B</span>')} is perpendicular to both; the <b>right-hand rule</b> gives its direction.` }),
            h('dt', { html: '<b>Flux</b>' }), h('dd', { text: 'How much field passes through a surface. Gauss\u2019s law and Faraday\u2019s law are both about flux.' }),
            h('dt', { html: '<b>Adding up pieces</b>' }), h('dd', { text: 'An integral here means "add the contribution of every little piece of charge or current".' }),
            h('dt', { html: '<b>Exponentials</b>' }), h('dd', { html: `Discharging capacitors and decaying nuclei follow ${eq('e<sup>\u2212t/\u03c4</sup>')}: equal time steps, equal fractions (for a charging capacitor, the fraction still to go).` }),
          ),
        ),
      ),
      h('h2', { text: 'The sizes involved' }),
      p('The course runs from circuits you can hold down to nuclei a hundred thousand times smaller than an atom. Light ties the scales together: its wavelength sets which details a wave can resolve, and its photon energy sets which atomic jumps it can drive.'),
    );

    const scaleStage = h('div', { class: 'stage' });
    root.append(figure({ title: 'From nuclei to radio waves', note: 'Log scale: each labeled tick is 1000 times the one before. Visible light is a sliver about 300 nm wide.' }, scaleStage));
    new PhysView(scaleStage, { height: 230, box: [640, 192] }).show({ draw: scalesDraw, p: {}, box: [640, 192] }, { animate: false });

    const row = (e, relates, id, name) => h('tr', {}, h('td', { html: eq(e) }), h('td', { html: relates }), h('td', {}, h('a', { href: `#/${id}`, text: name })));
    root.append(
      h('h2', { text: 'Big equations to recognize' }),
      p('You do not need these yet. The goal for now is to recognize them and know which story each belongs to. The <a href="#/equations">equation sheet</a> at the end has all of them with units.'),
      h('div', { class: 'table-wrap reveal' }, h('table', {},
        h('thead', {}, h('tr', {}, h('th', { text: 'Equation' }), h('th', { text: 'Relates' }), h('th', { text: 'Chapter' }))),
        h('tbody', {},
          row('F = k|q<sub>1</sub>q<sub>2</sub>|/r<sup>2</sup>', 'force between two charges and their distance', 'charge', 'Coulomb'),
          row('<span class="vec">F</span> = q<span class="vec">E</span>', 'the field at a point and the force on a charge there', 'field', 'Electric field'),
          row('\u03a6<sub>E</sub> = Q<sub>enc</sub>/\u03b5<sub>0</sub>', 'field flowing out of a closed surface and the charge inside', 'gauss', 'Gauss'),
          row('\u0394U = q\u0394V', 'energy change of a charge and the voltage it crosses', 'potential', 'Potential'),
          row('Q = CV', 'charge stored on a capacitor and its voltage', 'capacitance', 'Capacitors'),
          row('V = IR', 'voltage across a resistor and the current through it', 'current', 'Current'),
          row('\u03c4 = RC', 'how fast a capacitor charges through a resistor', 'rc', 'RC circuits'),
          row('<span class="vec">F</span> = q<span class="vec">v</span> \u00d7 <span class="vec">B</span>', 'magnetic force on a moving charge, perpendicular to both v and B', 'magnetic-force', 'Magnetic force'),
          row('\u2130 = \u2212d\u03a6<sub>B</sub>/dt', 'induced voltage and how fast magnetic flux changes', 'induction', 'Induction'),
          row('c = f\u03bb', 'frequency and wavelength of light', 'em-waves', 'EM waves'),
          row('d sin \u03b8 = m\u03bb', 'bright-fringe angles, slit spacing and wavelength', 'interference', 'Interference'),
          row('E = hf', 'photon energy and frequency', 'photons', 'Photons'),
          row('E = mc<sup>2</sup>', 'mass lost and energy released in nuclear reactions', 'nuclear', 'Nuclear'),
        ),
      )),
      h('h2', { text: 'How to use this site' }),
      p('Each chapter opens with a few paragraphs, then <b>stepped figures</b>: use the arrow buttons under a figure (or click it and use the arrow keys) to move one step at a time, and read the caption for what changed and why. <b>Sandboxes</b> have sliders, toggles or draggable charges; play until the behavior feels predictable. Every chapter ends with a short <b>checkpoint</b>; answers are saved in this browser and fill the progress marks in the sidebar. The equation cards say in words what each equation relates, which is the part exams test most.'),
      callout('warn', 'The trap at the start of the semester', 'Treating Physics II as a list of formulas. The chapters are links in one chain, and most exam questions test whether you know <b>which</b> link applies: is the field from a charge at rest (E only), a current (B), or a <b>changing</b> flux (induction)? Find the link on the map first, then pick the equation.'),
      checkpoint(quiz),
    );
  },
};
