// Retours de l'essai sur téléphone du 2026-09-16 (v0.13.1, origine d'essai, données fictives).
// 1. « Retard, tenue et absent sont pratiquement de la même couleur » — trois teintes chaudes voisines.
// 2. « La première grille est trop collée aux boutons Nouvelle grille / Créer une évaluation ».
// ⚠ Aucune donnée nominative : élèves inventés.

import { test, expect } from '@playwright/test';

// --- Distance perceptuelle CIEDE2000 : deux couleurs séparées de moins de ~18 se confondent au premier
// coup d'œil sur une petite pastille. Le calcul vit ici pour que la garde ne dépende d'aucune valeur écrite
// en dur : elle lit les couleurs réellement servies par la feuille de style.
const versLab = ([r, g, b]) => {
  const lin = (c) => (c <= 10.31475 ? c / 3294.6 : ((c / 255 + 0.055) / 1.055) ** 2.4);
  const [R, G, B] = [r, g, b].map(lin);
  let X = (0.4124 * R + 0.3576 * G + 0.1805 * B) / 0.95047;
  let Y = 0.2126 * R + 0.7152 * G + 0.0722 * B;
  let Z = (0.0193 * R + 0.1192 * G + 0.9505 * B) / 1.08883;
  const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  [X, Y, Z] = [f(X), f(Y), f(Z)];
  return [116 * Y - 16, 500 * (X - Y), 200 * (Y - Z)];
};
const ecart = (c1, c2) => {
  const [L1, a1, b1] = versLab(c1), [L2, a2, b2] = versLab(c2);
  const C1 = Math.hypot(a1, b1), C2 = Math.hypot(a2, b2), Cb = (C1 + C2) / 2;
  const G = 0.5 * (1 - Math.sqrt(Cb ** 7 / (Cb ** 7 + 25 ** 7)));
  const A1 = (1 + G) * a1, A2 = (1 + G) * a2, Cp1 = Math.hypot(A1, b1), Cp2 = Math.hypot(A2, b2);
  const ang = (a, b) => { const x = Math.atan2(b, a) * 180 / Math.PI; return x < 0 ? x + 360 : x; };
  const h1 = Cp1 ? ang(A1, b1) : 0, h2 = Cp2 ? ang(A2, b2) : 0;
  const dL = L2 - L1, dC = Cp2 - Cp1;
  let dh = 0;
  if (Cp1 * Cp2) { dh = h2 - h1; if (dh > 180) dh -= 360; if (dh < -180) dh += 360; }
  const dH = 2 * Math.sqrt(Cp1 * Cp2) * Math.sin(dh * Math.PI / 360);
  const Lb = (L1 + L2) / 2, Cpb = (Cp1 + Cp2) / 2;
  let hb = h1 + h2;
  if (Cp1 * Cp2) { if (Math.abs(h1 - h2) > 180) hb += 360; hb /= 2; }
  const T = 1 - 0.17 * Math.cos((hb - 30) * Math.PI / 180) + 0.24 * Math.cos(2 * hb * Math.PI / 180)
    + 0.32 * Math.cos((3 * hb + 6) * Math.PI / 180) - 0.2 * Math.cos((4 * hb - 63) * Math.PI / 180);
  const Sl = 1 + 0.015 * (Lb - 50) ** 2 / Math.sqrt(20 + (Lb - 50) ** 2), Sc = 1 + 0.045 * Cpb, Sh = 1 + 0.015 * Cpb * T;
  const Rt = -2 * Math.sqrt(Cpb ** 7 / (Cpb ** 7 + 25 ** 7)) * Math.sin(60 * Math.exp(-(((hb - 275) / 25) ** 2)) * Math.PI / 180);
  return Math.sqrt((dL / Sl) ** 2 + (dC / Sc) ** 2 + (dH / Sh) ** 2 + Rt * (dC / Sc) * (dH / Sh));
};
const luminance = ([r, g, b]) => {
  const lin = (c) => (c / 255 <= 0.04045 ? c / 255 / 12.92 : ((c / 255 + 0.055) / 1.055) ** 2.4);
  const [R, G, B] = [r, g, b].map(lin);
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
};
const contraste = (a, b) => {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

// Couleurs RÉELLEMENT rendues : on fabrique une carte d'élève témoin par statut et on lit les styles
// calculés (fond de la pastille, texte de la pastille, bordure de la carte). Lire les variables CSS ne
// prouverait rien : ce que l'œil compare, ce sont ces trois valeurs, règles de la feuille appliquées.
const palette = (page, theme) => page.evaluate(async (theme) => {
  const { STATUTS } = await import('/js/metier.js');
  // « auto » : aucun attribut, c'est le bloc @media (prefers-color-scheme: dark) qui s'applique — un bloc
  // DISTINCT de :root[data-theme="sombre"], qu'un test du seul choix explicite ne voit pas.
  if (theme === 'auto') delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = theme;
  const rgb = (v) => v.match(/[\d.]+/g).slice(0, 3).map(Number);
  const el = (balise, classe, parent) => { const n = document.createElement(balise); n.className = classe; parent.append(n); return n; };
  const hote = el('div', '', document.body);
  const res = { pastille: {}, texte: {}, bordure: {} };
  for (const statut of Object.keys(STATUTS)) {
    const carte = el('div', 'btn-eleve', hote);
    carte.dataset.statut = statut;
    const badge = el('span', 'badge-statut', el('button', 'eleve-cycle', carte));
    badge.textContent = 'X';
    const sb = getComputedStyle(badge);
    res.pastille[statut] = rgb(sb.backgroundColor);
    res.texte[statut] = rgb(sb.color);
    res.bordure[statut] = rgb(getComputedStyle(carte).borderTopColor);
  }
  // Surface de la carte : mesurée sur une vraie carte, pas déduite d'une variable.
  res.surface = rgb(getComputedStyle(el('div', 'carte', hote)).backgroundColor);
  hote.remove();
  return res;
}, theme);

// Même vérification dans les deux thèmes ; deux tests écrits en toutes lettres (la garde de cohérence de la
// documentation compte les tests dans le code source).
const verifierPalette = async (page, theme) => {
  if (theme === 'auto') await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/#/accueil');
  const { pastille, texte, bordure, surface } = await palette(page, theme);
  // Le trio du tap (présent → absent → tenue) plus le retard : ce sont ceux qu'on lit d'un coup d'œil.
  const vus = ['present', 'absent', 'retard', 'oubli_tenue'];
  for (let i = 0; i < vus.length; i++) {
    for (let j = i + 1; j < vus.length; j++) {
      expect(ecart(pastille[vus[i]], pastille[vus[j]]), `pastilles ${vus[i]} / ${vus[j]}`).toBeGreaterThanOrEqual(30); // avant : 15 à 16
    }
  }
  // Le reste de la palette : jamais deux statuts en dessous du seuil de confusion, pastille comme bordure.
  const noms = Object.keys(pastille);
  for (let i = 0; i < noms.length; i++) {
    for (let j = i + 1; j < noms.length; j++) {
      expect(ecart(pastille[noms[i]], pastille[noms[j]]), `pastilles ${noms[i]} / ${noms[j]}`).toBeGreaterThanOrEqual(18);
      expect(ecart(bordure[noms[i]], bordure[noms[j]]), `bordures ${noms[i]} / ${noms[j]}`).toBeGreaterThanOrEqual(18);
    }
  }
  // Lisibilité conservée : lettre sur la pastille (AA) et bordure de carte (composant, 3:1).
  for (const nom of noms) {
    expect(contraste(pastille[nom], texte[nom]), `lettre sur ${nom}`).toBeGreaterThanOrEqual(4.5);
    expect(contraste(bordure[nom], surface), `bordure ${nom}`).toBeGreaterThanOrEqual(3);
  }
};
test('Appel (clair) — deux statuts ne se ressemblent jamais au point d’être confondus', ({ page }) => verifierPalette(page, 'clair'));
test('Appel (sombre) — deux statuts ne se ressemblent jamais au point d’être confondus', ({ page }) => verifierPalette(page, 'sombre'));
test('Appel (sombre automatique, téléphone en mode sombre) — deux statuts ne se ressemblent jamais au point d’être confondus', ({ page }) => verifierPalette(page, 'auto'));

test('Fiche élève — un statut a la même pastille que sur l’écran d’appel (retard en jaune vif)', async ({ page }) => {
  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const auj = iso(new Date());
  await page.goto('/');
  await page.evaluate(async (auj) => {
    const io = await import('/js/io.js'); await io.viderTout();
    await io.restaurer({ classes: [{ id: 'c', nom: '6ESSAI', archivee: false }],
      eleves: [{ id: 'e', classeId: 'c', nom: 'FICTIF', prenom: 'Alice', actif: true }],
      sequences: [{ id: 's', classeId: 'c', apsa: 'Badminton', dateDebut: auj, dateFin: auj }],
      seances: [{ id: 'se', sequenceId: 's', date: auj, numero: 1, theme: '', bilan: '' }],
      appels: [{ id: 'ap', seanceId: 'se', eleveId: 'e', statut: 'retard', minutesRetard: 5 }] });
  }, auj);
  await page.goto('/#/eleves/fiche/e');
  const chip = page.locator('.rang-chips .badge', { hasText: 'Retard' });
  await expect(chip).toBeVisible();
  const couleurs = await page.evaluate(() => {
    const chip = [...document.querySelectorAll('.rang-chips .badge')].find((x) => x.textContent.startsWith('Retard'));
    const historique = [...document.querySelectorAll('.liste-eleves .badge')].find((x) => x.textContent === 'R');
    const carte = document.createElement('div'); carte.className = 'btn-eleve'; carte.dataset.statut = 'retard';
    const bouton = document.createElement('button'); bouton.className = 'eleve-cycle';
    const pastille = document.createElement('span'); pastille.className = 'badge-statut';
    bouton.append(pastille); carte.append(bouton); document.body.append(carte);
    const lire = (x) => [getComputedStyle(x).backgroundColor, getComputedStyle(x).color];
    const res = { chip: lire(chip), historique: lire(historique), appel: lire(pastille) };
    carte.remove();
    return res;
  });
  expect(couleurs.chip).toEqual(couleurs.appel);
  expect(couleurs.historique).toEqual(couleurs.appel);
});

test('Grilles — les couleurs proposées pour les niveaux portent le bon nom', async ({ page }) => {
  // Les niveaux ont leur PROPRE palette : sans elle, changer la couleur d'un statut renommait en silence
  // les choix de l'éditeur de grille (« orange » devenait jaune, « rose » magenta).
  await page.goto('/#/accueil');
  const res = await page.evaluate(async () => {
    const { COULEURS_NIVEAUX } = await import('/js/grilles-calcul.js');
    // Mesure la couleur RÉELLEMENT appliquée à une case de grille (règle `.grille-niveaux [data-niveau-couleur]`),
    // et non la variable : c'est le branchement de la règle qui doit rester juste.
    const boutons = document.createElement('div');
    boutons.className = 'grille-niveaux';
    document.body.append(boutons);
    const temoin = document.createElement('button');
    boutons.append(temoin);
    const teinte = (nom) => {
      temoin.dataset.niveauCouleur = nom;
      const [r, g, b] = getComputedStyle(temoin).borderTopColor.match(/[\d.]+/g).slice(0, 3).map(Number).map((x) => x / 255);
      const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
      if (!d) return { h: null, s: 0 };
      const h = max === r ? 60 * (((g - b) / d) % 6) : max === g ? 60 * ((b - r) / d + 2) : 60 * ((r - g) / d + 4);
      return { h: (h + 360) % 360, s: d / max };
    };
    const res = Object.fromEntries(COULEURS_NIVEAUX.map((n) => [n, teinte(n)]));
    boutons.remove();
    return res;
  });
  const attendu = { rouge: [345, 15], orange: [20, 55], bleu: [200, 250], vert: [100, 170], violet: [255, 290], rose: [310, 350], turquoise: [170, 200] };
  for (const [nom, [min, max]] of Object.entries(attendu)) {
    const h = res[nom].h;
    const dedans = min > max ? (h >= min || h <= max) : h >= min && h <= max;
    expect(dedans, `« ${nom} » doit ressembler à du ${nom} (teinte mesurée ${Math.round(h)}°)`).toBe(true);
  }
  expect(res.gris.s, 'le gris doit rester peu saturé').toBeLessThan(0.35);
});

test('Grilles — la première carte n’est pas collée aux boutons de la barre d’actions', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(async () => { await (await import('/js/io.js')).viderTout(); });
  await page.goto('/#/grilles');
  const bouton = page.getByRole('button', { name: 'Nouvelle grille', exact: true });
  await expect(bouton).toBeVisible();
  const carte = page.locator('#vue .carte').first();
  await expect(carte).toBeVisible();
  const ecartVertical = await page.evaluate(() => {
    const b = [...document.querySelectorAll('#vue button')].find((x) => x.textContent === 'Nouvelle grille');
    const c = document.querySelector('#vue .carte');
    return c.getBoundingClientRect().top - b.getBoundingClientRect().bottom;
  });
  expect(ecartVertical, 'espace sous la barre d’actions').toBeGreaterThanOrEqual(12); // avant : 0
});
