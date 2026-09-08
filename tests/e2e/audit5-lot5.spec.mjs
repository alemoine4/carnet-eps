// Non-régression du lot 5 du 5e audit (docs/audit-2026-09-07.md : tests, qualité, documentation).
// Un test par constat corrigé ; chaque test était ROUGE avec le code d'avant le lot.
// Base IndexedDB vide au départ (même convention que smoke.spec.mjs).

import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { readdirSync, readFileSync } from 'node:fs';


const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const today = () => iso(new Date());

const STORES = ['meta', 'classes', 'eleves', 'edt', 'sequences', 'seances', 'appels',
  'inaptitudes', 'certificats', 'fichiers', 'evaluations', 'notes', 'documents', 'observations'];

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(async (stores) => {
    const io = await import('/js/io.js');
    await io.ouvrirDB();
    for (const s of stores) await io.vider(s);
  }, STORES);
});

// ---------------------------------------------------------------------------
// Données (io.js)
// ---------------------------------------------------------------------------

test('D-08 — export et import JSON convertissent les pièces jointes UNE à la fois (jamais toutes en parallèle)', async ({ page }) => {
  const res = await page.evaluate(async () => {
    const io = await import('/js/io.js');
    for (let i = 0; i < 3; i++) await io.enregistrer('fichiers', { id: 'f' + i, blob: new Blob(['x'.repeat(2000)], { type: 'text/plain' }), mime: 'text/plain', nom: 'p' + i + '.txt', taille: 2000 });
    // Séquence d'événements : R = lecture demandée, L = lecture terminée (écouteur posé À LA
    // CONSTRUCTION, donc avant celui de l'app : il voit la fin avant que l'app n'enchaîne).
    const seq = [];
    const Orig = window.FileReader;
    window.FileReader = class extends Orig { constructor() { super(); this.addEventListener('load', () => seq.push('L')); } };
    const lire = Orig.prototype.readAsDataURL;
    Orig.prototype.readAsDataURL = function (b) { seq.push('R'); return lire.call(this, b); };
    const dump = await io.exporterJSON({ avecFichiers: true });
    window.FileReader = Orig; Orig.prototype.readAsDataURL = lire;
    // Import : F = fetch(dataURL) demandé, D = réponse reçue (avant que l'app ne reprenne la main).
    const fetchOrig = window.fetch;
    window.fetch = (...a) => { seq.push('F'); return fetchOrig(...a).then((r) => { seq.push('D'); return r; }); };
    await io.importerJSON(dump);
    window.fetch = fetchOrig;
    return { seq: seq.join(''), n: (await io.tous('fichiers')).length, pieces: dump.stores.fichiers.length };
  });
  expect(res.pieces).toBe(3);
  expect(res.n).toBe(3);
  expect(res.seq).toMatch(/^(RL){3}(FD){3}$/); // Promise.all donnait RRRLLL puis FFFDDD (3 blobs en vol)
});

test.describe('D-09 — date de sauvegarde en heure locale', () => {
  test.use({ timezoneId: 'Europe/Paris' });
  test('à 00h30 heure de Paris, la sauvegarde est datée du jour local (pas de la veille UTC)', async ({ page }) => {
    await page.clock.setFixedTime(new Date('2026-09-07T22:30:00Z')); // = 2026-09-08 00:30 à Paris
    const res = await page.evaluate(async () => {
      const io = await import('/js/io.js');
      HTMLAnchorElement.prototype.click = () => {}; // pas de téléchargement réel
      const dump = await io.exporterJSON({ avecFichiers: false });
      return { date: io.validerExport(dump).date, nom: await io.telechargerJSON(dump, 'sauvegarde'), brut: dump.dateExport };
    });
    expect(res.date).toBe('2026-09-08');
    expect(res.nom).toBe('carnet-eps_sauvegarde_2026-09-08.json');
    expect(res.brut.startsWith('2026-09-08T00:30')).toBe(true);
  });
});

test('D-11 / C30 — montée de schéma v1 → v2 : store « observations » créé, index manquant ajouté, données conservées', async ({ page }) => {
  const res = await page.evaluate(async () => {
    const io = await import('/js/io.js');
    await io.ouvrirDB();
    // Base v1 recréée à la main : les 13 stores d'origine, mais « eleves » SANS son index classeId.
    await new Promise((ok, ko) => { const r = indexedDB.deleteDatabase('carnet-eps'); r.onsuccess = ok; r.onerror = () => ko(r.error); r.onblocked = () => ko(new Error('bloquée')); });
    await new Promise((ok, ko) => {
      const r = indexedDB.open('carnet-eps', 1);
      r.onupgradeneeded = () => {
        const db = r.result;
        db.createObjectStore('meta', { keyPath: 'cle' });
        const index = { edt: ['classeId'], sequences: ['classeId'], seances: ['sequenceId', 'date'], appels: ['seanceId', 'eleveId'], inaptitudes: ['eleveId'], certificats: ['eleveId'], evaluations: ['sequenceId'], notes: ['evaluationId', 'eleveId'] };
        for (const nom of ['classes', 'eleves', 'edt', 'sequences', 'seances', 'appels', 'inaptitudes', 'certificats', 'fichiers', 'evaluations', 'notes', 'documents']) {
          const s = db.createObjectStore(nom, { keyPath: 'id' });
          for (const champ of index[nom] || []) s.createIndex(champ, champ);
        }
      };
      r.onsuccess = () => {
        const db = r.result;
        const tx = db.transaction(['classes', 'eleves'], 'readwrite');
        tx.objectStore('classes').put({ id: 'c1', nom: '6A', archivee: false });
        tx.objectStore('eleves').put({ id: 'e1', classeId: 'c1', nom: 'A', prenom: 'B', actif: true });
        tx.oncomplete = () => { db.close(); ok(); };
        tx.onerror = () => ko(tx.error);
      };
      r.onerror = () => ko(r.error);
    });
    try {
      const db = await io.ouvrirDB(); // montée v1 → v2 par l'app
      const idx = db.transaction('eleves').objectStore('eleves').indexNames.contains('classeId');
      return { version: db.version, observations: db.objectStoreNames.contains('observations'), idx, lus: (await io.parIndex('eleves', 'classeId', 'c1')).length, eleve: (await io.lire('eleves', 'e1'))?.nom };
    } catch (e) { return { erreur: e.name + ': ' + e.message }; }
  });
  expect(res).toEqual({ version: 2, observations: true, idx: true, lus: 1, eleve: 'A' }); // avant : idx false, parIndex → NotFoundError
});

