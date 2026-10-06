// Cambridge C2 Proficiency preparation: every part of the exam, and mock exams scored on the Cambridge English Scale.
import { h, icon, shuffle, dialog, sleep } from "../ui.js";
import { EXTRA } from "../content.js";
import { state, save, addXp, touchStreak, checkBadges, highestLevelDone } from "../store.js";
import { go } from "../router.js";
import { matches } from "../answer.js";
import { speakParts, stopSpeaking, ttsReady, sfx } from "../audio.js";
import { runQuiz, scoreOf } from "../runner.js";
import { micAvailable, listenOnce } from "../mic.js";
import { confetti } from "../fx.js";
import { mentorSays, quip } from "../humor.js";

const U = () => EXTRA.c2uoe || {};
const P = () => EXTRA.c2papers || {};
const LETTERS = "ABCDEFGH";

/** Percentage → estimated Cambridge English Scale score (C2 Proficiency reports 180-230). */
export function cambridgeScale(pct) {
  const pts = [[0, 120], [0.3, 160], [0.45, 180], [0.6, 200], [0.75, 213], [0.8, 220], [1, 230]];
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1];
    const [x1, y1] = pts[i];
    if (pct <= x1) return Math.round(y0 + ((pct - x0) / (x1 - x0)) * (y1 - y0));
  }
  return 230;
}
export function grade(scale) {
  if (scale >= 220) return { label: "Grade A · C2", cls: "a" };
  if (scale >= 213) return { label: "Grade B · C2", cls: "b" };
  if (scale >= 200) return { label: "Grade C · C2", cls: "c" };
  if (scale >= 180) return { label: "Niveau C1 (certificat C1)", cls: "c1" };
  return { label: "Pas encore de certificat", cls: "no" };
}

const PARTS = [
  { id: "part1", paper: "R", title: "Part 1 · Multiple-choice cloze", fr: "Texte à trous, 4 choix par trou : collocations, expressions figées, nuances.", count: () => (U().part1 || []).length },
  { id: "part2", paper: "R", title: "Part 2 · Open cloze", fr: "Un seul mot par trou : prépositions, articles, connecteurs, auxiliaires.", count: () => (U().part2 || []).length },
  { id: "part3", paper: "R", title: "Part 3 · Word formation", fr: "Forme le bon mot à partir du mot en MAJUSCULES.", count: () => (U().part3 || []).length },
  { id: "part4", paper: "R", title: "Part 4 · Key word transformation", fr: "Réécris la phrase avec le mot imposé, en 3 à 8 mots.", count: () => (U().part4 || []).length },
  { id: "reading5", paper: "R", title: "Part 5 · Multiple choice", fr: "Un long texte et 6 questions d'inférence, de ton, d'opinion.", count: () => (P().reading5 || []).length },
  { id: "reading6", paper: "R", title: "Part 6 · Gapped text", fr: "Replace les 7 paragraphes manquants (un intrus).", count: () => (P().reading6 || []).length },
  { id: "reading7", paper: "R", title: "Part 7 · Multiple matching", fr: "Associe 10 affirmations aux bonnes sections.", count: () => (P().reading7 || []).length },
  { id: "listening", paper: "L", title: "Listening", fr: "Extraits, monologues et discussions lus par la voix de synthèse.", count: () => (P().listening || []).length },
  { id: "writing", paper: "W", title: "Writing", fr: "Essai (Part 1) et article, lettre, rapport, critique (Part 2), corrigés et notés.", count: () => (P().writing || []).length },
  { id: "speaking", paper: "S", title: "Speaking", fr: "Sujets d'oral, chrono et expressions utiles.", count: () => (P().speaking || []).length },
];

