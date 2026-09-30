// Marqueurs de séance, v0.14.0 « le format seul » : schéma 4, compatibilité, sauvegardes, cascades.
// Contrat : docs/avis/AVIS_FORMAT_MARQUEURS.md (§11.1 — MIG-01 à MIG-07, MIG-09, MIG-10). v0.14.2 « poser et relire » :
// MIG-08 (orphelins et genres inconnus, à l'écran), MIG-11 (chaque cascade collecte et supprime dans UNE transaction :
// une pose écrite juste avant elle part avec elle, « Annuler » la rend) et MIG-12 (cascade avortée au commit). Hors
// MIG-08, les poses et le vocabulaire sont écrits par io.js directement. Données INVENTÉES uniquement (élèves « NOMxx Prenomx »).
// Chaque test AFFIRME ses prémisses avant de conclure : une absence sans ancre visible passe à vide.

import { test, expect } from '@playwright/test';

// Base vidée en DÉRIVANT la liste des magasins de io.STORES, jamais par une liste écrite à la main :
// une constante figée oublierait « marqueurs » et « marquages » comme d'autres specs ont oublié
// « grilles », et une pose laissée d'un test à l'autre polluerait le suivant sans rien dire.
// Erreurs console et exceptions écoutées AVANT la première navigation (motif smoke.spec.mjs) : seul MIG-08, qui rend des
// poses à l'écran, les affirme (l'exception d'une vue ne produit qu'un console.error, ui.js).
let erreurs = [];
test.beforeEach(async ({ page }) => {
  erreurs = [];
  page.on('console', (m) => { if (m.type() === 'error') erreurs.push(m.text()); });
  page.on('pageerror', (e) => erreurs.push(String(e)));
  await page.goto('/');
  await page.evaluate(async () => {
    const io = await import('/js/io.js');
    await io.ouvrirDB();
    for (const s of io.STORES) await io.vider(s);
  });
});

// Le schéma 3 tel qu'il a été publié (v0.13.0 → v0.13.5) : c'est de l'histoire, pas une valeur dérivée.
const SCHEMA_3 = {
  grilles: { keyPath: 'id' },
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
  observations: { keyPath: 'id', index: ['eleveId'] },
};

// Classe fictive de trois élèves, une séquence sans dates (active quel que soit le calendrier), deux
// séances à dates FIXES, des appels, trois marqueurs (un par genre) et, si demandé, six poses :
//   s1 : e1-ARB, e1-E1, e2-E1, e3-REC (4)   ·   s2 : e1-ARB, e2-REC (2)   →   e1 porte 3 poses.
async function peupler(page, { poses = true } = {}) {
  return page.evaluate(async (avecPoses) => {
    const io = await import('/js/io.js');
    await io.enregistrer('classes', { id: 'c1', nom: '6A', archivee: false });
    for (const i of [1, 2, 3]) {
      await io.enregistrer('eleves', { id: `e${i}`, classeId: 'c1', nom: `NOM0${i}`, prenom: `Prenom${i}`, actif: true });
    }
    await io.enregistrer('sequences', { id: 'sq', classeId: 'c1', apsa: 'Badminton', nbSeancesPrevu: 5, dateDebut: '', dateFin: '' });
    await io.enregistrer('seances', { id: 's1', sequenceId: 'sq', date: '2026-09-14', numero: 1, theme: '', bilan: '' });
    await io.enregistrer('seances', { id: 's2', sequenceId: 'sq', date: '2026-09-21', numero: 2, theme: '', bilan: '' });
    for (const [s, e] of [['s1', 'e1'], ['s1', 'e2'], ['s1', 'e3'], ['s2', 'e1'], ['s2', 'e2']]) {
      await io.enregistrer('appels', { id: `${s}_${e}`, seanceId: s, eleveId: e, statut: 'present', minutesRetard: null, commentaire: '' });
    }
    await io.ecrireMarqueur('mq-arb', { libelle: 'Arbitre', court: 'ARB', genre: 'role', couleur: 'bleu' });
    await io.ecrireMarqueur('mq-e1', { libelle: 'Équipe 1', court: 'E1', genre: 'groupe', couleur: 'vert' });
    await io.ecrireMarqueur('mq-rec', { libelle: 'À recadrer', court: 'REC', genre: 'comportement' });
    if (avecPoses) {
      await io.appliquerMarquages('s1', [
        { eleveId: 'e1', marqueurId: 'mq-arb', op: 'poser' },
        { eleveId: 'e1', marqueurId: 'mq-e1', op: 'poser' },
        { eleveId: 'e2', marqueurId: 'mq-e1', op: 'poser' },
        { eleveId: 'e3', marqueurId: 'mq-rec', op: 'poser' },
      ]);
      await io.appliquerMarquages('s2', [
        { eleveId: 'e1', marqueurId: 'mq-arb', op: 'poser' },
        { eleveId: 'e2', marqueurId: 'mq-rec', op: 'poser' },
      ]);
    }
  }, poses);
}

// Magasins de marqueurs relus, triés par identifiant (comparaisons indépendantes de l'ordre de lecture).
const lireMarqueurs = (page) => page.evaluate(async () => {
  const io = await import('/js/io.js');
  const tri = (l) => l.sort((a, b) => a.id.localeCompare(b.id));
  return { marqueurs: tri(await io.tous('marqueurs')), marquages: tri(await io.tous('marquages')) };
});

// Magasins quelconques relus en entier, triés par identifiant.
const lireTout = (page, magasins) => page.evaluate(async (liste) => {
  const io = await import('/js/io.js');
  const res = {};
  for (const m of liste) res[m] = (await io.tous(m)).sort((a, b) => a.id.localeCompare(b.id));
  return res;
}, magasins);
const trierParId = (l) => [...l].sort((a, b) => a.id.localeCompare(b.id));

// Écrit `lignes` ({ magasin: [enregistrements] }) dans une transaction créée JUSTE AVANT la prochaine transaction readwrite
// dont la portée contient `declencheur` (généralisation d'injecterAvantEcriture, marqueurs.spec.mjs). IndexedDB exécute dans
// leur ordre de création les transactions d'écriture de portées communes : l'écriture « de l'autre onglet » tombe au pire
// moment — après toute lecture faite AVANT la transaction visée, avant la transaction elle-même. `window.__injecte` atteste
// le déclenchement, `window.__injecteOk` la validation de la transaction injectée ; `window.__dansInjecteur` est vrai
// pendant sa création (une sonde de comptage posée AVANT l'injecteur l'exclut ainsi).
const injecterAvant = (page, { declencheur, lignes }) => page.evaluate(({ declencheur, lignes }) => {
  const origine = IDBDatabase.prototype.transaction;
  window.__injecte = false;
  window.__injecteOk = false;
  window.__dansInjecteur = false;
  IDBDatabase.prototype.transaction = function (stores, mode, ...reste) {
    if (!window.__injecte && mode === 'readwrite' && [].concat(stores).includes(declencheur)) {
      window.__injecte = true;
      IDBDatabase.prototype.transaction = origine;
      window.__dansInjecteur = true;
      try {
        const tx = origine.call(this, Object.keys(lignes), 'readwrite');
        tx.oncomplete = () => { window.__injecteOk = true; };
        for (const [magasin, liste] of Object.entries(lignes)) for (const l of liste) tx.objectStore(magasin).put(l);
      } finally {
        window.__dansInjecteur = false;
      }
    }
    return origine.call(this, stores, mode, ...reste);
  };
}, { declencheur, lignes });

