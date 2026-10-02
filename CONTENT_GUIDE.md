# Mission Bilingue — content authoring guide

You are writing the learning content for **Mission Bilingue**, a web app that takes a
French-speaking kid/teen (about 10–15 years old, living in Ottawa, Canada) from zero English
to fluent bilingual, through **12 levels × 4 units ("étapes")**, each unit followed by a
**very hard test**, and each level ending with a **boss exam**.

The app engine is written separately. It reads one JSON file per level:
`content/level-01.json` … `content/level-12.json`. You only write content JSON.

**Golden rule of the app: tests are hard but always fair.** Every test question is generated
*only* from the unit's own items (vocab, sentences, grammar, reading). So every item you write
must be (1) correct, (2) unambiguous, (3) only use words/structures taught in this unit or in
earlier units (proper names and obvious cognates excepted).

---

## 1. Languages and tone

- **Explanations, translations, tips, goals, feedback: French**, simple and lively, written for
  a 10–15-year-old. Tutoiement. Short sentences. A bit of humour is welcome. Never babyish.
- French should read naturally to a Franco-Ontarian/Québécois kid. Prefer Canadian usage when
  natural: *courriel*, *fin de semaine*, *magasiner*, *char* NO (too slangy) → *voiture/auto*.
  **Meals**: in Canada *déjeuner* = breakfast, *dîner* = lunch, *souper* = dinner. When a meal
  word could confuse, write both: « déjeuner (petit-déjeuner) ».
- **English content: Canadian English.** Spelling: *colour, favourite, centre, neighbour,
  travelled, cheque, theatre* but *-ize* (*realize, organize*). Vocabulary: *mom, vacation,
  soccer, washroom, garbage, eraser, pants, apartment*. The engine accepts US/UK spelling
  variants automatically (color/colour etc.), so you never need to list those.
- English must be **natural, idiomatic, error-free**. Double-check every sentence.
- Names in examples: diverse, Canadian-feeling: Lucas, Emma, Noah, Zoé, Amir, Léa, Maya, Ethan,
  Chloé, Malik, Sofia, Liam, Priya, Jaden, Olivia, Karim, Ana, Félix, Mei, Samuel.
  Places: Ottawa, Gatineau, Toronto, Montreal, Vancouver, the Rideau Canal, etc.
- Kid-appropriate: no alcohol, drugs, weapons, romance, politics, scary gore. Mild
  mystery/"crime" stories are fine at levels 9+ (stolen bike, missing cake…).
- **No invented facts presented as real.** If you state a real-world fact (fun fact, reading
  text), it must be certainly true. Otherwise keep the text clearly fictional/generic.

## 2. File format (strict JSON, UTF-8, no comments, no trailing commas)

```json
{
  "id": 3,
  "cefr": "A2",
  "title": "Au quotidien",
  "titleEn": "Everyday Life",
  "intro": "One or two French sentences shown on the level card: what you will be able to do.",
  "boss": {
    "name": "Docteur Routine",
    "taunt": "French line the boss says before the fight (1–2 sentences, playful, a bit cocky).",
    "defeat": "French line when the boss is beaten (1 sentence, funny)."
  },
  "units": [ UNIT, UNIT, UNIT, UNIT ]
}
```

`units` has **exactly 4** units. Each UNIT:

```json
{
  "id": "3.2",
  "title": "Questions et négations",
  "titleEn": "Do You Like It?",
  "goal": "Poser des questions et dire non au présent avec do / does.",
  "lesson": [ BLOCK, ... ],
  "vocab": [ VOCAB, ... ],
  "sentences": [ SENTENCE, ... ],
  "grammar": [ EXERCISE, ... ],
  "reading": READING
}
```

- `titleEn` is the unit's "station name" on the map: short, catchy English (2–4 words).
- `goal`: one French sentence starting with a verb (« Dire… », « Raconter… »).

### 2.1 Lesson blocks (`lesson`: 5–10 blocks)

