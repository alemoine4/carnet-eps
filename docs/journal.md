# Journal de bord — Carnet EPS

Une entrée par session de travail, la plus récente **en haut**. C'est la mémoire fine du projet (le CHANGELOG ne garde que l'essentiel).

Modèle d'entrée :

```md
## AAAA-MM-JJ — titre court
**Fait** : …
**Décidé** : … (reporter dans decisions.md si structurant)
**Coincé / à vérifier** : …
**Prochaine étape** : …
```

---

## 2026-09-24 (48) — B20 instable en intégration continue : un vrai vol de focus
**Fait** : en surveillant la CI de la v0.14.1 (`afbec3c`, verte), la liste des passages a montré que celle du commit
`dc7e359` (documentation de la publication de la v0.14.0, 2026-09-23) était ROUGE : un seul test, **B20 sur le profil
mobile** (« changer un select sur la fiche élève re-rend la vue sans perdre le focus »), focus attendu sur `f-actif`, trouvé
sur `vue`. Aucun code applicatif changé depuis le passage vert précédent : test instable, que je n'avais pas vu passer.
**Diagnostic** : la fiche élève insère sa carte d'identité (dont `#f-actif`) puis lit l'historique (`parIndex('appels')`,
séances, séquences, trimestres…) ; `afficherVue` donne le focus à `#vue` à la FIN du rendu. B20 posait son focus dès que
`#f-actif` existait : sur une machine lente, `#vue` le reprenait, et `rerendre` relisait « vue ». **Reproduit de façon
déterministe** (spec temporaire `_b20`) en tenant une transaction `readwrite` sur `appels` pendant la navigation :
prémisse assertée (rendu inachevé au moment du focus), même message que la CI, sur les deux profils.
**Décidé** : B20 attend la fin du rendu (focus sur `#vue`) avant de poser le sien — il prouve `rerendre`, sur une vue au
repos ; mutant « `rerendre` ne rend plus le focus » tué sur les deux profils ; B20 ×5 sur chaque profil, 10/10 verts. Le
**défaut réel** (le focus que l'enseignant pose pendant un chargement lui est repris) est consigné dans `TODO.md` avec sa
recette : il touche `afficherVue`, donc toutes les vues, dont plusieurs posent elles-mêmes un focus — pas de correctif de
dernière minute dans la v0.14.1.
**Prochaine étape** : CI verte sur ce commit, puis « go » de publication de la v0.14.1.

## 2026-09-24 (47) — v0.14.1 : revue adversariale, 8 constats corrigés avant commit

Demande : corriger les 8 constats retenus par la revue adversariale de la v0.14.1 (R1 à R8), sans toucher au format
(`io.js`, `marqueurs-calcul.js`) ni aux textes provisoires (`#mq-bientot`, carte « Plus »). **Ni commit, ni publication.**

**Fait** :
- **R1** : `#mq-court` n'est plus réécrit pendant la frappe (un clavier qui compose le mot doublait les lettres : « arb » →
  « AARARB »). Majuscules affichées par `text-transform`, appliquées par `toLocaleUpperCase('fr')` dans l'aperçu et à
  l'enregistrement.
- **R2 + R6** : l'aperçu d'un marqueur rangé « Comportements » (genre absent ou inconnu compris) rend le repère `.mq-neutre`,
  sans texte, et « un repère neutre, sans code ; le sens reste dans la feuille de l’élève. », dans le formulaire et sur les
  cartes de la liste. Règle `.mq-neutre` du §7 point 3 livrée, avec `display: inline-block` en plus (hors rangée flex).
  Ambiguïté du §6.5 (« aperçu `.mq-code` identique ») tranchée par la décision 10, consignée au §16 du contrat.
- **R3** : `retenirFocus` — après `basculerArchive` et après la branche « Des marqueurs existent déjà », si le focus a quitté
  la vue, il va au bouton « Archiver / Restaurer » du marqueur traité, sinon à « Nouveau marqueur ».
- **R4, R5, R7, R8** : preuves ajoutées à MQ-18 (vue périmée) et MQ-19 (restauration refusée puis réussie, archivés en
  dernier, mention sur chaque carte du groupe, focus au clavier). **MQ-20** créé (majuscules par composition CDP, aperçu).
- Docs : contrat §6.5 (renvoi), §11.2 (MQ-18, MQ-19 élargis ; MQ-20), §13, §16 « Revue de la v0.14.1 » ; README (5 tests,
  total 310 / 302), CHANGELOG, TODO, `docs/deploiement.md`. Campagne : mutants M71 à M77 avec variantes (14 de plus).

**Résultats** : `node --check` OK ; `marqueurs.spec.mjs` 5/5 (chromium) ; suite complète au premier passage **397/397**
(310 + 87 rejoués sur le projet mobile) ; campagne `mutants-v0141.mjs` relancée en entier : contrôle sain vert (6 verts),
**28 mutants, 28 tués par leur test** (M06, M31, M35, M51, M63 à M70 et variantes ; M71 à M77 et variantes).

**Vérifié par moi ensuite (2026-09-24)** : suite complète relancée, **397/397** ; campagne relancée en entier, 28/28 tués,
arbre de travail identique avant et après ; format intact (`io.js`, `marqueurs-calcul.js` sans diff). **Regardé à l'écran**
(captures d'éléments en Pixel 7 émulé, clair et sombre — les captures du panneau intégré restent figées sur ce PC) : deux
défauts qu'aucun test ne voyait. (1) Dans le formulaire d'un comportement, « Sur la carte : » restait seul à droite du champ,
et le repère partait à la ligne avec sa phrase : l'aperçu formait un bloc `inline-flex` dans la rangée qui passe à la ligne,
et la phrase l'emportait. Correction : `.mq-apercu { display: contents }`, ses nœuds sont rangés un à un ; seule la phrase
passe à la ligne. Preuve ajoutée à MQ-20 : à 360 px sur les deux profils (la phrase n'y tient jamais à côté du repère,
quelle que soit la police — prémisse assertée), le milieu du repère est dans la hauteur de l'étiquette et la phrase part du
bord gauche du champ. **M78** (l'aperçu refait bloc) tué par MQ-20. (2) La mention provisoire `#mq-bientot` était centrée
(`.note-discrete`) sous un paragraphe aligné à gauche ; en `.note-inline`, `.carte p` l'écrasait et elle se lisait comme la
suite du paragraphe. Classe `.mq-provisoire` (espace au-dessus, texte plus petit), retirée en v0.14.2 avec le texte ; pas de
test pour un alignement qui disparaît à la version suivante.

**Prochaine étape** : relecture et « go » de commit puis de publication ; puis v0.14.2.

---

## 2026-09-24 (46) — v0.14.1 candidate : marqueurs de séance, le vocabulaire

Demande : implémenter la **v0.14.1** du contrat `docs/avis/AVIS_FORMAT_MARQUEURS.md` (§6.5, §13), avec l'amorçage (§14,
réponse 5) et les doublons lisibles (§16, revue de la v0.14.0, point 2). **Ni commit, ni publication.** Format figé : aucun
changement de `DB_VERSION`, de `ecrireMarqueur` ni de la validation des sauvegardes.

**Fait** :
- `app/js/modules/marqueurs.js` (nouveau) : routes `#/marqueurs`, `#/marqueurs/nouveau`, `#/marqueurs/modifier/<id>`. Liste :
  carte d'introduction (texte du §6.5), « Nouveau marqueur », vocabulaire groupé par genre dans l'ordre `GENRES`, archivés en
  dernier, aperçu `.mq-code` ; « Modifier », « Archiver » / « Restaurer » (refus en toast), aucune suppression. Formulaire :
  libellé (40), code court (3, majuscules à la saisie), genre verrouillé en modification avec sa note, couleur masquée pour un
  comportement avec sa note, aperçu vivant, refus dans le `p.statut`, rien d'écrit. Genre absent ou inconnu → « Comportements ».
- **Amorçage** : bouton « Créer les 6 marqueurs proposés » sur un vocabulaire vide seulement (relu au moment du geste), six
  appels à `ecrireMarqueur`, bilan dit à l'écran et en toast en cas d'échec partiel.
- **Doublons lisibles** : alerte « Codes en double » (nomme les marqueurs, un bouton « Archiver « … » » par marqueur), mention
  sur chaque carte concernée, rappel à l'ouverture du formulaire et après un refus.
- `main.js` : `TITRES`, `PARENT`, import, carte-lien après « Séquences & séances ». `service-worker.js` : `VERSION` 0.14.1,
  `ASSETS` += `./js/modules/marqueurs.js`. `state.js` : 0.14.1. `components.css` : `.mq-code` (§7 point 2) et trois règles de
  mise en page de l'écran (`.mq-genre`, `.mq-titre`, `.mq-ligne-code`).
- Preuves : `tests/e2e/marqueurs.spec.mjs` (MQ-12, MQ-17 du §11.2 ; MQ-18 amorçage et MQ-19 doublons, ajoutés au §11.2 et au §13
  du contrat). Gardes re-réglées : 19 → 20 fichiers, 14 routes (smoke-test 1 et C33), table `TITRES` de C42, comptes des README.
  Campagne `mutants-v0141.mjs` (scratchpad) : 14 mutants tués, chacun par son test (M06, M31, M35, M51, M63 à M70).

**Décidé** : la collision de MQ-12 est écrite **juste avant la transaction d'écriture** (transaction interposée, même portée,
créée d'abord) : c'est ce qui tue M06 même sous sa forme « liste relue avant la transaction », qu'une collision posée avant le
clic laisserait survivre. Le repli « Comportements » est prouvé dans MQ-17, qui manipule déjà le marqueur sans genre.

**Résultats** : `marqueurs.spec.mjs` 4/4 (chromium) ; suite complète au premier passage **396/396** (309 + 87 rejoués sur
le projet mobile), puis les gardes relancées après la dernière retouche des docs, 90/90 ; campagne : contrôle sain vert, 14
mutants, 14 tués par leur test.

**Coincé / à vérifier** : relecture visuelle de l'enseignant sur téléphone (captures faites en Pixel 7 émulé, clair et sombre,
sans débordement ni erreur de console) ; l'aperçu du code prend la taille du texte de la carte qui le porte, la taille exacte
de la carte d'élève (0,74 rem) n'arrive qu'en v0.14.2.

**Prochaine étape** : relecture et « go » de commit puis de publication ; puis v0.14.2.

---

## 2026-09-23 (45) — v0.14.0 candidate : marqueurs de séance, le format seul (schéma 4)

Demande : « je te suis » (contrat `docs/avis/AVIS_FORMAT_MARQUEURS.md` validé, 11 points ouverts tranchés) → implémenter la
**v0.14.0** telle que le §13 la découpe, et rien d'autre. **Ni commit, ni publication** : la version attend la relecture et un
« go » explicite — publier monte le schéma sans retour.

**Fait** :
- `io.js` : `DB_VERSION` 4, deux entrées ajoutées à la fin de `SCHEMA` (`marqueurs`, `marquages` + 3 index) ; `CHAMPS_TEXTE`
  réduit aux champs indispensables (`libelle`, `court` ; les trois références d'une pose) ; `appliquerMarquages` (motif de
  `mettreAJourEvaluation` : lectures d'abord, tout dans le `onsuccess` de la dernière, relecture émise après les écritures,
  résolution sur `tx.oncomplete` ; `AppelManquant` ; rien écrit dans `appels`) ; `ecrireMarqueur` (id en dernier, aucun genre
  par défaut, unicité de `cleCourt` relue dans la transaction) ; `validerExport` appelle les deux validateurs, motif préfixé de
  la ligne ; cascades séance / séquence / élève ; aperçus + `apercuSuppressionSeance` ; `LIBELLES` ; message en français sur
  `VersionError` ; commentaires « 14 stores » et « schéma 2 » corrigés.
- `marqueurs-calcul.js` (nouveau) : `GENRES`, `LIBELLES_GENRE`, `COULEURS`, `cleCourt`, `validerMarqueur`, `validerMarquage`
  (forme seulement, champs inconnus tolérés). Ajouté à `ASSETS` du service-worker — seul fichier neuf de la version.
- `sequences.js` : la suppression d'une séance lit son aperçu et l'affiche en détail ; carte « Supprimer la séquence » sans
  énumération. `eleves.js` : carte « Supprimer cet élève » sans énumération.
- Docs : `modele-donnees.md` (schéma 4), D014, `deploiement.md` (ligne candidate, procédure 4 → 3, ce que voit un appareil resté
  en v0.13.5), guide d'installation (ligne « Affichage impossible / VersionError »), `CLAUDE.md`, `architecture.md`, `TODO.md`.
