import { FunctionsFetchError, FunctionsHttpError, FunctionsRelayError } from '@supabase/supabase-js';
import { ApiError, classifyFetchFailure, classifyFunctionError, classifyHttpStatus, classifyRpcError } from './errors';

// Formas reais do @supabase/supabase-js 2.119: o PostgREST devolve { error, status } (status 0 quando o fetch
// falha); a Edge Function devolve FunctionsHttpError com o Response em `context`.
const rule = (message: string, details: string | null = null) => ({ code: 'P0001', message, details, hint: null });

function functionResponse(status: number, body: unknown): FunctionsHttpError {
  return new FunctionsHttpError(
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }),
  );
}

describe('error classes', () => {
  it('Q6: RPC errors fall into the classes of errors.md', () => {
    const cases: [Parameters<typeof classifyRpcError>[0], number, string][] = [
      [{ message: 'TypeError: fetch failed', details: '', hint: '', code: '' }, 0, 'network'],
      [{ message: 'AbortError: The operation was aborted', details: '', hint: '', code: '' }, 0, 'network'],
      [{ message: 'upstream error' }, 503, 'server'],
      [{ message: 'project paused' }, 540, 'server'],
      [{ code: 'PGRST301', message: 'JWT could not be decoded', details: null, hint: null }, 401, 'session'],
      [{ code: 'PGRST303', message: 'JWT expired', details: null, hint: null }, 401, 'session'],
      [{ code: '', message: 'JWT expired', details: null, hint: null }, 400, 'session'],
      [rule('order_closed'), 400, 'rule'],
      [{ code: '42501', message: 'permission denied for function', details: null, hint: null }, 403, 'bug'],
      [{ code: 'PGRST202', message: 'Could not find the function', details: null, hint: null }, 404, 'bug'],
      [{ code: '23505', message: 'duplicate key', details: null, hint: null }, 409, 'bug'],
    ];

    for (const [error, status, expected] of cases) {
      expect([error.message, classifyRpcError(error, status).errorClass]).toEqual([error.message, expected]);
    }
  });

  it('Q6: a rule error keeps the catalog code and the parsed details', () => {
    const error = classifyRpcError(rule('conflict', '{"current":"1 cabo"}'), 400);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ errorClass: 'rule', code: 'conflict', details: { current: '1 cabo' } });
  });

  it('Q6: not_authenticated is a session problem, not a rule refusal', () => {
    expect(classifyRpcError(rule('not_authenticated'), 400).errorClass).toBe('session');
  });

  it('Q6: Edge Function errors fall into the same classes', async () => {
    const cases: [unknown, string][] = [
      [new FunctionsFetchError(new TypeError('fetch failed')), 'network'],
      [new FunctionsRelayError(new Response('', { status: 502 })), 'server'],
      [functionResponse(500, { code: 'internal_error', message: 'internal_error' }), 'server'],
      [functionResponse(540, {}), 'server'],
      [functionResponse(401, rule('not_authenticated')), 'session'],
      [functionResponse(400, rule('photo_missing_in_storage')), 'rule'],
      [functionResponse(400, rule('not_authenticated')), 'session'],
      [functionResponse(404, { message: 'function not found' }), 'bug'],
      [new FunctionsHttpError(new Response('not json', { status: 400 })), 'bug'],
      [new Error('something else'), 'bug'],
    ];

    for (const [error, expected] of cases) {
      expect((await classifyFunctionError(error)).errorClass).toBe(expected);
    }
    expect(await classifyFunctionError(functionResponse(400, rule('order_closed')))).toMatchObject({
      code: 'order_closed',
    });
  });

  it('Q6: a failed fetch is network; the PUT status decides the rest', () => {
    expect(classifyFetchFailure(new TypeError('fetch failed')).errorClass).toBe('network');
    expect(classifyFetchFailure(new DOMException('timeout', 'AbortError')).errorClass).toBe('network');
    expect(classifyHttpStatus(503).errorClass).toBe('server');
    expect(classifyHttpStatus(401).errorClass).toBe('session');
    expect(classifyHttpStatus(403).errorClass).toBe('bug');
  });
});