test('C03 / B37 — CSV : UTF-16 avec BOM décodé, « � » légitime conservé, Windows-1252 en repli, caractères de contrôle retirés', async ({ page }) => {
  const res = await page.evaluate(async () => {
    const io = await import('/js/io.js');
    const NUL = String.fromCharCode(0);
    return {
      utf16: io.decoderTexte(new Uint8Array([0xFF, 0xFE, 0x4E, 0x00, 0x6F, 0x00, 0x6D, 0x00, 0x3B, 0x00, 0xE9, 0x00]).buffer),
      fffd: io.decoderTexte(new TextEncoder().encode('Léa ' + String.fromCharCode(0xFFFD)).buffer),
      w1252: io.decoderTexte(new Uint8Array([76, 233, 97]).buffer),
      nul: io.parserCSV('Nom;Prénom\nDU' + NUL + 'PONT;L' + NUL + 'éa').lignes[0],
    };
  });
  expect(res.utf16).toBe('Nom;é'); // avant : « ÿþN\0o\0m\0… » (décodé en 1252)
  expect(res.fffd).toBe('Léa ' + String.fromCharCode(0xFFFD)); // avant : tout le fichier basculait en 1252 (« LÃ©a ï¿½ »)
  expect(res.w1252).toBe('Léa'); // le repli existant est conservé
  expect(res.nul).toEqual(['DUPONT', 'Léa']); // avant : NUL conservés dans les noms
  // UTF-16 SANS BOM décodé en UTF-8 : le NUL entre \r et \n scindait chaque fin de ligne en une ligne « \0 »
  // comptée comme ligne incomplète (revue du lot 5).
  const sansBom = await page.evaluate(async () => {
    const io = await import('/js/io.js');
    const NUL = String.fromCharCode(0);
    const nl = '\r' + NUL + '\n' + NUL;
    const a = io.parserCSV('Nom;Prenom' + nl + 'DUPONT;Lea' + nl + 'MARTIN;Theo' + nl);
    return { n: a.lignes.length, l0: a.lignes[0], sep: a.separateur, tab: io.parserCSV('Nom\tPrenom\nA\tB').separateur };
  });
  expect(sansBom).toEqual({ n: 2, l0: ['DUPONT', 'Lea'], sep: ';', tab: '\t' }); // avant : 6 lignes, dont 4 « incomplètes »
});

test('C04 — import : un champ entre guillemets sur plusieurs lignes est refusé avec message, pas scindé en deux élèves', async ({ page }) => {
  await page.goto('/#/eleves/import');
  await page.getByLabel('Données CSV collées').fill('Nom;Prénom;Classe\n"DUPONT\nJean";Léa;6Z\nNUÑEZ;Sofía;6Z');
  await page.getByRole('button', { name: 'Analyser' }).click();
  await expect(page.locator('#vue')).toContainText('Analyse impossible : champ sur plusieurs lignes'); // avant : « 3 lignes lues »
  await expect(page.getByRole('button', { name: /^Importer \d+ élèves$/ })).toHaveCount(0);
  // Une analyse réussie PUIS une refusée : le mapping et le bouton du premier collage ne restent pas actifs (revue du lot 5).
  await page.reload();
  await page.getByLabel('Données CSV collées').fill('Nom;Prénom;Classe\nPREMIER;Alpha;6A\nSECOND;Beta;6A');
  await page.getByRole('button', { name: 'Analyser' }).click();
  await expect(page.getByRole('button', { name: /^Importer 2 élèves$/ })).toBeVisible();
  await page.getByLabel('Données CSV collées').fill('Nom;Prénom;Classe\n"TROISIEME\nGamma";Delta;6Z');
  await page.getByRole('button', { name: 'Analyser' }).click();
  await expect(page.locator('#vue')).toContainText('Analyse impossible');
  await expect(page.getByRole('button', { name: /^Importer \d+ élèves$/ })).toHaveCount(0); // avant : « Importer 2 élèves » toujours cliquable
  expect(await page.evaluate(async () => (await (await import('/js/io.js')).tous('eleves')).length)).toBe(0);
});

test('C37 — supprimer un élève : l’aperçu compte sans charger, la cascade charge une seule fois', async ({ page }) => {
  await page.evaluate(async () => {
    const io = await import('/js/io.js');
    await io.enregistrer('classes', { id: 'c1', nom: '6A', archivee: false });
    await io.enregistrer('eleves', { id: 'e1', classeId: 'c1', nom: 'A', prenom: 'B', actif: true });
    await io.enregistrer('sequences', { id: 'sq', classeId: 'c1', apsa: 'Bad', nbSeancesPrevu: 5, dateDebut: '2026-09-01', dateFin: '2026-12-31' });
    await io.enregistrer('seances', { id: 's1', sequenceId: 'sq', date: '2026-09-02' });
    await io.enregistrer('seances', { id: 's2', sequenceId: 'sq', date: '2026-09-03' });
    await io.enregistrer('appels', { id: 'a1', seanceId: 's1', eleveId: 'e1', statut: 'present' });
    await io.enregistrer('appels', { id: 'a2', seanceId: 's2', eleveId: 'e1', statut: 'absent' });
    await io.enregistrer('evaluations', { id: 'ev', sequenceId: 'sq', titre: 'T', date: '2026-09-03', type: 'note20', coef: 1 });
    await io.enregistrer('notes', { id: 'n1', evaluationId: 'ev', eleveId: 'e1', valeur: 12 });
  });
  await page.goto('/#/eleves/fiche/e1');
  await expect(page.locator('#vue')).toContainText('A B');
  await page.evaluate(() => {
    // Enregistrements chargés (par index ET par store entier) : l'aperçu ne doit rien charger, la cascade une fois.
    window.__getAll = 0;
    for (const proto of [IDBIndex.prototype, IDBObjectStore.prototype]) {
      const orig = proto.getAll;
      proto.getAll = function (...a) {
        const store = this instanceof IDBIndex ? this.objectStore.name : this.name;
        // lectures imputables à l'aperçu ou à la cascade : par index sur e1, ou un store d'historique lu en entier
        if ((this instanceof IDBIndex && a[0] === 'e1') || (!(this instanceof IDBIndex) && ['appels', 'notes', 'certificats', 'observations'].includes(store))) window.__getAll++;
        return orig.apply(this, a);
      };
    }
  });
  await page.getByRole('button', { name: 'Supprimer définitivement' }).click();
  const dlg = page.locator('dialog.feuille-confirm');
  await expect(dlg).toContainText('Seront aussi supprimés : 2 appels, 1 note.');
  expect(await page.evaluate(() => window.__getAll)).toBe(0); // aperçu par count() : avant, 5 getAll
  await dlg.locator('.btn-danger').click();
  await expect(page.locator('.toasts')).toContainText('B A supprimé');
  expect(await page.evaluate(() => window.__getAll)).toBe(5); // la cascade seule : 5 lectures par index (avant : 10 avec l'aperçu), aucun store d'historique lu en entier
  expect(await page.evaluate(async () => (await (await import('/js/io.js')).tous('appels')).length)).toBe(0);
});

