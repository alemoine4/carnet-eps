# TODO — Carnet EPS

État courant + prochaines actions. À mettre à jour à **chaque session** (voir rituel dans CLAUDE.md).
Vue d'ensemble des phases : `docs/roadmap.md`.

## 🎒 Jalon rentrée 2026 : phases 1→9 TERMINÉES — app EN LIGNE (https://alemoine4.github.io/carnet-eps/) — restent les validations terrain ci-dessous

## Phase active : post-v1 — 5e audit du 2026-09-07 : **les 5 lots sont livrés** (v0.12.9 → v0.12.13) ; restent A39, les points retenus de l’avis du lot 5, et **A01 qui attend TA décision** (changement d’adresse : réinstallation + migration sur chaque appareil)

### 5e audit du 2026-09-07 (rapport : `docs/audit-2026-09-07.md`, données : `docs/audit-2026-09-07.json`)
- [x] 2026-09-07 — **Audit livré** : 179 constats (0 P0, **9 P1**, 86 P2, 84 P3) = Codex V2 (6, rejoués 9/9) + 13 lentilles par agents Opus indépendants en 3 lots (173, 71 doublons écartés). Les 9 P1 reproduits ou démontrés ; 13 reproductions dynamiques réintégrées en tests de non-régression avec le lot 1.
- [x] 2026-09-07 — **Lot 1 livré en v0.12.9** (« fait au mieux ») : 44 constats — B02, C01 (D013), A02, D-01, B04, A07, A12, B16, A14, V2-01, C09, V2-02, D-10, A16, B42, V2-03, A11, C10, C11, D-02, D-03, B24, V2-04, C06, D-05, A04, D-07, A05, A06, A25, A03, V2-05, A24, D-12, D-13, D-15, D-14, B25, C17, B15, A08, A10, A13, A09 — 43 tests (`tests/e2e/audit5-lot1.spec.mjs`), suite 76/76, revue adversariale du diff (5 lentilles Opus + réfutateurs, 59 agents : 19 constats confirmés, corrigés avant livraison).
- [x] 2026-09-07 — **v0.12.9 déployée** (main `769528e` + `e27615b`, gh-pages `f6da580`, tag `v0.12.9`).
- [ ] **Lot 2 — Créations atomiques** ⚙ : avis rédigé le 2026-09-07 → `docs/avis/AVIS_CREATIONS_ATOMIQUES.md` (V2-06, D-04, D-06 ; `preparerFichier` + `enregistrerLot`, 5 tests) — **en attente de « go »**.
- [x] 2026-09-07 — **Lot 3 livré en v0.12.10** : 35 constats (B01, B03, B05–B12, B17–B22, B26–B36, B40, B43, B45, B47–B50 + B31 clavier virtuel du 4e audit, préventif) — 25 tests (`tests/e2e/audit5-lot3.spec.mjs`), suite 101/101, revue adversariale du diff (4 lentilles Opus + réfutateurs, 48 agents : 12 défauts confirmés, corrigés avant livraison).
- [x] 2026-09-07 — **v0.12.10 déployée** (main `5bfdf3f` + `2b829c8`, gh-pages `89766c9`, tag `v0.12.10`).
- [x] 2026-09-08 — **Lot 4 livré en v0.12.11** : C02, A17, A18, A19, A20, A40, A41, A35, A37, A38, A42, A43, C07, C08, B14, B39, A23 — 11 tests (`tests/e2e/audit5-lot4.spec.mjs`, 4 avec le service-worker réel), suite 112/112, revue adversariale du diff en deux passes (57 agents : 6 corrections dont `parIndexLot`, 5 tests réécrits, 12 constats réfutés). Déployée : main `82939d6`, gh-pages `86dae78`, tag `v0.12.11`.
- [x] 2026-09-09 — **Lot 2 livré en v0.12.13** (avis validé par délégation) : créations atomiques (V2-06, D-04, D-06) — inaptitude avec pièce, remplacement de pièce, document, photo (ajout, changement, retrait) et import CSV écrits chacun en UNE transaction ; socle `preparerFichier` + `enregistrerLot` ; **intégration continue** GitHub Actions (C64). 5 tests (`tests/e2e/audit5-lot2.spec.mjs`), suite 158/158. Déployée : main `4b698a8`, gh-pages `3e04344`, tag `v0.12.13`.
- [x] 2026-09-09 — **v0.12.14 livrée** : A39 (démarrage servi depuis le cache + revalidation), C15 (barème modifiable), C45 (année hors année scolaire), A33 (plafond d’import 200 Mo), D-08 (3) (poids des pièces), A34 (a) et A31 (a) (champs morts), C60 (projet Playwright mobile, Pixel 7 émulé, sur les specs d’écran). 165 tests + 25 rejoués sur mobile. Écartés : C44 (1) et C16 (2).
- [ ] 🔬 **Audit Codex V3 du 2026-09-09** (`audit codex/AUDIT_V3.md`, hors dépôt) : 5 constats P2/P3 reproduits sur v0.12.14 — **stratégie écrite : `docs/strategie-audit-v3.md`**, 3 familles, 6 lots, 3 versions. **En attente de ta réponse sur 4 décisions** (§5). Lot **V3-A** (état accepté : 18 sites, correction de classe) prêt à démarrer en premier. ⚠ V3-01 et V3-05 sont des régressions des v0.12.14.
- [ ] ⚙ **Avis « grilles d’évaluation EPS » RÉDIGÉ le 2026-09-09** : `docs/avis/AVIS_GRILLES_EVALUATION.md` — **EN ATTENTE DE TA DÉCISION** (3 choix : points par niveau+poids ou par cellule · critères non évalués ignorés ou zéro · grille figée dans l’évaluation ou vivante ; + niveaux et arrondi par défaut ; + jusqu’où aller : phase 1 seule, 1+2, ou tout). Plan en 4 phases, calcul « total brut → note sur le barème choisi », critères non évalués jamais comptés zéro.
- [x] 2026-09-08 — **Lot 5 livré en v0.12.12** : 72 constats triés par workflow (9 thèmes), **63 traités** (données, import, appel/notes, qualité, sécurité, config et couverture des tests, docs), 4 déjà couverts, **5 renvoyés en avis** (C15, A34, C45, A33, C60) + quatre prolongements — 9 points dans `docs/avis/AVIS_LOT5_RESTES.md` — 35 tests (`tests/e2e/audit5-lot5.spec.mjs`) + 6 tests et 4 renforts dans `regressions`/`smoke`, suite 153/153, revue adversariale du diff (7 corrections, 8 preuves renforcées). Restent **A39** ⚙ (index.html cache-first : changement de stratégie → avis) et la **CI** (C64) ⚙. Déployée : main `fb23028`, gh-pages `d739ead`, tag `v0.12.12`. Reste **A39** ⚙ (index.html cache-first : changement de stratégie → avis si souhaité).
- [ ] **Décisions structurantes** ⚙ : **A01 → avis rédigé le 2026-09-07 `docs/avis/AVIS_ORIGINE_DEDIEE.md`** (recommandation : organisation GitHub dédiée, gratuite ; sinon documenter la limite) — **en attente de décision** ; C64 (CI GitHub Actions), refactors C40/C46/C47/C55.

