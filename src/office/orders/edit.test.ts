import { conflictCurrent, orderEdit } from './edit';

const loaded = { materials_notes: '1 cabo', assignee_ids: ['t1', 't2'] };
const values = {
  address_id: 'a1',
  service_type: 'installation' as const,
  title: 'Instalar câmeras',
  instructions: '',
  priority: 'high' as const,
  due_date: '2026-12-01',
  materials: '1 cabo',
  assignee_ids: ['t2', 't1'],
};

describe('orderEdit (03, update_order from the edit form)', () => {
  it('always carries the fields; no address is null', () => {
    expect(orderEdit(loaded, { ...values, address_id: 'none' }, '1 cabo')).toEqual({
      client_address_id: null,
      service_type: 'installation',
      title: 'Instalar câmeras',
      instructions: '',
      priority: 'high',
      due_date: '2026-12-01',
    });
  });

  it('leaves materials out when the user did not change the text (spaces around do not count)', () => {
    expect(orderEdit(loaded, { ...values, materials: ' 1 cabo ' }, '1 cabo').materials).toBeUndefined();
    expect(orderEdit({ ...loaded, materials_notes: null }, { ...values, materials: '  ' }, null).materials).toBe(
      undefined,
    );
  });

  it('sends the new text with the expected one (the loaded text, or the current one after a conflict)', () => {
    expect(orderEdit(loaded, { ...values, materials: '2 cabos' }, '1 cabo').materials).toEqual({
      text: '2 cabos',
      expected: '1 cabo',
    });
    expect(orderEdit(loaded, { ...values, materials: '' }, '3 cabos').materials).toEqual({
      text: '',
      expected: '3 cabos',
    });
  });

  it('leaves the technicians out when the set is the same, in any order', () => {
    expect(orderEdit(loaded, values, '1 cabo').assignee_ids).toBeUndefined();
  });

  it('sends the final set when it changed, [] when all were removed', () => {
    expect(orderEdit(loaded, { ...values, assignee_ids: ['t1'] }, '1 cabo').assignee_ids).toEqual(['t1']);
    expect(orderEdit(loaded, { ...values, assignee_ids: [] }, '1 cabo').assignee_ids).toEqual([]);
  });
});

describe('conflictCurrent (errors.md, conflict)', () => {
  it('reads the current server text from the details; null or missing is an empty text', () => {
    expect(conflictCurrent({ current: '3 cabos' })).toBe('3 cabos');
    expect(conflictCurrent({ current: null })).toBe('');
    expect(conflictCurrent(null)).toBe('');
  });
});
