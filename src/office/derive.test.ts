import { ApiError } from '@/offline/queue/errors';
import {
  actionErrorCode,
  type ClientRow,
  clientMatches,
  directWriteError,
  type ExecutionRow,
  type OrderRow,
  toClientListItem,
  toOrderDetail,
} from './derive';

const NOW = Date.parse('2026-11-19T12:00:00Z');
const ana = { id: 'u-ana', full_name: 'Ana' };
const bia = { id: 'u-bia', full_name: 'Bia' };
const boss = { id: 'u-boss', full_name: 'Chefe' };

function execution(over: Partial<ExecutionRow> & Pick<ExecutionRow, 'id' | 'received_at'>): ExecutionRow {
  return {
    acknowledged_at: null,
    acknowledged_by: null,
    client_started_at: null,
    client_submitted_at: over.received_at,
    company_id: 'c1',
    converted_to_supplement: false,
    created_at: over.received_at,
    description: null,
    is_late: false,
    participants: [ana.id],
    review_comment: null,
    review_status: null,
    reviewed_at: null,
    reviewed_by: null,
    service_order_id: 'o1',
    submitted_by: ana.id,
    supplements_execution_id: null,
    submitter: ana,
    reviewer: null,
    acknowledger: null,
    photos: [],
    ...over,
  };
}

function order(over: Partial<OrderRow> = {}): OrderRow {
  return {
    id: 'o1',
    company_id: 'c1',
    order_number: 7,
    client_id: 'cl1',
    client_address_id: null,
    address: null,
    service_type: 'installation',
    title: 'Instalar',
    instructions: null,
    priority: 'normal',
    status: 'open',
    due_at: null,
    materials_notes: null,
    created_by: boss.id,
    created_at: '2026-11-01T10:00:00Z',
    updated_at: '2026-11-01T10:00:00Z',
    cancelled_at: null,
    cancelled_by: null,
    cancel_reason: null,
    client: {
      id: 'cl1',
      company_id: 'c1',
      name: 'Cliente',
      phone: null,
      notes: null,
      created_at: '2026-10-01T10:00:00Z',
      deleted_at: null,
      deleted_by: null,
      delete_reason: null,
    },
    client_address: null,
    created_by_ref: boss,
    assignments: [],
    executions: [],
    ...over,
  } as OrderRow;
}

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