test('C38 — un seul dictionnaire de libellés : pluriels corrects dans le détail de suppression, partagé avec l’écran Sauvegarde', async ({ page }) => {
  const res = await page.evaluate(async () => {
    const io = await import('/js/io.js');
    return { detail: io.detailSuppression({ seances: 1, fichiers: 2, appels: 0 }), plur: io.LIBELLES?.observations?.[1], cles: Object.keys(io.LIBELLES || {}).sort(), stores: io.STORES.filter((s) => s !== 'meta').sort() };
  });
  expect(res.detail).toBe('Seront aussi supprimés : 1 séance, 2 pièces jointes.'); // avant : « 2 pièce jointes »
  expect(res.plur).toBe('observations'); // avant : LIBELLES non exporté (copie privée dans sauvegarde.js)
  expect(res.cles).toEqual(res.stores); // tout store de données a son libellé, sinon il disparaît du résumé d'import (revue du lot 5)
});

// ---------------------------------------------------------------------------
// Import Pronote (eleves.js)
// ---------------------------------------------------------------------------

// Colle un CSV, analyse, choisit le mode de destination (radio dest-<mode>), importe ; rend le statut.
async function importerCSV(page, csv, mode) {
  await page.goto('/#/eleves/import');
  await page.reload(); // un goto vers le même hash ne re-rend pas la vue
  await page.getByLabel('Données CSV collées').fill(csv);
  await page.getByRole('button', { name: 'Analyser' }).click();
  await expect(page.locator('#map-nom')).toBeVisible();
  if (mode) await page.locator(`#dest-${mode}`).check();
  await page.getByRole('button', { name: /^Importer \d+ élèves?$/ }).click();
  const statut = page.locator('#vue .statut').last();
  await expect(statut).toContainText(/importé|impossible/);
  return statut;
}

test('C12 — import : mapper à la main la colonne Classe active le mode « Utiliser la colonne » (et l’ignorer le désactive)', async ({ page }) => {
  // Colonne Classe détectée puis ignorée à la main : le mode « colonne » ne doit pas rester coché.
  await page.goto('/#/eleves/import');
  await page.getByLabel('Données CSV collées').fill('Nom;Prénom;Classe\nX;Y;6B');
  await page.getByRole('button', { name: 'Analyser' }).click();
  await expect(page.locator('#dest-colonne')).toBeChecked();
  await page.locator('#map-classe').selectOption('-1');
  await expect(page.locator('#dest-colonne')).toBeDisabled(); // avant : radio inerte, restait cochée
  await expect(page.locator('#dest-nouvelle')).toBeChecked(); // base vide → « Créer la classe »
  // Colonne « Groupe » non détectée puis mappée à la main : le mode « colonne » s'active et importe.
  await page.reload();
  await page.getByLabel('Données CSV collées').fill('Nom;Prénom;Groupe\nX;Y;6B');
  await page.getByRole('button', { name: 'Analyser' }).click();
  await expect(page.locator('#dest-colonne')).toBeDisabled();
  await page.locator('#map-classe').selectOption('2');
  await expect(page.locator('#dest-colonne')).toBeEnabled(); // avant : restait désactivée
  await page.locator('#dest-colonne').check();
  await page.getByRole('button', { name: /^Importer 1 élèves?$/ }).click();
  await expect(page.locator('#vue .statut').last()).toContainText('1 élève importé dans 6B');
});

test('C13 — import : une colonne présente dans les données mais absente de l’en-tête est proposée au mapping et dans l’aperçu', async ({ page }) => {
  await page.goto('/#/eleves/import');
  await page.getByLabel('Données CSV collées').fill('Nom;Prénom\nX;Y;6B\nZ;W;6B');
  await page.getByRole('button', { name: 'Analyser' }).click();
  await expect(page.locator('#map-classe option')).toHaveCount(4); // avant : 3 (la 3e colonne était invisible)
  await expect(page.locator('#map-classe option').nth(3)).toHaveText('Colonne 3');
  await expect(page.locator('.table-apercu thead th').nth(2)).toHaveText('Colonne 3');
  await expect(page.locator('.table-apercu tbody tr').first().locator('td')).toHaveCount(3); // avant : 2
  await page.locator('#map-classe').selectOption('2');
  await page.locator('#dest-colonne').check();
  await page.getByRole('button', { name: /^Importer 2 élèves$/ }).click();
  await expect(page.locator('#vue .statut').last()).toContainText('2 élèves importés dans 6B');
});

test('C14 — import : un homonyme déjà présent dans une autre classe est signalé (changement de classe ?), sans bloquer', async ({ page }) => {
  await page.evaluate(async () => {
    const io = await import('/js/io.js');
    await io.enregistrer('classes', { id: 'c1', nom: '6A', archivee: false });
    await io.enregistrer('eleves', { id: 'e1', classeId: 'c1', nom: 'DUPONT', prenom: 'Léa', actif: true });
  });
  const statut = await importerCSV(page, 'Nom;Prénom;Classe\nDUPONT;Léa;6B');
  await expect(statut).toContainText('1 élève importé dans 6B');
  await expect(statut).toContainText('1 élève porte le même nom qu’un élève d’une autre classe (6A) — changement de classe ? à vérifier'); // avant : rien
  expect(await page.evaluate(async () => (await (await import('/js/io.js')).tous('eleves')).length)).toBe(2); // l'écriture est inchangée
});

