# Smoke-tests (Playwright) — Carnet EPS

Tests de fumée des parcours critiques. **Outil de développement uniquement** : l'application
(`app/`) reste 100 % vanilla, sans dépendance runtime. Playwright n'est jamais déployé
(`gh-pages` ne publie que `app/`).

## Lancer

```bash
npm ci                           # une fois (versions exactes du package-lock.json — C20)
npx playwright install chromium  # une fois, DEPUIS VOTRE TERMINAL : lancé par l'assistant Claude, l'install ne remplit
                                 # que son conteneur MSIX ; « Executable doesn't exist » = relancer cette commande ici (C25)
npm test                         # lance la suite
npm run test:ui                  # mode interactif
```

Le serveur de dev (`server-carnet.mjs`, port 8160) est lancé automatiquement ; s'il tourne
déjà, il est réutilisé.

## Couverture

**`smoke.spec.mjs` — 8 parcours critiques**

1. Chargement sans erreur console + navigation des 13 routes.
2. Créer une classe + persistance après rechargement.
3. Import Pronote (collage CSV).
4. Faire l'appel (tap + « Terminer »).
5. Suppression d'élève + **annulation** (le « Annuler » restaure la cascade).
6. Export / import JSON sans perte (round-trip).
7. Onglet Suivi + EDT déplacé dans « Plus ».
8. Ajouter une observation + cascade à la suppression de l'élève.

**`regressions.spec.mjs` — 31 tests de non-régression** des correctifs de l'audit du 2026-09-05
(`docs/audit-2026-09-05.md` — 15 constats sur 34 ont leur test ici : B01–B08, B10, B14, B22, B23, B29, B30, B34, plus H01–H05 ;
B09, B13, B15–B21, B24, B26, B27, B32, B33 : corrigés sans test, vérifiés par relecture ; B12 et B31 : testés dans
`audit5-lot4.spec.mjs` et `audit5-lot3.spec.mjs`) : grille d'appel à 360 px, import JSON altéré
refusé avant écriture, appui long vs défilement, double tap, double clic « Créer la séance »
(sélecteur + accueil), compteur « saisis », contrastes clair/sombre, élève « parti », vue en erreur,
suppression de classe référencée, coefficient 0, pastille de statut masquée, la vision par
trimestre (D012 : bornes/réglage, tableau de la fiche, périodes rapides du récap, alerte),
l'atomicité des écritures groupées (B29 : restauration, suppression et import tout-ou-rien) et les
hypothèses Codex H01–H05 (purge en une transaction, export instantané, écriture qui rejette sur un
abandon tardif — mutant réel —, doublon d'identifiant refusé, **service-worker** qui ne nettoie que
ses caches). Depuis le lot 5 du 5e audit (v0.12.12) : garde « aucune requête hors de l'origine + CSP » sur les 13 routes (C33),
horloge fixée au 5 janvier 2027 (C26), appui long qui ouvre bien le menu (C28), thème « Sombre » choisi (C29), création d'une
évaluation à coefficient 0 par l'interface (C27), et quatre écrans jamais testés : EDT, Documents, import complet de
Sauvegarde, utilitaires CSV (C31).

**`audit5-lot1.spec.mjs` (43), `audit5-lot2.spec.mjs` (5), `audit5-lot3.spec.mjs` (25), `audit5-lot4.spec.mjs` (13), `audit5-lot5.spec.mjs` (40)** — un test de non-régression par
constat *démontrable par le comportement* du 5e audit (`docs/audit-2026-09-07.md`, lots 1, 3, 4 et 5), chacun rouge avec le code
d'avant son lot ; les gestes de commentaire, de configuration et de documentation (C05, C39, C18, C20, C22, C23, C25, C58, C61…)
sont couverts par relecture ou par les gardes de cohérence de `audit5-lot5.spec.mjs` ;
les tests de `audit5-lot4` marqués « service-worker réel » se jouent sur `app.localhost`. **`audit-v3.spec.mjs` (9)** — audit Codex V3 du 2026-09-09 (`audit codex/AUDIT_V3.md`, hors dépôt), lot V3-A : la CLASSE
de défauts V3-01 — un champ dont l’écriture est refusée ne doit jamais être persisté ensuite par la modification
d’un champ voisin du même objet (évaluation, séquence, fiche élève, inaptitude, classe).

**`terrain.spec.mjs` (14)** — les trois constats du **test de terrain du 2026-09-09** (première séance sur un Android réel) :
l'export « Élèves » de Pronote met le nom et le prénom dans une seule colonne et laisse « Classe de rattachement » vide
quand on exporte une seule classe ; et « Terminer l'appel », placé sous la grille, sortait de l'écran dès une vingtaine
d'élèves. Les **six autres viennent de la revue adversariale** de ce correctif, chacun rouge avant sa
correction : la barre collante redevient un bloc ordinaire à l'impression (sinon la ligne « Appel complet ✓ »
disparaîtrait du papier où elle figurait) ; une colonne « Nom et prénom » n'est plus proposée **aussi** comme
« Prénom » ; une colonne de classe vide **avec des classes déjà créées** ne coche plus « Tout mettre dans » sur
la première de la liste (le deuxième export Pronote y versait la classe entière) ; une colonne parasite contenant
« nom » (« Nom du responsable ») ne désarme plus la scission, qui importait l'identité du **tuteur** ; la note
« colonne Classe vide » suit le remappage manuel au lieu de mentir ; et le découpage de la colonne unique est
**montré avant l'import**, les cas devinés en tête et comptés dans le bilan comme les homonymes (un nom à
particule ne donne aucune majuscule pour trancher : « de La Fontaine Apolline » devient nom « de »). Un test appelle directement `scinderNomPrenom` pour couvrir son repli, que le parcours
d'écran n'atteint pas. Un test de la v0.13.4 balaie la bande de 8 px entre « Terminer l'appel » et la navigation, page défilée : le
toucher y reste à la barre, sans atteindre une carte d'élève cachée dessous.
⚠ Les jeux d'essai reprennent la **structure** de cet export réel avec des **noms inventés** : aucune donnée
nominative dans le dépôt.

