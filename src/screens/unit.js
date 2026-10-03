// A station, as a guided path: 1 Leçon → 2 Son → 3 Mots → 4 Pratique → 5 Test.
import { h, icon, rich, shuffle, toast, dialog } from "../ui.js";
import { unitById, levelById, vocabRefs } from "../content.js";
import { addCards } from "../srs.js";
import { quickCheck } from "./writing.js";
import { state, save, unitState, diff, unitUnlocked, STEPS, stepDone, markStep, missingPrep, pathOf, PRACTICE_GOAL, addXp, touchStreak } from "../store.js";
import { go } from "../router.js";
import { speak, speakParts, mixedParts, stopSpeaking, ttsReady, coachReady, sfx } from "../audio.js";
import { micAvailable, listenOnce, heardRight } from "../mic.js";
import { GAMES } from "../games/index.js";
import { starsHtml } from "./home.js";
import { burstAt, confetti, floatText } from "../fx.js";

const STEP_ICON = { lesson: "book", pron: "mic", words: "cards", practice: "game", test: "trophy" };

export function unitScreen(view, { uid, tab }) {
  const unit = unitById(uid);
  const L = Number(uid.split(".")[0]);
  const U = Number(uid.split(".")[1]);
  const lvl = levelById(L);
  if (!unit || !unitUnlocked(L, U)) {
    go("map");
    return;
  }
  // Open on the first unfinished step, so the kid always knows what to do next.
  const firstOpen = STEPS.find((s) => !stepDone(uid, s.id))?.id || "practice";
  let current = tab || firstOpen;
  state.lessons[uid] = 1;
  save();

  const style = { "--line": `var(--l${L})`, "--line-ink": `var(--l${L}-ink)` };
  const body = h("div", { class: "unit-body" });
  const steps = h("nav", { class: "steps", "aria-label": "Étapes de la station" });
  const renderSteps = () => {
    steps.replaceChildren(
      ...STEPS.map((s, i) =>
        h(
          "button",
          { type: "button", class: `step ${stepDone(uid, s.id) ? "done" : ""} ${s.id === current ? "now" : ""}`, "data-step": s.id, "aria-current": s.id === current ? "step" : null },
          h("span", { class: "step-dot" }, stepDone(uid, s.id) ? h("span", { html: icon("check") }) : String(i + 1)),
          h("span", { class: "step-label" }, s.short),
        ),
      ),
    );
  };
  const st = unitState(uid);
  view.append(
    h(
      "div",
      { class: "unit", style },
      h(
        "div",
        { class: "topbar" },
        h("button", { type: "button", class: "icon-btn", "aria-label": "Retour au réseau", html: icon("back"), onClick: () => go("map") }),
        h("span", { class: "bullet sm" }, L),
        h("span", { class: "topbar-title" }, `Ligne ${L} · ${lvl.title}`),
      ),
      h(
        "header",
        { class: "unit-hero" },
        h("span", { class: "unit-id" }, `Station ${uid}`),
        h("h1", { class: "unit-name" }, unit.titleEn),
        h("p", { class: "unit-fr" }, unit.title),
        h("p", { class: "unit-goal" }, unit.goal),
        st.redo ? h("p", { class: "redo-banner" }, h("strong", null, "À refaire. "), "Le boss t'a pris tes vies : réussis à nouveau le test de cette station (étape 5) pour les récupérer.") : null,
        st.passed ? h("div", { class: "unit-stars", html: starsHtml(st.stars || 0) }) : null,
      ),
      steps,
      body,
    ),
  );

  let cleanup = null;
  const show = (id, { scroll = false } = {}) => {
    cleanup?.();
    cleanup = null;
    stopSpeaking();
    current = id;
    renderSteps();
    body.replaceChildren();
    body.className = `unit-body body-${id}`;
    const next = (from) => {
      markStep(uid, from);
      // Studied words join the spaced-repetition deck.
      if (from === "words") {
        addCards(state.srs, vocabRefs(unit));
        save();
      }
      const i = STEPS.findIndex((s) => s.id === from);
      show(STEPS[i + 1].id, { scroll: true });
    };
    if (id === "lesson") cleanup = lessonStep(body, unit, () => next("lesson"));
    if (id === "pron") cleanup = pronStep(body, unit, () => next("pron"));
    if (id === "words") cleanup = wordsStep(body, unit, () => next("words"));
    if (id === "practice") cleanup = practiceStep(body, unit, renderSteps);
    if (id === "test") testStep(body, unit);
    if (scroll) steps.scrollIntoView({ block: "start", behavior: "smooth" });
  };
  steps.addEventListener("click", (e) => {
    const b = e.target.closest(".step");
    if (b) {
      sfx.tap();
      show(b.dataset.step);
    }
  });
  view.addEventListener("click", (e) => {
    const chip = e.target.closest(".say-chip");
    if (chip) speak(chip.dataset.say);
  });
  show(current);
  return () => cleanup?.();
}

