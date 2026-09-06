# Fiche de test terrain — Carnet EPS (v0.12.7 — points introduits en v0.12.4)

> À imprimer (ou garder sur un 2e écran). ~15 min. Coche au fur et à mesure, note ce qui coince.
> App en ligne : **https://alemoine4.github.io/carnet-eps/** · Guide détaillé : Plus → Aide.
> Reporte les ❌ ici ou dis-les-moi : je corrige.

---

## 1. Installation PWA (~3 min)

**Android (Chrome)**
- [ ] Ouvrir l'URL → bannière « Installer » (sinon menu ⋮ → « Installer l'application »)
- [ ] L'icône **EPS** apparaît sur l'écran d'accueil
- [ ] L'app s'ouvre en plein écran (sans barre d'adresse)
- [ ] Plus → Réglages → protection contre l'effacement **active ✓**
- [ ] Réglages → **Version : v0.12.7** (sinon : Réglages → Vérifier les mises à jour, puis « Recharger »)
- [ ] Réglages → **Trimestres** : les fins de T1/T2 sont modifiables ; fiche d'un élève : tableau T1 · T2 · T3 · Année (v0.12.6)

**PC (Chrome/Edge)**
- [ ] Icône « Installer » dans la barre d'adresse → app dans sa fenêtre

Résultat / notes : ________________________________________________

## 2. Appel d'une classe de 28 — chrono < 40 s ⏱ (critère officiel)

- [ ] Créer (ou importer) une classe de ~28, une séquence, ouvrir l'appel du jour
- [ ] La grille affiche **2 colonnes** sur ton téléphone (v0.12.4 : corrigé pour les écrans de 360 px)
- [ ] **Chrono en main**, faire l'appel réel : tap = présent→absent→tenue ; ⋯ ou appui long = autres statuts
- [ ] Faire défiler la grille le doigt posé : **aucun menu** ne doit s'ouvrir tout seul (v0.12.4)
- [ ] Finir avec **« Terminer l'appel »** (le reste = présents)

⏱ Temps mesuré : **______ s**  (cible : < 40 s) — tenu ? ☐ oui ☐ non
À une main, au pouce, debout ? ☐ oui ☐ non
Gêne éventuelle : ________________________________________________

## 3. Pronote réel (~5 min) — le critère qui valide la passerelle

**Import élèves**
- [ ] Pronote : copier la liste d'une vraie classe (ou export CSV)
- [ ] App : Élèves → Importer depuis Pronote → coller → Analyser → vérifier colonnes → Importer
- [ ] Effectif complet, **accents corrects**, doublons ignorés si on relance

**Export notes**
- [ ] Saisir quelques notes (Notes → une évaluation → grille)
- [ ] « Copier pour Pronote » → dans Pronote, cliquer la 1re case de la colonne → **coller**
- [ ] La colonne se cale bien (mêmes élèves, même ordre, même barème)

Résultat / notes : ________________________________________________

## 4. Caméra — certificat (~2 min)

- [ ] Suivi → Inaptitudes → Nouvelle → élève + dates + **pièce** → Android propose **Appareil photo / Fichiers / Galerie** (v0.12.4 : l'app n'impose plus la caméra, pour pouvoir joindre un PDF) → prendre la photo
- [ ] Photo nette et **lisible** dans la visionneuse (toucher la vignette ; Échap/clic pour fermer)
- [ ] À la date du cours, l'élève est signalé 🩺 à l'appel
- [ ] Fiche élève → **Ajouter une photo** → le choix appareil photo (arrière) / galerie est proposé

## 4 bis. Clavier virtuel (~1 min) — à noter, pas encore corrigé

- [ ] Fiche élève → **+ Observation** → taper du texte : le bouton **Enregistrer** reste-t-il atteignable clavier ouvert (sans le refermer) ? ☐ oui ☐ non
- [ ] Appel → ⋯ sur un élève → **Commentaire** : idem
  > Si « non » : ajouter `interactive-widget=resizes-content` à la balise viewport (`app/index.html`) — piste notée dans `docs/audit-2026-09-05.md` (B31).

Résultat / notes : ________________________________________________

## 5. Impression A4 (~2 min)

- [ ] Appel → Récapitulatifs → une classe → **Imprimer** : tableau lisible, rien de tronqué, nav/boutons masqués
- [ ] Notes → Relevé d'une classe → **Imprimer** : idem

Résultat / notes : ________________________________________________

## 6. Hors ligne (~1 min) — ne se teste qu'une fois installée

- [ ] Activer le **mode avion**
- [ ] Ouvrir l'app : elle se lance et fonctionne (appel, consultation, saisie)
- [ ] Désactiver le mode avion : tout est toujours là

Résultat / notes : ________________________________________________

---

## Bilan

- Tests OK : ______ / 7
- Bloquants rencontrés : ________________________________________________
- À améliorer : ________________________________________________

> Une fois rempli : reporte les cases dans `tests/checklist.md` (les 🔲 « appareil réel »), ou envoie-moi les ❌ et je corrige.
