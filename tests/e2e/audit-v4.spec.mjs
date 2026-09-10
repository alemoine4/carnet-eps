// Audit Codex V4 du 2026-09-09 (« audit codex/AUDIT_V4.md », hors dépôt), rendu sur la v0.12.17.
// ⚠ Aucune donnée nominative : noms INVENTÉS, repris du CSV de démonstration de l'audit.

import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

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

test('V4-01 — deux colonnes « du responsable » ne prennent pas la place de l’identité de l’élève', async ({ page }) => {
  // CSV de reproduction de l'audit V4, à la virgule près. Les colonnes du responsable satisfont les
  // règles « nom » et « prénom » ; comme elles sont DEUX, le mode colonne unique se désarmait et
  // l'élève entrait dans la base sous l'identité de son parent, sans un mot dans le bilan.
  await analyser(page, [
    'Élèves;Nom du responsable;Prénom du responsable;Classe',
    'FICTIF Louise;PARENT;Alex;6TEST',
  ]);
  await expect(page.locator('#map-nomComplet')).toHaveValue('0');
  await expect(page.locator('#map-nom')).toHaveValue('-1');
  await expect(page.locator('#map-prenom')).toHaveValue('-1');
  await expect(page.locator('#apercu-scission')).toBeVisible();
  await page.getByRole('button', { name: /^Importer 1 élève$/ }).click();
  await expect(page.locator('#vue .statut').last()).toContainText('1 élève importé');
  expect(await elevesEnBase(page)).toEqual(['FICTIF|Louise']);
});

test('V4-01 (témoin) — des colonnes « Nom » et « Prénom » VÉRITABLES gardent la priorité', async ({ page }) => {
  // Le correctif ne doit pas retourner la règle : quand l'en-tête désigne franchement l'élève,
  // les deux colonnes séparées restent la meilleure source, même à côté d'une colonne unique.
  await analyser(page, [
    'Élèves;Nom;Prénom;Classe',
    'IGNORE Moi;FICTIF;Louise;6TEST',
  ]);
  await expect(page.locator('#map-nom')).toHaveValue('1');
  await expect(page.locator('#map-prenom')).toHaveValue('2');
  await expect(page.locator('#apercu-scission')).toBeHidden();
  await page.getByRole('button', { name: /^Importer 1 élève$/ }).click();
  await expect(page.locator('#vue .statut').last()).toContainText('1 élève importé');
  expect(await elevesEnBase(page)).toEqual(['FICTIF|Louise']);
});

test('V4-01 (choix manuel) — désigner soi-même les colonnes du responsable reste possible', async ({ page }) => {
  // L'autodétection ne les propose plus, mais elle ne les interdit pas : le professeur reste maître
  // de la correspondance, y compris pour un usage qu'on n'a pas prévu.
  await analyser(page, [
    'Élèves;Nom du responsable;Prénom du responsable;Classe',
    'FICTIF Louise;PARENT;Alex;6TEST',
  ]);
  await page.locator('#map-nomComplet').selectOption('-1');
  await page.locator('#map-nom').selectOption('1');
  await page.locator('#map-prenom').selectOption('2');
  await page.getByRole('button', { name: /^Importer 1 élève$/ }).click();
  await expect(page.locator('#vue .statut').last()).toContainText('1 élève importé');
  expect(await elevesEnBase(page)).toEqual(['PARENT|Alex']);
});