const stepHead = (n, title, sub) => h("div", { class: "step-head" }, h("span", { class: "step-num" }, `Étape ${n} sur 5`), h("h2", { class: "step-title" }, title), sub ? h("p", { class: "step-sub" }, sub) : null);

// ---------- 1. Lesson ----------

function lessonStep(body, unit, onDone) {
  let stopDialog = null;
  const blocks = [];
  const narrate = h("button", { type: "button", class: "btn btn-small coach-btn" }, h("span", { html: icon("speaker") }), "Écouter la leçon avec le coach");
  if (!ttsReady()) narrate.hidden = true;
  body.append(stepHead(1, "La leçon", "Lis tranquillement. Touche les mots en anglais pour les entendre."), narrate);
  for (const b of unit.lesson) {
    let el = null;
    let parts = [];
    switch (b.type) {
      case "p":
        el = h("p", { class: "l-p", html: rich(b.text) });
        parts = mixedParts(b.text);
        break;
      case "rule":
        el = h("div", { class: "l-rule" }, h("div", { class: "l-rule-title" }, b.title), h("p", { html: rich(b.text) }));
        parts = [...mixedParts(b.title + "."), ...mixedParts(b.text)];
        break;
      case "tip":
        el = h("div", { class: "l-tip" }, h("div", { class: "l-tip-title" }, "Piège de francophone"), h("p", { html: rich(b.text) }));
        parts = [{ text: "Attention, piège !", lang: "fr" }, ...mixedParts(b.text)];
        break;
      case "fun":
        el = h("div", { class: "l-fun" }, h("p", { html: rich(b.text) }));
        parts = mixedParts(b.text);
        break;
      case "table":
        el = h(
          "div",
          { class: "l-table-wrap" },
          h("table", { class: "l-table" }, h("thead", null, h("tr", null, b.head.map((c) => h("th", { html: rich(c) })))), h("tbody", null, b.rows.map((r) => h("tr", null, r.map((c) => h("td", { html: rich(c) })))))),
        );
        break;
      case "examples":
        el = h(
          "ul",
          { class: "l-examples" },
          b.items.map((it) => h("li", null, h("button", { type: "button", class: "ex-play", "aria-label": `Écouter : ${it.en}`, html: icon("speaker"), onClick: () => speak(it.en) }), h("div", null, h("div", { class: "ex-en" }, it.en), h("div", { class: "ex-fr" }, it.fr)))),
        );
        parts = b.items.flatMap((it) => [
          { text: it.en, lang: "en", pause: 250 },
          { text: it.fr, lang: "fr", pause: 350 },
        ]);
        break;
      case "dialogue": {
        const d = dialogueEl(b);
        stopDialog = d.stop;
        el = d.el;
        break;
      }
    }
    if (el) {
      body.append(el);
      blocks.push({ el, parts });
    }
  }
  let playing = false;
  narrate.addEventListener("click", async () => {
    if (playing) {
      stopSpeaking();
      return;
    }
    playing = true;
    narrate.classList.add("on");
    narrate.lastChild.textContent = "Arrêter le coach";
    const all = [];
    const owner = [];
    blocks.forEach((b, i) =>
      b.parts.forEach((p) => {
        all.push(p);
        owner.push(i);
      }),
    );
    let lastBlock = -1;
    await speakParts(all, {
      onPart: (k) => {
        const bi = owner[k];
        if (bi === lastBlock) return;
        lastBlock = bi;
        blocks.forEach((b, i) => b.el.classList.toggle("reading", i === bi));
        blocks[bi]?.el.scrollIntoView({ block: "center", behavior: "smooth" });
      },
    });
    blocks.forEach((b) => b.el.classList.remove("reading"));
    playing = false;
    narrate.classList.remove("on");
    narrate.lastChild.textContent = "Écouter la leçon avec le coach";
  });
  body.append(h("div", { class: "step-end" }, h("p", null, "Tu as tout lu ? Passe au son de la station."), h("button", { type: "button", class: "btn btn-primary btn-xl", onClick: onDone }, "J'ai compris, étape suivante")));
  return () => {
    stopDialog?.();
    stopSpeaking();
  };
}

