# Mission Bilingue

Défi d'anglais pour apprendre de zéro jusqu'à un niveau avancé, pensé pour un jeune francophone d'Ottawa.

- 12 niveaux (A1 → C2), 48 étapes, 12 boss
- Chaque étape : leçon narrée par un coach (voix française + anglaise), atelier prononciation, mots, 9 mini-jeux + une mission orale/écrite, puis un test de 15 questions (80 % pour réussir)
- Carnet d'erreurs, révision mélangée, badges, séries de jours
- Zone « grand frère » protégée par un code : difficulté, suivi détaillé, déblocage
- Progression enregistrée dans le navigateur (code de sauvegarde dans le profil)

## Jouer

Ouvre `index.html` dans Chrome, Edge ou Safari, ou le site GitHub Pages du dépôt.

## Modifier le contenu

Le contenu est dans `content/level-XX.json` (leçons, mots, phrases, grammaire, lectures) et `content/extra-XX.json` (prononciation et missions). Règles d'écriture : `CONTENT_GUIDE.md` et `EXTRA_GUIDE.md`.

```bash
npm install
node tools/validate.mjs          # vérifie les leçons
node tools/validate-extra.mjs    # vérifie la prononciation et les missions
node build.mjs                   # régénère index.html
node tools/smoke.mjs dist/mission-bilingue-standalone.html   # test navigateur (Playwright)
```
