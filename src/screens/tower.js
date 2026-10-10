// The Tower of Chikh Faycal (level 12): 50 floors, a boss on each, 200 hearts, dramatic losses, the C2 at the top.
// The player only ever sees 5 floors and the final boss: every floor won past the 5th makes a new one appear.
import { h, icon, sleep, reducedMotion, dialog } from "../ui.js";
import { EXTRA, unitById } from "../content.js";
import { state, tower, recordTowerFloor, startTowerFloor, towerRevealed, towerPrompt, levelUnlocked, checkBadges } from "../store.js";
import { FLOORS, TOWER_LIVES, TOWER_LEVEL, VISIBLE, floorSpec, visibleTop, surprise, heartBar, BLOCKS } from "../tower.js";
import { go } from "../router.js";
import { runQuiz, scoreOf } from "../runner.js";
import { towerExam } from "../questions.js";
import { sfx } from "../audio.js";
import { confetti, flash, shake, burst } from "../fx.js";
import { mentorSays, mentorFaceHtml, quip } from "../humor.js";
import { createMonster } from "./boss.js";
import { printCertificate } from "./dashboard.js";
import { alertCount, guardLeaving } from "../anticheat.js";

export const REWARD = "un jeu PlayStation de ton choix + 25 $";

/** The hearts as icons (10 icons of 20 hearts each with 200 hearts). */
export function heartsHtml(n, max = TOWER_LIVES) {
  const b = heartBar(n, max);
  return Array.from({ length: b.total }, (_, i) => `<span class="life ${i < b.on ? "on" : "lost"}">${icon("heart")}</span>`).join("");
}
const floorTitle = (s) => (s.kind === "final" ? "Boss final : le C2" : s.kind === "writing" ? (s.c2 ? "Écriture C2" : "Boss d'écriture") : s.title);

/** The Tower: the final boss on top, then the visible floors from the highest to the first. */
export function towerScreen(view) {
  if (!levelUnlocked(TOWER_LEVEL)) return go("map");
  const t = tower();
  if (t.won) return victory(view);
  if (t.pending && t.pending === t.floor) {
    fled(t.pending);
    return undefined;
  }
  const top = visibleTop(t);
  const isNew = surprise(t);
  const list = h("ol", { class: "tower-floors" }, floorItem(view, t, FLOORS));
  for (let n = top; n >= 1; n--) list.append(floorItem(view, t, n, isNew && n === t.floor));
  const s = floorSpec(t.floor);
  const grown = top > VISIBLE || t.resets > 0;
  view.append(
    h(
      "div",
      { class: "tower" },
      h("div", { class: "topbar" }, h("button", { type: "button", class: "icon-btn", "aria-label": "Retour au réseau", html: icon("back"), onClick: () => go("map") }), h("span", { class: "topbar-title" }, "Ligne 12 · La Tour")),
      h("p", { class: "eyebrow" }, "Niveau 12 · C2"),
      h("h1", { class: "tower-name" }, "La Tour de Chikh Faycal"),
      h("div", { class: "tower-lives", "aria-label": `${t.lives} cœurs sur ${TOWER_LIVES}` }, h("span", { html: heartsHtml(t.lives) }), h("strong", null, `${t.lives} / ${TOWER_LIVES} cœurs`)),
      h(
        "div",
        { class: "tower-rules" },
        h("p", null, h("strong", null, `${top} étages, un boss à chaque étage${grown ? " (pour l'instant)" : ". C'est tout, promis"}. `), "Conjugaison et grammaire de plus en plus dures, un boss d'expression écrite tous les 5 étages, puis le boss final : l'examen blanc du C2 Proficiency."),
        h("p", null, h("strong", null, `${TOWER_LIVES} cœurs pour toute la montée. `), "Chaque boss perdu, abandonné ou fui (appli quittée ou page fermée en plein combat) coûte un cœur. Plus de cœurs : la tour s'effondre et tu recommences à l'étage 1."),
        h("p", { class: "tower-reward" }, "🎮 ", h("strong", null, "Au sommet : "), `le C2… et ${REWARD}.`),
        t.resets ? h("p", { class: "tower-resets" }, `La tour s'est déjà effondrée ${t.resets} fois. Elle se souvient de toi.`) : null,
      ),
      mentorSays(welcomeLine(t), "", t.lives <= Math.ceil(TOWER_LIVES / 10) ? "warning" : "welcome"),
      h("button", { type: "button", class: "btn btn-primary btn-xl tower-go", onClick: () => startFloor(view, t.floor) }, s.kind === "final" ? "Affronter le boss final" : `Affronter l'étage ${t.floor} : ${floorTitle(s)}`),
      h("div", { class: "tower-shaft" }, list),
    ),
  );
  requestAnimationFrame(() => view.querySelector(".tower-floor.now")?.scrollIntoView({ block: "center" }));
  if (isNew) reveal(view, t);
  return undefined;
}

