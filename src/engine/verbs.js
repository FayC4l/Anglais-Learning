// Verb database and conjugator (all tenses, active and passive, negative and question forms). Pure.

// Irregular verbs: [base, past, past participle, French, level where the form is learned].
// A "/" gives accepted variants, the first one being the reference (Canadian usage).
const IRREGULAR = [
  ["be", "was/were", "been", "être", 2], ["have", "had", "had", "avoir", 2], ["do", "did", "done", "faire", 3],
  ["go", "went", "gone", "aller", 5], ["see", "saw", "seen", "voir", 5], ["make", "made", "made", "faire, fabriquer", 5],
  ["take", "took", "taken", "prendre", 5], ["come", "came", "come", "venir", 5], ["eat", "ate", "eaten", "manger", 5],
  ["drink", "drank", "drunk", "boire", 5], ["buy", "bought", "bought", "acheter", 5], ["think", "thought", "thought", "penser", 5],
  ["get", "got", "gotten/got", "obtenir, recevoir", 5], ["give", "gave", "given", "donner", 5], ["say", "said", "said", "dire", 5],
  ["tell", "told", "told", "dire, raconter", 5], ["find", "found", "found", "trouver", 5], ["know", "knew", "known", "savoir, connaître", 5],
  ["write", "wrote", "written", "écrire", 5], ["begin", "began", "begun", "commencer", 5], ["break", "broke", "broken", "casser", 5],
  ["bring", "brought", "brought", "apporter", 5], ["catch", "caught", "caught", "attraper", 5], ["choose", "chose", "chosen", "choisir", 5],
  ["fall", "fell", "fallen", "tomber", 5], ["feel", "felt", "felt", "ressentir, se sentir", 5], ["fly", "flew", "flown", "voler (dans les airs)", 5],
  ["forget", "forgot", "forgotten", "oublier", 5], ["leave", "left", "left", "partir, quitter", 5], ["lose", "lost", "lost", "perdre", 5],
  ["meet", "met", "met", "rencontrer", 5], ["pay", "paid", "paid", "payer", 5], ["run", "ran", "run", "courir", 5],
  ["sleep", "slept", "slept", "dormir", 5], ["speak", "spoke", "spoken", "parler", 5], ["win", "won", "won", "gagner", 5],
  ["wear", "wore", "worn", "porter (un vêtement)", 5], ["read", "read", "read", "lire", 5], ["put", "put", "put", "mettre", 5],
  ["cut", "cut", "cut", "couper", 5], ["sit", "sat", "sat", "s'asseoir", 5], ["stand", "stood", "stood", "être debout", 5],
  ["swim", "swam", "swum", "nager", 5], ["sing", "sang", "sung", "chanter", 5], ["drive", "drove", "driven", "conduire", 5],
  ["ride", "rode", "ridden", "faire du vélo, monter (à cheval)", 6], ["send", "sent", "sent", "envoyer", 5], ["spend", "spent", "spent", "dépenser, passer (du temps)", 5],
  ["teach", "taught", "taught", "enseigner", 5], ["understand", "understood", "understood", "comprendre", 5], ["sell", "sold", "sold", "vendre", 6],
  ["build", "built", "built", "construire", 6], ["draw", "drew", "drawn", "dessiner", 6], ["grow", "grew", "grown", "grandir, faire pousser", 6],
  ["hear", "heard", "heard", "entendre", 5], ["hold", "held", "held", "tenir", 6], ["keep", "kept", "kept", "garder", 6],
  ["lend", "lent", "lent", "prêter", 6], ["let", "let", "let", "laisser", 6], ["hide", "hid", "hidden", "cacher", 6],
  ["hit", "hit", "hit", "frapper", 6], ["hurt", "hurt", "hurt", "blesser, faire mal", 6], ["mean", "meant", "meant", "vouloir dire", 6],
  ["show", "showed", "shown", "montrer", 6], ["shut", "shut", "shut", "fermer", 6], ["steal", "stole", "stolen", "voler (dérober)", 6],
  ["throw", "threw", "thrown", "lancer", 6], ["wake", "woke", "woken", "(se) réveiller", 6], ["blow", "blew", "blown", "souffler", 7],
  ["bite", "bit", "bitten", "mordre", 7], ["feed", "fed", "fed", "nourrir", 7], ["fight", "fought", "fought", "se battre", 7],
  ["forgive", "forgave", "forgiven", "pardonner", 7], ["freeze", "froze", "frozen", "geler", 7], ["hang", "hung", "hung", "accrocher", 7],
  ["lead", "led", "led", "mener", 7], ["light", "lit", "lit", "allumer", 7], ["ring", "rang", "rung", "sonner", 7],
  ["rise", "rose", "risen", "se lever, augmenter", 7], ["shake", "shook", "shaken", "secouer", 7], ["shine", "shone", "shone", "briller", 7],
  ["shoot", "shot", "shot", "tirer, tourner (un film)", 7], ["sink", "sank", "sunk", "couler", 7], ["slide", "slid", "slid", "glisser", 7],
  ["spread", "spread", "spread", "répandre, étaler", 7], ["stick", "stuck", "stuck", "coller", 7], ["sting", "stung", "stung", "piquer (insecte)", 7],
  ["swing", "swung", "swung", "se balancer", 7], ["tear", "tore", "torn", "déchirer", 7], ["dig", "dug", "dug", "creuser", 7],
  ["bend", "bent", "bent", "plier", 8], ["bet", "bet", "bet", "parier", 8], ["bleed", "bled", "bled", "saigner", 8],
  ["cost", "cost", "cost", "coûter", 6], ["deal", "dealt", "dealt", "traiter, distribuer", 8], ["forbid", "forbade", "forbidden", "interdire", 8],
  ["lay", "laid", "laid", "poser, pondre", 8], ["lie", "lay", "lain", "être allongé", 8], ["quit", "quit", "quit", "arrêter, quitter", 8],
  ["seek", "sought", "sought", "chercher (à)", 8], ["set", "set", "set", "fixer, régler", 8], ["sweep", "swept", "swept", "balayer", 8],
  ["swear", "swore", "sworn", "jurer", 8], ["strike", "struck", "struck", "frapper, faire grève", 8], ["spin", "spun", "spun", "tourner sur soi", 8],
  ["arise", "arose", "arisen", "survenir", 9], ["bear", "bore", "borne", "supporter, porter", 9], ["bind", "bound", "bound", "lier", 9],
  ["breed", "bred", "bred", "élever (des animaux)", 9], ["broadcast", "broadcast", "broadcast", "diffuser", 9], ["flee", "fled", "fled", "fuir", 9],
  ["forecast", "forecast", "forecast", "prévoir (météo)", 9], ["foresee", "foresaw", "foreseen", "prévoir, anticiper", 10], ["grind", "ground", "ground", "moudre", 10],
  ["kneel", "knelt", "knelt", "s'agenouiller", 10], ["mislead", "misled", "misled", "induire en erreur", 10], ["mistake", "mistook", "mistaken", "confondre", 10],
  ["overcome", "overcame", "overcome", "surmonter", 9], ["overtake", "overtook", "overtaken", "dépasser, doubler", 10], ["sew", "sewed", "sewn", "coudre", 10],
  ["shrink", "shrank", "shrunk", "rétrécir", 10], ["spit", "spat", "spat", "cracher", 10], ["stink", "stank", "stunk", "puer", 10],
  ["strive", "strove", "striven", "s'efforcer", 11], ["tread", "trod", "trodden", "marcher sur, fouler", 11], ["undertake", "undertook", "undertaken", "entreprendre", 11],
  ["uphold", "upheld", "upheld", "maintenir, faire respecter", 11], ["weave", "wove", "woven", "tisser", 11], ["weep", "wept", "wept", "pleurer", 11],
  ["wind", "wound", "wound", "enrouler, remonter (une montre)", 11], ["withdraw", "withdrew", "withdrawn", "retirer", 11], ["upset", "upset", "upset", "contrarier", 9],
];

