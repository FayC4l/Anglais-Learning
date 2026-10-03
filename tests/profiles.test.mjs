import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { setBackend, readJSON, writeJSON, V1_KEY, GLOBAL_KEY, profileKey } from "../src/storage.js";

const mem = new Map();
setBackend({ get: (k) => (mem.has(k) ? mem.get(k) : null), set: (k, v) => mem.set(k, v), remove: (k) => mem.delete(k) });

const { state, save, flushSave, addXp } = await import("../src/store.js");
const P = await import("../src/profiles.js");

beforeEach(() => {
  mem.clear();
  P.family.profiles = [];
  P.family.activeId = "";
  P.family.pin = "";
});

test("creating a profile makes it active with a fresh state", () => {
  const a = P.createProfile({ name: "Yacine", avatar: "lion", age: "enfant" });
  assert.equal(P.family.activeId, a.id);
  assert.equal(state.player.name, "Yacine");
  assert.equal(state.player.age, "enfant");
  assert.equal(state.xp, 0);
});

test("two profiles keep independent progress", () => {
  const a = P.createProfile({ name: "Lina" });
  addXp(120);
  save();
  flushSave();
  const b = P.createProfile({ name: "Papa", age: "adulte" });
  assert.equal(state.xp, 0);
  addXp(5);
  save();
  P.selectProfile(a.id);
  assert.equal(state.xp, 120);
  assert.equal(state.player.name, "Lina");
  P.selectProfile(b.id);
  assert.equal(state.xp, 5);
});

test("a v1 save becomes the first profile and the v1 key is removed", () => {
  writeJSON(V1_KEY, { v: 1, player: { name: "Noah" }, settings: { pin: "1234", difficulty: "normal" }, xp: 777, units: { "1.1": { passed: true } } });
  P.initProfiles();
  assert.equal(P.family.profiles.length, 1);
  assert.equal(P.family.pin, "1234");
  assert.equal(readJSON(V1_KEY), null);
  P.selectProfile(P.family.profiles[0].id);
  assert.equal(state.xp, 777);
  assert.equal(state.player.name, "Noah");
  assert.equal(state.settings.difficulty, "normal");
  assert.equal(state.settings.pin, undefined);
  assert.ok(state.units["1.1"].passed);
  assert.ok(readJSON(GLOBAL_KEY).profiles.length === 1);
});

test("deleting the active profile activates the next one", () => {
  const a = P.createProfile({ name: "A" });
  const b = P.createProfile({ name: "B" });
  P.deleteProfile(b.id);
  assert.equal(P.family.activeId, a.id);
  assert.equal(readJSON(profileKey(b.id)), null);
  assert.equal(state.player.name, "A");
});

test("family export / import round trip", () => {
  const a = P.createProfile({ name: "Maman", age: "adulte" });
  addXp(42);
  save();
  const backup = JSON.parse(JSON.stringify(P.exportFamily()));
  assert.equal(backup.kind, "mission-bilingue-family");
  assert.equal(JSON.stringify(backup).includes("pin"), false);
  mem.clear();
  P.family.profiles = [];
  P.family.activeId = "";
  const n = P.importBackup(backup);
  assert.equal(n, 1);
  P.selectProfile(a.id);
  assert.equal(state.xp, 42);
  assert.equal(state.player.age, "adulte");
  assert.throws(() => P.importBackup({ hello: 1 }), /sauvegarde/);
});
