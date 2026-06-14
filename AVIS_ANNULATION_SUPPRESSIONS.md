# AVIS avant application — Suppressions : confirmation cohérente + filet d'annulation (P1)

> Issu de l'audit du 2026-06-13 (problème **P1** : risque de perte de données élèves).
> Statut : **proposition, aucun code modifié.** À valider avant implémentation (BIBLE : changement transverse → AVIS).

---

## 1. Diagnostic court

Toutes les suppressions passent par **`confirm()` natif** (11 occurrences, 7 modules), dont des **cascades lourdes** :

| Action | Cascade | Fichier |
|---|---|---|
| Supprimer un **élève** | appels + inaptitudes + certificats + notes + photos | `eleves.js:410` (double confirm) |
| Supprimer une **séquence** | séances + appels + évaluations + notes | `sequences.js:205` (double confirm) |
| Supprimer une **séance** | appels | `sequences.js:186` |
| Supprimer une **évaluation** | notes | `notes.js:304` |
| Supprimer une **inaptitude** | pièce jointe | `inaptitudes.js:336` |
| Supprimer un **document** | fichier | `documents.js:127` |
| Supprimer une **classe vide** | — | `eleves.js:172` |
| Supprimer un **créneau EDT** | — | `edt.js:115` |
| Import / Purge totale | tout | `sauvegarde.js` (déjà double confirm + export auto) |

Problèmes : `confirm()` natif est **non stylé**, incohérent avec le reste (le menu d'appel est déjà un `<dialog>`), **facile à valider par erreur** au pouce, et surtout **il n'y a aucune annulation** : une fois confirmé, c'est définitif (« aucune corbeille » est même écrit à l'utilisateur). C'est le **seul vrai risque de perte de données** restant.

## 2. Plan d'action — en 2 phases (la phase 1 suffit à lever le P1)

### Phase 1 (recommandée, faible risque) — confirmation cohérente et accessible
Helper `confirmer({ titre, message, detail, motDanger })` dans `ui.js`, basé sur le `<dialog>` natif existant (réutilise/étend `ouvrirFeuille`) :
- Retourne une `Promise<boolean>`.
- Boutons explicites **« Annuler » (par défaut, focus initial)** et **« Supprimer » (rouge, `btn-danger`)** → on ne confirme pas par réflexe.
- Affiche le **détail des conséquences** (ex. « supprime aussi 23 appels et 4 notes ») — calculé avant via les compteurs de cascade.
- Échap / clic sur le fond = Annuler (acquis du `<dialog>`).
- Remplace les 11 `confirm()`. Les doubles confirmations (élève, séquence, purge) deviennent **une** boîte claire avec le détail (plus besoin d'enchaîner deux `confirm`).

→ Effet : suppressions cohérentes, lisibles, accessibles, beaucoup plus dures à déclencher par erreur. **Lève le P1.**

### Phase 2 (optionnelle) — annulation réelle (« Annuler » pendant 8 s)
Filet « undo » après suppression : 
- Avant de supprimer, **collecter les objets** qui seront effacés (les fonctions de cascade dans `io.js` renvoient déjà des compteurs → les faire renvoyer aussi les enregistrements).
- Supprimer, puis afficher un **toast « Supprimé — Annuler »** (helper toast réutilisable dans `ui.js`).
- Sur « Annuler » : `enregistrer()` en lot les objets sauvegardés (restauration). Sinon, au bout de ~8 s, c'est définitif.
- Périmètre conseillé : suppressions **simples** d'abord (document, créneau, inaptitude, séance) ; les grosses cascades (élève, séquence) gardent au minimum la confirmation détaillée de la phase 1.

→ Plus de confort, mais touche `io.js` (cascades) → à faire dans un second temps.

## 3. Fichiers modifiés (prévus)

**Phase 1** :
- `app/js/ui.js` : **+** `confirmer()` (et un petit helper `toast()` réutilisable si on enchaîne sur la phase 2).
- `app/js/modules/eleves.js`, `sequences.js`, `notes.js`, `inaptitudes.js`, `documents.js`, `edt.js`, `sauvegarde.js` : remplacer les `confirm()` par `await confirmer(...)`, en passant le détail de cascade quand il est connu.

**Phase 2** (si retenue) : `app/js/io.js` (cascades renvoient les objets), + appels de suppression dans les modules.

## 4. Tests à faire
- Chaque suppression : la boîte s'ouvre, **« Annuler » a le focus**, Échap annule, « Supprimer » supprime ; le détail de cascade est exact.
- Clavier : Tab entre Annuler/Supprimer, Échap = annuler ; lecteur d'écran annonce la boîte.
- Non-régression : cascades effectives (mêmes compteurs qu'avant), import/purge inchangés fonctionnellement (export de sécurité toujours déclenché avant).
- (Phase 2) « Annuler » restaure exactement les données ; au-delà du délai, suppression définitive.
- Console propre ; mobile 360 px ; clair + sombre.

## 5. Outils utilisés
Lecture/édition, preview (`preview_eval`/`preview_snapshot`). Aucune dépendance ajoutée.

## 6. Confirmation gratuité
**Oui — 100 % gratuit, zéro dépendance** (API `<dialog>` native, comme le menu d'appel). Conforme BIBLE règle 1 ; renforce la protection des données (règle 4).

## 7. Risques éventuels
- **Phase 1** : remplacement transverse (7 modules) → bien vérifier que chaque flux `await` correctement la promesse (sinon suppression sans confirmation). Test par module.
- **Phase 2** : la restauration après cascade doit réécrire **tous** les objets liés (sinon restauration partielle) → d'où le choix de la limiter d'abord aux suppressions simples.
- Aucune migration de schéma, aucune donnée touchée par la mise en place.
- Garder l'export de sécurité automatique avant import/purge (déjà en place).
