# AVIS avant application — Grilles d'évaluation EPS réutilisables

> Statut : **EN ATTENTE DE VALIDATION** (rédigé le 2026-09-09, sur v0.12.14). **Rien n'est modifié tant que tu n'as pas répondu.**
> Demande : grilles réutilisables à plusieurs critères, niveaux de maîtrise, pondérations et calcul de note ; total brut **et** note ramenée sur 20 quel que soit le barème (18/24 → 15/20), arrondi configurable ; export Pronote au barème choisi et clairement indiqué ; poids respectés et **critères non évalués jamais comptés comme zéro** par défaut. Inspiration demandée : les grilles (« rubrics ») d'iDoceo.
> Contraintes tenues : évaluations existantes préservées, fonctionnement hors ligne, export Pronote inchangé, gratuité, zéro dépendance.

## 1. Ce qui existe déjà (point de départ)

| Élément | État actuel |
|---|---|
| `evaluations` | `{ id, sequenceId, titre, date, type: "note20" \| "bareme" \| "afl", bareme?, coef, publieePronote }` |
| `notes` | `{ id, evaluationId, eleveId, valeur (nombre \| "ABS" \| "DISP" \| "NN"), commentaire }` — **un seul nombre par élève** |
| Relevé | Moyenne /20 **déjà** pondérée par les coefficients : `(valeur / barème) × 20 × coef`. La conversion sur 20 existe donc déjà à ce niveau. |
| Export Pronote | Colonne d'une évaluation, une ligne par élève dans l'ordre alphabétique, virgule décimale, codes ABS/DISP/NN en ligne vide + rappel « à saisir à la main » ; garde-fou affichant l'effectif et le barème. |
| Type « AFL » | Positionnement **texte** libre, hors moyenne, non exporté. Ce n'est pas une grille : rien à reprendre, rien à casser. |

**Conséquence de conception, décisive** : si une évaluation par grille range son résultat dans `notes.valeur` comme un nombre ordinaire, **le relevé, la moyenne, l'impression et l'export Pronote fonctionnent sans une ligne de changement**. C'est le choix que je recommande : la grille est une **façon de saisir** une note, pas un second système de notation.

## 2. Ce que fait iDoceo (et ce que j'en retiens)

Dans iDoceo, une grille est un tableau : les **lignes** sont les critères (titre, description, poids réglable), les **colonnes** sont les niveaux, et **chaque cellule porte des points**, une couleur et un descripteur. Le résultat se calcule en Somme, Somme simple, Pourcentage ou Moyenne, avec une option explicite pour **tenir compte ou non des lignes vides** (critères non évalués). Le score obtenu se convertit ensuite en note via des « conversions rapides » réutilisables, et les grilles elles-mêmes sont réutilisables d'une classe et d'une colonne à l'autre.

**Ce que je reprends** : lignes = critères, colonnes = niveaux, poids par critère, option explicite sur les critères non évalués, réutilisation d'une grille d'une classe à l'autre, conversion du score en note.
**Ce que je simplifie** (téléphone, une main, entre deux ateliers) : **les points sont portés par le niveau** (colonne), et le critère porte un **poids**. La cellule vaut `points du niveau × poids du critère`. Un critère « Efficacité » de poids 2 sur des niveaux 0/1/2/3 donne 0/2/4/6 — soit la souplesse d'iDoceo sans demander de saisir un point par cellule. (Si tu veux vraiment des points cellule par cellule, c'est une option de phase 3, dis-le.)
**Ce que je n'apporte pas** : les conversions non linéaires (courbes de notation) d'iDoceo. En EPS le passage au barème est proportionnel ; une courbe serait un autre avis.

## 3. Le calcul, précisément

Pour un élève, sur une évaluation par grille :

```
total brut   = Σ  points(niveau choisi) × poids(critère)      ← critères ÉVALUÉS seulement
total max    = Σ  points(niveau le plus haut) × poids(critère) ← LES MÊMES critères
note /barème = total brut ÷ total max × barème                 ← puis arrondi
```

- **Un critère non évalué ne compte ni au numérateur ni au dénominateur** : il n'est pas un zéro, il n'existe pas pour cet élève. Un élève évalué sur 3 critères sur 4 est noté sur ce qu'il a fait.
- **Zéro explicite possible** : le niveau le plus bas peut valoir 0 point. « Non évalué » (case vide) et « niveau 0 » sont deux choses différentes, et l'écran les distingue visuellement.
- **Option par grille** : `critères non évalués = ignorés` (**défaut recommandé**) ou `= comptés comme zéro` (pour une grille où ne rien produire vaut zéro). L'option est affichée en toutes lettres sur l'écran de saisie, jamais implicite.
- **Aucun critère évalué** → **pas de note** (case vide), jamais 0. L'élève apparaît comme non noté, exactement comme aujourd'hui.
- **Exemple demandé** : 4 critères, niveaux 0-3, poids 2/2/1/1 → total max = (3×2)+(3×2)+(3×1)+(3×1) = 24. Un élève à 18 → `18 ÷ 24 × 20 = 15,0` → **« 18/24 → 15/20 »**, les deux affichés côte à côte.
- **Arrondi configurable** (par grille, appliqué **à la note convertie seulement**, jamais au total brut) : `exact` (2 décimales), `0,25`, `0,5`, `1`. Défaut proposé : **0,25**.

