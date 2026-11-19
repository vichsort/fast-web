import { expect, test } from '@playwright/test';
import { t } from '@/lib/i18n';
import { login } from '../support/app';
import { users } from '../support/backend';

test('o técnico entra e cai em Minhas O.S.', async ({ page }) => {
  await login(page, users.technician1);
  await expect(page).toHaveURL(/\/technician$/);
  await expect(page.getByRole('heading', { name: t('technician.orders.title') })).toBeVisible();
});
