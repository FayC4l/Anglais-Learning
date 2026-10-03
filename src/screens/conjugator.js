// Reference conjugator: any verb, every tense, affirmative / negative / question / passive, with audio,
// and a quick drill on the chosen verb.
import { h, icon, toast, shuffle } from "../ui.js";
import { VERBS, verb, TENSES, conjugate, contract, forms } from "../engine/verbs.js";
import { go } from "../router.js";
import { speak } from "../audio.js";
import { runQuiz, scoreOf } from "../runner.js";
import { save, addXp, touchStreak } from "../store.js";
import { mooseSays, quip } from "../humor.js";

const PERSONS = [
  ["I", "I"], ["you", "you"], ["he", "he / she / it"], ["we", "we"], ["they", "they"],
];
const MODES = [
  ["aff", "Affirmatif"], ["neg", "Négatif"], ["q", "Question"], ["pass", "Passif"],
];

export function conjugatorScreen(view, { v = "go" } = {}) {
  let current = verb(v) ? v : "go";
  let mode = "aff";
  const input = h("input", { class: "field", id: "verb-search", list: "verb-list", placeholder: "Tape un verbe (go, eat, stop…)", autocomplete: "off", "aria-label": "Verbe", value: current });
  const list = h("datalist", { id: "verb-list" }, VERBS.map((x) => h("option", { value: x.base }, x.fr)));
  const head = h("div", { class: "conj-head" });
  const table = h("div", { class: "conj-tables" });
  const modes = h(
    "div",
    { class: "conj-modes", role: "tablist" },
    MODES.map(([id, label]) => {
      const b = h("button", { type: "button", role: "tab", class: `chip ${id === mode ? "on" : ""}`, "aria-selected": String(id === mode) }, label);
      b.addEventListener("click", () => {
        mode = id;
        modes.querySelectorAll(".chip").forEach((c) => {
          c.classList.toggle("on", c === b);
          c.setAttribute("aria-selected", String(c === b));
        });
        render();
      });
      return b;
    }),
  );

  const cell = (text) => {
    const b = h("button", { type: "button", class: "conj-cell" }, text);
    b.addEventListener("click", () => speak(text));
    return b;
  };

  function render() {
    const x = verb(current);
    const f = forms(current);
    head.replaceChildren(
      h("h2", { class: "conj-verb" }, `to ${x.base}`, h("button", { type: "button", class: "icon-btn", "aria-label": `Écouter ${x.base}`, html: icon("speaker"), onClick: () => speak(`${x.base}, ${x.past}, ${x.pp}`) })),
      h("p", { class: "conj-fr" }, x.fr, x.irregular ? h("span", { class: "tag" }, "irrégulier") : h("span", { class: "tag ok" }, "régulier")),
      h("div", { class: "conj-forms" }, [["Base", f.base], ["Prétérit", [x.past, ...x.pastAlt].join(" / ")], ["Participe passé", [x.pp, ...x.ppAlt].join(" / ")], ["-ing", f.ing], ["3e pers.", f.s]].map(([k, val]) => h("div", null, h("small", null, k), h("strong", null, val)))),
    );
    const transitiveOk = mode !== "pass" || !["be", "go", "come", "arrive", "sleep", "fall", "rise", "lie", "die", "happen", "travel", "jog", "smile", "laugh", "cry", "relax", "stay", "wait", "snow", "rain", "kneel", "flee", "arise", "complain", "worry", "chat", "dance", "swim", "run", "sit", "stand", "work", "live", "agree", "listen", "talk", "walk", "look", "climb"].includes(x.base);
    if (!transitiveOk) {
      table.replaceChildren(h("p", { class: "set-help" }, `« ${x.base} » ne s'emploie pas au passif (il n'a pas de complément d'objet direct).`));
      return;
    }
    const tenses = TENSES.filter((t) => !(mode === "pass" && ["present_perfect_continuous", "past_perfect_continuous", "future_continuous"].includes(t.id)));
    table.replaceChildren(
      ...tenses.map((t) => {
        const rows = PERSONS.map(([s, label]) => {
          let txt;
          if (mode === "aff") txt = `${s} ${conjugate(x.base, t.id, s)}`;
          else if (mode === "neg") txt = `${s} ${s === "I" && /^am not/.test(conjugate(x.base, t.id, s, { neg: true })) ? conjugate(x.base, t.id, s, { neg: true }) : contract(conjugate(x.base, t.id, s, { neg: true }))}`;
          else if (mode === "q") txt = `${conjugate(x.base, t.id, s, { question: true })}?`;
          else txt = `${s === "I" ? "I" : s === "he" ? "it" : s} ${conjugate(x.base, t.id, s === "he" ? "it" : s, { passive: true })}`;
          txt = txt.charAt(0).toUpperCase() + txt.slice(1);
          return h("tr", null, h("th", { scope: "row" }, label), h("td", null, cell(txt)));
        });
        return h("section", { class: "conj-table" }, h("h3", null, t.fr, h("small", null, ` · niveau ${t.level}`)), h("table", null, h("tbody", null, rows)));
      }),
    );
  }

  const pick = () => {
    const val = input.value.trim().toLowerCase().replace(/^to\s+/, "");
    if (verb(val)) {
      current = val;
      render();
    } else if (val) toast(`« ${val} » n'est pas encore dans le conjugueur (${VERBS.length} verbes).`);
  };
  input.addEventListener("change", pick);
  input.addEventListener("keydown", (e) => e.key === "Enter" && pick());

  view.append(
    h(
      "div",
      { class: "conjugator" },
      h("div", { class: "topbar" }, h("button", { type: "button", class: "icon-btn", "aria-label": "Retour", html: icon("back"), onClick: () => go("map") }), h("span", { class: "topbar-title" }, "Conjugueur")),
      h("h1", { class: "page-title" }, "Le conjugueur"),
      h("p", { class: "page-lead" }, `${VERBS.length} verbes, dont tous les irréguliers courants. Touche une forme pour l'entendre.`),
      h("div", { class: "row conj-search" }, input, list, h("button", { type: "button", class: "btn btn-small", onClick: pick }, "Conjuguer"), h("button", { type: "button", class: "btn btn-small btn-ghost", onClick: () => {
        current = VERBS[Math.floor(Math.random() * VERBS.length)].base;
        input.value = current;
        render();
      } }, "Au hasard")),
      head,
      h("button", { type: "button", class: "btn btn-primary", onClick: () => drill(view, current) }, h("span", { html: icon("gauntlet") }), "M'entraîner sur ce verbe (10 questions)"),
      modes,
      table,
    ),
  );
  render();
  return undefined;
}

