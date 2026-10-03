// Question kinds: generation from content items, rendering, answer checking, and test assembly.
import { h, esc, icon, shuffle, sample, pick, plain, $ } from "./ui.js";
import { matches, tiles, tileKey, diffWords, clean } from "./answer.js";
import { gapWords, joinBoxes } from "./fill.js";
import { regen } from "./engine/generators.js";
import { resolveRef, unitById, levelById, levelVocab, vocabRefs, sentenceRefs, grammarRefs, readingRefs } from "./content.js";
import { speak, stopSpeaking, ttsReady, sfx } from "./audio.js";
import { diff } from "./store.js";

// Base time in seconds for each kind (multiplied by the difficulty's time factor).
const BASE_TIME = { type_en: 25, choose_fr: 15, listen_type: 30, listen_choose: 18, build: 45, dictation: 55, mcq: 25, fill: 35, error: 40, reading: 100, listening: 120 };
// Rough difficulty weight, used to ramp tests from recognition to production.
const WEIGHT = { choose_fr: 1, listen_choose: 2, mcq: 2, type_en: 3, build: 3, fill: 3, reading: 3, listen_type: 4, error: 4, dictation: 5, listening: 5 };
export const AUDIO_KINDS = new Set(["listen_type", "listen_choose", "dictation", "listening"]);

export const KIND_LABEL = {
  type_en: "Traduction",
  choose_fr: "Sens",
  listen_type: "Écoute",
  listen_choose: "Écoute",
  build: "Construction",
  dictation: "Dictée",
  mcq: "Grammaire",
  fill: "Grammaire",
  error: "Chasse à l'erreur",
  reading: "Lecture",
  listening: "Compréhension orale",
};

function timeFor(kind, extra = 0) {
  return Math.round((BASE_TIME[kind] + extra) * diff().time);
}

/** Skill measured by each kind (for the dashboard). Generators may override it (e.g. "conjugaison"). */
export const KIND_SKILL = { type_en: "vocabulaire", choose_fr: "vocabulaire", listen_type: "ecoute", listen_choose: "ecoute", build: "grammaire", dictation: "ecoute", mcq: "grammaire", fill: "grammaire", error: "grammaire", reading: "lecture", listening: "ecoute" };

/** Which kinds can be made from a reference. */
export function kindsForRef(ref) {
  if (String(ref).startsWith("gen:")) {
    const q = regen(ref);
    return q ? [q.kind] : [];
  }
  const r = resolveRef(ref);
  if (!r) return [];
  if (r.kind) return [r.kind];
  if (r.type === "vocab") return ["type_en", "choose_fr", "listen_type", "listen_choose"];
  if (r.type === "sentence") return ["build", "dictation"];
  if (r.type === "grammar") return [r.item.type];
  if (r.type === "reading") return ["reading", "listening"];
  return [];
}

