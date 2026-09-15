// Deux finitions demandées avant la mise en ligne des grilles (2026-09-15) :
// V3-B3 — changer le barème d'une évaluation déjà notée DEMANDE ce que deviennent les notes ;
// notes partielles — une note de grille calculée sur une partie des critères est signalée à la copie.
// ⚠ Aucune donnée nominative : noms INVENTÉS.

import { test, expect } from '@playwright/test';

const STORES = ['meta', 'classes', 'eleves', 'edt', 'sequences', 'seances', 'appels', 'inaptitudes',
  'certificats', 'fichiers', 'evaluations', 'notes', 'documents', 'observations', 'grilles'];

test.use({ permissions: ['clipboard-read', 'clipboard-write'] });

const base = (page, { ev = {}, notes = [] } = {}) => page.evaluate(async ({ stores, ev, notes }) => {
  const io = await import('/js/io.js');
  await io.ouvrirDB();
  for (const s of stores) await io.vider(s);
  await io.restaurer({
    classes: [{ id: 'c', nom: '6TEST', archivee: false }],
    eleves: [
      { id: 'e', classeId: 'c', nom: 'AFICTIF', prenom: 'Un', actif: true },
      { id: 'f', classeId: 'c', nom: 'BFICTIF', prenom: 'Deux', actif: true },
    ],
    sequences: [{ id: 's', classeId: 'c', apsa: 'Bad', dateDebut: '2020-01-01', dateFin: '2099-12-31' }],
    evaluations: [{ id: 'v', sequenceId: 's', titre: 'Contrôle', date: '2026-09-01', type: 'bareme', bareme: 10, coef: 1, publieePronote: null, ...ev }],
    notes,
  });
}, { stores: STORES, ev, notes });
const lireEval = (page) => page.evaluate(async () => (await import('/js/io.js')).lire('evaluations', 'v'));
const valeur = (page, id) => page.evaluate(async (id) => (await (await import('/js/io.js')).lire('notes', id))?.valeur, id);
// UN seul événement « change », pour que chaque test pilote une seule question.
const changerBareme = (page, v) => page.locator('#ge-bareme').evaluate((champ, v) => {
  champ.value = v;
  champ.dispatchEvent(new Event('change', { bubbles: true }));
}, v);
const note = (eleveId, v) => ({ id: `v_${eleveId}`, evaluationId: 'v', eleveId, valeur: v, commentaire: '' });

test.beforeEach(async ({ page }) => { await page.goto('/'); });

// --- V3-B3 : le piège du barème ---------------------------------------------------------------------

test('V3-B3 — « Convertir les notes » : 8/10 devient 16/20, les codes ne bougent pas', async ({ page }) => {
  await base(page, { notes: [note('e', 8), note('f', 'ABS')] });
  await page.goto('/#/notes/eval/v');
  await changerBareme(page, '20');
  const question = page.getByRole('dialog');
  // Avant : les 8 points restaient 8, soit 8/20, sans un mot.
  await expect(question).toContainText('1 note déjà saisie');
  await expect(question).toContainText('8/10 devient 16/20');
  await question.getByRole('button', { name: 'Convertir les notes' }).click();
  await expect(page.locator('#vue')).toContainText('noté /20');
  expect(await valeur(page, 'v_e')).toBe(16);
  expect(await valeur(page, 'v_f')).toBe('ABS');
  expect((await lireEval(page)).bareme).toBe(20);
});

test('V3-B3 — « Garder les points » : le barème change, les points restent', async ({ page }) => {
  await base(page, { notes: [note('e', 8)] });
  await page.goto('/#/notes/eval/v');
  await changerBareme(page, '20');
  await page.getByRole('dialog').getByRole('button', { name: 'Garder les points' }).click();
  await expect(page.locator('#vue')).toContainText('noté /20');
  expect(await valeur(page, 'v_e')).toBe(8);
  expect((await lireEval(page)).bareme).toBe(20);
});

