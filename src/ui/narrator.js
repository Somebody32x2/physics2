import { h, icon } from './dom.js';

/**
 * "Listen" for a chapter: plays the pre-recorded narration in audio/<chapter id>.json (made by tts/gen.mjs),
 * highlighting each block's page element and stepping its figure. The page never calls a TTS API; a block
 * with no recording yet is read by the browser's own voice.
 *
 *   mountNarration(chapter, article)   adds the Listen button if the chapter has narration
 *   stopNarration()                    on every route change
 *
 * Clips are fetched whole (not streamed with range requests), so the service worker can cache them and
 * narration works offline once heard.
 */
const RATES = [1, 1.25, 1.5, 0.85];
const RATE_KEY = 'physics2.tts.rate';
const BLOCKS = 'p, h2, h3, aside.callout, figure.fig, .eqcard, .table-wrap, .defs-card, .quiz';
// A few samples of silence: playing it inside the click unlocks the audio element on iOS for the clips that follow.
const SILENCE = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQQAAACAgICA';
const ico = {
  speaker: '<svg viewBox="0 0 16 16"><path d="M2.5 6v4h2.5l3.5 3V3L5 6z" /><path d="M11 5.5a3.5 3.5 0 0 1 0 5M12.8 3.5a6.3 6.3 0 0 1 0 9" /></svg>',
  close: '<svg viewBox="0 0 16 16"><path d="m4 4 8 8M12 4l-8 8" /></svg>',
};

let state = null; // { ch, article, blocks, i, playing, bar, ... } while a chapter is mounted
const audio = typeof Audio === 'function' ? new Audio() : null;
const urls = new Map(); // src -> Promise<object URL>
let rate = Number(localStorage.getItem(RATE_KEY)) || 1;

export async function mountNarration(ch, article) {
  let data;
  try {
    const res = await fetch(`audio/${ch.id}.json`);
    if (!res.ok) return;
    data = await res.json();
  } catch {
    return;
  }
  if (!article.isConnected || !data.blocks?.length) return;
  const mins = Math.max(1, Math.round(data.blocks.reduce((s, b) => s + (b.dur ?? b.text.length / 15), 0) / 60));
  const btn = h('button', {
    class: 'btn ghost small listen-btn',
    title: 'Read this chapter aloud (AI voices)',
    html: `${ico.speaker}<span>Listen</span><span class="listen-min">${mins} min</span>`,
    onclick: () => (state?.bar ? toggle() : start(0)),
  });
  article.querySelector('.page-head')?.append(btn);
  state = { ch, article, blocks: data.blocks, i: 0, playing: false, bar: null, btn, speech: null };
}

export function stopNarration() {
  if (!state) return;
  halt();
  state.bar?.remove();
  clearHighlight();
  for (const u of urls.values()) u.then(URL.revokeObjectURL, () => {});
  urls.clear();
  audio.removeAttribute('src');
  loaded = null;
  state = null;
  if ('mediaSession' in navigator) navigator.mediaSession.metadata = null;
}

function start(i) {
  if (!state.bar) openBar();
  // Unlock playback inside the user's click; the real clip replaces this once it has loaded.
  audio.src = SILENCE;
  loaded = null;
  audio.play().catch(() => {});
  play(i);
}

function openBar() {
  const btn = (name, label, fn, html = icon[name]) => h('button', { class: 'icon-btn', 'aria-label': label, title: label, html, onclick: fn });
  const s = state;
  s.bPlay = h('button', { class: 'btn small tts-play', 'aria-label': 'Pause', html: icon.pause, onclick: toggle });
  s.label = h('span', { class: 'tts-label' });
  s.bRate = h('button', { class: 'tts-rate', title: 'Speed', text: `${rate}×`, onclick: cycleRate });
  s.bar = h('div', { class: 'tts-bar', role: 'region', 'aria-label': 'Narration' },
    btn('prev', 'Previous paragraph', () => play(s.i - 1)),
    s.bPlay,
    btn('next', 'Next paragraph', () => play(s.i + 1)),
    s.label,
    s.bRate,
    btn('close', 'Stop listening', closeBar, ico.close),
  );
  document.body.append(s.bar);
  if ('mediaSession' in navigator) {
    navigator.mediaSession.metadata = new MediaMetadata({ title: s.ch.title, artist: document.title.split(' · ').at(-1) });
    const ms = navigator.mediaSession;
    ms.setActionHandler('play', () => !state?.playing && toggle());
    ms.setActionHandler('pause', () => state?.playing && toggle());
    ms.setActionHandler('previoustrack', () => state && play(state.i - 1));
    ms.setActionHandler('nexttrack', () => state && play(state.i + 1));
  }
}

function closeBar() {
  halt();
  clearHighlight();
  state.bar.remove();
  state.bar = null;
}

/** Stop whatever is sounding, keep the position. */
function halt() {
  audio.onended = audio.ontimeupdate = null;
  audio.pause();
  if (state?.speech) speechSynthesis.cancel();
  if (state) {
    state.speech = null;
    setPlaying(false);
  }
}

