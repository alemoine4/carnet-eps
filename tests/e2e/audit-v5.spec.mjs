// Audit Codex V5 du 2026-09-09 (« audit codex/AUDIT_V5.md », hors dépôt), rendu sur la v0.12.18.
// V4-01 y est confirmé corrigé ; V5-01 en est la variante résiduelle.
// ⚠ Aucune donnée nominative : noms INVENTÉS, repris du CSV de démonstration de l'audit.

import { test, expect } from '@playwright/test';

const STORES = ['meta', 'classes', 'eleves', 'edt', 'sequences', 'seances', 'appels',
  'inaptitudes', 'certificats', 'fichiers', 'evaluations', 'notes', 'documents', 'observations'];

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(async (stores) => {
    const io = await import('/js/io.js');
    await io.ouvrirDB();
    for (const s of stores) await io.vider(s);
  }, STORES);
});

const analyser = async (page, lignes) => {
  await page.goto('/#/eleves/import');
  await page.getByLabel('Données CSV collées').fill(lignes.join('\n'));
  await page.getByRole('button', { name: 'Analyser' }).click();
  await expect(page.locator('#map-nom')).toBeVisible();
};
const elevesEnBase = (page) => page.evaluate(async () =>
  (await (await import('/js/io.js')).tous('eleves')).map((e) => `${e.nom}|${e.prenom}`).sort());

test('V5-01 — sans identité d’élève reconnue, deux colonnes de contact ne créent aucun élève', async ({ page }) => {
  // CSV de reproduction de l'audit V5. Le correctif V4 écartait une colonne faible FACE à une
  // colonne sûre ; ici il n'y a aucune colonne sûre, et deux signaux faibles étaient retenus
  // ensemble. L'app doit s'abstenir plutôt que d'inventer une identité.
  await analyser(page, ['Nom contact;Prénom contact;Classe', 'CONTACTFICTIF;Alex;6TEST']);
  await expect(page.locator('#map-nom')).toHaveValue('-1');
  await expect(page.locator('#map-prenom')).toHaveValue('-1');
  await expect(page.locator('#map-nomComplet')).toHaveValue('-1');
  await expect(page.locator('#note-identite')).toBeVisible();
  await page.getByRole('button', { name: /^Importer 1 élève$/ }).click();
  await expect(page.locator('#vue .statut').last()).toContainText('Import impossible');
  expect(await elevesEnBase(page)).toEqual([]);
});

test('V5-01 (choix manuel) — le professeur peut toujours désigner ces colonnes lui-même', async ({ page }) => {
  // L'app s'abstient, elle n'interdit pas : le mapping manuel reste la porte de sortie.
  await analyser(page, ['Nom contact;Prénom contact;Classe', 'CONTACTFICTIF;Alex;6TEST']);
  await page.locator('#map-nom').selectOption('0');
  await page.locator('#map-prenom').selectOption('1');
  await expect(page.locator('#note-identite')).toBeHidden();
  await page.getByRole('button', { name: /^Importer 1 élève$/ }).click();
  await expect(page.locator('#vue .statut').last()).toContainText('1 élève importé');
  expect(await elevesEnBase(page)).toEqual(['CONTACTFICTIF|Alex']);
});

test('V5-01 (garde) — une identité n’est proposée d’office que sur un signal PROPRE', async ({ page }) => {
  // Règle unique : un en-tête qui ne nomme QUE le champ, l'élève et des mots de liaison est propre ;
  // celui qui nomme AUSSI autre chose ne l'est pas, et n'est jamais proposé d'office. Cela remplace
  // les arbitrages de la v0.12.18, qui n'écartaient une colonne faible que FACE à une colonne sûre.
  const vu = await page.evaluate(async () => {
    const { detecterColonnes } = await import('/js/modules/eleves.js');
    const cas = [
      // Aucune colonne sûre en face : l'app s'abstient, quel que soit le libellé du tiers.
      ['Nom contact', 'Prénom contact', 'Classe'],
      ['Nom Resp.', 'Prénom Resp.', 'Classe'],
      ['Nom RL1', 'Prénom RL1', 'Classe'],
      ['Nom du correspondant', 'Prénom du correspondant', 'Classe'],
      // Une colonne unique au signal faible ne vaut pas mieux.
      ['Contact (Nom et prénom)', 'Classe'],
      // Pluriels et parenthèses, courants dans les exports d'établissement.
      ['Nom', 'Prénoms', 'Classe'],
      ['Nom', 'Prénom(s)', 'Classe'],
      ['Noms', 'Prénoms', 'Classe'],
      // Témoins : une colonne sûre reste proposée, et le format Pronote est intact.
      ['Nom', 'Prénom', 'Classe'],
      ['Élèves', 'Nom contact', 'Prénom contact', 'Classe'],
      ['Élèves', 'Né(e) le', 'Sexe', 'Classe de rattachement'],
    ];
    return cas.map((e) => {
      const c = detecterColonnes(e);
      return `${e.join('|')} => nomComplet=${c.nomComplet} nom=${c.nom} prenom=${c.prenom}`;
    });
  });
  expect(vu).toEqual([
    'Nom contact|Prénom contact|Classe => nomComplet=-1 nom=-1 prenom=-1',
    'Nom Resp.|Prénom Resp.|Classe => nomComplet=-1 nom=-1 prenom=-1',
    'Nom RL1|Prénom RL1|Classe => nomComplet=-1 nom=-1 prenom=-1',
    'Nom du correspondant|Prénom du correspondant|Classe => nomComplet=-1 nom=-1 prenom=-1',
    'Contact (Nom et prénom)|Classe => nomComplet=-1 nom=-1 prenom=-1',
    'Nom|Prénoms|Classe => nomComplet=-1 nom=0 prenom=1',
    'Nom|Prénom(s)|Classe => nomComplet=-1 nom=0 prenom=1',
    'Noms|Prénoms|Classe => nomComplet=-1 nom=0 prenom=1',
    'Nom|Prénom|Classe => nomComplet=-1 nom=0 prenom=1',
    'Élèves|Nom contact|Prénom contact|Classe => nomComplet=0 nom=-1 prenom=-1',
    'Élèves|Né(e) le|Sexe|Classe de rattachement => nomComplet=0 nom=-1 prenom=-1',
  ]);
});

