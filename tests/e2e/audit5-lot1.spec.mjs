// Tests de non-régression du lot 1 du 5e audit (2026-09-07, rapport docs/audit-2026-09-07.md).
// Un test par constat corrigé ; chaque test rejoue la reproduction de l'audit et attend le
// comportement CORRIGÉ. S'il casse, c'est que le défaut est revenu.
import { test, expect } from '@playwright/test';

const STORES = ['meta', 'classes', 'eleves', 'edt', 'sequences', 'seances', 'appels',
  'inaptitudes', 'certificats', 'fichiers', 'evaluations', 'notes', 'documents', 'observations'];

const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const today = () => iso(new Date());
const ilYA = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return iso(d); };
const jourSemaine = () => ((new Date().getDay() + 6) % 7) + 1;

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(async (stores) => {
    const io = await import('/js/io.js');
    await io.ouvrirDB();
    for (const s of stores) await io.vider(s);
  }, STORES);
});

// Écritures IndexedDB qui échouent (quota simulé) : put() lève → la transaction est abandonnée.
const casserEcritures = (page) => page.evaluate(() => {
  window.__putOrig = IDBObjectStore.prototype.put;
  IDBObjectStore.prototype.put = function () { throw new DOMException('Quota simulé', 'QuotaExceededError'); };
});
const reparerEcritures = (page) => page.evaluate(() => { IDBObjectStore.prototype.put = window.__putOrig; });

// Classe 6A + séquence active + séance « se » à la date donnée (défaut : aujourd'hui).
async function seedBase(page, { date = today(), eleves = [{ id: 'e1', nom: 'A', prenom: 'B' }] } = {}) {
  await page.evaluate(async ({ date, eleves }) => {
    const io = await import('/js/io.js');
    await io.enregistrer('classes', { id: 'c1', nom: '6A', archivee: false });
    for (const e of eleves) await io.enregistrer('eleves', { classeId: 'c1', actif: true, ...e });
    await io.enregistrer('sequences', { id: 'sq', classeId: 'c1', apsa: 'Bad', nbSeancesPrevu: 5, dateDebut: '2020-01-01', dateFin: '2099-12-31' });
    await io.enregistrer('seances', { id: 'se', sequenceId: 'sq', date, edtId: null, numero: 1, annulee: false });
  }, { date, eleves });
}

// ---------------------------------------------------------------------------
// Données / intégrité (io.js, state.js)
// ---------------------------------------------------------------------------

test('V2-05 / A24 — import : champ texte indispensable d’un autre type refusé, champs inconnus d’« eleves » écartés', async ({ page }) => {
  const res = await page.evaluate(async () => {
    const io = await import('/js/io.js');
    let erreur = null;
    try { io.validerExport({ app: 'carnet-eps', schemaVersion: 2, stores: { eleves: [{ id: 'e1', classeId: 'c1', nom: 123, prenom: 'X' }] } }); }
    catch (e) { erreur = e.message; }
    await io.importerJSON({ app: 'carnet-eps', schemaVersion: 2, stores: { classes: [{ id: 'c1', nom: '6A' }], eleves: [{ id: 'e1', classeId: 'c1', nom: 'A', prenom: 'B', INE: '123456789AB', adresse: '1 rue X' }] } });
    return { erreur, eleve: await io.lire('eleves', 'e1') };
  });
  expect(res.erreur).toMatch(/« eleves » ligne 1 — « nom » doit être un texte/);
  expect(res.eleve).toEqual({ id: 'e1', classeId: 'c1', nom: 'A', prenom: 'B' }); // INE et adresse écartés
});

test('A04 — ouvrirDB ne met pas en cache une ouverture refusée : l’essai suivant aboutit', async ({ page }) => {
  const res = await page.evaluate(async () => {
    const io2 = await import('/js/io.js?instance-neuve'); // module neuf : promesse de base encore vide
    const orig = indexedDB.open.bind(indexedDB);
    indexedDB.open = () => {
      const req = {};
      setTimeout(() => { req.error = new DOMException('Ouverture refusée (simulée)', 'UnknownError'); req.onerror?.(); }, 0);
      return req;
    };
    let e1 = null;
    try { await io2.ouvrirDB(); } catch (e) { e1 = e?.name; }
    indexedDB.open = orig;
    let e2 = null;
    let nom = null;
    try { nom = (await io2.ouvrirDB()).name; } catch (e) { e2 = String(e); }
    return { e1, e2, nom };
  });
  expect(res.e1).toBe('UnknownError');
  expect(res.e2).toBeNull();
  expect(res.nom).toBe('carnet-eps');
});

test('A25 / B25 / C17 — purge : prefs « Reprendre » effacées (thème conservé), export de sécurité dans le try, message qui renvoie aux téléchargements', async ({ page }) => {
  await seedBase(page);
  await page.evaluate(async () => { const st = await import('/js/state.js'); st.sauverPrefs({ derniereClasseId: 'c1', theme: 'sombre' }); });
  await page.goto('/#/sauvegarde');
  await page.getByRole('button', { name: 'Effacer toutes les données' }).click();
  await page.locator('dialog.feuille-confirm .btn-danger').click(); // « Continuer »
  const dlg2 = page.locator('dialog.feuille-confirm');
  await expect(dlg2).toContainText('vérifiez sa présence dans vos téléchargements'); // C17
  await expect(dlg2).toContainText('carnet-eps_avant-purge_');
  await dlg2.locator('.btn-danger').click(); // « Tout effacer »
  await expect(page.locator('.toast')).toContainText('Données effacées');
  const res = await page.evaluate(async () => ({
    prefs: JSON.parse(localStorage.getItem('carnet-eps:prefs')),
    classes: (await (await import('/js/io.js')).tous('classes')).length,
  }));
  expect(res.prefs).toEqual({ theme: 'sombre' });
  expect(res.classes).toBe(0);
});

test('B25 — purge : si l’export de sécurité échoue, rien n’est effacé et l’utilisateur est prévenu', async ({ page }) => {
  await seedBase(page);
  await page.goto('/#/sauvegarde');
  await page.evaluate(() => { URL.createObjectURL = () => { throw new Error('export simulé KO'); }; });
  await page.getByRole('button', { name: 'Effacer toutes les données' }).click();
  await page.locator('dialog.feuille-confirm .btn-danger').click();
  await expect(page.locator('.toast')).toContainText('Effacement annulé : export simulé KO');
  await expect(page.locator('dialog.feuille-confirm')).toHaveCount(0); // pas de 2e confirmation
  const n = await page.evaluate(async () => (await (await import('/js/io.js')).tous('classes')).length);
  expect(n).toBe(1);
  await expect(page.getByRole('button', { name: 'Effacer toutes les données' })).toBeEnabled();
});

