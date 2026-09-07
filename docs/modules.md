# app/js/modules/

Un fichier par module métier, ajouté à sa phase (voir `docs/roadmap.md`) :

| Fichier (à créer) | Module | Phase |
|---|---|---|
| `eleves.js` | Classes & élèves + import CSV Pronote | 2 |
| `edt.js` | Emploi du temps | 3 |
| `sequences.js` | Séquences & séances | 3 |
| `appel.js` | Appel & absences EPS | 4 |
| `inaptitudes.js` | Inaptitudes & certificats | 5 |
| `notes.js` | Évaluations & notes + export Pronote | 6 |
| `documents.js` | Documents | 7 |
| `accueil.js` | Tableau de bord « Aujourd'hui » | 7 |
| `sauvegarde.js` | Export/import JSON, purge, réglages | 1 |

Contrat d'un module :

```js
import { enregistrerVue } from '../ui.js';
// import des accès données via ../io.js — jamais d'IndexedDB direct ici

export function initialiser() {
  enregistrerVue('mon-id', async (conteneur) => { /* rendu */ });
}
```

- `main.js` importe le module et appelle `initialiser()` (remplace la vue bouchon).
- Pas d'import entre modules métier : passer par `state.js` (événements) ou `io.js` (données).
- Penser à ajouter chaque nouveau fichier à `ASSETS` dans `service-worker.js` **et** à incrémenter `VERSION`.
