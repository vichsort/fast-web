// O técnico guarda no aparelho só as colunas que as telas usam (../fast/docs/offline.md, "O que fica no aparelho").
import { describe, expect, it } from 'vitest';
import { TECHNICIAN_ORDER_SELECT } from './select';

describe('technician order select', () => {
  it('names every column, so a column the screens do not use never reaches the device', () => {
    expect(TECHNICIAN_ORDER_SELECT).not.toContain('*');
  });

  it('keeps the client notes, which are for the field', () => {
    expect(TECHNICIAN_ORDER_SELECT).toMatch(/client:clients!service_orders_client_id_fkey\(id, name, phone, notes\)/);
  });
});
