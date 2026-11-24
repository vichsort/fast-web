// "Mandar ao escritório" (Pendências): o resumo do envio recusado que vai pelo compartilhamento do celular, junto
// com as fotos. O envio não chega ao banco (a recusa fica); é o jeito de a prova sair do aparelho antes de apagar.
import { formatDateTime, formatOrderNumber } from '@/lib/format';
import { errorMessage, t } from '@/lib/i18n';

export interface RefusedShareInput {
  orderNumber: number;
  orderTitle: string;
  clientName: string | null;
  /** Código do catálogo (errors.md). */
  refusal: string;
  startedAt: string | null;
  submittedAt: string;
  description: string;
  photos: number;
  timeZone: string;
}

export function refusedShareText(input: RefusedShareInput): { title: string; text: string } {
  const title = t('technician.share.title', {
    number: formatOrderNumber(input.orderNumber),
    title: input.orderTitle,
  });
  const submitted = formatDateTime(input.submittedAt, input.timeZone);
  const lines = [
    title,
    ...(input.clientName ? [t('technician.share.client', { name: input.clientName })] : []),
    t('technician.share.refused', { reason: errorMessage(input.refusal) }),
    input.startedAt
      ? t('technician.share.times', { started: formatDateTime(input.startedAt, input.timeZone), submitted })
      : t('technician.share.submitted', { submitted }),
  ];
  const description = input.description.trim();
  if (description) lines.push('', t('technician.share.done'), description);
  if (input.photos > 0) lines.push('', t('technician.share.photos', { count: input.photos }));
  return { title, text: lines.join('\n') };
}

/** "OS-0042-foto-1.jpg" */
export function sharePhotoName(orderNumber: number, index: number): string {
  return `OS-${formatOrderNumber(orderNumber).slice(1)}-foto-${index + 1}.jpg`;
}
