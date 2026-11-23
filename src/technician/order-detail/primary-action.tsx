// Ação principal do detalhe pelo status, presa na barra de ação (tabela em docs/screens-technician.md).
import { FilePlus, Play } from 'lucide-react';
import type * as React from 'react';
import { Button } from '@/components/ui/button';
import { t } from '@/lib/i18n';
import { act } from '../act';
import { draftKey, start as startOrder, type TechOrder, useDraft } from '../api';
import { ActionBar } from '../parts';
import { useOrderNavigation } from './navigation';

type Attempt = TechOrder['attempts'][number];

export function PrimaryAction({
  order,
  queuedSubmit,
  supplementTarget,
}: {
  order: TechOrder;
  queuedSubmit: boolean;
  supplementTarget: Attempt | null;
}) {
  const draft = useDraft(draftKey.attempt(order.id));
  const { goExecution, goSupplement } = useOrderNavigation(order.id);

  async function start() {
    if ((await act(startOrder(order).then(() => true))) === true) void goExecution();
  }

  // 04: iniciar e enviar de open/rejected; complemento em qualquer status menos cancelled.
  let primary: React.ReactNode = null;
  if (order.status === 'cancelled') primary = null;
  else if (order.status === 'pending_approval' || order.status === 'approved') {
    if (supplementTarget)
      primary = (
        <Button className="h-12 text-base" onClick={() => void goSupplement(supplementTarget.id)}>
          <FilePlus className="size-5" />
          {t('technician.detail.supplement')}
        </Button>
      );
  } else if (queuedSubmit) {
    primary = <p className="text-center text-sm text-muted-foreground">{t('technician.detail.queuedSubmitHint')}</p>;
  } else if (order.status === 'in_progress') {
    primary = (
      <Button className="h-12 text-base" onClick={() => void goExecution()}>
        <Play className="size-5" />
        {draft ? t('technician.detail.continueDraft', { count: draft.photos.length }) : t('technician.detail.continue')}
      </Button>
    );
  } else {
    primary = (
      <Button className="h-12 text-base" onClick={() => void start()}>
        <Play className="size-5" />
        {order.status === 'rejected' ? t('technician.detail.startAgain') : t('technician.detail.start')}
      </Button>
    );
  }

  return primary ? <ActionBar>{primary}</ActionBar> : null;
}
