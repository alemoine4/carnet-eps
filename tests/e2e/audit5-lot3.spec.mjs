// Tests de non-régression du lot 3 du 5e audit (accessibilité et mobile — rapport docs/audit-2026-09-07.md).
// Chaque test vérifie la propriété CORRIGÉE (focus visible, sémantique, contraste, mise en page
// à 320 px, impression…) ; s'il casse, c'est que le défaut est revenu.
import { test, expect } from '@playwright/test';

const STORES = ['meta', 'classes', 'eleves', 'edt', 'sequences', 'seances', 'appels',
  'inaptitudes', 'certificats', 'fichiers', 'evaluations', 'notes', 'documents', 'observations'];

const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const today = () => iso(new Date());

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(async (stores) => {
    const io = await import('/js/io.js');
    await io.ouvrirDB();
    for (const s of stores) await io.vider(s);
  }, STORES);
});

async function seedClasse(page, n = 3) {
  await page.evaluate(async ({ n, today }) => {
    const io = await import('/js/io.js');
    await io.enregistrer('classes', { id: 'c1', nom: '6A', archivee: false });
    for (let i = 0; i < n; i++) await io.enregistrer('eleves', { id: 'e' + i, classeId: 'c1', nom: 'NOM' + i, prenom: 'Prenom' + i, actif: true, notesPerso: i === 0 ? 'asthme' : '' });
    await io.enregistrer('sequences', { id: 'sq', classeId: 'c1', apsa: 'Bad', nbSeancesPrevu: 5, dateDebut: '2020-01-01', dateFin: '2099-12-31' });
    await io.enregistrer('seances', { id: 'se', sequenceId: 'sq', date: today, edtId: null, numero: 1, annulee: false });
    await io.enregistrer('appels', { id: 'se_e0', seanceId: 'se', eleveId: 'e0', statut: 'oubli_tenue' });
    await io.enregistrer('evaluations', { id: 'ev', sequenceId: 'sq', titre: 'Eval', date: today, type: 'note20', coef: 1 });
    await io.enregistrer('notes', { id: 'ev_e0', evaluationId: 'ev', eleveId: 'e0', valeur: 12 });
  }, { n, today: today() });
}

