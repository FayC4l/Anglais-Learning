// Splits a text into paragraphs, sentences and tokens with character offsets. Pure.

const WORD = /[A-Za-zÀ-ÿ]+(?:['’][A-Za-z]+)*(?:-[A-Za-z]+)*|\d+(?:[.,]\d+)*|[.!?]+|[,;:()"“”«»…—–-]/g;

/**
 * tokenize(text) → { tokens, sentences, paragraphs }
 *  token: { text, lower, start, end, word (letters), punct, s (sentence index) }
 *  sentence: { start, end, tokens: [indexes] }
 */
export function tokenize(text) {
  const src = String(text || "");
  const tokens = [];
  let m;
  WORD.lastIndex = 0;
  while ((m = WORD.exec(src))) {
    const t = m[0].replace(/’/g, "'");
    tokens.push({ text: t, lower: t.toLowerCase(), start: m.index, end: m.index + m[0].length, word: /^[A-Za-zÀ-ÿ]/.test(t), num: /^\d/.test(t), punct: !/^[A-Za-zÀ-ÿ\d]/.test(t) });
  }
  // Sentences end at . ! ? (or a blank line).
  const sentences = [];
  let cur = [];
  const close = () => {
    if (cur.length) sentences.push({ start: tokens[cur[0]].start, end: tokens[cur[cur.length - 1]].end, tokens: cur });
    cur = [];
  };
  tokens.forEach((t, i) => {
    if (cur.length && /\n\s*\n/.test(src.slice(tokens[i - 1].end, t.start))) close();
    t.s = sentences.length;
    cur.push(i);
    if (/^[.!?]+$/.test(t.text)) close();
  });
  close();
  tokens.forEach((t, i) => {
    // Re-number after the closing pass (blank lines may have closed sentences early).
    t.i = i;
  });
  sentences.forEach((s, k) => s.tokens.forEach((i) => (tokens[i].s = k)));
  const paragraphs = src.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  return { text: src, tokens, sentences, paragraphs };
}

/** Words only (no punctuation, no numbers), lowercased. */
export const wordsOf = (tk) => tk.tokens.filter((t) => t.word).map((t) => t.lower);
