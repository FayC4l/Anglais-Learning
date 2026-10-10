// Anti-cheat with a laugh. Chikh Faycal bursts out laughing over the whole screen:
// - on a phone (or a computer), when the player comes back after leaving the app during a question (to send a
//   screenshot, translate, ask someone…). Phones do not tell web pages about screenshots, but using one to cheat
//   means leaving the app, and that can be seen;
// - on a computer, on the screenshot shortcuts (Print Screen, Windows+Shift+S, Cmd+Shift+3/4/5). With Windows+Shift
//   or Cmd+Shift he shows up as soon as those two keys are down, so the capture shows him instead of the question.
// Alerts during questions are recorded in the profile (state.alerts).
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
// A huge cartoon mouth (laughing wide open) and tears of laughter, drawn over his portrait.
const MOUTH = `<svg class="laugh-mouth" viewBox="0 0 100 70" aria-hidden="true"><path d="M4 8 Q50 -4 96 8 Q92 66 50 68 Q8 66 4 8Z" fill="#5a0610" stroke="#1b1b1b" stroke-width="3"/><path d="M10 10 Q50 2 90 10 L88 20 Q50 13 12 20Z" fill="#fff"/><path d="M22 52 Q50 34 78 52 Q66 66 50 66 Q34 66 22 52Z" fill="#e8577a"/></svg>`;
const TEARS = `<span class="laugh-tear left"></span><span class="laugh-tear right"></span>`;/** Away for less than this: a notification, a mis-tap… not worth a laugh. */
const AWAY_MIN_MS = 2000;

let open = null;
let counted = false;
let shownAt = 0;
let metaDown = false;
let shiftDown = false;
let leftAt = 0;
let leftDuring = false;

const pick = (list) => list[Math.floor(Math.random() * list.length)];
/** A question (or a C2 exercise) is on screen. */
const inQuestion = () => !!document.querySelector(".quiz .q-card, .c2-ex");
/** Screens that may be captured: the Tower victory is meant to be shown to Faycal. */
const allowed = () => !!document.querySelector(".tower-victory");

function record(how, during) {
  if (counted || !during || !state.player?.id) return;
  counted = true;
  state.alerts ||= [];
  state.alerts.push({ at: new Date().toISOString(), screen: document.getElementById("view")?.dataset.screen || "", how });
  if (state.alerts.length > 200) state.alerts.splice(0, state.alerts.length - 200);
  save();
  open?.querySelector(".laugh-sub")?.replaceChildren(`Alerte n°${state.alerts.length} notée dans ton profil.`);
}

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
  const close = () => {
    if (open !== overlay) return;
    open = null;
    overlay.classList.add("out");
    setTimeout(() => overlay.remove(), 250);
  };
  overlay.addEventListener("click", close);
  setTimeout(close, 4500);
}

/** A capture shortcut was seen; `sure` when it is certainly a screenshot (not only Windows+Shift held). */
function caught(how, sure) {
  if (allowed()) return;
  if (!open && Date.now() - shownAt > 1500) show(pick(CAPTURE_LINES), inQuestion());
  if (sure && open) record(how, open.dataset.during === "1");
}

export function initAntiCheat() {
  // Leaving the app during a question (phones above all).
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      leftAt = Date.now();
      leftDuring = inQuestion() && !allowed();
      return;
    }
    const away = Date.now() - leftAt;
    if (leftAt && leftDuring && away >= AWAY_MIN_MS && !open) {
      show(pick(LEAVE_LINES), true);
      record("sortie de l'appli pendant une question", true);
    }
    leftAt = 0;
  });
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
  // Windows+Shift+S opens the capture tool, which takes the focus away from the page.
  addEventListener("blur", () => {
    if (metaDown && shiftDown) caught("capture d'écran", true);
    metaDown = false;
    shiftDown = false;
  });
}

/** Alerts recorded for the active profile (captures and exits during questions). */
export const alertCount = () => (state.alerts || []).length;