// Contraste WCAG entre deux couleurs CSS « rgb(r, g, b) ».
const contraste = (a, b) => {
  const lum = (s) => {
    const [r, g, b2] = s.match(/\d+/g).map(Number).map((v) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b2;
  };
  const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
};

// ---------------------------------------------------------------------------
// Focus, clavier, lecteur d'écran
// ---------------------------------------------------------------------------

test('B01 — grille d’appel : l’anneau de focus est intérieur, donc visible malgré overflow:hidden', async ({ page }) => {
  await seedClasse(page, 2);
  await page.goto('/#/appel/se');
  await expect(page.locator('.btn-eleve')).toHaveCount(2);
  await page.keyboard.press('Tab');
  // Le 1er Tab depuis la vue focalisée tombe sur « ← Appel » ; on cible la carte directement.
  await page.locator('.eleve-cycle').first().focus();
  const info = await page.evaluate(() => {
    const a = document.activeElement;
    const cs = getComputedStyle(a);
    return { cible: a.className, offset: cs.outlineOffset, largeur: cs.outlineWidth, parentOverflow: getComputedStyle(a.parentElement).overflow, visible: a.matches(':focus-visible') };
  });
  expect(info.cible).toBe('eleve-cycle');
  expect(info.parentOverflow).toBe('hidden');
  expect(info.offset).toBe('-3px'); // à l'intérieur de la zone de rognage
  expect(info.largeur).toBe('3px');
});

test('B03 — « Ajouter une photo » et « Remplacer la pièce » sont de vrais boutons atteignables au clavier', async ({ page }) => {
  await seedClasse(page, 1);
  await page.evaluate(async () => {
    const io = await import('/js/io.js');
    await io.enregistrer('inaptitudes', { id: 'in', eleveId: 'e0', type: 'totale', dateDebut: '2026-09-01', dateFin: '' });
  });
  await page.goto('/#/eleves/fiche/e0');
  const btnPhoto = page.getByRole('button', { name: 'Ajouter une photo' });
  await expect(btnPhoto).toBeVisible();
  await btnPhoto.focus();
  expect(await page.evaluate(() => document.activeElement.textContent)).toBe('Ajouter une photo');
  // Le bouton relaie le clic au champ fichier (sélecteur natif) : on l'observe via l'événement click de l'input.
  const relaye = await page.evaluate(() => new Promise((r) => {
    const inp = document.querySelector('input[type=file][accept="image/*"]');
    inp.addEventListener('click', (e) => { e.preventDefault(); r(true); }, { once: true });
    document.activeElement.click();
    setTimeout(() => r(false), 500);
  }));
  expect(relaye).toBe(true);
  await page.goto('/#/inaptitudes/in');
  const btnPiece = page.getByRole('button', { name: 'Ajouter une photo / un PDF' });
  await expect(btnPiece).toBeVisible();
  await btnPiece.focus();
  expect(await page.evaluate(() => document.activeElement.tagName)).toBe('BUTTON');
});

test('B05 / B30 / B12 — marge de focus sous l’en-tête collant, police à 100 %, marges latérales de sécurité', async ({ page }) => {
  const res = await page.evaluate(() => {
    const regles = [...document.styleSheets].flatMap((s) => [...s.cssRules]).filter((r) => r.selectorText);
    const html = regles.find((r) => r.selectorText === 'html');
    const btn = document.createElement('button'); document.body.append(btn);
    const smt = getComputedStyle(btn).scrollMarginTop; btn.remove();
    // env(safe-area-inset-*) vaut 0 hors encoche : c'est le TEXTE des déclarations qui porte la preuve.
    const decl = (sel, prop) => regles.filter((r) => r.selectorText === sel).map((r) => r.style.getPropertyValue(prop)).join('|');
    return { fontHtml: html?.style.fontSize, scrollMarginTop: smt, vueGauche: decl('.vue', 'padding-left'), vueDroite: decl('.vue', 'padding-right'), navGauche: decl('.nav', 'padding-left'), navDroite: decl('.nav', 'padding-right') };
  });
  expect(res.fontHtml).toBe('100%');
  expect(parseFloat(res.scrollMarginTop)).toBeGreaterThanOrEqual(76);
  expect(res.vueGauche).toContain('env(safe-area-inset-left)');
  expect(res.vueDroite).toContain('env(safe-area-inset-right)');
  expect(res.navGauche).toContain('env(safe-area-inset-left)');
  expect(res.navDroite).toContain('env(safe-area-inset-right)');
});

test('B06 — contour des champs et boutons secondaires ≥ 3:1 dans les deux thèmes', async ({ page }) => {
  await page.goto('/#/eleves');
  await page.getByRole('button', { name: /Nouvelle classe/ }).click();
  for (const theme of ['clair', 'sombre']) {
    await page.evaluate((t) => { document.documentElement.dataset.theme = t; }, theme);
    const r = await page.evaluate(() => {
      const inp = document.getElementById('nc-nom');
      const btn = [...document.querySelectorAll('.btn')].find((b) => !b.classList.contains('btn-principal'));
      const fond = (e) => getComputedStyle(e).backgroundColor;
      const carte = inp.closest('.carte');
      return { champ: [getComputedStyle(inp).borderTopColor, fond(carte)], btn: [getComputedStyle(btn).borderTopColor, fond(btn)] };
    });
    expect(contraste(r.champ[0], r.champ[1]), `champ ${theme}`).toBeGreaterThanOrEqual(3);
    expect(contraste(r.btn[0], r.btn[1]), `bouton ${theme}`).toBeGreaterThanOrEqual(3);
  }
});

test('B07 — les tableaux de synthèse sont de vrais tableaux : display table, scope, en-tête de ligne, légende, région défilable', async ({ page }) => {
  await seedClasse(page, 2);
  for (const [route, label] of [['/#/appel/recap/c1', 'Récapitulatif 6A'], ['/#/notes/releve/c1', null], ['/#/eleves/fiche/e0', 'Appels par trimestre']]) {
    await page.goto(route);
    const t = page.locator('table.table-apercu').first();
    await expect(t).toBeVisible();
    const info = await t.evaluate((tab) => ({
      display: getComputedStyle(tab).display,
      caption: tab.querySelector('caption')?.textContent.length > 10,
      scopesCol: [...tab.querySelectorAll('thead th')].every((th) => th.getAttribute('scope') === 'col'),
      enTeteLigne: tab.querySelector('tbody tr th[scope="row"]') !== null,
      region: tab.parentElement.getAttribute('role') === 'region' && tab.parentElement.tabIndex === 0 && !!tab.parentElement.getAttribute('aria-label'),
      overflowParent: getComputedStyle(tab.parentElement).overflowX,
      cellulesSeules: [...tab.querySelectorAll('tr')].every((tr) => [...tr.children].every((x) => ['TH', 'TD'].includes(x.tagName))), // rien hors cellule (revue)
    }));
    expect(info, route).toEqual({ display: 'table', caption: true, scopesCol: true, enTeteLigne: true, region: true, overflowParent: 'auto', cellulesSeules: true });
  }
  // Récap : la colonne ⚠ de l'élève au seuil porte son texte DANS la cellule (e0 a 3 oublis ci-dessous)
  await page.evaluate(async () => { const io = await import('/js/io.js'); for (let i = 1; i <= 2; i++) { await io.enregistrer('seances', { id: 's' + i, sequenceId: 'sq', date: '2099-01-0' + i }); await io.enregistrer('appels', { id: `s${i}_e0`, seanceId: 's' + i, eleveId: 'e0', statut: 'oubli_tenue' }); } });
  await page.goto('/#/appel/recap/c1');
  await page.locator('#rc-fin').fill('2099-12-31');
  await expect(page.locator('tbody tr').first().locator('td').last()).toContainText('seuil atteint');
});

test('B17 / B18 — menu de statuts : statut courant exposé par aria-pressed, bordures par tokens thématisés', async ({ page }) => {
  await seedClasse(page, 1);
  await page.goto('/#/appel/se');
  await page.locator('.eleve-menu').first().click();
  const grille = page.locator('dialog .grille-statuts');
  await expect(grille.getByRole('button', { name: 'Oubli de tenue' })).toHaveAttribute('aria-pressed', 'true');
  await expect(grille.getByRole('button', { name: 'Présent' })).toHaveAttribute('aria-pressed', 'false');
  await grille.getByRole('button', { name: 'Absent' }).click();
  await page.locator('.eleve-menu').first().click();
  await expect(page.locator('dialog .grille-statuts').getByRole('button', { name: 'Absent' })).toHaveAttribute('aria-pressed', 'true');
  const bordures = await page.evaluate(() => [...document.querySelectorAll('dialog .grille-statuts .btn-statut')].map((b) => b.style.borderColor));
  expect(bordures.every((b) => b.startsWith('var(--stb-'))).toBe(true);
  // Fiche élève : chips et historique via les mêmes tokens
  await page.keyboard.press('Escape');
  await page.goto('/#/eleves/fiche/e0');
  await expect(page.locator('.rang-chips .badge').first()).toBeVisible(); // rendu asynchrone de la fiche
  const chips = await page.evaluate(() => [...document.querySelectorAll('.rang-chips .badge')].map((b) => b.getAttribute('style') || ''));
  expect(chips.some((s) => s.includes('var(--stb-absent)'))).toBe(true); // le statut vient d'être passé « absent » ci-dessus
});

test('B19 — les boutons qui déplient un formulaire exposent aria-expanded', async ({ page }) => {
  await seedClasse(page, 1);
  for (const [route, nom] of [['/#/eleves', /Nouvelle classe/], ['/#/eleves/classe/c1', /Ajouter un élève/], ['/#/notes', /Nouvelle évaluation/], ['/#/sequences', /Nouvelle séquence/], ['/#/documents', /Ajouter un document/], ['/#/edt', /Ajouter un créneau/]]) {
    await page.goto(route);
    const b = page.getByRole('button', { name: nom });
    await expect(b, route).toHaveAttribute('aria-expanded', 'false');
    await b.click();
    await expect(b, route).toHaveAttribute('aria-expanded', 'true');
    expect(await page.evaluate(() => ['INPUT', 'SELECT'].includes(document.activeElement.tagName)), `${route} focus dans le formulaire`).toBe(true);
    await b.click();
    await expect(b, route).toHaveAttribute('aria-expanded', 'false');
  }
});

test('B20 — changer un select sur la fiche élève re-rend la vue sans perdre le focus', async ({ page }) => {
  await seedClasse(page, 1);
  await page.goto('/#/eleves/fiche/e0');
  await page.locator('#f-actif').focus();
  await page.locator('#f-actif').selectOption('parti');
  await expect(page.locator('#vue')).toContainText('parti');
  await expect.poll(() => page.evaluate(() => document.activeElement?.id)).toBe('f-actif');
});

test('B21 / B47 — import : labels des radios sans contrôle enfant et fieldset ; groupes de cases nommés', async ({ page }) => {
  await seedClasse(page, 1);
  await page.goto('/#/eleves/import');
  await page.locator('textarea[aria-label="Données CSV collées"]').fill('Nom;Prénom\nX;Y');
  await page.getByRole('button', { name: 'Analyser' }).click();
  await expect(page.locator('#dest-existante')).toHaveCount(1); // afficherMapping est ASYNCHRONE : sans cette attente, le test lisait un écran vide sur une machine lente (intégration continue, 2026-09-09)
  const info = await page.evaluate(() => {
    const labels = [...document.querySelectorAll('label[for^="dest-"]')];
    return {
      nbLabels: labels.length, // every() sur une liste VIDE vaut true : le compte porte la preuve
      labelsSansControle: labels.every((l) => !l.querySelector('select, input[type=text]')),
      fieldset: !!document.querySelector('fieldset legend')?.textContent.includes('Classe de destination'),
      nomRadio: document.getElementById('dest-existante')?.labels?.[0]?.textContent.trim(),
    };
  });
  expect(info).toEqual({ nbLabels: 3, labelsSansControle: true, fieldset: true, nomRadio: 'Tout mettre dans :' });
  await page.goto('/#/inaptitudes/nouvelle/e0');
  await expect(page.locator('fieldset.groupe legend', { hasText: 'Restrictions' })).toHaveCount(1);
  await page.goto('/#/eleves/fiche/e0');
  await page.getByRole('button', { name: '+ Observation' }).click();
  await expect(page.locator('dialog fieldset.groupe legend', { hasText: 'Étiquettes' })).toHaveCount(1);
  expect(await page.evaluate(() => document.querySelector('dialog #obs-texte')?.labels?.[0]?.textContent)).toBe('Observation');
});

test('B22 — note refusée : aria-invalid et motif annoncé (role=alert), effacés à la saisie suivante', async ({ page }) => {
  await seedClasse(page, 1);
  await page.goto('/#/notes/eval/ev');
  const input = page.locator('.ligne-note input').first();
  await input.fill('25');
  await input.dispatchEvent('change');
  await expect(input).toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('[role="alert"]')).toContainText('Note refusée pour NOM0 Prenom0 : attendu 0 à 20, ABS, DISP ou NN');
  // Le message est rendu juste sous la ligne fautive (pas en bas d'une classe de 30) et relié au champ.
  expect(await page.evaluate(() => document.querySelector('.ligne-note').nextElementSibling?.id)).toBe('note-alerte');
  await expect(input).toHaveAttribute('aria-describedby', 'note-alerte');
  await input.fill('15');
  await input.dispatchEvent('change');
  await expect(input).not.toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('[role="alert"]')).toHaveText('');
});

