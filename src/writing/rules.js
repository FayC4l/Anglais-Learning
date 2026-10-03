// Grammar, vocabulary and mechanics rules aimed at the typical mistakes of French speakers.
// checkRules(tk) → issues [{ start, end, cat, rule, msg, fix: [] }] (character offsets). Pure.
import { VERBS, verb, forms, regularPast } from "../engine/verbs.js";
import { tierOf } from "./spell.js";

// ---------- Verb form lookups ----------
const BASE = new Set();
const S_FORM = new Map(); // "goes" → "go"
const PAST = new Map(); // "went" → "go" (only forms that differ from the base)
const PP = new Map();
const ING = new Map();
const PAST_NOT_PP = new Map(); // "went" → "gone" (irregular verbs whose past ≠ participle)
const OVERREG = new Map(); // "goed" → "went"
for (const v of VERBS) {
  BASE.add(v.base);
  if (v.s !== v.base) S_FORM.set(v.s, v.base);
  if (v.base !== "be") {
    for (const p of [v.past, ...(v.pastAlt || [])]) if (p !== v.base) PAST.set(p, v.base);
    for (const p of [v.pp, ...(v.ppAlt || [])]) if (p !== v.base) PP.set(p, v.base);
  }
  ING.set(v.ing, v.base);
  if (v.irregular && v.past !== v.pp && !v.ppAlt?.includes(v.past) && v.base !== "be") PAST_NOT_PP.set(v.past, v.pp);
  if (v.irregular) {
    const wrong = regularPast(v.base);
    if (wrong !== v.past && wrong !== v.pp && !v.pastAlt?.includes(wrong)) OVERREG.set(wrong, v.past);
  }
}
for (const [w, r] of Object.entries({ runned: "ran", swimmed: "swam", sitted: "sat", getted: "got", putted: "put", cutted: "cut", hitted: "hit", letted: "let", setted: "set", beginned: "began", winned: "won", forgetted: "forgot", shutted: "shut", quitted: "quit", hurted: "hurt", costed: "cost", bringed: "brought", thinked: "thought", buyed: "bought", catched: "caught", teached: "taught", goed: "went", eated: "ate", drinked: "drank", writed: "wrote", speaked: "spoke", taked: "took", maked: "made", gived: "gave", comed: "came", knowed: "knew", seed: "saw", sayed: "said", payed: "paid", leaved: "left", feeled: "felt", finded: "found", losed: "lost", meeted: "met", sleeped: "slept", standed: "stood", understanded: "understood", weared: "wore", growed: "grew", throwed: "threw", drived: "drove", flied: "flew", choosed: "chose", falled: "fell", breaked: "broke", stealed: "stole", telled: "told", sended: "sent", spended: "spent", selled: "sold", builded: "built", keeped: "kept", leaded: "led", holded: "held", rided: "rode", singed: "sang", hided: "hid", wined: "won", fighted: "fought", feeded: "fed", digged: "dug" })) OVERREG.set(w, r);

const AUX_BEFORE_BASE = new Set(["do", "does", "did", "don't", "doesn't", "didn't", "can", "could", "will", "would", "should", "must", "may", "might", "shall", "can't", "couldn't", "won't", "wouldn't", "shouldn't", "mustn't", "let", "lets", "make", "makes", "made", "help", "helps", "helped", "watch", "watched", "see", "saw", "hear", "heard", "feel", "felt", "that", "to", "not", "and", "or", "'ll", "'d", "i'll", "you'll", "we'll", "they'll", "rather", "better", "than"]);
const FREQ_ADV = new Set(["always", "usually", "often", "sometimes", "never", "rarely", "seldom", "also", "really", "still", "just", "even", "only", "already", "generally", "normally", "frequently", "hardly", "ever"]);
const MODALS = new Set(["can", "could", "will", "would", "should", "must", "might", "may", "shall", "can't", "couldn't", "won't", "wouldn't", "shouldn't", "mustn't", "cannot", "i'll", "you'll", "he'll", "she'll", "it'll", "we'll", "they'll"]);
const SAME_PAST = new Set(VERBS.filter((v) => v.past === v.base).map((v) => v.base)); // cost, cut, put, read…
const NOUNISH_S = new Set(["works", "hopes", "plans", "uses", "needs", "helps", "calls", "looks", "rains", "snows", "dances", "smiles", "changes", "answers", "orders", "fixes", "reviews", "returns", "picks", "fills", "laughs", "waits", "talks", "walks", "shows", "sells", "costs", "hits", "sets", "bets", "deals", "lies", "rings", "rises", "shakes", "sinks", "slides", "spreads", "sticks", "stings", "swings", "tears", "digs", "bends", "feeds", "fights", "freezes", "hangs", "leads", "lights", "shines", "shoots", "spins", "strikes", "sweeps", "swears", "winds", "weeps", "binds", "breeds", "broadcasts", "forecasts", "grinds", "stinks", "treads", "upsets", "withdraws", "studies", "visits", "travels", "chats", "drops", "jogs", "hugs", "regrets", "plays", "watches", "drinks", "cooks", "cleans", "dishes"]);

