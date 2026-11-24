import type { OrderDetail, PendingItem } from '@/lib/views';
import type { Draft, DraftPhoto, QueueItem, QueueRefusal } from '@/offline/db';
import {
  inTechnicianList,
  type LocalState,
  pendingItems,
  pendingOrderCounts,
  refreshNotice,
  sendNotice,
  sortToDo,
  toMyOrder,
  toTechOrder,
  withLocalPhotos,
} from './derive';

const NOW = Date.parse('2026-11-19T12:00:00Z');
const ME = 'u-me';
const at = '2026-11-19T10:00:00.000Z';

function order(over: Partial<OrderDetail> = {}): OrderDetail {
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
    materials_notes: 'cabo',
    created_by: 'boss',
    created_at: at,
    updated_at: at,
    cancelled_at: null,
    cancelled_by: null,
    cancel_reason: null,
    client: {
      id: 'cl1',
      company_id: 'c1',
      name: 'Cliente',
      phone: null,
      notes: null,
      created_at: at,
      deleted_at: null,
      deleted_by: null,
      delete_reason: null,
    },
    client_address: null,
    assignments: [],
    assignees: [],
    attempts: [],
    history: [],
    created_by_ref: { id: 'boss', full_name: 'Chefe' },
    overdue: false,
    late_supplements_unseen: 0,
    ...over,
  };
}

function draft(over: Partial<Draft> = {}): Draft {
  return {
    id: 'd1',
    userId: ME,
    orderId: 'o1',
    supplementsExecutionId: null,
    description: 'feito',
    participants: [ME],
    clientStartedAt: at,
    state: 'editing',
    refusal: null,
    createdAt: at,
    updatedAt: at,
    ...over,
  };
}

function item(over: Partial<QueueItem> & Pick<QueueItem, 'id' | 'type' | 'payload'>): QueueItem {
  return {
    userId: ME,
    orderId: 'o1',
    state: 'pending',
    attempts: 0,
    nextAttemptAt: 0,
    lastError: null,
    createdAt: at,
    ...over,
  } as QueueItem;
}

const local = (over: Partial<LocalState> = {}): LocalState => ({
  userId: ME,
  drafts: [],
  photos: [],
  queue: [],
  refusals: [],
  seen: new Set(),
  ...over,
});

const assignment = (id: string, name: string, unassigned_at: string | null = null) => ({
  id: `a-${id}`,
  company_id: 'c1',
  service_order_id: 'o1',
  user_id: id,
  assigned_at: at,
  assigned_by: 'boss',
  created_at: at,
  unassigned_at,
  unassigned_by: null,
  user: { id, full_name: name },
});

describe('toTechOrder', () => {
  it('shows an open order started on this device as in progress, with the start time', () => {
    const o = toTechOrder(order({ status: 'open' }), local({ drafts: [draft()] }), NOW);
    expect([o.status, o.startedHere]).toEqual(['in_progress', at]);
  });

  it('takes the start time from a queued start when there is no draft yet', () => {
    const o = toTechOrder(
      order({ status: 'rejected' }),
      local({ queue: [item({ id: 1, type: 'start', payload: { clientStartedAt: at } })] }),
      NOW,
    );
    expect([o.status, o.startedHere]).toEqual(['in_progress', at]);
  });

  it('ignores a supplement draft for the start and never reopens a closed order', () => {
    const supplement = draft({ supplementsExecutionId: 'e1' });
    expect(toTechOrder(order(), local({ drafts: [supplement] }), NOW).startedHere).toBeNull();
    expect(toTechOrder(order({ status: 'cancelled' }), local({ drafts: [draft()] }), NOW).status).toBe('cancelled');
  });

  it('shows the materials text still in the queue and the unresolved conflict', () => {
    const conflict: QueueRefusal = {
      id: 3,
      userId: ME,
      orderId: 'o1',
      type: 'materials',
      payload: { text: 'meu texto', expected: 'cabo' },
      code: 'conflict',
      current: 'texto do escritório',
      createdAt: at,
    };
    const o = toTechOrder(
      order(),
      local({
        queue: [item({ id: 2, type: 'materials', payload: { text: 'cabo e fonte', expected: 'cabo' } })],
        refusals: [conflict],
      }),
      NOW,
    );
    expect(o.materials_notes).toBe('cabo e fonte');
    expect(o.conflict).toEqual({ mine: 'meu texto', current: 'texto do escritório' });
  });

  it('offers as participants everyone ever assigned, self first, marking who left', () => {
    const o = toTechOrder(
      order({
        assignments: [assignment('u-bia', 'Bia', at), assignment(ME, 'Eu'), assignment('u-bia', 'Bia')],
      }),
      local(),
      NOW,
    );
    expect(o.participantOptions.map((p) => [p.id, p.active, p.isSelf])).toEqual([
      [ME, true, true],
      ['u-bia', true, false],
    ]);
  });
});

