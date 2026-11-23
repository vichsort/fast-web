// Faixa do stale_review (04, R10): chegou complemento depois do carregamento; a decisão trava até recarregar.
import { FilePlus, RotateCw } from 'lucide-react';
import { Notice } from '@/components/notice';
import { Button } from '@/components/ui/button';
import { errorMessage, t } from '@/lib/i18n';

export function StaleNotice({ onReload }: { onReload: () => void }) {
  return (
    <Notice
      tone="warning"
      icon={FilePlus}
      title={t('office.review.staleTitle')}
      action={
        <Button size="sm" onClick={onReload}>
          <RotateCw />
          {t('office.common.reload')}
        </Button>
      }
    >
      {errorMessage('stale_review')}
    </Notice>
  );
}
