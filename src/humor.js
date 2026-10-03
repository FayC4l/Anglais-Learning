// Maurice the moose: situational one-liners and the joke of the day (content/humor.json).
import { EXTRA } from "./content.js";
import { state } from "./store.js";
import { h, rich } from "./ui.js";

const recent = [];

/** A line of Maurice for a situation, suited to the player's age, avoiding the last ones shown. */
export function quip(situation) {
  const age = state.player?.age || "ado";
  const all = (EXTRA.humor?.quips?.[situation] || []).filter((q) => !q.ages || q.ages.includes(age));
  if (!all.length) return "";
  const fresh = all.filter((q) => !recent.includes(q.text));
  const pickFrom = fresh.length ? fresh : all;
  const q = pickFrom[Math.floor(Math.random() * pickFrom.length)];
  recent.push(q.text);
  if (recent.length > 30) recent.shift();
  return q.text;
}

/** Same joke all day long, changing every day; only jokes the player can understand at their level. */
export function jokeOfTheDay(level = 12, date = new Date()) {
  const jokes = (EXTRA.humor?.jokes || []).filter((j) => j.level <= Math.max(2, level + 1));
  if (!jokes.length) return null;
  const day = Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000);
  return jokes[day % jokes.length];
}

export const MOOSE_SVG = `<svg class="moose-svg" viewBox="0 0 64 64" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M18 22c-6-2-10-8-9-14M18 22c-3-5-2-10 1-13M18 22c-6 0-9-3-11-6" /><path d="M46 22c6-2 10-8 9-14M46 22c3-5 2-10-1-13M46 22c6 0 9-3 11-6"/></g><path d="M20 22c0-4 5-7 12-7s12 3 12 7v12c0 4-2 7-4 9l-2 9c-1 4-3 6-6 6s-5-2-6-6l-2-9c-2-2-4-5-4-9z" fill="#9C6B4E"/><ellipse cx="32" cy="52" rx="8" ry="6" fill="#C79A7B"/><circle cx="27" cy="30" r="2.6" fill="#0f1b33"/><circle cx="37" cy="30" r="2.6" fill="#0f1b33"/><circle cx="28" cy="29" r=".9" fill="#fff"/><circle cx="38" cy="29" r=".9" fill="#fff"/><circle cx="29" cy="52" r="1.3" fill="#5a3b2a"/><circle cx="35" cy="52" r="1.3" fill="#5a3b2a"/></svg>`;

/** Maurice's speech bubble (empty when there is nothing to say). */
export function mooseSays(text, cls = "") {
  if (!text) return null;
  return h("div", { class: `moose ${cls}` }, h("span", { class: "moose-face", html: MOOSE_SVG }), h("p", { class: "moose-bubble", html: rich(text) }));
}
