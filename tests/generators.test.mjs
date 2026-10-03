import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";

// Generators read the word-formation bank from window.__EXTRA__ when it exists.
const wf = "content/wordform.json";
globalThis.window = { __EXTRA__: { wordform: existsSync(wf) ? JSON.parse(readFileSync(wf, "utf8")) : { items: [{ level: 10, stem: "HAPPY", q: "She could not hide her ___.", answer: ["unhappiness"], explain: "x" }] } } };

const { GENERATORS, generate, regen, generatorsOf, generatorsUpTo } = await import("../src/engine/generators.js");
const { makeRng } = await import("../src/engine/rng.js");
const { matches } = await import("../src/answer.js");
const { gapWords, wordCountMismatches } = await import("../src/fill.js");

test("every generator produces valid, rebuildable questions", () => {
  for (const g of GENERATORS) {
    const rng = makeRng(`seed-${g.id}`);
    const seen = new Set();
    for (let i = 0; i < 200; i++) {
      const q = generate(g.id, rng, 12);
      assert.ok(q, `${g.id} returned null`);
      assert.ok(q.ref.startsWith(`gen:${g.id}|`), `${g.id} ref ${q.ref}`);
      assert.ok(["fill", "mcq", "type_en", "error"].includes(q.kind), `${g.id} kind ${q.kind}`);
      assert.ok(q.explain, `${g.id} explain missing`);
      if (q.kind === "fill") {
        assert.equal((q.q.match(/___/g) || []).length, 1, `${g.id}: ${q.q}`);
        assert.deepEqual(wordCountMismatches(q.accept), [], `${g.id}: ${q.accept}`);
        assert.ok(gapWords(q.expected).length >= 1);
      }
      if (q.kind === "mcq") {
        assert.equal(q.choices[q.answer], q.expected, `${g.id} answer index`);
        assert.equal(new Set(q.choices).size, q.choices.length, `${g.id} duplicate choices ${q.choices}`);
      }
      if (q.kind === "error") {
        assert.ok(q.wrong >= 0 && q.wrong < q.tokens.length, `${g.id} wrong index`);
        assert.ok(!matches(q.tokens[q.wrong].replace(/[.,!?]+$/, ""), q.accept), `${g.id}: fix equals wrong token in ${q.tokens.join(" ")}`);
      }
      if (q.accept) assert.ok(matches(q.expected.split(" → ").pop(), q.accept), `${g.id}: expected not accepted`);
      const again = regen(q.ref);
      assert.ok(again, `${g.id} regen failed for ${q.ref}`);
      assert.equal(again.expected, q.expected, `${g.id} regen differs`);
      assert.equal(again.kind, q.kind);
      seen.add(q.ref);
    }
    if (g.id !== "wordform" || existsSync(wf)) assert.ok(seen.size >= 10, `${g.id} produced only ${seen.size} distinct questions`);
  }
});

test("generated sentences look like English sentences", () => {
  const rng = makeRng("look");
  for (const g of GENERATORS) {
    for (let i = 0; i < 30; i++) {
      const q = generate(g.id, rng, 12);
      const text = q.q || q.tokens?.join(" ") || "";
      if (!text) continue;
      assert.match(text, /^(___|[A-Z«"])/, `${g.id}: "${text}" should start with a capital`);
      assert.match(text, /[.?!]$/, `${g.id}: "${text}" should end with punctuation`);
      assert.doesNotMatch(text, /\s{2,}|undefined|null/, `${g.id}: "${text}"`);
    }
  }
});

test("generators are attached to existing stations", () => {
  assert.ok(generatorsOf("3.1").some((g) => g.id === "ps3"));
  assert.ok(generatorsUpTo("2.4").every((g) => Number(g.unit.split(".")[0]) <= 2));
  assert.ok(generatorsUpTo("12.5").length === GENERATORS.length);
  assert.ok(GENERATORS.length >= 30, `${GENERATORS.length} generators`);
});

test("irregular verbs respect the level", () => {
  const rng = makeRng("lvl");
  for (let i = 0; i < 100; i++) {
    const q = generate("irr_past", rng, 5);
    assert.ok(!/forbid|strive|weave|undertake/.test(q.fr), q.fr);
  }
});
