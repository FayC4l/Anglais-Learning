// Validates pronunciation/mission files. Usage: node tools/validate-extra.mjs content/extra-03.json [...]
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { clean } from "../src/answer.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
let files = process.argv.slice(2);
if (!files.length) files = readdirSync(join(root, "content")).filter((f) => /^extra-\d\d\.json$/.test(f)).map((f) => join(root, "content", f));
let total = 0;
const str = (v) => typeof v === "string" && v.trim().length > 0;
for (const file of files) {
  const errors = [];
  const err = (w, m) => errors.push(`${w}: ${m}`);
  let d;
  try { d = JSON.parse(readFileSync(file, "utf8")); } catch (e) { console.log(`${file}: invalid JSON ${e.message}`); total++; continue; }
  const L = d.level;
  if (!Number.isInteger(L) || L < 1 || L > 12) err("file", "level must be 1-12");
  if (!Array.isArray(d.units) || d.units.length !== 4) err("file", "units must have 4 entries");
  const types = [];
  (d.units || []).forEach((u, i) => {
    const W = `unit ${u?.unit}`;
    if (u.unit !== `${L}.${i + 1}`) err(W, `unit must be "${L}.${i + 1}"`);
    const p = u.pron || {};
    if (!str(p.focus)) err(W, "pron.focus required");
    if (typeof p.ipa !== "string") err(W, "pron.ipa must be a string (may be empty)");
    if (!str(p.explain)) err(W, "pron.explain required");
    else if ((p.explain.match(/\[\[/g) || []).length !== (p.explain.match(/\]\]/g) || []).length) err(W, "unbalanced [[ ]]");
    if (!Array.isArray(p.words) || p.words.length < 6 || p.words.length > 10) err(W, `pron.words needs 6-10 items (has ${p.words?.length})`);
    else p.words.forEach((x, k) => {
      if (!str(x.en) || !str(x.fr) || !str(x.hint)) err(W, `word ${k} needs en, fr, hint`);
      if (/\d/.test(x.en || "")) err(W, `word ${k} has digits`);
    });
    if (!Array.isArray(p.pairs) || p.pairs.length > 6) err(W, "pron.pairs must be an array of 0-6 pairs");
    else p.pairs.forEach((pr, k) => {
      if (!Array.isArray(pr) || pr.length !== 2 || !str(pr[0]) || !str(pr[1])) err(W, `pair ${k} must be [word, word]`);
      else if (clean(pr[0]) === clean(pr[1])) err(W, `pair ${k} has identical words`);
    });
    if (!Array.isArray(p.practice) || p.practice.length < 1 || p.practice.length > 3 || !p.practice.every(str)) err(W, "pron.practice needs 1-3 sentences");
    else p.practice.forEach((s, k) => /\d/.test(s) && err(W, `practice ${k} has digits`));
    const m = u.mission || {};
    if (!["oral", "ecrit"].includes(m.type)) err(W, 'mission.type must be "oral" or "ecrit"');
    types.push(m.type);
    if (!str(m.prompt) || !str(m.model)) err(W, "mission needs prompt and model");
    if (/\d/.test(m.model || "")) err(W, "mission.model has digits");
    if (!Array.isArray(m.checklist) || m.checklist.length < 3 || m.checklist.length > 5 || !m.checklist.every(str)) err(W, "mission.checklist needs 3-5 items");
  });
  if (types.filter((t) => t === "oral").length !== 2) err("file", "exactly 2 oral and 2 ecrit missions per level");
  total += errors.length;
  console.log(`${file}: ${errors.length} errors`);
  errors.forEach((e) => console.log("  ERROR " + e));
}
console.log(`TOTAL: ${total} errors`);
process.exit(total ? 1 : 0);
