import { test } from "node:test";
import assert from "node:assert/strict";
import { setBackend } from "../src/storage.js";

const mem = new Map();
setBackend({ get: (k) => (mem.has(k) ? mem.get(k) : null), set: (k, v) => mem.set(k, v), remove: (k) => mem.delete(k) });
const { backupReminder } = await import("../src/autobackup.js");

const now = new Date(2026, 9, 10, 18, 0);
const fam = (extra) => ({ profiles: [{ id: "a", createdAt: new Date(2026, 9, 1).toISOString() }], ...extra });

test("no reminder without profiles, nor on the first day of a new family", () => {
  assert.equal(backupReminder({ profiles: [] }, now), null);
  assert.equal(backupReminder({ profiles: [{ id: "a", createdAt: new Date(2026, 9, 10, 9).toISOString() }] }, now), null);
});

test("never backed up after a day of play: urgent reminder", () => {
  assert.equal(backupReminder(fam({}), now), "late");
});

test("backed up today: nothing; yesterday: daily reminder; a week ago: urgent", () => {
  assert.equal(backupReminder(fam({ lastBackup: new Date(2026, 9, 10, 8).toISOString() }), now), null);
  assert.equal(backupReminder(fam({ lastBackup: new Date(2026, 9, 9, 20).toISOString() }), now), "daily");
  assert.equal(backupReminder(fam({ lastBackup: new Date(2026, 9, 2).toISOString() }), now), "late");
});

test("'plus tard' hides the reminder for the rest of the day only", () => {
  const f = fam({ lastBackup: new Date(2026, 9, 8).toISOString(), backupSnooze: "2026-10-10" });
  assert.equal(backupReminder(f, now), null);
  assert.equal(backupReminder(f, new Date(2026, 9, 11, 9)), "daily");
});
