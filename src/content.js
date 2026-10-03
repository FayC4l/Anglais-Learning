// Course content (injected at build time as window.__CONTENT__) and lookup helpers.

export const LEVELS = (globalThis.window?.__CONTENT__ || []).slice().sort((a, b) => a.id - b.id);

export const LINE_COUNT = 12;

export const levelById = (id) => LEVELS.find((l) => l.id === Number(id));

export function unitById(uid) {
  const [L, U] = String(uid).split(".").map(Number);
  return levelById(L)?.units?.[U - 1];
}

export const levelOfUnit = (uid) => Number(String(uid).split(".")[0]);

/** V2 content (boss banks, lexicons, placement, writing, humour, C2), injected as window.__EXTRA__. */
export const EXTRA = globalThis.window?.__EXTRA__ || { boss: {}, lexicon: {} };
EXTRA.boss ||= {};
EXTRA.lexicon ||= {};

const lexUnits = {};
/** Pseudo-unit holding a level's extra lexicon (id "L.0"), so vocab questions work unchanged. */
export function lexiconUnit(L) {
  const words = EXTRA.lexicon[L];
  if (!words?.length) return null;
  return (lexUnits[L] ||= { id: `${L}.0`, title: "Lexique", titleEn: "Word Bank", vocab: words, sentences: [], grammar: [] });
}
const PLACEMENT_UNIT = { id: "0.0", title: "Test de placement", vocab: [], sentences: [], grammar: [] };

/**
 * Resolves an item reference: "3.2:v5" (vocab), ":s" sentence, ":g" grammar, ":r" reading question,
 * "boss3:17" (boss bank), "lex3:12" (lexicon word), "place:p001" (placement question).
 */
export function resolveRef(ref) {
  const s = String(ref);
  let m = s.match(/^boss(\d+):(\d+)$/);
  if (m) {
    const item = EXTRA.boss[Number(m[1])]?.questions?.[Number(m[2])];
    const unit = item && unitById(item.unit);
    return item && unit ? { type: "grammar", item, unit, ref } : null;
  }
  m = s.match(/^lex(\d+):(\d+)$/);
  if (m) {
    const unit = lexiconUnit(Number(m[1]));
    const item = unit?.vocab[Number(m[2])];
    return item ? { type: "vocab", item, unit, ref } : null;
  }
  m = s.match(/^place:(\w+)$/);
  if (m) {
    const item = (EXTRA.placement?.questions || []).find((q) => q.id === m[1]);
    if (!item) return null;
    if (item.type === "mcq" || item.type === "fill") return { type: "grammar", item, unit: PLACEMENT_UNIT, ref };
    return { type: "reading", item, unit: PLACEMENT_UNIT, ref, reading: { title: item.type === "listening" ? "Écoute" : "Lecture", text: item.text || item.say }, kind: item.type };
  }
  const [uid, key] = s.split(":");
  const unit = unitById(uid);
  if (!unit || !key) return null;
  const t = key[0];
  const i = Number(key.slice(1));
  if (t === "v" && unit.vocab?.[i]) return { type: "vocab", item: unit.vocab[i], unit, ref };
  if (t === "s" && unit.sentences?.[i]) return { type: "sentence", item: unit.sentences[i], unit, ref };
  if (t === "g" && unit.grammar?.[i]) return { type: "grammar", item: unit.grammar[i], unit, ref };
  if (t === "r" && unit.reading?.questions?.[i]) return { type: "reading", item: unit.reading.questions[i], unit, ref, reading: unit.reading };
  return null;
}

export const vocabRefs = (u) => (u.vocab || []).map((_, i) => `${u.id}:v${i}`);
export const sentenceRefs = (u) => (u.sentences || []).map((_, i) => `${u.id}:s${i}`);
export const grammarRefs = (u, type) => (u.grammar || []).map((g, i) => (!type || g.type === type ? `${u.id}:g${i}` : null)).filter(Boolean);
export const readingRefs = (u) => (u.reading?.questions || []).map((_, i) => `${u.id}:r${i}`);

/** Every vocab item of a level, for distractors. */
export const levelVocab = (L) => (levelById(L)?.units || []).flatMap((u) => u.vocab || []);

export const bossRefs = (L) => (EXTRA.boss[L]?.questions || []).map((_, i) => `boss${L}:${i}`);
export const lexRefs = (L) => (EXTRA.lexicon[L] || []).map((_, i) => `lex${L}:${i}`);
export const placementItems = () => EXTRA.placement?.questions || [];
