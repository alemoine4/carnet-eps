# AVIS avant application — Créations atomiques (lot 2 du 5e audit : V2-06, D-04, D-06)

> Statut : **VALIDÉ ET APPLIQUÉ en v0.12.13** (2026-09-09) — validation par délégation (« fais comme tu penses le mieux »). Le plan ci-dessous a été suivi tel quel ; l'import CSV (fix 4) a conservé à l'identique les compteurs et les règles ajoutés depuis (D-13, C14, B46/C51). Conservé comme trace de la décision.
> Origine : audit du 2026-09-07 (`docs/audit-2026-09-07.md`), constats V2-06 (Codex), D-04 et D-06 (lentille données). Le lot 1 a rendu **atomiques** les suppressions, les annulations, l'import JSON et le pré-remplissage de l'appel ; restent les **créations** qui touchent un fichier et un enregistrement.
> Verdict proposé : **GO, un seul lot (v0.12.11 ou suivante)**, deux fichiers de socle (`io.js`, `media.js`) et quatre modules, cinq tests. Aucun nouveau fichier, aucune migration.

## 1. Diagnostic court

| ID | Constat | Sévérité | Où |
|---|---|---|---|
| **V2-06** | Créer une inaptitude avec pièce jointe = **3 transactions** : `stockerFichier` (put `fichiers`), put `certificats`, put `inaptitudes`. Si la 3e échoue (quota, onglet fermé), il reste un fichier et un certificat **sans inaptitude** : invisibles dans l'app, présents dans l'export. | P2 | `inaptitudes.js` création |
| **D-04** | Même schéma ailleurs : **document** (fichier puis document), **photo d'élève** (fichier, puis élève, puis suppression de l'ancienne photo), **retrait de photo** (élève puis suppression), **remplacement de pièce** (fichier, suppression de l'ancien certificat et de l'ancien fichier, put certificat, put inaptitude). Au remplacement, l'ancienne pièce est **supprimée avant** que la nouvelle référence soit écrite : une coupure entre les deux perd la pièce. | P2 | `documents.js`, `eleves.js`, `inaptitudes.js` |
| **D-06** | Import CSV Pronote : **une transaction par classe créée et par élève** (jusqu'à 150+) ; un import interrompu laisse une classe à moitié remplie, sans le dire. Contournable (ré-import idempotent depuis D-13), mais contraire à la règle tout-ou-rien du projet, et lent. | P3 | `eleves.js` `executerImport` |

Ce que le lot 1 a déjà donné : `ecrireLot` (une transaction multi-stores, requêtes émises d'un bloc, résolution au commit), `restaurer(objets)` (lot de `put`) et `supprimerLot(objets)` (lot de `delete`) — tous exportés par `io.js`.

## 2. Plan d'action (un seul lot)

### Fix 1 — `media.js` : préparer sans écrire
`stockerFichier(fichier)` est scindé : **`preparerFichier(fichier)`** fait tout le travail actuel (compression JPEG, plafond de taille, construction de l'enregistrement `{ id, blob, mime, nom, taille, dateAjout }`) **sans l'écrire** ; `stockerFichier` devient `enregistrer('fichiers', await preparerFichier(f))` (conservé pour compatibilité, plus aucun appelant après le lot).

### Fix 2 — `io.js` : un lot d'écritures mixtes
Nouvel export **`enregistrerLot(operations)`** = façade publique de `ecrireLot` acceptant `{ store, op: 'put', valeur }` et `{ store, op: 'delete', cle }` dans **une** transaction. `restaurer` et `supprimerLot` restent (cas homogènes).

### Fix 3 — les quatre créations, chacune en une transaction
| Geste | Lot écrit d'un bloc |
|---|---|
| Nouvelle inaptitude avec pièce | `put fichiers` + `put certificats` + `put inaptitudes` |
| Nouveau document avec pièce | `put fichiers` + `put documents` |
| Photo d'élève (ajout ou changement) | `put fichiers` (nouvelle) + `put eleves` (référence) + `delete fichiers` (ancienne) |
| Retrait de photo | `put eleves` + `delete fichiers` |
| Remplacement de pièce d'inaptitude | `put fichiers` + `put certificats` + `put inaptitudes` + `delete certificats` (ancien) + `delete fichiers` (ancien) |

La compression d'image (async, hors transaction) se fait **avant** ; les identifiants sont tirés avant ; la transaction ne contient que des `put`/`delete` synchrones. En cas d'échec : rien n'est écrit, l'ancienne pièce est **toujours là**, le message d'erreur existant s'affiche (les `try/catch` sont déjà en place depuis le lot 1).

### Fix 4 — import CSV en une transaction (D-06)
`executerImport` collecte `classesACreer[]`, `elevesACreer[]` et `elevesAReactiver[]` dans la boucle **sans écrire**, puis un seul `restaurer({ classes, eleves })`. Le résultat affiché (importés, réactivés, doublons, ignorés, classes créées) est identique ; l'import devient tout-ou-rien et nettement plus rapide (une transaction au lieu de 150).

### Vérification — 5 tests (`tests/e2e/audit5-lot2.spec.mjs`)
1. **Inaptitude** : `put` saboté sur le store `inaptitudes` (patch de `IDBObjectStore.prototype.put` qui lève pour ce store) → création refusée avec message, **0** fichier et **0** certificat en base.
2. **Remplacement de pièce** : même sabotage → l'ancien certificat et l'ancien fichier sont **intacts**, l'inaptitude pointe toujours vers l'ancien.
3. **Photo** : changement de photo saboté → l'ancienne photo est conservée et référencée.
4. **Document** : création sabotée → 0 fichier orphelin.
5. **Import CSV** : compter les appels à `IDBDatabase.prototype.transaction` pendant un import de 30 lignes → **1** (contre 31 aujourd'hui) ; sabotage de `put` sur `eleves` → 0 classe créée, 0 élève.

## 3. Fichiers modifiés
`app/js/io.js` (export `enregistrerLot`), `app/js/media.js` (`preparerFichier`), `app/js/modules/inaptitudes.js`, `documents.js`, `eleves.js` (photo + import), `tests/e2e/audit5-lot2.spec.mjs` (nouveau), docs (modele-donnees.md : règle « une création = une transaction »).

## 4. Tests à faire
`npm test` complet (suite actuelle 101 + 5) ; revue adversariale du diff (même dispositif que les lots 1 et 3) ; sur Android, ajouter une inaptitude avec photo puis la remplacer.

## 5. Outils utilisés
Playwright (dev, déjà validé D010). Aucun outil nouveau.

## 6. Confirmation gratuité
**Oui** — aucun outil ni dépendance ajouté.

## 7. Risques éventuels
- Une transaction qui contient un blob de 8 Mo (plafond du lot 4) est plus longue à valider : quelques centaines de ms sur Android, pendant lesquelles les autres écritures attendent. Sans effet pour un seul utilisateur.
- `stockerFichier` reste exporté : aucun test existant ne casse.
- Retour arrière : `git revert` du commit unique ; données non concernées (aucune migration).

**Écarté** : rendre `compresserImage` synchrone ou l'inclure dans la transaction (impossible : `createImageBitmap`/`toBlob` sont asynchrones et une transaction IndexedDB se ferme dès qu'on attend autre chose que ses propres requêtes).
