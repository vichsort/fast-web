// Links de membro sem email (../fast/docs/modules/06-members.md, R12 a R14): o owner gera o link na tela de membros e
// o manda; a pessoa abre no celular. Convite: conta nova define a senha, aceita e entra; até lá, o técnico pendente não
// aparece para atribuir. Recuperação: o membro define uma senha nova, e a antiga deixa de valer.
import { type Browser, devices, expect, type Page, test } from '@playwright/test';
import { t } from '@/lib/i18n';
import { login } from '../support/app';
import { createTechnician, signIn, users } from '../support/backend';

async function phone(browser: Browser, baseURL: string | undefined, locale?: string, timezoneId?: string) {
  const context = await browser.newContext({ ...devices['Pixel 7'], baseURL, locale, timezoneId });
  return context.newPage();
}

/** O link que o diálogo mostra depois de gerado (só aparece ali). */
async function shownLink(page: Page): Promise<string> {
  const field = page.getByRole('dialog').getByLabel(t('office.members.link.label'));
  await expect(field).toHaveValue(/\/link#[A-Za-z0-9_-]{43}$/);
  return field.inputValue();
}

async function setPassword(page: Page, password: string) {
  await page.getByLabel(t('auth.newPassword')).fill(password);
  await page.getByLabel(t('auth.confirmPassword')).fill(password);
}

test('convite pela tela: o link define a senha, aceita e entra; antes disso, o técnico não é atribuível', async ({
  page,
  browser,
  baseURL,
  locale,
  timezoneId,
}) => {
  const tag = crypto.randomUUID().slice(0, 8);
  const name = `Convidado ${tag}`;
  const email = `convite-${tag}@fast.test`;

  await login(page, users.owner);
  await page.goto('/office/members');
  await page.getByRole('button', { name: t('office.members.invite') }).click();
  await page.getByLabel(t('office.members.name')).fill(name);
  await page.getByLabel(t('office.members.email')).fill(email);
  await page.getByRole('button', { name: t('office.members.inviteAction') }).click();
  const link = await shownLink(page);
  await page.keyboard.press('Escape');
  const row = page.getByRole('row', { name: new RegExp(name) });
  await expect(row.getByText(t('office.members.pending'))).toBeVisible();
  await expect(row.getByText(email)).toBeVisible();

  await page.goto('/office/orders/new');
  await page.getByRole('combobox', { name: t('office.orderForm.technicians') }).click();
  await expect(page.getByRole('option', { name: 'Técnico 1' })).toBeVisible();
  await expect(page.getByRole('option', { name })).toHaveCount(0);
  await page.keyboard.press('Escape');

  const tech = await phone(browser, baseURL, locale, timezoneId);
  await tech.goto(link);
  await expect(tech.getByText(t('auth.link.inviteSetPassword', { email }))).toBeVisible();
  // O token sai da URL ao abrir.
  expect(new URL(tech.url()).hash).toBe('');
  await setPassword(tech, 'senha-do-convite');
  await tech.getByRole('button', { name: t('auth.link.saveAndAccept') }).click();
  await expect(tech).toHaveURL(/\/technician/);

  // O link vale uma vez só.
  const again = await phone(browser, baseURL, locale, timezoneId);
  await again.goto(link);
  await expect(again.getByText(t('auth.link.invalidTitle'))).toBeVisible();

  await page.goto('/office/members');
  await expect(row.getByText(t('office.members.active'))).toBeVisible();
  await page.goto('/office/orders/new');
  await page.getByRole('combobox', { name: t('office.orderForm.technicians') }).click();
  await expect(page.getByRole('option', { name })).toBeVisible();
});

test('link de senha pela tela: o membro define uma senha nova e a antiga deixa de valer', async ({
  page,
  browser,
  baseURL,
  locale,
  timezoneId,
}) => {
  const technician = await createTechnician();
  const { client } = await signIn(technician.email);
  const profile = await client.from('profiles').select('full_name').eq('id', technician.userId).single();
  const name = profile.data?.full_name ?? '';

  await login(page, users.owner);
  await page.goto('/office/members');
  await page.getByRole('button', { name: `${t('office.common.more')}: ${name}` }).click();
  await page.getByRole('menuitem', { name: t('office.members.passwordLink') }).click();
  await page.getByRole('button', { name: t('office.members.passwordLinkConfirm') }).click();
  const link = await shownLink(page);

  const tech = await phone(browser, baseURL, locale, timezoneId);
  await tech.goto(link);
  await expect(tech.getByText(t('auth.link.recoverySetPassword', { email: technician.email }))).toBeVisible();
  await setPassword(tech, 'senha-nova-123');
  await tech.getByRole('button', { name: t('auth.link.save') }).click();
  await expect(tech).toHaveURL(/\/technician/);

  await expect(signIn(technician.email)).rejects.toThrow();
});
