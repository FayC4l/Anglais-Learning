import { test } from "node:test";
import assert from "node:assert/strict";
import { VERBS, forms, conjugate, contract, verb, ppForms, TENSES } from "../src/engine/verbs.js";

test("spelling rules for -s, -ing, -ed", () => {
  assert.equal(forms("stop").ing, "stopping");
  assert.equal(forms("stop").past, "stopped");
  assert.equal(forms("visit").past, "visited");
  assert.equal(forms("travel").past, "travelled");
  assert.equal(forms("try").s, "tries");
  assert.equal(forms("try").past, "tried");
  assert.equal(forms("play").s, "plays");
  assert.equal(forms("play").past, "played");
  assert.equal(forms("watch").s, "watches");
  assert.equal(forms("fix").s, "fixes");
  assert.equal(forms("lie").ing, "lying");
  assert.equal(forms("make").ing, "making");
  assert.equal(forms("see").ing, "seeing");
  assert.equal(forms("agree").ing, "agreeing");
  assert.equal(forms("agree").past, "agreed");
  assert.equal(forms("run").ing, "running");
  assert.equal(forms("go").s, "goes");
  assert.equal(forms("have").s, "has");
  assert.equal(forms("do").s, "does");
  assert.equal(forms("argue").ing, "arguing");
});

test("conjugation in every tense", () => {
  assert.equal(conjugate("go", "past_simple", "she", { neg: true }), "did not go");
  assert.equal(conjugate("go", "present_perfect", "he"), "has gone");
  assert.equal(conjugate("go", "present_simple", "he", { question: true }), "does he go");
  assert.equal(conjugate("build", "will", "it", { passive: true }), "will be built");
  assert.equal(conjugate("go", "past_continuous", "they"), "were going");
  assert.equal(conjugate("go", "would_have", "I"), "would have gone");
  assert.equal(conjugate("be", "present_simple", "I"), "am");
  assert.equal(conjugate("be", "present_simple", "you", { neg: true }), "are not");
  assert.equal(conjugate("be", "past_simple", "we", { question: true }), "were we");
  assert.equal(conjugate("eat", "present_perfect_continuous", "she"), "has been eating");
  assert.equal(conjugate("write", "going_to", "I"), "am going to write");
  assert.equal(conjugate("write", "present_simple", { text: "My sister", p: "3s" }), "writes");
  assert.equal(conjugate("finish", "future_perfect", "we"), "will have finished");
  assert.equal(conjugate("clean", "present_continuous", "it", { passive: true }), "is being cleaned");
  assert.equal(conjugate("steal", "past_perfect", "they", { passive: true }), "had been stolen");
});

test("contractions", () => {
  assert.equal(contract("does not go"), "doesn't go");
  assert.equal(contract("will not be built"), "won't be built");
  assert.equal(contract("am not"), "am not");
  assert.equal(contract("has not been eating"), "hasn't been eating");
});

test("the database is complete and consistent", () => {
  assert.ok(VERBS.length >= 230, `only ${VERBS.length} verbs`);
  const bases = new Set();
  for (const v of VERBS) {
    assert.ok(v.base && v.past && v.pp && v.fr && v.s && v.ing, `incomplete ${v.base}`);
    assert.ok(!bases.has(v.base), `duplicate ${v.base}`);
    bases.add(v.base);
  }
  assert.deepEqual(ppForms("get"), ["gotten", "got"]);
  assert.equal(verb("be").past, "was");
  for (const t of TENSES) assert.ok(conjugate("work", t.id, "they"));
});