/** 10 fill-in questions on one verb, in random tenses and persons. */
function drill(view, base) {
  const x = verb(base);
  const subjects = [["I", "I"], ["you", "You"], ["he", "He"], ["she", "She"], ["we", "We"], ["they", "They"]];
  const pickT = shuffle(TENSES).slice(0, 10);
  const questions = pickT.map((t, i) => {
    const [s, S] = subjects[i % subjects.length];
    const neg = i % 4 === 3;
    const full = conjugate(base, t.id, s, { neg });
    const ans = s === "I" && /^am not/.test(full) ? full : contract(full);
    return {
      kind: "fill",
      ref: null,
      skill: "conjugaison",
      unitId: "0.0",
      level: 0,
      q: `${S} ___.`,
      hint: `${neg ? "not / " : ""}${base} — ${t.fr}`,
      accept: [ans],
      expected: ans,
      explain: `${t.fr} : ${S} ${ans}.`,
      time: 40,
    };
  });
  const quiz = runQuiz(view, questions, {
    title: `Drill : to ${x.base}`,
    accent: "var(--l4)",
    onDone: (results, { quit }) => {
      if (quit) return go("conjugator", { v: base });
      const good = results.filter((r) => r.ok).length;
      addXp(good * 2);
      touchStreak();
      save();
      view.replaceChildren(
        h(
          "div",
          { class: "results" },
          h("h1", { class: "results-title" }, `${good} / ${results.length}`),
          mooseSays(quip(scoreOf(results) >= 0.8 ? "perfect" : "fail")),
          h("div", { class: "result-actions" }, h("button", { type: "button", class: "btn btn-primary btn-xl", onClick: () => drill(view, base) }, "Encore"), h("button", { type: "button", class: "btn btn-ghost", onClick: () => go("conjugator", { v: base }) }, "Retour au conjugueur")),
        ),
      );
    },
  });
  return () => quiz.stop();
}

