# Contrat d'implémentation — marqueurs de séance (lot 1)

**Statut : contrat, en attente de validation.** Ce qui est écrit ici sera implémenté tel quel ; toute divergence au
moment de coder est un écart à signaler, pas une liberté. **Aucune ligne de code n'a été écrite à ce jour.**

Rédigé le 2026-09-22, après les 18 réponses de l'enseignant (« je te suis ») au §11 de
`docs/avis/AVIS_MARQUEURS_SEANCE.md`, et après la contre-vérification `audit codex/AUDIT_V7_AVIS_MARQUEURS.md`.

Dépôt : `C:\Users\lemoi\Documents\30_APPLICATIONS\TRAVAIL\CARNET EPS\carnet-eps`, branche `grilles-schema3`,
HEAD `d79d58b`, application en ligne **v0.13.5**, schéma **3**. Les lignes citées ont été relues dans cet état — et
une erreur y avait pourtant survécu (`playwright.config.mjs`, corrigée, §16). Après la réfutation du 2026-09-23, les
références **ajoutées ou corrigées** ont été relues une à une sur le même HEAD, dans ces fichiers : `app/js/io.js`,
`app/js/modules/appel.js`, `app/js/modules/sequences.js`, `app/js/ui.js`, `app/js/main.js`, `app/js/state.js`,
`app/service-worker.js`, `app/css/components.css`, `playwright.config.mjs`, `tests/e2e/audit5-lot4.spec.mjs`,
`tests/e2e/audit5-lot5.spec.mjs`, `tests/e2e/regressions.spec.mjs`, `tests/e2e/smoke.spec.mjs`,
`tests/e2e/audit-independant.spec.mjs`, `tests/e2e/audit5-lot3.spec.mjs`, `tests/e2e/README.md`, `README.md`,
`CLAUDE.md`. Au second tour (§16), les références touchées ont été relues de nouveau sur le même HEAD, dans
`app/js/io.js`, `app/js/modules/appel.js`, `app/js/modules/sequences.js`, `app/js/modules/eleves.js`, `app/js/ui.js`,
`app/service-worker.js`, `app/css/components.css` et `tests/e2e/audit5-lot4.spec.mjs` ; la géométrie de la carte à
320 px (§6.1) y a été **mesurée** dans Chromium sur les feuilles de styles du HEAD, et non déduite. Toutes les
références restent à rafraîchir au moment d'implémenter : un correctif intercalaire les décale.

Contraintes du dépôt qui s'appliquent sans être répétées à chaque paragraphe : PWA vanilla hors ligne, CSP stricte
(`app/index.html:10` — pas de `innerHTML`, pas de `<style>` ni d'attribut `style=` dans le balisage ; tous les nœuds
par `el()`, `app/js/ui.js:61`), zéro dépendance, aucune donnée nominative dans le dépôt ni dans les tests, deux projets
Playwright (chromium et profil mobile Pixel 7), campagne de mutants obligatoire, gardes de documentation.
Règles de référence : `CLAUDE.md` et `BIBLE.md`.

---

## 1. Ce que ce contrat doit tenir

Les 18 décisions, et l'endroit **unique** où chacune est tenue. Une décision qui n'a pas de ligne ici n'est pas tenue.

| № | Décision | Où elle est tenue |
|---|---|---|
| 1 | rôles **de séance** seulement | les poses portent `seanceId` : aucune portée plus longue n'existe (§3.2) |
| 2 | cumul libre, aucune exclusivité automatique | une ligne par (séance, élève, marqueur) : rien dans le format ni dans l'écriture ne retire une autre ligne (§3.2, §4.2) |
| 3 | feuille « ⋯ » **et** mode tampon dans le lot 1 | §6.2 et §6.3 |
| 4 | deux codes courts puis « +n », liste courte triée par usage récent, pas de plafond codé | `codesCarte` (§5), ordre d'usage en `localStorage` (§6.2) |
| 5 | alerte : lecture seule, aucun seuil | rien n'est ajouté à `depasseSeuil` ni à la pastille ⚠ (§9) |
| 6 | équipes à la séance, avec « reprendre les marqueurs de la séance précédente » | §6.4 |
| 7 | codes courts sur la carte pour rôles et équipes | `codesCarte` (§5) |
| 8 | aucune sortie (ni impression ni CSV) dans le lot 1 | §9, prouvé par MQ-16 |
| 9 | marqueurs et observations coexistent, rien n'est converti | `observations.seanceId` reste `null` (`app/js/modules/observations.js:80`) ; prouvé par MQ-15 |
| 10 | comportements : pas de code sur la carte, repère **neutre**, le sens dans la feuille | `genre` sur le marqueur **et** `genreSecours` sur la pose (§3.2) ; `codesCarte` (§5) ; `.mq-neutre` (§7) |
| 11 | score chiffré : colonne « AFL / positionnement », pas le barème | aucun champ ajouté à `evaluations` ni à `notes` (§9) |
| 12 | les marqueurs d'abord, le carnet à onglets ensuite | ce contrat ; `AVIS_PAGE_CLASSE_ONGLETS.md` reste en attente |
| 13 | renommer = corriger une faute ; changer de sens = nouveau marqueur | `id` opaque et stable, jamais réécrit par un renommage (§4.4) ; le vocabulaire gagne toujours sur l'instantané (§5.2) ; la phrase est écrite dans l'écran (§6.5) |
| 14 | un marqueur ne valide **jamais** une présence | les poses ne vivent pas dans `appels` (§3.1) ; l'appel est **relu dans la transaction** (§4.2) ; refus explicite (§6.2) |
| 15 | une occurrence dans l'usage, un format qui saura compter sans migrer | champ `occurrences` écrit dès le premier jour (§3.2) |
| 16 | retrait / archivage / séance supprimée / référence orpheline | §3.2 (`courtSecours`, `genreSecours`), §8 (cascades), §5.2 (règle de résolution) |
| 17 | la compatibilité est tenue **par le code**, pas par sa mémoire | montée de `DB_VERSION` : une version ancienne **ne peut plus ouvrir** la base (§10) |
| 18 | magasin dédié, montée `DB_VERSION` 4, fenêtre « zéro donnée » | §3 et §10 |

---

## 2. Arbitrages entre les quatre parties

Les quatre brouillons se contredisaient sur quatorze points. Voici ce qui est retenu, et pourquoi. **Ces arbitrages
sont la partie la plus coûteuse à défaire :** la moitié d'entre eux entre dans le format des sauvegardes.