test('MIG-01 — montée 3 → 4 : « marqueurs » et « marquages » naissent avec leurs trois index, un appel du schéma 3 est relu à l’identique', async ({ page }) => {
  const APPEL = { id: 'sa_ea', seanceId: 'sa', eleveId: 'ea', statut: 'retard', minutesRetard: 12, commentaire: 'Commentaire fictif' };
  // Base de schéma 3 créée AVANT le chargement de io.js (page sans application).
  await page.goto('/css/base.css');
  const avant = await page.evaluate(async ({ schema3, appel }) => {
    await new Promise((ok, ko) => { const r = indexedDB.deleteDatabase('carnet-eps'); r.onsuccess = ok; r.onerror = () => ko(r.error); });
    await new Promise((ok, ko) => {
      const r = indexedDB.open('carnet-eps', 3);
      r.onupgradeneeded = () => {
        for (const [nom, def] of Object.entries(schema3)) {
          const s = r.result.createObjectStore(nom, { keyPath: def.keyPath });
          for (const champ of def.index || []) s.createIndex(champ, champ);
        }
      };
      r.onsuccess = () => {
        const db = r.result;
        const tx = db.transaction('appels', 'readwrite');
        tx.objectStore('appels').put(appel);
        tx.oncomplete = () => { db.close(); ok(); };
        tx.onerror = () => ko(tx.error);
      };
      r.onerror = () => ko(r.error);
    });
    return new Promise((ok, ko) => {
      const r = indexedDB.open('carnet-eps'); // sans version : l'état réel de la base, sans la monter
      r.onsuccess = () => { const db = r.result; const etat = { version: db.version, stores: [...db.objectStoreNames] }; db.close(); ok(etat); };
      r.onerror = () => ko(r.error);
    });
  }, { schema3: SCHEMA_3, appel: APPEL });
  expect(avant.version).toBe(3);
  expect(avant.stores).not.toContain('marquages');
  expect(avant.stores).not.toContain('marqueurs');

  await page.goto('/'); // l'application ouvre la base : c'est elle qui la monte
  const apres = await page.evaluate(async () => {
    const io = await import('/js/io.js');
    const db = await io.ouvrirDB();
    const tx = db.transaction(['marqueurs', 'marquages']);
    return {
      version: db.version,
      stores: [...db.objectStoreNames].sort(),
      attendus: [...io.STORES].sort(),
      indexMarquages: [...tx.objectStore('marquages').indexNames].sort(),
      indexMarqueurs: [...tx.objectStore('marqueurs').indexNames],
      cleMarquages: tx.objectStore('marquages').keyPath,
      appel: await io.lire('appels', 'sa_ea'),
    };
  });
  expect(apres.version).toBe(4);
  expect(apres.stores).toEqual(apres.attendus);
  expect(apres.indexMarquages).toEqual(['eleveId', 'marqueurId', 'seanceId']);
  expect(apres.indexMarqueurs).toEqual([]); // aucun index sur le vocabulaire (§2)
  expect(apres.cleMarquages).toBe('id');
  expect(apres.appel).toEqual(APPEL); // champ pour champ
});

test('MIG-02 — une base montée en 4 refuse de s’ouvrir en 3 (VersionError) et rend ensuite les mêmes marquages', async ({ page }) => {
  await peupler(page);
  const avant = await lireMarqueurs(page);
  expect(avant.marquages.length).toBe(6); // prémisse : la pose existe avant la tentative
  const tentative = await page.evaluate(() => new Promise((ok) => {
    const r = indexedDB.open('carnet-eps', 3); // ce que fait une v0.13.5 (DB_VERSION = 3)
    r.onupgradeneeded = () => ok({ nom: 'onupgradeneeded déclenché' });
    r.onsuccess = () => { const v = r.result.version; r.result.close(); ok({ nom: 'ouverte', version: v }); };
    r.onerror = () => ok({ nom: r.error?.name });
  }));
  expect(tentative).toEqual({ nom: 'VersionError' });
  await page.reload(); // rouverte en 4 par l'application, connexion neuve
  expect(await lireMarqueurs(page)).toEqual(avant);

  // Pour la montée suivante : devant une base plus récente que lui, io.js dit quoi faire au lieu de
  // relayer le texte anglais de la DOMException.
  const message = await page.evaluate(async () => {
    const io = await import('/js/io.js');
    await io.ouvrirDB();
    await new Promise((ok, ko) => { // un autre onglet monte la base en 5 : la connexion de l'app se retire
      const r = indexedDB.open('carnet-eps', 5);
      r.onsuccess = () => { r.result.close(); ok(); };
      r.onerror = () => ko(r.error);
    });
    try { await io.ouvrirDB(); return 'ouverte'; } catch (e) { return `${e?.cause?.name} | ${e?.message}`; }
  });
  expect(message).toBe('VersionError | cet appareil a déjà ouvert le carnet avec une version plus récente de l’application — rechargez la page');
});

test('MIG-03 — un cycle présent → absent → oubli de tenue (definirStatut) laisse les marqueurs intacts', async ({ page }) => {
  await peupler(page, { poses: false });
  const pose = await page.evaluate(async () => {
    const io = await import('/js/io.js');
    await io.enregistrer('appels', { id: 's1_e1', seanceId: 's1', eleveId: 'e1', statut: 'present', minutesRetard: null, commentaire: 'Commentaire fictif' });
    const res = await io.appliquerMarquages('s1', [{ eleveId: 'e1', marqueurId: 'mq-arb', op: 'poser' }]);
    return res.marquages;
  });
  expect(pose).toHaveLength(1);
  const avant = await lireMarqueurs(page);
  expect(avant.marquages).toEqual(pose);

  await page.goto('/#/appel/s1');
  const carte = page.locator('.btn-eleve[aria-label="Prenom1 NOM01"] .eleve-cycle');
  await expect(carte).toBeVisible();
  const appel = () => page.evaluate(async () => (await (await import('/js/io.js')).lire('appels', 's1_e1')));
  await carte.click();
  await expect.poll(async () => (await appel()).statut).toBe('absent');
  await carte.click();
  await expect.poll(async () => (await appel()).statut).toBe('oubli_tenue');
  // Prémisse : definirStatut a bien RÉÉCRIT l'enregistrement (statut changé) en héritant du commentaire.
  expect((await appel()).commentaire).toBe('Commentaire fictif');
  expect(await lireMarqueurs(page)).toEqual(avant); // poses intactes, champ pour champ
});

