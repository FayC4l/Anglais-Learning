// Spelling: dictionary (window.__DICT__, 3 frequency tiers, prefix-coded) + suggestions. Pure once loaded.

let TIER = null; // Map word → tier (1 frequent, 2 intermediate, 3 advanced)
let BY_LEN = null; // length → words

/** Decodes the dictionary string "tier1|tier2|tier3". Exposed for tests (pass a string). */
export function loadDictionary(encoded = globalThis.window?.__DICT__ || "") {
  TIER = new Map();
  BY_LEN = new Map();
  encoded.split("|").forEach((part, k) => {
    let prev = "";
    for (const item of part ? part.split(",") : []) {
      const p = parseInt(item[0], 36);
      const w = prev.slice(0, p) + item.slice(1);
      prev = w;
      if (!TIER.has(w)) {
        TIER.set(w, k + 1);
        if (!BY_LEN.has(w.length)) BY_LEN.set(w.length, []);
        BY_LEN.get(w.length).push(w);
      }
    }
  });
  return TIER.size;
}

const ensure = () => TIER || loadDictionary();
export const dictionaryReady = () => ensure().size > 0;

const CONTRACTED = new Set(["i'm", "i'd", "i'll", "i've", "you're", "you'd", "you'll", "you've", "he's", "he'd", "he'll", "she's", "she'd", "she'll", "it's", "it'd", "it'll", "we're", "we'd", "we'll", "we've", "they're", "they'd", "they'll", "they've", "that's", "that'll", "there's", "there'd", "there'll", "here's", "what's", "what'd", "where's", "who's", "who'd", "who'll", "how's", "let's", "isn't", "aren't", "wasn't", "weren't", "don't", "doesn't", "didn't", "haven't", "hasn't", "hadn't", "won't", "wouldn't", "can't", "couldn't", "shouldn't", "mustn't", "needn't", "mightn't", "shan't", "ain't", "y'all", "o'clock", "ma'am", "would've", "could've", "should've", "might've", "must've", "everyone's", "somebody's", "someone's", "nobody's", "everybody's", "it'd've"]);
const EXTRA_WORDS = new Set(["ok", "okay", "email", "emails", "online", "website", "websites", "smartphone", "smartphones", "selfie", "selfies", "app", "apps", "wifi", "youtube", "internet", "covid", "hashtag", "gonna", "wanna", "gotta", "eh", "poutine", "toque", "toonie", "loonie", "hockey", "esports", "vlog", "emoji", "emojis", "podcast", "podcasts", "videogame", "videogames", "laptop", "laptops", "texting", "googled", "google"]);

/** Tier of a known word (1-3), 0 when unknown. Handles contractions, possessives and hyphens. */
export function tierOf(word) {
  const dict = ensure();
  const w = String(word).toLowerCase().replace(/’/g, "'");
  if (!w || /\d/.test(w)) return 1;
  if (dict.has(w)) return dict.get(w);
  if (CONTRACTED.has(w) || EXTRA_WORDS.has(w)) return 1;
  if (/'s$/.test(w)) return tierOf(w.slice(0, -2));
  if (/s'$/.test(w)) return tierOf(w.slice(0, -1));
  if (w.includes("-")) {
    const parts = w.split("-").filter(Boolean);
    return parts.length && parts.every((p) => tierOf(p) > 0) ? Math.max(...parts.map(tierOf)) : 0;
  }
  return 0;
}

export const isKnown = (word) => tierOf(word) > 0;

/** Optimal string alignment distance with an early exit above `max`. */
export function distance(a, b, max = 2) {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    let rowMin = Infinity;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, d[i - 2][j - 2] + 1);
      d[i][j] = v;
      rowMin = Math.min(rowMin, v);
    }
    if (rowMin > max) return max + 1;
  }
  return d[a.length][b.length];
}

/** Up to n corrections for an unknown word, closest and most frequent first. */
export function suggest(word, n = 3) {
  ensure();
  const w = String(word).toLowerCase();
  const out = [];
  for (let len = w.length - 2; len <= w.length + 2; len++) {
    for (const c of BY_LEN.get(len) || []) {
      if (c[0] !== w[0] && distance(w, c, 1) > 1) continue; // first letter is usually right
      const dist = distance(w, c, 2);
      if (dist <= 2) out.push({ c, score: dist * 10 + TIER.get(c) * 2 + Math.abs(c.length - w.length) });
    }
  }
  out.sort((a, b) => a.score - b.score);
  const res = out.slice(0, n).map((x) => x.c);
  // Keep the capital letter of the original word.
  return /^[A-Z]/.test(word) ? res.map((s) => s[0].toUpperCase() + s.slice(1)) : res;
}
