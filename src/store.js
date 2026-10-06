// Progress of the active profile: persistence, unlocking rules, XP, streaks, badges, save codes.
import { LEVELS } from "./content.js";
import { readJSON, writeJSON, profileKey } from "./storage.js";
import { freshTower, recordFloor, TOWER_LEVEL } from "./tower.js";

/** One difficulty for the whole site (the management zone is gone): "moyenne +++". */
export const FIXED_DIFFICULTY = { label: "Moyenne +++", pass: 0.85, time: 0.9, hearts: 3, replays: 2, desc: "85 % pour réussir, chrono serré, 3 cœurs contre les boss." };

export const DIFFICULTY = {
  normal: { label: "Normal", pass: 0.7, time: 1.4, hearts: 4, replays: 3, desc: "70 % pour réussir, plus de temps, 4 cœurs contre les boss." },
  hard: { label: "Difficile", pass: 0.8, time: 1, hearts: 3, replays: 2, desc: "80 % pour réussir, chrono serré, 3 cœurs contre les boss." },
  brutal: { label: "Impitoyable", pass: 0.9, time: 0.75, hearts: 2, replays: 1, desc: "90 % pour réussir, chrono très court, 2 cœurs contre les boss." },
};

export const RANKS = ["Touriste", "Débutant", "Explorateur", "Voyageur", "Aventurier", "Conteur", "Navigateur", "Stratège", "Orateur", "Débatteur", "Virtuose", "Maestro", "Bilingue"];

export function fresh() {
  return {
    v: 2,
    player: { id: "", name: "", avatar: "fox", age: "ado", createdAt: new Date().toISOString() },
    settings: { sound: true, voice: "", rate: 0.95, difficulty: "hard" },
    units: {}, // "3.2": { best, stars, passed, attempts, skipped }
    bosses: {}, // "3": { defeated, best, flawless, attempts, at }
    games: {}, // "3.2:rain": best score
    xp: 0,
    streak: { count: 0, last: "" },
    mistakes: {}, // ref: { n, at }
    fixed: 0,
    stats: { answers: 0, correct: 0, ms: 0, tests: 0, bosses: 0, games: 0 },
    words: {}, // vocab refs answered correctly at least once
    lessons: {}, // unit ids whose lesson was opened
    path: {}, // "3.2": { lesson, pron, words, practice } — the guided steps of a station
    badges: {},
    unlockAll: false,
    seen: {}, // "boss3" / "unit3.2": { last: [ids], count: { id: n } } — anti-repeat memory
    srs: {}, // card id: { box, due } — spaced repetition
    skills: {}, // skill: { n, ok }
    writing: [], // essays: { id, prompt, text, score, at }
    placement: null, // { band, line, at }
    c2: {}, // part id: { best, attempts }
    tower: null, // level 12: { floor, lives, best, resets, won }
  };
}

export function merge(base, saved) {
  const out = { ...base, ...saved };
  for (const k of ["player", "settings", "stats", "streak"]) out[k] = { ...base[k], ...(saved?.[k] || {}) };
  delete out.settings.pin; // moved to the family settings in v2
  out.unlockAll = false; // "tout débloquer" no longer exists
  out.v = 2;
  return out;
}

export const state = fresh();
const listeners = new Set();
let saveTimer = null;
let boundKey = null;

/** Replaces the whole state in place (other modules keep their reference). */
export function replaceState(next) {
  for (const k of Object.keys(state)) delete state[k];
  Object.assign(state, next);
}

/** Loads the progress of a profile into `state`; later saves go to that profile. */
export function bindProfile(id) {
  flushSave();
  boundKey = profileKey(id);
  const saved = readJSON(boundKey);
  replaceState(saved ? merge(fresh(), saved) : fresh());
  state.player.id = id;
}

/** Writes a pending save immediately. */
export function flushSave() {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
    if (boundKey) writeJSON(boundKey, state);
  }
}

export function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveTimer = null;
    if (boundKey) writeJSON(boundKey, state);
  }, 150);
  listeners.forEach((fn) => fn(state));
}
export const onChange = (fn) => (listeners.add(fn), () => listeners.delete(fn));

export const diff = () => FIXED_DIFFICULTY;