test('MIG-04 — aller-retour JSON sans perte : schemaVersion 4, vocabulaire et poses identiques (comparaison canonique)', async ({ page }) => {
  await peupler(page);
  const res = await page.evaluate(async () => {
    const io = await import('/js/io.js');
    const canon = (v) => (v && typeof v === 'object'
      ? (Array.isArray(v) ? v.map(canon).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)))
        : Object.fromEntries(Object.keys(v).sort().map((k) => [k, canon(v[k])])))
      : v);
    const dump = await io.exporterJSON();
    const comptes = { marqueurs: dump.stores.marqueurs.length, marquages: dump.stores.marquages.length };
    await io.viderTout();
    const vide = (await io.tous('marqueurs')).length + (await io.tous('marquages')).length;
    await io.importerJSON(JSON.parse(JSON.stringify(dump))); // comme un fichier réel
    const relu = await io.exporterJSON();
    return {
      schema: dump.schemaVersion, comptes, vide,
      identiques: JSON.stringify(canon(relu.stores)) === JSON.stringify(canon(dump.stores)),
      marqueursIdentiques: JSON.stringify(canon(relu.stores.marqueurs)) === JSON.stringify(canon(dump.stores.marqueurs)),
      posesIdentiques: JSON.stringify(canon(relu.stores.marquages)) === JSON.stringify(canon(dump.stores.marquages)),
    };
  });
  expect(res.comptes).toEqual({ marqueurs: 3, marquages: 6 }); // prémisse : il y avait de quoi perdre
  expect(res.vide).toBe(0); // prémisse : l'aller-retour a bien eu lieu
  expect(res.schema).toBe(4);
  expect(res.marqueursIdentiques).toBe(true);
  expect(res.posesIdentiques).toBe(true);
  expect(res.identiques).toBe(true);
});

