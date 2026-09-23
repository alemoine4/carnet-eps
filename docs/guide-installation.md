# Guide d'installation — Carnet EPS

> L'application s'installe depuis son adresse web (HTTPS) comme une vraie app, puis fonctionne **entièrement hors ligne**. Le code est public, **vos données ne quittent jamais l'appareil**.
>
> **Adresse de l'application : `https://carnet-eps.github.io/`** (depuis le 17 septembre 2026)

## 🚚 Déménagement de septembre 2026 : à faire une fois sur chaque appareil

L'application a changé d'adresse : l'ancienne (`https://alemoine4.github.io/carnet-eps/`) partageait son stockage avec d'autres sites du même hébergement. **Vos données ne suivent pas toutes seules** : elles sont rangées par adresse.

1. Ouvrir l'**ancienne** adresse (ou l'ancienne icône) → **Plus → Sauvegarde → Télécharger la sauvegarde**. Ne plus rien saisir ensuite sur l'ancienne adresse.
2. Ouvrir la **nouvelle** adresse `https://carnet-eps.github.io/` → **Plus → Sauvegarde → Importer** → choisir le fichier. L'import **remplace** ce qu'il y avait sur la nouvelle adresse (par exemple des données d'essai) ; une sauvegarde de sécurité est téléchargée avant.
3. Vérifier : classes, élèves, appels, notes.
4. Installer l'application depuis la nouvelle adresse (ci-dessous), puis supprimer l'ancienne icône.

Faire le PC et le téléphone **séparément** : chaque appareil a ses propres données.

## 📱 Sur Android (téléphone ou tablette)

1. Ouvrir **Chrome** et aller sur l'adresse de l'application.
2. Une bannière « **Installer l'application** » apparaît en bas — sinon : menu **⋮** (en haut à droite) → **Installer l'application** (ou « Ajouter à l'écran d'accueil »).
3. Confirmer : l'icône **EPS** apparaît sur l'écran d'accueil.
4. Ouvrir l'app depuis cette icône (elle se lance en plein écran, sans barre de navigateur).
5. Premier lancement : aller dans **Plus → Réglages** et vérifier que « Protection contre l'effacement auto » est **active ✓** (sinon, toucher « Demander la protection »).

Ensuite l'app fonctionne **sans connexion** (gymnase, plateau, piscine).

## 💻 Sur PC (Windows — Chrome ou Edge)

1. Ouvrir l'adresse de l'application dans **Chrome** ou **Edge**.
2. Cliquer sur l'icône **« Installer »** à droite de la barre d'adresse (petit écran avec une flèche) — ou menu ⋮ → « Installer Carnet EPS ».
3. L'app s'ouvre dans sa propre fenêtre et se retrouve dans le menu Démarrer.

## 🔁 PC ↔ Android : transférer ses données

Les données sont **propres à chaque appareil** (c'est le principe : rien ne part sur internet). Pour copier d'un appareil à l'autre :

1. Sur l'appareil source : **Plus → Sauvegarde → Télécharger la sauvegarde** (fichier `.json`).
2. Transférer le fichier comme vous voulez (câble, mail à soi-même, Drive personnel…).
3. Sur l'appareil cible : **Plus → Sauvegarde → Importer** → choisir le fichier → confirmer (une sauvegarde de sécurité de l'appareil cible est téléchargée automatiquement avant).

💡 Rythme conseillé : travailler au quotidien sur **un** appareil principal (le téléphone au gymnase), et exporter vers le PC quand on veut imprimer ou remonter les notes dans Pronote.

## 🔄 Mises à jour

- L'app vérifie automatiquement à chaque ouverture (avec connexion) ; quand une nouvelle version s'installe, un message « **Nouvelle version installée — Recharger** » apparaît.
- Vérification manuelle : **Plus → Réglages → Vérifier les mises à jour**.
- Hors connexion, l'app continue de fonctionner avec la version en place.

## 🛟 En cas de problème

| Problème | Solution |
|---|---|
| Pas de bouton « Installer » | Vérifier que l'adresse commence par `https://` et utiliser Chrome/Edge (pas un navigateur intégré) |
| Données disparues | Restaurer la dernière sauvegarde JSON (Plus → Sauvegarde → Importer) — d'où l'importance d'exporter régulièrement |
| « Espace insuffisant » | Réglages → vérifier l'espace ; supprimer de vieux documents/photos ou purger l'année passée (après export d'archive) |
| L'app semble bloquée sur une vieille version | Réglages → Vérifier les mises à jour, puis fermer **complètement** l'app et la rouvrir |
| « Affichage impossible » avec un message anglais (`VersionError`), ou « cet appareil a déjà ouvert le carnet avec une version plus récente de l'application » | L'appareil a déjà ouvert une version plus récente (par exemple dans un autre onglet) et garde une ancienne version en cache. **Aucune donnée n'est perdue**, mais l'ancienne version ne peut plus ouvrir la base : **recharger la page avec une connexion** pour recevoir la version à jour. Le conseil « exportez une sauvegarde » est inapplicable tant que la page n'est pas rechargée |

## 🔒 Où sont mes données ?

Dans le navigateur de l'appareil (IndexedDB), chiffrées comme le reste du profil par la session de l'appareil. Personne d'autre n'y a accès tant que l'appareil est verrouillé — **verrouillez votre session** (code PIN / Windows + L). La seule copie qui existe est celle que **vous** exportez.
