import {
  type ClientRow,
  clientMatches,
  directWriteError,
  leavingWhileWorking,
  mayHaveOfflineWork,
  memberIdentity,
  memberState,
  type OrderListRow,
  splitOrderFilters,
  toClientListItem,
  toOrderListItem,
} from './derive';

const NOW = Date.parse('2026-11-19T12:00:00Z');
const ana = { id: 'u-ana', full_name: 'Ana' };
const bia = { id: 'u-bia', full_name: 'Bia' };
const boss = { id: 'u-boss', full_name: 'Chefe' };

function assignment(user: { id: string; full_name: string }, unassigned_at: string | null = null) {
  return {
    id: `a-${user.id}`,
    company_id: 'c1',
    service_order_id: 'o1',
    user_id: user.id,
    assigned_at: '2026-11-01T10:00:00Z',
    assigned_by: boss.id,
    created_at: '2026-11-01T10:00:00Z',
    unassigned_at,
    unassigned_by: unassigned_at ? boss.id : null,
    user,
  };
}

describe('toOrderListItem', () => {
  function listRow(over: Partial<OrderListRow> = {}): OrderListRow {
    return {
      id: 'o1',
      order_number: 7,
      title: 'Instalar',
      status: 'open',
      priority: 'normal',
      service_type: 'installation',
      due_at: null,
      client_id: 'cl1',
      client: { id: 'cl1', name: 'Cliente' },
      assignments: [],
      late: [],
      ...over,
    };
  }

  it('keeps only what the row shows, with the active technicians', () => {
    const item = toOrderListItem(
      listRow({ assignments: [assignment(ana), assignment(bia, '2026-11-02T10:00:00Z')] }),
      NOW,
    );

    expect(item).toEqual({
      id: 'o1',
      order_number: 7,
      title: 'Instalar',
      status: 'open',
      priority: 'normal',
      service_type: 'installation',
      due_at: null,
      client_id: 'cl1',
      client: { id: 'cl1', name: 'Cliente' },
      assignees: [ana],
      overdue: false,
      late_supplements_unseen: 0,
    });
  });

  it('counts the unacknowledged late supplements the query brought (04, R11)', () => {
    expect(toOrderListItem(listRow({ late: [{ id: 'e1' }, { id: 'e2' }] }), NOW).late_supplements_unseen).toBe(2);
  });
});

function address(id: string, over: Partial<ClientRow['addresses'][number]> = {}): ClientRow['addresses'][number] {
  return {
    id,
    company_id: 'c1',
    client_id: 'cl1',
    label: null,
    zip_code: null,
    street: 'Rua',
    number: null,
    complement: null,
    district: null,
    city: 'Curitiba',
    state: 'PR',
    reference: null,
    is_primary: false,
    created_at: '2026-10-01T10:00:00Z',
    deleted_at: null,
    deleted_by: null,
    delete_reason: null,
    ...over,
  };
}

function clientRow(over: Partial<ClientRow> = {}): ClientRow {
  return {
    id: 'cl1',
    company_id: 'c1',
    name: 'Maria Souza',
    phone: '41999998888',
    notes: null,
    created_at: '2026-10-01T10:00:00Z',
    deleted_at: null,
    deleted_by: null,
    delete_reason: null,
    addresses: [],
    orders: [],
    ...over,
  };
}

describe('toClientListItem', () => {
  it('takes the active primary address, counts the active addresses and the orders still running', () => {
    const item = toClientListItem(
      clientRow({
        addresses: [
          address('a1'),
          address('a2', { is_primary: true }),
          address('a3', { deleted_at: '2026-11-01T00:00:00Z', deleted_by: 'u', delete_reason: 'x' }),
        ],
        orders: [{ status: 'open' }, { status: 'pending_approval' }, { status: 'approved' }, { status: 'cancelled' }],
      }),
    );
    expect(item.primary_address?.id).toBe('a2');
    expect(item.address_count).toBe(2);
    expect(item.open_orders).toBe(2);
    expect(item).not.toHaveProperty('orders');
  });

  it('has no primary address when the primary was deleted (02, R4)', () => {
    const item = toClientListItem(clientRow({ addresses: [address('a1')] }));
    expect(item.primary_address).toBeNull();
  });
});

describe('clientMatches', () => {
  it('finds by part of the name, ignoring case, or by the phone digits', () => {
    const c = clientRow();
    expect(clientMatches(c, 'souza')).toBe(true);
    expect(clientMatches(c, '(41) 99999')).toBe(true);
    expect(clientMatches(c, 'joão')).toBe(false);
    expect(clientMatches(c, '')).toBe(true);
  });

  it('finds by the phone digits even when the phone was saved with a mask', () => {
    expect(clientMatches(clientRow({ phone: '(41) 99999-8888' }), '4199999')).toBe(true);
  });
});

