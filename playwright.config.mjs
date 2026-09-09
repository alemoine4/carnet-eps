import { defineConfig, devices } from '@playwright/test';

// Tests de fumée (smoke) des parcours critiques. Le serveur de dev (server-carnet.mjs,
// port 8160) est lancé automatiquement ; s'il tourne déjà (preview), il est réutilisé.
export default defineConfig({
  testDir: './tests/e2e',
  testIgnore: '**/_*.spec.mjs', // specs de vérification temporaires (convention tests/e2e/README.md, C23)
  timeout: 20_000,
  expect: { timeout: 5_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]], // rapport lisible par `npm run test:report` (C22)
  use: {
    baseURL: 'http://localhost:8160',
    headless: true,
    trace: 'retain-on-failure', // trace.zip conservée seulement pour un test rouge — sans `retries`, l'ancien réglage n'en produisait jamais (C22)
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    // Cible n°1 = Android au pouce : les tests d'écran sont rejoués sur un vrai profil tactile
    // (user-agent mobile, 5 points de contact, `pointer: coarse`), pas seulement à 360 px de large
    // (audit 2026-09-07, C60). Limité aux specs d'écran : le reste ne dépend pas de l'appareil.
    // (le test de position des toasts est explicitement « position PC » : il n'a pas de sens ici)
    { name: 'mobile', use: { ...devices['Pixel 7'] }, testMatch: /audit5-lot3.spec.mjs/, grepInvert: /position PC/ },
  ],
  webServer: {
    command: 'node server-carnet.mjs',
    port: 8160,
    reuseExistingServer: true,
    timeout: 20_000,
  },
});
