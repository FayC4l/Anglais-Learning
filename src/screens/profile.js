// Profile: stats, badges, settings, backups, and the PIN-protected family management zone.
import { h, icon, toast, dialog, copyText, esc } from "../ui.js";
import { LEVELS } from "../content.js";
import { state, save, rank, wordsLearned, mistakeCount, streakAlive, BADGES, exportCode, importCode, resetAll, highestLevelDone } from "../store.js";
import { family, saveFamily, listProfiles, profileState, updateProfile, deleteProfile, exportFamily, exportProfile, importBackup, AGES, AVATARS } from "../profiles.js";
import { go } from "../router.js";
import { englishVoices, ttsReady, coachReady, speak, speakParts, sfx } from "../audio.js";
import { avatarEl } from "./who.js";
import { downloadJSON, pickBackupFile, backupName, downloadFamilyBackup } from "./backup.js";
import { autoSupported, autoStatus, chooseAutoFile, resumeAuto, disableAuto, daysSinceBackup } from "../autobackup.js";

export function profileScreen(view) {
  const s = state.stats;
  const acc = s.answers ? Math.round((s.correct / s.answers) * 100) : 0;
  const minutes = Math.round(s.ms / 60000);
  const passed = Object.values(state.units).filter((u) => u.passed && !u.placed).length;
  const stat = (v, l) => h("div", { class: "pstat" }, h("strong", null, v), h("span", null, l));

  const voices = englishVoices();
  const voiceSel = h("select", { class: "field", id: "voice-select", "aria-label": "Voix anglaise" }, h("option", { value: "" }, "Automatique (anglais canadien si possible)"), voices.map((v) => h("option", { value: v.voiceURI, selected: v.voiceURI === state.settings.voice }, `${v.name} (${v.lang})`)));
  voiceSel.addEventListener("change", () => {
    state.settings.voice = voiceSel.value;
    save();
    speak("Hello! This is my voice.");
  });
  const rate = h("input", { type: "range", min: "0.6", max: "1.2", step: "0.05", value: String(state.settings.rate), id: "rate", class: "range" });
  const rateVal = h("span", { class: "range-val" }, `${Math.round(state.settings.rate * 100)} %`);
  rate.addEventListener("input", () => {
    state.settings.rate = Number(rate.value);
    rateVal.textContent = `${Math.round(state.settings.rate * 100)} %`;
    save();
  });
  rate.addEventListener("change", () => speak("I can speak English."));
  const sound = h("input", { type: "checkbox", id: "sound", checked: state.settings.sound !== false });
  sound.addEventListener("change", () => {
    state.settings.sound = sound.checked;
    save();
    sfx.correct();
  });

  const codeOut = h("textarea", { class: "field code-field", rows: 3, readonly: true, id: "save-code", "aria-label": "Code de sauvegarde" });
  const codeIn = h("textarea", { class: "field code-field", rows: 3, id: "restore-input", placeholder: "Colle un code ici pour restaurer", "aria-label": "Code à restaurer" });
  const placement = state.placement;

  view.append(
    h(
      "div",
      { class: "profile" },
      h("div", { class: "topbar" }, h("button", { type: "button", class: "icon-btn", "aria-label": "Retour au réseau", html: icon("back"), onClick: () => go("map") }), h("span", { class: "topbar-title" }, "Profil")),
      h(
        "header",
        { class: "profile-head" },
        avatarEl(state.player.avatar, "xl"),
        h("div", null, h("h1", { class: "page-title" }, state.player.name), h("p", { class: "rank" }, `Rang : ${rank()} · ${highestLevelDone()} ligne${highestLevelDone() > 1 ? "s" : ""} terminée${highestLevelDone() > 1 ? "s" : ""} sur 12`), placement ? h("p", { class: "rank" }, `Test de placement : ${placement.band} (ligne ${placement.line})`) : null),
      ),
      h(
        "div",
        { class: "row profile-actions" },
        h("button", { type: "button", class: "btn btn-small", onClick: () => go("dashboard") }, h("span", { html: icon("trophy") }), "Mes compétences"),
        h("button", { type: "button", class: "btn btn-small btn-ghost", onClick: () => editMe() }, h("span", { html: icon("user") }), "Modifier mon profil"),
        h("button", { type: "button", class: "btn btn-small btn-ghost", onClick: () => go("placement", { start: placement?.band || "A2" }) }, h("span", { html: icon("refresh") }), "Repasser le test de placement"),
        listProfiles().length > 1 ? h("button", { type: "button", class: "btn btn-small btn-ghost", onClick: () => go("who") }, "Changer de joueur") : h("button", { type: "button", class: "btn btn-small btn-ghost", onClick: () => go("onboarding", { adding: true }) }, "Ajouter un membre de la famille"),
      ),
      h("div", { class: "pstats" }, stat(state.xp.toLocaleString("fr-CA"), "XP"), stat(streakAlive(), "jours de suite"), stat(passed, "stations réussies"), stat(wordsLearned(), "mots réussis"), stat(`${acc} %`, "de bonnes réponses"), stat(`${minutes} min`, "de réflexion"), stat(mistakeCount(), "erreurs à revoir"), stat(Object.values(state.bosses).filter((b) => b.defeated && !b.placed).length, "boss battus")),
      h("h2", { class: "section-title" }, "Badges"),
      h("div", { class: "badges" }, BADGES.map((b) => h("div", { class: `badge ${state.badges[b.id] ? "got" : ""}` }, h("span", { class: "badge-ic", html: icon(state.badges[b.id] ? "trophy" : "lock") }), h("strong", null, b.name), h("small", null, b.desc)))),
      h("h2", { class: "section-title" }, "Réglages"),
      h(
        "div",
        { class: "settings" },
        h("label", { class: "set-row", for: "sound" }, h("span", null, h("strong", null, "Effets sonores"), h("small", null, "Bips, fanfares, bulles…")), sound),
        h("div", { class: "set-row col" }, h("label", { for: "voice-select" }, h("strong", null, "Voix anglaise"), h("small", null, ttsReady() ? "Choisis la voix qui te plaît le plus." : "Aucune voix anglaise trouvée sur cet appareil.")), voiceSel),
        h("div", { class: "set-row col" }, h("label", { for: "rate" }, h("strong", null, "Vitesse de la voix"), h("small", null, "Ralentis au début, accélère quand tu progresses.")), h("div", { class: "range-row" }, rate, rateVal)),
        h("div", { class: "set-row" }, h("span", null, h("strong", null, "Tester les voix"), h("small", null, coachReady() ? "Le coach (voix française) et la voix anglaise." : "Pas de voix française : le coach se contentera de l'anglais.")), h("button", { type: "button", class: "btn btn-small", onClick: () => speakParts([{ text: "Salut ! Je suis ton coach. Écoute bien :", lang: "fr" }, { text: "Hello! Nice to meet you.", lang: "en" }]) }, "Écouter")),
      ),
      h("h2", { class: "section-title" }, "Sauvegarde"),
      h(
        "div",
        { class: "settings" },
        h("p", { class: "set-help" }, "La progression est enregistrée dans ce navigateur. Pour la mettre à l'abri ou la passer sur un autre appareil, télécharge un fichier de sauvegarde (ou copie ton code)."),
        h("p", { class: "set-help" }, daysSinceBackup() == null ? "Aucune sauvegarde de la famille pour l'instant." : daysSinceBackup() === 0 ? "Dernière sauvegarde de la famille : aujourd'hui." : `Dernière sauvegarde de la famille : il y a ${daysSinceBackup()} jour${daysSinceBackup() > 1 ? "s" : ""}.`),
        h("div", { class: "row" }, h("button", { type: "button", class: "btn btn-small btn-primary", onClick: () => (downloadFamilyBackup(), toast("Sauvegarde de la famille téléchargée.", "ok")) }, h("span", { html: icon("copy") }), "Sauvegarder toute la famille")),
        autoBlock(),
        h("div", { class: "row" }, h("button", { type: "button", class: "btn btn-small", onClick: () => downloadJSON(exportProfile(state.player.id), backupName(state.player.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "profil")) }, h("span", { html: icon("copy") }), "Télécharger ma sauvegarde"), h("button", { type: "button", class: "btn btn-small btn-ghost", onClick: () => restoreFile() }, "Restaurer un fichier")),
        h("div", { class: "row" }, h("button", { type: "button", class: "btn btn-small btn-ghost", onClick: async () => {
          codeOut.value = exportCode();
          const ok = await copyText(codeOut.value, codeOut);
          toast(ok ? "Code copié !" : "Sélectionne le code et copie-le.");
        } }, "Créer et copier mon code")),
        codeOut,
        codeIn,
        h("div", { class: "row" }, h("button", { type: "button", class: "btn btn-small btn-ghost", onClick: async () => {
          if (!codeIn.value.trim()) return toast("Colle d'abord un code.");
          const ok = await dialog({ title: "Remplacer ta progression ?", body: "<p>La progression de ce profil sera remplacée par celle du code.</p>", actions: [{ label: "Annuler", value: false }, { label: "Restaurer", value: true, primary: true }] });
          if (!ok) return;
          try {
            importCode(codeIn.value);
            toast("Progression restaurée !", "ok");
            go("map");
          } catch (e) {
            toast(e.message, "ko");
          }
        } }, "Restaurer depuis un code")),
      ),
      h("h2", { class: "section-title" }, "Correcteur IA (optionnel)"),
      aiBlock(),
      h("h2", { class: "section-title" }, "Conseils pour progresser vite"),
      h(
        "ul",
        { class: "tips" },
        h("li", null, h("strong", null, "15 à 20 minutes par jour"), " valent mieux que 2 heures le dimanche. Commence par l'entraînement du jour : la répétition espacée fait le travail."),
        h("li", null, h("strong", null, "Parle à voix haute"), " pendant le mode perroquet et l'atelier prononciation, même si tu te sens ridicule."),
        h("li", null, h("strong", null, "Écris une rédaction par semaine"), " et corrige-la jusqu'à 15/20."),
        h("li", null, h("strong", null, "Hors de l'app"), " : séries, vidéos et podcasts en anglais, sous-titres anglais. C'est là que tu deviendras vraiment bilingue."),
      ),
    ),
  );
}