The lesson is what the kid reads before playing. It must teach **everything** the unit's
exercises test. Inline markup allowed in any French text field of the lesson:
- `**gras**` for emphasis,
- `[[English words]]` for an English snippet: rendered as a tappable chip that is spoken aloud.
  Use it for every English word/phrase quoted inside French text.

Block types:

```json
{ "type": "p", "text": "Pour te présenter, tu dis [[My name is]] + ton prénom." }
{ "type": "rule", "title": "La règle d'or", "text": "Avec he / she / it, le verbe prend un **-s** : [[she plays]]." }
{ "type": "table", "head": ["Sujet", "to be", "Exemple"], "rows": [["I", "am", "[[I am ten.]]"], ["you", "are", "[[You are funny.]]"]] }
{ "type": "examples", "items": [ { "en": "I'm hungry.", "fr": "J'ai faim." }, { "en": "Are you cold?", "fr": "As-tu froid ?" } ] }
{ "type": "tip", "text": "Piège de francophone : on ne dit **jamais** [[I have ten years]]. On dit [[I am ten]] !" }
{ "type": "dialogue", "title": "À l'école", "lines": [ { "who": "Emma", "en": "Hi! What's your name?", "fr": "Salut ! Comment tu t'appelles ?" }, { "who": "Noah", "en": "I'm Noah. Nice to meet you!", "fr": "Moi c'est Noah. Enchanté !" } ] }
{ "type": "fun", "text": "Le sais-tu ? … (a short, TRUE fun fact or culture note)" }
```

Every unit lesson must contain at least: one `rule`, one `examples`, one `tip` (a classic
francophone trap), one `dialogue` (4–8 lines, real-life, reusing the unit's vocab — the kid
will listen and repeat it aloud). `table` whenever there is a paradigm (conjugation, pronouns…).
In `table` cells, plain English words are fine; use `[[...]]` for cells worth hearing.

### 2.2 Vocabulary (`vocab`)

```json
{ "en": "hungry", "fr": "affamé (avoir faim)", "alt": [], "ex": "I'm so hungry!" }
```
- `en`: the English word/expression (lowercase unless proper noun/"I"; no article unless the
  expression needs it; no final punctuation). Can be multi-word ("get up", "living room").
- `fr`: the French meaning shown to the kid. **Must be unique inside the level**: two items
  must never share the same `fr` (the kid sees `fr` and must type `en`). If a French word has
  several English translations, disambiguate the `fr` (« dîner (repas du midi) ») or put the
  other accepted English answers in `alt`.
- `alt`: other English answers accepted when the kid types the translation (synonyms that are
  genuinely correct for that `fr`). Do not list spelling variants or contractions.
- `ex`: a short English example sentence using the word (no digits).
- Count: levels 1–4 → **14–16** per unit; levels 5–12 → **16–20** per unit.
- `en` must be unique across the whole level.
- For irregular verbs (level 5): `en` = the past form, `fr` = « allé (passé de go) ».
- For idioms (levels 10–12): `en` = the idiom, `fr` = its meaning / French equivalent.

### 2.3 Sentences (`sentences`: 10–12 per unit)

Used for: building the sentence from shuffled word tiles (French shown → English to build),
dictation (the app reads `en` aloud with speech synthesis, the kid types it), translation.

```json
{ "en": "She doesn't like pizza.", "fr": "Elle n'aime pas la pizza.", "trap": ["don't", "likes"], "alt": [] }
```
- `en`: one natural English sentence, ending with `.`, `?` or `!`. Words separated by single
  spaces. **No digits** (write numbers in words: "ten", "three o'clock"). No abbreviations
  (TTS must read it right). Levels 1–4: 3–10 words. Levels 5–8: 5–14 words. Levels 9–12:
  6–18 words.
- `fr`: its French translation, natural.
- `trap`: 1–3 **wrong words** added to the tiles as decoys. Make them the classic mistakes the
  unit fights ("don't" vs "doesn't", "have" vs "am", "more big"…). A trap word must NOT be a
  word of `en` (case-insensitive) and must NOT allow another correct sentence.
