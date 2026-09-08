// Tests de non-régression du lot 4 du 5e audit (service-worker et performance — rapport docs/audit-2026-09-07.md).
// Les tests du service-worker tournent sur un hôte de bouclage HORS « localhost » (app.localhost,
// [::1], 127.0.0.2 : contextes sécurisés où estLocalhost() est faux → le SW s'enregistre), comme H05.
import { test, expect } from '@playwright/test';

const STORES = ['meta', 'classes', 'eleves', 'edt', 'sequences', 'seances', 'appels',
  'inaptitudes', 'certificats', 'fichiers', 'evaluations', 'notes', 'documents', 'observations'];

const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(async (stores) => {
    const io = await import('/js/io.js');
    await io.ouvrirDB();
    for (const s of stores) await io.vider(s);
  }, STORES);
});

// Hôte de bouclage hors localhost joignable, ou null.
async function hoteSW(page) {
  for (const h of ['http://app.localhost:8160', 'http://[::1]:8160', 'http://127.0.0.2:8160']) {
    try { await page.goto(`${h}/css/base.css`, { timeout: 5000 }); return h; } catch { /* essai suivant */ }
  }
  return null;
}

const attendreSW = (page) => expect.poll(() => page.evaluate(async () => (await navigator.serviceWorker.getRegistration())?.active?.state || null), { timeout: 10000 }).toBe('activated'); // < timeout du test : c'est le poll qui parle (C62)

// ---------------------------------------------------------------------------
// Service-worker (réel)
// ---------------------------------------------------------------------------

test('A43 / A18 — tout ce que le chargement demande est dans le précache, et les lectures sont scopées au cache de la version', async ({ page }) => {
  const base = await hoteSW(page);
  test.skip(!base, 'aucun hôte de bouclage hors localhost joignable sur le port 8160');
  const demandes = new Set();
  page.on('request', (r) => { const u = new URL(r.url()); if (u.origin === base && !u.pathname.endsWith('service-worker.js')) demandes.add(u.pathname); });
  await page.goto(`${base}/`);
  await attendreSW(page);
  await page.goto(`${base}/#/reglages`);
  await expect(page.locator('#vue')).toContainText('Version');
  // Ce que le chargement ne demande pas mais que l'app ou l'installation demandera : l'exemple CSV
  // (bouton « Essayer avec l'exemple ») et les icônes PNG du manifest (revue du lot 4).
  await page.goto(`${base}/#/eleves/import`);
  await page.getByRole('button', { name: 'Essayer avec l’exemple' }).click();
  await expect(page.locator('#vue')).toContainText('Exemple chargé');
  await page.evaluate(async () => { const m = await (await fetch('/manifest.webmanifest')).json(); await Promise.all(m.icons.map((i) => fetch(i.src))); });
  const etat = await page.evaluate(async () => {
    const version = (await import('/js/state.js')).VERSION_APP;
    const sw = await (await fetch('/service-worker.js')).text();
    const present = await caches.has(`carnet-eps-${version}`);
    const c = await caches.open(`carnet-eps-${version}`);
    return { version, versionSW: sw.match(/const VERSION = '([^']+)'/)?.[1], present, cles: (await c.keys()).map((r) => new URL(r.url).pathname) };
  });
  expect(etat.versionSW).toBe(etat.version); // les deux numéros doivent rester synchronisés
  expect(etat.present).toBe(true);
  const manquants = [...demandes].filter((p) => !etat.cles.includes(p) && !etat.cles.includes(p.replace(/\/$/, '/index.html')));
  expect(manquants, 'fichiers chargés absents de la liste ASSETS du service-worker').toEqual([]);
  // A18 : un fichier d'un cache VOISIN n'est pas servi à notre place. Chemin ABSENT du précache :
  // l'ancien caches.match() non scopé le servait (200 « PIRATE »), le nouveau tombe sur le réseau (404).
  const pirate = await page.evaluate(async () => {
    const autre = await caches.open('autre-app-test');
    await autre.put('/js/modules/futur.js', new Response('// PIRATE', { headers: { 'Content-Type': 'text/javascript' } }));
    const r = await fetch('/js/modules/futur.js');
    const texte = await r.text();
    await caches.delete('autre-app-test');
    return { status: r.status, pirate: texte.includes('PIRATE') };
  });
  expect(pirate).toEqual({ status: 404, pirate: false });
});

