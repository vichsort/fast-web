// P3 (docs/e2e.md): a sessão guardada no aparelho estraga (renovação recusada, token de acesso vencido) com envios na
// fila. O auth-js apaga a sessão, a guarda da rota leva ao login, e entrar de novo com o mesmo usuário manda a fila
// (queue.md, Q3), sem passar pelo logout, que apagaria a prova (Q10).
import { expect, test } from '@playwright/test';
import { t } from '@/lib/i18n';
import { login, readStore, submitWithGalleryPhoto } from '../support/app';
import { createOrder, serverOrder, users } from '../support/backend';

test('sessão perdida com envios na fila: entrar de novo manda a fila', async ({ page, context }) => {
  const order = await createOrder([users.technician1]);

  await login(page, users.technician1);
  await page.getByText(order.title).click();
  await context.setOffline(true);
  await page.getByRole('button', { name: t('technician.detail.start') }).click();
  await submitWithGalleryPhoto(page, 'Feito sem sinal, antes de a sessão estragar.');
  await expect(page.getByText(t('technician.execution.queuedToast'))).toBeVisible();

  // A sessão do supabase-js (fast-auth) vence pelo relógio e a renovação passa a ser recusada pelo servidor.
  await page.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('fast-auth');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const store = open.result.transaction('entries', 'readwrite').objectStore('entries');
          const all = store.getAll();
          all.onsuccess = () => {
            const entry = (all.result as { key: string; value: string }[]).find((e) => e.key.endsWith('-auth-token'));
            if (!entry) return reject(new Error('sessão não encontrada no fast-auth'));
            const session = JSON.parse(entry.value);
            session.expires_at = Math.floor(Date.now() / 1000) - 60;
            session.refresh_token = 'estragado';
            store.put({ key: entry.key, value: JSON.stringify(session) }).onsuccess = () => {
              open.result.close();
              resolve();
            };
          };
        };
      }),
  );

  await context.setOffline(false);
  await page.reload();
  await expect(page).toHaveURL(/\/login/);
  expect(await readStore(page, 'queue')).not.toHaveLength(0);
  expect((await serverOrder(order.id)).executions).toHaveLength(0);

  await login(page, users.technician1);
  await expect
    .poll(
      async () => {
        const server = await serverOrder(order.id);
        return { status: server.status, executions: server.executions.length, photos: server.photos.length };
      },
      { timeout: 10_000 },
    )
    .toEqual({ status: 'pending_approval', executions: 1, photos: 1 });
  await page.goto('/technician/pending');
  await expect(page.getByText(t('technician.pending.emptyTitle'))).toBeVisible();
});
