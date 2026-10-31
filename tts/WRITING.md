# Writing a narration script

One file per chapter: `tts/script/<chapter id>.js`, named after its lesson file in `src/lessons/`. Copy the
shape of `overview.js` and `charge.js`; they are the reference for tone and density.

## Read the lesson first

Read the whole of `src/lessons/<id>.js`: every `p(...)`, `callout(...)`, `equation({...})`, figure title,
figure `note`, and each stepped figure's frame captions (the `caption` of each frame, in order). Numbers
in captions are often computed from `src/model/`; run the model with node to get the real values rather
than guessing (the narration must say what the page shows).

## Sections and voices

- A section is a run of related page content: an intro, one stepped figure, a sandbox and its tip, an
  `h2` part. Aim for 3 to 6 sections per chapter; **each section is one API call** (10 a day on the free
  tier), so don't split finely. A section of up to ~9 blocks / ~2 minutes is fine.
- Voices alternate by section: `Achird`, `Charon`, `Achird`, ... The first section's voice is the opposite of
  the previous chapter's last section. The test enforces the alternation.
- `style:` per section or per block, from `tts/voices.mjs`: `tutor` (default, explanations), `figure`
  (walking through a stepped figure), `sandbox` (inviting play with an interactive), `warn` (common mistake
  / trap callouts).

## Blocks

`{ say, at }` highlights page text: `at` is a short, unique, literal substring of the paragraph, callout or
heading as rendered (no HTML, no `eq()` pieces; an apostrophe in the source is often `’`, so pick
text without one). Use an array to highlight several elements. `{ say, figure: '<exact figure title>', step: k }`
highlights a figure and moves its stepper to frame k (0-based); give each frame of a stepped figure its own
block, in order. A sandbox figure (no stepper) gets one block without `step`. End the last section with
`{ sel: '.quiz', say: ... }`, a one-line invitation to the checkpoint (and, if natural, a pointer to the next chapter).

## How to write `say`

- Written to be heard, close to the page but not a word-for-word read. Short sentences; split long ones.
- Speak all math: "F equals k, times the size of q one, times the size of q two, all over r squared",
  "E equals sigma over epsilon naught", "ten to the minus nineteen", "r naught", "one over r squared".
  Spell out symbols (sigma, epsilon, lambda, tau, mu, delta, phi), units ("coulombs", "newtons per coulomb"),
  and "Physics One / Two". Never leave a symbol the voice would mangle (Greek letters, subscripts, ×, ±, ^).
- Say what each symbol means the first time, briefly, when the page's equation card defines it.
- Gemini cues: CAPS on one or two stressed words per block. **No `<short pause>` or other tags**: Gemini
  sometimes reads them aloud ("short pause"), even mid-sentence. Make pauses with punctuation instead: a full
  stop, a colon, a dash, or "..." before a reveal. Direction belongs in `style`, never in the text.
- After recording, scan the transcripts (tts/.raw/*.words.json) for "short"/"pause" and similar; list a bad
  clip's hash in tts/rerecord.json and remove the cause from its text.
- Tables and long lists: summarize and name a few examples, don't read every row.
- For a sandbox, suggest one concrete thing to try, taken from the figure's note.

## Check before recording

```sh
node --test tests/narration.test.js   # every at/figure exists, voices alternate, styles valid
node tts/gen.mjs --dry                # sections to record = API calls
```
