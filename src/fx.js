// Visual effects: particle canvas overlay (confetti, bursts), floating text, shakes and flashes.
import { h, reducedMotion } from "./ui.js";

let canvas;
let g;
let parts = [];
let running = false;
let dpr = 1;

function ensure() {
  if (canvas) return;
  canvas = h("canvas", { class: "fx-canvas", "aria-hidden": "true" });
  document.body.append(canvas);
  g = canvas.getContext("2d");
  const size = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = innerWidth * dpr;
    canvas.height = innerHeight * dpr;
  };
  size();
  addEventListener("resize", size);
}

function loop() {
  if (!parts.length) {
    running = false;
    g.clearRect(0, 0, canvas.width, canvas.height);
    return;
  }
  running = true;
  g.clearRect(0, 0, canvas.width, canvas.height);
  const now = performance.now();
  parts = parts.filter((p) => now - p.born < p.life);
  for (const p of parts) {
    const t = (now - p.born) / p.life;
    p.vy += p.gravity;
    p.vx *= p.drag;
    p.vy *= p.drag;
    p.x += p.vx;
    p.y += p.vy;
    p.rot += p.vr;
    const alpha = t < 0.7 ? 1 : 1 - (t - 0.7) / 0.3;
    g.save();
    g.globalAlpha = Math.max(0, alpha);
    g.translate(p.x * dpr, p.y * dpr);
    g.rotate(p.rot);
    g.fillStyle = p.color;
    if (p.shape === "rect") {
      const w = p.size * dpr;
      g.scale(1, Math.cos(p.flip + now / 160));
      g.fillRect(-w / 2, -w / 3, w, (w * 2) / 3);
    } else if (p.shape === "ring") {
      g.strokeStyle = p.color;
      g.lineWidth = 3 * dpr * (1 - t);
      g.beginPath();
      g.arc(0, 0, p.size * dpr * (0.3 + t * 2.2), 0, Math.PI * 2);
      g.stroke();
    } else if (p.shape === "star") {
      const r = p.size * dpr * (1 - t * 0.5);
      g.beginPath();
      for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI) / 4;
        const rr = i % 2 ? r * 0.35 : r;
        g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
      }
      g.closePath();
      g.fill();
    } else {
      g.beginPath();
      g.arc(0, 0, p.size * dpr * (1 - t * 0.6), 0, Math.PI * 2);
      g.fill();
    }
    g.restore();
  }
  requestAnimationFrame(loop);
}

function add(p) {
  ensure();
  parts.push({ born: performance.now(), rot: 0, vr: 0, drag: 0.985, gravity: 0.25, flip: Math.random() * 6, ...p });
  if (!running) requestAnimationFrame(loop);
}

const PALETTE = ["#E1251B", "#F07D00", "#E8B600", "#2E9E3F", "#00958F", "#0B6FD0", "#4B3FCF", "#9B30B0", "#DB2E7A"];

/** Confetti shower from the top of the screen (or from a point). */
export function confetti({ x, y, count = 140, colors = PALETTE } = {}) {
  const n = reducedMotion() ? Math.min(20, count) : count;
  for (let i = 0; i < n; i++) {
    const fromTop = x == null;
    add({
      x: fromTop ? Math.random() * innerWidth : x,
      y: fromTop ? -20 - Math.random() * 120 : y,
      vx: fromTop ? (Math.random() - 0.5) * 3 : (Math.random() - 0.5) * 16,
      vy: fromTop ? 2 + Math.random() * 3 : -6 - Math.random() * 10,
      gravity: fromTop ? 0.06 : 0.3,
      drag: 0.992,
      size: 7 + Math.random() * 7,
      color: colors[i % colors.length],
      shape: "rect",
      vr: (Math.random() - 0.5) * 0.3,
      life: fromTop ? 3200 + Math.random() * 1600 : 1800 + Math.random() * 900,
    });
  }
}

/** Radial burst of particles at a point. */
export function burst(x, y, { color = "#FFB000", count = 18, speed = 7, shape = "dot", size = 5 } = {}) {
  const n = reducedMotion() ? Math.min(6, count) : count;
  for (let i = 0; i < n; i++) {
    const a = (Math.PI * 2 * i) / n + Math.random() * 0.4;
    const s = speed * (0.5 + Math.random() * 0.8);
    add({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, gravity: 0.12, drag: 0.94, size: size * (0.6 + Math.random() * 0.8), color: Array.isArray(color) ? color[i % color.length] : color, shape, life: 650 + Math.random() * 400 });
  }
  add({ x, y, vx: 0, vy: 0, gravity: 0, size: 18, color: Array.isArray(color) ? color[0] : color, shape: "ring", life: 500 });
}

/** Burst centred on an element. */
export function burstAt(el, opts) {
  if (!el) return;
  const r = el.getBoundingClientRect();
  burst(r.left + r.width / 2, r.top + r.height / 2, opts);
}

/** Floating text ("+10", "Combo x3") rising from a point or element. */
export function floatText(text, target, { color = "var(--go)", size = 1.4 } = {}) {
  let x = innerWidth / 2;
  let y = innerHeight / 2;
  if (target?.getBoundingClientRect) {
    const r = target.getBoundingClientRect();
    x = r.left + r.width / 2;
    y = r.top + r.height / 3;
  } else if (target && typeof target.x === "number") ({ x, y } = target);
  const el = h("div", { class: "float-text", style: { left: `${x}px`, top: `${y}px`, color, fontSize: `${size}rem` } }, text);
  document.body.append(el);
  setTimeout(() => el.remove(), 1100);
}

/** Shakes an element briefly. */
export function shake(el, strong = false) {
  if (!el || reducedMotion()) return;
  el.classList.remove("shake", "shake-strong");
  void el.offsetWidth;
  el.classList.add(strong ? "shake-strong" : "shake");
  setTimeout(() => el.classList.remove("shake", "shake-strong"), 600);
}

/** Full-screen colour flash (e.g. red when hurt). */
export function flash(kind = "hurt") {
  const el = h("div", { class: `screen-flash ${kind}` });
  document.body.append(el);
  setTimeout(() => el.remove(), 600);
}

/** Big stamped banner in the middle of the screen. */
export function stamp(text, { sub = "", color = "var(--ink)", ms = 1500 } = {}) {
  const el = h("div", { class: "stamp-wrap" }, h("div", { class: "stamp", style: { "--stamp": color } }, h("div", { class: "stamp-main" }, text), sub ? h("div", { class: "stamp-sub" }, sub) : null));
  document.body.append(el);
  return new Promise((r) =>
    setTimeout(() => {
      el.classList.add("out");
      setTimeout(() => {
        el.remove();
        r();
      }, 300);
    }, ms),
  );
}
