import { readFileSync, readdirSync } from "node:fs";
const levels = readdirSync("content").filter((f) => /^level-\d\d\.json$/.test(f)).sort().map((f) => JSON.parse(readFileSync("content/" + f, "utf8")));
const extra = { boss: {}, lexicon: {}, c2uoe: JSON.parse(readFileSync("content/c2-uoe.json", "utf8")), wordform: JSON.parse(readFileSync("content/wordform.json", "utf8")) };
for (const f of readdirSync("content")) { const m = f.match(/^boss-(\d\d)\.json$/); if (m) extra.boss[Number(m[1])] = JSON.parse(readFileSync("content/" + f, "utf8")); }
globalThis.window = { __CONTENT__: levels, __EXTRA__: extra, speechSynthesis: { getVoices: () => [{ lang: "en-CA", voiceURI: "x", name: "x" }], addEventListener() {} } };
const { towerExam } = await import("../src/questions.js");
let bad = 0;
for (let n = 1; n < 50; n++) {
  if (n % 5 === 0) continue;
  const qs = towerExam(n);
  const kinds = {};
  qs.forEach((q) => (kinds[q.kind] = (kinds[q.kind] || 0) + 1));
  if (qs.length < 10 || qs.some((q) => !q || !q.kind)) bad++;
  if ([1, 13, 27, 33, 38, 42, 49].includes(n)) console.log(n, qs.length, JSON.stringify(kinds), "|", (qs.find((q) => q.kind === "fill") || {}).q);
}
console.log("bad floors:", bad);
