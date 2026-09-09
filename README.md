# Carnet EPS

> Le carnet de bord numérique du professeur d'EPS — **PC + Android**, 100 % local, hors ligne, gratuit.
> Équivalent libre des applications iOS type « Tablette EPS », avec passerelle **Pronote** (import élèves, export notes).

**➡️ Application en ligne : https://alemoine4.github.io/carnet-eps/** — installable en PWA (PC + Android), guide : `docs/guide-installation.md`.

## Ce que fait l'application

| Module | En bref |
|---|---|
| 🏠 Aujourd'hui | Cours du jour, alertes (certificats qui expirent, inaptitudes en cours, oublis de tenue répétés) |
| 📅 EDT | Emploi du temps EPS : créneaux, semaines A/B, installations (gymnase, piscine…) |
| ✋ Appel | Appel tactile rapide : présent / absent / retard / dispensé / inapte / oubli de tenue / infirmerie |
| 👥 Élèves | Classes et élèves importés depuis Pronote (CSV), fiche élève avec historique complet et **observations** (notes terrain en 2 taps) |
| 📈 Suivi | Alertes élèves agrégées : inaptitudes qui expirent, seuils d'oublis de tenue/dispenses, notes non remontées |
| 🩺 Inaptitudes | Inaptitudes totales/partielles, dates, restrictions, photo du certificat médical, alertes d'expiration |
| 📊 Notes | Évaluations par séquence (note /20, barème, AFL), saisie en grille, **export vers Pronote** |
| 📁 Documents | Bibliothèque locale : fiches, projets de séquence, convocations… |
| 💾 Sauvegarde | Export/import JSON complet (transfert PC ↔ Android), purge de fin d'année |

## Principes non négociables

- **Aucune donnée élève ne quitte l'appareil** : pas de cloud, pas de compte, pas de réseau requis (voir BIBLE.md règle 4).
- **Zéro dépendance** : HTML/CSS/JS vanilla, aucun framework, aucun CDN.
- **PWA installable** : icône sur l'écran d'accueil Android et sur le bureau PC, fonctionne sans connexion.
- **Pronote sans API** : import des élèves par CSV exporté de Pronote ; remontée des notes par copier-coller ou CSV (voir `docs/pronote.md`).

## Démarrage rapide (dev)

```
node server-carnet.mjs          # sert app/ sur http://localhost:8160
```

À lancer depuis la racine du dépôt : le serveur se repère tout seul (chemin relatif à `server-carnet.mjs`), le dossier peut donc être déplacé sans rien reconfigurer.

Aucune installation, aucun `npm install` : ouvrir `http://localhost:8160` dans Chrome/Edge.

## Structure du projet

```
carnet-eps/
├── CLAUDE.md            ← mémoire projet (rôle, méthode, repères) — lire en premier
├── BIBLE.md             ← règles inviolables (gratuité, données élèves, SW…)
├── README.md            ← ce fichier
├── CHANGELOG.md         ← historique des changements notables
├── TODO.md              ← état courant + prochaines actions
├── server-carnet.mjs    ← mini serveur statique de dev (port 8160)
│
├── app/                 ← code applicatif (la PWA)
│   ├── index.html
│   ├── manifest.webmanifest
│   ├── service-worker.js
│   ├── css/   (base, components, responsive)
│   ├── js/    (main, state, ui, io, metier, media + modules/)
│   ├── assets/icons/
│   └── data/  (jeux d'essai CSV — données fictives uniquement)
│
├── docs/                ← cadrage, suivi et documents de décision
│   ├── brief.md             vision, utilisateurs, périmètre
│   ├── fonctionnalites.md   spécification détaillée par module
│   ├── architecture.md      choix techniques, couches, PWA
│   ├── modele-donnees.md    stores IndexedDB, schémas, RGPD
│   ├── pronote.md           import/export Pronote (formats, limites)
│   ├── roadmap.md           phases 0 → 9 avec critères de sortie
│   ├── decisions.md         décisions actées (D001…)
│   ├── journal.md           journal de bord des sessions
│   ├── deploiement.md       mise en ligne, historique des versions, rollback
│   ├── guide-installation.md · guide-rentree.md · test-terrain.md
│   ├── strategie.md         avis fondateur (méthode, outillage)
│   ├── audit-2026-07-10.md  rapport d'audit complet (16 constats, soldés)
│   ├── audit-2026-09-05.md  4e audit, 12 lentilles (34 constats ; suites v0.12.5→v0.12.7, reste B31)
│   └── avis/                avis avant application (AVIS_*.md, cf. BIBLE)
│
├── tests/               ← checklist manuelle + smoke-tests e2e Playwright (npm test)
├── archives/            ← versions gelées (ne pas toucher)
└── .claude/             ← commandes (/cadrer, /dev-feature…) et skills
```

## État du projet

**v0.12.15 — en ligne (2026-09-09 : lot 2, A39, restes du lot 5, audit V3 lot A ; 2026-09-08 : lots 4 et 5 ; 2026-09-07 : lots 1 et 3 du 5e audit ; 2026-09-06 : v0.12.4 = 4e audit, v0.12.5 = dédoublonnage, v0.12.6 = vision par trimestre, v0.12.7 = cascades atomiques, v0.12.8 = écritures durables et caches d'origine)** : phases 0→9 livrées (🎒 jalon rentrée 2026), tous les modules du tableau ci-dessus sont fonctionnels, vérifiés et **publiés** sur https://alemoine4.github.io/carnet-eps/. QA : Lighthouse Perf 97 / A11y 100 / BP 100, année complète simulée fluide (< 50 ms par écran), **8 smoke-tests + 186 tests de non-régression** Playwright (`npm test`), audit complet du 2026-07-10 soldé (v0.12.1 → v0.12.2), **4e audit du 2026-09-05** (34 constats, 30 traités en v0.12.4 — rapport `docs/audit-2026-09-05.md`) et **5e audit du 2026-09-07** (179 constats, lot 1 = 44 constats livrés en v0.12.9 : exactitude de l'appel et des alertes, validations, erreurs visibles, import plus strict ; lot 3 = 35 constats livrés en v0.12.10 : clavier, lecteur d'écran, vrais tableaux, 320 px, contraste, impression ; lot 4 = 17 constats livrés en v0.12.11 : service-worker durci, lectures par index, plafond des pièces ; lot 5 = 62 constats livrés en v0.12.12 : CSV robuste, import plus parlant, une transaction pour « Terminer l’appel », preuves des tests renforcées, docs alignées — rapport `docs/audit-2026-09-07.md`). Historique des versions et retour arrière : `docs/deploiement.md`.

Restent : les **validations terrain** (Pronote réel, Android réel, impression) listées en tête de `TODO.md`.

## Limites de sécurité à connaître (app 100 % locale)

- Les données vivent dans le navigateur (IndexedDB) : **pas de chiffrement fort** sans clé utilisateur. Verrouiller la session Windows/Android reste indispensable.
- Effacer les données de navigation du site = perte des données → faire des **exports JSON réguliers** (bouton Sauvegarde).
- Chaque appareil a ses propres données : la synchronisation PC ↔ Android se fait par export/import JSON (pas de sync automatique en v1).
- L'application peut être hébergée publiquement (GitHub Pages) sans risque : le code est public, **les données ne sont jamais embarquées**.
