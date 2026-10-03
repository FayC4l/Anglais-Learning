// Family profiles: who plays, family settings (management PIN, AI key), migration from v1, backups.
import { readJSON, writeJSON, removeKey, V1_KEY, GLOBAL_KEY, profileKey } from "./storage.js";
import { state, fresh, merge, bindProfile, flushSave, save } from "./store.js";

export const AGES = {
  enfant: { label: "Enfant", desc: "moins de 13 ans" },
  ado: { label: "Ado", desc: "13 à 17 ans" },
  adulte: { label: "Adulte", desc: "18 ans et plus" },
};

export const AVATARS = [
  { id: "fox", emoji: "🦊", color: "#F28C38" },
  { id: "bear", emoji: "🐻", color: "#9C6B4E" },
  { id: "panda", emoji: "🐼", color: "#5B6475" },
  { id: "lion", emoji: "🦁", color: "#E2A529" },
  { id: "tiger", emoji: "🐯", color: "#E07B2E" },
  { id: "frog", emoji: "🐸", color: "#3FA34D" },
  { id: "octopus", emoji: "🐙", color: "#D2557A" },
  { id: "owl", emoji: "🦉", color: "#8A6BBE" },
  { id: "penguin", emoji: "🐧", color: "#2F6DB5" },
  { id: "unicorn", emoji: "🦄", color: "#C46BD8" },
  { id: "turtle", emoji: "🐢", color: "#2E9C7E" },
  { id: "dino", emoji: "🦖", color: "#4E9F3D" },
];
export const avatarOf = (id) => AVATARS.find((a) => a.id === id) || AVATARS[0];

function freshGlobal() {
  return { v: 2, pin: "", aiKey: "", aiModel: "claude-sonnet-5-5", activeId: "", profiles: [] };
}

/** Family-wide settings and the list of profiles. */
export const family = freshGlobal();

export function saveFamily() {
  writeJSON(GLOBAL_KEY, family);
}

const newId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
const cleanName = (s) => String(s || "").trim().slice(0, 20) || "Joueur";

export const listProfiles = () => family.profiles;
export const profileById = (id) => family.profiles.find((p) => p.id === id) || null;
export const activeProfile = () => profileById(family.activeId);

/** Reads the family settings and migrates a v1 single-player save. Call once at startup. */
export function initProfiles() {
  const saved = readJSON(GLOBAL_KEY);
  Object.assign(family, freshGlobal(), saved || {});
  family.profiles = Array.isArray(family.profiles) ? family.profiles : [];
  migrateV1();
  if (family.activeId && !profileById(family.activeId)) family.activeId = "";
  return family;
}

/** v1 kept one player under V1_KEY: it becomes the first profile. Returns true when migrated. */
export function migrateV1() {
  const v1 = readJSON(V1_KEY);
  if (!v1) return false;
  const id = newId();
  const data = merge(fresh(), v1);
  data.player = { ...data.player, id, name: cleanName(v1.player?.name), avatar: "fox", age: "ado" };
  if (v1.settings?.pin && !family.pin) family.pin = v1.settings.pin;
  writeJSON(profileKey(id), data);
  family.profiles.push({ id, name: data.player.name, avatar: "fox", age: "ado", createdAt: data.player.createdAt || new Date().toISOString() });
  if (!family.activeId) family.activeId = id;
  saveFamily();
  removeKey(V1_KEY);
  return true;
}

/** Creates a profile with a fresh progress and makes it active. */
export function createProfile({ name, avatar = "fox", age = "ado" } = {}) {
  const id = newId();
  const meta = { id, name: cleanName(name), avatar: avatarOf(avatar).id, age: AGES[age] ? age : "ado", createdAt: new Date().toISOString() };
  const data = fresh();
  data.player = { ...data.player, ...meta };
  writeJSON(profileKey(id), data);
  family.profiles.push(meta);
  saveFamily();
  selectProfile(id);
  return meta;
}

/** Loads a profile's progress into `state`. */
export function selectProfile(id) {
  const p = profileById(id);
  if (!p) return false;
  bindProfile(id);
  state.player = { ...state.player, id, name: p.name, avatar: p.avatar, age: p.age };
  family.activeId = id;
  saveFamily();
  return true;
}

/** Updates name / avatar / age of a profile (and of the state if it is active). */
export function updateProfile(id, patch) {
  const p = profileById(id);
  if (!p) return;
  if (patch.name !== undefined) p.name = cleanName(patch.name);
  if (patch.avatar !== undefined) p.avatar = avatarOf(patch.avatar).id;
  if (patch.age !== undefined && AGES[patch.age]) p.age = patch.age;
  saveFamily();
  if (state.player.id === id) {
    state.player = { ...state.player, name: p.name, avatar: p.avatar, age: p.age };
    save();
  } else {
    const data = readJSON(profileKey(id));
    if (data) writeJSON(profileKey(id), { ...data, player: { ...data.player, name: p.name, avatar: p.avatar, age: p.age } });
  }
}

export function deleteProfile(id) {
  family.profiles = family.profiles.filter((p) => p.id !== id);
  removeKey(profileKey(id));
  if (family.activeId === id) {
    family.activeId = "";
    if (family.profiles[0]) selectProfile(family.profiles[0].id);
  }
  saveFamily();
}

/** Progress of any profile (the active one is read from memory). */
export function profileState(id) {
  if (state.player.id === id) return state;
  const data = readJSON(profileKey(id));
  return data ? merge(fresh(), data) : null;
}

// ---------- Backups (file) ----------

/** The whole family as a JSON object (management PIN and AI key are never exported). */
export function exportFamily() {
  flushSave();
  return {
    kind: "mission-bilingue-family",
    v: 2,
    exportedAt: new Date().toISOString(),
    profiles: family.profiles.map((p) => ({ meta: { ...p }, state: profileState(p.id) })),
  };
}

/** One profile as a JSON object. */
export function exportProfile(id) {
  flushSave();
  const p = profileById(id);
  return { kind: "mission-bilingue-profile", v: 2, exportedAt: new Date().toISOString(), meta: { ...p }, state: profileState(id) };
}

/**
 * Imports a backup object. Profiles with an id already present are replaced; others are added.
 * Returns the number of imported profiles; throws a French message when the file is not a backup.
 */
export function importBackup(obj) {
  const items = obj?.kind === "mission-bilingue-family" ? obj.profiles : obj?.kind === "mission-bilingue-profile" ? [{ meta: obj.meta, state: obj.state }] : null;
  if (!Array.isArray(items) || !items.length) throw new Error("Ce fichier n'est pas une sauvegarde Mission Bilingue.");
  let n = 0;
  for (const it of items) {
    if (!it?.meta?.id || !it.state) continue;
    const meta = { id: String(it.meta.id), name: cleanName(it.meta.name), avatar: avatarOf(it.meta.avatar).id, age: AGES[it.meta.age] ? it.meta.age : "ado", createdAt: it.meta.createdAt || new Date().toISOString() };
    const data = merge(fresh(), it.state);
    data.player = { ...data.player, ...meta };
    writeJSON(profileKey(meta.id), data);
    const i = family.profiles.findIndex((p) => p.id === meta.id);
    if (i >= 0) family.profiles[i] = meta;
    else family.profiles.push(meta);
    if (state.player.id === meta.id) bindProfile(meta.id);
    n++;
  }
  if (!n) throw new Error("Aucun profil valide dans ce fichier.");
  if (!family.activeId) family.activeId = family.profiles[0].id;
  saveFamily();
  return n;
}
