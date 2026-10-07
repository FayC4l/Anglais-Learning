// The device-wide register of the Tower: old save codes, stale tabs and backups cannot bring hearts back;
// Towers started with 10 hearts get 200; the lessons of level 12 stay open.
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";

globalThis.window = { __CONTENT__: [{ id: 11, units: [{ id: "11.1" }] }, { id: 12, units: [{ id: "12.1" }, { id: "12.2" }, { id: "12.3" }] }] };
const S = await import("../src/store.js");
const { TOWER_LIVES } = await import("../src/tower.js");
const { state, replaceState, fresh, tower, recordTowerFloor, startTowerFloor, towerPrompt, exportCode, importCode, unitUnlocked, recordPlacementBand } = S;

beforeEach(() => replaceState(fresh()));

test("an old save code cannot bring hearts back", () => {
  tower();
  recordTowerFloor(1, true);
  const code = exportCode();
  recordTowerFloor(2, false);
  recordTowerFloor(2, false);
  assert.equal(tower().lives, TOWER_LIVES - 2);
  importCode(code);
  assert.equal(tower().lives, TOWER_LIVES - 2);
  assert.equal(tower().floor, 2);
});

test("a forgotten tab cannot save an older Tower over a newer one", () => {
  tower();
  recordTowerFloor(1, true);
  const staleTab = JSON.parse(JSON.stringify(state));
  startTowerFloor(2);
  recordTowerFloor(2, false);
  replaceState(staleTab);
  assert.equal(tower().lives, TOWER_LIVES - 1);
  assert.equal(tower().pending, 0);
});

test("a Tower started with 10 hearts gets 200, minus the hearts already lost", () => {
  state.tower = { id: "old-tower", seq: 3, floor: 12, lives: 7, best: 12, resets: 0, won: false, wonAt: "", shown: 12, pending: 0 };
  assert.equal(tower().lives, TOWER_LIVES - 3);
  assert.equal(tower().maxLives, TOWER_LIVES);
  assert.equal(tower().lives, TOWER_LIVES - 3);
});

test("the writing subject of a floor is drawn once", () => {
  let draws = 0;
  const draw = () => `w${++draws}`;
  assert.equal(towerPrompt(5, draw), "w1");
  assert.equal(towerPrompt(5, draw), "w1");
  assert.equal(draws, 1);
});

test("the lessons of level 12 stay open once the Tower is open", () => {
  assert.equal(unitUnlocked(12, 3), false);
  state.bosses[11] = { defeated: true };
  assert.equal(unitUnlocked(12, 3), true);
});

test("taking the placement test again never skips a line", () => {
  state.bosses[3] = { defeated: true };
  recordPlacementBand({ band: "C2", line: 12, asked: 20, correct: 19 });
  assert.equal(state.placement.band, "C2");
  assert.equal(state.bosses[11], undefined);
});