test('B46 / C51 — import : date de naissance impossible refusée et comptée, séparateurs « . » et « - » acceptés', async ({ page }) => {
  await page.evaluate(async () => { await (await import('/js/io.js')).enregistrer('classes', { id: 'c1', nom: '6A', archivee: false }); });
  const statut = await importerCSV(page, 'Nom;Prénom;Né(e) le\nA;B;31/02/2014\nC;D;12.03.2014\nE;F;2014-13-01\nG;H;05-11-2013', 'existante');
  await expect(statut).toContainText('4 élèves importés dans 6A');
  await expect(statut).toContainText('2 dates de naissance non reconnues (laissées vides)'); // avant : aucun compteur
  const parNom = await page.evaluate(async () => Object.fromEntries((await (await import('/js/io.js')).tous('eleves')).map((e) => [e.nom, e.dateNaissance])));
  expect(parNom).toEqual({ A: '', C: '2014-03-12', E: '', G: '2013-11-05' }); // avant : A '2014-02-31', C '', E '2014-13-01', G ''
});

test('A28 — un appel de statut inconnu (sauvegarde tierce) n’est perdu ni par le récapitulatif ni par la fiche élève', async ({ page }) => {
  await page.evaluate(async ({ today }) => {
    const io = await import('/js/io.js');
    await io.enregistrer('classes', { id: 'c1', nom: '6A', archivee: false });
    await io.enregistrer('eleves', { id: 'e1', classeId: 'c1', nom: 'A', prenom: 'B', actif: true });
    await io.enregistrer('sequences', { id: 'sq', classeId: 'c1', apsa: 'Bad', nbSeancesPrevu: 5, dateDebut: '2020-01-01', dateFin: '2099-12-31' });
    await io.enregistrer('seances', { id: 'se', sequenceId: 'sq', date: today });
    await io.enregistrer('appels', { id: 'se_e1', seanceId: 'se', eleveId: 'e1', statut: 'bizarre' });
  }, { today: today() });
  await page.goto('/#/appel/recap/c1');
  await expect(page.locator('table.table-apercu tbody tr').first().locator('td').first()).toHaveText('1'); // avant : cellule « Présent » vide
  await page.goto('/#/eleves/fiche/e1');
  await expect(page.locator('.rang-chips')).toContainText('Présent'); // avant : « aucun appel cette année »
  await expect(page.locator('.rang-chips')).not.toContainText('aucun appel');
});

test('C50 (lint) — plus aucun `innerHTML = \'\'` dans les modules : `replaceChildren()` partout', async ({ page }) => {
  // Pas une preuve de comportement (DOM final identique) : un garde statique contre le retour de la vieille forme.
  // Tous les fichiers de app/js lus sur le disque (pas une liste écrite à la main), toute affectation d'innerHTML (revue du lot 5).
  const racineJs = new URL('../../app/js/', import.meta.url);
  const fichiers = readdirSync(racineJs, { recursive: true }).filter((f) => String(f).endsWith('.js'));
  expect(fichiers.length).toBeGreaterThan(10);
  for (const f of fichiers) expect(readFileSync(new URL(String(f).replace(/\\/g, '/'), racineJs), 'utf8'), String(f)).not.toMatch(/\.innerHTML\s*=/);
});

// ---------------------------------------------------------------------------
// Notes, Pronote, impression (notes.js, appel.js)
// ---------------------------------------------------------------------------

async function seedEval(page, notes = []) {
  await page.evaluate(async ({ notes }) => {
    const io = await import('/js/io.js');
    await io.enregistrer('classes', { id: 'c1', nom: '6A', archivee: false });
    for (const [id, nom] of [['e3', 'E'], ['e1', 'A'], ['e2', 'C']]) await io.enregistrer('eleves', { id, classeId: 'c1', nom, prenom: 'X', actif: true }); // semés dans le désordre
    await io.enregistrer('sequences', { id: 'sq', classeId: 'c1', apsa: 'Bad', nbSeancesPrevu: 5, dateDebut: '2020-01-01', dateFin: '2099-12-31' });
    await io.enregistrer('evaluations', { id: 'ev', sequenceId: 'sq', titre: 'Eval', date: '2026-09-01', type: 'note20', coef: 1, publieePronote: null });
    for (const [eleveId, valeur] of notes) await io.enregistrer('notes', { id: 'ev_' + eleveId, evaluationId: 'ev', eleveId, valeur });
  }, { notes });
}

test('C16 — garde-fou Pronote : le message compte les lignes vides (non saisies et codes)', async ({ page }) => {
  await seedEval(page, [['e1', 12], ['e2', 'ABS']]);
  await page.goto('/#/notes/eval/ev');
  await page.evaluate(() => { navigator.clipboard.writeText = () => Promise.reject(new Error('refusé')); });
  await page.getByRole('button', { name: 'Copier pour Pronote' }).click();
  const zone = page.locator('textarea[aria-label="Colonne à copier"]');
  await expect(zone).toHaveValue('12\n\n'); // la propriété value d'un textarea normalise CRLF en LF
  await zone.dispatchEvent('copy');
  await expect(page.locator('#vue .statut-ok').last()).toContainText('3 lignes dont 2 vides (1 note, ordre alphabétique)'); // avant : « 3 lignes (ordre alphabétique) »
  await expect(page.locator('#vue')).toContainText('ligne 2 — C X : ABS');
});

test.describe('C32 — export Pronote (filet sur la colonne collée)', () => {
  test.use({ permissions: ['clipboard-read', 'clipboard-write'] });

  test('C32a — « Copier pour Pronote » : colonne triée, CRLF, code → ligne vide, marquée publiée', async ({ page }) => {
    await seedEval(page);
    await page.goto('/#/notes/eval/ev');
    const inputs = page.locator('.ligne-note input');
    for (const [i, v] of [[0, '12'], [1, 'abs'], [2, '15,5']]) { await inputs.nth(i).fill(v); await inputs.nth(i).dispatchEvent('change'); }
    await expect(inputs.nth(1)).toHaveValue('ABS');
    await page.evaluate(() => { window.__copie = null; navigator.clipboard.writeText = (t) => { window.__copie = t; return Promise.resolve(); }; }); // chaîne EXACTE remise au presse-papiers
    await page.getByRole('button', { name: 'Copier pour Pronote' }).click();
    await expect(page.locator('#vue')).toContainText('Colonne copiée');
    expect(await page.evaluate(() => window.__copie)).toBe('12\r\n\r\n15,5'); // ordre alphabétique A, C, E, fins de ligne CRLF EXACTES (un presse-papiers natif les réécrirait — revue du lot 5)
    await expect(page.locator('#vue')).toContainText('ligne 2 — C X : ABS');
    await expect(page.locator('#vue .statut-ok').last()).toContainText('3 lignes dont 1 vide (2 notes, ordre alphabétique)');
    expect(await page.evaluate(async () => (await (await import('/js/io.js')).lire('evaluations', 'ev')).publieePronote)).toBe(today());
  });

  test('C32b — « Exporter CSV » : Nom;Prénom;Note avec BOM, codes tels quels, NE marque PAS « publiée »', async ({ page }) => {
    await seedEval(page, [['e1', 12], ['e2', 'ABS'], ['e3', 15.5]]);
    await page.goto('/#/notes/eval/ev');
    const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Exporter CSV' }).click()]);
    expect(dl.suggestedFilename()).toMatch(/^notes_6A_Eval_\d{4}-\d{2}-\d{2}\.csv$/);
    expect(await readFile(await dl.path(), 'utf8')).toBe(String.fromCharCode(0xFEFF) + 'Nom;Prénom;Note\r\nA;X;12\r\nC;X;ABS\r\nE;X;15,5');
    await expect(page.locator('#vue')).toContainText('Le CSV ne marque pas « publiée »');
    expect(await page.evaluate(async () => (await (await import('/js/io.js')).lire('evaluations', 'ev')).publieePronote)).toBeNull();
  });
});

