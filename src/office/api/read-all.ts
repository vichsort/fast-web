// Leitura de uma lista inteira em blocos (`range`), para nunca bater no corte de `max_rows = 1000` do PostgREST, que
// devolve as primeiras 1000 linhas em silêncio (docs/e2e.md, D4 a D6). Quem chama dá a ordem fixa: sem ela, os
// blocos podem repetir ou pular linhas.

/** O `max_rows` do PostgREST (../fast/supabase/config.toml). */
export const BLOCK_SIZE = 1000;

/** Pede blocos [from, to] até vir um incompleto. Um bloco que falha derruba a leitura toda. */
export async function readAll<T>(page: (from: number, to: number) => Promise<T[]>): Promise<T[]> {
  const all: T[] = [];
  for (let from = 0; ; from += BLOCK_SIZE) {
    const block = await page(from, from + BLOCK_SIZE - 1);
    all.push(...block);
    if (block.length < BLOCK_SIZE) return all;
  }
}
