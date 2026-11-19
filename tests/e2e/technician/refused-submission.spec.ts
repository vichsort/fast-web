// P5 (docs/e2e.md): o escritório cancela a O.S. enquanto o técnico trabalha sem sinal. Ao voltar o sinal, o envio é
// recusado por regra e o rascunho fica no aparelho, com o motivo, até o técnico apagar (../fast/docs/offline.md,
// "Recusa definitiva"; queue.md).
import { expect, test } from '@playwright/test';
import { errorMessage, t } from '@/lib/i18n';
import { login, submitWithGalleryPhoto } from '../support/app';
import { cancelOrder, createOrder, serverOrder, users } from '../support/backend';

test('envio recusado por O.S. cancelada fica com o motivo até o técnico apagar', async ({ page, context }) => {
  const order = await createOrder([users.technician1]);
  const description = 'Serviço feito sem sinal, mas a O.S. foi cancelada.';

  await login(page, users.technician1);
  await page.getByText(order.title).click();
  await expect(page.getByRole('button', { name: t('technician.detail.start') })).toBeVisible();

  await context.setOffline(true);
  await page.getByRole('button', { name: t('technician.detail.start') }).click();
  await expect(page).toHaveURL(new RegExp(`/technician/orders/${order.id}/execution$`));
  await submitWithGalleryPhoto(page, description);
  await expect(page.getByText(t('technician.execution.queuedToast'))).toBeVisible();

  await cancelOrder(order.id, 'Cliente desistiu');
  await context.setOffline(false);

  // O rascunho recusado aparece em "Precisam de você", com o motivo e o que foi feito.
  await page.goto('/technician/pending');
  const attention = page.locator('section').filter({ hasText: t('technician.pending.attention') });
  const draft = attention
    .locator('div')
    .filter({ hasText: errorMessage('order_closed') })
    .filter({
      has: page.getByRole('button', { name: t('ui.actions.discard') }),
    });
  await expect(draft.last()).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText(t('technician.pending.inQueue'))).toHaveCount(0);

  // Continua no aparelho depois de reabrir o app.
  await page.reload();
  await expect(attention.getByRole('button', { name: t('ui.actions.discard') })).toBeVisible();
  await attention.getByRole('button', { name: t('technician.pending.showDraft') }).click();
  await expect(attention.getByText(description)).toBeVisible();

  const server = await serverOrder(order.id);
  expect(server).toMatchObject({ status: 'cancelled', executions: [], photos: [] });

  // Só sai quando o técnico apaga.
  await attention.getByRole('button', { name: t('ui.actions.discard') }).click();
  await page
    .getByRole('alertdialog')
    .getByRole('button', { name: t('technician.pending.discardConfirm') })
    .click();
  await expect(page.getByRole('button', { name: t('ui.actions.discard') })).toHaveCount(0);
});