test('MIG-05 — une sauvegarde de schéma 3 reste restaurable : marqueurs et marqueurs posés sont vidés ET annoncés', async ({ page }) => {
  await peupler(page);
  const avant = await lireMarqueurs(page);
  expect(avant.marqueurs.length).toBeGreaterThan(0); // prémisse : il y a bien de quoi vider
  expect(avant.marquages.length).toBeGreaterThan(0);
  const stores = Object.fromEntries(Object.keys(SCHEMA_3).map((nom) => [nom, []]));
  stores.classes = [{ id: 'c9', nom: '5C', archivee: false }];
  const dump = { app: 'carnet-eps', schemaVersion: 3, dateExport: '2026-09-20T10:00:00', stores };
  await page.goto('/#/sauvegarde');
  await page.locator('input[type=file][accept*="json"]').setInputFiles({ name: 'sauvegarde.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(dump)) });
  const dlg = page.locator('dialog.feuille-confirm');
  await expect(dlg).toContainText('Sauvegarde du 2026-09-20');
  // Le TEXTE de la confirmation (sauvegarde.js), pas seulement l'état de la base après coup.
  await expect(dlg).toContainText('Le fichier ne contient pas : marqueurs, marqueurs posés → seront vidées.');
  const telechargement = page.waitForEvent('download');
  await dlg.getByRole('button', { name: 'Importer' }).click();
  await telechargement;
  await dlg.getByRole('button', { name: 'Remplacer' }).click();
  await expect(page.locator('.toast').last()).toContainText('Import terminé');
  await expect.poll(() => page.evaluate(async () => (await (await import('/js/io.js')).tous('classes')).map((c) => c.nom))).toEqual(['5C']);
  await expect.poll(async () => { const m = await lireMarqueurs(page); return m.marqueurs.length + m.marquages.length; }).toBe(0);
});

test('MIG-06 — une sauvegarde de schéma 5 est refusée avant toute écriture ; la même en schéma 4 est acceptée', async ({ page }) => {
  await peupler(page);
  const res = await page.evaluate(async () => {
    const io = await import('/js/io.js');
    const dump = await io.exporterJSON();
    dump.stores.classes[0].nom = 'IMPORTÉE'; // ce que l'import écrirait s'il passait
    const avant = await io.compterTout();
    const dump5 = { ...structuredClone(dump), schemaVersion: 5 };
    let refus = null;
    try { await io.importerJSON(dump5); } catch (e) { refus = e?.message || String(e); }
    const apresRefus = await io.compterTout();
    const nomApresRefus = (await io.lire('classes', 'c1')).nom;
    // Témoin, dans le même test : le MÊME contenu en schéma 4 passe.
    await io.importerJSON({ ...structuredClone(dump), schemaVersion: 4 });
    return { avant, refus, apresRefus, nomApresRefus, nomApresTemoin: (await io.lire('classes', 'c1')).nom, poses: (await io.tous('marquages')).length };
  });
  expect(res.avant.marquages).toBe(6);
  expect(res.refus).toContain('version plus récente de l’app (schéma 5 > 4)');
  expect(res.apresRefus).toEqual(res.avant); // la base n'est pas vidée
  expect(res.nomApresRefus).toBe('6A');
  expect(res.nomApresTemoin).toBe('IMPORTÉE');
  expect(res.poses).toBe(6);
});

test('MIG-07 — sauvegarde altérée refusée cas par cas, base intacte ; champs facultatifs absents et champ inconnu acceptés et relus tels quels', async ({ page }) => {
  await peupler(page);
  const res = await page.evaluate(async () => {
    const io = await import('/js/io.js');
    const base = await io.exporterJSON();
    const etat = async () => JSON.stringify([await io.compterTout(), await io.tous('marqueurs'), await io.tous('marquages')]);
    let temoin = null;
    try { io.validerExport(base); temoin = 'accepté'; } catch (e) { temoin = e.message; }
    const defauts = {
      'libellé vide': (d) => { d.stores.marqueurs[0].libelle = '   '; },
      'libellé de 41 caractères': (d) => { d.stores.marqueurs[0].libelle = 'L'.repeat(41); },
      'code court vide': (d) => { d.stores.marqueurs[0].court = ''; },
      'code court non alphanumérique': (d) => { d.stores.marqueurs[0].court = '-*'; },
      'occurrences à 0': (d) => { d.stores.marquages[0].occurrences = 0; },
      'id de pose incohérent': (d) => { d.stores.marquages[0].id = 'autre-cle'; },
      // Règles de forme ajoutées après la revue de la v0.14.0 : sans elles, leurs mutants survivaient.
      'code court de 4 caractères': (d) => { d.stores.marqueurs[0].court = 'ARBI'; },
      'code court avec un espace': (d) => { d.stores.marqueurs[0].court = 'A B'; },
      'genre non texte': (d) => { d.stores.marqueurs[0].genre = 1; },
      'couleur non texte': (d) => { d.stores.marqueurs[0].couleur = 1; },
      'archivage non booléen': (d) => { d.stores.marqueurs[0].archivee = 'false'; },
      'occurrences non entier': (d) => { d.stores.marquages[0].occurrences = 1.5; },
      'courtSecours non texte': (d) => { d.stores.marquages[0].courtSecours = 3; },
      'genreSecours non texte': (d) => { d.stores.marquages[0].genreSecours = 3; },
      'dateAjout non texte': (d) => { d.stores.marquages[0].dateAjout = 3; },
    };
    const refus = {};
    const intacte = {};
    for (const [nom, alterer] of Object.entries(defauts)) {
      const avant = await etat();
      const d = structuredClone(base);
      alterer(d);
      try { await io.importerJSON(d); refus[nom] = 'ACCEPTÉ'; } catch (e) { refus[nom] = e?.message || String(e); }
      intacte[nom] = (await etat()) === avant;
    }
    // Cas inverses : acceptés, et relus TELS QUELS (rien d'ajouté, rien de retiré).
    const acceptes = {};
    const relire = async (store, id) => io.lire(store, id);
    // (a) une pose sans courtSecours, genreSecours ni occurrences.
    const a = structuredClone(base);
    const poseA = a.stores.marquages[0];
    delete poseA.courtSecours; delete poseA.genreSecours; delete poseA.occurrences;
    try { await io.importerJSON(a); acceptes.poseNue = JSON.stringify(await relire('marquages', poseA.id)) === JSON.stringify(poseA); } catch (e) { acceptes.poseNue = e.message; }
    // (b) un marqueur sans genre, sans couleur ni archivee.
    const b = structuredClone(base);
    const mqB = b.stores.marqueurs[0];
    delete mqB.genre; delete mqB.couleur; delete mqB.archivee;
    try { await io.importerJSON(b); acceptes.marqueurNu = JSON.stringify(await relire('marqueurs', mqB.id)) === JSON.stringify(mqB); } catch (e) { acceptes.marqueurNu = e.message; }
    // (c) un champ inconnu (version future) sur un marqueur et sur une pose, lu depuis un FICHIER.
    const c = structuredClone(base);
    c.stores.marqueurs[1].famille = 'x';
    c.stores.marquages[1].famille = 'x';
    const fichier = JSON.parse(JSON.stringify(c));
    const inconnuDansFichier = fichier.stores.marqueurs[1].famille === 'x' && fichier.stores.marquages[1].famille === 'x';
    try {
      await io.importerJSON(fichier);
      acceptes.inconnu = JSON.stringify(await relire('marqueurs', c.stores.marqueurs[1].id)) === JSON.stringify(c.stores.marqueurs[1])
        && JSON.stringify(await relire('marquages', c.stores.marquages[1].id)) === JSON.stringify(c.stores.marquages[1]);
    } catch (e) { acceptes.inconnu = e.message; }
    return { temoin, refus, intacte, acceptes, inconnuDansFichier, champsPose: Object.keys(base.stores.marquages[0]).sort(), champsMarqueur: Object.keys(base.stores.marqueurs[0]).sort() };
  });
  expect(res.temoin).toBe('accepté'); // prémisse : le dump de base, sans la faute, passe
  // Prémisse des cas inverses : l'application écrit bien les champs qu'on retire ensuite.
  expect(res.champsPose).toEqual(['courtSecours', 'dateAjout', 'eleveId', 'genreSecours', 'id', 'marqueurId', 'occurrences', 'seanceId']);
  expect(res.champsMarqueur).toEqual(['archivee', 'couleur', 'court', 'genre', 'id', 'libelle']);
  expect(res.inconnuDansFichier).toBe(true);
  const MQ = 'sauvegarde altérée : « marqueurs » ligne 1 — ', MG = 'sauvegarde altérée : « marquages » ligne 1 — ';
  const attendu = {
    'libellé vide': `${MQ}libellé de marqueur vide`,
    'libellé de 41 caractères': `${MQ}libellé de marqueur trop long (40 caractères au plus)`,
    'code court vide': `${MQ}code court vide`,
    'code court non alphanumérique': `${MQ}code court sans lettre ni chiffre`,
    'occurrences à 0': `${MG}nombre d’occurrences invalide (entier supérieur ou égal à 1)`,
    'id de pose incohérent': `${MG}identifiant de pose incohérent avec sa séance, son élève et son marqueur`,
    'code court de 4 caractères': `${MQ}code court de 1 à 3 caractères, sans espace`,
    'code court avec un espace': `${MQ}code court de 1 à 3 caractères, sans espace`,
    'genre non texte': `${MQ}genre de marqueur illisible`,
    'couleur non texte': `${MQ}couleur de marqueur illisible`,
    'archivage non booléen': `${MQ}archivage de marqueur illisible`,
    'occurrences non entier': `${MG}nombre d’occurrences invalide (entier supérieur ou égal à 1)`,
    'courtSecours non texte': `${MG}« courtSecours » doit être un texte`,
    'genreSecours non texte': `${MG}« genreSecours » doit être un texte`,
    'dateAjout non texte': `${MG}« dateAjout » doit être un texte`,
  };
  expect(res.refus).toEqual(attendu); // chaque cas refusé, avec SON message
  // Un message par RÈGLE : deux cas qui violent la même règle partagent son message, deux règles jamais.
  expect(new Set(Object.values(res.refus)).size).toBe(new Set(Object.values(attendu)).size);
  expect(res.intacte).toEqual(Object.fromEntries(Object.keys(res.refus).map((k) => [k, true])));
  expect(res.acceptes).toEqual({ poseNue: true, marqueurNu: true, inconnu: true });
});

// Navigation par le hash (DEUXIÈME rendu : afficherVue rend le focus à #vue en fin de rendu, ui.js) : attend un conteneur
// #vue NEUF qui a reçu le focus — le rendu est TERMINÉ (aides dupliquées de marqueurs-ecran.spec.mjs, convention du dépôt).
async function naviguer(page, hash) {
  await page.evaluate((h) => { window.__vuePrecedente = document.getElementById('vue'); location.hash = h; }, hash);
  await expect.poll(() => page.evaluate(() => {
    const v = document.getElementById('vue');
    return v !== window.__vuePrecedente && document.activeElement === v;
  })).toBe(true);
}
async function ouvrirAppel(page, seanceId, n) {
  await naviguer(page, `#/appel/${seanceId}`);
  await expect(page.locator('.btn-eleve')).toHaveCount(n);
}
// Rangée de la carte de chaque élève, dans l'ordre de la grille : codes (texte, orphelin, couleur), repères, nom accessible.
const lireRangees = (page) => page.evaluate(() => [...document.querySelectorAll('.btn-eleve')].map((carte) => {
  const rang = carte.querySelector('.rang-marqueurs-carte');
  if (!rang) return null;
  return {
    texte: rang.textContent,
    codes: [...rang.querySelectorAll('[data-mq-rang]')].map((c) => ({
      court: c.textContent, orphelin: c.hasAttribute('data-mq-orphelin'), couleur: c.getAttribute('data-niveau-couleur') })),
    mqCodes: rang.querySelectorAll('.mq-code').length,
    reperes: rang.querySelectorAll('.mq-neutre').length,
    nom: rang.querySelector('.sr-only')?.textContent ?? null,
  };
}));

test('MIG-08 — orphelins et genres inconnus : import accepté, rendu à l’écran sans erreur (le genre décide, code gris ou repère), orphelin retirable jamais reposable ; ordre du catalogue', async ({ page }) => {
  await peupler(page, { poses: false });
  // Sauvegarde RÉELLE (exporterJSON), vocabulaire vidé, quatre poses orphelines sur s1 : c'est ce qu'un import rend
  // quand le marqueur a disparu du vocabulaire. Le format n'impose aucun contrôle relationnel (décision 16).
  const orphelins = [
    { id: 's1_e1_x-role', seanceId: 's1', eleveId: 'e1', marqueurId: 'x-role', occurrences: 1, genreSecours: 'role', courtSecours: 'BX7', dateAjout: '2026-09-14T10:00:00.000Z' },
    { id: 's1_e1_x-grp', seanceId: 's1', eleveId: 'e1', marqueurId: 'x-grp', occurrences: 1, genreSecours: 'groupe', dateAjout: '2026-09-14T10:00:00.000Z' },
    { id: 's1_e2_x-comp', seanceId: 's1', eleveId: 'e2', marqueurId: 'x-comp', occurrences: 1, genreSecours: 'comportement', dateAjout: '2026-09-14T10:00:00.000Z' },
    { id: 's1_e3_x-inc', seanceId: 's1', eleveId: 'e3', marqueurId: 'x-inc', occurrences: 1, courtSecours: 'ZZ', dateAjout: '2026-09-14T10:00:00.000Z' },
  ];
  await page.evaluate(async (poses) => {
    const io = await import('/js/io.js');
    const dump = await io.exporterJSON();
    dump.stores.marqueurs = [];
    dump.stores.marquages = poses;
    await io.importerJSON(JSON.parse(JSON.stringify(dump))); // comme un fichier réel
  }, orphelins);
  // Prémisses : l'import a bien écrit les quatre orphelins, et le vocabulaire est bien VIDE.
  const relus = await lireMarqueurs(page);
  expect(relus.marqueurs).toEqual([]);
  expect(relus.marquages).toEqual(trierParId(orphelins));

  await ouvrirAppel(page, 's1', 3);
  await expect(page.locator('#vue')).not.toContainText('Affichage impossible');
  // Prémisse : vocabulaire vide, la rangée existe quand même — elle vient des poses de la séance (M88).
  await expect(page.locator('.btn-eleve .rang-marqueurs-carte')).toHaveCount(3);
  const [r1, r2, r3] = await lireRangees(page);
  for (const r of [r1, r2, r3]) expect(r.texte).not.toBe('');
  // e1 : deux orphelins rôle et équipe → codes GRIS (aucune couleur), dans l'ordre des genres ; sans courtSecours → « ? ».
  expect(r1.codes).toEqual([
    { court: 'BX7', orphelin: true, couleur: null },
    { court: '?', orphelin: true, couleur: null },
  ]);
  expect(r1.nom).toBe('Marqueurs : marqueur supprimé (BX7), marqueur supprimé (?)');
  // e2 : orphelin comportement → le repère neutre, aucun code (jamais « ? »).
  expect(r2.mqCodes).toBe(0);
  expect(r2.reperes).toBe(1);
  expect(r2.nom).toBe('Marqueurs : 1 comportement noté');
  // e3 : orphelin SANS genre mais avec un courtSecours → le GENRE décide d'abord : repère, ni « ZZ » ni « ? ».
  expect(r3.mqCodes).toBe(0);
  expect(r3.reperes).toBe(1);
  expect(r3.texte).not.toContain('ZZ');
  expect(r3.texte).not.toContain('?');

  // Feuille « ⋯ » de e1 : l'orphelin est montré, posé, marqué comme tel (E114) ; retirable, jamais reposable (C11, C12).
  await page.locator('.btn-eleve').nth(0).locator('.eleve-menu').click();
  const dlg = page.locator('dialog.feuille[open]');
  await expect(dlg).toHaveCount(1);
  const orphBX7 = dlg.locator('.btn-marqueur', { hasText: 'marqueur supprimé (BX7)' });
  await expect(orphBX7).toHaveCount(1);
  await expect(orphBX7).toHaveAttribute('aria-pressed', 'true');
  await expect(orphBX7).toHaveAttribute('data-mq-orphelin', '');
  await expect(orphBX7).not.toHaveAttribute('aria-disabled', 'true');
  await expect(dlg.locator('.btn-marqueur', { hasText: 'marqueur supprimé (?)' })).toHaveAttribute('aria-pressed', 'true');
  await orphBX7.click();
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
  await expect.poll(async () => (await lireMarqueurs(page)).marquages.map((p) => p.id))
    .toEqual(['s1_e1_x-grp', 's1_e2_x-comp', 's1_e3_x-inc']);
  // L'annonce commence par une majuscule, même quand le libellé est le repli « marqueur supprimé » (revue v0.14.2, K4) ; feuille
  // ouverte, elle va dans la région de la feuille (D1 : celle de la vue, sous la modale, est inerte).
  await expect(dlg.locator(':scope > p.sr-only[role="status"]')).toHaveText('Marqueur supprimé retiré de Prenom1 NOM01.');
  // Retiré, il reste EN PLACE, non pressé et verrouillé ; un second geste ne le repose pas.
  await expect(orphBX7).toHaveAttribute('aria-pressed', 'false');
  await expect(orphBX7).toHaveAttribute('aria-disabled', 'true');
  await orphBX7.click({ force: true }); // aria-disabled : Playwright refuse le clic, un doigt le fait
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
  expect((await lireMarqueurs(page)).marquages.map((p) => p.id)).toEqual(['s1_e1_x-grp', 's1_e2_x-comp', 's1_e3_x-inc']);
  await dlg.getByRole('button', { name: 'Fermer', exact: true }).click();
  await expect(dlg).toHaveCount(0);

  // Phase 2 — marqueurs CONNUS de genre inconnu ou absent (écrits bruts : ecrireMarqueur les refuserait) : comportements.
  await page.evaluate(async () => {
    const io = await import('/js/io.js');
    await io.enregistrer('marqueurs', { id: 'x-inc', libelle: 'Aide', court: 'AI', genre: 'inconnu' });
    await io.enregistrer('marqueurs', { id: 'x-sans', libelle: 'Zèle', court: 'ZL' });
    await io.enregistrer('marquages', { id: 's1_e2_x-sans', seanceId: 's1', eleveId: 'e2', marqueurId: 'x-sans', occurrences: 1, dateAjout: '2026-09-14T10:00:00.000Z' });
  });
  expect((await lireMarqueurs(page)).marqueurs.map((m) => m.id)).toEqual(['x-inc', 'x-sans']); // prémisse
  await naviguer(page, '#/appel');
  await ouvrirAppel(page, 's1', 3);
  await expect(page.locator('#vue')).not.toContainText('Affichage impossible');
  const [, q2, q3] = await lireRangees(page);
  // e3 : « x-inc » n'est plus orphelin, son genre inconnu le range en comportement — le vocabulaire gagne (§5.2 règle 1).
  expect(q3.reperes).toBe(1);
  expect(q3.mqCodes).toBe(0);
  expect(q3.texte).not.toContain('AI');
  expect(q3.texte).not.toContain('ZZ');
  // e2 : un orphelin comportement + un marqueur sans genre = deux repères, comptés sans être nommés.
  expect(q2.reperes).toBe(2);
  expect(q2.mqCodes).toBe(0);
  expect(q2.nom).toBe('Marqueurs : 2 comportements notés');

  // Test pur de l'ordre du catalogue (C9) : le genre d'abord (inconnu = comportement), les archivés en dernier DANS leur
  // genre, puis le libellé ; l'entrée n'est pas modifiée.
  const tri = await page.evaluate(async () => {
    const { trierMarqueurs } = await import('/js/marqueurs-calcul.js');
    const entree = [
      { id: 'a', libelle: 'Bavardage', court: 'BAV', genre: 'comportement' },
      { id: 'b', libelle: 'Arbitre', court: 'ARB', genre: 'role' },
      { id: 'c', libelle: 'Ancien', court: 'ANC', genre: 'role', archivee: true },
      { id: 'd', libelle: 'Équipe 1', court: 'E1', genre: 'groupe' },
      { id: 'e', libelle: 'Zèle', court: 'ZL' },
      { id: 'f', libelle: 'Aide', court: 'AI', genre: 'inconnu' },
      { id: 'g', libelle: 'Équipe 0', court: 'E0', genre: 'groupe', archivee: true },
    ];
    const avant = JSON.stringify(entree);
    const sortie = trierMarqueurs(entree);
    return { libelles: sortie.map((m) => m.libelle), intacte: JSON.stringify(entree) === avant, copie: sortie !== entree };
  });
  expect(tri).toEqual({ libelles: ['Arbitre', 'Ancien', 'Équipe 1', 'Équipe 0', 'Aide', 'Bavardage', 'Zèle'], intacte: true, copie: true });

  expect(erreurs, 'aucune erreur console ni exception').toEqual([]);
});

// MIG-09 — trois chemins, trois tests : la séance (seul aperçu NEUF de ce lot), la séquence (le chemin
// qu'on oublie : depuis la v0.14.2, supprimerSequenceEnCascade emporte chaque séance par la MÊME fonction que la
// séance, emporterSeance ; collecterSeance n'existe plus) et l'élève.
test('MIG-09 — supprimer une séance emporte ses marqueurs posés, la confirmation les compte, « Annuler » les restaure', async ({ page }) => {
  await peupler(page);
  const avant = await lireMarqueurs(page);
  const deS1 = (m) => m.marquages.filter((p) => p.seanceId === 's1');
  expect(deS1(avant)).toHaveLength(4); // prémisse
  await page.goto('/#/sequences/sq');
  // dateFR n'affiche l'année que hors de l'année scolaire en cours : on ne dépend pas du calendrier.
  await page.getByRole('button', { name: /^Supprimer la séance du 14\/09/ }).click();
  const dlg = page.locator('dialog.feuille-confirm');
  // Texte lu AVANT de confirmer.
  await expect(dlg.locator('p').first()).toHaveText(/^Séance 1\/5 du 14\/09(\/2026)?\.$/); // plus de « son appel éventuel » figé
  await expect(dlg.locator('.confirm-detail')).toHaveText('Seront aussi supprimés : 3 appels, 4 marqueurs posés.');
  await dlg.locator('.btn-danger').click();
  await expect(page.locator('.toast').last()).toContainText('Séance supprimée');
  const apres = await lireMarqueurs(page);
  expect(deS1(apres)).toHaveLength(0);
  expect(apres.marquages).toHaveLength(2); // la séance 2 n'est pas touchée
  await page.locator('.toast').last().getByRole('button', { name: 'Annuler' }).click();
  await expect.poll(async () => deS1(await lireMarqueurs(page)).length).toBe(4);
  expect(await lireMarqueurs(page)).toEqual(avant);
});

test('MIG-09 — supprimer une séquence emporte les marqueurs posés de toutes ses séances, la confirmation les compte, « Annuler » les restaure', async ({ page }) => {
  await peupler(page);
  const avant = await lireMarqueurs(page);
  expect(avant.marquages).toHaveLength(6); // prémisse : poses sur les deux séances
  await page.goto('/#/sequences/sq');
  await page.getByRole('button', { name: 'Supprimer définitivement' }).click();
  const dlg = page.locator('dialog.feuille-confirm');
  await expect(dlg.locator('.confirm-detail')).toContainText('6 marqueurs posés');
  await dlg.locator('.btn-danger').click();
  await expect(page.locator('.toast').last()).toContainText('Séquence Badminton supprimée');
  expect((await lireMarqueurs(page)).marquages).toHaveLength(0);
  await page.locator('.toast').last().getByRole('button', { name: 'Annuler' }).click();
  await expect.poll(async () => (await lireMarqueurs(page)).marquages.length).toBe(6);
  expect(await lireMarqueurs(page)).toEqual(avant);
});

test('MIG-09 — supprimer un élève emporte ses marqueurs posés, la confirmation les compte, « Annuler » les restaure', async ({ page }) => {
  await peupler(page);
  const avant = await lireMarqueurs(page);
  const deE1 = (m) => m.marquages.filter((p) => p.eleveId === 'e1');
  expect(deE1(avant)).toHaveLength(3); // prémisse
  await page.goto('/#/eleves/fiche/e1');
  await page.getByRole('button', { name: 'Supprimer définitivement' }).click();
  const dlg = page.locator('dialog.feuille-confirm');
  await expect(dlg.locator('.confirm-detail')).toContainText('3 marqueurs posés');
  await dlg.locator('.btn-danger').click();
  await expect(page.locator('.toast').last()).toContainText('Prenom1 NOM01 supprimé');
  const apres = await lireMarqueurs(page);
  expect(deE1(apres)).toHaveLength(0);
  expect(apres.marquages).toHaveLength(3); // les autres élèves ne sont pas touchés
  await page.locator('.toast').last().getByRole('button', { name: 'Annuler' }).click();
  await expect.poll(async () => deE1(await lireMarqueurs(page)).length).toBe(3);
  expect(await lireMarqueurs(page)).toEqual(avant);
});

test('MIG-10 — appliquerMarquages rejette quand la transaction avorte APRÈS le succès de la requête d’écriture', async ({ page }) => {
  await peupler(page, { poses: false });
  const res = await page.evaluate(async () => {
    const io = await import('/js/io.js');
    const original = IDBObjectStore.prototype.put;
    const trace = { putReussi: false, abandon: false };
    // Défaillance au COMMIT (quota plein, erreur disque) : l'écriture réussit, puis la transaction est
    // abandonnée par une requête émise APRÈS toutes celles de la fonction (relecture comprise), donc
    // une fois toutes leurs réussites livrées.
    IDBObjectStore.prototype.put = function (...args) {
      const req = original.apply(this, args);
      if (this.name === 'marquages') {
        const store = this;
        req.addEventListener('success', () => {
          trace.putReussi = true;
          store.count().addEventListener('success', () => { trace.abandon = true; try { req.transaction.abort(); } catch { /* déjà close */ } });
        });
      }
      return req;
    };
    let resolu = false;
    let erreur = null;
    try {
      await io.appliquerMarquages('s1', [{ eleveId: 'e1', marqueurId: 'mq-arb', op: 'poser' }]);
      resolu = true;
    } catch (e) { erreur = e?.message || String(e); } finally { IDBObjectStore.prototype.put = original; }
    return { ...trace, resolu, erreur, enBase: (await io.tous('marquages')).length };
  });
  expect(res.putReussi).toBe(true); // prémisse : la requête d'écriture a bien réussi
  expect(res.abandon).toBe(true); // prémisse : l'abandon a bien eu lieu, après elle
  expect(res.resolu).toBe(false); // un « ✓ » mensonger résoudrait ici
  expect(res.erreur).toBeTruthy();
  expect(res.enBase).toBe(0);
});

// MIG-11 — v0.14.2 (contrat §16, revue de la v0.14.0, point 1) : chaque cascade COLLECTE et SUPPRIME dans UNE transaction
// d'écriture. Une pose (et une ligne d'un autre magasin) écrites par « un autre onglet » juste avant cette transaction partent
// avec elle, et « Annuler » les rend. Avant : lectures dans des transactions séparées, puis supprimerLot — ce qui était écrit
// entre les deux survivait à sa séance ou à son élève.
const poseInjectee = (seanceId, eleveId, m) => ({
  id: `${seanceId}_${eleveId}_${m.id}`, seanceId, eleveId, marqueurId: m.id, occurrences: 1,
  courtSecours: m.court, genreSecours: m.genre, dateAjout: '2026-09-21T10:00:00.000Z',
});
const appelInjecte = (seanceId, eleveId) => ({ id: `${seanceId}_${eleveId}`, seanceId, eleveId, statut: 'present', minutesRetard: null, commentaire: '' });

test('MIG-11 — séance : une pose et un appel écrits juste avant la cascade partent avec la séance ; « Annuler » les rend', async ({ page }) => {
  await peupler(page);
  await page.evaluate(async () => { // e4 n'a aucun appel sur s1 : l'appel injecté est une ligne NEUVE
    await (await import('/js/io.js')).enregistrer('eleves', { id: 'e4', classeId: 'c1', nom: 'NOM04', prenom: 'Prenom4', actif: true });
  });
  const avant = await lireTout(page, ['appels', 'marquages']);
  const pose = poseInjectee('s1', 'e4', { id: 'mq-arb', court: 'ARB', genre: 'role' });
  const appel = appelInjecte('s1', 'e4');
  expect(avant.marquages.map((p) => p.id)).not.toContain(pose.id); // prémisses : lignes absentes avant
  expect(avant.appels.map((a) => a.id)).not.toContain(appel.id);
  expect(avant.marquages.filter((p) => p.seanceId === 's1')).toHaveLength(4);
  await page.goto('/#/sequences/sq');
  await page.getByRole('button', { name: /^Supprimer la séance du 14\/09/ }).click();
  const dlg = page.locator('dialog.feuille-confirm');
  await expect(dlg.locator('.confirm-detail')).toHaveText('Seront aussi supprimés : 3 appels, 4 marqueurs posés.'); // aperçu lu avant
  await injecterAvant(page, { declencheur: 'marquages', lignes: { marquages: [pose], appels: [appel] } });
  await dlg.locator('.btn-danger').click();
  await expect(page.locator('.toast').last()).toContainText('Séance supprimée');
  expect(await page.evaluate(() => [window.__injecte, window.__injecteOk])).toEqual([true, true]); // prémisse : écrites, validées
  const apres = await lireTout(page, ['appels', 'marquages']);
  expect(apres.marquages.filter((p) => p.seanceId === 's1')).toEqual([]); // dans TOUT le magasin
  expect(apres.appels.filter((a) => a.seanceId === 's1')).toEqual([]);
  expect(apres.marquages).toEqual(avant.marquages.filter((p) => p.seanceId === 's2')); // les 2 poses de s2 intactes
  await page.locator('.toast').last().getByRole('button', { name: 'Annuler' }).click();
  await expect.poll(async () => (await lireTout(page, ['marquages'])).marquages.length).toBe(avant.marquages.length + 1);
  expect(await lireTout(page, ['appels', 'marquages'])).toEqual({
    appels: trierParId([...avant.appels, appel]),
    marquages: trierParId([...avant.marquages, pose]),
  });
});

test('MIG-11 — séquence : une pose et un appel écrits juste avant la cascade partent avec la séquence, en une seule transaction ; « Annuler » les rend', async ({ page }) => {
  await peupler(page);
  const avant = await lireTout(page, ['appels', 'marquages']);
  const pose = poseInjectee('s2', 'e3', { id: 'mq-e1', court: 'E1', genre: 'groupe' });
  const appel = appelInjecte('s2', 'e3'); // s2 n'a pas d'appel de e3
  expect(avant.marquages.map((p) => p.id)).not.toContain(pose.id); // prémisses
  expect(avant.appels.map((a) => a.id)).not.toContain(appel.id);
  expect(avant.marquages).toHaveLength(6);
  await page.goto('/#/sequences/sq');
  await page.getByRole('button', { name: 'Supprimer définitivement' }).click();
  const dlg = page.locator('dialog.feuille-confirm');
  await expect(dlg.locator('.confirm-detail')).toContainText('6 marqueurs posés');
  // Sonde posée AVANT l'injecteur : transactions d'écriture couvrant « appels » ouvertes par la cascade (hors injecteur).
  await page.evaluate(() => {
    window.__txAppels = 0;
    const orig = IDBDatabase.prototype.transaction;
    IDBDatabase.prototype.transaction = function (noms, mode, ...a) {
      if (mode === 'readwrite' && [].concat(noms).includes('appels') && !window.__dansInjecteur) window.__txAppels++;
      return orig.call(this, noms, mode, ...a);
    };
  });
  await injecterAvant(page, { declencheur: 'marquages', lignes: { marquages: [pose], appels: [appel] } });
  await dlg.locator('.btn-danger').click();
  await expect(page.locator('.toast').last()).toContainText('Séquence Badminton supprimée');
  expect(await page.evaluate(() => [window.__injecte, window.__injecteOk])).toEqual([true, true]); // prémisse
  const apres = await lireTout(page, ['appels', 'marquages']);
  expect(apres.marquages).toEqual([]); // s1 et s2 sont les deux séances de sq
  expect(apres.appels).toEqual([]);
  expect(await page.evaluate(() => window.__txAppels)).toBe(1); // UNE transaction pour toute la séquence
  await page.locator('.toast').last().getByRole('button', { name: 'Annuler' }).click();
  await expect.poll(async () => (await lireTout(page, ['marquages'])).marquages.length).toBe(avant.marquages.length + 1);
  expect(await lireTout(page, ['appels', 'marquages'])).toEqual({
    appels: trierParId([...avant.appels, appel]),
    marquages: trierParId([...avant.marquages, pose]),
  });
});

test('MIG-11 — élève : une pose et une observation écrites juste avant la cascade partent avec l’élève ; « Annuler » les rend', async ({ page }) => {
  await peupler(page);
  const avant = await lireTout(page, ['marquages', 'observations']);
  const pose = poseInjectee('s2', 'e1', { id: 'mq-e1', court: 'E1', genre: 'groupe' });
  const observation = { id: 'obs-inj', eleveId: 'e1', texte: 'x', type: 'Remarque', date: '2026-09-21', seanceId: null, dateAjout: '2026-09-21T10:00:00.000Z' };
  expect(avant.marquages.map((p) => p.id)).not.toContain(pose.id); // prémisses
  expect(avant.observations).toEqual([]);
  expect(avant.marquages.filter((p) => p.eleveId === 'e1')).toHaveLength(3);
  await page.goto('/#/eleves/fiche/e1');
  await page.getByRole('button', { name: 'Supprimer définitivement' }).click();
  const dlg = page.locator('dialog.feuille-confirm');
  await expect(dlg.locator('.confirm-detail')).toContainText('3 marqueurs posés');
  await injecterAvant(page, { declencheur: 'marquages', lignes: { marquages: [pose], observations: [observation] } });
  await dlg.locator('.btn-danger').click();
  await expect(page.locator('.toast').last()).toContainText('Prenom1 NOM01 supprimé');
  expect(await page.evaluate(() => [window.__injecte, window.__injecteOk])).toEqual([true, true]); // prémisse
  const apres = await lireTout(page, ['marquages', 'observations']);
  expect(apres.marquages.filter((p) => p.eleveId === 'e1')).toEqual([]);
  expect(apres.observations).toEqual([]);
  expect(apres.marquages).toEqual(avant.marquages.filter((p) => p.eleveId !== 'e1')); // les autres élèves intacts
  await page.locator('.toast').last().getByRole('button', { name: 'Annuler' }).click();
  await expect.poll(async () => (await lireTout(page, ['marquages'])).marquages.length).toBe(avant.marquages.length + 1);
  expect(await lireTout(page, ['marquages', 'observations'])).toEqual({
    marquages: trierParId([...avant.marquages, pose]),
    observations: [observation],
  });
});

test('MIG-12 — une cascade qui avorte au commit rejette et ne supprime rien', async ({ page }) => {
  await peupler(page);
  const avant = await lireTout(page, ['seances', 'appels', 'marquages']);
  // Prémisses : s1, ses 4 poses et ses 3 appels existent.
  expect(avant.seances.map((s) => s.id)).toContain('s1');
  expect(avant.marquages.filter((p) => p.seanceId === 's1')).toHaveLength(4);
  expect(avant.appels.filter((a) => a.seanceId === 's1')).toHaveLength(3);
  const res = await page.evaluate(async () => {
    const io = await import('/js/io.js');
    const original = IDBObjectStore.prototype.delete;
    const trace = { suppressionReussie: false, abandon: false };
    let arme = true;
    // Défaillance au COMMIT : la première suppression d'une pose réussit, puis la transaction est abandonnée par une requête
    // émise après elle (motif MIG-10). Une cascade qui résoudrait avant la validation annoncerait une suppression qui n'a pas eu lieu.
    IDBObjectStore.prototype.delete = function (...args) {
      const req = original.apply(this, args);
      if (this.name === 'marquages' && arme) {
        arme = false;
        const store = this;
        req.addEventListener('success', () => {
          trace.suppressionReussie = true;
          store.count().addEventListener('success', () => { trace.abandon = true; try { req.transaction.abort(); } catch { /* déjà close */ } });
        });
      }
      return req;
    };
    let resolu = false;
    let erreur = null;
    try {
      await io.supprimerSeanceEnCascade('s1');
      resolu = true;
    } catch (e) { erreur = e?.message || String(e); } finally { IDBObjectStore.prototype.delete = original; }
    return { ...trace, resolu, erreur };
  });
  expect(res.suppressionReussie).toBe(true); // prémisse : une suppression a bien réussi avant l'abandon
  expect(res.abandon).toBe(true); // prémisse : l'abandon a bien eu lieu
  expect(res.resolu).toBe(false); // la promesse est REJETÉE
  expect(res.erreur).toBeTruthy();
  expect(await lireTout(page, ['seances', 'appels', 'marquages'])).toEqual(avant); // rien n'est supprimé
});
