# CHANGELOG — Carnet EPS

Historique des changements notables. Format : date — résumé. Le détail vit dans `docs/journal.md`.

> 🔖 Versions déployées (tags git), correspondance version → commit et **procédure de retour arrière** : `docs/deploiement.md`.

## 2026-09-09 — v0.12.14 : points retenus de l'avis du lot 5, démarrage hors ligne instantané (A39), tests sur profil tactile

- **Démarrage instantané, même sans réseau utilisable (A39).** L'ouverture de l'app attendait le réseau **sans délai maximal** avant de songer au cache : dans un gymnase mal couvert, l'écran pouvait rester blanc longtemps. La navigation est désormais servie **depuis le cache** quand elle y est, avec une **revalidation en arrière-plan** qui prépare le lancement suivant. Les mises à jour continuent d'arriver normalement (le navigateur récupère `service-worker.js` hors de ce mécanisme) : toast « Recharger » et bouton dans Réglages inchangés.
- **Barème d'une évaluation modifiable après création (C15)** : champ « Barème ( /x ) » sur les évaluations de type « barème ». Refusé hors 1..200, et refusé si une note déjà saisie dépasse le nouveau barème (« ✗ » + message, valeur restaurée) ; la grille est re-rendue avec les bonnes bornes. Le **type** d'évaluation reste figé (le changer changerait le sens des notes déjà saisies). Au passage, un re-rendu ne peut plus se dédoubler quand deux changements se suivent de près.
- **Dates : l'année réapparaît quand elle est utile (C45)** — `12/03` dans l'année scolaire courante, `12/03/2025` pour une date d'une autre année (historique, fiche d'inaptitude à cheval, document imprimé).
- **Import d'une sauvegarde : plafond de 200 Mo (A33)**, refusé **avant** toute lecture — un fichier énorme choisi par erreur gelait l'onglet le temps de le charger en mémoire.
- **Poids des pièces jointes affiché** sur l'écran Sauvegarde (« Pièces jointes : 12 (≈ 18,4 Mo) », D-08 (3)), lu par curseur sur la taille enregistrée, **sans charger un seul blob**.
- **Ménages** : le champ `seances.annulee`, écrit partout et lu nulle part, n'est plus créé (A34 ; les enregistrements existants gardent la clé, ignorée) ; le paramètre mort `seanceId` de la carte Observations est retiré (A31, le champ reste `null` dans le schéma) ; `octetsLisibles` est partagé au lieu d'être recopié.
- **Tests sur profil tactile (C60)** : les 25 tests d'écran sont rejoués sur un **Pixel 7 émulé** (user-agent mobile, contacts tactiles, `pointer: coarse`) en plus du profil PC — la cible n°1 est Android au pouce. L'aide clavier prouve maintenant la règle **dans les deux sens** : visible sur pointeur fin, masquée sur tactile.
- Vérifié : **165 tests** (dont 2 nouveaux avec le **service-worker réel** pour A39) + 25 rejoués sur le profil mobile ; chaque correctif de comportement rouge avant / vert après. Bump SW + `VERSION_APP` → 0.12.14.
- **Écartés de l'avis du lot 5**, avec leur raison : C44 (1) décodage d'image redimensionné (à mesurer sur un vrai Android d'abord — la proposition telle quelle agrandissait les portraits étroits) et C16 (2) confirmation avant la copie Pronote (elle ferait perdre l'activation utilisateur de Chrome et basculerait sur le repli textarea).

## 2026-09-09 — v0.12.13 : lot 2 du 5e audit — créations atomiques (V2-06, D-04, D-06) + intégration continue

- **Une création = une transaction.** Créer une inaptitude avec sa pièce écrivait le fichier, puis le certificat, puis l'inaptitude en **trois** transactions : une coupure (mémoire pleine, onglet fermé) laissait un fichier et un certificat **sans inaptitude**, invisibles dans l'app mais présents dans l'export. Les cinq gestes concernés écrivent désormais d'un seul bloc : nouvelle inaptitude avec pièce, **remplacement** de la pièce d'une inaptitude, nouveau document avec pièce, ajout ou changement de photo d'élève, retrait de photo (V2-06, D-04).
- **Le remplacement d'une pièce ne détruit plus avant d'écrire.** L'ancienne pièce était supprimée **avant** que la nouvelle référence soit enregistrée : une coupure entre les deux perdait le certificat. Ancienne et nouvelle pièce sont maintenant échangées dans la même transaction — en cas de refus, l'ancienne est toujours là et toujours référencée.
- **Import Pronote en une seule transaction** (D-06) : une classe créée et un élève écrit coûtaient chacun leur transaction (33 pour 30 élèves, 150+ sur un import réel). Un import interrompu laissait une classe à moitié remplie sans le dire. C'est désormais tout ou rien, et nettement plus rapide. Le compte rendu (importés, réactivés, doublons, lignes incomplètes, dates non reconnues, homonymes d'une autre classe) est inchangé.
- **Socle** : `preparerFichier` (media.js) construit l'enregistrement d'une pièce — compression JPEG et plafond 8 Mo compris — **sans l'écrire** ; `enregistrerLot` (io.js) écrit un lot mixte (`put` et `delete`, plusieurs stores) en une transaction. `stockerFichier` reste disponible pour une pièce seule.
- **Intégration continue** (C64) : la suite Playwright tourne à chaque `push` et à chaque pull request sur GitHub Actions (`.github/workflows/tests.yml`), gratuitement — dépôt public, minutes illimitées. Rapport HTML et traces téléchargeables quand un test est rouge. L'app ne gagne aucune dépendance : `app/` et la branche `gh-pages` sont inchangés.
- Vérifié : **5 tests** (`tests/e2e/audit5-lot2.spec.mjs`), chacun **rouge avant / vert après**, qui refusent une écriture sur un store et vérifient qu'il ne reste ni blob orphelin ni objet à moitié écrit ; suite complète **158/158**. Bump SW + `VERSION_APP` → 0.12.13.

## 2026-09-08 — v0.12.12 : lot 5 du 5e audit — tests, qualité, documentation (63 constats traités, 5 renvoyés en avis)

