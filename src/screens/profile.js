// Profile: stats, badges, settings, backups, and the PIN-protected family management zone.
import { h, icon, toast, dialog, copyText, esc } from "../ui.js";
import { LEVELS } from "../content.js";
import { state, save, rank, wordsLearned, mistakeCount, streakAlive, BADGES, DIFFICULTY, exportCode, importCode, resetAll, highestLevelDone } from "../store.js";
import { family, saveFamily, listProfiles, profileState, updateProfile, deleteProfile, exportFamily, exportProfile, importBackup, AGES, AVATARS } from "../profiles.js";
import { go } from "../router.js";
import { englishVoices, ttsReady, coachReady, speak, speakParts, sfx } from "../audio.js";
import { avatarEl } from "./who.js";
import { downloadJSON, pickBackupFile, backupName } from "./backup.js";

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
      h("h2", { class: "section-title" }, "Zone gestion"),
      h("div", { class: "settings" }, h("p", { class: "set-help" }, "Réservée aux parents (ou au grand frère) : difficulté de chaque profil, suivi de toute la famille, correcteur IA, sauvegarde familiale. Protégée par un code à 4 chiffres."), h("button", { type: "button", class: "btn btn-small", onClick: () => openZone(view) }, h("span", { html: icon("shield") }), "Ouvrir la zone gestion")),
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

async function openZone(view) {
  const pin = h("input", { class: "field pin", type: "password", inputmode: "numeric", maxlength: 4, id: "pin", autocomplete: "off", "aria-label": "Code à 4 chiffres" });
  const hasPin = !!family.pin;
  const v = await dialog({
    title: hasPin ? "Code de gestion" : "Choisis un code à 4 chiffres",
    body: h("div", null, h("p", null, hasPin ? "Entre le code pour accéder à la zone gestion." : "Ce code protège les réglages de toute la famille. Garde-le pour toi !"), pin),
    actions: [
      { label: "Annuler", value: null },
      { label: "Valider", value: () => pin.value, primary: true },
    ],
  });
  if (v == null) return;
  if (!/^\d{4}$/.test(v)) return toast("Le code doit avoir 4 chiffres.");
  if (!hasPin) {
    family.pin = v;
    saveFamily();
    toast("Code enregistré.", "ok");
  } else if (v !== family.pin) {
    sfx.wrong();
    return toast("Mauvais code.", "ko");
  }
  zone(view);
}

