// Non-régression de l'audit Codex V3 (`audit codex/AUDIT_V3.md`, 2026-09-09) — lot V3-A.
// CLASSE de défauts V3-01 : un champ dont l'écriture est REFUSÉE laisse sa valeur dans l'objet en
// mémoire ; la prochaine écriture réussie d'un AUTRE champ du même objet la persiste en silence.
// Chaque test refuse un champ, puis modifie un champ voisin, et exige que la valeur refusée
// n'apparaisse jamais en base. Tous étaient ROUGES avant le lot.

import { test, expect } from '@playwright/test';
import { readdirSync, readFileSync } from 'node:fs';

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

// Refuse les écritures sur UN store, jusqu'à `relacher()`.
const saboter = (page, store) => page.evaluate((s) => {
  window.__refuse = true;
  const put = IDBObjectStore.prototype.put;
  IDBObjectStore.prototype.put = function (...a) {
    if (this.name === s && window.__refuse) throw new DOMException('Écriture refusée (simulée)', 'QuotaExceededError');
    return put.apply(this, a);
  };
}, store);
const relacher = (page) => page.evaluate(() => { window.__refuse = false; });
const lire = (page, store, id) => page.evaluate(async ({ store, id }) => (await (await import('/js/io.js')).lire(store, id)), { store, id });

async function seedBase(page) {
  await page.evaluate(async () => {
    const io = await import('/js/io.js');
    await io.restaurer({
      classes: [{ id: 'c1', nom: '6A', niveau: '6e', couleur: '#1f6feb', ordre: 0, archivee: false }],
      eleves: [{ id: 'e1', classeId: 'c1', nom: 'A', prenom: 'B', sexe: 'F', dateNaissance: '2014-03-12', notesPerso: '', actif: true }],
      sequences: [{ id: 'sq', classeId: 'c1', apsa: 'Badminton', ca: 4, dateDebut: '2026-01-01', dateFin: '2026-12-31', nbSeancesPrevu: 6, objectifs: '', bilan: '' }],
      evaluations: [{ id: 'ev', sequenceId: 'sq', titre: 'Contrôle', date: '2026-09-01', type: 'bareme', bareme: 10, coef: 1, publieePronote: null }],
      notes: [{ id: 'ev_e1', evaluationId: 'ev', eleveId: 'e1', valeur: 8, commentaire: '' }],
      inaptitudes: [{ id: 'i1', eleveId: 'e1', type: 'partielle', origine: 'certificat', dateDebut: '2026-09-01', dateFin: '2026-12-31', restrictions: [], certificatId: null, commentaire: '' }],
    });
  });
}

test('V3-01 (évaluation) — un barème refusé n’est pas persisté plus tard par une modification du titre', async ({ page }) => {
  await seedBase(page);
  await page.goto('/#/notes/eval/ev');
  await saboter(page, 'evaluations');
  await page.locator('#ge-bareme').fill('20');
  await page.locator('#ge-bareme').dispatchEvent('change');
  await expect(page.locator('.toast').last()).toContainText('Non enregistré');
  await expect(page.locator('#ge-bareme')).toHaveValue('10'); // le champ est restauré (contrat V2-04)
  expect((await lire(page, 'evaluations', 'ev')).bareme).toBe(10);
  await relacher(page);
  await page.locator('#ge-titre').fill('TITRE MODIFIE');
  await page.locator('#ge-titre').dispatchEvent('change');
  await expect.poll(async () => (await lire(page, 'evaluations', 'ev')).titre).toBe('TITRE MODIFIE');
  expect((await lire(page, 'evaluations', 'ev')).bareme).toBe(10); // avant : 20, la valeur REFUSÉE, écrite en silence
  await expect(page.locator('#ge-bareme')).toHaveValue('10');
});

