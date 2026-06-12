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
