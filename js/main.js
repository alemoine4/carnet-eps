// main.js — démarrage, routes, thème, enregistrement du service-worker.
// Toutes les vues sont fournies par les modules (js/modules/*.js).

import { enregistrerVue, afficherVue, carte, el } from './ui.js';
import { etat, abonner, estLocalhost } from './state.js';
import { ouvrirDB } from './io.js';
import { initialiser as initAccueil } from './modules/accueil.js';
import { initialiser as initSauvegarde } from './modules/sauvegarde.js';
import { initialiser as initReglages } from './modules/reglages.js';
import { initialiser as initEleves } from './modules/eleves.js';
import { initialiser as initEdt } from './modules/edt.js';
import { initialiser as initSequences } from './modules/sequences.js';
import { initialiser as initAppel } from './modules/appel.js';
import { initialiser as initInaptitudes } from './modules/inaptitudes.js';
import { initialiser as initNotes } from './modules/notes.js';
import { initialiser as initDocuments } from './modules/documents.js';

// Routes principales (onglets) + routes enfants (accessibles depuis « Plus »).
const ROUTES = ['accueil', 'appel', 'eleves', 'notes', 'edt', 'plus', 'sauvegarde', 'reglages', 'sequences', 'inaptitudes', 'documents', 'aide'];
const PARENT = { sauvegarde: 'plus', reglages: 'plus', sequences: 'plus', inaptitudes: 'plus', documents: 'plus', aide: 'plus' };

// ---- Vue « Plus » (menu des modules secondaires) ----

enregistrerVue('plus', (c) => {
  const lien = (route, carteElem) => el('a', { class: 'carte-lien', href: `#/${route}` }, carteElem);
  const liste = el('div', { class: 'liste-cartes' });
  liste.append(
    lien('inaptitudes', carte('Inaptitudes & certificats', 'Totales/partielles, photo du certificat, alertes d’expiration et > 3 mois.')),
    lien('sequences', carte('Séquences & séances', 'APSA, champs d’apprentissage, séances numérotées automatiquement.')),
    lien('documents', carte('Documents', 'Bibliothèque locale : fiches, protocoles, convocations — photo, PDF ou lien.')),
    lien('sauvegarde', carte('Sauvegarde', 'Export / import JSON complet — le transfert PC ↔ Android et le filet de sécurité.')),
    lien('reglages', carte('Réglages', 'Établissement, année scolaire, thème, stockage, mises à jour.')),
    lien('aide', carte('Aide & rentrée', 'Prise en main, procédure de rentrée en 6 étapes, bons réflexes de l’année.')),
  );
  c.append(liste, el('p', { class: 'note-discrete' }, '100 % local · hors ligne · aucune donnée ne quitte cet appareil'));
});

// ---- Vue « Aide » (prise en main + rentrée, intégrée et disponible hors ligne) ----

