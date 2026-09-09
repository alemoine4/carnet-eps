// io.js — couche données : wrapper IndexedDB promisifié (maison, décision D003)
// + sauvegarde/restauration JSON + utilitaires CSV (import Pronote) + cascades.
// Schéma et règles d'intégrité : docs/modele-donnees.md.

const DB_NOM = 'carnet-eps';
const DB_VERSION = 2;

// store -> keyPath + index. Migration additive uniquement (D009) : `onupgradeneeded` crée les stores
// manquants et les index manquants d'un store existant, jamais de suppression ni de transformation.
// Une migration non additive imposerait un `switch (e.oldVersion)` et un export JSON préalable
// (BIBLE) — voir docs/modele-donnees.md.
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
  observations: { keyPath: 'id', index: ['eleveId'] }, // v2 — notes terrain par élève
};

export const STORES = Object.keys(SCHEMA);

// Champs texte indispensables au rendu (tris, affichages) : un import qui les fournit dans un autre
// type (nom: 123) faisait planter les vues au premier tri (audit 2026-09-07, V2-05).
const CHAMPS_TEXTE = {
  classes: ['nom'],
  eleves: ['nom', 'prenom', 'classeId'],
  edt: ['classeId', 'heureDebut', 'heureFin'],
  sequences: ['classeId', 'apsa'],
  seances: ['sequenceId', 'date'],
  appels: ['seanceId', 'eleveId', 'statut'],
  inaptitudes: ['eleveId'],
  certificats: ['eleveId'],
  evaluations: ['sequenceId', 'titre'],
  notes: ['evaluationId', 'eleveId'],
  observations: ['eleveId', 'texte'],
};
// Champs conservés à l'import pour `eleves` : tout champ inconnu (INE, adresse…) est écarté, la
// minimisation RGPD ne dépend plus de la provenance du fichier (audit 2026-09-07, A24).
const CHAMPS_ELEVE = ['id', 'classeId', 'nom', 'prenom', 'sexe', 'dateNaissance', 'notesPerso', 'photoFichierId', 'actif'];

let dbPromesse = null;

