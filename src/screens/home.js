// Onboarding and the transit-line map of the 12 levels.
import { h, icon, toast, dialog, esc } from "../ui.js";
import { LEVELS, LINE_COUNT } from "../content.js";
import { state, levelUnlocked, unitUnlocked, unitState, bossState, bossReady, levelDone, nextStep, rank, streakAlive, wordsLearned, mistakeCount, bossLives, bossLocked, redoUnits, BOSS_LIVES } from "../store.js";
import { listProfiles } from "../profiles.js";
import { go } from "../router.js";
import { sfx } from "../audio.js";
import { shake } from "../fx.js";
import { avatarEl } from "./who.js";
import { backupCard } from "./backup.js";
import { dailyCount, currentLevel } from "./daily.js";
import { jokeOfTheDay, mooseSays, quip } from "../humor.js";
import { EXTRA } from "../content.js";

export const TRAIN_SVG = `<svg class="train-svg" viewBox="0 0 32 32" aria-hidden="true"><rect x="7" y="3.5" width="18" height="21.5" rx="6" fill="currentColor"/><rect x="10" y="7.5" width="12" height="7.5" rx="2.2" fill="#fff" opacity=".92"/><circle cx="11.6" cy="20" r="1.9" fill="#FFD23F"/><circle cx="20.4" cy="20" r="1.9" fill="#FFD23F"/><path d="M10.5 25.5l-3 4M21.5 25.5l3 4" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>`;

export function starsHtml(n, total = 3) {
  return Array.from({ length: total }, (_, i) => `<span class="st ${i < n ? "on" : ""}">${icon("star")}</span>`).join("");
}

export function map(view) {
  const next = nextStep();
  const streak = streakAlive();
  const mistakes = mistakeCount();

  const header = h(
    "header",
    { class: "map-head" },
    h("div", { class: "brand" }, h("span", { class: "brand-mark", html: TRAIN_SVG }), h("span", { class: "brand-name" }, "Mission Bilingue")),
    h(
      "div",
      { class: "map-head-right" },
      listProfiles().length > 1 ? h("button", { type: "button", class: "icon-btn", "aria-label": "Changer de joueur", title: "Changer de joueur", html: icon("refresh"), onClick: () => go("who") }) : null,
      h("button", { type: "button", class: "player-chip", onClick: () => go("profile") }, avatarEl(state.player.avatar), h("span", { class: "player-text" }, h("strong", null, state.player.name), h("small", null, rank()))),
    ),
  );

  const stat = (ic, value, label, opts = {}) => h(opts.onClick ? "button" : "div", { type: opts.onClick ? "button" : null, class: `stat ${opts.cls || ""}`, onClick: opts.onClick }, h("span", { class: "stat-ic", html: icon(ic) }), h("span", { class: "stat-val" }, value), h("span", { class: "stat-label" }, label));
  const stats = h(
    "div",
    { class: "stats" },
    stat("bolt", state.xp.toLocaleString("fr-CA"), "XP", { cls: "xp" }),
    stat("flame", streak, streak > 1 ? "jours de suite" : "jour de suite", { cls: streak ? "fire" : "" }),
    stat("book", wordsLearned(), "mots réussis"),
    stat("notebook", mistakes, "erreurs à revoir", { cls: mistakes ? "alert" : "", onClick: () => go("review") }),
  );

  let hero;
  if (!LEVELS.length) {
    hero = h("div", { class: "next-card" }, h("p", null, "Le contenu des niveaux n'est pas chargé."));
  } else if (next) {
    const L = next.level.id;
    const isBoss = next.type === "boss";
    hero = h(
      "button",
      { type: "button", class: "next-card", style: { "--line": `var(--l${L})`, "--line-ink": `var(--l${L}-ink)` }, onClick: () => (isBoss ? go("boss", { level: L }) : go("unit", { uid: next.unit.id })) },
      h("span", { class: "next-eyebrow" }, isBoss ? `Terminus · boss · ${bossLives(L)} vie${bossLives(L) > 1 ? "s" : ""}` : unitState(next.unit.id).redo ? `À refaire pour récupérer tes vies (${redoUnits(L).length} restante${redoUnits(L).length > 1 ? "s" : ""})` : "Prochain arrêt"),
      h("span", { class: "next-title" }, isBoss ? next.level.boss.name : next.unit.titleEn),
      h("span", { class: "next-sub" }, isBoss ? `Ligne ${L} · Bats-le pour ouvrir la ligne ${L + 1}` : `Ligne ${L} · ${next.unit.id} ${next.unit.title}`),
      h("span", { class: "next-go" }, "Continuer", h("span", { html: icon("play") })),
      h("span", { class: "next-train", html: TRAIN_SVG }),
    );
  } else {
    hero = h("div", { class: "next-card done", style: { "--line": "var(--l12)" } }, h("span", { class: "next-eyebrow" }, "Terminus"), h("span", { class: "next-title" }, "Mission accomplie"), h("span", { class: "next-sub" }, "Tu as battu les 12 boss. Continue de réviser pour garder ton niveau !"));
  }

  const tool = (ic, title, sub, route, color, badge) => h("button", { type: "button", class: "tool-card", style: { "--tc": color }, onClick: () => go(route) }, h("span", { html: icon(ic) }), h("strong", null, title), h("small", null, sub), badge ? h("span", { class: "tool-badge" }, badge) : null);
  const due = dailyCount();
  const tools = h(
    "div",
    { class: "tools-row" },
    tool("refresh", "Entraînement du jour", "Répétition espacée : mots, verbes, erreurs", "daily", "var(--l5)", due ? `${due} à revoir` : "nouveaux mots"),
    tool("spell", "Atelier d'écriture", "Rédige, l'algorithme corrige et note sur 20", "writing", "var(--l7)"),
    tool("book", "Conjugueur", "Tous les verbes, tous les temps", "conjugator", "var(--l4)"),
    EXTRA.c2uoe || EXTRA.c2papers ? tool("trophy", "Prépa C2", "Cambridge C2 Proficiency, examens blancs", "c2", "var(--l12)") : null,
    tool("sparkle", "Mes compétences", "Ton profil et tes certificats", "dashboard", "var(--l9)"),
  );
  const joke = jokeOfTheDay(currentLevel());
  const jokeCard = joke
    ? h("div", { class: "joke-card" }, h("span", { class: "eyebrow" }, "La blague du jour de Maurice"), h("p", { class: "joke-en" }, joke.en), h("details", null, h("summary", null, "Je ne comprends pas…"), h("p", null, joke.fr)))
    : null;
  const lines = h("div", { class: "lines" });
  for (let L = 1; L <= LINE_COUNT; L++) {
    const lvl = LEVELS.find((l) => l.id === L);
    lines.append(lineEl(L, lvl, next));
  }

  view.append(h("div", { class: "map" }, header, stats, backupCard(), mooseSays(quip("welcome"), "sm"), hero, tools, jokeCard, h("h2", { class: "section-title" }, "Le réseau"), h("p", { class: "section-sub" }, "Chaque ligne est un niveau. Réussis le test de chaque station pour avancer, puis bats le boss au terminus."), lines));

  // Scroll the next station into view on load.
  requestAnimationFrame(() => {
    const here = view.querySelector(".station.here");
    if (here && here.getBoundingClientRect().top > innerHeight) here.scrollIntoView({ block: "center", behavior: "smooth" });
  });
}

