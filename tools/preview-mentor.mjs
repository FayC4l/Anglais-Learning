// Renders every picture of content/mentor.json on a coloured background into shots/mentor-preview.png,
// to check the cut-out and the transparency. Usage: node tools/preview-mentor.mjs [mentor.json]
import { chromium } from "playwright-core";
import { readFileSync, existsSync, mkdirSync } from "node:fs";

const file = process.argv[2] || "content/mentor.json";
const m = JSON.parse(readFileSync(file, "utf8"));
const CANDIDATES = [process.env.PW_CHROME, "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", "C:/Program Files/Google/Chrome/Application/chrome.exe", "/opt/pw-browsers/chromium-1194/chrome-linux/chrome"].filter(Boolean);
const b = await chromium.launch({ executablePath: CANDIDATES.find((p) => existsSync(p)) });
const p = await b.newPage({ viewport: { width: 1000, height: 760 } });
const items = [...(m.avatar ? [["avatar", m.avatar]] : []), ...Object.entries(m.expressions || {})];
await p.setContent(`<style>body{margin:0;font:12px sans-serif;background:#2b3a55;color:#fff;display:flex;flex-wrap:wrap;gap:10px;padding:10px}figure{margin:0;text-align:center}img{width:150px;height:150px;background:linear-gradient(135deg,#1d6f5f,#c8283a)}</style>${items.map(([n, src]) => `<figure><img src="${src}"><figcaption>${n}</figcaption></figure>`).join("")}`);
mkdirSync("shots", { recursive: true });
await p.screenshot({ path: "shots/mentor-preview.png", fullPage: true });
await b.close();
console.log("shots/mentor-preview.png");
