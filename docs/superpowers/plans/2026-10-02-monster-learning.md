# Mission Bilingue « Monster » — plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transformer Mission Bilingue en app familiale complète A1→C2 (profils, placement, boss aléatoires, conjugaison, SRS, rédaction corrigée, prépa C2 Proficiency).

**Architecture:** On garde le moteur vanilla JS + esbuild en un seul HTML. Le code pur (conjugueur, générateurs,
sélection anti-répétition, placement, SRS, correcteur) vit dans des modules sans DOM, testés avec `node --test`.
Le contenu volumineux est écrit en JSON (par des agents de contenu en parallèle), chaque format ayant son
validateur dans `tools/`. Les écrans s'appuient sur `runQuiz`/`renderQuestion` existants.

**Tech Stack:** JavaScript ES2020 modules, esbuild 0.28, node:test, playwright-core (smoke, via Edge local),
`wordlist-english` (MIT, SCOWL) au build pour le dictionnaire.

Spec : `docs/superpowers/specs/2026-10-02-monster-learning-design.md`.

Note d'exécution : l'utilisateur a demandé d'avancer sans interruption. Le code est écrit inline ; le contenu
est délégué à des agents d'arrière-plan qui doivent faire passer les validateurs à 0 erreur.

---

## Structure des fichiers

```
src/
  profiles.js            index des profils, global (PIN, clé IA), migration v1, export/import
  store.js               (mod.) état du profil actif, units dynamiques, placement, skills, seen
  humor.js               mascotte + répliques + blague du jour
  engine/rng.js          PRNG seedable (mulberry32) + helpers
  engine/verbs.js        base de verbes + conjugate()
  engine/adjectives.js   comparatifs/superlatifs
  engine/generators.js   générateurs → questions (id stable, regen depuis l'id)
  engine/pool.js         stock d'un niveau/station + selectFresh() anti-répétition
  placement.js           algorithme adaptatif pur
  srs.js                 Leitner 5 boîtes
  writing/tokenize.js    phrases, mots, offsets
  writing/spell.js       dictionnaire (décodage prefix-coding) + suggestions
  writing/rules.js       règles de grammaire déclaratives
  writing/analyze.js     analyse complète d'un texte
  writing/score.js       note /20, critères, CEFR
  writing/ai.js          correction Claude optionnelle
  screens/who.js         « Qui joue ? » + création de profil
  screens/placement.js   test de placement
  screens/daily.js       entraînement du jour (SRS)
  screens/conjugator.js  conjugueur de référence
  screens/writing.js     atelier d'écriture
  screens/c2.js          prépa C2 + examen blanc
  screens/dashboard.js   compétences + certificats
content/
  level-XX.json (5 unités), extra-XX.json (5 unités), boss-XX.json, lexicon-XX.json,
  placement.json, writing.json, humor.json, c2.json, wordform.json
tools/
  validate.mjs (mod.), validate-extra.mjs (mod.), validate-v2.mjs (nouveaux formats), smoke.mjs (mod.)
tests/
  verbs.test.mjs, generators.test.mjs, pool.test.mjs, placement.test.mjs, srs.test.mjs,
  profiles.test.mjs, writing.test.mjs, fill.test.mjs
docs/CONTENT_FORMATS_V2.md  formats des nouveaux fichiers de contenu (pour les agents)
```

---

## Phase 0 — Formats de contenu et validateurs (prérequis des agents)

### Task 0.1: Formats V2 documentés
**Files:** Create `docs/CONTENT_FORMATS_V2.md`
- [ ] Décrire précisément : unité 5 (mêmes règles que CONTENT_GUIDE), `boss-XX.json`, `placement.json`,
  `lexicon-XX.json`, `writing.json`, `humor.json`, `c2.json`, `wordform.json`, avec exemples JSON complets,
  quantités, règles d'équité, et la liste des stations bonus.
- [ ] Règle « fill » : toutes les réponses acceptées d'un trou doivent avoir le même nombre de mots, contractions
  développées comprises (`isn't` ≡ `is not` toléré, le nombre affiché est celui de `answer[0]`).

