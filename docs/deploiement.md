# Déploiement & retour arrière — Carnet EPS

> Comment l'app est mise en ligne, l'historique des versions, et **comment revenir à une version antérieure** si besoin.
> Dépôt : https://github.com/alemoine4/carnet-eps · App en ligne : https://alemoine4.github.io/carnet-eps/ (v0.12, vraies données) · Origine d'essai : https://carnet-eps.github.io/ (v0.13, données fictives)

> 🔴 **Toute commande qui pousse vers `origin gh-pages`** — déploiement comme retour arrière, dans tout ce document — **ne se lance que depuis `main` ou `demenagement` (ligne v0.12), jamais depuis `grilles-schema3`.** Elle publierait le schéma 3 sur l'ancienne adresse, où vivent les vraies données : leur base passerait en schéma 3 **sans retour possible**, sous un bandeau « version d'essai ». La v0.13 a ses propres commandes (section « Période à deux adresses »). Avant toute poussée : `git branch --show-current`.

## Comment déployer une nouvelle version

0. **Lancer les smoke-tests** : `npm test` (doivent être verts — voir `tests/e2e/README.md`).
1. Incrémenter **les deux** numéros de version (rester synchronisés) :
   - `app/service-worker.js` → `const VERSION`
   - `app/js/state.js` → `VERSION_APP`
   (Le changement de `VERSION` invalide le cache : les installs existantes voient le toast « Nouvelle version installée ».)
2. Mettre à jour le suivi : `CHANGELOG.md`, `docs/journal.md` (+ `TODO.md`/`docs/roadmap.md` si pertinent).
3. Commiter, puis :
   ```bash
   git push origin main
   git subtree push --prefix app origin gh-pages   # gh-pages = contenu de app/ = ce qui est servi
   ```
4. Poser un **tag** sur le commit déployé (pour pouvoir y revenir) :
   ```bash
   git tag -a v0.12.X <commit> -m "v0.12.X — résumé"
   git push origin v0.12.X
   ```
5. Ajouter la ligne au tableau ci-dessous (version → tag → commit).

> ⚠ La branche **`gh-pages`** contient uniquement le dossier `app/` (pas `docs/`, donc ni les avis ni les rapports d'audit). C'est elle qui est publiée. `app/.nojekyll` (fichier vide, poussé avec le subtree) désactive le traitement Jekyll de GitHub Pages : sans lui, un fichier ou dossier commençant par `_` disparaîtrait du site en silence (audit 2026-09-07, A42).

## Période à deux adresses (depuis le 2026-09-15) — publier la branche `grilles-schema3`

La v0.13 se publie sur l'**origine dédiée** https://carnet-eps.github.io/ (dépôt `carnet-EPS/carnet-eps.github.io`, site d'organisation servi à la racine, branche `main`) :

