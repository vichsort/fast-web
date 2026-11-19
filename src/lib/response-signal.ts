// Toda resposta HTTP que a página recebe do Supabase prova que a rede chega lá: é indício de conexão para a fila
// do técnico (docs/queue.md, Q7). Sem resposta (o fetch falhou), nada é dito.
export function signalingFetch(base: typeof fetch, notify: () => void): typeof fetch {
  return async (...args) => {
    const response = await base(...args);
    notify();
    return response;
  };
}
