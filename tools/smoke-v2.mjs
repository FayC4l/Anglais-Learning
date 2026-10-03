// Browser smoke test of the V2 features: profiles, daily training, conjugator, writing, C2, dashboard, boss phases.
// Usage: node tools/smoke-v2.mjs [index.html] [--shots]
import { chromium } from "playwright-core";
import { resolve } from "node:path";
import { mkdirSync, existsSync } from "node:fs";

const file = resolve(process.argv[2] && !process.argv[2].startsWith("--") ? process.argv[2] : "index.html");
const shots = process.argv.includes("--shots");
const outDir = resolve("shots");
mkdirSync(outDir, { recursive: true });
const CANDIDATES = [process.env.PW_CHROME, "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", "C:/Program Files/Google/Chrome/Application/chrome.exe", "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"].filter(Boolean);
const browser = await chromium.launch({ executablePath: CANDIDATES.find((p) => existsSync(p)) });
const errors = [];

const mockTTS = () => {
  const voices = [{ name: "Mock CA", lang: "en-CA", voiceURI: "mock-en", default: true, localService: true }, { name: "Mock FR", lang: "fr-CA", voiceURI: "mock-fr", default: false, localService: true }];
  const synth = { getVoices: () => voices, speak(u) { setTimeout(() => u.onend && u.onend(), 20); }, cancel() {}, addEventListener() {} };
  Object.defineProperty(window, "speechSynthesis", { value: synth, configurable: true });
  window.SpeechSynthesisUtterance = function (t) { this.text = t; };
};

const ctx = await browser.newContext({ viewport: { width: 1200, height: 900 } });
const page = await ctx.newPage();
page.setDefaultTimeout(7000);
await page.addInitScript(mockTTS);
page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
page.on("console", (m) => m.type() === "error" && !/fonts\.g|ERR_|net::/.test(m.text()) && errors.push(`console: ${m.text()}`));
await page.goto(`file:///${file.replace(/\\/g, "/").replace(/^\//, "")}`);
const shot = async (n) => shots && page.screenshot({ path: `${outDir}/v2-${n}.png` });
const step = async (label, fn) => {
  try {
    await fn();
  } catch (e) {
    const screen = await page.evaluate(() => document.getElementById("view").dataset.screen).catch(() => "?");
    errors.push(`${label}: ${e.message.split("\n")[0]} [screen ${screen}]`);
    await shot(`fail-${label.replace(/\W+/g, "_")}`);
  }
};
const answerCurrent = async (text = "zzz") => {
  const card = page.locator(".q-card");
  await card.waitFor({ timeout: 5000 });
  const kind = (await card.getAttribute("class")).match(/kind-(\w+)/)[1];
  if (["type_en", "listen_type", "dictation", "fill"].includes(kind)) {
    await page.fill("#answer-input", text);
    await page.keyboard.press("Enter");
  } else if (kind === "build") {
    await page.locator(".build-bank .tile").first().click();
    await page.click(".btn-validate");
  } else if (kind === "error") {
    await page.locator(".error-words .word-chip").first().click();
    if (await page.locator("#answer-input").count()) {
      await page.fill("#answer-input", text);
      await page.keyboard.press("Enter");
    }
  } else await page.locator(".choices .choice").first().click();
};

await step("create two profiles", async () => {
  await page.fill("#player-name", "Lina");
  await page.click(".age-opt[data-age=enfant]");
  await page.click("text=Monter à bord");
  await page.click("text=Je débute de zéro");
  await page.waitForSelector(".map");
  await page.click(".player-chip");
  await page.click("text=Ajouter un membre de la famille");
  await page.fill("#player-name", "Papa");
  await page.click(".age-opt[data-age=adulte]");
  await page.click("text=Créer le profil");
  await page.waitForSelector(".welcome");
  await page.click("text=Je débute de zéro");
  await page.waitForSelector(".map");
  await page.reload();
  await page.waitForSelector(".who");
  const n = await page.locator(".who-card:not(.add)").count();
  if (n !== 2) throw new Error(`${n} profiles on the picker`);
  await shot("01-who");
  await page.locator(".who-card", { hasText: "Lina" }).click();
  await page.waitForSelector(".map");
  await shot("02-map");
});

await step("daily training", async () => {
  await page.click(".tool-card:has-text('Entraînement du jour')");
  await page.waitForSelector(".quiz, .results");
  for (let i = 0; i < 20; i++) {
    if (await page.locator(".results").count()) break;
    await answerCurrent();
    await page.waitForSelector(".feedback:not([hidden]) .btn-continue");
    await page.click(".btn-continue");
    await page.waitForSelector(".feedback", { state: "hidden" }).catch(() => {});
    await page.waitForTimeout(250);
  }
  await page.waitForSelector(".results");
  await shot("03-daily-end");
  await page.click("text=Retour au réseau");
});

