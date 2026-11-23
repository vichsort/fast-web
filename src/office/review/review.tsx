// Revisão de uma O.S. (04): a tentativa pendente com os complementos e as fotos (origem, horário, alertas); aprovar
// com comentário opcional ou rejeitar com justificativa; stale_review quando chega complemento depois do carregamento.
// Cada bloco é uma seção em ./review/ (nomes em docs/screens-office.md).
import { getRouteApi, Link } from '@tanstack/react-router';
import * as React from 'react';
import { ExecutionCard } from '@/components/execution-card';
import { LoadingDetail } from '@/components/states';
import { t } from '@/lib/i18n';
import type { OrderDetail } from '@/lib/views';
import { reviewExecution, seenUntil } from '../api';
import { useOrder } from '../queries';
import { useOffice, useOfficeAction } from '../session';
import { NotFound } from '../shared';
import { pendingSummary } from './queue';
import { DecisionSection } from './review/decision-section';
import { ReviewHeader } from './review/header';
import { OrderInfoSection } from './review/order-info-section';
import { PreviousAttempts } from './review/previous-attempts';
import { StaleNotice } from './review/stale-notice';
import { type Done, DoneState, NotPending } from './review/states';

const route = getRouteApi('/office/review/$orderId');

export function ReviewOrderPage() {
  const { orderId } = route.useParams();
  const order = useOrder(orderId);
  const [done, setDone] = React.useState<Done | null>(null);

  if (done && (done.orderId === orderId || String(done.number) === orderId)) return <DoneState done={done} />;
  if (order.isPending) return <LoadingDetail />;
  if (!order.data) return <NotFound back={<Link to="/office/review" />} />;
  if (order.data.status !== 'pending_approval') return <NotPending order={order.data} />;
  return <ReviewView order={order.data} onDone={setDone} onReload={() => void order.refetch()} />;
}

function ReviewView({
  order: o,
  onDone,
  onReload,
}: {
  order: OrderDetail;
  onDone: (done: Done) => void;
  onReload: () => void;
}) {
  const { timeZone, actor } = useOffice();
  const run = useOfficeAction();
  const [stale, setStale] = React.useState(false);
  const [simulateStale, setSimulateStale] = React.useState(false);
  const summary = pendingSummary(o);
  if (!summary) return <NotPending order={o} />;
  const { attempt } = summary;
  const previous = o.attempts.filter((a) => a.id !== attempt.id).reverse();
  // Maior received_at entre os complementos carregados nesta tela (04, R10: p_seen_until).
  const seen = seenUntil(attempt.supplements);

  async function decide(decision: 'approved' | 'rejected', text: string | null) {
    const result = await run(
      t(decision === 'approved' ? 'office.review.approve' : 'office.review.reject'),
      () =>
        reviewExecution(
          { orderId: o.id, executionId: attempt.id, decision, comment: text, seenUntil: seen, simulateStale },
          actor,
        ),
      { inline: ['stale_review'] },
    );
    if (result.ok) onDone({ decision, number: o.order_number, orderId: o.id });
    else if (result.code === 'stale_review') setStale(true);
  }

  function reload() {
    setStale(false);
    setSimulateStale(false);
    onReload();
  }

  return (
    <div className="flex flex-col gap-6">
      <ReviewHeader order={o} />
      {stale && <StaleNotice onReload={reload} />}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_21rem]">
        <div className="flex min-w-0 flex-col gap-4">
          <ExecutionCard attempt={attempt} timeZone={timeZone} />
          <PreviousAttempts attempts={previous} />
        </div>

        <aside className="flex min-w-0 flex-col gap-4 lg:sticky lg:top-20 lg:self-start">
          <DecisionSection
            summary={summary}
            stale={stale}
            simulateStale={simulateStale}
            onSimulateStaleChange={setSimulateStale}
            onDecide={decide}
          />
          <OrderInfoSection order={o} />
        </aside>
      </div>
    </div>
  );
}
