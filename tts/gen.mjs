/**
 * Narration audio for the chapters (Gemini TTS). Run on a dev machine, never on the server:
 *
 *   node tts/gen.mjs                 generate every missing clip, then write audio/<chapter>.json
 *   node tts/gen.mjs --dry           list what would be generated, call nothing
 *   node tts/gen.mjs --max 10        stop after 10 API calls (stay inside the free daily quota)
 *   node tts/gen.mjs overview charge only these chapters
 *
 * One API call per section: its blocks go in one request (each with its own style), and each block's start
 * in the clip is estimated from its share of the text, then snapped to the nearest pause in the audio.
 * The free tier allows only 10 requests a day, so this is what makes a chapter fit in a day or two.
 * (perBlock: N on a section keeps its first N blocks as one clip each: clips recorded before grouping.)
 *
 * Never pays for the same clip twice:
 * - A clip is named by a hash of its whole request (model, voice, style, text, encoding), so an existing
 *   audio/<hash>.mp3 is never requested again, identical blocks share one file, and editing one block
 *   re-generates only that block. The clips are committed, so other machines never regenerate them either.
 * - The raw WAV from the API is saved (tts/.raw/, untracked) before converting, so a failed conversion is
 *   retried from disk, not from the API. Files are written under a temporary name and renamed when complete.
 * - A lock file stops two runs at once from requesting the same clip.
 * - Errors stop the run, except a per-minute rate limit (429), which waits and tries again: no audio was
 *   made, so nothing is paid for twice.
 *
 * Needs ~/.config/gemini.key (an AI Studio API key; keep billing off for the free tier) and ffmpeg.
 */
import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, openSync, closeSync, readFileSync, renameSync, unlinkSync, writeFileSync, readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { MODEL, STYLES, ENCODING } from './voices.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const AUDIO = join(ROOT, 'audio');
const RAW = join(ROOT, 'tts', '.raw');
const SCRIPTS = join(ROOT, 'tts', 'script');
const KEYFILE = join(homedir(), '.config', 'gemini.key');
const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/interactions';

const args = process.argv.slice(2);
const dry = args.includes('--dry');
const maxCalls = args.includes('--max') ? Number(args[args.indexOf('--max') + 1]) : Infinity;
const only = args.filter((a, i) => !a.startsWith('--') && args[i - 1] !== '--max');

const sha = (s) => createHash('sha256').update(s).digest('hex').slice(0, 16);
/** The exact request body sent to Gemini. Its hash (plus the encoding) names the clip. */
const request = (voice, items) => ({
  model: MODEL,
  input: [{ type: 'user_input', content: items.map(({ say, style }) => ({ type: 'text', text: say, annotations: [{ type: 'speech_metadata', style }] })) }],
  response_format: { type: 'audio' },
  generation_config: { speech_config: [{ voice }] },
});
const clipName = (body) => sha(JSON.stringify({ body, ENCODING }));

/** Text for the browser's own voice when a clip is missing: no inline tags, no shouted emphasis. */
const plain = (say) => say.replace(/<[^>]+>/g, ' ').replace(/\b[A-Z]{3,}\b/g, (w) => w.toLowerCase()).replace(/\s+/g, ' ').trim();

