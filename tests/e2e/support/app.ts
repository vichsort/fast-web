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
