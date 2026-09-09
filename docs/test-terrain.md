# Fiche de test terrain — Carnet EPS (v0.12.17 — deuxième passage, ~10 min)

> Deuxième passage sur ton téléphone Android, après la mise à jour en v0.12.17. Les **trois constats de la première séance sont corrigés** (§ 0, à reverifier en priorité) ; le reste est à finir de dérouler. Coche au fur et à mesure, note ce qui coince.
> App : **https://alemoine4.github.io/carnet-eps/** · Guide détaillé : Plus → Aide.
> Reporte les ❌ ici ou dis-les-moi : je corrige.

---

## 0. Ce que la v0.12.16 corrige — à reverifier en premier (~4 min)

Trois constats de ta première séance. Si l'un des trois recoince, tout le reste peut attendre.

- [ ] **« Terminer l'appel » toujours visible.** Ouvrir l'appel d'une classe de ~28 **sans rien faire défiler** : le bouton doit être là, en bas, au-dessus de la barre de navigation. Il y reste pendant qu'on déroule la grille.
- [ ] **Le tap n'est plus obligatoire.** La consigne au-dessus de la grille dit maintenant : tapez **seulement les absents**, puis « Terminer l'appel » ; les élèves non tapés passent présents. Le vérifier pour de vrai : taper 2 absents, terminer, contrôler que les 26 autres sont présents.
- [ ] **Import Pronote réel.** Onglet Élèves de Pronote → Export CSV → coller dans l'app → Analyser. La ligne « **Découpage de la colonne unique** » doit montrer le résultat sur deux élèves (« NOM Prénom » → nom …, prénom …) **avant** d'importer. Regarder les noms composés : un nom de famille en deux mots doit rester entier. Si un nom n'a **aucune majuscule** pour trancher (une particule, par exemple), l'app le met en tête de l'aperçu et le compte dans le bilan (« N noms découpés au jugé ») : ce sont ceux-là qu'il faut relire dans les fiches.
- [ ] **Classe absente du fichier.** Quand tu exportes **une seule classe**, Pronote laisse « Classe de rattachement » vide : l'app doit le dire (« la colonne Classe du fichier est vide ») et **ne rien choisir à ta place** — c'est « Créer la classe » qui est coché, à toi de taper le nom. Vérifie surtout à partir du **deuxième** import : rien ne doit atterrir dans la classe d'hier.

> À savoir, ce n'est pas un défaut : une inaptitude **partielle** ne met **pas** l'élève en « Inapte ». Elle le laisse « Présent » avec la pastille 🩺, parce qu'il pratique avec des restrictions. Seule une inaptitude **totale** fixe un statut d'office : « Inapte » sur certificat, « Dispensé (mot) » sur un mot des parents — et seulement sur la séance **du jour**.

---

## 1. Installation et mise à jour (~2 min)

- [ ] Ouvrir l'URL → « Installer » (sinon menu ⋮ → « Installer l'application ») ; l'icône **EPS** apparaît, l'app s'ouvre plein écran
- [ ] Plus → Réglages → **Version : v0.12.17** (sinon : Vérifier les mises à jour, puis « Recharger ») et protection contre l'effacement **active ✓**
- [ ] Réglages → **Trimestres** : saisir une fin de T2 **avant** la fin de T1 → refusée avec « ✗ » et un message (v0.12.9)
- [ ] Plus → **Aide** : la carte « Installer sur le téléphone · transférer » est claire sur ton téléphone (v0.12.15 — dis-moi si un mot ne colle pas à ce que tu vois dans Chrome)

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
- [ ] Fiche élève → **Ajouter une photo** → choix appareil photo (arrière) / galerie (bouton, v0.12.10) ; « Compression de la photo… » s'affiche pendant l'attente (v0.12.15)
- [ ] Élèves → la classe : l'élève sous inaptitude porte la pastille 🩺 dans la **liste** et dans la **grille de notes** (v0.12.15)
- [ ] Une inaptitude avec un **PDF** joint → « Ouvrir … » : le PDF s'ouvre dans un onglet, même sur un téléphone lent (v0.12.15 : l'adresse reste valable 60 s)

## 4. Clavier virtuel (~1 min) — correctif préventif v0.12.10 à confirmer

- [ ] Fiche élève → **+ Observation** → taper du texte : le bouton **Enregistrer** reste-t-il atteignable clavier ouvert (sans le refermer) ? ☐ oui ☐ non
- [ ] Appel → ⋯ sur un élève → **Commentaire** : idem ☐ oui ☐ non
  > Si « non » malgré la v0.12.10 : le dire, il reste une piste (hauteur des feuilles en `dvh`).

## 5. Pronote réel (~4 min) — le critère qui valide la passerelle

- [ ] Pronote, onglet **Élèves** → Export CSV → Élèves → Importer depuis Pronote → coller → Analyser → vérifier les colonnes et le **découpage affiché** → Importer : effectif complet, **accents corrects**, doublons ignorés si on relance
- [ ] Relancer le **même** import : « N doublons ignorés », aucun élève en double
- [ ] Saisir quelques notes → « Copier pour Pronote » → dans Pronote, 1re case de la colonne → **coller** : même ordre, même barème
  > En cas d'échec à l'analyse : m'envoyer **seulement** la ligne d'en-tête et une ligne avec des noms inventés.

## 6. Impression et hors ligne (~3 min)

- [ ] Appel → Récapitulatifs → une classe → **Imprimer** (ou aperçu PDF) : tableau lisible, colonnes complètes, pastilles en couleur, nav et boutons masqués (v0.12.10), **établissement et « édité le »** en tête (v0.12.15, si l’établissement est saisi dans Réglages)
- [ ] Mode avion → l'app s'ouvre **immédiatement** (v0.12.14 : plus d'attente du réseau au démarrage) et fonctionne (appel, consultation, saisie) ; mode avion coupé → tout est toujours là
- [ ] Si **Le Bar Clandestin** est installé sur le même appareil : après une mise à jour de Carnet EPS, l'ouvrir en mode avion → il se charge toujours (v0.12.8)

---

## Bilan

- Tests OK : ______ / 7
- Bloquants rencontrés : ________________________________________________
- À améliorer : ________________________________________________

> Une fois rempli : reporte les cases dans `tests/checklist.md` (les 🔲 « appareil réel »), ou envoie-moi les ❌ et je corrige.
