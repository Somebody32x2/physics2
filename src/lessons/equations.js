import { h, p } from '../ui/dom.js';
import { PhysView } from '../core/phys-view.js';
import { figure, callout, segmented } from '../ui/figure.js';
import { checkpoint } from '../ui/quiz.js';
import { equation, eq, slider, controlsRow } from '../ui/controls.js';
import { SCALING, scaleFactor, wireResistance, K, EPS0, MU0, E_CHARGE, M_E, M_P, C, H, EV, U, G, HC_EVNM, U_MEV } from '../model/overview.js';

const frac = (top, bottom) => `<span class="frac"><span>${top}</span><span>${bottom}</span></span>`;
const vec = (s) => `<span class="vec">${s}</span>`;
const sci = (x, digits = 2) => {
  const e = Math.floor(Math.log10(Math.abs(x)));
  const m = x / 10 ** e;
  return `${m.toFixed(digits)} \u00d7 10<sup>${e < 0 ? '\u2212' : ''}${Math.abs(e)}</sup>`;
};
/** Factor as text: 4, 0.25 = 1/4, 1.41 ... */
function factorText(f) {
  const r = (v) => (Math.abs(v - Math.round(v)) < 0.005 ? String(Math.round(v)) : v.toFixed(2));
  return f >= 0.995 ? r(f) : `1/${r(1 / f)}`;
}

// ---------- the scaling explorer ----------
const LAWS = {
  coulomb: { label: 'Coulomb', eq: 'F = k|q<sub>1</sub>q<sub>2</sub>|/r<sup>2</sup>', input: 'r', out: 'F', why: 'r is squared in the denominator' },
  potential: { label: 'Point V', eq: 'V = kq/r', input: 'r', out: 'V', why: 'r appears once in the denominator: V falls more slowly than E' },
  wire: { label: 'Wire B', eq: 'B = \u03bc<sub>0</sub>I/(2\u03c0r)', input: 'r', out: 'B', why: 'a long wire\u2019s field falls as 1/r, not 1/r<sup>2</sup>' },
  capacitor: { label: 'Capacitor C', eq: 'C = \u03b5<sub>0</sub>A/d', input: 'd', out: 'C', why: 'a narrower gap stores more charge per volt' },
  resistance: { label: 'Wire R', eq: 'R = \u03c1L/A, A = \u03c0D<sup>2</sup>/4', input: 'D', out: 'R', why: 'area goes as diameter squared' },
  photon: { label: 'Photon E', eq: 'E = hc/\u03bb', input: '\u03bb', out: 'E', why: 'shorter wavelength means more energy per photon' },
  decay: { label: 'Decay', eq: 'N = N<sub>0</sub>(1/2)<sup>t/T</sup>', input: 't', out: 'N', why: 'each half-life multiplies N by 1/2, whatever came before' },
};
const RANGE = { power: [0.5, 4], exp: [0, 5] };

function scaleDraw(d, p) {
  const law = LAWS[p.law];
  const kind = SCALING[p.law].kind;
  const [a, b] = RANGE[kind];
  const f = (x) => scaleFactor(p.law, x);
  const x0 = kind === 'exp' ? 0 : 1;
  const ymax = Math.max(f(a), f(b), 1) * 1.08;
  const yticks = [[1, '1']];
  if (ymax > 2.5) yticks.push([2, '2'], [4, '4']);
  else if (ymax > 1.5) yticks.push([2, '2']);
  const pl = d.plot({
    x: 58, y: 34, w: 340, h: 220, xr: [kind === 'exp' ? 0 : 0, b], yr: [0, ymax],
    xLabel: '',
    yLabel: `${law.out} / ${law.out}<sub>0</sub>`,
    ticksX: kind === 'exp' ? [[1, '1'], [2, '2'], [3, '3'], [4, '4'], [5, '5']] : [[1, '1'], [2, '2'], [3, '3'], [4, '4']],
    ticksY: yticks,
  });
  pl.fn(f, { from: a, to: b, cls: 'ph-plot' });
  d.text(398, 34 + 220 + 32, kind === 'exp' ? 'time t, in half-lives' : `${law.input} / ${law.input}<sub>0</sub> (input multiplier)`, { cls: 'ph-label', anchor: 'end' });
  // start point
  pl.vline(x0);
  pl.dot(x0, 1, { cls: 'ph-mute', r: 5 });
  // current point
  const y = f(p.x);
  pl.line(p.x, 0, p.x, y, { cls: 'ph-plot2', dash: '4 4' });
  pl.line(0, y, p.x, y, { cls: 'ph-plot2', dash: '4 4' });
  pl.dot(p.x, y, { cls: 'ph-plot2', r: 6 });

  // right panel
  const rx = 440;
  d.text(rx, 46, law.eq, { serif: true, size: 19, anchor: 'start' });
  const change = kind === 'exp' ? `t = ${p.x.toFixed(1)} half-lives` : `${law.input} \u00d7 ${p.x.toFixed(2)}`;
  d.text(rx, 104, change, { size: 16, anchor: 'start', cls: 'ph-label' });
  d.arrow(rx + 8, 124, rx + 8, 156, { cls: 'ph-label', w: 1.6 });
  d.text(rx, 184, `${law.out} \u00d7 ${factorText(y)}`, { size: 24, anchor: 'start', cls: 'ph-plot2' });
  if (kind === 'power') d.text(rx, 218, `${law.out} \u221d ${law.input}<sup>${SCALING[p.law].power < 0 ? '\u2212' : ''}${Math.abs(SCALING[p.law].power)}</sup>`, { size: 15, anchor: 'start', cls: 'ph-label' });
  else d.text(rx, 218, 'exponential, not a power', { size: 13, anchor: 'start', cls: 'ph-label' });
}