await step("conjugator", async () => {
  await page.click(".tool-card:has-text('Conjugueur')");
  await page.waitForSelector(".conjugator");
  await page.fill("#verb-search", "swim");
  await page.keyboard.press("Enter");
  await page.waitForSelector(".conj-verb:has-text('to swim')");
  await page.click(".chip:has-text('Négatif')");
  const txt = await page.locator(".conj-tables").innerText();
  if (!/didn't swim/.test(txt) || !/hasn't swum/.test(txt)) throw new Error("negative tables look wrong");
  await shot("04-conjugator");
  await page.click("text=M'entraîner sur ce verbe");
  await page.waitForSelector(".quiz");
  await page.waitForSelector(".gap-group");
  await shot("05-gap-boxes");
  await page.locator(".quiz-top .icon-btn").click();
  await page.click(".dialog >> text=Quitter");
  await page.waitForSelector(".conjugator");
  await page.click(".topbar .icon-btn");
});

await step("writing workshop", async () => {
  await page.click(".tool-card:has-text('Atelier')");
  await page.waitForSelector(".writing");
  await page.locator(".w-card").first().click();
  await page.waitForSelector("#w-text");
  await page.fill("#w-text", "Hi Emma!\nMy name is Lina and i have twelve years. I live in Ottawa since two years. My brother play hockey every day and he go to school by bus. I like very much pizza. See you soon!\nLina");
  await page.click("text=Faire corriger");
  await page.waitForSelector(".w-report");
  const marks = await page.locator(".w-annotated .w-err").count();
  if (marks < 5) throw new Error(`only ${marks} issues marked`);
  await page.locator(".w-annotated .w-err").first().click();
  await page.waitForSelector(".w-detail .w-issue");
  await shot("06-writing-report");
  await page.click("text=Corriger mon texte et resoumettre");
  await page.waitForSelector("#w-text");
  await page.click(".topbar .icon-btn");
  await page.waitForSelector(".w-grid");
  await page.click(".topbar .icon-btn");
  await page.waitForSelector(".map");
});

await step("C2 parts", async () => {
  await page.click(".tool-card:has-text('Prépa C2')");
  await page.waitForSelector(".c2");
  await shot("07-c2");
  await page.click(".c2-part:has-text('Part 1')");
  await page.waitForSelector(".c2-select");
  for (const s of await page.locator(".c2-select").all()) await s.selectOption({ index: 1 });
  await page.click("text=Corriger");
  await page.waitForSelector(".c2-score");
  await shot("08-c2-part1");
  await page.click("text=Continuer");
  await page.waitForSelector(".results");
  await page.click("text=Retour à la prépa C2");
  await page.click(".c2-part:has-text('Part 4')");
  await page.waitForSelector(".q-lead");
  await shot("09-c2-part4");
  await page.locator(".quiz-top .icon-btn").click();
  await page.click(".dialog >> text=Quitter");
  await page.waitForSelector(".c2");
  await page.click(".c2-part:has-text('Listening')");
  await page.click("text=Écouter l'enregistrement");
  await page.waitForTimeout(300);
  for (const q of await page.locator(".c2-q").all()) await q.locator("input").first().check();
  await page.click("text=Corriger");
  await page.waitForSelector(".c2-score");
  await page.click("text=Continuer");
  await page.click("text=Retour à la prépa C2");
  await page.click(".c2-part:has-text('Part 6')");
  await page.waitForSelector(".c2-options");
  await shot("10-c2-part6");
  await page.click(".topbar .icon-btn");
  await page.waitForSelector(".c2");
  await page.click(".topbar .icon-btn");
});

await step("dashboard", async () => {
  await page.click(".tool-card:has-text('compétences')");
  await page.waitForSelector(".radar");
  await shot("11-dashboard");
  await page.click(".topbar .icon-btn");
  await page.waitForSelector(".profile");
  await page.click(".topbar .icon-btn");
});

await step("boss phases", async () => {
  await page.locator(".station.boss .station-btn").first().click();
  await page.waitForTimeout(400);
  if (await page.locator(".dialog").count()) await page.click(".dialog >> text=Affronter le boss");
  await page.click("text=Combattre");
  await page.waitForSelector(".arena");
  const total = await page.evaluate(() => document.querySelector(".quiz-count").textContent);
  if (!/\/\s*2\d/.test(total)) throw new Error(`boss has ${total} questions`);
  await shot("12-boss");
});

await ctx.close();
await browser.close();
console.log(errors.length ? errors.join("\n") : "NO ERRORS");
process.exit(errors.length ? 1 : 0);
