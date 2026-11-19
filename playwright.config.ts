import { defineConfig, devices } from '@playwright/test';

// E2E contra o stack local do backend (`npm run db:start` em ../fast), com o seed dele. O app roda do build
// (`vite preview`), onde existe o service worker; porta própria para não brigar com o `npm run dev` na 3000.
const port = 4173;

export default defineConfig({
  testDir: 'tests/e2e',
  globalSetup: './tests/e2e/support/global-setup.ts',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    // O worker escapa do page.route e guarda arquivos velhos (queue.md); os testes do offline o liberam.
    serviceWorkers: 'block',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'office', testMatch: 'office/**', use: { ...devices['Desktop Chrome'] } },
    { name: 'technician', testMatch: 'technician/**', use: { ...devices['Pixel 7'] } },
    // Medições (docs/e2e.md, D1): fora da suíte; rodam com `MEASURE=1 npx playwright test --project measure`.
    { name: 'measure', testMatch: 'measure/**', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: `npm run build && npx vite preview --port ${port} --strictPort`,
    url: `http://127.0.0.1:${port}`,
    // Sempre o Supabase, mesmo com VITE_DATA_SOURCE=mock no .env.local (a variável do processo vence o arquivo).
    env: { VITE_DATA_SOURCE: 'supabase' },
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
