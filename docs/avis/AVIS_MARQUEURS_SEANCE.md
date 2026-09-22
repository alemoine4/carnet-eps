# Avis — marqueurs de séance (rôles, comportement, équipes) et informations chiffrées

**Rédigé le 2026-09-17 · révisé le 2026-09-22 (contre-vérification Codex, puis fait nouveau « aucune donnée ») · en
attente de décision · aucune ligne de code écrite à ce jour**

Demande : « ET POUR METTRE DES INFOS comme score, groupe etc ? », puis « système de pastilles par exemple pour des
rôles dans la séance ou pour comportement… ». Référence citée : les badges d'iDoceo.

**Historique.** La première version (commit `44b071c`) reposait sur dix lecteurs du dépôt, trois conceptions
concurrentes et six juges. Elle a été contre-vérifiée par un audit Codex indépendant, qui a exécuté des diagnostics sur
données fictives (`audit codex/AUDIT_V7_AVIS_MARQUEURS.md`, hors suivi Git). Verdict de cet audit : orientation
raisonnable, mais pas encore un contrat d'implémentation. **Trois risques majeurs y étaient absents** (§4.2), plusieurs
formulations étaient trop absolues, et une coquille figurait dans un exemple de code. Cette version les corrige. Les
références de ligne seront à rafraîchir au moment d'implémenter.

---

## 1. Ce qui existe aujourd'hui, et ce qui manque

