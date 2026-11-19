// P7 (docs/e2e.md): a dupla envia sem sinal, cada um no seu celular, e os dois voltam ao sinal juntos. O segundo envio
// vira complemento do primeiro (04, R4), e nenhuma prova fica presa: nada `blocked` nem `refused`.
import { devices, expect, type Page, test } from '@playwright/test';
import { t } from '@/lib/i18n';
import { login, submitWithGalleryPhoto } from '../support/app';
import { createOrder, serverOrder, users } from '../support/backend';

async function submitOffline(page: Page, email: string, title: string, description: string) {
  await login(page, email);
  await page.getByText(title).click();
  await page.context().setOffline(true);
  await page.getByRole('button', { name: t('technician.detail.start') }).click();
  await submitWithGalleryPhoto(page, description);
  await expect(page.getByText(t('technician.execution.queuedToast'))).toBeVisible();
}

test('dupla enviando sem sinal: um envio e um complemento, nada preso', async ({
  page,
  browser,
  baseURL,
  locale,
  timezoneId,
}) => {
  const order = await createOrder([users.technician1, users.technician2]);
  const partner = await browser.newContext({ ...devices['Pixel 7'], baseURL, locale, timezoneId });
  const other = await partner.newPage();

  await submitOffline(page, users.technician1, order.title, 'Envio do técnico 1.');
  await submitOffline(other, users.technician2, order.title, 'Envio do técnico 2.');

  await Promise.all([page.context().setOffline(false), partner.setOffline(false)]);
  await expect
    .poll(
      async () => {
        const server = await serverOrder(order.id);
        return { status: server.status, executions: server.executions.length, photos: server.photos.length };
      },
      { timeout: 10_000 },
    )
    .toEqual({ status: 'pending_approval', executions: 2, photos: 2 });

  const { executions } = await serverOrder(order.id);
  const main = executions.filter((e) => e.supplements_execution_id === null);
  expect(main).toHaveLength(1);
  expect(executions.find((e) => e.supplements_execution_id !== null)?.supplements_execution_id).toBe(main[0]?.id);

  for (const phone of [page, other]) {
    await phone.goto('/technician/pending');
    await expect(phone.getByText(t('technician.pending.emptyTitle'))).toBeVisible();
  }
  await partner.close();
});
