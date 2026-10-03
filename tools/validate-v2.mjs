// Validates the V2 content files (see docs/CONTENT_FORMATS_V2.md).
// Usage: node tools/validate-v2.mjs content/boss-03.json [more files]   (no argument: every V2 file)
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { clean, matches } from "../src/answer.js";
import { wordCountMismatches } from "../src/fill.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const contentDir = join(root, "content");
const V2 = /^(boss-\d\d|lexicon-\d\d|placement|writing|humor|wordform|c2-uoe|c2-papers)\.json$/;
let files = process.argv.slice(2);
if (!files.length) files = readdirSync(contentDir).filter((f) => V2.test(f)).sort().map((f) => join(contentDir, f));

const readJson = (p) => JSON.parse(readFileSync(p, "utf8").replace(/^\uFEFF/, ""));
const levelFile = (L) => join(contentDir, `level-${String(L).padStart(2, "0")}.json`);
const allLevels = readdirSync(contentDir).filter((f) => /^level-\d\d\.json$/.test(f)).sort().map((f) => readJson(join(contentDir, f)));
const str = (v) => typeof v === "string" && v.trim().length > 0;
const BANDS = ["A1", "A2", "B1", "B2", "C1", "C2"];
const TENSES = ["present_simple", "present_continuous", "past_simple", "past_continuous", "present_perfect", "future", "conditional", "passive", "past_perfect", "modal"];
const WTYPES = ["description", "email", "letter", "story", "message", "essay", "article", "review", "report", "proposal"];
const AGES = ["enfant", "ado", "adulte"];

let totalErrors = 0;
let totalWarnings = 0;

/** Shared checks for mcq / fill / error items. */
function checkExercise(g, W, err, warn) {
  if (!g || typeof g !== "object") return err(W, "not an object");
  if (!str(g.q)) return err(W, "q required");
  if (!str(g.explain)) err(W, "explain required");
  if (g.type === "mcq") {
    if (!Array.isArray(g.choices) || g.choices.length < 3 || g.choices.length > 4) return err(W, "mcq needs 3-4 choices");
    if (!Number.isInteger(g.answer) || g.answer < 0 || g.answer >= g.choices.length) err(W, "answer index out of range");
    const cs = g.choices.map((c) => clean(c));
    if (new Set(cs).size !== cs.length) err(W, "duplicate choices");
  } else if (g.type === "fill") {
    if ((g.q.match(/___/g) || []).length !== 1) err(W, "fill q must contain ___ exactly once");
    if (/_{4,}/.test(g.q)) err(W, "use exactly three underscores");
    if (!Array.isArray(g.answer) || !g.answer.length || !g.answer.every(str)) return err(W, "answer must be a non-empty array of strings");
    wordCountMismatches(g.answer).forEach((a) => err(W, `answer "${a}" has a different word count than "${g.answer[0]}"`));
    if (g.hint !== undefined && !str(g.hint)) err(W, "hint must be a non-empty string");
    if (g.key !== undefined && (!str(g.key) || g.key !== g.key.toUpperCase())) err(W, "key must be UPPERCASE");
    if (g.key && g.answer.some((a) => !clean(a).split(" ").includes(clean(g.key)))) err(W, "every answer must contain the key");
  } else if (g.type === "error") {
    const t = g.q.split(" ");
    if (!Number.isInteger(g.wrong) || g.wrong < 0 || g.wrong >= t.length) return err(W, `wrong index out of range (0-${t.length - 1})`);
    if (!Array.isArray(g.fix) || !g.fix.length || !g.fix.every(str)) return err(W, "fix must be a non-empty array of strings");
    const wrongTok = t[g.wrong].replace(/[.,!?;:]+$/, "");
    if (g.fix.some((f) => matches(wrongTok, f))) err(W, `fix equals the wrong token "${wrongTok}"`);
  } else err(W, `unknown type "${g.type}"`);
}

const mcq4 = (q, W, err, n = 4) => {
  if (!str(q?.q)) return err(W, "q required");
  if (!Array.isArray(q.choices) || q.choices.length !== n) return err(W, `needs ${n} choices`);
  if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer >= n) err(W, "answer index out of range");
  if (new Set(q.choices.map(clean)).size !== n) err(W, "duplicate choices");
};

