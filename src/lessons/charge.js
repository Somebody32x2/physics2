import { h, p } from '../ui/dom.js';
import { Player } from '../ui/player.js';
import { PhysView } from '../core/phys-view.js';
import { figure, callout, segmented } from '../ui/figure.js';
import { checkpoint } from '../ui/quiz.js';
import { equation, eq, readouts } from '../ui/controls.js';
import { forceRatio } from '../model/electric.js';
import { forceOn } from '../model/fields.js';

// ---------- figure 1: two charges, how the force scales ----------
// p: { r (px between centers), q1, q2 (charge units) }. Arrow length = BASE x (q1 q2 / r^2) relative to the start.
const R0 = 200;
const BASE = 60;
function pairDraw(d, p) {
  const cx = 320;
  const y = 130;
  const x1 = cx - p.r / 2;
  const x2 = cx + p.r / 2;
  // force on each, signed along +x for charge 2 (repulsion pushes 2 right, 1 left)
  const f = BASE * forceRatio({ q1: p.q1, q2: p.q2, r: p.r / R0 });
  const len = Math.min(Math.abs(f), 220);
  const dir = Math.sign(f) || 1;
  d.line(x1, y + 52, x2, y + 52, { cls: 'ph-mute' });
  d.line(x1, y + 46, x1, y + 58, { cls: 'ph-mute' });
  d.line(x2, y + 46, x2, y + 58, { cls: 'ph-mute' });
  d.text(cx, y + 68, `r = ${(p.r / R0).toFixed(1)} r<sub>0</sub>`, { cls: 'ph-label' });
  const r1 = 14 + 4 * Math.abs(p.q1);
  const r2 = 14 + 4 * Math.abs(p.q2);
  if (len > 1) {
    d.arrow(x1 - dir * r1 * 0.2, y, x1 - dir * (r1 * 0.2 + len), y, { cls: 'ph-F', w: 2.6 });
    d.arrow(x2 + dir * r2 * 0.2, y, x2 + dir * (r2 * 0.2 + len), y, { cls: 'ph-F', w: 2.6 });
  }
  d.charge(x1, y, p.q1, { r: r1, label: `${p.q1 > 0 ? '+' : '\u2212'}${Math.abs(Math.round(p.q1))}q` });
  d.charge(x2, y, p.q2, { r: r2, label: `${p.q2 > 0 ? '+' : '\u2212'}${Math.abs(Math.round(p.q2))}q` });
  d.text(cx, 30, `F = ${Math.abs(forceRatio({ q1: p.q1, q2: p.q2, r: p.r / R0 })).toFixed(2)} F<sub>0</sub>`, { cls: 'ph-F', serif: true, size: 20 });
}

function pairFrames() {
  const f = (p, caption) => ({ draw: pairDraw, p, box: [640, 220], caption });
  return [
    f({ r: R0, q1: 1, q2: 1 }, 'Two equal <b>positive</b> charges a distance r\u2080 apart. Call the force on each <b>F\u2080</b>. Like charges <b>repel</b>, so each arrow points away from the other charge.'),
    f({ r: 2 * R0, q1: 1, q2: 1 }, 'Double the distance: the force drops to <b>\u00bc F\u2080</b>, not \u00bd. Distance is squared in the denominator, so 2\u00d7 farther means 2\u00b2 = 4\u00d7 weaker.'),
    f({ r: R0, q1: 1, q2: 1 }, 'Back to r\u2080: the force returns to F\u2080.'),
    f({ r: R0, q1: 3, q2: 1 }, 'Triple the left charge: the force on <b>both</b> charges triples to <b>3F\u2080</b>. The arrows stay equal: Newton\u2019s third law holds even though one charge is bigger.'),
    f({ r: R0 / 2, q1: 3, q2: 1 }, 'Now halve the distance as well: 3 \u00d7 2\u00b2 = <b>12F\u2080</b>. Factors just multiply.'),
    f({ r: R0, q1: 1, q2: -1 }, 'Make the right charge <b>negative</b>: same size force, but now <b>attractive</b>. Each arrow points toward the other charge.'),
  ];
}

