# AVIS avant décision — Origine web dédiée pour Carnet EPS (constat A01 du 5e audit)

> Statut : **EN ATTENTE DE DÉCISION** (rédigé le 2026-09-07). Décision de produit et d'hébergement, pas de code : c'est à toi de trancher.
> Origine : audit du 2026-09-07, constat **A01 (P1)** : « Origine partagée : IndexedDB et localStorage sont lisibles par les autres PWA de alemoine4.github.io, et le guide affirme le contraire ».

## 1. Diagnostic court

- Sur le web, la frontière de sécurité des données locales (IndexedDB, localStorage, Cache Storage) est **l'origine** = schéma + hôte + port. `https://alemoine4.github.io/carnet-eps/` et `https://alemoine4.github.io/bar-clandestin/` sont **la même origine** : le chemin ne compte pas.
- Conséquence : tout script qui s'exécute dans **n'importe quelle** page publiée sur `alemoine4.github.io` (Le Bar Clandestin aujourd'hui, toute app future de ce compte) peut ouvrir la base `carnet-eps` et lire noms, statuts d'appel, inaptitudes, notes, champ « À savoir » (PAI, asthme…) et photos de certificats — données de mineurs, dont certaines relèvent de l'article 9 du RGPD (santé).
- Ce n'est **pas** une fuite active : Le Bar Clandestin ne lit rien, et personne d'autre ne publie sur ce compte. C'est une **garantie fausse** : `docs/guide-installation.md` affirme « Personne d'autre n'y a accès tant que l'appareil est verrouillé », alors que la vraie frontière est « toutes les applications que ce compte GitHub publiera un jour ». Un dépôt compromis ou une dépendance piégée dans l'une de ces apps (Le Bar Clandestin embarque des dépendances npm) suffirait.
- Le lot 1 a resserré ce qui pouvait l'être sans changer d'origine (caches préfixés, lectures de cache scopées au lot 4). Ça ne change rien à IndexedDB.

## 2. Options

| Option | Ce que ça isole | Coût | Effet pour toi |
|---|---|---|---|
| **A. Ne rien changer, corriger la documentation** | rien | 10 min | Guide et registre RGPD disent la vérité : « données lisibles par les autres apps publiées sur alemoine4.github.io ». Acceptable si tu restes le seul éditeur du compte et que tu ne publies que du code que tu maîtrises. |
| **B. Sous-domaine dédié** (ex. `carnet-eps.<ton-domaine>.fr`) via un domaine que tu possèdes, pointé sur GitHub Pages (`CNAME`) | tout (IndexedDB, localStorage, caches) | un nom de domaine (≈ 5–15 €/an : **pas gratuit**, donc à valider explicitement vis-à-vis de la BIBLE) + 30 min de configuration ; HTTPS fourni par GitHub | Nouvelle adresse → **réinstaller** la PWA et **migrer** les données par export → import (10 s par appareil). |
| **C. Dépôt ET compte GitHub dédiés** (ex. organisation `carnet-eps` → `carnet-eps.github.io`) | tout | gratuit ; 20 min (créer l'organisation, pousser le dépôt, activer Pages) | Même migration qu'en B (nouvelle adresse). Une organisation GitHub gratuite suffit ; l'adresse est `https://carnet-eps.github.io/` (dépôt nommé `carnet-eps.github.io`). |
| D. Chiffrer IndexedDB avec une phrase de passe (WebCrypto) | le contenu, pas l'origine | plusieurs jours, saisie d'une phrase à chaque ouverture | Contraire au critère « appel en moins de 40 s au pouce » ; hors sujet ici (déjà au backlog comme option d'export chiffré). |

## 3. Recommandation

**Option C** (organisation GitHub dédiée, gratuite) : elle isole réellement les données sans toucher une ligne de code applicatif ni introduire de coût, et elle sépare aussi les caches et les réglages. Elle te coûte **une seule opération** : sur chaque appareil, exporter la sauvegarde depuis l'ancienne adresse, installer la nouvelle, importer. Le guide de rentrée décrit déjà ce geste.

Si tu préfères garder l'adresse actuelle : **option A**, tout de suite (deux paragraphes de documentation), et ne jamais publier sur `alemoine4.github.io` une app contenant du code tiers non relu.

## 4. Ce qui serait fait après ton choix

- **A** : `docs/guide-installation.md` (§ « Où sont mes données ») et `docs/modele-donnees.md` (ligne « Limites ») reformulés ; rien d'autre.
- **B ou C** : (1) nouveau dépôt/organisation, `git push` du même code, Pages activée ; (2) `docs/guide-installation.md`, `README.md`, `app/manifest.webmanifest` (`id`, `start_url` restent relatifs : aucun changement), `docs/deploiement.md` (nouvelle commande de subtree) ; (3) page « Cette application a déménagé » à l'ancienne adresse avec le lien et la marche à suivre export → import ; (4) sur tes appareils : export, install, import, désinstallation de l'ancienne.

## 5. Tests à faire
Après migration : `npm test` inchangé (l'app ne connaît pas son origine) ; sur un appareil : hors-ligne, mise à jour (toast « Recharger »), round-trip export → import ; vérifier que Le Bar Clandestin fonctionne toujours.

## 6. Outils utilisés
Aucun nouveau. GitHub Pages (gratuit) ; domaine personnel seulement en option B.

## 7. Confirmation gratuité
**Oui pour A et C.** **Non pour B** (nom de domaine payant) : à exclure sauf si tu possèdes déjà un domaine.

## 8. Risques éventuels
- Migration : un appareil non migré continue de fonctionner sur l'ancienne adresse, mais ne reçoit plus de mises à jour une fois l'ancienne Pages désactivée → laisser la page de redirection en ligne au moins un trimestre.
- Deux installations côte à côte (ancienne et nouvelle) sur un même téléphone pendant la transition : deux icônes « EPS » ; le champ `id` du manifest (lot 4) et le nom distinct évitent la confusion.
