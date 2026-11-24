// S4 (docs/e2e.md): o mesmo celular passa de um técnico para outro. O técnico 1 sai (o logout apaga os dados dele,
// queue.md, Q10), o técnico 2 entra sem recarregar a página e não vê nada do 1: nem O.S. (nem da memória, com a leitura
// sem resposta), nem rascunho, nem cache. Técnicos próprios do teste: o logout encerra as sessões do usuário em todos
// os aparelhos, e derrubaria as dos outros testes.
import { expect, test } from '@playwright/test';
import { t } from '@/lib/i18n';
import { galleryJpeg, login, readStore, submitLogin } from '../support/app';
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

  // Sem recarregar e com a leitura das O.S. sem resposta: só a memória do app poderia mostrar alguma (C1, revisão de
  // segurança de 2026-11-24). O que está em memória aparece no primeiro render da lista.
  const ordersRead = '**/rest/v1/service_orders?*';
  await page.route(ordersRead, () => {});
  await submitLogin(page, two.email);
  await expect(page.getByRole('heading', { name: t('technician.orders.title') })).toBeVisible();
  await expect(page.getByText(first.title)).toHaveCount(0);
  await page.unroute(ordersRead);
  await page.reload();

  await expect(page.getByText(second.title)).toBeVisible();
  await expect(page.getByText(first.title)).toHaveCount(0);
  await page.goto(`/technician/orders/${first.id}`);
  await expect(page.getByText(t('technician.detail.notFoundTitle'))).toBeVisible();
  // O cache do 2 é gravado espaçado (persist.ts): espera a gravação e confere que nada do 1 foi junto.
  await expect
    .poll(async () => (await readStore<{ userId: string }>(page, 'cache')).map((r) => r.userId))
    .toEqual([two.userId]);
  const [cache] = await readStore<{ value: string }>(page, 'cache');
  expect(cache?.value).not.toContain(first.title);
  for (const store of userStores) {
    const rows = await readStore<{ userId: string }>(page, store);
    expect(
      rows.filter((row) => row.userId === firstUserId),
      store,
    ).toEqual([]);
  }
});
