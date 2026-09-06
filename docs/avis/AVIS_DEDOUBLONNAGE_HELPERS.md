# AVIS avant application — Dédoublonnage des helpers copiés entre modules (audit 2026-09-05, B27)

> Statut : **VALIDÉ ET APPLIQUÉ le 2026-09-06 (v0.12.5)** — rédigé le même jour, validé (« continue oui »), appliqué tel quel : 9 fichiers de code, `npm test` 21/21 sans modification des tests, `grep` des copies = 0 résultat.
> Déclencheur : BIBLE règle 2 — « tout changement touchant plus de 3 fichiers doit passer par /plan » ; règle 6 — avis avant refactor.
> Verdict proposé : **GO, en version dédiée** (v0.12.5), après le déploiement de v0.12.4, sans autre changement dans le même commit.

## 1. Diagnostic court

L'audit du 2026-07-10 (A5) avait dédupliqué `dateFR`/`isoAujourdhui`. Il reste **7 helpers copiés à l'identique** dans les modules (inventaire vérifié par `grep` le 2026-09-06, v0.12.4) :

| Helper | Copies | Fichiers |
|---|---|---|
| `trierClasses` (tri `localeCompare('fr', { numeric: true })`) | **7** | appel, documents, edt, eleves, inaptitudes, notes, sequences |
| `champF(id, libelle, controle)` (label + contrôle dans `.champ`) | **5** | documents, edt, inaptitudes, notes, sequences |
| `trierEleves` (NOM puis Prénom, `'fr'`) | **4** | appel, eleves, inaptitudes, notes |
| `jours(de, a)` (écart en jours à midi) | 2 | inaptitudes, metier (dans `collecterAlertes`) |
| `normaliser` (minuscules sans accents) | 2 | documents, eleves (+ `cleTexte` dérivé, eleves seul) |
| `baremeDe(ev)` (barème effectif d'une évaluation) | 2 | eleves (fiche, l. 428), notes |
| `formatFR(n)` (2 décimales, virgule) | 1 + 2 inlines | notes ; eleves recopie l'expression `String(Math.round(x*100)/100).replace('.', ',')` deux fois |

Les copies sont **byte-à-byte équivalentes** (seule la mise en forme multi-ligne diffère pour `trierEleves`). Le risque n'est pas un bug aujourd'hui : c'est la **divergence** à la prochaine correction (le tri Pronote, par exemple, se règle dans 4 fichiers au lieu d'un — `docs/pronote.md` prévoit justement d'ajuster ce tri après validation en établissement).

## 2. Plan d'action

### Étape 1 — `metier.js` : exporter le vocabulaire manquant
Ajouter (sans rien modifier d'existant) : `export const trierEleves`, `trierClasses`, `jours`, `normaliser`, `cleTexte`, `baremeDe`, `formatFR`. Remplacer le `const jours` local de `collecterAlertes` par la version exportée.

### Étape 2 — `ui.js` : exporter `champ(id, libelle, controle)`
Même corps que `champF` (nom `champ` : cohérent avec `champTexte`/`champSelect`/`champZone` et la classe CSS `.champ`).

### Étape 3 — modules : importer, supprimer les copies
Dans chacun des 7 modules : ajouter les noms à l'import existant de `../metier.js` / `../ui.js`, supprimer la déclaration locale, renommer `champF` → `champ` (remplacement mécanique, 1 nom). Dans `eleves.js`, remplacer les deux expressions inline d'arrondi par `formatFR`.

### Étape 4 — vérification
`npm test` (8 smoke + 13 non-régression) doit rester **21/21** sans aucune modification des tests : c'est le critère « zéro changement de comportement ». Contrôle visuel rapide : liste des classes (tri numérique 6A < 10A), grille de notes (virgule), synthèse inaptitudes (badges « fin dans X j »).

### Étape 5 — livraison
Bump `VERSION` (SW) + `VERSION_APP` → 0.12.5, CHANGELOG (« refactor sans changement fonctionnel »), déploiement par la procédure habituelle. **Aucun nouveau fichier** dans `app/` → liste `ASSETS` du service-worker inchangée.

## 3. Fichiers modifiés (prévus)

- `app/js/metier.js` (+7 exports, −1 const local)
- `app/js/ui.js` (+1 export)
- `app/js/modules/appel.js`, `documents.js`, `edt.js`, `eleves.js`, `inaptitudes.js`, `notes.js`, `sequences.js` (imports + suppression des copies)
- `docs/architecture.md` (une phrase : « les tris, formats et helpers de formulaire communs vivent dans `metier.js` / `ui.js` »)

**9 fichiers de code, ≈ −35 lignes nettes**, zéro changement de comportement attendu.

## 4. Tests à faire (après implémentation)

- [ ] `npm test` : 21/21, tests inchangés.
- [ ] `grep -rn "const trierEleves\|const trierClasses\|const champF\|const jours\|const normaliser\|const baremeDe" app/js/modules` → **0 résultat**.
- [ ] Ouvrir : Élèves (ordre des classes), Notes → grille + relevé (moyennes en virgule), Suivi → Inaptitudes (badges), Plus → EDT (formulaire).
- [ ] Console vide sur les 13 routes (smoke 1).

## 5. Outils utilisés

Éditeur + `grep`, Playwright existant. Rien de nouveau.

## 6. Confirmation gratuité

**Oui** — aucun outil, aucune dépendance ajoutée.

## 7. Risques éventuels

- **Oubli d'import** → `ReferenceError` au premier rendu de la vue → depuis v0.12.4, la vue affiche « Affichage impossible » (B14) au lieu d'un écran blanc, et le smoke-test 1 (13 routes, console vide) le détecte. Risque **faible**, détectable.
- **Renommage `champF` → `champ`** : le nom `champ` n'existe pas encore comme identifiant dans les modules (vérifié : seules des chaînes `'champ'` de classe CSS). Aucune collision.
- **Import circulaire** : `metier.js` importe `io.js` ; les modules importent `metier.js` ; `ui.js` n'importe rien → aucun cycle nouveau.
- **Hors périmètre volontaire** : B29 (cascades en une transaction multi-stores) est un vrai refactor de `io.js` avec changement de sémantique (atomicité) → **AVIS séparé** si retenu ; ne pas le mêler à ce dédoublonnage.
