---
description: Corriger un bug au plus petit périmètre. Reproduction → cause → correction ciblée → test de non-régression.
---

# /fix-bug

Corrige le bug décrit en respectant la procédure ci-dessous.

## Procédure

1. **Reproduire** mentalement le bug (ou via test Playwright si possible). Décrire les étapes exactes.
2. **Identifier la cause probable** : pointer la ligne ou le bloc fautif.
3. **Localiser les fichiers concernés** (idéalement 1, max 2).
4. **Corriger au plus petit périmètre** : pas de refactor opportuniste.
5. **Ajouter un test si possible** (Playwright ou cas dans `tests/checklist.md`) qui aurait attrapé le bug.
6. **Expliquer** la cause et la correction en 3-5 lignes.
7. **Mettre à jour `CHANGELOG.md`** sous section "Corrections".

## Sortie attendue

```md
# Fix : [titre court du bug]

## Reproduction
1. ...
2. ...
3. → comportement observé : ...
   comportement attendu : ...

## Cause
[explication technique courte]

## Correction
- fichier : ...
- ligne(s) : ...
- diff résumé : ...

## Test de non-régression
- [ ] manuel : ...
- [ ] Playwright (si applicable) : ...

## Risques
- (effet potentiel sur autres fonctionnalités, ou "aucun")
```

## Interdits

- Corriger plus que le bug demandé.
- Introduire une dépendance.
- Réécrire la fonction "tant qu'on y est".
- Affirmer "ça marche" sans avoir vérifié.
