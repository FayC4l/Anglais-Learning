import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { buildDictionary } from "../tools/dictionary.mjs";

const levels = readdirSync("content").filter((f) => /^level-\d\d\.json$/.test(f)).sort().map((f) => JSON.parse(readFileSync(`content/${f}`, "utf8")));
const { loadDictionary, isKnown, suggest } = await import("../src/writing/spell.js");
loadDictionary(buildDictionary(process.cwd(), levels));
const { tokenize } = await import("../src/writing/tokenize.js");
const { checkRules } = await import("../src/writing/rules.js");
const { analyze, detectTenses } = await import("../src/writing/analyze.js");
const { score } = await import("../src/writing/score.js");

const rulesOf = (text) => checkRules(tokenize(text)).map((x) => x.rule);

// [sentence, expected rule, expected fix (first suggestion, optional)]
const MISTAKES = [
  ["He go to school every day.", "third-s", "goes"],
  ["My sister like pizza.", null],
  ["She always forget her keys.", "third-s", "forgets"],
  ["They goes to the park on Sundays.", "plural-s", "go"],
  ["She doesn't likes carrots.", "do-base", "like"],
  ["Did you saw the game last night?", "do-base", "see"],
  ["I didn't went to school yesterday.", "do-base", "go"],
  ["We can to swim very well.", "modal-to", "can swim"],
  ["You must goes now.", "modal-base", "go"],
  ["I have twelve years.", "have-age", "am twelve years old"],
  ["I am agree with you.", "be-agree", "agree"],
  ["I live here since two years.", "since-duration", "for two years"],
  ["It depends of the weather.", "depend-of", "depends on"],
  ["She is married with a doctor.", "married-with", "married to"],
  ["I listen music every evening.", "listen-to", "listen to music"],
  ["We discussed about the problem.", "discuss-about", "discussed"],
  ["Can you explain me the rule?", "explain-me", "explain to me"],
  ["My bike is more big than yours.", "more-short", "bigger"],
  ["This is more better.", "more-comp", "better"],
  ["She gave me many advices.", "uncountable-plural", "advice"],
  ["I need an information.", "uncountable-article", null],
  ["There are three childs in the garden.", "irregular-plural", "children"],
  ["They are differents people.", "adjective-plural", "different people"],
  ["I should of called you.", "modal-of", "should have"],
  ["Its very cold today.", "its-is", "It's very"],
  ["Their is a cat on the roof.", "their-is", "There is"],
  ["My brother is taller then me.", "then-than", "taller than"],
  ["Yesterday we goed to the beach.", "overreg", "went"],
  ["I buyed a new phone.", "overreg", "bought"],
  ["I have went to Toronto twice.", "past-participle", "gone"],
  ["She is a honest person.", "a-an", "an"],
  ["He is an university student.", "a-an", "a"],
  ["I eat an apple and a orange.", "a-an", "an"],
  ["i like hockey.", "capital-i", null],
  ["We start school in september.", "capital-proper", "September"],
  ["I don't know nothing about it.", "double-negative", "anything"],
  ["We made a party for her birthday.", "make-do", "had a party"],
  ["I always do mistakes in English.", "do-make", "make mistakes"],
  ["According to me, it is a good idea.", "according-me", "In my opinion"],
  ["In the other hand, it is expensive.", "other-hand", "On the other hand"],
  ["I am interesting in science.", "interesting-in", "am interested in"],
  ["I was born in Ottawa and I am born in winter.", "be-born", null],
  ["Despite of the rain, we played outside.", "despite-of", "Despite"],
  ["Everyday I walk to school.", "everyday-start", null],
  ["How many money do you have?", "how-many-much", "how much money"],
  ["There is too much people here.", "much-countable", "too many people"],
  ["The people is very friendly.", "people-is", "people are"],
  ["Everybody are happy today.", "everybody-are", "Everybody is"],
  ["I like very much pizza.", "very-much-order", null],
  ["I have a car who is very fast.", "thing-who", null],
  ["I look forward to see you.", "forward-ing", "look forward to seeing"],
  ["I enjoy to read comics.", "ing-after", "enjoy reading"],
  ["I want going home.", "to-after", "want to go"],
  ["Let me to help you.", "let-to", "Let me help"],
  ["When I will be older, I will travel.", "will-after-if", "When I am"],
  ["I have hungry.", "have-hungry", "I am hungry"],
  ["Although it was late, but we stayed.", "although-but", null],
  ["He said me the truth.", "say-me", "told me"],
  ["I go to school everyday.", "everyday", "every day"],
  ["the dog is sleeping.", "capital-start", "The"],
  ["We visited the the museum.", "repeat", null],
  ["I will loose the game.", "loose-lose", "lose the"],
  ["I can't go out with you, I'm boring.", "boring-bored", null],
  ["I would like to assist to the conference.", "assist-attend", "attend the"],
  ["There are two years, I visited Paris.", "there-ago", "two years ago"],
];