- **Données** (`io.js`) : pièces jointes converties **une à la fois** à l'export et à l'import (N lectures et N `fetch` en vol pour N pièces, D-08) ; date de sauvegarde et nom de fichier en **heure locale** (à 00 h 30, la sauvegarde était datée de la veille, D-09) ; un index ajouté à `SCHEMA` sur un store existant naît aussi sur les bases déjà ouvertes (D-11) ; CSV : **UTF-16 avec BOM** décodé, UTF-8 **strict** (un « � » légitime basculait tout le fichier en Windows-1252), caractères de contrôle retirés des champs (C03, B37), champ entre guillemets sur plusieurs lignes **refusé avec message** au lieu de scinder un élève en deux (C04) ; aperçus de suppression par `count()` sans charger les enregistrements (C37) ; un seul dictionnaire de libellés, pluriels corrects (« 2 pièces jointes », C38) ; commentaires de migration et de contrats alignés (C05, C39).
- **Import Pronote** : mapper à la main la colonne Classe active le mode « Utiliser la colonne », l'ignorer le désactive (C12) ; une colonne présente dans les données mais absente de l'en-tête est proposée au mapping et à l'aperçu (C13) ; un homonyme déjà présent dans une **autre** classe est signalé (« changement de classe ? à vérifier », C14) ; dates de naissance : séparateurs `.` et `-` acceptés, **date impossible refusée** (31/02 était stockée puis affichée vide) et comptée dans le résumé (B46, C51).
- **Appel, notes, écrans** : « Terminer l'appel » écrit tous les restants en **une transaction**, bouton verrouillé pendant l'écriture (A27) ; un appel de statut inconnu (sauvegarde tierce) n'est plus perdu par le récapitulatif ni par la fiche élève (A28) ; le sélecteur d'appel prévient comme l'accueil quand deux séquences sont actives (A29) ; le garde-fou Pronote compte les **lignes vides** (C16) ; **établissement et date d'édition** sur le récapitulatif d'appel et le relevé de notes imprimés (B44) ; pastille 🩺 d'inaptitude aussi dans la liste de classe et la grille de notes, comme la spécification l'annonçait (C53) ; palette des statuts en CSS seulement (C48) ; documents et pièces datés en heure locale (C49) ; une fin de T1 en août déjà en base (sauvegarde ancienne) est ignorée et signalée comme à la saisie (D-10).
- **Qualité et sécurité** : ligne d'alerte, liste des routes, état de route mort, paramètre mort de la visionneuse, `innerHTML = ''`, classe CSS `.table-recap` inerte — dédoublonnés ou retirés (C41, C42, C54, C43, C50, C36, A30) ; retour « Compression de la photo… » pendant l'attente (C44) ; les champs nom de classe, nom, prénom, APSA et titre d'évaluation vidés affichent **✗** et un toast au lieu d'un ✓ sans écriture (A36) ; un refus d'écriture pour **mémoire pleine** dit quoi faire (B41) ; l'espace utilisé de Réglages est annoncé comme celui de tout le site (A32) ; l'écran Aide explique l'installation et le transfert au lieu de renvoyer à un guide absent du site (B38) ; l'app **refuse de s'afficher dans un cadre** (`frame-ancestors` est ignorée en `<meta>`, A21) ; CSP sans `'unsafe-inline'` (A22).
- **Tests** : version de Playwright épinglée, `npm ci` (C20) ; le serveur de dev signe le dossier servi et le smoke-test le vérifie (une autre copie du dépôt sur le port 8160 fait échouer la suite, C21) ; trace conservée sur échec + rapport HTML (C22) ; specs temporaires `_*.spec.mjs` ignorées par Playwright et par Git (C23) ; sondes de synchronisation sous le timeout du test et contrôle de version du service-worker inconditionnel (C62) ; nettoyages en `finally` (C63) ; **preuves renforcées** : horloge fixée au 5 janvier 2027 (C26), coefficient 0 créé par l'interface (C27), appui long qui ouvre le menu (C28), thème « Sombre » choisi (C29), EDT / Documents / import complet de Sauvegarde / utilitaires CSV (C31), colonne Pronote copiée et CSV lus (C32), erreurs console écoutées dès le chargement (C34), blob réimporté intact (C35), aucune requête hors de l'origine sur les 13 routes + CSP (C33), comptage impossible signalé (B51). Suite : **152 tests** (34 dans `audit5-lot5.spec.mjs`).
- **Documentation** : règle de suppression de classe, restrictions, champs EDT, préférences, identifiants composites des appels et des notes, doublons d'import, promesses non tenues de `fonctionnalites.md` et du README (périodes, zoom, colonnes-critères, répartition, purge par année) marquées « non implémenté en v1 », hôte des tests du service-worker, compte des tests (C18, C24, C25, C57, C58, C59, C61). **CLAUDE.md** édité sur deux lignes (installation de Playwright depuis le terminal de l'utilisateur ; identifiants composites).
- **Non appliqués, à trancher** — `docs/avis/AVIS_LOT5_RESTES.md` : C15 (barème modifiable), A34 (champ `annulee`), C45 (dates avec année), A31 (observations sur l'écran d'appel), A33 (plafond d'import), C60 (projet mobile Playwright), et trois prolongements écartés du geste minimal (D-08 taille des pièces, C44 décodage redimensionné, C16 confirmation avant copie). Déjà couverts par les lots précédents, sans geste : A26, C19, C52, C56 (C30, la migration v1 → v2, a son test dans ce lot, avec D-11).
- **Revue adversariale du diff** (4 lentilles Opus + 2 réfutateurs par constat, deux passes) : corrigés dans la version — un CSV **UTF-16 sans BOM** produisait une ligne fantôme « \0 » entre chaque élève (comptée « incomplète »), un tap pendant l'écriture de « Terminer l'appel » était réécrasé à l'écran par l'instantané du lot, une analyse d'import refusée laissait le mapping et le bouton du collage **précédent** cliquables, le titre d'une évaluation vidé gardait son ✓, `dateExport` lisait l'horloge deux fois, l'en-tête X-Racine du serveur de dev diffusait le chemin local sur le réseau (→ empreinte SHA-256), doc D-11 (la montée de `DB_VERSION` est nécessaire) ; preuves renforcées (A22 sous écoute dès le chargement, C42 garde de source + titre par route, C32a fins de ligne CRLF exactes, C50 tous les fichiers lus sur le disque, C37 aperçu = 0 chargement, C38 complétude des libellés, comptes des tests dérivés des six specs) ; docs de pilotage recalées (TODO, roadmap, CLAUDE.md, avis C60, README des tests), `package-lock.json` régénéré.
- Vérifié : chaque correctif de comportement a son test **rouge avant / vert après** (les gestes de commentaire, de configuration et de documentation sont couverts par relecture ou par les gardes de cohérence) ; suite complète 152/152. Bump SW + `VERSION_APP` → 0.12.12.

## 2026-09-08 — v0.12.11 : lot 4 du 5e audit — service-worker et performance (17 constats) + deux avis en attente

- **Service-worker** (`app/service-worker.js` réécrit, même stratégie) : précache lu hors du cache HTTP (`cache: 'reload'` — une nouvelle version pouvait être remplie avec les fichiers de l'ancienne, A17) ; lectures de cache **scopées** à `carnet-eps-<version>` (un fichier homonyme d'une autre app de l'origine pouvait être servi, A18) ; seules les réponses de notre serveur, non redirigées, sont mises en cache (une page de blocage de proxy devenait le filet hors ligne, A19) ; écritures de cache tenues par `waitUntil` et tracées (A41) ; hors ligne, plus jamais `undefined` : le manifest ne reçoit plus du HTML, une navigation inconnue reçoit `index.html`, un fichier absent une 504 claire (A40) ; échec de précache tracé et, dans Réglages, l'état réel de l'installation (`statechange` : « échouée — réessayez » / « installée » avec un bouton **« Recharger maintenant »** — le toast de main.js peut être avalé quand la page n'était pas contrôlée, A20). **A39** (index.html cache-first) = changement de stratégie, **non traité**, avis à demander si souhaité.
- **Performance** (C02) : le sélecteur d'appel, l'écran d'appel et le récapitulatif lisent les appels **par index** (séances affichées, élèves de la classe) au lieu de tout le store (≈ 10 000 en juin), et l'accueil / le Suivi ne lisent que l'année scolaire — toutes ces lectures groupées en **une transaction** (`parIndexLot`, io.js : la revue a mesuré qu'une transaction par séance coûtait 2× plus cher qu'une lecture complète) ; le récap groupe par élève une fois ; `compterTout()` compte par `count()` sans charger les blobs (A23).
- **Pièces jointes** : plafond de **8 Mo** sur une pièce (un PDF de 40 Mo rendait l'export, donc la purge et l'import, impossibles — C08/B39) ; ouverture d'un PDF sans recopie du blob, onglet `noopener`, URL valable 60 s et non 1 s (« pièce perdue » sur téléphone lent — C07/B14).
- **PWA** : `id` dans le manifest (A37), couleur de barre système par thème (A38), `estLocalhost()` vrai aussi hors contexte sécurisé (Réglages disait « installé » sur http://192.168.x.x — A35), `app/.nojekyll` et note interne des modules sortie du site déployé (A42).
- **Avis rédigés, en attente de ta décision** : `docs/avis/AVIS_CREATIONS_ATOMIQUES.md` (lot 2 : inaptitude, document, photo, remplacement de pièce, import CSV en une transaction) et `docs/avis/AVIS_ORIGINE_DEDIEE.md` (A01 : IndexedDB lisible par les autres PWA de `alemoine4.github.io` — recommandation : organisation GitHub dédiée, gratuite ; ou documenter la limite).
- **Revue adversariale du diff** (deux passes, lentilles Opus + 2 réfutateurs par constat, 57 agents, 24 constats) : confirmés et corrigés dans la même version — lecture de l'accueil séance par séance **2× plus lente** qu'une lecture complète (→ `parIndexLot`), visionneuse d'un document sans pièce (TypeError → message), couleur de barre système suivant le thème **effectif** (réglage « Sombre » sur un appareil clair), message « 8,2 Mo — limite 8 Mo » (l'arrondi affichait « 8 Mo — limite 8 Mo »), exemple CSV hors ligne (504 non rejetée), bouton local « Recharger maintenant » ; tests renforcés là où la preuve ne discriminait pas (cache voisin sur un chemin **absent** du précache, `estLocalhost` sur un hôte hors liste, manifest **retiré** du cache avant le hors ligne, volume d'appels lu et transactions comptés sur 5 040 enregistrements, redirection réelle du serveur de dev jamais mise en cache). Douze constats réfutés (garde par type MIME au précache, saut silencieux des tests, `window.open` bout en bout, libellé « localhost » de Réglages…) non appliqués.
- Vérifié : **11 tests** (`tests/e2e/audit5-lot4.spec.mjs`, dont quatre avec le service-worker réel : couverture du précache par ce que le chargement demande (A43), fichier pirate d'un cache voisin non servi, hors ligne réel avec `setOffline`, redirection non mise en cache) + suite existante (101) = **112/112**. Bump SW + `VERSION_APP` → 0.12.11.

## 2026-09-07 — v0.12.10 : lot 3 du 5e audit — accessibilité et mobile (35 constats)

Suite « au mieux » du plan du 5e audit ; le lot 2 (créations atomiques) et A01 (origine dédiée) attendent leurs avis.
- **Clavier et lecteur d'écran** : anneau de focus enfin visible sur la grille d'appel (B01), « Ajouter une photo » et « Remplacer la pièce » deviennent de vrais boutons (B03), lien d'évitement « Aller à la navigation » (B36), le changement de vue ramène en haut de page (B26) et un re-rendu en place (select, date) restitue le focus (B20), un élément focalisé n'est plus caché sous l'en-tête collant (B05) ; statut courant du menu d'appel exposé par `aria-pressed` (B17), formulaires dépliants avec `aria-expanded` (B19), 19 lignes d'état annoncées (`role=status`, B29), note refusée expliquée et annoncée (`aria-invalid` + `role=alert`, B22), statut appliqué annoncé à l'appel au lieu des trois compteurs (B40), pictogrammes 🩺 ⚠ ℹ ● doublés d'un texte (B43), groupes de cases nommés par `fieldset`/`legend` et labels reliés (B47, B21), nom accessible des notes dans l'ordre visible (B48), bouton « Demander la protection » qui ne disparaît plus sous le focus (B50).
- **Tableaux** : les 4 synthèses (récap d'appel, relevé de notes, trimestres de la fiche, aperçu d'import) redeviennent de vrais tableaux — `display: table`, `scope`, nom de l'élève en en-tête de ligne, légende, région défilable nommée (B07 ⚙, tenu dans le lot : un helper, aucun fichier nouveau).
- **Notifications** : région live permanente dans la page (B27), le « Annuler » d'une suppression reçoit le focus, dure 20 s et son minuteur se suspend au survol ou au focus (B28), pile de toasts recalée sur PC (B34).
- **Mobile** : 2 colonnes d'appel dès 320 px (B33), plus de défilement en travers sur Documents et le récap (B09), créneau EDT qui se replie (B32), marges de sécurité latérales pour l'encoche (B12), taille de police du navigateur respectée (B30), aide clavier visible dès qu'un pointeur fin existe (B31), `interactive-widget=resizes-content` pour le clavier virtuel Android (B31 du 4e audit, à confirmer sur l'appareil), défilement vers le formulaire EDT sans animation si l'utilisateur l'a demandé (B45).
- **Contraste** : contour des champs et boutons secondaires à ≥ 3:1 dans les deux thèmes (token `--c-bord-controle`, B06) ; menu de statuts et chips de la fiche via les tokens `--stb-*` déclinés par thème (B18).
- **Impression** : colonnes complètes (B08), fonds des pastilles imprimés (B10), plus de décalage de 208 px en paysage (B11), toasts et ✕ des observations masqués (B35) ; et la barre de navigation, réaffichée à l'impression sur PC par l'ordre des feuilles de style, est masquée en `!important` (défaut trouvé par le test du lot).
- **Style** : zone de secours de l'export Pronote stylée comme les autres champs (B49).
- **Revue adversariale du diff avant livraison** (4 lentilles Opus : accessibilité, rendu, régressions, qualité des preuves ; 2 réfutateurs par constat, 48 agents) : 12 défauts confirmés et corrigés dans la même version — le lien d'évitement passait par le routeur de hash (retour à l'accueil, focus jamais posé sur la nav) et n'était jamais atteint en tabulation avant (la vue prenait le focus dès le chargement) ; `hidden` sans effet sur tout `.btn` et `.champ` (« Terminer l'appel » restait après « Appel complet ✓ », minutes de retard et restrictions toujours visibles) → règle globale `[hidden] { display: none !important }` ; à 320 px un nom long passait sous le bouton « ⋯ » (le tap basculait le statut) ; légende du récap en `<caption>` coupée dans le conteneur défilant → légende courte + `<p>` relié par `aria-describedby` ; barre de navigation hors écran à 200 % de police ; texte « seuil atteint » posé hors de sa cellule ; toast dont le focus programmatique annulait son propre minuteur, et dont le bouton se supprimait sous le focus (retour au `<body>`) ; motif de note refusée rendu en bas de carte hors écran, et effacé par la saisie suivante ; « Appel complet ✓ » réannoncé à chaque tap. Quatre tests qui passaient aussi sans correctif durcis (retour en haut, aide clavier, marges de sécurité, protection du stockage).
- Vérifié : **25 tests** (`tests/e2e/audit5-lot3.spec.mjs` : focus, contraste mesuré, sémantique des tableaux, 320 px, impression émulée, région live, police à 200 %) + suite existante (76) = **101/101**. Bump SW + `VERSION_APP` → 0.12.10.

