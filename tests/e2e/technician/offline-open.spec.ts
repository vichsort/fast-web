// S1 (docs/e2e.md): o começo do dia em campo. Com o login e a lista feitos com sinal, o app abre sem sinal direto
// numa O.S.: o worker serve o app do precache, o acesso vem do aparelho e a O.S. do cache (offline.md; queue.md).
// O prazo padrão (5 s) é parte da prova: o acesso guardado não pode esperar repetições da consulta ao servidor.
import { expect, type Page, test } from '@playwright/test';
import { t } from '@/lib/i18n';
import { login, readStore } from '../support/app';
import { createOrder, users } from '../support/backend';

test.use({ serviceWorkers: 'allow' });

/** O cache das leituras gravado no aparelho (a gravação é espaçada), como texto. */
async function cachedText(page: Page) {
  const rows = await readStore<{ value: string }>(page, 'cache');
  return rows.map((row) => row.value).join();
}

test('sem sinal, o app abre direto numa O.S. e na lista', async ({ page, context }) => {
  const order = await createOrder([users.technician1]);

  await login(page, users.technician1);
  await page.getByText(order.title).click();
  await expect(page.getByRole('button', { name: t('technician.detail.start') })).toBeVisible();
  // O worker ativo (precache completo) e a O.S. no cache das leituras do Dexie (src/offline/db.ts).
  await page.evaluate(() => navigator.serviceWorker.ready);
  await expect.poll(() => cachedText(page)).toContain(order.id);

  await context.setOffline(true);
  await page.reload();
  await expect(page).toHaveURL(new RegExp(`/technician/orders/${order.id}$`));
  await expect(page.getByRole('heading', { name: order.title })).toBeVisible();
  await expect(page.getByText(order.clientName)).toBeVisible();
  await expect(page.getByRole('button', { name: t('technician.detail.start') })).toBeVisible();

  await page.goto('/technician');
  await expect(page.getByRole('heading', { name: t('technician.orders.title') })).toBeVisible();
  await expect(page.getByText(order.title)).toBeVisible();
});
