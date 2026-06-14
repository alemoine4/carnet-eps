import { defineConfig, devices } from '@playwright/test';

// Tests de fumée (smoke) des parcours critiques. Le serveur de dev (server-carnet.mjs,
// port 8160) est lancé automatiquement ; s'il tourne déjà (preview), il est réutilisé.
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 20_000,
  expect: { timeout: 5_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:8160',
    headless: true,
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'node server-carnet.mjs',
    port: 8160,
    reuseExistingServer: true,
    timeout: 20_000,
  },
});
