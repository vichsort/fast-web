// Materiais da O.S. (03): o técnico completa o texto, inclusive sem sinal. Recusa `conflict` (R11): mostra o texto
// dele e o do escritório, ele escolhe (e ajusta) e reenvia.
import { Check, CloudUpload, GitCompareArrows, Package, Pencil } from 'lucide-react';
import * as React from 'react';
import { Section } from '@/components/section';
import { Button } from '@/components/ui/button';
import { Field, FieldLabel } from '@/components/ui/field';
import { Textarea } from '@/components/ui/textarea';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { act } from './act';
import { resolveConflict, saveMaterials, type TechOrder, usePendingItems } from './api';
import { Callout } from './parts';

export function MaterialsSection({ order }: { order: TechOrder }) {
  const [editing, setEditing] = React.useState(false);
  const [text, setText] = React.useState('');
  const pending = usePendingItems().data ?? [];
  const queued = pending.some(
    (i) => i.order_id === order.id && i.kind === 'materials' && ['sending', 'waiting', 'queued'].includes(i.state),
  );
  // 03, R9: materiais mudam em qualquer status, exceto approved e cancelled.
  const editable = order.status !== 'approved' && order.status !== 'cancelled';
  const textareaId = React.useId();

  if (order.conflict && editable) return <MaterialsConflict order={order} conflict={order.conflict} />;

  return (
    <Section
      title={t('technician.materials.title')}
      description={editable ? t('technician.materials.hint') : t('technician.materials.readOnly')}
      icon={Package}
      density="touch"
      actions={
        editable &&
        !editing && (
          <Button
            variant="outline"
            className="h-10"
            onClick={() => {
              setText(order.materials_notes ?? '');
              setEditing(true);
            }}
          >
            <Pencil />
            {t('technician.materials.edit')}
          </Button>
        )
      }
    >
      {editing ? (
        <form
          className="flex flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            setEditing(false);
            void act(saveMaterials(order, text), t('technician.materials.save'));
          }}
        >
          <Field>
            <FieldLabel htmlFor={textareaId} className="sr-only">
              {t('technician.materials.title')}
            </FieldLabel>
            <Textarea
              id={textareaId}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={t('technician.materials.placeholder')}
              rows={5}
              className="min-h-32 text-base"
              autoFocus
            />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Button type="button" variant="outline" className="h-11" onClick={() => setEditing(false)}>
              {t('ui.actions.cancel')}
            </Button>
            <Button type="submit" className="h-11">
              <Check />
              {t('technician.materials.save')}
            </Button>
          </div>
        </form>
      ) : order.materials_notes ? (
        <p className="text-base leading-relaxed whitespace-pre-line">{order.materials_notes}</p>
      ) : (
        <p className="text-muted-foreground italic">{t('technician.materials.empty')}</p>
      )}
      {queued && !editing && (
        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <CloudUpload aria-hidden className="size-4" />
          {t('technician.materials.savedOffline')}
        </p>
      )}
    </Section>
  );
}

function MaterialsConflict({ order, conflict }: { order: TechOrder; conflict: { mine: string; current: string } }) {
  const [choice, setChoice] = React.useState<'mine' | 'current'>('mine');
  const [text, setText] = React.useState(conflict.mine);
  const textareaId = React.useId();
  const versions = [
    { id: 'mine' as const, label: t('technician.materials.conflictMine'), value: conflict.mine },
    { id: 'current' as const, label: t('technician.materials.conflictCurrent'), value: conflict.current },
  ];
  return (
    <Section title={t('technician.materials.title')} icon={Package} density="touch">
      <Callout tone="warning" icon={GitCompareArrows} title={t('technician.materials.conflictTitle')}>
        {t('technician.materials.conflictBody')}
      </Callout>
      <div role="radiogroup" aria-label={t('technician.materials.conflictTitle')} className="flex flex-col gap-2">
        {versions.map((v) => {
          const selected = choice === v.id;
          return (
            // biome-ignore lint/a11y/useSemanticElements: cartão inteiro tocável com o texto da versão dentro
            <button
              key={v.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => {
                setChoice(v.id);
                setText(v.value);
              }}
              className={cn(
                'flex flex-col gap-1.5 rounded-lg border bg-card p-3 text-left outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50',
                selected ? 'border-primary ring-2 ring-primary/25' : 'hover:bg-muted/60',
              )}
            >
              <span className="flex items-center gap-2 text-sm font-semibold">
                <span
                  aria-hidden
                  className={cn(
                    'flex size-5 items-center justify-center rounded-full border-2',
                    selected ? 'border-primary bg-primary text-primary-foreground' : 'border-input',
                  )}
                >
                  {selected && <Check className="size-3" />}
                </span>
                {v.label}
              </span>
              <span className="pl-7 text-sm whitespace-pre-line">{v.value}</span>
            </button>
          );
        })}
      </div>
      <form
        className="flex flex-col gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          void act(resolveConflict(order, text), t('technician.materials.conflictResolve'));
        }}
      >
        <Field>
          <FieldLabel htmlFor={textareaId}>{t('technician.materials.conflictResult')}</FieldLabel>
          <Textarea
            id={textareaId}
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={4}
            className="min-h-28 text-base"
          />
        </Field>
        <Button type="submit" className="h-11">
          <CloudUpload />
          {t('technician.materials.conflictResolve')}
        </Button>
      </form>
    </Section>
  );
}
