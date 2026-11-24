// E1 (docs/e2e.md): o ciclo de revisão entre as duas interfaces (04). O escritório rejeita com o motivo, o técnico vê
// o motivo e envia de novo, o escritório aprova, e o técnico vê a O.S. aprovada.
import { devices, expect, test } from '@playwright/test';
import { formatOrderNumber } from '@/lib/format';
import { t } from '@/lib/i18n';
import { login, submitWithGalleryPhoto } from '../support/app';
import { createOrder, serverOrder, users } from '../support/backend';

test('rejeitar, o técnico refaz com o motivo à vista, aprovar', async ({
  page,
  browser,
  baseURL,
  locale,
  timezoneId,
}) => {
  const order = await createOrder([users.technician1]);
  const number = formatOrderNumber(order.orderNumber);
  const reason = 'Falta a foto do quadro de energia.';

  // O celular do técnico, ao lado do escritório (o projeto é o do escritório).
  const phone = await browser.newContext({ ...devices['Pixel 7'], baseURL, locale, timezoneId });
  const tech = await phone.newPage();
  await login(tech, users.technician1);
  await tech.getByText(order.title).click();
  await tech.getByRole('button', { name: t('technician.detail.start') }).click();
  await submitWithGalleryPhoto(tech, 'Primeira tentativa.');
  // Com sinal, o aviso é de envio em andamento (e2e.md, T7).
  await expect(
    tech.getByRole('region', { name: /Notifications/ }).getByText(t('technician.execution.storedToast')),
  ).toBeVisible();
  await expect(tech.getByText(t('technician.detail.waitingBody'))).toBeVisible();

  // O escritório rejeita.
  await login(page, users.manager);
  await expect(page).toHaveURL(/\/office$/);
  await page.goto(`/office/review/${order.id}`);
  await page.getByRole('button', { name: t('office.review.reject') }).click();
  const rejectDialog = page.getByRole('alertdialog');
  await rejectDialog.getByLabel(t('ui.dialogs.rejectLabel')).fill(reason);
  await rejectDialog.getByRole('button', { name: t('ui.dialogs.rejectConfirm') }).click();
  await expect(page.getByText(t('office.review.doneRejected', { number }))).toBeVisible();

  // O técnico vê o motivo e envia de novo.
  await tech.goto(`/technician/orders/${order.id}`);
  // O motivo em destaque e também na lista de envios.
  await expect(tech.getByText(t('technician.detail.rejectedBody'))).toBeVisible();
  await expect(tech.getByText(reason)).toHaveCount(2);
  await tech.getByRole('button', { name: t('technician.detail.startAgain') }).click();
  await submitWithGalleryPhoto(tech, 'Segunda tentativa, com o quadro.');
  await expect(tech.getByText(t('technician.detail.waitingBody'))).toBeVisible();

  // O escritório vê a tentativa nova, a rejeição anterior acima da decisão e a tentativa anterior aberta (a prova é a
  // soma das tentativas), e aprova.
  await page.goto(`/office/review/${order.id}`);
  await expect(page.getByText('Segunda tentativa, com o quadro.')).toBeVisible();
  await expect(page.getByText(t('office.review.previousRejection'))).toBeVisible();
  await expect(page.getByRole('heading', { name: t('office.review.previousAttempts', { count: 1 }) })).toBeVisible();
  await expect(page.getByText('Primeira tentativa.')).toBeVisible();
  await page.getByRole('button', { name: t('office.review.approve') }).click();
  await page
    .getByRole('alertdialog')
    .getByRole('button', { name: t('ui.dialogs.approveConfirm') })
    .click();
  await expect(page.getByText(t('office.review.doneApproved', { number }))).toBeVisible();

  await tech.reload();
  await expect(tech.getByText(t('technician.detail.approvedBody'))).toBeVisible();
  await phone.close();

  const server = await serverOrder(order.id);
  expect(server.status).toBe('approved');
  expect(server.executions).toMatchObject([
    { description: 'Primeira tentativa.', review_status: 'rejected', review_comment: reason },
    { description: 'Segunda tentativa, com o quadro.', review_status: 'approved', supplements_execution_id: null },
  ]);
  expect(server.photos).toHaveLength(2);
});
