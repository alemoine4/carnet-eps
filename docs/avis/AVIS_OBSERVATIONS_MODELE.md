# AVIS avant application — Observations (modèle de données & migration)

> Roadmap priorité « noter en 2 taps ». **Crée une nouvelle entité = migration de schéma IndexedDB → AVIS obligatoire (BIBLE).**
> Statut : **proposition, aucun code modifié.** Cet AVIS ne couvre **que le socle** (données + migration + cascade + export). L'UI (formulaire, timeline, tags, modèles de phrases, dictée) fera l'objet d'une implémentation par étapes **après** validation de ce modèle.

---

## 1. Diagnostic court

Il manque l'entité **observation** : noter à chaud un fait sur un élève (engagement, sécurité, oubli, progrès…) pendant/juste après la séance, et le retrouver au conseil de classe. C'est la **fondation** qui alimentera ensuite le tableau de bord, les bulletins et la **génération d'appréciations**. Il faut donc la modéliser proprement **dès le départ** : un mauvais schéma se paie sur 3 fonctionnalités en aval.

## 2. Modèle de données proposé

### Nouveau store `observations`
- `keyPath: 'id'` (`crypto.randomUUID()`), **index : `eleveId`** (timeline par élève).

| Champ | Type | Rôle |
|---|---|---|
| `id` | string (uuid) | clé |
| `eleveId` | string (req., **indexé**) | élève concerné |
| `date` | ISO `YYYY-MM-DD` | date de l'observation (affichée `JJ/MM/AAAA`) |
| `type` | string | catégorie (voir vocabulaire) |
| `ton` | `'positif' \| 'neutre' \| 'vigilance'` | couleur/sens (pour le bulletin et l'affichage) |
| `tags` | string[] | étiquettes libres normalisées (`#tenue`, `#sécurité`…) |
| `texte` | string | le contenu (saisi ou dictée vocale native du clavier) |
| `seanceId` | string \| null | séance liée (optionnel, contexte) |
| `dateAjout` | ISO datetime | horodatage de création |

> `classeId` n'est **pas** stocké (dérivable depuis l'élève) → pas de désynchronisation si l'élève change de classe.

### Vocabulaire (constantes dans `metier.js`, pas dans le schéma)
- **Types** : engagement, comportement, progrès, sécurité, oubli de tenue, inaptitude, autonomie, coopération, remarque libre.
- **Tags** : `#tenue #sécurité #engagement #progrès #comportement #conseil #bulletin`.
- **Modèles de phrases** (tableaux statiques réutilisables) : « Très bon engagement aujourd'hui. », « Besoin d'être relancé régulièrement. », « Attention aux consignes de sécurité. », « Oubli de tenue répété. »…

### Migration `DB_VERSION 1 → 2`
La migration est **purement additive** (création d'un store vide) : aucune transformation des données existantes. Le `onupgradeneeded` actuel d'`io.js` crée déjà « les stores manquants » → il créera `observations` (+ son index) sans toucher au reste. **Données existantes préservées par construction.**

- BIBLE (« export JSON auto avant migration ») : comme la montée est additive et sans risque, je propose un **export de sécurité automatique au premier lancement en v2** (téléchargé une fois, avant l'ouverture en écriture), + rappel dans le toast de MAJ. À valider : auto-export systématique, ou simple recommandation de sauvegarde ?

## 3. Intégrations à prévoir (cohérence)
- **Cascade suppression élève** : `supprimerEleveEnCascade` doit **aussi supprimer les observations** de l'élève — et l'**undo** (`restaurer`) doit les rendre (ajouter `observations` au snapshot). Idem `apercuSuppressionEleve` / `detailSuppression` (« … 3 observations »).
- **Suppression de séance** : ne supprime **pas** les observations (elles appartiennent à l'élève) — au plus, on délie `seanceId` (optionnel, v2.x).
- **Export / import JSON** : automatique (les deux itèrent `STORES` = clés du SCHEMA) → `observations` incluse sans code en plus. Le `schemaVersion` passe à 2 ; un vieux backup v1 s'importe toujours (`observations` vide) ; un backup v2 est refusé par une app v1 (déjà géré par `validerExport`).

## 4. Fichiers concernés (au moment de l'implémentation, pas maintenant)
- `app/js/io.js` : `SCHEMA.observations` + `DB_VERSION = 2` ; cascade élève + `restaurer`/`apercu`/`detail` ; (export/import inchangés mais couvrent observations).
- `app/js/metier.js` : constantes (types, tags, modèles de phrases) + éventuels helpers.
- `docs/modele-donnees.md` : documenter le store + la migration.
- *(UI : formulaire « + observation », timeline fiche élève, intégration Suivi/accueil — étapes suivantes, hors de cet AVIS.)*

## 5. Tests à faire (à l'implémentation)
- Montée v1→v2 sur une base existante peuplée : aucune perte (round-trip `compterTout` identique + store `observations` présent et vide).
- Créer/lire/supprimer une observation ; timeline par élève triée par date.
- Cascade : supprimer un élève supprime ses observations ; **Annuler** les restaure.
- Export/import round-trip avec des observations.
- Smoke-test Playwright +1.

## 6. Confirmation gratuité
**Oui — zéro dépendance.** IndexedDB natif (wrapper maison existant), dictée = micro **natif du clavier** (aucune lib), modèles de phrases = données statiques. BIBLE règle 1 et 4 respectées (tout local).

## 7. Risques & rollback
- **Migration** : additive donc faible risque ; le seul vrai risque serait un `DB_VERSION` mal géré → testé sur base peuplée avant déploiement. Tag de version avant (rollback du *code* possible ; **attention** : une fois la base montée en v2 chez l'utilisateur, revenir à une app v1 referait un `validerExport` qui refuse les backups v2 — documenté dans `docs/deploiement.md`).
- **Backup avant migration** : à trancher (§2).
- **Cascade/undo** : bien ajouter `observations` partout (cascade, snapshot, aperçu) sinon fuite de données orphelines / undo incomplet — couvert par tests.

---

## Décisions attendues de ta part
1. **Modèle OK ?** (champs ci-dessus — notamment le champ `ton` positif/neutre/vigilance, utile pour les bulletins : on le garde ?)
2. **Backup avant migration** : export auto systématique au 1er lancement v2, ou simple recommandation ?
3. **Périmètre du 1er lot d'implémentation** après ce socle : je proposerais **socle données + bouton « + observation » (depuis la fiche élève) + timeline élève** ; tags / modèles de phrases / accès depuis l'appel viendraient juste après.

Dès tes réponses, j'implémente le socle (migration testée sur base peuplée) puis le bouton + la timeline.
