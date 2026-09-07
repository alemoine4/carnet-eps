# Fiche de test terrain — Carnet EPS (v0.12.11 — une seule session, ~15 min)

> À faire sur ton téléphone Android **une fois**, après la mise à jour en v0.12.11 (les points des v0.12.4 à v0.12.11 sont regroupés). Coche au fur et à mesure, note ce qui coince.
> App : **https://alemoine4.github.io/carnet-eps/** · Guide détaillé : Plus → Aide.
> Reporte les ❌ ici ou dis-les-moi : je corrige.

---

## 1. Installation et mise à jour (~2 min)

- [ ] Ouvrir l'URL → « Installer » (sinon menu ⋮ → « Installer l'application ») ; l'icône **EPS** apparaît, l'app s'ouvre plein écran
- [ ] Plus → Réglages → **Version : v0.12.11** (sinon : Vérifier les mises à jour, puis « Recharger ») et protection contre l'effacement **active ✓**
- [ ] Réglages → **Trimestres** : saisir une fin de T2 **avant** la fin de T1 → refusée avec « ✗ » et un message (v0.12.9)

## 2. Appel d'une classe de 28 — chrono < 40 s ⏱ (critère officiel)

- [ ] Créer (ou importer) une classe de ~28, une séquence, ouvrir l'appel du jour
- [ ] La grille affiche **2 colonnes** (v0.12.4 à 360 px, v0.12.10 dès 320 px)
- [ ] **Chrono en main**, faire l'appel réel : tap = présent→absent→tenue ; ⋯ ou appui long = autres statuts ; le statut courant est mis en évidence dans le menu (v0.12.10)
- [ ] Faire défiler la grille le doigt posé : **aucun menu** ne doit s'ouvrir tout seul
- [ ] Finir avec **« Terminer l'appel »** (le reste = présents)

⏱ Temps mesuré : **______ s**  (cible : < 40 s) — tenu ? ☐ oui ☐ non · À une main, au pouce, debout ? ☐ oui ☐ non
Gêne éventuelle : ________________________________________________

## 3. Inaptitudes et certificats (~3 min)

- [ ] Suivi → Inaptitudes → Nouvelle → élève + dates + **pièce** : Android propose **Appareil photo / Fichiers / Galerie** → prendre la photo ; photo nette et **lisible** dans la visionneuse (toucher la vignette)
- [ ] À la date du cours, l'élève est signalé 🩺 à l'appel : inaptitude **totale** sur certificat → « Inapte » d'office, **totale** sur un mot des parents → « Dispensé (mot) », **partielle** → reste « Présent » (pastille seule) ; « Terminer l'appel » respecte la même règle, même en rattrapant l'appel de la veille (v0.12.9)
- [ ] Fiche élève → **Ajouter une photo** → choix appareil photo (arrière) / galerie (bouton, v0.12.10)
- [ ] Une inaptitude avec un **PDF** joint → « Ouvrir … » : le PDF s'ouvre dans un onglet, même sur un téléphone lent (v0.12.11 : l'adresse reste valable 60 s)

## 4. Clavier virtuel (~1 min) — correctif préventif v0.12.10 à confirmer

- [ ] Fiche élève → **+ Observation** → taper du texte : le bouton **Enregistrer** reste-t-il atteignable clavier ouvert (sans le refermer) ? ☐ oui ☐ non
- [ ] Appel → ⋯ sur un élève → **Commentaire** : idem ☐ oui ☐ non
  > Si « non » malgré la v0.12.10 : le dire, il reste une piste (hauteur des feuilles en `dvh`).

## 5. Pronote réel (~4 min) — le critère qui valide la passerelle

- [ ] Pronote : copier la liste d'une vraie classe (ou export CSV) → Élèves → Importer depuis Pronote → coller → Analyser → vérifier les colonnes → Importer : effectif complet, **accents corrects**, doublons ignorés si on relance
- [ ] Saisir quelques notes → « Copier pour Pronote » → dans Pronote, 1re case de la colonne → **coller** : même ordre, même barème
  > En cas d'échec à l'analyse : m'envoyer **seulement** la ligne d'en-tête et une ligne avec des noms inventés.

## 6. Impression et hors ligne (~3 min)

- [ ] Appel → Récapitulatifs → une classe → **Imprimer** (ou aperçu PDF) : tableau lisible, colonnes complètes, pastilles en couleur, nav et boutons masqués (v0.12.10)
- [ ] Mode avion → l'app s'ouvre et fonctionne (appel, consultation, saisie) ; mode avion coupé → tout est toujours là
- [ ] Si **Le Bar Clandestin** est installé sur le même appareil : après une mise à jour de Carnet EPS, l'ouvrir en mode avion → il se charge toujours (v0.12.8)

---

## Bilan

- Tests OK : ______ / 6
- Bloquants rencontrés : ________________________________________________
- À améliorer : ________________________________________________

> Une fois rempli : reporte les cases dans `tests/checklist.md` (les 🔲 « appareil réel »), ou envoie-moi les ❌ et je corrige.
