import { useQueryClient } from '@tanstack/react-query';
import * as React from 'react';

// O que as telas embutem numa O.S., no formato de `OrderRow` (src/lib/order-detail.ts), e as URLs das fotos
// (get_photo_urls, 04). As duas áreas leem a mesma forma, para a montagem ser uma só; o técnico pede só as colunas que
// usa (src/technician/api/real/select.ts).

export const PERSON = 'id, full_name';

/** O que as telas do escritório embutem numa O.S. (src/lib/order-detail.ts, OrderRow). */
export const ORDER_SELECT = `*,
  client:clients!service_orders_client_id_fkey(*),
  client_address:client_addresses!service_orders_client_address_id_fkey(id, company_id, client_id, label, street, number, complement, district, city, state, zip_code, reference, is_primary, created_at, deleted_at, deleted_by, delete_reason),
  created_by_ref:profiles!service_orders_created_by_fkey(${PERSON}),
  assignments:service_order_assignees(*, user:profiles!service_order_assignees_user_id_fkey(${PERSON})),
  executions:service_order_executions(*,
    submitter:profiles!service_order_executions_submitted_by_fkey(${PERSON}),
    reviewer:profiles!service_order_executions_reviewed_by_fkey(${PERSON}),
    acknowledger:profiles!service_order_executions_acknowledged_by_fkey(${PERSON}),
    photos:service_order_photos(*))`;

export const HISTORY_SELECT = `history:service_order_history(*, actor:profiles!service_order_history_actor_id_fkey(${PERSON}))`;

const PHOTO_URL_BATCH = 100;

/** get_photo_urls (04): a URL de leitura vale 5 minutos. */
export const PHOTO_URL_TTL_MS = 5 * 60_000;
/** Folga: a URL que vence em menos que isso é assinada de novo, para não vencer na tela logo depois. */
export const PHOTO_URL_MARGIN_MS = 60_000;
/** URL que falhou com menos idade que isso não é renovada: a falha não é o vencimento, e renovar faria um laço. */
export const PHOTO_URL_MIN_AGE_MS = 30_000;

type Invoke = <T>(name: string, body: Record<string, unknown>) => Promise<T>;

interface SignedUrl {
  url: string;
  issuedAt: number;
  validUntil: number;
}

/**
 * URLs assinadas das fotos, por id (docs/photos.md, F11): reaproveita a que ainda vale com folga, em vez de assinar
 * de novo a cada leitura da O.S. (a URL nova faria o navegador baixar a foto de novo), e esquece a que não carregou
 * para a próxima leitura renovar. `now` é o relógio (injetado no teste).
 */
export function createPhotoUrlCache(now: () => number = Date.now) {
  const signed = new Map<string, SignedUrl>();

  async function urls(ids: string[], invoke: Invoke): Promise<Map<string, string>> {
    const asked = now();
    for (const [id, entry] of signed) if (entry.validUntil <= asked) signed.delete(id);
    const missing = [...new Set(ids)].filter((id) => {
      const entry = signed.get(id);
      return !entry || entry.validUntil - PHOTO_URL_MARGIN_MS <= asked;
    });
    const batches: string[][] = [];
    for (let i = 0; i < missing.length; i += PHOTO_URL_BATCH) batches.push(missing.slice(i, i + PHOTO_URL_BATCH));
    const results = await Promise.all(
      batches.map((photo_ids) =>
        invoke<{ photo_id: string; url: string; expires_at: string }[]>('get_photo_urls', { photo_ids }),
      ),
    );
    for (const r of results.flat()) {
      // O `expires_at` vem no relógio do servidor; o prazo contado daqui, desde o pedido, cobre o aparelho atrasado.
      const expires = Date.parse(r.expires_at);
      const validUntil = Math.min(Number.isNaN(expires) ? Number.POSITIVE_INFINITY : expires, asked + PHOTO_URL_TTL_MS);
      signed.set(r.photo_id, { url: r.url, issuedAt: asked, validUntil });
    }
    const found = new Map<string, string>();
    for (const id of ids) {
      const entry = signed.get(id);
      if (entry) found.set(id, entry.url);
    }
    return found;
  }

  /** A imagem não carregou: esquece a URL se ainda é a guardada e não acabou de chegar. `true`: releia a O.S. */
  function failed(photoId: string, url: string): boolean {
    const entry = signed.get(photoId);
    if (!entry || entry.url !== url || now() - entry.issuedAt < PHOTO_URL_MIN_AGE_MS) return false;
    signed.delete(photoId);
    return true;
  }

  return { urls, failed };
}

const photoUrlCache = createPhotoUrlCache();

/** URLs das fotos para o detalhe da O.S. (escritório e técnico), pela memória da aba. `invoke` chama a Edge Function. */
export function photoUrls(ids: string[], invoke: Invoke): Promise<Map<string, string>> {
  return photoUrlCache.urls(ids, invoke);
}

/** A foto não carregou pela URL assinada (`PhotoErrorProvider`): `true` quando vale reler a O.S. para renovar. */
export function photoUrlFailed(photoId: string, url: string): boolean {
  return photoUrlCache.failed(photoId, url);
}

/**
 * Para o `PhotoErrorProvider` de cada área: a foto que não carregou pela URL guardada relê as O.S. abertas de
 * `queryKey` (só as fotos sem URL válida são assinadas de novo). Sem `cancelRefetch`: várias fotos falhando juntas
 * pegam a mesma leitura.
 */
export function usePhotoUrlRenewal(queryKey: readonly unknown[]): (photo: { id: string; url: string }) => void {
  const queryClient = useQueryClient();
  const key = JSON.stringify(queryKey);
  return React.useCallback(
    (photo) => {
      if (photoUrlFailed(photo.id, photo.url)) {
        void queryClient.invalidateQueries({ queryKey: JSON.parse(key) as unknown[] }, { cancelRefetch: false });
      }
    },
    [queryClient, key],
  );
}