// ---------- Unlock rules ----------

export const unitState = (uid) => state.units[uid] || {};
export const bossState = (L) => state.bosses[L] || {};
export const levelDone = (L) => !!bossState(L).defeated;

export function levelUnlocked(L) {
  if (state.unlockAll || L === 1) return true;
  return levelDone(L - 1);
}
export function unitUnlocked(L, U) {
  if (!levelUnlocked(L)) return false;
  if (state.unlockAll || U === 1 || levelDone(L)) return true;
  return !!unitState(`${L}.${U - 1}`).passed;
}
export function bossReady(L) {
  const lvl = LEVELS.find((l) => l.id === L);
  if (!lvl) return false;
  return lvl.units.every((u) => unitState(u.id).passed && !unitState(u.id).redo) && !bossLocked(L);
}

// ---------- Boss lives ----------
// Each level gives 3 lives against its boss. When they are all lost, every station of the level must be
// passed again ("à refaire"); the 3 lives come back once the last one is done. A beaten boss costs no life.

export const BOSS_LIVES = 3;
export const bossLives = (L) => (levelDone(L) ? BOSS_LIVES : bossState(L).lives ?? BOSS_LIVES);
export const bossLocked = (L) => !state.unlockAll && !levelDone(L) && bossLives(L) <= 0;
/** Stations of a level still to be redone after losing the 3 lives. */
export const redoUnits = (L) => (LEVELS.find((l) => l.id === L)?.units || []).filter((u) => unitState(u.id).redo);

/** The next thing to do: first unlocked, unpassed (or to-redo) unit, the boss, or the Tower of level 12. */
export function nextStep() {
  for (const lvl of LEVELS) {
    if (!levelUnlocked(lvl.id)) break;
    if (levelDone(lvl.id)) continue;
    if (lvl.id === TOWER_LEVEL) return { type: "tower", level: lvl, floor: tower().floor };
    for (let i = 0; i < lvl.units.length; i++) {
      const u = lvl.units[i];
      if ((!unitState(u.id).passed || unitState(u.id).redo) && unitUnlocked(lvl.id, i + 1)) return { type: "unit", level: lvl, unit: u };
    }
    if (bossReady(lvl.id)) return { type: "boss", level: lvl };
  }
  return null;
}

export function highestLevelDone() {
  let n = 0;
  for (const lvl of LEVELS) if (levelDone(lvl.id)) n = Math.max(n, lvl.id);
  return n;
}
export const rank = () => RANKS[Math.min(highestLevelDone(), RANKS.length - 1)];

// ---------- Guided path inside a station ----------

export const STEPS = [
  { id: "lesson", label: "Leçon", short: "Leçon" },
  { id: "pron", label: "Prononciation", short: "Son" },
  { id: "words", label: "Mots", short: "Mots" },
  { id: "practice", label: "Pratique", short: "Pratique" },
  { id: "test", label: "Test", short: "Test" },
];
export const PRACTICE_GOAL = 2;

export const pathOf = (uid) => state.path[uid] || {};

/** Marks a preparation step as done (practice counts activities). */
export function markStep(uid, step) {
  const p = { ...pathOf(uid) };
  if (step === "practice") p.practice = (p.practice || 0) + 1;
  else p[step] = 1;
  state.path[uid] = p;
  save();
}

export function stepDone(uid, step) {
  const p = pathOf(uid);
  if (step === "practice") return (p.practice || 0) >= PRACTICE_GOAL;
  if (step === "test") return !!unitState(uid).passed;
  return !!p[step];
}

/** Preparation steps still missing before the test. */
export const missingPrep = (uid) => STEPS.filter((s) => s.id !== "test" && !stepDone(uid, s.id));

// ---------- Rewards ----------

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/** Counts today as an active day for the streak. */
export function touchStreak() {
  const t = today();
  const s = state.streak;
  if (s.last === t) return;
  const y = new Date();
  y.setDate(y.getDate() - 1);
  const yesterday = `${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, "0")}-${String(y.getDate()).padStart(2, "0")}`;
  s.count = s.last === yesterday ? s.count + 1 : 1;
  s.last = t;
}
export function streakAlive() {
  const s = state.streak;
  if (!s.last) return 0;
  const y = new Date();
  y.setDate(y.getDate() - 1);
  const yesterday = `${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, "0")}-${String(y.getDate()).padStart(2, "0")}`;
  return s.last === today() || s.last === yesterday ? s.count : 0;
}

