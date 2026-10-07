// Browser test of the Tower (level 12): only 5 floors and the boss on show, a lost fight (heart drama), a fight fled
// by reloading the page, the collapse, a surprise floor, a failed writing boss, the victory screen.
// Usage: node tools/smoke-tower.mjs [index.html] [--shots]
import { chromium } from "playwright-core";
import { resolve } from "node:path";
import { mkdirSync, existsSync } from "node:fs";
import { TOWER_LIVES } from "../src/tower.js";

const file = resolve(process.argv[2] && !process.argv[2].startsWith("--") ? process.argv[2] : "index.html");
const shots = process.argv.includes("--shots");
mkdirSync("shots", { recursive: true });
const CANDIDATES = [process.env.PW_CHROME, "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", "C:/Program Files/Google/Chrome/Application/chrome.exe"].filter(Boolean);
const browser = await chromium.launch({ executablePath: CANDIDATES.find((p) => existsSync(p)) });
const errors = [];
const ctx = await browser.newContext({ viewport: { width: 1100, height: 860 } });
const page = await ctx.newPage();
page.setDefaultTimeout(8000);
await page.addInitScript(() => {
  const voices = [{ name: "Mock", lang: "en-CA", voiceURI: "m", default: true, localService: true }];
  Object.defineProperty(window, "speechSynthesis", { value: { getVoices: () => voices, speak(u) { setTimeout(() => u.onend && u.onend(), 10); }, cancel() {}, addEventListener() {} }, configurable: true });
  window.SpeechSynthesisUtterance = function (t) { this.text = t; };
});
page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
page.on("console", (m) => m.type() === "error" && !/fonts\.g|ERR_|net::/.test(m.text()) && errors.push(`console: ${m.text()}`));
const shot = async (n) => shots && page.screenshot({ path: `shots/tower-${n}.png` });
const step = async (label, fn) => {
  try {
    await fn();
  } catch (e) {
    errors.push(`${label}: ${e.message.split("\n")[0]}`);
    await page.screenshot({ path: `shots/tower-fail-${label.replace(/\W+/g, "_")}.png` }).catch(() => {});
  }
};
/** Edits the active profile's progress, then reloads. */
const patch = async (fn) => {
  await page.evaluate((src) => {
    const g = JSON.parse(localStorage.getItem("mission-bilingue:global"));
    const key = `mission-bilingue:p:${g.activeId}`;
    const s = JSON.parse(localStorage.getItem(key));
    new Function("s", src)(s);
    localStorage.setItem(key, JSON.stringify(s));
    localStorage.removeItem("mission-bilingue:towers"); // the test edits the tower on purpose
  }, `(${fn})(s)`);
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForSelector(".map");
};
/** The Tower saved in the browser for the active profile. */
const towerState = () =>
  page.evaluate(() => {
    const g = JSON.parse(localStorage.getItem("mission-bilingue:global"));
    return JSON.parse(localStorage.getItem(`mission-bilingue:p:${g.activeId}`)).tower;
  });
const answerWrong = async () => {
  const card = page.locator(".q-card");
  await card.waitFor();
  const kind = (await card.getAttribute("class")).match(/kind-(\w+)/)[1];
  if (["type_en", "listen_type", "dictation", "fill"].includes(kind)) {
    await page.fill("#answer-input", "zzz");
    await page.keyboard.press("Enter");
  } else if (kind === "error") {
    await page.locator(".error-words .word-chip").first().click();
    if (await page.locator("#answer-input").count()) {
      await page.fill("#answer-input", "zzz");
      await page.keyboard.press("Enter");
    }
  } else if (kind === "build") {
    await page.locator(".build-bank .tile").first().click();
    await page.click(".btn-validate");
  } else await page.locator(".choices .choice").last().click();
};

