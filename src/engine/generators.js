// Procedural question generators. Each question has a stable ref "gen:<id>|<params>" and can be rebuilt
// from it (mistakes notebook, spaced repetition). Pure: no DOM.
import { makeRng } from "./rng.js";
import { VERBS, verb, forms, conjugate, contract, pastForms, ppForms, personOf, regularPast } from "./verbs.js";
import { ADJECTIVES, COMPARATIVE, SUPERLATIVE } from "./adjectives.js";

// ---------- Data ----------

const S = (text, p) => ({ text, p });
const SUBJECTS = [
  S("I", "1s"), S("you", "2"), S("he", "3s"), S("she", "3s"), S("we", "1p"), S("they", "3p"),
  S("my sister", "3s"), S("my parents", "3p"), S("Emma", "3s"), S("Noah", "3s"), S("our neighbours", "3p"),
  S("Maurice the moose", "3s"), S("my best friend", "3s"), S("the kids", "3p"), S("Grandpa", "3s"), S("my cousins", "3p"),
];
const THIRD = SUBJECTS.map((s, i) => (s.p === "3s" ? i : -1)).filter((i) => i >= 0);

// Verb + complement that make sense with any subject.
const FRAMES = [
  ["play", "video games"], ["play", "hockey"], ["watch", "a movie"], ["watch", "the news"], ["eat", "pancakes"],
  ["eat", "a sandwich"], ["drink", "orange juice"], ["read", "a comic book"], ["read", "the newspaper"], ["write", "an email"],
  ["clean", "the kitchen"], ["cook", "spaghetti"], ["wash", "the dishes"], ["walk", "the dog"], ["visit", "the museum"],
  ["buy", "fresh bread"], ["make", "a cake"], ["take", "the bus"], ["call", "Grandma"], ["help", "the neighbours"],
  ["learn", "new words"], ["sing", "in the shower"], ["swim", "in the lake"], ["ride", "a bike"], ["listen", "to music"],
  ["fix", "the old bike"], ["paint", "the fence"], ["brush", "the cat"], ["send", "a message"], ["speak", "English"],
  ["wear", "a toque"], ["catch", "the bus"], ["draw", "a map"], ["build", "a snowman"], ["grow", "tomatoes"],
  ["order", "pizza"], ["drive", "to work"], ["visit", "the farm"], ["study", "in the library"], ["bring", "a lunch"],
];

const MARK = {
  present: ["every morning", "every weekend", "on Saturdays", "after school", "twice a week", "every evening"],
  presentNeg: ["on Mondays", "in the morning", "during the week", "on weekdays"],
  now: ["right now", "at the moment"],
  past: ["yesterday", "last weekend", "two days ago", "last night", "last summer"],
};

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const subj = (i, start) => (start ? cap(SUBJECTS[i].text) : SUBJECTS[i].text);
const sentence = (s) => cap(s.replace(/\s+/g, " ").trim());
const quote = (s) => `« ${s} »`;

// ---------- Helpers to build question objects ----------

function fill(base, { q, hint, answer, explain }) {
  const accept = Array.isArray(answer) ? answer : [answer];
  return { ...base, kind: "fill", q: sentence(q), hint, accept, expected: accept[0], explain };
}
function mcq(base, rng, { q, right, wrong, explain }) {
  const choices = rng.shuffle([right, ...wrong]);
  return { ...base, kind: "mcq", q: sentence(q), choices, answer: choices.indexOf(right), expected: right, explain };
}
function typeEn(base, { fr, answer, explain, say, noDigits = false }) {
  const accept = Array.isArray(answer) ? answer : [answer];
  return { ...base, kind: "type_en", fr, accept, expected: accept[0], say: say || accept[0], explain, noDigits };
}
function errorQ(base, { tokens, wrong, fix, explain }) {
  const t = tokens.slice();
  t[0] = cap(t[0]);
  const accept = Array.isArray(fix) ? fix : [fix];
  return { ...base, kind: "error", tokens: t, wrong, accept, expected: `${t[wrong].replace(/[.,!?;:]+$/, "")} → ${accept[0]}`, explain };
}

const NUM = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen", "twenty"];
const TENS = { 20: "twenty", 30: "thirty", 40: "forty", 50: "fifty", 60: "sixty", 70: "seventy", 80: "eighty", 90: "ninety" };
export function numberWords(n) {
  if (n <= 20) return NUM[n];
  if (n === 100) return "one hundred";
  const t = Math.floor(n / 10) * 10;
  return n % 10 ? `${TENS[t]}-${NUM[n % 10]}` : TENS[t];
}

