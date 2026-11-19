// Ações no app que vários testes repetem.
import type { Page } from '@playwright/test';
import { t } from '@/lib/i18n';
import { PASSWORD } from './backend';

export async function login(page: Page, email: string) {
  await page.goto('/login');
  await page.getByLabel(t('auth.email')).fill(email);
  await page.getByLabel(t('auth.password')).fill(PASSWORD);
  await page.getByRole('button', { name: t('auth.login') }).click();
}

/** JPEG de verdade, desenhado no próprio navegador, para o seletor da galeria. */
export async function galleryJpeg(page: Page) {
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

/** Na tela da execução: uma foto da galeria, o texto, revisar e enviar. Quem chama confere o aviso (fila ou enviado). */
export async function submitWithGalleryPhoto(page: Page, description: string) {
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: t('ui.actions.fromGallery') }).click();
  await (await chooser).setFiles(await galleryJpeg(page));
  await page.getByRole('button', { name: t('ui.photos.alt', { n: 1, total: 1 }) }).waitFor();
  await page.getByLabel(t('technician.execution.description')).fill(description);
  await page.getByRole('button', { name: t('technician.execution.review') }).click();
  await page.getByRole('button', { name: t('technician.execution.send') }).click();
}
