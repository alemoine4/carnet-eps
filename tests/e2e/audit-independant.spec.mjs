// Audit indépendant du 2026-09-16 (rapport hors dépôt) — premier lot, livré AVANT l'essai téléphone :
// FON-01 (la version d'essai doit se distinguer de la production), FON-05 / PER-05 (la saisie par grille
// jetait le tap suivant sans le montrer) et SEC-04 (actions de la CI épinglées, jeton explicitement en lecture).
// Complété par la revue adversariale du lot (v0.13.1) : même geste = même résultat quel que soit le temps
// d'écriture, signal d'écriture visible, erreur nommée, marge de focus sous l'en-tête agrandi.
// ⚠ Aucune donnée nominative : élèves FICTIF Alice et SECOND Bob, repris du spec des grilles.

import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { nouvelleGrille } from '../../app/js/grilles-calcul.js';

const lire = (rel) => readFileSync(new URL(rel, import.meta.url), 'utf8');
const marqueur = (page) => page.getByRole('region', { name: /version d.essai/i });
const statut = (page) => page.locator('#vue > .statut');

// Les tests d'écran FORCENT le drapeau dans les deux sens : ils restent vrais le jour où le dépôt passe
// MODE_ESSAI à false. Le lien entre le drapeau commité et le manifeste est tenu par la garde de cohérence.
const forcerEssai = (page, valeur) => page.route('**/js/state.js', async (route) => {
  const reponse = await route.fetch();
  const corps = (await reponse.text()).replace(/^export const MODE_ESSAI = (true|false);\r?$/m, `export const MODE_ESSAI = ${valeur};`);
  expect(corps).toContain(`export const MODE_ESSAI = ${valeur};`); // sinon le test ne prouverait rien
  await route.fulfill({ response: reponse, body: corps, headers: { ...reponse.headers(), 'content-type': 'text/javascript; charset=utf-8' } });
});

// Même mise en place que grilles.spec.mjs : grille par défaut (4 niveaux × 4 critères), deux élèves, une évaluation.
const seed = async (page, grille = null) => {
  await page.goto('/');
  return page.evaluate(async (grille) => {
    const io = await import('/js/io.js'); await io.viderTout();
    const { nouvelleGrille } = await import('/js/grilles-calcul.js'); const g = grille || nouvelleGrille(); g.id = 'g'; g.titre = 'Badminton test';
    await io.restaurer({ grilles: [g], classes: [{ id: 'c', nom: '6TEST', archivee: false }],
      eleves: [{ id: 'a', classeId: 'c', nom: 'FICTIF', prenom: 'Alice', actif: true }, { id: 'b', classeId: 'c', nom: 'SECOND', prenom: 'Bob', actif: true }],
      sequences: [{ id: 's', classeId: 'c', apsa: 'Badminton', dateDebut: '2026-09-01', dateFin: '2027-07-01' }],
      evaluations: [{ id: 'v', sequenceId: 's', titre: 'Grille test', date: '2026-09-10', type: 'grille', bareme: 20, coef: 1, grilleId: 'g', grille: structuredClone(g), publieePronote: null }] });
    return g;
  }, grille);
};
const detailEnBase = (page, note) => page.evaluate(async (id) => (await (await import('/js/io.js')).lire('notes', id))?.detail ?? null, note);
// Plusieurs taps dans la MÊME tâche : chacun arrive pendant l'écriture du précédent, sans dépendre d'un délai.
const tapsRapides = (page, taps) => page.evaluate((taps) => {
  const blocs = document.querySelectorAll('.grille-critere');
  for (const [bloc, niveau] of taps) blocs[bloc].querySelectorAll('.grille-niveaux button[data-niveau-cle]')[niveau].click();
}, taps);
const case_ = (page, bloc, niveau) => page.locator('.grille-critere').nth(bloc).locator('.grille-niveaux button[data-niveau-cle]').nth(niveau);
// Panne d'écriture des notes : les premières écritures refusées, une cause par écriture (la dernière se répète si
// `toutes`). Causes distinctes : le message doit rendre à chaque élève SA cause.
const pannerNotes = (page, causes, toutes = false) => page.evaluate(({ causes, toutes }) => {
  const put = IDBObjectStore.prototype.put; let n = 0;
  IDBObjectStore.prototype.put = function (...args) {
    if (this.name === 'notes' && (toutes || n < causes.length)) throw new DOMException(causes[Math.min(n++, causes.length - 1)], 'QuotaExceededError');
    return put.apply(this, args);
  };
}, { causes, toutes });
const grilleAjustable = (criteres = [{ id: 'technique', libelle: 'Technique', poids: 1 }]) => {
  const g = nouvelleGrille();
  g.pointsAjustables = true; g.pasPoints = 1; g.arrondi = 'exact';
  g.niveaux = [{ cle: 'bas', libelle: 'En progrès', points: 5, minimum: 0, couleur: 'orange' }, { cle: 'haut', libelle: 'Acquis', points: 10, minimum: 6, couleur: 'vert' }];
  g.criteres = criteres;
  return g;
};