function dialogueEl(b) {
  const names = [...new Set(b.lines.map((l) => l.who))];
  let playing = 0;
  const lines = b.lines.map((ln) => {
    const side = names.indexOf(ln.who) % 2 ? "right" : "left";
    return h("li", { class: `bubble ${side}` }, h("span", { class: "who" }, ln.who), h("button", { type: "button", class: "bubble-en", onClick: () => speak(ln.en) }, ln.en, h("span", { html: icon("speaker", "say-ic") })), h("span", { class: "bubble-fr" }, ln.fr));
  });
  const list = h("ol", { class: "dialogue" }, lines);
  const wrap = h("div", { class: "l-dialogue" });
  const playAll = h("button", { type: "button", class: "btn btn-small" }, h("span", { html: icon("play") }), "Écouter");
  const parrot = h("button", { type: "button", class: "btn btn-small btn-ghost" }, h("span", { html: icon("mic") }), "Mode perroquet");
  const frId = `fr-${Math.random().toString(36).slice(2, 8)}`;
  const showFr = h("label", { class: "toggle", for: frId }, h("input", { type: "checkbox", checked: true, id: frId }), h("span", null, "Traduction"));
  showFr.querySelector("input").addEventListener("change", (e) => list.classList.toggle("hide-fr", !e.target.checked));
  const stop = () => {
    playing++;
    stopSpeaking();
    lines.forEach((l) => l.classList.remove("active", "your-turn"));
    wrap.classList.remove("running");
  };
  const run = async (withPause) => {
    stop();
    const me = playing;
    wrap.classList.add("running");
    for (const [i, ln] of b.lines.entries()) {
      if (me !== playing) return;
      lines.forEach((l) => l.classList.remove("active", "your-turn"));
      lines[i].classList.add("active");
      lines[i].scrollIntoView({ block: "nearest", behavior: "smooth" });
      const t0 = performance.now();
      await speak(ln.en);
      if (me !== playing) return;
      if (withPause) {
        // The kid repeats the line aloud during a pause a bit longer than the line itself.
        lines[i].classList.add("your-turn");
        const pause = Math.max(1600, (performance.now() - t0) * 1.3);
        lines[i].style.setProperty("--pause", `${pause}ms`);
        await new Promise((r) => setTimeout(r, pause));
      } else await new Promise((r) => setTimeout(r, 250));
    }
    stop();
  };
  playAll.addEventListener("click", () => run(false));
  parrot.addEventListener("click", () => run(true));
  wrap.append(
    h("div", { class: "l-dialogue-head" }, h("div", null, h("div", { class: "l-dialogue-kicker" }, "Dialogue"), h("div", { class: "l-dialogue-title" }, b.title || "Conversation")), h("div", { class: "l-dialogue-actions" }, playAll, parrot, showFr)),
    list,
    h("p", { class: "l-dialogue-help" }, "Mode perroquet : après chaque réplique, répète-la à voix haute pendant la pause. C'est comme ça qu'on apprend à parler."),
  );
  return { el: wrap, stop };
}

