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
  'too_many_photos',
  'empty_supplement',
  'no_pending_execution',
  'not_latest_execution',
  'stale_review',
  'conflict',
  'client_has_open_orders',
  'reason_required',
  'comment_required',
  'last_owner',
  'invalid_link',
  'rate_limited',
  'invalid_import',
] as const;

/** Erros do aparelho (docs/photos.md) e o texto genérico. */
export const DEVICE_ERROR_CODES = ['storage_full', 'draft_not_editable', 'offline', 'unknown'] as const;

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
  too_many_photos: 'O envio passou de 30 fotos. Mande o que faltar num complemento.',
  empty_supplement: 'O complemento precisa de texto ou foto.',
  no_pending_execution: 'Não há envio aguardando aprovação nesta O.S.',
  not_latest_execution: 'Este não é o envio aguardando aprovação.',
  stale_review: 'Chegou um complemento novo. Recarregue e revise de novo.',
  conflict: 'O texto foi alterado por outra pessoa enquanto você editava.',
  client_has_open_orders: 'O cliente tem O.S. em andamento.',
  reason_required: 'Informe o motivo.',
  comment_required: 'Informe o motivo da rejeição.',
  last_owner: 'A empresa precisa de ao menos um dono ativo.',
  invalid_link:
    'Este link não vale mais: venceu, já foi usado ou foi trocado por outro. Peça um novo ao responsável da empresa.',
  rate_limited: 'Muitos convites em pouco tempo. Tente de novo mais tarde.',
  invalid_import: 'O arquivo não tem o formato esperado.',
  storage_full: 'Sem espaço no aparelho. Libere espaço antes de continuar.',
  draft_not_editable: 'Este envio não pode mais ser alterado.',
  offline: 'Sem conexão. Confira a internet e tente de novo.',
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
    forgotTitle: 'Esqueci a senha',
    forgotHelp:
      'O Fast O.S. não manda email. Peça ao responsável da empresa um link para definir uma senha nova e abra o link neste aparelho.',
    backToLogin: 'Voltar para o login',
    link: {
      title: 'Link',
      invalidTitle: 'Link sem validade',
      inviteTitle: 'Convite de {company}',
      inviteSetPassword: 'Escolha a senha que você vai usar para entrar com {email}. Ao salvar, você aceita o convite.',
      inviteSignIn: 'A empresa {company} convidou você. Entre com a sua senha ({email}) para aceitar o convite.',
      recoveryTitle: 'Nova senha',
      recoverySetPassword: 'Escolha uma senha nova para {email}. A senha antiga deixa de valer.',
      save: 'Salvar senha',
      saveAndAccept: 'Salvar senha e aceitar',
      signedInTitle: 'Outra conta aberta',
      signedIn: 'Este aparelho está com a conta {email}. Para usar o link, saia dela primeiro.',
      signOutAndContinue: 'Sair e continuar',
    },
    invalidEmail: 'Informe um email válido.',
    passwordRequired: 'Informe a senha.',
    passwordTooShort: 'A senha precisa de ao menos {min} caracteres.',
    passwordsDiffer: 'As senhas não são iguais.',
    invalidCredentials: 'Email ou senha incorretos.',
    weakPassword: 'Senha fraca. Escolha uma senha mais longa.',
    offline: 'Sem conexão. Conecte-se à internet para entrar.',
    failed: 'Não foi possível concluir. Tente de novo.',
    removed: 'Seu acesso foi removido. Os dados deste aparelho foram apagados.',
    declined: 'Você recusou o convite. Se mudar de ideia, peça um convite novo ao responsável da empresa.',
  },
  access: {
    invite: {
      title: 'Convite',
      description: 'Aceite para entrar na empresa. Os dados de outra empresa neste aparelho foram apagados.',
      from: 'A empresa {company} convidou você.',
      accept: 'Aceitar',
      decline: 'Recusar',
    },
    platformAdmin: 'Sua conta é de administração da plataforma, que ainda não tem tela. Use o painel do Supabase.',
    offlineFirstAccess: 'Sem conexão. O primeiro acesso neste aparelho precisa de internet.',
    retry: 'Tentar de novo',
  },
  update: {
    title: 'Atualize o app',
    description: 'Esta versão saiu de uso. Atualize para continuar. O que está na fila fica guardado e vai depois.',
    now: 'Atualizar agora',
    stillHere: 'Se esta tela voltar, a versão nova ainda está chegando ao aparelho. Tente de novo em alguns minutos.',
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
