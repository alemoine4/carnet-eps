// Audit Codex V3, fin de lot : V3-02 résiduel, V3-04 et V3-05, plus la concurrence entre onglets.
// Corrections et tests REPRIS de la copie de travail de Codex (`copie-codex/`, v0.13.2 : fichiers
// `copie-codex.spec.mjs` et `audit-senior.spec.mjs`), adaptés aux évaluations classiques — les grilles
// d'évaluation et le schéma 3 n'entrent PAS dans ce lot. Trois tests sont propres à l'intégration :
// la case refusée sans panne, la zone de copie manuelle retirée, et la tolérance aux notes anciennes.
// ⚠ Aucune donnée nominative : noms INVENTÉS.

import { test, expect } from '@playwright/test';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, extname, sep } from 'node:path';

const STORES = ['meta', 'classes', 'eleves', 'edt', 'sequences', 'seances', 'appels',
  'inaptitudes', 'certificats', 'fichiers', 'evaluations', 'notes', 'documents', 'observations'];

test.use({ permissions: ['clipboard-read', 'clipboard-write'] });

// Une classe, deux élèves, une évaluation notée ; `notes` et `ev` ajustables par test.
const preparer = (page, { ev = {}, notes = [] } = {}) => page.evaluate(async ({ stores, ev, notes }) => {
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
    evaluations: [{ id: 'v', sequenceId: 's', titre: 'Contrôle', date: '2026-09-01', type: 'bareme', bareme: 20, coef: 1, publieePronote: null, ...ev }],
    notes,
  });
}, { stores: STORES, ev, notes });
const noteEnBase = (page, id) => page.evaluate(async (id) => (await (await import('/js/io.js')).lire('notes', id))?.valeur, id);
const espionnerCopie = (p) => p.evaluate(() => { window.__copie = null; navigator.clipboard.writeText = async (t) => { window.__copie = t; }; });
const saisir = async (champ, valeur) => { await champ.fill(valeur); await champ.dispatchEvent('change'); };

test.beforeEach(async ({ page }) => { await page.goto('/'); });

// --- V3-02, suite : une case en erreur bloque la copie tant qu'elle n'est pas corrigée -------------

test('V3-02 — une note enregistrée sur une AUTRE case ne débloque pas une case dont l’écriture a échoué', async ({ page }) => {
  await preparer(page, { ev: { bareme: 10 }, notes: [{ id: 'v_e', evaluationId: 'v', eleveId: 'e', valeur: 8 }] });
  await page.goto('/#/notes/eval/v');
  await expect(page.locator('.input-note')).toHaveCount(2);
  await espionnerCopie(page);
  // Panne qui ne touche QUE l'élève e : les écritures de f passent.
  await page.evaluate(() => {
    const put = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (v, ...a) {
      if (this.name === 'notes' && v.eleveId === 'e') throw new Error('panne sur une seule note');
      return put.call(this, v, ...a);
    };
  });
  await saisir(page.locator('.input-note').first(), '9');
  await expect(page.locator('.toast').last()).toContainText('Note non enregistrée');
  await saisir(page.locator('.input-note').nth(1), '7');
  await expect.poll(() => noteEnBase(page, 'v_f')).toBe(7);
  // Avant : ce succès remettait la file à l'état résolu, et la copie repartait avec l'ancien 8.
  await page.getByRole('button', { name: 'Copier pour Pronote', exact: true }).click();
  await expect(page.locator('#vue .statut-erreur').last()).toContainText('corrigez');
  expect(await page.evaluate(() => window.__copie)).toBeNull();
});

