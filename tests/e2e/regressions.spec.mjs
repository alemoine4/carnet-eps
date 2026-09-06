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

// ---- D012 (audit B30) : alerte sur le cumul annuel, vision par trimestre ----
const anneeScolaire = () => { const d = new Date(); return d.getMonth() + 1 >= 8 ? d.getFullYear() : d.getFullYear() - 1; };

test('B30 — bornes de trimestres : défauts 15/12 et 15/03, réglage, année scolaire', async ({ page }) => {
  const res = await page.evaluate(async () => {
    const m = await import('/js/metier.js');
    const io = await import('/js/io.js');
    const a = await m.bornesTrimestres('2026-10-05');
    const b = await m.bornesTrimestres('2027-01-10');
    await io.ecrireMeta('finTrimestre1', '2026-12-04');
    const c = await m.bornesTrimestres('2026-12-10');
    await io.ecrireMeta('finTrimestre1', '2025-12-04'); // autre année scolaire → ignorée
    const d = await m.bornesTrimestres('2026-12-10');
    await io.ecrireMeta('finTrimestre1', '');
    return { a: [a.finT1, a.finT2, a.courant, a.annee], b: b.courant, c: [c.finT1, c.courant], d: [d.finT1, d.courant], p2: m.periodeTrimestre(2, a) };
  });
  expect(res.a).toEqual(['2026-12-15', '2027-03-15', 1, 2026]);
  expect(res.b).toBe(2);
  expect(res.c).toEqual(['2026-12-04', 2]);
  expect(res.d).toEqual(['2026-12-15', 1]);
  expect(res.p2).toEqual({ du: '2026-12-16', au: '2027-03-15' });
});

test('B30 — fiche élève : tableau par trimestre + signalement sur l’année', async ({ page }) => {
  const y = anneeScolaire();
  await page.evaluate(async ({ y }) => {
    const io = await import('/js/io.js');
    await io.enregistrer('classes', { id: 'c1', nom: '6A', archivee: false });
    await io.enregistrer('eleves', { id: 'e1', classeId: 'c1', nom: 'Martin', prenom: 'Inès', actif: true });
    await io.enregistrer('sequences', { id: 'sq', classeId: 'c1', apsa: 'Bad' });
    const dates = [[`${y}-10-01`, 'oubli_tenue'], [`${y}-11-05`, 'oubli_tenue'], [`${y + 1}-01-15`, 'oubli_tenue'], [`${y + 1}-05-10`, 'present']];
    for (const [i, [date, statut]] of dates.entries()) {
      await io.enregistrer('seances', { id: 's' + i, sequenceId: 'sq', date });
      await io.enregistrer('appels', { id: `s${i}_e1`, seanceId: 's' + i, eleveId: 'e1', statut });
    }
  }, { y });
  await page.goto('/#/eleves/fiche/e1');
  const ligne = page.locator('table.table-apercu tr', { hasText: 'Oubli de tenue' });
  await expect(ligne).toBeVisible();
  expect(await ligne.locator('td').allTextContents()).toEqual(['Oubli de tenue', '2', '1', '', '3']);
  await expect(page.locator('.statut-erreur')).toContainText('sur l’année');
});

test('B30 — récap de classe : périodes rapides T1 / Année', async ({ page }) => {
  const y = anneeScolaire();
  await page.evaluate(async () => {
    const io = await import('/js/io.js');
    await io.enregistrer('classes', { id: 'c1', nom: '6A', archivee: false });
    await io.enregistrer('eleves', { id: 'e1', classeId: 'c1', nom: 'A', prenom: 'B', actif: true });
  });
  await page.goto('/#/appel/recap/c1');
  await page.getByRole('button', { name: /^T1/ }).click();
  await expect(page.locator('#rc-debut')).toHaveValue(`${y}-09-01`);
  await expect(page.locator('#rc-fin')).toHaveValue(`${y}-12-15`);
  await expect(page.locator('#vue')).toContainText(`du 01/09/${y} au 15/12/${y}`);
  await page.getByRole('button', { name: /^Année/ }).click();
  await expect(page.locator('#rc-fin')).toHaveValue(`${y + 1}-07-31`);
});

test('B30 — alerte Suivi : cumul annuel avec le détail du trimestre en cours', async ({ page }) => {
  await page.evaluate(async ({ today }) => {
    const io = await import('/js/io.js');
    await io.enregistrer('classes', { id: 'c1', nom: '6A', archivee: false });
    await io.enregistrer('eleves', { id: 'e1', classeId: 'c1', nom: 'Martin', prenom: 'Inès', actif: true });
    await io.enregistrer('sequences', { id: 'sq', classeId: 'c1', apsa: 'Bad' });
    for (let i = 0; i < 3; i++) {
      await io.enregistrer('seances', { id: 's' + i, sequenceId: 'sq', date: today });
      await io.enregistrer('appels', { id: `s${i}_e1`, seanceId: 's' + i, eleveId: 'e1', statut: 'oubli_tenue' });
    }
  }, { today: today() });
  const courant = await page.evaluate(async () => (await (await import('/js/metier.js')).bornesTrimestres()).courant);
  await page.goto('/#/suivi');
  await expect(page.locator('#vue')).toContainText(`3 oublis de tenue (T${courant} : 3)`);
});

