// DOM helpers, icons, toasts and in-page dialogs.

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

/** Creates an element: h("div", {class: "x", onClick: fn}, child, "text", [more]). */
export function h(tag, attrs, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === "class") el.className = v;
    else if (k === "style" && typeof v === "object") {
      for (const [sk, sv] of Object.entries(v)) {
        if (sv == null) continue;
        if (sk.startsWith("--")) el.style.setProperty(sk, sv);
        else el.style[sk] = sv;
      }
    }
    else if (k === "html") el.innerHTML = v;
    else if (k === "dataset") Object.assign(el.dataset, v);
    else if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k.startsWith("--")) el.style.setProperty(k, v);
    else el.setAttribute(k, v === true ? "" : v);
  }
  for (const c of children.flat(Infinity)) {
    if (c == null || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

export const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

/** Lesson markup: **bold** and [[spoken English]] chips. */
export function rich(text) {
  let s = esc(text);
  s = s.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/\[\[(.+?)\]\]/g, (_, x) => `<button type="button" class="say-chip" data-say="${x}">${x}${icon("speaker", "say-ic")}</button>`);
  return s;
}

/** Plain text of lesson markup (for speech). */
export const plain = (text) => String(text ?? "").replace(/\*\*|\[\[|\]\]/g, "");

const PATHS = {
  back: '<path d="M15 5l-7 7 7 7"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  speaker: '<path d="M4 9.5h3.5L12 5.5v13L7.5 14.5H4z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/>',
  turtle: '<path d="M4 14c0-3.9 3.1-7 7-7s7 3.1 7 7z"/><path d="M18 12.5h1.5a2 2 0 0 0 0-4H18M6 14l-1 3M16 14l1 3M2.5 14h17"/>',
  play: '<path d="M8 5.5v13l10.5-6.5z" fill="currentColor" stroke="none"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  star: '<path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.9L12 17l-5.2 2.7 1-5.9-4.3-4.1 5.9-.8z"/>',
  flame: '<path d="M12 21c-3.9 0-6.5-2.6-6.5-6.2 0-3.4 2.4-5.4 3.6-8.3.4 1.9 1.4 3 2.6 3.4-.3-2.6.7-5.3 3-6.9-.2 3 1.4 4.6 2.6 6.3 1 1.4 1.7 3 1.7 5 0 3.8-3 6.7-7 6.7z"/>',
  bolt: '<path d="M13 2.5L5 13.5h6l-1 8 8-11h-6z"/>',
  heart: '<path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.2a4.3 4.3 0 0 1 7.5 2.6C19.5 15.4 12 20 12 20z"/>',
  lock: '<rect x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>',
  book: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5"/>',
  cards: '<rect x="3" y="6" width="12" height="15" rx="2"/><path d="M8 3h11a2 2 0 0 1 2 2v13"/>',
  game: '<path d="M7 8h10a4.5 4.5 0 0 1 4.4 5.5l-.9 4A2.6 2.6 0 0 1 16 18.4L14.5 16h-5L8 18.4a2.6 2.6 0 0 1-4.5-.9l-.9-4A4.5 4.5 0 0 1 7 8z"/><path d="M8 11v3M6.5 12.5h3M15.5 11.5h.01M17.5 13.5h.01"/>',
  trophy: '<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H4.5a3 3 0 0 0 3.5 4M16 6h3.5a3 3 0 0 1-3.5 4M12 13v4M8.5 20.5h7M10 17h4v3.5h-4z"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M4.2 6.5l2.6 1.5M17.2 16l2.6 1.5M4.2 17.5l2.6-1.5M17.2 8l2.6-1.5"/>',
  refresh: '<path d="M20 12a8 8 0 1 1-2.3-5.7"/><path d="M20 4v4.5h-4.5"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c.8-4 4-6.5 8-6.5s7.2 2.5 8 6.5"/>',
  copy: '<rect x="8" y="8" width="12" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h2"/>',
  shield: '<path d="M12 3l7.5 3v6c0 4.5-3.2 7.8-7.5 9-4.3-1.2-7.5-4.5-7.5-9V6z"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
  notebook: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 3v18M12 8h4M12 12h4"/>',
  mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"/>',
  skip: '<path d="M5 5.5l9 6.5-9 6.5zM17 5.5v13"/>',
  sound: '<path d="M4 9.5h3.5L12 5.5v13L7.5 14.5H4z"/><path d="M16 9.5l5 5M21 9.5l-5 5"/>',
  sparkle: '<path d="M12 3v5M12 16v5M3 12h5M16 12h5M6 6l2.5 2.5M15.5 15.5L18 18M6 18l2.5-2.5M15.5 8.5L18 6"/>',
  rain: '<path d="M7 4v6M12 3v9M17 5v5M7 15v5M12 16v4M17 14v6"/>',
  memory: '<rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="8" rx="1.5"/><rect x="3" y="13" width="8" height="8" rx="1.5"/><path d="M15 17h4M17 15v4"/>',
  flash: '<path d="M13 2.5L5 13.5h6l-1 8 8-11h-6z"/>',
  bubbles: '<circle cx="8" cy="15" r="4.5"/><circle cx="16.5" cy="8" r="3.5"/><circle cx="17" cy="17.5" r="2"/>',
  builder: '<rect x="2.5" y="9" width="6" height="6" rx="1.2"/><rect x="9.5" y="9" width="5" height="6" rx="1.2"/><rect x="15.5" y="9" width="6" height="6" rx="1.2"/><path d="M5.5 5.5h13M5.5 18.5h8"/>',
  hunt: '<circle cx="10.5" cy="10.5" r="6"/><path d="M15 15l5.5 5.5M8 10.5h5"/>',
  spell: '<path d="M4 19l4.5-14h1L14 19M5.8 14h6.4"/><path d="M15.5 13.5h5M15.5 17.5h5"/>',
  dictation: '<path d="M4 9.5h3.5L12 5.5v13L7.5 14.5H4z"/><path d="M15 9h6M15 13h6M15 17h4"/>',
  gauntlet: '<path d="M14.5 3.5l6 6-9 9-3-3zM8.5 15.5L4 20M3.5 15.5l5 5"/>',
};

/** Inline SVG icon by name. */
export function icon(name, cls = "") {
  return `<svg class="ic ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${PATHS[name] || ""}</svg>`;
}
export const iconEl = (name, cls = "") => {
  const t = document.createElement("template");
  t.innerHTML = icon(name, cls);
  return t.content.firstChild;
};

let toastTimer;
/** Short message at the bottom of the screen. */
export function toast(msg, kind = "") {
  let el = $("#toast");
  if (!el) {
    el = h("div", { id: "toast", role: "status", "aria-live": "polite" });
    document.body.append(el);
  }
  el.className = `toast show ${kind}`;
  el.textContent = msg;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (el.className = `toast ${kind}`), 2600);
}