// ---------- reference tables ----------
// rows: [equation HTML, what it relates (HTML), units, chapter id]
const CHAPTER_NAMES = {
  charge: 'Coulomb', field: 'E field', gauss: 'Gauss', potential: 'Potential', capacitance: 'Capacitors',
  current: 'Current', 'dc-circuits': 'DC circuits', rc: 'RC', 'magnetic-force': 'Mag. force',
  'magnetic-sources': 'B sources', induction: 'Induction', inductance: 'Inductance', 'em-waves': 'EM waves',
  rays: 'Rays & lenses', interference: 'Interference', diffraction: 'Diffraction', photons: 'Photons',
  atoms: 'Atoms', nuclear: 'Nuclear',
};
const TOPICS = [
  ['Electric charge and field', [
    ['F = k|q<sub>1</sub>q<sub>2</sub>|/r<sup>2</sup>', 'Force between two point charges. Grows with each charge, falls as 1/r<sup>2</sup>.', 'N', 'charge'],
    [`${vec('F')} = q${vec('E')}`, 'Force on a charge q placed where the field is E. A negative q is pushed opposite to E.', 'N', 'field'],
    ['E = k|q|/r<sup>2</sup>', 'Field of a point charge (or outside any sphere of charge). Falls as 1/r<sup>2</sup>.', 'N/C', 'field'],
    ['E = \u03bb/(2\u03c0\u03b5<sub>0</sub>r)', 'Field of a long line of charge, \u03bb per meter. Falls only as 1/r.', 'N/C', 'gauss'],
    ['E = \u03c3/(2\u03b5<sub>0</sub>)', 'Field of a large flat sheet, \u03c3 per square meter. Does not depend on distance.', 'N/C', 'gauss'],
    ['\u03a6<sub>E</sub> = Q<sub>enc</sub>/\u03b5<sub>0</sub>', 'Gauss: net field flux out of a closed surface equals the charge inside over \u03b5<sub>0</sub>.', 'N\u00b7m\u00b2/C', 'gauss'],
    ['E<sub>inside</sub> = 0', 'Inside a conductor in equilibrium. Any excess charge sits on the surface.', 'N/C', 'gauss'],
  ]],
  ['Electric potential', [
    ['V = kq/r', 'Potential of a point charge. A signed number, not a vector; falls as 1/r.', 'V = J/C', 'potential'],
    ['U = kq<sub>1</sub>q<sub>2</sub>/r', 'Potential energy of a pair. Positive for like charges (work went in pushing them together).', 'J', 'potential'],
    ['\u0394U = q\u0394V', 'Energy change of a charge crossing a voltage. Positive charges lose U going downhill in V.', 'J', 'potential'],
    ['\u0394V = \u2212Ed', 'Uniform field: voltage drops by E per meter along the field.', 'V', 'potential'],
    ['E = \u2212dV/dx', 'Field is the downhill slope of V. Steep V means strong E; E points toward lower V.', 'V/m', 'potential'],
    ['K<sub>i</sub> + qV<sub>i</sub> = K<sub>f</sub> + qV<sub>f</sub>', 'Energy conservation for a charge moving in a field. Physics I with U = qV.', 'J', 'potential'],
  ]],
  ['Capacitance', [
    ['Q = CV', 'Charge on each plate and the voltage between them. C is fixed by geometry.', 'C; F = C/V', 'capacitance'],
    ['C = \u03ba\u03b5<sub>0</sub>A/d', 'Parallel plates: bigger area and smaller gap store more; a dielectric multiplies C by \u03ba.', 'F', 'capacitance'],
    ['U = \u00bdCV<sup>2</sup> = Q<sup>2</sup>/(2C)', 'Energy stored. Double V at fixed C and U goes up 4\u00d7.', 'J', 'capacitance'],
    ['u = \u00bd\u03b5<sub>0</sub>E<sup>2</sup>', 'Energy per volume stored in any electric field.', 'J/m\u00b3', 'capacitance'],
    ['C<sub>par</sub> = C<sub>1</sub> + C<sub>2</sub>', 'Parallel capacitors add (same V, charges add).', 'F', 'capacitance'],
    ['1/C<sub>ser</sub> = 1/C<sub>1</sub> + 1/C<sub>2</sub>', 'Series capacitors: same Q, total is less than the smallest.', 'F', 'capacitance'],
  ]],
  ['Current and circuits', [
    ['I = \u0394Q/\u0394t', 'Current is charge per second passing a point.', 'A = C/s', 'current'],
    ['R = \u03c1L/A', 'Resistance of a wire: longer means more, thicker means less.', '\u03a9', 'current'],
    ['V = IR', 'Ohm: voltage across a resistor and the current through it.', 'V', 'current'],
    ['P = IV = I<sup>2</sup>R = V<sup>2</sup>/R', 'Power delivered to (or by) an element.', 'W', 'current'],
    ['R<sub>ser</sub> = R<sub>1</sub> + R<sub>2</sub>', 'Series: same current, voltages add.', '\u03a9', 'dc-circuits'],
    ['1/R<sub>par</sub> = 1/R<sub>1</sub> + 1/R<sub>2</sub>', 'Parallel: same voltage, currents add; total is less than the smallest.', '\u03a9', 'dc-circuits'],
    ['\u03a3I<sub>in</sub> = \u03a3I<sub>out</sub>', 'Junction rule: charge is conserved at every node.', 'A', 'dc-circuits'],
    ['\u03a3\u0394V<sub>loop</sub> = 0', 'Loop rule: energy is conserved around every closed loop.', 'V', 'dc-circuits'],
    ['V<sub>term</sub> = \u2130 \u2212 Ir', 'A real battery loses Ir inside itself when current flows.', 'V', 'current'],
    ['\u03c4 = RC', 'Time constant: after one \u03c4 a charging capacitor is 63% full, a discharging one 37% left.', 's', 'rc'],
    ['q = Q(1 \u2212 e<sup>\u2212t/\u03c4</sup>), q = Q<sub>0</sub>e<sup>\u2212t/\u03c4</sup>', 'Charging and discharging curves.', 'C', 'rc'],
  ]],
  ['Magnetism', [
    [`${vec('F')} = q${vec('v')} \u00d7 ${vec('B')}`, 'Magnetic force: perpendicular to both v and B, size |q|vB sin\u03b8. Zero for charges at rest.', 'N', 'magnetic-force'],
    ['r = mv/(|q|B)', 'Radius of circular motion in a uniform B. Faster or heavier means bigger circles.', 'm', 'magnetic-force'],
    [`${vec('F')} = I${vec('L')} \u00d7 ${vec('B')}`, 'Force on a current-carrying wire of length L.', 'N', 'magnetic-force'],
    ['\u03c4 = NIAB sin\u03b8', 'Torque on a current loop (motors, meters).', 'N\u00b7m', 'magnetic-force'],
    ['B = \u03bc<sub>0</sub>I/(2\u03c0r)', 'Field of a long straight wire: circles around it, falls as 1/r.', 'T', 'magnetic-sources'],
    ['B = \u03bc<sub>0</sub>nI', 'Inside a long solenoid, n turns per meter: uniform.', 'T', 'magnetic-sources'],
    ['B = \u03bc<sub>0</sub>NI/(2R)', 'Center of a circular loop of N turns.', 'T', 'magnetic-sources'],
    ['\u222e B\u00b7dl = \u03bc<sub>0</sub>I<sub>enc</sub>', 'Amp\u00e8re: B around a closed path is set by the current through it.', 'T\u00b7m', 'magnetic-sources'],
    ['F/L = \u03bc<sub>0</sub>I<sub>1</sub>I<sub>2</sub>/(2\u03c0d)', 'Parallel wires: currents in the same direction attract.', 'N/m', 'magnetic-sources'],
  ]],
  ['Induction and inductance', [
    ['\u03a6<sub>B</sub> = BA cos\u03b8', 'Magnetic flux: how much B passes through a loop.', 'Wb = T\u00b7m\u00b2', 'induction'],
    ['\u2130 = \u2212N d\u03a6<sub>B</sub>/dt', 'Faraday: a changing flux induces an emf; the minus sign (Lenz) means it opposes the change.', 'V', 'induction'],
    ['\u2130 = BLv', 'Motional emf of a rod of length L sliding at v through B.', 'V', 'induction'],
    ['V<sub>2</sub>/V<sub>1</sub> = N<sub>2</sub>/N<sub>1</sub>', 'Ideal transformer: voltage scales with the number of turns.', '', 'induction'],
    ['\u2130 = \u2212L dI/dt', 'An inductor opposes changes in its own current.', 'V', 'inductance'],
    ['L = \u03bc<sub>0</sub>N<sup>2</sup>A/\u2113', 'Solenoid inductance: grows as turns squared.', 'H', 'inductance'],
    ['U = \u00bdLI<sup>2</sup>', 'Energy stored in the magnetic field of an inductor.', 'J', 'inductance'],
    ['\u03c4 = L/R', 'Time constant for current to build up or die out in an RL circuit.', 's', 'inductance'],
    ['\u03c9 = 1/\u221a(LC)', 'LC oscillation: energy sloshes between C and L like a mass on a spring.', 'rad/s', 'inductance'],
  ]],
  ['Electromagnetic waves', [
    ['c = f\u03bb', 'Speed, frequency and wavelength of light: higher f means shorter \u03bb.', 'm/s', 'em-waves'],
    ['c = 1/\u221a(\u03b5<sub>0</sub>\u03bc<sub>0</sub>)', 'The speed of light follows from the electric and magnetic constants.', 'm/s', 'em-waves'],
    ['E = cB', 'Electric and magnetic field strengths in a wave (in phase, perpendicular).', 'V/m', 'em-waves'],
    ['I = \u00bdc\u03b5<sub>0</sub>E<sub>0</sub><sup>2</sup>', 'Intensity grows as the square of the field amplitude.', 'W/m\u00b2', 'em-waves'],
    ['I = I<sub>0</sub>cos<sup>2</sup>\u03b8', 'Malus: polarized light through a polarizer at angle \u03b8.', 'W/m\u00b2', 'em-waves'],
  ]],
  ['Optics', [
    ['\u03b8<sub>r</sub> = \u03b8<sub>i</sub>', 'Reflection: angles measured from the normal are equal.', '', 'rays'],
    ['n = c/v', 'Index of refraction: how much slower light moves in the material.', '', 'rays'],
    ['n<sub>1</sub> sin\u03b8<sub>1</sub> = n<sub>2</sub> sin\u03b8<sub>2</sub>', 'Snell: light bends toward the normal entering a slower (higher n) medium.', '', 'rays'],
    ['sin\u03b8<sub>c</sub> = n<sub>2</sub>/n<sub>1</sub>', 'Critical angle for total internal reflection (only going from high n to low n).', '', 'rays'],
    ['1/d<sub>o</sub> + 1/d<sub>i</sub> = 1/f', 'Thin lens or mirror: object distance, image distance, focal length.', 'm', 'rays'],
    ['m = \u2212d<sub>i</sub>/d<sub>o</sub>', 'Magnification; negative means the image is inverted.', '', 'rays'],
    ['d sin\u03b8 = m\u03bb', 'Double slit or grating: bright fringes. Wider spacing d gives tighter fringes.', 'm', 'interference'],
    ['y<sub>m</sub> = m\u03bbL/d', 'Small-angle fringe positions on a screen a distance L away.', 'm', 'interference'],
    ['2nt = (m + \u00bd)\u03bb', 'Thin film, exactly one reflection phase flip: bright reflection. With zero or two flips the bright condition is 2nt = m\u03bb.', 'm', 'interference'],
    ['a sin\u03b8 = m\u03bb', 'Single slit: dark fringes (m = 1, 2, ...). Narrower slit spreads light more.', 'm', 'diffraction'],
    ['sin\u03b8<sub>min</sub> = 1.22\u03bb/D', 'Rayleigh: smallest resolvable angle for a circular aperture of diameter D.', 'rad', 'diffraction'],
  ]],
  ['Quantum', [
    ['E = hf = hc/\u03bb', 'Photon energy: proportional to frequency. hc = 1240 eV\u00b7nm.', 'J or eV', 'photons'],
    ['K<sub>max</sub> = hf \u2212 \u03c6', 'Photoelectric effect: one photon frees one electron; brightness changes how many, not how fast.', 'eV', 'photons'],
    ['p = h/\u03bb', 'Photon momentum.', 'kg\u00b7m/s', 'photons'],
    ['\u0394\u03bb = (h/mc)(1 \u2212 cos\u03b8)', 'Compton: an X-ray photon loses energy bouncing off an electron at angle \u03b8.', 'm', 'photons'],
    ['\u03bb = h/p', 'de Broglie: any particle with momentum p acts as a wave of wavelength \u03bb.', 'm', 'atoms'],
    ['E<sub>n</sub> = \u221213.6 eV/n<sup>2</sup>', 'Hydrogen energy levels; n = 1 is the ground state.', 'eV', 'atoms'],
    ['hf = E<sub>upper</sub> \u2212 E<sub>lower</sub>', 'An atom emits or absorbs exactly the photon that matches a level gap.', 'eV', 'atoms'],
    ['\u0394x\u0394p \u2265 h/(4\u03c0)', 'Uncertainty: position and momentum cannot both be sharp.', 'J\u00b7s', 'atoms'],
  ]],
  ['Nuclear', [
    ['A = Z + N', 'Mass number = protons + neutrons. Isotopes share Z.', '', 'nuclear'],
    ['R = R<sub>0</sub>A<sup>1/3</sup>', 'Nuclear radius, R<sub>0</sub> \u2248 1.2 fm: volume grows in proportion to A.', 'm', 'nuclear'],
    ['E = mc<sup>2</sup>', 'Mass and energy are interchangeable; 1 u \u2194 931.5 MeV.', 'J or MeV', 'nuclear'],
    ['E<sub>B</sub> = (Zm<sub>H</sub> + Nm<sub>n</sub> \u2212 M)c<sup>2</sup>', 'Binding energy: the mass a nucleus is missing compared with its parts.', 'MeV', 'nuclear'],
    ['N = N<sub>0</sub>e<sup>\u2212\u03bbt</sup> = N<sub>0</sub>(\u00bd)<sup>t/T<sub>1/2</sub></sup>', 'Radioactive decay: each half-life halves what is left.', '', 'nuclear'],
    ['T<sub>1/2</sub> = ln 2/\u03bb', 'Half-life and decay constant.', 's', 'nuclear'],
    ['R = \u03bbN', 'Activity: decays per second, proportional to how many nuclei remain.', 'Bq', 'nuclear'],
  ]],
];