export function ouvrirDB() {
  if (dbPromesse) return dbPromesse;
  dbPromesse = new Promise((resoudre, rejeter) => {
    const req = indexedDB.open(DB_NOM, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      // Création additive des stores manquants (v1 = tous ; v2 = ajout de « observations »)
      // et des index manquants d'un store existant. Migration purement additive → aucune
      // donnée existante n'est touchée.
      for (const [nom, def] of Object.entries(SCHEMA)) {
        if (!db.objectStoreNames.contains(nom)) {
          const store = db.createObjectStore(nom, { keyPath: def.keyPath });
          for (const champ of def.index || []) store.createIndex(champ, champ);
        } else {
          // Un index ajouté à SCHEMA ne naissait jamais sur une base déjà ouverte (audit 2026-09-07, D-11) —
          // à condition d'incrémenter DB_VERSION dans le même geste : sans montée de version, ce bloc ne s'exécute pas.
          const store = req.transaction.objectStore(nom);
          for (const champ of def.index || []) if (!store.indexNames.contains(champ)) store.createIndex(champ, champ);
        }
      }
    };
    let abandonnee = false;
    req.onsuccess = () => {
      const db = req.result;
      if (abandonnee) { db.close(); return; } // ouverture aboutie après un blocage déjà signalé : la suivante repartira propre
      // Un autre onglet monte le schéma : on libère la connexion (sinon il reste bloqué) et
      // la prochaine opération rouvrira la base à jour (audit 2026-09-05, B16).
      db.onversionchange = () => { db.close(); dbPromesse = null; };
      resoudre(db);
    };
    // Une promesse REJETÉE ne doit pas rester en cache : après un blocage résolu (autre onglet
    // fermé), la prochaine opération doit pouvoir rouvrir la base (audit 2026-09-07, A04).
    req.onerror = () => { dbPromesse = null; rejeter(req.error); };
    req.onblocked = () => {
      abandonnee = true;
      dbPromesse = null;
      rejeter(new Error('base de données verrouillée par un autre onglet de l’app — fermez-le puis rechargez'));
    };
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

// Plusieurs valeurs d'un même index lues dans UNE transaction readonly : une transaction par valeur
// coûtait 2× plus cher qu'une lecture complète du store dès quelques centaines de valeurs (C02, revue du lot 4).
export async function parIndexLot(store, index, valeurs) {
  const db = await ouvrirDB();
  return new Promise((resoudre, rejeter) => {
    const tx = db.transaction(store, 'readonly');
    const idx = tx.objectStore(store).index(index);
    const resultats = [];
    for (const v of valeurs) {
      const req = idx.getAll(v);
      req.onsuccess = () => { for (const r of req.result) resultats.push(r); };
    }
    tx.oncomplete = () => resoudre(resultats);
    tx.onerror = (ev) => rejeter(ev.target?.error || tx.error || new Error('lecture refusée'));
    tx.onabort = () => rejeter(tx.error || new Error('lecture interrompue'));
  });
}

// Nombre d'enregistrements d'une valeur d'index, sans les charger (aperçus de suppression, C37).
export async function compterIndex(store, index, valeur) {
  const db = await ouvrirDB();
  return attendre(db.transaction(store).objectStore(store).index(index).count(valeur));
}

// Les trois écritures unitaires passent par ecrireLot : elles ne résolvent qu'à la VALIDATION de
// la transaction (tx.oncomplete), pas au succès de la requête. Un quota plein ou une erreur disque
// remontés au commit deviennent un rejet visible au lieu d'un « ✓ » mensonger (hypothèse Codex H03).
export async function enregistrer(store, objet) {
  await ecrireLot([{ store, op: 'put', valeur: objet }]);
  return objet;
}

export async function supprimer(store, id) {
  return ecrireLot([{ store, op: 'delete', cle: id }]);
}

export async function vider(store) {
  return ecrireLot([{ store, op: 'clear' }]);
}

// Purge totale en UNE transaction sur les 14 stores — tout ou rien, comme l'import (H01).
export async function viderTout() {
  return ecrireLot(STORES.map((store) => ({ store, op: 'clear' })));
}

// Lit plusieurs stores d'un bloc dans UNE transaction readonly → instantané cohérent : une écriture
// d'un autre onglet sur ces stores attend la fin de la lecture (hypothèse Codex H02).
async function lireLot(stores) {
  const db = await ouvrirDB();
  return new Promise((resoudre, rejeter) => {
    const tx = db.transaction(stores, 'readonly');
    const resultat = {};
    for (const nom of stores) {
      const req = tx.objectStore(nom).getAll();
      req.onsuccess = () => { resultat[nom] = req.result; };
    }
    tx.oncomplete = () => resoudre(resultat);
    tx.onerror = (ev) => rejeter(ev.target?.error || tx.error || new Error('lecture refusée')); // même motif que l'écriture (D-07, revue du lot 1)
    tx.onabort = () => rejeter(tx.error || new Error('lecture interrompue'));
  });
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

// Date LOCALE AAAA-MM-JJ, même formule que metier.isoAujourdhui (io.js n'importe pas metier.js,
// qui l'importe) : toISOString donnait la veille entre minuit et 2 h (audit 2026-09-07, D-09).
function dateLocaleISO(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export async function exporterJSON({ avecFichiers = true } = {}) {
  // Instantané cohérent : tous les stores lus dans UNE transaction (H02) ; les blobs sont
  // convertis HORS transaction (un Blob lu reste lisible après sa fin).
  const brut = await lireLot(avecFichiers ? STORES : STORES.filter((n) => n !== 'fichiers'));
  const stores = {};
  for (const nom of STORES) {
    if (nom === 'fichiers') {
      stores.fichiers = [];
      // Un blob à la fois : la conversion en parallèle tenait N dataURL et N lectures en vol (D-08).
      if (avecFichiers) {
        for (const { blob, ...reste } of brut.fichiers) {
          stores.fichiers.push({ ...reste, donnees: blob ? await blobVersDataURL(blob) : null });
        }
      }
    } else {
      stores[nom] = brut[nom];
    }
  }
  const maintenant = new Date(); // une seule lecture d'horloge : date et heure du même instant (revue du lot 5)
  return {
    app: 'carnet-eps',
    schemaVersion: DB_VERSION,
    dateExport: `${dateLocaleISO(maintenant)}T${maintenant.toTimeString().slice(0, 8)}`,
    stores,
  };
}

// Vérifie qu'un objet est bien une sauvegarde Carnet EPS lisible. Retourne { date, comptes, absents }
// (absents = stores manquants dans le fichier, vidés par l'import — H04).
export function validerExport(objet) {
  if (!objet || objet.app !== 'carnet-eps' || !objet.stores || typeof objet.stores !== 'object') {
    throw new Error('fichier non reconnu (ce n’est pas une sauvegarde Carnet EPS)');
  }
  if (objet.schemaVersion > DB_VERSION) {
    throw new Error(`sauvegarde issue d’une version plus récente de l’app (schéma ${objet.schemaVersion} > ${DB_VERSION})`);
  }
  // Chaque enregistrement doit porter sa clé : un `put` sans clé lève une DataError SYNCHRONE
  // qui laissait la transaction valider son `clear()` → store vidé, base à moitié remplacée
  // (audit 2026-09-05, B02). On refuse donc le fichier AVANT toute écriture.
  const comptes = {};
  // Stores absents du fichier (ex. sauvegarde de schéma 1 sans « observations ») : ils seront
  // VIDÉS par l'import (contrat « remplace tout ») — l'appelant le dit dans la confirmation (H04).
  const absents = STORES.filter((nom) => !(nom in objet.stores));
  for (const nom of STORES) {
    const liste = objet.stores[nom] ?? [];
    if (!Array.isArray(liste)) throw new Error(`sauvegarde altérée : « ${nom} » n’est pas une liste`);
    const cle = SCHEMA[nom].keyPath;
    const vus = new Set();
    liste.forEach((enreg, i) => {
      if (!enreg || typeof enreg !== 'object' || typeof enreg[cle] !== 'string' || !enreg[cle]) {
        throw new Error(`sauvegarde altérée : « ${nom} » ligne ${i + 1} sans « ${cle} »`);
      }
      // Deux enregistrements de même clé : put() écraserait le premier en silence et le nombre
      // annoncé serait faux (H04) → refus avant toute écriture.
      if (vus.has(enreg[cle])) {
        throw new Error(`sauvegarde altérée : « ${nom} » identifiant en double « ${enreg[cle]} » (ligne ${i + 1})`);
      }
      vus.add(enreg[cle]);
      for (const champ of CHAMPS_TEXTE[nom] || []) {
        if (typeof enreg[champ] !== 'string') {
          throw new Error(`sauvegarde altérée : « ${nom} » ligne ${i + 1} — « ${champ} » doit être un texte`);
        }
      }
    });
    comptes[nom] = liste.length;
  }
  return { date: (objet.dateExport || '').slice(0, 10) || 'date inconnue', comptes, absents };
}

// Restauration complète : REMPLACE tout. Les confirmations et l'export de sécurité
// sont gérés par l'appelant (modules/sauvegarde.js).
// Écriture en UNE transaction sur tous les stores (clear + puts) : rapide pour une année
// entière (~10 000 appels) et tout-ou-rien, même si l'onglet est fermé en cours (avis B29).
export async function importerJSON(objet) {
  validerExport(objet);
  // schemaVersion < DB_VERSION : aucune migration à l'import à ce jour (schéma 2) — un store absent est vidé (H04).
  const lots = {};
  for (const nom of STORES) {
    if (nom === 'fichiers') {
      // Un blob à la fois (D-08), voir exporterJSON.
      lots.fichiers = [];
      for (const enreg of objet.stores.fichiers || []) {
        const { donnees, ...reste } = enreg;
        // Sécurité : ne reconstruire un blob que depuis une dataURL locale. Un fichier piégé
        // avec une URL http n'émet ainsi aucune requête réseau (offline/RGPD garantis).
        const okDataURL = typeof donnees === 'string' && donnees.startsWith('data:');
        lots.fichiers.push({ ...reste, blob: okDataURL ? await (await fetch(donnees)).blob() : null });
      }
    } else if (nom === 'eleves') {
      lots.eleves = (objet.stores.eleves || []).map((enreg) =>
        Object.fromEntries(CHAMPS_ELEVE.filter((k) => k in enreg).map((k) => [k, enreg[k]])));
    } else {
      lots[nom] = objet.stores[nom] || [];
    }
  }
  const operations = [];
  for (const nom of STORES) {
    operations.push({ store: nom, op: 'clear' });
    for (const enreg of lots[nom]) operations.push({ store: nom, op: 'put', valeur: enreg });
  }
  await ecrireLot(operations);
}

export async function telechargerJSON(objet, suffixe = 'sauvegarde') {
  const nom = `carnet-eps_${suffixe}_${dateLocaleISO()}.json`;
  const blob = new Blob([JSON.stringify(objet)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nom;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return nom;
}

// Comptage par `count()` dans UNE transaction readonly (instantané H02 conservé) : `getAll` chargeait
// toute la base, blobs compris, pour n'afficher que des nombres (audit 2026-09-07, A23).
export async function compterTout() {
  const db = await ouvrirDB();
  return new Promise((resoudre, rejeter) => {
    const tx = db.transaction(STORES, 'readonly');
    const comptes = {};
    for (const nom of STORES) {
      const req = tx.objectStore(nom).count();
      req.onsuccess = () => { comptes[nom] = req.result; };
    }
    tx.oncomplete = () => resoudre(comptes);
    tx.onerror = (ev) => rejeter(ev.target?.error || tx.error || new Error('lecture refusée'));
    tx.onabort = () => rejeter(tx.error || new Error('lecture interrompue'));
  });
}

// Poids total des pièces jointes, lu par CURSEUR sur le seul champ `taille` : les blobs ne sont
// jamais chargés en mémoire (même compromis que compterTout, A23 ; avis du lot 5, D-08 (3)).
export async function tailleFichiers() {
  const db = await ouvrirDB();
  return new Promise((resoudre, rejeter) => {
    const tx = db.transaction('fichiers', 'readonly');
    let total = 0;
    const req = tx.objectStore('fichiers').openCursor();
    req.onsuccess = () => {
      const cur = req.result;
      if (!cur) return;
      total += Number(cur.value?.taille) || 0;
      cur.continue();
    };
    tx.oncomplete = () => resoudre(total);
    tx.onerror = (ev) => rejeter(ev.target?.error || tx.error || new Error('lecture refusée'));
    tx.onabort = () => rejeter(tx.error || new Error('lecture interrompue'));
  });
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
  const o = new Uint8Array(tampon);
  // BOM UTF-16 (Excel « Texte Unicode ») : décodé en 1252, chaque lettre arrivait suivie d'un NUL
  // (audit 2026-09-07, C03/B37).
  if (o[0] === 0xFF && o[1] === 0xFE) return new TextDecoder('utf-16le').decode(tampon);
  if (o[0] === 0xFE && o[1] === 0xFF) return new TextDecoder('utf-16be').decode(tampon);
  // UTF-8 STRICT, repli Windows-1252 (exports Pronote/Excel France) seulement sur UTF-8 invalide :
  // un « � » légitime dans un fichier UTF-8 basculait tout le fichier en 1252.
  try { return new TextDecoder('utf-8', { fatal: true }).decode(tampon); }
  catch { return new TextDecoder('windows-1252').decode(tampon); }
}

export async function lireTexteCSV(fichier) {
  return decoderTexte(await fichier.arrayBuffer());
}

export function parserCSV(texte) {
  const sansBom = String(texte).replace(/^\uFEFF/, '');
  // Caractères de contrôle (NUL d'un UTF-16 sans BOM…) : retirés des lignes (tabulation gardée, c'est un
  // séparateur possible) puis des champs — trim() ne les touche pas, et une ligne « \0 » entre deux
  // enregistrements comptait comme ligne incomplète (B37 ; revue du lot 5).
  const sansControle = (s) => s.replace(/[^\P{Cc}\t]/gu, '');
  const propre = (s) => s.replace(/\p{Cc}/gu, '').trim();
  const lignesBrutes = sansBom.split(/\r\n|\r|\n/).map(sansControle).filter((l) => l.trim() !== '');
  if (lignesBrutes.length < 2) throw new Error('il faut au moins une ligne d’en-têtes et une ligne de données');
  // Le découpage en lignes précède les guillemets : un champ sur plusieurs lignes scindait un élève
  // en deux sans un mot → refus explicite (nombre impair de « " » sur une ligne) (audit 2026-09-07, C04).
  if (lignesBrutes.some((l) => (l.match(/"/g) || []).length % 2)) {
    throw new Error('champ sur plusieurs lignes non pris en charge — réenregistrez le CSV sans retour à la ligne dans les cellules');
  }
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
        champs.push(propre(courant));
        courant = '';
      } else {
        courant += ch;
      }
    }
    champs.push(propre(courant));
    return champs;
  };
  return {
    separateur,
    entetes: decouper(lignesBrutes[0]),
    lignes: lignesBrutes.slice(1).map(decouper),
  };
}

// ---------------------------------------------------------------------------
// Écritures groupées : UNE transaction pour plusieurs stores (avis B29, v0.12.7).
// Règle : toutes les lectures ont lieu AVANT ; toutes les requêtes d'écriture sont émises
// de façon synchrone dans la transaction (aucun await entre elles) → le navigateur valide
// tout ou annule tout, même si l'onglet est fermé ou l'app tuée en cours de route.
// ---------------------------------------------------------------------------

// operations = [{ store, op: 'put', valeur } | { store, op: 'delete', cle } | { store, op: 'clear' }]
// Un refus d'écriture du navigateur arrive en anglais technique (« QuotaExceededError ») : on garde
// le détail mais on dit quoi faire (audit 2026-09-07, B41). Le verrou multi-onglets (ouvrirDB) parle déjà.
function motifEcriture(err) {
  if (err?.name !== 'QuotaExceededError') return err;
  return new Error(`${err.message || 'QuotaExceededError'} — mémoire de l’appareil pleine : exportez une sauvegarde (Plus → Sauvegarde), puis libérez de l’espace sur l’appareil`);
}

async function ecrireLot(operations) {
  if (!operations.length) return;
  const stores = [...new Set(operations.map((o) => o.store))];
  const inconnu = stores.find((s) => !SCHEMA[s]);
  if (inconnu) throw new Error(`store inconnu « ${inconnu} »`);
  const db = await ouvrirDB();
  await new Promise((resoudre, rejeter) => {
    const tx = db.transaction(stores, 'readwrite');
    tx.oncomplete = resoudre;
    // Pendant la propagation d'une erreur de requête, tx.error est encore null : l'erreur vit sur
    // la requête (ev.target) — sinon `e.message` levait un TypeError (audit 2026-09-07, D-07).
    tx.onerror = (ev) => rejeter(motifEcriture(ev.target?.error || tx.error || new Error('écriture refusée')));
    tx.onabort = () => rejeter(motifEcriture(tx.error || new Error('écriture interrompue')));
    try {
      for (const o of operations) {
        const st = tx.objectStore(o.store);
        if (o.op === 'clear') st.clear();
        else if (o.op === 'delete') st.delete(o.cle);
        else st.put(o.valeur);
      }
    } catch (e) {
      tx.abort(); // erreur synchrone (clé absente, valeur non clonable…) : rien n'est écrit
      rejeter(motifEcriture(e));
    }
  });
}

// Façade publique de ecrireLot : mélange put et delete de stores DIFFÉRENTS dans une seule
// transaction (créations qui touchent un fichier + un enregistrement métier — avis créations
// atomiques, fix 2, v0.12.13). operations = [{ store, op:'put', valeur } | { store, op:'delete', cle }].
// Cas homogènes : restaurer (put) et supprimerLot (delete) ci-dessous.
export async function enregistrerLot(operations) {
  return ecrireLot(operations);
}

// { store: [records] } → supprime tous ces enregistrements en une transaction (tout ou rien).
export async function supprimerLot(objets) {
  const operations = [];
  for (const [store, records] of Object.entries(objets || {})) {
    const cle = SCHEMA[store]?.keyPath;
    for (const rec of records || []) operations.push({ store, op: 'delete', cle: cle ? rec?.[cle] : undefined });
  }
  return ecrireLot(operations);
}

// { store: [records] } → restaure des enregistrements supprimés (undo) en une transaction.
export async function restaurer(objets) {
  const operations = [];
  for (const [store, records] of Object.entries(objets || {})) {
    for (const rec of records || []) operations.push({ store, op: 'put', valeur: rec });
  }
  return ecrireLot(operations);
}

// ---------------------------------------------------------------------------
// Cascades de suppression (IndexedDB n'a pas de clés étrangères) —
// règles documentées dans docs/modele-donnees.md.
// Chaque cascade COLLECTE d'abord (lectures), puis supprime en UNE transaction ;
// elle renvoie { <store>: [records supprimés] } pour l'annulation via restaurer().
// ---------------------------------------------------------------------------

async function collecterSeance(seanceId) {
  const objets = { appels: await parIndex('appels', 'seanceId', seanceId), seances: [] };
  const seance = await lire('seances', seanceId);
  if (seance) objets.seances.push(seance);
  return objets;
}

export async function supprimerSeanceEnCascade(seanceId) {
  const objets = await collecterSeance(seanceId);
  await supprimerLot(objets);
  return objets;
}

export async function supprimerSequenceEnCascade(sequenceId) {
  const objets = { seances: [], appels: [], evaluations: [], notes: [], sequences: [] };
  for (const s of await parIndex('seances', 'sequenceId', sequenceId)) {
    const o = await collecterSeance(s.id);
    objets.seances.push(...o.seances);
    objets.appels.push(...o.appels);
  }
  for (const ev of await parIndex('evaluations', 'sequenceId', sequenceId)) {
    objets.notes.push(...(await parIndex('notes', 'evaluationId', ev.id)));
    objets.evaluations.push(ev);
  }
  const sequence = await lire('sequences', sequenceId);
  if (sequence) objets.sequences.push(sequence);
  await supprimerLot(objets);
  return objets;
}

export async function supprimerEleveEnCascade(eleveId) {
  const objets = { appels: [], inaptitudes: [], certificats: [], notes: [], observations: [], fichiers: [], eleves: [] };
  objets.appels = await parIndex('appels', 'eleveId', eleveId);
  objets.inaptitudes = await parIndex('inaptitudes', 'eleveId', eleveId);
  objets.certificats = await parIndex('certificats', 'eleveId', eleveId);
  for (const c of objets.certificats) {
    if (!c.fichierId) continue;
    const f = await lire('fichiers', c.fichierId);
    if (f) objets.fichiers.push(f);
  }
  objets.notes = await parIndex('notes', 'eleveId', eleveId);
  objets.observations = await parIndex('observations', 'eleveId', eleveId);
  const eleve = await lire('eleves', eleveId);
  if (eleve?.photoFichierId) {
    const f = await lire('fichiers', eleve.photoFichierId);
    if (f) objets.fichiers.push(f);
  }
  if (eleve) objets.eleves.push(eleve);
  await supprimerLot(objets);
  return objets;
}

// ---------------------------------------------------------------------------
// Aperçu des suppressions en cascade (pour afficher l'impact dans la confirmation).
// ---------------------------------------------------------------------------

// Comptages par `count()` sur l'index : l'aperçu chargeait les mêmes enregistrements que la
// cascade qui suit (audit 2026-09-07, C37).
export async function apercuSuppressionEleve(eleveId) {
  return {
    appels: await compterIndex('appels', 'eleveId', eleveId),
    inaptitudes: await compterIndex('inaptitudes', 'eleveId', eleveId),
    certificats: await compterIndex('certificats', 'eleveId', eleveId),
    notes: await compterIndex('notes', 'eleveId', eleveId),
    observations: await compterIndex('observations', 'eleveId', eleveId),
  };
}

export async function apercuSuppressionSequence(sequenceId) {
  const seances = await parIndex('seances', 'sequenceId', sequenceId);
  let appels = 0;
  for (const s of seances) appels += await compterIndex('appels', 'seanceId', s.id);
  const evaluations = await parIndex('evaluations', 'sequenceId', sequenceId);
  let notes = 0;
  for (const ev of evaluations) notes += await compterIndex('notes', 'evaluationId', ev.id);
  return { seances: seances.length, appels, evaluations: evaluations.length, notes };
}

// [singulier, pluriel] par store de données (`meta` exclu) — partagé par les aperçus de suppression
// et le résumé de l'écran Sauvegarde (C38) : tout store de données doit y figurer, sinon il disparaît
// du résumé affiché avant un import qui REMPLACE tout.
export const LIBELLES = {
  classes: ['classe', 'classes'],
  eleves: ['élève', 'élèves'],
  edt: ['créneau EDT', 'créneaux EDT'],
  sequences: ['séquence', 'séquences'],
  seances: ['séance', 'séances'],
  appels: ['appel', 'appels'],
  inaptitudes: ['inaptitude', 'inaptitudes'],
  certificats: ['certificat', 'certificats'],
  fichiers: ['pièce jointe', 'pièces jointes'],
  evaluations: ['évaluation', 'évaluations'],
  notes: ['note', 'notes'],
  documents: ['document', 'documents'],
  observations: ['observation', 'observations'],
};

// { appels: 12, notes: 4 } → « Seront aussi supprimés : 12 appels, 4 notes. » (ignore les zéros).
export function detailSuppression(comptes) {
  const parts = Object.entries(comptes)
    .filter(([, n]) => n > 0)
    .map(([k, n]) => `${n} ${(LIBELLES[k] || [k, `${k}s`])[n > 1 ? 1 : 0]}`);
  return parts.length ? `Seront aussi supprimés : ${parts.join(', ')}.` : '';
}
