// The unit test flow and its results screen (also reused by the mistakes notebook).
import { h, icon, countUp, sleep } from "../ui.js";
import { unitById, levelById } from "../content.js";
import { recordTest, diff, checkBadges, unitUnlocked, redoUnits, bossReady, BOSS_LIVES } from "../store.js";
import { go } from "../router.js";
import { runQuiz, scoreOf } from "../runner.js";
import { unitTest, KIND_LABEL, blankHtml } from "../questions.js";
import { gapWords } from "../fill.js";
import { quip, mooseSays } from "../humor.js";
import { sfx } from "../audio.js";
import { confetti, stamp } from "../fx.js";
import { starsHtml } from "./home.js";

export function testScreen(view, { uid }) {
  const unit = unitById(uid);
  const L = Number(uid.split(".")[0]);
  if (!unit) return go("map");
  const questions = unitTest(uid);
  const quiz = runQuiz(view, questions, {
    title: `Test ${uid}`,
    accent: `var(--l${L})`,
    onDone: (results, { quit }) => {
      if (quit) return go("unit", { uid, tab: "test" });
      showResults(view, { results, unit, L });
    },
  });
  return () => quiz.stop();
}

async function showResults(view, { results, unit, L }) {
  const score = scoreOf(results);
  const res = recordTest(unit.id, score);
  const badges = checkBadges();
  const good = results.filter((r) => r.ok).length;
  const pct = Math.round(score * 100);
  const need = Math.round(diff().pass * 100);
  const U = Number(unit.id.split(".")[1]);
  const lvl = levelById(L);
  const nextUnit = lvl.units[U];

  const ring = h("div", { class: `score-ring ${res.passed ? "pass" : "fail"}`, style: { "--p": 0 } }, h("span", { class: "score-num" }, "0"), h("span", { class: "score-unit" }, "%"));
  const stars = h("div", { class: "result-stars", html: starsHtml(0) });
  const xp = h("span", { class: "xp-num" }, "0");
  const actions = h("div", { class: "result-actions" });
  const stillRedo = redoUnits(L);
  if (res.livesRestored) actions.append(h("button", { type: "button", class: "btn btn-primary btn-xl", onClick: () => go("boss", { level: L }) }, `Vies récupérées : affronter ${lvl.boss.name}`));
  else if (res.redoCleared && stillRedo.length) actions.append(h("button", { type: "button", class: "btn btn-primary btn-xl", onClick: () => go("unit", { uid: stillRedo[0].id, tab: "test" }) }, `Station à refaire suivante : ${stillRedo[0].id}`));
  else if (res.passed && stillRedo.length) actions.append(h("button", { type: "button", class: "btn btn-primary btn-xl", onClick: () => go("unit", { uid: stillRedo[0].id, tab: "test" }) }, `Station à refaire : ${stillRedo[0].id}`));
  else if (res.passed && nextUnit && unitUnlocked(L, U + 1)) actions.append(h("button", { type: "button", class: "btn btn-primary btn-xl", onClick: () => go("unit", { uid: nextUnit.id }) }, `Station suivante : ${nextUnit.titleEn}`));
  else if (res.passed && !nextUnit && bossReady(L)) actions.append(h("button", { type: "button", class: "btn btn-primary btn-xl", onClick: () => go("boss", { level: L }) }, `Affronter ${lvl.boss.name}`));
  const wrongRefs = results.filter((r) => !r.ok).map((r) => r.q.ref);
  if (!res.passed && wrongRefs.length) actions.append(h("button", { type: "button", class: "btn btn-primary btn-xl", onClick: () => go("review", { refs: wrongRefs, title: `Mes erreurs du test ${unit.id}` }) }, "Réviser ces erreurs maintenant"));
  actions.append(h("button", { type: "button", class: `btn ${res.passed ? "btn-ghost" : "btn-ghost"}`, onClick: () => go("test", { uid: unit.id }) }, "Refaire le test"));
  actions.append(h("button", { type: "button", class: "btn btn-ghost", onClick: () => go("unit", { uid: unit.id, tab: res.passed ? "practice" : "lesson" }) }, res.passed ? "Retour à la station" : "Revoir la leçon"));
  actions.append(h("button", { type: "button", class: "btn btn-ghost", onClick: () => go("map") }, "Réseau"));

  view.replaceChildren(
    h(
      "div",
      { class: "results", style: { "--line": `var(--l${L})`, "--line-ink": `var(--l${L}-ink)` } },
      h("p", { class: "eyebrow" }, `Test ${unit.id} · ${unit.titleEn}`),
      h("h1", { class: "results-title" }, res.passed ? (res.stars === 3 ? "Sans faute !" : "Test réussi !") : "Pas encore…"),
      ring,
      h("p", { class: "results-line" }, `${good} bonnes réponses sur ${results.length}. `, res.passed ? (res.firstPass ? "Nouvelle station débloquée." : "") : `Il faut ${need} %. C'est normal de ne pas réussir du premier coup : ce test est fait pour être exigeant. Révise tes erreurs, rejoue un peu, puis retente.`),
      stars,
      res.livesRestored
        ? h("p", { class: "lives-back" }, `Toutes les stations sont refaites : tes ${BOSS_LIVES} vies sont de retour ! ${lvl.boss.name} t'attend.`)
        : res.redoCleared
          ? h("p", { class: "lives-back" }, `Station revalidée ! Encore ${res.redoLeft} station${res.redoLeft > 1 ? "s" : ""} à refaire pour récupérer tes ${BOSS_LIVES} vies.`)
          : null,
      mooseSays(quip(res.passed ? (res.stars === 3 ? "perfect" : "correct") : "fail")),
      h("div", { class: "xp-gain" }, h("span", { html: icon("bolt") }), "+", xp, " XP"),
      badges.length ? h("div", { class: "new-badges" }, badges.map((b) => h("div", { class: "badge-pop" }, h("span", { html: icon("trophy") }), h("strong", null, b.name), h("small", null, b.desc)))) : null,
      actions,
      reviewList(results),
    ),
  );

  // Choreography: ring fills, stars pop one by one, XP counts.
  await sleep(150);
  ring.style.setProperty("--p", pct);
  countUp(ring.querySelector(".score-num"), pct, 1100);
  await sleep(1150);
  if (res.passed) {
    sfx.win();
    confetti();
    for (let i = 1; i <= res.stars; i++) {
      stars.innerHTML = starsHtml(i);
      stars.children[i - 1]?.classList.add("pop");
      sfx.pop();
      await sleep(320);
    }
    if (res.livesRestored) stamp(`${BOSS_LIVES} vies récupérées`, { sub: lvl.boss.name, color: `var(--l${L})`, ms: 1600 });
    else if (res.firstPass) stamp(nextUnit ? "Station ouverte" : "Terminus ouvert", { sub: nextUnit ? nextUnit.titleEn : lvl.boss.name, color: `var(--l${L})`, ms: 1300 });
  } else sfx.lose();
  countUp(xp, res.xp, 700);
}

