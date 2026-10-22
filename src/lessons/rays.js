import { h, p } from '../ui/dom.js';
import { Player } from '../ui/player.js';
import { PhysView } from '../core/phys-view.js';
import { figure, callout, segmented } from '../ui/figure.js';
import { checkpoint } from '../ui/quiz.js';
import { equation, eq, controlsRow, readouts } from '../ui/controls.js';
import { MEDIA, refract, criticalAngle, reflectance, thinLens, principalRays, toDeg, toRad } from '../model/optics.js';

// ---------- figure 1: Snell sandbox ----------
const SW = 640;
const SH = 330;
const HX = 320;
const HY = 165;
const RL = 150;
const arcPts = (cx, cy, r, a0, a1) => Array.from({ length: 25 }, (_, i) => {
  const a = a0 + ((a1 - a0) * i) / 24;
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
});
// screen angle convention for arcs: 0 = right, +90deg = down (SVG)
function snellDraw(d, p) {
  const { n1, n2, th1, name1, name2 } = p;
  const th2 = refract(n1, n2, th1);
  const R = reflectance(n1, n2, th1);
  const thc = criticalAngle(n1, n2);
  const shade = (n) => Math.min(0.32, 0.22 * (n - 1));
  if (n1 > 1) d.rect(0, 0, SW, HY, { cls: 'ph-glass', fill: true, style: `--fo: ${shade(n1)}`, w: 0 });
  if (n2 > 1) d.rect(0, HY, SW, SH - HY, { cls: 'ph-glass', fill: true, style: `--fo: ${shade(n2)}`, w: 0 });
  d.line(0, HY, SW, HY, { cls: 'ph-glass', w: 1.4 });
  d.text(SW - 14, 22, `${name1}   n<sub>1</sub> = ${n1.toFixed(2)}   v = ${(1 / n1).toFixed(2)}c`, { cls: 'ph-label', anchor: 'end' });
  d.text(SW - 14, SH - 18, `${name2}   n<sub>2</sub> = ${n2.toFixed(2)}   v = ${(1 / n2).toFixed(2)}c`, { cls: 'ph-label', anchor: 'end' });
  // normal
  d.line(HX, 18, HX, SH - 14, { cls: 'ph-mute', dash: '5 5' });
  d.text(HX + 6, 14, 'normal', { cls: 'ph-label', anchor: 'start', size: 11.5 });
  // critical-angle guide
  if (thc !== null) {
    const gx = HX - RL * 1.32 * Math.sin(thc);
    const gy = HY - RL * 1.32 * Math.cos(thc);
    d.line(HX, HY, gx, gy, { cls: 'ph-mute', dash: '2 5', w: 1.4 });
    d.text(gx - 4, gy - 10, '\u03b8<sub>c</sub>', { cls: 'ph-label', serif: true, anchor: 'end' });
  }
  const sx = HX - RL * Math.sin(th1);
  const sy = HY - RL * Math.cos(th1);
  // reflected ray
  d.arrow(HX, HY, HX + RL * Math.sin(th1), HY - RL * Math.cos(th1), { cls: 'ph-ray', w: 1.2 + 2.6 * R, opacity: (th2 === null ? 1 : 0.3 + 0.7 * Math.sqrt(R)).toFixed(2) });
  // refracted ray
  if (th2 !== null) {
    d.arrow(HX, HY, HX + RL * Math.sin(th2), HY + RL * Math.cos(th2), { cls: 'ph-ray', w: 1.2 + 2.6 * (1 - R) });
    if (th2 > 0.02) {
      d.poly(arcPts(HX, HY, 52, Math.PI / 2 - th2, Math.PI / 2), { cls: 'ph-label', w: 1.2 });
      d.text(HX + 66 * Math.sin(th2 / 2) + 6, HY + 66 * Math.cos(th2 / 2) + 4, '\u03b8<sub>2</sub>', { cls: 'ph-ray', serif: true, halo: true });
    }
  } else {
    d.text(HX + 14, HY + 40, 'no refracted ray:', { cls: 'ph-bad', anchor: 'start' });
    d.text(HX + 14, HY + 58, 'total internal reflection', { cls: 'ph-bad', anchor: 'start' });
  }
  // incident ray
  d.arrow(sx, sy, HX, HY, { cls: 'ph-ray', w: 3.6 });
  if (th1 > 0.02) {
    d.poly(arcPts(HX, HY, 46, -Math.PI / 2 - th1, -Math.PI / 2), { cls: 'ph-label', w: 1.2 });
    d.text(HX - 62 * Math.sin(th1 / 2) - 6, HY - 62 * Math.cos(th1 / 2) - 4, '\u03b8<sub>1</sub>', { cls: 'ph-ray', serif: true, halo: true });
  }
  d.circle(sx, sy, 10, { cls: 'ph-ray', fill: true, style: '--fo: 0.35', w: 2, drag: 'src', id: 'src' });
  d.circle(sx, sy, 22, { style: 'stroke-opacity: 0; fill: transparent', drag: 'src' });
}