// Regular verbs: [base, French, flags]. Flag "d" = doubles its final consonant (stop → stopped, travel → travelled).
const REGULAR = [
  ["play", "jouer"], ["watch", "regarder"], ["walk", "marcher"], ["talk", "parler, discuter"], ["work", "travailler"], ["live", "habiter, vivre"],
  ["love", "adorer"], ["like", "aimer"], ["hate", "détester"], ["want", "vouloir"], ["need", "avoir besoin de"], ["help", "aider"],
  ["clean", "nettoyer"], ["cook", "cuisiner"], ["open", "ouvrir"], ["close", "fermer"], ["start", "commencer"], ["finish", "finir"],
  ["visit", "visiter"], ["travel", "voyager", "d"], ["study", "étudier"], ["try", "essayer"], ["cry", "pleurer"], ["carry", "porter, transporter"],
  ["worry", "s'inquiéter"], ["stop", "arrêter", "d"], ["plan", "prévoir, planifier", "d"], ["shop", "magasiner", "d"], ["chat", "bavarder", "d"],
  ["drop", "laisser tomber", "d"], ["jog", "faire du jogging", "d"], ["hug", "serrer dans ses bras", "d"], ["prefer", "préférer", "d"],
  ["admit", "admettre", "d"], ["regret", "regretter", "d"], ["cancel", "annuler", "d"], ["arrive", "arriver"], ["decide", "décider"],
  ["dance", "danser"], ["smile", "sourire"], ["move", "déménager, bouger"], ["hope", "espérer"], ["use", "utiliser"], ["change", "changer"],
  ["believe", "croire"], ["invite", "inviter"], ["prepare", "préparer"], ["listen", "écouter"], ["answer", "répondre"], ["ask", "demander"],
  ["call", "appeler"], ["wait", "attendre"], ["look", "regarder (un objet)"], ["learn", "apprendre"], ["rain", "pleuvoir"], ["snow", "neiger"],
  ["enjoy", "apprécier"], ["stay", "rester"], ["explain", "expliquer"], ["improve", "améliorer"], ["receive", "recevoir"], ["remember", "se souvenir"],
  ["share", "partager"], ["borrow", "emprunter"], ["order", "commander"], ["rent", "louer"], ["repair", "réparer"], ["fix", "réparer, régler"],
  ["wash", "laver"], ["brush", "brosser"], ["miss", "manquer, rater"], ["pass", "passer, réussir"], ["push", "pousser"], ["touch", "toucher"],
  ["relax", "se détendre"], ["solve", "résoudre"], ["complain", "se plaindre"], ["deny", "nier"], ["reply", "répondre (à un message)"],
  ["deliver", "livrer"], ["discover", "découvrir"], ["invent", "inventer"], ["describe", "décrire"], ["organize", "organiser"], ["realize", "se rendre compte"],
  ["offer", "offrir, proposer"], ["suggest", "suggérer"], ["agree", "être d'accord"], ["refuse", "refuser"], ["promise", "promettre"], ["manage", "réussir à, gérer"],
  ["attend", "assister à"], ["achieve", "accomplir"], ["avoid", "éviter"], ["imagine", "imaginer"], ["notice", "remarquer"], ["protect", "protéger"],
  ["publish", "publier"], ["destroy", "détruire"], ["develop", "développer"], ["paint", "peindre"], ["design", "concevoir"], ["produce", "produire"],
  ["review", "réviser, relire"], ["return", "revenir, rendre"], ["pick", "choisir, cueillir"], ["fill", "remplir"], ["climb", "grimper"], ["laugh", "rire"],
];

