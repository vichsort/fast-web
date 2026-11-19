// P3, a janela (docs/e2e.md): o técnico saiu da conta em outro aparelho (logout global, S5) com um envio na fila neste.
// O token de acesso ainda vale pelo relógio, então a sessão fica e o app não vai sozinho ao login; a fila para pedindo
// login. "Entrar de novo" em Pendências leva ao login sem apagar nada, e entrar com a mesma conta manda a fila (Q3).
import { expect, test } from '@playwright/test';
import { t } from '@/lib/i18n';
import { login, readStore, submitWithGalleryPhoto } from '../support/app';
import { createOrder, createTechnician, serverOrder, signOutEverywhere } from '../support/backend';

test('sessão revogada com a fila parada: entrar de novo pela tela manda a fila', async ({ page, context }) => {
  // Técnico próprio: o logout global derrubaria os outros testes.
  const technician = await createTechnician();
  const order = await createOrder([technician.email]);

  await login(page, technician.email);
  await page.getByText(order.title).click();
  await context.setOffline(true);
  await page.getByRole('button', { name: t('technician.detail.start') }).click();
  await submitWithGalleryPhoto(page, 'Feito sem sinal; saí da conta no outro celular.');
  await expect(page.getByText(t('technician.execution.queuedToast'))).toBeVisible();

  await signOutEverywhere(technician.email);
  await context.setOffline(false);
  await expect(page.getByText(t('ui.sync.needsLogin'))).toBeVisible();

  await page.getByText(t('ui.sync.needsLogin')).click();
  await expect(page).toHaveURL(/\/technician\/pending$/);
  await page.getByRole('button', { name: t('technician.pending.login') }).click();
  await expect(page).toHaveURL(/\/login/);
  expect(await readStore(page, 'queue')).not.toHaveLength(0);

  await login(page, technician.email);
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
