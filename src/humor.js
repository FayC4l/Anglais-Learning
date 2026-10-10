// Chikh Faycal, the English teacher: situational one-liners, his face for each mood, and the joke of the day
// (content/humor.json, content/mentor.json).
import { EXTRA } from "./content.js";
import { state } from "./store.js";
import { h, rich, esc } from "./ui.js";

export const MENTOR_NAME = "Chikh Faycal";

const recent = [];
let lastQuip = { text: "", situation: "" };

/** Expressions of the sheet that suit each situation (one is picked at random). */
const MOODS = {
  welcome: ["happy", "speaking", "gamer"],
  correct: ["happy", "laughing", "cool"],
  wrong: ["shocked", "worried", "skeptical"],
  streak: ["cool", "boss", "gamer"],
  timeout: ["sleepy"],
  perfect: ["love", "laughing"],
  fail: ["crying", "worried"],
  comeback: ["love", "happy"],
  writing_good: ["laptop", "love"],
  writing_bad: ["skeptical", "laptop"],
  warning: ["serious", "determined"],
  cool: ["hoodie", "cool"],
  troll: ["laughing", "cool", "gamer"],
};

/** A line of Chikh Faycal for a situation, suited to the player's age, avoiding the last ones shown. */
export function quip(situation) {
  const age = state.player?.age || "ado";
  const all = (EXTRA.humor?.quips?.[situation] || []).filter((q) => !q.ages || q.ages.includes(age));
  if (!all.length) return "";
  const fresh = all.filter((q) => !recent.includes(q.text));
  const pickFrom = fresh.length ? fresh : all;
  const q = pickFrom[Math.floor(Math.random() * pickFrom.length)];
  recent.push(q.text);
  if (recent.length > 30) recent.shift();
  lastQuip = { text: q.text, situation };
  return q.text;
}

/** Same joke all day long, changing every day; only jokes the player can understand at their level. */
export function jokeOfTheDay(level = 12, date = new Date()) {
  const jokes = (EXTRA.humor?.jokes || []).filter((j) => j.level <= Math.max(2, level + 1));
  if (!jokes.length) return null;
  const day = Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000);
  return jokes[day % jokes.length];
}

/** Fallback drawing of Chikh Faycal (used until content/mentor.json holds his real pictures). */
export const MENTOR_SVG = `<svg class="mentor-svg" viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="34" r="29" fill="#F4A12B" stroke="#1B1B1B" stroke-width="2"/><path d="M15 64c1-10 8-15 17-15s16 5 17 15z" fill="#F3E6C8" stroke="#1B1B1B" stroke-width="1.6"/><path d="M27 49l5 6 5-6z" fill="#fff" stroke="#1B1B1B" stroke-width="1.2"/><path d="M31 52h2l1.5 8-2.5 3-2.5-3z" fill="#2B2018"/><ellipse cx="32" cy="30" rx="12.5" ry="15" fill="#E8B48A" stroke="#1B1B1B" stroke-width="1.6"/><path d="M19.5 33q0 13 12.5 13t12.5-13q-2 6-6 6.5-2.5-2.5-6.5-2.5t-6.5 2.5q-4-.5-6-6.5z" fill="#3A281C"/><path d="M19 27c-1-11 5-16 13-16s15 4 13 14c-2-5-7-7-13-7s-10 3-13 9z" fill="#2B2018" stroke="#1B1B1B" stroke-width="1.2"/><ellipse cx="26.5" cy="28.5" rx="2.6" ry="3" fill="#fff" stroke="#1B1B1B" stroke-width="1"/><ellipse cx="37.5" cy="28.5" rx="2.6" ry="3" fill="#fff" stroke="#1B1B1B" stroke-width="1"/><circle cx="27" cy="29" r="1.4" fill="#1B1B1B"/><circle cx="37" cy="29" r="1.4" fill="#1B1B1B"/><path d="M23 23.5q3.5-2 7 0M34 23.5q3.5-2 7 0" stroke="#2B2018" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M27.5 39q4.5 2.6 9 0" stroke="#fff" stroke-width="1.6" fill="none" stroke-linecap="round"/></svg>`;

/** Picture of Chikh Faycal for a mood (a data URL), or null when only the fallback drawing exists. */
export function mentorPicture(mood) {
  const m = EXTRA.mentor;
  if (!m) return null;
  const options = (MOODS[mood] || []).filter((n) => m.expressions?.[n]);
  if (options.length) return m.expressions[options[Math.floor(Math.random() * options.length)]];
  return m.avatar || m.expressions?.happy || null;
}

/** Face of Chikh Faycal as an HTML string (picture or fallback drawing). */
export function mentorFaceHtml(mood) {
  const src = mentorPicture(mood);
  return src ? `<img src="${esc(src)}" alt="" class="mentor-img" draggable="false">` : MENTOR_SVG;
}

/**
 * Chikh Faycal's speech bubble (empty when there is nothing to say). The mood picks his expression; by default
 * it follows the situation of the last quip() when the text comes from it.
 */
export function mentorSays(text, cls = "", mood) {
  if (!text) return null;
  const m = mood || (text === lastQuip.text ? lastQuip.situation : "welcome");
  return h("div", { class: `mentor ${cls}` }, h("span", { class: "mentor-face", html: mentorFaceHtml(m) }), h("p", { class: "mentor-bubble" }, h("strong", { class: "mentor-name" }, MENTOR_NAME), h("span", { html: rich(text) })));
}