test('V4-01 (garde) — la détection lit des MOTS, et le signal le plus propre l’emporte', async ({ page }) => {
  // Table de non-régression : un en-tête qui ne nomme QUE le champ, l’élève et des mots de liaison
  // est un signal propre ; celui qui nomme AUSSI autre chose ne l’est pas. On énumère ce qu’on
  // ACCEPTE autour du champ, jamais les tiers qu’on refuse : leur liste serait sans fin.
  // À force égale, la première colonne du fichier l’emporte — c’est assumé, pas une propriété forte.
  const vu = await page.evaluate(async () => {
    const { detecterColonnes } = await import('/js/modules/eleves.js');
    const cas = [
      // Le constat V4-01 de l’audit, puis les formes qu’aucune liste de mots n’aurait couvertes :
      // Pronote abrège « responsable » en « Resp. » (« Cnx Resp. » est dans l’export réel du
      // terrain), Siècle numérote « RL1 », et un tiers peut mentionner l’élève lui-même.
      ['Élèves', 'Nom du responsable', 'Prénom du responsable', 'Classe'],
      ['Élèves', 'Resp. Nom', 'Resp. Prénom', 'Classe'],
      ['Élèves', 'RL1 Nom', 'RL1 Prénom', 'Classe'],
      ['Élèves', 'Nom contact', 'Prénom contact', 'Classe'],
      ['Élèves', 'Nom du correspondant', 'Prénom du correspondant', 'Classe'],
      ['Élèves', "Nom du contact d'urgence de l'élève", "Prénom du contact d'urgence de l'élève", 'Classe'],
      ['Élèves', "Nom du médecin de l'élève", "Prénom du médecin de l'élève", 'Classe'],
      // Témoins : de vraies colonnes d’élève gardent la priorité sur la colonne unique.
      ['Élèves', 'Nom', 'Prénom', 'Classe'],
      ['Élèves', 'Nom de famille', 'Prénom', 'Classe'],
      ['Élèves', "Nom de l'élève", "Prénom de l'élève", 'Classe'],
      ["Nom de l'élève", "Prénom de l'élève", 'Classe'],
      ['NOM ELEVE', 'PRENOM ELEVE', 'Classe'],
      ['Nom légal', 'Prénom', 'Classe'],
      ['Nom complet', 'Classe'],
      // Un tiers ne doit jamais l’emporter, même sans colonne unique pour rattraper.
      ['Nom', 'Prénom du responsable', 'Classe'],
      ['Nom', 'Prénom contact', 'Classe'],
      ["Nombre d'élèves", 'Nom', 'Prénom'],
      ['Nom', 'Prénom', "Nom de l'établissement de l'élève", 'Classe'],
      ['Nom', 'Prénom', "Nom du contact d'urgence de l'élève", "Prénom du contact d'urgence de l'élève", 'Classe'],
      // Deux colonnes uniques en concurrence : la propre gagne, même placée en second.
      ['Contact (Nom et prénom)', 'Nom complet', 'Classe'],
      // Le fichier d’exemple livré avec l’app, et l’export Pronote réel du terrain.
      ['Nom', 'Prénom', 'Né(e) le', 'Sexe', 'Classe'],
      ['Élèves', 'Encouragement/Valorisation', 'Né(e) le', 'Sexe', 'Adresse E-mail', 'Entrée', 'Sortie', '', 'Classe de rattachement', 'Tuteur', 'Cnx Ele.', 'Cnx Resp.', 'Option 1', 'Option 2', 'Option 3', 'Régime'],
    ];
    return cas.map((e) => {
      const c = detecterColonnes(e);
      return `${e.join('|')} => nomComplet=${c.nomComplet} nom=${c.nom} prenom=${c.prenom}`;
    });
  });
  expect(vu).toEqual([
    'Élèves|Nom du responsable|Prénom du responsable|Classe => nomComplet=0 nom=-1 prenom=-1',
    'Élèves|Resp. Nom|Resp. Prénom|Classe => nomComplet=0 nom=-1 prenom=-1',
    'Élèves|RL1 Nom|RL1 Prénom|Classe => nomComplet=0 nom=-1 prenom=-1',
    'Élèves|Nom contact|Prénom contact|Classe => nomComplet=0 nom=-1 prenom=-1',
    'Élèves|Nom du correspondant|Prénom du correspondant|Classe => nomComplet=0 nom=-1 prenom=-1',
    "Élèves|Nom du contact d'urgence de l'élève|Prénom du contact d'urgence de l'élève|Classe => nomComplet=0 nom=-1 prenom=-1",
    "Élèves|Nom du médecin de l'élève|Prénom du médecin de l'élève|Classe => nomComplet=0 nom=-1 prenom=-1",
    'Élèves|Nom|Prénom|Classe => nomComplet=0 nom=1 prenom=2',
    'Élèves|Nom de famille|Prénom|Classe => nomComplet=0 nom=1 prenom=2',
    "Élèves|Nom de l'élève|Prénom de l'élève|Classe => nomComplet=0 nom=1 prenom=2",
    "Nom de l'élève|Prénom de l'élève|Classe => nomComplet=-1 nom=0 prenom=1",
    'NOM ELEVE|PRENOM ELEVE|Classe => nomComplet=-1 nom=0 prenom=1',
    'Nom légal|Prénom|Classe => nomComplet=-1 nom=0 prenom=1',
    'Nom complet|Classe => nomComplet=0 nom=-1 prenom=-1',
    // Le prénom du responsable est écarté : l’import refusera et le dira, plutôt que de marier
    // le nom de l’élève au prénom de son parent.
    'Nom|Prénom du responsable|Classe => nomComplet=-1 nom=0 prenom=-1',
    // Ici aucun mot de tiers ne rattrape : c’est la règle « une colonne propre ne se marie pas
    // avec une colonne sale » qui écarte le prénom du contact. Sans elle, l’élève serait importé
    // avec le prénom de quelqu’un d’autre, et l’import ne dirait rien.
    'Nom|Prénom contact|Classe => nomComplet=-1 nom=0 prenom=-1',
    // « Nombre d’élèves » ne contient plus « nom » : ce n’est plus un mot, c’est « nombre ».
    "Nombre d'élèves|Nom|Prénom => nomComplet=-1 nom=1 prenom=2",
    "Nom|Prénom|Nom de l'établissement de l'élève|Classe => nomComplet=-1 nom=0 prenom=1",
    "Nom|Prénom|Nom du contact d'urgence de l'élève|Prénom du contact d'urgence de l'élève|Classe => nomComplet=-1 nom=0 prenom=1",
    'Contact (Nom et prénom)|Nom complet|Classe => nomComplet=1 nom=-1 prenom=-1',
    'Nom|Prénom|Né(e) le|Sexe|Classe => nomComplet=-1 nom=0 prenom=1',
    'Élèves|Encouragement/Valorisation|Né(e) le|Sexe|Adresse E-mail|Entrée|Sortie||Classe de rattachement|Tuteur|Cnx Ele.|Cnx Resp.|Option 1|Option 2|Option 3|Régime => nomComplet=0 nom=-1 prenom=-1',
  ]);
});

