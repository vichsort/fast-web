import { Link, useParams } from '@tanstack/react-router';
import { ClipboardList } from 'lucide-react';
import * as React from 'react';
import { EmptyState, ErrorState, LoadingDetail } from '@/components/states';
import { Button } from '@/components/ui/button';
import { t } from '@/lib/i18n';
import { markSeen, type TechOrder, useMyOrders, usePendingItems, useTechOrder } from './api';
import { MaterialsSection } from './materials-section';
import { OrderAttemptsSection } from './order-detail/attempts';
import { OrderDetailHeader } from './order-detail/header';
import { AddressSection, ClientSection, InstructionsSection } from './order-detail/info-sections';
import { useOrderNavigation } from './order-detail/navigation';
import { QueueNotice, StatusNotices } from './order-detail/notices';
import { PrimaryAction } from './order-detail/primary-action';
import { OrderSummarySection } from './order-detail/summary-section';

const ACTIVE_QUEUE = ['sending', 'waiting', 'queued'];

/**
 * Detalhe da O.S. do técnico: tudo para chegar, executar e ver o resultado (docs/screens-technician.md).
 * Cada bloco é uma seção em ./order-detail/ (nomes no mesmo doc).
 */
export function OrderDetailPage() {
  const { orderId } = useParams({ from: '/technician/orders/$orderId' });
  const query = useTechOrder(orderId);
  const isNew = useMyOrders().data?.find((o) => o.id === orderId)?.is_new ?? false;
  // 04: a O.S. deixa de ser "Nova" quando é aberta neste aparelho. Lê o selo antes de marcar.
  const [wasNew] = React.useState(isNew);
  React.useEffect(() => {
    markSeen(orderId);
  }, [orderId]);

  if (query.isPending) return <LoadingDetail />;
  if (query.isError) return <ErrorState offline onRetry={() => void query.refetch()} retrying={query.isFetching} />;
  if (!query.data) {
    return (
      <EmptyState
        bordered
        icon={ClipboardList}
        title={t('technician.detail.notFoundTitle')}
        description={t('technician.detail.notFoundDescription')}
        action={
          <Button variant="outline" render={<Link to="/technician" />} nativeButton={false}>
            {t('technician.detail.backToList')}
          </Button>
        }
      />
    );
  }
  return <OrderDetail order={query.data} wasNew={wasNew} />;
}

function OrderDetail({ order, wasNew }: { order: TechOrder; wasNew: boolean }) {
  const { goSupplement } = useOrderNavigation(order.id);
  const queue = (usePendingItems().data ?? []).filter((i) => i.order_id === order.id);
  const activeQueue = queue.filter((i) => ACTIVE_QUEUE.includes(i.state));
  const problems = queue.filter((i) => i.state === 'refused' || i.state === 'blocked');
  const queuedSubmit = activeQueue.some((i) => i.kind === 'submit');
  const lastAttempt = order.attempts.at(-1);
  const lastRejected = lastAttempt?.review_status === 'rejected' ? lastAttempt : null;
  const supplementTarget =
    lastAttempt && (lastAttempt.review_status === 'pending' || lastAttempt.review_status === 'approved')
      ? lastAttempt
      : null;

  return (
    <div className="flex flex-col gap-4">
      <OrderDetailHeader order={order} wasNew={wasNew} />
      <StatusNotices order={order} lastRejected={lastRejected} />
      <QueueNotice activeCount={activeQueue.length} problemCount={problems.length} />
      <OrderSummarySection order={order} />
      <InstructionsSection order={order} />
      <AddressSection order={order} />
      <ClientSection order={order} />
      <MaterialsSection order={order} />
      <OrderAttemptsSection
        order={order}
        supplementTarget={supplementTarget}
        onSupplement={(attemptId) => void goSupplement(attemptId)}
      />
      <PrimaryAction order={order} queuedSubmit={queuedSubmit} supplementTarget={supplementTarget} />
    </div>
  );
}