// ---------- 2. Pronunciation ----------

function pronStep(body, unit, onDone) {
  const p = unit.pron;
  if (!p) {
    body.append(stepHead(2, "Prononciation", "L'atelier de cette station arrive bientôt."), h("div", { class: "step-end" }, h("button", { type: "button", class: "btn btn-primary", onClick: onDone }, "Étape suivante")));
    return null;
  }
  let alive = true;
  const rows = p.words.map((w) => {
    const micBtn = h("button", { type: "button", class: "icon-btn mic-btn", "aria-label": `Dis ${w.en} au micro`, html: icon("mic"), hidden: true });
    const result = h("span", { class: "mic-result", "aria-live": "polite" });
    const row = h(
      "li",
      { class: "pron-word" },
      h("div", { class: "pron-main" }, h("span", { class: "pron-en" }, w.en), h("span", { class: "pron-fr" }, w.fr), h("span", { class: "pron-hint", html: rich(w.hint) }), result),
      h(
        "div",
        { class: "pron-btns" },
        h("button", { type: "button", class: "icon-btn", "aria-label": `Écouter ${w.en}`, html: icon("speaker"), onClick: () => speak(w.en) }),
        h("button", { type: "button", class: "icon-btn", "aria-label": `Écouter ${w.en} lentement`, html: icon("turtle"), onClick: () => speak(w.en, { rate: 0.55 }) }),
        micBtn,
      ),
    );
    micBtn.addEventListener("click", async () => {
      micBtn.classList.add("listening");
      result.textContent = "Je t'écoute…";
      result.className = "mic-result";
      try {
        const alts = await listenOnce();
        const ok = heardRight(alts, w.en);
        result.textContent = ok ? "Bien prononcé !" : `J'ai entendu « ${alts[0] || "?"} ». Réécoute et réessaie.`;
        result.className = `mic-result ${ok ? "ok" : "ko"}`;
        if (ok) {
          sfx.correct();
          burstAt(micBtn, { color: ["#12805C", "#FFC23D"], count: 10 });
        } else sfx.wrong();
      } catch (e) {
        result.textContent = e.message;
        if (/disponible/.test(e.message)) body.querySelectorAll(".mic-btn").forEach((b) => (b.hidden = true));
      }
      micBtn.classList.remove("listening");
    });
    return { row, micBtn, w };
  });
  micAvailable().then((ok) => alive && ok && rows.forEach((r) => (r.micBtn.hidden = false)));

  const coach = h("button", { type: "button", class: "btn btn-primary coach-btn" }, h("span", { html: icon("speaker") }), "Écouter le coach");
  if (!ttsReady()) coach.hidden = true;
  let coaching = false;
  coach.addEventListener("click", async () => {
    if (coaching) {
      stopSpeaking();
      return;
    }
    coaching = true;
    coach.lastChild.textContent = "Arrêter";
    const parts = [...mixedParts(p.explain), { text: coachReady() ? "Écoute, puis répète chaque mot." : "", lang: "fr", pause: 300 }];
    const owner = parts.map(() => -1);
    p.words.forEach((w, i) => {
      parts.push({ text: w.en, lang: "en", pause: 500 }, { text: w.en, lang: "en", rate: 0.55, pause: 1500 });
      owner.push(i, i);
    });
    await speakParts(parts, {
      onPart: (k) => rows.forEach((r, i) => r.row.classList.toggle("active", i === owner[k])),
    });
    rows.forEach((r) => r.row.classList.remove("active"));
    coaching = false;
    coach.lastChild.textContent = "Écouter le coach";
  });

  body.append(
    stepHead(2, "Atelier prononciation", "Le coach t'explique le son, puis tu répètes chaque mot à voix haute. Même seul dans ta chambre : parle fort !"),
    h("div", { class: "pron-card" }, h("div", { class: "pron-focus" }, h("span", { class: "pron-kicker" }, "Le son de la station"), h("strong", null, p.focus), p.ipa ? h("span", { class: "ipa" }, p.ipa) : null), h("p", { class: "pron-explain", html: rich(p.explain) }), coach),
    h("ol", { class: "pron-list" }, rows.map((r) => r.row)),
  );
  if (p.practice?.length) {
    body.append(
      h(
        "div",
        { class: "pron-practice" },
        h("div", { class: "pron-kicker" }, "À toi de jouer"),
        p.practice.map((s) =>
          h("div", { class: "practice-line" }, h("span", null, s), h("span", { class: "pron-btns" }, h("button", { type: "button", class: "icon-btn", "aria-label": "Écouter", html: icon("speaker"), onClick: () => speak(s) }), h("button", { type: "button", class: "icon-btn", "aria-label": "Écouter lentement", html: icon("turtle"), onClick: () => speak(s, { rate: 0.6 }) }))),
        ),
      ),
    );
  }
  const ear = h("div", { class: "ear" });
  body.append(ear);
  if (p.pairs?.length && ttsReady()) earTraining(ear, p, onDone);
  else body.append(h("div", { class: "step-end" }, h("p", null, "Tu as répété chaque mot à voix haute ?"), h("button", { type: "button", class: "btn btn-primary btn-xl", onClick: onDone }, "Oui, étape suivante")));
  return () => {
    alive = false;
    stopSpeaking();
  };
}

