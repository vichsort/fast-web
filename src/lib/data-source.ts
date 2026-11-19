// De onde as telas leem: o Supabase ou os dados de exemplo (src/mocks). Uma chave só, no build:
// VITE_DATA_SOURCE=mock. Serve para ver as telas sem o backend e para os testes de tela.
export type DataSource = 'supabase' | 'mock';

export const dataSource: DataSource = import.meta.env.VITE_DATA_SOURCE === 'mock' ? 'mock' : 'supabase';

export const usingMocks = dataSource === 'mock';
