# E2E e pontos críticos

O que mais custa se falhar, onde está no código, o que já é testado e como testar o resto. Análise de 2026-11-19, do código daqui e dos docs do backend. **⚠️** = achado ainda sem correção; **(verificar)** = suspeita que o primeiro teste confirma ou descarta.

## Como roda

| Parte | Como |
| --- | --- |
| Testes | `tests/e2e`, `npm run test:e2e`; configuração em [`playwright.config.ts`](../playwright.config.ts) |
| Backend | stack local (`npm run db:start` em `../fast`) com o seed; preparo e conferência direto no banco por [`support/backend.ts`](../tests/e2e/support/backend.ts) |
| App | build e `vite preview` na 4173, com o service worker |
| Projetos | `office` (Desktop Chrome) e `technician` (Pixel 7) |
| Worker | bloqueado por padrão ([queue.md](queue.md#service-worker)); liberado nos testes do offline |
| Quando | fora do `npm run check`; antes de commitar o que mexe num fluxo coberto |

## Cobertos

| Teste | Prova |
| --- | --- |
| [`office/login`](../tests/e2e/office/login.spec.ts) | o gerente entra e cai no dashboard |
| [`office/review-cycle`](../tests/e2e/office/review-cycle.spec.ts) | E1: com o celular do técnico ao lado (contexto Pixel 7), o escritório rejeita com o motivo; o técnico vê o motivo e envia de novo; o escritório vê a tentativa nova com a anterior guardada e aprova; o técnico vê a O.S. aprovada. No banco: 2 tentativas (rejeitada com o comentário, aprovada) |
| [`technician/login`](../tests/e2e/technician/login.spec.ts) | o técnico entra e cai em Minhas O.S. |
| [`technician/offline-execution`](../tests/e2e/technician/offline-execution.spec.ts) | início e envio sem sinal, com foto da câmera e da galeria. Depois de uma espera longa, o sinal volta e o envio chega em até 5 s: uma execução, 2 fotos, nada repetido ao reabrir |
| [`technician/offline-open`](../tests/e2e/technician/offline-open.spec.ts) | S1: login e lista com sinal; sem sinal, recarregar direto numa O.S. mostra a O.S. em até 5 s, e a lista também abre |
| [`technician/lost-session`](../tests/e2e/technician/lost-session.spec.ts) | P3: envio na fila sem sinal; a sessão guardada vence e a renovação é recusada. Ao abrir com sinal, vai ao login com a fila intacta, e entrar de novo com o mesmo usuário manda o envio |
| [`technician/interrupted-upload`](../tests/e2e/technician/interrupted-upload.spec.ts) | P6: envio com sinal e 2 fotos; o 1º PUT da 2ª foto cai (`context.route`). A retomada chega sozinha: 1 execução, 2 fotos, a 1ª enviada uma vez e a 2ª duas |
| [`technician/pair-offline`](../tests/e2e/technician/pair-offline.spec.ts) | P7: a dupla envia sem sinal, cada um no seu celular (dois contextos), e os dois voltam ao sinal juntos. No banco: uma tentativa e um complemento dela, 2 fotos; as Pendências dos dois ficam vazias |
| [`technician/refused-submission`](../tests/e2e/technician/refused-submission.spec.ts) | P5: envio feito sem sinal numa O.S. que o escritório cancela. Com o sinal, o rascunho fica em "Precisam de você" com o motivo e o texto, continua ao reabrir, nada chega ao servidor e só sai quando o técnico apaga |

## Perda da prova

O pior caso do produto: serviço feito que nunca chega ao escritório.

| ID | Ponto | Por que pesa | Onde | Hoje | Teste |
| --- | --- | --- | --- | --- | --- |
| P1 | IndexedDB sem `navigator.storage.persist()` | sem o pedido, o armazenamento é "best-effort": com o celular cheio, o Chrome pode apagar a origem inteira (rascunhos, fotos, fila) sem aviso | `offline/persistence.ts`, runtime do técnico | corrigido em 2026-11-19 ([queue.md](queue.md), Q12): pede ao abrir e avisa em Minhas O.S. se negado | unit; o despejo em si só em campo |
| P2 | Logout com itens na fila apaga a prova | decisão do contrato (Q10); o aviso com a contagem é a única proteção | `logout-button.tsx`, `profile-page.tsx` | aceito | E2E barato: o aviso mostra a contagem certa e cancelar não apaga nada |
| P3 | "Entre de novo para enviar" sem botão de login | verificado em 2026-11-19 no auth-js 2.119: com a renovação recusada e o token de acesso vencido, ele apaga a sessão, a guarda da rota (`gate.tsx`) leva ao login, e entrar com o mesmo usuário mantém a fila (Q3). Sobra uma janela de até 1 h: com o token de acesso ainda válido pelo relógio do aparelho, a sessão fica, e a única saída visível é o logout, que apaga a fila (P2) | `components/sync.tsx`, `gate.tsx` | unit; E2E desde 2026-11-19 (o caminho que mantém a fila); a janela de 1 h segue como risco menor | coberto |
| P4 | Remoção do membro apaga tudo, inclusive envios não mandados | remoção por engano antes do sinal perde a prova (offline.md, proteção dos dados) | `gate.tsx`, `clearUser` | aceito | E2E: removido, ao abrir com sinal o aparelho limpa e vai ao login com o aviso |
| P5 | Recusa por regra ao voltar o sinal (O.S. cancelada, técnico tirado da O.S.) | o rascunho tem de ficar `refused`, com o motivo, até o técnico apagar (offline.md, recusa definitiva) | `processor.ts` (`refuse`), Pendências | unit; E2E desde 2026-11-19 | coberto |
| P6 | Upload interrompido no meio do envio | a retomada não pode reenviar foto confirmada nem duplicar (Q4) | `sendSubmit` | unit, com API falsa; E2E desde 2026-11-19 | coberto |
| P7 | Dupla enviando sem sinal | o segundo envio vira complemento (04, R4); nenhuma prova pode ficar presa | backend; fila daqui | backend; E2E desde 2026-11-19 | coberto |
| P8 | App atualizado com itens na fila | a versão nova lê prova gravada pela velha: schema do Dexie ou formato do item. Ex.: itens anteriores ao `waitingFor` (2026-11-19) ficam sem o campo e só voltam pelo timer | `offline/db.ts` | sem regra | unit de cada upgrade do Dexie a partir de dados da versão anterior |
| P9 | Contrato do backend mudando com itens de versões antigas na fila | uma RPC com assinatura nova responde `PGRST202` e o item fica `blocked`: não perde, mas trava até o técnico atualizar e tocar em "Tentar agora" | contrato do backend | sem regra | sugestão para a spec do backend: RPC usada pela fila muda de forma retrocompatível por pelo menos o prazo offline (3 dias) mais o ciclo de atualização |

## Fila parada ou atrasada

| ID | Ponto | Por que pesa | Onde | Hoje | Teste |
| --- | --- | --- | --- | --- | --- |
| T1 | Sinal de volta sem tentar nada | envio parado com sinal no celular | `wakeNetworkWaits` (Q7) | corrigido em 2026-11-19 | E2E (`online`); unit (`sync` e respostas HTTP) |
| T2 | `refreshSession` da fila sem timeout | RPC, Edge Function e PUT tinham timeout só pelo sinal, que não chega à busca do token, e a renovação não tinha nenhum (o `fetch` do auth-js não tem). Uma conexão pendurada segurava a passada e o lock | `supabase-api.ts`, `supabase-fetch.ts` | corrigido em 2026-11-19 ([queue.md](queue.md#decisões)) | unit |
| T3 | Um item por vez no aparelho (Q2) | uma O.S. com 20 fotos em 2G segura as outras | `processor.ts` | por design | medir em campo |
| T4 | Background Sync com o app fechado | o Chrome tenta o `sync` poucas vezes, com espera própria; esgotado, só a página manda (o app tem de abrir) | `sw.ts` | unit | campo; o Playwright não simula |
| T5 | Aba congelada pelo Android em segundo plano | a fila da página para; só o `sync` do worker cobre | `runner.ts` | — | campo |
| T6 | Celular "conectado" sem dados | o `online` não dispara; só a resposta HTTP e o timer (até 1 min) acordam a fila | `supabase-fetch.ts` | unit | — |
| T7 | Envio com sinal avisava "Sem sinal: o envio entrou na fila" | o `submit` real sempre enfileira (Q4) e devolve `'queued'`, e a tela escolhia o aviso por esse retorno. Achado no E1 | `derive.ts` (`sendNotice`), `execution-page.tsx`, `supplement-page.tsx` | corrigido em 2026-11-19: com sinal, "Enviando…" | unit; o E1 confere o aviso |

## Gargalos

| ID | Ponto | Por que pesa | Onde | Hoje | Teste |
| --- | --- | --- | --- | --- | --- |
| D1 | Cada foto custa 3 idas e voltas em série (2 Edge Functions e o PUT), mais o cold start da função | com o RTT alto do 2G, o custo fixo por foto pesa tanto quanto o arquivo | `sendSubmit`; 04 | por design | medir com `Network.emulateNetworkConditions` (CDP do Chromium). Melhoria possível: pedir as URLs de várias fotos numa chamada (contrato do backend) |
| D2 | Compressão no thread principal | sem worker ([photos.md](photos.md#decisões)); várias fotos de 12 MP da galeria travam a tela em celular fraco | `photos/compress` | por design | aparelho real |
| D3 | Cache do técnico gravado como um JSON só a cada mudança | cresce com as execuções e fotos de todas as O.S. da lista | `persist.ts` | aceito no volume esperado | observar |
| D4 | ⚠️ Lista de O.S. do escritório sem paginação | traz todas as O.S. da empresa, com execuções e fotos embutidas; busca, técnico e prazo filtram no front. Cresce com o histórico e, passado `max_rows = 1000` (PostgREST), corta em silêncio: ficam as 1000 mais novas, e a busca não acha as antigas | `officeListOrders` | lacuna | unit do recorte ou E2E com seed volumoso. Correção: paginação e busca no banco |
| D5 | ⚠️ Lista de clientes sem ordem no banco e sem paginação | passado 1000 clientes, o PostgREST devolve 1000 quaisquer; a ordenação e a busca são no front. Cliente some do seletor da O.S. nova e da busca. Pesa se a base da Fast for importada | `officeListClients` | lacuna | idem D4 |
| D6 | Auditoria sem paginação | só os 1000 eventos mais recentes aparecem | `audit_logs` no `supabase.ts` | lacuna menor | — |

## Escritório

| ID | Ponto | Por que pesa | Onde | Hoje | Teste |
| --- | --- | --- | --- | --- | --- |
| E1 | Ciclo de revisão: rejeitar, o técnico vê o motivo e refaz, aprovar | fecha a O.S. entre as duas interfaces | `office/review`, telas do técnico | E2E desde 2026-11-19 | coberto |
| E2 | Complemento chegando durante a revisão | o backend recusa com `stale_review` (04, R10); a tela trata pela classe de erro | `office/review` | backend | E2E: complemento entre abrir e aprovar |
| E3 | Criar cliente e O.S. pela tela e atribuir | hoje o teste cria direto no banco | `office/clients`, `office/orders` | sem teste | E2E |
| E4 | Fuso do navegador diferente do fuso da empresa | prazo é o fim do dia no fuso da empresa (03, R5); "atrasada" depende dele | `lib/format.ts` | unit | E2E barato: `timezoneId` diferente do fuso da empresa, mesmo prazo na tela |

## Dados no aparelho e acesso

| ID | Ponto | Por que pesa | Onde | Hoje | Teste |
| --- | --- | --- | --- | --- | --- |
| S1 | Abrir o app sem sinal | precache, `NavigationRoute`, acesso guardado e cache de 3 dias; é o começo do dia em campo. Passado 3 dias sem sinal, o cache vence e a lista abre vazia, mas os rascunhos ficam (premissa do backend) | `sw.ts`, `session.ts`, `persist.ts` | E2E desde 2026-11-19. O teste achou ~7 s de "Carregando…": o postgrest-js repetia a consulta do acesso 3 vezes (1, 2 e 4 s) antes de cair no acesso guardado; corrigido ([screens.md](screens.md#decisões)) | coberto |
| S2 | Relógio do aparelho errado | `client_started_at`, `client_submitted_at` e `captured_at` vêm dele e mudam os alertas (`late_delivery`, `gallery_before_start`) | 04 | aceito (os horários do servidor vão junto) | — |
| S3 | Isolamento entre empresas e técnicos | o RLS é a única barreira; o front usa a chave anon | backend | pgTAP no backend | não repetir aqui |
| S4 | Aparelho compartilhado | cache, fila e fotos por usuário (Q3, Q10) | `clearUser`, `persist.ts` | unit | E2E barato: o técnico 1 sai, o técnico 2 entra e não vê nada do 1 |

## Ordem sugerida

| # | E2E | Por quê |
| --- | --- | --- |
| 1 | ~~P5, recusa por regra~~ (feito) | é o exemplo do offline.md, e a prova não pode sumir |
| 2 | ~~S1, abrir sem sinal~~ (feito) | é o começo do dia em campo |
| 3 | ~~E1, ciclo de revisão~~ (feito) | fecha a O.S. |
| 4 | ~~P3, sessão perdida com fila~~ (feito) | garante que o caminho que mantém a fila continua assim |
| 5 | ~~P6, upload interrompido~~ (feito) | retomada sem duplicar |
| 6 | ~~P7, dupla~~ (feito) | dois celulares voltando ao sinal juntos |

Correções fora do E2E, por decisão do usuário: D4, D5 (P1 e T2 corrigidos em 2026-11-19).

## Fora do Playwright

| O que | Como |
| --- | --- |
| Background Sync com o app fechado, despejo do armazenamento, aba congelada, câmera e GPS reais, 2G de verdade | roteiro num Android real antes da produção |

## Decisões

- **2026-11-19** — E2E só para o que cruza camadas (tela, fila, worker, banco). Regra isolada fica no unit, e o isolamento do RLS, no pgTAP do backend. *Por quê:* cada regra é testada num lugar só (CLAUDE.md); o E2E custa o stack inteiro e é o único que pega erro de ligação, como a fila parada com o sinal de volta.
