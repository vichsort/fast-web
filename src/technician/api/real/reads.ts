// Leituras do técnico: o servidor (com o cache persistido para abrir sem sinal) mais o que está no aparelho.
import { useQuery } from '@tanstack/react-query';
import * as React from 'react';
import { HISTORY_SELECT, ORDER_SELECT, photoUrls } from '@/lib/orders-query';
import { supabase } from '@/lib/supabase';
import type { OrderDetail, PendingItem, SyncState } from '@/mocks';
import { type OrderRow, toOrderDetail } from '@/office/derive';
import { db } from '@/offline/db';
import { ApiError, classifyFunctionError, classifyRpcError } from '@/offline/queue/errors';
import { pruneSeenPhotos, saveSeenPhotos } from '@/offline/seen-photos';
import { pendingItems, toMyOrder, toTechOrder, withAlerts, withLocalPhotos } from '../../derive';
import type { Draft, MyOrder, Read, TechOrder, TechSession } from '../types';
import { current } from './context';
import { parseDraftKey, photoData, seenPhotoUrl, useLocal } from './local';
import { markOnline, useRunner } from './runner';

async function invoke<T>(name: string, body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke<T>(name, { body });
  if (error) throw await classifyFunctionError(error);
  return data as T;
}

/** Leitura que marca o sinal: deu certo, há sinal; falhou por rede, não há (Q7). */
async function track<T>(read: () => Promise<T>): Promise<T> {
  try {
    const value = await read();
    markOnline(true);
    return value;
  } catch (error) {
    if (error instanceof ApiError && error.errorClass === 'network') markOnline(false);
    throw error;
  }
}

async function fetchOrders(): Promise<OrderDetail[]> {
  const { data, error, status } = await supabase
    .from('service_orders')
    .select(ORDER_SELECT)
    .order('order_number', { ascending: false });
  if (error) throw classifyRpcError(error, status);
  const now = Date.now();
  // O RLS mostra só as O.S. com atribuição ativa do técnico (03, R14).
  const rows = data as unknown as OrderRow[];
  // F10: as fotos guardadas saem junto com a O.S.
  void pruneSeenPhotos(
    db,
    current().userId,
    rows.map((r) => r.id),
  );
  return rows.map((row) => toOrderDetail(row, now));
}

async function download(url: string): Promise<Blob> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`photo download ${response.status}`);
  return response.blob();
}

async function fetchOrder(id: string): Promise<OrderDetail | null> {
  const { data, error, status } = await supabase
    .from('service_orders')
    .select(`${ORDER_SELECT}, ${HISTORY_SELECT}`)
    .eq('id', id)
    .maybeSingle();
  if (error) throw classifyRpcError(error, status);
  if (!data) return null;
  const row = data as unknown as OrderRow;
  let urls = new Map<string, string>();
  try {
    urls = await photoUrls(
      row.executions.flatMap((e) => e.photos.map((p) => p.id)),
      invoke,
    );
  } catch (error) {
    if (!(error instanceof ApiError) || !['network', 'server'].includes(error.errorClass)) throw error;
  }
  // F8: guarda como arquivo, em segundo plano, as fotos que ainda não estão no aparelho.
  void saveSeenPhotos(db, {
    userId: current().userId,
    orderId: id,
    photos: [...urls].map(([photoId, url]) => ({ id: photoId, url })),
    download,
  });
  return toOrderDetail(row, Date.now(), urls);
}

export const ordersKey = ['technician', 'orders'] as const;
export const orderKey = (id: string) => ['technician', 'order', id] as const;

export function useTechSession(): Read<TechSession> {
  const { userId, companyId, role } = current();
  return useQuery({
    queryKey: ['technician', 'session', userId],
    queryFn: () =>
      track(async () => {
        const [profile, company] = await Promise.all([
          supabase.from('profiles').select('*').eq('id', userId).single(),
          supabase.from('companies').select('*').eq('id', companyId).single(),
        ]);
        if (profile.error) throw classifyRpcError(profile.error, profile.status);
        if (company.error) throw classifyRpcError(company.error, company.status);
        return { profile: profile.data, company: company.data, role };
      }),
  });
}

