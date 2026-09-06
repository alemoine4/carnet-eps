# AVIS avant application — Cascades de suppression et restauration atomiques (audit 2026-09-05, B29)

> Statut : **VALIDÉ (« go pour les deux phases ») ET APPLIQUÉ le 2026-09-06 — v0.12.7** : phase 1 (`io.js` : `ecrireLot`, `supprimerLot`, `restaurer`, 3 cascades, `importerJSON`) + phase 2 (`notes.js`, `inaptitudes.js`, `documents.js`) dans la même version ; 3 tests d'atomicité ajoutés, suite existante inchangée.
> Déclencheur : BIBLE règle 6 — refactor de la couche données (`io.js`) = changement structurant, avis avant application.
> Verdict proposé : **GO, en deux phases**, la première limitée à **un seul fichier** (`io.js`), livrée seule en v0.12.7.

## 1. Diagnostic court

Toutes les suppressions « en cascade » et toutes les restaurations (« Annuler » des toasts) sont aujourd'hui des **suites de transactions IndexedDB indépendantes** : chaque `supprimer()` / `enregistrer()` du wrapper ouvre sa propre transaction (`io.js` l. 81-95). Concrètement :

| Opération | Code (v0.12.6) | Transactions pour un élève de 28 appels, 2 inaptitudes, 1 certificat, 6 notes, 3 observations |
|---|---|---|
| Supprimer un élève | `supprimerEleveEnCascade` (`io.js` l. 344-377) | **≈ 42** (une par enregistrement + lectures) |
| Supprimer une séquence | `supprimerSequenceEnCascade` (l. 324-342) → séances → appels, évaluations → notes | jusqu'à plusieurs **centaines** (10 séances × 28 appels) |
| Annuler une suppression | `restaurer()` (l. 380-385) : une transaction par enregistrement | idem |
| Supprimer une évaluation | `notes.js` l. 335-336 (notes puis évaluation) | N + 1 |
| Supprimer une inaptitude / un document | `inaptitudes.js` l. 352-356, `documents.js` l. 133-134 (fichier, puis certificat/document) | 2 à 3 |
| Importer une sauvegarde | `importerJSON` (l. 180-212) : **une transaction par store** (14) | 14 |

Conséquence : si l'onglet est fermé, la PWA tuée par Android, ou si une erreur IndexedDB survient **au milieu** de la séquence, la base reste **à mi-chemin** :
- suppression d'élève interrompue → ses appels/notes déjà effacés, l'élève et le reste toujours là (l'ordre choisi — l'élève en dernier — évite au moins les orphelins « invisibles ») ;
- **annulation interrompue → restauration partielle** : c'est le cas le plus gênant, l'utilisateur croit avoir tout récupéré ;
- import interrompu après le 5e store → moitié ancienne base, moitié nouvelle (B02 rend l'échec *par le contenu* impossible, mais pas l'interruption).

Probabilité faible (quelques dizaines de millisecondes), gravité réelle (données élèves), réparation manuelle pénible : c'est un défaut de **classe** (toutes les cascades), à corriger par la forme de la couche données, pas au cas par cas.

## 2. Plan d'action

Principe retenu : **lire d'abord, écrire en une seule transaction**. IndexedDB accepte une transaction `readwrite` sur **plusieurs stores** ; si toutes les requêtes d'écriture sont émises **de façon synchrone** dans cette transaction (aucun `await` entre elles), le navigateur la valide entièrement ou l'annule entièrement. Cela évite le piège connu des transactions qui se ferment pendant un `await` (aucune promesse étrangère n'est attendue à l'intérieur).

### Phase 1 — `io.js` seul (v0.12.7)

1. **Nouveau helper interne** `ecrireLot(operations)` : ouvre `db.transaction([stores concernés], 'readwrite')`, émet toutes les `put` / `delete` **synchronement**, résout sur `oncomplete`, rejette sur `onerror` / `onabort` (et `tx.abort()` sur exception synchrone, comme dans `importerJSON` depuis B02). Signature : `[{ store, op: 'put'|'delete', valeur | cle }]`.
2. **`restaurer(objets)`** → construit la liste des `put` depuis `{ store: [records] }` et appelle `ecrireLot` : **une transaction**, restauration tout-ou-rien.
3. **Nouvel export `supprimerLot(objets)`** : même forme d'entrée que `restaurer` (`{ store: [records] }`), émet les `delete` en une transaction. C'est la primitive que les modules utiliseront (phase 2).
4. **Cascades** : `supprimerSeanceEnCascade`, `supprimerSequenceEnCascade`, `supprimerEleveEnCascade` deviennent **collecte** (lectures par index, inchangées) **puis un seul `supprimerLot(objets)`**. Leur signature et leur valeur de retour `{ store: [records] }` ne changent pas → **aucun module à modifier** pour cette phase.
5. **`importerJSON`** : les lots sont déjà tous construits avant l'écriture (blobs reconstitués) → remplacer la boucle « une transaction par store » par **une transaction sur les 14 stores** (`clear` + `put`, synchrones) : l'import devient tout-ou-rien, y compris en cas d'interruption.
6. `apercuSuppression*` et `detailSuppression` : inchangés.