test('V3-01 (évaluation) — un marquage « publiée » refusé ne se réécrit pas plus tard', async ({ page }) => {
  await seedBase(page);
  await page.goto('/#/notes/eval/ev');
  await saboter(page, 'evaluations');
  await page.getByRole('button', { name: /Marquer remontée dans Pronote/ }).click();
  await expect(page.locator('.toast').last()).toBeVisible();
  expect((await lire(page, 'evaluations', 'ev')).publieePronote).toBeNull();
  await relacher(page);
  await page.locator('#ge-titre').fill('AUTRE TITRE');
  await page.locator('#ge-titre').dispatchEvent('change');
  await expect.poll(async () => (await lire(page, 'evaluations', 'ev')).titre).toBe('AUTRE TITRE');
  expect((await lire(page, 'evaluations', 'ev')).publieePronote).toBeNull(); // avant : une publication JAMAIS faite était enregistrée
});

test('V3-01 (séquence) — une date de début refusée n’est pas persistée par la saisie des objectifs', async ({ page }) => {
  await seedBase(page);
  await page.goto('/#/sequences/sq');
  await saboter(page, 'sequences');
  await page.locator('#sd-debut').fill('2026-03-15'); // date : fill() émet DÉJÀ change — un second événement relirait la valeur restaurée et réparerait l'objet par accident
  await expect(page.locator('.toast').last()).toContainText('Non enregistré');
  await expect(page.locator('#sd-debut')).toHaveValue('2026-01-01');
  await relacher(page);
  await page.locator('#sd-obj').fill('AFL2 : coopérer');
  await page.locator('#sd-obj').dispatchEvent('change');
  await expect.poll(async () => (await lire(page, 'sequences', 'sq')).objectifs).toBe('AFL2 : coopérer');
  expect((await lire(page, 'sequences', 'sq')).dateDebut).toBe('2026-01-01'); // avant : 2026-03-15, refusée puis écrite
});

test('V3-01 (fiche élève) — un sexe refusé n’est pas persisté par la saisie du « à savoir »', async ({ page }) => {
  await seedBase(page);
  await page.goto('/#/eleves/fiche/e1');
  await saboter(page, 'eleves');
  await page.locator('#f-sexe').selectOption('M');
  await expect(page.locator('.toast').last()).toContainText('Non enregistré');
  await expect(page.locator('#f-sexe')).toHaveValue('F'); // restauré
  await relacher(page);
  await page.locator('#f-notes').fill('asthme');
  await page.locator('#f-notes').dispatchEvent('change');
  await expect.poll(async () => (await lire(page, 'eleves', 'e1')).notesPerso).toBe('asthme');
  expect((await lire(page, 'eleves', 'e1')).sexe).toBe('F'); // avant : M, refusé puis écrit
});

test('V3-01 (inaptitude) — une origine refusée n’est pas persistée par la saisie du commentaire', async ({ page }) => {
  await seedBase(page);
  await page.goto('/#/inaptitudes/i1');
  await saboter(page, 'inaptitudes');
  await page.locator('#di-origine').selectOption('mot');
  await expect(page.locator('.toast').last()).toContainText('Non enregistré');
  await expect(page.locator('#di-origine')).toHaveValue('certificat');
  await relacher(page);
  await page.locator('#di-comm').fill('épaule');
  await page.locator('#di-comm').dispatchEvent('change');
  await expect.poll(async () => (await lire(page, 'inaptitudes', 'i1')).commentaire).toBe('épaule');
  expect((await lire(page, 'inaptitudes', 'i1')).origine).toBe('certificat'); // avant : mot, refusée puis écrite
});

test('V3-01 (sans filet) — couleur de classe et restrictions d’inaptitude : une écriture refusée le dit et ne se réécrit pas', async ({ page }) => {
  await seedBase(page);
  // (a) Couleur d'une classe : aucun try/catch aujourd'hui — refus silencieux au niveau du champ.
  await page.goto('/#/eleves/classe/c1');
  await saboter(page, 'classes');
  await page.locator('#cl-couleur').fill('#ff0000'); // color : fill() émet déjà change
  await expect(page.locator('.toast').last()).toContainText('Couleur non enregistrée');
  await relacher(page);
  await page.locator('#cl-niveau').fill('5e');
  await page.locator('#cl-niveau').dispatchEvent('change');
  await expect.poll(async () => (await lire(page, 'classes', 'c1')).niveau).toBe('5e');
  expect((await lire(page, 'classes', 'c1')).couleur).toBe('#1f6feb'); // avant : #ff0000, refusée puis écrite

  // (b) Cases « restrictions » d'une inaptitude : même absence de filet.
  await page.goto('/#/inaptitudes/i1');
  await saboter(page, 'inaptitudes');
  await page.locator('#di-r-course').click(); // .check() exigerait que la case RESTE cochée : elle est justement décochée par le refus
  await expect(page.locator('.toast').last()).toContainText('Restriction non enregistrée');
  await expect(page.locator('#di-r-course')).not.toBeChecked(); // la case revient à son état enregistré
  await relacher(page);
  await page.locator('#di-comm').fill('genou');
  await page.locator('#di-comm').dispatchEvent('change');
  await expect.poll(async () => (await lire(page, 'inaptitudes', 'i1')).commentaire).toBe('genou');
  expect((await lire(page, 'inaptitudes', 'i1')).restrictions).toEqual([]); // avant : ['course'], refusée puis écrite
});

