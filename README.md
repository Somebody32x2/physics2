# Physics II, seen

A visual head start on **Physics II (WashU PHYS 1742)**: the whole semester at a high level, so the
lectures land on ideas you have already seen move. Every chapter animates the physics from a small
model, says in plain words what each equation relates, and ends with a checkpoint.

Live: https://samuelshuster.com/education/physics2/

## Chapters

| Group | Chapters |
|---|---|
| Start here | The big picture |
| Electric fields | Charge & Coulomb's law, The electric field, Gauss's law, Electric potential |
| Circuits | Capacitors, Current & resistance, DC circuits, RC circuits |
| Magnetism | Magnetic force, Where magnetic fields come from, Induction, Inductance & oscillations |
| Light & optics | Electromagnetic waves, Reflection, refraction & lenses, Interference, Diffraction |
| Quantum & nuclear | Photons, Atoms & matter waves, Nuclear physics |
| Reference | Equation sheet in words |

## Run it

Static files, no build, no dependencies. ES modules need http:// (not file://).

```sh
npm start     # http://localhost:5173
npm test      # model tests (Node 22+)
```

## Layout

```
index.html, styles.css      shell and every style (physics colors: "physics figures" section)
src/main.js                 sidebar, hash router (#/chapter-id), home page, pager
src/site.js                 title, hero text
src/lessons/index.js        chapter order, home hero figure, color legend
src/lessons/<id>.js         one chapter per file: prose, equation cards, figures, checkpoint
src/model/*.js              the physics, no DOM: fields, electric, circuits, magnetism, optics, quantum
src/core/phys-view.js       PhysView: draws a frame { draw(d, p, t), p, box, live }, tweens numeric params
src/core/draw.js            Draw: arrows, charges, field lines, circuit symbols, lenses, mini plots
src/ui/                     Player (stepper), checkpoint quizzes, figure/callout, sliders, equation cards
tests/*.test.js             node:test checks of the models (textbook values, limits, conservation laws)
tts/                        narration scripts and the clip generator (not deployed); audio/ holds the clips
```

## Extending

Add a chapter: write `src/lessons/<id>.js` exporting `{ id, title, group, blurb, quiz, render(root) }`,
put its physics in `src/model/`, and list it in `src/lessons/index.js`. A figure is a list of frames
for `PhysView`; frames sharing the same `draw` function glide between their numeric params, and
`live: true` frames animate with a clock. Quiz answers come from the model, never from memory.

## Narration (Listen)

Chapters with a script in `tts/script/<chapter id>.js` get a **Listen** button: AI narration (Gemini
3.8 Flash TTS, voices Achird and Charon, alternating by section) that highlights each paragraph and steps the
figures as it goes. The scripts are written to be heard: math is spoken ("E equals sigma over epsilon naught"),
and Gemini cues are inline (`<short pause>`, CAPS for stress); each block points at its page text with `at`.

```sh
node tts/gen.mjs --dry        # what is missing, no calls
node tts/gen.mjs              # record missing clips (needs ~/.config/gemini.key and ffmpeg), commit audio/
```

The site only plays committed files (`audio/<hash>.mp3` and `audio/<chapter>.json`); it never calls an API.
Clips are named by a hash of the whole request, so nothing is ever generated twice: re-runs skip existing
clips, and editing one section re-records only that section. One API call per section, because the free tier
allows 10 requests a day; `--max N` caps a run. See the comment at the top of `tts/gen.mjs`. Blocks without a
recording yet are read by the browser's own voice. `tests/narration.test.js` checks every `at` still exists.

## Deploy

Coolify app `physics2` (project SamuelShuster.com) builds the `Dockerfile` (nginx) and serves it at
`samuelshuster.com/education/physics2`; pushes to `main` redeploy through a GitHub webhook. Listed on
the education homepage (`Somebody32x2/education`, `subjects.js`).

The site is part of the Education PWA: `index.html` links the homepage's `manifest.webmanifest` and registers
its `sw.js` (scope `/education/`), which caches the site as you use it so it works offline. Anywhere without
`/education/` above the site (locally, GitHub Pages) those requests 404 and registration fails quietly.

## License

MIT
