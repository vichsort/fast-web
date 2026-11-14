// Classes de erro (errors.md do backend, "Classes de erro") a partir das formas que o @supabase/supabase-js devolve.
// A fila decide pela classe, nunca pela mensagem (docs/queue.md, Q6).

export type ErrorClass = 'network' | 'server' | 'session' | 'rule' | 'bug';

/** Falha de uma chamada da API, já classificada. `code` é o do catálogo quando a classe é `rule`. */
export class ApiError extends Error {
  constructor(
    readonly errorClass: ErrorClass,
    readonly code: string | null,
    message: string,
    readonly details: unknown = null,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** O erro do PostgREST (`PostgrestError`) ou o corpo de erro de uma Edge Function. */
export interface RpcError {
  code?: string;
  message: string;
  details?: string | null;
  hint?: string | null;
}

const SESSION_CODES = ['PGRST301', 'PGRST302', 'PGRST303'];

function parseDetails(details: string | null | undefined): unknown {
  if (!details) return null;
  try {
    return JSON.parse(details);
  } catch {
    return details;
  }
}

/** Classe do corpo de um erro com status HTTP de resposta (não de falha de rede). */
function classifyBody(error: RpcError, status: number): ApiError {
  const message = error.message ?? '';
  if (status === 401 || SESSION_CODES.includes(error.code ?? '') || /JWT expired/i.test(message)) {
    return new ApiError('session', error.code ?? null, message);
  }
  if (status >= 500) return new ApiError('server', error.code ?? null, message);
  if (error.code === 'P0001') {
    // Sem login no banco é sessão vencida, não recusa da regra: recusar perderia o envio por um token.
    if (message === 'not_authenticated') return new ApiError('session', message, message);
    return new ApiError('rule', message, message, parseDetails(error.details));
  }
  return new ApiError('bug', error.code || null, `${status} ${error.code ?? ''} ${message}`.trim());
}

/** Erro de `supabase.rpc(...)`: `status` 0 é o fetch que falhou (inclusive timeout). */
export function classifyRpcError(error: RpcError, status: number): ApiError {
  if (status === 0) return new ApiError('network', null, error.message);
  return classifyBody(error, status);
}

/** Erro de `supabase.functions.invoke(...)`: as funções respondem `{ code, message, details }` no corpo. */
export async function classifyFunctionError(error: unknown): Promise<ApiError> {
  const name = error instanceof Error ? error.name : '';
  const message = error instanceof Error ? error.message : String(error);
  if (name === 'FunctionsFetchError') return new ApiError('network', null, message);
  if (name === 'FunctionsRelayError') return new ApiError('server', null, message);
  const response = (error as { context?: unknown } | null)?.context;
  if (name !== 'FunctionsHttpError' || !(response instanceof Response)) return new ApiError('bug', null, message);

  let body: unknown;
  try {
    body = await response.clone().json();
  } catch {
    body = null;
  }
  if (body && typeof body === 'object' && typeof (body as RpcError).message === 'string') {
    return classifyBody(body as RpcError, response.status);
  }
  return classifyBody({ message: response.statusText || message }, response.status);
}

/** O `fetch` rejeitou: sem conexão, abortado ou timeout. */
export function classifyFetchFailure(error: unknown): ApiError {
  return new ApiError('network', null, error instanceof Error ? `${error.name}: ${error.message}` : String(error));
}

/** Resposta HTTP sem sucesso de um request sem corpo de erro do Supabase (o PUT da foto). */
export function classifyHttpStatus(status: number): ApiError {
  return classifyBody({ message: `HTTP ${status}` }, status);
}