// ---------------------------------------------------------------- FON-01 — version d'essai

test('FON-01 — drapeau vrai : l’en-tête et le titre de l’onglet annoncent une version d’essai', async ({ page }) => {
  await forcerEssai(page, true);
  await page.goto('/#/accueil');
  await expect(marqueur(page)).toBeVisible();
  await expect(marqueur(page)).toContainText(/données fictives/i);
  await expect(page).toHaveTitle(/essai/i);
  // Le marqueur vit dans l'en-tête : il survit à la navigation et disparaît à l'impression avec lui.
  await page.goto('/#/notes');
  await expect(marqueur(page)).toBeVisible();
  await page.emulateMedia({ media: 'print' });
  await expect(marqueur(page)).toBeHidden();
});

test('FON-01 — drapeau faux : l’application démarre, sans marqueur ni titre d’essai (geste de la mise en service)', async ({ page }) => {
  await forcerEssai(page, false);
  await page.goto('/#/accueil');
  // Preuves de DÉMARRAGE produites par main.js après le bloc d'essai : sans elles, les assertions suivantes
  // seraient déjà vraies sur le HTML statique, même avec un module planté.
  await expect(page.locator('#entete-contexte')).not.toBeEmpty();
  await expect(page.locator('.nav a[aria-current="page"]')).toHaveCount(1);
  expect(await page.evaluate(async () => (await import('/js/state.js')).MODE_ESSAI)).toBe(false);
  await expect(marqueur(page)).toHaveCount(0);
  await expect(page).toHaveTitle('Carnet EPS');
});

test('FON-01 — cohérence : le drapeau MODE_ESSAI et le manifeste disent la même chose, champ par champ', () => {
  // Deux endroits à changer à la mise en service (drapeau + manifeste) : la garde refuse l'oubli de l'un, dans
  // les DEUX sens — un manifeste à moitié remis (nom long encore « essai ») est refusé autant qu'un oubli total.
  const essai = lire('../../app/js/state.js').match(/^export const MODE_ESSAI = (true|false);\r?$/m)?.[1];
  expect(essai, 'MODE_ESSAI doit être un booléen littéral dans state.js').toMatch(/^(true|false)$/);
  const manifest = JSON.parse(lire('../../app/manifest.webmanifest'));
  expect({ short_name: /essai/i.test(manifest.short_name), name: /essai/i.test(manifest.name) })
    .toEqual({ short_name: essai === 'true', name: essai === 'true' });
});

test('FON-01 — sur téléphone, l’en-tête avec le marqueur reste compact, même texte agrandi à 200 %', async ({ page }) => {
  await forcerEssai(page, true);
  for (const [largeur, hauteur] of [[320, 640], [375, 812]]) {
    await page.setViewportSize({ width: largeur, height: hauteur });
    await page.goto('/#/accueil');
    await expect(marqueur(page)).toBeVisible();
    const entete = await page.locator('.entete').boundingBox();
    expect(entete.height, `${largeur} px`).toBeLessThan(hauteur / 5);
  }
  // Réglage d'accessibilité « texte agrandi » : le bandeau reste sur UNE ligne et l'en-tête sous le tiers de l'écran.
  await page.setViewportSize({ width: 320, height: 640 });
  const agrandi = await page.evaluate(() => {
    document.documentElement.style.fontSize = '200%';
    const b = document.querySelector('.essai'), s = getComputedStyle(b);
    return { hauteurBandeau: b.getBoundingClientRect().height, uneLigne: parseFloat(s.lineHeight) + parseFloat(s.paddingTop) + parseFloat(s.paddingBottom), entete: document.querySelector('.entete').getBoundingClientRect().height };
  });
  expect(agrandi.hauteurBandeau).toBeLessThanOrEqual(agrandi.uneLigne + 1);
  expect(agrandi.entete).toBeLessThan(640 / 3);
});

