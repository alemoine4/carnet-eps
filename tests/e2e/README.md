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

## Couverture

**`smoke.spec.mjs` — 8 parcours critiques**

1. Chargement sans erreur console + navigation des 13 routes.
2. Créer une classe + persistance après rechargement.
3. Import Pronote (collage CSV).
4. Faire l'appel (tap + « Terminer »).
5. Suppression d'élève + **annulation** (le « Annuler » restaure la cascade).
6. Export / import JSON sans perte (round-trip).
7. Onglet Suivi + EDT déplacé dans « Plus ».
8. Ajouter une observation + cascade à la suppression de l'élève.

**`regressions.spec.mjs` — 13 tests de non-régression** des correctifs de l'audit du 2026-09-05
(`docs/audit-2026-09-05.md`, un test par constat Bxx) : grille d'appel à 360 px, import JSON altéré
refusé avant écriture, appui long vs défilement, double tap, double clic « Créer la séance »
(sélecteur + accueil), compteur « saisis », contrastes clair/sombre, élève « parti », vue en erreur,
suppression de classe référencée, coefficient 0, pastille de statut masquée.

> Convention : tout correctif d'audit arrive avec son test ici ; les specs de vérification
> temporaires (préfixe `_`) sont supprimés avant commit.

## Non couvert ici (à vérifier à la main — cf. `docs/test-terrain.md`)

Installation PWA, **hors ligne** (le SW est inactif sur localhost, D008), **caméra**,
collage réel dans Pronote, **impression** A4, restauration depuis un fichier.

> Chaque test repart d'une base IndexedDB vide (vidée via `io.js` dans `beforeEach`).
