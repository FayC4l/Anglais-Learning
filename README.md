# Mission Bilingue

L'appli d'anglais de toute la famille : du premier « hello » jusqu'au niveau C2 et à la préparation du **Cambridge C2 Proficiency**. Explications en français, anglais canadien (les orthographes britannique et américaine sont acceptées).

## Ce qu'il y a dedans

- **Profils familiaux** : écran « Qui joue ? », un profil par personne (prénom, avatar, âge enfant / ado / adulte), progression séparée, sauvegarde par fichier ou par code.
- **Sauvegarde quotidienne** : rappel une fois par jour sur la carte (téléchargement en un clic) et, sur ordinateur avec Chrome ou Edge, fichier de sauvegarde mis à jour automatiquement (Profil → Sauvegarde automatique).
- **Test de placement adaptatif** (A1 → C2) : les questions montent ou descendent selon tes réponses, puis tu commences à la bonne ligne.
- **12 lignes, 60 stations, 12 boss** : leçon narrée, atelier de prononciation, mots, 9 mini-jeux, mission orale ou écrite, test de 15 questions.
- **3 vies par boss** : chaque défaite coûte une vie ; sans vie, toutes les stations du niveau sont « à refaire » et les 3 vies reviennent quand leurs tests sont réussis à nouveau.
- **Boss imprévisibles** : 3 phases (reconnaissance, production, rage), 60 questions réservées par boss, questions générées à l'infini et mémoire anti-répétition (un nouvel essai reprend au plus 20 % des questions du précédent).
- **Générateurs de questions** : conjugaison (≈ 250 verbes, tous les temps, passif), pluriels, comparatifs, nombres, heure, formation des mots, conditionnels…
- **Phrases à trous** : une case par mot attendu, avec le nombre de mots affiché.
- **Conjugueur** de référence et entraînement par verbe.
- **Entraînement du jour** : répétition espacée (5 boîtes) avec les mots étudiés, les erreurs du carnet et ≈ 1 800 mots de lexique par niveau.
- **Atelier d'écriture** : 96 sujets + 8 sujets C2, correcteur intégré (orthographe, ≈ 80 règles sur les fautes typiques des francophones, mots de liaison, temps verbaux, consignes) et **note sur 20** en 4 critères. Option : correction par Claude (clé API à saisir dans la zone gestion).
- **Prépa C2 Proficiency** : Reading & Use of English (parties 1 à 7), Listening, Writing, Speaking, examens blancs notés sur la Cambridge English Scale. Textes 100 % originaux.
- **Tableau de bord** : radar des compétences, niveau estimé, certificats imprimables.
- **Maurice l'orignal**, prof d'anglais vaniteux et bienveillant : répliques, blague du jour (118 jeux de mots expliqués).
- **Zone gestion** (code à 4 chiffres) : difficulté par profil, suivi de toute la famille, correcteur IA, sauvegarde familiale.

## Jouer

Ouvre `index.html` dans Chrome, Edge ou Safari (ou le site GitHub Pages du dépôt). Tout fonctionne hors ligne, sauf la correction par IA.

### Correction par IA (optionnelle)

Dans Profil → Zone gestion → « Correcteur IA », colle une clé API Anthropic (console.anthropic.com). La clé reste dans ce navigateur, n'est jamais incluse dans les sauvegardes, et chaque correction est facturée sur le compte de la clé. Modèle par défaut : Claude Opus 5.5.

## Développer

```bash
npm install
npm run validate     # vérifie tout le contenu (niveaux, prononciation, V2)
npm test             # tests unitaires (conjugueur, générateurs, placement, SRS, correcteur…)
npm run build        # régénère index.html (minifié ; --dev pour la version lisible)
npm run smoke        # tests navigateur (Playwright + Chrome/Edge installé)
```

## Contenu

| Fichier | Contenu | Règles |
|---|---|---|
| `content/level-XX.json` | 5 stations par niveau : leçons, mots, phrases, grammaire, lectures | `CONTENT_GUIDE.md` |
| `content/extra-XX.json` | prononciation et missions | `EXTRA_GUIDE.md` |
| `content/boss-XX.json` | 60 questions réservées au boss + répliques | `docs/CONTENT_FORMATS_V2.md` |
| `content/lexicon-XX.json` | 150 mots de plus par niveau (entraînement du jour) | idem |
| `content/placement.json` | 150 questions du test de placement | idem |
| `content/writing.json` | sujets de rédaction | idem |
| `content/humor.json` | répliques de Maurice et blagues | idem |
| `content/wordform.json` | formation des mots | idem |
| `content/c2-uoe.json`, `content/c2-papers.json` | épreuves C2 Proficiency | idem |

Code : `src/` (moteur vanilla JS, un seul HTML produit par esbuild). Le code pur (conjugueur, générateurs, anti-répétition, placement, SRS, correcteur) est dans `src/engine/`, `src/placement.js`, `src/srs.js` et `src/writing/`, et testé dans `tests/`.

Licences des données et bibliothèques tierces : `THIRD_PARTY.md`.
