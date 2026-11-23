# Componentes

Biblioteca visual das duas interfaces: componentes do domínio em [`src/components/`](../src/components/), tema em [`src/index.css`](../src/index.css), formatação em [`src/lib/format.ts`](../src/lib/format.ts), textos em [`src/lib/i18n/ui.ts`](../src/lib/i18n/ui.ts) e dados de exemplo em [`src/mocks/`](../src/mocks/). Vitrine com todas as variações: `/dev/components` (só em desenvolvimento; alterna claro/escuro, celular/computador e densidade). As regras do que cada tela mostra e permite continuam nos docs do backend; aqui só o "como".

## Convenções

- **Sem rota e sem dado próprio.** Componente recebe dados por props, com tipos estruturais (`OrderCardData`, `PhotoData`, `AttemptData`…) que as views de `src/lib/views.ts` satisfazem; a consulta real devolve a mesma forma.
- **Navegação por `render`.** Cartões, contadores, itens de menu e "voltar" recebem o elemento de navegação (`render={<Link to="..." />}`), ou `href`/`onClick`. O componente não importa o router.
- **Controlados.** Filtros, seletores e diálogos recebem `value`/`onValueChange` e `open`/`onOpenChange`. Diálogos também aceitam `trigger`. `onConfirm`/`onSubmit` podem devolver Promise: o botão mostra o envio e o diálogo fecha quando resolve.
- **Fuso.** Todo componente que mostra data recebe `timeZone` (o `companies.timezone`) e, opcionalmente, `now`.
- **Variantes comuns:** `size` (`sm`/`md`/`lg`), `density` (`compact`/`comfortable`/`touch`), `variant`, e `className` repassado ao elemento raiz.
- **Acessibilidade.** Selo sempre com texto (nunca só cor); só-ícone ganha `aria-label`; linhas e cartões clicáveis navegam por teclado; textos de leitor de tela em pt-BR.
- **Textos** em `ui.ts` (`t('ui.…')`); rótulos dos enums em `ui.status`, `ui.priority`, `ui.serviceType`, `ui.role`, `ui.review`, `ui.photoSource`; alertas em `alerts.<código>` (longo) e `ui.alertShort.<código>` (selo).
- **Formulários:** React Hook Form + Zod (`zodResolver`). O schema confere só o que a tela já conferia (obrigatório, formato); as peças comuns ficam em [`src/lib/forms.ts`](../src/lib/forms.ts) (`requiredText`, `emailText`, `requiredChoice`) e o endereço em [`address-schema.ts`](../src/office/clients/address-schema.ts). Input nativo por `register`; combobox, cartões, data e caixas de seleção por `Controller`. Os erros aparecem depois de tentar salvar e se refazem a cada mudança; as mensagens vêm do schema (`t()`).
- **shadcn/ui** (`src/components/ui/`) é a base; os componentes de domínio o compõem. Para algo genérico (input, select, tabs, tooltip…), use o de `ui/` direto.

## Catálogo

