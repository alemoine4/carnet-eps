# Déploiement & retour arrière — Carnet EPS

> Comment l'app est mise en ligne, l'historique des versions, et **comment revenir à une version antérieure** si besoin.
> Dépôt : https://github.com/alemoine4/carnet-eps · App en ligne : https://alemoine4.github.io/carnet-eps/

## Comment déployer une nouvelle version

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
   git tag -a v0.9.X <commit> -m "v0.9.X — résumé"
   git push origin v0.9.X
   ```

> ⚠ La branche **`gh-pages`** contient uniquement le dossier `app/` (pas `docs/`, pas les `AVIS_*`). C'est elle qui est publiée.

## Historique des versions (tag → commit `main`)

| Version | Tag | Commit main | Résumé |
|---|---|---|---|
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
- Exception à connaître : ne jamais revenir à une version dont le **schéma IndexedDB** serait plus ancien après une migration de schéma (aucune migration à ce jour — `DB_VERSION = 1`).
