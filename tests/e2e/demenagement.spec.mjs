// Déménagement vers une origine dédiée (audit A01) : bandeau affiché sur l'ANCIENNE adresse une fois
// la nouvelle installation en place. L'adresse vit dans `app/js/demenagement.js`, vide dans le dépôt :
// les tests la fournissent en interceptant ce module.

import { test, expect } from '@playwright/test';

const ADRESSE = 'https://carnet-eps-exemple.github.io/carnet-eps/';
const servirAdresse = (page, adresse) => page.route('**/js/demenagement.js', (route) => route.fulfill({
  contentType: 'text/javascript; charset=utf-8',
  body: `export const NOUVELLE_ADRESSE = ${JSON.stringify(adresse)};`,
}));

// L'adresse est fournie par le test, jamais lue dans le dépôt : sinon ce test passerait au rouge le jour
// où l'on renseigne vraiment NOUVELLE_ADRESSE — c'est-à-dire au moment de publier (revue v0.13.1).
test('Déménagement — sans adresse, aucun bandeau', async ({ page }) => {
  await servirAdresse(page, '');
  await page.goto('/#/accueil');
  await expect(page.locator('.entete h1')).toBeVisible();
  await expect(page.getByRole('region', { name: 'Carnet EPS a déménagé' })).toHaveCount(0);
});

test('Déménagement — avec la nouvelle adresse, le bandeau guide vers l’export puis la nouvelle installation', async ({ page }) => {
  await servirAdresse(page, ADRESSE);
  await page.goto('/#/accueil');
  const bandeau = page.getByRole('region', { name: 'Carnet EPS a déménagé' });
  await expect(bandeau).toBeVisible();
  await expect(bandeau).toContainText('Ne saisissez plus rien ici');
  await expect(bandeau.getByRole('link', { name: 'Ouvrir la nouvelle adresse' })).toHaveAttribute('href', ADRESSE);
  // L'export reste accessible depuis le bandeau : c'est la seule chose qu'il reste à faire ici.
  await bandeau.getByRole('link', { name: 'Exporter une sauvegarde' }).click();
  await expect(page).toHaveURL(/#\/sauvegarde$/);
  await expect(page.getByRole('button', { name: 'Télécharger la sauvegarde' })).toBeVisible();
  // Le bandeau vit dans l'en-tête : il survit à la navigation.
  await expect(bandeau).toBeVisible();
});

test('Déménagement — sur téléphone, le bandeau reste compact', async ({ page }) => {
  await servirAdresse(page, ADRESSE);
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/#/accueil');
  // D'abord le bandeau lui-même : sans lui, un en-tête court prouverait seulement son absence.
  await expect(page.getByRole('region', { name: 'Carnet EPS a déménagé' })).toBeVisible();
  const entete = await page.locator('.entete').boundingBox();
  // L'en-tête collant, bandeau compris, ne doit pas manger plus d'un tiers de l'écran.
  expect(entete.height).toBeLessThan(812 / 3);
});

test('Déménagement — une adresse qui n’est pas en HTTPS est ignorée', async ({ page }) => {
  await servirAdresse(page, 'http://exemple.test/carnet/');
  await page.goto('/#/accueil');
  await expect(page.locator('.entete h1')).toBeVisible();
  await expect(page.getByRole('region', { name: 'Carnet EPS a déménagé' })).toHaveCount(0);
});

test('Déménagement — le bandeau disparaît à l’impression', async ({ page }) => {
  await servirAdresse(page, ADRESSE);
  await page.goto('/#/accueil');
  const bandeau = page.getByRole('region', { name: 'Carnet EPS a déménagé' });
  await expect(bandeau).toBeVisible();
  await page.emulateMedia({ media: 'print' });
  await expect(bandeau).toBeHidden();
});