/** Builds a question object of the given kind from a content reference. */
export function makeQuestion(kind, ref) {
  if (String(ref).startsWith("gen:")) {
    const g = regen(ref);
    return g ? { ...g, time: timeFor(g.kind, g.extraTime || 0) } : null;
  }
  const r = resolveRef(ref);
  if (!r) return null;
  const { item, unit } = r;
  const L = Number(unit.id.split(".")[0]);
  const base = { kind, ref, unitId: unit.id, level: L, skill: KIND_SKILL[kind], explain: plain(item.explain || "") };
  switch (kind) {
    case "type_en":
      return { ...base, accept: [item.en, ...(item.alt || [])], expected: item.en, time: timeFor(kind, item.en.length > 12 ? 8 : 0), fr: item.fr, say: item.en };
    case "listen_type":
      return { ...base, accept: [item.en], expected: item.en, time: timeFor(kind), say: item.en, fr: item.fr };
    case "choose_fr": {
      const pool = distractorPool(L, unit, item, "fr");
      const choices = shuffle([item.fr, ...sample(pool, 3)]);
      return { ...base, choices, answer: choices.indexOf(item.fr), expected: item.fr, time: timeFor(kind), en: item.en, say: item.en };
    }
    case "listen_choose": {
      const pool = distractorPool(L, unit, item, "en");
      const close = pool.slice().sort((a, b) => similarity(b, item.en) - similarity(a, item.en));
      const choices = shuffle([item.en, ...close.slice(0, 3)]);
      return { ...base, choices, answer: choices.indexOf(item.en), expected: item.en, time: timeFor(kind), say: item.en, fr: item.fr };
    }
    case "build": {
      const words = tiles(item.en);
      const decoys = (item.trap || []).filter((t) => !words.some((w) => clean(w) === clean(t)));
      const accepted = [item.en, ...(item.alt || [])].map((s) => tileKey(tiles(s)));
      return { ...base, fr: item.fr, words, bank: shuffle([...words, ...decoys]), accepted, expected: item.en, time: timeFor(kind, Math.max(0, words.length - 6) * 4), say: item.en };
    }
    case "dictation": {
      const n = tiles(item.en).length;
      return { ...base, accept: [item.en], expected: item.en, say: item.en, fr: item.fr, time: timeFor(kind, Math.max(0, n - 8) * 5) };
    }
    case "mcq": {
      const order = shuffle(item.choices.map((_, i) => i));
      return { ...base, q: item.q, choices: order.map((i) => item.choices[i]), answer: order.indexOf(item.answer), expected: item.choices[item.answer], time: timeFor(kind, item.q.length > 90 ? 10 : 0) };
    }
    case "fill": {
      const n = gapWords(item.answer[0]).length;
      return { ...base, q: item.q, hint: item.hint, lead: item.lead, key: item.key, accept: item.answer, expected: item.answer[0], time: timeFor(kind, (n - 1) * 6 + (item.lead ? 15 : 0)) };
    }
    case "error": {
      const tokens = item.q.split(" ");
      return { ...base, tokens, wrong: item.wrong, accept: item.fix, expected: `${tokens[item.wrong].replace(/[.,!?;:]+$/, "")} → ${item.fix[0]}`, time: timeFor(kind) };
    }
    case "reading":
    case "listening": {
      const rd = r.reading;
      const order = shuffle(item.choices.map((_, i) => i));
      const words = rd.text.split(/\s+/).length;
      return { ...base, title: rd.title, text: rd.text, q: item.q, choices: order.map((i) => item.choices[i]), answer: order.indexOf(item.answer), expected: item.choices[item.answer], time: timeFor(kind, Math.round(words / 4)), say: kind === "listening" ? rd.text : null };
    }
    default:
      return null;
  }
}

function similarity(a, b) {
  a = a.toLowerCase();
  b = b.toLowerCase();
  let s = 0;
  if (a[0] === b[0]) s += 2;
  if (a.slice(0, 3) === b.slice(0, 3)) s += 2;
  s -= Math.abs(a.length - b.length) * 0.3;
  if (a.slice(-2) === b.slice(-2)) s += 1;
  return s + Math.random() * 1.5;
}

function distractorPool(L, unit, item, field) {
  const fromUnit = unit.vocab.filter((v) => v !== item).map((v) => v[field]);
  if (fromUnit.length >= 6) return [...new Set(fromUnit)].filter((x) => clean(x) !== clean(item[field]));
  const fromLevel = levelVocab(L).filter((v) => v !== item).map((v) => v[field]);
  return [...new Set([...fromUnit, ...fromLevel])].filter((x) => clean(x) !== clean(item[field]));
}

// ---------- Test assembly ----------

const PLAN = {
  low: { type_en: 3, choose_fr: 1, listen_choose: 1, listen_type: 1, build: 3, dictation: 1, mcq: 2, fill: 2, error: 1 },
  a2: { type_en: 2, listen_choose: 1, listen_type: 1, build: 3, dictation: 1, mcq: 2, fill: 3, error: 2 },
  b1: { type_en: 2, listen_type: 1, build: 2, dictation: 2, mcq: 2, fill: 3, error: 2, reading: 1 },
  c1: { type_en: 2, build: 2, dictation: 2, mcq: 2, fill: 3, error: 2, reading: 1, listening: 1 },
};
const planFor = (L) => (L <= 2 ? PLAN.low : L <= 4 ? PLAN.a2 : L <= 8 ? PLAN.b1 : PLAN.c1);

/** Swaps audio kinds for silent ones when the device cannot speak. */
function silentKind(kind) {
  if (ttsReady()) return kind;
  return { listen_type: "type_en", listen_choose: "choose_fr", dictation: "build", listening: "reading" }[kind] || kind;
}

