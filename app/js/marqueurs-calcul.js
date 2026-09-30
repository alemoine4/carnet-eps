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

// ---------------------------------------------------------------------------
// Affichage (v0.14.2 « poser et relire ») — contrat §4.3 et §5. Pur : ni base, ni DOM.
// ---------------------------------------------------------------------------

// Un genre absent ou inconnu se range, se lit et s'affiche avec les comportements (§5.1 point 5), PARTOUT : carte,
// feuille « ⋯ », écran du vocabulaire — une seule source (l'écran du vocabulaire en avait une copie) : jamais
// « undefined », jamais un code de rôle inattendu.
export const genreAffiche = (m) => (GENRES.includes(m?.genre) ? m.genre : 'comportement');
// Couleur d'un rôle ou d'une équipe : un nom connu, sinon gris ; aucune pour un comportement (bordure neutre).
export const couleurAffichee = (m) => (genreAffiche(m) === 'comportement' ? null : (COULEURS.includes(m.couleur) ? m.couleur : 'gris'));

// Ordre du catalogue : genre (GENRES), archivés en dernier DANS leur genre (§6.2, §6.5), libellé, code replié.
export function trierMarqueurs(liste) {
  return [...liste].sort((a, b) => GENRES.indexOf(genreAffiche(a)) - GENRES.indexOf(genreAffiche(b))
    || Number(a.archivee === true) - Number(b.archivee === true)
    || String(a.libelle).localeCompare(String(b.libelle), 'fr')
    || cleCourt(a.court).localeCompare(cleCourt(b.court)));
}

// Map<eleveId, marquage[]> (§4.3).
export function grouperParEleve(marquages) {
  const parEleve = new Map();
  for (const p of marquages) {
    if (!parEleve.has(p.eleveId)) parEleve.set(p.eleveId, []);
    parEleve.get(p.eleveId).push(p);
  }
  return parEleve;
}

// Ce que montre la carte d'un élève (§5.1), par la règle du §5.2 : le vocabulaire ACTUEL d'abord, l'instantané
// (…Secours) seulement pour un marqueur disparu. `plus` se calcule sur les DONNÉES ; la vue y ajoute un 2e code
// qu'elle masque faute de place (§14, réponse 11).
export function codesCarte(marquagesDeLEleve, vocabulaire, { max = 2 } = {}) {
  const parId = new Map(vocabulaire.map((m) => [m.id, m]));
  const entrees = [];
  let comportements = 0;
  for (const p of marquagesDeLEleve) {
    const m = parId.get(p.marqueurId);
    if (m) {
      if (genreAffiche(m) === 'comportement') { comportements++; continue; }
      entrees.push({ genre: m.genre, libelle: String(m.libelle), court: String(m.court), couleur: couleurAffichee(m), orphelin: false });
      continue;
    }
    // Orphelin : le GENRE décide d'abord (code ou repère), courtSecours ne décide que du texte (§5.2, point 3).
    if (p.genreSecours !== 'role' && p.genreSecours !== 'groupe') { comportements++; continue; }
    const court = typeof p.courtSecours === 'string' && cleCourt(p.courtSecours) ? p.courtSecours.trim() : '?';
    entrees.push({ genre: p.genreSecours, libelle: `marqueur supprimé (${court})`, court, couleur: 'gris', orphelin: true });
  }
  // §5.1 point 1 : GENRES, puis libellé, puis code — jamais l'usage récent ; un orphelin après les connus de son genre.
  entrees.sort((a, b) => GENRES.indexOf(a.genre) - GENRES.indexOf(b.genre) || Number(a.orphelin) - Number(b.orphelin)
    || a.libelle.localeCompare(b.libelle, 'fr') || cleCourt(a.court).localeCompare(cleCourt(b.court)));
  const codes = entrees.slice(0, max).map(({ court, couleur, orphelin }) => ({ court, couleur, orphelin }));
  const plus = entrees.length - codes.length;
  const compte = comportements ? `${comportements} comportement${comportements > 1 ? 's' : ''} noté${comportements > 1 ? 's' : ''}` : '';
  const noms = entrees.map((x) => x.libelle).join(', ');
  const nomAccessible = noms || compte ? `Marqueurs : ${[noms, compte].filter(Boolean).join(' · ')}` : '';
  return { codes, plus, comportements, nomAccessible };
}
