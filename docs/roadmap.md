# Roadmap — Carnet EPS

Objectif : **utilisable en classe à la rentrée de septembre 2026** (phases 1→6).
Chaque phase a un **critère de sortie** vérifiable : on ne passe pas à la suivante sans le tenir (ou sans décision documentée).
Le détail opérationnel de la phase active vit dans `TODO.md`.

---

## ✅ Phase 0 — Cadrage & squelette *(2026-06-11)*

Arborescence depuis le template, docs de cadrage (brief, fonctionnalités, architecture, modèle de données, pronote, décisions), shell navigable, serveur de dev.

## ✅ Phase 1 — Socle technique *(2026-06-11, v0.2.0 — reste : installation PWA réelle via HTTPS, Playwright à valider)*

Shell UI finalisé (6 onglets, thème clair/sombre), wrapper IndexedDB opérationnel (12 stores + index), export/import JSON, réglages minimaux, `storage.persist()`, icônes PNG, PWA installable (test réel PC + Android via HTTPS), premier test Playwright.
**Sortie** : app installée sur le téléphone Android et le PC, navigation fluide, une donnée factice saisie survit au redémarrage, export/import JSON round-trip sans perte.

## ✅ Phase 2 — Classes & élèves (+ import Pronote) *(2026-06-11, v0.3.0 — reste : valider avec un vrai export Pronote du collège)*

CRUD classes/élèves, fiche élève (squelette), **import CSV/collage Pronote** avec mapping et gestion d'encodage.
**Sortie** : une classe réelle exportée de Pronote importée en moins d'une minute, accents corrects, doublons gérés.

## ✅ Phase 3 — EDT, séquences & séances *(2026-06-11, v0.4.0)*

Créneaux A/B + installations, vue semaine/jour, « cours en ce moment », séquences APSA/CA/AFL, séances numérotées auto.
**Sortie** : mon EDT réel saisi ; à l'ouverture à 7h55 un lundi, l'app propose la bonne classe et la bonne séance.

## ✅ Phase 4 — Appel & absences EPS ⭐ cœur de l'app *(2026-06-12, v0.5.0 — reste : chrono < 40 s sur téléphone réel)*

Écran d'appel tactile (tap = cycle, appui long = menu), 7 statuts, pré-remplissage inaptitudes, compteurs, historique, alertes tenue, récap CSV/impression.
**Sortie** : appel d'une classe de 28 en < 40 s sur téléphone ; récap trimestre imprimable ; test Playwright du scénario complet.

## ✅ Phase 5 — Inaptitudes & certificats *(2026-06-12, v0.6.0 — reste : capture caméra sur Android réel)*

CRUD inaptitudes (type, dates, restrictions), capture/compression photo certificat, visionneuse, alertes J-7 et > 3 mois, pastilles partout.
**Sortie** : scénario « Tom » du brief joué de bout en bout sur Android (photo réelle, alerte à l'expiration, signalement à l'appel).

## ✅ Phase 6 — Évaluations & notes + export Pronote *(2026-06-12, v0.7.0 — reste : collage réel dans le Pronote du collège = critère officiel)*

Types note20/barème/AFL, saisie grille mobile, moyennes/stats, codes ABS/DISP/NN, **copie presse-papiers + CSV**, marquage « publiée », relevés imprimables.
**Sortie** : les notes d'un cycle réel saisies dans l'app puis **collées avec succès dans le Pronote de l'établissement** (checklist `pronote.md` validée).

— 🎒 *Jalon rentrée 2026 : phases 1→6 livrées =  l'app remplace papier/tableur au quotidien.* —

## ✅ Phase 7 — Documents & tableau de bord *(2026-06-12, v0.8.0)*

Bibliothèque documents (tags, classes), tableau de bord « Aujourd'hui » (cours du jour, alertes agrégées, évaluations non publiées).
**Sortie** : l'écran d'accueil répond à « qu'est-ce qui m'attend aujourd'hui ? » sans aucun clic.

