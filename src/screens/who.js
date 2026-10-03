// "Qui joue ?" (profile picker) and profile creation.
import { h, icon, toast, dialog } from "../ui.js";
import { LINE_COUNT } from "../content.js";
import { RANKS, importCode, decodeCode } from "../store.js";
import { family, listProfiles, selectProfile, createProfile, profileState, AVATARS, AGES, avatarOf, importBackup } from "../profiles.js";
import { go } from "../router.js";
import { sfx, unlockAudio } from "../audio.js";
import { shake } from "../fx.js";
import { pickBackupFile } from "./backup.js";

export const avatarEl = (id, cls = "") => {
  const a = avatarOf(id);
  return h("span", { class: `avatar emoji ${cls}`, style: { "--av": a.color }, "aria-hidden": "true" }, a.emoji);
};

const rankOf = (st) => {
  let n = 0;
  for (const [L, b] of Object.entries(st?.bosses || {})) if (b.defeated) n = Math.max(n, Number(L));
  return RANKS[Math.min(n, RANKS.length - 1)];
};

/** Profile picker shown at launch when the family has several profiles. */
export function whoScreen(view) {
  const profiles = listProfiles();
  if (!profiles.length) return go("onboarding");
  const grid = h("div", { class: "who-grid" });
  for (const p of profiles) {
    const st = profileState(p.id);
    const card = h(
      "button",
      { type: "button", class: `who-card ${p.id === family.activeId ? "last" : ""}`, "aria-label": `Jouer avec le profil ${p.name}` },
      avatarEl(p.avatar, "xl"),
      h("strong", { class: "who-name" }, p.name),
      h("span", { class: "who-meta" }, `${rankOf(st)} · ${(st?.xp || 0).toLocaleString("fr-CA")} XP`),
      h("span", { class: "who-age" }, AGES[p.age]?.label || ""),
    );
    card.addEventListener("click", () => {
      unlockAudio();
      sfx.tap();
      selectProfile(p.id);
      go("map");
    });
    grid.append(card);
  }
  const add = h("button", { type: "button", class: "who-card add", "aria-label": "Ajouter un profil" }, h("span", { class: "avatar xl plus", html: icon("user") }), h("strong", { class: "who-name" }, "Ajouter"), h("span", { class: "who-meta" }, "un nouveau joueur"));
  add.addEventListener("click", () => go("onboarding", { adding: true }));
  grid.append(add);
  view.append(
    h(
      "div",
      { class: "who" },
      h("p", { class: "eyebrow" }, "Mission Bilingue"),
      h("h1", { class: "page-title" }, "Qui joue aujourd'hui ?"),
      h("p", { class: "page-lead" }, "Chaque membre de la famille a son profil, sa progression et son carnet d'erreurs."),
      grid,
      h("button", { type: "button", class: "btn btn-ghost", onClick: () => restoreFromFile() }, h("span", { html: icon("refresh") }), "Restaurer une sauvegarde"),
    ),
  );
  grid.querySelector(".who-card")?.focus();
}

async function restoreFromFile() {
  try {
    const obj = await pickBackupFile();
    if (!obj) return;
    const n = importBackup(obj);
    toast(`${n} profil${n > 1 ? "s" : ""} restauré${n > 1 ? "s" : ""} !`, "ok");
    go("who");
  } catch (e) {
    toast(e.message, "ko");
  }
}

