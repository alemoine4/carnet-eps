# TODO — Carnet EPS

État courant + prochaines actions. À mettre à jour à **chaque session** (voir rituel dans CLAUDE.md).
Vue d'ensemble des phases : `docs/roadmap.md`.

## 🎒 Jalon rentrée 2026 : phases 1→6 TERMINÉES (v0.7.0) — reste les validations terrain ci-dessous

## Phase active : Phase 9 — Distribution & rentrée

- [ ] **Publication GitHub Pages** (code seul, jamais de données — D008) : attendre le « go » d'Alexandre (« publie sur GitHub Pages »), créer le dépôt, pousser `app/`, activer Pages
- [ ] Tester l'installation PWA réelle depuis l'URL HTTPS (PC + Android) + bouton « Vérifier les mises à jour » après un déploiement
- [ ] `docs/guide-installation.md` : pas-à-pas PC et Android (avec les écrans Chrome)
- [ ] `docs/guide-rentree.md` : procédure de rentrée (purge avec archive → import Pronote → EDT → lundi de semaine A)
- [ ] Toast « nouvelle version disponible » quand un SW est en attente (reliquat phase 1)

## Validations terrain (Alexandre) — à faire avant la rentrée

- [ ] **Pronote réel** : import d'un export élèves du collège (phase 2) + collage d'une colonne de notes dans un service (phase 6) — checklist complète dans `docs/pronote.md`
- [ ] **Android réel** : navigation au pouce, chrono appel 28 élèves < 40 s (phase 4), capture caméra du certificat (phase 5)
- [ ] **Installation PWA** : dire « publie sur GitHub Pages » quand tu veux (HTTPS requis)
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
- [ ] **Tester l'installation PWA** sur Android et PC : nécessite HTTPS → publier `app/` sur GitHub Pages (me dire « publie sur GitHub Pages » quand tu veux)
- [ ] Premier test Playwright — ⚠ dépendance npm : à valider explicitement avant installation (BIBLE) ; alternative en place : vérifs preview_eval scriptées
- [ ] Toast « nouvelle version disponible » quand un SW est en attente (le bouton MAJ existe déjà dans Réglages)

## Reliquat phase 2 (validation terrain)

- [ ] **Valider l'import avec un vrai export Pronote du collège** (encodage, en-têtes réels, effectif complet) — critère de sortie officiel de la phase 2, checklist dans `docs/pronote.md`
- [ ] Photo de l'élève sur la fiche (pipeline photo/compression mutualisé avec les certificats, prévu phase 5)

## À faire ensuite (phases 4+, voir roadmap)
- [ ] Phase 4 — Appel : écran tactile, statuts, historique, stats tenue
- [ ] Phase 5 — Inaptitudes & certificats : photos compressées, alertes d'expiration
- [ ] Phase 6 — Notes : saisie grille + **export Pronote** (presse-papiers + CSV) à valider sur le Pronote de l'établissement
- [ ] Phase 7 — Documents + tableau de bord « Aujourd'hui »
- [ ] Phase 8 — QA : checklist complète, axe-core, Lighthouse, volumétrie, round-trip sauvegarde avec vraies photos
- [ ] Phase 9 — Distribution : guide d'installation + procédure de rentrée

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
