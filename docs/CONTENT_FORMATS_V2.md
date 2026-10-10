# Mission Bilingue V2 — formats des nouveaux contenus

Lis d'abord `CONTENT_GUIDE.md` (ton, anglais canadien, français pour les explications, équité, pas de faits
inventés) et `EXTRA_GUIDE.md`. **Changement important du public :** l'app sert maintenant à **toute la famille**
(enfants dès 10 ans, ados, parents adultes). Le contenu doit rester familial (aucun sujet choquant), mais ne doit
pas être infantilisant : des situations de la vie courante qui parlent à tous (école ET travail, famille, voyages,
cuisine, sport, technologie, voisinage). Le tutoiement reste la règle. **L'humour est bienvenu partout** : second
degré, absurde léger, autodérision, jeux de mots — jamais méchant, jamais vulgaire.

Règles communes à tous les fichiers :
- JSON strict UTF-8, sans commentaires ni virgules finales.
- Anglais : naturel, sans faute, canadien (colour, favourite, centre, travelled ; -ize).
- **Aucun chiffre** dans les textes anglais lus à voix haute (textes, scripts d'écoute) : écrire les nombres en lettres.
- Une seule bonne réponse possible, ou toutes les bonnes réponses listées.
- Chaque `explain` est en français, 1-2 phrases, et dit **pourquoi**.
- Validation obligatoire : `node tools/validate-v2.mjs content/<fichier>.json` → **0 erreur**.

## Règle des trous (`fill`) — NOUVEAU

L'app affiche **une case par mot** de la réponse `answer[0]` (« ___ » de « has been » → deux cases). Donc :
- toutes les réponses de `answer` doivent avoir le **même nombre de mots** que `answer[0]` ;
  exception tolérée : les contractions (`isn't` ≡ `is not`, `didn't go` ≡ `did not go`) car l'app les accepte
  automatiquement — ne liste PAS les deux formes, mets la forme la plus naturelle en premier ;
- `___` (exactement trois soulignés) apparaît **une seule fois** dans `q`.
- Champs optionnels nouveaux : `lead` (une phrase de départ affichée au-dessus, pour les transformations) et `key`
  (mot-clé imposé, en MAJUSCULES, qui doit apparaître dans chaque réponse).

---

## 1. Stations bonus (unité 5 de chaque niveau)

Ajouter dans `content/level-XX.json` une 5e unité `"id": "L.5"` à la fin de `units`, exactement au format des
unités existantes (lesson, vocab, sentences, grammar, reading selon le niveau), et dans `content/extra-XX.json` une
5e entrée `"unit": "L.5"` (pron + mission). Lire d'abord les 4 unités existantes du niveau pour ne pas répéter leur
vocabulaire (`en` et `fr` uniques dans tout le niveau) et pour ne s'appuyer que sur ce qui a été appris.

| Station | Titre FR | Contenu |
|---|---|---|
| 1.5 | L'alphabet et les articles | l'alphabet anglais et épeler (How do you spell…?), lettres qui piègent (E/I, G/J, A/R, Y, W), a / an / the de base, the devant ce qu'on connaît déjà |
| 2.5 | À qui est-ce ? | adjectifs possessifs complets (my…their, its ≠ it's), pronoms possessifs (mine, yours, his, hers, ours, theirs), génitif 's / s' (my sister's room, my parents' car), Whose…? |
| 3.5 | Combien et lesquels | all / every / each, much / many / a lot of (révision), a few / a little (base), too much / too many, none, both |
| 4.5 | Comment ? | adverbes de manière (quickly, carefully, well, hard, fast — pièges good/well, hard/hardly), very / really / too / enough (too cold, not old enough, enough money) |
| 5.5 | C'était mieux avant | used to / didn't use to / did you use to, would pour les habitudes passées, différence avec be used to (simple intro) |
| 6.5 | N'est-ce pas ? | question tags (isn't it?, don't you?, didn't she?, haven't you?, will you?), réponses courtes, so do I / neither do I / me too / me neither |
| 7.5 | Le futur avancé | future continuous (This time tomorrow I'll be flying), future perfect (By June I'll have finished), be about to, be due to |
| 8.5 | Faire faire | have / get something done (I had my hair cut), pronoms réfléchis (myself…themselves), each other vs themselves, by myself |
| 9.5 | Poser autrement | questions indirectes (Could you tell me where the station is?), propositions participiales (Having finished…, Written in…, Not knowing…) |
| 10.5 | Articles et quantités avancés | article zéro (in hospital, at school, by bus), the + adjectif (the rich), few / a few / little / a little nuances, either / neither / none, whole / all |
| 11.5 | L'anglais académique | hedging (it appears that, tends to, arguably, is likely to), structures impersonnelles (It is widely believed that…, X is thought to…), nominalisation (decide → decision; the introduction of…) |
| 12.5 | Cohésion de haut vol | ellipse et substitution (so, not, do so, one/ones, I hope so / I'm afraid not), collocations de niveau C2 (pose a threat, bear in mind, draw a conclusion, come to terms with, make allowances for…) |

Pron des stations bonus : choisir un point de prononciation **non traité** dans la piste de `EXTRA_GUIDE.md`, lié
au thème (ex. 1.5 noms des lettres, 2.5 le 's possessif /s/ /z/ /ɪz/, 4.5 adverbes en -ly et l'accent, 5.5 used to
« youss-teu », 6.5 intonation des question tags, 11.5 rythme des phrases académiques…). Mission : alterner avec les
missions déjà présentes dans le niveau.

## 2. `content/boss-XX.json` — 60 questions réservées au boss

```json
{
  "level": 3,
  "taunts": {
    "phase2": ["Réplique du boss quand il passe en phase 2 (FR, drôle, 1 phrase)", "…", "…"],
    "phase3": ["Réplique de rage en phase 3", "…", "…"],
    "lose": ["Ce que dit le boss quand le joueur perd", "…", "…"]
  },
  "questions": [
    { "unit": "3.2", "type": "mcq", "q": "___ your neighbour walk his dog every morning?", "choices": ["Do", "Does", "Is"], "answer": 1, "explain": "…" },
    { "unit": "3.1", "type": "fill", "q": "My cat ___ on my keyboard every time I work.", "hint": "sleep", "answer": ["sleeps"], "explain": "…" },
    { "unit": "3.4", "type": "error", "q": "There is three spoons in the drawer.", "wrong": 1, "fix": ["are"], "explain": "…" }
  ]
}
```
- Exactement **60** questions : ≥ 18 `mcq`, ≥ 22 `fill`, ≥ 14 `error` (mêmes règles que `grammar` dans CONTENT_GUIDE).
- `unit` = la station dont la question vérifie le savoir (`L.1` … `L.5`) ; au moins 9 questions par station
  `L.1`–`L.4` et au moins 6 pour `L.5` (station bonus décrite ci-dessus).
- Ces questions ne doivent **jamais** reprendre une phrase des unités du niveau (nouvelles phrases, nouveaux contextes).
- Elles sont un peu plus difficiles que les tests de station, toujours justes, et souvent drôles (situations absurdes
  ou du quotidien des familles).
- Les QCM varient la position de la bonne réponse.

## 3. `content/placement.json` — test de placement

```json
{
  "questions": [
    { "id": "p001", "band": "A1", "type": "mcq", "q": "I ___ twelve years old.", "choices": ["have", "am", "is", "do"], "answer": 1, "explain": "…" },
    { "id": "p002", "band": "B1", "type": "fill", "q": "I ___ in Ottawa since I was a child.", "hint": "live", "answer": ["have lived"], "explain": "…" },
    { "id": "p003", "band": "B2", "type": "reading", "text": "Short English text (40-120 words)…", "q": "What does the writer suggest?", "choices": ["…", "…", "…", "…"], "answer": 2, "explain": "…" },
    { "id": "p004", "band": "A2", "type": "listening", "say": "English text read aloud (1-3 sentences, no digits)", "q": "Where is the speaker going?", "choices": ["…", "…", "…", "…"], "answer": 0, "explain": "…" }
  ]
}
```
- Bandes `A1 A2 B1 B2 C1 C2`, **25 questions par bande** (150 au total) : 12 `mcq`, 7 `fill`, 3 `reading`, 3 `listening`.
- Les consignes (`q`) sont en anglais (le test sert aussi aux adultes) ; A1 très simple.
- Couvrir grammaire, conjugaison, vocabulaire et compréhension, du plus simple (to be, pluriels) au plus subtil
  (inversion, subjonctif, nuances, collocations C2). Une question doit discriminer sa bande : un apprenant de la
  bande inférieure devrait souvent se tromper, un apprenant de la bande supérieure presque jamais.
- `id` uniques `p001`…`p150`.

## 4. `content/lexicon-XX.json` — lexique complémentaire

```json
{ "level": 3, "words": [ { "en": "fridge", "fr": "frigo (réfrigérateur)", "ex": "The milk is in the fridge.", "theme": "maison", "pos": "noun" } ] }
```
- **150 mots** par niveau, adaptés au CEFR du niveau (fréquents d'abord), groupés par thèmes de la vie réelle
  (maison, travail, école, santé, argent, transports, nature, émotions, médias, société, sciences…).
- `pos` parmi `noun verb adj adv phrase other`. `ex` : phrase d'exemple naturelle sans chiffres.
- `en` ne doit exister ni dans le vocabulaire d'une unité (n'importe quel niveau), ni dans un autre lexique.
  `fr` unique dans le fichier (désambiguïser entre parenthèses si besoin).

## 5. `content/writing.json` — sujets de rédaction

```json
{
  "prompts": [
    {
      "id": "w03-1", "level": 3, "type": "email",
      "title": "Ma journée type",
      "prompt": "Consigne en français : situation concrète + ce qu'il faut mettre dans le texte.",
      "ages": ["enfant", "ado"],
      "words": [60, 90],
      "require": [
        { "kind": "tense", "value": "present_simple", "min": 4, "label": "Utilise le présent simple (au moins 4 verbes)" },
        { "kind": "connectors", "min": 2, "label": "Utilise au moins 2 mots de liaison (and, but, then…)" },
        { "kind": "words", "value": ["always", "usually", "often", "sometimes", "never"], "min": 2, "label": "Au moins 2 adverbes de fréquence" }
      ],
      "model": "Model answer in English, within the word range."
    }
  ]
}
```
- **8 sujets par niveau** (96). `ages` facultatif (absent = tous) : chaque niveau doit avoir au moins 2 sujets
  convenant aux adultes et 2 aux enfants.
- `type` parmi `description email letter story message essay article review report proposal`.
- Fourchettes de mots : L1-2 [25,60], L3-4 [50,100], L5-6 [80,140], L7-8 [120,180], L9-10 [160,240], L11-12 [220,320].
- `require.kind` parmi :
  `tense` (`value` ∈ present_simple, present_continuous, past_simple, past_continuous, present_perfect, future,
  conditional, passive, past_perfect, modal), `connectors` (min), `words` (liste `value`, min), `paragraphs` (min),
  `questions` (min de phrases interrogatives).
- `model` respecte sa propre consigne et sa fourchette de mots.

## 6. `content/humor.json` — mascotte et blagues

Le prof de l'app s'appelle **Chikh Faycal** : un prof d'anglais humain, un peu vaniteux, très fier de sa barbe,
de sa cravate, de ses lunettes de soleil et de son thé à la menthe, pince-sans-rire mais bienveillant. Il parle français avec quelques mots anglais en `[[chips]]`.
```json
{
  "quips": {
    "welcome": [ { "text": "Bon retour ! Mes bois ont poussé de deux centimètres en t'attendant." } ],
    "correct": [], "wrong": [], "streak": [], "timeout": [], "perfect": [], "fail": [], "comeback": [], "writing_good": [], "writing_bad": []
  },
  "jokes": [ { "en": "Why did the student eat his homework? Because the teacher said it was a piece of cake!", "fr": "« A piece of cake » = un jeu d'enfant (littéralement « un morceau de gâteau »).", "level": 6 } ]
}
```
- Au moins **20 répliques par situation** (`ages` facultatif sur une réplique : `["enfant"]`, `["adulte"]`…),
  courtes (≤ 140 caractères). `wrong`/`fail` ne doivent jamais humilier : on rit de Maurice, de la langue anglaise
  ou de la situation, pas du joueur.
- Au moins **70 blagues** (jeux de mots anglais, devinettes), chacune avec une explication française claire du
  ressort comique et un `level` (1-12) indiquant le niveau d'anglais nécessaire pour la comprendre.

## 7. `content/wordform.json` — formation des mots (générateur et C2 partie 3)

```json
{ "items": [ { "level": 10, "stem": "HAPPY", "q": "Despite all his success, he could not hide his deep ___.", "answer": ["unhappiness"], "explain": "Nom (après his deep) + préfixe négatif un- : unhappiness." } ] }
```
- **150 items** : 20 niveau 7-8, 40 niveau 9-10, 90 niveau 11-12 (dont de vraies difficultés C2 :
  préfixes et suffixes multiples, changements d'orthographe, formes négatives).
- `stem` en MAJUSCULES ; la réponse est **un seul mot** dérivé du stem ; le contexte n'autorise qu'une réponse.

## 8. `content/c2-uoe.json` — C2 Proficiency, Reading & Use of English parties 1 à 4

Textes **100 % originaux** (jamais tirés d'examens réels), registre C2 (articles, essais, récits), sujets variés et
intéressants pour des adultes comme des ados.
```json
{
  "part1": [ { "id": "u1-01", "title": "…", "text": "Text with gaps {1} … {8}.", "gaps": [ { "choices": ["a", "b", "c", "d"], "answer": 2, "explain": "…" } ] } ],
  "part2": [ { "id": "u2-01", "title": "…", "text": "… {1} … {8} …", "gaps": [ { "answer": ["which"], "explain": "…" } ] } ],
  "part3": [ { "id": "u3-01", "title": "…", "text": "… {1} … {8} …", "gaps": [ { "stem": "COMPARE", "answer": ["incomparably"], "explain": "…" } ] } ],
  "part4": [ { "id": "u4-01", "lead": "I had no idea that she was so talented.", "key": "LITTLE", "q": "___ she was so talented.", "answer": ["Little did I know that", "Little did I realize that"], "explain": "…" } ]
}
```
- part1 : **6** textes de 160-220 mots, 8 trous, 4 choix (collocations, expressions figées, nuances).
- part2 : **6** textes, 8 trous, réponse = **un seul mot** (prépositions, articles, connecteurs, auxiliaires, particules).
- part3 : **6** textes, 8 trous, réponse = un seul mot dérivé du `stem`.
- part4 : **48** transformations ; la réponse fait **3 à 8 mots** et contient le `key` inchangé ; `q` contient `___` une fois.
- Trous numérotés `{1}`…`{8}` dans l'ordre, chacun une fois.

## 9. `content/c2-papers.json` — C2 Proficiency, Reading 5-7, Listening, Writing, Speaking

```json
{
  "reading5": [ { "id": "r5-01", "title": "…", "text": "≈ 550-700 words, paragraphs separated by \n\n", "questions": [ { "q": "…", "choices": ["…","…","…","…"], "answer": 1, "explain": "…" } ] } ],
  "reading6": [ { "id": "r6-01", "title": "…", "parts": ["Paragraph text", "{gap}", "Paragraph text", "{gap}"], "options": ["Paragraph A", "…"], "answer": [3, 0, 5, 1, 6, 2, 4], "explain": "…" } ],
  "reading7": [ { "id": "r7-01", "title": "…", "sections": [ { "label": "A", "text": "…" } ], "statements": [ { "text": "…", "answer": "C" } ] } ],
  "listening": [ { "id": "l-01", "part": 1, "title": "…", "lines": [ { "who": "Woman", "en": "…" } ], "questions": [ { "q": "…", "choices": ["…","…","…"], "answer": 0, "explain": "…" } ] } ],
  "writing": [ { "id": "c2w-01", "part": 1, "type": "essay", "title": "…", "prompt": "English rubric as in the exam", "texts": ["Text one (≈ 100 words)", "Text two"], "words": [240, 280], "require": [ { "kind": "paragraphs", "min": 4, "label": "…" } ], "model": "…" } ],
  "speaking": [ { "id": "s-01", "part": 2, "prompt": "English task", "followups": ["…"], "useful": ["…"] } ]
}
```
- reading5 : **4** textes, 6 QCM chacun (inférence, ton, opinion de l'auteur, sens d'une expression).
- reading6 : **3** textes ; `parts` contient le texte avec **7** `{gap}` ; `options` = **8** paragraphes (7 + 1 intrus) ;
  `answer[i]` = index dans `options` du paragraphe du i-ème trou ; tous distincts.
- reading7 : **3** jeux ; 4 à 6 sections ; **10** affirmations à associer (chaque section utilisée au moins une fois).
- listening : **8** enregistrements (2 par partie 1-4) ; `lines` lues par la synthèse vocale (pas de chiffres, pas
  d'abréviations) ; parties 1 et 3 : 3 choix ; partie 2 : 4 choix ; partie 4 : 4 choix ; 3 à 6 questions.
- writing : **8** sujets (3 part 1 « essay » avec deux `texts` à résumer et évaluer, 240-280 mots ; 5 part 2 :
  article, letter, report, review, essay — 280-320 mots) ; `model` respecte la fourchette.
- speaking : **12** sujets (4 par partie 1-3), `useful` = 4-6 expressions utiles.
