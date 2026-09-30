// Marqueurs de séance. v0.14.1 « le vocabulaire » : l'écran #/marqueurs (liste, formulaire, archivage),
// l'amorçage des six marqueurs proposés et les doublons lisibles. Contrat : docs/avis/AVIS_FORMAT_MARQUEURS.md
// (§6.5, §11.2 — MQ-12 et MQ-17 ; MQ-18, MQ-19 et MQ-20 ajoutés avec la v0.14.1). v0.14.2 « poser et relire » : la
// pose par la feuille « ⋯ » et la rangée de la carte (MQ-01 à MQ-11, MQ-13, MQ-15, MQ-16, MQ-25, MQ-26), « Terminer
// l'appel » durci (MQ-21, MQ-22), la pose refusée sur une séance ou un élève disparus (MQ-23), les textes provisoires de
// la v0.14.1 retirés (MQ-24). MQ-14 (reprise) arrive avec la v0.14.4 (§13). Données INVENTÉES uniquement.
// Chaque test AFFIRME ses prémisses avant de conclure : une preuve vide ne rougit pas toute seule.

import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';

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

// ---------------------------------------------------------------------------
// Aides de la v0.14.2 « poser et relire » (plan §4.0) — dupliquées par fichier, convention du dépôt.
// ---------------------------------------------------------------------------

// Vocabulaire de test : ids EXPLICITES, libellés, codes et couleurs de l'amorçage (modules/marqueurs.js).
const MQ = {
  arb: { id: 'mq-arb', libelle: 'Arbitre', court: 'ARB', genre: 'role', couleur: 'bleu' },
  obs: { id: 'mq-obs', libelle: 'Observateur', court: 'OBS', genre: 'role', couleur: 'violet' },
  coa: { id: 'mq-coa', libelle: 'Coach', court: 'COA', genre: 'role', couleur: 'orange' },
  e1: { id: 'mq-e1', libelle: 'Équipe 1', court: 'E1', genre: 'groupe', couleur: 'rouge' },
  e2: { id: 'mq-e2', libelle: 'Équipe 2', court: 'E2', genre: 'groupe', couleur: 'vert' },
  rec: { id: 'mq-rec', libelle: 'À recadrer', court: 'REC', genre: 'comportement' },
};

// Classe fictive « 6A » (c1) ; élèves e1…eN, « Prenom<i> NOM0<i> » (donc cet ordre à l'écran) ; séquence « sq » SANS
// dates (active quel que soit le calendrier) ; séances à dates FIXES ; appels (par défaut : tous les élèves « present » sur
// toutes les séances ; `appels: []` = aucun ; un appel partiel est complété : statut « present », pas de retard, commentaire
// vide) ; vocabulaire par ecrireMarqueur (ids explicites) ; poses { seanceId, eleveId, marqueurId } par appliquerMarquages ;
// inaptitudes (par défaut TOTALES, certificat, 2020-01-01 → 2099-12-31).
async function peupler(page, {
  eleves = 3, seances = [{ id: 's1', date: '2026-09-14' }, { id: 's2', date: '2026-09-21' }],
  appels = null, vocabulaire = [], poses = [], inaptitudes = [],
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
    for (const [n, i] of d.inaptitudes.entries()) {
      await io.enregistrer('inaptitudes', { id: `in${n + 1}`, type: 'totale', origine: 'certificat', dateDebut: '2020-01-01', dateFin: '2099-12-31', ...i });
    }
  }, { eleves, seances, appels, vocabulaire, poses, inaptitudes });
}

// Ouvre l'écran d'appel par le hash (DEUXIÈME rendu : afficherVue rend le focus à #vue en fin de rendu, ui.js:45) et attend
// que ce rendu soit TERMINÉ — un conteneur #vue NEUF (afficherVue en crée un à chaque navigation) qui a reçu le focus —, puis
// les n cartes. Attendre les seules cartes pouvait lire celles de la vue précédente (même classe, même nombre d'élèves).
async function ouvrirAppel(page, seanceId, n) {
  await page.evaluate((id) => { window.__vuePrecedente = document.getElementById('vue'); location.hash = `#/appel/${id}`; }, seanceId);
  await expect.poll(() => page.evaluate(() => {
    const v = document.getElementById('vue');
    return v !== window.__vuePrecedente && document.activeElement === v;
  })).toBe(true);
  await expect(page.locator('.btn-eleve')).toHaveCount(n);
}

// Magasins relus en entier, triés par identifiant (comparaisons indépendantes de l'ordre de lecture).
const lireTout = (page, magasins) => page.evaluate(async (liste) => {
  const io = await import('/js/io.js');
  const res = {};
  for (const m of liste) res[m] = (await io.tous(m)).sort((a, b) => a.id.localeCompare(b.id));
  return res;
}, magasins);

// Généralisation d'injecterAvantEcriture : écrit `lignes` ({ magasin: [enregistrements] }) dans une transaction créée JUSTE
// AVANT la prochaine transaction readwrite dont la portée contient `declencheur`. IndexedDB exécute dans leur ordre de
// création les transactions d'écriture de portées communes : l'écriture « de l'autre onglet » tombe au pire moment, entre
// les lectures de la vue et sa transaction, sans aucune attente chronométrée. `window.__injecte` atteste le déclenchement,
// `window.__injecteOk` la validation de la transaction injectée ; `window.__dansInjecteur` est vrai pendant sa création
// (une sonde de comptage posée AVANT l'injecteur l'exclut ainsi).
const injecterAvant = (page, { declencheur, lignes }) => page.evaluate(({ declencheur, lignes }) => {
  const origine = IDBDatabase.prototype.transaction;
  window.__injecte = false;
  window.__injecteOk = false;
  window.__dansInjecteur = false;
  IDBDatabase.prototype.transaction = function (stores, mode, ...reste) {
    if (!window.__injecte && mode === 'readwrite' && [].concat(stores).includes(declencheur)) {
      window.__injecte = true;
      IDBDatabase.prototype.transaction = origine;
      window.__dansInjecteur = true;
      try {
        const tx = origine.call(this, Object.keys(lignes), 'readwrite');
        tx.oncomplete = () => { window.__injecteOk = true; };
        for (const [magasin, liste] of Object.entries(lignes)) for (const l of liste) tx.objectStore(magasin).put(l);
      } finally {
        window.__dansInjecteur = false;
      }
    }
    return origine.call(this, stores, mode, ...reste);
  };
}, { declencheur, lignes });

// Panne d'écriture (motif grilles.spec.mjs:854-857) : les `fois` prochains put() sur `magasin` lèvent un QuotaExceededError.
// `window.__panneRestante` dit combien il en reste : 0 = panne consommée ; le remettre à 0 répare (`fois: Infinity`).
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

// Transaction du PREMIER put() sur `magasin` tenue ouverte (motif « A27 (revue) », audit5-lot5.spec.mjs) par une chaîne de
// get() jusqu'à `window.__liberer = true` ; `window.__tenue` passe à true dès que la chaîne est lancée. Les transactions
// d'écriture créées ensuite sur ce magasin attendent derrière elle.
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

// Défaillance au COMMIT (motif MIG-10) : le prochain put() sur `magasin` réussit, puis sa transaction est abandonnée par une
// requête émise après lui. `window.__putReussi` et `window.__abandon` en témoignent.
const abandonnerProchainPut = (page, magasin) => page.evaluate((magasin) => {
  const put = IDBObjectStore.prototype.put;
  window.__putReussi = false;
  window.__abandon = false;
  let arme = true;
  IDBObjectStore.prototype.put = function (...a) {
    const req = put.apply(this, a);
    if (this.name === magasin && arme) {
      arme = false;
      const store = this;
      req.addEventListener('success', () => {
        window.__putReussi = true;
        store.count().addEventListener('success', () => { window.__abandon = true; try { req.transaction.abort(); } catch { /* déjà close */ } });
      });
    }
    return req;
  };
}, magasin);

// Appel relu en base (undefined s'il n'existe pas).
const lireAppel = (page, id) => page.evaluate(async (k) => (await import('/js/io.js')).lire('appels', k), id);

// --- La pose par la feuille « ⋯ » (É9) ---
// Poses d'un élève sur une séance : liste de marqueurs → { seanceId, eleveId, marqueurId } (option `poses` de peupler).
const posesDe = (seanceId, eleveId, ...marqueurs) => marqueurs.map((m) => ({ seanceId, eleveId, marqueurId: m.id }));
const lirePoses = async (page) => (await lireTout(page, ['marquages'])).marquages;
// Rouvrir la MÊME séance : passer d'abord par le sélecteur (même adresse = aucun hashchange), en attendant la fin de ce rendu.
async function rouvrirAppel(page, seanceId, n) {
  await page.evaluate(() => { window.__vuePrecedente = document.getElementById('vue'); location.hash = '#/appel'; });
  await expect.poll(() => page.evaluate(() => {
    const v = document.getElementById('vue');
    return v !== window.__vuePrecedente && document.activeElement === v;
  })).toBe(true);
  await ouvrirAppel(page, seanceId, n);
}
const carteDe = (page, i) => page.locator('.btn-eleve').nth(i - 1);
const rangeeDe = (page, i) => carteDe(page, i).locator('.rang-marqueurs-carte');
const dialogue = (page) => page.locator('dialog.feuille[open]');
const bouton = (page, libelle) => dialogue(page).locator('.btn-marqueur', { hasText: libelle });
async function feuilleDe(page, i) {
  await carteDe(page, i).locator('.eleve-menu').click();
  await expect(dialogue(page)).toHaveCount(1);
}
async function fermerFeuille(page) {
  await dialogue(page).getByRole('button', { name: 'Fermer', exact: true }).click();
  await expect(dialogue(page)).toHaveCount(0);
}
// Fin de rafale : plus aucun bouton en cours d'écriture (aria-busy posé par le tap, retiré en fin de rafale).
const finRafale = (page) => expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
const annonce = (page) => page.locator('#vue p.sr-only[role="status"]');
// Feuille ouverte, la vue annonce dans la région de la FEUILLE : celle de la vue, sous une modale, est inerte — hors de l'arbre
// d'accessibilité (revue v0.14.2, D1, R11, R22 ; l'exposition elle-même est prouvée par ECR-21).
const annonceFeuille = (page) => page.locator('dialog.feuille[open] > p.sr-only[role="status"]');
// Ce qui est VU (revue v0.14.2, R21) : au centre du nœud, l'élément au premier plan est ce nœud ou l'un de ses descendants.
const auPremierPlan = (locator) => locator.evaluate((n) => {
  const r = n.getBoundingClientRect();
  const dessus = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
  return r.width > 0 && r.height > 0 && Boolean(dessus && n.contains(dessus));
});
const btnTerminer = (page) => page.getByRole('button', { name: /^Terminer l’appel/ });
const CLE_ECHECS = 'carnet-eps:marqueurs-echecs:s1';
const lireSession = (page, cle = CLE_ECHECS) => page.evaluate((k) => sessionStorage.getItem(k), cle);
const lireRecents = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('carnet-eps:prefs') || '{}').marqueursRecents);
// Transaction d'écriture tenue sur `magasin` (chaîne de get() jusqu'à `window.__liberer = true`) : les transactions de la
// vue qui couvrent ce magasin attendent derrière elle (IndexedDB les exécute dans leur ordre de création).
const bloquer = (page, magasin) => page.evaluate(async (magasin) => {
  const io = await import('/js/io.js');
  const db = await io.ouvrirDB();
  window.__liberer = false;
  window.__tenue = false;
  const store = db.transaction([magasin], 'readwrite').objectStore(magasin);
  const boucle = () => { if (window.__liberer) return; store.get('__aucun__').onsuccess = boucle; };
  boucle();
  window.__tenue = true;
}, magasin);

