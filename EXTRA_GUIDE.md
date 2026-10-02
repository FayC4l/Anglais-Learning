# Mission Bilingue — pronunciation workshop & speaking/writing missions

Read `CONTENT_GUIDE.md` first (same app, same kid, same rules on tone, Canadian English,
French for explanations, no invented facts, kid-appropriate). This guide adds, for every
unit, two things stored in separate files `content/extra-01.json` … `content/extra-12.json`:

1. **`pron`** — the unit's *pronunciation workshop* ("Atelier prononciation"). A French-speaking
   voice coach (speech synthesis, French voice) reads the explanation aloud, then an English
   voice says each example word, normal speed then slow, and the kid repeats. Then an
   ear-training game plays one word of each minimal pair and the kid must say which one he
   heard. The pronunciation track is methodical: one focus per unit, in the order below.
2. **`mission`** — a short real-life *speaking or writing task* that closes the unit. The kid
   says it aloud (or writes it), then compares with a model answer read by the English voice,
   and ticks a self-check list.

The kid is a French speaker (Franco-Ontarian/Québécois, 10–15 years old). Be encouraging and
concrete: mouth/tongue/lips positions, comparisons with French sounds, the classic francophone
mistake, a trick to remember. Never scary, never technical jargon without explanation.

## File format (strict JSON)

```json
{
  "level": 1,
  "units": [
    {
      "unit": "1.2",
      "pron": {
        "focus": "Le son « th » de three",
        "ipa": "/θ/",
        "explain": "En français, ce son n'existe pas ! Pour dire [[three]], pose le bout de ta langue entre tes dents du haut et du bas, puis souffle doucement, comme un serpent qui zozote. Si tu dis « tri », on entend [[tree]] (un arbre) !",
        "words": [
          { "en": "three", "fr": "trois", "hint": "« thrii » : langue entre les dents, puis souffle" },
          { "en": "thirteen", "fr": "treize", "hint": "« theur-TIIN » : accent sur la fin" }
        ],
        "pairs": [["three", "tree"], ["thank", "tank"], ["think", "sink"]],
        "practice": ["I think three is my lucky number."]
      },
      "mission": {
        "type": "oral",
        "prompt": "Ton nouveau voisin te demande ton âge et celui de ta sœur. Réponds en deux phrases complètes.",
        "model": "I'm twelve years old. My sister is eight.",
        "checklist": ["J'ai dit [[I'm]] + mon âge, sans [[have]]", "J'ai prononcé le « th » si mon nombre en avait un", "J'ai fait deux phrases complètes"]
      }
    }
  ]
}
```

Rules:
- `units`: exactly 4 objects, `unit` = "L.1" … "L.4".
- `pron.focus`: French title of the sound/feature (short). `pron.ipa`: IPA symbol(s) of the
  focus when it is a sound (e.g. "/θ/", "/ɪ/ – /iː/"), or "" for stress/intonation/rhythm units.
- `pron.explain`: French, 2–5 sentences, with `[[English]]` chips for every English word quoted
  (the chips are tappable and spoken by the English voice). `**gras**` allowed.
- `pron.words`: **6–10** items `{ en, fr, hint }`. `en` = English word or short phrase,
  lowercase unless proper noun/"I", no digits, no final punctuation. `fr` = its meaning.
  `hint` = French pronunciation help: an approximate French-style spelling in « » with the
  stressed syllable in CAPITALS (« theur-TIIN », « VEJ-te-beul »), plus a short tip.
  Approximations are only a crutch: the voice is the reference. Prefer words from the unit's
  vocabulary theme (read `content/level-XX.json` if it already exists) or very common words.
- `pron.pairs`: **0–6** minimal pairs `[target, contrast]` (two different real English words
  that differ by the focus sound, e.g. ["ship", "sheep"]). Only real, common, kid-appropriate
  words, clearly distinct when read by a speech synthesizer. Use `[]` for stress, rhythm and
  intonation units where pairs make no sense. Never pair homophones (they sound identical!)
  except in the homophone units, where pairs must NOT be used: put homophones in `words` instead.
- `pron.practice`: 1–3 English sentences or tongue twisters that concentrate the focus. For
  intonation/stress units, show the stress in the `hint`s and write normal sentences here
  (no capitals, no arrows inside `practice`: the voice reads them).
- `mission.type`: "oral" or "ecrit" — alternate within a level (2 of each per level).
- `mission.prompt`: French, a concrete real-life situation (Ottawa/Canada daily life, school,
  friends, family, hobbies, travel…), 1–3 sentences, that forces the unit's grammar/vocab.
- `mission.model`: an English model answer, natural, using only what the kid has learned up
  to this unit, no digits (TTS reads it). Length: levels 1–2 one to three short sentences;
  3–4 up to four sentences; 5–8 up to six; 9–12 up to eight (formal email/argument allowed).
