import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

// Spelling dictionary for the writing corrector (SCOWL word lists via the wordlist-english package, see
// THIRD_PARTY.md): three frequency tiers, each sorted and prefix-coded ("3ple" = 3 letters of the previous word + "ple").
export function encodeTier(words) {
  let prev = "";
  return words
    .map((w) => {
      let p = 0;
      while (p < 35 && p < prev.length && p < w.length && prev[p] === w[p]) p++;
      prev = w;
      return p.toString(36) + w.slice(p);
    })
    .join(",");
}
// Real words missing from the SCOWL lists used here (found while testing the corrector on original essays).
const MODERN = "storytelling storyteller storytellers storyline storylines smartphone smartphones online offline website websites podcast podcasts livestream livestreams playlist playlists selfie selfies emoji emojis hashtag hashtags gameplay multiplayer esports streamer streamers influencer influencers cyberbullying screenshot screenshots wifi laptop laptops app apps blog blogs blogger vlog vlogger videogame videogames skateboarding snowboarding homeschooling teammate teammates lifestyle lifestyles workout workouts".split(" ");

export function buildDictionary(root, levels = []) {
  const dir = join(root, "node_modules", "wordlist-english");
  if (!existsSync(dir)) return "";
  const read = (s, n) => JSON.parse(readFileSync(join(dir, `${s}-words-${n}.json`), "utf8"));
  const tiers = [[10, 20], [35, 40], [50]];
  const seen = new Set();
  const out = tiers.map((sizes) => {
    const set = new Set();
    for (const s of ["english", "american", "canadian", "british"]) for (const n of sizes) for (const w of read(s, n)) {
      const x = w.toLowerCase();
      if (/^[a-z]+$/.test(x) && !seen.has(x)) set.add(x);
    }
    set.forEach((x) => seen.add(x));
    return set;
  });
  // Every word of the course content is known too (tier 2), with modern words the lists lack.
  const contentWords = [...(JSON.stringify(levels).match(/\b[A-Za-z]{2,}\b/g) || []), ...MODERN];
  for (const w of contentWords) {
    const x = w.toLowerCase();
    if (!seen.has(x)) {
      out[1].add(x);
      seen.add(x);
    }
  }
  return out.map((s) => encodeTier([...s].sort())).join("|");
}
