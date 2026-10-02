// Speech synthesis for English audio, and synthesized sound effects (no audio files needed).
import { state } from "./store.js";

const synth = typeof window !== "undefined" ? window.speechSynthesis : null;
let voices = [];
const loadVoices = () => {
  try {
    voices = synth?.getVoices?.() || [];
  } catch {
    voices = [];
  }
};
loadVoices();
synth?.addEventListener?.("voiceschanged", loadVoices);

export const englishVoices = () => voices.filter((v) => /^en([-_]|$)/i.test(v.lang));
export const frenchVoices = () => voices.filter((v) => /^fr([-_]|$)/i.test(v.lang));

/** True when the device can read English aloud. */
export const ttsReady = () => !!synth && englishVoices().length > 0;
/** True when the device also has a French voice for the coach. */
export const coachReady = () => !!synth && frenchVoices().length > 0;

const NICE = /natural|neural|premium|enhanced|google|siri/i;

function chooseVoice(lang = "en") {
  if (lang === "fr") {
    const list = frenchVoices();
    if (!list.length) return null;
    const ranked = [...list.filter((v) => /fr[-_]CA/i.test(v.lang)), ...list.filter((v) => /fr[-_]FR/i.test(v.lang)), ...list];
    return ranked.find((v) => NICE.test(v.name)) || ranked[0];
  }
  const list = englishVoices();
  if (!list.length) return null;
  const wanted = list.find((v) => v.voiceURI === state.settings.voice);
  if (wanted) return wanted;
  const byLang = (re) => list.filter((v) => re.test(v.lang));
  const ranked = [...byLang(/en[-_]CA/i), ...byLang(/en[-_]US/i), ...byLang(/en[-_]GB/i), ...list];
  // Prefer natural/online voices when the platform offers them.
  return ranked.find((v) => NICE.test(v.name)) || ranked[0];
}

let token = 0;

/**
 * Speaks a sequence of parts [{text, lang: "en"|"fr", rate, pause}] one after the other.
 * Resolves true when finished, false when interrupted or unavailable.
 */
export function speakParts(parts, { onPart } = {}) {
  return new Promise((resolve) => {
    if (!synth || !parts?.length) return resolve(false);
    const my = ++token;
    try {
      synth.cancel();
    } catch {
      /* ignore */
    }
    // Long texts are split into sentences: some engines stop after ~15 seconds.
    const queue = [];
    parts.forEach((p, idx) => {
      const chunks = String(p.text || "").match(/[^.!?]+[.!?]*["”»]?\s*/g) || [String(p.text || "")];
      chunks.forEach((c, k) => queue.push({ ...p, text: c.trim(), idx, last: k === chunks.length - 1 }));
    });
    let i = 0;
    const next = () => {
      if (my !== token) return resolve(false);
      if (i >= queue.length) return resolve(true);
      const part = queue[i++];
      if (!part.text) return next();
      onPart?.(part.idx);
      const lang = part.lang === "fr" ? "fr" : "en";
      const voice = chooseVoice(lang);
      if (!voice && lang === "fr") return next(); // no French voice: skip coach lines
      const u = new SpeechSynthesisUtterance(part.text);
      if (voice) u.voice = voice;
      u.lang = voice?.lang || (lang === "fr" ? "fr-CA" : "en-US");
      const base = lang === "fr" ? 1.02 : state.settings.rate || 0.95;
      u.rate = Math.max(0.5, Math.min(1.6, base * (part.rate || 1)));
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        clearTimeout(guard);
        if (part.last && part.pause) setTimeout(next, part.pause);
        else next();
      };
      u.onend = finish;
      u.onerror = finish;
      const guard = setTimeout(finish, 2500 + part.text.length * 170 / (part.rate || 1));
      try {
        synth.speak(u);
      } catch {
        finish();
      }
    };
    // Safari sometimes needs a tick after cancel().
    setTimeout(next, 30);
  });
}

/** Speaks English text. */
export function speak(text, { rate = 1 } = {}) {
  return speakParts([{ text, lang: "en", rate }]);
}

/** Splits lesson markup into French narration and [[English]] parts. */
export function mixedParts(text) {
  const parts = [];
  String(text || "")
    .replace(/\*\*/g, "")
    .split(/(\[\[.+?\]\])/)
    .forEach((seg) => {
      if (!seg.trim()) return;
      const m = seg.match(/^\[\[(.+)\]\]$/);
      if (m) parts.push({ text: m[1], lang: "en", rate: 0.9 });
      else parts.push({ text: seg.replace(/[«»]/g, "").replace(/\s+/g, " ").trim(), lang: "fr" });
    });
  return parts.filter((p) => /[\p{L}\d]/u.test(p.text));
}

export function stopSpeaking() {
  token++;
  try {
    synth?.cancel();
  } catch {
    /* ignore */
  }
}

// ---------- Sound effects ----------

let ctx;
let master;
function ac() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.55;
    master.connect(ctx.destination);
  }
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

