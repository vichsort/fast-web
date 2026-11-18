import { useNavigate } from '@tanstack/react-router';
import { ChevronDown, CircleCheck, Info } from 'lucide-react';
import * as React from 'react';
import { ConfirmDialog } from '@/components/dialogs';
import { PageHeader } from '@/components/page-header';
import { PhotoGrid } from '@/components/photos';
import { EmptyState, ErrorState, LoadingList, scratchToast } from '@/components/states';
import { PendingItemCard, SyncIndicator } from '@/components/sync';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { t } from '@/lib/i18n';
import type { PendingItem } from '@/mocks';
import { scratch, TZ, usePendingItems, useQueueDraft, useSyncStatus } from './mocks';
import { GroupHeading } from './parts';

/** Pendências: a fila do aparelho e as recusas (docs/queue.md; docs/screens-technician.md). */
export function PendingPage() {
  const query = usePendingItems();
  const sync = useSyncStatus();
  const [discarding, setDiscarding] = React.useState<PendingItem | null>(null);
  const items = query.data ?? [];
  const inQueue = items.filter((i) => ['sending', 'waiting', 'queued'].includes(i.state));
  const attention = items.filter((i) => i.state === 'refused' || i.state === 'blocked');

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title={t('technician.pending.title')} description={t('technician.pending.description')} />
      {sync && <SyncIndicator status={sync} timeZone={TZ} variant="banner" />}

      {query.isPending ? (
        <LoadingList count={3} />
      ) : query.isError ? (
        <ErrorState onRetry={() => void query.refetch()} retrying={query.isFetching} />
      ) : items.length === 0 ? (
        <EmptyState
          bordered
          icon={CircleCheck}
          title={t('technician.pending.emptyTitle')}
          description={t('technician.pending.emptyDescription')}
        />
      ) : (
        <>
          {attention.length > 0 && (
            <section className="flex flex-col gap-3">
              <GroupHeading
                title={t('technician.pending.attention')}
                count={attention.length}
                hint={t('technician.pending.attentionHint')}
                toneClass="[--tone:var(--tone-danger)]"
              />
              {attention.map((item) => (
                <PendingEntry key={item.id} item={item} onDiscard={() => setDiscarding(item)} />
              ))}
            </section>
          )}
          {inQueue.length > 0 && (
            <section className="flex flex-col gap-3">
              <GroupHeading
                title={t('technician.pending.inQueue')}
                count={inQueue.length}
                hint={t('technician.pending.inQueueHint')}
                toneClass="[--tone:var(--tone-progress)]"
              />
              {inQueue.map((item) => (
                <PendingEntry key={item.id} item={item} onDiscard={() => setDiscarding(item)} />
              ))}
            </section>
          )}
        </>
      )}

      <p className="flex items-start gap-2 text-sm text-muted-foreground">
        <Info aria-hidden className="mt-0.5 size-4 shrink-0" />
        {t('technician.pending.footnote')}
      </p>

      <ConfirmDialog
        open={discarding !== null}
        onOpenChange={(open) => !open && setDiscarding(null)}
        tone="destructive"
        title={t('technician.pending.discardTitle')}
        description={t('technician.pending.discardDescription')}
        confirmLabel={t('technician.pending.discardConfirm')}
        onConfirm={() => {
          if (discarding) scratch.removePending(discarding.id);
          scratchToast(t('ui.actions.discard'));
        }}
      />
    </div>
  );
}

/**
 * Um item com as ações que o estado permite (queue.md): esperando rede ou bloqueado → tentar agora; envio recusado →
 * apagar o rascunho (com confirmação); início ou materiais recusados → dispensar; `conflict` → abrir a O.S. para
 * escolher o texto. O que foi feito (texto e fotos) fica à vista nos envios.
 */
function PendingEntry({ item, onDiscard }: { item: PendingItem; onDiscard: () => void }) {
  const navigate = useNavigate();
  const draft = useQueueDraft(item.id);
  const isDraft = item.kind === 'submit' || item.kind === 'supplement';
  const conflict = item.state === 'refused' && item.refusal === 'conflict';
  const open = () => navigate({ to: '/technician/orders/$orderId', params: { orderId: item.order_id } });

  return (
    <div className="flex flex-col gap-0">
      <PendingItemCard
        item={item}
        timeZone={TZ}
        onOpen={() => void open()}
        onRetry={
          item.state === 'waiting' || item.state === 'blocked'
            ? () => {
                scratch.retryPending(item.id);
                scratchToast(t('technician.pending.retried'));
              }
            : undefined
        }
        onDiscard={item.state === 'refused' && isDraft ? onDiscard : undefined}
        onDismiss={
          item.state === 'refused' && !isDraft && !conflict
            ? () => {
                scratch.removePending(item.id);
                scratchToast(t('technician.pending.dismissed'));
              }
            : undefined
        }
        className={draft ? 'rounded-b-none' : undefined}
      />
      {conflict && <p className="px-1 pt-1.5 text-sm text-muted-foreground">{t('technician.pending.conflictHint')}</p>}
      {draft && (
        <Collapsible className="rounded-b-xl border border-t-0 bg-card">
          <CollapsibleTrigger className="group flex min-h-11 w-full items-center justify-between gap-2 px-3.5 text-sm font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
            {t('technician.pending.showDraft')}
            <ChevronDown
              aria-hidden
              className="size-4 text-muted-foreground transition-transform group-data-[panel-open]:rotate-180"
            />
          </CollapsibleTrigger>
          <CollapsibleContent className="flex flex-col gap-3 px-3.5 pb-3.5">
            {draft.description && <p className="text-sm whitespace-pre-line">{draft.description}</p>}
            {draft.photos.length > 0 && <PhotoGrid photos={draft.photos} timeZone={TZ} density="compact" />}
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}