/** Automatic backup file (Chrome / Edge on a computer). */
function autoBlock() {
  if (!autoSupported()) return h("p", { class: "set-help" }, "Sauvegarde automatique : disponible sur ordinateur avec Chrome ou Edge. Sur téléphone, utilise le rappel quotidien de la carte.");
  const box = h("div", { class: "auto-backup" });
  const render = async () => {
    const st = await autoStatus();
    const label = { off: "désactivée", on: "activée : le fichier est mis à jour après chaque séance", paused: "en pause : le navigateur redemande l'autorisation" }[st];
    box.replaceChildren(
      h("p", null, h("strong", null, "Sauvegarde automatique : "), label),
      h("p", { class: "set-help" }, "Choisis un fichier une fois (idéalement dans ton dossier Google Drive ou OneDrive synchronisé) : l'app le réécrit toute seule, 20 secondes après chaque changement et quand tu fermes la page."),
      h(
        "div",
        { class: "row" },
        st !== "on" ? h("button", { type: "button", class: "btn btn-small", onClick: async () => {
          try {
            if (st === "paused" && (await resumeAuto())) toast("Sauvegarde automatique réactivée.", "ok");
            else {
              const name = await chooseAutoFile();
              toast(`Sauvegarde automatique dans « ${name} ».`, "ok");
            }
          } catch (e) {
            if (e?.name !== "AbortError") toast("Impossible d'écrire ce fichier.", "ko");
          }
          render();
        } }, st === "paused" ? "Réactiver" : "Choisir le fichier de sauvegarde") : null,
        st !== "off" ? h("button", { type: "button", class: "btn btn-small btn-ghost", onClick: async () => (await disableAuto(), toast("Sauvegarde automatique désactivée."), render()) }, "Désactiver") : null,
      ),
    );
  };
  render();
  return box;
}

