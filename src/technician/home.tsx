import { t } from '@/lib/i18n';

export function TechnicianHome() {
  return (
    <section className="space-y-2">
      <h1 className="text-lg font-semibold">{t('nav.technicianHome')}</h1>
      <p className="text-sm text-muted-foreground">{t('common.comingSoon')}</p>
    </section>
  );
}
