// Browser smoke test: walks through the main flows and reports console errors.
// Usage: node tools/smoke.mjs dist/test-standalone.html [--shots]
import { chromium } from "playwright-core";
import { resolve } from "node:path";
import { mkdirSync, existsSync } from "node:fs";

const file = resolve(process.argv[2] || "dist/test-standalone.html");
const shots = process.argv.includes("--shots");
const outDir = resolve("shots");
mkdirSync(outDir, { recursive: true });

const CANDIDATES = [process.env.PW_CHROME, "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", "C:/Program Files/Google/Chrome/Application/chrome.exe", "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"].filter(Boolean);
const browser = await chromium.launch({ executablePath: CANDIDATES.find((p) => existsSync(p)) });
const errors = [];

// Fake speech synthesis so the audio paths run headless.
const mockTTS = (withVoices) => {
  const voices = withVoices
    ? [
        { name: "Mock CA", lang: "en-CA", voiceURI: "mock-en", default: true, localService: true },
        { name: "Mock FR", lang: "fr-CA", voiceURI: "mock-fr", default: false, localService: true },
      ]
    : [];
  window.__spoken = [];
  const synth = {
    getVoices: () => voices,
    speak(u) {
      window.__spoken.push(u.text);
      setTimeout(() => u.onend && u.onend(), 30);
    },
    cancel() {},
    addEventListener() {},
  };
  Object.defineProperty(window, "speechSynthesis", { value: synth, configurable: true });
  window.SpeechSynthesisUtterance = function (t) {
    this.text = t;
  };
};