## Suites du 4e audit du 2026-09-05 (v0.12.4 → v0.12.8, toutes déployées le 2026-09-06 ; reste B31 + validations terrain)

### Stratégie Codex du 2026-09-06 (`audit codex/STRATEGIE_AUDIT.md` — document hors dépôt, chez l'utilisateur ; ses cinq hypothèses sont reprises dans `docs/avis/AVIS_DURABILITE_ECRITURES.md`, versionné)
- [x] 2026-09-06 — 5 hypothèses H01–H05 **vérifiées contre le code** par 6 vérificateurs indépendants : toutes démontrées (H03 durabilité des écritures P2, H05 caches d'origine partagée avec Le Bar Clandestin P2, H01 purge non atomique P3, H02 export sans instantané P3, H04 doublons d'id à l'import P3) ; dérive documentaire signalée corrigée (roadmap, TODO, CLAUDE.md, fiche terrain, README, rapport d'audit).
- [x] 2026-09-06 — **Avis `docs/avis/AVIS_DURABILITE_ECRITURES.md` validé (« GO ») et livré en v0.12.8** : écritures durables (H03), caches préfixés (H05), purge atomique (H01), export instantané (H02), doublons refusés + stores absents annoncés (H04) ; 5 tests dont le 1er test réel du service-worker sur `http://app.localhost:8160` (repli `[::1]` puis `127.0.0.2`). Fiche terrain complétée (Bar Clandestin hors ligne après mise à jour).

