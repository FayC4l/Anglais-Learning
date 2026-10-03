// Welcome after profile creation, and the adaptive placement test.
import { h, icon, shuffle, sleep, countUp } from "../ui.js";
import { placementItems, levelById, LEVELS, grammarRefs } from "../content.js";
import { state, applyPlacement, checkBadges, recordAnswer, save } from "../store.js";
import { go } from "../router.js";
import { renderQuestion, makeQuestion, feedbackDetails, kindsForRef } from "../questions.js";
import { createPlacement, BANDS, BAND_LINE } from "../placement.js";
import { sfx, ttsReady } from "../audio.js";
import { confetti, burstAt, shake } from "../fx.js";
import { quip, mentorSays } from "../humor.js";

export const BAND_INFO = {
  A1: { name: "Découverte", desc: "Tu comprends des mots et des phrases très simples." },
  A2: { name: "Survie", desc: "Tu te débrouilles dans les situations du quotidien." },
  B1: { name: "Seuil", desc: "Tu racontes, tu expliques, tu voyages sans paniquer." },
  B2: { name: "Avancé", desc: "Tu argumentes et tu comprends l'essentiel de textes complexes." },
  C1: { name: "Autonome", desc: "Tu t'exprimes avec aisance et précision, même sur des sujets pointus." },
  C2: { name: "Maîtrise", desc: "Tu joues avec la langue comme un natif cultivé. Objectif : C2 Proficiency !" },
};

/** First screen of a new profile: Chikh Fayçal says hello and proposes the placement test. */
export function welcomeScreen(view) {
  const opt = (title, sub, onClick, primary = false) => h("button", { type: "button", class: `welcome-opt ${primary ? "primary" : ""}`, onClick }, h("strong", null, title), h("small", null, sub));
  view.append(
    h(
      "div",
      { class: "welcome" },
      h("p", { class: "eyebrow" }, `Bienvenue, ${state.player.name} !`),
      h("h1", { class: "page-title" }, "D'où pars-tu ?"),
      mentorSays(`Salut ${state.player.name} ! Moi c'est Chikh Fayçal, ton prof d'anglais. Avant de grimper, je dois savoir où tu en es. Promis, je ne regarde pas tes réponses… enfin, un peu.`),
      h(
        "div",
        { class: "welcome-opts" },
        opt("Je débute de zéro", "On commence au tout premier « hello ». Ligne 1.", () => go("map")),
        opt("Je connais quelques bases", "Test de placement adaptatif, 10 à 15 minutes.", () => go("placement", { start: "A2" }), true),
        opt("Je me débrouille déjà bien", "Test de placement qui commence plus haut.", () => go("placement", { start: "B1" })),
      ),
      h("p", { class: "set-help" }, "Tu pourras repasser le test plus tard depuis ton profil."),
    ),
  );
}

/** Builds the question bank of a band: placement items, or unit grammar of matching levels as a fallback. */
function bankFor(band) {
  const items = placementItems().filter((q) => q.band === band).map((q) => `place:${q.id}`);
  if (items.length >= 8) return shuffle(items);
  const levels = { A1: [1, 2], A2: [3, 4], B1: [5, 6], B2: [7, 8, 9], C1: [10, 11], C2: [12] }[band];
  return shuffle([...items, ...levels.flatMap((L) => (levelById(L)?.units || []).flatMap((u) => [...grammarRefs(u, "mcq"), ...grammarRefs(u, "fill")]))]);
}

