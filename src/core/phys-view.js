import { Draw } from './draw.js';

/**
 * PhysView: the View for physics figures (same interface as Scene, so Player and pick quizzes take it
 * as `View`). A frame says HOW to draw (a function) and WITH WHAT numbers (params):
 *
 *   frame = {
 *     draw(d, p, t, frame) { ... },  // d: Draw (core/draw.js), p: params (tweened), t: seconds (live frames)
 *     p: { x: 120, q: 2, pts: [1, 2, 3] },  // numbers and number arrays tween between frames
 *     box: [640, 360],               // viewBox width, height (default opts.box)
 *     live: false,                   // true: redraw every animation frame with a running clock t
 *     roles: { id: 'role' },         // classes .role-<role> added to elements drawn with { id }
 *     caption, badge,                // used by Player
 *   }
 *
 * Stepping between frames that share the same `draw` function glides every numeric param from the
 * old value to the new one, so "the charge moves closer" is literally an animation of r. Frames with
 * a different draw function swap instantly. The clock t keeps running across frames with the same
 * draw function (a sandbox can re-show on every slider move without restarting its animation).
 *
 * opts: { height (max px height, default 360), box, duration (ms), onPick(id), onDrag(id, x, y, phase) }
 *   onPick: click on anything drawn with { id } (quizzes, sandboxes).
 *   onDrag: pointer drag on anything drawn with { drag: true, id } (or drag: 'name'); x, y in box units;
 *           phase 'start' | 'move' | 'end'. Redraw from your state inside the callback.
 */
const NS = 'http://www.w3.org/2000/svg';
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

function lerpParams(a, b, k) {
  const out = { ...b };
  for (const key of Object.keys(b)) {
    const x = a?.[key];
    const y = b[key];
    if (typeof x === 'number' && typeof y === 'number') out[key] = x + (y - x) * k;
    else if (Array.isArray(x) && Array.isArray(y) && x.length === y.length && y.every((v, i) => typeof v === 'number' && typeof x[i] === 'number')) {
      out[key] = y.map((v, i) => x[i] + (v - x[i]) * k);
    }
  }
  return out;
}

export class PhysView {
  constructor(host, opts = {}) {
    this.opts = { height: 360, duration: 750, box: [640, 360], onPick: null, onDrag: null, ...opts };
    this.svg = document.createElementNS(NS, 'svg');
    this.svg.setAttribute('class', 'scene phys');
    this.svg.setAttribute('role', 'img');
    this.svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    this.g = document.createElementNS(NS, 'g');
    this.svg.append(this.g);
    host.append(this.svg);
    this.frame = null;
    this.cur = null; // params currently on screen
    this.t = 0;
    this.raf = 0;
    this.tween = null;
    this.visible = true;
    this.lastTick = 0;

    new IntersectionObserver(([e]) => {
      this.visible = e.isIntersecting;
      if (this.visible) this.loop();
    }).observe(this.svg);
    // On narrow screens the box shrinks with the column, and so would its text. --ts enlarges text
    // (draw.js sizes all text as N px x var(--ts)) so labels stay at least ~3/4 of their design size.
    new ResizeObserver(() => this.fitText()).observe(this.svg);

    if (this.opts.onPick) {
      this.svg.classList.add('pickable');
      this.svg.addEventListener('click', (e) => {
        const el = e.target.closest('[data-id]');
        if (el && !el.closest('.nopick')) this.opts.onPick(el.dataset.id);
      });
    }
    if (this.opts.onDrag) this.enableDrag();
  }

  setOption(key, value) {
    this.opts[key] = value;
    if (key === 'onDrag' && value) this.enableDrag();
    if (this.frame) this.show(this.frame, { animate: false });
  }

