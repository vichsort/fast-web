// P4 com o token vencido (docs/e2e.md): o técnico removido de todas as empresas tem a conta banida
// (../fast/docs/modules/06-members.md, R8), e a renovação da sessão é recusada com `user_banned`. Sem token, o app não
// confere o vínculo: a recusa da renovação faz o mesmo que a remoção detectada, apagar os dados dele e ir ao login com o
// aviso (../fast/docs/offline.md, proteção dos dados no aparelho).
import { expect, type Page, test } from '@playwright/test';
import { t } from '@/lib/i18n';
import { login, readStore, submitWithGalleryPhoto } from '../support/app';
import { createOrder, createTechnician, removeMember } from '../support/backend';

const userStores = ['drafts', 'photos', 'queue', 'refusals', 'seen', 'cache', 'seenPhotos'];

/** Vence o access token guardado: ao abrir, o supabase-js renova a sessão antes de qualquer leitura. */
function expireStoredSession(page: Page) {
  return page.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('fast-auth');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const store = open.result.transaction('entries', 'readwrite').objectStore('entries');
          const all = store.getAll();
          all.onsuccess = () => {
            for (const entry of all.result as { key: string; value: string }[]) {
              if (!entry.key.endsWith('-auth-token')) continue;
              const session = JSON.parse(entry.value);
              session.expires_at = Math.floor(Date.now() / 1000) - 60;
              store.put({ key: entry.key, value: JSON.stringify(session) });
            }
            store.transaction.oncomplete = () => {
              open.result.close();
              resolve();
            };
          };
        };
      }),
  );
}

test('removido de todas as empresas, com o token vencido: a renovação recusada limpa o aparelho', async ({
  page,
  context,
}) => {
  const technician = await createTechnician();
  const order = await createOrder([technician.email]);

  await login(page, technician.email);
  await page.getByText(order.title).click();
  await context.setOffline(true);
  await page.getByRole('button', { name: t('technician.detail.start') }).click();
  await submitWithGalleryPhoto(page, 'Feito sem sinal por quem vai ser removido.');
  await expect(page.getByText(t('technician.execution.queuedToast'))).toBeVisible();

  await removeMember(technician.memberId);
  await expireStoredSession(page);
  await context.setOffline(false);
  await page.reload();

  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByText(t('auth.removed'))).toBeVisible();
  for (const store of userStores) {
    const rows = await readStore<{ userId: string }>(page, store);
    expect(
      rows.filter((row) => row.userId === technician.userId),
      store,
    ).toEqual([]);
  }
});
