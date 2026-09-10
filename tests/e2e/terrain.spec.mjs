// Non-régression des constats du TEST DE TERRAIN du 2026-09-09 (première session sur Android réel).
// ⚠ Aucune donnée nominative : les jeux d'essai reprennent la STRUCTURE d'un export Pronote réel
// (en-têtes, guillemets, colonne unique « Élèves », colonne de classe vide) avec des noms INVENTÉS.

import { test, expect } from '@playwright/test';

const STORES = ['meta', 'classes', 'eleves', 'edt', 'sequences', 'seances', 'appels',
  'inaptitudes', 'certificats', 'fichiers', 'evaluations', 'notes', 'documents', 'observations'];

const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const today = () => iso(new Date());
const jourSemaine = () => ((new Date().getDay() + 6) % 7) + 1;

// En-tête EXACT d'un export « Élèves » de Pronote (une classe) : le nom et le prénom sont dans UNE
// seule colonne, et « Classe de rattachement » est VIDE quand on exporte une seule classe.
const ENTETE = 'Élèves;Encouragement/Valorisation;Né(e) le;Sexe;Adresse E-mail;Entrée;Sortie;;Classe de rattachement;Tuteur;Cnx Ele.;Cnx Resp.;Option 1;Option 2;Option 3;Régime';
const ligne = (nomComplet, naissance, sexe) =>
  `"${nomComplet}";"";"${naissance}";"${sexe}";"";01/09/2026;;"";"";"";"";"";"ANGLAIS LV1";"ALLEMAND LV2";"";"EXTERNE LIBRE"`;
const CSV_PRONOTE = [
  ENTETE,
  ligne('MARTIN Louise', '12/05/2012', 'Féminin'),          // cas simple
  ligne('DA SILVA COSTA Emma', '15/01/2012', 'Féminin'),    // nom de famille en DEUX mots
  ligne('NOIRET Jean Baptiste', '30/06/2011', 'Masculin'),  // prénom en DEUX mots
].join('\n');

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(async (stores) => {
    const io = await import('/js/io.js');
    await io.ouvrirDB();
    for (const s of stores) await io.vider(s);
  }, STORES);
});

test('terrain — import Pronote réel : une seule colonne « Élèves » (NOM Prénom) est reconnue et scindée', async ({ page }) => {
  await page.goto('/#/eleves/import');
  await page.getByLabel('Données CSV collées').fill(CSV_PRONOTE);
  await page.getByRole('button', { name: 'Analyser' }).click();
  await expect(page.locator('#map-nom')).toBeVisible();
  // La colonne unique est détectée d'office ; Nom et Prénom séparés restent sur « ignorer ».
  await expect(page.locator('#map-nomComplet')).toHaveValue('0');
  await page.locator('#dest-nouvelle').check();
  await page.getByLabel('Nom de la nouvelle classe').fill('6A');
  await page.getByRole('button', { name: /^Importer 3 élèves$/ }).click();
  await expect(page.locator('#vue .statut').last()).toContainText('3 élèves importés dans 6A');
  const eleves = await page.evaluate(async () => (await (await import('/js/io.js')).tous('eleves')).map((e) => `${e.nom}|${e.prenom}|${e.dateNaissance}|${e.sexe}`).sort());
  expect(eleves).toEqual([
    'DA SILVA COSTA|Emma|2012-01-15|F',   // le nom de famille sur deux mots reste entier
    'MARTIN|Louise|2012-05-12|F',
    'NOIRET|Jean Baptiste|2011-06-30|M',  // le prénom sur deux mots aussi
  ]);
});

test('terrain — import Pronote réel : une colonne de classe VIDE ne pilote pas la destination', async ({ page }) => {
  await page.goto('/#/eleves/import');
  await page.getByLabel('Données CSV collées').fill(CSV_PRONOTE);
  await page.getByRole('button', { name: 'Analyser' }).click();
  await expect(page.locator('#map-nom')).toBeVisible();
  // « Classe de rattachement » existe mais toutes ses cases sont vides : le mode « colonne » serait
  // un piège (toutes les lignes seraient déclarées incomplètes).
  await expect(page.locator('#dest-colonne')).toBeDisabled();
  await expect(page.locator('#dest-nouvelle')).toBeChecked(); // base vide → création de la classe
  await expect(page.locator('#vue')).toContainText('La colonne « Classe » du fichier est vide');
});

