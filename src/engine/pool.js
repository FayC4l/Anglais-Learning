// Anti-repetition: prefer questions never seen, then seen long ago, and avoid the previous attempt. Pure.
import { rng as defaultRng } from "./rng.js";

/**
 * Freshness score of a ref (lower is fresher): never seen → 0, seen n times → n,
 * part of the previous attempt → 1000 + n (only used when nothing else is left).
 */
export function freshness(ref, history = {}) {
  const n = history.count?.[ref] || 0;
  return (history.last || []).includes(ref) ? 1000 + n : n;
}

/** Picks the freshest ref of `pool` that is not in `used` (random among ties), or null. */
export function pickFresh(pool, history = {}, used = new Set(), rng = defaultRng) {
  const last = new Set(history.last || []);
  const count = history.count || {};
  let best = Infinity;
  let ties = [];
  for (const r of pool) {
    if (used.has(r)) continue;
    const s = (last.has(r) ? 1000 : 0) + (count[r] || 0);
    if (s < best) {
      best = s;
      ties = [r];
    } else if (s === best) ties.push(r);
  }
  return ties.length ? ties[Math.floor(rng() * ties.length)] : null;
}

/** Picks up to n fresh refs from pool. */
export function selectFresh(pool, n, history = {}, rng = defaultRng) {
  const used = new Set();
  const out = [];
  while (out.length < n) {
    const r = pickFresh(pool, history, used, rng);
    if (r == null) break;
    used.add(r);
    out.push(r);
  }
  return out;
}

/** History after an attempt that used `ids` (only stable content refs are worth remembering). */
export function recordSeen(history = {}, ids = []) {
  const count = { ...(history.count || {}) };
  const kept = ids.filter((id) => id && !String(id).startsWith("gen:"));
  for (const id of kept) count[id] = (count[id] || 0) + 1;
  return { last: kept, count, attempts: (history.attempts || 0) + 1 };
}
