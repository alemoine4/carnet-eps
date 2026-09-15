// Audit Codex V3, famille B : la passerelle Pronote doit dire la vérité.
// V3-02 — « Copier pour Pronote » lit la grille pendant qu'une saisie est encore en vol.
// V3-03 — le marquage « publiée » survit à une modification des données exportables.
// ⚠ Aucune donnée nominative : noms INVENTÉS.

import { test, expect } from '@playwright/test';

const STORES = ['meta', 'classes', 'eleves', 'edt', 'sequences', 'seances', 'appels',
  'inaptitudes', 'certificats', 'fichiers', 'evaluations', 'notes', 'documents', 'observations'];

test.use({ permissions: ['clipboard-read', 'clipboard-write'] });

const EVAL_PUBLIEE = { id: 'ev', sequenceId: 'sq', titre: 'Contrôle', date: '2026-09-01', type: 'bareme', bareme: 10, coef: 1, publieePronote: '2026-09-05' };

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(async (stores) => {
    const io = await import('/js/io.js');
    await io.ouvrirDB();
    for (const s of stores) await io.vider(s);
    await io.enregistrer('classes', { id: 'c1', nom: '6A', archivee: false });
    await io.enregistrer('eleves', { id: 'e1', classeId: 'c1', nom: 'AFICTIF', prenom: 'Un', actif: true });
    await io.enregistrer('eleves', { id: 'e2', classeId: 'c1', nom: 'BFICTIF', prenom: 'Deux', actif: true });
    await io.enregistrer('sequences', { id: 'sq', classeId: 'c1', apsa: 'Bad', dateDebut: '2020-01-01', dateFin: '2099-12-31' });
    await io.enregistrer('evaluations', { id: 'ev', sequenceId: 'sq', titre: 'Contrôle', date: '2026-09-01', type: 'bareme', bareme: 10, coef: 1, publieePronote: null });
    await io.enregistrer('notes', { id: 'ev_e1', evaluationId: 'ev', eleveId: 'e1', valeur: 8, commentaire: '' });
  }, STORES);
});

// Retient le PREMIER `put` sur le magasin visé en gardant sa transaction ouverte par une chaîne
// de `get` : l'écriture reste réellement en vol tant que le test ne la libère pas.
const retenirEcriture = (page, magasin) => page.evaluate((m) => {
  const put = IDBObjectStore.prototype.put;
  window.__liberer = false; window.__tenue = false;
  IDBObjectStore.prototype.put = function (...a) {
    const r = put.apply(this, a);
    if (this.name === m && !window.__tenue) {
      window.__tenue = true;
      const store = this;
      const boucle = () => { if (window.__liberer) return; const g = store.get('__aucun__'); g.onsuccess = boucle; };
      boucle();
    }
    return r;
  };
}, magasin);
const liberer = (page) => page.evaluate(() => { window.__liberer = true; });
const espionnerCopie = (page) => page.evaluate(() => {
  window.__copie = null;
  navigator.clipboard.writeText = (t) => { window.__copie = t; return Promise.resolve(); };
});
const publier = (page) => page.evaluate(async (ev) => {
  await (await import('/js/io.js')).enregistrer('evaluations', ev);
}, EVAL_PUBLIEE);

test('V3-02 — « Copier pour Pronote » attend les écritures en vol au lieu de copier l’ancienne note', async ({ page }) => {
  await page.goto('/#/notes/eval/ev');
  await expect(page.locator('.input-note')).toHaveCount(2);
  await espionnerCopie(page);
  await retenirEcriture(page, 'notes');
  // La note passe de 8 à 9 ; l'écriture est retenue, donc encore en vol.
  await page.locator('.input-note').first().fill('9');
  await page.locator('.input-note').first().dispatchEvent('change');
  await page.getByRole('button', { name: 'Copier pour Pronote' }).click();
  // Avant : la colonne partait immédiatement avec « 8 », pendant que la base enregistrait « 9 ».
  expect(await page.evaluate(() => window.__copie)).toBe(null);
  await liberer(page);
  await expect.poll(() => page.evaluate(() => window.__copie)).toBe('9\r\n');
  expect(await page.evaluate(async () => (await (await import('/js/io.js')).lire('notes', 'ev_e1')).valeur)).toBe(9);
});