| Componente | Arquivo | Para | Props principais | Onde |
| --- | --- | --- | --- | --- |
| `ToneBadge` | `badges.tsx` | selo genérico por tom | `label`, `tone` ou `toneClass`, `variant` (`soft`/`solid`/`outline`/`dot`/`text`), `size`, `icon`, `iconOnly` | base dos selos |
| `OrderStatusBadge` | `badges.tsx` | status da O.S. | `status` | listas, detalhe |
| `PriorityBadge` | `badges.tsx` | prioridade (urgente sólido) | `priority`, `long` | listas, detalhe |
| `ServiceTypeBadge` | `badges.tsx` | tipo de serviço | `type` | detalhe, tabela |
| `RoleBadge` | `badges.tsx` | papel do membro | `role` | membros |
| `ReviewStatusBadge` | `badges.tsx` | revisão da tentativa | `status` | revisão |
| `PhotoSourceBadge` | `badges.tsx` | câmera ou galeria | `source` | fotos |
| `AlertBadge` | `badges.tsx` | alerta da prova fotográfica (texto longo na dica) | `code` (`PhotoAlert` ou `ExecutionAlert`) | revisão, fotos |
| `AlertList` | `alert-list.tsx` | alertas por extenso: selo curto e texto num cartão no tom de cada alerta | `alerts` (`code` e, opcional, `text`; sem ele, `alerts.<código>`) | resumo da revisão |
| `OverdueBadge`, `UnassignedBadge`, `LateSupplementBadge`, `NewBadge` | `badges.tsx` | atrasada, sem técnico, complemento tardio (`count`), não aberta no aparelho | — | listas |
| `CountBadge` | `badges.tsx` | contador redondo (some com 0) | `count`, `tone`, `max` | menus, abas |
| `PageHeader` | `page-header.tsx` | topo da tela | `title`, `description`, `eyebrow`, `meta`, `actions`, `back` (elemento ou callback), `size`, `sticky` | toda tela |
| `Section` | `section.tsx` | cartão/bloco de conteúdo | `title`, `description`, `icon`, `actions`, `footer`, `variant` (`card`/`muted`/`plain`), `density` | detalhe, formulários |
| `DetailList`, `DetailItem` | `section.tsx` | pares rótulo/valor (grade no largo) | `columns`; `label`, `full` | detalhe da O.S. e do cliente |
| `EmptyState` | `states.tsx` | lista vazia ou sem resultado | `kind` (`default`/`filtered`), `title`, `description`, `action`, `bordered`, `size` | listas |
| `ErrorState` | `states.tsx` | erro ao carregar com tentar de novo | `code` (catálogo) ou `message`, `onRetry`, `retrying`, `offline`, `layout` (`block`/`inline`) | toda leitura |
| `LoadingList`, `LoadingDetail`, `LoadingInline` | `states.tsx` | skeletons | `variant` (`card`/`row`/`table`), `count`, `columns` | toda leitura |
| `ScratchBanner`, `scratchToast(ação)` | `states.tsx` | aviso dos dados de exemplo (dados fictícios, ação sem efeito) | — | telas com `VITE_DATA_SOURCE=mock` |
| `Notice` | `notice.tsx` | aviso em destaque no tom: ícone, título, texto (`children`) e ação | `title`, `tone` ou `toneClass`, `icon`, `action`, `layout` (`inline`: computador, ação à direita, `role="status"`; `stacked`: celular, ícone maior e ação embaixo) | O.S. cancelada ou aprovada, complemento tardio, recusas, fila com problema |
| `OrderCard` | `order-card.tsx` | O.S. em lista no celular: número, tipo, título, cliente, endereço curto, prazo, status, prioridade, atrasada, tardio, "Nova" | `order`, `timeZone`, `isNew`, `showAssignees`, `hideStatus`, `density`, `render`/`href`/`onClick`, `selected` | Minhas O.S., dashboard estreito, cliente |
| `DueLabel` | `order-card.tsx` | prazo curto ("amanhã"), vermelho se atrasada | `dueAt`, `overdue`, `timeZone` | cartões, detalhe |
| `DataTable` | `data-table.tsx` | tabela genérica: ordenação, paginação, colunas que somem no estreito, carregando, vazio, linha clicável | `rows`, `columns` (`id`, `header`, `cell`, `sortValue`, `align`, `hideBelow`), `getRowId`, `sort`/`defaultSort`/`onSortChange`, `pageSize` (0 desliga), `onRowClick`, `selectedId`, `loading`, `empty`, `density` | O.S., clientes, membros, auditoria |
| `TablePagination` | `data-table.tsx` | "11–20 de 45", anterior/próxima | `page`, `pageSize`, `total`, `onPageChange` | paginação no servidor |
| `OrderTable`, `orderColumns()` | `order-table.tsx` | `DataTable` pronta para O.S. | `include` (`number`, `title`, `client`, `status`, `priority`, `type`, `assignees`, `due`), `timeZone` | lista do escritório, dashboard |
| `FilterBar` | `filter-bar.tsx` | busca + filtros em linha; no estreito, botão "Filtros" com painel de baixo | `search`, `filters`, `activeCount`, `onClear`, `actions` | listas do escritório |
| `SearchInput` | `filter-bar.tsx` | busca com limpar | `value`, `onValueChange`, `debounceMs`, `size` | listas |
| `FilterSelect` | `filter-bar.tsx` | uma escolha com "Todos" | `label`, `value`, `options` (`FilterOption`: `value`, `label`, `count`, `toneClass`), `onValueChange` | prioridade, técnico, tipo |
| `MultiFilter` | `filter-bar.tsx` | várias escolhas em popover | `label`, `values`, `options`, `onValuesChange` | status |
| `FilterChips` | `filter-bar.tsx` | chips roláveis de filtro rápido | `options`, `values`, `onValuesChange`, `single`, `label` | Minhas O.S., Pendências |
| `PeriodPicker` | `period-picker.tsx` | período com atalhos e calendário | `value` (`{from, to}` em `AAAA-MM-DD`), `onValueChange`, `timeZone`, `presets`, `label` | filtro de prazo, auditoria |
| `DatePicker` | `period-picker.tsx` | uma data com "Hoje", "Amanhã", "Sem prazo" | `value` (`AAAA-MM-DD`), `onValueChange`, `timeZone`, `clearable`, `disablePast` | prazo da O.S. (`p_due_date`) |
| `presetRange()`, `formatRange()` | `period-picker.tsx` | atalho → período no fuso; período → texto | — | filtros |
| `SearchCombobox` | `search-combobox.tsx` | combobox com busca, uma ou várias escolhas, "Cadastrar 'texto'" | `options` (`value`, `label`, `description`, `keywords`), `value`/`onValueChange`, `multiple`, `avatars`, `onCreate`, `loading` | cliente da O.S., técnicos |
| `StatCard` | `stat-card.tsx` | contador: número, rótulo, ícone, destaque, link | `label`, `value` (`null` = carregando), `icon`, `tone`/`toneClass`, `hint`, `highlight`, `render`/`href`/`onClick`, `size` | dashboard |
| `StatGrid`, `DASHBOARD_STATS` | `stat-card.tsx` | grade 2→4 colunas; os 8 contadores do `get_dashboard` com ícone, tom e quando destacar | — | dashboard |
| `Timeline` | `timeline.tsx` | linha do tempo genérica | `entries` (`icon`, `toneClass`, `actor`, `title`, `at`, `details`, `quote`), `timeZone`, `groupByDay`, `reverse`, `density` | histórico |
| `orderHistoryEntries()` | `timeline.tsx` | `service_order_history` → entradas (todos os eventos do 03 e do 04) | `events`, `{ timeZone, personName }` | histórico da O.S. |
| `AddressBlock` | `address-block.tsx` | endereço com "Abrir no mapa" | `address` (texto da O.S. ou `AddressParts`), `primary`, `deleted`, `hideMap`, `size` (`lg` no técnico), `actions` | detalhe da O.S., cliente |
| `ContactActions` | `address-block.tsx` | WhatsApp (`wa.me`) e ligar | `phone`, `message`, `showNumber`, `size`, `hideCall` | detalhe da O.S., cliente |
| `PhotoThumb` | `photos.tsx` | miniatura 4:3 com origem, horário e alerta | `photo` (`PhotoData`), `timeZone`, `size`, `hideMeta`, `onRemove` | grades |
| `PhotoGrid` | `photos.tsx` | grade com visualizador embutido | `photos`, `timeZone`, `density`, `onOpen` (controle externo), `onRemove`, `append` | execução, revisão |
| `PhotoLightbox` | `photos.tsx` | tela cheia: setas, ← →, deslizar, miniaturas, dados | `photos`, `index`, `open`, `onOpenChange`, `onIndexChange` | grades |
| `PhotoErrorProvider` | `photos.tsx` | contexto: avisa quando a imagem de uma foto não carrega (URL vencida, [photos.md](photos.md) F11) | `value` (`usePhotoUrlRenewal` da área) | layouts do escritório e do técnico |
| `PhotoMeta` | `photos.tsx` | origem, captura, chegada, local e alertas por extenso | `photo`, `timeZone` | lightbox, revisão |
| `AddPhoto` | `photos.tsx` | câmera (preferida) e galeria, só visual | `onCamera`, `onGallery`, `variant` (`bar`/`tile`), `showHint` | execução, complemento |
| `ExecutionCard` | `execution-card.tsx` | tentativa: status da revisão, alertas, quem e participantes, horários (aparelho × chegada), motivo/comentário, descrição, fotos e complementos | `attempt` (`AttemptData`), `timeZone`, `actions`, `hideSupplements`, `compactPhotos` | revisão, detalhe do técnico |
| `SupplementBlock` | `execution-card.tsx` | complemento: convertido, tardio, não visto, ciência | `supplement`, `timeZone` | dentro do `ExecutionCard`, lista de tardios |
| `AttemptsSection` | `attempts-section.tsx` | seção das tentativas da O.S.: título (e dica), da mais nova para a mais antiga num `ExecutionCard` cada, caixa tracejada sem nenhuma | `title`, `hint`, `empty`, `attempts` (na ordem de envio), `timeZone`, `compactPhotos(tentativa)`, `actions(tentativa)` | detalhe da O.S. (escritório e técnico) |
| `SyncIndicator` | `sync.tsx` | "atualizado às", enviando, na fila, sem conexão, com problema, login | `status` (`SyncStatus`), `timeZone`, `variant` (`pill`/`banner`), `render`/`onClick` | topo do técnico |
| `PendingItemCard` | `sync.tsx` | item da fila: tipo, O.S., estado, fotos enviadas, motivo da recusa, erro | `item` (`PendingItemData`), `timeZone`, `onRetry`, `onDiscard`, `onDismiss`, `onOpen` | Pendências |
| `ConfirmDialog` | `dialogs.tsx` | confirmação (com conteúdo extra opcional) | `title`, `description`, `confirmLabel`, `tone`, `onConfirm`, `children`, `trigger`/`open` | aprovar, dar ciência, sair com fila |
| `ReasonDialog` | `dialogs.tsx` | ação destrutiva com motivo obrigatório (vazio ou só espaços mostra `reason_required`/`comment_required`) | `title`, `description`, `label`, `confirmLabel`, `requiredCode`, `onConfirm(reason)`, `children` | cancelar O.S., rejeitar, excluir cliente/endereço, remover membro |
| `FormDialog` | `dialogs.tsx` | formulário em diálogo | `title`, `onSubmit`, `submitLabel`, `submitDisabled`, `size` | editar O.S., endereço, convite |
| `SidePanel`, `FormPanel` | `dialogs.tsx` | painel lateral (sheet) e formulário nele | `title`, `side` (`right`/`left`/`bottom`), `size`, `footer`; `onSubmit` | detalhe rápido, criar O.S. |
| `Brand` | `nav.tsx` | símbolo e nome do produto | `size`, `hideName` | topos, login |
| `TechnicianBottomNav` | `nav.tsx` | barra inferior (64 px, ícone + rótulo, contador) | `items` (`NavItem`: `id`, `label`, `icon`, `badge`, `active`, `render`/`href`/`onClick`), `position` | técnico |
| `OfficeSidebar` | `nav.tsx` | barra lateral escura com grupos | `groups`, `footer`, `collapsed` | escritório |
| `OfficeTopbar` | `nav.tsx` | topo com menu (estreito), título e ações | `onMenu`, `title`, `actions`, `showBrand` | escritório |
| `TechnicianShell` | `app-shell.tsx` | moldura do celular: topo com sincronização, uma coluna, barra inferior; densidade `touch` | `navItems`, `sync`, `title`, `headerActions`, `banner` | layout do técnico |
| `OfficeShell` | `app-shell.tsx` | moldura do escritório: lateral (vira menu abaixo de `lg`), topo, conteúdo largo | `groups`, `sidebarFooter`, `topbarTitle`, `topbarActions`, `banner`, `width` | layout do escritório |
| `UserAvatar` | `user.tsx` | iniciais com cor estável | `name`, `seed` (id), `size` (`xs`–`lg`), `decorative` | listas |
| `UserChip` | `user.tsx` | avatar, nome, linha de apoio, papel, "Você" | `name`, `subtitle`, `memberRole`, `isSelf`, `size` | membros, autor |
| `AvatarStack` | `user.tsx` | técnicos de uma O.S. (nomes na dica) | `people`, `max`, `showNames`, `empty` | listas, tabela |
| `tone.ts` | `tone.ts` | classes que ligam cada enum ao seu token (`statusVar`, `priorityVar`, `alertVar`, `flagVar`, `syncVar`, `toneVar`…) | — | selos próprios, pontos coloridos |

