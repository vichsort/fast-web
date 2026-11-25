// O upload cai no meio do envio, no PUT da 2ª foto. A retomada manda só o que faltou: uma execução,
// duas fotos, e a 1ª foto não sobe de novo (queue.md, Q4). O worker fica bloqueado para o page.route ver os PUTs.
import { expect, test } from '@playwright/test';
import { t } from '@/lib/i18n';
import { login, submitWithGalleryPhoto } from '../support/app';
import { createOrder, serverOrder, users } from '../support/backend';

test('upload interrompido retoma sem reenviar a foto confirmada nem duplicar', async ({ page, context }) => {
  const order = await createOrder([users.technician1]);

  // PUTs por objeto no bucket (o caminho, sem a assinatura); o primeiro PUT do 2º objeto cai como queda de rede.
  const puts = new Map<string, number>();
  await context.route('**/execution-photos/**', async (route) => {
    const request = route.request();
    if (request.method() !== 'PUT') return route.continue();
    const path = new URL(request.url()).pathname;
    const count = (puts.get(path) ?? 0) + 1;
    puts.set(path, count);
    if (puts.size === 2 && count === 1) return route.abort('connectionreset');
    return route.continue();
  });

  await login(page, users.technician1);
  await page.getByText(order.title).click();
  await page.getByRole('button', { name: t('technician.detail.start') }).click();
  await submitWithGalleryPhoto(page, 'Duas fotos, o sinal caiu na segunda.', 2);

  await expect
    .poll(
      async () => {
        const server = await serverOrder(order.id);
        return { status: server.status, executions: server.executions.length, photos: server.photos.length };
      },
      { timeout: 30_000 },
    )
    .toEqual({ status: 'pending_approval', executions: 1, photos: 2 });
  expect([...puts.values()]).toEqual([1, 2]);
});
