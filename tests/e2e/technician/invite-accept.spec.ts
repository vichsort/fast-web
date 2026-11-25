// Convite no app (../fast/docs/modules/06-members.md, R10): o técnico é removido sem sinal, com um envio na fila, e
// convidado de novo. Ao abrir com sinal, o aparelho apaga os dados dele, mas fica na conta e mostra o convite no lugar
// do aviso de removido; aceitar leva à interface. Técnico próprio do teste, para não remover um usuário do seed.
import { expect, test } from '@playwright/test';
import { t } from '@/lib/i18n';
import { login, readStore, submitWithGalleryPhoto } from '../support/app';
import { createOrder, createTechnician, inviteMember, removeMember, serverOrder } from '../support/backend';

/** Tabelas do Dexie com registros por usuário (src/offline/db.ts). */
const userStores = ['drafts', 'photos', 'queue', 'refusals', 'seen', 'cache', 'seenPhotos'];

test('removido e convidado de novo: o aparelho limpa, o convite aparece e aceitar volta às O.S.', async ({
  page,
  context,
}) => {
  const technician = await createTechnician();
  const order = await createOrder([technician.email]);

  await login(page, technician.email);
  await page.getByText(order.title).click();
  await context.setOffline(true);
  await page.getByRole('button', { name: t('technician.detail.start') }).click();
  await submitWithGalleryPhoto(page, 'Feito sem sinal por quem vai sair e voltar.');
  await expect(page.getByText(t('technician.execution.queuedToast'))).toBeVisible();

  await removeMember(technician.memberId);
  await inviteMember(technician.email);
  await context.setOffline(false);
  await page.reload();

  await expect(page.getByRole('button', { name: t('access.invite.accept') })).toBeVisible();
  await expect(page.getByText(/convidou você/)).toBeVisible();
  await expect
    .poll(async () => {
      const left = await Promise.all(userStores.map((store) => readStore<{ userId: string }>(page, store)));
      return left.flat().filter((row) => row.userId === technician.userId).length;
    })
    .toBe(0);

  await page.getByRole('button', { name: t('access.invite.accept') }).click();

  await expect(page).toHaveURL(/\/technician/);
  // A remoção tirou o técnico da O.S. (06, R4), e o envio apagado nunca chegou.
  await expect(page.getByText(order.title)).toHaveCount(0);
  expect((await serverOrder(order.id)).executions).toHaveLength(0);
});
