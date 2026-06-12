---
description: Cadrer un nouveau projet — objectif, utilisateurs, fonctionnalités, données, écrans, architecture.
---

# /cadrer

Analyse ma demande et produis une note de cadrage structurée.

## Méthode

1. Lire `CLAUDE.md` et `BIBLE.md` si présents.
2. Si des fichiers existent déjà dans `docs/`, les lire avant de proposer.
3. Mobiliser la skill `architecte-refactor` pour la partie architecture.
4. Ne **pas** créer de code à ce stade.

## Sortie attendue

```md
# Cadrage projet — [nom]

## 1. Objectif de l'application
Une phrase claire. Un usage principal.

## 2. Utilisateurs
- profil principal
- contexte d'usage (gymnase, classe, terrain, bureau…)
- contraintes (mobilité, réseau, écran tactile…)

## 3. Fonctionnalités prioritaires (MVP)
- F1 : ...
- F2 : ...
- F3 : ...
(maximum 5)

## 4. Données à stocker
- nature
- volume estimé
- sensibilité (données élèves ? RGPD ?)
- stratégie : localStorage / IndexedDB / les deux

## 5. Écrans nécessaires
- écran 1 : ...
- écran 2 : ...

## 6. Risques techniques
- ...

## 7. Première architecture proposée
[arborescence cohérente avec template/]

## 8. Outils gratuits utiles
- (tous gratuits, voir BIBLE.md règle 1)

## 9. Ce qui est volontairement exclu du MVP
- ...
```

## Règles

- Ne propose **aucun outil payant** (cf. BIBLE.md règle 1).
- Demande à clarifier **uniquement** si une information bloque réellement le cadrage.
- En fin de cadrage, propose les 3 premiers `/dev-feature` à enchaîner.
