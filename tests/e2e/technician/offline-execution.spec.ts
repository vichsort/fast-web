// Fluxo central do técnico (roadmap, etapa 3): a execução feita sem sinal, com fotos da câmera e da galeria, entra
// na fila e chega ao servidor uma vez só quando o sinal volta (queue.md; ../fast/docs/offline.md).
import { expect, type Page, test } from '@playwright/test';
import { t } from '@/lib/i18n';
import { login } from '../support/app';
import { createOrder, serverOrder, users } from '../support/backend';

test.use({
  // O worker entra aqui: com ele, página e Background Sync disputam a mesma fila (Q9), e o envio não pode duplicar.
  serviceWorkers: 'allow',
  permissions: ['camera', 'geolocation'],
  geolocation: { latitude: -23.5505, longitude: -46.6333, accuracy: 12 },
  launchOptions: { args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] },
});

/** JPEG de verdade, desenhado no próprio navegador, para o seletor da galeria. */
async function galleryJpeg(page: Page) {
  const dataUrl = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#1a57ad';
      ctx.fillRect(0, 0, 640, 480);
      ctx.fillStyle = '#fff';
      ctx.fillRect(160, 120, 320, 240);
    }
    return canvas.toDataURL('image/jpeg', 0.9);
  });
  return { name: 'galeria.jpg', mimeType: 'image/jpeg', buffer: Buffer.from(dataUrl.split(',')[1] ?? '', 'base64') };
}

/** Tipo e tentativas dos itens da fila no Dexie (src/offline/db.ts): a espera não aparece na tela. */
function queueAttempts(page: Page) {
  return page.evaluate(
    () =>
      new Promise<{ type: string; attempts: number }[]>((resolve, reject) => {
        const open = indexedDB.open('fast');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const read = open.result.transaction('queue').objectStore('queue').getAll();
          read.onsuccess = () => {
            resolve(read.result.map(({ type, attempts }) => ({ type, attempts })));
            open.result.close();
          };
        };
      }),
  );
}

test('execução sem sinal com fotos chega ao servidor sem duplicar', async ({ page, context }) => {
  const order = await createOrder([users.technician1]);

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
});