function lineEl(L, lvl, next) {
  const unlocked = levelUnlocked(L);
  const done = levelDone(L);
  const style = { "--line": `var(--l${L})`, "--line-ink": `var(--l${L}-ink)` };
  if (!lvl) {
    return h("section", { class: "line locked", style }, h("header", { class: "line-head" }, h("span", { class: "bullet" }, L), h("div", { class: "line-name" }, h("h3", null, `Niveau ${L}`), h("p", null, "En construction"))));
  }
  const passed = lvl.units.filter((u) => unitState(u.id).passed && !unitState(u.id).redo).length;
  const head = h(
    "header",
    { class: "line-head" },
    h("span", { class: "bullet" }, L),
    h("div", { class: "line-name" }, h("h3", null, lvl.title), h("p", null, `${lvl.titleEn} · ${lvl.cefr}`)),
    h("span", { class: "line-progress", "aria-label": `${passed} stations sur ${lvl.units.length}` }, done ? h("span", { class: "done-badge", html: icon("check") }) : `${passed}/${lvl.units.length}`),
  );
  const list = h("ol", { class: "stations" });
  lvl.units.forEach((u, i) => {
    const open = unitUnlocked(L, i + 1);
    const st = unitState(u.id);
    const here = next?.type === "unit" && next.unit.id === u.id;
    const cls = ["station", st.redo ? "redo" : st.passed ? "done" : open ? "open" : "locked", here ? "here" : ""].join(" ");
    const btn = h(
      "button",
      { type: "button", class: "station-btn", "aria-label": `${u.id} ${u.title}${open ? "" : " (verrouillée)"}` },
      h("span", { class: "dot" }, open ? null : h("span", { html: icon("lock") })),
      h("span", { class: "st-text" }, h("span", { class: "st-name" }, u.titleEn), h("span", { class: "st-fr" }, `${u.id} · ${u.title}`)),
      st.redo ? h("span", { class: "redo-tag" }, "à refaire") : st.passed ? h("span", { class: "stars", html: st.skipped && !st.stars ? '<span class="skipped">validée</span>' : starsHtml(st.stars || 0) }) : null,
    );
    btn.addEventListener("click", () => {
      if (!open) {
        sfx.wrong();
        shake(btn);
        toast(unlocked ? `Réussis d'abord le test de la station ${L}.${i}.` : `Bats le boss de la ligne ${L - 1} pour ouvrir cette ligne.`);
        return;
      }
      sfx.tap();
      go("unit", { uid: u.id });
    });
    const li = h("li", { class: cls }, btn);
    if (here) li.append(h("span", { class: "train", html: TRAIN_SVG }));
    list.append(li);
  });
  // Terminus (boss)
  const ready = bossReady(L);
  const bs = bossState(L);
  const hereBoss = next?.type === "boss" && next.level.id === L;
  const locked = bossLocked(L);
  const lives = bossLives(L);
  const redo = redoUnits(L);
  const livesHtml = Array.from({ length: BOSS_LIVES }, (_, i) => `<span class="life ${i < lives ? "on" : "lost"}">${icon("heart")}</span>`).join("");
  const bossSub = bs.defeated
    ? bs.flawless ? "Boss vaincu sans perdre un cœur" : "Boss vaincu"
    : locked
      ? `Boss bloqué : refais les stations (${lvl.units.length - redo.length}/${lvl.units.length})`
      : `Terminus · ${lives} vie${lives > 1 ? "s" : ""} pour le battre`;
  const bossBtn = h(
    "button",
    { type: "button", class: "station-btn" },
    h("span", { class: "dot terminal" }, bs.defeated ? h("span", { html: icon("trophy") }) : ready ? null : h("span", { html: icon("lock") })),
    h("span", { class: "st-text" }, h("span", { class: "st-name" }, lvl.boss.name), h("span", { class: "st-fr" }, bossSub)),
    !bs.defeated && unlocked ? h("span", { class: "boss-lives", "aria-label": `${lives} vies sur ${BOSS_LIVES}`, html: livesHtml }) : null,
  );
  bossBtn.addEventListener("click", () => {
    if (!unlocked) {
      sfx.wrong();
      shake(bossBtn);
      toast("Cette ligne est encore fermée.");
      return;
    }
    if (locked) {
      sfx.wrong();
      shake(bossBtn);
      toast(`Plus de vies ! Refais les stations « à refaire » de la ligne ${L} pour récupérer tes ${BOSS_LIVES} vies.`);
      return;
    }
    if (!ready && !bs.defeated) return skipChallenge(L, lvl);
    go("boss", { level: L });
  });
  const term = h("li", { class: `station boss ${bs.defeated ? "done" : ready ? "open" : "locked"} ${hereBoss ? "here" : ""}` }, bossBtn);
  if (hereBoss) term.append(h("span", { class: "train", html: TRAIN_SVG }));
  list.append(term);

  const section = h("section", { class: `line ${unlocked ? "" : "locked"} ${done ? "complete" : ""}`, style, id: `line-${L}` }, head, list);
  if (locked) section.append(h("p", { class: "line-lock redo-note" }, `Le boss t'a pris tes ${BOSS_LIVES} vies. Réussis à nouveau le test des stations marquées « à refaire » : tes vies reviendront.`));
  if (unlocked && !done && !ready && !locked) {
    section.append(h("button", { type: "button", class: "skip-link", onClick: () => skipChallenge(L, lvl) }, "Tu connais déjà ce niveau ? Défie le boss directement"));
  }
  if (!unlocked) section.append(h("p", { class: "line-lock" }, `Bats le boss de la ligne ${L - 1} pour ouvrir cette ligne.`));
  return section;
}

async function skipChallenge(L, lvl) {
  const ok = await dialog({
    title: "Défi direct",
    body: `<p>Tu peux sauter les ${lvl.units.length} stations de la ligne ${L} si tu bats <strong>${esc(lvl.boss.name)}</strong> sans t'entraîner.</p><p>Le boss pose des questions sur tout le niveau ${L} et révise les niveaux d'avant. Si tu gagnes, la ligne entière est validée.</p>`,
    actions: [
      { label: "Pas maintenant", value: false },
      { label: "Affronter le boss", value: true, primary: true },
    ],
  });
  if (ok) go("boss", { level: L });
}
