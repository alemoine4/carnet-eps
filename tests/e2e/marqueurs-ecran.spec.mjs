// Marqueurs de séance, v0.14.2 « poser et relire » : le geste au gymnase — la feuille « ⋯ » et la rangée de la carte
// d'élève. Contrat : docs/avis/AVIS_FORMAT_MARQUEURS.md (§6.1, §6.2, §7, §11.3 ; §14 réponse 11). Rejoué sur le projet
// mobile (Pixel 7) : la cible n° 1 est Android au pouce. Données INVENTÉES uniquement (« Prenom1 NOM01 »…).
// Règles de preuve (plan v0.14.2, §4.0) : chaque test AFFIRME ses prémisses avant de conclure ; on mesure une RÈGLE
// (inclusion ou disjonction de rectangles, égalité de styles calculés, nombre de nœuds), jamais un nombre de pixels qui
// dépend de la police ; horloge figée sur le pire cas (« mercredi 30 septembre ») dès qu'une mesure d'écran est faite ;
// deux images (`deuxImages`) avant toute mesure, l'observateur de taille tournant au rendu suivant ; gestes au doigt
// (hasTouch + tap) ; taille du texte par le CSSOM, jamais par une balise <style> (la CSP la bloque).

import { test, expect } from '@playwright/test';

test.use({ hasTouch: true });

// Erreurs console et exceptions, écoutées AVANT la première navigation : l'exception d'une vue est rattrapée par
// afficherVue (ui.js) et ne produit QU'un console.error — un pageerror seul ne la verrait pas.
let erreurs = [];
test.beforeEach(async ({ page }) => {
  erreurs = [];
  page.on('console', (m) => { if (m.type() === 'error') erreurs.push(m.text()); });
  page.on('pageerror', (e) => erreurs.push(String(e)));
  await page.goto('/');
  // Base vidée en DÉRIVANT la liste des magasins de io.STORES, jamais par une liste écrite à la main.
  await page.evaluate(async () => {
    const io = await import('/js/io.js');
    await io.ouvrirDB();
    for (const s of io.STORES) await io.vider(s);
  });
});
test.afterEach(() => {
  expect(erreurs, 'aucune erreur console ni exception').toEqual([]);
});

// ---------------------------------------------------------------------------
// Aides (dupliquées par fichier, convention du dépôt — plan v0.14.2, §4.0)
// ---------------------------------------------------------------------------

// Vocabulaire de test : ids EXPLICITES, libellés et codes de l'amorçage (modules/marqueurs.js), plus deux comportements.
const MQ = {
  arb: { id: 'mq-arb', libelle: 'Arbitre', court: 'ARB', genre: 'role', couleur: 'bleu' },
  obs: { id: 'mq-obs', libelle: 'Observateur', court: 'OBS', genre: 'role', couleur: 'violet' },
  coa: { id: 'mq-coa', libelle: 'Coach', court: 'COA', genre: 'role', couleur: 'orange' },
  e1: { id: 'mq-e1', libelle: 'Équipe 1', court: 'E1', genre: 'groupe', couleur: 'rouge' },
  e2: { id: 'mq-e2', libelle: 'Équipe 2', court: 'E2', genre: 'groupe', couleur: 'vert' },
  // Revue v0.14.2, R15 : un code PRÉFIXE d'un autre, même couleur — « E11 » rogné se lisait « E1 ».
  e11: { id: 'mq-e11', libelle: 'Équipe 11', court: 'E11', genre: 'groupe', couleur: 'rouge' },
  rec: { id: 'mq-rec', libelle: 'À recadrer', court: 'REC', genre: 'comportement' },
  bav: { id: 'mq-bav', libelle: 'Bavardage', court: 'BAV', genre: 'comportement' },
  sec: { id: 'mq-sec', libelle: 'Sécurité', court: 'SEC', genre: 'comportement' },
};

// Classe fictive « 6A » (c1) ; élèves e1…eN « Prenom<i> NOM0<i> » ; séquence « sq » SANS dates ; séances à dates FIXES ;
// appels (par défaut : tous « present » sur toutes les séances ; `appels: []` = aucun ; un appel partiel est complété) ;
// vocabulaire par ecrireMarqueur (ids explicites) ; poses par appliquerMarquages ; `brutes` = lignes « marquages » écrites
// telles quelles (orphelins) ; inaptitudes (par défaut TOTALES, certificat, 2020-01-01 → 2099-12-31).
async function peupler(page, {
  eleves = 3, seances = [{ id: 's1', date: '2026-09-14' }, { id: 's2', date: '2026-09-21' }],
  appels = null, vocabulaire = [], poses = [], brutes = [], inaptitudes = [],
} = {}) {
  await page.evaluate(async (d) => {
    const io = await import('/js/io.js');
    await io.enregistrer('classes', { id: 'c1', nom: '6A', archivee: false });
    for (let i = 1; i <= d.eleves; i++) {
      await io.enregistrer('eleves', { id: `e${i}`, classeId: 'c1', nom: `NOM0${i}`, prenom: `Prenom${i}`, actif: true });
    }
    await io.enregistrer('sequences', { id: 'sq', classeId: 'c1', apsa: 'Badminton', nbSeancesPrevu: 5, dateDebut: '', dateFin: '' });
    for (const [n, s] of d.seances.entries()) await io.enregistrer('seances', { numero: n + 1, theme: '', bilan: '', ...s, sequenceId: 'sq' });
    const appels = d.appels ?? d.seances.flatMap((s) => Array.from({ length: d.eleves }, (_, i) => ({ seanceId: s.id, eleveId: `e${i + 1}` })));
    for (const a of appels) {
      await io.enregistrer('appels', { id: `${a.seanceId}_${a.eleveId}`, statut: 'present', minutesRetard: null, commentaire: '', ...a });
    }
    for (const { id, ...m } of d.vocabulaire) await io.ecrireMarqueur(id, m);
    for (const s of d.seances) {
      const ops = d.poses.filter((p) => p.seanceId === s.id).map(({ eleveId, marqueurId }) => ({ eleveId, marqueurId, op: 'poser' }));
      if (ops.length) await io.appliquerMarquages(s.id, ops);
    }
    for (const b of d.brutes) await io.enregistrer('marquages', { id: `${b.seanceId}_${b.eleveId}_${b.marqueurId}`, occurrences: 1, dateAjout: '2026-09-14T10:00:00.000Z', ...b });
    for (const [n, i] of d.inaptitudes.entries()) {
      await io.enregistrer('inaptitudes', { id: `in${n + 1}`, type: 'totale', origine: 'certificat', dateDebut: '2020-01-01', dateFin: '2099-12-31', ...i });
    }
  }, { eleves, seances, appels, vocabulaire, poses, brutes, inaptitudes });
}

// Poses d'un élève sur une séance : liste de marqueurs → { seanceId, eleveId, marqueurId }.
const posesDe = (seanceId, eleveId, ...marqueurs) => marqueurs.map((m) => ({ seanceId, eleveId, marqueurId: m.id }));

// Navigation par le hash (DEUXIÈME rendu : afficherVue rend le focus à #vue en fin de rendu, ui.js) : attend un conteneur
// #vue NEUF qui a reçu le focus — le rendu est TERMINÉ. Pour rouvrir la même séance, passer d'abord par une autre route.
async function naviguer(page, hash) {
  await page.evaluate((h) => { window.__vuePrecedente = document.getElementById('vue'); location.hash = h; }, hash);
  await expect.poll(() => page.evaluate(() => {
    const v = document.getElementById('vue');
    return v !== window.__vuePrecedente && document.activeElement === v;
  })).toBe(true);
}
async function ouvrirAppel(page, seanceId, n) {
  await naviguer(page, `#/appel/${seanceId}`);
  await expect(page.locator('.btn-eleve')).toHaveCount(n);
}
async function rouvrirAppel(page, seanceId, n) {
  await naviguer(page, '#/appel');
  await ouvrirAppel(page, seanceId, n);
}

// Horloge figée sur le pire cas (l'en-tête affiche la date en toutes lettres), relue au rechargement.
async function figerHorloge(page) {
  await page.clock.setFixedTime(new Date('2026-09-30T10:00:00'));
  await page.reload();
}

const deuxImages = (page) => page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
const carteDe = (page, i) => page.locator('.btn-eleve').nth(i - 1);
const rangeeDe = (page, i) => carteDe(page, i).locator('.rang-marqueurs-carte');
const dialogue = (page) => page.locator('dialog.feuille[open]');
const bouton = (page, libelle) => dialogue(page).locator('.btn-marqueur', { hasText: libelle });
// Feuille « ⋯ » de l'élève n° i, ouverte au doigt.
async function feuilleDe(page, i) {
  await carteDe(page, i).locator('.eleve-menu').tap();
  await expect(dialogue(page)).toHaveCount(1);
}
async function fermerFeuille(page) {
  await dialogue(page).getByRole('button', { name: 'Fermer', exact: true }).tap();
  await expect(dialogue(page)).toHaveCount(0);
}
// Fin de rafale : plus aucun bouton en cours d'écriture (aria-busy posé par le tap, retiré en fin de rafale).
const finRafale = (page) => expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
// Région d'annonce de la vue d'appel (lecteur d'écran) ; feuille ouverte, la vue annonce dans celle de la FEUILLE — la
// sienne, sous une modale, est inerte (revue v0.14.2, D1 ; ECR-21).
const annonce = (page) => page.locator('#vue p.sr-only[role="status"]');
const annonceFeuille = (page) => page.locator('dialog.feuille[open] > p.sr-only[role="status"]');

// Magasins relus en entier, triés par identifiant.
const lireTout = (page, magasins) => page.evaluate(async (liste) => {
  const io = await import('/js/io.js');
  const res = {};
  for (const m of liste) res[m] = (await io.tous(m)).sort((a, b) => a.id.localeCompare(b.id));
  return res;
}, magasins);
const lirePoses = async (page) => (await lireTout(page, ['marquages'])).marquages;
const lireAppel = (page, id) => page.evaluate(async (k) => (await import('/js/io.js')).lire('appels', k), id);

// Panne d'écriture : les `fois` prochains put() sur `magasin` lèvent un QuotaExceededError (motif grilles.spec.mjs).
const panne = (page, { magasin = 'marquages', fois = 1 } = {}) => page.evaluate(({ magasin, fois }) => {
  const put = IDBObjectStore.prototype.put;
  window.__panneRestante = fois;
  IDBObjectStore.prototype.put = function (...a) {
    if (this.name === magasin && window.__panneRestante > 0) {
      window.__panneRestante--;
      throw new DOMException('Mémoire pleine (test)', 'QuotaExceededError');
    }
    return put.apply(this, a);
  };
}, { magasin, fois });

// Transaction du PREMIER put() sur `magasin` tenue ouverte par une chaîne de get() jusqu'à `window.__liberer = true` ;
// `window.__tenue` passe à true dès que la chaîne est lancée (l'écriture est alors EN COURS).
const retenirPremierPut = (page, magasin) => page.evaluate((magasin) => {
  const put = IDBObjectStore.prototype.put;
  window.__liberer = false;
  window.__tenue = false;
  IDBObjectStore.prototype.put = function (...a) {
    const r = put.apply(this, a);
    if (this.name === magasin && !window.__tenue) {
      window.__tenue = true;
      const store = this;
      const boucle = () => { if (window.__liberer) return; store.get('__aucun__').onsuccess = boucle; };
      boucle();
    }
    return r;
  };
}, magasin);

// Rectangles et règles de géométrie (tolérance 0,5 px : arrondis du moteur, jamais une marge de mise en page).
const TOL = 0.5;
const inclus = (a, b) => a.g >= b.g - TOL && a.d <= b.d + TOL && a.h >= b.h - TOL && a.b <= b.b + TOL;
const disjoints = (a, b) => a.b <= b.h + TOL || b.b <= a.h + TOL || a.d <= b.g + TOL || b.d <= a.g + TOL;

// État mesuré de chaque carte de la grille (rangée, codes, « +n », pastilles).
const mesurerCartes = (page) => page.evaluate(() => {
  const rect = (n) => { if (!n) return null; const r = n.getBoundingClientRect(); return { g: r.left, d: r.right, h: r.top, b: r.bottom, l: r.width, ht: r.height }; };
  return [...document.querySelectorAll('.btn-eleve')].map((carte) => {
    const rang = carte.querySelector('.rang-marqueurs-carte');
    const code1 = rang.querySelector('[data-mq-rang="1"]');
    const code2 = rang.querySelector('[data-mq-rang="2"]');
    const plus = rang.querySelector('.mq-plus');
    return {
      carte: rect(carte),
      rang: rect(rang),
      info: rect(carte.querySelector('.pastille-info')),
      warn: rect(carte.querySelector('.pastille-warn')),
      premier: rang.firstElementChild?.className ?? null,
      premierRect: rect(rang.firstElementChild),
      reperes: rang.querySelectorAll('.mq-neutre').length,
      codesVisibles: [...rang.querySelectorAll('[data-mq-rang]')].filter((x) => !x.hidden).map((x) => x.textContent),
      code2: code2 ? { masque: code2.hidden, rect: rect(code2) } : null,
      code1Rogne: code1 ? code1.scrollWidth > code1.clientWidth + 1 : null,
      plus: plus.hidden ? 0 : Number(plus.textContent.replace('+', '')),
    };
  });
});

