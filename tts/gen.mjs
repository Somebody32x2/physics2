/**
 * Narration audio for the chapters (Gemini TTS). Run on a dev machine, never on the server:
 *
 *   node tts/gen.mjs                 generate every missing clip, then write audio/<chapter>.json
 *   node tts/gen.mjs --dry           list what would be generated, call nothing
 *   node tts/gen.mjs --max 10        stop after 10 API calls (stay inside the free daily quota)
 *   node tts/gen.mjs overview charge only these chapters
 *   node tts/gen.mjs --partial       also publish chapters that still have missing clips (browser voice fills in)
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
const partial = args.includes('--partial'); // also write manifests for chapters with missing clips
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

/** Clip names (hashes) to record again, e.g. a legacy clip with an audible defect. */
const rerecord = existsSync(join(ROOT, 'tts', 'rerecord.json')) ? JSON.parse(readFileSync(join(ROOT, 'tts', 'rerecord.json'), 'utf8')).map((r) => r.clip) : [];

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
        // Clips recorded before 2026-10-30 put "<short pause>" after every block but the last, as a boundary
        // marker; Gemini sometimes read it aloud at the end of a text item. Boundaries now come from word
        // timestamps, so new clips have no marker. A legacy clip keeps being used (no re-recording) unless its
        // name is listed in tts/rerecord.json.
        const items = (sep) => g.map((it, k) => ({ say: sep && k < g.length - 1 ? `${it.block.say} <short pause>` : it.block.say, style: it.style }));
        const legacy = request(sec.voice, items(true));
        const keepLegacy = existsSync(join(AUDIO, `${clipName(legacy)}.mp3`)) && !rerecord.includes(clipName(legacy));
        const body = keepLegacy ? legacy : request(sec.voice, items(false));
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

/**
 * Word timestamps from offline speech recognition (tts/align.py, Vosk), cached next to the raw audio. Null when
 * Vosk is not set up: TTS_PY (a python with vosk) and VOSK_MODEL default to the ~/tts-lab install.
 */
const ALIGN_PY = process.env.TTS_PY ?? join(homedir(), 'tts-lab', 'venv', 'bin', 'python');
const ALIGN_MODEL = process.env.VOSK_MODEL ?? join(homedir(), 'tts-lab', 'models', 'vosk-model-small-en-us-0.15');
const canAlign = existsSync(ALIGN_PY) && existsSync(ALIGN_MODEL);
function words(mp3) {
  if (!canAlign) return null;
  const cache = join(RAW, `${mp3.split('/').pop().replace(/\.mp3$/, '')}.words.json`);
  if (!existsSync(cache)) writeFileSync(cache, execFileSync(ALIGN_PY, ['-I', join(ROOT, 'tts', 'align.py'), mp3, ALIGN_MODEL]));
  return JSON.parse(readFileSync(cache, 'utf8'));
}

const tokens = (text) => text.toLowerCase().replace(/[^a-z' ]+/g, ' ').split(/\s+/).filter(Boolean);
const same = (a, b) => a === b || (a.length >= 4 && b.length >= 4 && a.slice(0, 3) === b.slice(0, 3));

/**
 * [start, end] of each block in a clip. Each boundary is estimated from the previous one at the clip's average
 * speaking rate (so errors do not accumulate) and snapped to the longest nearby pause: the <short pause> put
 * between blocks is usually the longest silence around. Then, when word timestamps are available, it moves to
 * just before the block's first words as recognized, which also catches blocks Gemini ran together.
 */
function cues(mp3, texts) {
  const dur = duration(mp3);
  const r = (x) => Math.round(x * 100) / 100;
  if (texts.length === 1) return [[0, r(dur)]];
  const weights = texts.map((t) => t.length);
  const rate = weights.reduce((a, b) => a + b, 0) / dur; // characters per second
  const found = pauses(mp3);
  const heard = words(mp3);
  const starts = [0];
  for (let k = 1; k < weights.length; k++) {
    const len = weights[k - 1] / rate; // expected length of the previous block
    const est = starts.at(-1) + len;
    const win = Math.max(2.5, 0.35 * len);
    const score = (p) => p.len - (0.6 * Math.abs(p.t - est)) / win;
    const best = found.filter((p) => Math.abs(p.t - est) <= win && p.t > starts.at(-1) + 0.5 * len).sort((a, b) => score(b) - score(a))[0];
    let t = best ? best.t : est;
    if (heard) {
      // Where the block's first words are heard: at least 2 of its first 3 words in order, near the estimate.
      const want = tokens(texts[k]).slice(0, 3);
      const hits = heard
        .map((w, i) => ({ i, n: want.filter((x, j) => heard[i + j] && same(heard[i + j].w, x)).length }))
        .filter(({ i, n }) => n >= 2 && Math.abs(heard[i].s - t) <= 8 && heard[i].s > starts.at(-1) + 0.5 * len)
        .sort((a, b) => b.n - a.n || Math.abs(heard[a.i].s - t) - Math.abs(heard[b.i].s - t));
      if (hits.length) {
        const i = hits[0].i;
        const gap = i > 0 ? heard[i].s - heard[i - 1].e : 0.6;
        t = heard[i].s - Math.min(0.3, Math.max(0, gap) / 2);
      }
    }
    starts.push(t);
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
        timing.set(c.name, existsSync(mp3) ? cues(mp3, c.blocks.map((b) => plain(b.say))) : null);
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
      const missing = blocks.filter((b) => !b.src).length;
      // Publish a chapter only once every clip exists, so the live Listen button never falls back mid-chapter.
      // While an edited chapter is being re-recorded, its previous manifest (and clips) stay as they were.
      if (!dry && (!missing || partial)) writeFileSync(join(AUDIO, `${ch.id}.json`), `${JSON.stringify({ chapter: ch.id, blocks }, null, 1)}\n`);
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