test('A40 — hors ligne : une navigation inconnue reçoit index.html, un fichier absent une réponse 504 (jamais undefined)', async ({ page, context }) => {
  const base = await hoteSW(page);
  test.skip(!base, 'aucun hôte de bouclage hors localhost joignable sur le port 8160');
  await page.goto(`${base}/`);
  await attendreSW(page);
  // Manifest retiré du cache de la version : c'est la branche corrigée (pas d'index.html pour un
  // non-document) qui est exercée, pas le précache (revue du lot 4).
  await page.evaluate(async () => { const v = (await import('/js/state.js')).VERSION_APP; await (await caches.open(`carnet-eps-${v}`)).delete('/manifest.webmanifest'); });
  await context.setOffline(true);
  try {
    const statut = await page.evaluate(async () => (await fetch('/js/inexistant.js')).status);
    expect(statut).toBe(504);
    const manifest = await page.evaluate(async () => { const r = await fetch('/manifest.webmanifest'); return { status: r.status, type: r.headers.get('content-type') || '' }; });
    expect(manifest.status).toBe(503); // l'ancien code servait index.html (200, text/html) à la place du manifest
    expect(manifest.type).toContain('text/plain');
    await page.goto(`${base}/?hors-ligne`);
    await expect(page.locator('.nav')).toBeVisible(); // index.html servi en repli de navigation
    await expect(page.locator('#vue')).not.toBeEmpty(); // et l'app démarre : main.js et les modules viennent du cache (C24)
  } finally {
    await context.setOffline(false);
  }
});