## 4. Parcours utilisateur

**a. Gérer ses grilles** — `Plus → Grilles`
Liste des grilles réutilisables (titre, APSA, nombre de critères, total max). Boutons : **Nouvelle grille**, **Dupliquer** (base d'une variante), **Archiver**. Une grille archivée n'est plus proposée à la création mais reste lisible.

**b. Construire une grille** — éditeur en trois cartes
1. **Identité** : titre (« Badminton — montante 6e »), APSA et champ d'apprentissage facultatifs.
2. **Niveaux** (les colonnes) : par défaut 4, modifiables — libellé + points. Proposition de départ, à valider : `Non atteint 0 · Fragile 1 · Satisfaisant 2 · Maîtrisé 3`.
3. **Critères** (les lignes) : libellé, description courte facultative (ce que l'élève doit montrer), **poids** (1 par défaut). Un bandeau permanent affiche **« total max = 24 »** et se met à jour à chaque changement.
4. **Règles** : arrondi, et traitement des critères non évalués (ignorés / zéro).

**c. Créer une évaluation par grille** — `Notes → Nouvelle évaluation`
Le type gagne une entrée **« Grille »**. On choisit une grille, le **barème d'export** (défaut **/20**) et le coefficient. La grille est alors **recopiée dans l'évaluation** (voir §6, décision 3) : modifier la grille plus tard ne changera aucune note déjà saisie.

**d. Saisir** — deux entrées vers la même donnée
- **Par élève** (défaut) : un élève, ses critères en lignes, les niveaux en gros boutons au pouce. En tête, en permanence : **« 18/24 → 15/20 »**.
- **Par critère** (confort, phase 3) : un critère, toute la classe — la façon dont on évalue réellement pendant un cours.
Un appui sur le niveau déjà choisi le retire (retour à « non évalué »), comme le tap-cycle de l'appel.

**e. Lire et exporter** — rien de nouveau à apprendre
La note apparaît dans la grille de notes, le relevé, la moyenne et l'impression **comme une note ordinaire**. Le détail par critère est consultable depuis la case. L'export Pronote copie la note **sur le barème choisi**, et le garde-fou affiché après la copie l'écrit noir sur blanc : « 24 lignes dont 2 vides · **barème /20** · grille « Badminton — montante 6e » (total brut sur 24) ».

## 5. Modèle de données (additif, `DB_VERSION` 2 → 3)

```
grilles       { id, titre, apsa?, ca?, archivee,
                niveaux:  [{ cle, libelle, points }],          // les colonnes
                criteres: [{ id, libelle, description, poids }], // les lignes
                arrondi: "exact" | "0.25" | "0.5" | "1",
                nonEvalue: "ignorer" | "zero",
                dateCreation }

evaluations   + type: "grille"
              + grilleId          → la grille d'origine (traçabilité, réutilisation)
              + grille            → COPIE FIGÉE de { niveaux, criteres, arrondi, nonEvalue } à la création
              ( bareme : le barème d'export, déjà présent — 20 par défaut )

notes         + detail: { <critereId>: <cleNiveau> }   // choix par critère, absent = non évalué
              ( valeur : la note calculée sur le barème — INCHANGÉE dans son rôle et son type )
```

- **Migration additive** (décision D009) : création du store `grilles`, aucun enregistrement existant touché. `notes.detail` et les champs d'`evaluations` sont **optionnels** : une note classique reste une note classique.
- **Export / import JSON** : `grilles` rejoint `STORES` et le dictionnaire `LIBELLES` (le résumé d'import doit le nommer). Une sauvegarde antérieure ne contenant pas `grilles` **videra ce store** à l'import : c'est la règle H04 déjà en vigueur, et la confirmation d'import le dit déjà.
- ⚠ Une fois `DB_VERSION 3` déployé, redéployer une version antérieure devient impossible sur les appareils à jour (`VersionError`) — c'est déjà écrit dans `docs/deploiement.md`, mais cela vaut d'être rappelé avant de dire oui.

## 6. Trois décisions que je te demande de trancher

1. **Points par niveau + poids par critère** (ma proposition, §2) ou **points par cellule** comme iDoceo ? → je recommande **niveau + poids** : deux fois moins de saisie, même résultat dans 95 % des grilles EPS.
2. **Critères non évalués : ignorés par défaut** (ma proposition) ou comptés zéro par défaut ? → je recommande **ignorés**, avec l'autre choix disponible par grille et affiché.
3. **Copie figée de la grille dans l'évaluation** (ma proposition) ou grille vivante ? → je recommande **figée** : sinon, corriger une grille en novembre change les notes de septembre sans prévenir. Le prix est faible (quelques lignes recopiées), le bénéfice est l'intangibilité de ce qui a été évalué.

Et deux réglages par défaut à confirmer : les **4 niveaux** proposés (`Non atteint 0 · Fragile 1 · Satisfaisant 2 · Maîtrisé 3`) et l'**arrondi 0,25**.

## 7. Plan progressif — quatre phases, chacune livrable et testée

| Phase | Contenu | Effet visible | Taille |
|---|---|---|---|
| **1 — Le socle** | Store `grilles` (`DB_VERSION` 3), écran `Plus → Grilles` (liste, création, duplication, archivage), éditeur (niveaux, critères, poids, règles), bandeau « total max ». Aucun lien avec les évaluations. | On peut préparer ses grilles. Rien d'autre ne change. | io.js, 1 module neuf, docs ; ~6 tests |
| **2 — Évaluer avec une grille** | Type `grille` à la création d'une évaluation, copie figée, saisie **par élève**, calcul (total brut, note convertie, arrondi, critères non évalués), affichage « 18/24 → 15/20 », détail consultable. Relevé, moyenne, impression et export Pronote **inchangés** puisque la note reste un nombre. | La fonctionnalité demandée est utilisable en classe. | notes.js, metier.js, io.js ; ~10 tests |
| **3 — Le confort du terrain** | Saisie **par critère** pour toute la classe, mention de la grille et du barème dans le garde-fou Pronote et l'en-tête imprimé, impression de la grille remplie d'un élève, duplication depuis une évaluation. | Saisie réellement rapide pendant le cours. | notes.js, appel.js (raccourci), CSS ; ~6 tests |
| **4 — Le retour d'information (optionnel)** | Bilan **par critère** : par élève (ses points forts et fragiles sur l'année) et par classe (le critère le moins réussi). Utile pour les AFL et les bulletins. | Aide à la régulation, pas à la notation. | metier.js, un écran ; ~4 tests |

Je propose de livrer **la phase 1 seule** d'abord, pour que tu construises une vraie grille et me dises si l'éditeur tient au pouce, avant d'engager la phase 2.

## 8. Risques et comment je les traite

| Risque | Traitement |
|---|---|
| **Saisir une grille est plus long qu'une note** — sur un tapis de gym, c'est rédhibitoire | Boutons de niveau pleine largeur, un appui = un critère ; saisie par critère pour toute la classe (phase 3) ; total et note recalculés en direct, jamais de bouton « calculer » |
| **Modifier une grille change des notes passées** | Copie figée dans l'évaluation (décision 3). La grille réutilisable évolue librement pour les évaluations futures |
| **Un critère non évalué compté zéro** — la faute qui fausse une moyenne en silence | Ignoré par défaut, dénominateur ajusté, option explicite et affichée ; aucun critère évalué → pas de note du tout |
| **Migration de schéma** | Additive (D009), store neuf, champs optionnels ; les notes classiques ne sont pas touchées ; test de montée v2 → v3 comme celui qui existe pour v1 → v2 |
| **Export Pronote faussé** | La note exportée reste `notes.valeur` sur le barème de l'évaluation — le mécanisme actuel n'est pas modifié. Ajout d'une mention du barème et de la grille dans le garde-fou. Test : grille 18/24, barème 20 → la colonne copiée contient bien `15` |
| **Sauvegarde / import** | `grilles` ajouté à `STORES` et `LIBELLES` ; test de l'aller-retour export → import avec grilles et notes détaillées |
| **Hors ligne** | Aucune dépendance, aucun appel réseau : tout est local, comme le reste. La liste des fichiers du service-worker gagne le nouveau module |
| **Volume de données** | Un objet `detail` de quelques clés par élève et par évaluation : négligeable devant les pièces jointes |

## 9. Ce que ça ne fera pas (pour rester net)

Pas de courbes de conversion non linéaires, pas de bibliothèque de grilles partagée en ligne (l'app est 100 % locale), pas de photo ou de vidéo attachée à un critère, pas de grille liée au type « AFL » existant (qui reste un positionnement texte).

## 10. Gratuité et outils

Aucun outil ni dépendance ajoutés : vanilla, IndexedDB, Playwright pour les tests (déjà en place). **Gratuité confirmée.**

## 11. Réponse attendue

Trois lignes suffisent : les trois décisions du §6 (1 : niveau+poids ou cellule · 2 : ignorés ou zéro · 3 : figée ou vivante), les défauts du §6 (niveaux, arrondi), et **jusqu'où aller maintenant** (phase 1 seule, phases 1+2, ou tout).
