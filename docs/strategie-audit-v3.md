# Stratégie d'amélioration après l'audit Codex V3

> Rédigé le 2026-09-09 sur **v0.12.14** (commit `ab8cb24`). Source : `audit codex/AUDIT_V3.md` (dossier hors dépôt), 5 constats reproduits + 2 contrôles positifs.
> **Aucune correction n'est appliquée par ce document.** Il dit ce qu'il faut corriger, dans quel ordre, avec quelle preuve, et ce qui demande une décision.

## 1. Ce que dit l'audit, et ce que j'en retiens

La suite passe (189 exécutions), aucun P0 ni P1 démontré. Les cinq constats sont des **P2/P3 reproduits**, pas des pannes. Mais trois d'entre eux touchent le même endroit sensible : **ce que l'application affirme avoir enregistré**.

Deux remarques d'honnêteté avant tout :

- **V3-01 est une régression que j'ai introduite la veille**, en v0.12.14, avec le champ « barème modifiable » (C15). L'audit l'a trouvée en moins d'une journée.
- **V3-05 est une incohérence que j'ai créée en croyant bien faire** : le plafond d'import de 200 Mio (A33, v0.12.14) rend non restaurable une sauvegarde que l'application accepte pourtant de produire.

Autrement dit, la moitié des constats vient des deux dernières versions. C'est le prix d'un rythme soutenu, et l'argument le plus net en faveur du filet de tests et de l'intégration continue.

**Vérification indépendante** : j'ai fait rejouer les cinq constats contre le code réel par six analyses séparées, sans droit d'écriture. **Les cinq sont confirmés**, et trois sont **plus larges** que ce que l'audit décrit. Aucun n'est réfuté.

## 2. Le fil rouge : trois familles, pas cinq bugs

Traiter les constats un par un serait une erreur. Ils se rangent en trois familles, et chaque famille se répare **à sa racine**.

### Famille A — « ✗ » ment : l'état accepté et l'état en mémoire divergent (V3-01)

Le contrat de l'application est explicite depuis la v0.12.9 : un champ refusé affiche **✗**, un message dit pourquoi, et la valeur est restaurée. Ce contrat est tenu **à l'écran** mais pas **en mémoire** : partout, le code fait

```js
objet.champ = valeur;      // l'objet partagé est déjà modifié…
await enregistrer(store, objet);   // …avant de savoir si l'écriture passe
```

Si l'écriture échoue, l'objet garde la valeur refusée. La **prochaine** écriture réussie du même objet — déclenchée par un tout autre champ — persiste alors silencieusement ce que l'utilisateur a vu refuser.

