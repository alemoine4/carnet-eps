# Stratégie d’audit et d’amélioration — Carnet EPS

Date : 6 septembre 2026. Référence locale : commit `3887bb0`, version applicative et service-worker `0.12.7`, schéma IndexedDB `2`.

## 1. Recommandation

Conduire un audit ciblé par risque : **préservation des données → fonctionnement hors ligne et mises à jour → exactitude métier → usage Android et Pronote → maintenabilité**. Corriger uniquement les défauts démontrés, par petits lots. Aucun élément lu ne justifie à ce stade une réécriture, un framework ou une nouvelle dépendance.

L’application possède déjà une architecture modulaire vanilla, une couche IndexedDB, des sauvegardes et des tests. Plusieurs audits ont été traités. La meilleure valeur du prochain audit sera de vérifier les limites des garanties existantes et les parcours terrain restés ouverts, plutôt que de refaire une liste générale de bonnes pratiques.

## 2. Périmètre de cette préparation

- Dossier examiné : `C:\Users\lemoi\Documents\30_APPLICATIONS\TRAVAIL\CARNET EPS\carnet-eps` (dossier réel de l’espace de travail).
- Lecture des règles projet, README, TODO, derniers éléments de suivi, rapport d’audit de septembre, configuration de tests, inventaire et portions ciblées du code et des tests.
- Inspection particulièrement ciblée sur `io.js`, `sauvegarde.js`, le service-worker, les versions et les scénarios Playwright.
- Aucun fichier applicatif, test, configuration, historique ou document existant modifié. Seul ce dossier de restitution est créé.
- Aucun serveur lancé, aucun test exécuté, aucune installation, aucun accès au navigateur personnel, aucune consultation de données élèves ou du site déployé.

**Ce document prépare l’audit ; il ne certifie ni l’absence de bugs ni les résultats historiques.** Le journal annonce 28/28 tests réussis ; ce résultat n’a pas été reproduit pendant cette préparation. Les scores Lighthouse du README sont également historiques.

## 3. Points d’appui et lacunes observables

| Élément | Observation dans le dépôt | Conséquence pour l’audit |
|---|---|---|
| Architecture | Modules métier séparés, couche de données commune, aucune dépendance runtime déclarée | Conserver ces choix et concentrer la lecture sur les contrats entre couches |
| Changements récents | Helpers mutualisés, trimestres, écritures groupées ; B27/B30/B29 annoncés livrés | Vérifier les régressions et ne pas présenter ces anciens sujets comme encore à corriger |
| Suite existante | 8 smoke-tests et 20 tests de régression ; projet Playwright Desktop Chrome | Bon point de départ, sans preuve automatique sur Android réel |
| Hors ligne | Enregistrement du SW exclu sur localhost ; tests configurés sur localhost | Une suite verte ne valide pas le hors ligne ni la mise à jour PWA |
| Restauration | Le smoke-test de round-trip compare le nombre d’élèves exportés/importés | Ajouter ultérieurement une comparaison complète des valeurs, relations et pièces jointes |
| Terrain | TODO conserve des validations Pronote, Android, installation et impression | Traiter ces validations comme des travaux distincts des tests de code |
| Documentation | La fin de roadmap mentionne encore B29/B30 comme reliquats, alors que le journal décrit leur livraison | Réconcilier le suivi après l’audit, sans modifier les rapports historiques |

Sources locales : `README.md`, `TODO.md`, `docs/journal.md`, `docs/roadmap.md`, `docs/audit-2026-09-05.md`, `tests/e2e/README.md`, `playwright.config.mjs`, `tests/e2e/smoke.spec.mjs`, `tests/e2e/regressions.spec.mjs`.

## 4. Méthode proposée

### Étape A — Établir une référence reproductible

1. Relever commit, versions, état Git, Node et navigateur ; distinguer checkout local et version réellement servie.
2. Utiliser un profil de test isolé avec uniquement des données fictives. Ne jamais réutiliser la base du professeur.
3. Exécuter la suite existante et conserver commande, résultat et erreurs dans le dossier d’audit. Vérifier quel serveur répond sur le port 8160 : la configuration actuelle autorise la réutilisation d’un serveur existant.
4. Classer séparément les échecs d’environnement et les défauts applicatifs. Aucun téléchargement ou ajout d’outil nécessaire à cette préparation.