- Preuves : `tests/e2e/marqueurs-migration.spec.mjs`, 11 tests (MIG-01 à MIG-07, MIG-09 en trois tests, MIG-10), base vidée en
  dérivant `io.STORES`, dates fixes et libellé de date indépendant du calendrier (`dateFR` n'affiche l'année que hors de
  l'année scolaire). Gardes re-réglées : 18 → 19 fichiers, C37 5 → 6 lectures, B51 15 → 17 magasins, comptes des README.
  **Quatre gardes écrites à la main que le contrat ne listait pas** ont aussi rougi et ont été re-réglées : D-11/C30 (montée
  v1 → v4, `version: 4`), les deux tests de grilles qui figeaient le schéma 3 (`schema` et `version`), H01 (17 magasins) et A23
  (`count` et `stores` à 17 — trouvée par la première exécution de la suite).
- Mutants (`scratchpad/mutants-v0140.mjs`, en place, restauration dans un `finally`, ancre unique, fins de ligne CRLF
  respectées, contrôle sain M0) : M01, M02, M03, M05, M07, M08, M09, M10, M32, M33, M34, M49 (+ variante `archivee` exigée),
  M50 (+ variante sur les poses) — **15/15 tués, chacun par son propre test**.

**Revue adversariale avant commit** (4 lentilles, 2 réfutateurs par constat, 28 agents) : 12 constats proposés, **2 retenus**,
tous deux sur la VALEUR DES PREUVES et non sur le comportement :
- neuf règles de forme de `marqueurs-calcul.js` (longueur et blancs du code court, types de genre, couleur, archivage,
  occurrences entières, instantanés et date) n'étaient prouvées par aucun test : leurs mutants survivaient aux 11 tests
  MIG. Ce sont précisément les règles du format qu'on ne pourra plus changer : MIG-07 porte désormais 15 cas, et le test
  exige « un message par règle » (deux cas qui violent la même règle partagent son message) ; mutants M52 à M60 ;
- la sonde de C37 (« l'aperçu compte sans charger ») ne surveillait les lectures de magasin entier que sur quatre
  magasins écrits à la main — elle oubliait déjà `inaptitudes`, et oubliait `marquages`. Corrigée dans sa FORME : la liste
  est dérivée de la base réelle (tout magasin qui porte un index `eleveId`), avec une prémisse qui affirme qu'elle voit les
  six magasins connus. Mutant M61 (aperçu qui lit tout `marquages`), tué par C37 — l'ancienne sonde l'aurait laissé passer.

Dix constats écartés, dont deux **réels mais inactifs dans cette version** (aucun écran n'écrit encore de marqueurs), reportés
dans le contrat (§16) : une pose écrite pendant une suppression en cascade survivrait à sa séance (lectures puis écriture
dans deux transactions) — à traiter en **v0.14.2**, quand la feuille posera des marqueurs ; une sauvegarde bricolée portant
deux marqueurs actifs de même code court entre en base, et `ecrireMarqueur` refuse ensuite de modifier l'un comme l'autre —
à rendre lisible en **v0.14.1** (écran du vocabulaire).

**Intégration continue rouge après le commit (`ca99522`), sans rapport avec la v0.14.0** : FON-01 (« l'en-tête reste compact
à 200 % », mode version d'essai) échouait sous Linux, 215,7 px pour une limite de 213,3. Diagnostic : l'en-tête affiche la date
du jour en toutes lettres (`main.js:230`) ; la même suite était verte le mardi 22, rouge le mercredi 23. Reproduit ici avec
Verdana, doublure de DejaVu (proportions voisines ; une balise `<style>` injectée est BLOQUÉE par la CSP de l'application, il
faut passer par le CSSOM) : « mardi 22 septembre » tient sur une ligne (188,7 px), « mercredi » ou « dimanche » en prennent
deux (219,7 px). Correction : horloge figée sur le pire cas, et mesure de la RÈGLE (le bandeau coûte moins d'un sixième de
l'écran) au lieu d'un résultat qui dépend de la police et du jour. **Ma première règle était vide** : rapportée à la hauteur
de ligne du bandeau, elle grandissait avec lui et laissait passer un bandeau trois fois plus haut. Rapportée à l'écran, elle
l'attrape (mutant M62), sous les deux polices.

**Décidé** : MIG-10 simule la défaillance au COMMIT par une requête émise dans le succès du `put`, donc placée après la relecture :
un abandon dans le succès même du `put` aurait fait échouer la relecture et laissé survivre M32. MIG-02 prouve aussi le message
français (base montée en 5 par un « autre onglet »).
**Coincé / à vérifier** : ce que voit une v0.13.5 réellement installée face à une base en 4 (non prouvable ici, `docs/test-terrain.md`) ;
la garde d'énumération du projet mobile (§12.1) n'a pas de version assignée par le contrat — non ajoutée, elle devra exister
avant la v0.14.2.
**Prochaine étape** : relecture, commit sur « go », publication sur « go » séparé (CI verte) ; puis v0.14.1 (vocabulaire).

## 2026-09-22 (44) — v0.13.5 : correctifs de l'audit Codex V7

Demande : « donne le chemin et quoi dire pour vérifier par codex », puis « regarde le dernier audit codex ». Consigne
écrite dans `audit codex/CONSIGNE_V7.md` ; deux rapports rendus : `AUDIT_V7.md` (code) et `AUDIT_V7_AVIS_MARQUEURS.md`
(avis, traité par la révision de `docs/avis/AVIS_MARQUEURS_SEANCE.md`, commit `51449dd`).

**Constats de code (reproduits chez moi avant correction)** :
- V7-A01 : la liste des échecs réconciliée à l'ouverture n'était pas réécrite en session ; un échec rattrapé ressuscitait
  après la saisie valide suivante du même choix. Corrigé dans la FORME : `sauverEchecs()` à l'ouverture.
- V7-A02 : sur le sélecteur de statut touché au doigt, `:focus-visible` est vrai dans Chromium ; l'écran défilait de 96 px à
  l'apparition d'une erreur. C'est le piège déjà rencontré sur les listes d'élève et de critère (contre-revue v0.13.4),
  corrigé à l'époque contrôle par contrôle — il est revenu sur le contrôle suivant. Corrigé dans la FORME : une seule
  variable `auClavier` pour la vue, tenue par `keydown`/`pointerdown` sur la fenêtre en capture (auto-retirés quand la vue
  est quittée), lue par les deux listes et par `evaluerBarre` ; la WeakMap par liste disparaît.

**Revue adversariale (2 tours, 2 réfutateurs par constat)** : premier tour, 3 constats retenus sur 4 — une RÉGRESSION de
mon correctif A01 (l'échec d'un élève passé « parti » était effacé à la réouverture ; désormais gardé à part, non affiché,
`horsVue`), le « OK » du clavier virtuel dans « Ajuster » pris pour un geste clavier (une frappe dans un champ de saisie
ne change plus la modalité ; ce n'était pas une régression, l'ancienne garde se trompait aussi), et les comptes du README
des tests. Second tour ciblé sur ces deux ajouts : 1 constat sur 1 (2 réfutateurs sur 2), une RÉGRESSION du correctif
« clavier virtuel » : ignorer toute frappe dans un champ perdait l'Entrée d'un vrai clavier après un clic de souris, et
« Ajuster », au focus visible, passait à 88 % sous la barre. Seule la frappe qui suit un TOUCHER est désormais ignorée
(`auDoigt`, type du dernier pointeur). La lentille `horsVue` n'a rien trouvé.

**Pièges rencontrés** :
- Un correctif « contrôle par contrôle » d'un défaut de CLASSE revient sur le contrôle suivant : la modalité devait avoir
  une seule source dès la contre-revue v0.13.4.
- Réaligner une mémoire ne doit retirer que ce qui est résolu : « absent de la vue » n'est pas « rattrapé ».
- Le mutant qui remettait `:focus-visible` a d'abord SURVÉCU (un clic de souris ne produit pas le piège ; il faut un
  toucher : `test.use({hasTouch:true})`), puis a été tué… par un autre test que le sien. En cause : le défilement fautif
  part du ResizeObserver, qui tourne à l'étape de rendu suivante ; une mesure prise juste après l'apparition de l'erreur
  pouvait le précéder et passer au vert par hasard. Aide `deuxImages` (deux `requestAnimationFrame`) avant toute mesure
  de défilement ; M49 est depuis tué trois fois sur trois par son propre test.
- Un mutant tué par un test qui n'est pas le sien est un signal, pas une victoire : vérifier QUEL test rougit.
- Chaque correctif de revue a été revu à son tour, et le second tour a trouvé la régression du premier. Une règle
  « ignorer telle frappe » doit dire POUR QUI : après un toucher seulement, pas après un clic de souris.
- 52 mutants tués sur 52.

## 2026-09-17 (43) — v0.13.4 : saisie par grille « un élève à la fois » sur un seul écran

Demande : « l'ergonomie évaluation 1 élève à la fois, c'est pas top », puis « tu as raison un élève à la fois c'est bien » et
« fait au mieux » : garder le principe, refaire l'écran pour le pouce.

**Fait** :
- `grilles.js` (saisir) : actions de bureau sous la saisie ; en-tête d'élève compact (nom, rang « 2 / 24 », note) ; statut
  ABS/DISP/NN après les critères ; cases étiquetées nom + points (nom accessible « Nom · points » par `aria-label`, `<span>` en
  `pointer-events: none`) ; barre « Élève précédent / suivant » et « Critère suivant » (`.grille-barre`) avec ligne d'erreur
  `.grille-echec` ; échecs non rattrapés tenus par élève ET critère (`echecs`, clé `eleve|critère`) ; hauteur de la barre mesurée
  par ResizeObserver (`--h-barre-grille`, réserve sous la page ; classe `grille-barre-libre` au-delà de 15 % de la hauteur) ;
  retour en haut au changement d'élève ou de critère, et au choix dans une liste sauf si le dernier geste sur la liste était une
  touche ; région d'annonce permanente ; élargissement des cases (`grille-niveaux-larges`) mesuré quand un nom déborde.
- `components.css` : niveaux sur une rangée, barre FIXE sur téléphone en portrait (`max-width: 899px` et hauteur suffisante),
  zone `::after` qui capte le toucher sous `.grille-barre` et `.barre-appel`, noms de niveau coupés aux seuls espaces, marge de
  focus au-dessus de la barre (valeur mesurée).
- `.github/workflows/tests.yml` : la suite tourne aussi sur `grilles-schema3` (branche de production depuis la v0.13.3 — elle
  n'avait plus d'intégration continue).
- Mesures à 375 × 812 : page d'un élève 1 218 px (2 053 avant), élève entier visible après « Élève suivant », barre à 687 px à
  l'ouverture, en bas de page et après « Élève suivant » ; mode « Par critère » 112 px par élève (environ 270).
- **Vérification finale** (2 lentilles, juste avant publication) : 8 constats sur 8, dont un **BLOQUANT que j'avais
  introduit au tour précédent** — le `scrollIntoView` qui ramenait le focus en vue (correctif 2.4.11) n'avait aucune borne :
  il se déclenchait pour un élément hors écran, pour un focus pris AU DOIGT, et à chaque `resize`. Mesuré : l'écran sautait
  de 735 à 877 px sous le doigt, et le tap suivant écrivait « 20/20 » pour un autre élève avec « Enregistré ✓ ». Corrigé par
  trois gardes (focus clavier `:focus-visible`, case encore à l'écran, case réellement recouverte par la barre).
  Les sept autres : la cause de l'erreur était coupée par la limite de deux lignes (cause en tête, noms résumés au-delà de
  deux, détail complet en infobulle) ; la bascule de la barre en cours de saisie était muette (annonce + marge de 13 %) ;
  cinq preuves manquantes (défilement sous le doigt, ligne d'erreur non recouverte, porteur de `--h-barre-grille`, palier
  minimal, rotation inverse, statut refusé au rechargement) et un compte faux dans le README des tests.
- **Campagne de mutants finale** : cinq mutants ne mutaient plus (ancres devenues fausses après les correctifs) et deux
  SURVIVAIENT — ceux du défaut bloquant. Ma preuve « l'écran ne bouge pas sous le doigt » était VIDE trois fois : le focus
  était resté sur un bouton de la barre (donc écarté par la garde), le tap de l'échec était programmatique (un `click()` en
  script ne déplace pas le focus), et la ligne d'erreur était DÉJÀ affichée — la barre ne grandissait donc pas et
  l'observateur ne se déclenchait jamais. Le tap sous la barre est devenu un test à lui seul, qui vérifie d'abord ses
  propres prémisses (focus sur la case touchée, focus non clavier, case recouverte, barre qui a bien grandi).
- **Troisième revue** (3 lentilles : barre fixe et mesures, erreurs et élargissement, preuves) : 14 constats sur 14, tous
  corrigés — un VRAI message d'erreur (conflit « autre onglet », stockage plein) faisait passer la barre ENTIÈRE au-dessus de
  15 % : elle quittait le pouce et le tap suivant écrivait un niveau pour un autre élève (le seuil se mesure désormais sur la
  seule rangée de boutons, la ligne d'erreur est bornée à deux lignes) ; les toasts (« Nouvelle version installée », 20 s
  « Annuler ») se posaient sur la barre fixe ; le focus clavier passait sous la barre agrandie ; la règle des 15 % n'était pas
  réévaluée quand seule la hauteur changeait (écran partagé) ; un mot restait coupé une fois les cases élargies (palier « une
  seule colonne » ajouté) ; un statut ABS refusé n'était pas nommé ; la liste des échecs mourait au rechargement que le
  message réclame (gardée dans la session, par identifiants, et oubliée si la base contient déjà le choix) ; six preuves
  insuffisantes (invariant de coupure au caractère, place de la barre depuis le bas, gestes réels sur les listes, rotation,
  attentes au lieu de lectures ponctuelles).
- **Revue adversariale** (4 lentilles, 2 réfutateurs chacune) : 14 constats sur 15. **Contre-revue des correctifs** (3 lentilles) :
  19 constats sur 20, dont trois défauts que J'AVAIS introduits en corrigeant — le message « Non enregistré » de 8 s posé sur la
  barre avalait « Élève suivant » (les niveaux suivants s'écrivaient sur l'élève précédent) et doublait l'annonce ; la barre
  collante « immobile » ne l'était qu'en partant du haut de page ; la garde `:focus-visible` rendait le retour en haut inopérant
  au doigt (vraie sur un `<select>` touché dans Chromium), et le test passait par `selectOption` sans focus. Tous corrigés.
- 11 tests dans `grilles.spec.mjs` (rejoués sur mobile), 1 dans `terrain.spec.mjs`, assertions FON-05 ajustées ; 45 mutants
  tués sur 45 gardés (2 équivalents retirés : la règle « paysage » doublait celle des 15 %, et un mutant d'annonce laissait
  l'affectation correcte s'exécuter après lui).

**Pièges rencontrés** :
- Un correctif d'accessibilité peut créer un défaut de saisie : ramener le focus en vue est juste au CLAVIER et faux au
  DOIGT, où l'écran bouge sous la main. Toute action automatique sur le défilement doit dire de quelle modalité elle vient,
  et se borner à ce qu'elle prétend corriger (élément visible, réellement recouvert).
- Une preuve peut être vide sans qu'aucun test ne rougisse : il faut mettre en scène la PRÉMISSE (ici le focus au doigt sur
  la case, glissée sous la barre, et une barre qui grandit vraiment) et l'affirmer dans le test. Sans cela on mesure un
  écran qui ne bouge pas… parce que rien ne pouvait le faire bouger.
- Un `element.click()` en script ne donne pas le focus (contrairement à un vrai tap) : pratique pour ne pas le déplacer,
  trompeur quand c'est le focus qu'on veut éprouver.
- Un test qui déclenche l'échec par un conflit écrit en base peut, selon l'état de la vue, ne pas échouer : pour une preuve,
  préférer la panne d'écriture, déterministe.
- Deux assertions dans le mauvais ordre suffisent à créer une course : lire un attribut (sans réessai) avant l'assertion
  qui attend l'état.
- Une barre COLLANTE ne peut pas rester à la même place : en bas de page, elle suit la fin de son conteneur. « Immobile » exige
  `position: fixed` et une réserve mesurée — et un test qui compare la position depuis le haut ET depuis le bas.
- Un message temporaire posé sur la zone du pouce avale le geste suivant : une erreur de saisie doit vivre DANS l'interface qu'elle
  concerne, persister tant que la donnée manque, et n'être annoncée qu'une fois.
- Effacer une erreur au premier succès « du même élève » est faux : le niveau refusé manque toujours. La clé est la donnée perdue
  (élève + critère), pas la personne.
- `:focus-visible` sur un `<select>` ne distingue pas le doigt du clavier dans Chromium ; le dernier geste (`keydown` /
  `pointerdown`) le fait. Un test qui choisit par `selectOption` sans focus épouse la garde qu'il devait prouver.
- La place d'un mot dépend de la police installée (Segoe ici, DejaVu en intégration continue) : les tests d'écran utilisent des
  libellés courts, et les libellés longs sont prouvés par des invariants (pas de mot coupé, rien qui déborde, cases élargies).
  La CI Linux m'a pris DEUX FOIS au même piège : « barre fixe à 412 × 915 en 200 % », puis « aucun palier au retour au paysage »
  sont des RÉSULTATS, vrais avec Segoe et faux avec DejaVu. Ce qui se mesure sans dépendre de la police, c'est la RÈGLE — seuil
  déduit de la barre réellement rendue, palier le plus faible qui ne coupe rien, comptes relevés puis comparés entre eux.
- Deux mutants survivants étaient ÉQUIVALENTS, pas des trous : le vérifier avant d'ajouter un test (règle redondante, mutant mal
  construit). Trois autres ne survivaient que parce que la MESURE du test était trop douce : message d'erreur court là où les vrais
  sont longs, mot de test trop court pour saturer trois colonnes, test hors du filtre de la campagne. Un mutant qui survit dit
  d'abord quelque chose du test.
- Une décision « au-delà de 15 %, la barre se décroche » doit porter sur la partie STABLE de l'élément : mesurée sur la barre
  entière, elle basculait au premier message d'erreur, c'est-à-dire exactement quand l'enseignant en avait le plus besoin.
- Pendant le premier tour : revenir à la même adresse avec `goto` ne redessine pas la vue ; un commentaire inséré par script en fin
  de ligne a avalé l'assertion suivante ; `innerText` renvoie une ligne par élément flex même côte à côte ; `sed -i` de Git Bash
  réécrit en fins de ligne LF (sans effet pour git).

**Prochaine étape** : migration des données sur chaque appareil ; réponses aux 14 questions de l'avis des onglets.

## 2026-09-17 (42) — v0.13.3 et v0.12.22 : mise en service de la nouvelle adresse

Demande : retour de l'essai téléphone de la v0.13.2 — « version ok, couleurs ok, grille ok, sauv ok » — plus une remarque sur la
saisie par grille (« un élève à la fois, c'est pas top », puis « un élève à la fois c'est bien ») ; « fait au mieux ».

**Fait** :
- Branche `grilles-schema3` : `MODE_ESSAI = false`, manifeste « Carnet EPS », v0.13.3 ; guide d'installation (section
  « Déménagement »), README, procédure de déploiement et TODO pointent vers la nouvelle adresse. Publiée sur
  https://carnet-eps.github.io/ selon la procédure de la période à deux adresses.
- Branche `demenagement` : `NOUVELLE_ADRESSE` renseignée, v0.12.22 publiée sur l'ancienne adresse (bandeau « a déménagé »).

**Décidé** (délégation) : mise en service tout de suite, puisque l'essai est vert et que les vraies données sur l'origine partagée
sont le premier risque de l'audit (SEC-01) ; la saisie par grille compactée (un élève à la fois, tout sur un écran) suit en v0.13.4 —
elle ne touche que l'écran, pas le format des données.

**Mesure à l'origine de la v0.13.4** (375 × 812, grille par défaut 4 × 4) : en mode « Par élève », aucune case au premier écran
(première à 982 px), « Élève suivant » à 1 921 px, plus de deux écrans par élève ; en mode « Par critère », 237 px par élève,
7 938 px pour 24 élèves.

**Prochaine étape** : migration des données sur chaque appareil (à faire par l'enseignant) ; v0.13.4.

## 2026-09-16 (41) — avis « carnet de classe à onglets » (référence iDoceo)

Demande : « ce ne serait pas mieux de fonctionner avec des onglets en partant d'une classe (onglet pour ajouter des info, des
notes...) », précisée ensuite par la référence iDoceo (onglets créés par « + », nommés, colorés, jusqu'à 99, appui long pour
renommer, masquer, copier, déplacer). BIBLE règle 6 : changement structurant → avis avant tout code.

**Fait** (aucun code modifié) :
- `docs/avis/AVIS_PAGE_CLASSE_ONGLETS.md`, produit par un workflow : 5 lectures indépendantes du code ; recherche sur la
  documentation officielle d'iDoceo (24 pages lues, chaque fait avec son URL, points non confirmés signalés) ; 4 propositions
  (hub de liens, page de classe complète, navigation réorganisée, carnet à onglets personnalisables) notées par 2 juges sur
  8 critères → option « en deux temps » en tête chez les deux (33/40), enrichie d'idées des trois autres.
- **Vérification adversariale** de l'avis rédigé : 5 lentilles (code, iDoceo, données, terrain, cohérence), 79 constats, 2
  réfutateurs par lentille → 11 réfutés, 68 retenus (67 appliqués, 1 écarté avec preuve) ; contre-relecture de la révision :
  6 constats (4 appliqués par une seconde révision, 2 à la main). **Contrôle final** des passages révisés : 4 contrôleurs,
  265 références ouvertes, 13 constats confirmés, tous appliqués.