export function c2Screen(view, { tab } = {}) {
  if (tab === "writing") return writingList(view);
  const ready = highestLevelDone() >= 9 || state.placement?.band === "C1" || state.placement?.band === "C2";
  const best = (id) => state.c2?.[id]?.best;
  const mock = state.c2?.mock;
  view.append(
    h(
      "div",
      { class: "c2" },
      h("div", { class: "topbar" }, h("button", { type: "button", class: "icon-btn", "aria-label": "Retour", html: icon("back"), onClick: () => go("map") }), h("span", { class: "topbar-title" }, "Prépa C2 Proficiency")),
      h("h1", { class: "page-title" }, "Prépa Cambridge C2 Proficiency"),
      h("p", { class: "page-lead" }, "Le C2 Proficiency de Cambridge est le diplôme d'anglais le plus élevé. Il est noté sur la Cambridge English Scale : 200 points pour obtenir le C2 (grade C), 213 pour le grade B, 220 pour le grade A. Entre 180 et 199, on obtient un certificat C1."),
      !ready ? mentorSays("Attention, ici c'est la montagne la plus haute. Je te conseille d'avoir fini la ligne 9 avant de grimper… mais tu peux jeter un œil.", "", "warning") : null,
      mock ? h("div", { class: `c2-mock-last ${grade(mock.scale).cls}` }, h("strong", null, `Dernier examen blanc : ${mock.scale}`), " · ", grade(mock.scale).label) : null,
      h(
        "div",
        { class: "row" },
        h("button", { type: "button", class: "btn btn-primary btn-xl", onClick: () => mockExam(view, "short") }, h("span", { html: icon("clock") }), "Examen blanc express (≈ 45 min)"),
        h("button", { type: "button", class: "btn btn-ghost", onClick: () => mockExam(view, "full") }, "Examen blanc complet (≈ 2 h)"),
      ),
      h("h2", { class: "section-title" }, "S'entraîner épreuve par épreuve"),
      h(
        "div",
        { class: "c2-parts" },
        PARTS.filter((p) => p.count() > 0).map((p) =>
          h(
            "button",
            { type: "button", class: `c2-part paper-${p.paper}`, onClick: () => (p.id === "writing" ? go("c2", { tab: "writing" }) : practice(view, p.id)) },
            h("strong", null, p.title),
            h("small", null, p.fr),
            h("span", { class: "c2-best" }, best(p.id) != null ? `Meilleur : ${Math.round(best(p.id) * 100)} % (≈ ${cambridgeScale(best(p.id))})` : `${p.count()} exercices`),
          ),
        ),
      ),
      h("p", { class: "set-help" }, "Tous les textes sont originaux, écrits pour Mission Bilingue au format de l'examen. Le score affiché est une estimation pour te situer, pas un résultat officiel."),
    ),
  );
  return undefined;
}

function writingList(view) {
  const tasks = P().writing || [];
  view.append(
    h(
      "div",
      { class: "c2" },
      h("div", { class: "topbar" }, h("button", { type: "button", class: "icon-btn", "aria-label": "Retour", html: icon("back"), onClick: () => go("c2") }), h("span", { class: "topbar-title" }, "C2 · Writing")),
      h("h1", { class: "page-title" }, "Writing"),
      h("p", { class: "page-lead" }, "Part 1 : un essai qui résume et évalue deux textes (240-280 mots). Part 2 : un article, une lettre, un rapport ou une critique (280-320 mots). Ta copie est corrigée et notée sur 20."),
      h("div", { class: "w-grid" }, tasks.map((t) => h("button", { type: "button", class: "w-card", onClick: () => go("writing", { promptId: t.id }) }, h("span", { class: "tag" }, `Part ${t.part} · ${t.type}`), h("strong", null, t.title), h("small", null, `${t.words[0]}–${t.words[1]} words`)))),
    ),
  );
  return undefined;
}

/** Records a practice score and gives XP. */
function record(id, pct) {
  const c = (state.c2[id] ||= { best: 0, attempts: 0 });
  c.best = Math.max(c.best || 0, pct);
  c.attempts++;
  addXp(Math.round(pct * 40));
  touchStreak();
  save();
}

// ---------- One exercise of a part ----------

