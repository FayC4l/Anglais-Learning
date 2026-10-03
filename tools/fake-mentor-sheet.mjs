// Test helper: draws a fake 4 × 4 expression sheet on a checkerboard and a fake round avatar, to check
// tools/mentor-sprites.mjs without the real artwork. Usage: node tools/fake-mentor-sheet.mjs sheet.png avatar.png
import { chromium } from "playwright-core";
import { existsSync } from "node:fs";

const CANDIDATES = [process.env.PW_CHROME, "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", "C:/Program Files/Google/Chrome/Application/chrome.exe", "/opt/pw-browsers/chromium-1194/chrome-linux/chrome"].filter(Boolean);
const b = await chromium.launch({ executablePath: CANDIDATES.find((p) => existsSync(p)) });
const p = await b.newPage({ viewport: { width: 1024, height: 1024 } });
const cells = Array.from({ length: 16 }, (_, i) => `<div class="c"><div class="f">${i}</div><div class="s"></div></div>`).join("");
await p.setContent(`<style>body{margin:0;background:repeating-conic-gradient(#fff 0 25%,#e6e6e6 0 50%) 0 0/32px 32px}.g{display:grid;grid-template-columns:repeat(4,256px)}.c{height:256px;position:relative}.f{position:absolute;left:68px;top:20px;width:120px;height:140px;border-radius:50%;background:#E8B48A;border:5px solid #111;font:40px sans-serif;display:grid;place-items:center}.s{position:absolute;left:30px;bottom:0;width:196px;height:80px;background:#F3E6C8;border:5px solid #111;border-bottom:none;border-radius:60px 60px 0 0}</style><div class="g">${cells}</div>`);
await p.screenshot({ path: process.argv[2] });
await p.setContent(`<style>body{margin:0;background:#FBEBD4}.o{position:absolute;left:150px;top:200px;width:720px;height:720px;border-radius:50%;background:#F4A12B;border:12px solid #111}</style><div class="o"></div>`);
await p.screenshot({ path: process.argv[3] });
await b.close();