function welcomeLine(t) {
  if (t.floor >= FLOORS) return "Cette fois, c'est vraiment le boss final. Plus d'étage caché. Je le jure sur mon thé.";
  if (t.floor === 1 && !t.resets) return `Bienvenue dans ma tour. Cinq petits étages, ${TOWER_LIVES} cœurs, et le C2 au sommet. Facile, non ? … Non.`;
  return quip("welcome");
}

function floorItem(view, t, n, fresh = false) {
  const s = floorSpec(n);
  const st = n < t.floor ? "done" : n === t.floor ? "now" : "locked";
  const li = h(
    "li",
    { class: `tower-floor ${st} kind-${s.kind}${fresh ? " is-new" : ""}`, "data-n": s.kind === "final" ? "boss" : n },
    h("span", { class: "tf-n" }, s.kind === "final" ? "★" : n),
    h("span", { class: "tf-title" }, floorTitle(s), s.kind === "writing" ? h("small", null, ` · ${s.pass}/20 minimum`) : s.kind === "conj" ? h("small", null, ` · ${s.count} questions`) : h("small", null, " · 200 points Cambridge")),
    h("span", { class: "tf-state", html: st === "done" ? icon("check") : st === "now" ? icon("play") : icon("lock") }),
  );
  if (st === "now") li.addEventListener("click", () => startFloor(view, n));
  return li;
}

// ---------- The surprise floor ----------

const SURPRISE_LINES = [
  "Ah oui… l'étage {n}. J'avais oublié de t'en parler. Petit oubli. Tout petit.",
  "Le boss final ? Il est juste après. Promis. (Je croise les doigts derrière mon dos.)",
  "Surprise ! L'architecte a ajouté un étage pendant la nuit. Il est très motivé, l'architecte.",
  "Tu croyais vraiment que c'était fini ? C'est mignon.",
  "Le boss a déménagé d'un étage. Il trouvait la vue plus jolie.",
  "Bonne nouvelle : tu as vaincu l'étage {p}. Mauvaise nouvelle : voici l'étage {n}.",
  "J'ai relu les plans de la tour. Il manquait un étage. Voilà, c'est réparé.",
  "Ne me regarde pas comme ça. Les tours, ça pousse. Tout le monde sait ça.",
  "Le C2, c'est comme l'horizon : plus tu avances, plus il recule. Hé hé.",
  "Encore un ? Oui, encore un. Ta tête en ce moment vaut tous les étages du monde.",
  "C'est le dernier. Sûr. Certain. Enfin… probablement.",
  "Un étage de plus, c'est un temps de plus à conjuguer. Remercie-moi plus tard.",
];
const SURPRISE_BUTTONS = ["Sérieux ?!", "Mais… pourquoi ?", "J'aurais dû m'en douter", "OK. Je monte.", "Tu n'as pas honte ?", "Encore ?!"];

