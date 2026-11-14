import { readFileSync } from 'node:fs';
import { errorMessage, t } from '.';
import { BACKEND_ERROR_CODES } from './pt-BR';

describe('texts', () => {
  it('translates a key and fills its parameters', () => {
    expect(t('common.updatedAt', { time: '14:05' })).toBe('Atualizado às 14:05');
  });

  it('translates every backend error code by its catalog key', () => {
    expect(errorMessage('order_closed')).toBe('Esta O.S. foi cancelada.');
    expect(errorMessage('storage_full')).toBe('Sem espaço no aparelho. Libere espaço antes de continuar.');
  });

  it('falls back to a generic text for a code the app does not know yet', () => {
    expect(errorMessage('some_new_code')).toBe('Não foi possível concluir. Tente de novo ou fale com o escritório.');
  });

  it('lists exactly the codes of the backend catalog (../fast/docs/errors.md)', () => {
    const doc = readFileSync(new URL('../../../../fast/docs/errors.md', import.meta.url), 'utf8');
    const catalog = doc.slice(doc.indexOf('## Catálogo'));
    const codes = [...catalog.matchAll(/^\| `([a-z_]+)` \|/gm)].map((m) => m[1]);
    expect(codes.length).toBeGreaterThan(0);
    expect([...BACKEND_ERROR_CODES].sort()).toEqual(codes.sort());
  });
});