// ---------- figure 2: superposition sandbox (drag three charges) ----------
const START = () => [
  { x: 170, y: 190, q: 2 },
  { x: 400, y: 110, q: -1 },
  { x: 470, y: 260, q: 1 },
];
// Linear scale (px per unit force) so the dashed pieces add head-to-tail to the solid net arrow.
// Arrows are capped at 170 px only when charges get very close.
const FSCALE = 2.2e6;
const scaled = (fx, fy) => {
  const m = Math.hypot(fx, fy);
  const k = m * FSCALE > 170 ? 170 / m : FSCALE;
  return [fx * k, fy * k];
};
function trioDraw(d, p) {
  const cs = p.charges;
  if (!p.hide) cs.forEach((c, i) => {
    if (p.parts) {
      for (const o of cs.filter((_, k) => k !== i)) {
        d.vec(c.x, c.y, ...scaled(...forceOn([c, o], 0)), { cls: 'ph-F', w: 1.4, opacity: 0.45, dash: '4 4' });
      }
    }
    d.vec(c.x, c.y, ...scaled(...forceOn(cs, i)), { cls: 'ph-F', w: 2.6 });
  });
  cs.forEach((c, i) => d.charge(c.x, c.y, c.q, { id: `${p.prefix ?? 'c'}${i}`, drag: !p.prefix, r: 13 + 3 * Math.abs(c.q), label: `${c.q > 0 ? '+' : '\u2212'}${Math.abs(c.q)}` }));
}

// ---------- quiz ----------
const pickCharges = [
  { x: 60, y: 70, q: 1 },
  { x: 260, y: 70, q: -2 },
  { x: 380, y: 70, q: 1 },
];
const netMag = (cs, i) => Math.hypot(...forceOn(cs, i));
const biggest = () => [0, 1, 2].reduce((a, b) => (netMag(pickCharges, b) > netMag(pickCharges, a) ? b : a));

const quiz = [
  {
    type: 'input',
    id: 'charge.triple-r',
    prompt: 'Two charges feel a force F. You move them <b>three times</b> farther apart. The new force is F divided by what?',
    answers: [String(1 / forceRatio({ r: 3 }))],
    placeholder: 'number',
    explain: `Force goes as 1/r<sup>2</sup>. Tripling r multiplies the force by 1/3<sup>2</sup> = 1/${1 / forceRatio({ r: 3 })}.`,
  },
  {
    type: 'mcq',
    id: 'charge.third-law',
    prompt: 'A +5 \u03bcC charge sits near a +1 \u03bcC charge. Which one feels the larger electric force?',
    choices: ['The +5 \u03bcC charge', 'The +1 \u03bcC charge', 'Both feel the same size force', 'Neither; like charges do not interact'],
    answer: 2,
    explain: 'Coulomb\u2019s law has q<sub>1</sub>q<sub>2</sub> in it symmetrically, and Newton\u2019s third law says the forces are an equal and opposite pair. The smaller charge will <i>accelerate</i> more only if it is lighter, but the forces are equal.',
  },
  {
    type: 'pick',
    id: 'charge.biggest-net',
    prompt: 'Three charges on a line: +1, \u22122, +1. The right +1 sits closer to the \u22122 than the left one does. Click the charge that feels the <b>largest net force</b>.',
    View: PhysView,
    view: { height: 200, box: [520, 140] },
    build: () => ({
      frame: { draw: (d) => trioDraw(d, { charges: pickCharges, prefix: 'k', hide: true }), p: {}, box: [520, 140] },
      answer: [`k${biggest()}`],
      after: { draw: (d) => trioDraw(d, { charges: pickCharges, prefix: 'k' }), p: {}, box: [520, 140] },
    }),
    explain: () => {
      const m = [0, 1, 2].map((i) => netMag(pickCharges, i));
      const rel = (v) => (v / m[0]).toFixed(1);
      return `Relative to the left +1, the net forces are 1 : ${rel(m[1])} : ${rel(m[2])}. The right +1 wins: it is closest to the big \u22122 (inverse square rewards being close), and the other +1 is far away, so its repulsion barely subtracts. The middle charge is pulled both ways, so its two pulls partly cancel.`;
    },
  },
];

