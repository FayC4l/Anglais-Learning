// Marks a text out of 20: content, communicative achievement, organisation, language (each /5),
// with strengths, priorities and an estimated CEFR level. Pure.

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const BANDS = ["A1", "A2", "B1", "B2", "C1", "C2"];
const bandOfLevel = (L) => (L <= 2 ? "A1" : L <= 4 ? "A2" : L <= 6 ? "B1" : L <= 9 ? "B2" : L <= 11 ? "C1" : "C2");

const FORMAL = new Set(["report", "proposal", "essay", "letter", "article", "review"]);
const CORRESPONDENCE = new Set(["email", "letter", "message"]);
const WEIGHT = { grammar: 1, vocab: 0.8, spelling: 0.7, mechanics: 0.4, style: 0.2 };
const CAT_FR = { grammar: "grammaire", vocab: "vocabulaire et expressions", spelling: "orthographe", mechanics: "majuscules et ponctuation", style: "style" };
const TENSE_FR = { present_simple: "présent simple", present_continuous: "présent continu", past_simple: "prétérit", past_continuous: "passé continu", present_perfect: "present perfect", past_perfect: "past perfect", future: "futur", conditional: "conditionnel", passive: "passif", modal: "modaux" };
const SYNONYMS = { good: "great, excellent, fine", very: "really, extremely, incredibly", nice: "pleasant, lovely, kind", big: "huge, large, enormous", bad: "awful, terrible, poor", thing: "object, aspect, issue", things: "objects, aspects, issues", like: "enjoy, love, am fond of", said: "explained, replied, added", went: "travelled, headed, walked", really: "truly, genuinely, extremely", people: "individuals, citizens, residents", important: "essential, crucial, vital", think: "believe, feel, consider", interesting: "fascinating, intriguing, captivating", also: "moreover, in addition, as well", because: "since, as, given that", make: "create, produce, build", lot: "plenty, a great deal, numerous", beautiful: "stunning, gorgeous, picturesque" };

/** Expectations by course level (1-12). */
function expectations(L) {
  return {
    sentence: L <= 2 ? [4, 9] : L <= 4 ? [6, 12] : L <= 6 ? [8, 15] : L <= 8 ? [10, 18] : L <= 10 ? [12, 22] : [14, 26],
    mattr: L <= 2 ? 0.55 : L <= 4 ? 0.6 : L <= 6 ? 0.65 : L <= 8 ? 0.68 : L <= 10 ? 0.7 : 0.72,
    soph: L <= 4 ? 0.06 : L <= 8 ? 0.12 : 0.2,
    connectorsPer100: L <= 2 ? 1.5 : L <= 4 ? 2.5 : L <= 6 ? 3 : L <= 8 ? 3.5 : 4,
    tenses: L <= 2 ? 1 : L <= 4 ? 2 : L <= 6 ? 3 : L <= 8 ? 4 : 5,
    errorZero: L <= 4 ? 10 : L <= 8 ? 9 : 8, // weighted errors per 100 words that bring accuracy to 0
  };
}

/** Rough CEFR level of the text itself (independent of the prompt). */
export function textBand(a) {
  if (a.words < 15) return "A1";
  const e = errorDensity(a);
  const idx = (a.avgSentence - 5) / 2.4 + (a.mattr - 0.5) * 14 + a.sophistication * 12 + Object.keys(a.connectors).length * 0.25 - e * 0.22;
  return BANDS[clamp(Math.floor(idx / 2), 0, 5)];
}

export function errorDensity(a) {
  const sum = a.issues.reduce((s, x) => s + (WEIGHT[x.cat] ?? 0.5), 0);
  return a.words ? (sum / a.words) * 100 : 0;
}

/**
 * score(analysis, prompt) → { total, criteria: {content, communicative, organisation, language}, band, textBand,
 *   strengths: [], priorities: [], details }
 */
