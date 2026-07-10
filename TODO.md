# TODO — Carnet EPS

État courant + prochaines actions. À mettre à jour à **chaque session** (voir rituel dans CLAUDE.md).
Vue d'ensemble des phases : `docs/roadmap.md`.

## 🎒 Jalon rentrée 2026 : phases 1→9 TERMINÉES — app EN LIGNE (https://alemoine4.github.io/carnet-eps/) — restent les validations terrain ci-dessous

## Phase active : post-v1 — audit complet du 2026-07-10 (corrections v0.12.1)

### Audit /audit-projet du 2026-07-10 (rapport : `_TEMPO\DEV_APP\AUDIT_DEV_APP_2026-07-10.md`)
- [x] 2026-07-10 — **Lot validé « GO »** (A1→A11, A15, A16) corrigé en v0.12.1 : observations dans le résumé sauvegarde/import + accords (A1/A2), erreurs visibles sur photo/pièce illisible (A3), date « aujourd'hui » en heure locale (A4), helpers dédupliqués sequences/reglages (A5), `numero` de séance documenté comme indicatif (A6), liens externes limités à http(s) (A7), fin des `alert()` natifs (A8), routeur protégé contre les rendus concurrents (A9), doublon bloqué au renommage de classe (A10), chevauchements EDT signalés (A11), conflit de séquences actives signalé sur l'accueil (A15), TODO nettoyé (A16).
- [ ] **Décisions produit en attente (audit A12/A13/A14)** : empiler les toasts d'annulation ? ne marquer « publiée » qu'après copie Pronote réussie ? limiter le pré-remplissage « inapte » à la séance du jour ?

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

- [ ] Scénario Tom sur **Android réel** : photo du certificat à la caméra (le `capture="environment"` ouvre l'appareil), lisibilité de la visionneuse
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
