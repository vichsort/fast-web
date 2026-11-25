# Telas do escritório

Mapa das telas de owner e manager (computador, online). O que existe por papel está em [screens.md](screens.md); as peças, em [components.md](components.md); as regras e os erros, nos módulos do backend citados em cada linha. Código: [`src/office/`](../src/office/), rotas em [`routes.tsx`](../src/office/routes.tsx), textos em [`office.ts`](../src/lib/i18n/office.ts). Dados: as telas importam só de [`src/office/api/`](../src/office/api/), que escolhe a fonte pela chave `VITE_DATA_SOURCE` ([`data-source.ts`](../src/lib/data-source.ts)): `mock` usa os dados de exemplo; sem ela, o Supabase. Funções ainda sem integração respondem com o erro genérico.

## Moldura

| Parte | O que tem | Quem vê |
| --- | --- | --- |
| Lateral, "Trabalho" | Dashboard, Ordens de serviço, Revisão (contador: aguardando aprovação + tardios sem ciência), Clientes | owner, manager |
| Lateral, "Administração" | Empresa, Membros, Auditoria | owner |
| Rodapé da lateral | usuário e papel; menu com Meu perfil e Sair | todos |
| Topo | empresa e seção atual; "Nova O.S." (exceto na própria tela) | todos |
| Abaixo de `lg` (1024 px) | a lateral vira menu (botão no topo) | todos |

O papel vem do `RequireAccess`; tela de owner aberta por manager mostra `forbidden`.

## Telas

