// media.js — images et pièces jointes (partagé entre modules).
// Les photos (certificats, élèves) sont compressées avant stockage pour tenir
// la cible ≤ ~300 Ko (docs/modele-donnees.md) ; les PDF sont stockés tels quels.

import { enregistrer, lire, supprimer } from './io.js';

export async function compresserImage(fichier, { maxDim = 1600, cibleOctets = 300 * 1024 } = {}) {
  const bitmap = await createImageBitmap(fichier);
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
  const rec = {
    id: crypto.randomUUID(),
    blob,
    mime,
    nom,
    taille: blob.size,
    dateAjout: new Date().toISOString().slice(0, 10),
  };
  await enregistrer('fichiers', rec);
  return rec;
}

export async function supprimerFichier(fichierId) {
  if (fichierId) await supprimer('fichiers', fichierId);
}

// URL temporaire pour afficher un blob (penser à revoquerURL après usage).
export async function urlDuFichier(fichierId) {
  const rec = await lire('fichiers', fichierId);
  return rec?.blob ? { url: URL.createObjectURL(rec.blob), fichier: rec } : null;
}

export function revoquerURL(url) {
  if (url) setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Visionneuse plein écran : image en lightbox <dialog> natif (tap n'importe où ou Échap
// pour fermer, fond inerte, focus rendu au déclencheur), PDF dans un onglet.
// `conteneur` est conservé pour compatibilité d'appel mais inutile : le <dialog> vit
// dans le top-layer du navigateur.
export function ouvrirVisionneuse(conteneur, fichier) {
  const url = URL.createObjectURL(fichier.blob);
  if (fichier.mime === 'application/pdf') {
    window.open(url, '_blank');
    revoquerURL(url);
    return;
  }
  const declencheur = document.activeElement;
  const dlg = document.createElement('dialog');
  dlg.className = 'visionneuse';
  dlg.setAttribute('aria-label', `Aperçu : ${fichier.nom}`);
  const img = document.createElement('img');
  img.src = url;
  img.alt = fichier.nom;
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