// Rangées de la grille lues dans l'état d'affichage COURANT (revue v0.14.2, D4, R15, R16 : réponse 11 appliquée strictement) —
// ce qui est VU, jamais le texte du DOM : un code rogné au bord de la rangée gardait tout son texte (« E11 » vu « E1 »). Chaque
// rangée est amenée au centre de l'écran (ni l'en-tête ni la barre d'appel ne la couvrent) ; puis, pour chaque enfant AFFICHÉ
// (repère, code, « +n ») : sa boîte est dans la rangée, qui rogne, et chacun de ses caractères a un rectangle de Range dans sa
// boîte et dans la rangée, avec l'élément au premier plan en son centre. Ce qui a cédé suit l'ordre de D4 : le 2e code, le 1er,
// puis les repères au-delà du premier, en partant de la fin (le premier ne cède jamais). Et rien n'a cédé pour rien : le
// DERNIER élément masqué, réaffiché avec le « +n » d'avant, fait déborder la rangée — état rendu à l'identique dans la même
// tâche (aucune image n'est rendue entre les deux ; la taille de la rangée ne dépend pas de son contenu).
const lireRangees = (page) => page.evaluate(() => {
  const TOL = 0.5;
  const R = (n) => { const r = n.getBoundingClientRect(); return { g: r.left, d: r.right, h: r.top, b: r.bottom }; };
  const dans = (a, b) => a.g >= b.g - TOL && a.d <= b.d + TOL && a.h >= b.h - TOL && a.b <= b.b + TOL;
  const affiches = (rang) => [...rang.children].filter((x) => !x.hidden && !x.classList.contains('sr-only'));
  return [...document.querySelectorAll('.btn-eleve')].map((carte) => {
    const rang = carte.querySelector('.rang-marqueurs-carte');
    rang.scrollIntoView({ block: 'center', behavior: 'instant' });
    const rr = R(rang);
    const coupes = [];
    for (const n of affiches(rang)) {
      const boite = R(n);
      const quoi = n.dataset.mqRang ? `code « ${n.textContent} »` : `${n.className} « ${n.textContent} »`;
      if (!(boite.d > boite.g && dans(boite, rr))) { coupes.push(`${quoi} : boîte hors de la rangée`); continue; }
      let total = 0, vus = 0;
      const w = document.createTreeWalker(n, NodeFilter.SHOW_TEXT);
      for (let t = w.nextNode(); t; t = w.nextNode()) {
        for (let i = 0; i < t.length; i++) {
          total++;
          const rg = document.createRange();
          rg.setStart(t, i);
          rg.setEnd(t, i + 1);
          const b = [...rg.getClientRects()].find((x) => x.width > 0);
          if (!b) continue;
          const c = { g: b.left, d: b.right, h: b.top, b: b.bottom };
          const dessus = document.elementFromPoint((c.g + c.d) / 2, (c.h + c.b) / 2);
          // Dans sa boîte en LARGEUR seulement (le rectangle d'un glyphe a la hauteur de la police, plus que `line-height` :
          // celui de « +n », sans remplissage, dépasse sa boîte en hauteur sans être rogné) ; dans la rangée, qui rogne, en entier.
          const dansSaBoite = c.g >= boite.g - TOL && c.d <= boite.d + TOL;
          if (dansSaBoite && dans(c, rr) && dessus && n.contains(dessus)) vus++;
        }
      }
      if (vus < total) coupes.push(`${quoi} : ${vus}/${total} caractères vus`);
    }
    const reperes = [...rang.querySelectorAll('.mq-neutre, .mq-neutre-plus')];
    const codes = [...rang.querySelectorAll('[data-mq-rang]')];
    const plus = rang.querySelector('.mq-plus');
    const ordre = [...codes].reverse().concat(reperes.slice(1).reverse()); // D4 : ce qui cède, dans cet ordre
    const masques = ordre.map((n) => n.hidden);
    const k = masques.lastIndexOf(true);
    let maximal = null;
    if (k >= 0) {
      const n = ordre[k];
      const avant = [plus.hidden, plus.textContent];
      n.hidden = false;
      if (n.dataset.mqRang) { const x = Number(plus.textContent.slice(1)) - 1; plus.hidden = x === 0; plus.textContent = x ? `+${x}` : ''; }
      maximal = affiches(rang).at(-1).getBoundingClientRect().right > rang.getBoundingClientRect().right + 0.01;
      n.hidden = true;
      [plus.hidden, plus.textContent] = avant;
    }
    return {
      coupes,
      ordreOk: masques.every((m, i) => !m || masques.slice(0, i).every(Boolean)),
      maximal,
      premierRepere: reperes.length ? !reperes[0].hidden : null,
      reperesMasques: reperes.filter((x) => x.hidden).length,
      codes: codes.map((x) => (x.hidden ? null : x.textContent)),
      plus: plus.hidden ? 0 : Number(plus.textContent.replace('+', '')),
    };
  });
});

