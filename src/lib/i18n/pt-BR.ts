// Textos da interface em pt-BR. Toda frase da tela sai daqui (t('chave')), para a tradução futura.
// Cada área tem o seu arquivo (ui.ts, technician.ts, office.ts), para não disputarem este.
// `errors` tem uma chave por código do catálogo do backend (../fast/docs/errors.md) e os erros do aparelho.

import { officeTexts } from './office';
import { technicianTexts } from './technician';
import { uiTexts } from './ui';

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
  ui: uiTexts,
  technician: technicianTexts,
  office: officeTexts,
  common: {
    appName: 'Fast O.S.',
    updatedAt: 'Atualizado às {time}',
    loading: 'Carregando…',
    logout: 'Sair',
    logoutWithPending:
      'Há {count} envio(s) ainda não sincronizado(s). Sair apaga esses dados do aparelho. Sair mesmo assim?',
    comingSoon: 'Em construção.',
  },
  auth: {
    email: 'Email',
    password: 'Senha',
    newPassword: 'Nova senha',
    confirmPassword: 'Repita a senha',
    login: 'Entrar',
    loginTitle: 'Entrar no Fast O.S.',
    forgotLink: 'Esqueci minha senha',
    forgotTitle: 'Recuperar senha',
    forgotHelp: 'Informe seu email. Se ele estiver cadastrado, você recebe um link para criar uma nova senha.',
    forgotSend: 'Enviar link',
    forgotSent: 'Se o email estiver cadastrado, o link chega em instantes. Confira também a caixa de spam.',
    backToLogin: 'Voltar para o login',
    setPasswordTitle: 'Criar senha',
    setPasswordHelp: 'Escolha a senha que você vai usar para entrar.',
    setPasswordSave: 'Salvar senha',
    invalidEmail: 'Informe um email válido.',
    passwordRequired: 'Informe a senha.',
    passwordTooShort: 'A senha precisa de ao menos {min} caracteres.',
    passwordsDiffer: 'As senhas não são iguais.',
    invalidCredentials: 'Email ou senha incorretos.',
    weakPassword: 'Senha fraca. Escolha uma senha mais longa.',
    offline: 'Sem conexão. Conecte-se à internet para entrar.',
    failed: 'Não foi possível concluir. Tente de novo.',
    removed: 'Seu acesso foi removido. Os dados deste aparelho foram apagados.',
    linkExpired: 'O link expirou ou já foi usado. Peça um novo em "Esqueci minha senha" ou ao escritório.',
  },
  access: {
    platformAdmin: 'Sua conta é de administração da plataforma, que ainda não tem tela. Use o painel do Supabase.',
    offlineFirstAccess: 'Sem conexão. O primeiro acesso neste aparelho precisa de internet.',
    retry: 'Tentar de novo',
  },
  nav: {
    technicianHome: 'Minhas O.S.',
    officeHome: 'Dashboard',
  },
  errors,
  alerts: {
    gallery_without_exif: 'Foto da galeria sem data de captura.',
    gallery_before_start: 'Foto da galeria tirada antes do início do serviço.',
    submitted_before_rejection: 'Enviado antes da última rejeição: pode não responder ao motivo.',
    late_delivery: 'Entregue depois do prazo.',
  },
} as const;
