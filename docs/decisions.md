# Décisions actées

Format : `Dxxx — date — décision` puis contexte / alternatives écartées / conditions de réexamen.
Une décision actée ne se rediscute pas à chaque session ; on la rouvre si ses conditions changent.

---

## D001 — 2026-06-11 — Repartir du template projet tel quel

Le projet instancie le template projet (aujourd'hui `30_APPLICATIONS/RESSOURCES_IA/template-projet`) : BIBLE, commandes (`/cadrer`, `/dev-feature`…), skills (`architecte-refactor`, `pwa-offline`, `qualite-frontend`) conservés verbatim. Évite une convention parallèle.

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

## D007 — 2026-06-11 — Nom « Carnet EPS », dossier `carnet-eps`, port 8160

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

## D012 — 2026-09-06 — Seuil d'alerte sur le cumul annuel, vision par trimestre

Audit du 2026-09-05 (B30) : le seuil ⚠ « 3 oublis de tenue / 3 dispenses « mot » » cumulait toute l'année alors que `fonctionnalites.md` §4 annonçait « sur le trimestre ». Décision de l'utilisateur : **les deux** — l'alerte reste sur le **cumul de l'année scolaire** (un élève qui oublie sa tenue trois fois, même étalées, doit être signalé), et une **vision par trimestre** vient situer ce cumul (conseils de classe, familles).
- **Année scolaire** : d'août à juillet (`anneeScolaireDe`). **Trimestres** : fins de T1 et T2 réglables dans Réglages (`meta.finTrimestre1/2`), retenues seulement si elles tombent dans l'année scolaire concernée (un réglage périmé après la purge de rentrée est ignoré), sinon **15/12 et 15/03**. T3 va jusqu'au 31/07.
- **Où** : fiche élève (tableau T1 · T2 · T3 · Année par statut + signalement « sur l'année (T2 : n) »), récap de classe (périodes rapides T1/T2/T3/Année), alertes de l'accueil et du Suivi, pastille ⚠ de l'appel (détail du trimestre de la séance).
- **Comment** : la date d'un appel vit sur sa séance → `compterStatutsParTrimestre(appels, seances, bornes)` (jointure en mémoire, appels orphelins ignorés). Aucun nouveau store, aucune migration.
**Écartés** : fenêtre glissante (moins lisible pour un conseil de classe), seuil par trimestre seul (perdrait la vue longue).
*Réexamen si* : un établissement fonctionne en semestres (ajouter un mode « 2 périodes » : une seule borne).
*Amendement 2026-09-07 (v0.12.9, A06)* : les bornes de l'année scolaire (`bornesTrimestres().debut`) partent du **1er août** et non du 1er septembre, comme `anneeScolaireDe` — une séance de pré-rentrée (fin août) comptait pour l'année précédente. Bornes inversées (T2 ≤ T1) → défauts pour les deux, valeur ignorée signalée dans Réglages.

## D013 — 2026-09-07 — Pré-remplissage de l'appel selon le type et l'origine de l'inaptitude

5e audit (C01, B02) : toute inaptitude active pré-remplissait « Inapte (certificat) », non pratiquant — y compris une inaptitude **partielle** (l'élève pratique avec restrictions) et une inaptitude fondée sur un **mot des parents** (statut `dispense` prévu pour ça) ; et « Terminer l'appel » sur une séance passée marquait « présent » les élèves sous certificat. Règle adoptée (GO discrétionnaire « fait au mieux ») :
- **Une inaptitude par élève**, la plus contraignante (totale > partielle) parmi celles actives à la date de la séance.
- **Totale** → statut d'office : `inapte` si origine certificat ou infirmerie, `dispense` si origine « mot des parents ». **Partielle** → `present` (pratique aménagée), signalée par la pastille 🩺 (infobulle « partielle »).
- Le pré-remplissage n'écrit que pour la séance du jour (D011/A14) ; **« Terminer l'appel »** applique la même règle aux élèves non saisis (au lieu de « présent » pour tous), quelle que soit la date de la séance.
- **Conséquence assumée** : les « dispensé (mot) » posés d'office comptent dans le seuil D012 — trois séances couvertes par un seul mot des parents déclenchent « penser famille / vie scolaire » (un certificat est attendu au-delà de quelques séances). Trois relecteurs de la revue du lot 1 y ont vu une alerte fabriquée ; l'audit (C01) et quatre réfutateurs y voient l'effet voulu.
- **Départage** entre deux inaptitudes actives : totale > partielle, puis certificat > infirmerie > mot (déterministe, indépendant de l'ordre des identifiants).
**Écartés** : statut `infirmerie` pour l'origine infirmerie (il signifie « parti à l'infirmerie pendant le cours ») ; pré-remplir la partielle en `inapte` (fausse le compteur de pratiquants) ; marquer les enregistrements posés d'office (`auto`) pour les exclure du seuil (retiré du cadre de D012, à rouvrir si le terrain trouve l'alerte gênante).
*Réexamen si* : besoin d'un statut « aménagé » distinct pour les partielles (compte pratiquant, mais tracé) ; alerte « 3 dispenses » jugée parasite pour une inaptitude sur mot déclarée → exclure les enregistrements posés d'office du seuil.
