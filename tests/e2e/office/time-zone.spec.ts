// E4 (docs/e2e.md): o navegador num fuso que está em outro dia do calendário da empresa. O prazo é o fim do dia no fuso
// da empresa (03, R5), e a tela mostra o mesmo prazo ("hoje", "ontem", a data) e o mesmo "atrasada" que no fuso dela.
import { expect, test } from '@playwright/test';
import { calendarDay, formatDate, formatDue } from '@/lib/format';
import { t } from '@/lib/i18n';
import { login } from '../support/app';
import { companyTimeZone, createOrder, serverOrder, users } from '../support/backend';

const COMPANY_ZONE = 'America/Sao_Paulo';
// Um fuso que, agora, está sempre num dia diferente do de São Paulo: 17 h à frente ou 8 h atrás.
const spHour = Number(
  new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hourCycle: 'h23', timeZone: COMPANY_ZONE }).format(new Date()),
);
const browserZone = spHour >= 7 ? 'Pacific/Kiritimati' : 'Pacific/Pago_Pago';

test.use({ timezoneId: browserZone });

function companyDay(offsetDays: number): string {
  return calendarDay(new Date(Date.now() + offsetDays * 86_400_000), COMPANY_ZONE);
}

test('fuso do navegador em outro dia: o prazo e o atraso seguem o fuso da empresa', async ({ page }) => {
  expect(await companyTimeZone()).toBe(COMPANY_ZONE);
  expect(calendarDay(new Date(), browserZone)).not.toBe(calendarDay(new Date(), COMPANY_ZONE));

  const today = await createOrder([users.technician1], { dueDate: companyDay(0) });
  const yesterday = await createOrder([users.technician1], { dueDate: companyDay(-1) });

  await login(page, users.manager);
  await expect(page).toHaveURL(/\/office$/);

  for (const [order, overdue] of [
    [today, false],
    [yesterday, true],
  ] as const) {
    const { dueAt } = await serverOrder(order.id);
    if (!dueAt) throw new Error('O.S. sem prazo');
    await page.goto(`/office/orders/${order.id}`);
    await expect(page.getByRole('heading', { name: order.title })).toBeVisible();
    await expect(page.getByText(t('ui.order.due', { date: formatDue(dueAt, COMPANY_ZONE) }))).toBeVisible();
    await expect(page.getByText(formatDate(dueAt, COMPANY_ZONE), { exact: true })).toBeVisible();
    await expect(page.getByText(t('ui.badge.overdue'))).toHaveCount(overdue ? 1 : 0);
  }
  // No fuso do navegador, o mesmo prazo cairia em outro dia: a tela acima não o usou.
  const { dueAt } = await serverOrder(today.id);
  expect(formatDate(dueAt ?? '', browserZone)).not.toBe(formatDate(dueAt ?? '', COMPANY_ZONE));
});
