// Atualização do escritório, que não tem service worker (decisions.md, Versão e atualização): com outro
// `version.json` no servidor, a tela não recarrega no meio; na troca de tela, recarrega uma vez, e não de novo se o
// servidor continua dizendo a mesma versão (CDN atrasada). Pedaço do build que falha ao carregar (aba aberta durante
// um deploy) recarrega a tela uma vez: quem faz é o `lazyRouteComponent` do TanStack Router, e o teste guarda isso.
import { expect, type Page, test } from '@playwright/test';
import { t } from '@/lib/i18n';
import { login } from '../support/app';
import { users } from '../support/backend';

/** A página ainda é a mesma (sem recarregar)? No meio da recarga, `null`. */
const sameDocument = (page: Page) =>
  page.evaluate(() => (window as { e2eMark?: boolean }).e2eMark === true).catch(() => null);
const mark = (page: Page) =>
  page.evaluate(() => {
    (window as { e2eMark?: boolean }).e2eMark = true;
  });
const nav = (page: Page, name: string) => page.getByRole('navigation').getByRole('link', { name }).first().click();

test('outra versão no servidor: recarrega na troca de tela, uma vez só', async ({ page }) => {
  await page.route('**/version.json?*', (route) => route.fulfill({ json: { version: '999.0.0' } }));
  const checked = page.waitForRequest(/\/version\.json\?/);
  await login(page, users.manager);
  await expect(page).toHaveURL(/\/office$/);
  await checked;
  await mark(page);
  await page.waitForTimeout(500);
  expect(await sameDocument(page)).toBe(true);

  await nav(page, t('office.nav.clients'));
  await expect.poll(() => sameDocument(page)).toBe(false);
  await expect(page).toHaveURL(/\/office\/clients$/);

  // O servidor continua com a outra versão, mas este build já recarregou por ela: não recarrega de novo.
  await mark(page);
  await nav(page, t('office.nav.orders'));
  await expect(page).toHaveURL(/\/office\/orders/);
  await page.waitForTimeout(500);
  expect(await sameDocument(page)).toBe(true);
});

test('pedaço do build que falha ao carregar recarrega a tela uma vez', async ({ page }) => {
  let failed = 0;
  let loads = 0;
  page.on('load', () => {
    loads += 1;
  });
  await page.goto('/login');
  // Do login para o escritório, o primeiro pedaço de telas pedido falha, como um arquivo que o deploy tirou do ar.
  await page.route(/\/assets\/pages-[\w-]+\.js$/, (route) => {
    if (failed > 0) return route.continue();
    failed += 1;
    return route.fulfill({ status: 404, body: 'not found' });
  });
  await page.getByLabel(t('auth.email')).fill(users.manager);
  await page.getByLabel(t('auth.password')).fill('senha-local');
  await page.getByRole('button', { name: t('auth.login') }).click();

  await expect(
    page
      .getByRole('navigation')
      .getByRole('link', { name: t('office.nav.clients') })
      .first(),
  ).toBeVisible();
  expect(failed).toBe(1);
  expect(loads).toBe(2);
});
