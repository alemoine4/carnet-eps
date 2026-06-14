// io.js — couche données : wrapper IndexedDB promisifié (maison, décision D003)
// + sauvegarde/restauration JSON + utilitaires CSV (import Pronote) + cascades.
// Schéma et règles d'intégrité : docs/modele-donnees.md.

const DB_NOM = 'carnet-eps';
const DB_VERSION = 1;

// store -> keyPath + index. Toute évolution = migration cumulative dans onupgradeneeded
// (switch sur e.oldVersion, sans break) + export JSON automatique préalable (BIBLE).
const SCHEMA = {
  meta: { keyPath: 'cle' },
  classes: { keyPath: 'id' },
  eleves: { keyPath: 'id', index: ['classeId'] },
  edt: { keyPath: 'id', index: ['classeId'] },
  sequences: { keyPath: 'id', index: ['classeId'] },
  seances: { keyPath: 'id', index: ['sequenceId', 'date'] },
  appels: { keyPath: 'id', index: ['seanceId', 'eleveId'] },
  inaptitudes: { keyPath: 'id', index: ['eleveId'] },
  certificats: { keyPath: 'id', index: ['eleveId'] },
  fichiers: { keyPath: 'id' },
  evaluations: { keyPath: 'id', index: ['sequenceId'] },
  notes: { keyPath: 'id', index: ['evaluationId', 'eleveId'] },
  documents: { keyPath: 'id' },
};

export const STORES = Object.keys(SCHEMA);

let dbPromesse = null;

export function ouvrirDB() {
  if (dbPromesse) return dbPromesse;
  dbPromesse = new Promise((resoudre, rejeter) => {
    const req = indexedDB.open(DB_NOM, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      // v1 : création de tous les stores et index.
      for (const [nom, def] of Object.entries(SCHEMA)) {
        if (!db.objectStoreNames.contains(nom)) {
          const store = db.createObjectStore(nom, { keyPath: def.keyPath });
          for (const champ of def.index || []) store.createIndex(champ, champ);
        }
      }
    };
    req.onsuccess = () => resoudre(req.result);
    req.onerror = () => rejeter(req.error);
  });
  return dbPromesse;
}

function attendre(req) {
  return new Promise((resoudre, rejeter) => {
    req.onsuccess = () => resoudre(req.result);
    req.onerror = () => rejeter(req.error);
  });
}

export async function lire(store, id) {
  const db = await ouvrirDB();
  return attendre(db.transaction(store).objectStore(store).get(id));
}

export async function tous(store) {
  const db = await ouvrirDB();
  return attendre(db.transaction(store).objectStore(store).getAll());
}

export async function parIndex(store, index, valeur) {
  const db = await ouvrirDB();
  return attendre(db.transaction(store).objectStore(store).index(index).getAll(valeur));
}

export async function enregistrer(store, objet) {
  const db = await ouvrirDB();
  await attendre(db.transaction(store, 'readwrite').objectStore(store).put(objet));
  return objet;
}

export async function supprimer(store, id) {
  const db = await ouvrirDB();
  return attendre(db.transaction(store, 'readwrite').objectStore(store).delete(id));
}

export async function vider(store) {
  const db = await ouvrirDB();
  return attendre(db.transaction(store, 'readwrite').objectStore(store).clear());
}

// ---- meta : petits réglages persistants (établissement, année scolaire…) ----

export async function lireMeta(cle, defaut = '') {
  const enreg = await lire('meta', cle);
  return enreg ? enreg.valeur : defaut;
}

export async function ecrireMeta(cle, valeur) {
  return enregistrer('meta', { cle, valeur });
}

// ---------------------------------------------------------------------------
// Sauvegarde / restauration JSON (phase 1)
// Format : { app:'carnet-eps', schemaVersion, dateExport, stores:{...} }
// Les blobs du store `fichiers` sont sérialisés en dataURL (base64).
// ---------------------------------------------------------------------------

function blobVersDataURL(blob) {
  return new Promise((resoudre, rejeter) => {
    const lecteur = new FileReader();
    lecteur.onload = () => resoudre(lecteur.result);
    lecteur.onerror = () => rejeter(lecteur.error);
    lecteur.readAsDataURL(blob);
  });
}

export async function exporterJSON({ avecFichiers = true } = {}) {
  const stores = {};
  for (const nom of STORES) {
    if (nom === 'fichiers') {
      if (!avecFichiers) {
        stores.fichiers = [];
        continue;
      }
      const enregs = await tous('fichiers');
      stores.fichiers = await Promise.all(
        enregs.map(async ({ blob, ...reste }) => ({
          ...reste,
          donnees: blob ? await blobVersDataURL(blob) : null,
        }))
      );
    } else {
      stores[nom] = await tous(nom);
    }
  }
  return {
    app: 'carnet-eps',
    schemaVersion: DB_VERSION,
    dateExport: new Date().toISOString(),
    stores,
  };
}

