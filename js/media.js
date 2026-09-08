// media.js — images et pièces jointes (partagé entre modules).
// Les photos (certificats, élèves) sont compressées avant stockage pour tenir
// la cible ≤ ~300 Ko (docs/modele-donnees.md) ; les PDF sont stockés tels quels.

import { enregistrer, lire, supprimer } from './io.js';
import { toast } from './ui.js';
import { isoAujourdhui } from './metier.js';

export async function compresserImage(fichier, { maxDim = 1600, cibleOctets = 300 * 1024 } = {}) {
  let bitmap;
  try {
    bitmap = await createImageBitmap(fichier);
  } catch {
    // HEIC d'iPhone sur PC, fichier tronqué… : message clair plutôt qu'un rejet muet.
    throw new Error(`image illisible sur cet appareil (format non pris en charge ?) — ${fichier.name || 'fichier'}`);
  }
  const ratio = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * ratio));
  canvas.height = Math.max(1, Math.round(bitmap.height * ratio));
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  let dernier = null;
  for (const qualite of [0.8, 0.7, 0.6, 0.5, 0.4]) {
    dernier = await new Promise((r) => canvas.toBlob(r, 'image/jpeg', qualite));
    if (dernier && dernier.size <= cibleOctets) break;
  }
  if (!dernier) throw new Error('compression impossible (image non convertible en JPEG)');
  return dernier;
}

// Stocke un fichier dans le store `fichiers` (image → compressée JPEG, reste → tel quel).
// Retourne l'enregistrement { id, blob, mime, nom, taille, dateAjout }.
export async function stockerFichier(fichier) {
  let blob = fichier;
  let mime = fichier.type || 'application/octet-stream';
  let nom = fichier.name || 'fichier';
  if (mime.startsWith('image/')) {
    blob = await compresserImage(fichier);
    mime = 'image/jpeg';
    nom = nom.replace(/\.[a-z0-9]+$/i, '') + '.jpg';
  }
  // Plafond : un PDF de plusieurs dizaines de Mo entrait tel quel et rendait l'export de
  // sécurité — donc la purge et l'import — impossibles (audit 2026-09-07, C08/B39).
  const PLAFOND = 8 * 1024 * 1024;
  if (blob.size > PLAFOND) {
    // Une décimale : « 8,2 Mo — limite 8 Mo » (l'arrondi à l'entier affichait « 8 Mo — limite 8 Mo », revue du lot 4)
    throw new Error(`pièce trop lourde (${(blob.size / 1048576).toFixed(1).replace('.', ',')} Mo) — limite 8 Mo : réduisez la qualité du scan ou photographiez le document`);
  }
  const rec = {
    id: crypto.randomUUID(),
    blob,
    mime,
    nom,
    taille: blob.size,
    dateAjout: isoAujourdhui(), // date LOCALE (audit 2026-09-07, C49)
  };
  await enregistrer('fichiers', rec);
  return rec;
}

export async function supprimerFichier(fichierId) {
  if (fichierId) await supprimer('fichiers', fichierId);
}

// Type MIME fiable d'un enregistrement `fichiers` : le type DÉCLARÉ à l'enregistrement, sinon celui
// du blob, sinon flux binaire — une sauvegarde tierce sans `mime` faisait planter la fiche
// d'inaptitude (« Affichage impossible », audit 2026-09-07, A05).
export const mimeSur = (f) => (typeof f?.mime === 'string' && f.mime ? f.mime : f?.blob?.type || 'application/octet-stream');

// URL temporaire pour afficher un blob (penser à revoquerURL après usage), typée par mimeSur.
export async function urlDuFichier(fichierId) {
  const rec = await lire('fichiers', fichierId);
  return rec?.blob ? { url: URL.createObjectURL(new Blob([rec.blob], { type: mimeSur(rec) })), fichier: rec } : null;
}

export function revoquerURL(url, delai = 1000) {
  if (url) setTimeout(() => URL.revokeObjectURL(url), delai);
}

// Visionneuse plein écran : image en lightbox <dialog> natif (tap n'importe où ou Échap
// pour fermer, fond inerte, focus rendu au déclencheur), PDF dans un onglet.
export function ouvrirVisionneuse(fichier) {
  // Enregistrement sans blob (sauvegarde tierce ou allégée de ses pièces) : message, pas de TypeError
  // — le chemin Documents n'avait pas la garde d'urlDuFichier (revue du lot 4).
  if (!fichier?.blob) { toast('Pièce absente de cette sauvegarde.'); return; }
  // Le type servi est le mime DÉCLARÉ à l'enregistrement, pas celui porté par le blob (qui peut
  // venir d'une sauvegarde JSON tierce) ; tout ce qui n'est ni image ni PDF est servi en flux
  // binaire (téléchargement) au lieu d'une image cassée (audit 2026-09-05, B18).
  const declare = mimeSur(fichier);
  const mime = /^(image\/[a-z0-9.+-]+|application\/pdf)$/i.test(declare) ? declare : 'application/octet-stream';
  // Pas de recopie du blob quand son type est déjà le bon (C07) ; l'onglet du PDF a 60 s pour
  // charger l'URL, elle était révoquée au bout d'une seconde — pièce « perdue » sur un
  // téléphone lent (audit 2026-09-07, B14).
  const url = URL.createObjectURL(fichier.blob.type === mime ? fichier.blob : new Blob([fichier.blob], { type: mime }));
  if (!mime.startsWith('image/')) {
    window.open(url, '_blank', 'noopener');
    revoquerURL(url, 60_000);
    return;
  }
  const declencheur = document.activeElement;
  const dlg = document.createElement('dialog');
  dlg.className = 'visionneuse';
  dlg.setAttribute('aria-label', `Aperçu : ${fichier.nom || 'pièce jointe'}`);
  const img = document.createElement('img');
  img.src = url;
  img.alt = fichier.nom || 'pièce jointe';
  dlg.append(img);
  dlg.addEventListener('click', () => dlg.close()); // clic n'importe où = fermer (zoom-out)
  dlg.addEventListener('close', () => {
    dlg.remove();
    revoquerURL(url);
    if (declencheur?.isConnected) declencheur.focus();
  });
  document.body.append(dlg);
  dlg.showModal();
}
