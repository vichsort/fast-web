# Fast O.S. — Front (PWA)

Regras de trabalho neste repositório. O backend (Supabase) fica no repositório irmão `../fast`, e os docs dele são a fonte da verdade do sistema: [spec](../fast/docs/spec.md), [api](../fast/docs/api.md), [errors](../fast/docs/errors.md), [offline](../fast/docs/offline.md) e os [módulos](../fast/docs/modules/). Como rodar: [README.md](README.md).

## Documentação

- **Contrato no backend, tela aqui.** Regra de negócio, payload, código de erro e comportamento offline estão nos docs do backend; aqui só se documenta o que é do aparelho: telas, navegação, a fila, as fotos. Nada é copiado de lá: aponte com link.
- **A doc manda.** Antes de implementar, leia o doc daqui e os do backend que ele cita. Se a implementação mostrar que a doc está errada ou incompleta, pare e pergunte. A correção vai no mesmo commit do código. Erro no contrato do backend é corrigido lá.
- **Docs daqui:** [docs/screens.md](docs/screens.md) (telas por papel), [docs/queue.md](docs/queue.md) (fila offline), [docs/photos.md](docs/photos.md) (fotos), [docs/roadmap.md](docs/roadmap.md) (ordem e o que já foi feito).
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
- **Playwright (`tests/e2e`):** poucos fluxos críticos de ponta a ponta contra o stack local do backend (`npm run db:start` em `../fast`), com o seed dele. Celular emulado e `context.setOffline` no fluxo do técnico.
- Tela simples, sem regra própria, não tem teste de componente.
- Cada regra é testada num lugar só.
- Nada de rede real nos testes `unit` e `browser`: a fila recebe a API por injeção e o teste passa uma falsa.

## Convenções

- **Estrutura:** `src/app` (rotas e layouts), `src/lib` (supabase, tipos gerados, textos, utilidades), `src/offline` (Dexie e fila), `src/photos` (captura e processamento), `src/office` e `src/technician` (telas de cada interface).
- **Alias:** `@/` = `src/`.
- **Tipos do banco:** `npm run types` gera `src/lib/database.types.ts` do stack local do backend. Nunca editar à mão.
- **IDs** de registros criados no aparelho: `crypto.randomUUID()`.
- **Horários:** ISO 8601; mostrar no fuso da empresa (`companies.timezone`) com `Intl.DateTimeFormat`.
- **Banco local:** schema em `src/offline/db.ts`; mudança de schema é versão nova do Dexie, nunca edição de uma versão publicada.
- **Lint e formatação:** Biome (`npm run lint`, `npm run format`). TypeScript `strict`.

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