/** Minimal-pair listening game: which of the two words did you hear? */
function earTraining(root, p, onDone) {
  const ROUNDS = 8;
  let round = 0;
  let good = 0;
  const intro = h("div", { class: "ear-intro" }, h("div", { class: "pron-kicker" }, "Entraîne ton oreille"), h("p", null, `${ROUNDS} écoutes : la voix dit un des deux mots, trouve lequel. Tu peux réécouter autant que tu veux.`));
  const start = h("button", { type: "button", class: "btn btn-primary" }, "Commencer l'entraînement");
  root.replaceChildren(intro, start);
  start.addEventListener("click", () => play());
  const play = () => {
    if (round >= ROUNDS) {
      const ok = good >= ROUNDS - 2;
      root.replaceChildren(
        h(
          "div",
          { class: `ear-end ${ok ? "ok" : ""}` },
          h("strong", null, `${good} / ${ROUNDS}`),
          h("p", null, ok ? "Super oreille ! Ton cerveau commence à entendre la différence." : "C'est normal au début : ces sons n'existent pas en français. Réécoute les paires et recommence."),
          h("div", { class: "row" }, h("button", { type: "button", class: "btn btn-ghost", onClick: () => ((round = 0), (good = 0), play()) }, "Recommencer"), h("button", { type: "button", class: "btn btn-primary", onClick: onDone }, "Étape suivante")),
        ),
      );
      if (ok) {
        sfx.win();
        confetti({ count: 60 });
      }
      return;
    }
    const pair = p.pairs[round % p.pairs.length];
    const target = Math.random() < 0.5 ? 0 : 1;
    const word = pair[target];
    const listen = h("button", { type: "button", class: "audio-big", "aria-label": "Réécouter", html: icon("speaker") });
    listen.addEventListener("click", () => speak(word));
    const opts = shuffle([0, 1]).map((i) => h("button", { type: "button", class: "choice en big", "data-i": i }, pair[i]));
    const box = h("div", { class: "ear-round" }, h("div", { class: "ear-count" }, `Écoute ${round + 1} / ${ROUNDS}`), listen, h("div", { class: "choices two" }, opts));
    root.replaceChildren(box);
    setTimeout(() => speak(word), 250);
    opts.forEach((b) =>
      b.addEventListener("click", async () => {
        const ok = Number(b.dataset.i) === target;
        opts.forEach((o) => {
          o.disabled = true;
          if (Number(o.dataset.i) === target) o.classList.add("right");
          else if (o === b) o.classList.add("wrong");
        });
        if (ok) {
          good++;
          sfx.correct();
          burstAt(b, { color: ["#12805C", "#FFC23D"], count: 12 });
        } else {
          sfx.wrong();
          // Replay both so the kid hears the contrast.
          await speakParts([
            { text: pair[target], lang: "en", pause: 400 },
            { text: pair[1 - target], lang: "en" },
          ]);
        }
        round++;
        setTimeout(play, ok ? 650 : 900);
      }),
    );
  };
}