// Ce qui est VU (revue v0.14.2, R21) : au centre de la boîte du nœud, dans la fenêtre, l'élément au premier plan est ce nœud
// ou l'un de ses descendants. `toBeVisible` ne voit pas l'occlusion (une feuille modale recouvre ce qu'il certifie visible).
const auPremierPlan = (locator) => locator.evaluate((n) => {
  const r = n.getBoundingClientRect();
  const x = r.left + r.width / 2, y = r.top + r.height / 2;
  const dansFenetre = r.width > 0 && r.height > 0 && x >= 0 && y >= 0 && x <= innerWidth && y <= innerHeight;
  const dessus = dansFenetre ? document.elementFromPoint(x, y) : null;
  return { dansFenetre, auPremierPlan: Boolean(dessus && n.contains(dessus)), dessus: dessus ? `${dessus.tagName}.${dessus.className}` : null };
});
// Ce qui est ENTENDU (revue v0.14.2, R11, R22) : l'arbre d'accessibilité de Chromium (celui de Chrome Android), lu par CDP —
// jamais le texte du DOM seul : une feuille ouverte par showModal() rend le reste du document INERTE, et ni `getByRole` ni
// `ariaSnapshot` de Playwright ne le voient. Pour un texte : un nœud de texte NON ignoré le porte-t-il, et a-t-il pour ancêtre
// une région `status` non ignorée (ce qu'un lecteur d'écran annonce) ?
async function arbreAccessible(page) {
  const cdp = await page.context().newCDPSession(page);
  return async (texte) => {
    const { nodes } = await cdp.send('Accessibility.getFullAXTree');
    const parId = new Map(nodes.map((n) => [n.nodeId, n]));
    const porteurs = nodes.filter((n) => n.role?.value === 'StaticText' && !n.ignored && (n.name?.value || '').includes(texte));
    const dansRegion = porteurs.some((n) => {
      for (let p = parId.get(n.parentId); p; p = parId.get(p.parentId)) if (p.role?.value === 'status' && !p.ignored) return true;
      return false;
    });
    return { entendu: porteurs.length > 0, dansRegion };
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test('ECR-01 — feuille « ⋯ » : poser puis retirer sans toucher au statut ni fermer la feuille ; deux taps rapides donnent pose puis retrait ; une vue périmée pose bien', async ({ page }) => {
  await peupler(page, { vocabulaire: [MQ.arb, MQ.coa] });
  const appelAvant = await lireAppel(page, 's1_e1');
  expect(appelAvant?.statut).toBe('present'); // prémisse : e1 est appelé
  await ouvrirAppel(page, 's1', 3);
  await expect(carteDe(page, 1).locator('.detail-txt')).toHaveText('Présent');
  await feuilleDe(page, 1);
  // La zone des marqueurs est ENTRE « Minutes de retard » et le commentaire (§6.2) : après le statut, avant le texte libre.
  const ordre = await dialogue(page).evaluate((d) => {
    const suit = (a, b) => Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
    const minutes = d.querySelector('#ap-minutes');
    const zone = d.querySelector('.btn-marqueur');
    const comm = d.querySelector('input[aria-label="Commentaire"]');
    return { presents: Boolean(minutes && zone && comm), apresMinutes: suit(minutes, zone), avantCommentaire: suit(zone, comm) };
  });
  expect(ordre).toEqual({ presents: true, apresMinutes: true, avantCommentaire: true });

  // Phase 1 — deux taps sur « Arbitre », le second PENDANT l'écriture du premier : pose puis retrait (règle n° 2).
  const arbitre = bouton(page, 'Arbitre');
  await expect(arbitre).toHaveAttribute('aria-pressed', 'false');
  await retenirPremierPut(page, 'marquages');
  await arbitre.tap();
  await expect.poll(() => page.evaluate(() => window.__tenue)).toBe(true); // prémisse : l'écriture est EN COURS
  await expect(arbitre).toHaveAttribute('aria-pressed', 'true'); // mise à jour optimiste
  await expect(arbitre).toHaveAttribute('aria-busy', 'true'); // rien n'est désactivé : le bouton reste tapable
  await arbitre.tap();
  await expect(arbitre).toHaveAttribute('aria-pressed', 'false');
  await page.evaluate(() => { window.__liberer = true; });
  await finRafale(page);
  expect((await lirePoses(page)).map((p) => p.id)).toEqual([]); // la pose a été écrite (transaction tenue), puis retirée
  await expect(arbitre).toHaveAttribute('aria-pressed', 'false');
  await expect(dialogue(page)).toHaveCount(1); // la feuille reste ouverte
  expect(await lireAppel(page, 's1_e1')).toEqual(appelAvant); // le statut n'a pas bougé
  await expect(carteDe(page, 1).locator('.detail-txt')).toHaveText('Présent');

  // Phase 2 — vue périmée (M17) : « Coach » est posé derrière la vue ; le tap veut POSER, la ligne reste.
  await page.evaluate(async () => (await import('/js/io.js')).appliquerMarquages('s1', [{ eleveId: 'e1', marqueurId: 'mq-coa', op: 'poser' }]));
  expect((await lirePoses(page)).map((p) => p.id)).toEqual(['s1_e1_mq-coa']); // prémisse : en base
  const coach = bouton(page, 'Coach');
  await expect(coach).toHaveAttribute('aria-pressed', 'false'); // prémisse : l'écran ne le sait pas
  await coach.tap();
  await finRafale(page);
  expect((await lirePoses(page)).map((p) => p.id)).toEqual(['s1_e1_mq-coa']);
  await expect(coach).toHaveAttribute('aria-pressed', 'true');
  expect(await lireAppel(page, 's1_e1')).toEqual(appelAvant);
});

test('ECR-07 — deux codes puis « +2 » sur les données ; le nom accessible les nomme tous ; l’ordre suit les genres, jamais l’alphabet seul, l’usage récent ni l’ordre de lecture ; un orphelin après les connus de son genre ; sous contrainte, « +n » compte le code masqué', async ({ page }) => {
  await figerHorloge(page);
  // Ids INVERSÉS (l'ordre du magasin n'est pas celui de la carte) ; « Équipe 1 » précède « Observateur » dans l'alphabet
  // français, mais un rôle passe avant une équipe (addendum A2) ; l'orphelin de rôle « marqueur supprimé (ZZ) » précède
  // « Observateur » dans l'alphabet, mais il passe APRÈS les rôles connus (plan C8).
  const obs = { ...MQ.obs, id: 'z-obs' };
  const e1 = { ...MQ.e1, id: 'x-e1' };
  const e2 = { ...MQ.e2, id: 'w-e2' };
  await peupler(page, {
    vocabulaire: [obs, e1, e2],
    poses: posesDe('s1', 'e1', e2, e1, obs),
    brutes: [{ seanceId: 's1', eleveId: 'e1', marqueurId: 'a-orph', courtSecours: 'ZZ', genreSecours: 'role' }],
  });
  // « Derniers utilisés » dans l'ordre inverse de la carte : la carte ne doit pas les suivre.
  await page.evaluate(() => localStorage.setItem('carnet-eps:prefs', JSON.stringify({ theme: 'auto', marqueursRecents: ['w-e2', 'x-e1', 'a-orph', 'z-obs'] })));
  await page.reload();
  // Prémisses : quatre lignes en base (lues dans l'ordre des clés : orphelin, E2, E1, OBS) ; l'alphabet seul donnerait
  // un autre ordre que les genres.
  expect((await lirePoses(page)).map((p) => p.marqueurId)).toEqual(['a-orph', 'w-e2', 'x-e1', 'z-obs']);
  expect(await page.evaluate(() => ['Équipe 1', 'marqueur supprimé (ZZ)'].map((x) => Math.sign(x.localeCompare('Observateur', 'fr')))))
    .toEqual([-1, -1]);

  // Largeur sans contrainte : une colonne, la carte a toute la place.
  await page.setViewportSize({ width: 300, height: 800 });
  await ouvrirAppel(page, 's1', 3);
  await deuxImages(page);
  const rang = rangeeDe(page, 1);
  await expect(rang.locator('[data-mq-rang][hidden]')).toHaveCount(0); // prémisse : aucun code masqué
  expect(await rang.locator('[data-mq-rang]').allTextContents()).toEqual(['OBS', 'ZZ']);
  await expect(rang.locator('[data-mq-rang="2"]')).toHaveAttribute('data-mq-orphelin', '');
  await expect(rang.locator('[data-mq-rang="2"]')).not.toHaveAttribute('data-niveau-couleur');
  await expect(rang.locator('[data-mq-rang="1"]')).toHaveAttribute('data-niveau-couleur', 'violet'); // témoin : un code connu a sa couleur
  await expect(rang.locator('.mq-plus')).toBeVisible();
  await expect(rang.locator('.mq-plus')).toHaveText('+2');
  await expect(rang.locator('.sr-only')).toHaveText('Marqueurs : Observateur, marqueur supprimé (ZZ), Équipe 1, Équipe 2');

  // Contrainte : 320 px et 200 % de texte, sans rechargement (l'observateur de taille réajuste).
  await page.setViewportSize({ width: 320, height: 640 });
  await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
  await deuxImages(page);
  await expect(rang.locator('[data-mq-rang="2"]')).toBeHidden(); // prémisse : la branche « masqué » est exercée
  const m = (await mesurerCartes(page))[0];
  // Ce qui reste affiché garde l'ordre de la carte (le 1er code peut aussi céder : revue v0.14.2, D4 — ECR-09 dit quand) ;
  // tout ce qui n'est pas affiché est compté par « +n » : 1 + 3, ou 0 + 4.
  expect(m.codesVisibles).toEqual(['OBS', 'ZZ'].slice(0, m.codesVisibles.length));
  expect(m.codesVisibles.length).toBeLessThan(2);
  expect(m.codesVisibles.length + m.plus).toBe(4);
  await expect(rang.locator('.sr-only')).toHaveText('Marqueurs : Observateur, marqueur supprimé (ZZ), Équipe 1, Équipe 2');
});

test('ECR-08 — un comportement : aucun code, un repère neutre identique pour tous, boîte non nulle, encre pleine dans les deux thèmes ; compté sans être nommé ; le code d’un rôle en encre pleine', async ({ page }) => {
  await peupler(page, {
    vocabulaire: [MQ.arb, MQ.rec, MQ.bav],
    poses: [...posesDe('s1', 'e1', MQ.arb, MQ.rec), ...posesDe('s1', 'e2', MQ.rec), ...posesDe('s1', 'e3', MQ.bav)],
  });
  await ouvrirAppel(page, 's1', 3);
  const couleurs = {};
  for (const theme of ['light', 'dark']) {
    await page.emulateMedia({ colorScheme: theme });
    await deuxImages(page);
    const m = await page.evaluate(() => {
      const cartes = [...document.querySelectorAll('.btn-eleve')];
      const sonde = document.createElement('span');
      sonde.style.color = 'var(--c-texte-2)'; // CSSOM : aucune balise <style> (CSP)
      document.body.append(sonde);
      const attenuee = getComputedStyle(sonde).color;
      sonde.remove();
      const repere = (c) => {
        const n = c.querySelector('.rang-marqueurs-carte .mq-neutre');
        if (!n) return null;
        const r = n.getBoundingClientRect(), s = getComputedStyle(n);
        return { l: r.width, h: r.height, fond: s.backgroundColor, forme: s.borderRadius };
      };
      const code = cartes[0].querySelector('.rang-marqueurs-carte .mq-code');
      return {
        encre: getComputedStyle(document.body).color, attenuee,
        codes: cartes.map((c) => c.querySelectorAll('.rang-marqueurs-carte .mq-code').length),
        reperes: cartes.map((c) => c.querySelectorAll('.rang-marqueurs-carte .mq-neutre').length),
        e1: repere(cartes[0]), e2: repere(cartes[1]), e3: repere(cartes[2]),
        codeE1: code ? { texte: code.textContent, couleur: getComputedStyle(code).color, l: code.getBoundingClientRect().width } : null,
      };
    });
    couleurs[theme] = m.encre;
    // e1 porte un rôle (témoin : sans lui, « aucun code » serait vrai d'une carte vide) et un comportement.
    expect(m.codes).toEqual([1, 0, 0]);
    expect(m.reperes).toEqual([1, 1, 1]);
    expect(m.codeE1.texte).toBe('ARB');
    expect(m.codeE1.l).toBeGreaterThan(0);
    expect(m.codeE1.couleur).toBe(m.encre); // le texte du code est en encre PLEINE (§7 point 2)
    // Deux comportements DIFFÉRENTS (À recadrer, Bavardage) : même repère, taille réelle, encre pleine.
    expect(m.e2.l).toBeGreaterThan(0);
    expect(m.e2.h).toBeGreaterThan(0);
    expect(m.e3).toEqual(m.e2);
    expect(m.e1).toEqual(m.e2);
    expect(m.e2.fond).toBe(m.encre);
    expect(m.attenuee).not.toBe(m.encre); // prémisse : l'encre atténuée se distingue bien de l'encre pleine
  }
  expect(couleurs.light).not.toBe(couleurs.dark); // prémisse : les deux thèmes ont bien été rendus
  // Compté, jamais nommé (décision 10).
  await expect(rangeeDe(page, 1).locator('.sr-only')).toHaveText('Marqueurs : Arbitre · 1 comportement noté');
  await expect(rangeeDe(page, 1).locator('.sr-only')).not.toContainText('À recadrer');
  await expect(rangeeDe(page, 3).locator('.sr-only')).toHaveText('Marqueurs : 1 comportement noté');
});

// Revue adversariale de la v0.14.2 (2026-09-28), arbitrage D4 (R15, R16) : la réponse 11 appliquée STRICTEMENT — aucun code
// n'est jamais affiché rogné. Le 1er code rétrécissait sans aucune marque : « E11 » se lisait « E1 », le code d'une autre équipe
// existante (R15) ; « ARB » tombait à une boîte vide et le chiffre de « +n » sortait de la rangée (R16). L'ancienne preuve
// comptait d'après le texte du DOM et ne voyait rien. Désormais, un code qui ne tient pas EN ENTIER (texte et bordure) disparaît
// et « +n » le compte ; sous contrainte cèdent, dans cet ordre, le 2e code, le 1er code, puis les repères au-delà du premier ;
// le premier repère et « +n » restent entiers. Preuve sur ce qui est VU (lireRangees), à 320 et 360 px, à 100, 130 et 200 % de
// texte, sous la police locale et sous Verdana (doublure de la police de l'intégration continue), sans rechargement.
test('ECR-09 — 320 et 360 px, 100, 130 et 200 %, deux polices, sans rechargement : rangée sans recouvrement ni débordement, même sur une carte étirée ; aucun code affiché rogné (E1 / E11) : ce qui ne tient pas disparaît dans l’ordre de la réponse 11 et « +n », entier, le compte ; le repère en tête et entier', async ({ page }) => {
  await figerHorloge(page);
  await page.setViewportSize({ width: 320, height: 640 });
  const s = [{ id: 's1', date: '2026-09-07' }, { id: 's2', date: '2026-09-14' }, { id: 's3', date: '2026-09-21' }, { id: 's4', date: '2026-09-28' }];
  const eleves = ['e1', 'e2', 'e3', 'e4', 'e5', 'e6', 'e7', 'e8'];
  await peupler(page, {
    eleves: 8,
    seances: s,
    // Trois oublis de tenue (⚠) avant la séance mesurée, où tous sont présents.
    appels: eleves.flatMap((e) => [...['s1', 's2', 's3'].map((x) => ({ seanceId: x, eleveId: e, statut: 'oubli_tenue' })), { seanceId: 's4', eleveId: e }]),
    inaptitudes: eleves.map((e) => ({ eleveId: e })), // 🩺
    vocabulaire: [MQ.arb, MQ.coa, MQ.e1, MQ.e2, MQ.e11, MQ.rec, MQ.bav, MQ.sec],
    poses: [
      ...posesDe('s4', 'e1', MQ.arb, MQ.rec), // un rôle + un comportement
      ...posesDe('s4', 'e2', MQ.arb, MQ.e2, MQ.rec), // un rôle + une équipe + un comportement (R16)
      ...posesDe('s4', 'e3', MQ.arb, MQ.coa, MQ.e1, MQ.e2, MQ.rec, MQ.bav, MQ.sec), // le pire cas du contrat
      ...posesDe('s4', 'e4', MQ.e1, MQ.e2), // deux codes courts, sans comportement (addendum A1)
      // R15 : « E11 » et le vrai « E1 », même couleur, mêmes comportements (deux, puis trois).
      ...posesDe('s4', 'e5', MQ.e11, MQ.rec, MQ.bav),
      ...posesDe('s4', 'e6', MQ.e1, MQ.rec, MQ.bav),
      ...posesDe('s4', 'e7', MQ.e11, MQ.rec, MQ.bav, MQ.sec),
      ...posesDe('s4', 'e8', MQ.e1, MQ.rec, MQ.bav, MQ.sec),
    ],
  });
  // e2 porte un nom composé (fictif) qui prend une ligne de plus : sa voisine e1, sur la même ligne de grille, est ÉTIRÉE.
  // C'est le cas où 🩺 et ⚠, ancrés au bas de la carte, chevauchaient la rangée restée sous le statut.
  await page.evaluate(async () => (await import('/js/io.js')).enregistrer('eleves', { id: 'e2', classeId: 'c1', nom: 'NOM02 NOM02BIS', prenom: 'Prenom2', actif: true }));
  // N = rôles et équipes posés, relus en base.
  const N = await page.evaluate(async (ids) => {
    const io = await import('/js/io.js');
    const genre = new Map((await io.tous('marqueurs')).map((m) => [m.id, m.genre]));
    const n = {};
    for (const p of await io.parIndex('marquages', 'seanceId', 's4')) if (genre.get(p.marqueurId) !== 'comportement') n[p.eleveId] = (n[p.eleveId] || 0) + 1;
    return ids.map((e) => n[e] || 0);
  }, eleves);
  expect(N).toEqual([1, 2, 4, 2, 1, 1, 1, 1]);
  await ouvrirAppel(page, 's4', 8);
  await deuxImages(page);

  // Cartes à un seul rôle ou équipe (aucun 2e code), à deux ou plus, et cartes qui portent au moins un comportement.
  const UN_CODE = [0, 4, 5, 6, 7], DEUX_CODES = [1, 2, 3], A_COMPORTEMENT = [0, 1, 2, 4, 5, 6, 7];
  const verifier = (mesures, cas) => {
    for (const [i, m] of mesures.entries()) {
      const qui = `${cas}, e${i + 1}`;
      expect(m.info && m.warn, `${qui} : 🩺 et ⚠ présents`).toBeTruthy();
      expect(m.info.l * m.info.ht, `${qui} : 🩺 visible`).toBeGreaterThan(0);
      expect(m.warn.l * m.warn.ht, `${qui} : ⚠ visible`).toBeGreaterThan(0);
      expect(m.codesVisibles.length + m.reperes + m.plus, `${qui} : rangée non vide`).toBeGreaterThan(0);
      // (i) ni 🩺 ni ⚠ ne recouvrent la rangée ; (ii) la rangée reste dans la carte.
      expect(disjoints(m.rang, m.info), `${qui} : rangée / 🩺`).toBe(true);
      expect(disjoints(m.rang, m.warn), `${qui} : rangée / ⚠`).toBe(true);
      expect(inclus(m.rang, m.carte), `${qui} : rangée dans la carte`).toBe(true);
      // (v) ce qui n'est pas affiché est compté : TOUS les rôles et équipes masqués (D4).
      expect(m.codesVisibles.length + m.plus, `${qui} : codes affichés + n`).toBe(N[i]);
    }
    // (iv) le 2e code est entier ou absent ; (vi) s'il est là, le 1er est entier aussi.
    for (const i of UN_CODE) expect(mesures[i].code2, `${cas}, e${i + 1} : un seul code`).toBeNull();
    for (const i of DEUX_CODES) {
      const m = mesures[i], qui = `${cas}, e${i + 1}`;
      expect(m.code2, `${qui} : un 2e code existe`).not.toBeNull();
      expect(m.code2.masque || inclus(m.code2.rect, m.rang), `${qui} : 2e code entier ou absent`).toBe(true);
      expect(m.code2.masque || m.code1Rogne === false, `${qui} : 2e code seulement si le 1er est entier`).toBe(true);
    }
    // (iii) le repère d'un comportement passe en premier, entier.
    for (const i of A_COMPORTEMENT) {
      const m = mesures[i];
      expect(m.premier, `${cas}, e${i + 1} : repère en tête`).toBe('mq-neutre');
      expect(m.premierRect.l * m.premierRect.ht).toBeGreaterThan(0);
      expect(inclus(m.premierRect, m.rang), `${cas}, e${i + 1} : repère entier`).toBe(true);
    }
  };
  const nomsHauts = () => page.locator('.btn-eleve .nom-e').evaluateAll((l) => l.slice(0, 2).map((n) => n.getBoundingClientRect().height));

  // Balayage SANS rechargement : chaque pas change la largeur ou la taille du texte — c'est l'observateur de taille qui
  // réajuste chaque rangée (un changement de police seul ne change pas la taille de la rangée : il précède toujours un tel pas).
  const vu = new Map();
  for (const police of ['', 'Verdana']) {
    await page.evaluate((f) => { document.body.style.fontFamily = f; }, police);
    for (const largeur of [320, 360]) {
      await page.setViewportSize({ width: largeur, height: 640 });
      for (const taille of ['100%', '130%', '200%']) {
        await page.evaluate((x) => { document.documentElement.style.fontSize = x; }, taille);
        await deuxImages(page);
        const cas = `${police || 'police locale'}, ${largeur} px, ${taille}`;
        expect(await rangeeDe(page, 1).evaluate((n) => getComputedStyle(n).fontFamily), `${cas} : prémisse, la police appliquée`)
          .toContain(police || 'system-ui');
        const cartes = await mesurerCartes(page);
        const noms = await nomsHauts();
        verifier(cartes, cas);
        const rangees = await lireRangees(page);
        for (const [i, m] of rangees.entries()) {
          const qui = `${cas}, e${i + 1}`;
          expect(m.coupes, `${qui} : rien d'affiché n'est rogné (texte et bordure)`).toEqual([]);
          expect(m.ordreOk, `${qui} : ce qui cède suit l'ordre de la réponse 11 (2e code, 1er code, repères au-delà du premier)`).toBe(true);
          expect(m.maximal, `${qui} : rien n'a cédé pour rien`).not.toBe(false);
        }
        for (const i of A_COMPORTEMENT) expect(rangees[i].premierRepere, `${cas}, e${i + 1} : le premier repère ne cède jamais`).toBe(true);
        expect(rangees[3].premierRepere, `${cas}, e4 : aucun repère`).toBeNull();
        // Le pire cas a toujours un « +n » (deux codes au moins au-delà du plafond) : il est donc toujours mesuré entier.
        expect(rangees[2].plus, `${cas}, e3 : « +n » affiché`).toBeGreaterThanOrEqual(2);
        vu.set(cas, { cartes, rangees, noms });
      }
    }
  }

  // Prémisses d'origine, 320 px, police locale : deux cartes sur la première ligne de la grille (320 px garde deux colonnes) ;
  // le nom de e2 est plus haut que celui de e1, qui est donc étirée par sa voisine, à 100 % comme à 200 % ; la carte a grandi.
  const cent = vu.get('police locale, 320 px, 100%'), deuxCents = vu.get('police locale, 320 px, 200%');
  expect(Math.abs(cent.cartes[0].carte.h - cent.cartes[1].carte.h)).toBeLessThan(TOL);
  expect(cent.cartes[1].carte.g).toBeGreaterThan(cent.cartes[0].carte.d);
  expect(cent.noms[1]).toBeGreaterThan(cent.noms[0] + 1);
  expect(deuxCents.noms[1]).toBeGreaterThan(deuxCents.noms[0] + 1);
  expect(deuxCents.cartes[0].carte.ht).toBeGreaterThan(cent.cartes[0].carte.ht);
  for (const p of ['police locale', 'Verdana']) {
    const a = vu.get(`${p}, 320 px, 100%`), b = vu.get(`${p}, 320 px, 200%`);
    // Addendum A1, sous les deux polices : à 100 %, les deux codes courts de e4 TIENNENT (le 2e visible et entier, aucun
    // « +n ») ; à 200 %, le 2e disparaît entier et « +n » compte tout ce qui n'est pas affiché.
    expect(a.rangees[3].codes, `${p} : e4 à 100 %`).toEqual(['E1', 'E2']);
    expect(a.rangees[3].plus).toBe(0);
    expect(inclus(a.cartes[3].code2.rect, a.cartes[3].rang)).toBe(true);
    expect(b.rangees[3].codes[1], `${p} : e4 à 200 %, le 2e code a cédé`).toBeNull();
    expect(b.cartes[2].code2.masque, `${p} : e3 à 200 %, le 2e code a cédé`).toBe(true);
    // R16, 1 rôle + 1 équipe + 1 comportement à 320 px et 200 % : « ARB » ne tient pas en entier à côté du repère — il cède,
    // et la rangée montre « ● +2 », jamais une boîte vide.
    expect(b.rangees[1], `${p} : e2 à 200 %`).toMatchObject({ codes: [null, null], plus: 2, premierRepere: true, coupes: [] });
  }
  // Couverture — chaque branche de D4 est exercée au moins une fois sur le balayage (sinon « rien de rogné » serait vrai
  // d'une rangée que l'on viderait) : « E11 » affiché entier ET masqué ; le 1er code cède ; un repère au-delà du premier cède.
  const toutes = [...vu.values()];
  const e11 = toutes.flatMap((x) => [x.rangees[4].codes[0], x.rangees[6].codes[0]]);
  expect(e11.filter((c) => c === 'E11').length, '« E11 » affiché entier au moins une fois').toBeGreaterThan(0);
  expect(e11.filter((c) => c === null).length, '« E11 » masqué au moins une fois').toBeGreaterThan(0);
  expect(toutes.flatMap((x) => x.rangees).filter((r) => r.codes.length && r.codes[0] === null).length, 'le 1er code cède au moins une fois').toBeGreaterThan(0);
  expect(toutes.flatMap((x) => x.rangees).filter((r) => r.reperesMasques > 0).length, 'un repère au-delà du premier cède au moins une fois').toBeGreaterThan(0);
});

test('ECR-10 — la carte ne change pas de hauteur au premier marqueur, à 100 % puis 200 %', async ({ page }) => {
  await figerHorloge(page);
  await page.setViewportSize({ width: 320, height: 640 });
  await peupler(page, { eleves: 1, vocabulaire: [MQ.arb] }); // un seul élève : aucune voisine n'étire la carte
  await ouvrirAppel(page, 's1', 1);
  await expect(rangeeDe(page, 1)).toHaveCount(1); // prémisse : la rangée existe, vide
  const hauteur = async () => { await deuxImages(page); return carteDe(page, 1).evaluate((n) => n.getBoundingClientRect().height); };
  const basculer = async () => {
    await feuilleDe(page, 1);
    await bouton(page, 'Arbitre').tap();
    await finRafale(page);
    await fermerFeuille(page);
  };
  const h0 = await hauteur();
  await basculer();
  await expect(rangeeDe(page, 1).locator('.mq-code')).toHaveText('ARB'); // prémisse : le code est affiché
  const h1 = await hauteur();
  expect(Math.abs(h1 - h0)).toBeLessThan(0.5);
  await basculer(); // retrait
  await expect(rangeeDe(page, 1).locator('.mq-code')).toHaveCount(0);
  await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
  const h2 = await hauteur();
  expect(h2).toBeGreaterThan(h0); // prémisse : le texte a réellement grandi
  await basculer();
  await expect(rangeeDe(page, 1).locator('.mq-code')).toHaveText('ARB');
  const h3 = await hauteur();
  expect(Math.abs(h3 - h2)).toBeLessThan(0.5);
});

test('ECR-12 — la pose ne fait pas défiler l’écran sous le doigt, même quand la barre grandit', async ({ page }) => {
  await figerHorloge(page);
  await page.setViewportSize({ width: 360, height: 640 });
  await peupler(page, { eleves: 20, seances: [{ id: 's1', date: '2026-09-14' }], vocabulaire: [MQ.arb] });
  await ouvrirAppel(page, 's1', 20);
  const cible = 9;
  // Le bas de la carte juste AU-DESSUS de la barre collante.
  await carteDe(page, cible).evaluate((c) => {
    const barre = document.querySelector('.barre-appel');
    window.scrollBy(0, c.getBoundingClientRect().bottom - (barre.getBoundingClientRect().top - 4));
  });
  await deuxImages(page);
  const mesure = () => carteDe(page, cible).evaluate((c) => {
    const r = c.getBoundingClientRect(), b = document.querySelector('.barre-appel').getBoundingClientRect();
    return { y: scrollY, barre: b.height, ecart: b.top - r.bottom, dessous: r.bottom > b.top };
  });
  const avant = await mesure();
  expect(avant.ecart).toBeGreaterThanOrEqual(0); // prémisse : la carte est au-dessus de la barre…
  expect(avant.ecart).toBeLessThan(10); // … tout contre elle
  await feuilleDe(page, cible);
  await panne(page, { fois: 1 });
  await bouton(page, 'Arbitre').tap();
  // Attente de l'échec (la ligne, recouverte par la feuille, n'est pas encore vue : elle est seulement affichée — R21).
  await expect(page.locator('.barre-appel .grille-echec')).toHaveJSProperty('hidden', false);
  await finRafale(page);
  await fermerFeuille(page);
  await deuxImages(page); // le saut fautif arriverait au rendu suivant : le laisser se produire avant de mesurer
  const apres = await mesure();
  expect(apres.barre, 'la barre a bien grandi').toBeGreaterThan(avant.barre);
  expect(apres.dessous, 'la carte touchée est maintenant recouverte par la barre').toBe(true);
  expect(Math.abs(apres.y - avant.y), 'l’écran ne bouge pas sous le doigt').toBeLessThanOrEqual(2);
});

test('ECR-13 — lecture seule : cinq « À recadrer » n’ajoutent aucune alerte', async ({ page }) => {
  await figerHorloge(page);
  const seances = ['2026-09-07', '2026-09-10', '2026-09-14', '2026-09-17', '2026-09-21'].map((date, i) => ({ id: `s${i + 1}`, date }));
  await peupler(page, {
    eleves: 2,
    seances,
    // e1 présent partout ; témoin e2 : trois oublis de tenue.
    appels: seances.flatMap((x, i) => [{ seanceId: x.id, eleveId: 'e1' }, { seanceId: x.id, eleveId: 'e2', statut: i < 3 ? 'oubli_tenue' : 'present' }]),
    vocabulaire: [MQ.rec],
    poses: seances.map((x) => ({ seanceId: x.id, eleveId: 'e1', marqueurId: 'mq-rec' })),
  });
  const poses = await lirePoses(page);
  expect(poses.filter((p) => p.eleveId === 'e1' && p.marqueurId === 'mq-rec').map((p) => p.seanceId)).toEqual(['s1', 's2', 's3', 's4', 's5']); // prémisse
  await ouvrirAppel(page, 's5', 2);
  await expect(rangeeDe(page, 1).locator('.mq-neutre')).toHaveCount(1);
  await expect(carteDe(page, 1).locator('.pastille-warn')).toHaveCount(0);
  await expect(carteDe(page, 2).locator('.pastille-warn')).toHaveCount(1); // témoin : le seuil d'alerte fonctionne
});

test('ECR-14 — l’ordre de la feuille est gelé pour toute la vue ; stockages indisponibles sans effet', async ({ page }) => {
  await peupler(page, { vocabulaire: [MQ.arb, MQ.coa, MQ.obs] });
  await ouvrirAppel(page, 's1', 3);
  const lireFeuille = () => dialogue(page).evaluate((d) => {
    const cadre = d.getBoundingClientRect();
    return [...d.querySelectorAll('.btn-marqueur')].map((b) => {
      const r = b.getBoundingClientRect();
      return { libelle: b.lastElementChild.textContent, x: r.left - cadre.left, y: r.top - cadre.top };
    });
  });
  // (1) Première ouverture : l'ordre du catalogue.
  await feuilleDe(page, 1);
  const premiere = await lireFeuille();
  expect(premiere.map((b) => b.libelle)).toEqual(['Arbitre', 'Coach', 'Observateur']);
  // (2) « Observateur » posé : il devient le plus récent… mais pas dans CETTE vue.
  await bouton(page, 'Observateur').tap();
  await finRafale(page);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('carnet-eps:prefs')).marqueursRecents[0])).toBe('mq-obs'); // prémisse
  await fermerFeuille(page);
  await feuilleDe(page, 2); // e2 ne porte aucune pose : son rendu est comparable à la première ouverture
  const seconde = await lireFeuille();
  expect(seconde.map((b) => b.libelle)).toEqual(['Arbitre', 'Coach', 'Observateur']);
  for (const [i, b] of seconde.entries()) {
    expect(Math.abs(b.x - premiere[i].x), b.libelle).toBeLessThan(TOL);
    expect(Math.abs(b.y - premiere[i].y), b.libelle).toBeLessThan(TOL);
  }
  await fermerFeuille(page);
  // (3) Sortie puis retour : le nouvel ordre s'applique (sinon « gelé » serait vrai d'un ordre qui ne bouge jamais).
  await rouvrirAppel(page, 's1', 3);
  await feuilleDe(page, 1);
  expect((await lireFeuille()).map((b) => b.libelle)).toEqual(['Observateur', 'Arbitre', 'Coach']);

  // (4) localStorage ET sessionStorage inaccessibles (navigation privée stricte, site bloqué) : la pose fonctionne.
  await page.addInitScript(() => {
    for (const nom of ['localStorage', 'sessionStorage']) {
      Object.defineProperty(window, nom, { configurable: true, get() { throw new DOMException('Accès refusé (test)', 'SecurityError'); } });
    }
  });
  await page.reload();
  expect(await page.evaluate(() => ['localStorage', 'sessionStorage'].map((n) => { try { return window[n] && 'accessible'; } catch (e) { return e.name; } })))
    .toEqual(['SecurityError', 'SecurityError']); // prémisse : les deux stockages lèvent bien
  await rouvrirAppel(page, 's1', 3);
  await feuilleDe(page, 1);
  const coach = bouton(page, 'Coach');
  // « Sans effet » veut dire aussi : rien n'est DIT non enregistré. La préférence d'appareil (« derniers utilisés »), seule
  // écriture de ce geste qui touche le stockage, ne se confond jamais avec l'écriture de la pose (revue v0.14.2, R20).
  const rienDitNonEnregistre = async (texteAnnonce) => {
    await expect(page.locator('.toast', { hasText: /enregistré/i })).toHaveCount(0);
    await expect(page.locator('.barre-appel .grille-echec')).toBeHidden();
    await expect(annonceFeuille(page)).toHaveText(texteAnnonce); // feuille ouverte (D1)
  };
  await coach.tap();
  await finRafale(page);
  await expect(coach).toHaveAttribute('aria-pressed', 'true');
  expect((await lirePoses(page)).map((p) => p.id)).toEqual(['s1_e1_mq-coa', 's1_e1_mq-obs']);
  await expect(rangeeDe(page, 1).locator('.mq-code')).toHaveText(['COA', 'OBS']);
  await rienDitNonEnregistre('Coach posé sur Prenom1 NOM01.');
  await coach.tap();
  await finRafale(page);
  await expect(coach).toHaveAttribute('aria-pressed', 'false');
  expect((await lirePoses(page)).map((p) => p.id)).toEqual(['s1_e1_mq-obs']);
  await rienDitNonEnregistre('Coach retiré de Prenom1 NOM01.');
});

