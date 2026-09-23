# Modèle de données — IndexedDB `carnet-eps`

## Conventions

- `id` : `crypto.randomUUID()` — keyPath de tous les stores (sauf `meta` : keyPath `cle`). Exceptions assumées : `appels.id = <seanceId>_<eleveId>` et `notes.id = <evaluationId>_<eleveId>` — clés composites garantissant un enregistrement unique par élève × séance / élève × évaluation (`appel.js`, `notes.js`).
- Dates : chaînes ISO `YYYY-MM-DD` (tri lexicographique = tri chronologique) ; heures `HH:MM`.
- Champs marqués `*` : indexés (requêtes fréquentes).
- `DB_VERSION` (entier, **4** depuis v0.14.0, **3** de v0.13.0 à v0.13.5, **2** de v0.12.0 à v0.12.20) dans `io.js` ; `onupgradeneeded` crée les stores **manquants** et, sur un store existant, les **index manquants** de `SCHEMA` — **à condition d'incrémenter `DB_VERSION` dans le même geste** : sans montée de version, `onupgradeneeded` ne se déclenche pas et l'index n'existe sur aucune base déjà ouverte (migration additive, décision D009 — jamais de suppression ni de transformation ; v0.12.12, D-11). Une future migration non additive imposerait un `switch (oldVersion)` et l'export JSON automatique préalable (BIBLE). ⚠ Ne jamais redéployer une version dont le `DB_VERSION` est inférieur à celui déjà ouvert sur les appareils (`indexedDB.open` échouerait en `VersionError`) — voir `deploiement.md`. **Depuis le schéma 4 : ne jamais redéployer une version dont `DB_VERSION` est 3** (v0.13.x) ; un correctif se fait toujours en avant. Devant une base plus récente qu'elle, l'application affiche « cet appareil a déjà ouvert le carnet avec une version plus récente de l'application — rechargez la page » (v0.14.0 ; les versions antérieures affichent le texte anglais du navigateur).

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
                installation }

sequences     { id, classeId*, apsa, ca (1-4), afl[], dateDebut, dateFin, nbSeancesPrevu, objectifs, bilan }

seances       { id, sequenceId*, date*, edtId?, numero, theme, bilan }
              ⚠ numero = valeur figée à la création, jamais recalculée (insérer une séance
              antérieure la rend fausse). Les affichages recalculent tous le numéro par tri
              de date : ne pas se fier au champ stocké (audit 2026-07-10, A6).

