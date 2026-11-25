// Trocar a senha (../fast/docs/modules/01-foundation.md): com `secure_password_change` ligado no Auth local, o app
// entra de novo com a senha atual e então troca. Senha atual errada não troca nada. Técnico próprio do teste.
import { expect, test } from '@playwright/test';
import { t } from '@/lib/i18n';
import { login } from '../support/app';
import { createTechnician, PASSWORD, signIn } from '../support/backend';

test('trocar a senha pede a atual: errada não troca; certa troca, e a antiga deixa de valer', async ({ page }) => {
  const technician = await createTechnician();
  await login(page, technician.email);
  await expect(page).toHaveURL(/\/technician/);
  await page.goto('/technician/profile');

  await page.getByRole('button', { name: t('auth.changePassword') }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel(t('auth.currentPassword')).fill('nao-e-esta');
  await dialog.getByLabel(t('auth.newPassword')).fill('senha-trocada');
  await dialog.getByLabel(t('auth.confirmPassword')).fill('senha-trocada');
  await dialog.getByRole('button', { name: t('auth.changePasswordSave') }).click();
  await expect(dialog.getByText(t('auth.wrongCurrentPassword'))).toBeVisible();
  await signIn(technician.email);

  await dialog.getByLabel(t('auth.currentPassword')).fill(PASSWORD);
  await dialog.getByRole('button', { name: t('auth.changePasswordSave') }).click();
  await expect(page.getByText(t('auth.passwordChanged'))).toBeVisible();
  await expect(dialog).toBeHidden();

  await expect(signIn(technician.email)).rejects.toThrow();
  await signIn(technician.email, 'senha-trocada');
  // A sessão do aparelho continua.
  await page.reload();
  await expect(page).toHaveURL(/\/technician\/profile/);
});