| Rota | Mostra | Ações | Estados | Backend |
| --- | --- | --- | --- | --- |
| `/office` | os 8 contadores, total em andamento (soma no front), listas aguardando aprovação (mais antiga primeiro), atrasadas (prazo mais antigo primeiro) e complementos tardios | cada contador abre a lista filtrada, exceto "Aprovadas no mês" ([decisão](decisions.md#telas-do-escritório) de 2026-11-24); linha abre a revisão ou a O.S. | carregando, erro com tentar de novo, listas vazias | [05](../../fast/docs/modules/05-dashboard-audit.md) |
| `/office/orders` | tabela de O.S.; filtros na URL: `q`, `status[]`, `priority`, `type`, `tech` (`none` = sem técnico), `client`, `from`/`to` (prazo), `overdue` | busca, filtros, limpar, abrir O.S., Nova O.S. | vazio, sem resultado (limpar filtros), erro | [03](../../fast/docs/modules/03-service-orders.md) |
| `/office/orders/new` | cliente com busca e "Cadastrar 'texto'" (cadastro rápido: nome e telefone); endereços do cliente com o principal marcado, ou "sem endereço"; título, tipo, prioridade, prazo, instruções, materiais, técnicos. `?client=` já escolhe o cliente | criar; cadastrar endereço no cliente sem sair | obrigatórios (cliente, título, tipo) marcados e foco no primeiro | 03 (`create_order`), [02](../../fast/docs/modules/02-clients.md) (`create_client`, `add_client_address`) |
| `/office/orders/$orderId/edit` | os mesmos campos; cliente travado; endereço já usado e depois excluído aparece como "mantido" | salvar | `approved` e `cancelled` mostram `invalid_status`/`order_closed` em vez do formulário; `conflict` nos materiais: o texto atual ao lado do digitado, escolher antes de salvar | 03 (`update_order`, com materiais e técnicos) |
| `/office/orders/$orderId` | número, autor, status, prioridade, tipo, atrasada, sem técnico, tardios; dados e instruções; materiais; tentativas e complementos com fotos (com mais de uma tentativa, o aviso de que a prova é a soma delas); cliente com WhatsApp e ligar; local; técnicos ativos e os que já estiveram; histórico completo por dia | revisar (se pendente), editar, reatribuir, materiais, enviar pelo WhatsApp, cancelar com motivo, dar ciência dos tardios | faixas de cancelada (motivo, quem, quando), aprovada, aguardando aprovação e tardios; em `approved`/`cancelled` some editar, reatribuir, materiais e cancelar; em `in_progress`/`rejected`, reatribuir e editar avisam quem sai (o envio dele sem sinal será recusado) e cancelar avisa que um envio sem sinal fica registrado sem revisão | 03, [04](../../fast/docs/modules/04-execution-photos.md) |
| `/office/review` | abas "Aguardando aprovação" (cartões: número, tentativa, chegada, cliente, dupla, fotos, complementos, alertas; mais antiga primeiro) e "Complementos tardios" (`?tab=late`, agrupados por O.S.) | revisar; dar ciência por O.S. | vazio de cada aba, erro | 04 |
| `/office/review/$orderId` | tentativa pendente com complementos e fotos (origem, horário, alertas); tentativas anteriores abertas abaixo dela, com o aviso de que a prova é a soma das tentativas ([decisão](decisions.md#telas-as-duas-interfaces) de 2026-11-24); resumo (fotos, complementos, alertas); em "Pontos de atenção", acima de aprovar, "Rejeição anterior: <motivo>" e os alertas por extenso; prazo, endereço, instruções e materiais | aprovar (comentário opcional), rejeitar (justificativa obrigatória); depois, "Próxima O.S." | `stale_review`: faixa com recarregar e decisão travada; O.S. fora de `pending_approval` mostra o status atual | 04 (`review_execution`), [photos.md](photos.md) |
| `/office/clients` | tabela: nome e observação, telefone, endereço principal, nº de endereços, O.S. em andamento; `?q=` e `?deleted=true` | buscar, mostrar excluídos, novo cliente (painel lateral, endereço opcional) | vazio, sem resultado, erro | 02 |
| `/office/clients/$clientId` | dados com WhatsApp e ligar; endereços (principal, sem principal, excluídos com motivo); histórico de O.S. | Nova O.S. para o cliente, editar, adicionar/editar endereço (CEP preenche o resto), tornar principal, excluir endereço e cliente com motivo | excluído: só leitura com motivo; `client_has_open_orders`: faixa com link para as O.S. em andamento | 02 |
| `/office/company` | nome, CNPJ, telefone, email, fuso; próxima O.S. e desde quando | salvar | só owner | [01](../../fast/docs/modules/01-foundation.md), 05 (auditoria) |
| `/office/members` | membros, "Você", papel, desde, situação (ativo, convite pendente com a data, recusou o convite, removido com motivo); até o aceite, o nome e o email digitados no convite ([06](../../fast/docs/modules/06-members.md), R9) | convidar (nome, email, papel) e mostrar o link do convite para copiar ou compartilhar; no pendente, gerar o link de novo, trocar papel, cancelar o convite (remoção com motivo); no recusado, convidar de novo; no ativo, trocar papel (aviso de atribuições fechadas), gerar o link de "definir senha" (confirmação antes) e remover com motivo | `last_owner`: faixa; convite de membro já aceito avisa que nada mudou; o link só aparece ao ser gerado | [06](../../fast/docs/modules/06-members.md) |
| `/office/audit` | quando, quem, ação e alvo, detalhes (papel, de → para, motivo, campos mudados, atribuições fechadas) | buscar, filtrar por ação, autor e período | sem resultado | 05 |
| `/office/profile` | nome, telefone, email (só leitura), papel, empresa, versão do app | salvar, sair (logout real) | — | 01 |

## Seções das telas

Cada bloco visual das telas grandes é um componente com nome, na ordem da tela, para apontar numa revisão.

| Rota | Pasta | Seções |
| --- | --- | --- |
| `/office/orders/$orderId` | [`orders/detail/`](../src/office/orders/detail/) | `OrderHeader` (topo e ações); `OrderNotices` (faixas `CancelledNotice`, `ApprovedNotice`, `PendingReviewNotice`, `LateSupplementsNotice`); principal: `OrderDataSection` (dados), `MaterialsSection`, `ExecutionsSection` (tentativas); lateral: `ClientSection` (cliente e local), `TechniciansSection`, `HistorySection`; diálogos `CancelOrderDialog`, `ReassignDialog` |
| `/office/review/$orderId` | [`review/review/`](../src/office/review/review/) | `ReviewHeader`; `StaleNotice` (faixa do `stale_review`); principal: tentativa pendente (`ExecutionCard`), `PreviousAttempts` (abertas); lateral: `DecisionSection` (`ReviewSummary`, `ReviewAlerts`, `DecisionActions` com aprovar e rejeitar, cenário de exemplo), `OrderInfoSection` (prazo, endereço, instruções, materiais); fora da decisão: `DoneState` (resultado e próxima O.S.), `NotPending` |
| `/office/clients/$clientId` | [`clients/detail/`](../src/office/clients/detail/) | `ClientHeader` (topo e ações); faixas `DeletedClientNotice`, `OpenOrdersNotice` (`client_has_open_orders`); lateral: `ClientDataSection` (dados), `AddressesSection` (com `AddressMenu` por endereço); principal: `ClientOrdersSection` (histórico de O.S.); diálogos `DeleteClientDialog`, `DeleteAddressDialog` (editar cliente e endereço: `client-form.tsx`, `address-form.tsx`) |

## Erros de regra na tela

O texto é sempre o do catálogo ([errors.md](../../fast/docs/errors.md), `errorMessage`). O que pede uma ação do usuário fica na tela; o resto vai num aviso que some.

| Código | Onde | Como aparece |
| --- | --- | --- |
| `reason_required`, `comment_required` | cancelar O.S., rejeitar, excluir cliente/endereço, remover membro | o diálogo não confirma com o campo vazio |
| `stale_review` | revisão | faixa "chegou um complemento novo" com recarregar; aprovar e rejeitar travam até recarregar |
| `client_has_open_orders` | detalhe do cliente | faixa com "ver O.S. em andamento" |
| `last_owner` | membros | faixa com o que fazer antes |
| `conflict` | materiais no detalhe da O.S. | faixa com recarregar, que traz o texto atual do servidor |
| `conflict` | materiais em editar O.S. | no lugar, com nada salvo: o texto atual da O.S. ao lado do digitado; escolher um põe o texto no campo (ajustável); salvar sem escolher marca a escolha |
| `invalid_status`, `order_closed` | editar O.S. | a tela não oferece a ação; a rota de edição mostra o erro |
| `no_pending_execution` | revisão | a O.S. fora de `pending_approval` mostra o status atual |
| demais | qualquer ação | aviso (toast) |

## Dados de exemplo e integração

| Item | Com `VITE_DATA_SOURCE=mock` | No Supabase |
| --- | --- | --- |
| Leituras | [`src/office/mocks.ts`](../src/office/mocks.ts): cópia em memória dos dados do kit, com as mesmas formas; recarregar a página desfaz as ações | consultas diretas com relações embutidas e `get_dashboard`, nas mesmas chaves `['office', …]` do TanStack Query |
| Ações | mudam a cópia, imitam os erros de regra e mostram o aviso dos dados de exemplo | RPCs do 02, 03 e 04, update direto de `clients`, `client_addresses`, `companies` e `profiles`; Edge Functions do 06 |
| Usuário logado | o de exemplo do papel (owner: Ricardo; manager: Juliana) | perfil e vínculo da sessão real |
| Editar O.S. | `update_order` só, com materiais e técnicos só se mudaram ([`edit.ts`](../src/office/orders/edit.ts)); recusa não grava nada | a mesma chamada, uma transação no banco |
| CEP | tabela de 5 CEPs de exemplo (`lookupZip` em `mocks.ts`) | ViaCEP chamado direto do navegador ([`viacep.ts`](../src/office/api/viacep.ts)): preenche rua, bairro, cidade e UF; não encontrado ou serviço fora (rede, 5xx, 8 s sem resposta) avisa e o endereço é digitado à mão |
| `stale_review` | interruptor "Cenário de exemplo" na revisão | chega de verdade quando um complemento entra depois do carregamento |
| Fotos | SVGs locais | `get_photo_urls` (URL expira em 5 min), reaproveitada e renovada como no [photos.md](photos.md), F11 |
