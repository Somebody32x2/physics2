/** Narration for "Magnetic force" (src/lessons/magnetic-force.js). Format: see overview.js; guide: tts/WRITING.md. */
export default {
  sections: [
    {
      voice: 'Achird',
      blocks: [
        {
          at: 'Electric fields push on charges whether they move or not',
          say: `Electric fields push on charges whether they move or not. A magnetic field, B, is pickier. It only pushes on charges that are MOVING, and it pushes sideways, perpendicular to the motion. Its unit is the tesla. A fridge magnet is about a hundredth of a tesla near its surface. Earth's field is about five times ten to the minus five tesla. And an M R I magnet is one and a half to three tesla.`,
        },
        {
          at: 'Most of the pictures in this unit are flat',
          say: `Most pictures in this unit are flat, but magnetic forces are fully three-dimensional. So we need a way to draw arrows pointing into or out of the page. The convention: a circle with an X is an arrow's tail feathers, seen as it flies away from you. That means INTO the page. A circle with a dot is the arrow's tip, coming at you. That means OUT of the page.`,
        },
        {
          at: 'is a cross product. You met cross products',
          say: `The force on a charge q moving with velocity v is a cross product. You met cross products for torque in Physics One: the result is perpendicular to both inputs, and its size depends on the sine of the angle between them.`,
        },
        {
          at: 'angle between v and B',
          say: `So F equals q, v cross B. Its size is the size of q, times v, times B, times the sine of theta, the angle between v and B. The force is perpendicular to BOTH v and B. It's biggest when v is perpendicular to B, zero when the charge moves along B, and it reverses if q, v, or B reverses. <short pause> And doubling the speed doubles the force.`,
        },
      ],
    },
    {
      voice: 'Charon',
      style: 'figure',
      blocks: [
        {
          figure: 'The right-hand rule, case by case',
          step: 0,
          say: `Let's take the right-hand rule case by case. A positive charge moves right, through a field pointing into the page. Right hand: fingers along v, curl them toward B, and your thumb points along F. Here, F points up: perpendicular to both v and B, at full strength because v is perpendicular to B.`,
        },
        {
          figure: 'The right-hand rule, case by case',
          step: 1,
          say: `Same charge, now moving up. The force turns with the velocity, and now points left. It's always ninety degrees from v, which is why it can bend the path, but never speed the charge up.`,
        },
        {
          figure: 'The right-hand rule, case by case',
          step: 2,
          say: `Now swap in an electron. Use the same right hand, then FLIP the answer: the force now points right. Forgetting this flip is the most common sign error in the chapter.`,
        },
        {
          figure: 'The right-hand rule, case by case',
          step: 3,
          say: `Positive charge moving right, with the field now pointing out of the page. Reversing B reverses F, so it points down.`,
        },
        {
          figure: 'The right-hand rule, case by case',
          step: 4,
          say: `Now the field lies in the page, pointing right, and v points right too. V is parallel to B, the sine of zero is zero, so the force is ZERO. A charge moving along a field line feels nothing.`,
        },
        {
          figure: 'The right-hand rule, case by case',
          step: 5,
          say: `Tilt v to thirty degrees from B. Only the part of v perpendicular to B counts, so the force is half the maximum, since the sine of thirty degrees is one half. Both v and B lie in the page, so F sticks straight into the page.`,
        },
        {
          figure: 'The right-hand rule, case by case',
          step: 6,
          say: `At ninety degrees, the force is back to full size, still into the page. Whenever v and B both lie in the page, F has to point straight into or out of it.`,
        },
      ],
    },
    {
      voice: 'Achird',
      blocks: [
        {
          at: 'Sideways force, no work',
          say: `Here's a big consequence. Because the force is always perpendicular to v, a magnetic field NEVER does work on a charge. It can't speed a charge up, or slow it down. It can only turn it. And a constant speed, with a constant-size sideways force, is exactly uniform circular motion from Physics One.`,
        },
        {
          at: ['Set the magnetic force equal to the centripetal force', 'radius of the circle'],
          say: `Set the magnetic force equal to the centripetal force, and you get the radius: r equals m v over q B. A heavier or faster particle swings wider; a stronger field or a bigger charge curls it tighter. The time for one full circle is two pi m over q B. Notice the speed cancels out: faster particles go around bigger circles, in exactly the same time.`,
        },
        {
          figure: 'Sandbox: a charge enters a magnetic field',
          style: 'sandbox',
          say: `Here, an ion with charge e enters the field from the left. At two times ten to the five meters per second in one tesla, a one u ion curls around in a circle about two millimeters in radius, taking about thirty-three nanoseconds to come back out. Try doubling v: the circle doubles, but the time stays the same. Then try heavier masses: they land farther away. That's how a mass spectrometer sorts ions.`,
        },
        {
          at: 'If v has a component',
          say: `If v also has a part ALONG B, that part feels no force, and just carries on, while the perpendicular part goes around in a circle. The result is a helix, wrapped around the field lines. That's how Earth's field steers charged particles from the Sun toward the poles, where they make the aurora.`,
        },
      ],
    },
    {
      voice: 'Charon',
      blocks: [
        {
          at: ['A current is just many moving charges', 'length of wire in the field'],
          say: `A current is just many moving charges, so a wire carrying current through a field feels the sum of all their sideways pushes. F equals I, L cross B. It's the same rule as for one charge, with q v replaced by I L. The force is perpendicular to the wire and to B, and zero for a wire lying along B.`,
        },
        {
          at: 'Put a rectangular loop in a field',
          say: `Put a rectangular loop in a field, and the forces on its two long sides point opposite ways. They don't move the loop anywhere, but they TWIST it. The torque is N I A B, times the sine of theta: N turns, current I, area A, and theta, the angle between B and the loop's normal. That twist is an electric motor.`,
        },
        {
          figure: 'Force on a current: wire and motor',
          style: 'sandbox',
          say: `Try it here. Two amps through twenty centimeters of wire, in a field of six tenths of a tesla, feel a force of about a quarter of a newton. Reverse the current with the slider, and the force flips. Then switch to the motor loop, and watch the twist keep it turning.`,
        },
        {
          at: 'Classic mistakes',
          style: 'warn',
          say: `Three classic mistakes. One: using the right-hand rule for an electron and forgetting to flip the answer. Two: drawing the force ALONG B, the way you would for an electric field. Magnetic forces are always perpendicular to B. And three: thinking a magnetic field can change a particle's speed. It only ever changes the direction.`,
        },
        {
          sel: '.quiz',
          say: `That's the magnetic force. Try the checkpoint below, then on to where magnetic fields come from.`,
        },
      ],
    },
  ],
};