test('hidden — un attribut hidden cache vraiment un .btn ou un .champ (Terminer l’appel, minutes de retard, restrictions)', async ({ page }) => {
  await seedClasse(page, 1);
  await page.goto('/#/appel/se'); // e0 déjà saisi (oubli de tenue) : appel complet dès l'ouverture
  await expect(page.locator('#vue')).toContainText('Appel complet');
  const btn = page.getByRole('button', { name: /Terminer l’appel/, includeHidden: true }); // un bouton caché sort de l'arbre d'accessibilité
  await expect(btn).toBeHidden();
  expect(await btn.evaluate((b) => b.hidden && b.getBoundingClientRect().height)).toBe(0);
  await page.locator('.eleve-menu').first().click();
  await expect(page.locator('#ap-minutes')).toBeHidden(); // statut courant ≠ retard
  await page.keyboard.press('Escape');
  await page.goto('/#/inaptitudes/nouvelle/e0');
  await page.locator('#in-type').selectOption('totale');
  await expect(page.locator('fieldset.groupe', { hasText: 'Restrictions' })).toBeHidden();
});

test('B28 — le toast porteur d’action part quand même à l’échéance malgré le focus reçu', async ({ page }) => {
  await page.evaluate(async () => { (await import('/js/ui.js')).toast('test échéance', { action: () => {}, duree: 1200 }); });
  const annuler = page.locator('.toast').getByRole('button', { name: 'Annuler' });
  await expect(annuler).toBeFocused();
  await page.waitForTimeout(1800);
  await expect(page.locator('.toast')).toHaveCount(0); // le focus programmatique n'annule pas le minuteur
});

