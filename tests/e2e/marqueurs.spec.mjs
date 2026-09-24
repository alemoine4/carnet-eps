// Marqueurs de séance, v0.14.1 « le vocabulaire » : l'écran #/marqueurs (liste, formulaire, archivage),
// l'amorçage des six marqueurs proposés et les doublons lisibles. Contrat : docs/avis/AVIS_FORMAT_MARQUEURS.md
// (§6.5, §11.2 — MQ-12 et MQ-17 ; MQ-18, MQ-19 et MQ-20 ajoutés avec cette version). Les autres tests MQ arrivent
// avec les versions qui livrent ce qu'ils exercent (§13). Données INVENTÉES uniquement (aucun élève ici).
// Chaque test AFFIRME ses prémisses avant de conclure : une preuve vide ne rougit pas toute seule.

import { test, expect } from '@playwright/test';

// Base vidée en DÉRIVANT la liste des magasins de io.STORES, jamais par une liste écrite à la main :
// une constante figée oublierait « marqueurs » et « marquages » comme d'autres specs ont oublié « grilles ».
test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(async () => {
    const io = await import('/js/io.js');
    await io.ouvrirDB();
    for (const s of io.STORES) await io.vider(s);
  });
});

// Vocabulaire relu en base, trié par identifiant (comparaisons indépendantes de l'ordre de lecture).
const lireVocabulaire = (page) => page.evaluate(async () => {
  const io = await import('/js/io.js');
  return (await io.tous('marqueurs')).sort((a, b) => a.id.localeCompare(b.id));
});

// Écrit une ligne dans « marqueurs » juste AVANT la prochaine transaction d'écriture sur ce magasin.
// IndexedDB exécute dans leur ordre de création les transactions d'écriture de même portée : la
// transaction visée relit une base qui contient déjà la ligne, alors que TOUTE liste lue plus tôt
// (par la vue à son ouverture, ou avant l'ouverture de la transaction) l'ignore. C'est la collision
// « créée derrière la vue » du §11.2, au pire moment possible. `window.__injecte` atteste qu'elle a eu lieu.
const injecterAvantEcriture = (page, ligne) => page.evaluate((l) => {
  const origine = IDBDatabase.prototype.transaction;
  window.__injecte = false;
  IDBDatabase.prototype.transaction = function (stores, mode, ...reste) {
    if (!window.__injecte && mode === 'readwrite' && [].concat(stores).includes('marqueurs')) {
      window.__injecte = true;
      IDBDatabase.prototype.transaction = origine;
      origine.call(this, ['marqueurs'], 'readwrite').objectStore('marqueurs').put(l);
    }
    return origine.call(this, stores, mode, ...reste);
  };
}, ligne);

// Sauvegarde « bricolée » : l'export réel de la base, dont le vocabulaire est remplacé, réimporté comme un
// fichier (validerExport compris) — c'est le seul chemin par lequel ces lignes peuvent entrer en usage.
const importerVocabulaire = (page, marqueurs) => page.evaluate(async (liste) => {
  const io = await import('/js/io.js');
  const dump = await io.exporterJSON();
  dump.stores.marqueurs = liste;
  await io.importerJSON(JSON.parse(JSON.stringify(dump)));
}, marqueurs);

const enregistrerMarqueur = (page) => page.getByRole('button', { name: 'Enregistrer le marqueur' }).click();
const statutFormulaire = (page) => page.locator('#vue p.statut[role="status"]');