function setPlaying(on) {
  state.playing = on;
  if (state.bPlay) {
    state.bPlay.innerHTML = on ? icon.pause : icon.play;
    state.bPlay.setAttribute('aria-label', on ? 'Pause' : 'Play');
  }
}

function toggle() {
  const s = state;
  if (s.playing) {
    if (s.speech) speechSynthesis.pause();
    else audio.pause();
    setPlaying(false);
  } else if (s.speech) {
    speechSynthesis.resume();
    setPlaying(true);
  } else if (audio.src && !audio.src.startsWith('data:') && audio.currentTime > 0 && !audio.ended) {
    audio.play().catch(() => {});
    setPlaying(true);
  } else play(s.i);
}

function cycleRate() {
  rate = RATES[(RATES.indexOf(rate) + 1) % RATES.length];
  localStorage.setItem(RATE_KEY, String(rate));
  state.bRate.textContent = `${rate}×`;
  audio.playbackRate = rate;
}

const clip = (src) => {
  if (!urls.has(src)) {
    const p = fetch(src).then((r) => (r.ok ? r.blob() : Promise.reject(new Error(r.status)))).then((b) => URL.createObjectURL(b));
    p.catch(() => urls.delete(src));
    urls.set(src, p);
  }
  return urls.get(src);
};

let loaded = null; // src whose clip is in the audio element (a section clip holds several blocks)

function setLabel(s) {
  const b = s.blocks[s.i];
  s.label.textContent = `${s.i + 1} / ${s.blocks.length}`;
  s.label.title = `Voice: ${b.voice}`;
}

async function play(i) {
  const s = state;
  if (!s) return;
  if (i < 0) i = 0;
  if (i >= s.blocks.length) {
    closeBar();
    s.i = 0;
    return;
  }
  halt();
  s.i = i;
  const b = s.blocks[i];
  setLabel(s);
  show(b);
  setPlaying(true);
  const next = s.blocks.slice(i + 1).find((x) => x.src && x.src !== b.src);
  if (next) clip(next.src).catch(() => {});

  if (b.src) {
    try {
      const url = await clip(b.src);
      if (state !== s || s.i !== i || !s.playing) return;
      if (loaded !== b.src) {
        audio.src = url;
        loaded = b.src;
        await new Promise((ok, fail) => {
          audio.onloadedmetadata = ok;
          audio.onerror = fail;
        });
        if (state !== s || s.i !== i || !s.playing) return;
      }
      audio.currentTime = b.start ?? 0;
      audio.playbackRate = rate;
      // Within a section clip, move the highlight on when the playhead passes a block's end.
      audio.ontimeupdate = () => {
        const cur = s.blocks[s.i];
        const nx = s.blocks[s.i + 1];
        if (state === s && cur.end != null && nx?.src === cur.src && audio.currentTime >= nx.start - 0.05) {
          s.i++;
          setLabel(s);
          show(nx);
        }
      };
      audio.onended = () => state === s && play(s.i + 1);
      await audio.play();
      return;
    } catch {
      loaded = null;
      if (state !== s || s.i !== i) return; // offline and never heard: fall through to the browser voice
    }
  }
  if (!('speechSynthesis' in window)) return setPlaying(false);
  const u = new SpeechSynthesisUtterance(b.text);
  u.rate = rate;
  u.onend = () => state === s && s.i === i && play(i + 1);
  s.speech = u;
  speechSynthesis.speak(u);
}

// ---------- highlighting and figures ----------
const norm = (t) => t.replace(/\s+/g, ' ');

function targets(b) {
  const root = state.article;
  if (b.sel) return [root.querySelector(b.sel)].filter(Boolean);
  if (b.figure) {
    const t = [...root.querySelectorAll('.fig-title')].find((el) => norm(el.textContent).trim() === b.figure);
    return t ? [t.closest('figure')] : [];
  }
  const all = [...root.querySelectorAll(BLOCKS)];
  return b.at
    .map((a) => all.filter((el) => norm(el.textContent).includes(a)).sort((x, y) => x.textContent.length - y.textContent.length)[0])
    .filter(Boolean);
}

function clearHighlight() {
  state?.article.querySelectorAll('.tts-now').forEach((el) => el.classList.remove('tts-now'));
}

function show(b) {
  clearHighlight();
  const els = targets(b);
  if (!els.length) console.warn('narration: nothing to highlight for', b);
  els.forEach((el) => el.classList.add('tts-now', 'in'));
  if (b.figure && b.step != null) els[0]?.querySelector('.player')?.player?.go(b.step);
  const first = els[0];
  if (first) {
    const r = first.getBoundingClientRect();
    const barTop = state.bar?.getBoundingClientRect().top ?? innerHeight;
    if (r.top < 64 || r.top > barTop - 80) first.scrollIntoView({ behavior: 'smooth', block: r.height > innerHeight * 0.6 ? 'start' : 'center' });
  }
}
