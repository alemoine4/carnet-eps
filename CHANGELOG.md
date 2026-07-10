# CHANGELOG — Carnet EPS

Historique des changements notables. Format : date — résumé. Le détail vit dans `docs/journal.md`.

> 🔖 Versions déployées (tags git), correspondance version → commit et **procédure de retour arrière** : `docs/deploiement.md`.

## 2026-07-10 — v0.12.2 : Arbitrage des 3 décisions produit de l'audit (A12/A13/A14 — décision D011)

- **Toasts empilés (A12)** : les toasts s'empilent (max 3) au lieu de se remplacer — deux suppressions rapprochées gardent chacune leur « Annuler » ; le toast « Nouvelle version installée » est persistant et ne peut plus être écrasé.
- **« Publiée » sur preuve (A13)** : le marquage « publiée le … » n'a lieu que sur copie réussie (presse-papiers, ou copie réelle depuis la zone de secours) ; l'export CSV ne marque plus ; **bouton manuel** « Marquer remontée / Annuler le marquage » → l'alerte « pas encore remontée » redevient fiable.
- **Consulter ≠ modifier (A14)** : le pré-remplissage « inapte » n'écrit en base que pour la séance du **jour** ; ouvrir un appel passé n'écrit plus rien (pastille 🩺 conservée).
- Vérifié : 3 tests Playwright dédiés (pile de toasts, séance passée/du jour, CSV/copie/toggle) + smoke-tests **8/8**. Bump SW + `VERSION_APP` → 0.12.2 ; redéployé. **L'audit du 2026-07-10 est entièrement soldé.**

## 2026-07-10 — v0.12.1 : Corrections de l'audit complet (A1→A11, A15, A16)