test("each typical mistake is caught by the right rule", () => {
  const misses = [];
  for (const [s, rule, fix] of MISTAKES) {
    if (!rule) continue;
    const issues = checkRules(tokenize(s));
    const hit = issues.find((x) => x.rule === rule);
    if (!hit) misses.push(`${s} → expected ${rule}, got ${issues.map((x) => x.rule).join(",") || "nothing"}`);
    else if (fix && !hit.fix.some((f) => f.toLowerCase() === fix.toLowerCase())) misses.push(`${s} → ${rule} fix ${JSON.stringify(hit.fix)} (expected ${fix})`);
  }
  assert.deepEqual(misses, []);
});

test("correct sentences of the course raise almost no grammar alarms", () => {
  const sentences = [];
  for (const l of levels)
    for (const u of l.units) {
      for (const s of u.sentences) sentences.push(s.en);
      for (const b of u.lesson) if (b.type === "dialogue") for (const ln of b.lines) sentences.push(ln.en);
      for (const b of u.lesson) if (b.type === "examples") for (const it of b.items) sentences.push(it.en);
    }
  const flagged = [];
  for (const s of sentences) {
    const issues = checkRules(tokenize(s)).filter((x) => x.cat === "grammar" || x.cat === "vocab");
    if (issues.length) flagged.push(`${s}  ⟶ ${issues.map((x) => `${x.rule}:${s.slice(x.start, x.end)}`).join(" | ")}`);
  }
  const rate = flagged.length / sentences.length;
  if (rate > 0.01) console.log(flagged.slice(0, 40).join("\n"));
  assert.ok(sentences.length > 1200, `${sentences.length} sentences`);
  assert.ok(rate <= 0.01, `false-positive rate ${(rate * 100).toFixed(2)} % (${flagged.length}/${sentences.length})`);
});

test("spelling: known words, typos and suggestions", () => {
  for (const w of ["children", "went", "colour", "color", "doesn't", "Emma's", "well-known", "realize", "realise"]) assert.ok(isKnown(w), w);
  for (const w of ["beautifull", "freind", "becuase", "wich"]) assert.ok(!isKnown(w), w);
  assert.ok(suggest("beautifull").includes("beautiful"));
  assert.ok(suggest("freind").includes("friend"));
  assert.ok(suggest("becuase").includes("because"));
  const issues = checkRules(tokenize("My freind is beautifull. Emma and Noah live in Gatineau."), { suggest }).filter((x) => x.cat === "spelling");
  assert.equal(issues.length, 2);
});

test("tense detection", () => {
  const t = detectTenses(tokenize("I play hockey. Yesterday I went to the park and I was running when it started to rain. I have never seen a moose. I'll call you. The cake was eaten.").tokens);
  assert.ok(t.present_simple >= 1, JSON.stringify(t));
  assert.ok(t.past_simple >= 1);
  assert.ok(t.past_continuous >= 1);
  assert.ok(t.present_perfect >= 1);
  assert.ok(t.future >= 1);
  assert.ok(t.passive >= 1);
});

test("model answers score well, and mistakes lower the mark", () => {
  const prompts = JSON.parse(readFileSync("content/writing.json", "utf8")).prompts;
  const low = [];
  let sum = 0;
  for (const p of prompts) {
    const s = score(analyze(p.model, p), p);
    sum += s.total;
    if (s.total < 14) low.push(`${p.id} ${s.total} ${JSON.stringify(s.criteria)} ${s.priorities.join(" / ")}`);
  }
  const avg = sum / prompts.length;
  if (low.length) console.log(low.slice(0, 15).join("\n"));
  assert.ok(avg >= 16, `average model mark ${avg.toFixed(1)}`);
  assert.ok(low.length <= prompts.length * 0.1, `${low.length} models under 14/20`);
  // Same text with typical mistakes.
  const p = prompts.find((x) => x.level === 3);
  // Damage the text: swap two letters in every 6th long word, drop full stops, lowercase "I".
  let k = 0;
  const bad = p.model
    .replace(/\b[a-z]{5,}\b/g, (w) => (++k % 6 === 0 ? w[0] + w[2] + w[1] + w.slice(3) : w))
    .replace(/\.\s+(?=[A-Z])/g, " ")
    .replace(/\bI\b/g, "i");
  const good = score(analyze(p.model, p), p).total;
  const worse = score(analyze(bad, p), p).total;
  assert.ok(worse < good - 2, `bad ${worse} vs good ${good}`);
});