test('B26 — changer de vue ramène en haut de page', async ({ page }) => {
  await seedClasse(page, 30);
  await page.goto('/#/eleves/classe/c1');
  await expect(page.locator('.ligne-eleve')).toHaveCount(30); // la liste doit être rendue pour que la page défile
  await page.evaluate(() => window.scrollTo(0, 2000));
  expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(300);
  // Le navigateur écrête déjà scrollY quand la vue suivante est plus courte : on prouve l'APPEL
  // explicite, et on vise une vue plus longue (relevé de 30 élèves) où l'écrêtage ne joue pas.
  await page.evaluate(() => { window.__scrolls = []; const o = window.scrollTo; window.scrollTo = (...a) => { window.__scrolls.push(a); return o.apply(window, a); }; });
  await page.evaluate(() => { location.hash = '#/notes/releve/c1'; });
  await expect(page.locator('table.table-apercu')).toBeVisible();
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
  expect(await page.evaluate(() => window.__scrolls)).toContainEqual([0, 0]);
});

test('B27 / B28 / B34 — toasts : région live permanente, focus sur « Annuler », minuteur suspendu, position PC', async ({ page }) => {
  const region = await page.evaluate(() => { const p = document.querySelector('.toasts'); return { role: p?.getAttribute('role'), live: p?.getAttribute('aria-live'), vide: p?.children.length }; });
  expect(region).toEqual({ role: 'status', live: 'polite', vide: 0 }); // présente AVANT toute notification
  await seedClasse(page, 1);
  await page.goto('/#/eleves/fiche/e0');
  await page.getByRole('button', { name: 'Supprimer définitivement' }).click();
  await page.locator('dialog.feuille-confirm .btn-danger').click();
  const annuler = page.locator('.toast').getByRole('button', { name: 'Annuler' });
  await expect(annuler).toBeFocused();
  await page.waitForTimeout(9000); // > 8 s : le toast tient (20 s + minuteur suspendu tant qu'il a le focus)
  await expect(annuler).toBeVisible();
  expect(await page.evaluate(() => document.querySelector('.toast').getAttribute('role'))).toBeNull(); // le rôle est porté par le conteneur
  await page.setViewportSize({ width: 1200, height: 800 });
  const pos = await page.evaluate(() => getComputedStyle(document.querySelector('.toasts')).left);
  expect(pos).toBe(`${1200 / 2 + 104}px`);
});

