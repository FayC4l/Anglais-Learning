// Monkey test: hundreds of random clicks and inputs all over the app (desktop and phone), reporting every page error.
// Usage: node tools/monkey.mjs [index.html] [--steps 600] [--seed 1]
import { chromium } from "playwright-core";
import { resolve } from "node:path";
import { existsSync, mkdirSync } from "node:fs";

const arg = (n, d) => (process.argv.includes(n) ? process.argv[process.argv.indexOf(n) + 1] : d);
const file = resolve(process.argv[2] && !process.argv[2].startsWith("--") ? process.argv[2] : "index.html");
const STEPS = Number(arg("--steps", 600));
let seed = Number(arg("--seed", 1));
const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
mkdirSync("shots", { recursive: true });
const CANDIDATES = [process.env.PW_CHROME, "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", "C:/Program Files/Google/Chrome/Application/chrome.exe"].filter(Boolean);
const browser = await chromium.launch({ executablePath: CANDIDATES.find((p) => existsSync(p)) });
const errors = [];

async function run(label, viewport) {
  const ctx = await browser.newContext({ viewport, reducedMotion: "reduce", isMobile: viewport.width < 600, hasTouch: viewport.width < 600 });
  const page = await ctx.newPage();
  page.setDefaultTimeout(3000);
  await page.addInitScript(() => {
    const voices = [{ name: "Mock", lang: "en-CA", voiceURI: "m", default: true, localService: true }, { name: "MockFr", lang: "fr-CA", voiceURI: "f", localService: true }];
    Object.defineProperty(window, "speechSynthesis", { value: { getVoices: () => voices, speak(u) { setTimeout(() => u.onend && u.onend(), 10); }, cancel() {}, addEventListener() {} }, configurable: true });
    window.SpeechSynthesisUtterance = function (t) { this.text = t; };
    window.print = () => {};
  });
  const screens = new Set();
  page.on("pageerror", async (e) => errors.push(`[${label}] pageerror on "${await page.locator("#view").getAttribute("data-screen").catch(() => "?")}": ${e.message}`));
  page.on("console", (m) => m.type() === "error" && !/fonts\.g|ERR_|net::|Failed to load resource/.test(m.text()) && errors.push(`[${label}] console: ${m.text()}`));
  await page.goto(`file:///${file.replace(/\\/g, "/").replace(/^\//, "")}`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.fill("#player-name", "Monkey");
  await page.click(".age-opt[data-age=ado]");
  await page.click("text=Monter à bord");
  await page.click("text=Je débute de zéro");
  await page.waitForSelector(".map");
  // Open every level (the Tower included), with some progress around.
  await page.evaluate(() => {
    const g = JSON.parse(localStorage.getItem("mission-bilingue:global"));
    const key = `mission-bilingue:p:${g.activeId}`;
    const s = JSON.parse(localStorage.getItem(key));
    for (let L = 1; L <= 11; L++) s.bosses[L] = { defeated: true, at: new Date().toISOString() };
    s.units["3.1"] = { passed: true, best: 0.9, stars: 1 };
    s.mistakes["3.1:v1"] = { n: 2, at: new Date().toISOString() };
    localStorage.setItem(key, JSON.stringify(s));
  });
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForSelector(".map");
  const SEL = "button:visible, [role=button]:visible, a[href]:visible, .choice:visible, .tile:visible, .word-chip:visible, select:visible, input:visible, textarea:visible, label.check:visible, .tower-floor.now:visible";
  for (let i = 0; i < STEPS; i++) {
    screens.add(await page.locator("#view").getAttribute("data-screen").catch(() => "?"));
    const els = await page.locator(SEL).all();
    if (!els.length) {
      await page.waitForTimeout(150);
      continue;
    }
    const el = els[Math.floor(rnd() * els.length)];
    try {
      const tag = await el.evaluate((n) => n.tagName.toLowerCase() + (n.type ? `:${n.type}` : ""));
      if (tag.startsWith("input:text") || tag.startsWith("textarea") || tag === "input:search" || tag === "input") {
        await el.fill(["went", "hello", "I have been", "zzz", "", "The cat is on the table."][Math.floor(rnd() * 6)]);
        if (rnd() < 0.6) await el.press("Enter");
      } else if (tag.startsWith("select")) {
        const opts = await el.locator("option").count();
        if (opts > 1) await el.selectOption({ index: 1 + Math.floor(rnd() * (opts - 1)) });
      } else if (tag.startsWith("input:file")) {
        continue;
      } else {
        const text = ((await el.innerText().catch(() => "")) || "").slice(0, 60);
        // Leave the dangerous / external ones alone: they are tested elsewhere.
        if (/Supprimer|Effacer tout|Recommencer à zéro|Télécharger|fichier|Imprimer/i.test(text)) continue;
        await el.click({ timeout: 1500 });
      }
    } catch {
      /* element vanished or covered: try another */
    }
    if (rnd() < 0.03) await page.keyboard.press("Escape").catch(() => {});
    await page.waitForTimeout(40 + rnd() * 120);
  }
  await page.screenshot({ path: `shots/monkey-${label}.png` });
  console.log(`[${label}] ${STEPS} actions · screens visited: ${[...screens].filter(Boolean).sort().join(", ")}`);
  // Horizontal overflow check on the screen where the monkey stopped.
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  if (overflow > 2) errors.push(`[${label}] page wider than the screen by ${overflow}px on "${await page.locator("#view").getAttribute("data-screen")}"`);
  await ctx.close();
}

await run("desktop", { width: 1280, height: 860 });
await run("phone", { width: 375, height: 760 });
await browser.close();
console.log(errors.length ? [...new Set(errors)].join("\n") : "NO ERRORS");
process.exit(errors.length ? 1 : 0);
