// Validates level content files. Usage: node tools/validate.mjs content/level-03.json [more files]
// With no argument, validates every file in content/.
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { clean, forms, tiles, tileKey, matches } from "../src/answer.js";
import { wordCountMismatches } from "../src/fill.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
let files = process.argv.slice(2);
if (!files.length) files = readdirSync(join(root, "content")).filter((f) => /^level-\d\d\.json$/.test(f)).map((f) => join(root, "content", f));

let totalErrors = 0;
let totalWarnings = 0;

for (const file of files) {
  const errors = [];
  const warnings = [];
  const err = (where, msg) => errors.push(`${where}: ${msg}`);
  const warn = (where, msg) => warnings.push(`${where}: ${msg}`);
  let data;
  try {
    data = JSON.parse(readFileSync(file, "utf8").replace(/^\uFEFF/, ""));
  } catch (e) {
    console.log(`\n${file}\n  ERROR invalid JSON: ${e.message}`);
    totalErrors++;
    continue;
  }
  const str = (v) => typeof v === "string" && v.trim().length > 0;
  const L = data.id;
  if (!Number.isInteger(L) || L < 1 || L > 12) err("level", "id must be an integer 1-12");
  for (const k of ["cefr", "title", "titleEn", "intro"]) if (!str(data[k])) err("level", `missing ${k}`);
  if (!data.boss || !str(data.boss.name) || !str(data.boss.taunt) || !str(data.boss.defeat)) err("level", "boss needs name, taunt, defeat");
  if (!Array.isArray(data.units) || data.units.length < 4 || data.units.length > 5) err("level", "units must have 5 entries (4 tolerated during the transition)");
  else if (data.units.length === 4) warn("level", "only 4 units: the bonus station L.5 is missing");

  const levelEn = new Map();
  const levelFr = new Map();
  const markupCheck = (where, text) => {
    if (typeof text !== "string") return;
    const open = (text.match(/\[\[/g) || []).length;
    const close = (text.match(/\]\]/g) || []).length;
    if (open !== close) err(where, "unbalanced [[ ]] markup");
    if ((text.match(/\*\*/g) || []).length % 2) err(where, "unbalanced ** markup");
  };

  (data.units || []).forEach((u, ui) => {
    const U = `unit ${u?.id ?? ui + 1}`;
    if (u.id !== `${L}.${ui + 1}`) err(U, `id must be "${L}.${ui + 1}"`);
    for (const k of ["title", "titleEn", "goal"]) if (!str(u[k])) err(U, `missing ${k}`);
    if (str(u.titleEn) && u.titleEn.split(" ").length > 5) warn(U, "titleEn is long for a station name");

    // Lesson
    const lesson = Array.isArray(u.lesson) ? u.lesson : [];
    if (lesson.length < 5 || lesson.length > 12) err(U, `lesson must have 5-12 blocks (has ${lesson.length})`);
    const types = new Set(lesson.map((b) => b?.type));
    for (const t of ["rule", "examples", "tip", "dialogue"]) if (!types.has(t)) err(U, `lesson needs a "${t}" block`);
    lesson.forEach((b, bi) => {
      const W = `${U} lesson[${bi}]`;
      switch (b?.type) {
        case "p": case "tip": case "fun":
          if (!str(b.text)) err(W, "text required"); markupCheck(W, b.text); break;
        case "rule":
          if (!str(b.title) || !str(b.text)) err(W, "rule needs title and text"); markupCheck(W, b.text); break;
        case "table":
          if (!Array.isArray(b.head) || !Array.isArray(b.rows) || !b.rows.length) err(W, "table needs head and rows");
          else b.rows.forEach((r, ri) => { if (!Array.isArray(r) || r.length !== b.head.length) err(W, `row ${ri} has ${r?.length} cells, head has ${b.head.length}`); r?.forEach?.((c) => markupCheck(W, c)); });
          break;
        case "examples":
          if (!Array.isArray(b.items) || b.items.length < 2) err(W, "examples needs at least 2 items");
          else b.items.forEach((it, k) => { if (!str(it.en) || !str(it.fr)) err(W, `item ${k} needs en and fr`); });
          break;
        case "dialogue":
          if (!Array.isArray(b.lines) || b.lines.length < 4 || b.lines.length > 10) err(W, "dialogue needs 4-10 lines");
          else b.lines.forEach((ln, k) => { if (!str(ln.who) || !str(ln.en) || !str(ln.fr)) err(W, `line ${k} needs who, en, fr`); if (/\d/.test(ln.en)) warn(W, `line ${k} has digits (TTS)`); });
          break;
        default:
          err(W, `unknown block type "${b?.type}"`);
      }
    });

    // Vocab
    const vocab = Array.isArray(u.vocab) ? u.vocab : [];
    const [vmin, vmax] = L <= 4 ? [14, 16] : [16, 20];
    if (vocab.length < vmin || vocab.length > vmax) err(U, `vocab must have ${vmin}-${vmax} items (has ${vocab.length})`);
    vocab.forEach((v, vi) => {
      const W = `${U} vocab[${vi}] "${v?.en}"`;
      if (!str(v.en) || !str(v.fr)) return err(W, "en and fr required");
      if (/[.!?]$/.test(v.en.trim()) && v.en.split(" ").length < 4) warn(W, "en should not end with punctuation");
      if (v.alt !== undefined && !Array.isArray(v.alt)) err(W, "alt must be an array");
      if (v.ex !== undefined && !str(v.ex)) err(W, "ex must be a non-empty string");
      if (v.ex && /\d/.test(v.ex)) warn(W, "ex contains digits");
      const ek = clean(v.en);
      if (levelEn.has(ek)) err(W, `en duplicates ${levelEn.get(ek)}`); else levelEn.set(ek, W);
      const fk = v.fr.trim().toLowerCase();
      if (levelFr.has(fk)) err(W, `fr duplicates ${levelFr.get(fk)}`); else levelFr.set(fk, W);
    });

    // Sentences
    const sentences = Array.isArray(u.sentences) ? u.sentences : [];
    if (sentences.length < 10 || sentences.length > 12) err(U, `sentences must have 10-12 items (has ${sentences.length})`);
    const [smin, smax] = L <= 4 ? [3, 10] : L <= 8 ? [5, 14] : [6, 18];
    const seen = new Set();
    sentences.forEach((s, si) => {
      const W = `${U} sentences[${si}] "${s?.en}"`;
      if (!str(s.en) || !str(s.fr)) return err(W, "en and fr required");
      if (!/[.?!]$/.test(s.en.trim())) err(W, "en must end with . ? or !");
      if (/\d/.test(s.en)) err(W, "no digits allowed in en (write numbers in words)");
      if (/\s{2,}/.test(s.en)) err(W, "double space in en");
      const t = tiles(s.en);
      if (t.length < smin || t.length > smax) warn(W, `${t.length} words (expected ${smin}-${smax})`);
      const key = tileKey(t);
      if (seen.has(key)) err(W, "duplicate sentence"); seen.add(key);
      if (!Array.isArray(s.trap) || s.trap.length < 1 || s.trap.length > 3) err(W, "trap must have 1-3 words");
      else {
        const words = new Set(t.map((w) => clean(w)));
        s.trap.forEach((tr) => {
          if (!str(tr)) err(W, "empty trap");
          else if (words.has(clean(tr))) err(W, `trap "${tr}" is also a word of the sentence`);
          if (str(tr) && tr.trim().includes(" ")) warn(W, `trap "${tr}" has a space (tiles are single words)`);
        });
      }
      if (s.alt !== undefined && !Array.isArray(s.alt)) err(W, "alt must be an array");
      (s.alt || []).forEach((a) => {
        const sortKey = (x) => tiles(x).map((w) => clean(w)).sort().join(" ");
        if (sortKey(a) !== sortKey(s.en)) err(W, `alt "${a}" must use exactly the same words as en`);
      });
    });

    // Grammar
    const grammar = Array.isArray(u.grammar) ? u.grammar : [];
    if (grammar.length < 15 || grammar.length > 18) err(U, `grammar must have 15-18 exercises (has ${grammar.length})`);
    const count = { mcq: 0, fill: 0, error: 0 };
    grammar.forEach((g, gi) => {
      const W = `${U} grammar[${gi}] (${g?.type}) "${g?.q}"`;
      if (!str(g.q)) return err(W, "q required");
      if (!str(g.explain)) err(W, "explain required");
      if (g.type in count) count[g.type]++;
      if (g.type === "mcq") {
        if (!Array.isArray(g.choices) || g.choices.length < 3 || g.choices.length > 4) return err(W, "mcq needs 3-4 choices");
        if (!Number.isInteger(g.answer) || g.answer < 0 || g.answer >= g.choices.length) err(W, "answer index out of range");
        const cs = g.choices.map((c) => clean(c));
        if (new Set(cs).size !== cs.length) err(W, "duplicate choices");
        if ((g.q.match(/___/g) || []).length > 1) warn(W, "more than one blank");
      } else if (g.type === "fill") {
        if ((g.q.match(/___/g) || []).length !== 1) err(W, "fill q must contain ___ exactly once");
        if (/_{4,}/.test(g.q)) err(W, "use exactly three underscores");
        if (!Array.isArray(g.answer) || !g.answer.length || !g.answer.every(str)) err(W, "answer must be a non-empty array of strings");
        if (g.hint !== undefined && !str(g.hint)) err(W, "hint must be a non-empty string");
        if (Array.isArray(g.answer) && g.hint && g.answer.some((a) => matches(g.hint, a)) && g.hint.split(" ").length < 3) warn(W, "hint equals the answer");
        if (Array.isArray(g.answer)) wordCountMismatches(g.answer).forEach((a) => warn(W, `answer "${a}" has a different word count than "${g.answer[0]}" (one box per word)`));
        if (g.lead !== undefined && !str(g.lead)) err(W, "lead must be a non-empty string");
        if (g.key !== undefined && (!str(g.key) || g.key !== g.key.toUpperCase())) err(W, "key must be an UPPERCASE word");
        if (g.key && Array.isArray(g.answer) && g.answer.some((a) => !clean(a).split(" ").includes(clean(g.key)))) err(W, "every answer must contain the key word");
      } else if (g.type === "error") {
        const t = g.q.split(" ");
        if (!Number.isInteger(g.wrong) || g.wrong < 0 || g.wrong >= t.length) return err(W, `wrong index out of range (0-${t.length - 1})`);
        if (!Array.isArray(g.fix) || !g.fix.length || !g.fix.every(str)) return err(W, "fix must be a non-empty array of strings");
        const wrongTok = t[g.wrong].replace(/[.,!?;:]+$/, "");
        if (g.fix.some((f) => matches(wrongTok, f))) err(W, `fix equals the wrong token "${wrongTok}"`);
      } else err(W, `unknown exercise type "${g.type}"`);
    });
    if (count.mcq < 5) err(U, `needs at least 5 mcq (has ${count.mcq})`);
    if (count.fill < 5) err(U, `needs at least 5 fill (has ${count.fill})`);
    if (count.error < 4) err(U, `needs at least 4 error (has ${count.error})`);
    const answerPos = grammar.filter((g) => g.type === "mcq").map((g) => g.answer);
    if (answerPos.length >= 5 && new Set(answerPos).size === 1) warn(U, "all mcq answers are at the same position");

    // Reading
    if (L >= 5 && !u.reading) err(U, "reading required from level 5");
    if (L <= 2 && u.reading) warn(U, "no reading expected at levels 1-2");
    if (u.reading) {
      const r = u.reading;
      const W = `${U} reading`;
      if (!str(r.title) || !str(r.text)) err(W, "title and text required");
      else {
        const wc = r.text.split(/\s+/).length;
        const [rmin, rmax] = L <= 4 ? [60, 100] : L <= 6 ? [100, 150] : L <= 8 ? [150, 220] : L <= 10 ? [200, 280] : [250, 350];
        if (wc < rmin * 0.9 || wc > rmax * 1.1) warn(W, `${wc} words (expected ${rmin}-${rmax})`);
        if (/\d/.test(r.text)) err(W, "no digits in reading text (TTS)");
      }
      if (!Array.isArray(r.questions) || r.questions.length < 4 || r.questions.length > 6) err(W, "4-6 questions required");
      else r.questions.forEach((q, qi) => {
        if (!str(q.q) || !Array.isArray(q.choices) || q.choices.length !== 4) err(`${W} q${qi}`, "needs q and 4 choices");
        else if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer > 3) err(`${W} q${qi}`, "answer index out of range");
      });
    }
  });

  totalErrors += errors.length;
  totalWarnings += warnings.length;
  console.log(`\n${file}: ${errors.length} errors, ${warnings.length} warnings`);
  errors.forEach((e) => console.log("  ERROR " + e));
  warnings.forEach((w) => console.log("  warn  " + w));
}
console.log(`\nTOTAL: ${totalErrors} errors, ${totalWarnings} warnings`);
process.exit(totalErrors ? 1 : 0);