const semerAppel = (page, n) => page.evaluate(async ({ today, jour, n }) => {
  const io = await import('/js/io.js');
  const objets = { classes: [{ id: 'c1', nom: '6A', archivee: false }], eleves: [], sequences: [], edt: [], seances: [] };
  for (let i = 0; i < n; i++) objets.eleves.push({ id: 'e' + i, classeId: 'c1', nom: 'NOM' + i, prenom: 'P', actif: true });
  objets.sequences.push({ id: 'sq', classeId: 'c1', apsa: 'Bad', nbSeancesPrevu: 6, dateDebut: '', dateFin: '' });
  objets.edt.push({ id: 'cr1', jour, heureDebut: '00:00', heureFin: '23:59', classeId: 'c1', semaine: 'AB', installation: '' });
  objets.seances.push({ id: 'se', sequenceId: 'sq', date: today, edtId: 'cr1', numero: 1, theme: '', bilan: '' });
  await io.restaurer(objets);
}, { today: today(), jour: jourSemaine(), n });

test('terrain — appel d’une classe de 28 : « Terminer l’appel » est atteignable sans dérouler la grille', async ({ page }) => {
  await semerAppel(page, 28);
  await page.setViewportSize({ width: 375, height: 812 }); // téléphone
  await page.goto('/#/appel/se');
  await expect(page.locator('.btn-eleve')).toHaveCount(28);
  const btn = page.getByRole('button', { name: /^Terminer l’appel/ });
  // Sans dérouler : le bouton doit être DANS la fenêtre, au-dessus de la barre de navigation, et
  // vraiment atteignable au doigt — rien ne doit le recouvrir à l'endroit où le pouce se pose.
  const vu = await btn.evaluate((b) => {
    const r = b.getBoundingClientRect();
    const nav = document.querySelector('.nav').getBoundingClientRect();
    const cible = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return {
      // Témoin : la page DÉBORDE vraiment (sinon le test serait vrai sans barre collante).
      pageDeborde: document.documentElement.scrollHeight > window.innerHeight + 200,
      pasDeroulee: window.scrollY === 0,
      dansLaFenetre: r.top >= 0 && r.bottom <= window.innerHeight,
      auDessusDeLaNav: r.bottom <= nav.top + 1,
      riensDessus: b.contains(cible) || cible === b,
    };
  });
  expect(vu).toEqual({ pageDeborde: true, pasDeroulee: true, dansLaFenetre: true, auDessusDeLaNav: true, riensDessus: true });
  // Et il fonctionne depuis cette position, sans faire défiler la page.
  await btn.click();
  await expect(page.locator('#vue')).toContainText('Appel complet ✓ (28/28)');
});

test('terrain — la barre collante ne vole pas la ligne d’état à l’impression', async ({ page }) => {
  await semerAppel(page, 6);
  await page.goto('/#/appel/se');
  await expect(page.locator('.btn-eleve')).toHaveCount(6);
  await page.getByRole('button', { name: /^Terminer l’appel/ }).click();
  const etat = page.locator('.barre-appel .statut');
  await expect(etat).toHaveText('Appel complet ✓ (6/6)');
  // La barre est un habillage d'écran : sur papier elle redevient un bloc ordinaire, et la ligne
  // d'état — qui s'imprimait avant ce correctif — doit rester là.
  await page.emulateMedia({ media: 'print' });
  await expect(etat).toBeVisible();
  await expect(etat).toHaveText('Appel complet ✓ (6/6)');
  expect(await page.locator('.barre-appel').evaluate((b) => getComputedStyle(b).position)).toBe('static');
});

