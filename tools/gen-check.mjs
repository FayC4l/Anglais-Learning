import { readFileSync, readdirSync } from "node:fs";
const levels = readdirSync("content").filter((f) => /^level-/.test(f)).sort().map((f) => JSON.parse(readFileSync("content/" + f, "utf8")));
globalThis.window = { __CONTENT__: levels };
const voices = [{ lang: "en-CA", voiceURI: "x", name: "x" }];
window.speechSynthesis = { getVoices: () => voices, addEventListener() {} };
const { unitTest, bossExam, reviewQuestion } = await import("../src/questions.js");
const { vocabRefs, sentenceRefs, grammarRefs, readingRefs } = await import("../src/content.js");
const { matches, tiles, tileKey } = await import("../src/answer.js");
let problems = 0;
for (const l of levels) {
  for (const u of l.units) {
    for (let k = 0; k < 30; k++) {
      const t = unitTest(u.id);
      if (t.length !== 15 || t.some((q) => !q)) { problems++; console.log("unit test size", u.id, t.length); break; }
    }
    // Every item must be answerable with its own expected answer.
    for (const r of [...vocabRefs(u), ...sentenceRefs(u), ...grammarRefs(u)]) {
      const q = reviewQuestion(r);
      if (!q) { problems++; console.log("no question", r); continue; }
      if (q.accept && !matches(q.expected.split(" → ").pop(), q.accept)) { problems++; console.log("expected not accepted", r, q.expected); }
      if (q.kind === "build" && !q.accepted.includes(tileKey(q.words))) { problems++; console.log("build key", r); }
    }
  }
  for (let k = 0; k < 20; k++) {
    const b = bossExam(l.id);
    if (b.length < 20 || b.some((q) => !q)) { problems++; console.log("boss size", l.id, b.length); break; }
  }
}
console.log("problems:", problems);
