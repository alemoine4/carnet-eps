# Fiche de test terrain — Carnet EPS (v0.12.17 — deuxième passage, ~10 min)

> Deuxième passage sur ton téléphone Android, après la mise à jour en v0.12.17. Les **trois constats de la première séance sont corrigés** (§ 0, à reverifier en priorité) ; le reste est à finir de dérouler. Coche au fur et à mesure, note ce qui coince.
> App : **https://alemoine4.github.io/carnet-eps/** · Guide détaillé : Plus → Aide.
> Reporte les ❌ ici ou dis-les-moi : je corrige.
> **Marqueurs de séance (v0.14.2)** : section à part, en fin de fiche — l'essai de terrain prévu entre v0.14.2 et v0.14.3, sur la nouvelle adresse.

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

---

## Marqueurs de séance (v0.14.2) — essai de terrain avant la v0.14.3 (~15 min)

> Le contrat des marqueurs (`docs/avis/AVIS_FORMAT_MARQUEURS.md`, §13) attend cet essai **entre la v0.14.2 et la v0.14.3** : c'est le
> seul moment où le mode tampon (armer un marqueur, puis taper les élèves) peut encore être reporté sans rien défaire. Ce qu'aucun
> test automatique ne prouve se juge ici : la **perception** des repères au gymnase, à bout de bras, et le papier réel.
> App : **https://carnet-eps.github.io/** — Plus → Réglages → **Version : v0.14.2**. Une classe **fictive** suffit (élèves inventés,
> « NOM01 Prénom1 »…) : aucun vrai nom n'est nécessaire, et rien ne quitte le téléphone.

### A. Préparer (~2 min)

- [ ] Plus → Marqueurs de séance → « Créer les 6 marqueurs proposés » (ou garder les tiens) : au moins un rôle (ARB), deux équipes (E1, E2) et un comportement (REC)
- [ ] Ouvrir l'appel d'une séance du jour de la classe fictive : chaque carte a une ligne de plus, vide, et **toutes** les cartes gardent la même hauteur

### B. Poser et retirer par « ⋯ » (~3 min)

- [ ] Faire l'appel comme d'habitude (quelques absents), puis « Terminer l'appel »
- [ ] « ⋯ » sur un élève → les groupes « Rôles », « Équipes », « Comportements » sont entre « Minutes de retard » et le commentaire ; toucher « Arbitre » : le bouton paraît enfoncé (contour, fond teinté), la feuille reste ouverte, le statut ne change pas ; poser puis retirer d'autres marqueurs de la même feuille : **aucun bouton ne bouge** d'un tap à l'autre (même avec le texte agrandi)
- [ ] Retoucher « Arbitre » : retiré. Poser **deux** équipes au même élève : les deux restent (cumul libre)
- [ ] Fermer la feuille : la carte montre « ARB » (ou « E1 E2 ») ; poser « À recadrer » à un autre élève → un **point** neutre, sans code

### C. Refus « pas encore appelé », puis « Terminer l'appel » (~2 min)

- [ ] Nouvelle séance, **avant** tout appel : « ⋯ » sur un élève → les marqueurs sont atténués et en tirets, la feuille dit « Choisissez d’abord un statut : un marqueur ne fait pas l’appel. » ; toucher « Arbitre » → toast « Appel non fait pour … » **en haut de l'écran, au-dessus de la feuille ouverte** (il ne la recouvre pas, et toucher le fond sombre à côté du message ferme toujours la feuille), rien n'est posé
- [ ] Toucher « Retard » dans la même feuille : les marqueurs se déverrouillent, sans fermer la feuille
- [ ] Sur un autre élève non appelé : fermer la feuille, « Terminer l'appel », rouvrir « ⋯ » → le marqueur se pose

### D. Lisibilité au gymnase (~4 min) — le cœur de l'essai

- [ ] **À bout de bras, dans la lumière du gymnase**, luminosité habituelle : les codes (ARB, E1…) se lisent ? ☐ oui ☐ non · les points neutres des comportements se voient ? ☐ oui ☐ non · on sait sans hésiter qu'un tap a pris ? ☐ oui ☐ non
- [ ] Même question en thème **clair** puis **sombre** (Plus → Réglages) : ☐ clair ☐ sombre
- [ ] **Texte agrandi** (Chrome → Paramètres → Accessibilité, taille du texte au maximum), sur l'écran le plus étroit disponible : 🩺 et ⚠ ne recouvrent pas la ligne des marqueurs ; un élève avec deux codes et un comportement : le point reste entier et en tête ; si la place manque, ce qui ne tient pas disparaît **en entier** — le 2e code, puis le 1er — et « +n » le compte (« ● +2 ») : **aucun code n'est jamais coupé** (jamais « E1 » pour « E11 ») ; rien ne déborde de la carte ; une carte qui ne montre plus que « ● +2 » vous suffit-elle au gymnase ? ☐ oui ☐ non ; dans la feuille « ⋯ », **« Fermer » reste visible en bas** sans faire défiler la feuille, avant et après une pose
- [ ] Une rafale : poser un rôle à cinq élèves de suite par « ⋯ » : la grille ne saute pas, l'écran ne défile pas sous le doigt

### E. Hors ligne (~2 min)

- [ ] Mode avion → rouvrir l'app → ouvrir l'appel → poser puis retirer un marqueur : tout fonctionne ; mode avion coupé → les marqueurs sont toujours là
- [ ] Si une ligne « Non enregistré : … » apparaît un jour dans la barre du bas : noter son texte exact (c'est un échec d'écriture ; elle reste visible jusqu'à ce que le geste soit refait avec succès)

### F. Impression de la feuille d'appel (~2 min)

- [ ] Appel avec des marqueurs posés → imprimer (ou aperçu PDF) : les codes et les points **n'apparaissent pas** sur le papier (décision 8 : aucune sortie), les noms et les statuts si ; 🩺 et ⚠ restent sur la ligne du statut, **jamais sur la fin d'un nom** (surtout les noms longs) ; le récapitulatif n'a aucune colonne « Marqueurs »

### Ce qu'on note

- Distance à laquelle un code se lit : ______ · un point neutre : ______
- Le geste « ⋯ » puis marqueur suffit-il pour une classe entière, ou le **mode tampon** (v0.14.3) est-il indispensable ? ☐ indispensable ☐ utile ☐ inutile
- Textes à reformuler (feuille, toasts, barre ; liste des textes nouveaux : contrat, §16, « v0.14.2 ») : ________________
- Bloquants : ________________________________________________
