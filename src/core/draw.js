/**
 * Draw: a tiny immediate-mode SVG helper for physics figures. PhysView hands one to a frame's
 * `draw(d, p, t, frame)` function on every repaint; the function draws the whole picture from scratch.
 *
 * Coordinates are SVG user units inside the view's box (x right, y DOWN). Every element gets the
 * class `ph` plus whatever you pass in `cls`. Colors come from the site-wide physics classes
 * (styles.css, "physics"): ph-pos, ph-neg, ph-E, ph-B, ph-F, ph-v, ph-I, ph-ray, ph-eqp, ph-plot,
 * ph-plot2, ph-mute, ph-axis, ph-grid, ph-glow ... Each sets `--c`, the stroke/arrowhead/text color.
 * Any element can be recolored inline: { style: '--c: var(--t2)' }.
 *
 * Common options on every primitive: { cls, style, id, drag, w, dash, opacity }.
 *   id   -> data-id (clickable in pick quizzes / onPick; roles from frame.roles are applied to it)
 *   drag -> data-drag (draggable when the view has onDrag)
 *   w    -> stroke width, dash -> stroke-dasharray, opacity -> opacity
 *
 * Text accepts a little markup: <sub>, <sup>, <i>, <b> (e.g. 'q<sub>1</sub>', 'r<sup>2</sup>').
 */
const NS = 'http://www.w3.org/2000/svg';

export class Draw {
  constructor(g) {
    this.g = g;
  }

