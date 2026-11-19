# E2E e pontos críticos

O que mais custa se falhar, onde está no código, o que já é testado e como testar o resto. Análise de 2026-11-19, do código daqui e dos docs do backend, revisada no mesmo dia depois dos E2E. **⚠️** = achado ainda sem correção.

## Como roda

| Parte | Como |
| --- | --- |
| Testes | `tests/e2e`, `npm run test:e2e`; configuração em [`playwright.config.ts`](../playwright.config.ts) |
| Backend | stack local (`npm run db:start` em `../fast`) com o seed; preparo e conferência direto no banco por [`support/backend.ts`](../tests/e2e/support/backend.ts). Usuário que o teste remove ou tira do aparelho é criado só para ele (`createTechnician`, com a chave de serviço que o `globalSetup` lê do `supabase status`): mexer num usuário do seed derruba os testes em paralelo |
| App | build e `vite preview` na 4173, com o service worker |
| Projetos | `office` (Desktop Chrome) e `technician` (Pixel 7) |
| Worker | bloqueado por padrão ([queue.md](queue.md#service-worker)); liberado nos testes do offline |
| Quando | fora do `npm run check`; antes de commitar o que mexe num fluxo coberto |
| Medições | projeto `measure` (`tests/e2e/measure`), fora da suíte: `MEASURE=1 npx playwright test --project measure --workers 1`; rede de celular emulada pelo CDP do Chromium |

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
| [`technician/removed-member`](../tests/e2e/technician/removed-member.spec.ts) | P4: técnico próprio do teste (usuário pela chave de serviço, vínculo pelo `invite_member`), com um envio na fila sem sinal; o owner o remove. Ao abrir com sinal, vai ao login com o aviso, nada dele fica no Dexie e nada chega ao servidor |
| [`technician/shared-device`](../tests/e2e/technician/shared-device.spec.ts) | S4: o técnico 1 (próprio do teste) deixa um rascunho com foto e sai; o técnico 2 entra no mesmo contexto, não vê a O.S. do 1 (nem pelo link) e nada do 1 fica no Dexie |
| [`technician/logout-pending`](../tests/e2e/technician/logout-pending.spec.ts) | P2: início e envio na fila sem sinal; sair pede confirmação com a contagem de Pendências (2), cancelar não apaga nada, e o envio chega quando o sinal volta |
| [`office/stale-review`](../tests/e2e/office/stale-review.spec.ts) | E2: com a revisão aberta, chega um complemento (pelo banco); aprovar mostra o aviso de recarregar, os botões travam e nada muda no banco; depois de recarregar, o complemento aparece e a aprovação sai |
| [`office/create-order`](../tests/e2e/office/create-order.spec.ts) | E3: o escritório cadastra o cliente com endereço pela tela, abre a O.S. a partir dele (cliente e endereço principal já escolhidos), atribui o técnico e cria; o técnico vê a O.S. em Minhas O.S., com o cliente e o endereço |
| [`office/time-zone`](../tests/e2e/office/time-zone.spec.ts) | E4: o navegador num fuso que está agora em outro dia que o da empresa (UTC+14 ou UTC−11, pela hora em São Paulo); no detalhe da O.S., o prazo de hoje e o de ontem aparecem com o dia da empresa, e só o de ontem fica atrasado |
| [`technician/relogin`](../tests/e2e/technician/relogin.spec.ts) | P3, a janela: técnico próprio com um envio na fila sem sinal sai da conta em outro aparelho (logout global). Com o sinal, a fila para pedindo login e o app fica na interface; "Entrar de novo" em Pendências leva ao login com a fila intacta, e entrar com a mesma conta manda o envio |
| [`technician/refused-submission`](../tests/e2e/technician/refused-submission.spec.ts) | P5: envio feito sem sinal numa O.S. que o escritório cancela. Com o sinal, o rascunho fica em "Precisam de você" com o motivo e o texto, continua ao reabrir, nada chega ao servidor e só sai quando o técnico apaga |

## Perda da prova

O pior caso do produto: serviço feito que nunca chega ao escritório.

| ID | Ponto | Por que pesa | Onde | Hoje | Teste |
| --- | --- | --- | --- | --- | --- |
| P1 | IndexedDB sem `navigator.storage.persist()` | sem o pedido, o armazenamento é "best-effort": com o celular cheio, o Chrome pode apagar a origem inteira (rascunhos, fotos, fila) sem aviso | `offline/persistence.ts`, runtime do técnico | corrigido em 2026-11-19 ([queue.md](queue.md), Q12): pede ao abrir e avisa em Minhas O.S. se negado | unit; o despejo em si só em campo |
| P2 | Logout com itens na fila apaga a prova | decisão do contrato (Q10); o aviso com a contagem é a única proteção | `logout-button.tsx`, `profile-page.tsx` | aceito; E2E desde 2026-11-19 | coberto |
| P3 | "Entre de novo para enviar" sem botão de login | verificado em 2026-11-19 no auth-js 2.119: com a renovação recusada e o token de acesso vencido, ele apaga a sessão, a guarda da rota (`gate.tsx`) leva ao login, e entrar com o mesmo usuário mantém a fila (Q3). Sobra uma janela de até 1 h: com o token de acesso ainda válido pelo relógio do aparelho, a sessão fica, e a única saída visível é o logout, que apaga a fila (P2) | `components/sync.tsx`, `app/pages/gate.tsx` | corrigido em 2026-11-19: "Entrar de novo" em Pendências ([queue.md](queue.md#decisões)); E2E dos dois caminhos | coberto |
| P4 | Remoção do membro apaga tudo, inclusive envios não mandados | remoção por engano antes do sinal perde a prova (offline.md, proteção dos dados) | `app/pages/gate.tsx`, `clearUser` | aceito; E2E desde 2026-11-19 | coberto |
| P5 | Recusa por regra ao voltar o sinal (O.S. cancelada, técnico tirado da O.S.) | o rascunho tem de ficar `refused`, com o motivo, até o técnico apagar (offline.md, recusa definitiva) | `processor.ts` (`refuse`), Pendências | unit; E2E desde 2026-11-19 | coberto |
| P6 | Upload interrompido no meio do envio | a retomada não pode reenviar foto confirmada nem duplicar (Q4) | `sendSubmit` | unit, com API falsa; E2E desde 2026-11-19 | coberto |
| P7 | Dupla enviando sem sinal | o segundo envio vira complemento (04, R4); nenhuma prova pode ficar presa | backend; fila daqui | backend; E2E desde 2026-11-19 | coberto |
| P8 | App atualizado com itens na fila | a versão nova lê prova gravada pela velha: schema do Dexie ou formato do item. Nada foi publicado ainda (o Dexie está na versão 3); a partir do primeiro deploy, cada versão e cada formato de item têm de ler o anterior | `offline/db.ts`, tipos dos itens da fila | sem regra | unit de cada upgrade do Dexie a partir de dados da versão anterior |
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
| D1 | Cada foto custa 3 idas e voltas em série (2 Edge Functions e o PUT), mais o cold start da função | com o RTT alto do 2G, o custo fixo por foto pesa tanto quanto o arquivo | `sendSubmit`; 04 | por design; medido em 2026-11-19 ([Medições](#medições)): o arquivo domina, as idas e voltas são 7% do tempo da foto no 2G | [`measure/photo-cost`](../tests/e2e/measure/photo-cost.spec.ts) |
| D2 | Compressão no thread principal | sem worker ([photos.md](photos.md#decisões)); várias fotos de 12 MP da galeria travam a tela em celular fraco | `photos/compress` | por design | aparelho real |
| D3 | Cache do técnico gravado como um JSON só a cada mudança | cresce com as execuções e fotos de todas as O.S. da lista; e "a cada mudança" é literal: o gravador próprio (`persist.ts`) não espaça as gravações como os do TanStack (1 s), então cada evento do cache das consultas regrava o JSON inteiro | `persist.ts` | aceito no volume esperado | observar |
| D4 | ⚠️ Lista de O.S. do escritório sem paginação | traz todas as O.S. da empresa, com execuções e fotos embutidas; busca, técnico e prazo filtram no front. Cresce com o histórico e, passado `max_rows = 1000` (PostgREST), corta em silêncio: ficam as 1000 mais novas, e a busca não acha as antigas | `officeListOrders` | lacuna | unit do recorte ou E2E com seed volumoso. Correção: paginação e busca no banco |
| D5 | ⚠️ Lista de clientes sem ordem no banco e sem paginação | passado 1000 clientes, o PostgREST devolve 1000 quaisquer; a ordenação e a busca são no front. Cliente some do seletor da O.S. nova e da busca. Pesa se a base da Fast for importada | `officeListClients` | lacuna | idem D4 |
| D6 | Auditoria sem paginação | só os 1000 eventos mais recentes aparecem | `audit_logs` no `supabase.ts` | lacuna menor; vai junto com D4 e D5 (decisão do usuário) | — |

## Escritório

| ID | Ponto | Por que pesa | Onde | Hoje | Teste |
| --- | --- | --- | --- | --- | --- |
| E1 | Ciclo de revisão: rejeitar, o técnico vê o motivo e refaz, aprovar | fecha a O.S. entre as duas interfaces | `office/review`, telas do técnico | E2E desde 2026-11-19 | coberto |
| E2 | Complemento chegando durante a revisão | o backend recusa com `stale_review` (04, R10); a tela trata pela classe de erro | `office/review` | backend; E2E desde 2026-11-19 | coberto |
| E3 | Criar cliente e O.S. pela tela e atribuir | hoje o teste cria direto no banco | `office/clients`, `office/orders` | E2E desde 2026-11-19 | coberto |
| E4 | Fuso do navegador diferente do fuso da empresa | prazo é o fim do dia no fuso da empresa (03, R5); "atrasada" depende dele | `lib/format.ts` | unit; E2E desde 2026-11-19 | coberto |

## Dados no aparelho e acesso

| ID | Ponto | Por que pesa | Onde | Hoje | Teste |
| --- | --- | --- | --- | --- | --- |
| S1 | Abrir o app sem sinal | precache, `NavigationRoute`, acesso guardado e cache de 3 dias; é o começo do dia em campo. Passado 3 dias sem sinal, o cache vence e a lista abre vazia, mas os rascunhos ficam (premissa do backend) | `sw.ts`, `session.ts`, `persist.ts` | E2E desde 2026-11-19. O teste achou ~7 s de "Carregando…": o postgrest-js repetia a consulta do acesso 3 vezes (1, 2 e 4 s) antes de cair no acesso guardado; corrigido ([screens.md](screens.md#decisões)) | coberto |
| S2 | Relógio do aparelho errado | `client_started_at`, `client_submitted_at` e `captured_at` vêm dele e mudam os alertas (`late_delivery`, `gallery_before_start`) | 04 | aceito (os horários do servidor vão junto) | — |
| S3 | Isolamento entre empresas e técnicos | o RLS é a única barreira; o front usa a chave anon | backend | pgTAP no backend | não repetir aqui |
| S4 | Aparelho compartilhado | cache, fila e fotos por usuário (Q3, Q10) | `clearUser`, `persist.ts` | unit; E2E desde 2026-11-19. O teste achou o cache do técnico 1 de volta depois do logout (2 em 4 rodadas): uma gravação do cache no meio do logout, com a sessão ainda dele, depois do `clearUser`; corrigido ([queue.md](queue.md#decisões)) | coberto |
| S5 | Logout encerra a sessão do usuário em todos os aparelhos | o `signOut()` do supabase-js é `scope: 'global'` por padrão: sair num celular derruba a sessão do mesmo técnico nos outros. Lá, a Edge Function passa a responder 401 e a fila para pedindo login (mantém a fila, Q3; mas a janela do P3 vale). Achado no S4 (2026-11-19), porque derrubava os outros testes com o mesmo usuário | `app/session.ts` (`signOutAndWipe`) | global por decisão do usuário (2026-11-19, [queue.md](queue.md#decisões)) | os E2E que saem da conta usam técnico próprio |

## Próximos passos

Revisado em 2026-11-19, com a ordem antiga (P5, S1, E1, P3, P6, P7) toda feita. Ordem: o que bloqueia a produção, depois o que ainda pode perder prova, depois o escritório, depois medir e decidir.

### 1. Antes da produção

| # | Item | Tipo | Por quê |
| --- | --- | --- | --- |
| 1 | P8, upgrade do Dexie | unit (`fake-indexeddb`): abrir o banco gravado em cada versão anterior, subir e conferir rascunhos, fotos e fila | depois do primeiro deploy, um erro aqui perde a prova de todos os aparelhos de uma vez; antes dele, é barato fixar a regra |
| 2 | D4, D5, D6, listas do escritório | correção: paginação, ordem e busca no banco (lista de O.S., de clientes e a auditoria); se precisar de RPC ou índice, entra no contrato do backend primeiro | é o único ⚠️ aberto e corta em silêncio passado 1000; pesa no dia da importação da base da Fast |
| 3 | P9, retrocompatibilidade das RPCs da fila | proposta para a spec do backend (decisão de arquitetura do sistema, vai lá) | sem a regra, um deploy do backend trava (`blocked`) a fila de quem está em campo com a versão velha |
| 4 | Roteiro de campo | doc com o passo a passo para um Android real: Background Sync com o app fechado (T4), aba congelada (T5), despejo do armazenamento (P1), câmera e GPS reais, 2G de verdade (T3, D2) | é o que o Playwright não alcança (ver abaixo); roda uma vez antes do deploy e depois de mudança na fila |

### 2. Prova no aparelho (E2E baratos)

| # | Item | Teste | Por quê |
| --- | --- | --- | --- |
| 5 | ~~P2, logout com fila~~ (feito) | o aviso mostra a contagem certa; cancelar não apaga nada | é a única proteção do caminho que apaga a prova de propósito |
| 6 | ~~P4, membro removido~~ (feito) | removido pelo `remove_member` no banco; ao abrir com sinal, o aparelho limpa e vai ao login com o aviso | confere a ligação gate → `clearUser` → login, que hoje só tem unit |
| 7 | ~~S4, aparelho compartilhado~~ (feito) | o técnico 1 sai, o técnico 2 entra no mesmo contexto e não vê O.S., rascunho nem fila do 1 | o cache e a fila são por usuário só por convenção do código |
| 8 | ~~E2, `stale_review`~~ (feito) | abrir a revisão, chegar um complemento (pelo banco), aprovar: aviso de recarregar, e a aprovação sai depois de recarregar | o escritório aprovaria sem ver a prova nova |

### 3. Escritório

| # | Item | Teste | Por quê |
| --- | --- | --- | --- |
| 9 | ~~E3, cadastro pela tela~~ (feito) | criar cliente e O.S., atribuir; o técnico vê a O.S. em Minhas O.S. | os E2E criam tudo direto no banco: o formulário real nunca roda |
| 10 | ~~E4, fuso~~ (feito) | `timezoneId` diferente do fuso da empresa; o mesmo prazo e o mesmo "atrasada" na tela | prazo é fim do dia no fuso da empresa (03, R5) |

### 4. Medir e decidir

| # | Item | O que | Por quê |
| --- | --- | --- | --- |
| 11 | ~~S5, alcance do logout~~ (decidido: global) | decisão do usuário: `scope: 'local'` (sair só deste aparelho) ou manter o global | aparelho compartilhado e técnico com dois celulares; o global é mais seguro com celular perdido, o local não para a fila do outro aparelho |
| 12 | ~~P3, janela de até 1 h~~ (feito) | decisão do usuário: um "Entrar de novo" no aviso da fila que leva ao login sem apagar nada (Q3 mantém a fila do mesmo usuário) | hoje a única saída visível nessa janela é o logout, que apaga a prova |
| 13 | ~~D1, custo por foto~~ (medido) | [Medições](#medições): o arquivo domina. Próximo: a observabilidade em produção (abaixo) e, se os números do campo forem ruins, decidir o tamanho da foto (F1) | é o envio da prova; sem número do campo, a decisão é no escuro |
| 14 | ~~D6, auditoria~~ (vai com D4 e D5, item 2) | paginação, no mesmo padrão das listas do escritório | lacuna menor: só os 1000 eventos mais recentes |
| 15 | Observabilidade do envio | 1º, sem mudar contrato: consulta no banco por envio (`received_at` − `client_submitted_at`, fotos, `file_size`, `uploaded_at` entre fotos). 2º, se não bastar: o aparelho manda junto as medidas do envio (início do envio, tentativas, bytes), o que muda o contrato do `submit_execution` no backend | o D1 mediu no laboratório; o campo (cold start, perda de pacote, 2G de verdade) só aparece em produção |
| 16 | D3, cache do técnico | observar o tamanho em campo | aceito no volume esperado |

## Medições

### D1, custo por foto (2026-11-19)

[`measure/photo-cost`](../tests/e2e/measure/photo-cost.spec.ts): envio com 3 fotos de galeria de 4000×3000, comprimidas pelo app (F1) para 333 KB em média, contra o stack local. Tempo do sinal de volta até as 3 fotos no banco; os passos são a média por foto.

| Rede (ida e volta, descida/subida) | Por foto | Pedir URL | PUT | Confirmar | Idas e voltas no tempo da foto |
| --- | --- | --- | --- | --- | --- |
| sem limite | 0,4 s | 65 ms | 14 ms | 95 ms | 92% |
| 4G (70 ms, 9/4 Mbit/s) | 1,1 s | 76 ms | 0,8 s | 91 ms | 18% |
| 3G (300 ms, 1,6 Mbit/s/750 kbit/s) | 5,2 s | 0,3 s | 4,0 s | 0,3 s | 14% |
| 2G EDGE (800 ms, 240/120 kbit/s) | 26 s | 1,0 s | 23,8 s | 0,9 s | 7% |

| Leitura | |
| --- | --- |
| O que pesa | o tamanho do arquivo: no 2G, a subida de 333 KB leva 24 s; juntar as URLs numa chamada (contrato do backend) tiraria ~2 s de 26 |
| Escala | 20 fotos: ~9 min no 2G, ~1,7 min no 3G, um item por vez (T3) |
| Fora da medição | o cold start das Edge Functions no hospedado (aqui são locais) e a perda de pacote; os dois aumentam a parte das idas e voltas |
| Alavanca | o tamanho da foto (F1, [photos.md](photos.md)): ~1280 px ou qualidade menor deixaria o arquivo perto da metade e o tempo também |

## Fora do Playwright

| O que | Como |
| --- | --- |
| Background Sync com o app fechado, despejo do armazenamento, aba congelada, câmera e GPS reais, 2G de verdade | roteiro num Android real antes da produção |

## Decisões

- **2026-11-19** — E2E só para o que cruza camadas (tela, fila, worker, banco). Regra isolada fica no unit, e o isolamento do RLS, no pgTAP do backend. *Por quê:* cada regra é testada num lugar só (CLAUDE.md); o E2E custa o stack inteiro e é o único que pega erro de ligação, como a fila parada com o sinal de volta.