appels        { id, seanceId*, eleveId*, statut, minutesRetard?, commentaire }
              statut ∈ present | absent | retard | dispense | inapte | oubli_tenue | infirmerie
              (un enregistrement par élève et par séance ; absence d'enregistrement = appel non fait)

inaptitudes   { id, eleveId*, type ("totale"|"partielle"), dateDebut, dateFin, origine
                ("certificat"|"mot"|"infirmerie"), restrictions[], certificatId?, commentaire }
              restrictions ∈ course, sauts, lancers, appuis, natation, port_de_charge

certificats   { id, eleveId*, dateDepot, dateDebut?, dateFin?, fichierId, commentaire }

fichiers      { id, blob, mime, nom, taille, dateAjout }
              → photos certificats, photos élèves, documents. Photos compressées canvas→JPEG ≤ ~300 Ko.

evaluations   { id, sequenceId*, titre, date, type ("note20"|"bareme"|"afl"), bareme?, coef,
                publieePronote? (date|null), publieeObsolete? (bool) }

notes         { id, evaluationId*, eleveId*, valeur (number | "ABS"|"DISP"|"NN"), commentaire }

documents     { id, titre, type, tags[], classeIds[], fichierId?, url?, dateAjout }

observations  (schéma 2) — voir « Observations (v2) »
grilles       (schéma 3) — voir « Grilles d’évaluation — schéma 3 »
marqueurs     (schéma 4) { id, libelle, court, genre?, couleur?, archivee? } — voir « Marqueurs de séance — schéma 4 »
marquages     (schéma 4) { id, seanceId*, eleveId*, marqueurId*, occurrences?, courtSecours?, genreSecours?, dateAjout? }
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
| observations | `eleveId` |
| marquages | `seanceId`, `eleveId`, `marqueurId` (schéma 4) |

## Règles d'intégrité (appliquées dans le code, IndexedDB n'a pas de FK)

- Supprimer un **élève** → supprimer ses appels, marqueurs posés, inaptitudes, certificats (+ fichiers liés), notes, observations. Double confirmation + proposition d'export préalable.
- Supprimer une **classe** → possible seulement si elle ne contient plus **aucun** élève (actifs ou partis : le bouton « Supprimer la classe » n'apparaît qu'alors) ; refus supplémentaire tant que des séquences, des créneaux EDT (B22, v0.12.4) ou des documents (D-12, v0.12.9) la référencent (message « Classe non supprimée : elle a encore … »). Sinon : archiver.
- Supprimer une **évaluation/séquence/séance** → cascade sur notes/séances/appels/marqueurs posés avec récapitulatif avant confirmation (la séance a son propre aperçu depuis la v0.14.0).
- Une **inaptitude active** à une date D = `dateDebut ≤ D ≤ dateFin` → pré-remplit le statut d'appel et affiche la pastille.
- **Atomicité (v0.12.7, avis B29 ; complétée en v0.12.8, hypothèses Codex)** : toute cascade de suppression, toute annulation (`restaurer`), la **purge totale** (`viderTout`) et l'import JSON s'exécutent en **une seule transaction IndexedDB multi-stores** (`io.js` : `ecrireLot`). Les lectures ont lieu avant, les écritures sont émises d'un bloc : tout ou rien, même si l'onglet est fermé en cours de route. Un module ne doit plus enchaîner des `supprimer()` / `enregistrer()` pour une opération logiquement unique.
- **Créations atomiques (v0.12.13, lot 2)** : une création qui touche une **pièce jointe** et un enregistrement métier s'écrit en **une** transaction (`enregistrerLot` : `put` et `delete` mêlés, plusieurs stores). La compression de l'image et la construction de l'enregistrement `fichiers` se font AVANT, hors transaction (`preparerFichier`). Un remplacement de pièce échange l'ancienne et la nouvelle dans la même transaction : la suppression ne précède jamais l'écriture. L'import CSV collecte classes et élèves puis écrit tout d'un bloc.
- **Durabilité (v0.12.8, H03)** : les écritures unitaires (`enregistrer`, `supprimer`, `vider`) ne résolvent qu'à la **validation de la transaction** (`oncomplete`), jamais au simple succès de la requête : un quota plein ou une erreur disque au commit remonte en rejet (toast d'erreur) au lieu d'un « ✓ » sans écriture.
- **Instantané (v0.12.8, H02)** : l'export JSON et le comptage lisent tous les stores dans **une** transaction readonly (`lireLot`) : une écriture concurrente attend, la sauvegarde ne peut pas contenir d'orphelins nés pendant sa lecture.
- **Lectures par index groupées (v0.12.11, C02)** : plusieurs valeurs d'un même index se lisent par `parIndexLot(store, index, valeurs)` — **une** transaction readonly, un `getAll` par valeur. Une transaction par valeur (`parIndex` en boucle) coûtait 2× plus cher qu'une lecture complète du store dès quelques centaines de valeurs (mesuré, revue du lot 4) : `parIndex` reste réservé à une valeur isolée.

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
| `seanceId` | string \| null | séance liée — réservé : toujours `null` en v0.12 (la carte n'est branchée que sur la fiche élève ; brancher l'écran d'appel = avis, A31) |
| `dateAjout` | ISO datetime | horodatage |

- **Cascade** : suppression d'un élève → ses observations (incluses dans `supprimerEleveEnCascade`, l'aperçu, le détail et l'undo). Supprimer une séance **ne** supprime **pas** les observations.
- **Migration `DB_VERSION 1 → 2`** : **additive** (création du store via `onupgradeneeded`, aucune donnée existante modifiée — voir décision D009).

## Sauvegarde / restauration

- **Export JSON** : `{ app:"carnet-eps", schemaVersion, dateExport, stores:{...} }` ; blobs sérialisés en base64 (option « sans pièces jointes »). Nom de fichier : `carnet-eps_sauvegarde_YYYY-MM-DD.json`.
- **Import** : vérification **avant toute écriture** de `app`, de `schemaVersion` (≤ courant), de chaque liste et de chaque clé (**identifiants en double refusés**, v0.12.8), et des **champs texte indispensables au rendu** (`CHAMPS_TEXTE` dans `io.js` : `nom`, `prenom`, `classeId`, `apsa`, `date`, `statut`, `titre`… — un `nom: 123` faisait planter les vues, v0.12.9) ; pour `eleves`, seuls les champs du modèle (`CHAMPS_ELEVE`) sont conservés — un INE ou une adresse glissés dans un fichier tiers sont écartés (minimisation, v0.12.9) ; **aucune migration** : un store absent du fichier (sauvegarde de schéma 1 sans `observations`) est **vidé** par le remplacement, et la confirmation le dit (de même qu'une sauvegarde sans pièce jointe annonce la perte des pièces actuelles) ; références orphelines et statuts inconnus tolérés (pas de contrôle relationnel, l'interface les ignore) ; **marqueurs (schéma 4)** : une sauvegarde de schéma 1, 2 ou 3 n'en contient aucun — les deux magasins sont vidés et la confirmation le dit ; une pose dont le marqueur n'existe plus est acceptée (référence orpheline tolérée) ; la forme est contrôlée (`validerMarqueur`, `validerMarquage`), jamais les noms de champs : un champ inconnu est accepté et conservé ; écriture en une transaction (tout ou rien) ; double confirmation, export de sécurité automatique avant.
- **Pièces jointes** : images compressées en JPEG ≤ ~300 Ko ; tout autre fichier (PDF…) stocké tel quel sous un **plafond de 8 Mo** (refus avec message au-delà — un PDF de 40 Mo rendait l'export de sécurité impossible, v0.12.11).
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

## Grilles d’évaluation — schéma 3 (v0.13.0)

- **Store `grilles`** : `{ id, titre, apsa, archivee, dateCreation, niveaux: [{ cle, libelle, points, minimum?, couleur? }], criteres: [{ id, libelle, description, poids }], arrondi ("exact"|"0.25"|"0.5"|"1"), nonEvalue ("ignorer"|"zero"), pointsAjustables?, pasPoints? (1|0.5|0.25) }`. Ajouté par migration additive, sans transformer les stores existants.
- **Évaluation `type: "grille"`** : `grilleId` et `grille` (instantané COMPLET du modèle au moment de la création), `bareme` et `coef` habituels. Le barème est figé à la création.
- **Note d’une évaluation par grille** : `detail: { critereId: cleNiveau | { niveau, points } }` et `valeur` = note calculée sur le barème, ou code ABS/DISP/NN (le détail est alors conservé pour la reprise).
- **Calcul** (`app/js/grilles-calcul.js`) : brut = Σ points × poids des critères évalués ; maximum = Σ points max × poids des critères évalués (ou de tous, si `nonEvalue = "zero"`) ; note = brut / maximum × barème, arrondie selon `arrondi` ; aucun critère évalué = aucune note.
- **Validation** : une note ÉCRITE est contrôlée dans la transaction (`mettreAJourEvaluation`), sa valeur chiffrée devant être exactement celle que calculent ses critères. À l’import, seules les notes d’une évaluation par grille sont contrôlées ; les notes des autres évaluations sont acceptées telles quelles, pour qu’un historique antérieur aux gardes actuelles reste restaurable.


## Marqueurs de séance — schéma 4 (v0.14.0)

Contrat complet : `docs/avis/AVIS_FORMAT_MARQUEURS.md` ; décision D014. Deux magasins dédiés, ajoutés par migration additive
(montée `DB_VERSION` 3 → 4, aucune donnée existante lue ni transformée). La v0.14.0 ne livre que le **format** : aucun écran
ne pose encore de marqueur.

- **Store `marqueurs`** (le vocabulaire) : `{ id, libelle, court, genre, couleur, archivee }`. `id` = `crypto.randomUUID()`,
  **stable à vie** : un renommage ne le change jamais (il corrige une faute ; changer de sens = nouveau marqueur).
  `libelle` 1 à 40 caractères ; `court` 1 à 3 caractères sans espace, dont au moins une lettre ou un chiffre, **unique** parmi
  les marqueurs non archivés sur sa forme repliée (`cleCourt` : « É1 » = « E1 ») ; `genre` ∈ `role`, `groupe`,
  `comportement` ; `couleur` = un nom de `COULEURS_NIVEAUX` (`grilles-calcul.js`), forcée à `gris` pour un comportement ;
  `archivee` = retiré des listes de pose, l'historique reste lisible. **Aucune suppression** : on archive. Aucun index.
- **Store `marquages`** (les poses) : une ligne par séance × élève × marqueur, clé composite
  `id = <seanceId>_<eleveId>_<marqueurId>` — **reconstruite, jamais découpée**. Index `seanceId`, `eleveId`, `marqueurId`.
  `occurrences` : entier ≥ 1, toujours 1 aujourd'hui, écrit dès le premier jour pour pouvoir compter plus tard **sans
  migrer** (absent d'une sauvegarde, il se lit 1). `courtSecours` et `genreSecours` : instantanés du code et du genre à la
  pose, lus **seulement** si le marqueur a disparu du vocabulaire (orphelin) ; `dateAjout` : horodatage ISO.
- **Le vocabulaire d'abord** : quand `marqueurId` se résout, on affiche le libellé, le code et la couleur ACTUELS (un
  renommage change la lecture de tout l'historique) ; l'instantané n'existe que pour ce qui a disparu.
- **Écritures** (`io.js`) : `appliquerMarquages(seanceId, operations, options)` est l'unique écriture des poses — lecture de
  l'appel, du vocabulaire et des poses de la séance, contrôle et écriture dans **une** transaction ; une pose sur un élève sans
  enregistrement d'appel est refusée (`AppelManquant`) ou écartée en mode `ignorer` ; **rien n'est jamais écrit dans
  `appels`** (un marqueur ne valide pas une présence) ; reposer conserve `occurrences`, `dateAjout` et tout champ inconnu ;
  résolution sur `tx.oncomplete`. `ecrireMarqueur(id, modifs)` est l'unique écriture du vocabulaire — `id` jamais pris dans
  `modifs`, aucun genre par défaut (un marqueur importé sans genre est refusé à la modification au lieu de devenir un rôle),
  champs inconnus préservés, unicité du code relue dans la transaction.
- **Cascades** : supprimer une séance (donc une séquence, séance par séance) ou un élève emporte ses poses, et l'annulation
  les restaure ; le vocabulaire n'est dans aucune cascade.
- **Tolérance** : un genre ou une couleur inconnus ou absents ne refusent pas une sauvegarde ; ils dégraderont l'affichage
  (repère neutre, gris). Seules les écritures de l'application exigent des valeurs connues.