/**
 * In-page dialog (the viewer blocks alert/confirm). Resolves with the value of the clicked
 * action, or null when dismissed.
 */
export function dialog({ title, body, actions = [{ label: "OK", value: true, primary: true }], dismissible = true }) {
  return new Promise((resolve) => {
    const close = (v) => {
      wrap.classList.add("out");
      setTimeout(() => wrap.remove(), 220);
      document.removeEventListener("keydown", onKey);
      resolve(v);
    };
    const onKey = (e) => {
      if (e.key === "Escape" && dismissible) close(null);
    };
    const panel = h(
      "div",
      { class: "dialog", role: "dialog", "aria-modal": "true", "aria-label": title },
      h("h2", { class: "dialog-title" }, title),
      typeof body === "string" ? h("div", { class: "dialog-body", html: body }) : body,
      h(
        "div",
        { class: "dialog-actions" },
        actions.map((a) => h("button", { type: "button", class: `btn ${a.primary ? "btn-primary" : a.danger ? "btn-danger" : "btn-ghost"}`, onClick: () => close(typeof a.value === "function" ? a.value() : a.value) }, a.label)),
      ),
    );
    const wrap = h("div", { class: "dialog-wrap", onClick: (e) => e.target === wrap && dismissible && close(null) }, panel);
    document.body.append(wrap);
    document.addEventListener("keydown", onKey);
    requestAnimationFrame(() => (panel.querySelector(".btn-primary") || panel.querySelector("button"))?.focus());
  });
}

export const shuffle = (arr) => {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
export const sample = (arr, n) => shuffle(arr).slice(0, n);
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const reducedMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/** Animated number count-up inside an element. */
export function countUp(el, to, ms = 900, fmt = (v) => Math.round(v)) {
  if (reducedMotion()) {
    el.textContent = fmt(to);
    return;
  }
  const from = 0;
  const t0 = performance.now();
  const step = (t) => {
    const k = clamp((t - t0) / ms, 0, 1);
    const e = 1 - Math.pow(1 - k, 3);
    el.textContent = fmt(from + (to - from) * e);
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/** Copies text; falls back to selecting it in the given input. */
export async function copyText(text, fallbackInput) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    if (fallbackInput) {
      fallbackInput.focus();
      fallbackInput.select();
    }
    return false;
  }
}