/** A new floor pushes the final boss up, Chikh Faycal laughs. */
async function reveal(view, t) {
  const n = t.floor;
  const calm = reducedMotion();
  const line = n === VISIBLE + 1 && !t.resets ? "Bravo, cinq étages ! Et maintenant… le boss final ! … … Ah non, pardon. L'étage 6. J'ai dit cinq ? J'ai dû mal compter." : SURPRISE_LINES[(n * 7 + (t.resets || 0)) % SURPRISE_LINES.length].replace("{n}", n).replace("{p}", n - 1);
  const btn = h("button", { type: "button", class: "btn btn-xl reveal-btn", hidden: true }, SURPRISE_BUTTONS[n % SURPRISE_BUTTONS.length]);
  const overlay = h(
    "div",
    { class: "reveal", role: "alertdialog", "aria-label": `Un nouvel étage apparaît : l'étage ${n}` },
    h(
      "div",
      { class: "reveal-stage" },
      h(
        "div",
        { class: "reveal-tower", "aria-hidden": "true" },
        h("div", { class: "rt-boss" }, h("span", { html: icon("trophy") }), "Boss final"),
        h("div", { class: "rt-new" }, `Étage ${n}`),
        h("div", { class: "rt-floor" }, `Étage ${n - 1}`, h("span", { html: icon("check") })),
        n > 2 ? h("div", { class: "rt-floor dim" }, `Étage ${n - 2}`, h("span", { html: icon("check") })) : null,
      ),
      h("div", { class: "reveal-stamp" }, "SURPRISE !"),
      h("p", { class: "reveal-title" }, `Un étage ${n} vient d'apparaître.`),
      mentorSays(line, "", "troll"),
      btn,
    ),
  );
  document.body.append(overlay);
  sfx.surprise();
  if (!calm) setTimeout(() => shake(overlay.querySelector(".reveal-tower"), true), 900);
  await sleep(calm ? 300 : 1900);
  btn.hidden = false;
  btn.focus();
  await new Promise((res) => btn.addEventListener("click", res, { once: true }));
  towerRevealed();
  overlay.classList.add("out");
  await sleep(250);
  overlay.remove();
  view.querySelector(".tower-floor.is-new")?.classList.add("settled");
}

// ---------- Floors ----------

function startFloor(view, n) {
  const t = tower();
  if (n !== t.floor) return;
  if (surprise(t)) return go("tower"); // the new floor is introduced first
  const s = floorSpec(n);
  if (s.kind === "writing") return writingFloor(n, s);
  if (s.kind === "final") return finalFloor(view);
  return floorIntro(view, n, s);
}

function floorIntro(view, n, s) {
  const canvas = h("canvas", { class: "boss-canvas big", "aria-hidden": "true" });
  const start = h("button", { type: "button", class: "btn btn-primary btn-xl" }, "Combattre");
  view.replaceChildren(
    h(
      "div",
      { class: "boss-intro tower-intro", style: { "--line": "var(--l12)" } },
      h("div", { class: "topbar" }, h("button", { type: "button", class: "icon-btn", "aria-label": "Retour à la tour", html: icon("back"), onClick: () => go("tower") }), h("span", { class: "topbar-title" }, `La Tour · étage ${n}`)),
      h("p", { class: "eyebrow" }, `${s.title} · étage ${s.step} sur 4 du bloc`),
      h("h1", { class: "boss-name-xl" }, `Le gardien de l'étage ${n}`),
      h("div", { class: "tower-lives" }, h("span", { html: heartsHtml(tower().lives) })),
      canvas,
      h(
        "ul",
        { class: "test-rules boss-rules" },
        h("li", null, h("span", { html: icon("book") }), `${s.count} questions : ${s.tenses.length ? "conjugaison" : "grammaire"} et révisions.`),
        h("li", null, h("span", { html: icon("heart") }), `${s.hearts} erreurs et tu perds le combat (et un cœur de la tour).`),
        h("li", null, h("span", { html: icon("clock") }), s.extraTime ? `Chrono serré, mais ${s.extraTime} secondes de bonus par question. Quitter l'appli ou fermer la page en plein combat = combat perdu.` : "Le chrono est plus court que dans le reste du jeu. Quitter l'appli ou fermer la page en plein combat = combat perdu."),
      ),
      reviseLinks(s),
      start,
    ),
  );
  const monster = createMonster(canvas, (n % 11) + 1);
  start.addEventListener("click", () => {
    monster.stop();
    fight(view, n, s);
  });
  start.focus();
  return () => monster.stop();
}

