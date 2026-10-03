// Builds the app into one HTML file (artifact page) plus a standalone full document.
import { build } from "esbuild";
import { readFileSync, readdirSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { buildDictionary } from "./tools/dictionary.mjs";

const root = dirname(fileURLToPath(import.meta.url));
const contentDir = process.env.CONTENT_DIR || join(root, "content");

const levels = [];
for (const f of readdirSync(contentDir).filter((f) => /^level-\d\d\.json$/.test(f)).sort()) {
  const lvl = JSON.parse(readFileSync(join(contentDir, f), "utf8").replace(/^\uFEFF/, ""));
  const extraPath = join(contentDir, f.replace("level-", "extra-"));
  if (existsSync(extraPath)) {
    const extra = JSON.parse(readFileSync(extraPath, "utf8").replace(/^\uFEFF/, ""));
    for (const x of extra.units || []) {
      const u = lvl.units.find((u) => u.id === x.unit);
      if (u) {
        u.pron = x.pron;
        u.mission = x.mission;
      }
    }
  }
  levels.push(lvl);
}

// V2 content: optional files, injected as window.__EXTRA__ (missing files simply disable a feature).
const readOpt = (name) => {
  const p = join(contentDir, name);
  return existsSync(p) ? JSON.parse(readFileSync(p, "utf8").replace(/^\uFEFF/, "")) : null;
};
const extra = { boss: {}, lexicon: {} };
for (const f of readdirSync(contentDir)) {
  let m = f.match(/^boss-(\d\d)\.json$/);
  if (m) extra.boss[Number(m[1])] = readOpt(f);
  m = f.match(/^lexicon-(\d\d)\.json$/);
  if (m) extra.lexicon[Number(m[1])] = readOpt(f).words;
}
for (const [k, f] of [["placement", "placement.json"], ["writing", "writing.json"], ["humor", "humor.json"], ["wordform", "wordform.json"], ["c2uoe", "c2-uoe.json"], ["c2papers", "c2-papers.json"]]) extra[k] = readOpt(f);

const dict = buildDictionary(root, levels);

const js = await build({
  entryPoints: [join(root, "src/main.js")],
  bundle: true,
  format: "iife",
  target: "es2020",
  write: false,
  minify: !process.argv.includes("--dev"),
  legalComments: "none",
});
const css = ["src/styles.css", "src/styles-v2.css"].filter((p) => existsSync(join(root, p))).map((p) => readFileSync(join(root, p), "utf8")).join("\n");
const data = JSON.stringify(levels).replace(/</g, "\\u003c");
const extraData = JSON.stringify(extra).replace(/</g, "\\u003c");
const dictData = JSON.stringify(dict);
const fonts =
  '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:ital,wght@0,400;0,700;1,400&family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,800&family=JetBrains+Mono:wght@500;700&display=swap">';

const body = `<div id="app"><main id="view"><noscript><p>Mission Bilingue a besoin de JavaScript.</p></noscript></main></div>
<script>window.__CONTENT__=${data};window.__EXTRA__=${extraData};window.__DICT__=${dictData};</script>
<script>${js.outputFiles[0].text}</script>`;

const page = `<title>Mission Bilingue</title>
<meta name="description" content="Le défi d'anglais en 12 niveaux : leçons, prononciation, mini-jeux, tests et boss.">
${fonts}
<style>${css}</style>
${body}
`;
mkdirSync(join(root, "dist"), { recursive: true });
const out = process.env.OUT_PREFIX || "mission-bilingue";
writeFileSync(join(root, `dist/${out}.html`), page);

const standalone = `<!doctype html>
<html lang="fr-CA">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#0b6fd0">
<title>Mission Bilingue</title>
<meta name="description" content="Le défi d'anglais en 12 niveaux : leçons, prononciation, mini-jeux, tests et boss.">
${fonts}
<style>${css}</style>
</head>
<body>
${body}
</body>
</html>
`;
writeFileSync(join(root, `dist/${out}-standalone.html`), standalone);
// The published site (GitHub Pages) serves index.html at the repository root.
if (!process.env.OUT_PREFIX) writeFileSync(join(root, "index.html"), standalone);

const kb = (s) => `${Math.round(Buffer.byteLength(s) / 1024)} KB`;
console.log(`levels: ${levels.map((l) => l.id).join(", ") || "none"} · pron: ${levels.flatMap((l) => l.units).filter((u) => u.pron).length} units · page ${kb(page)}`);
