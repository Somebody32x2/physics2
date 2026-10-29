/** Narration for "RC circuits" (src/lessons/rc.js). Format: see overview.js; guide: tts/WRITING.md. */
export default {
  sections: [
    {
      voice: 'Achird',
      blocks: [
        {
          at: 'Put a capacitor in a circuit and things start to take',
          say: `Put a capacitor in a circuit, and things start to take TIME. A resistor alone reacts instantly: the current is V over R the moment you connect it. But a capacitor in series with a resistor fills up gradually. At first it's empty and offers no opposition, so current rushes in at the emf over R. As charge builds up, the capacitor's own voltage, q over C, pushes back against the battery. The voltage left for the resistor shrinks, and so does the current. <short pause> The closer it gets to full, the slower it fills.`,
        },
        {
          at: 'is the signature of an exponential',
          say: `That "rate proportional to what's left" is the signature of an exponential: the same shape as radioactive decay later in the course, or Newton's law of cooling. In calculus terms, the loop rule becomes a differential equation, whose solution is the exponential below. You don't need to solve it. You need to read its shape.`,
        },
        {
          at: 'time constant (tau)',
          say: `One number sets how fast an R C circuit responds: the time constant, tau, which equals R times C. A bigger R means a smaller current to fill with. A bigger C means more charge to deliver. Either one slows it down, in proportion.`,
        },
      ],
    },
    {
      voice: 'Charon',
      blocks: [
        {
          at: 'final charge, when',
          say: `Charging from empty: the charge is C times the emf, times one minus e to the minus t over tau. It climbs toward its final value, C times the emf, when the capacitor's voltage equals the battery's. The current is the emf over R, times e to the minus t over tau: it decays from its starting value toward zero. Both run on the same clock, tau. <short pause> The factor e to the minus t over tau is the fraction still to go: thirty-seven percent after one tau, and under one percent after five.`,
        },
        {
          at: 'charge at the moment the discharge starts',
          say: `Discharging, with the battery removed, the capacitor plays the battery, and pushes current backward through the resistor. The charge is Q naught times e to the minus t over tau, and the charge, the voltage, and the current all shrink by the same factor every tau.`,
        },
        {
          figure: 'Charging and discharging, live',
          style: 'sandbox',
          say: `Watch it happen live. With four kilohms and five hundred microfarads, tau is two seconds, marked by the dashed line. The teal dots show the current, fast at first, then slowing down. Try doubling R, then doubling C instead. <short pause> Same effect on tau. And drag "Scrub time" to freeze any instant.`,
        },
      ],
    },
    {
      voice: 'Achird',
      style: 'figure',
      blocks: [
        {
          at: 'Two shortcuts that answer most questions',
          style: 'tutor',
          say: `Here are two shortcuts that answer most questions. Right after a switch moves, a capacitor's VOLTAGE can't jump, because its charge needs time to change. So an empty capacitor acts like a wire. Long afterward, nothing changes anymore, so no current flows into it: it acts like a BREAK. Use those to find the currents at the start and at the end, without any exponentials.`,
        },
        {
          figure: 'Counting time constants',
          step: 0,
          say: `Now let's count time constants. At time zero the capacitor is empty, so its voltage is zero, and the whole emf sits across the resistor. The current starts at its maximum, the emf over R. An uncharged capacitor acts like a plain wire.`,
        },
        {
          figure: 'Counting time constants',
          step: 1,
          say: `After one time constant, the charge has reached sixty-three percent of its final value, and the current has fallen to thirty-seven percent. The two always add up to a hundred percent, because the resistor's and the capacitor's voltages add up to the emf.`,
        },
        {
          figure: 'Counting time constants',
          step: 2,
          say: `After two tau: eighty-six percent. Each tau closes the same fraction, sixty-three percent, of whatever gap is left. So progress slows down.`,
        },
        {
          figure: 'Counting time constants',
          step: 3,
          say: `After three tau: ninety-five percent, with the current down to five percent.`,
        },
        {
          figure: 'Counting time constants',
          step: 4,
          say: `And after five tau: over ninety-nine percent, which counts as full. Now the capacitor's voltage equals the emf, and no current flows. <short pause> A charged capacitor acts like a break in the circuit.`,
        },
      ],
    },
    {
      voice: 'Charon',
      blocks: [
        {
          at: 'Where it shows up: camera flashes',
          say: `Where does this show up? Camera flashes and defibrillators, which charge slowly from a battery and dump fast through a small resistance. The delay in windshield wipers and blinking lights. And every digital circuit, where the R C time of tiny wires and transistor gates limits how fast a chip can switch. In the inductance chapter, you'll meet the R L circuit, which has the same exponential, with tau equal to L over R.`,
        },
        {
          at: 'Classic mistakes',
          style: 'warn',
          say: `Two classic mistakes. Reading tau as "the time to fully charge". After one tau, it's only sixty-three percent charged; full takes about FIVE tau. And unit slips: kilohms times microfarads gives MILLIseconds, not seconds.`,
        },
        {
          sel: '.quiz',
          say: `That's R C circuits, and the end of the circuits part. Try the checkpoint below, then on to magnetism.`,
        },
      ],
    },
  ],
};
