/** Narration for "Current & resistance" (src/lessons/current.js). Format: see overview.js; guide: tts/WRITING.md. */
export default {
  sections: [
    {
      voice: 'Charon',
      blocks: [
        {
          at: 'So far the charges sat still',
          say: `So far, the charges sat still. Connect a battery across a wire, and they move. The battery sets up an electric field inside the conductor, and the free electrons respond. That flow of charge is CURRENT: the amount of charge passing a point, per second.`,
        },
        {
          at: 'Two conventions trip people up here',
          say: `Two conventions trip people up here. First, current direction is defined as the way POSITIVE charge would move: out of the battery's plus terminal, around the circuit, and into its minus terminal. In a metal, the moving charges are electrons, so they actually go the other way. Circuit analysis doesn't care; just never mix the two in one problem. <short pause> Second, the electrons move absurdly slowly, typically well under a millimeter per second. The light still comes on instantly, because the field travels through the wire at nearly light speed, and starts every electron in the circuit moving at once.`,
        },
        {
          at: 'current, in the direction + charge would move',
          say: `In symbols: I equals d Q by d t, the rate at which charge flows past a point. It's the same idea as gallons per minute in a pipe. One amp is one coulomb every second: about six times ten to the eighteen electrons.`,
        },
      ],
    },
    {
      voice: 'Achird',
      blocks: [
        {
          figure: 'Inside a copper wire',
          style: 'sandbox',
          say: `Here's the inside of a copper wire. Blue dots are free electrons, and grey rings are the fixed copper ions. The electrons jiggle fast in random directions, and drift slowly to the left. With a tenth of a volt across a meter and a half of wire, about six amps flow, but the drift speed is only about three tenths of a millimeter per second. An electron would take well over an hour to cross the wire! Try widening it: the current grows, but the drift speed doesn't. There are just more lanes.`,
        },
        {
          at: 'Why do the electrons drift instead of accelerating',
          say: `So why do the electrons drift, instead of accelerating forever? They keep colliding with the vibrating ions of the metal, which turns their kinetic energy into heat. The net effect is a steady drift speed proportional to the field, and a current proportional to the voltage. The ratio is the resistance.`,
        },
        {
          at: 'resistivity of the material',
          say: `That's Ohm's law: V equals I times R. The voltage across a resistor equals the current times the resistance. And for a plain wire, R equals rho L over A, just as you'd guess for water in a pipe: longer is harder, wider is easier. Rho, the resistivity, is set by the material: about one point seven times ten to the minus eight ohm meters for copper.`,
        },
        {
          figure: 'Ohm’s law: current vs voltage',
          style: 'figure',
          say: `On this graph of current against voltage, an ohmic resistor gives a straight line, with slope one over R. So the ten ohm line is twice as steep as the twenty ohm line. <short pause> A light bulb filament is NOT ohmic. It heats up as the current grows, its resistance rises, and its curve bends over.`,
        },
      ],
    },
    {
      voice: 'Charon',
      blocks: [
        {
          at: 'Resistors turn electrical energy into heat',
          say: `Resistors turn electrical energy into heat, or light, in a bulb. Each coulomb that drops through a potential difference V gives up V joules, and I coulombs pass every second. So the power is I times V.`,
        },
        {
          at: 'rate of energy conversion',
          say: `Using Ohm's law, you can write that three ways: I V, I squared R, or V squared over R. Use the version whose inputs you know. At the same current, a bigger resistor gets more power. At the same voltage, a SMALLER resistor gets more power. <short pause> That's why a hundred watt bulb has less resistance than a sixty watt one.`,
        },
        {
          at: 'is the energy per coulomb it gives to charge',
          say: `A battery's job is the opposite of a resistor's. Its emf, short for the old name "electromotive force", is really a voltage, not a force. It's the energy per coulomb the battery gives to charge pushed from its minus terminal to its plus terminal. Think of it as a pump lifting water up a hill, with resistors as the paddle wheels the water turns on the way back down. Real batteries also have a small internal resistance, so under load, the voltage at their terminals is a bit less than the emf.`,
        },
      ],
    },
    {
      voice: 'Achird',
      style: 'figure',
      blocks: [
        {
          figure: 'Potential around a loop',
          step: 0,
          say: `Let's walk a test charge once around a loop: a twelve volt battery, with a four ohm and a two ohm resistor. Start at point a, the battery's minus terminal, and call its potential zero volts.`,
        },
        {
          figure: 'Potential around a loop',
          step: 1,
          say: `Through the battery, from minus to plus, the potential RISES by the emf: twelve volts. The battery is the pump. It uses chemical energy to lift charge to a higher potential.`,
        },
        {
          figure: 'Potential around a loop',
          step: 2,
          say: `The wire is flat, because ideal wires have no resistance. Then, across the first resistor, the potential drops by I times R one: two amps times four ohms, eight volts. The charge gives up that energy as heat.`,
        },
        {
          figure: 'Potential around a loop',
          step: 3,
          say: `Across the second resistor, it drops another four volts, all the way down to zero.`,
        },
        {
          figure: 'Potential around a loop',
          step: 4,
          say: `Back at a: plus twelve, minus eight, minus four, equals ZERO. Every rise is paid back by drops. <short pause> And that's what fixes the current: the emf divided by the total resistance, twelve over six, two amps.`,
        },
        {
          at: 'The water picture',
          style: 'tutor',
          say: `So here's the water picture. Voltage is height, current is flow rate, and resistance is how narrow the pipe is. The battery lifts charge up by the emf, every resistor lets it fall, and the total fall around any loop equals the lift. And current isn't "used up" in a resistor: the same current comes out as went in. What gets used up is potential energy.`,
        },
        {
          at: 'Classic mistake',
          style: 'warn',
          say: `A classic mistake: thinking a battery supplies a fixed CURRENT. A battery supplies a nearly fixed voltage, and the current depends on what you connect. Short it with a wire, and the current is huge. Connect a big resistor, and it's tiny.`,
        },
        {
          sel: '.quiz',
          style: 'tutor',
          say: `That's current and resistance. Try the checkpoint below, then on to D C circuits.`,
        },
      ],
    },
  ],
};
