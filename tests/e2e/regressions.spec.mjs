// Tests de non-régression des correctifs d'audit (2026-09-05, rapport docs/audit-2026-09-05.md).
// Un test par constat corrigé (Bxx) : s'il casse, c'est que le défaut est revenu.
import { test, expect } from '@playwright/test';

const STORES = ['meta', 'classes', 'eleves', 'edt', 'sequences', 'seances', 'appels',
  'inaptitudes', 'certificats', 'fichiers', 'evaluations', 'notes', 'documents', 'observations'];

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(async (stores) => {
    const io = await import('/js/io.js');
    await io.ouvrirDB();
    for (const s of stores) await io.vider(s);
  }, STORES);
});

// Classe 6A de n élèves + séquence active + séance du jour « se ».
async function seedClasse(page, n) {
  await page.evaluate(async ({ n, today }) => {
    const io = await import('/js/io.js');
    await io.enregistrer('classes', { id: 'c1', nom: '6A', archivee: false });
    for (let i = 0; i < n; i++) {
      await io.enregistrer('eleves', { id: 'e' + String(i).padStart(2, '0'), classeId: 'c1', nom: 'NOM' + String(i).padStart(2, '0'), prenom: 'Prenom' + i, actif: true });
    }
    await io.enregistrer('sequences', { id: 'sq', classeId: 'c1', apsa: 'Bad', nbSeancesPrevu: 5, dateDebut: '2026-01-01', dateFin: '2026-12-31' });
    await io.enregistrer('seances', { id: 'se', sequenceId: 'sq', date: today, edtId: null, numero: 1, annulee: false });
  }, { n, today: today() });
}

// Créneau EDT couvrant toute la journée d'aujourd'hui (pour « Créer la séance » sans séance existante).
async function seedEdtSansSeance(page) {
  await page.evaluate(async () => {
    const io = await import('/js/io.js');
    const jour = ((new Date().getDay() + 6) % 7) + 1;
    await io.enregistrer('classes', { id: 'c1', nom: '6A', archivee: false });
    await io.enregistrer('eleves', { id: 'e1', classeId: 'c1', nom: 'A', prenom: 'B', actif: true });
    await io.enregistrer('sequences', { id: 'sq', classeId: 'c1', apsa: 'Bad', nbSeancesPrevu: 5, dateDebut: '2026-01-01', dateFin: '2026-12-31' });
    await io.enregistrer('edt', { id: 'cr1', jour, heureDebut: '00:00', heureFin: '23:59', classeId: 'c1', semaine: 'AB', installation: '' });
  });
}

const nbSeances = (page) => page.evaluate(async () => (await (await import('/js/io.js')).tous('seances')).length);

test('B01 — grille d’appel : 2 colonnes dès 360 px de large', async ({ page }) => {
  await seedClasse(page, 6);
  for (const w of [360, 375]) {
    await page.setViewportSize({ width: w, height: 740 });
    await page.goto('/#/appel/se');
    await expect(page.locator('.btn-eleve')).toHaveCount(6);
    const cols = await page.evaluate(() => getComputedStyle(document.querySelector('.grille-appel')).gridTemplateColumns.split(' ').length);
    expect(cols, `${w} px`).toBe(2);
  }
});

test('B02 — import JSON altéré (enregistrement sans id) refusé AVANT toute écriture', async ({ page }) => {
  const res = await page.evaluate(async () => {
    const io = await import('/js/io.js');
    await io.enregistrer('classes', { id: 'c1', nom: 'ANCIENNE', archivee: false });
    await io.enregistrer('seances', { id: 's1', sequenceId: 'x', date: '2026-01-01' });
    const dump = { app: 'carnet-eps', schemaVersion: 2, dateExport: '2026-09-05', stores: { classes: [{ id: 'c2', nom: 'NOUVELLE' }], seances: [{ nom: 'sans id' }] } };
    let erreur = null;
    try { await io.importerJSON(dump); } catch (e) { erreur = e.message; }
    return { erreur, classes: (await io.tous('classes')).map((c) => c.nom), seances: (await io.tous('seances')).map((s) => s.id) };
  });
  expect(res.erreur).toMatch(/sauvegarde altérée.*seances.*ligne 1/);
  expect(res.classes).toEqual(['ANCIENNE']); // rien n'a été remplacé
  expect(res.seances).toEqual(['s1']);        // rien n'a été vidé
});

