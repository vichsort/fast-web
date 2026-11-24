// Diálogos do detalhe da O.S.: cancelar com motivo e reatribuir os técnicos (03).
import { WifiOff } from 'lucide-react';
import * as React from 'react';
import { FormDialog, ReasonDialog } from '@/components/dialogs';
import { Notice } from '@/components/notice';
import { SearchCombobox } from '@/components/search-combobox';
import { formatList, formatOrderNumber } from '@/lib/format';
import { t } from '@/lib/i18n';
import type { OrderDetail } from '@/lib/views';
import { cancelOrder, setAssignees } from '../../api';
import { leavingWhileWorking, mayHaveOfflineWork } from '../../derive';
import { useTechnicians } from '../../queries';
import { useOffice, useOfficeAction } from '../../session';

interface DialogProps {
  order: OrderDetail;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CancelOrderDialog({ order: o, open, onOpenChange }: DialogProps) {
  const { actor } = useOffice();
  const run = useOfficeAction();
  const number = formatOrderNumber(o.order_number);
  return (
    <ReasonDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('ui.dialogs.cancelOrderTitle', { number })}
      description={t('ui.dialogs.cancelOrderDescription')}
      confirmLabel={t('ui.dialogs.cancelOrderConfirm')}
      onConfirm={(reason) => run(t('office.orderDetail.cancel'), () => cancelOrder(o.id, reason, actor))}
    >
      <p className="rounded-lg bg-muted/60 px-3 py-2 text-sm">
        <span className="font-semibold tabular-nums">{number}</span> · {o.title}
      </p>
      {mayHaveOfflineWork(o) && (
        <Notice tone="warning" icon={WifiOff} title={t('office.orderDetail.cancelWorkingTitle')} className="mt-3">
          {t('office.orderDetail.cancelWorkingBody')}
        </Notice>
      )}
    </ReasonDialog>
  );
}

export function ReassignDialog({ order: o, open, onOpenChange }: DialogProps) {
  const { actor } = useOffice();
  const run = useOfficeAction();
  const technicians = useTechnicians();
  const [ids, setIds] = React.useState<string[]>([]);
  React.useEffect(() => {
    if (open) setIds(o.assignees.map((a) => a.id));
  }, [open, o.assignees]);
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('office.orderDetail.reassignTitle', { number: formatOrderNumber(o.order_number) })}
      description={t('office.orderDetail.reassignDescription')}
      onSubmit={() => run(t('office.orderDetail.reassign'), () => setAssignees(o.id, ids, actor))}
    >
      <SearchCombobox
        multiple
        avatars
        aria-label={t('office.orderForm.technicians')}
        value={ids}
        onValueChange={setIds}
        loading={technicians.isPending}
        placeholder={t('office.orderForm.techniciansPlaceholder')}
        options={(technicians.data ?? []).map((p) => ({ value: p.id, label: p.full_name }))}
      />
      <p className="mt-2 text-xs text-muted-foreground">{t('office.orderForm.techniciansHint')}</p>
      <LeavingNotice order={o} ids={ids} className="mt-3" />
    </FormDialog>
  );
}

/** Aviso de quem sai da O.S. em execução: o envio feito sem sinal será recusado (UX 1; derive.ts). */
export function LeavingNotice({ order, ids, className }: { order: OrderDetail; ids: string[]; className?: string }) {
  const leaving = leavingWhileWorking(order, ids);
  if (leaving.length === 0) return null;
  return (
    <Notice tone="warning" icon={WifiOff} title={t('office.orderDetail.leavingTitle')} className={className}>
      {t(leaving.length === 1 ? 'office.orderDetail.leavingOne' : 'office.orderDetail.leavingMany', {
        names: formatList(leaving.map((p) => p.full_name)),
      })}
    </Notice>
  );
}