// Nouns for plurals: [singular, plural, rule explained in French].
const NOUNS = [
  ["cat", "cats", "+s"], ["dog", "dogs", "+s"], ["book", "books", "+s"], ["apple", "apples", "+s"], ["chair", "chairs", "+s"],
  ["bus", "buses", "-s → -es"], ["box", "boxes", "-x → -es"], ["watch", "watches", "-ch → -es"], ["dish", "dishes", "-sh → -es"], ["glass", "glasses", "-ss → -es"],
  ["fox", "foxes", "-x → -es"], ["tomato", "tomatoes", "-o → -es"], ["potato", "potatoes", "-o → -es"], ["baby", "babies", "consonne + y → -ies"], ["city", "cities", "consonne + y → -ies"],
  ["party", "parties", "consonne + y → -ies"], ["boy", "boys", "voyelle + y → +s"], ["key", "keys", "voyelle + y → +s"], ["knife", "knives", "-fe → -ves"], ["wolf", "wolves", "-f → -ves"],
  ["leaf", "leaves", "-f → -ves"], ["shelf", "shelves", "-f → -ves"], ["mouse", "mice", "irrégulier"], ["child", "children", "irrégulier"], ["man", "men", "irrégulier"],
  ["woman", "women", "irrégulier"], ["foot", "feet", "irrégulier"], ["tooth", "teeth", "irrégulier"], ["sheep", "sheep", "invariable"], ["fish", "fish", "invariable"],
  ["moose", "moose", "invariable"], ["person", "people", "irrégulier"], ["goose", "geese", "irrégulier"], ["toy", "toys", "voyelle + y → +s"], ["strawberry", "strawberries", "consonne + y → -ies"],
];

const STATES = ["tired", "hungry", "happy", "late", "ready", "cold", "bored", "at school", "at home", "in the garden"];
const FEATURES = ["blue eyes", "curly hair", "long hair", "a big smile", "freckles", "short hair", "brown eyes", "a beard"];

const DURATIONS = ["ten years", "three months", "two weeks", "a long time", "five minutes", "ages", "two hours"];
const POINTS = ["Monday", "last summer", "January", "the spring", "the beginning of the year", "Christmas", "I was a kid"];
const FOR_SINCE = [
  ["I have known Léa ___ {X}.", "known"], ["We have lived in this apartment ___ {X}.", "lived"], ["She has worked at the hospital ___ {X}.", "worked"],
  ["They have been friends ___ {X}.", "been"], ["Maurice has waited for the bus ___ {X}.", "waited"], ["My dad has played the guitar ___ {X}.", "played"],
];

// Passive voice: subject, person, verb, tense, end of the sentence.
const PASSIVE = [
  ["The windows", "3p", "clean", "present_simple", "every Friday."], ["English", "3s", "speak", "present_simple", "in many countries."],
  ["This cheese", "3s", "make", "present_simple", "on a small farm near Montreal."], ["The letters", "3p", "deliver", "present_simple", "every morning."],
  ["Dinner", "3s", "cook", "present_simple", "by Dad every Sunday."], ["The new bridge", "3s", "build", "past_simple", "last year."],
  ["My bike", "3s", "steal", "past_simple", "last night."], ["The cookies", "3p", "eat", "past_simple", "before the party started."],
  ["These photos", "3p", "take", "past_simple", "by my grandfather."], ["The winners", "3p", "choose", "past_simple", "yesterday."],
  ["The concert", "3s", "cancel", "present_perfect", "because of the storm."], ["All the tickets", "3p", "sell", "present_perfect", "already."],
  ["The car", "3s", "repair", "present_perfect", "so we can leave now."], ["The results", "3p", "publish", "will", "next week."],
  ["A new school", "3s", "build", "will", "near the park next year."], ["The road", "3s", "repair", "present_continuous", "right now, so take another route."],
  ["The house", "3s", "paint", "present_continuous", "this week."], ["The pizza", "3s", "deliver", "past_simple", "in twenty minutes."],
];