// Code d'une rangée mesuré APRÈS la passe de l'observateur de taille, en UNE évaluation (revue v0.14.2, D10, R23). La passe
// repeint la rangée (majBouton → replaceChildren : des codes NEUFS) ; or `locator.evaluate` résout le nœud dans un aller-retour
// et le mesure dans un second : une passe tombée entre les deux faisait mesurer un nœud DÉTACHÉ (hauteur 0, styles vides, faux
// rouge — vu sous observateur retardé, .playwright/c4/). Ici : deux images d'abord (la passe initiale est livrée au rendu qui
// suit l'ouverture de la vue, et ne se relance pas tant que la taille de la rangée ne change pas), puis le nœud est résolu ET
// mesuré dans la même tâche. `ou` : 'carte' (1er code de la 1re carte d'appel), 'formulaire' (aperçu du formulaire du
// vocabulaire), ou { liste: <texte> } (aperçu de la carte de la liste qui contient ce texte). `trouves` : nombre de nœuds
// candidats — la mesure n'est faite que s'il y en a exactement un.
const mesurerCode = (page, ou) => page.evaluate(async (ou) => {
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  const trouves = ou === 'carte' ? [...(document.querySelector('.btn-eleve')?.querySelectorAll('.rang-marqueurs-carte > [data-mq-rang="1"]') ?? [])]
    : ou === 'formulaire' ? [...document.querySelectorAll('.mq-ligne-code .mq-code')]
      : [...new Set([...document.querySelectorAll('.carte')].filter((x) => x.textContent.includes(ou.liste)).flatMap((x) => [...x.querySelectorAll('.mq-apercu .mq-code')]))];
  if (trouves.length !== 1) return { trouves: trouves.length };
  const n = trouves[0], s = getComputedStyle(n), r = n.getBoundingClientRect();
  return { trouves: 1, texte: n.textContent, fontSize: s.fontSize, lineHeight: s.lineHeight, fontWeight: s.fontWeight,
    borderTopWidth: s.borderTopWidth, paddingTop: s.paddingTop, hauteur: r.height, largeur: r.width };
}, ou);

test('MQ-01 — poser n’écrase ni le statut, ni les minutes de retard, ni le commentaire écrits ailleurs', async ({ page }) => {
  await peupler(page, { vocabulaire: [MQ.arb] });
  await ouvrirAppel(page, 's1', 3);
  // « Un autre onglet » réécrit l'appel de e1 derrière la vue.
  const ailleurs = { id: 's1_e1', seanceId: 's1', eleveId: 'e1', statut: 'retard', minutesRetard: 12, commentaire: 'écrit ailleurs' };
  await page.evaluate(async (a) => (await import('/js/io.js')).enregistrer('appels', a), ailleurs);
  expect(await lireAppel(page, 's1_e1')).toEqual(ailleurs); // prémisse : relu en base avant la pose
  await expect(carteDe(page, 1).locator('.detail-txt')).toHaveText('Présent'); // prémisse : la vue est PÉRIMÉE
  await feuilleDe(page, 1);
  await bouton(page, 'Arbitre').click();
  await finRafale(page);
  expect((await lirePoses(page)).map((p) => p.id)).toEqual(['s1_e1_mq-arb']);
  expect(await lireAppel(page, 's1_e1')).toEqual(ailleurs);
});

test('MQ-02 — l’appel est relu dans la transaction : appel supprimé derrière la vue, la pose est refusée avec le texte du refus venu de la base, annoncé ; après un statut refusé sur CE même écran, le refus n’accuse pas « un autre écran »', async ({ page }) => {
  await peupler(page, { vocabulaire: [MQ.arb, MQ.coa] });
  await ouvrirAppel(page, 's1', 3);
  await expect(btnTerminer(page)).toBeHidden(); // tous les élèves de la vue sont appelés
  await feuilleDe(page, 1);
  await bouton(page, 'Arbitre').click();
  await finRafale(page);
  expect((await lirePoses(page)).map((p) => p.id)).toEqual(['s1_e1_mq-arb']); // prémisse : la première pose a réussi
  await page.evaluate(async () => (await import('/js/io.js')).supprimer('appels', 's1_e1'));
  expect(await lireAppel(page, 's1_e1')).toBeUndefined(); // prémisse : l'appel a disparu de la base
  const coach = bouton(page, 'Coach');
  await expect(coach).not.toHaveAttribute('aria-disabled', 'true'); // prémisse : la vue croit e1 appelé
  await expect(btnTerminer(page)).toBeHidden(); // prémisse : « Terminer l'appel » n'est pas à l'écran au moment du refus
  await coach.click();
  await finRafale(page);
  const refus = page.locator('.toast', { hasText: 'Appel introuvable' });
  await expect(refus).toHaveText('Appel introuvable pour Prenom1 NOM01 : il a changé sur un autre écran. Rechargez la page.');
  await expect(refus).not.toContainText('Terminer');
  await expect(refus).not.toContainText('statut');
  await expect(coach).toHaveAttribute('aria-pressed', 'false');
  expect((await lirePoses(page)).map((p) => p.id)).toEqual(['s1_e1_mq-arb']);
  expect(await lireSession(page)).toBeNull(); // ce n'est pas une panne : aucun échec durable
  await expect(page.locator('.barre-appel .grille-echec')).toBeHidden();
  // L'annonce dit le refus, par son propre texte (§6.2 point 5) — jamais la pose optimiste « Coach posé sur … » (revue
  // v0.14.2, R24) ; feuille ouverte, dans la région de la feuille (D1).
  await expect(annonceFeuille(page)).toHaveText('Appel introuvable pour Prenom1 NOM01 : il a changé sur un autre écran. Rechargez la page.');
  await fermerFeuille(page);

  // Phase 2 (revue v0.14.2, R02, R08) — MÊME écran, aucun autre onglet. e2 n'a pas d'appel (vue rouverte : elle le sait).
  // « Retard », tapé dans sa feuille, lève le verrou d'avance (écran optimiste) puis échoue au commit ; « Arbitre », tapé
  // PENDANT cette écriture, est donc refusé par la base (AppelManquant). Aucun « autre écran » n'est en jeu.
  await page.evaluate(async () => (await import('/js/io.js')).supprimer('appels', 's1_e2'));
  await rouvrirAppel(page, 's1', 3);
  await feuilleDe(page, 2);
  await expect(bouton(page, 'Arbitre')).toHaveAttribute('aria-disabled', 'true'); // prémisse : la vue sait e2 non appelé
  await bloquer(page, 'appels');
  expect(await page.evaluate(() => window.__tenue)).toBe(true); // prémisse : l'écriture du statut attendra
  await abandonnerProchainPut(page, 'appels');
  await dialogue(page).getByRole('button', { name: 'Retard', exact: true }).click();
  await expect(bouton(page, 'Arbitre')).not.toHaveAttribute('aria-disabled', 'true'); // prémisse : la vue croit e2 appelé
  await bouton(page, 'Arbitre').click();
  await page.evaluate(() => { window.__liberer = true; });
  await finRafale(page);
  const refusIci = page.locator('.toast', { hasText: 'Appel introuvable pour Prenom2 NOM02' });
  await expect(refusIci).toHaveCount(1);
  expect(await page.evaluate(() => [window.__putReussi, window.__abandon])).toEqual([true, true]); // prémisse : échec au commit
  await expect(page.locator('.toast', { hasText: 'Statut non enregistré' })).toHaveCount(1); // prémisse : le statut a échoué
  expect(await lireAppel(page, 's1_e2')).toBeUndefined(); // prémisse : aucun appel en base
  await expect(refusIci).toHaveText('Appel introuvable pour Prenom2 NOM02 : son statut n’a pas été enregistré. Choisissez-le de nouveau.');
  await expect(refusIci).not.toContainText('autre écran');
  await expect(annonceFeuille(page)).toHaveText('Appel introuvable pour Prenom2 NOM02 : son statut n’a pas été enregistré. Choisissez-le de nouveau.');
  expect((await lirePoses(page)).map((p) => p.id)).toEqual(['s1_e1_mq-arb']); // rien de posé
  expect(await lireSession(page)).toBeNull(); // toujours pas une panne de pose : aucun échec durable
});

test('MQ-03 — un échec est dit ; l’écran revient au dernier état confirmé ; un tap récent n’est pas défait par l’échec d’un ancien', async ({ page }) => {
  await peupler(page, { vocabulaire: [MQ.arb, MQ.e1, MQ.coa, MQ.obs] });
  await ouvrirAppel(page, 's1', 3);
  // Phase A — deux échecs dans la même rafale.
  await bloquer(page, 'marquages');
  expect(await page.evaluate(() => window.__tenue)).toBe(true); // prémisse : la base est occupée, les écritures attendent
  await feuilleDe(page, 1);
  await bouton(page, 'Arbitre').click();
  await bouton(page, 'Équipe 1').click();
  await expect(rangeeDe(page, 1).locator('.mq-code')).toHaveText(['ARB', 'E1']); // prémisse : les codes SONT à l'écran
  await panne(page, { fois: Infinity });
  await page.evaluate(() => { window.__liberer = true; });
  await finRafale(page);
  await expect(rangeeDe(page, 1).locator('.mq-code')).toHaveCount(0); // retour au dernier état CONFIRMÉ
  expect((await lirePoses(page)).filter((p) => p.eleveId === 'e1')).toEqual([]);
  await expect(annonceFeuille(page)).toHaveText('Équipe 1 non enregistré pour Prenom1 NOM01.');
  // QUOI et QUI d'abord, la cause ensuite, un seul « : » — le « : » du conseil devient une virgule (revue v0.14.2, D2, K3) ;
  // le toast nomme lui aussi le marqueur et l'élève, avec le conseil « mémoire de l'appareil pleine ».
  const cause = 'Mémoire pleine (test) — mémoire de l’appareil pleine, exportez une sauvegarde (Plus → Sauvegarde), puis libérez de l’espace sur l’appareil.';
  await expect(page.locator('.toast', { hasText: 'Non enregistré : Équipe 1 pour Prenom1 NOM01' })).toHaveText(`Non enregistré : Équipe 1 pour Prenom1 NOM01 — ${cause}`);
  await expect(page.locator('.toast', { hasText: 'Non enregistré : Arbitre pour Prenom1 NOM01' })).toHaveText(`Non enregistré : Arbitre pour Prenom1 NOM01 — ${cause}`);
  // La ligne durable : son texte est posé feuille ouverte, mais elle est alors RECOUVERTE par la feuille — le relais, feuille
  // ouverte, ce sont les toasts, qui vivent dans la feuille (ECR-21). Elle se voit une fois la feuille fermée (revue v0.14.2, R21).
  const ligne = page.locator('.barre-appel .grille-echec');
  await expect(ligne).toHaveText(`Non enregistré : Arbitre pour Prenom1 NOM01, Équipe 1 pour Prenom1 NOM01 — ${cause}`);
  await expect(ligne.locator('.echec-qui')).toHaveText('Non enregistré : Arbitre pour Prenom1 NOM01, Équipe 1 pour Prenom1 NOM01'); // QUI d'abord
  expect(((await ligne.textContent()).match(/ : /g) || []).length).toBe(1);
  await page.evaluate(() => { window.__panneRestante = 0; }); // panne réparée
  await fermerFeuille(page); // la feuille est modale : on la ferme avant de toucher une autre carte
  await page.evaluate(() => { for (const t of document.querySelectorAll('.toasts .toast')) t.remove(); }); // ils passent devant la barre, exprès
  expect(await auPremierPlan(ligne)).toBe(true);

  // Phase B — le premier tap échoue, le second réussit : le second n'est pas défait.
  await bloquer(page, 'marquages');
  await feuilleDe(page, 2);
  await bouton(page, 'Observateur').click();
  await bouton(page, 'Coach').click();
  await panne(page, { fois: 1 });
  await page.evaluate(() => { window.__liberer = true; });
  await finRafale(page);
  expect(await page.evaluate(() => window.__panneRestante)).toBe(0); // prémisse : la panne a servi (à « Observateur »)
  expect((await lirePoses(page)).filter((p) => p.eleveId === 'e2').map((p) => p.marqueurId)).toEqual(['mq-coa']);
  await expect(rangeeDe(page, 2).locator('.mq-code')).toHaveText(['COA']);
  await expect(bouton(page, 'Observateur')).toHaveAttribute('aria-pressed', 'false');
  await expect(bouton(page, 'Coach')).toHaveAttribute('aria-pressed', 'true');
});

test('MQ-04 — la pose a sa propre annonce, jamais celle d’un statut', async ({ page }) => {
  await peupler(page, { vocabulaire: [MQ.arb] });
  await ouvrirAppel(page, 's1', 3);
  const appelAvant = await lireAppel(page, 's1_e1');
  const avantVue = await annonce(page).textContent();
  await feuilleDe(page, 1);
  // Feuille ouverte, l'annonce va dans la région de la feuille (revue v0.14.2, D1).
  expect(await annonceFeuille(page).textContent()).toBe(''); // prémisse : la région de la feuille naît vide, elle va changer
  await bouton(page, 'Arbitre').click();
  await expect(annonceFeuille(page)).toHaveText('Arbitre posé sur Prenom1 NOM01.');
  await expect(annonceFeuille(page)).not.toContainText('Prenom1 NOM01 : ');
  await finRafale(page);
  await bouton(page, 'Arbitre').click();
  await expect(annonceFeuille(page)).toHaveText('Arbitre retiré de Prenom1 NOM01.');
  await finRafale(page);
  expect(await annonce(page).textContent()).toBe(avantVue); // la région de la vue, inerte sous la feuille, n'a rien reçu
  expect(await lireAppel(page, 's1_e1')).toEqual(appelAvant); // aucune réécriture de l'appel
});

