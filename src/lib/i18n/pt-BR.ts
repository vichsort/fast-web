// Textos da interface em pt-BR. Toda frase da tela sai daqui (t('chave')), para a tradução futura.
// `errors` tem uma chave por código do catálogo do backend (../fast/docs/errors.md) e os erros do aparelho.

/** Códigos do catálogo do backend (errors.md, "Catálogo"). */
export const BACKEND_ERROR_CODES = [
  'not_authenticated',
  'forbidden',
  'not_found',
  'invalid_input',
  'invalid_status',
  'order_closed',
  'not_assigned',
  'invalid_participants',
  'photos_required',
  'photo_missing_in_storage',
  'empty_supplement',
  'no_pending_execution',
  'not_latest_execution',
  'stale_review',
  'conflict',
  'client_has_open_orders',
  'reason_required',
  'comment_required',
  'last_owner',
  'invalid_import',
] as const;

/** Erros do aparelho (docs/photos.md) e o texto genérico. */
export const DEVICE_ERROR_CODES = ['storage_full', 'draft_not_editable', 'unknown'] as const;

export type ErrorCode = (typeof BACKEND_ERROR_CODES)[number] | (typeof DEVICE_ERROR_CODES)[number];

const errors = {
  not_authenticated: 'Sua sessão terminou. Entre de novo.',
  forbidden: 'Você não tem permissão para fazer isso.',
  not_found: 'Não encontrado. Pode ter sido excluído ou você não tem mais acesso.',
  invalid_input: 'Algum campo está faltando ou fora do formato.',
  invalid_status: 'O status atual da O.S. não permite isso.',
  order_closed: 'Esta O.S. foi cancelada.',
  not_assigned: 'Você não está mais atribuído a esta O.S.',
  invalid_participants: 'Algum participante nunca esteve nesta O.S.',
  photos_required: 'Tire ao menos uma foto antes de enviar.',
  photo_missing_in_storage: 'Uma foto não chegou ao servidor. Tente enviar de novo.',
  empty_supplement: 'O complemento precisa de texto ou foto.',
  no_pending_execution: 'Não há envio aguardando aprovação nesta O.S.',
  not_latest_execution: 'Este não é o envio aguardando aprovação.',
  stale_review: 'Chegou um complemento novo. Recarregue e revise de novo.',
  conflict: 'O texto foi alterado por outra pessoa enquanto você editava.',
  client_has_open_orders: 'O cliente tem O.S. em andamento.',
  reason_required: 'Informe o motivo.',
  comment_required: 'Informe o motivo da rejeição.',
  last_owner: 'A empresa precisa de ao menos um dono ativo.',
  invalid_import: 'O arquivo não tem o formato esperado.',
  storage_full: 'Sem espaço no aparelho. Libere espaço antes de continuar.',
  draft_not_editable: 'Este envio não pode mais ser alterado.',
  unknown: 'Não foi possível concluir. Tente de novo ou fale com o escritório.',
} satisfies Record<ErrorCode, string>;

export const ptBR = {
  common: {
    updatedAt: 'Atualizado às {time}',
  },
  errors,
  alerts: {
    gallery_without_exif: 'Foto da galeria sem data de captura.',
    gallery_before_start: 'Foto da galeria tirada antes do início do serviço.',
    submitted_before_rejection: 'Enviado antes da última rejeição: pode não responder ao motivo.',
    late_delivery: 'Entregue depois do prazo.',
  },
} as const;