test('A17 / A19 / A41 — précache hors du cache HTTP, réponses redirigées ou étrangères jamais mises en cache, écritures tenues par waitUntil', async ({ page }) => {
  // Ces garanties ne s'observent pas depuis Playwright (serveur de dev en no-store, sans redirection,
  // et les requêtes du service-worker échappent au routage) : c'est le code qui porte la preuve, et
  // on vérifie l'EMPLOI des gardes aux deux points de mise en cache, pas seulement leur définition.
  const src = await (await page.request.get('/service-worker.js')).text();
  const versionApp = await page.evaluate(async () => (await import('/js/state.js')).VERSION_APP);
  expect(src).toContain(`const VERSION = '${versionApp}'`); // C62 : numéros synchronisés, vérifié même quand les tests SW se sautent
  expect(src).toContain("c.addAll(ASSETS.map((u) => new Request(u, { cache: 'reload' })))"); // A17
  expect(src).toContain("const cachable = (rep) => rep.ok && rep.type === 'basic' && !rep.redirected;"); // A19
  expect(src.match(/if \(cachable\(rep\)\) mettreEnCache\(e, req, rep\);/g)?.length).toBe(2); // employé sur les deux branches
  expect(src).toMatch(/e\.waitUntil\(caches\.open\(CACHE\)\.then\(\(c\) => c\.put\(req, copie\)\)\.catch/); // A41
  expect(src).not.toMatch(/caches\.open\(CACHE\)\.then\(\(c\) => c\.put\(req, copie\)\);/); // plus d'écriture flottante
});

test('A19 (comportement) — une réponse redirigée traversant le service-worker n’entre pas au cache de la version', async ({ page }) => {
  const base = await hoteSW(page);
  test.skip(!base, 'aucun hôte de bouclage hors localhost joignable sur le port 8160');
  await page.goto(`${base}/`);
  await attendreSW(page);
  const res = await page.evaluate(async () => {
    const version = (await import('/js/state.js')).VERSION_APP;
    const r = await fetch('/__test/redirige'); // 302 → index.html, servie par le serveur de dev
    await new Promise((f) => setTimeout(f, 300)); // laisse une éventuelle écriture de cache aboutir
    const cles = (await (await caches.open(`carnet-eps-${version}`)).keys()).map((k) => new URL(k.url).pathname);
    return { redirige: r.redirected, statut: r.status, cles: cles.filter((c) => c.startsWith('/__test/')) };
  });
  expect(res.redirige).toBe(true); // la page reçoit bien la réponse suivie…
  expect(res.statut).toBe(200);
  expect(res.cles).toEqual([]); // …mais l'ancien `if (rep.ok)` l'aurait mise en cache sous /__test/redirige
});

test('A20 — Réglages : un service-worker qui échoue à s’installer le dit (statechange → redundant)', async ({ page }) => {
  const base = await hoteSW(page);
  test.skip(!base, 'aucun hôte de bouclage hors localhost joignable sur le port 8160');
  await page.goto(`${base}/#/reglages`);
  await attendreSW(page);
  await page.evaluate(() => {
    const ecouteurs = [];
    const faux = { state: 'installing', addEventListener: (t, f) => ecouteurs.push(f) };
    window.__faux = faux; window.__ecouteurs = ecouteurs;
    navigator.serviceWorker.getRegistration = async () => ({ update: async () => {}, installing: faux, waiting: null });
  });
  await page.getByRole('button', { name: 'Vérifier les mises à jour' }).click();
  await expect(page.locator('#vue')).toContainText('Mise à jour trouvée');
  await page.evaluate(() => { window.__faux.state = 'redundant'; window.__ecouteurs.forEach((f) => f()); });
  await expect(page.locator('#vue')).toContainText('Installation de la mise à jour échouée');
  // Installation aboutie : un vrai bouton local, pas la promesse d'un toast qui peut être avalé (revue du lot 4).
  await page.evaluate(() => { window.__faux.state = 'activated'; window.__ecouteurs.forEach((f) => f()); });
  await expect(page.getByRole('button', { name: 'Recharger maintenant' })).toBeVisible();
});

test('A35 — estLocalhost() vaut aussi pour un contexte NON sécurisé (test sur téléphone en http://192.168.x.x)', async ({ page }) => {
  // Sur un hôte hors liste (app.localhost) : l'ancien code rendait TOUJOURS false ; le nouveau suit
  // isSecureContext (sur localhost les deux versions rendent true — non discriminant, revue du lot 4).
  const base = await hoteSW(page);
  test.skip(!base, 'aucun hôte de bouclage hors localhost joignable sur le port 8160');
  await page.goto(`${base}/`);
  const res = await page.evaluate(async () => {
    const { estLocalhost } = await import('/js/state.js');
    const avant = estLocalhost();
    Object.defineProperty(window, 'isSecureContext', { value: false, configurable: true });
    return { avant, nonSecurise: estLocalhost() };
  });
  expect(res.avant).toBe(false); // contexte sécurisé, hôte non listé : le service-worker s'y enregistre (H05)
  expect(res.nonSecurise).toBe(true); // http://192.168.x.x simulé
});

test('A37 / A38 — manifest avec `id`, couleur de barre système = thème effectif (réglage de l’app ou appareil)', async ({ page }) => {
  const manifest = await (await page.request.get('/manifest.webmanifest')).json();
  expect(manifest.id).toBe('/carnet-eps/');
  const couleur = () => page.evaluate(() => document.querySelector('meta[name="theme-color"]').content);
  const regler = (t) => page.evaluate(async (theme) => { (await import('/js/state.js')).sauverPrefs({ theme }); }, t);
  await regler('sombre');
  expect(await couleur()).toBe('#0f1626'); // réglage « Sombre » sur un appareil clair
  await regler('clair');
  expect(await couleur()).toBe('#15459c');
  await page.emulateMedia({ colorScheme: 'dark' });
  await regler('auto');
  expect(await couleur()).toBe('#0f1626'); // auto suit l'appareil
  await page.emulateMedia({ colorScheme: 'light' });
  await expect.poll(couleur).toBe('#15459c'); // et son changement en cours de route
  await regler('auto');
});

// ---------------------------------------------------------------------------
// Performance et pièces jointes
// ---------------------------------------------------------------------------

test('C02 — sélecteur, écran d’appel et récapitulatif lisent une fraction du store « appels », l’accueil son année, tous en une transaction (volume mesuré)', async ({ page }) => {
  // Volume réaliste : 3 classes × 28 élèves × 60 séances = 5 040 appels, écrits en une transaction.
  const total = await page.evaluate(async () => {
    const io = await import('/js/io.js');
    const jour = ((new Date().getDay() + 6) % 7) + 1;
    const objets = { classes: [], eleves: [], sequences: [], edt: [], seances: [], appels: [] };
    for (let c = 0; c < 3; c++) {
      objets.classes.push({ id: 'c' + c, nom: '6' + 'ABC'[c], archivee: false });
      for (let i = 0; i < 28; i++) objets.eleves.push({ id: `e${c}_${i}`, classeId: 'c' + c, nom: 'NOM' + i, prenom: 'P', actif: true });
      objets.sequences.push({ id: 'sq' + c, classeId: 'c' + c, apsa: 'Bad', nbSeancesPrevu: 60, dateDebut: '2020-01-01', dateFin: '2099-12-31' });
      for (let s = 0; s < 60; s++) {
        const d = new Date(); d.setDate(d.getDate() - s);
        const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const id = `s${c}_${s}`;
        objets.seances.push({ id, sequenceId: 'sq' + c, date, edtId: null, numero: 60 - s, annulee: false });
        for (let i = 0; i < 28; i++) objets.appels.push({ id: `${id}_e${c}_${i}`, seanceId: id, eleveId: `e${c}_${i}`, statut: i % 7 === 0 ? 'absent' : 'present' });
      }
    }
    objets.edt.push({ id: 'cr1', jour, heureDebut: '00:00', heureFin: '23:59', classeId: 'c0', semaine: 'AB', installation: '' });
    await io.restaurer(objets);
    return objets.appels.length;
  });
  expect(total).toBe(5040);
  // Sondes : ENREGISTREMENTS du store « appels » rendus (par le store ET par ses index — une sonde sur
  // le seul store était aveugle aux lectures par index) et TRANSACTIONS ouvertes sur ce store.
  await page.evaluate(() => {
    window.__lus = 0; window.__tx = 0;
    for (const proto of [IDBObjectStore.prototype, IDBIndex.prototype]) {
      const orig = proto.getAll;
      proto.getAll = function (...a) {
        const req = orig.apply(this, a);
        const store = this instanceof IDBIndex ? this.objectStore.name : this.name;
        if (store === 'appels') req.addEventListener('success', () => { window.__lus += req.result.length; });
        return req;
      };
    }
    const tx = IDBDatabase.prototype.transaction;
    IDBDatabase.prototype.transaction = function (noms, ...a) { if ([].concat(noms).includes('appels')) window.__tx++; return tx.call(this, noms, ...a); };
  });
  const mesures = {};
  for (const [route, attendu, part] of [
    ['#/appel', 'Appel fait ✓', 0.15],         // séances du jour + 10 récentes (13 × 28 = 364)
    ['#/appel/s0_0', '28/28 saisis', 0.4],     // les 28 élèves d'UNE classe sur l'année (1 680) + la séance
    ['#/appel/recap/c0', '6A', 0.4],           // les séances d'UNE classe (1 680)
    ['#/accueil', 'Appel fait ✓', 1.01],       // l'année scolaire entière (= tout le store après la purge de rentrée)
  ]) {
    await page.evaluate(() => { window.__lus = 0; window.__tx = 0; });
    await page.evaluate((r) => { location.hash = r; }, route);
    await expect(page.locator('#vue')).toContainText(attendu); // résultats identiques à l'ancienne lecture globale
    if (route.startsWith('#/appel/recap')) await expect(page.locator('tbody tr')).toHaveCount(28);
    else await page.waitForTimeout(300);
    mesures[route] = await page.evaluate(() => ({ lus: window.__lus, tx: window.__tx }));
    expect(mesures[route].lus, `${route} a lu ${mesures[route].lus} appels sur ${total}`).toBeLessThanOrEqual(total * part);
    // Une transaction par séance ou par élève (13, 28, 60 et ~40 avec le code d'avant la revue) : plus maintenant.
    expect(mesures[route].tx, `${route} a ouvert ${mesures[route].tx} transactions sur « appels »`).toBeLessThanOrEqual(3);
  }
  expect(mesures['#/appel/s0_0'].lus).toBeGreaterThan(1000); // la sonde voit bien les lectures par index
});

test('A23 — compterTout() compte sans charger les enregistrements (count, pas getAll)', async ({ page }) => {
  const res = await page.evaluate(async () => {
    const io = await import('/js/io.js');
    await io.enregistrer('classes', { id: 'c1', nom: '6A', archivee: false });
    let getAll = 0; let count = 0;
    const oG = IDBObjectStore.prototype.getAll; const oC = IDBObjectStore.prototype.count;
    IDBObjectStore.prototype.getAll = function (...a) { getAll++; return oG.apply(this, a); };
    IDBObjectStore.prototype.count = function (...a) { count++; return oC.apply(this, a); };
    const comptes = await io.compterTout();
    IDBObjectStore.prototype.getAll = oG; IDBObjectStore.prototype.count = oC;
    return { getAll, count, classes: comptes.classes, stores: Object.keys(comptes).length };
  });
  expect(res).toEqual({ getAll: 0, count: 14, classes: 1, stores: 14 });
});

test('C08 / B39 — une pièce jointe non-image de plus de 8 Mo est refusée avec un message', async ({ page }) => {
  const res = await page.evaluate(async () => {
    const { stockerFichier } = await import('/js/media.js');
    const io = await import('/js/io.js');
    let erreur = null;
    let limite = null;
    try { await stockerFichier(new File([new Uint8Array(9 * 1024 * 1024)], 'gros.pdf', { type: 'application/pdf' })); } catch (e) { erreur = e.message; }
    try { await stockerFichier(new File([new Uint8Array(Math.round(8.2 * 1024 * 1024))], 'limite.pdf', { type: 'application/pdf' })); } catch (e) { limite = e.message; }
    const petit = await stockerFichier(new File([new Uint8Array(1024)], 'petit.pdf', { type: 'application/pdf' }));
    return { erreur, limite, fichiers: (await io.tous('fichiers')).length, petit: petit.taille };
  });
  expect(res.erreur).toMatch(/pièce trop lourde \(9,0 Mo\) — limite 8 Mo/);
  expect(res.limite).toMatch(/pièce trop lourde \(8,2 Mo\) — limite 8 Mo/); // pas « 8 Mo — limite 8 Mo » (revue du lot 4)
  expect(res.fichiers).toBe(1);
  expect(res.petit).toBe(1024);
});

test('C07 / B14 — ouverture d’un PDF : pas de recopie du blob, URL révoquée après 60 s et non 1 s, onglet sans opener', async ({ page }) => {
  const res = await page.evaluate(async () => {
    const { ouvrirVisionneuse } = await import('/js/media.js');
    const blob = new Blob(['%PDF-1.4'], { type: 'application/pdf' });
    const journal = { crees: [], ouverts: [], revoques: [] };
    const oC = URL.createObjectURL; const oR = URL.revokeObjectURL; const oO = window.open;
    URL.createObjectURL = (b) => { journal.crees.push(b === blob); return oC.call(URL, b); };
    URL.revokeObjectURL = (u) => { journal.revoques.push(u); oR.call(URL, u); };
    window.open = (u, cible, options) => { journal.ouverts.push([cible, options]); return null; };
    ouvrirVisionneuse({ blob, mime: 'application/pdf', nom: 'x.pdf' });
    await new Promise((r) => setTimeout(r, 1500));
    URL.createObjectURL = oC; URL.revokeObjectURL = oR; window.open = oO;
    return journal;
  });
  expect(res.crees).toEqual([true]); // le blob lui-même, pas une copie
  expect(res.ouverts).toEqual([['_blank', 'noopener']]);
  expect(res.revoques).toEqual([]); // toujours valable après 1,5 s
});