### Phase 2 — modules (v0.12.8, optionnelle mais recommandée)

Remplacer les mini-cascades écrites à la main par `supprimerLot` / `restaurer` :
- `notes.js` (évaluation + notes, et l'annulation qui refait N `enregistrer`) ;
- `inaptitudes.js` (fichier + certificat + inaptitude, et son annulation) ;
- `documents.js` (fichier + document, et son annulation).
Trois fichiers, ≈ 20 lignes en moins, comportement identique.

### Vérification

- Suite existante **25/25 inchangée** (smoke 5 et 8 couvrent déjà suppression d'élève + annulation + cascade observations ; B22 la suppression de classe).
- **Nouveaux tests (3)** :
  1. *Atomicité de la restauration* : `restaurer({ appels: [a1], eleves: [{ sans id }] })` doit **rejeter** et `a1` ne doit **pas** être réécrit (rien n'est passé) — même méthode que le test B02.
  2. *Atomicité de la suppression* : `supprimerLot({ appels: [a1], inconnu: [x] })` (store inexistant) rejette **avant** toute suppression, `a1` toujours présent.
  3. *Import tout-ou-rien* : un `importerJSON` dont un store échoue à l'écriture (clé dupliquée impossible avec `put`… → simuler via un `put` sur un store retiré de la transaction) laisse **tous** les stores intacts. Si la simulation s'avère trop artificielle, ce 3e test devient une vérification de compte (« 14 stores restaurés en une transaction ») et la garantie repose sur la forme du code.
- Contrôle manuel : supprimer un élève chargé (jeu d'essai) → toast → **Annuler** → fiche complète (appels, inaptitudes, certificat visible, notes, observations) ; import d'une sauvegarde complète avec pièces jointes.
- Mesure de performance avant/après sur la suppression d'une séquence de 10 séances × 28 appels (attendu : nettement plus rapide — une transaction au lieu de ~300).

## 3. Fichiers modifiés (prévus)

- **Phase 1** : `app/js/io.js` uniquement (+ `ecrireLot`, `supprimerLot` ; `restaurer`, 3 cascades et `importerJSON` réécrits sur ces helpers ; ≈ +40 / −30 lignes). `docs/modele-donnees.md` (règles d'intégrité : « cascades atomiques ») et `docs/architecture.md` (couche données).
- **Phase 2** : `app/js/modules/notes.js`, `inaptitudes.js`, `documents.js`.
- Tests : `tests/e2e/regressions.spec.mjs` (+3).
- Aucun nouveau fichier dans `app/` → liste `ASSETS` du service-worker inchangée ; **aucune migration de schéma** (`DB_VERSION` reste 2).

## 4. Tests à faire (après implémentation)

- [ ] `npm test` : 25 existants verts sans modification + 3 nouveaux.
- [ ] Supprimer un élève avec certificat photo → Annuler → la vignette du certificat s'affiche à nouveau (le blob est bien réécrit dans la même transaction que le certificat).
- [ ] Supprimer une séquence de 10 séances avec appels et notes → Annuler → compte identique dans Plus → Sauvegarde (résumé des données).
- [ ] Import d'une sauvegarde complète (avec pièces jointes) → rechargement → toutes les vues cohérentes ; import d'un fichier altéré → refusé, base intacte (B02, déjà testé).
- [ ] Console vide sur les 13 routes (smoke 1).

## 5. Outils utilisés

Éditeur, Playwright existant, DevTools (onglet Application → IndexedDB) pour le contrôle manuel. Rien de nouveau.

## 6. Confirmation gratuité

**Oui** — aucun outil ni dépendance ajouté (API IndexedDB native : transactions multi-stores prises en charge par tous les navigateurs cibles, Chrome/Edge/Firefox/Android).

## 7. Risques éventuels

- **Transaction qui se ferme prématurément** si un `await` non-IndexedDB se glisse entre deux requêtes : évité par construction (toutes les lectures ont lieu **avant**, toutes les écritures sont émises **synchronement**). À rappeler en commentaire dans `ecrireLot`.
- **Fenêtre lecture → écriture** : un enregistrement créé entre la collecte et la transaction (autre onglet) survivrait à la cascade. Application mono-utilisateur, fenêtre de quelques millisecondes : acceptable, documenté.
- **Grosses transactions** (séquence entière, import complet) : IndexedDB les gère (l'import à 10 000 appels passait déjà par une transaction par store en 1,9 s) ; mémoire inchangée (les lots sont déjà entièrement construits avant l'écriture).
- **Régression fonctionnelle** : signatures et retours conservés en phase 1, tests existants inchangés comme critère ; rollback = `git revert` d'un commit d'un seul fichier.
- **Hors périmètre** : la corbeille persistante (jalon 1.0) reste un sujet distinct ; elle s'appuiera naturellement sur `supprimerLot`/`restaurer` atomiques.