- `alt`: other **orderings of exactly the same words** that are also correct (e.g. an adverb
  that can move: "Yesterday I played hockey." / "I played hockey yesterday." → same tiles,
  different order; capitalization/punctuation may differ). Usually `[]`. Prefer sentences
  whose word order is unique.
- The sentence must use only vocabulary/grammar from this unit or earlier units.

### 2.4 Grammar exercises (`grammar`: 15–18 per unit)

At least **5 `mcq`, 5 `fill`, 4 `error`**. Each has an `explain` in French (1–2 short
sentences: why the answer is right), shown after answering.

```json
{ "type": "mcq", "q": "___ you like hockey?", "choices": ["Do", "Does", "Are"], "answer": 0, "explain": "Avec you, on pose la question avec do." }
```
- 3 or 4 choices, exactly one correct, `answer` is its 0-based index. Distractors = typical
  francophone mistakes. `q` may be a sentence with `___`, or a question in French
  (« Comment dit-on "j'ai faim" ? »). Vary the position of the right answer.

```json
{ "type": "fill", "q": "She ___ to school every day.", "hint": "go", "answer": ["goes"], "explain": "Avec she : go → goes." }
```
- `q` contains `___` **exactly once**. The blank may need 1–3 words ("has been").
- `hint` (optional but strongly recommended): the base form or a French clue, shown in
  parentheses. With the hint, there must be **only one correct answer** (list every
  accepted answer in `answer`; contractions are handled automatically, so "isn't" also
  accepts "is not" — no need to list both).
- `answer`: array of accepted strings.