// ---------- 3. Words ----------

function wordsStep(body, unit, onDone) {
  const list = h(
    "ul",
    { class: "word-list" },
    unit.vocab.map((v) =>
      h(
        "li",
        { class: "word" },
        h("button", { type: "button", class: "word-play", "aria-label": `Écouter ${v.en}`, html: icon("speaker"), onClick: () => speak(v.en) }),
        h("div", { class: "word-main" }, h("div", { class: "word-en" }, v.en), h("div", { class: "word-fr" }, v.fr), v.ex ? h("button", { type: "button", class: "word-ex", onClick: () => speak(v.ex) }, v.ex) : null),
      ),
    ),
  );
  const cardsBtn = h("button", { type: "button", class: "btn btn-primary" }, h("span", { html: icon("cards") }), "Réviser en cartes");
  const area = h("div");
  cardsBtn.addEventListener("click", () => flashcards(area, unit, onDone));
  body.append(
    stepHead(3, "Les mots", `${unit.vocab.length} mots et expressions. Écoute-les, puis révise-les en cartes jusqu'à les connaître.`),
    h("div", { class: "words-head" }, cardsBtn),
    area,
    list,
    h("div", { class: "step-end" }, h("button", { type: "button", class: "btn btn-ghost", onClick: onDone }, "Je les connais, étape suivante")),
  );
  return () => stopSpeaking();
}

function flashcards(area, unit, onDone) {
  const deck = shuffle(unit.vocab);
  const total = deck.length;
  let i = 0;
  let known = 0;
  const front = h("div", { class: "fc-face fc-front" });
  const back = h("div", { class: "fc-face fc-back" });
  const card = h("button", { type: "button", class: "fc", "aria-label": "Retourner la carte" }, h("div", { class: "fc-inner" }, front, back));
  const count = h("span", { class: "fc-count" });
  const yes = h("button", { type: "button", class: "btn btn-go" }, "Je savais");
  const no = h("button", { type: "button", class: "btn btn-stop" }, "À revoir");
  const close = h("button", { type: "button", class: "icon-btn", "aria-label": "Fermer les cartes", html: icon("close") });
  const show = () => {
    if (i >= deck.length) {
      area.replaceChildren(
        h(
          "div",
          { class: "fc-done" },
          h("strong", null, `${known} / ${total} mots sus du premier coup.`),
          h("p", null, known === total ? "Parfait. Tu es prêt pour la pratique." : "Les cartes « à revoir » sont revenues jusqu'à ce que tu les saches. Bien joué."),
          h("div", { class: "row" }, h("button", { type: "button", class: "btn btn-ghost", onClick: () => flashcards(area, unit, onDone) }, "Recommencer"), h("button", { type: "button", class: "btn btn-primary", onClick: onDone }, "Étape suivante")),
        ),
      );
      sfx.win();
      return;
    }
    const v = deck[i];
    card.classList.remove("flipped");
    front.replaceChildren(h("span", { class: "fc-hint" }, "Comment dit-on en anglais…"), h("span", { class: "fc-word" }, v.fr), h("span", { class: "fc-tap" }, "Touche pour retourner"));
    back.replaceChildren(h("span", { class: "fc-word en" }, v.en), v.ex ? h("span", { class: "fc-ex" }, v.ex) : null);
    count.textContent = `${Math.min(i + 1, deck.length)} / ${deck.length}`;
    yes.disabled = no.disabled = true;
  };
  card.addEventListener("click", () => {
    card.classList.toggle("flipped");
    sfx.flip();
    if (card.classList.contains("flipped")) {
      speak(deck[i].en);
      yes.disabled = no.disabled = false;
    }
  });
  yes.addEventListener("click", () => {
    if (i < total) known++;
    i++;
    sfx.correct();
    show();
  });
  no.addEventListener("click", () => {
    deck.push(deck[i]);
    i++;
    show();
  });
  close.addEventListener("click", () => area.replaceChildren());
  area.replaceChildren(h("div", { class: "fc-wrap" }, h("div", { class: "fc-top" }, count, close), card, h("div", { class: "fc-actions" }, no, yes)));
  show();
}