// Vérifie qu'un objet est bien une sauvegarde Carnet EPS lisible. Retourne { date, comptes }.
export function validerExport(objet) {
  if (!objet || objet.app !== 'carnet-eps' || typeof objet.stores !== 'object') {
    throw new Error('fichier non reconnu (ce n’est pas une sauvegarde Carnet EPS)');
  }
  if (objet.schemaVersion > DB_VERSION) {
    throw new Error(`sauvegarde issue d’une version plus récente de l’app (schéma ${objet.schemaVersion} > ${DB_VERSION})`);
  }
  const comptes = {};
  for (const nom of STORES) comptes[nom] = (objet.stores[nom] || []).length;
  return { date: (objet.dateExport || '').slice(0, 10) || 'date inconnue', comptes };
}

// Restauration complète : REMPLACE tout. Les confirmations et l'export de sécurité
// sont gérés par l'appelant (modules/sauvegarde.js).
// Écriture par lots : une seule transaction (clear + puts) par store — indispensable
// pour restaurer une année entière (~10 000 appels) en quelques secondes.
export async function importerJSON(objet) {
  validerExport(objet);
  // schemaVersion < DB_VERSION : appliquer ici les migrations à l'import (aucune en v1).
  const lots = {};
  for (const nom of STORES) {
    if (nom === 'fichiers') {
      lots.fichiers = await Promise.all((objet.stores.fichiers || []).map(async (enreg) => {
        const { donnees, ...reste } = enreg;
        // Sécurité : ne reconstruire un blob que depuis une dataURL locale. Un fichier piégé
        // avec une URL http n'émet ainsi aucune requête réseau (offline/RGPD garantis).
        const okDataURL = typeof donnees === 'string' && donnees.startsWith('data:');
        return { ...reste, blob: okDataURL ? await (await fetch(donnees)).blob() : null };
      }));
    } else {
      lots[nom] = objet.stores[nom] || [];
    }
  }
  const db = await ouvrirDB();
  for (const nom of STORES) {
    await new Promise((resoudre, rejeter) => {
      const tx = db.transaction(nom, 'readwrite');
      const store = tx.objectStore(nom);
      store.clear();
      for (const enreg of lots[nom]) store.put(enreg);
      tx.oncomplete = resoudre;
      tx.onerror = () => rejeter(tx.error);
    });
  }
}