describe('toMyOrder', () => {
  it('is new until opened on this device and carries the last rejection reason', () => {
    const rejected = order({
      status: 'rejected',
      attempts: [{ review_status: 'rejected', review_comment: 'foto escura' } as OrderDetail['attempts'][number]],
    });
    expect(toMyOrder(rejected, local(), NOW)).toMatchObject({ is_new: true, rejection: 'foto escura' });
    expect(toMyOrder(rejected, local({ seen: new Set(['o1']) }), NOW).is_new).toBe(false);
    expect(toMyOrder(order(), local(), NOW).rejection).toBeNull();
  });

  it('recomputes overdue with the local status', () => {
    const late = order({ status: 'open', due_at: '2026-11-18T00:00:00Z' });
    expect(toMyOrder(late, local(), NOW).overdue).toBe(true);
  });

  const submitOf = (draftId: string) =>
    item({ id: 1, type: 'submit', payload: { draftId, clientSubmittedAt: at, stagedPhotoIds: [] } });

  it('shows a submission still on the device as waiting for approval, out of the to-do and overdue counts', () => {
    for (const status of ['in_progress', 'rejected'] as const) {
      const sent = order({
        status,
        due_at: '2026-11-18T00:00:00Z',
        attempts: [{ review_status: 'rejected', review_comment: 'foto escura' } as OrderDetail['attempts'][number]],
      });
      const o = toMyOrder(sent, local({ drafts: [draft({ state: 'queued' })], queue: [submitOf('d1')] }), NOW);
      expect(o).toMatchObject({ status: 'pending_approval', submission_queued: true, overdue: false, rejection: null });
    }
  });

  it('keeps the status for a queued supplement, a refused submission and a cancelled order', () => {
    const supplement = local({
      drafts: [draft({ state: 'queued', supplementsExecutionId: 'e1' })],
      queue: [submitOf('d1')],
    });
    expect(toMyOrder(order({ status: 'pending_approval' }), supplement, NOW).submission_queued).toBe(false);
    const refused = local({ drafts: [draft({ state: 'refused', refusal: 'not_assigned' })] });
    expect(toMyOrder(order({ status: 'in_progress' }), refused, NOW)).toMatchObject({
      status: 'in_progress',
      submission_queued: false,
    });
    const queued = local({ drafts: [draft({ state: 'queued' })], queue: [submitOf('d1')] });
    expect(toMyOrder(order({ status: 'cancelled' }), queued, NOW)).toMatchObject({
      status: 'cancelled',
      submission_queued: true,
    });
  });
});

