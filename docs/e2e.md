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
| Banco local | cresce a cada rodada: os testes criam O.S., clientes e usuários e não apagam (só o `order-volume` limpa as 1001 O.S. dele). Com o banco inchado (~7 mil O.S. em 2026-11-19), os testes do técnico falharam ao acaso, com avisos que não apareciam em 5 s. Suíte instável sem motivo no código: `npm run db:reset` em `../fast` e rodar de novo |
| Estado global | nenhum teste muda o que vale para todos no banco (`app_settings`, o seed), porque os testes rodam em paralelo: troca-se a resposta só na página, com `page.route` (ver `update-required`). Usuário que sai da conta ou é removido é criado só para o teste (`createTechnician`) |
| Chamadas do worker | no Chromium, `context.on('request')` vê também as requisições do service worker (`page.on`, não) |

## Cobertos

| Teste | Prova |
| --- | --- |
| [`office/login`](../tests/e2e/office/login.spec.ts) | o gerente entra e cai no dashboard |
| [`office/review-cycle`](../tests/e2e/office/review-cycle.spec.ts) | E1: com o celular do técnico ao lado (contexto Pixel 7), o escritório rejeita com o motivo; o técnico vê o motivo e envia de novo; o escritório vê a tentativa nova com a anterior guardada e aprova; o técnico vê a O.S. aprovada. No banco: 2 tentativas (rejeitada com o comentário, aprovada) |
| [`technician/login`](../tests/e2e/technician/login.spec.ts) | o técnico entra e cai em Minhas O.S. |
| [`technician/offline-execution`](../tests/e2e/technician/offline-execution.spec.ts) | início e envio sem sinal, com foto da câmera e da galeria. Depois de uma espera longa, o sinal volta e o envio chega em até 5 s: uma execução, 2 fotos, nada repetido ao reabrir. Toda chamada à API do Supabase, da página e do worker, leva o `x-client-version` |
| [`technician/offline-open`](../tests/e2e/technician/offline-open.spec.ts) | S1: login e lista com sinal; sem sinal, recarregar direto numa O.S. mostra a O.S. em até 5 s, e a lista também abre |
| [`technician/lost-session`](../tests/e2e/technician/lost-session.spec.ts) | P3: envio na fila sem sinal; a sessão guardada vence e a renovação é recusada. Ao abrir com sinal, vai ao login com a fila intacta, e entrar de novo com o mesmo usuário manda o envio |
| [`technician/interrupted-upload`](../tests/e2e/technician/interrupted-upload.spec.ts) | P6: envio com sinal e 2 fotos; o 1º PUT da 2ª foto cai (`context.route`). A retomada chega sozinha: 1 execução, 2 fotos, a 1ª enviada uma vez e a 2ª duas |
| [`technician/pair-offline`](../tests/e2e/technician/pair-offline.spec.ts) | P7: a dupla envia sem sinal, cada um no seu celular (dois contextos), e os dois voltam ao sinal juntos. No banco: uma tentativa e um complemento dela, 2 fotos; as Pendências dos dois ficam vazias |
| [`technician/removed-member`](../tests/e2e/technician/removed-member.spec.ts) | P4: técnico próprio do teste (usuário pela chave de serviço, vínculo pelo `invite_member`), com um envio na fila sem sinal; o owner o remove. Ao abrir com sinal, vai ao login com o aviso, nada dele fica no Dexie e nada chega ao servidor |
| [`technician/shared-device`](../tests/e2e/technician/shared-device.spec.ts) | S4: o técnico 1 (próprio do teste) deixa um rascunho com foto e sai; o técnico 2 entra na mesma página, sem recarregar, e não vê a O.S. do 1: nem da memória (com a leitura das O.S. sem resposta), nem pelo link; nada do 1 fica no Dexie nem no cache do 2 |
| [`technician/logout-pending`](../tests/e2e/technician/logout-pending.spec.ts) | P2: início e envio na fila sem sinal; sair pede confirmação com a contagem de Pendências (2), cancelar não apaga nada, e o envio chega quando o sinal volta |
| [`office/stale-review`](../tests/e2e/office/stale-review.spec.ts) | E2: com a revisão aberta, chega um complemento (pelo banco); aprovar mostra o aviso de recarregar, os botões travam e nada muda no banco; depois de recarregar, o complemento aparece e a aprovação sai |
| [`office/create-order`](../tests/e2e/office/create-order.spec.ts) | E3: o escritório cadastra o cliente com endereço pela tela, abre a O.S. a partir dele (cliente e endereço principal já escolhidos), atribui o técnico e cria; o técnico vê a O.S. em Minhas O.S., com o cliente e o endereço |
| [`office/time-zone`](../tests/e2e/office/time-zone.spec.ts) | E4: o navegador num fuso que está agora em outro dia que o da empresa (UTC+14 ou UTC−11, pela hora em São Paulo); no detalhe da O.S., o prazo de hoje e o de ontem aparecem com o dia da empresa, e só o de ontem fica atrasado |
| [`office/edit-conflict`](../tests/e2e/office/edit-conflict.spec.ts) | E5: com a edição da O.S. aberta, o técnico grava os materiais (pelo banco); salvar mostra os dois textos e não grava nada, nem o título (`update_order` atômica); salvar sem escolher continua sem gravar; escolhido o texto do escritório, título e materiais saem juntos |
| [`technician/relogin`](../tests/e2e/technician/relogin.spec.ts) | P3, a janela: técnico próprio com um envio na fila sem sinal sai da conta em outro aparelho (logout global). Com o sinal, a fila para pedindo login e o app fica na interface; "Entrar de novo" em Pendências leva ao login com a fila intacta, e entrar com a mesma conta manda o envio |
| [`office/order-volume`](../tests/e2e/office/order-volume.spec.ts) | D4: empresa própria do teste com 1001 O.S. gravadas pela chave de serviço; a lista do escritório conta as 1001 e a busca acha a nº 1, a mais antiga. As O.S. são apagadas no fim |
| [`technician/update-required`](../tests/e2e/technician/update-required.spec.ts) | versão mínima: com a leitura de `app_settings` trocada só na página, o app fechado sem sinal reabre em "Atualize o app", o início feito sem sinal fica no Dexie e nada sai; com a versão nova, atualizar recarrega e a fila manda o início |
| [`technician/refused-submission`](../tests/e2e/technician/refused-submission.spec.ts) | P5: envio feito sem sinal numa O.S. de que o escritório tira o técnico. Com o sinal, o rascunho fica em "Precisam de você" com o motivo e o texto, e o cartão ainda diz a O.S. e o cliente, avisa que ela saiu do aparelho e não tem "Abrir"; continua ao reabrir, nada chega ao servidor e só sai quando o técnico apaga |
| [`technician/cancelled-submission`](../tests/e2e/technician/cancelled-submission.spec.ts) | P5, O.S. cancelada (04, R19): envio feito sem sinal numa O.S. que o escritório cancela. Com o sinal, chega como tentativa `voided` com a foto, a O.S. continua cancelada e Pendências fica vazia |