/** Before a fight: the lessons of the floor's block, to revise (they open in a normal station page). */
function reviseLinks(s) {
  const units = (s.units || []).map((uid) => unitById(uid)).filter(Boolean);
  if (!units.length) return null;
  return h(
    "div",
    { class: "tower-revise" },
    h("p", { class: "set-help" }, "Réviser les leçons de ce bloc avant le combat :"),
    h("div", { class: "row" }, units.map((u) => h("button", { type: "button", class: "btn btn-small btn-ghost", onClick: () => go("unit", { uid: u.id }) }, `${u.id} · ${u.title}`))),
  );
}
function fight(view, n, s) {
  const questions = towerExam(n);
  startTowerFloor(n);
  let hearts = s.hearts;
  const canvas = h("canvas", { class: "boss-canvas" });
  const hpFill = h("div", { class: "hp-fill" });
  const heartsEl = h("div", { class: "hearts" });
  const renderHearts = () => (heartsEl.innerHTML = Array.from({ length: s.hearts }, (_, i) => `<span class="heart ${i < hearts ? "on" : "lost"}">${icon("heart")}</span>`).join(""));
  renderHearts();
  const arena = h("div", { class: "arena", style: { "--line": `var(--l${(n % 11) + 1})` } }, h("div", { class: "arena-head" }, h("span", { class: "arena-name" }, `Étage ${n}`), h("div", { class: "hp" }, hpFill)), canvas, heartsEl);
  let monster = null;
  let hp = questions.length;
  let over = false;
  // Leaving the app during the fight (to look the answer up) loses it, once Chikh Faycal has finished laughing.
  const unguard = guardLeaving(async (laughed) => {
    if (over) return;
    over = true;
    unguard();
    quiz.stop();
    monster?.stop();
    const r = recordTowerFloor(n, false);
    checkBadges();
    await laughed;
    await drama(r, "Tu as quitté l'appli en plein combat : dans la tour, c'est un combat perdu.");
    go("tower");
  });
  const quiz = runQuiz(view, questions, {
    title: `Tour · étage ${n}`,
    accent: "var(--l12)",
    aside: arena,
    quitBody: "<p><strong>Dans la tour, abandonner = perdre le combat.</strong> Tu perdras un cœur.</p>",
    onAnswered: async ({ ok }) => {
      if (ok) {
        hp = Math.max(0, hp - 1);
        hpFill.style.transform = `scaleX(${hp / questions.length})`;
        monster?.hurt();
        sfx.hit();
      } else {
        monster?.attack();
        await sleep(250);
        hearts--;
        renderHearts();
        sfx.hurt();
        flash("hurt");
        if (hearts <= 0) {
          monster?.laugh();
          return { stop: true };
        }
      }
      return {};
    },
    onDone: async (results, { quit }) => {
      if (over) return;
      over = true;
      unguard();
      monster?.stop();
      const win = !quit && hearts > 0 && results.length === questions.length;
      const r = recordTowerFloor(n, win);
      checkBadges();
      if (win) return floorWon(view, n, scoreOf(results));
      await drama(r);
      go("tower");
    },
  });
  monster = createMonster(canvas, (n % 11) + 1);
  return () => {
    quiz.stop();
    monster?.stop();
  };
}

/** The page was closed (or left) during a boss: it counts as a defeat. */
async function fled(n) {
  const r = recordTowerFloor(n, false);
  checkBadges();
  await drama(r, n >= FLOORS ? "Tu as quitté l'examen final avant la fin. Dans la tour, fuir = perdre." : `Tu as quitté le combat de l'étage ${n} avant la fin. Dans la tour, fuir = perdre.`);
  go("tower");
}

async function floorWon(view, n, score) {
  const t = tower();
  const next = floorSpec(n + 1);
  // Past the 5th floor the player believes the final boss comes next… until the tower grows.
  const fake = surprise(t);
  const label = fake || next.kind === "final" ? "Affronter le boss final" : `Monter à l'étage ${n + 1}`;
  view.replaceChildren(
    h(
      "div",
      { class: "results tower-won" },
      h("p", { class: "eyebrow" }, `La Tour · étage ${n}`),
      h("h1", { class: "results-title" }, "Étage vaincu !"),
      h("p", { class: "results-line" }, `${Math.round(score * 100)} % de bonnes réponses. Prochaine étape : ${fake ? "le boss final !" : floorTitle(next)}.`),
      mentorSays(fake ? "Plus que le boss final ! … Enfin, je crois. Monte, on verra bien." : quip("correct")),
      h("div", { class: "result-actions" }, h("button", { type: "button", class: "btn btn-primary btn-xl", onClick: () => startFloor(view, n + 1) }, label), h("button", { type: "button", class: "btn btn-ghost", onClick: () => go("tower") }, "Voir la tour")),
    ),
  );
  sfx.win();
  confetti({ count: 80 });
}

