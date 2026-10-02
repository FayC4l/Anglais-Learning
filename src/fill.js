// Gap helpers for fill-in questions: one box per expected word. Pure (shared with the validators).
import { forms } from "./answer.js";

/** Words of the canonical answer, as shown by the boxes ("has been" → ["has", "been"]). */
export function gapWords(expected) {
  return String(expected ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

/** Joins the typed boxes into one answer string. */
export function joinBoxes(values) {
  return values
    .map((v) => String(v ?? "").trim())
    .filter(Boolean)
    .join(" ");
}

const counts = (s) => new Set([...forms(s)].map((f) => (f ? f.split(" ").length : 0)));

/** Accepted answers whose word count cannot match the boxes of answer[0] (contractions tolerated). */
export function wordCountMismatches(answers) {
  if (!Array.isArray(answers) || !answers.length) return [];
  const ref = counts(answers[0]);
  return answers.slice(1).filter((a) => ![...counts(a)].some((n) => ref.has(n)));
}
