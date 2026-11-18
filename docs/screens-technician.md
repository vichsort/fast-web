# Telas do técnico

Mapa das telas da interface do técnico ([screens.md](screens.md#técnico-celular-offline)): rota, o que mostra, ações e estados. Feitas no scratch visual ([CLAUDE.md](../CLAUDE.md#scratch-visual)): leem `src/mocks/` pelas funções de [`src/technician/mocks.ts`](../src/technician/mocks.ts), que guardam em memória o efeito das ações (recarregar volta ao início). Regras de cada ação: [03](../../fast/docs/modules/03-service-orders.md), [04](../../fast/docs/modules/04-execution-photos.md), [offline.md](../../fast/docs/offline.md), [queue.md](queue.md), [photos.md](photos.md).

## Moldura

`TechnicianShell` do kit, pensado para 390 px, densidade `touch`.

| Parte | O que tem |
| --- | --- |
| Topo | marca e `SyncIndicator` (pill), que leva a Pendências |
| Faixa | `ScratchBanner` (só no scratch) |
| Barra inferior | Minhas O.S. (contador de "Nova"), Pendências (contador de itens), Perfil |
| Barra de ação | botão principal da tela preso acima da barra inferior (`ActionBar`), alvo de 48 px |

## Telas

| Rota | Tela | Mostra | Ações | Estados |
| --- | --- | --- | --- | --- |
| `/technician` | Minhas O.S. | saudação, "N a fazer · N atrasada(s) · Atualizado às HH:MM"; aviso de envios que precisam do técnico (recusados ou bloqueados) ou, sem eles, a faixa da fila; grupos **Refazer** (rejeitadas, com o motivo colado no cartão), **A fazer** (abertas e em execução, pelo prazo), **Aguardando aprovação** e **Encerradas** (aprovadas e canceladas, recolhido) | atualizar; abrir a O.S. | carregando, erro sem conexão, lista vazia, grupo vazio |
| `/technician/orders/$orderId` | Detalhe da O.S. | número, "Nova" (se ainda não aberta no aparelho), status, prioridade, atrasada; avisos de cancelada (com motivo), motivo da última rejeição (quem e quando), aguardando aprovação, aprovada, envios da O.S. na fila ou com problema; prazo, tipo, dupla; instruções; local com prévia de mapa; cliente com WhatsApp e ligar; materiais; envios (tentativas e complementos com fotos, do mais novo) | ação principal pelo status (abaixo); editar materiais; resolver `conflict`; complementar a tentativa pendente ou aprovada | carregando, erro, não encontrada |
| `/technician/orders/$orderId/execution` | Execução | hora do início (ou aviso para registrar), "rascunho salvo no aparelho", fotos (câmera ou galeria, com origem, hora e alerta), o que foi feito, quem participou | registrar início; tirar foto (câmera de exemplo em tela cheia); da galeria; remover foto; descartar rascunho (confirma); revisar e enviar | sem foto: botão desligado com o motivo (R3); status que não aceita envio novo ou envio já na fila: aviso e voltar |
| — (painel) | Revisão do envio | fotos, texto, participantes, alertas que o escritório vai ver (fotos da galeria, entregue com atraso, antes da rejeição) e o aviso da fila | enviar para aprovação | com sinal: "sobe uma foto por vez"; sem sinal: "entra na fila" |
| `/technician/orders/$orderId/supplement?attempt=` | Complemento | tentativa somada (número, revisão, quando, fotos); aviso de tardio se já revisada; fotos, texto, participantes | enviar complemento | sem texto e sem foto: botão desligado (R3); O.S. cancelada ou sem tentativa: aviso e voltar |
| `/technician/pending` | Pendências | indicador em faixa; **Precisam de você** (recusados com o motivo, bloqueados com o erro) e **Na fila** (enviando com o progresso das fotos, na fila, esperando rede); o texto e as fotos de cada envio | tentar agora (esperando rede, bloqueado); apagar rascunho recusado (confirma); dispensar recusa de início; abrir a O.S. (no `conflict`, para escolher o texto) | carregando, erro, tudo enviado |
| `/technician/profile` | Meu perfil | avatar, papel, empresa, email do login | editar nome (obrigatório) e telefone; sair (confirma; com itens na fila, avisa quantos se perdem) | sem sinal: salvar desligado |

**Ação principal do detalhe:**

| Status | Botão |
| --- | --- |
| `open` | Iniciar serviço (inicia e abre a execução) |
| `rejected` | Iniciar novo envio |
| `in_progress` | Continuar execução, ou "Continuar rascunho · N foto(s)" |
| `pending_approval`, `approved` | Mandar complemento (na tentativa pendente ou aprovada) |
| envio da O.S. na fila | nenhum: "quando ele chegar, dá para mandar complemento" |
| `cancelled` | nenhum |

## Só no scratch

| Parte | Hoje | Na integração |
| --- | --- | --- |
| Dados | `src/mocks` + estado em memória (`src/technician/mocks.ts`) | Supabase com cache persistido (TanStack Query no IndexedDB); rascunho, fila e recusas no Dexie |
| Técnico "logado" | Marcos dos mocks (`MOCK_USER_IDS.technician`), não o usuário do login | sessão real e o perfil dela |
| Câmera e galeria | visor com cena de exemplo; galeria alterna os casos da prova (antes do início, sem EXIF, normal) | `getUserMedia`, seletor de arquivo e `src/photos` (compressão, EXIF, localização, espaço) |
| Enviar | com sinal, aceito na hora (vira tentativa na tela); sem sinal, item novo na fila | sempre pela fila (`src/offline/queue`), uma foto por vez |
| Sem sinal | chave "Simular sem sinal" no perfil | "online" = último request que deu certo (queue.md, Q7) |
| Mapa | desenho local, sem tiles | o mesmo link; prévia pode virar imagem em cache |
| "Nova" | marcada ao abrir, em memória | IndexedDB (04) |
| Sair | real (`signOutAndWipe`); a contagem de pendências é a dos mocks | contagem da fila (Q10) |

## Decisões

- **2026-11-17** — Lista em grupos pelo que fazer (Refazer, A fazer, Aguardando, Encerradas recolhido), sem filtro. *Por quê:* poucas O.S. por técnico; o grupo já diz a próxima ação, e a rejeitada sobe com o motivo à vista.
- **2026-11-17** — Aprovadas e canceladas ficam em "Encerradas", não somem. *Por quê:* a aprovada ainda aceita complemento (04, R5) e a cancelada explica a recusa `order_closed` em Pendências. Pergunta aberta abaixo.
- **2026-11-17** — "Iniciar serviço" inicia e já abre a execução. *Por quê:* um toque a menos em campo; o início grava `client_started_at`, usado no alerta de foto da galeria.
- **2026-11-17** — Envio novo passa por um painel de revisão; complemento vai direto. *Por quê:* a tentativa é imutável e o escritório revisa por ela; o complemento só soma.
- **2026-11-17** — Participantes: a tentativa já vem com a dupla marcada; o complemento, só com quem envia. Quem saiu da O.S. aparece com o selo e pode ser marcado (R6). *Por quê:* a tentativa é feita em dupla; o complemento costuma ser de um só.
- **2026-11-17** — Com um envio da O.S. na fila, a tela não oferece envio novo nem complemento. *Por quê:* o complemento precisa da tentativa no servidor; um segundo envio viraria complemento (R4) sem o técnico querer.

## Pendências

- O.S. aprovada e cancelada na lista do técnico: o 03 (R14) mostra enquanto houver atribuição ativa, e o offline.md tira do cache. Confirmar se "Encerradas" fica ou se elas somem da lista.
- Complemento numa tentativa rejeitada: o 04 (R5) aceita; a tela só oferece tentativa nova. Confirmar.