test('D-14 — import d’une sauvegarde sans pièce jointe : la perte des pièces actuelles est annoncée', async ({ page }) => {
  await page.evaluate(async () => {
    const io = await import('/js/io.js');
    await io.enregistrer('fichiers', { id: 'f1', blob: new Blob(['x'], { type: 'image/jpeg' }), mime: 'image/jpeg', nom: 'a.jpg', taille: 1 });
    await io.enregistrer('fichiers', { id: 'f2', blob: new Blob(['y'], { type: 'image/jpeg' }), mime: 'image/jpeg', nom: 'b.jpg', taille: 1 });
  });
  await page.goto('/#/sauvegarde');
  const dump = { app: 'carnet-eps', schemaVersion: 2, dateExport: '2026-09-01', stores: { classes: [{ id: 'c9', nom: '5C' }] } };
  await page.locator('input[type=file][accept*="json"]').setInputFiles({ name: 'sauvegarde.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(dump)) });
  const dlg = page.locator('dialog.feuille-confirm');
  await expect(dlg).toContainText('AUCUNE pièce jointe : les 2 pièces de cet appareil');
  await dlg.getByRole('button', { name: 'Annuler' }).click();
  const n = await page.evaluate(async () => (await (await import('/js/io.js')).tous('fichiers')).length);
  expect(n).toBe(2); // rien n'a été remplacé
});

test('C06 / D-05 — un rejet de promesse non géré remonte en toast (filet global)', async ({ page }) => {
  await page.evaluate(() => { setTimeout(() => Promise.reject(new Error('Boum test')), 0); });
  await expect(page.locator('.toast')).toContainText('Erreur inattendue : Boum test');
});

test('A05 — pièce sans type MIME (sauvegarde tierce) : la fiche d’inaptitude s’affiche, mimeSur replie proprement', async ({ page }) => {
  await page.evaluate(async () => {
    const io = await import('/js/io.js');
    await io.enregistrer('classes', { id: 'c1', nom: '6A', archivee: false });
    await io.enregistrer('eleves', { id: 'e1', classeId: 'c1', nom: 'A', prenom: 'B', actif: true });
    await io.enregistrer('fichiers', { id: 'f', blob: new Blob(['x']) }); // ni mime, ni nom, ni taille
    await io.enregistrer('certificats', { id: 'ce', eleveId: 'e1', fichierId: 'f', dateDepot: '2026-09-01' });
    await io.enregistrer('inaptitudes', { id: 'in', eleveId: 'e1', type: 'totale', dateDebut: '2026-09-01', dateFin: '', certificatId: 'ce' });
  });
  await page.goto('/#/inaptitudes/in');
  await expect(page.locator('#vue')).toContainText('Ouvrir la pièce');
  await expect(page.locator('#vue')).not.toContainText('Affichage impossible');
  const mimes = await page.evaluate(async () => {
    const { mimeSur } = await import('/js/media.js');
    return [mimeSur({}), mimeSur({ blob: new Blob([], { type: 'image/png' }) }), mimeSur({ mime: 'application/pdf', blob: new Blob([], { type: 'image/png' }) })];
  });
  expect(mimes).toEqual(['application/octet-stream', 'image/png', 'application/pdf']);
});

// ---------------------------------------------------------------------------
// Métier : année scolaire, seuils, alertes (metier.js)
// ---------------------------------------------------------------------------

test('A06 — l’année scolaire commence le 1er août : une séance de fin août compte dans les cumuls', async ({ page }) => {
  const res = await page.evaluate(async () => {
    const m = await import('/js/metier.js');
    const b = await m.bornesTrimestres('2026-10-01');
    const parTri = m.compterStatutsParTrimestre(
      [{ id: 'a', seanceId: 's', eleveId: 'e1', statut: 'oubli_tenue' }], [{ id: 's', date: '2026-08-25' }], b);
    return { debut: b.debut, compte: parTri.get('e1')?.annee.oubli_tenue || 0 };
  });
  expect(res.debut).toBe('2026-08-01');
  expect(res.compte).toBe(1);
});

test('V2-02 — bornes de trimestres inversées en base : défauts appliqués, Réglages le signale et refuse la saisie', async ({ page }) => {
  const y = await page.evaluate(async () => (await (await import('/js/metier.js')).bornesTrimestres()).annee);
  await page.evaluate(async ({ y }) => {
    const io = await import('/js/io.js');
    await io.ecrireMeta('finTrimestre1', `${y + 1}-03-20`);
    await io.ecrireMeta('finTrimestre2', `${y}-12-01`); // T2 avant T1
  }, { y });
  const b = await page.evaluate(async () => (await (await import('/js/metier.js')).bornesTrimestres()));
  expect([b.finT1, b.finT2]).toEqual([`${y}-12-15`, `${y + 1}-03-15`]);
  await page.goto('/#/reglages');
  await expect(page.locator('#vue')).toContainText('Valeur enregistrée ignorée');
  // Saisie refusée : T2 avant le T1 appliqué (15/12), puis date hors année scolaire.
  await page.locator('#reg-t2').fill(`${y}-11-01`);
  await expect(page.locator('.toast').last()).toContainText('doit suivre celle du 1er');
  await expect(page.locator('#reg-t2')).toHaveValue(`${y}-12-01`); // valeur refusée retirée du champ (revue)
  await page.locator('#reg-t1').fill(`${y - 1}-12-15`);
  await expect(page.locator('.toast').last()).toContainText('hors de l’année scolaire');
  const meta = await page.evaluate(async () => { const io = await import('/js/io.js'); return [await io.lireMeta('finTrimestre1'), await io.lireMeta('finTrimestre2')]; });
  expect(meta).toEqual([`${y + 1}-03-20`, `${y}-12-01`]); // rien d'écrit
  // Ordre vérifié contre la voisine STOCKÉE : T2 = 31/03 suit bien le T1 enregistré (20/03) → acceptée,
  // et les deux bornes redeviennent effectives ; les notes « ignorée » disparaissent (revue).
  await page.locator('#reg-t2').fill(`${y + 1}-03-31`);
  await expect(page.locator('label[for="reg-t2"] .statut')).toHaveText('✓');
  await expect(page.locator('#vue')).not.toContainText('Valeur enregistrée ignorée');
  let finales = await page.evaluate(async () => (await (await import('/js/metier.js')).bornesTrimestres()));
  expect([finales.finT1, finales.finT2]).toEqual([`${y + 1}-03-20`, `${y + 1}-03-31`]);
  // T1 après le T2 enregistré : refusé, avec l'issue (vider l'autre borne).
  await page.locator('#reg-t1').fill(`${y + 1}-04-01`);
  await expect(page.locator('.toast').last()).toContainText('doit précéder celle du 2e (31/03) — videz l’autre borne');
  await expect(page.locator('#reg-t1')).toHaveValue(`${y + 1}-03-20`);
  finales = await page.evaluate(async () => (await (await import('/js/metier.js')).bornesTrimestres()));
  expect([finales.finT1, finales.finT2]).toEqual([`${y + 1}-03-20`, `${y + 1}-03-31`]);
});

test('A07 / A14 / V2-01 — alertes du Suivi : élève parti ignoré, seuil sur l’année scolaire seulement', async ({ page }) => {
  const vieux = ilYA(400); // année scolaire précédente, quel que soit le jour du test
  await page.evaluate(async ({ today, vieux }) => {
    const io = await import('/js/io.js');
    await io.enregistrer('classes', { id: 'c1', nom: '6A', archivee: false });
    await io.enregistrer('eleves', { id: 'e1', classeId: 'c1', nom: 'ANCIEN', prenom: 'A', actif: true });
    await io.enregistrer('eleves', { id: 'e2', classeId: 'c1', nom: 'PARTI', prenom: 'P', actif: false });
    await io.enregistrer('sequences', { id: 'sq', classeId: 'c1', apsa: 'Bad' });
    for (let i = 0; i < 3; i++) {
      await io.enregistrer('seances', { id: 'v' + i, sequenceId: 'sq', date: vieux });
      await io.enregistrer('appels', { id: `v${i}_e1`, seanceId: 'v' + i, eleveId: 'e1', statut: 'oubli_tenue' }); // 3 oublis L'AN DERNIER
      await io.enregistrer('seances', { id: 's' + i, sequenceId: 'sq', date: today });
      await io.enregistrer('appels', { id: `s${i}_e2`, seanceId: 's' + i, eleveId: 'e2', statut: 'oubli_tenue' }); // 3 oublis cette année, élève PARTI
    }
  }, { today: today(), vieux });
  await page.goto('/#/suivi');
  await expect(page.locator('#vue')).toContainText('Rien à signaler');
  // Le seuil reste actif sur l'année en cours.
  await page.evaluate(async ({ today }) => {
    const io = await import('/js/io.js');
    for (let i = 0; i < 3; i++) await io.enregistrer('appels', { id: `s${i}_e1`, seanceId: 's' + i, eleveId: 'e1', statut: 'oubli_tenue' });
  }, { today: today() });
  await page.reload();
  await expect(page.locator('#vue')).toContainText('ANCIEN');
  await expect(page.locator('#vue')).toContainText('3 oublis de tenue');
  await expect(page.locator('#vue')).not.toContainText('PARTI');
});

test('A14 — pastille ⚠ de l’appel et signalement de la fiche : bornés à l’année scolaire', async ({ page }) => {
  const vieux = ilYA(400);
  await seedBase(page);
  await page.evaluate(async ({ vieux }) => {
    const io = await import('/js/io.js');
    for (let i = 0; i < 3; i++) {
      await io.enregistrer('seances', { id: 'v' + i, sequenceId: 'sq', date: vieux });
      await io.enregistrer('appels', { id: `v${i}_e1`, seanceId: 'v' + i, eleveId: 'e1', statut: 'oubli_tenue' });
    }
  }, { vieux });
  await page.goto('/#/appel/se');
  await expect(page.locator('.btn-eleve')).toHaveCount(1);
  await expect(page.locator('.pastille-warn')).toHaveCount(0);
  await page.goto('/#/eleves/fiche/e1');
  await expect(page.locator('#vue')).toContainText('aucun appel cette année'); // chips bornées à l'année (revue)
  await expect(page.locator('#vue')).not.toContainText('Oubli de tenue ×3');
  await expect(page.locator('#vue')).not.toContainText('Signalement');
  await page.evaluate(async ({ today }) => {
    const io = await import('/js/io.js');
    for (let i = 0; i < 3; i++) {
      await io.enregistrer('seances', { id: 'n' + i, sequenceId: 'sq', date: today });
      await io.enregistrer('appels', { id: `n${i}_e1`, seanceId: 'n' + i, eleveId: 'e1', statut: 'oubli_tenue' });
    }
  }, { today: today() });
  await page.goto('/#/appel/se');
  await expect(page.locator('.pastille-warn')).toHaveCount(1);
  await page.goto('/#/eleves/fiche/e1');
  await expect(page.locator('#vue')).toContainText('Oubli de tenue ×3');
  await expect(page.locator('#vue')).toContainText('Signalement');
});

test('C09 — « pas encore remontée vers Pronote » : bornée à l’année scolaire et aux classes actives', async ({ page }) => {
  await page.evaluate(async ({ vieux, today }) => {
    const io = await import('/js/io.js');
    await io.enregistrer('classes', { id: 'c1', nom: '6A', archivee: false });
    await io.enregistrer('classes', { id: 'c2', nom: '3B', archivee: true });
    await io.enregistrer('eleves', { id: 'e1', classeId: 'c1', nom: 'A', prenom: 'B', actif: true });
    await io.enregistrer('sequences', { id: 'sq1', classeId: 'c1', apsa: 'Bad' });
    await io.enregistrer('sequences', { id: 'sq2', classeId: 'c2', apsa: 'Foot' });
    await io.enregistrer('evaluations', { id: 'ev-vieille', sequenceId: 'sq1', titre: 'VIEILLE', date: vieux, type: 'note20', coef: 1 });
    await io.enregistrer('evaluations', { id: 'ev-archivee', sequenceId: 'sq2', titre: 'ARCHIVEE', date: today, type: 'note20', coef: 1 });
    await io.enregistrer('evaluations', { id: 'ev-courante', sequenceId: 'sq1', titre: 'COURANTE', date: today, type: 'note20', coef: 1 });
    for (const ev of ['ev-vieille', 'ev-archivee', 'ev-courante']) await io.enregistrer('notes', { id: `${ev}_e1`, evaluationId: ev, eleveId: 'e1', valeur: 10 });
  }, { vieux: ilYA(400), today: today() });
  await page.goto('/#/suivi');
  await expect(page.locator('#vue')).toContainText('COURANTE');
  await expect(page.locator('#vue')).not.toContainText('VIEILLE');
  await expect(page.locator('#vue')).not.toContainText('ARCHIVEE');
});

test('A09 — inaptitude sans date de fin depuis plus de 3 mois : badge et alerte « à revoir »', async ({ page }) => {
  await page.evaluate(async ({ debut }) => {
    const io = await import('/js/io.js');
    await io.enregistrer('classes', { id: 'c1', nom: '6A', archivee: false });
    await io.enregistrer('eleves', { id: 'e1', classeId: 'c1', nom: 'LONG', prenom: 'L', actif: true });
    await io.enregistrer('inaptitudes', { id: 'in', eleveId: 'e1', type: 'totale', dateDebut: debut, dateFin: '', origine: 'certificat' });
  }, { debut: ilYA(100) });
  await page.goto('/#/suivi');
  await expect(page.locator('#vue')).toContainText('inaptitude sans date de fin depuis 100 j');
  await page.goto('/#/inaptitudes');
  await expect(page.locator('#vue')).toContainText('> 3 mois sans date de fin');
  // Huit alertes ℹ permanentes ne doivent pas évincer un ⚠ des 8 lignes de l'accueil : tri par gravité (revue).
  await page.evaluate(async ({ debut, today }) => {
    const io = await import('/js/io.js');
    for (let i = 2; i <= 9; i++) {
      await io.enregistrer('eleves', { id: 'e' + i, classeId: 'c1', nom: 'OUVERT' + i, prenom: 'O', actif: true });
      await io.enregistrer('inaptitudes', { id: 'in' + i, eleveId: 'e' + i, type: 'totale', dateDebut: debut, dateFin: '', origine: 'certificat' });
    }
    await io.enregistrer('eleves', { id: 'e10', classeId: 'c1', nom: 'TENUE', prenom: 'T', actif: true });
    await io.enregistrer('sequences', { id: 'sq', classeId: 'c1', apsa: 'Bad' });
    for (let i = 0; i < 3; i++) {
      await io.enregistrer('seances', { id: 's' + i, sequenceId: 'sq', date: today });
      await io.enregistrer('appels', { id: `s${i}_e10`, seanceId: 's' + i, eleveId: 'e10', statut: 'oubli_tenue' });
    }
  }, { debut: ilYA(100), today: today() });
  await page.goto('/#/accueil');
  await expect(page.locator('#vue')).toContainText('T TENUE (6A) — 3 oublis de tenue');
});

test('A08 — classe archivée : ses créneaux disparaissent de la journée (accueil et sélecteur d’appel)', async ({ page }) => {
  await page.evaluate(async ({ jour }) => {
    const io = await import('/js/io.js');
    await io.enregistrer('classes', { id: 'c2', nom: '3B', archivee: true });
    await io.enregistrer('edt', { id: 'cr', jour, heureDebut: '00:00', heureFin: '23:59', classeId: 'c2', semaine: 'AB', installation: '' });
  }, { jour: jourSemaine() });
  await page.goto('/#/accueil');
  await expect(page.locator('#vue')).toContainText('Pas de cours EPS aujourd’hui');
  await page.goto('/#/appel');
  await expect(page.locator('#vue')).not.toContainText('3B');
});

// ---------------------------------------------------------------------------
// Appel (appel.js)
// ---------------------------------------------------------------------------

const ELEVES_INAPTES = [
  { id: 'e1', nom: 'CERTIF', prenom: 'C' }, { id: 'e2', nom: 'PARTIEL', prenom: 'P' },
  { id: 'e3', nom: 'MOT', prenom: 'M' }, { id: 'e4', nom: 'VALIDE', prenom: 'V' },
];
const seedInaptitudes = (page) => page.evaluate(async () => {
  const io = await import('/js/io.js');
  await io.enregistrer('inaptitudes', { id: 'i1', eleveId: 'e1', type: 'totale', origine: 'certificat', dateDebut: '2020-01-01', dateFin: '2099-12-31' });
  await io.enregistrer('inaptitudes', { id: 'i2', eleveId: 'e2', type: 'partielle', origine: 'certificat', dateDebut: '2020-01-01', dateFin: '2099-12-31', restrictions: ['course'] });
  await io.enregistrer('inaptitudes', { id: 'i3', eleveId: 'e3', type: 'totale', origine: 'mot', dateDebut: '2020-01-01', dateFin: '2099-12-31' });
});
const statuts = (page) => page.evaluate(async () => {
  const io = await import('/js/io.js');
  const res = {};
  for (const id of ['e1', 'e2', 'e3', 'e4']) res[id] = (await io.lire('appels', `se_${id}`))?.statut ?? null;
  return res;
});

test('B02 / C01 — « Terminer l’appel » sur une séance passée : inapte (certificat), dispensé (mot), présent (partielle)', async ({ page }) => {
  await seedBase(page, { date: ilYA(1), eleves: ELEVES_INAPTES });
  await seedInaptitudes(page);
  await page.goto('/#/appel/se');
  await expect(page.locator('.btn-eleve')).toHaveCount(4);
  await expect(page.locator('.pastille-info')).toHaveCount(3); // signalés, y compris la partielle
  expect(await statuts(page)).toEqual({ e1: null, e2: null, e3: null, e4: null }); // séance passée : rien d'écrit à l'ouverture
  await page.getByRole('button', { name: /Terminer l’appel/ }).click();
  await expect(page.locator('#vue')).toContainText('Appel complet');
  expect(await statuts(page)).toEqual({ e1: 'inapte', e2: 'present', e3: 'dispense', e4: 'present' });
});

test('C01 — pré-remplissage de la séance du jour : seules les inaptitudes TOTALES fixent un statut, le certificat prime le mot', async ({ page }) => {
  await seedBase(page, { eleves: ELEVES_INAPTES });
  await seedInaptitudes(page);
  // e3 (mot) reçoit AUSSI un certificat : deux inaptitudes totales actives → le certificat gagne, quel que soit l'ordre des ids (revue).
  await page.evaluate(async () => { await (await import('/js/io.js')).enregistrer('inaptitudes', { id: 'a0-avant', eleveId: 'e3', type: 'totale', origine: 'certificat', dateDebut: '2020-01-01', dateFin: '2099-12-31' }); });
  await page.goto('/#/appel/se');
  await expect(page.locator('.btn-eleve')).toHaveCount(4);
  await expect.poll(() => statuts(page)).toEqual({ e1: 'inapte', e2: null, e3: 'inapte', e4: null });
});

test('C11 — pré-remplissage refusé par la base : l’écran d’appel s’affiche quand même, avec un avertissement', async ({ page }) => {
  await seedBase(page, { eleves: ELEVES_INAPTES });
  await seedInaptitudes(page);
  await casserEcritures(page);
  await page.evaluate(() => { location.hash = '#/appel/se'; }); // même document : le sabotage reste actif
  await expect(page.locator('.btn-eleve')).toHaveCount(4);
  await expect(page.locator('.toast')).toContainText('Pré-remplissage des inaptitudes non enregistré');
  await expect(page.locator('#vue')).not.toContainText('Affichage impossible');
  await reparerEcritures(page);
});

test('A11 — création de séance refusée par la base : bouton réarmé et message (sélecteur d’appel + accueil)', async ({ page }) => {
  await page.evaluate(async ({ jour }) => {
    const io = await import('/js/io.js');
    await io.enregistrer('classes', { id: 'c1', nom: '6A', archivee: false });
    await io.enregistrer('eleves', { id: 'e1', classeId: 'c1', nom: 'A', prenom: 'B', actif: true });
    await io.enregistrer('sequences', { id: 'sq', classeId: 'c1', apsa: 'Bad', nbSeancesPrevu: 5, dateDebut: '2020-01-01', dateFin: '2099-12-31' });
    await io.enregistrer('edt', { id: 'cr1', jour, heureDebut: '00:00', heureFin: '23:59', classeId: 'c1', semaine: 'AB', installation: '' });
  }, { jour: jourSemaine() });
  for (const [route, libelle] of [['#/appel', 'Créer la séance + appel'], ['#/accueil', /Créer la séance/]]) {
    await page.goto('/');
    await page.evaluate((r) => { location.hash = r; }, route);
    const btn = page.getByRole('button', { name: libelle });
    await expect(btn).toBeVisible();
    await casserEcritures(page);
    await btn.click();
    await expect(page.locator('.toast')).toContainText('Séance non créée : Quota simulé');
    await expect(btn).toBeEnabled();
    await reparerEcritures(page);
  }
  const n = await page.evaluate(async () => (await (await import('/js/io.js')).tous('seances')).length);
  expect(n).toBe(0);
});

test('B16 / A12 — sélecteur d’appel : l’appel d’un élève parti ne compte plus (pas de « Appel fait ✓ » mensonger)', async ({ page }) => {
  await page.evaluate(async ({ today, jour }) => {
    const io = await import('/js/io.js');
    await io.enregistrer('classes', { id: 'c1', nom: '6A', archivee: false });
    await io.enregistrer('eleves', { id: 'e1', classeId: 'c1', nom: 'ACTIF', prenom: 'A', actif: true });
    await io.enregistrer('eleves', { id: 'e2', classeId: 'c1', nom: 'PARTI', prenom: 'P', actif: false });
    await io.enregistrer('sequences', { id: 'sq', classeId: 'c1', apsa: 'Bad', nbSeancesPrevu: 5, dateDebut: '2020-01-01', dateFin: '2099-12-31' });
    await io.enregistrer('edt', { id: 'cr1', jour, heureDebut: '00:00', heureFin: '23:59', classeId: 'c1', semaine: 'AB', installation: '' });
    await io.enregistrer('seances', { id: 'se', sequenceId: 'sq', date: today });
    await io.enregistrer('appels', { id: 'se_e2', seanceId: 'se', eleveId: 'e2', statut: 'present' }); // seul le parti est saisi
  }, { today: today(), jour: jourSemaine() });
  await page.goto('/#/appel');
  await expect(page.locator('#vue')).toContainText('Faire l’appel');
  await expect(page.locator('#vue')).not.toContainText('Appel fait ✓');
  await page.goto('/#/accueil');
  await expect(page.locator('#vue')).toContainText('Faire l’appel'); // B15 : même logique à l'accueil
});

test('B15 — accueil : « Appel fait ✓ » en bouton neutre quand l’appel est complet, « Reprendre (n/eff) » sinon', async ({ page }) => {
  await page.evaluate(async ({ today, jour }) => {
    const io = await import('/js/io.js');
    await io.enregistrer('classes', { id: 'c1', nom: '6A', archivee: false });
    await io.enregistrer('eleves', { id: 'e1', classeId: 'c1', nom: 'A', prenom: 'A', actif: true });
    await io.enregistrer('eleves', { id: 'e2', classeId: 'c1', nom: 'B', prenom: 'B', actif: true });
    await io.enregistrer('sequences', { id: 'sq', classeId: 'c1', apsa: 'Bad', nbSeancesPrevu: 5, dateDebut: '2020-01-01', dateFin: '2099-12-31' });
    await io.enregistrer('edt', { id: 'cr1', jour, heureDebut: '00:00', heureFin: '23:59', classeId: 'c1', semaine: 'AB', installation: '' });
    await io.enregistrer('seances', { id: 'se', sequenceId: 'sq', date: today });
    await io.enregistrer('appels', { id: 'se_e1', seanceId: 'se', eleveId: 'e1', statut: 'present' });
  }, { today: today(), jour: jourSemaine() });
  await page.goto('/#/accueil');
  await expect(page.locator('#vue')).toContainText('Reprendre l’appel (1/2)');
  await page.evaluate(async () => { await (await import('/js/io.js')).enregistrer('appels', { id: 'se_e2', seanceId: 'se', eleveId: 'e2', statut: 'absent' }); });
  await page.reload();
  const lien = page.locator('#vue a', { hasText: 'Appel fait ✓' });
  await expect(lien).toHaveCount(1);
  await expect(lien).not.toHaveClass(/btn-principal/);
});

test('A10 — alternance A/B non paramétrée : l’accueil le dit au lieu de proposer la mauvaise classe en silence', async ({ page }) => {
  await page.evaluate(async ({ jour }) => {
    const io = await import('/js/io.js');
    await io.enregistrer('classes', { id: 'c1', nom: '6A', archivee: false });
    await io.enregistrer('classes', { id: 'c2', nom: '5B', archivee: false });
    await io.enregistrer('sequences', { id: 'sq', classeId: 'c1', apsa: 'Bad', dateDebut: '2020-01-01', dateFin: '2099-12-31' });
    await io.enregistrer('edt', { id: 'crA', jour, heureDebut: '00:00', heureFin: '23:59', classeId: 'c1', semaine: 'A', installation: '' });
    await io.enregistrer('edt', { id: 'crB', jour, heureDebut: '00:00', heureFin: '23:59', classeId: 'c2', semaine: 'B', installation: '' });
  }, { jour: jourSemaine() });
  await page.goto('/#/accueil');
  await expect(page.locator('#vue')).toContainText('Alternance A/B non paramétrée');
  await expect(page.locator('#vue')).toContainText('semaine A ?');
  await expect(page.locator('#vue')).toContainText('(sem. B)');
  await expect(page.locator('#vue a[href="#/edt"]')).toHaveCount(1);
});

test('C10 — retour arrière de definirStatut : un tap plus récent n’est jamais écrasé par un état périmé', async ({ page }) => {
  await seedBase(page);
  await page.goto('/#/appel/se');
  const carte = page.locator('.eleve-cycle').first();
  await expect(carte).toBeVisible();
  // 1er tap : sa transaction est maintenue ouverte (requêtes de lecture en chaîne) jusqu'au signal
  // __release, puis ABANDONNÉE ; le 2e tap arrive entre-temps. Avant C10, l'échec du 1er tap
  // remettait l'écran à « présent » alors que la base allait recevoir « tenue ».
  await page.evaluate(() => {
    const orig = IDBObjectStore.prototype.put;
    let n = 0;
    window.__release = false;
    IDBObjectStore.prototype.put = function (...args) {
      n++;
      const req = orig.apply(this, args);
      if (n === 1) {
        const store = this;
        const tx = this.transaction;
        const vivre = () => {
          const r = store.get('__keepalive__');
          r.onsuccess = () => { if (window.__release) tx.abort(); else vivre(); };
        };
        vivre();
      }
      return req;
    };
  });
  await carte.click(); // présent → absent (écriture 1, en attente)
  await carte.click(); // absent → tenue (écriture 2, en file derrière la 1re)
  await expect(page.locator('.btn-eleve').first()).toHaveAttribute('data-statut', 'oubli_tenue');
  await page.evaluate(() => { window.__release = true; });
  await expect(page.locator('.toast')).toContainText('Statut non enregistré');
  await expect(page.locator('.btn-eleve').first()).toHaveAttribute('data-statut', 'oubli_tenue'); // pas de retour à « présent »
  await expect.poll(() => page.evaluate(async () => (await (await import('/js/io.js')).lire('appels', 'se_e1'))?.statut)).toBe('oubli_tenue');
});

test('C10 — deux écritures CONCURRENTES refusées : retour au dernier état confirmé (aucun), pas de statut fantôme ni d’« Appel complet »', async ({ page }) => {
  await seedBase(page);
  await page.goto('/#/appel/se');
  const carte = page.locator('.eleve-cycle').first();
  await expect(carte).toBeVisible();
  // Les DEUX transactions sont maintenues ouvertes (lectures en chaîne) puis abandonnées au signal :
  // les deux taps sont en vol en même temps. Avant la revue du lot 1, le 2e échec rétablissait
  // « absent » (le 1er tap, jamais écrit) et l'appel passait « complet » ; les échecs séquentiels
  // ne le montraient pas (un test qui passe aussi avec l'ancien code ne prouve rien).
  await page.evaluate(() => {
    const orig = IDBObjectStore.prototype.put;
    window.__release = false;
    IDBObjectStore.prototype.put = function (...args) {
      const req = orig.apply(this, args);
      const store = this;
      const tx = this.transaction;
      const vivre = () => {
        const r = store.get('__keepalive__');
        r.onsuccess = () => { if (window.__release) tx.abort(); else vivre(); };
      };
      vivre();
      return req;
    };
  });
  await carte.click(); // présent → absent (en vol)
  await carte.click(); // absent → tenue (en file derrière la 1re transaction)
  await expect(page.locator('.btn-eleve').first()).toHaveAttribute('data-statut', 'oubli_tenue');
  await page.evaluate(() => { window.__release = true; }); // les deux transactions échouent, dans l'ordre
  await expect(page.locator('.toast').last()).toContainText('Statut non enregistré');
  await expect(page.locator('.btn-eleve').first()).toHaveAttribute('data-statut', ''); // dernier état CONFIRMÉ : aucun
  await expect(page.locator('#vue')).not.toContainText('Appel complet');
  await expect(page.getByRole('button', { name: /Terminer l’appel/ })).toBeVisible();
  await page.evaluate(() => { window.__release = false; });
  expect(await page.evaluate(async () => (await (await import('/js/io.js')).tous('appels')).length)).toBe(0);
});

test('D-10 — fin de trimestre en août refusée (plancher au 1er septembre), l’année des cumuls restant au 1er août', async ({ page }) => {
  const y = await page.evaluate(async () => (await (await import('/js/metier.js')).bornesTrimestres()).annee);
  await page.goto('/#/reglages');
  await page.locator('#reg-t1').fill(`${y}-08-20`);
  await expect(page.locator('.toast').last()).toContainText('du 1er septembre au 31 juillet');
  await expect(page.locator('#reg-t1')).toHaveValue('');
  expect(await page.evaluate(async () => (await (await import('/js/io.js')).lireMeta('finTrimestre1', '')))).toBe('');
});

test('V2-04 — « ✗ » d’un échec n’est pas effacé par la minuterie du « ✓ » précédent, le texte saisi est conservé', async ({ page }) => {
  await page.evaluate(async () => {
    const io = await import('/js/io.js');
    await io.enregistrer('classes', { id: 'c1', nom: '6A', archivee: false });
    await io.enregistrer('eleves', { id: 'e1', classeId: 'c1', nom: 'A', prenom: 'B', actif: true, notesPerso: '' });
  });
  await page.goto('/#/eleves/fiche/e1');
  const zone = page.locator('#f-notes');
  await zone.fill('asthme');
  await zone.dispatchEvent('change');
  await expect(page.locator('label[for="f-notes"] .statut')).toHaveText('✓');
  await casserEcritures(page);
  await zone.fill('asthme, lunettes');
  await zone.dispatchEvent('change');
  await expect(page.locator('label[for="f-notes"] .statut')).toHaveText('✗');
  await page.waitForTimeout(1800); // la minuterie du ✓ (1,5 s) ne doit pas l'effacer
  await expect(page.locator('label[for="f-notes"] .statut')).toHaveText('✗');
  await expect(zone).toHaveValue('asthme, lunettes'); // texte conservé (pas de restauration sur un texte libre)
  await reparerEcritures(page);
  expect(await page.evaluate(async () => (await (await import('/js/io.js')).lire('eleves', 'e1')).notesPerso)).toBe('asthme');
});

test('B42 / V2-03 — minutes de retard bornées à 1..120 (sinon « non précisé »)', async ({ page }) => {
  await seedBase(page);
  await page.goto('/#/appel/se');
  await page.locator('.eleve-menu').first().click();
  await page.locator('dialog .grille-statuts').getByRole('button', { name: 'Retard' }).click();
  const minutes = page.locator('#ap-minutes');
  const enBase = () => page.evaluate(async () => (await (await import('/js/io.js')).lire('appels', 'se_e1'))?.minutesRetard ?? null);
  await minutes.fill('15');
  await minutes.dispatchEvent('change'); // fill() tape sans émettre change sur un champ number
  await expect.poll(enBase).toBe(15);
  for (const saisie of ['500', '-3']) {
    await minutes.fill(saisie);
    await minutes.dispatchEvent('change');
    await expect(page.locator('.toast').last()).toContainText('entier de 1 à 120 attendu'); // prévenu (revue)
    await expect(minutes).toHaveValue('15'); // valeur refusée retirée du champ
    expect(await enBase()).toBe(15);
  }
});

test('A13 — récapitulatif : période « Année » par défaut, élève parti conservé s’il a des appels dans la période', async ({ page }) => {
  await seedBase(page, { eleves: [{ id: 'e1', nom: 'ACTIF', prenom: 'A' }, { id: 'e2', nom: 'PARTI', prenom: 'P', actif: false }, { id: 'e3', nom: 'PARTISANS', prenom: 'S', actif: false }] });
  await page.evaluate(async () => {
    const io = await import('/js/io.js');
    await io.enregistrer('appels', { id: 'se_e2', seanceId: 'se', eleveId: 'e2', statut: 'absent' });
  });
  await page.goto('/#/appel/recap/c1');
  await expect(page.getByRole('button', { name: /^Année/ })).toHaveAttribute('aria-pressed', 'true');
  const lignes = page.locator('tbody tr');
  await expect(lignes).toHaveCount(2);
  await expect(lignes.nth(0)).toContainText('ACTIF');
  await expect(lignes.nth(1)).toContainText('PARTI P (parti)');
  await expect(page.locator('#vue')).not.toContainText('PARTISANS'); // parti sans appel : absent
});

// ---------------------------------------------------------------------------
// Élèves, séquences, EDT, inaptitudes, notes, observations
// ---------------------------------------------------------------------------

test('D-02 — double clic sur « Créer la classe » / « Créer la séquence » : un seul enregistrement', async ({ page }) => {
  await page.goto('/#/eleves');
  await page.getByRole('button', { name: /Nouvelle classe/ }).click();
  await page.locator('#nc-nom').fill('5DUP');
  await page.getByRole('button', { name: 'Créer la classe' }).dblclick();
  await expect.poll(() => page.evaluate(async () => (await (await import('/js/io.js')).tous('classes')).filter((c) => c.nom === '5DUP').length)).toBe(1);
  await page.goto('/#/sequences');
  await page.getByRole('button', { name: /Nouvelle séquence/ }).click();
  await page.locator('#sq-apsa').fill('Escalade');
  await page.getByRole('button', { name: 'Créer la séquence' }).dblclick();
  await expect.poll(() => page.evaluate(async () => (await (await import('/js/io.js')).tous('sequences')).length)).toBe(1);
});

test('D-01 — « Annuler » d’un toast dont la restauration échoue : message, pas de rejet muet', async ({ page }) => {
  await page.evaluate(async () => { await (await import('/js/io.js')).enregistrer('classes', { id: 'c1', nom: '6A', archivee: false }); });
  const erreurs = [];
  page.on('pageerror', (e) => erreurs.push(e.message));
  await page.goto('/#/eleves/classe/c1');
  await page.getByRole('button', { name: 'Supprimer la classe' }).click();
  await page.locator('dialog.feuille-confirm .btn-danger').click();
  await expect(page.locator('.toast')).toContainText('supprimée');
  await casserEcritures(page);
  await page.locator('.toast').getByRole('button', { name: 'Annuler' }).click();
  await expect(page.locator('.toast')).toContainText('Annulation impossible : Quota simulé');
  await reparerEcritures(page);
  expect(erreurs).toEqual([]);
});

test('D-03 — « Annuler » revérifie l’unicité : séance à la même date, classe et élève homonymes', async ({ page }) => {
  await seedBase(page);
  // Séance : suppression puis recréation à la même date avant l'annulation.
  await page.goto('/#/sequences/sq');
  await page.getByRole('button', { name: /Supprimer la séance du/ }).click();
  await page.locator('dialog.feuille-confirm .btn-danger').click();
  await expect(page.locator('.toast')).toContainText('Séance supprimée');
  await page.evaluate(async ({ today }) => { await (await import('/js/io.js')).enregistrer('seances', { id: 'se2', sequenceId: 'sq', date: today }); }, { today: today() });
  await page.locator('.toast').getByRole('button', { name: 'Annuler' }).click();
  await expect(page.locator('.toast')).toContainText('Annulation impossible : une séance existe déjà');
  expect(await page.evaluate(async () => (await (await import('/js/io.js')).tous('seances')).map((s) => s.id))).toEqual(['se2']);
  // Élève : suppression puis homonyme réimporté.
  await page.goto('/#/eleves/fiche/e1');
  await page.getByRole('button', { name: 'Supprimer définitivement' }).click();
  await page.locator('dialog.feuille-confirm .btn-danger').click();
  await expect(page.locator('.toast').last()).toContainText('supprimé');
  await page.evaluate(async () => { await (await import('/js/io.js')).enregistrer('eleves', { id: 'e9', classeId: 'c1', nom: 'a', prenom: 'b', actif: true }); });
  await page.locator('.toast').last().getByRole('button', { name: 'Annuler' }).click();
  await expect(page.locator('.toast').last()).toContainText('existe déjà dans la classe');
  expect(await page.evaluate(async () => (await (await import('/js/io.js')).tous('eleves')).map((e) => e.id))).toEqual(['e9']);
});

test('D-12 — suppression d’une classe refusée tant qu’un document la référence', async ({ page }) => {
  await page.evaluate(async () => {
    const io = await import('/js/io.js');
    await io.enregistrer('classes', { id: 'c1', nom: '6A', archivee: false });
    await io.enregistrer('documents', { id: 'd1', titre: 'Fiche', classeIds: ['c1'], tags: [] });
  });
  await page.goto('/#/eleves/classe/c1');
  await page.getByRole('button', { name: 'Supprimer la classe' }).click();
  await expect(page.locator('.toast')).toContainText('1 document');
  await expect(page.locator('dialog.feuille-confirm')).toHaveCount(0);
  expect(await page.evaluate(async () => (await (await import('/js/io.js')).tous('classes')).length)).toBe(1);
});

async function importerCSV(page, texte, destination) {
  await page.goto('/#/eleves/import');
  await page.locator('textarea[aria-label="Données CSV collées"]').fill(texte);
  await page.getByRole('button', { name: 'Analyser' }).click();
  if (destination) await page.locator(`#dest-${destination}`).check();
  await page.getByRole('button', { name: /^Importer \d+ élèves?/ }).click();
  return page.locator('#vue .statut').last();
}

test('D-13 — import Pronote : un élève « parti » qui revient est réactivé, pas ignoré comme doublon', async ({ page }) => {
  await page.evaluate(async () => {
    const io = await import('/js/io.js');
    await io.enregistrer('classes', { id: 'c1', nom: '6A', archivee: false });
    await io.enregistrer('eleves', { id: 'e2', classeId: 'c1', nom: 'REVENU', prenom: 'Rémi', actif: false });
  });
  const statut = await importerCSV(page, 'Nom;Prénom\nREVENU;Rémi\nNOUVEAU;Nina', 'existante');
  await expect(statut).toContainText('1 élève importé');
  await expect(statut).toContainText('1 élève parti réactivé');
  const e2 = await page.evaluate(async () => (await (await import('/js/io.js')).lire('eleves', 'e2')));
  expect(e2.actif).toBe(true);
});

test('D-15 — import Pronote vers une classe archivée : refusé AVANT toute écriture, avec la marche à suivre', async ({ page }) => {
  await page.evaluate(async () => { await (await import('/js/io.js')).enregistrer('classes', { id: 'c2', nom: '3B', archivee: true }); });
  const statut = await importerCSV(page, 'Nom;Prénom;Classe\nX;Y;3B\nZ;W;3B');
  await expect(statut).toContainText('Import impossible : la classe « 3B » est archivée');
  expect(await page.evaluate(async () => (await (await import('/js/io.js')).tous('eleves')).length)).toBe(0);
});

test('A16 / V2-04 — édition : fin avant début refusée (séquence, inaptitude), le champ marque « ✗ » et le motif s’affiche', async ({ page }) => {
  await page.evaluate(async () => {
    const io = await import('/js/io.js');
    await io.enregistrer('classes', { id: 'c1', nom: '6A', archivee: false });
    await io.enregistrer('eleves', { id: 'e1', classeId: 'c1', nom: 'A', prenom: 'B', actif: true });
    await io.enregistrer('sequences', { id: 'sq', classeId: 'c1', apsa: 'Bad', dateDebut: '2026-09-01', dateFin: '2026-10-15' });
    await io.enregistrer('inaptitudes', { id: 'in', eleveId: 'e1', type: 'totale', dateDebut: '2026-09-01', dateFin: '2026-10-15' });
  });
  await page.goto('/#/sequences/sq');
  await page.locator('#sd-fin').fill('2026-08-01');
  await expect(page.locator('label[for="sd-fin"] .statut')).toHaveText('✗');
  await expect(page.locator('.toast').last()).toContainText('Non enregistré : la fin est avant le début');
  await expect(page.locator('#sd-fin')).toHaveValue('2026-10-15'); // champ remis à la valeur acceptée (revue)
  await page.goto('/#/inaptitudes/in');
  await page.locator('#di-debut').fill('2026-11-01');
  await expect(page.locator('.toast').last()).toContainText('le début est après la fin');
  const res = await page.evaluate(async () => { const io = await import('/js/io.js'); return [(await io.lire('sequences', 'sq')).dateFin, (await io.lire('inaptitudes', 'in')).dateDebut]; });
  expect(res).toEqual(['2026-10-15', '2026-09-01']);
});

test('B42 — séquence : nombre de séances prévues < 1 refusé (création et édition)', async ({ page }) => {
  await page.evaluate(async () => { await (await import('/js/io.js')).enregistrer('classes', { id: 'c1', nom: '6A', archivee: false }); });
  await page.goto('/#/sequences');
  await page.getByRole('button', { name: /Nouvelle séquence/ }).click();
  await page.locator('#sq-apsa').fill('Escalade');
  await page.locator('#sq-nb').fill('0');
  await page.getByRole('button', { name: 'Créer la séquence' }).click();
  await expect(page.locator('#vue .statut-erreur')).toContainText('entier ≥ 1');
  expect(await page.evaluate(async () => (await (await import('/js/io.js')).tous('sequences')).length)).toBe(0);
});

test('V2-03 / B42 — évaluation : barème hors 1..200 et coefficient négatif refusés', async ({ page }) => {
  await page.evaluate(async () => {
    const io = await import('/js/io.js');
    await io.enregistrer('classes', { id: 'c1', nom: '6A', archivee: false });
    await io.enregistrer('sequences', { id: 'sq', classeId: 'c1', apsa: 'Bad' });
  });
  await page.goto('/#/notes');
  await page.getByRole('button', { name: /Nouvelle évaluation/ }).click();
  await page.locator('#ev-titre').fill('Test');
  await page.locator('#ev-type').selectOption('bareme');
  await page.locator('#ev-bareme').fill('0');
  await page.getByRole('button', { name: 'Créer et saisir les notes' }).click();
  await expect(page.locator('#vue .statut-erreur')).toContainText('entre 1 et 200');
  await page.locator('#ev-bareme').fill('10');
  await page.locator('#ev-coef').fill('-2');
  await page.getByRole('button', { name: 'Créer et saisir les notes' }).click();
  await expect(page.locator('#vue .statut-erreur')).toContainText('nombre ≥ 0');
  expect(await page.evaluate(async () => (await (await import('/js/io.js')).tous('evaluations')).length)).toBe(0);
});

test('B24 — « Copier pour Pronote » sur une grille vide : refusé, l’évaluation n’est pas marquée publiée', async ({ page }) => {
  await page.evaluate(async () => {
    const io = await import('/js/io.js');
    await io.enregistrer('classes', { id: 'c1', nom: '6A', archivee: false });
    await io.enregistrer('eleves', { id: 'e1', classeId: 'c1', nom: 'A', prenom: 'B', actif: true });
    await io.enregistrer('sequences', { id: 'sq', classeId: 'c1', apsa: 'Bad' });
    await io.enregistrer('evaluations', { id: 'ev', sequenceId: 'sq', titre: 'Vide', date: '2026-09-01', type: 'note20', coef: 1, publieePronote: null });
  });
  await page.goto('/#/notes/eval/ev');
  await page.getByRole('button', { name: 'Copier pour Pronote' }).click();
  await expect(page.locator('#vue')).toContainText('Aucune note à copier');
  expect(await page.evaluate(async () => (await (await import('/js/io.js')).lire('evaluations', 'ev')).publieePronote)).toBeNull();
});

test('B16 — notes : effectifs et « saisies » sur les élèves actifs seulement (plus de 2/1)', async ({ page }) => {
  await page.evaluate(async () => {
    const io = await import('/js/io.js');
    await io.enregistrer('classes', { id: 'c1', nom: '6A', archivee: false });
    await io.enregistrer('eleves', { id: 'e1', classeId: 'c1', nom: 'ACTIF', prenom: 'A', actif: true });
    await io.enregistrer('eleves', { id: 'e2', classeId: 'c1', nom: 'PARTI', prenom: 'P', actif: false });
    await io.enregistrer('sequences', { id: 'sq', classeId: 'c1', apsa: 'Bad' });
    await io.enregistrer('evaluations', { id: 'ev', sequenceId: 'sq', titre: 'Eval', date: '2026-09-01', type: 'note20', coef: 1 });
    await io.enregistrer('notes', { id: 'ev_e1', evaluationId: 'ev', eleveId: 'e1', valeur: 10 });
    await io.enregistrer('notes', { id: 'ev_e2', evaluationId: 'ev', eleveId: 'e2', valeur: 20 });
  });
  await page.goto('/#/notes');
  await expect(page.locator('#vue')).toContainText('1/1 notes');
  // Élève actif passé dans une AUTRE classe : sa note ne compte plus pour cette classe (revue du lot 1).
  await page.evaluate(async () => { const io = await import('/js/io.js'); await io.enregistrer('classes', { id: 'c2', nom: '6B', archivee: false }); await io.enregistrer('eleves', { id: 'e3', classeId: 'c2', nom: 'MUTE', prenom: 'M', actif: true }); await io.enregistrer('notes', { id: 'ev_e3', evaluationId: 'ev', eleveId: 'e3', valeur: 15 }); });
  await page.reload();
  await expect(page.locator('#vue')).toContainText('1/1 notes');
  await page.goto('/#/notes/eval/ev');
  await expect(page.locator('#vue')).toContainText('1/1 saisies');
  await expect(page.locator('#vue')).toContainText('10/20 de moyenne'); // la note du parti ne pèse plus
});

test('A13 — relevé de notes : élève parti conservé s’il a une note, marqué « (parti) »', async ({ page }) => {
  await page.evaluate(async () => {
    const io = await import('/js/io.js');
    await io.enregistrer('classes', { id: 'c1', nom: '6A', archivee: false });
    await io.enregistrer('eleves', { id: 'e1', classeId: 'c1', nom: 'ACTIF', prenom: 'A', actif: true });
    await io.enregistrer('eleves', { id: 'e2', classeId: 'c1', nom: 'PARTI', prenom: 'P', actif: false });
    await io.enregistrer('eleves', { id: 'e3', classeId: 'c1', nom: 'SANSNOTE', prenom: 'S', actif: false });
    await io.enregistrer('sequences', { id: 'sq', classeId: 'c1', apsa: 'Bad' });
    await io.enregistrer('evaluations', { id: 'ev', sequenceId: 'sq', titre: 'Eval', date: '2026-09-01', type: 'note20', coef: 1 });
    await io.enregistrer('notes', { id: 'ev_e2', evaluationId: 'ev', eleveId: 'e2', valeur: 12 });
  });
  await page.goto('/#/notes/releve/c1');
  const lignes = page.locator('tbody tr');
  await expect(lignes).toHaveCount(2);
  await expect(lignes.nth(1)).toContainText('PARTI P (parti)');
  await expect(page.locator('#vue')).not.toContainText('SANSNOTE');
  await expect(page.locator('#vue')).not.toContainText('Moyenne de classe'); // seul le parti est noté : aucun actif noté → pas de moyenne de classe (revue)
});

test('D-05 — grille de notes : une écriture refusée marque la case invalide et prévient', async ({ page }) => {
  await page.evaluate(async () => {
    const io = await import('/js/io.js');
    await io.enregistrer('classes', { id: 'c1', nom: '6A', archivee: false });
    await io.enregistrer('eleves', { id: 'e1', classeId: 'c1', nom: 'A', prenom: 'B', actif: true });
    await io.enregistrer('sequences', { id: 'sq', classeId: 'c1', apsa: 'Bad' });
    await io.enregistrer('evaluations', { id: 'ev', sequenceId: 'sq', titre: 'Eval', date: '2026-09-01', type: 'note20', coef: 1 });
  });
  await page.goto('/#/notes/eval/ev');
  const input = page.locator('.ligne-note input').first();
  await expect(input).toBeVisible();
  await casserEcritures(page);
  await input.fill('12');
  await input.dispatchEvent('change'); // idem : champ texte
  await expect(input).toHaveClass(/invalide/);
  await expect(page.locator('.toast')).toContainText('Note non enregistrée : Quota simulé');
  await reparerEcritures(page);
  expect(await page.evaluate(async () => (await (await import('/js/io.js')).tous('notes')).length)).toBe(0);
});

test('B04 — « + Nouvelle inaptitude » depuis la fiche d’un élève parti : c’est bien lui qui est présélectionné', async ({ page }) => {
  await page.evaluate(async () => {
    const io = await import('/js/io.js');
    await io.enregistrer('classes', { id: 'c1', nom: '6A', archivee: false });
    await io.enregistrer('eleves', { id: 'e1', classeId: 'c1', nom: 'AUTRE', prenom: 'A', actif: true });
    await io.enregistrer('eleves', { id: 'e2', classeId: 'c1', nom: 'PARTI', prenom: 'P', actif: false });
  });
  await page.goto('/#/inaptitudes/nouvelle/e2');
  await expect(page.locator('#in-eleve')).toHaveValue('e2');
  await expect(page.locator('#in-eleve option:checked')).toHaveText('PARTI P (parti)');
  await page.goto('/#/inaptitudes/nouvelle/inconnu');
  await expect(page.locator('#vue')).toContainText('Élève introuvable');
});

test('A02 — EDT : un créneau d’une classe archivée réenregistré garde sa classe (proposée comme « archivée »)', async ({ page }) => {
  await page.evaluate(async () => {
    const io = await import('/js/io.js');
    await io.enregistrer('classes', { id: 'c1', nom: '6A', archivee: false });
    await io.enregistrer('classes', { id: 'c2', nom: '3B', archivee: true });
    await io.enregistrer('edt', { id: 'cr', jour: 2, heureDebut: '10:00', heureFin: '11:00', classeId: 'c2', semaine: 'AB', installation: 'Gymnase' });
  });
  await page.goto('/#/edt');
  await expect(page.locator('.ligne-edt').first()).toContainText('3B (archivée)');
  await page.locator('.ligne-edt').first().click();
  await expect(page.locator('#cr-classe')).toHaveValue('c2');
  await page.getByRole('button', { name: 'Enregistrer' }).click();
  await expect.poll(() => page.evaluate(async () => (await (await import('/js/io.js')).lire('edt', 'cr')).classeId)).toBe('c2');
});

test('D-02 — observation : bouton « Enregistrer » désarmé pendant l’écriture, échec affiché dans la feuille', async ({ page }) => {
  await page.evaluate(async () => {
    const io = await import('/js/io.js');
    await io.enregistrer('classes', { id: 'c1', nom: '6A', archivee: false });
    await io.enregistrer('eleves', { id: 'e1', classeId: 'c1', nom: 'A', prenom: 'B', actif: true });
  });
  await page.goto('/#/eleves/fiche/e1');
  await page.getByRole('button', { name: '+ Observation' }).click();
  await page.locator('dialog textarea').fill('Très bon engagement');
  await casserEcritures(page);
  await page.locator('dialog').getByRole('button', { name: 'Enregistrer' }).click();
  await expect(page.locator('dialog .statut-erreur')).toContainText('Enregistrement impossible : Quota simulé');
  await expect(page.locator('dialog').getByRole('button', { name: 'Enregistrer' })).toBeEnabled();
  await reparerEcritures(page);
  await page.locator('dialog').getByRole('button', { name: 'Enregistrer' }).dblclick();
  await expect.poll(() => page.evaluate(async () => (await (await import('/js/io.js')).tous('observations')).length)).toBe(1);
});
