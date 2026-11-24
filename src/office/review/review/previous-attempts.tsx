// Tentativas anteriores da O.S., abertas abaixo da pendente: a prova é a soma das tentativas (decisions.md, Telas,
// 2026-11-24), e a nova pode trazer só o que a rejeição pediu.
import { ExecutionCard } from '@/components/execution-card';
import { t } from '@/lib/i18n';
import type { OrderDetail } from '@/lib/views';
import { useOffice } from '../../session';

export function PreviousAttempts({ attempts }: { attempts: OrderDetail['attempts'] }) {
  const { timeZone } = useOffice();
  if (attempts.length === 0) return null;
  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-col gap-0.5">
        <h2 className="font-heading text-base font-semibold">
          {t('office.review.previousAttempts', { count: attempts.length })}
        </h2>
        <p className="text-sm text-muted-foreground">{t('office.review.previousAttemptsHint')}</p>
      </div>
      {attempts.map((a) => (
        <ExecutionCard key={a.id} attempt={a} timeZone={timeZone} compactPhotos className="bg-muted/30" />
      ))}
    </section>
  );
}