test('MQ-05 — refus « pas encore appelé » : aucune écriture ; le verrou suit la feuille ouverte ; vocabulaire vide dit', async ({ page }) => {
  await peupler(page, { vocabulaire: [MQ.arb, MQ.e1, MQ.rec], appels: [{ seanceId: 's1', eleveId: 'e2' }, { seanceId: 's1', eleveId: 'e3' }] });
  expect(await lireAppel(page, 's1_e1')).toBeUndefined(); // prémisse : e1 n'a AUCUN appel
  await ouvrirAppel(page, 's1', 3);
  const saisis = page.locator('.compteurs .note-inline');
  const saisisAvant = await saisis.textContent();
  await feuilleDe(page, 1);
  const boutons = dialogue(page).locator('.btn-marqueur');
  await expect(boutons).toHaveCount(3);
  for (const b of await boutons.all()) {
    await expect(b).toHaveAttribute('aria-disabled', 'true');
    await expect(b).not.toHaveAttribute('disabled');
  }
  await expect(dialogue(page).locator('fieldset legend')).toHaveText(['Rôles', 'Équipes', 'Comportements']);
  const refus = dialogue(page).locator('fieldset').first().locator('p.statut-erreur');
  await expect(refus).toHaveText('Choisissez d’abord un statut : un marqueur ne fait pas l’appel.');
  await expect(refus).toBeVisible();
  // `force` : Playwright tient un bouton aria-disabled pour inactif et n'y clique pas ; un vrai doigt, lui, le touche.
  await bouton(page, 'Arbitre').click({ force: true });
  // « Terminer l'appel » ne passe en présent que les élèves pas encore saisis, jamais « tout le monde » (revue v0.14.2, R07).
  await expect(page.locator('.toast', { hasText: 'Appel non fait' })).toHaveText('Appel non fait pour Prenom1 NOM01 : choisissez d’abord un statut ci-dessus, ou « Terminer l’appel » pour passer en présent les élèves pas encore saisis.');
  expect(await lirePoses(page)).toEqual([]);
  expect(await lireAppel(page, 's1_e1')).toBeUndefined();
  await expect(saisis).toHaveText(saisisAvant);
  // Un élève SANS appel n'a aucun statut pressé dans sa feuille — ni « Présent » par défaut, qui contredisait sa carte (vide)
  // et le refus juste en dessous (revue v0.14.2, K2, D3).
  const statuts = dialogue(page).locator('.grille-statuts .btn-statut');
  await expect(statuts).toHaveCount(7); // prémisse : les sept statuts sont là
  await expect(carteDe(page, 1).locator('.badge-statut')).toBeHidden(); // prémisse : la carte n'affiche aucun statut
  await expect(dialogue(page).locator('.grille-statuts [aria-pressed="true"]')).toHaveCount(0);

  // Phase 1 bis (D3) : un statut tapé dans la feuille puis refusé par la base ne reste pas pressé, et le verrou revient.
  await panne(page, { magasin: 'appels', fois: 1 });
  await dialogue(page).getByRole('button', { name: 'Retard', exact: true }).click();
  await expect(page.locator('.toast', { hasText: 'Statut non enregistré' })).toHaveCount(1); // prémisse : l'échec a eu lieu
  expect(await page.evaluate(() => window.__panneRestante)).toBe(0); // prémisse : c'est la panne qui a servi
  expect(await lireAppel(page, 's1_e1')).toBeUndefined();
  await expect(dialogue(page)).toHaveCount(1); // « Retard » laisse la feuille ouverte
  await expect(dialogue(page).locator('.grille-statuts [aria-pressed="true"]')).toHaveCount(0);
  await expect(refus).toBeVisible();
  await expect(bouton(page, 'Arbitre')).toHaveAttribute('aria-disabled', 'true');

  // Phase 2 (C13) : « Retard » dans la MÊME feuille, qui reste ouverte : le verrou tombe en direct.
  await dialogue(page).getByRole('button', { name: 'Retard', exact: true }).click();
  await expect.poll(async () => (await lireAppel(page, 's1_e1'))?.statut).toBe('retard'); // prémisse
  await expect(dialogue(page)).toHaveCount(1);
  await expect(dialogue(page).locator('.grille-statuts [aria-pressed="true"]')).toHaveText(['Retard']); // pressé en direct (D3)
  for (const b of await boutons.all()) await expect(b).not.toHaveAttribute('aria-disabled');
  await expect(refus).toBeHidden();
  await bouton(page, 'Arbitre').click();
  await finRafale(page);
  expect((await lirePoses(page)).map((p) => p.id)).toEqual(['s1_e1_mq-arb']);
  await fermerFeuille(page);

  // Vocabulaire vide (autre élève, vue rouverte) : la feuille le dit, sans aucun fieldset de marqueurs.
  await page.evaluate(async () => (await import('/js/io.js')).vider('marqueurs'));
  await rouvrirAppel(page, 's1', 3);
  await feuilleDe(page, 2);
  await expect(dialogue(page)).toContainText('Aucun marqueur défini — Plus → Marqueurs de séance.');
  await expect(dialogue(page).locator('fieldset')).toHaveCount(0);
  await expect(dialogue(page).locator('.btn-marqueur')).toHaveCount(0);
});

test('MQ-06 — « Terminer l’appel » ouvre la pose pour toute la classe', async ({ page }) => {
  await peupler(page, { vocabulaire: [MQ.arb], appels: [{ seanceId: 's1', eleveId: 'e3' }] });
  await ouvrirAppel(page, 's1', 3);
  // Avant : la même pose est refusée par la vue.
  await feuilleDe(page, 1);
  await expect(bouton(page, 'Arbitre')).toHaveAttribute('aria-disabled', 'true');
  await bouton(page, 'Arbitre').click({ force: true }); // aria-disabled : touché quand même (voir MQ-05)
  await expect(page.locator('.toast', { hasText: 'Appel non fait pour Prenom1 NOM01' })).toHaveCount(1);
  expect(await lirePoses(page)).toEqual([]);
  await fermerFeuille(page);
  await expect(btnTerminer(page)).toHaveText('Terminer l’appel · 2 passés en présent');
  await btnTerminer(page).click();
  await expect(page.locator('#vue')).toContainText('Appel complet ✓ (3/3)');
  // Après : acceptée.
  await feuilleDe(page, 1);
  await expect(bouton(page, 'Arbitre')).not.toHaveAttribute('aria-disabled');
  await bouton(page, 'Arbitre').click();
  await finRafale(page);
  expect((await lirePoses(page)).map((p) => p.id)).toEqual(['s1_e1_mq-arb']);
});

test('MQ-07 — cumul libre : poser « Équipe 2 » n’enlève jamais « Équipe 1 »', async ({ page }) => {
  await page.setViewportSize({ width: 300, height: 800 }); // largeur sans contrainte : les deux codes ont la place
  await peupler(page, { vocabulaire: [MQ.e1, MQ.e2] });
  await ouvrirAppel(page, 's1', 3);
  await feuilleDe(page, 1);
  await bouton(page, 'Équipe 1').click();
  await finRafale(page);
  await bouton(page, 'Équipe 2').click();
  await finRafale(page);
  expect((await lirePoses(page)).map((p) => p.id)).toEqual(['s1_e1_mq-e1', 's1_e1_mq-e2']);
  await expect(bouton(page, 'Équipe 1')).toHaveAttribute('aria-pressed', 'true');
  await expect(bouton(page, 'Équipe 2')).toHaveAttribute('aria-pressed', 'true');
  await expect(rangeeDe(page, 1).locator('[data-mq-rang][hidden]')).toHaveCount(0); // prémisse : aucun code masqué
  await expect(rangeeDe(page, 1).locator('[data-mq-rang]')).toHaveText(['E1', 'E2']);
});

test('MQ-08 — une occurrence : reposer ne crée pas de seconde ligne', async ({ page }) => {
  await peupler(page, { vocabulaire: [MQ.arb] });
  await ouvrirAppel(page, 's1', 3);
  await feuilleDe(page, 1);
  await bouton(page, 'Arbitre').click();
  await finRafale(page);
  // Même pose par « un second onglet ».
  await page.evaluate(async () => (await import('/js/io.js')).appliquerMarquages('s1', [{ eleveId: 'e1', marqueurId: 'mq-arb', op: 'poser' }]));
  const poses = await lirePoses(page);
  expect(poses.map((p) => p.id)).toContain('s1_e1_mq-arb');
  expect(poses).toHaveLength(1);
});

test('MQ-09 — `occurrences: 3` survit à la relecture, à l’aller-retour JSON et à la repose', async ({ page }) => {
  await peupler(page, { vocabulaire: [MQ.arb] });
  const brute = { id: 's1_e1_mq-arb', seanceId: 's1', eleveId: 'e1', marqueurId: 'mq-arb', occurrences: 3, courtSecours: 'ARB', genreSecours: 'role', dateAjout: '2026-09-14T10:00:00.000Z' };
  const r = await page.evaluate(async (b) => {
    const io = await import('/js/io.js');
    await io.enregistrer('marquages', b);
    const relue = await io.lire('marquages', b.id);
    const dump = JSON.parse(JSON.stringify(await io.exporterJSON()));
    await io.viderTout();
    const videApres = (await io.tous('marquages')).length;
    await io.importerJSON(dump);
    const reimportee = await io.lire('marquages', b.id);
    const appel = await io.lire('appels', 's1_e1');
    const repose = await io.appliquerMarquages('s1', [{ eleveId: 'e1', marqueurId: 'mq-arb', op: 'poser' }]);
    return { relue, videApres, reimportee, appel: Boolean(appel), creees: repose.creees, finale: await io.lire('marquages', b.id) };
  }, brute);
  expect(r.relue).toEqual(brute);
  expect(r.videApres).toBe(0); // prémisse : l'aller-retour a bien eu lieu
  expect(r.reimportee).toEqual(brute);
  expect(r.appel).toBe(true); // prémisse : e1 a un appel (sinon la repose serait refusée et ne prouverait rien)
  expect(r.creees).toEqual([]); // la repose a RÉUSSI, sans créer de ligne
  expect(r.finale.occurrences).toBe(3);
  expect(r.finale.dateAjout).toBe(brute.dateAjout);
});

test('MQ-10 — archiver : l’historique reste lisible et retirable, la feuille ne le propose plus', async ({ page }) => {
  await peupler(page, { vocabulaire: [MQ.arb, MQ.coa, MQ.obs], poses: posesDe('s1', 'e1', MQ.coa) });
  await ouvrirAppel(page, 's1', 3);
  await feuilleDe(page, 2);
  await expect(bouton(page, 'Coach')).toHaveAttribute('aria-pressed', 'false'); // prémisse : « Coach » était proposé
  await fermerFeuille(page);
  await page.evaluate(async () => (await import('/js/io.js')).ecrireMarqueur('mq-coa', { archivee: true })); // autre onglet
  await rouvrirAppel(page, 's1', 3);
  // La carte : lu normalement (décision 16), sans marque d'archive.
  await expect(rangeeDe(page, 1).locator('.mq-code')).toHaveText(['COA']);
  await expect(rangeeDe(page, 1).locator('[data-mq-archive]')).toHaveCount(0);
  // La feuille de e1 : dernier de son genre, pressé, marqué archivé.
  await feuilleDe(page, 1);
  const roles = dialogue(page).locator('fieldset', { hasText: 'Rôles' }).locator('.btn-marqueur');
  await expect(roles.locator('span:last-child')).toHaveText(['Arbitre', 'Observateur', 'Coach (archivé)']);
  const archive = bouton(page, 'Coach (archivé)');
  await expect(archive).toHaveAttribute('aria-pressed', 'true');
  await expect(archive).toHaveAttribute('data-mq-archive', '');
  // Retrait : permis ; le bouton reste en place, verrouillé.
  await archive.click();
  await finRafale(page);
  expect(await lirePoses(page)).toEqual([]);
  await expect(archive).toHaveAttribute('aria-pressed', 'false');
  await expect(archive).toHaveAttribute('aria-disabled', 'true');
  // Second tap (sur un bouton aria-disabled, touché quand même : voir MQ-05) : aucune repose, aucun échec.
  await archive.click({ force: true });
  await finRafale(page);
  expect(await lirePoses(page)).toEqual([]);
  await expect(page.locator('.toast', { hasText: 'non enregistré' })).toHaveCount(0);
  expect(await lireSession(page)).toBeNull();
  await fermerFeuille(page);
  // La feuille de e2 ne le propose plus.
  await feuilleDe(page, 2);
  await expect(dialogue(page).locator('.btn-marqueur', { hasText: 'Coach' })).toHaveCount(0);
  await expect(bouton(page, 'Arbitre')).toHaveCount(1); // témoin
});

