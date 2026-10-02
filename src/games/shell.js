// Common frame for mini-games: header (score, lives, timer), stage, end screen.
import { h, icon, countUp, sleep } from "../ui.js";
import { unitById } from "../content.js";
import { recordGame, markStep, checkBadges } from "../store.js";
import { go } from "../router.js";
import { sfx, stopSpeaking } from "../audio.js";
import { confetti, floatText } from "../fx.js";
import { GAMES } from "./index.js";

export function gameScreen(view, { uid, game }) {
  const unit = unitById(uid);
  const def = GAMES.find((g) => g.id === game);
  const L = Number(uid.split(".")[0]);
  if (!unit || !def) return go("map");

  let score = 0;
  let ended = false;
  let cleanupGame = null;
  const scoreEl = h("span", { class: "g-score-num" }, "0");
  const livesEl = h("span", { class: "g-lives" });
  const timeEl = h("span", { class: "g-time" });
  const stage = h("div", { class: `g-stage g-${def.id}` });
  const back = h("button", { type: "button", class: "icon-btn", "aria-label": "Quitter le jeu", html: icon("close") });
  const wrap = h(
    "div",
    { class: "game", style: { "--line": `var(--l${L})`, "--line-ink": `var(--l${L}-ink)`, "--g": def.color } },
    h("div", { class: "g-top" }, back, h("div", { class: "g-title" }, h("span", { class: "g-name" }, def.name), h("span", { class: "g-unit" }, `Station ${uid} · ${unit.titleEn}`)), h("div", { class: "g-hud" }, timeEl, livesEl, h("span", { class: "g-score" }, h("span", { html: icon("star") }), scoreEl))),
    stage,
  );
  view.append(wrap);
  back.addEventListener("click", () => {
    ended = true;
    cleanupGame?.();
    go("unit", { uid, tab: "practice" });
  });

  const api = {
    stage,
    unit,
    get score() {
      return score;
    },
    addScore(n, at) {
      score = Math.max(0, score + Math.round(n));
      scoreEl.textContent = score;
      scoreEl.parentElement.classList.remove("bump");
      void scoreEl.offsetWidth;
      scoreEl.parentElement.classList.add("bump");
      if (at && n > 0) floatText(`+${Math.round(n)}`, at, { color: "var(--amber)", size: 1.2 });
    },
    setLives(n, max) {
      livesEl.innerHTML = Array.from({ length: max }, (_, i) => `<span class="life ${i < n ? "on" : "lost"}">${icon("heart")}</span>`).join("");
    },
    setTime(s) {
      timeEl.textContent = s == null ? "" : `${Math.max(0, Math.ceil(s))} s`;
      timeEl.classList.toggle("low", s != null && s <= 5);
    },
    end: (summary = {}) => finish(summary),
    get ended() {
      return ended;
    },
  };

  async function finish(summary) {
    if (ended) return;
    ended = true;
    cleanupGame?.();
    stopSpeaking();
    const res = recordGame(`${uid}:${def.id}`, score);
    markStep(uid, "practice");
    const badges = checkBadges();
    const xp = h("span", null, "0");
    const scoreBig = h("span", { class: "g-end-score" }, "0");
    const panel = h(
      "div",
      { class: "g-end" },
      h("p", { class: "eyebrow" }, def.name),
      h("h2", { class: "g-end-title" }, summary.title || (res.newBest ? "Nouveau record !" : "Partie terminée")),
      scoreBig,
      h("p", { class: "g-end-line" }, summary.line || "", res.best ? ` Record : ${res.best}.` : ""),
      h("div", { class: "xp-gain" }, h("span", { html: icon("bolt") }), "+", xp, " XP"),
      summary.review?.length
        ? h("div", { class: "g-review" }, h("div", { class: "pron-kicker" }, "À revoir"), h("ul", null, summary.review.map((r) => h("li", null, h("strong", null, r.en), " — ", r.fr))))
        : null,
      badges.length ? h("div", { class: "new-badges" }, badges.map((b) => h("div", { class: "badge-pop" }, h("span", { html: icon("trophy") }), h("strong", null, b.name), h("small", null, b.desc)))) : null,
      h(
        "div",
        { class: "result-actions" },
        h("button", { type: "button", class: "btn btn-primary btn-xl", onClick: () => go("game", { uid, game: def.id }) }, "Rejouer"),
        h("button", { type: "button", class: "btn btn-ghost", onClick: () => go("unit", { uid, tab: "practice" }) }, "Autres activités"),
        h("button", { type: "button", class: "btn btn-ghost", onClick: () => go("unit", { uid, tab: "test" }) }, "Aller au test"),
      ),
    );
    stage.replaceChildren(panel);
    stage.classList.add("ended");
    countUp(scoreBig, score, 900);
    countUp(xp, res.xp, 700);
    await sleep(500);
    if (res.newBest && score > 0) {
      sfx.win();
      confetti({ count: 90 });
    } else sfx.level();
  }

  // Short "3, 2, 1" before the game starts.
  const intro = h("div", { class: "g-intro" }, h("span", { class: "g-intro-ic", html: icon(def.icon) }), h("h2", null, def.name), h("p", null, def.rules), h("button", { type: "button", class: "btn btn-primary btn-xl" }, "Jouer"));
  stage.replaceChildren(intro);
  intro.querySelector("button").addEventListener("click", async () => {
    sfx.tap();
    const count = h("div", { class: "g-count" });
    stage.replaceChildren(count);
    for (const n of ["3", "2", "1"]) {
      if (ended) return;
      count.textContent = n;
      count.classList.remove("go");
      void count.offsetWidth;
      count.classList.add("go");
      sfx.tick();
      await sleep(520);
    }
    if (ended) return;
    stage.replaceChildren();
    cleanupGame = def.start(api) || null;
  });
  intro.querySelector("button").focus();

  return () => {
    ended = true;
    cleanupGame?.();
  };
}
