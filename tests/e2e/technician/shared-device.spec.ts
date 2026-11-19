// S4 (docs/e2e.md): o mesmo celular passa de um técnico para outro. O técnico 1 sai (o logout apaga os dados dele,
// queue.md, Q10), o técnico 2 entra e não vê nada do 1: nem O.S., nem rascunho, nem cache. Técnicos próprios do teste:
// o logout encerra as sessões do usuário em todos os aparelhos, e derrubaria as dos outros testes.
import { expect, test } from '@playwright/test';
import { t } from '@/lib/i18n';
import { galleryJpeg, login, readStore } from '../support/app';
import { createOrder, createTechnician } from '../support/backend';

const userStores = ['drafts', 'photos', 'queue', 'refusals', 'seen', 'cache', 'seenPhotos'];

test('aparelho compartilhado: quem entra depois não vê nada de quem saiu', async ({ page }) => {
  const [one, two] = await Promise.all([createTechnician(), createTechnician()]);
  const first = await createOrder([one.email]);
  const second = await createOrder([two.email]);
  const firstUserId = one.userId;

  // O técnico 1 começa o serviço e deixa um rascunho com foto no aparelho.
  await login(page, one.email);
  await page.getByText(first.title).click();
  await page.getByRole('button', { name: t('technician.detail.start') }).click();
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: t('ui.actions.fromGallery') }).click();
  await (await chooser).setFiles(await galleryJpeg(page));
  await expect(page.getByRole('button', { name: t('ui.photos.alt', { n: 1, total: 1 }) })).toBeVisible();
  expect((await readStore<{ userId: string }>(page, 'drafts')).some((d) => d.userId === firstUserId)).toBe(true);

  await page.goto('/technician/profile');
  await page.getByRole('button', { name: t('technician.profile.logout') }).click();
  const dialog = page.getByRole('alertdialog');
  await expect(dialog.getByText(t('technician.profile.logoutDescription'))).toBeVisible();
  await dialog.getByRole('button', { name: t('technician.profile.logoutConfirm') }).click();
  await expect(page).toHaveURL(/\/login/);

  await login(page, two.email);
  await expect(page.getByText(second.title)).toBeVisible();
  await expect(page.getByText(first.title)).toHaveCount(0);
  await page.goto(`/technician/orders/${first.id}`);
  await expect(page.getByText(t('technician.detail.notFoundTitle'))).toBeVisible();
  for (const store of userStores) {
    const rows = await readStore<{ userId: string }>(page, store);
    expect(
      rows.filter((row) => row.userId === firstUserId),
      store,
    ).toEqual([]);
  }
});