## Perda da prova

O pior caso do produto: serviço feito que nunca chega ao escritório.

| ID | Ponto | Por que pesa | Onde | Hoje | Teste |
| --- | --- | --- | --- | --- | --- |
| P1 | IndexedDB sem `navigator.storage.persist()` | sem o pedido, o armazenamento é "best-effort": com o celular cheio, o Chrome pode apagar a origem inteira (rascunhos, fotos, fila) sem aviso | `offline/persistence.ts`, runtime do técnico | corrigido em 2026-11-19 ([queue.md](queue.md), Q12): pede ao abrir e avisa em Minhas O.S. se negado | unit; o despejo em si só em campo |
| P2 | Logout com itens na fila apaga a prova | decisão do contrato (Q10); o aviso com a contagem é a única proteção | `logout-button.tsx`, `profile-page.tsx` | aceito; E2E desde 2026-11-19 | coberto |
| P3 | "Entre de novo para enviar" sem botão de login | verificado em 2026-11-19 no auth-js 2.119: com a renovação recusada e o token de acesso vencido, ele apaga a sessão, a guarda da rota (`gate.tsx`) leva ao login, e entrar com o mesmo usuário mantém a fila (Q3). Sobra uma janela de até 1 h: com o token de acesso ainda válido pelo relógio do aparelho, a sessão fica, e a única saída visível é o logout, que apaga a fila (P2) | `components/sync.tsx`, `app/pages/gate.tsx` | corrigido em 2026-11-19: "Entrar de novo" em Pendências ([queue.md](decisions.md#fila-offline)); E2E dos dois caminhos | coberto |
| P4 | Remoção do membro apaga tudo, inclusive envios não mandados | remoção por engano antes do sinal perde a prova (offline.md, proteção dos dados) | `app/pages/gate.tsx`, `clearUser` | aceito; E2E desde 2026-11-19 | coberto |
| P5 | Recusa por regra ao voltar o sinal (técnico tirado da O.S.; a O.S. cancelada deixou de recusar o envio em 2026-11-24, 04 R19) | o rascunho tem de ficar `refused`, com o motivo, até o técnico apagar (offline.md, recusa definitiva) | `processor.ts` (`refuse`), Pendências | unit; E2E desde 2026-11-19 | coberto |
| P6 | Upload interrompido no meio do envio | a retomada não pode reenviar foto confirmada nem duplicar (Q4) | `sendSubmit` | unit, com API falsa; E2E desde 2026-11-19 | coberto |
| P7 | Dupla enviando sem sinal | o segundo envio vira complemento (04, R4); nenhuma prova pode ficar presa | backend; fila daqui | backend; E2E desde 2026-11-19 | coberto |
| P8 | App atualizado com itens na fila | a versão nova lê prova gravada pela velha: schema do Dexie ou formato do item. Nada foi publicado ainda; a partir do primeiro deploy, cada versão e cada formato de item têm de ler o anterior | `offline/db.ts`, tipos dos itens da fila | versões 1 a 3 do Dexie juntadas na 1 em 2026-11-19 ([Decisões](decisions.md#e2e)); formato no item da fila desde o mesmo dia ([queue.md](queue.md), Q13); a regra de upgrade com teste vale a partir do primeiro deploy | unit de cada upgrade do Dexie a partir de dados da versão anterior |
| P9 | Contrato do backend mudando com itens de versões antigas na fila | uma RPC com assinatura nova responde `PGRST202`, e uma Edge Function de foto com corpo ou resposta incompatível falha igual; o item fica `blocked`: não perde, mas trava até o técnico atualizar e tocar em "Tentar agora" | contrato do backend | regra na spec do backend desde 2026-11-19, para as RPCs e as Edge Functions da fila ([princípio "A fila não quebra"](../../fast/docs/spec.md#princípios)) | — |

## Fila parada ou atrasada

| ID | Ponto | Por que pesa | Onde | Hoje | Teste |
| --- | --- | --- | --- | --- | --- |
| T1 | Sinal de volta sem tentar nada | envio parado com sinal no celular | `wakeNetworkWaits` (Q7) | corrigido em 2026-11-19 | E2E (`online`); unit (`sync` e respostas HTTP) |
| T2 | `refreshSession` da fila sem timeout | RPC, Edge Function e PUT tinham timeout só pelo sinal, que não chega à busca do token, e a renovação não tinha nenhum (o `fetch` do auth-js não tem). Uma conexão pendurada segurava a passada e o lock | `supabase-api.ts`, `supabase-fetch.ts` | corrigido em 2026-11-19 ([queue.md](decisions.md#fila-offline)) | unit |
| T3 | Um item por vez no aparelho (Q2) | uma O.S. com 20 fotos em 2G segura as outras | `processor.ts` | por design | medir em campo |
| T4 | Background Sync com o app fechado | o Chrome tenta o `sync` poucas vezes, com espera própria; esgotado, só a página manda (o app tem de abrir) | `sw.ts` | unit | campo; o Playwright não simula |
| T5 | Aba congelada pelo Android em segundo plano | a fila da página para; só o `sync` do worker cobre | `runner.ts` | — | campo |
| T6 | Celular "conectado" sem dados | o `online` não dispara; só a resposta HTTP e o timer (até 1 min) acordam a fila | `supabase-fetch.ts` | unit | — |
| T7 | Envio com sinal avisava "Sem sinal: o envio entrou na fila" | o `submit` real sempre enfileira (Q4) e devolve `'queued'`, e a tela escolhia o aviso por esse retorno. Achado no E1 | `derive.ts` (`sendNotice`), `execution-page.tsx`, `supplement-page.tsx` | corrigido em 2026-11-19: com sinal, "Enviando…" | unit; o E1 confere o aviso |

## Gargalos

| ID | Ponto | Por que pesa | Onde | Hoje | Teste |
| --- | --- | --- | --- | --- | --- |
| D1 | Cada foto custa 3 idas e voltas em série (2 Edge Functions e o PUT), mais o cold start da função | com o RTT alto do 2G, o custo fixo por foto pesa tanto quanto o arquivo | `sendSubmit`; 04 | por design; medido em 2026-11-19 ([Medições](#medições)): o arquivo domina, as idas e voltas são 7% do tempo da foto no 2G | [`measure/photo-cost`](../tests/e2e/measure/photo-cost.spec.ts) |
| D2 | Compressão no thread principal | sem worker ([photos.md](decisions.md#fotos-no-aparelho)); várias fotos de 12 MP da galeria travam a tela em celular fraco | `photos/compress` | por design | aparelho real |
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
| E5 | Materiais mudados pelo técnico durante a edição da O.S. | a edição em três chamadas gravava pela metade e, no segundo clique, sobrescrevia o texto do técnico sem mostrá-lo; agora é uma `update_order` atômica com `conflict` (03, R11) | `office/orders/form.tsx` | unit (`edit.ts`); E2E desde 2026-11-23 | coberto |

## Dados no aparelho e acesso

| ID | Ponto | Por que pesa | Onde | Hoje | Teste |
| --- | --- | --- | --- | --- | --- |
| S1 | Abrir o app sem sinal | precache, `NavigationRoute`, acesso guardado e cache de 3 dias; é o começo do dia em campo. Passado 3 dias sem sinal, o cache vence e a lista abre vazia, mas os rascunhos ficam (premissa do backend) | `sw.ts`, `session.ts`, `persist.ts` | E2E desde 2026-11-19. O teste achou ~7 s de "Carregando…": o postgrest-js repetia a consulta do acesso 3 vezes (1, 2 e 4 s) antes de cair no acesso guardado; corrigido ([screens.md](decisions.md#telas)) | coberto |
| S2 | Relógio do aparelho errado | `client_started_at`, `client_submitted_at` e `captured_at` vêm dele e mudam os alertas (`late_delivery`, `gallery_before_start`) | 04 | aceito (os horários do servidor vão junto) | — |
| S3 | Isolamento entre empresas e técnicos | o RLS é a única barreira; o front usa a chave anon | backend | pgTAP no backend | não repetir aqui |
| S4 | Aparelho compartilhado | cache, fila e fotos por usuário (Q3, Q10); leituras em memória esquecidas na troca de usuário | `clearUser`, `persist.ts`, `query-client.ts` (`forgetOnUserChange`) | unit; E2E desde 2026-11-19. O teste achou o cache do técnico 1 de volta depois do logout (2 em 4 rodadas): uma gravação do cache no meio do logout, com a sessão ainda dele, depois do `clearUser`; corrigido ([queue.md](decisions.md#fila-offline)). A revisão de segurança de 2026-11-24 achou o cache em memória do 1 na tela do 2 (C1): o teste recarregava a página no login e não via; corrigido e o teste passou a entrar sem recarregar | coberto |
| S5 | Logout encerra a sessão do usuário em todos os aparelhos | o `signOut()` do supabase-js é `scope: 'global'` por padrão: sair num celular derruba a sessão do mesmo técnico nos outros. Lá, a Edge Function passa a responder 401 e a fila para pedindo login (mantém a fila, Q3; mas a janela do P3 vale). Achado no S4 (2026-11-19), porque derrubava os outros testes com o mesmo usuário | `app/session.ts` (`signOutAndWipe`) | global por decisão do usuário (2026-11-19, [queue.md](decisions.md#fila-offline)) | os E2E que saem da conta usam técnico próprio |

## Versionamento

Como app e backend evoluem cada um no seu ritmo, com celulares que ficam até 3 dias sem sinal e sem atualizar.

| Peça | Como é | Regra ou prova |
| --- | --- | --- |
| Versão do app | feito em 2026-11-19: o momento do build em UTC e o commit (`2026.11.19.1530+abc1234`, [`version.ts`](../src/lib/version.ts)), no `define` do Vite e no Perfil das duas interfaces | — |
| Versão nas chamadas | feito em 2026-11-19: `x-client-version` em toda chamada à API do Supabase, da página e do worker (`VERSION_HEADERS`); o PUT da foto no R2 vai sem ele. As Edge Functions o liberam no CORS e põem a versão no log de erro ([api.md](../../fast/docs/api.md) do backend). **Deploy:** o backend vai ao ar antes do front que manda o header; sem ele no CORS, o navegador barra as Edge Functions | o E2E `offline-execution` confere o header em todas as chamadas |
| Versão mínima | feito em 2026-11-19: `app_settings.min_client_version` no backend (01, R8); abaixo dela, "Atualize o app" no lugar da interface, que ativa o worker novo sem apagar a fila ([screens.md](screens.md#comum)). O worker não confere a mínima: o Background Sync de um app velho ainda manda, e por isso a função antiga fica no ar pelo prazo (P9) | E2E `update-required` |
| Mudança de RPC ou Edge Function usada pela fila | regra na spec do backend (P9); sem ela, `PGRST202` deixaria o item `blocked` | P9: mudança só aditiva; mudança que quebra vira função nova (`_v2`) e a antiga fica pelo prazo offline (3 dias) mais o ciclo de atualização; aí sobe a versão mínima |
| Formato dos itens da fila e do Dexie | feito em 2026-11-19: `format` em todo item; build mais velho não toca no item mais novo ([queue.md](queue.md), Q13); formato novo = versão nova do Dexie com `upgrade()` testado | unit |
| No celular | feito em 2026-11-19: Perfil com a versão; "Atualize o app" abaixo da mínima | — |

## Listas do escritório

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
| Background Sync com o app fechado, aba congelada (Doze), câmera e GPS, rede ruim, armazenamento cheio | Android emulado ([plano](pending.md#android-emulado)) |
| Economia de bateria dos fabricantes, câmera e rádio de verdade, instalação do PWA | roteiro curto num celular real antes do deploy |