function practice(view, partId, { set, onDone, onQuit } = {}) {
  const pools = { part1: U().part1, part2: U().part2, part3: U().part3, reading5: P().reading5, reading6: P().reading6, reading7: P().reading7, listening: P().listening, speaking: P().speaking };
  const done = state.c2?.[`seen-${partId}`] || [];
  const pick = (arr) => set || arr.find((x) => !done.includes(x.id)) || shuffle(arr)[0];
  const finish = (pct, item) => {
    if (item) state.c2[`seen-${partId}`] = [...done.filter((x) => x !== item.id), item.id].slice(-50);
    record(partId, pct);
    checkBadges();
    if (onDone) return onDone(pct);
    resultPanel(view, partId, pct);
  };
  if (partId === "part4") return transformations(view, finish, onDone, onQuit);
  const item = pick(pools[partId] || []);
  if (!item) return go("c2");
  // In a mock exam a text counts as seen as soon as it is shown: quitting will not bring it back.
  if (onDone) state.c2[`seen-${partId}`] = [...done.filter((x) => x !== item.id), item.id].slice(-50);
  if (__MB_TEST__) window.__mbItem = { partId, item };
  const shell = (title, sub, ...body) => {
    view.replaceChildren(
      h(
        "div",
        { class: "c2 c2-ex" },
        h("div", { class: "topbar" }, h("button", { type: "button", class: "icon-btn", "aria-label": "Quitter", html: icon("close"), onClick: () => (stopSpeaking(), onDone ? confirmQuit(view, onQuit) : go("c2")) }), h("span", { class: "topbar-title" }, PARTS.find((p) => p.id === partId).title)),
        h("h1", { class: "c2-title" }, title),
        sub ? h("p", { class: "set-help" }, sub) : null,
        ...body,
      ),
    );
    window.scrollTo({ top: 0 });
  };
  if (partId === "part1" || partId === "part2" || partId === "part3") return gapped(item, partId, shell, finish);
  if (partId === "reading5") return mcText(item, shell, finish);
  if (partId === "reading6") return gappedParagraphs(item, shell, finish);
  if (partId === "reading7") return matching(item, shell, finish);
  if (partId === "listening") return listening(item, shell, finish);
  if (partId === "speaking") return speaking(item, shell, finish);
  return undefined;
}

async function confirmQuit(view, onQuit) {
  const body = onQuit ? "<p><strong>C'est le boss final de la tour : abandonner = perdre un cœur.</strong></p>" : "<p>Ta progression dans cet examen sera perdue.</p>";
  const ok = await dialog({ title: "Quitter l'examen blanc ?", body, actions: [{ label: "Continuer", value: false, primary: true }, { label: "Quitter", value: true, danger: true }] });
  if (ok) (onQuit ? onQuit() : go("c2"));
}

const submitBtn = (label = "Corriger") => h("button", { type: "button", class: "btn btn-primary btn-xl" }, label);
const explainEl = (ok, txt) => h("div", { class: `c2-explain ${ok ? "ok" : "ko"}` }, txt);

/** Parts 1-3: a text with 8 numbered gaps. */
function gapped(item, partId, shell, finish) {
  const controls = [];
  const html = item.text.split(/\{(\d)\}/);
  const textEl = h("div", { class: "c2-text" });
  html.forEach((chunk, i) => {
    if (i % 2 === 0) {
      textEl.append(...chunk.split(/\n\n/).flatMap((para, k) => (k ? [h("br"), h("br"), para] : [para])));
      return;
    }
    const n = Number(chunk);
    const g = item.gaps[n - 1];
    let ctl;
    if (partId === "part1") ctl = h("select", { class: "c2-select", "aria-label": `Trou ${n}` }, h("option", { value: "" }, `(${n})`), g.choices.map((c, k) => h("option", { value: k }, `${LETTERS[k]} ${c}`)));
    else ctl = h("input", { class: "c2-input", type: "text", autocomplete: "off", spellcheck: "false", autocapitalize: "off", "aria-label": `Trou ${n}`, placeholder: `(${n})`, size: 10 });
    controls[n - 1] = ctl;
    textEl.append(h("span", { class: "c2-gap" }, h("sup", null, n), ctl, partId === "part3" ? h("span", { class: "c2-stem" }, g.stem) : null));
  });
  const go2 = submitBtn();
  const out = h("div");
  go2.addEventListener("click", () => {
    let good = 0;
    const rows = item.gaps.map((g, i) => {
      const v = controls[i].value;
      const ok = partId === "part1" ? Number(v) === g.answer && v !== "" : matches(v, g.answer);
      if (ok) good++;
      controls[i].classList.add(ok ? "ok" : "ko");
      controls[i].disabled = true;
      const right = partId === "part1" ? g.choices[g.answer] : g.answer.join(" / ");
      return explainEl(ok, h("span", null, h("strong", null, `(${i + 1}) ${right}`), ` — ${g.explain}`));
    });
    go2.remove();
    const pct = good / item.gaps.length;
    out.replaceChildren(h("p", { class: "c2-score" }, `${good} / ${item.gaps.length}`), ...rows, continueBtn(() => finish(pct, item)));
    sfx[pct >= 0.6 ? "win" : "lose"]();
  });
  shell(item.title, partId === "part1" ? "Choisis le mot qui convient pour chaque trou." : partId === "part2" ? "Écris UN seul mot par trou." : "Écris la bonne forme du mot en majuscules (un seul mot).", textEl, go2, out);
}

