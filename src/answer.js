// Answer normalization and checking. Pure functions shared by the app and the content validator.

const SPELLING = {
  color: "colour", colors: "colours", colored: "coloured", colorful: "colourful",
  favorite: "favourite", favorites: "favourites", favor: "favour", favors: "favours",
  center: "centre", centers: "centres", theater: "theatre", theaters: "theatres",
  meter: "metre", meters: "metres", kilometer: "kilometre", kilometers: "kilometres",
  neighbor: "neighbour", neighbors: "neighbours", neighborhood: "neighbourhood",
  honor: "honour", humor: "humour", labor: "labour", flavor: "flavour", flavors: "flavours",
  behavior: "behaviour", harbor: "harbour", rumor: "rumour",
  gray: "grey", traveled: "travelled", traveling: "travelling", traveler: "traveller",
  canceled: "cancelled", canceling: "cancelling", labeled: "labelled",
  defense: "defence", offense: "offence", catalog: "catalogue", dialog: "dialogue",
  jewelry: "jewellery", pajamas: "pyjamas", mum: "mom", mummy: "mommy",
  realise: "realize", realised: "realized", organise: "organize", organised: "organized",
  apologise: "apologize", apologised: "apologized", recognise: "recognize", recognised: "recognized",
  analyse: "analyze", tyre: "tire", aluminium: "aluminum", doughnut: "donut", okay: "ok",
};

const CONTRACTIONS = [
  [/\bcan't\b/g, ["cannot", "can not"]],
  [/\bwon't\b/g, ["will not"]],
  [/\bshan't\b/g, ["shall not"]],
  [/\bain't\b/g, ["is not"]],
  [/\blet's\b/g, ["let us"]],
  [/\by'all\b/g, ["you all"]],
  [/(\w)n't\b/g, ["$1 not"]],
  [/\bi'm\b/g, ["i am"]],
  [/(\w)'re\b/g, ["$1 are"]],
  [/(\w)'ve\b/g, ["$1 have"]],
  [/(\w)'ll\b/g, ["$1 will"]],
  [/(\w)'d\b/g, ["$1 would", "$1 had"]],
  [/\b(he|she|it|that|what|where|who|there|here|how|when|why|everything|nothing|someone|somebody|everyone|this)'s\b/g, ["$1 is", "$1 has"]],
];

const NUMBERS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten",
  "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen", "twenty"];

/** Basic text cleanup: case, apostrophes, punctuation, hyphens, spaces, spelling variants. */
export function clean(input) {
  let s = String(input ?? "").toLowerCase().normalize("NFC");
  s = s.replace(/[‘’ʼ`´]/g, "'").replace(/[“”«»"]/g, " ");
  s = s.replace(/[–—-]/g, " ");
  s = s.replace(/[.,!?;:()[\]{}…/\\]/g, " ");
  s = s.replace(/(^|\s)'+|'+(\s|$)/g, " ");
  s = s.replace(/\s+/g, " ").trim();
  return s
    .split(" ")
    .map((w) => {
      if (/^\d+$/.test(w) && Number(w) <= 20) return NUMBERS[Number(w)];
      const v = SPELLING[w];
      return typeof v === "string" ? v : w;
    })
    .join(" ");
}

/** All equivalent normalized forms of a text (contractions expanded every possible way). */
export function forms(input) {
  const base = clean(input);
  let out = new Set([base]);
  for (const [re, reps] of CONTRACTIONS) {
    const next = new Set();
    for (const f of out) {
      next.add(f);
      re.lastIndex = 0;
      if (re.test(f)) {
        for (const r of reps) {
          re.lastIndex = 0;
          next.add(f.replace(re, r));
        }
      }
    }
    out = next;
    if (out.size > 64) break;
  }
  // Collapse "can not" style variants once more for safety.
  return new Set([...out].map((f) => f.replace(/\s+/g, " ").trim()));
}

/** True when the typed answer matches any accepted answer. */
export function matches(typed, accepted) {
  const list = Array.isArray(accepted) ? accepted : [accepted];
  const t = forms(typed);
  if ([...t].every((f) => f === "")) return false;
  for (const a of list) {
    for (const f of forms(a)) if (t.has(f)) return true;
  }
  return false;
}

/** Splits an English sentence into word tiles (punctuation removed, capitals kept). */
export function tiles(sentence) {
  return String(sentence)
    .replace(/[‘’]/g, "'")
    .split(/\s+/)
    .map((w) => w.replace(/^[«"“(]+|[.,!?;:»"”)]+$/g, ""))
    .filter(Boolean);
}

/** Canonical key of a tile sequence, for comparing built sentences. */
export function tileKey(words) {
  return words.map((w) => clean(w)).join(" ");
}

/** Letter-level diff for dictation feedback: returns [{ch, ok}] over the expected text. */
export function diffWords(typed, expected) {
  const a = clean(typed).split(" ").filter(Boolean);
  const b = tiles(expected);
  const bn = b.map((w) => clean(w));
  // LCS on words.
  const n = a.length, m = bn.length;
  const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--)
    for (let j = m - 1; j >= 0; j--)
      dp[i][j] = a[i] === bn[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const ok = new Array(m).fill(false);
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (a[i] === bn[j]) { ok[j] = true; i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) i++;
    else j++;
  }
  return b.map((w, k) => ({ w, ok: ok[k] }));
}
