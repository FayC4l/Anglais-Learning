// Entry point: registers screens and starts the app.
import { register, go, route } from "./router.js";
import { state } from "./store.js";
import { unlockAudio } from "./audio.js";
import { onboarding, map } from "./screens/home.js";
import { unitScreen } from "./screens/unit.js";
import { testScreen } from "./screens/test.js";
import { bossScreen } from "./screens/boss.js";
import { reviewScreen } from "./screens/review.js";
import { profileScreen } from "./screens/profile.js";
import { gameScreen } from "./games/shell.js";

register("onboarding", onboarding);
register("map", map);
register("unit", unitScreen);
register("test", testScreen);
register("boss", bossScreen);
register("review", reviewScreen);
register("profile", profileScreen);
register("game", gameScreen);

// Sounds and speech need one user gesture before they can play.
const unlock = () => {
  unlockAudio();
  removeEventListener("pointerdown", unlock);
  removeEventListener("keydown", unlock);
};
addEventListener("pointerdown", unlock);
addEventListener("keydown", unlock);

// Screens that are safe to reopen after a live update of the page.
const RESUMABLE = new Set(["map", "unit", "review", "profile"]);

function start(data = {}) {
  const r = data.route;
  if (!state.player.name) go("onboarding");
  else if (r && RESUMABLE.has(r.name) && !r.params?.refs) go(r.name, r.params || {});
  else go("map");
}

window.claude?.hot?.snapshot?.(() => ({ route }));
if (window.claude?.hot?.ready) window.claude.hot.ready(start);
else start(window.claude?.hot?.data ?? {});