// ---------- figures 2 and 3: thin-lens ray diagram ----------
const LW = 640;
const LH = 310;
const LX = 290;
const AY = 160;
const F = 80; // px per focal length; 10 cm in the readouts
const CM = F / 10;
const HO = 48;
const toS = ([x, y]) => [LX + x, AY - y];
function exitT(x, y, dx, dy) {
  const ts = [];
  if (dx > 1e-9) ts.push((LW + 40 - x) / dx);
  if (dx < -1e-9) ts.push((-40 - x) / dx);
  if (dy > 1e-9) ts.push((LH + 40 - y) / dy);
  if (dy < -1e-9) ts.push((-40 - y) / dy);
  return Math.min(...ts);
}
const RAY_NAME = { parallel: '1', center: '2', focal: '3' };
function drawRay(d, r, img, o = {}) {
  const [x0, y0] = toS(r.from);
  const [x1, y1] = toS(r.hit);
  const dx = r.dir[0];
  const dy = -r.dir[1];
  const t = exitT(x1, y1, dx, dy);
  const g = d.group({ cls: o.cls ?? 'ph-ray', id: o.id });
  g.line(x0, y0, x1, y1, { w: 2 });
  g.arrow(x1, y1, x1 + dx * t * 0.55, y1 + dy * t * 0.55, { w: 2, head: 8 });
  g.line(x1, y1, x1 + dx * t, y1 + dy * t, { w: 2 });
  if (o.id) g.poly([[x0, y0], [x1, y1], [x1 + dx * t, y1 + dy * t]], { w: 14, style: 'stroke-opacity: 0' });
  // virtual image: dashed back-extension to the image point
  if (img && !img.none && !img.real) {
    const [ix, iy] = toS([img.di, img.m * HO]);
    g.line(x1, y1, ix, iy, { w: 1.4, dash: '5 5', opacity: 0.75 });
  }
  if (o.label !== false) {
    const k = { parallel: 0.45, center: 0.82, focal: 0.62 }[r.id];
    const lx = x0 + (x1 - x0) * k;
    const ly = y0 + (y1 - y0) * k;
    g.text(lx, ly + (r.id === 'focal' ? 12 : -11), RAY_NAME[r.id], { size: 12, halo: true });
  }
}
function lensBase(d, f) {
  d.line(0, AY, LW, AY, { cls: 'ph-axis', w: 1 });
  d.lens(LX, AY, 236, { converging: f > 0 });
  for (const s of [-1, 1]) {
    const fx = LX + s * Math.abs(f);
    d.dot(fx, AY, { r: 3.5, cls: 'ph-label' });
    d.text(fx, AY + 16, 'F', { cls: 'ph-label', serif: true, halo: true });
    const tx = LX + 2 * s * Math.abs(f);
    if (tx > 4 && tx < LW - 4) {
      d.line(tx, AY - 4, tx, AY + 4, { cls: 'ph-label' });
      d.text(tx, AY + 16, '2F', { cls: 'ph-label', serif: true, halo: true });
    }
  }
}
function imageArrow(d, img) {
  if (img.none) {
    d.text(LW - 12, 30, 'rays leave parallel: no image', { cls: 'ph-label', anchor: 'end' });
    return;
  }
  const [ix, iy] = toS([img.di, img.m * HO]);
  if (ix < 4 || ix > LW - 4 || iy < -40 || iy > LH + 40) {
    d.text(LW - 12, 30, `image far away (d<sub>i</sub> = ${(img.di / CM).toFixed(0)} cm)`, { cls: 'ph-label', anchor: 'end' });
    return;
  }
  d.arrow(ix, AY, ix, iy, { w: 3, dash: img.real ? null : '6 4', opacity: img.real ? 1 : 0.8, cls: img.real ? '' : 'ph-label' });
  const up = img.m * HO > 0;
  d.text(ix, up ? AY + 34 : AY - 14, img.real ? 'real image' : 'virtual image', { size: 12, halo: true, cls: img.real ? '' : 'ph-label' });
}
// p: { f (px, signed), dO (px) }
function lensDraw(d, p) {
  const { f, dO } = p;
  lensBase(d, f);
  const img = thinLens(f, dO);
  for (const r of principalRays(f, dO, HO)) drawRay(d, r, img);
  const ox = LX - dO;
  d.arrow(ox, AY, ox, AY - HO, { w: 3.2 });
  d.text(ox, AY - HO - 14, 'object', { size: 12, halo: true });
  if (p.drag) {
    d.line(ox, AY + 6, ox, AY - HO - 4, { w: 26, style: 'stroke-opacity: 0', drag: 'obj', id: 'obj' });
  }
  imageArrow(d, img);
}