/** Writing floors: a prompt of the right level, corrected by the workshop; the mark decides. */
function writingFloor(n, s) {
  const prompts = s.c2 ? EXTRA.c2papers?.writing || [] : (EXTRA.writing?.prompts || []).filter((p) => p.level === s.level && (!p.ages || p.ages.includes(state.player.age) || p.ages.includes("adulte")));
  if (!prompts.length) return go("tower");
  let id = towerPrompt(n, () => prompts[Math.floor(Math.random() * prompts.length)].id);
  // A subject removed from the content since it was drawn: draw again.
  const exists = (s.c2 ? EXTRA.c2papers?.writing || [] : (EXTRA.writing?.prompts || []).filter((p) => p.level === s.level)).some((p) => p.id === id);
  if (!exists) {
    delete tower().prompts[n];
    id = towerPrompt(n, () => prompts[Math.floor(Math.random() * prompts.length)].id);
  }
  go("writing", { promptId: id, tower: n });
}

/** The top: the full C2 Proficiency mock exam; 200 on the Cambridge scale wins the Tower. */
async function finalFloor(view) {
  const ok = await dialog({
    title: "Le boss final",
    body: "<p>L'examen blanc <strong>complet</strong> du C2 Proficiency : Reading & Use of English puis Listening (environ 2 h). Ta dernière copie d'écriture C2 compte aussi.</p><p>Il faut <strong>200</strong> sur l'échelle Cambridge pour vaincre la tour. Sinon, tu perds un cœur.</p><p><strong>Une fois commencé, abandonner, quitter l'appli ou fermer la page = un cœur perdu.</strong> Prévois deux heures au calme.</p>",
    actions: [{ label: "Plus tard", value: false }, { label: "Je suis prêt(e)", value: true, primary: true }],
  });
  if (!ok) return;
  startTowerFloor(FLOORS);
  const { towerFinal } = await import("./c2.js");
  let over = false;
  const unguard = guardLeaving(async (laughed) => {
    if (over) return;
    over = true;
    unguard();
    const r = recordTowerFloor(FLOORS, false);
    checkBadges();
    await laughed;
    await drama(r, "Tu as quitté l'appli pendant l'examen final : c'est un examen perdu.");
    go("tower");
  });
  towerFinal(
    view,
    async (scale) => {
      if (over) return;
      over = true;
      unguard();
      const r = recordTowerFloor(FLOORS, scale >= 200);
      checkBadges();
      if (r.event === "victory") return victory(view, scale);
      await drama(r, `Score : ${scale}. Il fallait 200.`);
      go("tower");
    },
    async () => {
      if (over) return;
      over = true;
      unguard();
      const r = recordTowerFloor(FLOORS, false);
      checkBadges();
      await drama(r, "Abandonner l'examen final, c'est le perdre.");
      go("tower");
    },
  );
}

/** The end of the game. */
function victory(view, scale) {
  const t = tower();
  view.replaceChildren(
    h(
      "div",
      { class: "results tower-victory" },
      h("p", { class: "eyebrow" }, "La Tour de Chikh Faycal"),
      h("div", { class: "victory-trophy", html: icon("trophy") }),
      h("h1", { class: "results-title" }, "C2 ATTEINT !"),
      scale ? h("p", { class: "results-line" }, `${scale} sur l'échelle Cambridge.`) : null,
      h("div", { class: "victory-reward" }, h("span", { class: "victory-pad" }, "🎮 💵"), h("p", null, h("strong", null, "Ta récompense : "), `${REWARD}.`), h("p", { class: "set-help" }, `Montre cet écran à Faycal. Gagné le ${new Date(t.wonAt || Date.now()).toLocaleDateString("fr-CA")}${t.resets ? `, après ${t.resets} effondrement${t.resets > 1 ? "s" : ""} de la tour` : ", sans jamais faire tomber la tour"}. Alertes de triche : ${alertCount()}.`)),
      mentorSays(`Cinquante étages. Oui, ${FLOORS} : je t'ai menti dès le cinquième, et tu as tout grimpé quand même. Le C2. Je n'ai plus rien à t'apprendre… Enfin si, mais je vais faire semblant. Je suis fier de toi.`, "", "love"),
      h("div", { class: "result-actions" }, h("button", { type: "button", class: "btn btn-primary btn-xl", onClick: () => printCertificate("C2") }, "Imprimer mon certificat C2"), h("button", { type: "button", class: "btn btn-ghost", onClick: () => go("map") }, "Retour au réseau")),
    ),
  );
  sfx.level();
  confetti({ count: 260 });
  setTimeout(() => confetti({ count: 200 }), 900);
}