export function placementScreen(view, { start = "A2" } = {}) {
  const pl = createPlacement({ start });
  const banks = Object.fromEntries(BANDS.map((b) => [b, bankFor(b)]));
  const mount = h("div", { class: "q-mount" });
  const counter = h("span", { class: "quiz-count" });
  const bar = h("div", { class: "place-bar" }, h("span", { class: "place-fill" }));
  const fb = h("div", { class: "feedback", hidden: true, role: "status" });
  let current = null;
  let n = 0;
  let stopped = false;
  view.append(
    h(
      "div",
      { class: "quiz placement" },
      h("div", { class: "quiz-top" }, h("button", { type: "button", class: "icon-btn", "aria-label": "Quitter le test", html: icon("close"), onClick: () => ((stopped = true), current?.destroy(), go("welcome")) }), h("div", { class: "quiz-top-mid" }, h("div", { class: "quiz-meta" }, h("span", { class: "quiz-title" }, "Test de placement"), counter), bar)),
      h("p", { class: "place-note" }, "Pas de chrono, pas de stress. Les questions s'adaptent à toi : si c'est dur, c'est que tu montes !"),
      mount,
      fb,
    ),
  );

  const next = () => {
    if (stopped) return;
    if (pl.done) return finish();
    const band = pl.band();
    const ref = banks[band].shift() || bankFor(band)[0];
    let kind = kindsForRef(ref)[0];
    if (kind === "listening" && !ttsReady()) kind = "reading";
    const question = kind ? makeQuestion(kind, ref) : null;
    if (!question) return next();
    n++;
    counter.textContent = `Question ${n}`;
    bar.firstChild.style.width = `${Math.min(100, (n / 26) * 100)}%`;
    mount.classList.remove("enter");
    void mount.offsetWidth;
    mount.classList.add("enter");
    current = renderQuestion(question, mount, {
      replays: 3,
      onAnswer: async ({ ok, given }) => {
        pl.record(ok);
        recordAnswer(null, ok, 0, question.skill);
        if (ok) {
          sfx.correct();
          burstAt(mount.querySelector(".right, .btn-validate, .q-card"), { color: ["#12805C", "#3DD49B"], count: 10 });
        } else {
          sfx.wrong();
          shake(mount.querySelector(".q-card"));
        }
        fb.className = `feedback ${ok ? "is-ok" : "is-ko"}`;
        const cont = h("button", { type: "button", class: `btn ${ok ? "btn-go" : "btn-stop"} btn-continue` }, "Continuer");
        fb.replaceChildren(h("div", { class: "fb-inner" }, h("div", { class: "fb-head" }, h("strong", { class: "fb-title" }, ok ? "Correct !" : "Pas tout à fait")), ok ? null : feedbackDetails(question, given), cont));
        fb.hidden = false;
        const go2 = () => {
          document.removeEventListener("keydown", onKey);
          fb.hidden = true;
          current?.destroy();
          next();
        };
        const onKey = (e) => e.key === "Enter" && (e.preventDefault(), go2());
        cont.addEventListener("click", go2);
        setTimeout(() => document.addEventListener("keydown", onKey), 250);
        setTimeout(() => cont.focus({ preventScroll: true }), 80);
      },
    });
  };

  async function finish() {
    save();
    const r = pl.result();
    const info = BAND_INFO[r.band];
    const lvl = levelById(r.line);
    const lower = LEVELS.filter((l) => l.id < r.line);
    const choose = h("select", { class: "field", id: "start-line", "aria-label": "Ligne de départ" }, h("option", { value: r.line }, `Ligne ${r.line} : ${lvl?.title || ""} (recommandé)`), lower.reverse().map((l) => h("option", { value: l.id }, `Ligne ${l.id} : ${l.title} (${l.cefr})`)));
    const pct = h("span", null, "0");
    view.replaceChildren(
      h(
        "div",
        { class: "results place-result" },
        h("p", { class: "eyebrow" }, "Résultat du test de placement"),
        h("div", { class: "band-badge", "data-band": r.band }, r.band),
        h("h1", { class: "results-title" }, `Niveau ${r.band} · ${info.name}`),
        h("p", { class: "results-line" }, info.desc),
        h("p", { class: "results-line" }, h("strong", null, pct), ` % de bonnes réponses sur ${r.asked} questions.`),
        h("div", { class: "band-scale" }, BANDS.map((b) => h("span", { class: `${b === r.band ? "on" : ""} ${BANDS.indexOf(b) < BANDS.indexOf(r.band) ? "past" : ""}` }, b))),
        mentorSays(r.band === "A1" ? "Tout le monde commence quelque part. Moi, à ton âge, je croyais que « teacher » se prononçait « tichère ». On va bien s'amuser." : r.band === "C2" ? "C2 ?! Ma moustache en tremble. Tu vas pouvoir t'attaquer directement à la prépa Cambridge." : `Niveau ${r.band}, pas mal du tout ! Je t'ai réservé une place sur la ligne ${r.line}.`),
        h("label", { class: "field-label", for: "start-line" }, "Par où veux-tu commencer ?"),
        choose,
        h("p", { class: "set-help" }, "Les lignes avant ton point de départ sont validées, mais restent ouvertes si tu veux réviser."),
        h("div", { class: "result-actions" }, h("button", { type: "button", class: "btn btn-primary btn-xl", onClick: () => {
          applyPlacement({ ...r, line: Number(choose.value) });
          checkBadges();
          go("map");
        } }, "C'est parti !")),
      ),
    );
    countUp(pct, r.asked ? Math.round((r.correct / r.asked) * 100) : 0, 900);
    await sleep(300);
    sfx.win();
    confetti({ count: 90 });
  }

  next();
  return () => {
    stopped = true;
    current?.destroy();
  };
}

export { BAND_LINE, quip };