test('terrain (revue) — une colonne « Nom et prénom » n’est pas AUSSI proposée comme « Prénom »', async ({ page }) => {
  await page.goto('/#/eleves/import');
  await page.getByLabel('Données CSV collées').fill(['Nom et prénom;Classe', 'MARTIN Louise;6A', 'NOIRET Jean Baptiste;6A'].join('\n'));
  await page.getByRole('button', { name: 'Analyser' }).click();
  await expect(page.locator('#map-nom')).toBeVisible();
  await expect(page.locator('#map-nomComplet')).toHaveValue('0');
  // Avant : la même colonne était pré-sélectionnée ici, si bien qu’en désignant une colonne « Nom »
  // à la main on obtenait un prénom « MARTIN Louise » entier.
  await expect(page.locator('#map-prenom')).toHaveValue('-1');
  await expect(page.locator('#map-nom')).toHaveValue('-1');
  await page.getByRole('button', { name: /^Importer 2 élèves$/ }).click();
  await expect(page.locator('#vue .statut').last()).toContainText('2 élèves importés');
  const eleves = await page.evaluate(async () => (await (await import('/js/io.js')).tous('eleves')).map((e) => `${e.nom}|${e.prenom}`).sort());
  expect(eleves).toEqual(['MARTIN|Louise', 'NOIRET|Jean Baptiste']);
});

test('terrain (revue) — colonne de classe vide ET classes déjà créées : aucune destination n’est choisie à ma place', async ({ page }) => {
  // 6A a été importée hier ; on importe aujourd’hui l’export Pronote de 6B, dont la colonne
  // « Classe de rattachement » est vide elle aussi. Rien ne doit verser 6B dans 6A en silence.
  await page.evaluate(async () => {
    const io = await import('/js/io.js');
    await io.enregistrer('classes', { id: 'c1', nom: '5A', archivee: false, ordre: 0 });
    await io.enregistrer('classes', { id: 'c2', nom: '6A', archivee: false, ordre: 1 });
  });
  await page.goto('/#/eleves/import');
  await page.getByLabel('Données CSV collées').fill(CSV_PRONOTE);
  await page.getByRole('button', { name: 'Analyser' }).click();
  await expect(page.locator('#map-nom')).toBeVisible();
  await expect(page.locator('#dest-colonne')).toBeDisabled();
  // Avant : « Tout mettre dans : » était coché sur la PREMIÈRE classe de la liste, et un clic sur
  // « Importer » versait les 3 élèves dans 5A sans un mot.
  await expect(page.locator('#dest-existante')).not.toBeChecked();
  await expect(page.locator('#dest-nouvelle')).toBeChecked();
  await page.getByRole('button', { name: /^Importer 3 élèves$/ }).click();
  await expect(page.locator('#vue .statut').last()).toContainText('donnez un nom à la nouvelle classe');
  expect(await page.evaluate(async () => (await (await import('/js/io.js')).tous('eleves')).length)).toBe(0);
});

test('terrain (revue) — une colonne parasite contenant « nom » ne désarme pas la colonne unique', async ({ page }) => {
  // « Nom du responsable » satisfait la règle « nom » : sans garde-fou, la scission était désarmée
  // et c’est l’identité du TUTEUR qui partait dans la fiche de l’élève.
  await page.goto('/#/eleves/import');
  await page.getByLabel('Données CSV collées').fill([
    'Élèves;Nom du responsable;Classe de rattachement',
    'MARTIN Louise;DUPONT Serge;6A',
    'NOIRET Jean Baptiste;NOIRET Sylvie;6A',
  ].join('\n'));
  await page.getByRole('button', { name: 'Analyser' }).click();
  await expect(page.locator('#map-nomComplet')).toHaveValue('0');
  await page.getByRole('button', { name: /^Importer 2 élèves$/ }).click();
  await expect(page.locator('#vue .statut').last()).toContainText('2 élèves importés');
  const eleves = await page.evaluate(async () => (await (await import('/js/io.js')).tous('eleves')).map((e) => `${e.nom}|${e.prenom}`).sort());
  expect(eleves).toEqual(['MARTIN|Louise', 'NOIRET|Jean Baptiste']);
});