// Conditionals: [sentence with ___, hint, answers, French explanation].
const COND2 = [
  ["If I ___ more time, I would learn the guitar.", "have", ["had"], "Conditionnel 2 : if + prétérit (had), puis would + verbe."],
  ["If we lived by the sea, we ___ every day.", "swim", ["would swim"], "Après if + prétérit, la conséquence imaginaire prend would + verbe de base."],
  ["If she ___ the answer, she would tell you.", "know", ["knew"], "if + prétérit : know → knew (irrégulier)."],
  ["If my parents won the lottery, they ___ a bigger house.", "buy", ["would buy"], "Conséquence imaginaire : would + buy."],
  ["If I ___ you, I would apologize.", "be", ["were", "was"], "If I were you : avec if, on emploie were (was est accepté à l'oral)."],
  ["If Maurice ___ a car, he would drive to Montreal every weekend.", "have", ["had"], "Situation imaginaire : if + had."],
  ["If you practised every day, you ___ much faster.", "improve", ["would improve"], "would + verbe de base dans la proposition principale."],
  ["If they ___ closer, we would visit them more often.", "live", ["lived"], "if + prétérit : lived."],
  ["If I could fly, I ___ to Japan for lunch.", "go", ["would go"], "Rêve impossible : would + go."],
  ["If our dog ___ English, it would complain all day.", "speak", ["spoke"], "if + prétérit irrégulier : speak → spoke."],
  ["If he went to bed earlier, he ___ so tired.", "not be", ["wouldn't be"], "Conséquence négative : wouldn't + be."],
  ["If it ___ warmer, we would eat outside.", "be", ["were", "was"], "if + were : on imagine une autre situation."],
];
const COND3 = [
  ["If we ___ earlier, we wouldn't have missed the train.", "leave", ["had left"], "Conditionnel 3 : if + had + participe passé (had left)."],
  ["If you had asked me, I ___ you.", "help", ["would have helped"], "Conséquence dans le passé : would have + participe passé."],
  ["If she ___ harder, she would have passed the exam.", "study", ["had studied"], "if + past perfect : had studied."],
  ["If I had known about the party, I ___.", "come", ["would have come"], "would have + participe passé : come → come."],
  ["If it ___, we would have gone to the beach.", "not rain", ["hadn't rained"], "Condition négative dans le passé : hadn't + participe passé."],
  ["If they had taken the bus, they ___ on time.", "arrive", ["would have arrived"], "would have + arrived."],
  ["If Maurice ___ the map, he wouldn't have ended up in Toronto.", "read", ["had read"], "if + had + participe passé : read → read."],
  ["If you had told me the truth, I ___ angry.", "not be", ["wouldn't have been"], "Conséquence négative passée : wouldn't have been."],
  ["If we ___ a ticket, we would have won a million dollars.", "buy", ["had bought"], "if + had bought (buy → bought)."],
  ["If he had set an alarm, he ___ the meeting.", "not miss", ["wouldn't have missed"], "wouldn't have + participe passé."],
  ["If I ___ my phone, I would have taken a picture.", "bring", ["had brought"], "if + had brought (bring → brought → brought)."],
  ["If the team had played better, they ___ the game.", "win", ["would have won"], "would have + won (win → won → won)."],
];

const EXTRA = () => globalThis.window?.__EXTRA__ || {};

// ---------- Generators ----------
// pick(rng, L) → params (integers), build(params, rng) → question fields, or null.

const G = [];
const def = (id, unit, skill, pick, build) => G.push({ id, unit, skill, pick, build });
const rnd = (rng, n) => rng.int(n);

// 1.2 Numbers 0-20 / 4.4 21-100
def("num20", "1.2", "vocabulaire", (rng) => [rnd(rng, 21)], ([n], rng, b) =>
  typeEn(b, { fr: `${n} — écris le nombre en lettres`, answer: numberWords(n), noDigits: true, explain: `${n} s'écrit ${numberWords(n)}.` }));
def("num100", "4.4", "vocabulaire", (rng) => [21 + rnd(rng, 80)], ([n], rng, b) =>
  typeEn(b, { fr: `${n} — écris le nombre en lettres`, answer: numberWords(n), noDigits: true, explain: `${n} = ${numberWords(n)} (dizaine + trait d'union + unité).` }));