test('B05 — la marge de focus suit la hauteur réelle de l’en-tête : Maj+Tab ne cache pas la case sous le bandeau', async ({ page }) => {
  await forcerEssai(page, true);
  await seed(page);
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto('/#/grilles/saisie/v');
  await expect(marqueur(page)).toBeVisible();
  await expect(page.locator('.grille-critere')).toHaveCount(4);
  // La mesure passe par un ResizeObserver (asynchrone) : attente bornée de la marge ≥ hauteur de l'en-tête.
  await expect.poll(() => page.evaluate(() => parseFloat(getComputedStyle(document.querySelector('.grille-niveaux button')).scrollMarginTop)
    - document.querySelector('.entete').getBoundingClientRect().height)).toBeGreaterThanOrEqual(0);
  // Le geste de la revue : focus sur une case, la case précédente glissée sous l'en-tête, puis Maj+Tab.
  await page.evaluate(() => {
    const cases = [...document.querySelectorAll('.grille-critere')[1].querySelectorAll('.grille-niveaux button')];
    cases[2].focus();
    window.scrollBy(0, cases[1].getBoundingClientRect().top - 30);
  });
  await page.keyboard.press('Shift+Tab');
  const res = await page.evaluate(() => {
    const cases = [...document.querySelectorAll('.grille-critere')[1].querySelectorAll('.grille-niveaux button')];
    return { focus: document.activeElement === cases[1], haut: cases[1].getBoundingClientRect().top, basEntete: document.querySelector('.entete').getBoundingClientRect().bottom };
  });
  expect(res.focus).toBe(true);
  expect(res.haut).toBeGreaterThanOrEqual(res.basEntete);
  // Texte agrandi en cours d'usage, SANS redimensionnement de la fenêtre : la marge doit suivre aussi.
  await page.evaluate(() => { document.documentElement.style.fontSize = '160%'; });
  await expect.poll(() => page.evaluate(() => parseFloat(getComputedStyle(document.querySelector('.grille-niveaux button')).scrollMarginTop)
    - document.querySelector('.entete').getBoundingClientRect().height)).toBeGreaterThanOrEqual(0);
});

// ---------------------------------------------------------------- FON-05 / PER-05 — saisie par grille

test('FON-05 — deux taps rapides sur deux critères du même élève : aucun n’est perdu', async ({ page }) => {
  const g = await seed(page);
  await page.goto('/#/grilles/saisie/v');
  await expect(page.locator('.grille-critere')).toHaveCount(4);
  await tapsRapides(page, [[0, 1], [1, 2]]);
  await expect(statut(page)).toHaveText('Enregistré ✓');
  expect(await detailEnBase(page, 'v_a')).toEqual({ [g.criteres[0].id]: g.niveaux[1].cle, [g.criteres[1].id]: g.niveaux[2].cle });
  await expect(case_(page, 0, 1)).toHaveAttribute('aria-pressed', 'true');
  await expect(case_(page, 1, 2)).toHaveAttribute('aria-pressed', 'true');
});

test('FON-05 — par critère, deux élèves tapés coup sur coup sont tous deux enregistrés', async ({ page }) => {
  const g = await seed(page);
  await page.goto('/#/grilles/saisie/v');
  await page.getByLabel('Mode de saisie').selectOption('critere');
  await expect(page.locator('.grille-critere')).toHaveCount(2);
  await tapsRapides(page, [[0, 3], [1, 1]]);
  await expect(statut(page)).toHaveText('Enregistré ✓');
  expect(await detailEnBase(page, 'v_a')).toEqual({ [g.criteres[0].id]: g.niveaux[3].cle });
  expect(await detailEnBase(page, 'v_b')).toEqual({ [g.criteres[0].id]: g.niveaux[1].cle });
});

