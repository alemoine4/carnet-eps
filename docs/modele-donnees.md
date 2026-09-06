# Modèle de données — IndexedDB `carnet-eps`

## Conventions

- `id` : `crypto.randomUUID()` — keyPath de tous les stores (sauf `meta` : keyPath `cle`).
- Dates : chaînes ISO `YYYY-MM-DD` (tri lexicographique = tri chronologique) ; heures `HH:MM`.
- Champs marqués `*` : indexés (requêtes fréquentes).
- `DB_VERSION` (entier, **2** depuis v0.12.0) dans `io.js` ; `onupgradeneeded` crée les stores **manquants** (migration additive, décision D009 — jamais de suppression ni de transformation). Une future migration non additive imposerait un `switch (oldVersion)` et l'export JSON automatique préalable (BIBLE). ⚠ Ne jamais redéployer une version dont le `DB_VERSION` est inférieur à celui déjà ouvert sur les appareils (`indexedDB.open` échouerait en `VersionError`) — voir `deploiement.md`.

## Stores (schéma v1)

```
meta          { cle, valeur }
              → etablissement, anneeScolaire ("2026-2027"), semaineAReference (un lundi de semaine A),
                finTrimestre1 / finTrimestre2 (dates ISO, vides = 15/12 et 15/03 — décision D012)

classes       { id, nom, niveau, anneeScolaire, couleur, ordre, archivee }

eleves        { id, classeId*, nom, prenom, sexe?, dateNaissance?, notesPerso, photoFichierId?, actif }
              notesPerso : texte libre court (PAI, asthme…) — PAS d'INE, PAS d'adresse (minimisation)
              actif : false = élève « parti » (fiche élève → « Dans la classe », v0.12.4) : masqué à
              l'appel, aux notes et aux effectifs, historique conservé. Absent/undefined = actif.

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

certificats   { id, eleveId*, dateDepot, dateDebut?, dateFin?, fichierId, commentaire }

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
- **Atomicité (v0.12.7, avis B29 ; complétée en v0.12.8, hypothèses Codex)** : toute cascade de suppression, toute annulation (`restaurer`), la **purge totale** (`viderTout`) et l'import JSON s'exécutent en **une seule transaction IndexedDB multi-stores** (`io.js` : `ecrireLot`). Les lectures ont lieu avant, les écritures sont émises d'un bloc : tout ou rien, même si l'onglet est fermé en cours de route. Un module ne doit plus enchaîner des `supprimer()` / `enregistrer()` pour une opération logiquement unique.
- **Durabilité (v0.12.8, H03)** : les écritures unitaires (`enregistrer`, `supprimer`, `vider`) ne résolvent qu'à la **validation de la transaction** (`oncomplete`), jamais au simple succès de la requête : un quota plein ou une erreur disque au commit remonte en rejet (toast d'erreur) au lieu d'un « ✓ » sans écriture.
- **Instantané (v0.12.8, H02)** : l'export JSON et le comptage lisent tous les stores dans **une** transaction readonly (`lireLot`) : une écriture concurrente attend, la sauvegarde ne peut pas contenir d'orphelins nés pendant sa lecture.

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
- **Import** : vérification **avant toute écriture** de `app`, de `schemaVersion` (≤ courant), de chaque liste et de chaque clé (**identifiants en double refusés**, v0.12.8) ; **aucune migration** : un store absent du fichier (sauvegarde de schéma 1 sans `observations`) est **vidé** par le remplacement, et la confirmation le dit ; références orphelines et statuts inconnus tolérés (pas de contrôle relationnel, l'interface les ignore) ; écriture en une transaction (tout ou rien) ; double confirmation, export de sécurité automatique avant.
- **Purge fin d'année** : purge **totale** (écran Sauvegarde, double confirmation, export de sécurité automatique avant). La purge par `anneeScolaire` prévue au cadrage n'est pas implémentée en v1 (le rituel de rentrée = export d'archive puis purge totale, cf. `guide-rentree.md`).

## RGPD (BIBLE règle 4) — registre local

| Question | Réponse |
|---|---|
| Quoi | Identité minimale élève, suivi EPS (appels, inaptitudes, notes), certificats (photos) |
| Où | IndexedDB du navigateur de l'appareil — **jamais transmis** |
| Finalité | Suivi pédagogique et sécurité des élèves en EPS par leur professeur |
| Durée | Année scolaire ; purge guidée à chaque rentrée |
| Suppression | Purge totale (Plus → Sauvegarde) ; suppressions unitaires en cascade documentées ci-dessus (avec annulation 8 s) |
| Limites | Pas de chiffrement fort sans clé utilisateur → verrouillage de session obligatoire (voir README) |