function walkFrames() {
  const box = [LW, LH];
  const describe = (k) => {
    const img = thinLens(1, k);
    if (img.none) return null;
    return { di: img.di, m: img.m };
  };
  const at = (k) => describe(k);
  const a = at(3);
  const b = at(2);
  const c = at(1.5);
  const e = at(0.6);
  const fmt = (v) => (Math.abs(v - Math.round(v)) < 1e-9 ? String(Math.round(v)) : v.toFixed(2).replace(/0$/, '')).replace('-', '\u2212');
  const fr = (k, caption) => ({ draw: lensDraw, p: { f: F, dO: k * F }, box, caption });
  return [
    fr(3, `Object at <b>3f</b>, far beyond 2F. The rays meet at d<sub>i</sub> = ${fmt(a.di)}f, between F and 2F on the far side: a <b>real, inverted, smaller</b> image (m = ${fmt(a.m)}). This is a camera or your eye: a distant scene shrinks onto the sensor or retina.`),
    fr(2, `Object at <b>2f</b>. The image is at d<sub>i</sub> = ${fmt(b.di)}f, the same distance on the other side: real, inverted and the <b>same size</b> (m = ${fmt(b.m)}). The symmetric case.`),
    fr(1.5, `Object <b>between F and 2F</b>. The image moves out to d<sub>i</sub> = ${fmt(c.di)}f and grows: real, inverted, <b>enlarged</b> (m = ${fmt(c.m)}). A projector works here: small slide, big picture on a far screen.`),
    fr(1, 'Object <b>at F</b>. Every ray leaves the lens <b>parallel</b> to the others, so they never meet: <b>no image</b> (it is "at infinity"). Ray 3 would have to come in along the object itself, so it is missing.'),
    fr(0.6, `Object <b>inside F</b>. The rays now spread apart after the lens and never cross. Trace them backward (dashed): they seem to come from a point on the <b>same side</b> as the object. A <b>virtual, upright, enlarged</b> image at d<sub>i</sub> = ${fmt(e.di)}f, m = ${fmt(e.m)}. A magnifying glass.`),
  ];
}

