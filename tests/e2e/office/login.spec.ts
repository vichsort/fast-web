import { expect, test } from '@playwright/test';
import { t } from '@/lib/i18n';
import { login } from '../support/app';
import { users } from '../support/backend';

test('o escritório entra e cai no dashboard', async ({ page }) => {
  await login(page, users.manager);
  await expect(page).toHaveURL(/\/office$/);
  await expect(page.getByRole('heading', { name: t('office.dashboard.title') })).toBeVisible();
});