async function loadChapters() {
  // Chapter order, from the imports in src/lessons/index.js; a script is named after its lesson file.
  const order = [...readFileSync(join(ROOT, 'src', 'lessons', 'index.js'), 'utf8').matchAll(/^import \w+ from '\.\/([\w-]+)\.js'/gm)].map((m) => m[1]);
  const rank = (f) => (order.indexOf(f.replace(/\.js$/, '')) + 1 || 1e9);
  const files = readdirSync(SCRIPTS).filter((f) => f.endsWith('.js')).sort((a, b) => rank(a) - rank(b));
  const out = [];
  for (const f of files) {
    const id = f.replace(/\.js$/, '');
    if (only.length && !only.includes(id)) continue;
    const { default: script } = await import(pathToFileURL(join(SCRIPTS, f)).href);
    const blocks = [];
    const clips = [];
    script.sections.forEach((sec, s) => {
      if (!['Achird', 'Charon'].includes(sec.voice)) throw new Error(`${id}: section ${s} needs voice Achird or Charon`);
      const items = sec.blocks.map((b) => {
        const style = STYLES[b.style ?? sec.style ?? 'tutor'];
        if (!style) throw new Error(`${id}: unknown style ${b.style ?? sec.style}`);
        const block = { id, section: s, voice: sec.voice, at: [b.at ?? []].flat(), sel: b.sel ?? null, figure: b.figure ?? null, step: b.step ?? null, say: b.say.trim() };
        blocks.push(block);
        return { block, style };
      });
      // perBlock: N keeps the first N blocks as one clip each (recorded before sections were grouped).
      const n = sec.perBlock ?? 0;
      const groups = [...items.slice(0, n).map((it) => [it]), items.slice(n)].filter((g) => g.length);
      for (const g of groups) {
        // Between blocks of one clip, a short pause marks the boundary the cue snapping looks for.
        const say = (it, k) => (k < g.length - 1 ? `${it.block.say} <short pause>` : it.block.say);
        const body = request(sec.voice, g.map((it, k) => ({ say: say(it, k), style: it.style })));
        const clip = { id, section: s, voice: sec.voice, body, name: clipName(body), blocks: g.map((it) => it.block) };
        g.forEach((it) => (it.block.clip = clip));
        clips.push(clip);
      }
    });
    out.push({ id, blocks, clips });
  }
  return out;
}