export function addXp(n) {
  state.xp += Math.max(0, Math.round(n));
}

/** Records one answer for stats, mistakes notebook and learned words. */
export function recordAnswer(ref, ok, ms = 0, skill = "") {
  state.stats.answers++;
  if (ok) state.stats.correct++;
  state.stats.ms += Math.min(ms, 120000);
  if (skill) {
    const s = (state.skills[skill] ||= { n: 0, ok: 0 });
    s.n++;
    if (ok) s.ok++;
  }
  if (!ref) return;
  if (ok) {
    if (/^\d+\.\d+:v\d+$|^lex\d+:\d+$/.test(ref)) state.words[ref] = 1;
    const m = state.mistakes[ref];
    if (m) {
      m.n -= 1;
      if (m.n <= 0) {
        delete state.mistakes[ref];
        state.fixed++;
      }
    }
  } else {
    // A mistake must be answered right twice (three times if repeated) to leave the notebook.
    const m = state.mistakes[ref] || { n: 1, at: "" };
    m.n = Math.min(m.n + 1, 3);
    m.at = new Date().toISOString();
    state.mistakes[ref] = m;
  }
}

export const mistakeCount = () => Object.keys(state.mistakes).length;
export const wordsLearned = () => Object.keys(state.words).length;

export function starsFor(score) {
  if (score >= 0.999) return 3;
  if (score >= 0.93) return 2;
  if (score >= diff().pass) return 1;
  return 0;
}

/** Saves a unit test result; returns {passed, stars, firstPass, newBest, xp}. */
export function recordTest(uid, score) {
  const prev = unitState(uid);
  const stars = starsFor(score);
  const passed = stars > 0;
  const firstPass = passed && !prev.passed;
  const newBest = score > (prev.best || 0);
  let xp = 0;
  if (passed) xp += firstPass ? 60 : 15;
  if (stars > (prev.stars || 0)) xp += 25 * (stars - (prev.stars || 0));
  state.units[uid] = {
    ...prev,
    best: Math.max(prev.best || 0, score),
    stars: Math.max(prev.stars || 0, stars),
    passed: prev.passed || passed,
    attempts: (prev.attempts || 0) + 1,
    skipped: prev.passed ? prev.skipped : false,
    redo: prev.redo && !passed,
  };
  // A station redone after losing the boss's lives: when the last one is done, the 3 lives come back.
  const L = Number(String(uid).split(".")[0]);
  let redoCleared = false;
  let livesRestored = false;
  if (prev.redo && passed) {
    redoCleared = true;
    if (!redoUnits(L).length && !levelDone(L)) {
      state.bosses[L] = { ...bossState(L), lives: BOSS_LIVES };
      livesRestored = true;
    }
  }
  state.stats.tests++;
  addXp(xp);
  touchStreak();
  save();
  return { passed, stars, firstPass, newBest, xp, redoCleared, livesRestored, redoLeft: redoUnits(L).length };
}

/** Saves a boss result. A victory validates every unit of the level (skip challenge). */
export function recordBoss(L, { won, score, hearts, maxHearts }) {
  const prev = bossState(L);
  const firstWin = won && !prev.defeated;
  const lvl = LEVELS.find((l) => l.id === L);
  let skipped = false;
  if (won && lvl) {
    for (const u of lvl.units) {
      if (!unitState(u.id).passed) {
        skipped = true;
        state.units[u.id] = { ...unitState(u.id), passed: true, skipped: true, stars: unitState(u.id).stars || 0 };
      }
      if (unitState(u.id).redo) state.units[u.id] = { ...unitState(u.id), redo: false };
    }
  }
  // Losing costs a life (only while the boss is unbeaten). No life left: every station is to be redone.
  let lives = prev.defeated ? BOSS_LIVES : prev.lives ?? BOSS_LIVES;
  let locked = false;
  if (!won && !prev.defeated) {
    lives = Math.max(0, lives - 1);
    if (lives === 0 && lvl) {
      locked = true;
      for (const u of lvl.units) state.units[u.id] = { ...unitState(u.id), redo: true };
    }
  }
  const flawless = won && hearts === maxHearts;
  state.bosses[L] = {
    ...prev,
    lives,
    defeated: prev.defeated || won,
    best: Math.max(prev.best || 0, score),
    flawless: prev.flawless || flawless,
    attempts: (prev.attempts || 0) + 1,
    at: won && !prev.defeated ? new Date().toISOString() : prev.at,
    skipped: prev.skipped || (won && skipped),
  };
  const xp = won ? (firstWin ? 300 : 40) + (flawless ? 100 : 0) : 10;
  addXp(xp);
  state.stats.bosses++;
  touchStreak();
  save();
  return { firstWin, flawless, xp, skipped, livesLeft: lives, locked };
}

