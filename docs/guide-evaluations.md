# Utiliser les évaluations par grille

> Module livré en **v0.13.0**, repris de la copie de travail de Codex (v0.13.3). Il fait passer la base en **schéma 3** : voir l'avertissement de retour arrière dans `docs/deploiement.md`.

## Préparer sa grille

Dans **Plus → Grilles d’évaluation** (ou **Notes → Gérer les grilles d’évaluation**), choisir **Nouvelle grille**. Donner un titre et une APSA, puis adapter les niveaux, leurs points, les critères et leurs poids. Les quatre critères initiaux ont chacun un poids de 2 ; les niveaux valent 0, 1, 2 et 3 : maximum 24 points.

Les critères peuvent être ajoutés, retirés ou remontés. Les descriptions expliquent ce que l’élève doit montrer. En bas de page, choisir l’arrondi et le traitement des critères non évalués, puis **Enregistrer la grille**. La liste permet de modifier, dupliquer, archiver et restaurer un modèle.

## Créer et saisir une évaluation

1. Une classe, ses élèves et une séquence doivent exister : utiliser les modules habituels si nécessaire.
2. Dans **Notes → + Nouvelle évaluation**, renseigner la séquence et le titre, choisir **Grille d’évaluation EPS**, sélectionner le modèle, le barème (/20 par défaut) et le coefficient.
3. Choisir **Créer et saisir les notes**. L’évaluation conserve une copie du modèle ; le modifier ensuite ne change pas cette évaluation.
4. En mode **Par élève**, sélectionner l’élève et appuyer sur un niveau pour chaque critère. Un second appui sur le niveau sélectionné le retire. Le total brut et la note apparaissent en tête.
5. En mode **Par critère**, choisir le critère et saisir les niveaux pour toute la classe.

Chaque choix est sauvegardé immédiatement : attendre **Enregistré ✓**. En cas de refus, le dernier choix enregistré reste affiché et un message explique l’erreur. Une note ne peut pas être modifiée à la main dans la grille de notes classique : suivre **Saisir les critères / voir le détail**.

## Calcul et cas particuliers

Avec la grille initiale, les niveaux 3 / 3 / 2 / 1 donnent **18/24, soit 15/20**.

« Non évalué » est différent d’un niveau valant zéro. Par défaut, un critère non évalué est absent du calcul ; le résultat peut donc être partiel, et le nombre de critères évalués est affiché. L’option « compter comme zéro » change ce calcul. Sans aucun critère évalué, aucune note n’est produite.

ABS, DISP et NN se choisissent dans le statut de l’élève. Les observations déjà saisies sont conservées pour une reprise, mais la note est exclue de la moyenne tant que ce code est actif. Revenir à « Évaluer avec la grille » restaure le résultat calculé. Un appui sur un niveau ne retire pas le code : vous pouvez noter une observation sans réintégrer une dispense dans la moyenne. Au clavier, le focus reste sur le niveau après enregistrement.

Les boutons **Élève précédent / Élève suivant** et **Critère suivant** permettent d’avancer sans remonter aux listes. **Réutiliser cette grille** crée un nouveau modèle depuis l’instantané exact de cette évaluation, même si le modèle initial a évolué.

Le barème d’une évaluation par grille est figé à sa création. Pour une autre grille ou un autre barème, créer une nouvelle évaluation. Le relevé ramène toutes les notes numériques sur 20 en respectant les coefficients.

## Points ajustables

Dans **Modifier** une grille, cocher **Points ajustables dans les cases**. Les « Points niveau » sont la valeur du toucher simple et le maximum autorisé. Définir les minimums et le pas (1, 0,5 ou 0,25).

Exemple avec un poids de critère de 1 : niveau 1 = 5 points, minimum 0 ; niveau 2 = 10 points, minimum 6. En saisie, un toucher attribue 5 ou 10. Un appui long (environ une demi-seconde), ou le bouton **Ajuster**, permet de choisir de 0 à 5 ou de 6 à 10. Le choix de 8 affiche « 8 / 10 points ». Sur PC : bouton Ajuster à la souris ou au clavier (Tab, Entrée ou Espace) ; Échap ou Annuler ferme sans modifier.

Le poids multiplie les points après le choix : 8 avec un poids de 2 donne 16 points bruts. Retoucher le niveau sélectionné efface le critère ; choisir un autre niveau applique ses points par défaut. Les couleurs sont configurables par niveau et toujours accompagnées du libellé, des points et de l’état sélectionné. Les évaluations existantes gardent leur grille figée : pour utiliser l’option, créer une **nouvelle évaluation** à partir du modèle modifié.

## Lire, imprimer et transmettre

- **Bilan de la classe** donne, pour chaque critère, le nombre d’élèves observés et la réussite moyenne. ABS/DISP/NN en sont exclus.
- **Imprimer** produit la fiche de l’élève sélectionné, ou le bilan affiché ; les contrôles de saisie disparaissent à l’impression.
- **Notes et export Pronote** ouvre la grille de notes habituelle. Copier ou exporter le CSV ; les valeurs sont sur le barème choisi. Les codes ne deviennent pas des zéros et la copie rappelle les cases à compléter manuellement.
- Une modification après publication indique que la remontée Pronote est à refaire.

## Conserver et transférer

**Plus → Sauvegarde** inclut les modèles, les copies figées et les détails de notation. Le format utilise le **schéma 3** : une sauvegarde faite en v0.13 ne se restaure pas dans une version antérieure. Les sauvegardes anciennes restent importables, **y compris celles qui portent des anomalies héritées** (barème à 0, note au-dessus du barème, note d’un élève supprimé) ; seules les notes de grille incohérentes avec leurs critères sont refusées, car elles feraient planter l’écran de saisie.
