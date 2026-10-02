// Mistakes notebook and spaced review of stations already passed.
import { h, icon, shuffle, countUp, sleep } from "../ui.js";
import { LEVELS, resolveRef, vocabRefs, sentenceRefs, grammarRefs } from "../content.js";
import { state, save, mistakeCount, unitState, addXp, touchStreak, checkBadges } from "../store.js";
import { go } from "../router.js";
import { runQuiz, scoreOf } from "../runner.js";
import { reviewQuestion } from "../questions.js";
import { sfx } from "../audio.js";
import { confetti } from "../fx.js";
import { reviewList } from "./test.js";

export function reviewScreen(view, params = {}) {
  if (params.refs?.length) return runReview(view, params.refs, params.title || "Révision ciblée");
  const refs = Object.entries(state.mistakes)
    .sort((a, b) => b[1].n - a[1].n || String(a[1].at).localeCompare(String(b[1].at)))
    .map(([ref]) => ref)
    .filter((r) => resolveRef(r));
  const passedUnits = LEVELS.flatMap((l) => l.units).filter((u) => unitState(u.id).passed);

  const byUnit = new Map();
  for (const r of refs) {
    const res = resolveRef(r);
    const key = res.unit.id;
    if (!byUnit.has(key)) byUnit.set(key, { unit: res.unit, items: [] });
    byUnit.get(key).items.push(res);
  }

  const label = (res) => {
    if (res.type === "vocab") return `${res.item.en} = ${res.item.fr}`;
    if (res.type === "sentence") return res.item.en;
    if (res.type === "grammar") return res.item.q;
    if (res.type === "reading") return `${res.reading.title} : ${res.item.q}`;
    return "";
  };

  view.append(
    h(
      "div",
      { class: "review" },
      h("div", { class: "topbar" }, h("button", { type: "button", class: "icon-btn", "aria-label": "Retour au réseau", html: icon("back"), onClick: () => go("map") }), h("span", { class: "topbar-title" }, "Révision")),
      h("h1", { class: "page-title" }, "Ton carnet d'erreurs"),
      h("p", { class: "page-lead" }, "Chaque erreur faite dans un test, un jeu ou contre un boss arrive ici. Pour qu'elle disparaisse, il faut la réussir deux fois. C'est la méthode la plus efficace pour retenir : se tester sur ce qu'on rate."),
      h(
        "div",
        { class: "review-actions" },
        h("button", { type: "button", class: "btn btn-primary btn-xl", disabled: !refs.length, onClick: () => go("review", { refs: refs.slice(0, 15), title: "Mes erreurs" }) }, refs.length ? `Réviser mes erreurs (${Math.min(15, refs.length)})` : "Aucune erreur à revoir"),
        h("button", { type: "button", class: "btn btn-ghost", disabled: !passedUnits.length, onClick: () => go("review", { refs: mixedRefs(passedUnits), title: "Révision mélangée" }) }, "Révision mélangée des stations réussies"),
      ),
      !passedUnits.length && !refs.length ? h("p", { class: "empty" }, "Rien à réviser pour l'instant. Réussis ta première station et reviens ici chaque jour quelques minutes.") : null,
      ...[...byUnit.values()].map(({ unit, items }) =>
        h(
          "section",
          { class: "nb-unit", style: { "--line": `var(--l${unit.id.split(".")[0]})` } },
          h("h2", null, h("span", { class: "bullet sm" }, unit.id.split(".")[0]), `${unit.id} · ${unit.titleEn}`),
          h("ul", null, items.map((res) => h("li", null, h("span", { class: "nb-n", title: "Réussites nécessaires" }, `×${state.mistakes[res.ref].n}`), h("span", null, label(res))))),
        ),
      ),
    ),
  );
  return undefined;
}

/** A mixed review drawn from passed stations, older stations first. */
function mixedRefs(units) {
  const picked = [];
  const ordered = units.slice().reverse();
  const weight = (i) => 1 + i / ordered.length; // older stations a bit more often
  const pool = ordered.flatMap((u, i) => {
    const refs = [...shuffle(vocabRefs(u)).slice(0, 3), ...shuffle(sentenceRefs(u)).slice(0, 2), ...shuffle(grammarRefs(u)).slice(0, 3)];
    return refs.map((r) => ({ r, w: Math.random() * weight(i) }));
  });
  pool.sort((a, b) => b.w - a.w);
  for (const p of pool) {
    if (picked.length >= 12) break;
    picked.push(p.r);
  }
  return shuffle(picked);
}

function runReview(view, refs, title) {
  const questions = refs.map((r) => reviewQuestion(r)).filter(Boolean);
  if (!questions.length) return go("review");
  const quiz = runQuiz(view, questions, {
    title,
    onDone: async (results, { quit }) => {
      if (quit) return go("review");
      const score = scoreOf(results);
      const good = results.filter((r) => r.ok).length;
      const xpGain = good * 4;
      addXp(xpGain);
      touchStreak();
      save();
      const badges = checkBadges();
      const xp = h("span", null, "0");
      view.replaceChildren(
        h(
          "div",
          { class: "results" },
          h("p", { class: "eyebrow" }, title),
          h("h1", { class: "results-title" }, score >= 0.8 ? "Belle révision !" : "Révision terminée"),
          h("p", { class: "results-line" }, `${good} bonnes réponses sur ${results.length}. Il reste ${mistakeCount()} erreur${mistakeCount() > 1 ? "s" : ""} dans ton carnet.`),
          h("div", { class: "xp-gain" }, h("span", { html: icon("bolt") }), "+", xp, " XP"),
          badges.length ? h("div", { class: "new-badges" }, badges.map((b) => h("div", { class: "badge-pop" }, h("span", { html: icon("trophy") }), h("strong", null, b.name), h("small", null, b.desc)))) : null,
          h("div", { class: "result-actions" }, h("button", { type: "button", class: "btn btn-primary btn-xl", onClick: () => go("review") }, "Retour au carnet"), h("button", { type: "button", class: "btn btn-ghost", onClick: () => go("map") }, "Réseau")),
          reviewList(results),
        ),
      );
      countUp(xp, xpGain, 600);
      if (score >= 0.8) {
        sfx.win();
        await sleep(100);
        confetti({ count: 80 });
      }
    },
  });
  return () => quiz.stop();
}