## Formatação (`src/lib/format.ts`)

| Função | Exemplo |
| --- | --- |
| `formatDate`, `formatTime`, `formatDateTime`, `formatDateShort`, `formatWeekday` | `13/11/2026`, `14:05`, `13/11/2026 14:05`, `13 de nov.`, `qui., 13 de nov.` (no `timeZone`) |
| `formatRelative`, `formatDue` | `agora`, `há 5 min.`, `há 3 h`, `ontem`, `em 3 dias`; depois de uma semana, a data curta |
| `calendarDay`, `dayDiff` | dia `AAAA-MM-DD` no fuso; diferença em dias de calendário |
| `formatOrderNumber` | `#0042` |
| `formatPhone`, `formatZipCode` | `(11) 98765-4321`, `01310-100` |
| `whatsappUrl`, `telUrl`, `mapsUrl` | `wa.me` com DDI 55, `tel:`, busca no Google Maps |
| `shortAddress` | `Rua das Acácias, 120 · Vila Mariana` (do texto da O.S.) |
| `initials`, `firstName`, `formatList`, `formatNumber`, `formatFileSize` | `AS`, `Ana`, `Ana, Bruno e Carla`, `1.234`, `412 KB` |

Enums como tipos e listas na ordem da spec: [`src/lib/enums.ts`](../src/lib/enums.ts).