test('B44 — récapitulatif d’appel et relevé de notes : établissement (Réglages) et date d’édition, non masqués à l’impression', async ({ page }) => {
  await page.evaluate(async () => {
    const io = await import('/js/io.js');
    await io.ecrireMeta('etablissement', 'Collège Test');
    await io.enregistrer('classes', { id: 'c1', nom: '6A', archivee: false });
    await io.enregistrer('eleves', { id: 'e1', classeId: 'c1', nom: 'A', prenom: 'B', actif: true });
    await io.enregistrer('sequences', { id: 'sq', classeId: 'c1', apsa: 'Bad', nbSeancesPrevu: 5, dateDebut: '2020-01-01', dateFin: '2099-12-31' });
    await io.enregistrer('evaluations', { id: 'ev', sequenceId: 'sq', titre: 'Eval', date: '2026-09-01', type: 'note20', coef: 1 });
  });
  const auj = await page.evaluate(() => new Date().toLocaleDateString('fr-FR')); // même fuseau et même locale que la page
  for (const [route, id] of [['/#/appel/recap/c1', '#rc-edition'], ['/#/notes/releve/c1', '#rl-edition']]) {
    await page.goto(route);
    await expect(page.locator(id)).toHaveText(`Collège Test — édité le ${auj}`); // avant : aucun des deux éléments
    await page.emulateMedia({ media: 'print' });
    expect(await page.locator(id).evaluate((p) => getComputedStyle(p).display)).not.toBe('none'); // pas sous .no-print
    await page.emulateMedia({ media: 'screen' });
  }
});

// ---------------------------------------------------------------------------
// Appel, métier, modules (appel.js, metier.js, main.js, media.js…)
// ---------------------------------------------------------------------------

const jourSemaine = () => ((new Date().getDay() + 6) % 7) + 1;

async function seedAppel(page, nbEleves) {
  await page.evaluate(async ({ today, jour, nbEleves }) => {
    const io = await import('/js/io.js');
    await io.enregistrer('classes', { id: 'c1', nom: '6A', archivee: false });
    for (let i = 1; i <= nbEleves; i++) await io.enregistrer('eleves', { id: 'e' + i, classeId: 'c1', nom: 'NOM' + i, prenom: 'P', actif: true });
    await io.enregistrer('sequences', { id: 'sq', classeId: 'c1', apsa: 'Bad', nbSeancesPrevu: 5, dateDebut: '2020-01-01', dateFin: '2099-12-31' });
    await io.enregistrer('edt', { id: 'cr1', jour, heureDebut: '00:00', heureFin: '23:59', classeId: 'c1', semaine: 'AB', installation: '' });
    await io.enregistrer('seances', { id: 'se', sequenceId: 'sq', date: today });
  }, { today: today(), jour: jourSemaine(), nbEleves });
}

test('A27 — « Terminer l’appel » : une seule transaction pour tous les restants, bouton verrouillé pendant l’écriture', async ({ page }) => {
  await seedAppel(page, 5);
  await page.goto('/#/appel/se');
  await expect(page.locator('.btn-eleve')).toHaveCount(5);
  await page.evaluate(() => {
    window.__tx = 0; window.__verrou = null;
    const orig = IDBDatabase.prototype.transaction;
    IDBDatabase.prototype.transaction = function (noms, mode, ...a) {
      if ([].concat(noms).includes('appels') && mode === 'readwrite') {
        window.__tx++;
        window.__verrou = [...document.querySelectorAll('button')].find((b) => b.textContent.startsWith('Terminer l’appel'))?.disabled;
      }
      return orig.call(this, noms, mode, ...a);
    };
  });
  await page.getByRole('button', { name: /^Terminer l’appel/ }).click();
  await expect(page.locator('#vue')).toContainText('Appel complet ✓ (5/5)');
  expect(await page.evaluate(() => [window.__tx, window.__verrou])).toEqual([1, true]); // avant : 5 transactions, bouton libre
  const statuts = await page.evaluate(async () => { const io = await import('/js/io.js'); return Promise.all([1, 2, 3, 4, 5].map(async (i) => (await io.lire('appels', 'se_e' + i))?.statut)); });
  expect(statuts).toEqual(['present', 'present', 'present', 'present', 'present']);
});

test('A29 — deux séquences actives pour la classe : le sélecteur d’appel prévient comme l’accueil', async ({ page }) => {
  await seedAppel(page, 1);
  await page.evaluate(async () => { await (await import('/js/io.js')).enregistrer('sequences', { id: 'sq2', classeId: 'c1', apsa: 'Danse', nbSeancesPrevu: 5, dateDebut: '2020-01-01', dateFin: '2099-12-31' }); });
  await page.goto('/#/appel');
  await expect(page.locator('#vue')).toContainText('2 séquences actives pour 6A'); // avant : seul l'accueil prévenait
  await page.goto('/#/accueil');
  await expect(page.locator('#vue')).toContainText('2 séquences actives pour cette classe'); // A15 (2026-07-10), jamais testé
});