test('FON-05 — même geste, même résultat : retoucher une case l’efface, que le second tap arrive pendant ou après l’écriture', async ({ page }) => {
  await seed(page);
  await page.goto('/#/grilles/saisie/v');
  // La règle est affichée pour toute grille, pas seulement avec les points ajustables (grille par défaut ici).
  await expect(page.locator('.grille-consigne')).toContainText('Retoucher le niveau sélectionné efface ce critère.');
  // Pendant : les deux taps dans la même tâche.
  await tapsRapides(page, [[0, 3], [0, 3]]);
  await expect(statut(page)).toHaveText('Enregistré ✓');
  expect(await detailEnBase(page, 'v_a')).toBeNull();
  await expect(page.locator('.grille-critere').nth(0).locator('.grille-selection')).toHaveText('Non évalué');
  // Après : le second tap attend la fin de la première écriture (rythme d'un double tap humain sur un appareil rapide).
  await case_(page, 0, 3).click();
  await expect(statut(page)).toHaveText('Enregistré ✓');
  await case_(page, 0, 3).click();
  await expect(statut(page)).toHaveText('Enregistré ✓');
  expect(await detailEnBase(page, 'v_a')).toBeNull();
  await expect(page.locator('.grille-critere').nth(0).locator('.grille-selection')).toHaveText('Non évalué');
});

test('FON-05 — changer d’avis dans la même rafale : niveau 1 choisi, puis 2, puis de nouveau 1 → le niveau 1 reste', async ({ page }) => {
  const g = await seed(page);
  await page.goto('/#/grilles/saisie/v');
  await case_(page, 0, 1).click();
  await expect(statut(page)).toHaveText('Enregistré ✓');
  // Jugé sur l'écran figé, le troisième tap (niveau 1, affiché sélectionné) effaçait le critère.
  await tapsRapides(page, [[0, 2], [0, 1]]);
  await expect(statut(page)).toHaveText('Enregistré ✓');
  expect(await detailEnBase(page, 'v_a')).toEqual({ [g.criteres[0].id]: g.niveaux[1].cle });
});

test('FON-05 — dès le tap, la ligne touchée montre le choix, rien n’est verrouillé et l’écriture en cours est signalée', async ({ page }) => {
  const g = await seed(page);
  // Une ligne qui n'est pas la première, avec un niveau déjà choisi : l'ancien niveau doit s'éteindre, et elle seule change.
  await page.evaluate(async ({ note }) => { const io = await import('/js/io.js'); await io.enregistrer('notes', note); },
    { note: { id: 'v_a', evaluationId: 'v', eleveId: 'a', valeur: 0, detail: { [g.criteres[1].id]: g.niveaux[1].cle }, commentaire: '' } });
  await page.goto('/#/grilles/saisie/v');
  await expect(case_(page, 1, 1)).toHaveAttribute('aria-pressed', 'true');
  const pendant = await page.evaluate(() => {
    const blocs = document.querySelectorAll('.grille-critere');
    const cases = (i) => [...blocs[i].querySelectorAll('.grille-niveaux button[data-niveau-cle]')];
    const b = cases(1)[3];
    b.click();
    return {
      desactives: [...document.querySelectorAll('#vue button, #vue select')].filter((x) => x.disabled).length,
      occupee: b.getAttribute('aria-busy'), presse: b.getAttribute('aria-pressed'), principal: b.classList.contains('btn-principal'),
      ancien: [cases(1)[1].getAttribute('aria-pressed'), cases(1)[1].classList.contains('btn-principal')],
      selection: blocs[1].querySelector('.grille-selection').textContent,
      autreLigne: cases(0).map((x) => x.getAttribute('aria-pressed')), autreSelection: blocs[0].querySelector('.grille-selection').textContent,
      statut: document.querySelector('#vue > .statut').textContent,
    };
  });
  expect(pendant).toEqual({ desactives: 0, occupee: 'true', presse: 'true', principal: true, ancien: ['false', false],
    selection: expect.stringMatching(/^Maîtrisé · /), autreLigne: ['false', 'false', 'false', 'false'], autreSelection: 'Non évalué', statut: 'Enregistrement…' });
  await expect(statut(page)).toHaveText('Enregistré ✓');
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
});

