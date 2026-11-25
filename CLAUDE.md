# Fast O.S. — Front (PWA)

Regras de trabalho neste repositório. O backend (Supabase) fica no repositório irmão `../fast`, e os docs dele são a fonte da verdade do sistema: [spec](../fast/docs/spec.md), [api](../fast/docs/api.md), [errors](../fast/docs/errors.md), [offline](../fast/docs/offline.md) e os [módulos](../fast/docs/modules/). Como rodar: [README.md](README.md).

> **Escopo travado até o MVP: decisão do P.O. (2026-11-24).** Só se trabalha nas etapas de [docs/pending.md](docs/pending.md), na ordem. Pedido fora delas, inclusive de um agente para si mesmo (melhoria, refatoração, teste a mais, doc a mais), vai para "Bloqueado até o MVP" no pending e **não é implementado**. Na dúvida se algo está dentro, pare e pergunte ao P.O.

## Documentação

- **Contrato no backend, tela aqui.** Regra de negócio, payload, código de erro e comportamento offline estão nos docs do backend; aqui só se documenta o que é do aparelho: telas, navegação, a fila, as fotos. Nada é copiado de lá: aponte com link.
- **A doc manda.** Antes de implementar, leia o doc daqui e os do backend que ele cita. Se a implementação mostrar que a doc está errada ou incompleta, pare e pergunte. A correção vai no mesmo commit do código. Erro no contrato do backend é corrigido lá.
- **Docs daqui:** [docs/screens.md](docs/screens.md) (telas por papel), [docs/queue.md](docs/queue.md) (fila offline), [docs/photos.md](docs/photos.md) (fotos), [docs/components.md](docs/components.md) (convenções dos componentes, tema e dados de exemplo), [docs/e2e.md](docs/e2e.md) (como rodam os E2E, riscos abertos e roteiros manuais), [docs/edges.md](docs/edges.md) (casos de borda para o P.O.: o que parece bug e é regra, e o que ele decide), [docs/pending.md](docs/pending.md) (as etapas até o MVP e o que está bloqueado, front e backend), [docs/decisions.md](docs/decisions.md) (decisões vigentes, front e backend).
- **Sem bloat.** Tabela em vez de texto corrido, sem introdução. Decisão em uma ou duas linhas, só a vigente (o histórico fica no git); o que o código ou o cabeçalho de um teste já diz não se repete em doc.
- **Decisões e pendências dos dois repositórios ficam só aqui.** Decisão nova (do front ou do backend, inclusive de arquitetura) entra em [docs/decisions.md](docs/decisions.md), na seção do assunto, com data e o porquê. O que falta fazer fica em [docs/pending.md](docs/pending.md); item feito sai de lá no mesmo commit do comportamento. Os outros docs, aqui e no backend, não têm seção de decisões, pendências nem roadmap.
- **Memória do Claude é por máquina** (o usuário alterna entre dois PCs). Nada que importe ao projeto fica só na memória.

## Regras de ouro

