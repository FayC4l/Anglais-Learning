import { test } from "node:test";
import assert from "node:assert/strict";
import { FLOORS, TOWER_LIVES, VISIBLE, EXTRA_TIME, floorSpec, freshTower, recordFloor, copiedShare, visibleTop, surprise, topUpLives, heartBar, newestTower, BLOCKS } from "../src/tower.js";
import { GENERATORS } from "../src/engine/generators.js";
import { TENSES } from "../src/engine/verbs.js";

test("50 floors: writing bosses every 5 floors, the C2 exam at the top", () => {
  assert.equal(FLOORS, 50);
  assert.equal(floorSpec(5).kind, "writing");
  assert.equal(floorSpec(45).kind, "writing");
  assert.equal(floorSpec(45).c2, true);
  assert.equal(floorSpec(50).kind, "final");
  assert.equal(Array.from({ length: 50 }, (_, i) => floorSpec(i + 1)).filter((s) => s.kind === "conj").length, 40);
});

test("difficulty grows with the floors", () => {
  const a = floorSpec(1);
  const b = floorSpec(49);
  assert.ok(b.count > a.count);
  assert.ok(b.hearts < a.hearts);
  assert.ok(b.time < a.time);
  assert.ok(b.negQ > a.negQ);
  assert.ok(floorSpec(40).pass > floorSpec(5).pass);
  assert.ok(floorSpec(45).pass <= 15);
});

test("every block refers to existing generators and tenses", () => {
  const ids = new Set(GENERATORS.map((g) => g.id));
  const tenses = new Set(TENSES.map((t) => t.id));
  for (const b of BLOCKS) {
    b.gens.forEach((g) => assert.ok(ids.has(g), `unknown generator ${g}`));
    if (Array.isArray(b.tenses)) b.tenses.forEach((t) => assert.ok(tenses.has(t), `unknown tense ${t}`));
  }
});

test("a won floor opens the next one; floor 50 is the victory", () => {
  const t = freshTower();
  assert.equal(recordFloor(t, 1, true).event, "next");
  assert.equal(t.floor, 2);
  assert.equal(recordFloor(t, 5, true).event, "ignored"); // not the current floor
  t.floor = 50;
  assert.equal(recordFloor(t, 50, true).event, "victory");
  assert.equal(t.won, true);
});

test("200 hearts for the whole tower; the last one lost makes it collapse", () => {
  assert.equal(TOWER_LIVES, 200);
  const t = freshTower();
  t.floor = 23;
  for (let i = 1; i < TOWER_LIVES; i++) assert.equal(recordFloor(t, 23, false).event, "life");
  assert.equal(t.lives, 1);
  const r = recordFloor(t, 23, false);
  assert.equal(r.event, "collapse");
  assert.equal(t.floor, 1);
  assert.equal(t.lives, TOWER_LIVES);
  assert.equal(t.resets, 1);
});

test("a copied model answer is detected", () => {
  const model = "Dear Sir, I am writing to complain about the noise coming from the building site next to our school every morning.";
  assert.ok(copiedShare(model, model) > 0.9);
  assert.ok(copiedShare("Hello, my name is Lina and I want to tell you about my favourite sport, which is hockey.", model) < 0.2);
});

test("only 5 floors and the boss are shown; each floor won past the 5th reveals one more", () => {
  const t = freshTower();
  assert.equal(visibleTop(t), VISIBLE);
  for (let n = 1; n <= 4; n++) recordFloor(t, n, true);
  assert.equal(t.floor, 5);
  assert.equal(visibleTop(t), 5);
  assert.equal(surprise(t), false);
  recordFloor(t, 5, true);
  assert.equal(t.floor, 6);
  assert.equal(visibleTop(t), 6);
  assert.equal(surprise(t), true); // floor 6 must be introduced
  t.shown = 6; // reveal played
  assert.equal(surprise(t), false);
  recordFloor(t, 6, true);
  assert.equal(surprise(t), true);
  assert.equal(visibleTop(t), 7);
  // The last ordinary floor leads to the real final boss: no more surprise.
  t.floor = 49;
  t.shown = 49;
  recordFloor(t, 49, true);
  assert.equal(t.floor, 50);
  assert.equal(surprise(t), false);
  assert.equal(visibleTop(t), 49);
});

test("a collapse hides the floors again, and they surprise again", () => {
  const t = freshTower();
  Object.assign(t, { floor: 12, shown: 12, lives: 1 });
  assert.equal(recordFloor(t, 12, false).event, "collapse");
  assert.equal(t.shown, VISIBLE);
  assert.equal(visibleTop(t), VISIBLE);
  for (let n = 1; n <= 5; n++) recordFloor(t, n, true);
  assert.equal(surprise(t), true);
});

test("a pending fight is cleared by its result", () => {
  const t = freshTower();
  t.pending = 1;
  recordFloor(t, 1, false);
  assert.equal(t.pending, 0);
  t.pending = 1;
  recordFloor(t, 1, true);
  assert.equal(t.pending, 0);
});
test("from floor 12, every fight question gets 20 more seconds", () => {
  assert.equal(floorSpec(11).extraTime, 0);
  assert.equal(floorSpec(12).extraTime, EXTRA_TIME);
  assert.equal(floorSpec(49).extraTime, 20);
});

test("a Tower started with 10 hearts gets 200, minus the hearts already lost (once)", () => {
  const t = { floor: 9, lives: 7, best: 9, resets: 0, won: false };
  assert.equal(topUpLives(t), true);
  assert.equal(t.lives, 197);
  assert.equal(topUpLives(t), false);
  assert.equal(t.lives, 197);
  assert.equal(topUpLives(freshTower()), false);
});

test("200 hearts are drawn as 10 icons of 20", () => {
  assert.deepEqual(heartBar(200), { total: 10, on: 10 });
  assert.deepEqual(heartBar(181), { total: 10, on: 10 });
  assert.deepEqual(heartBar(180), { total: 10, on: 9 });
  assert.deepEqual(heartBar(1), { total: 10, on: 1 });
  assert.deepEqual(heartBar(0), { total: 10, on: 0 });
  assert.deepEqual(heartBar(2, 3), { total: 3, on: 2 });
});

test("between two copies of a Tower, the one with more events wins", () => {
  const a = { ...freshTower(), seq: 5, lives: 150 };
  assert.equal(newestTower(a, { ...a, seq: 4, lives: 200 }), a);
  assert.equal(newestTower(a, { ...a, seq: 6, lives: 149 }).lives, 149);
  assert.equal(newestTower(a, { ...a, id: "other", seq: 99 }), a);
  assert.equal(newestTower(a, undefined), a);
});