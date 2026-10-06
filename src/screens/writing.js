// Writing workshop: pick a prompt, write, get an annotated correction and a mark out of 20.
import { h, icon, esc, rich, toast, countUp } from "../ui.js";
import { EXTRA } from "../content.js";
import { state, save, addXp, touchStreak, checkBadges } from "../store.js";
import { family } from "../profiles.js";
import { go } from "../router.js";
import { speak, sfx } from "../audio.js";
import { confetti } from "../fx.js";
import { analyze } from "../writing/analyze.js";
import { score, CRITERIA_FR, CAT_FR } from "../writing/score.js";
import { dictionaryReady } from "../writing/spell.js";
import { quip, mentorSays } from "../humor.js";
import { currentLevel } from "./daily.js";
import { floorSpec, copiedShare, surprise } from "../tower.js";
import { recordTowerFloor, tower } from "../store.js";
import { drama } from "./tower.js";

const RANGE = (L) => (L <= 2 ? [25, 60] : L <= 4 ? [50, 100] : L <= 6 ? [80, 140] : L <= 8 ? [120, 180] : L <= 10 ? [160, 240] : [220, 320]);
const CEFR_OF = (L) => (L <= 2 ? "A1" : L <= 4 ? "A2" : L <= 6 ? "B1" : L <= 9 ? "B2" : L <= 11 ? "C1" : "C2");
const TYPE_FR = { description: "Description", email: "E-mail", letter: "Lettre", story: "Histoire", message: "Message", essay: "Essai", article: "Article", review: "Critique", report: "Rapport", proposal: "Proposition" };
const countWords = (t) => (String(t).match(/[A-Za-zÀ-ÿ'’-]+/g) || []).length;

/** Every prompt: course prompts (writing.json) and C2 exam tasks (c2-papers.json). */
export function allPrompts() {
  const course = (EXTRA.writing?.prompts || []).map((p) => ({ ...p, cefr: CEFR_OF(p.level) }));
  const c2 = (EXTRA.c2papers?.writing || []).map((p) => ({ ...p, level: 12, cefr: "C2", c2: true }));
  return [...course, ...c2];
}
const promptById = (id) => allPrompts().find((p) => p.id === id) || null;
const freePrompt = (L, type = "essay") => ({ id: `free-${L}`, level: L, cefr: CEFR_OF(L), type, title: "Sujet libre", prompt: "Écris sur le sujet de ton choix, en utilisant ce que tu as appris.", words: RANGE(L), require: [] });

export function writingScreen(view, { promptId, level, tower: tw } = {}) {
  if (promptId) return editor(view, promptById(promptId) || freePrompt(currentLevel()), state.writingDraft?.[promptId] || "", tw);
  return list(view, Number(level) || currentLevel());
}

// ---------- Prompt list ----------

function list(view, L) {
  const age = state.player.age;
  const prompts = allPrompts().filter((p) => !p.c2 && p.level === L && (!p.ages || p.ages.includes(age)));
  const done = new Map(state.writing.map((w) => [w.promptId, w]));
  const levelSel = h("select", { class: "field", id: "w-level", "aria-label": "Niveau" }, Array.from({ length: 12 }, (_, i) => h("option", { value: i + 1, selected: i + 1 === L }, `Ligne ${i + 1} (${CEFR_OF(i + 1)})`)));
  levelSel.addEventListener("change", () => go("writing", { level: levelSel.value }));
  const card = (p) =>
    h(
      "button",
      { type: "button", class: "w-card", onClick: () => go("writing", { promptId: p.id }) },
      h("span", { class: "tag" }, TYPE_FR[p.type] || p.type),
      h("strong", null, p.title),
      h("small", null, `${p.words[0]}–${p.words[1]} mots`),
      done.get(p.id) ? h("span", { class: "w-best" }, `Meilleure note : ${bestOf(p.id)}/20`) : null,
    );
  const history = state.writing.slice(-10).reverse();
  view.append(
    h(
      "div",
      { class: "writing" },
      h("div", { class: "topbar" }, h("button", { type: "button", class: "icon-btn", "aria-label": "Retour", html: icon("back"), onClick: () => go("map") }), h("span", { class: "topbar-title" }, "Atelier d'écriture")),
      h("h1", { class: "page-title" }, "Atelier d'écriture"),
      h("p", { class: "page-lead" }, "Choisis un sujet, écris en anglais, puis fais corriger : chaque faute est soulignée et expliquée, et ton texte reçoit une note sur 20 (contenu, efficacité, organisation, langue)."),
      family.aiKey ? h("p", { class: "set-help" }, "Correction IA activée : tu pourras aussi demander l'avis de Claude.") : null,
      h("div", { class: "row" }, h("label", { class: "field-label", for: "w-level" }, "Niveau des sujets"), levelSel),
      h("div", { class: "w-grid" }, prompts.map(card), h("button", { type: "button", class: "w-card free", onClick: () => editor(view, freePrompt(L), "") }, h("span", { class: "tag" }, "Libre"), h("strong", null, "Sujet libre"), h("small", null, `${RANGE(L)[0]}–${RANGE(L)[1]} mots`))),
      history.length ? h("h2", { class: "section-title" }, "Mes dernières rédactions") : null,
      history.length ? h("ul", { class: "history" }, history.map((w) => h("li", null, h("strong", null, `${w.score}/20`), ` · ${w.title} · `, h("small", null, new Date(w.at).toLocaleDateString("fr-CA"))))) : null,
    ),
  );
  return undefined;
}

const back = (p) => (p.c2 ? go("c2", { tab: "writing" }) : go("writing", { level: p.level }));
const bestOf = (pid) => Math.max(...state.writing.filter((w) => w.promptId === pid).map((w) => w.score));

// ---------- Editor ----------

/** `tw` = number of the Tower floor when this essay is a writing boss of level 12. */
function editor(view, p, initial, tw) {
  const area = h("textarea", { class: "field w-area", id: "w-text", rows: 12, spellcheck: "false", autocapitalize: "sentences", placeholder: "Write your text here…", "aria-label": "Ton texte en anglais" });
  area.value = initial;
  const counter = h("span", { class: "w-count" });
  const update = () => {
    const n = countWords(area.value);
    counter.textContent = `${n} mot${n > 1 ? "s" : ""} · objectif ${p.words[0]}–${p.words[1]}`;
    counter.className = `w-count ${n < p.words[0] ? "low" : n > p.words[1] * 1.15 ? "high" : "ok"}`;
    state.writingDraft = { ...(state.writingDraft || {}), [p.id]: area.value };
  };
  area.addEventListener("input", update);
  area.addEventListener("blur", () => save());
  update();
  const correct = h("button", { type: "button", class: "btn btn-primary btn-xl" }, h("span", { html: icon("check") }), "Faire corriger");
  correct.addEventListener("click", () => {
    if (countWords(area.value) < 5) return toast("Écris au moins une phrase complète.");
    save();
    report(view, p, area.value, tw);
  });
  view.replaceChildren(
    h(
      "div",
      { class: "writing" },
      h("div", { class: "topbar" }, h("button", { type: "button", class: "icon-btn", "aria-label": "Retour", html: icon("back"), onClick: () => (save(), tw ? go("tower") : back(p)) }), h("span", { class: "topbar-title" }, tw ? `La Tour · étage ${tw}` : p.c2 ? "Prépa C2 · Writing" : "Atelier d'écriture")),
      tw ? h("div", { class: "tower-banner" }, h("strong", null, `Boss d'écriture de l'étage ${tw}. `), `Il faut au moins ${floorSpec(tw).pass}/20. Raté = un cœur de la tour en moins. Recopier le modèle ne marche pas : le correcteur le détecte.`) : null,
      promptCard(p),
      h("label", { class: "field-label", for: "w-text" }, "Ton texte"),
      area,
      h("div", { class: "row w-actions" }, counter, correct),
      !dictionaryReady() ? h("p", { class: "set-help" }, "Le dictionnaire n'est pas chargé : l'orthographe ne sera pas vérifiée.") : null,
    ),
  );
  setTimeout(() => area.focus(), 100);
  return undefined;
}

function promptCard(p) {
  return h(
    "section",
    { class: "w-prompt" },
    h("div", { class: "w-prompt-head" }, h("span", { class: "tag" }, `${TYPE_FR[p.type] || p.type} · ${p.cefr}`), h("span", { class: "tag ok" }, `${p.words[0]}–${p.words[1]} mots`)),
    h("h2", null, p.title),
    h("p", { html: rich(p.prompt) }),
    p.texts?.length ? h("div", { class: "w-texts" }, p.texts.map((t, i) => h("blockquote", null, h("strong", null, `Text ${i + 1}. `), t))) : null,
    p.require?.length ? h("ul", { class: "w-req" }, p.require.map((r) => h("li", null, r.label))) : null,
  );
}

// ---------- Report ----------

const CAT_CLASS = { grammar: "g", vocab: "v", spelling: "s", mechanics: "m", style: "st" };

/** Text with the issues underlined; each mark has data-k = index of the issue. */
function annotated(text, issues) {
  let out = "";
  let pos = 0;
  issues.forEach((x, k) => {
    if (x.start < pos) return;
    out += esc(text.slice(pos, x.start));
    out += `<mark class="w-err ${CAT_CLASS[x.cat] || "g"}" data-k="${k}" tabindex="0">${esc(text.slice(x.start, x.end))}</mark>`;
    pos = x.end;
  });
  out += esc(text.slice(pos));
  return out.replace(/\n/g, "<br>");
}

function issueDetail(x, text) {
  return h(
    "div",
    { class: `w-issue ${CAT_CLASS[x.cat] || "g"}` },
    h("div", { class: "w-issue-head" }, h("span", { class: "tag" }, CAT_FR[x.cat] || x.cat), h("strong", null, `« ${text.slice(x.start, x.end)} »`), x.fix?.length ? h("span", null, " → ", h("strong", { class: "w-fix" }, x.fix.slice(0, 3).join(" / "))) : null),
    h("p", { html: rich(x.msg) }),
  );
}

function report(view, p, text, tw) {
  const a = analyze(text, p);
  const s = score(a, p);
  // Tower writing boss: the mark (and no copy of the model) decides.
  const copied = tw && p.model ? copiedShare(text, p.model) > 0.35 : false;
  const towerPass = tw ? !copied && s.total >= floorSpec(tw).pass : false;
  const tr = tw ? recordTowerFloor(tw, towerPass) : null;
  const entry = { id: `${Date.now().toString(36)}`, promptId: p.id, title: p.title, type: p.type, level: p.level, text, score: s.total, criteria: s.criteria, band: s.textBand, at: new Date().toISOString(), c2: !!p.c2 };
  const first = !state.writing.some((w) => w.promptId === p.id);
  const prevBest = first ? 0 : bestOf(p.id);
  state.writing.push(entry);
  if (state.writing.length > 60) state.writing.splice(0, state.writing.length - 60);
  const xpGain = Math.round(s.total * (first ? 3 : 1)) + (s.total > prevBest && !first ? 10 : 0);
  addXp(xpGain);
  touchStreak();
  save();
  const badges = checkBadges();

  const detail = h("div", { class: "w-detail", "aria-live": "polite" }, h("p", { class: "set-help" }, a.issues.length ? "Touche un passage souligné pour voir l'explication." : "Aucune erreur détectée par le correcteur. Bravo !"));
  const textBox = h("div", { class: "w-annotated", html: annotated(text, a.issues) });
  textBox.addEventListener("click", (e) => {
    const m = e.target.closest(".w-err");
    if (!m) return;
    textBox.querySelectorAll(".w-err.on").forEach((x) => x.classList.remove("on"));
    m.classList.add("on");
    detail.replaceChildren(issueDetail(a.issues[Number(m.dataset.k)], text));
  });
  textBox.addEventListener("keydown", (e) => e.key === "Enter" && e.target.closest(".w-err")?.click());

  const ring = h("div", { class: `score-ring ${s.total >= 10 ? "pass" : "fail"}`, style: { "--p": 0 } }, h("span", { class: "score-num" }, "0"), h("span", { class: "score-unit" }, "/20"));
  const bars = h(
    "div",
    { class: "w-crit" },
    Object.entries(s.criteria).map(([k, v]) => h("div", { class: "w-crit-row" }, h("span", null, CRITERIA_FR[k]), h("span", { class: "w-bar" }, h("span", { style: { width: `${(v / 5) * 100}%` } })), h("strong", null, `${v}/5`))),
  );
  const byCat = {};
  for (const x of a.issues) (byCat[x.cat] ||= []).push(x);
  const aiBox = h("div", { class: "w-ai" });
  const aiBtn = family.aiKey ? h("button", { type: "button", class: "btn btn-ghost" }, h("span", { html: icon("sparkle") }), "Demander la correction IA (Claude)") : null;
  aiBtn?.addEventListener("click", () => runAi(aiBox, aiBtn, p, text, entry));

  view.replaceChildren(
    h(
      "div",
      { class: "writing w-report" },
      h("div", { class: "topbar" }, h("button", { type: "button", class: "icon-btn", "aria-label": "Retour", html: icon("back"), onClick: () => back(p) }), h("span", { class: "topbar-title" }, "Correction")),
      h("p", { class: "eyebrow" }, `${p.title} · niveau visé ${p.cefr}`),
      tw && tr.event !== "ignored"
        ? h(
            "div",
            { class: `tower-banner ${towerPass ? "ok" : "ko"}` },
            towerPass
              ? [h("strong", null, `Étage ${tw} vaincu ! `), `${s.total}/20, il fallait ${floorSpec(tw).pass}/20.`]
              : [h("strong", null, copied ? "Copie du modèle détectée. " : `Raté : ${s.total}/20, il fallait ${floorSpec(tw).pass}/20. `), tr.event === "collapse" ? "La tour s'est effondrée." : `Il te reste ${tr.lives} cœurs.`],
          )
        : null,
      h("div", { class: "w-score" }, ring, h("div", null, bars, h("p", { class: "set-help" }, `Ton texte ressemble à un niveau `, h("strong", null, s.textBand), ` · ${a.words} mots · ${a.issues.length} remarque${a.issues.length > 1 ? "s" : ""}. La langue compte un peu plus que les autres critères, comme aux vrais examens.`))),
      mentorSays(quip(s.total >= 14 ? "writing_good" : "writing_bad")),
      h("h2", { class: "section-title" }, "Ton texte corrigé"),
      h("div", { class: "w-legend" }, Object.entries(CAT_FR).map(([k, v]) => (byCat[k] ? h("span", { class: `w-err ${CAT_CLASS[k]}` }, `${v} (${byCat[k].length})`) : null))),
      textBox,
      detail,
      a.checks.length ? h("h2", { class: "section-title" }, "La consigne") : null,
      a.checks.length ? h("ul", { class: "w-checks" }, a.checks.map((c) => h("li", { class: c.ok ? "ok" : "ko" }, h("span", { html: icon(c.ok ? "check" : "close") }), `${c.label} (${c.got}/${c.min})`))) : null,
      s.strengths.length ? h("h2", { class: "section-title" }, "Tes points forts") : null,
      s.strengths.length ? h("ul", { class: "w-list good" }, s.strengths.map((x) => h("li", null, x))) : null,
      s.priorities.length ? h("h2", { class: "section-title" }, "Pour gagner des points") : null,
      s.priorities.length ? h("ul", { class: "w-list todo" }, s.priorities.map((x) => h("li", null, x))) : null,
      a.issues.length ? h("details", { class: "w-all" }, h("summary", null, `Toutes les remarques (${a.issues.length})`), a.issues.map((x) => issueDetail(x, text))) : null,
      p.model && (!tw || towerPass) ? h("details", { class: "w-model" }, h("summary", null, "Voir un exemple de très bonne copie"), h("div", { class: "w-model-text" }, p.model.split(/\n+/).map((para) => h("p", null, para))), h("button", { type: "button", class: "btn btn-small btn-ghost", onClick: () => speak(p.model) }, h("span", { html: icon("speaker") }), "Écouter")) : null,
      aiBox,
      h(
        "div",
        { class: "result-actions" },
        tw && (towerPass || tr.event === "collapse")
          ? h("button", { type: "button", class: "btn btn-primary btn-xl", onClick: () => go("tower") }, towerPass ? (surprise(tower()) ? "Affronter le boss final" : `Monter à l'étage ${tw + 1}`) : "Retour à la tour")
          : h("button", { type: "button", class: "btn btn-primary btn-xl", onClick: () => editor(view, p, text, tw && tr.event === "life" ? tw : undefined) }, tw ? "Corriger mon texte et retenter (un cœur si raté)" : "Corriger mon texte et resoumettre"),
        aiBtn,
        h("button", { type: "button", class: "btn btn-ghost", onClick: () => (tw ? go("tower") : back(p)) }, tw ? "Retour à la tour" : "Autre sujet"),
      ),
      h("div", { class: "xp-gain" }, h("span", { html: icon("bolt") }), `+${xpGain} XP`),
      badges.length ? h("div", { class: "new-badges" }, badges.map((b) => h("div", { class: "badge-pop" }, h("span", { html: icon("trophy") }), h("strong", null, b.name), h("small", null, b.desc)))) : null,
      h("p", { class: "set-help" }, "Le correcteur intégré repère les fautes les plus fréquentes, mais pas toutes : un mot correct mais mal choisi peut lui échapper. Fais relire tes textes importants par un humain (ou par l'IA)."),
    ),
  );
  ring.style.setProperty("--p", Math.round((s.total / 20) * 100));
  countUp(ring.querySelector(".score-num"), s.total, 900, (v) => (Math.round(v * 2) / 2).toString().replace(".", ","));
  if (s.total >= 15) {
    sfx.win();
    confetti({ count: 80 });
  } else sfx.level();
  window.scrollTo({ top: 0 });
  if (tw && !towerPass && tr.event !== "ignored") drama(tr, copied ? "Le correcteur a reconnu le texte modèle." : `${s.total}/20 au lieu de ${floorSpec(tw).pass}/20.`);
}

async function runAi(box, btn, p, text, entry) {
  btn.disabled = true;
  box.replaceChildren(h("p", { class: "w-ai-wait" }, "Claude lit ta copie… (cela peut prendre une minute)"));
  try {
    const { aiCorrect } = await import("../writing/ai.js");
    const r = await aiCorrect({ apiKey: family.aiKey, model: family.aiModel, text, prompt: p, age: state.player.age });
    entry.ai = r.total;
    save();
    const marks = [...r.errors].map((e) => ({ ...e, start: text.indexOf(e.quote) })).filter((e) => e.start >= 0 && e.quote).sort((x, y) => x.start - y.start);
    const issues = marks.map((e) => ({ start: e.start, end: e.start + e.quote.length, cat: e.category, msg: `${e.explanation_fr}`, fix: [e.correction] }));
    box.replaceChildren(
      h("h2", { class: "section-title" }, `Correction IA : ${String(r.total).replace(".", ",")}/20 · ${r.cefr}`),
      h("p", { class: "set-help" }, `Par ${r.model}.`),
      h("div", { class: "w-crit" }, Object.entries(r.scores).map(([k, v]) => h("div", { class: "w-crit-row" }, h("span", null, CRITERIA_FR[k]), h("span", { class: "w-bar ai" }, h("span", { style: { width: `${(v / 5) * 100}%` } })), h("strong", null, `${v}/5`)))),
      mentorSays(r.comment_fr),
      issues.length ? h("div", { class: "w-annotated", html: annotated(text, issues) }) : null,
      r.errors.length ? h("details", { class: "w-all", open: true }, h("summary", null, `Les ${r.errors.length} remarques de l'IA`), r.errors.map((e) => h("div", { class: `w-issue ${CAT_CLASS[e.category] || "g"}` }, h("div", { class: "w-issue-head" }, h("span", { class: "tag" }, CAT_FR[e.category] || e.category), h("strong", null, `« ${e.quote} »`), " → ", h("strong", { class: "w-fix" }, e.correction)), h("p", null, e.explanation_fr)))) : null,
      r.strengths_fr.length ? h("ul", { class: "w-list good" }, r.strengths_fr.map((x) => h("li", null, x))) : null,
      r.improvements_fr.length ? h("ul", { class: "w-list todo" }, r.improvements_fr.map((x) => h("li", null, x))) : null,
      h("details", { class: "w-model", open: true }, h("summary", null, "Ton texte corrigé par l'IA"), h("div", { class: "w-model-text" }, r.corrected_text.split(/\n+/).map((para) => h("p", null, para)))),
    );
  } catch (e) {
    box.replaceChildren(h("p", { class: "w-ai-err" }, e.message));
  }
  btn.disabled = false;
}

/** Compact correction for the written missions of the stations (no mark, just the annotated text). */
export function quickCheck(text, level) {
  const p = { level, type: "message", words: [1, 400], require: [] };
  const a = analyze(text, p);
  const detail = h("div", { class: "w-detail" });
  const box = h("div", { class: "w-annotated", html: annotated(text, a.issues) });
  box.addEventListener("click", (e) => {
    const m = e.target.closest(".w-err");
    if (m) detail.replaceChildren(issueDetail(a.issues[Number(m.dataset.k)], text));
  });
  return h("div", { class: "w-quick" }, h("p", { class: "pron-kicker" }, a.issues.length ? `${a.issues.length} remarque${a.issues.length > 1 ? "s" : ""} du correcteur (touche le texte souligné)` : "Le correcteur n'a trouvé aucune faute !"), box, detail);
}
