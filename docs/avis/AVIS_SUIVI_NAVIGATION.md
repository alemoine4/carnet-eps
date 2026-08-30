# AVIS avant application — Onglet « Suivi » (navigation EPS)

> Roadmap priorité n°3 (« suivi EPS visible et exploitable »). **Changement structurel de navigation → AVIS avant code (BIBLE).**
> Statut : **proposition, aucun code modifié.** Je n'implémente qu'après ton choix d'option (§2) et ton feu vert.

---

## 1. Diagnostic court

Les besoins **quotidiens** du prof d'EPS — inaptitudes en cours, certificats, oublis de tenue, alertes élèves — sont aujourd'hui **enterrés sous l'onglet « Plus »** (2 taps, peu visibles). C'est précisément l'avantage de Carnet EPS sur Pronote/iDoceo, et il est masqué. L'accueil agrège déjà ces alertes (`accueil.js` → `carteAlertes`), mais il n'existe pas de **point d'entrée dédié au suivi**.

Contrainte : la barre de navigation n'a que **6 emplacements** (Accueil · Appel · Élèves · Notes · EDT · Plus) ; en ajouter rend l'ensemble serré sur mobile 360 px.

## 2. Options de placement (à trancher)

| Option | Description | Pour | Contre |
|---|---|---|---|
| **A. Suivi à la place d'EDT** *(recommandée)* | EDT descend dans le menu « Plus » (avec Séquences, Documents, Sauvegarde, Réglages, Aide). « Suivi » prend sa place. On reste à **6 onglets**. | EDT est surtout consulté au paramétrage ; l'accueil affiche déjà « En ce moment / prochain cours ». Le suivi quotidien gagne en visibilité sans encombrer. | Changement d'habitude : EDT n'est plus en bas direct (mais reste à 2 taps). |
| **B. 7ᵉ onglet « Suivi »** | On garde EDT et on ajoute Suivi. | Rien n'est déplacé. | **7 onglets à 360 px = serré**, libellés à la limite ; cible tactile réduite. |
| **C. Renommer « Plus » en « Suivi »** | Pas de nouveau slot ; l'écran remonte Inaptitudes/Alertes en tête, puis les utilitaires. | Zéro changement de structure, le plus sûr. | Un onglet « Suivi » qui contient Réglages/Sauvegarde est incohérent ; demi-mesure. |

**Ma recommandation : option A.** Meilleur équilibre visibilité/encombrement, reste à 6 onglets, et l'EDT perd peu (le cours du jour est déjà sur l'accueil).

## 3. Contenu de l'onglet « Suivi » (avec l'existant)

Au lancement (les entités « Observations » et un vrai « registre d'oublis » viendront plus tard) :
- **Alertes élèves** : inaptitudes expirant (J-7) / réintégrations, seuils d'oublis de tenue et de dispenses, évaluations non remontées — **réutilise la logique de `carteAlertes`**.
- **Inaptitudes en cours / à venir** : synthèse (ou accès direct au module `#/inaptitudes` existant) + bouton **« + Nouvelle inaptitude »**.
- **Oublis de tenue** : récapitulatif par élève au-dessus du seuil (agrégé depuis les appels).
- *(Plus tard : Observations, Certificats détaillés — quand ces briques existeront.)*

## 4. Plan d'action (si option A validée)

1. **Refactor léger sans changement de comportement** : extraire l'agrégation d'alertes de `accueil.js` (`carteAlertes`) vers une fonction partagée dans **`metier.js`** (ex. `collecterAlertes()`), consommée par l'accueil **et** la nouvelle vue Suivi. (Aucun nouveau fichier.)
2. **Vue « Suivi »** définie **en inline dans `main.js`** (comme `plus`/`aide`) → **pas de nouveau fichier** → pas de modification de la liste `ASSETS` du service-worker.
3. **Navigation** (`index.html`) : remplacer l'onglet EDT par « Suivi » (icône Lucide inline, MIT) ; ajouter une carte « Emploi du temps » dans le menu « Plus ».
4. **Routage** (`main.js`) : ajouter `suivi` à `ROUTES` + `TITRES` ; `PARENT.edt = 'plus'` (EDT garde son écran, onglet parent = Plus) ; entrée Suivi.
5. **Tests** : ajouter 1–2 smoke-tests (l'onglet Suivi rend les alertes ; EDT accessible via Plus). Lancer `npm test`.
6. Bump `VERSION`/`VERSION_APP`, déploiement, tag, CHANGELOG/journal/`docs/deploiement.md`.

## 5. Fichiers concernés (prévus)
- `app/index.html` : barre de nav (EDT → Suivi).
- `app/js/main.js` : route + vue Suivi inline, `PARENT.edt`, carte EDT dans « Plus ».
- `app/js/metier.js` : `collecterAlertes()` (extraction).
- `app/js/modules/accueil.js` : consomme `collecterAlertes()` (rendu inchangé).
- `app/css/*` : style éventuel de l'icône/onglet (minime).
- `tests/e2e/smoke.spec.mjs` : +1 test.
- **Pas** de nouveau fichier JS → **pas** de changement des `ASSETS` du SW.

## 6. Risques & rollback
- **Habitude** : EDT n'est plus un onglet direct → bien le mettre en évidence dans « Plus » (en tête). Réversible.
- **Refactor des alertes** : risque de régression sur l'accueil → couvert par un smoke-test sur l'accueil + vérif preview (mêmes alertes qu'avant).
- **6 onglets** : on ne change pas le nombre → pas de souci de densité.
- **Rollback** : tag avant la version ; `git checkout <tag> -- app` + redeploy si besoin (cf. `docs/deploiement.md`).
- Aucune donnée touchée, aucune migration de schéma.

## 7. Confirmation gratuité
**Oui — zéro dépendance ajoutée.** Icône SVG Lucide inline (MIT, déjà la convention). Vanilla pur. BIBLE règle 1 respectée.

---

**Décision attendue de ta part** : option **A** (recommandée), **B** ou **C** ? Dès ton choix, j'implémente puis je vérifie (preview + `npm test`) avant déploiement.
