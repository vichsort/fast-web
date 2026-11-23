// Tentativas anteriores da O.S., recolhidas abaixo da pendente.
import { ChevronDown, History } from 'lucide-react';
import { ExecutionCard } from '@/components/execution-card';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { t } from '@/lib/i18n';
import type { OrderDetail } from '@/lib/views';
import { useOffice } from '../../session';

export function PreviousAttempts({ attempts }: { attempts: OrderDetail['attempts'] }) {
  const { timeZone } = useOffice();
  if (attempts.length === 0) return null;
  return (
    <Collapsible>
      <CollapsibleTrigger
        render={<Button variant="ghost" size="sm" className="group/prev -ml-2 text-muted-foreground" />}
      >
        <History />
        {t('office.review.previousAttempts', { count: attempts.length })}
        <ChevronDown className="transition-transform group-data-[panel-open]/prev:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent className="flex flex-col gap-3 pt-2">
        {attempts.map((a) => (
          <ExecutionCard key={a.id} attempt={a} timeZone={timeZone} compactPhotos className="bg-muted/30" />
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}