// 2.4 Telling the time
def("time", "2.4", "vocabulaire", (rng) => [1 + rnd(rng, 12), rnd(rng, 4)], ([hr, k], rng, b) => {
  const next = (hr % 12) + 1;
  const mins = [0, 15, 30, 45][k];
  const core = [`${NUM[hr]} o'clock`, `quarter past ${NUM[hr]}`, `half past ${NUM[hr]}`, `quarter to ${NUM[next]}`][k];
  const digital = [`${NUM[hr]} o'clock`, `${NUM[hr]} fifteen`, `${NUM[hr]} thirty`, `${NUM[hr]} forty-five`][k];
  const accept = [`It's ${core}`, core, `It's ${digital}`, digital];
  if (k === 1 || k === 3) accept.push(`It's a ${core}`, `a ${core}`);
  return typeEn(b, { fr: `Quelle heure est-il ? ${hr} h ${String(mins).padStart(2, "0")}`, answer: accept, noDigits: true, explain: k === 3 ? `Pour « moins le quart », on dit quarter to + l'heure suivante : ${core}.` : `On dit : ${core}.` });
});

// 2.1 be
def("be", "2.1", "grammaire", (rng) => [rnd(rng, SUBJECTS.length), rnd(rng, STATES.length), rnd(rng, 2)], ([si, st, neg], rng, b) => {
  const s = SUBJECTS[si];
  const full = conjugate("be", "present_simple", s, { neg: !!neg });
  const ans = s.p === "1s" && neg ? "am not" : contract(full);
  return fill(b, { q: `${subj(si, true)} ___ ${STATES[st]}.`, hint: neg ? "not / be" : "be", answer: [ans], explain: `Avec ${quote(s.text)}, to be se conjugue ${full.split(" ")[0]}${neg ? " + not" : ""}.` });
});

// 2.2 Plurals
def("plural", "2.2", "grammaire", (rng) => [rnd(rng, NOUNS.length), rnd(rng, 4)], ([ni, k], rng, b) => {
  const [sg, pl, rule] = NOUNS[ni];
  const n = ["three", "five", "two", "four"][k];
  return fill(b, { q: `I can see ${n} ___ in this picture.`, hint: sg, answer: [pl], explain: `${sg} → ${pl} (${rule}).` });
});

// 2.3 have / has
def("have", "2.3", "grammaire", (rng) => [rnd(rng, SUBJECTS.length), rnd(rng, FEATURES.length)], ([si, fi], rng, b) => {
  const s = SUBJECTS[si];
  const ans = s.p === "3s" ? "has" : "have";
  return fill(b, { q: `${subj(si, true)} ___ ${FEATURES[fi]}.`, hint: "have", answer: [ans], explain: s.p === "3s" ? `Avec ${quote(s.text)} (= he / she), have devient has.` : `Avec ${quote(s.text)}, on garde have.` });
});

// 3.1 Present simple, he/she/it -s
def("ps3", "3.1", "conjugaison", (rng) => [rng.pick(THIRD), rnd(rng, FRAMES.length), rnd(rng, MARK.present.length)], ([si, fi, mi], rng, b) => {
  const [v, o] = FRAMES[fi];
  const ans = forms(v).s;
  return fill(b, { q: `${subj(si, true)} ___ ${o} ${MARK.present[mi]}.`, hint: v, answer: [ans], explain: `Habitude (${MARK.present[mi]}) avec ${quote(SUBJECTS[si].text)} = he / she : le verbe prend -s → ${ans}.` });
});
def("err_s", "3.1", "grammaire", (rng) => [rng.pick(THIRD), rnd(rng, FRAMES.length), rnd(rng, MARK.present.length)], ([si, fi, mi], rng, b) => {
  const [v, o] = FRAMES[fi];
  const st = SUBJECTS[si].text.split(" ");
  return errorQ(b, { tokens: [...st, v, ...`${o} ${MARK.present[mi]}.`.split(" ")], wrong: st.length, fix: [forms(v).s], explain: `${cap(SUBJECTS[si].text)} = he / she : au présent simple, il faut le -s → ${forms(v).s}.` });
});

