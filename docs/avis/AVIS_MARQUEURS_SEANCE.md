# Avis — marqueurs de séance (rôles, comportement, équipes) et informations chiffrées

**Rédigé le 2026-09-17 · en attente de décision · aucune ligne de code écrite à ce jour**

Demande : « ET POUR METTRE DES INFOS comme score, groupe etc ? », puis « système de pastilles par exemple pour des
rôles dans la séance ou pour comportement… ». Référence citée : les badges d'iDoceo.

Méthode : dix lecteurs indépendants du dépôt, trois conceptions concurrentes écrites séparément, six juges (professeur
d'EPS au gymnase, modèle de données, règles du projet et accessibilité). Tout ce qui est affirmé ci-dessous a été
revérifié dans le code ; les affirmations des études qui n'ont pas résisté sont listées au §10.

---

## 1. Ce qui existe aujourd'hui, et ce qui manque

| Besoin | Ce qui existe déjà | Où | Limite réelle |
| --- | --- | --- | --- |
| Score chiffré | Évaluation « Barème personnalisé » (jusqu'à /200) | Notes → nouvelle évaluation | **une seule valeur par élève et par évaluation** (`notes.id = ${evalId}_${eleveId}`, `notes.js:386`) : trois essais = trois colonnes |
| Score non numérique (« 2'18 ») | Évaluation « AFL / positionnement », texte libre (`notes.js:75`) | idem | jamais additionnée, hors moyenne, hors Pronote |
| Équipe, atelier | La même colonne AFL intitulée « Équipe » | idem | rattachée à **une séquence** : à refaire à chaque APSA, invisible sur le terrain |
| Mot du jour sur un élève | **`appels.commentaire`** — texte libre **par élève ET par séance** | **écran d'appel**, feuille `⋯` | un élève à la fois, au clavier |
| Rôle tenu, comportement | **rien** | — | — |
| Groupe stable dans une classe | **rien** | — | `eleves.classeId` est un champ unique : un élève appartient à une classe, et à rien d'autre |

Deux remarques qui pèsent sur toute la suite :

- la saisie compacte « un élève par écran » livrée en v0.13.4 **n'existe que pour le type grille** ; l'écran des notes
  reste une liste de champs empilés, un par élève ;
- le relevé de classe affiche **toutes** les évaluations de **toutes** les séquences : une colonne « Équipe » par APSA
  encombre la feuille de fin d'année.

## 2. Avertissement de calendrier — à lire avant de saisir quoi que ce soit

`importerJSON` **remplace tout** : « Restauration complète : REMPLACE tout » (`io.js:424`), un `clear` puis des `put`
sur chaque magasin. Donc : **tout ce qui sera saisi sur la nouvelle adresse avant l'import de la sauvegarde de
l'ancienne sera effacé par cet import.** D'abord la migration appareil par appareil, ensuite la saisie — et ensuite
seulement ce chantier.

## 3. Ce qu'est un marqueur

Un objet unique, défini par toi, dont le rôle, le comportement et l'équipe ne sont que des variantes :

```js
{ cle: '…', libelle: 'Arbitre', court: 'ARB', couleur: 'bleu', genre: 'role', archive: false }
```

- `court` : 1 à 3 caractères, **obligatoire** — c'est lui qui porte l'information quand la couleur ne se voit pas
  (règle du projet : jamais la couleur seule) ;
- `couleur` : un des huit **noms** de `COULEURS_NIVEAUX`, jamais un code hexadécimal, pour rester juste dans les trois
  thèmes ;
- `genre` : `role`, `comportement` ou `groupe` — le genre `groupe` est **exclusif** (poser « Éq. 2 » retire « Éq. 1 ») ;
- on n'efface pas un marqueur, on l'**archive** (même mécanisme que les grilles) : la palette se vide, l'historique
  reste lisible ;
- renommer conserve la clé, donc tout l'historique suit — « Arbitre » devenu « Juge » se lit « Juge » partout.

Liste livrée d'origine, pour que ce soit utile sans aucun réglage : Arbitre · Observateur · Coach · Capitaine ·
Chrono · Pareur · Engagement + · À recadrer −.

## 4. Où vit un marqueur

**Sur l'enregistrement d'appel qui existe déjà**, un par élève et par séance (`appels`, clé `<seanceId>_<eleveId>`,
`io.js:22`) :

```js
{ id, seanceId, eleveId, statut, minutesRetard, commentaire,
  marqueurs: ['<cle>', …] }   // NOUVEAU, [] par défaut
```

La liste des marqueurs disponibles va dans le magasin `meta` (`io.js:16`), comme les autres réglages.

**Aucun nouveau magasin, aucun nouvel index, donc `DB_VERSION` reste à 3** (`io.js:8`) — un champ ajouté à un magasin
existant ne demande rien à IndexedDB. C'est la condition qui rend ce chantier compatible avec la période à deux
adresses : une base passée en schéma 4 ne revient jamais en arrière, et ses sauvegardes sont refusées par les versions
déjà installées.

**Piège vérifié, à traiter en premier** : `definirStatut` **reconstruit** l'enregistrement champ par champ
(`appel.js:303-310`). Tout champ qu'elle ne connaît pas est **perdu au premier changement de statut**. Il faut donc une
ligne d'héritage explicite, sur le modèle de `commentaire`, et la même dans les deux autres chemins qui fabriquent un
enregistrement (pré-remplissage d'inaptitude, « Terminer l'appel »).

## 5. Le geste au gymnase — la décision principale

Deux façons de poser un marqueur, à trancher (question 3) :

**(a) Sans mode — par la feuille `⋯` de l'élève.** Appui long (ou tap sur un statut hors cycle) → une rangée de
marqueurs dans la feuille qui existe déjà. Coût : ~3 gestes par élève, soit ~18 pour six arbitres. Aucun risque.

**(b) Mode « tampon ».** On touche « Arbitre » dans une palette, la barre annonce « Marqueur actif : Arbitre », puis
**chaque tap sur un élève pose ou retire ce marqueur** au lieu de faire tourner le statut. Six arbitres = 8 taps.
C'est le gain réel — et **c'est aussi le seul vrai danger de ce chantier** : tant que le mode est armé, le geste
principal de l'écran ne fait plus ce qu'il faisait. Un enseignant qui se croit sorti du mode fait l'appel de travers.

Les juges sont partagés ; ma recommandation : **livrer (a) d'abord, ajouter (b) ensuite**, avec fond coloré de la
grille, libellé permanent dans la barre, sortie par Échap, raccourcis clavier de statut suspendus, et retour haptique
distinct à la pose et au retrait.

## 6. Ce qu'on en relit

Poser sans relire n'a aucun intérêt : tout doit être livré dans le même lot.

- **Carte d'élève** : les codes courts sur une ligne dédiée, avec une réserve à droite pour 🩺 et ⚠.
- **Bilan de séance** : « Arbitres : 4 · Observateurs : 6 · À recadrer : 1 ».
- **Fiche élève** : la liste datée de ses marqueurs, et le cumul de l'année.
- **Récapitulatif de classe** : une colonne « Marqueurs (période) » de forme **fixe**, pas une colonne par marqueur.
- **CSV de séance** : `Nom;Prénom;Statut;Minutes;Marqueurs;Commentaire` — il n'existe pas aujourd'hui.
- **Impression** : les codes courts doivent rester lisibles sans impression des fonds.

## 7. Le score chiffré n'entre pas là-dedans

Les deux études aboutissent à la même conclusion, pour des raisons différentes : un champ « mesure » sur
l'enregistrement d'appel serait du **poids mort** — texte libre, saisi au clavier un élève à la fois, ni trié, ni
comparé, ni cumulé, ni exportable. Une performance EPS, c'est trois essais, un record, une progression : cela relève des
évaluations, pas d'une pastille.

À court terme, **ce qui existe suffit** : une évaluation « Barème personnalisé » pour un nombre, « AFL / positionnement »
pour « 2'18 ». À moyen terme, si tu le demandes, un type d'évaluation « Mesure » (unité, sens meilleur = petit ou grand,
valeur non plafonnée, jamais dans la moyenne ni dans Pronote) — chantier distinct, à part.

⚠️ Une idée séduisante a été écartée après vérification : réutiliser `coef: 0` comme marqueur « information ». Ce
coefficient a déjà un sens dans le dépôt (évaluation blanche, non comptée) ; le surcharger rendrait les deux
indistinguables.

## 8. Équipes : séance ou séquence ?

Un marqueur de genre `groupe` posé sur l'appel vit **une séance**. Une équipe de volley dure six semaines : la reprendre
chaque fois est un tap de trop (« Reprendre les marqueurs de la séance précédente » le règle — mais il faut décider ce
qu'on fait des absents du jour et des nouveaux inscrits).

L'alternative — une composition d'équipes portée par la **séquence** ou par la **classe**, qui survit à l'APSA — coûte
davantage et recoupe un champ déjà envisagé dans l'avis « page de classe à onglets ». Les deux écrivent au même endroit
et exigent la même plomberie : **à décider ensemble, pas deux fois** (question 6).

## 9. Coût et découpage

| Lot | Contenu | Ordre de grandeur |
| --- | --- | --- |
| v0.14.0 | vocabulaire + pose par la feuille `⋯` + codes sur la carte + bilan de séance | 2 à 3 jours, ~12 tests + mutants |
| v0.14.1 | mode « tampon », reprise de la séance précédente, cumul sur la fiche élève | 1 à 2 jours |
| v0.14.2 | CSV de séance, colonne du récapitulatif, impression | 1 jour |

Dans tous les cas : aucune migration, un `AVIS` (celui-ci) validé avant la première ligne, passage par `/plan`, et les
gardes habituelles (versions synchronisées, comptes de tests des README, CHANGELOG, journal, TODO, déploiement).

## 10. Pièges trouvés par la vérification (à traiter, tous vérifiés dans le code)

1. `definirStatut` reconstruit l'enregistrement : un champ ajouté sans ligne d'héritage est **perdu** (`appel.js:303`).
2. `--niv-vert` **est exactement** `--stb-present` et `--niv-turquoise` **est** `--stb-inapte` (`base.css:23,27,39,42`) :
   un marqueur vert sur une carte « présent » est illisible → interdire ces deux couleurs aux marqueurs, ou les
   distinguer par la forme.
3. `.pastille` **est déjà pris** dans le CSS (le rond de couleur d'une classe, `components.css:340`) → nommer ce
   chantier « marqueurs », dans le code comme à l'écran.
4. La carte d'élève **rogne en silence** ce qui dépasse, et ses deux coins portent déjà 🩺 et ⚠.
5. Les raccourcis clavier de statut (`appel.js:16`) restent actifs : ils doivent être suspendus pendant le mode, et
   le mode doit avoir une sortie au clavier.
6. `definirStatut` annonce un **statut** à chaque écriture (`appel.js:313`) : une pose de marqueur doit avoir sa propre
   annonce, sinon le lecteur d'écran énonce un statut qui n'a pas changé.
7. `CHAMPS_TEXTE.appels` exige `statut` en chaîne (`io.js:43`) : poser un marqueur sur un élève non encore appelé crée
   son enregistrement — avec `statutInapte(eleve) || 'present'`, jamais « présent » en dur — et fait avancer le
   compteur « saisis ». À dire à l'écran.
8. Le magasin `meta` n'est pas dans `LIBELLES` (`io.js:751`) et n'est validé nulle part à l'import : le vocabulaire peut
   être remplacé sans un mot. À corriger dans la **forme** de la garde, pas par une phrase ajoutée.
9. Le service-worker énumère ses fichiers à la main : tout nouveau module doit y être ajouté, sinon il manque hors ligne.
10. **Doublon à trancher** : le magasin `observations` porte déjà un vocabulaire de comportement figé
    (`metier.js:31` : Engagement, Comportement, Coopération…). Marqueurs et observations doivent être articulés
    explicitement — le marqueur est rapide et compté, l'observation est écrite et datée (question 9).

Affirmations des études **écartées** après vérification : le plafond /200 n'empêche pas de saisir un temps de 500 m
(138 s) ; filtrer par équipe ne demanderait pas forcément un nouveau champ ; et aucune citation d'un document du dépôt
présentée comme littérale n'a été conservée sans la vérifier mot à mot.

## 11. Décisions à prendre

1. **Un marqueur vaut-il pour UNE séance** (posé le jour même, relu dans l'historique), ou attends-tu aussi des
   marqueurs permanents (« délégué », « dispensé à l'année ») ? → séance / séance + permanent
2. **Rôles, comportement et équipes sont-ils le même objet** (une seule liste, trois genres), ou trois listes
   séparées ? → un seul / trois
3. **Le geste** : (a) par la feuille de l'élève, sans mode, ~3 gestes par élève ; (b) mode « tampon », 8 taps pour six
   élèves, au prix d'un tap qui change de sens ; (c) (a) d'abord, (b) au lot suivant. → a / b / c *(je recommande c)*
4. **Combien de marqueurs différents** au maximum dans ta palette ? (8 couleurs distinctes existent ; au-delà, deux
   marqueurs partagent une teinte et seul le code court les distingue) → 8 / 12 / plus
5. **Un cumul doit-il alerter** ? Trois « À recadrer » dans le trimestre déclenchent-ils un ⚠ comme les oublis de tenue,
   ou le cumul reste-t-il une simple lecture ? → alerte / lecture seule
6. **Les équipes** : posées séance par séance avec « reprendre la séance précédente » (léger), ou stockées pour toute la
   séquence (plus lourd, à décider avec les onglets de classe) ? → séance / séquence
7. **Sur la carte d'élève**, veux-tu voir les codes courts de tous les marqueurs posés, ou seulement un point discret
   (le détail dans la feuille) ? → codes / point discret
8. **Sur le papier** : les marqueurs doivent-ils apparaître sur la feuille d'appel imprimée et dans le CSV de séance ? →
   oui / non
9. **Marqueurs et observations** : le marqueur remplace-t-il l'observation courte, ou les deux coexistent-ils (un
   marqueur peut alors proposer « écrire une observation ») ? → remplace / coexistent
10. **Les élèves voient l'écran par-dessus ton épaule.** Un marqueur « À recadrer » visible sur la grille de toute la
    classe te convient-il, ou les marqueurs de comportement doivent-ils rester dans la feuille de l'élève ? →
    visible / discret
11. **Le score chiffré** : te contentes-tu des évaluations actuelles (« Barème personnalisé » et « AFL »), ou veux-tu un
    type « Mesure » avec unité et sens, en chantier séparé ? → actuel / type Mesure
12. **Calendrier** : d'accord pour que rien ne commence avant la fin de la migration de tes données, et pour que ce
    chantier passe **après** le carnet de classe à onglets ? → oui / non

---

**Garde-fous, comme pour l'avis précédent** : aucune donnée nominative d'élève dans le dépôt, dans les tests ni dans la
documentation ; les preuves se font sur des données inventées ; rien n'est publié vers l'ancienne adresse ; et aucune
ligne de code n'est écrite avant tes réponses.