function refsFor(unit, kind) {
  if (["type_en", "choose_fr", "listen_type", "listen_choose"].includes(kind)) return vocabRefs(unit);
  if (["build", "dictation"].includes(kind)) return sentenceRefs(unit);
  if (["mcq", "fill", "error"].includes(kind)) return grammarRefs(unit, kind);
  if (["reading", "listening"].includes(kind)) return readingRefs(unit);
  return [];
}

/**
 * Picks `plan` questions from the given units without reusing an item.
 * Returns question objects ordered from easier to harder kinds, with some shuffle.
 */
export function assemble(units, plan, used = new Set()) {
  const out = [];
  const entries = Object.entries(plan);
  for (const [k, n] of entries) {
    for (let i = 0; i < n; i++) {
      let kind = silentKind(k);
      // Spread picks over the units in round-robin to cover everything studied.
      const order = shuffle(units);
      let made = null;
      for (const unit of order) {
        let pool = refsFor(unit, kind).filter((r) => !used.has(r));
        if (!pool.length && (kind === "reading" || kind === "listening")) continue;
        if (!pool.length) continue;
        const ref = pick(pool);
        made = makeQuestion(kind, ref);
        if (made) {
          used.add(ref);
          break;
        }
      }
      if (!made && (kind === "reading" || kind === "listening")) {
        // No reading available: replace with a grammar fill.
        for (const unit of order) {
          const pool = refsFor(unit, "fill").filter((r) => !used.has(r));
          if (pool.length) {
            const ref = pick(pool);
            made = makeQuestion("fill", ref);
            used.add(ref);
            break;
          }
        }
      }
      if (made) out.push(made);
    }
  }
  return out.sort((a, b) => WEIGHT[a.kind] + Math.random() * 2.2 - (WEIGHT[b.kind] + Math.random() * 2.2));
}

/** The 15-question test of one unit. */
export function unitTest(uid) {
  const unit = unitById(uid);
  const L = Number(uid.split(".")[0]);
  return assemble([unit], planFor(L));
}

/** The boss exam: questions from the 4 units, plus review from earlier levels. */
export function bossExam(L) {
  const lvl = levelById(L);
  const used = new Set();
  const p = planFor(L);
  const scale = (plan, f) => Object.fromEntries(Object.entries(plan).map(([k, n]) => [k, Math.max(0, Math.round(n * f))]));
  const main = assemble(lvl.units, scale(p, 20 / 15), used);
  let review = [];
  if (L > 1) {
    const prevUnits = [];
    for (let k = Math.max(1, L - 2); k < L; k++) prevUnits.push(...(levelById(k)?.units || []));
    review = assemble(prevUnits, { type_en: 1, build: 1, fill: 1, error: 1, mcq: 1 }, used);
  } else {
    review = assemble(lvl.units, { type_en: 2, fill: 1, build: 1, error: 1 }, used);
  }
  return [...main, ...review].sort((a, b) => WEIGHT[a.kind] + Math.random() * 3 - (WEIGHT[b.kind] + Math.random() * 3));
}

/** A question for a reference, choosing a kind suited to reviewing it. */
export function reviewQuestion(ref) {
  const kinds = kindsForRef(ref).map(silentKind);
  const prefer = kinds.filter((k) => !["choose_fr", "listen_choose"].includes(k));
  return makeQuestion(pick(prefer.length ? prefer : kinds), ref);
}

// ---------- Rendering ----------

/**
 * Renders a question into `mount`. Calls `onAnswer({ok, given})` exactly once.
 * Returns { destroy(), replay() }.
 */