Livrable ultérieur : référence technique et couverture réelle, sans confondre nombre de tests et nombre de garanties.

### Étape B — Vérifier les données avant tout confort visuel

Construire un jeu fictif couvrant les 14 stores : classes, élèves actifs et partis, séquences, séances, appels, évaluations, notes, observations, inaptitudes, certificats, documents, pièces jointes et réglages. Inclure accents, homonymes, valeurs nulles autorisées et limites de dates.

| Scénario prioritaire | Critère de réussite |
|---|---|
| Export complet → restauration par fichier via l’interface | Toutes les valeurs et relations conservées ; contenu binaire des pièces identique ; seules les métadonnées d’export attendues peuvent changer |
| Export sans pièces jointes | Comportement annoncé clairement ; absence de pièces traitée sans écran cassé ni fausse promesse de sauvegarde complète |
| Import invalide, incomplet ou ancien | Refus explicite sans modification de la base, ou compatibilité intentionnelle démontrée pour l’ancien schéma |
| Suppression puis annulation | Données liées et fichiers restaurés ; aucune relation orpheline introduite |
| Échec d’écriture ou quota atteint | Pas de succès affiché à tort ; état final défini et cohérent ; erreur exploitable |
| Purge interrompue | Vérifier l’état final et la récupération possible depuis une sauvegarde réellement récupérée |
| Deux onglets modifiant/exportant | Détecter pertes silencieuses, sauvegardes incohérentes et annulations qui écraseraient une modification récente |

Comparer les enregistrements, pas seulement les comptes. Pour les erreurs simulées, distinguer le comportement du test artificiel d’un scénario réellement possible dans le navigateur.

### Étape C — Vérifier PWA, réseau et mise à jour

Sur une origine HTTPS de test isolée et avec données fictives, conserver la règle actuelle qui désactive le SW sur localhost. Ne pas toucher à la production pour réaliser l’audit.

- Installer, charger tous les parcours, couper le réseau, fermer puis rouvrir l’application et vérifier lecture, saisie et sauvegarde locale.
- Simuler une mise à jour N → N+1 avec une page N encore ouverte, puis rechargement, avec et sans connexion ; vérifier cohérence des fichiers et conservation des données.
- Tester installation interrompue, asset manquant, réponse 404/500 et récupération ; comparer le contenu préchargé aux fichiers nécessaires.
- Vérifier la portée de la suppression des caches : l’activation actuelle supprime toutes les clés différentes du cache courant. Évaluer le risque si une autre application partage la même origine.
- Observer les requêtes : aucune émission de données élèves ; distinguer chargement des fichiers applicatifs et ouverture volontaire d’un lien externe.

Critère : les parcours essentiels fonctionnent après un redémarrage hors ligne ; une mise à jour ne laisse pas un mélange de versions qui casse l’app. Documenter précisément les limites constatées.

### Étape D — Contrôler les résultats métier

- Appel : double tap, appui long pendant défilement, statut final après rechargement, arrivée/départ/changement de classe, séance en double.
- Dates : bornes inclusives d’inaptitude, T1/T2/T3, changement d’année scolaire, heure proche de minuit et semaines A/B. Fixer l’horloge dans les tests pour éviter les résultats saisonniers.
- Notes : virgule décimale, zéro, absence, dispense, coefficient zéro, barème, arrondi et ordre exact des élèves lors de l’export.
- Pronote : parcours complet import CSV → saisie → export/copie ; cas accents, homonymes et colonnes réordonnées. Validation finale dans Pronote par le professeur, avec jeu de test si possible, sans transmettre de données nominatives.
- EDT et accueil : cours simultanés, périodes, séquences actives concurrentes, affichage du cours attendu.

Critère : résultats comparés à des attendus calculés indépendamment, et non au même helper que celui testé.

### Étape E — Mesurer l’usage terrain

- Vérifications navigateur à 360, 390, 768 et 1280 px, thèmes clair/sombre, zoom 200 %, navigation au clavier et restitution des statuts.
- Android réel : boutons atteignables clavier ouvert (B31), sélecteur caméra/fichiers, pièces consultables, défilement sans activation parasite, installation et redémarrage hors ligne.
- Chronométrer un appel de 28 élèves dans des conditions décrites : objectif projet inférieur à 40 secondes. L’émulation mobile ne remplace pas ce test.
- Imprimer récap et relevé sur plusieurs pages : période, en-têtes, coupures et lisibilité.
- Mesurer sur une année fictive représentative, pièces jointes incluses : délai d’ouverture des vues, export/restauration, mémoire après navigations répétées. Rapporter appareil, volume et mesures.