describe('pendingItems', () => {
  const orders = new Map([['o1', { order_number: 7, title: 'Instalar', client_name: 'Cliente', cancel_reason: null }]]);
  const photo = (id: string, uploaded: boolean) => ({ id, draftId: 'd1', uploaded }) as DraftPhoto;

  it('maps each queue item to its kind, state and photo progress', () => {
    const list = pendingItems(
      local({
        drafts: [
          draft({ id: 'd1', state: 'queued' }),
          draft({ id: 'd2', state: 'queued', supplementsExecutionId: 'e1' }),
        ],
        photos: [photo('p1', true), photo('p2', false)],
        queue: [
          item({ id: 1, type: 'submit', payload: { draftId: 'd1', clientSubmittedAt: at, stagedPhotoIds: [] } }),
          item({
            id: 2,
            type: 'submit',
            orderId: 'o2',
            payload: { draftId: 'd2', clientSubmittedAt: at, stagedPhotoIds: [] },
            attempts: 2,
            nextAttemptAt: NOW + 10_000,
          }),
          item({
            id: 3,
            type: 'materials',
            payload: { text: 'x', expected: null },
            state: 'blocked',
            lastError: 'boom',
          }),
        ],
      }),
      orders,
      { now: NOW, sending: true },
    );
    expect(list.map((i) => [i.kind, i.state])).toEqual([
      ['submit', 'sending'],
      ['supplement', 'waiting'],
      ['materials', 'blocked'],
    ]);
    expect(list[0]).toMatchObject({ order_number: 7, order_title: 'Instalar', photos: { done: 1, total: 2 } });
    expect(list[1]?.next_attempt_at).toBe(new Date(NOW + 10_000).toISOString());
    expect(list[2]?.error).toBe('boom');
  });

  it('puts an item behind the head of the same order as queued, and nothing is sending while the queue is idle', () => {
    const list = pendingItems(
      local({
        queue: [
          item({ id: 1, type: 'start', payload: { clientStartedAt: at } }),
          item({ id: 2, type: 'materials', payload: { text: 'x', expected: null } }),
        ],
      }),
      orders,
      { now: NOW, sending: false },
    );
    expect(list.map((i) => i.state)).toEqual(['queued', 'queued']);
  });

  it('lists refused drafts and refusals of start and materials with their code', () => {
    const list = pendingItems(
      local({
        drafts: [draft({ id: 'd9', state: 'refused', refusal: 'order_closed' }), draft({ id: 'd8' })],
        refusals: [
          {
            id: 4,
            userId: ME,
            orderId: 'o2',
            type: 'start',
            payload: { clientStartedAt: at },
            code: 'not_assigned',
            current: null,
            createdAt: at,
          },
        ],
      }),
      orders,
      { now: NOW, sending: false },
    );
    expect(list.map((i) => [i.id, i.kind, i.state, i.refusal])).toEqual([
      ['draft:d9', 'submit', 'refused', 'order_closed'],
      ['refusal:4', 'start', 'refused', 'not_assigned'],
    ]);
  });

  it('folds a queued start into the submission of the same order: one card, with the state of the start ahead', () => {
    const list = pendingItems(
      local({
        drafts: [draft({ id: 'd1', state: 'queued' })],
        queue: [
          item({ id: 1, type: 'start', payload: { clientStartedAt: at }, attempts: 1, nextAttemptAt: NOW + 5_000 }),
          item({ id: 2, type: 'submit', payload: { draftId: 'd1', clientSubmittedAt: at, stagedPhotoIds: [] } }),
        ],
      }),
      orders,
      { now: NOW, sending: false },
    );
    expect(list.map((i) => [i.id, i.kind, i.state, i.with_start, i.folded])).toEqual([
      ['queue:2', 'submit', 'waiting', true, ['queue:1']],
    ]);
  });

  it('folds a refused start into the refused submission of the same order', () => {
    const list = pendingItems(
      local({
        drafts: [draft({ id: 'd9', state: 'refused', refusal: 'not_assigned' })],
        refusals: [
          {
            id: 4,
            userId: ME,
            orderId: 'o1',
            type: 'start',
            payload: { clientStartedAt: at },
            code: 'not_assigned',
            current: null,
            createdAt: at,
          },
        ],
      }),
      orders,
      { now: NOW, sending: false },
    );
    expect(list.map((i) => [i.id, i.state, i.with_start, i.folded])).toEqual([
      ['draft:d9', 'refused', true, ['refusal:4']],
    ]);
  });

  it('names an order that left the device by the snapshot kept when acting, and says it is no longer here', () => {
    const snapshot = { number: 42, title: 'Trocar DVR', clientName: 'Padaria' };
    const list = pendingItems(
      local({
        drafts: [draft({ id: 'd9', orderId: 'gone', state: 'refused', refusal: 'not_assigned', order: snapshot })],
        refusals: [
          {
            id: 4,
            userId: ME,
            orderId: 'gone',
            type: 'materials',
            payload: { text: 'x', expected: null },
            code: 'not_assigned',
            current: null,
            createdAt: at,
            order: snapshot,
          },
        ],
        queue: [item({ id: 1, type: 'start', payload: { clientStartedAt: at } })],
      }),
      orders,
      { now: NOW, sending: false },
    );
    expect(list.map((i) => [i.order_number, i.order_title, i.client_name, i.on_device])).toEqual([
      [7, 'Instalar', 'Cliente', true],
      [42, 'Trocar DVR', 'Padaria', false],
      [42, 'Trocar DVR', 'Padaria', false],
    ]);
  });

  it('brings the cancel reason of the order to an order_closed refusal', () => {
    const cancelled = new Map([
      ['o1', { order_number: 7, title: 'Instalar', client_name: 'Cliente', cancel_reason: 'Cliente desistiu' }],
    ]);
    const refusal = {
      id: 4,
      userId: ME,
      orderId: 'o1',
      type: 'materials' as const,
      payload: { text: 'x', expected: null },
      current: null,
      createdAt: at,
    };
    const list = pendingItems(
      local({
        refusals: [
          { ...refusal, code: 'order_closed' },
          { ...refusal, id: 5, code: 'conflict' },
        ],
      }),
      cancelled,
      { now: NOW, sending: false },
    );
    expect(list.map((i) => i.cancel_reason)).toEqual(['Cliente desistiu', null]);
  });
});

