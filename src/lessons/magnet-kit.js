/**
 * Small drawing helpers shared by the Magnetism chapters (magnetic-force, magnetic-sources, induction,
 * inductance). View code only: the physics comes from model/magnetism.js.
 */

/** Points spaced `gap` apart along a polyline [[x, y], ...], shifted forward by `phase` px (any sign). */
export function alongPolyline(pts, gap, phase) {
  const segs = [];
  let total = 0;
  for (let i = 1; i < pts.length; i++) {
    const [ax, ay] = pts[i - 1];
    const [bx, by] = pts[i];
    const len = Math.hypot(bx - ax, by - ay);
    segs.push({ ax, ay, bx, by, len, start: total });
    total += len;
  }
  const out = [];
  if (total <= 0) return out;
  const off = ((phase % gap) + gap) % gap;
  let g = 0;
  for (let s = off; s < total; s += gap) {
    while (g < segs.length - 1 && s > segs[g].start + segs[g].len) g++;
    const q = segs[g];
    const k = q.len ? (s - q.start) / q.len : 0;
    out.push([q.ax + (q.bx - q.ax) * k, q.ay + (q.by - q.ay) * k]);
  }
  return out;
}

/** Teal dots drifting along a wire path: phase = distance travelled (px), so faster current = faster dots. */
export function flowDots(d, pts, phase, o = {}) {
  for (const [x, y] of alongPolyline(pts, o.gap ?? 24, phase)) d.dot(x, y, { r: o.r ?? 3, cls: 'ph-I', opacity: o.opacity });
}

/** Number with up to `digits` significant figures, minus sign as \u2212. */
export function num(v, digits = 3) {
  if (!Number.isFinite(v)) return '\u2014';
  if (Math.abs(v) < 1e-12) return '0';
  return String(Number(v.toPrecision(digits))).replace('-', '\u2212');
}

/** Visual angle (degrees, counterclockwise on screen) -> screen unit vector [x, y] (y down). */
export const dirOf = (deg) => [Math.cos((deg * Math.PI) / 180), -Math.sin((deg * Math.PI) / 180)];

/** Out-of-page (dot in a ring) or into-page (x in a ring) symbol for a current or a force, in class `cls`. */
export function perpMark(d, x, y, dir, o = {}) {
  const r = o.r ?? 12;
  const g = d.group({ cls: o.cls ?? 'ph-I', id: o.id, drag: o.drag, opacity: o.opacity });
  g.circle(x, y, r, { w: o.w ?? 1.8, fill: o.fill ?? true });
  if (dir === 'out') g.dot(x, y, { r: r * 0.28 });
  else {
    const k = r * 0.5;
    g.line(x - k, y - k, x + k, y + k, { w: o.w ?? 1.8 });
    g.line(x - k, y + k, x + k, y - k, { w: o.w ?? 1.8 });
  }
  return g;
}

/**
 * Name of the dominant direction of a screen-convention 3-vector [x, y (down), z (into page)]:
 * 'up' | 'down' | 'left' | 'right' | 'in' | 'out' | 'zero'.
 */
export function dirName([x, y, z], eps = 1e-9) {
  const ax = Math.abs(x);
  const ay = Math.abs(y);
  const az = Math.abs(z);
  if (Math.max(ax, ay, az) < eps) return 'zero';
  if (az >= ax && az >= ay) return z > 0 ? 'in' : 'out';
  if (ax >= ay) return x > 0 ? 'right' : 'left';
  return y > 0 ? 'down' : 'up';
}

/** Words for dirName values, for captions. */
export const DIR_WORDS = { up: 'up', down: 'down', left: 'left', right: 'right', in: 'into the page', out: 'out of the page', zero: 'zero' };

/** Split a polyline into the runs that lie inside the box [x0, y0, x1, y1] (the stage shows overflow). */
export function clipToBox(pts, [x0, y0, x1, y1]) {
  const runs = [];
  let cur = [];
  for (const q of pts) {
    if (q[0] >= x0 && q[0] <= x1 && q[1] >= y0 && q[1] <= y1) cur.push(q);
    else if (cur.length) {
      runs.push(cur);
      cur = [];
    }
  }
  if (cur.length) runs.push(cur);
  return runs.filter((r) => r.length > 2);
}

/** A compass needle at (x, y) along the unit vector (ux, uy): purple north half, grey south half. */
export function needle(d, x, y, ux, uy, len = 22) {
  const hw = len * 0.2;
  const nx = -uy * hw;
  const ny = ux * hw;
  const tipN = [x + (ux * len) / 2, y + (uy * len) / 2];
  const tipS = [x - (ux * len) / 2, y - (uy * len) / 2];
  d.poly([tipN, [x + nx, y + ny], [x - nx, y - ny]], { closed: true, cls: 'ph-B', fill: true, w: 1, style: '--fo: 0.85' });
  d.poly([tipS, [x + nx, y + ny], [x - nx, y - ny]], { closed: true, cls: 'ph-mute', fill: true, w: 1, style: '--fo: 0.5' });
}

/**
 * Circular arrow around (cx, cy) from visual angle a0 to a1 (degrees, counterclockwise on screen when a1 > a0),
 * with the head at a1. Draws into `d` with options `o` (cls, w, id ...).
 */
export function arcArrow(d, cx, cy, r, a0, a1, o = {}) {
  const n = 40;
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const a = ((a0 + ((a1 - a0) * i) / n) * Math.PI) / 180;
    pts.push([cx + r * Math.cos(a), cy - r * Math.sin(a)]);
  }
  const g = d.group({ cls: o.cls, id: o.id, opacity: o.opacity });
  g.poly(pts.slice(0, -3), { w: o.w ?? 2.2 });
  const [ax, ay] = pts[n - 4];
  const [bx, by] = pts[n];
  g.arrow(ax, ay, bx, by, { w: o.w ?? 2.2, head: o.head ?? 11 });
  return g;
}

/** Vertical inductor coil at x from y0 to y1 (leads included): n bumps bulging right over the middle `body` px. */
export function coil(d, x, y0, y1, o = {}) {
  const n = o.n ?? 6;
  const body = o.body ?? 100;
  const mid = (y0 + y1) / 2;
  const a = mid - body / 2;
  const seg = body / n;
  d.line(x, y0, x, a, { cls: 'ph-wire' });
  d.line(x, a + body, x, y1, { cls: 'ph-wire' });
  let path = `M${x} ${a}`;
  for (let i = 0; i < n; i++) path += `a${seg / 2} ${seg / 2} 0 0 1 0 ${seg}`;
  d.path(path, { cls: 'ph-wire ph-element' });
}

/** Horizontal zigzag spring from x0 to x1 at height y. */
export function spring(d, x0, x1, y, o = {}) {
  const n = o.n ?? 10;
  const amp = o.amp ?? 9;
  const lead = 10;
  const pts = [[x0, y], [x0 + lead, y]];
  const span = x1 - x0 - 2 * lead;
  for (let i = 0; i < n; i++) pts.push([x0 + lead + ((i + 0.5) * span) / n, y + (i % 2 ? amp : -amp)]);
  pts.push([x1 - lead, y], [x1, y]);
  d.poly(pts, { cls: o.cls ?? 'ph-wire', w: o.w ?? 1.8 });
}