describe('toOrderDetail', () => {
  it('numbers the attempts by arrival and nests the supplements under their attempt', () => {
    const detail = toOrderDetail(
      order({
        executions: [
          execution({ id: 'sup', received_at: '2026-11-03T10:00:00Z', supplements_execution_id: 'second' }),
          execution({ id: 'second', received_at: '2026-11-02T10:00:00Z' }),
          execution({
            id: 'first',
            received_at: '2026-11-01T12:00:00Z',
            review_status: 'rejected',
            reviewed_at: '2026-11-01T13:00:00Z',
          }),
        ],
      }),
      NOW,
    );
    expect(detail.attempts.map((a) => [a.id, a.attempt_number])).toEqual([
      ['first', 1],
      ['second', 2],
    ]);
    expect(detail.attempts[1]?.supplements.map((s) => s.id)).toEqual(['sup']);
    expect(detail.attempts[0]?.supplements).toEqual([]);
  });

  it('lists only the active assignments as assignees and resolves participants from every assignment', () => {
    const detail = toOrderDetail(
      order({
        assignments: [assignment(ana), assignment(bia, '2026-11-02T00:00:00Z')],
        executions: [execution({ id: 'e1', received_at: '2026-11-02T10:00:00Z', participants: [ana.id, bia.id] })],
      }),
      NOW,
    );
    expect(detail.assignees).toEqual([ana]);
    expect(detail.attempts[0]?.participant_refs).toEqual([ana, bia]);
  });

  it('marks overdue only when the due date passed in open, in_progress or rejected', () => {
    const past = '2026-11-18T23:59:59Z';
    expect(toOrderDetail(order({ due_at: past, status: 'open' }), NOW).overdue).toBe(true);
    expect(toOrderDetail(order({ due_at: past, status: 'rejected' }), NOW).overdue).toBe(true);
    expect(toOrderDetail(order({ due_at: past, status: 'pending_approval' }), NOW).overdue).toBe(false);
    expect(toOrderDetail(order({ due_at: '2026-11-20T00:00:00Z', status: 'open' }), NOW).overdue).toBe(false);
    expect(toOrderDetail(order({ due_at: null, status: 'open' }), NOW).overdue).toBe(false);
  });

  it('counts the late supplements still without acknowledgement', () => {
    const detail = toOrderDetail(
      order({
        executions: [
          execution({ id: 'a', received_at: '2026-11-01T10:00:00Z', review_status: 'approved' }),
          execution({ id: 's1', received_at: '2026-11-02T10:00:00Z', supplements_execution_id: 'a', is_late: true }),
          execution({
            id: 's2',
            received_at: '2026-11-03T10:00:00Z',
            supplements_execution_id: 'a',
            is_late: true,
            acknowledged_at: '2026-11-04T10:00:00Z',
          }),
        ],
      }),
      NOW,
    );
    expect(detail.late_supplements_unseen).toBe(1);
  });

  it('computes photo alerts, the late delivery alert and takes the photo urls given', () => {
    const photo = {
      id: 'p1',
      company_id: 'c1',
      service_order_id: 'o1',
      execution_id: 'e1',
      storage_path: 'x',
      mime_type: 'image/jpeg',
      file_size: 10,
      width: null,
      height: null,
      source: 'gallery' as const,
      captured_at: null,
      latitude: null,
      longitude: null,
      accuracy_m: null,
      uploaded_at: '2026-11-02T10:00:00Z',
      created_at: '2026-11-02T10:00:00Z',
    };
    const detail = toOrderDetail(
      order({
        due_at: '2026-11-01T23:59:59Z',
        executions: [execution({ id: 'e1', received_at: '2026-11-02T10:00:00Z', photos: [photo] })],
      }),
      NOW,
      new Map([['p1', 'https://signed/p1']]),
    );
    const attempt = detail.attempts[0];
    expect(attempt?.alerts).toContain('late_delivery');
    expect(attempt?.photos[0]?.alerts).toEqual(['gallery_without_exif']);
    expect(attempt?.photos[0]?.url).toBe('https://signed/p1');
  });

  it('keeps the history oldest first and leaves it empty when the row has none', () => {
    expect(toOrderDetail(order(), NOW).history).toEqual([]);
    const event = (id: string, created_at: string) => ({
      id,
      company_id: 'c1',
      service_order_id: 'o1',
      actor_id: null,
      event_type: 'updated',
      metadata: {},
      created_at,
      actor: null,
    });
    const detail = toOrderDetail(
      order({ history: [event('h2', '2026-11-02T00:00:00Z'), event('h1', '2026-11-01T00:00:00Z')] }),
      NOW,
    );
    expect(detail.history.map((h) => h.id)).toEqual(['h1', 'h2']);
  });
});

describe('actionErrorCode', () => {
  it('keeps the catalog code of a rule refusal', () => {
    expect(actionErrorCode(new ApiError('rule', 'stale_review', 'stale_review'))).toBe('stale_review');
  });

  it('maps the other classes to the texts the office shows', () => {
    expect(actionErrorCode(new ApiError('network', null, 'x'))).toBe('offline');
    expect(actionErrorCode(new ApiError('session', null, 'x'))).toBe('not_authenticated');
    expect(actionErrorCode(new ApiError('server', null, 'x'))).toBe('unknown');
    expect(actionErrorCode(new ApiError('bug', null, 'x'))).toBe('unknown');
    expect(actionErrorCode(new Error('boom'))).toBe('unknown');
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
