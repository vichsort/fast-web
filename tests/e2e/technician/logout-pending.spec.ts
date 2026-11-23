// P2 (docs/e2e.md): sair com envios na fila apaga a prova (queue.md, Q10), e o aviso com a contagem é a única
// proteção. O aviso conta o que está em Pendências, e cancelar não apaga nada: o envio chega quando o sinal volta.
import { expect, test } from '@playwright/test';
import { t } from '@/lib/i18n';
import { login, readStore, submitWithGalleryPhoto } from '../support/app';
import { createOrder, serverOrder, users } from '../support/backend';

test('sair com envios na fila: o aviso conta, e cancelar não apaga nada', async ({ page, context }) => {
  const order = await createOrder([users.technician1]);

  await login(page, users.technician1);
  await page.getByText(order.title).click();
  await context.setOffline(true);
  await page.getByRole('button', { name: t('technician.detail.start') }).click();
  await submitWithGalleryPhoto(page, 'Feito sem sinal, e quase saí da conta.');
  const toast = page.getByText(t('technician.execution.queuedToast'));
  await expect(toast).toBeVisible();
  // O início e o envio: os dois itens que Pendências mostra.
  expect(await readStore(page, 'queue')).toHaveLength(2);

  // No celular o toast cobre a barra inferior, e o Sonner o segura enquanto o ponteiro está em cima: o ponteiro do
  // teste, parado onde ficava "Enviar para aprovação", prendia o toast e o clique em Perfil nunca acontecia.
  await page.mouse.move(0, 0);
  await expect(toast).toBeHidden();
  await page.getByRole('link', { name: t('ui.nav.profile') }).click();
  await page.getByRole('button', { name: t('technician.profile.logout') }).click();
  const dialog = page.getByRole('alertdialog');
  await expect(dialog.getByText(t('technician.profile.logoutPendingDescription', { count: 2 }))).toBeVisible();
  await dialog.getByRole('button', { name: t('ui.actions.cancel') }).click();
  await expect(dialog).toHaveCount(0);

  await expect(page).toHaveURL(/\/technician\/profile$/);
  expect(await readStore(page, 'queue')).toHaveLength(2);
  await context.setOffline(false);
  await expect
    .poll(
      async () => {
        const server = await serverOrder(order.id);
        return { status: server.status, executions: server.executions.length, photos: server.photos.length };
      },
      { timeout: 10_000 },
    )
    .toEqual({ status: 'pending_approval', executions: 1, photos: 1 });
});