async function run({ name, viewport, scheme, tts, placement = false }) {
  const ctx = await browser.newContext({ viewport, colorScheme: scheme, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.setDefaultTimeout(6000);
  // Always mock speech: with voices (tts) or without any voice (silent device).
  await page.addInitScript(mockTTS, !!tts);
  page.on("pageerror", (e) => errors.push(`[${name}] pageerror: ${e.message}`));
  page.on("console", (m) => m.type() === "error" && !/fonts\.g|ERR_|net::/.test(m.text()) && errors.push(`[${name}] console: ${m.text()}`));
  await page.goto(`file:///${file.replace(/\\/g, "/").replace(/^\//, "")}`, { waitUntil: "domcontentloaded", timeout: 30000 });
  const shot = async (n) => shots && page.screenshot({ path: `${outDir}/${name}-${n}.png`, fullPage: false });
  const step = async (label, fn) => {
    try {
      await fn();
    } catch (e) {
      const info = await page.evaluate(() => [document.getElementById("view").dataset.screen, document.querySelectorAll(".game-card").length, document.querySelector(".dialog-title")?.textContent || "", document.querySelector(".toast.show")?.textContent || ""]).catch(() => []);
      errors.push(`[${name}] ${label}: ${e.message.split("\n")[0]} :: ${JSON.stringify(info)}`);
    }
  };

  await shot("01-onboarding");
  await step("onboarding", async () => {
    await page.fill("#player-name", "Noah");
    await page.click(".age-opt[data-age=ado]");
    await page.click("text=Monter à bord");
    await page.waitForSelector(".welcome");
  });
  await shot("01b-welcome");
  if (placement) {
    await step("placement test", async () => {
      await page.click("text=Je connais quelques bases");
      await page.waitForSelector(".placement");
      for (let i = 0; i < 40; i++) {
        if (await page.locator(".place-result").count()) break;
        const card = page.locator(".q-card");
        await card.waitFor({ timeout: 5000 });
        const kind = (await card.getAttribute("class")).match(/kind-(\w+)/)[1];
        if (kind === "fill") {
          await page.fill("#answer-input", "zzz");
          await page.keyboard.press("Enter");
        } else await page.locator(".choices .choice").nth(i % 2).click();
        if (i === 0) await shot("01c-placement-q");
        await page.waitForSelector(".feedback:not([hidden]) .btn-continue", { timeout: 4000 });
        await page.click(".btn-continue");
        await page.waitForTimeout(150);
      }
      await page.waitForSelector(".place-result");
      await page.waitForTimeout(900);
      await shot("01d-placement-result");
      await page.click("text=C'est parti !");
      await page.waitForSelector(".map");
    });
  } else {
    await step("start from zero", async () => {
      await page.click("text=Je débute de zéro");
      await page.waitForSelector(".map");
    });
  }
  await shot("02-map");
  await step("open unit", async () => {
    await page.click(".next-card");
    await page.waitForSelector(".unit");
  });
  await shot("03-lesson");
  await step("lesson narration", async () => {
    const btn = page.locator(".coach-btn");
    if (await btn.isVisible()) {
      await btn.click();
      await page.waitForTimeout(400);
      await btn.click();
    }
  });
  await step("lesson -> pron", async () => {
    await page.click("text=J'ai compris, étape suivante");
    await page.waitForSelector(".body-pron");
  });
  await shot("04-pron");
  await step("coach + ear training", async () => {
    if (tts) {
      await page.click(".pron-card .coach-btn");
      await page.waitForTimeout(300);
      await page.click(".pron-card .coach-btn");
      await page.click("text=Commencer l'entraînement");
      for (let i = 0; i < 8; i++) {
        await page.waitForSelector(".ear-round .choice:not([disabled])", { timeout: 4000 });
        await page.locator(".ear-round .choice").first().click();
        await page.waitForTimeout(1000);
      }
      await page.waitForSelector(".ear-end");
      await shot("05-ear-end");
      await page.click(".ear-end >> text=Étape suivante");
    } else {
      await page.click("text=Oui, étape suivante");
    }
    await page.waitForSelector(".body-words");
  });
  await step("flashcards", async () => {
    await page.click("text=Réviser en cartes");
    await page.click(".fc");
    await page.waitForTimeout(600);
    await shot("06-flashcard");
    await page.click("text=Je savais");
    await page.click("text=Je les connais, étape suivante");
    await page.waitForSelector(".body-practice");
  });
  await shot("07-practice");
  await step("mission", async () => {
    await page.click(".mission .btn-primary");
    for (const c of await page.locator(".mission .check input").all()) await c.check();
    await page.click("text=Mission accomplie");
  });
  // Play every game briefly.
  const games = ["Paires express", "Pluie de mots", "Éclair", "Bulles sonores", "Épelle-le", "Le Constructeur", "Chasse aux fautes", "Dictée flash", "Défi grammaire"];
  for (const g of games) {
    await step(`game ${g}`, async () => {
     try {
      await page.waitForTimeout(300);
      await page.click(`.game-card:has-text("${g}")`);
      await page.waitForTimeout(500);
      const off = await page.locator(".g-intro").count();
      if (!off) return;
      await page.click(".g-intro >> text=Jouer");
      await page.waitForTimeout(1800);
      await shot(`08-game-${g.replace(/\W+/g, "_")}`);
      // Interact a little
      if (g === "Paires express") for (const c of (await page.locator(".mem-card").all()).slice(0, 4)) await c.click().catch(() => {});
      if (g === "Pluie de mots") await page.fill("#rain-input", "hello");
      if (g === "Éclair") for (let i = 0; i < 4; i++) await page.keyboard.press("ArrowRight");
      if (g === "Bulles sonores") await page.waitForTimeout(800);
      if (g === "Épelle-le") for (const k of "hello") await page.keyboard.press(k);
      if (g === "Le Constructeur") {
        for (let k = 0; k < 3; k++) if (await page.locator(".build-bank .tile").count()) await page.locator(".build-bank .tile").first().click();
        await page.click(".btn-validate");
        await page.waitForTimeout(300);
      }
      if (g === "Chasse aux fautes") await page.locator(".hunt-words .word-chip").nth(1).click();
      if (g === "Dictée flash") {
        await page.fill("#answer-input", "My name is Lucas.");
        await page.keyboard.press("Enter");
      }
      if (g === "Défi grammaire") await page.waitForTimeout(300);
      await page.waitForTimeout(500);
      await shot(`09-game-${g.replace(/\W+/g, "_")}-play`);
     } finally {
      if (await page.locator(".g-top .icon-btn").count()) await page.click(".g-top .icon-btn");
      await page.waitForTimeout(700);
      await page.waitForSelector(".body-practice");
     }
    });
  }
  await step("test step", async () => {
    await page.click('.step[data-step="test"]');
    await page.click("text=Commencer le test");
    await page.waitForTimeout(400);
    if (await page.locator(".dialog").count()) await page.click(".dialog >> text=Tenter quand même");
    await page.waitForSelector(".quiz");
  });
  await shot("10-test-q1");
  // Answer all questions (some right, some wrong).
  await step("test answers", async () => {
    for (let i = 0; i < 20; i++) {
      if (await page.locator(".results").count()) break;
      const card = page.locator(".q-card");
      await card.waitFor({ timeout: 5000 });
      const kind = (await card.getAttribute("class")).match(/kind-(\w+)/)[1];
      if (["type_en", "listen_type", "dictation", "fill"].includes(kind)) {
        await page.fill("#answer-input", "hello");
        await page.keyboard.press("Enter");
      } else if (kind === "build") {
        await page.locator(".build-bank .tile").first().click();
        await page.click(".btn-validate");
      } else if (kind === "error") {
        await page.locator(".error-words .word-chip").nth(1).click();
        if (await page.locator("#answer-input").count()) {
          await page.fill("#answer-input", "is");
          await page.keyboard.press("Enter");
        }
      } else {
        await page.locator(".choices .choice").first().click();
      }
      await page.waitForSelector(".feedback:not([hidden])", { timeout: 4000 });
      if (i === 1) await shot("11-feedback");
      await page.waitForTimeout(300);
      await page.click(".btn-continue");
      await page.waitForTimeout(250);
    }
    await page.waitForSelector(".results", { timeout: 5000 });
    await page.waitForTimeout(2200);
  });
  await shot("12-results");
  await step("review notebook", async () => {
    await page.click("text=Réviser ces erreurs maintenant");
    await page.waitForSelector(".quiz");
    await page.click(".quiz-top .icon-btn");
    await page.click(".dialog >> text=Quitter");
    await page.waitForSelector(".review");
  });
  await shot("13-review");
  await step("profile", async () => {
    await page.click(".topbar .icon-btn");
    await page.click(".player-chip");
    await page.waitForSelector(".profile");
    await shot("14-profile");
    // The management zone (PIN) and its "unlock all" switch were removed on purpose.
    if (await page.locator("text=Ouvrir la zone gestion").count()) throw new Error("the management zone is back");
    await page.waitForSelector("#ai-key");
    if (await page.locator("#ai-key").inputValue()) throw new Error("the saved API key is put back in the field");
  });
  await step("boss", async () => {
    // The boss of line 1 opens once its stations are passed.
    await page.evaluate(() => {
      const g = JSON.parse(localStorage.getItem("mission-bilingue:global"));
      const key = `mission-bilingue:p:${g.activeId}`;
      const s = JSON.parse(localStorage.getItem(key));
      for (const u of ["1.1", "1.2", "1.3", "1.4", "1.5"]) s.units[u] = { ...(s.units[u] || {}), passed: true, best: 0.9, stars: 1 };
      localStorage.setItem(key, JSON.stringify(s));
    });
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForSelector(".map");
    await page.locator(".station.boss .station-btn").first().click();
    await page.waitForTimeout(400);
    if (await page.locator(".dialog").count()) await page.click(".dialog >> text=Affronter le boss");
    await page.waitForSelector(".boss-intro");
    await page.waitForTimeout(900);
    await shot("16-boss-intro");
    await page.click("text=Combattre");
    await page.waitForSelector(".arena");
    for (let i = 0; i < 30; i++) {
      if (await page.locator(".boss-results").count()) break;
      if (await page.locator(".feedback:not([hidden]) .btn-continue").count()) { await page.click(".btn-continue"); await page.waitForTimeout(1500); continue; }
      if (!(await page.locator(".heart.on").count())) { await page.waitForTimeout(2500); continue; }
      const card = page.locator(".q-card");
      await card.waitFor({ timeout: 5000 });
      const kind = (await card.getAttribute("class")).match(/kind-(\w+)/)[1];
      if (["type_en", "listen_type", "dictation", "fill"].includes(kind)) {
        await page.fill("#answer-input", "zzz");
        await page.keyboard.press("Enter");
      } else if (kind === "build") {
        await page.locator(".build-bank .tile").first().click();
        await page.click(".btn-validate");
      } else if (kind === "error") {
        await page.locator(".error-words .word-chip").nth(0).click();
        await page.waitForTimeout(200);
        if (await page.locator("#answer-input").count()) {
          await page.fill("#answer-input", "zzz");
          await page.keyboard.press("Enter");
        }
      } else await page.locator(".choices .choice").first().click();
      await page.waitForTimeout(900);
      if (i === 0) await shot("17-boss-fight");
      if (await page.locator(".btn-continue").count()) await page.click(".btn-continue");
      await page.waitForTimeout(300);
    }
    await page.waitForSelector(".boss-results", { timeout: 6000 });
    await page.waitForTimeout(800);
    await shot("18-boss-end");
  });
  // Horizontal overflow check on the map.
  await step("overflow", async () => {
    await page.click("text=Réseau");
    await page.waitForSelector(".map");
    const over = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    if (over > 1) errors.push(`[${name}] horizontal overflow ${over}px on map`);
    await page.evaluate(() => scrollTo(0, 900));
    await shot("19-map-scrolled");
  });
  await ctx.close();
}

await run({ name: "mobile-light", viewport: { width: 390, height: 844 }, scheme: "light", tts: true });
await run({ name: "desktop-dark", viewport: { width: 1280, height: 860 }, scheme: "dark", tts: false, placement: true });
await browser.close();
console.log(errors.length ? errors.join("\n") : "NO ERRORS");
process.exit(errors.length ? 1 : 0);
