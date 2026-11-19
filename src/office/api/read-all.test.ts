import { BLOCK_SIZE, readAll } from './read-all';

/** Uma tabela falsa: cada chamada devolve o recorte [from, to] pedido, como o `range` do PostgREST. */
function table(total: number) {
  const all = Array.from({ length: total }, (_, i) => i);
  const calls: [number, number][] = [];
  const page = async (from: number, to: number) => {
    calls.push([from, to]);
    return all.slice(from, to + 1);
  };
  return { all, calls, page };
}

describe('readAll', () => {
  it('reads past max_rows in blocks of 1000, in order', async () => {
    const { all, calls, page } = table(2500);

    expect(await readAll(page)).toEqual(all);
    expect(BLOCK_SIZE).toBe(1000);
    expect(calls).toEqual([
      [0, 999],
      [1000, 1999],
      [2000, 2999],
    ]);
  });

  it('asks once more when the last block is full', async () => {
    const { all, calls, page } = table(2000);

    expect(await readAll(page)).toEqual(all);
    expect(calls).toHaveLength(3);
  });

  it('stops at the first short block', async () => {
    const { calls, page } = table(3);

    expect(await readAll(page)).toEqual([0, 1, 2]);
    expect(calls).toEqual([[0, 999]]);
  });

  it('fails the whole read when a block fails', async () => {
    let n = 0;
    const page = async () => {
      n += 1;
      if (n === 2) throw new Error('rede');
      return Array.from({ length: 1000 }, (_, i) => i);
    };

    await expect(readAll(page)).rejects.toThrow('rede');
  });
});