N’envisager un changement visuel que s’il résout une difficulté observée. Ne pas transformer cet audit en refonte graphique.

## 5. Hypothèses à vérifier en premier

Ces éléments sont visibles dans le code mais leur impact doit être reproduit avant de les qualifier de bugs.

| ID | Indice précis | Vérification décisive |
|---|---|---|
| H01 | `sauvegarde.js` purge avec `for (const nom of STORES) await vider(nom)` ; `vider` ouvre une transaction par store | Injecter une erreur en cours de purge et examiner données restantes et message utilisateur |
| H02 | `io.js::exporterJSON` lit successivement les stores | Modifier des relations depuis un second onglet pendant l’export ; rechercher un état impossible dans la sauvegarde |
| H03 | `enregistrer`, `supprimer`, `vider` attendent le succès de requête ; les lots attendent la transaction | Provoquer un échec tardif de transaction et vérifier si l’interface annonce un succès prématuré |
| H04 | `validerExport` vérifie clés/listes ; stores absents remplacés par listes vides, pas de contrôle relationnel dans cette fonction | Tester doublons d’identifiants, références absentes, types métier invalides et ancienne sauvegarde valide ; préciser les règles acceptables avant de durcir |
| H05 | Le SW utilise `skipWaiting`, `claim`, cache-first des assets et nettoyage des caches | Tester coexistence de versions ouvertes et de caches d’autres applications sur la même origine |

Une hypothèse réfutée est conservée comme telle dans le rapport final. Les audits précédents servent de référence ; leurs correctifs ne sont rouverts que sur une preuve actuelle.

## 6. Décider des améliorations

Pour chaque constat confirmé : identifiant, version, fichier/ligne, préconditions, étapes, attendu/observé, preuve, impact, fréquence et correctif minimal envisagé.

- **P0** : perte irréversible ou émission de données sensibles démontrée — priorité absolue.
- **P1** : résultat métier faux, restauration inutilisable ou parcours essentiel bloqué — traiter avant les améliorations de confort.
- **P2** : défaut avec contournement ou cas rare — lot ciblé selon impact.
- **P3** : documentation ou maintenabilité sans effet utilisateur démontré — après les risques fonctionnels.

La sévérité d’un défaut et le niveau de certitude sont deux informations distinctes. Ne pas attribuer une priorité de bug à une simple possibilité technique.

Après l’audit, proposer les lots avec bénéfice, fichiers concernés, risque et validation attendue. Une correction acceptée suit : reproduction → test utile qui échoue → modification minimale → test ciblé → suite pertinente → vérification terrain si nécessaire. Les choix structurants feront l’objet d’un avis écrit selon les règles projet.

**Aucune correction n’est autorisée par ce document : la consigne actuelle reste de ne rien modifier dans l’application.**

## 7. Livrables et critères de fin du futur audit

Conserver dans `audit codex/` le rapport, une matrice de scénarios (réussi/échoué/non exécuté), les preuves fictives et le plan de correction priorisé. Les scripts temporaires éventuels et leurs sorties devront rester isolés ; ne pas écraser les tests existants pendant la phase d’audit.

L’audit est terminé lorsque chaque risque prioritaire dispose d’une preuve ou d’une limite clairement déclarée, que les validations terrain sont identifiées, et que les corrections proposées sont justifiées. L’amélioration est terminée seulement après correction des lots retenus et vérification correspondante. Une suite verte ne suffit pas à certifier Android, Pronote ou le hors ligne.

Outils utilisés ici : lecture locale PowerShell, recherche `rg`, inspection Git et création de ce Markdown. Aucun nouvel outil, abonnement, service ou dépendance ajouté ; aucun coût supplémentaire engagé. Pour le futur audit, privilégier l’outillage déjà présent : Playwright installé, déclaré Apache-2.0 dans son package local, et les navigateurs disponibles.

Limites : lecture ciblée, pas d’audit exhaustif du code, pas de test dynamique, pas de vérification juridique ou de certification de sécurité. Les risques décrits constituent un programme de vérification, pas un verdict négatif sur l’application.