test('MQ-11 — renommer suit tout l’historique : le vocabulaire gagne sur l’instantané ; l’aperçu du vocabulaire a la taille exacte du code de la carte', async ({ page }) => {
  await page.setViewportSize({ width: 300, height: 800 });
  await peupler(page, { vocabulaire: [MQ.arb], poses: posesDe('s1', 'e1', MQ.arb) }); // s1 : séance PASSÉE
  await ouvrirAppel(page, 's1', 3);
  await expect(rangeeDe(page, 1).locator('.mq-code')).toHaveText(['ARB']); // prémisse : l'ancien code était affiché
  await page.evaluate(async () => (await import('/js/io.js')).ecrireMarqueur('mq-arb', { libelle: 'Arbitre principal', court: 'ARX' }));
  expect((await lirePoses(page))[0].courtSecours).toBe('ARB'); // prémisse : l'instantané, lui, n'a pas bougé
  await rouvrirAppel(page, 's1', 3);
  const code = rangeeDe(page, 1).locator('[data-mq-rang="1"]');
  await expect(code).toHaveText('ARX');
  await expect(rangeeDe(page, 1).locator('.sr-only')).toContainText('Arbitre principal');

  // Addendum A3 : l'aperçu de l'écran du vocabulaire (formulaire et carte de la liste) rend EXACTEMENT ce code — mêmes
  // tailles CALCULÉES, comparées entre elles (jamais un nombre de pixels : la police et l'arrondi des bordures varient). La
  // largeur aussi : depuis la revue de la v0.14.2 (D4), un code de la carte n'est jamais rétréci — il est entier ou absent.
  // Le code de la carte est mesuré APRÈS la passe de l'observateur de taille, en une évaluation (D10, R23 : mesurerCode).
  const surLaCarte = await mesurerCode(page, 'carte');
  expect(surLaCarte.trouves, 'prémisse : un seul 1er code sur la carte').toBe(1);
  expect(surLaCarte.texte).toBe('ARX'); // prémisse : c'est bien le code renommé qui est mesuré
  expect(surLaCarte.hauteur).toBeGreaterThan(0); // prémisse : le code de la carte est rendu
  await page.goto('/#/marqueurs/modifier/mq-arb');
  await expect(page.locator('.mq-ligne-code .mq-code')).toHaveText('ARX');
  expect(await mesurerCode(page, 'formulaire')).toEqual(surLaCarte);
  await page.goto('/#/marqueurs');
  await expect(page.locator('.carte', { hasText: 'Arbitre principal' }).locator('.mq-apercu .mq-code')).toHaveText('ARX');
  expect(await mesurerCode(page, { liste: 'Arbitre principal' })).toEqual(surLaCarte);
});

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

test('MQ-13 — feuille : derniers utilisés en tête, aucun plafond ; jamais sur un retrait ; ordre gelé dans la vue', async ({ page }) => {
  // Douze rôles ; ids INVERSÉS (« m12 » pour « Rôle 01 » … « m01 » pour « Rôle 12 ») : l'ordre du magasin n'est pas celui
  // du catalogue.
  const douze = Array.from({ length: 12 }, (_, i) => {
    const n = String(i + 1).padStart(2, '0');
    return { id: `m${String(12 - i).padStart(2, '0')}`, libelle: `Rôle ${n}`, court: `R${n}`, genre: 'role', couleur: 'bleu' };
  });
  await peupler(page, { vocabulaire: douze });
  await ouvrirAppel(page, 's1', 3);
  const libelles = () => dialogue(page).locator('fieldset', { hasText: 'Rôles' }).locator('.btn-marqueur span:last-child').allTextContents();
  const catalogue = douze.map((m) => m.libelle);
  await feuilleDe(page, 1);
  expect(await libelles()).toEqual(catalogue);
  for (const b of await dialogue(page).locator('.btn-marqueur').all()) { // aucun plafond : les douze restent atteignables
    await b.scrollIntoViewIfNeeded();
    await expect(b).toBeVisible();
  }
  await bouton(page, 'Rôle 12').click();
  await finRafale(page);
  await bouton(page, 'Rôle 11').click();
  await finRafale(page);
  await bouton(page, 'Rôle 12').click(); // RETRAIT : ne touche pas à l'ordre
  await finRafale(page);
  expect((await lirePoses(page)).map((p) => p.marqueurId)).toEqual(['m02']); // prémisse : pose, pose, retrait écrits
  expect((await lireRecents(page)).slice(0, 2)).toEqual(['m02', 'm01']); // prémisse : Rôle 11 puis Rôle 12
  // Dans la même vue : ordre inchangé (gelé).
  await fermerFeuille(page);
  await feuilleDe(page, 1);
  expect(await libelles()).toEqual(catalogue);
  await fermerFeuille(page);
  // Sortie puis retour : les derniers utilisés en tête, le reste dans l'ordre du catalogue.
  await rouvrirAppel(page, 's1', 3);
  await feuilleDe(page, 1);
  expect(await libelles()).toEqual(['Rôle 11', 'Rôle 12', ...catalogue.slice(0, 10)]);
});

test('MQ-15 — marqueurs et observations coexistent : poser n’écrit ni observation ni note', async ({ page }) => {
  await peupler(page, { vocabulaire: [MQ.arb, MQ.rec] });
  const comptes = () => page.evaluate(async () => {
    const io = await import('/js/io.js');
    return { observations: (await io.tous('observations')).length, notes: (await io.tous('notes')).length };
  });
  const depart = await comptes();
  await ouvrirAppel(page, 's1', 3);
  await feuilleDe(page, 1);
  await bouton(page, 'Arbitre').click();
  await finRafale(page);
  await bouton(page, 'À recadrer').click();
  await finRafale(page);
  expect((await lirePoses(page)).map((p) => p.marqueurId)).toEqual(['mq-arb', 'mq-rec']); // prémisse : deux poses écrites
  expect(await comptes()).toEqual(depart);
  await fermerFeuille(page);
  // Ancres, dans le même test : une observation ajoutée par la fiche élève et une note écrite FONT bouger les comptes.
  await page.goto('/#/eleves/fiche/e1');
  await page.getByRole('button', { name: '+ Observation' }).click();
  await page.locator('dialog.feuille textarea').fill('Observation de test');
  await page.locator('dialog.feuille').getByRole('button', { name: 'Enregistrer' }).click();
  await expect(page.locator('#vue')).toContainText('Observation de test');
  await page.evaluate(async () => (await import('/js/io.js')).enregistrer('notes', { id: 'ev1_e1', evaluationId: 'ev1', eleveId: 'e1', valeur: 12 }));
  expect(await comptes()).toEqual({ observations: depart.observations + 1, notes: depart.notes + 1 });
});

