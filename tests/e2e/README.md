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

**`marqueurs-migration.spec.mjs` (11)** — marqueurs de séance, **v0.14.0 « le format seul »** (contrat
`docs/avis/AVIS_FORMAT_MARQUEURS.md`, §11.1) : aucun écran nouveau, le vocabulaire et les poses sont écrits par `io.js`. La
base est vidée en **dérivant** la liste des magasins de `io.STORES`. **MIG-01** : une base de schéma 3 créée avant le chargement
de l'application monte en 4, les deux magasins naissent avec les trois index de `marquages`, un appel est relu champ pour champ.
**MIG-02** : la base montée en 4 refuse de s'ouvrir en 3 (`VersionError`, ce que ferait une v0.13.5) et rend ensuite les mêmes
poses ; devant une base plus récente qu'elle, l'application affiche un message en français. **MIG-03** : un cycle présent →
absent → oubli de tenue par taps (donc `definirStatut`, commentaire hérité relu) laisse les poses intactes. **MIG-04** :
aller-retour JSON sans perte, `schemaVersion` 4. **MIG-05** : une sauvegarde de schéma 3, importée par l'écran, vide les deux
magasins **et le dit** dans la confirmation. **MIG-06** : une sauvegarde de schéma 5 est refusée sans rien vider, la même en
schéma 4 passe. **MIG-07** : six altérations refusées une à une, base intacte, un message distinct par cas ; une pose sans
`courtSecours`, `genreSecours` ni `occurrences`, un marqueur sans `genre`, `couleur` ni `archivee`, et un champ inconnu sur l'un et
sur l'autre sont acceptés et relus tels quels. **MIG-09** (trois tests) : supprimer une séance, une séquence ou un élève emporte les
poses, la confirmation les compte (« 4 marqueurs posés ») et « Annuler » les restaure. **MIG-10** : `appliquerMarquages` rejette
quand la transaction avorte après le succès de la requête d'écriture. **Treize mutants** (M01, M02, M03, M05, M07, M08, M09, M10,
M32, M33, M34, M49, M50 ; 15 exécutions avec les variantes de M49 et M50) rendent ces tests rouges, chacun par son propre test.

**`marqueurs.spec.mjs` (5)** — marqueurs de séance, **v0.14.1 « le vocabulaire »** (contrat §6.5 et §11.2) : l'écran
`#/marqueurs`. Même `beforeEach` dérivé de `io.STORES`. **MQ-12** : un code court déjà pris sous une autre forme (« éq » contre
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

Total de la suite : **310 tests** (+ 87 rejoués sur le projet **mobile**, Pixel 7 émulé : `audit5-lot3.spec.mjs` sauf le test de position des toasts, propre au PC, `grilles.spec.mjs`, `grilles-robustesse.spec.mjs` et `audit-independant.spec.mjs`).

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