### Task 0.2: Validateurs
**Files:** Modify `tools/validate.mjs`, `tools/validate-extra.mjs`; Create `tools/validate-v2.mjs`
- [ ] `validate.mjs` : accepter exactement 5 unités (avertissement si 4 pendant la transition), id `L.5`,
  avertir si les réponses d'un `fill` ont des nombres de mots différents (hors équivalence de contractions).
  Accepter les champs `lead` et `key` sur `fill`.
- [ ] `validate-extra.mjs` : 5 unités (4 tolérées en transition).
- [ ] `validate-v2.mjs <fichier…>` : détecte le format par nom de fichier et valide boss/placement/lexicon/
  writing/humor/c2/wordform (structure, quantités, doublons, index de réponse, `___` unique, pas de chiffres dans
  les textes lus par TTS).
- [ ] Commit.

## Phase 1 — Fondations

### Task 1.1: Contenu dynamique (4 ou 5 unités)
**Files:** Modify `src/store.js`, `src/screens/home.js`, `src/screens/profile.js`, `src/questions.js`
- [ ] Remplacer chaque « 4 » codé en dur par `lvl.units.length` (map `x/4`, `bossExam`, suivi zone).
- [ ] `content.js` : `resolveRef` gère aussi `boss<L>:<i>`, `lex<L>:<i>`, `place:<i>` (données injectées dans
  `window.__EXTRA__`), et délègue `gen:` à `engine/generators.js#regen`.

### Task 1.2: Profils (TDD)
**Files:** Create `src/profiles.js`, `tests/profiles.test.mjs`; Modify `src/store.js`, `src/main.js`
- Interface :
  ```js
  export const global;                       // { v:2, pin, aiKey, aiModel, activeId, profiles:[{id,name,avatar,age,createdAt}] }
  export function saveGlobal();
  export function listProfiles();            // global.profiles
  export function createProfile({ name, avatar, age }); // -> profile, devient actif, état neuf
  export function selectProfile(id);         // charge l'état du profil dans `state`
  export function deleteProfile(id);
  export function migrateV1(storage);        // v1 -> premier profil, retourne true si migré
  export function exportFamily();            // objet JSON { kind:"mission-bilingue-family", v:2, global(sans pin/aiKey), states }
  export function importFile(obj);           // profil seul ou famille
  ```
- Le stockage passe par un adaptateur `storage` (`get/set/remove`) injectable pour les tests.
- [ ] Tests : création → actif ; deux profils ont des états indépendants ; migration v1 crée un profil avec
  l'XP v1 et supprime la clé v1 ; suppression du profil actif → actif = premier restant ; export/import aller-retour.
- [ ] Implémenter, `node --test tests/profiles.test.mjs` PASS, commit.

### Task 1.3: Écran « Qui joue ? » et création
**Files:** Create `src/screens/who.js`; Modify `src/screens/home.js` (onboarding → création), `src/main.js`
- [ ] Création : prénom, 12 avatars SVG, âge (enfant/ado/adulte), puis proposition du test de placement
  (« Passer le test » / « Je débute de zéro »).
- [ ] `main.js` : 0 profil → création ; ≥ 2 profils ou aucun actif → « Qui joue ? » ; sinon carte.
- [ ] Puce joueur de la carte : changer de profil.

### Task 1.4: Zone gestion
**Files:** Modify `src/screens/profile.js`
- [ ] PIN global (migré depuis `settings.pin`), tableau de suivi de tous les profils, difficulté par profil,
  clé IA + modèle, suppression de profil, export/import fichier famille (Blob + `<a download>`, `<input type=file>`).

### Task 1.5: Trous à N cases (TDD)
**Files:** Create `src/fill.js`, `tests/fill.test.mjs`; Modify `src/questions.js`, `src/styles.css`
- Interface : `gapWords(expected) -> string[]` (mots de la réponse canonique), `joinBoxes(values) -> string`.
- [ ] Tests : `"has been"` → 2 ; `"didn't go"` → 2 ; `"goes"` → 1 ; joinBoxes trim/espaces.
- [ ] Rendu : N `input.gap-box` (taille ≈ longueur du mot, min 3), libellé « (N mots) », espace → case suivante,
  retour arrière sur case vide → précédente, Entrée valide. Supporte `lead` (phrase de départ) et `key` (mot-clé
  imposé, affiché en capitales) pour les transformations C2.
