// E5 (docs/e2e.md): o técnico muda os materiais enquanto o escritório edita a O.S. A edição sai numa chamada só
// (03, `update_order`): o `conflict` dos materiais (R11) desfaz tudo, a tela mostra os dois textos e só salva depois
// da escolha, nunca por cima do texto do técnico sem mostrá-lo.
import { expect, test } from '@playwright/test';
import { t } from '@/lib/i18n';
import { login } from '../support/app';
import { createOrder, serverOrderText, updateMaterialsAs, users } from '../support/backend';

test('materiais mudados pelo técnico durante a edição: nada salva até o escritório escolher', async ({ page }) => {
  const order = await createOrder([users.technician1]);
  const edited = `${order.title} (editada)`;
  const office = 'Texto do escritório: 2 câmeras dome.';
  const technician = 'Texto do técnico: levar escada de 6 m.';

  await login(page, users.manager);
  await expect(page).toHaveURL(/\/office$/);
  await page.goto(`/office/orders/${order.id}/edit`);
  await page.getByLabel(t('office.orderForm.title'), { exact: true }).fill(edited);
  const materials = page.getByLabel(t('office.orderForm.materials'), { exact: true });
  await materials.fill(office);

  // O técnico grava os materiais com sinal enquanto a edição está aberta.
  await updateMaterialsAs(users.technician1, order.id, technician, null);

  const save = page.getByRole('button', { name: t('office.orderForm.saved') });
  await save.click();
  await expect(page.getByText(t('office.orderForm.conflictTitle'), { exact: true })).toBeVisible();
  const current = page.getByRole('radio', { name: new RegExp(t('office.orderForm.conflictCurrent')) });
  const mine = page.getByRole('radio', { name: new RegExp(t('office.orderForm.conflictMine')) });
  await expect(current).toBeVisible();
  await expect(page.getByText(technician)).toBeVisible();
  // Atômica: o título também não foi gravado.
  expect(await serverOrderText(order.id)).toEqual({ title: order.title, materials: technician });

  // Salvar de novo sem escolher não grava nada.
  await save.click();
  await expect(page.getByText(t('office.orderForm.conflictChoose'))).toBeVisible();
  expect(await serverOrderText(order.id)).toEqual({ title: order.title, materials: technician });

  // Escolhido o texto do escritório, a edição inteira sai de uma vez.
  await mine.click();
  await expect(materials).toHaveValue(office);
  await save.click();
  await expect(page).toHaveURL(new RegExp(`/office/orders/${order.id}$`));
  expect(await serverOrderText(order.id)).toEqual({ title: edited, materials: office });
});
