// Marqueurs de séance, v0.14.0 « le format seul » : schéma 4, compatibilité, sauvegardes, cascades.
// Contrat : docs/avis/AVIS_FORMAT_MARQUEURS.md (§11.1 — MIG-01 à MIG-07, MIG-09, MIG-10 ; MIG-08 arrive
// en v0.14.2 avec l'affichage). Aucun écran nouveau n'existe encore : les poses et le vocabulaire sont
// écrits par io.js directement. Données INVENTÉES uniquement (élèves « NOMxx Prenomx »).
// Chaque test AFFIRME ses prémisses avant de conclure : une absence sans ancre visible passe à vide.

import { test, expect } from '@playwright/test';

// Base vidée en DÉRIVANT la liste des magasins de io.STORES, jamais par une liste écrite à la main :
// une constante figée oublierait « marqueurs » et « marquages » comme d'autres specs ont oublié
// « grilles », et une pose laissée d'un test à l'autre polluerait le suivant sans rien dire.
test.beforeEach(async ({ page }) => {
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

// MIG-09 — trois chemins, trois tests : la séance (seul aperçu NEUF de ce lot), la séquence (le chemin
// qu'on oublie : supprimerSequenceEnCascade doit reporter ce que collecterSeance ramasse) et l'élève.
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