test('B29 / B50 — messages d’état annoncés (role=status), bouton de protection qui ne disparaît pas sous le focus', async ({ page }) => {
  await page.goto('/#/eleves');
  await page.getByRole('button', { name: /Nouvelle classe/ }).click();
  await page.getByRole('button', { name: 'Créer la classe' }).click();
  await expect(page.locator('p[role="status"].statut-erreur')).toContainText('Le nom est obligatoire');
  // Stub posé AVANT le chargement (un reload recréerait navigator.storage) : les deux issues sont jouées.
  for (const [accorde, libelle, etat] of [[false, 'Protection refusée', 'refusée par le navigateur'], [true, 'Protection obtenue', 'active ✓']]) {
    await page.addInitScript((ok) => {
      Object.defineProperty(navigator, 'storage', { value: { persisted: async () => false, persist: async () => ok, estimate: async () => ({ usage: 0, quota: 1 }) }, configurable: true });
    }, accorde);
    await page.goto('/#/reglages');
    await page.reload(); // document NEUF : le script d'initialisation s'applique (un simple changement de hash ne recrée pas le document)
    const btn = page.getByRole('button', { name: 'Demander la protection' });
    await expect(btn).toBeVisible();
    await btn.focus();
    await btn.click();
    await expect(page.getByRole('button', { name: libelle })).toHaveAttribute('aria-disabled', 'true'); // `disabled` ferait perdre le focus
    expect(await page.evaluate(() => document.activeElement.tagName)).toBe('BUTTON');
    await expect(page.locator('.info-ligne[role="status"]')).toContainText(etat);
  }
});