Audit 5 phases du 2026-07-10 (rapport `_TEMPO\DEV_APP\AUDIT_DEV_APP_2026-07-10.md`) : **0 critique**, lot validé « GO » :
- **Sauvegarde** : le résumé (écran + confirmation d'import) inclut désormais les **observations** et accorde le singulier (A1/A2).
- **Photos/pièces** : une image illisible (HEIC, fichier corrompu) affiche un **message d'erreur clair** au lieu d'échouer en silence (fiche élève + remplacement de pièce) ; garde-fou `toBlob` null (A3).
- **Dates** : « aujourd'hui » calculé en **heure locale** (plus de bascule à la veille entre minuit et 1-2 h) (A4).
- **Robustesse** : routeur protégé contre les rendus concurrents (navigation très rapide) (A9) ; doublon bloqué au renommage de classe (A10).
- **Garde-fous EDT/accueil** : chevauchement de créneaux signalé (toast, non bloquant) (A11) ; ⚠ si 2 séquences actives se chevauchent pour la classe en cours (A15).
- **Divers** : liens de documents limités à http(s) (A7), `alert()` → toasts (A8), helpers dédupliqués (A5), `seances.numero` documenté comme indicatif (A6), TODO.md dépoussiéré (A16).
- Vérifié : preview réel correctif par correctif + **smoke-tests 8/8**. Bump SW + `VERSION_APP` → 0.12.1 ; redéployé.
- En attente d'arbitrage (audit A12/A13/A14) : toasts empilés, « publiée » après copie réussie seulement, pré-remplissage inapte limité au jour même.

## 2026-06-15 — v0.12.0 : Observations (notes terrain) — socle + 1er lot

Première brique « noter en 2 taps » (avis : `AVIS_OBSERVATIONS_MODELE.md`).
- **Nouvelle entité `observations`** (store IndexedDB, index `eleveId`) : type, ton (positif/neutre/vigilance), tags, texte, date, séance liée. **Migration `DB_VERSION 1 → 2` purement additive** (le `onupgradeneeded` crée le store manquant ; aucune donnée existante touchée — vérifié).
- **Fiche élève** : carte **« Observations »** = timeline (triée récente d'abord, badge de type coloré par ton) + bouton **« + Observation »** ouvrant une feuille (type, ton, **phrases rapides**, **étiquettes**, dictée via le micro natif du clavier). Suppression d'une observation avec **annulation** (toast).
- **Cohérence** : suppression d'élève en cascade inclut les observations (+ aperçu, détail, **undo**) ; export/import JSON les couvrent automatiquement (`schemaVersion` → 2).
- Vocabulaire (types, tons, tags, modèles de phrases) dans `metier.js` ; module `js/modules/observations.js` (ajouté au cache SW).
- Smoke-tests : +1 (ajouter une observation + cascade) → **8/8 verts**. Migration v1→v2 vérifiée en preview (14 stores, données préservées).
- Bump SW + `VERSION_APP` → 0.12.0 ; redéployé.

## 2026-06-15 — v0.11.0 : Onglet « Suivi » (navigation EPS)

Priorité roadmap n°3 — rendre le suivi EPS visible (avis : `AVIS_SUIVI_NAVIGATION.md`, option A).
- **Nouvel onglet « Suivi »** dans la barre, à la place d'**EDT** (déplacé dans le menu « Plus »). On reste à **6 onglets**.
- L'onglet Suivi regroupe les **alertes élèves** (inaptitudes expirant / réintégrations, seuils d'oublis de tenue et de dispenses, évaluations non remontées) + un accès direct **Inaptitudes & certificats**.
- **Refactor sans changement de comportement** : la logique d'alertes est extraite vers `metier.js` (`collecterAlertes()`), partagée par l'accueil et le Suivi (l'accueil affiche les 8 premières, le Suivi toutes).
- Les inaptitudes sont désormais frontées par « Suivi » (`PARENT.inaptitudes = 'suivi'`) ; sur `#/edt` c'est l'onglet « Plus » qui s'active.
- Smoke-tests : +1 (onglet Suivi + EDT dans Plus) → **7/7 verts**. Vue Suivi définie en inline dans `main.js` (pas de nouveau fichier → SW `ASSETS` inchangé).
- Bump SW + `VERSION_APP` → 0.11.0 ; redéployé. Vérifié preview (nav, accueil, Suivi, EDT via Plus, console propre).

## 2026-06-15 — Outils : smoke-tests Playwright (dev, l'app n'est pas modifiée)

- Ajout d'un harnais de tests **Playwright en dépendance de DEV** (validé explicitement ; gratuit Apache-2.0 ; jamais livré — `gh-pages` ne déploie que `app/`, `node_modules/` ignoré). L'application reste **sans dépendance runtime** (BIBLE règle 1).
- `package.json` (privé, `@playwright/test`), `playwright.config.mjs` (lance/réutilise `server-carnet.mjs`), `tests/e2e/smoke.spec.mjs` (**6 parcours critiques** : chargement+nav, créer classe+persistance, import CSV, appel, suppression+annulation, round-trip export/import) — **tous verts**.
- Lancement : `npm install` → `npx playwright install chromium` → `npm test`. Détails : `tests/e2e/README.md`.
- **Pas de changement de l'app** : ni `VERSION`, ni `VERSION_APP`, ni déploiement.

## 2026-06-13 — v0.10.1 : Annulation des suppressions (phase 2 — « Supprimé — Annuler »)

Filet de récupération après suppression (priorité n°1 de la roadmap).
- **Toast « … supprimé — Annuler » (8 s)** après chaque suppression : un clic **restaure tout**, cascade comprise (helper `toast()` dans ui.js).
- **io.js** : les cascades (`supprimerSeance/Sequence/EleveEnCascade`) renvoient désormais les **objets supprimés** (avec les blobs des pièces jointes) ; nouveau `restaurer(objets)` qui les ré-enregistre.
- Câblé sur les 8 suppressions : élève (cascade appels/inaptitudes/certificats/notes/photos), classe, séquence (cascade), séance, évaluation (+notes), inaptitude (+certificat/fichier), document (+fichier), créneau EDT.
- Vérifié en preview : suppression élève → toast → **Annuler restaure élève + appel + inaptitude + note** et revient sur la fiche ; console propre.
- Bump SW + `VERSION_APP` → 0.10.1 ; redéployé. *(Corbeille persistante = plus tard, nécessite un store dédié → migration.)*

## 2026-06-13 — v0.10.0 : Suppressions sécurisées (phase 1 — confirmation cohérente)

Première étape du chantier « sécurité des données » (AVIS_ANNULATION_SUPPRESSIONS.md).
- **Fin des `confirm()` natifs** : les 11 confirmations de suppression (élève, classe, séquence, séance, évaluation, inaptitude, document, créneau EDT, import, purge ×2) passent par un helper `confirmer()` en `<dialog>` natif : **focus initial sur « Annuler »** (anti-mauvais-tap), bouton d'action en rouge, Échap / clic sur le fond = Annuler, accessible (cohérent avec le menu d'appel).
- **Impact des cascades affiché** : ex. « Seront aussi supprimés : 1 appel, 1 inaptitude, 1 note. » (helpers `apercuSuppressionEleve`/`apercuSuppressionSequence`/`detailSuppression` dans io.js). Les doubles `confirm()` (élève, séquence) sont fusionnés en une seule boîte claire.
- Vérifié en preview : ouverture, focus Annuler, Annuler ne supprime pas, Supprimer supprime + cascade + redirection ; console propre.
- **À suivre (v0.10.1)** : filet « Supprimé — Annuler » (restauration 8 s). Corbeille persistante = plus tard (nouveau store → migration).
- Bump SW + `VERSION_APP` → 0.10.0 ; redéployé.

## 2026-06-13 — v0.9.9 : Alignement audit (finitions)

Comble les écarts restants du lot d'audit, sans toucher aux chantiers structurels :
- **Aide de l'appel scindée** : gestes tactiles visibles partout ; raccourcis clavier (P A R D I T, F) affichés **seulement sur appareil à pointeur fin** (`@media (pointer: fine)`).
- **Typo** : en-tête 1,2→1,3rem, corps des cartes 0,9→0,95rem (titres de carte conservés à 1,1rem — meilleur contraste que la grille proposée).
- **Nav** : libellés 0,66→0,68rem ; vérifié **sans débordement ni troncature à 320px et 360px** (6 onglets).
- **CSP complétée** : ajout de `font-src 'self'`, `worker-src 'self'`, `manifest-src 'self'`. `connect-src 'self' data:` **conservé** (sinon l'import de pièces jointes casse). `frame-ancestors` **non ajouté** (ignoré en balise `<meta>` — nécessiterait un en-tête HTTP, hors de portée GitHub Pages).
- Non retenu volontairement : confirmation bloquante sur « Terminer l'appel » (préserve le < 40 s ; le filet sera l'annulation, cf. AVIS). `role="status"` écarté sur les compteurs (verbosité lecteur d'écran).
- Bump SW + `VERSION_APP` → 0.9.9 ; redéployé. Vérifié clair/sombre, 320/360/desktop, console propre, 0 violation CSP.

## 2026-06-13 — v0.9.8 : Corrections d'audit (a11y, typo, sécurité)

Lot de corrections rapides issues de l'audit multi-perspectives :
- **A11y** : `aria-live="polite"` sur les compteurs d'appel (annoncés au lecteur d'écran) ; **nom de zone par écran** (`aria-label` sur `#vue` selon la route → la section est annoncée à la navigation) ; `scroll-margin-bottom` sur les éléments focusables (WCAG 2.2 — focus non masqué par la nav) ; bloc `@media (prefers-reduced-motion: reduce)`.
- **Typo** : hiérarchie renforcée (en-tête 1,2rem, titres de carte 1,1rem) ; libellés de nav 0,62→0,66rem.
- **Appel** : le bouton « Terminer » indique désormais **combien d'élèves passeront présents** (ex. « Terminer l'appel · 6 passés en présent ») — informatif, sans confirmation bloquante (le fast-path reste rapide).
- **Sécurité** : ajout d'une **CSP** (`script-src 'self'` bloque tout handler injecté ; `blob:`/`data:` autorisés pour photos et import). Vérifié : styles inline, visionneuse, export CSV, import — aucune violation.
- Bump SW + `VERSION_APP` → 0.9.8 ; redéployé.