```json
{ "type": "error", "q": "He don't like carrots.", "wrong": 1, "fix": ["doesn't"], "explain": "Avec he : doesn't, pas don't." }
```
- `q`: a sentence containing **exactly one** wrong word. `wrong` = 0-based index of that word
  when `q` is split on spaces (punctuation stays attached to its word: in "He don't like
  carrots." the tokens are He | don't | like | carrots.).
- `fix`: array of accepted replacements for that single token (may be several words,
  e.g. ["does not", "doesn't"] — contractions are automatic anyway). Without punctuation.
- Everything else in the sentence must be perfectly correct.

### 2.5 Reading (`reading`)

Required for **levels 5–12**, optional for 3–4, absent for 1–2.

```json
{
  "title": "A Strange Morning",
  "text": "English text…",
  "questions": [
    { "q": "Why was Maya late?", "choices": ["…", "…", "…", "…"], "answer": 2 }
  ]
}
```
- Length: L3–4 60–100 words, L5–6 100–150, L7–8 150–220, L9–10 200–280, L11–12 250–350.
- Uses the unit's vocab and grammar heavily. Paragraphs separated by `\n\n`.
- 4–6 questions, 4 choices each, one correct. L3–6 questions in French, L7–12 in English.
  Include at least one inference question from level 7 (not just copy-paste lookup).
- The app may read the text aloud (listening mode), so: no digits, no abbreviations.

## 3. Difficulty and fairness checklist (do this for EVERY item)

1. Is it 100% correct English? Is the French translation faithful?
2. With the information shown (French prompt / hint), is there exactly one correct answer —
   or are all correct answers listed?
3. Is everything needed to answer taught in this unit's lesson or an earlier unit?
4. Is it hard enough? Prefer production and traps over trivia. Target the real mistakes
   French speakers make (false friends, word order, -s, do/does, avoir/être, depuis, etc.).
5. Variety: don't reuse the same sentence frame 5 times.

## 4. Curriculum (all levels — stay inside your units, and you may rely on earlier ones)

CEFR mapping: levels 1–2 A1, 3–4 A2, 5–6 B1, 7–8 B1+/B2, 9–10 B2/C1, 11–12 C1/C2.

**Niveau 1 — A1 — « Premiers pas » / First Steps — boss: Mister Hello**
- 1.1 Salut ! — greetings, introductions, polite words (hello, hi, goodbye, please, thank you,
  sorry, yes, no, my name is, nice to meet you, how are you, I'm fine, friend…). Grammar: I am /
  I'm, my name is, What's your name?, How are you?
- 1.2 Les nombres — numbers 0–20, How old are you? I'm ten (years old). Trap: *I have ten
  years*. Also "How many?" basic.
- 1.3 Couleurs et école — colours + classroom objects (pen, pencil, book, bag, desk, chair,
  eraser, ruler…). Grammar: a / an; *It's a red pen* (adjective BEFORE the noun, never
  plural: *two red pens*).
- 1.4 Ma famille — family (mom, dad, brother, sister, grandma, grandpa, parents, uncle, aunt,
  cousin, baby…). Grammar: This is my…, my / your, I have a brother, he / she.

**Niveau 2 — A1 — « Mon monde » / My World — boss: Le Roi To-Be**
- 2.1 Le verbe to be — full conjugation, negatives (isn't, aren't, I'm not), questions (Is she…?
  Yes, she is.). Vocab: states/feelings (happy, sad, tired, hungry, thirsty, cold, hot, angry,
  scared, bored, sick, ready, late). Trap: *J'ai faim* = *I'm hungry*, *J'ai froid* = *I'm cold*.
- 2.2 Animaux et pluriel — animals (dog, cat, bird, horse, cow, rabbit, duck, bear, wolf, fox,
  mouse, sheep, fish, beaver, moose…). Grammar: plurals -s / -es / -ies / -ves, irregular
  (mice, children, men, women, feet, teeth, sheep, fish).
- 2.3 Le corps et les descriptions — body parts + appearance adjectives (tall, short, long,
  curly…). Grammar: have / has, *She has blue eyes* (no article, adjective before, no -s on
  adjectives).
- 2.4 Jours, mois, heure — days, months (capital letters!), seasons, telling time (o'clock,
  half past, quarter to/past), prepositions of time on / in / at.

**Niveau 3 — A2 — « Au quotidien » / Everyday Life — boss: Docteur Routine**
- 3.1 Ma routine — daily routine verbs (wake up, get up, have breakfast, brush my teeth, go to
  school, do homework, go to bed…). Grammar: present simple affirmative, he/she/it -s/-es
  (goes, watches, has, does), frequency adverbs (always, usually, often, sometimes, never) and
  their position.
- 3.2 Questions et négations — do / does / don't / doesn't + base verb, wh-questions (what,
  where, when, who, why, how, which). Verbs: like, love, hate, want, need, know, live, speak,
  understand, work. Trap: *She doesn't likes*.
- 3.3 La nourriture — food & drinks (incl. maple syrup, poutine?—only if you explain it).
  Grammar: countable/uncountable, some / any, How much / How many, a lot of, I'd like…
- 3.4 La maison — rooms, furniture. Grammar: there is / there are (+ questions/negatives),
  prepositions of place (in, on, under, next to, between, behind, in front of, above).

**Niveau 4 — A2 — « En action » / In Action — boss: Capitaine Can**
- 4.1 En ce moment — present continuous (spelling: running, writing, swimming) vs present
  simple. Action verbs.
- 4.2 Sports et talents — sports (hockey, soccer, skating, skiing…), can / can't (+ base verb,
  no -s, no *to*), like / love / enjoy + -ing, good at + -ing.
