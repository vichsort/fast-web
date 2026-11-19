# Roadmap do front

Ordem de trabalho do front. Cada item é um comportamento: teste vermelho (quando tem regra própria), implementação e um commit. O técnico vem primeiro: fila e fotos são o maior risco e o valor central do produto. O roadmap do backend é o [dele](../../fast/docs/roadmap.md).

## 0. Fundação

- [x] Repositório, stack, Vitest (Node e Chromium), Biome, PWA com service worker próprio, tipos gerados do banco.
- [x] Docs: CLAUDE.md, telas, fila, fotos, roadmap.
- [x] Banco local (Dexie): rascunhos, fotos e fila.

## 1. Fila e fotos (em paralelo)

- [x] Fila offline: tipos de item, FIFO por O.S., envio do rascunho com fotos, classes de erro, espera crescente, lock, limpeza do usuário ([queue.md](queue.md)).
- [x] Fotos: compressão, `captured_at` e localização do EXIF, espaço, guardar e tirar do rascunho, alertas ([photos.md](photos.md)).

## 2. Base do app

- [x] Cliente Supabase com a sessão num storage do IndexedDB (a página e o service worker leem a mesma sessão).
- [x] Textos pt-BR (`t()`) com as chaves de erro do backend.
- [x] Rotas (TanStack Router), login, recuperar e definir senha, layout por papel.
- [x] shadcn/ui e tema.
- [x] Service worker: fila no Background Sync, aviso de versão nova e rotas sem sinal ([queue.md](queue.md#service-worker)).
- [x] Membro removido: conferir o vínculo ativo a cada recusa por regra da fila (ao abrir com sinal já confere); sem vínculo, `clearUser` e logout.
- [x] Playwright contra o stack local do backend: base, login por papel.

## 2b. Scratch visual (sem testes, dados de exemplo)

Esboço visual do sistema inteiro antes da integração real, pedido em 2026-11-13: telas com dados de exemplo e sem testes de tela. Concluído; as etapas 3 e 4 ligaram as telas ao Supabase, e os dados de exemplo ficaram atrás da chave `VITE_DATA_SOURCE` ([CLAUDE.md](../CLAUDE.md#convenções)).

- [x] Componentes reutilizáveis, dados de exemplo compartilhados e a vitrine em `/dev/components`.
- [x] Telas do técnico (etapa 3) em scratch ([screens-technician.md](screens-technician.md)).
- [x] Telas do escritório (etapa 4) em scratch ([screens-office.md](screens-office.md)).

## 3. Técnico

- [x] Minhas O.S. com cache persistido (TanStack Query no IndexedDB).
- [x] Detalhe da O.S. e materiais offline.
- [x] Execução: câmera, galeria, rascunho, enviar.
- [x] Complemento.
- [x] Pendências.
- [x] Fotos já vistas no aparelho sem sinal (offline.md, "Fotos já vistas"; [photos.md](photos.md), F8 a F10).
- [x] E2E: execução offline com fotos chega ao servidor sem duplicar ([offline-execution.spec.ts](../tests/e2e/technician/offline-execution.spec.ts)); achou a fila parada com o sinal de volta, corrigida pelo indício de conexão ([queue.md](queue.md), Q7).
- [x] E2E: envio recusado por O.S. cancelada fica com o motivo até o técnico apagar ([refused-submission.spec.ts](../tests/e2e/technician/refused-submission.spec.ts); [e2e.md](e2e.md), P5).
- [x] E2E: o app abre sem sinal direto numa O.S. ([offline-open.spec.ts](../tests/e2e/technician/offline-open.spec.ts); [e2e.md](e2e.md), S1); achou ~7 s de espera pelas repetições da consulta do acesso, corrigida ([screens.md](screens.md#decisões)).
- [x] E2E: ciclo de revisão entre as duas interfaces, rejeitar, refazer e aprovar ([review-cycle.spec.ts](../tests/e2e/office/review-cycle.spec.ts); [e2e.md](e2e.md), E1).
- [x] E2E: sessão perdida com envios na fila, entrar de novo manda a fila ([lost-session.spec.ts](../tests/e2e/technician/lost-session.spec.ts); [e2e.md](e2e.md), P3).
- [x] E2E: upload interrompido retoma sem reenviar a foto confirmada nem duplicar ([interrupted-upload.spec.ts](../tests/e2e/technician/interrupted-upload.spec.ts); [e2e.md](e2e.md), P6).
- [x] E2E: dupla enviando sem sinal, um envio e um complemento, nada preso ([pair-offline.spec.ts](../tests/e2e/technician/pair-offline.spec.ts); [e2e.md](e2e.md), P7).
- [x] E2E: membro removido, ao abrir com sinal o aparelho limpa e vai ao login com o aviso ([removed-member.spec.ts](../tests/e2e/technician/removed-member.spec.ts); [e2e.md](e2e.md), P4).
- [x] E2E: aparelho compartilhado, quem entra depois não vê nada de quem saiu ([shared-device.spec.ts](../tests/e2e/technician/shared-device.spec.ts); [e2e.md](e2e.md), S4); achou o cache voltando depois do logout, corrigido ([queue.md](queue.md#decisões)).

## 4. Escritório

- [x] Base: fonte de dados por chave (`VITE_DATA_SOURCE`), API real tipada pela de exemplo, sessão real na moldura, erros das ações por classe.
- [x] Dashboard.
- [x] Clientes e endereços.
- [x] O.S.: criar, editar, atribuir, cancelar, histórico.
- [x] Revisão: aprovar, rejeitar, ciência dos tardios, alertas.
- [x] Empresa, membros e auditoria (owner).
- [x] Pendências do escritório: CEP pelo ViaCEP. Sem tela de importação de clientes e sem email na lista de membros ([screens-office.md](screens-office.md#decisões)).

## 5. Produção

- [x] Manifest final e ícones gerados no build a partir de `public/logo.svg` (`pwa-assets.config.ts`).
- [ ] Trocar `public/logo.svg` (hoje a marca provisória do app) pela logo da Fast, já pedida.
- [ ] Antes do deploy: etapa 1 dos [próximos passos do e2e.md](e2e.md#próximos-passos) (upgrade do Dexie, listas do escritório, retrocompatibilidade da fila, roteiro de campo).
- [ ] Cloudflare Pages ligado ao Supabase de produção.

## Decisões

- **2026-11-19** — Playwright de lado até segunda ordem: sem E2E, e o projeto `browser` do Vitest (que roda no Chromium do Playwright) sai do `npm test` e do `npm run check`, ficando em `npm run test:browser`. *Por quê:* pedido do usuário para entregar as funcionalidades primeiro; instalar e manter o navegador de teste fica para depois.
- **2026-11-19** — Playwright de volta, com as funcionalidades entregues: o projeto `browser` volta ao `npm test` e ao `npm run check`, e começam os E2E. *Por quê:* pedido do usuário.
- **2026-11-19** — Ícones do PWA gerados no build (`@vite-pwa/assets-generator`, pelo `pwaAssets` do plugin) a partir de um arquivo só, `public/logo.svg`; o maskable e o apple-touch levam o fundo da marca e margem para o recorte do Android. *Por quê:* a logo da Fast ainda não chegou; quando chegar, basta trocar o arquivo, sem mexer em tamanhos, manifest ou `<head>`.