await page.goto(`file:///${file.replace(/\\/g, "/").replace(/^\//, "")}`, { waitUntil: "domcontentloaded", timeout: 30000 });
await step("setup a player at level 12", async () => {
  await page.fill("#player-name", "Hamza");
  await page.click(".age-opt[data-age=ado]");
  await page.click("text=Monter à bord");
  await page.click("text=Je débute de zéro");
  await page.waitForSelector(".map");
  await patch((s) => {
    for (let L = 1; L <= 11; L++) s.bosses[L] = { defeated: true, at: new Date().toISOString() };
  });
  await page.waitForSelector("#line-12 .tower-card");
  await shot("01-map");
  const card = await page.locator("#line-12").innerText();
  if (/\b50\b|cinquante/i.test(card) || !/5 étages/.test(card)) throw new Error(`map card: ${card}`);
});

await step("only 5 floors and the final boss are on show", async () => {
  await page.click(".next-card.tower-hero");
  await page.waitForSelector(".tower-floor.now");
  const n = await page.locator(".tower-floor").count();
  if (n !== 6) throw new Error(`${n} rows instead of 5 floors + the boss`);
  if ((await page.locator(".tower-floor.kind-final").count()) !== 1) throw new Error("no final boss row");
  const txt = await page.locator(".tower").innerText();
  if (/\b50\b|cinquante/i.test(txt)) throw new Error("the tower gives away its 50 floors");
  await page.click(".topbar .icon-btn");
  await page.waitForSelector(".map");
});

await step("a lost floor costs a heart, with drama", async () => {
  await page.click(".next-card.tower-hero");
  await page.waitForSelector(".tower-floor.now");
  await shot("02-tower");
  await page.click(".tower-go");
  await page.click("text=Combattre");
  await page.waitForSelector(".arena");
  for (let i = 0; i < 10 && !(await page.locator(".drama").count()); i++) {
    if (await page.locator(".feedback:not([hidden]) .btn-continue").count()) {
      await page.click(".btn-continue");
      await page.waitForTimeout(500);
      continue;
    }
    if (await page.locator(".q-mount.answered").count()) {
      await page.waitForTimeout(250);
      continue;
    }
    await answerWrong();
    await page.waitForTimeout(500);
  }
  await page.waitForSelector(".drama.life .drama-heart");
  await page.waitForTimeout(1500);
  await shot("03-drama-life");
  await page.click(".drama-btn");
  await page.waitForSelector(".tower");
  const hearts = (await towerState()).lives;
  if (hearts !== TOWER_LIVES - 1) throw new Error(`${hearts} hearts after a defeat`);
  if (!(await page.locator(".tower-lives").innerText()).includes(`${TOWER_LIVES - 1} / ${TOWER_LIVES}`)) throw new Error("hearts count not shown");
});

await step("closing the page during a fight costs a heart", async () => {
  if (!(await page.locator(".tower").count())) await page.click(".next-card.tower-hero");
  await page.click(".tower-go");
  await page.click("text=Combattre");
  await page.waitForSelector(".arena");
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForSelector(".map");
  await page.click(".next-card.tower-hero");
  await page.waitForSelector(".drama.life");
  const txt = await page.locator(".drama").innerText();
  if (!/fuir/i.test(txt)) throw new Error(`drama text: ${txt}`);
  await page.click(".drama-btn");
  await page.waitForSelector(".tower");
  const hearts = (await towerState()).lives;
  if (hearts !== TOWER_LIVES - 2) throw new Error(`${hearts} hearts after fleeing (${TOWER_LIVES - 2} expected)`);
});

await step("losing the last heart collapses the tower", async () => {
  await patch((s) => Object.assign(s.tower, { lives: 1, floor: 7, shown: 7 }));
  await page.click(".next-card.tower-hero");
  await page.click(".tower-go");
  await page.click("text=Combattre");
  await page.waitForSelector(".arena");
  await page.locator(".quiz-top .icon-btn").click();
  await page.click(".dialog >> text=Quitter");
  await page.waitForSelector(".drama.collapse .drama-title");
  await page.waitForTimeout(1800);
  await shot("04-collapse");
  await page.click(".drama-btn");
  await page.waitForSelector(".tower");
  const t = await page.evaluate(() => {
    const g = JSON.parse(localStorage.getItem("mission-bilingue:global"));
    return JSON.parse(localStorage.getItem(`mission-bilingue:p:${g.activeId}`)).tower;
  });
  if (t.floor !== 1 || t.lives !== TOWER_LIVES || t.resets !== 1) throw new Error(`after collapse: ${JSON.stringify(t)}`);
});