- 4.3 En ville — places in town (library ≠ librairie!), directions (turn left/right, go
  straight, across from, next to, corner, traffic lights). Grammar: imperatives (Turn left.
  Don't run.), Where is…? How do I get to…?
- 4.4 Au magasin — clothes (incl. toque), shopping, money (dollar, cent, price, cheap,
  expensive, size). Grammar: How much is/are…?, object pronouns (me, him, her, us, them, it),
  this / that / these / those.

**Niveau 5 — B1 — « Hier » / Yesterday — boss: Le Fantôme du Passé**
- 5.1 Was, were et -ed — past of be, regular verbs (spelling: studied, stopped, arrived),
  time words (yesterday, last week, ago — *il y a deux jours* = *two days ago*).
- 5.2 Irréguliers (1) — go/went, see/saw, have/had, do/did, make/made, take/took, come/came,
  eat/ate, drink/drank, buy/bought, think/thought, get/got, give/gave, say/said, tell/told,
  find/found, know/knew, write/wrote.
- 5.3 Did you…? — past negatives/questions: did / didn't + BASE verb (trap: *Did you went?*,
  *I didn't saw*). Irregular verbs (2): begin, break, bring, catch, choose, fall, feel, fly,
  forget, leave, lose, meet, pay, run, sleep, speak, win, wear.
- 5.4 Raconter une histoire — past continuous, when / while, sequencing (first, then, after
  that, finally, suddenly).

**Niveau 6 — B1 — « Expériences et avenir » / Experiences & Future — boss: Professeur Perfect**
- 6.1 Le futur — will vs be going to vs present continuous for arrangements; weather &
  plans vocab. Trap: *When I will be older* → *When I'm older*.
- 6.2 Comparer — comparatives/superlatives (-er/-est, more/most, good/better/best,
  bad/worse/worst, far/farther), as … as, than (trap: *more big*, *than* vs *that*).
- 6.3 As-tu déjà… ? — present perfect for experiences (ever, never, been vs gone),
  past participles.
- 6.4 Depuis — present perfect + for / since / already / yet / just; present perfect vs past
  simple. Trap: *I am here since two years* → *I have been here for two years*.

**Niveau 7 — B1+ — « Nuances » / Shades — boss: Les Jumeaux Faux-Amis**
- 7.1 Obligations et conseils — must, have to, mustn't (interdit) vs don't have to (pas
  obligé), should, might / may / could (possibility). Health & rules vocab.
- 7.2 Si… — zero and first conditional, unless, as soon as, when + present (no *will* after
  if/when). Environment vocab.
- 7.3 Les faux amis — actually, eventually, library, bookstore, sensible, sensitive,
  disappointment (≠ deception), attend, assist, pretend, achieve, coin, location, journey,
  currently, lecture, injury, rude, resume, issue, college…
- 7.4 Gérondif ou infinitif — verb + -ing (enjoy, finish, avoid, mind, keep, suggest,
  practise, can't stand), verb + to (want, decide, hope, plan, promise, refuse, learn,
  manage, afford), meaning change (stop, remember, forget, try), preposition + -ing.

**Niveau 8 — B2 — « Raconter autrement » / Telling It Differently — boss: Madame Passive**
- 8.1 Et si… ? — second conditional (If I were…, I would…), If I were you, wish + past.
- 8.2 La voix passive — all common tenses + modals, by + agent. Inventions/media vocab.
- 8.3 Qui, que, dont — relative clauses (who, which, that, whose, where, when), omitting
  the object pronoun, defining vs non-defining (commas). Jobs vocab.
- 8.4 Phrasal verbs (1) — get up, give up, look for, look after, find out, turn on/off, put
  on, take off, run out of, come back, pick up, grow up, break down, fill out, set off, carry
  on, turn down… Separable (turn it off) vs inseparable (look after her).

**Niveau 9 — B2 — « Argumenter » / Make Your Case — boss: Le Reporter**
- 9.1 Le passé du passé — past perfect simple & continuous, narrative tenses (by the time,
  already, before, after). Mystery-story vocab (witness, clue, suspect…).
- 9.2 Il a dit que… — reported speech: backshift, say vs tell, reported questions (no
  inversion, if/whether), reported commands (told me to / not to), time-word changes.
  Reporting verbs (admit, deny, warn, suggest, complain, refuse, remind, insist…).
- 9.3 Les connecteurs — however, although, even though, despite / in spite of (+ noun /
  -ing), whereas, therefore, moreover, as a result, on the other hand, unless, in order to,
  so that. Debate vocab.
- 9.4 Make, do et compagnie — collocations with make, do, take, have, pay, keep, catch,
  break, save, waste.

**Niveau 10 — C1 — « Précision » / Precision — boss: L'Idiome Masqué**
- 10.1 Si seulement… — third conditional, mixed conditionals, wish / if only + past perfect.
- 10.2 Il a dû… — must have, can't have, might / may / could have, should / shouldn't have,
  needn't have vs didn't need to.
- 10.3 Les expressions (1) — idioms: break the ice, a piece of cake, hit the books, under the
  weather, once in a blue moon, cost an arm and a leg, spill the beans, the ball is in your
  court, call it a day, on the fence, hit the sack, get cold feet, beat around the bush, pull
  someone's leg, a blessing in disguise, it's not rocket science, cut corners, the last straw…
- 10.4 Fabriquer des mots — word formation: prefixes (un-, in-, im-, ir-, il-, dis-, mis-,
  re-, over-, under-) and suffixes (-ness, -ment, -ity, -tion, -ance, -ful, -less, -able,
  -ous, -ive, -ize, -en, -hood, -ship).

**Niveau 11 — C1 — « Style » / Style — boss: Lord Register**
- 11.1 L'emphase — inversion (Never have I…, Not only… but also, Hardly… when, No sooner…
  than, Under no circumstances, Little did he know, Only then did…), cleft sentences (What I
  need is…, It was Tom who…), emphatic do.
