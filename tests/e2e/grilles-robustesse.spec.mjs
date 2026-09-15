// Grilles d'évaluation : concurrence, clavier et sauvegardes. Les quatre premiers tests sont REPRIS de
// la copie de travail de Codex (`copie-codex/tests/e2e/audit-senior.spec.mjs`, AUD-002 et AUD-006).
// Les deux derniers sont propres à l'intégration : ils fixent la frontière de la validation des
// sauvegardes — STRICTE sur les structures neuves des grilles, TOLÉRANTE envers l'historique.
// ⚠ Aucune donnée nominative : noms INVENTÉS.

import { test, expect } from '@playwright/test';

const STORES = ['meta', 'classes', 'eleves', 'edt', 'sequences', 'seances', 'appels', 'inaptitudes',
  'certificats', 'fichiers', 'evaluations', 'notes', 'documents', 'observations', 'grilles'];

test.use({ permissions: ['clipboard-read', 'clipboard-write'] });

// Une classe, deux élèves, une évaluation par grille construite sur la grille par défaut.
const preparer = (page) => page.evaluate(async (stores) => {
  const io = await import('/js/io.js');
  const { nouvelleGrille } = await import('/js/grilles-calcul.js');
  await io.ouvrirDB();
  for (const s of stores) await io.vider(s);
  const g = nouvelleGrille();
  g.id = 'g';
  await io.restaurer({
    classes: [{ id: 'c', nom: '6TEST', archivee: false }],
    eleves: [
      { id: 'e', classeId: 'c', nom: 'AFICTIF', prenom: 'Un', actif: true },
      { id: 'f', classeId: 'c', nom: 'BFICTIF', prenom: 'Deux', actif: true },
    ],
    sequences: [{ id: 's', classeId: 'c', apsa: 'Badminton' }],
    evaluations: [{ id: 'v', sequenceId: 's', titre: 'Test', type: 'grille', bareme: 20, coef: 1, grille: g }],
    notes: [],
  });
}, STORES);
const noteEnBase = (page) => page.evaluate(async () => (await import('/js/io.js')).lire('notes', 'v_e'));

test.beforeEach(async ({ page }) => { await page.goto('/'); await preparer(page); });

test('AUD-002 (grilles) — un onglet périmé ne peut pas effacer une observation', async ({ page, context }) => {
  await page.goto('/#/grilles/saisie/v');
  const autre = await context.newPage();
  await autre.goto('/#/grilles/saisie/v');
  await expect(autre.locator('.grille-critere')).toHaveCount(4);
  await page.locator('.grille-critere').first().getByRole('button', { name: /^Maîtrisé/ }).click();
  await expect(page.locator('#vue > .statut')).toHaveText('Enregistré ✓');
  // L'autre onglet croit la note vide : son choix sur un AUTRE critère ne doit pas écraser le premier.
  await autre.locator('.grille-critere').nth(1).getByRole('button', { name: /^Satisfaisant/ }).click();
  await expect(autre.locator('#vue > .statut')).toContainText(/autre onglet/);
  expect(Object.keys((await noteEnBase(page)).detail)).toHaveLength(1);
  await autre.reload();
  await autre.locator('.grille-critere').nth(1).getByRole('button', { name: /^Satisfaisant/ }).click();
  await expect(autre.locator('#vue > .statut')).toHaveText('Enregistré ✓');
  expect(Object.keys((await noteEnBase(page)).detail)).toHaveLength(2);
});

test('AUD-006 — passer d’un élève ou d’un critère à l’autre garde le focus clavier', async ({ page }) => {
  await page.goto('/#/grilles/saisie/v');
  for (const nom of ['Élève suivant', 'Élève précédent']) {
    const bouton = page.getByRole('button', { name: nom, exact: true });
    await bouton.focus();
    await bouton.press('Enter');
    await expect(bouton).toBeFocused();
  }
  await page.getByLabel('Mode de saisie').selectOption('critere');
  const suivant = page.getByRole('button', { name: 'Critère suivant', exact: true });
  await suivant.focus();
  await suivant.press('Enter');
  await expect(suivant).toBeFocused();
});

test('AUD-002 (grilles) — « Copier pour Pronote » relit une note de grille saisie dans un autre onglet', async ({ page, context }) => {
  await page.goto('/#/notes/eval/v');
  const autre = await context.newPage();
  await autre.goto('/#/grilles/saisie/v');
  await autre.locator('.grille-critere').first().getByRole('button', { name: /^Maîtrisé/ }).click();
  await expect(autre.locator('#vue > .statut')).toHaveText('Enregistré ✓');
  await page.evaluate(() => { navigator.clipboard.writeText = async (t) => { window.__copie = t; }; });
  await page.getByRole('button', { name: 'Copier pour Pronote', exact: true }).click();
  await expect.poll(() => page.evaluate(() => window.__copie)).toBe('20\r\n');
});