const VOWEL = /[aeiou]/;

function regularForms(base, dbl) {
  const last = base.slice(-1);
  const s = /(s|sh|ch|x|z|o)$/.test(base) ? `${base}es` : /[^aeiou]y$/.test(base) ? `${base.slice(0, -1)}ies` : `${base}s`;
  let ing;
  if (/ie$/.test(base)) ing = `${base.slice(0, -2)}ying`;
  else if (/[^aeiouy]e$/.test(base) || /[^e]ue$/.test(base)) ing = `${base.slice(0, -1)}ing`;
  else if (dbl) ing = `${base}${last}ing`;
  else ing = `${base}ing`;
  let ed;
  if (/e$/.test(base)) ed = `${base}d`;
  else if (/[^aeiou]y$/.test(base)) ed = `${base.slice(0, -1)}ied`;
  else if (dbl) ed = `${base}${last}ed`;
  else ed = `${base}ed`;
  return { s, ing, ed };
}

// Spelling of -s / -ing for irregular verbs that the rules above would get wrong.
const SPECIAL = {
  be: { s: "is", ing: "being" }, have: { s: "has", ing: "having" }, do: { s: "does" }, go: { s: "goes" },
  run: { ing: "running" }, swim: { ing: "swimming" }, sit: { ing: "sitting" }, get: { ing: "getting" }, put: { ing: "putting" },
  cut: { ing: "cutting" }, begin: { ing: "beginning" }, forget: { ing: "forgetting" }, win: { ing: "winning" }, hit: { ing: "hitting" },
  let: { ing: "letting" }, set: { ing: "setting" }, shut: { ing: "shutting" }, dig: { ing: "digging" }, bet: { ing: "betting" },
  quit: { ing: "quitting" }, spin: { ing: "spinning" }, spit: { ing: "spitting" }, upset: { ing: "upsetting" }, lie: { ing: "lying" },
  see: { ing: "seeing" }, flee: { ing: "fleeing" }, foresee: { ing: "foreseeing" }, upset_s: {},
};

