// Versão mínima (01, R8 do backend): abaixo dela, o app atualiza sozinho uma vez e não
// manda nada, sem apagar a fila; se continua abaixo (a versão nova ainda não chegou), mostra o botão. A leitura de app_settings é trocada só nesta página: mudar a linha do banco
// bloquearia os outros testes, que rodam em paralelo.
import { expect, test } from '@playwright/test';
import { t } from '@/lib/i18n';
import { login, readStore } from '../support/app';
import { createOrder, serverOrder, users } from '../support/backend';

const APP_SETTINGS = '**/rest/v1/app_settings?*';

test('abaixo da versão mínima: atualiza sozinho uma vez, guarda a fila e manda depois de atualizar', async ({
  page,
  context,
}) => {
  const order = await createOrder([users.technician1]);

  await login(page, users.technician1);
  await page.getByText(order.title).click();
  await context.setOffline(true);
  await page.getByRole('button', { name: t('technician.detail.start') }).click();
  await expect(page).toHaveURL(new RegExp(`/technician/orders/${order.id}/execution$`));
  await expect
    .poll(async () => (await readStore<{ type: string }>(page, 'queue')).map((i) => i.type))
    .toEqual(['start']);

  // O app é fechado ainda sem sinal. Uma página aberta antes de a mínima subir manda ao voltar o sinal, como o
  // worker de um app velho (P9); o que se prova aqui é o app que abre já abaixo da mínima.
  const execution = page.url();
  await page.close();

  // O backend sobe a versão mínima acima deste build. Daqui até atualizar, a fila não pode mandar nada.
  const app = await context.newPage();
  let loads = 0;
  app.on('load', () => {
    loads += 1;
  });
  let starts = 0;
  app.on('request', (request) => {
    if (request.url().includes('/rpc/start_execution')) starts += 1;
  });
  await app.route(APP_SETTINGS, (route) => route.fulfill({ json: [{ min_client_version: '999.0.0' }] }));
  await context.setOffline(false);
  await app.goto(execution);
  // Tentou sozinho (recarregou uma vez) e, ainda abaixo, deixou o botão.
  await expect(app.getByRole('button', { name: t('update.now') })).toBeVisible();
  expect(loads).toBe(2);
  await expect(app.getByRole('heading', { name: t('update.title') })).toBeVisible();
  expect((await readStore<{ type: string }>(app, 'queue')).map((i) => i.type)).toEqual(['start']);
  expect(starts).toBe(0);
  expect((await serverOrder(order.id)).status).toBe('open');

  // A versão nova chegou: atualizar recarrega o app, e a fila manda o que estava guardado.
  await app.unroute(APP_SETTINGS);
  await app.getByRole('button', { name: t('update.now') }).click();
  await expect(app.getByRole('heading', { name: t('update.title') })).toBeHidden();
  await expect.poll(async () => (await serverOrder(order.id)).status).toBe('in_progress');
});