const continueBtn = (fn) => h("button", { type: "button", class: "btn btn-primary btn-xl c2-continue", onClick: fn }, "Continuer");

/** Part 4: key word transformations, played with the normal quiz runner (one box per word). */
function transformations(view, finish, inMock, onQuit) {
  const all = U().part4 || [];
  const seen = new Set(state.c2?.["seen-part4"] || []);
  const fresh = all.filter((t) => !seen.has(t.id));
  const chosen = shuffle(fresh.length >= 6 ? fresh : all).slice(0, 6);
  const questions = chosen.map((t) => ({ kind: "fill", ref: null, skill: "grammaire", unitId: "12.0", level: 12, q: t.q, lead: t.lead, key: t.key, accept: t.answer, expected: t.answer[0], explain: t.explain, time: 150 }));
  if (inMock) state.c2["seen-part4"] = [...seen, ...chosen.map((t) => t.id)].slice(-60);
  const quiz = runQuiz(view, questions, {
    title: "Part 4 · Key word transformation",
    accent: "var(--l12)",
    quitBody: onQuit ? "<p><strong>C'est le boss final de la tour : abandonner = perdre un cœur.</strong></p>" : undefined,
    onDone: (results, { quit }) => {
      if (quit) return onQuit ? onQuit() : go("c2");
      state.c2["seen-part4"] = [...seen, ...chosen.map((t) => t.id)].slice(-60);
      finish(scoreOf(results));
    },
  });
  return () => quiz.stop();
}

/** Part 5: a long text and multiple-choice questions. */
function mcText(item, shell, finish) {
  const qs = item.questions.map((q, i) => mcBlock(q, i));
  const go2 = submitBtn();
  go2.addEventListener("click", () => {
    const good = qs.filter((b) => b.check()).length;
    go2.replaceWith(h("p", { class: "c2-score" }, `${good} / ${qs.length}`), continueBtn(() => finish(good / qs.length, item)));
  });
  shell(item.title, "Lis le texte, puis réponds aux questions.", h("div", { class: "c2-text long" }, item.text.split(/\n\n/).map((p) => h("p", null, p))), ...qs.map((b) => b.el), go2);
}

function mcBlock(q, i) {
  const name = `q${i}-${Math.random().toString(36).slice(2, 6)}`;
  const opts = q.choices.map((c, k) => h("label", { class: "c2-opt" }, h("input", { type: "radio", name, value: k }), h("span", null, `${LETTERS[k]}. ${c}`)));
  const exp = h("div");
  const el = h("fieldset", { class: "c2-q" }, h("legend", null, `${i + 1}. ${q.q}`), opts, exp);
  return {
    el,
    check() {
      const v = el.querySelector("input:checked")?.value;
      const ok = Number(v) === q.answer && v != null;
      opts.forEach((o, k) => {
        o.querySelector("input").disabled = true;
        if (k === q.answer) o.classList.add("right");
        else if (String(k) === v) o.classList.add("wrong");
      });
      exp.replaceChildren(explainEl(ok, q.explain || ""));
      return ok;
    },
  };
}

/** Part 6: paragraphs removed from a text (one extra option). */
function gappedParagraphs(item, shell, finish) {
  const selects = [];
  let n = 0;
  const textEl = h(
    "div",
    { class: "c2-text long" },
    item.parts.map((p) => {
      if (p !== "{gap}") return h("p", null, p);
      n++;
      const s = h("select", { class: "c2-select", "aria-label": `Paragraphe manquant ${n}` }, h("option", { value: "" }, `(${n}) choisis A–H`), item.options.map((_, k) => h("option", { value: k }, LETTERS[k])));
      selects.push(s);
      return h("p", { class: "c2-para-gap" }, h("strong", null, `${n}. `), s);
    }),
  );
  const optsEl = h("div", { class: "c2-options" }, item.options.map((o, k) => h("div", { class: "c2-option" }, h("strong", null, `${LETTERS[k]}. `), o)));
  const go2 = submitBtn();
  go2.addEventListener("click", () => {
    let good = 0;
    selects.forEach((s, i) => {
      const ok = Number(s.value) === item.answer[i] && s.value !== "";
      if (ok) good++;
      s.classList.add(ok ? "ok" : "ko");
      s.disabled = true;
      if (!ok) s.after(h("span", { class: "c2-right" }, ` → ${LETTERS[item.answer[i]]}`));
    });
    go2.replaceWith(h("p", { class: "c2-score" }, `${good} / ${selects.length}`), explainEl(good === selects.length, item.explain), continueBtn(() => finish(good / selects.length, item)));
  });
  shell(item.title, "Choisis le paragraphe (A–H) qui va dans chaque trou. Un paragraphe ne sert pas.", textEl, h("h2", { class: "section-title" }, "Les paragraphes"), optsEl, go2);
}