test('B36 — lien d’évitement vers la navigation, premier au clavier, sans passer par le routeur', async ({ page }) => {
  await page.goto('/#/notes');
  await page.reload(); // document neuf = vrai chargement (un changement de hash est une navigation de route, qui focalise la vue)
  // Au chargement la vue ne prend pas le focus (revue du lot 3) : le PREMIER Tab tombe sur le lien.
  await expect(page.locator('#vue .btn').first()).toBeVisible();
  expect(await page.evaluate(() => document.activeElement.tagName)).toBe('BODY');
  await page.keyboard.press('Tab');
  const info = await page.evaluate(() => { const a = document.activeElement; return { texte: a.textContent, href: a.getAttribute('href'), visible: getComputedStyle(a).transform === 'none' || getComputedStyle(a).transform === 'matrix(1, 0, 0, 1, 0, 0)' }; });
  expect(info.texte).toBe('Aller à la navigation');
  expect(info.href).toBe('#nav-principale');
  expect(info.visible).toBe(true);
  await page.keyboard.press('Enter');
  await expect.poll(() => page.evaluate(() => document.activeElement.id)).toBe('nav-principale');
  await page.waitForTimeout(400); // le routeur, s'il avait pris le hash, aurait re-rendu l'accueil et repris le focus
  expect(await page.evaluate(() => ({ hash: location.hash, focus: document.activeElement.id, vue: document.getElementById('vue').getAttribute('aria-label') })))
    .toEqual({ hash: '#/notes', focus: 'nav-principale', vue: 'Notes' });
});

test('B40 / B43 — l’appel annonce le statut appliqué ; pictogrammes doublés d’un texte pour les lecteurs d’écran', async ({ page }) => {
  await seedClasse(page, 2);
  await page.evaluate(async () => { await (await import('/js/io.js')).enregistrer('inaptitudes', { id: 'in', eleveId: 'e1', type: 'totale', origine: 'certificat', dateDebut: '2020-01-01', dateFin: '2099-12-31' }); });
  await page.goto('/#/appel/se');
  await expect(page.locator('.btn-eleve')).toHaveCount(2);
  expect(await page.evaluate(() => document.querySelector('.compteurs').getAttribute('aria-live'))).toBeNull();
  await page.locator('.eleve-cycle').first().click();
  await expect(page.locator('.sr-only[role="status"]')).toHaveText('Prenom0 NOM0 : Présent'); // tenue → présent (cycle)
  await expect(page.locator('.pastille-info .sr-only')).toHaveText('Inaptitude totale en cours');
  await page.goto('/#/eleves/classe/c1');
  await expect(page.locator('.ligne-eleve .badge .sr-only').first()).toHaveText('à savoir renseigné');
});