// ---- B29 (avis cascades atomiques) : une transaction, tout ou rien ----

test('B29 — restauration atomique : un enregistrement invalide annule tout le lot', async ({ page }) => {
  const res = await page.evaluate(async () => {
    const io = await import('/js/io.js');
    let erreur = null;
    try {
      await io.restaurer({ appels: [{ id: 'a1', seanceId: 's', eleveId: 'e', statut: 'present' }], eleves: [{ nom: 'sans id' }] });
    } catch (e) { erreur = e?.name || String(e); }
    return { erreur, a1: !!(await io.lire('appels', 'a1')) };
  });
  expect(res.erreur).toBeTruthy();
  expect(res.a1).toBe(false); // rien n'a été écrit, pas même l'enregistrement valide
});

test('B29 — suppression atomique : un store inconnu ou une clé absente ne supprime rien', async ({ page }) => {
  const res = await page.evaluate(async () => {
    const io = await import('/js/io.js');
    const a1 = { id: 'a1', seanceId: 's', eleveId: 'e', statut: 'present' };
    await io.enregistrer('appels', a1);
    const erreurs = [];
    try { await io.supprimerLot({ appels: [a1], inconnu: [{ id: 'x' }] }); } catch (e) { erreurs.push(e?.message || String(e)); }
    try { await io.supprimerLot({ appels: [a1], eleves: [{ nom: 'sans id' }] }); } catch (e) { erreurs.push(e?.name || String(e)); }
    const restant = !!(await io.lire('appels', 'a1'));
    await io.supprimerLot({ appels: [a1] });
    return { erreurs, restant, apres: !!(await io.lire('appels', 'a1')) };
  });
  expect(res.erreurs).toHaveLength(2);
  expect(res.erreurs[0]).toMatch(/store inconnu/);
  expect(res.restant).toBe(true);  // les deux lots fautifs n'ont rien supprimé
  expect(res.apres).toBe(false);   // le lot valide, lui, supprime
});

test('B29 — import tout-ou-rien : une valeur non clonable dans un store laisse TOUS les stores intacts', async ({ page }) => {
  const res = await page.evaluate(async () => {
    const io = await import('/js/io.js');
    await io.enregistrer('classes', { id: 'c1', nom: 'ANCIENNE', archivee: false });
    await io.enregistrer('seances', { id: 's1', sequenceId: 'x', date: '2026-01-01' });
    // Passe la validation (ids présents) mais échoue à l'écriture : fonction non clonable.
    const dump = { app: 'carnet-eps', schemaVersion: 2, stores: { classes: [{ id: 'c2', nom: 'NOUVELLE' }], seances: [{ id: 's9', f: () => 1 }] } };
    let erreur = null;
    try { await io.importerJSON(dump); } catch (e) { erreur = e?.name || String(e); }
    return { erreur, classes: (await io.tous('classes')).map((c) => c.nom), seances: (await io.tous('seances')).map((s) => s.id) };
  });
  expect(res.erreur).toBeTruthy();
  expect(res.classes).toEqual(['ANCIENNE']); // avant B29, ce store était déjà remplacé
  expect(res.seances).toEqual(['s1']);
});

// ---- Hypothèses Codex H01–H05 (avis « durabilité des écritures », v0.12.8) ----

test('H03 — une écriture ne résout qu’à la validation de la transaction (abandon tardif = rejet)', async ({ page }) => {
  const res = await page.evaluate(async () => {
    const io = await import('/js/io.js');
    const original = IDBObjectStore.prototype.put;
    // Mutant : la transaction est abandonnée juste APRÈS le succès de la requête, avant le commit —
    // ce que font un quota plein ou une erreur disque au moment de valider.
    IDBObjectStore.prototype.put = function (...args) {
      const req = original.apply(this, args);
      req.addEventListener('success', () => { try { req.transaction.abort(); } catch {} });
      return req;
    };
    let erreur = null;
    try { await io.enregistrer('classes', { id: 'cx', nom: 'X', archivee: false }); } catch (e) { erreur = e?.name || String(e); }
    IDBObjectStore.prototype.put = original;
    return { erreur, presente: !!(await io.lire('classes', 'cx')) };
  });
  expect(res.erreur).toBeTruthy(); // avant correctif : résolvait → « ✓ » mensonger
  expect(res.presente).toBe(false);
});