// ---------- quiz ----------
const Q_DO = 200;
function wrongRayFrame(reveal) {
  const f = F;
  const img = thinLens(f, Q_DO);
  const rays = principalRays(f, Q_DO, HO);
  // drawn version: ray 3 (aimed at the near focal point) is bent through the FAR focal point instead of leaving parallel
  const drawn = rays.map((r) => (r.id === 'focal' ? { ...r, dir: [f, -r.hit[1]] } : r));
  return {
    draw(d) {
      lensBase(d, f);
      drawn.forEach((r, i) => drawRay(d, r, img, { id: `ray-${r.id}`, label: false, cls: 'ph-ray' }));
      if (reveal) {
        const fix = rays.find((r) => r.id === 'focal');
        const [hx, hy] = toS(fix.hit);
        d.arrow(hx, hy, LW - 10, hy, { cls: 'ph-good', w: 2, dash: '7 5' });
        d.text(LW - 10, hy + 18, 'where ray 3 should go: parallel', { cls: 'ph-good', anchor: 'end', halo: true });
      }
      const ox = LX - Q_DO;
      d.arrow(ox, AY, ox, AY - HO, { w: 3.2 });
    },
    p: {},
    box: [LW, LH],
    meta: { wrong: drawn.filter((r, i) => Math.abs(Math.atan2(r.dir[1], r.dir[0]) - Math.atan2(rays[i].dir[1], rays[i].dir[0])) > 1e-6).map((r) => `ray-${r.id}`) },
  };
}

const thcWater = toDeg(criticalAngle(MEDIA.water.n, MEDIA.air.n));
const inside = thinLens(10, 6);

const quiz = [
  {
    type: 'input',
    id: 'rays.critical-water',
    prompt: 'A light at the bottom of a pool (water, n = 1.33) shines up toward the surface. Above what angle from the normal (in degrees) is it totally internally reflected?',
    placeholder: 'degrees',
    accept: (s) => Math.abs(parseFloat(s) - thcWater) < 0.3,
    explain: `Set the refracted angle to 90\u00b0: n<sub>1</sub> sin \u03b8<sub>c</sub> = n<sub>2</sub> sin 90\u00b0, so sin \u03b8<sub>c</sub> = 1.00/1.33 and <b>\u03b8<sub>c</sub> = ${thcWater.toFixed(1)}\u00b0</b>. Beyond that, a fish looking up sees a mirror. Only possible because the light goes from higher n to lower n.`,
  },
  {
    type: 'mcq',
    id: 'rays.glass-to-water',
    prompt: 'A ray passes from glass (n = 1.50) into water (n = 1.33) at 30\u00b0 from the normal. In the water it\u2026',
    choices: ['bends toward the normal, because water is a liquid', 'bends away from the normal', 'goes straight, because both are transparent', 'is totally internally reflected'],
    answer: 1,
    explain: `Water has the lower index, so light speeds up and bends <b>away</b> from the normal: sin \u03b8<sub>2</sub> = (1.50/1.33) sin 30\u00b0, \u03b8<sub>2</sub> = ${toDeg(refract(1.5, 1.33, toRad(30))).toFixed(1)}\u00b0. Total internal reflection would need more than the critical angle, ${toDeg(criticalAngle(1.5, 1.33)).toFixed(1)}\u00b0 here.`,
  },
  {
    type: 'pick',
    id: 'rays.wrong-ray',
    prompt: 'One of these three rays from the object\u2019s tip through a converging lens is drawn <b>wrong</b>. Click it.',
    View: PhysView,
    view: { height: 300, box: [LW, LH] },
    build: () => {
      const frame = wrongRayFrame(false);
      return { frame, answer: frame.meta.wrong, after: wrongRayFrame(true) };
    },
    explain: 'Check each ray against its rule. The ray parallel to the axis bends through the far F (correct). The ray through the center goes straight (correct). The ray that passes through the <b>near</b> F before the lens must leave <b>parallel</b> to the axis; here it was bent through the far F instead. The two rules are mirror images: parallel in \u2192 through F out, through F in \u2192 parallel out.',
  },
  {
    type: 'mcq',
    id: 'rays.inside-f',
    prompt: 'An object sits 6 cm from a converging lens with f = 10 cm. The image is\u2026',
    choices: ['real, inverted, on the far side', 'virtual, upright, enlarged, on the same side as the object', 'real, upright, smaller', 'there is no image'],
    answer: 1,
    explain: `Inside F the rays diverge after the lens. 1/d<sub>i</sub> = 1/10 \u2212 1/6 gives <b>d<sub>i</sub> = ${inside.di.toFixed(0).replace('-', '\u2212')} cm</b> (negative: same side, virtual) and m = \u2212d<sub>i</sub>/d<sub>o</sub> = <b>+${inside.m.toFixed(1)}</b> (upright, enlarged). That is a magnifying glass. "No image" is only for an object exactly at F.`,
  },
];