test('C53 — pastille 🩺 d’inaptitude aussi dans la liste de classe et la grille de notes (spécification « partout »)', async ({ page }) => {
  await seedAppel(page, 2);
  await page.evaluate(async ({ today }) => {
    const io = await import('/js/io.js');
    await io.enregistrer('inaptitudes', { id: 'i1', eleveId: 'e1', type: 'totale', origine: 'certificat', dateDebut: '2020-01-01', dateFin: '2099-12-31' });
    await io.enregistrer('evaluations', { id: 'ev', sequenceId: 'sq', titre: 'Eval', date: today, type: 'note20', coef: 1 });
  }, { today: today() });
  await page.goto('/#/eleves/classe/c1');
  await expect(page.locator('.liste-eleves .pastille-info')).toHaveCount(1); // avant : 0 hors écran d'appel
  await expect(page.locator('.ligne-eleve', { hasText: 'NOM1' }).locator('.pastille-info .sr-only')).toHaveText('Inaptitude en cours');
  await page.goto('/#/notes/eval/ev');
  await expect(page.locator('.ligne-note .pastille-info')).toHaveCount(1);
  await expect(page.locator('.ligne-note', { hasText: 'NOM1' }).locator('.pastille-info')).toHaveCount(1);
  await expect(page.locator('.ligne-note input').first()).toHaveAccessibleName(/Note de NOM1 P/); // B48 intact
});

test('C48 — la palette des statuts ne vit plus qu’en CSS (tokens --stb-* dans les deux thèmes)', async ({ page }) => {
  const res = await page.evaluate(async () => {
    const { STATUTS } = await import('/js/metier.js');
    const manquants = [];
    for (const theme of ['clair', 'sombre']) {
      document.documentElement.dataset.theme = theme;
      for (const cle of Object.keys(STATUTS)) if (!getComputedStyle(document.documentElement).getPropertyValue('--stb-' + cle).trim()) manquants.push(theme + ':' + cle);
    }
    delete document.documentElement.dataset.theme;
    return { couleurJS: Object.values(STATUTS).some((s) => 'couleur' in s), manquants };
  });
  expect(res.couleurJS).toBe(false); // avant : palette dupliquée dans STATUTS
  expect(res.manquants).toEqual([]);
});

test.describe('C49 — dates d’ajout en heure locale', () => {
  test.use({ timezoneId: 'Europe/Paris' });
  test('un document et une pièce ajoutés à 00 h 30 sont datés du jour local, pas de la veille UTC', async ({ page }) => {
    await page.clock.setFixedTime(new Date('2026-09-08T22:30:00Z')); // = 2026-09-09 00:30 à Paris
    await page.goto('/#/documents');
    await page.getByRole('button', { name: '+ Ajouter un document' }).click();
    await page.locator('#doc-titre').fill('Fiche');
    await page.locator('#doc-url').fill('https://exemple.fr');
    await page.getByRole('button', { name: 'Enregistrer' }).click();
    await expect(page.locator('#vue')).toContainText('Fiche');
    const dates = await page.evaluate(async () => {
      const io = await import('/js/io.js');
      const m = await import('/js/media.js');
      const f = await m.stockerFichier(new File(['x'], 'a.pdf', { type: 'application/pdf' }));
      return [(await io.tous('documents'))[0].dateAjout, f.dateAjout];
    });
    expect(dates).toEqual(['2026-09-09', '2026-09-09']); // avant : ['2026-09-08', '2026-09-08'] (UTC)
  });
});

test('C36 — plus de classe .table-recap inerte, ni dans le DOM ni dans le CSS', async ({ page }) => {
  await seedAppel(page, 1);
  await page.evaluate(async ({ today }) => { await (await import('/js/io.js')).enregistrer('evaluations', { id: 'ev', sequenceId: 'sq', titre: 'Eval', date: today, type: 'note20', coef: 1 }); }, { today: today() });
  for (const route of ['/#/appel/recap/c1', '/#/notes/releve/c1']) {
    await page.goto(route);
    await expect(page.locator('table.table-apercu')).toHaveCount(1);
    await expect(page.locator('.table-recap')).toHaveCount(0); // avant : classe posée sur les deux tableaux
  }
  const regle = await page.evaluate(() => [...document.styleSheets].flatMap((s) => [...s.cssRules]).flatMap((r) => (r.cssRules ? [...r.cssRules] : [r])).some((r) => r.selectorText?.includes('table-recap')));
  expect(regle).toBe(false);
});

test('C41 / C42 / C54 / C43 — dédoublonnages : ligne d’alerte partagée, une seule liste de routes, état de route mort retiré, visionneuse à un argument', async ({ page }) => {
  // Alertes : accueil et Suivi rendent la MÊME ligne (helper partagé) — un élève sous inaptitude sans date de fin.
  await seedAppel(page, 1);
  await page.evaluate(async () => { await (await import('/js/io.js')).enregistrer('inaptitudes', { id: 'i1', eleveId: 'e1', type: 'totale', origine: 'certificat', dateDebut: '2020-01-01', dateFin: '' }); });
  await page.goto('/#/accueil');
  const accueil = await page.locator('.ligne-eleve').first().evaluate((a) => a.outerHTML);
  await page.goto('/#/suivi');
  const suivi = await page.locator('.ligne-eleve').first().evaluate((a) => a.outerHTML);
  expect(suivi).toBe(accueil);
  const res = await page.evaluate(async () => {
    const [state, media, ui] = await Promise.all([import('/js/state.js'), import('/js/media.js'), import('/js/ui.js')]);
    return { route: 'route' in state.etat, arite: media.ouvrirVisionneuse.length, ligneAlerte: typeof ui.ligneAlerte };
  });
  expect(res).toEqual({ route: false, arite: 1, ligneAlerte: 'function' }); // avant : route true, arité 2, pas de helper
  // C42 : une seule liste de routes, dérivée des titres (garde de source, comme pour le service-worker) et,
  // route par route, le nom accessible attendu — une route présente dans une liste et absente de l'autre serait rouge.
  expect(await (await page.request.get('/js/main.js')).text()).toContain('const ROUTES = Object.keys(TITRES)'); // avant : deux listes en parallèle
  const TITRES = { accueil: 'Aujourd’hui', appel: 'Appel', eleves: 'Élèves', notes: 'Notes', edt: 'Emploi du temps', plus: 'Plus', suivi: 'Suivi', sauvegarde: 'Sauvegarde', reglages: 'Réglages', sequences: 'Séquences', inaptitudes: 'Inaptitudes', documents: 'Documents', aide: 'Aide' };
  for (const [r, titre] of Object.entries(TITRES)) {
    await page.goto('/#/' + r);
    await expect(page.locator('#vue')).toHaveAttribute('aria-label', titre);
  }
});

