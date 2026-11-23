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
| `/office` | os 8 contadores, total em andamento (soma no front), listas aguardando aprovação (mais antiga primeiro), atrasadas (prazo mais antigo primeiro) e complementos tardios | cada contador abre a lista filtrada; linha abre a revisão ou a O.S. | carregando, erro com tentar de novo, listas vazias | [05](../../fast/docs/modules/05-dashboard-audit.md) |
| `/office/orders` | tabela de O.S.; filtros na URL: `q`, `status[]`, `priority`, `type`, `tech` (`none` = sem técnico), `client`, `from`/`to` (prazo), `overdue` | busca, filtros, limpar, abrir O.S., Nova O.S. | vazio, sem resultado (limpar filtros), erro | [03](../../fast/docs/modules/03-service-orders.md) |
| `/office/orders/new` | cliente com busca e "Cadastrar 'texto'" (cadastro rápido: nome e telefone); endereços do cliente com o principal marcado, ou "sem endereço"; título, tipo, prioridade, prazo, instruções, materiais, técnicos. `?client=` já escolhe o cliente | criar; cadastrar endereço no cliente sem sair | obrigatórios (cliente, título, tipo) marcados e foco no primeiro | 03 (`create_order`), [02](../../fast/docs/modules/02-clients.md) (`create_client`, `add_client_address`) |
| `/office/orders/$orderId/edit` | os mesmos campos; cliente travado; endereço já usado e depois excluído aparece como "mantido" | salvar | `approved` e `cancelled` mostram `invalid_status`/`order_closed` em vez do formulário | 03 (`update_order`, `update_materials_notes`, `set_assignees`) |
| `/office/orders/$orderId` | número, autor, status, prioridade, tipo, atrasada, sem técnico, tardios; dados e instruções; materiais; tentativas e complementos com fotos; cliente com WhatsApp e ligar; local; técnicos ativos e os que já estiveram; histórico completo por dia | revisar (se pendente), editar, reatribuir, materiais, enviar pelo WhatsApp, cancelar com motivo, dar ciência dos tardios | faixas de cancelada (motivo, quem, quando), aprovada, aguardando aprovação e tardios; em `approved`/`cancelled` some editar, reatribuir, materiais e cancelar | 03, [04](../../fast/docs/modules/04-execution-photos.md) |
| `/office/review` | abas "Aguardando aprovação" (cartões: número, tentativa, chegada, cliente, dupla, fotos, complementos, alertas; mais antiga primeiro) e "Complementos tardios" (`?tab=late`, agrupados por O.S.) | revisar; dar ciência por O.S. | vazio de cada aba, erro | 04 |
| `/office/review/$orderId` | tentativa pendente com complementos e fotos (origem, horário, alertas); tentativas anteriores recolhidas; resumo (fotos, complementos, alertas) e alertas por extenso; prazo, endereço, instruções e materiais | aprovar (comentário opcional), rejeitar (justificativa obrigatória); depois, "Próxima O.S." | `stale_review`: faixa com recarregar e decisão travada; O.S. fora de `pending_approval` mostra o status atual | 04 (`review_execution`), [photos.md](photos.md) |
| `/office/clients` | tabela: nome e observação, telefone, endereço principal, nº de endereços, O.S. em andamento; `?q=` e `?deleted=true` | buscar, mostrar excluídos, novo cliente (painel lateral, endereço opcional) | vazio, sem resultado, erro | 02 |
| `/office/clients/$clientId` | dados com WhatsApp e ligar; endereços (principal, sem principal, excluídos com motivo); histórico de O.S. | Nova O.S. para o cliente, editar, adicionar/editar endereço (CEP preenche o resto), tornar principal, excluir endereço e cliente com motivo | excluído: só leitura com motivo; `client_has_open_orders`: faixa com link para as O.S. em andamento | 02 |
| `/office/company` | nome, CNPJ, telefone, email, fuso; próxima O.S. e desde quando | salvar | só owner | [01](../../fast/docs/modules/01-foundation.md), 05 (auditoria) |
| `/office/members` | membros (sem email), "Você", papel, desde, situação; removidos com motivo | convidar (nome, email, papel), trocar papel (aviso de atribuições fechadas), remover com motivo | `last_owner`: faixa; convite de membro ativo avisa que nada mudou; reativação avisa | [06](../../fast/docs/modules/06-members.md) |
| `/office/audit` | quando, quem, ação e alvo, detalhes (papel, de → para, motivo, campos mudados, atribuições fechadas) | buscar, filtrar por ação, autor e período | sem resultado | 05 |
| `/office/profile` | nome, telefone, email (só leitura), papel, empresa, versão do app | salvar, sair (logout real) | — | 01 |

