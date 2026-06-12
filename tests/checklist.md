# Checklist QA — Carnet EPS

> Adaptée du template DEV_APP au projet réel. Deux types de cases :
> ✅ = vérifié automatiquement en preview le **2026-06-12** (QA phase 8, v0.8.1, données = 1 année complète simulée)
> 🔲 = à vérifier **sur appareil réel** par Alexandre (PC + Android) — refaire à chaque palier important.

## 📊 Résultats QA du 2026-06-12 (phase 8)

| Mesure | Résultat | Cible |
|---|---|---|
| Volumétrie testée | 6 classes × 28 élèves × 1 an = **10 668 enregistrements** + 12 photos (1,4 Mo) | année réelle |
| Rendu des écrans (tous) | **16 à 49 ms** (pire cas : accueil avec alertes sur 9 072 appels) | < 2 s |
| Export JSON complet | 57 ms · 1,36 Mo (1,20 Mo sans pièces) | — |
| Import (restauration) | **1,9 s** pour tout ré-écrire (lots par store) | < 10 s |
| Round-trip export→purge→import | données strictement identiques, blobs intègres | aucune perte |
| Lighthouse | **Perf 97 · Accessibilité 100 · Best practices 100** | ≥ 90/95/95 |
| Audit a11y structurel (21 écrans) | 0 problème (étiquettes, noms, alt, lang, nav) | 0 |
| Imports corrompus | objet étranger / schéma futur / JSON tronqué → tous rejetés avec message | rejet propre |

## Ouverture

- ✅ L'app s'ouvre sans erreur console (vérifié à chaque phase).
- ✅ Premier écran < 2 s (mesuré : < 50 ms avec une année de données).
- 🔲 Aucune ressource manquante sur appareil réel (Network → pas de 404).

## Fonctionnement principal

- ✅ Appel, saisie de notes, inaptitudes, import élèves : scénarios complets joués en preview (phases 2→7).
- ✅ Sauvegarde automatique à chaque geste (IndexedDB) ; F5 ne perd rien (round-trip vérifié).
- ✅ Toute suppression destructive = confirmation (élève, séquence, évaluation, inaptitude, document, purge ×2).
- 🔲 Appel d'une classe de 28 en < 40 s **au pouce sur Android** (critère phase 4).

## Import / export

- ✅ Export CSV (récap absences, notes, relevés) : BOM UTF-8 → accents OK dans Excel.
- ✅ Export JSON valide ; ré-import sans perte (10 668 enregistrements, 1,9 s).
- ✅ Import CSV Pronote : séparateurs `;`/tab/`,`, encodage Windows-1252 auto, mapping manuel, doublons ignorés.
- ✅ Purge complète disponible (Sauvegarde → Tout effacer, export de sécurité automatique avant).
- 🔲 Import d'un **vrai export Pronote du collège** (phase 2) + collage d'une colonne dans un **vrai service Pronote** (phase 6) — checklist détaillée : `docs/pronote.md`.

## Responsive

- ✅ Mobile-first, cibles ≥ 44 px (`--tactile`), grille d'appel 2/3/4 colonnes, nav basse mobile / latérale ≥ 900 px.
- 🔲 375 px réel : aucun débordement horizontal (vérifier surtout récap et relevé → défilement horizontal voulu des tableaux).
- 🔲 Rotation portrait/paysage sur le téléphone.

## PWA & hors ligne

- ✅ Manifest complet (icônes 192/512 + maskable), SW versionné network-first/cache-first, jamais actif sur localhost.
- 🔲 Installation réelle (nécessite HTTPS → GitHub Pages) : icône « Installer », fonctionnement avion, bouton « Vérifier les mises à jour » après un déploiement.
- 🔲 `storage.persist()` accordé une fois installée (Réglages → protection « active ✓ »).

## Accessibilité

- ✅ Lighthouse Accessibilité **100** ; audit structurel 21 écrans : 0 problème.
- ✅ Focus visible (`:focus-visible` global), `aria-current` sur l'onglet actif, feuilles `role="dialog"`.
- 🔲 Navigation clavier complète de bout en bout (Tab/Entrée) sur PC.

## Impression

- ✅ Règles `@media print` : nav/boutons/filtres masqués, tableaux pleine largeur (récap absences, relevé de notes).
- 🔲 Impression papier réelle : lisibilité, marges, rien de tronqué.

## Performance

- ✅ Lighthouse Performance **97** ; tous les écrans < 50 ms avec une année de données.
- ✅ Import par lots (1 transaction/store) — restauration année complète en ~2 s.

## Gratuité (BIBLE règle 1)

- ✅ Zéro dépendance : vanilla JS/CSS, icônes SVG inline (Lucide MIT), WPF Windows pour générer les PNG.
- ✅ Aucun appel réseau au runtime (sauf liens externes ouverts volontairement par l'utilisateur).
- ✅ Pas de clé API, pas de tracking, pas de télémétrie.

## Données élèves (BIBLE règle 4)

- ✅ Aucune donnée ne quitte l'appareil (pas de fetch externe dans le code applicatif).
- ✅ Minimisation : pas d'INE, pas d'adresse (l'import Pronote ignore les colonnes inconnues).
- ✅ Suppression intégrale fonctionnelle (purge + cascades documentées `docs/modele-donnees.md`).
- ✅ Localisation des données expliquée (README + écran Sauvegarde/Réglages).

---

## Bilan QA phase 8 (2026-06-12)

- Bugs critiques trouvés : **0**
- Bugs importants trouvés : **2, corrigés** (phase 6 : récap écrasait la zone de copie manuelle ; phase 8 : import enregistrement-par-enregistrement → réécrit en lots, ~30× plus rapide)
- Bugs confort trouvés : 0
- Prêt à livrer ? **Oui côté code** — restent les 🔲 « appareil réel » ci-dessus (Android, Pronote réel, installation HTTPS, impression papier).
