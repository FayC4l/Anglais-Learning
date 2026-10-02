# Mission Bilingue « Monster » — design

Date : 2026-10-02 · Branche : `monster-learning`

## 1. But

Transformer Mission Bilingue (12 niveaux A1→C2, 48 stations, mini-jeux, boss) en application
complète d'apprentissage de l'anglais **pour toute la famille** (enfants, ados, adultes), qui
mène jusqu'à la réussite d'une **certification C2 (Cambridge C2 Proficiency)**.

Décisions validées par l'utilisateur :
- Examen visé : certification C2 uniquement (format Cambridge C2 Proficiency, textes originaux).
- Contenu : on **garde la version canadienne** (anglais canadien, toutes variantes d'orthographe acceptées).
- Correction des rédactions : **algorithme intégré + IA Claude optionnelle** (clé API saisie dans la zone gestion).
- Public : tous âges ; le ton et les sujets de rédaction s'adaptent à la tranche d'âge du profil.
- Approche des questions : banques écrites à la main + générateurs procéduraux + mémoire anti-répétition par profil.

## 2. Contraintes techniques (inchangées)

- JavaScript vanilla (modules ES), bundle esbuild, **un seul fichier HTML** (`index.html`) publiable
  sur GitHub Pages. Le contenu JSON est injecté au build (`window.__CONTENT__`).
- Aucune dépendance runtime. Dépendances de build autorisées (esbuild, playwright-core, liste de mots).
- Stockage : `localStorage`, encapsulé en try/catch (l'app doit tourner sans stockage).
- Fonctionne hors ligne, sauf l'option IA.
- Taille cible du HTML final : < 4 Mo.

## 3. Architecture

### 3.1 Nouveaux modules (src/)

| Module | Rôle |
|---|---|
| `profiles.js` | Index des profils, création/suppression/sélection, migration v1, export/import fichier. |
| `store.js` (modifié) | État du **profil actif** (clé `mission-bilingue:p:<id>`), réglages globaux séparés. |
| `humor.js` | Mascotte (Maurice l'orignal), répliques par situation, blague du jour, sélection selon l'âge. |
| `engine/verbs.js` | Base de verbes (≈250, tous les irréguliers courants) + conjugueur tous temps/voix. |
| `engine/generators.js` | Générateurs procéduraux de questions (conjugaison, pluriels, comparatifs, irréguliers, formation des mots, nombres/heure, transformations). Chaque générateur a un niveau minimum. |
| `engine/pool.js` | Construit le stock de questions d'un niveau (items de station + banque boss + générateurs), sélection anti-répétition. |
| `engine/seen.js` | Mémoire par profil des questions vues (id stable + date), politique de recouvrement ≤ 20 %. |
| `placement.js` + `screens/placement.js` | Test de placement adaptatif. |
| `srs.js` + `screens/daily.js` | Répétition espacée (Leitner 5 boîtes) : mots, conjugaisons, erreurs. |
| `screens/conjugator.js` | Conjugueur de référence consultable. |
| `writing/` (`tokenize.js`, `spell.js`, `rules.js`, `analyze.js`, `score.js`, `ai.js`) | Correcteur de rédaction. |
| `screens/writing.js` | Atelier d'écriture : sujet, éditeur, rapport annoté, historique. |
| `screens/c2.js` + `c2/*.js` | Prépa C2 Proficiency : parties d'épreuve et examen blanc. |
| `screens/dashboard.js` | Tableau de bord compétences + certificats imprimables. |

### 3.2 Nouveaux fichiers de contenu (content/)

- `level-XX.json` : chaque niveau passe de 4 à **5 unités** (station bonus `X.5`).
- `extra-XX.json` : `pron` + `mission` pour la station 5.
- `boss-XX.json` : **60 questions réservées au boss** par niveau (mcq/fill/error/transform), jamais utilisées ailleurs.
- `placement.json` : ≈ 150 questions calibrées (≈ 25 par bande CEFR A1…C2), types mcq/fill/reading/listening.
- `lexicon-XX.json` : ≈ 150 mots supplémentaires par niveau (en, fr, ex, thème) pour la SRS et les distracteurs.
- `writing.json` : sujets de rédaction par niveau, variantes par tranche d'âge, éléments de consigne vérifiables.
- `humor.json` : répliques de la mascotte, blagues/jeux de mots (EN + explication FR), répliques de boss par phase.
- `c2.json` : épreuves C2 originales (Use of English parts 1-4, Reading parts 5-7, Listening, Writing, Speaking).
- Données générées au build : dictionnaire d'orthographe compressé (`dict` injecté, issu de SCOWL via le paquet npm `wordlist-english`, taille ≤ 60 000 mots, + tous les mots du contenu).

## 4. Fonctionnalités

### 4.1 Profils familiaux
- Écran « Qui joue ? » au lancement si ≥ 1 profil ; création : prénom, avatar (12 avatars SVG), tranche d'âge
  (`enfant` < 13, `ado` 13-17, `adulte`).
- Chaque profil a son état complet (progression, XP, carnet, SRS, rédactions, réglages de voix).
- Réglages globaux (code PIN de gestion, clé API IA, modèle IA) stockés à part : `mission-bilingue:global`.
- **Migration** : si la clé v1 `mission-bilingue:v1` existe, elle devient le premier profil (âge `ado`) puis est supprimée.
- Export/import : code `MB2.` (compatible lecture `MB1.`) et fichier `.json` (un profil ou toute la famille).
- « Zone grand frère » → **« Zone gestion »** : PIN global, difficulté par profil, tableau de suivi de tous les
  profils, déblocage, suppression de profil, clé IA.

### 4.2 Phrases à trous : nombre de mots visible
- Pour `fill` (et tout générateur de même type) : le trou `___` est rendu par **N cases** (N = nombre de mots de
  `answer[0]`), largeur proportionnelle à la longueur du mot, plus le libellé « (N mots) ».
- Espace dans une case → passe à la suivante ; Retour arrière sur case vide → case précédente.
- Vérification : les cases sont jointes par des espaces, puis `matches()` (contractions toujours acceptées).
- Le validateur signale toute réponse acceptée dont le nombre de mots diffère (après expansion des contractions).

### 4.3 Humour
- Mascotte Maurice l'orignal : bulle dans les feedbacks, accueil, résultats.
- `humor.json` : ≥ 150 répliques par situation (`correct`, `wrong`, `streak`, `timeout`, `comeback`, `perfect`,
  `fail_test`, `welcome`, `boss_phase`), ≥ 60 blagues/jeux de mots anglais avec explication française.
- Tout est familial ; champ `ages` facultatif pour réserver un trait d'humour à une tranche d'âge.

### 4.4 Boss aléatoires
- Stock du niveau L = items des 5 stations de L + `boss-L.json` + générateurs avec `minLevel ≤ L`
  + quelques révisions des niveaux L-1, L-2.
- Chaque question a un **id stable** (`3.2:g5`, `boss3:17`, `gen:conj:go:past_simple:she:neg`).
- Sélection : on évite les ids vus lors des essais précédents de ce boss ; au plus 20 % de recouvrement avec
  l'essai précédent ; choix des QCM mélangés ; les générateurs varient sujets/verbes.
- Combat en 3 phases (questions de reconnaissance → production → « rage » : transformations/dictées), une réplique
  du boss à chaque changement de phase.

### 4.5 Test de placement adaptatif
- Proposé à la création du profil (ou « Je débute de zéro » → niveau 1 direct). Repassable depuis le profil.
- Algorithme en escalier sur 6 bandes (A1…C2) : départ en A2 (ou choix « J'ai déjà fait de l'anglais au lycée » → B1).
  Blocs de 4 questions par bande ; ≥ 3/4 → bande supérieure ; ≤ 1/4 → bande inférieure ; 2/4 → un bloc de confirmation.
  Arrêt quand une bande est réussie et la suivante échouée (ou au plus 32 questions).
- Résultat : bande CEFR → ligne de départ (A1→1, A2→3, B1→5, B2→7, C1→10, C2→12). Les lignes précédentes sont
  marquées « validées par le test » (accessibles, sans étoiles).

### 4.6 Contenu de A à Z
- **12 stations bonus** (une par niveau) :
  1.5 L'alphabet et les articles (épeler, a/an/the) · 2.5 Les possessifs (my/mine, 's, whose) ·
  3.5 Les quantités (all/every/each, much/many, few/little de base) · 4.5 Comment ? (adverbes de manière, too/enough/very) ·
  5.5 Used to et would · 6.5 Question tags et so/neither do I · 7.5 Le futur avancé (future continuous/perfect) ·
  8.5 Have something done et pronoms réfléchis · 9.5 Questions indirectes et propositions participiales ·
  10.5 Articles et quantificateurs avancés · 11.5 L'anglais académique (hedging, nominalisation, impersonnel) ·
  12.5 Cohésion de haut vol (ellipse, substitution, collocations C2).
- **Conjugueur** : recherche d'un verbe, tableau de tous les temps (actif/passif, affirmatif/négatif/interrogatif).
- **Lexique + SRS** : `lexicon-XX.json` ; « Entraînement du jour » = cartes dues (mots, conjugaisons, erreurs du
  carnet), 5 boîtes (intervalles 1, 2, 4, 8, 16 jours).

### 4.7 Atelier d'écriture
- Sujets par niveau (≥ 8 par niveau, variantes `enfant/ado/adulte` quand pertinent). Un sujet définit : consigne FR,
  type (description, e-mail, histoire, essai, article, lettre, rapport, critique, proposition), fourchette de mots,
  éléments vérifiables (`require`: temps verbaux, connecteurs, mots-clés, paragraphes), modèle de réponse.
- **Correcteur algorithmique** :
  - découpage phrases/mots ;
  - orthographe : dictionnaire + formes fléchies + noms propres capitalisés ; suggestions par distance d'édition ;
  - ≥ 80 règles (`rules.js`, données déclaratives : motif sur tokens/regex, message FR, correction proposée,
    catégorie, niveau minimum) visant les fautes de francophones ;
  - mécanique : majuscules, ponctuation finale, i minuscule, mots répétés ;
  - analyse : nombre de mots, longueur moyenne des phrases et variété, diversité lexicale (MATTR), connecteurs,
    temps détectés, niveau du vocabulaire (via lexique CEFR), paragraphes ;
  - respect de la consigne via `require`.
- **Note /20** = 4 critères /5 (Contenu, Efficacité communicative, Organisation, Langue), barème dépendant du niveau
  visé ; estimation CEFR du texte. Rapport : texte annoté (soulignés colorés, explication au clic), points forts,
  priorités, commentaire humoristique de la mascotte, modèle. Réécriture/resoumission avec suivi du progrès.
- **Option IA** : si une clé est enregistrée, bouton « Correction IA » : appel direct navigateur à l'API Anthropic
  (`anthropic-dangerous-direct-browser-access`), réponse JSON (notes par critère, erreurs avec citations, version
  corrigée, commentaires FR). En cas d'échec réseau/clé : message clair, le rapport algorithmique reste affiché.

### 4.8 Prépa C2 Proficiency
- Accessible à tout moment (recommandée à partir du niveau 10, avertissement sinon).
- Entraînement par partie : Use of English P1 (QCM à trous), P2 (cloze ouvert), P3 (formation des mots — en partie
  générée), P4 (transformations avec mot-clé, 3-8 mots), Reading P5 (QCM), P6 (texte à paragraphes manquants),
  P7 (appariements) ; Listening (textes lus par TTS : QCM) ; Writing P1 (essai 240-280 mots résumant/évaluant deux
  textes) et P2 (article/lettre/rapport/critique 280-320 mots) via l'atelier d'écriture ; Speaking (sujets, micro,
  transcription, auto-évaluation).
- **Examen blanc** chronométré (version raccourcie et version complète) ; score estimé sur la Cambridge English Scale
  (C2 grade A 220-230, B 213-219, C 200-212, niveau C1 180-199).
- Tous les textes sont **originaux**.

### 4.9 Tableau de bord
- Radar des compétences (vocabulaire, grammaire, conjugaison, écoute, lecture, écriture, oral) calculé à partir des
  réponses taguées par compétence ; niveau CEFR estimé ; historique des notes de rédaction et des tests.
- Certificat de niveau imprimable (par CEFR atteint) avec le nom du profil.

## 5. Gestion des erreurs
- Stockage indisponible : jeu sans sauvegarde + bandeau d'avertissement.
- Contenu manquant (fichier absent) : la fonctionnalité correspondante est masquée, pas d'écran cassé.
- Appel IA : délai 60 s, erreurs 401/429/réseau traduites en français.
- Import de sauvegarde invalide : message, aucune donnée écrasée.

## 6. Tests
- `node --test tests/` : conjugueur, générateurs (chaque question générée a une réponse acceptée par `matches`),
  sélection anti-répétition, placement (simulations de joueurs à niveau connu), correcteur (corpus de textes avec
  fautes attendues), migration des profils, rendu du nombre de mots.
- Validateurs de contenu étendus (`validate.mjs`, `validate-extra.mjs`, nouveaux `validate-*.mjs`) : 0 erreur exigée.
- `tools/smoke.mjs` étendu : profils, placement, boss, écriture, C2, sur le HTML standalone (Playwright).

## 7. Phases de livraison
1. Fondations : profils + migration + zone gestion, cases par mot, humour.
2. Moteur : conjugueur, générateurs, pool + anti-répétition, boss en 3 phases, banques boss.
3. Test de placement.
4. Contenu A→Z : stations bonus, conjugueur de référence, lexique + SRS.
5. Atelier d'écriture + correcteur + option IA.
6. Prépa C2 + examens blancs.
7. Tableau de bord, certificats, tests de bout en bout, build, README.
