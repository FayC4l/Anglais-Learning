import { test } from "node:test";
import assert from "node:assert/strict";
import { gapWords, joinBoxes, wordCountMismatches } from "../src/fill.js";

test("gapWords counts the words of the canonical answer", () => {
  assert.deepEqual(gapWords("has been"), ["has", "been"]);
  assert.deepEqual(gapWords("didn't go"), ["didn't", "go"]);
  assert.deepEqual(gapWords("goes"), ["goes"]);
  assert.deepEqual(gapWords("  Little did I know that "), ["Little", "did", "I", "know", "that"]);
});

test("joinBoxes trims and skips empty boxes", () => {
  assert.equal(joinBoxes([" has", "been "]), "has been");
  assert.equal(joinBoxes(["did not", "go"]), "did not go");
  assert.equal(joinBoxes(["", "go"]), "go");
});

test("wordCountMismatches tolerates contractions only", () => {
  assert.deepEqual(wordCountMismatches(["isn't", "is not"]), []);
  assert.deepEqual(wordCountMismatches(["has been", "'s been"]), []);
  assert.deepEqual(wordCountMismatches(["went", "has gone"]), ["has gone"]);
  assert.deepEqual(wordCountMismatches(["Little did I know that", "Little did I realize that"]), []);
});
