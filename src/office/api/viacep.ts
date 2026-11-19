// Preenchimento do endereço pelo CEP (02: "CEP com preenchimento automático no front") pelo ViaCEP, chamado direto
// do navegador (o serviço libera CORS). Falha do serviço nunca trava o formulário: o endereço é digitado à mão.

/** Só o que veio preenchido: um CEP de cidade inteira traz cidade e UF, e não apaga a rua digitada. */
export type ZipAddress = Partial<Record<'street' | 'district' | 'city' | 'state', string>>;

export type ZipLookup = { kind: 'found'; address: ZipAddress } | { kind: 'not_found' } | { kind: 'unavailable' };

interface ViaCepBody {
  erro?: boolean | string;
  logradouro?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
}

const TIMEOUT_MS = 8_000;

export function createZipLookup({
  fetch: fetchImpl = (input, init) => fetch(input, init),
  timeoutMs = TIMEOUT_MS,
}: {
  fetch?: (input: string, init?: RequestInit) => Promise<Response>;
  timeoutMs?: number;
} = {}) {
  return async (digits: string): Promise<ZipLookup> => {
    if (!/^\d{8}$/.test(digits)) return { kind: 'not_found' };
    let body: ViaCepBody;
    try {
      const response = await fetchImpl(`https://viacep.com.br/ws/${digits}/json/`, {
        signal: AbortSignal.timeout(timeoutMs),
      });
      // 400: formato inválido, que para quem digitou é o mesmo que CEP inexistente.
      if (response.status === 400) return { kind: 'not_found' };
      if (!response.ok) return { kind: 'unavailable' };
      body = (await response.json()) as ViaCepBody;
    } catch {
      return { kind: 'unavailable' };
    }
    // O ViaCEP responde `"erro": "true"` (texto) hoje; versões antigas mandavam o booleano.
    if (body.erro === true || body.erro === 'true') return { kind: 'not_found' };
    // O `complemento` do ViaCEP descreve a faixa do CEP ("lado ímpar"), não o complemento do endereço.
    const fields = { street: body.logradouro, district: body.bairro, city: body.localidade, state: body.uf };
    const address: ZipAddress = {};
    for (const [key, value] of Object.entries(fields) as [keyof ZipAddress, string | undefined][]) {
      if (typeof value === 'string' && value.trim()) address[key] = value.trim();
    }
    return address.city || address.state ? { kind: 'found', address } : { kind: 'unavailable' };
  };
}