**`audit-v4.spec.mjs` (7)** — audit Codex V4 du 2026-09-09 (`audit codex/AUDIT_V4.md`, hors dépôt), rendu sur la
v0.12.17. Constat **V4-01** : deux colonnes « du responsable » satisfont les règles « nom » et « prénom » et
désarmaient la colonne unique « Élèves » — l'élève entrait dans la base sous l'identité de son parent.
La détection ne repose PAS sur une liste de libellés interdits : elle classe les colonnes par **force du signal**
— 3 l'en-tête nomme le champ et l'entité (« Nom de l'élève »), 2 l'en-tête EST le champ (« Nom », « Élèves »),
1 il contient seulement le mot (« Resp. Nom ») — et une colonne d'identité au signal faible ne peut pas déplacer
une colonne unique reconnue. La revue adversariale a montré qu'une liste ne pouvait pas tenir : Pronote abrège
« responsable » en « Resp. » dans ses propres en-têtes (l'export réel du terrain contient « Cnx Resp. ») et Siècle
numérote « RL1 ». Deux **témoins** encadrent le correctif (de vraies colonnes « Nom » et « Prénom » gardent la
priorité ; le choix manuel des colonnes du responsable reste possible), une **table de non-régression** couvre
vingt et une combinaisons d'en-têtes — dont les abréviations qu'aucune liste ne contient — et deux tests gardent
les correctifs d'écran : l'identité incomplète est annoncée avant le clic, et un import abouti ne se rejoue pas.

**`audit-v3-b.spec.mjs` (6)** — famille B de l'audit Codex V3, la passerelle Pronote. **V3-02** : « Copier pour
Pronote » lisait la grille en mémoire pendant qu'une saisie était encore en vol et transmettait l'ancienne
valeur, pendant que la base enregistrait la nouvelle. Les écritures de notes sont désormais **sérialisées**, et
les trois sorties (copie, zone de secours, CSV) attendent la file — une écriture refusée bloque la copie et le
dit, plutôt que de laisser partir une valeur périmée. **V3-03** : le marquage « publiée » survivait à un
changement de note ou de barème, si bien que l'écran affirmait « publiée ✓ » sur des valeurs qui n'étaient
jamais parties dans Pronote. La date est conservée — elle dit quand la remontée a eu lieu — et l'évaluation
passe « à remettre à jour », dans le badge comme dans les alertes du suivi. Un témoin vérifie qu'une nouvelle
copie efface la demande.

**`audit-v3-c.spec.mjs` (11)** — fin des constats ouverts de l'audit Codex V3, **repris de la copie de travail de Codex**
(`copie-codex/`, v0.13.2) sans ses grilles d'évaluation ni son schéma 3. **V3-02, suite** : une case en erreur bloque
la copie tant qu'elle n'est pas corrigée, même si une autre note s'enregistre ensuite — que l'erreur vienne d'une
panne de stockage ou d'une simple saisie refusée — et la zone de copie manuelle disparaît dès qu'une note change.
**Concurrence** : un barème abaissé attend la saisie en vol puis la contrôle, un onglet resté sur l'ancien barème ne
peut plus enregistrer au-delà du nouveau, un onglet périmé ne peut plus écraser une note modifiée ailleurs, la copie
relit la base, et une note modifiée pendant la copie empêche de confirmer la publication. **V3-04** : l'accueil à
paramètre inédit sort du cache sans attendre un réseau ralenti de 4 s. **V3-05** : export et import partagent la
limite de 200 Mo, et un export trop gros est refusé avant de produire le fichier. Un dernier test garde un **écart
volontaire** avec la copie : une évaluation qui porte une note ancienne au-dessus du barème reste modifiable — la
version de Codex validait toutes les notes à chaque écriture, ce qu'une mutation dédiée rend rouge.

**`audit-v5.spec.mjs` (5)** — audit Codex V5 du 2026-09-09 (`audit codex/AUDIT_V5.md`, hors dépôt), rendu sur la
v0.12.18. V4-01 y est confirmé corrigé ; **V5-01** en est la variante résiduelle : le correctif V4 écartait une
colonne d'identité faible **face** à une colonne sûre, mais deux signaux faibles restaient retenus **ensemble**
quand rien de sûr ne leur faisait concurrence. Un fichier `Nom contact;Prénom contact;Classe` créait donc un élève
sous l'identité du contact. La détection tient désormais en **une seule règle** : une identité n'est proposée
d'office que sur un en-tête **propre**, qui ne nomme que le champ, l'élève et des mots de liaison. Les deux
arbitrages de la v0.12.18 disparaissent, absorbés par elle. Un témoin garde le mapping manuel, et la table couvre
les libellés de tiers sans colonne sûre en face, ainsi que les pluriels (« Prénoms », « Prénom(s) ») qui
n'étaient reconnus par rien.

**`grilles.spec.mjs` (35)** — module des grilles d'évaluation, **repris de la copie de travail de Codex** (v0.13.3) : calcul
(18 sur 24 donne 15 sur 20, poids, critère non évalué distinct de zéro, arrondis), bibliothèque de modèles, parcours complet
jusqu'à la copie Pronote, grille figée, saisie par critère, statuts ABS/DISP/NN, points ajustables au clavier et à l'appui long,
panne et écriture concurrente, sauvegarde et rendu mobile. Seule adaptation : le message de conflit attendu est celui de la
v0.12.20 (« autre onglet »). Onze tests de la v0.13.4 (retour de l’essai téléphone, revue puis contre-revue) mesurent la
saisie « un élève à la fois » au pouce : après « Élève suivant », les 16 cases, le nom et le rang sont visibles entre l’en-tête et
la barre — le toucher au centre de chaque case arrive sur la case elle-même —, la barre reste à la même place depuis le haut ET
depuis le bas de page, et la bande sous la barre ne touche rien d’autre, à 360 × 800, 375 × 812 et 412 × 915 ; première rangée
visible à l’ouverture, actions de bureau au-dessus de la barre en bas de page et visibles sans défiler sur PC ; au plus 120 px par
élève en mode « Par critère », choix du critère dans la liste ramené en haut ; texte agrandi à 320 et 360 px avec un nom de famille
long (barre ≤ 15 % de la hauteur ou décrochée), hauteur de fenêtre qui change seule, et paysage ; écriture refusée affichée dans la
barre sans rien recouvrir, une seule annonce, gardée au rechargement, effacée seulement quand CE choix est réécrit ; **vrai conflit
d’écriture** (message long, nom composé, messages persistants posés au-dessus de la barre) : la barre garde sa place au pixel près
et « Élève suivant » comme « Critère suivant » restent atteignables, sans écrire pour un autre élève ; case atteinte au clavier
jamais sous la barre (2.4.11, aussi à 200 % et quand la barre grandit) ; élève choisi dans la liste au doigt montré en entier, liste
gardée à l’écran au clavier, dans les deux ordres de gestes ; annonce exacte du nouvel élève et du nouveau critère ; libellés de
niveau longs jamais coupés au milieu d’un mot, mesure au caractère (cases élargies, puis une seule colonne), rotation comprise. Les
tests d’écran utilisent des libellés de niveau courts, pour ne pas dépendre de la police installée. Un tap ne fait défiler l’écran ni quand la ligne d’erreur apparaît, ni quand la fenêtre change de hauteur, même si la case
touchée est passée sous la barre (seul le focus CLAVIER est ramené en vue) : le test pose d’abord ses prémisses (focus sur la
case touchée, focus non clavier, case recouverte) et vérifie que la barre a bien grandi. Quarante-cinq mutants rendent ces
tests, ceux de `terrain.spec.mjs` et les assertions FON-05 rouges. La v0.13.5 (audit Codex V7) ajoute deux tests en écran
tactile simulé (`test.use({hasTouch:true})` : un clic de souris ne reproduit pas le piège de `:focus-visible` sur un
`<select>`, un toucher si) — statut ABS choisi au doigt, valeur tapée au clavier virtuel dans « Ajuster » —, leur pendant à
la souris avec un vrai clavier (`test.use({hasTouch:false})`), et prolonge le
test des écritures refusées : un échec rattrapé ne ressuscite pas, celui d’un élève « parti » n’est pas perdu. Toute mesure
de défilement attend deux images (`deuxImages`) : le ResizeObserver tourne au rendu suivant.

**`grilles-robustesse.spec.mjs` (6)** — quatre tests de concurrence et de clavier repris de la copie de Codex (AUD-002, AUD-006),
et deux tests propres à l'intégration qui fixent la frontière de la validation des sauvegardes : une sauvegarde ancienne portant
un barème à 0, une note au-dessus du barème, la note d'un élève supprimé et la séquence d'une classe supprimée **reste
restaurable** en schéma 3 — la copie la refusait en bloc, ce qu'une mutation rend rouge — tandis qu'une note de grille
incohérente avec ses critères est refusée avant toute écriture.

**`bareme-partielles.spec.mjs` (8)** — deux finitions avant la mise en ligne des grilles. **V3-B3** : changer le barème d'une
évaluation déjà notée pose la question — convertir, où 8/10 devient 16/20, garder les points, ou annuler — ; les codes ne
bougent pas, la conversion non entière est arrondie au centième et marque la publication à refaire, garder des points au-dessus
du nouveau barème reste refusé, et sans note chiffrée aucune question n'est posée. **Notes partielles** : une note de grille
calculée sur une partie des critères est listée dans le récapitulatif de copie, avec un libellé propre à chaque règle de calcul.
Les tests existants qui changeaient le barème d'une évaluation notée répondent désormais « Garder les points », ce qui préserve
le scénario qu'ils prouvaient ; une mutation qui retire la sérialisation des changements de barème les rend rouges.

**`audit-independant.spec.mjs` (22)** — premier lot de l'**audit indépendant du 2026-09-16** (rapport hors dépôt), livré avant l'essai
téléphone, complété par deux revues adversariales du lot. **FON-01** : le module `state.js` est intercepté pour FORCER le drapeau dans
les deux sens — vrai, l'en-tête et le titre annoncent la version d'essai ; faux, l'application démarre (preuves produites par `main.js`
après le bloc d'essai, sans quoi le test serait vrai sur le HTML statique) sans marqueur — et une garde statique exige que le manifeste
suive le drapeau commité, champ par champ ; en-tête compact à 320 et 375 px, bandeau sur une ligne à 200 % ; **B05** : la marge de focus
suit la hauteur réelle de l'en-tête (Maj+Tab ne cache plus la case sous le bandeau), y compris texte agrandi sans redimensionnement.
**FON-05 / PER-05** : taps rapides sur deux critères ou deux élèves tous enregistrés (clics dans la MÊME tâche, sans délai artificiel :
le second était jeté par le verrou `occupe`) ; **même geste, même résultat** — retoucher efface, que le second tap arrive pendant ou
après l'écriture, consigne affichée sur la grille par défaut, et changer d'avis dans la rafale garde le dernier choix ; retour immédiat
sur une ligne qui n'est pas la première (ancien niveau éteint, autres lignes intactes), rien de désactivé, `aria-busy` ; contour pointillé
réellement **calculé** sur une case choisie, effacée, atteinte au clavier et sur le sélecteur de statut ; **fin de rafale sans
reconstruction** (MutationObserver : aucun retrait, cases toujours dans la page, focus resté où l'on est allé, score mis à jour) ;
appui long commencé pendant une écriture qui ouvre bien « Ajuster » ; vue quittée puis rouverte en pleine rafale (état final relu, tap
suivant accepté) ; erreur de rafale non recouverte, nommée avec sa cause, prise sur la ligne touchée en mode par critère, sans message
en double, visible après passage à l'élève suivant et en message si la vue est quittée ; feuille « Ajuster » ouverte pendant une
écriture (valeur voulue, focus rendu) ; bouton désactivé à opacité réduite. **SEC-04** : garde statique sur la CI, insensible au CRLF —
bloc `permissions` en lecture seule et chaque action épinglée par un SHA de 40 caractères commenté de sa version. **25 mutants** (un par
promesse) rendent ces tests rouges.

**`essai-terrain.spec.mjs` (6)** — retours de l'**essai sur téléphone du 2026-09-16** (v0.13.1). Couleurs de l'appel : l'écart
perceptuel (CIEDE2000) est calculé sur les pastilles et bordures **réellement rendues** — carte d'élève témoin, styles calculés —
en thème clair, en sombre choisi et en **sombre automatique** (`prefers-color-scheme`, bloc de styles distinct) : au moins 30 entre présent, absent, retard et oubli de tenue (15 à 16 avant), au moins 18 entre deux statuts
quelconques, lettre ≥ 4,5:1 et bordure ≥ 3:1. La fiche élève affiche la même pastille que l'appel. Les couleurs de niveau d'une
grille, mesurées sur une case rendue, ressemblent à leur nom. La première carte de l'écran des grilles n'est plus collée à la barre
d'actions. Sept mutants (ancienne palette claire, ancienne palette sombre automatique, pastille du retard, couleurs de grille rebranchées sur les statuts, espacement, les deux
pastilles de la fiche élève) rendent ces tests rouges.

**`marqueurs-migration.spec.mjs` (16)** — marqueurs de séance, **v0.14.0 « le format seul »** (contrat
`docs/avis/AVIS_FORMAT_MARQUEURS.md`, §11.1) puis **v0.14.2 « poser et relire »** (MIG-08, MIG-11, MIG-12) : le vocabulaire et
les poses sont écrits par `io.js` (MIG-08 les rend en plus à l'écran). La base est vidée en **dérivant** la liste des magasins de
`io.STORES`. **MIG-01** : une base de schéma 3 créée avant le chargement
de l'application monte en 4, les deux magasins naissent avec les trois index de `marquages`, un appel est relu champ pour champ.
**MIG-02** : la base montée en 4 refuse de s'ouvrir en 3 (`VersionError`, ce que ferait une v0.13.5) et rend ensuite les mêmes
poses ; devant une base plus récente qu'elle, l'application affiche un message en français. **MIG-03** : un cycle présent →
absent → oubli de tenue par taps (donc `definirStatut`, commentaire hérité relu) laisse les poses intactes. **MIG-04** :
aller-retour JSON sans perte, `schemaVersion` 4. **MIG-05** : une sauvegarde de schéma 3, importée par l'écran, vide les deux
magasins **et le dit** dans la confirmation. **MIG-06** : une sauvegarde de schéma 5 est refusée sans rien vider, la même en
schéma 4 passe. **MIG-07** : quinze altérations (six du contrat, neuf ajoutées par la revue de la v0.14.0) refusées une à une, base intacte, un message distinct par cas ; une pose sans
`courtSecours`, `genreSecours` ni `occurrences`, un marqueur sans `genre`, `couleur` ni `archivee`, et un champ inconnu sur l'un et
sur l'autre sont acceptés et relus tels quels. **MIG-08** (v0.14.2) : une sauvegarde réelle au vocabulaire vide, qui porte quatre
poses orphelines, s'importe ; à l'écran la rangée existe quand même (elle vient des poses de la séance), un orphelin de rôle ou
d'équipe devient un code gris sans couleur (`BX7`, ou `?` sans code de secours) nommé « marqueur supprimé (BX7) », un orphelin de
comportement ou sans genre n'est qu'un repère neutre (jamais « ? » ni son code : le genre décide d'abord) ; dans la feuille « ⋯ »,
l'orphelin est pressé et retirable (annonce « Marqueur supprimé retiré de … », majuscule en tête — revue v0.14.2, K4), puis reste
en place, verrouillé, et ne se repose pas ; un marqueur connu de genre inconnu ou
absent se range avec les comportements ; test pur de `trierMarqueurs` (genre, archivés en dernier dans leur genre, libellé ; entrée
intacte) ; aucune erreur console. **MIG-09** (trois tests) : supprimer une séance, une séquence ou un élève emporte les
poses, la confirmation les compte (« 4 marqueurs posés ») et « Annuler » les restaure. **MIG-10** : `appliquerMarquages` rejette
quand la transaction avorte après le succès de la requête d'écriture. **MIG-11** (trois tests, v0.14.2) : une pose et une ligne
d'un autre magasin (appel, observation) écrites par « un autre onglet » juste avant la cascade d'une séance, d'une séquence ou d'un
élève partent avec elle — chaque cascade collecte et supprime dans UNE transaction d'écriture (une seule pour toute la séquence,
comptée) — et « Annuler » les rend. **MIG-12** : une cascade qui avorte au commit rejette et ne supprime rien. **Treize mutants**
de la v0.14.0 (M01, M02, M03, M05, M07, M08, M09, M10, M32, M33, M34, M49, M50 ; 15 exécutions avec les variantes de M49 et M50 ;
M07 à M09 réancrés en v0.14.2 sur les cascades en une transaction) rendent ces tests rouges, chacun par son propre test ; en
v0.14.2, M12, M86 et M88 (MIG-08), M113 à M116 (MIG-11) et M117 (MIG-12) ; revue adversariale de la v0.14.2, M140 (MIG-08).

**`marqueurs.spec.mjs` (29)** — marqueurs de séance, **v0.14.1 « le vocabulaire »** (contrat §6.5 et §11.2) : l'écran
`#/marqueurs` (MQ-12, MQ-17 à MQ-20) ; puis **v0.14.2 « poser et relire »** : la pose par la feuille « ⋯ » de l'appel (§6.2) et
les écritures durcies (MQ-01 à MQ-11, MQ-13, MQ-15, MQ-16, MQ-21 à MQ-26), et les tests de la revue adversariale de la v0.14.2
(MQ-27 à MQ-30 ; contrat §16, une ligne par constat). Même `beforeEach` dérivé de `io.STORES` ; projet
chromium seul (les gestes au doigt sont dans `marqueurs-ecran.spec.mjs`). **MQ-12** : un code court déjà pris sous une autre forme (« éq » contre
« EQ ») est refusé, avec son motif, par la relecture **dans** la transaction — la collision est écrite juste avant la
transaction d'écriture, derrière une vue ouverte sur un vocabulaire vide ; rien n'est écrit, la saisie reste ; le genre est
verrouillé en modification et n'est jamais transmis, même forcé par programme ; le même code est accepté après renommage du
premier (témoin). **MQ-17** : un champ inconnu survit au renommage par le formulaire ; `ecrireMarqueur(id, { id: 'autre' })`
n'écrit que la ligne `id` ; un marqueur importé sans genre ne s'archive pas (aucun genre par défaut) et, à l'écran, se lit et se
range « Comportements » comme un genre inconnu, le refus d'« Archiver » étant dit en toast. **MQ-18** : l'amorçage crée les six
marqueurs proposés par `ecrireMarqueur`, couleurs distinctes pour les rôles et les équipes, puis disparaît dès qu'un marqueur
existe (même archivé) ; sur une vue périmée (marqueur écrit derrière une liste rendue vide), le geste relit la base, ne crée
rien, le dit et garde le focus dans la vue ; un « ARB » créé ailleurs juste avant la première écriture donne « 5 marqueurs créés
sur 6 » et le motif, à l'écran et en toast. **MQ-19** : deux marqueurs actifs de même code (sauvegarde bricolée) sont nommés dans
la liste (mention sur chaque carte du groupe) et dans le formulaire ; archiver l'un depuis l'alerte, au clavier, libère l'autre,
qui se modifie de nouveau, et le focus reste dans la vue ; archivés en dernier dans un genre ; « Restaurer » un marqueur dont le
code est repris est refusé et dit, puis réussit une fois le code libéré. **MQ-20** : une composition de clavier (type Gboard,
par CDP) en minuscules n'est jamais réécrite pendant la frappe, le champ s'affiche en majuscules et « ARB » est enregistré ;
l'aperçu d'un rôle montre son code, qui suit la frappe ; celui d'un comportement ne montre que le repère neutre, sans texte,
couleur masquée, dans le formulaire et dans la liste. **Vingt-huit mutants** (M06, M31, M35, M51 ; M63 à M70 avec les variantes
de M66 et M67 ; M71 à M77 avec leurs variantes, revue de la v0.14.1) rendent ces tests rouges, chacun par son propre test (A43
pour le précache).
En **v0.14.2** (la vue d'appel ouverte par l'adresse, tous les gestes par la feuille « ⋯ ») : **MQ-01** : poser n'écrase ni le
statut, ni les minutes de retard, ni le commentaire qu'« un autre onglet » a écrits derrière une vue périmée. **MQ-02** : l'appel
supprimé derrière la vue est relu dans la transaction — la pose est refusée avec son propre texte (« Appel introuvable pour… »,
qui ne nomme aucun contrôle absent), **annoncé** aussi (jamais « … posé sur … »), aucun échec durable ; après un statut tapé et
refusé sur CE même écran, le refus dit « … son statut n’a pas été enregistré. Choisissez-le de nouveau. », jamais « un autre
écran » (revue v0.14.2, R02, R08, R24). **MQ-03** : deux poses en panne dans la même rafale (base tenue
occupée) — l'écran revient au dernier état confirmé, l'échec est annoncé, dit en toast qui nomme le marqueur et l'élève, avec
le conseil « mémoire de l'appareil pleine », et affiché dans la barre, QUOI et QUI d'abord, un seul « : » (revue v0.14.2, D2) ; puis un tap récent réussi n'est pas défait par l'échec d'un plus ancien. **MQ-04** : la pose
et le retrait ont leur propre annonce, jamais celle d'un statut, et l'appel n'est pas réécrit ; feuille ouverte, elle est écrite
dans la région de la FEUILLE, celle de la vue (inerte sous la modale) ne reçoit rien (revue v0.14.2, D1 — MQ-02, MQ-03 et ECR-14 y
lisent aussi l'annonce ; l'exposition elle-même est prouvée par ECR-21). **MQ-05** : un élève pas encore
appelé — boutons `aria-disabled` (jamais `disabled`), paragraphe de refus dans le premier groupe, toast au tap (« Terminer
l'appel » ne passe en présent que les élèves pas encore saisis, R07), aucune écriture ; aucun statut pressé dans sa feuille, ni
après un statut refusé par la base (K2, D3) ;
« Retard » choisi dans la même feuille lève le verrou en direct ; vocabulaire vide dit. **MQ-06** : « Terminer l'appel » ouvre la
pose pour toute la classe. **MQ-07** : cumul libre (Équipe 1 et Équipe 2, deux codes visibles). **MQ-08** : reposer (second
onglet) ne crée pas de seconde ligne. **MQ-09** : `occurrences: 3` et `dateAjout` survivent à la relecture, à l'aller-retour JSON
et à la repose. **MQ-10** : un marqueur archivé ailleurs reste lu sur la carte, apparaît « (archivé) » en dernier de son genre,
se retire, reste en place verrouillé sans jamais se reposer, et n'est plus proposé à un autre élève. **MQ-11** : renommer suit
tout l'historique (le vocabulaire gagne sur l'instantané) ; l'aperçu de l'écran du vocabulaire (formulaire et liste) a les
tailles calculées exactes du code de la carte, largeur comprise (revue v0.14.2, D4 : un code de la carte n'est plus jamais
rétréci) ; le code de la carte est mesuré après la passe de l'observateur de taille, en une seule évaluation (D10, R23 :
`mesurerCode` — deux images, puis le nœud résolu et mesuré dans la même tâche, jamais un nœud que la passe a remplacé). **MQ-13** : douze rôles aux ids inversés, tous atteignables ; « derniers utilisés »
en tête à la réouverture de la vue, jamais sur un retrait, ordre gelé dans la vue. **MQ-15** : poser n'écrit ni observation ni
note (témoins : une observation et une note font bouger les comptes). **MQ-16** : la rangée est masquée à l'impression (la carte
reste imprimée) ; le récapitulatif et son CSV (BOM retiré) n'ont que les colonnes dérivées de `STATUTS` ; à l'impression
(718 px, une A4 à marges de 10 mm), 🩺 et ⚠ ne recouvrent aucune lettre d'un nom — rangée présente, cartes avec et sans pose, ou
non — et restent où les imprime une carte sans rangée (revue v0.14.2, D9, R18 ; prémisse : des lettres de la dernière ligne d'un
nom à l'aplomb d'un signal) ; le code visible à l'écran est mesuré après la passe de l'observateur de taille, en une seule
évaluation (D10, R23), et les mesures d'impression attendent deux images. **MQ-21** : « Terminer
l'appel » et le pré-remplissage des inaptitudes ne remplacent jamais un statut posé ailleurs (écrit juste avant leur transaction),
le disent (« 1 statut déjà saisi sur un autre écran : conservé. ») et alignent l'écran sur la base, y compris après une panne et
pour un tap pendant l'écriture. **MQ-22** : `completerAppels` en appel direct — appel existant rendu intact, durabilité (abandon au
commit), élève supprimé écarté, séance supprimée refusée, candidat incohérent refusé en bloc, conseil de `motifEcriture` ; un
appel retrouvé par (séance, élève), jamais par sa clé, et une clé prise par l'appel d'un autre élève refusée sans l'écraser
(revue v0.14.2, R03).
**MQ-23** : une pose sur une séance ou un élève supprimés ailleurs est refusée même quand un tap dans la vue périmée a recréé
l'appel (écran puis `io.js`, option « ignorer ») ; le retrait reste toujours permis. **MQ-24** : la carte « Plus » promet la pose,
l'écran du vocabulaire n'annonce plus la prochaine version. **MQ-25** : échecs durables en session par identifiants seulement,
réaffichés au retour, écartés dès l'ouverture quand ils sont rattrapés ou obsolètes, gardés sans affichage pour un élève sorti de
la vue. **MQ-26** : « derniers utilisés » illisibles (autre forme, liste de non-chaînes, JSON cassé) — l'appel s'affiche, la feuille
garde l'ordre du catalogue, aucune erreur, et la liste suivante repart propre. **Revue adversariale de la v0.14.2** (deux pages
du même contexte = deux onglets, une base) : **MQ-27** — un échec rattrapé dans l'autre onglet quitte la ligne et la session dès
l'écriture réussie suivante, un échec non rattrapé reste (R01) ; **MQ-28** — après sa propre pose, la vue repeint toute carte
que la base a changée, et la carte ne contredit plus sa feuille (R06) ; **MQ-29** — sortie puis retour pendant une rafale de neuf
poses, la première tenue : la vue rouverte attend la file, montre les huit poses et l'échec de la neuvième (R26 ; au-delà de
cinq écritures en file, la vue sans l'attente en montrait cinq) ; **MQ-30** — « Terminer l'appel » sur une sauvegarde tierce qui
range un appel sous la clé d'un autre élève : aucune erreur, l'écran dit la base, rien d'écrit, refus dit (R03). Mutants de la v0.14.2 tués par ces tests : M04,
M04b, M11, M13 à M16, M28 à M30b, M45, M48, M68 et M76 (réancrés), M89 à M110, M118 à M124 (M111 et M112 : A27,
`audit5-lot5.spec.mjs`) ; revue adversariale : M126 à M132, M135, M136, M138, M139, M141 à M144 (M14, M15, M48, M91, M94, M95,
M97, M102 et M104 réancrés) ; troisième lot : M169, M170 ; quatrième lot (D10) : M171, M172.

