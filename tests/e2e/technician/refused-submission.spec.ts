// O escritório tira o técnico da O.S. enquanto ele trabalha sem sinal. Ao voltar o sinal, o envio é
// recusado por regra (`not_assigned`) e o rascunho fica no aparelho, com o motivo, até o técnico apagar
// (../fast/docs/offline.md, "Recusa definitiva"; queue.md).
import { expect, test } from '@playwright/test';
import { errorMessage, t } from '@/lib/i18n';
import { login, submitWithGalleryPhoto } from '../support/app';
import { createOrder, serverOrder, setAssignees, users } from '../support/backend';

test('envio de quem saiu da O.S. fica com o motivo até o técnico apagar', async ({ page, context }) => {
  const order = await createOrder([users.technician1]);
  const description = 'Serviço feito sem sinal, mas saí da O.S.';
  // O Chromium do Linux não tem o compartilhamento do sistema: um falso guarda o que a tela mandou.
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'canShare', { value: () => true });
    Object.defineProperty(navigator, 'share', {
      value: async (data: ShareData) => {
        Object.assign(window, { shared: { text: data.text, files: (data.files ?? []).map((f) => f.name) } });
      },
    });
  });

  await login(page, users.technician1);
  await page.getByText(order.title).click();
  await expect(page.getByRole('button', { name: t('technician.detail.start') })).toBeVisible();

  await context.setOffline(true);
  await page.getByRole('button', { name: t('technician.detail.start') }).click();
  await expect(page).toHaveURL(new RegExp(`/technician/orders/${order.id}/execution$`));
  await submitWithGalleryPhoto(page, description);
  await expect(page.getByText(t('technician.execution.queuedToast'))).toBeVisible();

  await setAssignees(order.id, [users.technician2]);
  await context.setOffline(false);

  // O rascunho recusado aparece em "Precisam de você", com o motivo e o que foi feito.
  await page.goto('/technician/pending');
  const attention = page.locator('section').filter({ hasText: t('technician.pending.attention') });
  const draft = attention
    .locator('div')
    .filter({ hasText: errorMessage('not_assigned') })
    .filter({
      has: page.getByRole('button', { name: t('ui.actions.discard') }),
    });
  await expect(draft.last()).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText(t('technician.pending.inQueue'))).toHaveCount(0);

  // A O.S. saiu do aparelho (o RLS não a mostra mais), e o cartão ainda diz qual é, sem "Abrir" (UX 1).
  // O início, também recusado, tem o próprio cartão.
  const card = page.locator('[data-slot="pending-item"]').filter({ hasText: t('ui.queue.kind.submit') });
  await expect(card.getByText(t('ui.queue.leftDevice'))).toBeVisible({ timeout: 10_000 });
  await expect(card.getByText(order.title)).toBeVisible();
  await expect(card.getByText(order.clientName)).toBeVisible();
  await expect(attention.getByRole('button', { name: t('ui.actions.open') })).toHaveCount(0);

  // "Mandar ao escritório" leva o resumo e a foto pelo compartilhamento do celular.
  await card.getByRole('button', { name: t('ui.queue.share') }).click();
  const shared = await page.waitForFunction(() => (window as { shared?: unknown }).shared);
  const { text, files } = (await shared.jsonValue()) as { text: string; files: string[] };
  for (const part of [order.title, order.clientName, errorMessage('not_assigned'), description]) {
    expect(text).toContain(part);
  }
  expect(files).toEqual([`OS-${String(order.orderNumber).padStart(4, '0')}-foto-1.jpg`]);

  // Continua no aparelho depois de reabrir o app.
  await page.reload();
  await expect(attention.getByRole('button', { name: t('ui.actions.discard') })).toBeVisible();
  await attention.getByRole('button', { name: t('technician.pending.showDraft') }).click();
  await expect(attention.getByText(description)).toBeVisible();

  const server = await serverOrder(order.id);
  expect(server).toMatchObject({ executions: [], photos: [] });

  // Só sai quando o técnico apaga.
  await attention.getByRole('button', { name: t('ui.actions.discard') }).click();
  await page
    .getByRole('alertdialog')
    .getByRole('button', { name: t('technician.pending.discardConfirm') })
    .click();
  await expect(page.getByRole('button', { name: t('ui.actions.discard') })).toHaveCount(0);
});
