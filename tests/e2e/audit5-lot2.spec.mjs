// Non-régression du lot 2 du 5e audit (`docs/avis/AVIS_CREATIONS_ATOMIQUES.md` : V2-06, D-04, D-06).
// Une création qui touche un fichier ET un enregistrement s'écrit en UNE transaction : si l'écriture
// est refusée, il ne reste ni blob orphelin ni objet à moitié écrit, et l'ancienne pièce est intacte.
// Chaque test était ROUGE avec le code d'avant le lot (une transaction par écriture).

import { test, expect } from '@playwright/test';

const STORES = ['meta', 'classes', 'eleves', 'edt', 'sequences', 'seances', 'appels',
  'inaptitudes', 'certificats', 'fichiers', 'evaluations', 'notes', 'documents', 'observations'];

const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(async (stores) => {
    const io = await import('/js/io.js');
    await io.ouvrirDB();
    for (const s of stores) await io.vider(s);
  }, STORES);
});

// Refuse toute écriture sur UN store : la transaction du lot est abandonnée, rien n'est écrit.
const saboter = (page, store) => page.evaluate((s) => {
  const put = IDBObjectStore.prototype.put;
  IDBObjectStore.prototype.put = function (...a) {
    if (this.name === s) throw new DOMException('Écriture refusée (simulée)', 'InvalidStateError');
    return put.apply(this, a);
  };
}, store);

const comptes = (page) => page.evaluate(async () => {
  const io = await import('/js/io.js');
  return {
    fichiers: (await io.tous('fichiers')).map((f) => f.id),
    certificats: (await io.tous('certificats')).map((c) => c.id),
    inaptitudes: (await io.tous('inaptitudes')).length,
    documents: (await io.tous('documents')).length,
    photo: (await io.lire('eleves', 'e1'))?.photoFichierId ?? null,
    certRef: (await io.lire('inaptitudes', 'i1'))?.certificatId ?? null,
  };
});

async function seedEleve(page, extra = {}) {
  await page.evaluate(async ({ extra }) => {
    const io = await import('/js/io.js');
    await io.enregistrer('classes', { id: 'c1', nom: '6A', archivee: false });
    await io.enregistrer('eleves', { id: 'e1', classeId: 'c1', nom: 'A', prenom: 'B', actif: true, ...extra });
  }, { extra });
}

test('V2-06 — création d’une inaptitude avec pièce : écriture refusée → aucun fichier ni certificat orphelin', async ({ page }) => {
  await seedEleve(page);
  await page.goto('/#/inaptitudes/nouvelle');
  await page.locator('#in-eleve').selectOption('e1');
  await page.locator('#in-debut').fill('2026-09-01');
  await page.locator('#in-fichier').setInputFiles({ name: 'certif.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 test') });
  await saboter(page, 'inaptitudes');
  await page.getByRole('button', { name: 'Enregistrer l’inaptitude' }).click();
  await expect(page.locator('#vue .statut-erreur')).toContainText('Enregistrement impossible');
  const etat = await comptes(page);
  expect({ f: etat.fichiers.length, c: etat.certificats.length, i: etat.inaptitudes }).toEqual({ f: 0, c: 0, i: 0 }); // avant : 1 fichier et 1 certificat SANS inaptitude
});

test('D-04 — remplacement de la pièce d’une inaptitude : écriture refusée → l’ancienne pièce est intacte et toujours référencée', async ({ page }) => {
  await seedEleve(page);
  await page.evaluate(async () => {
    const io = await import('/js/io.js');
    await io.enregistrer('fichiers', { id: 'f1', blob: new Blob(['%PDF ancien'], { type: 'application/pdf' }), mime: 'application/pdf', nom: 'ancien.pdf', taille: 11, dateAjout: '2026-09-01' });
    await io.enregistrer('certificats', { id: 'ce1', eleveId: 'e1', dateDepot: '2026-09-01', dateDebut: '2026-09-01', dateFin: '', fichierId: 'f1', commentaire: '' });
    await io.enregistrer('inaptitudes', { id: 'i1', eleveId: 'e1', type: 'totale', origine: 'certificat', dateDebut: '2026-09-01', dateFin: '', restrictions: [], certificatId: 'ce1', commentaire: '' });
  });
  await page.goto('/#/inaptitudes/i1');
  await expect(page.getByRole('button', { name: 'Remplacer la pièce' })).toBeVisible();
  await saboter(page, 'inaptitudes');
  await page.locator('input[type=file][accept*="pdf"]').setInputFiles({ name: 'nouveau.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF nouveau') });
  await expect(page.locator('#vue .statut-erreur')).toContainText('Pièce non enregistrée');
  const etat = await comptes(page);
  expect(etat.fichiers).toEqual(['f1']); // avant : l'ancien fichier était SUPPRIMÉ avant l'échec
  expect(etat.certificats).toEqual(['ce1']);
  expect(etat.certRef).toBe('ce1'); // l'inaptitude pointe toujours vers la pièce qui existe
});