test('B48 / B49 — grille de notes : nom accessible dans l’ordre visible ; zone de secours stylée comme un champ', async ({ page }) => {
  await seedClasse(page, 1);
  await page.goto('/#/notes/eval/ev');
  await expect(page.getByRole('textbox', { name: 'Note de NOM0 Prenom0' })).toHaveCount(1);
  await page.evaluate(() => { navigator.clipboard.writeText = () => Promise.reject(new Error('refusé')); });
  await page.getByRole('button', { name: 'Copier pour Pronote' }).click();
  const zone = page.locator('textarea[aria-label="Colonne à copier"]');
  await expect(zone).toBeVisible();
  expect(await zone.evaluate((z) => z.parentElement.className)).toBe('champ');
  expect(await zone.evaluate((z) => getComputedStyle(z).borderTopLeftRadius)).toBe('10px');
});

// ---------------------------------------------------------------------------
// Mise en page mobile et impression
// ---------------------------------------------------------------------------

test('B09 / B32 / B33 — 320 px : pas de défilement horizontal (Documents, récap), créneau EDT qui se replie, grille d’appel à 2 colonnes', async ({ page }) => {
  await seedClasse(page, 6);
  await page.evaluate(async () => { await (await import('/js/io.js')).enregistrer('edt', { id: 'cr', jour: 1, heureDebut: '08:00', heureFin: '10:00', classeId: 'c1', semaine: 'A', installation: 'Salle polyvalente du collège' }); });
  await page.setViewportSize({ width: 320, height: 640 });
  for (const route of ['/#/documents', '/#/appel/recap/c1', '/#/edt']) {
    await page.goto(route);
    await expect(page.locator('#vue .carte:not([hidden])').first()).toBeVisible();
    const deborde = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(deborde, `${route} déborde en travers`).toBe(false);
  }
  expect(await page.evaluate(() => getComputedStyle(document.querySelector('.ligne-edt')).flexWrap)).toBe('wrap');
  await page.goto('/#/appel/se');
  await expect(page.locator('.btn-eleve')).toHaveCount(6);
  expect(await page.evaluate(() => getComputedStyle(document.querySelector('.grille-appel')).gridTemplateColumns.split(' ').length)).toBe(2);
  // Nom long : il ne doit pas passer sous le bouton « ⋯ » (le tap basculait le statut — revue du lot 3).
  await page.evaluate(async () => { await (await import('/js/io.js')).enregistrer('eleves', { id: 'e0', classeId: 'c1', nom: 'VANDENBERGHE', prenom: 'Christopher', actif: true }); });
  await page.reload();
  await expect(page.locator('.btn-eleve')).toHaveCount(6);
  const cible = await page.evaluate(() => {
    const menu = [...document.querySelectorAll('.btn-eleve')].find((c) => c.textContent.includes('VANDENBERGHE')).querySelector('.eleve-menu');
    menu.scrollIntoView({ block: 'center' }); // hors de la barre de navigation fixe du bas
    const r = menu.getBoundingClientRect();
    return document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)?.className;
  });
  expect(cible).toBe('eleve-menu');
});

test('B30 (suite) — police à 200 % : les 6 onglets restent dans l’écran de 320 px', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto('/#/accueil');
  await page.evaluate(() => { document.documentElement.style.fontSize = '32px'; }); // équivalent d'un réglage navigateur à 200 %
  const droits = await page.evaluate(() => [...document.querySelectorAll('.nav a')].map((a) => Math.round(a.getBoundingClientRect().right)));
  expect(Math.max(...droits)).toBeLessThanOrEqual(320);
});

test('B28 (suite) — « Annuler » activé au clavier : le focus ne retombe pas sur le body', async ({ page }) => {
  await seedClasse(page, 1);
  await page.goto('/#/eleves/fiche/e0');
  await page.getByRole('button', { name: 'Supprimer définitivement' }).click();
  await page.locator('dialog.feuille-confirm .btn-danger').click();
  const annuler = page.locator('.toast').getByRole('button', { name: 'Annuler' });
  await expect(annuler).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#vue')).toContainText('NOM0'); // fiche restaurée
  await expect.poll(() => page.evaluate(() => document.activeElement.tagName)).not.toBe('BODY');
});