async function callGemini(key, body) {
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(ENDPOINT, { method: 'POST', headers: { 'x-goog-api-key': key, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (res.ok) {
      const json = await res.json();
      const audio = json.steps?.filter((s) => s.type === 'model_output').flatMap((s) => s.content ?? []).filter((c) => c.type === 'audio').at(-1);
      if (!audio?.data) throw new Error(`no audio in response: ${JSON.stringify(json).slice(0, 400)}`);
      return Buffer.from(audio.data, 'base64');
    }
    const text = await res.text();
    const perMinute = res.status === 429 && !/per ?day|PerDay|daily/i.test(text);
    if (perMinute && attempt < 4) {
      const wait = Number(text.match(/"retryDelay":\s*"(\d+)/)?.[1] ?? 60) + 2;
      console.log(`  rate limited, waiting ${wait}s`);
      await new Promise((r) => setTimeout(r, wait * 1000));
      continue;
    }
    throw new Error(`Gemini ${res.status}: ${text.slice(0, 600)}`);
  }
}

function toMp3(wav, mp3) {
  const tmp = `${mp3}.tmp.mp3`;
  execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', wav, '-ac', '1', '-ar', String(ENCODING.rate), '-b:a', ENCODING.bitrate, tmp]);
  renameSync(tmp, mp3);
}

const duration = (mp3) =>
  Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', mp3]).toString().trim());

/** Midpoints and lengths of the pauses in a clip: [{ t, len }]. */
function pauses(mp3) {
  const { stderr } = spawnSync('ffmpeg', ['-hide_banner', '-i', mp3, '-af', 'silencedetect=noise=-35dB:d=0.25', '-f', 'null', '-'], { encoding: 'utf8' });
  const out = [];
  let start = null;
  for (const line of stderr.split('\n')) {
    const a = line.match(/silence_start: ([\d.]+)/);
    if (a) start = Number(a[1]);
    const b = line.match(/silence_end: ([\d.]+)/);
    if (b && start != null) {
      out.push({ t: (start + Number(b[1])) / 2, len: Number(b[1]) - start });
      start = null;
    }
  }
  return out;
}

/** [start, end] of each block in a clip, from text shares snapped to the longest nearby pause. */
function cues(mp3, weights) {
  const dur = duration(mp3);
  const r = (x) => Math.round(x * 100) / 100;
  if (weights.length === 1) return [[0, r(dur)]];
  const total = weights.reduce((a, b) => a + b, 0);
  const found = pauses(mp3);
  const starts = [0];
  let acc = 0;
  for (let k = 1; k < weights.length; k++) {
    acc += weights[k - 1];
    const est = (dur * acc) / total;
    const win = Math.max(3, dur * 0.12);
    const best = found
      .filter((p) => Math.abs(p.t - est) <= win && p.t > starts.at(-1) + 1)
      .sort((a, b) => b.len - 0.15 * Math.abs(b.t - est) - (a.len - 0.15 * Math.abs(a.t - est)))[0];
    starts.push(best ? best.t : Math.max(est, starts.at(-1) + 1));
  }
  return starts.map((t, k) => [r(t), r(starts[k + 1] ?? dur)]);
}

async function main() {
  mkdirSync(AUDIO, { recursive: true });
  mkdirSync(RAW, { recursive: true });
  const chapters = await loadChapters();
  const lock = join(ROOT, 'tts', '.lock');
  let fd;
  if (!dry) {
    try {
      fd = openSync(lock, 'wx');
    } catch {
      throw new Error(`another run holds ${lock} (delete it if no run is active)`);
    }
  }
  try {
    const todo = new Map(); // name -> clip, so identical requests are made once
    for (const ch of chapters) for (const c of ch.clips) if (!existsSync(join(AUDIO, `${c.name}.mp3`))) todo.set(c.name, c);
    const chars = [...todo.values()].reduce((n, c) => n + c.blocks.reduce((m, b) => m + b.say.length, 0), 0);
    console.log(`${todo.size} clip(s) to make (${chars} characters)${dry ? ', dry run' : ''}`);

    let calls = 0;
    let failed = null;
    if (!dry && todo.size) {
      const key = readFileSync(KEYFILE, 'utf8').trim();
      for (const c of todo.values()) {
        const mp3 = join(AUDIO, `${c.name}.mp3`);
        const wav = join(RAW, `${c.name}.wav`);
        if (!existsSync(wav)) {
          if (calls >= maxCalls) {
            console.log(`stopping at --max ${maxCalls}; run again to continue`);
            break;
          }
          calls++;
          const t = Date.now();
          let audio;
          try {
            audio = await callGemini(key, c.body);
          } catch (e) {
            failed = e; // stop calling, but still write the manifests for what exists
            break;
          }
          writeFileSync(`${wav}.tmp`, audio);
          renameSync(`${wav}.tmp`, wav);
          console.log(`made   ${c.id} #${c.section} ${c.voice} (${c.blocks.length} block${c.blocks.length > 1 ? 's' : ''})  ${c.name}  (${((Date.now() - t) / 1000).toFixed(0)}s)`);
        } else console.log(`saved  ${c.id} ${c.name} (from tts/.raw, no call)`);
        toMp3(wav, mp3);
      }
    } else if (dry) for (const c of todo.values()) console.log(`  ${c.id} #${c.section} ${c.voice}, ${c.blocks.length} block(s): ${c.blocks[0].say.slice(0, 60)}...`);

    // What the page reads: one manifest per chapter. Missing clips get src null (the browser voice reads them).
    for (const ch of chapters) {
      const timing = new Map(); // clip name -> [[start, end] per block], null when the clip is missing
      for (const c of ch.clips) {
        const mp3 = join(AUDIO, `${c.name}.mp3`);
        timing.set(c.name, existsSync(mp3) ? cues(mp3, c.blocks.map((b) => plain(b.say).length)) : null);
      }
      const blocks = ch.blocks.map((b) => {
        const t = timing.get(b.clip.name)?.[b.clip.blocks.indexOf(b)];
        const whole = b.clip.blocks.length === 1;
        return {
          section: b.section, voice: b.voice, at: b.at, sel: b.sel, figure: b.figure, step: b.step, text: plain(b.say),
          src: t ? `audio/${b.clip.name}.mp3` : null,
          start: t && !whole ? t[0] : null,
          end: t && !whole ? t[1] : null,
          dur: t ? Math.round((t[1] - t[0]) * 10) / 10 : null,
        };
      });
      if (!dry) writeFileSync(join(AUDIO, `${ch.id}.json`), `${JSON.stringify({ chapter: ch.id, blocks }, null, 1)}\n`);
      const missing = blocks.filter((b) => !b.src).length;
      console.log(`${ch.id}: ${blocks.length} blocks, ${missing ? `${missing} missing` : 'all recorded'}, ${(blocks.reduce((s, b) => s + (b.dur ?? 0), 0) / 60).toFixed(1)} min`);
    }
    console.log(`${calls} API call(s) this run`);
    if (failed) throw failed;
  } finally {
    if (fd !== undefined) {
      closeSync(fd);
      unlinkSync(lock);
    }
  }
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