export async function telechargerJSON(objet, suffixe = 'sauvegarde') {
  const nom = `carnet-eps_${suffixe}_${new Date().toISOString().slice(0, 10)}.json`;
  const blob = new Blob([JSON.stringify(objet)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nom;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return nom;
}

export async function compterTout() {
  const comptes = {};
  for (const nom of STORES) comptes[nom] = (await tous(nom)).length;
  return comptes;
}

// Télécharge un texte (CSV…) — BOM UTF-8 en tête pour qu'Excel lise les accents.
export function telechargerTexte(nomFichier, texte, mime = 'text/csv') {
  const blob = new Blob([String.fromCharCode(0xfeff) + texte], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nomFichier;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return nomFichier;
}

// Échappe un champ CSV (RFC 4180) et neutralise l'injection de formule (Excel) :
// un champ commençant par = + - @ (ou tab/CR) est préfixé d'une apostrophe pour rester du texte.
export function champCSV(valeur) {
  let s = valeur == null ? '' : String(valeur);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  if (/[";\r\n]/.test(s)) s = `"${s.replace(/"/g, '""')}"`;
  return s;
}

// ---------------------------------------------------------------------------
// CSV (import Pronote, phase 2) — tolérant : séparateur ; / tab / virgule,
// champs entre guillemets, BOM, encodage UTF-8 ou Windows-1252 (docs/pronote.md).
// ---------------------------------------------------------------------------

export function decoderTexte(tampon) {
  const utf8 = new TextDecoder('utf-8').decode(tampon);
  // Caractère de remplacement � = le fichier n'était pas de l'UTF-8 valide
  // → on retente en Windows-1252 (exports Pronote/Excel France).
  if (utf8.includes('�')) return new TextDecoder('windows-1252').decode(tampon);
  return utf8;
}

export async function lireTexteCSV(fichier) {
  return decoderTexte(await fichier.arrayBuffer());
}

export function parserCSV(texte) {
  const sansBom = String(texte).replace(/^\uFEFF/, '');
  const lignesBrutes = sansBom.split(/\r\n|\r|\n/).filter((l) => l.trim() !== '');
  if (lignesBrutes.length < 2) throw new Error('il faut au moins une ligne d’en-têtes et une ligne de données');
  const premiere = lignesBrutes[0];
  const separateur = [';', '\t', ','].reduce((a, b) =>
    premiere.split(b).length > premiere.split(a).length ? b : a
  );
  const decouper = (ligne) => {
    const champs = [];
    let courant = '';
    let entreGuillemets = false;
    for (let i = 0; i < ligne.length; i++) {
      const ch = ligne[i];
      if (ch === '"') {
        if (entreGuillemets && ligne[i + 1] === '"') { courant += '"'; i++; }
        else entreGuillemets = !entreGuillemets;
      } else if (ch === separateur && !entreGuillemets) {
        champs.push(courant.trim());
        courant = '';
      } else {
        courant += ch;
      }
    }
    champs.push(courant.trim());
    return champs;
  };
  return {
    separateur,
    entetes: decouper(lignesBrutes[0]),
    lignes: lignesBrutes.slice(1).map(decouper),
  };
}

// ---------------------------------------------------------------------------
// Cascades de suppression (IndexedDB n'a pas de clés étrangères) —
// règles documentées dans docs/modele-donnees.md.
// ---------------------------------------------------------------------------

export async function supprimerSeanceEnCascade(seanceId) {
  const comptes = { appels: 0 };
  for (const a of await parIndex('appels', 'seanceId', seanceId)) {
    await supprimer('appels', a.id);
    comptes.appels++;
  }
  await supprimer('seances', seanceId);
  return comptes;
}

export async function supprimerSequenceEnCascade(sequenceId) {
  const comptes = { seances: 0, appels: 0, evaluations: 0, notes: 0 };
  for (const s of await parIndex('seances', 'sequenceId', sequenceId)) {
    const c = await supprimerSeanceEnCascade(s.id);
    comptes.seances++;
    comptes.appels += c.appels;
  }
  for (const ev of await parIndex('evaluations', 'sequenceId', sequenceId)) {
    for (const n of await parIndex('notes', 'evaluationId', ev.id)) {
      await supprimer('notes', n.id);
      comptes.notes++;
    }
    await supprimer('evaluations', ev.id);
    comptes.evaluations++;
  }
  await supprimer('sequences', sequenceId);
  return comptes;
}

export async function supprimerEleveEnCascade(eleveId) {
  const comptes = { appels: 0, inaptitudes: 0, certificats: 0, notes: 0, fichiers: 0 };
  for (const a of await parIndex('appels', 'eleveId', eleveId)) {
    await supprimer('appels', a.id);
    comptes.appels++;
  }
  for (const i of await parIndex('inaptitudes', 'eleveId', eleveId)) {
    await supprimer('inaptitudes', i.id);
    comptes.inaptitudes++;
  }
  for (const c of await parIndex('certificats', 'eleveId', eleveId)) {
    if (c.fichierId) { await supprimer('fichiers', c.fichierId); comptes.fichiers++; }
    await supprimer('certificats', c.id);
    comptes.certificats++;
  }
  for (const n of await parIndex('notes', 'eleveId', eleveId)) {
    await supprimer('notes', n.id);
    comptes.notes++;
  }
  const eleve = await lire('eleves', eleveId);
  if (eleve?.photoFichierId) { await supprimer('fichiers', eleve.photoFichierId); comptes.fichiers++; }
  await supprimer('eleves', eleveId);
  return comptes;
}

// ---------------------------------------------------------------------------
// Aperçu des suppressions en cascade (pour afficher l'impact dans la confirmation).
// ---------------------------------------------------------------------------

export async function apercuSuppressionEleve(eleveId) {
  return {
    appels: (await parIndex('appels', 'eleveId', eleveId)).length,
    inaptitudes: (await parIndex('inaptitudes', 'eleveId', eleveId)).length,
    certificats: (await parIndex('certificats', 'eleveId', eleveId)).length,
    notes: (await parIndex('notes', 'eleveId', eleveId)).length,
  };
}

export async function apercuSuppressionSequence(sequenceId) {
  const seances = await parIndex('seances', 'sequenceId', sequenceId);
  let appels = 0;
  for (const s of seances) appels += (await parIndex('appels', 'seanceId', s.id)).length;
  const evaluations = await parIndex('evaluations', 'sequenceId', sequenceId);
  let notes = 0;
  for (const ev of evaluations) notes += (await parIndex('notes', 'evaluationId', ev.id)).length;
  return { seances: seances.length, appels, evaluations: evaluations.length, notes };
}

// { appels: 12, notes: 4 } → « Seront aussi supprimés : 12 appels, 4 notes. » (ignore les zéros).
export function detailSuppression(comptes) {
  const noms = { seances: 'séance', appels: 'appel', notes: 'note', inaptitudes: 'inaptitude', certificats: 'certificat', evaluations: 'évaluation', fichiers: 'pièce jointe' };
  const parts = Object.entries(comptes)
    .filter(([, n]) => n > 0)
    .map(([k, n]) => `${n} ${noms[k] || k}${n > 1 ? 's' : ''}`);
  return parts.length ? `Seront aussi supprimés : ${parts.join(', ')}.` : '';
}
