// Entry point: registers screens and starts the app.
import { register, go, route } from "./router.js";
import { flushSave } from "./store.js";
import { initProfiles, family, listProfiles, selectProfile } from "./profiles.js";
import { persistent } from "./storage.js";
import { unlockAudio } from "./audio.js";
import { toast } from "./ui.js";
import { map } from "./screens/home.js";
import { whoScreen, onboarding } from "./screens/who.js";
import { welcomeScreen, placementScreen } from "./screens/placement.js";
import { unitScreen } from "./screens/unit.js";
import { testScreen } from "./screens/test.js";
import { bossScreen } from "./screens/boss.js";
import { reviewScreen } from "./screens/review.js";
import { profileScreen } from "./screens/profile.js";
import { gameScreen } from "./games/shell.js";
import { dashboardScreen } from "./screens/dashboard.js";
import { dailyScreen } from "./screens/daily.js";
import { conjugatorScreen } from "./screens/conjugator.js";

register("onboarding", onboarding);
register("who", whoScreen);
register("welcome", welcomeScreen);
register("placement", placementScreen);
register("map", map);
register("unit", unitScreen);
register("test", testScreen);
register("boss", bossScreen);
register("review", reviewScreen);
register("profile", profileScreen);
register("game", gameScreen);
register("dashboard", dashboardScreen);
register("daily", dailyScreen);
register("conjugator", conjugatorScreen);

// Sounds and speech need one user gesture before they can play.
const unlock = () => {
  unlockAudio();
  removeEventListener("pointerdown", unlock);
  removeEventListener("keydown", unlock);
};
addEventListener("pointerdown", unlock);
addEventListener("keydown", unlock);
// Never lose the last answers when the tab closes.
addEventListener("pagehide", flushSave);
addEventListener("visibilitychange", () => document.visibilityState === "hidden" && flushSave());

// Screens that are safe to reopen after a live update of the page.
const RESUMABLE = new Set(["map", "unit", "review", "profile"]);

function start(data = {}) {
  initProfiles();
  const profiles = listProfiles();
  if (!profiles.length) return go("onboarding");
  const r = data.route;
  const resumable = r && RESUMABLE.has(r.name) && !r.params?.refs;
  // Several players share the device: ask who plays (except on a live reload).
  if (profiles.length > 1 && !resumable) return go("who");
  selectProfile(family.activeId || profiles[0].id);
  if (resumable) go(r.name, r.params || {});
  else go("map");
  if (!persistent) setTimeout(() => toast("Attention : ce navigateur bloque la sauvegarde. Ta progression sera perdue en fermant la page."), 800);
}

window.claude?.hot?.snapshot?.(() => ({ route }));
if (window.claude?.hot?.ready) window.claude.hot.ready(start);
else start(window.claude?.hot?.data ?? {});
