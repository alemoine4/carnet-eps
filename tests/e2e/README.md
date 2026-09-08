# Smoke-tests (Playwright) — Carnet EPS

Tests de fumée des parcours critiques. **Outil de développement uniquement** : l'application
(`app/`) reste 100 % vanilla, sans dépendance runtime. Playwright n'est jamais déployé
(`gh-pages` ne publie que `app/`).

## Lancer

```bash
npm ci                           # une fois (versions exactes du package-lock.json — C20)
npx playwright install chromium  # une fois, DEPUIS VOTRE TERMINAL : lancé par l'assistant Claude, l'install ne remplit
                                 # que son conteneur MSIX ; « Executable doesn't exist » = relancer cette commande ici (C25)
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

**`regressions.spec.mjs` — 31 tests de non-régression** des correctifs de l'audit du 2026-09-05
(`docs/audit-2026-09-05.md` — 15 constats sur 34 ont leur test ici : B01–B08, B10, B14, B22, B23, B29, B30, B34, plus H01–H05 ;
B09, B13, B15–B21, B24, B26, B27, B32, B33 : corrigés sans test, vérifiés par relecture ; B12 et B31 : testés dans
`audit5-lot4.spec.mjs` et `audit5-lot3.spec.mjs`) : grille d'appel à 360 px, import JSON altéré
refusé avant écriture, appui long vs défilement, double tap, double clic « Créer la séance »
(sélecteur + accueil), compteur « saisis », contrastes clair/sombre, élève « parti », vue en erreur,
suppression de classe référencée, coefficient 0, pastille de statut masquée, la vision par
trimestre (D012 : bornes/réglage, tableau de la fiche, périodes rapides du récap, alerte),
l'atomicité des écritures groupées (B29 : restauration, suppression et import tout-ou-rien) et les
hypothèses Codex H01–H05 (purge en une transaction, export instantané, écriture qui rejette sur un
abandon tardif — mutant réel —, doublon d'identifiant refusé, **service-worker** qui ne nettoie que
ses caches). Depuis le lot 5 du 5e audit (v0.12.12) : garde « aucune requête hors de l'origine + CSP » sur les 13 routes (C33),
horloge fixée au 5 janvier 2027 (C26), appui long qui ouvre bien le menu (C28), thème « Sombre » choisi (C29), création d'une
évaluation à coefficient 0 par l'interface (C27), et quatre écrans jamais testés : EDT, Documents, import complet de
Sauvegarde, utilitaires CSV (C31).

**`audit5-lot1.spec.mjs` (43), `audit5-lot3.spec.mjs` (25), `audit5-lot4.spec.mjs` (11), `audit5-lot5.spec.mjs` (35)** — un test de non-régression par
constat *démontrable par le comportement* du 5e audit (`docs/audit-2026-09-07.md`, lots 1, 3, 4 et 5), chacun rouge avec le code
d'avant son lot ; les gestes de commentaire, de configuration et de documentation (C05, C39, C18, C20, C22, C23, C25, C58, C61…)
sont couverts par relecture ou par les gardes de cohérence de `audit5-lot5.spec.mjs` ;
les tests de `audit5-lot4` marqués « service-worker réel » se jouent sur `app.localhost`. Total de la suite : **153 tests**.

> **Tests du service-worker** (H05, lot 4) : ils naviguent sur `http://app.localhost:8160` (Chromium résout `*.localhost` en boucle locale = contexte
> sécurisé, mais pas « localhost » pour `estLocalhost()`, donc le SW s'enregistre ; repli `[::1]` puis `127.0.0.2`). Si aucune adresse
> de bouclage hors localhost ne répond, le test est **ignoré avec sa raison**, jamais un faux vert.

> Convention : tout correctif d'audit arrive avec son test ici ; les specs de vérification
> temporaires (préfixe `_`) sont supprimés avant commit.

## Non couvert ici (à vérifier à la main — cf. `docs/test-terrain.md`)

Installation PWA, **caméra**,
collage réel dans Pronote, **impression** A4, restauration d'une sauvegarde réelle avec pièces jointes (l'import complet d'un fichier est testé, C31). Le **hors ligne** est testé
avec le service-worker réel (`audit5-lot4.spec.mjs`, A40 : `context.setOffline` sur un hôte de bouclage hors
localhost — D008 reste vraie sur `localhost`).

> Chaque test repart d'une base IndexedDB vide (vidée via `io.js` dans `beforeEach`).
