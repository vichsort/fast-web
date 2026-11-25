// O técnico é removido enquanto está sem sinal, com um envio na fila. Ao abrir com sinal, o
// aparelho apaga os dados dele (inclusive o envio) e vai ao login com o aviso (../fast/docs/offline.md, proteção dos
// dados no aparelho; queue.md, Q10). Técnico próprio do teste, para não remover um usuário do seed.
import { expect, test } from '@playwright/test';
import { t } from '@/lib/i18n';
import { login, readStore, submitWithGalleryPhoto } from '../support/app';
import { createOrder, createTechnician, removeMember, serverOrder } from '../support/backend';

/** Tabelas do Dexie com registros por usuário (src/offline/db.ts). */
const userStores = ['drafts', 'photos', 'queue', 'refusals', 'seen', 'cache', 'seenPhotos'];

test('removido: ao abrir com sinal, o aparelho limpa e vai ao login com o aviso', async ({ page, context }) => {
  const technician = await createTechnician();
  const order = await createOrder([technician.email]);

  await login(page, technician.email);
  await page.getByText(order.title).click();
  await context.setOffline(true);
  await page.getByRole('button', { name: t('technician.detail.start') }).click();
  await submitWithGalleryPhoto(page, 'Feito sem sinal por quem vai ser removido.');
  await expect(page.getByText(t('technician.execution.queuedToast'))).toBeVisible();

  await removeMember(technician.memberId);
  await context.setOffline(false);
  await page.reload();

  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByText(t('auth.removed'))).toBeVisible();
  for (const store of userStores) {
    const rows = await readStore<{ userId: string }>(page, store);
    expect(
      rows.filter((row) => row.userId === technician.userId),
      store,
    ).toEqual([]);
  }
  expect((await serverOrder(order.id)).executions).toHaveLength(0);
});
