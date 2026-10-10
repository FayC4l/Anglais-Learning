// Anti-cheat laugh: leaving the app during a question (phones), screenshot shortcuts (computers), the alerts
// counted in the profile, and the cases that must stay quiet. Usage: node tools/smoke-anticheat.mjs [index.html] [--shots]
import { chromium } from "playwright-core";
import { resolve } from "node:path";
import { existsSync, mkdirSync } from "node:fs";

const file = resolve(process.argv[2] && !process.argv[2].startsWith("--") ? process.argv[2] : "index.html");
const shots = process.argv.includes("--shots");
mkdirSync("shots", { recursive: true });
const CANDIDATES = [process.env.PW_CHROME, "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", "C:/Program Files/Google/Chrome/Application/chrome.exe"].filter(Boolean);
const browser = await chromium.launch({ executablePath: CANDIDATES.find((p) => existsSync(p)) });
const ctx = await browser.newContext({ viewport: { width: 390, height: 780 }, isMobile: true, hasTouch: true });
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
    await page.screenshot({ path: `shots/anticheat-fail-${label.replace(/\W+/g, "_")}.png` }).catch(() => {});
  }
};
const alerts = () =>
  page.evaluate(() => {
    const g = JSON.parse(localStorage.getItem("mission-bilingue:global"));
    return (JSON.parse(localStorage.getItem(`mission-bilingue:p:${g.activeId}`)).alerts || []).length;
  });
/** Simulates leaving the app (the page becomes hidden) for `ms`, then coming back. */
async function away(ms) {
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await page.clock.runFor(ms);
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));
  });
}
const laughShown = async () => (await page.locator(".laugh").count()) > 0;
async function closeLaugh() {
  await page.clock.runFor(5000);
  await page.waitForSelector(".laugh", { state: "detached" });
}

await page.goto(`file:///${file.replace(/\\/g, "/").replace(/^\//, "")}`, { waitUntil: "domcontentloaded", timeout: 30000 });
await page.fill("#player-name", "Hamza");
await page.click(".age-opt[data-age=ado]");
await page.click("text=Monter à bord");
await page.click("text=Je débute de zéro");
await page.waitForSelector(".map");
await page.flushSave?.();
await page.clock.runFor(500);

await step("leaving the app outside a question: no laugh", async () => {
  await away(10000);
  await page.clock.runFor(200);
  if (await laughShown()) throw new Error("laughed on the map");
});

await page.click("text=Prépa C2");
await page.click(".c2-part >> text=Part 4");
await page.waitForSelector(".quiz .gap-box");

await step("a short absence (notification) is forgiven", async () => {
  await away(1000);
  await page.clock.runFor(200);
  if (await laughShown()) throw new Error("laughed after 1 s away");
});

await step("leaving the app during a question: he laughs and it is counted", async () => {
  await away(8000);
  await page.waitForSelector(".laugh .laugh-face");
  await page.clock.runFor(700);
  if (shots) await page.screenshot({ path: "shots/anticheat-01-phone-leave.png" });
  const n = await alerts();
  if (n !== 1) throw new Error(`${n} alerts recorded`);
  if (!/Alerte n°1/.test(await page.locator(".laugh-sub").innerText())) throw new Error("alert number not shown");
  await closeLaugh();
});

await step("Print Screen during a question (computer)", async () => {
  await page.keyboard.press("PrintScreen");
  await page.waitForSelector(".laugh");
  await page.clock.runFor(300);
  if ((await alerts()) !== 2) throw new Error(`${await alerts()} alerts`);
  await closeLaugh();
});

await step("Windows+Shift: he shows up before the S, counted once the capture tool opens", async () => {
  await page.keyboard.down("Meta");
  await page.keyboard.down("Shift");
  await page.waitForSelector(".laugh");
  if ((await alerts()) !== 2) throw new Error("counted before the capture was certain");
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  await page.clock.runFor(200);
  await page.keyboard.up("Shift");
  await page.keyboard.up("Meta");
  if ((await alerts()) !== 3) throw new Error(`${await alerts()} alerts after the capture tool opened`);
  await closeLaugh();
});

await step("the profile shows the alerts", async () => {
  await page.locator(".quiz-top .icon-btn").click();
  await page.click(".dialog >> text=Quitter");
  await page.clock.runFor(500);
  await page.goto(`file:///${file.replace(/\\/g, "/").replace(/^\//, "")}`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForSelector(".map");
  await page.click(".player-chip");
  await page.waitForSelector(".profile");
  const txt = await page.locator(".profile").innerText();
  if (!/3\s*alertes Chikh Faycal/i.test(txt.replace(/\n/g, " "))) throw new Error("alert count missing in the profile");
  if (shots) await page.screenshot({ path: "shots/anticheat-02-profile.png", fullPage: false });
});

await browser.close();
console.log(errors.length ? errors.join("\n") : "NO ERRORS");
process.exit(errors.length ? 1 : 0);
