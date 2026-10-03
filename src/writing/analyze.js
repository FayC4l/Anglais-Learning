// Text analysis: tenses, connectors, lexical range, requirement checks, then the issues. Pure.
import { tokenize } from "./tokenize.js";
import { checkRules, S_FORM, PAST, PP, ING, BASE } from "./rules.js";
import { tierOf, suggest } from "./spell.js";

export const CONNECTORS = [
  // basic
  "and", "but", "so", "because", "then", "also", "or", "first", "next", "finally", "after that", "later", "when",
  // intermediate
  "however", "although", "though", "even though", "therefore", "moreover", "furthermore", "in addition", "on the other hand",
  "as a result", "consequently", "nevertheless", "whereas", "while", "despite", "in spite of", "since", "unless", "in order to",
  "so that", "for example", "for instance", "in conclusion", "to sum up", "firstly", "secondly", "thirdly", "meanwhile",
  "eventually", "instead", "otherwise", "besides", "as well as", "not only", "on top of that", "such as", "in fact", "actually",
  // advanced
  "thus", "hence", "nonetheless", "notwithstanding", "accordingly", "admittedly", "likewise", "similarly", "in contrast",
  "by contrast", "above all", "all in all", "to conclude", "in other words", "that said", "even so", "given that",
  "provided that", "as long as", "insofar as", "whereby", "albeit", "conversely", "ultimately", "arguably", "undeniably",
];
const ADVANCED = new Set(CONNECTORS.slice(CONNECTORS.indexOf("thus")));
const BASIC = new Set(CONNECTORS.slice(0, CONNECTORS.indexOf("however")));

const STOP = new Set("the a an and or but so to of in on at for with is are was were be been am i you he she it we they my your his her our their this that these those there here not do does did have has had will would can could should me him us them what who which when where why how as by from up out about into than then too very just also if".split(" "));

const BE_PRES = new Set(["am", "is", "are", "'m", "'re", "isn't", "aren't"]);
const BE_PAST = new Set(["was", "were", "wasn't", "weren't"]);
const BE_ANY = new Set([...BE_PRES, ...BE_PAST, "be", "been", "being"]);
const HAVE_PRES = new Set(["have", "has", "haven't", "hasn't", "'ve"]);
const MODAL = new Set(["can", "could", "should", "must", "might", "may", "can't", "couldn't", "shouldn't", "mustn't", "cannot", "ought"]);
const ADV = new Set(["not", "already", "just", "never", "ever", "always", "also", "still", "often", "really", "finally", "recently", "probably", "usually", "sometimes"]);

/** Splits contractions so "he's" → ["he", "'s"], "didn't" stays one auxiliary. */
function expand(tokens) {
  const out = [];
  for (const t of tokens) {
    if (!t.word) continue;
    const m = t.lower.match(/^(i|you|he|she|it|we|they|that|there|what|who|where|how|here)('m|'re|'s|'ve|'ll|'d)$/);
    if (m) out.push({ ...t, lower: m[1] }, { ...t, lower: m[2] });
    else out.push(t);
  }
  return out;
}

const isPP = (w) => PP.has(w) || (/ed$/.test(w) && (PAST.has(w) || BASE.has(w.replace(/d$/, "")) || BASE.has(w.replace(/ed$/, "")) || BASE.has(w.replace(/ied$/, "y"))));
const isIng = (w) => ING.has(w) || (/ing$/.test(w) && w.length > 5 && tierOf(w) > 0 && !["thing", "nothing", "something", "anything", "everything", "morning", "evening", "during", "ceiling", "building", "wedding", "pudding", "king", "ring", "spring", "string", "wing", "sibling"].includes(w));

/** Counts verb phrases per tense (approximate, good enough to check a requirement). */
export function detectTenses(tokens) {
  const W = expand(tokens).map((t) => t.lower);
  const c = { present_simple: 0, present_continuous: 0, past_simple: 0, past_continuous: 0, present_perfect: 0, past_perfect: 0, future: 0, conditional: 0, passive: 0, modal: 0 };
  const after = (i) => (ADV.has(W[i + 1]) ? i + 2 : i + 1);
  for (let i = 0; i < W.length; i++) {
    const w = W[i];
    const n = W[after(i)] || "";
    if (BE_ANY.has(w) || w === "'s") {
      if (isIng(n) && n !== "going") c[BE_PAST.has(w) ? "past_continuous" : "present_continuous"]++;
      else if (n === "going" && W[after(i) + 1] === "to") c.future++;
      else if (isPP(n) && !["used", "supposed", "born"].includes(n)) c.passive++;
      else if (BE_PRES.has(w) || (w === "'s" && !isPP(n))) c.present_simple++;
      else if (BE_PAST.has(w)) c.past_simple++;
      continue;
    }
    if (HAVE_PRES.has(w) && isPP(n) && n !== "to") {
      c.present_perfect++;
      continue;
    }
    if ((w === "had" || w === "hadn't" || w === "'d") && isPP(n)) {
      c.past_perfect++;
      continue;
    }
    if (["will", "'ll", "won't", "shall"].includes(w) && BASE.has(n)) {
      c.future++;
      continue;
    }
    if (["would", "wouldn't", "'d"].includes(w) && BASE.has(n)) {
      c.conditional++;
      continue;
    }
    if (MODAL.has(w) || ((w === "have" || w === "has" || w === "need" || w === "needs") && n === "to")) {
      c.modal++;
      continue;
    }
    if (["did", "didn't"].includes(w)) {
      c.past_simple++;
      continue;
    }
    if (["do", "does", "don't", "doesn't"].includes(w)) {
      c.present_simple++;
      continue;
    }
    const prev = W[i - 1] || "";
    const prev2 = W[i - 2] || "";
    const auxBefore = [prev, prev2].some((p) => BE_ANY.has(p) || HAVE_PRES.has(p) || ["had", "'d", "get", "got", "to", "will", "would", "can", "could", "should", "must", "might", "may", "did", "didn't", "does", "doesn't", "do", "don't"].includes(p));
    if (auxBefore) continue;
    if (PAST.has(w) && !BASE.has(w)) c.past_simple++;
    else if (S_FORM.has(w)) c.present_simple++;
    else if (BASE.has(w) && ["i", "you", "we", "they"].includes(prev)) c.present_simple++;
    else if (BASE.has(w) && ADV.has(prev) && ["i", "you", "we", "they"].includes(prev2)) c.present_simple++;
  }
  return c;
}