export function score(a, prompt = {}) {
  const L = Math.max(1, Math.min(12, prompt.level || 6));
  const ex = expectations(L);
  const [min, max] = prompt.words || [40, 120];
  const n = a.words;
  const strengths = [];
  const priorities = [];

  // ----- Content: length and the prompt's requirements -----
  const wordFit = n >= min && n <= max * 1.15 ? 1 : n < min ? clamp((n / min - 0.4) / 0.6) : clamp(1 - (n / max - 1.15) * 1.5, 0.5, 1);
  const checks = a.checks || [];
  const reqRatio = checks.length ? checks.filter((c) => c.ok).length / checks.length : 1;
  let content = n < 8 ? 0 : 5 * (0.45 * wordFit + 0.55 * reqRatio);
  if (n < min) priorities.push(`Ton texte est trop court : ${n} mots pour ${min} à ${max} demandés.`);
  else if (n > max * 1.15) priorities.push(`Ton texte est un peu long : ${n} mots (${min} à ${max} demandés). Va à l'essentiel.`);
  checks.filter((c) => !c.ok).forEach((c) => priorities.push(`Consigne non remplie : ${c.label} (${c.got}/${c.min}).`));
  if (checks.length && reqRatio === 1) strengths.push("Tu as respecté toutes les consignes du sujet.");

  // ----- Communicative achievement: register, layout of messages, readability -----
  let comm = 3.5;
  const formal = FORMAL.has(prompt.type) && (L >= 9 || ["report", "proposal"].includes(prompt.type));
  if (formal && a.contractions > 2) {
    comm -= 0.6;
    priorities.push("Registre soutenu demandé : évite les contractions (I'm, don't…) et écris I am, do not.");
  }
  if (a.slang) {
    comm -= Math.min(1, a.slang * 0.4);
    priorities.push("Évite le langage familier (gonna, wanna, yeah…) dans un texte écrit.");
  }
  if (CORRESPONDENCE.has(prompt.type)) {
    comm += a.greeting ? 0.4 : -0.5;
    comm += a.signoff ? 0.4 : -0.4;
    if (!a.greeting) priorities.push("Commence ton message par une formule d'appel (Hi Emma, / Dear Sir or Madam,).");
    if (!a.signoff) priorities.push("Termine par une formule de fin (See you soon! / Best wishes, / Yours sincerely,) et ta signature.");
    if (a.greeting && a.signoff) strengths.push("Message bien présenté : formule d'appel et formule de fin.");
  }
  const [lo, hi] = ex.sentence;
  if (a.avgSentence >= lo && a.avgSentence <= hi) comm += 0.4;
  else if (a.avgSentence < lo) {
    comm -= 0.3;
    if (L >= 5) priorities.push("Tes phrases sont très courtes : relie-les avec who, which, because, although…");
  } else {
    comm -= 0.4;
    priorities.push("Certaines phrases sont très longues : coupe-les pour rester clair.");
  }
  if (a.sdSentence >= 3 && a.sentences >= 4) comm += 0.4;
  // Sentences glued together without full stops are hard to read.
  const runOns = a.issues.filter((x) => x.rule === "missing-period").length;
  if (runOns) {
    comm -= Math.min(1.5, runOns * 0.35);
    priorities.push("Plusieurs phrases sont collées sans point : une idée = une phrase, avec un point à la fin.");
  }
  comm = clamp(comm, 0, 5);

  // ----- Organisation: connectors and paragraphs -----
  const distinct = Object.keys(a.connectors).length;
  const wantConn = Math.max(1, (ex.connectorsPer100 * Math.max(n, 30)) / 100);
  let conn = clamp(distinct / wantConn);
  if (L >= 7 && a.advancedConnectors.length) conn = clamp(conn + 0.15);
  if (L >= 7 && a.basicOnly && distinct) priorities.push("Varie tes mots de liaison : however, moreover, whereas, as a result…");
  const needParas = (checks.find((c) => c.kind === "paragraphs")?.min) || (L >= 7 && n >= 120 ? 3 : 1);
  const para = needParas <= 1 ? 1 : clamp((a.paragraphs - 1) / (needParas - 1));
  if (needParas > 1 && a.paragraphs < needParas) priorities.push(`Organise ton texte en ${needParas} paragraphes (laisse une ligne vide entre deux paragraphes).`);
  let organisation = 5 * (0.6 * conn + 0.4 * para);
  if (a.sentences < 2 && n > 15) organisation -= 1;
  organisation = clamp(organisation, 0, 5);
  if (conn >= 0.9) strengths.push(`Bons mots de liaison (${Object.keys(a.connectors).slice(0, 4).join(", ")}).`);
  if (needParas > 1 && a.paragraphs >= needParas) strengths.push("Texte bien découpé en paragraphes.");

  // ----- Language: accuracy, range, sophistication, tenses -----
  const e = errorDensity(a);
  const accuracy = clamp(1 - e / ex.errorZero);
  const range = clamp((a.mattr - (ex.mattr - 0.15)) / 0.15);
  const soph = clamp(a.sophistication / ex.soph);
  const tenseCount = Object.entries(a.tenses).filter(([k, v]) => v > 0 && k !== "modal").length + (a.tenses.modal ? 0.5 : 0);
  const tenseVar = clamp(tenseCount / ex.tenses);
  const language = clamp(5 * (0.6 * accuracy + 0.15 * range + 0.1 * soph + 0.15 * tenseVar), 0, 5);
  if (accuracy >= 0.85 && n >= min * 0.7) strengths.push("Très peu d'erreurs de langue : bravo pour la précision !");
  if (range >= 0.85) strengths.push("Vocabulaire varié.");
  if (tenseVar >= 1) strengths.push(`Bonne variété de temps (${Object.entries(a.tenses).filter(([, v]) => v).map(([k]) => TENSE_FR[k]).slice(0, 4).join(", ")}).`);
  const byCat = {};
  for (const x of a.issues) byCat[x.cat] = (byCat[x.cat] || 0) + 1;
  Object.entries(byCat)
    .sort((x, y) => (WEIGHT[y[0]] || 0) * y[1] - (WEIGHT[x[0]] || 0) * x[1])
    .slice(0, 2)
    .forEach(([cat, k]) => k >= 2 && priorities.push(`${k} erreurs de ${CAT_FR[cat]} : relis-les dans le texte souligné.`));
  if (a.repeated.length) priorities.push(`Tu répètes souvent : ${a.repeated.map(([w, k]) => `${w} (${k}×)${SYNONYMS[w] ? ` → essaie ${SYNONYMS[w]}` : ""}`).join(" ; ")}.`);

  const raw = content + comm + organisation + language;
  let total = Math.round(raw * 2) / 2;
  if (n < min * 0.3) total = Math.min(total, 5);
  return {
    total,
    criteria: { content: round1(content), communicative: round1(comm), organisation: round1(organisation), language: round1(language) },
    band: bandOfLevel(L),
    textBand: textBand(a),
    strengths: strengths.slice(0, 4),
    priorities: priorities.slice(0, 5),
    details: { errorDensity: Math.round(e * 10) / 10, accuracy, range, soph, tenseVar, wordFit, reqRatio, conn, para },
  };
}

const round1 = (x) => Math.round(x * 10) / 10;

export const CRITERIA_FR = { content: "Contenu et consigne", communicative: "Efficacité du message", organisation: "Organisation", language: "Langue (grammaire, vocabulaire)" };
export { CAT_FR };