// 3.2 do / does
def("psneg", "3.2", "conjugaison", (rng) => [rnd(rng, SUBJECTS.length), rnd(rng, FRAMES.length), rnd(rng, MARK.presentNeg.length)], ([si, fi, mi], rng, b) => {
  const [v, o] = FRAMES[fi];
  const ans = contract(conjugate(v, "present_simple", SUBJECTS[si], { neg: true }));
  return fill(b, { q: `${subj(si, true)} ___ ${o} ${MARK.presentNeg[mi]}.`, hint: `not / ${v}`, answer: [ans], explain: `Négation au présent simple : ${ans.split(" ")[0]} + verbe de base (${v}), sans -s.` });
});
def("doq", "3.2", "grammaire", (rng) => [rnd(rng, SUBJECTS.length), rnd(rng, FRAMES.length), rnd(rng, MARK.present.length)], ([si, fi, mi], rng, b) => {
  const [v, o] = FRAMES[fi];
  const s = SUBJECTS[si];
  const right = s.p === "3s" ? "Does" : "Do";
  return mcq(b, rng, { q: `___ ${s.text} ${v} ${o} ${MARK.present[mi]}?`, right, wrong: [right === "Do" ? "Does" : "Do", s.p === "3s" ? "Is" : "Are", "Did"], explain: `Question au présent simple avec ${quote(s.text)} : ${right} + sujet + verbe de base.` });
});
def("err_doesnt", "3.2", "grammaire", (rng) => [rng.pick(THIRD), rnd(rng, FRAMES.length), rnd(rng, MARK.presentNeg.length)], ([si, fi, mi], rng, b) => {
  const [v, o] = FRAMES[fi];
  const st = SUBJECTS[si].text.split(" ");
  return errorQ(b, { tokens: [...st, "doesn't", forms(v).s, ...`${o} ${MARK.presentNeg[mi]}.`.split(" ")], wrong: st.length + 1, fix: [v], explain: `Après doesn't, le verbe reste à la base : doesn't ${v} (le -s est déjà dans does).` });
});

// 4.1 Present continuous
def("pc", "4.1", "conjugaison", (rng) => [rnd(rng, SUBJECTS.length), rnd(rng, FRAMES.length), rnd(rng, 2), rnd(rng, 2)], ([si, fi, mi, neg], rng, b) => {
  const [v, o] = FRAMES[fi];
  const s = SUBJECTS[si];
  const full = conjugate(v, "present_continuous", s, { neg: !!neg });
  const ans = s.p === "1s" && neg ? "am not " + forms(v).ing : contract(full);
  const q = neg ? `${subj(si, true)} ___ ${o} ${MARK.now[mi]}.` : `Look! ${subj(si, false) === "I" ? "I" : subj(si, false)} ___ ${o} ${MARK.now[mi]}.`;
  return fill(b, { q, hint: neg ? `not / ${v}` : v, answer: [ans], explain: `Action en cours (${MARK.now[mi]}) : be + verbe en -ing → ${ans}.` });
});

// 5.1 / 5.2 Past simple affirmative
const pastFill = (irregular) => (rng, L) => {
  const pool = FRAMES.map((f, i) => [f, i]).filter(([[v]]) => verb(v)?.irregular === irregular && (verb(v)?.level || 5) <= Math.max(5, L)).map(([, i]) => i);
  return [rnd(rng, SUBJECTS.length), pool.length ? rng.pick(pool) : 0, rnd(rng, MARK.past.length)];
};
const pastBuild = ([si, fi, mi], rng, b) => {
  const [v, o] = FRAMES[fi];
  const x = verb(v);
  return fill(b, { q: `${subj(si, true)} ___ ${o} ${MARK.past[mi]}.`, hint: v, answer: pastForms(v), explain: `${cap(MARK.past[mi])} → prétérit. ${v} → ${x.past}${x.irregular ? " (verbe irrégulier)" : ""}.` });
};
def("past_reg", "5.1", "conjugaison", pastFill(false), pastBuild);
def("past_irr", "5.2", "conjugaison", pastFill(true), pastBuild);

