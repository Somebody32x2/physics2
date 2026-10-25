import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { STYLES } from '../tts/voices.mjs';

// The narration scripts point at page text (`at`) and figure titles; a reworded paragraph must not leave
// a block highlighting nothing. Lesson sources are matched after unescaping \uXXXX and dropping tags.
const lessonText = (id) =>
  readFileSync(new URL(`../src/lessons/${id}.js`, import.meta.url), 'utf8')
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/\\'/g, "'")
    .replace(/<\/?[a-z][a-z0-9]*(\s[^<>]*)?>/g, ''); // HTML tags only, not JS comparisons

const scripts = readdirSync(new URL('../tts/script/', import.meta.url)).filter((f) => f.endsWith('.js'));

for (const f of scripts) {
  const id = f.replace(/\.js$/, '');
  test(`narration ${id}: targets exist and settings are valid`, async () => {
    assert.ok(existsSync(new URL(`../src/lessons/${id}.js`, import.meta.url)), `no lesson src/lessons/${id}.js`);
    const src = lessonText(id);
    assert.match(src, new RegExp(`id: '${id}'`), 'script name must equal the chapter id');
    const { default: script } = await import(`../tts/script/${f}`);
    script.sections.forEach((sec, s) => {
      assert.ok(['Achird', 'Charon'].includes(sec.voice), `section ${s} voice`);
      if (s > 0) assert.notEqual(sec.voice, script.sections[s - 1].voice, `section ${s} should switch voice`);
      for (const b of sec.blocks) {
        assert.ok(b.say?.trim(), `section ${s}: empty block`);
        assert.ok(b.at || b.figure || b.sel, `section ${s}: block highlights nothing: ${b.say.slice(0, 40)}`);
        for (const a of [b.at ?? []].flat()) assert.ok(src.includes(a), `section ${s}: "${a}" not found in the lesson`);
        if (b.figure) assert.ok(src.includes(`title: '${b.figure}'`), `section ${s}: no figure titled "${b.figure}"`);
        if (b.style ?? sec.style) assert.ok(STYLES[b.style ?? sec.style], `unknown style ${b.style ?? sec.style}`);
      }
    });
  });
}