const gapCheck = (text, n, W, err) => {
  for (let i = 1; i <= n; i++) {
    const c = text.split(`{${i}}`).length - 1;
    if (c !== 1) err(W, `gap {${i}} appears ${c} times`);
  }
  if (new RegExp(`\\{${n + 1}\\}`).test(text)) err(W, `unexpected gap {${n + 1}}`);
};

const words = (s) => String(s).split(/\s+/).filter(Boolean).length;

const validators = {
  boss(d, err, warn, file) {
    const L = d.level;
    if (!Number.isInteger(L) || L < 1 || L > 12) return err("file", "level must be 1-12");
    const want = `boss-${String(L).padStart(2, "0")}.json`;
    if (basename(file) !== want) err("file", `file name should be ${want}`);
    for (const k of ["phase2", "phase3", "lose"]) {
      const a = d.taunts?.[k];
      if (!Array.isArray(a) || a.length < 3 || !a.every(str)) err("taunts", `${k} needs at least 3 lines`);
    }
    const qs = Array.isArray(d.questions) ? d.questions : [];
    if (qs.length !== 60) err("questions", `must have exactly 60 (has ${qs.length})`);
    const count = { mcq: 0, fill: 0, error: 0 };
    const perUnit = {};
    const lvl = existsSync(levelFile(L)) ? readJson(levelFile(L)) : null;
    // A question is a duplicate when its stem AND its answers match (generic stems like "Quelle phrase est correcte ?" are fine).
    const qKey = (g) => clean([g.q, ...(g.choices || []), ...[].concat(g.answer ?? []), ...(g.fix || [])].join(" | "));
    const unitQ = new Set((lvl?.units || []).flatMap((u) => [...(u.grammar || []).map(qKey), ...(u.sentences || []).map((s) => clean(s.en))]));
    const seen = new Set();
    qs.forEach((g, i) => {
      const W = `q${i} (${g?.type}) "${g?.q}"`;
      if (!new RegExp(`^${L}\\.[1-5]$`).test(g?.unit || "")) err(W, `unit must be "${L}.1"-"${L}.5"`);
      perUnit[g?.unit] = (perUnit[g?.unit] || 0) + 1;
      if (g?.type in count) count[g.type]++;
      checkExercise(g, W, err, warn);
      const k = qKey(g || {});
      if (seen.has(k)) err(W, "duplicate question"); seen.add(k);
      if (unitQ.has(k) || unitQ.has(clean(g?.q))) err(W, "reuses a sentence of the level's units");
    });
    if (count.mcq < 18) err("questions", `needs >= 18 mcq (has ${count.mcq})`);
    if (count.fill < 22) err("questions", `needs >= 22 fill (has ${count.fill})`);
    if (count.error < 14) err("questions", `needs >= 14 error (has ${count.error})`);
    for (let U = 1; U <= 5; U++) {
      const n = perUnit[`${L}.${U}`] || 0;
      if (n < (U === 5 ? 6 : 9)) err("questions", `unit ${L}.${U} has ${n} questions (min ${U === 5 ? 6 : 9})`);
    }
    const pos = qs.filter((g) => g?.type === "mcq").map((g) => g.answer);
    if (pos.length && Math.max(...[0, 1, 2, 3].map((p) => pos.filter((x) => x === p).length)) > pos.length * 0.5) warn("questions", "mcq answers too often at the same position");
  },

  placement(d, err, warn) {
    const qs = Array.isArray(d.questions) ? d.questions : [];
    const ids = new Set();
    const per = Object.fromEntries(BANDS.map((b) => [b, { mcq: 0, fill: 0, reading: 0, listening: 0 }]));
    qs.forEach((q, i) => {
      const W = `${q?.id || i} (${q?.band} ${q?.type})`;
      if (!str(q?.id) || ids.has(q.id)) err(W, "id missing or duplicate"); ids.add(q?.id);
      if (!BANDS.includes(q?.band)) return err(W, "band must be A1..C2");
      if (!(q.type in per[q.band])) return err(W, "type must be mcq, fill, reading or listening");
      per[q.band][q.type]++;
      if (q.type === "mcq" || q.type === "fill") checkExercise(q, W, err, warn);
      else {
        if (!str(q.explain)) err(W, "explain required");
        mcq4(q, W, err);
        if (q.type === "reading") {
          if (!str(q.text)) err(W, "text required");
          else if (words(q.text) < 30 || words(q.text) > 140) warn(W, `text has ${words(q.text)} words (40-120)`);
        } else {
          if (!str(q.say)) err(W, "say required");
          else if (/\d/.test(q.say)) err(W, "no digits in say (TTS)");
        }
      }
    });
    for (const b of BANDS) {
      const c = per[b];
      const tot = c.mcq + c.fill + c.reading + c.listening;
      if (tot < 25) err(b, `needs 25 questions (has ${tot})`);
      if (c.mcq < 12 || c.fill < 7 || c.reading < 3 || c.listening < 3) err(b, `needs 12 mcq / 7 fill / 3 reading / 3 listening (has ${JSON.stringify(c)})`);
    }
  },

  lexicon(d, err, warn, file) {
    const L = d.level;
    if (!Number.isInteger(L) || L < 1 || L > 12) return err("file", "level must be 1-12");
    const ws = Array.isArray(d.words) ? d.words : [];
    if (ws.length < 150) err("words", `needs 150 words (has ${ws.length})`);
    const unitEn = new Map();
    for (const l of allLevels) for (const u of l.units) for (const v of u.vocab || []) unitEn.set(clean(v.en), u.id);
    const otherLex = new Map();
    for (const f of readdirSync(contentDir).filter((f) => /^lexicon-\d\d\.json$/.test(f) && f !== basename(file))) {
      try {
        for (const w of readJson(join(contentDir, f)).words || []) otherLex.set(clean(w.en), f);
      } catch {
        /* other file invalid: reported when validated */
      }
    }
    const en = new Set();
    const fr = new Set();
    ws.forEach((w, i) => {
      const W = `words[${i}] "${w?.en}"`;
      if (!str(w?.en) || !str(w?.fr) || !str(w?.ex) || !str(w?.theme)) return err(W, "en, fr, ex, theme required");
      if (!["noun", "verb", "adj", "adv", "phrase", "other"].includes(w.pos)) err(W, "pos must be noun/verb/adj/adv/phrase/other");
      if (/\d/.test(w.ex)) err(W, "no digits in ex");
      const k = clean(w.en);
      if (en.has(k)) err(W, "duplicate en"); en.add(k);
      if (unitEn.has(k)) err(W, `already taught in unit ${unitEn.get(k)}`);
      if (otherLex.has(k)) err(W, `already in ${otherLex.get(k)}`);
      const f = w.fr.trim().toLowerCase();
      if (fr.has(f)) err(W, "duplicate fr"); fr.add(f);
    });
  },

  writing(d, err, warn) {
    const ps = Array.isArray(d.prompts) ? d.prompts : [];
    const ids = new Set();
    const per = {};
    ps.forEach((p, i) => {
      const W = `${p?.id || i}`;
      if (!str(p?.id) || ids.has(p.id)) err(W, "id missing or duplicate"); ids.add(p?.id);
      if (!Number.isInteger(p?.level) || p.level < 1 || p.level > 12) return err(W, "level must be 1-12");
      (per[p.level] ||= []).push(p);
      if (!WTYPES.includes(p.type)) err(W, `type must be one of ${WTYPES.join(", ")}`);
      for (const k of ["title", "prompt", "model"]) if (!str(p[k])) err(W, `${k} required`);
      if (p.ages !== undefined && (!Array.isArray(p.ages) || !p.ages.length || p.ages.some((a) => !AGES.includes(a)))) err(W, "ages must be a subset of enfant/ado/adulte");
      if (!Array.isArray(p.words) || p.words.length !== 2 || !(p.words[0] < p.words[1])) err(W, "words must be [min, max]");
      else if (str(p.model)) {
        const n = words(p.model);
        if (n < p.words[0] * 0.95 || n > p.words[1] * 1.05) err(W, `model has ${n} words, outside ${p.words.join("-")}`);
      }
      checkRequire(p.require, W, err);
    });
    for (let L = 1; L <= 12; L++) {
      const list = per[L] || [];
      if (list.length < 8) err(`level ${L}`, `needs 8 prompts (has ${list.length})`);
      const fits = (a) => list.filter((p) => !p.ages || p.ages.includes(a)).length;
      if (fits("adulte") < 2) err(`level ${L}`, "needs >= 2 prompts for adults");
      if (fits("enfant") < 2) err(`level ${L}`, "needs >= 2 prompts for children");
    }
  },

  humor(d, err, warn) {
    const sits = ["welcome", "correct", "wrong", "streak", "timeout", "perfect", "fail", "comeback", "writing_good", "writing_bad"];
    for (const s of sits) {
      const a = d.quips?.[s];
      if (!Array.isArray(a) || a.length < 20) err("quips", `${s} needs at least 20 lines (has ${a?.length || 0})`);
      (a || []).forEach((q, i) => {
        const W = `quips.${s}[${i}]`;
        if (!str(q?.text)) return err(W, "text required");
        if (q.text.length > 160) warn(W, `${q.text.length} characters (max 140)`);
        if (q.ages !== undefined && (!Array.isArray(q.ages) || q.ages.some((x) => !AGES.includes(x)))) err(W, "ages must be a subset of enfant/ado/adulte");
        if ((q.text.match(/\[\[/g) || []).length !== (q.text.match(/\]\]/g) || []).length) err(W, "unbalanced [[ ]]");
      });
    }
    const jokes = Array.isArray(d.jokes) ? d.jokes : [];
    if (jokes.length < 70) err("jokes", `needs at least 70 (has ${jokes.length})`);
    const seen = new Set();
    jokes.forEach((j, i) => {
      const W = `jokes[${i}]`;
      if (!str(j?.en) || !str(j?.fr)) return err(W, "en and fr required");
      if (!Number.isInteger(j.level) || j.level < 1 || j.level > 12) err(W, "level must be 1-12");
      const k = clean(j.en);
      if (seen.has(k)) err(W, "duplicate joke"); seen.add(k);
    });
  },

  wordform(d, err) {
    const items = Array.isArray(d.items) ? d.items : [];
    if (items.length < 150) err("items", `needs 150 items (has ${items.length})`);
    const seen = new Set();
    items.forEach((it, i) => {
      const W = `items[${i}] ${it?.stem}`;
      if (!Number.isInteger(it?.level) || it.level < 7 || it.level > 12) err(W, "level must be 7-12");
      if (!str(it?.stem) || it.stem !== it.stem.toUpperCase()) err(W, "stem must be UPPERCASE");
      if (!str(it?.explain)) err(W, "explain required");
      if (!str(it?.q) || (it.q.match(/___/g) || []).length !== 1) err(W, "q must contain ___ exactly once");
      if (!Array.isArray(it?.answer) || !it.answer.length || it.answer.some((a) => !str(a) || a.trim().includes(" "))) err(W, "answer must be single words");
      const k = clean(it?.q);
      if (seen.has(k)) err(W, "duplicate q"); seen.add(k);
    });
  },

  "c2-uoe"(d, err, warn) {
    const sets = (k, n) => {
      const a = Array.isArray(d[k]) ? d[k] : [];
      if (a.length < n) err(k, `needs ${n} sets (has ${a.length})`);
      return a;
    };
    const ids = new Set();
    const idOk = (x, W) => {
      if (!str(x?.id) || ids.has(x.id)) err(W, "id missing or duplicate");
      ids.add(x?.id);
    };
    for (const [k, n] of [["part1", 6], ["part2", 6], ["part3", 6]]) {
      sets(k, n).forEach((s, i) => {
        const W = `${k}[${i}] ${s?.id}`;
        idOk(s, W);
        if (!str(s?.title) || !str(s?.text)) return err(W, "title and text required");
        gapCheck(s.text, 8, W, err);
        if (/\d(?![^{]*\})/.test(s.text.replace(/\{\d\}/g, ""))) warn(W, "digits in text");
        if (!Array.isArray(s.gaps) || s.gaps.length !== 8) return err(W, "needs 8 gaps");
        s.gaps.forEach((g, j) => {
          const G = `${W} gap ${j + 1}`;
          if (!str(g?.explain)) err(G, "explain required");
          if (k === "part1") {
            if (!Array.isArray(g?.choices) || g.choices.length !== 4) err(G, "needs 4 choices");
            else if (!Number.isInteger(g.answer) || g.answer < 0 || g.answer > 3) err(G, "answer index out of range");
          } else {
            if (!Array.isArray(g?.answer) || !g.answer.length || g.answer.some((a) => !str(a) || a.trim().includes(" "))) err(G, "answer must be single words");
            if (k === "part3" && (!str(g?.stem) || g.stem !== g.stem.toUpperCase())) err(G, "stem must be UPPERCASE");
          }
        });
        if (k === "part1") {
          const n = words(s.text);
          if (n < 140 || n > 240) warn(W, `${n} words (160-220)`);
        }
      });
    }
    sets("part4", 48).forEach((t, i) => {
      const W = `part4[${i}] ${t?.id}`;
      idOk(t, W);
      if (!str(t?.lead)) err(W, "lead required");
      checkExercise({ ...t, type: "fill" }, W, err, warn);
      if (!str(t?.key)) err(W, "key required");
      (t?.answer || []).forEach((a) => {
        const n = words(a);
        if (n < 3 || n > 8) err(W, `answer "${a}" has ${n} words (3-8)`);
      });
    });
  },

  "c2-papers"(d, err, warn) {
    const arr = (k, n) => {
      const a = Array.isArray(d[k]) ? d[k] : [];
      if (a.length < n) err(k, `needs ${n} (has ${a.length})`);
      return a;
    };
    const ids = new Set();
    const idOk = (x, W) => {
      if (!str(x?.id) || ids.has(x.id)) err(W, "id missing or duplicate");
      ids.add(x?.id);
    };
    arr("reading5", 4).forEach((r, i) => {
      const W = `reading5[${i}] ${r?.id}`;
      idOk(r, W);
      if (!str(r?.title) || !str(r?.text)) return err(W, "title and text required");
      const n = words(r.text);
      if (n < 500 || n > 760) warn(W, `${n} words (550-700)`);
      if (!Array.isArray(r.questions) || r.questions.length !== 6) err(W, "needs 6 questions");
      (r.questions || []).forEach((q, j) => {
        mcq4(q, `${W} q${j}`, err);
        if (!str(q?.explain)) err(`${W} q${j}`, "explain required");
      });
    });
    arr("reading6", 3).forEach((r, i) => {
      const W = `reading6[${i}] ${r?.id}`;
      idOk(r, W);
      if (!str(r?.title) || !Array.isArray(r?.parts)) return err(W, "title and parts required");
      const gaps = r.parts.filter((p) => p === "{gap}").length;
      if (gaps !== 7) err(W, `needs 7 {gap} (has ${gaps})`);
      if (!Array.isArray(r.options) || r.options.length !== 8 || !r.options.every(str)) err(W, "needs 8 options");
      if (!Array.isArray(r.answer) || r.answer.length !== 7 || new Set(r.answer).size !== 7 || r.answer.some((a) => !Number.isInteger(a) || a < 0 || a > 7)) err(W, "answer must be 7 distinct indexes 0-7");
      if (!str(r.explain)) err(W, "explain required");
    });
    arr("reading7", 3).forEach((r, i) => {
      const W = `reading7[${i}] ${r?.id}`;
      idOk(r, W);
      const labels = (r?.sections || []).map((s) => s?.label);
      if (labels.length < 4 || labels.length > 6 || (r.sections || []).some((s) => !str(s?.label) || !str(s?.text))) err(W, "needs 4-6 sections with label and text");
      if (!Array.isArray(r?.statements) || r.statements.length !== 10) err(W, "needs 10 statements");
      (r?.statements || []).forEach((s, j) => {
        if (!str(s?.text) || !labels.includes(s?.answer)) err(`${W} s${j}`, "text and a valid section label required");
      });
      for (const l of labels) if (!(r?.statements || []).some((s) => s.answer === l)) err(W, `section ${l} is never used`);
    });
    const parts = { 1: 0, 2: 0, 3: 0, 4: 0 };
    arr("listening", 8).forEach((l, i) => {
      const W = `listening[${i}] ${l?.id}`;
      idOk(l, W);
      if (!(l?.part in parts)) return err(W, "part must be 1-4");
      parts[l.part]++;
      if (!str(l.title) || !Array.isArray(l.lines) || !l.lines.length) return err(W, "title and lines required");
      l.lines.forEach((ln, j) => {
        if (!str(ln?.who) || !str(ln?.en)) err(`${W} line ${j}`, "who and en required");
        else if (/\d/.test(ln.en)) err(`${W} line ${j}`, "no digits (TTS)");
      });
      const n = l.part === 1 || l.part === 3 ? 3 : 4;
      if (!Array.isArray(l.questions) || l.questions.length < 3 || l.questions.length > 6) err(W, "needs 3-6 questions");
      (l.questions || []).forEach((q, j) => {
        mcq4(q, `${W} q${j}`, err, n);
        if (!str(q?.explain)) err(`${W} q${j}`, "explain required");
      });
    });
    for (const p of [1, 2, 3, 4]) if (parts[p] < 2) err("listening", `part ${p} needs 2 recordings`);
    let p1 = 0;
    arr("writing", 8).forEach((w, i) => {
      const W = `writing[${i}] ${w?.id}`;
      idOk(w, W);
      if (w?.part === 1) {
        p1++;
        if (!Array.isArray(w.texts) || w.texts.length !== 2 || !w.texts.every(str)) err(W, "part 1 needs 2 texts");
      } else if (w?.part !== 2) err(W, "part must be 1 or 2");
      if (!WTYPES.includes(w?.type)) err(W, "invalid type");
      for (const k of ["title", "prompt", "model"]) if (!str(w?.[k])) err(W, `${k} required`);
      if (!Array.isArray(w?.words) || w.words.length !== 2) err(W, "words must be [min, max]");
      else if (str(w.model)) {
        const n = words(w.model);
        if (n < w.words[0] * 0.95 || n > w.words[1] * 1.05) err(W, `model has ${n} words, outside ${w.words.join("-")}`);
      }
      checkRequire(w?.require, W, err);
    });
    if (p1 < 3) err("writing", `needs 3 part 1 essays (has ${p1})`);
    arr("speaking", 12).forEach((s, i) => {
      const W = `speaking[${i}] ${s?.id}`;
      idOk(s, W);
      if (![1, 2, 3].includes(s?.part)) err(W, "part must be 1-3");
      if (!str(s?.prompt)) err(W, "prompt required");
      if (!Array.isArray(s?.useful) || s.useful.length < 4) err(W, "useful needs 4-6 phrases");
    });
  },
};

