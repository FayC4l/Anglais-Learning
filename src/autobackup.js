// Daily backup: a once-a-day reminder (every device), and an automatic backup file rewritten after each
// session (Chrome / Edge on a computer, File System Access API).
import { family, saveFamily, exportFamily } from "./profiles.js";
import { onChange } from "./store.js";

const DAY = 86400000;
const dayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/**
 * What the map should show today: null (nothing), "daily" (gentle reminder) or "late" (7 days or more
 * without a backup). Pure: depends only on the family settings and the date.
 */
export function backupReminder(fam = family, now = new Date()) {
  if (!fam.profiles?.length) return null;
  const last = fam.lastBackup ? new Date(fam.lastBackup) : null;
  if (last && dayKey(last) === dayKey(now)) return null; // already saved today
  if (fam.backupSnooze === dayKey(now)) return null; // "plus tard" today
  if (!last) {
    // Give a new family one day of play before the first reminder.
    const created = Math.min(...fam.profiles.map((p) => new Date(p.createdAt || now).getTime()));
    return now - created >= DAY ? "late" : null;
  }
  return now - last >= 7 * DAY ? "late" : "daily";
}

/** Remembers that the family was backed up now. */
export function markBackedUp(now = new Date()) {
  family.lastBackup = now.toISOString();
  saveFamily();
}

export function snoozeBackup(now = new Date()) {
  family.backupSnooze = dayKey(now);
  saveFamily();
}

export const daysSinceBackup = (now = new Date()) => (family.lastBackup ? Math.floor((now - new Date(family.lastBackup)) / DAY) : null);

// ---------- Automatic backup file (Chrome / Edge, computer) ----------

export const autoSupported = () => typeof window !== "undefined" && typeof window.showSaveFilePicker === "function" && !!globalThis.indexedDB;

function idb(mode, fn) {
  return new Promise((resolve, reject) => {
    const open = indexedDB.open("mission-bilingue-files", 1);
    open.onupgradeneeded = () => open.result.createObjectStore("handles");
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const tx = open.result.transaction("handles", mode);
      const req = fn(tx.objectStore("handles"));
      tx.oncomplete = () => resolve(req?.result);
      tx.onerror = () => reject(tx.error);
    };
  });
}
const getHandle = () => idb("readonly", (s) => s.get("family")).catch(() => null);
const setHandle = (h) => idb("readwrite", (s) => (h ? s.put(h, "family") : s.delete("family")));

/** "off" (no file chosen), "on" (writing allowed), "paused" (the browser asks for permission again). */
export async function autoStatus() {
  if (!autoSupported()) return "off";
  const handle = await getHandle();
  if (!handle) return "off";
  try {
    const p = await handle.queryPermission({ mode: "readwrite" });
    return p === "granted" ? "on" : "paused";
  } catch {
    return "paused";
  }
}

async function write(handle) {
  const w = await handle.createWritable();
  await w.write(JSON.stringify(exportFamily(), null, 1));
  await w.close();
  markBackedUp();
}

/** Lets the user choose the backup file (must run from a click), then writes it once. */
export async function chooseAutoFile() {
  const handle = await window.showSaveFilePicker({
    suggestedName: "mission-bilingue-famille.json",
    types: [{ description: "Sauvegarde Mission Bilingue", accept: { "application/json": [".json"] } }],
  });
  await setHandle(handle);
  await write(handle);
  return handle.name;
}

/** Asks the browser again for the right to write the file (must run from a click). */
export async function resumeAuto() {
  const handle = await getHandle();
  if (!handle) return false;
  const p = await handle.requestPermission({ mode: "readwrite" });
  if (p !== "granted") return false;
  await write(handle);
  return true;
}

export async function disableAuto() {
  await setHandle(null);
}

/** Rewrites the file now if allowed (silently does nothing otherwise). */
export async function autoWriteNow() {
  if ((await autoStatus()) !== "on") return false;
  try {
    await write(await getHandle());
    return true;
  } catch {
    return false;
  }
}

let timer = 0;
/** Starts the automatic backup: the file is rewritten 20 s after the last change, and when the page is hidden. */
export function startAutoBackup() {
  if (!autoSupported()) return;
  onChange(() => {
    clearTimeout(timer);
    timer = setTimeout(autoWriteNow, 20000);
  });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      clearTimeout(timer);
      autoWriteNow();
    }
  });
}
