// Debug helper: prints the analysis and mark of a writing.json model, then of a damaged copy.
// Usage: node tools/debug-score.mjs [promptId]
import { readFileSync, readdirSync } from "node:fs";
import { buildDictionary } from "./dictionary.mjs";

const levels = readdirSync("content").filter((f) => /^level-\d\d\.json$/.test(f)).sort().map((f) => JSON.parse(readFileSync(`content/${f}`, "utf8")));
const { loadDictionary } = await import("../src/writing/spell.js");
loadDictionary(buildDictionary(process.cwd(), levels));
const { analyze } = await import("../src/writing/analyze.js");
const { score } = await import("../src/writing/score.js");
const prompts = JSON.parse(readFileSync("content/writing.json", "utf8")).prompts;
const p = prompts.find((x) => x.id === process.argv[2]) || prompts.find((x) => x.level === 3);
let k = 0;
const bad = p.model.replace(/\b[a-z]{5,}\b/g, (w) => (++k % 6 === 0 ? w[0] + w[2] + w[1] + w.slice(3) : w)).replace(/\.\s+(?=[A-Z])/g, " ").replace(/\bI\b/g, "i");
for (const t of [p.model, bad]) {
  const a = analyze(t, p);
  const s = score(a, p);
  console.log("---\n" + t + "\n");
  console.log("words", a.words, "issues", a.issues.map((x) => `${x.rule}:${t.slice(x.start, x.end)}`).join(" | "));
  console.log("total", s.total, JSON.stringify(s.criteria));
  console.log(JSON.stringify(s.details));
  console.log("checks", JSON.stringify(a.checks.map((c) => [c.label, c.got, c.ok])), "tenses", JSON.stringify(a.tenses));
}