test('C44 — pendant la compression d’une photo, la fiche élève affiche un retour (« Compression de la photo… »)', async ({ page }) => {
  await seedAppel(page, 1);
  await page.goto('/#/eleves/fiche/e1');
  await page.evaluate(() => { const o = window.createImageBitmap; window.createImageBitmap = (...a) => new Promise((r) => setTimeout(() => r(o(...a)), 1500)); });
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
  await page.locator('input[type=file][accept="image/*"]').setInputFiles({ name: 'p.png', mimeType: 'image/png', buffer: png });
  await expect(page.locator('p.statut', { hasText: /Compression de la photo/ })).toBeVisible({ timeout: 1000 }); // avant : ligne vide pendant l'attente
  await expect(page.getByRole('button', { name: 'Changer la photo' })).toBeVisible();
});

// ---------------------------------------------------------------------------
// Sécurité, PWA, messages (index.html, main.js, io.js, reglages.js)
// ---------------------------------------------------------------------------

test('A21 — l’app refuse de s’afficher dans un cadre (frame-ancestors est ignorée en <meta>)', async ({ page }) => {
  await page.evaluate(() => { const f = document.createElement('iframe'); f.id = 'cadre'; f.src = '/#/accueil'; document.body.append(f); });
  await expect(page.frameLocator('#cadre').locator('body')).toContainText('ne peut pas être affiché dans un cadre'); // avant : l'app se rendait dans le cadre
  await expect(page.frameLocator('#cadre').locator('.nav')).toHaveCount(0);
});

test('A22 — CSP sans unsafe-inline : les couleurs (CSSOM) tiennent et aucun style en ligne n’est refusé', async ({ page }) => {
  const violations = [];
  page.on('console', (m) => { if (/Content Security Policy/.test(m.text())) violations.push(m.text()); });
  await page.addInitScript(() => { window.__csp = []; document.addEventListener('securitypolicyviolation', (e) => window.__csp.push(e.violatedDirective + ' ' + e.blockedURI)); });
  await page.reload(); // le CHARGEMENT du document doit passer sous les écouteurs : le beforeEach l'avait déjà fait avant (revue du lot 5)
  await page.evaluate(async () => {
    const io = await import('/js/io.js');
    await io.enregistrer('classes', { id: 'c1', nom: '6A', couleur: '#e11d48', archivee: false });
    await io.enregistrer('eleves', { id: 'e1', classeId: 'c1', nom: 'A', prenom: 'B', actif: true });
  });
  await page.goto('/#/eleves');
  const csp = await page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute('content');
  expect(csp).not.toContain("'unsafe-inline'"); // avant : accordé sans aucun style en ligne dans le projet
  expect(csp).toContain("style-src 'self';");
  await expect(page.locator('.pastille').first()).toHaveCSS('background-color', 'rgb(225, 29, 72)'); // couleur de classe posée par le CSSOM
  for (const r of ['eleves/fiche/e1', 'appel', 'notes', 'sequences', 'edt', 'reglages']) { await page.goto('/#/' + r); await expect(page.locator('#vue')).not.toBeEmpty(); }
  expect(violations).toEqual([]);
  expect(await page.evaluate(() => window.__csp)).toEqual([]); // événements securitypolicyviolation du document chargé sous écoute
});

test('A32 — Réglages : l’espace utilisé est annoncé comme celui de tout le site (origine partagée)', async ({ page }) => {
  await page.goto('/#/reglages');
  await expect(page.locator('#vue .note-discrete')).toContainText('tout le site'); // avant : chiffre par origine sans un mot
});

test('B38 — Aide : installation et transfert expliqués dans l’écran, plus de renvoi à un guide absent du site', async ({ page }) => {
  await page.goto('/#/aide');
  await expect(page.locator('#vue')).toContainText('Installer l’application');
  await expect(page.locator('#vue')).toContainText('Télécharger la sauvegarde');
  await expect(page.locator('#vue')).not.toContainText('guide d’installation fourni');
});

test('B51 — Sauvegarde : base illisible → « Comptage impossible » au lieu d’un « … » muet', async ({ page }) => {
  await page.goto('/#/plus');
  await page.evaluate(() => {
    const original = IDBDatabase.prototype.transaction;
    IDBDatabase.prototype.transaction = function (stores, mode, ...rest) {
      if (mode === 'readonly' && [].concat(stores).length === 14) throw new DOMException('Base indisponible', 'InvalidStateError'); // compterTout (14 stores)
      return original.call(this, stores, mode, ...rest);
    };
  });
  await page.locator('a[href="#/sauvegarde"]').click(); // navigation par hash : le prototype patché survit
  await expect(page.locator('#vue .carte').first().locator('p')).toContainText('Comptage impossible (Base indisponible)');
});

test('A36 — fiche élève : nom vidé → « ✗ » et toast, pas « ✓ » ; la base garde l’ancien nom', async ({ page }) => {
  await page.evaluate(async () => {
    const io = await import('/js/io.js');
    await io.enregistrer('classes', { id: 'c1', nom: '6A', archivee: false });
    await io.enregistrer('eleves', { id: 'e1', classeId: 'c1', nom: 'A', prenom: 'B', actif: true });
  });
  await page.goto('/#/eleves/fiche/e1');
  await page.locator('#f-nom').fill('');
  await page.locator('#f-nom').dispatchEvent('change');
  await expect(page.locator('.toast').last()).toContainText('Non enregistré : le nom ne peut pas être vide'); // avant : « ✓ » sans écriture
  await expect(page.locator('label[for="f-nom"] .statut, #f-nom ~ .statut, .champ:has(#f-nom) .statut').first()).toHaveText('✗');
  expect(await page.evaluate(async () => (await (await import('/js/io.js')).lire('eleves', 'e1')).nom)).toBe('A');
  // Même contrat pour le titre d'une évaluation (oublié par le lot, revue du lot 5).
  await page.evaluate(async () => {
    const io = await import('/js/io.js');
    await io.enregistrer('sequences', { id: 'sq', classeId: 'c1', apsa: 'Bad', nbSeancesPrevu: 5, dateDebut: '2020-01-01', dateFin: '2099-12-31' });
    await io.enregistrer('evaluations', { id: 'ev', sequenceId: 'sq', titre: 'Eval', date: '2026-09-01', type: 'note20', coef: 1 });
  });
  await page.goto('/#/notes/eval/ev');
  await page.locator('#ge-titre').fill('');
  await page.locator('#ge-titre').dispatchEvent('change');
  await expect(page.locator('.toast').last()).toContainText('Non enregistré : le titre ne peut pas être vide');
  expect(await page.evaluate(async () => (await (await import('/js/io.js')).lire('evaluations', 'ev')).titre)).toBe('Eval');
});

