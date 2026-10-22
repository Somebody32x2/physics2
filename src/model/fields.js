/**
 * Shared field math for the figures. No DOM, so tests import it.
 *
 * Coordinates are SVG user units (x right, y DOWN), the same units PhysView draws in. Field strengths are
 * in "figure units" (charge q in arbitrary units, k = 1): good for directions, shapes and ratios.
 * Chapters that need real SI numbers compute them in their own model file.
 */

/** Electric field of point charges [{ x, y, q }] at (x, y): sum of q r_hat / r^2. Returns [Ex, Ey]. */
export function pointField(charges) {
  return (x, y) => {
    let ex = 0;
    let ey = 0;
    for (const c of charges) {
      const dx = x - c.x;
      const dy = y - c.y;
      const r2 = dx * dx + dy * dy;
      if (r2 < 1e-9) continue;
      const inv = c.q / (r2 * Math.sqrt(r2));
      ex += dx * inv;
      ey += dy * inv;
    }
    return [ex, ey];
  };
}

/** Electric potential of point charges at (x, y): sum of q / r (k = 1). */
export function pointPotential(charges) {
  return (x, y) => {
    let v = 0;
    for (const c of charges) {
      const r = Math.hypot(x - c.x, y - c.y);
      v += c.q / Math.max(r, 1e-6);
    }
    return v;
  };
}

/** Force on charge i from all the others (Coulomb, k = 1). Returns [Fx, Fy]. */
export function forceOn(charges, i) {
  const others = charges.filter((_, k) => k !== i);
  const [ex, ey] = pointField(others)(charges[i].x, charges[i].y);
  return [charges[i].q * ex, charges[i].q * ey];
}

/**
 * Magnetic field of long straight wires perpendicular to the page, [{ x, y, I }].
 * I > 0 means current OUT of the page. B circles the wire counterclockwise (right-hand rule)
 * with strength I / r. On screen (y down) counterclockwise-as-seen means B = I (dy, -dx) / r^2.
 */
export function wireField(wires) {
  return (x, y) => {
    let bx = 0;
    let by = 0;
    for (const w of wires) {
      const dx = x - w.x;
      const dy = y - w.y;
      const r2 = dx * dx + dy * dy;
      if (r2 < 1e-9) continue;
      bx += (w.I * dy) / r2;
      by += (-w.I * dx) / r2;
    }
    return [bx, by];
  };
}

/**
 * Follow a field line from `seed` with fixed step `ds` (midpoint method).
 * dir = +1 follows the field, -1 goes against it. Stops after maxSteps, outside `bounds`
 * [x0, y0, x1, y1], when `stop(x, y)` returns true, or where the field vanishes.
 * Returns [[x, y], ...] including the seed.
 */
export function traceLine(field, seed, { ds = 4, maxSteps = 800, dir = 1, bounds = null, stop = null } = {}) {
  const pts = [[seed[0], seed[1]]];
  let [x, y] = seed;
  const unit = (fx, fy) => {
    const m = Math.hypot(fx, fy);
    return m < 1e-12 ? null : [(dir * fx) / m, (dir * fy) / m];
  };
  for (let s = 0; s < maxSteps; s++) {
    const u1 = unit(...field(x, y));
    if (!u1) break;
    const u2 = unit(...field(x + (u1[0] * ds) / 2, y + (u1[1] * ds) / 2));
    if (!u2) break;
    x += u2[0] * ds;
    y += u2[1] * ds;
    pts.push([x, y]);
    if (bounds && (x < bounds[0] || y < bounds[1] || x > bounds[2] || y > bounds[3])) break;
    if (stop && stop(x, y)) break;
  }
  return pts;
}

/**
 * Field lines of point charges, the textbook way: the number of lines leaving a charge is
 * proportional to |q| (`perUnit` lines per unit charge). Lines start on positive charges and run
 * until they reach a negative charge or leave `bounds`. If there are no positive charges, lines
 * start on the negative ones and are traced backwards (so they still point toward the charge).
 * Returns [{ pts, from: chargeIndex }].
 */
export function chargeFieldLines(charges, { perUnit = 8, bounds, r0 = 16, ds = 4, maxSteps = 900 } = {}) {
  const field = pointField(charges);
  const anyPositive = charges.some((c) => c.q > 0);
  const sources = charges.map((c, i) => ({ c, i })).filter(({ c }) => (anyPositive ? c.q > 0 : c.q < 0));
  const sinks = charges.filter((c) => (anyPositive ? c.q < 0 : c.q > 0));
  const stop = (x, y) => sinks.some((c) => Math.hypot(x - c.x, y - c.y) < r0 * 0.8);
  const lines = [];
  for (const { c, i } of sources) {
    const n = Math.max(2, Math.round(Math.abs(c.q) * perUnit));
    for (let k = 0; k < n; k++) {
      const a = (2 * Math.PI * (k + 0.5)) / n;
      const seed = [c.x + r0 * Math.cos(a), c.y + r0 * Math.sin(a)];
      let pts = traceLine(field, seed, { ds, maxSteps, dir: anyPositive ? 1 : -1, bounds, stop });
      if (!anyPositive) pts = pts.reverse();
      lines.push({ pts, from: i });
    }
  }
  return lines;
}

/**
 * Contour lines of a scalar function by marching squares on a grid.
 * Returns [{ level, segs: [[x1, y1, x2, y2], ...] }]. Cells touching a non-finite value or a jump
 * larger than `maxJump` (singularities such as point charges) are skipped.
 */
export function isolines(fn, levels, { x0, y0, x1, y1, step = 8, maxJump = Infinity } = {}) {
  const nx = Math.ceil((x1 - x0) / step);
  const ny = Math.ceil((y1 - y0) / step);
  const val = [];
  for (let j = 0; j <= ny; j++) {
    const row = [];
    for (let i = 0; i <= nx; i++) row.push(fn(x0 + i * step, y0 + j * step));
    val.push(row);
  }
  return levels.map((level) => {
    const segs = [];
    for (let j = 0; j < ny; j++) {
      for (let i = 0; i < nx; i++) {
        const v = [val[j][i], val[j][i + 1], val[j + 1][i + 1], val[j + 1][i]];
        if (v.some((t) => !Number.isFinite(t))) continue;
        if (Math.max(...v) - Math.min(...v) > maxJump) continue;
        const px = [x0 + i * step, x0 + (i + 1) * step, x0 + (i + 1) * step, x0 + i * step];
        const py = [y0 + j * step, y0 + j * step, y0 + (j + 1) * step, y0 + (j + 1) * step];
        const cross = [];
        for (let e = 0; e < 4; e++) {
          const a = e;
          const b = (e + 1) % 4;
          if ((v[a] < level) !== (v[b] < level)) {
            const t = (level - v[a]) / (v[b] - v[a]);
            cross.push([px[a] + t * (px[b] - px[a]), py[a] + t * (py[b] - py[a])]);
          }
        }
        if (cross.length === 2) segs.push([...cross[0], ...cross[1]]);
        else if (cross.length === 4) segs.push([...cross[0], ...cross[1]], [...cross[2], ...cross[3]]);
      }
    }
    return { level, segs };
  });
}