test('terrain (revue) — scinderNomPrenom : les cas limites, y compris son repli', async ({ page }) => {
  const r = await page.evaluate(async () => {
    const { scinderNomPrenom: s } = await import('/js/modules/eleves.js');
    return ['MARTIN Louise', 'DA SILVA COSTA Emma', 'NOIRET Jean Baptiste', 'MARTIN', '', '   ',
      'martin louise', 'MARTIN LOUISE', "D'HAENE Marie", 'MARTIN  Louise', 'ÉVRARD Éloïse']
      .map((x) => `${x}→${s(x).nom}|${s(x).prenom}`);
  });
  expect(r).toEqual([
    'MARTIN Louise→MARTIN|Louise',
    'DA SILVA COSTA Emma→DA SILVA COSTA|Emma',   // nom de famille en trois mots
    'NOIRET Jean Baptiste→NOIRET|Jean Baptiste', // prénom composé
    'MARTIN→MARTIN|',                            // un seul mot : prénom vide → ligne déclarée incomplète
    '→|', '   →|',                                  // cellule vide
    'martin louise→martin|louise',                // repli : aucune majuscule distinctive
    'MARTIN LOUISE→MARTIN|LOUISE',                // repli : tout en majuscules
    "D'HAENE Marie→D'HAENE|Marie",
    'MARTIN  Louise→MARTIN|Louise',               // espaces multiples
    'ÉVRARD Éloïse→ÉVRARD|Éloïse',                  // accents en majuscules
  ]);
});

test('terrain (revue) — la note de destination suit le remappage manuel au lieu de mentir', async ({ page }) => {
  await page.goto('/#/eleves/import');
  await page.getByLabel('Données CSV collées').fill(CSV_PRONOTE);
  await page.getByRole('button', { name: 'Analyser' }).click();
  await expect(page.locator('#map-nom')).toBeVisible();
  const note = page.locator('#note-classe');
  await expect(note).toContainText('est vide');
  await expect(page.locator('#dest-colonne')).toBeDisabled();

  // L'enseignant désigne « — ignorer — » : il n'y a plus de colonne de classe du tout. La note
  // change de texte au lieu de mentir — et elle ne disparaît PAS, car sans colonne de classe la
  // destination doit être choisie à la main tout autant (revue de l'audit V5).
  await page.locator('#map-classe').selectOption('-1');
  await expect(note).toContainText('Aucune colonne');
  await expect(page.locator('#dest-colonne')).toBeDisabled();

  // Il désigne une colonne REMPLIE (« Option 1 ») : le mode « colonne » redevient possible.
  await page.locator('#map-classe').selectOption('12');
  await expect(note).toBeHidden();
  await expect(page.locator('#dest-colonne')).toBeEnabled();

  // Il revient sur la colonne vide : la note doit reparaître. Avant : elle n'apparaissait jamais
  // à la suite d'un remappage, la radio et le message venaient de deux sources différentes.
  await page.locator('#map-classe').selectOption('8');
  await expect(note).toContainText('est vide');
  await expect(page.locator('#dest-colonne')).toBeDisabled();
});

test('terrain (revue) — le découpage de la colonne unique est montré AVANT d’importer', async ({ page }) => {
  await page.goto('/#/eleves/import');
  await page.getByLabel('Données CSV collées').fill(CSV_PRONOTE);
  await page.getByRole('button', { name: 'Analyser' }).click();
  const apercu = page.locator('#apercu-scission');
  // L'heuristique « majuscules de tête » peut se tromper sur une casse inhabituelle : l'aperçu brut
  // ne montrait que la cellule d'origine, jamais ce qu'elle allait devenir.
  await expect(apercu).toBeVisible();
  await expect(apercu).toContainText('MARTIN Louise');
  await expect(apercu).toContainText('nom MARTIN, prénom Louise');
  await expect(apercu).toContainText('DA SILVA COSTA');
  // Dès que l'enseignant désigne Nom ET Prénom séparément, la colonne unique ne sert plus.
  await page.locator('#map-nom').selectOption('9');
  await page.locator('#map-prenom').selectOption('12');
  await expect(apercu).toBeHidden();
});