test('B41 — quota plein : le message dit quoi faire, pas seulement l’erreur brute du navigateur', async ({ page }) => {
  await page.evaluate(async () => {
    const io = await import('/js/io.js');
    await io.enregistrer('classes', { id: 'c1', nom: '6A', archivee: false });
    await io.enregistrer('eleves', { id: 'e1', classeId: 'c1', nom: 'A', prenom: 'B', actif: true, notesPerso: '' });
  });
  await page.goto('/#/eleves/fiche/e1');
  await page.evaluate(() => { IDBObjectStore.prototype.put = function () { throw new DOMException('Quota simulé', 'QuotaExceededError'); }; });
  await page.locator('#f-notes').fill('asthme');
  await page.locator('#f-notes').dispatchEvent('change');
  await expect(page.locator('.toast').last()).toContainText('Non enregistré : Quota simulé — mémoire de l’appareil pleine'); // avant : « Non enregistré : Quota simulé »
  await expect(page.locator('.toast').last()).toContainText('Plus → Sauvegarde');
});

test('D-10 (suite) — une fin de T1 en août déjà en base (sauvegarde ancienne importée) est ignorée et signalée', async ({ page }) => {
  const y = await page.evaluate(async () => (await (await import('/js/metier.js')).bornesTrimestres()).annee);
  await page.evaluate(async ({ y }) => { await (await import('/js/io.js')).ecrireMeta('finTrimestre1', `${y}-08-20`); }, { y }); // contourne la garde de Réglages, comme un import
  const b = await page.evaluate(async ({ y }) => (await (await import('/js/metier.js')).bornesTrimestres(`${y}-10-01`)), { y });
  expect(b.finT1).toBe(`${y}-12-15`); // avant : y-08-20 appliquée (T1 vide, tout l'automne en T2)
  expect(b.courant).toBe(1);
  await page.goto('/#/reglages');
  await expect(page.locator('#vue')).toContainText('Valeur enregistrée ignorée');
});

// ---------------------------------------------------------------------------
// Documentation ↔ code (gardes de cohérence dérivées du CODE, pas de la formulation)
// ---------------------------------------------------------------------------

test('C57 / C59 — la documentation suit le code : restrictions, champs EDT, préférences, hôte des tests SW', async () => {
  const lire = (rel) => readFileSync(new URL(rel, import.meta.url), 'utf8');
  const doc = lire('../../docs/modele-donnees.md');
  const inapt = lire('../../app/js/modules/inaptitudes.js');
  const cles = [...inapt.matchAll(/^\s*\['([a-z_]+)', '/gm)].map((m) => m[1]);
  const docCles = doc.match(/restrictions ∈ (.+)$/m)[1].split(',').map((s) => s.trim());
  expect(docCles).toEqual(cles); // avant : « autre » documenté, inconnu du code
  expect(doc.match(/^edt\s+\{[^}]*\}/m)[0]).not.toContain('dateDebut'); // avant : dateDebut?/dateFin? documentés, absents d'edt.js
  const archi = lire('../../docs/architecture.md');
  const modules = ['eleves', 'notes', 'reglages'].map((m) => lire(`../../app/js/modules/${m}.js`)).join('\n');
  for (const p of new Set([...modules.matchAll(/sauverPrefs\(\{ (\w+):/g)].map((m) => m[1]))) expect(archi).toContain(p); // avant : « dernier onglet », derniereClasseId absent
  expect(archi).not.toContain('dernier onglet');
  const readme = lire('./README.md');
  expect(readme).toContain('app.localhost'); // avant : « [::1] » alors que le code essaie app.localhost en premier
  // Comptes dérivés des SIX specs (tests imbriqués dans un describe compris), par fichier et au total (revue du lot 5).
  const specs = readdirSync(new URL('./', import.meta.url)).filter((f) => f.endsWith('.spec.mjs'));
  expect(specs.length).toBe(7);
  let total = 0;
  for (const f of specs) {
    const n = (lire('./' + f).match(/^\s*test\(/gm) || []).length;
    total += n;
    expect(readme, f).toMatch(new RegExp(f.replace(/\./g, '\\.') + '\\S*\\s*(—\\s*)?\\(?' + n + '\\b'));
  }
  expect(readme).toContain(`Total de la suite : **${total} tests**`);
  expect(lire('../../README.md')).toContain(`**8 smoke-tests + ${total - 8} tests de non-régression**`);
});

test('A27 (revue) — un tap pendant l’écriture de « Terminer l’appel » n’est pas réécrasé à l’écran par l’instantané du lot', async ({ page }) => {
  await seedAppel(page, 6);
  await page.goto('/#/appel/se');
  await expect(page.locator('.btn-eleve')).toHaveCount(6);
  await page.evaluate(() => {
    // La transaction du lot est tenue ouverte par une chaîne de `get` tant que le test ne la libère pas.
    const put = IDBObjectStore.prototype.put;
    window.__liberer = false; window.__tenue = false;
    IDBObjectStore.prototype.put = function (...a) {
      const r = put.apply(this, a);
      if (this.name === 'appels' && !window.__tenue) {
        window.__tenue = true;
        const store = this;
        const boucle = () => { if (window.__liberer) return; const g = store.get('__aucun__'); g.onsuccess = boucle; };
        boucle();
      }
      return r;
    };
  });
  await page.getByRole('button', { name: /^Terminer l’appel/ }).click();
  const carte4 = page.locator('.btn-eleve').nth(3);
  await carte4.locator('.eleve-cycle').click(); // tap pendant l'écriture du lot : présent → absent
  await expect(carte4.locator('.detail-txt')).toHaveText('Absent');
  await page.evaluate(() => { window.__liberer = true; });
  await expect(page.locator('#vue')).toContainText('Appel complet ✓ (6/6)');
  await expect(carte4.locator('.detail-txt')).toHaveText('Absent'); // avant : réaffiché « Présent » par l'instantané pris avant l'await
  expect(await page.evaluate(async () => (await (await import('/js/io.js')).lire('appels', 'se_e4'))?.statut)).toBe('absent'); // la base, elle, avait raison
});