test('V3-01 (garde de classe) — aucun module ne modifie un objet métier juste avant de l’écrire', async () => {
  // Les six tests ci-dessus prouvent le comportement sur cinq objets ; cette garde couvre la CLASSE,
  // y compris les sites sans test dédié et ceux qu'on écrira demain. Motif interdit : une affectation
  // « objet.champ = … ; » immédiatement suivie d'un appel d'écriture (audit Codex V3, V3-01).
  const dossier = new URL('../../app/js/modules/', import.meta.url);
  const motif = /\b\w+\.\w+ = [^;\n]+;\s*(?:await\s+)?(?:sauver|sauverEv|enregistrer)\s*\(/g;
  const fautes = [];
  for (const f of readdirSync(dossier).filter((n) => n.endsWith('.js'))) {
    const src = readFileSync(new URL(f, dossier), 'utf8');
    for (const m of src.matchAll(motif)) fautes.push(`${f} → ${m[0].replace(/\s+/g, ' ').trim()}`);
  }
  expect(fautes).toEqual([]); // avant : le bouton « Archiver » d'une classe écrivait encore l'objet muté
});

test('V3-01 (symétrique) — une date d’évaluation refusée n’est pas persistée par le marquage « publiée »', async ({ page }) => {
  // Les rôles sont inversés par rapport au premier test : ici c'est la DATE qui est refusée, et le
  // marquage « publiée » qui écrit ensuite. Chaque champ doit tenir des deux côtés.
  await seedBase(page);
  await page.goto('/#/notes/eval/ev');
  await saboter(page, 'evaluations');
  await page.locator('#ge-date').fill('2026-10-30'); // date : champ RESTAURÉ à l'écran après un refus, donc la base ne doit jamais le voir
  await expect(page.locator('.toast').last()).toContainText('Non enregistré');
  await expect(page.locator('#ge-date')).toHaveValue('2026-09-01');
  await relacher(page);
  await page.getByRole('button', { name: /Marquer remontée dans Pronote/ }).click();
  await expect.poll(async () => (await lire(page, 'evaluations', 'ev')).publieePronote).not.toBeNull();
  expect((await lire(page, 'evaluations', 'ev')).date).toBe('2026-09-01'); // avant : « 2026-10-30 », refusée puis écrite
});

test('V3-A (course) — deux champs modifiés coup sur coup sont TOUS LES DEUX enregistrés', async ({ page }) => {
  // Écrire avant de muter protège d'un refus, mais expose à une course : si le second changement
  // construit son candidat pendant que la première écriture est encore en vol, il repart de l'objet
  // d'AVANT et écrase la première modification (revue adversariale du lot V3-A).
  await seedBase(page);
  await page.goto('/#/eleves/fiche/e1');
  await page.evaluate(() => {
    for (const [id, valeur] of [['#f-nom', 'NOUVEAUNOM'], ['#f-prenom', 'NOUVEAUPRENOM']]) {
      const champ = document.querySelector(id);
      champ.value = valeur;
      champ.dispatchEvent(new Event('change', { bubbles: true })); // sans attendre la fin de l'écriture précédente
    }
  });
  await expect.poll(async () => {
    const e = await lire(page, 'eleves', 'e1');
    return { nom: e.nom, prenom: e.prenom };
  }).toEqual({ nom: 'NOUVEAUNOM', prenom: 'NOUVEAUPRENOM' }); // avant : le nom était perdu
});