test('terrain (revue) — un en-tête « Nom complet » désigne bien la colonne unique', async ({ page }) => {
  await page.goto('/#/eleves/import');
  await page.getByLabel('Données CSV collées').fill([
    'Nom complet;Classe',
    'MARTIN Louise;6A',
    'DA SILVA COSTA Emma;6A',
  ].join('\n'));
  await page.getByRole('button', { name: 'Analyser' }).click();
  // Avant : « nomcomplet » ne satisfaisait que la règle « nom » ; l'import réclamait un prénom
  // qui n'existait dans aucune colonne, et l'enseignant était dans une impasse.
  await expect(page.locator('#map-nomComplet')).toHaveValue('0');
  await expect(page.locator('#map-nom')).toHaveValue('-1');
  await expect(page.locator('#apercu-scission')).toBeVisible();
  await page.getByRole('button', { name: /^Importer 2 élèves$/ }).click();
  await expect(page.locator('#vue .statut').last()).toContainText('2 élèves importés dans 6A');
});

test('terrain (revue) — un message d’erreur passe DEVANT la barre collante, pas derrière', async ({ page }) => {
  await semerAppel(page, 28);
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/#/appel/se');
  await expect(page.locator('.btn-eleve')).toHaveCount(28);
  // La barre est volontairement au z-index le plus bas des deux : cacher une erreur d'écriture
  // derrière un bouton serait pire que masquer le bouton quelques secondes.
  const empilement = await page.evaluate(() => {
    const barre = document.querySelector('.barre-appel');
    const toasts = document.querySelector('.toasts');
    return {
      barre: Number(getComputedStyle(barre).zIndex),
      toasts: Number(getComputedStyle(toasts).zIndex),
    };
  });
  expect(empilement.toasts).toBeGreaterThan(empilement.barre);
});

test('terrain (revue) — un découpage DEVINÉ est montré en priorité et compté dans le bilan', async ({ page }) => {
  // Un nom à particule ne donne aucune majuscule pour trancher : « de La Fontaine Apolline » devient
  // nom « de » / prénom « La Fontaine Apolline ». C'est inevitable, mais ça ne doit pas être muet :
  // l'écran d'appel affiche la paire inversée et l'export Pronote sort deux colonnes fausses.
  await page.goto('/#/eleves/import');
  await page.getByLabel('Données CSV collées').fill([
    'Nom complet;Classe',
    'MARTIN Louise;6A',
    'DURAND Paul;6A',
    'de La Fontaine Apolline;6A',
  ].join('\n'));
  await page.getByRole('button', { name: 'Analyser' }).click();
  const apercu = page.locator('#apercu-scission');
  // Le cas douteux passe devant : l'aperçu ne montrait que les deux PREMIÈRES lignes, donc jamais lui.
  await expect(apercu).toContainText('de La Fontaine Apolline');
  await expect(apercu).toContainText('1 nom sans majuscule distinctive');
  await page.getByRole('button', { name: /^Importer 3 élèves$/ }).click();
  const bilan = page.locator('#vue .statut').last();
  await expect(bilan).toContainText('3 élèves importés dans 6A');
  // Compté dans le bilan, comme les homonymes et les dates rejetées.
  await expect(bilan).toContainText('1 nom découpé au jugé');
  // Les deux noms tranchés par la casse ne déclenchent rien.
  const eleves = await page.evaluate(async () => (await (await import('/js/io.js')).tous('eleves')).map((e) => `${e.nom}|${e.prenom}`).sort());
  expect(eleves).toEqual(['DURAND|Paul', 'MARTIN|Louise', 'de|La Fontaine Apolline']);
});