test('ECR-15 — vocabulaire vide et séance sans pose : aucune rangée, et l’écran d’appel fonctionne', async ({ page }) => {
  await peupler(page, { eleves: 4, appels: [] });
  const N = await page.evaluate(async () => (await (await import('/js/io.js')).parIndex('eleves', 'classeId', 'c1')).filter((e) => e.actif !== false).length);
  expect(N).toBe(4);
  // Vocabulaire vide : l'écran d'appel est rendu et fonctionne.
  await ouvrirAppel(page, 's1', N);
  await expect(page.locator('#vue')).not.toContainText('Affichage impossible');
  await carteDe(page, 1).locator('.eleve-cycle').tap();
  await expect.poll(async () => (await lireAppel(page, 's1_e1'))?.statut).toBe('absent'); // un tap écrit bien son statut
  await expect(page.locator('.rang-marqueurs-carte')).toHaveCount(0);
  // Un marqueur ARCHIVÉ seulement : toujours aucune rangée (rien ne peut être posé).
  await page.evaluate(async () => {
    const io = await import('/js/io.js');
    await io.ecrireMarqueur('mq-arb', { libelle: 'Arbitre', court: 'ARB', genre: 'role', couleur: 'bleu' });
    await io.ecrireMarqueur('mq-arb', { archivee: true });
  });
  expect((await lireTout(page, ['marqueurs'])).marqueurs.map((m) => [m.id, m.archivee])).toEqual([['mq-arb', true]]); // prémisse
  await rouvrirAppel(page, 's1', N);
  await expect(page.locator('#vue')).not.toContainText('Affichage impossible');
  await expect(page.locator('.rang-marqueurs-carte')).toHaveCount(0);
  // Témoin : un marqueur ACTIF, et chaque carte porte sa rangée.
  await page.evaluate(async () => (await import('/js/io.js')).ecrireMarqueur('mq-coa', { libelle: 'Coach', court: 'COA', genre: 'role', couleur: 'orange' }));
  await rouvrirAppel(page, 's1', N);
  await expect(page.locator('.rang-marqueurs-carte')).toHaveCount(N);
});

