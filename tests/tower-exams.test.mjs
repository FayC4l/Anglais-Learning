// Every boss of the Tower (level 12), built many times: each question must be well formed and answerable, the
// floor must test its own tenses, difficulty must grow, and every writing boss must be winnable.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { buildDictionary } from "../tools/dictionary.mjs";

const read = (f) => JSON.parse(readFileSync(`content/${f}`, "utf8").replace(/^﻿/, ""));
const levels = readdirSync("content").filter((f) => /^level-\d\d\.json$/.test(f)).sort().map(read);
const extra = { boss: {}, lexicon: {}, c2uoe: read("c2-uoe.json"), wordform: read("wordform.json"), writing: read("writing.json"), c2papers: read("c2-papers.json") };
for (const f of readdirSync("content")) {
  const m = f.match(/^boss-(\d\d)\.json$/);
  if (m) extra.boss[Number(m[1])] = read(f);
}
globalThis.window = { __CONTENT__: levels, __EXTRA__: extra, speechSynthesis: { getVoices: () => [{ lang: "en-CA", voiceURI: "x", name: "x" }], addEventListener() {} } };

const { towerExam } = await import("../src/questions.js");
const { state } = await import("../src/store.js");
const { FLOORS, floorSpec } = await import("../src/tower.js");
const { TENSES } = await import("../src/engine/verbs.js");
const { matches, forms, clean, tiles, tileKey } = await import("../src/answer.js");
const { gapWords } = await import("../src/fill.js");

const RUNS = 25;
const KINDS = new Set(["type_en", "choose_fr", "listen_type", "listen_choose", "build", "dictation", "mcq", "fill", "error", "reading", "listening"]);
const conjFloors = Array.from({ length: FLOORS - 1 }, (_, i) => i + 1).filter((n) => floorSpec(n).kind === "conj");
const tenseOf = (q) => (String(q.ref).startsWith("gen:conj|") ? TENSES[Number(q.ref.split("|")[1])]?.id : null);
const modeOf = (q) => Number(String(q.ref).split("|")[4]);

/** The problems of one question ([] when it is fine). */
function problems(q) {
  const bad = [];
  const say = (m) => bad.push(`${q.kind} ${q.ref || q.q}: ${m}`);
  if (!KINDS.has(q.kind)) return [`unknown kind ${q.kind}`];
  if (!(q.time >= 12 && q.time < 400)) say(`time ${q.time}`);
  if (typeof q.expected !== "string" || !q.expected.trim()) say("no expected answer");
  for (const k of ["q", "hint", "expected", "explain", "fr"]) if (/\b(undefined|null|NaN)\b/.test(String(q[k] ?? ""))) say(`"${k}" prints undefined/null`);
  switch (q.kind) {
    case "fill":
      if (String(q.q).split("___").length !== 2) say("needs exactly one gap ___");
      if (!q.accept?.length) say("no accepted answers");
      else if (!matches(q.expected, q.accept)) say("the expected answer is refused");
      if (!gapWords(q.expected).length) say("no word boxes");
      if (tenseOf(q) && !q.hint) say("conjugation without hint");
      break;
    case "mcq": {
      const keys = q.choices.map(clean);
      if (q.choices.length < 2) say("fewer than 2 choices");
      if (new Set(keys).size !== keys.length) say(`duplicate choices ${q.choices.join(" | ")}`);
      if (q.choices[q.answer] !== q.expected) say("answer index does not point to the expected answer");
      break;
    }
    case "error": {
      if (!(q.wrong >= 0 && q.wrong < q.tokens.length)) say("wrong token out of range");
      if (!q.accept?.length) say("no fix");
      const wrongWord = String(q.tokens[q.wrong] || "").replace(/[.,!?;:]+$/, "");
      if (q.accept?.some((a) => forms(a).has(clean(wrongWord)))) say(`the "wrong" word ${wrongWord} is accepted as its own fix`);
      break;
    }
    case "build":
      if (!q.accepted.includes(tileKey(q.words))) say("the sentence itself is refused");
      if (q.words.some((w) => !q.bank.includes(w))) say("a word is missing from the bank");
      break;
    case "type_en":
    case "listen_type":
    case "dictation":
      if (!matches(q.expected, q.accept)) say("the expected answer is refused");
      break;
    default:
      if (Array.isArray(q.choices) && q.choices[q.answer] !== q.expected) say("answer index does not point to the expected answer");
  }
  return bad;
}

