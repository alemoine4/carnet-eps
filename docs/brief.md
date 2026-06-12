# Brief — Carnet EPS

## Constat

Sur iPad, les professeurs d'EPS disposent d'applications dédiées (« Tablette EPS », iDoceo…). Sur **PC et Android**, il n'existe pas d'équivalent simple, gratuit et respectueux des données élèves. Pronote, de son côté, n'est pas un outil de terrain EPS : pas d'inaptitudes fines, pas de suivi de tenue, saisie des notes laborieuse, inutilisable au bord d'un bassin.

Résultat : les informations sont éparpillées (papier, tableurs, mémoire) et ressaisies plusieurs fois.

## Proposition

**Carnet EPS** : une PWA locale et hors ligne qui regroupe tout le quotidien du prof d'EPS, sur les appareils qu'il a déjà (PC au bureau, téléphone/tablette Android au gymnase), avec une passerelle Pronote là où c'est obligatoire (liste d'élèves en entrée, notes en sortie).

## Utilisateur cible

- Professeur d'EPS en collège (utilisateur unique par appareil en v1).
- Équipement : PC Windows + smartphone/tablette Android.
- Contexte d'usage : gymnase, plateau extérieur, piscine — **souvent sans réseau**, debout, une seule main disponible.

## Scénarios de référence (à satisfaire absolument)

1. **L'appel au gymnase** — Lundi 8h00, la 6eA arrive. J'ouvre l'app : elle affiche directement « 6eA — Badminton, séance 4/10 ». Je fais l'appel au toucher en moins de 40 secondes ; Inès a une inaptitude active → elle apparaît déjà marquée « inapte ». Maéva a encore oublié sa tenue → 3e fois, l'app me le signale.
2. **Le certificat médical** — Tom me tend un certificat d'inaptitude partielle de 3 semaines (pas d'appui sur le poignet). Je le photographie dans l'app, je saisis les dates et la restriction. À l'expiration, l'app m'alerte. Le jour du contrôle, Tom est automatiquement signalé.
3. **La fin de cycle** — Fin du cycle demi-fond avec la 4eB. Je saisis les notes en grille (élèves triés comme dans Pronote), je copie la colonne, je la colle dans le service de notation Pronote au bureau. Zéro ressaisie.
4. **La rentrée** — Septembre : j'exporte les listes d'élèves depuis Pronote en CSV, je les importe dans l'app, je saisis mon EDT. Prêt en moins de 30 minutes. Les données de l'année passée sont purgées (après export d'archive).
5. **Le changement d'appareil** — J'exporte un JSON complet depuis le PC, je l'importe sur la tablette. Tout est là, photos de certificats comprises.

## Contraintes

| Contrainte | Implication |
|---|---|
| Hors ligne total | PWA + IndexedDB, aucun appel réseau au runtime |
| Gratuité stricte (BIBLE règle 1) | Vanilla JS, hébergement GitHub Pages si besoin |
| Données élèves (BIBLE règle 4, RGPD) | 100 % local, minimisation, export + purge intégrés, pas d'INE |
| PC **et** Android | Mobile-first + layout bureau ; installation PWA des deux côtés |
| Pronote sans API prof | Échanges par CSV et presse-papiers uniquement (`docs/pronote.md`) |
| Utilisable à la rentrée 2026 | Phases 1→6 prioritaires (voir `docs/roadmap.md`) |

## Périmètre

**V1 (rentrée 2026)** : référentiel classes/élèves + import Pronote, EDT, appel/absences EPS, inaptitudes + certificats, évaluations/notes + export Pronote, sauvegarde JSON.

**V1.x** : documents, tableau de bord, impressions récapitulatives.

**Hors périmètre v1** (réévaluable, voir backlog roadmap) :
- Synchronisation automatique multi-appareils (transfert manuel JSON en v1).
- Multi-professeurs / partage d'équipe.
- AS / UNSS, FFSU, compétitions (Match Manager existe déjà pour les tournois).
- Génération de fiches de séance (SEANCE_PLANNER existe — passerelle possible plus tard).
- OCR des certificats.

## Critère de réussite global

À la Toussaint 2026 : **plus aucun papier ni tableur** pour l'appel, les inaptitudes et les notes d'EPS ; import Pronote des notes réalisé au moins une fois en conditions réelles.
