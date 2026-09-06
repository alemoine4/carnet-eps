# AVIS avant application — Durabilité des écritures, purge et export cohérents, caches d'origine (hypothèses Codex H01–H05)

> Statut : **EN ATTENTE DE VALIDATION** (rédigé le 2026-09-06). Aucun fichier de `app/` n'est modifié par cet avis.
> Origine : stratégie d'audit d'une autre IA (`audit codex/STRATEGIE_AUDIT.md`, section 5), dont les cinq hypothèses ont été **vérifiées contre le code par six vérificateurs indépendants** (lecture seule, fichier:ligne à l'appui). Les cinq sont démontrées.
> Verdict proposé : **GO, un seul lot (v0.12.8)**, trois fichiers de code, cinq tests, dont le premier test réel du service-worker.

## 1. Diagnostic court

| ID | Constat démontré | Sévérité | Où |
|---|---|---|---|
| **H03** | Le wrapper résout sur le **succès de la requête** (`req.onsuccess`), pas sur la **validation de la transaction** (`tx.oncomplete`). Un échec tardif au commit (quota plein, erreur disque : `QuotaExceededError` / `UnknownError` remontés à l'abort par Firefox, Safari et Chrome) laisse l'interface afficher « ✓ », un toast, un compteur, alors que rien n'est écrit. Cas réaliste : Android presque plein, photo d'élève ou certificat → référence enregistrée, blob absent ; au remplacement d'un certificat l'ancienne pièce est déjà supprimée. | **P2** | `io.js` `attendre` l. 59-64, `enregistrer`/`supprimer`/`vider` l. 81-95 |
| **H05** | À l'activation, le service-worker supprime **tous les caches de l'origine** sauf le sien (`k !== CACHE`, sans préfixe). Or Cache Storage est **par origine**, pas par scope, et `alemoine4.github.io` héberge aussi Le Bar Clandestin (Workbox, precache `workbox-precache-v2-https://alemoine4.github.io/bar-clandestin/`, dont le nettoyage est, lui, préfixé). Chaque déploiement de Carnet EPS efface donc le mode hors ligne de l'autre app sur les appareils où les deux ont été ouvertes. | **P2** | `service-worker.js` l. 46-52 |
| **H01** | La purge « Tout effacer » enchaîne **14 transactions** (`for … await vider(nom)`), `meta` en premier : une interruption laisse réglages effacés et données orphelines ; aucun `try/catch`, aucun retour d'erreur, bouton jamais désactivé. La règle d'atomicité écrite en v0.12.7 (`modele-donnees.md`) n'a pas été appliquée à la purge : oubli, pas exclusion. | P3 | `sauvegarde.js` l. 113-130 |
| **H02** | L'export lit les 14 stores en **14 transactions readonly successives** : une écriture d'un autre onglet peut s'intercaler (séance créée puis appels en deux `enregistrer`) → sauvegarde contenant des orphelins. Fenêtre réelle : de la milliseconde (stores) à la seconde (conversion des blobs). | P3 | `io.js` `exporterJSON` l. 123-147 |
| **H04** | `validerExport` ne détecte pas les **identifiants en double** : `put` écrase en silence, la confirmation annonce plus d'enregistrements qu'il n'en sera importé. Les références absentes et les statuts inconnus sont tolérés par l'interface (acceptable, à documenter) ; une sauvegarde de schéma 1 vide `observations` sans le dire (contrat « remplace tout », invisible dans le résumé). | P3 | `io.js` l. 151-174, `sauvegarde.js` l. 26-31 et 87 |

Réfutés / hors défaut : `skipWaiting` + `clients.claim` + toast `controllerchange` (conformes, BIBLE 5) ; les vues ignorent bien les orphelins ; l'export de sécurité précède bien purge et import.

## 2. Plan d'action (v0.12.8, un seul lot)

### Fix 1 — `io.js` : écritures unitaires durables (H03)
`enregistrer`, `supprimer`, `vider` passent par `ecrireLot` (qui résout déjà sur `tx.oncomplete`, rejette sur `onerror`/`onabort`, convertit une `DataError` synchrone en rejet propre) :
```js
export async function enregistrer(store, objet) { await ecrireLot([{ store, op: 'put', valeur: objet }]); return objet; }
export async function supprimer(store, id) { return ecrireLot([{ store, op: 'delete', cle: id }]); }
export async function vider(store) { return ecrireLot([{ store, op: 'clear' }]); }
```
`attendre` reste pour les lectures. Coût : un tour d'événements de plus par écriture (le `complete` suit le `success` de quelques ms) — imperceptible à l'appel.

### Fix 2 — `io.js` + `sauvegarde.js` : purge en une transaction (H01)
Nouvel export `viderTout()` = `ecrireLot(STORES.map((store) => ({ store, op: 'clear' })))`. Dans `sauvegarde.js`, la purge l'appelle dans un `try/catch` aligné sur l'import (bouton désactivé pendant l'opération, toast d'erreur explicite, rechargement seulement en cas de succès). `vider` reste exporté (tests e2e).

### Fix 3 — `io.js` : export = instantané cohérent (H02)
Helper interne `lireLot(stores)` : **une** transaction `readonly`, un `getAll` par store émis d'un bloc, résolution sur `oncomplete`. `exporterJSON` lit tout par `lireLot` puis convertit les blobs **hors** transaction (comme aujourd'hui) ; `compterTout` l'utilise aussi. Format d'export inchangé.

### Fix 4 — `io.js` + `sauvegarde.js` : doublons refusés, stores absents annoncés (H04)
Dans `validerExport`, un `Set` par store refuse un identifiant en double (« sauvegarde altérée : … identifiant en double … ligne N ») **avant** toute écriture, comme B02. `validerExport` renvoie aussi `absents` (stores manquants dans le fichier) ; la confirmation d'import affiche « Le fichier ne contient pas : observations → seront vidées » plutôt que de refuser (compatibilité des sauvegardes de schéma 1 conservée). `modele-donnees.md` précise : store absent = vidé ; références orphelines et statuts inconnus tolérés, pas de contrôle relationnel.

### Fix 5 — `service-worker.js` : ne nettoyer que ses caches (H05)
Une ligne : `cles.filter((k) => k.startsWith('carnet-eps-') && k !== CACHE)`. Les precaches déjà effacés du Bar Clandestin se reconstituent à son prochain chargement en ligne ; Workbox n'efface pas les caches « carnet-eps-* » (son nettoyage ne vise que `-precache-` de son propre scope), donc aucun changement côté whisky.

### Vérification — 5 tests dans `tests/e2e/regressions.spec.mjs`
1. **H03, mutant réel** : dans `page.evaluate`, envelopper le setter `onsuccess` de `IDBRequest.prototype` pour appeler `this.transaction.abort()` juste après le handler (la transaction est encore active pendant le dispatch) → avant correctif `enregistrer` résout, après il **rejette** (`AbortError`) et l'enregistrement est absent.
2. **H01** : compter les appels à `IDBDatabase.prototype.transaction` pendant `viderTout()` → **1** appel, 14 stores, puis `compterTout()` tout à zéro.
3. **H02** : lancer `exporterJSON` sans l'attendre, écrire aussitôt une séance et un appel, attendre le dump → aucun des deux n'y figure (la transaction readonly a été ouverte avant).
4. **H04** : dump avec un identifiant doublé → refus « identifiant en double », base intacte ; dump sans `observations` → confirmation mentionnant le store absent (test du texte via `validerExport`).
5. **H05, premier test réel du service-worker** : naviguer sur `http://[::1]:8160/` (adresse de bouclage = contexte sécurisé, mais `estLocalhost()` est faux → le SW **s'enregistre**) ; créer au préalable `caches.open('autre-app-test')` et `caches.open('carnet-eps-0.0.1')` ; attendre `navigator.serviceWorker.ready` + activation ; vérifier `caches.has('autre-app-test') === true` et `caches.has('carnet-eps-0.0.1') === false`. Ce même harnais ouvre la voie à un smoke « hors ligne » (`context.setOffline(true)` puis rechargement) noté comme lacune par Codex.

Suite existante : 28 tests **inchangés** comme critère de non-régression.

## 3. Fichiers modifiés (prévus)

- `app/js/io.js` (H03 : 3 fonctions ; H01 : `viderTout` ; H02 : `lireLot`, `exporterJSON`, `compterTout` ; H04 : `validerExport`) ≈ +45 / −20 lignes
- `app/js/modules/sauvegarde.js` (purge, message de confirmation) ≈ +12 / −4
- `app/service-worker.js` (1 ligne) + bump `VERSION` / `VERSION_APP` → 0.12.8
- `tests/e2e/regressions.spec.mjs` (+5 tests), `tests/e2e/README.md`
- Docs : `modele-donnees.md` (import : store absent = vidé, pas de contrôle relationnel ; purge atomique), CHANGELOG, journal, TODO, `deploiement.md`
- Aucun nouveau fichier dans `app/` (liste `ASSETS` inchangée), aucune migration.

## 4. Tests à faire (après implémentation)

- [ ] `npm test` : 28 existants verts sans modification + 5 nouveaux.
- [ ] Plus → Sauvegarde → **Effacer toutes les données** : sauvegarde `avant-purge` téléchargée, base vide, rechargement ; relancer la purge sur base vide → aucun message d'erreur.
- [ ] Import d'une sauvegarde v0.12.x complète (avec pièces) → toutes les vues cohérentes ; import d'un fichier sans `observations` → la confirmation le dit.
- [ ] Sur un appareil où Le Bar Clandestin est installé : ouvrir Carnet EPS après déploiement, puis Bar Clandestin en mode avion → il se charge toujours (à noter dans `test-terrain.md`).
- [ ] Appel de 28 élèves : aucun ralentissement perceptible au tap (H03).

## 5. Outils utilisés

Éditeur, Playwright existant (dont une navigation sur `[::1]` pour le service-worker), DevTools. Rien de nouveau.

## 6. Confirmation gratuité

**Oui** — aucun outil ni dépendance ajouté.

## 7. Risques éventuels

- **H03** : toute écriture attend désormais le commit. Latence supplémentaire de quelques ms, invisible ; en contrepartie une erreur de quota devient **visible** (rejet → toast « Statut non enregistré » déjà en place sur l'appel depuis B04, `Affichage impossible` ailleurs). Les fixtures Playwright (boucles de 28 `enregistrer`) restent sous la seconde.
- **H02** : `lireLot` ouvre une transaction sur 14 stores le temps des `getAll` : les écritures d'un autre onglet attendent quelques ms. Sans effet pour un seul utilisateur.
- **H05** : si un cache `carnet-eps-*` orphelin existait d'une version très ancienne, il est toujours nettoyé (préfixe conservé). Aucun risque pour les autres apps.
- **Test H05 sur `[::1]`** : dépend du serveur de dev à l'écoute en IPv6 (Node écoute en double pile par défaut) ; si l'environnement ne le permet pas, le test bascule sur `127.0.0.2` ou est marqué `skip` avec raison explicite — jamais un faux vert.
- Retour arrière : `git revert` du commit unique, données non concernées.