test("every conjugation floor builds a full, well-formed exam, many times over", () => {
  state.seen.tower = {};
  const bad = [];
  for (const n of conjFloors) {
    const spec = floorSpec(n);
    for (let r = 0; r < RUNS; r++) {
      const qs = towerExam(n);
      if (qs.length !== spec.count) bad.push(`floor ${n}: ${qs.length} questions instead of ${spec.count}`);
      for (const q of qs) bad.push(...problems(q).map((m) => `floor ${n}: ${m}`));
    }
  }
  assert.deepEqual([...new Set(bad)].slice(0, 25), []);
});

test("each floor drills its own tenses (and only earlier ones for review)", () => {
  const bad = [];
  for (const n of conjFloors) {
    const spec = floorSpec(n);
    const allowed = new Set([...spec.tenses, ...spec.review]);
    let own = 0;
    let total = 0;
    for (let r = 0; r < 10; r++) {
      const qs = towerExam(n);
      total += qs.length;
      for (const q of qs) {
        const t = tenseOf(q);
        if (!t) continue;
        if (!allowed.has(t)) bad.push(`floor ${n}: tense ${t} not taught yet`);
        if (spec.tenses.includes(t)) own++;
      }
    }
    // At least 40 % of the questions conjugate the floor's own tenses (when the block has tenses).
    if (spec.tenses.length && own / total < 0.4) bad.push(`floor ${n}: only ${Math.round((own / total) * 100)} % on its own tenses`);
  }
  assert.deepEqual([...new Set(bad)].slice(0, 20), []);
});

test("the climb gets harder: more questions, fewer mistakes allowed, less time, more negatives and questions", () => {
  const negShare = (n) => {
    let neg = 0;
    let all = 0;
    for (let r = 0; r < 40; r++)
      for (const q of towerExam(n))
        if (tenseOf(q)) {
          all++;
          if (modeOf(q) > 0) neg++;
        }
    return neg / all;
  };
  assert.ok(negShare(49) > negShare(1) + 0.2, "more negative and interrogative forms at the top");
  const time = (n) => {
    const qs = towerExam(n).filter((q) => tenseOf(q));
    return qs.reduce((s, q) => s + q.time, 0) / qs.length;
  };
  assert.ok(time(49) < time(1), "shorter timer at the top");
  for (let n = 2; n < FLOORS; n++) {
    const a = floorSpec(n - 1);
    const b = floorSpec(n);
    if (a.kind === "conj" && b.kind === "conj") {
      assert.ok(b.count >= a.count && b.hearts <= a.hearts && b.time <= a.time, `floor ${n} is not harder than ${n - 1}`);
    }
  }
});

test("a failed floor does not bring back the same exam", () => {
  for (const n of [3, 18, 37, 48]) {
    state.seen.tower = {};
    const a = towerExam(n).map((q) => q.ref || q.q);
    const b = new Set(towerExam(n).map((q) => q.ref || q.q));
    const same = a.filter((x) => b.has(x)).length / a.length;
    assert.ok(same <= 0.25, `floor ${n}: ${Math.round(same * 100)} % of the questions repeated`);
  }
});