enregistrerVue('aide', (c) => {
  c.append(el('a', { class: 'retour', href: '#/plus' }, '← Plus'));

  const intro = carte('Aide & prise en main');
  intro.append(el('p', {},
    'Carnet EPS est votre carnet de bord d’EPS, 100 % sur cet appareil et hors ligne. '
    + 'Aucune donnée d’élève ne part sur internet : la seule copie qui existe est celle que vous exportez (Sauvegarde).'));
  c.append(intro);

  const etapes = carte('Première rentrée — 6 étapes (~30 min)');
  const ol = el('ol', { class: 'liste-aide' });
  for (const [t, d] of [
    ['Archiver l’année passée', 'Sauvegarde → Télécharger (avec pièces), ranger le fichier, puis Effacer toutes les données. (À sauter la toute première fois.)'],
    ['Régler l’année', 'Réglages : année scolaire, établissement, thème.'],
    ['Importer les élèves', 'Élèves → Importer depuis Pronote : coller le tableau ou le CSV → Analyser → vérifier les colonnes → Importer. Les classes se créent seules, les doublons sont ignorés.'],
    ['Saisir l’EDT', 'EDT : si alternance, renseigner « un lundi de semaine A », puis ajouter chaque créneau (jour, heures, classe, semaine, installation).'],
    ['Créer les séquences', 'Séquences → Nouvelle, pour chaque classe (APSA, dates, nombre de séances). Pas besoin de créer les séances : l’accueil propose celle du jour.'],
    ['Vérifier', 'L’accueil affiche le bon cours, les effectifs sont complets, puis exporter une première sauvegarde de l’année neuve.'],
  ]) ol.append(el('li', {}, el('strong', {}, `${t} — `), d));
  etapes.append(ol);
  c.append(etapes);

  const jourJ = carte('Le jour J');
  jourJ.append(el('p', {}, 'Ouvrir l’app → la carte « En ce moment » affiche la classe → toucher « Créer la séance et faire l’appel » → appel au pouce.'));
  c.append(jourJ);

  const reflexes = carte('Au fil de l’année — les bons réflexes');
  const ul = el('ul', { class: 'liste-aide' });
  for (const r of [
    'Exporter une sauvegarde chaque semaine (10 s) — seule protection contre la perte de l’appareil.',
    'Certificat reçu → Inaptitudes → Nouvelle (avec photo) : l’élève sera signalé à l’appel tout seul.',
    'Fin de cycle → saisir les notes → « Copier pour Pronote » au bureau.',
    'L’accueil rappelle le reste : inaptitudes qui expirent, seuils de tenue, notes non remontées.',
  ]) ul.append(el('li', {}, r));
  reflexes.append(ul);
  c.append(reflexes);

  c.append(el('p', { class: 'note-discrete' }, 'Installation sur le téléphone et transfert PC ↔ Android : voir le guide d’installation fourni avec l’app.'));
});

// ---- Initialisation des modules ----

initAccueil();
initSauvegarde();
initReglages();
initEleves();
initEdt();
initSequences();
initAppel();
initInaptitudes();
initNotes();
initDocuments();

// ---- Router (hash) — segments : #/eleves/fiche/<id> → route 'eleves', params ['fiche','<id>'] ----

function segmentsDepuisHash() {
  return (location.hash || '#/accueil').replace(/^#\/?/, '').split('/').filter(Boolean);
}

async function naviguer() {
  const seg = segmentsDepuisHash();
  const r = ROUTES.includes(seg[0]) ? seg[0] : 'accueil';
  etat.route = r;
  const onglet = PARENT[r] || r; // les routes enfants laissent leur onglet parent actif
  for (const a of document.querySelectorAll('.nav a')) {
    const actif = a.dataset.route === onglet;
    a.classList.toggle('actif', actif);
    if (actif) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  }
  await afficherVue(r, seg.slice(1));
}

window.addEventListener('hashchange', naviguer);

// ---- Thème (auto / clair / sombre) ----

function appliquerTheme(theme) {
  if (theme === 'auto') delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = theme;
}
abonner('prefs', (prefs) => appliquerTheme(prefs.theme));
appliquerTheme(etat.prefs.theme);

// ---- Démarrage ----

ouvrirDB(); // ouverture anticipée (création des stores avant la première vue)

document.getElementById('entete-contexte').textContent =
  new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

// Persistance du stockage : évite l'éviction silencieuse d'IndexedDB (surtout Android).
if (navigator.storage?.persist) {
  navigator.storage.persisted().then((deja) => {
    if (!deja) navigator.storage.persist();
  });
}

// Service-worker : jamais sur localhost (décision D008 — pas de cache fantôme en dev).
// Le SW fait skipWaiting + clients.claim : quand une nouvelle version prend le contrôle
// en cours d'utilisation, on propose de recharger (BIBLE règle 5 — MAJ visible).
function afficherToastMaj() {
  if (document.querySelector('.toast')) return;
  const btn = el('button', { class: 'btn btn-principal' }, 'Recharger');
  btn.addEventListener('click', () => location.reload());
  document.body.append(el('div', { class: 'toast', role: 'status' },
    el('span', {}, 'Nouvelle version installée.'), btn));
}

if ('serviceWorker' in navigator && !estLocalhost()) {
  let etaitControle = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!etaitControle) { etaitControle = true; return; } // première installation : pas une mise à jour
    afficherToastMaj();
  });
  navigator.serviceWorker.register('./service-worker.js').catch((e) => {
    console.warn('Service-worker non enregistré :', e);
  });
}

naviguer();
