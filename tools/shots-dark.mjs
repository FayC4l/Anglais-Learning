// Phone-size screenshots of the main screens in DARK mode (prefers-color-scheme: dark), for a visual check.
// Usage: node tools/shots-dark.mjs [index.html] [--light]   → shots/dark-*.png
import { chromium } from "playwright-core";
import { resolve } from "node:path";
import { existsSync, mkdirSync } from "node:fs";

const file = resolve(process.argv[2] && !process.argv[2].startsWith("--") ? process.argv[2] : "index.html");
const scheme = process.argv.includes("--light") ? "light" : "dark";
mkdirSync("shots", { recursive: true });
const CANDIDATES = [process.env.PW_CHROME, "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", "C:/Program Files/Google/Chrome/Application/chrome.exe"].filter(Boolean);
const browser = await chromium.launch({ executablePath: CANDIDATES.find((p) => existsSync(p)) });
const ctx = await browser.newContext({ viewport: { width: 390, height: 780 }, isMobile: true, hasTouch: true, colorScheme: scheme, reducedMotion: "reduce" });
const page = await ctx.newPage();
page.setDefaultTimeout(10000);
await page.addInitScript(() => {
  const voices = [{ name: "Mock", lang: "en-CA", voiceURI: "m", default: true, localService: true }];
  Object.defineProperty(window, "speechSynthesis", { value: { getVoices: () => voices, speak(u) { setTimeout(() => u.onend && u.onend(), 10); }, cancel() {}, addEventListener() {} }, configurable: true });
  window.SpeechSynthesisUtterance = function (t) { this.text = t; };
});
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
let n = 0;
const shot = async (name) => page.screenshot({ path: `shots/${scheme}-${String(++n).padStart(2, "0")}-${name}.png` });
const patch = async (fn) => {
  await page.evaluate((src) => {
    const g = JSON.parse(localStorage.getItem("mission-bilingue:global"));
    const key = `mission-bilingue:p:${g.activeId}`;
    const s = JSON.parse(localStorage.getItem(key));
    new Function("s", src)(s);
    localStorage.setItem(key, JSON.stringify(s));
    localStorage.removeItem("mission-bilingue:towers");
  }, `(${fn})(s)`);
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForSelector(".map");
};
const away = async (ms) => {
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await page.waitForTimeout(ms);
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));
  });
};
const step = async (label, fn) => {
  try {
    await fn();
  } catch (e) {
    errors.push(`${label}: ${e.message.split("\n")[0]}`);
  }
};

await page.goto(`file:///${file.replace(/\\/g, "/").replace(/^\//, "")}`, { waitUntil: "domcontentloaded", timeout: 30000 });
await page.fill("#player-name", "Hamza");
await page.click(".age-opt[data-age=ado]");
await page.click("text=Monter à bord");
await page.click("text=Je débute de zéro");
await page.waitForSelector(".map");
await patch((s) => {
  for (let L = 1; L <= 11; L++) s.bosses[L] = { defeated: true, at: new Date().toISOString() };
  s.tower = { floor: 6, lives: 187, maxLives: 200, best: 6, resets: 0, won: false, wonAt: "", shown: 5, pending: 0 };
  s.alerts = [{ at: new Date().toISOString(), screen: "tower", how: "test" }];
});

await step("map", async () => {
  await page.locator("#line-12").scrollIntoViewIfNeeded();
  await shot("map-tower-card");
});
await step("surprise", async () => {
  await page.click(".next-card.tower-hero");
  await page.waitForSelector(".reveal .reveal-btn:not([hidden])");
  await shot("surprise");
  await page.click(".reveal-btn");
  await page.waitForSelector(".reveal", { state: "detached" });
  await shot("tower");
});
await step("fight", async () => {
  await page.click(".tower-go");
  await page.waitForSelector(".tower-intro");
  await shot("floor-intro");
  await page.click("text=Combattre");
  await page.waitForSelector(".arena");
  await page.waitForTimeout(300);
  await shot("fight-question-watermark");
  const card = page.locator(".q-card");
  const kind = (await card.getAttribute("class")).match(/kind-(\w+)/)[1];
  if (kind === "fill") {
    await page.locator(".gap-box").first().fill("zzz");
    await page.keyboard.press("Enter");
  } else await page.locator(".choices .choice").last().click();
  await page.waitForSelector(".feedback:not([hidden])");
  await page.waitForTimeout(300);
  await shot("feedback");
});
await step("laugh and drama", async () => {
  await away(2300);
  await page.waitForSelector(".laugh");
  await page.waitForTimeout(500);
  await shot("laugh");
  await page.click(".laugh");
  await page.waitForSelector(".drama .drama-btn:not([hidden])");
  await shot("drama-fight-lost");
  await page.click(".drama-btn");
  await page.waitForSelector(".tower");
});
await step("writing boss", async () => {
  await patch((s) => Object.assign(s.tower, { floor: 5, shown: 5 }));
  await page.click(".next-card.tower-hero");
  await page.click(".tower-go");
  await page.waitForSelector("#w-text");
  await page.fill("#w-text", "I like school. My teacher is nice and I like English very much because it is good.");
  await shot("writing-editor");
  await page.click("text=Faire corriger");
  await page.waitForSelector(".drama .drama-btn:not([hidden])");
  await page.click(".drama-btn");
  await page.waitForTimeout(400);
  await shot("writing-report");
});
await step("c2 exercise", async () => {
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForSelector(".map");
  await page.click("text=Prépa C2");
  await page.click(".c2-part >> text=Part 1");
  await page.waitForSelector(".c2-ex");
  await shot("c2-exercise-watermark");
});
await step("profile", async () => {
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForSelector(".map");
  await page.click(".player-chip");
  await page.waitForSelector(".profile");
  await shot("profile");
});
await step("victory", async () => {
  await patch((s) => Object.assign(s.tower, { won: true, wonAt: new Date().toISOString() }));
  await page.click("#line-12 .tower-card");
  await page.waitForSelector(".tower-victory");
  await page.waitForTimeout(500);
  await shot("victory");
});
await browser.close();
console.log(errors.length ? errors.join("\n") : `NO ERRORS · ${n} screenshots (${scheme})`);
