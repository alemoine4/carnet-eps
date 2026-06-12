# Architecture — Carnet EPS

## Vue d'ensemble

PWA **vanilla** (HTML/CSS/JS ES modules), multi-fichiers, **sans étape de build**, sans framework, sans dépendance — conforme au template DEV_APP et à la BIBLE. Une seule page (`app/index.html`), navigation par hash-router, données dans IndexedDB.

```
┌─ app/index.html ────────────────────────────────┐
│  header (titre + contexte)                      │
│  <main> … vues rendues par le router …          │
│  nav (6 onglets, bas sur mobile / côté sur PC)  │
└─────────────────────────────────────────────────┘
        │
        ├─ js/main.js    boot, routes, enregistrement SW (hors localhost)
        ├─ js/ui.js      registre de vues, helpers DOM, composants communs
        ├─ js/state.js   état en mémoire + pub/sub + préférences (localStorage)
        ├─ js/io.js      wrapper IndexedDB + import/export (JSON, CSV) + fichiers/blobs
        └─ js/modules/   un fichier par module métier (à partir de la phase 2)
```

## Couches et responsabilités

| Couche | Fichier | Rôle | Interdits |
|---|---|---|---|
| Boot/Router | `main.js` | démarrage, table des routes, SW | logique métier |
| Vues | `ui.js` + `modules/*.js` | rendu DOM, interactions | accès direct à IndexedDB (passer par `io.js`) |
| État | `state.js` | état courant (route, contexte), pub/sub, préférences | persistance métier |
| Données | `io.js` | IndexedDB (CRUD + index), export/import JSON, parse CSV | manipulation du DOM |

Règle de croissance : **un module métier = un fichier** dans `modules/` (ex. `appel.js`) qui exporte `enregistrerVue()`. `main.js` importe les modules ; jamais l'inverse entre modules (passer par `state.js`/événements).

## Navigation

- Hash-router : `#/accueil`, `#/edt`, `#/appel`, `#/eleves`, `#/notes`, `#/plus` (+ sous-routes `#/eleves/<id>` plus tard).
- 6 onglets : barre **en bas** sur mobile (pouce), **latérale** ≥ 900 px (PC).
- L'onglet « Plus » regroupe : Inaptitudes & certificats, Séquences, Documents, Sauvegarde, Réglages.

## Stockage

- **IndexedDB** `carnet-eps` (wrapper maison promisifié dans `io.js`, décision D003 — pas d'idb-keyval) : 13 stores, schéma détaillé dans `modele-donnees.md`.
- **localStorage** `carnet-eps:prefs` : préférences UI uniquement (thème, dernier onglet) — jamais de données élèves.
- **Blobs** (photos certificats, documents) : store dédié `fichiers`, compression canvas→JPEG avant écriture.
- `navigator.storage.persist()` demandé au premier lancement (évite l'éviction silencieuse sur Android).

## PWA & hors ligne (BIBLE règle 5)

- `manifest.webmanifest` : standalone, icônes 192/512 (PNG à générer, SVG en attendant), fr.
- `service-worker.js` **versionné** (constante `VERSION` à incrémenter à chaque déploiement) :
  - `network-first` pour `index.html` et `manifest.webmanifest` (jamais de version morte) ;
  - `cache-first` pour css/js/icônes ;
  - nettoyage des vieux caches à l'activation.
- **Enregistré uniquement hors localhost** → le dev local ne voit jamais le cache SW.
- Bouton « Vérifier les mises à jour » dans Réglages + toast quand un nouveau SW est en attente.

## PC + Android

- Mobile-first (le terrain prime), cibles tactiles ≥ 44 px, layout bureau en `responsive.css`.
- Installation : Chrome/Edge → « Installer l'application » (PC) ; Chrome Android → « Ajouter à l'écran d'accueil ». Nécessite HTTPS → hébergement **GitHub Pages** (gratuit) du code seul ; en local PC, `http://localhost` est aussi considéré sécurisé.
- Les données restent par appareil ; transfert par export/import JSON (v1).

## Impression / PDF

`window.print()` + `@media print` (pas de lib PDF) : listes d'appel, récap absences/tenue, relevés de notes, registre d'inaptitudes.

## Vérification en dev

- Serveur : `node server-carnet.mjs` (port 8160, no-cache), config preview `carnet-eps`.
- `preview_snapshot` / `preview_eval` (le screenshot time out sur ce poste), console via `preview_console_logs`.
- Playwright pour les scénarios critiques (appel complet, import CSV, export notes) à partir de la phase 4.
