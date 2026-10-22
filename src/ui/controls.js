import { h } from './dom.js';

/**
 * Labeled range slider with a live readout.
 *   slider({ label: 'Charge q<sub>1</sub>', min: -3, max: 3, step: 1, value: 1, fmt: (v) => `${v} nC`, onInput: (v) => {} })
 * label is HTML. Returns the element; el.set(v) moves it programmatically (and fires onInput).
 */
export function slider({ label, min = 0, max = 1, step = 0.01, value = min, fmt = (v) => String(v), onInput = () => {} }) {
  const out = h('output', { class: 'slider-val' });
  const input = h('input', { type: 'range', min, max, step, value, 'aria-label': label.replace(/<[^>]+>/g, '') });
  const update = () => {
    const v = Number(input.value);
    out.innerHTML = fmt(v);
    onInput(v);
  };
  input.addEventListener('input', update);
  const el = h('label', { class: 'slider' }, h('span', { class: 'slider-label', html: label }), input, out);
  out.innerHTML = fmt(Number(value));
  el.set = (v) => {
    input.value = v;
    update();
  };
  el.input = input;
  return el;
}

/** A row of sliders/buttons under a stage. */
export const controlsRow = (...children) => h('div', { class: 'ctl-row' }, children);

/**
 * Live numeric readouts: readouts([['F', 'force'], ['r', 'distance']]) -> el with el.set({ F: '2.0 N', r: '3 m' }).
 * Labels are HTML.
 */
export function readouts(defs) {
  const cells = {};
  const el = h('div', { class: 'readouts' },
    defs.map(([key, label]) => {
      cells[key] = h('span', { class: 'ro-val' });
      return h('div', { class: 'ro' }, h('span', { class: 'ro-label', html: label }), cells[key]);
    }),
  );
  el.set = (vals) => {
    for (const [k, v] of Object.entries(vals)) if (cells[k]) cells[k].innerHTML = v;
  };
  return el;
}

/**
 * Equation card: the equation, its name, what it says in words, and what every symbol is.
 *   equation({
 *     name: "Coulomb's law",
 *     eq: 'F = k <span class="frac"><span>|q<sub>1</sub>||q<sub>2</sub>|</span><span>r<sup>2</sup></span></span>',
 *     says: 'Force grows with either charge and falls off with the square of the distance.',
 *     terms: [['F', 'force each charge feels', 'N'], ['r', 'distance between them', 'm']],
 *   })
 * eq is HTML in the serif equation style; use <span class="frac"><span>top</span><span>bottom</span></span>
 * for stacked fractions, <span class="vec">E</span> for a vector (arrow over it).
 */
export function equation({ name, eq, says, terms = [] }) {
  return h('div', { class: 'eqcard reveal' },
    name && h('div', { class: 'eyebrow', html: name }),
    h('div', { class: 'eq', html: eq }),
    says && h('p', { class: 'eq-says', html: says }),
    terms.length > 0 &&
      h('dl', { class: 'eq-terms' },
        terms.flatMap(([sym, meaning, unit]) => [
          h('dt', { class: 'eqi', html: sym }),
          h('dd', { html: `${meaning}${unit ? ` <span class="eq-unit">${unit}</span>` : ''}` }),
        ]),
      ),
  );
}

/** Inline equation in prose: eq('V = IR') -> serif italic span. */
export const eq = (html) => `<span class="eqi">${html}</span>`;