test('V3-02 — une écriture de note REFUSÉE empêche la copie au lieu de transmettre l’ancienne valeur', async ({ page }) => {
  await page.goto('/#/notes/eval/ev');
  await expect(page.locator('.input-note')).toHaveCount(2);
  await espionnerCopie(page);
  await page.evaluate(() => {
    const put = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (...a) {
      if (this.name === 'notes') throw new Error('disque plein');
      return put.apply(this, a);
    };
  });
  await page.locator('.input-note').first().fill('9');
  await page.locator('.input-note').first().dispatchEvent('change');
  await page.getByRole('button', { name: 'Copier pour Pronote' }).click();
  await expect(page.locator('#vue .statut-erreur').last()).toContainText('note');
  expect(await page.evaluate(() => window.__copie)).toBe(null);
});

test('V3-03 — changer le barème après publication demande une nouvelle remontée', async ({ page }) => {
  await publier(page);
  await page.goto('/#/notes/eval/ev');
  await expect(page.locator('.badge')).toContainText('publiée');
  // Les points bruts sont conservés : 8/10 devient 8/20. Ce qui est parti dans Pronote est FAUX.
  await page.locator('#ge-bareme').fill('20');
  await page.locator('#ge-bareme').dispatchEvent('change');
  await expect(page.locator('.badge')).toContainText('à remettre à jour');
  // La date de publication est CONSERVÉE : elle dit quand la remontée a eu lieu.
  await expect(page.locator('.badge')).toContainText('05/09');
  const ev = await page.evaluate(async () => (await (await import('/js/io.js')).lire('evaluations', 'ev')));
  expect(ev.publieePronote).toBe('2026-09-05');
  expect(ev.publieeObsolete).toBe(true);
});

test('V3-03 — modifier une NOTE après publication demande aussi une nouvelle remontée', async ({ page }) => {
  await publier(page);
  await page.goto('/#/notes/eval/ev');
  await expect(page.locator('.badge')).toContainText('publiée');
  await page.locator('.input-note').first().fill('7');
  await page.locator('.input-note').first().dispatchEvent('change');
  await expect(page.locator('.badge')).toContainText('à remettre à jour');
  expect(await page.evaluate(async () => (await (await import('/js/io.js')).lire('evaluations', 'ev')).publieeObsolete)).toBe(true);
});

test('V3-03 — l’alerte de suivi redemande la remontée au lieu de croire l’évaluation à jour', async ({ page }) => {
  await publier(page);
  await page.goto('/#/notes/eval/ev');
  await page.locator('#ge-bareme').fill('20');
  await page.locator('#ge-bareme').dispatchEvent('change');
  await expect(page.locator('.badge')).toContainText('à remettre à jour');
  await page.goto('/#/suivi');
  await expect(page.locator('#vue')).toContainText('à remettre à jour');
});

test('V3-03 (témoin) — une nouvelle copie Pronote efface la demande de remontée', async ({ page }) => {
  await page.evaluate(async () => {
    await (await import('/js/io.js')).enregistrer('evaluations',
      { id: 'ev', sequenceId: 'sq', titre: 'Contrôle', date: '2026-09-01', type: 'bareme', bareme: 10, coef: 1, publieePronote: '2026-09-05', publieeObsolete: true });
  });
  await page.goto('/#/notes/eval/ev');
  await expect(page.locator('.badge')).toContainText('à remettre à jour');
  await espionnerCopie(page);
  await page.getByRole('button', { name: 'Copier pour Pronote' }).click();
  await expect(page.locator('.badge')).not.toContainText('à remettre à jour');
  await expect(page.locator('.badge')).toContainText('publiée');
  expect(await page.evaluate(async () => (await (await import('/js/io.js')).lire('evaluations', 'ev')).publieeObsolete)).toBeFalsy();
});
