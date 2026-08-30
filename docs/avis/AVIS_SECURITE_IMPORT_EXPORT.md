# AVIS avant application — Sécurité import JSON & export CSV

> Issu de la campagne de tests du 2026-06-13. Statut : **proposition, aucun code modifié.**
> À valider avant implémentation (rituel CLAUDE.md). Deux correctifs sécurité, indépendants.

---

## 1. Diagnostic court

Deux entorses à la promesse « 100 % local / hors ligne », trouvées en revue des chemins d'import/export :

- **[Moyen] Import JSON — `fetch()` sur une URL contrôlée par le fichier.**
  [`io.js:166`](app/js/io.js#L166) : `importerJSON` reconstruit les pièces jointes par `await (await fetch(enreg.donnees)).blob()`. Un export sain met `donnees` en `data:` (base64). **Rien ne le vérifie** : un fichier de sauvegarde piégé avec `"donnees": "https://tiers/x"` déclenche une **requête sortante** à l'import → fuite d'IP/horodatage, balise de traçage, contournement du « rien ne quitte l'appareil ». (La lecture cross-origin est bloquée par CORS, mais la requête part.) C'est aussi un bug de **robustesse** : un `donnees` malformé fait échouer tout l'import.

- **[Faible] Export CSV — injection de formule + champs non échappés.**
  Les CSV téléchargés (récap absences [`appel.js`](app/js/modules/appel.js#L402), notes & relevé [`notes.js`](app/js/modules/notes.js#L286)) assemblent les champs par `.join(';')` **sans guillemets ni échappement**. Conséquences : (a) un nom contenant `;`, `"` ou un retour ligne **casse les colonnes** ; (b) un nom commençant par `= + - @` peut être interprété comme **formule** à l'ouverture dans Excel (injection de formule CSV).

Aucun bug bloquant par ailleurs ; le reste de la campagne est vert (XSS neutralisé, 0 ressource externe, persistance, appel 28, etc.).

## 2. Plan d'action

### Fix 1 — garde `data:` à l'import (io.js)
Dans `importerJSON`, n'appeler `fetch` que si `donnees` est une chaîne `data:` ; sinon `blob: null` (pièce ignorée proprement) :

```js
const okDataURL = typeof donnees === 'string' && donnees.startsWith('data:');
return { ...reste, blob: okDataURL ? await (await fetch(donnees)).blob() : null };
```

Effet : un import ne peut **plus** émettre de requête réseau, quel que soit le fichier. Robustesse améliorée (plus d'échec global sur une pièce malformée).

### Fix 2 — échappement CSV mutualisé (io.js + 2 modules)
Ajouter un helper dans `io.js`, à côté de `telechargerTexte` :

```js
// Échappe un champ CSV (RFC 4180) + neutralise l'injection de formule Excel.
export function champCSV(v) {
  let s = v == null ? '' : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;      // formule → texte
  if (/[";\r\n]/.test(s)) s = '"' + s.replace(/"/g, '""') + '"'; // guillemets
  return s;
}
```

Puis remplacer les `[a, b, …].join(';')` des **CSV téléchargés** par `[champCSV(a), champCSV(b), …].join(';')` :
- `appel.js` → récap absences (en-tête + lignes) ;
- `notes.js` → export CSV d'une évaluation **et** relevé de classe.

Hors périmètre : « Copier pour Pronote » (presse-papiers) reste inchangé — c'est une colonne de nombres collée dans Pronote (pas Excel), l'échappement la casserait.

## 3. Fichiers modifiés (prévus)

| Fichier | Nature |
|---|---|
| [app/js/io.js](app/js/io.js) | garde `data:` dans `importerJSON` ; **+** helper `champCSV()` exporté |
| [app/js/modules/appel.js](app/js/modules/appel.js) | récap CSV via `champCSV` |
| [app/js/modules/notes.js](app/js/modules/notes.js) | export éval + relevé via `champCSV` |

Aucun changement de schéma, de service-worker, ni d'UI. `import { … champCSV }` ajouté là où c'est utile.

## 4. Tests à faire (après implémentation)

- **Import JSON** : un export sain se réimporte à l'identique (pièces comprises) ; un JSON forgé avec `donnees:"https://…"` n'émet **aucune** requête (vérif. `performance.getEntriesByType('resource')`) et l'import aboutit (pièce ignorée).
- **Round-trip** sauvegarde complète (avec photo) inchangé.
- **Export CSV** : nom contenant `;`, `"`, et un nom `=1+1` → CSV rouvert dans un tableur : colonnes intactes, `=1+1` affiché en **texte** (préfixe `'`), accents OK (BOM conservé).
- Non-régression : récap absences, export notes, relevé — mêmes valeurs qu'avant.
- Console propre ; revérif rapide en preview.

## 5. Outils utilisés
Lecture/édition, preview (`preview_eval`/`preview_snapshot`), capture du blob CSV par interception `URL.createObjectURL`. Aucune dépendance ajoutée.

## 6. Confirmation gratuité
**Oui — 100 % gratuit, zéro dépendance.** Code vanilla, API navigateur natives. BIBLE règle 1 respectée ; renforce la règle 4 (données locales).

## 7. Risques éventuels
- **Fix 1** : si un (vieux ?) export stockait `donnees` autrement qu'en `data:`, sa pièce serait ignorée. Vérifié : `exporterJSON` ([io.js:124](app/js/io.js#L124)) produit **toujours** un `data:` (via `blobVersDataURL`). Risque nul sur les exports de l'app.
- **Fix 2** : le préfixe `'` devant un champ type formule est visible dans le tableur (comportement standard et attendu pour neutraliser). Le « Copier pour Pronote » est explicitement exclu pour ne pas casser le collage.
- Aucun impact données existantes, aucune migration.