describe('splitOrderFilters', () => {
  it('sends to the database only the columns it filters; the rest filters the cached list', () => {
    expect(
      splitOrderFilters({
        search: '#12',
        status: ['open'],
        priority: ['urgent'],
        service_type: ['maintenance'],
        technician_id: 'u-ana',
        client_id: 'cl1',
        due_from: '2026-11-01',
        due_to: '2026-11-30',
        overdue: true,
        unassigned: true,
      }),
    ).toEqual({
      query: { status: ['open'], priority: ['urgent'], service_type: ['maintenance'], client_id: 'cl1', overdue: true },
      local: { search: '#12', technician_id: 'u-ana', due_from: '2026-11-01', due_to: '2026-11-30', unassigned: true },
    });
  });

  it('gives the same database query for empty and absent filters, so the cache key does not change', () => {
    const empty = splitOrderFilters({
      search: '',
      status: [],
      priority: undefined,
      technician_id: null,
      client_id: null,
      due_from: null,
      due_to: null,
      overdue: false,
      unassigned: undefined,
    });
    expect(empty).toEqual({ query: {}, local: {} });
    expect(splitOrderFilters({ search: 'ana', technician_id: 'u-ana' }).query).toEqual({});
  });
});

describe('directWriteError', () => {
  it('treats a constraint violation of a direct update as invalid_input (errors.md)', () => {
    for (const code of ['23514', '23505', '23502']) {
      const error = directWriteError({ code, message: 'violates' }, 400);
      expect([error.errorClass, error.code]).toEqual(['rule', 'invalid_input']);
    }
  });

  it('classifies the rest like any other call', () => {
    expect(directWriteError({ message: 'Failed to fetch' }, 0).errorClass).toBe('network');
    expect(directWriteError({ code: '42501', message: 'denied' }, 403).errorClass).toBe('bug');
  });
});

describe('offline work warnings (UX review 1)', () => {
  it('a cancel may land on offline work while the pair works on the order or redoes it', () => {
    expect(
      (['open', 'in_progress', 'pending_approval', 'rejected', 'approved', 'cancelled'] as const).filter((status) =>
        mayHaveOfflineWork({ status }),
      ),
    ).toEqual(['in_progress', 'rejected']);
  });

  it('names who leaves the order while the pair may be working offline: their submission will be refused', () => {
    const working = { status: 'in_progress' as const, assignees: [ana, bia] };
    expect(leavingWhileWorking(working, [bia.id, boss.id])).toEqual([ana]);
    expect(leavingWhileWorking(working, [ana.id, bia.id])).toEqual([]);
    expect(leavingWhileWorking({ ...working, status: 'open' }, [])).toEqual([]);
  });
});

describe('members (06, R9)', () => {
  const profile = {
    id: 'u-1',
    full_name: 'Nome do perfil',
    phone: null,
    is_platform_admin: false,
    created_at: '',
    updated_at: '',
  };
  const invite = { full_name: 'Nome digitado', email: 'digitado@fast.test', invited_at: '2026-11-24T10:00:00Z' };

  it('shows the name and email typed in the invite until it is accepted, then the profile', () => {
    expect(memberIdentity({ status: 'pending', profile: null, invite })).toEqual({
      name: 'Nome digitado',
      email: 'digitado@fast.test',
    });
    expect(memberIdentity({ status: 'declined', profile: null, invite }).name).toBe('Nome digitado');
    // Removido e convidado de novo: o perfil continua visível, mas o convite novo manda até o aceite.
    expect(memberIdentity({ status: 'pending', profile, invite }).name).toBe('Nome digitado');
    expect(memberIdentity({ status: 'accepted', profile, invite })).toEqual({ name: 'Nome do perfil', email: null });
  });

  it('falls back to what it has: a member written directly in the database has no invite', () => {
    expect(memberIdentity({ status: 'accepted', profile, invite: null }).name).toBe('Nome do perfil');
    expect(memberIdentity({ status: 'pending', profile: null, invite: null }).name).toBe('—');
  });

  it('a removal outranks the invite state', () => {
    expect(memberState({ status: 'accepted', deleted_at: null })).toBe('active');
    expect(memberState({ status: 'pending', deleted_at: null })).toBe('pending');
    expect(memberState({ status: 'declined', deleted_at: null })).toBe('declined');
    expect(memberState({ status: 'pending', deleted_at: '2026-11-24T10:00:00Z' })).toBe('removed');
  });
});