/** Connectors used (with counts). */
export function detectConnectors(text) {
  const low = ` ${text.toLowerCase().replace(/[^a-z' ]+/g, " ").replace(/\s+/g, " ")} `;
  const found = {};
  for (const k of CONNECTORS) {
    const n = low.split(` ${k} `).length - 1;
    if (n) found[k] = n;
  }
  return found;
}

/** Moving-average type-token ratio (window 40): lexical diversity independent of length. */
export function mattr(words, win = 40) {
  if (!words.length) return 0;
  if (words.length <= win) return new Set(words).size / words.length;
  let sum = 0;
  let n = 0;
  for (let i = 0; i + win <= words.length; i++) {
    sum += new Set(words.slice(i, i + win)).size / win;
    n++;
  }
  return sum / n;
}

const GREETING = /^\s*(dear|hi|hello|hey|good (morning|afternoon|evening)|to whom it may concern)\b/i;
const SIGNOFF = /\b(best wishes|best regards|kind regards|regards|yours (sincerely|faithfully|truly)|sincerely|love|cheers|see you( soon)?|take care|talk soon|thanks again|all the best|bye)\b[^.!?]*[,.!]?\s*\n*\s*[A-Z]?[\w-]*\s*$/i;
const SLANG = /\b(gonna|wanna|gotta|kinda|sorta|lol|omg|u|ur|cuz|dunno|ain't|yeah|nope)\b/gi;

/** Checks the prompt's requirements. */
export function checkRequire(req = [], a) {
  return req.map((r) => {
    let got = 0;
    if (r.kind === "tense") got = r.value === "future" ? a.tenses.future : a.tenses[r.value] || 0;
    else if (r.kind === "connectors") got = Object.keys(a.connectors).length;
    else if (r.kind === "words") {
      const low = ` ${a.text.toLowerCase().replace(/[^a-z' -]+/g, " ")} `;
      got = r.value.filter((w) => low.includes(` ${w.toLowerCase()} `)).length;
    } else if (r.kind === "paragraphs") got = a.paragraphs;
    else if (r.kind === "questions") got = a.questions;
    return { ...r, got, ok: got >= r.min };
  });
}

/**
 * analyze(text, prompt) → full analysis used by the scorer and the report.
 * prompt: { level, type, words: [min, max], require: [...] }
 */
export function analyze(text, prompt = {}) {
  const tk = tokenize(text);
  const words = tk.tokens.filter((t) => t.word).map((t) => t.lower);
  const sentLens = tk.sentences.map((s) => s.tokens.filter((i) => tk.tokens[i].word).length).filter((n) => n > 0);
  const avg = sentLens.length ? sentLens.reduce((a, b) => a + b, 0) / sentLens.length : 0;
  const sd = sentLens.length > 1 ? Math.sqrt(sentLens.reduce((s, n) => s + (n - avg) ** 2, 0) / sentLens.length) : 0;
  const content = words.filter((w) => w.length >= 4 && !STOP.has(w));
  const tiers = { 1: 0, 2: 0, 3: 0 };
  for (const w of content) {
    const t = tierOf(w);
    if (t) tiers[t]++;
  }
  const freq = {};
  for (const w of content) freq[w] = (freq[w] || 0) + 1;
  const repeated = Object.entries(freq).filter(([w, n]) => n >= Math.max(3, Math.ceil(words.length / 40))).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const a = {
    text: tk.text,
    tk,
    words: words.length,
    sentences: sentLens.length,
    avgSentence: avg,
    sdSentence: sd,
    paragraphs: tk.paragraphs.length,
    questions: (text.match(/\?/g) || []).length,
    mattr: mattr(words),
    sophistication: content.length ? (tiers[2] + tiers[3] * 1.5) / content.length : 0,
    tenses: detectTenses(tk.tokens),
    connectors: detectConnectors(text),
    contractions: (text.match(/\b\w+'(m|re|s|ve|ll|d|t)\b/gi) || []).length,
    slang: (text.match(SLANG) || []).length,
    greeting: GREETING.test(text),
    signoff: SIGNOFF.test(text.trim()),
    repeated,
    issues: checkRules(tk, { suggest }),
  };
  a.advancedConnectors = Object.keys(a.connectors).filter((k) => ADVANCED.has(k));
  a.basicOnly = Object.keys(a.connectors).every((k) => BASIC.has(k));
  a.checks = checkRequire(prompt.require, a);
  return a;
}
