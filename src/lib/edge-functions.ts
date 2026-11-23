// Chamada de Edge Function pelo cliente da página (api.md do backend): a falha vira `ApiError` classificada.
import { classifyFunctionError } from './errors';
import { supabase } from './supabase';

/** Chama a Edge Function `name` com `body`; erro de rede, servidor, sessão ou regra vira `ApiError`. */
export async function invokeFunction<T>(name: string, body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke<T>(name, { body });
  if (error) throw await classifyFunctionError(error);
  return data as T;
}