function tone(freq, dur, { type = "sine", vol = 0.2, at = 0, slide, attack = 0.005 } = {}) {
  const c = ac();
  if (!c) return;
  const t = c.currentTime + at;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function noise(dur, { vol = 0.2, at = 0, freq = 1200, q = 0.8, type = "bandpass" } = {}) {
  const c = ac();
  if (!c) return;
  const t = c.currentTime + at;
  const len = Math.floor(c.sampleRate * dur);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = c.createBufferSource();
  src.buffer = buf;
  const f = c.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  const g = c.createGain();
  g.gain.value = vol;
  src.connect(f).connect(g).connect(master);
  src.start(t);
}

const on = () => state.settings.sound !== false;

export const sfx = {
  tap: () => on() && tone(660, 0.05, { type: "triangle", vol: 0.08 }),
  correct: () => {
    if (!on()) return;
    tone(784, 0.1, { type: "triangle", vol: 0.16 });
    tone(1175, 0.18, { type: "triangle", vol: 0.16, at: 0.08 });
  },
  combo: (n = 2) => {
    if (!on()) return;
    const base = 523 * Math.pow(2, Math.min(n, 8) / 12);
    [0, 4, 7, 12].forEach((s, i) => tone(base * Math.pow(2, s / 12), 0.12, { type: "square", vol: 0.05, at: i * 0.05 }));
  },
  wrong: () => {
    if (!on()) return;
    tone(220, 0.28, { type: "sawtooth", vol: 0.09, slide: 110 });
    tone(233, 0.28, { type: "square", vol: 0.04, slide: 116 });
  },
  tick: () => on() && tone(1400, 0.03, { type: "square", vol: 0.04 }),
  flip: () => on() && noise(0.09, { vol: 0.18, freq: 2400, q: 0.6 }),
  pop: () => {
    if (!on()) return;
    tone(900, 0.08, { type: "sine", vol: 0.2, slide: 300 });
    noise(0.05, { vol: 0.08, freq: 3000 });
  },
  whoosh: () => on() && noise(0.25, { vol: 0.15, freq: 900, q: 0.4, type: "lowpass" }),
  hit: () => {
    if (!on()) return;
    noise(0.18, { vol: 0.35, freq: 500, q: 0.5, type: "lowpass" });
    tone(140, 0.2, { type: "sine", vol: 0.3, slide: 50 });
  },
  hurt: () => {
    if (!on()) return;
    tone(160, 0.35, { type: "sawtooth", vol: 0.12, slide: 60 });
    noise(0.3, { vol: 0.2, freq: 300, type: "lowpass" });
  },
  win: () => {
    if (!on()) return;
    const notes = [523, 659, 784, 1047, 784, 1047, 1319];
    notes.forEach((f, i) => tone(f, i === notes.length - 1 ? 0.6 : 0.14, { type: "triangle", vol: 0.14, at: i * 0.11 }));
  },
  lose: () => {
    if (!on()) return;
    [392, 370, 349, 262].forEach((f, i) => tone(f, i === 3 ? 0.6 : 0.22, { type: "triangle", vol: 0.13, at: i * 0.22 }));
  },
  level: () => {
    if (!on()) return;
    [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => tone(f, 0.16, { type: "square", vol: 0.06, at: i * 0.07 }));
    tone(2093, 0.7, { type: "triangle", vol: 0.12, at: 0.45 });
  },
  type: () => on() && tone(1800 + Math.random() * 400, 0.015, { type: "square", vol: 0.015 }),
};

/** Must be called from a user gesture once, so later sounds may play. */
export function unlockAudio() {
  ac();
  loadVoices();
}
