// Anti-cheat. Phones do not tell web pages about screenshots, so the app watches what cheating needs instead:
// - leaving the app during a question (to send a screenshot to an AI, translate, ask someone…), or losing the focus
//   to a window opened over it (AI or search overlay, other window): Chikh Faycal waits for the player with a grotesque
//   laugh and the question is cancelled (guardQuestion); a Tower fight or the final exam is lost (guardLeaving); the
//   Tower writing boss gets a new subject;
// - translating: the page is marked "notranslate", question texts cannot be selected, copied or right-clicked, and a
//   page translated anyway (Google Translate) makes him laugh too; nothing can be pasted into the Tower writing boss;
// - on a computer, the screenshot shortcuts (Print Screen, Windows+Shift+S, Cmd+Shift+3/4/5). With Windows+Shift or
//   Cmd+Shift he shows up as soon as those two keys are down, so the capture shows him instead of the question;
// Alerts during questions are recorded in the profile (state.alerts) and shown on the Tower victory screen.
import { h } from "./ui.js";
import { state, save } from "./store.js";
import { mentorFaceHtml } from "./humor.js";
import { sfx } from "./audio.js";

const CAPTURE_LINES = [
  "Une capture d'écran ? Chikh Faycal a TOUT vu.",
  "Clic-clac, photo ? La réponse n'est pas dans l'image. Elle est dans ta tête.",
  "Je collectionne tes captures. J'en ferai un album pour ton mariage.",
  "Tricher en anglais ? « Cheating ». Tu vois, tu apprends quand même.",
];
const LEAVE_LINES = [
  "Tu es parti(e) en pleine question ? Je t'ai attendu. Avec mon thé. HA HA HA !",
  "Alors, ChatGPT t'a aidé ? Moi aussi je l'ai vu. HA HA HA !",
  "Tu reviens ? La question n'a pas bougé. Moi non plus. Je te regardais.",
  "Petite visite chez le traducteur ? Il m'a tout raconté. HA HA HA !",
  "On ne quitte pas un boss en plein combat. Surtout pas devant moi.",
];
const PASTE_LINES = [
  "Copier-coller une rédaction ? Même ChatGPT rigole. HA HA HA !",
  "Ici, on écrit avec ses doigts, pas avec ceux d'un robot. HA HA HA !",
];
const TRANSLATE_LINES = [
  "Google Traduction ? Il travaille pour moi. HA HA HA !",
  "Tu traduis la page ? Moi je traduis ta tête : « coupable ». HA HA HA !",
];
// A huge cartoon mouth (laughing wide open) and tears of laughter, drawn over his portrait.
const MOUTH = `<svg class="laugh-mouth" viewBox="0 0 100 70" aria-hidden="true"><path d="M4 8 Q50 -4 96 8 Q92 66 50 68 Q8 66 4 8Z" fill="#5a0610" stroke="#1b1b1b" stroke-width="3"/><path d="M10 10 Q50 2 90 10 L88 20 Q50 13 12 20Z" fill="#fff"/><path d="M22 52 Q50 34 78 52 Q66 66 50 66 Q34 66 22 52Z" fill="#e8577a"/></svg>`;
const TEARS = `<span class="laugh-tear left"></span><span class="laugh-tear right"></span>`;
/** Away for less than this: a notification, a mis-tap… not worth a laugh. */
export const AWAY_MIN_MS = 2000;

let open = null;
let counted = false;
let shownAt = 0;
let metaDown = false;
let shiftDown = false;
let leftAt = 0;
let leftDuring = false;
let translated = false;
/** While a Tower fight or the final exam is on: called with a promise that settles when the laugh is closed. */
let guard = null;
/** While a question (or a Tower writing boss) is on: called when the player comes back, to cancel it. */
let questionGuard = null;

const pick = (list) => list[Math.floor(Math.random() * list.length)];
/** The writing boss of a Tower floor is being written. */
const TOWER_WRITING = ".writing:not(.w-report) > .tower-banner";
/** A question, a C2 exercise or a Tower writing boss is on screen. */
const inQuestion = () => !!document.querySelector(`.quiz .q-card, .c2-ex, ${TOWER_WRITING}`);
/** Screens that may be captured: the Tower victory is meant to be shown to Faycal. */
const allowed = () => !!document.querySelector(".tower-victory");

/** Registers what happens when the player leaves the app (Tower fights, final exam); returns the unregister. */
export function guardLeaving(fn) {
  guard = fn;
  return () => {
    if (guard === fn) guard = null;
  };
}

/** Registers how to cancel the current question when the player leaves the app; returns the unregister. */
export function guardQuestion(fn) {
  questionGuard = fn;
  return () => {
    if (questionGuard === fn) questionGuard = null;
  };
}

function record(how, during) {
  if (counted || !during || !state.player?.id) return;
  counted = true;
  state.alerts ||= [];
  state.alerts.push({ at: new Date().toISOString(), screen: document.getElementById("view")?.dataset.screen || "", how });
  if (state.alerts.length > 200) state.alerts.splice(0, state.alerts.length - 200);
  save();
  open?.querySelector(".laugh-sub")?.replaceChildren(`Alerte n°${state.alerts.length} notée dans ton profil.`);
}