export default {
  id: 'charge',
  title: "Charge & Coulomb's law",
  group: 'Electric fields',
  blurb: 'Two kinds of charge, and the inverse-square force between them. Where the whole course starts.',
  quiz,
  render(root) {
    root.append(
      p('Physics I was about forces in general. Physics II is about <b>one force</b>, the electromagnetic one, and everything it builds: fields, circuits, magnets, light. It starts with <b>charge</b>.'),
      p('Charge comes in two kinds, called <b>positive</b> and <b>negative</b>. Like charges repel, unlike charges attract. Charge is <b>conserved</b> (you can move it around but never create net charge) and <b>quantized</b>: everything is a whole-number multiple of the elementary charge ' + eq('e') + ' = 1.6 \u00d7 10<sup>\u221219</sup> C (a proton carries +e, an electron \u2212e). Ordinary objects are neutral; "charging" something means moving a few electrons on or off it.'),
      p('The force between two point charges is <b>Coulomb\u2019s law</b>. It looks just like Newton\u2019s gravity, with charge in place of mass:'),
      equation({
        name: 'Coulomb\u2019s law',
        eq: 'F = k <span class="frac"><span>|q<sub>1</sub>| |q<sub>2</sub>|</span><span>r<sup>2</sup></span></span>',
        says: 'The force grows with each charge and falls off with the <b>square</b> of the distance. It acts along the line between the charges: repulsive for like signs, attractive for unlike.',
        terms: [
          ['F', 'size of the force on <b>each</b> charge (equal and opposite)', 'N'],
          ['q<sub>1</sub>, q<sub>2</sub>', 'the two charges', 'C'],
          ['r', 'distance between them', 'm'],
          ['k', '= 1/(4\u03c0\u03b5<sub>0</sub>) \u2248 9 \u00d7 10<sup>9</sup>, just a units constant. \u03b5<sub>0</sub> shows up everywhere later', 'N\u00b7m\u00b2/C\u00b2'],
        ],
      }),
    );

    const host = h('div');
    root.append(figure({ title: 'How the force scales', note: 'Arrow length grows with the force (capped so it fits). Step with the arrows or press play.' }, host));
    new Player(host, { frames: pairFrames(), View: PhysView, view: { height: 240 } });

    root.append(
      callout('key', 'The habit to build', 'Most "Coulomb" questions are ratio questions. Ask what got multiplied: each charge factor multiplies F, and a distance factor <b>n</b> divides F by <b>n\u00b2</b>. The force on each charge is always the same size.'),
      p('With more than two charges, each pair interacts as if the others weren\u2019t there, and the net force on a charge is the <b>vector sum</b>. This is called <b>superposition</b>, and it is the reason almost every problem in the first third of the course reduces to adding arrows.'),
    );

    // Sandbox
    const stage = h('div', { class: 'stage' });
    let charges = START();
    let parts = true;
    const ro = readouts([['n', 'Net force on each charge (relative)']]);
    const view = new PhysView(stage, {
      height: 360,
      box: [640, 360],
      onDrag: (id, x, y) => {
        const i = Number(id.slice(1));
        charges = charges.map((c, k) => (k === i ? { ...c, x: Math.max(20, Math.min(620, x)), y: Math.max(20, Math.min(340, y)) } : c));
        redraw();
      },
    });
    const redraw = () => {
      view.show({ draw: trioDraw, p: { charges, parts }, box: [640, 360] }, { animate: false });
      ro.set({ n: charges.map((c, i) => `${c.q > 0 ? '+' : '\u2212'}${Math.abs(c.q)}: ${(Math.hypot(...forceOn(charges, i)) * 1e5).toFixed(1)}`).join(' \u00b7 ') });
    };
    root.append(
      figure(
        {
          title: 'Sandbox: superposition',
          tools: [
            segmented([{ value: true, label: 'Show each pair' }, { value: false, label: 'Net only' }], true, (v) => ((parts = v), redraw())),
            h('button', { class: 'btn ghost small', text: 'Reset', onclick: () => ((charges = START()), redraw()) }),
          ],
          note: 'Drag the charges. Solid arrows are the <b>net</b> force; dashed arrows are the pieces from each other charge. Try: can you place them so one charge feels no net force?',
        },
        stage,
        ro,
      ),
    );
    redraw();

    root.append(
      callout('warn', 'Classic mistake', 'Adding force <b>magnitudes</b> instead of vectors. Two equal pulls in opposite directions add to zero, not to twice the pull. Draw the arrows first, then add components.'),
      checkpoint(quiz),
    );
  },
};