export function recordGame(key, score) {
  const best = state.games[key] || 0;
  state.games[key] = Math.max(best, score);
  state.stats.games++;
  const xp = Math.max(3, Math.min(60, Math.round(score / 25)));
  addXp(xp);
  touchStreak();
  save();
  return { best: Math.max(best, score), newBest: score > best, xp };
}

// ---------- Badges ----------

export const BADGES = [
  { id: "first-test", name: "Premier billet", desc: "Réussir ton premier test d'étape.", test: (s) => Object.values(s.units).some((u) => u.passed && !u.skipped) },
  { id: "three-stars", name: "Sans faute", desc: "Obtenir 3 étoiles à un test.", test: (s) => Object.values(s.units).some((u) => u.stars >= 3) },
  { id: "first-boss", name: "Chasseur de boss", desc: "Battre ton premier boss.", test: (s) => Object.values(s.bosses).some((b) => b.defeated && !b.placed) },
  { id: "flawless", name: "Intouchable", desc: "Battre un boss sans perdre un seul cœur.", test: (s) => Object.values(s.bosses).some((b) => b.flawless) },
  { id: "skipper", name: "Raccourci", desc: "Sauter un niveau en battant son boss directement.", test: (s) => Object.values(s.bosses).some((b) => b.skipped) },
  { id: "streak-3", name: "Ça chauffe", desc: "Jouer 3 jours de suite.", test: (s) => s.streak.count >= 3 },
  { id: "streak-7", name: "En feu", desc: "Jouer 7 jours de suite.", test: (s) => s.streak.count >= 7 },
  { id: "streak-30", name: "Inarrêtable", desc: "Jouer 30 jours de suite.", test: (s) => s.streak.count >= 30 },
  { id: "words-100", name: "Collectionneur", desc: "Réussir 100 mots différents.", test: (s) => Object.keys(s.words).length >= 100 },
  { id: "words-500", name: "Dictionnaire vivant", desc: "Réussir 500 mots différents.", test: (s) => Object.keys(s.words).length >= 500 },
  { id: "fixer", name: "Rien ne m'échappe", desc: "Corriger 25 erreurs dans ton carnet.", test: (s) => s.fixed >= 25 },
  { id: "gamer", name: "Touche-à-tout", desc: "Jouer aux 9 mini-jeux.", test: (s) => new Set(Object.keys(s.games).map((k) => k.split(":")[1])).size >= 9 },
  { id: "halfway", name: "Mi-parcours", desc: "Terminer le niveau 6.", test: (s) => !!s.bosses[6]?.defeated && !s.bosses[6]?.placed },
  { id: "bilingual", name: "Bilingue", desc: "Battre le boss final du niveau 12.", test: (s) => !!s.bosses[12]?.defeated },
  { id: "placed", name: "Radiographié", desc: "Passer le test de placement.", test: (s) => !!s.placement },
  { id: "writer", name: "Plume en herbe", desc: "Faire corriger ta première rédaction.", test: (s) => s.writing.length >= 1 },
  { id: "writer-15", name: "Plume d'or", desc: "Obtenir 15/20 ou plus à une rédaction.", test: (s) => s.writing.some((w) => w.score >= 15) },
  { id: "srs-100", name: "Mémoire d'éléphant", desc: "Réviser 100 cartes dans l'entraînement du jour.", test: (s) => (s.stats.srs || 0) >= 100 },
  { id: "c2-mock", name: "Candidat C2", desc: "Terminer un examen blanc C2.", test: (s) => !!s.c2?.mock },
];