function zone(view) {
  const diffSel = h("div", { class: "diff-options" }, Object.entries(DIFFICULTY).map(([k, d]) => h("label", { class: `diff-opt ${state.settings.difficulty === k ? "on" : ""}`, for: `diff-${k}` }, h("input", { type: "radio", name: "diff", id: `diff-${k}`, value: k, checked: state.settings.difficulty === k }), h("strong", null, d.label), h("small", null, d.desc))));
  diffSel.addEventListener("change", (e) => {
    state.settings.difficulty = e.target.value;
    save();
    diffSel.querySelectorAll(".diff-opt").forEach((o) => o.classList.toggle("on", o.querySelector("input").checked));
    toast(`Mode ${DIFFICULTY[e.target.value].label} activé pour ${state.player.name}.`, "ok");
  });
  const unlock = h("input", { type: "checkbox", id: "unlock-all", checked: state.unlockAll });
  unlock.addEventListener("change", () => {
    state.unlockAll = unlock.checked;
    save();
    toast(unlock.checked ? "Tout est débloqué pour ce profil." : "Progression normale rétablie.");
  });

  // Family overview.
  const familyRows = listProfiles().map((p) => {
    const st = profileState(p.id);
    const top = Object.entries(st?.bosses || {}).filter(([, b]) => b.defeated).reduce((m, [L]) => Math.max(m, Number(L)), 0);
    const answers = st?.stats?.answers || 0;
    const lastWriting = (st?.writing || []).slice(-1)[0];
    return h(
      "tr",
      null,
      h("th", { scope: "row" }, avatarEl(p.avatar), " ", p.name),
      h("td", null, AGES[p.age]?.label || ""),
      h("td", null, st?.placement ? st.placement.band : "—"),
      h("td", null, `${top}/12`),
      h("td", null, (st?.xp || 0).toLocaleString("fr-CA")),
      h("td", null, answers ? `${Math.round(((st.stats.correct || 0) / answers) * 100)} %` : "—"),
      h("td", null, `${Math.round((st?.stats?.ms || 0) / 60000)} min`),
      h("td", null, lastWriting ? `${lastWriting.score}/20` : "—"),
      h(
        "td",
        null,
        p.id === state.player.id
          ? h("em", null, "actif")
          : h("button", { type: "button", class: "btn btn-small btn-danger", onClick: async () => {
              const ok = await dialog({ title: `Supprimer ${p.name} ?`, body: `<p>Toute la progression de <strong>${esc(p.name)}</strong> sera effacée de cet appareil. Pense à télécharger une sauvegarde avant.</p>`, actions: [{ label: "Annuler", value: false }, { label: "Supprimer", value: true, danger: true }] });
              if (!ok) return;
              deleteProfile(p.id);
              toast(`${p.name} supprimé.`);
              zone(view);
            } }, "Supprimer"),
      ),
    );
  });

  // Per-unit tracking of the active profile.
  const rows = LEVELS.map((l) =>
    h(
      "tr",
      null,
      h("th", { scope: "row" }, h("span", { class: "bullet sm", style: { "--line": `var(--l${l.id})`, "--line-ink": `var(--l${l.id}-ink)` } }, l.id)),
      ...l.units.map((u) => {
        const st = state.units[u.id] || {};
        return h("td", { class: st.passed ? "ok" : "" }, st.attempts ? `${Math.round((st.best || 0) * 100)} % · ${st.attempts}×` : st.placed ? "placé" : st.passed ? "validée" : "—");
      }),
      ...Array.from({ length: Math.max(0, 5 - l.units.length) }, () => h("td", null, "")),
      h("td", { class: state.bosses[l.id]?.defeated ? "ok" : "" }, state.bosses[l.id]?.attempts ? `${state.bosses[l.id].defeated ? "battu" : "pas encore"} · ${state.bosses[l.id].attempts}×` : state.bosses[l.id]?.placed ? "placé" : "—"),
    ),
  );

  const newPin = h("input", { class: "field pin", type: "password", inputmode: "numeric", maxlength: 4, id: "new-pin", placeholder: "Nouveau code", autocomplete: "off", "aria-label": "Nouveau code" });
  const aiKey = h("input", { class: "field", type: "password", id: "ai-key", placeholder: "sk-ant-…", autocomplete: "off", value: family.aiKey || "", "aria-label": "Clé API Anthropic" });
  const aiModel = h(
    "select",
    { class: "field", id: "ai-model", "aria-label": "Modèle IA" },
    [["claude-sonnet-5-5", "Claude Sonnet 5.5 (recommandé)"], ["claude-opus-5-5", "Claude Opus 5.5 (le plus fin, plus cher)"], ["claude-haiku-4-5-20251001", "Claude Haiku 4.5 (rapide et économique)"]].map(([v, l]) => h("option", { value: v, selected: v === family.aiModel }, l)),
  );
  const resetConfirm = h("input", { class: "field", type: "text", id: "reset-confirm", placeholder: "Tape EFFACER", autocomplete: "off", "aria-label": "Confirmation" });
  view.replaceChildren(
    h(
      "div",
      { class: "profile zone" },
      h("div", { class: "topbar" }, h("button", { type: "button", class: "icon-btn", "aria-label": "Retour au profil", html: icon("back"), onClick: () => go("profile") }), h("span", { class: "topbar-title" }, "Zone gestion")),
      h("h1", { class: "page-title" }, "Zone gestion"),
      h("h2", { class: "section-title" }, "La famille"),
      h("div", { class: "l-table-wrap" }, h("table", { class: "l-table track family" }, h("thead", null, h("tr", null, ["Profil", "Âge", "Placement", "Lignes", "XP", "Réussite", "Temps", "Rédaction", ""].map((t) => h("th", null, t)))), h("tbody", null, familyRows))),
      h("div", { class: "row" }, h("button", { type: "button", class: "btn btn-small", onClick: () => downloadJSON(exportFamily(), backupName("famille")) }, h("span", { html: icon("copy") }), "Télécharger la sauvegarde de toute la famille"), h("button", { type: "button", class: "btn btn-small btn-ghost", onClick: () => restoreFile() }, "Restaurer un fichier")),
      h("h2", { class: "section-title" }, `Difficulté pour ${state.player.name}`),
      diffSel,
      h("p", { class: "set-help" }, "Conseil : Difficile par défaut. Si un test est raté 3 fois de suite malgré l'entraînement, passe en Normal un moment : le but est de progresser, pas d'abandonner. Chaque profil a sa propre difficulté."),
      h("h2", { class: "section-title" }, `Suivi détaillé de ${state.player.name}`),
      h("p", { class: "set-help" }, "Meilleur score et nombre d'essais par station (colonnes 1 à 5) et contre le boss."),
      h("div", { class: "l-table-wrap" }, h("table", { class: "l-table track" }, h("thead", null, h("tr", null, h("th", null, "Ligne"), ["1", "2", "3", "4", "5"].map((t) => h("th", null, t)), h("th", null, "Boss"))), h("tbody", null, rows))),
      h("h2", { class: "section-title" }, "Correcteur IA (optionnel)"),
      h(
        "div",
        { class: "settings" },
        h("p", { class: "set-help" }, "Le correcteur intégré fonctionne sans internet. Avec une clé API Anthropic, l'atelier d'écriture propose aussi une correction par Claude (sens, style, version corrigée). La clé reste sur cet appareil et n'est jamais incluse dans les sauvegardes. Chaque correction est facturée sur le compte Anthropic de la clé."),
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
      ),
      h("h2", { class: "section-title" }, "Explorer le contenu"),
      h("label", { class: "set-row", for: "unlock-all" }, h("span", null, h("strong", null, "Tout débloquer pour ce profil"), h("small", null, "Pour vérifier le contenu des 12 niveaux. Pense à le désactiver ensuite.")), unlock),
      h("h2", { class: "section-title" }, "Code de gestion"),
      h("div", { class: "row" }, newPin, h("button", { type: "button", class: "btn btn-small", onClick: () => {
        if (!/^\d{4}$/.test(newPin.value)) return toast("4 chiffres, s'il te plaît.");
        family.pin = newPin.value;
        saveFamily();
        newPin.value = "";
        toast("Code changé.", "ok");
      } }, "Changer le code")),
      h("h2", { class: "section-title" }, `Recommencer à zéro (${state.player.name})`),
      h("p", { class: "set-help" }, "Efface la progression de ce profil (XP, stations, boss, carnet, rédactions). Impossible à annuler, sauf avec une sauvegarde."),
      h("div", { class: "row" }, resetConfirm, h("button", { type: "button", class: "btn btn-small btn-danger", onClick: () => {
        if (resetConfirm.value.trim().toUpperCase() !== "EFFACER") return toast("Tape EFFACER pour confirmer.");
        resetAll();
        toast("Progression effacée.");
        go("welcome");
      } }, "Effacer la progression")),
    ),
  );
}
