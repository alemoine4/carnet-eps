# Modèle de données — IndexedDB `carnet-eps`

## Conventions

- `id` : `crypto.randomUUID()` — keyPath de tous les stores (sauf `meta` : keyPath `cle`).
- Dates : chaînes ISO `YYYY-MM-DD` (tri lexicographique = tri chronologique) ; heures `HH:MM`.
- Champs marqués `*` : indexés (requêtes fréquentes).
- `DB_VERSION` (entier) dans `io.js` ; migrations dans `onupgradeneeded` par `switch` sans `break` (cumulatives), **toujours** précédées d'un export JSON automatique (BIBLE).

## Stores (schéma v1)

```
meta          { cle, valeur }
              → schemaVersion, etablissement, anneeScolaire ("2026-2027"), dateDerniereSauvegarde

classes       { id, nom, niveau, anneeScolaire, couleur, ordre, archivee }

eleves        { id, classeId*, nom, prenom, sexe?, dateNaissance?, notesPerso, photoFichierId?, actif }
              notesPerso : texte libre court (PAI, asthme…) — PAS d'INE, PAS d'adresse (minimisation)

edt           { id, jour (1=lundi…7), heureDebut, heureFin, classeId*, semaine ("AB"|"A"|"B"),
                installation, dateDebut?, dateFin? }

sequences     { id, classeId*, apsa, ca (1-4), afl[], dateDebut, dateFin, nbSeancesPrevu, objectifs, bilan }

seances       { id, sequenceId*, date*, edtId?, numero, theme, bilan, annulee }
              ⚠ numero = valeur figée à la création, jamais recalculée (insérer une séance
              antérieure la rend fausse). Les affichages recalculent tous le numéro par tri
              de date : ne pas se fier au champ stocké (audit 2026-07-10, A6).

appels        { id, seanceId*, eleveId*, statut, minutesRetard?, commentaire }
              statut ∈ present | absent | retard | dispense | inapte | oubli_tenue | infirmerie
              (un enregistrement par élève et par séance ; absence d'enregistrement = appel non fait)

inaptitudes   { id, eleveId*, type ("totale"|"partielle"), dateDebut, dateFin, origine
                ("certificat"|"mot"|"infirmerie"), restrictions[], certificatId?, commentaire }
              restrictions ∈ course, sauts, lancers, appuis, natation, port_de_charge, autre

certificats   { id, eleveId*, dateDepot, dateDebut?, dateFin?, fichierId*, commentaire }

fichiers      { id, blob, mime, nom, taille, dateAjout }
              → photos certificats, photos élèves, documents. Photos compressées canvas→JPEG ≤ ~300 Ko.

evaluations   { id, sequenceId*, titre, date, type ("note20"|"bareme"|"afl"), bareme?, coef,
                publieePronote? (date|null) }

notes         { id, evaluationId*, eleveId*, valeur (number | "ABS"|"DISP"|"NN"), commentaire }

documents     { id, titre, type, tags[], classeIds[], fichierId?, url?, dateAjout }
```

## Index (créés dans `onupgradeneeded`)

| Store | Index |
|---|---|
| eleves | `classeId` |
| edt | `classeId` |
| sequences | `classeId` |
| seances | `sequenceId`, `date` |
| appels | `seanceId`, `eleveId` |
| inaptitudes | `eleveId` |
| certificats | `eleveId` |
| evaluations | `sequenceId` |
| notes | `evaluationId`, `eleveId` |

## Règles d'intégrité (appliquées dans le code, IndexedDB n'a pas de FK)

- Supprimer un **élève** → supprimer ses appels, inaptitudes, certificats (+ fichiers liés), notes. Double confirmation + proposition d'export préalable.
- Supprimer une **classe** → refus si élèves actifs (archiver d'abord).
- Supprimer une **évaluation/séquence/séance** → cascade sur notes/séances/appels avec récapitulatif avant confirmation.
- Une **inaptitude active** à une date D = `dateDebut ≤ D ≤ dateFin` → pré-remplit le statut d'appel et affiche la pastille.

## Observations (v2)

Store **`observations`** (schéma v2), index `eleveId`. Notes de suivi terrain.

| Champ | Type | Notes |
|---|---|---|
| `id` | uuid | clé |
| `eleveId` | string (indexé) | élève concerné |
| `date` | ISO `YYYY-MM-DD` | date de l'observation |
| `type` | string | Engagement, Comportement, Progrès, Sécurité, Oubli de tenue, Inaptitude, Autonomie, Coopération, Remarque |
| `ton` | `positif \| neutre \| vigilance` | couleur du badge / sens (bulletins) |
| `tags` | string[] | `tenue`, `sécurité`, `engagement`, `progrès`, `comportement`, `conseil`, `bulletin` |
| `texte` | string | contenu (dictée via micro natif possible) |
| `seanceId` | string \| null | séance liée (optionnel) |
| `dateAjout` | ISO datetime | horodatage |

- **Cascade** : suppression d'un élève → ses observations (incluses dans `supprimerEleveEnCascade`, l'aperçu, le détail et l'undo). Supprimer une séance **ne** supprime **pas** les observations.
- **Migration `DB_VERSION 1 → 2`** : **additive** (création du store via `onupgradeneeded`, aucune donnée existante modifiée — voir décision D009).

## Sauvegarde / restauration

- **Export JSON** : `{ app:"carnet-eps", schemaVersion, dateExport, stores:{...} }` ; blobs sérialisés en base64 (option « sans pièces jointes »). Nom de fichier : `carnet-eps_sauvegarde_YYYY-MM-DD.json`.
- **Import** : vérification `app` + `schemaVersion` (migration à l'import si version antérieure), double confirmation, export de sécurité automatique avant remplacement.
- **Purge fin d'année** : suppression par `anneeScolaire` après export d'archive obligatoire.

## RGPD (BIBLE règle 4) — registre local

| Question | Réponse |
|---|---|
| Quoi | Identité minimale élève, suivi EPS (appels, inaptitudes, notes), certificats (photos) |
| Où | IndexedDB du navigateur de l'appareil — **jamais transmis** |
| Finalité | Suivi pédagogique et sécurité des élèves en EPS par leur professeur |
| Durée | Année scolaire ; purge guidée à chaque rentrée |
| Suppression | Purge totale ou par année dans Réglages ; cascade documentée ci-dessus |
| Limites | Pas de chiffrement fort sans clé utilisateur → verrouillage de session obligatoire (voir README) |
