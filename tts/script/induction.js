/** Narration for "Induction" (src/lessons/induction.js). Format: see overview.js; guide: tts/WRITING.md (no pause tags). */
export default {
  sections: [
    {
      voice: 'Achird',
      blocks: [
        {
          at: 'In 1831 Faraday found the reverse',
          say: `So far, currents made magnetic fields. In eighteen thirty-one, Faraday found the reverse: a CHANGING magnetic field makes a current. Move a magnet near a coil of wire, and a current flows, with no battery anywhere. This is electromagnetic induction, and it's how nearly all electric power is generated.`,
        },
        {
          at: 'The quantity that matters is the',
          say: `The quantity that matters is the magnetic flux through a loop: how much field passes through the area it encloses. It's the same idea as electric flux in Gauss's law, but now through a surface bounded by a wire.`,
        },
        {
          at: 'area enclosed by the loop',
          say: `Magnetic flux equals B, times A, times the cosine of theta, where theta is the angle between B and the loop's normal. It's largest when the loop faces the field, and zero when the loop is edge-on. Flux is measured in webers: tesla square meters.`,
        },
        {
          at: 'number of turns in the coil',
          say: `And Faraday's law: the induced emf equals minus N, times the rate of change of the flux. So the emf depends on how FAST the flux changes, times the number of turns. A huge steady flux induces nothing. A small flux that changes quickly induces a lot. Change B, change the area, or change the angle: any of the three works.`,
        },
        {
          at: 'The minus sign is',
          say: `The minus sign is Lenz's law. The induced current flows in the direction whose own magnetic field OPPOSES the change in flux. Flux increasing? The induced field points against it. Flux decreasing? The induced field points along it, trying to keep it up. It's energy conservation in disguise. If the induced current helped the change, a tiny nudge would run away into free energy.`,
        },
      ],
    },
    {
      voice: 'Charon',
      blocks: [
        {
          figure: 'A magnet, a coil, and a meter',
          style: 'sandbox',
          say: `Watch a magnet go into a coil, wait, come out, and wait. On the right, the purple curve is the flux through the coil, and the teal curve is the induced emf. The emf only appears while the magnet MOVES. And while it moves, the coil becomes a magnet itself: its near face repels the incoming magnet, and attracts the outgoing one. That's Lenz's law, and it's why you have to do work to generate the current. Try the faster speed, and flip the magnet around.`,
        },
        {
          at: 'Change is what counts',
          style: 'tutor',
          say: `The lesson: change is what counts. The emf comes from the rate of change of flux. A magnet sitting still inside a coil, however strong, induces nothing. Move it twice as fast, and the emf doubles, for half as long. And the induced current always opposes the change that caused it.`,
        },
      ],
    },
    {
      voice: 'Achird',
      blocks: [
        {
          at: 'The flux can also change because the',
          say: `The flux can also change because the AREA changes. Slide a metal bar along two rails in a field, and the circuit's area grows by L times v every second, so the flux grows by B L v every second. Or, equivalently: the charges in the moving bar feel q v cross B, last chapter's force, and get pushed along the bar. Both views give the same answer.`,
        },
        {
          at: 'length of the moving bar',
          say: `That's motional emf: the emf equals B L v. A conductor of length L, moving at speed v across a field B, has an emf B L v between its ends. Double the speed, double the emf. And the current it drives feels a force that opposes the motion, so you have to keep pushing.`,
        },
        {
          figure: 'Sandbox: a bar sliding on rails',
          style: 'sandbox',
          say: `Here the rails are fifty centimeters apart, closed by a two ohm resistor. At two meters per second in six tenths of a tesla, the emf is six tenths of a volt, driving three tenths of an amp. The field drags back on the bar with about nine hundredths of a newton. Your push supplies exactly the power the resistor turns into heat. Now set v negative... and everything reverses.`,
        },
      ],
    },
    {
      voice: 'Charon',
      style: 'figure',
      blocks: [
        {
          at: 'The third way to change flux',
          style: 'tutor',
          say: `The third way to change flux is to change the ANGLE. Spin a coil in a steady field, and the cosine swings between plus one and minus one, so the flux oscillates, and so does the emf. That's a generator: a motor run backwards. Turn the shaft with steam, water, or wind, and alternating current comes out.`,
        },
        {
          figure: 'Generator: flux and emf as the loop turns',
          step: 0,
          say: `Here's the loop, seen end-on. It faces the field, so the flux is at its maximum. Yet the emf is zero! The two sides are moving along the field lines, not across them.`,
        },
        {
          figure: 'Generator: flux and emf as the loop turns',
          step: 1,
          say: `Turned forty-five degrees, the flux is down to about seventy-one percent of its maximum, and falling. The sides now cut across the field at an angle, so the emf is about seventy-one percent of its peak.`,
        },
        {
          figure: 'Generator: flux and emf as the loop turns',
          step: 2,
          say: `Edge-on to the field: no flux at all. But this is where the flux is changing FASTEST, and the sides cut straight across the field. The emf peaks: about seventy-five volts, for a hundred turns of a ten centimeter coil in two tenths of a tesla, at sixty hertz.`,
        },
        {
          figure: 'Generator: flux and emf as the loop turns',
          step: 3,
          say: `Half a turn. The flux is at its maximum again, but negative, since the field now enters the other face. For a moment it isn't changing, so the emf is zero.`,
        },
        {
          figure: 'Generator: flux and emf as the loop turns',
          step: 4,
          say: `Edge-on the other way, the emf peaks again, with the opposite sign. The current in the loop has reversed. That's alternating current: it reverses twice every turn.`,
        },
        {
          figure: 'Generator: flux and emf as the loop turns',
          step: 5,
          say: `Spinning steadily, the flux follows a cosine, and the emf follows a sine, a quarter cycle behind. Every peak of one lines up with a zero of the other. Every power plant generator works like this; at sixty hertz, the loop turns sixty times a second.`,
        },
        {
          at: 'The classic trap',
          style: 'warn',
          say: `Which brings us to the classic trap. Maximum flux does NOT mean maximum emf. In the generator, the emf is largest when the flux is zero, because that's when it's changing fastest. And it's zero when the flux is at its peak. The same trap shows up on graphs: the emf is the SLOPE of the flux curve, not its height.`,
        },
      ],
    },
    {
      voice: 'Achird',
      blocks: [
        {
          at: 'Two more applications',
          say: `Two more applications. A transformer is two coils wound on one iron core. Alternating current in the primary coil makes a changing flux, and that same flux passes through every turn of the secondary. So each coil's voltage is proportional to its number of turns. A five hundred turn primary on a hundred twenty volts, with a fifty turn secondary, gives twelve volts, and ten times the current, so power in equals power out. That's why the grid runs on A C. And it's why transformers don't work on steady D C: steady current means unchanging flux.`,
        },
        {
          at: 'are induced currents swirling',
          say: `Eddy currents are induced currents swirling inside solid chunks of metal. By Lenz's law they oppose the motion that creates them. So a magnet falls slowly through a copper pipe, and trains use them as brakes. In transformers they waste energy as heat, which is why transformer cores are made of thin, insulated sheets.`,
        },
        {
          sel: '.quiz',
          say: `That's induction. Try the checkpoint below, then on to inductance and oscillations.`,
        },
      ],
    },
  ],
};