test('V3-02 — une saisie REFUSÉE (« 12a ») bloque la copie, sans aucune panne de stockage', async ({ page }) => {
  // Le cas quotidien : la saisie est refusée par le contrôle de format, la file se résout normalement,
  // et seule la case garde la mémoire de l'erreur.
  await preparer(page, { notes: [{ id: 'v_e', evaluationId: 'v', eleveId: 'e', valeur: 8 }] });
  await page.goto('/#/notes/eval/v');
  await expect(page.locator('.input-note')).toHaveCount(2);
  await espionnerCopie(page);
  await saisir(page.locator('.input-note').first(), '12a');
  await expect(page.locator('.input-note').first()).toHaveClass(/invalide/);
  await saisir(page.locator('.input-note').nth(1), '7');
  await expect.poll(() => noteEnBase(page, 'v_f')).toBe(7);
  await page.getByRole('button', { name: 'Copier pour Pronote', exact: true }).click();
  await expect(page.locator('#vue .statut-erreur').last()).toContainText('corrigez');
  expect(await page.evaluate(() => window.__copie)).toBeNull();
  // Case corrigée : la copie repart, avec la valeur réellement enregistrée.
  await saisir(page.locator('.input-note').first(), '12');
  await expect.poll(() => noteEnBase(page, 'v_e')).toBe(12);
  await page.getByRole('button', { name: 'Copier pour Pronote', exact: true }).click();
  await expect.poll(() => page.evaluate(() => window.__copie)).toBe('12\r\n7');
});

test('V3-02 — la zone de copie manuelle disparaît dès qu’une note change', async ({ page }) => {
  // Sans presse-papiers, l'app affiche une colonne FIGÉE à copier à la main. Modifier une note
  // ensuite laissait à l'écran une colonne qui ne correspondait plus à la grille.
  await preparer(page, { notes: [{ id: 'v_e', evaluationId: 'v', eleveId: 'e', valeur: 8 }] });
  await page.goto('/#/notes/eval/v');
  await expect(page.locator('.input-note')).toHaveCount(2);
  await page.evaluate(() => { navigator.clipboard.writeText = () => Promise.reject(new Error('indisponible')); });
  await page.getByRole('button', { name: 'Copier pour Pronote', exact: true }).click();
  const zone = page.getByRole('textbox', { name: 'Colonne à copier' });
  await expect(zone).toHaveValue(/^8\n?$/); // une zone de texte ramène les fins de ligne à \n
  await saisir(page.locator('.input-note').first(), '9');
  await expect(zone).toHaveCount(0);
});

// --- Concurrence : barème et second onglet (AUD-001, AUD-002 de la copie de Codex) --------------------

test('AUD-001 — un barème abaissé pendant une saisie en vol attend la note, puis la contrôle', async ({ page }) => {
  await preparer(page);
  await page.goto('/#/notes/eval/v');
  await expect(page.locator('.input-note')).toHaveCount(2);
  // L'écriture de la note reste en vol ~400 ms (transaction tenue ouverte par des lectures).
  await page.evaluate(() => {
    const put = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (v, ...a) {
      if (this.name === 'notes') {
        const store = this;
        let fini = false;
        const tenir = () => { if (!fini) store.get('__attente__').onsuccess = tenir; };
        tenir();
        setTimeout(() => { fini = true; }, 400);
      }
      return put.call(this, v, ...a);
    };
  });
  await saisir(page.locator('.input-note').first(), '18');
  await saisir(page.locator('#ge-bareme'), '10');
  await expect(page.locator('.toasts')).toContainText(/dépasse/);
  expect(await page.evaluate(async () => (await (await import('/js/io.js')).lire('evaluations', 'v')).bareme)).toBe(20);
  expect(await noteEnBase(page, 'v_e')).toBe(18);
});

test('AUD-001 — un onglet resté sur l’ancien barème ne peut pas enregistrer au-delà du nouveau', async ({ page, context }) => {
  await preparer(page);
  await page.goto('/#/notes/eval/v');
  const ancien = await context.newPage();
  await ancien.goto('/#/notes/eval/v');
  await expect(ancien.locator('.input-note')).toHaveCount(2);
  await saisir(page.locator('#ge-bareme'), '10');
  await expect(page.locator('#vue')).toContainText('noté /10');
  // L'onglet ancien croit encore au barème /20 : c'est la transaction qui relit le vrai barème.
  await saisir(ancien.locator('.input-note').first(), '18');
  await expect(ancien.locator('.input-note').first()).toHaveClass(/invalide/);
  expect(await noteEnBase(page, 'v_e')).toBeUndefined();
});

