# Avis expert avant application

> **Note du 2026-08-30** — document fondateur rapatrié dans le dépôt (anciennement
> `AVIS_EXPERT_STRATEGIE.md`, à côté du projet). Contenu inchangé.

> Stratégie Claude/Cowork pour développement assisté par IA — apps HTML/CSS/JS, PWA, EPS
> Aucune modification de fichier projet n'est faite à ce stade.

---

## 1. Verdict global

La stratégie est **réfléchie, cohérente et largement applicable**, mais elle est **surdimensionnée pour la majorité de tes projets cibles** (apps EPS, outils pédagogiques, PWA simples). Le risque dominant n'est pas qu'elle soit fausse, c'est qu'elle ralentisse ton développement par excès de structure.

Recommandation : **démarrer avec un noyau minimal réutilisable** (1 template, 3 skills, 4 commandes, arborescence allégée), puis n'étendre que sur preuve de besoin réel. La contrainte "gratuit uniquement" est correctement posée et n'a pas besoin d'être renforcée.

---

## 2. Points solides

- Contrainte gratuité **claire, explicite et hiérarchisée** (règle 0 prioritaire) — c'est la meilleure partie du document.
- `CLAUDE.md` comme mémoire projet : excellent réflexe, c'est le pivot du développement assisté par IA.
- Séparation `app/` actif vs `archives/` gelé : indispensable, évite que Claude confonde versions.
- "Avis avant application" : pratique mature, à conserver pour tout changement structurant.
- Skills par domaine : bon découpage conceptuel.
- Format de réponse imposé (section 21) : très efficace pour cadrer Claude.
- Workflow itératif avec audits réguliers : réaliste pour des projets long-terme.
- Tests Playwright pour PWA hors ligne : pertinent, le service-worker est le piège classique.

---

## 3. Points à simplifier

- **9 skills, c'est trop** pour démarrer. 3 à 4 suffisent. Le reste se crée à l'usage.
- **8 commandes, c'est trop** aussi. 4 indispensables, le reste s'intègre dans CLAUDE.md ou se fusionne.
- **9 fichiers JS séparés** dans `js/` est excessif pour des apps EPS de quelques centaines de lignes. 3-4 fichiers regroupés logiquement suffisent (`state.js` + `storage.js` peuvent fusionner, `events.js` + `ui.js` aussi).
- **5 fichiers CSS** : `layout.css` et `components.css` se confondent en pratique, `print.css` rarement utile pour EPS. 2-3 CSS suffisent.
- `rapports/` + `archives/` + `docs/` + `docs/decisions/` : 4 dossiers documentaires, c'est lourd. Fusionner `rapports/` dans `docs/` et garder un seul `decisions.md` au lieu d'un dossier ADR.
- `/verif-gratuite` : ne mérite pas une commande dédiée → c'est une **règle permanente** dans `CLAUDE.md`, pas un workflow.
- `refactor-safe` : peut fusionner dans `architecte-frontend`, ce sont deux faces du même travail.

---

## 4. Risques

**Risques techniques**
- *Service-worker collant* : cache qui ne se rafraîchit pas après mise à jour. Piège n°1 des PWA. Stratégie `network-first` pour `index.html` + versionnage du SW obligatoire.
- *IndexedDB sur-utilisé* : pour des préférences ou des listes de quelques dizaines d'élèves, `localStorage` suffit largement. IndexedDB seulement si tu stockes médias, longs historiques ou >5 Mo.
- *Perte de données après MAJ du SW* : prévoir export JSON automatique avant chaque update majeur.

**Risques organisationnels**
- *Cargo cult* : appliquer toute la structure sans valeur ajoutée. Une app de 200 lignes n'a pas besoin de 4 dossiers de docs.
- *Charge cognitive* : 8 commandes + 9 skills = trop de choix au quotidien.
- *Refactor permanent* : si le template évolue à chaque projet, les anciennes apps deviennent obsolètes.