| Besoin | Ce qui existe déjà | Limite réelle |
| --- | --- | --- |
| Score chiffré | Évaluation « Barème personnalisé » (jusqu'à /200) | **c'est une note** : une seule valeur par élève et par évaluation (trois essais = trois colonnes), comptée dans la moyenne et proposée à la copie Pronote. « 138 secondes » y devient « 138/200 ». Un coefficient 0 l'exclut de la moyenne, **pas** de la copie Pronote |
| Score non numérique (« 2'18 ») | Évaluation « AFL / positionnement », texte libre | hors moyenne et hors Pronote, mais présente dans le CSV du relevé ; aucun calcul possible (ni tri, ni record) |
| Équipe, atelier | La même colonne AFL intitulée « Équipe » | détournement manuel, rattaché à **une séquence** ; **absente de l'écran d'appel** |
| Mot du jour sur un élève | `appels.commentaire` : texte libre **par élève ET par séance**, sur l'écran d'appel (feuille `⋯`) | un élève à la fois, au clavier ; ni compté, ni structuré |
| Comportement | **Observations typées** de la fiche élève (Engagement, Comportement, Coopération…) | un élève à la fois, depuis sa fiche ; le champ `observations.seanceId` existe mais vaut encore `null` |
| Rôle tenu, comportement rapide | **aucun marqueur structuré de séance** | — |
| Groupe stable dans une classe | aucune structure (`eleves.classeId` est un champ unique) | — |

Deux remarques qui pèsent sur la suite : la saisie compacte « un élève par écran » (v0.13.4) n'existe que pour le type
**grille** ; et le relevé d'une classe affiche toutes les évaluations de toutes ses séquences, sans filtre de période.

## 2. Calendrier : la fenêtre « zéro donnée »

Restaurer une sauvegarde **remplace tout** : chaque magasin est vidé puis réécrit, sans fusion (vérifié par exécution
dans la contre-vérification : une classe et un réglage créés sur la destination disparaissent à l'import). Les
sauvegardes des schémas 2 et 3 restent restaurables.

**Fait nouveau du 2026-09-22 : l'enseignant n'a aucune donnée saisie.** La condition « finir la migration d'abord »
tombe : il n'y a rien à transférer, donc plus rien à attendre. L'avertissement ci-dessus ne redeviendra vrai qu'une fois
ses vraies classes saisies — à ce moment-là, ne jamais importer une ancienne sauvegarde par-dessus.

**En échange, une fenêtre s'ouvre, et elle est datée.** Tous les coûts de format que cet avis cherchait à éviter — une
montée de schéma sans retour arrière, des sauvegardes refusées par les versions installées — se paient **en données
existantes**. Ils valent zéro aujourd'hui, et le jour où la première classe est saisie, ils reviennent intacts. Tout ce
qui touche au FORMAT doit donc être décidé et écrit **avant** les premières vraies données, pas au moment de livrer le
module (voir la question 18).

## 3. Ce qu'est un marqueur (proposition)

Un objet défini par toi, dont le rôle, le comportement et l'équipe seraient des variantes :

```js
{ cle: '…', libelle: 'Arbitre', court: 'ARB', couleur: 'bleu', genre: 'role', archive: false }
```

- `court` : 1 à 3 caractères, **obligatoire** et **distinct** d'un marqueur à l'autre — il porte l'information quand la
  couleur ne suffit pas ;
- `couleur` : un des huit **noms** de couleur déjà définis pour les grilles, jamais un code hexadécimal ;
- `genre` : `role`, `comportement` ou `groupe`. L'exclusivité des groupes est **à décider** : globale (une seule
  « équipe » à la fois), ou par famille (une équipe ET un atelier) — question 6 ;
- **archiver plutôt que supprimer**, comme les grilles ; **renommer** garde la clé, donc change la lecture de tout
  l'historique. Proposition : renommer sert à corriger une faute ; **changer de sens exige une nouvelle clé**
  (question 13).

## 4. Où il vivrait, et ce que cela impose

### 4.1 Le modèle

Un champ facultatif sur l'enregistrement d'appel **qui existe déjà**, un par élève et par séance :

```js
{ id: `${seanceId}_${eleveId}`, seanceId, eleveId, statut, minutesRetard, commentaire,
  marqueurs: ['<cle>', …] }   // absent = aucun marqueur
```

La liste des marqueurs disponibles irait dans le magasin `meta`, comme les autres réglages. **Aucun nouveau magasin ni
index n'est nécessaire, donc pas de montée du schéma IndexedDB** — une base passée au schéma 4 ne revient plus en
arrière, et ses sauvegardes seraient refusées par les versions installées.

⚠️ **Ce choix est à rouvrir**, et c'est l'objet de la question 18 : son seul motif est un coût qui se paie en données
existantes, donc nul tant que rien n'est saisi. Un magasin dédié donnerait au contraire l'écriture atomique et la
validation que ce modèle-ci doit écrire à la main (§4.2, risque 3).

### 4.2 Trois risques majeurs que la première version n'avait pas vus

1. **Garder le schéma 3 ne suffit pas à garantir la compatibilité.** La v0.13.4 importe sans broncher une sauvegarde
   qui contient des marqueurs, puis les **perd au premier changement de statut** : `definirStatut` reconstruit
   l'enregistrement champ par champ, et tout champ qu'elle ne connaît pas disparaît (reproduit par exécution). Il faut
   donc distinguer trois compatibilités — base IndexedDB, sauvegardes, écritures du code — et poser une règle : **tous
   les appareils doivent être passés à une version qui connaît les marqueurs avant d'en poser un seul**, et une
   sauvegarde qui en contient ne doit jamais être restaurée dans une version plus ancienne. L'ancienne adresse, en
   schéma 2, ne peut de toute façon pas lire le schéma 3.
2. **Poser un marqueur ne doit pas valider un appel en douce.** Tout enregistrement d'appel compte comme « saisi », et
   le modèle exige un statut. Poser « Arbitre » sur un élève pas encore appelé créerait sa présence. Proposition pour
   un premier lot : **un marqueur ne se pose que sur un élève dont le statut est déjà choisi** (question 14). Correction
   d'une coquille de la première version : la fonction d'inaptitude reçoit un identifiant, `statutInapte(eleve.id)`, et
   non l'objet élève.
3. **Deux vues ouvertes peuvent s'effacer l'une l'autre.** `definirStatut` part de l'état gardé par SA vue, puis
   remplace l'enregistrement entier. Ajouter une ligne d'héritage ne suffit donc pas : une vue restée ouverte sur un
   état ancien effacerait un marqueur posé ailleurs. Il faut une écriture **atomique** : relire l'appel dans la
   transaction et appliquer « ajouter / retirer cette clé » en préservant statut, retard et commentaire. Même exigence
   pour le vocabulaire dans `meta`, aujourd'hui écrit comme une valeur entière. Le dépôt a déjà ce motif pour les
   évaluations.

## 5. Le geste au gymnase

- **(a) Par la feuille `⋯` de l'élève**, sans mode : une rangée de marqueurs dans la feuille qui existe déjà. Environ
  trois gestes par élève (estimation, à mesurer). Elle n'échappe pas aux risques du §4.2, qui sont traités dans le
  modèle, pas dans le geste.
- **(b) Mode « tampon »** : on touche « Arbitre », puis chaque tap sur un élève pose ou retire ce marqueur au lieu de
  faire tourner le statut. C'est le gain réel, et le seul danger propre au geste : tant que le mode est armé, le tap ne
  fait plus l'appel.

Recommandation : **(a) pour un premier lot ; (b) seulement après un essai sur le terrain.** Si (b) est retenu un jour :
fond de grille distinct, libellé permanent dans la barre, sortie par Échap, raccourcis clavier de statut suspendus, nom
accessible de chaque carte qui dit ce que fera le tap, et annonce propre à la pose (pas l'annonce d'un statut).

### Alternative à considérer

Si le besoin réel est surtout « noter un comportement sans faire l'appel », une **observation rapide rattachée à la
séance** l'éviterait : le champ `observations.seanceId` est déjà réservé. Elle ne résout ni le risque de présence
implicite des rôles, ni les équipes exclusives, et demanderait son propre cadrage — mais elle ne crée aucun nouveau
format de données (question 9).

## 6. Premier lot réellement utilisable

La première version promettait tout dans le même lot (§6) tout en le découpant en trois (§9) : c'était contradictoire.
Un premier lot doit au minimum comprendre :

- **poser et retirer** un marqueur, par la feuille, sur un élève déjà appelé ;
- le **relire** : codes courts sur la carte (ligne dédiée, avec réserve pour les signaux 🩺 et ⚠ déjà présents en bas à
  droite), et comptes dans le bilan de séance ;
- des **erreurs d'écriture visibles et durables** ;
- la **sauvegarde et la restauration** (avec les règles du §4.2) ;
- la **lisibilité au téléphone** : 320 px, texte à 200 %, lecteur d'écran.

Reportables **si tu l'acceptes** : historique et cumuls sur la fiche élève, colonne du récapitulatif de classe, CSV de
séance (il n'existe pas aujourd'hui), impression, mode tampon, reprise de la séance précédente.

Le chiffrage (durées, nombre de tests) sera fait après tes réponses, à partir des garanties à prouver — pas avant.

## 7. Le score chiffré reste hors des marqueurs

Séparer mesures et marqueurs est un **choix de produit**, pas une impossibilité technique : on pourrait ajouter un
champ, mais une performance EPS, c'est plusieurs essais, un record, une progression, et parfois une conversion en note.

- **Aujourd'hui** : une colonne AFL stocke « 2'18 » sans toucher à la moyenne ; une évaluation à barème est une **note**,
  avec ses effets (moyenne, copie Pronote). Un coefficient 0 **n'est pas** un type « information » : il retire de la
  moyenne, pas de la copie Pronote.
- **Plus tard, si tu le demandes** : un type d'évaluation « Mesure » (unité, sens meilleur = petit ou grand, essais,
  meilleur résultat, conversion éventuelle) — chantier distinct (question 11).

## 8. Équipes : séance, séquence ou classe ?

Un marqueur de genre `groupe` posé sur l'appel vit **une séance**. Une équipe de volley dure six semaines : la reprendre
chaque séance demande une « reprise de la séance précédente », qui doit définir le sort des absents, des nouveaux
inscrits, des élèves partis et des marqueurs archivés. Recopier des rôles peut servir ; recopier « À recadrer »
automatiquement, non.

Une composition portée par la **séquence** ou par la **classe** survivrait à la séance, mais c'est un autre stockage.
L'avis « carnet de classe à onglets » propose des champs sur `classes`, alors que les marqueurs vivraient sur `appels` :
**le lien de décision est réel, l'identité de stockage ne l'est pas.** À trancher avec la question 6.

## 9. Pièges vérifiés dans le code

1. `definirStatut` reconstruit l'enregistrement : un champ ajouté sans héritage est perdu (reproduit) — et l'héritage
   seul ne protège pas des vues concurrentes (§4.2).
2. `--niv-vert` a exactement la valeur de `--stb-present`, et `--niv-turquoise` celle de `--stb-inapte`. La carte ayant
   un fond de surface et une bordure colorée, l'illisibilité n'est **pas** démontrée ; le risque est une **confusion de
   sens**. Remède : codes courts, forme distincte, contraste vérifié — pas une interdiction de principe.
3. `.pastille` est déjà pris dans le CSS (le rond de couleur d'une classe) : classe dédiée aux marqueurs.
4. La carte d'élève **rogne** ce qui dépasse, et les signaux 🩺 et ⚠ occupent **la même zone en bas à droite** : prévoir une
   ligne réservée et une règle de débordement (« ARB CAP +2 »).
5. Les raccourcis clavier de statut resteraient actifs dans un mode tampon : à suspendre, avec une sortie au clavier.
6. `definirStatut` annonce un statut à chaque écriture : une pose de marqueur doit avoir sa propre annonce, y compris
   en cas d'échec.
7. Tout enregistrement d'appel compte comme « saisi », et le modèle exige un statut (§4.2, point 2).
8. Le magasin `meta` est contrôlé à l'import (clé présente, pas de doublon), et l'écran de restauration avertit déjà du
   remplacement global. Ce qui manque : **la validation de la valeur du vocabulaire et de ses références**, et une
   information dédiée quand un vocabulaire est remplacé. Une sauvegarde sans marqueurs doit rester valide (absence =
   aucun marqueur), et une référence orpheline doit avoir une règle d'affichage.
9. Le service-worker liste ses fichiers à la main : un nouveau module doit y figurer pour garantir le **premier** accès
   hors ligne.
10. Recouvrement avec les **observations**, qui ont déjà un vocabulaire de comportement : décider de la coexistence et
    éviter tout double comptage (question 9).
11. La suppression d'une séance ou d'un élève supprime ses appels, donc ses marqueurs et les cumuls qui en dépendent :
    l'archive du vocabulaire ne les protège pas (question 16).

## 10. Recommandation

1. **Mettre les deux appareils (PC et téléphone) sur la version en ligne aujourd'hui**, et le vérifier sur chacun : la
   perte silencieuse démontrée par l'audit vient d'un appareil resté sur une ancienne version, pas d'une vieille
   sauvegarde. C'est gratuit tant qu'il n'y a aucune donnée.
2. **Décider maintenant tout ce qui touche au FORMAT** (question 18), même si le module est livré plus tard : cette
   fenêtre se referme à ta première classe saisie.
3. **Premier module** : marqueurs **de séance**, posés par la feuille `⋯` **et** par un mode tampon (armer un marqueur,
   taper les élèves), sur un élève **déjà appelé** ; la reprise de la séance précédente comprise ; les mesures hors du
   module ; aucune sortie (ni impression ni CSV) dans ce premier lot.
4. **Écritures atomiques obligatoires** (relire l'appel dans la transaction, appliquer « ajouter / retirer une clé »),
   validation du vocabulaire, règle écrite pour une référence orpheline. Si la question 18 est acceptée, un magasin
   dédié donne l'atomicité et la validation sans effort ; sinon, il faut les écrire à la main sur `appels` et `meta`.
5. Ne pas détourner le coefficient 0 en type « information », et ne pas interdire des couleurs par principe.

## 11. Décisions à prendre — avec ma réponse recommandée

Réponds par numéros (« 1 oui · 2 non… »), ou dis « je te suis » pour prendre toutes les recommandations. Elles ont été
éprouvées par trois juges indépendants (professeur d'EPS au gymnase, modèle de données, premier lot minimal) ; les
points où ils m'ont fait changer d'avis sont signalés **↺**.

| № | Question | Ma réponse |
|---|---|---|
| 1 | **Portée** : rôles de séance seulement, ou aussi fonctions permanentes ? | **Séance seulement.** Une fonction permanente (délégué) et une dispense à l'année relèvent d'autres écrans. |
| 2 | **Cumul et exclusivité** : plusieurs marqueurs à la fois ? les équipes s'excluent-elles ? | **Cumul libre, et aucune exclusivité automatique dans le premier lot** ↺. Poser « Éq. 2 » n'enlèvera pas « Éq. 1 » : deux équipes affichées se voient et se corrigent. L'exclusivité viendra avec un champ `famille` (un mot libre : équipe, atelier), si l'usage le réclame. |
| 3 | **Le geste** : feuille de l'élève, mode tampon, ou l'un puis l'autre ? | **Les deux dans le premier lot** ↺. Sans le tampon (armer « Arbitre », taper six élèves), la fonction ne sert pas : par la feuille, six arbitres coûtent une vingtaine de gestes. Le seul risque du mode — un tap qui ne fait plus l'appel — ne coûte aujourd'hui aucune donnée. |
| 4 | **Combien de marqueurs** affichés, et au total ? | **Deux codes sur la carte puis « +n »** ↺, et une liste courte (6 à 8 vraiment utilisés), les derniers utilisés en tête. Pas de plafond codé en dur. |
| 5 | **Alerte** : un ⚠ au bout de trois « À recadrer » ? | **Non, lecture seule** pour le premier lot. Un seuil exige une fenêtre de calcul et une règle de visibilité : c'est un chantier à part. |
| 6 | **Équipes** : séance, séquence ou classe ? | **À la séance, avec « reprendre les marqueurs de la séance précédente » dans le même lot** ↺ — sans la reprise, reposer 30 élèves chaque semaine ne se fait pas. La reprise ne recopie que les groupes et les rôles, jamais un comportement, et seulement pour les élèves déjà appelés. |
| 7 | **Sur la carte d'élève** : codes courts ou repère discret ? | **Codes courts pour les rôles et les équipes** ; les comportements suivent la règle 10. |
| 8 | **Sorties** : impression et CSV ? | **Aucune sortie dans le premier lot** ↺ (c'est la première chose qui ne servirait pas). Quand elles viendront : les rôles oui, les comportements non. |
| 9 | **Marqueurs et observations** | **Ils coexistent**, rien n'est converti. Dit franchement : les observations de comportement serviront moins, le marqueur étant plus rapide. |
| 10 | **Visibilité des comportements** | **Pas de code sur la carte, mais un repère neutre** ↺ (même forme pour tous, sans couleur parlante) : sinon tu ne sais pas si ton tap a pris. Le sens n'apparaît que dans la feuille de l'élève. |
| 11 | **Score chiffré** | **Rester sur la colonne « AFL / positionnement » en texte libre** ↺ — pas le barème, qui est une vraie note (moyenne, copie Pronote). Le type « Mesure » reste un chantier distinct, pour sa complexité propre. |
| 12 | **Priorité** : marqueurs ou carnet à onglets d'abord ? | **Les marqueurs d'abord** ↺. Le carnet à onglets est une fonction de LECTURE : sur un carnet vide, il afficherait des colonnes vides jusqu'en janvier. Les marqueurs écrivent les données qu'il lira. |
| 13 | **Renommer un marqueur** | Renommer corrige une faute ; changer de sens demande un nouveau marqueur. **C'est une discipline, pas une garantie** : l'application ne peut pas distinguer les deux. |
| 14 | **Un marqueur peut-il valider une présence ?** | **Non** — mais avec un chemin praticable ↺ : « tous présents » en un geste à l'ouverture de la séance, puis les marqueurs ; et un refus explicite (« pas encore appelé ») plutôt qu'un tap sans effet. |
| 15 | **Compter plusieurs fois** le même comportement dans une séance ? | **Non dans l'usage**, mais **le format stockera dès le départ de quoi compter** ↺ : sinon, le jour où tu le voudras, il faudra migrer des données existantes. |
| 16 | **Que reste-t-il** après retrait, archivage, suppression de séance ? | Retrait : disparaît. Archivage du vocabulaire : l'historique reste lisible. Séance supprimée : ses marqueurs partent avec elle (comme les appels). **Et une référence orpheline s'affiche en gris avec son code, sans jamais provoquer d'erreur** ↺. |
| 17 | **Quelles versions doivent rester compatibles ?** | La règle ne doit pas reposer sur ta mémoire ↺ : **le code doit refuser ou préserver**. La garantie la plus simple est la question 18. En attendant : mettre les deux appareils à jour aujourd'hui. |
| **18** | **Nouvelle question — profiter de la fenêtre « zéro donnée » ?** Faire les marqueurs dans un **magasin dédié** avec montée du schéma (`DB_VERSION` 4), au lieu d'un champ ajouté sur l'appel et d'un vocabulaire dans les réglages. | **Oui, et seulement si c'est décidé avant ta première classe saisie.** Le magasin dédié donne gratuitement l'écriture atomique et la validation que l'autre solution n'a pas (§4.2), et une version ancienne **refuse d'ouvrir** la base au lieu d'effacer les marqueurs en silence. Le prix — pas de retour en arrière — se paie en données : il vaut zéro aujourd'hui, et redevient cher dès ta première classe. |

**Si tu me suis sur tout** : « je te suis », et je rédige l'avis de format (le contrat d'implémentation) avant d'écrire
la moindre ligne de code. Les deux seules réponses qui changent vraiment le chantier sont la **12** (par quoi on
commence) et la **18** (le format, qu'il faut figer maintenant).

---

**Garde-fous** : aucune donnée nominative d'élève dans le dépôt, dans les tests ni dans la documentation ; preuves sur
données inventées ; rien n'est publié vers l'ancienne adresse ; aucune ligne de code avant tes réponses.
