# Décisions actées

Format : `Dxxx — date — décision` puis contexte / alternatives écartées / conditions de réexamen.
Une décision actée ne se rediscute pas à chaque session ; on la rouvre si ses conditions changent.

---

## D001 — 2026-06-11 — Repartir du template DEV_APP tel quel

Le projet instancie `DEV_APP/template` : BIBLE, commandes (`/cadrer`, `/dev-feature`…), skills (`architecte-refactor`, `pwa-offline`, `qualite-frontend`) conservés verbatim. Évite une convention parallèle.

## D002 — 2026-06-11 — PWA vanilla multi-fichiers, sans build, sans framework

ES modules natifs servis tels quels. **Écartés** : framework (React/Vue — interdit au démarrage par le template), bundler (Vite/esbuild — friction), build mono-fichier (contraire au template ; la portabilité est assurée par l'installation PWA, pas par un fichier unique).
*Réexamen si* : l'app devait être distribuée en double-clic sans serveur — on ajouterait alors un script de concat maison.

## D003 — 2026-06-11 — IndexedDB via wrapper maison (pas d'idb-keyval)

Le template suggère idb-keyval (BSD) « si volume » ; on choisit un wrapper promisifié maison (~80 lignes dans `io.js`) : zéro dépendance, contrôle des index et migrations. idb-keyval est clé/valeur pur, insuffisant pour nos requêtes par index (élèves par classe, appels par séance…).
*Réexamen si* : le wrapper devient douloureux (curseurs complexes, transactions multi-stores).

## D004 — 2026-06-11 — 100 % local, multi-appareil par export/import JSON

Aucun cloud, aucun compte. PC ↔ Android = fichier JSON transféré par l'utilisateur. Photos compressées (canvas → JPEG ≤ ~300 Ko) pour garder exports et stockage raisonnables.
**Écartés** : sync temps réel (serveur = coût + RGPD), WebRTC local (complexité).
*Réexamen si* : usage bi-appareil quotidien avéré devenant pénible (alors : sync par fichier sur stockage personnel, toujours sans serveur tiers).

## D005 — 2026-06-11 — Pronote par CSV / presse-papiers uniquement

Pas d'API Pronote publique côté prof. Import élèves : CSV/collage tolérant (séparateur, encodage, mapping). Export notes : colonne presse-papiers triée alpha (voie A) + CSV (voie B). Détail et garde-fous : `pronote.md`.
**Condition** : valider chaque format une fois sur le Pronote de l'établissement (checklist en fin de `pronote.md`).

## D006 — 2026-06-11 — L'appel réglementaire reste dans Pronote

Carnet EPS ne remplace pas l'appel vie scolaire et **ne remonte rien automatiquement**. Il trace le suivi EPS fin (tenue, inapte, infirmerie, dispense « mot ») et produit des récaps imprimables. Évite tout enjeu réglementaire et tout couplage fragile.

## D007 — 2026-06-11 — Nom « Carnet EPS », dossier `DEV_APP/carnet-eps`, port 8160

Nav 6 onglets : Aujourd'hui, Appel, Élèves, Notes, EDT, Plus. Serveur `server-carnet.mjs`, config preview `carnet-eps` (8160 — premier port libre après 8150/edt-eps).

## D008 — 2026-06-11 — Service-worker actif uniquement hors localhost

`network-first` sur `index.html`/manifest, `cache-first` sur les assets, version explicite, nettoyage des vieux caches (BIBLE règle 5). Non enregistré sur localhost pour un dev sans cache fantôme. Hébergement du **code seul** possible sur GitHub Pages (public) : aucune donnée n'est embarquée, les données restent dans le navigateur de chaque appareil.

## D009 — 2026-06-15 — Migrations de schéma IndexedDB additives (v2 : observations)

`onupgradeneeded` crée uniquement les **stores manquants** (jamais de suppression/transformation) → toute montée de version préserve les données existantes par construction. La v2 ajoute le store `observations` (notes terrain, index `eleveId`). Pas d'export auto **forcé** avant migration tant que les migrations restent additives (l'export reste recommandé et disponible). Une vraie transformation de données (future) imposerait, elle, l'export de sécurité préalable (BIBLE) et un `switch (e.oldVersion)`. Réexamen si une migration non additive devient nécessaire.

## D010 — 2026-06-15 — Tests : Playwright en dépendance de DEV uniquement

Smoke-tests des parcours critiques via Playwright (`tests/e2e/`). Dépendance **de dev** (gratuite, Apache-2.0) : jamais livrée (gh-pages ne déploie que `app/`, `node_modules/` ignoré) → l'app reste sans dépendance runtime (BIBLE règle 1). Le navigateur **du preview** ne déclenche pas l'événement `close` d'un `<dialog>` sur `close()` programmatique : se fier à Playwright/au vrai Chrome, pas au preview, pour la fermeture des feuilles.

## D011 — 2026-07-10 — Arbitrage audit A12/A13/A14 (v0.12.2)

Trois comportements tranchés « au mieux de l'usage terrain » (audit du 2026-07-10, validation utilisateur « fait le mieux ») :
- **A12 — toasts empilés** : les toasts s'empilent (conteneur `.toasts`, max 3, le plus ancien cède la place) au lieu de se remplacer → un « Supprimé — Annuler » n'est plus perdu quand deux suppressions s'enchaînent. `duree: Infinity` = toast persistant (utilisé par le toast de mise à jour, qui ne peut plus être écrasé).
- **A13 — « publiée » sur preuve seulement** : une évaluation n'est marquée « publiée le … » que sur preuve de copie (presse-papiers réussi, ou événement `copy` réel sur la zone de secours). L'export CSV ne marque plus. Un bouton manuel « Marquer remontée / Annuler le marquage » couvre les autres workflows et corrige les erreurs → l'alerte « pas encore remontée vers Pronote » redevient fiable.
- **A14 — consulter ≠ modifier** : le pré-remplissage « inapte » à l'ouverture d'un écran d'appel n'écrit en base que pour la **séance du jour**. Consulter un appel passé n'écrit plus rien (la pastille 🩺 reste affichée ; le statut peut toujours être posé à la main).