**Risques liés à l'IA**
- *Sur-explication* : Claude tend à produire des réponses longues quand le format n'est pas verrouillé. Ton format section 21 est bon, à généraliser.
- *Diffusion des modifs* : sans `BIBLE.md` séparé du `CLAUDE.md`, Claude peut "négocier" les règles. Une bible inviolable règle ce problème.

**Risques RGPD / données élèves**
- Apps EPS = potentiellement données nominatives. Stockage local ne dispense pas du devoir d'information. À documenter (point 19 du document est correct, à concrétiser).

---

## 5. Vérification gratuité

La stratégie respecte la contrainte. Points d'attention concrets :

| Outil | Statut | Vigilance |
|---|---|---|
| Playwright | Gratuit, MIT | OK |
| Lighthouse (local + CI) | Gratuit | OK |
| ESLint / Prettier / Stylelint / html-validate | Gratuit | OK |
| axe-core / Pa11y | Gratuit | OK |
| Open Props | Gratuit, MIT | OK |
| GitHub Pages + Actions | Gratuit | OK pour usage perso |
| Tailwind / DaisyUI / Flowbite | Gratuit pour la base | **Friction build pipeline** ; éviter au démarrage si CSS vanilla suffit |
| Figma Free | Plan gratuit limité (3 fichiers) | **Alternative : Penpot** (vraiment libre, auto-hébergeable) ou exports SVG |
| Context7 MCP | Free tier disponible | Clé API requise ; vérifier limites |
| Shoelace / Web Awesome | Apache-2.0 | OK, mais alourdit le bundle |
| Netlify / Vercel / Cloudflare | Gratuit avec quotas | GitHub Pages reste prioritaire |

**Verdict** : aucun risque de coût caché dans la stratégie. Continuer ainsi.

---

## 6. Améliorations proposées

