import { test } from "node:test";
import assert from "node:assert/strict";
import { selectFresh, recordSeen, pickFresh } from "../src/engine/pool.js";
import { makeRng } from "../src/engine/rng.js";

const pool = Array.from({ length: 100 }, (_, i) => `q${i}`);

test("a retry overlaps the previous attempt by at most 20 %", () => {
  const rng = makeRng(1);
  let hist = {};
  for (let attempt = 0; attempt < 15; attempt++) {
    const picked = selectFresh(pool, 25, hist, rng);
    assert.equal(picked.length, 25);
    if (hist.last) {
      const overlap = picked.filter((x) => hist.last.includes(x)).length;
      assert.ok(overlap <= 5, `attempt ${attempt}: overlap ${overlap}`);
    }
    hist = recordSeen(hist, picked);
  }
});

test("unseen questions come first", () => {
  const hist = recordSeen({}, pool.slice(0, 90));
  const picked = selectFresh(pool, 10, hist, makeRng(2));
  assert.deepEqual(picked.sort(), pool.slice(90).sort());
});

test("four attempts cover the whole pool", () => {
  let hist = {};
  const all = new Set();
  const rng = makeRng(3);
  for (let i = 0; i < 4; i++) {
    const picked = selectFresh(pool, 25, hist, rng);
    picked.forEach((x) => all.add(x));
    hist = recordSeen(hist, picked);
  }
  assert.equal(all.size, 100);
});

test("a small pool still fills the exam, oldest first", () => {
  const small = ["a", "b", "c"];
  const hist = recordSeen({}, ["a", "b"]);
  assert.equal(pickFresh(small, hist, new Set(), makeRng(4)), "c");
  assert.equal(selectFresh(small, 5, hist, makeRng(4)).length, 3);
});

test("generated refs are not remembered", () => {
  const h = recordSeen({}, ["gen:ps3|1|2|3", "3.1:g4"]);
  assert.deepEqual(h.last, ["3.1:g4"]);
  assert.equal(h.attempts, 1);
});
