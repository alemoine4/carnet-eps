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

// ---- Observations (notes terrain, v2) ----
export const TYPES_OBSERVATION = ['Engagement', 'Comportement', 'Progrès', 'Sécurité', 'Oubli de tenue', 'Inaptitude', 'Autonomie', 'Coopération', 'Remarque'];
export const TONS_OBSERVATION = [
  { cle: 'positif', libelle: 'Positif' },
  { cle: 'neutre', libelle: 'Neutre' },
  { cle: 'vigilance', libelle: 'Vigilance' },
];
export const TAGS_OBSERVATION = ['tenue', 'sécurité', 'engagement', 'progrès', 'comportement', 'conseil', 'bulletin'];
export const MODELES_PHRASES = [
  'Très bon engagement aujourd’hui.',
  'Besoin d’être relancé régulièrement.',
  'Attention au respect des consignes de sécurité.',
  'Oubli de tenue répété.',
  'Beau progrès constaté.',
  'Bonne coopération avec le groupe.',
];

// ---- Dates & heures ----
// Date LOCALE (pas toISOString/UTC : entre minuit et 1-2 h du matin, l'UTC est encore « hier »).
export const isoAujourdhui = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
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

// Agrège les alertes élèves (utilisé par l'accueil ET l'onglet Suivi) : inaptitudes
// expirant (J-7) / réintégrations, seuils d'oublis de tenue et de dispenses, évaluations
// notées non remontées vers Pronote. Retourne [{ grave, href, texte }].
export async function collecterAlertes() {
  const auj = isoAujourdhui();
  const [inaptitudes, eleves, classes, appels, evaluations, notes, sequences] = await Promise.all([
    tous('inaptitudes'), tous('eleves'), tous('classes'), tous('appels'),
    tous('evaluations'), tous('notes'), tous('sequences'),
  ]);
  const eleveDe = (id) => eleves.find((e) => e.id === id);
  const classeDe = (id) => classes.find((cl) => cl.id === id);
  const nomComplet = (e) => `${e.prenom} ${e.nom}${classeDe(e.classeId) ? ' (' + classeDe(e.classeId).nom + ')' : ''}`;
  const jours = (de, a) => Math.round((new Date(`${a}T12:00:00`) - new Date(`${de}T12:00:00`)) / 86400000);
  const alertes = [];

  for (const i of inaptitudes) {
    const e = eleveDe(i.eleveId);
    if (!e) continue;
    const active = (!i.dateDebut || i.dateDebut <= auj) && (!i.dateFin || auj <= i.dateFin);
    if (active && i.dateFin) {
      const restants = jours(auj, i.dateFin);
      if (restants <= 7) {
        alertes.push({ grave: true, href: `#/inaptitudes/${i.id}`, texte: `${nomComplet(e)} — inaptitude : ${restants <= 0 ? 'dernier jour' : `fin dans ${restants} j`}` });
      }
    } else if (i.dateFin && i.dateFin < auj && jours(i.dateFin, auj) <= 7) {
      alertes.push({ grave: false, href: `#/inaptitudes/${i.id}`, texte: `${nomComplet(e)} — redevient apte (inaptitude finie le ${dateFR(i.dateFin)})` });
    }
  }

  const cumul = new Map();
  for (const a of appels) {
    if (a.statut !== 'oubli_tenue' && a.statut !== 'dispense') continue;
    if (!cumul.has(a.eleveId)) cumul.set(a.eleveId, { oubli_tenue: 0, dispense: 0 });
    cumul.get(a.eleveId)[a.statut]++;
  }
  for (const [eleveId, c] of cumul) {
    if (c.oubli_tenue < SEUIL_ALERTE && c.dispense < SEUIL_ALERTE) continue;
    const e = eleveDe(eleveId);
    if (!e) continue;
    const morceaux = [];
    if (c.oubli_tenue >= SEUIL_ALERTE) morceaux.push(`${c.oubli_tenue} oublis de tenue`);
    if (c.dispense >= SEUIL_ALERTE) morceaux.push(`${c.dispense} dispenses « mot »`);
    alertes.push({ grave: true, href: `#/eleves/fiche/${e.id}`, texte: `${nomComplet(e)} — ${morceaux.join(' · ')}` });
  }

  const nbNotes = new Map();
  for (const n of notes) nbNotes.set(n.evaluationId, (nbNotes.get(n.evaluationId) || 0) + 1);
  for (const ev of evaluations) {
    if (ev.publieePronote || ev.type === 'afl' || !(nbNotes.get(ev.id) > 0)) continue;
    const seq = sequences.find((s) => s.id === ev.sequenceId);
    const cl = seq ? classeDe(seq.classeId) : null;
    alertes.push({ grave: false, href: `#/notes/eval/${ev.id}`, texte: `« ${ev.titre} »${cl ? ' (' + cl.nom + ')' : ''} — pas encore remontée vers Pronote` });
  }

  return alertes;
}