// 5.2 Irregular forms (and over-regularization errors)
const irregularPick = (rng, L) => {
  const pool = VERBS.map((v, i) => [v, i]).filter(([v]) => v.irregular && v.base !== "be" && v.level <= Math.max(5, L)).map(([, i]) => i);
  return [rng.pick(pool)];
};
def("irr_past", "5.2", "conjugaison", irregularPick, ([vi], rng, b) => {
  const v = VERBS[vi];
  return typeEn(b, { fr: `Prétérit de « ${v.base} » (${v.fr})`, answer: pastForms(v), explain: `${v.base} → ${v.past} → ${v.pp}.` });
});
def("irr_pp", "6.3", "conjugaison", irregularPick, ([vi], rng, b) => {
  const v = VERBS[vi];
  return typeEn(b, { fr: `Participe passé de « ${v.base} » (${v.fr})`, answer: ppForms(v), explain: `${v.base} → ${v.past} → ${v.pp}.` });
});
def("err_overreg", "5.2", "conjugaison", (rng, L) => {
  const pool = FRAMES.map(([v], i) => i).filter((i) => {
    const v = verb(FRAMES[i][0]);
    return v?.irregular && v.level <= Math.max(5, L) && regularPast(v.base) !== v.past;
  });
  return [rnd(rng, SUBJECTS.length), rng.pick(pool), rnd(rng, MARK.past.length)];
}, ([si, fi, mi], rng, b) => {
  const [v, o] = FRAMES[fi];
  const st = SUBJECTS[si].text.split(" ");
  return errorQ(b, { tokens: [...st, regularPast(v), ...`${o} ${MARK.past[mi]}.`.split(" ")], wrong: st.length, fix: pastForms(v), explain: `${v} est irrégulier : son prétérit est ${verb(v).past}, pas ${regularPast(v)}.` });
});

// 5.3 Past negative / question / did + base
def("pastneg", "5.3", "conjugaison", (rng) => [rnd(rng, SUBJECTS.length), rnd(rng, FRAMES.length), rnd(rng, MARK.past.length)], ([si, fi, mi], rng, b) => {
  const [v, o] = FRAMES[fi];
  return fill(b, { q: `${subj(si, true)} ___ ${o} ${MARK.past[mi]}.`, hint: `not / ${v}`, answer: [`didn't ${v}`], explain: `Négation au prétérit : didn't + verbe de base (didn't ${v}, jamais « didn't ${verb(v).past} »).` });
});
def("pastq", "5.3", "grammaire", (rng) => [rnd(rng, SUBJECTS.length), rnd(rng, FRAMES.length), rnd(rng, MARK.past.length)], ([si, fi, mi], rng, b) => {
  const [v, o] = FRAMES[fi];
  const s = SUBJECTS[si];
  return mcq(b, rng, { q: `___ ${s.text} ${v} ${o} ${MARK.past[mi]}?`, right: "Did", wrong: [s.p === "3s" ? "Does" : "Do", s.p === "1s" || s.p === "3s" ? "Was" : "Were", "Have"], explain: `${cap(MARK.past[mi])} → question au prétérit : Did + sujet + verbe de base.` });
});
def("err_did", "5.3", "grammaire", (rng) => {
  const pool = FRAMES.map((f, i) => i).filter((i) => verb(FRAMES[i][0]).past !== FRAMES[i][0]);
  return [rnd(rng, SUBJECTS.length), rng.pick(pool), rnd(rng, MARK.past.length)];
}, ([si, fi, mi], rng, b) => {
  const [v, o] = FRAMES[fi];
  const st = SUBJECTS[si].text.split(" ");
  return errorQ(b, { tokens: ["Did", ...st, verb(v).past, ...`${o} ${MARK.past[mi]}?`.split(" ")], wrong: st.length + 1, fix: [v], explain: `Après did, le verbe reste à la base : Did … ${v} ? (did porte déjà le passé).` });
});

// 5.4 Past continuous
def("pastcont", "5.4", "conjugaison", (rng) => [rnd(rng, SUBJECTS.length), rnd(rng, FRAMES.length), rnd(rng, 2)], ([si, fi, k], rng, b) => {
  const [v, o] = FRAMES[fi];
  const ans = conjugate(v, "past_continuous", SUBJECTS[si]);
  const q = k ? `${subj(si, true)} ___ ${o} when the phone rang.` : `At eight o'clock last night, ${subj(si, false)} ___ ${o}.`;
  return fill(b, { q, hint: v, answer: [ans], explain: `Action en cours à un moment du passé : was / were + -ing → ${ans}.` });
});

// 6.1 Future
def("future", "6.1", "conjugaison", (rng) => [rnd(rng, SUBJECTS.length), rnd(rng, FRAMES.length), rnd(rng, 2)], ([si, fi, k], rng, b) => {
  const [v, o] = FRAMES[fi];
  const s = SUBJECTS[si];
  if (k) {
    const ans = conjugate(v, "going_to", s);
    return fill(b, { q: `${subj(si, true)} ___ ${o} next weekend.`, hint: `${v} — be going to`, answer: [ans], explain: `be going to + verbe : ${ans} (be s'accorde avec le sujet).` });
  }
  return fill(b, { q: `I'm sure ${subj(si, false)} ___ ${o} tomorrow.`, hint: `${v} — will`, answer: [`will ${v}`], explain: `will + verbe de base, à toutes les personnes : will ${v}.` });
});