- [ ] `blankHtml` des récapitulatifs affiche aussi N traits.

### Task 1.6: Humour
**Files:** Create `src/humor.js`, `content/humor.json` (agent ou inline), mascotte SVG ; Modify `src/runner.js`,
`src/screens/home.js`, `src/screens/boss.js`, `src/screens/test.js`
- [ ] `quip(situation, { age })` ; `jokeOfTheDay(date)` ; mascotte dans le feedback (≈ 35 % des réponses, toujours
  sur combo ≥ 5 et temps écoulé), carte « Blague du jour » sur la carte, répliques de phase de boss.

## Phase 2 — Moteur de questions

### Task 2.1: PRNG + verbes + conjugueur (TDD)
**Files:** Create `src/engine/rng.js`, `src/engine/verbs.js`, `tests/verbs.test.mjs`
- Interface :
  ```js
  export const VERBS;  // [{ base, past, pp, fr, s?, ing?, ed?, irregular:boolean, frames?:{obj:[...]}}]
  export const TENSES; // ids : present_simple, present_continuous, past_simple, past_continuous, present_perfect,
                       // present_perfect_continuous, past_perfect, past_perfect_continuous, will, going_to,
                       // future_continuous, future_perfect, would, would_have
  export function forms(verb);    // { base, s, ing, past, pp }
  export function conjugate(verb, tense, subject, { neg=false, question=false, passive=false } = {}); // -> string
  export const SUBJECTS;          // I, you, he, she, it, we, they
  ```
- [ ] Tests : `forms("stop").ing === "stopping"`, `forms("visit").ed === "visited"`, `forms("try").s === "tries"`,
  `forms("watch").s === "watches"`, `forms("lie").ing === "lying"`, `forms("make").ing === "making"`;
  `conjugate(go, "past_simple", "she", {neg:true}) === "did not go"` ; `present_perfect` he → `has gone` ;
  `present_simple` question he → `does he go` ; `will` passive it build → `will be built` ;
  `past_continuous` they → `were going` ; `would_have` I → `would have gone` ; chaque verbe irrégulier a past/pp non vides.

### Task 2.2: Générateurs (TDD)
**Files:** Create `src/engine/adjectives.js`, `src/engine/generators.js`, `content/wordform.json`, `tests/generators.test.mjs`
- Interface :
  ```js
  export const GENERATORS; // [{ id, unit:"3.1", skill, make(rng) -> question, regen(params) -> question }]
  export function generate(genId, rng);      // question avec ref "gen:<genId>:<params>"
  export function regen(ref);                // reconstruit la question depuis sa ref (ou null)
  export function generatorsUpTo(uid);       // générateurs dont unit <= uid (ordre L puis U)
  export function generatorsOf(uid);         // générateurs introduits dans cette station
  ```
- Générateurs : nombres en lettres (1.2), heure (2.4), be (2.1), pluriels (2.2), have/has (2.3), présent -s (3.1),
  do/does négation/question (3.2), présent continu (4.1), passé régulier (5.1), formes irrégulières (5.2),
  passé négatif/question (5.3), passé continu (5.4), futur (6.1), comparatifs/superlatifs (6.2), present perfect (6.3),
  for/since (6.4), passif (8.2), past perfect (9.1), formation des mots (10.4, depuis `wordform.json`),
  conditionnels 2 et 3 (8.1, 10.1).
- [ ] Tests (propriété) : pour chaque générateur, 200 tirages avec graines différentes → question non nulle,
  `matches(expected, accept)` vrai, `regen(q.ref)` redonne la même réponse attendue, un `fill` contient `___` une fois.

### Task 2.3: Stock et anti-répétition (TDD)
**Files:** Create `src/engine/pool.js`, `tests/pool.test.mjs`
- Interface :
  ```js
  export function selectFresh(candidates, n, history, { maxOverlap = 0.2, rng }); // candidates:[{id,...}] -> sous-ensemble
  // history: { last: string[], count: {id:n} }
  export function recordSeen(history, ids);  // -> nouvelle history (last = ids)
  export function levelPool(L);              // candidats du boss
  export function unitPool(uid);             // candidats du test de station
  ```
