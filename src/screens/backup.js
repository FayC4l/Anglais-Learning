// Backup files: download a JSON object, pick and parse a JSON file.

/** Offers `obj` as a .json file download. */
export function downloadJSON(obj, filename) {
  const blob = new Blob([JSON.stringify(obj, null, 1)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/** Lets the user pick a .json file; resolves with its parsed content, or null when cancelled. */
export function pickBackupFile() {
  return new Promise((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,application/json";
    input.addEventListener("change", async () => {
      const file = input.files?.[0];
      if (!file) return resolve(null);
      try {
        resolve(JSON.parse((await file.text()).replace(/^﻿/, "")));
      } catch {
        reject(new Error("Ce fichier n'est pas lisible (JSON invalide)."));
      }
    });
    input.click();
  });
}

/** File name like mission-bilingue-famille-2026-10-02.json */
export const backupName = (who) => `mission-bilingue-${who}-${new Date().toISOString().slice(0, 10)}.json`;
