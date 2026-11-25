// Atualização automática do técnico (decisions.md, Versão e atualização; queue.md, Service worker): com um envio na
// fila, sai uma versão nova do app (o sw.js muda). Na mesma tela, nada recarrega; na troca de tela, o worker novo
// entra e a página recarrega sozinha, sem botão; a fila continua no Dexie e o envio chega depois. O build é servido
// por um servidor só deste teste (support/static-server.ts).
import { devices, expect, type Page, test } from '@playwright/test';
import { t } from '@/lib/i18n';
import { login, readStore } from '../support/app';
import { createOrder, serverOrder, users } from '../support/backend';
import { serveDist } from '../support/static-server';

const START = '**/rest/v1/rpc/start_execution';

const registration = (page: Page) =>
  page.evaluate(async () => {
    const r = await navigator.serviceWorker.getRegistration();
    return {
      active: Boolean(r?.active),
      waiting: Boolean(r?.waiting),
      controlled: navigator.serviceWorker.controller !== null,
    };
  });
/** A página ainda é a mesma (sem recarregar)? No meio da recarga, `null`. */
const sameDocument = (page: Page) =>
  page.evaluate(() => (window as { e2eMark?: boolean }).e2eMark === true).catch(() => null);

test('versão nova entra sozinha na troca de tela, com um envio na fila, que chega depois', async ({
  browser,
  locale,
  timezoneId,
}) => {
  const server = await serveDist();
  const context = await browser.newContext({
    ...devices['Pixel 7'],
    baseURL: server.url,
    locale,
    timezoneId,
    serviceWorkers: 'allow',
  });
  const page = await context.newPage();
  try {
    const order = await createOrder([users.technician1]);
    await login(page, users.technician1);
    // O técnico já usou o app antes: a página aberta é controlada pelo worker.
    await expect.poll(async () => (await registration(page)).active).toBe(true);
    await page.reload();
    await expect.poll(async () => (await registration(page)).controlled).toBe(true);

    // O início fica sem resposta (como sem sinal), na fila.
    await context.route(START, (route) => route.abort('internetdisconnected'));
    await page.getByText(order.title).click();
    await page.getByRole('button', { name: t('technician.detail.start') }).click();
    await expect(page).toHaveURL(new RegExp(`/technician/orders/${order.id}/execution$`));
    await expect
      .poll(async () => (await readStore<{ type: string }>(page, 'queue')).map((i) => i.type))
      .toEqual(['start']);

    // Sai uma versão nova, e o app a acha ao procurar (de tempos em tempos e ao voltar à aba).
    server.publishNewVersion();
    await page.evaluate(() => {
      (window as { e2eMark?: boolean }).e2eMark = true;
    });
    await page.evaluate(async () => {
      await (await navigator.serviceWorker.getRegistration())?.update();
    });
    await expect.poll(async () => (await registration(page)).waiting).toBe(true);
    // Na mesma tela, nada recarrega.
    await page.waitForTimeout(500);
    expect(await sameDocument(page)).toBe(true);

    // Troca de tela: o worker novo entra e a página recarrega sozinha.
    await page.goBack();
    await expect.poll(() => sameDocument(page)).toBe(false);
    await expect(page).toHaveURL(new RegExp(`/technician/orders/${order.id}$`));
    await expect.poll(async () => (await registration(page)).waiting).toBe(false);
    expect((await readStore<{ type: string }>(page, 'queue')).map((i) => i.type)).toEqual(['start']);

    // O sinal volta: o envio guardado chega.
    await context.unroute(START);
    await expect.poll(async () => (await serverOrder(order.id)).status, { timeout: 30_000 }).toBe('in_progress');
  } finally {
    await context.close();
    await server.close();
  }
});
