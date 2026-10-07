// The whole Tower in a real browser, like a perfect player: floors 1 to 49 answered correctly (a test build exposes
// the current question), original essays on the writing floors (tests/fixtures/tower-essays.json), then the full
// C2 mock exam at the top. Checks that every right answer is accepted, that a surprise floor appears after each
// floor past the 5th, that no heart is lost, and that the victory screen comes at the end.
// Usage: node tools/climb-tower.mjs [--from N] [--shots]   (about 10 minutes for the whole climb)
import { chromium } from "playwright-core";
import { execSync } from "node:child_process";
import { resolve } from "node:path";
import { mkdirSync, existsSync, readFileSync } from "node:fs";
import { floorSpec, FLOORS, VISIBLE, TOWER_LIVES } from "../src/tower.js";
import { gapWords } from "../src/fill.js";

const arg = (name, def) => {
  const i = process.argv.indexOf(name);
  return i > 0 ? Number(process.argv[i + 1]) : def;
};
const from = arg("--from", 1);
const shots = process.argv.includes("--shots");
mkdirSync("shots", { recursive: true });

execSync("node build.mjs", { env: { ...process.env, MB_TEST: "1", OUT_PREFIX: "test" }, stdio: "inherit" });
const file = resolve("dist/test-standalone.html");
const essays = JSON.parse(readFileSync("tests/fixtures/tower-essays.json", "utf8")).essays;
const essayOf = (n) => essays.find((e) => e.floors.includes(n));
const prompts = Object.fromEntries(essays.flatMap((e) => e.floors.map((n) => [n, e.prompt])));

const CANDIDATES = [process.env.PW_CHROME, "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", "C:/Program Files/Google/Chrome/Application/chrome.exe"].filter(Boolean);
const browser = await chromium.launch({ executablePath: CANDIDATES.find((p) => existsSync(p)) });
const ctx = await browser.newContext({ viewport: { width: 1100, height: 860 }, reducedMotion: "reduce" });
const page = await ctx.newPage();
page.setDefaultTimeout(10000);
await page.addInitScript(() => {
  const voices = [{ name: "Mock", lang: "en-CA", voiceURI: "m", default: true, localService: true }];
  Object.defineProperty(window, "speechSynthesis", { value: { getVoices: () => voices, speak(u) { setTimeout(() => u.onend && u.onend(), 10); }, cancel() {}, addEventListener() {} }, configurable: true });
  window.SpeechSynthesisUtterance = function (t) { this.text = t; };
});
const errors = [];
page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
page.on("console", (m) => m.type() === "error" && !/fonts\.g|ERR_|net::/.test(m.text()) && errors.push(`console: ${m.text()}`));
const visible = async (sel) => (await page.locator(sel).count()) > 0 && (await page.locator(sel).first().isVisible());
const towerState = () => page.evaluate(() => {
  const g = JSON.parse(localStorage.getItem("mission-bilingue:global"));
  return JSON.parse(localStorage.getItem(`mission-bilingue:p:${g.activeId}`)).tower;
});

// ---------- Setup: a teenager who reached level 12 ----------
await page.goto(`file:///${file.replace(/\\/g, "/").replace(/^\//, "")}`, { waitUntil: "domcontentloaded", timeout: 30000 });
await page.fill("#player-name", "Hamza");
await page.click(".age-opt[data-age=ado]");
await page.click("text=Monter à bord");
await page.click("text=Je débute de zéro");
await page.waitForSelector(".map");
await page.evaluate(({ from, prompts, visibleFloors, lives }) => {
  const g = JSON.parse(localStorage.getItem("mission-bilingue:global"));
  const key = `mission-bilingue:p:${g.activeId}`;
  const s = JSON.parse(localStorage.getItem(key));
  for (let L = 1; L <= 11; L++) s.bosses[L] = { defeated: true, at: new Date().toISOString() };
  s.tower = { floor: from, lives: lives, maxLives: lives, best: from, resets: 0, won: false, wonAt: "", shown: Math.max(visibleFloors, from), pending: 0, prompts };
  localStorage.setItem(key, JSON.stringify(s));
}, { from, prompts, visibleFloors: VISIBLE, lives: TOWER_LIVES });
await page.reload({ waitUntil: "domcontentloaded" });
await page.waitForSelector(".map");
await page.click(".next-card.tower-hero");

