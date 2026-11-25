// Quantas vezes e quanto o cache das leituras do técnico grava no aparelho num fluxo típico, e o
// peso de cada consulta no JSON. Fora da suíte: `MEASURE=1 npx playwright test --project measure`.
import { expect, test } from '@playwright/test';
import { t } from '@/lib/i18n';
import { galleryJpeg, login, readStore } from '../support/app';
import { createOrder, createTechnician } from '../support/backend';

test.skip(!process.env.MEASURE, 'medição: só com MEASURE=1');

test('gravações do cache do técnico', async ({ page }) => {
  // Lê a linha do cache a cada 25 ms e guarda cada gravação nova (savedAt diferente) com o tamanho do JSON.
  await page.addInitScript(() => {
    const w = window as unknown as { cacheWrites: number[] };
    w.cacheWrites = [];
    let last = '';
    setInterval(() => {
      const open = indexedDB.open('fast');
      open.onsuccess = () => {
        const names = Array.from(open.result.objectStoreNames);
        if (!names.includes('cache')) return open.result.close();
        const read = open.result.transaction('cache').objectStore('cache').getAll();
        read.onsuccess = () => {
          for (const row of read.result as { savedAt: string; value: string }[]) {
            if (row.savedAt !== last) {
              last = row.savedAt;
              w.cacheWrites.push(row.value.length);
            }
          }
          open.result.close();
        };
      };
    }, 25);
  });

  const technician = await createTechnician();
  const orders = await Promise.all(Array.from({ length: 5 }, () => createOrder([technician.email])));
  const [first, second] = orders;
  if (!first || !second) throw new Error('sem O.S.');

  await login(page, technician.email);
  await expect(page.getByText(first.title)).toBeVisible();
  for (const order of [first, second]) {
    await page.getByText(order.title).click();
    await expect(page.getByRole('button', { name: t('technician.detail.start') })).toBeVisible();
    await page.goBack();
  }
  await page.getByText(first.title).click();
  await page.getByRole('button', { name: t('technician.detail.start') }).click();
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: t('ui.actions.fromGallery') }).click();
  await (await chooser).setFiles(await galleryJpeg(page));
  await expect(page.getByRole('button', { name: t('ui.photos.alt', { n: 1, total: 1 }) })).toBeVisible();
  // O envio sai pela fila; a cada passada, as leituras do técnico recarregam (queue.md).
  await page.getByLabel(t('technician.execution.description')).fill('Medição do cache.');
  await page.getByRole('button', { name: t('technician.execution.review') }).click();
  await page.getByRole('button', { name: t('technician.execution.send') }).click();
  await expect(page.getByText(t('technician.detail.waitingBody'))).toBeVisible({ timeout: 15_000 });
  await page.goto('/technician');
  await expect(page.getByText(first.title)).toBeVisible();
  await page.waitForTimeout(3000);

  const writes = await page.evaluate(() => (window as unknown as { cacheWrites: number[] }).cacheWrites);
  const [row] = await readStore<{ value: string }>(page, 'cache');
  const client = JSON.parse(row?.value ?? '{}') as {
    clientState?: { queries?: { queryKey: unknown[]; state: { data: unknown } }[] };
  };
  const byKey = (client.clientState?.queries ?? [])
    .map((q) => ({
      key: JSON.stringify(q.queryKey).slice(0, 60),
      kb: +(JSON.stringify(q.state.data).length / 1024).toFixed(1),
    }))
    .sort((a, b) => b.kb - a.kb);
  const result = {
    writes: writes.length,
    writtenKB: Math.round(writes.reduce((a, n) => a + n, 0) / 1024),
    lastKB: +((writes.at(-1) ?? 0) / 1024).toFixed(1),
    queries: byKey,
  };
  console.log(`D3 ${JSON.stringify(result)}`);
});