test('statutFin — « Appel complet ✓ » n’est pas réécrit (réannoncé) à chaque tap', async ({ page }) => {
  await seedClasse(page, 1);
  await page.goto('/#/appel/se');
  await expect(page.locator('#vue')).toContainText('Appel complet');
  await page.evaluate(() => { window.__mut = 0; new MutationObserver((l) => { window.__mut += l.length; }).observe(document.querySelector('p.statut[role="status"]'), { childList: true, characterData: true, subtree: true }); });
  await page.locator('.eleve-cycle').first().click();
  await page.locator('.eleve-cycle').first().click();
  await expect.poll(() => page.evaluate(async () => (await (await import('/js/io.js')).lire('appels', 'se_e0')).statut)).toBe('absent');
  expect(await page.evaluate(() => window.__mut)).toBe(0);
});

test('B08 / B10 / B11 / B35 — impression : colonnes repliées, fonds des pastilles imprimés, pas de décalage PC, toasts masqués', async ({ page }) => {
  await seedClasse(page, 2);
  await page.setViewportSize({ width: 1200, height: 800 });
  await page.goto('/#/appel/recap/c1');
  await expect(page.locator('table.table-apercu')).toBeVisible();
  await page.evaluate(async () => { (await import('/js/ui.js')).toast('test impression'); });
  await page.emulateMedia({ media: 'print' });
  const r = await page.evaluate(() => {
    const td = document.querySelector('.table-apercu td');
    const badge = document.createElement('span'); badge.className = 'badge'; document.body.append(badge);
    const res = {
      whiteSpace: getComputedStyle(td).whiteSpace,
      scroll: getComputedStyle(document.querySelector('.table-scroll')).overflow,
      colorAdjust: getComputedStyle(badge).printColorAdjust || getComputedStyle(badge).webkitPrintColorAdjust,
      marginLeft: getComputedStyle(document.getElementById('vue')).marginLeft,
      toasts: getComputedStyle(document.querySelector('.toasts')).display,
      nav: getComputedStyle(document.querySelector('.nav')).display,
    };
    badge.remove();
    return res;
  });
  await page.emulateMedia({ media: 'screen' });
  expect(r).toEqual({ whiteSpace: 'normal', scroll: 'visible', colorAdjust: 'exact', marginLeft: '0px', toasts: 'none', nav: 'none' });
});

test('B31 (5e audit) / B31 (4e audit) — aide clavier visible sur PC et masquée sur tactile ; viewport qui se redimensionne avec le clavier virtuel', async ({ page }, infos) => {
  await seedClasse(page, 1);
  await page.goto('/#/appel/se');
  // La règle marche DANS LES DEUX SENS : visible sur un pointeur fin (PC), masquée sur un appareil
  // tactile — c'est le projet « mobile » (Pixel 7 émulé) qui le prouve (audit 2026-09-07, C60).
  const tactile = infos.project.name === 'mobile';
  await expect(page.locator('.aide-clavier')).toBeVisible({ visible: !tactile });
  // Chromium de bureau matche déjà (pointer: fine) : c'est la CONDITION de la règle qui porte la preuve
  // (tablette à pointeur grossier + clavier physique = any-pointer/any-hover).
  const cond = await page.evaluate(() => [...document.styleSheets].flatMap((s) => [...s.cssRules]).filter((r) => r.conditionText && r.cssText.includes('.aide-clavier')).map((r) => r.conditionText).join('|'));
  expect(cond).toContain('any-pointer: fine');
  expect(cond).toContain('any-hover: hover');
  const viewport = await page.evaluate(() => document.querySelector('meta[name="viewport"]').content);
  expect(viewport).toContain('interactive-widget=resizes-content');
});

test('B45 — le défilement vers le formulaire EDT respecte prefers-reduced-motion', async ({ page }) => {
  await seedClasse(page, 1);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/#/edt');
  await expect(page.getByRole('button', { name: /Ajouter un créneau/ })).toBeVisible();
  const comportement = await page.evaluate(() => new Promise((r) => {
    const orig = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = function (opts) { Element.prototype.scrollIntoView = orig; r(opts?.behavior); };
    document.querySelector('.barre-actions .btn').click();
    setTimeout(() => r('aucun appel'), 500);
  }));
  expect(comportement).toBe('auto');
});
