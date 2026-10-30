/** Narration for "Where magnetic fields come from" (src/lessons/magnetic-sources.js). Format: see overview.js; guide: tts/WRITING.md. */
export default {
  sections: [
    {
      voice: 'Achird',
      blocks: [
        {
          at: 'The last chapter took B as given',
          say: `The last chapter took B as given. Here's where it comes from: MOVING charges. Every current makes a magnetic field, and almost every magnetic field in this course is made by currents. Even in a permanent magnet, the "currents" are electrons spinning and orbiting inside the atoms, all lined up. The one exception, a changing electric field, comes up in the electromagnetic waves chapter.`,
        },
        {
          at: 'So moving charges both',
          say: `So moving charges both make magnetic fields and feel them, the same way static charges make and feel electric fields. The simplest source is a long straight wire, and its field lines are CIRCLES around the wire. For the direction, grip the wire with your right hand, thumb along the current. Your fingers curl the way B goes. That's the right-hand grip rule.`,
        },
        {
          at: 'perpendicular distance from the wire',
          say: `The field strength is mu naught I, over two pi r. It's proportional to the current, and falls off as one over r: twice as far, half the field. That's slower than a point charge's one over r squared, because a wire is spread out. Mu naught is the magnetic constant, four pi times ten to the minus seven.`,
        },
        {
          at: 'For a sense of scale',
          say: `For a sense of scale: ten amps, two centimeters away, makes about a hundred microtesla. That's about twice Earth's field, enough to swing a compass held right next to a single wire. A power cord barely affects a compass, because its two conductors carry equal and opposite currents. <short pause> It's also why real electromagnets use many turns of wire.`,
        },
      ],
    },
    {
      voice: 'Charon',
      blocks: [
        {
          figure: 'Sandbox: wires through the page',
          style: 'sandbox',
          say: `Play with some wires running through the page. Drag a wire to move it, and click one to reverse its current. The purple lines are field lines, crowding where the field is strong, and the compass needles point along B. Try two wires with opposite currents, then the same current, and compare the patterns between them.`,
        },
        {
          at: 'Currents make B, and B lines never end',
          say: `Notice something about those lines. Electric field lines start on plus charges and end on minus charges. Magnetic field lines have NO ends. They always close on themselves, because there are no magnetic "charges", no monopoles. <short pause> Cut a bar magnet in half, and you just get two smaller magnets, each with a north and a south.`,
        },
      ],
    },
    {
      voice: 'Achird',
      style: 'figure',
      blocks: [
        {
          at: 'chop the wire into tiny pieces',
          style: 'tutor',
          say: `For any other shape of wire, the rule is the Biot-Savart law. Chop the wire into tiny pieces. Each piece of current makes a little field, and you add up the contributions from every piece: the magnetic version of superposition. For a circular loop, it gives mu naught I over two R at the center. The next figure computes its field lines exactly that way.`,
        },
        {
          figure: 'From one loop to a solenoid',
          step: 0,
          say: `Here's one loop of wire, seen edge-on. Current comes out of the page at the top, and goes in at the bottom. Near each crossing, the field circles the wire. Through the middle of the loop, all those circles point the same way: to the right. And far away, the pattern is a dipole, the same shape as a bar magnet's.`,
        },
        {
          figure: 'From one loop to a solenoid',
          step: 1,
          say: `Two loops with the same current. Their fields add up inside, where they point the same way, and partly cancel in the gap outside.`,
        },
        {
          figure: 'From one loop to a solenoid',
          step: 2,
          say: `Four loops. The field inside is getting straighter and more even. The lines now enter at the left end and leave at the right, like a stubby magnet.`,
        },
        {
          figure: 'From one loop to a solenoid',
          step: 3,
          say: `Eight closely spaced loops make a solenoid. Inside, the lines are nearly parallel and evenly spaced: a UNIFORM field. Outside, the same lines spread over a huge area, so the field there is weak.`,
        },
        {
          figure: 'From one loop to a solenoid',
          step: 4,
          say: `A long, tightly wound solenoid behaves like a bar magnet: lines come out of one end, north, and go back in at the other, south. But unlike a magnet, you can switch it off, reverse it, and set its strength with the current. <short pause> That's an electromagnet. And every line is a closed loop.`,
        },
        {
          at: 'turns per meter of length',
          style: 'tutor',
          say: `Inside a long solenoid, B equals mu naught n I. The field is uniform, the same everywhere inside, and it depends only on the current and n, the number of turns per METER. Not the total number of turns. Outside, the field is nearly zero.`,
        },
      ],
    },
    {
      voice: 'Charon',
      blocks: [
        {
          at: 'plays the role for B that',
          say: `For the wire and the solenoid there's a shortcut. Ampere's law plays the role for B that Gauss's law played for E. Draw any closed loop, and walk around it, adding up the part of B along your path. The total equals mu naught, times the current poking through the loop.`,
        },
        {
          at: 'net current passing through the path',
          say: `Currents outside the path don't count, and currents through it in opposite directions cancel. With a symmetric path, like a circle around a wire, or a rectangle through a solenoid, it hands you B directly.`,
        },
        {
          at: 'two wires push on each other',
          say: `Since currents make fields, and currents feel fields, two wires push on each other. Wire one's field at wire two is mu naught I one over two pi d. Wire two feels a force from it, so the force per meter is mu naught, times I one, times I two, over two pi d.`,
        },
        {
          figure: 'Two parallel wires',
          style: 'sandbox',
          say: `Here are two wires a centimeter apart, each carrying ten amps. With currents in the same direction, they ATTRACT, with about two thousandths of a newton per meter. Switch wire two to the opposite direction, and they repel. <short pause> The opposite of what you'd guess from like charges.`,
        },
        {
          at: 'Classic mistakes',
          style: 'warn',
          say: `Four classic mistakes. One: using one over r squared for a wire's field; for a long wire, it's one over r. Two: drawing B pointing toward or away from the wire; it circles it. Three: using the total number of turns in mu naught n I, instead of turns per meter. And four: expecting parallel currents to repel like charges do. <short pause> They attract.`,
        },
        {
          sel: '.quiz',
          say: `That's where magnetic fields come from. Try the checkpoint below, then on to induction.`,
        },
      ],
    },
  ],
};