// ---------- 4. Practice: mission + games ----------

function practiceStep(body, unit, refreshSteps) {
  const done = pathOf(unit.id).practice || 0;
  body.append(stepHead(4, "Pratique", `Fais au moins ${PRACTICE_GOAL} activités avant le test (${Math.min(done, PRACTICE_GOAL)}/${PRACTICE_GOAL}). Les jeux n'utilisent que ce que tu viens d'apprendre.`));
  if (unit.mission) body.append(missionCard(unit, refreshSteps));
  const grid = h("div", { class: "games-grid" });
  for (const g of GAMES) {
    const needsAudio = g.audio && !ttsReady();
    const enough = g.available(unit);
    const best = state.games[`${unit.id}:${g.id}`];
    const card = h(
      "button",
      { type: "button", class: `game-card ${needsAudio || !enough ? "off" : ""}`, style: { "--g": g.color } },
      h("span", { class: "game-ic", html: icon(g.icon) }),
      h("span", { class: "game-name" }, g.name),
      h("span", { class: "game-skill" }, g.skill),
      h("span", { class: "game-desc" }, needsAudio ? "Ton appareil ne lit pas l'anglais à voix haute." : g.desc),
      h("span", { class: "game-best" }, best ? `Record : ${best}` : "Pas encore joué"),
    );
    card.addEventListener("click", () => {
      if (needsAudio) return toast("Ce jeu a besoin de la voix anglaise de ton appareil (essaie Chrome, Safari ou Edge).");
      if (!enough) return toast("Pas assez d'éléments dans cette station pour ce jeu.");
      sfx.tap();
      go("game", { uid: unit.id, game: g.id });
    });
    grid.append(card);
  }
  body.append(h("h3", { class: "sub-title" }, "Les mini-jeux"), grid);
  return () => stopSpeaking();
}

function missionCard(unit, refreshSteps) {
  const m = unit.mission;
  const oral = m.type === "oral";
  const answer = oral ? null : h("textarea", { class: "field mission-input", rows: 4, placeholder: "Écris ta réponse en anglais ici…", id: `mission-${unit.id}`, spellcheck: "false", autocapitalize: "sentences" });
  const reveal = h("button", { type: "button", class: "btn btn-primary" }, oral ? "J'ai répondu à voix haute : voir le modèle" : "Voir le modèle");
  const model = h("div", { class: "mission-model", hidden: true });
  const card = h(
    "div",
    { class: `mission ${oral ? "oral" : "ecrit"}` },
    h("div", { class: "mission-kicker" }, h("span", { html: icon(oral ? "mic" : "spell") }), oral ? "Mission orale" : "Mission écrite"),
    h("p", { class: "mission-prompt", html: rich(m.prompt) }),
    oral ? h("p", { class: "mission-help" }, "Dis ta réponse en anglais, à voix haute, en entier. Prends ton temps.") : null,
    answer,
    reveal,
    model,
  );
  if (!oral) {
    const checkBtn = h("button", { type: "button", class: "btn btn-ghost" }, h("span", { html: icon("check") }), "Faire vérifier mon texte");
    const out = h("div");
    checkBtn.addEventListener("click", () => {
      if (!answer.value.trim()) return toast("Écris d'abord ta réponse.");
      out.replaceChildren(quickCheck(answer.value, Number(unit.id.split(".")[0])));
    });
    card.insertBefore(h("div", null, checkBtn, out), reveal);
  }
  reveal.addEventListener("click", () => {
    reveal.hidden = true;
    const checks = m.checklist.map((c, i) => {
      const id = `chk-${unit.id}-${i}`.replace(/\./g, "-");
      return h("label", { class: "check", for: id }, h("input", { type: "checkbox", id }), h("span", { html: rich(c) }));
    });
    const doneBtn = h("button", { type: "button", class: "btn btn-go" }, "Mission accomplie");
    model.replaceChildren(
      h("div", { class: "pron-kicker" }, "Un exemple de bonne réponse"),
      h("div", { class: "mission-model-text" }, m.model, h("button", { type: "button", class: "icon-btn", "aria-label": "Écouter le modèle", html: icon("speaker"), onClick: () => speak(m.model) })),
      h("div", { class: "pron-kicker" }, "Vérifie ta réponse"),
      h("div", { class: "checks" }, checks),
      doneBtn,
    );
    model.hidden = false;
    speak(m.model);
    doneBtn.addEventListener("click", () => {
      const ticked = checks.filter((c) => c.querySelector("input").checked).length;
      if (ticked < checks.length) {
        toast("Coche chaque point que tu as réussi. Sinon, corrige ta réponse et réessaie : c'est comme ça qu'on progresse.");
        return;
      }
      markStep(unit.id, "practice");
      addXp(20);
      touchStreak();
      save();
      sfx.win();
      confetti({ count: 70 });
      floatText("+20 XP", doneBtn, { color: "var(--amber)" });
      doneBtn.disabled = true;
      doneBtn.textContent = "Mission réussie";
      refreshSteps();
    });
  });
  return card;
}