test('ECR-16 — posé, non posé et verrouillé se voient sans couleur ni lecteur d’écran', async ({ page }) => {
  await peupler(page, {
    vocabulaire: [MQ.arb, MQ.coa],
    appels: [{ seanceId: 's1', eleveId: 'e1' }, { seanceId: 's1', eleveId: 'e3' }], // e2 SANS appel
    poses: posesDe('s1', 'e1', MQ.arb),
  });
  await ouvrirAppel(page, 's1', 3);
  await feuilleDe(page, 1);
  const arbitre = bouton(page, 'Arbitre');
  const coach = bouton(page, 'Coach');
  await expect(arbitre).toHaveAttribute('aria-pressed', 'true');
  await expect(coach).toHaveAttribute('aria-pressed', 'false');
  // Prémisse : aucun des deux n'a le focus (un anneau de focus serait un autre repère).
  expect(await page.evaluate(() => document.activeElement?.classList.contains('btn-marqueur'))).toBe(false);
  const contour = (l) => l.evaluate((b) => getComputedStyle(b).outlineStyle);
  expect([await contour(arbitre), await contour(coach)]).toEqual(['solid', 'none']);
  await fermerFeuille(page);
  await feuilleDe(page, 2);
  await expect(coach).toHaveAttribute('aria-disabled', 'true'); // prémisse
  const bordure = await coach.evaluate((b) => getComputedStyle(b).borderTopStyle);
  expect(bordure).toBe('dashed');
});

// Revue adversariale de la v0.14.2 (2026-09-28), arbitrage D2 (K3, R05, R10, R17) : la ligne d'échec durable, seule trace
// visible d'une pose perdue une fois la feuille fermée, nomme QUOI et QUI D'ABORD — jamais coupés, la ligne peut tenir sur
// plusieurs lignes — ; seule la cause, à la suite, peut être écourtée (« … ») ; un seul « : ». L'infobulle n'est pas une
// réponse au doigt. Preuve sur les caractères VISIBLES — rectangle de Range entièrement dans la boîte qui les découpe et dans
// la fenêtre, élément au premier plan en son centre —, jamais sur textContent (il est complet même quand l'écran coupe),
// aux largeurs de téléphone, à 100 % et 200 % de texte, sous la police locale et sous Verdana (doublure de DejaVu, police
// de l'intégration continue), appliquée par le CSSOM.
test('ECR-20 — ligne « Non enregistré » : QUOI et QUI d’abord, entiers et visibles à 320, 360 et 412 px, à 100 % et 200 %, sous deux polices ; seule la cause est écourtée', async ({ page }) => {
  await figerHorloge(page);
  const tailleInitiale = page.viewportSize();
  await peupler(page, { vocabulaire: [MQ.arb, MQ.coa] });
  // Noms fictifs de longueur réaliste (prénom et nom composés) : c'est eux que la coupe emportait.
  const long1 = { prenom: 'Anne-Prenomlong', nom: 'FICTIVE-LONGUENOM' };
  const long2 = { prenom: 'Jean-Prenomlong', nom: 'NOMCOMPOSE-FICTIF' };
  await page.evaluate(async ([a, b]) => {
    const io = await import('/js/io.js');
    await io.enregistrer('eleves', { id: 'e1', classeId: 'c1', actif: true, ...a });
    await io.enregistrer('eleves', { id: 'e2', classeId: 'c1', actif: true, ...b });
  }, [long1, long2]);
  await ouvrirAppel(page, 's1', 3);
  const carteNommee = (e) => page.locator(`.btn-eleve[aria-label="${e.prenom} ${e.nom}"]`);
  const echouer = async (eleve, libelle) => {
    await panne(page, { fois: 1 });
    await carteNommee(eleve).locator('.eleve-menu').tap();
    await expect(dialogue(page)).toHaveCount(1);
    await bouton(page, libelle).tap();
    await finRafale(page);
    await fermerFeuille(page);
    expect(await page.evaluate(() => window.__panneRestante)).toBe(0); // prémisse : c'est la panne qui a servi
    // Les toasts passent volontairement DEVANT la barre, quelques secondes (components.css) : la ligne est ce qui reste.
    await page.evaluate(() => { for (const t of document.querySelectorAll('.toasts .toast')) t.remove(); });
  };
  const ligne = page.locator('.barre-appel .grille-echec');
  // Caractères visibles de la ligne, par morceau (QUI, cause), mesurés dans l'état d'affichage courant.
  const mesurer = () => ligne.evaluate((p) => {
    const vus = (noeud, clip) => {
      const c = clip.getBoundingClientRect();
      let total = 0, visibles = 0;
      const w = document.createTreeWalker(noeud, NodeFilter.SHOW_TEXT);
      for (let t = w.nextNode(); t; t = w.nextNode()) {
        for (let i = 0; i < t.length; i++) {
          if (/\s/.test(t.data[i])) continue; // espaces : repliés en fin de ligne, sans boîte propre
          total++;
          const r = document.createRange();
          r.setStart(t, i);
          r.setEnd(t, i + 1);
          const b = [...r.getClientRects()].find((x) => x.width > 0);
          if (!b) continue;
          const dedans = b.left >= c.left - 0.5 && b.right <= c.right + 0.5 && b.top >= c.top - 0.5 && b.bottom <= c.bottom + 0.5
            && b.left >= -0.5 && b.right <= innerWidth + 0.5 && b.top >= -0.5 && b.bottom <= innerHeight + 0.5;
          const dessus = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2);
          if (dedans && dessus && p.contains(dessus)) visibles++;
        }
      }
      return { total, visibles };
    };
    const qui = p.querySelector('.echec-qui');
    const cause = p.querySelector('.echec-cause');
    return {
      texte: p.textContent,
      premier: p.firstElementChild === qui,
      qui: qui ? { texte: qui.textContent, ...vus(qui, p) } : null,
      cause: cause ? { ...vus(cause, cause), coupee: cause.scrollHeight > cause.clientHeight + 1 } : null,
      police: getComputedStyle(p).fontFamily,
    };
  });
  const tailles = [{ width: 320, height: 640 }, { width: 360, height: 640 }, { width: 412, height: 839 }];
  const verifier = async (quiAttendu) => {
    let causeCoupee = false;
    for (const police of ['', 'Verdana']) {
      await page.evaluate((f) => { document.body.style.fontFamily = f; }, police);
      for (const taille of tailles) {
        await page.setViewportSize(taille);
        for (const texte of ['100%', '200%']) {
          await page.evaluate((x) => { document.documentElement.style.fontSize = x; }, texte);
          await deuxImages(page);
          const m = await mesurer();
          const cas = `${police || 'police locale'}, ${taille.width} px, ${texte}`;
          if (police) expect(m.police, `${cas} : prémisse, la police est appliquée`).toContain('Verdana');
          expect(m.qui?.texte, cas).toBe(quiAttendu);
          expect(m.premier, `${cas} : QUI en tête`).toBe(true);
          expect(m.texte.startsWith(`${quiAttendu} — `), cas).toBe(true);
          expect((m.texte.match(/ : /g) || []).length, `${cas} : un seul « : »`).toBe(1);
          expect(m.qui.visibles, `${cas} : QUOI et QUI entiers et visibles`).toBe(m.qui.total);
          expect(m.cause.visibles, `${cas} : la cause commence à l'écran`).toBeGreaterThan(0);
          causeCoupee ||= m.cause.coupee && m.cause.visibles < m.cause.total;
        }
      }
    }
    // Prémisse de couverture : la cause longue (mémoire pleine) est bien écourtée dans au moins un cas — la troncature est
    // exercée, et c'est elle seule qui l'est.
    expect(causeCoupee, 'la cause est écourtée dans au moins un cas').toBe(true);
    await page.evaluate(() => { document.body.style.fontFamily = ''; document.documentElement.style.fontSize = ''; });
    await page.setViewportSize(tailleInitiale);
    await deuxImages(page);
  };
  // Un échec (mémoire pleine : la cause réelle la plus probable, et la plus longue, conseil compris).
  await echouer(long1, 'Coach');
  await verifier(`Non enregistré : Coach pour ${long1.prenom} ${long1.nom}`);
  // Deux échecs, deux élèves aux noms longs : le second élève était le premier emporté par la coupe.
  await echouer(long2, 'Arbitre');
  await verifier(`Non enregistré : Coach pour ${long1.prenom} ${long1.nom}, Arbitre pour ${long2.prenom} ${long2.nom}`);
});

