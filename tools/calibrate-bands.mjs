// Prints the text features of writing.json models by CEFR band, to calibrate score.js#textBand.
import { readFileSync, readdirSync } from "node:fs";
import { buildDictionary } from "./dictionary.mjs";

const levels = readdirSync("content").filter((f) => /^level-\d\d\.json$/.test(f)).sort().map((f) => JSON.parse(readFileSync(`content/${f}`, "utf8")));
const { loadDictionary } = await import("../src/writing/spell.js");
loadDictionary(buildDictionary(process.cwd(), levels));
const { analyze } = await import("../src/writing/analyze.js");
const bandOf = (L) => (L <= 2 ? "A1" : L <= 4 ? "A2" : L <= 6 ? "B1" : L <= 9 ? "B2" : L <= 11 ? "C1" : "C2");
const prompts = JSON.parse(readFileSync("content/writing.json", "utf8")).prompts;
const c2 = JSON.parse(readFileSync("content/c2-papers.json", "utf8")).writing.map((w) => ({ ...w, level: 12 }));
const by = {};
for (const p of [...prompts, ...c2]) {
  const a = analyze(p.model, p);
  const f = { avg: a.avgSentence, mattr: a.mattr, soph: a.sophistication, conn: Object.keys(a.connectors).length, words: a.words, adv: a.advancedConnectors.length, long: a.tk.tokens.filter((t) => t.word && t.text.length >= 8).length / Math.max(1, a.words) };
  (by[bandOf(p.level)] ||= []).push(f);
}
for (const [b, list] of Object.entries(by)) {
  const avg = (k) => (list.reduce((s, x) => s + x[k], 0) / list.length).toFixed(3);
  console.log(b, list.length, "avgSent", avg("avg"), "mattr", avg("mattr"), "soph", avg("soph"), "conn", avg("conn"), "adv", avg("adv"), "long", avg("long"), "words", avg("words"));
}