test('H01 — la purge totale tient en une seule transaction sur les 14 stores', async ({ page }) => {
  const res = await page.evaluate(async () => {
    const io = await import('/js/io.js');
    await io.enregistrer('classes', { id: 'c1', nom: '6A', archivee: false });
    await io.enregistrer('eleves', { id: 'e1', classeId: 'c1', nom: 'A', prenom: 'B', actif: true });
    await io.ecrireMeta('etablissement', 'Collège test');
    const original = IDBDatabase.prototype.transaction;
    const appels = [];
    IDBDatabase.prototype.transaction = function (stores, ...rest) { appels.push([].concat(stores).length); return original.call(this, stores, ...rest); };
    await io.viderTout();
    IDBDatabase.prototype.transaction = original;
    const comptes = await io.compterTout();
    return { appels, total: Object.values(comptes).reduce((a, b) => a + b, 0) };
  });
  expect(res.appels).toEqual([14]);
  expect(res.total).toBe(0);
});

test('H02 — l’export est un instantané : une écriture lancée juste après n’y apparaît pas', async ({ page }) => {
  const res = await page.evaluate(async () => {
    const io = await import('/js/io.js');
    await io.enregistrer('classes', { id: 'c1', nom: '6A', archivee: false });
    const dumpP = io.exporterJSON({ avecFichiers: false }); // lecture lancée en premier
    const ecriture = (async () => {
      await io.enregistrer('seances', { id: 's-new', sequenceId: 'sq', date: '2026-10-01' });
      await io.enregistrer('appels', { id: 's-new_e1', seanceId: 's-new', eleveId: 'e1', statut: 'present' });
    })();
    const dump = await dumpP;
    await ecriture;
    return { classes: dump.stores.classes.length, seances: dump.stores.seances.map((s) => s.id), appels: dump.stores.appels.length, apres: (await io.tous('seances')).length };
  });
  expect(res.classes).toBe(1);
  expect(res.seances).toEqual([]);
  expect(res.appels).toBe(0);
  expect(res.apres).toBe(1); // l'écriture a bien eu lieu, après l'instantané
});

test('H04 — import : identifiant en double refusé avant écriture, store absent annoncé', async ({ page }) => {
  const res = await page.evaluate(async () => {
    const io = await import('/js/io.js');
    await io.enregistrer('classes', { id: 'c1', nom: 'ANCIENNE', archivee: false });
    const double = { app: 'carnet-eps', schemaVersion: 2, stores: { classes: [{ id: 'c2', nom: 'A' }, { id: 'c2', nom: 'B' }] } };
    let erreur = null;
    try { await io.importerJSON(double); } catch (e) { erreur = e.message; }
    const v1 = io.validerExport({ app: 'carnet-eps', schemaVersion: 1, stores: { classes: [{ id: 'c3', nom: 'V1' }] } });
    return { erreur, classes: (await io.tous('classes')).map((c) => c.nom), absents: v1.absents };
  });
  expect(res.erreur).toMatch(/identifiant en double « c2 »/);
  expect(res.classes).toEqual(['ANCIENNE']);
  expect(res.absents).toContain('observations');
});

test('H05 — le service-worker ne nettoie que ses propres caches (origine partagée)', async ({ page }) => {
  // Hôte de bouclage ≠ « localhost »/« 127.0.0.1 » pour estLocalhost() → le SW s'enregistre.
  // `app.localhost` : Chromium le résout lui-même en boucle locale (sans DNS) et le traite comme
  // contexte sécurisé ; sinon repli sur [::1] / 127.0.0.2. Premier test réel du service-worker.
  // Page de préparation SANS service-worker : une feuille CSS (un .csv déclencherait un téléchargement).
  let base = null;
  for (const h of ['http://app.localhost:8160', 'http://[::1]:8160', 'http://127.0.0.2:8160']) {
    try { await page.goto(`${h}/css/base.css`, { timeout: 5000 }); base = h; break; } catch { /* essai suivant */ }
  }
  test.skip(!base, 'aucun hôte de bouclage hors localhost joignable sur le port 8160');
  await page.evaluate(async () => { await caches.open('autre-app-test'); await caches.open('carnet-eps-0.0.1'); });
  await page.goto(`${base}/`);
  // Attente de l'activation via expect.poll (waitForFunction prendrait une promesse pour un « vrai »
  // immédiat) : l'état « activated » n'est posé qu'après le waitUntil de l'activation (nettoyage fait).
  await expect.poll(() => page.evaluate(async () => {
    const reg = await navigator.serviceWorker.getRegistration();
    return reg?.active?.state || null;
  }), { timeout: 20000 }).toBe('activated');
  const etat = await page.evaluate(async () => ({
    version: (await import('/js/state.js')).VERSION_APP,
    cles: await caches.keys(),
    autre: await caches.has('autre-app-test'),
    ancien: await caches.has('carnet-eps-0.0.1'),
  }));
  expect(etat.autre).toBe(true);    // le cache du voisin survit
  expect(etat.ancien).toBe(false);  // notre ancien cache est bien nettoyé
  expect(etat.cles).toContain(`carnet-eps-${etat.version}`);
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
