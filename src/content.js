// Course content (injected at build time as window.__CONTENT__) and lookup helpers.

export const LEVELS = (window.__CONTENT__ || []).slice().sort((a, b) => a.id - b.id);

export const LINE_COUNT = 12;

export const levelById = (id) => LEVELS.find((l) => l.id === Number(id));

export function unitById(uid) {
  const [L, U] = String(uid).split(".").map(Number);
  return levelById(L)?.units?.[U - 1];
}

export const levelOfUnit = (uid) => Number(String(uid).split(".")[0]);

/** Resolves an item reference like "3.2:v5" (vocab), ":s" sentence, ":g" grammar, ":r" reading question. */
export function resolveRef(ref) {
  const [uid, key] = String(ref).split(":");
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
