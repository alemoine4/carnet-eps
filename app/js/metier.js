// metier.js — vocabulaire et règles métier partagés entre modules
// (les modules métier ne s'importent jamais entre eux : ce qui est commun vit ici).

import { tous, lireMeta } from './io.js';

// ---- Statuts d'appel (docs/modele-donnees.md) ----
// `pratiquant` : participe physiquement au cours. L'inapte/dispensé présent n'est pas pratiquant.
export const STATUTS = {
  present: { libelle: 'Présent', court: 'P', couleur: '#0f7a46', pratiquant: true },
  absent: { libelle: 'Absent', court: 'A', couleur: '#d03a3a', pratiquant: false },
  retard: { libelle: 'Retard', court: 'R', couleur: '#a35f00', pratiquant: true },
  dispense: { libelle: 'Dispensé (mot)', court: 'D', couleur: '#7c3aed', pratiquant: false },
  inapte: { libelle: 'Inapte (certificat)', court: 'I', couleur: '#0e7490', pratiquant: false },
  oubli_tenue: { libelle: 'Oubli de tenue', court: 'T', couleur: '#be185d', pratiquant: false },
  infirmerie: { libelle: 'Infirmerie', court: 'INF', couleur: '#5b6b85', pratiquant: false },
};

// Statuts parcourus par un tap simple sur l'écran d'appel (le reste via appui long).
export const CYCLE_TAP = ['present', 'absent', 'oubli_tenue'];

// Seuil de signalement (oublis de tenue / dispenses « mot »).
export const SEUIL_ALERTE = 3;

// ---- Dates & heures ----
export const isoAujourdhui = () => new Date().toISOString().slice(0, 10);
export const dateFR = (iso) => (iso ? new Date(`${iso}T12:00:00`).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }) : '?');
export const enMinutes = (hm) => {
  const [h, m] = String(hm || '0:0').split(':').map(Number);
  return h * 60 + m;
};

export function lundiDe(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}

// ---- Alternance A/B ----
// 'A' | 'B' | null (si pas de lundi de référence défini dans meta).
// Limite v1 assumée : parité calendaire pure, les vacances ne décalent pas l'alternance.
export async function semaineCourante(date = new Date()) {
  const ref = await lireMeta('semaineAReference', '');
  if (!ref) return null;
  const diff = Math.round((lundiDe(date) - lundiDe(new Date(`${ref}T12:00:00`))) / 604800000);
  return ((diff % 2) + 2) % 2 === 0 ? 'A' : 'B';
}

// Créneaux EDT du jour donné, filtrés par parité A/B (tous si parité inconnue), triés par heure.
export async function coursDuJour(date = new Date()) {
  const jour = ((date.getDay() + 6) % 7) + 1; // 1 = lundi
  const sem = await semaineCourante(date);
  return (await tous('edt'))
    .filter((cr) => cr.jour === jour)
    .filter((cr) => cr.semaine === 'AB' || !sem || cr.semaine === sem)
    .sort((a, b) => enMinutes(a.heureDebut) - enMinutes(b.heureDebut));
}

// Inaptitudes actives d'une date donnée (utilisé pour pré-remplir l'appel et les pastilles).
export async function inaptitudesActives(dateISO = isoAujourdhui()) {
  return (await tous('inaptitudes')).filter(
    (i) => (!i.dateDebut || i.dateDebut <= dateISO) && (!i.dateFin || dateISO <= i.dateFin)
  );
}
