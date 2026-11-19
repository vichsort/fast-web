// D1 (docs/e2e.md): quanto custa cada foto do envio em rede de celular. Mede, por perfil de rede emulado no Chromium
// (CDP), cada passo de cada foto (pedir a URL, PUT, confirmar) e o envio inteiro, separando o custo fixo das idas e
// voltas do tempo do arquivo. Fora da suíte: `MEASURE=1 npx playwright test --project measure`.
import { expect, type Page, test } from '@playwright/test';
import { t } from '@/lib/i18n';
import { login } from '../support/app';
import { createOrder, createTechnician, serverOrder } from '../support/backend';

test.skip(!process.env.MEASURE, 'medição: só com MEASURE=1');
test.setTimeout(15 * 60_000);

const PHOTOS = 3;

/** Perfis de rede: ida e volta (ms) e banda em kbit/s. O 2G é o EDGE típico; o 3G, um 3G de cidade. */
const profiles = [
  { name: 'sem limite', latency: 0, down: 0, up: 0 },
  { name: '4G', latency: 70, down: 9000, up: 4000 },
  { name: '3G', latency: 300, down: 1600, up: 750 },
  { name: '2G (EDGE)', latency: 800, down: 240, up: 120 },
] as const;

/** Foto parecida com uma de verdade: 4000×3000, gradiente com ruído, para a compressão dar algumas centenas de KB. */
async function realisticJpeg(page: Page, n: number) {
  const dataUrl = await page.evaluate((seed) => {
    const canvas = document.createElement('canvas');
    canvas.width = 4000;
    canvas.height = 3000;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';
    const g = ctx.createLinearGradient(0, 0, 4000, 3000);
    g.addColorStop(0, `hsl(${seed * 40}, 50%, 60%)`);
    g.addColorStop(1, `hsl(${seed * 40 + 120}, 40%, 30%)`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 4000, 3000);
    const image = ctx.getImageData(0, 0, 4000, 3000);
    let x = seed * 7919;
    for (let i = 0; i < image.data.length; i += 4) {
      x = (x * 1103515245 + 12345) & 0x7fffffff;
      const noise = (x % 48) - 24;
      for (let c = 0; c < 3; c++) image.data[i + c] = (image.data[i + c] ?? 0) + noise;
    }
    ctx.putImageData(image, 0, 0);
    return canvas.toDataURL('image/jpeg', 0.92);
  }, n);
  return { name: `foto-${n}.jpg`, mimeType: 'image/jpeg', buffer: Buffer.from(dataUrl.split(',')[1] ?? '', 'base64') };
}

type Step = 'request' | 'put' | 'confirm' | 'start' | 'submit';
function stepOf(url: string, method: string): Step | null {
  if (url.includes('/functions/v1/request_photo_upload')) return 'request';
  if (url.includes('/functions/v1/confirm_photo_upload')) return 'confirm';
  if (url.includes('/rpc/start_execution')) return 'start';
  if (url.includes('/rpc/submit_execution')) return 'submit';
  if (method === 'PUT' && url.includes('/execution-photos/')) return 'put';
  return null;
}

for (const profile of profiles) {
  test(`custo por foto: ${profile.name}`, async ({ page, context }) => {
    const technician = await createTechnician();
    const order = await createOrder([technician.email]);
    await login(page, technician.email);
    await page.getByText(order.title).click();
    await context.setOffline(true);
    await page.getByRole('button', { name: t('technician.detail.start') }).click();
    for (let n = 1; n <= PHOTOS; n++) {
      const chooser = page.waitForEvent('filechooser');
      await page.getByRole('button', { name: t('ui.actions.fromGallery') }).click();
      await (await chooser).setFiles(await realisticJpeg(page, n));
      await page.getByRole('button', { name: t('ui.photos.alt', { n, total: n }) }).waitFor({ timeout: 60_000 });
    }
    await page.getByLabel(t('technician.execution.description')).fill(`Medição ${profile.name}`);
    await page.getByRole('button', { name: t('technician.execution.review') }).click();
    await page.getByRole('button', { name: t('technician.execution.send') }).click();
    await expect(page.getByText(t('technician.execution.queuedToast'))).toBeVisible();

    const steps: { step: Step; ms: number }[] = [];
    page.on('requestfinished', (request) => {
      const step = stepOf(request.url(), request.method());
      if (!step) return;
      steps.push({ step, ms: request.timing().responseEnd });
    });
    const cdp = await context.newCDPSession(page);
    await cdp.send('Network.enable');
    await cdp.send('Network.emulateNetworkConditions', {
      offline: false,
      latency: profile.latency,
      downloadThroughput: profile.down ? (profile.down * 1000) / 8 : -1,
      uploadThroughput: profile.up ? (profile.up * 1000) / 8 : -1,
    });
    const began = Date.now();
    await context.setOffline(false);
    await expect
      .poll(async () => (await serverOrder(order.id)).photos.length, { timeout: 14 * 60_000, intervals: [1000] })
      .toBe(PHOTOS);
    const total = Date.now() - began;

    const sum = (s: Step) => steps.filter((x) => x.step === s).reduce((a, x) => a + x.ms, 0);
    const { photos } = await serverOrder(order.id);
    const kb = photos.reduce((a, p) => a + (p.file_size ?? 0), 0) / 1024;
    const fixed = sum('request') + sum('confirm');
    const result = {
      profile: profile.name,
      photos: PHOTOS,
      totalS: +(total / 1000).toFixed(1),
      perPhotoS: +(total / 1000 / PHOTOS).toFixed(1),
      avgPhotoKB: Math.round(kb / PHOTOS),
      requestMs: Math.round(sum('request') / PHOTOS),
      putMs: Math.round(sum('put') / PHOTOS),
      confirmMs: Math.round(sum('confirm') / PHOTOS),
      fixedShare: `${Math.round((100 * fixed) / Math.max(fixed + sum('put'), 1))}%`,
    };
    console.log(`D1 ${JSON.stringify(result)}`);
    test.info().annotations.push({ type: 'D1', description: JSON.stringify(result) });
  });
}