// Revue adversariale de la v0.14.2 (2026-09-28), arbitrage D1 (K1, R11, R21, R22) : la feuille « ⋯ » est ouverte par
// showModal(), qui rend tout le reste du document INERTE. La pile des toasts et la région d'annonce de la vue, recouvertes par
// la feuille, sortaient aussi de l'arbre d'accessibilité : le refus « … choisissez d'abord un statut ci-dessus … », écrit pour
// être lu feuille ouverte, les échecs d'écriture et les annonces de pose n'étaient ni vus ni entendus. Tant qu'une feuille
// modale est ouverte, la pile vit DANS la feuille (en haut, sur le fond : elle ne recouvre pas la feuille et ne prend aucun tap
// à côté d'un message), et la vue d'appel annonce dans la région de la feuille — sauf quand le geste FERME la feuille (un statut
// autre que « Retard ») : elle est fermée avant l'écriture, et l'annonce part dans la région de la vue, qui reste. Vu : l'élément
// au premier plan au centre du toast EST le toast ; entendu : arbre d'accessibilité de Chromium (CDP). Témoin : feuille fermée.
test('ECR-21 — feuille « ⋯ » ouverte : refus, échec et pose sont vus et entendus dans la feuille, sans la recouvrir ; fermée, la vue reprend la main', async ({ page }) => {
  await figerHorloge(page);
  await peupler(page, { vocabulaire: [MQ.arb, MQ.coa], appels: [{ seanceId: 's1', eleveId: 'e1' }, { seanceId: 's1', eleveId: 'e3' }] }); // e2 SANS appel
  await ouvrirAppel(page, 's1', 3);
  const entendu = await arbreAccessible(page);
  const pile = page.locator('.toasts');
  const regionFeuille = dialogue(page).locator('p.sr-only[role="status"]');

  // Témoin, feuille fermée : la vue annonce dans SA région, exposée ; la pile est dans le document.
  await carteDe(page, 3).locator('.eleve-cycle').tap(); // présent → absent
  await expect(annonce(page)).toHaveText('Prenom3 NOM03 : Absent');
  expect(await entendu('Prenom3 NOM03 : Absent')).toEqual({ entendu: true, dansRegion: true });
  expect(await pile.evaluate((p) => p.parentElement === document.body)).toBe(true);

  // (1) Refus « pas encore appelé », feuille de e2 ouverte.
  await feuilleDe(page, 2);
  expect(await dialogue(page).evaluate((d) => d.matches(':modal'))).toBe(true); // prémisse : la feuille est modale…
  expect(await entendu('Prenom3 NOM03 : Absent'), 'prémisse : … et la région de la vue, inerte, n’est plus entendue')
    .toEqual({ entendu: false, dansRegion: false });
  await bouton(page, 'Arbitre').tap({ force: true }); // aria-disabled : Playwright refuse le tap, un doigt le fait
  const refus = page.locator('.toast', { hasText: 'Appel non fait pour Prenom2 NOM02' });
  await expect(refus).toHaveCount(1);
  expect(await auPremierPlan(refus)).toMatchObject({ dansFenetre: true, auPremierPlan: true }); // K1
  expect(await entendu('Appel non fait pour Prenom2 NOM02')).toEqual({ entendu: true, dansRegion: true }); // R11, R22
  await expect(dialogue(page).locator('.toasts .toast', { hasText: 'Appel non fait' })).toHaveCount(1); // la pile vit dans la feuille
  // Le toast ne recouvre pas la feuille (texte à 100 %) : il passe au-dessus d'elle, sur le fond assombri.
  const boites = await refus.evaluate((t) => {
    const r = t.getBoundingClientRect(), d = t.closest('dialog').getBoundingClientRect();
    return { toast: { g: r.left, d: r.right, h: r.top, b: r.bottom }, feuille: { g: d.left, d: d.right, h: d.top, b: d.bottom } };
  });
  expect(disjoints(boites.toast, boites.feuille), JSON.stringify(boites)).toBe(true);
  // Aucun tap n'est pris À CÔTÉ d'un message : entre deux messages, le point touché est le fond (qui ferme la feuille).
  await page.evaluate(() => import('/js/ui.js').then((ui) => { ui.toast('Second message d’essai.'); }));
  const second = page.locator('.toast', { hasText: 'Second message d’essai.' });
  await expect(second).toHaveCount(1);
  const entre = await refus.evaluate((t) => {
    const a = t.getBoundingClientRect(), b = t.nextElementSibling.getBoundingClientRect();
    const x = (Math.max(a.left, b.left) + Math.min(a.right, b.right)) / 2, y = (a.bottom + b.top) / 2;
    const dessus = document.elementFromPoint(x, y);
    return { ecart: b.top - a.bottom, dessus: dessus ? `${dessus.tagName}.${dessus.className}` : null };
  });
  expect(entre.ecart, `prémisse : un écart entre les deux messages ${JSON.stringify(entre)}`).toBeGreaterThan(2);
  expect(entre.dessus, JSON.stringify(entre)).toBe('DIALOG.feuille');
  await second.evaluate((t) => t.remove());
  await fermerFeuille(page);

  // (2) Pose, feuille de e1 : l'annonce va dans la région de la feuille, entendue ; celle de la vue n'est pas touchée.
  await feuilleDe(page, 1);
  await expect(regionFeuille).toHaveCount(1);
  await bouton(page, 'Arbitre').tap();
  await expect(regionFeuille).toHaveText('Arbitre posé sur Prenom1 NOM01.');
  await finRafale(page);
  expect(await entendu('Arbitre posé sur Prenom1 NOM01.')).toEqual({ entendu: true, dansRegion: true });
  await expect(annonce(page)).toHaveText('Prenom3 NOM03 : Absent');

  // (3) Échec d'écriture : annonce de la feuille et toast, vus et entendus pendant que la feuille est ouverte.
  await panne(page, { fois: 1 });
  await bouton(page, 'Coach').tap();
  await finRafale(page);
  expect(await page.evaluate(() => window.__panneRestante)).toBe(0); // prémisse : c'est la panne qui a servi
  await expect(regionFeuille).toHaveText('Coach non enregistré pour Prenom1 NOM01.');
  expect(await entendu('Coach non enregistré pour Prenom1 NOM01.')).toEqual({ entendu: true, dansRegion: true });
  const echec = page.locator('.toast', { hasText: 'Non enregistré : Coach pour Prenom1 NOM01' });
  await expect(echec).toHaveCount(1);
  expect(await auPremierPlan(echec)).toMatchObject({ dansFenetre: true, auPremierPlan: true });
  expect(await entendu('Non enregistré : Coach pour Prenom1 NOM01')).toEqual({ entendu: true, dansRegion: true });
  await expect(dialogue(page).locator('.toasts .toast', { hasText: 'Non enregistré : Coach pour Prenom1 NOM01' })).toHaveCount(1);

  // (4) Feuille fermée : la pile revient au document avec le toast encore affiché, vu et entendu ; la ligne durable, recouverte
  // tant que la feuille était ouverte, est au premier plan une fois les toasts partis (ils passent devant la barre, exprès).
  await fermerFeuille(page);
  // `close()` retire l'attribut `open` tout de suite, l'événement « close » (retrait de la feuille, retour de la pile — un seul
  // événement) arrive à la tâche suivante : attendre la feuille RETIRÉE du document avant de regarder la pile.
  await expect(page.locator('dialog')).toHaveCount(0);
  expect(await pile.evaluate((p) => p.parentElement === document.body)).toBe(true);
  await expect(echec).toHaveCount(1);
  expect(await auPremierPlan(echec)).toMatchObject({ dansFenetre: true, auPremierPlan: true });
  expect(await entendu('Non enregistré : Coach pour Prenom1 NOM01')).toEqual({ entendu: true, dansRegion: true });
  await page.evaluate(() => { for (const t of document.querySelectorAll('.toasts .toast')) t.remove(); });
  const ligne = page.locator('.barre-appel .grille-echec');
  await expect(ligne).toContainText('Coach pour Prenom1 NOM01');
  expect(await auPremierPlan(ligne)).toMatchObject({ dansFenetre: true, auPremierPlan: true });
  await expect(page.locator('dialog p.sr-only[role="status"]')).toHaveCount(0); // plus aucune région de feuille

  // (5) Un statut choisi dans la feuille. « Retard » la garde ouverte (minutes à saisir) : son annonce va dans la région de la
  // feuille, entendue. Un autre statut la ferme — AVANT d'écrire : son annonce part dans la région de la VUE, qui reste, et elle
  // est entendue ; écrite dans la feuille, elle partait avec elle.
  await feuilleDe(page, 3);
  await dialogue(page).getByRole('button', { name: 'Retard', exact: true }).tap();
  await expect(regionFeuille).toHaveText('Prenom3 NOM03 : Retard');
  expect(await entendu('Prenom3 NOM03 : Retard')).toEqual({ entendu: true, dansRegion: true });
  await dialogue(page).getByRole('button', { name: 'Présent', exact: true }).tap();
  await expect(dialogue(page)).toHaveCount(0);
  await expect(annonce(page)).toHaveText('Prenom3 NOM03 : Présent');
  expect(await entendu('Prenom3 NOM03 : Présent')).toEqual({ entendu: true, dansRegion: true });
  await expect.poll(async () => (await lireAppel(page, 's1_e3'))?.statut).toBe('present'); // écrit, comme avant
});

// Arbitrage D5 (R09) : la zone des marqueurs, insérée avant le commentaire (§6.2), repoussait « Fermer » de plusieurs centaines
// de pixels sous le bas de la feuille à 200 % de texte (et le rognait déjà à 100 % sur certains écrans) : il fallait la faire
// défiler à chaque élève. Pied de feuille collant, opaque : « Fermer » est dans la fenêtre et au premier plan à l'ouverture et
// après une pose ; la feuille défile sous lui sans rien cacher — tout en bas, le commentaire est au premier plan, et un contrôle
// atteint au clavier n'est jamais caché sous le pied (2.4.11). La place de la zone ne change pas (ECR-01).
test('ECR-23 — feuille « ⋯ » : « Fermer » visible sans défiler à l’ouverture et après une pose, à 100 % et 200 %, sous deux polices ; le pied collant ne cache rien', async ({ page }) => {
  test.setTimeout(60_000); // huit cas, chacun parcouru au clavier : au-delà des 20 s par défaut sur une machine lente
  await figerHorloge(page);
  const tailleProjet = page.viewportSize();
  await peupler(page, { vocabulaire: [MQ.arb, MQ.obs, MQ.coa, MQ.e1, MQ.e2, MQ.rec] }); // les six marqueurs de l'amorçage
  const vus = (loc) => loc.evaluate((n) => {
    const d = n.closest('dialog').getBoundingClientRect(), r = n.getBoundingClientRect();
    const x = r.left + r.width / 2, y = r.top + r.height / 2;
    const dessus = document.elementFromPoint(x, y);
    return r.top >= Math.max(0, d.top) - 0.5 && r.bottom <= Math.min(innerHeight, d.bottom) + 0.5 && Boolean(dessus && n.contains(dessus));
  });
  const fermer = () => dialogue(page).getByRole('button', { name: 'Fermer', exact: true });
  const debordements = [];
  for (const taille of [tailleProjet, { width: 360, height: 640 }]) {
    await page.setViewportSize(taille);
    for (const police of ['', 'Verdana']) {
      for (const texte of ['100%', '200%']) {
        const cas = `${taille.width}×${taille.height}, ${police || 'police locale'}, ${texte}`;
        await page.evaluate(([f, x]) => { document.body.style.fontFamily = f; document.documentElement.style.fontSize = x; }, [police, texte]);
        await rouvrirAppel(page, 's1', 3);
        await feuilleDe(page, 1);
        await deuxImages(page);
        if (police) expect(await dialogue(page).evaluate((d) => getComputedStyle(d).fontFamily), `${cas} : prémisse, la police est appliquée`).toContain('Verdana');
        // Prémisse du défaut : la feuille défile, et le commentaire (juste avant « Fermer ») est sous son bas visible.
        const etat = await dialogue(page).evaluate((d) => {
          const c = d.querySelector('input[aria-label="Commentaire"]').getBoundingClientRect();
          return { defile: d.scrollHeight > d.clientHeight + 1, commentaireDessous: c.bottom > Math.min(innerHeight, d.getBoundingClientRect().bottom) + 0.5 };
        });
        debordements.push({ cas, texte, ...etat });
        expect(await vus(fermer()), `${cas} : « Fermer » à l'ouverture`).toBe(true);
        // Le pied est opaque, du fond de la feuille : ce qui défile dessous ne se lit pas à travers lui.
        const [fondPied, fondFeuille] = await fermer().evaluate((b) => [getComputedStyle(b.parentElement).backgroundColor, getComputedStyle(b.closest('dialog')).backgroundColor]);
        expect(rgbaDe(fondPied), `${cas} : pied opaque, du fond de la feuille`).toEqual(rgbaDe(fondFeuille));
        expect(rgbaDe(fondFeuille)[3], `${cas} : prémisse, la feuille est opaque`).toBe(1);
        const hautFermer = () => fermer().evaluate((b) => b.getBoundingClientRect().top);
        const fermerOuverture = await hautFermer();
        // Une pose (le bouton est amené dans la fenêtre par le geste) : « Fermer » reste là.
        await bouton(page, 'Arbitre').tap();
        await finRafale(page);
        await deuxImages(page);
        await expect(bouton(page, 'Arbitre')).toHaveAttribute('aria-pressed', 'true');
        expect(await vus(fermer()), `${cas} : « Fermer » après une pose`).toBe(true);
        // Tout en bas, rien n'est caché sous le pied : le commentaire est au premier plan.
        await dialogue(page).evaluate((d) => { d.scrollTop = d.scrollHeight; });
        await deuxImages(page);
        expect(await vus(dialogue(page).locator('input[aria-label="Commentaire"]')), `${cas} : le commentaire, tout en bas`).toBe(true);
        // « Fermer » n'a pas bougé : collé ou revenu à sa place en fin de défilement, le pied finit au même bord.
        expect(Math.abs((await hautFermer()) - fermerOuverture), `${cas} : « Fermer » au même endroit en fin de défilement`).toBeLessThan(TOL);
        // Au clavier, du haut de la feuille jusqu'à « Fermer » : aucun contrôle focalisé n'est caché sous le pied (2.4.11).
        await dialogue(page).evaluate((d) => { d.scrollTop = 0; d.querySelector('button').focus(); });
        const parcourus = [];
        for (let i = 0; i < 20 && parcourus.at(-1) !== 'Fermer'; i++) {
          await page.keyboard.press('Tab');
          await deuxImages(page);
          const f = await page.evaluate(() => {
            const a = document.activeElement, d = a.closest('dialog.feuille');
            const pied = d && [...d.querySelectorAll('button')].find((b) => b.textContent === 'Fermer').parentElement;
            const r = a.getBoundingClientRect(), p = pied?.getBoundingClientRect();
            const nom = a.getAttribute('aria-label') || (a.classList.contains('btn-marqueur') ? a.lastElementChild.textContent : a.textContent);
            return { nom, dansFeuille: Boolean(d), cache: Boolean(d) && !pied.contains(a) && r.bottom > p.top + 0.5 };
          });
          parcourus.push(f.nom);
          expect(f.dansFeuille, `${cas} : le focus reste dans la feuille`).toBe(true);
          expect(f.cache, `${cas} : « ${f.nom} » n'est pas caché sous le pied`).toBe(false);
        }
        expect(parcourus.at(-1), `${cas} : le parcours atteint « Fermer »`).toBe('Fermer');
        expect(parcourus, `${cas} : prémisse, le parcours passe par les marqueurs et le commentaire`).toEqual(expect.arrayContaining(['Arbitre', 'À recadrer', 'Commentaire']));
        await fermerFeuille(page);
        await page.evaluate(async () => (await import('/js/io.js')).appliquerMarquages('s1', [{ eleveId: 'e1', marqueurId: 'mq-arb', op: 'retirer' }]));
      }
    }
  }
  // Prémisse de couverture : à 200 %, la feuille défile et le commentaire est sous son bas dans TOUS les cas — sans pied collant,
  // « Fermer », qui le suit, serait hors de vue.
  expect(debordements.filter((x) => x.texte === '200%').every((x) => x.defile && x.commentaireDessous), JSON.stringify(debordements)).toBe(true);
  await page.evaluate(() => { document.body.style.fontFamily = ''; document.documentElement.style.fontSize = ''; });
  await page.setViewportSize(tailleProjet);
});

