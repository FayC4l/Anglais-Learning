import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";

// A tiny fake course: level 1 with 3 stations, level 2 with 1.
globalThis.window = { __CONTENT__: [{ id: 1, units: [{ id: "1.1" }, { id: "1.2" }, { id: "1.3" }] }, { id: 2, units: [{ id: "2.1" }] }] };
const S = await import("../src/store.js");
const { state, replaceState, fresh, recordTest, recordBoss, bossLives, bossLocked, bossReady, redoUnits, nextStep, BOSS_LIVES } = S;

const passAll = () => ["1.1", "1.2", "1.3"].forEach((u) => recordTest(u, 1));
const lose = () => recordBoss(1, { won: false, score: 0.3, hearts: 0, maxHearts: 3 });

beforeEach(() => replaceState(fresh()));

test("a boss starts with 3 lives, each defeat costs one", () => {
  passAll();
  assert.equal(BOSS_LIVES, 3);
  assert.equal(bossLives(1), 3);
  assert.equal(lose().livesLeft, 2);
  assert.equal(lose().livesLeft, 1);
  assert.equal(bossLives(1), 1);
  assert.ok(bossReady(1));
});

test("losing the third life locks the boss and sends every station back to redo", () => {
  passAll();
  lose();
  lose();
  const r = lose();
  assert.equal(r.locked, true);
  assert.equal(bossLives(1), 0);
  assert.ok(bossLocked(1));
  assert.equal(bossReady(1), false);
  assert.deepEqual(redoUnits(1).map((u) => u.id), ["1.1", "1.2", "1.3"]);
  assert.equal(nextStep().unit.id, "1.1");
});

test("a failed test does not clear a station; the last redone station brings the 3 lives back", () => {
  passAll();
  lose();
  lose();
  lose();
  assert.equal(recordTest("1.2", 0.2).redoCleared, false);
  assert.equal(redoUnits(1).length, 3);
  let r = recordTest("1.1", 1);
  assert.equal(r.redoCleared, true);
  assert.equal(r.livesRestored, false);
  assert.equal(r.redoLeft, 2);
  recordTest("1.2", 1);
  r = recordTest("1.3", 0.95);
  assert.equal(r.livesRestored, true);
  assert.equal(bossLives(1), 3);
  assert.equal(bossLocked(1), false);
  assert.ok(bossReady(1));
  assert.equal(nextStep().type, "boss");
});

test("a beaten boss can be replayed without losing lives", () => {
  passAll();
  recordBoss(1, { won: true, score: 1, hearts: 3, maxHearts: 3 });
  const r = lose();
  assert.equal(r.livesLeft, 3);
  assert.equal(r.locked, false);
  assert.equal(redoUnits(1).length, 0);
});

test("old saves without lives get 3", () => {
  passAll();
  state.bosses[1] = { attempts: 5, defeated: false };
  assert.equal(bossLives(1), 3);
});