test('FON-05 — le signal d’écriture se VOIT : case choisie, case effacée, case atteinte au clavier et sélecteur de statut', async ({ page }) => {
  await seed(page);
  await page.goto('/#/grilles/saisie/v');
  // Case choisie : elle devient sélectionnée au tap, et le contour plein de la sélection masquait le pointillé.
  const choisie = await page.evaluate(() => { const b = document.querySelectorAll('.grille-critere')[0].querySelectorAll('.grille-niveaux button[data-niveau-cle]')[3]; b.click(); const s = getComputedStyle(b); return { busy: b.getAttribute('aria-busy'), style: s.outlineStyle, largeur: parseFloat(s.outlineWidth) }; });
  expect(choisie.busy).toBe('true'); expect(choisie.style).toBe('dashed'); expect(choisie.largeur).toBeGreaterThan(0);
  await expect(statut(page)).toHaveText('Enregistré ✓');
  // Case effacée (le geste « retoucher efface »).
  const effacee = await page.evaluate(() => { const b = document.querySelectorAll('.grille-critere')[0].querySelectorAll('.grille-niveaux button[data-niveau-cle]')[3]; b.click(); const s = getComputedStyle(b); return { busy: b.getAttribute('aria-busy'), style: s.outlineStyle, largeur: parseFloat(s.outlineWidth) }; });
  expect(effacee.busy).toBe('true'); expect(effacee.style).toBe('dashed'); expect(effacee.largeur).toBeGreaterThan(0);
  await expect(statut(page)).toHaveText('Enregistré ✓');
  // Case atteinte au clavier : l'anneau de focus plein l'emportait.
  await page.locator('.grille-critere').nth(1).locator('.grille-niveaux button[data-niveau-cle]').nth(0).focus();
  await page.keyboard.press('Tab');
  const clavier = await page.evaluate(() => { const b = document.activeElement; const visible = b.matches(':focus-visible'); b.click(); const s = getComputedStyle(b); return { visible, busy: b.getAttribute('aria-busy'), style: s.outlineStyle }; });
  expect(clavier).toEqual({ visible: true, busy: 'true', style: 'dashed' });
  await expect(statut(page)).toHaveText('Enregistré ✓');
  // Sélecteur de statut ABS / DISP / NN : aucune règle ne le signalait.
  const select = await page.evaluate(() => { const s = document.querySelector('select[aria-label="Statut de l’élève"]'); s.value = 'ABS'; s.dispatchEvent(new Event('change')); return { busy: s.getAttribute('aria-busy'), style: getComputedStyle(s).outlineStyle }; });
  expect(select).toEqual({ busy: 'true', style: 'dashed' });
  await expect(statut(page)).toHaveText('Enregistré ✓');
});

test('FON-05 — fin de rafale : l’écran n’est pas reconstruit, les cases restent en place et le focus reste où l’on est allé', async ({ page }) => {
  await seed(page);
  await page.goto('/#/grilles/saisie/v');
  await page.getByLabel('Mode de saisie').selectOption('critere');
  await expect(page.locator('.grille-critere')).toHaveCount(2);
  await page.evaluate(() => {
    const contenu = document.querySelector('.grille-critere').parentElement;
    window.__retraits = 0;
    new MutationObserver((records) => { if (records.some((r) => r.removedNodes.length)) window.__retraits++; }).observe(contenu, { childList: true });
    window.__cases = [...document.querySelectorAll('.grille-niveaux button[data-niveau-cle]')];
    const blocs = document.querySelectorAll('.grille-critere');
    blocs[0].querySelectorAll('.grille-niveaux button[data-niveau-cle]')[1].click(); // écriture en vol pour Alice…
    window.__ou = blocs[1].querySelectorAll('.grille-niveaux button[data-niveau-cle]')[2];
    window.__ou.focus(); // …pendant qu'on passe au clavier sur la ligne de Bob
  });
  await expect(statut(page)).toHaveText('Enregistré ✓');
  const apres = await page.evaluate(() => ({
    retraits: window.__retraits, casesEnPlace: window.__cases.every((x) => x.isConnected),
    focus: document.activeElement === window.__ou, choix: window.__cases[1].getAttribute('aria-pressed'),
    score: document.querySelectorAll('[data-score-eleve]')[0].textContent,
  }));
  // La reconstruction détachait la case sous le doigt (appui long perdu), sous la souris (clic perdu) et reprenait le focus.
  expect(apres).toEqual({ retraits: 0, casesEnPlace: true, focus: true, choix: 'true', score: expect.stringMatching(/1\/4 critères évalués/) });
});

