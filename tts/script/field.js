/** Narration for "The electric field" (src/lessons/field.js). Format: see overview.js; guide: tts/WRITING.md. */
export default {
  sections: [
    {
      voice: 'Achird',
      blocks: [
        {
          at: 'splits that into two steps',
          say: `Coulomb's law gives the force between two charges that both exist. The electric field splits that into two steps. <short pause> First, a charge, or a whole arrangement of charges, sets up a field in the space around it. Second, any other charge placed in that space feels a force from the field, right at the spot where it sits. The field is an arrow at every point: the force a charge WOULD feel there, per coulomb.`,
        },
        {
          at: 'This is the same move as going from',
          say: `It's the same move you made with gravity. Instead of saying "the Earth pulls this two kilogram ball with nineteen point six newtons", you say "near the Earth, g is nine point eight newtons per kilogram, pointing down". The field is the part that belongs to the source; the force is that times whatever you put in it. One difference from gravity: charge has a sign. So a NEGATIVE charge feels a force opposite to the field.`,
        },
        {
          at: 'Field and force',
          say: `In symbols: the field E is the force F on a small test charge, divided by that charge, q naught. Turn it around, and a charge q in a field feels a force q times E. Along the field if q is positive, against it if q is negative. Field is measured in newtons per coulomb, which is the same as volts per meter.`,
        },
        {
          at: ['For a single point charge the field follows', 'Field of a point charge'],
          say: `For a single point charge, the field comes straight from Coulomb's law: just drop the second charge. E equals k times the size of q, over r squared. So the field grows with the source charge, and falls off as one over r squared. Twice as far, a quarter as strong. And the direction is AWAY from a positive charge, and TOWARD a negative one.`,
        },
        {
          at: 'With several charges, each makes its own field',
          say: `With several charges, each one makes its own field, and the fields add as vectors. That's superposition again, exactly as it was for forces. The figure below uses it to build the most important two-charge field: the dipole, made of equal and opposite charges.`,
        },
      ],
    },
    {
      voice: 'Charon',
      style: 'figure',
      blocks: [
        {
          figure: 'Building a dipole field',
          step: 0,
          say: `Start with a lone positive charge. Its field lines point straight out, in every direction. Those twelve lines spread over bigger and bigger spheres, so their density, which is the field strength, falls off as one over r squared.`,
        },
        {
          figure: 'Building a dipole field',
          step: 1,
          say: `At point P, the field is an arrow pointing away from the positive charge. Its length is k q over r squared. It tells you that a small positive test charge placed at P would be pushed this way.`,
        },
        {
          figure: 'Building a dipole field',
          step: 2,
          say: `Now add an equal negative charge. The lines now start on the plus charge and end on the minus. Each line bends, because the field at every point is the sum of two arrows, one from each charge.`,
        },
        {
          figure: 'Building a dipole field',
          step: 3,
          say: `Here's superposition at P. E one points away from the positive charge, and E two points toward the negative charge. Place them head to tail, and they add up to the net field, in black.`,
        },
        {
          figure: 'Building a dipole field',
          step: 4,
          say: `Notice the net field is tangent to the field line through P. <short pause> That's exactly what a field line is: a curve that follows the field arrow at every point.`,
        },
        {
          figure: 'Building a dipole field',
          step: 5,
          say: `On the midline, the two pieces are mirror images. Their up and down parts cancel, so the net field points parallel to the axis, from plus toward minus.`,
        },
        {
          figure: 'Building a dipole field',
          step: 6,
          say: `Now flip the right charge to positive. The lines push away from each other, and none of them end between the charges. At the midpoint, the two fields are equal and opposite, so the field is ZERO there. Field lines never cross; where they would, the field is zero.`,
        },
        {
          at: 'Rules for field lines',
          style: 'tutor',
          say: `So, the rules for field lines. They start on positive charges and end on negative ones, or run off to infinity. The number of lines leaving a charge is proportional to its charge. Where the lines are dense, the field is strong. The field at any point is tangent to the line through it. <short pause> And lines never cross, because the field has only one direction at each point.`,
        },
      ],
    },
    {
      voice: 'Achird',
      style: 'sandbox',
      blocks: [
        {
          at: 'Try it yourself. Drag the charges',
          say: `Now try it yourself. Drag the charges around, and watch the lines rearrange. Drag the small test charge, q naught, to read the field at any point. And click a charge to change its size or its sign, or to switch it off.`,
        },
        {
          figure: 'Sandbox: field of a few charges',
          say: `Two things worth trying. In a dipole, compare the field at the midpoint with the field just outside one of the charges, along the axis. Then make two equal positive charges, and see if you can park the test charge right where the field is zero.`,
        },
        {
          at: 'Classic mistake',
          style: 'warn',
          say: `A classic mistake: the field arrow tells you the force on a POSITIVE charge. An electron at the same point gets pushed the opposite way. And the field at a point doesn't depend on whether anything is sitting there. The field belongs to the source charges; the force, q E, belongs to the pair.`,
        },
      ],
    },
    {
      voice: 'Charon',
      blocks: [
        {
          at: ['Continuous charge and uniform fields', 'Real objects carry charge spread'],
          say: `Real objects carry charge spread over lines, surfaces, and volumes. The recipe is still superposition. Chop the object into little pieces, treat each one as a point charge, and add up the field of every piece. That sum is an integral, but in this course you mostly need its famous results as scaling facts.`,
        },
        {
          at: 'A long ',
          say: `Three of them. Next to a long line of charge, the field points straight out from the line and falls off as one over r, more slowly than for a point charge. Next to a large flat sheet, the field is the SAME at every distance: sigma over two epsilon naught, where sigma is the charge per area. <short pause> And between two oppositely charged parallel plates, the sheets' fields add up inside and cancel outside. So between the plates the field is uniform: sigma over epsilon naught, pointing from plus to minus.`,
        },
        {
          at: 'is the shortcut that gets these results',
          say: `Gauss's law, in the next chapter, gets these results without the integral. The uniform field between plates is the workhorse of this course. A charge inside it feels a constant force, so it moves exactly like a ball thrown in Physics One: constant velocity across the field, constant acceleration along it. <short pause> A parabola. That's how an old television tube steered its electron beam.`,
        },
        {
          figure: 'An electron through deflection plates',
          style: 'sandbox',
          say: `Here, an electron flies between plates five centimeters long and two centimeters apart. At three hundred volts the field is fifteen thousand volts per meter, and the electron crosses in about two nanoseconds. Try halving the entry speed: the deflection grows four times, because it spends twice as long in the field, and sideways distance goes as time squared.`,
        },
        {
          at: 'Two things to notice in the readouts',
          say: `Two things to notice in the readouts. The acceleration is around ten to the fifteen meters per second squared, so gravity is completely negligible for electrons and ions in any realistic field. And a proton at the same speed would feel the same size force, the other way. But with eighteen hundred thirty-six times the mass, it would bend eighteen hundred thirty-six times less.`,
        },
        {
          sel: '.quiz',
          say: `That's the electric field. Try the checkpoint below, then on to Gauss's law.`,
        },
      ],
    },
  ],
};
