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
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'node server-carnet.mjs',
    port: 8160,
    reuseExistingServer: true,
    timeout: 20_000,
  },
});