  el(tag, attrs = {}, o = {}) {
    const e = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) if (v != null) e.setAttribute(k, v);
    const cls = ['ph', o.cls].filter(Boolean).join(' ');
    e.setAttribute('class', `${e.getAttribute('class') ? `${e.getAttribute('class')} ` : ''}${cls}`);
    let style = o.style ?? '';
    if (o.w != null) style += `;--w:${o.w}`;
    if (o.dash) style += `;stroke-dasharray:${o.dash}`;
    if (o.opacity != null) style += `;opacity:${o.opacity}`;
    if (style) e.setAttribute('style', style);
    if (o.id != null) e.setAttribute('data-id', o.id);
    if (o.drag) e.setAttribute('data-drag', o.drag === true ? (o.id ?? '') : o.drag);
    if (o.title) {
      const t = document.createElementNS(NS, 'title');
      t.textContent = o.title;
      e.append(t);
    }
    this.g.append(e);
    return e;
  }

  /** A nested group; returns a Draw that draws into it. o.x/o.y translate, o.rot rotates (degrees). */
  group(o = {}) {
    const tf = [];
    if (o.x || o.y) tf.push(`translate(${o.x ?? 0} ${o.y ?? 0})`);
    if (o.rot) tf.push(`rotate(${o.rot})`);
    const g = this.el('g', { transform: tf.join(' ') || null }, o);
    g.classList.add('ph-g');
    return new Draw(g);
  }

  line(x1, y1, x2, y2, o = {}) {
    return this.el('line', { x1, y1, x2, y2 }, o);
  }

  /** Polyline through [[x, y], ...]; o.closed closes it, o.fill fills it with --c at low opacity. */
  poly(pts, o = {}) {
    if (pts.length < 2) return null;
    const d = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(2)} ${y.toFixed(2)}`).join('') + (o.closed ? 'Z' : '');
    return this.path(d, o);
  }

  path(d, o = {}) {
    const e = this.el('path', { d }, o);
    if (o.fill) e.classList.add('ph-fill');
    return e;
  }

  circle(x, y, r, o = {}) {
    const e = this.el('circle', { cx: x, cy: y, r }, o);
    if (o.fill) e.classList.add('ph-fill');
    return e;
  }

  rect(x, y, w, h, o = {}) {
    const e = this.el('rect', { x, y, width: w, height: h, rx: o.rx ?? 0 }, o);
    if (o.fill) e.classList.add('ph-fill');
    return e;
  }

  /** Small filled dot (r = 3.5 by default). */
  dot(x, y, o = {}) {
    const e = this.el('circle', { cx: x, cy: y, r: o.r ?? 3.5 }, o);
    e.classList.add('ph-solid');
    return e;
  }

  /** Arrow from (x1, y1) to (x2, y2), head at the end. o.head = head length (default 8 + width). */
  arrow(x1, y1, x2, y2, o = {}) {
    const g = this.el('g', {}, { ...o, w: null, dash: null });
    g.classList.add('ph-arrow');
    const sw = o.w ?? 1.8;
    const len = Math.hypot(x2 - x1, y2 - y1);
    if (len < 0.5) return g;
    const ux = (x2 - x1) / len;
    const uy = (y2 - y1) / len;
    const hl = Math.min(o.head ?? 7 + sw * 1.6, len);
    const hw = hl * 0.48;
    const bx = x2 - ux * hl;
    const by = y2 - uy * hl;
    const sub = new Draw(g);
    if (len > hl) sub.line(x1, y1, bx + ux * 0.5, by + uy * 0.5, { w: sw, dash: o.dash });
    const head = sub.path(`M${x2} ${y2}L${bx - uy * hw} ${by + ux * hw}L${bx + uy * hw} ${by - ux * hw}Z`);
    head.classList.add('ph-head');
    return g;
  }

  /** Arrow from (x, y) along (vx, vy). */
  vec(x, y, vx, vy, o = {}) {
    return this.arrow(x, y, x + vx, y + vy, o);
  }

  /**
   * Text at (x, y). o.anchor 'start' | 'middle' (default) | 'end'; o.size font size; o.serif for
   * equation-style italic serif; o.halo draws a surface-colored outline so text stays legible over lines.
   */
  text(x, y, str, o = {}) {
    const e = this.el('text', { x, y, 'text-anchor': o.anchor ?? 'middle', 'dominant-baseline': o.baseline ?? 'central' }, o);
    e.classList.add('ph-t');
    if (o.serif) e.classList.add('ph-serif');
    if (o.halo) e.classList.add('ph-halo');
    if (o.size) e.style.fontSize = `calc(${o.size}px * var(--ts, 1))`;
    richText(e, String(str));
    return e;
  }

  /** A point charge: red disc with + for q > 0, blue with − for q < 0, grey for 0. o.r (default 15), o.label. */
  charge(x, y, q, o = {}) {
    const g = this.el('g', { transform: `translate(${x} ${y})` }, { ...o, cls: `ph-charge ${q > 0 ? 'ph-pos' : q < 0 ? 'ph-neg' : 'ph-neutral'} ${o.cls ?? ''}` });
    const sub = new Draw(g);
    const r = o.r ?? 15;
    sub.circle(0, 0, r).classList.add('ph-body');
    const label = o.label ?? (q > 0 ? '+' : q < 0 ? '\u2212' : '0');
    sub.text(0, 0.5, label, { size: o.size ?? (label.length > 2 ? 10 : 14) }).classList.add('ph-sign');
    return g;
  }

  /** Field pointing INTO the page: an x mark (o.r half-size, default 6). */
  bIn(x, y, o = {}) {
    const r = o.r ?? 6;
    const g = this.el('g', {}, { cls: 'ph-B', ...o });
    const sub = new Draw(g);
    sub.line(x - r, y - r, x + r, y + r, { w: o.w ?? 1.6 });
    sub.line(x - r, y + r, x + r, y - r, { w: o.w ?? 1.6 });
    return g;
  }

  /** Field pointing OUT of the page: a dot in a ring. */
  bOut(x, y, o = {}) {
    const r = o.r ?? 6;
    const g = this.el('g', {}, { cls: 'ph-B', ...o });
    const sub = new Draw(g);
    sub.circle(x, y, r, { w: o.w ?? 1.4 });
    sub.dot(x, y, { r: r * 0.35 });
    return g;
  }

  /** A grid of bIn / bOut marks filling a rectangle; dir = 'in' | 'out'. */
  bGrid(x0, y0, x1, y1, dir = 'in', o = {}) {
    const s = o.step ?? 40;
    const g = this.group({ cls: o.cls ?? 'ph-B', opacity: o.opacity ?? 0.7 });
    for (let x = x0 + s / 2; x < x1; x += s) for (let y = y0 + s / 2; y < y1; y += s) (dir === 'in' ? g.bIn(x, y, o) : g.bOut(x, y, o));
    return g;
  }

  /**
   * Arrows on a grid showing a vector field fn(x, y) -> [fx, fy]. Arrow length is fixed (o.len);
   * strength shows as opacity (compressed with a square root so weak regions stay visible).
   * o.skip(x, y) hides arrows (e.g. inside charges). o.ref sets the field strength drawn fully opaque.
   */
  fieldGrid(fn, { x0, y0, x1, y1, step = 36, len = 18, cls = 'ph-E', skip = null, ref = null, w = 1.4 } = {}) {
    const pts = [];
    for (let x = x0 + step / 2; x < x1; x += step) {
      for (let y = y0 + step / 2; y < y1; y += step) {
        if (skip && skip(x, y)) continue;
        const [fx, fy] = fn(x, y);
        const m = Math.hypot(fx, fy);
        if (m > 0) pts.push({ x, y, fx, fy, m });
      }
    }
    if (!pts.length) return this.group({ cls });
    const sorted = pts.map((p) => p.m).sort((a, b) => a - b);
    const top = ref ?? sorted[Math.floor(sorted.length * 0.85)];
    const g = this.group({ cls });
    for (const p of pts) {
      const a = Math.min(1, Math.sqrt(p.m / top));
      const ux = p.fx / p.m;
      const uy = p.fy / p.m;
      g.arrow(p.x - (ux * len) / 2, p.y - (uy * len) / 2, p.x + (ux * len) / 2, p.y + (uy * len) / 2, { w, head: 6, opacity: Math.max(0.12, a).toFixed(2) });
    }
    return g;
  }

  /**
   * Field lines (arrays of points, e.g. from model/fields.js chargeFieldLines(...).map(l => l.pts)),
   * each with a small arrowhead partway along it showing direction. o.at = fraction for the head (0.5).
   */
  fieldLines(lines, o = {}) {
    const g = this.group({ cls: o.cls ?? 'ph-E' });
    for (const pts of lines) {
      if (pts.length < 3) continue;
      g.poly(pts, { w: o.w ?? 1.3 });
      const ats = o.arrows ?? [o.at ?? 0.5];
      for (const f of ats) {
        const k = Math.max(1, Math.min(pts.length - 1, Math.floor(pts.length * f)));
        const [ax, ay] = pts[k - 1];
        const [bx, by] = pts[k];
        const l = Math.hypot(bx - ax, by - ay) || 1;
        g.arrow(bx - ((bx - ax) / l) * 8, by - ((by - ay) / l) * 8, bx + ((bx - ax) / l) * 2, by + ((by - ay) / l) * 2, { head: 9, w: 0.01 });
      }
    }
    return g;
  }

  // ---------- circuit symbols: drawn along the segment A -> B with wire leads to the ends ----------

  /** Shared frame for two-terminal elements: returns a Draw rotated so the element runs along +x from 0 to L. */
  _along(x1, y1, x2, y2, body, o) {
    const L = Math.hypot(x2 - x1, y2 - y1);
    const ang = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
    const g = this.group({ ...o, x: x1, y: y1, rot: ang, cls: `ph-circuit ${o.cls ?? ''}` });
    const half = Math.min(body / 2, L / 2);
    g.line(0, 0, L / 2 - half, 0, { cls: 'ph-wire' });
    g.line(L / 2 + half, 0, L, 0, { cls: 'ph-wire' });
    if (o.label != null) {
      // label sits beside the element, upright whatever the angle
      const side = o.labelSide ?? -1;
      const mx = (x1 + x2) / 2;
      const my = (y1 + y2) / 2;
      const nx = -(y2 - y1) / L;
      const ny = (x2 - x1) / L;
      this.text(mx + nx * 22 * -side, my + ny * 22 * -side, o.label, { cls: o.labelCls ?? 'ph-label', size: o.labelSize });
    }
    return { g, L, half };
  }

  /** Wire through points [[x, y], ...]. */
  wire(pts, o = {}) {
    return this.poly(pts, { ...o, cls: `ph-wire ${o.cls ?? ''}` });
  }

  resistor(x1, y1, x2, y2, o = {}) {
    const { g, L, half } = this._along(x1, y1, x2, y2, 40, o);
    const n = 6;
    const pts = [[L / 2 - half, 0]];
    for (let i = 0; i < n; i++) pts.push([L / 2 - half + ((i + 0.5) * 2 * half) / n, i % 2 ? 7 : -7]);
    pts.push([L / 2 + half, 0]);
    g.poly(pts, { cls: 'ph-wire ph-element' });
    return g.g;
  }

  /** Battery / emf source. The LONG plate is the + terminal; it sits on the B side unless o.plus = 'a'. */
  battery(x1, y1, x2, y2, o = {}) {
    const { g, L } = this._along(x1, y1, x2, y2, 12, o);
    const plusB = o.plus !== 'a';
    const xl = L / 2 + (plusB ? 6 : -6);
    const xs = L / 2 + (plusB ? -6 : 6);
    g.line(xl, -16, xl, 16, { cls: 'ph-wire ph-element' });
    g.line(xs, -8, xs, 8, { cls: 'ph-wire ph-element', w: 4 });
    if (o.signs !== false) {
      g.text(xl + (plusB ? 9 : -9), -16, '+', { cls: 'ph-mute', size: 12 });
    }
    return g.g;
  }

  capacitor(x1, y1, x2, y2, o = {}) {
    const { g, L } = this._along(x1, y1, x2, y2, 12, o);
    g.line(L / 2 - 6, -16, L / 2 - 6, 16, { cls: 'ph-wire ph-element' });
    g.line(L / 2 + 6, -16, L / 2 + 6, 16, { cls: 'ph-wire ph-element' });
    return g.g;
  }

  inductor(x1, y1, x2, y2, o = {}) {
    const { g, L, half } = this._along(x1, y1, x2, y2, 44, o);
    const n = 4;
    const seg = (2 * half) / n;
    let d = `M${L / 2 - half} 0`;
    for (let i = 0; i < n; i++) d += `a${seg / 2} ${seg / 2} 0 0 1 ${seg} 0`;
    g.path(d, { cls: 'ph-wire ph-element' });
    return g.g;
  }

  /** Switch: o.closed (default false). */
  switch(x1, y1, x2, y2, o = {}) {
    const { g, L, half } = this._along(x1, y1, x2, y2, 30, o);
    g.dot(L / 2 - half, 0, { r: 2.6, cls: 'ph-wire' });
    g.dot(L / 2 + half, 0, { r: 2.6, cls: 'ph-wire' });
    const ang = o.closed ? 0 : -0.5;
    g.line(L / 2 - half, 0, L / 2 - half + 2 * half * Math.cos(ang), 2 * half * Math.sin(ang), { cls: 'ph-wire ph-element' });
    return g.g;
  }

  /** Light bulb centered at (x, y), radius o.r (12). o.glow in [0, 1] fills it yellow. */
  bulb(x, y, o = {}) {
    const r = o.r ?? 12;
    const g = this.group({ ...o, cls: `ph-circuit ${o.cls ?? ''}` });
    if (o.glow > 0) g.circle(x, y, r * (1 + 1.4 * o.glow), { cls: 'ph-glow', opacity: (0.25 + 0.6 * o.glow).toFixed(2) });
    g.circle(x, y, r, { cls: 'ph-wire ph-element ph-bulb' });
    g.path(`M${x - r * 0.5} ${y + r * 0.35}l${r * 0.2} ${-r * 0.7}l${r * 0.3} ${r * 0.5}l${r * 0.3} ${-r * 0.5}l${r * 0.2} ${r * 0.7}`, { cls: 'ph-wire' });
    return g.g;
  }

  /** Junction dot on a circuit. */
  node(x, y, o = {}) {
    return this.dot(x, y, { r: 3, cls: `ph-wire ${o.cls ?? ''}`, ...o });
  }

  // ---------- optics ----------

  /** Thin lens at x = cx, centered on y = cy, height hgt. o.converging (default true) draws outward tips. */
  lens(cx, cy, hgt, o = {}) {
    const conv = o.converging !== false;
    const g = this.group({ ...o, cls: `ph-lens ${o.cls ?? ''}` });
    const t = hgt / 2;
    const bulge = conv ? 10 : -6;
    g.path(`M${cx} ${cy - t}Q${cx + bulge * 2} ${cy} ${cx} ${cy + t}Q${cx - bulge * 2} ${cy} ${cx} ${cy - t}Z`, { cls: 'ph-glass', fill: true });
    return g.g;
  }

  // ---------- plots ----------

  /**
   * A small x-y graph in the rectangle (x, y, w, h). Data ranges xr = [a, b], yr = [c, d] (y up).
   * Returns helpers in DATA coordinates: X(v), Y(v), fn(f, o), pts(arr, o), line, dot, vline, hline, label, arrow.
   */
  plot({ x, y, w, h, xr = [0, 1], yr = [0, 1], xLabel = '', yLabel = '', axes = true, ticksX = null, ticksY = null, cls = '' }) {
    const g = this.group({ cls: `ph-plotbox ${cls}` });
    const X = (v) => x + ((v - xr[0]) / (xr[1] - xr[0])) * w;
    const Y = (v) => y + h - ((v - yr[0]) / (yr[1] - yr[0])) * h;
    if (axes) {
      const y0 = yr[0] <= 0 && yr[1] >= 0 ? Y(0) : y + h;
      const x0 = xr[0] <= 0 && xr[1] >= 0 ? X(0) : x;
      g.arrow(x, y0, x + w + 8, y0, { cls: 'ph-axis', w: 1.2, head: 7 });
      g.arrow(x0, y + h, x0, y - 8, { cls: 'ph-axis', w: 1.2, head: 7 });
      if (xLabel) g.text(x + w + 10, y0 + 14, xLabel, { cls: 'ph-label', anchor: 'end' });
      if (yLabel) g.text(x0 + 8, y - 8, yLabel, { cls: 'ph-label', anchor: 'start' });
      for (const [v, s] of ticksX ?? []) {
        g.line(X(v), y0 - 3, X(v), y0 + 3, { cls: 'ph-axis' });
        g.text(X(v), y0 + 14, s ?? String(v), { cls: 'ph-tick' });
      }
      for (const [v, s] of ticksY ?? []) {
        g.line(x0 - 3, Y(v), x0 + 3, Y(v), { cls: 'ph-axis' });
        g.text(x0 - 7, Y(v), s ?? String(v), { cls: 'ph-tick', anchor: 'end' });
      }
    }
    const clampY = (v) => Math.max(y - 4, Math.min(y + h + 4, v));
    return {
      g,
      X,
      Y,
      /** Plot f over [from, to] (defaults to xr) with n samples. Values outside yr are clipped to the box edge. */
      fn(f, o = {}) {
        const a = o.from ?? xr[0];
        const b = o.to ?? xr[1];
        const n = o.n ?? 160;
        const pts = [];
        for (let i = 0; i <= n; i++) {
          const v = a + ((b - a) * i) / n;
          const fv = f(v);
          if (Number.isFinite(fv)) pts.push([X(v), clampY(Y(fv))]);
        }
        return g.poly(pts, { cls: o.cls ?? 'ph-plot', w: o.w ?? 2, ...o, fill: false });
      },
      pts(arr, o = {}) {
        return g.poly(arr.map(([u, v]) => [X(u), clampY(Y(v))]), { cls: 'ph-plot', w: 2, ...o });
      },
      line(u1, v1, u2, v2, o = {}) {
        return g.line(X(u1), Y(v1), X(u2), Y(v2), o);
      },
      arrow(u1, v1, u2, v2, o = {}) {
        return g.arrow(X(u1), Y(v1), X(u2), Y(v2), o);
      },
      dot(u, v, o = {}) {
        return g.dot(X(u), Y(v), { cls: 'ph-plot', ...o });
      },
      vline(u, o = {}) {
        return g.line(X(u), y, X(u), y + h, { cls: 'ph-mute', dash: '4 4', ...o });
      },
      hline(v, o = {}) {
        return g.line(x, Y(v), x + w, Y(v), { cls: 'ph-mute', dash: '4 4', ...o });
      },
      label(u, v, s, o = {}) {
        return g.text(X(u), Y(v), s, { cls: 'ph-label', ...o });
      },
    };
  }
}

/** Fill a <text> with tspans for <sub>, <sup>, <i>, <b> markup. */
function richText(el, s) {
  if (!/[<&]/.test(s)) {
    el.textContent = s;
    return;
  }
  const re = /<(\/?)(sub|sup|i|b)>|([^<]+)/g;
  const stack = [];
  let offset = 0; // current baseline offset, in em of the parent font (down = +)
  let m;
  while ((m = re.exec(s))) {
    if (m[2]) {
      if (m[1]) stack.splice(stack.lastIndexOf(m[2]), 1);
      else stack.push(m[2]);
      continue;
    }
    const t = document.createElementNS(NS, 'tspan');
    t.textContent = m[3].replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
    const sub = stack.includes('sub');
    const sup = stack.includes('sup');
    const target = sub ? 0.28 : sup ? -0.42 : 0;
    const scale = sub || sup ? 0.72 : 1;
    if (scale !== 1) t.setAttribute('font-size', `${scale * 100}%`);
    // dy is measured in the tspan's own em, so divide the base-em shift by its scale
    if (target !== offset) t.setAttribute('dy', `${((target - offset) / scale).toFixed(3)}em`);
    offset = target;
    if (stack.includes('i')) t.setAttribute('font-style', 'italic');
    if (stack.includes('b')) t.setAttribute('font-weight', '600');
    el.append(t);
  }
}