/** Grants newly earned badges; returns them. */
export function checkBadges() {
  const fresh = [];
  for (const b of BADGES) {
    if (!state.badges[b.id] && b.test(state)) {
      state.badges[b.id] = new Date().toISOString();
      fresh.push(b);
    }
  }
  if (fresh.length) save();
  return fresh;
}

// ---------- Save codes ----------

function toB64(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin);
}
function fromB64(b64) {
  const bin = atob(b64);
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}
function sum(str) {
  let h = 7;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

export function exportCode() {
  const json = JSON.stringify(state);
  return `MB2.${sum(json)}.${toB64(json)}`;
}

/** Decodes a save code (MB1 or MB2) into a state object; throws a French message on failure. */
export function decodeCode(code) {
  const m = String(code || "").replace(/\s+/g, "").match(/^MB[12]\.([a-z0-9]+)\.([A-Za-z0-9+/=]+)$/);
  if (!m) throw new Error("Ce code ne ressemble pas à un code de sauvegarde Mission Bilingue.");
  let json;
  try {
    json = fromB64(m[2]);
  } catch {
    throw new Error("Le code est abîmé : copie-le en entier, sans espace.");
  }
  if (sum(json) !== m[1]) throw new Error("Le code est incomplet ou modifié : copie-le en entier.");
  return merge(fresh(), JSON.parse(json));
}

/** Restores the active profile's progress from a save code (the profile keeps its identity). */
export function importCode(code) {
  const next = decodeCode(code);
  const id = state.player.id;
  replaceState(next);
  state.player.id = id;
  save();
  flushSave();
}

export function resetAll() {
  const keepSettings = { ...state.settings };
  const keepPlayer = { ...state.player };
  replaceState(fresh());
  state.player = { ...state.player, id: keepPlayer.id, name: keepPlayer.name, avatar: keepPlayer.avatar, age: keepPlayer.age };
  state.settings = { ...state.settings, sound: keepSettings.sound, voice: keepSettings.voice, rate: keepSettings.rate, difficulty: keepSettings.difficulty };
  save();
}

// ---------- The Tower (level 12) ----------

/** The Tower of the active profile (created on first use). */
export function tower() {
  if (!state.tower) state.tower = freshTower();
  return state.tower;
}

/** A timed boss starts: until its result is saved, leaving (reload, closed tab) counts as a defeat. */
export function startTowerFloor(n) {
  tower().pending = n;
  save();
  flushSave();
}

/** The reveal of the current floor has been played. */
export function towerRevealed() {
  const t = tower();
  t.shown = Math.max(t.shown || 0, t.floor);
  save();
}

/** Saves the result of a floor boss; a victory at the top validates level 12. */
export function recordTowerFloor(n, win) {
  const r = recordFloor(tower(), n, win);
  if (r.event === "next") addXp(40 + n * 4);
  if (r.event === "victory") {
    addXp(1000);
    state.bosses[TOWER_LEVEL] = { ...(state.bosses[TOWER_LEVEL] || {}), defeated: true, at: new Date().toISOString(), lives: 3 };
  }
  if (r.event !== "ignored") state.stats.bosses++;
  touchStreak();
  save();
  flushSave();
  return r;
}

// ---------- Placement ----------

/** Starts the course at `line`: earlier lines are validated (marked "placed", no stars). */
export function applyPlacement(result) {
  const line = Math.max(1, Math.min(12, result.line || 1));
  const at = new Date().toISOString();
  for (const lvl of LEVELS) {
    if (lvl.id >= line) continue;
    if (!bossState(lvl.id).defeated) state.bosses[lvl.id] = { ...bossState(lvl.id), defeated: true, placed: true, at };
    for (const u of lvl.units) if (!unitState(u.id).passed) state.units[u.id] = { ...unitState(u.id), passed: true, skipped: true, placed: true, stars: 0 };
  }
  state.placement = { band: result.band, line, at, asked: result.asked, correct: result.correct };
  touchStreak();
  save();
}