- **TDD sempre** no que tem regra própria. Primeiro o teste, ver falhar pelo motivo certo, o mínimo para passar, refatorar com tudo verde.
- **O banco decide.** O front não reimplementa regra de negócio: mostra, chama a RPC e trata a resposta pela classe de erro ([errors.md](../fast/docs/errors.md#classes-de-erro)). Exceção: os alertas da prova fotográfica, que o doc 04 manda o front calcular.
- **Offline só no técnico.** O escritório trabalha online; o código offline (banco local, fila, fotos, service worker) é carregado só na interface do técnico. Cada área é um pedaço do build: o `routes.tsx` dela carrega as telas de `src/<área>/pages.ts` com `lazyRouteComponent`, e nada fora da área importa essas telas. A biblioteca Dexie entra para todos porque guarda a sessão ([auth-storage.ts](src/lib/auth-storage.ts)).
- **Bordas à vista.** Toda decisão levada ao usuário vem com o que ela permite ou quebra fora do caminho feliz: quem passa a acessar o quê, sem sinal, com dado antigo no aparelho, com duas pessoas ao mesmo tempo. Borda achada depois, na implementação, vai ao usuário antes do código.
- **Sem escopo extra.** O que está em "Fora do escopo" na spec do backend fica fora.
- **Textos em pt-BR, centralizados** (`t('chave')`); as chaves de erro são as do catálogo do backend. Código, nomes e commits em inglês.

## Onde cada coisa é testada

- **Vitest, projeto `unit` (Node):** lógica sem DOM: fila, classificação de erros, alertas, limpeza do aparelho. IndexedDB pelo `fake-indexeddb` (já carregado no setup). Arquivos `*.test.ts`.
- **Vitest, projeto `browser` (Chromium):** o que precisa de canvas, `Blob` de imagem ou APIs do navegador (compressão de foto). Arquivos `*.browser.test.ts`.
- **Playwright (`tests/e2e`, `npm run test:e2e`, como rodam em [docs/e2e.md](docs/e2e.md); o que cada teste prova, no cabeçalho dele):** poucos fluxos críticos de ponta a ponta contra o stack local do backend (`npm run db:start` em `../fast`), com o seed dele, e o app do build (`vite preview` na 4173). Projeto `office` (desktop) e `technician` (celular emulado, `context.setOffline` no offline); preparo e conferência direto no banco por [`tests/e2e/support/backend.ts`](tests/e2e/support/backend.ts). Fora do `npm run check`: roda antes de commitar o que mexe no fluxo coberto.
- Tela simples, sem regra própria, não tem teste de componente.
- Cada regra é testada num lugar só.
- O teste dos textos confere as chaves de erro contra o catálogo do backend, lendo `../fast/docs/errors.md`: código novo lá quebra o teste aqui até ganhar texto.
- Nada de rede real nos testes `unit` e `browser`: a fila recebe a API por injeção e o teste passa uma falsa.

## Convenções

- **Estrutura:** `src/app` (rotas e layouts), `src/lib` (supabase, tipos gerados, views das telas, textos, utilidades), `src/offline` (Dexie e fila), `src/photos` (captura e processamento), `src/office` e `src/technician` (telas de cada interface).
- **Cada área nos seus arquivos**, para trabalhos em paralelo não colidirem: técnico em `src/technician/**`, escritório em `src/office/**`, componentes em `src/components/**`; rotas em `src/<área>/routes.tsx`, telas expostas às rotas em `src/<área>/pages.ts`; textos em `src/lib/i18n/<área>.ts` (`ui`, `technician`, `office`).
- **Dados de exemplo atrás de uma chave:** `src/mocks/` e os `mocks.ts` de cada área (tipados a partir de `database.types.ts`) imitam a forma das consultas reais. Com `VITE_DATA_SOURCE=mock` ([data-source.ts](src/lib/data-source.ts)) as telas leem deles e as ações só mostram o efeito, com o aviso de dados de exemplo (`ScratchBanner`, `scratchToast`); sem a chave, o Supabase. As telas nunca importam os mocks nem o Supabase direto: só a API da área (`src/office/api/`, `src/technician/api/`), cujo contrato (`OfficeApi`, `TechnicianApi` no `types.ts` de cada uma) as duas implementações cumprem. As formas que as telas leem ficam em `src/lib/views.ts`, não nos mocks; o Biome (`noRestrictedImports`) barra importar mocks fora das implementações de exemplo e da vitrine `/dev`. A implementação de exemplo entra no `api/index.ts` por `import()` com a chave lida ali mesmo (`import.meta.env.VITE_DATA_SOURCE === 'mock'`, não o `usingMocks`), e a vitrine também por `import()`: só assim o build de produção não empacota os dados de exemplo.
- **Alias:** `@/` = `src/`.
- **Tipos do banco:** `npm run types` gera `src/lib/database.types.ts` do stack local do backend. Nunca editar à mão.
- **IDs** de registros criados no aparelho: `crypto.randomUUID()`.
- **Horários:** ISO 8601; mostrar no fuso da empresa (`companies.timezone`) com `Intl.DateTimeFormat`.
- **Banco local:** schema em `src/offline/db.ts`; mudança de schema é versão nova do Dexie, nunca edição de uma versão publicada.
- **Lint e formatação:** Biome (`npm run lint`, `npm run format`). TypeScript `strict`.
- **Componentes shadcn/ui** (Base UI, estilo `base-nova`): `node node_modules/shadcn/dist/index.js add <nome>`. Não use `npx shadcn` nem `npm run`: eles repassam o `allow-scripts` do `~/.npmrc` como flag ao npm filho, e o npm 12 recusa. `src/components/ui` é gerado: fica fora do lint e não se edita à mão sem motivo.

## Ciclo

1. Ler no doc a regra a implementar.
2. Escrever o teste de um comportamento.
3. Rodar e confirmar que falha pelo motivo esperado.
4. O mínimo para passar.
5. `npm run check` verde (lint, tipos e Vitest).
6. Refatorar com tudo verde, tirar o item de [pending.md](docs/pending.md) (se era um) e commitar.

## Git

- Branch `main`. Trabalho paralelo (subagentes) em worktree com branch própria, juntado na `main` pelo agente principal.
- Um commit por comportamento verde, com teste, implementação e doc juntos.
- **Commit automático:** com `npm run check` verde, o agente commita cada comportamento sem pedir. Push e operações destrutivas de git só com pedido explícito.
- Mensagem de uma linha, Conventional Commits em inglês (`feat:`, `test:`, `fix:`, `refactor:`, `docs:`, `chore:`). Sem corpo e sem coautoria.
- Nunca commitar `.env*` (exceto `.env.example`) nem chaves.
