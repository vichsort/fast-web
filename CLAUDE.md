# Fast O.S. — Front (PWA)

Regras de trabalho neste repositório. O backend (Supabase) fica no repositório irmão `../fast`, e os docs dele são a fonte da verdade do sistema: [spec](../fast/docs/spec.md), [api](../fast/docs/api.md), [errors](../fast/docs/errors.md), [offline](../fast/docs/offline.md) e os [módulos](../fast/docs/modules/). Como rodar: [README.md](README.md).

## Documentação

- **Contrato no backend, tela aqui.** Regra de negócio, payload, código de erro e comportamento offline estão nos docs do backend; aqui só se documenta o que é do aparelho: telas, navegação, a fila, as fotos. Nada é copiado de lá: aponte com link.
- **A doc manda.** Antes de implementar, leia o doc daqui e os do backend que ele cita. Se a implementação mostrar que a doc está errada ou incompleta, pare e pergunte. A correção vai no mesmo commit do código. Erro no contrato do backend é corrigido lá.
- **Docs daqui:** [docs/screens.md](docs/screens.md) (telas por papel), [docs/queue.md](docs/queue.md) (fila offline), [docs/photos.md](docs/photos.md) (fotos), [docs/components.md](docs/components.md) (componentes, tema e dados de exemplo), [docs/e2e.md](docs/e2e.md) (pontos críticos e plano de E2E), [docs/roadmap.md](docs/roadmap.md) (ordem e o que já foi feito).
- **Sem bloat.** Tabela em vez de texto corrido, sem introdução.
- **Decisão nova** entra em "Decisões" do doc, com data e o porquê. Decisão de arquitetura do sistema vai na spec do backend.
- **Roadmap:** marque o item no mesmo commit do comportamento.
- **Memória do Claude é por máquina** (o usuário alterna entre dois PCs). Nada que importe ao projeto fica só na memória.

## Regras de ouro

- **TDD sempre** no que tem regra própria. Primeiro o teste, ver falhar pelo motivo certo, o mínimo para passar, refatorar com tudo verde.
- **O banco decide.** O front não reimplementa regra de negócio: mostra, chama a RPC e trata a resposta pela classe de erro ([errors.md](../fast/docs/errors.md#classes-de-erro)). Exceção: os alertas da prova fotográfica, que o doc 04 manda o front calcular.
- **Offline só no técnico.** O escritório trabalha online; o código offline (Dexie, fila, service worker) é carregado só na interface do técnico.
- **Sem escopo extra.** O que está em "Fora do escopo" na spec do backend fica fora.
- **Textos em pt-BR, centralizados** (`t('chave')`); as chaves de erro são as do catálogo do backend. Código, nomes e commits em inglês.

## Onde cada coisa é testada

- **Vitest, projeto `unit` (Node):** lógica sem DOM: fila, classificação de erros, alertas, limpeza do aparelho. IndexedDB pelo `fake-indexeddb` (já carregado no setup). Arquivos `*.test.ts`.
- **Vitest, projeto `browser` (Chromium):** o que precisa de canvas, `Blob` de imagem ou APIs do navegador (compressão de foto). Arquivos `*.browser.test.ts`.
- **Playwright (`tests/e2e`, `npm run test:e2e`, plano em [docs/e2e.md](docs/e2e.md)):** poucos fluxos críticos de ponta a ponta contra o stack local do backend (`npm run db:start` em `../fast`), com o seed dele, e o app do build (`vite preview` na 4173). Projeto `office` (desktop) e `technician` (celular emulado, `context.setOffline` no offline); preparo e conferência direto no banco por [`tests/e2e/support/backend.ts`](tests/e2e/support/backend.ts). Fora do `npm run check`: roda antes de commitar o que mexe no fluxo coberto.
- Tela simples, sem regra própria, não tem teste de componente.
- Cada regra é testada num lugar só.
- O teste dos textos confere as chaves de erro contra o catálogo do backend, lendo `../fast/docs/errors.md`: código novo lá quebra o teste aqui até ganhar texto.
- Nada de rede real nos testes `unit` e `browser`: a fila recebe a API por injeção e o teste passa uma falsa.

## Convenções

- **Estrutura:** `src/app` (rotas e layouts), `src/lib` (supabase, tipos gerados, views das telas, textos, utilidades), `src/offline` (Dexie e fila), `src/photos` (captura e processamento), `src/office` e `src/technician` (telas de cada interface).
- **Cada área nos seus arquivos**, para trabalhos em paralelo não colidirem: técnico em `src/technician/**`, escritório em `src/office/**`, componentes em `src/components/**`; rotas em `src/<área>/routes.tsx`; textos em `src/lib/i18n/<área>.ts` (`ui`, `technician`, `office`).
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
6. Refatorar com tudo verde, marcar o roadmap e commitar.

## Git

- Branch `main`. Trabalho paralelo (subagentes) em worktree com branch própria, juntado na `main` pelo agente principal.
- Um commit por comportamento verde, com teste, implementação e doc juntos.
- **Commit automático:** com `npm run check` verde, o agente commita cada comportamento sem pedir. Push e operações destrutivas de git só com pedido explícito.
- Mensagem de uma linha, Conventional Commits em inglês (`feat:`, `test:`, `fix:`, `refactor:`, `docs:`, `chore:`). Sem corpo e sem coautoria.
- Nunca commitar `.env*` (exceto `.env.example`) nem chaves.