// ---------- Answering ----------
let answered = 0;
async function answerQuestion() {
  const q = await page.evaluate(() => window.__mbQ);
  const mount = page.locator(".q-mount");
  await page.waitForTimeout(120); // the question focuses its first box 60 ms after showing up
  if (q.kind === "fill") {
    const words = gapWords(q.expected);
    const boxes = mount.locator(".gap-box");
    if ((await boxes.count()) !== words.length) throw new Error(`fill: ${await boxes.count()} boxes for "${q.expected}"`);
    for (let i = 0; i < words.length; i++) await boxes.nth(i).fill(words[i]);
    await boxes.last().press("Enter");
  } else if (["mcq", "choose_fr", "listen_choose", "reading", "listening"].includes(q.kind)) {
    await mount.locator(".choices .choice").nth(q.answer).click();
  } else if (q.kind === "error") {
    await mount.locator(".error-words .word-chip").nth(q.wrong).click();
    await page.fill("#answer-input", q.accept[0]);
    await page.press("#answer-input", "Enter");
  } else if (q.kind === "build") {
    for (const w of q.words) await mount.locator(".build-bank .tile", { hasText: new RegExp(`^${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`) }).first().click();
    await mount.locator(".btn-validate").click();
  } else {
    await page.fill("#answer-input", q.expected);
    await page.press("#answer-input", "Enter");
  }
  await page.waitForSelector(".feedback:not([hidden])");
  if (!(await page.locator(".feedback.is-ok").count())) throw new Error(`right answer refused: [${q.kind}] ${q.q || q.fr || ""} → ${q.expected}`);
  answered++;
  await page.waitForTimeout(280);
  await page.click(".btn-continue");
  await page.waitForSelector(".feedback", { state: "hidden" });
}

async function answerC2Part() {
  const { partId, item } = await page.evaluate(() => window.__mbItem);
  if (["part1", "part2", "part3"].includes(partId)) {
    for (let i = 0; i < item.gaps.length; i++) {
      const g = item.gaps[i];
      if (partId === "part1") await page.selectOption(`select[aria-label="Trou ${i + 1}"]`, String(g.answer));
      else await page.fill(`input[aria-label="Trou ${i + 1}"]`, g.answer[0]);
    }
  } else if (partId === "reading5" || partId === "listening") {
    for (let i = 0; i < item.questions.length; i++) await page.locator(".c2-q").nth(i).locator(`input[value="${item.questions[i].answer}"]`).check();
  } else if (partId === "reading6") {
    for (let i = 0; i < item.answer.length; i++) await page.selectOption(`select[aria-label="Paragraphe manquant ${i + 1}"]`, String(item.answer[i]));
  } else if (partId === "reading7") {
    for (let i = 0; i < item.statements.length; i++) await page.selectOption(`select[aria-label="Affirmation ${i + 1}"]`, item.statements[i].answer);
  } else throw new Error(`unknown C2 part ${partId}`);
  await page.click(".c2-ex >> text=Corriger");
  const score = await page.locator(".c2-score").innerText();
  const [good, all] = score.split("/").map((x) => Number(x.trim()));
  if (good !== all) throw new Error(`C2 ${partId} ${item.id}: ${score} with the answer key`);
  await page.click(".c2-continue");
  return partId;
}