/** All verbs: { base, past, pp, pastAlt, ppAlt, s, ing, fr, irregular, level, dbl }. */
export const VERBS = [
  ...IRREGULAR.map(([base, past, pp, fr, level]) => {
    const [p0, ...pAlt] = past.split("/");
    const [pp0, ...ppAlt] = pp.split("/");
    const reg = regularForms(base, false);
    return { base, past: p0, pastAlt: pAlt, pp: pp0, ppAlt, fr, level, irregular: true, s: SPECIAL[base]?.s || reg.s, ing: SPECIAL[base]?.ing || reg.ing };
  }),
  ...REGULAR.map(([base, fr, flags = ""]) => {
    const f = regularForms(base, flags.includes("d"));
    return { base, past: f.ed, pastAlt: [], pp: f.ed, ppAlt: [], fr, level: 5, irregular: false, s: f.s, ing: f.ing, dbl: flags.includes("d") };
  }),
];

const BY_BASE = new Map(VERBS.map((v) => [v.base, v]));
export const verb = (base) => BY_BASE.get(base) || null;

/** Forms of a verb: { base, s, ing, past, pp }. Unknown verbs are treated as regular. */
export function forms(v) {
  const x = typeof v === "string" ? verb(v) : v;
  if (x) return { base: x.base, s: x.s, ing: x.ing, past: x.past, pp: x.pp, ed: x.irregular ? x.past : x.past };
  const r = regularForms(String(v), false);
  return { base: String(v), s: r.s, ing: r.ing, past: r.ed, pp: r.ed, ed: r.ed };
}

export const TENSES = [
  { id: "present_simple", fr: "présent simple", level: 3 },
  { id: "present_continuous", fr: "présent continu (be + -ing)", level: 4 },
  { id: "past_simple", fr: "prétérit (passé simple)", level: 5 },
  { id: "past_continuous", fr: "passé continu", level: 5 },
  { id: "present_perfect", fr: "present perfect", level: 6 },
  { id: "present_perfect_continuous", fr: "present perfect continu", level: 6 },
  { id: "past_perfect", fr: "plus-que-parfait (past perfect)", level: 9 },
  { id: "past_perfect_continuous", fr: "past perfect continu", level: 9 },
  { id: "will", fr: "futur avec will", level: 6 },
  { id: "going_to", fr: "futur avec be going to", level: 6 },
  { id: "future_continuous", fr: "futur continu", level: 7 },
  { id: "future_perfect", fr: "futur antérieur (future perfect)", level: 7 },
  { id: "would", fr: "conditionnel (would)", level: 8 },
  { id: "would_have", fr: "conditionnel passé (would have)", level: 10 },
];
export const tenseById = (id) => TENSES.find((t) => t.id === id);

// Persons: 1s I, 2 you, 3s he/she/it, 1p we, 3p they.
const PRONOUN_PERSON = { i: "1s", you: "2", he: "3s", she: "3s", it: "3s", we: "1p", they: "3p" };
export const SUBJECTS = ["I", "you", "he", "she", "it", "we", "they"];

/** Person of a subject: a pronoun string, or { text, p }. */
export function personOf(subject) {
  if (subject && typeof subject === "object") return subject.p;
  return PRONOUN_PERSON[String(subject).toLowerCase()] || "3s";
}
const textOf = (subject) => (subject && typeof subject === "object" ? subject.text : String(subject));

