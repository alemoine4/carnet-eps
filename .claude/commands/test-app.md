---
description: Tester l'application comme un utilisateur réel. Vérifications complètes + rapport priorisé.
---

# /test-app

Teste l'application comme un utilisateur EPS en conditions réelles.

## Vérifications

### Fonctionnement de base
- [ ] Ouverture sans erreur console
- [ ] Clics principaux opérationnels
- [ ] Création / modification / suppression
- [ ] Sauvegarde effective (vérifier `localStorage` / IndexedDB)
- [ ] Rechargement → données conservées

### Données
- [ ] Import (CSV/JSON) si concerné
- [ ] Export (CSV/JSON) si concerné
- [ ] Suppression complète des données (option utilisateur)

### Responsive
- [ ] Mobile (~ 375 px)
- [ ] Tablette (~ 768 px et ~ 1024 px)
- [ ] Desktop

### PWA
- [ ] Installation possible
- [ ] Fonctionnement hors ligne (Chrome DevTools → Offline)
- [ ] Mise à jour du service-worker propre (pas de version morte)

### Accessibilité minimale
- [ ] Navigation clavier complète
- [ ] Contraste suffisant (axe-core ou Lighthouse)
- [ ] Tailles cibles ≥ 44×44 px sur tablette

### Impression
- [ ] Si concerné : page imprimable propre

### Gratuité
- [ ] Aucune dépendance payante ajoutée
- [ ] Aucun appel à un service externe payant

## Sortie attendue

```md
# Rapport de test

## Contexte
- version testée : ...
- navigateurs : ...
- viewports : ...

## Résultats
✓ ce qui fonctionne
✗ ce qui ne fonctionne pas (lister précisément)

## Bugs trouvés
- B1 [critique] : ...
- B2 [important] : ...
- B3 [confort] : ...

## Priorités de correction
1. ...
2. ...
3. ...

## Outils utilisés
- (tous gratuits, voir BIBLE.md règle 1)
```

## Règles

- Si tu ne peux pas exécuter un test (pas de navigateur), **dis-le** et fournis la commande exacte à lancer.
- Pas de jugement vague : chaque bug doit être reproductible.