test('FON-05 — un appui long commencé pendant une écriture ouvre bien la feuille « Ajuster »', async ({ page }) => {
  await seed(page, grilleAjustable([{ id: 'technique', libelle: 'Technique', poids: 1 }, { id: 'placement', libelle: 'Placement', poids: 1 }]));
  await page.goto('/#/grilles/saisie/v');
  await expect(page.locator('.grille-critere')).toHaveCount(2);
  await page.evaluate(() => {
    const blocs = document.querySelectorAll('.grille-critere');
    blocs[0].querySelector('button[data-niveau-cle="bas"]').click(); // écriture en vol
    const cible = blocs[1].querySelector('button[data-niveau-cle="haut"]'), r = cible.getBoundingClientRect();
    cible.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, isPrimary: true, button: 0, pointerType: 'touch', clientX: r.x + 5, clientY: r.y + 5 }));
  });
  await expect(statut(page)).toHaveText('Enregistré ✓');
  // Le minuteur de l'appui long (550 ms) exige que la case soit toujours dans la page : reconstruite, elle ne s'ouvrait jamais.
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('dialog')).toContainText('Placement · Acquis');
  expect(await detailEnBase(page, 'v_a')).toEqual({ technique: 'bas' });
});

test('FON-05 — vue quittée puis rouverte pendant une rafale : l’écran relit l’état final et le tap suivant passe', async ({ page }) => {
  const g = await seed(page);
  await page.goto('/#/grilles/saisie/v');
  await expect(page.locator('.grille-critere')).toHaveCount(4);
  await page.evaluate(() => {
    const blocs = document.querySelectorAll('.grille-critere');
    for (let i = 0; i < 4; i++) blocs[i].querySelectorAll('.grille-niveaux button[data-niveau-cle]')[1].click();
    location.hash = '#/notes/eval/v'; window.dispatchEvent(new HashChangeEvent('hashchange'));
    location.hash = '#/grilles/saisie/v'; window.dispatchEvent(new HashChangeEvent('hashchange'));
  });
  await expect(page.locator('.grille-critere')).toHaveCount(4);
  // La vue rouverte montre les quatre choix (elle a attendu la file partagée avant de lire les notes)…
  for (let i = 0; i < 4; i++) await expect(case_(page, i, 1)).toHaveAttribute('aria-pressed', 'true');
  // …et son tap suivant n'est pas refusé comme venant d'un « autre onglet ».
  await case_(page, 0, 3).click();
  await expect(statut(page)).toHaveText('Enregistré ✓');
  expect((await detailEnBase(page, 'v_a'))[g.criteres[0].id]).toBe(g.niveaux[3].cle);
});

test('FON-05 — une erreur au milieu d’une rafale n’est pas recouverte par le succès suivant, et nomme l’élève', async ({ page }) => {
  const g = await seed(page);
  await page.goto('/#/grilles/saisie/v');
  await pannerNotes(page, ['Disque plein (test)']);
  await tapsRapides(page, [[0, 1], [1, 2]]);
  await expect(page.locator('#vue > .statut-erreur')).toContainText('Non enregistré pour FICTIF Alice (Disque plein (test))');
  // Le tap refusé n'est pas réécrit en douce par l'écriture suivante, et l'écran mis à jour montre la base.
  expect(await detailEnBase(page, 'v_a')).toEqual({ [g.criteres[1].id]: g.niveaux[2].cle });
  await expect(page.locator('.grille-critere').nth(0).locator('.grille-selection')).toHaveText('Non évalué');
  await expect(case_(page, 1, 2)).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.toast')).toHaveCount(0); // vue affichée : le statut suffit, pas de message en double
});

test('FON-05 — par critère, chaque élève en échec est nommé avec SA cause', async ({ page }) => {
  await seed(page);
  await page.goto('/#/grilles/saisie/v');
  await page.getByLabel('Mode de saisie').selectOption('critere');
  await expect(page.locator('.grille-critere')).toHaveCount(2);
  // L'élève « courant » de la vue par élève reste Alice : le nom doit venir de la LIGNE touchée.
  await pannerNotes(page, ['Cause un (test)', 'Cause deux (test)']);
  await tapsRapides(page, [[1, 2], [0, 1]]);
  const message = page.locator('#vue > .statut-erreur');
  await expect(message).toContainText('SECOND Bob (Cause un (test))');
  await expect(message).toContainText('FICTIF Alice (Cause deux (test))');
});

test('FON-05 — passé à l’élève suivant pendant une écriture refusée : l’erreur nomme l’élève en échec', async ({ page }) => {
  await seed(page);
  await page.goto('/#/grilles/saisie/v');
  await pannerNotes(page, ['Disque plein (test)']);
  await page.evaluate(() => {
    document.querySelector('.grille-critere .grille-niveaux button[data-niveau-cle]').click();
    [...document.querySelectorAll('#vue button')].find((b) => b.textContent === 'Élève suivant').click();
  });
  await expect(page.getByRole('heading', { level: 2, name: 'SECOND Bob', exact: true })).toBeVisible();
  await expect(page.locator('#vue > .statut-erreur')).toContainText('Non enregistré pour FICTIF Alice');
  expect(await detailEnBase(page, 'v_a')).toBeNull();
});