async function editMe() {
  const name = h("input", { class: "field", id: "edit-name", value: state.player.name, maxlength: 20, "aria-label": "Prénom" });
  const age = h("select", { class: "field", id: "edit-age", "aria-label": "Tranche d'âge" }, Object.entries(AGES).map(([k, a]) => h("option", { value: k, selected: k === state.player.age }, `${a.label} (${a.desc})`)));
  const av = h("select", { class: "field", id: "edit-avatar", "aria-label": "Avatar" }, AVATARS.map((a) => h("option", { value: a.id, selected: a.id === state.player.avatar }, `${a.emoji} ${a.id}`)));
  const ok = await dialog({ title: "Modifier mon profil", body: h("div", { class: "stack" }, h("label", { for: "edit-name" }, "Prénom"), name, h("label", { for: "edit-age" }, "Tranche d'âge"), age, h("label", { for: "edit-avatar" }, "Avatar"), av), actions: [{ label: "Annuler", value: false }, { label: "Enregistrer", value: true, primary: true }] });
  if (!ok) return;
  updateProfile(state.player.id, { name: name.value, age: age.value, avatar: av.value });
  toast("Profil mis à jour.", "ok");
  go("profile");
}

async function restoreFile() {
  try {
    const obj = await pickBackupFile();
    if (!obj) return;
    const ok = await dialog({ title: "Restaurer ce fichier ?", body: "<p>Les profils du fichier remplacent ceux qui portent le même identifiant ; les autres sont ajoutés.</p>", actions: [{ label: "Annuler", value: false }, { label: "Restaurer", value: true, primary: true }] });
    if (!ok) return;
    const n = importBackup(obj);
    toast(`${n} profil${n > 1 ? "s" : ""} restauré${n > 1 ? "s" : ""}.`, "ok");
    go("who");
  } catch (e) {
    toast(e.message, "ko");
  }
}