test("every writing boss is winnable: prompts for every age, model answers above the bar", async () => {
  const { loadDictionary } = await import("../src/writing/spell.js");
  loadDictionary(buildDictionary(process.cwd(), levels));
  const { analyze } = await import("../src/writing/analyze.js");
  const { score } = await import("../src/writing/score.js");
  const bad = [];
  for (let n = 5; n < FLOORS; n += 5) {
    const s = floorSpec(n);
    assert.equal(s.kind, "writing");
    for (const age of ["enfant", "ado", "adulte"]) {
      const prompts = s.c2 ? extra.c2papers.writing : extra.writing.prompts.filter((p) => p.level === s.level && (!p.ages || p.ages.includes(age) || p.ages.includes("adulte")));
      if (prompts.length < 3) bad.push(`floor ${n}: only ${prompts.length} prompts for ${age}`);
      for (const p of prompts) {
        const prompt = s.c2 ? { ...p, level: 12, c2: true } : p;
        const mark = score(analyze(p.model || "", prompt), prompt).total;
        if (mark < s.pass + 1) bad.push(`floor ${n}: the model of ${p.id} only gets ${mark}/20 (bar ${s.pass})`);
      }
    }
  }
  assert.deepEqual([...new Set(bad)], []);
});

test("the final boss has a full C2 mock exam to offer", () => {
  const u = extra.c2uoe;
  const p = extra.c2papers;
  for (const k of ["part1", "part2", "part3"]) assert.ok(u[k]?.length >= 2, `${k} missing`);
  assert.ok(u.part4?.length >= 12, "part4: at least 12 transformations");
  for (const k of ["reading5", "reading6", "reading7"]) assert.ok(p[k]?.length >= 2, `${k} missing`);
  assert.ok(p.listening?.length >= 3, "two listening tasks per mock, and a spare");
  for (const t of u.part4) assert.equal(String(t.q).split("___").length, 2, `part4 ${t.id} needs one gap`);
  for (const it of [...u.part1]) for (const g of it.gaps) assert.ok(g.answer >= 0 && g.answer < g.choices.length, `${it.id}: answer out of range`);
  for (const it of p.reading6) assert.equal(new Set(it.answer).size, it.answer.length, `${it.id}: a paragraph used twice`);
  for (const it of p.reading7) {
    const labels = new Set(it.sections.map((s) => s.label));
    for (const st of it.statements) assert.ok(labels.has(st.answer), `${it.id}: unknown section ${st.answer}`);
  }
});

test("the tower's sentences stay natural: no duration with one-off actions", () => {
  const bad = [];
  for (const n of conjFloors)
    for (let r = 0; r < 6; r++)
      for (const q of towerExam(n)) {
        const t = tenseOf(q);
        if (["present_perfect_continuous", "past_perfect_continuous"].includes(t) && /\b(catch|send|take|call|buy|bring|order|make)\w*\b/i.test(q.hint || "")) bad.push(q.q);
        if (t === "present_perfect" && /\bsince\b/.test(q.q)) bad.push(q.q);
      }
  assert.deepEqual(bad.slice(0, 10), []);
});

test("original essays (not the models) win the writing bosses they are written for", async () => {
  const { analyze } = await import("../src/writing/analyze.js");
  const { score } = await import("../src/writing/score.js");
  const { copiedShare } = await import("../src/tower.js");
  const essays = JSON.parse(readFileSync("tests/fixtures/tower-essays.json", "utf8")).essays;
  for (const e of essays) {
    const p = extra.writing.prompts.find((x) => x.id === e.prompt) || { ...extra.c2papers.writing.find((x) => x.id === e.prompt), level: 12, c2: true };
    const a = analyze(e.text, p);
    const s = score(a, p);
    assert.ok(copiedShare(e.text, p.model) < 0.35, `${e.prompt}: looks copied`);
    assert.deepEqual(a.checks.filter((c) => !c.ok).map((c) => c.label), [], `${e.prompt}: requirements`);
    for (const n of e.floors) assert.ok(s.total >= floorSpec(n).pass, `${e.prompt}: ${s.total}/20 < ${floorSpec(n).pass} (floor ${n})`);
  }
});