function topicTable([title, rows]) {
  return [
    h('h3', { text: title }),
    h('div', { class: 'table-wrap reveal' }, h('table', {},
      h('thead', {}, h('tr', {}, h('th', { text: 'Equation' }), h('th', { text: 'What it relates' }), h('th', { text: 'Units' }), h('th', { text: 'Chapter' }))),
      h('tbody', {}, rows.map(([e, relates, unit, id]) => h('tr', {},
        h('td', { html: eq(e) }),
        h('td', { html: relates }),
        h('td', { class: 'mono', style: 'white-space: nowrap', html: unit }),
        h('td', { style: 'white-space: nowrap' }, h('a', { href: `#/${id}`, text: CHAPTER_NAMES[id] })),
      ))),
    )),
  ];
}

const CONSTANTS = [
  ['k = 1/(4\u03c0\u03b5<sub>0</sub>)', 'Coulomb constant', `${sci(K)} N\u00b7m\u00b2/C\u00b2`],
  ['\u03b5<sub>0</sub>', 'permittivity of free space', `${sci(EPS0)} C\u00b2/(N\u00b7m\u00b2)`],
  ['\u03bc<sub>0</sub>', 'permeability of free space', `4\u03c0 \u00d7 10<sup>\u22127</sup> = ${sci(MU0)} T\u00b7m/A`],
  ['e', 'elementary charge', `${sci(E_CHARGE)} C`],
  ['m<sub>e</sub>', 'electron mass', `${sci(M_E)} kg`],
  ['m<sub>p</sub>', 'proton mass', `${sci(M_P)} kg`],
  ['c', 'speed of light', `${sci(C)} m/s`],
  ['h', 'Planck constant', `${sci(H)} J\u00b7s`],
  ['hc', 'handy for photons', `${Math.round(HC_EVNM)} eV\u00b7nm`],
  ['1 eV', 'electron-volt', `${sci(EV)} J`],
  ['1 u', 'atomic mass unit', `${sci(U)} kg = ${U_MEV.toFixed(1)} MeV/c<sup>2</sup>`],
  ['G', 'gravitational constant (for comparison)', `${sci(G)} N\u00b7m\u00b2/kg\u00b2`],
];

