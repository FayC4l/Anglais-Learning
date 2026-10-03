// Seedable pseudo-random numbers (mulberry32) and helpers, so generated questions can be rebuilt from a seed.

export function makeRng(seed = Date.now()) {
  let a = typeof seed === "number" ? seed >>> 0 : hashString(String(seed));
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  next.int = (n) => Math.floor(next() * n);
  next.pick = (arr) => arr[Math.floor(next() * arr.length)];
  next.shuffle = (arr) => {
    const out = arr.slice();
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(next() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  };
  next.sample = (arr, n) => next.shuffle(arr).slice(0, n);
  return next;
}

export function hashString(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Default generator for the app (not reproducible). */
export const rng = makeRng((Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0);
