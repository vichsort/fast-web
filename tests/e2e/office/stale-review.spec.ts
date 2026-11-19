// E2 (docs/e2e.md): um complemento chega entre abrir a revisão e aprovar. O backend recusa com `stale_review`
// (04, R10), a tela avisa e só deixa decidir depois de recarregar, já com o complemento à vista.
import { devices, expect, test } from '@playwright/test';
import { formatOrderNumber } from '@/lib/format';
import { errorMessage, t } from '@/lib/i18n';
import { login, submitWithGalleryPhoto } from '../support/app';
import { createOrder, serverOrder, submitSupplement, users } from '../support/backend';

test('complemento durante a revisão: aprovar pede recarregar antes', async ({
  page,
  browser,
  baseURL,
  locale,
  timezoneId,
}) => {
  const order = await createOrder([users.technician1]);
  const supplement = 'Complemento que chegou durante a revisão.';

  const phone = await browser.newContext({ ...devices['Pixel 7'], baseURL, locale, timezoneId });
  const tech = await phone.newPage();
  await login(tech, users.technician1);
  await tech.getByText(order.title).click();
  await tech.getByRole('button', { name: t('technician.detail.start') }).click();
  await submitWithGalleryPhoto(tech, 'Tentativa em revisão.');
  await expect(tech.getByText(t('technician.detail.waitingBody'))).toBeVisible();
  await phone.close();
  const attempt = (await serverOrder(order.id)).executions[0];
  if (!attempt) throw new Error('a tentativa não chegou ao servidor');

  await login(page, users.manager);
  await expect(page).toHaveURL(/\/office$/);
  await page.goto(`/office/review/${order.id}`);
  await expect(page.getByText('Tentativa em revisão.')).toBeVisible();

  await submitSupplement(order.id, attempt.id, users.technician1, supplement);

  const approve = page.getByRole('button', { name: t('office.review.approve') });
  await approve.click();
  await page
    .getByRole('alertdialog')
    .getByRole('button', { name: t('ui.dialogs.approveConfirm') })
    .click();
  await expect(page.getByText(t('office.review.staleTitle'), { exact: true })).toBeVisible();
  await expect(page.getByText(errorMessage('stale_review'))).toBeVisible();
  await expect(page.getByRole('alertdialog')).toHaveCount(0);
  await expect(approve).toBeDisabled();
  expect((await serverOrder(order.id)).status).toBe('pending_approval');

  await page.getByRole('button', { name: t('office.common.reload') }).click();
  await expect(page.getByText(supplement)).toBeVisible();
  await approve.click();
  await page
    .getByRole('alertdialog')
    .getByRole('button', { name: t('ui.dialogs.approveConfirm') })
    .click();
  await expect(
    page.getByText(t('office.review.doneApproved', { number: formatOrderNumber(order.orderNumber) })),
  ).toBeVisible();
  expect((await serverOrder(order.id)).status).toBe('approved');
});
