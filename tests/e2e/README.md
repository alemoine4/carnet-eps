# Smoke-tests (Playwright) — Carnet EPS

Tests de fumée des parcours critiques. **Outil de développement uniquement** : l'application
(`app/`) reste 100 % vanilla, sans dépendance runtime. Playwright n'est jamais déployé
(`gh-pages` ne publie que `app/`).

## Lancer

```bash
npm install                      # une fois
npx playwright install chromium  # une fois (télécharge le navigateur de test)
npm test                         # lance la suite
npm run test:ui                  # mode interactif
```

Le serveur de dev (`server-carnet.mjs`, port 8160) est lancé automatiquement ; s'il tourne
déjà, il est réutilisé.

## Couverture (6 parcours)

1. Chargement sans erreur console + navigation des 12 routes.
2. Créer une classe + persistance après rechargement.
3. Import Pronote (collage CSV).
4. Faire l'appel (tap + « Terminer »).
5. Suppression d'élève + **annulation** (le « Annuler » restaure la cascade).
6. Export / import JSON sans perte (round-trip).

## Non couvert ici (à vérifier à la main — cf. `docs/test-terrain.md`)

Installation PWA, **hors ligne** (le SW est inactif sur localhost, D008), **caméra**,
collage réel dans Pronote, **impression** A4, restauration depuis un fichier.

> Chaque test repart d'une base IndexedDB vide (vidée via `io.js` dans `beforeEach`).