## ✅ Phase 8 — QA & durcissement *(2026-06-12, v0.8.1 — restent les cases « appareil réel » de tests/checklist.md)*

`tests/checklist.md` complète, axe-core, Lighthouse, volumétrie (6 classes × 28 élèves × 1 an simulé), round-trip sauvegarde avec pièces jointes, gestion d'erreurs (quota, import corrompu), revue RGPD finale.
**Sortie** : checklist 100 %, Lighthouse PWA/a11y ≥ 90, restauration complète vérifiée sur appareil vierge.

## ✅ Phase 9 — Distribution & rentrée *(2026-06-13, v0.9.1 — publié sur GitHub Pages : https://alemoine4.github.io/carnet-eps/ ; reste les installations PWA réelles)*

GitHub Pages (code seul), guide d'installation PC/Android, procédure de rentrée (purge + nouvel import + EDT), bouton « Vérifier les mises à jour ».
**Sortie** : installation de zéro sur un appareil neuf en < 5 min en suivant le guide.

## ✅ Suites — audit UX *(2026-06-13, skill impeccable, 31/40 « Bon » — entièrement traité)*

Corrections post-v1 issues de l'audit (détail : `AVIS_APPEL_ACCESSIBILITE.md`).
- ✅ **P1** — accessibilité de l'appel : `<dialog>` natif + bouton « ⋯ », les 7 statuts au clavier/lecteur d'écran.
- ✅ **P2** — texte de statut lisible, retour d'appui long (barre + vibration + reduced-motion), pastilles vert/orange WCAG AA, bordures de statut thématisées clair/sombre (`--stb-*`).
- ✅ **P3** — liseré des cartes « Plus » remplacé (bordure + chevron) ; écran « Aide » in-app (route `#/aide`).
- ✅ Visionneuse `media.js` passée en `<dialog>` natif ; CSS mort `.feuille-fond` supprimé.
- ✅ Durcissement sécurité (v0.9.2) : garde `data:` à l'import JSON + échappement/anti-formule CSV (`champCSV`).
- ✅ Confort (v0.9.3) : pastille de statut thématisée (clair + sombre) + raccourcis clavier PC sur l'appel.
- **Déployé en ligne (v0.9.3)** : https://alemoine4.github.io/carnet-eps/ — reste les validations terrain (`docs/test-terrain.md`).

## 🔶 Feuille de route post-v1 (pilotage architecte, 2026-06)

Versions courtes, vérifiées (smoke-tests Playwright), taguées (rollback : `docs/deploiement.md`).
- ✅ **Sécurité des suppressions** : v0.10.0 confirmation `<dialog>` + v0.10.1 annulation « Annuler » 8 s (restaure la cascade).
- ✅ **Smoke-tests** Playwright (dev) — 8 parcours critiques.
- ✅ **Onglet « Suivi »** (v0.11.0) — alertes EPS + inaptitudes sorties de « Plus » ; EDT déplacé dans « Plus ».
- ✅ **Observations** (notes terrain, v0.12.0) — store IndexedDB v2 (migration additive, D009), timeline + formulaire sur la fiche élève.
- ✅ **Audit complet /audit-projet** (2026-07-10, rapport `_TEMPO\DEV_APP\AUDIT_DEV_APP_2026-07-10.md`) — 16 constats soldés en v0.12.1 (corrections) + v0.12.2 (arbitrages D011).
- 🔲 Dashboard enrichi · évaluations EPS A1–A5 · Pronote/appréciations · exports PDF (via impression) · corbeille persistante → jalon **1.0**.
- ⛔ Différé (anti-usine-à-gaz) : cloud, comptes, IA, refonte design-system, tableur avancé.

---

## Backlog (non planifié — y piocher, ne pas s'y perdre)

- Passerelle SEANCE_PLANNER (lier une séance à sa fiche) · import EDT iCal Pronote · OCR certificats · sync par fichier sur stockage personnel · multi-profs/partage · groupes (natation, menus) · trombinoscope imprimable · statistiques annuelles APSA · export chiffré (WebCrypto + phrase de passe)