/** Profile creation (first launch, or "Ajouter" from the picker). */
export function onboarding(view, { adding = false } = {}) {
  let avatar = AVATARS[Math.floor(Math.random() * AVATARS.length)].id;
  let age = "";
  const name = h("input", { id: "player-name", class: "field", type: "text", maxlength: 20, placeholder: "Ton prénom", autocomplete: "off", "aria-label": "Ton prénom" });
  const avatars = h(
    "div",
    { class: "avatar-pick", role: "radiogroup", "aria-label": "Choisis ton avatar" },
    AVATARS.map((a) => {
      const b = h("button", { type: "button", class: `av-opt ${a.id === avatar ? "on" : ""}`, role: "radio", "aria-checked": String(a.id === avatar), "aria-label": a.id, style: { "--av": a.color } }, a.emoji);
      b.addEventListener("click", () => {
        avatar = a.id;
        sfx.tap();
        avatars.querySelectorAll(".av-opt").forEach((o) => {
          o.classList.toggle("on", o === b);
          o.setAttribute("aria-checked", String(o === b));
        });
      });
      return b;
    }),
  );
  const ages = h(
    "div",
    { class: "age-pick", role: "radiogroup", "aria-label": "Ton âge" },
    Object.entries(AGES).map(([k, a]) => {
      const b = h("button", { type: "button", class: "age-opt", role: "radio", "aria-checked": "false", "data-age": k }, h("strong", null, a.label), h("small", null, a.desc));
      b.addEventListener("click", () => {
        age = k;
        sfx.tap();
        ages.querySelectorAll(".age-opt").forEach((o) => {
          o.classList.toggle("on", o === b);
          o.setAttribute("aria-checked", String(o === b));
        });
      });
      return b;
    }),
  );
  const start = h("button", { type: "button", class: "btn btn-primary btn-xl" }, adding ? "Créer le profil" : "Monter à bord");
  const restore = h("button", { type: "button", class: "btn btn-ghost" }, "J'ai une sauvegarde (fichier ou code)");
  const letters = "Mission Bilingue".split("").map((c, i) => h("span", { class: "drop", style: { "--i": i } }, c === " " ? " " : c));
  const lines = h("div", { class: "intro-lines", "aria-hidden": "true" }, Array.from({ length: LINE_COUNT }, (_, i) => h("span", { style: { "--c": `var(--l${i + 1})`, "--i": i } })));
  view.append(
    h(
      "div",
      { class: "onboard" },
      lines,
      adding ? h("div", { class: "topbar" }, h("button", { type: "button", class: "icon-btn", "aria-label": "Retour", html: icon("back"), onClick: () => go("who") }), h("span", { class: "topbar-title" }, "Nouveau profil")) : null,
      h("p", { class: "eyebrow" }, "Le défi d'anglais de toute la famille"),
      h("h1", { class: "brand-xl" }, letters),
      adding
        ? null
        : h("p", { class: "onboard-lead" }, "Du premier « hello » jusqu'au niveau C2 (Cambridge Proficiency). Un test de placement te situe, puis 12 lignes, 60 stations et 12 boss te font grimper. Les parents aussi ont le droit de jouer."),
      adding
        ? null
        : h(
            "ul",
            { class: "onboard-facts" },
            h("li", null, h("strong", null, "Leçons, conjugaison, vocabulaire"), " : tout l'anglais de A à Z"),
            h("li", null, h("strong", null, "Rédactions corrigées et notées"), " sur 20, avec les explications"),
            h("li", null, h("strong", null, "Des boss imprévisibles"), " : impossible d'apprendre les réponses par cœur"),
          ),
      h("label", { class: "field-label", for: "player-name" }, "Comment tu t'appelles ?"),
      name,
      h("p", { class: "field-label" }, "Ton âge (pour adapter les sujets et l'humour)"),
      ages,
      h("p", { class: "field-label" }, "Ton avatar"),
      avatars,
      start,
      adding ? null : restore,
    ),
  );
  const begin = () => {
    const v = name.value.trim();
    if (!v) {
      shake(name);
      name.focus();
      return toast("Écris ton prénom.");
    }
    if (!age) {
      shake(ages);
      return toast("Choisis ta tranche d'âge.");
    }
    unlockAudio();
    sfx.level();
    createProfile({ name: v, avatar, age });
    go("welcome");
  };
  start.addEventListener("click", begin);
  name.addEventListener("keydown", (e) => e.key === "Enter" && begin());
  restore.addEventListener("click", async () => {
    const v = await dialog({
      title: "Restaurer une sauvegarde",
      body: "<p>Tu as un <strong>fichier</strong> de sauvegarde (.json) ou un <strong>code</strong> (il commence par MB1 ou MB2) ?</p>",
      actions: [
        { label: "Annuler", value: null },
        { label: "Un code", value: "code" },
        { label: "Un fichier", value: "file", primary: true },
      ],
    });
    if (v === "file") return restoreFromFile();
    if (v !== "code") return;
    const area = h("textarea", { class: "field code-field", rows: 4, placeholder: "Colle ton code ici", id: "restore-code" });
    const code = await dialog({ title: "Restaurer avec un code", body: h("div", null, h("p", null, "Le code crée un profil avec ta progression."), area), actions: [{ label: "Annuler", value: false }, { label: "Restaurer", value: () => area.value, primary: true }] });
    if (!code) return;
    try {
      decodeCode(code);
      const p = createProfile({ name: name.value.trim() || "Joueur", avatar, age: age || "ado" });
      importCode(code);
      toast(`Profil de ${p.name} restauré !`, "ok");
      go("map");
    } catch (e) {
      toast(e.message, "ko");
    }
  });
  setTimeout(() => name.focus(), 400);
}
