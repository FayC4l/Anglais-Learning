// Profile: stats, badges, settings, save code, and the PIN-protected big-brother zone.
import { h, icon, toast, dialog, copyText, esc } from "../ui.js";
import { LEVELS } from "../content.js";
import { state, save, rank, wordsLearned, mistakeCount, streakAlive, BADGES, DIFFICULTY, exportCode, importCode, resetAll, unitState, bossState, highestLevelDone } from "../store.js";
import { go } from "../router.js";
import { englishVoices, ttsReady, coachReady, speak, speakParts, sfx } from "../audio.js";

export function profileScreen(view) {
  const s = state.stats;
  const acc = s.answers ? Math.round((s.correct / s.answers) * 100) : 0;
  const minutes = Math.round(s.ms / 60000);
  const passed = Object.values(state.units).filter((u) => u.passed).length;
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

  view.append(
    h(
      "div",
      { class: "profile" },
      h("div", { class: "topbar" }, h("button", { type: "button", class: "icon-btn", "aria-label": "Retour au réseau", html: icon("back"), onClick: () => go("map") }), h("span", { class: "topbar-title" }, "Profil")),
      h("header", { class: "profile-head" }, h("span", { class: "avatar xl" }, (state.player.name || "?").slice(0, 1).toUpperCase()), h("div", null, h("h1", { class: "page-title" }, state.player.name), h("p", { class: "rank" }, `Rang : ${rank()} · ${highestLevelDone()} ligne${highestLevelDone() > 1 ? "s" : ""} terminée${highestLevelDone() > 1 ? "s" : ""} sur 12`))),
      h("div", { class: "pstats" }, stat(state.xp.toLocaleString("fr-CA"), "XP"), stat(streakAlive(), "jours de suite"), stat(passed, "stations réussies"), stat(wordsLearned(), "mots réussis"), stat(`${acc} %`, "de bonnes réponses"), stat(`${minutes} min`, "de réflexion"), stat(mistakeCount(), "erreurs à revoir"), stat(Object.values(state.bosses).filter((b) => b.defeated).length, "boss battus")),
      h("h2", { class: "section-title" }, "Badges"),
      h(
        "div",
        { class: "badges" },
        BADGES.map((b) => h("div", { class: `badge ${state.badges[b.id] ? "got" : ""}` }, h("span", { class: "badge-ic", html: icon(state.badges[b.id] ? "trophy" : "lock") }), h("strong", null, b.name), h("small", null, b.desc))),
      ),
      h("h2", { class: "section-title" }, "Réglages"),
      h(
        "div",
        { class: "settings" },
        h("label", { class: "set-row", for: "sound" }, h("span", null, h("strong", null, "Effets sonores"), h("small", null, "Bips, fanfares, bulles…")), sound),
        h("div", { class: "set-row col" }, h("label", { for: "voice-select" }, h("strong", null, "Voix anglaise"), h("small", null, ttsReady() ? "Choisis la voix qui te plaît le plus." : "Aucune voix anglaise trouvée sur cet appareil.")), voiceSel),
        h("div", { class: "set-row col" }, h("label", { for: "rate" }, h("strong", null, "Vitesse de la voix"), h("small", null, "Ralentis au début, accélère quand tu progresses.")), h("div", { class: "range-row" }, rate, rateVal)),
        h(
          "div",
          { class: "set-row" },
          h("span", null, h("strong", null, "Tester les voix"), h("small", null, coachReady() ? "Le coach (voix française) et la voix anglaise." : "Pas de voix française : le coach se contentera de l'anglais.")),
          h("button", { type: "button", class: "btn btn-small", onClick: () => speakParts([{ text: "Salut ! Je suis ton coach. Écoute bien :", lang: "fr" }, { text: "Hello! Nice to meet you.", lang: "en" }]) }, "Écouter"),
        ),
      ),
      h("h2", { class: "section-title" }, "Sauvegarde"),
      h(
        "div",
        { class: "settings" },
        h("p", { class: "set-help" }, "Ta progression est enregistrée dans ce navigateur. Pour la garder en sécurité ou la passer sur un autre appareil, copie ton code de sauvegarde et garde-le (dans tes notes, par courriel…)."),
        h("div", { class: "row" }, h("button", { type: "button", class: "btn btn-small", onClick: async () => {
          codeOut.value = exportCode();
          const ok = await copyText(codeOut.value, codeOut);
          toast(ok ? "Code copié !" : "Sélectionne le code et copie-le.");
        } }, h("span", { html: icon("copy") }), "Créer et copier mon code")),
        codeOut,
        codeIn,
        h("div", { class: "row" }, h("button", { type: "button", class: "btn btn-small btn-ghost", onClick: async () => {
          if (!codeIn.value.trim()) return toast("Colle d'abord un code.");
          const ok = await dialog({ title: "Remplacer ta progression ?", body: "<p>La progression actuelle de cet appareil sera remplacée par celle du code.</p>", actions: [{ label: "Annuler", value: false }, { label: "Restaurer", value: true, primary: true }] });
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
      h("h2", { class: "section-title" }, "Zone grand frère"),
      h("div", { class: "settings" }, h("p", { class: "set-help" }, "Réglages réservés à celui qui a lancé le défi : difficulté, suivi détaillé, déblocage. Protégés par un code à 4 chiffres."), h("button", { type: "button", class: "btn btn-small", onClick: () => bigBrother(view) }, h("span", { html: icon("shield") }), "Ouvrir la zone grand frère")),
      h("h2", { class: "section-title" }, "Conseils pour progresser vite"),
      h(
        "ul",
        { class: "tips" },
        h("li", null, h("strong", null, "15 à 20 minutes par jour"), " valent mieux que 2 heures le dimanche. Le cerveau retient grâce à la répétition espacée."),
        h("li", null, h("strong", null, "Parle à voix haute"), " pendant le mode perroquet et l'atelier prononciation, même si tu te sens ridicule."),
        h("li", null, h("strong", null, "Révise ton carnet d'erreurs"), " au début de chaque séance."),
        h("li", null, h("strong", null, "Hors de l'app"), " : regarde tes séries et vidéos préférées en anglais avec sous-titres anglais. C'est là que tu deviendras vraiment bilingue."),
      ),
    ),
  );
}

async function bigBrother(view) {
  const pin = h("input", { class: "field pin", type: "password", inputmode: "numeric", maxlength: 4, id: "pin", autocomplete: "off", "aria-label": "Code à 4 chiffres" });
  const hasPin = !!state.settings.pin;
  const v = await dialog({
    title: hasPin ? "Code du grand frère" : "Choisis un code à 4 chiffres",
    body: h("div", null, h("p", null, hasPin ? "Entre ton code pour accéder aux réglages." : "Ce code protège les réglages. Ne le donne pas à ton petit frère !"), pin),
    actions: [
      { label: "Annuler", value: null },
      { label: "Valider", value: () => pin.value, primary: true },
    ],
  });
  if (v == null) return;
  if (!/^\d{4}$/.test(v)) return toast("Le code doit avoir 4 chiffres.");
  if (!hasPin) {
    state.settings.pin = v;
    save();
    toast("Code enregistré.", "ok");
  } else if (v !== state.settings.pin) {
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
    toast(`Mode ${DIFFICULTY[e.target.value].label} activé.`, "ok");
  });
  const unlock = h("input", { type: "checkbox", id: "unlock-all", checked: state.unlockAll });
  unlock.addEventListener("change", () => {
    state.unlockAll = unlock.checked;
    save();
    toast(unlock.checked ? "Tout est débloqué (pour explorer)." : "Progression normale rétablie.");
  });
  const rows = LEVELS.map((l) =>
    h(
      "tr",
      null,
      h("th", { scope: "row" }, h("span", { class: "bullet sm", style: { "--line": `var(--l${l.id})`, "--line-ink": `var(--l${l.id}-ink)` } }, l.id)),
      ...l.units.map((u) => {
        const st = unitState(u.id);
        return h("td", { class: st.passed ? "ok" : "" }, st.attempts ? `${Math.round((st.best || 0) * 100)} % · ${st.attempts}×` : st.passed ? "validée" : "—");
      }),
      h("td", { class: bossState(l.id).defeated ? "ok" : "" }, bossState(l.id).attempts ? `${bossState(l.id).defeated ? "battu" : "pas encore"} · ${bossState(l.id).attempts}×` : "—"),
    ),
  );
  const newPin = h("input", { class: "field pin", type: "password", inputmode: "numeric", maxlength: 4, id: "new-pin", placeholder: "Nouveau code", autocomplete: "off", "aria-label": "Nouveau code" });
  const resetConfirm = h("input", { class: "field", type: "text", id: "reset-confirm", placeholder: "Tape EFFACER", autocomplete: "off", "aria-label": "Confirmation" });
  view.replaceChildren(
    h(
      "div",
      { class: "profile zone" },
      h("div", { class: "topbar" }, h("button", { type: "button", class: "icon-btn", "aria-label": "Retour au profil", html: icon("back"), onClick: () => go("profile") }), h("span", { class: "topbar-title" }, "Zone grand frère")),
      h("h1", { class: "page-title" }, "Zone grand frère"),
      h("h2", { class: "section-title" }, "Difficulté des tests et des boss"),
      diffSel,
      h("p", { class: "set-help" }, "Conseil : commence en Difficile. Si ton frère échoue 3 fois de suite au même test malgré l'entraînement, passe en Normal un moment : le but est qu'il progresse, pas qu'il abandonne."),
      h("h2", { class: "section-title" }, "Suivi détaillé"),
      h("p", { class: "set-help" }, "Meilleur score et nombre d'essais par station (colonnes 1 à 4) et contre le boss."),
      h("div", { class: "l-table-wrap" }, h("table", { class: "l-table track" }, h("thead", null, h("tr", null, h("th", null, "Ligne"), h("th", null, "1"), h("th", null, "2"), h("th", null, "3"), h("th", null, "4"), h("th", null, "Boss"))), h("tbody", null, rows))),
      h("p", { class: "set-help" }, `Temps de réflexion total : ${Math.round(state.stats.ms / 60000)} min · ${state.stats.answers} réponses · ${state.stats.tests} tests · ${state.stats.bosses} combats de boss · ${state.stats.games} parties de jeux.`),
      h("h2", { class: "section-title" }, "Explorer le contenu"),
      h("label", { class: "set-row", for: "unlock-all" }, h("span", null, h("strong", null, "Tout débloquer"), h("small", null, "Pour vérifier le contenu des 12 niveaux. Pense à le désactiver avant de rendre l'appareil.")), unlock),
      h("h2", { class: "section-title" }, "Code"),
      h("div", { class: "row" }, newPin, h("button", { type: "button", class: "btn btn-small", onClick: () => {
        if (!/^\d{4}$/.test(newPin.value)) return toast("4 chiffres, s'il te plaît.");
        state.settings.pin = newPin.value;
        save();
        newPin.value = "";
        toast("Code changé.", "ok");
      } }, "Changer le code")),
      h("h2", { class: "section-title" }, "Tout recommencer"),
      h("p", { class: "set-help" }, "Efface toute la progression de cet appareil (XP, stations, boss, carnet). Impossible à annuler, sauf avec un code de sauvegarde."),
      h("div", { class: "row" }, resetConfirm, h("button", { type: "button", class: "btn btn-small btn-danger", onClick: () => {
        if (resetConfirm.value.trim().toUpperCase() !== "EFFACER") return toast("Tape EFFACER pour confirmer.");
        resetAll();
        toast("Progression effacée.");
        go("onboarding");
      } }, "Effacer la progression")),
    ),
  );
}

export { esc };