/** Collapsible list of the questions with answers and explanations. */
export function reviewList(results) {
  const wrong = results.filter((r) => !r.ok);
  const items = results.map((r) =>
    h(
      "li",
      { class: `rv ${r.ok ? "ok" : "ko"}` },
      h("span", { class: "rv-ic", html: icon(r.ok ? "check" : "close") }),
      h(
        "div",
        { class: "rv-main" },
        h("div", { class: "rv-kind" }, KIND_LABEL[r.q.kind] || ""),
        h("div", { class: "rv-q", html: promptHtml(r.q) }),
        h("div", { class: "rv-a" }, h("span", { class: "fb-label" }, "Réponse"), h("span", null, r.q.expected)),
        !r.ok ? h("div", { class: "rv-given" }, h("span", { class: "fb-label" }, "Toi"), h("span", null, r.timedOut ? "temps écoulé" : r.given || "—")) : null,
        r.q.explain ? h("p", { class: "rv-explain" }, r.q.explain) : null,
      ),
    ),
  );
  return h("details", { class: "review-list", open: wrong.length > 0 && wrong.length <= 6 }, h("summary", null, wrong.length ? `Revoir tes ${wrong.length} erreur${wrong.length > 1 ? "s" : ""} et toutes les réponses` : "Revoir toutes les réponses"), h("ol", null, items));
}

function promptHtml(q) {
  const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]);
  switch (q.kind) {
    case "type_en":
      return `Écris en anglais : <strong>${esc(q.fr)}</strong>`;
    case "listen_type":
    case "listen_choose":
      return `Écoute : <strong>${esc(q.say)}</strong> (${esc(q.fr)})`;
    case "choose_fr":
      return `Que veut dire <strong>${esc(q.en)}</strong> ?`;
    case "build":
      return `Traduis : <strong>${esc(q.fr)}</strong>`;
    case "dictation":
      return `Dictée (${esc(q.fr)})`;
    case "mcq":
      return blankHtml(q.q) + (q.hint ? ` <em>(${esc(q.hint)})</em>` : "");
    case "fill":
      return (q.lead ? `${esc(q.lead)}<br>` : "") + blankHtml(q.q, gapWords(q.expected).length) + (q.hint ? ` <em>(${esc(q.hint)})</em>` : "") + (q.key ? ` <strong>${esc(q.key)}</strong>` : "");
    case "error":
      return esc(q.tokens.join(" "));
    case "reading":
    case "listening":
      return `${esc(q.title)} — ${esc(q.q)}`;
    default:
      return "";
  }
}
