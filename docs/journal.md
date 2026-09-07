# Journal de bord — Carnet EPS

Une entrée par session de travail, la plus récente **en haut**. C'est la mémoire fine du projet (le CHANGELOG ne garde que l'essentiel).

Modèle d'entrée :

```md
## AAAA-MM-JJ — titre court
**Fait** : …
**Décidé** : … (reporter dans decisions.md si structurant)
**Coincé / à vérifier** : …
**Prochaine étape** : …
```

---

## 2026-09-07 (30) — v0.12.9 : lot 1 du 5e audit (44 constats), 43 tests, revue adversariale (19 constats corrigés)

Demande : « fait au mieux » = GO discrétionnaire sur le plan du rapport, lot 1 d'abord.

**Fait** :
- **79 patchs** à ancrage exact (script `patcher.mjs` hors dépôt : refus si l'ancrage est absent ou ambigu, aucune écriture partielle) sur 17 fichiers `app/` + `.gitignore` ; `node --check` sur tous les modules ; suite existante rejouée d'abord (31/33 : B22 et B30 cassés par des changements voulus → libellé « et » rétabli, borne 1er août reportée dans le test).
- **Choix d'implémentation** notables : `depasseSeuil(cumul)` et `SEUIL_MEDECIN_JOURS` exportés de `metier.js` (fin des trois périmètres différents du seuil) ; `bornesTrimestres` retombe sur les défauts si T2 ≤ T1 ; `coursDuJour` exclut les classes archivées ; `inaptesMap` (la plus contraignante par élève) + `statutInapte()` partagés entre pré-remplissage, pastille et « Terminer » ; `mimeSur(f)` dans `media.js` ; `effacerPrefs()` dans `state.js` ; `CHAMPS_TEXTE` / `CHAMPS_ELEVE` dans `io.js` ; validations d'édition qui **lèvent** dans `onChange` → `brancherRetour` affiche ✗ + toast (une seule mécanique pour A16, V2-02, B42) ; « Annuler » qui lève → « Annulation impossible : … » (D-01 + D-03 avec la même mécanique).
- **Tests** : `tests/e2e/audit5-lot1.spec.mjs`, 43 tests = 13 reproductions du scratchpad inversées + 30 nouveaux (dont C10 avec une transaction IndexedDB maintenue ouverte par des lectures en chaîne puis abandonnée sur signal, A04 sur une instance neuve du module `io.js?instance-neuve`, purge de bout en bout avec téléchargement). **76/76**.
- Pièges rencontrés : `fill()` de Playwright n'émet `change` que sur les champs date (valeur posée directement) — sur number/text il tape, donc `dispatchEvent('change')` reste nécessaire, et l'inverse double l'événement ; `page.goto` sur une URL identique ne re-rend pas la vue (→ `reload()`) ; toasts empilés → `.last()`.
- **Revue adversariale du diff** : workflow 5 lentilles Opus (régressions, intégrité des données, règles métier, robustesse, qualité des preuves), chaque constat soumis à 2 réfutateurs (≈ 50 agents). Les lentilles ont lu les fichiers réels pendant que je corrigeais : beaucoup de réfutations « déjà corrigé » ; au total **19 constats confirmés et corrigés avant livraison** (P1 : le retour arrière de `definirStatut` restaurait `prec`, jamais confirmé en base → map `confirmes` ; P2 : minuterie du ✓ effaçant le ✗, valeur refusée laissée dans les champs date/nombre, notes des trimestres figées + ordre vérifié contre la voisine effective au lieu de la voisine enregistrée, ratio notes « n/effectif » global au lieu de par classe, départage arbitraire entre deux inaptitudes totales, minutes > 120 rejetées en silence, `lireLot` non aligné sur D-07, alerte A09 pour une classe archivée, moyenne de classe avec les partis et CSV sans mention ; P3 : chips de la fiche hors année, fuite d'URL blob (PDF / image illisible), `compterTout` sans catch, fin de trimestre en août acceptée ; lentille régressions : alertes non triées par gravité avant la troncature à 8 de l'accueil, seuil d'oublis encore émis pour une classe archivée, colonne ⚠ du récap sur la période sans le dire, comptage des pièces relancé à l'import) + **un test de la revue qui ne prouvait rien** (C10 « deux échecs d'affilée » passait aussi avec l'ancien code : échecs séquentiels) réécrit avec deux transactions concurrentes. Constat **tranché contre les relecteurs** (3 lentilles l'ont remonté, 4 réfutateurs l'ont écarté) : le pré-remplissage « dispensé (mot) » alimente le seuil D012 — c'est l'effet demandé par l'audit (C01) : trois séances non pratiquées sur un simple mot appellent un certificat ; consigné dans D013 avec la piste inverse (marquer les enregistrements posés d'office) si le terrain le juge gênant.