### Audit du 2026-09-05 (rapport : `docs/audit-2026-09-05.md` — 34 constats, 30 traités)
- [x] 2026-09-05 — **Correctifs livrés en v0.12.4** (30 constats, tests de non-régression `tests/e2e/regressions.spec.mjs` 13/13 + smoke 8/8) : grille d'appel 2 colonnes dès 360 px (B01), import JSON altéré refusé avant écriture (B02), appui long vs défilement (B03), double tap (B04), double clic « Créer la séance » (B05), compteur « saisis » (B06), contrastes rouge/badges (B07/B08), vignette au clavier (B09), **élève « parti »** (B10), rollback DB_VERSION documenté (B11), SW et réponses non-OK (B12), `capture` retiré (B13), écran blanc → message (B14), repli randomUUID (B15), onversionchange (B16), prefs protégées (B17), visionneuse re-typée (B18), fuites d'URL (B19), message MAJ (B20), période sur récap imprimé (B21), suppression de classe référencée refusée (B22), coef 0 (B23), barrette sur l'accueil (B24), dérive doc (B25), CSS mort (B26), tests (B28), icône iOS (B32), color-scheme (B33), pastille hidden (B34).
- [x] 2026-09-06 — **v0.12.4 déployée** (push main `857d292`, gh-pages `0391552`, tag `v0.12.4`) — le commit `3b48740` du 30/08 est parti avec.
- [x] 2026-09-06 — **B27 — dédoublonnage livré en v0.12.5** (avis `docs/avis/AVIS_DEDOUBLONNAGE_HELPERS.md` validé « continue oui ») : tris/normalisation/formats/`jours` dans `metier.js`, `champ()` dans `ui.js`, 7 modules allégés, tests 21/21 inchangés.
- [x] 2026-09-06 — **B30 tranché (D012) et livré en v0.12.6** : seuil sur le cumul annuel **et** vision par trimestre (Réglages → fins de T1/T2, tableau T1/T2/T3/Année sur la fiche, périodes rapides sur le récap, détail du trimestre dans les alertes). 4 tests.
- [x] 2026-09-07 — **B31 traité préventivement en v0.12.10** (`interactive-widget=resizes-content` dans la balise viewport) — reste à **confirmer sur Android** (fiche terrain 4 bis).
- [x] 2026-09-06 — **B29 — cascades atomiques livrées en v0.12.7** (avis `docs/avis/AVIS_CASCADES_ATOMIQUES.md` validé « go pour les deux phases ») : `io.js` → `ecrireLot` / `supprimerLot` / `restaurer` / cascades / import en une transaction ; notes, inaptitudes, documents alignés ; 3 tests d'atomicité.

### Audit /audit-projet du 2026-07-10 (rapport : `docs/audit-2026-07-10.md`)
- [x] 2026-07-10 — **Lot validé « GO »** (A1→A11, A15, A16) corrigé en v0.12.1 : observations dans le résumé sauvegarde/import + accords (A1/A2), erreurs visibles sur photo/pièce illisible (A3), date « aujourd'hui » en heure locale (A4), helpers dédupliqués sequences/reglages (A5), `numero` de séance documenté comme indicatif (A6), liens externes limités à http(s) (A7), fin des `alert()` natifs (A8), routeur protégé contre les rendus concurrents (A9), doublon bloqué au renommage de classe (A10), chevauchements EDT signalés (A11), conflit de séquences actives signalé sur l'accueil (A15), TODO nettoyé (A16).
- [x] 2026-07-10 — **A12/A13/A14 arbitrés et livrés en v0.12.2** (décision D011) : toasts empilés (max 3, persistant possible), « publiée » sur preuve de copie + marquage manuel réversible, pré-remplissage « inapte » limité à la séance du jour. Vérifié Playwright 3/3 + smoke 8/8. **Audit du 2026-07-10 entièrement soldé.**