/** Part 7: match statements with sections. */
function matching(item, shell, finish) {
  const labels = item.sections.map((s) => s.label);
  const rows = item.statements.map((st, i) => {
    const s = h("select", { class: "c2-select", "aria-label": `Affirmation ${i + 1}` }, h("option", { value: "" }, "?"), labels.map((l) => h("option", { value: l }, l)));
    return { st, s, el: h("div", { class: "c2-match" }, s, h("span", null, `${i + 1}. ${st.text}`)) };
  });
  const go2 = submitBtn();
  go2.addEventListener("click", () => {
    let good = 0;
    rows.forEach(({ st, s }) => {
      const ok = s.value === st.answer;
      if (ok) good++;
      s.classList.add(ok ? "ok" : "ko");
      s.disabled = true;
      if (!ok) s.after(h("span", { class: "c2-right" }, ` → ${st.answer}`));
    });
    go2.replaceWith(h("p", { class: "c2-score" }, `${good} / ${rows.length}`), continueBtn(() => finish(good / rows.length, item)));
  });
  shell(item.title, "Dans quelle section (A, B, C…) trouve-t-on chaque idée ? Une section peut servir plusieurs fois.", h("div", { class: "c2-sections" }, item.sections.map((s) => h("section", null, h("h3", null, `Section ${s.label}`), h("p", null, s.text)))), h("h2", { class: "section-title" }, "Les affirmations"), ...rows.map((r) => r.el), go2);
}

/** Listening: the recording is read twice at most (as in the exam), then questions. */
function listening(item, shell, finish) {
  let plays = 0;
  const playBtn = h("button", { type: "button", class: "btn btn-primary" }, h("span", { html: icon("speaker") }), "Écouter l'enregistrement (2 écoutes)");
  const status = h("span", { class: "set-help" });
  playBtn.addEventListener("click", async () => {
    if (plays >= 2) return;
    plays++;
    playBtn.disabled = true;
    status.textContent = `Écoute ${plays} / 2…`;
    await speakParts(item.lines.map((l) => ({ text: l.en, lang: "en", pause: 350 })));
    status.textContent = plays >= 2 ? "Plus d'écoute disponible." : "Tu peux réécouter une fois.";
    playBtn.disabled = plays >= 2;
  });
  const qs = item.questions.map((q, i) => mcBlock(q, i));
  const go2 = submitBtn();
  go2.addEventListener("click", () => {
    stopSpeaking();
    const good = qs.filter((b) => b.check()).length;
    go2.replaceWith(h("p", { class: "c2-score" }, `${good} / ${qs.length}`), h("details", { class: "w-model" }, h("summary", null, "Lire la transcription"), h("div", { class: "w-model-text" }, item.lines.map((l) => h("p", null, h("strong", null, `${l.who}: `), l.en)))), continueBtn(() => finish(good / qs.length, item)));
  });
  if (!ttsReady()) {
    return shell(item.title, "Ton appareil ne lit pas l'anglais à voix haute : voici la transcription à lire (une seule fois !).", h("div", { class: "c2-text" }, item.lines.map((l) => h("p", null, h("strong", null, `${l.who}: `), l.en))), ...qs.map((b) => b.el), go2);
  }
  shell(item.title, `Partie ${item.part} de l'épreuve d'écoute. Lis d'abord les questions, puis écoute.`, h("div", { class: "row" }, playBtn, status), ...qs.map((b) => b.el), go2);
}