// 6.2 Comparatives / superlatives
def("comp", "6.2", "grammaire", (rng) => [rnd(rng, ADJECTIVES.length)], ([ai], rng, b) => {
  const a = ADJECTIVES[ai];
  return fill(b, { q: a.comp, hint: a.base, answer: COMPARATIVE(a), explain: a.rule ? `${a.base} → ${COMPARATIVE(a)[0]} (${a.rule}).` : `${a.base} → ${COMPARATIVE(a)[0]}.` });
});
def("sup", "6.2", "grammaire", (rng) => [rnd(rng, ADJECTIVES.length)], ([ai], rng, b) => {
  const a = ADJECTIVES[ai];
  return a.sup ? fill(b, { q: a.sup, hint: a.base, answer: SUPERLATIVE(a), explain: `Superlatif : the + ${SUPERLATIVE(a)[0]}.` }) : null;
});

// 6.3 Present perfect
def("pp", "6.3", "conjugaison", (rng) => [rnd(rng, SUBJECTS.length), rnd(rng, FRAMES.length), rnd(rng, 3)], ([si, fi, k], rng, b) => {
  const [v, o] = FRAMES[fi];
  const s = SUBJECTS[si];
  const aux = s.p === "3s" ? "has" : "have";
  const pp = verb(v).pp;
  if (k === 0) return fill(b, { q: `${subj(si, true)} ___ ${o} before.`, hint: `never / ${v}`, answer: [`${aux} never ${pp}`], explain: `Expérience : ${aux} + never + participe passé (${pp}).` });
  if (k === 1) return fill(b, { q: `${subj(si, true)} ___ ${o}, so we can relax now.`, hint: `already / ${v}`, answer: [`${aux} already ${pp}`], explain: `Résultat présent : ${aux} + already + participe passé (${pp}).` });
  return fill(b, { q: `${subj(si, true)} ___ ${o} yet.`, hint: `not / ${v}`, answer: [`${aux}n't ${pp}`], explain: `Négation au present perfect : ${aux}n't + participe passé ; yet se met à la fin.` });
});

// 6.4 for / since, present perfect continuous
def("forsince", "6.4", "grammaire", (rng) => [rnd(rng, FOR_SINCE.length), rnd(rng, 2), rnd(rng, 7)], ([ti, isPoint, xi], rng, b) => {
  const X = isPoint ? POINTS[xi % POINTS.length] : DURATIONS[xi % DURATIONS.length];
  const right = isPoint ? "since" : "for";
  return mcq(b, rng, { q: FOR_SINCE[ti][0].replace("{X}", X), right, wrong: [isPoint ? "for" : "since", "during", "ago"], explain: isPoint ? `${quote(X)} est un point de départ → since.` : `${quote(X)} est une durée → for.` });
});
def("ppc", "6.4", "conjugaison", (rng) => [rnd(rng, SUBJECTS.length), rnd(rng, FRAMES.length)], ([si, fi], rng, b) => {
  const [v, o] = FRAMES[fi];
  const ans = conjugate(v, "present_perfect_continuous", SUBJECTS[si]);
  return fill(b, { q: `${subj(si, true)} ___ ${o} for two hours.`, hint: `${v} — present perfect continu`, answer: [ans], explain: `Action commencée dans le passé et toujours en cours : have / has been + -ing → ${ans}.` });
});

// 7.5 Future continuous / perfect
def("futcont", "7.5", "conjugaison", (rng) => [rnd(rng, SUBJECTS.length), rnd(rng, FRAMES.length)], ([si, fi], rng, b) => {
  const [v, o] = FRAMES[fi];
  return fill(b, { q: `This time tomorrow, ${subj(si, false)} ___ ${o}.`, hint: `${v} — futur continu`, answer: [`will be ${forms(v).ing}`], explain: `Action en cours à un moment du futur : will be + -ing.` });
});
def("futperf", "7.5", "conjugaison", (rng) => [rnd(rng, SUBJECTS.length), rnd(rng, FRAMES.length)], ([si, fi], rng, b) => {
  const [v, o] = FRAMES[fi];
  return fill(b, { q: `By next Friday, ${subj(si, false)} ___ ${o}.`, hint: `${v} — future perfect`, answer: [`will have ${verb(v).pp}`], explain: `Action terminée avant un moment du futur : will have + participe passé (${verb(v).pp}).` });
});