function checkRequire(req, W, err) {
  if (req === undefined) return;
  if (!Array.isArray(req)) return err(W, "require must be an array");
  req.forEach((r, j) => {
    const R = `${W} require[${j}]`;
    if (!str(r?.label)) err(R, "label required");
    if (!Number.isInteger(r?.min) || r.min < 1) err(R, "min must be a positive integer");
    if (r?.kind === "tense") {
      if (!TENSES.includes(r.value)) err(R, `tense value must be one of ${TENSES.join(", ")}`);
    } else if (r?.kind === "words") {
      if (!Array.isArray(r.value) || !r.value.length || !r.value.every(str)) err(R, "words value must be a list");
    } else if (!["connectors", "paragraphs", "questions"].includes(r?.kind)) err(R, `unknown kind "${r?.kind}"`);
  });
}

for (const file of files) {
  const errors = [];
  const warnings = [];
  const err = (where, msg) => errors.push(`${where}: ${msg}`);
  const warn = (where, msg) => warnings.push(`${where}: ${msg}`);
  const name = basename(file);
  const kind = name.replace(/-\d\d\.json$/, "").replace(/\.json$/, "");
  let data;
  try {
    data = readJson(file);
  } catch (e) {
    console.log(`\n${file}\n  ERROR invalid JSON: ${e.message}`);
    totalErrors++;
    continue;
  }
  if (!validators[kind]) {
    console.log(`\n${file}\n  ERROR unknown V2 file kind "${kind}"`);
    totalErrors++;
    continue;
  }
  validators[kind](data, err, warn, file);
  totalErrors += errors.length;
  totalWarnings += warnings.length;
  console.log(`\n${file}: ${errors.length} errors, ${warnings.length} warnings`);
  errors.slice(0, 200).forEach((e) => console.log("  ERROR " + e));
  if (errors.length > 200) console.log(`  … ${errors.length - 200} more errors`);
  warnings.forEach((w) => console.log("  warn  " + w));
}
console.log(`\nTOTAL: ${totalErrors} errors, ${totalWarnings} warnings`);
process.exit(totalErrors ? 1 : 0);

