// E3 (docs/e2e.md): o cadastro pela tela, que os outros E2E pulam (criam tudo no banco). O escritório cadastra o
// cliente com endereço (02), abre a O.S. a partir dele com o endereço principal já escolhido e atribui o técnico
// (03); o técnico vê a O.S. em Minhas O.S., com o cliente e o endereço.
import { devices, expect, test } from '@playwright/test';
import { t } from '@/lib/i18n';
import { login } from '../support/app';
import { serverOrder, users } from '../support/backend';

test('cadastrar cliente e O.S. pela tela e atribuir: o técnico vê a O.S.', async ({
  page,
  browser,
  baseURL,
  locale,
  timezoneId,
}) => {
  const tag = crypto.randomUUID().slice(0, 8);
  const clientName = `Cliente Tela ${tag}`;
  const title = `Manutenção Tela ${tag}`;
  const street = `Rua E2E ${tag}`;

  await login(page, users.manager);
  await expect(page).toHaveURL(/\/office$/);
  await page.goto('/office/clients');
  await page.getByRole('button', { name: t('office.clients.newClient') }).click();
  const panel = page.getByRole('dialog', { name: t('office.clientForm.newTitle') });
  await panel.getByLabel(t('office.clientForm.name')).fill(clientName);
  await panel.getByLabel(t('office.clientForm.phone')).fill('11987654321');
  await panel.getByText(t('office.clientForm.withAddress')).click();
  await panel.getByLabel(t('office.address.street')).fill(street);
  await panel.getByLabel(t('office.address.number')).fill('100');
  await panel.getByLabel(t('office.address.city')).fill('São Paulo');
  await panel.getByLabel(t('office.address.state')).selectOption('SP');
  await panel.getByRole('button', { name: t('office.clientForm.create') }).click();
  await expect(page).toHaveURL(/\/office\/clients\/[0-9a-f-]+$/);
  await expect(page.getByRole('heading', { name: clientName })).toBeVisible();

  // A O.S. nova a partir do cliente: ele e o endereço principal já vêm escolhidos.
  await page
    .getByRole('main')
    .getByRole('button', { name: t('office.clientDetail.newOrder') })
    .click();
  await expect(page.getByRole('combobox', { name: t('office.orderForm.client') })).toContainText(clientName);
  await expect(page.getByRole('radio', { name: new RegExp(street) })).toBeChecked();
  await page.getByLabel(t('office.orderForm.title')).fill(title);
  await page.getByRole('radio', { name: t('ui.serviceType.maintenance') }).click();
  await page.getByRole('combobox', { name: t('office.orderForm.technicians') }).click();
  await page.getByRole('option', { name: 'Técnico 1' }).click();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: t('office.orderForm.created') }).click();
  await expect(page).toHaveURL(/\/office\/orders\/[0-9a-f-]+$/);
  const orderId = page.url().split('/').pop() ?? '';
  expect((await serverOrder(orderId)).status).toBe('open');

  const phone = await browser.newContext({ ...devices['Pixel 7'], baseURL, locale, timezoneId });
  const tech = await phone.newPage();
  await login(tech, users.technician1);
  await tech.getByText(title).click();
  await expect(tech).toHaveURL(new RegExp(`/technician/orders/${orderId}$`));
  await expect(tech.getByText(clientName).first()).toBeVisible();
  await expect(tech.getByText(street).first()).toBeVisible();
  await expect(tech.getByRole('button', { name: t('technician.detail.start') })).toBeVisible();
  await phone.close();
});
