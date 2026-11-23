// Materiais: texto livre com detecção de conflito (03, R11): manda o texto visto no carregamento.
import { RotateCw } from 'lucide-react';
import * as React from 'react';
import { Notice } from '@/components/notice';
import { Section } from '@/components/section';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { t } from '@/lib/i18n';
import type { OrderDetail } from '@/lib/views';
import { updateMaterials } from '../../api';
import { useOffice, useOfficeAction } from '../../session';

export function MaterialsSection({ order: o }: { order: OrderDetail }) {
  const { actor } = useOffice();
  const run = useOfficeAction();
  const closed = o.status === 'approved' || o.status === 'cancelled';
  const [text, setText] = React.useState(o.materials_notes ?? '');
  const [expected, setExpected] = React.useState(o.materials_notes);
  const [saving, setSaving] = React.useState(false);
  const [conflict, setConflict] = React.useState(false);
  const dirty = (text.trim() || null) !== expected;

  // Recarregou e ninguém está editando: acompanha o servidor.
  // biome-ignore lint/correctness/useExhaustiveDependencies: só quando o texto do servidor muda
  React.useEffect(() => {
    if (!dirty) {
      setText(o.materials_notes ?? '');
      setExpected(o.materials_notes);
    }
  }, [o.materials_notes]);

  async function save() {
    setSaving(true);
    const result = await run(
      t('office.orderDetail.materialsSave'),
      () => updateMaterials(o.id, text, expected, actor),
      {
        inline: ['conflict'],
      },
    );
    setSaving(false);
    if (result.ok) {
      setExpected(text.trim() || null);
      setConflict(false);
    } else if (result.code === 'conflict') setConflict(true);
  }

  function reload() {
    setText(o.materials_notes ?? '');
    setExpected(o.materials_notes);
    setConflict(false);
  }

  return (
    <Section title={t('office.orderDetail.sectionMaterials')} description={t('office.orderDetail.materialsHint')}>
      {closed ? (
        <p className={o.materials_notes ? 'whitespace-pre-line' : 'text-muted-foreground'}>
          {o.materials_notes ?? t('office.orderDetail.materialsEmpty')}
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {conflict && (
            <Notice
              tone="warning"
              title={t('office.orderDetail.materialsConflict')}
              action={
                <Button size="sm" variant="outline" onClick={reload}>
                  <RotateCw />
                  {t('office.common.reload')}
                </Button>
              }
            />
          )}
          <Textarea
            aria-label={t('office.orderDetail.sectionMaterials')}
            rows={4}
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder={t('office.orderForm.materialsPlaceholder')}
          />
          <div className="flex justify-end">
            <Button size="sm" variant="outline" disabled={!dirty || saving} onClick={() => void save()}>
              {saving && <Spinner aria-hidden />}
              {t('office.orderDetail.materialsSave')}
            </Button>
          </div>
        </div>
      )}
    </Section>
  );
}
