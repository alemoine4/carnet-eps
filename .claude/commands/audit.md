---
description: Auditer l'app — architecture, qualité, dépendances, gratuité. Classer les problèmes et donner les 5 corrections prioritaires.
---

# /audit

Audite l'application actuelle de façon structurée. Cet audit englobe la vérification des outils gratuits (anciennement `/audit-outils-gratuits`).

## Vérifications

### Architecture
- Structure des fichiers conforme au template ?
- Séparation état / UI / stockage / IO ?
- Fichiers trop longs (> 300 lignes) ?
- Duplication de code ?

### Qualité du code
- Console propre ?
- Lisibilité ?
- Conventions de nommage cohérentes ?
- Code mort ?

### Stockage
- `localStorage` vs IndexedDB cohérent avec le volume ?
- Schéma de données documenté (`app/data/schema.json`) ?
- Migration prévue si schéma évolue ?

### PWA
- Manifest complet ?
- Service-worker versionné ?
- Stratégies de cache cohérentes ?
- Test hors ligne réel concluant ?

### Responsive & accessibilité
- Mobile / tablette / desktop OK ?
- Contraste, focus, navigation clavier ?

### Dépendances & gratuité
Pour chaque dépendance déclarée (package.json, CDN, MCP) :
1. nom
2. usage
3. gratuit / partiellement gratuit / payant / inconnu
4. risque de coût
5. alternative gratuite si nécessaire
6. recommandation : garder / remplacer / supprimer / vérifier

### Tests
- Tests Playwright critiques présents ?
- Checklist manuelle à jour ?

## Classement des problèmes

- **Critique** : casse une fonctionnalité, perte de données possible, faille de sécurité, coût caché.
- **Important** : dégrade l'expérience, freine la maintenance.
- **Confort** : amélioration souhaitable, sans urgence.

## Sortie attendue

```md
# Audit projet — [date]

## Vue d'ensemble
- état général : sain / à surveiller / dégradé
- résumé en 3 lignes

## Problèmes critiques
- C1 : ...
- C2 : ...

## Problèmes importants
- I1 : ...

## Problèmes confort
- ...

## Dépendances et gratuité
[tableau outil / statut / recommandation]

## Top 5 corrections prioritaires
1. ...
2. ...
3. ...
4. ...
5. ...

## Outils utilisés pour l'audit
- (tous gratuits, voir BIBLE.md règle 1)
```
