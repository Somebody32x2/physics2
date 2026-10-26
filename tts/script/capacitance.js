/** Narration for "Capacitors" (src/lessons/capacitance.js). Format: see overview.js; guide: tts/WRITING.md. */
export default {
  sections: [
    {
      voice: 'Achird',
      blocks: [
        {
          at: 'is any two conductors near each other',
          say: `A capacitor is just two conductors sitting near each other. One holds a charge of plus Q, and the other holds minus Q. Hook it up to a battery, and the battery pushes charge from one conductor over to the other. It keeps pushing until the voltage between them matches the battery. <short pause> The more charge a pair of conductors needs to reach a given voltage, the bigger its capacitance.`,
        },
        {
          at: 'The standard example is two flat plates',
          say: `The classic example is two flat plates, facing each other across a small gap. Remember from the Gauss chapter: between two oppositely charged sheets, the field is uniform. E equals sigma over epsilon naught. And from the potential chapter, a uniform field over a gap gives V equals E times d. Put the two together, and charge and voltage turn out to be simply proportional. That constant of proportionality gets its own name. <short pause> It's the capacitance, C.`,
        },
        {
          at: 'charge on the + plate',
          say: `So Q equals C times V. C is the charge stored per volt, and it depends only on the shape, size, and filling of the conductors, never on Q or V themselves. Its unit is the farad, one coulomb per volt. That's HUGE: real capacitors run from picofarads to millifarads.`,
        },
        {
          at: 'area of each plate',
          say: `For parallel plates, C equals kappa, times epsilon naught, times the area A, all over the gap d. Bigger plates hold more charge at the same voltage. A smaller gap also means more capacitance. And filling the gap with an insulator multiplies C by kappa, the dielectric constant: one for air, two to ten for plastics and glass.`,
        },
      ],
    },
    {
      voice: 'Charon',
      blocks: [
        {
          figure: 'Sandbox: a parallel-plate capacitor',
          style: 'sandbox',
          say: `Try the sandbox. Each plus sign stands for a tenth of a nanocoulomb. With two hundred square centimeters, a two millimeter gap, and nine volts, you get about eighty-eight picofarads, and about eight tenths of a nanocoulomb. Now double the area, then halve the gap. <short pause> Which change also makes the field stronger?`,
        },
        {
          at: 'Notice what the field does',
          say: `Here's what happens. Bigger plates at the same voltage add more charge, but spread it over more area, so E equals V over d doesn't change: the extra lines just cover more ground. A smaller gap at the same voltage makes the field STRONGER, and pulls more charge onto the same plates.`,
        },
        {
          at: 'Charging a capacitor takes work',
          say: `Charging a capacitor takes work: each new bit of charge has to be pushed onto a plate that already repels it. That work is stored, and you get it back when the capacitor discharges, in a camera flash, or a defibrillator. The best way to think about where it lives: in the electric FIELD between the plates.`,
        },
        {
          at: 'not 1: the average voltage while charging',
          say: `The stored energy has three forms: one half C V squared, Q squared over two C, or one half Q V. They're the same formula, switched with Q equals C V. Pick the one whose variables are held fixed. With a battery attached, V is fixed, so use one half C V squared. For an isolated capacitor, Q is fixed, so use Q squared over two C. <short pause> And the one half? It's there because the voltage only averages V over two while charging up from zero.`,
        },
      ],
    },
    {
      voice: 'Achird',
      style: 'figure',
      blocks: [
        {
          figure: 'Pulling the plates apart',
          step: 0,
          say: `Let's pull the plates apart, with the battery connected. The plates start one millimeter apart on a ten volt battery: one hundred seventy-seven picofarads, and one point seven seven nanocoulombs. Twelve plus signs, twelve minus signs, and one field line from each plus.`,
        },
        {
          figure: 'Pulling the plates apart',
          step: 1,
          say: `Pull the gap to two millimeters. The battery still holds V at ten volts. C goes as one over d, so it halves, and so Q equals C V halves too: charge flows back into the battery. And E equals V over d halves as well.`,
        },
        {
          figure: 'Pulling the plates apart',
          step: 2,
          say: `At three millimeters, C, Q, and E are all down to a third. The stored energy, one half C V squared, falls to about three nanojoules. With V fixed, the energy follows C.`,
        },
        {
          figure: 'Pulling the plates apart',
          step: 3,
          say: `So where did the energy go? You did positive work pulling, because the plates attract, and the field lost energy too. <short pause> Both went into pushing charge back into the battery: recharging it. Now switch to Isolated and step through again. The gap does the same thing, but the consequences don't: Q stays trapped, so V triples instead, and the energy triples too.`,
        },
        {
          at: 'First ask: what is held fixed?',
          style: 'tutor',
          say: `So, for any capacitor problem where something changes, first ask: what is held fixed? Connected to a battery, V is fixed, and Q adjusts. Isolated, Q is fixed, and V adjusts. C itself only changes when the geometry or the filling changes.`,
        },
      ],
    },
    {
      voice: 'Charon',
      style: 'figure',
      blocks: [
        {
          at: 'An insulator in the gap',
          style: 'tutor',
          say: `An insulator in the gap, called a dielectric, raises the capacitance. It contains no free charge, but its molecules stretch in the field into tiny dipoles. Let's see how that works.`,
        },
        {
          figure: 'What a dielectric does',
          step: 0,
          say: `Here's a charged, isolated capacitor, so Q is fixed. Twelve field lines run from the plus plate to the minus plate. Beside it, a slab of plastic: neutral, but its molecules can stretch.`,
        },
        {
          figure: 'What a dielectric does',
          step: 1,
          say: `Slide the slab in. Each molecule is still neutral overall, so on its own, the slab adds no net charge.`,
        },
        {
          figure: 'What a dielectric does',
          step: 2,
          say: `But the field polarizes the molecules. Plus ends get pushed along the field, minus ends the other way. Every molecule becomes a small dipole, lined up with the field.`,
        },
        {
          figure: 'What a dielectric does',
          step: 3,
          say: `Inside the slab, neighboring plus and minus ends cancel. At the surfaces they don't: a layer of negative bound charge faces the plus plate, and positive faces the minus plate. Eight of the twelve lines end on it, and only four pass through. <short pause> So the field inside is E naught over kappa.`,
        },
        {
          figure: 'What a dielectric does',
          step: 4,
          say: `Q hasn't changed, but V equals E d is now a third of what it was. So C, which is Q over V, is three times bigger: C equals kappa times C naught. And the stored energy drops to a third, which means the field actually pulls the slab in.`,
        },
      ],
    },
    {
      voice: 'Achird',
      blocks: [
        {
          at: 'Capacitors in circuits combine by the opposite rules',
          say: `Capacitors in circuits combine by the OPPOSITE rules from resistors. Side by side, in parallel, they share the same voltage, and act like one plate of the combined area, so the capacitances just add. End to end, in series, they carry the same charge, the voltages add, and one over C equivalent equals one over C one plus one over C two. That's smaller than either one: it acts like a wider gap.`,
        },
        {
          figure: 'Two capacitors on 12 V',
          style: 'sandbox',
          say: `Here are two and six microfarads on twelve volts. In parallel, both get the full twelve volts, and together they make eight microfarads. Switch to series: they share eighteen microcoulombs, and the voltage splits nine and three. <short pause> The SMALLER capacitor takes the larger share of the voltage.`,
        },
        {
          at: 'Classic mistake',
          style: 'warn',
          say: `A classic mistake: using the resistor rules for capacitors. For capacitors, parallel adds directly, and series adds reciprocals: the reverse of resistors. A quick check: in series, the equivalent capacitance is always smaller than the smallest one in the chain.`,
        },
        {
          sel: '.quiz',
          say: `That's capacitors. Try the checkpoint below, then on to current and resistance.`,
        },
      ],
    },
  ],
};