test('V3-B3 — « Annuler » : rien ne change, le champ reprend l’ancien barème', async ({ page }) => {
  await base(page, { notes: [note('e', 8)] });
  await page.goto('/#/notes/eval/v');
  await changerBareme(page, '20');
  await page.getByRole('dialog').getByRole('button', { name: 'Annuler' }).click();
  await expect(page.locator('.toast').last()).toContainText('barème reste inchangé');
  await expect(page.locator('#ge-bareme')).toHaveValue('10');
  expect(await valeur(page, 'v_e')).toBe(8);
  expect((await lireEval(page)).bareme).toBe(10);
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('V3-B3 — garder des points au-dessus du nouveau barème est refusé, convertir passe', async ({ page }) => {
  await base(page, { ev: { bareme: 20 }, notes: [note('e', 18)] });
  await page.goto('/#/notes/eval/v');
  await changerBareme(page, '10');
  await page.getByRole('dialog').getByRole('button', { name: 'Garder les points' }).click();
  await expect(page.locator('.toast').last()).toContainText('dépasse');
  expect((await lireEval(page)).bareme).toBe(20);
  expect(await valeur(page, 'v_e')).toBe(18);
  await changerBareme(page, '10');
  await page.getByRole('dialog').getByRole('button', { name: 'Convertir les notes' }).click();
  await expect(page.locator('#vue')).toContainText('noté /10');
  expect(await valeur(page, 'v_e')).toBe(9);
});

test('V3-B3 — sans note chiffrée, aucune question : le barème change directement', async ({ page }) => {
  await base(page, { notes: [note('e', 'DISP')] });
  await page.goto('/#/notes/eval/v');
  await changerBareme(page, '20');
  await expect(page.locator('#vue')).toContainText('noté /20');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect((await lireEval(page)).bareme).toBe(20);
});

test('V3-B3 — conversion non entière arrondie au centième, et publication à refaire', async ({ page }) => {
  await base(page, { ev: { bareme: 15, publieePronote: '2026-09-05' }, notes: [note('e', 7)] });
  await page.goto('/#/notes/eval/v');
  await changerBareme(page, '20');
  await page.getByRole('dialog').getByRole('button', { name: 'Convertir les notes' }).click();
  await expect(page.locator('#vue')).toContainText('noté /20');
  expect(await valeur(page, 'v_e')).toBe(9.33); // 7 × 20 / 15 = 9,333…
  const ev = await lireEval(page);
  expect({ bareme: ev.bareme, publiee: ev.publieePronote, aRefaire: ev.publieeObsolete }).toEqual({ bareme: 20, publiee: '2026-09-05', aRefaire: true });
});

// --- Notes de grille partielles ---------------------------------------------------------------------

// Grille par défaut : 4 critères ; e observé sur 2 critères, f sur les 4.
const baseGrille = (page, regle) => page.evaluate(async ({ stores, regle }) => {
  const io = await import('/js/io.js');
  const { nouvelleGrille, calculerGrille } = await import('/js/grilles-calcul.js');
  await io.ouvrirDB();
  for (const s of stores) await io.vider(s);
  const g = nouvelleGrille();
  g.id = 'g';
  g.nonEvalue = regle;
  const haut = g.niveaux.at(-1).cle;
  const detailE = { [g.criteres[0].id]: haut, [g.criteres[1].id]: haut };
  const detailF = Object.fromEntries(g.criteres.map((c) => [c.id, haut]));
  const n = (eleveId, detail) => ({ id: `v_${eleveId}`, evaluationId: 'v', eleveId, detail, commentaire: '', valeur: calculerGrille(g, detail, 20).valeur });
  await io.restaurer({
    classes: [{ id: 'c', nom: '6TEST', archivee: false }],
    eleves: [
      { id: 'e', classeId: 'c', nom: 'AFICTIF', prenom: 'Un', actif: true },
      { id: 'f', classeId: 'c', nom: 'BFICTIF', prenom: 'Deux', actif: true },
    ],
    sequences: [{ id: 's', classeId: 'c', apsa: 'Badminton' }],
    evaluations: [{ id: 'v', sequenceId: 's', titre: 'Grille', type: 'grille', bareme: 20, coef: 1, grille: g }],
    notes: [n('e', detailE), n('f', detailF)],
  });
}, { stores: STORES, regle });

const copier = async (page) => {
  await page.goto('/#/notes/eval/v');
  await page.evaluate(() => { navigator.clipboard.writeText = async (t) => { window.__copie = t; }; });
  await page.getByRole('button', { name: 'Copier pour Pronote', exact: true }).click();
  await expect.poll(() => page.evaluate(() => typeof window.__copie)).toBe('string');
};

test('Notes partielles — une note calculée sur une partie des critères est signalée à la copie', async ({ page }) => {
  await baseGrille(page, 'ignorer');
  await copier(page);
  // Avant : la note de e partait comme un 20 complet, rien ne la distinguait de celle de f.
  await expect(page.locator('#vue .statut').filter({ hasText: 'Colonne copiée' })).toContainText('1 note sur une partie des critères');
  const liste = page.locator('ul.partiels li');
  await expect(liste).toHaveCount(1);
  await expect(liste.first()).toContainText('AFICTIF Un, note calculée sur 2 critères sur 4');
  expect(await page.evaluate(() => window.__copie)).toBe('20\r\n20');
});

test('Notes partielles — avec la règle « compter comme zéro », le signalement dit ce qui a été compté', async ({ page }) => {
  await baseGrille(page, 'zero');
  await copier(page);
  await expect(page.locator('ul.partiels li').first()).toContainText('AFICTIF Un, 2 critères non évalués comptés zéro');
  expect(await page.evaluate(() => window.__copie)).toBe('10\r\n20');
});