test('AUD-002 — un onglet périmé ne peut pas écraser une note modifiée dans un autre onglet', async ({ page, context }) => {
  await preparer(page, { notes: [{ id: 'v_e', evaluationId: 'v', eleveId: 'e', valeur: 8 }] });
  await page.goto('/#/notes/eval/v');
  const perime = await context.newPage();
  await perime.goto('/#/notes/eval/v');
  await expect(perime.locator('.input-note')).toHaveCount(2);
  await saisir(page.locator('.input-note').first(), '9');
  await expect.poll(() => noteEnBase(page, 'v_e')).toBe(9);
  // L'onglet périmé croit la note à 8 : son 7 ne doit pas écraser le 9 en silence.
  await saisir(perime.locator('.input-note').first(), '7');
  await expect(perime.locator('.toast').last()).toContainText('autre onglet');
  expect(await noteEnBase(page, 'v_e')).toBe(9);
});

test('AUD-002 — « Copier pour Pronote » relit les notes modifiées dans un autre onglet', async ({ page, context }) => {
  await preparer(page, { notes: [{ id: 'v_e', evaluationId: 'v', eleveId: 'e', valeur: 8 }] });
  await page.goto('/#/notes/eval/v');
  await expect(page.locator('.input-note')).toHaveCount(2);
  const autre = await context.newPage();
  await autre.goto('/#/notes/eval/v');
  await saisir(autre.locator('.input-note').first(), '9');
  await expect.poll(() => noteEnBase(page, 'v_e')).toBe(9);
  await espionnerCopie(page);
  await page.getByRole('button', { name: 'Copier pour Pronote', exact: true }).click();
  await expect.poll(() => page.evaluate(() => window.__copie)).toBe('9\r\n');
});

test('AUD-002 — une note modifiée PENDANT la copie ne laisse pas confirmer une publication périmée', async ({ page, context }) => {
  await preparer(page, { notes: [{ id: 'v_e', evaluationId: 'v', eleveId: 'e', valeur: 8 }] });
  await page.goto('/#/notes/eval/v');
  await expect(page.locator('.input-note')).toHaveCount(2);
  const autre = await context.newPage();
  await autre.goto('/#/notes/eval/v');
  await expect(autre.locator('.input-note')).toHaveCount(2);
  // Le presse-papiers ne répond qu'à la demande du test : la copie reste en vol.
  await page.evaluate(() => { navigator.clipboard.writeText = () => new Promise((r) => { window.__finCopie = r; }); });
  await page.getByRole('button', { name: 'Copier pour Pronote', exact: true }).click();
  await expect.poll(() => page.evaluate(() => typeof window.__finCopie)).toBe('function');
  await saisir(autre.locator('.input-note').first(), '9');
  await expect.poll(() => noteEnBase(page, 'v_e')).toBe(9);
  // Un export CSV intermédiaire relit les notes : il ne doit pas changer ce que la copie en vol confirme.
  const telechargement = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exporter CSV', exact: true }).click();
  await telechargement;
  await page.evaluate(() => window.__finCopie());
  await expect(page.locator('#vue')).toContainText('publication non confirmée');
  expect((await page.evaluate(async () => (await (await import('/js/io.js')).lire('evaluations', 'v')))).publieePronote).toBeFalsy();
});

test('Tolérance — une évaluation qui porte une note ANCIENNE au-dessus du barème reste modifiable', async ({ page }) => {
  // Un historique antérieur aux gardes actuelles peut contenir une note au-dessus du barème. La
  // version de la copie de travail validait TOUTES les notes de l'évaluation à chaque écriture : la
  // moindre saisie devenait impossible. Seules les notes ÉCRITES sont désormais contrôlées.
  await preparer(page, { ev: { bareme: 10 }, notes: [{ id: 'v_e', evaluationId: 'v', eleveId: 'e', valeur: 12 }] });
  await page.goto('/#/notes/eval/v');
  await expect(page.locator('.input-note')).toHaveCount(2);
  await saisir(page.locator('.input-note').nth(1), '5');
  await expect.poll(() => noteEnBase(page, 'v_f')).toBe(5);
  expect(await noteEnBase(page, 'v_e')).toBe(12); // la note ancienne est conservée telle quelle
});

