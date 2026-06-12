# Fonctionnalités — spécification par module

Priorités : **P1** = indispensable v1 · **P2** = v1.x · **P3** = plus tard.
Chaque module = une vue + un fichier `app/js/modules/<module>.js` (à partir de la phase 2).

---

## 1. Référentiel — Classes & élèves (P1, phase 2)

- CRUD classes : nom (6eA…), niveau, couleur, année scolaire, archivage.
- CRUD élèves : nom, prénom, sexe, date de naissance, classe, **notes perso** (PAI, asthme, lunettes…), photo optionnelle.
- **Import CSV Pronote** : séparateur `;` ou tabulation, détection des colonnes (Nom, Prénom, Né(e) le, Sexe, Classe) avec écran de mapping manuel si en-têtes inattendus. Jeu d'essai : `app/data/exemple_eleves_pronote.csv`.
- Fiche élève = hub : identité + historique d'appel + inaptitudes + certificats + notes (agrégé depuis les autres modules).
- Règles : pas d'INE ni d'adresse (minimisation RGPD). Un élève supprimé = suppression en cascade de ses données (confirmation + rappel export).

## 2. EDT (P1, phase 3)

- Créneaux hebdomadaires : jour, heure début/fin, classe, **semaine A/B ou toutes**, installation (gymnase, plateau, piscine…).
- Périodes (cycles calendaires) : vacances de zone gérées simplement par dates de début/fin de période.
- Vues : semaine (PC), jour (mobile), et « **maintenant** » : à l'ouverture, l'app propose le cours en cours ou à venir.
- Règle : un créneau peut être ponctuellement annulé/déplacé (sortie, stage) sans casser la récurrence.
- S'inspirer d'EDT_EPS_BUILDER (projet existant) pour l'UX de saisie, sans en dépendre.

## 3. Séquences & séances (P1 léger, phase 3)

- Séquence = classe + APSA + champ d'apprentissage (CA1-4) + AFL + dates + nb de séances prévues.
- Séance = date + n° auto (« séance 4/10 ») + thème + bilan rapide (texte court post-cours).
- La séance est la **clé de voûte** : l'appel et les évaluations s'y rattachent.
- Création automatique : au lancement, si un créneau EDT correspond à maintenant et qu'aucune séance n'existe → proposer de la créer en un tap.

## 4. Appel & absences EPS (P1, phase 4 — cœur de l'app)

- Écran d'appel : grille de cartes élèves (nom + photo/initiales), **un tap = cycle de statut**, appui long = menu complet.
- Statuts : `present` (défaut) · `absent` · `retard` (+ minutes) · `dispense` (mot des parents, ponctuel) · `inapte` (lié à une inaptitude enregistrée) · `oubli_tenue` · `infirmerie` (départ en cours de séance).
- Pré-remplissage : inaptitude active à la date du jour → statut `inapte` proposé d'office, pastille visible.
- Compteurs en direct : effectif présent / pratiquants (l'inapte présent n'est pas pratiquant).
- Historique : par séance, par élève (vue fiche élève), par classe.
- Alertes : 3 oublis de tenue ou 3 dispenses « mot » sur le trimestre → signalement.
- Export : récap période/classe en CSV + impression (`window.print`).
- **Important** : l'appel réglementaire reste fait dans Pronote (vie scolaire). Carnet EPS trace le suivi EPS fin, il ne remonte rien automatiquement (décision D006).

## 5. Inaptitudes (P1, phase 5)

- Inaptitude = élève + type (**totale / partielle**) + dates début/fin + origine (certificat médical / mot parents / infirmerie) + restrictions (course, sauts, appuis, natation, port de charge…) + commentaire + lien certificat.
- Pastille visible **partout** où l'élève apparaît (appel, listes, notes) pendant la période active.
- Alertes : J-7 avant expiration ; inaptitudes > 3 mois → rappel « médecin scolaire » (réglementation).
- Vue synthèse : toutes les inaptitudes actives de mes classes.

## 6. Certificats médicaux & pièces (P1, phase 5)

- Capture photo (caméra Android) ou fichier (PDF/image) → **compression canvas → JPEG ≤ ~300 Ko** avant stockage IndexedDB (store `fichiers`).
- Métadonnées : élève, date de dépôt, période couverte, commentaire.
- Visionneuse plein écran + zoom basique.
- Suppression en cascade documentée (purge fin d'année).

## 7. Évaluations & notes (P1, phase 6)

- Évaluation = séquence + titre + date + type : **note /20**, barème personnalisé, ou **AFL** (positionnement par degrés).
- Saisie en **grille** (lignes = élèves triés alphabétiquement comme Pronote, colonnes = critères), clavier numérique optimisé mobile, navigation touche suivante.
- Codes spéciaux : `ABS`, `DISP`, `NN` (non noté).
- Calculs : moyenne pondérée par coefficients, stats classe (moyenne, min/max, répartition).
- **Export Pronote** (voir `docs/pronote.md`) : copie presse-papiers de la colonne triée + export CSV. Mention « publiée le … » sur l'évaluation.
- Impression : relevé par classe et par élève (`@media print`).

## 8. Documents (P2, phase 7)

- Bibliothèque locale : titre, type (fiche, projet, sécurité, convocation…), tags, classes liées, fichier (store `fichiers`) **ou** lien externe.
- Filtres par tag/classe. Pas d'éditeur intégré : on stocke, on retrouve, on ouvre.

## 9. Tableau de bord « Aujourd'hui » (P2, phase 7)

- Cours du jour (depuis EDT) avec accès direct à l'appel.
- Alertes agrégées : certificats expirant sous 7 jours, inaptitudes se terminant, élèves à signalement tenue, évaluations non exportées vers Pronote.
- Raccourcis : dernière classe, dernière évaluation.

## 10. Sauvegarde & réglages (P1, phase 1 puis enrichi)

- **Export JSON complet** (toutes données + fichiers en base64 ; option « sans pièces jointes » pour un fichier léger).
- Import = restauration complète avec double confirmation (+ export automatique de sécurité avant).
- Purge : par année scolaire ou totale (double confirmation + export auto préalable).
- Réglages : établissement, année scolaire, thème clair/sombre/auto, gestion du stockage (`navigator.storage.estimate`), bouton « Vérifier les mises à jour » (SW, BIBLE règle 5).