test('D-04 — changement de photo d’élève : écriture refusée → l’ancienne photo est conservée et référencée', async ({ page }) => {
  await seedEleve(page, { photoFichierId: 'f1' });
  await page.evaluate(async () => {
    const io = await import('/js/io.js');
    await io.enregistrer('fichiers', { id: 'f1', blob: new Blob(['ancienne'], { type: 'image/jpeg' }), mime: 'image/jpeg', nom: 'p.jpg', taille: 8, dateAjout: '2026-09-01' });
  });
  await page.goto('/#/eleves/fiche/e1');
  await saboter(page, 'eleves');
  await page.locator('input[type=file][accept="image/*"]').setInputFiles({ name: 'neuve.png', mimeType: 'image/png', buffer: PNG });
  await expect(page.locator('#vue .statut-erreur')).toContainText('Photo non enregistrée');
  const etat = await comptes(page);
  expect(etat.fichiers).toEqual(['f1']); // avant : la nouvelle photo était écrite et l'ancienne supprimée
  expect(etat.photo).toBe('f1');
});

test('D-04 — création d’un document avec pièce : écriture refusée → aucun fichier orphelin', async ({ page }) => {
  await page.goto('/#/documents');
  await page.getByRole('button', { name: '+ Ajouter un document' }).click();
  await page.locator('#doc-titre').fill('Protocole piscine');
  await page.locator('#doc-fichier').setInputFiles({ name: 'protocole.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF protocole') });
  await saboter(page, 'documents');
  await page.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(page.locator('#vue .statut-erreur')).toContainText('Enregistrement impossible');
  const etat = await comptes(page);
  expect({ f: etat.fichiers.length, d: etat.documents }).toEqual({ f: 0, d: 0 }); // avant : 1 fichier orphelin
});

test('D-06 — import Pronote : UNE transaction pour tout le fichier, et rien n’est créé si l’écriture est refusée', async ({ page }) => {
  const csv = ['Nom;Prénom;Classe', ...Array.from({ length: 30 }, (_, i) => `NOM${i};P${i};6${'ABC'[i % 3]}`)].join('\n');
  const coller = async () => {
    await page.goto('/#/eleves/import');
    await page.reload(); // un goto vers le même hash ne re-rend pas la vue
    await page.getByLabel('Données CSV collées').fill(csv);
    await page.getByRole('button', { name: 'Analyser' }).click();
    await expect(page.locator('#dest-colonne')).toBeChecked(); // colonne « Classe » détectée
  };
  await coller();
  await page.evaluate(() => {
    window.__tx = 0;
    const t = IDBDatabase.prototype.transaction;
    IDBDatabase.prototype.transaction = function (noms, mode, ...a) { if (mode === 'readwrite') window.__tx++; return t.call(this, noms, mode, ...a); };
  });
  await page.getByRole('button', { name: /^Importer 30 élèves$/ }).click();
  await expect(page.locator('#vue .statut').last()).toContainText('30 élèves importés');
  expect(await page.evaluate(() => window.__tx)).toBe(1); // avant : 33 (3 classes + 30 élèves, une transaction chacun)
  expect(await page.evaluate(async () => { const io = await import('/js/io.js'); return [(await io.tous('classes')).length, (await io.tous('eleves')).length]; })).toEqual([3, 30]);

  // Écriture refusée en cours d'import : ni classe ni élève ne subsiste.
  await page.evaluate(async () => { const io = await import('/js/io.js'); for (const s of ['classes', 'eleves']) await io.vider(s); });
  await coller();
  await saboter(page, 'eleves');
  await page.getByRole('button', { name: /^Importer 30 élèves$/ }).click();
  await expect(page.locator('#vue .statut-erreur')).toContainText('Import impossible');
  expect(await page.evaluate(async () => { const io = await import('/js/io.js'); return [(await io.tous('classes')).length, (await io.tous('eleves')).length]; })).toEqual([0, 0]); // avant : 3 classes créées et des élèves écrits avant l'échec
});
