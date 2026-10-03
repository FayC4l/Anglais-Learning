// Builds content/mentor.json from the artwork of Chikh Fayçal:
//   assets/chikh-faycal-avatar.png  (round portrait)   → "avatar"
//   assets/chikh-faycal.png         (4 × 4 sheet of expressions) → 16 named expressions
// Each picture is cut, its plain background (white / checkerboard / beige) made transparent by a flood fill from
// the edges, scaled down and stored as a small WebP data URL. Runs in a real browser (canvas) via Playwright.
// Usage: node tools/mentor-sprites.mjs [--size 160]
import { chromium } from "playwright-core";
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const SIZE = Number(process.argv[process.argv.indexOf("--size") + 1]) || 160;
const SHEET = process.env.MENTOR_SHEET || "assets/chikh-faycal.png";
const AVATAR = process.env.MENTOR_AVATAR || "assets/chikh-faycal-avatar.png";
const OUT = process.env.MENTOR_OUT || "content/mentor.json";
// Order of the sheet, row by row.
const NAMES = ["happy", "determined", "shocked", "love", "gamer", "cool", "skeptical", "worried", "laughing", "sleepy", "speaking", "crying", "laptop", "boss", "serious", "hoodie"];

const CANDIDATES = [process.env.PW_CHROME, "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", "C:/Program Files/Google/Chrome/Application/chrome.exe", "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "/opt/pw-browsers/chromium-1194/chrome-linux/chrome"].filter(Boolean);
const dataUrl = (p) => `data:image/png;base64,${readFileSync(p).toString("base64")}`;

if (!existsSync(SHEET) && !existsSync(AVATAR)) {
  console.log(`Put the pictures in ${SHEET} and/or ${AVATAR} first.`);
  process.exit(1);
}

const browser = await chromium.launch({ executablePath: CANDIDATES.find((p) => existsSync(p)) });
const page = await browser.newPage();
const out = await page.evaluate(
  async ({ sheet, avatar, names, size }) => {
    const load = (src) =>
      new Promise((res, rej) => {
        const i = new Image();
        i.onload = () => res(i);
        i.onerror = rej;
        i.src = src;
      });
    /** Makes the background transparent: flood fill from the borders over light, low-saturation pixels. */
    const clearBackground = (ctx, w, h, keepCircle = false) => {
      const img = ctx.getImageData(0, 0, w, h);
      const d = img.data;
      const isBg = (k) => {
        const r = d[k], g = d[k + 1], b = d[k + 2];
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        // white, light grey checkerboard, or the beige page colour of the avatar
        return max > 200 && (max - min < 18 || (keepCircle && max - min < 60 && r > 225));
      };
      const seen = new Uint8Array(w * h);
      const stack = [];
      for (let x = 0; x < w; x++) stack.push(x, (h - 1) * w + x);
      for (let y = 0; y < h; y++) stack.push(y * w, y * w + w - 1);
      while (stack.length) {
        const p = stack.pop();
        if (seen[p]) continue;
        seen[p] = 1;
        if (!isBg(p * 4)) continue;
        d[p * 4 + 3] = 0;
        const x = p % w, y = (p / w) | 0;
        if (x > 0) stack.push(p - 1);
        if (x < w - 1) stack.push(p + 1);
        if (y > 0) stack.push(p - w);
        if (y < h - 1) stack.push(p + w);
      }
      ctx.putImageData(img, 0, 0);
    };
    /** Crops to the visible pixels, pads to a square and scales to `size`. */
    const finish = (src, w, h) => {
      const sctx = src.getContext("2d");
      const d = sctx.getImageData(0, 0, w, h).data;
      let x0 = w, y0 = h, x1 = 0, y1 = 0;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3] > 20) {
        x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
      }
      const side = Math.max(x1 - x0, y1 - y0) + 8;
      const c = document.createElement("canvas");
      c.width = c.height = size;
      const ctx = c.getContext("2d");
      ctx.imageSmoothingQuality = "high";
      const s = size / side;
      ctx.drawImage(src, x0, y0, x1 - x0, y1 - y0, ((side - (x1 - x0)) / 2) * s, (side - (y1 - y0)) * s - 4 * s, (x1 - x0) * s, (y1 - y0) * s);
      return c.toDataURL("image/webp", 0.86);
    };
    const result = { expressions: {} };
    if (sheet) {
      const img = await load(sheet);
      const cw = img.width / 4, ch = img.height / 4;
      names.forEach((name, k) => {
        const c = document.createElement("canvas");
        c.width = Math.round(cw);
        c.height = Math.round(ch);
        const ctx = c.getContext("2d");
        ctx.drawImage(img, (k % 4) * cw, Math.floor(k / 4) * ch, cw, ch, 0, 0, c.width, c.height);
        clearBackground(ctx, c.width, c.height);
        result.expressions[name] = finish(c, c.width, c.height);
      });
    }
    if (avatar) {
      const img = await load(avatar);
      const c = document.createElement("canvas");
      c.width = img.width;
      c.height = img.height;
      const ctx = c.getContext("2d");
      ctx.drawImage(img, 0, 0);
      clearBackground(ctx, c.width, c.height, true);
      result.avatar = finish(c, c.width, c.height);
    }
    return result;
  },
  { sheet: existsSync(SHEET) ? dataUrl(SHEET) : null, avatar: existsSync(AVATAR) ? dataUrl(AVATAR) : null, names: NAMES, size: SIZE },
);
await browser.close();
const json = JSON.stringify({ size: SIZE, ...out }, null, 1);
writeFileSync(OUT, json + "\n");
console.log(`${OUT}: ${Object.keys(out.expressions).length} expressions${out.avatar ? " + avatar" : ""}, ${Math.round(json.length / 1024)} KB`);