test('MQ-12 — code court unique sur sa forme normalisée (« éq » contre « EQ »), relu dans la transaction ; le genre est verrouillé en modification', async ({ page }) => {
  await page.goto('/#/marqueurs/nouveau');
  await expect(page.locator('#mq-libelle')).toBeVisible();
  // Prémisse : la vue s'est ouverte sur un vocabulaire VIDE, toute liste qu'elle a pu lire est donc périmée.
  expect(await lireVocabulaire(page)).toEqual([]);
  await page.locator('#mq-libelle').fill('Équipe bis');
  await page.locator('#mq-court').fill('éq');
  // Majuscules affichées par le CSS, appliquées à l'aperçu et à l'enregistrement ; la saisie n'est jamais
  // réécrite pendant la frappe (revue v0.14.1, R1 — prouvé par composition dans MQ-20).
  await expect(page.locator('#mq-court')).toHaveValue('éq');
  await expect(page.locator('.mq-ligne-code .mq-code')).toHaveText('ÉQ');
  await page.locator('#mq-genre').selectOption('groupe');
  await injecterAvantEcriture(page, { id: 'mq-eq', libelle: 'Équipe', court: 'EQ', genre: 'groupe', couleur: 'bleu', archivee: false });
  await enregistrerMarqueur(page);
  await expect(statutFormulaire(page)).toHaveClass(/statut-erreur/);
  await expect(statutFormulaire(page)).toContainText('le code « ÉQ » est déjà pris par « Équipe »');
  expect(await page.evaluate(() => window.__injecte)).toBe(true); // la collision est bien née derrière la vue
  // Rien n'est écrit, la saisie reste à l'écran.
  expect((await lireVocabulaire(page)).map((m) => m.id)).toEqual(['mq-eq']);
  expect(page.url()).toContain('#/marqueurs/nouveau');
  await expect(page.locator('#mq-court')).toHaveValue('éq');
  await expect(page.locator('#mq-libelle')).toHaveValue('Équipe bis');

  // Genre verrouillé en modification (décision 13), et jamais transmis — même forcé par programme.
  await page.goto('/#/marqueurs/modifier/mq-eq');
  await expect(page.locator('#mq-libelle')).toHaveValue('Équipe');
  await expect(page.locator('#mq-genre')).toBeDisabled();
  await expect(page.locator('#vue')).toContainText('Le genre ne change pas : créez un nouveau marqueur.');
  await page.locator('#mq-genre').evaluate((s) => { s.value = 'role'; s.dispatchEvent(new Event('change')); });
  await page.locator('#mq-court').fill('eq1');
  await enregistrerMarqueur(page);
  await expect(page).toHaveURL(/#\/marqueurs$/);
  const apres = (await lireVocabulaire(page)).find((m) => m.id === 'mq-eq');
  expect(apres.court).toBe('EQ1'); // prémisse : la modification a bien été écrite
  expect(apres.genre).toBe('groupe');

  // Témoin : le premier renommé, le même code est accepté.
  await page.goto('/#/marqueurs/nouveau');
  await page.locator('#mq-libelle').fill('Équipe bis');
  await page.locator('#mq-court').fill('éq');
  await page.locator('#mq-genre').selectOption('groupe');
  await enregistrerMarqueur(page);
  await expect(page).toHaveURL(/#\/marqueurs$/);
  const v = await lireVocabulaire(page);
  expect(v).toHaveLength(2);
  expect(v.find((m) => m.id !== 'mq-eq')).toMatchObject({ libelle: 'Équipe bis', court: 'ÉQ', genre: 'groupe', archivee: false });
});

test('MQ-17 — un champ inconnu survit au renommage par le formulaire ; l’identifiant ne vient jamais de `modifs` ; un marqueur sans genre reste lisible, rangé avec les comportements, et ne s’archive pas', async ({ page }) => {
  // (1) Champ inconnu écrit directement en base, puis renommage par le formulaire.
  await page.evaluate(async () => {
    const io = await import('/js/io.js');
    await io.enregistrer('marqueurs', { id: 'mq-f', libelle: 'Arbitre', court: 'ARB', genre: 'role', couleur: 'bleu', archivee: false, famille: 'x' });
  });
  expect((await lireVocabulaire(page))[0].famille).toBe('x'); // prémisse : le champ était là avant
  await page.goto('/#/marqueurs/modifier/mq-f');
  await expect(page.locator('#mq-libelle')).toHaveValue('Arbitre');
  await page.locator('#mq-libelle').fill('Arbitre principal');
  await enregistrerMarqueur(page);
  await expect(page).toHaveURL(/#\/marqueurs$/);
  await expect(page.locator('.toast', { hasText: 'Marqueur enregistré.' })).toBeVisible();
  const renomme = (await lireVocabulaire(page))[0];
  expect(renomme.libelle).toBe('Arbitre principal'); // le renommage a bien eu lieu
  expect(renomme.famille).toBe('x');

  // (2) L'identifiant ne vient jamais des modifications (le formulaire n'en transmet pas : appel direct, §4.4).
  const direct = await page.evaluate(async () => {
    const io = await import('/js/io.js');
    const avant = (await io.tous('marqueurs')).length;
    await io.ecrireMarqueur('mq-f', { id: 'autre', libelle: 'X' });
    const lignes = await io.tous('marqueurs');
    return { avant, apres: lignes.length, ligne: lignes.find((m) => m.id === 'mq-f'), autre: lignes.some((m) => m.id === 'autre') };
  });
  expect(direct.ligne.libelle).toBe('X'); // prémisse : l'écriture a eu lieu
  expect(direct.autre).toBe(false);
  expect(direct.apres).toBe(direct.avant);

  // (3) Marqueur IMPORTÉ sans genre : aucun genre par défaut, l'archivage est refusé et la ligne reste intacte (M51).
  await importerVocabulaire(page, [
    { ...direct.ligne },
    { id: 'mq-ng', libelle: 'Sans genre', court: 'SG' },
    { id: 'mq-gi', libelle: 'Genre futur', court: 'GF', genre: 'arbitrage', couleur: 'bleu', archivee: false },
  ]);
  const sansGenre = (await lireVocabulaire(page)).find((m) => m.id === 'mq-ng');
  expect(sansGenre).toEqual({ id: 'mq-ng', libelle: 'Sans genre', court: 'SG' }); // prémisse : importé tel quel
  const refus = await page.evaluate(async () => {
    const io = await import('/js/io.js');
    try { await io.ecrireMarqueur('mq-ng', { archivee: true }); return null; } catch (e) { return e.message; }
  });
  expect(refus).toBe('genre de marqueur inconnu');
  expect((await lireVocabulaire(page)).find((m) => m.id === 'mq-ng')).toEqual({ id: 'mq-ng', libelle: 'Sans genre', court: 'SG' });

  // (4) À l'écran : un genre absent ou inconnu se lit et se range « Comportements » (§5.1 point 5, §6.5),
  // jamais « undefined » ; « Archiver » depuis la liste dit le refus dans un toast. La vue est déjà sur
  // #/marqueurs (retour du formulaire) : même adresse = aucun hashchange, d'où le rechargement.
  await page.goto('/#/marqueurs');
  await page.reload();
  await expect(page.locator('h2.mq-genre')).toHaveText(['Rôles', 'Comportements']);
  const rangement = await page.evaluate(() => Object.fromEntries([...document.querySelectorAll('#vue .mq-titre')].map((h) => {
    let n = h.closest('.carte').previousElementSibling;
    while (n && !n.matches('h2.mq-genre')) n = n.previousElementSibling;
    return [h.textContent, n?.textContent ?? null];
  })));
  expect(rangement).toEqual({ X: 'Rôles', 'Sans genre': 'Comportements', 'Genre futur': 'Comportements' });
  await expect(page.locator('.carte', { hasText: 'Sans genre' })).toContainText('SG · Comportements');
  await expect(page.locator('.carte', { hasText: 'Genre futur' })).toContainText('GF · Comportements');
  await expect(page.locator('#vue')).not.toContainText('undefined');
  // Et il ne montre pas son code « sur la carte » : le repère neutre, comme un comportement (décision 10, R2).
  for (const nom of ['Sans genre', 'Genre futur']) {
    const c = page.locator('.carte', { has: page.locator('.mq-titre', { hasText: new RegExp(`^${nom}$`) }) });
    await expect(c.locator('.mq-neutre')).toHaveCount(1);
    await expect(c.locator('.mq-code')).toHaveCount(0);
  }
  await expect(page.locator('.carte', { has: page.locator('.mq-titre', { hasText: /^X$/ }) }).locator('.mq-code')).toHaveText('ARB'); // témoin : le rôle, lui, montre son code
  await page.getByRole('button', { name: 'Archiver « Sans genre »' }).click();
  await expect(page.locator('.toast', { hasText: 'Archivage impossible : genre de marqueur inconnu' })).toBeVisible();
  expect((await lireVocabulaire(page)).find((m) => m.id === 'mq-ng')).toEqual({ id: 'mq-ng', libelle: 'Sans genre', court: 'SG' });
});

test('MQ-18 — amorçage : sur un vocabulaire vide, « Créer les 6 marqueurs proposés » les écrit par ecrireMarqueur ; le bouton disparaît dès qu’un marqueur existe ; un échec partiel est dit', async ({ page }) => {
  const amorce = page.getByRole('button', { name: 'Créer les 6 marqueurs proposés' });
  await page.goto('/#/marqueurs');
  await expect(page.locator('#vue')).toContainText('Votre premier marqueur');
  await expect(amorce).toBeVisible();
  expect(await lireVocabulaire(page)).toEqual([]); // prémisse : vocabulaire vide
  await amorce.click();
  await expect(page.locator('.toast', { hasText: '6 marqueurs créés.' })).toBeVisible();
  const v = await lireVocabulaire(page);
  const parCode = Object.fromEntries(v.map((m) => [m.court, m]));
  expect(Object.keys(parCode).sort()).toEqual(['ARB', 'COA', 'E1', 'E2', 'OBS', 'REC']);
  expect(v.map(({ libelle, court, genre, archivee }) => ({ libelle, court, genre, archivee })).sort((a, b) => a.court.localeCompare(b.court))).toEqual([
    { libelle: 'Arbitre', court: 'ARB', genre: 'role', archivee: false },
    { libelle: 'Coach', court: 'COA', genre: 'role', archivee: false },
    { libelle: 'Équipe 1', court: 'E1', genre: 'groupe', archivee: false },
    { libelle: 'Équipe 2', court: 'E2', genre: 'groupe', archivee: false },
    { libelle: 'Observateur', court: 'OBS', genre: 'role', archivee: false },
    { libelle: 'À recadrer', court: 'REC', genre: 'comportement', archivee: false },
  ]);
  const couleurs = ['ARB', 'OBS', 'COA', 'E1', 'E2'].map((c) => parCode[c].couleur);
  expect(new Set(couleurs).size).toBe(5); // rôles et équipes : couleurs toutes distinctes
  expect(couleurs.every((c) => c !== 'gris')).toBe(true);
  expect(parCode.REC.couleur).toBe('gris');
  for (const m of v) expect(m.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  await expect(amorce).toHaveCount(0);
  await expect(page.locator('h2.mq-genre')).toHaveText(['Rôles', 'Équipes', 'Comportements']);

  // Le bouton disparaît dès qu'un marqueur existe — même archivé : « vide » veut dire vide.
  await page.evaluate(async () => {
    const io = await import('/js/io.js');
    await io.vider('marqueurs');
    await io.ecrireMarqueur('mq-seul', { libelle: 'Ancien rôle', court: 'ANC', genre: 'role', couleur: 'bleu', archivee: true });
  });
  await page.reload();
  await expect(page.locator('.carte', { hasText: 'Ancien rôle' })).toContainText('ANC · Rôles · archivé'); // témoin : la liste est rendue
  await expect(amorce).toHaveCount(0);
  await expect(page.locator('#vue')).not.toContainText('Votre premier marqueur');

  // Vue PÉRIMÉE (revue v0.14.1, R4) : la liste est rendue sur un vocabulaire vide, puis un marqueur est écrit
  // derrière elle (un autre onglet). Le geste relit la base : rien n'est créé, c'est dit, et le focus reste
  // dans la vue (R3 : #mq-amorcer n'existe plus après le nouveau rendu).
  await page.evaluate(async () => (await import('/js/io.js')).vider('marqueurs'));
  await page.reload();
  await expect(amorce).toBeVisible();
  await page.evaluate(async () => (await import('/js/io.js')).ecrireMarqueur('mq-ailleurs', { libelle: 'Arbitre principal', court: 'AP', genre: 'role', couleur: 'bleu' }));
  expect((await lireVocabulaire(page)).map((m) => m.id)).toEqual(['mq-ailleurs']); // prémisse : en base
  await expect(amorce).toBeVisible(); // prémisse : la vue, elle, l'ignore encore
  await amorce.focus();
  await expect(amorce).toBeFocused(); // prémisse : le geste part bien du bouton
  await page.keyboard.press('Enter');
  await expect(page.locator('.toast', { hasText: 'Des marqueurs existent déjà : rien n’a été créé.' })).toBeVisible();
  expect((await lireVocabulaire(page)).map((m) => m.id)).toEqual(['mq-ailleurs']); // aucun marqueur ajouté
  await expect(amorce).toHaveCount(0);
  await expect(page.locator('.carte', { hasText: 'Arbitre principal' })).toContainText('AP · Rôles');
  await expect(page.locator('#mq-nouveau')).toBeFocused(); // jamais <body>

  // Échec partiel : un « ARB » créé ailleurs juste avant la première écriture. Le refus est dit, rien n'est doublé.
  await page.evaluate(async () => (await import('/js/io.js')).vider('marqueurs'));
  await page.reload();
  await expect(amorce).toBeVisible();
  await injecterAvantEcriture(page, { id: 'mq-autre', libelle: 'Arbitre (autre écran)', court: 'ARB', genre: 'role', couleur: 'gris', archivee: false });
  await amorce.click();
  const attendu = '5 marqueurs créés sur 6. Non créé — Arbitre (ARB) : le code « ARB » est déjà pris par « Arbitre (autre écran) ».';
  await expect(page.locator('#vue p.statut-erreur')).toHaveText(attendu);
  await expect(page.locator('.toast', { hasText: attendu })).toBeVisible();
  expect(await page.evaluate(() => window.__injecte)).toBe(true); // prémisse : la collision a bien eu lieu
  const apres = await lireVocabulaire(page);
  expect(apres).toHaveLength(6);
  expect(apres.filter((m) => m.court === 'ARB').map((m) => m.id)).toEqual(['mq-autre']);
});

test('MQ-19 — doublons lisibles : deux marqueurs actifs de même code (sauvegarde bricolée) sont nommés, et archiver l’un libère l’autre', async ({ page }) => {
  await importerVocabulaire(page, [
    { id: 'mq-d1', libelle: 'Arbitre', court: 'ARB', genre: 'role', couleur: 'bleu', archivee: false },
    { id: 'mq-d2', libelle: 'Arbitre bis', court: 'arb', genre: 'role', couleur: 'vert', archivee: false },
    { id: 'mq-c', libelle: 'Coach', court: 'COA', genre: 'role', couleur: 'orange', archivee: false },
  ]);
  // Prémisse : le blocage existe bien — ecrireMarqueur refuse de modifier l'un comme l'autre.
  const blocage = await page.evaluate(async () => {
    const io = await import('/js/io.js');
    const essai = async (id) => { try { await io.ecrireMarqueur(id, { libelle: 'Renommé' }); return null; } catch (e) { return e.message; } };
    return [await essai('mq-d1'), await essai('mq-d2')];
  });
  expect(blocage).toEqual(['le code « ARB » est déjà pris par « Arbitre bis »', 'le code « arb » est déjà pris par « Arbitre »']);

  await page.goto('/#/marqueurs');
  const alerte = page.locator('.carte', { hasText: 'Codes en double' });
  const carteDe = (titre) => page.locator('.carte', { has: page.locator('.mq-titre', { hasText: new RegExp(`^${titre}$`) }) });
  await expect(alerte).toContainText('Code « ARB » : « Arbitre », « Arbitre bis ».');
  // La mention est sur CHAQUE carte du groupe, pas seulement la première (revue v0.14.1, R8).
  await expect(carteDe('Arbitre')).toContainText('Code en double avec « Arbitre bis »');
  await expect(carteDe('Arbitre bis')).toContainText('Code en double avec « Arbitre »');
  await expect(carteDe('Coach')).not.toContainText('Code en double'); // témoin

  // Depuis « Modifier », le doublon est nommé dès l'ouverture, avant tout refus.
  await page.goto('/#/marqueurs/modifier/mq-d1');
  await expect(statutFormulaire(page)).toContainText('Code « ARB » en double avec « Arbitre bis »');

  // Archiver l'un depuis l'alerte, AU CLAVIER (Tab puis Entrée réels) : le code est libéré, l'alerte
  // disparaît, et le focus reste dans la vue, sur le bouton de la carte traitée (revue v0.14.1, R3).
  await page.goto('/#/marqueurs');
  const boutonAlerte = alerte.getByRole('button', { name: 'Archiver « Arbitre bis »' });
  await expect(boutonAlerte).toBeVisible();
  await page.locator('#vue').focus();
  for (let i = 0; i < 20 && !(await boutonAlerte.evaluate((b) => b === document.activeElement)); i++) await page.keyboard.press('Tab');
  await expect(boutonAlerte).toBeFocused(); // prémisse : atteint par la tabulation, c'est bien le bouton de l'alerte
  await page.keyboard.press('Enter');
  await expect(page.locator('.toast', { hasText: '« Arbitre bis » archivé' })).toBeVisible();
  await expect(alerte).toHaveCount(0);
  expect((await lireVocabulaire(page)).find((m) => m.id === 'mq-d2').archivee).toBe(true);
  expect(await page.evaluate(() => ({
    dansLaVue: document.getElementById('vue').contains(document.activeElement),
    id: document.activeElement?.id,
    nom: document.activeElement?.getAttribute('aria-label'),
  }))).toEqual({ dansLaVue: true, id: 'mq-archive-mq-d2', nom: 'Restaurer « Arbitre bis »' });

  // Archivés en dernier à l'intérieur de chaque genre (§6.5, R7) : l'alphabet seul donnerait Arbitre, Arbitre bis, Coach.
  await expect(page.locator('h2.mq-genre')).toHaveText(['Rôles']);
  await expect(page.locator('#vue .mq-titre')).toHaveText(['Arbitre', 'Coach', 'Arbitre bis']);

  // Témoin : l'autre se modifie de nouveau, par le formulaire.
  await page.goto('/#/marqueurs/modifier/mq-d1');
  await expect(page.locator('#mq-libelle')).toHaveValue('Arbitre');
  await expect(statutFormulaire(page)).toHaveText('');
  await page.locator('#mq-libelle').fill('Arbitre principal');
  await enregistrerMarqueur(page);
  await expect(page).toHaveURL(/#\/marqueurs$/);
  expect((await lireVocabulaire(page)).find((m) => m.id === 'mq-d1').libelle).toBe('Arbitre principal');

  // « Restaurer » (revue v0.14.1, R5) : le code de « Arbitre bis » est repris par « Arbitre principal » →
  // refus DIT en toast (§6.5), le marqueur reste archivé.
  await expect(page.getByRole('button', { name: 'Restaurer « Arbitre bis »' })).toBeVisible();
  await page.getByRole('button', { name: 'Restaurer « Arbitre bis »' }).click();
  await expect(page.locator('.toast', { hasText: 'Restauration impossible : le code « arb » est déjà pris par « Arbitre principal »' })).toBeVisible();
  expect((await lireVocabulaire(page)).find((m) => m.id === 'mq-d2').archivee).toBe(true);
  // Témoin : le code libéré (archivage de « Arbitre principal »), la restauration réussit.
  await page.getByRole('button', { name: 'Archiver « Arbitre principal »' }).click();
  await expect(page.locator('.toast', { hasText: '« Arbitre principal » archivé' })).toBeVisible();
  expect((await lireVocabulaire(page)).find((m) => m.id === 'mq-d1').archivee).toBe(true); // prémisse : le code est libre
  await page.getByRole('button', { name: 'Restaurer « Arbitre bis »' }).click();
  await expect(page.locator('.toast', { hasText: '« Arbitre bis » restauré.' })).toBeVisible();
  expect((await lireVocabulaire(page)).find((m) => m.id === 'mq-d2').archivee).toBe(false);
  await expect(carteDe('Arbitre bis')).not.toContainText('archivé');
});

test('MQ-20 — code court et aperçu « sur la carte » : majuscules sans réécrire la saisie (clavier qui compose le mot) ; un rôle montre son code, qui suit la frappe ; un comportement ne montre que le repère neutre, dans le formulaire et dans la liste', async ({ page }) => {
  await page.goto('/#/marqueurs/nouveau');
  const court = page.locator('#mq-court');
  const apercu = page.locator('.mq-ligne-code .mq-apercu');
  await expect(court).toBeVisible();
  await page.locator('#mq-libelle').fill('Arbitre');
  // Prémisses : un rôle par défaut, couleur proposée, aperçu vide « ? ».
  await expect(page.locator('#mq-genre')).toHaveValue('role');
  await expect(page.locator('#mq-couleur')).toBeVisible();
  await expect(apercu.locator('.mq-code')).toHaveText('?');

  // (R1) Clavier qui compose le mot en cours (type Gboard), en minuscules : la composition passe par CDP,
  // comme un vrai clavier Android — `fill()` n'en ouvre aucune. Réécrire le champ pendant la composition
  // donnait « AARARB ».
  await court.focus();
  await expect(court).toBeFocused();
  const cdp = await page.context().newCDPSession(page);
  for (const t of ['a', 'ar', 'arb']) {
    await cdp.send('Input.imeSetComposition', { text: t, selectionStart: t.length, selectionEnd: t.length });
    await expect(court).toHaveValue(t); // la composition n'est jamais réécrite
    await expect(apercu.locator('.mq-code')).toHaveText(t.toUpperCase()); // l'aperçu suit la frappe, en majuscules
  }
  await cdp.send('Input.insertText', { text: 'arb' });
  await expect(court).toHaveValue('arb');
  expect(await court.evaluate((i) => getComputedStyle(i).textTransform)).toBe('uppercase'); // affiché en majuscules
  await expect(apercu.locator('.mq-code')).toHaveText('ARB');
  await expect(apercu.locator('.mq-code')).toHaveAttribute('data-niveau-couleur', 'bleu');
  await expect(apercu.locator('.mq-neutre')).toHaveCount(0);
  await page.keyboard.press('Backspace');
  await expect(apercu.locator('.mq-code')).toHaveText('AR'); // suit aussi l'effacement
  await page.keyboard.type('b');
  await expect(apercu.locator('.mq-code')).toHaveText('ARB');

  // (R2) Un comportement : le repère neutre, sans texte, jamais le code ; couleur masquée ; le sens est dit.
  await page.locator('#mq-genre').selectOption('comportement');
  await expect(page.locator('#mq-couleur')).toBeHidden();
  await expect(page.locator('#vue')).toContainText('Les comportements n’affichent pas de couleur sur la carte.');
  await expect(apercu.locator('.mq-code')).toHaveCount(0);
  await expect(apercu.locator('.mq-neutre')).toHaveCount(1);
  await expect(apercu.locator('.mq-neutre')).toHaveText('');
  await expect(apercu).toContainText('un repère neutre, sans code ; le sens reste dans la feuille de l’élève.');
  await expect(apercu).not.toContainText('ARB');
  // Le repère se voit : une taille réelle et l'encre pleine du texte (§7, point 3), mesurées comme une règle.
  const repere = await apercu.locator('.mq-neutre').evaluate((n) => {
    const r = n.getBoundingClientRect();
    return { l: r.width, h: r.height, fond: getComputedStyle(n).backgroundColor, encre: getComputedStyle(document.body).color };
  });
  expect(repere.l).toBeGreaterThan(0);
  expect(repere.h).toBeGreaterThan(0);
  expect(repere.fond).toBe(repere.encre);
  // Et il reste sur la ligne de « Sur la carte : » ; seule la phrase passe à la ligne, calée sur le bord
  // gauche du champ. Mesuré à 360 px de large (la largeur Android la plus courante), sur les deux
  // profils : la phrase n'y tient jamais à côté du repère, quelle que soit la police.
  await page.setViewportSize({ width: 360, height: 800 });
  const boite = (l) => l.evaluate((n) => { const r = n.getBoundingClientRect(); return { x: r.left, haut: r.top, bas: r.bottom }; });
  const etiquette = await boite(page.locator('.mq-ligne-code > .note-inline', { hasText: 'Sur la carte :' }));
  const point = await boite(apercu.locator('.mq-neutre'));
  const phrase = await boite(apercu.locator('.note-inline'));
  const champCourt = await boite(court);
  expect(phrase.haut).toBeGreaterThanOrEqual(etiquette.bas); // prémisse : la phrase est bien passée à la ligne
  const milieu = (point.haut + point.bas) / 2;
  expect(milieu).toBeGreaterThan(etiquette.haut);
  expect(milieu).toBeLessThan(etiquette.bas);
  expect(Math.abs(phrase.x - champCourt.x)).toBeLessThan(1);
  // Témoin dans le même test : revenu au rôle, le code et la couleur reviennent.
  await page.locator('#mq-genre').selectOption('role');
  await expect(apercu.locator('.mq-code')).toHaveText('ARB');
  await expect(page.locator('#mq-couleur')).toBeVisible();

  // Enregistré en majuscules, jamais « AARARB ».
  await enregistrerMarqueur(page);
  await expect(page).toHaveURL(/#\/marqueurs$/);
  expect((await lireVocabulaire(page)).map((m) => [m.libelle, m.court, m.genre])).toEqual([['Arbitre', 'ARB', 'role']]);

  // Un comportement enregistré : même repère sur sa carte de la liste.
  await page.goto('/#/marqueurs/nouveau');
  await page.locator('#mq-libelle').fill('Bavardage');
  await court.fill('bav');
  await page.locator('#mq-genre').selectOption('comportement');
  await enregistrerMarqueur(page);
  await expect(page).toHaveURL(/#\/marqueurs$/);
  expect((await lireVocabulaire(page)).find((m) => m.libelle === 'Bavardage')).toMatchObject({ court: 'BAV', genre: 'comportement' });
  const carteDe = (titre) => page.locator('.carte', { has: page.locator('.mq-titre', { hasText: new RegExp(`^${titre}$`) }) });
  await expect(carteDe('Bavardage')).toContainText('BAV · Comportements'); // l'écran de préparation garde le code dans son texte
  await expect(carteDe('Bavardage').locator('.mq-code')).toHaveCount(0);
  await expect(carteDe('Bavardage').locator('.mq-neutre')).toHaveCount(1);
  await expect(carteDe('Bavardage')).toContainText('un repère neutre, sans code ; le sens reste dans la feuille de l’élève.');
  await expect(carteDe('Arbitre').locator('.mq-code')).toHaveText('ARB'); // témoin
  await expect(carteDe('Arbitre').locator('.mq-neutre')).toHaveCount(0);
});
