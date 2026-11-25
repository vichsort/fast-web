// O escritório cancela a O.S. enquanto o técnico trabalha sem sinal. Ao
// voltar o sinal, o envio não é recusado: fica registrado sem revisão (tentativa `voided`, com as fotos), a O.S. continua
// cancelada e nada fica em Pendências.
import { expect, test } from '@playwright/test';
import { t } from '@/lib/i18n';
import { login, submitWithGalleryPhoto } from '../support/app';
import { cancelOrder, createOrder, serverOrder, users } from '../support/backend';

test('envio em O.S. cancelada no meio fica registrado sem revisão', async ({ page, context }) => {
  const order = await createOrder([users.technician1]);

  await login(page, users.technician1);
  await page.getByText(order.title).click();
  await context.setOffline(true);
  await page.getByRole('button', { name: t('technician.detail.start') }).click();
  await expect(page).toHaveURL(new RegExp(`/technician/orders/${order.id}/execution$`));
  await submitWithGalleryPhoto(page, 'Serviço feito sem sinal; a O.S. foi cancelada no meio.');
  await expect(page.getByText(t('technician.execution.queuedToast'))).toBeVisible();

  await cancelOrder(order.id, 'Cliente desistiu');
  await context.setOffline(false);

  await expect
    .poll(
      async () => {
        const server = await serverOrder(order.id);
        return {
          status: server.status,
          reviews: server.executions.map((e) => e.review_status),
          photos: server.photos.length,
        };
      },
      { timeout: 15_000 },
    )
    .toEqual({ status: 'cancelled', reviews: ['voided'], photos: 1 });

  await page.goto('/technician/pending');
  await expect(page.getByText(t('technician.pending.emptyTitle'))).toBeVisible();
});