export function renderQuestion(q, mount, { onAnswer, replays = diff().replays, autoplay = true }) {
  let answered = false;
  let replaysLeft = replays;
  const cleanups = [];
  const finish = (ok, given) => {
    if (answered) return;
    answered = true;
    stopSpeaking();
    mount.classList.add("answered");
    onAnswer({ ok, given });
  };

  const audioBtn = (text, { slow = true } = {}) => {
    const counter = h("span", { class: "replay-count" });
    const updateCount = () => (counter.textContent = AUDIO_KINDS.has(q.kind) ? `${replaysLeft} réécoute${replaysLeft > 1 ? "s" : ""}` : "");
    let first = true;
    const play = async (rate = 1) => {
      if (answered) return;
      if (!first && AUDIO_KINDS.has(q.kind)) {
        if (replaysLeft <= 0) return;
        replaysLeft--;
        updateCount();
      }
      first = false;
      big.classList.add("playing");
      await speak(text, { rate });
      big.classList.remove("playing");
    };
    const big = h("button", { type: "button", class: "audio-big", "aria-label": "Écouter", onClick: () => play(1) }, h("span", { class: "audio-rings" }), h("span", { html: icon("speaker") }));
    const slowBtn = slow ? h("button", { type: "button", class: "audio-slow", "aria-label": "Écouter lentement", onClick: () => play(0.6), html: icon("turtle") }) : null;
    updateCount();
    if (autoplay) setTimeout(() => play(1), 350);
    return { el: h("div", { class: "audio-row" }, big, slowBtn, counter), play };
  };

  const head = (label, title) => h("div", { class: "q-head" }, h("span", { class: "q-kind" }, label), title ? h("h2", { class: "q-title" }, title) : null);
  const choiceList = (choices, onPick, { en = false } = {}) => {
    const list = h("div", { class: `choices ${choices.some((c) => c.length > 28) ? "long" : ""}` });
    choices.forEach((c, i) => {
      const b = h("button", { type: "button", class: `choice ${en ? "en" : ""}`, "data-i": i, onClick: () => onPick(i, b) }, h("span", { class: "choice-key" }, String(i + 1)), h("span", { class: "choice-text" }, c));
      list.append(b);
    });
    const onKey = (e) => {
      if (answered || e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
      const n = Number(e.key);
      if (n >= 1 && n <= choices.length) list.children[n - 1].click();
    };
    document.addEventListener("keydown", onKey);
    cleanups.push(() => document.removeEventListener("keydown", onKey));
    return list;
  };
  const markChoices = (list, picked) => {
    [...list.children].forEach((b, i) => {
      b.disabled = true;
      if (i === q.answer) b.classList.add("right");
      else if (i === picked) b.classList.add("wrong");
    });
  };
  const textInput = (placeholder, { multiline = false } = {}) => {
    const input = h(multiline ? "textarea" : "input", { class: "answer-input", type: "text", rows: multiline ? 2 : null, placeholder, autocomplete: "off", autocapitalize: "off", autocorrect: "off", spellcheck: "false", enterkeyhint: "done", "aria-label": placeholder, id: "answer-input" });
    input.addEventListener("input", () => sfx.type());
    return input;
  };
  const submitRow = (input, check) => {
    const btn = h("button", { type: "button", class: "btn btn-primary btn-validate" }, "Valider");
    const go = () => {
      if (answered) return;
      if (!input.value.trim()) {
        input.classList.add("nudge");
        setTimeout(() => input.classList.remove("nudge"), 400);
        input.focus();
        return;
      }
      check(input.value);
    };
    btn.addEventListener("click", go);
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        go();
      }
    });
    return btn;
  };

  let audio = null;
  const card = h("div", { class: `q-card kind-${q.kind}` });

  switch (q.kind) {
    case "type_en": {
      const input = textInput("Écris en anglais…");
      card.append(head("Écris en anglais", null), h("div", { class: "q-prompt fr" }, q.fr), input, submitRow(input, (v) => finish(matches(v, q.accept), v)));
      setTimeout(() => input.focus(), 60);
      break;
    }
    case "listen_type": {
      audio = audioBtn(q.say);
      const input = textInput("Écris ce que tu entends…");
      card.append(head("Écoute et écris le mot"), audio.el, h("div", { class: "q-hint" }, "Sens : ", h("strong", null, q.fr)), input, submitRow(input, (v) => finish(matches(v, q.accept), v)));
      setTimeout(() => input.focus(), 60);
      break;
    }
    case "choose_fr": {
      audio = audioBtn(q.say, { slow: false });
      const list = choiceList(q.choices, (i) => {
        markChoices(list, i);
        finish(i === q.answer, q.choices[i]);
      });
      card.append(head("Que veut dire…"), h("div", { class: "q-prompt en" }, q.en, audio.el), list);
      break;
    }
    case "listen_choose": {
      audio = audioBtn(q.say);
      const list = choiceList(
        q.choices,
        (i) => {
          markChoices(list, i);
          finish(i === q.answer, q.choices[i]);
        },
        { en: true },
      );
      card.append(head("Écoute et choisis le bon mot"), audio.el, list);
      break;
    }
    case "build": {
      const line = h("div", { class: "build-line", "aria-label": "Ta phrase" });
      const bank = h("div", { class: "build-bank" });
      const placed = [];
      const render = () => {
        line.classList.toggle("empty", placed.length === 0);
      };
      q.bank.forEach((w, i) => {
        const t = h("button", { type: "button", class: "tile", "data-i": i }, w);
        t.addEventListener("click", () => {
          if (answered) return;
          sfx.tap();
          const first = t.getBoundingClientRect();
          if (t.parentElement === bank) {
            const ph = h("span", { class: "tile-ph", style: { width: `${first.width}px` } });
            t.replaceWith(ph);
            t._ph = ph;
            line.append(t);
            placed.push(t);
          } else {
            t._ph.replaceWith(t);
            placed.splice(placed.indexOf(t), 1);
          }
          const last = t.getBoundingClientRect();
          t.animate([{ transform: `translate(${first.left - last.left}px, ${first.top - last.top}px)` }, { transform: "none" }], { duration: 220, easing: "cubic-bezier(.2,.8,.2,1.2)" });
          render();
        });
        bank.append(t);
      });
      const btn = h("button", { type: "button", class: "btn btn-primary btn-validate" }, "Valider");
      btn.addEventListener("click", () => {
        if (answered) return;
        if (!placed.length) {
          line.classList.add("nudge");
          setTimeout(() => line.classList.remove("nudge"), 400);
          return;
        }
        const words = [...line.children].map((t) => t.textContent);
        finish(q.accepted.includes(tileKey(words)), words.join(" "));
      });
      const onKey = (e) => {
        if (e.key === "Enter" && !answered) btn.click();
        if (e.key === "Backspace" && !answered && placed.length) placed[placed.length - 1].click();
      };
      document.addEventListener("keydown", onKey);
      cleanups.push(() => document.removeEventListener("keydown", onKey));
      render();
      card.append(head("Traduis en construisant la phrase"), h("div", { class: "q-prompt fr sm" }, q.fr), line, bank, btn);
      break;
    }
    case "dictation": {
      audio = audioBtn(q.say);
      const input = textInput("Écris toute la phrase…", { multiline: true });
      card.append(head("Dictée : écris la phrase entière"), audio.el, input, submitRow(input, (v) => finish(matches(v, q.accept), v)));
      setTimeout(() => input.focus(), 60);
      break;
    }
    case "mcq": {
      const list = choiceList(q.choices, (i) => {
        markChoices(list, i);
        finish(i === q.answer, q.choices[i]);
      });
      card.append(head("Choisis la bonne réponse"), h("div", { class: "q-prompt sentence", html: blankHtml(q.q) }), list);
      break;
    }
    case "fill": {
      const [before, after] = q.q.split("___");
      const words = gapWords(q.expected);
      const n = Math.max(1, words.length);
      // One box per expected word: the learner sees how many words the gap needs.
      const boxes = words.map((w, i) =>
        h("input", { class: "gap-box", type: "text", autocomplete: "off", autocapitalize: "off", autocorrect: "off", spellcheck: "false", enterkeyhint: i === n - 1 ? "done" : "next", "aria-label": n > 1 ? `Mot ${i + 1} sur ${n}` : "Mot manquant", id: i === 0 ? "answer-input" : null, size: Math.max(4, Math.min(14, w.length + 1)) }),
      );
      const value = () => joinBoxes(boxes.map((b) => b.value));
      boxes.forEach((b, i) => {
        b.addEventListener("input", () => {
          sfx.type();
          // A space typed at the end of a box jumps to the next box.
          if (/\s$/.test(b.value) && i < n - 1) {
            b.value = b.value.trimEnd();
            boxes[i + 1].focus();
          }
          b.size = Math.max(4, Math.min(24, b.value.length + 1));
        });
        b.addEventListener("keydown", (e) => {
          if (e.key === "Backspace" && !b.value && i > 0) {
            e.preventDefault();
            boxes[i - 1].focus();
          }
        });
      });
      const gap = h("span", { class: `gap-group n${n}` }, boxes);
      const sentence = h("div", { class: "q-prompt sentence" }, before, gap, after);
      const proxy = { get value() { return value(); }, focus: () => (boxes.find((b) => !b.value) || boxes[0]).focus(), classList: gap.classList, addEventListener: (type, fn) => boxes.forEach((b) => b.addEventListener(type, fn)) };
      card.append(
        head(q.key ? "Transforme la phrase" : "Complète la phrase"),
        q.lead ? h("div", { class: "q-lead" }, q.lead) : null,
        q.key ? h("div", { class: "q-key" }, "Mot imposé : ", h("strong", null, q.key)) : null,
        sentence,
        h("div", { class: "q-hint" }, h("span", { class: "gap-count" }, `${n} mot${n > 1 ? "s" : ""}`), q.hint ? [" · Indice : ", h("strong", null, q.hint)] : null),
        submitRow(proxy, (v) => finish(matches(v, q.accept), v)),
      );
      setTimeout(() => boxes[0].focus(), 60);
      break;
    }
    case "error": {
      const words = h("div", { class: "error-words" });
      const fixZone = h("div", { class: "error-fix", hidden: true });
      q.tokens.forEach((t, i) => {
        const b = h("button", { type: "button", class: "word-chip" }, t);
        b.addEventListener("click", () => {
          if (answered || !fixZone.hidden) return;
          if (i !== q.wrong) {
            b.classList.add("wrong");
            words.children[q.wrong].classList.add("right");
            finish(false, `« ${t} »`);
            return;
          }
          sfx.tap();
          b.classList.add("picked");
          fixZone.hidden = false;
          const input = textInput("Écris la correction…");
          fixZone.append(h("label", { class: "fix-label", for: "answer-input" }, "Bien vu ! Corrige ce mot :"), input, submitRow(input, (v) => finish(matches(v, q.accept), v)));
          setTimeout(() => input.focus(), 60);
        });
        words.append(b);
      });
      card.append(head("Touche le mot faux, puis corrige-le"), words, fixZone);
      break;
    }
    case "reading": {
      const passage = h("div", { class: "passage" }, h("div", { class: "passage-title" }, q.title), ...q.text.split(/\n\n+/).map((p) => h("p", null, p)));
      const list = choiceList(q.choices, (i) => {
        markChoices(list, i);
        finish(i === q.answer, q.choices[i]);
      });
      card.append(head("Lis le texte et réponds"), passage, h("div", { class: "q-prompt sentence sm" }, q.q), list);
      break;
    }
    case "listening": {
      audio = audioBtn(q.say);
      const list = choiceList(q.choices, (i) => {
        markChoices(list, i);
        finish(i === q.answer, q.choices[i]);
      });
      card.append(head("Écoute le texte (sans le lire !) et réponds"), audio.el, h("div", { class: "q-prompt sentence sm" }, q.q), list);
      break;
    }
  }

  mount.replaceChildren(card);
  mount.classList.remove("answered");
  return {
    destroy() {
      cleanups.forEach((f) => f());
      stopSpeaking();
    },
    timeout() {
      finish(false, "");
    },
    get answered() {
      return answered;
    },
  };
}

/** Sentence with ___ rendered as a visible gap (one mark per expected word). */
export function blankHtml(text, n = 1) {
  return esc(text).replace(/___/g, Array.from({ length: Math.max(1, n) }, () => '<span class="gap"></span>').join(" "));
}

/** Feedback details for a wrong answer: expected answer, diff for dictation, explanation. */
export function feedbackDetails(q, given) {
  const parts = [];
  if (q.kind === "dictation" && given) {
    const d = diffWords(given, q.expected);
    parts.push(h("div", { class: "fb-diff" }, d.map((x) => h("span", { class: x.ok ? "ok" : "ko" }, x.w)), " "));
  } else {
    parts.push(h("div", { class: "fb-expected" }, h("span", { class: "fb-label" }, "Bonne réponse"), h("span", { class: "fb-answer" }, q.kind === "error" ? q.expected : q.expected)));
  }
  if (given && q.kind !== "dictation") parts.push(h("div", { class: "fb-given" }, h("span", { class: "fb-label" }, "Ta réponse"), h("span", null, given)));
  if (q.explain) parts.push(h("p", { class: "fb-explain" }, q.explain));
  return parts;
}

export { $ };