## Seções das telas

Cada bloco visual das telas grandes é um componente com nome, na ordem da tela, para apontar numa revisão.

| Rota | Pasta | Seções |
| --- | --- | --- |
| `/office/orders/$orderId` | [`orders/detail/`](../src/office/orders/detail/) | `OrderHeader` (topo e ações); `OrderNotices` (faixas `CancelledNotice`, `ApprovedNotice`, `PendingReviewNotice`, `LateSupplementsNotice`); principal: `OrderDataSection` (dados), `MaterialsSection`, `ExecutionsSection` (tentativas); lateral: `ClientSection` (cliente e local), `TechniciansSection`, `HistorySection`; diálogos `CancelOrderDialog`, `ReassignDialog` |
| `/office/review/$orderId` | [`review/review/`](../src/office/review/review/) | `ReviewHeader`; `StaleNotice` (faixa do `stale_review`); principal: tentativa pendente (`ExecutionCard`), `PreviousAttempts` (recolhidas); lateral: `DecisionSection` (`ReviewSummary`, `ReviewAlerts`, `DecisionActions` com aprovar e rejeitar, cenário de exemplo), `OrderInfoSection` (prazo, endereço, instruções, materiais); fora da decisão: `DoneState` (resultado e próxima O.S.), `NotPending` |
| `/office/clients/$clientId` | [`clients/detail/`](../src/office/clients/detail/) | `ClientHeader` (topo e ações); faixas `DeletedClientNotice`, `OpenOrdersNotice` (`client_has_open_orders`); lateral: `ClientDataSection` (dados), `AddressesSection` (com `AddressMenu` por endereço); principal: `ClientOrdersSection` (histórico de O.S.); diálogos `DeleteClientDialog`, `DeleteAddressDialog` (editar cliente e endereço: `client-form.tsx`, `address-form.tsx`) |

## Erros de regra na tela

O texto é sempre o do catálogo ([errors.md](../../fast/docs/errors.md), `errorMessage`). O que pede uma ação do usuário fica na tela; o resto vai num aviso que some.

| Código | Onde | Como aparece |
| --- | --- | --- |
| `reason_required`, `comment_required` | cancelar O.S., rejeitar, excluir cliente/endereço, remover membro | o diálogo não confirma com o campo vazio |
| `stale_review` | revisão | faixa "chegou um complemento novo" com recarregar; aprovar e rejeitar travam até recarregar |
| `client_has_open_orders` | detalhe do cliente | faixa com "ver O.S. em andamento" |
| `last_owner` | membros | faixa com o que fazer antes |
| `conflict` | materiais da O.S. | faixa com recarregar, que traz o texto atual do servidor |
| `invalid_status`, `order_closed` | editar O.S. | a tela não oferece a ação; a rota de edição mostra o erro |
| `no_pending_execution` | revisão | a O.S. fora de `pending_approval` mostra o status atual |
| demais | qualquer ação | aviso (toast) |

## Dados de exemplo e integração

| Item | Com `VITE_DATA_SOURCE=mock` | No Supabase |
| --- | --- | --- |
| Leituras | [`src/office/mocks.ts`](../src/office/mocks.ts): cópia em memória dos dados do kit, com as mesmas formas; recarregar a página desfaz as ações | consultas diretas com relações embutidas e `get_dashboard`, nas mesmas chaves `['office', …]` do TanStack Query |
| Ações | mudam a cópia, imitam os erros de regra e mostram o aviso dos dados de exemplo | RPCs do 02, 03 e 04, update direto de `clients`, `client_addresses`, `companies` e `profiles`; Edge Functions do 06 |
| Usuário logado | o de exemplo do papel (owner: Ricardo; manager: Juliana) | perfil e vínculo da sessão real |
| Editar O.S. | `update_order`, depois `update_materials_notes` e `set_assignees` só se mudaram | as mesmas três chamadas; falha no meio deixa parte salva: recarregar e mostrar o estado real |
| CEP | tabela de 5 CEPs de exemplo (`lookupZip` em `mocks.ts`) | ViaCEP chamado direto do navegador ([`viacep.ts`](../src/office/api/viacep.ts)): preenche rua, bairro, cidade e UF; não encontrado ou serviço fora (rede, 5xx, 8 s sem resposta) avisa e o endereço é digitado à mão |
| `stale_review` | interruptor "Cenário de exemplo" na revisão | chega de verdade quando um complemento entra depois do carregamento |
| Fotos | SVGs locais | `get_photo_urls` (URL expira em 5 min), reaproveitada e renovada como no [photos.md](photos.md), F11 |