1. **Ajouter `BIBLE.md`** à côté de `CLAUDE.md` : règles inviolables (gratuité, périmètre, données élèves). `CLAUDE.md` = rôle et méthode. `BIBLE.md` = contraintes dures.
2. **Fusionner** `qualite-gratuite` + `testeur-playwright` + (accessibilité) → une seule skill `qualite-frontend`.
3. **Fusionner** `architecte-frontend` + `refactor-safe` → une seule skill `architecte-refactor`.
4. **Ajouter** skill `donnees-eleves-local` (anonymisation, suppression, export, traçabilité minimale).
5. **Ajouter** skill `import-export-csv-json` (transversal à presque toutes tes apps EPS, demandé en §13).
6. **Supprimer la commande** `/verif-gratuite` → intégrer comme checklist dans `CLAUDE.md` (s'applique en permanence).
7. **Ajouter commande** `/plan` (avant `/dev-feature` pour les gros sujets).
8. **Ajouter commande** `/checkpoint` (snapshot avant refactor ou migration SW).
9. **Tester le template sur un projet pilote** (ex : `REMUNERATION` ou `eps-observation` déjà présents dans `_TEMPO`) avant de le figer.

---

## 7. Architecture recommandée

```txt
mon-appli/
├── CLAUDE.md              ← rôle, méthode, format de réponse
├── BIBLE.md               ← règles inviolables (gratuité, périmètre, données)
├── README.md
├── CHANGELOG.md
├── TODO.md
│
├── app/                   ← seule version active
│   ├── index.html
│   ├── manifest.webmanifest
│   ├── service-worker.js
│   ├── css/
│   │   ├── base.css            (reset + variables + typo)
│   │   ├── components.css      (boutons, cartes, formulaires, layout)
│   │   └── responsive.css      (mobile/tablette + @media print si utile)
│   ├── js/
│   │   ├── main.js             (point d'entrée + init)
│   │   ├── state.js            (état + storage local/IDB)
│   │   ├── ui.js               (rendu + événements DOM)
│   │   └── io.js               (import/export CSV/JSON + validation)
│   ├── assets/
│   │   ├── icons/
│   │   └── images/
│   └── data/
│       └── schema.json
│
├── tests/
│   ├── checklist.md            (manuel, prioritaire pour EPS)
│   └── e2e/
│       └── app.spec.js         (Playwright, scénarios critiques)
│
├── docs/
│   ├── brief.md                (objectif, utilisateurs, contraintes)
│   ├── fonctionnalites.md
│   └── decisions.md            (ADR léger, 1 seul fichier)
│
├── archives/                   (gelé, jamais modifié sans demande explicite)
│
└── .claude/
    ├── commands/               (4 fichiers .md)
    └── skills/                 (3 dossiers SKILL.md au démarrage)
```

**Justifications**
- Pas de `src/` / `dist/` / `public/` : pas de build pipeline pour HTML/CSS/JS vanilla.
- 4 JS au lieu de 9 : regroupement logique, plus lisible pour des apps de quelques milliers de lignes max.
- 3 CSS au lieu de 5 : `base` (tokens), `components` (UI), `responsive` (media queries + print).
- `docs/` ramassé : 3 fichiers principaux, 1 fichier ADR. On ajoute des fichiers à l'usage.
- Pas de `rapports/` : ce qui est utile vit dans `docs/`, ce qui est temporaire vit dans le chat.

---

## 8. Skills prioritaires

**Indispensables (à créer dès le template)**
1. `architecte-refactor` — cadrage initial + évolutions sécurisées (fusion `architecte-frontend` + `refactor-safe`).
2. `pwa-offline` — manifest, service-worker, cache, mise à jour. C'est le piège principal de tes apps.
3. `qualite-frontend` — Playwright + Lighthouse + ESLint + axe-core (fusion `qualite-gratuite` + `testeur-playwright`).

**Utiles (à ajouter dès le premier vrai projet)**
4. `ux-eps` — pertinent et bien cerné dans ton document, à activer dès le premier outil terrain.
5. `import-export-csv-json` — transversal, demandé par toi-même en §13.
6. `donnees-eleves-local` — dès qu'une app touche des noms d'élèves.

**Secondaires (à différer jusqu'à besoin avéré)**
7. `expert-indexeddb` — seulement quand `localStorage` ne suffira plus.
8. `design-gratuit` — utile une fois que l'app fonctionne, pas avant.
9. `mcp-security` — utile uniquement le jour où tu ajoutes un MCP tiers.

---

## 9. Commandes prioritaires

**Indispensables**
1. `/cadrer` — démarrage de tout nouveau projet.
2. `/dev-feature` — quotidien.
3. `/fix-bug` — correction ciblée au plus petit périmètre (conservée à ta demande).
4. `/test-app` — après chaque palier.
5. `/audit` — tous les 3-4 paliers.

**Utiles**
6. `/release` — fin de cycle.

**À ajouter**
7. `/plan` — avant `/dev-feature` pour les gros sujets (>1 fichier touché).
8. `/checkpoint` — snapshot avant refactor ou migration SW.

**À fusionner ou supprimer**
- `/verif-gratuite` → **règle permanente dans `CLAUDE.md`**, pas commande.
- `/audit-outils-gratuits` → fusionner dans `/audit`.
- `/refactor` → couvert par la skill `architecte-refactor` + commande `/plan`.

---

## 10. Pack gratuit recommandé

**Stack de base (zéro dépendance)**
- HTML5, CSS3 avec custom properties, JavaScript ES modules.
- `localStorage` pour préférences + petites listes ; IndexedDB via `idb-keyval` (BSD) si volume.
- `manifest.webmanifest` + service-worker maison (~80 lignes).

**Qualité & tests (npm devDependencies)**
- `@playwright/test` — tests e2e.
- `eslint` + `prettier` — JS.
- `stylelint` — CSS.
- `html-validate` — HTML.
- `@axe-core/playwright` — accessibilité dans Playwright.
- Lighthouse CLI (local, pas SaaS).

**Design & assets**
- Open Props (CDN ou self-hosted) — tokens CSS.
- Lucide ou Heroicons — icônes SVG (MIT).
- Polices : `system-ui` + fallback (zéro chargement réseau).

**Hébergement & CI**
- GitHub Pages — déploiement statique.
- GitHub Actions — Lighthouse + Playwright sur PR (quota gratuit suffisant).

**À ne PAS installer au démarrage**
- Tailwind / DaisyUI / Flowbite — build pipeline = friction injustifiée tant que CSS vanilla suffit.
- Context7 MCP — uniquement quand documentation manquera.
- Figma MCP — uniquement si maquette existante.
- Shoelace / Web Awesome — alourdit le bundle, peu utile pour EPS.

---

## 11. Plan d'application progressif

**Étape 1 — Socle template (1 séance, ~1h)**
- Créer `DEV_APP/template/` avec l'arborescence allégée vide (pas de code app).
- Rédiger `CLAUDE.md` universel (rôle, méthode, format section 21, règle gratuité permanente).
- Rédiger `BIBLE.md` (gratuité, périmètre, données élèves, modifs minimales).
- Créer les 3 skills indispensables (`architecte-refactor`, `pwa-offline`, `qualite-frontend`).
- Créer les 5 commandes indispensables (`/cadrer`, `/dev-feature`, `/fix-bug`, `/test-app`, `/audit`).
- Créer `checklist.md` minimale dans `tests/`.

**Étape 2 — Projet pilote (1-2 séances)**
- Choisir un projet existant ou nouveau (suggestion : refondre `eps-observation` ou démarrer une app simple).
- Cloner `template/` → `projet-pilote/`.
- Lancer `/cadrer` → produire `docs/brief.md` + `docs/fonctionnalites.md`.
- Construire `index.html` + `manifest` + `service-worker.js` minimal.
- Lancer `/test-app` avec checklist manuelle.

**Étape 3 — Stabilisation (au fil du pilote)**
- Ajouter `expert-indexeddb` si données dépassent `localStorage`.
- Ajouter `ux-eps` quand l'interface terrain est testée.
- Ajouter `import-export-csv-json` + `donnees-eleves-local` à la première fonctionnalité d'export.
- Documenter les leçons dans `BIBLE.md`.

**Étape 4 — Industrialisation (après livraison du pilote)**
- Ajouter `/plan`, `/checkpoint`, `/release`.
- Réviser le template avec les retours du pilote.
- Déployer sur GitHub Pages avec Actions de qualité (Lighthouse + Playwright).
- Documenter le workflow réel dans `DEV_APP/template/README.md`.

---

## 12. Ce que tu appliquerais maintenant

Si tu valides cet avis, je commencerais **uniquement** par l'**Étape 1** :

1. Créer `DEV_APP/template/` avec arborescence allégée (squelette, sans code app).
2. Rédiger `template/CLAUDE.md` et `template/BIBLE.md` génériques réutilisables.
3. Créer les 3 fichiers `SKILL.md` (`architecte-refactor`, `pwa-offline`, `qualite-frontend`).
4. Créer les 5 fichiers de commandes (`cadrer.md`, `dev-feature.md`, `fix-bug.md`, `test-app.md`, `audit.md`).
5. Créer `template/tests/checklist.md` minimale.

**Volontairement écarté à ce stade**
- Aucun code dans `app/js/` ou `app/css/` (dépend du projet).
- Aucune dépendance `npm` installée (on installe à la première utilisation).
- Aucune autre skill (à créer au besoin avéré).
- Aucune autre commande.
- Aucun projet pilote démarré.

Durée estimée : ~1h de rédaction guidée. Aucun coût.

---

## 13. Confirmation requise

J'attends ta validation avant de modifier les fichiers.