// ---------- 5. Test ----------

function testStep(body, unit) {
  const st = unitState(unit.id);
  const d = diff();
  const missing = missingPrep(unit.id);
  const start = h("button", { type: "button", class: "btn btn-primary btn-xl" }, st.passed ? "Refaire le test" : "Commencer le test");
  start.addEventListener("click", async () => {
    if (missing.length && !st.passed) {
      const v = await dialog({
        title: "Tu es sûr d'être prêt ?",
        body: `<p>Il te reste : <strong>${missing.map((s) => s.label.toLowerCase()).join(", ")}</strong>.</p><p>Le test est difficile. En suivant les étapes dans l'ordre, tu as beaucoup plus de chances de réussir du premier coup.</p>`,
        actions: [
          { label: "Tenter quand même", value: "go" },
          { label: "Finir la préparation", value: "prep", primary: true },
        ],
      });
      if (v !== "go") return;
    }
    go("test", { uid: unit.id });
  });
  body.append(
    stepHead(5, "Le test de la station", missing.length ? "Conseil : termine d'abord les étapes 1 à 4." : "Tu as tout préparé. Respire, prends ton temps de lire chaque question."),
    h(
      "div",
      { class: "test-card" },
      h("h3", { class: "test-title" }, "15 questions, sans aide"),
      h(
        "ul",
        { class: "test-rules" },
        h("li", null, h("span", { html: icon("trophy") }), `Il faut ${Math.round(d.pass * 100)} % pour réussir (${Math.ceil(d.pass * 15 - 1e-9)} bonnes réponses sur 15).`),
        h("li", null, h("span", { html: icon("clock") }), "Chaque question a un chrono, assez long pour réfléchir."),
        h("li", null, h("span", { html: icon("spell") }), "Tu écris beaucoup de réponses : l'orthographe compte."),
        h("li", null, h("span", { html: icon("speaker") }), `Écoute et dictée : ${d.replays} réécoute${d.replays > 1 ? "s" : ""} maximum.`),
        h("li", null, h("span", { html: icon("refresh") }), "Raté ? Aucun problème : tes erreurs vont dans ton carnet et tu peux refaire le test autant de fois que tu veux."),
      ),
      st.attempts ? h("p", { class: "test-best" }, `Meilleur score : ${Math.round((st.best || 0) * 100)} % · ${st.attempts} essai${st.attempts > 1 ? "s" : ""}`) : null,
      start,
      h("p", { class: "test-note" }, `Mode ${d.label.toLowerCase()}.`),
    ),
  );
}
