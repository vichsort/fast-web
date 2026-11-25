// Passada de `max_rows = 1000` do PostgREST, a lista de O.S. cortava em silêncio as mais antigas, e a
// busca não as achava. Empresa própria do teste, com 1001 O.S. gravadas direto no banco.
import { expect, test } from '@playwright/test';
import { formatNumber } from '@/lib/format';
import { t } from '@/lib/i18n';
import { login } from '../support/app';
import { createCompanyWithOrders } from '../support/backend';

const COUNT = 1001;

test('mais de 1000 O.S.: a lista mostra todas e a busca acha a mais antiga', async ({ page }) => {
  const { email, oldestTitle, remove } = await createCompanyWithOrders(COUNT);
  try {
    await login(page, email);
    await expect(page).toHaveURL(/\/office$/);

    await page.goto('/office/orders');
    const found = page.getByText(new RegExp(t('office.orders.description', { count: '[\\d.]+' })));
    await expect(found).toBeVisible({ timeout: 15_000 });
    await expect(found).toHaveText(t('office.orders.description', { count: formatNumber(COUNT) }));

    await page.getByPlaceholder(t('office.orders.searchPlaceholder')).fill(oldestTitle);
    await expect(found).toHaveText(t('office.orders.description', { count: formatNumber(1) }));
    await expect(page.getByRole('cell', { name: oldestTitle })).toBeVisible();
  } finally {
    await remove();
  }
});
