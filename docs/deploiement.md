# Déploiement & retour arrière — Carnet EPS

> Comment l'app est mise en ligne, l'historique des versions, et **comment revenir à une version antérieure** si besoin.
> Dépôt : https://github.com/alemoine4/carnet-eps · App en ligne : https://alemoine4.github.io/carnet-eps/

## Comment déployer une nouvelle version

0. **Lancer les smoke-tests** : `npm test` (doivent être verts — voir `tests/e2e/README.md`).
1. Incrémenter **les deux** numéros de version (rester synchronisés) :
   - `app/service-worker.js` → `const VERSION`
   - `app/js/state.js` → `VERSION_APP`
   (Le changement de `VERSION` invalide le cache : les installs existantes voient le toast « Nouvelle version installée ».)
2. Mettre à jour le suivi : `CHANGELOG.md`, `docs/journal.md` (+ `TODO.md`/`docs/roadmap.md` si pertinent).
3. Commiter, puis :
   ```bash
   git push origin main
   git subtree push --prefix app origin gh-pages   # gh-pages = contenu de app/ = ce qui est servi
   ```
4. Poser un **tag** sur le commit déployé (pour pouvoir y revenir) :
   ```bash
   git tag -a v0.12.X <commit> -m "v0.12.X — résumé"
   git push origin v0.12.X
   ```
5. Ajouter la ligne au tableau ci-dessous (version → tag → commit).