const SEG_MEDIA = ['air', 'water', 'glass', 'diamond'].map((k) => ({ value: k, label: `${MEDIA[k].name} ${MEDIA[k].n.toFixed(2)}` }));

export default {
  id: 'rays',
  title: 'Reflection, refraction & lenses',
  group: 'Light & optics',
  blurb: "Light as rays: Snell's law, total internal reflection, and the thin-lens equation with its sign conventions.",
  quiz,
  render(root) {
    root.append(
      p('When everything light meets is much bigger than its wavelength (lenses, mirrors, windows), you can forget the wave and follow <b>rays</b>: straight lines along the direction the light travels. This is <b>geometric optics</b>. Interference and diffraction, the next two chapters, are what happens when that approximation fails.'),
      p('At a smooth surface some light bounces back. The <b>law of reflection</b> says the angle of reflection equals the angle of incidence, both measured from the <b>normal</b> (the line perpendicular to the surface). The rest crosses into the new material, where it travels slower. How much slower is the <b>index of refraction</b>, ' + eq('n = c/v') + ': 1.00 for air, 1.33 for water, about 1.5 for glass. Because the light changes speed, it changes direction, by Snell\u2019s law:'),
      equation({
        name: 'Snell\u2019s law',
        eq: 'n<sub>1</sub> sin \u03b8<sub>1</sub> = n<sub>2</sub> sin \u03b8<sub>2</sub>',
        says: 'Going into a <b>slower</b> (higher-n) material, light bends <b>toward</b> the normal; going into a faster one, it bends away. The frequency stays the same across the boundary; the speed and wavelength drop by the factor n.',
        terms: [
          ['n<sub>1</sub>, n<sub>2</sub>', 'indices of refraction on the incoming and outgoing sides (n = c/v \u2265 1)', ''],
          ['\u03b8<sub>1</sub>, \u03b8<sub>2</sub>', 'angles from the <b>normal</b>, not from the surface', 'deg'],
        ],
      }),
    );

    // Snell sandbox
    const sStage = h('div', { class: 'stage' });
    let th1 = toRad(40);
    let top = 'glass';
    let bot = 'air';
    const sro = readouts([['t1', '\u03b8<sub>1</sub>'], ['t2', '\u03b8<sub>2</sub>'], ['c', 'Critical angle'], ['r', 'Reflected']]);
    const sView = new PhysView(sStage, {
      height: 340,
      box: [SW, SH],
      onDrag: (id, x, y) => {
        const dx = Math.abs(x - HX);
        const dy = Math.max(1, HY - y);
        th1 = Math.min(toRad(88), Math.atan2(dx, dy));
        sRedraw();
      },
    });
    const sRedraw = () => {
      const n1 = MEDIA[top].n;
      const n2 = MEDIA[bot].n;
      sView.show({ draw: snellDraw, p: { n1, n2, th1, name1: MEDIA[top].name, name2: MEDIA[bot].name }, box: [SW, SH] }, { animate: false });
      const t2 = refract(n1, n2, th1);
      const c = criticalAngle(n1, n2);
      sro.set({
        t1: `${toDeg(th1).toFixed(1)}\u00b0`,
        t2: t2 === null ? 'none (TIR)' : `${toDeg(t2).toFixed(1)}\u00b0`,
        c: c === null ? 'none (n<sub>1</sub> \u2264 n<sub>2</sub>)' : `${toDeg(c).toFixed(1)}\u00b0`,
        r: `${(100 * reflectance(n1, n2, th1)).toFixed(0)}%`,
      });
    };
    const lab = (t) => h('span', { class: 'slider-label', text: t });
    root.append(
      figure(
        {
          title: 'Sandbox: Snell\u2019s law and total internal reflection',
          note: 'Drag the yellow handle to change the angle. Ray thickness shows how the light splits between reflected and refracted (from the Fresnel equations). Start in glass going into air and sweep past the dotted \u03b8<sub>c</sub> line.',
        },
        sStage,
        controlsRow(lab('Top (incoming)'), segmented(SEG_MEDIA, top, (v) => ((top = v), sRedraw()), { label: 'Top medium' })),
        controlsRow(lab('Bottom'), segmented(SEG_MEDIA, bot, (v) => ((bot = v), sRedraw()), { label: 'Bottom medium' })),
        sro,
      ),
    );
    sRedraw();

    root.append(
      p('Going from a <b>slower</b> medium into a <b>faster</b> one (glass to air, water to air), the refracted ray bends away from the normal, and at some incoming angle it would have to leave at 90\u00b0, skimming the surface. That angle is the <b>critical angle</b>, ' + eq('sin \u03b8<sub>c</sub> = n<sub>2</sub>/n<sub>1</sub>') + '. Beyond it there is no refracted ray at all: <b>100% of the light reflects</b>. This <b>total internal reflection</b> keeps light trapped inside optical fibers for kilometers and makes diamonds (n = 2.42, \u03b8<sub>c</sub> \u2248 24\u00b0) sparkle.'),
      p('The index also depends slightly on wavelength: in glass, violet light has a higher n than red, so it bends more. A prism therefore fans white light out into its colors. This is <b>dispersion</b>, and it is also why rainbows have red on the outside.'),
      callout('key', 'Snell in one sentence', 'Measure angles from the <b>normal</b>. Into higher n: bend <b>toward</b> the normal. Into lower n: bend away, and past \u03b8<sub>c</sub> nothing gets out. Total internal reflection needs <b>n<sub>1</sub> &gt; n<sub>2</sub></b>.'),
    );

    // Lenses
    root.append(
      h('h2', { text: 'Thin lenses and mirrors', class: 'reveal' }),
      p('A lens is shaped so that refraction at its two curved surfaces sends rays to a common point. A <b>converging</b> lens (thicker in the middle) bends incoming parallel rays so they meet at the <b>focal point</b> F, a distance ' + eq('f') + ' behind it. A <b>diverging</b> lens (thinner in the middle) spreads parallel rays so they seem to come from a focal point in front of it. You find an image by tracing three easy rays from the tip of the object, the <b>principal rays</b>:'),
      h('ol', { class: 'steps reveal' },
        h('li', { html: '<b>Parallel</b> to the axis in \u2192 out through the far F (diverging: out as if from the near F).' }),
        h('li', { html: 'Through the <b>center</b> of the lens \u2192 straight through, undeviated.' }),
        h('li', { html: 'Through the near F (diverging: aimed at the far F) \u2192 out <b>parallel</b> to the axis.' }),
      ),
      p('Where the outgoing rays cross is the image. If they really cross, light actually gets there and you could put a screen at that spot: a <b>real</b> image. If they spread apart, extend them backward; they seem to come from a point on the object\u2019s side: a <b>virtual</b> image, which you can see by looking through the lens but which no screen can catch. The thin-lens equation gives the same answer without drawing:'),
      equation({
        name: 'Thin lens (and mirror) equation',
        eq: '<span class="frac"><span>1</span><span>f</span></span> = <span class="frac"><span>1</span><span>d<sub>o</sub></span></span> + <span class="frac"><span>1</span><span>d<sub>i</sub></span></span> \u2003\u2003 m = \u2212<span class="frac"><span>d<sub>i</sub></span><span>d<sub>o</sub></span></span>',
        says: 'Object distance and image distance trade off: move the object toward F and the image runs off to infinity. The magnification m is image height over object height.',
        terms: [
          ['f', '<b>+</b> for converging lenses and concave mirrors, <b>\u2212</b> for diverging lenses and convex mirrors', 'm'],
          ['d<sub>o</sub>', 'object distance, + for a real object', 'm'],
          ['d<sub>i</sub>', '<b>+</b>: real image (far side of a lens, in front of a mirror). <b>\u2212</b>: virtual image (object\u2019s side of a lens, behind a mirror)', 'm'],
          ['m', '<b>+</b>: upright, <b>\u2212</b>: inverted; |m| &gt; 1 enlarged', ''],
        ],
      }),
    );

    // Lens sandbox
    const lStage = h('div', { class: 'stage' });
    let f = F;
    let dO = 2.6 * F;
    const lro = readouts([['do', 'd<sub>o</sub>'], ['di', 'd<sub>i</sub>'], ['m', 'm'], ['k', 'Image']]);
    const lView = new PhysView(lStage, {
      height: 340,
      box: [LW, LH],
      onDrag: (id, x) => {
        dO = Math.max(12, Math.min(LX - 14, LX - x));
        lRedraw();
      },
    });
    const lRedraw = () => {
      lView.show({ draw: lensDraw, p: { f, dO, drag: true }, box: [LW, LH] }, { animate: false });
      const img = thinLens(f, dO);
      lro.set({
        do: `${(dO / CM).toFixed(1)} cm`,
        di: img.none ? '\u221e' : `${(img.di / CM).toFixed(1).replace('-', '\u2212')} cm`,
        m: img.none ? '\u2014' : img.m.toFixed(2).replace('-', '\u2212'),
        k: img.none ? 'none (object at F)' : `${img.real ? 'real' : 'virtual'}, ${img.upright ? 'upright' : 'inverted'}, ${Math.abs(img.m) > 1 ? 'enlarged' : 'smaller'}`,
      });
    };
    root.append(
      figure(
        {
          title: 'Sandbox: ray diagram',
          tools: [segmented([{ value: 1, label: 'Converging' }, { value: -1, label: 'Diverging' }], 1, (v) => ((f = v * F), lRedraw()))],
          note: 'Drag the object (black arrow) along the axis; |f| = 10 cm. Rays 1, 2, 3 are the principal rays above, computed from the lens equation. Solid image = real, dashed = virtual (the dashed ray extensions show where the rays appear to come from).',
        },
        lStage,
        lro,
      ),
    );
    lRedraw();

    root.append(p('Now watch one converging lens as the object walks in toward it. Five positions cover every case an exam can ask about.'));
    const host = h('div');
    root.append(figure({ title: 'The object walks toward the lens' }, host));
    new Player(host, { frames: walkFrames(), View: PhysView, view: { height: 330 } });

    root.append(
      callout('warn', 'Sign conventions are where points are lost', 'Write down the signs before plugging in: <b>f &lt; 0</b> for a diverging lens or convex mirror, and a <b>negative d<sub>i</sub></b> answer means a virtual image, not a mistake. A diverging lens (or convex mirror) <b>always</b> gives a virtual, upright, smaller image, wherever the object is. And never drop the minus sign in m = \u2212d<sub>i</sub>/d<sub>o</sub>: it is what tells you the image is inverted.'),
      p('<b>Mirrors</b> follow the same equation with ' + eq('f = R/2') + ' (R the radius of curvature). A concave mirror behaves like a converging lens; a convex mirror (the passenger-side mirror, "objects are closer than they appear") like a diverging one. The only change is that a mirror\u2019s real images form in front of it, on the same side as the object.'),
      h('ul', { class: 'reveal' },
        h('li', { html: '<b>Eye</b>: a converging lens makes a real, inverted image on the retina; muscles change f to focus.' }),
        h('li', { html: '<b>Camera</b>: the same, onto a sensor; focusing moves the lens to change d<sub>i</sub>.' }),
        h('li', { html: '<b>Magnifier</b>: object just inside F gives a large, upright, virtual image.' }),
      ),
      checkpoint(quiz),
    );
  },
};