**Ce n'est pas un cas isolé.** J'ai recensé le motif sur **environ 23 sites**, dans cinq modules : fiche élève (nom, prénom, sexe, naissance, classe, statut, à savoir), fiche classe (niveau), inaptitude (type, origine, commentaire), séquence (APSA, classe, champ d'apprentissage, objectifs), évaluation (titre, date, barème), bilan de séance. Le barème est simplement le premier champ à posséder un chemin de refus assez visible pour que le défaut se voie.

La fiche **séquence** est la plus exposée : six champs restaurables y partagent le même objet, et aucun ne le relit après un échec.

**Deux sites que l'audit n'avait pas vus**, et qui relient cette famille à la suivante : le marquage « publiée » lui-même (à la copie Pronote et au marquage manuel) suit exactement le même motif. Une écriture refusée y laisse l'évaluation marquée **publiée en mémoire** ; la modification suivante persiste alors une publication qui n'a jamais eu lieu.

**Deux cas voisins, plus graves, à traiter dans le même lot** : le sélecteur de couleur d'une classe et les cases « restrictions » d'une inaptitude écrivent **sans aucun `try/catch`** — l'écriture refusée n'affiche ni « ✗ » ni message sur le champ, et la valeur reste à l'écran comme si elle était enregistrée. Le filet global attrape le rejet, mais le champ, lui, ment.

**Réparer la classe, pas le symptôme** : la mutation doit être portée par la fonction d'écriture et n'avoir lieu **qu'après** validation.

```js
const sauver = async (modifs = {}) => {
  const candidat = { ...eleve, ...modifs };
  await enregistrer('eleves', candidat);   // si ça rejette, rien n'a bougé
  Object.assign(eleve, modifs);            // l'état en mémoire suit l'état écrit
};
```
puis, sur chaque appelant : `onChange: async (v) => { await sauver({ sexe: v }); }`.

Dix-huit modifications mécaniques, cinq définitions de `sauver`, aucune nouvelle notion.

**Le modèle existe déjà dans le projet** : la saisie d’une note, elle, écrit d’abord et ne met à jour sa table en mémoire qu’après (`await enregistrer('notes', rec); notesMap.set(…)`, `notes.js`). C’est exactement l’ordre que je propose de généraliser : il ne s’agit pas d’inventer une règle, mais d’appliquer partout celle que le code applique déjà à l’endroit le plus sensible.

### Famille B — l'export Pronote promet plus qu'il ne sait (V3-02, V3-03, et le piège du barème)

Trois défauts distincts, une même cause profonde : **la colonne copiée est construite à partir d'un état intermédiaire, et l'application ne sait pas dire si ce qu'elle a copié est encore vrai.**

- **V3-02** — la colonne est bâtie depuis `notesMap`, mise à jour **après** l'écriture. Cliquer « Copier pour Pronote » pendant qu'une note s'enregistre copie l'ancienne valeur. Reproduit : copie `8`, base `9`. **L’export CSV lit la même table** (`notesMap`, trois sites : colonne Pronote, CSV, statistiques) : l’audit le soupçonnait sans l’avoir reproduit, je l’ai vérifié dans le code — il faut donc désarmer les **deux** boutons d’export, pas seulement celui de la copie.
- **V3-03** — changer le barème d'une évaluation déjà publiée conserve la marque « publiée » et n'alerte de rien. Le professeur n'apprend jamais que ce qu'il a collé dans Pronote ne correspond plus. **Plus large que le constat** : la vérification montre que **modifier, ajouter ou supprimer une note** après publication produit exactement le même silence. Ne traiter que le barème laisserait le défaut intact sur le geste le plus fréquent.
- **Le piège du barème** (contrôle positif V3-C2 de l'audit, pas un bug déclaré, mais je le classe ici) — changer /10 en /20 **conserve les points** : un 8/10 devient 8/20. Le relevé, lui, ramène toujours sur 20. La moyenne de la classe est donc **divisée par deux en silence** au moment précis où le professeur croyait corriger une erreur de saisie. C'est le champ que j'ai ajouté hier qui rend ce geste possible : je dois le rendre sûr.

### Famille C — la sauvegarde peut sortir du domaine restaurable (V3-05, V3-04 en marge)

- **V3-05** — l'application accepte des pièces de 8 Mio l'unité, sans plafond cumulé, et l'export les sérialise en base64 (**+33 %** exactement : 6 Mio mesurés → 8 388 608 caractères). L'import, lui, refuse au-delà de 200 Mio depuis la v0.12.14. Le domaine restaurable s'arrête donc autour de **150 Mio de pièces réelles**, soit **environ 18 pièces au plafond**. Au-delà, l'application produit une sauvegarde qu'elle ne sait plus relire — et c'est cette sauvegarde qui sert de filet avant la purge de rentrée. Le commentaire que j'ai écrit hier dans le code (« une sauvegarde complète avec pièces pèse quelques dizaines de Mo ») est une **hypothèse fausse au-delà d'une vingtaine de pièces** : pas une erreur de calcul, une hypothèse de conception jamais vérifiée.
- **V3-04** — le démarrage instantané livré hier (A39) ne couvre que la clé d'URL exacte. Une adresse avec paramètre (`?depuis=favori`, un lien partagé, un favori enregistré) retombe sur une attente réseau **non bornée** : 4 101 ms mesurées sur un réseau ralenti de 4 s. La cause est la même que celle qu'A39 devait supprimer, sur un chemin voisin. Un seul point de code est en cause, mais il couvre toute une classe d'adresses. Le lancement normal de l'application installée n'est **pas** touché (son adresse de départ est précachée telle quelle) : la priorité basse est justifiée, et le correctif est d'autant plus tranquille qu'une copie corrigée passe les 13 tests de service-worker existants.

## 3. Plan en six lots

Chaque lot suit la discipline du projet : reproduction → test qui échoue → correctif minimal → test ciblé → suite complète → revue adversariale du diff → déploiement.

| Lot | Contenu | Pourquoi à ce rang | Preuve attendue | Taille |
|---|---|---|---|---|
| **V3-A** | **Famille A** : `sauver(modifs)` dans les 5 modules, 18 appelants convertis. | C'est la fondation : tant que l'état en mémoire peut diverger de l'état écrit, toute correction posée au-dessus est bâtie sur du sable. | Panne injectée sur un champ, puis modification d'un **autre** champ du même objet : la valeur refusée ne doit jamais apparaître en base. Un test par module. | 5 fichiers, ~5 tests |
| **V3-B1** | **V3-02** : compter les écritures en vol ; désarmer « Copier pour Pronote » et « Exporter CSV » tant qu'une note s'enregistre, avec un état visible. | Une colonne fausse collée dans Pronote est la faute la plus coûteuse de l'application : elle sort de l'outil et devient une note d'élève. | Transaction tenue ouverte + interception de `writeText` : l'export est indisponible pendant l'écriture ; après validation, le texte copié vaut la nouvelle note. | 1 fichier, 2 tests |
| **V3-B2** | **V3-03** : marquer une évaluation « à remettre à jour » quand ce qui a été copié change après publication (barème, notes, effectif), l'afficher et la remonter dans les alertes ; la marque s'efface à la copie suivante. | Complète V3-B1 : l'un empêche de copier faux, l'autre prévient quand ce qui a été copié n'est plus vrai. | Évaluation publiée, barème modifié → badge « à remettre à jour » + alerte ; nouvelle copie → marque effacée. | 2 fichiers, 3 tests |
| **V3-B3** | **Piège du barème** : au changement de barème, demander explicitement quoi faire des notes déjà saisies — **conserver les points** ou **convertir proportionnellement**. | Le geste est nouveau (hier) et sa conséquence est invisible. Mieux vaut le rendre sûr avant qu'il ne serve. | 8/10 → barème /20 : « conserver » donne 8/20 et « convertir » donne 16/20, dans les deux cas annoncé avant d'agir. | 1 fichier, 2 tests |
| **V3-C1** | **V3-05** : afficher sur l'écran Sauvegarde le **poids projeté de l'export** (on dispose déjà de `tailleFichiers()`), avertir quand il approche puis dépasse la limite restaurable, et **avertir avant la purge** si la sauvegarde de sécurité ne serait pas réimportable. | Un filet de sécurité dont on ne sait pas qu'il est troué est pire que pas de filet. L'affichage coûte peu et supprime le pire scénario : purger en confiance. | Base garnie au-delà du seuil → l'écran l'annonce, et la purge le rappelle avant la double confirmation. | 2 fichiers, 3 tests |
| **V3-D** | **V3-04** : pour une navigation de même origine dans la portée de l'app, servir le shell `index.html` du cache **sans attendre le réseau**, puis revalider. | Petit correctif, même famille que A39, à faire pendant que le service-worker est frais. | Service-worker réel + serveur ralenti : la navigation avec paramètre aboutit sans attendre les 4 s. | 1 fichier, 1 test |

**Deux lots supplémentaires, hors correctifs :**

- **V3-E — réconciliation documentaire.** L'audit relève un TODO qui dit encore « lot 2 en attente de go », des mentions de l'intégration continue et d'A39 « à faire », et un décompte mobile de 25 au lieu de 24. Ces lignes sont mortes depuis les livraisons d'hier. À nettoyer d'un bloc, en dernier, comme toujours (une documentation recalée trop tôt se contredit à la livraison suivante).
- **V3-F — le filet qui aurait dû exister.** Chaque lot ci-dessus ajoute son test, mais l'audit signale surtout ce que la suite **ne regardait pas** : la cohérence entre l'objet en mémoire et la base après un échec, et la validité de ce qui part vers Pronote. Ces deux familles méritent une garde générique, pas seulement un test par cas.

## 4. Ordre d'exécution et raison de cet ordre

1. **V3-A** d'abord, seul, dans sa propre version. C'est une correction de classe qui touche cinq modules : elle doit être isolée pour être relisible et annulable.
2. **V3-B1 + V3-B2 + V3-B3** ensuite, ensemble : ils forment la cohérence de l'export Pronote et se testent avec le même matériel.
3. **V3-C1 + V3-D** enfin : périmètres indépendants, faible risque.
4. **V3-E** au moment de la dernière livraison.

Ce découpage donne **trois versions** (v0.12.15, v0.12.16, v0.12.17), chacune déployable et vérifiable sur le téléphone.

## 5. Ce qui demande ta décision

Quatre points changent un comportement visible. Je les recommande, mais je ne les code pas sans ton accord.

| # | Question | Options | Ma recommandation |
|---|---|---|---|
| 1 | **V3-B2** — que signifie « publiée » quand les notes changent ensuite ? *(vérification : un avis est bien requis — cela change le sens d'une décision actée, D011, et fait réapparaître des alertes sur des évaluations closes)* | (a) garder le sens actuel (preuve de copie, historique) et ajouter un état distinct « à remettre à jour » ; (b) effacer la marque à chaque modification. | **(a)** : la date de copie est une trace, elle ne doit pas disparaître ; l'obsolescence est une information de plus, pas une gomme. |
| 2 | **V3-B3** — au changement de barème, que deviennent les notes saisies ? | (a) demander à chaque fois (conserver / convertir) ; (b) convertir d'office ; (c) conserver d'office avec un avertissement clair. | **(a)** : c'est le seul cas où l'application ne peut pas deviner l'intention, et le seul où se tromper coûte une moyenne de classe. |
| 3 | **V3-C1** — que fait-on quand une sauvegarde dépasse la taille restaurable ? *(vérification indépendante : même recommandation — avertir plutôt que relever le plafond)* | (a) avertir seulement ; (b) avertir et bloquer la purge tant que la sauvegarde n'est pas restaurable ; (c) relever le plafond d'import. | **(a) + un avertissement renforcé avant la purge**. Pas **(c)** sans mesure sur ton Android : charger 300 Mo en mémoire sur un téléphone est exactement ce que le plafond évitait. |
| 4 | **Cadre général** — jusqu'où aller maintenant ? | (a) V3-A seul ; (b) V3-A + famille B ; (c) tout le plan. | **(b)** puis **(c)** : les deux premières versions traitent ce qui peut fausser une note d'élève ; le reste peut suivre à ton rythme. |

## 6. Critères de sortie, lot par lot

- **V3-A** — sur les cinq modules : après un refus d'écriture, modifier un autre champ du même objet ne fait jamais apparaître la valeur refusée, ni à l'écran, ni en base, ni après rechargement.
- **V3-B1** — l'export est indisponible pendant une écriture, l'état est visible, et la copie qui suit contient la dernière valeur validée. La copie reste possible sans perdre l'activation utilisateur de Chrome (sinon l'app bascule sur le repli textarea : piège déjà rencontré).
- **V3-B2** — modifier le barème ou une note d'une évaluation publiée la fait apparaître « à remettre à jour » sur la fiche et dans les alertes ; une nouvelle copie prouvée efface l'état.
- **V3-B3** — les deux issues sont proposées, annoncées avec leur effet chiffré, et la garde existante (refus d'un barème inférieur à une note saisie) reste vraie dans le mode « conserver ».
- **V3-C1** — le poids projeté est affiché, l'alerte apparaît au franchissement, et la purge rappelle explicitement que la sauvegarde de sécurité ne serait pas réimportable.
- **V3-D** — une URL d'entrée de l'app avec paramètre démarre depuis le cache sur réseau lent ; les replis hors ligne (503, 504, index.html) restent inchangés.

## 7. Ce que cette passe ne couvre pas

L'audit le dit lui-même, et je le reprends sans l'atténuer : Android physique, clavier et caméra réels, collage dans un vrai Pronote, impression papier, revue d'accessibilité exhaustive, audit juridique, migration de schéma en conditions réelles. **La fiche `docs/test-terrain.md` reste le seul moyen de vérifier ces points, et elle attend toujours une session de 15 minutes sur ton téléphone.** Deux des cinq constats de cet audit portent sur des situations (stockage plein, réseau très lent) que seul l'appareil réel sait produire pour de bon.

Restent aussi ouverts, indépendamment de cet audit : **A01** (origine partagée, ta décision) et l'**avis sur les grilles d'évaluation** (`docs/avis/AVIS_GRILLES_EVALUATION.md`, ta décision). L'audit note d'ailleurs pour les grilles un point que j'avais déjà écrit dans l'avis : le total brut doit être conservé et la conversion explicitée — le champ barème actuel, lui, ne convertit rien.
