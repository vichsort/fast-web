# E2E e pontos críticos

Como rodam os E2E, o que ainda está em aberto e o que só se testa à mão. O que cada teste prova está no cabeçalho do arquivo dele (`tests/e2e/**`).

## Como roda

| Parte | Como |
| --- | --- |
| Rodar | `npm run test:e2e` ([`playwright.config.ts`](../playwright.config.ts)); fora do `npm run check`, antes de commitar o que mexe num fluxo coberto |
| Backend | stack local (`npm run db:start` em `../fast`) com o seed; preparo e conferência direto no banco por [`support/backend.ts`](../tests/e2e/support/backend.ts) |
| App | build e `vite preview` na 4173; projetos `office` (Desktop Chrome) e `technician` (Pixel 7); service worker bloqueado, liberado só nos testes que precisam dele |
| Paralelo | nenhum teste muda o que vale para todos (`app_settings`, o seed): troca-se a resposta só na página (`page.route`). Usuário que sai da conta ou é removido é criado só para o teste (`createTechnician`). O `globalSetup` zera as tentativas de convite do owner do seed (limite R7 do [06](../../fast/docs/modules/06-members.md)) |
| Worker | `context.on('request')` vê também as requisições do worker; a busca do `sw.js` que o navegador faz para atualizar, não (o `auto-update` usa um servidor do build só dele, [`static-server.ts`](../tests/e2e/support/static-server.ts)) |
| Suíte instável sem motivo | o banco local incha a cada rodada: `npm run db:reset` em `../fast` e rodar de novo |
| Medições | projeto `measure`, fora da suíte: `MEASURE=1 npx playwright test --project measure --workers 1` |

## Em aberto

| ID | Ponto | Por que pesa | Como fica |
| --- | --- | --- | --- |
| P8 | App atualizado com itens na fila | a versão nova lê a prova gravada pela velha | a partir do primeiro deploy, toda mudança do Dexie ou do formato do item ([queue.md](queue.md), Q13) é versão nova com `upgrade()` testado a partir dos dados da anterior |
| P9 | Contrato do backend mudando com itens antigos na fila | `PGRST202` deixa o item `blocked` até o técnico atualizar | regra ["A fila não quebra"](../../fast/docs/spec.md#princípios) |
| T3 | Um item por vez (Q2) | uma O.S. com 20 fotos em 2G segura as outras (~9 min) | medir em campo |
| T4, T5 | Background Sync com o app fechado; aba congelada pelo Android | o Chrome tenta poucas vezes; esgotado, só a página manda | roteiro do celular (R5) |
| T6 | Celular "conectado" sem dados | o `online` não dispara; acorda pela resposta HTTP ou pelo timer (até 1 min) | teste C1 no PC |
| D2 | Compressão no thread principal | várias fotos de 12 MP travam a tela em celular fraco | roteiro do celular (R2) |
| S2 | Relógio do aparelho errado | muda os alertas de foto | aceito: os horários do servidor vão junto |

**Custo por foto (medido em 2026-11-19, 3 fotos de ~333 KB):** 0,4 s sem limite, 1,1 s no 4G, 5,2 s no 3G, 26 s no 2G; o arquivo domina (no 2G, as idas e voltas são 7%). A alavanca é o tamanho da foto (F1, [photos.md](photos.md)), não o contrato.

## No PC

Chrome em modo celular (F12, Ctrl+Shift+M) no build com o worker (`npm run build` e `npm run preview`, na 4173). Backend local.

| # | Teste | Como | Esperado |
| --- | --- | --- | --- |
| C1 | Conectado sem dados (T6) | envio na fila com a rede ligada e as URLs do Supabase bloqueadas (DevTools > Network > Request blocking, `127.0.0.1:55321`); desbloquear | fica na fila, sem erro; desbloqueado, sobe em até 1 min |
| C2 | Fotos reais da galeria (F2) | fotos de celulares de verdade: antiga, recebida pelo WhatsApp, de outro fuso | alertas de foto anterior ao início e sem data nas certas; horário certo nas outras |

## Roteiro no celular real

~25 min, **no app publicado** (câmera, localização e worker exigem HTTPS; o Supabase local não é alcançável do celular). Android com Chrome, de preferência o de um técnico; o iPhone cobre só as linhas marcadas. **Preparo:** no computador, como escritório, duas O.S. atribuídas ao técnico do celular. **Anotar:** modelo, versões do Android e do Chrome, e o tempo de cada envio.

| # | Teste | Como | Esperado | iPhone |
| --- | --- | --- | --- | --- |
| R1 | Instalar | Chrome > Instalar app (iPhone: Safari > Compartilhar > Adicionar à Tela de Início) | ícone; abre sem a barra do navegador | sim |
| R2 | Câmera e celular fraco (D2) | 3 fotos pela câmera, em pé e deitada; depois 5 fotos de 12 MP da galeria de uma vez | permissões pedidas; fotos nítidas, na orientação certa, com localização; a tela não trava mais que ~2 s por foto | só a câmera |
| R3 | Teclado | escrever o relatório e o motivo; preencher o login | o teclado não cobre o campo nem o botão | sim |
| R4 | Rádio de verdade (T3) | rede móvel fraca ou só 3G; envio com 10 fotos | nenhum erro; anotar o tempo até chegar ao computador | sim |
| R5 | App fechado e economia de bateria (T4, T5) | envio na fila, app fechado, economia ligada, tela apagada por 30 min, com sinal | anotar se chegou sem abrir e, ao abrir, quanto demorou | não |
| R6 | Botão voltar e segundo plano | voltar a partir de cada tela do técnico; outro app por 5 min com um rascunho aberto | volta uma tela, e na lista sai do app; rascunho, fotos e fila intactos | não |
| R7 | Em campo | ao sol, com uma mão | textos legíveis; botões principais ao alcance do polegar | sim |

Falha vira item em [pending.md](pending.md).
