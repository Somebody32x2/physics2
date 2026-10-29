/** Narration for "DC circuits" (src/lessons/dc-circuits.js). Format: see overview.js; guide: tts/WRITING.md. */
export default {
  sections: [
    {
      voice: 'Charon',
      blocks: [
        {
          at: 'A circuit is a network of batteries and resistors',
          say: `A circuit is a network of batteries and resistors, joined by wires. Solving it means finding the current in every branch, and the voltage across every element. Two arrangements cover most simple circuits. In SERIES, elements sit one after another on a single path: the same current flows through each, and their voltages add up. In PARALLEL, elements connect across the same two points: they share the same voltage, and their currents add up.`,
        },
        {
          at: 'the single resistor that draws the same current',
          say: `So in series, resistances simply add. Series makes the path longer, so the total is bigger than any one piece. In parallel, it's the reciprocals that add: one over R equals one over R one, plus one over R two. Parallel adds lanes, so the total is smaller than the SMALLEST branch. <short pause> Two equal resistors in parallel give half of one.`,
        },
        {
          at: 'Light bulbs make this visible',
          say: `Light bulbs make all this visible. Treat each bulb as a resistor; its brightness is the power it dissipates, I squared R, or V squared over R. With identical bulbs, brightness ranks the same as the current through each one. The battery here is ideal: twelve volts, no matter what you connect.`,
        },
      ],
    },
    {
      voice: 'Achird',
      blocks: [
        {
          figure: 'Bulbs on a 12 V battery',
          style: 'sandbox',
          say: `These are identical twelve ohm bulbs. The glow, and the number under each bulb, is its power, and the teal dots move at a speed proportional to the current. Switch between one bulb, series, and parallel, and compare the brightness. In the last circuit, click the switch to open and close bulb C's branch, and watch what happens to A and B.`,
        },
        {
          at: 'Adding a second bulb in',
          style: 'tutor',
          say: `Adding a second bulb in series doubles the resistance and halves the current, so each bulb gets a QUARTER of the power: three watts instead of twelve. Adding it in parallel leaves the first bulb exactly as bright, because it still has the full twelve volts across it. The battery just supplies twice the current, two amps, and twice the power. <short pause> That's how the outlets in your house are wired.`,
        },
        {
          at: 'Series shares current, parallel shares voltage',
          style: 'tutor',
          say: `So: series shares current, parallel shares voltage. Elements on one path carry the same current, and split the voltage. Elements across the same two points have the same voltage, and split the current. Every reduction step starts by deciding which one you're looking at. Only then do you add R, or one over R.`,
        },
      ],
    },
    {
      voice: 'Charon',
      style: 'figure',
      blocks: [
        {
          at: 'With those rules, many networks collapse',
          style: 'tutor',
          say: `With those rules, many networks collapse to a single resistor. Find a pair that's cleanly in series or in parallel, replace it, and repeat. Then work back out to get each branch.`,
        },
        {
          figure: 'Reducing a network',
          step: 0,
          say: `Here's a network with four resistors on an eighteen volt battery. To find the battery current, we'll replace pieces with single equivalent resistors, one safe step at a time.`,
        },
        {
          figure: 'Reducing a network',
          step: 1,
          say: `R two and R three are in series: one path, with nothing branching off between them, so they carry the same current. Resistances add: four plus eight, twelve ohms.`,
        },
        {
          figure: 'Reducing a network',
          step: 2,
          say: `That twelve ohms and R four are in parallel: both connect the same two points, so they share the same voltage. Reciprocals add, and twelve in parallel with twelve gives six ohms. <short pause> Smaller than either: a second path makes it easier for current.`,
        },
        {
          figure: 'Reducing a network',
          step: 3,
          say: `Now R one and that six ohms are in series: three plus six, nine ohms.`,
        },
        {
          figure: 'Reducing a network',
          step: 4,
          say: `One resistor left. The current out of the battery is the emf over the total: eighteen over nine, two amps.`,
        },
        {
          figure: 'Reducing a network',
          step: 5,
          say: `Now unfold it. R one carries the two amps, so it drops six volts, leaving twelve volts across the parallel part. R four gets twelve over twelve, one amp. The R two and R three path gets the other amp, and splits its twelve volts into four and eight. <short pause> Check the junction: one plus one is two amps. It works.`,
        },
      ],
    },
    {
      voice: 'Achird',
      style: 'figure',
      blocks: [
        {
          at: 'Some circuits do not reduce',
          style: 'tutor',
          say: `Some circuits don't reduce, typically when there's more than one battery. Then you use the two rules that ALWAYS work: Kirchhoff's rules. They aren't new physics; they're just two conservation laws, written for circuits.`,
        },
        {
          at: 'crossing a resistor against its current',
          style: 'tutor',
          say: `The junction rule: charge doesn't pile up at a junction, so the current in equals the current out. The loop rule: walking around any closed loop, the rises and drops in potential add up to zero. Crossing a battery from minus to plus counts as plus the emf. Crossing a resistor along its current counts as minus I R, and against its current, plus I R.`,
        },
        {
          figure: 'Two loops, two rules',
          step: 0,
          say: `Here are two batteries and three branches. No pair of resistors is in series or in parallel, so reduction fails. Step one: give each branch a current, and GUESS its direction. A wrong guess is harmless; it just comes out negative.`,
        },
        {
          figure: 'Two loops, two rules',
          step: 1,
          say: `The junction rule. At the top junction, I one and I two arrive, and I three leaves. So I one plus I two equals I three.`,
        },
        {
          figure: 'Two loops, two rules',
          step: 2,
          say: `Now the loop rule, on the left loop, walking clockwise. Up through the twelve volt battery is plus twelve. Through R one, along I one, is minus two I one. Down R three, along I three, is minus three I three. And the sum is zero.`,
        },
        {
          figure: 'Two loops, two rules',
          step: 3,
          say: `The right loop, walking counterclockwise so we again go with the guessed currents: plus three, minus three I two, minus three I three, equals zero. That's three equations, for three unknowns.`,
        },
        {
          figure: 'Two loops, two rules',
          step: 4,
          say: `Solve them: I one is three amps, I two is minus one amp, and I three is two amps. Check: three plus minus one is two. The dots move at a speed proportional to each current.`,
        },
        {
          figure: 'Two loops, two rules',
          step: 5,
          say: `I two came out NEGATIVE, so it really flows the other way, down through the three volt battery from plus to minus. <short pause> The twelve volt battery is charging the three volt one, which absorbs three watts.`,
        },
      ],
    },
    {
      voice: 'Charon',
      style: 'warn',
      blocks: [
        {
          at: 'Classic mistakes',
          say: `A few classic mistakes. Sign errors in the loop rule: the sign of an I R term depends on whether you walk WITH or AGAINST the current you labeled, not on the direction of the loop. When a current comes out negative, don't re-solve: the size is right, it just flows the other way. <short pause> And meters: an ammeter goes in series, so the current passes through it, and a voltmeter goes in parallel, across the element.`,
        },
        {
          sel: '.quiz',
          style: 'tutor',
          say: `That's D C circuits. Try the checkpoint below, then on to R C circuits.`,
        },
      ],
    },
  ],
};