**`marqueurs-ecran.spec.mjs` (18)** — marqueurs de séance, **v0.14.2 « poser et relire »**, le geste au gymnase (contrat §6.1,
§6.2, §7, §11.3 ; §14 réponse 11 ; ECR-20 à ECR-27 : revue adversariale de la v0.14.2, contrat §16) : joués aussi sur le projet
mobile (Pixel 7), gestes au doigt (`hasTouch` + `tap`), erreurs
console et exceptions écoutées avant la première navigation et affirmées vides après chaque test, horloge figée sur le pire cas
et deux images avant toute mesure, taille du texte par le CSSOM. **ECR-01** : la zone des marqueurs est entre « Minutes de
retard » et le commentaire ; deux taps sur « Arbitre », le second pendant l'écriture du premier, donnent pose puis retrait sans
toucher au statut ni fermer la feuille ; sur une vue périmée, le tap veut poser et la ligne reste. **ECR-07** : deux codes puis
« +2 » calculé sur les données, nom accessible complet, ordre des genres (un rôle avant une équipe même quand l'alphabet dit
l'inverse, un orphelin après les rôles connus), jamais l'usage récent ni l'ordre de lecture ; à 320 px et 200 %, « +n » compte
les codes masqués et ce qui reste affiché garde l'ordre de la carte. **ECR-08** : un comportement n'a aucun code, un repère neutre identique pour tous, de taille non nulle, en encre
pleine dans les deux thèmes, compté sans être nommé ; le code d'un rôle aussi en encre pleine. **ECR-09** (récrit par la revue v0.14.2, D4,
R15, R16) : à 320 et 360 px, 100, 130 et 200 %, police locale et Verdana, sans rechargement, 🩺 et ⚠ ne recouvrent jamais la
rangée, même sur une carte étirée par sa voisine ; la rangée reste dans la carte ; le repère passe en tête, entier, et ne cède
jamais ; **tout ce qui est affiché est entier**, caractère par caractère (rectangle de `Range` dans sa boîte et dans la rangée,
premier plan en son centre), jamais d'après le texte du DOM ; ce qui cède suit l'ordre de la réponse 11 (2e code, 1er code, repères
au-delà du premier) et ne cède pas pour rien (réaffiché, le dernier masqué déborde) ; « +n » compte tous les codes masqués ; deux
codes courts tiennent à 100 % et le 2e disparaît à 200 %, sous les deux polices ; « E11 » et « E1 » (préfixe, même couleur) ; un
rôle, une équipe et un comportement : « ● +2 » à 320 px et 200 %. **ECR-10** : la carte ne change pas de hauteur au
premier marqueur, à 100 % puis 200 %. **ECR-12** : une pose en panne fait grandir la barre sans faire défiler l'écran sous le
doigt. **ECR-13** : cinq « À recadrer » n'ajoutent aucune alerte (témoin : trois oublis de tenue en donnent une). **ECR-14** :
l'ordre de la feuille est gelé pour toute la vue, change à la réouverture ; sans `localStorage` ni `sessionStorage`, la pose et le
retrait fonctionnent, et ne sont jamais DITS non enregistrés — aucun toast, aucune ligne d'échec, annonce de la pose puis du
retrait (revue v0.14.2, R20). **ECR-15** : vocabulaire vide, ou seulement archivé, et séance sans pose : aucune rangée, l'écran d'appel
fonctionne (témoin : un marqueur actif en donne une par carte). **ECR-16** : posé, non posé et verrouillé se distinguent sans
couleur ni lecteur d'écran (contour, bordure en tirets). **ECR-20** (revue v0.14.2, D2) : la ligne d'échec durable nomme QUOI et
QUI d'abord, chaque caractère visible (rectangle de `Range` dans la boîte et la fenêtre, premier plan en son centre), seule la
cause écourtée, un seul « : » — à 320, 360 et 412 px, 100 % et 200 %, police locale et Verdana, un puis deux échecs aux noms
longs. (ECR-17 à ECR-19 sont réservés au mode tampon, v0.14.3.) **Revue adversariale de la v0.14.2, second lot** (vu = élément au
premier plan au centre du nœud, `elementFromPoint` ; entendu = nœud de texte non ignoré sous une région `status` non ignorée, dans
l'arbre d'accessibilité de Chromium lu par CDP — `toBeVisible` ne voit pas l'occlusion, ni `toHaveText` l'inertie d'une modale) :
**ECR-21** (D1) : feuille « ⋯ » ouverte, le refus « pas encore appelé », l'échec d'écriture (annonce et toast) et la pose sont
vus et entendus ; la pile des toasts vit dans la feuille, en haut, sans la recouvrir, et un point entre deux messages est le fond ;
fermée, la pile revient au document, toast encore vu et entendu, ligne durable au premier plan ; « Retard » choisi dans la feuille
annonce dans la feuille, « Présent » (qui la ferme) dans la région de la vue, entendue — témoin : feuille fermée, la vue est
entendue. **ECR-22** (D1, la classe) : confirmation, choix, feuille d'observation (même `ouvrirFeuille` que « Ajuster les
points ») et visionneuse — un toast émis pendant qu'elle est ouverte est vu, entendu, dans la modale ; sa région d'annonce est
entendue ; fermée, la pile revient au document. **ECR-23** (D5) : « Fermer » dans la fenêtre et au premier plan à l'ouverture et
après une pose, pied opaque, même place en fin de défilement, commentaire au premier plan tout en bas, aucun contrôle focalisé au
clavier caché sous le pied — taille du projet et 360×640, 100 % et 200 %, police locale et Verdana (prémisse : à 200 %, la feuille
défile toujours). **ECR-24** (D6, R25) : dans la feuille de l'élève MARQUÉ, poser ne déplace ni ne redimensionne aucun bouton, à
une largeur limite trouvée (un pixel de plus au bouton posé y renverrait un voisin à la ligne), deux vocabulaires, 100 % et 130 %,
deux polices. **ECR-25** (D6, R12) : au clavier, un marqueur posé qui a le focus se distingue d'un posé sans focus (contour
calculé, pixels), anneau ≥ 3:1, contour de l'état posé conservé, clair et sombre. **ECR-26** (D8, R13) : libellé et code d'un
archivé ou d'un supprimé posé ≥ 4,5:1 sur le fond composé (`color(srgb …)` lu comme tel), encre atténuée gardée, état posé dit
par le contour, clair et sombre. **ECR-27** (D8, R14, R19) : en couleurs forcées, palettes claire et sombre, le repère d'un
comportement a un fond opaque, ≥ 3:1 sur le fond vu derrière lui, et des pixels peints distincts de ce fond (témoin : sans
couleurs forcées). Mutants tués par ces tests : M17, M21 à M24 (avec variantes), M38, M38b,
M39, M42 à M44, M47, M79 à M85 (avec M83b, addendum de la v0.14.2 ; M80b retiré par la revue, D4), M87, M125 ; revue
adversariale : M133, M134, M136, M137, M139, M145 ; second lot : M146 à M163 (avec M151b, M151c, M156b ; M38 réancré) ;
troisième lot : M164 à M168 (M23, M80 et M81 réancrés). Campagne de la v0.14.2 : 134
mutants rejoués (84 de la v0.14.2 avec leurs variantes, 27 de la v0.14.1, 23 de la v0.14.0), tous tués par leur propre test.
Campagne complète après les quatre lots de la revue adversariale (2026-09-29) : 183 mutants (M80b retiré, M126 à M172 ajoutés),
tous tués par leur propre test ; M84, M93 et M120 rejoués cinq fois, sans aucun rouge intermittent (D10).

