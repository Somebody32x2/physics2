/** Narration for "Charge & Coulomb's law" (src/lessons/charge.js). Format: see overview.js. */
export default {
  sections: [
    {
      voice: 'Charon',
      blocks: [
        {
          at: 'Physics I was about forces in general',
          say: `Physics One was about forces in general. Physics Two is about one force, the electromagnetic one, and everything it builds: fields, circuits, magnets, light. <short pause> And it all starts with charge.`,
        },
        {
          at: 'Charge comes in two kinds',
          say: `Charge comes in two kinds, called positive and negative. Like charges repel; unlike charges attract. <short pause> Charge is CONSERVED: you can move it around, but you can never create net charge. And it's QUANTIZED: every charge is a whole-number multiple of the elementary charge, e, which is one point six times ten to the minus nineteen coulombs. A proton carries plus e, and an electron, minus e. Ordinary objects are neutral, so "charging" something just means moving a few electrons on or off it.`,
        },
        {
          at: ['The force between two point charges', 'The force grows with each charge'],
          say: `The force between two point charges is Coulomb's law, and it looks just like Newton's gravity, with charge in place of mass. F equals k, times the size of q one, times the size of q two, <short pause> all over r squared. So the force grows with each charge, and falls off with the SQUARE of the distance between them. It acts along the line joining the charges: repulsive for like signs, attractive for unlike. The constant k is about nine times ten to the nine, and it's really just there to make the units work.`,
        },
      ],
    },
    {
      voice: 'Achird',
      style: 'figure',
      blocks: [
        {
          figure: 'How the force scales',
          step: 0,
          say: `Let's see how that force scales. Here are two equal positive charges, a distance r naught apart. Call the force on each one F naught. Like charges repel, so each arrow points away from the other charge.`,
        },
        {
          figure: 'How the force scales',
          step: 1,
          say: `Double the distance, and the force drops to a QUARTER of F naught, not a half. Distance is squared in the denominator, so twice as far means two squared, four times weaker.`,
        },
        {
          figure: 'How the force scales',
          step: 2,
          say: `Back to r naught, and the force returns to F naught.`,
        },
        {
          figure: 'How the force scales',
          step: 3,
          say: `Now triple the left charge. The force on BOTH charges triples, to three F naught. Notice the arrows stay equal: Newton's third law holds, even though one charge is bigger.`,
        },
        {
          figure: 'How the force scales',
          step: 4,
          say: `Halve the distance as well. That's three, times two squared: twelve F naught. The factors just multiply.`,
        },
        {
          figure: 'How the force scales',
          step: 5,
          say: `Finally, make the right charge negative. Same size force, but now it's attractive, so each arrow points toward the other charge.`,
        },
        {
          at: 'The habit to build',
          style: 'tutor',
          say: `Here's the habit to build. Most Coulomb questions are really ratio questions. Ask what got multiplied. Each charge factor multiplies F. And a distance factor n divides F by n squared. <short pause> And the force on each of the two charges is always the same size.`,
        },
      ],
    },
    {
      voice: 'Charon',
      blocks: [
        {
          at: 'With more than two charges',
          say: `With more than two charges, each pair interacts as if the others weren't there. The net force on a charge is the VECTOR sum of all those pairwise forces. This is called superposition, and it's the reason almost every problem in the first third of this course comes down to adding arrows.`,
        },
        {
          figure: 'Sandbox: superposition',
          style: 'sandbox',
          say: `Try it here. Drag the three charges around. The solid arrows are the net force on each charge, and the dashed arrows are the pieces from each of the other charges. <short pause> Here's a challenge: can you place them so that one charge feels no net force at all?`,
        },
        {
          at: 'Classic mistake',
          style: 'warn',
          say: `A classic mistake: adding force MAGNITUDES instead of vectors. Two equal pulls in opposite directions add up to zero, not to twice the pull. So draw the arrows first, then add the components.`,
        },
        {
          sel: '.quiz',
          say: `That's the chapter. Try the checkpoint below to lock it in.`,
        },
      ],
    },
  ],
};