> ⚠ La branche **`gh-pages`** contient uniquement le dossier `app/` (pas `docs/`, donc ni les avis ni les rapports d'audit). C'est elle qui est publiée. `app/.nojekyll` (fichier vide, poussé avec le subtree) désactive le traitement Jekyll de GitHub Pages : sans lui, un fichier ou dossier commençant par `_` disparaîtrait du site en silence (audit 2026-09-07, A42).

## Historique des versions (tag → commit `main`)

| Version | Tag | Commit main | Résumé |
|---|---|---|---|
| v0.12.10 | `v0.12.10` | `5bfdf3f` | Lot 3 du 5e audit (35 constats : focus et lecteur d’écran, vrais tableaux, notifications, 320 px, contraste, impression, clavier virtuel Android) + 12 défauts de la revue adversariale ; 25 tests, suite 101/101 — déployée le 2026-09-07 |
| v0.12.9 | `v0.12.9` | `769528e` | Lot 1 du 5e audit (44 constats : exactitude de l’appel et du pré-remplissage — D013 —, seuil ⚠ borné à l’année scolaire partout, validations, erreurs visibles, import plus strict) + 19 constats de la revue adversariale du diff ; 43 tests de non-régression, suite 76/76 — déployée le 2026-09-07 |
| v0.12.8 | `v0.12.8` | `8ca9d47` | Hypothèses Codex H01–H05 : écritures qui attendent la validation de la transaction, service-worker qui ne nettoie que ses caches (voisinage GitHub Pages), purge en une transaction, export instantané, doublons refusés à l’import — déployée le 2026-09-06 |
| v0.12.7 | `v0.12.7` | `a4e8eb0` | Cascades et annulations atomiques (avis B29) : une transaction multi-stores pour les suppressions en cascade, les « Annuler » et l’import JSON ; suppression 76 → 27 ms — déployée le 2026-09-06 |
| v0.12.6 | `v0.12.6` | `727d389` | Vision par trimestre (D012, audit B30) : fins de T1/T2 réglables, tableau T1/T2/T3/Année sur la fiche, périodes rapides sur le récap, détail du trimestre dans les alertes — déployée le 2026-09-06 |
| v0.12.5 | `v0.12.5` | `f7093fa` | Dédoublonnage des helpers (audit B27, avis validé) : `metier.js`/`ui.js` exportent tris, normalisation, formats, `champ()` — refactor sans changement fonctionnel, tests 21/21 inchangés — déployée le 2026-09-06 |
| v0.12.4 | `v0.12.4` | `28732ad` | 4e audit (34 constats, 30 correctifs) : grille d'appel 2 colonnes à 360 px, import JSON altéré refusé avant écriture, élève « parti », contrastes du thème sombre, appui long vs défilement, double tap/double clic, 13 tests de non-régression — déployée le 2026-09-06 (gh-pages `0391552`) |
| v0.12.3 | `v0.12.3` | `633c2da` | Finitions post-audit : toast persistant épargné par l'éviction, lien document auto-préfixé https://, README/roadmap/smoke-tests à jour |
| v0.12.2 | `v0.12.2` | `1be32fc` | Arbitrage audit A12/A13/A14 (D011) : toasts empilés, « publiée » sur preuve de copie + marquage manuel, pré-remplissage inapte limité au jour même |
| v0.12.1 | `v0.12.1` | `13c81ff` | Corrections de l'audit 2026-07-10 (A1→A11, A15, A16) : résumé sauvegarde complet, erreurs photo visibles, dates locales, garde-fous EDT/accueil |
| v0.12.0 | `v0.12.0` | `6650338` | Observations (notes terrain) : store IndexedDB v2 (migration additive) + timeline fiche élève |
| v0.11.0 | `v0.11.0` | `9794150` | Onglet « Suivi » (alertes EPS + inaptitudes) à la place d'EDT (→ menu Plus) |
| v0.10.1 | `v0.10.1` | `8e264fb` | Annulation des suppressions (phase 2) : toast « Supprimé — Annuler » (8 s, restaure la cascade) |
| v0.10.0 | `v0.10.0` | `e7a1fcd` | Suppressions sécurisées (phase 1) : `confirm()` natifs → `<dialog>` avec détail des cascades |
| v0.9.9 | `v0.9.9` | `82a73b5` | Alignement audit : aide appel scindée, typo, nav 0,68rem (320px OK), CSP complétée |
| v0.9.8 | `v0.9.8` | `e175de0` | Corrections d'audit : a11y (aria-live, titre de zone, reduced-motion), typo, CSP |
| v0.9.7 | `v0.9.7` | `8e738d5` | Supprime le liseré de focus bleu au chargement (zone de contenu) |
| v0.9.6 | `v0.9.6` | `7fba367` | Largeur PC : appel/récap/relevé en pleine largeur, grille d'appel auto-colonnes |
| v0.9.5 | `v0.9.5` | `8891834` | Bouton retour « ← Plus » → « ← Retour » |
| v0.9.4 | `v0.9.4` | `2d6ca9b` | Retrait des badges « prêt » (écran Plus) |
| v0.9.3 | `v0.9.3` | `333b8ac` | Finitions de confort de l'appel (pastille thématisée, raccourcis clavier) |
| v0.9.2 | `v0.9.2` | `871773f` | Audit UX (a11y appel, contrastes, aide) + sécurité import/export |
| v0.9.0 | `v0.9.0` | `6f6ee03` | Socle livré + première publication (avant audit UX) |

*(v0.9.1 a été fusionnée dans v0.9.2 ; pas de tag.)*

## Revenir à une version antérieure (rollback)

Trois façons, de la plus propre à la plus radicale. **Toujours privilégier la 1re.**

### A. Annuler un changement précis (recommandé)
Garde l'historique, annule juste le(s) commit(s) fautif(s) :
```bash
git revert <commit-fautif>      # crée un commit qui défait le changement
# rebaisser VERSION/VERSION_APP si besoin, puis :
git push origin main
git subtree push --prefix app origin gh-pages
```

### B. Redéployer l'app telle qu'elle était à une version (rollback ciblé du site)
Remet le dossier `app/` exactement comme à un tag, sans toucher au reste :
```bash
git checkout v0.9.4 -- app       # récupère app/ de la v0.9.4 dans l'arbre courant
git commit -m "rollback app -> v0.9.4"
git subtree push --prefix app origin gh-pages
```
Le `VERSION` redevient celui de la v0.9.4 : comme il change, les utilisateurs reçoivent quand même la mise à jour (l'app servie redevient la 0.9.4).

### C. Repartir entièrement d'une version (radical, à éviter)
```bash
git checkout v0.9.4              # revue en mode "détaché" pour inspecter
# si on veut vraiment réécrire main : git reset --hard v0.9.4  (DESTRUCTIF, perd les commits suivants)
```

## Côté utilisateur, après un rollback
- L'app installée détecte le nouveau service-worker et propose **« Recharger »**.
- **Les données élèves ne sont pas touchées** par un rollback de code (elles vivent dans IndexedDB, séparées). Un retour en arrière de version ne supprime aucune donnée.
- ⚠ **Exception à connaître** : ne jamais revenir à une version dont le **schéma IndexedDB** est plus ancien que celui déjà ouvert sur les appareils. La v0.12.0 a migré la base en `DB_VERSION = 2` (store `observations`, décision D009) : **aucun retour arrière avant v0.12.0** — une app en `DB_VERSION = 1` face à une base en version 2 échoue à l'ouverture (`VersionError`, écran « Affichage impossible »). Les rollbacks entre v0.12.0 et la version courante restent sans risque (même schéma). (Constat B11 de l'audit 2026-09-05 : cette ligne affirmait à tort « aucune migration à ce jour ».)
