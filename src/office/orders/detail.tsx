// Detalhe da O.S.: dados, materiais, tentativas com fotos, cliente e local, técnicos e o histórico completo (03, 04).
// Cada bloco é uma seção em ./detail/ (nomes em docs/screens-office.md).
import { getRouteApi, Link } from '@tanstack/react-router';
import * as React from 'react';
import { LoadingDetail } from '@/components/states';
import type { OrderDetail } from '@/lib/views';
import { useOrder } from '../queries';
import { NotFound } from '../shared';
import { ClientSection } from './detail/client-section';
import { OrderDataSection } from './detail/data-section';
import { CancelOrderDialog, ReassignDialog } from './detail/dialogs';
import { ExecutionsSection } from './detail/executions-section';
import { OrderHeader } from './detail/header';
import { HistorySection } from './detail/history-section';
import { MaterialsSection } from './detail/materials-section';
import { OrderNotices } from './detail/notices';
import { TechniciansSection } from './detail/technicians-section';

const route = getRouteApi('/office/orders/$orderId');

export function OrderDetailPage() {
  const { orderId } = route.useParams();
  const order = useOrder(orderId);
  if (order.isPending) return <LoadingDetail />;
  if (!order.data) return <NotFound back={<Link to="/office/orders" />} />;
  return <OrderDetailView order={order.data} />;
}

function OrderDetailView({ order: o }: { order: OrderDetail }) {
  const [cancelling, setCancelling] = React.useState(false);
  const [reassigning, setReassigning] = React.useState(false);
  const reassign = () => setReassigning(true);

  return (
    <div className="flex flex-col gap-6">
      <OrderHeader order={o} onReassign={reassign} onCancel={() => setCancelling(true)} />
      <OrderNotices order={o} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex min-w-0 flex-col gap-6">
          <OrderDataSection order={o} />
          <MaterialsSection order={o} />
          <ExecutionsSection order={o} />
        </div>

        <div className="flex min-w-0 flex-col gap-6">
          <ClientSection order={o} />
          <TechniciansSection order={o} onReassign={reassign} />
          <HistorySection order={o} />
        </div>
      </div>

      <CancelOrderDialog order={o} open={cancelling} onOpenChange={setCancelling} />
      <ReassignDialog order={o} open={reassigning} onOpenChange={setReassigning} />
    </div>
  );
}
