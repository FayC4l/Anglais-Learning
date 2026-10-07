// The question timer: 10 more seconds everywhere, and when the time runs out a typed answer is sent for
// correction (right → counted right, wrong → corrected) instead of counting as wrong. The page clock is
// fast-forwarded, so the test does not wait for real. Usage: node tools/smoke-timeout.mjs
import { chromium } from "playwright-core";
import { execSync } from "node:child_process";
import { resolve } from "node:path";
import { existsSync, mkdirSync } from "node:fs";
import { gapWords } from "../src/fill.js";

execSync("node build.mjs", { env: { ...process.env, MB_TEST: "1", OUT_PREFIX: "test" }, stdio: "ignore" });
const file = resolve("dist/test-standalone.html");
mkdirSync("shots", { recursive: true });
const CANDIDATES = [process.env.PW_CHROME, "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", "C:/Program Files/Google/Chrome/Application/chrome.exe"].filter(Boolean);
const browser = await chromium.launch({ executablePath: CANDIDATES.find((p) => existsSync(p)) });
const ctx = await browser.newContext({ viewport: { width: 1100, height: 860 }, reducedMotion: "reduce" });
const page = await ctx.newPage();
page.setDefaultTimeout(8000);
await page.clock.install();
await page.addInitScript(() => {
  const voices = [{ name: "Mock", lang: "en-CA", voiceURI: "m", default: true, localService: true }];
  Object.defineProperty(window, "speechSynthesis", { value: { getVoices: () => voices, speak(u) { setTimeout(() => u.onend && u.onend(), 10); }, cancel() {}, addEventListener() {} }, configurable: true });
  window.SpeechSynthesisUtterance = function (t) { this.text = t; };
});
const errors = [];
page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
const step = async (label, fn) => {
  try {
    await fn();
  } catch (e) {
    errors.push(`${label}: ${e.message.split("\n")[0]}`);
    await page.screenshot({ path: `shots/timeout-fail-${label.replace(/\W+/g, "_")}.png` }).catch(() => {});
  }
};

await page.goto(`file:///${file.replace(/\\/g, "/").replace(/^\//, "")}`, { waitUntil: "domcontentloaded", timeout: 30000 });
await page.fill("#player-name", "Chrono");
await page.click(".age-opt[data-age=ado]");
await page.click("text=Monter à bord");
await page.click("text=Je débute de zéro");
await page.waitForSelector(".map");

// Part 4 of the C2 preparation: six fill-in transformations in the normal quiz runner.
await page.click("text=Prépa C2");
await page.click(".c2-part >> text=Part 4");
await page.waitForSelector(".quiz .gap-box");

/** Types into the boxes of the current question (without pressing Enter). */
async function typeIn(words) {
  await page.clock.runFor(200); // the question focuses its first box after 60 ms
  const boxes = page.locator(".q-mount .gap-box");
  for (let i = 0; i < words.length; i++) await boxes.nth(i).fill(words[i]);
}
/** Lets the timer run out (the bonus included), then reads the feedback. */
async function runOut(q) {
  await page.clock.runFor((q.time + 10) * 1000 + 500);
  await page.waitForSelector(".feedback:not([hidden])");
  return {
    ok: (await page.locator(".feedback.is-ok").count()) > 0,
    title: await page.locator(".fb-title").innerText(),
    given: (await page.locator(".fb-given").count()) ? await page.locator(".fb-given").innerText() : "",
  };
}
async function next() {
  await page.clock.runFor(400);
  await page.click(".btn-continue");
  await page.clock.runFor(400);
  await page.waitForSelector(".q-mount:not(.answered) .gap-box");
}

await step("the timer shows 10 more seconds", async () => {
  const q = await page.evaluate(() => window.__mbQ);
  await page.clock.runFor(100);
  const shown = Number((await page.locator(".timer-text").innerText()).replace(/\D/g, ""));
  if (Math.abs(shown - (q.time + 10)) > 1) throw new Error(`timer shows ${shown} s for a ${q.time} s question (+10 expected)`);
});

await step("a right answer typed in time is counted right when the time runs out", async () => {
  const q = await page.evaluate(() => window.__mbQ);
  await typeIn(gapWords(q.expected));
  const r = await runOut(q);
  if (!r.ok || !/Juste à temps/.test(r.title)) throw new Error(`feedback: ${JSON.stringify(r)}`);
  await page.screenshot({ path: "shots/timeout-01-right.png" });
});

await step("a wrong answer typed in time is corrected, not blank", async () => {
  await next();
  const q = await page.evaluate(() => window.__mbQ);
  await typeIn(["zzz"]);
  const r = await runOut(q);
  if (r.ok || !/corrigée/.test(r.title) || !/zzz/.test(r.given)) throw new Error(`feedback: ${JSON.stringify(r)}`);
  await page.screenshot({ path: "shots/timeout-02-wrong.png" });
});

await step("nothing typed: the time is simply out", async () => {
  await next();
  const q = await page.evaluate(() => window.__mbQ);
  const r = await runOut(q);
  if (r.ok || r.title !== "Temps écoulé !" || r.given) throw new Error(`feedback: ${JSON.stringify(r)}`);
});

await browser.close();
console.log(errors.length ? errors.join("\n") : "NO ERRORS");
process.exit(errors.length ? 1 : 0);
