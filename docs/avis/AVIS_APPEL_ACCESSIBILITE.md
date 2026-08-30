# AVIS avant application — Accessibilité de l'écran d'appel (P1)

> Issu de l'audit UX du 2026-06-13. Statut : **proposition, aucun code modifié.**
> À valider avant toute implémentation (rituel CLAUDE.md / format de réponse §structurant).
> Périmètre : le **menu de statuts** de l'appel et la **carte élève**. Hors périmètre ici : contrastes (P2), retour d'appui long (P2), aide in-app (P3), visionneuse `media.js` (voir §Suite).

---

## 1. Diagnostic court

Sur l'écran d'appel ([app/js/modules/appel.js](app/js/modules/appel.js)), 4 des 7 statuts (retard, dispensé, inapte, infirmerie) ne sont atteignables **que par appui long** (`pointerdown` + 450 ms) ou clic droit. Conséquences :

- **Clavier (PC)** : `Entrée`/`Espace` sur la carte élève déclenchent le tap-cycle (présent → absent → oubli de tenue). Il n'existe **aucun chemin clavier** vers les 4 autres statuts.
- **Lecteur d'écran (NVDA/VoiceOver)** : même limite ; l'appui long n'est pas exposé.
- **La feuille de statuts** (`ouvrirMenu`, [appel.js:230](app/js/modules/appel.js#L230)) a `role="dialog"` mais : pas de piège de focus, pas de fermeture par `Échap`, pas d'`aria-modal`, arrière-plan non inerte, focus non déplacé à l'ouverture ni restitué à la fermeture.
- **Terrain** : l'appui long sans repère est aussi la cause n°1 de friction tactile (relâchement trop tôt).

C'est le seul point classé **P1** de l'audit (bloquant pour l'accessibilité et l'usage PC).

## 2. Plan d'action

Principe directeur : **on n'enlève rien** (le tap-cycle et l'appui long restent, pour ne pas régresser l'appel < 40 s) ; on **ajoute un chemin visible et standard** vers tous les statuts, et on fiabilise le modal.

### 2a. Un vrai modal natif (`<dialog>`) — mutualisé dans `ui.js`

Ajouter un helper `ouvrirFeuille({ titre, contenu })` dans [app/js/ui.js](app/js/ui.js) qui crée un `<dialog class="feuille">` ouvert avec `showModal()`. Bénéfices **gratuits et natifs** :

- Piège de focus + fermeture par `Échap` automatiques (top-layer du navigateur).
- Arrière-plan rendu inerte par le navigateur.
- Backdrop via `dialog::backdrop` (remplace `.feuille-fond`).
- Le helper mémorise l'élément déclencheur et lui **rend le focus** à la fermeture.

`ouvrirMenu()` de `appel.js` est réécrit pour utiliser ce helper (le contenu — grille de statuts, minutes de retard, commentaire — est inchangé). Le focus va sur le premier bouton de statut à l'ouverture.

### 2b. Affordance visible « Statut… » sur chaque carte élève

Aujourd'hui `.btn-eleve` est un `<button>` ; on ne peut pas imbriquer un second bouton dedans (HTML interactif imbriqué = invalide). Restructuration de la carte en **groupe à deux boutons** :

```
<div class="btn-eleve" role="group" aria-label="Inès Martin">
  <button class="eleve-cycle">      ← tap = cycle (présent→absent→tenue), grande cible 64 px
     nom · détail statut · 🩺/⚠
  </button>
  <button class="eleve-menu"        ← « ⋯ », aria-haspopup="dialog" : ouvre TOUS les statuts
          aria-label="Choisir le statut de Inès Martin">⋯</button>
</div>
```

- **Tactile** : tap sur la grande zone = cycle (inchangé) ; appui long conservé ; **+** bouton « ⋯ » toujours visible et fiable.
- **Clavier / lecteur d'écran** : `Tab` atteint les deux boutons ; `Entrée` sur « ⋯ » ouvre le `<dialog>` → les 7 statuts (déjà de vrais `<button>` tabulables) deviennent accessibles. `Échap` ferme.
- La **lettre-badge de statut** (P/A/R…) passe en tête de la ligne « détail » (inline) pour libérer le coin haut-droit au profit du « ⋯ ». La couleur de bordure continue d'indiquer le statut d'un coup d'œil.

> ⚠ **Point à valider visuellement** : c'est le seul vrai changement d'apparence de la carte. À vérifier en preview après accord (densité de la grille à 28 élèves, lisibilité du « ⋯ », position du badge déplacé).

### 2c. CSS

Dans [app/css/components.css](app/css/components.css) : adapter `.feuille` à `dialog` (`margin-top:auto`, `border:none`, `padding`), ajouter `dialog.feuille::backdrop { background: rgba(10,16,30,.45); }`, ajouter `.eleve-cycle` / `.eleve-menu` (cible ≥ 44 px pour le « ⋯ »). `.btn-eleve` devient le conteneur `position: relative` du groupe.

## 3. Fichiers modifiés (prévus)

| Fichier | Nature |
|---|---|
| [app/js/ui.js](app/js/ui.js) | **+** helper `ouvrirFeuille()` (modal `<dialog>` mutualisé, gestion focus) |
| [app/js/modules/appel.js](app/js/modules/appel.js) | `ouvrirMenu()` réécrit via le helper ; carte élève restructurée en groupe 2 boutons ; `Entrée`/clic sur « ⋯ » ouvre le menu ; tap-cycle + appui long conservés |
| [app/css/components.css](app/css/components.css) | `.feuille`→`dialog` + `::backdrop` ; `.eleve-cycle`, `.eleve-menu` ; ajustement `.btn-eleve` et placement du `.badge-statut` |

Aucune migration de données, aucun changement de schéma IndexedDB, aucune autre vue touchée.

## 4. Tests à faire (après implémentation)

- **Clavier seul** : `Tab` jusqu'à un élève → `Entrée` sur la zone = cycle ; `Tab` → « ⋯ » → `Entrée` ouvre le menu ; `Tab` circule **dans** le dialog (piège de focus) ; `Échap` ferme ; le focus revient sur « ⋯ ».
- **Tactile (preview + appareil réel)** : tap = cycle inchangé ; appui long ouvre toujours le menu ; « ⋯ » ouvre le menu ; chrono d'une classe de 28 toujours < 40 s (non-régression du critère phase 4).
- **Lecteur d'écran** : le dialog s'annonce, le statut courant est perceptible (libellé, pas seulement la couleur).
- **Pré-remplissage inaptes 🩺 et pastille ⚠** : toujours présents et corrects.
- **Régressions** : minutes de retard, commentaire, « Terminer l'appel », compteurs, bilan — inchangés. Console propre.
- Re-passer la **check-list a11y** et **Lighthouse** (cible : rester à 100 en accessibilité).

## 5. Outils utilisés

Lecture/édition de fichiers, preview locale (`preview_start` config `carnet-eps`, `preview_snapshot`/`preview_eval` — `preview_screenshot` time out sur ce poste), audit a11y (axe-core / skill `qualite-frontend`), Lighthouse local. **Aucune dépendance ajoutée.**

## 6. Confirmation gratuité

**Oui — 100 % gratuit, zéro dépendance.** L'élément `<dialog>` et `showModal()` sont des API natives du navigateur (aucune lib). Conforme BIBLE règle 1. Aucune donnée ne quitte l'appareil (règle 4 intacte).

## 7. Risques éventuels

- **Support `<dialog>`** : pleinement supporté par les cibles du brief (Chrome/Edge PC, Chrome Android, depuis 2022). Hors cible (vieux navigateurs intégrés) : non concerné. Risque faible. *(Repli possible si besoin : `.feuille-fond` actuel + handler `keydown` Échap + focus manuel — plus de code, je ne le retiens pas par défaut.)*
- **Densité de la carte élève** : le bouton « ⋯ » et le badge déplacé peuvent serrer la grille à 28 élèves sur petit écran → à valider en preview (point 2b).
- **Double cible tactile** : risque qu'un tap destiné au cycle tombe sur « ⋯ ». Atténué en dimensionnant « ⋯ » à 44 px **sans déborder** sur la grande zone, et en gardant le cycle sur toute la surface restante.
- **Non-régression chrono** : à re-mesurer (critère officiel phase 4).

## Suite (hors périmètre de cet avis)

- Le même helper `ouvrirFeuille()`/`<dialog>` pourra fiabiliser la **visionneuse** de [app/js/media.js:61](app/js/media.js#L61) (même pattern `.feuille-fond`) — petit lot séparé.
- Restent les P2/P3 de l'audit : contrastes vert/orange, retour d'appui long (vibration/animation + `prefers-reduced-motion`), écran « Aide » in-app.