## 2026-06-13 — v0.9.7 : Liseré bleu au chargement (focus)

- Correction : au premier chargement, un anneau de focus bleu (`:focus-visible`) s'affichait autour de la zone de contenu — `#vue` (tabindex=-1) reçoit le focus par programme à chaque vue (scroll en haut + annonce lecteur d'écran), et la règle globale `:focus-visible` annulait le `.vue { outline: none }` voulu. Ajout d'une règle plus spécifique `.vue:focus, .vue:focus-visible { outline: none }` → plus de liseré, tout en gardant l'anneau de focus sur les vrais boutons/liens/champs.
- Bump SW + `VERSION_APP` → 0.9.7 ; redéployé.

## 2026-06-13 — v0.9.6 : Largeur d'écran sur PC

- Sur grand écran, les vues à fort contenu **appel**, **récapitulatif** et **relevé** utilisent désormais toute la largeur disponible (classe `vue-large` ajoutée par ces vues ; `afficherVue` réinitialise la classe à chaque rendu). Les formulaires et le texte restent **plafonnés à 900 px** (lisibilité).
- **Grille d'appel en colonnes auto-remplies** (`repeat(auto-fill, minmax(160px, 1fr))`) : 2 colonnes sur mobile, et davantage dès qu'il y a de la place — ex. **7 colonnes** sur un écran 1600 px → 28 élèves en 4 rangées au lieu de 7 (moins de défilement). Les récap/relevés prennent toute la largeur (moins de défilement horizontal).
- Bump SW + `VERSION_APP` → 0.9.6 ; redéployé. Vérifié en preview (appel 1360 px/7 col, formulaire 900 px, console propre).