test('MQ-16 — aucune sortie : ni rangée imprimée, ni colonne au récapitulatif, ni colonne au CSV', async ({ page }) => {
  await page.setViewportSize({ width: 300, height: 800 });
  await peupler(page, { vocabulaire: [MQ.arb], poses: posesDe('s1', 'e1', MQ.arb) });
  await ouvrirAppel(page, 's1', 3);
  const rang = rangeeDe(page, 1);
  const boite = (l) => l.evaluate((n) => { const r = n.getBoundingClientRect(); return r.width * r.height; });
  // Le code est mesuré APRÈS la passe de l'observateur de taille, en une évaluation (D10, R23 : mesurerCode).
  const code = await mesurerCode(page, 'carte');
  expect(code.trouves, 'prémisse : un seul code sur la carte').toBe(1);
  expect(code.texte).toBe('ARB');
  expect(code.largeur * code.hauteur).toBeGreaterThan(0); // prémisse : le code est visible à l'écran
  await expect(rang.locator('.mq-code')).toHaveCount(1); // … et c'est le seul de la rangée
  await page.emulateMedia({ media: 'print' });
  expect(await rang.evaluate((n) => getComputedStyle(n).display)).toBe('none');
  const nom = carteDe(page, 1).locator('.nom-e'); // témoin : la même carte reste imprimée
  expect(await nom.evaluate((n) => getComputedStyle(n).display)).not.toBe('none');
  expect(await boite(nom)).toBeGreaterThan(0);
  await page.emulateMedia({ media: 'screen' });

  // Le récapitulatif : tableau imprimable et CSV, en-têtes DÉRIVÉS de STATUTS (metier.js), jamais recopiés.
  await page.goto('/#/appel/recap/c1');
  const attendu = await page.evaluate(async () => {
    const { STATUTS, SEUIL_ALERTE } = await import('/js/metier.js');
    const { champCSV } = await import('/js/io.js');
    const libelles = Object.keys(STATUTS).map((k) => STATUTS[k].libelle);
    return { colonnes: libelles.length + 2, tete: ['Nom', 'Prénom', ...libelles, `Alerte (seuil ${SEUIL_ALERTE} sur la période)`].map(champCSV).join(';') };
  });
  const thead = page.locator('#vue table thead');
  await expect(thead.locator('th')).toHaveCount(attendu.colonnes);
  await expect(page.locator('#vue table tbody th', { hasText: 'NOM01 Prenom1' })).toHaveCount(1); // prémisse : le tableau est rendu
  for (const x of ['Arbitre', 'ARB', 'Marqueur']) await expect(thead).not.toContainText(x);
  const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Exporter CSV' }).click()]);
  const csv = (await readFile(await dl.path(), 'utf8')).replace(/^﻿/, ''); // BOM retiré (motif C32b)
  const lignes = csv.split('\r\n');
  expect(lignes[0]).toBe(attendu.tete);
  expect(csv).toContain('Présent'); // prémisse : les libellés de statut y sont bien
  expect(lignes.some((l) => l.startsWith('NOM01;Prenom1;'))).toBe(true); // prémisse : e1, qui porte la pose, y est
  for (const x of ['Arbitre', 'ARB', 'Marqueur']) expect(csv).not.toContain(x);

  // Revue v0.14.2, D9 (R18) — la feuille d'appel IMPRIMÉE : la rangée ne s'imprime pas (ci-dessus), mais :has() voyait encore
  // son nœud et relevait 🩺 et ⚠ de sa hauteur : sur le papier, ils tombaient sur la fin du NOM. Ils restent sur la ligne du
  // statut, jamais sur le nom — rangée présente (vocabulaire actif, carte avec ou sans pose) ou non (témoin sans vocabulaire).
  // Largeur d'une A4 portrait à marges de 10 mm (718 px) ; noms fictifs dont la DERNIÈRE ligne s'allonge d'une carte à l'autre.
  // Horloge figée : l'alerte ⚠ se compte sur l'année scolaire de « aujourd'hui ».
  await page.clock.setFixedTime(new Date('2026-09-30T10:00:00'));
  await page.reload();
  await page.setViewportSize({ width: 718, height: 1000 });
  await page.evaluate(async () => { const io = await import('/js/io.js'); for (const s of io.STORES) await io.vider(s); });
  const imp = Array.from({ length: 8 }, (_, i) => `e${i + 1}`);
  await peupler(page, {
    eleves: 8,
    seances: [{ id: 'p1', date: '2026-09-09' }, { id: 'p2', date: '2026-09-16' }, { id: 'p3', date: '2026-09-23' }, { id: 'si', date: '2026-09-30' }],
    appels: imp.flatMap((e) => [...['p1', 'p2', 'p3'].map((x) => ({ seanceId: x, eleveId: e, statut: 'oubli_tenue' })), { seanceId: 'si', eleveId: e }]), // ⚠
    inaptitudes: imp.map((e) => ({ eleveId: e })), // 🩺
    vocabulaire: [MQ.arb, MQ.rec],
    poses: imp.slice(0, 4).flatMap((e) => posesDe('si', e, MQ.arb, MQ.rec)), // la moitié des cartes porte des poses
  });
  await page.evaluate(async (ids) => {
    const io = await import('/js/io.js');
    for (const [i, id] of ids.entries()) await io.enregistrer('eleves', { id, classeId: 'c1', prenom: 'Prenomfictif', nom: `NOM${'ABCDEFGHIJKL'.slice(0, i + 2)}`, actif: true });
  }, imp);
  const TOLI = 0.5;
  const disjointsI = (a, b) => a.b <= b.h + TOLI || b.b <= a.h + TOLI || a.d <= b.g + TOLI || b.d <= a.g + TOLI;
  // Chaque carte : 🩺 et ⚠ (boîte et `bottom` calculé), et chaque lettre du nom (rectangle de Range) ; la dernière ligne du nom.
  // Deux images d'abord, dans la même évaluation (D10) : la passe de l'observateur de taille que déclenche le passage à
  // l'impression (rangée masquée) est livrée avant la mesure.
  const mesurerImpression = () => page.evaluate(async () => {
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    return [...document.querySelectorAll('.btn-eleve')].map((carte) => {
      const R = (r) => ({ g: r.left, d: r.right, h: r.top, b: r.bottom });
      const nom = carte.querySelector('.nom-e');
      const glyphes = [];
      const w = document.createTreeWalker(nom, NodeFilter.SHOW_TEXT);
      for (let t = w.nextNode(); t; t = w.nextNode()) {
        for (let i = 0; i < t.length; i++) {
          if (/\s/.test(t.data[i])) continue;
          const rg = document.createRange();
          rg.setStart(t, i);
          rg.setEnd(t, i + 1);
          const b = [...rg.getClientRects()].find((x) => x.width > 0);
          if (b) glyphes.push(R(b));
        }
      }
      const bas = Math.max(...glyphes.map((x) => x.h));
      const rang = carte.querySelector('.rang-marqueurs-carte');
      return {
        nom: nom.textContent,
        rangee: rang ? getComputedStyle(rang).display : null,
        pastilles: [...carte.querySelectorAll('.pastille-info, .pastille-warn')].map((p) => ({ r: R(p.getBoundingClientRect()), bottom: getComputedStyle(p).bottom })),
        glyphes,
        derniereLigne: glyphes.filter((x) => x.h >= bas - 0.5),
      };
    });
  });
  const verifierImpression = async (cas, rangeeAttendue) => {
    await page.emulateMedia({ media: 'print' });
    const cartes = await mesurerImpression();
    expect(cartes.length, `${cas} : prémisse, huit cartes`).toBe(8);
    let enFace = 0;
    for (const c of cartes) {
      expect(c.rangee, `${cas}, ${c.nom} : la rangée (nœud présent ou non) ne s'imprime pas`).toBe(rangeeAttendue);
      expect(c.pastilles.length, `${cas}, ${c.nom} : 🩺 et ⚠ imprimés`).toBe(2);
      for (const p of c.pastilles) {
        expect((p.r.d - p.r.g) * (p.r.b - p.r.h), `${cas}, ${c.nom} : pictogramme de taille non nulle`).toBeGreaterThan(0);
        expect(c.glyphes.filter((x) => !disjointsI(x, p.r)).length, `${cas}, ${c.nom} : aucune lettre du nom sous un pictogramme`).toBe(0);
        if (c.derniereLigne.some((x) => x.g < p.r.d - TOLI && p.r.g < x.d - TOLI)) enFace++;
      }
    }
    // Prémisse : des lettres de la DERNIÈRE ligne du nom sont à l'aplomb d'un pictogramme sur plusieurs cartes — sans quoi la
    // disjonction serait vraie par la seule largeur, et ne dirait rien de la hauteur.
    expect(enFace, `${cas} : pictogrammes à l'aplomb de la dernière ligne d'un nom`).toBeGreaterThan(1);
    await page.emulateMedia({ media: 'screen' });
    return cartes.map((c) => c.pastilles.map((p) => p.bottom));
  };
  await ouvrirAppel(page, 'si', 8);
  const avecRangee = await verifierImpression('vocabulaire actif', 'none');
  // Témoin : sans vocabulaire ni pose, aucune rangée (v0.14.1) — le rendu imprimé de référence.
  await page.evaluate(async () => { const io = await import('/js/io.js'); await io.vider('marquages'); await io.vider('marqueurs'); });
  await rouvrirAppel(page, 'si', 8);
  await expect(page.locator('.rang-marqueurs-carte')).toHaveCount(0); // prémisse : le témoin n'a aucune rangée
  const temoin = await verifierImpression('témoin sans vocabulaire', null);
  // Les pictogrammes sont imprimés exactement là où le témoin les imprime : sur la ligne du statut.
  expect(avecRangee).toEqual(temoin);
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
  // gauche du champ. Mesuré à 360 px de large (la largeur Android la plus courante), profil chromium (cette
  // spec ne tourne pas sur le projet mobile) : la phrase n'y tient jamais à côté du repère, quelle que soit la police.
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

// « Terminer l'appel » durci (contrat §14, réponse 3) et, par la même fonction, le pré-remplissage des inaptitudes (même
// classe de défaut : un put aveugle bâti sur la Map lue à l'ouverture de la vue — plan C26).
test('MQ-21 — « Terminer l’appel » et le pré-remplissage ne remplacent jamais un statut posé ailleurs ; l’écran s’aligne sur la base', async ({ page }) => {
  // Horloge FIGÉE : le pré-remplissage n'a lieu que sur la séance du jour ; « aujourd'hui » ne dépend pas du calendrier.
  await page.clock.setFixedTime(new Date('2026-09-30T10:00:00'));
  await page.reload();
  expect(await page.evaluate(async () => (await import('/js/metier.js')).isoAujourdhui())).toBe('2026-09-30'); // prémisse
  await peupler(page, {
    eleves: 4,
    seances: [{ id: 'se', date: '2026-09-30' }, { id: 'se2', date: '2026-09-23' }],
    appels: [], // aucun appel
    inaptitudes: [{ eleveId: 'e1' }, { eleveId: 'e4' }], // totales, certificat : « inapte » d'office
  });
  const carteE = (i) => page.locator('.btn-eleve').nth(i - 1);
  const btn = page.getByRole('button', { name: /^Terminer l’appel/ });
  const ecritAilleurs = (eleveId) => ({ id: `se_${eleveId}`, seanceId: 'se', eleveId, statut: 'absent', minutesRetard: null, commentaire: 'écrit ailleurs' });

  // Phase 1 — pré-remplissage : un statut écrit par « un autre onglet » entre la lecture de la vue et son écriture.
  await injecterAvant(page, { declencheur: 'appels', lignes: { appels: [ecritAilleurs('e1')] } });
  await ouvrirAppel(page, 'se', 4);
  expect(await page.evaluate(() => [window.__injecte, window.__injecteOk])).toEqual([true, true]); // prémisse : l'écriture a eu lieu
  await expect(carteE(1).locator('.pastille-info')).toHaveCount(1); // prémisse : e1 est bien sous inaptitude totale
  expect((await lireAppel(page, 'se_e4'))?.statut).toBe('inapte'); // témoin : le pré-remplissage a eu lieu (et visait e1)
  expect(await lireAppel(page, 'se_e1')).toEqual(ecritAilleurs('e1')); // avant : remplacé par « inapte »
  await expect(carteE(1).locator('.detail-txt')).toHaveText('Absent');

  // Phase 2 — « Terminer l'appel » : la vue croit e2 et e3 restants ; e2 est appelé derrière elle.
  await expect(btn).toHaveText('Terminer l’appel · 2 passés en présent'); // prémisse
  await expect(carteE(2).locator('.badge-statut')).toBeHidden(); // prémisse : aucun statut affiché pour e2
  await injecterAvant(page, { declencheur: 'appels', lignes: { appels: [ecritAilleurs('e2')] } });
  await btn.click();
  await expect(page.locator('#vue')).toContainText('Appel complet ✓ (4/4)');
  expect(await page.evaluate(() => [window.__injecte, window.__injecteOk])).toEqual([true, true]); // prémisse
  expect(await lireAppel(page, 'se_e2')).toEqual(ecritAilleurs('e2')); // avant : remplacé par « présent »
  expect((await lireAppel(page, 'se_e3'))?.statut).toBe('present'); // témoin : la complétion a bien écrit
  // L'écran s'aligne sur la BASE, élève par élève (le retour n'est pas dans l'ordre de la vue : e3 créé, e2 déjà là).
  await expect(carteE(2).locator('.detail-txt')).toHaveText('Absent');
  await expect(carteE(3).locator('.detail-txt')).toHaveText('Présent');
  await expect(btn).toBeHidden();
  await expect(page.locator('.toast span', { hasText: 'statut' })).toHaveText(['1 statut déjà saisi sur un autre écran : conservé.']);

  // Phase 3 — `confirmes` aussi aligné sur la base : un échec d'écriture sur e2 ramène l'écran à « Absent », pas à vide.
  await panne(page, { magasin: 'appels', fois: 1 });
  await carteE(2).locator('.eleve-cycle').click(); // Absent → Oubli de tenue
  await expect(page.locator('.toast', { hasText: 'Statut non enregistré' })).toHaveCount(1); // prémisse : l'échec a eu lieu
  expect(await page.evaluate(() => window.__panneRestante)).toBe(0); // prémisse : c'est bien la panne qui a servi
  await expect(carteE(2).locator('.detail-txt')).toHaveText('Absent');
  expect(await lireAppel(page, 'se_e2')).toEqual(ecritAilleurs('e2'));

  // Phase 4 — un tap pendant l'écriture du lot, puis l'échec de CE tap au commit : l'écran revient à ce que le lot a écrit
  // (« Présent »), jamais à une carte vide. Séance passée : rien n'est pré-rempli.
  await page.evaluate(() => { for (const t of document.querySelectorAll('.toasts .toast')) t.remove(); }); // toasts des phases précédentes
  await ouvrirAppel(page, 'se2', 4);
  await expect(btn).toHaveText('Terminer l’appel · 4 passés en présent'); // prémisse
  await retenirPremierPut(page, 'appels');
  await btn.click();
  await expect.poll(() => page.evaluate(() => window.__tenue)).toBe(true); // les put du lot sont émis, sa transaction est tenue
  await abandonnerProchainPut(page, 'appels'); // visera donc le put du tap, pas le lot
  await carteE(3).locator('.eleve-cycle').click(); // présent (implicite) → absent ; sa transaction attend derrière le lot
  await expect(carteE(3).locator('.detail-txt')).toHaveText('Absent'); // prémisse : le tap a eu lieu pendant l'écriture
  await page.evaluate(() => { window.__liberer = true; });
  await expect(page.locator('.toast', { hasText: 'Statut non enregistré' })).toHaveCount(1); // prémisse : le tap a échoué
  expect(await page.evaluate(() => [window.__putReussi, window.__abandon])).toEqual([true, true]); // … au commit
  expect((await lireAppel(page, 'se2_e3'))?.statut).toBe('present'); // la base : ce que le lot a écrit
  await expect(carteE(3).locator('.detail-txt')).toHaveText('Présent');
  await expect(page.locator('#vue')).toContainText('Appel complet ✓ (4/4)');
});

test('MQ-22 — `completerAppels` relit dans sa transaction : un appel existant rendu intact, séance ou élève supprimés, candidat incohérent, clé prise par un autre élève, durabilité', async ({ page }) => {
  await peupler(page, {
    eleves: 4,
    seances: [{ id: 's1', date: '2026-09-14' }, { id: 's2', date: '2026-09-21' }, { id: 's3', date: '2026-09-28' }],
    appels: [{ seanceId: 's1', eleveId: 'e1', statut: 'absent', commentaire: 'garde' }],
  });
  const garde = { id: 's1_e1', seanceId: 's1', eleveId: 'e1', statut: 'absent', minutesRetard: null, commentaire: 'garde' };
  expect(await lireAppel(page, 's1_e1')).toEqual(garde); // prémisse : l'appel existant est relu tel quel
  // Appel direct à io.js (un seul module, dans la page) ; chaque volet rend ce qu'il a observé.
  const res = await page.evaluate(async () => {
    const io = await import('/js/io.js');
    const cand = (s, e) => ({ id: `${s}_${e}`, seanceId: s, eleveId: e, statut: 'present', minutesRetard: null, commentaire: '' });
    const essai = async (f) => { try { return { valeur: await f() }; } catch (e) { return { erreur: e?.message || String(e) }; } };
    const lire = async (id) => (await io.lire('appels', id)) ?? null;
    const r = {};
    // (a) Un appel existant est rendu dans `deja`, jamais réécrit ; le restant est créé.
    r.a = await essai(() => io.completerAppels('s1', [cand('s1', 'e1'), cand('s1', 'e2')]));
    r.aBase = { e1: await lire('s1_e1'), e2: await lire('s1_e2') };
    // (b) Durabilité : le put réussit, puis la transaction est abandonnée par une requête émise après lui → rejet.
    const put = IDBObjectStore.prototype.put;
    const trace = { putReussi: false, abandon: false };
    IDBObjectStore.prototype.put = function (...a) {
      const req = put.apply(this, a);
      if (this.name === 'appels') {
        const store = this;
        req.addEventListener('success', () => {
          trace.putReussi = true;
          store.count().addEventListener('success', () => { trace.abandon = true; try { req.transaction.abort(); } catch { /* déjà close */ } });
        });
      }
      return req;
    };
    r.b = await essai(() => io.completerAppels('s1', [cand('s1', 'e3')]));
    IDBObjectStore.prototype.put = put;
    r.bTrace = trace;
    r.bBase = await lire('s1_e3');
    // (c) Élève supprimé entre-temps : écarté, rien d'écrit pour lui ; témoin : e3, dans le même appel, est créé.
    await io.supprimer('eleves', 'e4');
    r.cPremisse = (await io.lire('eleves', 'e4')) ?? null;
    r.c = await essai(() => io.completerAppels('s1', [cand('s1', 'e3'), cand('s1', 'e4')]));
    r.cBase = { e3: await lire('s1_e3'), e4: await lire('s1_e4') };
    // (d) Séance supprimée entre-temps : tout est refusé ; témoin : avant la suppression, la même séance complète.
    r.dTemoin = await essai(() => io.completerAppels('s2', [cand('s2', 'e1')]));
    await io.supprimer('seances', 's2');
    r.dPremisse = (await io.lire('seances', 's2')) ?? null;
    r.d = await essai(() => io.completerAppels('s2', [cand('s2', 'e2')]));
    r.dBase = await lire('s2_e2');
    // (e) Tout ou rien : un candidat valide + un candidat dont l'identifiant ne correspond pas à son élève.
    r.e = await essai(() => io.completerAppels('s3', [cand('s3', 'e1'), { ...cand('s3', 'e2'), id: 's3_e3' }]));
    r.eBase = { e1: await lire('s3_e1'), e2: await lire('s3_e2'), e3: await lire('s3_e3') };
    // (f) Quota plein levé par put() : le message dit quoi faire (motifEcriture).
    let leves = 0;
    IDBObjectStore.prototype.put = function (...a) {
      if (this.name === 'appels') { leves++; throw new DOMException('Mémoire pleine (test)', 'QuotaExceededError'); }
      return put.apply(this, a);
    };
    r.f = await essai(() => io.completerAppels('s3', [cand('s3', 'e2')]));
    IDBObjectStore.prototype.put = put;
    r.fLeves = leves;
    r.fBase = await lire('s3_e2');
    // (g) Revue de la v0.14.2 (R03) : un appel de la base range l'élève e2 sous la clé de e1 (sauvegarde tierce, acceptée à
    // l'import). La vue repère l'appel par élève : il est retrouvé par (séance, élève), jamais par sa clé — rendu dans
    // `deja` pour e2, et rien d'écrit ; la clé occupée par un AUTRE élève refuse tout, sans écraser sa ligne.
    const tierce = { id: 's3_e1', seanceId: 's3', eleveId: 'e2', statut: 'absent', minutesRetard: null, commentaire: 'tierce' };
    await io.enregistrer('appels', tierce);
    r.gPremisse = { tierce: await lire('s3_e1'), e2: await lire('s3_e2'), e3: await lire('s3_e3') };
    r.g1 = await essai(() => io.completerAppels('s3', [cand('s3', 'e2')]));
    r.g2 = await essai(() => io.completerAppels('s3', [cand('s3', 'e3'), cand('s3', 'e1')]));
    r.gBase = { e1: await lire('s3_e1'), e2: await lire('s3_e2'), e3: await lire('s3_e3') };
    return r;
  });
  const cand = (s, e) => ({ id: `${s}_${e}`, seanceId: s, eleveId: e, statut: 'present', minutesRetard: null, commentaire: '' });
  // (a)
  expect(res.a).toEqual({ valeur: { creees: [cand('s1', 'e2')], deja: [garde], ecartes: [] } });
  expect(res.aBase).toEqual({ e1: garde, e2: cand('s1', 'e2') });
  // (b)
  expect(res.bTrace).toEqual({ putReussi: true, abandon: true }); // prémisses : le put a réussi, l'abandon a eu lieu après
  expect(res.b.valeur).toBeUndefined(); // un « ✓ » mensonger résoudrait ici
  expect(res.b.erreur).toBeTruthy();
  expect(res.bBase).toBeNull();
  // (c)
  expect(res.cPremisse).toBeNull();
  expect(res.c).toEqual({ valeur: { creees: [cand('s1', 'e3')], deja: [], ecartes: ['e4'] } });
  expect(res.cBase).toEqual({ e3: cand('s1', 'e3'), e4: null });
  // (d)
  expect(res.dTemoin).toEqual({ valeur: { creees: [cand('s2', 'e1')], deja: [], ecartes: [] } });
  expect(res.dPremisse).toBeNull();
  expect(res.d).toEqual({ erreur: 'séance supprimée entre-temps : rechargez la page' });
  expect(res.dBase).toBeNull();
  // (e)
  expect(res.e).toEqual({ erreur: 'appel incohérent avec sa séance : rechargez la page' });
  expect(res.eBase).toEqual({ e1: null, e2: null, e3: null });
  // (f)
  expect(res.fLeves).toBe(1); // prémisse : c'est bien le put qui a levé
  expect(res.f.erreur).toContain('mémoire de l’appareil pleine');
  expect(res.fBase).toBeNull();
  // (g)
  const tierce = { id: 's3_e1', seanceId: 's3', eleveId: 'e2', statut: 'absent', minutesRetard: null, commentaire: 'tierce' };
  expect(res.gPremisse).toEqual({ tierce, e2: null, e3: null }); // prémisses : la ligne tierce est en base, sous la clé de e1
  expect(res.g1).toEqual({ valeur: { creees: [], deja: [tierce], ecartes: [] } }); // avant : « s3_e2 » CRÉÉ, deux appels pour e2
  expect(res.g2).toEqual({ erreur: 'appel incohérent avec sa séance : rechargez la page' }); // avant : e1 « déjà saisi » par e2
  expect(res.gBase).toEqual({ e1: tierce, e2: null, e3: null }); // tout ou rien : e3 non plus
});

// Contrat §16, revue de la v0.14.0, point 1 (seconde moitié, plan C17) : une vue périmée peut RECRÉER l'appel d'une séance
// ou d'un élève supprimés ailleurs (definirStatut écrit l'appel sans rien relire) ; la garde « appel introuvable » ne suffit
// donc pas — appliquerMarquages relit la séance et l'élève dans sa transaction. Prouvé d'abord au POINT D'INTÉGRATION : le
// vrai tap sur la carte recrée l'appel (definirStatut), puis le geste de la feuille « ⋯ » (É9) ; puis au niveau d'io.js
// (É6), avec l'option « ignorer » et le témoin du retrait, toujours permis.
test('MQ-23 — une pose sur une séance ou un élève supprimés ailleurs est refusée, même quand un statut tapé dans la vue périmée a recréé l’appel', async ({ page }) => {
  await peupler(page, { vocabulaire: [MQ.arb] });
  // Écran — séance supprimée par « un autre onglet » pendant que la vue est ouverte.
  await ouvrirAppel(page, 's1', 3);
  await page.evaluate(async () => (await import('/js/io.js')).supprimerSeanceEnCascade('s1'));
  await carteDe(page, 1).locator('.eleve-cycle').click(); // le tap recrée l'appel s1_e1 (vue périmée)
  await expect(carteDe(page, 1).locator('.detail-txt')).toHaveText('Absent');
  expect(await page.evaluate(async () => { const io = await import('/js/io.js'); return [(await io.lire('seances', 's1')) ?? null, Boolean(await io.lire('appels', 's1_e1'))]; }))
    .toEqual([null, true]); // prémisses : séance absente, appel recréé
  await feuilleDe(page, 1);
  await expect(bouton(page, 'Arbitre')).not.toHaveAttribute('aria-disabled'); // prémisse : la vue croit e1 appelé
  await bouton(page, 'Arbitre').click();
  await finRafale(page);
  await expect(page.locator('.toast', { hasText: 'Non enregistré : Arbitre pour Prenom1 NOM01 — séance supprimée entre-temps, rechargez la page.' })).toHaveCount(1);
  expect((await lirePoses(page)).filter((p) => p.seanceId === 's1')).toEqual([]);
  await expect(rangeeDe(page, 1).locator('.mq-code')).toHaveCount(0);
  await fermerFeuille(page);
  // Écran — élève supprimé par « un autre onglet » (autre séance, intacte).
  await ouvrirAppel(page, 's2', 3);
  await page.evaluate(async () => (await import('/js/io.js')).supprimerEleveEnCascade('e2'));
  await carteDe(page, 2).locator('.eleve-cycle').click(); // recrée s2_e2
  await expect(carteDe(page, 2).locator('.detail-txt')).toHaveText('Absent');
  expect(await page.evaluate(async () => { const io = await import('/js/io.js'); return [(await io.lire('eleves', 'e2')) ?? null, Boolean(await io.lire('appels', 's2_e2'))]; }))
    .toEqual([null, true]); // prémisses : élève absent, appel recréé
  await feuilleDe(page, 2);
  await expect(bouton(page, 'Arbitre')).not.toHaveAttribute('aria-disabled');
  await bouton(page, 'Arbitre').click();
  await finRafale(page);
  await expect(page.locator('.toast', { hasText: 'Non enregistré : Arbitre pour Prenom2 NOM02 — élève introuvable, rechargez la page.' })).toHaveCount(1);
  expect((await lirePoses(page)).filter((p) => p.eleveId === 'e2')).toEqual([]);
  await expect(rangeeDe(page, 2).locator('.mq-code')).toHaveCount(0);
  await fermerFeuille(page);

  // io.js — sur des données neuves (les phases d'écran ont supprimé s1 et e2).
  await page.evaluate(async () => {
    const io = await import('/js/io.js');
    for (const s of io.STORES) await io.vider(s);
  });
  await peupler(page, { vocabulaire: [MQ.arb] });
  const res = await page.evaluate(async () => {
    const io = await import('/js/io.js');
    const essai = async (f) => { try { return { valeur: await f() }; } catch (e) { return { erreur: e?.message || String(e), nom: e?.name } } };
    const appel = (s, e) => ({ id: `${s}_${e}`, seanceId: s, eleveId: e, statut: 'absent', minutesRetard: null, commentaire: '' });
    const r = {};
    // Séance supprimée par « un autre onglet », puis son appel recréé par un statut tapé dans la vue restée ouverte.
    await io.supprimerSeanceEnCascade('s1');
    await io.enregistrer('appels', appel('s1', 'e1'));
    r.seancePremisses = { seance: (await io.lire('seances', 's1')) ?? null, appel: !!(await io.lire('appels', 's1_e1')), eleve: !!(await io.lire('eleves', 'e1')) };
    r.seance = await essai(() => io.appliquerMarquages('s1', [{ eleveId: 'e1', marqueurId: 'mq-arb', op: 'poser' }]));
    r.seancePoses = (await io.parIndex('marquages', 'seanceId', 's1')).length;
    // Élève supprimé par « un autre onglet », puis son appel recréé de même.
    await io.supprimerEleveEnCascade('e2');
    await io.enregistrer('appels', appel('s2', 'e2'));
    r.elevePremisses = { eleve: (await io.lire('eleves', 'e2')) ?? null, appel: !!(await io.lire('appels', 's2_e2')), seance: !!(await io.lire('seances', 's2')) };
    r.eleve = await essai(() => io.appliquerMarquages('s2', [{ eleveId: 'e2', marqueurId: 'mq-arb', op: 'poser' }]));
    // Option « ignorer » (reprise, v0.14.4) : l'élève disparu est écarté, rien n'est écrit, le reste passe (témoin : e3).
    r.ignorer = await essai(() => io.appliquerMarquages('s2', [
      { eleveId: 'e2', marqueurId: 'mq-arb', op: 'poser' }, { eleveId: 'e3', marqueurId: 'mq-arb', op: 'poser' },
    ], { surEleveNonAppele: 'ignorer' }));
    r.elevePoses = (await io.parIndex('marquages', 'eleveId', 'e2')).length;
    // Témoin : le RETRAIT reste toujours permis — poses orphelines brutes sur la séance supprimée et sur l'élève supprimé.
    const brute = (s, e) => ({ id: `${s}_${e}_mq-arb`, seanceId: s, eleveId: e, marqueurId: 'mq-arb', occurrences: 1, courtSecours: 'ARB', genreSecours: 'role', dateAjout: '2026-09-14T10:00:00.000Z' });
    await io.enregistrer('marquages', brute('s1', 'e3'));
    await io.enregistrer('marquages', brute('s2', 'e2'));
    r.retraitPremisses = [!!(await io.lire('marquages', 's1_e3_mq-arb')), !!(await io.lire('marquages', 's2_e2_mq-arb'))];
    r.retraitSeance = await essai(() => io.appliquerMarquages('s1', [{ eleveId: 'e3', marqueurId: 'mq-arb', op: 'retirer' }]));
    r.retraitEleve = await essai(() => io.appliquerMarquages('s2', [{ eleveId: 'e2', marqueurId: 'mq-arb', op: 'retirer' }]));
    r.retraitApres = [!!(await io.lire('marquages', 's1_e3_mq-arb')), !!(await io.lire('marquages', 's2_e2_mq-arb'))];
    return r;
  });
  // Séance : prémisses (séance absente, appel recréé présent, élève présent), puis refus nommé et aucune pose.
  expect(res.seancePremisses).toEqual({ seance: null, appel: true, eleve: true });
  expect(res.seance).toEqual({ erreur: 'séance supprimée entre-temps : rechargez la page', nom: 'Error' });
  expect(res.seancePoses).toBe(0);
  // Élève : prémisses, refus nommé, aucune pose ; « ignorer » l'écarte et laisse passer le témoin.
  expect(res.elevePremisses).toEqual({ eleve: null, appel: true, seance: true });
  expect(res.eleve).toEqual({ erreur: 'élève introuvable : rechargez la page', nom: 'Error' });
  expect(res.ignorer.valeur?.ignores).toEqual([{ eleveId: 'e2', marqueurId: 'mq-arb' }]);
  expect(res.ignorer.valeur?.creees).toEqual([{ eleveId: 'e3', marqueurId: 'mq-arb' }]);
  expect(res.elevePoses).toBe(0);
  // Témoin du retrait : les deux poses orphelines existaient, les deux retraits résolvent, les lignes ont disparu.
  expect(res.retraitPremisses).toEqual([true, true]);
  expect(res.retraitSeance.erreur).toBeUndefined();
  expect(res.retraitEleve.erreur).toBeUndefined();
  expect(res.retraitApres).toEqual([false, false]);
});

test('MQ-24 — textes de la v0.14.2 : la carte « Plus » promet la pose, l’écran du vocabulaire n’annonce plus la prochaine version', async ({ page }) => {
  // La carte « Plus » : le texte du §6.5 (apostrophes typographiques), plus aucune promesse « bientôt ».
  await page.goto('/#/plus');
  const lien = page.locator('#vue a[href="#/marqueurs"]');
  await expect(lien).toHaveCount(1); // témoin : la carte existe, c'est bien elle qu'on lit
  await expect(lien.locator('h2')).toHaveText('Marqueurs de séance');
  await expect(lien.locator('p')).toHaveText('Rôles, équipes et comportements posés d’un tap pendant l’appel.');
  await expect(lien).not.toContainText('bientôt');

  // L'écran du vocabulaire : la carte d'introduction est rendue (témoin : c'est elle qui portait le paragraphe
  // provisoire), et ni #mq-bientot, ni sa classe, ni l'annonce de la « prochaine version » n'existent plus.
  await page.goto('/#/marqueurs');
  const intro = page.locator('#vue .carte', { hasText: 'corriger une faute' });
  await expect(intro).toHaveCount(1);
  await expect(intro.locator('h2')).toHaveText('Rôles, équipes, comportements');
  await expect(page.locator('#mq-bientot')).toHaveCount(0);
  await expect(page.locator('.mq-provisoire')).toHaveCount(0);
  await expect(page.locator('#vue')).not.toContainText('prochaine version');
  await expect(intro).not.toContainText('bientôt');
});

test('MQ-25 — échecs durables : en session par identifiants, réaffichés, réalignés, écartés quand ils sont rattrapés ou obsolètes', async ({ page }) => {
  await peupler(page, { eleves: 2, vocabulaire: [MQ.arb, MQ.e1] });
  await ouvrirAppel(page, 's1', 2);
  const ligne = page.locator('.barre-appel .grille-echec');
  await expect(ligne).toBeHidden(); // aucun échec au départ
  // (1) Un échec : session par IDENTIFIANTS, « derniers utilisés » intacts ; la ligne, recouverte tant que la feuille est
  // ouverte (le relais est alors le toast, dans la feuille : ECR-21), est sous le pouce dès qu'elle se ferme (revue v0.14.2, R21).
  await panne(page, { fois: 1 });
  await feuilleDe(page, 1);
  await bouton(page, 'Arbitre').click();
  await finRafale(page);
  await expect(page.locator('.toast', { hasText: 'Non enregistré : Arbitre pour Prenom1 NOM01' })).toHaveCount(1); // prémisse : l'échec a eu lieu
  await expect(ligne).toContainText('Arbitre pour Prenom1 NOM01');
  const session = await lireSession(page);
  expect(session).toContain('e1');
  expect(session).toContain('mq-arb');
  expect(session).not.toContain('Prenom1');
  expect(session).not.toContain('NOM01');
  expect(await lireRecents(page)).toBeUndefined(); // jamais sur l'intention d'une pose qui échoue
  await fermerFeuille(page);
  await page.evaluate(() => { for (const t of document.querySelectorAll('.toasts .toast')) t.remove(); }); // ils passent devant la barre, exprès
  expect(await auPremierPlan(ligne)).toBe(true);
  // (2) Sortie puis retour : réaffichée.
  await rouvrirAppel(page, 's1', 2);
  await expect(ligne).toBeVisible();
  await expect(ligne).toContainText('Arbitre pour Prenom1 NOM01');
  // (3) Rattrapé derrière la vue : écarté dès l'ouverture, clé de session supprimée.
  await page.evaluate(async () => (await import('/js/io.js')).appliquerMarquages('s1', [{ eleveId: 'e1', marqueurId: 'mq-arb', op: 'poser' }]));
  await rouvrirAppel(page, 's1', 2);
  await expect(ligne).toBeHidden();
  expect(await lireSession(page)).toBeNull();
  // (4) Obsolète : l'échec d'une pose dont le marqueur est archivé depuis est écarté.
  await panne(page, { fois: 1 });
  await feuilleDe(page, 2);
  await bouton(page, 'Équipe 1').click();
  await finRafale(page);
  await expect(ligne).toContainText('Équipe 1 pour Prenom2 NOM02'); // prémisse : l'échec a eu lieu
  await fermerFeuille(page);
  await page.evaluate(async () => (await import('/js/io.js')).ecrireMarqueur('mq-e1', { archivee: true }));
  await rouvrirAppel(page, 's1', 2);
  await expect(ligne).toBeHidden();
  expect(await lireSession(page)).toBeNull();
  // (5) Élève sorti de la vue (parti) : ni affiché, ni perdu.
  await panne(page, { fois: 1 });
  await feuilleDe(page, 2);
  await bouton(page, 'Arbitre').click();
  await finRafale(page);
  await expect(ligne).toContainText('Arbitre pour Prenom2 NOM02'); // prémisse : l'échec a eu lieu
  await fermerFeuille(page);
  await page.evaluate(async () => (await import('/js/io.js')).enregistrer('eleves', { id: 'e2', classeId: 'c1', nom: 'NOM02', prenom: 'Prenom2', actif: false }));
  await rouvrirAppel(page, 's1', 1);
  await expect(ligne).toBeHidden();
  expect(await lireSession(page)).toContain('e2');
  // (6) De retour dans la vue : réaffiché ; un tap réussi l'efface.
  await page.evaluate(async () => (await import('/js/io.js')).enregistrer('eleves', { id: 'e2', classeId: 'c1', nom: 'NOM02', prenom: 'Prenom2', actif: true }));
  await rouvrirAppel(page, 's1', 2);
  await expect(ligne).toBeVisible();
  await expect(ligne).toContainText('Arbitre pour Prenom2 NOM02');
  await feuilleDe(page, 2);
  await bouton(page, 'Arbitre').click();
  await finRafale(page);
  expect((await lirePoses(page)).map((p) => p.id)).toContain('s1_e2_mq-arb'); // prémisse : la pose a réussi
  await expect(ligne).toBeHidden();
  expect(await lireSession(page)).toBeNull();
});

// Addendum A5 (plan C29, E50) : `chargerPrefs` avale un JSON cassé, pas une valeur d'une AUTRE FORME ; la vue ne retient de
// « marqueursRecents » qu'un tableau de chaînes.
test('MQ-26 — « derniers utilisés » illisibles (autre forme, tableau de non-chaînes, JSON cassé) : l’appel s’affiche, la feuille garde l’ordre du catalogue', async ({ page }) => {
  const erreurs = [];
  page.on('console', (m) => { if (m.type() === 'error') erreurs.push(m.text()); });
  page.on('pageerror', (e) => erreurs.push(String(e)));
  await peupler(page, { vocabulaire: [MQ.obs, MQ.coa, MQ.arb] });
  const catalogue = ['Arbitre', 'Coach', 'Observateur'];
  const cas = [
    { nom: 'une chaîne au lieu d’une liste', brut: JSON.stringify({ theme: 'auto', marqueursRecents: 'mq-obs' }), lu: 'mq-obs' },
    { nom: 'une liste de non-chaînes', brut: JSON.stringify({ theme: 'auto', marqueursRecents: [3, null, { id: 'mq-obs' }] }), lu: [3, null, { id: 'mq-obs' }] },
    { nom: 'un JSON cassé', brut: '{"theme":"auto","marqueursRecents":["mq-obs"', lu: undefined },
  ];
  for (const x of cas) {
    await page.evaluate((b) => localStorage.setItem('carnet-eps:prefs', b), x.brut);
    await page.goto('/'); // chargement neuf, hors de #/appel/s1 (sinon ouvrirAppel ne changerait pas d'adresse)
    // Prémisse : la valeur piégée est bien celle que chargerPrefs a lue.
    expect(await page.evaluate(async () => (await import('/js/state.js')).etat.prefs.marqueursRecents), x.nom).toEqual(x.lu);
    await ouvrirAppel(page, 's1', 3);
    await expect(page.locator('#vue'), x.nom).not.toContainText('Affichage impossible');
    await feuilleDe(page, 1);
    expect(await dialogue(page).locator('.btn-marqueur span:last-child').allTextContents(), x.nom).toEqual(catalogue);
    await fermerFeuille(page);
  }
  // Et l'écriture suivante repart d'une liste propre : les non-chaînes ne sont jamais recopiées.
  await page.evaluate((b) => localStorage.setItem('carnet-eps:prefs', b), cas[1].brut);
  await page.goto('/');
  await ouvrirAppel(page, 's1', 3);
  await feuilleDe(page, 1);
  await bouton(page, 'Coach').click();
  await finRafale(page);
  expect((await lirePoses(page)).map((p) => p.id)).toEqual(['s1_e1_mq-coa']); // prémisse : la pose a réussi
  expect(await lireRecents(page)).toEqual(['mq-coa']);
  expect(erreurs).toEqual([]);
});

// ---------------------------------------------------------------------------
// Revue adversariale de la v0.14.2 (2026-09-28) — arbitrage D7 (données et logique). Deux pages du MÊME contexte = deux
// onglets du même appareil : une seule base IndexedDB, deux sessionStorage.
// ---------------------------------------------------------------------------

// R01 : après chaque retour RÉUSSI, la vue relit TOUTE la séance (§6.2 point 4). Un échec durable que cette relecture contredit
// (la même pose, faite dans un autre onglet) doit être écarté aussitôt : sinon la ligne dit « non enregistré » d'une pose qui
// l'est, et le geste qu'elle suggère (retaper « Arbitre ») la RETIRE.
test('MQ-27 — deux onglets : un échec rattrapé ailleurs est écarté dès le retour réussi suivant ; un échec non rattrapé reste', async ({ page, context }) => {
  await peupler(page, { vocabulaire: [MQ.arb, MQ.coa] });
  await ouvrirAppel(page, 's1', 3); // onglet B
  const ligne = page.locator('.barre-appel .grille-echec');
  // Deux échecs dans B : « Arbitre » pour e1 (sera rattrapé ailleurs), « Coach » pour e2 (témoin : ne le sera pas).
  await panne(page, { fois: 1 });
  await feuilleDe(page, 1);
  await bouton(page, 'Arbitre').click();
  await finRafale(page);
  await fermerFeuille(page);
  await panne(page, { fois: 1 });
  await feuilleDe(page, 2);
  await bouton(page, 'Coach').click();
  await finRafale(page);
  await fermerFeuille(page);
  await expect(ligne).toContainText('Arbitre pour Prenom1 NOM01'); // prémisses : les deux échecs sont affichés…
  await expect(ligne).toContainText('Coach pour Prenom2 NOM02');
  expect(await lireSession(page)).toContain('mq-arb'); // … et gardés en session
  expect(await lirePoses(page)).toEqual([]);
  // Onglet A : la même pose « Arbitre » sur e1 réussit.
  const a = await context.newPage();
  await a.goto('/');
  await ouvrirAppel(a, 's1', 3);
  await feuilleDe(a, 1);
  await bouton(a, 'Arbitre').click();
  await finRafale(a);
  await a.close();
  expect((await lirePoses(page)).map((p) => p.id)).toEqual(['s1_e1_mq-arb']); // prémisse : rattrapé en base
  await expect(ligne).toContainText('Arbitre pour Prenom1 NOM01'); // prémisse : B ne le sait pas encore
  // Onglet B : une AUTRE pose réussit (e3) — son retour relit toute la séance.
  await feuilleDe(page, 3);
  await bouton(page, 'Coach').click();
  await finRafale(page);
  await fermerFeuille(page);
  expect((await lirePoses(page)).map((p) => p.id)).toEqual(['s1_e1_mq-arb', 's1_e3_mq-coa']); // prémisse : la relecture voit Arbitre
  await expect(ligne).toHaveText('Non enregistré : Coach pour Prenom2 NOM02 — Mémoire pleine (test) — mémoire de l’appareil pleine, exportez une sauvegarde (Plus → Sauvegarde), puis libérez de l’espace sur l’appareil.');
  const session = await lireSession(page);
  expect(session).not.toContain('mq-arb'); // l'échec rattrapé quitte aussi la session…
  expect(session).toContain('mq-coa'); // … l'autre y reste
  // La feuille de e1 montre « Arbitre » posé, sans ligne qui dise le contraire : le tap suivant sera un retrait VOULU.
  await feuilleDe(page, 1);
  await expect(bouton(page, 'Arbitre')).toHaveAttribute('aria-pressed', 'true');
});

// R06 : la relecture de toute la séance apporte aussi les poses et retraits faits dans l'autre onglet. Toute carte dont les
// poses confirmées ont changé est repeinte : sinon la carte contredit sa propre feuille, et un tap « pour retirer ce que
// montre la carte » fait une POSE.
test('MQ-28 — deux onglets : après sa propre pose, la vue repeint toute carte que la base a changée ; la carte et la feuille ne se contredisent jamais', async ({ page, context }) => {
  await peupler(page, { vocabulaire: [MQ.arb, MQ.e1], poses: posesDe('s1', 'e3', MQ.e1) });
  await ouvrirAppel(page, 's1', 3); // onglet A
  await expect(rangeeDe(page, 2).locator('.mq-code')).toHaveCount(0); // prémisses : e2 sans pose, e3 en Équipe 1
  await expect(rangeeDe(page, 3).locator('.mq-code')).toHaveText(['E1']);
  // Onglet B : « Équipe 1 » posée sur e2 et retirée de e3.
  const b = await context.newPage();
  await b.goto('/');
  await ouvrirAppel(b, 's1', 3);
  await feuilleDe(b, 2);
  await bouton(b, 'Équipe 1').click();
  await finRafale(b);
  await fermerFeuille(b);
  await feuilleDe(b, 3);
  await bouton(b, 'Équipe 1').click();
  await finRafale(b);
  await fermerFeuille(b);
  await b.close();
  expect((await lirePoses(page)).map((p) => p.id)).toEqual(['s1_e2_mq-e1']); // prémisse : la base a changé
  await expect(rangeeDe(page, 2).locator('.mq-code')).toHaveCount(0); // prémisse : A est périmé (aucune synchro entre onglets)
  await expect(rangeeDe(page, 3).locator('.mq-code')).toHaveText(['E1']);
  // A pose « Arbitre » sur e1 : son retour relit la séance entière.
  await feuilleDe(page, 1);
  await bouton(page, 'Arbitre').click();
  await finRafale(page);
  await fermerFeuille(page);
  await expect(rangeeDe(page, 1).locator('.mq-code')).toHaveText(['ARB']); // témoin : la carte touchée
  await expect(rangeeDe(page, 2).locator('.mq-code')).toHaveText(['E1']);
  await expect(rangeeDe(page, 2).locator('.sr-only')).toHaveText('Marqueurs : Équipe 1');
  await expect(rangeeDe(page, 3).locator('.mq-code')).toHaveCount(0);
  // Et chaque feuille dit la même chose que sa carte.
  await feuilleDe(page, 2);
  await expect(bouton(page, 'Équipe 1')).toHaveAttribute('aria-pressed', 'true');
  await fermerFeuille(page);
  await feuilleDe(page, 3);
  await expect(bouton(page, 'Équipe 1')).toHaveAttribute('aria-pressed', 'false');
});

// R26 : §6.2 point 4 — « une rafale d'une ouverture précédente se termine AVANT les lectures de la vue ». Sans l'attente, la
// vue rouverte lit « marquages » entre deux écritures de la file (au-delà d'environ cinq écritures en attente, mesuré par
// la revue) : elle montre moins de poses que la base, et l'échec de la fin de rafale, pas encore en session, est effacé par
// sa propre réécriture de la session. Neuf poses en file : la marge est large des deux côtés.
test('MQ-29 — sortie puis retour pendant une rafale : la vue rouverte attend la fin de la file et montre l’état final, échec compris', async ({ page }) => {
  const neuf = [MQ.arb, MQ.obs, MQ.coa, MQ.e1, MQ.e2, MQ.rec,
    { id: 'mq-bav', libelle: 'Bavardage', court: 'BAV', genre: 'comportement' },
    { id: 'mq-sec', libelle: 'Sécurité', court: 'SEC', genre: 'comportement' },
    { id: 'mq-enc', libelle: 'Encouragé', court: 'ENC', genre: 'comportement' }];
  await peupler(page, { vocabulaire: neuf });
  await ouvrirAppel(page, 's1', 3);
  await feuilleDe(page, 1);
  await retenirPremierPut(page, 'marquages');
  // La DERNIÈRE pose de la rafale tombe en panne (mémoire pleine) ; les huit autres réussissent.
  await page.evaluate(() => {
    const put = IDBObjectStore.prototype.put;
    window.__panneServie = false;
    IDBObjectStore.prototype.put = function (...a) {
      if (this.name === 'marquages' && a[0]?.marqueurId === 'mq-enc') { window.__panneServie = true; throw new DOMException('Mémoire pleine (test)', 'QuotaExceededError'); }
      return put.apply(this, a);
    };
  });
  for (const m of neuf) await bouton(page, m.libelle).click();
  await expect.poll(() => page.evaluate(() => window.__tenue)).toBe(true); // prémisse : la première écriture est EN COURS
  await expect(dialogue(page).locator('[aria-busy="true"]')).toHaveCount(9); // prémisse : neuf écritures en file
  await fermerFeuille(page);
  // Sortie puis retour SANS attendre les rendus : ils attendent eux aussi la transaction tenue ; puis libération.
  await page.evaluate(() => { window.__vuePrecedente = document.getElementById('vue'); location.hash = '#/appel'; });
  await page.evaluate(() => { location.hash = '#/appel/s1'; });
  await page.evaluate(() => { window.__liberer = true; });
  await expect.poll(() => page.evaluate(() => {
    const v = document.getElementById('vue');
    return v !== window.__vuePrecedente && document.activeElement === v && v.querySelectorAll('.btn-eleve').length === 3;
  })).toBe(true);
  const huit = neuf.slice(0, 8).map((m) => m.id).sort();
  await expect.poll(async () => (await lirePoses(page)).map((p) => p.marqueurId).sort()).toEqual(huit); // prémisse : la base
  expect(await page.evaluate(() => window.__panneServie)).toBe(true); // prémisse : la panne a servi, à la neuvième pose
  // La vue rouverte montre l'état FINAL : l'échec de la neuvième pose (ligne durable), et les huit poses (feuille).
  await expect(page.locator('.barre-appel .grille-echec')).toContainText('Encouragé pour Prenom1 NOM01');
  await feuilleDe(page, 1);
  await expect(dialogue(page).locator('.btn-marqueur[aria-pressed="true"]')).toHaveCount(8);
  await expect(bouton(page, 'Encouragé')).toHaveAttribute('aria-pressed', 'false');
});

// R03 : une sauvegarde tierce, ACCEPTÉE à l'import, range l'appel d'un autre élève sous la clé « s1_e1 » (porteur e9, hors de
// la vue, ou e3, dans la vue). La vue repère un appel par élève : e1 lui paraît non appelé. « Terminer l'appel » ne doit ni
// planter après avoir écrit (« Appel non terminé : Cannot read… », compteurs faux), ni boucler sur « déjà saisi », ni écraser
// la ligne de l'autre élève. Ordre des preuves : d'abord ce que la VUE garantit (aucune erreur, l'écran dit la base), puis le
// refus d'io.js (rien d'écrit, refus dit).
test('MQ-30 — « Terminer l’appel » sur une sauvegarde dont un appel porte la clé d’un autre élève : aucune erreur, l’écran dit la base, refus dit et rien d’écrit', async ({ page }) => {
  const erreurs = [];
  page.on('console', (m) => { if (m.type() === 'error') erreurs.push(m.text()); });
  page.on('pageerror', (e) => erreurs.push(String(e)));
  await peupler(page, { appels: [] });
  const LIBELLE = { present: 'Présent', absent: 'Absent' };
  for (const porteur of ['e9', 'e3']) {
    const tierce = { id: 's1_e1', seanceId: 's1', eleveId: porteur, statut: 'absent', minutesRetard: null, commentaire: 'tierce' };
    await page.evaluate(async (ligne) => {
      const io = await import('/js/io.js');
      const dump = await io.exporterJSON();
      dump.stores.appels = [ligne];
      await io.importerJSON(JSON.parse(JSON.stringify(dump))); // validerExport compris : la sauvegarde est ACCEPTÉE
    }, tierce);
    expect(await lireAppel(page, 's1_e1'), porteur).toEqual(tierce); // prémisse : la ligne tierce est en base
    await rouvrirAppel(page, 's1', 3);
    const saisis = porteur === 'e3' ? 1 : 0;
    await expect(page.locator('.compteurs .note-inline'), porteur).toHaveText(`${saisis}/3 saisis`); // prémisse : e1 non appelé
    await expect(btnTerminer(page), porteur).toHaveText(`Terminer l’appel · ${3 - saisis} passés en présent`);
    await btnTerminer(page).click();
    await expect(page.locator('.toasts .toast').first(), porteur).toBeVisible(); // le geste a rendu son verdict
    await expect(btnTerminer(page), porteur).toBeEnabled();
    // (1) La vue ne plante pas.
    expect((await page.locator('.toasts .toast').allTextContents()).join('\n'), porteur).not.toMatch(/Cannot|undefined|null/);
    expect(erreurs, porteur).toEqual([]);
    // (2) L'écran dit la base, élève par élève (repéré par eleveId, comme la vue) : compteur « saisis » et statut de la carte.
    const base = await page.evaluate(async () => (await import('/js/io.js')).parIndex('appels', 'seanceId', 's1'));
    const statutDe = new Map(base.map((x) => [x.eleveId, x.statut]));
    const vue = ['e1', 'e2', 'e3'];
    await expect(page.locator('.compteurs .note-inline'), porteur).toHaveText(`${vue.filter((e) => statutDe.has(e)).length}/3 saisis`);
    for (const [i, e] of vue.entries()) {
      await expect(carteDe(page, i + 1).locator('.detail-txt'), `${porteur} : carte de ${e}`).toHaveText(statutDe.has(e) ? LIBELLE[statutDe.get(e)] : '');
    }
    // (3) io.js : la clé occupée par un AUTRE élève refuse tout — rien d'écrit, la ligne tierce intacte, le refus dit.
    expect(base, porteur).toEqual([tierce]);
    await expect(page.locator('.toast', { hasText: 'Appel non terminé' }), porteur).toHaveText('Appel non terminé : appel incohérent avec sa séance : rechargez la page');
    await expect(page.locator('.toast', { hasText: 'déjà saisi' }), porteur).toHaveCount(0);
    await page.evaluate(() => { for (const t of document.querySelectorAll('.toasts .toast')) t.remove(); });
  }
});