test('V4 (revue) — l’identité incomplète est annoncée AVANT le clic, pas après', async ({ page }) => {
  // « Prénom du responsable » n’est plus proposé, et aucune colonne unique ne rattrape : l’import
  // va refuser. La carte affirmait pourtant « correspondance détectée » et ne guidait vers rien.
  await analyser(page, ['Nom;Prénom du responsable;Classe', 'FICTIF;Alex;6TEST']);
  const note = page.locator('#note-identite');
  await expect(note).toBeVisible();
  await expect(note).toHaveAttribute('role', 'status'); // annoncée aux lecteurs d’écran
  await page.getByRole('button', { name: /^Importer 1 élève$/ }).click();
  await expect(page.locator('#vue .statut').last()).toContainText('Import impossible');
  expect(await elevesEnBase(page)).toEqual([]);
  // Le professeur désigne lui-même la colonne « Prénom du responsable » : la note s’efface.
  await page.locator('#map-prenom').selectOption('1');
  await expect(note).toBeHidden();
});

test('V4 (revue) — un import abouti ne se rejoue pas, et n’empile pas un second « Voir les classes »', async ({ page }) => {
  await analyser(page, [
    'Élèves;Nom du responsable;Prénom du responsable;Classe',
    'FICTIF Louise;PARENT;Alex;6TEST',
  ]);
  const btn = page.getByRole('button', { name: /^Importer 1 élève$/ });
  await btn.click();
  await expect(page.locator('#vue .statut').last()).toContainText('1 élève importé');
  await expect(btn).toBeDisabled();
  await expect(page.locator('.apres-import')).toHaveCount(1);
  // Même forcé, un second clic ne rejoue rien : avant, il relançait tout l’import — les élèves
  // revenaient en « doublons ignorés », ce qui effaçait le bilan — et ajoutait un second lien.
  await btn.dispatchEvent('click');
  await expect(page.locator('.apres-import')).toHaveCount(1);
  await expect(page.locator('#vue .statut').last()).toContainText('1 élève importé');
  expect(await elevesEnBase(page)).toEqual(['FICTIF|Louise']);
});
test('V4 (revue) — une même version dans le service-worker, l’app, le CHANGELOG et le journal de déploiement', async () => {
  // Le correctif V4-01 touche un fichier mis en cache par le service-worker. Sans incrément de
  // VERSION, le cache installé sur le téléphone n’est pas reconstruit : l’app continue de servir
  // l’ANCIEN module et le défaut reste vivant en poche, pendant que l’écran Réglages affiche le
  // même numéro qu’avant. Cette garde interdit la classe entière de l’oubli (revue V4).
  const lire = (rel) => readFileSync(new URL(rel, import.meta.url), 'utf8');
  const sw = lire('../../app/service-worker.js').match(/^const VERSION = '([\d.]+)';$/m)[1];
  const app = lire('../../app/js/state.js').match(/^export const VERSION_APP = '([\d.]+)';$/m)[1];
  const changelog = lire('../../CHANGELOG.md').match(/^## .*?v([\d.]+)/m)[1];
  const deploiement = lire('../../docs/deploiement.md').match(/^\| v([\d.]+) \|/m)[1];
  expect({ app, changelog, deploiement }).toEqual({ app: sw, changelog: sw, deploiement: sw });
});