Total de la suite : **357 tests** (+ 105 rejoués sur le projet **mobile**, Pixel 7 émulé : `audit5-lot3.spec.mjs` sauf le test de position des toasts, propre au PC, `grilles.spec.mjs`, `grilles-robustesse.spec.mjs`, `audit-independant.spec.mjs` et `marqueurs-ecran.spec.mjs`).

> **Tests du service-worker** (H05, lot 4) : ils naviguent sur `http://app.localhost:8160` (Chromium résout `*.localhost` en boucle locale = contexte
> sécurisé, mais pas « localhost » pour `estLocalhost()`, donc le SW s'enregistre ; repli `[::1]` puis `127.0.0.2`). Si aucune adresse
> de bouclage hors localhost ne répond, le test est **ignoré avec sa raison**, jamais un faux vert.

> Convention : tout correctif d'audit arrive avec son test ici ; les specs de vérification
> temporaires (préfixe `_`) sont supprimés avant commit.

## Non couvert ici (à vérifier à la main — cf. `docs/test-terrain.md`)

Installation PWA, **caméra**,
collage réel dans Pronote, **impression** A4, restauration d'une sauvegarde réelle avec pièces jointes (l'import complet d'un fichier est testé, C31). Le **hors ligne** est testé
avec le service-worker réel (`audit5-lot4.spec.mjs`, A40 : `context.setOffline` sur un hôte de bouclage hors
localhost — D008 reste vraie sur `localhost`).

> Chaque test repart d'une base IndexedDB vide (vidée via `io.js` dans `beforeEach`).
