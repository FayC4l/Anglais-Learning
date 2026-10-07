// Phone-size screenshots of the Tower screens (map card, tower, surprise, drama, collapse, victory, final dialog).
// Usage: node tools/shots-tower-mobile.mjs [index.html]
import { chromium } from "playwright-core";
import { resolve } from "node:path";
import { existsSync, mkdirSync } from "node:fs";

const file = resolve(process.argv[2] || "index.html");
mkdirSync("shots", { recursive: true });
const CANDIDATES = [process.env.PW_CHROME, "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", "C:/Program Files/Google/Chrome/Application/chrome.exe"].filter(Boolean);
const browser = await chromium.launch({ executablePath: CANDIDATES.find((p) => existsSync(p)) });
const ctx = await browser.newContext({ viewport: { width: 375, height: 740 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const patch = async (fn) => {
  await page.evaluate((src) => {
    const g = JSON.parse(localStorage.getItem("mission-bilingue:global"));
    const key = `mission-bilingue:p:${g.activeId}`;
    const s = JSON.parse(localStorage.getItem(key));
    new Function("s", src)(s);
    localStorage.setItem(key, JSON.stringify(s));
  }, `(${fn})(s)`);
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForSelector(".map");
};
const overflow = async (name) => {
  const o = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  if (o > 2) errors.push(`${name}: ${o}px wider than the phone`);
};
await page.goto(`file:///${file.replace(/\\/g, "/").replace(/^\//, "")}`, { waitUntil: "domcontentloaded", timeout: 30000 });
await page.fill("#player-name", "Lynda");
await page.click(".age-opt[data-age=ado]");
await page.click("text=Monter à bord");
await page.click("text=Je débute de zéro");
await page.waitForSelector(".map");
await patch((s) => {
  for (let L = 1; L <= 11; L++) s.bosses[L] = { defeated: true, at: new Date().toISOString() };
  s.tower = { floor: 7, lives: 6, best: 7, resets: 1, won: false, wonAt: "", shown: 6, pending: 0 };
});
await page.locator("#line-12").scrollIntoViewIfNeeded();
await page.screenshot({ path: "shots/m-01-card.png" });
await overflow("map");
await page.click(".next-card.tower-hero");
await page.waitForSelector(".reveal .reveal-btn:not([hidden])");
await page.screenshot({ path: "shots/m-02-surprise.png" });
await overflow("surprise");
await page.click(".reveal-btn");
await page.waitForSelector(".reveal", { state: "detached" });
await page.screenshot({ path: "shots/m-03-tower.png", fullPage: true });
await overflow("tower");
await page.click(".tower-go");
await page.waitForSelector(".tower-intro");
await page.screenshot({ path: "shots/m-04-intro.png" });
await page.click("text=Combattre");
await page.waitForSelector(".arena");
await page.waitForTimeout(400);
await page.screenshot({ path: "shots/m-05-fight.png" });
await overflow("fight");
await page.locator(".quiz-top .icon-btn").click();
await page.click(".dialog >> text=Quitter");
await page.waitForSelector(".drama .drama-btn:not([hidden])", { timeout: 8000 });
await page.screenshot({ path: "shots/m-06-drama.png" });
await page.click(".drama-btn");
await patch((s) => Object.assign(s.tower, { floor: 50, shown: 49, lives: 2 }));
await page.click(".next-card.tower-hero");
await page.click(".tower-go");
await page.waitForSelector(".dialog");
await page.screenshot({ path: "shots/m-07-final-dialog.png" });
await page.click(".dialog >> text=Plus tard");
await patch((s) => Object.assign(s.tower, { won: true, wonAt: new Date().toISOString() }));
await page.click("#line-12 .tower-card");
await page.waitForSelector(".tower-victory");
await page.waitForTimeout(600);
await page.screenshot({ path: "shots/m-08-victory.png" });
await overflow("victory");
await browser.close();
console.log(errors.length ? errors.join("\n") : "NO ERRORS");