## Tema

Tudo em [`src/index.css`](../src/index.css), claro em `:root` e escuro em `.dark`. Trocar a identidade é editar só ali.

| Camada | Tokens | Para |
| --- | --- | --- |
| Marca e superfícies | `--primary` (azul da marca), `--background`, `--card`, `--foreground`, `--muted-foreground`, `--border`, `--input`, `--ring`, `--sidebar-*` (lateral azul-marinho), `--chart-*` | padrão do shadcn; texto secundário e bordas mais fortes que o padrão, para o sol |
| Forma | `--radius` | cantos de tudo |
| Tons | `--tone-neutral`, `--tone-muted`, `--tone-brand`, `--tone-info`, `--tone-progress`, `--tone-warning`, `--tone-danger`, `--tone-success`; `--tone-soft-mix`, `--tone-text-mix`, `--tone-contrast`, `--tone-contrast-warning` | uma cor sólida por significado; o fundo suave e o texto dos selos saem dela por `color-mix` em oklab |
| Papéis semânticos | `--status-*` (6), `--priority-*` (4), `--service-*` (3), `--role-*` (3), `--review-*` (4), `--alert-*` (4 códigos), `--overdue`, `--unassigned`, `--late-supplement`, `--new-item`, `--sync-*` (5), `--whatsapp` | cada um aponta para um tom; trocar a cor de um status é trocar a linha dele |
| Densidade | `--density` por `data-density="compact"` (0,75), `comfortable` (1), `touch` (1,25); derivados `--space-row-y`, `--space-row-x`, `--space-card`, `--space-gap`, `--size-touch` | espaçamento de linhas, cartões e alvos; a interface do técnico usa `touch` |