/** Speaking: preparation, speaking time, optional transcript, self-assessment. */
function speaking(item, shell, finish) {
  const timer = h("div", { class: "c2-timer" }, "2:00");
  let t = 120;
  let iv = null;
  const start = h("button", { type: "button", class: "btn btn-primary" }, h("span", { html: icon("clock") }), "Démarrer : 2 minutes pour parler");
  start.addEventListener("click", () => {
    clearInterval(iv);
    t = 120;
    iv = setInterval(() => {
      t--;
      timer.textContent = `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
      if (t <= 0) {
        clearInterval(iv);
        sfx.level();
      }
    }, 1000);
  });
  const transcript = h("p", { class: "set-help" });
  const micBtn = h("button", { type: "button", class: "btn btn-ghost", hidden: true }, h("span", { html: icon("mic") }), "Transcrire une phrase");
  micAvailable().then((ok) => (micBtn.hidden = !ok));
  micBtn.addEventListener("click", async () => {
    transcript.textContent = "Je t'écoute…";
    try {
      const alts = await listenOnce({ timeout: 12000 });
      transcript.textContent = `J'ai compris : « ${alts[0] || "?"} ». Si c'est bien ce que tu voulais dire, ta prononciation est claire !`;
    } catch (e) {
      transcript.textContent = e.message;
    }
  });
  const checks = ["J'ai parlé pendant toute la durée, sans longs silences.", "J'ai donné des exemples précis et justifié mon avis.", "J'ai utilisé au moins trois expressions utiles.", "J'ai varié mes structures (conditionnel, inversion, relatives…).", "Je me suis corrigé(e) quand je me suis trompé(e)."];
  const boxes = checks.map((c, i) => h("label", { class: "check" }, h("input", { type: "checkbox", id: `sp-${i}` }), h("span", null, c)));
  const done = h("button", { type: "button", class: "btn btn-go" }, "Terminé");
  done.addEventListener("click", () => {
    clearInterval(iv);
    finish(boxes.filter((b) => b.querySelector("input").checked).length / checks.length, item);
  });
  shell(
    `Speaking · Part ${item.part}`,
    "Lis le sujet, prépare-toi 30 secondes, puis parle à voix haute pendant 2 minutes. Enregistre-toi avec ton téléphone pour te réécouter : c'est l'exercice le plus efficace.",
    h("div", { class: "c2-speak" }, h("p", { class: "c2-speak-prompt" }, item.prompt), item.followups?.length ? h("ul", null, item.followups.map((f) => h("li", null, f))) : null),
    h("h2", { class: "section-title" }, "Expressions utiles"),
    h("ul", { class: "w-list good" }, item.useful.map((u) => h("li", null, u))),
    h("div", { class: "row" }, start, timer, micBtn),
    transcript,
    h("h2", { class: "section-title" }, "Auto-évaluation"),
    ...boxes,
    done,
  );
}

function resultPanel(view, partId, pct) {
  const scale = cambridgeScale(pct);
  view.replaceChildren(
    h(
      "div",
      { class: "results" },
      h("p", { class: "eyebrow" }, PARTS.find((p) => p.id === partId)?.title || "C2"),
      h("h1", { class: "results-title" }, `${Math.round(pct * 100)} %`),
      h("p", { class: "results-line" }, `Sur cette épreuve, c'est l'équivalent d'environ ${scale} sur l'échelle Cambridge (${grade(scale).label}).`),
      mentorSays(quip(pct >= 0.75 ? "perfect" : pct >= 0.5 ? "correct" : "fail")),
      h("div", { class: "result-actions" }, h("button", { type: "button", class: "btn btn-primary btn-xl", onClick: () => practice(view, partId) }, "Un autre exercice"), h("button", { type: "button", class: "btn btn-ghost", onClick: () => go("c2") }, "Retour à la prépa C2")),
    ),
  );
  if (pct >= 0.75) confetti({ count: 70 });
}

// ---------- Mock exams ----------

async function mockExam(view, kind) {
  const plan = kind === "full" ? ["part1", "part2", "part3", "part4", "reading5", "reading6", "reading7", "listening", "listening"] : ["part1", "part2", "part3", "part4", "reading5", "listening"];
  const ok = await dialog({
    title: kind === "full" ? "Examen blanc complet" : "Examen blanc express",
    body: `<p>${plan.length} épreuves à la suite : Reading &amp; Use of English puis Listening. Prends de quoi boire et coupe les notifications.</p><p>Pour la note de Writing, ta dernière copie C2 corrigée (moins de 30 jours) sera prise en compte si elle existe.</p>`,
    actions: [{ label: "Plus tard", value: false }, { label: "Commencer", value: true, primary: true }],
  });
  if (!ok) return;
  const scores = [];
  const next = (i) => {
    if (i >= plan.length) return mockResult(view, kind, plan, scores);
    practice(view, plan[i], { onDone: (pct) => (scores.push(pct), next(i + 1)) });
  };
  next(0);
}

const FULL_PLAN = ["part1", "part2", "part3", "part4", "reading5", "reading6", "reading7", "listening", "listening"];

/** Scores of a mock exam on the Cambridge scale (Writing = latest C2 essay of the last 30 days, if any). */
function mockScores(kind, plan, scores) {
  const rIdx = plan.map((p, i) => (p !== "listening" ? i : -1)).filter((i) => i >= 0);
  const lIdx = plan.map((p, i) => (p === "listening" ? i : -1)).filter((i) => i >= 0);
  const avg = (idx) => idx.reduce((s, i) => s + scores[i], 0) / idx.length;
  const papers = [{ name: "Reading & Use of English", pct: avg(rIdx) }, { name: "Listening", pct: avg(lIdx) }];
  const recent = state.writing.filter((w) => w.c2 && Date.now() - new Date(w.at) < 30 * 86400000).slice(-1)[0];
  if (recent) papers.push({ name: "Writing", pct: recent.score / 20 });
  papers.forEach((p) => (p.scale = cambridgeScale(p.pct)));
  const overall = Math.round(papers.reduce((s, p) => s + p.scale, 0) / papers.length);
  state.c2.mock = { scale: overall, kind, at: new Date().toISOString(), papers: papers.map((p) => ({ name: p.name, scale: p.scale })) };
  return { overall, papers, recent };
}

/** The final boss of the Tower: the full mock exam, then `onFinish(scale)`. */
export function towerFinal(view, onFinish, onQuit) {
  const scores = [];
  const next = (i) => {
    if (i >= FULL_PLAN.length) {
      const { overall } = mockScores("full", FULL_PLAN, scores);
      addXp(300);
      save();
      return onFinish(overall);
    }
    practice(view, FULL_PLAN[i], { onDone: (pct) => (scores.push(pct), next(i + 1)), onQuit });
  };
  next(0);
}

async function mockResult(view, kind, plan, scores) {
  const { overall, papers, recent } = mockScores(kind, plan, scores);
  addXp(kind === "full" ? 300 : 150);
  touchStreak();
  save();
  const badges = checkBadges();
  const g = grade(overall);
  view.replaceChildren(
    h(
      "div",
      { class: "results c2-result" },
      h("p", { class: "eyebrow" }, kind === "full" ? "Examen blanc complet" : "Examen blanc express"),
      h("div", { class: `c2-scale ${g.cls}` }, h("strong", null, overall), h("small", null, "Cambridge English Scale")),
      h("h1", { class: "results-title" }, g.label),
      h("ul", { class: "history" }, papers.map((p) => h("li", null, h("strong", null, `${p.scale}`), ` · ${p.name} (${Math.round(p.pct * 100)} %)`))),
      !recent ? h("p", { class: "set-help" }, "Astuce : fais une copie C2 dans l'atelier d'écriture pour que l'épreuve de Writing compte dans ton score.") : null,
      mentorSays(overall >= 200 ? "Niveau C2 ! Chapeau bas, et moustache aussi. Inscris-toi à la vraie session, tu es prêt(e)." : overall >= 180 ? "Niveau C1 solide. Encore un effort sur tes points faibles et le C2 est à toi." : "La montagne est haute, mais tu grimpes. Reprends les épreuves une par une."),
      badges.length ? h("div", { class: "new-badges" }, badges.map((b) => h("div", { class: "badge-pop" }, h("span", { html: icon("trophy") }), h("strong", null, b.name), h("small", null, b.desc)))) : null,
      h("div", { class: "result-actions" }, h("button", { type: "button", class: "btn btn-primary btn-xl", onClick: () => go("c2") }, "Retour à la prépa C2")),
    ),
  );
  await sleep(200);
  if (overall >= 200) {
    sfx.win();
    confetti({ count: 160 });
  }
}
