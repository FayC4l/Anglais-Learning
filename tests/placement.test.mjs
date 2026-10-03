import { test } from "node:test";
import assert from "node:assert/strict";
import { createPlacement, BANDS } from "../src/placement.js";
import { makeRng } from "../src/engine/rng.js";

/** Plays a whole placement with a player who answers band b correctly with probability p(b). */
function play(p, rng, opts) {
  const pl = createPlacement(opts);
  let guard = 0;
  while (!pl.done && guard++ < 100) pl.record(rng() < p(BANDS.indexOf(pl.band())));
  return pl.result();
}

test("a perfect player reaches C2", () => {
  const r = play(() => 1, makeRng(1));
  assert.equal(r.band, "C2");
  assert.equal(r.line, 12);
});

test("a beginner is placed in A1 quickly", () => {
  const r = play(() => 0, makeRng(2));
  assert.equal(r.band, "A1");
  assert.equal(r.line, 1);
  assert.ok(r.asked <= 8, `asked ${r.asked}`);
});

test("a true B1 learner is placed in B1 most of the time", () => {
  const rng = makeRng(3);
  const p = (b) => (b < 2 ? 0.92 : b === 2 ? 0.78 : 0.2);
  let hits = 0;
  for (let i = 0; i < 500; i++) if (play(p, rng).band === "B1") hits++;
  assert.ok(hits >= 400, `B1 placed ${hits}/500`);
});

test("a true C1 learner starting at B1 lands in C1 most of the time", () => {
  const rng = makeRng(4);
  const p = (b) => (b < 4 ? 0.93 : b === 4 ? 0.8 : 0.25);
  let hits = 0;
  for (let i = 0; i < 500; i++) if (play(p, rng, { start: "B1" }).band === "C1") hits++;
  assert.ok(hits >= 380, `C1 placed ${hits}/500`);
});

test("never more than the maximum number of questions", () => {
  const rng = makeRng(5);
  for (let i = 0; i < 300; i++) {
    const r = play(() => 0.5, rng);
    assert.ok(r.asked <= 32, `asked ${r.asked}`);
    assert.ok(BANDS.includes(r.band));
  }
});

test("lines follow the band mapping", () => {
  const pl = createPlacement();
  assert.equal(pl.band(), "A2");
  assert.deepEqual(BANDS.map((b) => createPlacement().lineOf(b)), [1, 3, 5, 7, 10, 12]);
});