test('AUD-002 (grilles) — une note modifiée pendant la copie ne laisse pas confirmer la publication', async ({ page, context }) => {
  await page.goto('/#/grilles/saisie/v');
  await page.locator('.grille-critere').first().getByRole('button', { name: /^Maîtrisé/ }).click();
  await expect(page.locator('#vue > .statut')).toHaveText('Enregistré ✓');
  const autre = await context.newPage();
  await autre.goto('/#/grilles/saisie/v');
  await page.goto('/#/notes/eval/v');
  await page.evaluate(() => { navigator.clipboard.writeText = () => new Promise((r) => { window.__finCopie = r; }); });
  await page.getByRole('button', { name: 'Copier pour Pronote', exact: true }).click();
  await expect.poll(() => page.evaluate(() => typeof window.__finCopie)).toBe('function');
  await autre.locator('.grille-critere').nth(1).getByRole('button', { name: /^Satisfaisant/ }).click();
  await expect(autre.locator('#vue > .statut')).toHaveText('Enregistré ✓');
  const telechargement = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exporter CSV', exact: true }).click();
  await telechargement;
  await page.evaluate(() => window.__finCopie());
  await expect(page.locator('#vue')).toContainText('publication non confirmée');
  expect((await page.evaluate(async () => (await import('/js/io.js')).lire('evaluations', 'v'))).publieePronote).toBeFalsy();
});

test('Sauvegarde ancienne — un historique imparfait reste restaurable en schéma 3', async ({ page }) => {
  // Quatre anomalies héritées d'avant les gardes actuelles, que la v0.12 restaurait sans broncher.
  // La copie de travail de Codex refusait le fichier ENTIER pour une seule d'entre elles : le jour
  // où un téléphone casse, la sauvegarde de l'année devenait inutilisable.
  const r = await page.evaluate(async () => {
    const io = await import('/js/io.js');
    const vide = ['meta', 'edt', 'seances', 'appels', 'inaptitudes', 'certificats', 'fichiers', 'documents', 'observations'];
    const sauvegarde = {
      app: 'carnet-eps', schemaVersion: 2, dateExport: '2026-06-30T10:00:00Z',
      stores: {
        ...Object.fromEntries(vide.map((s) => [s, []])),
        classes: [{ id: 'c1', nom: '6ANCIENNE', archivee: false }],
        eleves: [{ id: 'e1', classeId: 'c1', nom: 'AFICTIF', prenom: 'Un', actif: true }],
        sequences: [
          { id: 'sq1', classeId: 'c1', apsa: 'Bad' },
          { id: 'sq2', classeId: 'c-supprimee', apsa: 'Foot' }, // séquence d'une classe supprimée
        ],
        evaluations: [
          { id: 'ev1', sequenceId: 'sq1', titre: 'Ancien barème', type: 'bareme', bareme: 0, coef: 1 }, // barème à 0
          { id: 'ev2', sequenceId: 'sq1', titre: 'Contrôle', type: 'bareme', bareme: 10, coef: 1 },
        ],
        notes: [
          { id: 'ev2_e1', evaluationId: 'ev2', eleveId: 'e1', valeur: 12, commentaire: '' }, // au-dessus du barème
          { id: 'ev2_e9', evaluationId: 'ev2', eleveId: 'e9', valeur: 5, commentaire: '' }, // élève supprimé
        ],
      },
    };
    let refus = null;
    try { io.validerExport(sauvegarde); await io.importerJSON(sauvegarde); } catch (e) { refus = e.message; }
    return { refus, notes: (await io.tous('notes')).length, evaluations: (await io.tous('evaluations')).length };
  });
  expect(r).toEqual({ refus: null, notes: 2, evaluations: 2 });
});

test('Sauvegarde — une note de GRILLE incohérente est refusée avant toute écriture', async ({ page }) => {
  // Donnée neuve, produite par la v0.13 : un détail qui ne correspond pas aux critères ferait planter
  // l'écran de saisie. Là, et là seulement, la validation reste stricte.
  const r = await page.evaluate(async () => {
    const io = await import('/js/io.js');
    const propre = await io.exporterJSON();
    const ev = propre.stores.evaluations[0];
    const [c0] = ev.grille.criteres;
    const niveauMax = ev.grille.niveaux.at(-1).cle;
    const cas = {
      'note différente du calcul': { id: 'v_e', evaluationId: 'v', eleveId: 'e', valeur: 3, detail: { [c0.id]: niveauMax }, commentaire: '' },
      'critère inconnu': { id: 'v_e', evaluationId: 'v', eleveId: 'e', valeur: 20, detail: { inconnu: niveauMax }, commentaire: '' },
      'niveau inconnu': { id: 'v_e', evaluationId: 'v', eleveId: 'e', valeur: 20, detail: { [c0.id]: 'niveau-fantome' }, commentaire: '' },
    };
    const refuses = {};
    for (const [nom, note] of Object.entries(cas)) {
      const s = structuredClone(propre);
      s.stores.notes = [note];
      try { await io.importerJSON(s); refuses[nom] = false; } catch { refuses[nom] = true; }
    }
    // Contrôle : la note juste, elle, passe.
    const juste = structuredClone(propre);
    juste.stores.notes = [{ id: 'v_e', evaluationId: 'v', eleveId: 'e', valeur: 20, detail: { [c0.id]: niveauMax }, commentaire: '' }];
    await io.importerJSON(juste);
    return { refuses, apresImport: (await io.lire('notes', 'v_e'))?.valeur };
  });
  expect(r).toEqual({
    refuses: { 'note différente du calcul': true, 'critère inconnu': true, 'niveau inconnu': true },
    apresImport: 20,
  });
});
