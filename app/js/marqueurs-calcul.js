// Fonctions pures des marqueurs de séance, partagées par les écritures (io.js) et la validation des
// sauvegardes. Contrat : docs/avis/AVIS_FORMAT_MARQUEURS.md (§3.2, §4.3). Calque de grilles-calcul.js :
// io.js ne peut pas importer metier.js, qui l'importe déjà (même contrainte que dateLocaleISO, io.js).
//
// Les validateurs ne contrôlent que la FORME. Un champ inconnu n'est jamais refusé (une version future
// peut en ajouter sans changer de schéma) ; un genre ou une couleur inconnus ou absents non plus : ils
// dégradent l'affichage. Seules les ÉCRITURES de l'application (ecrireMarqueur) exigent un genre et une
// couleur connus.

import { COULEURS_NIVEAUX } from './grilles-calcul.js';

export const GENRES = ['role', 'groupe', 'comportement']; // AUSSI l'ordre d'affichage, partout
export const LIBELLES_GENRE = { role: 'Rôles', groupe: 'Équipes', comportement: 'Comportements' };
export const COULEURS = COULEURS_NIVEAUX; // grilles-calcul.js — huit NOMS, jamais un hexadécimal

// Pliage recopié de metier.js (cleTexte) : io.js ne peut pas importer metier.js. Ne garde que
// [a-z0-9] : « É1 » et « E1 » sont le MÊME code.
export const cleCourt = (s) => String(s ?? '').toLowerCase()
  .normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');

const present = (v) => v !== undefined;
const longueur = (s) => [...s.normalize('NFC')].length; // en caractères, pas en unités UTF-16

// Magasin « marqueurs » — une ligne par marqueur du vocabulaire. FORME seulement (import et écriture).
export function validerMarqueur(m) {
  if (!m || typeof m !== 'object') throw new Error('marqueur illisible');
  if (typeof m.libelle !== 'string' || !m.libelle.trim()) throw new Error('libellé de marqueur vide');
  if (longueur(m.libelle.trim()) > 40) throw new Error('libellé de marqueur trop long (40 caractères au plus)');
  if (typeof m.court !== 'string' || !m.court.trim()) throw new Error('code court vide');
  const court = m.court.trim();
  if (/\s/.test(court) || longueur(court) > 3) throw new Error('code court de 1 à 3 caractères, sans espace');
  // Au moins un caractère alphanumérique : deux codes de ponctuation se replieraient tous deux sur la
  // chaîne vide et deviendraient indiscernables pour l'unicité.
  if (!cleCourt(court)) throw new Error('code court sans lettre ni chiffre');
  if (present(m.genre) && typeof m.genre !== 'string') throw new Error('genre de marqueur illisible');
  if (present(m.couleur) && typeof m.couleur !== 'string') throw new Error('couleur de marqueur illisible');
  if (present(m.archivee) && typeof m.archivee !== 'boolean') throw new Error('archivage de marqueur illisible');
  return m;
}

// Magasin « marquages » — une ligne par (séance, élève, marqueur). FORME seulement (import et écriture).
// Aucun contrôle relationnel : un marqueurId absent du vocabulaire est accepté (orphelin, décision 16).
export function validerMarquage(p) {
  if (!p || typeof p !== 'object') throw new Error('pose de marqueur illisible');
  for (const champ of ['seanceId', 'eleveId', 'marqueurId']) {
    if (typeof p[champ] !== 'string' || !p[champ]) throw new Error(`pose de marqueur sans « ${champ} »`);
  }
  // La clé est RECONSTRUITE, jamais découpée (vrai quelles que soient les valeurs des identifiants).
  if (p.id !== `${p.seanceId}_${p.eleveId}_${p.marqueurId}`) throw new Error('identifiant de pose incohérent avec sa séance, son élève et son marqueur');
  if (present(p.occurrences) && !(Number.isInteger(p.occurrences) && p.occurrences >= 1)) {
    throw new Error('nombre d’occurrences invalide (entier supérieur ou égal à 1)');
  }
  for (const champ of ['courtSecours', 'genreSecours', 'dateAjout']) {
    if (present(p[champ]) && typeof p[champ] !== 'string') throw new Error(`« ${champ} » doit être un texte`);
  }
  return p;
}