await step("a floor past the 5th appears as a surprise, once", async () => {
  await patch((s) => Object.assign(s.tower, { lives: 10, floor: 6, shown: 5 }));
  await page.click(".next-card.tower-hero");
  await page.waitForSelector(".reveal .reveal-btn:not([hidden])");
  const txt = await page.locator(".reveal").innerText();
  if (!/SURPRISE/.test(txt) || !/6/.test(txt)) throw new Error(`reveal text: ${txt}`);
  await shot("05-surprise");
  await page.click(".reveal-btn");
  await page.waitForSelector(".reveal", { state: "detached" });
  const rows = await page.locator(".tower-floor").count();
  if (rows !== 7) throw new Error(`${rows} rows after the reveal (6 floors + the boss expected)`);
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForSelector(".map");
  await page.click(".next-card.tower-hero");
  await page.waitForSelector(".tower");
  await page.waitForTimeout(800);
  if (await page.locator(".reveal").count()) throw new Error("the reveal is played twice");
});

await step("writing boss: a weak essay fails", async () => {
  await patch((s) => Object.assign(s.tower, { lives: 5, floor: 5 }));
  await page.click(".next-card.tower-hero");
  await page.click(".tower-go");
  await page.waitForSelector(".tower-banner");
  await page.fill("#w-text", "i like school. it is good. my teacher is nice and i like english very much because it is good.");
  await page.click("text=Faire corriger");
  await page.waitForSelector(".tower-banner.ko");
  await page.waitForSelector(".drama.life");
  await page.waitForTimeout(1200);
  await shot("06-writing-fail");
  await page.click(".drama-btn");
  if (await page.locator(".w-model").count()) throw new Error("the model answer is shown before the floor is won");
});

await step("the lessons of the block can be revised, level 12 included", async () => {
  await patch((s) => Object.assign(s.tower, { floor: 42, shown: 42, lives: 150 }));
  await page.click(".next-card.tower-hero");
  await page.click(".tower-go");
  await page.waitForSelector(".tower-intro .tower-revise");
  const intro = await page.locator(".tower-intro").innerText();
  if (!/20 secondes de bonus/.test(intro)) throw new Error("the 20 s bonus is not announced on floor 42");
  await page.click(".tower-revise >> text=12.1");
  await page.waitForSelector('#view[data-screen="unit"]');
  await shot("08-revise-12-1");
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForSelector(".map");
});
await step("victory screen with the reward", async () => {
  await patch((s) => Object.assign(s.tower, { won: true, wonAt: new Date().toISOString() }));
  await page.click("#line-12 .tower-card");
  await page.waitForSelector(".tower-victory");
  const txt = await page.locator(".victory-reward").innerText();
  if (!/PlayStation/.test(txt) || !/25 \$/.test(txt)) throw new Error(`reward text: ${txt}`);
  if (!/menti/.test(await page.locator(".tower-victory").innerText())) throw new Error("the victory does not confess the lie");
  await page.waitForTimeout(800);
  await shot("07-victory");
});

await step("the management zone is gone", async () => {
  await page.click("text=Retour au réseau");
  await page.click(".player-chip");
  await page.waitForSelector(".profile");
  if (await page.locator("text=Ouvrir la zone gestion").count()) throw new Error("zone still there");
});

await ctx.close();
await browser.close();
console.log(errors.length ? errors.join("\n") : "NO ERRORS");
process.exit(errors.length ? 1 : 0);