// Arbitrage D6 (R25) : le bouton posé passait en gras (700 contre 600) et s'élargissait de quelques pixels — dans la MÊME
// feuille, ses voisins glissaient entre deux taps, et à une largeur limite l'un d'eux passait à la ligne : le tap suivant tombait
// sur un autre marqueur (vocabulaire de l'amorçage compris, texte agrandi). ECR-14 comparait la feuille d'un AUTRE élève. Même
// graisse posé ou non : dans la feuille de l'élève MARQUÉ, à une largeur limite TROUVÉE — celle où élargir d'UN pixel le bouton
// qu'on va poser renverrait un voisin à la ligne (témoin indépendant de la police : sous Verdana, comme sous la police de
// l'intégration continue, 600 et 700 sont la même face grasse), rejoué après la pose —, aucun bouton ne bouge ni ne change de
// largeur d'un tap à l'autre.
// Deux vocabulaires, 100 % et 130 %, police locale et Verdana.
test('ECR-24 — feuille de l’élève marqué : poser ne déplace aucun bouton, à une largeur limite, sous deux polices', async ({ page }) => {
  test.setTimeout(60_000);
  await figerHorloge(page);
  // Fenêtre élargie à 600 px sur les DEUX projets : la recherche de la largeur limite balaie la feuille jusqu'à 560 px. Bornée à la
  // largeur du Pixel 7 (412 px), elle ne trouvait aucune limite sous une police large (celle de l'intégration continue, texte à
  // 130 %) : chaque bouton y occupait sa ligne sur toute la plage, et la prémisse rougissait (CI du 2026-09-30). Jusqu'à 560 px,
  // deux boutons courts partagent une ligne quelle que soit la police : la limite existe, la preuve ne dépend plus de la police.
  await page.setViewportSize({ width: 600, height: 900 });
  const cap = { id: 'mq-cap', libelle: 'Capitaine', court: 'CAP', genre: 'role', couleur: 'rouge' };
  const chr = { id: 'mq-chr', libelle: 'Chronométreur', court: 'CHR', genre: 'role', couleur: 'vert' };
  const vocabulaires = {
    huit: [MQ.arb, cap, chr, MQ.coa, MQ.obs, MQ.e1, MQ.e2, MQ.rec], // constat R25
    amorcage: [MQ.arb, MQ.obs, MQ.coa, MQ.e1, MQ.e2, MQ.rec], // les six marqueurs proposés (réfutateurs de R25)
  };
  // Positions et largeurs des boutons dans la feuille (repère : le contenu de la feuille, indépendant de son défilement), SANS
  // l'enfoncement visuel du doigt (`.btn:active`, scale(0.98), qui reste appliqué au bouton tapé sous l'émulation tactile) : on
  // mesure la mise en page, ce qui peut glisser sous le doigt.
  const positions = () => dialogue(page).evaluate((d) => {
    const c = d.getBoundingClientRect();
    return [...d.querySelectorAll('.btn-marqueur')].map((b) => {
      const t = b.style.transform;
      b.style.transform = 'none';
      const r = b.getBoundingClientRect();
      b.style.transform = t;
      return { libelle: b.lastElementChild.textContent, x: r.left - c.left, y: r.top - c.top + d.scrollTop, l: r.width };
    });
  });
  // Témoin : le bouton `libelle`, élargi d'UN pixel (marge, par le CSSOM), renvoie-t-il un voisin à la ligne ? Rejouable avant ET
  // après la pose : la largeur retenue est bien une largeur limite, où tout élargissement du bouton posé se verrait.
  const saut = (libelle) => dialogue(page).evaluate((d, lib) => {
    const tous = [...d.querySelectorAll('.btn-marqueur')];
    const cible = tous.find((b) => b.lastElementChild.textContent === lib);
    const ys = () => tous.filter((b) => b !== cible).map((b) => b.getBoundingClientRect().top);
    const avant = ys();
    cible.style.marginInlineEnd = '1px';
    const apres = ys();
    cible.style.marginInlineEnd = '';
    return apres.some((y, i) => Math.abs(y - avant[i]) > 10);
  }, libelle);
  // Largeur de feuille (px entiers, la feuille rétrécie par le CSSOM, jusqu'à la largeur de l'écran) et bouton pour lesquels ce
  // témoin est vrai ; null sinon.
  const trouverLargeurLimite = () => dialogue(page).evaluate((d) => {
    const tous = [...d.querySelectorAll('.btn-marqueur')];
    for (let w = 300; w <= Math.min(560, innerWidth); w++) {
      d.style.maxWidth = `${w}px`;
      for (const cible of tous) {
        const ys = () => tous.filter((b) => b !== cible).map((b) => b.getBoundingClientRect().top);
        const avant = ys();
        cible.style.marginInlineEnd = '1px';
        const apres = ys();
        cible.style.marginInlineEnd = '';
        if (apres.some((y, i) => Math.abs(y - avant[i]) > 10)) return { w, libelle: cible.lastElementChild.textContent };
      }
    }
    d.style.maxWidth = '';
    return null;
  });
  for (const [nomVoc, vocabulaire] of Object.entries(vocabulaires)) {
    await page.evaluate(async () => {
      const io = await import('/js/io.js');
      for (const s of io.STORES) await io.vider(s);
    });
    await peupler(page, { vocabulaire });
    for (const police of ['', 'Verdana']) {
      for (const texte of ['100%', '130%']) {
        const cas = `${nomVoc}, ${police || 'police locale'}, ${texte}`;
        await page.evaluate(([f, x]) => { document.body.style.fontFamily = f; document.documentElement.style.fontSize = x; }, [police, texte]);
        await rouvrirAppel(page, 's1', 3);
        await feuilleDe(page, 1);
        if (police) expect(await dialogue(page).evaluate((d) => getComputedStyle(d).fontFamily), `${cas} : prémisse, la police est appliquée`).toContain('Verdana');
        const limite = await trouverLargeurLimite();
        expect(limite, `${cas} : prémisse, une largeur limite existe (un pixel de plus à un bouton y renverrait un voisin à la ligne)`).not.toBeNull();
        const { w: largeur, libelle } = limite;
        const cible = bouton(page, libelle);
        await deuxImages(page);
        const avant = await positions();
        await expect(cible).toHaveAttribute('aria-pressed', 'false');
        await cible.tap();
        await finRafale(page);
        await expect(cible).toHaveAttribute('aria-pressed', 'true');
        await deuxImages(page);
        const apres = await positions();
        expect(apres.map((b) => b.libelle), cas).toEqual(avant.map((b) => b.libelle));
        for (const [i, b] of apres.entries()) {
          expect(Math.abs(b.x - avant[i].x), `${cas}, ${largeur} px, « ${libelle} » posé : ${b.libelle} (x)`).toBeLessThan(TOL);
          expect(Math.abs(b.y - avant[i].y), `${cas}, ${largeur} px, « ${libelle} » posé : ${b.libelle} (y)`).toBeLessThan(TOL);
          expect(Math.abs(b.l - avant[i].l), `${cas}, ${largeur} px, « ${libelle} » posé : ${b.libelle} (largeur)`).toBeLessThan(TOL);
        }
        // Témoin, sur le bouton POSÉ : à cette largeur, un pixel de plus aurait bien renvoyé un voisin à la ligne.
        expect(await saut(libelle), `${cas}, ${largeur} px : témoin, un pixel de plus à « ${libelle} » déplacerait un voisin`).toBe(true);
        await fermerFeuille(page);
        await page.evaluate(async () => {
          const io = await import('/js/io.js');
          await io.appliquerMarquages('s1', (await io.tous('marquages')).map((p) => ({ eleveId: p.eleveId, marqueurId: p.marqueurId, op: 'retirer' })));
        });
      }
    }
  }
  await page.evaluate(() => { document.body.style.fontFamily = ''; document.documentElement.style.fontSize = ''; });
});

// Arbitrage D6 (R12) : la règle de l'état posé (contour 2 px à l'encre) l'emportait sur l'anneau :focus-visible — après une pose
// au clavier, le bouton focalisé devenait identique aux autres boutons posés (WCAG 2.4.7). Sur un bouton posé, l'anneau de focus
// (accent, au-delà du contour de l'état posé, qui reste dessiné) se voit : pixels différents avec et sans le focus, contour calculé
// différent de celui d'un bouton posé sans focus, contraste de l'anneau sur le fond de la feuille ≥ 3:1 — clair et sombre.
test('ECR-25 — clavier : un marqueur posé qui a le focus se distingue des autres posés, anneau contrasté, dans les deux thèmes', async ({ page }) => {
  await peupler(page, { vocabulaire: [MQ.arb, MQ.coa, MQ.e2], poses: posesDe('s1', 'e1', MQ.e2) });
  await ouvrirAppel(page, 's1', 3);
  // Feuille ouverte au clavier (Entrée sur « ⋯ »), puis Tab jusqu'à « Arbitre », non posé.
  await carteDe(page, 1).locator('.eleve-menu').focus();
  await page.keyboard.press('Enter');
  await expect(dialogue(page)).toHaveCount(1);
  const arbitre = bouton(page, 'Arbitre');
  for (let i = 0; i < 12 && !(await arbitre.evaluate((b) => b === document.activeElement)); i++) await page.keyboard.press('Tab');
  await expect(arbitre).toBeFocused();
  expect(await arbitre.evaluate((b) => b.matches(':focus-visible'))).toBe(true); // prémisse : focus CLAVIER
  const contour = (loc) => loc.evaluate((b) => { const s = getComputedStyle(b); return { style: s.outlineStyle, largeur: s.outlineWidth, couleur: s.outlineColor, decalage: s.outlineOffset }; });
  const temoinNonPose = await contour(arbitre); // l'anneau de l'application sur un bouton non posé
  await page.keyboard.press('Space');
  await finRafale(page);
  await expect(arbitre).toHaveAttribute('aria-pressed', 'true');
  expect((await lirePoses(page)).map((p) => p.id)).toEqual(['s1_e1_mq-arb', 's1_e1_mq-e2']); // la pose est faite, au clavier
  const equipe2 = bouton(page, 'Équipe 2');
  await expect(equipe2).toHaveAttribute('aria-pressed', 'true'); // témoin : posé, sans le focus
  const fonds = [];
  for (const theme of ['light', 'dark']) {
    await page.emulateMedia({ colorScheme: theme });
    await arbitre.focus();
    await deuxImages(page);
    await expect(arbitre).toBeFocused();
    expect(await arbitre.evaluate((b) => b.matches(':focus-visible')), `${theme} : prémisse, focus visible`).toBe(true);
    const focalise = await contour(arbitre);
    const pose = await contour(equipe2);
    expect(focalise, `${theme} : posé ET focalisé ≠ posé seul`).not.toEqual(pose);
    expect(focalise.style, theme).toBe('solid');
    // Contraste de l'anneau sur le fond de la feuille (WCAG 1.4.11 : 3:1).
    const m = await arbitre.evaluate((b) => {
      const s = getComputedStyle(b);
      return { anneau: s.outlineColor, fond: getComputedStyle(b.closest('dialog')).backgroundColor, ombre: s.boxShadow, encre: s.color };
    });
    m.ratio = rapport(rgbaDe(m.anneau), composer([m.fond])); // couleurs lues par rgbaDe (plus bas)
    fonds.push(m.fond);
    expect(m.ratio, `${theme} : contraste de l'anneau de focus`).toBeGreaterThanOrEqual(3);
    // Le contour de l'état posé reste dessiné sous l'anneau (ombre à l'encre du bouton).
    expect(m.ombre, `${theme} : contour de l'état posé conservé`).toContain(m.encre);
    // Ce qui se VOIT : les pixels autour du bouton diffèrent avec et sans le focus.
    const boite = await arbitre.boundingBox();
    const clip = { x: boite.x - 10, y: boite.y - 10, width: boite.width + 20, height: boite.height + 20 };
    const avec = await page.screenshot({ clip });
    await arbitre.evaluate((b) => b.blur());
    await deuxImages(page);
    const sans = await page.screenshot({ clip });
    expect(Buffer.compare(avec, sans), `${theme} : le focus se voit sur le bouton posé`).not.toBe(0);
  }
  expect(fonds[0]).not.toBe(fonds[1]); // prémisse : les deux thèmes ont bien été rendus
  expect(temoinNonPose.style).toBe('solid'); // témoin : l'anneau de l'application, avant la pose
  await page.emulateMedia({ colorScheme: null });
});

// Couleurs calculées, lues côté test (revue v0.14.2, D8). Chromium rend `rgb()`/`rgba()`, mais un `color-mix(in srgb, …)` — le
// fond teinté d'un marqueur posé — en `color(srgb r g b)`, composantes de 0 à 1 : lues comme des octets, elles donnaient un fond
// presque noir (« rgb(1, 1, 1) ») et un faux rouge. Toute autre forme fait échouer le test plutôt que de mal lire.
const rgbaDe = (c) => {
  let m = c.match(/^rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)$/);
  if (m) return [+m[1], +m[2], +m[3], m[4] === undefined ? 1 : +m[4]];
  m = c.match(/^color\(srgb ([\d.e-]+) ([\d.e-]+) ([\d.e-]+)(?: \/ ([\d.e-]+))?\)$/);
  if (m) return [m[1] * 255, m[2] * 255, m[3] * 255, m[4] === undefined ? 1 : +m[4]];
  throw new Error(`couleur illisible : ${c}`);
};
// Fond COMPOSÉ vu derrière un nœud : fonds calculés du nœud puis de ses ancêtres, superposés (alpha compris) jusqu'au premier opaque.
const fondsDe = (loc) => loc.evaluate((n) => {
  const fonds = [];
  for (let x = n; x; x = x.parentElement) fonds.push(getComputedStyle(x).backgroundColor);
  return fonds;
});
const composer = (fonds) => {
  const couches = [];
  for (const f of fonds.map(rgbaDe)) { if (f[3] > 0) couches.push(f); if (f[3] >= 1) break; }
  let fond = [255, 255, 255];
  for (const [r, g, b, a] of couches.reverse()) fond = [r * a + fond[0] * (1 - a), g * a + fond[1] * (1 - a), b * a + fond[2] * (1 - a)];
  return fond.map(Math.round);
};
const luminance = (c) => c.slice(0, 3).map((x) => { x /= 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; })
  .reduce((s, x, i) => s + x * [0.2126, 0.7152, 0.0722][i], 0);