- Corrections de fond apportées par ces passes : un appel passé ouvert depuis le carnet s'ouvre **en consultation** (un toucher
  y écrit aujourd'hui, et « Terminer » passe les restants en présent) ; onglets du carnet nommés **Classe · Présences ·
  Évaluations** pour ne pas doubler « Élèves » et « Notes » de la barre du bas ; totaux en feuilles à part (3 colonnes utiles à
  320 px) ; règles des évaluations et séquences sans date ; en v0.15, écritures d'une classe relues dans une seule transaction
  (`sauverClasse`, « Restaurer », « Annuler » d'une suppression recopient un objet lu au rendu) ; onglets personnels effacés par
  la purge de rentrée et remplacés par l'import d'une sauvegarde (PC ↔ téléphone) ; retour arrière uniquement sur la nouvelle
  adresse (jamais `origin gh-pages` depuis cette branche) ; données de santé : lettres I et D visibles → question explicite.

**Pièges rencontrés** : une révision est du texte neuf — la contre-relecture puis le contrôle final ont encore trouvé 6 puis 13
défauts introduits ou laissés par les révisions ; un constat « réfuté » n'est pas une preuve que l'avis a raison (le compte de
tests de la page de classe, réfuté une première fois, était bien faux : 14 et non 11) ; un contraste « lettre ≥ 4,5:1 » ne
prouve pas la pastille (une lettre rouge sans pastille passe sur le fond sombre de la page) → égalité du couple fond/lettre.

**Décidé** : rien — 14 questions fermées en §12, chacune avec sa recommandation.

**Prochaine étape** : résultat de l'essai téléphone de la v0.13.2 ; réponses aux 14 questions ; mise en service puis migration ;
alors seulement, v0.14.0.

## 2026-09-16 (39) — v0.13.2 : retours de l'essai téléphone (couleurs de statut, écran des grilles)

Demande : trois retours après l'essai de la v0.13.1 — « retard, tenue et absent sont pratiquement de la même couleur », « votre
première grille, la boîte est trop collée à Nouvelle grille / Créer une évaluation », et une question de structure (travailler par
classe avec des onglets), traitée à part.

**Fait** :
- **Mesure avant correction** : écart perceptuel CIEDE2000 entre pastilles — absent / oubli de tenue 16,4 (clair) et 14,7 (sombre),
  absent / retard 25 ; minimum de la palette 14,5 (inapte / infirmerie) et 12,5 en sombre. Le ressenti était juste.
- **Palette cherchée par calcul** (scripts hors dépôt) sous contraintes : lettre blanche ≥ 4,5:1 en clair, lettre foncée ≥ 4,5:1 et
  bordure ≥ 3:1 en sombre, MÊME famille de teinte dans les deux thèmes, paires de l'appel pondérées double. Retard : un jaune assez
  sombre pour une lettre blanche frôlait le vert du « présent » (29,9) → **pastille jaune vif à lettre foncée** (`--stbf-retard`,
  `--stbt-retard`), bordure ambre sombre. Résultat : ≥ 34 entre présent, absent, retard et oubli de tenue ; ≥ 18 sur la palette.
- **Forme de règle unique** pour toutes les pastilles : `var(--stbf-x, var(--stb-x))` et `var(--stbt-x, var(--c-sur-accent))`,
  dans `components.css` ET dans les deux sites de `eleves.js` (compteurs, historique) — sinon la fiche élève aurait gardé un
  retard olive à lettre blanche.
- **Couleurs de niveau des grilles découplées** (`--niv-*`, valeurs d'avant) : elles pointaient sur les tokens de statut, et les
  noms montrés dans l'éditeur (« orange », « rose ») auraient menti.
- Écran des grilles : `rang-btn` → `barre-actions` (marge sous les boutons, comme partout ailleurs).
- `tests/e2e/essai-terrain.spec.mjs` (5) ; 6 mutants tués. Suite 278 (+ 73 mobile).

**Pièges rencontrés** : `getPropertyValue('--x')` rend la valeur telle qu'écrite (hexadécimal), pas un rgb → résoudre via un élément
témoin ; un test qui lit la VARIABLE ne voit pas qu'une règle est rebranchée sur une autre variable (mutant survivant) → mesurer la
case rendue ; ma première mutation « ancienne palette » ne remettait pas la couleur fautive (oubli de tenue) et survivait — une
mutation doit restaurer le DÉFAUT signalé, pas une partie ; le navigateur de l'aperçu gardait l'ancien CSS en cache HTTP
(`fetch(url, { cache: 'reload' })` avant de recharger).

**Décidé** : la production (v0.12.20) garde l'ancienne palette tant qu'on ne décide pas de l'y reporter (proposé, pas fait).

**Complément (même jour)** : palette reportée sur la production en **v0.12.21** (entrée 40, branche `main`). En chemin, un mutant a
survécu : les tests ne vérifiaient le sombre que par le choix explicite des Réglages, pas le bloc `@media (prefers-color-scheme: dark)`
utilisé en mode « Auto » — le cas probable d'un téléphone en mode sombre. Test du sombre automatique ajouté ici aussi (mutant tué),
suite 279. La branche `demenagement`, rebasée sur la v0.12.21, devient **v0.12.22** (procédure de mise en service renumérotée).

**Prochaine étape** : réponse sur la navigation par classe à onglets ; suite de l'essai téléphone.

## 2026-09-16 (38) — v0.13.1 : premier lot de l'audit indépendant (essai marqué, grille sans tap perdu, CI durcie)

Demande : « go » sur l'ordre proposé après remise du rapport d'audit indépendant (hors dépôt : 36 constats, 15 vérifications contradictoires, aucun constat invalidé) — petit lot correctif AVANT l'essai téléphone, puis essai, puis migration des vraies données.

**Fait** :
- **FON-01** : `MODE_ESSAI` (state.js) pilote un bandeau ambre dans l'en-tête, le titre « ESSAI — Carnet EPS » et le manifeste (« EPS essai »). Une garde statique refuse que le drapeau et le manifeste divergent : la mise en service est un geste, pas deux.
- **FON-05 / PER-05** : dans `grilles.js`, le verrou `occupe` (qui désactivait tous les contrôles sans style visible et JETAIT le tap suivant) est remplacé par une file sérialisée, comme dans `notes.js`. `enregistrerChoix(e, modifier, {code, cle, cr})` applique un `modifier` pur deux fois : tout de suite sur le **détail voulu** (Map `voulus`, vidée en fin de rafale — retour immédiat de la ligne par `majLigne`), puis au moment de l'écriture sur l'état ENREGISTRÉ le plus récent (un tap refusé n'est pas réécrit par le suivant). La bascule « retoucher efface » se juge sur le détail voulu : même geste, même résultat, quelle que soit la vitesse d'écriture. `aria-busy` sur la case retrouvée par sa clé ; en fin de rafale, `actualiser()` met l'écran à jour **sur place** (lignes via `data-eleve`/`data-critere`, scores via `data-score-eleve`, statut via `data-statut-eleve` ; `rendre()` seulement en mode bilan) ; file `fileEcritures` au niveau du MODULE, attendue par `saisir` avant de lire les notes ; erreur nommée avec sa cause par élève (« Non enregistré pour NOM Prénom (cause) »), toast si la vue a été quittée ; feuille « Ajuster » sur la valeur voulue ; consigne « retoucher efface » affichée pour toutes les grilles.
- CSS : `.btn:disabled` (opacité 0,55, curseur) — aucun style désactivé n'existait dans l'application — et, en FIN de `components.css`, le contour pointillé de l'écriture en cours (plus spécifique que le contour de sélection et l'anneau de focus des cases, étendu au sélecteur de statut). `base.css` : `scroll-margin-top: max(ancienne valeur, --h-entete + 0,5rem)`, `--h-entete` mesurée par un ResizeObserver dans `main.js` (suit aussi un texte agrandi sans redimensionnement) ; bandeau `.essai` sur une ligne (`nowrap` + ellipse).
- **SEC-04** : `permissions: contents: read` et actions épinglées par SHA de commit (checkout v4.4.0, setup-node v4.4.0, upload-artifact v4.6.2). Vérifié avant de figer : chaque SHA est un commit (pas un objet tag) et c'est exactement la cible actuelle du tag mobile `v4` — le code exécuté par la CI ne change pas. **La prémisse de l'audit était fausse** : `gh api repos/alemoine4/carnet-eps/actions/permissions/workflow` renvoie `read` ; le bloc est une défense en profondeur. La garde statique accepte le CRLF (`core.autocrlf=true` sur ce PC, sans `.gitattributes`).
- `docs/deploiement.md` : avertissement en tête sur TOUTE commande `origin gh-pages` (déploiement et retour arrière) ; section « Période à deux adresses » (publication de `grilles-schema3` sur `carnet-EPS/carnet-eps.github.io` avec SHA vérifié avant la poussée, retour arrière de l'origine d'essai, ordre et commandes de mise en service). `docs/architecture.md` : `MODE_ESSAI`.
- `docs/essai-telephone.md` (15 min, données fictives, sans installer, sans coller dans Pronote), recalé sur les libellés réels.
- Branche `demenagement` (commit séparé `923e600`) : le test « sans adresse » servait l'état du dépôt et devenait rouge dès l'adresse renseignée — juste avant de publier sur l'adresse qui porte les vraies données ; il fixe désormais lui-même l'adresse vide. Deux autres tests de cette branche corrigés au passage : B51 cherchait le lien de sauvegarde dans toute la page (le bandeau en ajoute un second dans l'en-tête), et le test de course V3-A écrivait dans la fiche élève avant son rendu. Vérifié dans les deux états : **245 verts avec l'adresse vide, 245 avec l'adresse réelle**.
- **Revue adversariale** (4 lentilles Opus, 2 réfutateurs par constat, 42 agents ; un premier passage avait échoué entièrement sur la limite du modèle Fable — « 0 constat » ne voulait rien dire, relancé) : 19 constats, 18 retenus, 1 réfuté (SEC-04 sans effet sur `main` : le jeton y est déjà en lecture). Retenus et corrigés : promesse « double tap idempotent » fausse au rythme humain (ma première version jugeait sur le choix RENDU), changement d'avis en rafale qui effaçait, contour pointillé écrasé par la sélection et le focus, erreur affichée sur l'écran d'un autre élève sans le nommer, feuille « Ajuster » périmée et focus perdu, marge de focus sous l'en-tête agrandi (case cachée à 320 px), texte du bandeau qui deviendrait faux pendant la migration (→ ordre inversé), garde de cohérence asymétrique, test « drapeau faux » vrai sur le HTML statique, tests figés sur l'état essai, promesses « un rendu par rafale » et « erreur non recouverte » sans test, fiche d'essai impossible à suivre (aucun créneau ni séance → pas d'appel du jour), procédure de déploiement qui publiait sur l'ancienne adresse, prémisse SEC-04.
- **Seconde revue adversariale**, sur les corrections de la première (3 lentilles Opus, 43 agents) : 20 constats, 17 retenus, 3 réfutés. **Ma correction avait introduit la reconstruction de fin de rafale** comme source unique de trois défauts : appui long commencé pendant une écriture qui n'ouvrait jamais « Ajuster » (case détachée, le minuteur exige `isConnected`), clic à cheval perdu, focus repris au clavier (Entrée suivante qui efface la case précédente) → mise à jour sur place. Aussi retenus et corrigés : vue rouverte en pleine rafale qui relisait un état intermédiaire (→ file au niveau du module), cause de la dernière erreur appliquée à tous, règle « retoucher efface » présentée comme affichée alors qu'elle ne l'était qu'avec les points ajustables et formulée faussement (« l'efface toujours »), bandeau sur plusieurs lignes à 200 %, fiche (titre obligatoire, bouton « Créer et saisir les notes »), procédure de mise en service bloquée par le test de `demenagement`, avertissement qui ne couvrait pas le retour arrière, et quatre tests aveugles (retour immédiat prouvé sur la seule première ligne vide, nom d'élève prouvé sur l'élève courant, toast en double, marge sous texte agrandi). Dates : « vérifié le » corrigé au 15 (le travail a débuté le 15 au soir).
- **Troisième revue adversariale**, sur les corrections de la seconde (2 lentilles Opus, 14 agents) : 6 constats, 5 retenus. **Ma correction « bandeau sur une seule ligne » tronquait « données fictives »** dès 320 px, et aucun test ne le voyait (ils ne mesuraient que la hauteur, et `toContainText` lit le DOM, pas ce qui est affiché) → texte court « Version d'essai · données fictives », retour à la ligne autorisé, mesure de la plage de texte dans le test. **Quatre tests ne passaient que grâce au ralentissement de la capture de trace** : ils lisaient le DOM avant le rendu de la vue (18 échecs sur 20 avec `--trace off`, mesurés par la revue) → aide `ouvrirSaisie`, plus le même défaut corrigé sur la branche `demenagement`. Aussi : procédure de mise en service qui annonçait une correction inexistante (faite depuis), mise à jour sur place du sélecteur de statut sans test (mutant survivant). Réfuté : l'écran reconstruit par une navigation en pleine rafale (fenêtre de quelques millisecondes, jamais atteinte à la main — les deux réfutateurs l'ont mesurée).
- **Piège d'outillage** : ma campagne de mutations lançait Playwright via `shell: true` ; un filtre `-g "a|b"` passait par cmd.exe qui prenait `|` pour un tube → **aucun test exécuté, cinq faux survivants**. Lancement direct par `node …/@playwright/test/cli.js` et refus explicite d'un résultat « 0 test exécuté ».
- `tests/e2e/audit-independant.spec.mjs` : 22 tests ; **25 mutants tués sur 25** (dont, en seconde passe : reconstruction de fin de rafale, file non attendue à la réouverture, cause unique pour tous, nom pris sur l'élève courant, toast en double, ancien niveau non éteint, score non mis à jour, mesure au seul redimensionnement, consigne réservée aux points ajustables ; en troisième : bandeau tronqué sur une ligne, sélecteur de statut non remis à jour). Suite 273 (+ 73 mobile), stable avec `--trace off` (3 passes).

**Décidé** : Dependabot non activé sans accord (il ouvre des PR récurrentes sur son dépôt) ; la mise à jour sur place ne couvre que la fin de rafale — la reconstruction complète reste pour la navigation et le mode bilan, et la mesure sur téléphone dira s'il faut aller plus loin (le vérificateur de scénario de l'audit a chronométré la revalidation à 0,84 ms pour 28 élèves : le coût est dans le DOM et l'écriture) ; le durcissement CI n'est pas reporté seul sur `main` (sans effet observable, le jeton y est déjà en lecture) ; « retoucher efface » reste la règle, affichée pour toutes les grilles et désormais déterministe, plutôt qu'un anti-rebond temporel — un double tap involontaire sur une autre case efface le critère, niveau précédent compris : question posée dans la fiche d'essai ; la vue Notes ouverte pendant une rafale peut encore afficher un état intermédiaire jusqu'au rendu suivant (la copie Pronote, elle, relit la base) ; le journal n'a pas d'entrée pour les sessions du 10 au 15 septembre (v0.12.16 → v0.13.0) — la trace est dans CHANGELOG et deploiement.md, non reconstituée ici.

**Coincé / à vérifier** : le ressenti du tap sur Android réel (fiche d'essai) ; les autres constats du rapport (§6 : quick wins, chantiers, structurel) attendent une demande.

**Prochaine étape** : essai téléphone sur l'origine d'essai ; puis mise en service dans cet ordre — `MODE_ESSAI = false` publié sur la nouvelle adresse et bandeau « a déménagé » sur l'ancienne, ENSUITE migration des données appareil par appareil.

## 2026-09-09 (37) — v0.12.15 : lot V3-A (mutation après écriture validée)

Demande : « go » sur la stratégie de l'audit V3 (V3-A d'abord, seul).

**Fait** :
- **Correction de classe** : `sauver(modifs)` construit un candidat, écrit, et ne modifie l'objet partagé qu'au succès — 5 modules, une vingtaine de champs. Deux champs sans `try/catch` (couleur de classe, cases restrictions) reçoivent message + retour à l'état enregistré. Deux sites de marquage « publiée » convertis (ils échappaient à l'audit).
- **Tests** : `tests/e2e/audit-v3.spec.mjs` (9, dont une **garde de classe** qui interdit le motif fautif dans tout `app/js/modules/`), rouges avant. Suite 174 (+ 24 mobile).
- **Piège de test rencontré et corrigé** : mon premier test « séquence » passait déjà avant le correctif. Cause : `fill()` émet DÉJÀ `change` sur un champ date, et mon `dispatchEvent('change')` supplémentaire relisait la valeur **restaurée** par le contrat V2-04, ce qui **réparait l'objet par accident**. Un test qui passe pour une mauvaise raison ne prouve rien : le second événement retiré, le test devient rouge comme il le doit.

- **Revue adversariale** (3 lentilles, 2 réfutateurs par constat) : un **P1 par lentille utile**. (1) « Archiver »/« Restaurer » d’une classe gardait le motif fautif : deux sites de plus convertis, et j’ai ajouté une **garde de classe** (test qui interdit le motif dans tout `app/js/modules/`) plutôt que de tester 17 sites un par un — elle a rougi sur ces deux boutons, ce qui la valide. (2) Ma correction **réintroduisait une course** : le second changement construisait son candidat depuis l’objet d’avant et écrasait le premier (nom perdu, reproduit sans ralentissement artificiel). Les écritures d’une vue sont maintenant **sérialisées** par une file d’attente qui laisse remonter l’échec à son propre appelant.
- **Second piège de test** : mon test symétrique visait un champ TEXTE, dont la valeur reste à l’écran après un refus — la réécrire ensuite est légitime, pas un bug. Recentré sur un champ **restauré** (date), où la base ne doit jamais voir la valeur refusée.

**Décidé** : les deux champs sans filet reçoivent un toast (cohérent avec tout le reste de l'app) ; le contrat de `brancherRetour` (ui.js) n'est pas touché, son rôle est de restaurer le CONTRÔLE, pas l'objet.

**Coincé / à vérifier** : la fiche terrain, toujours pas faite — deux des cinq constats de l'audit portent sur des conditions (mémoire pleine, réseau très lent) que seul le téléphone produit vraiment.

**Déployé** : main `92f6fa4`, gh-pages `ddf77ae`, tag `v0.12.15` (2026-09-09).

**Prochaine étape** : famille B (V3-B1 export pendant écriture, V3-B2 « à remettre à jour », V3-B3 conversion au changement de barème), après tes réponses aux décisions 1 et 2 de la stratégie.

## 2026-09-09 (36) — audit Codex V3 reçu, vérifié, et stratégie d'amélioration

Demande : « regarde audit v3 proposé par codex et développe la stratégie d'amélioration ».

**Fait** :
- Lecture de `audit codex/AUDIT_V3.md` (hors dépôt, daté du 2026-09-09 sur v0.12.14, commit `ab8cb24`) et de ses preuves (`V3_SUITE`, `V3_CIBLES`, `V3_SW`, `V3_VOLUME`, `v3-cibles.spec.mjs`). Verdict de l'audit : suite verte (189 exécutions), **5 constats P2/P3 reproduits**, aucun P0/P1.
- **Vérification indépendante** par workflow (6 agents en lecture seule, `git status` propre après) + mes propres relectures.
- **Stratégie écrite** : `docs/strategie-audit-v3.md` — les 5 constats regroupés en **3 familles** (état accepté qui diverge de l'état écrit ; export Pronote qui promet plus qu'il ne sait ; sauvegarde qui sort du domaine restaurable), un plan en **6 lots** sur **3 versions**, les critères de sortie, et **4 décisions** à te soumettre.

**Ce que je retiens, sans le maquiller** :
- **V3-01 est une régression de la veille** : le champ « barème modifiable » (C15, v0.12.14) mute l'objet AVANT l'écriture, donc une valeur refusée est persistée plus tard par une modification sans rapport. Ce n'est pas un cas isolé : le motif existe sur **18 sites** dans 5 modules. La saisie d'une note, elle, fait déjà l'inverse (écrire puis mettre à jour la mémoire) : c'est le modèle à généraliser.
- **V3-05 est une incohérence que j'ai créée** : le plafond d'import de 200 Mio (A33, v0.12.14) rend non restaurable une sauvegarde que l'app accepte de produire (8 Mio par pièce, +33 % en base64, aucun plafond cumulé → domaine restaurable ≈ 150 Mio de pièces, soit ~18 pièces au plafond).
- **V3-02** touche AUSSI l'export CSV (vérifié : les deux boutons lisent la même table en mémoire), ce que l'audit soupçonnait sans l'avoir reproduit.
- **Le piège du barème** (contrôle positif V3-C2 de l'audit) : passer /10 à /20 conserve les points, donc divise par deux la moyenne de la classe en silence. Le geste que j'ai ouvert hier doit être rendu sûr avant de servir.

**Décidé** : rien n'est corrigé par cette passe. Le plan attend ta réponse sur 4 points (sens de « publiée », conversion des notes au changement de barème, conduite à tenir sur une sauvegarde trop lourde, ampleur immédiate).

**Prochaine étape** : ton arbitrage, puis le lot **V3-A** seul (correction de classe, 5 modules, ~5 tests) dans sa propre version.

## 2026-09-09 (35) — v0.12.14 : avis du lot 5 (points retenus), A39, projet de tests mobile

**Fait** :
- **A39** : la branche navigation du service-worker passe en cache-first + revalidation en arrière-plan ; 2 tests avec le **service-worker réel** (hôte de bouclage hors localhost) — l'un prouve qu'une navigation aboutit alors que le réseau ne répond JAMAIS (avant : `page.goto` expirait), l'autre que la revalidation met à jour le cache sans changer la réponse du jour.
- **C15** (barème modifiable, type figé), **C45** (année affichée hors année scolaire courante), **A33** (plafond d'import 200 Mo avant lecture), **D-08 (3)** (poids des pièces par curseur), **A34 (a)** et **A31 (a)** (champs et paramètres morts), `octetsLisibles` remonté dans metier.js.
- **C60** : projet Playwright « mobile » (Pixel 7 émulé) limité aux specs d'écran ; B31 réécrit pour prouver la règle dans les deux sens (aide clavier visible sur pointeur fin, masquée sur tactile).
- **Défaut trouvé en chemin** : le champ barème a révélé une **réentrance de re-rendu** dans `vueEval` — deux `change` rapprochés lançaient deux rendus concurrents qui empilaient deux vues. Corrigé à la source (un seul re-rendu à la fois).

**Décidé** : C44 (1) et C16 (2) écartés (raisons dans le CHANGELOG). A01 reste ta décision.

**Coincé / à vérifier** : sur l'appareil, l'ouverture de l'app en mode avion (elle doit être immédiate) et le champ barème sur une évaluation existante.

**Déployé** : main `97c4278`, gh-pages `21679d5`, tag `v0.12.14` (2026-09-09).

**Prochaine étape** : l'avis sur les **grilles d'évaluation EPS** (critères, niveaux, pondérations, note ramenée sur 20), demandé le 2026-09-09 — à rédiger avant tout code, en s'inspirant des grilles d'iDoceo.

## 2026-09-09 (34) — v0.12.13 : lot 2 (créations atomiques) + intégration continue

Demande : « fait comme tu penses le mieux » — j'ai tranché les trois avis en attente (voir « Décidé »).

**Fait** :
- **Lot 2 appliqué** (avis `docs/avis/AVIS_CREATIONS_ATOMIQUES.md`, validé par délégation) : `preparerFichier` + `enregistrerLot`, les cinq créations à pièce jointe et l'import CSV en une transaction. 14 patchs à ancrage exact sur 5 fichiers.
- **Tests** : `tests/e2e/audit5-lot2.spec.mjs` (5) — sabotage de `IDBObjectStore.prototype.put` sur UN store, puis vérification qu'il ne reste ni fichier orphelin ni enregistrement partiel ; pour l'import, comptage des transactions readwrite (1 au lieu de 33 pour 30 élèves) et sabotage à mi-parcours. Suite **158/158**.
- **Intégration continue** (C64) : `.github/workflows/tests.yml` — `npm ci`, navigateur épinglé, suite complète à chaque push et pull request ; artefacts (rapport HTML, traces) sur échec.

**Décidé** (délégation « fais comme tu penses le mieux ») :
- **Lot 2 : go**, appliqué ici — robustesse interne, aucune migration, retour arrière par `git revert`.
- **A01 (origine dédiée) : je ne tranche pas seul.** Changer d'adresse oblige à réinstaller la PWA sur le téléphone, à migrer les données par export/import sur chaque appareil, et demande une action sur le compte GitHub. C'est une décision qui t'appartient : l'avis reste ouvert, la limite reste documentée (`AVIS_ORIGINE_DEDIEE.md`, recommandation : organisation GitHub dédiée, gratuite).
- **Avis des restes du lot 5** : retenus pour la suite immédiate — C15 (barème modifiable), A34 (a) (retrait du champ mort `annulee`), C45 (b) (année affichée hors année scolaire courante), A31 (a) (paramètre mort), A33 (plafond d'import), D-08 (3) (taille des pièces), C60 (projet mobile Playwright) ; **écartés** : C44 (1) (décodage redimensionné — à mesurer sur ton Android d'abord) et C16 (2) (confirmation avant copie — risque de perdre l'activation utilisateur de Chrome).
- **A39** (index.html servi depuis le cache) : retenu, à faire avec le reste — la branche document attend le réseau sans délai maximal, l'app peut paraître figée au démarrage dans un gymnase.

**Coincé / à vérifier** : sur l'appareil, ajouter une inaptitude avec photo puis la remplacer (le geste que le lot rend atomique) ; première exécution de l'intégration continue à surveiller.

**Déployé** : main `4b698a8`, gh-pages `3e04344`, tag `v0.12.13` (2026-09-09).

**Prochaine étape** : v0.12.14 avec les points retenus de l'avis du lot 5 + A39 + le projet mobile Playwright ; puis l'avis sur les **grilles d'évaluation EPS** (demande du 2026-09-09).

## 2026-09-08 (33) — v0.12.12 : lot 5 (tests, qualité, documentation), 72 constats triés, 63 traités, 35 tests + avis des restes

Demande : « fait au mieux » (GO discrétionnaire) — lot 5, le seul non bloqué par les deux avis en attente.

**Fait** :
- **Triage par workflow** (9 agents en lecture seule, un par thème, contre le code réel v0.12.11 : les numéros de ligne du rapport étaient périmés) : 51 constats présents, 15 partiels, 6 déjà corrigés par les lots 1/3/4 ; pour chacun un ancrage exact, un correctif minimal et un test **rouge aujourd'hui**. Coupé une fois par la limite de session (1 thème sur 9 rendu), repris par `resumeFromRunId` (le thème rendu a été rejoué depuis le cache).
- **Quatre patchs à ancrage exact** (a : données io.js ; b : import + notes ; c : appel, métier, main, media ; d : sécurité, config des tests, couverture, D-10) = 119 remplacements sur ~30 fichiers, chaque groupe joué **rouge avant, vert après** ; deux scripts de docs (29 + 12 remplacements). Détail par constat : CHANGELOG.
- **Tests** : `tests/e2e/audit5-lot5.spec.mjs` (34) + 6 tests et 4 renforts dans `regressions.spec.mjs`, smoke-tests 1 et 6 renforcés. Preuves notables : séquence d'événements R/L et F/D pour prouver la conversion **une à une** des blobs (un compteur « en vol » aurait été trompé par la file de microtâches) ; horloge de page fixée (`page.clock.setFixedTime`) sous `timezoneId: 'Europe/Paris'` pour D-09 et C49 ; base v1 recréée à la main sans l'index `classeId` pour D-11/C30 ; compteur de transactions pour A27 ; garde de cohérence **dérivée du code** (restrictions, champs EDT, préférences, compte des tests) pour C57/C59.
- **Avis** `docs/avis/AVIS_LOT5_RESTES.md` : neuf points non appliqués (C15, A34, C45, A31 b, A33, C60, D-08 3, C44 1, C16 2), une recommandation par ligne.
- **CLAUDE.md** modifié (deux lignes : Playwright à installer depuis le terminal de l'utilisateur ; identifiants composites `appels`/`notes`).

- **Revue adversariale** (4 lentilles Opus, 34 constats, 2 réfutateurs par constat — première passe coupée par la limite de session après les lentilles, reprise) : 7 corrections de code/config (UTF-16 sans BOM : les NUL entre `\r` et `\n` faisaient une ligne fantôme par enregistrement ; A27 : l'instantané réappliqué après l'`await` écrasait un tap fait pendant l'écriture — la boucle séquentielle d'avant était immunisée ; import : `suite.replaceChildren()` avant toute analyse ; `ge-titre` au contrat ✗ ; une seule lecture d'horloge pour `dateExport` ; X-Racine = empreinte SHA-256 au lieu du chemin — le serveur écoute sur toutes les interfaces et le parcours Android passe par le LAN ; commentaire/doc D-11), 8 preuves renforcées, 12 écarts de docs (dont TODO/roadmap qui disaient le lot 5 livré ET à faire, C30 compté « déjà couvert » alors que son test naît ici, C36 absent du CHANGELOG, chiffrage C60 de l'avis faux, `package-lock.json` non régénéré).

**Décidé** : A28 rabat un statut inconnu en « présent » (règle déjà appliquée par l'écran d'appel, B34) plutôt qu'une colonne « autre » ; C53 appliqué sans avis parce que la spécification (`fonctionnalites.md` §5) l'annonçait déjà ; B44 visible à l'écran aussi (le projet n'a pas de classe « impression seulement ») ; C16 message seulement, pas de confirmation avant copie (activation utilisateur).

**Coincé / à vérifier** : sur l'appareil, l'écran Aide réécrit (B38 : formulations « ⋮ », bannière), la ligne « édité le » sur les impressions, la pastille 🩺 dans les listes ; `npm ci` chez toi (C20) ; la fiche terrain reste à faire une fois.

**Déployé** : main `fb23028`, gh-pages `d739ead`, tag `v0.12.12` (2026-09-08).

**Prochaine étape** : tes décisions sur les trois avis (lot 2, A01, restes du lot 5) ; A39 et la CI (C64) restent à cadrer.

## 2026-09-08 (32) — v0.12.11 : lot 4 (service-worker et performance, 17 constats), 10 tests + avis lot 2 et A01

Demande : « continue non? » → avis en attente rédigés, puis lot 4.

**Fait** :
- **Deux avis** : `docs/avis/AVIS_CREATIONS_ATOMIQUES.md` (lot 2 : `preparerFichier` + `enregistrerLot`, 5 tests prévus) et `docs/avis/AVIS_ORIGINE_DEDIEE.md` (A01 : options A documenter / B sous-domaine payant / C organisation GitHub dédiée gratuite — recommandation C ; la migration = export → import par appareil). Rien d'appliqué.
- **Lot 4** : service-worker réécrit à stratégie constante (A17, A18, A19, A20, A40, A41 ; A39 écarté : stratégie → avis), lectures par index dans les trois écrans d'appel (C02), `compterTout` par `count()` (A23), plafond 8 Mo + PDF sans recopie et URL 60 s (C07, C08, B14, B39), `estLocalhost` sur `isSecureContext` (A35), manifest `id` + theme-color par thème (A37, A38), `app/.nojekyll` + `docs/modules.md` (A42). 18 patchs + réécriture du SW.
- **Tests** : `tests/e2e/audit5-lot4.spec.mjs`, 10 tests — trois avec le **service-worker réel** sur `app.localhost` : couverture du précache par les requêtes d'un chargement (A43), fichier pirate dans un cache voisin non servi (A18), hors ligne réel par `context.setOffline` (504 sur un fichier absent, index.html en repli de navigation, manifest précaché) ; `statechange` simulé pour A20 (échec puis activation → bouton) ; espions sur `getAll` du store ET des index + compteur de transactions pour C02 (5 040 appels semés en une transaction, volume lu mesuré par écran) et sur `count` pour A23 ; 9,0 et 8,2 Mo refusés ; `window.open`/`revokeObjectURL` stubés ; redirection réelle (`/__test/redirige` du serveur de dev) jamais mise en cache. **112/112** (11 tests).
- **Revue adversariale du diff** en deux passes (la première coupée par la limite de session, reprise par `resumeFromRunId`) : 3 lentilles Opus (PWA, exactitude des lectures optimisées, preuves) + 2 réfutateurs par constat, 26 + 31 agents, 24 constats. **Corrigés** : C02 accueil (une transaction par séance = 2× plus lent qu'une lecture complète, mesuré par trois réfutateurs → `parIndexLot`, une transaction, employé aux 4 sites), visionneuse Documents sans blob, theme-color = thème effectif, message « 8,2 Mo », `rep.ok` sur l'exemple CSV, bouton « Recharger maintenant » (chemin `controllerchange` avalé confirmé par un réfutateur). **Tests réécrits** parce qu'ils passaient aussi avec l'ancien code : A18 (chemin absent du précache), A35 (hôte hors liste), A40 (manifest retiré du cache), C02 (sonde sur les index + transactions ; vérifié par mutant : 10 transactions détectées), A19 comportemental (mutant `rep.ok` détecté). **Réfutés, non appliqués** : garde positive par type MIME (les assets précachés n'atteignent jamais la branche réseau), échec explicite si les tests SW se sautent (Chromium résout `*.localhost` nativement), `window.open` bout en bout (pas de défaut, PDF non rendu en headless), `.nojekyll` non suivi (état normal avant commit), libellé « localhost » de Réglages sur 192.168.x.x (l'information portée, « hors-ligne désactivé », est vraie).

**Décidé** : A39 (index.html cache-first) reste un choix de stratégie à trancher par avis ; lot 2 et A01 attendent ton « go ».

**Coincé / à vérifier** : sur l'appareil, ouverture d'un certificat PDF (onglet, 60 s) ; validations terrain (fiche 15 min). Leçons de ce lot : un test qui normalise la propriété qu'il annonce (CRLF → LF) ne la teste pas ; une liste de fichiers écrite à la main dans un lint épouse le correctif, pas la règle ; un compteur « en vol » est trompé par les microtâches (séquence d'événements R/L à la place) ; un instantané pris avant un `await` ne doit pas être réappliqué sans vérifier l'état courant ; les docs de pilotage (TODO, roadmap, CLAUDE.md) se recalent en DERNIER, sinon elles disent une chose et son contraire. Leçons d'outillage : une sonde sur `IDBObjectStore.getAll` est aveugle aux lectures par `IDBIndex.getAll` ; une lecture « par index » n'est un gain que si le volume lu baisse ET si les transactions ne se multiplient pas ; un `resumeFromRunId` après édition du script relance les lentilles (résultats différents, non déterministes) — ne pas supposer que la cache a rejoué.

**Déployé** : main `82939d6`, gh-pages `86dae78`, tag `v0.12.11` (2026-09-08).

**Prochaine étape** : tes décisions sur les deux avis ; lot 5 (tests, qualité, documentation) au fil de l'eau.

## 2026-09-07 (31) — v0.12.10 : lot 3 du 5e audit (accessibilité et mobile, 35 constats), 25 tests, revue adversariale (12 défauts corrigés)

Demande : « ton avis ? puis lot 3 » (après « quelle suite ? »).

**Fait** :
- Avis donné sur les validations terrain : fiche Android à faire UNE fois après ce lot (il touche les écrans mobiles), B31 clavier virtuel traité préventivement ici (`interactive-widget=resizes-content`), import Pronote réel hors de portée (aucune donnée nominative ne doit passer par ici : en cas d'échec, en-tête + une ligne inventée suffisent).
- **35 constats** (34 du lot 3 + B31 du 4e audit) en 100 patchs à ancrage exact sur index.html, 3 feuilles CSS et 12 modules JS ; helpers `rerendre(c, rendu)` (re-rendu qui restitue le focus) et `groupe(libelle, controle)` (fieldset/legend) dans ui.js ; `.sr-only`, `.saut`, `.table-scroll`, `fieldset.groupe`, token `--c-bord-controle`. B07 (⚙ dans le plan) tenu dans le lot : wrapper + scope + caption, aucun fichier nouveau.
- **Tests** : `tests/e2e/audit5-lot3.spec.mjs`, 25 tests (contraste mesuré par formule WCAG sur les couleurs calculées, `emulateMedia({ media: 'print' })`, `reducedMotion`, 320 px, police à 200 %, focus séquentiel, région live observée par MutationObserver). **101/101**.
- **Deux défauts attrapés par ces tests** avant livraison : le token de contour sombre recommandé (#59688a) ne faisait que 2,84:1 sur la surface sombre → #61708f (3,2:1) ; la barre de navigation était RÉAFFICHÉE à l'impression sur PC (responsive.css chargée après base.css remettait `display: flex`) → `!important`. Une sonde à 320 px a aussi montré que les `.sr-only` absolus des cellules élargissaient la page (le conteneur de défilement n'était pas positionné) → `.table-scroll { position: relative }`.
- Pièges : `page.goto` rend la vue de façon asynchrone (attendre un élément avant `evaluate`) ; `disabled` sur le bouton focalisé renvoie le focus au body (→ `aria-disabled`) ; la vue focalise `#vue` au rendu, donc le focus posé sur un toast juste avant une navigation était repris (garde dans `afficherVue`) ; un script Playwright hors du dépôt ne résout pas `@playwright/test` (le copier dans le dépôt le temps de la sonde).
- **Revue adversariale du diff** : workflow 4 lentilles Opus (a11y, rendu, régressions, preuves) + 2 réfutateurs par constat (48 agents, ≈ 3,7 M tokens, 24 min). **12 défauts confirmés et corrigés avant livraison**, dont trois de mon fait dans ce même lot : le lien d'évitement `href="#nav-principale"` était pris pour une route par le routeur (retour à l'accueil, focus repris par la vue) → clic intercepté en JS ; la vue prenait le focus dès le chargement, donc le lien n'était jamais atteint en tabulation avant → pas de focus au premier rendu ; le `<span class="sr-only">seuil atteint</span>` était enfant du `<tr>`, hors cellule. Et des défauts préexistants révélés par le lot : `hidden` inopérant sur `.btn`/`.champ` (règle globale `!important`, les deux rustines ponctuelles retirées) ; nom long sous le bouton « ⋯ » à 320 px (désormais 2 colonnes) ; nav hors écran à 200 % de police (suite de B30) ; `<caption>` coupée dans le conteneur défilant ; toast : focus programmatique qui annulait son minuteur, bouton qui se supprimait sous le focus ; motif de note refusée hors écran et effacé par la saisie suivante ; « Appel complet ✓ » réannoncé à chaque tap. Quatre de mes tests passaient aussi sans correctif (écrêtage du défilement par le navigateur, Chromium de bureau qui matche déjà `pointer: fine`, `env()` = 0 hors encoche, stub `navigator.storage` détruit par le rechargement) → réécrits pour prouver l'appel, la règle CSS ou le stub posé avant chargement.

**Décidé** : B07 traité sans avis séparé (périmètre minimal). Le clavier virtuel Android reste à confirmer sur l'appareil (fiche terrain, case 4 bis).

**Coincé / à vérifier** : validations terrain Android (fiche retaillée à 15 min, points v0.12.9 + v0.12.10) ; import Pronote réel.

**Déployé** : main `5bfdf3f` (+ `2b829c8` docs), gh-pages `89766c9`, tag `v0.12.10`, site vérifié en 0.12.10.

**Prochaine étape** : avis lot 2 (créations atomiques) et avis A01 (origine dédiée) ; lot 4 (service-worker et performance) ; lot 5 (qualité).

## 2026-09-07 (30) — v0.12.9 : lot 1 du 5e audit (44 constats), 43 tests, revue adversariale (19 constats corrigés)

Demande : « fait au mieux » = GO discrétionnaire sur le plan du rapport, lot 1 d'abord.

**Fait** :
- **79 patchs** à ancrage exact (script `patcher.mjs` hors dépôt : refus si l'ancrage est absent ou ambigu, aucune écriture partielle) sur 17 fichiers `app/` + `.gitignore` ; `node --check` sur tous les modules ; suite existante rejouée d'abord (31/33 : B22 et B30 cassés par des changements voulus → libellé « et » rétabli, borne 1er août reportée dans le test).
- **Choix d'implémentation** notables : `depasseSeuil(cumul)` et `SEUIL_MEDECIN_JOURS` exportés de `metier.js` (fin des trois périmètres différents du seuil) ; `bornesTrimestres` retombe sur les défauts si T2 ≤ T1 ; `coursDuJour` exclut les classes archivées ; `inaptesMap` (la plus contraignante par élève) + `statutInapte()` partagés entre pré-remplissage, pastille et « Terminer » ; `mimeSur(f)` dans `media.js` ; `effacerPrefs()` dans `state.js` ; `CHAMPS_TEXTE` / `CHAMPS_ELEVE` dans `io.js` ; validations d'édition qui **lèvent** dans `onChange` → `brancherRetour` affiche ✗ + toast (une seule mécanique pour A16, V2-02, B42) ; « Annuler » qui lève → « Annulation impossible : … » (D-01 + D-03 avec la même mécanique).
- **Tests** : `tests/e2e/audit5-lot1.spec.mjs`, 43 tests = 13 reproductions du scratchpad inversées + 30 nouveaux (dont C10 avec une transaction IndexedDB maintenue ouverte par des lectures en chaîne puis abandonnée sur signal, A04 sur une instance neuve du module `io.js?instance-neuve`, purge de bout en bout avec téléchargement). **76/76**.
- Pièges rencontrés : `fill()` de Playwright n'émet `change` que sur les champs date (valeur posée directement) — sur number/text il tape, donc `dispatchEvent('change')` reste nécessaire, et l'inverse double l'événement ; `page.goto` sur une URL identique ne re-rend pas la vue (→ `reload()`) ; toasts empilés → `.last()`.
- **Revue adversariale du diff** : workflow 5 lentilles Opus (régressions, intégrité des données, règles métier, robustesse, qualité des preuves), chaque constat soumis à 2 réfutateurs (≈ 50 agents). Les lentilles ont lu les fichiers réels pendant que je corrigeais : beaucoup de réfutations « déjà corrigé » ; au total **19 constats confirmés et corrigés avant livraison** (P1 : le retour arrière de `definirStatut` restaurait `prec`, jamais confirmé en base → map `confirmes` ; P2 : minuterie du ✓ effaçant le ✗, valeur refusée laissée dans les champs date/nombre, notes des trimestres figées + ordre vérifié contre la voisine effective au lieu de la voisine enregistrée, ratio notes « n/effectif » global au lieu de par classe, départage arbitraire entre deux inaptitudes totales, minutes > 120 rejetées en silence, `lireLot` non aligné sur D-07, alerte A09 pour une classe archivée, moyenne de classe avec les partis et CSV sans mention ; P3 : chips de la fiche hors année, fuite d'URL blob (PDF / image illisible), `compterTout` sans catch, fin de trimestre en août acceptée ; lentille régressions : alertes non triées par gravité avant la troncature à 8 de l'accueil, seuil d'oublis encore émis pour une classe archivée, colonne ⚠ du récap sur la période sans le dire, comptage des pièces relancé à l'import) + **un test de la revue qui ne prouvait rien** (C10 « deux échecs d'affilée » passait aussi avec l'ancien code : échecs séquentiels) réécrit avec deux transactions concurrentes. Constat **tranché contre les relecteurs** (3 lentilles l'ont remonté, 4 réfutateurs l'ont écarté) : le pré-remplissage « dispensé (mot) » alimente le seuil D012 — c'est l'effet demandé par l'audit (C01) : trois séances non pratiquées sur un simple mot appellent un certificat ; consigné dans D013 avec la piste inverse (marquer les enregistrements posés d'office) si le terrain le juge gênant.

**Décidé** : D013 (pré-remplissage selon type et origine de l'inaptitude ; année scolaire des bornes au 1er août). Les constats sans test dynamique : D-07 (erreur de requête asynchrone non simulable de façon déterministe) et A03 (`git check-ignore` vérifié à la main).

**Coincé / à vérifier** : validations terrain (fiche `docs/test-terrain.md`), B31 ; `npx playwright install chromium` depuis le terminal de l'utilisateur.

**Déployé** : main `769528e` (+ `e27615b` docs), gh-pages `f6da580`, tag `v0.12.9`, site vérifié en 0.12.9.

**Prochaine étape** : lot 2 (créations atomiques) = avis à rédiger ; avis séparé A01 (origine dédiée) ; lots 3 à 5.

## 2026-09-07 (29) — 5e audit sur v0.12.8 : Codex V2 + 13 lentilles en 3 lots

Demande : « nouvel audit je pense », puis « il y a un audit Codex avant » (`audit codex/AUDIT_V2.md`).

**Fait** :
- **Codex V2** lu et rejoué : 33/33 sur Chrome, 6 défauts reproduits par tests (V2-01…06), 3 contrôles positifs (aller-retour 14 stores, SW hors ligne réel via `app.localhost`, import par l’interface). Ses 9 tests passent ici (9/9). Son premier lancement n’a pas trouvé le navigateur Playwright : **le binaire installé par Claude vit dans le cache MSIX virtualisé** (`Packages\Claude_…\LocalCache\Local\ms-playwright`), invisible d’un terminal normal — Codex a basculé sur `channel: 'chrome'`.
- **Workflow 13 lentilles** : refusé deux fois (limite de session, puis limite du modèle Fable pour les sous-agents), ≈ 1,6 M de tokens perdus. Relancé **par lots avec des sous-agents Opus** (script `audit5-lot`, paramètre `model`) : lot données (Fable, seul rescapé : 15 constats), lot A (revue des changements, logique, sécurité, PWA : 43), lot B (a11y, terrain, mobile, limites : 51), lot C (perf, qualité, tests, Pronote : 64). Chaque lot fusionné avec relecture des preuves ; 71 doublons écartés.
- **Rapport `docs/audit-2026-09-07.md`** généré depuis les JSON structurés (+ `docs/audit-2026-09-07.json` complet) : **179 constats** — 0 P0, **9 P1**, 86 P2, 84 P3. P1 : B02 (« Terminer » sur séance passée → inaptes « présents »), C01 (pré-remplissage inapte pour partielle/mot), A02 (créneau d’une classe archivée → `classeId: ''`), D-01 (« Annuler » muet), B04 (nouvelle inaptitude sur le mauvais élève), B01 (focus rogné), B03 (photo/certificat hors clavier), A01 (origine partagée), C02 (4 écrans lisent tout `appels`).
- **Reproductions** : spec temporaire (13 tests : A02, A05, A06, A07, A12, A16, A25, D-01, D-02, B01–B04) → 13/13, conservé dans le scratchpad de session (hors dépôt) pour devenir des tests de non-régression.
- Plan en 5 lots + décisions structurantes ; docs de suivi à jour. Aucune correction appliquée.

**Décidé** : pas de contre-vérification adversariale des 170 P2/P3 en bloc (≈ 5 M de tokens) — elle se fera lot par lot avant correction, par reproduction. Sous-agents : Opus dès que la limite Fable tombe.

**Coincé / à vérifier** : `npm test` côté utilisateur exige `npx playwright install chromium` depuis SON terminal (cache virtualisé). Dossier `audit codex/` hors git (ignoré).

**Prochaine étape** : GO sur le lot 1 (v0.12.9) ; avis pour le lot 2 et pour A01 (origine dédiée).

## 2026-09-06 (28) — Retour Codex : hypothèses H01–H05 vérifiées et corrigées (v0.12.8)

L’utilisateur a transmis la stratégie d’audit d’une autre IA (`audit codex/STRATEGIE_AUDIT.md`, dossier non suivi par git). Pas de constats dedans, mais 5 hypothèses précises et un signalement de dérive documentaire.

**Fait** :
- **Vérification indépendante** : workflow de 6 agents (un par hypothèse + un pour la doc), lecture seule, fichier:ligne à l’appui → **5/5 démontrées** : H03 durabilité (P2 : `attendre()` résolvait sur `req.onsuccess`, pas `tx.oncomplete` → quota plein = « ✓ » sans écriture), H05 caches (P2 : `activate` supprimait TOUS les caches de l’origine `alemoine4.github.io`, donc le precache Workbox du Bar Clandestin ; Workbox, lui, ne nettoie que ses `-precache-`), H01 purge non atomique (P3, oubliée dans B29), H02 export sans instantané (P3), H04 doublons d’id non détectés + stores absents vidés sans le dire (P3). Dérive doc confirmée (7 écarts : roadmap, TODO, CLAUDE.md, fiche terrain, README, rapport) → corrigée, commit `63cdc46`.
- **Avis `AVIS_DURABILITE_ECRITURES.md`** rédigé, validé (« GO »), appliqué : `io.js` (`enregistrer`/`supprimer`/`vider` via `ecrireLot` → résolution au commit ; `viderTout` ; `lireLot` readonly pour `exporterJSON`/`compterTout` ; `validerExport` refuse les doublons et renvoie `absents`), `sauvegarde.js` (purge protégée + bouton désactivé, confirmation « ne contient pas : observations → seront vidées »), `service-worker.js` (`k.startsWith('carnet-eps-')`). Bump → **0.12.8**.
- **Tests** : 5 nouveaux — H03 mutant réel (`IDBObjectStore.prototype.put` patché pour abandonner la transaction après le succès de requête : avant correctif ça résolvait), H01 (une seule transaction de 14 stores, comptée via `IDBDatabase.prototype.transaction`), H02 (écriture lancée juste après l’export absente du dump), H04 (doublon refusé, `absents` contient `observations`), **H05 = premier test réel du service-worker** : navigation sur `http://app.localhost:8160` (Chromium résout `*.localhost` en boucle locale, contexte sécurisé, mais `estLocalhost()` faux → le SW s’enregistre), caches voisins créés avant, vérification après activation. Suite **33/33**.
- Docs : `modele-donnees.md` (durabilité, instantané, purge, import strict), CHANGELOG, TODO, README, README des tests, fiche terrain (Bar Clandestin hors ligne après mise à jour), avis (statut appliqué). Mémoire du projet whisky annotée (interférence d’origine).

**Décidé** : rien de structurant au-delà de l’avis. Règle apprise pour les tests : `page.waitForFunction` ne doit pas recevoir de fonction asynchrone (la promesse est prise pour un « vrai » immédiat) → `expect.poll`. Un `.csv` en page de préparation déclenche un téléchargement : utiliser une feuille CSS.

**Coincé / à vérifier** : rien. Le dossier `audit codex/` reste hors git, à la main de l’utilisateur.

**Prochaine étape** : déployer v0.12.8 ; validations terrain (fiche v0.12.7) ; B31 (Android).

## 2026-09-06 (27) — Cascades et annulations atomiques (avis B29 → v0.12.7)

Avis `AVIS_CASCADES_ATOMIQUES.md` rédigé sur demande, validé « go pour les deux phases », appliqué dans une seule version.

**Fait** :
- `io.js` : helper interne `ecrireLot(operations)` = UNE transaction `readwrite` sur les stores concernés, requêtes émises d’un bloc (put / delete / clear), `tx.abort()` sur exception synchrone, store inconnu refusé avant ouverture. `supprimerLot(objets)` (nouvel export) et `restaurer(objets)` construits dessus ; les 3 cascades collectent (lectures par index, `collecterSeance` interne) puis suppriment en un lot — signatures et retours `{ store: [records] }` inchangés ; `importerJSON` = une transaction sur les 14 stores (clear + puts).
- Phase 2 : `notes.js` (évaluation + notes), `inaptitudes.js` (inaptitude + certificat + pièce), `documents.js` (document + pièce) et leurs annulations passent par `supprimerLot` / `restaurer` ; imports inutiles retirés.
- Tests : 3 tests B29 (restauration atomique sur enregistrement sans clé, suppression atomique sur store inconnu / clé absente, import laissant tous les stores intacts sur une valeur non clonable) → suite **28/28** sans modification des tests existants.
- **Mesure** (spec temporaire, séquence 10 séances × 28 appels + 3 évals × 28 notes = 380 enregistrements) : suppression **76 → 27 ms**, restauration **74 → 15 ms**.
- Docs : avis (statut appliqué), `modele-donnees.md` (règle d’atomicité), `architecture.md` (couche données), CHANGELOG, TODO, README, README des tests. Bump → **0.12.7**.

**Décidé** : rien de nouveau (l’avis vaut décision). Règle de code désormais écrite : un module n’enchaîne plus des `supprimer()` / `enregistrer()` pour une opération logiquement unique.

**Coincé / à vérifier** : rien. Fenêtre lecture → écriture (autre onglet) documentée comme acceptable.

**Prochaine étape** : déployer v0.12.7 ; validations terrain (fiche v0.12.4) ; B31 (Android).

## 2026-09-06 (26) — Vision par trimestre (D012, B30 → v0.12.6)

Décision de l’utilisateur : « les oublis cumulatifs année mais aussi vision trimestre ».

**Fait** :
- `metier.js` : `anneeScolaireDe`, `decalerJours`, `trimestreDe`, `bornesTrimestres` (meta `finTrimestre1/2` retenues seulement dans la même année scolaire, sinon 15/12 et 15/03), `periodeTrimestre`, `compterStatutsParTrimestre` (jointure appels × séances : la date vit sur la séance). `collecterAlertes` garde le seuil annuel et ajoute « (T2 : n) ».
- `reglages.js` : carte « Trimestres » (2 dates). `eleves.js` : tableau T1/T2/T3/Année sur la fiche, signalement « sur l’année (T… : …) ». `appel.js` : périodes rapides T1/T2/T3/Année sur le récap (`aria-pressed`, réinitialisées si l’on touche aux dates), pastille ⚠ avec le détail du trimestre de la séance. Aide in-app + guide de rentrée (étape 2).
- Docs : `decisions.md` **D012**, `fonctionnalites.md` §4 (corrigé : « sur le trimestre » → cumul annuel + vision trimestre), `modele-donnees.md` (clés meta, dont `semaineAReference` qui n’était pas documentée).
- Tests : 4 tests B30 (bornes/réglage, fiche, récap, alerte), robustes au changement d’année scolaire (dates calculées depuis l’année en cours) — suite **25/25**.

**Décidé** : D012 (dans decisions.md). Année scolaire = août → juillet ; bornes d’une autre année scolaire ignorées (évite un réglage périmé après la purge de rentrée).

**Coincé / à vérifier** : rien.

**Prochaine étape** : déployer v0.12.6 ; validations terrain ; B29 (avis si retenu) ; B31 (Android).

## 2026-09-06 (25) — Déploiement v0.12.4 + dédoublonnage B27 (v0.12.5)

**Fait** :
- **v0.12.4 déployée** (détail dans l'entrée 24) : push `main`, gh-pages `0391552`, tag `v0.12.4` ; site public vérifié en 0.12.4 après le rebuild Pages.
- **B27** : avis `AVIS_DEDOUBLONNAGE_HELPERS.md` rédigé, validé (« continue oui »), appliqué : `metier.js` (+`trierEleves`, `trierClasses`, `normaliser`, `cleTexte`, `baremeDe`, `formatFR`, `jours` ; le `jours` local de `collecterAlertes` supprimé), `ui.js` (+`champ`), 7 modules allégés (`appel`, `documents`, `edt`, `eleves`, `inaptitudes`, `notes`, `sequences`), 2 arrondis inline de la fiche élève → `formatFR`. `docs/architecture.md` : règle « un module ne redéfinit jamais un helper de `metier.js`/`ui.js` ».
- Vérifié : `grep` des anciennes copies = 0 ; `npm test` **21/21 sans modification des tests**. Bump → **0.12.5**.

**Décidé** : rien de structurant (refactor pur). Piège relevé : les fichiers du dépôt contiennent les caractères combinants **littéraux** dans la regex de `normaliser` (`[̀-ͯ]`) malgré la note de juin sur les échappements — `metier.js` est écrit avec les échappements `\u0300-\u036f` explicites (posés par script : l’outil d’édition convertit lui-même les séquences `\u`).

**Coincé / à vérifier** : rien. Reliquats inchangés : B29 (AVIS séparé si retenu), B30 (décision), B31 (Android).

**Déployé** : v0.12.5 poussée le 2026-09-06 (commit `f7093fa`, gh-pages `77dda4a`, tag `v0.12.5`), `app/` ≡ gh-pages vérifié.

**Prochaine étape** : validations terrain (fiche v0.12.4) ; roadmap post-v1 (observation depuis l'appel, dashboard enrichi, évals EPS A1–A5).

## 2026-09-05 (24) — 4e audit (34 constats) + correctifs v0.12.4

Demande : « réfléchis à la meilleure stratégie pour auditer et améliorer, puis effectue le tout ».

**Stratégie retenue** : référence factuelle d'abord (tests, versions, synchronisation git), puis audit à 12 lentilles (logique métier, sécurité/RGPD, PWA/SW, WCAG 2.2, terrain prof d'EPS, intégrité des données, performance, qualité/dérive documentaire, tests, Pronote, responsive, cas limites), les 16 constats de juillet exclus ; chaque hypothèse **vérifiée par mesure** (Playwright, calcul WCAG en Node) avant d'être retenue ; corrections non structurantes appliquées avec un test de non-régression chacune, structurantes reportées.

**Fait** :
- Le workflow multi-agents prévu (12 lentilles + réfutateurs) a été refusé par la limite de session : l'audit a été mené **en solo** avec la même grille, lecture intégrale des 24 fichiers de `app/` (5 500 lignes). Rapport : **`docs/audit-2026-09-05.md`** — 34 constats (2 P1, 11 P2, 21 P3), **30 traités**, 4 reportés.
- 7 hypothèses testées par un spec Playwright temporaire (supprimé) : 6 confirmées, 1 réfutée (le défilement revient bien en haut après navigation).
- **P1** : grille d'appel à **1 colonne sur 360 px** (`minmax` 160 → 150 px) ; import JSON altéré qui **vidait un store** (DataError synchrone → `clear()` validé) → validation de chaque enregistrement avant toute écriture + `tx.abort()`.
- **P2** : `pointercancel` (défilement ouvrait le menu), double tap perdu (état mis à jour avant l'écriture), double clic « Créer la séance » (accueil + sélecteur), compteur « saisis » sur les élèves actuels, rouge d'alerte thématisé (3,3:1 → 5:1 en sombre), badges gris 4,2 → 5,7:1, vignette du certificat dans un bouton, **élève « parti »** (champ `actif` enfin exposé : fiche, badge, effectifs), rollback documenté (DB_VERSION 2), SW ne cache plus les réponses non-OK, `capture` retiré des champs fichier (caméra frontale forcée, PDF inaccessible).
- **P3** : écran blanc → carte « Affichage impossible », repli `crypto.randomUUID` hors HTTPS, `onversionchange/onblocked`, `sauverPrefs` protégé, visionneuse re-typée par mime déclaré, fuites d'URL, message MAJ, période sur le récap imprimé, refus de supprimer une classe référencée, coef 0 honoré, classes en barrette sur l'accueil, `color-scheme`, `apple-touch-icon` PNG, CSS mort, pastille `hidden` réellement masquée (trouvée sur capture sombre), dérive doc (architecture, modèle, CLAUDE.md, pronote, guides, Aide in-app).
- Tests : **`tests/e2e/regressions.spec.mjs`** (13 tests, un par correctif) ; suite complète **21/21** (le navigateur Playwright 1223 a été réinstallé : `npx playwright install chromium`, la « régression » du 30/08 était bien l'environnement). Captures clair 360 px / sombre 375 px contrôlées visuellement.
- Bump `VERSION` (SW) + `VERSION_APP` → **0.12.4**. Sauvegardes dans `archives/2026-09-05/`.

**Décidé** : lot > 3 fichiers assumé sur instruction explicite (« effectue le tout »), chaque correctif restant local et testé ; refactor des doublons (`trierEleves` ×7, `champF` ×5…) **non appliqué** (règle des 3 fichiers → à planifier) ; `interactive-widget=resizes-content` **non appliqué** sans test Android (fiche terrain 4 bis).

**Coincé / à vérifier** : sur Android réel — sélecteur caméra/fichiers sans `capture`, grille 2 colonnes, clavier virtuel vs feuille (B31).

**Déploiement (2026-09-06)** : le premier `git push` a été refusé par le classificateur de sécurité du mode auto (rien exécuté) ; après le « continue oui » de l'utilisateur, push `main` (`59d99ae..857d292`, 4 commits dont le rangement du 30/08), `git subtree push` → gh-pages `0391552`, tag `v0.12.4` poussé. Vérifié : `app/` ≡ gh-pages (diff vide), `VERSION 0.12.4` dans le SW et `state.js` servis. Avis **B27** rédigé (`docs/avis/AVIS_DEDOUBLONNAGE_HELPERS.md`).

**Prochaine étape** : validations terrain (fiche `test-terrain.md` v0.12.4) ; trancher B30 (seuil ×3 par trimestre ?) ; B27 selon validation de l'avis (v0.12.5 dédiée).

## 2026-08-30 (23) — Rangement du dépôt et sortie du template générique

**Fait** :
- Recherche exhaustive préalable des références au chemin du projet : dépôt (md/js/mjs/json/html), `playwright.config.mjs`, `server-carnet.mjs`, workflows GitHub (**aucun** : pas de CI), `.vscode` (**aucun**), `~/.claude/settings*.json` (**aucune**), raccourci bureau « Carnet EPS.lnk » (→ pointe la **PWA en ligne**, `msedge_proxy --app-url=https://alemoine4.github.io/carnet-eps/`, donc indépendant du dossier local).
- `template/` → `30_APPLICATIONS/RESSOURCES_IA/template-projet` (copie vérifiée par MD5 avant retrait de l'original) ; ses propres références `DEV_APP` corrigées (README, CLAUDE.md).
- `AUDIT_DEV_APP_2026-07-10.md` → `docs/audit-2026-07-10.md` et `AVIS_EXPERT_STRATEGIE.md` → `docs/strategie.md` (copie + vérification `cmp` + `git add` **avant** suppression de l'original). Les 5 `AVIS_*.md` → `docs/avis/` en `git mv` (renommages détectés `R`, contenu à 0 ligne de diff).
- 19 corrections de chemins (`_TEMPO\DEV_APP`, `launch.json`) dans CHANGELOG, CLAUDE.md, README, TODO, architecture, decisions (D001/D007), roadmap, journal, checklist, `/cadrer`, skill architecte-refactor, deploiement.

**Décidé** : ne **pas** aplatir `CARNET EPS/carnet-eps` pour l'instant (demande explicite). L'analyse montre que l'aplatissement serait techniquement sans risque — aucun chemin absolu nulle part, `server-carnet.mjs` se localise via `import.meta.url`, Playwright et `git subtree push --prefix app` sont relatifs à la racine du dépôt — mais le gain est cosmétique et l'opération n'est pas urgente.

**Coincé / à vérifier** : les smoke-tests n'ont pas pu tourner — le binaire navigateur Playwright manque (`chromium_headless_shell-1223` absent de `~/AppData/Local/ms-playwright`). Dérive d'environnement, sans lien avec ce rangement ; à relancer après `npx playwright install`. Aucun fichier de `app/` n'ayant été touché, le risque de régression applicative est nul.

**Prochaine étape** : réinstaller le navigateur Playwright et repasser les 8 smoke-tests ; trancher l'aplatissement du double niveau.

## 2026-07-12 (22) — Finitions post-audit (v0.12.3)

Suite de la session d'audit : revue « tu vois autre chose ? » → 5 petits points, tous traités.

**Fait** :
- `ui.js` : l'éviction de la pile de toasts saute les toasts marqués `data-persistant` (durée Infinity) — micro-défaut de ma v0.12.2 : le toast de MAJ pouvait être évincé par 3 notifications et ne revenait pas (drapeau anti-doublon).
- `documents.js` : lien sans schéma auto-préfixé `https://` (le rejet de « www.site.fr » était une friction née du correctif A7).
- `README.md` : était resté à « v0.8.1, publication GitHub Pages à venir » — URL de l'app en tête, tableau des modules complété (Suivi + observations), « Ce que fait » au présent, `tests/` à jour, état v0.12.3.
- `docs/roadmap.md` : Observations (v0.12.0) et audit 2026-07-10 cochés, smoke-tests 7 → 8.
- `tests/e2e/smoke.spec.mjs` : date locale au lieu d'UTC (aligné sur `isoAujourdhui()` post-A4 — un `npm test` entre minuit et 2 h aurait échoué) ; `observations` ajouté aux stores purgés en `beforeEach`.

**Vérifié** : 2 tests Playwright dédiés (spec temporaire supprimé) — toast persistant épargné par l'éviction (le plus ancien fini part à sa place), « www.ffbad.org » enregistré en `https://www.ffbad.org` ; puis smoke-tests **8/8**.

**Prochaine étape** : roadmap post-v1 (observation depuis l'appel, dashboard enrichi, évals EPS A1–A5) + validations terrain avant la rentrée.

## 2026-07-10 (21) — Audit complet /audit-projet + corrections (v0.12.1)

**Fait** :
- **Audit 5 phases** du périmètre du dossier projet entier (cartographie → priorisation → plan chiffré) : rapport **`docs/audit-2026-07-10.md`**. Résultat : **0 constat critique**, 16 constats (A1–A16, dont 2 🟠). Vérifs en conditions réelles : console propre, 375 px sans débordement, sombre OK, dialogs accessibles, cibles ≥ 44 px, git = origin, gh-pages = v0.12.0, template sans dérive.
- **Corrections validées « GO » (A1→A11, A15, A16), livrées en v0.12.1** — backup préalable dans `archives/2026-07-10/` :
  - A1/A2 `sauvegarde.js` : `LIBELLES` complété (`observations`) + accord singulier/pluriel → le résumé avant import (destructif) est complet et correct.
  - A3 `media.js` + `eleves.js` + `inaptitudes.js` : `compresserImage` lève des erreurs claires (bitmap illisible, toBlob null) ; try/catch + message `statut-erreur` sur photo de fiche et remplacement de pièce (l'ancienne pièce n'est supprimée qu'après stockage réussi de la nouvelle).
  - A4 `metier.js` : `isoAujourdhui()` en **heure locale** (plus de bascule « hier » entre minuit et 1-2 h).
  - A5 : `sequences.js` importe `dateFR`/`isoAujourdhui` de metier.js ; `reglages.js` utilise le `champTexte` d'ui.js (doublons supprimés).
  - A6 `docs/modele-donnees.md` : `seances.numero` documenté comme figé/indicatif (les affichages recalculent par tri de date).
  - A7 `documents.js` : liens limités à `https?://` (à la saisie **et** à l'ouverture — défense contre une sauvegarde JSON tierce).
  - A8 : les 3 `alert()` restants → `toast` (import/purge : toast puis reload à 900 ms).
  - A9 `ui.js` : `afficherVue` remplace le nœud `#vue` à chaque navigation (clone) + jeton de génération → un rendu async obsolète écrit dans un nœud détaché, plus de mélange possible.
  - A10 `eleves.js` : contrôle de doublon au **renommage** de classe (toast + valeur rétablie).
  - A11 `edt.js` : chevauchement de créneaux détecté (jour + plages + compat A/B/AB) → enregistré quand même + toast ⚠ (2 classes en barrette restent possibles).
  - A15 `accueil.js` : ⚠ si plusieurs séquences actives se chevauchent pour la classe du moment (laquelle est utilisée + renvoi vers Séquences).
  - A16 `TODO.md` : sections périmées nettoyées (publication déjà faite, Playwright validé, phases 4→9 livrées).
- `.gitignore` : + `archives/` (backups locaux, pas dans le dépôt).

**Vérifié** : chaque correctif exercé en preview réel (résumé complet avec « 1 observation », photo piégée → « Photo non enregistrée : image illisible… », lien `javascript:` refusé, toast chevauchement EDT, ⚠ 2 séquences actives, renommage doublon bloqué, navigation rapide sans entrelacement, Réglages fonctionnels ✓) ; **smoke-tests 8/8 verts** ; console sans erreur.

**Décidé (2e partie de session, « fait le mieux ») → v0.12.2, décision D011** :
- **A12** : toasts empilés — `ui.js` crée un conteneur `.toasts` (fixe, colonne, max 3, le plus ancien évincé), `.toast` devient un bloc simple ; `duree: Infinity` = persistant ; `main.js` afficherToastMaj passe par `toast()` (garde anti-doublon par drapeau).
- **A13** : `notes.js` — « publiée » marquée seulement sur preuve : presse-papiers réussi, ou événement `copy` réel sur la zone de secours (`once: true`) ; le CSV ne marque plus (message explicite) ; bouton « Marquer remontée dans Pronote (manuel) / Annuler le marquage » (toggle, efface le récap au dé-marquage).
- **A14** : `appel.js` — pré-remplissage « inapte » conditionné à `seance.date === isoAujourdhui()` ; pastille 🩺 conservée sur les séances passées.

**Vérifié (v0.12.2)** : 3 tests Playwright dédiés écrits puis supprimés (`verif-v0122.spec.mjs`) — pile de 3 toasts avec éviction + persistant ; séance passée = 0 écriture + 🩺 visible, séance du jour = pré-remplie « I » ; CSV → `publieePronote` reste null, copie → marquée + presse-papiers exact (« 15 »), toggle manuel réversible. **3/3 puis smoke-tests 8/8.** ⚠ Le pilotage navigateur par extension (claude-in-chrome) a gelé sur `import()` dynamique en éval — vérifier via Playwright dans ce cas (même leçon que D010).

**Prochaine étape** : reprendre la roadmap post-v1 (observation depuis l'appel/séance du jour, dashboard enrichi, évals EPS A1–A5).

## 2026-06-15 (20) — Observations : socle + 1er lot (v0.12.0)

**Fait** (option du socle de `AVIS_OBSERVATIONS_MODELE.md` : modèle OK avec `ton`, migration additive sans auto-export forcé, 1er lot = socle + bouton + timeline) :
- `io.js` : `SCHEMA.observations` (index `eleveId`) + `DB_VERSION = 2` (migration additive : le `onupgradeneeded` crée les stores manquants → données préservées). Cascade élève + `restaurer` + `apercu` + `detail` incluent `observations`.
- `metier.js` : `TYPES_OBSERVATION`, `TONS_OBSERVATION`, `TAGS_OBSERVATION`, `MODELES_PHRASES`.
- `modules/observations.js` (nouveau) : `carteObservations(eleveId, rafraichir)` (timeline + « + Observation » + suppression avec toast undo) ; formulaire en `<dialog>` (type/ton/phrases/étiquettes). Ajouté au cache SW.
- `eleves.js` : carte observations sur la fiche.
- CSS `.obs-*` ; **badge de ton figé** (`#0f7a46`/`#a35f00`, AA blanc dans les 2 thèmes) — corrigé après avoir vu que `var(--c-ok)` vire au vert clair en sombre.
- Tests : +1 (ajout observation + fermeture feuille + cascade) → **8/8 verts**.

**Vérifié preview** : migration v1→v2 (db.version 2, 14 stores, données conservées) ; timeline + formulaire (phrase rapide, tag, enregistrement) ; badge `rgb(15,122,70)` même en sombre.

**Piège environnement (consigné)** : le navigateur **du preview** ne déclenche pas l'événement `close` d'un `<dialog>` sur `close()` programmatique → les feuilles « semblent » ne pas se fermer en preview. **Faux positif** : le vrai Chromium (Playwright) et Chrome le déclenchent (test 8 `toHaveCount(0)` vert, test 5 clique sous le modal). Ne pas se fier au preview pour la fermeture des `<dialog>`.

**Prochaine étape** : enrichir (observation depuis l'appel/la séance du jour), puis dashboard « Aujourd'hui » enrichi.

## 2026-06-15 (19) — Onglet « Suivi » (v0.11.0)

**Fait** (option A de `AVIS_SUIVI_NAVIGATION.md`, validée) :
- `metier.js` : `collecterAlertes()` (extraction de la logique d'alertes de `accueil.js`, sans changement de comportement).
- `accueil.js` : `carteAlertes` consomme `collecterAlertes()` ; imports `dateFR`/`SEUIL_ALERTE` retirés (déplacés dans metier).
- `index.html` : onglet EDT → **Suivi** (icône pouls Lucide).
- `main.js` : route `suivi` + vue inline (alertes complètes + lien Inaptitudes) ; `PARENT.edt='plus'`, `PARENT.inaptitudes='suivi'` ; `TITRES.suivi` ; carte EDT ajoutée au menu « Plus » (Inaptitudes retirée de Plus, fronté par Suivi).
- Tests : route `suivi` ajoutée au test 1 + nouveau test (Suivi rend les alertes ; EDT accessible via Plus). **7/7 verts.**

**Vérifié preview** : nav = Aujourd'hui/Appel/Élèves/Notes/Suivi/Plus ; accueil garde ses alertes (refactor OK) ; Suivi affiche les alertes + lien Inaptitudes ; sur `#/edt` l'onglet actif = Plus ; console propre. Pas de nouveau fichier → SW ASSETS inchangé.

**Prochaine étape** : observations (notes terrain) → **AVIS modèle de données d'abord** (nouveau store IndexedDB → migration).

## 2026-06-15 (18) — Smoke-tests Playwright (dev)

**Fait** : harnais de tests automatisés, validé par l'utilisateur (Playwright = dépendance **de dev** ; gratuité OK ; app `app/` toujours sans dépendance runtime ; non déployé).
- `package.json` (privé, type module, `@playwright/test`), `playwright.config.mjs` (webServer `node server-carnet.mjs` port 8160, `reuseExistingServer`), `tests/e2e/smoke.spec.mjs`, `tests/e2e/README.md`, `.gitignore` (node_modules, test-results, playwright-report).
- 6 tests : chargement+nav 12 routes, créer classe+persistance, import CSV, appel (tap+Terminer), **suppression+annulation** (undo restaure la cascade), round-trip export/import. **6/6 verts** (2,3 s).
- 2 ajustements de sélecteurs pendant l'écriture : `.statut-ok` ambigu → `getByText(/Appel complet/)` ; formulaire « Nouvelle classe » masqué → cliquer le bouton « + Nouvelle classe » d'abord.
- `npm install` + `npx playwright install chromium` exécutés (Chromium headless). **Aucun changement de l'app** (pas de bump, pas de déploiement).

**Prochaine étape** : onglet « Suivi » (sortir Inaptitudes de « Plus ») → **AVIS IA nav** d'abord ; puis observations (**AVIS modèle de données**).

## 2026-06-13 (17) — Annulation des suppressions, phase 2 (v0.10.1)

**Fait** : filet « Supprimé — Annuler » (8 s).
- `ui.js` : helper `toast(message, {action, libelleAction, duree})`.
- `io.js` : les 3 cascades renvoient `{store:[records]}` (avec blobs des fichiers lus avant suppression) au lieu de comptes ; nouveau `restaurer(objets)` (ré-`enregistrer`). `supprimerSequenceEnCascade` adapté à la nouvelle signature de `supprimerSeanceEnCascade`.
- 8 sites de suppression : capture des objets supprimés + `toast(..., { action: () => restaurer(...) })`. Pour les non-cascade (classe, créneau, doc, éval, inaptitude) la capture est inline (lire avant supprimer).

**Vérifié** (preview, après reload propre) : confirmer()→true, suppression élève effective + toast ; **Annuler restaure élève + appel + inaptitude + note** + retour fiche ; console propre.

**Piège de test rencontré** (consigné) : il faut **recharger la page** après édition (sinon code stale), **purger les `dialog`/`.toast` leftover**, et **utiliser une seule instance io** (`import('/js/io.js')` cachée = celle de l'app) pour seed+lecture, sinon résultats incohérents. Ce n'étaient pas des bugs app.

**Prochaine étape** : v0.10.2 smoke-tests (filet anti-régression) avant les gros lots ; puis onglet « Suivi » (AVIS IA nav).

## 2026-06-13 (16) — Suppressions sécurisées, phase 1 (v0.10.0)

**Contexte** : démarrage du chantier roadmap « sécurité des données » en tant qu'architecte, par versions courtes. Renumérotation : la « 0.9.9 sécurité » du plan utilisateur devient **0.10.0** (0.9.x déjà pris).

**Fait** (phase 1 de `AVIS_ANNULATION_SUPPRESSIONS.md`) :
- Helper `confirmer({titre,message,detail,action,danger})` dans `ui.js` : `<dialog>` natif, focus sur « Annuler », action rouge, Échap/clic-fond = Annuler, focus rendu au déclencheur. Retourne `Promise<boolean>`.
- io.js : `apercuSuppressionEleve`, `apercuSuppressionSequence`, `detailSuppression()` (impact cascade).
- Remplacement des **11 `confirm()` natifs** (eleves ×2, sequences ×2, documents, edt, notes, inaptitudes, sauvegarde ×4) par `await confirmer(...)`. Doubles confirms (élève/séquence) fusionnés en 1 boîte avec détail.
- CSS `.confirm-detail` + `dialog.feuille-confirm .rang-btn`.

**Vérifié** (preview, après avoir corrigé un faux positif de test dû à des dialogs leftover de mes evals) : mécanisme open/close/remove OK en isolation ; suppression élève bout-en-bout = dialog unique, élève + cascade (appels/inaptitudes) supprimés, redirection, dialog retiré ; console propre.

**Prochaine étape** : v0.10.1 — toast « Supprimé — Annuler » (restauration 8 s) ; puis v0.10.2 smoke-tests ; puis onglet « Suivi » (AVIS IA nav).

## 2026-06-13 (15) — Alignement audit : finitions (v0.9.9)

**Fait** (comble les écarts du prompt d'audit affiné, sans structurel) :
- Aide appel scindée : span `.aide-clavier` (raccourcis) en `@media (pointer: fine)` ; gestes tactiles toujours visibles (appel.js + components.css).
- Typo : en-tête 1,2→1,3rem (base.css), `.carte p` 0,9→0,95rem (components.css) ; titres de carte gardés à 1,1rem.
- Nav : 0,66→0,68rem ; testé 320px : 0 débordement, 0 troncature, libellés OK.
- CSP : +`font-src`/`worker-src`/`manifest-src` ; **`connect-src 'self' data:` conservé** ; `frame-ancestors` volontairement non ajouté (ignoré en meta).

**Décisions** (revue critique du prompt utilisateur) : refusé `connect-src 'self'` sans `data:` (aurait cassé l'import de pièces jointes) ; refusé `frame-ancestors` en meta (no-op) ; refusé le confirm bloquant sur « Terminer » (<40s) ; refusé `role="status"` (verbosité). Documenté dans CHANGELOG.

**Vérifié** : 320/360/desktop, clair/sombre, console propre, 0 violation CSP. Bump → 0.9.9, push main + gh-pages + tag.

**Prochaine étape** : sur validation, implémenter `AVIS_ANNULATION_SUPPRESSIONS.md` ; puis AVIS dédup design-system, IA nav, tests.

## 2026-06-13 (14) — Corrections d'audit : lot rapide (v0.9.8)

**Contexte** : audit multi-perspectives (UX/UI/ergo/a11y/dev/prof). Aucun P0. Lot de corrections rapides appliqué (le structurel — annulation des suppressions, dédup design-system, IA nav — fera l'objet d'AVIS).

**Fait** :
- `aria-live="polite"` sur `.compteurs` (appel.js).
- Nom de zone par écran : `TITRES` + `#vue.setAttribute('aria-label', …)` dans `main.js naviguer()` → annoncé au focus de `#vue`.
- Typo : en-tête 1,05→1,2rem (base.css), titre de carte 1→1,1rem (components.css), libellés nav 0,62→0,66rem.
- `prefers-reduced-motion` (neutralise transitions + scale) et `scroll-margin-bottom` sur focusables (base.css).
- « Terminer l'appel » : label dynamique « · N passé(s) en présent » via majCompteurs (pas de confirm bloquant → fast-path préservé).
- **CSP** `<meta>` dans index.html : `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; connect-src 'self' data:; object-src 'none'; base-uri 'self'; form-action 'none'`.

**Vérifié sous CSP** (preview) : styles inline (bordure statut), visionneuse blob, export CSV blob (238o), `fetch(data:)` + `fetch(self)`, aria-live/aria-label/label Terminer — **0 violation console**. Bump → 0.9.8, push main + gh-pages + tag.

**Prochaine étape** : AVIS pour le filet anti-suppression (P1) ; puis dédup design-system + IA nav.

## 2026-06-13 (13) — Liseré bleu au chargement (v0.9.7)

**Fait** : suppression de l'anneau de focus visible sur `#vue`. Cause : `afficherVue` fait `conteneur.focus()` à chaque vue ; au 1er chargement (sans interaction souris préalable) le navigateur applique `:focus-visible` → anneau bleu accent (3px) autour du contenu, qui disparaît au 1er clic. Le `.vue { outline:none }` était annulé par `:focus-visible` (même spécificité, défini après). Fix : `.vue:focus, .vue:focus-visible { outline:none }` (spécificité 0,2,0 > 0,1,0) dans base.css. Les boutons/liens/champs gardent leur focus visible. Bump → 0.9.7, push main + gh-pages + tag.

**Vérifié** : règle présente dans la feuille de style, `#vue` focalisé calcule `outline: none`.

**Prochaine étape** : terrain.

## 2026-06-13 (12) — Largeur d'écran PC (v0.9.6)

**Fait** : les vues appel / récap / relevé prennent toute la largeur sur PC (classe `vue-large` ajoutée par `vueAppel`/`vueRecap`/`vueReleve` ; `afficherVue` (ui.js) réinitialise `#vue.className='vue'` à chaque rendu ; règle `.vue.vue-large{max-width:none;margin-right:32px}` dans responsive.css). Grille d'appel passée en `repeat(auto-fill, minmax(160px,1fr))` → 2 col mobile, 7 col sur 1600 px. Formulaires/texte restent capés à 900 px. Bump → 0.9.6, push main + gh-pages.

**Vérifié** : appel 1360 px / 7 colonnes (28 élèves), récap 1345 px, Élèves capé 900 px, console propre. (Choix utilisateur : « élargir l'appel + les tableaux ».)

**Note environnement** : le serveur preview carnet-eps s'était arrêté et l'onglet avait basculé sur un autre projet (localhost:8081) → confusion IndexedDB ; résolu en redémarrant le serveur 8160 et en seedant via `import('/js/io.js')` (qui crée les stores correctement) plutôt qu'un `indexedDB.open` brut.

**Prochaine étape** : terrain.

## 2026-06-13 (11) — Libellé du bouton retour (v0.9.5)

**Fait** : « ← Plus » → « ← Retour » sur les 6 écrans enfants de l'onglet Plus (main.js + documents/inaptitudes/sequences/reglages/sauvegarde.js). Motif : « Plus » (menu) se lit mal comme cible de retour ; les retours nommant une section réelle sont gardés. Bump → 0.9.5, push main + gh-pages. Vérifié preview (les 6 affichent « ← Retour »).

**Prochaine étape** : terrain.

## 2026-06-13 (10) — Nettoyage écran « Plus » (v0.9.4)

**Fait** : retrait des badges « prêt » (3e argument de `carte()`) sur les 5 cartes de l'écran Plus (`main.js`) — vestiges de dev, plus de sens une fois tout livré, incohérents avec la carte Aide. Footer RGPD conservé. Bump SW + VERSION_APP → 0.9.4, push main + gh-pages. Vérifié preview (0 badge, footer intact).

**Prochaine étape** : terrain (`docs/test-terrain.md`).

## 2026-06-13 (9) — Finitions de confort de l'appel (v0.9.3)

**Fait** :
- **Pastille de statut** : fond retiré du JS (`appel.js` ne fait plus `badge.style.background`), piloté en CSS par `.btn-eleve[data-statut] .badge-statut { background: var(--stb-*) }` (mêmes variables thématisées que la bordure) ; texte de pastille passé à `var(--c-sur-accent)` (blanc en clair, encre en sombre). Résultat vérifié : clair = bg `#d03a3a`/texte blanc ; sombre = bg `#f06363`/texte `#0f1626` → la pastille ressort sur la carte sombre.
- **Raccourcis clavier PC** : `const RACCOURCIS_STATUT` (p/a/r/d/i/t/f) + `keydown` sur `.eleve-cycle` → une lettre fixe le statut de la carte focalisée. Hint mis à jour. Vérifié : a→absent, r→retard, f→infirmerie.
- Bump SW + VERSION_APP → 0.9.3, commit + push main + `git subtree push --prefix app origin gh-pages`.

**Décidé** : la pastille réutilise `--c-sur-accent` (déjà défini par thème) pour son texte → pas de nouveau token, lisibilité garantie dans les 2 thèmes. Raccourcis attachés au bouton cycle (cible de focus principale).

**Coincé / à vérifier** : rien côté code (l'audit UX et son confort sont clos). Restent les **validations terrain** (`docs/test-terrain.md`).

**Prochaine étape** : terrain.

## 2026-06-13 (8) — Campagne de tests + durcissement sécurité (v0.9.2)

**Fait** :
- **Campagne de tests** sur 14 scénarios (harnais preview ; Playwright MCP indisponible — profil Chrome verrouillé par instance concurrente, `--isolated` impossible). Verts : chargement (0 erreur), 12 routes, création classe (manuelle 2→3) + import, persistance reload (31 élèves), appel 28 (compteurs exacts + fast-path « Terminer » → 28/28), 7 statuts, import Pronote collé (3 + classe auto + accents), export CSV (en-tête FR + 28 lignes capturés), impression (window.print + 2 règles `@media print`), **19 ressources 100 % localhost / 0 externe**, **XSS CSV neutralisé** (payloads inertes via textContent), a11y clavier (focus → dialog), responsive 360 px (2 col, 0 débordement).
- **2 trouvailles sécurité corrigées** (avis `AVIS_SECURITE_IMPORT_EXPORT.md`) :
  - `importerJSON` faisait `fetch(donnees)` sans vérifier `data:` → un fichier piégé pouvait émettre une requête réseau (entorse offline/RGPD). Garde ajoutée : fetch seulement si `donnees` commence par `data:`. Testé (espion fetch) : URL http = 0 fetch / blob null ; dataURL = blob reconstruit.
  - Exports CSV non quotés + injection de formule Excel possible (nom `=…`). Helper `champCSV()` (RFC 4180 + préfixe `'`) câblé dans appel.js (récap) et notes.js (éval + relevé). Testé bout-en-bout : `=SUM(99)`→`'=SUM(99)`, `A;B`→`"A;B"`.

**Décidé** : « Copier pour Pronote » (presse-papiers) exclu de l'échappement CSV (colonne de nombres collée dans Pronote, pas Excel). Tests d'import JSON faits par import dynamique du module (`await import('/js/io.js')`) faute de file-upload dans le harnais preview.

**Coincé / à vérifier** : tests non automatisables (offline réel sur HTTPS, chrono < 40 s, caméra, rendu papier). UX restant = confort optionnel (pastille statut en sombre, raccourcis clavier PC).

**Déployé** : bump SW + `VERSION_APP` `0.9.0 → 0.9.2`, commit `871773f`, push `main` + `git subtree push --prefix app origin gh-pages`. Vérifié : `origin/gh-pages` contient bien `VERSION_APP 0.9.2`, SW `0.9.2`, `champCSV`. **Les correctifs UX + sécurité sont donc en ligne** (l'app publiée n'était plus à jour avant ce déploiement).

**Prochaine étape** : validations terrain depuis l'URL HTTPS ; correctifs de confort à la demande.

## 2026-06-13 (7) — Publication GitHub Pages + audit UX (P1 appel)

**Fait** :
- **Publication** : `gh repo create carnet-eps --public`, push `main`, `git subtree push --prefix app origin gh-pages`, Pages activé (état `building`), URL `https://alemoine4.github.io/carnet-eps/` reportée dans `docs/guide-installation.md`. Identité git locale configurée.
- **Audit UX** via skill impeccable (commande `critique`) : 31/40 « Bon », détecteur markup propre. Forces (appel, états vides, cohérence des helpers) ; P1 = statuts inaccessibles clavier/SR + feuille pas un vrai modal ; P2 = contrastes vert/orange + absence de retour d'appui long ; P3 = liseré « Plus » + pas d'aide in-app. → `AVIS_APPEL_ACCESSIBILITE.md`.
- **P1 corrigé** (avis validé) : helper `ouvrirFeuille()` `<dialog>` natif dans `ui.js` ; carte élève `appel.js` = `<div role=group>` + `.eleve-cycle` (tap-cycle + appui long) + `.eleve-menu` « ⋯ » (`aria-haspopup=dialog`) ; CSS `dialog.feuille`/`::backdrop` + `.eleve-cycle`/`.eleve-menu` (44 px).
- **P2 partiel** : texte de statut sans couleur (encre pleine) ; barre de progression + `navigator.vibrate(15)` pendant l'appui long (+ `prefers-reduced-motion`) ; vert `#178a52→#0f7a46`, orange `#c97a06→#a35f00` (STATUTS + `--c-ok`), variante verte sombre `--c-ok: #2fae6a` pour `.statut-ok`.
- **P3** : liseré des cartes « Plus » → bordure pleine + chevron `::after`. **Écran « Aide » in-app** : vue `'aide'` définie inline dans `main.js` (route ajoutée à ROUTES + `PARENT.aide='plus'` + lien dans « Plus ») — choix de l'inline pour **ne pas toucher au service-worker** (un nouveau fichier `modules/aide.js` aurait imposé une bump SW = changement structurant). Contenu = intro + 6 étapes de rentrée + jour J + réflexes (repris de `docs/guide-rentree.md`). CSS `.liste-aide`.
- **P2 (fin)** : bordures de statut sorties du JS (`appel.js` ne fait plus `style.borderColor`) → pilotées en CSS par `.btn-eleve[data-statut]` via variables `--stb-*` déclinées par thème dans `base.css`. Mesuré : les 7 bordures étaient toutes < 3:1 sur surface sombre (2,62–3,28) ; variantes claires sombres ajoutées (présent `#34c27a` 6,89:1, etc.). Vérifié dans les 2 thèmes (clair = saturé, sombre = clair).
- **Visionneuse** (`media.js`) : `div.feuille-fond` → `<dialog class="visionneuse">` natif (clic n'importe où ou Échap = fermer, fond inerte, focus rendu). `conteneur` gardé en paramètre (compat) mais inutilisé. CSS `dialog.visionneuse`/`::backdrop` ; `.feuille-fond` (devenu mort) supprimé. **Audit UX entièrement traité (P1+P2+P3 + visionneuse).**

**Décidé** : carte élève = groupe à 2 boutons (un bouton imbriqué dans un bouton = HTML invalide). Backdrop détecté par `e.target===dlg` et non par coordonnées (une activation clavier rapporte (0,0) et fermait la feuille par erreur — bug attrapé en test). `--c-attention` constaté **token mort**, `.badge-ok` inutilisé.

**Coincé / à vérifier** : reste du P2 (couleurs sémantiques par thème : bordure de statut + `.statut-ok` en sombre demandent des variantes dédiées — un assombrissement simple aide le clair mais dégrade le sombre, mesuré) ; P3 ; généraliser `<dialog>` à la visionneuse `media.js`. Validations terrain inchangées.

**Prochaine étape** : reste du P2 (retune par thème) ou P3 ; sinon installation PWA réelle depuis l'URL.

## 2026-06-12 (6) — Phase 9 : distribution préparée

**Fait** :
- Toast MAJ (main.js) : écoute `controllerchange` (le SW fait skipWaiting+claim) avec garde « première installation » ; bouton Recharger ; CSS `.toast` au-dessus de la nav. Boot vérifié sain en preview (toast absent sur localhost, console vide), v0.9.0.
- `docs/guide-installation.md` : Android (bannière/menu Chrome), PC (icône barre d'adresse), transfert JSON entre appareils, mises à jour, tableau de dépannage, « où sont mes données ».
- `docs/guide-rentree.md` : archive de l'année passée → purge → réglages → import Pronote → EDT (+ rappel parité A/B après vacances) → séquences → vérifications → jour J ; réflexes annuels.
- `.gitignore` + `git init -b main` + commit initial `04a4d7c` (55 fichiers, 6 630 lignes, identité git locale alemoine).

**Constat** : gh CLI 2.93 installé mais **non authentifié** → la création du dépôt GitHub est impossible sans `gh auth login` (geste utilisateur, navigateur). Publication scriptée prévue : `gh repo create carnet-eps --public --source . --push` puis `git subtree split --prefix app -b gh-pages` + push + activation Pages sur `gh-pages`, et URL reportée dans le guide d'installation.

**Coincé / à vérifier** : rien côté code. Attente : `gh auth login` + feu vert explicite « publie sur GitHub Pages ».

**Prochaine étape** : publication (à son signal), puis installations réelles PC/Android et validations terrain (checklist 🔲).

## 2026-06-12 (5) — Phase 8 : QA & durcissement

**Fait** :
- Durcissement repéré à la relecture AVANT les tests : `importerJSON` faisait une transaction par enregistrement → réécrit en lots (conversion des blobs d'abord, puis une transaction clear+puts par store). Mesuré ensuite : 1,9 s pour 10 668 enregistrements (l'ancien chemin aurait pris ~1 min).
- Volumétrie générée en preview (insertion brute par transactions groupées, 1,25 s) : 6 classes × 28 élèves, 3 séquences × 18 séances/classe, 9 072 appels réalistes (90 % présents), 36 évaluations / 1 008 notes, 12 photos JPEG, 4 inaptitudes (dont une finissant dans 4 j), 8 documents — 1,4 Mo IndexedDB.
- Chronos de rendu (navigation réelle par hash, attente du contenu) : accueil 49 ms (alertes scannant les 9 072 appels), écran d'appel 35 ms, récap année 35 ms, tout le reste 16-33 ms.
- Round-trip : export 57 ms (1,36 Mo avec pièces ; 1,20 Mo sans), purge, import 1,9 s, `compterTout` strictement identique, blob vérifié (taille).
- Erreurs : objet étranger, schéma futur, JSON tronqué → tous rejetés avec messages (l'écran Sauvegarde catch le parse).
- A11y : audit programmatique sur 21 écrans (inputs étiquetés, boutons nommés, img alt, lang, nav aria-label) → **0 problème** ; **Lighthouse 97/100/100** (npx lighthouse, outil gratuit du template).
- `tests/checklist.md` réécrite : tableau de résultats + ✅ vérifiés / 🔲 appareil réel. README actualisé. v0.8.1 (SW aussi).

**Décidé** : Lighthouse via `npx` ponctuel = conforme BIBLE (outil listé par le template, rien d'installé au projet).

**Coincé / à vérifier** : rien côté code. Les 🔲 de la checklist sont tous des gestes utilisateur (Android, Pronote, HTTPS, papier).

**Prochaine étape** : Phase 9 — publication GitHub Pages (sur accord), guides installation + rentrée, toast de mise à jour SW.

## 2026-06-12 (4) — Phase 7 : tableau de bord & documents

**Fait** :
- `modules/accueil.js` : la vue accueil quitte main.js — `carteMaintenant` déménagée d'edt.js (extraction par script Node sur marqueurs de sections, imports nettoyés), + `carteAlertes` (inaptitudes J-7 et venant de finir, seuils tenue/dispense via cumul des appels, évals notées non publiées hors AFL, max 8 affichées) + `carteReprendre` (prefs `derniereClasseId`/`derniereEvalId` écrites par eleves.js et notes.js via `sauverPrefs`).
- `modules/documents.js` : ajout (titre, 6 types, tags virgules, classes cochées, fichier compressé OU url), liste triée par date, recherche normalisée (accents), filtres classe/type, ouverture (visionneuse image / onglet PDF / lien `noopener`), suppression + cascade fichier. Pas d'édition en v1 (assumé).
- `ouvrirVisionneuse` mutualisée dans media.js (inaptitudes refactorée). main.js : plus aucun bouchon, `ouvrirDB()` anticipé au boot. SW 0.8.0.

**Vérifié en preview** : accueil avec scénario chargé → « En ce moment » (créneau actif) + 3 alertes exactes (« Boris BRAVO (6A) — inaptitude : fin dans 3 j » ⚠, « Carla CHARLIE (6A) — 3 oublis de tenue » ⚠, « Match test (6A) — pas encore remontée vers Pronote » ℹ) ; « Reprendre » apparaît après visite classe + éval ; documents : lien + image (1800×1200 PNG → JPEG 18 Ko), recherche « natation » → 1, filtre type → 1, visionneuse OK, suppression → fichier emporté ; console vide. Base remise à zéro.

**Décidé** : alertes plafonnées à 8 (+ compteur) ; documents sans édition en v1.

**Prochaine étape** : Phase 8 — QA & durcissement (checklist complète, volumétrie 6×28×1 an, erreurs quota/import corrompu, a11y, Lighthouse, revue RGPD).

## 2026-06-12 (3) — Phase 6 : notes & export Pronote 🎒 jalon rentrée atteint

**Fait** :
- `modules/notes.js` (~440 lignes) : 3 vues — liste/création (types note20/bareme/afl, coef, badge publiée), grille de saisie (ordre alpha, `parserValeur` tolérant « 12,5 »/« a »→ABS/« d »→DISP/« n »→NN, rejet > barème, Entrée→suivant, stats live), relevé par classe (moyenne /20 pondérée coef, codes/AFL exclus, moyenne classe, print + CSV).
- Export Pronote voie A : colonne `\r\n` avec lignes vides pour codes/non-notés (alignement Pronote préservé), récap garde-fou (effectif + barème) + liste des codes à saisir à la main, marquage `publieePronote`, **repli textarea** si `clipboard.writeText` échoue. Voie B : CSV.
- Fiche élève : section Notes (dernières + moyenne générale /20 pondérée).
- main.js : bouchon notes remplacé. SW 0.7.0.

**Vérifié en preview (6 élèves alpha)** : création via formulaire → grille ; saisies « 12,5 / abs / 15 / 25 / 8 / d » → 5 notes stockées (25 rejetée [INVALIDE]), codes normalisés, stats « 11,83/20 · min 8 · max 15 · 5/6 » ; copie Pronote → colonne `12,5··15··8·` (6 lignes alignées), codes « ligne 2 — BRAVO : ABS / ligne 6 — FOXTROT : DISP », publiée 12/06 ; **chemin de secours testé en forçant l'échec du presse-papiers** (textarea + récap coexistent — bug d'écrasement trouvé et corrigé pendant le test) ; relevé exact (codes affichés mais exclus des moyennes, classe 11,83/20) ; fiche ALPHA « 12,5/20 de moyenne générale » ; suppression cascade éval+notes ; console vide. Base vierge.

**Décidé** : type « afl » = texte libre non exporté vers Pronote (les services Pronote sont numériques) ; textarea normalise `\r\n`→`\n` (comportement DOM, sans impact sur le collage).

**Coincé / à vérifier** : LE test qui valide officiellement la phase = coller une colonne dans le Pronote du collège (ordre, décimales, codes) — checklist `docs/pronote.md`.

**Prochaine étape** : Phase 7 — documents + tableau de bord d'accueil (alertes agrégées).

## 2026-06-12 (2) — Phase 5 : inaptitudes & certificats

**Fait** :
- `js/media.js` : `compresserImage` (createImageBitmap → canvas max 1600 px → toBlob JPEG qualité 0.8→0.4 jusqu'à ≤ 300 Ko), `stockerFichier` (image compressée / PDF tel quel → store `fichiers`), `urlDuFichier`/`revoquerURL`, `supprimerFichier`.
- `modules/inaptitudes.js` (~360 lignes) : synthèse 4 sections + badges d'alerte (J-7 « fin dans X j », durée > 90 j « médecin scolaire »), formulaire création (cascade classe→élève, eleveId pré-ciblé depuis la fiche, restrictions masquées si totale, pièce jointe avec retour de compression), détail éditable (rafraîchi sur changement de dates pour les badges), visionneuse plein écran (img) / nouvel onglet (PDF), remplacement de pièce, suppression cascadée.
- Fiche élève : photo (label-bouton + input caché `capture="user"`, retrait possible, ancien fichier supprimé) ; section inaptitudes réelle.
- main.js : route `inaptitudes` (parent Plus), carte « prêt ». SW 0.6.0.

**Vérifié en preview (scénario « Tom » du brief)** : formulaire pré-ciblé sur DURAND Tom → restriction « appuis », fin +21 j, certificat PNG 2000×1400 (114 Ko) attaché par DataTransfer → **stocké 1600×1120 JPEG 34 Ko** ✓ ; détail avec vignette + badges ; J-7 (« fin dans 3 j ») et > 3 mois (« médecin scolaire ») en éditant les dates ; synthèse « En cours (1) » ; fiche : section (en cours · 📎) + photo affichée ; appel : Tom pré-rempli « Inapte (certificat) » 🩺 ; suppression → certificat + fichier emportés, **photo de Tom conservée** ; console vide. Base remise à zéro.

**Décidé** : pas de photos dans la grille d'appel pour l'instant (initiales = lisibilité + perf) — backlog ; certificats créés uniquement via une inaptitude (pas de bibliothèque de certificats orphelins en v1).

**Coincé / à vérifier** : capture caméra réelle (`capture="environment"`) et visionneuse à tester sur Android par Alexandre.

**Prochaine étape** : Phase 6 — évaluations & notes + export Pronote (la dernière brique du jalon rentrée).

## 2026-06-12 — Phase 4 : l'écran d'appel ⭐

**Fait** :
- `js/metier.js` nouveau : STATUTS (libellés, codes courts, couleurs, pratiquant oui/non), CYCLE_TAP (présent→absent→tenue), SEUIL_ALERTE (3), helpers dates + parité A/B + `coursDuJour` + `inaptitudesActives` — déplacés depuis edt.js pour respecter « pas d'import entre modules ».
- `modules/appel.js` (~420 lignes) : sélecteur (aujourd'hui via EDT, récentes, récaps), écran d'appel (grille tactile, tap-cycle, appui long 450 ms / contextmenu → feuille de statuts avec minutes + commentaire, enregistrement immédiat id déterministe `seanceId_eleveId`, pré-remplissage inaptes, compteurs, « Terminer », bilan), récap classe (tableau filtrable, impression, CSV BOM).
- Fiche élève : historique réel (chips colorées par statut, ⚠ signalement, 8 derniers). `edt.js` : carteMaintenant → « Faire l'appel » ; créer la séance navigue droit sur l'appel. CSS : grille appel, feuille bas d'écran, règles d'impression. SW 0.5.0.

**Vérifié en preview** (scénario 10 élèves, inaptitude active e3, 3 tenues historiques e5) : sélecteur 3 cartes, « Créer la séance + appel » → écran d'appel ; e3 pré-rempli inapte (🩺, compteur 9 pratiquants) ; e5 ⚠ « tenue ×3 » ; cycle e1 absent→tenue→présent avec compteurs exacts à chaque tap ; menu contextmenu e2 → retard 10 min persisté ; « Terminer » → 10/10 ✓ ; bilan enregistré ; fiche e5 (chips Présent ×1 / Tenue ×3 + signalement + 4 lignes d'historique) ; récap exact (E1 P=1, E3 I=1, E5 T=3 + ⚠, « 4 séances ») ; console vide. Base remise à zéro.

**Décidé** : tap n'écrase jamais un statut « menu » (inapte/dispensé/retard/infirmerie → le tap rouvre le menu) ; les récaps ne comptent que les appels enregistrés (d'où l'importance de « Terminer l'appel », rappelé dans l'UI).

**Coincé / à vérifier** : le chrono < 40 s pour 28 élèves se mesure sur téléphone réel (geste au pouce) — seul Alexandre peut le faire ; impression du récap à voir sur papier réel.

**Prochaine étape** : Phase 5 — inaptitudes & certificats (CRUD, photo compressée, alertes J-7 et > 3 mois, scénario « Tom » complet).

## 2026-06-11 (4) — Phase 3 : EDT, séquences, « en ce moment »

**Fait** :
- `modules/edt.js` : helpers exportés (`lundiDe`, `semaineCourante` — parité depuis le lundi de référence meta `semaineAReference`, `coursDuJour` — filtre jour + parité), vue EDT (carte alternance avec saisie du lundi A, formulaire créneau ajout/édition/suppression, liste par jour, grille PC), et `carteMaintenant()` consommée par l'accueil (cours en cours ou à venir, séquence active, création séance du jour en un tap, cours suivants).
- `modules/sequences.js` : liste (actives d'abord), création (datalist 23 APSA, CA1-4, dates, nb séances), détail éditable (objectifs/AFL en zone texte), séances numérotées dynamiquement par ordre de date (champ `numero` stocké à titre indicatif), doublon de date refusé, suppressions cascadées.
- `io.js` : cascades séance/séquence. `main.js` : accueil réel (carteMaintenant + carte alertes v0.4.0), routes `sequences` (parent Plus), bouchons edt/accueil remplacés. SW 0.4.0.

**Vérifié en preview** : scénario monté à 19h29 (créneau 19:29–20:59 jour courant, séquence Badminton active, réf. semaine A = lundi courant) → accueil « En ce moment · semaine A · 6A · Gymnase · Badminton — prochaine séance : 1/10 », tap → séance créée (date jour, n°1, edtId lié) ; parité A→B→A en décalant la référence ; créneau « semaine B » exclu de `coursDuJour` en semaine A ; formulaire EDT : heures invalides refusées, créneau mardi créé via l'UI (sections Mardi + Jeudi-aujourd'hui) ; séquences : carte liste « en cours · CA4 · 1/10 séances », ajout séance demain avec thème, doublon refusé, cascade séance (1 appel) et séquence (1 séance + 1 éval + 1 note) → tout à zéro ; console vide. Base laissée vierge.

**Décidé** : alternance A/B = parité calendaire pure (les vacances ne décalent pas) — limite v1 assumée, à confronter à l'EDT réel ; bilan de séance saisi depuis l'écran d'appel (phase 4) ; annulation ponctuelle de créneau reportée (backlog).

**Coincé / à vérifier** : rien de bloquant. Reliquats utilisateur inchangés (Android, GitHub Pages, export Pronote réel).

**Prochaine étape** : Phase 4 — l'écran d'appel (le cœur) : grille tactile, 7 statuts, compteurs, historique fiche élève, bilan de séance. Objectif < 40 s pour 28 élèves.

## 2026-06-11 (3) — Phase 2 : classes & élèves + import Pronote

**Fait** :
- `ui.js` : vues paramétrées (`afficherVue(id, params)` — sous-routes type `#/eleves/fiche/<id>`) + helpers de formulaire mutualisés (`champTexte`, `champSelect`, `champZone`, sauvegarde sur `change` avec retour « ✓ »).
- `io.js` : `parserCSV` (séparateur auto `;`/tab/`,`, guillemets, BOM), `decoderTexte`/`lireTexteCSV` (UTF-8 → repli Windows-1252 si « � »), `supprimerEleveEnCascade` (appels, inaptitudes, certificats + fichiers, notes, photo).
- `modules/eleves.js` (~450 lignes) : 4 vues — liste classes (création, archivées/restauration), classe (édition directe, ajout rapide, recherche, tri fr), fiche élève (identité complète + placeholders phases 4/5/6 + suppression cascade double-confirmée), import Pronote en 4 étapes (source collage/fichier/exemple → mapping auto-détecté modifiable → destination colonne/existante/nouvelle → résultat détaillé).
- `main.js` : router à segments, bouchon « eleves » supprimé, modules initialisés après les bouchons (ordre d'écrasement).
- SW 0.3.0 (+ `eleves.js`, + jeu d'essai CSV précaché) ; styles listes/avatars/table d'aperçu.

**Vérifié en preview (port 8160)** : parcours complet via l'UI réelle — exemple chargé, analyse (« 10 lignes, séparateur ; »), mapping auto 5/5 colonnes, import « 10 élèves importés dans 6A (1 classe créée) », ré-import « 0 importé · 10 doublons ignorés », tri alpha (BERTHE → ROUSSEAU), recherche « mar » → 2 homonymes, accents intacts (LÉVÊQUE, NUÑEZ, N'GUYEN), date 12/03/2014 → 2014-03-12, édition fiche persistée, cascade emporte l'appel factice, `decoderTexte` rend « Léa » depuis des octets 1252, console propre. Base remise à zéro après tests.

**Décidé** : rien de structurant (pas de nouvelle entrée decisions.md). Détail notable : l'émission de séquences `\u` dans le code a dû passer par un patch Node (quirk d'écriture), regex désormais en échappements explicites.

**Coincé / à vérifier** :
- Le serveur preview s'est encore arrêté entre deux sessions de vérification (2e fois) — toujours sans dégât, relance simple ; à surveiller, suspecter le cycle de vie des outils preview plutôt que le serveur lui-même.
- Critère de sortie phase 2 « officiel » = import d'un **vrai** export Pronote du collège (encodage et en-têtes réels) — seul Alexandre peut le faire, checklist dans `docs/pronote.md`.

**Prochaine étape** : Phase 3 — EDT (créneaux A/B, installations, « cours en ce moment ») + séquences/séances. Penser au réglage « semaine A de référence » dans Réglages.

## 2026-06-11 (2) — Phase 1 : sauvegarde, réglages, icônes, PWA

**Fait** :
- `io.js` : export/import JSON complets (blobs `fichiers` ↔ base64 via FileReader/fetch, `validerExport` qui rejette fichiers étrangers et schémas plus récents, `telechargerJSON`, `compterTout`, helpers `lireMeta`/`ecrireMeta`).
- `modules/sauvegarde.js` : écran complet — état des données, export (option pièces jointes), import (double confirmation + export de sécurité auto), purge totale (même protocole).
- `modules/reglages.js` : établissement + année scolaire (meta), thème, stockage (estimate/persisted/persist), version, bouton MAJ.
- `main.js` : routes enfants (`sauvegarde`, `reglages` sous l'onglet Plus), thème `data-theme` (auto/clair/sombre), `storage.persist()` au boot ; `state.js` porte `VERSION_APP` (0.2.0) et `estLocalhost()`.
- UI : icônes nav SVG Lucide inline ; styles formulaires/statuts/cartes-liens ; tokens sombres dupliqués média + `data-theme` (commentaire « modifier les deux »).
- Icônes PNG 192/512/512-maskable générées par `tools/gen-icons.ps1` (WPF natif Windows) — vérifiées visuellement ; manifest + SW 0.2.0 à jour.

**Vérifié en preview (port 8160)** : navigation complète, onglet parent actif sur routes enfants, **round-trip export → purge → import** (élève accentué, meta, blob texte restaurés à l'identique, base laissée vierge), rejet des sauvegardes invalides, thème sombre appliqué (`--c-fond` bascule), saisie établissement relue depuis IndexedDB, zéro erreur console.

**Coincé / à vérifier** :
- Le serveur preview 8160 s'est arrêté une fois en cours de session (cause inconnue, relancé sans souci) — surveiller.
- `storage.persisted()` = false sur localhost : normal (Chrome décide selon l'« engagement ») ; devrait passer à true une fois la PWA installée.
- Installation PWA réelle = besoin HTTPS → GitHub Pages à publier (décision utilisateur).
- Playwright : dépendance npm → validation explicite à demander avant (BIBLE).

**Prochaine étape** : finir la phase 1 (test Android réel + publication GitHub Pages si validée), puis phase 2 — Classes & élèves + import CSV Pronote.

## 2026-06-11 — Phase 0 : naissance du projet

**Fait** :
- Projet créé dans `carnet-eps` depuis le template projet (BIBLE, commandes, skills verbatim).
- Cadrage complet : `brief.md` (5 scénarios de référence), `fonctionnalites.md` (10 modules priorisés), `architecture.md`, `modele-donnees.md` (13 stores), `pronote.md` (import élèves / export notes + checklist d'établissement), `roadmap.md` (phases 0→9 avec critères de sortie), `decisions.md` (D001–D008).
- Squelette `app/` : shell 6 onglets (hash-router), tokens CSS clair/sombre, wrapper IndexedDB, manifest, SW versionné network-first (hors localhost), icône SVG, jeu d'essai CSV fictif.
- `server-carnet.mjs` (8160), lancé par `node server-carnet.mjs` à la racine ; rendu vérifié via preview (snapshot).

**Décidé** : D001 à D008 — voir `decisions.md`. Points saillants : pas de build ni framework ; wrapper IndexedDB maison ; Pronote par CSV/presse-papiers ; appel réglementaire laissé à Pronote ; SW inactif sur localhost.

**Coincé / à vérifier** :
- Formats Pronote réels (export élèves, collage notes) à valider sur le Pronote de l'établissement — checklist en fin de `pronote.md`.
- Installation PWA Android : nécessite HTTPS → prévoir GitHub Pages dès la phase 1 pour tester sur téléphone.

**Prochaine étape** : Phase 1 (socle) — commencer par l'export/import JSON et l'écran Réglages, puis icônes PNG et test d'installation réel.
