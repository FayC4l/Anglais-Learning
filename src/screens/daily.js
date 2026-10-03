// Daily training: spaced-repetition cards (words, conjugations, past mistakes) + a few new words.
import { h, icon, shuffle, countUp, sleep } from "../ui.js";
import { LEVELS, lexRefs, vocabRefs, resolveRef } from "../content.js";
import { state, save, addXp, touchStreak, checkBadges, unitState, nextStep, highestLevelDone } from "../store.js";
import { go } from "../router.js";
import { runQuiz, scoreOf } from "../runner.js";
import { reviewQuestion } from "../questions.js";
import { regen } from "../engine/generators.js";
import { addCards, answerCard, dueCards, boxCounts, dayNumber } from "../srs.js";
import { sfx } from "../audio.js";
import { confetti } from "../fx.js";
import { reviewList } from "./test.js";
import { quip, mentorSays } from "../humor.js";

const SESSION = 15;
const NEW_PER_DAY = 5;

/** Level the player is working on. */
export function currentLevel() {
  const n = nextStep();
  return n ? n.level.id : Math.min(12, highestLevelDone() + 1);
}

const valid = (ref) => (String(ref).startsWith("gen:") ? !!regen(ref) : !!resolveRef(ref));

/** Puts mistakes and studied words into the deck, then picks today's cards. */
export function buildSession(today = dayNumber()) {
  addCards(state.srs, Object.keys(state.mistakes).filter(valid), today);
  for (const lvl of LEVELS) for (const u of lvl.units) if (unitState(u.id).passed && !unitState(u.id).placed) addCards(state.srs, vocabRefs(u), today);
  const due = dueCards(state.srs, today).filter(valid);
  const picked = due.slice(0, SESSION);
  // New words of the current level's word bank (and the previous one), a few per day.
  if (picked.length < SESSION) {
    const L = currentLevel();
    const fresh = [...lexRefs(L), ...lexRefs(L - 1)].filter((r) => !state.srs[r]);
    const add = shuffle(fresh).slice(0, Math.min(NEW_PER_DAY, SESSION - picked.length));
    addCards(state.srs, add, today);
    picked.push(...add);
  }
  save();
  return { refs: shuffle(picked), dueCount: due.length };
}

export function dailyScreen(view) {
  const today = dayNumber();
  const { refs, dueCount } = buildSession(today);
  const boxes = boxCounts(state.srs);
  if (!refs.length) {
    view.append(
      h(
        "div",
        { class: "results" },
        h("div", { class: "topbar" }, h("button", { type: "button", class: "icon-btn", "aria-label": "Retour", html: icon("back"), onClick: () => go("map") }), h("span", { class: "topbar-title" }, "Entraînement du jour")),
        h("h1", { class: "results-title" }, "Rien à réviser aujourd'hui"),
        mentorSays("Ton cerveau est à jour. Va finir une station : les nouveaux mots arriveront ici demain."),
        h("button", { type: "button", class: "btn btn-primary btn-xl", onClick: () => go("map") }, "Retour au réseau"),
      ),
    );
    return undefined;
  }
  const questions = refs.map((r) => reviewQuestion(r)).filter(Boolean);
  const quiz = runQuiz(view, questions, {
    title: `Entraînement du jour · ${dueCount} à revoir`,
    accent: "var(--l5)",
    onAnswered: ({ ok }, q) => {
      answerCard(state.srs, q.ref, ok, today);
      state.stats.srs = (state.stats.srs || 0) + 1;
      return {};
    },
    onDone: async (results, { quit }) => {
      save();
      if (quit) return go("map");
      const good = results.filter((r) => r.ok).length;
      const xpGain = good * 3 + (good === results.length ? 20 : 0);
      addXp(xpGain);
      touchStreak();
      save();
      const badges = checkBadges();
      const xp = h("span", null, "0");
      const after = boxCounts(state.srs);
      const total = after.reduce((a, b) => a + b, 0) || 1;
      view.replaceChildren(
        h(
          "div",
          { class: "results" },
          h("p", { class: "eyebrow" }, "Entraînement du jour"),
          h("h1", { class: "results-title" }, scoreOf(results) >= 0.8 ? "Mémoire en béton !" : "Séance terminée"),
          h("p", { class: "results-line" }, `${good} bonnes réponses sur ${results.length}. Les cartes réussies reviendront plus tard, les autres demain.`),
          mentorSays(quip(scoreOf(results) >= 0.8 ? "perfect" : "comeback")),
          h(
            "div",
            { class: "boxes", "aria-label": "Tes cartes par boîte" },
            [1, 2, 3, 4, 5].map((b) => h("div", { class: "box-col" }, h("span", { class: "box-bar", style: { "--h": `${Math.round((after[b] / total) * 100)}%` } }), h("strong", null, after[b]), h("small", null, ["", "demain", "2 j", "4 j", "8 j", "16 j"][b]))),
          ),
          h("p", { class: "set-help" }, "Boîte 1 : à revoir demain. Boîte 5 : connu pour longtemps. Une erreur renvoie la carte en boîte 1."),
          h("div", { class: "xp-gain" }, h("span", { html: icon("bolt") }), "+", xp, " XP"),
          badges.length ? h("div", { class: "new-badges" }, badges.map((b) => h("div", { class: "badge-pop" }, h("span", { html: icon("trophy") }), h("strong", null, b.name), h("small", null, b.desc)))) : null,
          h("div", { class: "result-actions" }, h("button", { type: "button", class: "btn btn-primary btn-xl", onClick: () => go("map") }, "Retour au réseau")),
          reviewList(results),
        ),
      );
      countUp(xp, xpGain, 600);
      if (scoreOf(results) >= 0.8) {
        sfx.win();
        await sleep(100);
        confetti({ count: 70 });
      }
    },
  });
  void boxes;
  return () => quiz.stop();
}

/** Number of cards waiting today (for the map). */
export function dailyCount() {
  const today = dayNumber();
  return dueCards(state.srs, today).length;
}
