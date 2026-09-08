# Échanges avec Pronote

> Cadre : il n'existe **pas d'API Pronote publique côté enseignant**. Tous les échanges passent par des fichiers (CSV) ou le presse-papiers. C'est volontaire et ça suffit (décision D005).
> ⚠️ Les écrans et formats Pronote varient selon la version de l'établissement : **chaque format ci-dessous est à valider une fois sur le Pronote du collège** (tâche en phase 2 pour l'import, phase 6 pour l'export).

## 1. Pronote → Carnet EPS : importer les élèves (phase 2)

**Côté Pronote (client)** : Ressources ▸ Élèves ▸ liste de la classe → copier le tableau ou exporter en CSV (selon droits : un export par classe suffit).

**Côté Carnet EPS** — l'import doit être tolérant :
- Séparateur `;` ou tabulation (collage direct accepté en plus du fichier).
- Encodage UTF-8, Windows-1252 **ou** UTF-16 avec BOM (« Texte Unicode » d'Excel). Détection (`decoderTexte`, v0.12.12) : BOM UTF-16 → décodage UTF-16 ; sinon UTF-8 **strict**, et Windows-1252 seulement si le fichier n'est pas de l'UTF-8 valide (un `�` légitime dans un fichier UTF-8 ne fait plus basculer tout le fichier). Les caractères de contrôle (NUL…) sont retirés des champs ; un champ entre guillemets sur plusieurs lignes est refusé avec message.
- Colonnes reconnues automatiquement : `Nom`, `Prénom`, `Né(e) le`, `Sexe`, `Classe` — écran de **mapping manuel** si en-têtes différents ; colonnes inconnues ignorées (on n'importe jamais l'INE ni l'adresse).
- Dates `JJ/MM/AAAA` → ISO (séparateurs `/`, `.` ou `-` acceptés, `AAAA-MM-JJ` aussi) ; une date impossible (31/02) ou non reconnue est laissée vide et comptée dans le résumé d'import (« n dates de naissance non reconnues », B46/C51, v0.12.12).
- Doublons (même nom+prénom+classe) : ignorés et comptés dans le résumé d'import (« n doublons ignorés ») ; un élève « parti » qui revient est réactivé (D-13, v0.12.9) ; un homonyme présent dans une **autre** classe est signalé (« changement de classe ? à vérifier », C14, v0.12.12). Pas d'écran de fusion.

Jeu d'essai fictif : `app/data/exemple_eleves_pronote.csv`.

## 2. Carnet EPS → Pronote : remonter les notes (phase 6)

### Voie A — presse-papiers (recommandée, zéro config)

Dans Pronote, la saisie d'un service de notation accepte le **collage d'une colonne de notes**, élèves triés par ordre alphabétique.

Côté app, bouton **« Copier pour Pronote »** sur une évaluation :
1. Trie les élèves comme Pronote (NOM puis Prénom, sensible aux espaces/tirets — à vérifier sur les cas réels : homonymes, noms composés).
2. Génère une valeur par ligne, virgule décimale (`12,5`).
3. Codes spéciaux : `ABS`, `DISP`, `NN` — selon la version Pronote ils ne se collent pas toujours → l'app affiche après copie la liste « à saisir à la main : ligne X = ABS ».
4. Garde-fou : l'app affiche l'effectif copié et le nombre de lignes vides (non saisies + codes ABS/DISP/NN — C16, v0.12.12) ; **vérifier qu'il correspond à l'effectif Pronote avant de coller** (élève arrivé/parti en cours d'année = décalage de lignes).

### Voie B — CSV (si l'établissement utilise l'import de notes)

Export CSV `;` : `Nom;Prénom;Note` (virgule décimale, codes ABS/DISP/NN tels quels, champs échappés + anti-injection de formule). Encodage **UTF-8 avec BOM** (Excel France l'ouvre avec les accents corrects ; c'est ce que fait le code, `io.telechargerTexte`). Un export Windows-1252 ne serait ajouté que si l'import Pronote de l'établissement l'exigeait — à confronter à la version de l'établissement avant d'industrialiser.

### Métadonnées de traçabilité

Après export, l'évaluation est marquée `publieePronote = date` → le tableau de bord liste les évaluations **non encore remontées**.

## 3. Absences : position claire (décision D006)

L'appel **réglementaire** (vie scolaire, familles) se fait dans Pronote, c'est une obligation. Carnet EPS ne remonte rien automatiquement : il trace le suivi **spécifique EPS** (oubli de tenue, dispense « mot », inapte présent, départ infirmerie) que Pronote ne sait pas représenter. Un récap imprimable/CSV par classe et par période sert de pièce justificative (conseil de classe, familles, vie scolaire).

## 4. EDT : import éventuel (backlog)

Pronote peut afficher/exporter l'EDT du professeur (selon config : iCal ou copie de tableau). En v1, l'EDT se saisit à la main dans l'app (10 min, une fois par an). Un import iCal est noté au backlog si le besoin se confirme.

## 5. Checklist de validation en établissement

- [ ] Export CSV d'une classe réelle depuis Pronote → import dans l'app sans mapping manuel (phase 2)
- [ ] Encodage : prénoms accentués corrects après import (phase 2)
- [ ] Collage d'une colonne de notes dans un service Pronote réel : ordre, décimales, codes spéciaux (phase 6)
- [ ] Cas limites : homonymes, nom composé, élève arrivé en cours d'année (phase 6)
- [ ] Récap absences EPS imprimé accepté par la vie scolaire comme pièce de suivi (phase 7)