test('V5 (revue) — un discriminant d’UNE lettre compte : « Nom 1 » n’est pas « Nom »', async ({ page }) => {
  // Le premier correctif jetait les jetons d’un seul caractère pour absorber le « (s) » de
  // « Prénom(s) ». Il jetait du même coup la numérotation des responsables : « Nom 1;Prénom 1 »
  // devenait indiscernable de « Nom;Prénom » et l’élève entrait sous l’identité du parent.
  // La flexion est désormais retirée à la SOURCE, ce qui permet de garder tous les autres jetons.
  const vu = await page.evaluate(async () => {
    const { detecterColonnes } = await import('/js/modules/eleves.js');
    const cas = [
      ['Nom 1', 'Prénom 1', 'Classe'],
      ['Nom 2', 'Prénom 2', 'Classe'],
      ['Nom R', 'Prénom R', 'Classe'],
      ['Nom Resp. 1', 'Prénom Resp. 1', 'Classe'],
      // ... sans perdre la flexion, qui était la raison d’être du filtre supprimé.
      ['Nom', 'Prénom(s)', 'Classe'],
      ['Nom(s)', 'Prénoms', 'Classe'],
      // « Né(e) à » est un LIEU : il ne doit pas être pris pour la date, même placé avant elle.
      ['Nom', 'Prénom', 'Né(e) à', 'Né(e) le'],
    ];
    return cas.map((e) => {
      const c = detecterColonnes(e);
      return `${e.join('|')} => nom=${c.nom} prenom=${c.prenom} naissance=${c.dateNaissance}`;
    });
  });
  expect(vu).toEqual([
    'Nom 1|Prénom 1|Classe => nom=-1 prenom=-1 naissance=-1',
    'Nom 2|Prénom 2|Classe => nom=-1 prenom=-1 naissance=-1',
    'Nom R|Prénom R|Classe => nom=-1 prenom=-1 naissance=-1',
    'Nom Resp. 1|Prénom Resp. 1|Classe => nom=-1 prenom=-1 naissance=-1',
    'Nom|Prénom(s)|Classe => nom=0 prenom=1 naissance=-1',
    'Nom(s)|Prénoms|Classe => nom=0 prenom=1 naissance=-1',
    'Nom|Prénom|Né(e) à|Né(e) le => nom=0 prenom=1 naissance=3',
  ]);
});

test('V5 (revue) — aucune colonne « Classe » dans le fichier : la destination n’est pas choisie à ma place', async ({ page }) => {
  // Le cas le plus banal : un copier-coller « Nom;Prénom » depuis un tableur. Le correctif de la
  // v0.12.16 ne couvrait que la colonne DÉTECTÉE mais vide ; sans colonne du tout, « Tout mettre
  // dans : » se cochait encore sur la première classe de la liste et un seul clic y versait tout.
  await page.evaluate(async () => {
    const io = await import('/js/io.js');
    await io.enregistrer('classes', { id: 'c1', nom: '5A', archivee: false, ordre: 0 });
    await io.enregistrer('classes', { id: 'c2', nom: '6A', archivee: false, ordre: 1 });
  });
  await analyser(page, ['Nom;Prénom', 'FICTIF;Louise', 'AUTREFICTIF;Paul']);
  await expect(page.locator('#note-classe')).toContainText('Aucune colonne');
  await expect(page.locator('#dest-existante')).not.toBeChecked();
  await expect(page.locator('#dest-nouvelle')).toBeChecked();
  await expect(page.locator('#dest-colonne')).toBeDisabled();
  await page.getByRole('button', { name: /^Importer 2 élèves$/ }).click();
  await expect(page.locator('#vue .statut').last()).toContainText('donnez un nom à la nouvelle classe');
  expect(await elevesEnBase(page)).toEqual([]);
});