// 8.1 Second conditional / 10.1 third conditional
def("cond2", "8.1", "conjugaison", (rng) => [rnd(rng, COND2.length)], ([i], rng, b) => {
  const [q, hint, answer, explain] = COND2[i];
  return fill(b, { q, hint, answer, explain });
});
def("cond3", "10.1", "conjugaison", (rng) => [rnd(rng, COND3.length)], ([i], rng, b) => {
  const [q, hint, answer, explain] = COND3[i];
  return fill(b, { q, hint, answer, explain });
});

// 8.2 Passive voice
def("passive", "8.2", "conjugaison", (rng) => [rnd(rng, PASSIVE.length)], ([i], rng, b) => {
  const [s, p, v, tense, tail] = PASSIVE[i];
  const ans = conjugate(v, tense, { text: s, p }, { passive: true });
  const tn = { present_simple: "présent", past_simple: "prétérit", present_perfect: "present perfect", will: "futur avec will", present_continuous: "présent continu" }[tense];
  return fill(b, { q: `${s} ___ ${tail}`, hint: `${v} — passif, ${tn}`, answer: [ans], explain: `Passif = be conjugué (${tn}) + participe passé : ${ans}.` });
});

// 9.1 Past perfect
def("pastperf", "9.1", "conjugaison", (rng) => [rnd(rng, SUBJECTS.length), rnd(rng, FRAMES.length)], ([si, fi], rng, b) => {
  const [v, o] = FRAMES[fi];
  return fill(b, { q: `When we arrived, ${subj(si, false)} ___ ${o}.`, hint: `already / ${v}`, answer: [`had already ${verb(v).pp}`], explain: `Action antérieure à une autre action passée : had + already + participe passé.` });
});

// 10.4 Word formation (content/wordform.json)
def("wordform", "10.4", "vocabulaire", (rng, L) => {
  const items = EXTRA().wordform?.items || [];
  const pool = items.map((it, i) => (it.level <= Math.max(7, L) ? i : -1)).filter((i) => i >= 0);
  return pool.length ? [rng.pick(pool)] : null;
}, ([i], rng, b) => {
  const it = EXTRA().wordform?.items?.[i];
  return it ? fill(b, { q: it.q, hint: it.stem, answer: it.answer, explain: it.explain }) : null;
});

export const GENERATORS = G;
const BY_ID = new Map(G.map((g) => [g.id, g]));

const unitKey = (uid) => {
  const [L, U] = String(uid).split(".").map(Number);
  return L * 10 + U;
};

/** Generators introduced in exactly this station. */
export const generatorsOf = (uid) => G.filter((g) => g.unit === uid);
/** Generators available once this station is reached. */
export const generatorsUpTo = (uid) => G.filter((g) => unitKey(g.unit) <= unitKey(uid));

function assemble(g, params) {
  const ref = `gen:${g.id}|${params.join("|")}`;
  const rng = makeRng(ref);
  const L = Number(g.unit.split(".")[0]);
  const base = { ref, unitId: g.unit, level: L, skill: g.skill, generated: true };
  try {
    const q = g.build(params, rng, base);
    if (!q) return null;
    q.explain = q.explain || "";
    return q;
  } catch {
    return null;
  }
}

/** A new question from generator `id` (L = level of the context, for verb lists). */
export function generate(id, rng, L = 12) {
  const g = BY_ID.get(id);
  if (!g) return null;
  for (let k = 0; k < 6; k++) {
    const params = g.pick(rng, L);
    if (!params) return null;
    const q = assemble(g, params);
    if (q) return q;
  }
  return null;
}

/** Rebuilds a generated question from its ref. */
export function regen(ref) {
  const m = String(ref).match(/^gen:([a-z0-9_]+)\|(.*)$/);
  if (!m) return null;
  const g = BY_ID.get(m[1]);
  if (!g) return null;
  const params = m[2].split("|").map(Number);
  if (params.some((x) => !Number.isFinite(x))) return null;
  return assemble(g, params);
}

export { personOf };
