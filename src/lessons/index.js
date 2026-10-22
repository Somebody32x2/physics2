import overview from './overview.js';
import charge from './charge.js';
import field from './field.js';
import gauss from './gauss.js';
import potential from './potential.js';
import capacitance from './capacitance.js';
import current from './current.js';
import dcCircuits from './dc-circuits.js';
import rc from './rc.js';
import magneticForce from './magnetic-force.js';
import magneticSources from './magnetic-sources.js';
import induction from './induction.js';
import inductance from './inductance.js';
import emWaves from './em-waves.js';
import rays from './rays.js';
import interference from './interference.js';
import diffraction from './diffraction.js';
import photons from './photons.js';
import atoms from './atoms.js';
import nuclear from './nuclear.js';
import equations from './equations.js';
import { heroFrames } from './hero.js';
import { PhysView } from '../core/phys-view.js';

/**
 * Chapters in reading order. Chapter module contract:
 *   export default { id, title, group, blurb, quiz: [questions], render(root) }
 * `group` clusters chapters in the sidebar; `quiz` ids drive the progress counters.
 */
export const chapters = [
  overview,
  charge,
  field,
  gauss,
  potential,
  capacitance,
  current,
  dcCircuits,
  rc,
  magneticForce,
  magneticSources,
  induction,
  inductance,
  emWaves,
  rays,
  interference,
  diffraction,
  photons,
  atoms,
  nuclear,
  equations,
];

/** Looping figure on the home page. */
export const hero = () => ({ title: 'Charges, field lines and equipotentials', frames: heroFrames(), View: PhysView, view: { height: 380 } });

/** "How to read the diagrams": the color meanings used in every figure (styles.css, "physics figures"). */
const arrow = (c) => `<span class="lg-arrow" style="--c: var(${c})"></span>`;
export const legend = [
  { sym: '<span class="lg-charge ph-pos">+</span> <span class="lg-charge ph-neg">\u2212</span>', text: 'positive charge (red) and negative charge (blue)' },
  { sym: arrow('--t3'), text: 'electric field <b>E</b>: field lines and field vectors' },
  { sym: arrow('--t1'), text: 'magnetic field <b>B</b>; \u00d7 into the page, \u2022 out of the page' },
  { sym: arrow('--ink-strong'), text: 'force <b>F</b>' },
  { sym: arrow('--t4'), text: 'velocity <b>v</b>' },
  { sym: arrow('--t2'), text: 'current <b>I</b> (conventional: the way + charge would flow)' },
  { sym: arrow('--yellow'), text: 'light rays and photons' },
  { sym: '<span class="legend-line" style="background: none; border-top: 2px dashed var(--faint); height: 0"></span>', text: 'equipotential (a line of constant voltage)' },
];