## 2026-06-13 — v0.9.5 : Libellé du bouton retour

- Le bouton retour des écrans ouverts depuis l'onglet « Plus » (Inaptitudes, Séquences, Documents, Sauvegarde, Réglages, Aide) passe de « ← Plus » à **« ← Retour »** : « Plus » (menu fourre-tout) se lisait mal comme destination de retour. Les retours qui nomment une vraie section (« ← Classes », « ← Appel », « ← Notes », « ← Inaptitudes »…) sont conservés.
- Bump SW + `VERSION_APP` → 0.9.5 ; redéployé.

## 2026-06-13 — v0.9.4 : Nettoyage écran « Plus »

- Retrait des badges « prêt » (vestiges de dev) sur les cartes de l'écran Plus : tous les modules étant livrés, ce marqueur n'avait plus de sens en production (et était incohérent avec la carte « Aide » sans badge). La ligne RGPD « 100 % local · hors ligne… » est conservée (intentionnelle).
- Bump SW + `VERSION_APP` → 0.9.4 ; redéployé.

## 2026-06-13 — v0.9.3 : Finitions de confort de l'appel

- **Pastille de statut thématisée** : la pastille (P/A/R/D/I/T/INF) utilise désormais la même couleur `--stb-*` que la bordure et un texte `--c-sur-accent` → en thème clair, couleur saturée + texte blanc ; en thème **sombre**, variante claire + texte encre, donc elle **ressort sur la carte** (le fond n'est plus posé en JS mais piloté par CSS via `[data-statut]`).
- **Raccourcis clavier (PC) sur l'appel** : une carte d'élève focalisée + une lettre fixe le statut directement — `P` présent, `A` absent, `R` retard, `D` dispensé, `I` inapte, `T` oubli de tenue, `F` infirmerie. Indiqué dans la ligne d'aide sous la grille.
- Bump SW + `VERSION_APP` → 0.9.3 ; redéployé sur GitHub Pages. Vérifié en preview (clair + sombre, clavier, console propre).

## 2026-06-13 — v0.9.2 : Campagne de tests + durcissement sécurité

- **Campagne de tests** (14 scénarios, harnais preview — Playwright MCP indisponible, profil verrouillé) : chargement sans erreur, navigation, création classe/élèves, persistance, appel 28 (compteurs + fast-path « Terminer »), 7 statuts, import Pronote, export CSV (contenu capturé), impression (déclenchement + `@media print`), 0 ressource externe, **XSS import CSV/JSON neutralisé**, a11y clavier du menu, responsive 360 px. **0 bug bloquant, 0 bug important fonctionnel.**
- **Sécurité — garde `data:` à l'import JSON** ([io.js](app/js/io.js)) : `importerJSON` ne reconstruit un blob que depuis une dataURL locale → un fichier de sauvegarde piégé (URL http dans `donnees`) **n'émet plus aucune requête réseau** (offline/RGPD garantis). Vérifié : URL piégée = 0 fetch, dataURL valide = blob reconstruit.
- **Sécurité — anti-injection de formule CSV** : helper `champCSV()` (RFC 4180 + préfixe `'` sur `= + - @`), appliqué aux exports téléchargés (récap absences, notes, relevé). Corrige aussi les champs non quotés (noms avec `;`/`"`). « Copier pour Pronote » (presse-papiers) inchangé.
- Détails : `AVIS_SECURITE_IMPORT_EXPORT.md`. Aucun changement de schéma ni d'UI.
- **Déploiement** : bump `VERSION` service-worker + `VERSION_APP` `0.9.0 → 0.9.2` (les installs existantes reçoivent le toast « Nouvelle version installée ») ; commit `871773f`, redéployé sur GitHub Pages (`gh-pages`).

## 2026-06-13 — v0.9.1 : Publication + audit UX (P1 accessibilité de l'appel)

- **Publié sur GitHub Pages** : dépôt public `alemoine4/carnet-eps`, branche `gh-pages` = contenu de `app/`, app en ligne sur `https://alemoine4.github.io/carnet-eps/` (URL reportée dans `docs/guide-installation.md`).
- **Audit UX** (skill impeccable, score Nielsen 31/40 « Bon », détecteur markup propre) : voir `AVIS_APPEL_ACCESSIBILITE.md`.
- **P1 — accessibilité de l'écran d'appel** : menu de statuts converti en `<dialog>` natif (helper `ouvrirFeuille` mutualisé dans `ui.js` — Échap, piège de focus, fond cliquable, focus rendu au déclencheur) ; carte élève refondue en groupe « grande zone (tap-cycle + appui long) + bouton ⋯ visible » → **les 7 statuts deviennent accessibles au clavier et au lecteur d'écran** (avant : 4 cachés derrière l'appui long). Tap-cycle et appui long conservés.
- **P2** : texte de statut en encre pleine (lisibilité) ; retour visuel (barre de progression) + vibration pendant l'appui long (avec `prefers-reduced-motion`) ; pastilles vert `#178a52→#0f7a46` et orange `#c97a06→#a35f00` conformes WCAG AA (+ variante verte sombre pour `.statut-ok`) ; **bordures de statut thématisées** (variables `--stb-*` : couleurs saturées en clair, variantes claires ≥4,9:1 en sombre — les 7 statuts lisibles sur les deux thèmes).
- **P3** : liseré gauche des cartes « Plus » (anti-pattern) remplacé par une bordure pleine + chevron « › » ; **écran « Aide » in-app** (route `#/aide`) — prise en main, rentrée en 6 étapes, réflexes de l'année, intégré et hors ligne.
- **Visionneuse** (`media.js`) passée en `<dialog>` natif (Échap, fond inerte, focus rendu) ; CSS mort `.feuille-fond` supprimé. **Audit UX entièrement traité.**
- Vérifié en preview (clavier, tactile, Retard, pré-remplissage inapte, page Plus + Aide, mobile 375 px sans débordement, console propre). 1 bug attrapé et corrigé en test (la fermeture par clic-fond se déclenchait sur activation clavier).

