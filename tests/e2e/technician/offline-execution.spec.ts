// Fluxo central do técnico: a execução feita sem sinal, com fotos da câmera e da galeria, entra
// na fila e chega ao servidor uma vez só quando o sinal volta (queue.md; ../fast/docs/offline.md).
import { expect, type Page, test } from '@playwright/test';
import { t } from '@/lib/i18n';
import { galleryJpeg, login, readStore } from '../support/app';
import { createOrder, serverOrder, supabaseUrl, users } from '../support/backend';

test.use({
  // O worker entra aqui: com ele, página e Background Sync disputam a mesma fila (Q9), e o envio não pode duplicar.
  serviceWorkers: 'allow',
  permissions: ['camera', 'geolocation'],
  geolocation: { latitude: -23.5505, longitude: -46.6333, accuracy: 12 },
  launchOptions: { args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] },
});

/** Tipo e tentativas dos itens da fila: a espera não aparece na tela. */
async function queueAttempts(page: Page) {
  const items = await readStore<{ type: string; attempts: number }>(page, 'queue');
  return items.map(({ type, attempts }) => ({ type, attempts }));
}

test('execução sem sinal com fotos chega ao servidor sem duplicar', async ({ page, context }) => {
  const order = await createOrder([users.technician1]);
  // Toda chamada à API do Supabase, da página e do worker (no Chromium, o contexto vê as do worker também). O PUT da
  // foto vai à URL assinada do R2 (no stack local, /storage), sem o header.
  const api = new RegExp(`^${supabaseUrl}/(rest|auth|functions)/v1/`);
  const calls: { url: string; version: string | undefined }[] = [];
  context.on('request', (request) => {
    if (api.test(request.url())) calls.push({ url: request.url(), version: request.headers()['x-client-version'] });
  });

  await login(page, users.technician1);
  await page.getByText(order.title).click();
  await expect(page.getByRole('button', { name: t('technician.detail.start') })).toBeVisible();

  await context.setOffline(true);
  await page.getByRole('button', { name: t('technician.detail.start') }).click();
  await expect(page).toHaveURL(new RegExp(`/technician/orders/${order.id}/execution$`));

  // Câmera (o Chromium entrega um vídeo de exemplo no lugar da câmera traseira).
  await page.getByRole('button', { name: t('ui.actions.takePhoto') }).click();
  const camera = page.getByRole('dialog', { name: t('technician.camera.title') });
  await expect(camera.locator('video')).toHaveJSProperty('readyState', 4);
  await camera.getByRole('button', { name: t('technician.camera.shutter') }).click();
  await expect(camera.getByText(t('technician.camera.taken', { count: 1 }))).toBeVisible();
  await camera.getByRole('button', { name: t('technician.camera.done') }).click();

  // Galeria.
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: t('ui.actions.fromGallery') }).click();
  await (await chooser).setFiles(await galleryJpeg(page));
  await expect(page.getByRole('button', { name: t('ui.photos.alt', { n: 2, total: 2 }) })).toBeVisible();

  await page.getByLabel(t('technician.execution.description')).fill('Câmera instalada e conferida, feito sem sinal.');
  await page.getByRole('button', { name: t('technician.execution.review') }).click();
  await expect(page.getByText(t('technician.execution.reviewOfflineTitle'))).toBeVisible();
  await page.getByRole('button', { name: t('technician.execution.send') }).click();
  await expect(page.getByText(t('technician.execution.queuedToast'))).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`/technician/orders/${order.id}$`));

  // Sem sinal por um tempo: o início falha de novo no timer e a espera dele sobe para 10 s (Q7).
  await expect.poll(() => queueAttempts(page), { timeout: 15_000 }).toContainEqual({ type: 'start', attempts: 2 });
  expect((await serverOrder(order.id)).executions).toHaveLength(0);

  // O sinal volta: o envio chega bem antes de a espera acabar, porque o `online` é indício de conexão.
  await context.setOffline(false);
  await expect
    .poll(
      async () => {
        const server = await serverOrder(order.id);
        return { status: server.status, executions: server.executions.length, photos: server.photos.length };
      },
      { timeout: 5_000 },
    )
    .toEqual({ status: 'pending_approval', executions: 1, photos: 2 });

  // A fila esvazia, e abrir o app de novo (outra passada da página e do worker) não manda nada outra vez.
  await page.goto('/technician/pending');
  await expect(page.getByText(t('technician.pending.emptyTitle'))).toBeVisible();
  await page.reload();
  await expect(page.getByText(t('technician.pending.emptyTitle'))).toBeVisible();

  const server = await serverOrder(order.id);
  expect(server.executions).toHaveLength(1);
  expect(server.executions[0]).toMatchObject({
    description: 'Câmera instalada e conferida, feito sem sinal.',
    supplements_execution_id: null,
  });
  expect(server.executions[0]?.client_started_at).not.toBeNull();
  expect(server.photos.map((p) => p.source).sort()).toEqual(['camera', 'gallery']);

  // A versão do app foi em todas, inclusive nas Edge Functions de foto, que a liberam no CORS (api.md do backend).
  expect(calls.some((c) => c.url.includes('/functions/v1/confirm_photo_upload'))).toBe(true);
  expect(calls.filter((c) => !/^\d+\.\d+\.\d+(\+[0-9a-f]+)?$/.test(c.version ?? ''))).toEqual([]);
});
