/** Narration for "Electric potential" (src/lessons/potential.js). Format: see overview.js; guide: tts/WRITING.md. */
export default {
  sections: [
    {
      voice: 'Charon',
      blocks: [
        {
          at: 'In Physics I, gravity had a',
          say: `In Physics One, gravity had a potential energy. Lift a mass m by a height h, and you store m g h, which comes back as kinetic energy when it falls. The electric force is also conservative, so a charge in an electric field has a potential energy too. Push a positive charge toward another positive charge, and you store energy. Let go, <short pause> and it flies off.`,
        },
        {
          at: 'As with the field, it pays to divide out',
          say: `As with the field, it pays to divide out the charge you place. The electric potential, V, is the potential energy per coulomb: a number at every point, belonging to the source charges. Think of it as a HEIGHT MAP, a landscape with hills at positive charges and pits at negative charges. Its unit, joules per coulomb, is the volt.`,
        },
        {
          at: 'potential energy of charge q there',
          say: `So V equals U over q. Turned around: a charge q moved through a potential difference, delta V, changes its potential energy by q times delta V. Only DIFFERENCES in V matter. When people say "voltage", they mean a potential difference.`,
        },
        {
          at: 'A 9 V battery keeps one terminal',
          say: `A nine volt battery keeps one terminal nine volts above the other, so every coulomb that goes around the circuit gets nine joules. For a single particle, the natural unit is the electron-volt: the energy an electron gains crossing one volt, about one point six times ten to the minus nineteen joules. You'll meet it again in atoms and nuclei.`,
        },
        {
          at: 'The picture below is the key to every sign question',
          say: `The next picture is the key to every sign question in this chapter: the potential along the line through a dipole, drawn as a landscape, with charges rolling on it.`,
        },
      ],
    },
    {
      voice: 'Achird',
      style: 'figure',
      blocks: [
        {
          figure: 'Charges on the potential landscape',
          step: 0,
          say: `Here's the potential along the line through a dipole: plus one and minus one nanocoulomb, twenty-eight centimeters apart. It's a landscape. A peak at the positive charge, a pit at the negative charge, and exactly zero halfway between.`,
        },
        {
          figure: 'Charges on the potential landscape',
          step: 1,
          say: `Put a small positive charge seven centimeters from the plus charge, where V is about plus eighty-six volts. The force on it points DOWNHILL on the curve, like a ball on a hillside.`,
        },
        {
          figure: 'Charges on the potential landscape',
          step: 2,
          say: `Let go, and it rolls downhill, to a spot where V is about minus one hundred twenty-three volts. It dropped two hundred nine volts, so a proton would gain two hundred nine electron-volts of kinetic energy.`,
        },
        {
          figure: 'Charges on the potential landscape',
          step: 3,
          say: `Now put an electron at the same spot. Same field, opposite charge, so the force flips. It gets pushed UPHILL in V, toward the positive charge.`,
        },
        {
          figure: 'Charges on the potential landscape',
          step: 4,
          say: `Here's the cure for the confusion. Plot the electron's potential energy, U equals q V, the colored curve. With q negative, the landscape flips upside down. <short pause> And on its own energy landscape, the electron rolls downhill too.`,
        },
        {
          figure: 'Charges on the potential landscape',
          step: 5,
          say: `It rolls to the left, gaining two hundred nine electron-volts, exactly what the proton gained going the other way. Every charge rolls downhill in U. Only positive ones also roll downhill in V.`,
        },
        {
          figure: 'Charges on the potential landscape',
          step: 6,
          say: `Finally, the field arrows along the axis. E points downhill in V everywhere, and it's longest where the slope is steepest, near the charges. Where V is flat, the field is zero.`,
        },
        {
          at: 'Downhill rules',
          style: 'tutor',
          say: `So, the downhill rules. E points downhill in V. Positive charges are pushed downhill in V, and negative charges uphill. <short pause> And every charge, left alone, moves to lower potential energy, U equals q V, turning the energy it loses into kinetic energy.`,
        },
      ],
    },
    {
      voice: 'Charon',
      blocks: [
        {
          at: 'The slope connection works both ways',
          say: `The slope connection works both ways. The field is the downhill slope of the potential, and the potential difference is the field times distance.`,
        },
        {
          at: 'how much V changes per meter along x',
          say: `In symbols: E equals minus delta V over delta x. The field strength is how fast V changes with distance: steep potential, strong field. The minus sign says E points toward DECREASING V. In a uniform field, like between parallel plates, the potential difference is simply E times d. And that's why field strength can be quoted in volts per meter, the same unit as newtons per coulomb.`,
        },
        {
          at: ['For a point charge the potential follows', 'potential at distance r (zero at infinity)'],
          say: `For a point charge, the potential follows from Coulomb's law, with one power of r fewer than the field. V equals k q over r. It's positive near a plus charge, negative near a minus charge, and zero far away. It falls as one over r, more slowly than the field's one over r squared. <short pause> And it's a scalar with a sign. For several charges, you just add the numbers: no components, no arrows.`,
        },
      ],
    },
    {
      voice: 'Achird',
      blocks: [
        {
          at: ['Equipotentials', 'Connect all the points with the same V'],
          say: `Connect all the points with the same V, and you get equipotentials: the contour lines of the height map. Moving a charge along one takes no work, so the field can have no component along it. That means field lines cross equipotentials at RIGHT ANGLES. And drawn at equal steps of V, the contours crowd together where the field is strong.`,
        },
        {
          figure: 'Sandbox: equipotential map',
          style: 'sandbox',
          say: `Try the map. The grey curves are equipotentials, and the orange ones are field lines. Drag the small test charge to read V, and drag the charges around too. Notice the field arrow always crosses the grey curves at right angles, pointing toward lower V. Then switch to Plates, and look at how evenly the curves are spaced.`,
        },
        {
          at: 'Two important cases. Between parallel plates',
          say: `Two important cases. Between parallel plates, the equipotentials are evenly spaced planes: V drops by the same amount every centimeter, which is what a uniform field means. And every conductor in equilibrium is an equipotential. No field inside means no slope, so the whole piece of metal sits at one potential. Wires in a circuit diagram are treated the same way, for a different reason: their resistance is negligible, so almost no voltage drops along them.`,
        },
        {
          at: 'Classic mistakes',
          style: 'warn',
          say: `Three classic mistakes. One: thinking that V equals zero means E equals zero. V is the height; E is the slope. Halfway between a plus and a minus charge, the height is zero, but the ground is steep. Two: adding potentials as vectors, or forgetting their signs. V is a signed scalar. <short pause> And three: getting electron directions backward. Electrons go toward HIGHER V.`,
        },
      ],
    },
    {
      voice: 'Charon',
      blocks: [
        {
          at: ['Energy conservation with charges', 'Because the electric force is conservative'],
          say: `Because the electric force is conservative, kinetic plus potential energy stays constant for a charge moving in an electrostatic field. Falling through a potential difference turns q V into kinetic energy, exactly like a dropped ball turns m g h into one half m v squared. That's how every particle accelerator, X-ray tube, and old TV tube works.`,
        },
        {
          at: 'its mass and final speed',
          say: `So the kinetic energy gained equals the potential energy lost. Starting from rest, one half m v squared equals the size of q, times the size of delta V. An electron crossing a thousand volts toward higher V gains a thousand electron-volts. And the speed grows as the SQUARE ROOT of the voltage: four times the voltage, twice the speed.`,
        },
        {
          figure: 'Accelerating a charge through ΔV',
          style: 'sandbox',
          say: `Here a particle starts at rest at the left plate, and exits through a hole in the right one. At a thousand volts, an electron leaves at about nineteen million meters per second, six percent of the speed of light. Switch to the proton: it gets the same thousand electron-volts, but being eighteen hundred thirty-six times heavier, it ends up about forty-three times slower.`,
        },
        {
          at: 'Above a few tens of kilovolts',
          say: `Above a few tens of kilovolts, an electron gets close enough to the speed of light that one half m v squared stops being accurate; relativity takes over. But the energy statement, K equals e times delta V, stays exactly right. That's one reason physicists quote particle energies in electron-volts.`,
        },
        {
          sel: '.quiz',
          say: `That's electric potential. Try the checkpoint below, then on to capacitors.`,
        },
      ],
    },
  ],
};