const SUBJ_3S = new Set(["he", "she", "it"]);
const SUBJ_PL = new Set(["i", "you", "we", "they"]);
const NUM = "(?:\\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)(?:[- ](?:one|two|three|four|five|six|seven|eight|nine))?";
const DUR = "(?:years?|months?|weeks?|days?|hours?|minutes?|seconds?)";

const COMPARATIVE = { big: "bigger", small: "smaller", tall: "taller", short: "shorter", long: "longer", old: "older", young: "younger", fast: "faster", slow: "slower", cheap: "cheaper", hot: "hotter", cold: "colder", easy: "easier", happy: "happier", nice: "nicer", good: "better", bad: "worse", strong: "stronger", weak: "weaker", rich: "richer", poor: "poorer", high: "higher", low: "lower", large: "larger", great: "greater", early: "earlier", late: "later", near: "nearer", far: "farther", hard: "harder", busy: "busier", funny: "funnier", heavy: "heavier", pretty: "prettier", smart: "smarter", clean: "cleaner", dirty: "dirtier", close: "closer", warm: "warmer", fat: "fatter", thin: "thinner", wet: "wetter", dry: "drier", safe: "safer", simple: "simpler", quiet: "quieter" };
const SUPERLATIVE = Object.fromEntries(Object.entries(COMPARATIVE).map(([a, c]) => [a, { good: "best", bad: "worst", far: "farthest" }[a] || c.replace(/er$/, "est")]));
const COMP_FORMS = new Set(Object.values(COMPARATIVE));
const SUP_FORMS = new Set(Object.values(SUPERLATIVE));

// ---------- Rule tables ----------
const keepCase = (orig, rep) => (/^[A-Z]/.test(orig) ? rep.charAt(0).toUpperCase() + rep.slice(1) : rep);

/**
 * Phrase rules: [id, cat, regex, message, fix(match, ...groups) → string | string[]].
 * Regexes are applied to the whole text, case-insensitively, with word boundaries.
 */