## 2026-06-12 — v0.9.0 : Phase 9 — Distribution (préparée)

- **Toast de mise à jour** : « Nouvelle version installée — Recharger » quand un nouveau service-worker prend le contrôle en cours d'usage (BIBLE règle 5) ; silencieux à la première installation.
- **`docs/guide-installation.md`** : installation PWA Android + PC, transfert PC ↔ Android par JSON, mises à jour, dépannage, localisation des données.
- **`docs/guide-rentree.md`** : procédure de rentrée en 6 étapes (~30 min) + réflexes de l'année (sauvegarde hebdo, certificats, export Pronote).
- **Dépôt git local initialisé** (commit `04a4d7c`, 55 fichiers). Publication GitHub Pages prête, en attente : (1) `gh auth login` par l'utilisateur, (2) son feu vert explicite.

## 2026-06-12 — v0.8.1 : Phase 8 — QA & durcissement

- **Durcissement** : `importerJSON` réécrit **par lots** (une transaction clear+puts par store) — restauration d'une année complète en ~2 s au lieu de ~1 min.
- **QA sur volumétrie réelle** (6 classes × 28 élèves × 1 an = 10 668 enregistrements + 12 photos) : tous les écrans rendus en 16-49 ms ; export 57 ms / 1,36 Mo ; round-trip sans aucune perte (blobs compris) ; imports corrompus rejetés proprement.
- **Lighthouse : Performance 97 · Accessibilité 100 · Best practices 100** ; audit structurel a11y sur 21 écrans : 0 problème.
- `tests/checklist.md` réécrite : résultats mesurés + cases « appareil réel » restantes (Android, Pronote réel, installation HTTPS, impression papier). README actualisé (état v0.8.1).

