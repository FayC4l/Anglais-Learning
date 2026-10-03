// Backup files: download a JSON object, pick and parse a JSON file; the daily backup reminder.
import { h, icon, toast } from "../ui.js";
import { exportFamily } from "../profiles.js";
import { backupReminder, markBackedUp, snoozeBackup, daysSinceBackup, autoStatus, resumeAuto, autoSupported } from "../autobackup.js";
import { mooseSays } from "../humor.js";

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

// ---------- Daily backup card (map) ----------

/** Downloads the family backup and remembers the date. */
export function downloadFamilyBackup() {
  downloadJSON(exportFamily(), backupName("famille"));
  markBackedUp();
}

/** The reminder shown on the map (or null). The automatic-file state is checked asynchronously. */
export function backupCard() {
  const box = h("div", { class: "backup-slot" });
  const kind = backupReminder();
  const done = () => box.replaceChildren(h("div", { class: "backup-card ok" }, h("span", { html: icon("check") }), h("p", null, h("strong", null, "Sauvegarde téléchargée ! "), "Range le fichier dans ton Drive ou envoie-le-toi par courriel : c'est ton assurance-vie.")));
  const dl = () => {
    downloadFamilyBackup();
    done();
  };
  if (kind) {
    const days = daysSinceBackup();
    box.replaceChildren(
      h(
        "div",
        { class: `backup-card ${kind}` },
        kind === "late"
          ? mooseSays(days == null ? "Ta progression n'est enregistrée que dans ce navigateur. Un clic pour la mettre à l'abri ? Même mes bois ont une copie de sauvegarde." : `Ça fait ${days} jours sans sauvegarde. Si le navigateur fait le ménage, on perd tout… Un petit clic ?`, "sm")
          : h("p", null, h("strong", null, "Sauvegarde du jour. "), "Un clic et la progression de toute la famille est à l'abri."),
        h(
          "div",
          { class: "row" },
          h("button", { type: "button", class: "btn btn-small btn-primary", onClick: dl }, h("span", { html: icon("copy") }), "Télécharger la sauvegarde"),
          h("button", { type: "button", class: "btn btn-small btn-ghost", onClick: () => (snoozeBackup(), box.replaceChildren()) }, "Plus tard"),
        ),
        autoSupported() ? h("p", { class: "set-help" }, "Sur cet ordinateur, la sauvegarde peut se faire toute seule : Profil → Sauvegarde automatique.") : null,
      ),
    );
  }
  // Automatic file waiting for the browser's permission: one click to resume.
  autoStatus().then((st) => {
    if (st !== "paused") return;
    box.replaceChildren(
      h(
        "div",
        { class: "backup-card daily" },
        h("p", null, h("strong", null, "Sauvegarde automatique en pause. "), "Ton navigateur demande à nouveau l'autorisation d'écrire le fichier."),
        h("button", { type: "button", class: "btn btn-small btn-primary", onClick: async () => {
          try {
            if (await resumeAuto()) {
              toast("Sauvegarde automatique réactivée.", "ok");
              done();
            }
          } catch {
            toast("Autorisation refusée.");
          }
        } }, "Réactiver"),
      ),
    );
  });
  return box;
}