## Decisões

- **2026-11-19** — CEP pelo ViaCEP, chamado direto do navegador, sem passar pelo backend. Só os campos que vieram preenchidos entram no formulário (um CEP de cidade inteira traz só cidade e UF e não apaga a rua digitada), e o `complemento` do ViaCEP fica de fora. *Por quê:* decisão do usuário; o ViaCEP é gratuito, sem chave e libera CORS. O `complemento` dele descreve a faixa do CEP ("lado ímpar"), não o endereço do cliente.
- **2026-11-19** — Sem tela de importação de clientes: a importação por CSV é só do backend (`import_clients`, etapa 9 do roadmap dele). *Por quê:* decisão do usuário; é a carga inicial, feita uma vez.
- **2026-11-17** — O link do "Enviar pelo WhatsApp" é o da O.S. na interface do técnico (`/technician/orders/<id>`). *Por quê:* quem recebe a mensagem é a dupla; o link do escritório barraria o técnico no guarda e o levaria à lista, sem a O.S.
- **2026-11-17** — Revisão em tela própria, fila mais antiga primeiro e "Próxima O.S." depois de decidir. *Por quê:* as fotos precisam de largura; quem revisa várias seguidas não volta à lista a cada uma.
- **2026-11-17** — Erros que pedem ação (`stale_review`, `client_has_open_orders`, `last_owner`, `conflict`) ficam numa faixa na tela, não só no aviso que some. *Por quê:* o usuário precisa do próximo passo (recarregar, ver as O.S., promover outro dono).
- **2026-11-17** — Editar a O.S. num formulário só (dados, endereço, materiais e técnicos), com reatribuir e materiais também no detalhe. *Por quê:* a criação já tem todos os campos; trocar a dupla ou anotar material é frequente e não precisa abrir o formulário.
- **2026-11-17** — Filtros da lista de O.S. na URL. *Por quê:* os contadores do dashboard linkam para a lista filtrada, e voltar do detalhe mantém o filtro.
- **2026-11-19** — Os dados de exemplo ficam, atrás de uma chave única (`VITE_DATA_SOURCE=mock`), e a API real é tipada pela forma da API de exemplo (`src/office/api/types.ts`). *Por quê:* pedido do usuário: ver as telas e testá-las sem o backend; o tipo comum impede que as duas fontes divirjam.
- **2026-11-19** — O contrato da API do escritório passa a ser a interface `OfficeApi`, escrita à mão em [`types.ts`](../src/office/api/types.ts) (com `OrderInput` e `AddressInput`), em vez de derivado do mock; as views das telas saem de `src/mocks/types.ts` para `src/lib/views.ts`. Substitui a decisão acima só na origem do tipo. *Por quê:* revisão da arquitetura: o mock tinha virado a fonte da verdade da API real e dos tipos de produção, e um retorno inferido no mock mudava o contrato sem ninguém ver. Agora é igual ao técnico (`TechnicianApi`), e o Biome barra importar mocks fora das implementações de exemplo.
- **2026-11-19** — Lista de O.S.: o banco filtra status, prioridade, tipo, cliente e atrasada; busca, técnico, sem técnico e prazo no fuso da empresa ficam no front (`orderMatches`, o mesmo dos dados de exemplo), sobre a lista já trazida (desde 2026-11-19, enxuta: decisão abaixo). *Por quê:* busca no nome do cliente e técnico atribuído não são colunas da O.S.; o volume do MVP cabe numa leitura. Paginação entra quando o volume pedir.
- **2026-11-23** — Listas de O.S. e de clientes: a chave do cache e a leitura levam só o que o banco filtra (O.S.: status, prioridade, tipo, cliente, atrasada, separados por `splitOrderFilters`; clientes: com ou sem excluídos). Busca, técnico, sem técnico e prazo filtram o cache na tela (`select` de `useOrders` e `useClients`, [`queries.ts`](../src/office/queries.ts)), com o fuso da sessão do escritório (`useOffice`). *Por quê:* revisão de código: com os filtros da tela na chave, cada tecla da busca e cada troca de técnico ou prazo relia a lista inteira do banco, em blocos de 1000.
- **2026-11-23** — A API real do escritório guarda só quem está logado e a empresa (`bindOfficeSession`, ligado pelo layout); o fuso deixou de ser estado escondido dela (antes, `officeCompany` o gravava de efeito colateral). *Por quê:* revisão de código: o filtro de prazo usava um fuso que só existia depois de a empresa ser lida, `UTC` até lá. A empresa continua ligada no módulo porque quase toda leitura e RPC a usa; passá-la em cada chamada mudaria o contrato `OfficeApi` inteiro sem ganho.
- **2026-11-23** — O filtro de cliente da lista de O.S. lê só id, nome e exclusão de todos os clientes, inclusive os excluídos (`officeClientNames`, em blocos de 1000 com ordem fixa por nome e id). *Por quê:* revisão de código: a lista de O.S. lia os clientes com endereços e o status das O.S. de cada um só para preencher o seletor. Os excluídos entram porque as O.S. deles continuam na lista.
- **2026-11-19** — Telefone do cliente vai ao banco só com dígitos, e a busca compara dígitos. *Por quê:* o banco guarda o texto como vem; o link do WhatsApp e a busca por telefone precisam dos dígitos, com ou sem máscara.
- **2026-11-19** — O `p_id` das criações em diálogo (cliente, cadastro rápido, endereço) nasce ao abrir o diálogo e se repete a cada nova tentativa (`useCreateId`). *Por quê:* com um id por clique, a resposta perdida seguida de "salvar" de novo duplicaria o registro.
- **2026-11-19** — A lista de O.S. (`officeListOrders`, também no histórico do cliente e nas atrasadas do dashboard) pede só o que a linha mostra: número, título, status, prioridade, tipo, técnicos, prazo e cliente, mais os ids dos complementos tardios sem ciência, filtrados no banco, para o selo de tardios. Aguardando aprovação (dashboard, fila de revisão e "Próxima O.S.") vem de `officePendingOrders`, com o select completo, como o detalhe. *Por quê:* opção A das listas do escritório ([e2e.md](e2e.md#listas-do-escritório), D4): sem execuções e fotos, a linha cai para ~300 bytes; o selo de tardios foi mantido por decisão do usuário. A fila de revisão precisa das tentativas.
- **2026-11-19** — Listas de O.S., clientes e auditoria lidas em blocos de 1000 (`readAll`, [`read-all.ts`](../src/office/api/read-all.ts)) com ordem fixa no banco (número; nome e id; data e id). *Por quê:* o PostgREST corta em `max_rows = 1000` sem aviso ([e2e.md](e2e.md#listas-do-escritório), D4 a D6); filtros, busca e paginação seguem na tela.
- **2026-11-19** — URLs das fotos (`get_photo_urls`) só no detalhe da O.S. e na revisão; as listas trazem as fotos sem URL (contagens e alertas). Se a chamada falha por rede ou servidor, a O.S. abre sem as imagens. *Por quê:* a URL expira em 5 minutos e custa uma chamada por 100 fotos; as listas não mostram imagem.
- **2026-11-19** — Depois de uma recusa por regra, as leituras do escritório recarregam. *Por quê:* a recusa quase sempre quer dizer tela desatualizada (`conflict`, `stale_review`, status mudou); o "recarregar" das faixas precisa do dado novo, não do cache.
- **2026-11-19** — A lista de membros não mostra email; o perfil mostra o do próprio usuário, da sessão. *Por quê:* o email fica só no Auth e nenhuma operação o devolve; numa equipe pequena, nome e papel identificam o membro, e o convite repetido reenvia o email a quem não confirmou. Não vale uma Edge Function nova.
- **2026-11-17** — Formulários em diálogo continuam abertos quando faltam obrigatórios ou a ação é recusada. *Por quê:* fechar perderia o que foi digitado.