const rapport = (c1, c2) => { const [a, z] = [luminance(c1), luminance(c2)].sort((x, y) => y - x); return (a + 0.05) / (z + 0.05); };
// Contraste WCAG du texte d'un nœud sur son fond composé ; rend aussi la couleur du texte et le fond obtenu.
const contrasteDe = async (loc) => {
  const encre = await loc.evaluate((n) => getComputedStyle(n).color);
  const fond = composer(await fondsDe(loc));
  return { ratio: rapport(rgbaDe(encre), fond), encre, fond: `rgb(${fond.join(', ')})` };
};

// Arbitrage D8 (R13) : dans la feuille, le libellé d'un marqueur ARCHIVÉ ou SUPPRIMÉ mais posé — un contrôle actif, seul chemin
// pour retirer la pose — était en encre atténuée sur la teinte de l'état posé : 4,2:1 en clair, sous les 4,5:1 exigés pour un
// texte de 16 px. Posé, il garde son encre atténuée et « aucune couleur » (§7 point 6) : fond non teinté ; l'état posé reste dit
// par le contour. Contraste calculé sur le fond COMPOSÉ (couleurs `color(srgb …)` de `color-mix` lues comme telles) ≥ 4,5:1,
// clair et sombre, libellé et code ; témoin : un marqueur actif posé, dont le fond est bien teinté.
test('ECR-26 — feuille : le libellé d’un marqueur archivé ou supprimé mais posé a un contraste d’au moins 4,5:1, clair et sombre', async ({ page }) => {
  await peupler(page, {
    vocabulaire: [MQ.arb, MQ.obs],
    poses: posesDe('s1', 'e1', MQ.arb, MQ.obs),
    brutes: [{ seanceId: 's1', eleveId: 'e1', marqueurId: 'mq-disparu', courtSecours: 'CHR', genreSecours: 'role' }],
  });
  await page.evaluate(async () => (await import('/js/io.js')).ecrireMarqueur('mq-obs', { archivee: true }));
  await ouvrirAppel(page, 's1', 3);
  await feuilleDe(page, 1);
  const archive = bouton(page, 'Observateur (archivé)');
  const orphelin = bouton(page, 'marqueur supprimé (CHR)');
  const actif = bouton(page, 'Arbitre');
  // Prémisses : des contrôles ACTIFS (posés, non verrouillés, opaques), marqués comme tels.
  for (const [b, attr] of [[archive, 'data-mq-archive'], [orphelin, 'data-mq-orphelin']]) {
    await expect(b).toHaveAttribute(attr, '');
    await expect(b).toHaveAttribute('aria-pressed', 'true');
    await expect(b).not.toHaveAttribute('aria-disabled', 'true');
    expect(await b.evaluate((x) => getComputedStyle(x).opacity)).toBe('1');
  }
  const encres = [];
  for (const theme of ['light', 'dark']) {
    await page.emulateMedia({ colorScheme: theme });
    await deuxImages(page);
    const attenuee = await page.evaluate(() => {
      const s = document.createElement('span');
      s.style.color = 'var(--c-texte-2)'; // CSSOM : aucune balise <style> (CSP)
      document.body.append(s);
      const c = getComputedStyle(s).color;
      s.remove();
      return c;
    });
    encres.push(attenuee);
    for (const [nom, b] of [['archivé', archive], ['supprimé', orphelin]]) {
      const libelle = await contrasteDe(b.locator('span:not(.mq-code)'));
      const code = await contrasteDe(b.locator('.mq-code'));
      expect(libelle.encre, `${theme}, ${nom} : l'encre atténuée est gardée (§7 point 6)`).toBe(attenuee);
      expect(libelle.ratio, `${theme}, ${nom} : libellé ${JSON.stringify(libelle)}`).toBeGreaterThanOrEqual(4.5);
      expect(code.ratio, `${theme}, ${nom} : code ${JSON.stringify(code)}`).toBeGreaterThanOrEqual(4.5);
      expect(await b.evaluate((x) => getComputedStyle(x).outlineStyle), `${theme}, ${nom} : l'état posé reste dit par le contour`).toBe('solid');
    }
    // Témoin : le fond d'un marqueur actif posé est bien la teinte de l'état posé (lue `color(srgb …)`), distincte de la surface.
    const teinte = composer(await fondsDe(actif));
    const surface = composer(await fondsDe(dialogue(page)));
    expect(teinte, `${theme} : témoin, fond teinté du posé actif`).not.toEqual(surface);
    expect((await contrasteDe(actif.locator('span:not(.mq-code)'))).ratio, `${theme} : témoin, marqueur actif posé`).toBeGreaterThanOrEqual(4.5);
  }
  expect(encres[0]).not.toBe(encres[1]); // prémisse : les deux thèmes ont bien été rendus
  await page.emulateMedia({ colorScheme: null });
});

// Arbitrage D8 (R14, R19) : en couleurs forcées (thème de contraste de Windows, sur PC), le navigateur force les fonds à la couleur
// du fond : le repère d'un comportement, dessiné par son seul fond, disparaissait — une carte avec un comportement noté ressemblait
// à une carte vide. Il reste visible, palettes forcées claire ET sombre : fond du repère opaque, contraste ≥ 3:1 sur le fond VU
// derrière lui (fonds de la rangée et de ses ancêtres composés — la carte forcée garde sa transparence : comparer à son seul
// fond calculé, « rgba(255, 255, 255, 0) », ne prouvait rien), et pixels peints distincts de ce fond (capture décodée dans un
// canevas) ; témoin sans couleurs forcées. `emulateMedia({ forcedColors: 'active', colorScheme })`.
test('ECR-27 — couleurs forcées : le repère d’un comportement reste visible sur la carte', async ({ page }) => {
  await peupler(page, {
    vocabulaire: [MQ.arb, MQ.rec],
    poses: [...posesDe('s1', 'e1', MQ.rec), ...posesDe('s1', 'e2', MQ.arb, MQ.rec)],
  });
  await ouvrirAppel(page, 's1', 3);
  // Pixels du repère (boîte + 2 px) qui s'écartent du fond `fond` vu derrière lui, lus sur une capture réelle décodée dans un
  // canevas.
  const pixelsDistincts = async (repere, fond) => {
    const b = await repere.boundingBox();
    const png = await page.screenshot({ clip: { x: b.x - 2, y: b.y - 2, width: b.width + 4, height: b.height + 4 } });
    return page.evaluate(async ([donnees, [r0, g0, b0]]) => {
      const img = new Image();
      img.src = `data:image/png;base64,${donnees}`;
      await img.decode();
      const c = document.createElement('canvas');
      c.width = img.naturalWidth; c.height = img.naturalHeight;
      const ctx = c.getContext('2d');
      ctx.drawImage(img, 0, 0);
      const px = ctx.getImageData(0, 0, c.width, c.height).data;
      let n = 0;
      for (let k = 0; k < px.length; k += 4) if (Math.abs(px[k] - r0) + Math.abs(px[k + 1] - g0) + Math.abs(px[k + 2] - b0) > 60) n++;
      return { distincts: n, total: px.length / 4 };
    }, [png.toString('base64'), fond]);
  };
  const fondsCartes = {};
  for (const couleurs of ['none', 'active']) {
    for (const theme of ['light', 'dark']) {
      const cas = `${couleurs}, ${theme}`;
      await page.emulateMedia({ forcedColors: couleurs, colorScheme: theme });
      await deuxImages(page);
      expect(await page.evaluate(() => matchMedia('(forced-colors: active)').matches), `${cas} : prémisse, couleurs forcées`).toBe(couleurs === 'active');
      for (const i of [1, 2]) {
        const repere = rangeeDe(page, i).locator('.mq-neutre');
        await expect(repere).toHaveCount(1);
        // Le fond VU derrière le repère : celui de la rangée et de ses ancêtres, composés (la carte, forcée, garde sa transparence).
        const fond = composer(await fondsDe(rangeeDe(page, i)));
        fondsCartes[cas] = fond;
        const propre = rgbaDe(await repere.evaluate((n) => getComputedStyle(n).backgroundColor));
        expect(propre[3], `${cas}, carte ${i} : le repère a un fond opaque`).toBe(1);
        // Contraste d'un élément graphique sur son fond (WCAG 1.4.11 : 3:1).
        const r = rapport(propre, fond);
        expect(r, `${cas}, carte ${i} : repère ${JSON.stringify(propre)} sur ${JSON.stringify(fond)}`).toBeGreaterThanOrEqual(3);
        const p = await pixelsDistincts(repere, fond);
        expect(p.distincts, `${cas}, carte ${i} : pixels du repère distincts du fond de la carte ${JSON.stringify(p)}`).toBeGreaterThanOrEqual(20);
      }
    }
  }
  // Prémisse : les deux palettes forcées ont bien été rendues (fonds de carte différents).
  expect(fondsCartes['active, light']).not.toEqual(fondsCartes['active, dark']);
  // Le sens reste dans le nom accessible, compté sans être nommé.
  await expect(rangeeDe(page, 1).locator('.sr-only')).toHaveText('Marqueurs : 1 comportement noté');
  await page.emulateMedia({ forcedColors: 'none', colorScheme: null });
});

// Même arbitrage D1, corrigé pour la CLASSE (ui.js) : toute feuille modale de l'application — confirmation, choix, feuille
// d'observation (même `ouvrirFeuille` que « Ajuster les points » des grilles), visionneuse des pièces — porte la pile des toasts
// tant qu'elle est ouverte et a sa propre région d'annonce ; fermée, la pile revient au document.
test('ECR-22 — toute feuille modale (confirmation, choix, observation, visionneuse) : un toast émis pendant qu’elle est ouverte est vu et entendu, et elle a sa région d’annonce ; fermée, la pile revient au document', async ({ page }) => {
  await figerHorloge(page);
  await peupler(page, { eleves: 1, seances: [], appels: [] });
  const entendu = await arbreAccessible(page);
  const pile = page.locator('.toasts');
  const cas = [
    ['confirmation', () => page.evaluate(async () => { (await import('/js/ui.js')).confirmer({ titre: 'Supprimer l’essai', message: 'Essai.' }); })],
    ['choix', () => page.evaluate(async () => { (await import('/js/ui.js')).choisir({ titre: 'Choisir l’essai', choix: [{ libelle: 'Garder', valeur: 'g' }] }); })],
    ['feuille d’observation', async () => {
      await naviguer(page, '#/eleves/fiche/e1');
      await page.getByRole('button', { name: '+ Observation' }).tap();
    }],
    ['visionneuse', () => page.evaluate(async () => {
      const c = document.createElement('canvas');
      c.width = 60; c.height = 60;
      c.getContext('2d').fillRect(0, 0, 60, 60);
      const blob = await new Promise((r) => c.toBlob(r, 'image/png'));
      (await import('/js/media.js')).ouvrirVisionneuse({ blob, nom: 'essai.png', mime: 'image/png' });
    })],
  ];
  for (const [i, [nom, ouvrir]] of cas.entries()) {
    await ouvrir();
    const dlg = page.locator('dialog[open]');
    await expect(dlg, nom).toHaveCount(1);
    expect(await dlg.evaluate((d) => d.matches(':modal')), `${nom} : prémisse, la feuille est modale`).toBe(true);
    const texte = `Message d’essai ${i + 1} (${nom}).`;
    await page.evaluate((t) => import('/js/ui.js').then((ui) => { ui.toast(t); }), texte);
    const t = page.locator('.toast', { hasText: texte });
    await expect(t, nom).toHaveCount(1);
    expect(await auPremierPlan(t), nom).toMatchObject({ dansFenetre: true, auPremierPlan: true });
    expect(await entendu(texte), nom).toEqual({ entendu: true, dansRegion: true });
    await expect(dlg.locator('.toasts .toast', { hasText: texte }), nom).toHaveCount(1);
    // Sa région d'annonce, dans la feuille, exposée.
    const region = dlg.locator(':scope > p.sr-only[role="status"]');
    await expect(region, nom).toHaveCount(1);
    const texteAnnonce = `Annonce d’essai ${i + 1}.`;
    await region.evaluate((r, x) => { r.textContent = x; }, texteAnnonce);
    expect(await entendu(texteAnnonce), nom).toEqual({ entendu: true, dansRegion: true });
    // Fermée (Échap) : la pile revient au document, le toast y est encore, vu et entendu.
    await page.keyboard.press('Escape');
    await expect(dlg, nom).toHaveCount(0);
    // Fermeture ACHEVÉE : l'attribut `open` part à `close()`, l'événement « close » (retrait de la modale et retour de la pile,
    // dans le même événement) à la tâche suivante — un rouge intermittent sous charge tant qu'on ne l'attendait pas.
    await expect(page.locator('dialog'), nom).toHaveCount(0);
    expect(await pile.evaluate((p) => p.parentElement === document.body), nom).toBe(true);
    expect(await auPremierPlan(t), nom).toMatchObject({ dansFenetre: true, auPremierPlan: true });
    expect(await entendu(texte), nom).toEqual({ entendu: true, dansRegion: true });
    await page.evaluate(() => { for (const x of document.querySelectorAll('.toasts .toast')) x.remove(); });
  }
});