### Audit UX du 2026-06-13 (skill impeccable « critique », 31/40 « Bon »)
- [x] 2026-06-13 — **P1 accessibilité de l'appel** : `<dialog>` natif (helper `ouvrirFeuille` dans `ui.js`) + bouton « ⋯ » visible sur chaque carte élève → les 7 statuts au clavier + lecteur d'écran ; Échap, piège de focus, focus rendu au déclencheur. Tap-cycle + appui long conservés. Vérifié en preview. Voir `AVIS_APPEL_ACCESSIBILITE.md`.
- [x] 2026-06-13 — **P2 (partiel)** : texte de statut en encre pleine (au lieu de coloré) ; retour pendant l'appui long (barre de progression + `navigator.vibrate` + `prefers-reduced-motion`) ; vert/orange assombris (pastilles conformes WCAG AA, `--c-ok` + variante verte sombre).
- [x] 2026-06-13 — **P2 (reste)** : bordures de statut thématisées — variables `--stb-*` dans `base.css` (clair = couleurs saturées ; sombre = variantes claires ≥4,9:1), pilotées en CSS via `.btn-eleve[data-statut]` (ligne `borderColor` retirée de `appel.js`). Les 7 statuts désormais lisibles sur fond clair ET sombre. Vérifié en preview (2 thèmes).
- [x] 2026-06-13 — **P3** : liseré gauche des cartes « Plus » remplacé par une bordure pleine + chevron « › » ; **écran « Aide » in-app** (route `#/aide` sous « Plus ») = prise en main + rentrée en 6 étapes + réflexes de l'année, intégré et hors ligne (sans toucher au SW). Vérifié en preview.
- [x] 2026-06-13 — Visionneuse de `media.js` passée en `<dialog>` natif (Échap, fond inerte, focus rendu) ; `.feuille-fond` (CSS mort) supprimé. Audit UX **entièrement traité**.

### Campagne de tests + sécurité (2026-06-13, v0.9.2)
- [x] 2026-06-13 — Campagne 14 scénarios (preview) : 0 bug bloquant, 0 bug important. Cf. rapport en session.
- [x] 2026-06-13 — **Sécurité** : garde `data:` dans `importerJSON` (plus de requête réseau sur fichier piégé) + helper `champCSV()` anti-injection de formule sur les exports CSV. Cf. `AVIS_SECURITE_IMPORT_EXPORT.md`. Vérifié en preview.
- [x] 2026-06-13 — **Déployé en v0.9.2** : bump SW + VERSION_APP, commit `871773f`, push main + gh-pages. Correctifs UX + sécurité **en ligne** sur https://alemoine4.github.io/carnet-eps/.
- [x] 2026-06-13 — **UX confort (v0.9.3)** : pastille de statut thématisée (ressort en clair ET sombre) + raccourcis clavier PC sur l'appel (P/A/R/D/I/T/F). Déployé. Vérifié en preview.

### Distribution (Phase 9 — faite)
- [x] 2026-06-13 — **Publié sur GitHub Pages** : dépôt public `alemoine4/carnet-eps`, branche `gh-pages` = `app/`, URL `https://alemoine4.github.io/carnet-eps/` reportée dans `docs/guide-installation.md`.
- [ ] Installer la PWA depuis l'URL HTTPS (PC + Android, suivre `docs/guide-installation.md`) et vérifier le toast de MAJ au déploiement suivant
- [x] 2026-06-12 — `docs/guide-installation.md` (Android + PC + transfert + dépannage)
- [x] 2026-06-12 — `docs/guide-rentree.md` (archive → purge → import Pronote → EDT → premier cours)
- [x] 2026-06-12 — Toast « Nouvelle version installée — Recharger » sur `controllerchange` du SW (hors première installation)
- [x] 2026-06-12 — Dépôt git initialisé, commit v0.9.0 (55 fichiers)

## Validations terrain (Alexandre) — à faire avant la rentrée

- [ ] **Pronote réel** : import d'un export élèves du collège (phase 2) + collage d'une colonne de notes dans un service (phase 6) — checklist complète dans `docs/pronote.md`
- [ ] **Android réel** : navigation au pouce, chrono appel 28 élèves < 40 s (phase 4), capture caméra du certificat (phase 5)
- [ ] **Installation PWA** : installer depuis https://alemoine4.github.io/carnet-eps/ (PC + Android, guide : `docs/guide-installation.md`)
- [ ] Impression papier : récap absences + relevé de notes

## Reliquats phase 5 (validation terrain)

