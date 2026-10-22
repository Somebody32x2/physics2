// Home-page hero: field lines and equipotentials of a few charges that slide into new arrangements.
// Everything is recomputed from model/fields.js on every animation tick, so the lines morph as the charges move.
import { chargeFieldLines, isolines, pointPotential } from '../model/fields.js';

const BOX = [720, 380];
const BOUNDS = [-40, -40, BOX[0] + 40, BOX[1] + 40];

function heroDraw(d, p) {
  const charges = [
    { x: p.x1, y: p.y1, q: p.q1 },
    { x: p.x2, y: p.y2, q: p.q2 },
  ].filter((c) => Math.abs(c.q) > 0.05);
  const V = pointPotential(charges);
  const levels = [-0.035, -0.022, -0.014, -0.009, 0.009, 0.014, 0.022, 0.035, 0.06];
  for (const { segs } of isolines(V, levels, { x0: 0, y0: 0, x1: BOX[0], y1: BOX[1], step: 12, maxJump: 0.05 })) {
    const g = d.group({ cls: 'ph-eqp' });
    for (const [a, b, c, e] of segs) g.line(a, b, c, e, { w: 1 });
  }
  const lines = chargeFieldLines(charges, { perUnit: 10, bounds: BOUNDS, r0: 18, ds: 5, maxSteps: 400 });
  d.fieldLines(lines.map((l) => l.pts), { w: 1.2 });
  for (const c of charges) d.charge(c.x, c.y, Math.sign(c.q), { r: 12 + 4 * Math.abs(c.q), label: c.q > 0 ? '+' : '\u2212' });
}

const f = (p, caption) => ({ draw: heroDraw, p, box: BOX, caption });

export const heroFrames = () => [
  f({ x1: 360, y1: 190, q1: 1, x2: 560, y2: 190, q2: 0 }, 'One positive charge: <b>field lines</b> (orange) point straight out, and the <b>equipotentials</b> (dashed) are circles around it.'),
  f({ x1: 260, y1: 190, q1: 1, x2: 460, y2: 190, q2: -1 }, 'Add an equal negative charge: a <b>dipole</b>. Every line leaving + lands on \u2212, and the equipotentials stay perpendicular to the lines.'),
  f({ x1: 260, y1: 190, q1: 1, x2: 460, y2: 190, q2: 1 }, 'Make both positive: the lines <b>repel</b> each other and leave a field-free point in the middle.'),
  f({ x1: 230, y1: 190, q1: 2, x2: 490, y2: 190, q2: -1 }, 'A +2 and a \u22121: twice as many lines leave the +2 as land on the \u22121, so half of them escape to infinity.'),
];
