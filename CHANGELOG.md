# CHANGELOG — Carnet EPS

Historique des changements notables. Format : date — résumé. Le détail vit dans `docs/journal.md`.

## 2026-06-13 — v0.9.2 : Campagne de tests + durcissement sécurité

- **Campagne de tests** (14 scénarios, harnais preview — Playwright MCP indisponible, profil verrouillé) : chargement sans erreur, navigation, création classe/élèves, persistance, appel 28 (compteurs + fast-path « Terminer »), 7 statuts, import Pronote, export CSV (contenu capturé), impression (déclenchement + `@media print`), 0 ressource externe, **XSS import CSV/JSON neutralisé**, a11y clavier du menu, responsive 360 px. **0 bug bloquant, 0 bug important fonctionnel.**
- **Sécurité — garde `data:` à l'import JSON** ([io.js](app/js/io.js)) : `importerJSON` ne reconstruit un blob que depuis une dataURL locale → un fichier de sauvegarde piégé (URL http dans `donnees`) **n'émet plus aucune requête réseau** (offline/RGPD garantis). Vérifié : URL piégée = 0 fetch, dataURL valide = blob reconstruit.
- **Sécurité — anti-injection de formule CSV** : helper `champCSV()` (RFC 4180 + préfixe `'` sur `= + - @`), appliqué aux exports téléchargés (récap absences, notes, relevé). Corrige aussi les champs non quotés (noms avec `;`/`"`). « Copier pour Pronote » (presse-papiers) inchangé.
- Détails : `AVIS_SECURITE_IMPORT_EXPORT.md`. Aucun changement de schéma ni d'UI.

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
