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
| [`office/order-volume`](../tests/e2e/office/order-volume.spec.ts) | D4: empresa própria do teste com 1001 O.S. gravadas pela chave de serviço; a lista do escritório conta as 1001 e a busca acha a nº 1, a mais antiga. As O.S. são apagadas no fim |
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
| P8 | App atualizado com itens na fila | a versão nova lê prova gravada pela velha: schema do Dexie ou formato do item. Nada foi publicado ainda; a partir do primeiro deploy, cada versão e cada formato de item têm de ler o anterior | `offline/db.ts`, tipos dos itens da fila | versões 1 a 3 do Dexie juntadas na 1 em 2026-11-19 ([Decisões](#decisões)); o resto do [Versionamento](#versionamento) está por fazer | unit de cada upgrade do Dexie a partir de dados da versão anterior |
| P9 | Contrato do backend mudando com itens de versões antigas na fila | uma RPC com assinatura nova responde `PGRST202`, e uma Edge Function de foto com corpo ou resposta incompatível falha igual; o item fica `blocked`: não perde, mas trava até o técnico atualizar e tocar em "Tentar agora" | contrato do backend | regra na spec do backend desde 2026-11-19, para as RPCs e as Edge Functions da fila ([princípio "A fila não quebra"](../../fast/docs/spec.md#princípios)) | — |

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
| D3 | Cache do técnico gravado como um JSON só | regravado inteiro a cada gravação | `persist.ts` | medido em 2026-11-19 ([Medições](#medições)): poucas gravações e JSON pequeno, com a lista limitada no servidor às O.S. ativas e às encerradas há até 7 dias; sem ação | [`measure/cache-writes`](../tests/e2e/measure/cache-writes.spec.ts) |
| D4 | Lista de O.S. do escritório sem paginação | trazia todas as O.S. da empresa, com execuções e fotos embutidas; busca, técnico e prazo filtram no front. Passado `max_rows = 1000` (PostgREST), cortava em silêncio: ficavam as 1000 mais novas, e a busca não achava as antigas | `officeListOrders`, [`read-all.ts`](../src/office/api/read-all.ts) | corrigido em 2026-11-19 pela opção A ([Listas do escritório](#listas-do-escritório)): só as colunas da linha e leitura em blocos de 1000 | unit (`readAll`); E2E `order-volume` |
| D5 | Lista de clientes sem ordem no banco e sem paginação | passado 1000 clientes, o PostgREST devolvia 1000 quaisquer; a ordenação e a busca são no front | `officeListClients` | corrigido em 2026-11-19: blocos de 1000, ordem fixa por nome e id | unit (`readAll`) |
| D6 | Auditoria sem paginação | só os 1000 eventos mais recentes apareciam | `officeAudit` | corrigido em 2026-11-19: blocos de 1000, ordem fixa por data e id | unit (`readAll`) |

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

Revisado com o usuário em 2026-11-19. Mapa e estimativa; as correções ficam para uma sessão própria.

| # | Item | Decisão | O que fazer |
| --- | --- | --- | --- |
| 1 | P8, versionamento do app e do backend | dados de hoje são descartáveis: juntar as versões 1 a 3 do Dexie numa só, sem migração (apagar os dados do site nos aparelhos de teste) | squash feito em 2026-11-19; depois, o mapa abaixo ([Versionamento](#versionamento)) vira itens, e cada mudança do Dexie ou do formato de item da fila ganha teste de upgrade (unit, `fake-indexeddb`) |
| 2 | D4, D5, D6, listas do escritório | opção A agora; a B continua de pé para quando o volume pedir ([Decisões](#decisões), 2026-11-19) | opção A feita em 2026-11-19 ([Listas do escritório](#listas-do-escritório)) |
| 3 | P9, retrocompatibilidade do que a fila chama (RPCs e Edge Functions de foto) | aprovado: vai como regra na spec do backend (`../fast/docs/spec.md`) | regra escrita em 2026-11-19 ([princípios](../../fast/docs/spec.md#princípios)); a versão mínima do [Versionamento](#versionamento) continua por fazer |
| 4 | Campo em Android emulado | depois (usuário, 2026-11-19): por enquanto, só corrigir o que está pela metade | plano guardado em [Android emulado](#android-emulado) |
| 5 | E2E no CI | depois (usuário, 2026-11-19) | GitHub Actions: `supabase start` do `../fast`, build, `npm run test:e2e` a cada push |

#### Versionamento

Mapa do que falta para app e backend evoluírem cada um no seu ritmo, com celulares que ficam até 3 dias sem sinal e sem atualizar.

| Peça | Hoje | Proposta |
| --- | --- | --- |
| Versão do app | não existe; o PWA só avisa que há versão nova ("Atualizar", [queue.md](queue.md#service-worker)) | número de versão no build (`define` do Vite), mostrado no Perfil do técnico e do escritório |
| Versão nas chamadas | o backend não sabe qual app chama | header `x-client-version` no cliente do Supabase (página e worker); as Edge Functions e os logs passam a ver a versão |
| Versão mínima | não existe | o backend publica a versão mínima aceita (tabela de configuração ou RPC); abaixo dela, o app mostra "Atualize o app" e força a atualização do worker, sem apagar a fila |
| Mudança de RPC ou Edge Function usada pela fila | regra na spec do backend (P9); sem ela, `PGRST202` deixaria o item `blocked` | P9: mudança só aditiva; mudança que quebra vira função nova (`_v2`) e a antiga fica pelo prazo offline (3 dias) mais o ciclo de atualização; aí sobe a versão mínima |
| Formato dos itens da fila e do Dexie | sem versão | campo de versão no item; upgrade do Dexie com teste a partir dos dados da versão anterior |
| No celular | só o aviso de versão nova | Perfil com a versão; aviso de atualização obrigatória quando abaixo da mínima |

#### Listas do escritório

Volume informado: ~500 clientes; no mínimo 4 O.S. por dia (~120 por mês). Revisado em 2026-11-19 a partir do código. Opção A feita no mesmo dia: a tabela abaixo é o estado de antes.

| Lista | Antes da opção A | Quando doía |
| --- | --- | --- |
| D4, O.S. | pede ao banco todas as O.S. da empresa (status filtra no banco; busca, técnico, prazo e "sem técnico" na tela) e pagina na tela, 15 por página; cada linha traz execuções e fotos, mas mostra só número, título, status, prioridade, tipo, técnicos e prazo | o corte de 1000 (`max_rows`) em ~8 meses: as mais antigas somem da lista e da busca, sem aviso (o link direto e o dashboard seguem certos); o peso, ~1 MB comprimido com 1000 O.S., incomoda mas não trava |
| D5, clientes | todos, com endereços e o status das O.S. de cada um; ordem e busca na tela | só passado 1000 clientes; com ~500, nada |
| D6, auditoria | todos os eventos | quase nunca: só empresa, membros e papéis (05, R5) |

| Opção | O que muda | Resolve | Tamanho |
| --- | --- | --- | --- |
| **A, só front (decidida para agora)** | a lista de O.S. pede só as colunas da linha (detalhe, revisão e dashboard seguem com o select completo); uma leitura em blocos de 1000 com ordem fixa (`range`), usada pelas listas de O.S., clientes e auditoria | o corte nas três listas; o peso cai para ~300 bytes por O.S. (~450 KB por ano); filtros, busca e paginação seguem na tela | ~1 a 2 h de agente |
| B, view no backend | view enxuta `security_invoker` da lista (cliente e técnicos juntos), filtros, busca e paginação no banco; tabela paginada pelo servidor | qualquer escala | ~3 a 4 h, nos dois repositórios; quando o volume pedir (dezenas de milhares de O.S.); não descartada |

Descartado: filtros "em dois passos" só no front (ids na URL). O `postgrest-js` corta a URL em ~8000 caracteres; com ~200 O.S. de um técnico, o filtro quebraria.

#### Android emulado

Não é loucura: o emulador do Android roda o Chrome de verdade, com o service worker, o Background Sync e o Doze do sistema. O controle é pelo CDP (`adb forward tcp:9222 localabstract:chrome_devtools_remote` e `chromium.connectOverCDP` do Playwright, API estável; o `_android` do Playwright é experimental e fica fora) e pelo `adb` para o sistema.

| Cenário | Como no emulador | Prova |
| --- | --- | --- |
| Envio com o app fechado (T4) | envio sem sinal (`adb shell cmd connectivity airplane-mode enable`), fecha a aba pelo CDP, devolve o sinal | o envio chega ao banco sem abrir o app |
| Celular parado (T5, Doze) | `adb shell dumpsys deviceidle force-idle` com itens na fila; depois `unforce` e o sinal | o envio chega quando o sistema libera |
| Rede ruim de verdade (T3, D1) | console do emulador: `network speed edge`, `network delay gprs` | tempos do envio comparáveis às [Medições](#medições) |
| Câmera e GPS | câmera virtual do emulador; `adb emu geo fix` | foto com `captured_at` e localização no banco |
| Armazenamento (P1) | encher o disco do emulador com itens na fila | o pedido de armazenamento persistente segura os dados |

| Custo e limite | |
| --- | --- |
| Montagem | SDK, imagem do Android com Chrome, KVM, scripts: ~1 a 2 dias; começar por um spike de meio dia só com o envio de app fechado |
| Rodada | minutos (boot do emulador); local antes de release, ou no CI (runners Linux com KVM) |
| Fica para o celular real | economia de bateria dos fabricantes (Xiaomi, Samsung matam o Chrome em segundo plano), câmera e rádio de verdade, instalação do PWA: roteiro curto, ~15 min, antes do deploy |

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
| 14 | ~~D6, auditoria~~ (feito com D4 e D5, item 2) | paginação, no mesmo padrão das listas do escritório | lacuna menor: só os 1000 eventos mais recentes |
| 15 | Observabilidade do envio | 1º, sem mudar contrato: consulta no banco por envio (`received_at` − `client_submitted_at`, fotos, `file_size`, `uploaded_at` entre fotos). 2º, se não bastar: o aparelho manda junto as medidas do envio (início do envio, tentativas, bytes), o que muda o contrato do `submit_execution` no backend | o D1 mediu no laboratório; o campo (cold start, perda de pacote, 2G de verdade) só aparece em produção |
| 16 | ~~D3, cache do técnico~~ (medido, sem ação) | [Medições](#medições): 4 gravações de até 20 KB num fluxo inteiro; espaçar não mudaria nada | a lista do cache não cresce com o histórico (filtro de 7 dias no servidor) |

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

### D3, gravações do cache do técnico (2026-11-19)

[`measure/cache-writes`](../tests/e2e/measure/cache-writes.spec.ts): técnico com 5 O.S.; abre a lista, duas O.S., inicia uma, põe uma foto e envia com sinal (a fila recarrega as leituras), volta à lista.

| Medida | Valor |
| --- | --- |
| Gravações do JSON no fluxo inteiro | 4 (o TanStack chamou o gravador 4 vezes; nenhuma rajada) |
| Total gravado | 78 KB; o último JSON, 19,5 KB |
| Peso por consulta | lista 9,6 KB (5 O.S., ~2 KB cada); cada O.S. aberta 2,5 a 3 KB; sessão 0,5 KB |
| Teto | a lista traz só as O.S. ativas e as encerradas há até 7 dias (`reads.ts`); o cache segue a carga de trabalho, não o histórico |

## Fora do Playwright

| O que | Como |
| --- | --- |
| Background Sync com o app fechado, aba congelada (Doze), câmera e GPS, rede ruim, armazenamento cheio | Android emulado ([plano](#android-emulado)) |
| Economia de bateria dos fabricantes, câmera e rádio de verdade, instalação do PWA | roteiro curto num celular real antes do deploy |

## Decisões

- **2026-11-19** — E2E só para o que cruza camadas (tela, fila, worker, banco). Regra isolada fica no unit, e o isolamento do RLS, no pgTAP do backend. *Por quê:* cada regra é testada num lugar só (CLAUDE.md); o E2E custa o stack inteiro e é o único que pega erro de ligação, como a fila parada com o sinal de volta.
- **2026-11-19** — Listas do escritório (D4, D5, D6): opção A agora (lista de O.S. com select enxuto e leitura em blocos de 1000 com ordem fixa nas listas de O.S., clientes e auditoria), sem mudar o backend. A opção B (view no backend com filtros, busca e paginação no banco) não foi descartada: é o caminho quando o volume crescer. *Por quê:* com ~500 clientes e ~120 O.S. por mês, a A tira o corte silencioso de 1000 e o peso da lista por anos com o menor custo; a B só compensa em escala.
- **2026-11-19** — Dexie: as versões 1 a 3 viram uma versão 1 com as sete tabelas, sem migração (P8). Os aparelhos de teste devem apagar os dados do site: o Dexie 4 ainda abre o banco antigo (mesmo schema, versão nativa 30, dados mantidos), mas o upgrade da próxima versão (`version(2)`, nativa 20) não rodaria nele. *Por quê:* nada foi publicado e os dados de hoje são descartáveis; o primeiro deploy começa de um schema só, e cada mudança depois dele ganha teste de upgrade.
- **2026-11-19** — Listas do escritório, opção A feita: `officeListOrders` com as colunas da linha e os ids dos complementos tardios sem ciência (filtrados no banco) para o selo; aguardando aprovação com o select completo em `officePendingOrders`; O.S., clientes e auditoria lidas por `readAll` em blocos de 1000 (`range`), com ordem fixa. *Por quê:* o selo de tardios fica por decisão do usuário; a fila de revisão precisa das tentativas; sem ordem fixa, os blocos podem repetir ou pular linhas.
- **2026-11-19** — O E2E `order-volume` grava as 1001 O.S. de uma vez e as apaga no fim. *Por quê:* logo depois da carga, antes do autoanalyze, a lista passava do `statement_timeout` de 8 s (57014): a policy de leitura do técnico em `clients` era um `exists` correlacionado que varria as O.S. de cada cliente lido (40 s no banco). Corrigido no backend com as policies de leitura por conjunto ([03](../../fast/docs/modules/03-service-orders.md#decisões)); a mesma lista leva ~7 ms com estatísticas velhas, então o teste não roda `analyze`. A limpeza fica: sem ela, cada rodada deixava 1001 O.S. no banco local.
