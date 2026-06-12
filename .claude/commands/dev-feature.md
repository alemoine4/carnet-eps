---
description: Ajouter une fonctionnalité au projet en touchant le minimum de fichiers. Lecture → plan → code → tests.
---

# /dev-feature

Ajoute la fonctionnalité demandée en suivant la méthode obligatoire ci-dessous.

## Méthode

1. **Lire** `CLAUDE.md`, `BIBLE.md`, et les fichiers concernés par la fonctionnalité.
2. **Identifier les impacts** : quels fichiers, quelles fonctions, quels effets de bord.
3. **Proposer un plan court** (max 10 lignes) **avant d'écrire du code**.
4. **Vérifier que les outils nécessaires sont gratuits** (BIBLE.md règle 1).
5. **Modifier le minimum nécessaire** : pas de refactor opportuniste.
6. **Indiquer les tests à faire** (Playwright ou checklist manuelle).
7. **Mettre à jour `CHANGELOG.md`** si la fonctionnalité est visible utilisateur.

## Si la fonctionnalité touche plus de 3 fichiers

→ Passer d'abord par `/plan` (ou produire un mini `AVIS_FEATURE_*.md`) et attendre validation avant code.

## Sortie attendue (avant code)

```md
# Plan : [nom fonctionnalité]

## 1. Diagnostic
- ce que l'app fait actuellement
- ce qui manque

## 2. Plan d'action
- étape 1 : ...
- étape 2 : ...

## 3. Fichiers modifiés
- app/js/state.js — ajout fonction X
- app/js/ui.js — ajout bouton Y
(liste précise)

## 4. Tests à faire
- [ ] test manuel : ...
- [ ] test Playwright : ...

## 5. Outils utilisés
- (tous gratuits)

## 6. Risques
- ...
```

## Interdits

- Réécrire des fichiers entiers "pour faire propre".
- Introduire une dépendance npm sans validation.
- Casser une fonctionnalité existante sans le signaler.