/** Optional AI correction: the Anthropic API key stays on this device and is never in the backups. */
function aiBlock() {
  const aiKey = h("input", { class: "field", type: "password", id: "ai-key", placeholder: "sk-ant-…", autocomplete: "off", value: family.aiKey || "", "aria-label": "Clé API Anthropic" });
  const aiModel = h(
    "select",
    { class: "field", id: "ai-model", "aria-label": "Modèle IA" },
    [["claude-opus-5-5", "Claude Opus 5.5 (recommandé, le plus fin)"], ["claude-sonnet-5-5", "Claude Sonnet 5.5 (plus économique)"], ["claude-haiku-4-5", "Claude Haiku 4.5 (le plus rapide et le moins cher)"]].map(([v, l]) => h("option", { value: v, selected: v === family.aiModel }, l)),
  );
  return h(
    "div",
    { class: "settings" },
    h("p", { class: "set-help" }, "Le correcteur intégré fonctionne sans internet. Avec une clé API Anthropic, l'atelier d'écriture propose aussi une correction par Claude. La clé reste sur cet appareil et n'est jamais incluse dans les sauvegardes ; chaque correction est facturée sur le compte de la clé."),
    h("label", { class: "field-label", for: "ai-key" }, "Clé API"),
    aiKey,
    h("label", { class: "field-label", for: "ai-model" }, "Modèle"),
    aiModel,
    h(
      "div",
      { class: "row" },
      h("button", { type: "button", class: "btn btn-small", onClick: () => {
        family.aiKey = aiKey.value.trim();
        family.aiModel = aiModel.value;
        saveFamily();
        toast(family.aiKey ? "Correcteur IA activé." : "Correcteur IA désactivé.", "ok");
      } }, "Enregistrer"),
      h("button", { type: "button", class: "btn btn-small btn-ghost", onClick: () => {
        family.aiKey = "";
        aiKey.value = "";
        saveFamily();
        toast("Clé effacée.");
      } }, "Effacer la clé"),
    ),
  );
}