const DRAMA_LINES = [
  "Le prof ferme les yeux. Il en a vu tomber, des élèves…",
  "Quelque part, un verbe irrégulier ricane dans le noir.",
  "Le gardien de l'étage range ta copie dans un tiroir. Le tiroir des regrets.",
  "Un participe passé s'est échappé. Personne ne l'a revu.",
  "La tour tremble. Elle a senti ta faiblesse.",
  "Chikh Faycal pose son thé. Mauvais signe.",
  "Dans les couloirs, on murmure ton nom… et ta faute d'accord.",
];

/** The dramatic film when a heart is lost — or the whole Tower collapses. */
export async function drama(r, extra = "") {
  const collapse = r.event === "collapse";
  const calm = reducedMotion();
  const line = DRAMA_LINES[Math.floor(Math.random() * DRAMA_LINES.length)];
  const btn = h("button", { type: "button", class: "btn btn-xl drama-btn", hidden: true }, collapse ? "Tout recommencer" : "Me relever");
  const rubble = collapse ? h("div", { class: "drama-rubble", "aria-hidden": "true" }, Array.from({ length: 18 }, (_, i) => h("span", { style: { "--x": `${(i * 37) % 100}%`, "--d": `${(i % 6) * 0.18}s`, "--r": `${((i * 53) % 90) - 45}deg` } }))) : null;
  const overlay = h(
    "div",
    { class: `drama ${collapse ? "collapse" : "life"}`, role: "alertdialog", "aria-label": collapse ? "La tour s'effondre" : "Un cœur perdu" },
    h("div", { class: "drama-bar top" }),
    rubble,
    h(
      "div",
      { class: "drama-stage" },
      collapse ? h("h2", { class: "drama-title glitch", "data-text": "LA TOUR S'EFFONDRE" }, "LA TOUR S'EFFONDRE") : h("div", { class: "drama-heart", html: `<span class="half left">${icon("heart")}</span><span class="half right">${icon("heart")}</span>` }),
      h("div", { class: "drama-face", html: mentorFaceHtml(collapse ? "crying" : "worried") }),
      h("p", { class: "drama-line" }, collapse ? `Plus aucun cœur. Retour à l'étage 1. Tes ${TOWER_LIVES} cœurs te sont rendus.` : `−1 cœur. Il t'en reste ${r.lives} sur ${TOWER_LIVES}.`),
      extra ? h("p", { class: "drama-sub" }, extra) : null,
      h("p", { class: "drama-sub" }, collapse ? `Effondrement n°${tower().resets}. ${line}` : line),
      btn,
    ),
    h("div", { class: "drama-bar bottom" }),
  );
  document.body.append(overlay);
  collapse ? sfx.collapse() : sfx.drama();
  if (!calm) shake(overlay, true);
  if (collapse && !calm) for (let i = 0; i < 4; i++) setTimeout(() => burst(innerWidth / 2, innerHeight / 2, { color: ["#3a2a1a", "#7a6a5a", "#c8283a"], count: 30, speed: 12 }), 400 + i * 500);
  await sleep(calm ? 300 : collapse ? 3200 : 2200);
  btn.hidden = false;
  btn.focus();
  await new Promise((res) => btn.addEventListener("click", res, { once: true }));
  overlay.classList.add("out");
  await sleep(300);
  overlay.remove();
}

export { BLOCKS };