describe('withLocalPhotos', () => {
  it('F9: shows the file kept on the device when there is one, else the signed URL', () => {
    const photo = (id: string) => ({ id, url: `signed-${id}` }) as OrderDetail['attempts'][number]['photos'][number];
    const attempt = {
      id: 'e1',
      photos: [photo('p1'), photo('p2')],
      supplements: [{ id: 'e2', photos: [photo('p3')] }],
    } as unknown as OrderDetail['attempts'][number];
    const local = new Map([
      ['p1', 'blob:p1'],
      ['p3', 'blob:p3'],
    ]);

    const [shown] = withLocalPhotos([attempt], (id) => local.get(id) ?? null);

    expect(shown?.photos.map((p) => p.url)).toEqual(['blob:p1', 'signed-p2']);
    expect(shown?.supplements[0]?.photos.map((p) => p.url)).toEqual(['blob:p3']);
  });
});

describe('inTechnicianList', () => {
  const day = 24 * 60 * 60 * 1000;
  const ago = (ms: number) => new Date(NOW - ms).toISOString();

  it('keeps active orders whatever their age', () => {
    for (const status of ['open', 'in_progress', 'pending_approval', 'rejected'] as const) {
      expect(inTechnicianList({ status, updated_at: ago(90 * day) }, NOW)).toBe(true);
    }
  });

  it('keeps approved and cancelled orders for 7 days after closing, then drops them', () => {
    for (const status of ['approved', 'cancelled'] as const) {
      expect(inTechnicianList({ status, updated_at: ago(7 * day - 1000) }, NOW)).toBe(true);
      expect(inTechnicianList({ status, updated_at: ago(7 * day + 1000) }, NOW)).toBe(false);
    }
  });
});

describe('sendNotice', () => {
  it('na fila com sinal, avisa que ficou guardado e sobe sozinho, sem afirmar que já está subindo', () => {
    expect(sendNotice('queued', false)).toBe('storedToast');
  });

  it('na fila sem sinal, avisa que entrou na fila', () => {
    expect(sendNotice('queued', true)).toBe('queuedToast');
  });

  it('já enviado, avisa que foi enviado', () => {
    expect(sendNotice('sent', false)).toBe('sentToast');
  });
});

describe('sortToDo', () => {
  const item = (order_number: number, over: Partial<OrderDetail> = {}) =>
    order({ id: `o${order_number}`, order_number, ...over });

  it('puts overdue first, then the nearest due date, priority breaking ties, then no due date, then the number', () => {
    const list = [
      item(1),
      item(2, { priority: 'urgent' }),
      item(3, { due_at: '2026-11-21T12:00:00Z' }),
      item(4, { due_at: '2026-11-20T12:00:00Z' }),
      item(5, { due_at: '2026-11-20T12:00:00Z', priority: 'high' }),
      item(6, { due_at: '2026-11-18T12:00:00Z', overdue: true }),
    ];
    expect(sortToDo(list).map((o) => o.order_number)).toEqual([6, 5, 4, 3, 2, 1]);
  });
});

describe('pendingOrderCounts', () => {
  const entry = (order_id: string, state: PendingItem['state']) => ({ order_id, state }) as PendingItem;

  it('counts orders, not queue items: an order with a refusal needs the technician, the others are still on the device', () => {
    expect(
      pendingOrderCounts([
        entry('o1', 'refused'),
        entry('o1', 'queued'),
        entry('o2', 'sending'),
        entry('o2', 'queued'),
      ]),
    ).toEqual({ attention: 1, onDevice: 1, total: 2 });
  });
});

describe('refreshNotice', () => {
  it('says the list was updated when the read came back', () => {
    expect(refreshNotice({ offline: false, failed: false, lastSyncAt: at })).toEqual({ key: 'refreshedAt', time: at });
  });

  it('without signal, or when the read failed, says which list is on screen', () => {
    expect(refreshNotice({ offline: true, failed: false, lastSyncAt: at })).toEqual({
      key: 'refreshOffline',
      time: at,
    });
    expect(refreshNotice({ offline: false, failed: true, lastSyncAt: at })).toEqual({
      key: 'refreshOffline',
      time: at,
    });
    expect(refreshNotice({ offline: true, failed: false, lastSyncAt: null })).toEqual({
      key: 'refreshOfflineNever',
      time: null,
    });
  });
});