**Utilitários de tom:** defina `--tone` (ex.: a classe `statusVar.open`, ou `[--tone:var(--tone-info)]`) e use `tone-soft` (fundo suave + texto + borda), `tone-solid`, `tone-outline`, `tone-text`, `tone-fill`, `tone-border` ou `tone-wash`. Selo sólido de tom claro (âmbar) usa `--tone-on` para o texto escuro.

**Como customizar:** cor da marca → `--primary` e `--sidebar-*` (nos dois modos); cor de um significado → o `--tone-*`; cor de um status ou alerta específico → a linha `--status-*`/`--alert-*` no bloco `:root, .dark`; arredondamento → `--radius`; aperto geral → os valores de `--density`.

## Dados de exemplo (`src/mocks/`)

Linhas tipadas por `database.types.ts` em `data.ts` (datas relativas ao carregamento, para "atrasada" e "há 5 min" valerem em qualquer dia), fotos SVG locais em `images.ts`; os tipos são as views de `src/lib/views.ts`. Só as implementações de exemplo das áreas (`src/office/mocks.ts`, `src/technician/api/mock.ts`) e a vitrine `/dev` importam de `@/mocks`; as telas usam a API da área. Fora do build de produção ([CLAUDE.md](../CLAUDE.md#convenções)).

| Conjunto | Conteúdo |
| --- | --- |
| Empresa | Fast Monitoramento, `America/Sao_Paulo` |
| Membros | dono (Ricardo), gestora (Juliana), 4 técnicos (Marcos, Diego, Paulo, Lucas) e 1 removido com motivo (André) |
| Clientes | 10, com 0 a 3 endereços (principal, sem endereço do cadastro rápido, endereço excluído) e 1 cliente excluído com O.S. antiga |
| O.S. | 15 (#0031–#0045): todos os status, prioridades e tipos; sem técnico, atrasadas (aberta, em execução, rejeitada), sem prazo, vencendo hoje, cancelada com tentativa anulada, uma com técnico tirado por remoção do membro |
| Execuções | pendente com complemento convertido e complemento com foto da galeria sem EXIF; rejeitada com motivo e nova tentativa enviada antes da rejeição (com foto da galeria anterior ao início); entregue com atraso; aprovada com comentário; complemento tardio visto e não visto |
| Histórico | eventos gerados de forma coerente com os dados (criação, atribuição, edição, troca de endereço, materiais, início, envios, revisões, ciência, cancelamento) |
| Auditoria | convite, troca de papel, remoção, edição da empresa |
| Aparelho do técnico (Marcos) | 6 itens de pendência (enviando com fotos, na fila, esperando rede, recusado `order_closed`, recusado `conflict`, bloqueado), estado da sincronização, O.S. "novas" no aparelho |

| Função | Imita |
| --- | --- |
| `listOrders(filtros)` | leitura de `service_orders` com cliente e técnicos; filtros `search`, `status`, `priority`, `service_type`, `technician_id`, `client_id`, `due_from`/`due_to`, `overdue`, `unassigned` |
| `listMyOrders(userId)` | "Minhas O.S." (atribuição ativa) com `is_new` |
| `getOrder(id ou número)` | detalhe com cliente, endereço, atribuições, tentativas com complementos e fotos (com alertas calculados por `src/photos/alerts.ts`) e histórico |
| `listOrderHistory(id)` | `service_order_history` com autor |
| `getDashboard()` | `get_dashboard` |
| `listPendingApproval()`, `listOverdue()`, `listLateSupplements()` | listas do dashboard |
| `listClients({search, includeDeleted})`, `getClient(id)` | clientes com endereço principal e O.S. em andamento; detalhe com endereços e O.S. |
| `listMembers({includeRemoved})`, `listTechnicians()`, `listAudit()` | membros com perfil e email; técnicos ativos; auditoria com autor e alvo |
| `listPendingItems()`, `getSyncState()` | fila e indicador do aparelho |
| `getSessionUser(papel)`, `getCompany()`, `getPerson(id)` | sessão simulada, empresa, nomes |
| `MOCK_USER_IDS`, `MOCK_TIME_ZONE`, `setMockLatency(ms)`, `samplePhotoUrl(cena, semente)` | ids por papel, fuso, latência simulada (250 ms), foto de exemplo |

## Decisões

- **2026-11-23** — Formulários com React Hook Form + Zod, sem estado e validação à mão em cada tela. *Por quê:* cada tela repetia `useState` por campo, `showErrors` e a conferência dos obrigatórios; o schema junta numa peça só o que bloqueia o envio e a mensagem de cada campo, e o endereço é conferido igual no diálogo e no cadastro do cliente. As bibliotecas já eram do projeto (login).
- **2026-11-13** — Cores por tom com `color-mix` em oklab, uma cor por significado. *Por quê:* um lugar só para trocar; oklch interpolaria o matiz pelo caminho curto e o âmbar misturado ao azul-marinho viraria rosa.
- **2026-11-13** — Componentes sem router, navegação por `render`. *Por quê:* as duas interfaces e a vitrine usam as mesmas peças; o tipo da rota fica na tela.
- **2026-11-13** — Tipos de props estruturais, não as views dos mocks. *Por quê:* a integração troca `src/mocks` sem mexer nos componentes.
- **2026-11-13** — Responsividade interna por container query (tabela, grade de fotos, filtros, contadores) e da moldura por media query. *Por quê:* a mesma peça cabe numa coluna estreita, num painel lateral ou na tela cheia.
- **2026-11-13** — Tabela de dados própria, sem TanStack Table. *Por quê:* ordenação e paginação simples bastam ao volume da Fast, e a v9 da biblioteca mudou a API.
- **2026-11-13** — Vitrine no celular por iframe de 390 px. *Por quê:* só assim as media queries valem como no aparelho.
- **2026-11-23** — Um `Notice` só para as duas interfaces (antes `Notice` no escritório e `Callout` no técnico), com `layout` `inline` e `stacked` que reproduzem os dois visuais sem mudança; o texto vai em `children`. *Por quê:* revisão do código: eram a mesma peça (tom, ícone, título, texto, ação) copiada em cada área; a diferença é só de densidade e de onde fica a ação. O `inline` mantém o `role="status"` que o do escritório tinha e o `stacked` continua sem, para não mudar o que o leitor de tela anuncia.
- **2026-11-23** — Os alertas por extenso da revisão viram `AlertList`, não um `layout` do `Notice`. *Por quê:* revisão do código: os itens eram montados à mão com `tone-soft` na tela; o visual (selo no lugar do título, sem ícone, texto menor) é outro, e forçá-lo no `Notice` mudaria o desenho de um dos dois.