- 11.2 Formel ou familier — register pairs (ask for → request, help → assist, need → require,
  buy → purchase, find out → discover, give back → return, tell → inform…), formal email
  phrases (I am writing to…, I would be grateful if…, I look forward to hearing from you —
  look forward to + -ing), informal spoken forms (gonna, wanna, gotta).
- 11.3 L'anglais de la vraie vie — spoken & Canadian English: no worries, my bad, fair enough,
  it's up to you, hang out, awesome, sketchy, legit, eh, washroom, double-double, loonie,
  toonie, toque, keener, pop… (all kid-appropriate).
- 11.4 Les mots qui piègent — affect/effect, lose/loose, borrow/lend, say/tell, rise/raise,
  lie/lay, fewer/less, its/it's, their/there/they're, your/you're, whose/who's, then/than,
  advice/advise, practice/practise, quiet/quite, accept/except, compliment/complement,
  principal/principle, stationary/stationery.

**Niveau 12 — C2 — « Bilingue » / Fully Bilingual — boss: L'Ultime Bilingue**
- 12.1 Grammaire de haut vol — it's (high) time + past, would rather + past, had better, as
  if / as though, were to, inverted should (Should you need…), mandative subjunctive
  (insist that he be), provided that, in case.
- 12.2 Nuances et connotations — near-synonyms with connotation: slim/skinny/thin,
  determined/stubborn, inexpensive/cheap, curious/nosy, confident/arrogant, thrifty/stingy,
  scent/stink, giggle/chuckle, stroll/stride/stumble, glance/stare/glare/peek,
  whisper/mutter/yell, famous/notorious, childlike/childish.
- 12.3 Phrasal verbs et proverbes — come up with, put up with, get away with, look down on,
  look up to, run into, bring up, cut down on, figure out, turn out, end up, catch up with,
  come across, fall out with, get over, live up to, make up for, stand out + proverbs
  (Actions speak louder than words, Better late than never, Every cloud has a silver lining,
  The early bird catches the worm, Don't count your chickens before they hatch…).
- 12.4 Le grand oral — pronunciation traps: silent letters (knife, knight, island,
  Wednesday, comb, doubt, listen, hour, honest, receipt), homophones (knight/night,
  weather/whether, peace/piece, right/write, hear/here, flour/flower), stress (a REcord /
  to reCORD), -ough words (though, through, tough, thought, cough). The reading is a longer
  real-life text (news-style or podcast-style) with inference questions.

## 5. Validation

Run `node tools/validate.mjs content/level-XX.json` (from the `mission-bilingue` folder)
until it prints **0 errors**. Warnings must be read and fixed when they are real problems.
Then re-read your whole file once more as a strict English teacher.
