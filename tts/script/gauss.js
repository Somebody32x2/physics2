/** Narration for "Gauss's law" (src/lessons/gauss.js). Format: see overview.js; guide: tts/WRITING.md. */
export default {
  sections: [
    {
      voice: 'Achird',
      blocks: [
        {
          at: 'Field lines give a way to',
          say: `Field lines give us a way to COUNT field. Electric flux through a surface is how much field pokes through it. Picture the number of field lines crossing it. A big surface facing the field head-on catches lots of lines. Tilt it, and it catches fewer. Turn it edge-on, <short pause> and it catches none.`,
        },
        {
          at: 'how much rain falls into a bucket',
          say: `Think of flux as how much rain falls into a bucket. It depends on how hard it's raining, that's E. On the size of the opening, that's A. And on how the opening is tilted relative to the rain.`,
        },
        {
          at: 'Electric flux (uniform field, flat area)',
          say: `So for a flat area in a uniform field: the flux, capital phi, equals E times A times the cosine of theta. Theta is the angle between the field and the surface's NORMAL, the line sticking straight out of it, not the surface itself. Face-on, theta is zero and the flux is biggest. At ninety degrees the field just skims along the surface, and the flux is zero.`,
        },
        {
          figure: 'Flux through a tilted area',
          style: 'sandbox',
          say: `Here's a twenty centimeter square, seen edge-on, in a uniform field of a thousand newtons per coulomb. Face-on, the flux is forty. Drag the tilt to sixty degrees, and the flux halves to twenty, because the cosine of sixty is one half. Only the lines that actually pierce the square count.`,
        },
      ],
    },
    {
      voice: 'Charon',
      blocks: [
        {
          at: 'Now wrap a surface all the way around',
          say: `Now wrap a surface all the way around something: a closed surface, like a balloon. By convention, flux leaving counts as positive, and flux entering counts as negative. And Gauss's law says the net flux out depends on just one thing.`,
        },
        {
          at: 'net flux out through the closed surface',
          say: `The net flux out of ANY closed surface equals the charge enclosed, divided by epsilon naught. The shape and size of the surface don't matter. Charges outside contribute zero net flux, because their lines go in and come back out. <short pause> Epsilon naught is the permittivity of free space, about eight point eight five times ten to the minus twelve.`,
        },
        {
          at: 'In line language: every line',
          say: `In the language of lines: every line that starts inside has to cross out. Every line that ends inside has to cross in. And a line that just passes through crosses in once and out once. So lines out, minus lines in, counts the charge inside.`,
        },
        {
          figure: 'Sandbox: a Gaussian surface',
          style: 'sandbox',
          say: `Test it here. Drag the blue surface, or the charges. Green dots are lines leaving, and red rings are lines entering. Try pulling a charge just outside the surface, and watch the net count stay put, <short pause> even though the field on the surface changes.`,
        },
        {
          at: 'Field lines are only created and destroyed by charge',
          say: `That's what Gauss's law is really saying. Field lines are only created and destroyed by charge. So the flux out of a closed surface measures the charge inside, and nothing else. Outside charges change the field ON the surface, but not the net flux through it.`,
        },
      ],
    },
    {
      voice: 'Achird',
      blocks: [
        {
          at: ['Using symmetry to find E', 'is always true, but it only'],
          say: `Gauss's law is always true. But it only hands you the field when the charge is so symmetric that you can pick a surface where E has the same size everywhere, and points straight through it. Then the flux is just E times the area, and you solve for E. There are exactly three such shapes, and they give the three scaling laws from the last chapter.`,
        },
        {
          figure: 'Three symmetries, three laws',
          style: 'figure',
          say: `Switch between them. Around a point or a ball, the surface is a sphere, whose area grows as r squared, so the field falls as one over r squared. Around a line, it's a cylinder, whose side grows as r, so the field falls as one over r. And for a flat sheet, it's a little pillbox, whose ends don't grow at all. <short pause> So the field is constant.`,
        },
        {
          at: 'The sphere result has a bonus',
          say: `The sphere result has a bonus. Outside ANY spherically symmetric charge, a charged ball, a planet, a shell, the field is exactly that of a point charge at the center. Newton needed calculus to prove this for gravity; Gauss makes it one line. And inside a uniform shell, the enclosed charge is zero, so the field is zero.`,
        },
      ],
    },
    {
      voice: 'Charon',
      style: 'figure',
      blocks: [
        {
          at: ['Conductors', 'has electrons that are free to move'],
          style: 'tutor',
          say: `Now, conductors. A conductor, any metal, has electrons that are free to move. If there's any field inside, they move. So once everything settles, in electrostatic equilibrium, the field inside the metal must be zero. Let's watch a ball get there.`,
        },
        {
          figure: 'A conductor cancels the field inside',
          step: 0,
          say: `A neutral metal ball is dropped into a uniform field. For the first instant, the field lines go straight through it. Its free electrons, the blue dots, feel a force opposite to the field: to the left.`,
        },
        {
          figure: 'A conductor cancels the field inside',
          step: 1,
          say: `Electrons pile up on the left surface, and leave uncovered positive ions on the right. That separated charge makes its own field inside the metal, pointing left, which cancels part of the applied field. The inside field drops to sixty percent.`,
        },
        {
          figure: 'A conductor cancels the field inside',
          step: 2,
          say: `More charge separates. The inside field drops to twenty percent, and the push on the remaining electrons gets weaker. The field lines now bend toward the ball, and land on its charges.`,
        },
        {
          figure: 'A conductor cancels the field inside',
          step: 3,
          say: `Equilibrium: the field inside is ZERO. With no field, there's no force on the free electrons, so they stop moving. This takes far less than a microsecond. And the ball is still neutral overall; the charge has only moved to the surface.`,
        },
        {
          figure: 'A conductor cancels the field inside',
          step: 4,
          say: `Just outside, the field is perpendicular to the surface. Any sideways part would push surface charge along the metal, so in equilibrium there isn't one. The lines end on the negative charges on the left, and start again from the positive charges on the right.`,
        },
        {
          figure: 'A conductor cancels the field inside',
          step: 5,
          say: `Now hollow it out. The empty cavity has zero field too, whatever the field outside does. <short pause> That's a Faraday cage: a car in a lightning storm, the metal mesh in a microwave door, a shielded cable.`,
        },
        {
          at: 'finishes the argument',
          style: 'tutor',
          say: `Gauss's law finishes the argument. Draw a Gaussian surface just inside the metal. The field is zero everywhere on it, so the flux is zero, so the enclosed charge is zero. Any excess charge on a conductor sits on its outer surface. <short pause> So, four conductor facts to remember. The field is zero inside. Excess charge sits on the surface. The field just outside is perpendicular to the surface, with size sigma over epsilon naught. And a closed metal shell shields its inside.`,
        },
      ],
    },
    {
      voice: 'Achird',
      style: 'warn',
      blocks: [
        {
          at: 'Classic mistakes',
          say: `Three classic mistakes. One: thinking zero flux means zero field. A closed surface with no charge inside can have strong field all over it; it just has as much going in as coming out. Two: using Gauss to find the field where there's no symmetry. The law is still true, but E isn't the same over the surface, so you can't pull it out of the sum. <short pause> And three: measuring theta from the surface, instead of from its normal.`,
        },
        {
          sel: '.quiz',
          style: 'tutor',
          say: `That's Gauss's law. Try the checkpoint below, then on to electric potential.`,
        },
      ],
    },
  ],
};