test('FON-05 — vue quittée pendant une écriture refusée : l’échec reste visible par un message', async ({ page }) => {
  await seed(page);
  await page.goto('/#/grilles/saisie/v');
  await pannerNotes(page, ['Disque plein (test)'], true);
  await page.evaluate(() => {
    document.querySelector('.grille-critere .grille-niveaux button[data-niveau-cle]').click();
    // Navigation dans la même tâche : le routeur remplace la vue de façon synchrone, avant la fin de l'écriture.
    location.hash = '#/notes'; window.dispatchEvent(new HashChangeEvent('hashchange'));
  });
  await expect(page.locator('.toast').filter({ hasText: 'Non enregistré pour FICTIF Alice' })).toBeVisible();
});

test('FON-05 — « Ajuster » ouvert pendant une écriture : valeur actuelle à jour et focus rendu à la case', async ({ page }) => {
  await seed(page, grilleAjustable());
  await page.goto('/#/grilles/saisie/v');
  const ajuster = page.getByRole('button', { name: 'Ajuster Acquis — Technique', exact: true });
  await ajuster.click();
  await page.getByRole('dialog').getByRole('button', { name: '7', exact: true }).click();
  await expect(statut(page)).toHaveText('Enregistré ✓');
  // Même tâche : retoucher « Acquis » (effacement en vol) puis ouvrir « Ajuster ».
  await page.evaluate(() => {
    const niveau = document.querySelector('.grille-case button[data-niveau-cle="haut"]');
    window.__ajuster = niveau.closest('.grille-case').querySelector('.grille-ajuster');
    niveau.click();
    window.__ajuster.click();
  });
  const feuille = page.getByRole('dialog');
  await expect(feuille).toBeVisible();
  await expect(statut(page)).toHaveText('Enregistré ✓');
  // L'écriture s'est terminée feuille ouverte, sans détacher la case qui l'a ouverte.
  expect(await page.evaluate(() => window.__ajuster.isConnected)).toBe(true);
  // Valeur actuelle : l'effacement voulu est pris en compte, la feuille ne présente plus 7.
  await expect(feuille.locator('button[aria-pressed="true"]')).toHaveText('10');
  await feuille.getByRole('button', { name: '8', exact: true }).click();
  await expect(statut(page)).toHaveText('Enregistré ✓');
  expect(await detailEnBase(page, 'v_a')).toEqual({ technique: { niveau: 'haut', points: 8 } });
  expect(await page.evaluate(() => document.activeElement?.dataset.grilleFocus)).toBe(JSON.stringify(['a', 'technique', 'haut', 'ajuster']));
});

test('FON-05 — un bouton désactivé se distingue visuellement (aucun style :disabled n’existait)', async ({ page }) => {
  await page.goto('/#/sauvegarde');
  const bouton = page.locator('button.btn').first();
  await expect(bouton).toBeVisible();
  const opacite = await bouton.evaluate((b) => { b.disabled = true; return Number(getComputedStyle(b).opacity); });
  expect(opacite).toBeLessThan(1);
});

// ---------------------------------------------------------------- SEC-04 — intégration continue

test('SEC-04 — la CI déclare son jeton en lecture et épingle chaque action par SHA de commit', () => {
  // Fins de ligne indifférentes : core.autocrlf extrait ce fichier en CRLF sur Windows, en LF sur la CI.
  const yml = lire('../../.github/workflows/tests.yml');
  expect(yml).toMatch(/^permissions:\r?\n  contents: read\r?$/m); // bloc de premier niveau, le seul droit accordé
  expect(yml).not.toMatch(/:\s*write\b/);
  const usages = [...yml.matchAll(/^\s*-?\s*uses:\s*(.+)$/gm)].map((m) => m[1].trim());
  expect(usages.length).toBeGreaterThanOrEqual(3);
  for (const u of usages) {
    // owner/repo@<40 hex> suivi du numéro de version lisible en commentaire.
    expect(u, u).toMatch(/^[\w.-]+\/[\w.-]+@[0-9a-f]{40}\s+#\s*v\d+\.\d+\.\d+$/);
  }
});