/** Shows the laugh; resolves when it is closed. */
function show(line, during) {
  counted = false;
  shownAt = Date.now();
  const minis = Array.from({ length: 8 }, (_, i) => h("span", { class: "laugh-mini", style: { "--x": `${(i * 37 + 9) % 88}%`, "--y": `${(i * 53 + 11) % 76}%`, "--d": `${(i % 4) * 0.12}s`, "--r": i % 2 ? "1" : "-1" }, html: mentorFaceHtml("laughing") }));
  const overlay = h(
    "div",
    { class: "laugh", role: "alertdialog", "aria-label": "Chikh Faycal éclate de rire" },
    minis,
    h("div", { class: "laugh-face", html: mentorFaceHtml("laughing") + MOUTH + TEARS }),
    h("div", { class: "laugh-ha", "aria-hidden": "true" }, ["HA", "HA", "HA", "HA", "HA"].map((t, i) => h("span", { style: { "--i": i } }, t))),
    h("p", { class: "laugh-line" }, line),
    h("p", { class: "laugh-sub" }, "Touche l'écran pour fermer."),
  );
  overlay.dataset.during = during ? "1" : "";
  document.body.append(overlay);
  open = overlay;
  sfx.laugh();
  return new Promise((resolve) => {
    const close = () => {
      if (open !== overlay) return;
      open = null;
      overlay.classList.add("out");
      setTimeout(() => {
        overlay.remove();
        resolve();
      }, 250);
    };
    overlay.addEventListener("click", close);
    setTimeout(close, 4500);
  });
}

/** A capture shortcut was seen; `sure` when it is certainly a screenshot (not only Windows+Shift held). */
function caught(how, sure) {
  if (allowed()) return;
  if (!open && Date.now() - shownAt > 1500) show(pick(CAPTURE_LINES), inQuestion());
  if (sure && open) record(how, open.dataset.during === "1");
}

/** The element an event happened on (text nodes give their parent). */
const elementOf = (t) => (t?.nodeType === 1 ? t : t?.parentElement);
/** Inside a question, outside the answer fields. */
const protectedTarget = (t) => {
  const el = elementOf(t);
  return !!el?.closest?.(".quiz, .c2-ex") && !el.closest("input, textarea, select");
};

export function initAntiCheat() {
  // Leaving the app (hidden page) or losing the focus (an AI or search window over it) during a question.
  const leave = () => {
    if (leftAt) return;
    leftAt = Date.now();
    leftDuring = (inQuestion() || !!guard) && !allowed();
  };
  const back = () => {
    if (!leftAt || document.visibilityState === "hidden") return;
    const away = Date.now() - leftAt;
    const during = leftDuring;
    leftAt = 0;
    if (!during || away < AWAY_MIN_MS || open) return;
    const closed = show(pick(LEAVE_LINES), true);
    record("sortie de l'appli pendant une question", true);
    if (guard) guard(closed);
    else questionGuard?.();
  };
  document.addEventListener("visibilitychange", () => (document.visibilityState === "hidden" ? leave() : back()));
  addEventListener("focus", back);

  // No selecting, copying, dragging or right-clicking the questions (the way to "Translate" a sentence).
  for (const type of ["copy", "cut", "contextmenu", "selectstart", "dragstart"]) {
    document.addEventListener(type, (e) => protectedTarget(e.target) && e.preventDefault(), true);
  }
  // No pasting into the Tower writing boss: an essay from somewhere else would have to be typed again.
  for (const type of ["paste", "drop"]) {
    document.addEventListener(
      type,
      (e) => {
        if (!elementOf(e.target)?.closest?.(".writing:not(.w-report)") || !document.querySelector(TOWER_WRITING)) return;
        e.preventDefault();
        if (!open) show(pick(PASTE_LINES), true);
        record("copier-coller dans le boss d'écriture", true);
      },
      true,
    );
  }
  // A page translated anyway (Google Translate marks the page): he laughs, and it is counted.
  new MutationObserver(() => {
    const now = /\btranslated-(ltr|rtl)\b/.test(document.documentElement.className);
    if (now && !translated && !allowed()) {
      const during = inQuestion();
      const closed = show(pick(TRANSLATE_LINES), during);
      record("traduction de la page", during);
      if (during) guard?.(closed);
    }
    translated = now;
  }).observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

  // Screenshot shortcuts (computers).
  addEventListener(
    "keydown",
    (e) => {
      if (e.key === "Meta" || e.key === "OS") metaDown = true;
      if (e.key === "Shift") shiftDown = true;
      const meta = metaDown || e.metaKey;
      const shift = shiftDown || e.shiftKey;
      if (meta && shift && /^(KeyS|Digit3|Digit4|Digit5)$/.test(e.code)) return caught("capture d'écran", true);
      // Windows+Shift / Cmd+Shift: show up before the last key of the shortcut.
      if (meta && shift) caught("capture d'écran", false);
    },
    true,
  );
  addEventListener(
    "keyup",
    (e) => {
      if (e.key === "PrintScreen" || e.code === "PrintScreen") caught("capture d'écran", true);
      if (e.key === "Meta" || e.key === "OS") metaDown = false;
      if (e.key === "Shift") shiftDown = false;
    },
    true,
  );
  // Losing the focus: Windows+Shift+S opens the capture tool; otherwise another window or overlay took it.
  addEventListener("blur", () => {
    if (metaDown && shiftDown) caught("capture d'écran", true);
    metaDown = false;
    shiftDown = false;
    leave();
  });
}

/** Alerts recorded for the active profile (captures, translations and exits during questions). */
export const alertCount = () => (state.alerts || []).length;
