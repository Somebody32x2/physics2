/**
 * Narration settings shared by every chapter. Changing any of these changes the request, so every clip that
 * uses it is regenerated (and paid for) on the next run: edit deliberately.
 */
export const MODEL = 'gemini-3.8-flash-tts';

/** Output encoding, part of each clip's hash. 24 kHz mono speech at 48 kbps: about 360 KB a minute. */
export const ENCODING = { rate: 24000, bitrate: '48k' };

/**
 * Delivery directions (Gemini's `style`). A section picks one with `style:`, a block can override it.
 * Voices alternate by section between Achird (friendly) and Charon (informative); each section names its own
 * voice in the script, so inserting a section never changes the voice, and so the audio, of the others.
 */
export const STYLES = {
  tutor:
    'A warm, curious physics tutor talking one-on-one with a student. Unhurried and clear, with a slight smile in the voice. Lean on the key terms, and let each reveal land.',
  figure:
    'A physics tutor walking a student through a diagram on the screen in front of them, step by step. Calm and concrete, as if pointing at what just changed. Short pauses between ideas.',
  sandbox:
    'A physics tutor inviting a student to play with an interactive simulation. Encouraging and a little playful, like suggesting a fun experiment to try.',
  warn:
    'A physics tutor giving a friendly heads-up about a common trap. Slightly lower and more confidential, like sharing a tip from experience, never scolding.',
};
