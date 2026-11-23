import { updateOrderArgs } from './update-order';

const fields = {
  client_address_id: null,
  service_type: 'installation' as const,
  title: 'Instalar câmeras',
  instructions: '  ',
  priority: 'normal' as const,
  due_date: null,
};

describe('updateOrderArgs (03, update_order)', () => {
  it('leaves materials and technicians untouched when the edit does not carry them', () => {
    const args = updateOrderArgs('o1', fields);

    expect(args).toEqual({
      p_order_id: 'o1',
      p_title: 'Instalar câmeras',
      p_instructions: undefined,
      p_priority: 'normal',
      p_due_date: undefined,
      p_service_type: 'installation',
      p_client_address_id: undefined,
    });
    expect(Object.keys(args)).not.toContain('p_update_materials');
    expect(Object.keys(args)).not.toContain('p_assignee_ids');
  });

  it('changes materials with the flag, the new text and the text the screen loaded (R11)', () => {
    const args = updateOrderArgs('o1', { ...fields, materials: { text: ' 2 cabos ', expected: '1 cabo' } });

    expect(args).toMatchObject({
      p_update_materials: true,
      p_materials_notes: '2 cabos',
      p_materials_expected: '1 cabo',
    });
  });

  it('clears materials with the flag and no text; an empty loaded text goes as null', () => {
    const args = updateOrderArgs('o1', { ...fields, materials: { text: '  ', expected: null } });

    expect(args).toMatchObject({ p_update_materials: true });
    expect(args.p_materials_notes).toBeUndefined();
    expect(args.p_materials_expected).toBeUndefined();
  });

  it('sends the final technician set, and [] removes them all', () => {
    expect(updateOrderArgs('o1', { ...fields, assignee_ids: ['t1', 't2'] }).p_assignee_ids).toEqual(['t1', 't2']);
    expect(updateOrderArgs('o1', { ...fields, assignee_ids: [] }).p_assignee_ids).toEqual([]);
  });
});