- [ ] Scénario Tom sur **Android réel** : photo du certificat (depuis v0.12.4/B13, `capture` retiré : Android propose Appareil photo / Fichiers / Galerie), lisibilité de la visionneuse
- [ ] Décider : photos des élèves aussi dans la grille d'appel ? (backlog — initiales seules pour l'instant)

## Reliquats phase 4 (validation terrain)

- [ ] **Chrono réel** : appel d'une classe de 28 en < 40 s sur ton téléphone (critère de sortie officiel)
- [ ] Test impression du récap (mise en page papier réelle)

## Reliquats phase 3 (mineurs, non bloquants)

- [ ] Annulation/déplacement ponctuel d'un créneau (sortie scolaire…) — backlog assumé v1
- [ ] L'alternance A/B suit la parité calendaire (les vacances ne décalent rien) — vérifier sur ton EDT réel que c'est le bon modèle

## Reliquat phase 1 (dépend d'Alexandre)

- [ ] **Vérifier le shell sur Android réel** (Chrome) : nav tactile, zones 44 px, clavier
- [x] 2026-06-13 — Publication GitHub Pages (l'installation PWA réelle reste dans « Validations terrain » ci-dessus)
- [x] 2026-06-15 — Tests Playwright : dépendance dev validée, harnais + 8 smoke-tests verts (`npm test`)
- [x] 2026-06-12 — Toast « Nouvelle version installée — Recharger » sur `controllerchange` (v0.9.0)

## Reliquat phase 2 (validation terrain)

- [ ] **Valider l'import avec un vrai export Pronote du collège** (encodage, en-têtes réels, effectif complet) — critère de sortie officiel de la phase 2, checklist dans `docs/pronote.md`
- [x] 2026-06-12 — Photo de l'élève sur la fiche (pipeline mutualisé avec les certificats, livré en v0.6.0)

## En attente / réflexion

- Passerelle avec SEANCE_PLANNER (lier une séance Carnet EPS à une fiche de séance) — voir backlog roadmap
- Sync semi-automatique PC ↔ Android — hors périmètre v1, décision D004

## Fait

- [x] 2026-06-12 — **Phase 8 — QA & durcissement (v0.8.1)** : volumétrie 1 année (6×28 : 10 668 enregistrements + 12 photos, 1,4 Mo) → **tous les écrans < 50 ms** ; round-trip export (57 ms, 1,36 Mo) → purge → **import 1,9 s** (réécrit en lots par store, ~30× plus rapide — durcissement trouvé en QA) → données strictement identiques, blobs intègres ; imports corrompus rejetés ; **audit a11y 21 écrans : 0 problème** ; **Lighthouse Perf 97 / A11y 100 / BP 100** ; revue gratuité + RGPD OK ; `tests/checklist.md` réécrite avec résultats + cases « appareil réel » restantes ; README actualisé.
- [x] 2026-06-12 — **Phase 7 — Documents & tableau de bord (v0.8.0)** : `accueil.js` (carteMaintenant déménagée depuis edt.js + **alertes agrégées** : inaptitudes expirant J-7 / venant de finir, seuils tenue-dispenses, évaluations notées non remontées Pronote + carte « Reprendre » dernière classe/éval) ; `documents.js` (bibliothèque : photo/PDF compressé ou lien, types, tags, classes liées, recherche + filtres, visionneuse, suppression cascadée) ; visionneuse mutualisée dans `media.js`. Vérifié : 3 alertes exactes, raccourcis, doc lien + doc image (PNG 1800px → JPEG 18 Ko), filtres, cascade. Console propre.
- [x] 2026-06-12 — **Phase 6 — Évaluations & notes + export Pronote (v0.7.0)** 🎒 : module notes complet (création note20/barème/AFL coef, **grille de saisie** ordre alphabétique Pronote avec codes ABS/DISP/NN normalisés et valeurs hors barème rejetées, Entrée = élève suivant, stats moy/min/max en direct) ; **« Copier pour Pronote »** (colonne alignée — lignes vides pour codes/non-notés —, virgule décimale, liste « à saisir à la main », garde-fou effectif+barème, repli textarea si presse-papiers indisponible) ; CSV Nom;Prénom;Note ; marquage « publiée le » ; **relevé par classe** (moyennes /20 pondérées coef, codes exclus du calcul, moyenne de classe, impression + CSV) ; notes + moyenne générale sur la fiche élève. Vérifié de bout en bout, 1 bug trouvé et corrigé (zone de secours écrasée), console propre.
- [x] 2026-06-12 — **Phase 5 — Inaptitudes & certificats (v0.6.0)** : module complet (synthèse avec sections En cours / Terminées cette semaine / À venir / Historique, alertes « fin dans X j » (J-7) et « > 3 mois · médecin scolaire » ; formulaire avec cascade classe→élève, restrictions, pièce jointe ; détail éditable + visionneuse plein écran + remplacement de pièce ; suppression cascadée certificat+fichier) ; `media.js` (compression canvas → JPEG ≤ 300 Ko vérifiée : 2000×1400 PNG → 1600×1120 / 34 Ko) ; photo de l'élève sur la fiche ; scénario « Tom » vérifié de bout en bout (création → alertes → fiche → pré-remplissage à l'appel 🩺 → suppression propre).
- [x] 2026-06-12 — **Phase 4 — Appel & absences EPS (v0.5.0)** ⭐ : écran d'appel tactile (grille, tap = présent→absent→tenue, appui long/clic droit = menu 7 statuts + minutes de retard + commentaire), pré-remplissage automatique par inaptitude active (🩺), compteurs en direct (présents/pratiquants/saisis), « Terminer l'appel », bilan de séance ; sélecteur (cours du jour EDT avec création séance+appel en un tap, séances récentes avec état n/effectif, accès récaps) ; alertes ⚠ au seuil de 3 (tenue/dispenses) sur l'appel ET la fiche élève ; historique d'appel sur la fiche (chips + 8 derniers) ; récap par classe filtrable par dates, imprimable, export CSV (BOM Excel). Vérifié de bout en bout en preview, console propre.
- [x] 2026-06-11 — **Phase 3 — EDT, séquences & séances (v0.4.0)** : module EDT (créneaux jour/heures/classe/semaine A-B/installation, formulaire ajout-édition-suppression avec validation, liste par jour avec « aujourd'hui », grille colonnes sur PC) ; alternance A/B par lundi de référence (parité vérifiée A→B→A) ; **« En ce moment » sur l'accueil** (croise EDT × heure × parité × séquence active, création de la séance du jour en un tap, cours suivants affichés) ; module Séquences (APSA avec suggestions, CA1-4, dates, objectifs/AFL, séances numérotées par ordre de date, doublon de date refusé) ; cascades séance→appels et séquence→séances/évaluations/notes vérifiées.
- [x] 2026-06-11 — **Phase 2 — Classes & élèves (v0.3.0)** : CRUD classes (création, édition, couleur, archivage, suppression si vide) + élèves (ajout rapide, fiche complète éditable, recherche) + **import CSV/collage Pronote** (mapping auto vérifié : Nom/Prénom/Né(e) le/Sexe/Classe ; séparateur et encodage Windows-1252 auto-détectés ; classes auto-créées ; doublons ignorés et comptés) + suppression élève en cascade. Vérifié en preview de bout en bout sur le jeu d'essai (10 élèves, accents, homonymes, dates ISO).
- [x] 2026-06-11 — Phase 0 : arborescence, cadrage complet, squelette navigable, serveur 8160
- [x] 2026-06-11 — **Export/import JSON complet** (blobs en base64, validation, export de sécurité auto avant import/purge) + écran Sauvegarde — round-trip vérifié en preview (élève + meta + blob restaurés à l'identique)
- [x] 2026-06-11 — **Écran Réglages** : établissement, année scolaire, thème clair/sombre/auto (persisté), stockage (usage/quota + protection), version + bouton « Vérifier les mises à jour »
- [x] 2026-06-11 — `navigator.storage.persist()` demandé au boot + état affiché dans Réglages
- [x] 2026-06-11 — Icônes nav : emoji → SVG Lucide inline (MIT)
- [x] 2026-06-11 — **Icônes PNG 192/512 + 512 maskable** générées par `tools/gen-icons.ps1` (WPF Windows, zéro dépendance), branchées dans le manifest et le SW
- [x] 2026-06-11 — Service-worker 0.2.0 (assets modules + PNG) ; routes enfants `#/sauvegarde` et `#/reglages` (onglet parent « Plus » reste actif)