**Décidé** : D013 (pré-remplissage selon type et origine de l'inaptitude ; année scolaire des bornes au 1er août). Les constats sans test dynamique : D-07 (erreur de requête asynchrone non simulable de façon déterministe) et A03 (`git check-ignore` vérifié à la main).

**Coincé / à vérifier** : validations terrain (fiche `docs/test-terrain.md`), B31 ; `npx playwright install chromium` depuis le terminal de l'utilisateur.

**Déployé** : main `769528e` (+ `e27615b` docs), gh-pages `f6da580`, tag `v0.12.9`, site vérifié en 0.12.9.

**Prochaine étape** : lot 2 (créations atomiques) = avis à rédiger ; avis séparé A01 (origine dédiée) ; lots 3 à 5.

## 2026-09-07 (29) — 5e audit sur v0.12.8 : Codex V2 + 13 lentilles en 3 lots

Demande : « nouvel audit je pense », puis « il y a un audit Codex avant » (`audit codex/AUDIT_V2.md`).

**Fait** :
- **Codex V2** lu et rejoué : 33/33 sur Chrome, 6 défauts reproduits par tests (V2-01…06), 3 contrôles positifs (aller-retour 14 stores, SW hors ligne réel via `app.localhost`, import par l’interface). Ses 9 tests passent ici (9/9). Son premier lancement n’a pas trouvé le navigateur Playwright : **le binaire installé par Claude vit dans le cache MSIX virtualisé** (`Packages\Claude_…\LocalCache\Local\ms-playwright`), invisible d’un terminal normal — Codex a basculé sur `channel: 'chrome'`.
- **Workflow 13 lentilles** : refusé deux fois (limite de session, puis limite du modèle Fable pour les sous-agents), ≈ 1,6 M de tokens perdus. Relancé **par lots avec des sous-agents Opus** (script `audit5-lot`, paramètre `model`) : lot données (Fable, seul rescapé : 15 constats), lot A (revue des changements, logique, sécurité, PWA : 43), lot B (a11y, terrain, mobile, limites : 51), lot C (perf, qualité, tests, Pronote : 64). Chaque lot fusionné avec relecture des preuves ; 71 doublons écartés.
- **Rapport `docs/audit-2026-09-07.md`** généré depuis les JSON structurés (+ `docs/audit-2026-09-07.json` complet) : **179 constats** — 0 P0, **9 P1**, 86 P2, 84 P3. P1 : B02 (« Terminer » sur séance passée → inaptes « présents »), C01 (pré-remplissage inapte pour partielle/mot), A02 (créneau d’une classe archivée → `classeId: ''`), D-01 (« Annuler » muet), B04 (nouvelle inaptitude sur le mauvais élève), B01 (focus rogné), B03 (photo/certificat hors clavier), A01 (origine partagée), C02 (4 écrans lisent tout `appels`).
- **Reproductions** : spec temporaire (13 tests : A02, A05, A06, A07, A12, A16, A25, D-01, D-02, B01–B04) → 13/13, conservé dans le scratchpad de session (hors dépôt) pour devenir des tests de non-régression.
- Plan en 5 lots + décisions structurantes ; docs de suivi à jour. Aucune correction appliquée.

**Décidé** : pas de contre-vérification adversariale des 170 P2/P3 en bloc (≈ 5 M de tokens) — elle se fera lot par lot avant correction, par reproduction. Sous-agents : Opus dès que la limite Fable tombe.

**Coincé / à vérifier** : `npm test` côté utilisateur exige `npx playwright install chromium` depuis SON terminal (cache virtualisé). Dossier `audit codex/` hors git (ignoré).

**Prochaine étape** : GO sur le lot 1 (v0.12.9) ; avis pour le lot 2 et pour A01 (origine dédiée).

## 2026-09-06 (28) — Retour Codex : hypothèses H01–H05 vérifiées et corrigées (v0.12.8)

L’utilisateur a transmis la stratégie d’audit d’une autre IA (`audit codex/STRATEGIE_AUDIT.md`, dossier non suivi par git). Pas de constats dedans, mais 5 hypothèses précises et un signalement de dérive documentaire.

**Fait** :
- **Vérification indépendante** : workflow de 6 agents (un par hypothèse + un pour la doc), lecture seule, fichier:ligne à l’appui → **5/5 démontrées** : H03 durabilité (P2 : `attendre()` résolvait sur `req.onsuccess`, pas `tx.oncomplete` → quota plein = « ✓ » sans écriture), H05 caches (P2 : `activate` supprimait TOUS les caches de l’origine `alemoine4.github.io`, donc le precache Workbox du Bar Clandestin ; Workbox, lui, ne nettoie que ses `-precache-`), H01 purge non atomique (P3, oubliée dans B29), H02 export sans instantané (P3), H04 doublons d’id non détectés + stores absents vidés sans le dire (P3). Dérive doc confirmée (7 écarts : roadmap, TODO, CLAUDE.md, fiche terrain, README, rapport) → corrigée, commit `63cdc46`.
- **Avis `AVIS_DURABILITE_ECRITURES.md`** rédigé, validé (« GO »), appliqué : `io.js` (`enregistrer`/`supprimer`/`vider` via `ecrireLot` → résolution au commit ; `viderTout` ; `lireLot` readonly pour `exporterJSON`/`compterTout` ; `validerExport` refuse les doublons et renvoie `absents`), `sauvegarde.js` (purge protégée + bouton désactivé, confirmation « ne contient pas : observations → seront vidées »), `service-worker.js` (`k.startsWith('carnet-eps-')`). Bump → **0.12.8**.
- **Tests** : 5 nouveaux — H03 mutant réel (`IDBObjectStore.prototype.put` patché pour abandonner la transaction après le succès de requête : avant correctif ça résolvait), H01 (une seule transaction de 14 stores, comptée via `IDBDatabase.prototype.transaction`), H02 (écriture lancée juste après l’export absente du dump), H04 (doublon refusé, `absents` contient `observations`), **H05 = premier test réel du service-worker** : navigation sur `http://app.localhost:8160` (Chromium résout `*.localhost` en boucle locale, contexte sécurisé, mais `estLocalhost()` faux → le SW s’enregistre), caches voisins créés avant, vérification après activation. Suite **33/33**.
- Docs : `modele-donnees.md` (durabilité, instantané, purge, import strict), CHANGELOG, TODO, README, README des tests, fiche terrain (Bar Clandestin hors ligne après mise à jour), avis (statut appliqué). Mémoire du projet whisky annotée (interférence d’origine).

**Décidé** : rien de structurant au-delà de l’avis. Règle apprise pour les tests : `page.waitForFunction` ne doit pas recevoir de fonction asynchrone (la promesse est prise pour un « vrai » immédiat) → `expect.poll`. Un `.csv` en page de préparation déclenche un téléchargement : utiliser une feuille CSS.

**Coincé / à vérifier** : rien. Le dossier `audit codex/` reste hors git, à la main de l’utilisateur.

**Prochaine étape** : déployer v0.12.8 ; validations terrain (fiche v0.12.7) ; B31 (Android).

## 2026-09-06 (27) — Cascades et annulations atomiques (avis B29 → v0.12.7)

Avis `AVIS_CASCADES_ATOMIQUES.md` rédigé sur demande, validé « go pour les deux phases », appliqué dans une seule version.

**Fait** :
- `io.js` : helper interne `ecrireLot(operations)` = UNE transaction `readwrite` sur les stores concernés, requêtes émises d’un bloc (put / delete / clear), `tx.abort()` sur exception synchrone, store inconnu refusé avant ouverture. `supprimerLot(objets)` (nouvel export) et `restaurer(objets)` construits dessus ; les 3 cascades collectent (lectures par index, `collecterSeance` interne) puis suppriment en un lot — signatures et retours `{ store: [records] }` inchangés ; `importerJSON` = une transaction sur les 14 stores (clear + puts).
- Phase 2 : `notes.js` (évaluation + notes), `inaptitudes.js` (inaptitude + certificat + pièce), `documents.js` (document + pièce) et leurs annulations passent par `supprimerLot` / `restaurer` ; imports inutiles retirés.
- Tests : 3 tests B29 (restauration atomique sur enregistrement sans clé, suppression atomique sur store inconnu / clé absente, import laissant tous les stores intacts sur une valeur non clonable) → suite **28/28** sans modification des tests existants.
- **Mesure** (spec temporaire, séquence 10 séances × 28 appels + 3 évals × 28 notes = 380 enregistrements) : suppression **76 → 27 ms**, restauration **74 → 15 ms**.
- Docs : avis (statut appliqué), `modele-donnees.md` (règle d’atomicité), `architecture.md` (couche données), CHANGELOG, TODO, README, README des tests. Bump → **0.12.7**.

**Décidé** : rien de nouveau (l’avis vaut décision). Règle de code désormais écrite : un module n’enchaîne plus des `supprimer()` / `enregistrer()` pour une opération logiquement unique.

**Coincé / à vérifier** : rien. Fenêtre lecture → écriture (autre onglet) documentée comme acceptable.

**Prochaine étape** : déployer v0.12.7 ; validations terrain (fiche v0.12.4) ; B31 (Android).

## 2026-09-06 (26) — Vision par trimestre (D012, B30 → v0.12.6)

Décision de l’utilisateur : « les oublis cumulatifs année mais aussi vision trimestre ».

**Fait** :
- `metier.js` : `anneeScolaireDe`, `decalerJours`, `trimestreDe`, `bornesTrimestres` (meta `finTrimestre1/2` retenues seulement dans la même année scolaire, sinon 15/12 et 15/03), `periodeTrimestre`, `compterStatutsParTrimestre` (jointure appels × séances : la date vit sur la séance). `collecterAlertes` garde le seuil annuel et ajoute « (T2 : n) ».
- `reglages.js` : carte « Trimestres » (2 dates). `eleves.js` : tableau T1/T2/T3/Année sur la fiche, signalement « sur l’année (T… : …) ». `appel.js` : périodes rapides T1/T2/T3/Année sur le récap (`aria-pressed`, réinitialisées si l’on touche aux dates), pastille ⚠ avec le détail du trimestre de la séance. Aide in-app + guide de rentrée (étape 2).
- Docs : `decisions.md` **D012**, `fonctionnalites.md` §4 (corrigé : « sur le trimestre » → cumul annuel + vision trimestre), `modele-donnees.md` (clés meta, dont `semaineAReference` qui n’était pas documentée).
- Tests : 4 tests B30 (bornes/réglage, fiche, récap, alerte), robustes au changement d’année scolaire (dates calculées depuis l’année en cours) — suite **25/25**.

**Décidé** : D012 (dans decisions.md). Année scolaire = août → juillet ; bornes d’une autre année scolaire ignorées (évite un réglage périmé après la purge de rentrée).

**Coincé / à vérifier** : rien.

**Prochaine étape** : déployer v0.12.6 ; validations terrain ; B29 (avis si retenu) ; B31 (Android).

## 2026-09-06 (25) — Déploiement v0.12.4 + dédoublonnage B27 (v0.12.5)

**Fait** :
- **v0.12.4 déployée** (détail dans l'entrée 24) : push `main`, gh-pages `0391552`, tag `v0.12.4` ; site public vérifié en 0.12.4 après le rebuild Pages.
- **B27** : avis `AVIS_DEDOUBLONNAGE_HELPERS.md` rédigé, validé (« continue oui »), appliqué : `metier.js` (+`trierEleves`, `trierClasses`, `normaliser`, `cleTexte`, `baremeDe`, `formatFR`, `jours` ; le `jours` local de `collecterAlertes` supprimé), `ui.js` (+`champ`), 7 modules allégés (`appel`, `documents`, `edt`, `eleves`, `inaptitudes`, `notes`, `sequences`), 2 arrondis inline de la fiche élève → `formatFR`. `docs/architecture.md` : règle « un module ne redéfinit jamais un helper de `metier.js`/`ui.js` ».
- Vérifié : `grep` des anciennes copies = 0 ; `npm test` **21/21 sans modification des tests**. Bump → **0.12.5**.

**Décidé** : rien de structurant (refactor pur). Piège relevé : les fichiers du dépôt contiennent les caractères combinants **littéraux** dans la regex de `normaliser` (`[̀-ͯ]`) malgré la note de juin sur les échappements — `metier.js` est écrit avec les échappements `\u0300-\u036f` explicites (posés par script : l’outil d’édition convertit lui-même les séquences `\u`).

**Coincé / à vérifier** : rien. Reliquats inchangés : B29 (AVIS séparé si retenu), B30 (décision), B31 (Android).

**Déployé** : v0.12.5 poussée le 2026-09-06 (commit `f7093fa`, gh-pages `77dda4a`, tag `v0.12.5`), `app/` ≡ gh-pages vérifié.

**Prochaine étape** : validations terrain (fiche v0.12.4) ; roadmap post-v1 (observation depuis l'appel, dashboard enrichi, évals EPS A1–A5).

## 2026-09-05 (24) — 4e audit (34 constats) + correctifs v0.12.4

Demande : « réfléchis à la meilleure stratégie pour auditer et améliorer, puis effectue le tout ».

**Stratégie retenue** : référence factuelle d'abord (tests, versions, synchronisation git), puis audit à 12 lentilles (logique métier, sécurité/RGPD, PWA/SW, WCAG 2.2, terrain prof d'EPS, intégrité des données, performance, qualité/dérive documentaire, tests, Pronote, responsive, cas limites), les 16 constats de juillet exclus ; chaque hypothèse **vérifiée par mesure** (Playwright, calcul WCAG en Node) avant d'être retenue ; corrections non structurantes appliquées avec un test de non-régression chacune, structurantes reportées.

**Fait** :
- Le workflow multi-agents prévu (12 lentilles + réfutateurs) a été refusé par la limite de session : l'audit a été mené **en solo** avec la même grille, lecture intégrale des 24 fichiers de `app/` (5 500 lignes). Rapport : **`docs/audit-2026-09-05.md`** — 34 constats (2 P1, 11 P2, 21 P3), **30 traités**, 4 reportés.
- 7 hypothèses testées par un spec Playwright temporaire (supprimé) : 6 confirmées, 1 réfutée (le défilement revient bien en haut après navigation).
- **P1** : grille d'appel à **1 colonne sur 360 px** (`minmax` 160 → 150 px) ; import JSON altéré qui **vidait un store** (DataError synchrone → `clear()` validé) → validation de chaque enregistrement avant toute écriture + `tx.abort()`.
- **P2** : `pointercancel` (défilement ouvrait le menu), double tap perdu (état mis à jour avant l'écriture), double clic « Créer la séance » (accueil + sélecteur), compteur « saisis » sur les élèves actuels, rouge d'alerte thématisé (3,3:1 → 5:1 en sombre), badges gris 4,2 → 5,7:1, vignette du certificat dans un bouton, **élève « parti »** (champ `actif` enfin exposé : fiche, badge, effectifs), rollback documenté (DB_VERSION 2), SW ne cache plus les réponses non-OK, `capture` retiré des champs fichier (caméra frontale forcée, PDF inaccessible).
- **P3** : écran blanc → carte « Affichage impossible », repli `crypto.randomUUID` hors HTTPS, `onversionchange/onblocked`, `sauverPrefs` protégé, visionneuse re-typée par mime déclaré, fuites d'URL, message MAJ, période sur le récap imprimé, refus de supprimer une classe référencée, coef 0 honoré, classes en barrette sur l'accueil, `color-scheme`, `apple-touch-icon` PNG, CSS mort, pastille `hidden` réellement masquée (trouvée sur capture sombre), dérive doc (architecture, modèle, CLAUDE.md, pronote, guides, Aide in-app).
- Tests : **`tests/e2e/regressions.spec.mjs`** (13 tests, un par correctif) ; suite complète **21/21** (le navigateur Playwright 1223 a été réinstallé : `npx playwright install chromium`, la « régression » du 30/08 était bien l'environnement). Captures clair 360 px / sombre 375 px contrôlées visuellement.
- Bump `VERSION` (SW) + `VERSION_APP` → **0.12.4**. Sauvegardes dans `archives/2026-09-05/`.

**Décidé** : lot > 3 fichiers assumé sur instruction explicite (« effectue le tout »), chaque correctif restant local et testé ; refactor des doublons (`trierEleves` ×7, `champF` ×5…) **non appliqué** (règle des 3 fichiers → à planifier) ; `interactive-widget=resizes-content` **non appliqué** sans test Android (fiche terrain 4 bis).

**Coincé / à vérifier** : sur Android réel — sélecteur caméra/fichiers sans `capture`, grille 2 colonnes, clavier virtuel vs feuille (B31).

**Déploiement (2026-09-06)** : le premier `git push` a été refusé par le classificateur de sécurité du mode auto (rien exécuté) ; après le « continue oui » de l'utilisateur, push `main` (`59d99ae..857d292`, 4 commits dont le rangement du 30/08), `git subtree push` → gh-pages `0391552`, tag `v0.12.4` poussé. Vérifié : `app/` ≡ gh-pages (diff vide), `VERSION 0.12.4` dans le SW et `state.js` servis. Avis **B27** rédigé (`docs/avis/AVIS_DEDOUBLONNAGE_HELPERS.md`).

**Prochaine étape** : validations terrain (fiche `test-terrain.md` v0.12.4) ; trancher B30 (seuil ×3 par trimestre ?) ; B27 selon validation de l'avis (v0.12.5 dédiée).

## 2026-08-30 (23) — Rangement du dépôt et sortie du template générique

**Fait** :
- Recherche exhaustive préalable des références au chemin du projet : dépôt (md/js/mjs/json/html), `playwright.config.mjs`, `server-carnet.mjs`, workflows GitHub (**aucun** : pas de CI), `.vscode` (**aucun**), `~/.claude/settings*.json` (**aucune**), raccourci bureau « Carnet EPS.lnk » (→ pointe la **PWA en ligne**, `msedge_proxy --app-url=https://alemoine4.github.io/carnet-eps/`, donc indépendant du dossier local).
- `template/` → `30_APPLICATIONS/RESSOURCES_IA/template-projet` (copie vérifiée par MD5 avant retrait de l'original) ; ses propres références `DEV_APP` corrigées (README, CLAUDE.md).
- `AUDIT_DEV_APP_2026-07-10.md` → `docs/audit-2026-07-10.md` et `AVIS_EXPERT_STRATEGIE.md` → `docs/strategie.md` (copie + vérification `cmp` + `git add` **avant** suppression de l'original). Les 5 `AVIS_*.md` → `docs/avis/` en `git mv` (renommages détectés `R`, contenu à 0 ligne de diff).
- 19 corrections de chemins (`_TEMPO\DEV_APP`, `launch.json`) dans CHANGELOG, CLAUDE.md, README, TODO, architecture, decisions (D001/D007), roadmap, journal, checklist, `/cadrer`, skill architecte-refactor, deploiement.

**Décidé** : ne **pas** aplatir `CARNET EPS/carnet-eps` pour l'instant (demande explicite). L'analyse montre que l'aplatissement serait techniquement sans risque — aucun chemin absolu nulle part, `server-carnet.mjs` se localise via `import.meta.url`, Playwright et `git subtree push --prefix app` sont relatifs à la racine du dépôt — mais le gain est cosmétique et l'opération n'est pas urgente.

**Coincé / à vérifier** : les smoke-tests n'ont pas pu tourner — le binaire navigateur Playwright manque (`chromium_headless_shell-1223` absent de `~/AppData/Local/ms-playwright`). Dérive d'environnement, sans lien avec ce rangement ; à relancer après `npx playwright install`. Aucun fichier de `app/` n'ayant été touché, le risque de régression applicative est nul.

**Prochaine étape** : réinstaller le navigateur Playwright et repasser les 8 smoke-tests ; trancher l'aplatissement du double niveau.

## 2026-07-12 (22) — Finitions post-audit (v0.12.3)

Suite de la session d'audit : revue « tu vois autre chose ? » → 5 petits points, tous traités.

**Fait** :
- `ui.js` : l'éviction de la pile de toasts saute les toasts marqués `data-persistant` (durée Infinity) — micro-défaut de ma v0.12.2 : le toast de MAJ pouvait être évincé par 3 notifications et ne revenait pas (drapeau anti-doublon).
- `documents.js` : lien sans schéma auto-préfixé `https://` (le rejet de « www.site.fr » était une friction née du correctif A7).
- `README.md` : était resté à « v0.8.1, publication GitHub Pages à venir » — URL de l'app en tête, tableau des modules complété (Suivi + observations), « Ce que fait » au présent, `tests/` à jour, état v0.12.3.
- `docs/roadmap.md` : Observations (v0.12.0) et audit 2026-07-10 cochés, smoke-tests 7 → 8.
- `tests/e2e/smoke.spec.mjs` : date locale au lieu d'UTC (aligné sur `isoAujourdhui()` post-A4 — un `npm test` entre minuit et 2 h aurait échoué) ; `observations` ajouté aux stores purgés en `beforeEach`.

**Vérifié** : 2 tests Playwright dédiés (spec temporaire supprimé) — toast persistant épargné par l'éviction (le plus ancien fini part à sa place), « www.ffbad.org » enregistré en `https://www.ffbad.org` ; puis smoke-tests **8/8**.

**Prochaine étape** : roadmap post-v1 (observation depuis l'appel, dashboard enrichi, évals EPS A1–A5) + validations terrain avant la rentrée.

## 2026-07-10 (21) — Audit complet /audit-projet + corrections (v0.12.1)

**Fait** :
- **Audit 5 phases** du périmètre du dossier projet entier (cartographie → priorisation → plan chiffré) : rapport **`docs/audit-2026-07-10.md`**. Résultat : **0 constat critique**, 16 constats (A1–A16, dont 2 🟠). Vérifs en conditions réelles : console propre, 375 px sans débordement, sombre OK, dialogs accessibles, cibles ≥ 44 px, git = origin, gh-pages = v0.12.0, template sans dérive.
- **Corrections validées « GO » (A1→A11, A15, A16), livrées en v0.12.1** — backup préalable dans `archives/2026-07-10/` :
  - A1/A2 `sauvegarde.js` : `LIBELLES` complété (`observations`) + accord singulier/pluriel → le résumé avant import (destructif) est complet et correct.
  - A3 `media.js` + `eleves.js` + `inaptitudes.js` : `compresserImage` lève des erreurs claires (bitmap illisible, toBlob null) ; try/catch + message `statut-erreur` sur photo de fiche et remplacement de pièce (l'ancienne pièce n'est supprimée qu'après stockage réussi de la nouvelle).
  - A4 `metier.js` : `isoAujourdhui()` en **heure locale** (plus de bascule « hier » entre minuit et 1-2 h).
  - A5 : `sequences.js` importe `dateFR`/`isoAujourdhui` de metier.js ; `reglages.js` utilise le `champTexte` d'ui.js (doublons supprimés).
  - A6 `docs/modele-donnees.md` : `seances.numero` documenté comme figé/indicatif (les affichages recalculent par tri de date).
  - A7 `documents.js` : liens limités à `https?://` (à la saisie **et** à l'ouverture — défense contre une sauvegarde JSON tierce).
  - A8 : les 3 `alert()` restants → `toast` (import/purge : toast puis reload à 900 ms).
  - A9 `ui.js` : `afficherVue` remplace le nœud `#vue` à chaque navigation (clone) + jeton de génération → un rendu async obsolète écrit dans un nœud détaché, plus de mélange possible.
  - A10 `eleves.js` : contrôle de doublon au **renommage** de classe (toast + valeur rétablie).
  - A11 `edt.js` : chevauchement de créneaux détecté (jour + plages + compat A/B/AB) → enregistré quand même + toast ⚠ (2 classes en barrette restent possibles).
  - A15 `accueil.js` : ⚠ si plusieurs séquences actives se chevauchent pour la classe du moment (laquelle est utilisée + renvoi vers Séquences).
  - A16 `TODO.md` : sections périmées nettoyées (publication déjà faite, Playwright validé, phases 4→9 livrées).
- `.gitignore` : + `archives/` (backups locaux, pas dans le dépôt).

**Vérifié** : chaque correctif exercé en preview réel (résumé complet avec « 1 observation », photo piégée → « Photo non enregistrée : image illisible… », lien `javascript:` refusé, toast chevauchement EDT, ⚠ 2 séquences actives, renommage doublon bloqué, navigation rapide sans entrelacement, Réglages fonctionnels ✓) ; **smoke-tests 8/8 verts** ; console sans erreur.

**Décidé (2e partie de session, « fait le mieux ») → v0.12.2, décision D011** :
- **A12** : toasts empilés — `ui.js` crée un conteneur `.toasts` (fixe, colonne, max 3, le plus ancien évincé), `.toast` devient un bloc simple ; `duree: Infinity` = persistant ; `main.js` afficherToastMaj passe par `toast()` (garde anti-doublon par drapeau).
- **A13** : `notes.js` — « publiée » marquée seulement sur preuve : presse-papiers réussi, ou événement `copy` réel sur la zone de secours (`once: true`) ; le CSV ne marque plus (message explicite) ; bouton « Marquer remontée dans Pronote (manuel) / Annuler le marquage » (toggle, efface le récap au dé-marquage).
- **A14** : `appel.js` — pré-remplissage « inapte » conditionné à `seance.date === isoAujourdhui()` ; pastille 🩺 conservée sur les séances passées.

**Vérifié (v0.12.2)** : 3 tests Playwright dédiés écrits puis supprimés (`verif-v0122.spec.mjs`) — pile de 3 toasts avec éviction + persistant ; séance passée = 0 écriture + 🩺 visible, séance du jour = pré-remplie « I » ; CSV → `publieePronote` reste null, copie → marquée + presse-papiers exact (« 15 »), toggle manuel réversible. **3/3 puis smoke-tests 8/8.** ⚠ Le pilotage navigateur par extension (claude-in-chrome) a gelé sur `import()` dynamique en éval — vérifier via Playwright dans ce cas (même leçon que D010).

**Prochaine étape** : reprendre la roadmap post-v1 (observation depuis l'appel/séance du jour, dashboard enrichi, évals EPS A1–A5).

## 2026-06-15 (20) — Observations : socle + 1er lot (v0.12.0)

**Fait** (option du socle de `AVIS_OBSERVATIONS_MODELE.md` : modèle OK avec `ton`, migration additive sans auto-export forcé, 1er lot = socle + bouton + timeline) :
- `io.js` : `SCHEMA.observations` (index `eleveId`) + `DB_VERSION = 2` (migration additive : le `onupgradeneeded` crée les stores manquants → données préservées). Cascade élève + `restaurer` + `apercu` + `detail` incluent `observations`.
- `metier.js` : `TYPES_OBSERVATION`, `TONS_OBSERVATION`, `TAGS_OBSERVATION`, `MODELES_PHRASES`.
- `modules/observations.js` (nouveau) : `carteObservations(eleveId, rafraichir)` (timeline + « + Observation » + suppression avec toast undo) ; formulaire en `<dialog>` (type/ton/phrases/étiquettes). Ajouté au cache SW.
- `eleves.js` : carte observations sur la fiche.
- CSS `.obs-*` ; **badge de ton figé** (`#0f7a46`/`#a35f00`, AA blanc dans les 2 thèmes) — corrigé après avoir vu que `var(--c-ok)` vire au vert clair en sombre.
- Tests : +1 (ajout observation + fermeture feuille + cascade) → **8/8 verts**.

**Vérifié preview** : migration v1→v2 (db.version 2, 14 stores, données conservées) ; timeline + formulaire (phrase rapide, tag, enregistrement) ; badge `rgb(15,122,70)` même en sombre.

**Piège environnement (consigné)** : le navigateur **du preview** ne déclenche pas l'événement `close` d'un `<dialog>` sur `close()` programmatique → les feuilles « semblent » ne pas se fermer en preview. **Faux positif** : le vrai Chromium (Playwright) et Chrome le déclenchent (test 8 `toHaveCount(0)` vert, test 5 clique sous le modal). Ne pas se fier au preview pour la fermeture des `<dialog>`.

**Prochaine étape** : enrichir (observation depuis l'appel/la séance du jour), puis dashboard « Aujourd'hui » enrichi.

## 2026-06-15 (19) — Onglet « Suivi » (v0.11.0)

**Fait** (option A de `AVIS_SUIVI_NAVIGATION.md`, validée) :
- `metier.js` : `collecterAlertes()` (extraction de la logique d'alertes de `accueil.js`, sans changement de comportement).
- `accueil.js` : `carteAlertes` consomme `collecterAlertes()` ; imports `dateFR`/`SEUIL_ALERTE` retirés (déplacés dans metier).
- `index.html` : onglet EDT → **Suivi** (icône pouls Lucide).
- `main.js` : route `suivi` + vue inline (alertes complètes + lien Inaptitudes) ; `PARENT.edt='plus'`, `PARENT.inaptitudes='suivi'` ; `TITRES.suivi` ; carte EDT ajoutée au menu « Plus » (Inaptitudes retirée de Plus, fronté par Suivi).
- Tests : route `suivi` ajoutée au test 1 + nouveau test (Suivi rend les alertes ; EDT accessible via Plus). **7/7 verts.**

**Vérifié preview** : nav = Aujourd'hui/Appel/Élèves/Notes/Suivi/Plus ; accueil garde ses alertes (refactor OK) ; Suivi affiche les alertes + lien Inaptitudes ; sur `#/edt` l'onglet actif = Plus ; console propre. Pas de nouveau fichier → SW ASSETS inchangé.

**Prochaine étape** : observations (notes terrain) → **AVIS modèle de données d'abord** (nouveau store IndexedDB → migration).

## 2026-06-15 (18) — Smoke-tests Playwright (dev)

**Fait** : harnais de tests automatisés, validé par l'utilisateur (Playwright = dépendance **de dev** ; gratuité OK ; app `app/` toujours sans dépendance runtime ; non déployé).
- `package.json` (privé, type module, `@playwright/test`), `playwright.config.mjs` (webServer `node server-carnet.mjs` port 8160, `reuseExistingServer`), `tests/e2e/smoke.spec.mjs`, `tests/e2e/README.md`, `.gitignore` (node_modules, test-results, playwright-report).
- 6 tests : chargement+nav 12 routes, créer classe+persistance, import CSV, appel (tap+Terminer), **suppression+annulation** (undo restaure la cascade), round-trip export/import. **6/6 verts** (2,3 s).
- 2 ajustements de sélecteurs pendant l'écriture : `.statut-ok` ambigu → `getByText(/Appel complet/)` ; formulaire « Nouvelle classe » masqué → cliquer le bouton « + Nouvelle classe » d'abord.
- `npm install` + `npx playwright install chromium` exécutés (Chromium headless). **Aucun changement de l'app** (pas de bump, pas de déploiement).

**Prochaine étape** : onglet « Suivi » (sortir Inaptitudes de « Plus ») → **AVIS IA nav** d'abord ; puis observations (**AVIS modèle de données**).

## 2026-06-13 (17) — Annulation des suppressions, phase 2 (v0.10.1)

**Fait** : filet « Supprimé — Annuler » (8 s).
- `ui.js` : helper `toast(message, {action, libelleAction, duree})`.
- `io.js` : les 3 cascades renvoient `{store:[records]}` (avec blobs des fichiers lus avant suppression) au lieu de comptes ; nouveau `restaurer(objets)` (ré-`enregistrer`). `supprimerSequenceEnCascade` adapté à la nouvelle signature de `supprimerSeanceEnCascade`.
- 8 sites de suppression : capture des objets supprimés + `toast(..., { action: () => restaurer(...) })`. Pour les non-cascade (classe, créneau, doc, éval, inaptitude) la capture est inline (lire avant supprimer).

**Vérifié** (preview, après reload propre) : confirmer()→true, suppression élève effective + toast ; **Annuler restaure élève + appel + inaptitude + note** + retour fiche ; console propre.

**Piège de test rencontré** (consigné) : il faut **recharger la page** après édition (sinon code stale), **purger les `dialog`/`.toast` leftover**, et **utiliser une seule instance io** (`import('/js/io.js')` cachée = celle de l'app) pour seed+lecture, sinon résultats incohérents. Ce n'étaient pas des bugs app.

**Prochaine étape** : v0.10.2 smoke-tests (filet anti-régression) avant les gros lots ; puis onglet « Suivi » (AVIS IA nav).

## 2026-06-13 (16) — Suppressions sécurisées, phase 1 (v0.10.0)

**Contexte** : démarrage du chantier roadmap « sécurité des données » en tant qu'architecte, par versions courtes. Renumérotation : la « 0.9.9 sécurité » du plan utilisateur devient **0.10.0** (0.9.x déjà pris).

**Fait** (phase 1 de `AVIS_ANNULATION_SUPPRESSIONS.md`) :
- Helper `confirmer({titre,message,detail,action,danger})` dans `ui.js` : `<dialog>` natif, focus sur « Annuler », action rouge, Échap/clic-fond = Annuler, focus rendu au déclencheur. Retourne `Promise<boolean>`.
- io.js : `apercuSuppressionEleve`, `apercuSuppressionSequence`, `detailSuppression()` (impact cascade).
- Remplacement des **11 `confirm()` natifs** (eleves ×2, sequences ×2, documents, edt, notes, inaptitudes, sauvegarde ×4) par `await confirmer(...)`. Doubles confirms (élève/séquence) fusionnés en 1 boîte avec détail.
- CSS `.confirm-detail` + `dialog.feuille-confirm .rang-btn`.

**Vérifié** (preview, après avoir corrigé un faux positif de test dû à des dialogs leftover de mes evals) : mécanisme open/close/remove OK en isolation ; suppression élève bout-en-bout = dialog unique, élève + cascade (appels/inaptitudes) supprimés, redirection, dialog retiré ; console propre.

**Prochaine étape** : v0.10.1 — toast « Supprimé — Annuler » (restauration 8 s) ; puis v0.10.2 smoke-tests ; puis onglet « Suivi » (AVIS IA nav).

## 2026-06-13 (15) — Alignement audit : finitions (v0.9.9)

**Fait** (comble les écarts du prompt d'audit affiné, sans structurel) :
- Aide appel scindée : span `.aide-clavier` (raccourcis) en `@media (pointer: fine)` ; gestes tactiles toujours visibles (appel.js + components.css).
- Typo : en-tête 1,2→1,3rem (base.css), `.carte p` 0,9→0,95rem (components.css) ; titres de carte gardés à 1,1rem.
- Nav : 0,66→0,68rem ; testé 320px : 0 débordement, 0 troncature, libellés OK.
- CSP : +`font-src`/`worker-src`/`manifest-src` ; **`connect-src 'self' data:` conservé** ; `frame-ancestors` volontairement non ajouté (ignoré en meta).

**Décisions** (revue critique du prompt utilisateur) : refusé `connect-src 'self'` sans `data:` (aurait cassé l'import de pièces jointes) ; refusé `frame-ancestors` en meta (no-op) ; refusé le confirm bloquant sur « Terminer » (<40s) ; refusé `role="status"` (verbosité). Documenté dans CHANGELOG.

**Vérifié** : 320/360/desktop, clair/sombre, console propre, 0 violation CSP. Bump → 0.9.9, push main + gh-pages + tag.

**Prochaine étape** : sur validation, implémenter `AVIS_ANNULATION_SUPPRESSIONS.md` ; puis AVIS dédup design-system, IA nav, tests.

## 2026-06-13 (14) — Corrections d'audit : lot rapide (v0.9.8)

**Contexte** : audit multi-perspectives (UX/UI/ergo/a11y/dev/prof). Aucun P0. Lot de corrections rapides appliqué (le structurel — annulation des suppressions, dédup design-system, IA nav — fera l'objet d'AVIS).

**Fait** :
- `aria-live="polite"` sur `.compteurs` (appel.js).
- Nom de zone par écran : `TITRES` + `#vue.setAttribute('aria-label', …)` dans `main.js naviguer()` → annoncé au focus de `#vue`.
- Typo : en-tête 1,05→1,2rem (base.css), titre de carte 1→1,1rem (components.css), libellés nav 0,62→0,66rem.
- `prefers-reduced-motion` (neutralise transitions + scale) et `scroll-margin-bottom` sur focusables (base.css).
- « Terminer l'appel » : label dynamique « · N passé(s) en présent » via majCompteurs (pas de confirm bloquant → fast-path préservé).
- **CSP** `<meta>` dans index.html : `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; connect-src 'self' data:; object-src 'none'; base-uri 'self'; form-action 'none'`.

**Vérifié sous CSP** (preview) : styles inline (bordure statut), visionneuse blob, export CSV blob (238o), `fetch(data:)` + `fetch(self)`, aria-live/aria-label/label Terminer — **0 violation console**. Bump → 0.9.8, push main + gh-pages + tag.

**Prochaine étape** : AVIS pour le filet anti-suppression (P1) ; puis dédup design-system + IA nav.

## 2026-06-13 (13) — Liseré bleu au chargement (v0.9.7)

**Fait** : suppression de l'anneau de focus visible sur `#vue`. Cause : `afficherVue` fait `conteneur.focus()` à chaque vue ; au 1er chargement (sans interaction souris préalable) le navigateur applique `:focus-visible` → anneau bleu accent (3px) autour du contenu, qui disparaît au 1er clic. Le `.vue { outline:none }` était annulé par `:focus-visible` (même spécificité, défini après). Fix : `.vue:focus, .vue:focus-visible { outline:none }` (spécificité 0,2,0 > 0,1,0) dans base.css. Les boutons/liens/champs gardent leur focus visible. Bump → 0.9.7, push main + gh-pages + tag.

**Vérifié** : règle présente dans la feuille de style, `#vue` focalisé calcule `outline: none`.

**Prochaine étape** : terrain.

## 2026-06-13 (12) — Largeur d'écran PC (v0.9.6)

**Fait** : les vues appel / récap / relevé prennent toute la largeur sur PC (classe `vue-large` ajoutée par `vueAppel`/`vueRecap`/`vueReleve` ; `afficherVue` (ui.js) réinitialise `#vue.className='vue'` à chaque rendu ; règle `.vue.vue-large{max-width:none;margin-right:32px}` dans responsive.css). Grille d'appel passée en `repeat(auto-fill, minmax(160px,1fr))` → 2 col mobile, 7 col sur 1600 px. Formulaires/texte restent capés à 900 px. Bump → 0.9.6, push main + gh-pages.

**Vérifié** : appel 1360 px / 7 colonnes (28 élèves), récap 1345 px, Élèves capé 900 px, console propre. (Choix utilisateur : « élargir l'appel + les tableaux ».)

**Note environnement** : le serveur preview carnet-eps s'était arrêté et l'onglet avait basculé sur un autre projet (localhost:8081) → confusion IndexedDB ; résolu en redémarrant le serveur 8160 et en seedant via `import('/js/io.js')` (qui crée les stores correctement) plutôt qu'un `indexedDB.open` brut.

**Prochaine étape** : terrain.

## 2026-06-13 (11) — Libellé du bouton retour (v0.9.5)

**Fait** : « ← Plus » → « ← Retour » sur les 6 écrans enfants de l'onglet Plus (main.js + documents/inaptitudes/sequences/reglages/sauvegarde.js). Motif : « Plus » (menu) se lit mal comme cible de retour ; les retours nommant une section réelle sont gardés. Bump → 0.9.5, push main + gh-pages. Vérifié preview (les 6 affichent « ← Retour »).

**Prochaine étape** : terrain.

## 2026-06-13 (10) — Nettoyage écran « Plus » (v0.9.4)

**Fait** : retrait des badges « prêt » (3e argument de `carte()`) sur les 5 cartes de l'écran Plus (`main.js`) — vestiges de dev, plus de sens une fois tout livré, incohérents avec la carte Aide. Footer RGPD conservé. Bump SW + VERSION_APP → 0.9.4, push main + gh-pages. Vérifié preview (0 badge, footer intact).

**Prochaine étape** : terrain (`docs/test-terrain.md`).

## 2026-06-13 (9) — Finitions de confort de l'appel (v0.9.3)

**Fait** :
- **Pastille de statut** : fond retiré du JS (`appel.js` ne fait plus `badge.style.background`), piloté en CSS par `.btn-eleve[data-statut] .badge-statut { background: var(--stb-*) }` (mêmes variables thématisées que la bordure) ; texte de pastille passé à `var(--c-sur-accent)` (blanc en clair, encre en sombre). Résultat vérifié : clair = bg `#d03a3a`/texte blanc ; sombre = bg `#f06363`/texte `#0f1626` → la pastille ressort sur la carte sombre.
- **Raccourcis clavier PC** : `const RACCOURCIS_STATUT` (p/a/r/d/i/t/f) + `keydown` sur `.eleve-cycle` → une lettre fixe le statut de la carte focalisée. Hint mis à jour. Vérifié : a→absent, r→retard, f→infirmerie.
- Bump SW + VERSION_APP → 0.9.3, commit + push main + `git subtree push --prefix app origin gh-pages`.

**Décidé** : la pastille réutilise `--c-sur-accent` (déjà défini par thème) pour son texte → pas de nouveau token, lisibilité garantie dans les 2 thèmes. Raccourcis attachés au bouton cycle (cible de focus principale).

**Coincé / à vérifier** : rien côté code (l'audit UX et son confort sont clos). Restent les **validations terrain** (`docs/test-terrain.md`).

**Prochaine étape** : terrain.

## 2026-06-13 (8) — Campagne de tests + durcissement sécurité (v0.9.2)

**Fait** :
- **Campagne de tests** sur 14 scénarios (harnais preview ; Playwright MCP indisponible — profil Chrome verrouillé par instance concurrente, `--isolated` impossible). Verts : chargement (0 erreur), 12 routes, création classe (manuelle 2→3) + import, persistance reload (31 élèves), appel 28 (compteurs exacts + fast-path « Terminer » → 28/28), 7 statuts, import Pronote collé (3 + classe auto + accents), export CSV (en-tête FR + 28 lignes capturés), impression (window.print + 2 règles `@media print`), **19 ressources 100 % localhost / 0 externe**, **XSS CSV neutralisé** (payloads inertes via textContent), a11y clavier (focus → dialog), responsive 360 px (2 col, 0 débordement).
- **2 trouvailles sécurité corrigées** (avis `AVIS_SECURITE_IMPORT_EXPORT.md`) :
  - `importerJSON` faisait `fetch(donnees)` sans vérifier `data:` → un fichier piégé pouvait émettre une requête réseau (entorse offline/RGPD). Garde ajoutée : fetch seulement si `donnees` commence par `data:`. Testé (espion fetch) : URL http = 0 fetch / blob null ; dataURL = blob reconstruit.
  - Exports CSV non quotés + injection de formule Excel possible (nom `=…`). Helper `champCSV()` (RFC 4180 + préfixe `'`) câblé dans appel.js (récap) et notes.js (éval + relevé). Testé bout-en-bout : `=SUM(99)`→`'=SUM(99)`, `A;B`→`"A;B"`.

**Décidé** : « Copier pour Pronote » (presse-papiers) exclu de l'échappement CSV (colonne de nombres collée dans Pronote, pas Excel). Tests d'import JSON faits par import dynamique du module (`await import('/js/io.js')`) faute de file-upload dans le harnais preview.

**Coincé / à vérifier** : tests non automatisables (offline réel sur HTTPS, chrono < 40 s, caméra, rendu papier). UX restant = confort optionnel (pastille statut en sombre, raccourcis clavier PC).

**Déployé** : bump SW + `VERSION_APP` `0.9.0 → 0.9.2`, commit `871773f`, push `main` + `git subtree push --prefix app origin gh-pages`. Vérifié : `origin/gh-pages` contient bien `VERSION_APP 0.9.2`, SW `0.9.2`, `champCSV`. **Les correctifs UX + sécurité sont donc en ligne** (l'app publiée n'était plus à jour avant ce déploiement).

**Prochaine étape** : validations terrain depuis l'URL HTTPS ; correctifs de confort à la demande.

## 2026-06-13 (7) — Publication GitHub Pages + audit UX (P1 appel)

**Fait** :
- **Publication** : `gh repo create carnet-eps --public`, push `main`, `git subtree push --prefix app origin gh-pages`, Pages activé (état `building`), URL `https://alemoine4.github.io/carnet-eps/` reportée dans `docs/guide-installation.md`. Identité git locale configurée.
- **Audit UX** via skill impeccable (commande `critique`) : 31/40 « Bon », détecteur markup propre. Forces (appel, états vides, cohérence des helpers) ; P1 = statuts inaccessibles clavier/SR + feuille pas un vrai modal ; P2 = contrastes vert/orange + absence de retour d'appui long ; P3 = liseré « Plus » + pas d'aide in-app. → `AVIS_APPEL_ACCESSIBILITE.md`.
- **P1 corrigé** (avis validé) : helper `ouvrirFeuille()` `<dialog>` natif dans `ui.js` ; carte élève `appel.js` = `<div role=group>` + `.eleve-cycle` (tap-cycle + appui long) + `.eleve-menu` « ⋯ » (`aria-haspopup=dialog`) ; CSS `dialog.feuille`/`::backdrop` + `.eleve-cycle`/`.eleve-menu` (44 px).
- **P2 partiel** : texte de statut sans couleur (encre pleine) ; barre de progression + `navigator.vibrate(15)` pendant l'appui long (+ `prefers-reduced-motion`) ; vert `#178a52→#0f7a46`, orange `#c97a06→#a35f00` (STATUTS + `--c-ok`), variante verte sombre `--c-ok: #2fae6a` pour `.statut-ok`.
- **P3** : liseré des cartes « Plus » → bordure pleine + chevron `::after`. **Écran « Aide » in-app** : vue `'aide'` définie inline dans `main.js` (route ajoutée à ROUTES + `PARENT.aide='plus'` + lien dans « Plus ») — choix de l'inline pour **ne pas toucher au service-worker** (un nouveau fichier `modules/aide.js` aurait imposé une bump SW = changement structurant). Contenu = intro + 6 étapes de rentrée + jour J + réflexes (repris de `docs/guide-rentree.md`). CSS `.liste-aide`.
- **P2 (fin)** : bordures de statut sorties du JS (`appel.js` ne fait plus `style.borderColor`) → pilotées en CSS par `.btn-eleve[data-statut]` via variables `--stb-*` déclinées par thème dans `base.css`. Mesuré : les 7 bordures étaient toutes < 3:1 sur surface sombre (2,62–3,28) ; variantes claires sombres ajoutées (présent `#34c27a` 6,89:1, etc.). Vérifié dans les 2 thèmes (clair = saturé, sombre = clair).
- **Visionneuse** (`media.js`) : `div.feuille-fond` → `<dialog class="visionneuse">` natif (clic n'importe où ou Échap = fermer, fond inerte, focus rendu). `conteneur` gardé en paramètre (compat) mais inutilisé. CSS `dialog.visionneuse`/`::backdrop` ; `.feuille-fond` (devenu mort) supprimé. **Audit UX entièrement traité (P1+P2+P3 + visionneuse).**

**Décidé** : carte élève = groupe à 2 boutons (un bouton imbriqué dans un bouton = HTML invalide). Backdrop détecté par `e.target===dlg` et non par coordonnées (une activation clavier rapporte (0,0) et fermait la feuille par erreur — bug attrapé en test). `--c-attention` constaté **token mort**, `.badge-ok` inutilisé.

**Coincé / à vérifier** : reste du P2 (couleurs sémantiques par thème : bordure de statut + `.statut-ok` en sombre demandent des variantes dédiées — un assombrissement simple aide le clair mais dégrade le sombre, mesuré) ; P3 ; généraliser `<dialog>` à la visionneuse `media.js`. Validations terrain inchangées.

**Prochaine étape** : reste du P2 (retune par thème) ou P3 ; sinon installation PWA réelle depuis l'URL.

## 2026-06-12 (6) — Phase 9 : distribution préparée

**Fait** :
- Toast MAJ (main.js) : écoute `controllerchange` (le SW fait skipWaiting+claim) avec garde « première installation » ; bouton Recharger ; CSS `.toast` au-dessus de la nav. Boot vérifié sain en preview (toast absent sur localhost, console vide), v0.9.0.
- `docs/guide-installation.md` : Android (bannière/menu Chrome), PC (icône barre d'adresse), transfert JSON entre appareils, mises à jour, tableau de dépannage, « où sont mes données ».
- `docs/guide-rentree.md` : archive de l'année passée → purge → réglages → import Pronote → EDT (+ rappel parité A/B après vacances) → séquences → vérifications → jour J ; réflexes annuels.
- `.gitignore` + `git init -b main` + commit initial `04a4d7c` (55 fichiers, 6 630 lignes, identité git locale alemoine).

**Constat** : gh CLI 2.93 installé mais **non authentifié** → la création du dépôt GitHub est impossible sans `gh auth login` (geste utilisateur, navigateur). Publication scriptée prévue : `gh repo create carnet-eps --public --source . --push` puis `git subtree split --prefix app -b gh-pages` + push + activation Pages sur `gh-pages`, et URL reportée dans le guide d'installation.

**Coincé / à vérifier** : rien côté code. Attente : `gh auth login` + feu vert explicite « publie sur GitHub Pages ».

**Prochaine étape** : publication (à son signal), puis installations réelles PC/Android et validations terrain (checklist 🔲).

## 2026-06-12 (5) — Phase 8 : QA & durcissement

**Fait** :
- Durcissement repéré à la relecture AVANT les tests : `importerJSON` faisait une transaction par enregistrement → réécrit en lots (conversion des blobs d'abord, puis une transaction clear+puts par store). Mesuré ensuite : 1,9 s pour 10 668 enregistrements (l'ancien chemin aurait pris ~1 min).
- Volumétrie générée en preview (insertion brute par transactions groupées, 1,25 s) : 6 classes × 28 élèves, 3 séquences × 18 séances/classe, 9 072 appels réalistes (90 % présents), 36 évaluations / 1 008 notes, 12 photos JPEG, 4 inaptitudes (dont une finissant dans 4 j), 8 documents — 1,4 Mo IndexedDB.
- Chronos de rendu (navigation réelle par hash, attente du contenu) : accueil 49 ms (alertes scannant les 9 072 appels), écran d'appel 35 ms, récap année 35 ms, tout le reste 16-33 ms.
- Round-trip : export 57 ms (1,36 Mo avec pièces ; 1,20 Mo sans), purge, import 1,9 s, `compterTout` strictement identique, blob vérifié (taille).
- Erreurs : objet étranger, schéma futur, JSON tronqué → tous rejetés avec messages (l'écran Sauvegarde catch le parse).
- A11y : audit programmatique sur 21 écrans (inputs étiquetés, boutons nommés, img alt, lang, nav aria-label) → **0 problème** ; **Lighthouse 97/100/100** (npx lighthouse, outil gratuit du template).
- `tests/checklist.md` réécrite : tableau de résultats + ✅ vérifiés / 🔲 appareil réel. README actualisé. v0.8.1 (SW aussi).

**Décidé** : Lighthouse via `npx` ponctuel = conforme BIBLE (outil listé par le template, rien d'installé au projet).

**Coincé / à vérifier** : rien côté code. Les 🔲 de la checklist sont tous des gestes utilisateur (Android, Pronote, HTTPS, papier).

**Prochaine étape** : Phase 9 — publication GitHub Pages (sur accord), guides installation + rentrée, toast de mise à jour SW.

## 2026-06-12 (4) — Phase 7 : tableau de bord & documents

**Fait** :
- `modules/accueil.js` : la vue accueil quitte main.js — `carteMaintenant` déménagée d'edt.js (extraction par script Node sur marqueurs de sections, imports nettoyés), + `carteAlertes` (inaptitudes J-7 et venant de finir, seuils tenue/dispense via cumul des appels, évals notées non publiées hors AFL, max 8 affichées) + `carteReprendre` (prefs `derniereClasseId`/`derniereEvalId` écrites par eleves.js et notes.js via `sauverPrefs`).
- `modules/documents.js` : ajout (titre, 6 types, tags virgules, classes cochées, fichier compressé OU url), liste triée par date, recherche normalisée (accents), filtres classe/type, ouverture (visionneuse image / onglet PDF / lien `noopener`), suppression + cascade fichier. Pas d'édition en v1 (assumé).
- `ouvrirVisionneuse` mutualisée dans media.js (inaptitudes refactorée). main.js : plus aucun bouchon, `ouvrirDB()` anticipé au boot. SW 0.8.0.

**Vérifié en preview** : accueil avec scénario chargé → « En ce moment » (créneau actif) + 3 alertes exactes (« Boris BRAVO (6A) — inaptitude : fin dans 3 j » ⚠, « Carla CHARLIE (6A) — 3 oublis de tenue » ⚠, « Match test (6A) — pas encore remontée vers Pronote » ℹ) ; « Reprendre » apparaît après visite classe + éval ; documents : lien + image (1800×1200 PNG → JPEG 18 Ko), recherche « natation » → 1, filtre type → 1, visionneuse OK, suppression → fichier emporté ; console vide. Base remise à zéro.

**Décidé** : alertes plafonnées à 8 (+ compteur) ; documents sans édition en v1.

**Prochaine étape** : Phase 8 — QA & durcissement (checklist complète, volumétrie 6×28×1 an, erreurs quota/import corrompu, a11y, Lighthouse, revue RGPD).

## 2026-06-12 (3) — Phase 6 : notes & export Pronote 🎒 jalon rentrée atteint

**Fait** :
- `modules/notes.js` (~440 lignes) : 3 vues — liste/création (types note20/bareme/afl, coef, badge publiée), grille de saisie (ordre alpha, `parserValeur` tolérant « 12,5 »/« a »→ABS/« d »→DISP/« n »→NN, rejet > barème, Entrée→suivant, stats live), relevé par classe (moyenne /20 pondérée coef, codes/AFL exclus, moyenne classe, print + CSV).
- Export Pronote voie A : colonne `\r\n` avec lignes vides pour codes/non-notés (alignement Pronote préservé), récap garde-fou (effectif + barème) + liste des codes à saisir à la main, marquage `publieePronote`, **repli textarea** si `clipboard.writeText` échoue. Voie B : CSV.
- Fiche élève : section Notes (dernières + moyenne générale /20 pondérée).
- main.js : bouchon notes remplacé. SW 0.7.0.

**Vérifié en preview (6 élèves alpha)** : création via formulaire → grille ; saisies « 12,5 / abs / 15 / 25 / 8 / d » → 5 notes stockées (25 rejetée [INVALIDE]), codes normalisés, stats « 11,83/20 · min 8 · max 15 · 5/6 » ; copie Pronote → colonne `12,5··15··8·` (6 lignes alignées), codes « ligne 2 — BRAVO : ABS / ligne 6 — FOXTROT : DISP », publiée 12/06 ; **chemin de secours testé en forçant l'échec du presse-papiers** (textarea + récap coexistent — bug d'écrasement trouvé et corrigé pendant le test) ; relevé exact (codes affichés mais exclus des moyennes, classe 11,83/20) ; fiche ALPHA « 12,5/20 de moyenne générale » ; suppression cascade éval+notes ; console vide. Base vierge.

**Décidé** : type « afl » = texte libre non exporté vers Pronote (les services Pronote sont numériques) ; textarea normalise `\r\n`→`\n` (comportement DOM, sans impact sur le collage).

**Coincé / à vérifier** : LE test qui valide officiellement la phase = coller une colonne dans le Pronote du collège (ordre, décimales, codes) — checklist `docs/pronote.md`.

**Prochaine étape** : Phase 7 — documents + tableau de bord d'accueil (alertes agrégées).

## 2026-06-12 (2) — Phase 5 : inaptitudes & certificats

**Fait** :
- `js/media.js` : `compresserImage` (createImageBitmap → canvas max 1600 px → toBlob JPEG qualité 0.8→0.4 jusqu'à ≤ 300 Ko), `stockerFichier` (image compressée / PDF tel quel → store `fichiers`), `urlDuFichier`/`revoquerURL`, `supprimerFichier`.
- `modules/inaptitudes.js` (~360 lignes) : synthèse 4 sections + badges d'alerte (J-7 « fin dans X j », durée > 90 j « médecin scolaire »), formulaire création (cascade classe→élève, eleveId pré-ciblé depuis la fiche, restrictions masquées si totale, pièce jointe avec retour de compression), détail éditable (rafraîchi sur changement de dates pour les badges), visionneuse plein écran (img) / nouvel onglet (PDF), remplacement de pièce, suppression cascadée.
- Fiche élève : photo (label-bouton + input caché `capture="user"`, retrait possible, ancien fichier supprimé) ; section inaptitudes réelle.
- main.js : route `inaptitudes` (parent Plus), carte « prêt ». SW 0.6.0.

**Vérifié en preview (scénario « Tom » du brief)** : formulaire pré-ciblé sur DURAND Tom → restriction « appuis », fin +21 j, certificat PNG 2000×1400 (114 Ko) attaché par DataTransfer → **stocké 1600×1120 JPEG 34 Ko** ✓ ; détail avec vignette + badges ; J-7 (« fin dans 3 j ») et > 3 mois (« médecin scolaire ») en éditant les dates ; synthèse « En cours (1) » ; fiche : section (en cours · 📎) + photo affichée ; appel : Tom pré-rempli « Inapte (certificat) » 🩺 ; suppression → certificat + fichier emportés, **photo de Tom conservée** ; console vide. Base remise à zéro.

**Décidé** : pas de photos dans la grille d'appel pour l'instant (initiales = lisibilité + perf) — backlog ; certificats créés uniquement via une inaptitude (pas de bibliothèque de certificats orphelins en v1).

**Coincé / à vérifier** : capture caméra réelle (`capture="environment"`) et visionneuse à tester sur Android par Alexandre.

**Prochaine étape** : Phase 6 — évaluations & notes + export Pronote (la dernière brique du jalon rentrée).

## 2026-06-12 — Phase 4 : l'écran d'appel ⭐

**Fait** :
- `js/metier.js` nouveau : STATUTS (libellés, codes courts, couleurs, pratiquant oui/non), CYCLE_TAP (présent→absent→tenue), SEUIL_ALERTE (3), helpers dates + parité A/B + `coursDuJour` + `inaptitudesActives` — déplacés depuis edt.js pour respecter « pas d'import entre modules ».
- `modules/appel.js` (~420 lignes) : sélecteur (aujourd'hui via EDT, récentes, récaps), écran d'appel (grille tactile, tap-cycle, appui long 450 ms / contextmenu → feuille de statuts avec minutes + commentaire, enregistrement immédiat id déterministe `seanceId_eleveId`, pré-remplissage inaptes, compteurs, « Terminer », bilan), récap classe (tableau filtrable, impression, CSV BOM).
- Fiche élève : historique réel (chips colorées par statut, ⚠ signalement, 8 derniers). `edt.js` : carteMaintenant → « Faire l'appel » ; créer la séance navigue droit sur l'appel. CSS : grille appel, feuille bas d'écran, règles d'impression. SW 0.5.0.

**Vérifié en preview** (scénario 10 élèves, inaptitude active e3, 3 tenues historiques e5) : sélecteur 3 cartes, « Créer la séance + appel » → écran d'appel ; e3 pré-rempli inapte (🩺, compteur 9 pratiquants) ; e5 ⚠ « tenue ×3 » ; cycle e1 absent→tenue→présent avec compteurs exacts à chaque tap ; menu contextmenu e2 → retard 10 min persisté ; « Terminer » → 10/10 ✓ ; bilan enregistré ; fiche e5 (chips Présent ×1 / Tenue ×3 + signalement + 4 lignes d'historique) ; récap exact (E1 P=1, E3 I=1, E5 T=3 + ⚠, « 4 séances ») ; console vide. Base remise à zéro.

**Décidé** : tap n'écrase jamais un statut « menu » (inapte/dispensé/retard/infirmerie → le tap rouvre le menu) ; les récaps ne comptent que les appels enregistrés (d'où l'importance de « Terminer l'appel », rappelé dans l'UI).

**Coincé / à vérifier** : le chrono < 40 s pour 28 élèves se mesure sur téléphone réel (geste au pouce) — seul Alexandre peut le faire ; impression du récap à voir sur papier réel.

**Prochaine étape** : Phase 5 — inaptitudes & certificats (CRUD, photo compressée, alertes J-7 et > 3 mois, scénario « Tom » complet).

## 2026-06-11 (4) — Phase 3 : EDT, séquences, « en ce moment »

**Fait** :
- `modules/edt.js` : helpers exportés (`lundiDe`, `semaineCourante` — parité depuis le lundi de référence meta `semaineAReference`, `coursDuJour` — filtre jour + parité), vue EDT (carte alternance avec saisie du lundi A, formulaire créneau ajout/édition/suppression, liste par jour, grille PC), et `carteMaintenant()` consommée par l'accueil (cours en cours ou à venir, séquence active, création séance du jour en un tap, cours suivants).
- `modules/sequences.js` : liste (actives d'abord), création (datalist 23 APSA, CA1-4, dates, nb séances), détail éditable (objectifs/AFL en zone texte), séances numérotées dynamiquement par ordre de date (champ `numero` stocké à titre indicatif), doublon de date refusé, suppressions cascadées.
- `io.js` : cascades séance/séquence. `main.js` : accueil réel (carteMaintenant + carte alertes v0.4.0), routes `sequences` (parent Plus), bouchons edt/accueil remplacés. SW 0.4.0.

**Vérifié en preview** : scénario monté à 19h29 (créneau 19:29–20:59 jour courant, séquence Badminton active, réf. semaine A = lundi courant) → accueil « En ce moment · semaine A · 6A · Gymnase · Badminton — prochaine séance : 1/10 », tap → séance créée (date jour, n°1, edtId lié) ; parité A→B→A en décalant la référence ; créneau « semaine B » exclu de `coursDuJour` en semaine A ; formulaire EDT : heures invalides refusées, créneau mardi créé via l'UI (sections Mardi + Jeudi-aujourd'hui) ; séquences : carte liste « en cours · CA4 · 1/10 séances », ajout séance demain avec thème, doublon refusé, cascade séance (1 appel) et séquence (1 séance + 1 éval + 1 note) → tout à zéro ; console vide. Base laissée vierge.

**Décidé** : alternance A/B = parité calendaire pure (les vacances ne décalent pas) — limite v1 assumée, à confronter à l'EDT réel ; bilan de séance saisi depuis l'écran d'appel (phase 4) ; annulation ponctuelle de créneau reportée (backlog).

**Coincé / à vérifier** : rien de bloquant. Reliquats utilisateur inchangés (Android, GitHub Pages, export Pronote réel).

**Prochaine étape** : Phase 4 — l'écran d'appel (le cœur) : grille tactile, 7 statuts, compteurs, historique fiche élève, bilan de séance. Objectif < 40 s pour 28 élèves.

## 2026-06-11 (3) — Phase 2 : classes & élèves + import Pronote

**Fait** :
- `ui.js` : vues paramétrées (`afficherVue(id, params)` — sous-routes type `#/eleves/fiche/<id>`) + helpers de formulaire mutualisés (`champTexte`, `champSelect`, `champZone`, sauvegarde sur `change` avec retour « ✓ »).
- `io.js` : `parserCSV` (séparateur auto `;`/tab/`,`, guillemets, BOM), `decoderTexte`/`lireTexteCSV` (UTF-8 → repli Windows-1252 si « � »), `supprimerEleveEnCascade` (appels, inaptitudes, certificats + fichiers, notes, photo).
- `modules/eleves.js` (~450 lignes) : 4 vues — liste classes (création, archivées/restauration), classe (édition directe, ajout rapide, recherche, tri fr), fiche élève (identité complète + placeholders phases 4/5/6 + suppression cascade double-confirmée), import Pronote en 4 étapes (source collage/fichier/exemple → mapping auto-détecté modifiable → destination colonne/existante/nouvelle → résultat détaillé).
- `main.js` : router à segments, bouchon « eleves » supprimé, modules initialisés après les bouchons (ordre d'écrasement).
- SW 0.3.0 (+ `eleves.js`, + jeu d'essai CSV précaché) ; styles listes/avatars/table d'aperçu.

**Vérifié en preview (port 8160)** : parcours complet via l'UI réelle — exemple chargé, analyse (« 10 lignes, séparateur ; »), mapping auto 5/5 colonnes, import « 10 élèves importés dans 6A (1 classe créée) », ré-import « 0 importé · 10 doublons ignorés », tri alpha (BERTHE → ROUSSEAU), recherche « mar » → 2 homonymes, accents intacts (LÉVÊQUE, NUÑEZ, N'GUYEN), date 12/03/2014 → 2014-03-12, édition fiche persistée, cascade emporte l'appel factice, `decoderTexte` rend « Léa » depuis des octets 1252, console propre. Base remise à zéro après tests.

**Décidé** : rien de structurant (pas de nouvelle entrée decisions.md). Détail notable : l'émission de séquences `\u` dans le code a dû passer par un patch Node (quirk d'écriture), regex désormais en échappements explicites.

**Coincé / à vérifier** :
- Le serveur preview s'est encore arrêté entre deux sessions de vérification (2e fois) — toujours sans dégât, relance simple ; à surveiller, suspecter le cycle de vie des outils preview plutôt que le serveur lui-même.
- Critère de sortie phase 2 « officiel » = import d'un **vrai** export Pronote du collège (encodage et en-têtes réels) — seul Alexandre peut le faire, checklist dans `docs/pronote.md`.

**Prochaine étape** : Phase 3 — EDT (créneaux A/B, installations, « cours en ce moment ») + séquences/séances. Penser au réglage « semaine A de référence » dans Réglages.

## 2026-06-11 (2) — Phase 1 : sauvegarde, réglages, icônes, PWA

**Fait** :
- `io.js` : export/import JSON complets (blobs `fichiers` ↔ base64 via FileReader/fetch, `validerExport` qui rejette fichiers étrangers et schémas plus récents, `telechargerJSON`, `compterTout`, helpers `lireMeta`/`ecrireMeta`).
- `modules/sauvegarde.js` : écran complet — état des données, export (option pièces jointes), import (double confirmation + export de sécurité auto), purge totale (même protocole).
- `modules/reglages.js` : établissement + année scolaire (meta), thème, stockage (estimate/persisted/persist), version, bouton MAJ.
- `main.js` : routes enfants (`sauvegarde`, `reglages` sous l'onglet Plus), thème `data-theme` (auto/clair/sombre), `storage.persist()` au boot ; `state.js` porte `VERSION_APP` (0.2.0) et `estLocalhost()`.
- UI : icônes nav SVG Lucide inline ; styles formulaires/statuts/cartes-liens ; tokens sombres dupliqués média + `data-theme` (commentaire « modifier les deux »).
- Icônes PNG 192/512/512-maskable générées par `tools/gen-icons.ps1` (WPF natif Windows) — vérifiées visuellement ; manifest + SW 0.2.0 à jour.

**Vérifié en preview (port 8160)** : navigation complète, onglet parent actif sur routes enfants, **round-trip export → purge → import** (élève accentué, meta, blob texte restaurés à l'identique, base laissée vierge), rejet des sauvegardes invalides, thème sombre appliqué (`--c-fond` bascule), saisie établissement relue depuis IndexedDB, zéro erreur console.

**Coincé / à vérifier** :
- Le serveur preview 8160 s'est arrêté une fois en cours de session (cause inconnue, relancé sans souci) — surveiller.
- `storage.persisted()` = false sur localhost : normal (Chrome décide selon l'« engagement ») ; devrait passer à true une fois la PWA installée.
- Installation PWA réelle = besoin HTTPS → GitHub Pages à publier (décision utilisateur).
- Playwright : dépendance npm → validation explicite à demander avant (BIBLE).

**Prochaine étape** : finir la phase 1 (test Android réel + publication GitHub Pages si validée), puis phase 2 — Classes & élèves + import CSV Pronote.

## 2026-06-11 — Phase 0 : naissance du projet

**Fait** :
- Projet créé dans `carnet-eps` depuis le template projet (BIBLE, commandes, skills verbatim).
- Cadrage complet : `brief.md` (5 scénarios de référence), `fonctionnalites.md` (10 modules priorisés), `architecture.md`, `modele-donnees.md` (13 stores), `pronote.md` (import élèves / export notes + checklist d'établissement), `roadmap.md` (phases 0→9 avec critères de sortie), `decisions.md` (D001–D008).
- Squelette `app/` : shell 6 onglets (hash-router), tokens CSS clair/sombre, wrapper IndexedDB, manifest, SW versionné network-first (hors localhost), icône SVG, jeu d'essai CSV fictif.
- `server-carnet.mjs` (8160), lancé par `node server-carnet.mjs` à la racine ; rendu vérifié via preview (snapshot).

**Décidé** : D001 à D008 — voir `decisions.md`. Points saillants : pas de build ni framework ; wrapper IndexedDB maison ; Pronote par CSV/presse-papiers ; appel réglementaire laissé à Pronote ; SW inactif sur localhost.

**Coincé / à vérifier** :
- Formats Pronote réels (export élèves, collage notes) à valider sur le Pronote de l'établissement — checklist en fin de `pronote.md`.
- Installation PWA Android : nécessite HTTPS → prévoir GitHub Pages dès la phase 1 pour tester sur téléphone.

**Prochaine étape** : Phase 1 (socle) — commencer par l'export/import JSON et l'écran Réglages, puis icônes PNG et test d'installation réel.