0. Suite verte (`npm test`), versions synchronisées (`service-worker.js` + `state.js`), suivi à jour, commit sur `grilles-schema3`.
1. Publier le seul dossier `app/` (Git Bash ; la vérification du SHA empêche qu'un découpage en échec ne transforme la poussée en **suppression** de `main`) :
   ```bash
   sha=$(git subtree split --prefix app grilles-schema3) && test -n "$sha" && git push https://github.com/carnet-EPS/carnet-eps.github.io.git "$sha":refs/heads/main
   git push origin grilles-schema3
   ```
2. Poser et pousser le tag sur le commit de `grilles-schema3`, compléter la ligne du tableau.
3. Vérifier en ligne : `curl -s https://carnet-eps.github.io/service-worker.js | grep "const VERSION"`.

**Retour arrière sur l'origine d'essai** : `git revert <commit>` sur `grilles-schema3`, suite verte, puis l'étape 1 ci-dessus. Jamais de retour vers une v0.12 sur cette origine : une base ouverte en schéma 3 ne s'ouvre plus en v0.12 (voir plus bas).

**Mise en service de la nouvelle adresse** (après l'essai téléphone, AVANT tout import de vraies données) :

1. Sur `grilles-schema3` : `MODE_ESSAI = false` dans `app/js/state.js` **et** `name` / `short_name` remis à « Carnet EPS » dans `app/manifest.webmanifest` (une garde de `tests/e2e/audit-independant.spec.mjs` refuse l'un sans l'autre) ; bump de version ; publier comme ci-dessus.
2. Sur la branche `demenagement` (ligne v0.12) :
   ```bash
   git checkout demenagement
   # renseigner NOUVELLE_ADRESSE = 'https://carnet-eps.github.io/' dans app/js/demenagement.js
   npm test                                         # le spec du bandeau fixe lui-même l'adresse qu'il teste
   git commit -am "v0.12.22 : bandeau « Carnet EPS a déménagé »"
   git push origin demenagement
   git subtree push --prefix app origin gh-pages    # ancienne adresse
   git tag -a v0.12.22 -m "v0.12.22 — bandeau de déménagement" && git push origin v0.12.22
   ```
   Le bandeau « a déménagé » invite à exporter puis importer sur la nouvelle adresse.
3. Seulement ensuite, sur chaque appareil : sauvegarde complète depuis l'ancienne adresse, import sur la nouvelle.

## Historique des versions (tag → commit `main`)

| Version | Tag | Commit main | Résumé |
|---|---|---|---|
| v0.13.2 | `v0.13.2` | `cfcb0ee` (branche `grilles-schema3`) | **Retours de l’essai téléphone** : statuts d’appel distinguables (retard en pastille jaune vif, oubli de tenue en magenta, dispense en indigo ; écart perceptuel ≥ 34 entre les statuts les plus lus, ≥ 18 sur la palette, contrastes conservés), même pastille dans la fiche élève, palette propre aux couleurs de niveau des grilles, écran des grilles aéré ; 6 tests, 7 mutants tués, suite 279 — **publiée le 2026-09-16 sur l’origine d’essai** (commit du site `1c400ff`) ; l’ancienne adresse reste en v0.12.20 |
| v0.13.1 | `v0.13.1` | `e65b300` (branche `grilles-schema3`) | **Premier lot de l’audit indépendant du 2026-09-16**, publié **uniquement sur l’origine d’essai** https://carnet-eps.github.io/ : bandeau, titre et nom court « version d’essai » pilotés par `MODE_ESSAI` (FON-01) ; saisie par grille sérialisée dans une file partagée, plus aucun tap perdu, chaque tap jugé sur l’état voulu (même geste = même résultat), retour immédiat de la ligne, mise à jour sur place en fin de rafale, écriture en cours signalée sans verrouillage, erreur nommée avec sa cause, règle d’effacement affichée pour toutes les grilles (FON-05, PER-05) ; marge de focus qui suit la hauteur de l’en-tête, bandeau court et lisible en entier ; style `:disabled` global ; CI : jeton déclaré en lecture et actions épinglées par SHA de commit (SEC-04, défense en profondeur) ; procédures de publication et de retour arrière de l’origine d’essai ; fiche `docs/essai-telephone.md` ; trois revues adversariales (18/19, 17/20 puis 5/6 constats retenus, corrigés) ; 22 tests, 25 mutants tués, suite 273 — **publiée le 2026-09-16 sur l’origine d’essai** (commit du site `f1ee418`) ; l’ancienne adresse reste en v0.12.20 |
| v0.13.0 | `v0.13.0` | `7836ece` (branche `grilles-schema3`) | **Grilles d’évaluation EPS**, reprises de la copie de travail de Codex et fusionnées sur la v0.12.20 ; **schéma 3** (store `grilles`) ; validation des sauvegardes stricte sur les grilles et tolérante envers l’historique ; 35 tests, suite 251 ; signalement des notes de grille partielles à la copie ; choix convertir / garder / annuler au changement de barème (V3-B3) — **publiée le 2026-09-15 sur l’origine dédiée https://carnet-eps.github.io/** (dépôt `carnet-EPS/carnet-eps.github.io`, commit du site `513827c`), pour un essai avec des données fictives ; l’ancienne adresse reste en v0.12.20, schéma 2 : attend une sauvegarde complète sur chaque appareil |
| v0.12.20 | `v0.12.20` | `d68d56d` | **Les quatre derniers constats de l’audit Codex V3**, repris de la copie de travail de Codex sans ses grilles ni son schéma 3 (version réversible). V3-02 : écritures de notes sérialisées, sorties Pronote qui relisent la base, case en erreur qui bloque la copie même après le succès d’une autre note. V3-03 : « à remettre à jour » posé dans la transaction de la note. Concurrence entre onglets : note attendue comparée à la base, barème relu dans la transaction. V3-04 : accueil à paramètre servi du cache. V3-05 : limite de 200 Mo commune à l’export et à l’import. Écart volontaire : tolérance aux notes anciennes ; 17 tests, suite 216 — déployée le 2026-09-15 (gh-pages `ba129f0`) |
| v0.12.19 | `v0.12.19` | `853ff41` | Constat **V5-01** de l’audit Codex V5 : sans colonne d’identité sûre, deux colonnes douteuses (« Nom contact », « Nom Resp. », « Nom RL1 ») étaient retenues **ensemble** et créaient un élève sous l’identité du contact. La détection tient désormais en **une seule règle** — une identité n’est proposée que sur un en-tête propre — qui absorbe les deux arbitrages de la v0.12.18 ; pluriels « Prénoms » / « Prénom(s) » reconnus ; 5 tests, suite 199 — déployée le 2026-09-09 (gh-pages `0dd3069`) |
| v0.12.18 | `v0.12.18` | `b1f6f9a` | Constat **V4-01** de l’audit Codex V4 : deux colonnes « du responsable » désarmaient la colonne unique « Élèves » et l’élève entrait sous l’identité de son parent. La détection lit désormais des **mots** et retient le signal le plus **propre** — ce qui couvre « Resp. », « RL1 » et « contact d’urgence de l’élève », qu’aucune liste n’aurait prévus ; « Nom de l’élève;Prénom de l’élève » n’importait personne ; garde de cohérence des versions ; 7 tests, suite 194 — déployée le 2026-09-09 (gh-pages `01afdc7`) |
| v0.12.17 | `v0.12.17` | `de30f64` | Un découpage nom/prénom **deviné** (colonne unique sans majuscule pour trancher, « de La Fontaine Apolline » → nom « de ») ne passe plus en silence : montré en tête de l’aperçu et compté dans le bilan comme les homonymes ; dernier constat survivant de la revue de la v0.12.16 ; 13 tests, suite 187 — déployée le 2026-09-09 (gh-pages `9fb8bd8`) |
| v0.12.16 | `v0.12.16` | `de0741f` | **Premier test de terrain sur Android** : import de l’export Pronote réel (nom et prénom dans une seule colonne, colonne de classe vide) et « Terminer l’appel » dans une barre collante, atteignable à 28 élèves ; la revue adversariale a ajouté 8 correctifs, dont la destination qui se choisissait toute seule sur la première classe de la liste et une colonne « Nom du responsable » qui importait l’identité du tuteur ; 12 tests, suite 186 — déployée le 2026-09-09 (gh-pages `9e8795f`) |
| v0.12.15 | `v0.12.15` | `92f6fa4` | Lot V3-A de l’audit Codex V3 : un champ dont l’écriture est refusée n’est plus persisté ensuite par un champ voisin (5 modules, ~20 champs, écritures sérialisées) ; couleur de classe, cases de restriction et boutons d’archivage équipés d’un message ; 9 tests dont une garde de classe, suite 174 — déployée le 2026-09-09 (gh-pages `ddf77ae`) |
| v0.12.14 | `v0.12.14` | `97c4278` | Démarrage hors ligne instantané (A39 : navigation servie depuis le cache + revalidation), barème modifiable (C15), année sur les dates hors année scolaire (C45), plafond d’import 200 Mo (A33), poids des pièces (D-08), ménages (A34, A31), projet de tests mobile (C60) ; 165 tests + 24 rejoués sur profil tactile — déployée le 2026-09-09 (gh-pages `21679d5`) |
| v0.12.13 | `v0.12.13` | `4b698a8` | Lot 2 du 5e audit : créations atomiques (inaptitude avec pièce, remplacement de pièce, document, photo, import CSV — chacune en UNE transaction) + intégration continue GitHub Actions ; 5 tests, suite 158/158 — déployée le 2026-09-09 (gh-pages `3e04344`) |
| v0.12.12 | `v0.12.12` | `fb23028` | Lot 5 du 5e audit (63 constats : CSV robuste — UTF-16, UTF-8 strict, champ multi-ligne refusé —, import plus parlant, « Terminer l’appel » en une transaction, pastille 🩺 partout, impressions datées, CSP durcie, refus du cadrage, preuves des tests renforcées, docs alignées) + revue adversariale (7 corrections, 8 preuves) ; 35 tests, suite 153/153 — déployée le 2026-09-08 (gh-pages `d739ead`) |
| v0.12.11 | `v0.12.11` | `82939d6` | Lot 4 du 5e audit (17 constats : service-worker durci à stratégie constante, lectures d’appels par index en une transaction, plafond 8 Mo des pièces, PDF sans recopie, PWA) + revue adversariale en deux passes (6 corrections, 5 tests réécrits) ; 11 tests, suite 112/112 — déployée le 2026-09-08 (gh-pages `86dae78`) |
| v0.12.10 | `v0.12.10` | `5bfdf3f` | Lot 3 du 5e audit (35 constats : focus et lecteur d’écran, vrais tableaux, notifications, 320 px, contraste, impression, clavier virtuel Android) + 12 défauts de la revue adversariale ; 25 tests, suite 101/101 — déployée le 2026-09-07 |
| v0.12.9 | `v0.12.9` | `769528e` | Lot 1 du 5e audit (44 constats : exactitude de l’appel et du pré-remplissage — D013 —, seuil ⚠ borné à l’année scolaire partout, validations, erreurs visibles, import plus strict) + 19 constats de la revue adversariale du diff ; 43 tests de non-régression, suite 76/76 — déployée le 2026-09-07 |
| v0.12.8 | `v0.12.8` | `8ca9d47` | Hypothèses Codex H01–H05 : écritures qui attendent la validation de la transaction, service-worker qui ne nettoie que ses caches (voisinage GitHub Pages), purge en une transaction, export instantané, doublons refusés à l’import — déployée le 2026-09-06 |
| v0.12.7 | `v0.12.7` | `a4e8eb0` | Cascades et annulations atomiques (avis B29) : une transaction multi-stores pour les suppressions en cascade, les « Annuler » et l’import JSON ; suppression 76 → 27 ms — déployée le 2026-09-06 |
| v0.12.6 | `v0.12.6` | `727d389` | Vision par trimestre (D012, audit B30) : fins de T1/T2 réglables, tableau T1/T2/T3/Année sur la fiche, périodes rapides sur le récap, détail du trimestre dans les alertes — déployée le 2026-09-06 |
| v0.12.5 | `v0.12.5` | `f7093fa` | Dédoublonnage des helpers (audit B27, avis validé) : `metier.js`/`ui.js` exportent tris, normalisation, formats, `champ()` — refactor sans changement fonctionnel, tests 21/21 inchangés — déployée le 2026-09-06 |
| v0.12.4 | `v0.12.4` | `28732ad` | 4e audit (34 constats, 30 correctifs) : grille d'appel 2 colonnes à 360 px, import JSON altéré refusé avant écriture, élève « parti », contrastes du thème sombre, appui long vs défilement, double tap/double clic, 13 tests de non-régression — déployée le 2026-09-06 (gh-pages `0391552`) |
| v0.12.3 | `v0.12.3` | `633c2da` | Finitions post-audit : toast persistant épargné par l'éviction, lien document auto-préfixé https://, README/roadmap/smoke-tests à jour |
| v0.12.2 | `v0.12.2` | `1be32fc` | Arbitrage audit A12/A13/A14 (D011) : toasts empilés, « publiée » sur preuve de copie + marquage manuel, pré-remplissage inapte limité au jour même |
| v0.12.1 | `v0.12.1` | `13c81ff` | Corrections de l'audit 2026-07-10 (A1→A11, A15, A16) : résumé sauvegarde complet, erreurs photo visibles, dates locales, garde-fous EDT/accueil |
| v0.12.0 | `v0.12.0` | `6650338` | Observations (notes terrain) : store IndexedDB v2 (migration additive) + timeline fiche élève |
| v0.11.0 | `v0.11.0` | `9794150` | Onglet « Suivi » (alertes EPS + inaptitudes) à la place d'EDT (→ menu Plus) |
| v0.10.1 | `v0.10.1` | `8e264fb` | Annulation des suppressions (phase 2) : toast « Supprimé — Annuler » (8 s, restaure la cascade) |
| v0.10.0 | `v0.10.0` | `e7a1fcd` | Suppressions sécurisées (phase 1) : `confirm()` natifs → `<dialog>` avec détail des cascades |
| v0.9.9 | `v0.9.9` | `82a73b5` | Alignement audit : aide appel scindée, typo, nav 0,68rem (320px OK), CSP complétée |
| v0.9.8 | `v0.9.8` | `e175de0` | Corrections d'audit : a11y (aria-live, titre de zone, reduced-motion), typo, CSP |
| v0.9.7 | `v0.9.7` | `8e738d5` | Supprime le liseré de focus bleu au chargement (zone de contenu) |
| v0.9.6 | `v0.9.6` | `7fba367` | Largeur PC : appel/récap/relevé en pleine largeur, grille d'appel auto-colonnes |
| v0.9.5 | `v0.9.5` | `8891834` | Bouton retour « ← Plus » → « ← Retour » |
| v0.9.4 | `v0.9.4` | `2d6ca9b` | Retrait des badges « prêt » (écran Plus) |
| v0.9.3 | `v0.9.3` | `333b8ac` | Finitions de confort de l'appel (pastille thématisée, raccourcis clavier) |
| v0.9.2 | `v0.9.2` | `871773f` | Audit UX (a11y appel, contrastes, aide) + sécurité import/export |
| v0.9.0 | `v0.9.0` | `6f6ee03` | Socle livré + première publication (avant audit UX) |

*(v0.9.1 a été fusionnée dans v0.9.2 ; pas de tag.)*

## Revenir à une version antérieure (rollback)

Trois façons, de la plus propre à la plus radicale. **Toujours privilégier la 1re.**

### A. Annuler un changement précis (recommandé)
Garde l'historique, annule juste le(s) commit(s) fautif(s) :
```bash
git revert <commit-fautif>      # crée un commit qui défait le changement
# rebaisser VERSION/VERSION_APP si besoin, puis :
git push origin main
git subtree push --prefix app origin gh-pages
```

### B. Redéployer l'app telle qu'elle était à une version (rollback ciblé du site)
Remet le dossier `app/` exactement comme à un tag, sans toucher au reste :
```bash
git checkout v0.9.4 -- app       # récupère app/ de la v0.9.4 dans l'arbre courant
git commit -m "rollback app -> v0.9.4"
git subtree push --prefix app origin gh-pages
```
Le `VERSION` redevient celui de la v0.9.4 : comme il change, les utilisateurs reçoivent quand même la mise à jour (l'app servie redevient la 0.9.4).

### C. Repartir entièrement d'une version (radical, à éviter)
```bash
git checkout v0.9.4              # revue en mode "détaché" pour inspecter
# si on veut vraiment réécrire main : git reset --hard v0.9.4  (DESTRUCTIF, perd les commits suivants)
```

## Côté utilisateur, après un rollback
- L'app installée détecte le nouveau service-worker et propose **« Recharger »**.
- **Les données élèves ne sont pas touchées** par un rollback de code (elles vivent dans IndexedDB, séparées). Un retour en arrière de version ne supprime aucune donnée.
- ⚠ **Schéma 3 (v0.13.0)** : un appareil qui a ouvert la v0.13.0 a sa base en schéma 3. **Aucun retour arrière vers une v0.12 n’est alors possible** (`VersionError` à l’ouverture), et une sauvegarde faite en v0.13 est refusée par une v0.12. Un correctif après la v0.13.0 se fait donc TOUJOURS en avant : garder `DB_VERSION = 3`, le store `grilles`, les grilles figées et les détails de notes. Ne jamais supprimer la base pour contourner l’erreur. **Avant la mise en ligne : sauvegarde complète sur chaque appareil.**
- ⚠ **Exception à connaître** : ne jamais revenir à une version dont le **schéma IndexedDB** est plus ancien que celui déjà ouvert sur les appareils. La v0.12.0 a migré la base en `DB_VERSION = 2` (store `observations`, décision D009) : **aucun retour arrière avant v0.12.0** — une app en `DB_VERSION = 1` face à une base en version 2 échoue à l'ouverture (`VersionError`, écran « Affichage impossible »). Les rollbacks entre v0.12.0 et la version courante restent sans risque (même schéma). (Constat B11 de l'audit 2026-09-05 : cette ligne affirmait à tort « aucune migration à ce jour ».)
