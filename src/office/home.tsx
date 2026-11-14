import { t } from '@/lib/i18n';

export function OfficeHome() {
  return (
    <section className="space-y-2">
      <h1 className="text-xl font-semibold">{t('nav.officeHome')}</h1>
      <p className="text-sm text-muted-foreground">{t('common.comingSoon')}</p>
    </section>
  );
}
