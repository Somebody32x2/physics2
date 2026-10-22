/**
 * Small drawing helpers shared by the Circuits chapters (capacitance, current, dc-circuits, rc).
 * View code only: the numbers come from model/circuits.js.
 */

/** Points along a polyline [[x, y], ...] spaced `gap` apart, shifted forward by `phase` (px, any sign). */
export function alongPolyline(pts, gap, phase) {
  const out = [];
  let total = 0;
  const segs = [];
  for (let i = 1; i < pts.length; i++) {
    const [ax, ay] = pts[i - 1];
    const [bx, by] = pts[i];
    const len = Math.hypot(bx - ax, by - ay);
    segs.push({ ax, ay, bx, by, len, start: total });
    total += len;
  }
  if (total <= 0) return out;
  const off = ((phase % gap) + gap) % gap;
  for (let s = off; s < total; s += gap) {
    const g = segs.find((q) => s >= q.start && s <= q.start + q.len) ?? segs[segs.length - 1];
    const k = g.len ? (s - g.start) / g.len : 0;
    out.push([g.ax + (g.bx - g.ax) * k, g.ay + (g.by - g.ay) * k]);
  }
  return out;
}

/**
 * Moving dots that show current flowing along a wire path. `phase` is the distance travelled so far (px);
 * pass phase = speed x time so faster current = faster dots. Dots are teal (ph-I).
 */
export function flowDots(d, pts, phase, o = {}) {
  for (const [x, y] of alongPolyline(pts, o.gap ?? 22, phase)) d.dot(x, y, { r: o.r ?? 2.8, cls: 'ph-I', opacity: o.opacity });
}

/** A clickable halo box for pick quizzes; it turns green/red with the quiz roles. */
export function pickBox(d, x, y, w, hgt, id) {
  return d.rect(x - w / 2, y - hgt / 2, w, hgt, { id, cls: 'ph-mute', fill: true, rx: 8, dash: '4 4', w: 1.2 });
}

/** Ratio as a friendly multiplier: x3, x1/2, x0.37. */
export function fmtRatio(r) {
  const fr = [[1 / 2, '\u00bd'], [1 / 3, '\u2153'], [1 / 4, '\u00bc'], [2 / 3, '\u2154'], [3 / 4, '\u00be']];
  for (const [v, s] of fr) if (Math.abs(r - v) < 0.005) return `\u00d7${s}`;
  if (Math.abs(r - Math.round(r)) < 0.005) return `\u00d7${Math.round(r)}`;
  return `\u00d7${r.toFixed(2)}`;
}

/** Number with up to `digits` significant figures, trailing zeros trimmed; minus sign as \u2212. */
export function num(v, digits = 3) {
  if (!Number.isFinite(v)) return '\u2014';
  if (Math.abs(v) < 1e-12) return '0';
  const s = String(Number(v.toPrecision(digits)));
  return s.replace('-', '\u2212');
}

/** Small seeded random numbers (deterministic figures). */
export function seeded(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