// ---------- quiz ----------
const rFactor = wireResistance(1.7e-8, 20, 2e-3) / wireResistance(1.7e-8, 10, 1e-3);
const eFactor = scaleFactor('coulomb', 2);
const vFactor = scaleFactor('potential', 2);
const quiz = [
  {
    type: 'mcq',
    id: 'equations.gauss',
    prompt: 'What does Gauss\u2019s law, ' + eq('\u03a6<sub>E</sub> = Q<sub>enc</sub>/\u03b5<sub>0</sub>') + ', relate?',
    choices: [
      'The net electric flux out of a closed surface and the charge enclosed by it',
      'The force between two charges and their separation',
      'The induced emf and the rate of change of magnetic flux',
      'The electric field at a point and the charges outside the surface',
    ],
    answer: 0,
    explain: 'Gauss\u2019s law counts field "flowing out" through a closed surface. Only charge <b>inside</b> matters: a charge outside sends as much flux in as out. The force between two charges is Coulomb; flux <i>changing</i> in time is Faraday, the magnetic one.',
  },
  {
    type: 'mcq',
    id: 'equations.faraday',
    prompt: 'Which equation says that a <b>changing magnetic flux</b> produces a voltage?',
    choices: [
      eq('\u2130 = \u2212N d\u03a6<sub>B</sub>/dt'),
      eq(`${vec('F')} = q${vec('v')} \u00d7 ${vec('B')}`),
      eq('B = \u03bc<sub>0</sub>I/(2\u03c0r)'),
      eq('\u03a6<sub>E</sub> = Q<sub>enc</sub>/\u03b5<sub>0</sub>'),
    ],
    answer: 0,
    explain: 'Faraday\u2019s law. The d/dt is the point: a steady flux, however large, induces nothing. ' + eq('q' + vec('v') + ' \u00d7 ' + vec('B')) + ' is the force a field exerts on a moving charge, and ' + eq('\u03bc<sub>0</sub>I/(2\u03c0r)') + ' is the field a current makes; neither involves change in time.',
  },
  {
    type: 'mcq',
    id: 'equations.e-vs-v',
    prompt: 'You move twice as far from a point charge. What happens to the field E and the potential V?',
    choices: [
      `E \u00d7 ${factorText(eFactor)}, V \u00d7 ${factorText(vFactor)}`,
      `Both \u00d7 ${factorText(eFactor)}`,
      `Both \u00d7 ${factorText(vFactor)}`,
      `E \u00d7 ${factorText(vFactor)}, V \u00d7 ${factorText(eFactor)}`,
    ],
    answer: 0,
    explain: `${eq('E = kq/r<sup>2</sup>')} but ${eq('V = kq/r')}. Doubling r multiplies E by 1/2<sup>2</sup> = ${factorText(eFactor)} and V by only ${factorText(vFactor)}. V is one power of r "gentler" because E is its slope.`,
  },
  {
    type: 'input',
    id: 'equations.wire-scale',
    prompt: 'A copper wire is replaced by one twice as <b>long</b> and twice the <b>diameter</b>. Its resistance is multiplied by what number?',
    placeholder: 'factor',
    accept: (text) => {
      const s = text.trim();
      const m = s.match(/^(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)$/);
      const v = m ? Number(m[1]) / Number(m[2]) : parseFloat(s);
      return Math.abs(v - rFactor) < 0.01;
    },
    explain: `${eq('R = \u03c1L/A')} with ${eq('A = \u03c0D<sup>2</sup>/4')}. Doubling L doubles R; doubling D makes A 2<sup>2</sup> = 4 times bigger, dividing R by 4. Together: 2/4 = <b>${rFactor}</b>.`,
  },
];