export function useTimeZone(): string {
  return useTechSession().data?.company.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
}

function useServerOrders() {
  return useQuery({ queryKey: ordersKey, queryFn: () => track(fetchOrders) });
}

export function useMyOrders(): Read<MyOrder[]> {
  const query = useServerOrders();
  const local = useLocal();
  const data = React.useMemo(
    () => (query.data && local ? query.data.map((o) => toMyOrder(o, local, Date.now())) : undefined),
    [query.data, local],
  );
  return { ...query, data, isPending: query.isPending || !local };
}

export function useTechOrder(orderId: string): Read<TechOrder | null> {
  const list = useServerOrders();
  const query = useQuery({
    queryKey: orderKey(orderId),
    queryFn: () => track(() => fetchOrder(orderId)),
    // Sem sinal e sem o detalhe em cache, mostra o que a lista trouxe (sem URLs de foto).
    placeholderData: () => list.data?.find((o) => o.id === orderId),
  });
  const local = useLocal();
  const data = React.useMemo(() => {
    if (query.data === undefined || !local) return undefined;
    if (!query.data) return null;
    const order = toTechOrder(query.data, local, Date.now());
    return { ...order, attempts: withLocalPhotos(order.attempts, seenPhotoUrl) };
  }, [query.data, local]);
  return { ...query, data, isPending: (query.isPending && !query.isPlaceholderData) || !local };
}

export function usePendingItems(): Read<PendingItem[]> {
  const local = useLocal();
  const orders = useServerOrders().data;
  const runner = useRunner();
  const data = React.useMemo(() => {
    if (!local) return undefined;
    const refs = new Map((orders ?? []).map((o) => [o.id, { order_number: o.order_number, title: o.title }]));
    return pendingItems(local, refs, { now: Date.now(), sending: runner.running });
  }, [local, orders, runner.running]);
  return { data, isPending: !local, isError: false, isFetching: runner.running, refetch: () => undefined };
}

export function useQueueDraft(itemId: string): Pick<Draft, 'description' | 'photos'> | null {
  const local = useLocal();
  if (!local) return null;
  const [kind, id] = itemId.split(':');
  const item = kind === 'queue' ? local.queue.find((i) => String(i.id) === id) : undefined;
  const draftId = item?.type === 'submit' ? item.payload.draftId : kind === 'draft' ? id : null;
  const draft = draftId ? local.drafts.find((d) => d.id === draftId) : undefined;
  if (!draft) return null;
  const photos = local.photoRows.filter((p) => p.draftId === draft.id).map(photoData);
  return { description: draft.description, photos: withAlerts(photos, draft.clientStartedAt) };
}

export function useDraft(key: string): Draft | null {
  const local = useLocal();
  if (!local) return null;
  const { orderId, attemptId } = parseDraftKey(key);
  const draft = local.drafts.find(
    (d) => d.orderId === orderId && d.supplementsExecutionId === attemptId && d.state === 'editing',
  );
  if (!draft) return null;
  const photos = local.photoRows
    .filter((p) => p.draftId === draft.id)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .map(photoData);
  return {
    startedAt: draft.clientStartedAt,
    description: draft.description,
    participants: draft.participants,
    photos,
  };
}

export function useSyncStatus(): SyncState | undefined {
  const runner = useRunner();
  const orders = useServerOrders();
  const pending = usePendingItems().data;
  if (!pending) return undefined;
  const fetchedAt = orders.dataUpdatedAt ? new Date(orders.dataUpdatedAt).toISOString() : null;
  const last =
    [fetchedAt, runner.lastSyncAt]
      .filter((v): v is string => v !== null)
      .sort()
      .at(-1) ?? null;
  return {
    last_sync_at: last,
    pending: pending.filter((i) => ['sending', 'waiting', 'queued'].includes(i.state)).length,
    blocked: pending.filter((i) => i.state === 'blocked').length,
    online: runner.online,
    syncing: runner.running,
    needs_login: runner.status?.kind === 'needs_login',
  };
}
