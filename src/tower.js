// The Tower of Chikh Fayçal (level 12): 50 floors, each guarded by a boss, 10 hearts for the whole climb.
// Floors 5, 10 … 45 are writing bosses, floor 50 is the C2 Proficiency mock exam. Pure (no DOM).

export const FLOORS = 50;
export const TOWER_LIVES = 10;
export const TOWER_LEVEL = 12;
/** The player only sees 5 floors and the final boss: each floor won past the 5th reveals one more (a running joke). */
export const VISIBLE = 5;

/** Themes: blocks of 5 floors (the 5th floor of each block is a writing boss). */
export const BLOCKS = [
  { from: 1, title: "Le présent", tenses: ["present_simple", "present_continuous"], gens: ["ps3", "psneg", "doq", "err_s", "err_doesnt", "pc"], units: ["3.1", "3.2", "4.1"] },
  { from: 6, title: "Le passé", tenses: ["past_simple", "past_continuous"], gens: ["past_reg", "past_irr", "irr_past", "err_overreg", "pastneg", "pastq", "err_did", "pastcont"], units: ["5.1", "5.2", "5.3", "5.4", "5.5"] },
  { from: 11, title: "Le present perfect", tenses: ["present_perfect", "present_perfect_continuous"], gens: ["pp", "irr_pp", "forsince", "ppc"], units: ["6.3", "6.4"] },
  { from: 16, title: "Raconter au passé", tenses: ["past_perfect", "past_perfect_continuous", "past_continuous"], gens: ["pastperf", "pastcont", "irr_pp"], units: ["9.1", "5.4"] },
  { from: 21, title: "Le futur", tenses: ["will", "going_to", "future_continuous", "future_perfect"], gens: ["future", "futcont", "futperf"], units: ["6.1", "7.5"] },
  { from: 26, title: "Les conditionnels", tenses: ["would", "would_have"], gens: ["cond2", "cond3"], units: ["7.2", "8.1", "10.1"] },
  { from: 31, title: "La voix passive", tenses: [], gens: ["passive"], units: ["8.2", "8.5"] },
  { from: 36, title: "Modaux et discours rapporté", tenses: [], gens: [], units: ["7.1", "10.2", "9.2"] },
  { from: 41, title: "Inversion, subjonctif et souhaits", tenses: [], gens: ["cond3"], units: ["11.1", "12.1", "10.1"], part4: true },
  { from: 46, title: "La grande révision C2", tenses: "all", gens: ["irr_pp", "passive", "cond3", "wordform", "err_overreg"], units: ["11.5", "12.2", "12.3", "12.5"], part4: true },
];
const ALL_TENSES = BLOCKS.flatMap((b) => (Array.isArray(b.tenses) ? b.tenses : []));

/** What a floor is made of. */
export function floorSpec(n) {
  if (n >= FLOORS) return { n: FLOORS, kind: "final", title: "Le boss final : l'examen C2 Proficiency", pass: 200 };
  if (n % 5 === 0) {
    const level = n <= 10 ? 9 : n <= 20 ? 10 : n <= 30 ? 11 : 12;
    return { n, kind: "writing", title: "Boss d'expression écrite", level, c2: n === 45, pass: Math.min(15, Math.round((10.5 + n / 10) * 2) / 2) };
  }
  const block = BLOCKS.filter((b) => b.from <= n).pop();
  const k = n - block.from + 1; // 1..4 inside the block
  const earlier = BLOCKS.filter((b) => b.from < block.from).flatMap((b) => (Array.isArray(b.tenses) ? b.tenses : []));
  return {
    n,
    kind: "conj",
    title: block.title,
    step: k,
    tenses: block.tenses === "all" ? ALL_TENSES : block.tenses,
    review: [...new Set(earlier)],
    gens: block.gens,
    units: block.units,
    part4: !!block.part4,
    count: 10 + Math.floor(n / 5), // 10 → 19 questions
    hearts: n < 21 ? 3 : 2, // mistakes allowed in the fight
    time: Math.max(0.65, 1 - n * 0.007), // the timer tightens
    negQ: Math.min(0.75, 0.2 + k * 0.08 + n / 150), // more negatives and questions
  };
}

export const freshTower = () => ({ floor: 1, lives: TOWER_LIVES, best: 1, resets: 0, won: false, wonAt: "", shown: VISIBLE, pending: 0 });

/** Highest ordinary floor on display (the final boss is always drawn on top of it). */
export const visibleTop = (t) => (t.won ? FLOORS - 1 : Math.min(FLOORS - 1, Math.max(VISIBLE, t.floor)));

/** True when the current floor has just appeared and its reveal has not been played yet. */
export const surprise = (t) => !t.won && t.floor < FLOORS && t.floor > (t.shown || VISIBLE);

/**
 * Applies the result of the boss of floor n. Returns { event, lives, floor }:
 * "next" (floor won), "victory" (floor 50 won), "life" (a heart lost), "collapse" (no heart left: back to floor 1).
 */
export function recordFloor(t, n, win, now = new Date()) {
  if (t.won || n !== t.floor) return { event: "ignored", lives: t.lives, floor: t.floor };
  t.pending = 0;
  if (win) {
    if (n >= FLOORS) {
      t.won = true;
      t.wonAt = now.toISOString();
      return { event: "victory", lives: t.lives, floor: n };
    }
    t.floor = n + 1;
    t.best = Math.max(t.best || 1, t.floor);
    return { event: "next", lives: t.lives, floor: t.floor };
  }
  t.lives -= 1;
  if (t.lives <= 0) {
    t.floor = 1;
    t.lives = TOWER_LIVES;
    t.resets = (t.resets || 0) + 1;
    t.shown = VISIBLE; // the floors vanish with the tower… and will surprise again
    return { event: "collapse", lives: t.lives, floor: 1 };
  }
  return { event: "life", lives: t.lives, floor: t.floor };
}

/** Share of word trigrams of `text` found in `model` (to refuse a copied model answer). */
export function copiedShare(text, model) {
  const grams = (s) => {
    const w = String(s).toLowerCase().match(/[a-z']+/g) || [];
    const out = new Set();
    for (let i = 0; i + 2 < w.length; i++) out.add(`${w[i]} ${w[i + 1]} ${w[i + 2]}`);
    return out;
  };
  const a = grams(text);
  if (a.size < 5) return 0;
  const b = grams(model);
  let n = 0;
  a.forEach((g) => b.has(g) && n++);
  return n / a.size;
}