## 2026-09-07 — v0.12.9 : lot 1 du 5e audit — exactitude de l'appel et des données (44 constats)

GO discrétionnaire (« fait au mieux ») sur le plan du rapport `docs/audit-2026-09-07.md` ; discipline : reproduction → test qui échoue → correctif minimal → suite complète → revue adversariale du diff → déploiement.
- **Appel** : « Terminer l'appel » sur une séance passée ne marque plus « présent » un élève sous inaptitude totale (B02) ; le pré-remplissage distingue **inaptitude totale sur certificat → inapte**, **totale sur mot des parents → dispensé (mot)**, **partielle → présent** avec pastille 🩺 (C01, décision D013) ; pré-remplissage en une transaction qui n'empêche plus l'écran de s'afficher (C11) ; un tap plus récent n'est jamais écrasé par le retour arrière d'un tap échoué (C10) ; minutes de retard bornées 1..120 (B42) ; sélecteur et accueil ne comptent que les élèves actifs (« Appel fait ✓ » juste — B16, A12, B15) ; récap par défaut sur l'année scolaire, élèves partis conservés s'ils ont des appels dans la période (A13).
- **Seuil ⚠ et alertes** : partout sur le cumul de l'**année scolaire** (pastille, fiche, Suivi, accueil — A14, V2-01), élèves partis exclus des alertes (A07), évaluations « pas remontées » bornées à l'année et aux classes actives (C09), inaptitude sans date de fin > 3 mois signalée (A09), classes archivées hors de la journée (A08), alternance A/B non paramétrée annoncée (A10). Année scolaire des bornes du **1er août** au 31 juillet (A06).
- **Validations** : fin avant début refusée à l'édition des séquences et inaptitudes (A16), bornes de trimestres vérifiées (ordre, année) avec valeur ignorée signalée (V2-02, D-10), barème 1..200 et coefficient ≥ 0 (V2-03), séances prévues ≥ 1, créneau EDT d'une classe archivée conservé (A02), classe manquante refusée.
- **Erreurs visibles** : « Annuler » d'un toast qui échoue le dit (D-01), champs à sauvegarde automatique marquent « ✗ » + motif (V2-04), filet global `unhandledrejection` → toast (C06, D-05), grille de notes marque la case invalide (D-05), boutons de création désarmés pendant l'écriture (D-02 : classe, élève, séquence, séance, évaluation, observation, créneau), réarmés + message en cas d'échec (A11), « Annuler » revérifie l'unicité (séance à la même date, classe et élève homonymes — D-03), « Copier pour Pronote » refusé sur grille vide (B24).
- **Données** : import — champs texte indispensables vérifiés (V2-05) et champs inconnus d'`eleves` écartés (INE, adresse… — A24), avertissement quand la sauvegarde ne contient aucune pièce jointe (D-14) ; `ouvrirDB` ne met plus en cache une ouverture refusée (A04) ; erreur de requête remontée avec son message (D-07) ; pièce sans type MIME tolérée (`mimeSur`, A05) ; purge : export de sécurité dans le `try`, prefs « Reprendre » effacées, thème conservé (B25, A25) ; messages d'import/purge renvoient aux téléchargements au lieu d'affirmer la sauvegarde faite (C17) ; suppression d'une classe refusée tant qu'un document la référence (D-12) ; import CSV : élève « parti » réactivé (D-13), classe archivée refusée avant écriture (D-15) ; nouvelle inaptitude depuis la fiche d'un élève parti reste sur cet élève (B04) ; `.gitignore` exclut les exports JSON/CSV (A03).
- **Revue adversariale du diff avant livraison** (5 lentilles Opus : régressions, intégrité des données, règles métier, robustesse, qualité des preuves ; 2 réfutateurs par constat, 59 agents) : 19 constats confirmés et corrigés dans la même version — retour arrière de l'appel vers le dernier état **confirmé en base** (deux écritures refusées de suite laissaient un statut fantôme et « Appel complet ✓ »), « ✗ » d'un champ qui n'est plus effacé par la minuterie du « ✓ » précédent et valeur refusée retirée des champs date/nombre/liste, notes « valeur ignorée » des trimestres recalculées après chaque saisie et ordre vérifié contre la borne voisine enregistrée (avec l'issue), plancher au 1er septembre pour une fin de trimestre, chips de la fiche élève bornées à l'année, ratio « n/effectif » des notes par classe (élève passé dans une autre classe), départage déterministe entre deux inaptitudes (certificat > infirmerie > mot), minutes de retard hors bornes signalées et retirées, moyenne de classe sur l'effectif réel et mention « (parti) » dans les CSV, `lireLot` aligné sur D-07, alertes d'inaptitude muettes pour une classe archivée, URL blob révoquée sur la fiche d'inaptitude (PDF, image illisible), comptage de la carte Sauvegarde avec message d'échec et réutilisé par l'import, alertes triées par gravité avant les 8 lignes de l'accueil (des rappels ℹ permanents évinçaient un ⚠), classe archivée exclue aussi du seuil d'oublis, colonne ⚠ du récapitulatif étiquetée « sur la période affichée » (écran, légende, CSV) ; un constat (le pré-remplissage « dispensé (mot) » alimente le seuil D012) tranché comme **voulu** (D013). Un test de la revue qui ne prouvait rien (échecs séquentiels) réécrit avec deux transactions concurrentes.
- Vérifié : **43 tests de non-régression** (`tests/e2e/audit5-lot1.spec.mjs`, reproductions de l'audit inversées) + suite existante (33) = **76/76**. Bump SW + `VERSION_APP` → 0.12.9.

## 2026-09-07 — 5e audit (documentation uniquement, aucun code touché)

Rapport `docs/audit-2026-09-07.md` (+ `docs/audit-2026-09-07.json`) sur v0.12.8 : **179 constats** (0 P0, 9 P1, 86 P2, 84 P3) issus de l'audit Codex V2 (6 défauts reproduits, rejoués ici) et de 13 lentilles d'audit par agents indépendants (Opus) en 3 lots. Les 9 P1 sont reproduits ou démontrés (dont : « Terminer l'appel » sur une séance passée écrase les inaptes en « présent », pré-remplissage « inapte » pour une inaptitude partielle ou un mot des parents, créneau d'une classe archivée réenregistré avec une classe vide, « Annuler » muet en cas d'échec, anneau de focus rogné sur la grille d'appel, origine GitHub Pages partagée). Plan de correction en 5 lots, **en attente de validation** ; aucune correction appliquée.

## 2026-09-06 — v0.12.8 : durabilité des écritures, purge et export cohérents, caches d'origine (hypothèses Codex H01–H05)

Cinq hypothèses issues d'une stratégie d'audit tierce (`audit codex/STRATEGIE_AUDIT.md`, document hors dépôt — reprises dans `docs/avis/AVIS_DURABILITE_ECRITURES.md`), vérifiées et démontrées, corrigées d'après l'avis `docs/avis/AVIS_DURABILITE_ECRITURES.md`.
- **Écritures durables (H03)** : `enregistrer` / `supprimer` / `vider` ne résolvent qu'à la validation de la transaction — un quota plein ou une erreur disque au moment de valider devient une erreur visible au lieu d'un « ✓ » sans rien d'écrit (cas réel : Android presque plein avec des photos).
- **Voisinage sur GitHub Pages (H05)** : le service-worker ne supprime plus que ses propres caches `carnet-eps-*` — il effaçait à chaque mise à jour le cache hors ligne du **Bar Clandestin**, hébergé sur la même origine.
- **Purge tout-ou-rien (H01)** : « Effacer toutes les données » tient en une seule transaction (`viderTout`), bouton désactivé pendant l'opération, erreur affichée le cas échéant.
- **Export instantané (H02)** : sauvegarde et comptage lisent les 14 stores dans une seule transaction — plus de sauvegarde avec orphelins si une écriture survient pendant l'export.
- **Import plus strict (H04)** : identifiants en double refusés avant toute écriture ; la confirmation annonce les stores absents du fichier (« ne contient pas : observations → seront vidées »).
- Vérifié : 5 tests (mutant d'abandon de transaction, purge en une transaction, écriture concurrente absente du dump, doublon refusé, **premier test réel du service-worker** via l'adresse de bouclage `app.localhost` (repli `[::1]` puis `127.0.0.2`)), suite existante inchangée. Bump SW + `VERSION_APP` → 0.12.8.

## 2026-09-06 — v0.12.7 : cascades et annulations atomiques (avis B29, deux phases)

Avis `docs/avis/AVIS_CASCADES_ATOMIQUES.md` validé et appliqué.
- **Une seule transaction IndexedDB** pour chaque suppression en cascade (élève, séquence, séance), chaque **annulation** (« Annuler » des toasts) et l'**import de sauvegarde** : tout ou rien, même si l'onglet est fermé ou l'app tuée en cours de route. Avant : une transaction par enregistrement (jusqu'à plusieurs centaines), donc une base « à mi-chemin » possible, surtout à l'annulation.
- `io.js` : helper interne `ecrireLot` (lectures avant, écritures émises d'un bloc), nouvel export `supprimerLot(objets)`, `restaurer` réécrit dessus ; les cascades collectent puis suppriment en un lot, signatures et retours inchangés.
- Modules : suppression d'une évaluation (+ notes), d'une inaptitude (+ certificat + pièce) et d'un document (+ pièce), et leurs annulations, passent par `supprimerLot` / `restaurer`.
- Vérifié : 3 tests d'atomicité (restauration et suppression annulées entièrement sur un enregistrement invalide ; import laissant tous les stores intacts sur une valeur non clonable), suite existante inchangée. Bump SW + `VERSION_APP` → 0.12.7.

## 2026-09-06 — v0.12.6 : vision par trimestre (décision D012, audit B30)

Le seuil d'alerte « 3 oublis de tenue / 3 dispenses » reste **cumulé sur l'année scolaire** ; le trimestre vient en complément.
- **Réglages → Trimestres** : fins du 1er et du 2e trimestre (vides = 15/12 et 15/03) ; l'année scolaire va de septembre à juillet.
- **Fiche élève** : tableau **T1 · T2 · T3 · Année** par statut d'appel (● = trimestre en cours) ; le signalement précise le trimestre en cours.
- **Récap de classe** : périodes rapides **T1 / T2 / T3 / Année** qui remplissent les dates (imprimable pour le conseil de classe).
- **Alertes** (accueil, Suivi) et pastille ⚠ de l'appel : le cumul annuel plus le détail du trimestre en cours.
- Technique : `metier.js` (`bornesTrimestres`, `periodeTrimestre`, `compterStatutsParTrimestre`, `anneeScolaireDe`, `decalerJours`), aucun nouveau store ni fichier. 4 tests de non-régression ajoutés (suite : 8 smoke + 17). Bump SW + `VERSION_APP` → 0.12.6.

## 2026-09-06 — v0.12.5 : dédoublonnage des helpers (audit B27, refactor sans changement fonctionnel)

Avis `docs/avis/AVIS_DEDOUBLONNAGE_HELPERS.md` validé et appliqué.
- `metier.js` exporte désormais `trierEleves`, `trierClasses`, `normaliser`, `cleTexte`, `baremeDe`, `formatFR`, `jours` ; `ui.js` exporte `champ(id, libelle, controle)` (ex-`champF`).
- Les 7 modules importent ces helpers au lieu de les recopier (7 copies de `trierClasses`, 5 de `champF`, 4 de `trierEleves`, 2 de `jours`/`normaliser`/`baremeDe`, 2 arrondis inline dans la fiche élève) : ≈ −35 lignes, aucun nouveau fichier (liste `ASSETS` du SW inchangée).
- Vérifié : `npm test` **21/21 sans toucher aux tests** (critère « zéro changement de comportement »), `grep` des anciennes copies = 0. Bump SW + `VERSION_APP` → 0.12.5.

## 2026-09-05 — v0.12.4 : 4e audit (34 constats) — 30 correctifs, 13 tests de non-régression

Audit à 12 lentilles du code complet (rapport `docs/audit-2026-09-05.md`), chaque constat vérifié par mesure avant correction.
- **Appel sur téléphone** : la grille passait à **une seule colonne sur les écrans de 360 px** (Samsung, largeur Android la plus courante) → 2 colonnes dès 360 px ; faire défiler la grille le doigt posé n'ouvre plus le menu de statut ; un double tap très rapide ne perd plus de statut ; un double clic sur « Créer la séance » ne crée plus deux séances ; les compteurs « saisis / Appel complet » ne comptent que les élèves actuels de la classe.
- **Données** : un fichier de sauvegarde altéré (enregistrement sans identifiant) pouvait **vider un store et laisser la base à moitié remplacée** → le fichier est refusé avant toute écriture, et une erreur synchrone annule désormais la transaction. Suppression d'une classe refusée tant que des séquences / créneaux EDT la référencent (plus d'orphelins « Classe ? »).
- **Élève « parti »** (déménagement, changement d'établissement) : nouveau réglage sur la fiche (« Dans la classe : Parti ») → masqué à l'appel, aux notes et aux effectifs, historique conservé ; badge « parti » dans la classe. Le champ `actif` du modèle n'avait jamais eu d'interface.
- **Accessibilité** : rouge d'alerte lisible en thème sombre (3,3:1 → 5:1), texte des badges gris 4,2 → 5,7:1 en clair, vignette du certificat ouvrable au clavier, pastille de statut « cachée » désormais réellement masquée (elle était rendue et lue par les lecteurs d'écran), contrôles natifs assortis au thème (`color-scheme`).
- **Robustesse** : une vue qui plante affiche « Affichage impossible » au lieu d'un écran blanc ; repli `crypto.randomUUID` hors HTTPS (test sur téléphone via IP locale) ; connexion IndexedDB libérée si un autre onglet migre le schéma ; préférences protégées si localStorage indisponible ; service-worker : les réponses 404/5xx ne sont plus mises en cache ; visionneuse servie avec le type déclaré (défense en profondeur) ; fuites d'URL d'objet colmatées.
- **Terrain** : `capture` retiré des champs fichier (la photo d'élève forçait la caméra **frontale**, le certificat rendait le PDF inaccessible sur Android) ; classes en barrette visibles sur l'accueil ; période imprimée sur le récap ; coefficient 0 honoré ; message « Vérifier les mises à jour » corrigé.
- **Documentation** : rollback (`deploiement.md` disait « aucune migration » alors que v0.12.0 a migré en DB_VERSION 2 : **pas de retour avant v0.12.0**), architecture (14 stores, onglets Suivi/Plus), modèle de données, CLAUDE.md (outils réels), pronote.md (UTF-8 BOM), guides et Aide in-app (EDT sous Plus, Inaptitudes sous Suivi), fiche terrain v0.12.4, README des tests.
- Reportés : dédoublonnage des helpers (B27, > 3 fichiers), cascades atomiques (B29), seuil ×3 par trimestre (B30, à trancher), clavier virtuel vs feuille (B31, à valider sur Android).
- Vérifié : suite Playwright **21/21** (8 smoke + 13 non-régression), captures clair 360 px / sombre 375 px. Bump SW + `VERSION_APP` → 0.12.4. **Déployée le 2026-09-06** (tag `v0.12.4`, gh-pages `0391552`).

## 2026-08-30 — Rangement du dépôt (documentation uniquement, aucun code touché)

- **Template générique sorti du projet** : `template/` (squelette réutilisable : BIBLE, CLAUDE.md, 5 commandes, 3 skills) était rangé à côté du dépôt sous « CARNET EPS », donc invisible depuis les autres projets → déplacé dans `30_APPLICATIONS/RESSOURCES_IA/template-projet` (14 fichiers, empreintes MD5 vérifiées identiques).
- **Deux documents rapatriés dans le dépôt** (ils vivaient hors git, donc non sauvegardés sur GitHub alors que le CHANGELOG et `docs/decisions.md` les citent) : `AUDIT_DEV_APP_2026-07-10.md` → `docs/audit-2026-07-10.md`, `AVIS_EXPERT_STRATEGIE.md` → `docs/strategie.md`. Chacun reçoit une note de datation en tête (les chemins qu'ils décrivent sont ceux de leur époque).
- **Racine dégagée** : les 5 `AVIS_*.md` rejoignent `docs/avis/` (`git mv`, historique conservé) — la racine ne garde que les 5 fichiers pilotes.
- **Chemins périmés corrigés** (19 occurrences) : `_TEMPO\DEV_APP` et `_TEMPO/.claude/launch.json` n'existaient plus ; le lancement documenté (`node server-carnet.mjs`) ne dépendait déjà d'aucun chemin absolu.
- **README** : le bloc « Structure du projet » décrit enfin `docs/` en entier (déploiement, guides, avis, audit, stratégie).
- Vérifié : `app/` **strictement intact** (0 fichier modifié) → gh-pages et l'app en ligne inchangées ; serveur local relancé et testé (index, JS, manifest, service-worker, garde anti-traversée `404`). Smoke-tests **non exécutables** : binaire navigateur Playwright absent (`npx playwright install` requis) — sans rapport avec ce rangement.

## 2026-07-12 — v0.12.3 : Finitions post-audit (revue « autre chose ? »)

- **Toasts** : l'éviction (pile pleine) épargne désormais les toasts **persistants** — le « Nouvelle version installée » survit à une rafale de suppressions.
- **Documents** : un lien saisi sans schéma (« www.site.fr ») est auto-préfixé en `https://` au lieu d'être rejeté.
- **README dépoussiéré** (vitrine GitHub) : URL de l'app en tête, tableau des modules complété (Suivi, observations), état v0.12.3 (il annonçait encore « v0.8.1, publication à venir »).
- **Roadmap** : Observations (v0.12.0) et audit 2026-07-10 cochés ; smoke-tests 7 → 8.
- **Smoke-tests** : date « aujourd'hui » calculée en heure **locale** comme l'app (un run entre minuit et 2 h n'échouera plus) ; store `observations` ajouté à la purge entre tests.
- Vérifié : 2 tests Playwright dédiés (toast persistant épargné, URL auto-préfixée) + smoke-tests **8/8**. Bump SW + `VERSION_APP` → 0.12.3 ; redéployé.

## 2026-07-10 — v0.12.2 : Arbitrage des 3 décisions produit de l'audit (A12/A13/A14 — décision D011)

- **Toasts empilés (A12)** : les toasts s'empilent (max 3) au lieu de se remplacer — deux suppressions rapprochées gardent chacune leur « Annuler » ; le toast « Nouvelle version installée » est persistant et ne peut plus être écrasé.
- **« Publiée » sur preuve (A13)** : le marquage « publiée le … » n'a lieu que sur copie réussie (presse-papiers, ou copie réelle depuis la zone de secours) ; l'export CSV ne marque plus ; **bouton manuel** « Marquer remontée / Annuler le marquage » → l'alerte « pas encore remontée » redevient fiable.
- **Consulter ≠ modifier (A14)** : le pré-remplissage « inapte » n'écrit en base que pour la séance du **jour** ; ouvrir un appel passé n'écrit plus rien (pastille 🩺 conservée).
- Vérifié : 3 tests Playwright dédiés (pile de toasts, séance passée/du jour, CSV/copie/toggle) + smoke-tests **8/8**. Bump SW + `VERSION_APP` → 0.12.2 ; redéployé. **L'audit du 2026-07-10 est entièrement soldé.**

## 2026-07-10 — v0.12.1 : Corrections de l'audit complet (A1→A11, A15, A16)

Audit 5 phases du 2026-07-10 (rapport `docs/audit-2026-07-10.md`) : **0 critique**, lot validé « GO » :
- **Sauvegarde** : le résumé (écran + confirmation d'import) inclut désormais les **observations** et accorde le singulier (A1/A2).
- **Photos/pièces** : une image illisible (HEIC, fichier corrompu) affiche un **message d'erreur clair** au lieu d'échouer en silence (fiche élève + remplacement de pièce) ; garde-fou `toBlob` null (A3).
- **Dates** : « aujourd'hui » calculé en **heure locale** (plus de bascule à la veille entre minuit et 1-2 h) (A4).
- **Robustesse** : routeur protégé contre les rendus concurrents (navigation très rapide) (A9) ; doublon bloqué au renommage de classe (A10).
- **Garde-fous EDT/accueil** : chevauchement de créneaux signalé (toast, non bloquant) (A11) ; ⚠ si 2 séquences actives se chevauchent pour la classe en cours (A15).
- **Divers** : liens de documents limités à http(s) (A7), `alert()` → toasts (A8), helpers dédupliqués (A5), `seances.numero` documenté comme indicatif (A6), TODO.md dépoussiéré (A16).
- Vérifié : preview réel correctif par correctif + **smoke-tests 8/8**. Bump SW + `VERSION_APP` → 0.12.1 ; redéployé.
- En attente d'arbitrage (audit A12/A13/A14) : toasts empilés, « publiée » après copie réussie seulement, pré-remplissage inapte limité au jour même.

## 2026-06-15 — v0.12.0 : Observations (notes terrain) — socle + 1er lot

Première brique « noter en 2 taps » (avis : `AVIS_OBSERVATIONS_MODELE.md`).
- **Nouvelle entité `observations`** (store IndexedDB, index `eleveId`) : type, ton (positif/neutre/vigilance), tags, texte, date, séance liée. **Migration `DB_VERSION 1 → 2` purement additive** (le `onupgradeneeded` crée le store manquant ; aucune donnée existante touchée — vérifié).
- **Fiche élève** : carte **« Observations »** = timeline (triée récente d'abord, badge de type coloré par ton) + bouton **« + Observation »** ouvrant une feuille (type, ton, **phrases rapides**, **étiquettes**, dictée via le micro natif du clavier). Suppression d'une observation avec **annulation** (toast).
- **Cohérence** : suppression d'élève en cascade inclut les observations (+ aperçu, détail, **undo**) ; export/import JSON les couvrent automatiquement (`schemaVersion` → 2).
- Vocabulaire (types, tons, tags, modèles de phrases) dans `metier.js` ; module `js/modules/observations.js` (ajouté au cache SW).
- Smoke-tests : +1 (ajouter une observation + cascade) → **8/8 verts**. Migration v1→v2 vérifiée en preview (14 stores, données préservées).
- Bump SW + `VERSION_APP` → 0.12.0 ; redéployé.

## 2026-06-15 — v0.11.0 : Onglet « Suivi » (navigation EPS)

Priorité roadmap n°3 — rendre le suivi EPS visible (avis : `AVIS_SUIVI_NAVIGATION.md`, option A).
- **Nouvel onglet « Suivi »** dans la barre, à la place d'**EDT** (déplacé dans le menu « Plus »). On reste à **6 onglets**.
- L'onglet Suivi regroupe les **alertes élèves** (inaptitudes expirant / réintégrations, seuils d'oublis de tenue et de dispenses, évaluations non remontées) + un accès direct **Inaptitudes & certificats**.
- **Refactor sans changement de comportement** : la logique d'alertes est extraite vers `metier.js` (`collecterAlertes()`), partagée par l'accueil et le Suivi (l'accueil affiche les 8 premières, le Suivi toutes).
- Les inaptitudes sont désormais frontées par « Suivi » (`PARENT.inaptitudes = 'suivi'`) ; sur `#/edt` c'est l'onglet « Plus » qui s'active.
- Smoke-tests : +1 (onglet Suivi + EDT dans Plus) → **7/7 verts**. Vue Suivi définie en inline dans `main.js` (pas de nouveau fichier → SW `ASSETS` inchangé).
- Bump SW + `VERSION_APP` → 0.11.0 ; redéployé. Vérifié preview (nav, accueil, Suivi, EDT via Plus, console propre).

## 2026-06-15 — Outils : smoke-tests Playwright (dev, l'app n'est pas modifiée)

- Ajout d'un harnais de tests **Playwright en dépendance de DEV** (validé explicitement ; gratuit Apache-2.0 ; jamais livré — `gh-pages` ne déploie que `app/`, `node_modules/` ignoré). L'application reste **sans dépendance runtime** (BIBLE règle 1).
- `package.json` (privé, `@playwright/test`), `playwright.config.mjs` (lance/réutilise `server-carnet.mjs`), `tests/e2e/smoke.spec.mjs` (**6 parcours critiques** : chargement+nav, créer classe+persistance, import CSV, appel, suppression+annulation, round-trip export/import) — **tous verts**.
- Lancement : `npm install` → `npx playwright install chromium` → `npm test`. Détails : `tests/e2e/README.md`.
- **Pas de changement de l'app** : ni `VERSION`, ni `VERSION_APP`, ni déploiement.

## 2026-06-13 — v0.10.1 : Annulation des suppressions (phase 2 — « Supprimé — Annuler »)

Filet de récupération après suppression (priorité n°1 de la roadmap).
- **Toast « … supprimé — Annuler » (8 s)** après chaque suppression : un clic **restaure tout**, cascade comprise (helper `toast()` dans ui.js).
- **io.js** : les cascades (`supprimerSeance/Sequence/EleveEnCascade`) renvoient désormais les **objets supprimés** (avec les blobs des pièces jointes) ; nouveau `restaurer(objets)` qui les ré-enregistre.
- Câblé sur les 8 suppressions : élève (cascade appels/inaptitudes/certificats/notes/photos), classe, séquence (cascade), séance, évaluation (+notes), inaptitude (+certificat/fichier), document (+fichier), créneau EDT.
- Vérifié en preview : suppression élève → toast → **Annuler restaure élève + appel + inaptitude + note** et revient sur la fiche ; console propre.
- Bump SW + `VERSION_APP` → 0.10.1 ; redéployé. *(Corbeille persistante = plus tard, nécessite un store dédié → migration.)*

## 2026-06-13 — v0.10.0 : Suppressions sécurisées (phase 1 — confirmation cohérente)

Première étape du chantier « sécurité des données » (AVIS_ANNULATION_SUPPRESSIONS.md).
- **Fin des `confirm()` natifs** : les 11 confirmations de suppression (élève, classe, séquence, séance, évaluation, inaptitude, document, créneau EDT, import, purge ×2) passent par un helper `confirmer()` en `<dialog>` natif : **focus initial sur « Annuler »** (anti-mauvais-tap), bouton d'action en rouge, Échap / clic sur le fond = Annuler, accessible (cohérent avec le menu d'appel).
- **Impact des cascades affiché** : ex. « Seront aussi supprimés : 1 appel, 1 inaptitude, 1 note. » (helpers `apercuSuppressionEleve`/`apercuSuppressionSequence`/`detailSuppression` dans io.js). Les doubles `confirm()` (élève, séquence) sont fusionnés en une seule boîte claire.
- Vérifié en preview : ouverture, focus Annuler, Annuler ne supprime pas, Supprimer supprime + cascade + redirection ; console propre.
- **À suivre (v0.10.1)** : filet « Supprimé — Annuler » (restauration 8 s). Corbeille persistante = plus tard (nouveau store → migration).
- Bump SW + `VERSION_APP` → 0.10.0 ; redéployé.

## 2026-06-13 — v0.9.9 : Alignement audit (finitions)

Comble les écarts restants du lot d'audit, sans toucher aux chantiers structurels :
- **Aide de l'appel scindée** : gestes tactiles visibles partout ; raccourcis clavier (P A R D I T, F) affichés **seulement sur appareil à pointeur fin** (`@media (pointer: fine)`).
- **Typo** : en-tête 1,2→1,3rem, corps des cartes 0,9→0,95rem (titres de carte conservés à 1,1rem — meilleur contraste que la grille proposée).
- **Nav** : libellés 0,66→0,68rem ; vérifié **sans débordement ni troncature à 320px et 360px** (6 onglets).
- **CSP complétée** : ajout de `font-src 'self'`, `worker-src 'self'`, `manifest-src 'self'`. `connect-src 'self' data:` **conservé** (sinon l'import de pièces jointes casse). `frame-ancestors` **non ajouté** (ignoré en balise `<meta>` — nécessiterait un en-tête HTTP, hors de portée GitHub Pages).
- Non retenu volontairement : confirmation bloquante sur « Terminer l'appel » (préserve le < 40 s ; le filet sera l'annulation, cf. AVIS). `role="status"` écarté sur les compteurs (verbosité lecteur d'écran).
- Bump SW + `VERSION_APP` → 0.9.9 ; redéployé. Vérifié clair/sombre, 320/360/desktop, console propre, 0 violation CSP.

## 2026-06-13 — v0.9.8 : Corrections d'audit (a11y, typo, sécurité)

Lot de corrections rapides issues de l'audit multi-perspectives :
- **A11y** : `aria-live="polite"` sur les compteurs d'appel (annoncés au lecteur d'écran) ; **nom de zone par écran** (`aria-label` sur `#vue` selon la route → la section est annoncée à la navigation) ; `scroll-margin-bottom` sur les éléments focusables (WCAG 2.2 — focus non masqué par la nav) ; bloc `@media (prefers-reduced-motion: reduce)`.
- **Typo** : hiérarchie renforcée (en-tête 1,2rem, titres de carte 1,1rem) ; libellés de nav 0,62→0,66rem.
- **Appel** : le bouton « Terminer » indique désormais **combien d'élèves passeront présents** (ex. « Terminer l'appel · 6 passés en présent ») — informatif, sans confirmation bloquante (le fast-path reste rapide).
- **Sécurité** : ajout d'une **CSP** (`script-src 'self'` bloque tout handler injecté ; `blob:`/`data:` autorisés pour photos et import). Vérifié : styles inline, visionneuse, export CSV, import — aucune violation.
- Bump SW + `VERSION_APP` → 0.9.8 ; redéployé.

## 2026-06-13 — v0.9.7 : Liseré bleu au chargement (focus)

- Correction : au premier chargement, un anneau de focus bleu (`:focus-visible`) s'affichait autour de la zone de contenu — `#vue` (tabindex=-1) reçoit le focus par programme à chaque vue (scroll en haut + annonce lecteur d'écran), et la règle globale `:focus-visible` annulait le `.vue { outline: none }` voulu. Ajout d'une règle plus spécifique `.vue:focus, .vue:focus-visible { outline: none }` → plus de liseré, tout en gardant l'anneau de focus sur les vrais boutons/liens/champs.
- Bump SW + `VERSION_APP` → 0.9.7 ; redéployé.

## 2026-06-13 — v0.9.6 : Largeur d'écran sur PC

- Sur grand écran, les vues à fort contenu **appel**, **récapitulatif** et **relevé** utilisent désormais toute la largeur disponible (classe `vue-large` ajoutée par ces vues ; `afficherVue` réinitialise la classe à chaque rendu). Les formulaires et le texte restent **plafonnés à 900 px** (lisibilité).
- **Grille d'appel en colonnes auto-remplies** (`repeat(auto-fill, minmax(160px, 1fr))`) : 2 colonnes sur mobile, et davantage dès qu'il y a de la place — ex. **7 colonnes** sur un écran 1600 px → 28 élèves en 4 rangées au lieu de 7 (moins de défilement). Les récap/relevés prennent toute la largeur (moins de défilement horizontal).
- Bump SW + `VERSION_APP` → 0.9.6 ; redéployé. Vérifié en preview (appel 1360 px/7 col, formulaire 900 px, console propre).

## 2026-06-13 — v0.9.5 : Libellé du bouton retour

- Le bouton retour des écrans ouverts depuis l'onglet « Plus » (Inaptitudes, Séquences, Documents, Sauvegarde, Réglages, Aide) passe de « ← Plus » à **« ← Retour »** : « Plus » (menu fourre-tout) se lisait mal comme destination de retour. Les retours qui nomment une vraie section (« ← Classes », « ← Appel », « ← Notes », « ← Inaptitudes »…) sont conservés.
- Bump SW + `VERSION_APP` → 0.9.5 ; redéployé.

## 2026-06-13 — v0.9.4 : Nettoyage écran « Plus »

- Retrait des badges « prêt » (vestiges de dev) sur les cartes de l'écran Plus : tous les modules étant livrés, ce marqueur n'avait plus de sens en production (et était incohérent avec la carte « Aide » sans badge). La ligne RGPD « 100 % local · hors ligne… » est conservée (intentionnelle).
- Bump SW + `VERSION_APP` → 0.9.4 ; redéployé.

## 2026-06-13 — v0.9.3 : Finitions de confort de l'appel

- **Pastille de statut thématisée** : la pastille (P/A/R/D/I/T/INF) utilise désormais la même couleur `--stb-*` que la bordure et un texte `--c-sur-accent` → en thème clair, couleur saturée + texte blanc ; en thème **sombre**, variante claire + texte encre, donc elle **ressort sur la carte** (le fond n'est plus posé en JS mais piloté par CSS via `[data-statut]`).
- **Raccourcis clavier (PC) sur l'appel** : une carte d'élève focalisée + une lettre fixe le statut directement — `P` présent, `A` absent, `R` retard, `D` dispensé, `I` inapte, `T` oubli de tenue, `F` infirmerie. Indiqué dans la ligne d'aide sous la grille.
- Bump SW + `VERSION_APP` → 0.9.3 ; redéployé sur GitHub Pages. Vérifié en preview (clair + sombre, clavier, console propre).

## 2026-06-13 — v0.9.2 : Campagne de tests + durcissement sécurité

- **Campagne de tests** (14 scénarios, harnais preview — Playwright MCP indisponible, profil verrouillé) : chargement sans erreur, navigation, création classe/élèves, persistance, appel 28 (compteurs + fast-path « Terminer »), 7 statuts, import Pronote, export CSV (contenu capturé), impression (déclenchement + `@media print`), 0 ressource externe, **XSS import CSV/JSON neutralisé**, a11y clavier du menu, responsive 360 px. **0 bug bloquant, 0 bug important fonctionnel.**
- **Sécurité — garde `data:` à l'import JSON** ([io.js](app/js/io.js)) : `importerJSON` ne reconstruit un blob que depuis une dataURL locale → un fichier de sauvegarde piégé (URL http dans `donnees`) **n'émet plus aucune requête réseau** (offline/RGPD garantis). Vérifié : URL piégée = 0 fetch, dataURL valide = blob reconstruit.
- **Sécurité — anti-injection de formule CSV** : helper `champCSV()` (RFC 4180 + préfixe `'` sur `= + - @`), appliqué aux exports téléchargés (récap absences, notes, relevé). Corrige aussi les champs non quotés (noms avec `;`/`"`). « Copier pour Pronote » (presse-papiers) inchangé.
- Détails : `AVIS_SECURITE_IMPORT_EXPORT.md`. Aucun changement de schéma ni d'UI.
- **Déploiement** : bump `VERSION` service-worker + `VERSION_APP` `0.9.0 → 0.9.2` (les installs existantes reçoivent le toast « Nouvelle version installée ») ; commit `871773f`, redéployé sur GitHub Pages (`gh-pages`).

## 2026-06-13 — v0.9.1 : Publication + audit UX (P1 accessibilité de l'appel)

- **Publié sur GitHub Pages** : dépôt public `alemoine4/carnet-eps`, branche `gh-pages` = contenu de `app/`, app en ligne sur `https://alemoine4.github.io/carnet-eps/` (URL reportée dans `docs/guide-installation.md`).
- **Audit UX** (skill impeccable, score Nielsen 31/40 « Bon », détecteur markup propre) : voir `AVIS_APPEL_ACCESSIBILITE.md`.
- **P1 — accessibilité de l'écran d'appel** : menu de statuts converti en `<dialog>` natif (helper `ouvrirFeuille` mutualisé dans `ui.js` — Échap, piège de focus, fond cliquable, focus rendu au déclencheur) ; carte élève refondue en groupe « grande zone (tap-cycle + appui long) + bouton ⋯ visible » → **les 7 statuts deviennent accessibles au clavier et au lecteur d'écran** (avant : 4 cachés derrière l'appui long). Tap-cycle et appui long conservés.
- **P2** : texte de statut en encre pleine (lisibilité) ; retour visuel (barre de progression) + vibration pendant l'appui long (avec `prefers-reduced-motion`) ; pastilles vert `#178a52→#0f7a46` et orange `#c97a06→#a35f00` conformes WCAG AA (+ variante verte sombre pour `.statut-ok`) ; **bordures de statut thématisées** (variables `--stb-*` : couleurs saturées en clair, variantes claires ≥4,9:1 en sombre — les 7 statuts lisibles sur les deux thèmes).
- **P3** : liseré gauche des cartes « Plus » (anti-pattern) remplacé par une bordure pleine + chevron « › » ; **écran « Aide » in-app** (route `#/aide`) — prise en main, rentrée en 6 étapes, réflexes de l'année, intégré et hors ligne.
- **Visionneuse** (`media.js`) passée en `<dialog>` natif (Échap, fond inerte, focus rendu) ; CSS mort `.feuille-fond` supprimé. **Audit UX entièrement traité.**
- Vérifié en preview (clavier, tactile, Retard, pré-remplissage inapte, page Plus + Aide, mobile 375 px sans débordement, console propre). 1 bug attrapé et corrigé en test (la fermeture par clic-fond se déclenchait sur activation clavier).

## 2026-06-12 — v0.9.0 : Phase 9 — Distribution (préparée)

- **Toast de mise à jour** : « Nouvelle version installée — Recharger » quand un nouveau service-worker prend le contrôle en cours d'usage (BIBLE règle 5) ; silencieux à la première installation.
- **`docs/guide-installation.md`** : installation PWA Android + PC, transfert PC ↔ Android par JSON, mises à jour, dépannage, localisation des données.
- **`docs/guide-rentree.md`** : procédure de rentrée en 6 étapes (~30 min) + réflexes de l'année (sauvegarde hebdo, certificats, export Pronote).
- **Dépôt git local initialisé** (commit `04a4d7c`, 55 fichiers). Publication GitHub Pages prête, en attente : (1) `gh auth login` par l'utilisateur, (2) son feu vert explicite.

## 2026-06-12 — v0.8.1 : Phase 8 — QA & durcissement

- **Durcissement** : `importerJSON` réécrit **par lots** (une transaction clear+puts par store) — restauration d'une année complète en ~2 s au lieu de ~1 min.
- **QA sur volumétrie réelle** (6 classes × 28 élèves × 1 an = 10 668 enregistrements + 12 photos) : tous les écrans rendus en 16-49 ms ; export 57 ms / 1,36 Mo ; round-trip sans aucune perte (blobs compris) ; imports corrompus rejetés proprement.
- **Lighthouse : Performance 97 · Accessibilité 100 · Best practices 100** ; audit structurel a11y sur 21 écrans : 0 problème.
- `tests/checklist.md` réécrite : résultats mesurés + cases « appareil réel » restantes (Android, Pronote réel, installation HTTPS, impression papier). README actualisé (état v0.8.1).

## 2026-06-12 — v0.8.0 : Phase 7 — Documents & tableau de bord

- **Accueil = vrai tableau de bord** (`modules/accueil.js`) : carte « En ce moment » (déplacée d'edt.js) + **carte Alertes** agrégées — inaptitudes finissant sous 7 j ⚠, élèves redevenant aptes ℹ, seuils 3 oublis de tenue / 3 dispenses ⚠, évaluations notées mais jamais remontées vers Pronote ℹ — chaque alerte cliquable vers l'écran concerné + carte « Reprendre » (dernière classe, dernière évaluation).
- **Plus → Documents** (`modules/documents.js`) : bibliothèque locale — photo/PDF (compressé via media.js) **ou** lien externe, 6 types, mots-clés, classes liées, recherche instantanée + filtres classe/type, ouverture en visionneuse / nouvel onglet, suppression avec cascade du fichier.
- Visionneuse plein écran mutualisée dans `media.js` (utilisée par inaptitudes et documents).
- L'écran d'accueil répond au critère de sortie : « qu'est-ce qui m'attend aujourd'hui ? » sans aucun clic.
- SW **0.8.0**. Vérifié en preview (3 alertes exactes, raccourcis, doc lien + doc image compressée 18 Ko, filtres, cascades), console vide.

## 2026-06-12 — v0.7.0 : Phase 6 — Évaluations & notes + export Pronote 🎒

**Jalon rentrée 2026 atteint : les phases 1→6 sont livrées** (restent les validations terrain : Pronote réel, Android réel, installation HTTPS).

- **Onglet Notes** réel : liste des évaluations (badge « publiée ✓ », compteur notes/effectif), création (note /20, barème personnalisé, ou AFL/positionnement texte — non exporté), coefficient.
- **Grille de saisie** : élèves dans l'ordre alphabétique (= ordre Pronote), saisie au clavier numérique (virgule acceptée), codes `ABS`/`DISP`/`NN` (raccourcis a/d/n), valeurs hors barème rejetées visuellement, Entrée = élève suivant, stats en direct (moyenne/min/max, saisies).
- **Export Pronote voie A** : « Copier pour Pronote » — colonne triée alpha avec **lignes vides pour les codes et non-notés** (alignement préservé), virgule décimale, récapitulatif « à saisir à la main » (ligne X — élève : ABS), **garde-fou** effectif + barème, repli textarea sélectionnée si le presse-papiers est indisponible (http réseau local). Voie B : CSV `Nom;Prénom;Note`. Les deux marquent « publiée le … ».
- **Relevé par classe** : tableau élèves × évaluations + moyenne /20 pondérée par coefficients (codes et AFL exclus), moyenne de classe, impression + export CSV.
- Fiche élève : section Notes réelle (dernières notes + moyenne générale /20).
- SW **0.7.0**. Vérifié en preview de bout en bout ; bug corrigé pendant la vérification (le récapitulatif écrasait la zone de copie manuelle en mode repli).

## 2026-06-12 — v0.6.0 : Phase 5 — Inaptitudes & certificats

- **Plus → Inaptitudes** (route `#/inaptitudes`) : synthèse (En cours, Terminées cette semaine « penser à réintégrer », À venir, Historique) avec alertes **« fin dans X j »** (seuil J-7) et **« > 3 mois · médecin scolaire »** ; formulaire complet (classe→élève en cascade, type totale/partielle, origine, dates, 6 restrictions, commentaire, **pièce jointe photo/PDF**) ; détail éditable ; suppression avec cascade certificat + fichier.
- **`js/media.js`** : compression photo canvas → JPEG (max 1600 px, ≤ ~300 Ko, qualité dégressive) ; stockage store `fichiers` ; PDF tels quels ; visionneuse plein écran (PDF → nouvel onglet).
- **Fiche élève** : photo de l'élève (ajout/changement/retrait, compressée) + section inaptitudes réelle (état, dates, 📎, lien détail, bouton « + Nouvelle inaptitude » pré-ciblée).
- L'appel signale déjà les inaptes (phase 4) — vérifié avec une inaptitude créée via l'UI.
- SW **0.6.0**. Scénario « Tom » du brief vérifié en preview de bout en bout (compression 114 Ko → 34 Ko, alertes, pré-remplissage, cascade propre), console vide.

## 2026-06-12 — v0.5.0 : Phase 4 — Appel & absences EPS ⭐

- **Onglet Appel** réel, en 3 vues :
  - *Sélecteur* : cours du jour d'après l'EDT (« Faire l'appel » / « Reprendre (n/eff) » / « Appel fait ✓ », ou création séance + appel en un tap), 10 dernières séances avec état de saisie, accès aux récapitulatifs par classe.
  - *Écran d'appel* : grille tactile (2/3/4 colonnes selon écran), **tap = présent → absent → oubli de tenue**, **appui long ou clic droit = menu complet** (7 statuts, minutes de retard, commentaire) ; **pré-remplissage automatique** des élèves à inaptitude active (🩺) ; compteurs en direct (présents / pratiquants / saisis) ; « Terminer l'appel » (le reste = présents) ; bilan de séance.
  - *Récapitulatif classe* : tableau P/A/R/D/I/T/INF filtrable par dates, colonne ⚠ (seuil 3 tenue/dispenses), **impression** (`@media print`) et **export CSV** (BOM pour Excel).
- Fiche élève : historique d'appel réel (chips par statut, signalement ⚠, 8 dernières séances).
- `metier.js` nouveau (vocabulaire partagé : STATUTS, cycle de tap, seuil d'alerte, parité A/B, cours du jour, inaptitudes actives) — les modules ne s'importent toujours pas entre eux.
- Accueil : « Faire l'appel » direct sur la séance du jour ; créer la séance ouvre l'appel.
- SW **0.5.0**. Vérifié en preview : pré-remplissage inapte, cycle de statuts avec compteurs exacts, retard 10 min via menu, appel complet 10/10, bilan persisté, alertes ⚠, récap (P=1/I=1/T=3+⚠), console propre.

## 2026-06-11 — v0.4.0 : Phase 3 — EDT, séquences & séances

- **Onglet EDT** réel : créneaux hebdomadaires (jour, heures, classe, semaine A/B, installation avec suggestions), formulaire ajout/édition/suppression (heures validées), liste par jour avec badge « aujourd'hui », grille en colonnes sur PC.
- **Alternance A/B** : un « lundi de semaine A » de référence (saisi dans l'EDT, stocké en meta) ; parité calendaire — limite v1 assumée : les vacances ne décalent pas l'alternance.
- **« En ce moment » sur l'accueil** : croise EDT × heure × parité × séquences actives ; affiche classe, créneau, installation, APSA et n° de séance ; **crée la séance du jour en un tap** (liée au créneau) ; liste les cours suivants de la journée ; guide vers EDT/Séquences si vide.
- **Séquences & séances** (« Plus → Séquences », route `#/sequences[/<id>]`) : création (APSA avec datalist, CA1-4, dates, nb prévu), édition complète, séances numérotées par ordre de date (doublon de date refusé), suppression en cascade (séances → appels ; séquence → séances + évaluations + notes).
- `io.js` : `supprimerSeanceEnCascade`, `supprimerSequenceEnCascade`. SW **0.4.0**. Accueil épuré (la carte « base de données » de la phase 0 est retirée).
- Vérifié en preview : scénario complet « créneau couvrant maintenant + séquence Badminton » → carte « En ce moment » exacte (semaine A, 6A, 1/10), séance créée, parité A/B/A, créneau « semaine B » exclu en semaine A, formulaires validés, cascades propres, console vide.

## 2026-06-11 — v0.3.0 : Phase 2 — Classes & élèves + import Pronote

- **Onglet Élèves** réel (remplace le bouchon) : liste des classes (effectifs, couleurs, archivage/restauration), vue classe (édition nom/niveau/couleur, ajout rapide d'élève, recherche instantanée, tri alphabétique fr), fiche élève complète (sexe, naissance, changement de classe, zone « À savoir » PAI/asthme) avec suppression **en cascade** (appels, inaptitudes, certificats + pièces, notes).
- **Import Pronote** (`#/eleves/import`) : collage direct ou fichier CSV ; détection automatique du séparateur (`;`/tab/`,`), de l'encodage (UTF-8 → repli Windows-1252) et des colonnes (mapping manuel possible) ; destination par colonne Classe (auto-création), classe existante ou nouvelle ; doublons ignorés et comptés ; dates JJ/MM/AAAA → ISO ; aperçu avant import.
- Router à sous-routes (`#/eleves/classe/<id>`, `#/eleves/fiche/<id>`, `#/eleves/import`) ; helpers de formulaire mutualisés dans `ui.js` ; utilitaires CSV + cascade dans `io.js` ; SW **0.3.0**.
- Vérifié en preview : import de l'exemple (10 élèves fictifs) → 6A créée, accents/homonymes corrects, ré-import = 10 doublons, édition fiche persistée, cascade OK, décodage 1252 OK, console propre.

## 2026-06-11 — v0.2.0 : Phase 1 (socle) presque complète

- **Sauvegarde** (`#/sauvegarde`) : export JSON complet (option pièces jointes, blobs en base64), import avec validation + double confirmation + export de sécurité automatique, purge totale protégée. Round-trip vérifié (données + blob restaurés à l'identique).
- **Réglages** (`#/reglages`) : établissement, année scolaire (store meta), thème auto/clair/sombre persisté, stockage (usage, quota, `storage.persist`), version et bouton « Vérifier les mises à jour » (BIBLE règle 5).
- `storage.persist()` demandé au démarrage ; thème sombre pilotable (`data-theme`) en plus du mode auto.
- Icônes : nav emoji → SVG Lucide inline (MIT) ; PNG 192/512 + maskable générés par `tools/gen-icons.ps1` (WPF, zéro dépendance), ajoutés au manifest.
- Service-worker **0.2.0** (nouveaux assets précachés) ; routes enfants sous « Plus ».
- Reste en phase 1 : test Android réel + installation PWA (HTTPS requis), test Playwright (validation dépendance npm à donner).

## 2026-06-11 — Phase 0 : création du projet

- Instanciation depuis le template projet — aujourd'hui `30_APPLICATIONS/RESSOURCES_IA/template-projet` (BIBLE, commandes, skills conservés verbatim).
- Cadrage complet dans `docs/` : brief, fonctionnalités, architecture, modèle de données, échanges Pronote, roadmap (phases 0→9), décisions D001–D008, journal.
- Squelette applicatif `app/` : shell PWA navigable (6 onglets), tokens CSS clair/sombre, wrapper IndexedDB (13 stores), manifest, service-worker versionné network-first (enregistré uniquement hors localhost).
- Jeu d'essai `app/data/exemple_eleves_pronote.csv` (données fictives).
- Serveur de dev `server-carnet.mjs` (port 8160) : `node server-carnet.mjs` à la racine du dépôt.
