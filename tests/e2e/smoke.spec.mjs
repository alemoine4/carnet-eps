// Smoke-tests des parcours critiques de Carnet EPS (Playwright, dev uniquement).
// Chaque test repart d'une base IndexedDB vide. On seede par le module io.js de l'app
// (même instance que l'app) puis on pilote l'UI réelle.

import { test, expect } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const STORES = ['meta', 'classes', 'eleves', 'edt', 'sequences', 'seances', 'appels',
  'inaptitudes', 'certificats', 'fichiers', 'evaluations', 'notes', 'documents', 'observations'];

// Erreurs console et exceptions non rattrapées, écoutées AVANT la première navigation : le test 1
// ne branchait ses écouteurs qu'après le chargement de l'app (audit 2026-09-07, C34).
let erreurs = [];
test.beforeEach(async ({ page }) => {
  erreurs = [];
  page.on('console', (m) => { if (m.type() === 'error') erreurs.push(m.text()); });
  page.on('pageerror', (e) => erreurs.push(String(e)));
  await page.goto('/');
  await page.evaluate(async (stores) => {
    const io = await import('/js/io.js');
    await io.ouvrirDB();
    for (const s of stores) await io.vider(s);
  }, STORES);
});

test('1. chargement sans erreur console + navigation complète', async ({ page }) => {
  await page.reload(); // second chargement observé lui aussi (écouteurs posés dans beforeEach)
  for (const r of ['accueil', 'appel', 'eleves', 'notes', 'edt', 'plus', 'suivi', 'aide',
    'reglages', 'sauvegarde', 'sequences', 'inaptitudes', 'documents']) {
    await page.goto('/#/' + r);
    await expect(page.locator('#vue')).not.toBeEmpty();
  }
  expect(erreurs).toEqual([]);
  // C21 : le serveur réutilisé sur 8160 sert app/ de CE dépôt, pas une autre copie.
  expect((await page.request.get('/')).headers()['x-racine']).toBe(createHash('sha256').update(fileURLToPath(new URL('../../app', import.meta.url))).digest('hex').slice(0, 16));
});

test('2. créer une classe + persistance après rechargement', async ({ page }) => {
  await page.goto('/#/eleves');
  await page.getByRole('button', { name: /Nouvelle classe/ }).click();
  await page.getByPlaceholder('6A, 5B, 3PM…').fill('5TEST');
  await page.getByRole('button', { name: 'Créer la classe' }).click();
  await expect(page.locator('#vue')).toContainText('5TEST');
  await page.reload();
  await expect(page.locator('#vue')).toContainText('5TEST');
});

test('3. import Pronote (collage CSV)', async ({ page }) => {
  await page.goto('/#/eleves/import');
  await page.getByLabel('Données CSV collées')
    .fill('Nom;Prénom;Classe\nDUPONT;Léa;6Z\nNUÑEZ;Sofía;6Z');
  await page.getByRole('button', { name: 'Analyser' }).click();
  await page.getByRole('button', { name: /Importer/ }).click();
  await expect(page.locator('#vue')).toContainText(/2 élèves importés/);
});

test('4. faire l’appel (tap + Terminer)', async ({ page }) => {
  await page.evaluate(async () => {
    const io = await import('/js/io.js');
    // Date LOCALE, comme l'app (isoAujourdhui) — toISOString/UTC donnerait « hier » entre minuit et 2 h.
    const d = new Date();
    const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    await io.enregistrer('classes', { id: 'c1', nom: '6A', archivee: false });
    for (let i = 0; i < 4; i++) {
      await io.enregistrer('eleves', { id: 'e' + i, classeId: 'c1', nom: 'N' + i, prenom: 'P' + i, actif: true });
    }
    await io.enregistrer('sequences', { id: 'sq', classeId: 'c1', apsa: 'Bad', nbSeancesPrevu: 5, dateDebut: '2026-01-01', dateFin: '2026-12-31' });
    await io.enregistrer('seances', { id: 'se', sequenceId: 'sq', date: today, edtId: 'e', numero: 1, annulee: false });
  });
  await page.goto('/#/appel/se');
  await expect(page.locator('.btn-eleve')).toHaveCount(4);
  await page.locator('.eleve-cycle').first().click();
  await page.getByRole('button', { name: /Terminer/ }).click();
  await expect(page.getByText(/Appel complet/)).toBeVisible();
});