const PHRASES = [
  ["be-agree", "grammar", /\b(am|is|are|'m|'re|'s)\s+agree\b/gi, "« agree » est un verbe : on dit [[I agree]], jamais « I am agree ».", (m) => "agree"],
  ["have-age", "grammar", new RegExp(`\\b(have|has|had)\\s+(${NUM})\\s+years?(\\s+old)?\\b(?!\\s+(?:of|ago|experience|left|to|in|before|since))`, "gi"), "L'âge se dit avec **be** : [[I am twelve (years old)]], pas « I have twelve years ».", (m, have, n) => `${{ have: "am", has: "is", had: "was" }[have.toLowerCase()]} ${n} years old`],
  ["since-duration", "grammar", new RegExp(`\\bsince\\s+((?:${NUM}|a|an|several|a few|many)\\s+${DUR})\\b`, "gi"), "Avec une **durée**, on emploie **for** ([[for two years]]). **since** + point de départ ([[since Monday]]).", (m, d) => `for ${d}`],
  ["during-duration", "grammar", new RegExp(`\\bduring\\s+((?:${NUM}|a|an|several|a few)\\s+${DUR})\\b`, "gi"), "« pendant deux heures » = [[for two hours]] (during + un nom d'événement : [[during the movie]]).", (m, d) => `for ${d}`],
  ["there-ago", "grammar", new RegExp(`\\bthere\\s+(?:is|are|was|were)\\s+((?:${NUM}|a few|several)\\s+${DUR})\\b(?!\\s+(?:left|to go|in|before|until|of))`, "gi"), "« il y a deux ans » (dans le passé) = [[two years ago]], pas « there are two years ».", (m, d) => `${d} ago`],
  ["depend-of", "vocab", /\b(depends?|depended|depending)\s+of\b/gi, "On dit **depend on**, pas « depend of ».", (m, v) => `${v} on`],
  ["married-with", "vocab", /\bmarried\s+with\b/gi, "On est [[married to]] quelqu'un.", () => "married to"],
  ["listen-to", "vocab", /\b(listen|listens|listened|listening)\s+(?!to\b)(music|the|a|my|your|his|her|our|their|this|that|it|him|them|me|us|podcasts?|songs?|radio)\b/gi, "On écoute **quelque chose** : [[listen to]] (avec to).", (m, v, x) => `${v} to ${x}`],
  ["discuss-about", "vocab", /\b(discuss|discusses|discussed|discussing)\s+about\b/gi, "**discuss** n'a pas besoin de « about » : [[discuss the problem]].", (m, v) => v],
  ["explain-me", "vocab", /\b(explain|explains|explained|explaining)\s+(me|him|her|us|them)\b/gi, "On explique **à** quelqu'un : [[explain to me]].", (m, v, p) => `${v} to ${p}`],
  ["say-me", "vocab", /\b(say|says|said|saying)\s+(me|him|her|us|them)\b/gi, "« dire à quelqu'un » = **tell** + personne : [[tell me]], [[told him]].", (m, v, p) => `${{ say: "tell", says: "tells", said: "told", saying: "telling" }[v.toLowerCase()]} ${p}`],
  ["tell-that", "vocab", /\b(tell|tells|told)\s+that\b/gi, "**tell** veut une personne ([[told me that…]]) ; sans personne, on dit **say** : [[said that…]].", (m, v) => `${{ tell: "say", tells: "says", told: "said" }[v.toLowerCase()]} that`],
  ["enter-in", "vocab", /\b(enter|enters|entered|entering)\s+(?:in|into)\s+(?=the|a|my|our|his|her|their)/gi, "**enter** se construit sans préposition : [[enter the room]].", (m, v) => `${v} `],
  ["answer-to", "vocab", /\b(answer|answers|answered|answering)\s+to\s+(the|my|your|his|her|this|that|a)\b/gi, "On dit [[answer the question]], sans « to ».", (m, v, d) => `${v} ${d}`],
  ["arrive-to", "vocab", /\b(arrive|arrives|arrived|arriving)\s+to\b/gi, "On arrive **at** (un lieu précis) ou **in** (une ville, un pays) : [[arrive at school]], [[arrive in Montreal]].", (m, v) => [`${v} at`, `${v} in`]],
  ["to-home", "vocab", /\b(go|goes|went|gone|going|come|comes|came|coming|get|gets|got|arrive|arrived|return|returned)\s+to\s+home\b/gi, "« rentrer à la maison » = [[go home]] (sans « to »).", (m, v) => `${v} home`],
  ["more-short", "grammar", new RegExp(`\\bmore\\s+(${Object.keys(COMPARATIVE).join("|")})\\b(?!\\s+(?:and|or)\\b)`, "gi"), "Adjectif court : on ajoute **-er** ([[bigger]]), pas « more big ».", (m, a) => COMPARATIVE[a.toLowerCase()]],
  ["more-comp", "grammar", new RegExp(`\\bmore\\s+(${[...COMP_FORMS].join("|")})\\b`, "gi"), "Double comparatif : [[better]] suffit, sans « more ».", (m, c) => c],
  ["very-comp", "grammar", new RegExp(`\\bvery\\s+(${[...COMP_FORMS].join("|")})\\b`, "gi"), "Devant un comparatif, on dit **much** : [[much bigger]], pas « very bigger ».", (m, c) => `much ${c}`],
  ["most-short", "grammar", new RegExp(`\\b(the\\s+)?most\\s+(${Object.keys(SUPERLATIVE).join("|")})\\b`, "gi"), "Adjectif court : superlatif en **-est** ([[the biggest]]).", (m, the, a) => `${the || ""}${SUPERLATIVE[a.toLowerCase()]}`],
  ["most-sup", "grammar", new RegExp(`\\bmost\\s+(${[...SUP_FORMS].join("|")})\\b`, "gi"), "Double superlatif : [[the best]] suffit.", (m, s) => s],
  ["uncountable-plural", "grammar", /\b(informations|advices|furnitures|homeworks|knowledges|equipments|luggages|baggages|softwares|feedbacks)\b/gi, "Ce nom est **indénombrable** en anglais : pas de -s ([[information]], [[advice]]…).", (m, w) => w.slice(0, -1)],
  ["uncountable-article", "grammar", /\b(an?)\s+(information|advice|homework|furniture|luggage|bread|money|music|knowledge|equipment|traffic)\b(?!\s+(?:desk|centre|center|teacher|class|store|shop|festival|lesson|box|session|bag))/gi, "Nom indénombrable : pas de **a / an**. Dis [[some advice]] ou [[a piece of advice]].", (m, a, w) => [`some ${w}`, `a piece of ${w}`]],
  ["irregular-plural", "grammar", /\b(childs|womans|foots|tooths|sheeps|fishs|mouses|gooses)\b/gi, "Pluriel irrégulier !", (m, w) => ({ childs: "children", womans: "women", foots: "feet", tooths: "teeth", sheeps: "sheep", fishs: "fish", mouses: "mice", gooses: "geese" })[w.toLowerCase()]],
  ["adjective-plural", "grammar", /\b(differents|importants|interestings|beautifuls|bigs|smalls|others)\s+(people|children|students|things|countries|days|places|ideas|kinds|reasons|ways|cultures|languages|cities|friends|books|games|problems|subjects|teachers)\b/gi, "Les adjectifs anglais sont **invariables** : pas de -s ([[different people]], [[other people]]).", (m, a, n) => `${a.slice(0, -1)} ${n}`],
  ["modal-of", "grammar", /\b(could|should|would|must|might)\s+of\b/gi, "On écrit [[could have]] (ou [[could've]]), jamais « could of ».", (m, md) => `${md} have`],
  ["your-welcome", "grammar", /\byour\s+welcome\b/gi, "« De rien » = [[you're welcome]] (you are).", () => "you're welcome"],
  ["its-is", "grammar", /\bits\s+(a|an|the|very|not|so|too|raining|snowing|cold|hot|time|going|been|important|difficult|easy|possible|impossible|true|ok|okay|fine|great|good|bad|late|early|nice|fun|funny|interesting|boring|hard|my|your|our|their)\b/gi, "**it's** = it is. **its** = son / sa (possessif).", (m, x) => `it's ${x}`],
  ["its-own", "grammar", /\bit's\s+(own|tail|name|colour|color|legs?|eyes|head|body|wings|owner|nest|fur|shape|size)\b/gi, "Possessif : **its** (sans apostrophe). [[it's]] = it is.", (m, x) => `its ${x}`],
  ["their-is", "grammar", /\btheir\s+(is|are|was|were)\b/gi, "« il y a » = **there** is / there are. [[their]] = leur.", (m, v) => `there ${v}`],
  ["then-than", "grammar", new RegExp(`\\b((?:${[...COMP_FORMS].join("|")})|more\\s+[a-z]+|less\\s+[a-z]+)\\s+then\\b`, "gi"), "Après un comparatif, « que » = **than** (pas then = ensuite).", (m, c) => `${c} than`],
  ["loose-lose", "vocab", /\bloose\s+(the|my|your|his|her|our|their|a|weight|time|money|control|interest)\b/gi, "« perdre » = **lose** (un seul o). [[loose]] = lâche, ample.", (m, x) => `lose ${x}`],
  ["advice-verb", "vocab", /\b(I|we|they|you|to|will|would|can|should)\s+advice\b/gi, "Le verbe s'écrit **advise** (avec un s) ; [[advice]] est le nom.", (m, x) => `${x} advise`],
  ["make-do", "vocab", /\b(make|makes|made|making)\s+((?:a\s+)?party|sports?|(?:my|the|your|his|her|our|their)\s+homework|homework|(?:a\s+)?photos?|(?:a\s+)?pictures?|(?:a\s+)?walk|(?:a\s+)?questions?|attention|the\s+dishes|the\s+shopping)\b/gi, "Collocation : on ne « make » pas ça en anglais.", (m, v, x) => {
    const base = { make: 0, makes: 1, made: 2, making: 3 }[v.toLowerCase()];
    const conj = (forms4) => forms4[base];
    const lx = x.toLowerCase();
    if (/party/.test(lx)) return `${conj(["have", "has", "had", "having"])} a party`;
    if (/sport/.test(lx)) return `${conj(["do", "does", "did", "doing"])} ${lx.replace(/^a\s+/, "")}`;
    if (/homework/.test(lx)) return `${conj(["do", "does", "did", "doing"])} ${lx}`;
    if (/photo|picture/.test(lx)) return `${conj(["take", "takes", "took", "taking"])} ${lx}`;
    if (/walk/.test(lx)) return `${conj(["go", "goes", "went", "going"])} for a walk`;
    if (/question/.test(lx)) return `${conj(["ask", "asks", "asked", "asking"])} ${lx}`;
    if (/attention/.test(lx)) return `${conj(["pay", "pays", "paid", "paying"])} attention`;
    return `${conj(["do", "does", "did", "doing"])} ${lx}`;
  }],
  ["do-make", "vocab", /\b(do|does|did|doing|done)\s+((?:a\s+|an\s+)?(?:mistakes?|noise|promises?|decision|effort|progress))\b/gi, "Collocation : on dit **make** a mistake / a noise / a promise / an effort / progress.", (m, v, x) => `${{ do: "make", does: "makes", did: "made", doing: "making", done: "made" }[v.toLowerCase()]} ${x}`],
  ["according-me", "vocab", /\baccording\s+to\s+me\b/gi, "« selon moi » = [[in my opinion]] (according to + quelqu'un d'autre).", () => "in my opinion"],
  ["other-hand", "vocab", /\bin\s+the\s+other\s+hand\b/gi, "« d'autre part » = [[on the other hand]].", () => "on the other hand"],
  ["assist-attend", "vocab", /\b(assist|assists|assisted|assisting)\s+(?:to|at)\s+(the|a|my|this|his|her|our|their)\b/gi, "Faux ami : « assister à » = **attend**. [[assist]] = aider.", (m, v, d) => `${{ assist: "attend", assists: "attends", assisted: "attended", assisting: "attending" }[v.toLowerCase()]} ${d}`],
  ["interesting-in", "vocab", /\b(am|is|are|was|were|'m|'re|'s)\s+interesting\s+(in|by)\b/gi, "On est [[interested in]] quelque chose ([[interesting]] = intéressant pour les autres).", (m, b) => `${b} interested in`],
  ["boring-bored", "style", /\b(I\s+am|I'm|I\s+was|we\s+are|we're|we\s+were)\s+boring\b/gi, "« je m'ennuie » = [[I'm bored]]. « I'm boring » = je suis ennuyeux (oups !).", (m, s) => `${s} bored`],
  ["be-born", "grammar", /\b(am|is|are|'m|'re)\s+born\b/gi, "« je suis né » = [[I was born]] (au passé).", (m, b) => `${{ am: "was", "'m": " was", is: "was", are: "were", "'re": " were" }[b.toLowerCase()].trim()} born`],
  ["despite-of", "grammar", /\bdespite\s+of\b/gi, "[[despite]] ou [[in spite of]], mais jamais « despite of ».", () => ["despite", "in spite of"]],
  ["same-than", "grammar", /\bthe\s+same\s+than\b/gi, "« le même que » = [[the same as]].", () => "the same as"],
  ["different-of", "vocab", /\bdifferent\s+of\b/gi, "« différent de » = [[different from]].", () => "different from"],
  ["alot", "mechanics", /\balot\b/gi, "**a lot** s'écrit en deux mots.", () => "a lot"],
  ["everyday", "vocab", /\beveryday(?=\s*[.!?,]|\s*$)/gi, "Adverbe « tous les jours » = [[every day]] (en deux mots). [[everyday]] est un adjectif.", () => "every day"],
  ["everyday-start", "vocab", /(^|[.!?]\s+)(everyday)\s+(?=i|we|he|she|they|you|my|the)\b/gi, "« Tous les jours, … » = [[Every day]] (en deux mots).", (m, pre) => `${pre}Every day `],
  ["how-many-much", "grammar", /\bhow\s+many\s+(money|time|water|information|homework|milk|sugar|bread|music|advice|work|traffic|luggage)\b/gi, "Indénombrable : [[how much]].", (m, n) => `how much ${n}`],
  ["how-much-many", "grammar", /\bhow\s+much\s+(people|friends|students|children|books|cars|times|days|hours|euros|dollars|questions|brothers|sisters|games|pets)\b/gi, "Dénombrable au pluriel : [[how many]].", (m, n) => `how many ${n}`],
  ["much-countable", "grammar", /\b(so|too|very)?\s*much\s+(people|friends|students|children|books|cars|things|places|countries|questions|problems|ideas)\b/gi, "Avec un pluriel dénombrable : **many** ([[many people]]).", (m, adv, n) => `${adv ? `${adv} ` : ""}many ${n}`],
  ["many-uncountable", "grammar", /\b(so|too)?\s*many\s+(money|time|water|information|homework|advice|work|traffic|luggage|furniture|music)\b/gi, "Avec un indénombrable : **much** ([[much money]]) ou [[a lot of]].", (m, adv, n) => `${adv ? `${adv} ` : ""}much ${n}`],
  ["people-is", "grammar", /\b(people|police)\s+(is|was|has)\b/gi, "**people** est pluriel : [[people are]].", (m, n, v) => `${n} ${{ is: "are", was: "were", has: "have" }[v.toLowerCase()]}`],
  ["everybody-are", "grammar", /\b(everybody|everyone|nobody|somebody|someone|anybody|anyone)\s+(are|were|have)\b/gi, "**everybody / everyone** se conjugue au singulier : [[everyone is]].", (m, n, v) => `${n} ${{ are: "is", were: "was", have: "has" }[v.toLowerCase()]}`],
  ["news-are", "grammar", /\bthe\s+news\s+(are|were)\b/gi, "**news** est singulier : [[the news is]].", (m, v) => `the news ${v.toLowerCase() === "are" ? "is" : "was"}`],
  ["it-depend", "grammar", /\b(it's|it\s+is)\s+depend\b|\bit\s+depend\b(?!s)/gi, "« ça dépend » = [[it depends]].", () => "it depends"],
  ["very-much-order", "grammar", /\b(like|likes|liked|love|loves|loved|enjoy|enjoys|enjoyed)\s+very\s+much\s+(?=[a-z])/gi, "Ordre des mots : [[I like pizza very much]] (very much à la fin), pas « I like very much pizza ».", (m, v) => `${v} … very much`],
  ["thing-who", "grammar", /\b(book|car|house|film|movie|phone|city|country|thing|computer|game|bike|school|restaurant|company|place|song|video|app)\s+who\b/gi, "Pour une chose : **which** ou **that** ([[who]] = pour les personnes).", (m, n) => [`${n} which`, `${n} that`]],
  ["person-which", "grammar", /\b(man|woman|person|people|boy|girl|teacher|friend|student|doctor|guy|kid|kids|children|neighbour|neighbor|brother|sister|mother|father|mom|dad)\s+which\b/gi, "Pour une personne : **who** (ou that).", (m, n) => [`${n} who`, `${n} that`]],
  ["forward-ing", "grammar", /\b(look|looks|looked|looking)\s+forward\s+to\s+(see|meet|hear|go|have|work|visit|read|start|receive|talk|travel)\b/gi, "**look forward to** + verbe en **-ing** ([[I look forward to hearing from you]]).", (m, v, x) => `${v} forward to ${forms(x).ing}`],
  ["ing-after", "grammar", /\b(enjoy|enjoys|enjoyed|enjoying|avoid|avoids|avoided|finish|finished|finishes|mind|keep|kept|suggest|suggested|practise|practice|consider|considered|imagine|miss|missed|can't\s+stand)\s+to\s+([a-z]+)\b/gi, "Ce verbe est suivi de **-ing** ([[enjoy swimming]]), pas de « to ».", (m, v, x) => (BASE.has(x.toLowerCase()) ? `${v} ${forms(x.toLowerCase()).ing}` : null)],
  ["to-after", "grammar", /\b(want|wants|wanted|decide|decided|decides|hope|hoped|hopes|plan|planned|plans|promise|promised|refuse|refused|learn|learned|manage|managed|afford|agree|agreed|would\s+like|'d\s+like)\s+([a-z]+ing)\b/gi, "Ce verbe est suivi de **to** + base ([[I want to go]]).", (m, v, x) => (ING.has(x.toLowerCase()) ? `${v} to ${ING.get(x.toLowerCase())}` : null)],
  ["let-to", "grammar", /\b(let|lets|make|makes|made)\s+(me|you|him|her|us|them|it)\s+to\s+([a-z]+)\b/gi, "Après **let / make** + personne, pas de « to » : [[let me go]].", (m, v, p, x) => (BASE.has(x.toLowerCase()) ? `${v} ${p} ${x}` : null)],
  ["modal-to", "grammar", /\b(can|could|will|would|should|must|might|may|shall)\s+to\s+([a-z]+)\b/gi, "Après un modal (can, must, should…), le verbe vient **sans to** : [[I can swim]].", (m, md, x) => (BASE.has(x.toLowerCase()) ? `${md} ${x}` : null)],
  ["will-after-if", "grammar", /\b(if|when|as\s+soon\s+as|unless|until|before|after)\s+(i|you|he|she|it|we|they|the\s+\w+|my\s+\w+)\s+will\s+([a-z]+)\b/gi, "Après **if / when / as soon as**, on met le **présent**, pas will : [[when I'm older]], [[if it rains]].", (m, c, s, v) => {
    const p = s.toLowerCase();
    const third = !["i", "you", "we", "they"].includes(p);
    const verbForm = v.toLowerCase() === "be" ? (p === "i" ? "am" : third ? "is" : "are") : third ? forms(v.toLowerCase()).s : v;
    return `${c} ${s} ${verbForm}`;
  }],
  ["have-hungry", "grammar", /\b(I|you|we|they|he|she)\s+(have|has)\s+(hungry|thirsty|cold|hot|sleepy|afraid|scared)\b(?=\s*(?:[.,!?]|$|\s+(?:and|but|because|so|too|now|today)\b))/gi, "Sensations : on dit **be** ([[I'm hungry]], [[I'm cold]]), pas « have ».", (m, s, h2, a) => `${s} ${s.toLowerCase() === "i" ? "am" : ["he", "she"].includes(s.toLowerCase()) ? "is" : "are"} ${a}`],
  ["have-reason", "vocab", /\b(have|has)\s+reason(?=\s*[.,!?]|\s*$)/gi, "« avoir raison » = [[be right]] (I'm right, you're right).", (m, h2) => (h2.toLowerCase() === "has" ? "is right" : "are right")],
  ["although-but", "grammar", /\b(although|though|even\s+though)\b([^.!?]*?),\s*but\b/gi, "**although** et **but** ne vont pas ensemble : choisis l'un ou l'autre.", (m, a, mid) => `${a}${mid},`],
  ["me-and", "style", /(^|[.!?]\s+)(me)\s+and\s+(my|him|her|them)\b/gi, "En sujet, on dit [[My friend and I]] (et on se met en dernier, par politesse).", (m, pre, me, x) => `${pre}${x.charAt(0).toUpperCase() + x.slice(1)} … and I`],
  ["of-possessive", "style", /\bthe\s+([a-z]+)\s+of\s+(my|your|his|her|our|their)\s+(father|mother|dad|mom|mum|brother|sister|friend|parents|uncle|aunt|grandmother|grandfather|grandma|grandpa|cousin|neighbour|neighbor)\b/gi, "Plus naturel avec le génitif : [[my father's car]] plutôt que « the car of my father ».", (m, n, p, who) => `${p} ${who}'s ${n}`],
];

/** Day / month / language names that need a capital letter. */
const PROPER = new Set(["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday", "january", "february", "april", "june", "july", "august", "september", "october", "november", "december", "english", "french", "spanish", "german", "italian", "chinese", "japanese", "arabic", "canadian", "american", "british", "canada", "quebec", "ottawa", "montreal", "toronto", "vancouver", "christmas", "halloween", "europe", "africa", "america", "algeria", "algerian", "france", "paris"]);
const A_EXCEPT = /^(uni(?!nt|mp|nd|mag|ns)|use|usu|eu|one|once|ukulele|utensil|util)/; // vowel letter, consonant sound
const AN_EXCEPT = /^(hour|honest|honour|honor|heir)/; // silent h

function tokenRules(tk) {
  const out = [];
  const T = tk.tokens;
  const add = (from, to, cat, rule, msg, fix) => out.push({ start: T[from].start, end: T[to].end, cat, rule, msg, fix: [].concat(fix).filter(Boolean) });
  for (const s of tk.sentences) {
    const W = s.tokens.filter((i) => T[i].word);
    // Capital letter at the start of the sentence.
    const first = T[s.tokens[0]];
    if (first?.word && /^[a-z]/.test(first.text) && !/^(e\.g|i\.e)/.test(first.lower)) add(first.i, first.i, "mechanics", "capital-start", "Une phrase commence par une **majuscule**.", first.text.charAt(0).toUpperCase() + first.text.slice(1));
    for (let k = 0; k < W.length; k++) {
      const t = T[W[k]];
      const prev = k > 0 ? T[W[k - 1]] : null;
      const next = k + 1 < W.length ? T[W[k + 1]] : null;
      const lw = t.lower;
      // Lowercase i, proper names
      if (t.text === "i") add(t.i, t.i, "mechanics", "capital-i", "« je » = **I**, toujours en majuscule.", "I");
      else if (PROPER.has(lw) && /^[a-z]/.test(t.text) && k > 0) add(t.i, t.i, "mechanics", "capital-proper", "En anglais, les jours, les mois, les langues et les nationalités prennent une **majuscule**.", t.text.charAt(0).toUpperCase() + t.text.slice(1));
      // Repeated word
      if (prev && prev.lower === lw && !["had", "that", "very", "really", "so", "bye", "ha", "no"].includes(lw) && W[k] === W[k - 1] + 1) add(t.i, t.i, "mechanics", "repeat", "Mot répété deux fois.", "");
      // a / an
      if ((lw === "a" || lw === "an") && next && next.word && !/^[A-Z]{2,}/.test(next.text)) {
        const nw = next.lower;
        const vowelSound = (/^[aeiou]/.test(nw) && !A_EXCEPT.test(nw)) || AN_EXCEPT.test(nw);
        if (lw === "a" && vowelSound) add(t.i, t.i, "grammar", "a-an", `Devant un son voyelle, on écrit **an** : [[an ${nw}]].`, keepCase(t.text, "an"));
        if (lw === "an" && !vowelSound) add(t.i, t.i, "grammar", "a-an", `Devant un son consonne, on écrit **a** : [[a ${nw}]].`, keepCase(t.text, "a"));
      }
      // Over-regularized past (goed, buyed…)
      if (OVERREG.has(lw)) add(t.i, t.i, "grammar", "overreg", `Verbe irrégulier : le passé est **${OVERREG.get(lw)}**.`, keepCase(t.text, OVERREG.get(lw)));
      // he/she/it + base verb (missing -s)
      if (SUBJ_3S.has(lw) && next && (!prev || !AUX_BEFORE_BASE.has(prev.lower))) {
        let j = k + 1;
        if (FREQ_ADV.has(T[W[j]]?.lower)) j++;
        const v = T[W[j]];
        if (v && W[j] === W[k] + (j - k) && BASE.has(v.lower) && !SAME_PAST.has(v.lower) && !MODALS.has(v.lower) && v.lower !== "be" && !["need", "dare"].includes(v.lower)) {
          add(v.i, v.i, "grammar", "third-s", `Avec **${t.lower}**, le verbe prend un **-s** au présent : [[${t.lower} ${forms(v.lower).s}]].`, keepCase(v.text, forms(v.lower).s));
        }
      }
      // I/you/we/they + s-form
      if (SUBJ_PL.has(lw) && (!prev || !["than", "as", "do", "does", "did", "will", "can"].includes(prev.lower))) {
        let j = k + 1;
        if (FREQ_ADV.has(T[W[j]]?.lower)) j++;
        const v = T[W[j]];
        if (v && W[j] === W[k] + (j - k) && S_FORM.has(v.lower) && !(NOUNISH_S.has(v.lower) && lw === "you")) {
          const base = S_FORM.get(v.lower);
          const fix = base === "be" ? (lw === "i" ? "am" : "are") : base === "have" ? "have" : base;
          add(v.i, v.i, "grammar", "plural-s", `Avec **${t.text}**, pas de -s : [[${t.text} ${fix}]].`, keepCase(v.text, fix));
        }
      }
      // Modal + non-base form
      if (MODALS.has(lw) && next && W[k + 1] === W[k] + 1) {
        const n = next.lower;
        const base = S_FORM.get(n) || (PAST.has(n) && !BASE.has(n) ? PAST.get(n) : null) || (ING.has(n) && lw !== "will" && lw !== "would" ? null : null);
        if (base && base !== "be") add(next.i, next.i, "grammar", "modal-base", `Après **${t.text}**, le verbe reste à la **base** : [[${t.text} ${base}]].`, keepCase(next.text, base));
      }
      // do / does / did (negative or question) + non-base
      const isNegAux = ["don't", "doesn't", "didn't"].includes(lw) || (["do", "does", "did"].includes(lw) && next?.lower === "not");
      const isQuestionAux = ["do", "does", "did"].includes(lw) && (k === 0 || ["what", "where", "when", "why", "how", "who", "which"].includes(prev?.lower)) && next && (SUBJ_3S.has(next.lower) || SUBJ_PL.has(next.lower));
      if (isNegAux || isQuestionAux) {
        let j = k + 1;
        if (T[W[j]]?.lower === "not" || isQuestionAux) j++;
        if (FREQ_ADV.has(T[W[j]]?.lower)) j++;
        const v = T[W[j]];
        if (v) {
          const n = v.lower;
          const base = S_FORM.get(n) || (PAST.has(n) && !BASE.has(n) ? PAST.get(n) : null);
          if (base && base !== "be") add(v.i, v.i, "grammar", "do-base", `Après **${t.text}**, le verbe reste à la **base** (le temps est déjà dans ${t.lower.replace("n't", "")}) : [[${base}]].`, keepCase(v.text, base));
        }
      }
      // have/has/had + past form instead of participle (I have went)
      if (["have", "has", "had", "haven't", "hasn't", "hadn't", "'ve", "i've", "you've", "we've", "they've"].includes(lw)) {
        let j = k + 1;
        if (["already", "just", "never", "ever", "not", "always", "recently", "finally", "also"].includes(T[W[j]]?.lower)) j++;
        const v = T[W[j]];
        if (v && PAST_NOT_PP.has(v.lower)) add(v.i, v.i, "grammar", "past-participle", `Après **have**, il faut le **participe passé** : [[${PAST_NOT_PP.get(v.lower)}]].`, keepCase(v.text, PAST_NOT_PP.get(v.lower)));
      }
      // Double negative
      if (["don't", "doesn't", "didn't", "can't", "won't", "isn't", "aren't", "wasn't", "weren't", "haven't", "hasn't", "couldn't", "not", "never"].includes(lw)) {
        for (let j = k + 1; j < Math.min(W.length, k + 5); j++) {
          const x = T[W[j]].lower;
          if (["nothing", "nobody", "nowhere", "none"].includes(x) || (x === "never" && lw !== "never")) {
            const fix = { nothing: "anything", nobody: "anybody", nowhere: "anywhere", none: "any", never: "ever" }[x];
            add(W[j], W[j], "grammar", "double-negative", `Double négation : en anglais, une seule négation suffit → [[${fix}]].`, keepCase(T[W[j]].text, fix));
            break;
          }
        }
      }
    }
    // Final punctuation of the sentence.
    const last = T[s.tokens[s.tokens.length - 1]];
    if (last && !/^[.!?]+$/.test(last.text) && W.length >= 3 && last.word) add(last.i, last.i, "mechanics", "end-punct", "Termine ta phrase par un **point** (ou ? / !).", `${last.text}.`);
  }
  return out;
}

function phraseRules(text) {
  const out = [];
  for (const [rule, cat, re, msg, fix] of PHRASES) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(text))) {
      const f = fix(...m);
      if (f == null) continue;
      // Leading separators captured by some patterns (sentence start) are not part of the mistake.
      const lead = m[0].match(/^[.!?\s]*/)[0].length;
      const start = m.index + lead;
      const end = m.index + m[0].trimEnd().length;
      const fixes = [].concat(f).map((x) => keepCase(text.slice(start, end), String(x).replace(/^[.!?\s]+/, "").trimEnd()));
      out.push({ start, end, cat, rule, msg, fix: fixes });
      if (m[0].length === 0) re.lastIndex++;
    }
  }
  return out;
}

/** Unknown words (capitalized words inside a sentence are taken as names). */
function spellingRules(tk, suggestFn) {
  const out = [];
  const firstOfSentence = new Set(tk.sentences.map((s) => s.tokens[0]));
  for (const t of tk.tokens) {
    if (!t.word || t.text.length < 2) continue;
    if (/^[A-Z]/.test(t.text) && !firstOfSentence.has(t.i)) continue;
    if (/^[A-Z]{2,}$/.test(t.text)) continue;
    if (tierOf(t.lower) > 0) continue;
    if (/[À-ÿ]/.test(t.text)) {
      out.push({ start: t.start, end: t.end, cat: "spelling", rule: "french-word", msg: "Ce mot a un accent : il est en français ? En anglais, on n'utilise pas d'accents.", fix: [] });
      continue;
    }
    out.push({ start: t.start, end: t.end, cat: "spelling", rule: "spelling", msg: "Mot inconnu : vérifie l'orthographe.", fix: suggestFn ? suggestFn(t.text) : [] });
  }
  return out;
}

/** All issues of a text, sorted by position, overlapping duplicates removed (the most specific wins). */
export function checkRules(tk, { suggest } = {}) {
  const all = [...phraseRules(tk.text), ...tokenRules(tk), ...spellingRules(tk, suggest)];
  const prio = { grammar: 0, vocab: 1, spelling: 2, mechanics: 3, style: 4 };
  all.sort((a, b) => a.start - b.start || prio[a.cat] - prio[b.cat] || b.end - b.start - (a.end - a.start));
  const out = [];
  for (const x of all) {
    if (out.some((y) => x.start < y.end && y.start < x.end && (y.rule === x.rule || (x.cat !== "mechanics" && y.cat !== "mechanics")))) continue;
    out.push(x);
  }
  return out;
}

export const RULE_COUNT = PHRASES.length + 13;
export { BASE, S_FORM, PAST, PP, ING, verb };