// --- V3-04 : l'accueil avec paramètre sort du cache ---------------------------------------------------

test('V3-04 — une adresse d’accueil à paramètre inédit est servie depuis le cache, sans attendre le réseau', async ({ page }) => {
  // Un vrai serveur ralentit de 4 s toute URL à paramètre : le service-worker ne doit pas l'attendre.
  const racine = fileURLToPath(new URL('../../app/', import.meta.url));
  let requetesLentes = 0;
  const types = { '.js': 'text/javascript', '.html': 'text/html', '.css': 'text/css', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.svg': 'image/svg+xml' };
  const serveur = createServer(async (req, res) => {
    const u = new URL(req.url, 'http://local');
    if (u.search) { requetesLentes++; await new Promise((r) => setTimeout(r, 4000)); }
    const chemin = resolve(racine, '.' + (u.pathname === '/' ? '/index.html' : u.pathname));
    if (!chemin.startsWith(racine.endsWith(sep) ? racine : racine + sep)) { res.writeHead(403); res.end(); return; }
    try {
      const corps = await readFile(chemin);
      res.writeHead(200, { 'Content-Type': types[extname(chemin)] || 'application/octet-stream' });
      res.end(corps);
    } catch { res.writeHead(404); res.end(); }
  });
  await new Promise((r) => serveur.listen(0, '127.0.0.1', r));
  const base = `http://app.localhost:${serveur.address().port}`;
  try {
    await page.goto(base + '/');
    await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
    const indexEnCache = await page.evaluate(async () => {
      const v = (await import('/js/state.js')).VERSION_APP;
      return !!await (await caches.open(`carnet-eps-${v}`)).match('./index.html');
    });
    expect(indexEnCache).toBe(true);
    const debut = Date.now();
    await page.goto(base + '/?source=audit-v3', { timeout: 10000 });
    expect(Date.now() - debut).toBeLessThan(3000); // avant : ~4,2 s, le temps du réseau simulé
    expect(requetesLentes).toBeGreaterThan(0); // la revalidation en arrière-plan a bien eu lieu
  } finally {
    serveur.closeAllConnections();
    await new Promise((r) => serveur.close(r));
  }
});

// --- V3-05 : ne pas produire une sauvegarde impossible à restaurer ------------------------------------

test('V3-05 — plafond commun à l’export et à l’import, refusé avant de produire le fichier', async ({ page }) => {
  const r = await page.evaluate(async () => {
    const io = await import('/js/io.js');
    // 26 pièces de 6 Mio, toutes acceptables une à une : leur encodage dépasse déjà 200 Mio.
    const borne = io.tailleBase64Projetee(Array.from({ length: 26 }, () => ({ blob: { size: 6 * 1024 * 1024 } })));
    let refusBorne = false;
    try { io.verifierTailleSauvegarde(borne); } catch { refusBorne = true; }
    io.verifierTailleSauvegarde(io.LIMITE_SAUVEGARDE); // pile à la limite : accepté
    // Taille simulée : vérifie le dernier garde-fou sans allouer 200 Mio.
    const BlobOrigine = Blob;
    window.Blob = class extends BlobOrigine { get size() { return io.LIMITE_SAUVEGARDE + 1; } };
    let refusTelechargement = false;
    try { await io.telechargerJSON({ app: 'carnet-eps', stores: {} }); } catch { refusTelechargement = true; } finally { window.Blob = BlobOrigine; }
    return { borne, refusBorne, refusTelechargement };
  });
  expect(r).toEqual({ borne: 218103808, refusBorne: true, refusTelechargement: true });
});
