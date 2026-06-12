# BIBLE — Règles inviolables du projet

> Ce fichier énonce les règles **non négociables**. Claude ne doit jamais les contourner, même sur demande implicite.
> En cas de doute, Claude doit **demander confirmation explicite** plutôt que de transgresser.

---

## Règle 1 — Gratuité stricte

**Aucun outil, service, bibliothèque ou template payant** ne doit être proposé, installé ou intégré.

### Périmètre
- MCP, design systems, tests, hébergement, monitoring, SaaS, banques d'images, templates.
- L'abonnement Claude/Cowork est la **seule** exception (déjà disponible).

### Pratique
- Toute proposition d'outil doit être accompagnée d'une **justification de gratuité** :
  - licence open source (MIT, BSD, Apache 2.0, GPL…) ;
  - ou plan gratuit suffisant pour l'usage visé, **avec mention explicite des quotas**.
- En cas de doute → **alternative gratuite par défaut** :
  - CSS vanilla + variables CSS au lieu de design systems lourds.
  - GitHub Pages au lieu d'hébergeurs avec quotas.
  - SVG inline / Lucide / Heroicons au lieu de banques d'icônes.
  - Penpot ou exports SVG au lieu de Figma payant.

### Outils interdits jusqu'à validation explicite
- Tailwind UI, Flowbite Pro, DaisyUI Premium, composants premium quelconques.
- BrowserStack, Percy, Chromatic, Sentry payant.
- Bases de données cloud payantes, API payantes.
- Banques d'images / icônes / illustrations payantes.
- MCP obscurs ou non vérifiés.

---

## Règle 2 — Modifications minimales

**Ne jamais réécrire toute l'application sans nécessité.**

- Une demande de bug fix corrige le bug, pas plus.
- Une demande de fonctionnalité ajoute la fonctionnalité, pas le reste.
- Toute refonte large doit être précédée d'un **avis écrit** (`AVIS_*.md`) et validée avant application.
- Tout changement touchant plus de 3 fichiers doit passer par `/plan` avant `/dev-feature`.

---

## Règle 3 — Périmètre fichiers protégés

**Ne jamais modifier sans demande explicite** :

- `BIBLE.md` (ce fichier).
- `/archives/*`.
- Les anciennes versions ou snapshots.
- Les fichiers `AVIS_*.md` une fois validés.

**Toujours mettre à jour quand pertinent** :

- `CHANGELOG.md` après chaque changement notable.
- `TODO.md` pour suivre les restes à faire.
- `docs/decisions.md` lors d'un choix architectural structurant.

---

## Règle 4 — Données élèves et données sensibles

**Aucune donnée nominative ne quitte le poste local** sans validation explicite.

- Pas de service cloud par défaut.
- Pas d'identifiant national élève (INE) stocké en clair sans nécessité documentée.
- Toujours offrir un export local (CSV/JSON) et une **suppression complète** des données.
- Documenter dans `docs/decisions.md` ce qui est stocké, où, pourquoi, et comment supprimer.
- Limites de sécurité d'une app locale à expliquer dans `README.md` (pas de chiffrement fort sans clé utilisateur, perte possible si cache navigateur effacé, etc.).

---

## Règle 5 — Service-worker et PWA

**Le service-worker ne doit jamais garder une version morte.**

- Versionner le SW à chaque déploiement.
- Stratégie `network-first` (ou `stale-while-revalidate`) pour `index.html` et `manifest.webmanifest`.
- Stratégie `cache-first` pour assets statiques uniquement.
- Prévoir un **bouton "vérifier mise à jour"** ou une notification visible dans l'UI.
- Avant migration de SW : `/checkpoint` (export JSON automatique) pour éviter perte de données.

---

## Règle 6 — Avis avant application

Pour tout changement **structurant**, Claude doit :

1. Produire un fichier `AVIS_*.md` au format défini (verdict, points solides, risques, gratuité, plan).
2. **Ne pas modifier les fichiers** tant que le verdict n'est pas validé explicitement par l'utilisateur.

Sont structurants : architecture, refactor, ajout/suppression de skill ou commande, ajout de dépendance, migration de stockage, changement de service-worker.

---

## Règle 7 — Honnêteté technique

- Ne jamais écrire "le code devrait fonctionner" sans vérification.
- Si Claude ne peut pas exécuter un test (pas de navigateur, pas d'environnement), il le dit et fournit une **checklist manuelle vérifiable**.
- Toute incertitude doit être nommée. Aucune affirmation creuse.

---

## Règle 8 — Pas de magie cachée

- Pas de clé API stockée dans le projet.
- Pas de dépendance ajoutée sans la déclarer.
- Pas d'appel réseau ajouté sans le mentionner.
- Pas de tracking, analytics ou télémétrie, même "anonyme".