test('5. suppression d’élève + annulation (undo restaure la cascade)', async ({ page }) => {
  await page.evaluate(async () => {
    const io = await import('/js/io.js');
    await io.enregistrer('classes', { id: 'c1', nom: '6A', archivee: false });
    await io.enregistrer('eleves', { id: 'e1', classeId: 'c1', nom: 'Martin', prenom: 'Inès', actif: true });
    await io.enregistrer('appels', { id: 'a1', seanceId: 'se', eleveId: 'e1', statut: 'present' });
  });
  await page.goto('/#/eleves/fiche/e1');
  await page.getByRole('button', { name: 'Supprimer définitivement' }).click();
  await page.locator('dialog.feuille-confirm .btn-danger').click();
  await page.locator('.toast').getByRole('button', { name: 'Annuler' }).click();
  // L'undo restaure l'élève et revient sur sa fiche.
  await expect(page.locator('#vue')).toContainText('Inès');
  const restau = await page.evaluate(async () => {
    const io = await import('/js/io.js');
    return { eleve: !!(await io.lire('eleves', 'e1')), appels: (await io.parIndex('appels', 'eleveId', 'e1')).length };
  });
  expect(restau).toEqual({ eleve: true, appels: 1 });
});

test('7. onglet Suivi + EDT déplacé dans « Plus »', async ({ page }) => {
  await page.goto('/#/suivi');
  await expect(page.locator('#vue')).toContainText(/Alertes du suivi|Rien à signaler/);
  await page.goto('/#/plus');
  await page.getByRole('link', { name: /Emploi du temps/ }).click();
  await expect(page).toHaveURL(/#\/edt$/);
});

test('8. ajouter une observation + cascade à la suppression de l’élève', async ({ page }) => {
  await page.evaluate(async () => {
    const io = await import('/js/io.js');
    await io.enregistrer('classes', { id: 'c1', nom: '6A', archivee: false });
    await io.enregistrer('eleves', { id: 'e1', classeId: 'c1', nom: 'Martin', prenom: 'Inès', actif: true });
  });
  await page.goto('/#/eleves/fiche/e1');
  await page.getByRole('button', { name: '+ Observation' }).click();
  await page.locator('dialog.feuille textarea').fill('Très bon engagement aujourd’hui');
  await page.locator('dialog.feuille').getByRole('button', { name: 'Enregistrer' }).click();
  await expect(page.locator('#vue')).toContainText('Très bon engagement');
  await expect(page.locator('dialog.feuille')).toHaveCount(0); // la feuille se ferme après enregistrement
  // cascade : supprimer l'élève supprime ses observations
  const restant = await page.evaluate(async () => {
    const io = await import('/js/io.js');
    await io.supprimerEleveEnCascade('e1');
    return (await io.parIndex('observations', 'eleveId', 'e1')).length;
  });
  expect(restant).toBe(0);
});

test('6. export / import JSON sans perte (round-trip)', async ({ page }) => {
  const res = await page.evaluate(async () => {
    const io = await import('/js/io.js');
    await io.enregistrer('classes', { id: 'c1', nom: '6A', archivee: false });
    await io.enregistrer('eleves', { id: 'e1', classeId: 'c1', nom: 'M', prenom: 'I', actif: true });
    await io.enregistrer('fichiers', { id: 'f1', blob: new Blob(['x'], { type: 'image/jpeg' }), mime: 'image/jpeg', nom: 'c.jpg', taille: 1 }); // pièce jointe : sérialisation des blobs (C35)
    const dump = await io.exporterJSON({ avecFichiers: true });
    const { comptes } = io.validerExport(dump);
    for (const s of ['classes', 'eleves']) await io.vider(s);
    await io.importerJSON(dump);
    const f1 = await io.lire('fichiers', 'f1');
    return { exportEleves: comptes.eleves, apresImport: (await io.tous('eleves')).length, piece: [comptes.fichiers, f1?.blob?.size, f1?.blob?.type] };
  });
  expect(res).toEqual({ exportEleves: 1, apresImport: 1, piece: [1, 1, 'image/jpeg'] }); // le blob revient intact (taille, type)
});