// ---------- The climb: act on whatever screen is shown ----------
const reveals = [];
const c2Parts = [];
let floor = from;
let lastFloor = 0;
let idle = 0;
const started = Date.now();
for (let guard = 0; guard < 6000; guard++) {
  if (Date.now() - started > 40 * 60000) {
    errors.push("climb took more than 40 minutes");
    break;
  }
  try {
    if (await visible(".tower-victory")) break;
    if (await visible(".drama")) throw new Error(`a heart was lost on floor ${floor}: ${await page.locator(".drama").innerText()}`);
    if (await visible(".reveal")) {
      const t = await towerState();
      reveals.push(t.floor);
      if (shots && t.floor === 6) await page.screenshot({ path: "shots/climb-reveal-6.png" });
      await page.waitForSelector(".reveal-btn:not([hidden])");
      await page.click(".reveal-btn");
      await page.waitForSelector(".reveal", { state: "detached" });
      idle = 0;
      continue;
    }
    if (await visible(".dialog")) {
      await page.click(".dialog >> text=Je suis prêt(e)");
      await page.waitForSelector(".dialog-wrap", { state: "detached" });
      idle = 0;
      continue;
    }
    if (await visible(".feedback:not([hidden]) .btn-continue")) {
      await page.click(".btn-continue");
      idle = 0;
      continue;
    }
    if (await visible(".quiz .q-card") && !(await page.locator(".q-mount.answered").count())) {
      await answerQuestion();
      idle = 0;
      continue;
    }
    if (await visible(".c2-ex .c2-text, .c2-ex .c2-q, .c2-ex .c2-match")) {
      c2Parts.push(await answerC2Part());
      idle = 0;
      continue;
    }
    if (await visible(".tower-won")) {
      const t = await towerState();
      const label = await page.locator(".tower-won .btn-primary").innerText();
      const surprise = t.floor > t.shown && t.floor < FLOORS;
      const expected = surprise || t.floor === FLOORS ? "Affronter le boss final" : `Monter à l'étage ${t.floor}`;
      if (!label.includes(expected)) errors.push(`floor ${t.floor - 1} won: button "${label}" instead of "${expected}"`);
      await page.click(".tower-won .btn-primary");
      idle = 0;
      continue;
    }
    if (await visible("#w-text")) {
      const t = await towerState();
      const e = essayOf(t.floor);
      if (!e) throw new Error(`no essay for floor ${t.floor}`);
      await page.fill("#w-text", e.text);
      await page.click("text=Faire corriger");
      await page.waitForSelector(".tower-banner");
      if (!(await page.locator(".tower-banner.ok").count())) throw new Error(`writing floor ${t.floor} failed: ${await page.locator(".tower-banner").innerText()}`);
      if (shots && t.floor === 45) await page.screenshot({ path: "shots/climb-writing-45.png" });
      const after = await towerState();
      const label = await page.locator(".w-report .result-actions .btn-primary").innerText();
      const expected = after.floor > after.shown && after.floor < FLOORS ? "Affronter le boss final" : `Monter à l'étage ${after.floor}`;
      if (!label.includes(expected)) errors.push(`writing floor ${t.floor} won: button "${label}" instead of "${expected}"`);
      await page.locator(".w-report .result-actions .btn-primary").click();
      idle = 0;
      continue;
    }
    if (await visible(".tower-intro")) {
      await page.click("text=Combattre");
      idle = 0;
      continue;
    }
    if (await visible(".tower .tower-go")) {
      const t = await towerState();
      floor = t.floor;
      if (floor !== lastFloor) {
        const rows = await page.locator(".tower-floor").count();
        const want = Math.min(FLOORS - 1, Math.max(VISIBLE, floor)) + 1;
        if (rows !== want) errors.push(`floor ${floor}: ${rows} rows shown instead of ${want}`);
        if (t.lives !== TOWER_LIVES) errors.push(`floor ${floor}: ${t.lives} hearts`);
        console.log(`floor ${floor} (${floorSpec(floor).kind}) · ${answered} answers so far · ${Math.round((Date.now() - started) / 1000)} s`);
        lastFloor = floor;
      }
      await page.click(".tower-go");
      idle = 0;
      continue;
    }
    await page.waitForTimeout(150);
    if (++idle > 60) throw new Error(`stuck on screen "${await page.locator("#view").getAttribute("data-screen")}"`);
    continue;
  } catch (e) {
    errors.push(e.message.split("\n").filter((l) => /Timeout|waiting for|refused|failed|lost|error/i.test(l)).slice(0, 3).join(" | ") || e.message);
    await page.screenshot({ path: `shots/climb-fail-${floor}.png` }).catch(() => {});
    break;
  }
}

if (await visible(".tower-victory")) {
  const t = await towerState();
  const txt = await page.locator(".tower-victory").innerText();
  if (!/PlayStation/.test(txt) || !/25 \$/.test(txt)) errors.push("victory without the reward");
  if (!t.won || t.lives !== TOWER_LIVES || t.resets) errors.push(`final state: ${JSON.stringify(t)}`);
  if (shots) await page.screenshot({ path: "shots/climb-victory.png" });
} else errors.push(`no victory (stopped on floor ${floor})`);
const wantReveals = Array.from({ length: FLOORS - 1 }, (_, i) => i + 1).filter((n) => n > Math.max(VISIBLE, from));
if (reveals.join() !== wantReveals.join()) errors.push(`reveals ${reveals.join(",")} (expected ${wantReveals.join(",")})`);
if (c2Parts.length !== 8) errors.push(`C2 parts played outside the quiz: ${c2Parts.join(",")}`);
console.log(`${answered} questions answered, ${reveals.length} surprise floors, C2 parts: ${c2Parts.join(" ")}, ${Math.round((Date.now() - started) / 1000)} s`);
await browser.close();
console.log(errors.length ? errors.join("\n") : "NO ERRORS");
process.exit(errors.length ? 1 : 0);