## 2026-06-12 — v0.8.0 : Phase 7 — Documents & tableau de bord

- **Accueil = vrai tableau de bord** (`modules/accueil.js`) : carte « En ce moment » (déplacée d'edt.js) + **carte Alertes** agrégées — inaptitudes finissant sous 7 j ⚠, élèves redevenant aptes ℹ, seuils 3 oublis de tenue / 3 dispenses ⚠, évaluations notées mais jamais remontées vers Pronote ℹ — chaque alerte cliquable vers l'écran concerné + carte « Reprendre » (dernière classe, dernière évaluation).
- **Plus → Documents** (`modules/documents.js`) : bibliothèque locale — photo/PDF (compressé via media.js) **ou** lien externe, 6 types, mots-clés, classes liées, recherche instantanée + filtres classe/type, ouverture en visionneuse / nouvel onglet, suppression avec cascade du fichier.
- Visionneuse plein écran mutualisée dans `media.js` (utilisée par inaptitudes et documents).
- L'écran d'accueil répond au critère de sortie : « qu'est-ce qui m'attend aujourd'hui ? » sans aucun clic.
- SW **0.8.0**. Vérifié en preview (3 alertes exactes, raccourcis, doc lien + doc image compressée 18 Ko, filtres, cascades), console vide.

## 2026-06-12 — v0.7.0 : Phase 6 — Évaluations & notes + export Pronote 🎒

**Jalon rentrée 2026 atteint : les phases 1→6 sont livrées** (restent les validations terrain : Pronote réel, Android réel, installation HTTPS).

- **Onglet Notes** réel : liste des évaluations (badge « publiée ✓ », compteur notes/effectif), création (note /20, barème personnalisé, ou AFL/positionnement texte — non exporté), coefficient.
- **Grille de saisie** : élèves dans l'ordre alphabétique (= ordre Pronote), saisie au clavier numérique (virgule acceptée), codes `ABS`/`DISP`/`NN` (raccourcis a/d/n), valeurs hors barème rejetées visuellement, Entrée = élève suivant, stats en direct (moyenne/min/max, saisies).
- **Export Pronote voie A** : « Copier pour Pronote » — colonne triée alpha avec **lignes vides pour les codes et non-notés** (alignement préservé), virgule décimale, récapitulatif « à saisir à la main » (ligne X — élève : ABS), **garde-fou** effectif + barème, repli textarea sélectionnée si le presse-papiers est indisponible (http réseau local). Voie B : CSV `Nom;Prénom;Note`. Les deux marquent « publiée le … ».
- **Relevé par classe** : tableau élèves × évaluations + moyenne /20 pondérée par coefficients (codes et AFL exclus), moyenne de classe, impression + export CSV.
- Fiche élève : section Notes réelle (dernières notes + moyenne générale /20).
- SW **0.7.0**. Vérifié en preview de bout en bout ; bug corrigé pendant la vérification (le récapitulatif écrasait la zone de copie manuelle en mode repli).

## 2026-06-12 — v0.6.0 : Phase 5 — Inaptitudes & certificats

- **Plus → Inaptitudes** (route `#/inaptitudes`) : synthèse (En cours, Terminées cette semaine « penser à réintégrer », À venir, Historique) avec alertes **« fin dans X j »** (seuil J-7) et **« > 3 mois · médecin scolaire »** ; formulaire complet (classe→élève en cascade, type totale/partielle, origine, dates, 6 restrictions, commentaire, **pièce jointe photo/PDF**) ; détail éditable ; suppression avec cascade certificat + fichier.
- **`js/media.js`** : compression photo canvas → JPEG (max 1600 px, ≤ ~300 Ko, qualité dégressive) ; stockage store `fichiers` ; PDF tels quels ; visionneuse plein écran (PDF → nouvel onglet).
- **Fiche élève** : photo de l'élève (ajout/changement/retrait, compressée) + section inaptitudes réelle (état, dates, 📎, lien détail, bouton « + Nouvelle inaptitude » pré-ciblée).
- L'appel signale déjà les inaptes (phase 4) — vérifié avec une inaptitude créée via l'UI.
- SW **0.6.0**. Scénario « Tom » du brief vérifié en preview de bout en bout (compression 114 Ko → 34 Ko, alertes, pré-remplissage, cascade propre), console vide.

## 2026-06-12 — v0.5.0 : Phase 4 — Appel & absences EPS ⭐

- **Onglet Appel** réel, en 3 vues :
  - *Sélecteur* : cours du jour d'après l'EDT (« Faire l'appel » / « Reprendre (n/eff) » / « Appel fait ✓ », ou création séance + appel en un tap), 10 dernières séances avec état de saisie, accès aux récapitulatifs par classe.
  - *Écran d'appel* : grille tactile (2/3/4 colonnes selon écran), **tap = présent → absent → oubli de tenue**, **appui long ou clic droit = menu complet** (7 statuts, minutes de retard, commentaire) ; **pré-remplissage automatique** des élèves à inaptitude active (🩺) ; compteurs en direct (présents / pratiquants / saisis) ; « Terminer l'appel » (le reste = présents) ; bilan de séance.
  - *Récapitulatif classe* : tableau P/A/R/D/I/T/INF filtrable par dates, colonne ⚠ (seuil 3 tenue/dispenses), **impression** (`@media print`) et **export CSV** (BOM pour Excel).
- Fiche élève : historique d'appel réel (chips par statut, signalement ⚠, 8 dernières séances).
- `metier.js` nouveau (vocabulaire partagé : STATUTS, cycle de tap, seuil d'alerte, parité A/B, cours du jour, inaptitudes actives) — les modules ne s'importent toujours pas entre eux.
- Accueil : « Faire l'appel » direct sur la séance du jour ; créer la séance ouvre l'appel.
- SW **0.5.0**. Vérifié en preview : pré-remplissage inapte, cycle de statuts avec compteurs exacts, retard 10 min via menu, appel complet 10/10, bilan persisté, alertes ⚠, récap (P=1/I=1/T=3+⚠), console propre.

## 2026-06-11 — v0.4.0 : Phase 3 — EDT, séquences & séances

- **Onglet EDT** réel : créneaux hebdomadaires (jour, heures, classe, semaine A/B, installation avec suggestions), formulaire ajout/édition/suppression (heures validées), liste par jour avec badge « aujourd'hui », grille en colonnes sur PC.
- **Alternance A/B** : un « lundi de semaine A » de référence (saisi dans l'EDT, stocké en meta) ; parité calendaire — limite v1 assumée : les vacances ne décalent pas l'alternance.
- **« En ce moment » sur l'accueil** : croise EDT × heure × parité × séquences actives ; affiche classe, créneau, installation, APSA et n° de séance ; **crée la séance du jour en un tap** (liée au créneau) ; liste les cours suivants de la journée ; guide vers EDT/Séquences si vide.
- **Séquences & séances** (« Plus → Séquences », route `#/sequences[/<id>]`) : création (APSA avec datalist, CA1-4, dates, nb prévu), édition complète, séances numérotées par ordre de date (doublon de date refusé), suppression en cascade (séances → appels ; séquence → séances + évaluations + notes).
- `io.js` : `supprimerSeanceEnCascade`, `supprimerSequenceEnCascade`. SW **0.4.0**. Accueil épuré (la carte « base de données » de la phase 0 est retirée).
- Vérifié en preview : scénario complet « créneau couvrant maintenant + séquence Badminton » → carte « En ce moment » exacte (semaine A, 6A, 1/10), séance créée, parité A/B/A, créneau « semaine B » exclu en semaine A, formulaires validés, cascades propres, console vide.

## 2026-06-11 — v0.3.0 : Phase 2 — Classes & élèves + import Pronote

- **Onglet Élèves** réel (remplace le bouchon) : liste des classes (effectifs, couleurs, archivage/restauration), vue classe (édition nom/niveau/couleur, ajout rapide d'élève, recherche instantanée, tri alphabétique fr), fiche élève complète (sexe, naissance, changement de classe, zone « À savoir » PAI/asthme) avec suppression **en cascade** (appels, inaptitudes, certificats + pièces, notes).
- **Import Pronote** (`#/eleves/import`) : collage direct ou fichier CSV ; détection automatique du séparateur (`;`/tab/`,`), de l'encodage (UTF-8 → repli Windows-1252) et des colonnes (mapping manuel possible) ; destination par colonne Classe (auto-création), classe existante ou nouvelle ; doublons ignorés et comptés ; dates JJ/MM/AAAA → ISO ; aperçu avant import.
- Router à sous-routes (`#/eleves/classe/<id>`, `#/eleves/fiche/<id>`, `#/eleves/import`) ; helpers de formulaire mutualisés dans `ui.js` ; utilitaires CSV + cascade dans `io.js` ; SW **0.3.0**.
- Vérifié en preview : import de l'exemple (10 élèves fictifs) → 6A créée, accents/homonymes corrects, ré-import = 10 doublons, édition fiche persistée, cascade OK, décodage 1252 OK, console propre.

## 2026-06-11 — v0.2.0 : Phase 1 (socle) presque complète

- **Sauvegarde** (`#/sauvegarde`) : export JSON complet (option pièces jointes, blobs en base64), import avec validation + double confirmation + export de sécurité automatique, purge totale protégée. Round-trip vérifié (données + blob restaurés à l'identique).
- **Réglages** (`#/reglages`) : établissement, année scolaire (store meta), thème auto/clair/sombre persisté, stockage (usage, quota, `storage.persist`), version et bouton « Vérifier les mises à jour » (BIBLE règle 5).
- `storage.persist()` demandé au démarrage ; thème sombre pilotable (`data-theme`) en plus du mode auto.
- Icônes : nav emoji → SVG Lucide inline (MIT) ; PNG 192/512 + maskable générés par `tools/gen-icons.ps1` (WPF, zéro dépendance), ajoutés au manifest.
- Service-worker **0.2.0** (nouveaux assets précachés) ; routes enfants sous « Plus ».
- Reste en phase 1 : test Android réel + installation PWA (HTTPS requis), test Playwright (validation dépendance npm à donner).

## 2026-06-11 — Phase 0 : création du projet

- Instanciation depuis `DEV_APP/template` (BIBLE, commandes, skills conservés verbatim).
- Cadrage complet dans `docs/` : brief, fonctionnalités, architecture, modèle de données, échanges Pronote, roadmap (phases 0→9), décisions D001–D008, journal.
- Squelette applicatif `app/` : shell PWA navigable (6 onglets), tokens CSS clair/sombre, wrapper IndexedDB (13 stores), manifest, service-worker versionné network-first (enregistré uniquement hors localhost).
- Jeu d'essai `app/data/exemple_eleves_pronote.csv` (données fictives).
- Serveur de dev `server-carnet.mjs` (port 8160) + config `carnet-eps` dans `_TEMPO/.claude/launch.json`.