| Point | Positions | Retenu | Motif |
|---|---|---|---|
| Nom du magasin des poses | `marqueursPoses` · `marquages` | **`marquages`** | les 15 magasins existants sont des mots simples en minuscules (`io.js:14`-`:30`) ; `marqueursPoses` serait le seul en camelCase, et ce nom entre dans le format des sauvegardes |
| `keyPath` du vocabulaire | `cle` · `id` | **`id`** | `cle` n'est employé que par `meta`, dont la clé est un **nom** ; tout identifiant `crypto.randomUUID()` s'appelle `id` (`CLAUDE.md:101`) |
| Référence sur la pose | `marqueurCle` · `marqueurId` | **`marqueurId`** | suit `eleveId`, `seanceId`, `evaluationId` |
| Comptage (décision 15) | ordinal `n` **dans la clé**, une ligne par occurrence · compteur sur une ligne unique | **compteur sur une ligne unique**, clé `${seanceId}_${eleveId}_${marqueurId}` | le lot 1 n'utilise qu'une occurrence : avec une ligne par triplet, poser, retirer, reprendre et annuler visent **une clé connue d'avance** (`put` / `delete` par `id`, reprise idempotente, `creees` exact), sans recherche par préfixe ni choix de « quelle occurrence retirer ». **« Une occurrence » n'est pas structurelle** : la garde anti-doublon de `validerExport` (`io.js:385`-`:395`) ne compare que des `id`, et `occurrences` est un entier libre ≥ 1 — c'est une règle d'usage, dans ce format comme dans l'autre. Prix assumé et écrit : **pas d'horodatage par occurrence** ; passer plus tard à une ligne par occurrence changerait les clés, donc migrerait des données (point ouvert 2) |
| Nom du champ de comptage | `n` · `occurrences` | **`occurrences`** | `n` se lit aussi bien « numéro d'occurrence » (ordinal) que « nombre d'occurrences » (cardinal). On a retenu le cardinal : le nom doit le dire, sinon la première relecture se trompe |
| Affichage d'un orphelin | `courtSecours` seul · instantané `court` + `genre` | **`courtSecours` + `genreSecours`** | **la partie « modèle » était incomplète** : sans le genre, on ne sait pas si un orphelin doit afficher un code (rôle, équipe) ou un repère neutre (décision 10). Le suffixe `Secours` porte la règle : le vocabulaire gagne toujours (décision 13) |
| Tri « usage récent » | `dernierUsage` sur la ligne du marqueur · `localStorage` | **`localStorage`** | avec `dernierUsage`, **chaque tap au gymnase écrit le catalogue**, donc entre en concurrence avec un renommage ouvert ailleurs : une relecture-modification de plus à écrire et à prouver, pour une préférence d'appareil (`CLAUDE.md:87`) |
| Clés inconnues à l'import | refusées · tolérées | **tolérées, et préservées** : un champ inconnu déjà en base survit aux écritures de l'application (`...actuel`, §4.2 et §4.4). Le refus à l'écriture porte sur les **valeurs** (`genre`, `couleur`, forme du libellé et du code, unicité de `cleCourt(court)`), jamais sur les **noms** de champs. Seuls les champs sans lesquels une ligne ne peut ni se rattacher ni s'afficher sont obligatoires à l'import (§9.2) | refuser une sauvegarde en bloc est exactement ce que le dépôt a déjà rejeté (`io.js:406`-`:410`, « le jour où un téléphone casse, c'est pourtant elle qui compte »). Et un refus portant sur un **nom de champ** rendrait irrécupérable la sauvegarde d'une version future **sans que `schemaVersion` ne change** — ce qui casse la logique même de la décision 17 |
| Énumérations `genre` / `couleur` | contrôlées à l'import · à l'écriture seulement | **à l'écriture seulement** ; à l'affichage, une valeur inconnue **dégrade** (repère neutre, gris) | précédent vérifié dans le dépôt : `app/js/modules/appel.js:288` — « statut inconnu (sauvegarde tierce) : ne pas planter la vue ». Une version future qui ajoute un genre ne doit pas rendre ses sauvegardes illisibles ici |
| `archive` / `archivee` | les deux | **`archivee`** | `app/js/modules/grilles.js:18`, `:21`, `:23`, `:24` et `docs/modele-donnees.md` : un seul mot pour la même idée |
| Refus « pas encore appelé » | `e.code === 'APPEL_ABSENT'` · `e.name = 'AppelManquant'` | **`e.name = 'AppelManquant'`** | le dépôt discrimine déjà une erreur par son `name` (`io.js:605`) ; aucune convention nouvelle. L'interface ne compare jamais des chaînes de message |
| Nom du module pur | `marqueurs-modele.js` · `marqueurs-regles.js` · `marqueurs-calcul.js` | **`marqueurs-calcul.js`** | calque exact de `grilles-calcul.js`, même rôle (« fonctions pures partagées par l'éditeur, la saisie et la validation des sauvegardes ») |
| Index sur `marquages` | 4, dont un champ dérivé `seanceEleve` · 3 | **3** (`seanceId`, `eleveId`, `marqueurId`) | l'écriture relit **toute la séance** (≈ 30 lignes) : `seanceEleve` n'économise rien et ajoute un champ dérivé à tenir cohérent, donc un invariant de plus à prouver |
| Index `genre` sur `marqueurs` | aucun | **aucun** | quelques dizaines de lignes, toujours lues en entier. Ajouter un index plus tard coûterait une montée de schéma ; ajouter un **champ** ne coûtera rien (validation tolérante ci-dessus) |

**Trois propositions sont écartées du lot 1**, non parce qu'elles sont mauvaises, mais parce qu'elles sortent du
périmètre décidé (BIBLE règle 2, et la consigne « ne rajoute aucune fonctionnalité »). Elles deviennent les points
ouverts 3, 4 et 5 du §14 :

1. **`completerAppels`** — relire l'appel dans la transaction de « Terminer l'appel » (`appel.js:469`-`:492`, qui
   écrit aujourd'hui par `restaurer({ appels: recs })`, donc des `put` aveugles bâtis sur la Map de la vue). C'est un
   défaut de concurrence **préexistant** du bouton ; les marqueurs ne l'introduisent pas, ils le rendent seulement
   plus visible en faisant de ce bouton un passage obligé.
2. **La feuille « ⋯ » qui cesse de se fermer** après un choix de statut quand la rangée de marqueurs était verrouillée
   (`appel.js:369`). Même motif : c'est un geste existant qu'on modifierait. Le chemin reste « Terminer l'appel », ou
   rouvrir la feuille.
3. **L'amorçage « créer les 6 marqueurs proposés »** sur un vocabulaire vide : aucune des 18 décisions ne le demande.

---

## 3. Le format

### 3.1 Pourquoi deux magasins, et ce que cela règle mécaniquement

Décision 18, et trois conséquences qui ne relèvent pas de la préférence :

1. **La décision 14 devient structurelle.** `app/js/modules/appel.js:257` compte comme « saisi » tout élève ayant un
   enregistrement dans `appels`, et le modèle exige un `statut` (`io.js:43`, via `CHAMPS_TEXTE.appels`). Une pose
   n'écrit rien dans `appels` : elle **ne peut pas** fabriquer une présence. Un champ sur `appels` l'aurait pu.
2. **Le piège n° 1 du dépôt disparaît.** `definirStatut` (`appel.js:303`-`:310`) reconstruit l'enregistrement champ
   par champ : tout champ ajouté sans ligne d'héritage est perdu au premier changement de statut (reproduit par
   l'audit Codex V7, diagnostic B1 ; rappelé dans `CLAUDE.md:177`). Comme les poses ne sont pas dans `appels`, ce
   chemin ne peut pas les effacer. **Aucune ligne d'héritage à écrire, donc aucune à oublier.**
3. **L'atomicité devient possible.** `ecrireMeta` (`io.js:296`) écrit une valeur **entière** : deux écrans
   concurrents s'écrasent. Un magasin dédié permet un `put` par marqueur et un `put` par pose.

### 3.2 Les deux magasins

Deux entrées ajoutées **à la fin** de `SCHEMA` (`io.js:14`-`:30`), après `observations:` (`io.js:29`) :

```js
  marqueurs: { keyPath: 'id' },                                               // v4 — vocabulaire
  marquages: { keyPath: 'id', index: ['seanceId', 'eleveId', 'marqueurId'] }, // v4 — poses
```

`STORES` (`io.js:32`) étant dérivé de `SCHEMA`, sont couverts **sans une ligne de plus** : `exporterJSON`
(`io.js:340`), `validerExport` (`io.js:381`), `importerJSON` (`io.js:432`, `:451`-`:454`), `viderTout`
(`io.js:268`-`:270`) et `compterTout` (`io.js:473`). Ce qui ne se dérive pas est listé au §8.

```js
// magasin « marqueurs » — une ligne par marqueur du vocabulaire
{
  id: '<uuid>',        // crypto.randomUUID(). STABLE À VIE : jamais réutilisé, jamais réécrit
                       // par un renommage (décision 13).
  libelle: 'Arbitre',  // 1 à 40 caractères après trim
  court: 'ARB',        // 1 à 3 caractères après trim, sans blanc ; unique sur cleCourt() parmi
                       // les marqueurs NON archivés (§4.4)
  genre: 'role',       // 'role' | 'comportement' | 'groupe'. Toujours écrit par l'app,
                       // FACULTATIF à l'import : absent = inconnu, donc dégradé (§5.1, point 5)
  couleur: 'bleu',     // un NOM de COULEURS_NIVEAUX (app/js/grilles-calcul.js:4), jamais un
                       // hexadécimal ; FORCÉ à 'gris' quand genre === 'comportement'.
                       // FACULTATIF à l'import : absent = gris
  archivee: false,     // true = retiré des listes de pose ; l'historique reste lisible.
                       // FACULTATIF à l'import : absent = false (marqueur actif)
}
```

```js
// magasin « marquages » — une ligne par (séance, élève, marqueur)
{
  id: `${seanceId}_${eleveId}_${marqueurId}`,  // keyPath, RECONSTRUIT, jamais découpé
  seanceId: '<uuid>',    // indexé — cascade séance, lecture d'un écran d'appel
  eleveId: '<uuid>',     // indexé — cascade élève, cumuls futurs par élève
  marqueurId: '<uuid>',  // indexé — « combien de fois ce marqueur cette année », plus tard
  occurrences: 1,        // entier >= 1. TOUJOURS 1 dans le lot 1 (décision 15). Toujours écrit ;
                         // absent d'une sauvegarde, il se lit 1 (§4.3)
  courtSecours: 'ARB',   // instantané du code à la pose — orphelins SEULEMENT (§5.2). Toujours
                         // écrit par l'app, FACULTATIF à l'import (§9.2)
  genreSecours: 'role',  // instantané du genre — sans lui, un orphelin de comportement
                         // afficherait un code (décision 10). Même régime que courtSecours
  dateAjout: '2026-09-22T10:14:03.221Z', // même convention qu'observations.dateAjout
                                          // (app/js/modules/observations.js:81)
}
```

Quatre points de forme qui portent une garantie :

- **La clé est reconstruite, jamais découpée.** `seanceId`, `eleveId` et `marqueurId` sont des UUID
  (`docs/modele-donnees.md:5`), qui ne contiennent pas de `_`, mais la validation compare
  `p.id === \`${p.seanceId}_${p.eleveId}_${p.marqueurId}\`` et ne fait **jamais** `id.split('_')` : c'est vrai quelles
  que soient les valeurs, et ça le reste si une clé change un jour de forme. Même précaution que pour `appels.id`
  (`appel.js:306`).
- **`occurrences` est écrit dès le premier jour et lu par rien.** C'est la décision 15 côté format : compter plusieurs
  fois un même comportement ne demandera qu'un changement de valeur — **aucun magasin créé, aucun index ajouté,
  aucune ligne existante touchée, `DB_VERSION` inchangé**. Sa préservation en relecture (§4.2) est ce qui rend la
  promesse vraie, et elle est prouvée par MQ-09.
- **Les deux champs `…Secours` ne sont jamais lus quand la clé se résout.** Ils ne concurrencent pas le renommage
  (décision 13) : ils sont le dernier recours (§5.2).
- **Aucun champ `famille`** (exclusivité par famille) : décision 2 = aucune exclusivité dans le lot 1. L'ajouter plus
  tard ne coûtera rien : la validation tolère les champs qu'elle ne connaît pas, et les écritures de cette version
  les **préservent** (§2, §4.4) : une sauvegarde de schéma 4 écrite par une version future qui porterait `famille`
  est acceptée ici et relue intacte (prouvé par MIG-07, cas accepté), et un renommage fait ici ne lui retire pas ce
  champ (prouvé par MQ-17).

### 3.3 La migration 3 → 4 : rien à écrire

| Ligne actuelle | Changement |
|---|---|
| `io.js:8` — `const DB_VERSION = 3;` | `= 4` |
| `io.js:14`-`:30` — `SCHEMA` | + les deux entrées ci-dessus |
| `io.js:5` — `import { validerGrille, calculerGrille } …` | + `import { validerMarqueur, validerMarquage, GENRES, COULEURS, cleCourt } from './marqueurs-calcul.js';` |

`io.js:60`-`:76` **est déjà** la migration : la boucle parcourt `SCHEMA` et crée les magasins manquants avec leurs
index (`:66`-`:68`), ou les index manquants d'un magasin existant (`:72`-`:73`). Elle **ne teste pas `e.oldVersion`** :
une base en version 1, 2 ou 3 passe directement en 4 et reçoit exactement ce qui lui manque. Il ne faut **pas**
ajouter de `switch (e.oldVersion)` : la migration reste purement additive (décision D009,
`docs/modele-donnees.md:8`), aucune donnée existante n'est lue, transformée ni supprimée. Le diff de `SCHEMA` est une
addition de deux lignes, vérifiable au `git diff`.

La seule condition, écrite en commentaire à `io.js:70`-`:71` et payée ici : **`DB_VERSION` doit être incrémenté dans
le même geste**, sinon `onupgradeneeded` ne se déclenche pas et les magasins ne naissent sur aucune base déjà ouverte.
C'est le motif exact de la décision 18 — la fenêtre « zéro donnée » rend ce geste gratuit aujourd'hui, et cher dès la
première classe saisie.

---

## 4. Les écritures

### 4.1 Le modèle à copier, et le contre-exemple à ne pas copier

| Chemin existant | Où | Ce qu'il vaut ici |
|---|---|---|
| `mettreAJourEvaluation` | `io.js:201`-`:257` | **le motif à copier** : lectures émises d'abord (`:209`, `:210`), tout le contrôle et toutes les écritures dans le `onsuccess` de la **dernière** lecture, `erreur = e; tx.abort()` sur incohérence (`:251`-`:254`), résolution sur `tx.oncomplete` (`:211`). Seul endroit du dépôt qui relit dans la transaction avant d'écrire |
| `definirStatut` | `appel.js:303`-`:331` | **contre-exemple** : reconstruit l'enregistrement champ par champ (`:305`-`:310`) puis `enregistrer('appels', rec)` — un `put` aveugle bâti sur la Map de cette vue |
| `enregistrerChoix` (saisie par grille) | `grilles.js:214`-`:267` | **le motif de vue à copier tel quel** : file d'attente de module (`:100`, `:223`, `:265`), état VOULU pendant une rafale (`:150`-`:151`), échecs durables en `sessionStorage` par identifiants seuls (`:125`-`:142`), repeinture unique en fin de rafale (`:248`) |

**Règle contractuelle n° 1 — `definirStatut` (`appel.js:303`) n'est pas modifiée par ce lot.** Aucune ligne
d'héritage, aucun champ `marqueurs` sur `appels`. Un correctif qui toucherait cette fonction pour les marqueurs est
hors contrat.

### 4.2 `appliquerMarquages` — l'unique écriture des poses

À placer dans `app/js/io.js`, juste après `mettreAJourEvaluation` (après `:257`), avec le même squelette. Elle sert
la pose, le retrait, la reprise de la séance précédente **et** l'annulation de cette reprise : il n'y a qu'un seul
chemin d'écriture des poses dans toute l'application.

```js
// Pose / retrait de marqueurs : lecture, contrôle et écriture dans UNE transaction, sur le motif de
// mettreAJourEvaluation (io.js:201). L'appel est relu ICI, jamais dans la mémoire de la vue :
// « Terminer l'appel » lancé sur un autre onglet doit débloquer la pose, et un onglet resté ouvert
// avant l'appel ne doit pas croire l'élève appelé.
// operations = [{ eleveId, marqueurId, op: 'poser' | 'retirer' }]
// options    = { surEleveNonAppele: 'refuser' (défaut) | 'ignorer' }
// Résout { marquages, creees, ignores } sur tx.oncomplete.
export async function appliquerMarquages(seanceId, operations = [], options = {}) { … }
```

Déroulé exact, dans une transaction `readwrite` sur `['appels', 'marqueurs', 'marquages']` :

```
  lectures émises d'abord :
    appels.index('seanceId').getAll(seanceId)
    marqueurs.getAll()
    marquages.index('seanceId').getAll(seanceId)          <- dernière émise : son onsuccess porte tout

  pour chaque opération :
    op inconnue                      -> abort « opération de marqueur invalide »
    op === 'retirer'                 -> marquages.delete(id) et on passe : un retrait est TOUJOURS
                                        permis, c'est le seul chemin de nettoyage d'un orphelin ou
                                        d'un marqueur archivé depuis (décision 16)
    élève sans enregistrement d'appel -> 'ignorer' : écarté dans `ignores` (reprise)
                                        'refuser'  : abort, e.name = 'AppelManquant', e.eleveId
    marqueur inconnu ou archivé      -> abort
    sinon                            -> marquages.put({ occurrences: 1, ...actuel, id, seanceId,
                                          eleveId, marqueurId, courtSecours, genreSecours,
                                          dateAjout: actuel?.dateAjout ?? new Date().toISOString() })
                                        et, si `actuel` était absent, la paire entre dans `creees`

  relecture émise APRÈS les écritures (donc elle les voit) :
    marquages.index('seanceId').getAll(seanceId) -> resultat.marquages
```

Sept propriétés que cette fonction doit tenir, chacune avec son test au §11 :

1. **Résolution sur `tx.oncomplete`, jamais sur le succès d'une requête** — règle écrite en commentaire à
   `io.js:144`-`:146` : un quota plein remonté au commit doit devenir un rejet visible, pas un « ✓ » mensonger.
2. **Tout ou rien** : la première opération refusée annule la transaction entière, donc les opérations précédentes du
   même lot ne sont pas écrites. Sauf en mode `'ignorer'`, où l'élève non appelé est écarté et le reste passe.
3. **Rien n'est jamais écrit dans `appels`.** Le magasin n'est ouvert en écriture que parce qu'IndexedDB ne mélange
   pas les modes dans une transaction. C'est une règle de revue : un `grep` doit montrer **zéro**
   `objectStore('appels').put` dans le code des marqueurs. Statut, minutes de retard et commentaire sont préservés
   par construction.
4. **Reposer ne remet pas la ligne à neuf** : `...actuel` conserve `occurrences` et `dateAjout`. C'est ce qui rend
   vraie la promesse « compter plus tard sans migrer ». Dans une vue à jour, aucun geste d'écran ne repose une clé
   existante (le tap bascule vers un retrait, la reprise ignore ce qui est déjà posé) — **mais un second onglet resté
   ouvert calcule sa bascule sur un état périmé et peut reposer une clé** : c'est précisément le cas que cette règle
   protège. La preuve passe par un appel direct, qui reproduit ce cas sans dépendre d'un second onglet (MQ-09,
   repose).
5. **`creees` ne contient que les lignes réellement ajoutées** — c'est l'annulation exacte de la reprise (§6.4), qui
   ne doit jamais retirer une pose préexistante.
6. **Aucun contrôle de concurrence optimiste** (pas d'équivalent du paramètre `attentes` de `mettreAJourEvaluation`,
   `io.js:219`-`:223`) : une ligne par (séance, élève, marqueur) fait que deux vues n'écrivent la même clé que si
   elles agissent sur le même marqueur du même élève — et alors le dernier geste gagne, ce qui est le comportement
   attendu. Un contrôle optimiste transformerait un tap au gymnase en « rechargez la page ».
7. **Le retour est la vérité de la base**, pas l'intention de l'appelant.

### 4.3 Le module pur `app/js/marqueurs-calcul.js` (nouveau)

`io.js` ne peut pas importer `metier.js`, qui l'importe déjà — contrainte documentée et déjà contournée une fois par
duplication assumée (`io.js:315`-`:317`, `dateLocaleISO`). Les règles pures vont donc dans un module à part, sur le
modèle de `grilles-calcul.js` (`grilles-calcul.js:1`), importé par `io.js` comme lui (`io.js:5`).

```js
import { COULEURS_NIVEAUX } from './grilles-calcul.js';

export const GENRES = ['role', 'groupe', 'comportement'];          // AUSSI l'ordre d'affichage, partout
export const LIBELLES_GENRE = { role: 'Rôles', groupe: 'Équipes', comportement: 'Comportements' };
export const COULEURS = COULEURS_NIVEAUX;                          // grilles-calcul.js:4 — huit NOMS

// Pliage recopié de metier.js:54 (cleTexte) : io.js ne peut pas importer metier.js, même raison
// que dateLocaleISO (io.js:315-317). Ne garde que [a-z0-9] : « É1 » et « E1 » sont le MÊME code.
export const cleCourt = (s) => String(s ?? '').toLowerCase()
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');

export function validerMarqueur(m) { /* FORME seulement (import et écriture) */ }
export function validerMarquage(p) { /* FORME seulement (import et écriture) */ }
export function trierMarqueurs(liste) { /* archivés en dernier, genre, puis libelle localeCompare 'fr' */ }
export function grouperParEleve(marquages) { /* Map<eleveId, marquage[]> */ }
export function codesCarte(marquages, vocabulaire, { max = 2 } = {}) { /* §5 */ }
```

`validerMarqueur` : `libelle` de 1 à 40 caractères après `trim` ; `cleCourt(court)` de 1 à 3 caractères (donc **au
moins un caractère alphanumérique** — sans quoi deux codes de ponctuation se replieraient tous deux sur la chaîne
vide) ; `genre` et `couleur` **chaînes si présents**, `archivee` **booléen si présent** (absent = `false`). Seuls
`libelle` et `court` sont exigés (par `CHAMPS_TEXTE`, §9.2) : sans eux, la ligne n'a ni nom ni code à afficher.
L'**appartenance** de `genre` et `couleur` n'est pas vérifiée ici (§2), et leur **absence** se traite comme une
valeur inconnue : elle dégrade l'affichage (§5.1, point 5), elle ne refuse pas la sauvegarde.

`validerMarquage` : `seanceId`, `eleveId`, `marqueurId` textes (garanti par `CHAMPS_TEXTE`, §9.2) ; `id` reconstruit ;
`occurrences` **si présent** entier fini >= 1 (absent = 1) ; `courtSecours`, `genreSecours` et `dateAjout` **chaînes si
présents** — même régime que `dateAjout`. Ce sont des champs de repli d'**affichage**, jamais des identifiants : leur
absence dégrade le rendu (§5.2, point 3), elle ne refuse pas la sauvegarde. À l'**écriture** par l'application, les
deux `…Secours` sont toujours renseignés depuis le vocabulaire relu dans la transaction (§4.2). **Aucun contrôle
relationnel** : une pose dont le `marqueurId` est absent du vocabulaire est acceptée et s'affiche en gris
(décision 16). Cela prolonge la règle déjà écrite dans `docs/modele-donnees.md:103` (« références orphelines et
statuts inconnus tolérés »).

Messages d'erreur en français, préfixés par `validerExport` comme à `io.js:418`
(`sauvegarde altérée : « marqueurs » ligne 3 — …`).

⚠ **Ce fichier doit entrer dans la liste `ASSETS` du service-worker** (`app/service-worker.js:10`-`:41`) **dans la
version qui le crée** (v0.14.0, §13), sans quoi le premier accès hors ligne d'un appareil neuf échoue (piège § 9.9 de
l'avis). **Règle inverse, tout aussi bloquante : aucune entrée d'`ASSETS` ne peut précéder la création de son
fichier.** L'installation ouvre d'abord le cache (`caches.open(CACHE)`, `app/service-worker.js:59`), puis fait
`c.addAll(ASSETS…)` (`:60`) et relance l'erreur (`:62`). `addAll` est tout-ou-rien : un seul 404 fait échouer
l'installation, le service-worker n'est **jamais activé**, et **tout** le hors-ligne de la version est perdu. Le cache
`carnet-eps-<version>` existe pourtant — créé vide par `caches.open` avant l'échec — si bien que l'assertion
`caches.has` de la garde A43 (`audit5-lot4.spec.mjs:57`) resterait verte : A43 rougit dès `attendreSW`
(`audit5-lot4.spec.mjs:40`, attente de l'état `activated`, définie à `:28`).

### 4.4 `ecrireMarqueur` — l'unique écriture du vocabulaire

```js
// io.js — une ligne par marqueur, relue dans la transaction. L'id n'est JAMAIS pris dans `modifs`
// (décision 13 : renommer garde l'identifiant) — d'où `id` écrit EN DERNIER dans le candidat.
// Création  : ecrireMarqueur(crypto.randomUUID(), { libelle, court, genre, couleur })
// Renommage, couleur, archivage : ecrireMarqueur(id, { … }) — modifications partielles.
export async function ecrireMarqueur(id, modifs = {}) { … }
```

Dans une transaction `readwrite` sur `['marqueurs']`, après `store.getAll()` :

```js
const actuel = base.find((m) => m.id === id);
const candidat = { couleur: 'gris', libelle: '', court: '', archivee: false,   // PAS de genre par défaut
                   ...actuel, ...modifs, id };          // id en dernier : un renommage ne peut pas le changer
validerMarqueur(candidat);                               // forme
if (!GENRES.includes(candidat.genre)) throw new Error('genre de marqueur inconnu');
if (candidat.genre === 'comportement') candidat.couleur = 'gris';   // décision 10, invariant forcé
if (!COULEURS.includes(candidat.couleur)) throw new Error('couleur de marqueur inconnue');
// Unicité du code court, relue ICI : deux onglets ne peuvent pas créer deux « ARB ».
// Un marqueur archivé ne réserve plus son code.
if (!candidat.archivee) {
  const collision = base.find((m) => m.id !== id && !m.archivee && cleCourt(m.court) === cleCourt(candidat.court));
  if (collision) throw new Error(`le code « ${candidat.court} » est déjà pris par « ${collision.libelle} »`);
}
store.put(candidat);
```

Les valeurs en tête du candidat sont des **valeurs par défaut**, pas un filtre : `...actuel` recopie l'enregistrement
relu **tel quel**, champs inconnus compris, et c'est voulu — c'est ce qui rend vraie la promesse du §3.2 (« ajouter
`famille` plus tard ne coûtera rien ») et c'est la même doctrine que `appliquerMarquages` (§4.2). Le refus à
l'écriture porte sur les **valeurs** (forme par `validerMarqueur`, `genre`, `couleur`, unicité du code), jamais sur
les noms de champs. Les modifications `modifs` viennent du seul formulaire du §6.5, qui ne transmet que `libelle`,
`court`, `couleur` et `archivee` — et `genre` **à la création seulement**, son `select` étant verrouillé en
modification (§6.5, décision 13).

**Pourquoi aucun `genre` par défaut.** `genre` est facultatif à l'import (§9.2) : une valeur par défaut `'role'`
donnerait, à la première modification d'un marqueur importé sans genre, un **rôle** là où l'affichage montrait un
repère neutre — un changement de sens silencieux, ce que la décision 13 interdit. Sans défaut, un genre absent se
traite à l'écriture exactement comme un genre inconnu : `'genre de marqueur inconnu'`, rien n'est écrit. Un tel
marqueur reste lisible (§5.1, point 5) mais ne se modifie ni ne s'archive ici ; c'est le prix, écrit, de la tolérance
à l'import. Le défaut `couleur: 'gris'` reste, parce qu'il **coïncide** avec la dégradation d'affichage d'une couleur
absente : il ne change rien à ce que l'enseignant voit.

**Preuve de cette absence de défaut** (sans elle, un mutant qui la rétablirait survivrait à toute la campagne) :
MQ-17 importe un marqueur **sans `genre`**, appelle `ecrireMarqueur(id, { archivee: true })`, puis affirme le refus
`'genre de marqueur inconnu'` **et** la ligne relue inchangée — toujours sans `genre`, toujours non archivée. Le mutant
**M51** « défaut `genre: 'role'` rétabli dans le candidat » doit rendre ce test rouge. Le rangement « avec les
comportements » (§5.1 point 5) est prouvé par un test pur de `trierMarqueurs` (MIG-08) : un marqueur sans genre et un
marqueur de genre inconnu sortent après les rôles et les équipes, parmi les comportements.

**L'identifiant ne vient jamais de `modifs`, et cela se prouve hors du formulaire.** Le formulaire ne transmet jamais
d'`id` : déplacer `id` avant `...modifs` (mutant M31) ne changerait rien à aucun geste d'écran, et un test passant par
le formulaire ne pourrait pas le tuer. La preuve appelle donc `ecrireMarqueur(id, { id: 'autre', libelle: 'X' })`
directement (MQ-17). **Interdit** : construire le candidat par une liste blanche stricte
(`Object.fromEntries(CHAMPS.map(…))`), qui effacerait en silence, à la première modification d'un marqueur, tout champ
venu d'une version future (mutant M35, tué par MQ-17).

**Il n'y a pas de suppression de marqueur dans le lot 1.** L'écran n'offre qu'« Archiver » / « Restaurer », comme les
grilles (`grilles.js:24`). Aucun chemin de l'application n'appelle `supprimer('marqueurs', id)` : c'est ce qui fait de
l'orphelin un cas d'import, jamais un cas d'usage.

**L'ordre d'usage récent n'est pas ici.** Poser un marqueur **n'écrit jamais** dans le magasin `marqueurs` (§2, §6.2).

---

## 5. L'affichage : une fonction pure, `codesCarte`

### 5.1 Contrat

```js
codesCarte(marquagesDeLEleve, vocabulaire, { max = 2 }) -> {
  codes: [{ court, couleur, orphelin }],  // au plus `max`
  plus: 0,                                // rôles et équipes NON affichés ; 0 = pas de « +n »
  comportements: 0,                       // nombre de comportements posés
  nomAccessible: ''                       // '' quand rien n'est posé
}
```

1. **Ordre déterministe, indépendant de l'appareil** : `GENRES` (`role` avant `groupe`), puis
   `libelle.localeCompare(…, 'fr')`, puis `cleCourt(court)`. L'ordre « usage récent » de la feuille ne touche
   **jamais** la carte.
2. Les marqueurs de genre `comportement` ne produisent **aucun code** : ils n'alimentent que `comportements`.
3. `plus` compte les rôles et équipes au-delà de `max`, **jamais** les comportements, et se calcule sur les
   **données**, jamais sur ce qui est réellement visible.
4. Un marqueur **archivé mais posé** s'affiche normalement (décision 16).
5. Un genre ou une couleur inconnus **ou absents** **dégradent** : genre inconnu ou absent → traité comme un
   comportement (rendu le plus discret, jamais de code inattendu) ; couleur inconnue ou absente → gris. Aucune
   exception levée, jamais. La même règle vaut **hors de la carte**, sans exception : `trierMarqueurs`, les feuilles
   « ⋯ » et d'armement (fieldset « Comportements ») et l'écran du vocabulaire rangent un tel marqueur avec les
   comportements — sa pose reste donc visible **et retirable** dans la feuille — et la reprise ne le recopie pas (elle
   ne prend que `role` et `groupe`, §6.4).
6. `nomAccessible` énumère **tous** les rôles et équipes par leur libellé complet — pas seulement les deux affichés —
   puis, s'il y en a, le **nombre** de comportements, jamais leur libellé (décision 10) :
   - `Marqueurs : Arbitre, Équipe 2`
   - `Marqueurs : Arbitre, Équipe 2, Coach · 1 comportement noté`
   - `Marqueurs : 2 comportements notés`
   - `Marqueurs : Arbitre, marqueur supprimé (BX7)`

### 5.2 La règle de résolution — décision 16 contre décision 13

Dans cet ordre, sans exception :

1. `marqueurs` contient `marqueurId` → on affiche le `libelle`, le `court` et la `couleur` **actuels**. Un renommage
   change donc bien la lecture de tout l'historique : c'est ce que veut la décision 13.
2. sinon → rendu **gris** : si `genreSecours` vaut `role` ou `groupe`, un code portant `courtSecours`, nom accessible
   « marqueur supprimé (ARB) » ; sinon (`comportement`, inconnu ou absent) un repère neutre.
3. si `genreSecours` vaut `role` ou `groupe` **et** que `courtSecours` manque ou se replie sur une chaîne vide par
   `cleCourt` (sauvegarde tierce ou trafiquée — l'import l'accepte, §9.2) → code gris, texte `?`, nom accessible
   « marqueur supprimé (?) ». **Dans tous les autres cas d'orphelin** — `genreSecours` vaut `comportement`, est
   inconnu ou manque, que `courtSecours` soit présent ou non — repère neutre gris (§5.1, point 5 : le rendu le plus
   discret, jamais un code qui pourrait être celui d'un comportement, décision 10). Ce point **précise** le point 2
   pour un rôle ou une équipe sans `courtSecours`, et la règle reste univoque : le **genre** décide d'abord entre code
   et repère, le `courtSecours` ne décide que du texte d'un code. **Aucun jet d'exception, jamais.** Ces cas sont atteignables et prouvés (MIG-07 pour l'import,
   MIG-08 pour le rendu, orphelin de comportement sans `courtSecours` compris).

C'est la conséquence de format que l'avis n'avait pas tirée, et le seul endroit où les décisions 13 et 16 se
touchent : **le vocabulaire gagne toujours ; l'instantané n'existe que pour ce qui a disparu.**

---

## 6. Les écrans et les gestes

### 6.1 La carte d'élève (grille d'appel)

Une **troisième ligne** dans le bouton `.eleve-cycle` (`appel.js:398`-`:410`), après `.detail-statut` (`:400`-`:403`)
et **avant** les pastilles 🩺 / ⚠ (`:406`-`:409`) :

```js
rangeeActive ? el('span', { class: 'rang-marqueurs-carte' }) : ''   // même valeur pour TOUTES les cartes
```

**Quand la rangée existe.** `rangeeActive` est calculé **une fois, au chargement de la vue** : vrai si le vocabulaire
contient au moins un marqueur non archivé **ou** si la séance porte au moins une pose. Dès qu'il est vrai, le nœud est
rendu sur **chaque** carte, y compris quand rien n'y est posé : sinon la carte grandit au premier marqueur et la
grille saute sous le doigt pendant l'appel — le défaut déjà payé en v0.13.4 (`CLAUDE.md:181`-`:183`). Quand il est
faux, aucune pose n'est possible dans cette vue (le vocabulaire est lu une seule fois, au chargement, §6.2), donc aucun
saut non plus : la carte garde exactement la hauteur de la v0.13.5, et l'enseignant qui n'utilise pas les marqueurs
ne paie pas une ligne de plus sur chacune des cartes de l'écran le plus utilisé (`.eleve-cycle` est une colonne flex
à `gap: 4px`, `components.css:593`-`:601`). C'est la condition de l'absence du bouton « Marqueurs… » (§6.3), élargie
aux poses déjà présentes. Preuve : ECR-15.

**Réserve de hauteur, relative à la police** (`CLAUDE.md:175`) : la rangée porte sa propre taille de texte et une
hauteur minimale en `em` (§7, point 4), de sorte que la réserve grandit avec le texte de l'utilisateur au lieu de
casser à 200 %. ECR-10 le vérifie à 100 % **et** à 200 % dans le même test.

Contenu, dans cet ordre, depuis `codesCarte(…, { max: 2 })` :

1. `code1` — `el('span', { class: 'mq-code', 'data-niveau-couleur': couleur, 'aria-hidden': 'true' }, court)`
2. `code2` — idem ; **seul enfant autorisé à rétrécir** (§7)
3. `+n` — `el('span', { class: 'mq-plus', 'aria-hidden': 'true' }, \`+${plus}\`)` si `plus > 0`
4. `Math.min(comportements, 3)` fois `el('span', { class: 'mq-neutre', 'aria-hidden': 'true' })`, puis
   `el('span', { class: 'mq-neutre-plus', 'aria-hidden': 'true' }, '+')` si `comportements > 3`.
   **Même forme et même encre pour tous**, aucune couleur parlante (décision 10) — mais une encre **pleine** et une
   taille lisible à bout de bras (§7, point 3) : ce repère est le seul retour visuel d'un tap de comportement, et la
   décision 10 l'exige précisément pour que l'enseignant sache que son tap a pris
5. `el('span', { class: 'sr-only' }, nomAccessible)` — l'unique porteur du sens pour les lecteurs d'écran

Un code orphelin porte en plus `data-mq-orphelin` (gris, sans couleur) et compte dans `codes`, pas dans `plus`.

**Mise à jour** : `majBouton(eleve)` (`appel.js:284`-`:301`) reconstruit la rangée par `replaceChildren(...)` **si et
seulement si `rangeeActive` est vrai** — garde explicite, écrite en tête de ce bloc : `if (rangeeActive) { … }`. Sans
elle, le cas « vocabulaire vide et séance sans pose » appellerait `replaceChildren` sur un nœud absent dès le premier
appel de `majBouton` au chargement (`appel.js:457`, dans la boucle des cartes) : l'exception interromprait la vue avant
que la grille ne soit ajoutée au document (`:459`-`:468`), `ui.js:27`-`:36` la rattraperait (`console.error` à `:31`,
carte « Affichage impossible »), et l'écran d'appel de tout enseignant qui n'utilise pas les marqueurs serait perdu.
`majBouton` porte aussi tout l'état « mode tampon » de la carte (§6.3), qui ne lit pas la rangée et n'a pas besoin
de cette garde. Preuve : ECR-15, mutant M47. Il est déjà appelé à quatre endroits (`:315`, `:327`, `:457`, `:485`) ; ce lot lui ajoute des appelants — la pose (§6.2), la reprise et son annulation (§6.4), l'armement
et le désarmement (§6.3). **`majBouton` reste l'unique fonction qui peint une carte** : aucune autre fonction ne touche
à ses nœuds ni à ses attributs.

**État en mémoire**, à côté de `enregs` (`:173`) et `confirmes` (`:177`) :

```js
const vocabulaire = await tous('marqueurs');          // lu UNE fois : feuille, armement, rangeeActive
const marquages = grouperParEleve(await parIndex('marquages', 'seanceId', seanceId));
const marquagesConfirmes = new Map([...marquages].map(([k, v]) => [k, [...v]]));
const ordreFeuille = /* §6.2 : calculé une fois ici, depuis marqueursRecents, gelé pour toute la vue */;
```

Un marqueur créé ou archivé dans un autre onglet pendant l'appel n'apparaît qu'à la prochaine ouverture de la vue ;
une pose d'un marqueur archivé entre-temps est refusée par `appliquerMarquages` (relecture dans la transaction, §4.2)
et suit le chemin d'échec du §6.2.

`marquagesConfirmes` joue exactement le rôle de `confirmes` : c'est **le dernier état confirmé en base** auquel un
échec d'écriture revient (leçon C10, commentée à `appel.js:174`-`:176`), jamais l'état d'écran précédent.

**Cohabitation avec 🩺 et ⚠.** Les deux signaux sont des enfants de `cycle` (`appel.js:406`-`:409`), en
`position: absolute; bottom: 6px; right: 8px` et `right: 30px` (`app/css/components.css:702`-`:711`). Leur bloc
conteneur est `.eleve-cycle` lui-même (`position: relative`, `components.css:594`) — **pas** la colonne du bouton `⋯`
(`.eleve-menu`, `:650`), qui est un frère de `cycle`. Ils sont donc dessinés en bas à droite de `cycle`, sur sa
**dernière ligne** : aujourd'hui celle de `.detail-statut`, demain celle de la rangée. Mesuré à 320 px sur le HEAD
(Chromium, police locale) : la rangée occupe toute la largeur de contenu de `cycle` (67 px à 100 % de texte, 61 px à
200 %), et 🩺 comme ⚠ tombent **dedans**. Une réserve à droite ne suffit pas : `padding-right` ne retient pas des
enfants flex qui débordent (ils sont peints dans le remplissage et rognés seulement au bord de la boîte), et une
réserve assez large pour ⚠ (placé à `right: 30px`) prendrait près de la moitié de la rangée (≈ 30 px sur 67).

La règle retenue garde les signaux **là où ils sont aujourd'hui**, sur la ligne du statut : quand la carte porte une
rangée, ils remontent de la hauteur de cette rangée plus l'écart de la colonne (`gap: 4px`, `components.css:600`).
Une seule grandeur, `--h-rang-carte`, sert aux deux règles (§7, point 4) : la hauteur réservée de la rangée et le
relèvement des signaux ne peuvent pas diverger. La règle vise `.eleve-cycle:has(> .rang-marqueurs-carte)` — le
sélecteur `:has()` a déjà des précédents dans la feuille (`components.css:1097`, `:1104`, `:1106`) — et ne change
donc rien quand `rangeeActive` est faux. Mesuré sur la même page : à 100 % comme à 200 % de texte, le bas des signaux
coïncide avec le haut de la rangée, sans recouvrement. Le contrat **exige en plus une mesure** : ECR-09 compare les
rectangles et affirme leur non-recouvrement, à 320 px et à 200 % de texte. On mesure une **règle** (deux boîtes ne se
chevauchent pas), jamais un nombre de pixels dépendant de la police (`CLAUDE.md:175`).

**Débordement à 320 px.** La grille garde deux colonnes à 320 px (`components.css:576`, commentaire `:575`), soit
≈ 139 px par carte, moins la colonne `⋯` et les marges : le pire cas `code1 + code2 + « +9 » + 3 repères` **n'y tient
pas**.

**Objectif — SUSPENDU, ce n'est pas une garantie.** L'intention était la suivante :

> `.rang-marqueurs-carte` est en `flex; flex-wrap: nowrap; overflow: hidden`. **Seul `code2` porte
> `flex: 0 1 auto; min-width: 0`.** `code1`, `+n`, les repères neutres et leur `+` portent `flex: 0 0 auto`, pour
> qu'aucun d'eux ne soit rogné : sous contrainte, seul `code2` se réduirait.

`plus` restant calculé sur les données, le chiffre affiché ne ment jamais sur le nombre de marqueurs, et la vérité
complète reste dans la feuille `⋯` et dans `nomAccessible`. **Mais la mesure montre que cette règle ne suffit pas à
tenir l'affichage** (paragraphe suivant).

**Limite mesurée — une décision de l'enseignant (§14, point 11), avant la v0.14.2.** Mesuré à 320 px sur le HEAD
(Chromium, police locale ; la police de l'intégration continue diffère) :

- **à 100 % de texte**, dans le pire cas (`ARB`, `E2`, `+2`, trois repères), `code2` ne descend pas sous sa bordure et
  son remplissage (≈ 10 px) et le premier repère neutre est **rogné** au bord de la rangée ;
- **à 200 % de texte, le défaut touche les cas COURANTS** : un rôle de trois lettres plus **un seul** comportement
  suffit à couper le repère en deux, et un rôle, une équipe et un comportement le font **disparaître** entièrement.

Or ce repère est le **seul retour visuel** d'un tap de comportement (décision 10, §7 point 3). L'assertion d'ECR-09
« `code1`, `+n` et le premier repère restent entiers » est donc **rouge par construction** à 320 px, et la variante
de M21 qui s'appuie sur elle ne prouverait rien. Jusqu'à la décision, ECR-09 ne porte que le non-recouvrement et
l'absence de débordement hors de la carte ; la décision fixera l'assertion définitive.

### 6.2 La rangée dans la feuille « ⋯ »

La feuille est assemblée à `appel.js:388` :
`contenu: [grilleSt, ligneMinutes, el('div', { class: 'champ' }, inpComm), el('div', { class: 'rang-btn' }, btnFermer)]`.
La rangée s'insère **entre `ligneMinutes` et le champ commentaire** : après le statut (ce qu'on vient faire), avant le
texte libre (ce qu'on fait rarement).

Un `<fieldset>` **par genre présent**, via le helper existant `groupe(libelle, controle)` (`app/js/ui.js:152`), dans
l'ordre `GENRES`. Un genre sans marqueur actif n'a pas de fieldset. Vocabulaire entièrement vide : pas de fieldset,
et à la place `el('p', { class: 'note-discrete' }, 'Aucun marqueur défini — Plus → Marqueurs de séance.')`.

```js
el('button', { class: 'btn btn-marqueur', type: 'button', 'aria-pressed': String(porte),
               'data-niveau-couleur': couleur },          // omis quand genre === 'comportement'
   el('span', { class: 'mq-code', 'aria-hidden': 'true' }, court),
   el('span', {}, libelle))
```

Le libellé est le **nom accessible** ; le code court n'est qu'un repère visuel (`aria-hidden`), sinon le lecteur
d'écran épelle « ARB Arbitre ».

**L'état pressé se voit sans lecteur d'écran.** Aucune règle générique d'état pressé n'existe dans la feuille de
styles : `components.css:786` est portée par `.btn-statut`, `:1043` et `:1056` sont limitées à `.grille-niveaux`, et
aucune règle ne vise `aria-disabled`. Sans règle propre, un marqueur posé et un marqueur non posé seraient
**identiques à l'œil** dans la feuille — le seul endroit où vit le sens d'un comportement (décision 10). Le §7
(point 7) ajoute donc une règle pour `.btn-marqueur[aria-pressed="true"]` et pour `.btn-marqueur[aria-disabled="true"]`,
chacune avec un repère qui ne dépend pas de la couleur ; ECR-16 la prouve.

**Ordre des boutons, et pourquoi il est gelé.** Décision 4 : tout le vocabulaire actif est proposé (pas de plafond
codé), la rangée passe à la ligne (`flex-wrap: wrap`).

- Source : `localStorage`, par le mécanisme existant `sauverPrefs` (`app/js/state.js:41`, clé `carnet-eps:prefs`),
  sous `marqueursRecents` — liste d'`id`, la plus récente en tête, plafonnée à 40. Mise à jour **après un retour
  d'écriture réussi**, jamais sur l'intention : un marqueur refusé (élève pas encore appelé) ne remonte pas en tête.
  Jamais sur un retrait.
- Un marqueur absent de la liste se range après les autres, par `libelle.localeCompare(…, 'fr')`.
- Valeur absente, illisible ou inconnue : on dégrade vers l'ordre du catalogue, sans erreur (`chargerPrefs`,
  `state.js:33`, avale déjà l'exception).
- **L'ordre est calculé une fois, au chargement de la vue d'appel (`ordreFeuille`, §6.1), et gelé pour toute la
  durée de la vue** — feuille « ⋯ » comme feuille d'armement (§6.3). Un bouton qui se déplace sous le doigt entre deux
  taps est un faux tap garanti au gymnase, et le geste le plus rapide est justement la boucle du mode tampon (armer,
  taper cinq élèves, changer de marqueur) : geler seulement l'intérieur d'une feuille ferait remonter en tête, à
  chaque changement, le marqueur qu'on vient de finir. `marqueursRecents` continue d'être **écrit** après chaque
  retour réussi (rien n'est perdu si Android tue l'onglet) ; c'est sa **lecture** qui n'a lieu qu'une fois, et le
  nouvel ordre ne s'applique qu'à la prochaine ouverture de la vue. (Le constat C15 proposait de n'écrire qu'à la
  sortie de la vue ; écarté, parce qu'une sortie par fermeture d'onglet perdrait l'usage de toute la séance.)
- `effacerPrefs()` (`state.js:54`) l'efface à l'import et à la purge, ce qui est correct : le catalogue qu'il
  désignait a été remplacé.

**Marqueurs archivés.** Un archivé **non posé** n'apparaît pas. Un archivé **posé** apparaît en dernier de son genre,
`aria-pressed="true"`, avec `data-mq-archive` (style atténué) et le libellé suffixé « (archivé) » : on peut le
**retirer**, pas en poser un nouveau.

**Le geste.** Tap = bascule, calquée sur `definirStatut` (`appel.js:303`-`:331`) :

1. `if (!enregs.has(eleve.id))` → **refus explicite**, aucune écriture (ci-dessous).
2. **Règle contractuelle n° 2 — la bascule est résolue dans la vue, l'écriture est absolue.** Le tap calcule
   `veut = !presenceVoulue(...)` à partir de l'état VOULU (`grilles.js:150`-`:151`), jamais de l'écran ni de la base
   seule, puis envoie `op: veut ? 'poser' : 'retirer'`. **Aucune opération « basculer » n'est jamais transmise à
   `io.js`** : deux taps rapides donnent toujours pose → retrait, que le second arrive pendant ou après l'écriture du
   premier (défaut réel corrigé en v0.13.1 côté grilles, `grilles.js:147`-`:149`).
3. Mise à jour optimiste : état VOULU, `aria-pressed`, `majBouton(eleve)`, `aria-busy="true"` sur le contrôle touché
   et **rien n'est désactivé** (`grilles.js:219` — l'ancien verrou jetait le tap suivant).
4. Dans la file d'attente (`let fileMarqueurs = Promise.resolve();` en portée module, comme `grilles.js:100` ; et
   `await fileMarqueurs.catch(() => {});` à l'ouverture de la vue, comme `grilles.js:110`) :
   `await appliquerMarquages(seanceId, [{ eleveId, marqueurId, op }])`, puis `marquagesConfirmes` **entièrement
   reconstruit** depuis `res.marquages`. La file ne sert pas à IndexedDB (qui sérialise déjà) mais à **l'ordre des
   retours** : la fonction renvoie l'état complet de la séance, et un retour ancien arrivant après un récent ferait
   régresser l'affichage.
5. Échec :
   - `e.name === 'AppelManquant'` → on ne défait l'intention **que si aucun tap plus récent ne l'a remplacée** (même
     garde qu'à `appel.js:324`) ; annonce du refus **par son propre texte** (§9.1, « appel disparu de la base ») —
     jamais celui du refus décidé par la vue : ce refus-ci naît quand la vue croit l'élève appelé (le point 1 l'a
     laissé passer), donc quand « Terminer l'appel » peut être masqué et le statut déjà affiché ; **aucun échec
     durable enregistré** — ce n'est pas une panne
     d'écriture mais une action attendue de l'enseignant, et les confondre laisserait une ligne rouge permanente
     après un geste normal ; aucune relance automatique.
   - sinon → échec durable en `sessionStorage`, clé `carnet-eps:marqueurs-echecs:${seanceId}`, même mécanique que
     `grilles.js:125`-`:142` : **identifiants seulement, jamais un nom d'élève hors d'IndexedDB** (BIBLE règle 4) ;
     réalignement sur la base à la réouverture ; échec d'un élève absent de la vue conservé sans être affiché
     (`horsVue`, `grilles.js:129`-`:132`) ; `sessionStorage` indisponible n'interrompt rien (try/catch,
     `grilles.js:139`) ; `toast` en relais si le contrôle n'est plus dans le document (`grilles.js:259`).
6. `finally` : quand la rafale est finie, **une seule** repeinture depuis `marquagesConfirmes`
   (`grilles.js:244`-`:262`). Une erreur survenue en cours de rafale n'est pas recouverte par le succès suivant.

**Règle contractuelle n° 3 — une pose ne passe jamais par `definirStatut` et n'emprunte jamais son annonce.**
`definirStatut` écrit `annonce.textContent = '<élève> : <statut>'` avant la transaction (`appel.js:314`). Les
marqueurs écrivent dans la **même** région `role="status"` (`appel.js:239`) mais avec leurs propres messages (§9.1) :
aucun message de marqueur ne doit laisser croire qu'un statut a changé.

**Refus « pas encore appelé » (décision 14).** Tant que l'élève n'a aucun enregistrement d'appel :

- les boutons portent `aria-disabled="true"` — **pas** `disabled` : un contrôle qui sort de l'ordre de tabulation
  sous le focus le renvoie au `<body>` (leçon B50, `app/js/modules/reglages.js:105`-`:109`) ;
- un tap ne fait **aucune** écriture et produit le toast du §9.1 ;
- un `el('p', { class: 'statut statut-erreur' })` permanent dans le premier fieldset le dit avant même le tap.

**Le chemin praticable** est le bouton existant « Terminer l'appel » (`appel.js:241`, libellé recalculé `:276`, barre
collante `:467`) : après lui, toutes les cartes acceptent les marqueurs. C'est le geste recommandé au gymnase, et il
existe déjà — ce lot ne le modifie pas (§2, point ouvert 3) et **ne le cache jamais**, pas même en mode tampon
(§6.3) : un message de refus qui le nomme doit pouvoir compter sur sa présence à l'écran.

**Cumul.** Aucune exclusivité (décision 2) : deux équipes peuvent être pressées en même temps, aucun bouton n'en
dépresse un autre, aucun message ne le déconseille. La feuille montre les deux, c'est ce qui permet de corriger.

### 6.3 Le mode tampon

**Armement.** Un bouton `el('button', { class: 'btn', type: 'button', 'aria-haspopup': 'dialog' }, 'Marqueurs…')`
dans la barre collante `.barre-appel` (`appel.js:467`, CSS `components.css:221`-`:247`), à droite de `btnTerminer`
dans le même `.rang-btn` : c'est la zone du pouce, déjà éprouvée au gymnase (commentaire `appel.js:465`-`:466`). Le
bouton est **absent** si le vocabulaire actif est vide. Pendant que le mode est armé, **ce même bouton** se relibelle
« Changer de marqueur » (même place, même fonction : il rouvre la feuille d'armement) ; il reprend « Marqueurs… » au
désarmement.

Un tap ouvre une feuille `ouvrirFeuille` (`ui.js:160`) : mêmes fieldsets, mêmes boutons, même ordre gelé (celui de la
vue, §6.2 — identique d'un armement à l'autre), mais
**sémantique d'armement** — `aria-pressed` désigne le marqueur armé (un seul à la fois). Choisir un marqueur ferme la
feuille et arme le mode ; rechoisir le marqueur armé **désarme**. En tête :
`el('p', {}, 'Chaque carte touchée posera ou retirera ce marqueur. L’appel ne bouge pas tant que le mode est actif.')`.

**Ce que l'armement change** (`let tampon = null;` en portée de vue) :

1. **Fond de grille distinct** : `grille.dataset.tampon = id` → `.grille-appel[data-tampon]` (§7). Aucun style en
   ligne.
2. **Libellé permanent** : une première ligne `el('div', { class: 'barre-tampon no-print' }, …)` **dans**
   `.barre-appel`, avant le `.rang-btn`, portant le code, « Mode tampon : Arbitre » et le bouton
   **« Sortir du mode (Échap) »**. Le `.rang-btn` n'est pas vidé : **`btnTerminer` y reste**, et son affichage reste
   l'affaire exclusive de `majCompteurs()` (`appel.js:250`-`:278`, qui le masque ou le relibelle à `:271`-`:277`) — le
   mode ne le masque, ne le relibelle et ne le restaure jamais. Deux raisons, qui tiennent ensemble : c'est le seul
   chemin praticable pour lever le refus « pas encore appelé » (§6.2), que le mode rend justement tapable (point 4) ; et
   `majCompteurs()` est rappelé par tout changement de statut (`:316`, `:328`, `:486`), y compris par la soupape de
   l'appui long pendant le mode armé — un bouton que le mode cacherait ressusciterait au premier statut changé.
   **Aucun libellé du mode ne commence par « Terminer »** : le pouce habitué à « Terminer l'appel » ne doit pas sortir
   du mode en croyant finir l'appel, ni l'inverse.
3. **Nom accessible de chaque carte — enrichi, jamais remplacé.** Pas d'`aria-label` sur `cycle` : il écraserait le nom
   calculé depuis le contenu, qui porte le statut (`.detail-txt`, `appel.js:295`-`:298`), l'inaptitude et l'alerte
   (les `.sr-only` des pastilles, `:406`-`:409`, qui sont **dans** `cycle`) et les marqueurs posés (`nomAccessible`,
   §6.1 point 5) — exactement pendant que l'enseignant parcourt la classe. À la place, `majBouton` ajoute en dernier
   enfant de `cycle`, **seulement en mode armé**, `el('span', { class: 'sr-only mq-action' }, \` — ${porte ? 'retirer' :
   'poser'} ${libelle}\`)`, et pose `cycle.setAttribute('aria-pressed', String(porte))`. Hors mode, `majBouton` ne rend
   pas ce nœud et retire `aria-pressed`. Le nom **dit ce que fera le tap** sans rien masquer, et il est recalculé à
   chaque appel de `majBouton`.
4. **Cartes non appelées** : `carteE.dataset.tamponRefus` est posé ou retiré **par `majBouton`**, à chaque appel,
   selon `tampon && !enregs.has(eleve.id)` — donc recalculé quand l'élève reçoit un statut par la soupape (appui long,
   `⋯`) ou par « Terminer l'appel ». Style atténué. Elles restent tapables, pour produire un refus **visible** plutôt
   qu'un tap sans effet ; le texte de ce refus — décidé par la vue — ne nomme que des contrôles présents à l'écran
  (§9.1).
5. **Annonce** : voir §9.1.

Armer, changer de marqueur et désarmer appellent `majBouton` sur **chaque** carte : c'est ainsi que les points 3 et 4
s'appliquent et se retirent, sans second chemin de rendu (§6.1).

**Ce que le tap fait.** Dans le gestionnaire `click` du bouton `cycle` (`appel.js:441`-`:446`), **après** la garde
`if (longPress) return;` et **avant** toute lecture du cycle de statut :

```js
if (tampon) { await basculerMarqueur(eleve, tampon); return; }
```

`basculerMarqueur` est exactement la routine du §6.2, refus compris. **Le tap ne fait plus l'appel** : c'est l'unique
danger du mode, et il est rendu visible par trois signaux simultanés (fond de grille, barre permanente, nom
accessible). Restent inchangés et servent de soupape : l'appui long (`appel.js:418`-`:439`) et le bouton `⋯` ouvrent
toujours la feuille complète, même mode armé ; l'armement persiste à la fermeture de la feuille.

**Raccourcis clavier suspendus.** Le gestionnaire `keydown` de `cycle` (`appel.js:448`-`:452`) consulte
`RACCOURCIS_STATUT` (`appel.js:16`). Nouvelle première ligne : `if (tampon) return;` — **sans `preventDefault`** : on
ne mange pas la touche, on ne fait rien. Espace et Entrée conservent l'activation native du bouton et passent donc par
le `click` ci-dessus : le clavier pose et retire le marqueur comme le doigt.

**Sortie.** Quatre chemins, une seule fonction `desarmer()` : le bouton « Sortir du mode (Échap) » ; **Échap** (écouteur
`keydown` sur `document`, posé à l'armement, retiré au désarmement, gardé par
`if (document.querySelector('dialog[open]')) return;` — une feuille modale native traite son propre Échap et
l'événement remonte quand même) ; le ré-armement du même marqueur ; la sortie de la vue
(`window.addEventListener('hashchange', desarmer)`, retiré par `desarmer` — motif de nettoyage déjà employé dans
`grilles.js:363`-`:365` et `:484`-`:489`).

`desarmer()` fait, dans cet ordre : `tampon = null` ; `delete grille.dataset.tampon` ; retrait de `.barre-tampon` ;
libellé « Marqueurs… » rendu au bouton d'armement ; `majBouton` sur **chaque** carte (qui, `tampon` étant nul, retire
la mention d'action, `aria-pressed` et `data-tampon-refus`) ; annonce de sortie ; focus rendu au bouton
« Marqueurs… ». `btnTerminer` n'y figure pas : le mode ne l'a jamais touché (point 2). Le retrait complet sur toutes
les cartes reste une garantie à part entière (ECR-05) : une mention d'action oubliée ferait annoncer « poser Arbitre »
sur une carte dont le tap refait l'appel.

### 6.4 « Reprendre les marqueurs de la séance précédente »

**Où.** Dans `carteTete` (`appel.js:242`-`:248`), après `compteursEl` et avant `annonce` :
`el('div', { class: 'rang-btn no-print' }, btnReprendre)`.

**Quelle séance sert de source.** Au chargement de la vue, on remonte `seancesSeq` (déjà calculé et trié par date à
`appel.js:234`-`:235`) **vers l'arrière** depuis l'indice `numero − 2`, et l'on retient la **première** séance qui
porte au moins une pose d'un marqueur non archivé de genre `role` ou `groupe` (une lecture
`parIndex('marquages', 'seanceId', s.id)` par séance remontée, arrêt à la première trouvée). Ne regarder que la
séance immédiatement précédente casserait la chaîne à la première séance sans marqueurs — cours annulé, évaluation,
appel fait par « Terminer l'appel » seul, semaine pressée — et ferait reposer les 30 élèves à la main, exactement la
charge que la décision 6 existe pour supprimer. Le libellé nomme la séance source, donc rien n'est ambigu.

**Quand le bouton existe** — **absent** (pas désactivé : il n'y a rien à expliquer) sauf si les deux conditions sont
réunies : le vocabulaire contient au moins un marqueur non archivé de genre `role` ou `groupe` ; une séance source
existe (ci-dessus). Libellé : `Reprendre les marqueurs de la séance ${numeroPrec} (${dateFR(prec.date)})`, où
`numeroPrec` est le rang de la séance source dans `seancesSeq` — `dateFR` est déjà importé (`appel.js:11`).

**Ce qui est repris — règles exhaustives :**

| Cas | Règle |
|---|---|
| Genre `comportement` | **jamais** repris (décision 6) |
| Genre `role`, `groupe` | repris |
| Marqueur archivé aujourd'hui | **non** repris |
| `marqueurId` absent du vocabulaire (orphelin) | **non** repris |
| Élève sans enregistrement d'appel dans la séance **courante** | **ignoré** — la reprise ne crée aucune présence (décision 14) |
| Élève **absent** aujourd'hui mais appelé | **repris** : son équipe est un fait de la séquence, et ne pas la reposer creuse un trou la semaine suivante |
| Élève arrivé depuis | rien à reprendre ; compté dans le compte rendu |
| Élève parti | absent de `eleves` (`appel.js:164`-`:166`), donc hors sujet |
| Marqueur déjà posé aujourd'hui | conservé, non dupliqué — l'opération est **idempotente** |
| Marqueur posé aujourd'hui et absent de la séance précédente | **jamais** retiré — la reprise **ajoute**, elle ne synchronise pas |

**Le geste.** Comptes recalculés **à chaque pression**, avant tout écran. Si rien à reprendre : pas de dialogue, un
`toast` seulement. Sinon `confirmer({ …, action: 'Reprendre', danger: false })` (`ui.js:182`, dont la signature
accepte déjà `action` et `danger`), puis **une** transaction :
`appliquerMarquages(seanceId, operations, { surEleveNonAppele: 'ignorer' })`, passée **dans la file `fileMarqueurs`**
(§6.2, point 4) pour que son retour ne soit jamais doublé par celui d'un tap plus ancien.

Reprise et annulation suivent **le même chemin de retour**, écrit une fois (`appliquerRetour(res)`) :
`marquages` et `marquagesConfirmes` entièrement reconstruits depuis `res.marquages`, `majBouton` sur chaque élève
touché, annonce. Succès de la reprise : `appliquerRetour(res)`, puis
`toast(\`${Y} marqueurs repris.\`, { action: annulerReprise, libelleAction: 'Annuler' })` — 20 s, focus sur l'action,
comportement déjà fourni par `toast` (`ui.js:244`). `annulerReprise` passe elle aussi par `fileMarqueurs`, appelle
`appliquerMarquages(seanceId, res.creees.map((x) => ({ ...x, op: 'retirer' })))`, puis `appliquerRetour` sur **son**
retour et annonce `Reprise annulée : ${Y} marqueurs retirés.` En cas d'échec elle ne touche à rien et **relance**
l'erreur : `toast` l'affiche déjà en « Annulation impossible : <motif> » (`ui.js:273`-`:281`). Sans ce chemin de
retour, la base serait juste et les cartes afficheraient encore les codes repris — l'écran mentirait sur la base, la
classe de défaut C10 que `marquagesConfirmes` existe pour empêcher (§6.1). **L'annulation retire exactement les
couples créés**, jamais ceux qui préexistaient : c'est `creees` (§4.2) qui le garantit, pas un filtre d'écran. Échec
de la reprise : `toast`, aucun écran modifié. **Pendant l'attente, le bouton porte `aria-disabled="true"`, pas
`disabled`**, et son gestionnaire retourne immédiatement tant que l'attribut est posé (motif de `reglages.js:103`-`:108`) :
un contrôle `disabled` qui a le focus sort de l'ordre de tabulation et renvoie le focus au `<body>` (leçon B50, même
règle qu'au §6.2). Il est relibellé « Reprise en cours… » puis rendu à son libellé, et l'attribut est retiré en
`finally`. On s'écarte ici volontairement de `btnTerminer` (`appel.js:480`, `:490`), qui utilise encore `disabled` : ce
défaut préexistant n'est pas corrigé par ce lot.

### 6.5 L'écran du vocabulaire

**Route et accès.** Nouveau module `app/js/modules/marqueurs.js`, export `initialiser()`, importé dans
`app/js/main.js` à côté des autres (`main.js:8`-`:18`). `main.js:23` : `TITRES.marqueurs = 'Marqueurs de séance'`.
`main.js:26` : `PARENT.marqueurs = 'plus'`. Ces deux tables sont la source unique du nom accessible de la vue et du
fil de retour (commentaire `main.js:20`-`:22`) ; les oublier rend la vue muette au lecteur d'écran. `main.js:33`-`:41` :
`lien('marqueurs', carte('Marqueurs de séance', 'Rôles, équipes et comportements posés d’un tap pendant l’appel.'))`,
inséré après « Séquences & séances ». Sous-routes sur le modèle de `grilles.js` : `#/marqueurs`,
`#/marqueurs/nouveau`, `#/marqueurs/modifier/<id>`.

**La liste.** Retour vers `#/plus` ; une carte d'introduction portant exactement :

> Un marqueur vit **le temps d'une séance**. Les rôles et les équipes s'affichent par leur code sur la carte de
> l'élève ; les comportements n'affichent qu'un repère neutre, leur sens reste dans la feuille de l'élève.
> Renommer sert à **corriger une faute**. Pour changer de sens, créez un nouveau marqueur : l'ancien reste lisible
> dans l'historique.

(Décisions 10 et 13. La seconde phrase est une **discipline, pas une garantie** : l'écran le dit, il ne le promet
pas.) Puis une `.barre-actions no-print` avec « Nouveau marqueur » (motif `grilles.js:17`), et la liste groupée par
genre dans l'ordre `GENRES`, **archivés en dernier** à l'intérieur de chaque genre (motif de tri `grilles.js:18`).
Chaque carte : titre = libellé ; texte = `${court} · ${LIBELLES_GENRE[genre] ?? LIBELLES_GENRE.comportement}${archivee ? ' · archivé' : ''}`
— **un genre absent ou inconnu se lit « Comportements »** (§5.1 point 5), jamais « undefined » ; un
aperçu `.mq-code` identique à celui de la carte d'élève ; un `.rang-btn` avec « Modifier » et
« Archiver » / « Restaurer ». **Aucune suppression** (§4.4). **Un tel marqueur ne peut être ni archivé ni modifié** tant
que son genre n'est pas valide (`ecrireMarqueur` refuse, §4.4) : le refus s'affiche dans un `toast` depuis la liste
(il n'y a pas de `p.statut` hors du formulaire), et dans le `p.statut` du formulaire depuis « Modifier ». Vocabulaire vide : une carte « Votre premier marqueur »
et le bouton « Nouveau marqueur », rien d'autre (§2).

**Le formulaire.** Un `<form>` avec un `el('p', { role: 'status', class: 'statut' })` pour le motif de refus et un
`btn btn-principal` en soumission — motif exact de `grilles.js`.

| Champ | Contrôle | Règle d'écran |
|---|---|---|
| Libellé | `input[type=text][maxlength=40]` | obligatoire |
| Code court | `input[type=text][maxlength=3][autocapitalize=characters]` | obligatoire, mis en majuscules à la saisie ; **unique sur `cleCourt(court)`** parmi les non archivés — sinon « É1 » et « E1 » deviennent deux codes indiscernables au gymnase |
| Genre | `select` sur `GENRES` | **verrouillé (`disabled`) sur un marqueur existant**, avec la note « Le genre ne change pas : créez un nouveau marqueur. » (décision 13) |
| Couleur | `select` sur `COULEURS` (`grilles-calcul.js:4`), option par option comme `grilles.js:65`-`:67` | **masqué** quand `genre === 'comportement'`, avec la note « Les comportements n’affichent pas de couleur sur la carte. » |

**Aperçu vivant** : à droite des champs, un `.mq-code` mis à jour à chaque frappe, montrant exactement le rendu de la
carte d'élève. C'est le seul endroit où l'enseignant voit son code avant le gymnase. (Précisé par la revue de la
v0.14.1, §16 : pour un comportement, « le rendu de la carte d'élève » est le repère `.mq-neutre`, sans code ; et les
majuscules sont affichées par le CSS, appliquées à l'aperçu et à l'enregistrement, jamais réécrites pendant la frappe.)

Enregistrement réussi : `location.hash = '#/marqueurs'` + `toast('Marqueur enregistré.')`. Refus : le motif s'affiche
dans le `p.statut.statut-erreur`, **rien n'est écrit**, la saisie reste à l'écran.

Aucune couleur n'est interdite par principe (`--niv-vert` et `--niv-turquoise` valent respectivement `--stb-present`
et `--stb-inapte`) : la lisibilité est assurée par la **forme** du §7, pas par une liste d'exclusion — l'audit V7-B05
avait raison sur ce point.

---

## 7. CSS

À ajouter dans `app/css/components.css`, après le bloc des cartes d'appel (`:715`-`:731`). Classes créées, **sept**,
chacune portée par un `el()` des §6.1 à §6.3 : `.btn-marqueur`, `.rang-marqueurs-carte`, `.mq-code`, `.mq-plus`,
`.mq-neutre`, `.mq-neutre-plus`, `.barre-tampon`. `.mq-plus` et `.mq-neutre-plus` n'ont pas de règle propre : elles
prennent celle des enfants de la rangée (point 4). S'y ajoute `.mq-action`, sans style propre : elle n'est qu'un
repère pour les tests, le nœud porte aussi `.sr-only`. Les fieldsets des feuilles n'ont pas de classe nouvelle : ils
viennent de `groupe()` (`app/js/ui.js:152`), classe `champ groupe`. **Aucune collision** : `.pastille` (`:340`, le rond de couleur d'une classe), `.pastille-info`,
`.pastille-warn`, `.badge`, `.badge-statut` existent et ne sont pas réutilisées (piège § 9.3 de l'avis).

1. **Couleur** : aucune écriture de `element.style`. La couleur passe par `data-niveau-couleur`, dont le pont vers les
   jetons existe déjà et est **générique** (`components.css:1047`-`:1054`), tandis que les règles visuelles qui
   l'utilisent sont scopées à `.grille-niveaux` (`:1055`-`:1056`) — aucune fuite dans les deux sens.
2. **Contraste par construction** :
   `.mq-code { color: var(--c-texte); border: 1.5px solid var(--niveau-couleur, var(--c-bordure)); background: color-mix(in srgb, var(--niveau-couleur, transparent) 12%, var(--c-surface)); }`.
   Le **texte est toujours en encre pleine** ; la couleur ne porte que la bordure et une teinte à 12 %. On ne dépend
   donc d'aucun ratio par couleur, en clair comme en sombre (`color-mix` a un précédent : `app/css/responsive.css:32`).
   Le test affirme la **règle** — `getComputedStyle(code).color === getComputedStyle(document.body).color` dans les
   deux thèmes — et non un ratio mesuré.
3. `.mq-neutre { width: 10px; height: 10px; border-radius: 999px; background: var(--c-texte); }` — même forme, même
   encre pour tous les comportements, sans couleur parlante (décision 10). **Encre pleine, pas `--c-texte-2`** : ce
   point est le seul retour visuel d'un tap de comportement, lu à bout de bras ; l'encre atténuée est réservée au texte
   secondaire. La décision 10 retire le **sens** de la carte, pas le **retour de geste** : ce sont deux exigences, et
   la seconde est mesurée par ECR-08.
4. `.eleve-cycle { --h-rang-carte: calc(0.74rem * 1.2 + 6px); }` puis
   `.rang-marqueurs-carte { display: flex; flex-wrap: nowrap; align-items: center; gap: 3px; font-size: 0.74rem; line-height: 1.2; min-height: var(--h-rang-carte); overflow: hidden; }`
   et `.rang-marqueurs-carte .mq-code { line-height: 1.2; padding: 1px 4px; }` — la réserve est exprimée **dans
   l'unité de la police de la rangée** : une ligne de texte (`1.2em` de la rangée, soit `0.74rem * 1.2`) plus la
   bordure et le remplissage vertical du code (2 × 1,5 px + 2 × 1 px ≤ 6 px). Elle suit donc le texte agrandi par
   l'utilisateur ; un seuil en pixels absolus serait dépassé à 200 % et la carte sauterait au premier marqueur. Puis
   `.rang-marqueurs-carte > * { flex: 0 0 auto; }` et
   `.rang-marqueurs-carte .mq-code:nth-of-type(2) { flex: 0 1 auto; min-width: 0; }` (§6.1). Enfin le relèvement des
   signaux (§6.1, « Cohabitation ») :
   `.eleve-cycle:has(> .rang-marqueurs-carte) > :is(.pastille-info, .pastille-warn) { bottom: calc(6px + var(--h-rang-carte) + 4px); }`
   — `6px` est le `bottom` actuel (`components.css:705`), `4px` l'écart de la colonne (`:600`). Aucun `padding-right`
   sur la rangée : il ne réservait rien (§6.1).
5. `.grille-appel[data-tampon] { background: color-mix(in srgb, var(--c-accent) 8%, transparent); outline: 2px dashed var(--c-accent); outline-offset: 4px; border-radius: var(--r-carte); }`.
6. `.btn-eleve[data-tampon-refus] { opacity: 0.55; border-style: dashed; }` ; `[data-mq-orphelin]` et
   `[data-mq-archive]` : encre atténuée, aucune couleur.
7. `.btn-marqueur { min-height: 44px; }` — cible tactile du terrain (`CLAUDE.md:28`). Puis les deux états, chacun
   avec un repère **qui ne dépend pas de la couleur**, sur le modèle de `components.css:1043` :
   `.btn-marqueur[aria-pressed="true"] { background: color-mix(in srgb, var(--niveau-couleur, var(--c-accent)) 18%, var(--c-surface)); outline: 2px solid currentColor; outline-offset: 2px; font-weight: 700; }`
   et `.btn-marqueur[aria-disabled="true"] { opacity: 0.55; border-style: dashed; cursor: not-allowed; }`. La
   même règle sert la feuille « ⋯ » (marqueur posé) et la feuille d'armement (marqueur armé, §6.3).
8. `.barre-tampon { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; font-size: 0.85rem; }`. Elle
   hérite de la pile `.barre-appel` (`components.css:225`), délibérément sous les toasts : un « non enregistré » prime
   sur un libellé de mode.
9. **Impression — décision 8 tenue, sans CSS mort.** L'écran d'appel s'imprime (la barre collante y redevient un bloc,
   `components.css:258`-`:272`) et la carte d'élève n'est pas masquée : sans règle, les codes des rôles et des équipes
   sortiraient sur le papier. Dans le `@media print` existant (`components.css:991`-`:1001`), ajouter
   `.rang-marqueurs-carte` à la liste masquée. `.mq-code` n'entre **pas** dans la liste `print-color-adjust`
   (`:1027`-`:1034`) : il ne s'imprime jamais. `.barre-tampon` porte `no-print` (§6.3), déjà masqué par `:999`. Les
   boutons de la feuille sont des `.btn`, déjà masqués par `:995` : rien à ajouter pour eux. Prouvé par MQ-16.

---

## 8. Cascades, aperçus, annulation

Décision 16 : « séance supprimée = ses marqueurs partent avec elle ».

- `collecterSeance` (`io.js:670`-`:675`) : ajouter `marquages: await parIndex('marquages', 'seanceId', seanceId)`.
  Cela couvre `supprimerSeanceEnCascade` (`:677`) **et** `supprimerSequenceEnCascade`, qui l'appelle en boucle — **à
  condition** d'ajouter la clé `marquages: []` à l'objet de `:684` et un `objets.marquages.push(...o.marquages)` à
  côté de `:688`. **Oublier ce second point laisse les poses orphelines sans aucune erreur** : c'est le défaut le plus
  facile à introduire ici, il a son mutant.
- `supprimerEleveEnCascade` (`io.js:700`-`:720`) : clé `marquages: []` dans l'objet de `:701`, puis
  `objets.marquages = await parIndex('marquages', 'eleveId', eleveId);` à côté de `:702`. Cette lecture par index de
  plus fait passer de 5 à 6 le compte de la garde C37 (`tests/e2e/audit5-lot5.spec.mjs:185`), écrite à la main :
  elle est au §12.2.
- `apercuSuppressionEleve` (`io.js:728`) : + `marquages: await compterIndex('marquages', 'eleveId', eleveId)`.
- `apercuSuppressionSequence` (`io.js:738`) : + un cumul `compterIndex('marquages', 'seanceId', s.id)` dans la boucle
  de `:741`.
- **Aperçu de la suppression d'une séance — à créer.** Il n'existe pas : la confirmation de
  `app/js/modules/sequences.js:225` est un message figé (« son appel éventuel sera supprimé »), sans `detail`, suivi de
  `supprimerSeanceEnCascade` à `:226`. Sans aperçu, supprimer une séance emporterait tous ses marqueurs **sans le
  dire** — la perte muette que la décision 16 veut rendre visible. Nouvelle fonction dans `io.js`, à côté de
  `apercuSuppressionSequence` :
  `export async function apercuSuppressionSeance(seanceId) { return { appels: await compterIndex('appels', 'seanceId', seanceId), marquages: await compterIndex('marquages', 'seanceId', seanceId) }; }`.
  À `sequences.js:225`, sur le motif exact de la séquence (`sequences.js:249`-`:253`) : lire l'aperçu avant
  `confirmer`, message réduit à `` `Séance ${idx + 1}/${total} du ${dateFR(s.date)}.` `` et
  `detail: detailSuppression(comptes)` — qui produit « Seront aussi supprimés : 1 appel, 4 marqueurs posés. » grâce
  aux `LIBELLES` ci-dessous, et rien quand tout vaut 0 (`io.js:769`-`:774`). L'annulation existante
  (`sequences.js:228`-`:232`, `restaurer(objets)`) restaure les poses sans une ligne de plus, puisque `objets` les
  contient.
- **Textes figés qui énumèrent ce qu'une suppression emporte.** Deux cartes le font en dur :
  `sequences.js:246` (« Supprime la séquence, ses séances, leurs appels, ses évaluations et leurs notes. ») et
  `eleves.js:576` (« Supprime l'élève et TOUT son historique (appels, inaptitudes, certificats, notes). »). Après ce
  lot, les deux omettraient les marqueurs posés — et la seconde omet **déjà** les observations et les fichiers que
  `supprimerEleveEnCascade` emporte (`io.js:711`, `:705`-`:716`) : le défaut est l'énumération elle-même, pas l'oubli
  d'un mot. Les deux phrases sont réécrites **sans énumération** — « Supprime la séquence et tout ce qui en dépend ;
  le détail s'affiche avant de confirmer. » et « Supprime l'élève et TOUT son historique ; le détail s'affiche avant
  de confirmer. » —, suivies de leur rappel de sauvegarde inchangé. C'est vrai, parce que les deux confirmations
  lisent déjà leur aperçu et l'affichent en `detail` (`sequences.js:249`-`:253`, `eleves.js:579`-`:583`), et cela
  le restera au prochain magasin. Livré en v0.14.0, avec les cascades.
- `supprimerLot` (`io.js:645`) et `restaurer` (`io.js:655`) sont génériques sur `{ store: [records] }` :
  **l'annulation de 20 s fonctionne sans une ligne de plus**, à condition que les points ci-dessus soient faits.
- `detailSuppression` (`io.js:769`) lit `LIBELLES` : la phrase « Seront aussi supprimés : 4 marqueurs posés » n'existe
  que si l'entrée ci-dessous est ajoutée.

**`LIBELLES` (`io.js:751`-`:766`) — load-bearing, pas décoratif :**

```js
  marqueurs: ['marqueur', 'marqueurs'],
  marquages: ['marqueur posé', 'marqueurs posés'],
```

Trois écrans en dépendent, et les oublier est silencieux : `resumeComptes` (`app/js/modules/sauvegarde.js:10`-`:15`)
itère **sur `LIBELLES`**, pas sur `STORES` ; `sauvegarde.js:91` (`absents.filter((n) => LIBELLES[n])`) — sans entrée,
restaurer une sauvegarde de schéma 3 sur une base de schéma 4 effacerait les marqueurs **sans le dire** (`:99`) ; et
`detailSuppression`. C'est exactement la garde écrite en commentaire à `io.js:748`-`:750`, et elle est **dérivée** :
le test C38 (`tests/e2e/audit5-lot5.spec.mjs:189`-`:197`) compare `Object.keys(LIBELLES)` à `STORES` sans `meta`, donc
il rougira tout seul.

**Le vocabulaire (`marqueurs`) n'est dans aucune cascade** : archiver, jamais supprimer (§4.4).

---

## 9. Sauvegarde, import, compatibilité (décision 17) — et ce que le lot ne touche pas

### 9.1 Textes exacts

| Situation | Texte |
|---|---|
| Fieldsets de la feuille | `Rôles` · `Équipes` · `Comportements` |
| Vocabulaire vide, dans la feuille | `Aucun marqueur défini — Plus → Marqueurs de séance.` |
| Refus, permanent (dans le fieldset) | `Choisissez d’abord un statut : un marqueur ne fait pas l’appel.` |
| Refus, au tap, dans la feuille « ⋯ » | `Appel non fait pour Léa Martin : choisissez d’abord un statut ci-dessus, ou « Terminer l’appel » pour passer tout le monde en présent.` |
| Refus, au tap, en mode tampon | `Appel non fait pour Léa Martin : appui long ou « ⋯ » pour choisir son statut, ou « Terminer l’appel » pour passer tout le monde en présent.` |
| Refus venu de la base (`AppelManquant` rendu par `appliquerMarquages`, feuille comme mode tampon) | `Appel introuvable pour Léa Martin : il a changé sur un autre écran. Rechargez la page.` |
| Annonce, pose | `Arbitre posé sur Léa Martin.` |
| Annonce, retrait | `Arbitre retiré de Léa Martin.` |
| Annonce, échec | `Arbitre non enregistré pour Léa Martin.` |
| Toast, échec | `Marqueur non enregistré : <motif>` |
| Bouton d'armement | `Marqueurs…` |
| Barre du mode | ligne `.barre-tampon` : `Mode tampon : Arbitre` + `Sortir du mode (Échap)` ; dans le `.rang-btn` : « Terminer l’appel… » inchangé + `Changer de marqueur` (le bouton « Marqueurs… » relibellé) |
| Annonce, armement | `Mode tampon armé : Arbitre. Chaque carte pose ou retire ce marqueur. Échap pour sortir.` |
| Annonce, sortie | `Mode tampon terminé. Les taps refont l’appel.` |
| Aide sous la grille (`appel.js:460`-`:463`) | ajouter : ` · « Marqueurs… » : armer un marqueur, puis taper les élèves (Échap pour sortir).` |

Le libellé cité dans le refus doit rester celui réellement affiché sur le bouton au moment du refus
(`appel.js:241` vs `:276`, qui change selon le nombre de restants) : les textes ci-dessus citent « Terminer l'appel »,
racine commune aux deux libellés.

**Les deux textes du refus décidé par la vue ne nomment que des contrôles présents à l'écran.** Ce refus naît au
point 1 du §6.2, quand `enregs` n'a pas l'élève. En mode tampon, « choisissez un statut ci-dessus » serait faux (le tap
pose un marqueur, il ne fait plus l'appel) : le texte nomme l'appui long et « ⋯ », les deux soupapes du §6.3.
« Terminer l'appel » y est toujours visible, puisque le mode ne le cache jamais (§6.3, point 2) et que
`majCompteurs()` ne le masque que lorsque tous les élèves de la vue ont un appel dans `enregs`
(`appel.js:271`-`:272`) — cas où ce refus-là ne peut pas naître.

**Le refus venu de la base a son propre texte, et il ne nomme aucun contrôle de l'écran.** Il naît quand la vue croit
l'élève appelé mais que la transaction ne trouve plus son appel (appel supprimé ou restauré sur un autre écran,
scénario de MQ-02). Alors « Terminer l'appel » peut être masqué (`appel.js:271`-`:272`), et il serait de toute façon
inopérant : `aFaire` se calcule sur `enregs` et resterait vide (`appel.js:474`-`:475`) ; la feuille, elle, affiche
déjà un statut. Réaligner `enregs` et `majCompteurs()` sur la base à ce moment-là serait un chemin d'écriture de
l'écran de plus, pour un cas de concurrence rare : le texte renvoie au rechargement, qui relit tout. Prouvé par
MQ-02 (texte affirmé), mutant M48.

**Tous les textes de refus évitent tout accord** sur l'élève (« Appel non fait pour… », « Appel introuvable
pour… ») : l'application ne connaît pas le genre des élèves. Les autres lignes du tableau s'accordent sur le marqueur
et restent justes.

### 9.2 Export / import

**`exporterJSON` (`io.js:337`-`:363`) : rien à écrire.** La boucle parcourt `STORES` ; `schemaVersion: DB_VERSION`
(`:359`) vaudra **4** ; un export de schéma 4 porte 17 clés dans `stores`.

**`CHAMPS_TEXTE` (`io.js:36`-`:49`)** — deux entrées ; ni `id` (la garde de clé de `io.js:387` le contrôle déjà), ni
aucun champ que l'affichage sait dégrader (le validateur métier les contrôle « si présents », §4.3) :

```js
  marqueurs: ['libelle', 'court'],
  marquages: ['seanceId', 'eleveId', 'marqueurId'],
```

`validerExport` exige que **tout** champ de `CHAMPS_TEXTE` soit une chaîne sur **chaque** ligne, sous peine de refus de
la sauvegarde entière (`io.js:398`-`:402`) : n'y figurent donc que les champs sans lesquels une ligne ne peut ni se
rattacher ni s'afficher (§2) — les trois références d'une pose, le nom et le code d'un marqueur. La règle vaut pour
**les deux** magasins. Côté poses, `courtSecours` et `genreSecours` n'y sont **pas** : ce sont des replis
d'affichage, contrôlés « chaîne si présent » par `validerMarquage` (§4.3) ; les y mettre rendrait la règle 3 du §5.2
inatteignable (aucune sauvegarde sans eux ne passerait l'import). Côté vocabulaire, `genre` et `couleur` n'y sont
**pas** non plus, ni `archivee` : un genre absent se lit comme un genre inconnu (repère neutre), une couleur absente
comme le gris, une archive absente comme `false` (§3.2, §5.1 point 5). Dans les deux cas, les exiger ferait refuser la
sauvegarde d'une version future qui cesserait de les écrire — par exemple la `couleur` d'un comportement, toujours
forcée à `'gris'` (§4.4) — alors que `schemaVersion` resterait 4 : le refus sur un nom de champ que le §2 écarte.
Prouvé par MIG-07 (cas acceptés) et les mutants M34 et M49.

**`validerExport` (`io.js:367`-`:422`) — deux lignes, pas une de plus**, calquées sur `io.js:396` :

```js
      if (nom === 'marqueurs') validerMarqueur(enreg);
      if (nom === 'marquages') validerMarquage(enreg);
```

Rien d'autre ne change. `io.js:371` refuse déjà `schemaVersion > DB_VERSION`. Une sauvegarde de schéma 2 ou 3 reste
acceptée : les deux magasins manquants seront **vidés** par le remplacement (contrat « remplace tout ») et
**annoncés** (`absents`, `io.js:380` → `sauvegarde.js:91`, `:99`). Et **aucun contrôle relationnel** : un `marqueurId`
orphelin s'affiche, il ne bloque pas la restauration (§2, §5.2).

**`importerJSON` (`io.js:428`-`:456`)** : aucune modification de code — `lots[nom] = objet.stores[nom] || []`
(`io.js:447`) traite les deux magasins par le cas général. Seul le commentaire de `io.js:430` (« aucune migration à
l'import à ce jour (schéma 2) ») est à corriger : schémas 2 et 3 acceptés, les deux magasins neufs sont vidés.

### 9.3 Décision 17 — ce que fait une version ancienne devant une base en schéma 4

Trois chemins, tous vérifiés dans le code, **aucun n'efface quoi que ce soit** :

1. **Ouverture de la base — refus du navigateur.** Une v0.13.5 a `DB_VERSION = 3` (`io.js:8`) et appelle
   `indexedDB.open('carnet-eps', 3)` (`io.js:59`). La base locale est en 4 : la spécification IndexedDB fait échouer
   la requête avec une `VersionError`, `onupgradeneeded` **n'est jamais déclenché**, aucune transaction n'est ouverte,
   aucun `clear()` n'est émis. Le rejet remonte par `io.js:88` puis par chaque vue, et `ui.js:33`-`:36` affiche la
   carte « Affichage impossible ». **La garantie de la décision 17 est structurelle : l'ancienne version ne peut pas
   lire, donc ne peut pas réécrire, donc ne peut rien perdre.** Ce n'est pas une politesse du code, c'est le
   navigateur qui refuse.
2. **Sauvegarde de schéma 4 présentée à une version ancienne — refus avant toute écriture.** `io.js:371`-`:373` lève
   un message net, en français, et il est levé **deux fois avant la moindre écriture** : `sauvegarde.js:88` appelle
   `validerExport` **avant** les deux confirmations et avant l'export de sécurité ; `importerJSON` revalide à
   `io.js:429`, **avant** le `clear()` de `io.js:452`. Rien à ajouter : ce code est déjà en production.
3. **Sauvegarde de schéma 3 restaurée dans une v4 — acceptée**, les deux magasins vidés et annoncés (§9.2).

**Deux limites, écrites noir sur blanc parce qu'elles sont réelles.** Le message de la v0.13.5 est générique et le
texte de la `DOMException` vient du navigateur, en anglais ; et le conseil affiché (« exportez une sauvegarde ») y est
**inapplicable**, puisque la base ne s'ouvre pas. **La v0.13.5 est déjà publiée : aucune version future ne peut rendre
le passé plus bavard.** La seule sortie est de **recharger en ligne** pour recevoir la version à jour (le
service-worker sert `index.html` en réseau d'abord, BIBLE règle 5). Cette phrase doit entrer dans
`docs/deploiement.md` et dans le guide, sinon la décision 17 est tenue par le code mais illisible sur le terrain.

**Pour l'avenir, une addition minime** (`io.js:88`) : si `req.error?.name === 'VersionError'`, rejeter avec
« cet appareil a déjà ouvert le carnet avec une version plus récente de l'application — rechargez la page ». Le filet
global (`main.js:225`-`:227`) le montre alors en toast au lieu d'un écran muet. **Cela ne fait rien pour la v0.13.5
déjà installée** ; c'est pour la montée suivante.

**L'interdit qui accompagne la montée.** Une fois le schéma 4 publié : **ne jamais redéployer une version dont
`DB_VERSION` est 3**. C'est déjà écrit trois fois pour le schéma 3 — `CLAUDE.md:202`, `docs/modele-donnees.md:8`,
`docs/deploiement.md:138` — et doit l'être une quatrième pour le 4, aux trois mêmes endroits. Un correctif après la
montée se fait **toujours en avant**.

### 9.4 Ce que ce lot ne touche pas

Aucun champ ajouté à `appels` (décision 14), à `observations` (décision 9 — `seanceId` y reste `null`,
`observations.js:80`), à `evaluations` ni à `notes` (décision 11 : le score chiffré reste une colonne
« AFL / positionnement » en texte libre). `meta` n'accueille aucun vocabulaire (c'est la solution écartée par la
décision 18). Aucune impression, aucun CSV (décision 8) : aucune colonne marqueurs dans `vueRecap`
(`appel.js:510`-`:629`) ni dans son export (`appel.js:619`-`:625`), et la rangée de la carte d'élève est masquée à
l'impression de l'écran d'appel (§7, point 9). Aucun cumul sur la fiche élève. Aucun seuil,
aucune alerte (décision 5). `definirStatut`, « Terminer l'appel » et la fermeture de la feuille après un statut restent
inchangés (§2).

---

## 10. Fichiers touchés

| Fichier | Nature |
|---|---|
| `app/js/io.js` | `DB_VERSION` 3→4 (`:8`) · 2 entrées `SCHEMA` (`:14`) · import du module pur (`:5`) · 2 entrées `CHAMPS_TEXTE` (`:36`) · 2 fonctions neuves (`appliquerMarquages`, `ecrireMarqueur`) après `:257` · 2 lignes dans `validerExport` (`:396`) · cascades (`:670`, `:684`, `:701`) · aperçus (`:728`, `:738`) + `apercuSuppressionSeance` neuve · `LIBELLES` (`:751`) · message `VersionError` (`:88`) · commentaires « 14 stores » (`:267`) et « schéma 2 » (`:430`) |
| `app/js/marqueurs-calcul.js` | **nouveau** — `GENRES`, `LIBELLES_GENRE`, `COULEURS`, `cleCourt`, `validerMarqueur`, `validerMarquage`, `trierMarqueurs`, `grouperParEleve`, `codesCarte` |
| `app/js/modules/marqueurs.js` | **nouveau** — écran du vocabulaire (liste + formulaire) |
| `app/js/modules/appel.js` | carte (`:284`-`:301`, `:398`-`:410`) · feuille (`:388`) · mode tampon (`:441`-`:452`, `:467`) · reprise (`:242`-`:248`) · aide (`:460`-`:463`) · **`definirStatut` (`:303`) et « Terminer l'appel » (`:469`) inchangés** |
| `app/js/modules/sequences.js` | confirmation de suppression d'une séance (`:225`) : aperçu + `detailSuppression`, message réécrit (§8) · import de `apercuSuppressionSeance` (`:9`-`:11`) · texte de la carte « Supprimer la séquence » sans énumération (`:246`, §8) |
| `app/js/modules/eleves.js` | texte de la carte « Supprimer cet élève » sans énumération (`:576`, §8) |
| `app/css/components.css` | 7 classes nouvelles après `:731` (+ `.mq-action`, sans style) · `--h-rang-carte` et le relèvement de `.pastille-info` / `.pastille-warn` quand la carte porte une rangée (§7, point 4 ; les règles d'origine `:702`-`:711` restent intactes) · `.rang-marqueurs-carte` ajoutée à la liste masquée du `@media print` (`:991`-`:1001`) ; **rien** dans la liste `print-color-adjust` (`:1027`-`:1034`) |
| `app/js/main.js` | `TITRES` (`:23`), `PARENT` (`:26`), import (`:8`-`:18`), carte-lien dans « Plus » (`:33`-`:41`) |
| `app/service-worker.js` | `VERSION` (`:8`) à **chaque** version · `ASSETS` (`:10`-`:41`) : `./js/marqueurs-calcul.js` en **v0.14.0**, `./js/modules/marqueurs.js` en **v0.14.1** — jamais un fichier avant la version qui le crée (§4.3) |
| `app/js/state.js` | `VERSION_APP` (`:5`) · `marqueursRecents` dans les préférences |
| `tests/e2e/marqueurs-migration.spec.mjs`, `marqueurs.spec.mjs`, `marqueurs-ecran.spec.mjs` | **nouveaux** (§11), livrés en v0.14.0, v0.14.1 et v0.14.2 (§13) |
| `playwright.config.mjs` | `:24` — `marqueurs-ecran.spec.mjs` ajouté au `testMatch` du projet `mobile` |
| `tests/e2e/audit5-lot5.spec.mjs`, `regressions.spec.mjs`, `smoke.spec.mjs` | gardes écrites à la main (§12.2) ; `audit5-lot5.spec.mjs` gagne aussi la garde d'énumération du projet mobile (§12.1) |
| `docs/modele-donnees.md`, `docs/decisions.md` (D014), `docs/deploiement.md`, `docs/architecture.md`, `docs/modules.md`, `docs/fonctionnalites.md`, `docs/roadmap.md`, `docs/journal.md`, `CHANGELOG.md`, `TODO.md`, `CLAUDE.md:80`, les deux `README.md` | rituel de fin de session et gardes de documentation (`CLAUDE.md:58`-`:62`) |

---

## 11. Les preuves

Harnais de mutation : copie jetable du dépôt + serveur dédié, exactement comme `audit codex/v7-mutations.mjs`
(contrôle sain `M0` obligatoire, refus si l'ancre n'est pas **unique** dans le fichier). Nouveau fichier, **hors suivi
Git** : `audit codex/v8-mutations-marqueurs.mjs`.

**`beforeEach` des trois nouveaux fichiers** : la base est vidée en **dérivant la liste des magasins de `io.STORES`**,
jamais par une liste écrite à la main. Motif : les specs existantes portent une constante figée
(`tests/e2e/smoke.spec.mjs:9`-`:10`) qui **a déjà oublié `grilles`** ; elle oublierait `marqueurs` et `marquages` de
la même façon, et une pose laissée d'un test à l'autre polluerait le suivant sans qu'aucune garde ne parle. C'est la
leçon « une garde globale se corrige en changeant sa FORME, pas sa liste ».

⚠ Aucun titre de `marqueurs-ecran.spec.mjs` ne doit contenir « position PC » : le `grepInvert` du projet mobile
(`playwright.config.mjs:24`) le retirerait du compte dérivé du README.

**Chaque test est livré avec la version qui contient tout ce qu'il exerce** (§13) : un test qui passe par un écran
n'existe pas avant cet écran. Les tables ci-dessous disent ce que chaque test prouve ; le §13 dit quand il arrive.

### 11.1 `marqueurs-migration.spec.mjs` (chromium) — format, compatibilité, sauvegardes

Gabarits à reprendre : `audit5-lot5.spec.mjs:70`-`:100` (montée de version sur base reconstruite) et
`grilles.spec.mjs:307`-`:314` (base préexistante créée **avant** le chargement de `io.js`, par
`page.goto('/css/base.css')`).

| № | Garantie | Prémisse affirmée dans le test |
|---|---|---|
| MIG-01 | montée 3 → 4 : `marqueurs` et `marquages` naissent avec **leurs trois index**, et un `appel` du schéma 3 est relu champ pour champ à l'identique | `expect(avant.version).toBe(3)` et `expect(avant.stores).not.toContain('marquages')` **avant** d'ouvrir par l'app |
| MIG-02 | une base montée en 4 **refuse de s'ouvrir en 3** (`VersionError`) ; rouverte en 4, elle rend les mêmes marquages qu'avant la tentative | la pose existe avant la tentative, et l'erreur reçue est bien nommée `VersionError` |
| MIG-03 | un cycle présent → absent → oubli de tenue laisse les marqueurs intacts (la classe entière de V7-B01 est impossible) | le **commentaire** de l'appel, champ explicitement hérité (`appel.js:309`), est relu non vide après le cycle : il atteste que `definirStatut` a bien réécrit l'enregistrement |
| MIG-04 | aller-retour JSON sans perte, `schemaVersion: 4`, comparaison canonique | comptes > 0 avant l'aller-retour |
| MIG-05 | une sauvegarde de schéma 3 reste restaurable : les deux magasins sont vidés **et annoncés** | assertion sur le **texte** de la confirmation (`sauvegarde.js:99`), pas seulement sur l'état de la base |
| MIG-06 | une sauvegarde de schéma 5 est refusée **avant toute écriture** : la base n'est pas vidée | le même dump en `schemaVersion: 4` est accepté dans le même test (témoin) |
| MIG-07 | vocabulaire altéré : libellé vide, libellé de 41 caractères, code court vide, code court non alphanumérique, `occurrences` à 0, `id` de pose incohérent — refusés un par un, base intacte, un message distinct par cas ; **et les cas inverses**, acceptés et relus tels quels : une pose **sans** `courtSecours` ni `genreSecours` (ni `occurrences`) ; un marqueur **sans** `genre`, **sans** `couleur` ni `archivee` ; un marqueur et une pose portant chacun un champ **inconnu** (`famille: 'x'`), relu intact après import | le dump de base, sans la faute, est accepté au début du test ; le champ inconnu est bien présent dans le fichier importé (relu avant l'import) |
| MIG-08 | orphelin : `marqueurId` absent du vocabulaire → import **accepté**, rendu **gris** avec son `courtSecours` (ou repère neutre si `genreSecours` n'est ni `role` ni `groupe`) ; orphelin de rôle **sans** `courtSecours` → code gris `?` ; orphelin de **comportement** sans `courtSecours` → repère neutre, **aucun** code `?` ; **test pur de `trierMarqueurs`** : un marqueur sans genre et un marqueur de genre inconnu sortent **après** les rôles et les équipes, parmi les comportements ; zéro `pageerror`, zéro `console.error` | la carte affiche bien **quelque chose** : le nœud existe et son texte n'est pas vide |
| MIG-09 | suppression de séance, **de séquence** et d'élève : les marquages partent, l'aperçu les compte **dans le texte de la confirmation** (« 4 marqueurs posés »), « Annuler » les restaure | nombre > 0 avant, 0 après, **et de nouveau le même nombre** après l'annulation ; le texte de la confirmation est lu **avant** de confirmer. Trois tests distincts : le chemin séquence (`io.js:685`-`:689`) est celui qu'on oublie, et le chemin séance est le seul dont l'aperçu est neuf (`sequences.js:225`) |
| MIG-10 | durabilité : `appliquerMarquages` rejette quand la transaction avorte **après** le succès de la requête d'écriture (appelée directement depuis `io.js`, sans écran) | la requête `put` a bien réussi avant l'avortement (écouteur relu dans le test) |

### 11.2 `marqueurs.spec.mjs` (chromium) — écritures, concurrence, vocabulaire, usage

| № | Garantie | Prémisse affirmée |
|---|---|---|
| MQ-01 | poser n'écrase ni le statut, ni les minutes de retard, ni le commentaire écrits par ailleurs | l'écriture « du second onglet » est relue en base **avant** la pose |
| MQ-02 | l'appel est relu **dans** la transaction : appel supprimé en IndexedDB derrière la vue → la pose suivante est refusée, **avec le texte du refus venu de la base** (§9.1), qui ne nomme ni « Terminer l'appel » ni le choix d'un statut | la première pose (avant suppression) a réussi ; une garde qui lirait la Map de la vue accepterait ; « Terminer l'appel » est bien **masqué** au moment du refus (tous les élèves de la vue étaient appelés) |
| MQ-03 | une écriture refusée (`QuotaExceededError` sur `marquages`, motif `grilles.spec.mjs:855`-`:857`) est **dite**, l'écran revient au dernier état **confirmé**, rien n'est écrit ; et un tap plus récent n'est pas défait par l'échec d'un tap ancien | le code était **visible sur la carte** avant le retour arrière |
| MQ-04 | la pose a sa **propre** annonce ; aucune annonce de statut | le texte de la région live **a changé** entre avant et après |
| MQ-05 | refus « pas encore appelé » : aucune écriture, aucun statut créé, compteur « saisis » (`appel.js:257`, `:265`) inchangé | l'élève visé n'a **aucun** enregistrement d'appel au départ |
| MQ-06 | « Terminer l'appel » ouvre la pose pour toute la classe | avant le clic, la même pose est refusée : le test contient les deux moitiés |
| MQ-07 | cumul libre : poser « Éq. 2 » n'enlève jamais « Éq. 1 » | deux lignes en base **et** deux codes rendus |
| MQ-08 | une occurrence : reposer ne crée pas de seconde ligne | la clé composite attendue existe, et le magasin contient exactement une ligne |
| MQ-09 | le format sait déjà compter : `occurrences: 3` écrit directement survit à la relecture **et** à l'aller-retour JSON, sans migration ; **et à une repose** : `appliquerMarquages(seanceId, [{ eleveId, marqueurId, op: 'poser' }])` sur cette même clé laisse `occurrences === 3` et la `dateAjout` d'origine (§4.2, propriété 4) | l'aller-retour a bien eu lieu (`viderTout` entre les deux, magasin relu vide) ; la ligne `occurrences: 3` existe avant la repose, l'élève a un appel (sinon la repose serait refusée et ne prouverait rien), et la repose a **réussi** (promesse résolue, ligne relue) |
| MQ-10 | archiver : l'historique reste lisible et retirable, la liste de pose ne le propose plus | le marqueur **était** proposé avant l'archivage |
| MQ-11 | renommer suit tout l'historique : **le vocabulaire gagne sur l'instantané**, y compris sur une séance passée | l'ancien code était affiché avant le renommage |
| MQ-12 | code court unique sur sa **forme normalisée** (« éq » contre « EQ »), relu dans la transaction ; et le genre est verrouillé en modification | la collision est créée **en base, derrière la vue**, dont la liste est périmée ; et le même code est accepté après renommage du premier (témoin) |
| MQ-13 | liste de pose : derniers utilisés en tête, **aucun plafond codé** | douze marqueurs créés ; les douze restent atteignables (un plafond à 8 rendrait le test rouge) |
| MQ-14 | reprise : rôles et équipes seulement, élèves déjà appelés seulement, archivés et orphelins ignorés, jamais deux fois, rien n'est retiré ; « Annuler » ne retire **que** les couples créés **et** les cartes ne rendent plus les codes repris ; une séance **intercalaire sans marqueurs** ne fait pas disparaître le bouton, qui reprend depuis la séance d'avant | la séance source porte bien les trois genres, et l'élève « pas encore appelé » n'a aucun appel ; une pose préexistante est présente avant l'annulation et le reste après ; les codes repris étaient **visibles sur les cartes** avant « Annuler » ; la séance intercalaire existe bien et ne porte aucune pose |
| MQ-15 | marqueurs et observations coexistent : poser n'écrit ni observation ni note | **ancres** : dans le même test, une observation ajoutée par la fiche élève fait bouger le compte, et une note écrite fait bouger `notes` |
| MQ-16 | aucune sortie : le CSV du récapitulatif et le papier ne gagnent pas une colonne ; à l'impression de l'écran d'appel (`page.emulateMedia({ media: 'print' })`, motif `audit5-lot3.spec.mjs:423`), la rangée de la carte n'est pas affichée | l'en-tête CSV produit (`appel.js:621`) est comparé à la liste **dérivée de `STATUTS`**, pas à une chaîne recopiée ; le CSV contient bien les libellés de statut avant de conclure qu'il ne contient pas de marqueur ; en impression, le nom de l'élève de la même carte **reste** affiché (témoin) et un code était visible à l'écran juste avant |
| MQ-17 | un champ **inconnu** déjà en base sur un marqueur (`famille: 'x'`, écrit directement) survit à un renommage fait par le formulaire ; **et l'identifiant ne vient jamais de `modifs`** : `io.ecrireMarqueur(id, { id: 'autre', libelle: 'X' })`, appelé directement, modifie la ligne `id` et ne crée aucune ligne `'autre'` (§4.4) | le renommage a bien eu lieu (nouveau libellé relu en base) et le champ était présent avant ; la ligne `id` porte bien le libellé `'X'` après l'appel direct (l'écriture a eu lieu), et le magasin compte le même nombre de lignes qu'avant |
| MQ-18 | **amorçage** (§14, réponse 5 — ajouté en v0.14.1) : sur un vocabulaire vide, « Créer les 6 marqueurs proposés » écrit Arbitre/ARB, Observateur/OBS, Coach/COA (`role`), Équipe 1/E1, Équipe 2/E2 (`groupe`), À recadrer/REC (`comportement`, gris) par `ecrireMarqueur`, couleurs distinctes pour les rôles et les équipes ; le bouton disparaît dès qu'un marqueur existe, **même archivé** ; un échec partiel est **dit** (à l'écran et en toast, marqueur et motif), jamais avalé, et rien n'est doublé ; **sur une vue périmée** (liste rendue sur un vocabulaire vide, marqueur écrit ensuite derrière elle), le geste relit la base : toast « Des marqueurs existent déjà : rien n’a été créé. », aucun marqueur ajouté, focus sur « Nouveau marqueur » (§16, revue de la v0.14.1, R3 et R4) | le vocabulaire est vide avant le clic ; le témoin « un seul marqueur, archivé » affiche bien la liste ; pour la vue périmée, le marqueur est **en base** et le bouton **encore visible** avant le geste, qui part du bouton focalisé ; pour l'échec partiel, une ligne `ARB` est écrite juste avant la première transaction d'écriture (`window.__injecte` relu) |
| MQ-19 | **doublons lisibles** (§16, « Revue de la v0.14.0 », point 2 — ajouté en v0.14.1) : deux marqueurs actifs de même `cleCourt` entrés par une sauvegarde bricolée sont **nommés** dans la liste (alerte « Codes en double » et mention sur **chaque** carte du groupe) et à l'ouverture de leur formulaire ; archiver l'un depuis l'alerte, **au clavier**, libère le code, laisse le focus dans la vue (sur le bouton de la carte traitée) et l'autre se modifie de nouveau ; **archivés en dernier** dans un genre ; « Restaurer » un marqueur dont le code est repris est **refusé et dit** en toast (il reste archivé), puis réussit une fois le code libéré (§16, revue de la v0.14.1, R3, R5, R7, R8) | le blocage existe avant l'écran : `ecrireMarqueur` refuse de modifier l'un comme l'autre (motifs relus) ; un troisième marqueur sans doublon ne porte aucune mention (témoin) ; le bouton de l'alerte a le focus, atteint par Tab, avant Entrée ; la modification finale est relue en base ; le code est libre (archivage relu en base) avant la restauration témoin |
| MQ-20 | **code court et aperçu « sur la carte »** (§16, revue de la v0.14.1, R1, R2, R6 — ajouté en v0.14.1) : une composition de clavier (type Gboard, `Input.imeSetComposition` puis `Input.insertText` par CDP) en minuscules n'est jamais réécrite pendant la frappe, le champ s'affiche en majuscules (`text-transform`) et « ARB » est enregistré, jamais « AARARB » ; l'aperçu d'un rôle montre son code, en majuscules, qui suit la frappe et l'effacement ; celui d'un comportement montre le repère `.mq-neutre` **sans texte** (taille réelle, encre pleine), jamais le code, couleur masquée et phrase « le sens reste dans la feuille de l’élève », dans le formulaire **et** sur la carte de la liste ; un genre absent ou inconnu fait de même (MQ-17) | le champ a le focus avant la composition ; genre « rôle » et couleur visibles au départ ; témoin dans le même test : revenu au rôle, le code et la couleur reviennent, et la carte d'un rôle de la liste montre son code |

### 11.3 `marqueurs-ecran.spec.mjs` (chromium **et** mobile Pixel 7) — le geste au gymnase

Règles reprises des leçons du dépôt : toute mesure de défilement attend `deuxImages` (`grilles.spec.mjs:386`) ; les
gestes tactiles passent par `test.use({ hasTouch: true })` + `.tap()` (`grilles.spec.mjs:831`) ; on mesure une
**règle** (appartenance d'un rectangle à un autre, égalité de deux styles calculés, nombre de nœuds), **jamais** une
largeur qui dépend de la police (Segoe en local, DejaVu en CI).

| № | Garantie | Prémisse affirmée |
|---|---|---|
| ECR-01 | feuille « ⋯ » : poser puis retirer sans toucher au statut ni fermer la feuille ; deux taps sur le même bouton, le second **pendant** l'écriture du premier, donnent pose puis retrait (règle contractuelle n° 2) | la feuille est bien ouverte (`dialog[open]`), le statut est lu avant et après ; l'écriture du premier tap est bien **en cours** au moment du second (retardée dans le test, et l'attente relue) |
| ECR-02 | mode tampon (tactile) : armer puis taper six élèves les marque tous, **sans changer un seul statut** | les six statuts sont capturés avant et comparés un par un ; le mode est bien armé (attribut relu) |
| ECR-03 | mode tampon : un second tap retire, et ne fait rien d'autre | le marqueur était posé (ligne en base) avant le second tap |
| ECR-04 | mode armé : `P A R D I T F` ne changent plus le statut — **et le même raccourci fonctionne dès le mode désarmé** | le focus est bien sur `.eleve-cycle` (`document.activeElement`), et le témoin désarmé change réellement le statut |
| ECR-05 | Échap désarme (et **seulement** quand aucune feuille n'est ouverte) ; le changement de route désarme ; à la sortie, la mention d'action (`.mq-action`), `aria-pressed` et `data-tampon-refus` sont retirés de **toutes** les cartes | le mode était armé avant Échap ; le retrait est vérifié sur une carte non focalisée |
| ECR-06 | mode armé : fond de grille distinct, libellé permanent dans la barre, et nom accessible de chaque carte qui dit « poser » / « retirer » et suit l'état **tout en contenant encore** le statut de l'élève et le texte de son alerte | la valeur désarmée du `background-color` est capturée **dans le même test** (comparaison, pas seuil absolu) ; le témoin désarmé de la même carte contient le statut et l'alerte, et pas « poser » |
| ECR-07 | deux codes puis « +2 » calculé sur les **données** ; le nom accessible les nomme tous les quatre ; l'ordre de la carte ne dépend pas de l'usage récent | quatre lignes existent bien en base avant de compter deux codes à l'écran |
| ECR-08 | un comportement : **aucun code**, un repère neutre identique pour tous, dont la boîte n'est pas nulle et dont le fond est l'**encre pleine** (`background-color` du repère = `color` de `document.body`), dans les deux thèmes ; un rôle **montre** bien son code ; le texte du code est en **encre pleine** dans les deux thèmes | le cas « rôle » est présent : sans lui, « aucun code » serait vrai d'une carte vide ; la couleur de l'encre atténuée (`--c-texte-2`) est lue dans le même test et **diffère** de celle du repère |
| ECR-09 | à 320 px, à 100 % **et** à 200 % de texte, la rangée ne recouvre ni 🩺 ni ⚠ (rectangles disjoints) et ne déborde pas de la carte. L'assertion « `code1`, `+n` et le premier repère restent entiers » est **suspendue** jusqu'à la décision de mise en page du §6.1 (« Limite mesurée ») : telle qu'écrite, elle est rouge par construction | l'élève testé porte réellement une inaptitude **et** dépasse le seuil d'alerte (les deux nœuds sont visibles avant la mesure) ; la carte porte bien une rangée **non vide** (sinon le non-recouvrement serait vrai d'une rangée sans contenu) |
| ECR-10 | la carte ne change **pas** de hauteur au premier marqueur, à 100 % **puis** à 200 % de texte (`document.documentElement.style.fontSize = '200%'`, motif `audit-independant.spec.mjs:125`) | hauteur mesurée avant et après, sur la même carte, aux deux tailles ; la carte a **réellement** grandi entre 100 % et 200 % (sinon l'agrandissement n'a pas eu lieu) |
| ECR-11 | appui long : ouvre toujours le menu et ne pose aucun marqueur, mode armé comme désarmé | le menu s'ouvre (dialogue visible) et `marquages` reste vide |
| ECR-12 | la pose ne fait pas défiler l'écran sous le doigt, même quand la barre grandit (écart de `scrollY` ≤ 2 px après `deuxImages`) | la barre a **réellement** grandi, et la carte touchée était recouverte |
| ECR-13 | lecture seule : cinq « À recadrer » n'ajoutent aucune alerte | **témoin** : un autre élève à 3 oublis de tenue affiche bien son ⚠ (`appel.js:408`, `SEUIL_ALERTE`, `metier.js:24`) dans le même test |
| ECR-14 | l'ordre de la feuille « ⋯ » est **gelé pour toute la vue** : après des poses, une réouverture de la feuille dans la même vue montre chaque bouton à la même position ; `localStorage` indisponible ne la casse pas | l'ordre a bien changé après **sortie puis retour** dans la vue (sinon « gelé » serait vrai d'un ordre qui ne bouge jamais), et les poses ont bien été écrites dans `marqueursRecents` avant la réouverture |
| ECR-15 | vocabulaire vide et séance sans pose : **aucune** `.rang-marqueurs-carte` dans le document, **et l'écran d'appel fonctionne** | **dans le cas vide lui-même**, avant de conclure à l'absence : les N cartes `.btn-eleve` de la classe sont rendues (N lu en base), aucune carte « Affichage impossible », un tap sur une carte écrit bien son statut en base, et zéro `pageerror` **et** zéro `console.error` pendant tout le test — l'exception d'une vue est rattrapée par `ui.js:27`-`:36` et ne produit **que** un `console.error` (`:31`), un `pageerror` seul ne la verrait pas. Puis le témoin : après création d'un marqueur et rechargement de la vue, chaque carte en porte une |
| ECR-16 | état visible sans lecteur d'écran : dans la feuille, un `.btn-marqueur` posé et un non posé ont des styles calculés **différents** sur un repère non chromatique (`outline-style`) ; un bouton `aria-disabled` a une bordure `dashed` | le bouton témoin non posé est dans la **même** feuille, et les deux portent bien `aria-pressed` `true` / `false` |
| ECR-17 | mode armé + tap sur un élève non appelé : toast de refus, **zéro écriture**, et chaque contrôle nommé par le texte du toast est présent et visible dans le document ; « Terminer l'appel » s'y trouve et, pressé **sans sortir du mode**, débloque la pose | le mode est bien armé (attribut relu), l'élève n'a aucun appel au départ, et le même tap est refusé avant « Terminer l'appel » (les deux moitiés dans le test) |
| ECR-18 | mode armé : changer le statut d'un élève non appelé par l'appui long retire `data-tampon-refus` de sa carte, et le libellé de « Terminer l'appel » compte **un restant de moins** (seul `majCompteurs` le pilote) ; aucun bouton du mode ne porte un libellé commençant par « Terminer » | la carte était bien atténuée avant, le libellé est lu avant et après, et le statut a bien été écrit en base |
| ECR-19 | deux armements successifs dans la même vue : chaque bouton de la feuille d'armement est à la même position, alors que des poses ont eu lieu entre les deux | les poses du premier armement sont en base avant le second |

### 11.4 Campagne de mutants — une garantie, un mutant

| Mutant | Modification | Tué par |
|---|---|---|
| M01 | `DB_VERSION` revient à 3 | MIG-01, MIG-02 |
| M02 | l'entrée `marquages` de `SCHEMA` perd son index `seanceId` | MIG-01 |
| M03 | la pose écrit un champ sur `appels` au lieu du magasin dédié (« conception rejetée ») | MIG-03 |
| M04 | `appliquerMarquages` n'ouvre plus sa transaction en relecture : elle réécrit l'objet lu par la vue | MQ-01, MQ-02 |
| M05 | `validerExport` cesse d'appeler `validerMarqueur` | MIG-07 |
| M06 | le contrôle d'unicité du code court sort du `onsuccess` (liste lue avant la transaction) | MQ-12 |
| M07 | `marquages` retiré de `collecterSeance` | MIG-09 |
| M08 | `marquages` retiré de `supprimerSequenceEnCascade` (**le chemin oublié**) | MIG-09 |
| M09 | `marquages` retiré de `supprimerEleveEnCascade` | MIG-09 |
| M10 | `LIBELLES` perd ses deux entrées | C38 (`audit5-lot5.spec.mjs:189`) + MIG-05 |
| M11 | l'affichage résout l'instantané **avant** le vocabulaire | MQ-11 |
| M12 | l'orphelin lève une exception au lieu d'afficher le code gris | MIG-08 |
| M13 | la garde « élève déjà appelé » est retirée | MQ-05 |
| M14 | la pose passe par `definirStatut` (donc annonce un statut) | MQ-04 |
| M15 | le retour arrière après échec revient à l'état d'ÉCRAN précédent au lieu de `marquagesConfirmes` | MQ-03 |
| M16 | `marquages.put({ id, …, occurrences: 1 })` sans `...actuel` | MQ-09 (la repose : c'est le seul chemin qui repasse par ce `put` sur une ligne existante) |
| M17 | l'opération transmise à `io.js` devient « basculer » (bascule calculée sur la base) | ECR-01 (dès v0.14.2), ECR-03 |
| M18 | le `keydown` n'est plus suspendu en mode tampon | ECR-04 |
| M19 | Échap ne désarme plus ; variante : mention d'action retirée seulement sur la carte focalisée | ECR-05 |
| M20 | l'attribut de mode ne change plus le fond de la grille ; variante : mention d'action figée à l'armement | ECR-06 |
| M21 | `plus` calculé sur le nombre de codes **visibles** ; variante : `flex: 0 1 auto` déplacé de `code2` vers `code1` | ECR-07 ; la variante, par ECR-09 **une fois** la limite du §6.1 tranchée (d'ici là, non revendiquée) |
| M22 | un comportement affiche son code comme un rôle ; variante : `color: var(--niveau-couleur)` sur `.mq-code` | ECR-08 |
| M23 | la règle qui relève 🩺 et ⚠ au-dessus de la rangée est retirée (`bottom: 6px` d'origine) ; variante : le relèvement n'utilise plus `--h-rang-carte` mais une valeur en pixels | ECR-09 (à 200 % pour la variante) |
| M24 | `.rang-marqueurs-carte` rendue seulement sur les cartes qui portent un marqueur (`min-height: 0`) | ECR-10 |
| M25 | la reprise recopie aussi les comportements — **mutation de l'APPELANT**, pas de la fonction d'écriture | MQ-14 |
| M26 | la reprise recopie pour les élèves non appelés ; variante : elle ne filtre plus les archivés | MQ-14 |
| M27 | « Annuler » retire toutes les occurrences des clés concernées au lieu de `creees` | MQ-14 |
| M28 | la clé composite perd `marqueurId` (une pose écrase la précédente) | MQ-07, MQ-08 |
| M29 | la liste de pose est tronquée à 8 ; variante : l'ordre redevient celui du magasin | MQ-13 |
| M30 | la pose crée aussi une observation ; variante : une colonne « Marqueurs » est ajoutée au CSV | MQ-15, MQ-16 |
| M31 | `const candidat = { …, id, ...modifs }` (l'identifiant vient de `modifs`) | MQ-17 (appel direct avec `id: 'autre'` — le formulaire ne transmet jamais d'`id`, un test d'écran ne peut pas le tuer, §4.4) |
| M32 | `appliquerMarquages` résout sur `req.onsuccess` au lieu de `tx.oncomplete` | MIG-10 |
| M33 | la confirmation de suppression d'une séance n'affiche plus l'aperçu (`detail` retiré, message d'origine rétabli) | MIG-09 (séance) |
| M34 | `courtSecours` et `genreSecours` remis dans `CHAMPS_TEXTE.marquages` | MIG-07 (cas accepté) |
| M35 | `ecrireMarqueur` construit le candidat par liste blanche stricte (champs inconnus perdus) | MQ-17 |
| M36 | l'annulation de la reprise n'appelle pas `appliquerRetour` (base juste, cartes non repeintes) | MQ-14 |
| M37 | la reprise ne regarde que la séance d'indice `numero − 2` | MQ-14 (séance intercalaire) |
| M38 | la règle `.btn-marqueur[aria-pressed="true"]` est retirée ; variante : la règle `[aria-disabled="true"]` | ECR-16 |
| M39 | la réserve de la rangée repasse en pixels (`min-height: 18px`) | ECR-10 (à 200 %) |
| M40 | le mode armé masque `btnTerminer` (conception du brouillon) | ECR-17 |
| M41 | `data-tampon-refus` posé une fois à l'armement, plus recalculé par `majBouton` | ECR-18 |
| M42 | l'ordre de la feuille est recalculé à chaque ouverture ; variante : à chaque armement | ECR-14 ; ECR-19 |
| M43 | la rangée est rendue même quand le vocabulaire est vide et la séance sans pose | ECR-15 |
| M44 | `.mq-neutre` revient à l'encre atténuée (`--c-texte-2`) | ECR-08 |
| M45 | `.rang-marqueurs-carte` retirée de la liste masquée à l'impression | MQ-16 |
| M46 | la mention d'action redevient un `aria-label` qui **remplace** le nom de la carte | ECR-06 |
| M47 | `majBouton` reconstruit la rangée **sans** la garde `rangeeActive` (`querySelector('.rang-marqueurs-carte').replaceChildren(…)`) | ECR-15 (cartes rendues, zéro `console.error`) |
| M48 | le refus `AppelManquant` venu de la base affiche le texte du refus décidé par la vue | MQ-02 |
| M49 | `genre` et `couleur` remis dans `CHAMPS_TEXTE.marqueurs` ; variante : `validerMarqueur` exige `archivee` | MIG-07 (cas acceptés) |
| M50 | `validerMarqueur` ou `validerMarquage` refuse un champ inconnu | MIG-07 (cas accepté, champ inconnu) |
| M51 | défaut `genre: 'role'` rétabli dans le candidat de `ecrireMarqueur` | MQ-17 (marqueur importé sans genre : archivage refusé, ligne inchangée) |

**Règle de lecture** (`CLAUDE.md:166`-`:168`) : un mutant qui **survit** dit d'abord quelque chose du test ; un mutant
tué par un test qui n'est pas le sien est un signal, pas une victoire. Chaque exécution consigne `MUTATIONS.json` avec
le code de sortie et la commande.

**Deux règles de méthode, qui ont déjà coûté cher :** MQ-02, MQ-12 et ECR-04 sont écrits et **vus rouges** sur le code
actuel (ou sur leur mutant) avant que la garde ne soit posée — *un test écrit après la garde épouse la garde* ; et
toute garantie négative (MQ-15, MQ-16, ECR-13, ECR-15) porte son témoin **dans le même test** — *une absence sans ancre
visible passe à vide*.

---

## 12. Gardes de documentation

### 12.1 Dérivées — elles rougiront d'elles-mêmes (c'est le filet)

| Garde | Où | Ce qu'il faudra faire |
|---|---|---|
| Comptes de tests par fichier | `audit5-lot5.spec.mjs:643`-`:648` | `tests/e2e/README.md` doit porter, pour chaque nouveau fichier, son nom suivi de son compte |
| Total de la suite | `audit5-lot5.spec.mjs:649` | `tests/e2e/README.md:187` : `Total de la suite : **294 tests**` → 294 + le nombre réellement écrit |
| Compte du projet mobile | `audit5-lot5.spec.mjs:653`-`:660` | même ligne : `+ 87 rejoués sur le projet **mobile**` → 87 + les tests de `marqueurs-ecran.spec.mjs` (dès v0.14.2) |
| Énumération du projet mobile — **garde à ajouter** | `audit5-lot5.spec.mjs`, juste après `:660` | aujourd'hui, la garde vérifie le **nombre** de tests rejoués sur le projet mobile, jamais l'énumération des fichiers entre parenthèses (`tests/e2e/README.md:187`) : un fichier absent de cette liste ne rougit rien. Ajouter une boucle sur les fichiers déjà retenus par `cible` (`:655`, `:657`) qui exige que chacun soit **cité nommément** dans la ligne du README qui contient « rejoués sur le projet **mobile** ». La garde devient dérivée, et `marqueurs-ecran.spec.mjs` devra y figurer (§12.2). Choisi plutôt que de ranger l'exigence parmi les gardes manuelles : les variables de la garde existent déjà, et une garde qui se dérive ne s'oublie pas |
| Total du `README.md` racine | `audit5-lot5.spec.mjs:661` | `README.md:82` : `**8 smoke-tests + 286 tests de non-régression**` → total − 8 |
| Libellés ↔ magasins (C38) | `audit5-lot5.spec.mjs:189`-`:197` | les deux entrées de `LIBELLES` (§8), sinon `Object.keys(LIBELLES) === STORES \ meta` est rouge |
| Précache du service-worker | `audit5-lot4.spec.mjs:34`-`:59` | `app/service-worker.js:10`-`:41` : chaque fichier neuf **dans la version qui le crée, pas avant** (§4.3, §13). Aucune modification de ce test : `modules/marqueurs.js` est importé statiquement par `main.js` (`:8`-`:18`, §6.5) et `marqueurs-calcul.js` par `io.js` (`:5`) ; les deux sont donc demandés dès le premier `page.goto` (`:39`), après la pose de l'écouteur (`:38`), et entrent dans `demandes` sans navigation. Une navigation `#/marqueurs` ne deviendrait nécessaire que si le module passait un jour en import dynamique |
| Version unique | `audit-v4.spec.mjs:182`-`:193` | même numéro dans `app/js/state.js:5`, `app/service-worker.js:8`, le premier titre du `CHANGELOG.md` et la première ligne du tableau de `docs/deploiement.md` |
| Préférences ↔ architecture | `audit5-lot5.spec.mjs:635`-`:637` | **à élargir** : la garde ne lit aujourd'hui que les modules `eleves`, `notes`, `reglages`. `marqueursRecents` étant écrit par `appel.js`, ajouter `'appel'` à ce tableau et nommer la préférence dans `docs/architecture.md`. Sans cet élargissement, la préférence échappe à toute garde |

Les gardes des comptes (fichiers, total de la suite, projet mobile, README racine) sont **re-réglées à chaque
publication** : chacune des cinq versions du §13 ajoute des tests, et chacune doit être publiable avec une
intégration continue verte. Les valeurs ci-dessous se lisent donc **par version**, jamais comme une valeur unique de
fin de lot.

### 12.2 Écrites à la main — à modifier dans le même commit que le code qu'elles décrivent

| Fichier : ligne | Modification | Version |
|---|---|---|
| `tests/e2e/audit5-lot5.spec.mjs:642` | `expect(specs.length).toBe(18)` → `19` (`marqueurs-migration.spec.mjs`), puis `20` (`marqueurs.spec.mjs`), puis `21` (`marqueurs-ecran.spec.mjs`) | v0.14.0 → 19 · v0.14.1 → 20 · v0.14.2 → 21 |
| `tests/e2e/audit5-lot5.spec.mjs:185` | garde C37 : `toBe(5)` → `toBe(6)` et commentaire « 6 lectures par index » — la cascade élève lit `marquages` par l'index `eleveId` (§8). Gardée à la main **délibérément** : elle plafonne un budget de lectures, et un compte dérivé du code suivrait le code qu'elle doit surveiller | v0.14.0 |
| `tests/e2e/audit5-lot5.spec.mjs:565` | `[].concat(stores).length === 15` → `=== 17`, et le commentaire « compterTout (14 stores) » → 16 magasins de données + `meta` | v0.14.0 |
| `app/js/io.js:267` et `app/js/modules/sauvegarde.js:147` | commentaires « 14 stores » → 16 | v0.14.0 |
| `tests/e2e/regressions.spec.mjs:495` et `:500` | titre « …sur les 13 routes… » → « …14 routes… » et `'marqueurs'` ajouté à la liste parcourue (elle omet déjà `grilles` : elle n'est **pas** dérivée) | v0.14.1 |
| `tests/e2e/smoke.spec.mjs:29`-`:30` | `'marqueurs'` ajouté à la liste des routes du test 1 | v0.14.1 |
| `tests/e2e/audit5-lot5.spec.mjs:501` | la table `TITRES` du test C42 gagne `marqueurs: 'Marqueurs de séance'` — elle boucle sur ses **propres** entrées, donc une route absente n'est pas couverte | v0.14.1 |
| `playwright.config.mjs:24` et `tests/e2e/README.md:187` | `marqueurs-ecran.spec.mjs` ajouté au `testMatch` du projet `mobile` **et** cité dans l'énumération du README (sinon la garde d'énumération du §12.1 rougit) | v0.14.2 |
| `tests/e2e/audit5-lot5.spec.mjs:635` | `'appel'` ajouté au tableau des modules lus (garde « Préférences ↔ architecture », §12.1) et `marqueursRecents` nommé dans `docs/architecture.md` | v0.14.2 |
| `CLAUDE.md:80` | « `AVIS_MARQUEURS_SEANCE.md` (§11, 17 questions) » → **18 questions, décidées le 2026-09-22** ; et ajouter ce contrat à la liste  v0.14.0 |
| `docs/modele-donnees.md` | `DB_VERSION` **4** en tête (`:8`) · les deux magasins dans la liste des stores · les trois index dans le tableau · une section « Marqueurs de séance — schéma 4 » (clé composite, `occurrences`, instantanés `…Secours`, règle « le vocabulaire d'abord ») · cascades · paragraphe import (`:103`) : absence = aucun marqueur, référence orpheline tolérée  v0.14.0 |
| `docs/decisions.md` | **D014** — les 18 décisions du 2026-09-22, avec le motif « fenêtre zéro donnée »  v0.14.0 |
| `docs/deploiement.md` | procédure de retour arrière **4 → 3** (aujourd'hui seul 3 → 2 est documenté, `:138`) + la phrase du §9.3 sur ce que voit un appareil resté en v0.13.5  v0.14.0 |

---

## 13. Découpage en versions livrables

Chaque version est **publiable seule**, avec intégration continue verte, et n'est publiée que sur « go » explicite
(`CLAUDE.md:200`). L'ordre n'est pas négociable sur le premier point : **le format se publie en premier, parce que la
fenêtre « zéro donnée » se referme à la première classe saisie, pas à la fin du chantier.**

**Règle de répartition des preuves** : un test n'est livré qu'avec la version qui contient tout ce qu'il exerce, et un
mutant n'est revendiqué que par la version qui livre le test qui le tue. Sinon le critère 20 (« chaque mutant tué
par son test ») serait intenable dès la v0.14.0, dont les écrans n'existent pas encore. **Chaque version** incrémente
`VERSION` (`app/service-worker.js:8`) et `VERSION_APP` (`app/js/state.js:5`) et re-règle les gardes de comptes
(§12.1, §12.2).

| Version | Contenu | Tests livrés | Mutants revendiqués | Ce qu'elle referme |
|---|---|---|---|---|
| **v0.14.0 — le format** | `DB_VERSION` 4, les deux magasins, `marqueurs-calcul.js` (constantes, validateurs, `cleCourt`), `appliquerMarquages`, `ecrireMarqueur`, `CHAMPS_TEXTE`, `validerExport`, `LIBELLES`, cascades et aperçus (dont `apercuSuppressionSeance` et la confirmation existante de `sequences.js:225`), message `VersionError`, textes de suppression sans énumération (`sequences.js:246`, `eleves.js:576`, §8), service-worker (**`ASSETS` += `./js/marqueurs-calcul.js` seulement**), `docs/modele-donnees.md`, D014, `docs/deploiement.md`. **Aucun écran nouveau** | `marqueurs-migration.spec.mjs` : MIG-01 à MIG-07, MIG-09, MIG-10 | M01, M02, M03, M05, M07, M08, M09, M10, M32, M33, M34, M49, M50 | la décision 18 et la décision 17. Après elle, la fenêtre peut se refermer sans rien coûter |
| **v0.14.1 — le vocabulaire** | route `#/marqueurs`, liste, formulaire, archivage, aperçu vivant ; **amorçage des 6 marqueurs proposés** (§14, réponse 5) ; **doublons lisibles** (§16, revue de la v0.14.0, point 2) ; `main.js`, gardes de routes ; service-worker (**`ASSETS` += `./js/modules/marqueurs.js`**, créé dans cette version) | `marqueurs.spec.mjs` (créé) : MQ-12, MQ-17, **MQ-18, MQ-19, MQ-20** | M06, M31, M35, M51 ; **M63 à M70** (amorçage, doublons lisibles, genre verrouillé, repli « Comportements », précache) ; **M71 à M77** (revue de la v0.14.1, §16) — définis dans la campagne de la version, hors suivi Git | décisions 7, 10, 13 côté saisie |
| **v0.14.2 — poser et relire** | rangée dans la feuille « ⋯ », refus « pas encore appelé », file d'attente et échecs durables, rangée sur la carte, `codesCarte`, CSS, impression | MQ-01 à MQ-11, MQ-13, MQ-15, MQ-16 ; MIG-08 (ajouté à `marqueurs-migration.spec.mjs`) ; `marqueurs-ecran.spec.mjs` (créé) : ECR-01, ECR-07 à ECR-10, ECR-12 à ECR-16 | M04, M11 à M17, M21 (sans sa variante, §6.1), M22 à M24, M28 à M30, M38, M39, M42 (feuille), M43, M44, M45, M47, M48 | décisions 1, 2, 4, 7, 8, 9, 10, 14, 15, 16 côté usage |
| **v0.14.3 — le mode tampon** | armement, trois signaux, raccourcis suspendus, quatre sorties | ECR-02 à ECR-06, ECR-11, ECR-17 à ECR-19 | M18, M19, M20, M40, M41, M42 (armement), M46 | décision 3 |
| **v0.14.4 — la reprise** | bouton « Reprendre les marqueurs de la séance précédente », confirmation chiffrée, annulation exacte | MQ-14 | M25, M26, M27, M36, M37 | décision 6 |

**Le lot 1 est l'ensemble v0.14.0 → v0.14.4.** Il ne comporte **aucune** sortie (décision 8), aucun cumul, aucun
seuil. Un essai de terrain est attendu **entre v0.14.2 et v0.14.3** : c'est le seul moment où le tampon peut encore
être reporté sans rien défaire.

Aucune durée n'est chiffrée ici. Les nombres de tests et de mutants ci-dessus sont des **conditions de réception**,
pas une estimation de charge, et le chiffrage ne doit pas en être déduit.

---

## 14. Points ouverts — à trancher par l'enseignant

> ✅ **TRANCHÉS LE 2026-09-23 : « je te suis ».** Le contrat est **validé**, et les onze points prennent la réponse
> recommandée :
>
> 1. **oui**, le format se publie seul en v0.14.0 ;
> 2. **compteur** `occurrences`, sans horodatage par occurrence ;
> 3. **oui**, « Terminer l'appel » est durci, dans la **v0.14.2** (le lot où il devient le passage obligé vers les
>    marqueurs) ;
> 4. **non**, la feuille « ⋯ » se ferme comme aujourd'hui ;
> 5. **oui** à l'amorçage « créer les 6 marqueurs proposés » (ARB, OBS, COA, E1, E2, REC), dans la **v0.14.1**,
>    sur un vocabulaire vide seulement ;
> 6. à 10. **d'accord** : genre fixé à la création ; ordre « derniers utilisés » propre à l'appareil ; archivage sans
>    suppression ; ce contrat et D014 suffisent ; la reprise part de la dernière séance qui porte des rôles ou des
>    équipes ;
> 11. **(d) complété par (a)** : le repère de comportement passe en premier sur la carte, et le deuxième code
>    disparaît entièrement sous contrainte. L'assertion définitive d'ECR-09 en découle (v0.14.2).

1. **Le format se publie-t-il seul (v0.14.0), avant le moindre écran ?** C'est ce que recommande ce contrat : la
   fenêtre « zéro donnée » se referme à la première classe saisie, pas à la fin du chantier. L'alternative est de tout
   livrer d'un bloc, en s'interdisant de saisir une vraie classe jusque-là.
2. **Une occurrence par élève et par séance : compteur, ou une ligne par occurrence ?** Les deux formats laissent
   « une occurrence » être une **règle d'usage**, pas une contrainte du format : aucun des deux ne l'impose. La vraie
   différence est ailleurs. **Compteur** (retenu, §2) : une ligne par élève, séance et marqueur, un nombre
   `occurrences`, et **aucun horodatage par occurrence** — le jour où tu voudras compter trois « À recadrer » dans une
   séance, tu sauras qu'il y en a eu trois, pas à quel moment. **Une ligne par occurrence** (clés `_1`, `_2`…) : chaque
   événement garde son heure, au prix d'écritures plus délicates (quelle occurrence retire un tap ?). À confirmer
   maintenant : passer plus tard de l'un à l'autre changerait les clés, donc migrerait des données, alors
   qu'aujourd'hui, fenêtre « zéro donnée » ouverte, le choix ne coûte rien.
3. **« Terminer l'appel » doit-il être durci dans ce lot ?** Aujourd'hui, il écrit en aveugle : un statut posé entre-
   temps sur un autre appareil est remplacé par « présent » (`appel.js:482`). Le défaut est **préexistant**, mais la
   décision 14 fait de ce bouton le passage obligé vers les marqueurs. Le corriger coûte une fonction et deux tests ;
   ne pas le corriger laisse un défaut connu sur le chemin le plus emprunté du lot.
4. **La feuille « ⋯ » doit-elle rester ouverte après un choix de statut** quand la rangée de marqueurs était
   verrouillée (pour enchaîner statut → marqueur sans rouvrir la feuille) ? Ce contrat dit **non** (le geste existant
   reste inchangé), au prix de deux taps supplémentaires dans ce cas précis.
5. **Veux-tu un amorçage du vocabulaire** (un bouton « créer les 6 marqueurs proposés » : Arbitre/ARB,
   Observateur/OBS, Coach/COA, Équipe 1/E1, Équipe 2/E2, À recadrer/REC) sur un catalogue vide ? Ce contrat ne le
   prévoit pas. Si oui : ces libellés et ces codes te conviennent-ils ?
6. **Le genre est verrouillé après création** (§6.5) : une faute de genre obligera à archiver et recréer. C'est la
   conséquence directe de ta décision 13, mais elle n'avait jamais été formulée comme telle.
7. **L'ordre « derniers utilisés en tête » est une préférence d'appareil** : il ne suit pas d'un téléphone à l'autre
   et repart de zéro après un import ou un effacement des données du site. L'alternative (le stocker dans la base) le
   ferait voyager, mais écraserait celui de l'autre appareil à chaque import — et ferait écrire le catalogue à chaque
   tap.
8. **Aucune suppression de marqueur** dans le lot 1, archivage seulement (décision 16). Conséquence : un marqueur créé
   par erreur et jamais utilisé reste dans la liste, archivé, sans pouvoir disparaître.
9. **`AVIS_MARQUEURS_SEANCE.md` est désormais validé** et protégé par la BIBLE règle 3. Tes 18 réponses y sont déjà
   consignées (encadré de fin) : faut-il y ajouter autre chose, ou ce contrat et `docs/decisions.md` (D014) suffisent-
   ils ?
10. **« La séance précédente », pour la reprise, s'entend-elle de la dernière séance qui porte des rôles ou des
    équipes ?** C'est ce que retient ce contrat (§6.4) : une séance sans marqueurs (cours annulé, évaluation, semaine
    pressée) ne casse pas la chaîne, et le bouton nomme toujours la séance d'où il reprend. La lecture stricte (la
    séance immédiatement précédente, et elle seule) ferait disparaître le bouton après chaque séance sans marqueurs.
11. **Petit écran et texte agrandi : que doit-on sacrifier sur la carte d'élève ?** Mesuré à 320 px (§6.1, « Limite
    mesurée ») : à 200 % de texte, **un rôle et un seul comportement suffisent déjà à rogner le repère de comportement**,
    qui est pourtant le seul signe que ton tap a été pris (décision 10). Il faut choisir ce qui cède :
    - **(a) le deuxième code disparaît entièrement** sous contrainte (« ARB +1 » au lieu de « ARB E2 ») — le plus
      simple, ne règle pas le cas « un rôle + un comportement » à 200 % ;
    - **(b) la rangée passe sur deux lignes** quand elle déborde — tout reste visible, la carte grandit d'une ligne ;
    - **(c) la grille passe à une colonne** quand le texte est agrandi — tout reste visible, deux fois plus de
      défilement ;
    - **(d) le repère de comportement passe en premier**, avant les codes — le retour de geste est toujours visible,
      le code du rôle peut être rogné.
    Recommandation : **(d), complétée par (a)**. Le repère est la seule chose qui réponde à un geste ; un code de rôle
    rogné se relit dans la feuille. Cette décision fixe l'assertion définitive du test ECR-09, et doit être prise avant
    la v0.14.2 (elle ne touche ni au format ni à la v0.14.0).

---

## 15. Critères de réception du lot 1

Le lot 1 est reçu quand **tous** les points suivants sont vrais. Aucun n'est déclaratif : chacun se vérifie.

**Format et données**

1. `DB_VERSION` vaut 4 ; `SCHEMA` porte `marqueurs` et `marquages` ; le `git diff` de `SCHEMA` est une addition de
   deux lignes, aucune ligne existante modifiée.
2. Une base créée en schéma 1, 2 ou 3 monte en 4 en conservant toutes ses données, et reçoit les **trois** index de
   `marquages` (MIG-01).
3. Une base montée en 4 refuse de s'ouvrir en 3 avec une `VersionError`, sans rien effacer (MIG-02).
4. Un aller-retour export/import conserve vocabulaire et poses à l'identique ; `schemaVersion` vaut 4 (MIG-04).
5. Une sauvegarde de schéma 2 ou 3 reste restaurable ; les deux magasins sont vidés **et nommés dans la confirmation**
   (MIG-05).
6. Une sauvegarde d'un schéma supérieur est refusée **avant** toute écriture (MIG-06).
7. Une référence orpheline s'affiche en gris avec son code — ou un repère neutre si ce n'était ni un rôle ni une
   équipe, ou `?` si le code d'un rôle ou d'une équipe manque — sans une seule erreur de console (MIG-08) ; une pose
   sans `courtSecours` ni `genreSecours`, un marqueur sans `genre`, `couleur` ni `archivee`, et un champ inconnu sur
   l'un comme sur l'autre sont acceptés à l'import et relus intacts (MIG-07).
8. Supprimer une séance, une **séquence** ou un élève emporte les poses ; le texte de la confirmation les compte —
   y compris pour la séance, dont l'aperçu est créé par ce lot ; « Annuler » les restaure (MIG-09).

**Invariants d'usage**

9. Un marqueur ne peut pas se poser sur un élève sans enregistrement d'appel : refus explicite, aucune écriture, le
   compteur « saisis » ne bouge pas (MQ-05) — et « Terminer l'appel » débloque toute la classe (MQ-06).
10. Poser n'écrase jamais le statut, les minutes de retard ni le commentaire (MQ-01), et l'appel est relu **dans** la
    transaction, avec un texte de refus propre quand il a disparu de la base (MQ-02).
11. Un échec d'écriture est **dit**, l'écran revient au dernier état confirmé, et un tap plus récent n'est pas défait
    (MQ-03).
12. Le cumul est libre (MQ-07) ; reposer ne crée pas de seconde ligne (MQ-08) ; `occurrences` survit à tout, repose
    comprise (MQ-09).
13. Renommer change la lecture de l'historique ; l'instantané ne sert que pour ce qui a disparu (MQ-11) ; un champ
    inconnu déjà en base survit à un renommage, et l'identifiant d'un marqueur ne vient jamais des modifications
    (MQ-17).
14. Les marqueurs n'écrivent ni observation, ni note, ni colonne de CSV, ni ligne de papier, et la rangée de la carte
    ne s'imprime pas (MQ-15, MQ-16).

**Écrans**

15. La carte affiche au plus deux codes puis « +n » calculé sur les données, et le nom accessible nomme **tous** les
    rôles et équipes et **compte** les comportements sans les nommer (ECR-07, ECR-08) ; le repère d'un comportement a
    une boîte non nulle et l'encre pleine, dans les deux thèmes (ECR-08) ; dans la feuille, un marqueur posé se
    distingue d'un non posé sans la couleur et sans lecteur d'écran (ECR-16) ; l'ordre des boutons ne bouge pas
    pendant la vue (ECR-14).
16. À 320 px et à 200 % de texte, la rangée ne recouvre ni 🩺 ni ⚠ et ne déborde pas de la carte (ECR-09) — ce qui
    reste entier dans le pire cas attend la décision de mise en page du §6.1 ; la carte ne change pas de hauteur au
    premier marqueur, à 100 % comme à 200 % de texte (ECR-10) ; sans vocabulaire ni pose, la carte ne porte aucune
    rangée **et l'écran d'appel fonctionne** (ECR-15) ; la pose ne fait pas défiler l'écran sous le doigt (ECR-12).
17. Le mode tampon est visible par **trois** signaux simultanés, suspend les raccourcis de statut, sort par Échap et
    par changement de route, garde le statut et l'alerte dans le nom accessible des cartes et le leur rend sans mention
    d'action à la sortie (ECR-02 à ECR-06) ; « Terminer l'appel » reste à l'écran et le refus décidé par la vue ne
    nomme que des contrôles présents (ECR-17) ; l'atténuation d'une carte suit son statut (ECR-18) ; l'ordre de la feuille
    d'armement ne bouge pas d'un armement à l'autre (ECR-19).
18. La reprise ne copie aucun comportement, ne touche aucun élève non appelé, ne retire rien, est idempotente, survit à
    une séance intercalaire sans marqueurs, et son « Annuler » ne retire que les couples créés **et** repeint les cartes
    (MQ-14).

**Preuves et documentation**

19. Les trois fichiers de tests passent sur **les deux** projets prévus, `npm test` est vert en local et en
    intégration continue sur le commit publié.
20. La campagne de mutants est exécutée : **contrôle sain vert**, chaque mutant tué **par son test**, `MUTATIONS.json`
    consigné. Un mutant survivant est un défaut de preuve, pas une note de bas de page.
21. Les gardes dérivées du §12.1 sont vertes sans avoir été contournées, et les gardes manuelles du §12.2 sont à jour
    dans le **même commit** que le code qu'elles décrivent.
22. `app/js/state.js`, `app/service-worker.js`, la première entrée de `CHANGELOG.md` et la première ligne du tableau
    de `docs/deploiement.md` portent le **même** numéro de version.
23. `docs/decisions.md` porte D014 ; `docs/modele-donnees.md` décrit les deux magasins ; `docs/deploiement.md` décrit
    le retour arrière 4 → 3 **et** ce que voit un appareil resté en v0.13.5.
24. Aucune donnée nominative d'élève dans le dépôt, les tests ou la documentation ; rien n'est publié vers l'ancienne
    adresse.

**Ce que le lot 1 ne prouve pas, et qu'il faut dire plutôt que taire :** le comportement d'une v0.13.5 réellement
installée sur le téléphone face au refus d'ouverture (MIG-02 prouve le refus de la base, pas l'écran de cette
version) — reste un point de `docs/test-terrain.md` ; TalkBack sur un Android physique (le projet mobile est un
Pixel 7 **émulé**) ; l'impression papier réelle ; et la **perception** réelle des repères dans un gymnase, à bout de
bras. Ce qui est prouvé, c'est la règle qui la rend possible : le repère d'un comportement existe, n'est pas une boîte
nulle et porte l'encre pleine (ECR-08), et les codes des rôles gardent l'encre pleine sur une teinte à 12 % (§7). La
décision 10 retire de la carte le **sens** des comportements ; elle n'a jamais dispensé de prouver le **retour de
geste**, qu'elle exige au contraire (« sinon tu ne sais pas si ton tap a pris »). Le reste relève de l'essai de
terrain prévu entre v0.14.2 et v0.14.3 (§13).

---

## 16. Corrections après réfutation (2026-09-23)

Trois lentilles indépendantes (données, terrain, règles du dépôt) ont attaqué ce contrat : 28 constats. Tous sont
appliqués ; aucun ne change le périmètre des 18 décisions. Là où deux constats proposaient des remèdes différents, le
choix et sa raison sont écrits dans la section concernée.

**Appliqués**

- C01 (bloquant) — `ASSETS` éclaté par version : `marqueurs-calcul.js` en v0.14.0, `modules/marqueurs.js` en v0.14.1 ; règle « aucune entrée avant son fichier » (§4.3, §10, §12.1, §13).
- C02 — garde C37 `audit5-lot5.spec.mjs:185` : 5 → 6 lectures, ajoutée au §12.2 (§8, §12.2).
- C03 + C14 — `apercuSuppressionSeance` créée et branchée sur `sequences.js:225`, fichier ajouté au §10, MIG-09 et critère 8 précisés, mutant M33 (§8, §10, §11, §15).
- C04 + C06 — `CHAMPS_TEXTE.marquages` réduit aux trois références ; `courtSecours`, `genreSecours` et `occurrences` tolérés s'ils manquent ; règle 3 du §5.2 rendue atteignable, MIG-07/MIG-08, mutant M34 (§3.2, §4.3, §5.2, §9.2).
- C05 — une seule doctrine : champs inconnus **préservés**, refus sur les valeurs ; liste blanche stricte interdite, MQ-17 et mutant M35 (§2, §3.2, §4.4).
- C07 + C24 — « Terminer l'appel » reste visible en mode tampon ; sortie renommée « Sortir du mode (Échap) » dans la ligne du mode ; deux textes de refus qui ne nomment que des contrôles présents ; ECR-17, mutant M40 (§6.2, §6.3, §9.1).
- C08 — `btnTerminer` laissé à `majCompteurs()` seul ; `data-tampon-refus` recalculé par `majBouton` ; ECR-18, mutant M41 (§6.3).
- C09 — l'annulation de la reprise suit le même chemin de retour que le succès (file, Map, `majBouton`, annonce, échec relancé) ; MQ-14 regarde les cartes, mutant M36 (§6.4).
- C10 — motif du compteur réécrit : « une occurrence » n'est pas structurelle ; point ouvert 2 reformulé (§2, §14).
- C11 — la reprise remonte jusqu'à la dernière séance portant des rôles ou des équipes ; MQ-14 avec séance intercalaire, mutant M37, point ouvert 10 pour confirmation (§6.4, §14).
- C12 — rangée rendue seulement si le vocabulaire actif ou la séance n'est pas vide ; ECR-15, mutant M43 (§6.1).
- C13 — repère neutre de 10 px en encre pleine ; ECR-08 le mesure ; le paragraphe « ne prouve pas » sépare sens et retour de geste ; mutant M44 (§6.1, §7, §15).
- C15 — ordre des feuilles gelé pour toute la vue, feuille d'armement comprise ; ECR-14 réécrit, ECR-19, mutant M42 (§6.2, §6.3).
- C16 — preuves réparties par version : chaque test et chaque mutant arrivent avec la version qui les rend possibles (§11, §13).
- C17 — gardes de comptes re-réglées à chaque publication, valeurs données par version (§12).
- C18 — refus sans accord de genre : « Appel non fait pour Léa Martin : … » (§9.1).
- C19 + C25 — `playwright.config.mjs:27` corrigé en `:24` aux deux endroits ; le préambule dit ce qui a été relu (en-tête, §10, §11).
- C20 — phrase « aucun nouveau point d'appel » remplacée par « `majBouton` reste l'unique fonction qui peint une carte » (§6.1).
- C21 — styles d'état `aria-pressed` et `aria-disabled` pour `.btn-marqueur`, sans dépendre de la couleur ; ECR-16, mutant M38 (§6.2, §7).
- C22 — réserve de hauteur en `em` ; ECR-10 à 100 % et 200 %, mutant M39 (§6.1, §7).
- C23 — plus d'`aria-label` sur la carte en mode tampon : mention d'action ajoutée en `.sr-only`, statut et alerte conservés ; ECR-06 enrichi, mutant M46 (§6.3).
- C26 — motif de la garde de précache corrigé : imports statiques, aucune navigation à ajouter (§12.1).
- C27 — rangée de la carte masquée à l'impression, `.mq-code` retiré de `print-color-adjust`, mention redondante supprimée ; MQ-16, mutant M45 (§7, §9.4).
- C28 — garde d'énumération du projet mobile rendue dérivée (§12.1, §12.2).

**Remèdes proposés puis écartés, avec leur motif**

- C01, navigation `#/marqueurs` ajoutée à A43 en v0.14.1 : écartée au profit de C26 — les deux fichiers sont importés statiquement, la garde les voit déjà.
- C08, `if (tampon) return;` dans `majCompteurs()` : inutile une fois « Terminer l'appel » laissé visible (C07/C24), et il aurait figé le décompte des restants pendant le mode.
- C07, action « Terminer l'appel » portée par le toast de refus : non retenue, le bouton restant à l'écran ; un second déclencheur d'une écriture de classe entière serait un chemin de plus à prouver.
- C15, écrire `marqueursRecents` seulement à la sortie de la vue : écarté, une fermeture d'onglet perdrait l'usage de la séance ; c'est la **lecture** qui est gelée.
- C02, garde C37 rendue dérivée : écartée, elle plafonne un budget de lectures et doit rester un nombre écrit.
- C16, livrer en v0.14.0 un sous-ensemble de `marqueurs.spec.mjs` : écarté, MQ-07, MQ-11 et MQ-12 passent par des écrans absents de la v0.14.0 ; les mutants ont été déplacés à la place.

**Ce qui reste ouvert** : les points 1 à 10 du §14, dont le point 10 (nouveau, issu de C11) ; les limites de preuve du
§15 (appareil réel, impression papier, perception au gymnase).

### Second tour (2026-09-23)

Deux vérificateurs indépendants ont relu les corrections : 19 constats (R01 à R19), dont quatre doublons traités une
seule fois (C12 ; C24/C07 ; C04/C06 ; `io.js:146`-`:148`). Aucun ne change le périmètre des 18 décisions ; un seul
ajoute une question à l'enseignant (le point 11 du §14, ajouté au troisième tour). Aucun ne change un autre point
du §14.

**Appliqués**

- R01 (C12, **régression**) — `majBouton` ne touche la rangée que sous `if (rangeeActive)` ; ECR-15 affirme, dans le cas vide, les N cartes rendues, un statut écrit par un tap, zéro `pageerror` et zéro `console.error` (l'exception d'une vue ne produit qu'un `console.error`, `ui.js:31`) ; mutant M47 (§6.1, §11.3, §11.4, §13, §15).
- R12 (M16 non tué) — MQ-09 repose la ligne `occurrences: 3` par `appliquerMarquages` et relit `occurrences` et `dateAjout` ; aucun geste d'écran ne repasse par ce `put` (§4.2, §11.2, §11.4).
- R13 (M31 équivalent) — MQ-17 appelle `ecrireMarqueur(id, { id: 'autre', … })` directement ; M31 passe de MQ-11 (v0.14.2) à MQ-17 (v0.14.1) (§4.4, §11.2, §11.4, §13).
- R02 + R15 (C24/C07) — l'affirmation « ne nomme que des contrôles présents » est restreinte au refus décidé par la vue ; le refus `AppelManquant` venu de la base a son propre texte, sans contrôle nommé ; MQ-02 l'affirme, « Terminer l'appel » masqué en prémisse ; mutant M48 (§6.2, §6.3, §9.1, §11.2, §15).
- R03 + R14 (C04/C06, la classe entière) — `CHAMPS_TEXTE.marqueurs` réduit à `['libelle', 'court']` ; `genre`, `couleur` « chaîne si présent », `archivee` « booléen si présent » (absent = `false`) ; un genre ou une couleur **absents** dégradent comme des valeurs inconnues, partout (carte, feuilles, écran du vocabulaire, tri, reprise) ; **le défaut `genre: 'role'` de `ecrireMarqueur` est retiré**, sans quoi la première modification d'un marqueur importé sans genre en aurait changé le sens (décision 13) ; MIG-07 étendu, mutant M49 (§3.2, §4.3, §4.4, §5.1, §9.2, §11, §15).
- R04 — règle 3 du §5.2 réécrite : le genre décide d'abord entre code et repère, `courtSecours` ne décide que du texte d'un code ; MIG-08 couvre l'orphelin de comportement sans `courtSecours` (§5.2, §11.1).
- R05 (C27) — `.rang-marqueurs` retirée (ni règle ni nœud) ; sept classes, `.mq-plus` et `.mq-neutre-plus` déclarées sans règle propre (§7, §10).
- R06 (C05) — MIG-07 importe un marqueur et une pose portant un champ inconnu et les relit intacts ; §3.2 attribue l'import à MIG-07 et le renommage à MQ-17 ; mutant M50 (§3.2, §11).
- R07 (C14, même classe) — les textes figés de `sequences.js:246` et `eleves.js:576` sont réécrits **sans énumération** : le second omettait déjà les observations et les fichiers, le défaut est l'énumération (§8, §10, §13).
- R08 (C25) — `tests/e2e/audit5-lot3.spec.mjs` ajouté au préambule, avec la liste des fichiers relus à ce tour.
- R09 + R16 — `io.js:146`-`:148` → `io.js:144`-`:146` (§4.2).
- R10 + R17 — mécanisme du §4.3 corrigé : `caches.open` (`service-worker.js:59`) crée le cache avant l'échec de `addAll` (`:60`), `caches.has` (`audit5-lot4.spec.mjs:57`) resterait vert ; A43 rougit à `attendreSW` (`:40`).
- R11 + R18 — géométrie corrigée et **mesurée** : 🩺 et ⚠ ont `.eleve-cycle` pour bloc conteneur (`components.css:594`) et tombaient dans la rangée ; ils restent sur la ligne du statut, relevés de `--h-rang-carte` + 4 px par une règle `:has()` ; `padding-right: 12px` supprimé (il ne réservait rien) ; M23 redéfini (§6.1, §7, §10, §11).
- R19 — `appel.js:480`-`:491` : `btnTerminer` est seulement désactivé ; le relibellé de la reprise est dit sans précédent (§6.4).

**Remèdes proposés puis écartés, avec leur motif**

- R02/R15, réaligner `enregs` et `majCompteurs()` sur la base avant d'afficher le refus : écarté, c'est un chemin d'écriture de l'écran de plus pour un cas de concurrence rare ; le rechargement relit tout.
- R11, réserve à droite (`padding-right` en `em` couvrant les deux signaux) : écartée après mesure — un `padding` ne retient pas des enfants flex qui débordent, et la réserve nécessaire pour ⚠ (`right: 30px`) aurait pris près de la moitié des 67 px de la rangée à 320 px (≈ 30 px).
- R13, rattacher la preuve de M31 à MQ-11 ou MQ-12 : MQ-17 retenu, qui appelle déjà `ecrireMarqueur` sur une ligne existante, dans la même version (v0.14.1) que MQ-12.
- R10/R17, « A43 rougit à `:40` puis à `:59` » : `:59` n'est jamais atteint, le test s'arrête à la première assertion en échec ; seule `:40` est citée.
- R07, ajouter « … et les marqueurs posés » aux deux énumérations : écarté au profit d'une formule non énumérative, puisque l'énumération de l'élève était déjà incomplète.

**Signalé au second tour, sous-estimé** — corrigé au troisième tour ci-dessous.

### Troisième tour (2026-09-23)

Le vérificateur du second tour a conclu « pas encore prêt » sur quatre défauts, corrigés directement :

- **Régression de mise en forme** : quatre lignes du tableau du §12.2 étaient coupées en deux, ce qui décalait la
  colonne « Version ». Recollées ; nombre de colonnes contrôlé sur tout le fichier.
- **Limite d'affichage sous-estimée** : à 200 % de texte, le défaut touche les cas **courants** (un rôle et un seul
  comportement suffisent à rogner le repère), pas seulement le pire cas. Le §6.1 présente désormais la règle de
  débordement comme un **objectif suspendu** et non une garantie, et le choix de ce qui cède est posé à l'enseignant
  (**§14, point 11**, avec une recommandation).
- **Absence de `genre` par défaut, sans preuve** : ajout du mutant **M51** (défaut rétabli), tué par MQ-17 ; test pur
  de `trierMarqueurs` dans MIG-08 ; repli « Comportements » au §6.5 pour un genre absent ou inconnu (au lieu
  d'« undefined ») ; lieu d'affichage du refus d'« Archiver » précisé (toast depuis la liste).
- **Leçon B50** : le bouton « Reprendre » passe de `disabled` à `aria-disabled="true"` avec retour immédiat du
  gestionnaire (motif de `reglages.js:103`-`:108`), comme l'exige le §6.2 ; l'écart de `btnTerminer`, préexistant,
  est consigné sans être corrigé par ce lot.
- Deux formulations inexactes rectifiées : §5.2 (« ne se recouvrent jamais » → le point 3 précise le point 2) et §4.2
  (un second onglet resté ouvert **peut** reposer une clé existante — c'est précisément ce que la règle protège).

---

### Revue de la v0.14.0 (2026-09-23)

Revue adversariale du code de la v0.14.0 avant commit (4 lentilles, 2 réfutateurs par constat) : 2 constats retenus sur 12.

- **Preuves du format complétées** : MIG-07 refuse 15 altérations au lieu des 6 prévues au §11.1 — ajout du code court de
  4 caractères ou avec un espace, du genre et de la couleur non texte, de l'archivage non booléen, des occurrences non
  entières, des instantanés et de la date non texte. Mutants **M52 à M60**, tués par MIG-07. Le §11.1 sous-estimait la
  barrière d'import d'un format qu'on ne pourra plus changer.
- **Sonde de C37 dérivée de la base** : la liste des magasins d'historique d'un élève n'est plus écrite à la main (elle
  oubliait `inaptitudes` et `marquages`) mais lue dans la base réelle (tout magasin qui porte un index `eleveId`).
  Mutant **M61**, tué par C37.

**Deux points réels, inactifs en v0.14.0, reportés** — à traiter dans la version où ils deviennent atteignables :

1. **v0.14.2** — une pose écrite pendant une suppression en cascade survivrait à sa séance ou à son élève : les cascades
   collectent par lectures, puis suppriment dans une autre transaction. Dès que la feuille « ⋯ » posera des marqueurs, la
   collecte et la suppression des `marquages` doivent être faites dans la transaction d'écriture (ou la pose refusée si
   sa séance n'existe plus), avec un test de concurrence.
2. **v0.14.1** — une sauvegarde bricolée peut contenir deux marqueurs actifs de même code court (l'import ne contrôle que
   la forme, §9.2) ; `ecrireMarqueur` refuse ensuite de modifier l'un comme l'autre. L'écran du vocabulaire doit rendre ce
   blocage lisible (nommer le doublon, proposer d'archiver l'un des deux) au lieu d'un refus muet.

### v0.14.1 — deux textes provisoires, à rétablir en v0.14.2

Publiée seule, la v0.14.1 permet de préparer le vocabulaire mais pas encore de poser un marqueur. Pour ne rien
promettre d'absent : la carte « Plus » dit « Préparez vos rôles, équipes et comportements ; leur pose pendant l'appel
arrive bientôt » (au lieu du texte du §6.5, « posés d'un tap pendant l'appel »), et l'introduction de l'écran porte un
paragraphe `#mq-bientot`. **La v0.14.2 rétablit le texte du §6.5 et retire `#mq-bientot`** (repérés en commentaire
dans `main.js` et `modules/marqueurs.js`).

### Revue de la v0.14.1 (2026-09-24)

Revue adversariale du code de la v0.14.1 avant commit (lentilles usage, accessibilité, preuves ; 2 réfutateurs par
constat) : **8 constats retenus**, tous corrigés avant commit. Le format n'est pas touché (`io.js`,
`marqueurs-calcul.js` inchangés).

- **R1 — majuscules « à la saisie » (§6.5), précisées.** Réécrire `value` à chaque `input` doublait les lettres avec un
  clavier qui compose le mot en cours (type Gboard) : « arb » tapé en minuscules donnait « AARARB », refusé à
  l'enregistrement. Désormais le champ **s'affiche** en majuscules (`text-transform: uppercase`) et la valeur est mise en
  majuscules (`toLocaleUpperCase('fr')`) **dans l'aperçu et à l'enregistrement**, jamais pendant la frappe. C'est la
  lecture retenue de « mis en majuscules à la saisie » : ce que l'enseignant voit et ce qui est enregistré sont en
  majuscules ; la valeur brute du champ ne l'est plus. Preuve : MQ-20, par composition CDP (`fill()` n'en ouvre aucune).
- **R2 + R6 — l'aperçu d'un comportement. Ambiguïté du §6.5 tranchée par la décision 10.** Le §6.5 demande « un aperçu
  `.mq-code` identique à celui de la carte d'élève » sans distinguer les genres, alors que la décision 10, le §5.1
  (points 2 et 5), le §5.2 et le §7 (point 3) fixent le rendu d'un comportement — genre absent ou inconnu compris — à un
  repère neutre **sans code**. L'aperçu montrait donc « REC » là où la carte d'élève n'affichera qu'un point. **La
  décision 10 prime** : pour un marqueur rangé « Comportements », l'aperçu (formulaire **et** cartes de la liste) rend
  `span.mq-neutre`, sans texte, suivi de « un repère neutre, sans code ; le sens reste dans la feuille de l’élève. » Le
  texte de la carte de liste (`REC · Comportements`) garde le code : c'est l'écran de préparation. La règle `.mq-neutre`
  du §7 point 3 est livrée dès la v0.14.1, **avec `display: inline-block` et `vertical-align: middle` en plus** : hors
  de la rangée flex de la carte d'élève, un `span` sans eux n'a aucune taille. Preuves : MQ-20 (formulaire, liste,
  témoin « rôle » dans le même test), MQ-17 (genre absent ou inconnu).
- **R3 — focus.** Archiver depuis l'alerte « Codes en double » (boutons sans `id`) ou lancer l'amorçage sur un
  vocabulaire déjà rempli (bouton disparu) laissait tomber le focus sur `<body>`. Cause commune traitée une fois : après
  le nouveau rendu, si le focus n'est plus dans la vue, il va au bouton « Archiver / Restaurer » du marqueur traité,
  sinon à « Nouveau marqueur ». Preuves : MQ-19 (au clavier, Tab puis Entrée réels), MQ-18 (vue périmée).
- **R4, R5, R7, R8 — preuves manquantes**, ajoutées à MQ-18 (amorçage sur une vue périmée) et MQ-19 (« Restaurer »
  refusé puis réussi ; archivés en dernier dans un genre ; mention « Code en double » sur chaque carte du groupe).
- Mutants **M71 à M77** (avec variantes), chacun tué par son test.
- **Vu à l'écran après la revue.** Au téléphone, la phrase de l'aperçu d'un comportement emportait le repère à la ligne,
  loin de « Sur la carte : » : `.mq-apercu` est passé en `display: contents`, le repère reste à côté de son étiquette et
  seule la phrase passe à la ligne. Preuve : MQ-20 (mesure à 360 px, sur les deux profils) ; mutant **M78**.

---

**Garde-fous, rappelés une dernière fois** : aucune ligne de code avant validation de ce contrat ; aucune publication
sans « go » explicite ; ne jamais monter `DB_VERSION` sans avis validé (`CLAUDE.md:202`) — c'est précisément ce que ce
document demande de valider.
