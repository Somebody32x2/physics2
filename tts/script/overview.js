/**
 * Narration for "The big picture" (src/lessons/overview.js). Written to be heard, not read: math is spoken,
 * long sentences are split, and Gemini cues are inline (<short pause>, CAPS for stress).
 *
 * section: { voice, style?, perBlock?, blocks }   (one API call per section; see perBlock in tts/gen.mjs)   block: { say, at?, figure?, step?, style? }
 * at:     text from the page element(s) to highlight while the block plays (sel: a CSS selector instead)
 * figure: a figure's title; with step, the figure steps to that frame when the block starts
 */
export default {
  sections: [
    {
      voice: 'Achird',
      perBlock: 3, // recorded one clip per block, before sections were grouped into one request
      blocks: [
        {
          at: 'Physics I was about motion',
          say: `Physics One was about motion, and the forces that cause it. Gravity was the main named force. Physics Two is about ONE force: the electromagnetic force. And it's about the long chain of things that force builds. Fields, circuits, magnets, light, <short pause> and finally the quantum rules that govern atoms and nuclei.`,
        },
        {
          at: 'The whole semester is one story',
          say: `Here's the thing to hold onto: the whole semester is one story. Charges make fields, and fields push charges. Moving charges add a magnetic field. Changing fields make each other, and the result is light. Then light turns out to come in lumps, <short pause> which opens the door to the atom and its nucleus.`,
        },
        {
          at: 'The ideas are new, but the tools are not',
          say: `The ideas are new, but the tools are not. You'll use F equals m a, energy conservation, and circular motion constantly. What changes is WHERE the force comes from.`,
        },
      ],
    },
    {
      voice: 'Charon',
      style: 'figure',
      perBlock: 4,
      blocks: [
        {
          figure: 'The semester on one page',
          step: 0,
          say: `This map is the semester on one page. Let's walk through it. <short pause> Start with charge. A charge makes an electric field in the space around it, and that field pushes on any other charge sitting there. That two-step picture replaces the old idea of action at a distance.`,
        },
        {
          figure: 'The semester on one page',
          step: 1,
          say: `Now the same field, told with energy. The potential, V, is energy per unit charge. It's a single number at each point, instead of an arrow. And energy conservation from Physics One carries straight over.`,
        },
        {
          figure: 'The semester on one page',
          step: 2,
          say: `Give charges a closed conducting path and a push, like a battery, and they flow. That flow is current. Circuits are really just bookkeeping: charge is conserved at every junction, and energy is conserved around every loop.`,
        },
        {
          figure: 'The semester on one page',
          step: 3,
          say: `Next, magnetism. MOVING charge makes a magnetic field, and a magnetic field pushes only on moving charge, sideways to its motion. A charge sitting still neither makes nor feels B.`,
        },
        {
          figure: 'The semester on one page',
          step: 4,
          say: `A CHANGING magnetic field makes an electric field. And that field can drive current around a loop with no battery at all. That's how generators, transformers, and inductors work.`,
        },
        {
          figure: 'The semester on one page',
          step: 5,
          say: `The last link: a changing electric field also makes a magnetic field. So now E and B can keep regenerating each other, far from any charge, and the pattern travels at c, about three times ten to the eight meters per second. <short pause> That traveling pattern is light.`,
        },
        {
          figure: 'The semester on one page',
          step: 6,
          say: `Light also arrives in lumps: photons, each with energy E equals h f. The same lumpiness explains why atoms give off sharp colors, and why electrons can behave like waves.`,
        },
        {
          figure: 'The semester on one page',
          step: 7,
          say: `Finally, zoom into the atom, to the nucleus. Two protons one femtometer apart repel with about two hundred thirty newtons. Yet nuclei hold together, so there must be an even stronger force. And in nuclear reactions, mass turns into energy, through E equals m c squared.`,
        },
      ],
    },
    {
      voice: 'Achird',
      blocks: [
        {
          at: 'Forces act through',
          say: `If you remember one idea from this course, make it this. Forces act through FIELDS. A source makes a field everywhere around it, and anything that responds to that field feels a force right where it sits. Charges make E. Moving charges make B. Changing B makes E, and changing E makes B. Most problems come down to one of two questions: find the field from these sources, <short pause> or find the force or motion this field causes.`,
        },
      ],
    },
    {
      voice: 'Charon',
      blocks: [
        {
          at: ['Why bother with a middleman?', 'looks like instant action at a distance'],
          say: `So why bother with a middleman? Why not just have charges push each other directly? <short pause> Coulomb's law LOOKS like instant action at a distance: move one charge, and the other feels it at once. But that's not how it works. If you shake a charge, the far-away field only finds out after a delay, because the news travels outward at the speed of light.`,
        },
        {
          at: 'looks like instant action at a distance',
          say: `Between the old field and the new one there's a kink, and that kink carries energy away. A charge that keeps wiggling sends out a whole train of kinks: a wave. That's the seed of electromagnetic waves, later in the course. And it's why the field is a real physical thing, not just bookkeeping.`,
        },
        {
          figure: 'The field is the messenger',
          style: 'sandbox',
          say: `Try it in this figure. Press "One shove" and watch the dashed circle spread out. Outside it, the field lines still point to where the charge USED to be. Inside, they point to where it is now. Then switch to "Keep wiggling", and you'll see a wave peel off the charge. Notice the kinks are strongest sideways to the motion, and missing along it.`,
        },
      ],
    },
    {
      voice: 'Achird',
      blocks: [
        {
          at: ['Why electromagnetism runs everyday life', 'Gravity was the star of Physics I', 'Two protons 1 fm apart'],
          say: `Gravity was the star of Physics One, so it's worth seeing just how weak it is. Take two protons. They repel electrically, and they attract gravitationally. Both forces fall off as one over r squared, so their ratio doesn't depend on distance at all. And that ratio? <short pause> The electric force wins by a factor of about ten to the thirty-six.`,
        },
        {
          at: 'If you drew the gravity arrow one atom wide',
          say: `To picture that: if you drew the gravity arrow one atom wide, the electric arrow would be about ten to the twenty-six meters long. That's roughly the size of the observable universe. <short pause> Gravity only wins for planets because matter is almost perfectly neutral. Positive and negative charges cancel, while mass only adds up. And every contact force from Physics One, the normal force, friction, tension, the push of your hand, <short pause> is really electric force between the outer electrons of atoms.`,
        },
      ],
    },
    {
      voice: 'Charon',
      blocks: [
        {
          at: ['What carries over, and what is new', 'From Physics I'],
          say: `A lot carries over from Physics One. Free-body diagrams and F equals m a work unchanged; electric and magnetic forces are just new entries. Work and potential energy become voltage and circuit power. A charge moving across a magnetic field goes in a circle, so circular motion is back. An L C circuit is a mass on a spring, with charge sloshing instead of position. And waves return as light, and as matter waves.`,
        },
        {
          at: 'From Physics I',
          say: `There are a few new tools, too. Vectors in three dimensions, including arrows into and out of the page. The cross product, which gives the magnetic force, along with the right-hand rule for its direction. Flux: how much field passes through a surface. Integrals, which here just mean adding up the contribution of every little piece. And exponentials, for discharging capacitors and decaying nuclei: equal time steps, equal fractions.`,
        },
      ],
    },
    {
      voice: 'Achird',
      blocks: [
        {
          at: ['The sizes involved', 'The course runs from circuits you can hold', 'From nuclei to radio waves'],
          say: `This course covers a huge range of sizes: from circuits you can hold, down to nuclei a hundred thousand times smaller than an atom. Light ties those scales together. Its wavelength sets which details a wave can resolve, and its photon energy sets which atomic jumps it can drive. On this scale, each tick is a thousand times the one before, and visible light is just a thin sliver.`,
        },
      ],
    },
    {
      voice: 'Charon',
      blocks: [
        {
          at: ['Big equations to recognize', 'You do not need these yet'],
          say: `Next is a table of the big equations. You don't need them yet. For now, the goal is just to recognize each one and know which part of the story it belongs to: Coulomb's law for the force between charges, Q equals C V for capacitors, V equals I R for resistors, E equals h f for photons, and so on. The equation sheet at the end has all of them, with units.`,
        },
        {
          at: ['How to use this site', 'Each chapter opens with a few paragraphs'],
          say: `A quick word on how to use this site. Each chapter opens with a few paragraphs, then stepped figures. Use the arrow buttons under a figure to move one step at a time, and read the caption for what changed and why. Sandboxes have sliders, toggles, or charges you can drag: play with them until the behavior feels predictable. And every chapter ends with a short checkpoint. Your answers are saved in this browser.`,
        },
        {
          at: 'The trap at the start of the semester',
          style: 'warn',
          say: `One trap to avoid at the start of the semester: treating Physics Two as a list of formulas. The chapters are links in one chain. Most exam questions really test whether you know WHICH link applies. Is this the field from a charge at rest? From a current? From a changing flux? <short pause> Find the link on the map first. Then pick the equation.`,
        },
        {
          sel: '.quiz',
          say: `That's the big picture. Try the checkpoint below, then head on to chapter two: charge, and Coulomb's law.`,
        },
      ],
    },
  ],
};