  /** Set --ts so text drawn at N box units renders at >= 0.7 N px (capped at 1.4x to limit overflow). */
  fitText() {
    if (!this.box) return;
    const w = this.svg.clientWidth;
    const hgt = this.svg.clientHeight;
    if (!w || !hgt) return;
    const scale = Math.min(w / this.box[0], hgt / this.box[1]);
    const ts = Math.max(1, Math.min(1.4, 0.7 / scale));
    this.svg.style.setProperty('--ts', ts.toFixed(3));
  }

  /** Box coordinates of a pointer event. */
  toBox(e) {
    const pt = this.svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const m = this.svg.getScreenCTM();
    if (!m) return [0, 0];
    const r = pt.matrixTransform(m.inverse());
    return [r.x, r.y];
  }

  enableDrag() {
    if (this.dragOn) return;
    this.dragOn = true;
    this.svg.classList.add('draggable');
    let id = null;
    this.svg.addEventListener('pointerdown', (e) => {
      const el = e.target.closest('[data-drag]');
      if (!el) return;
      id = el.dataset.drag || el.dataset.id;
      this.svg.setPointerCapture(e.pointerId);
      this.svg.classList.add('dragging');
      e.preventDefault();
      this.opts.onDrag?.(id, ...this.toBox(e), 'start');
    });
    this.svg.addEventListener('pointermove', (e) => {
      if (id == null) return;
      this.opts.onDrag?.(id, ...this.toBox(e), 'move');
    });
    const end = (e) => {
      if (id == null) return;
      const was = id;
      id = null;
      this.svg.classList.remove('dragging');
      this.opts.onDrag?.(was, ...this.toBox(e), 'end');
    };
    this.svg.addEventListener('pointerup', end);
    this.svg.addEventListener('pointercancel', end);
  }

  show(frame, { animate = true } = {}) {
    const prev = this.frame;
    this.frame = frame;
    const [bw, bh] = frame.box ?? this.opts.box;
    this.svg.setAttribute('viewBox', `0 0 ${bw} ${bh}`);
    // Width fills the column; height follows the box's aspect ratio, capped at opts.height.
    this.svg.style.aspectRatio = `${bw} / ${bh}`;
    this.svg.style.maxHeight = `${frame.view?.height ?? this.opts.height}px`;
    this.box = [bw, bh];
    this.fitText();
    if (!prev || prev.draw !== frame.draw || frame.resetTime) this.t = 0;

    const same = prev && prev.draw === frame.draw;
    if (animate && same && this.cur && !reducedMotion() && this.opts.duration > 0) {
      this.tween = { from: this.cur, to: frame.p ?? {}, start: performance.now(), dur: this.opts.duration };
    } else {
      this.tween = null;
      this.cur = frame.p ?? {};
    }
    this.render();
    this.loop();
  }

  render() {
    const f = this.frame;
    if (!f) return;
    this.g.replaceChildren();
    const d = new Draw(this.g);
    f.draw(d, this.cur ?? f.p ?? {}, this.t, f);
    const roles = f.roles ?? {};
    for (const el of this.g.querySelectorAll('[data-id]')) {
      const r = roles[el.dataset.id];
      if (r) el.classList.add(`role-${r}`);
    }
  }

  /** Runs while a tween is in progress or the frame is live (and the figure is on screen). */
  loop() {
    if (this.raf || !this.frame) return;
    if (!this.tween && !this.frame.live) return;
    this.lastTick = performance.now();
    const tick = (now) => {
      this.raf = 0;
      if (!this.svg.isConnected || !this.frame) return;
      // rAF timestamps can precede the performance.now() taken when the loop started: clamp at 0
      const dt = Math.max(0, Math.min(0.05, (now - this.lastTick) / 1000));
      this.lastTick = now;
      if (this.frame.live) this.t += dt;
      if (this.tween) {
        const k = Math.min(1, (now - this.tween.start) / this.tween.dur);
        this.cur = lerpParams(this.tween.from, this.tween.to, ease(k));
        if (k >= 1) {
          this.cur = this.tween.to;
          this.tween = null;
        }
      }
      this.render();
      if ((this.tween || this.frame.live) && this.visible) this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  }
}
