// Minimal in-memory router with view transitions.
import { reducedMotion } from "./ui.js";
import { stopSpeaking } from "./audio.js";

const screens = {};
let cleanup = null;
export let route = { name: "", params: {} };

export function register(name, render) {
  screens[name] = render;
}

/** Shows a screen. `render(view, params)` may return a cleanup function. */
export function go(name, params = {}) {
  const view = document.getElementById("view");
  const swap = () => {
    try {
      cleanup?.();
    } catch {
      /* ignore */
    }
    stopSpeaking();
    cleanup = null;
    route = { name, params };
    view.replaceChildren();
    view.dataset.screen = name;
    window.scrollTo({ top: 0, behavior: "instant" });
    const out = screens[name]?.(view, params);
    if (typeof out === "function") cleanup = out;
  };
  if (document.startViewTransition && !reducedMotion() && route.name) {
    // A transition can be aborted (e.g. the phone's viewport changes size): the screen is still swapped.
    const t = document.startViewTransition(swap);
    for (const p of [t.ready, t.finished, t.updateCallbackDone]) p?.catch(() => {});
  } else swap();
}
