// Inserts (or replaces) a bonus station into its level and extra files.
// Usage: node tools/merge-unit.mjs content/new/unit-3.5.json [more]
// Input file: { "unit": { ...unit as in level-XX.json, id "L.5"... }, "extra": { ...entry as in extra-XX.json, unit "L.5"... } }
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => JSON.parse(readFileSync(p, "utf8").replace(/^﻿/, ""));

for (const file of process.argv.slice(2)) {
  const { unit, extra } = read(file);
  const [L, U] = String(unit?.id || "").split(".").map(Number);
  if (!L || !U || extra?.unit !== unit.id) {
    console.log(`${file}: unit.id and extra.unit must match (e.g. "3.5")`);
    process.exitCode = 1;
    continue;
  }
  const pad = String(L).padStart(2, "0");
  for (const [name, item, key] of [[`level-${pad}.json`, unit, "id"], [`extra-${pad}.json`, extra, "unit"]]) {
    const p = join(root, "content", name);
    const data = read(p);
    const i = data.units.findIndex((u) => u[key] === item[key]);
    if (i >= 0) data.units[i] = item;
    else data.units.splice(U - 1, 0, item);
    writeFileSync(p, JSON.stringify(data, null, 2) + "\n");
  }
  console.log(`${file}: merged ${unit.id} into level-${pad}.json and extra-${pad}.json`);
}
