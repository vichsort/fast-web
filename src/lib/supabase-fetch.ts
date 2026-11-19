// O `fetch` dos clientes do Supabase (página e service worker).

/**
 * Toda resposta HTTP que a página recebe do Supabase prova que a rede chega lá: é indício de conexão para a fila
 * do técnico (docs/queue.md, Q7). Sem resposta (o fetch falhou), nada é dito.
 */
export function signalingFetch(base: typeof fetch, notify: () => void): typeof fetch {
  return async (...args) => {
    const response = await base(...args);
    notify();
    return response;
  };
}

/** Prazo das requisições do Auth, o mesmo das RPCs da fila. */
export const AUTH_TIMEOUT_MS = 60_000;

/**
 * O auth-js não põe timeout nas próprias requisições (renovar a sessão, ler o usuário). Uma renovação pendurada
 * prende todas as chamadas que esperam o token, inclusive as da fila (docs/queue.md, Q6). As do Auth ganham um
 * prazo, somado ao sinal de quem chamou; as outras trazem o próprio sinal ou timeout.
 */
export function authTimeoutFetch(base: typeof fetch, ms = AUTH_TIMEOUT_MS): typeof fetch {
  return (input, init) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    if (!new URL(url).pathname.startsWith('/auth/v1/')) return base(input, init);
    const timeout = AbortSignal.timeout(ms);
    const signal = init?.signal ? AbortSignal.any([init.signal, timeout]) : timeout;
    return base(input, { ...init, signal });
  };
}