- `mission.checklist`: 3–5 French self-check items, concrete ("J'ai utilisé [[did]] + verbe
  de base", "J'ai mis le « s » à [[she plays]]"). `[[chips]]` allowed.
- No digits anywhere in English fields (write numbers in words).

## The pronunciation track (one focus per unit — follow it)

Niveau 1
- 1.1 Le « h » qu'on entend (/h/): hello, hi, how, happy, he, her, house, hand. Pairs with/without h: hand/and, heat/eat, hold/old, hear/ear, hat/at. Trap both ways: not dropping it, not adding it.
- 1.2 Le « th » de three (/θ/): three, thirteen, thank you, think, birthday, both, fourth, mouth. Pairs: three/tree, thank/tank, think/sink, thin/tin, path/pass.
- 1.3 Voyelle courte /ɪ/ ou longue /iː/: pink, big, sit, it vs green, eat, see, seat. Pairs: ship/sheep, sit/seat, live/leave, fill/feel, hit/heat, bin/bean.
- 1.4 Le « th » de mother (/ð/): mother, father, brother, this, that, they, the, there. Pairs: they/day, then/den, though/dough, there/dare, breathe/breeze.

Niveau 2
- 2.1 Le « r » anglais (ni roulé, ni dans la gorge): red, are, sorry, ready, hungry, angry, tired, very. Pairs: right/light, read/lead, rock/lock, fry/fly, grass/glass.
- 2.2 Le pluriel qui s'entend : /s/, /z/, /ɪz/: cats, ducks, dogs, birds, cows, horses, foxes, wolves. Pairs (singular/plural): fox/foxes, horse/horses, dog/dogs.
- 2.3 Les voyelles qui glissent (diphtongues /eɪ/, /aɪ/, /oʊ/): face, eight, eyes, my, nose, toe, cake. Pairs: pain/pen, wait/wet, main/men, note/not, coat/cot.
- 2.4 L'accent tonique des mots: January, February, Saturday, September, October, November, December, afternoon, tomorrow. Pairs: [].

Niveau 3
- 3.1 Le « s » de la 3e personne : /s/, /z/, /ɪz/ (+ does /dʌz/, says /sez/): gets, eats, goes, plays, watches, brushes, finishes, does, says. Pairs: play/plays, watch/watches.
- 3.2 L'intonation des questions (monte pour oui/non, descend pour where/what…). Pairs: []. Practice: one question of each kind.
- 3.3 Les sons /dʒ/ (juice) et /tʃ/ (cheese), différents du « j » français: juice, jam, orange, vegetables, large, fridge, cheese, chicken, lunch, kitchen. Pairs: jeep/cheap, joke/choke, badge/batch, ridge/rich.
- 3.4 /ʊ/ court ou /uː/ long: book, look, cook, good, foot, put vs food, room, roof, shoe, moon, pool. Pairs: full/fool, pull/pool.

Niveau 4
- 4.1 Le son « ng » /ŋ/ de -ing (on n'entend pas un « g » dur): running, swimming, reading, sing, thing, long, wrong, morning. Pairs: sing/sin, thing/thin, rang/ran, wing/win, bang/ban.
- 4.2 can (faible) ou can't (fort): can, can't, skating, skiing, hockey, soccer. Pairs: can/can't. Explain that in a sentence *can* becomes « keun » and *can't* stays strong « kann't ».
- 4.3 Les sons /æ/ (cat) et /ʌ/ (cup): bank, map, traffic, stand, back vs bus, up, one, fun, much. Pairs: cap/cup, hat/hut, bag/bug, cat/cut, match/much.
- 4.4 thirTEEN ou THIRty ? (prix et nombres): thirteen, thirty, fourteen, forty, fifteen, fifty, sixteen, sixty, eighteen, eighty. Pairs: thirteen/thirty, fourteen/forty, fifteen/fifty, sixteen/sixty, eighteen/eighty.

Niveau 5
- 5.1 La terminaison -ed : /t/, /d/, /ɪd/: walked, watched, liked, played, stayed, arrived, wanted, needed, visited, started. Pairs: play/played, walk/walked, want/wanted.
- 5.2 Les passés irréguliers qui piègent l'oreille: said /sed/, read /red/, bought, brought, thought, caught, ate, saw, made. Pairs: bought/boat, said/sad (check they are distinct).
- 5.3 Quand les mots se collent : did you, didn't, what did you, did he (« didja », « whaddya »): practice sentences. Pairs: [].
- 5.4 Le schwa /ə/, le son le plus fréquent de l'anglais: about, suddenly, finally, banana, seven, problem, the, a. Pairs: [].

Niveau 6
- 6.1 Les contractions du futur: I'll, you'll, it'll, we'll, won't, gonna. Pairs: won't/want, we'll/will.
- 6.2 Le son /ɜː/ de bird: bird, first, worse, worst, learn, word, work, heard, shirt. Pairs: walk/work, ward/word, short/shirt, torn/turn, four/fur.
- 6.3 Les contractions de have: I've, you've, she's, haven't, hasn't, have you ever (« hav-ya-EV-eur »). Pairs: [].
- 6.4 Les liaisons de l'anglais: for a year, since April, an hour, turn it on, pick it up, at all. Pairs: [].

Niveau 7
- 7.1 Les lettres muettes des modaux: should, could, would (l muet), mustn't (t muet), talk, walk, half. Pairs: [] (would/wood are homophones: put them in words with the same hint).
- 7.2 La mélodie des phrases en deux parties (if…, …): monte à la virgule, descend à la fin. Pairs: [].
- 7.3 Les mots transparents qu'on prononce mal: comfortable, vegetable, chocolate, interesting, different, restaurant, hotel, recipe, machine, event. Pairs: [].
- 7.4 Les terminaisons -tion /ʃən/ et -sion /ʒən/, accent juste avant: decision, information, conversation, education, vision, television, pollution. Pairs: [].

Niveau 8
- 8.1 Les formes faibles de were et would: if I were you, I'd, you'd, wouldn't, were. Pairs: [].
- 8.2 L'accent qui se déplace dans les familles de mots: photograph, photography, photographic, invent, invention, inventor, science, scientific, publish, publication. Pairs: [].
- 8.3 Métiers en -ian, -eer, -ist: electrician, musician, engineer, volunteer, journalist, mechanic, scientist, lawyer. Pairs: [].
- 8.4 L'accent des phrasal verbs (sur la particule) et nom/verbe: give up, turn it off, look after, pick it up, a breakdown / to break down, a setup / to set up. Pairs: [].

Niveau 9
- 9.1 Le 'd qui veut dire had: I'd left, she'd already gone, they'd been waiting, had had. Pairs: [].
- 9.2 Les verbes de discours, accent sur la 2e syllabe, et -ed /ɪd/: admit, deny, complain, insist, remind, suggest, explain, refuse, admitted, insisted. Pairs: [].
- 9.3 Les connecteurs en « th » et « ough »: though, although, through, therefore, furthermore, whether, thorough. Pairs: though/dough, through/true.
- 9.4 Le rythme des collocations (a, your, of tout petits): make a mistake, do your homework, take a break, have a look, pay attention. Pairs: [].

Niveau 10
- 10.1 would've, should've, could've (jamais « would of »): would've, should've, could've, wouldn't have, if I'd known. Pairs: [].
- 10.2 must've, might've, can't have, needn't have. Pairs: [].
- 10.3 Le rythme des expressions idiomatiques (accent sur les mots-clés): a piece of cake, break the ice, under the weather, once in a blue moon, cost an arm and a leg, call it a day. Pairs: [].
- 10.4 Suffixes qui déplacent l'accent (-ity, -ic, -ion) ou non (-ness, -ment, -ful): possible, possibility, economy, economic, happy, happiness, educate, education. Pairs: [].

Niveau 11
- 11.1 L'accent d'insistance qui change le sens: practice sentences such as "I didn't say he stole it." with the hints explaining each stressed version. Pairs: [].
- 11.2 Anglais familier ou soigné à l'oral: gonna, wanna, gotta, lemme, gimme, dunno, kinda vs going to, want to, got to, let me, give me, don't know, kind of. Pairs: [].
- 11.3 L'accent canadien: about, out, house (Canadian raising), sorry, water, better, little, city (t qui devient « d »), Toronto, eh. Pairs: [].
- 11.4 Homophones et presque-homophones: their/there/they're, its/it's, your/you're, whose/who's, to/too/two (words only, same hint) and lose/loose, advice/advise, quiet/quite, accept/except, desert/dessert (these ARE minimal pairs: put them in `pairs`).

Niveau 12
- 12.1 Le rythme de l'anglais (mots pleins forts, mots outils faibles) dans les phrases formelles. Pairs: [].
- 12.2 L'intonation des émotions et des sous-entendus: fine, really, great, sure, whatever, sorry (explain falling vs fall-rise; the kid practises, the synthesizer cannot do every melody, say so honestly). Pairs: [].
- 12.3 L'accent des verbes à trois mots et des proverbes: come up with, put up with, look forward to, get away with, catch up with, run out of. Pairs: [].
- 12.4 Lettres muettes et le casse-tête « ough »: knife, knight, island, Wednesday, comb, doubt, listen, hour, honest, receipt, though, through, tough, thought, cough. knight/night and hour/our are homophones: words only, same hint. Pairs: [] unless you find true minimal pairs.

## Validation

Run `node tools/validate-extra.mjs content/extra-XX.json` until 0 errors.
