import { createZipLookup } from './viacep';

const found = {
  cep: '01001-000',
  logradouro: 'Praça da Sé',
  complemento: 'lado ímpar',
  unidade: '',
  bairro: 'Sé',
  localidade: 'São Paulo',
  uf: 'SP',
  estado: 'São Paulo',
};

const json =
  (body: unknown, status = 200) =>
  async () =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

describe('zip code lookup (ViaCEP)', () => {
  it('fills street, district, city and state, but not the complement (it describes the zip range)', async () => {
    const fetch = vi.fn(json(found));

    expect(await createZipLookup({ fetch })('01001000')).toEqual({
      kind: 'found',
      address: { street: 'Praça da Sé', district: 'Sé', city: 'São Paulo', state: 'SP' },
    });
    expect(fetch).toHaveBeenCalledWith('https://viacep.com.br/ws/01001000/json/', expect.anything());
  });

  it('a city-wide zip code brings only city and state, so it does not erase what was typed', async () => {
    const lookup = createZipLookup({ fetch: json({ ...found, logradouro: '', bairro: ' ' }) });

    expect(await lookup('13560970')).toEqual({ kind: 'found', address: { city: 'São Paulo', state: 'SP' } });
  });

  it.each([
    ['an unknown zip code', json({ erro: 'true' })],
    ['an unknown zip code (boolean flag)', json({ erro: true })],
    ['a malformed zip code', json({ erro: true }, 400)],
  ])('%s is not found', async (_, fetch) => {
    expect(await createZipLookup({ fetch })('99999999')).toEqual({ kind: 'not_found' });
  });

  it('does not call the service without 8 digits', async () => {
    const fetch = vi.fn(json(found));

    expect(await createZipLookup({ fetch })('0100100')).toEqual({ kind: 'not_found' });
    expect(fetch).not.toHaveBeenCalled();
  });

  it.each([
    ['no network', async () => Promise.reject(new TypeError('Failed to fetch'))],
    ['a server error', json({}, 503)],
    ['an unexpected body', async () => new Response('<html>', { status: 200 })],
  ])('%s leaves the service unavailable (fill in by hand)', async (_, fetch) => {
    expect(await createZipLookup({ fetch })('01001000')).toEqual({ kind: 'unavailable' });
  });

  it('gives up after the timeout', async () => {
    const hanging = (_: string, init?: RequestInit) =>
      new Promise<Response>((_, reject) => init?.signal?.addEventListener('abort', () => reject(init.signal?.reason)));

    expect(await createZipLookup({ fetch: hanging, timeoutMs: 10 })('01001000')).toEqual({ kind: 'unavailable' });
  });
});