test('B03 — un défilement (pointercancel) n’ouvre pas le menu de statut', async ({ page }) => {
  await seedClasse(page, 3);
  await page.goto('/#/appel/se');
  const cible = page.locator('.eleve-cycle').first();
  await expect(cible).toBeVisible();
  await cible.dispatchEvent('pointerdown', { pointerType: 'touch', isPrimary: true });
  await page.waitForTimeout(100);
  await cible.dispatchEvent('pointercancel', { pointerType: 'touch', isPrimary: true });
  await page.waitForTimeout(600);
  await expect(page.locator('dialog.feuille[open]')).toHaveCount(0);
});

test('B04 — double tap rapide : présent → absent → oubli de tenue (pas de tap perdu)', async ({ page }) => {
  await seedClasse(page, 3);
  await page.goto('/#/appel/se');
  await expect(page.locator('.btn-eleve')).toHaveCount(3);
  await page.locator('.eleve-cycle').first().dblclick();
  await expect(page.locator('.btn-eleve').first()).toHaveAttribute('data-statut', 'oubli_tenue');
  const statut = await page.evaluate(async () => (await (await import('/js/io.js')).lire('appels', 'se_e00'))?.statut);
  expect(statut).toBe('oubli_tenue');
});

test('B05 — double clic « Créer la séance » (sélecteur d’appel) : une seule séance', async ({ page }) => {
  await seedEdtSansSeance(page);
  await page.goto('/#/appel');
  const btn = page.getByRole('button', { name: 'Créer la séance + appel' });
  await expect(btn).toBeVisible();
  await btn.dblclick();
  await expect(page).toHaveURL(/#\/appel\/[0-9a-f-]{36}$/);
  expect(await nbSeances(page)).toBe(1);
});

test('B05 — double clic « Créer la séance » (accueil) : une seule séance', async ({ page }) => {
  await seedEdtSansSeance(page);
  await page.goto('/#/accueil');
  const btn = page.getByRole('button', { name: /Créer la séance 1\/5/ });
  await expect(btn).toBeVisible();
  await btn.dblclick();
  await expect(page).toHaveURL(/#\/appel\/[0-9a-f-]{36}$/);
  expect(await nbSeances(page)).toBe(1);
});

test('B06 — compteur « saisis » ignore l’élève parti dans une autre classe, voit le nouveau', async ({ page }) => {
  await seedClasse(page, 3);
  await page.evaluate(async () => {
    const io = await import('/js/io.js');
    for (const e of ['e00', 'e01', 'e02']) await io.enregistrer('appels', { id: `se_${e}`, seanceId: 'se', eleveId: e, statut: 'present' });
    await io.enregistrer('classes', { id: 'c9', nom: '6Z', archivee: false });
    const e2 = await io.lire('eleves', 'e02'); e2.classeId = 'c9'; await io.enregistrer('eleves', e2);
    await io.enregistrer('eleves', { id: 'e03', classeId: 'c1', nom: 'NOUVEAU', prenom: 'X', actif: true });
  });
  await page.goto('/#/appel/se');
  await expect(page.locator('.compteurs')).toContainText('2/3 saisis');
  await expect(page.getByRole('button', { name: /Terminer l’appel · 1 passé/ })).toBeVisible();
});

test('B07/B08 — contrastes : rouge d’alerte thématisé, texte des badges assombri', async ({ page, browser }) => {
  await page.goto('/#/eleves');
  const badgeClair = await page.evaluate(() => {
    const b = document.createElement('span'); b.className = 'badge'; document.body.append(b);
    const c = getComputedStyle(b).color; b.remove(); return c;
  });
  expect(badgeClair).toBe('rgb(70, 86, 114)'); // #465672 → 5,7:1 sur --c-bordure

  const ctx = await browser.newContext({ colorScheme: 'dark', baseURL: 'http://localhost:8160' });
  const sombre = await ctx.newPage();
  await sombre.goto('/#/eleves');
  const couleurs = await sombre.evaluate(() => {
    const p = document.createElement('p'); p.className = 'statut statut-erreur'; document.body.append(p);
    const btn = document.createElement('button'); btn.className = 'btn btn-danger'; document.body.append(btn);
    const r = { erreur: getComputedStyle(p).color, btnFond: getComputedStyle(btn).backgroundColor, btnTexte: getComputedStyle(btn).color, schema: getComputedStyle(document.documentElement).colorScheme };
    p.remove(); btn.remove(); return r;
  });
  await ctx.close();
  expect(couleurs.erreur).toBe('rgb(240, 99, 99)');   // #f06363 → 5,0:1 sur surface sombre
  expect(couleurs.btnFond).toBe('rgb(240, 99, 99)');
  expect(couleurs.btnTexte).toBe('rgb(15, 22, 38)');  // encre sombre sur rouge clair → 5,7:1
  expect(couleurs.schema).toBe('dark');
});

test('B10 — élève « parti » : masqué à l’appel, badge dans la classe, effectif ajusté', async ({ page }) => {
  await seedClasse(page, 3);
  await page.goto('/#/eleves/fiche/e02');
  await page.locator('#f-actif').selectOption('parti');
  await expect(page.locator('#vue h2 .badge', { hasText: 'parti' })).toBeVisible();
  await page.goto('/#/eleves/classe/c1');
  await expect(page.locator('#vue')).toContainText('2 élèves · 1 parti');
  await expect(page.locator('.ligne-eleve', { hasText: 'NOM02' }).locator('.badge', { hasText: 'parti' })).toBeVisible();
  await page.goto('/#/appel/se');
  await expect(page.locator('.btn-eleve')).toHaveCount(2);
  await page.goto('/#/eleves');
  await expect(page.locator('#vue')).toContainText('2 élèves');
});

test('B14 — une vue qui plante affiche un message au lieu d’un écran blanc', async ({ page }) => {
  await page.evaluate(async () => {
    const ui = await import('/js/ui.js');
    ui.enregistrerVue('documents', () => { throw new Error('panne simulée'); });
  });
  await page.goto('/#/documents');
  await expect(page.locator('#vue')).toContainText('Affichage impossible');
  await expect(page.locator('#vue')).toContainText('panne simulée');
});

test('B22 — suppression d’une classe vide refusée tant qu’une séquence ou un créneau la référence', async ({ page }) => {
  await page.evaluate(async () => {
    const io = await import('/js/io.js');
    await io.enregistrer('classes', { id: 'c1', nom: '6A', archivee: false });
    await io.enregistrer('sequences', { id: 'sq', classeId: 'c1', apsa: 'Bad', nbSeancesPrevu: 5 });
    await io.enregistrer('edt', { id: 'cr1', jour: 1, heureDebut: '08:00', heureFin: '09:00', classeId: 'c1', semaine: 'AB', installation: '' });
  });
  await page.goto('/#/eleves/classe/c1');
  await page.getByRole('button', { name: 'Supprimer la classe' }).click();
  await expect(page.locator('.toast')).toContainText('1 séquence et 1 créneau EDT');
  await expect(page.locator('dialog.feuille-confirm')).toHaveCount(0);
  const reste = await page.evaluate(async () => (await (await import('/js/io.js')).tous('classes')).length);
  expect(reste).toBe(1);
});

test('B34 — la pastille de statut d’un élève non saisi est réellement masquée', async ({ page }) => {
  await seedClasse(page, 2);
  await page.goto('/#/appel/se');
  await expect(page.locator('.btn-eleve')).toHaveCount(2);
  const affichage = await page.evaluate(() => getComputedStyle(document.querySelector('.badge-statut[hidden]')).display);
  expect(affichage).toBe('none');
  // Le nom accessible de la carte ne doit pas contenir le « P » fantôme.
  await expect(page.locator('.eleve-cycle').first()).toHaveText(/^Prenom0 NOM00$/);
});

test('B23 — coefficient 0 : l’évaluation ne pèse pas dans la moyenne du relevé', async ({ page }) => {
  await page.evaluate(async () => {
    const io = await import('/js/io.js');
    await io.enregistrer('classes', { id: 'c1', nom: '6A', archivee: false });
    await io.enregistrer('eleves', { id: 'e1', classeId: 'c1', nom: 'A', prenom: 'B', actif: true });
    await io.enregistrer('sequences', { id: 'sq', classeId: 'c1', apsa: 'Bad' });
    await io.enregistrer('evaluations', { id: 'ev1', sequenceId: 'sq', titre: 'Comptée', date: '2026-03-01', type: 'note20', coef: 1 });
    await io.enregistrer('evaluations', { id: 'ev0', sequenceId: 'sq', titre: 'Blanche', date: '2026-03-02', type: 'note20', coef: 0 });
    await io.enregistrer('notes', { id: 'ev1_e1', evaluationId: 'ev1', eleveId: 'e1', valeur: 10 });
    await io.enregistrer('notes', { id: 'ev0_e1', evaluationId: 'ev0', eleveId: 'e1', valeur: 20 });
  });
  await page.goto('/#/notes/releve/c1');
  const cellules = await page.locator('tbody tr').first().locator('td').allTextContents();
  expect(cellules.at(-1)).toBe('10'); // et non 15 (moyenne avec coef 0 compté comme 1)
});