- [ ] Tests : avec 100 candidats et n=25, recouvrement avec `last` ≤ 20 % ; les non-vus passent avant les vus ;
  si le stock est trop petit, on complète par les moins vus ; 10 essais successifs couvrent > 90 % du stock.

### Task 2.4: Boss en 3 phases + tests de station rafraîchis
**Files:** Modify `src/questions.js`, `src/screens/boss.js`, `src/store.js`
- [ ] `bossExam(L)` : 3 phases (reconnaissance → production → rage) tirées par `selectFresh` dans `levelPool(L)` ;
  `state.seen["boss"+L]` mis à jour. Réplique de phase (humor) quand la phase change.
- [ ] `unitTest(uid)` : idem avec `unitPool(uid)` (items + générateurs de la station), `state.seen["unit"+uid]`.

### Task 2.5: Banques boss (agents)
**Files:** `content/boss-01.json` … `boss-12.json` — 60 questions chacun, validés par `validate-v2.mjs`.

## Phase 3 — Test de placement

### Task 3.1: Algorithme (TDD)
**Files:** Create `src/placement.js`, `tests/placement.test.mjs`
- Interface : `createPlacement({ start = "A2", block = 4, max = 32 })` → `{ band(), record(ok), done, result() }` où
  `result()` = `{ band, line, asked, correct }`. Bandes `A1 A2 B1 B2 C1 C2`, lignes `1 3 5 7 10 12`.
- [ ] Tests : joueur parfait → C2 ; joueur nul → A1 en ≤ 8 questions ; joueur simulé « vrai niveau B1 »
  (p=0.9 sous B1, 0.75 en B1, 0.2 au-dessus) → B1 dans ≥ 80 % de 500 simulations ; jamais plus de 32 questions.

### Task 3.2: Banque + écran + application du résultat
**Files:** `content/placement.json` (agent), Create `src/screens/placement.js`; Modify `src/store.js`
- [ ] `applyPlacement(line)` : lignes < line marquées validées (`placed:true`), badges qui ignorent `placed`.
- [ ] Écran : intro, questions via `renderQuestion`, sans chrono sévère (temps ×1.5), résultat animé, choix de la
  ligne de départ (proposée ou inférieure).

## Phase 4 — Contenu A→Z

### Task 4.1: 12 stations bonus (agents) — `level-XX.json` unité 5 + `extra-XX.json` unité 5.
### Task 4.2: Conjugueur de référence — `src/screens/conjugator.js` (recherche, tableaux par temps, voix passive,
  négatif/interrogatif, écoute TTS, lien depuis la carte).
### Task 4.3: SRS (TDD) — `src/srs.js` : `addCards(ids)`, `answer(id, ok, today)`, `due(today, limit)` ; tests des
  intervalles 1/2/4/8/16 et du retour en boîte 1. `src/screens/daily.js` : 15 cartes (dues + 5 nouvelles du
  lexique du niveau courant + erreurs du carnet). Lexiques `lexicon-XX.json` (agents).

## Phase 5 — Atelier d'écriture

### Task 5.1: Dictionnaire au build — `build.mjs` lit `wordlist-english` (english/10..50 + american/canadian/british
  variantes), ajoute les mots du contenu, encode en prefix-coding, injecte `window.__DICT__`.
### Task 5.2: Correcteur (TDD) — `writing/*.js` ; `tests/writing.test.mjs` : corpus de 30 phrases fautives avec la
  règle attendue, 10 phrases correctes sans faux positif, note d'un texte A2 correct > note du même texte avec 10 fautes.
### Task 5.3: Sujets (`writing.json`, agent) + écran `screens/writing.js` + intégration missions écrites.
### Task 5.4: Option IA — `writing/ai.js` (Messages API, sortie JSON), réglage dans la zone gestion.

## Phase 6 — Prépa C2
### Task 6.1: `c2.json` (agents) ; Task 6.2: écran parties + examen blanc + score Cambridge Scale.

## Phase 7 — Tableau de bord, finitions
### Task 7.1: `skill` sur chaque question + `state.skills` ; Task 7.2: `screens/dashboard.js` (radar SVG,
  historique, certificats imprimables) ; Task 7.3: smoke Playwright (Edge) étendu ; Task 7.4: build, README,
  CONTENT_GUIDE mis à jour, commit final.
