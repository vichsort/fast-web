// Técnicos da O.S.: os ativos e, recolhidos, os que já estiveram (03); reatribuir.
import { UserRoundPen } from 'lucide-react';
import { Section } from '@/components/section';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { UserChip } from '@/components/user';
import { formatDate } from '@/lib/format';
import { t } from '@/lib/i18n';
import type { OrderDetail } from '@/lib/views';
import { useOffice } from '../../session';

export function TechniciansSection({ order: o, onReassign }: { order: OrderDetail; onReassign: () => void }) {
  const { timeZone } = useOffice();
  const closed = o.status === 'approved' || o.status === 'cancelled';
  const active = o.assignments.filter((a) => a.unassigned_at === null);
  const past = o.assignments.filter((a) => a.unassigned_at !== null);
  return (
    <Section
      title={t('office.orderDetail.sectionTechnicians')}
      actions={
        !closed && (
          <Button variant="ghost" size="sm" onClick={onReassign}>
            <UserRoundPen />
            {t('office.orderDetail.reassign')}
          </Button>
        )
      }
    >
      {active.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('office.orderDetail.noTechnicians')}</p>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {active.map((a) => (
            <li key={a.id}>
              <UserChip
                name={a.user.full_name}
                seed={a.user_id}
                size="sm"
                subtitle={t('office.orderDetail.assignedSince', { time: formatDate(a.assigned_at, timeZone) })}
              />
            </li>
          ))}
        </ul>
      )}
      {past.length > 0 && (
        <Collapsible>
          <CollapsibleTrigger className="text-xs font-medium text-muted-foreground underline-offset-4 hover:underline">
            {t('office.orderDetail.pastAssignments', { count: past.length })}
          </CollapsibleTrigger>
          <CollapsibleContent>
            <ul className="mt-2 flex flex-col gap-2 opacity-80">
              {past.map((a) => (
                <li key={a.id}>
                  <UserChip
                    name={a.user.full_name}
                    seed={a.user_id}
                    size="sm"
                    subtitle={t('office.orderDetail.pastAssignment', {
                      from: formatDate(a.assigned_at, timeZone),
                      to: formatDate(a.unassigned_at ?? a.assigned_at, timeZone),
                    })}
                  />
                </li>
              ))}
            </ul>
          </CollapsibleContent>
        </Collapsible>
      )}
    </Section>
  );
}
