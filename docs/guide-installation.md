# Guide d'installation — Carnet EPS

> L'application s'installe depuis son adresse web (HTTPS) comme une vraie app, puis fonctionne **entièrement hors ligne**. Le code est public, **vos données ne quittent jamais l'appareil**.
>
> **Adresse de l'application : `https://<utilisateur>.github.io/carnet-eps/`** *(à compléter après la publication GitHub Pages)*

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

## 🔒 Où sont mes données ?

Dans le navigateur de l'appareil (IndexedDB), chiffrées comme le reste du profil par la session de l'appareil. Personne d'autre n'y a accès tant que l'appareil est verrouillé — **verrouillez votre session** (code PIN / Windows + L). La seule copie qui existe est celle que **vous** exportez.
