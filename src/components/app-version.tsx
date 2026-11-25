// A versão do app em uso, no Perfil das duas interfaces: é o que o suporte pergunta.
import { t } from '@/lib/i18n';
import { APP_VERSION } from '@/lib/version';

export function AppVersion() {
  return (
    <p className="text-center text-xs text-muted-foreground tabular-nums">
      {t('ui.appVersion', { version: APP_VERSION })}
    </p>
  );
}