const bePresent = (p) => (p === "1s" ? "am" : p === "3s" ? "is" : "are");
const bePast = (p) => (p === "1s" || p === "3s" ? "was" : "were");
const haveFor = (p) => (p === "3s" ? "has" : "have");
const doFor = (p) => (p === "3s" ? "does" : "do");

/** Words of the verb phrase (auxiliaries first), without negation. */
function phrase(v, tense, p, passive, needAux) {
  const f = forms(v);
  const isBe = f.base === "be";
  const pass = (aux) => [...aux, f.pp];
  switch (tense) {
    case "present_simple":
      if (passive) return pass([bePresent(p)]);
      if (isBe) return [bePresent(p)];
      return needAux ? [doFor(p), f.base] : [p === "3s" ? f.s : f.base];
    case "past_simple":
      if (passive) return pass([bePast(p)]);
      if (isBe) return [bePast(p)];
      return needAux ? ["did", f.base] : [f.past];
    case "present_continuous":
      return passive ? pass([bePresent(p), "being"]) : [bePresent(p), f.ing];
    case "past_continuous":
      return passive ? pass([bePast(p), "being"]) : [bePast(p), f.ing];
    case "present_perfect":
      return passive ? pass([haveFor(p), "been"]) : [haveFor(p), f.pp];
    case "present_perfect_continuous":
      return [haveFor(p), "been", f.ing];
    case "past_perfect":
      return passive ? pass(["had", "been"]) : ["had", f.pp];
    case "past_perfect_continuous":
      return ["had", "been", f.ing];
    case "will":
      return passive ? pass(["will", "be"]) : ["will", f.base];
    case "going_to":
      return passive ? pass([bePresent(p), "going", "to", "be"]) : [bePresent(p), "going", "to", f.base];
    case "future_continuous":
      return ["will", "be", f.ing];
    case "future_perfect":
      return passive ? pass(["will", "have", "been"]) : ["will", "have", f.pp];
    case "would":
      return passive ? pass(["would", "be"]) : ["would", f.base];
    case "would_have":
      return passive ? pass(["would", "have", "been"]) : ["would", "have", f.pp];
    default:
      throw new Error(`unknown tense ${tense}`);
  }
}

/**
 * Conjugates a verb. Returns the full form without contractions:
 *   conjugate("go", "past_simple", "she", { neg: true }) → "did not go"
 *   conjugate("go", "present_simple", "he", { question: true }) → "does he go"
 *   conjugate("build", "will", "it", { passive: true }) → "will be built"
 */
export function conjugate(v, tense, subject, { neg = false, question = false, passive = false } = {}) {
  const p = personOf(subject);
  const words = phrase(v, tense, p, passive, neg || question);
  if (neg) words.splice(1, 0, "not");
  if (question) {
    const [aux, ...rest] = words;
    return [aux, textOf(subject), ...rest].join(" ");
  }
  return words.join(" ");
}

const CONTRACT = [
  [/\bdoes not\b/g, "doesn't"], [/\bdo not\b/g, "don't"], [/\bdid not\b/g, "didn't"], [/\bis not\b/g, "isn't"], [/\bare not\b/g, "aren't"],
  [/\bwas not\b/g, "wasn't"], [/\bwere not\b/g, "weren't"], [/\bhas not\b/g, "hasn't"], [/\bhave not\b/g, "haven't"], [/\bhad not\b/g, "hadn't"],
  [/\bwill not\b/g, "won't"], [/\bwould not\b/g, "wouldn't"],
];
/** Natural contracted negative ("does not go" → "doesn't go"); "am not" stays. */
export function contract(s) {
  return CONTRACT.reduce((acc, [re, rep]) => acc.replace(re, rep), s);
}

/** Accepted past / participle forms (variants such as gotten / got). */
export const pastForms = (v) => {
  const x = typeof v === "string" ? verb(v) : v;
  return x ? [x.past, ...(x.pastAlt || [])] : [forms(v).past];
};
export const ppForms = (v) => {
  const x = typeof v === "string" ? verb(v) : v;
  return x ? [x.pp, ...(x.ppAlt || [])] : [forms(v).pp];
};

export { VOWEL };

/** The (wrong) regular past a learner might invent for an irregular verb: go → goed, buy → buyed. */
export const regularPast = (base) => regularForms(base, false).ed;