export default {
  id: 'equations',
  title: 'Equation sheet in words',
  group: 'Reference',
  blurb: 'Every major equation of the course, what it relates, how it scales, its units, and where it is explained.',
  quiz,
  render(root) {
    root.append(
      p('Keep this page open during the semester. Every equation below is listed with what it <b>relates</b>, how the result <b>scales</b> when you change an input, its SI units, and the chapter that explains it. Read an equation as a sentence: "the force between two charges grows with each charge and falls with the square of the distance" is more useful on an exam than the symbols alone.'),
      p('Most of these equations are products and quotients of powers, so most questions about them are <b>ratio questions</b>: multiply one input by a factor and ask what happens to the output. The explorer below drills that habit. The rest are exponentials (RC circuits, RL circuits, radioactive decay), where equal time steps multiply the decaying quantity by equal factors (for a charging capacitor, that is the charge still to go).'),
      h('h2', { text: 'The core eight' }),
      p('If you know these cold, with their words, most of the semester\u2019s problems have a starting point.'),
      equation({
        name: 'Coulomb\u2019s law',
        eq: `F = k ${frac('|q<sub>1</sub>||q<sub>2</sub>|', 'r<sup>2</sup>')}`,
        says: 'Force between two point charges. Grows with each charge, falls with the <b>square</b> of the distance; like charges repel, unlike attract.',
        terms: [['F', 'force on each charge (equal and opposite)', 'N'], ['q<sub>1</sub>, q<sub>2</sub>', 'the charges', 'C'], ['r', 'distance between them', 'm'], ['k', '8.99 \u00d7 10<sup>9</sup>', 'N\u00b7m\u00b2/C\u00b2']],
      }),
      equation({
        name: 'Gauss\u2019s law',
        eq: `\u03a6<sub>E</sub> = \u222e ${vec('E')} \u00b7 d${vec('A')} = ${frac('Q<sub>enc</sub>', '\u03b5<sub>0</sub>')}`,
        says: 'The net field flux out of any <b>closed</b> surface depends only on the charge <b>inside</b>. With symmetry it gives E in one line.',
        terms: [['\u03a6<sub>E</sub>', 'electric flux: field times area it pierces, summed over the surface', 'N\u00b7m\u00b2/C'], ['Q<sub>enc</sub>', 'net charge enclosed', 'C'], ['\u03b5<sub>0</sub>', '8.85 \u00d7 10<sup>\u221212</sup>', 'C\u00b2/(N\u00b7m\u00b2)']],
      }),
      equation({
        name: 'Field and potential',
        eq: `E = \u2212${frac('dV', 'dx')} &nbsp;&nbsp; (uniform: |\u0394V| = Ed)`,
        says: 'The field is the <b>downhill slope</b> of the potential. Closely spaced equipotentials mean a strong field; E points toward lower V.',
        terms: [['E', 'electric field', 'V/m = N/C'], ['V', 'electric potential (energy per charge)', 'V = J/C'], ['d', 'distance along the field', 'm']],
      }),
      equation({
        name: 'Ohm and Kirchhoff',
        eq: 'V = IR &nbsp;&nbsp; \u03a3I<sub>in</sub> = \u03a3I<sub>out</sub> &nbsp;&nbsp; \u03a3\u0394V<sub>loop</sub> = 0',
        says: 'Voltage across a resistor is proportional to the current through it. Charge is conserved at junctions and energy around loops; those three lines solve any DC circuit.',
        terms: [['V', 'voltage across the element', 'V'], ['I', 'current through it', 'A'], ['R', 'resistance', '\u03a9 = V/A']],
      }),
      equation({
        name: 'Magnetic force',
        eq: `${vec('F')} = q${vec('v')} \u00d7 ${vec('B')} &nbsp;&nbsp; F = |q|vB sin\u03b8`,
        says: 'Only <b>moving</b> charges feel it, and the force is <b>perpendicular</b> to both v and B (right-hand rule, flipped for negative q). It changes direction, never speed.',
        terms: [['q', 'charge (sign matters)', 'C'], ['v', 'velocity', 'm/s'], ['B', 'magnetic field', 'T'], ['\u03b8', 'angle between v and B', '']],
      }),
      equation({
        name: 'Faraday and Lenz',
        eq: `\u2130 = \u2212N ${frac('d\u03a6<sub>B</sub>', 'dt')} &nbsp;&nbsp; \u03a6<sub>B</sub> = BA cos\u03b8`,
        says: 'A <b>changing</b> magnetic flux through a loop induces an emf, proportional to how fast it changes. The minus sign: the induced current opposes the change.',
        terms: [['\u2130', 'induced emf', 'V'], ['N', 'number of turns', ''], ['\u03a6<sub>B</sub>', 'magnetic flux through one turn', 'Wb = T\u00b7m\u00b2'], ['t', 'time', 's']],
      }),
      equation({
        name: 'Waves',
        eq: `c = f\u03bb &nbsp;&nbsp; c = ${frac('1', '\u221a(\u03b5<sub>0</sub>\u03bc<sub>0</sub>)')}`,
        says: 'All light travels at c in vacuum, so frequency and wavelength are <b>inversely</b> proportional. The value of c is set by the electric and magnetic constants.',
        terms: [['c', '3.00 \u00d7 10<sup>8</sup>', 'm/s'], ['f', 'frequency', 'Hz'], ['\u03bb', 'wavelength', 'm']],
      }),
      equation({
        name: 'Photon energy',
        eq: `E = hf = ${frac('hc', '\u03bb')}`,
        says: 'Light comes in photons whose energy is proportional to frequency: blue photons carry more energy than red ones, regardless of brightness.',
        terms: [['E', 'energy of one photon', 'J or eV'], ['h', '6.63 \u00d7 10<sup>\u221234</sup>', 'J\u00b7s'], ['hc', '1240', 'eV\u00b7nm']],
      }),
    );

    // scaling explorer
    const stage = h('div', { class: 'stage' });
    const view = new PhysView(stage, { height: 340, box: [640, 300], duration: 300 });
    const st = { law: 'coulomb', x: 2 };
    const caption = h('p', { class: 'caption' });
    const show = (animate) => {
      view.show({ draw: scaleDraw, p: { law: st.law, x: st.x }, box: [640, 300] }, { animate });
      const f = scaleFactor(st.law, st.x);
      const law = LAWS[st.law];
      const kind = SCALING[st.law].kind;
      caption.innerHTML = kind === 'exp'
        ? `After <b>${st.x} half-lives</b>, N is multiplied by <b>${factorText(f)}</b>: ${law.why}.`
        : `${law.input} \u00d7 ${st.x} gives ${law.out} \u00d7 <b>${factorText(f)}</b>, because ${law.why}.`;
    };
    const mult = slider({ label: 'Multiply input by', min: 0.5, max: 4, step: 0.25, value: st.x, fmt: (v) => `\u00d7 ${v.toFixed(2)}`, onInput: (v) => { st.x = v; show(true); } });
    const halves = slider({ label: 'Time elapsed', min: 0, max: 5, step: 0.5, value: 1, fmt: (v) => `${v.toFixed(1)} T`, onInput: (v) => { st.x = v; show(true); } });
    halves.style.display = 'none';
    const pick = (law) => {
      st.law = law;
      const exp = SCALING[law].kind === 'exp';
      mult.style.display = exp ? 'none' : '';
      halves.style.display = exp ? '' : 'none';
      st.x = Number((exp ? halves : mult).input.value);
      show(false);
    };
    root.append(
      h('h2', { text: 'Scaling explorer' }),
      figure(
        {
          title: 'What happens to the output?',
          tools: [segmented(Object.entries(LAWS).map(([value, l]) => ({ value, label: l.label })), st.law, pick, { label: 'Equation' })],
          note: 'The grey dot is the starting point (output = 1). Move the slider to multiply the input; the teal dot reads off the new output as a multiple of the old one. Every curve is computed from the actual formula.',
        },
        stage,
        controlsRow(mult, halves),
        caption,
      ),
    );
    show(false);

    root.append(
      callout('key', 'Read the exponent, not the formula', 'For ' + eq('output \u221d input<sup>n</sup>') + ', multiplying the input by a factor s multiplies the output by s<sup>n</sup>. Inverse square (n = \u22122): double r, quarter F. Inverse (n = \u22121): double r, halve V or B. Several inputs changing at once: multiply their factors.'),
      h('h2', { text: 'All equations by topic' }),
      ...TOPICS.flatMap(topicTable),
      h('h2', { text: 'Constants' }),
      h('div', { class: 'table-wrap reveal' }, h('table', {},
        h('thead', {}, h('tr', {}, h('th', { text: 'Symbol' }), h('th', { text: 'Name' }), h('th', { text: 'Value' }))),
        h('tbody', {}, CONSTANTS.map(([s, name, v]) => h('tr', {}, h('td', { html: eq(s) }), h('td', { text: name }), h('td', { class: 'mono', html: v })))),
      )),
      callout('warn', 'Unit traps that cost points', 'Prefixes: \u03bcC = 10<sup>\u22126</sup> C, nC = 10<sup>\u22129</sup> C, pF = 10<sup>\u221212</sup> F, nm = 10<sup>\u22129</sup> m. Areas in cm<sup>2</sup> convert with 10<sup>\u22124</sup>, not 10<sup>\u22122</sup>. Electron-volts are energy, volts are energy <i>per charge</i>: an electron crossing 5 V gains 5 eV = 8.0 \u00d7 10<sup>\u221219</sup> J. Use hc = 1240 eV\u00b7nm only when \u03bb is in nm and you want eV.'),
      checkpoint(quiz),
    );
  },
};
