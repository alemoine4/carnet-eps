// state.js — état en mémoire, pub/sub, préférences UI (localStorage uniquement,
// jamais de données élèves ici — elles vivent dans IndexedDB via io.js).

// Version applicative : synchroniser avec VERSION du service-worker à chaque déploiement.
export const VERSION_APP = '0.9.9';

const CLE_PREFS = 'carnet-eps:prefs';

export const etat = {
  route: 'accueil',
  prefs: chargerPrefs(),
};

const abonnes = new Map(); // évènement -> Set<fonction>

export function abonner(evenement, fn) {
  if (!abonnes.has(evenement)) abonnes.set(evenement, new Set());
  abonnes.get(evenement).add(fn);
  return () => abonnes.get(evenement).delete(fn);
}

export function emettre(evenement, donnees) {
  for (const fn of abonnes.get(evenement) || []) fn(donnees);
}

function chargerPrefs() {
  try {
    return { theme: 'auto', ...JSON.parse(localStorage.getItem(CLE_PREFS) || '{}') };
  } catch {
    return { theme: 'auto' };
  }
}

export function sauverPrefs(maj) {
  Object.assign(etat.prefs, maj);
  localStorage.setItem(CLE_PREFS, JSON.stringify(etat.prefs));
  emettre('prefs', etat.prefs);
}

// Environnement : en dev local le service-worker est désactivé (décision D008).
export function estLocalhost() {
  return ['localhost', '127.0.0.1'].includes(location.hostname);
}
