# Telas do técnico

Mapa das telas da interface do técnico ([screens.md](screens.md#técnico-celular-offline)): rota, o que mostra, ações e estados. As telas leem e chamam só [`src/technician/api`](../src/technician/api/types.ts) (`TechnicianApi`): a implementação real ([`api/real/`](../src/technician/api/real/)) ou, com `VITE_DATA_SOURCE=mock`, os dados de exemplo de [`src/technician/mocks.ts`](../src/technician/mocks.ts), em memória (recarregar volta ao início). Regras de cada ação: [03](../../fast/docs/modules/03-service-orders.md), [04](../../fast/docs/modules/04-execution-photos.md), [offline.md](../../fast/docs/offline.md), [queue.md](queue.md), [photos.md](photos.md).

## Moldura

`TechnicianShell` do kit, pensado para 390 px, densidade `touch`.

| Parte | O que tem |
| --- | --- |
| Topo | marca e `SyncIndicator` (pill), que leva a Pendências |
| Faixa | `ScratchBanner` (só nos dados de exemplo) |
| Barra inferior | Minhas O.S. (contador de "Nova"), Pendências (contador de itens), Perfil |
| Barra de ação | botão principal da tela preso acima da barra inferior (`ActionBar`), alvo de 48 px |

## Telas

| Rota | Tela | Mostra | Ações | Estados |
| --- | --- | --- | --- | --- |
| `/technician` | Minhas O.S. | saudação, "N a fazer · N atrasada(s) · Atualizado às HH:MM"; aviso de armazenamento não protegido (o navegador negou o persistente, [queue.md](queue.md), Q12); aviso de envios que precisam do técnico (recusados ou bloqueados) ou, sem eles, a faixa da fila; grupos **Refazer** (rejeitadas, com o motivo colado no cartão), **A fazer** (abertas e em execução, pelo prazo), **Aguardando aprovação** e **Encerradas** (aprovadas e canceladas nos últimos 7 dias, recolhido) | atualizar; abrir a O.S. | carregando, erro sem conexão, lista vazia, grupo vazio |
| `/technician/orders/$orderId` | Detalhe da O.S. | número, "Nova" (se ainda não aberta no aparelho), status, prioridade, atrasada; avisos de cancelada (com motivo), motivo da última rejeição (quem e quando), aguardando aprovação, aprovada, envios da O.S. na fila ou com problema; prazo, tipo, dupla; instruções; local com prévia de mapa; cliente com WhatsApp e ligar; materiais; envios (tentativas e complementos com fotos, do mais novo) | ação principal pelo status (abaixo); editar materiais; resolver `conflict`; complementar a tentativa pendente ou aprovada | carregando, erro, não encontrada |
| `/technician/orders/$orderId/execution` | Execução | hora do início (ou aviso para registrar), "rascunho salvo no aparelho", fotos (câmera ou galeria, com origem, hora e alerta), o que foi feito, quem participou | registrar início; tirar foto (câmera de exemplo em tela cheia); da galeria; remover foto; descartar rascunho (confirma); revisar e enviar | sem foto: botão desligado com o motivo (R3); status que não aceita envio novo ou envio já na fila: aviso e voltar |
| — (painel) | Revisão do envio | fotos, texto, participantes, alertas que o escritório vai ver (fotos da galeria, entregue com atraso, antes da rejeição) e o aviso da fila | enviar para aprovação | com sinal: "sobe uma foto por vez"; sem sinal: "entra na fila" |
| `/technician/orders/$orderId/supplement?attempt=` | Complemento | tentativa somada (número, revisão, quando, fotos); aviso de tardio se já revisada; fotos, texto, participantes | enviar complemento | sem texto e sem foto: botão desligado (R3); O.S. cancelada ou sem tentativa: aviso e voltar |
| `/technician/pending` | Pendências | indicador em faixa; **Precisam de você** (recusados com o motivo, bloqueados com o erro) e **Na fila** (enviando com o progresso das fotos, na fila, esperando rede); o texto e as fotos de cada envio | entrar de novo, com a fila parada pedindo login (só a sessão deste aparelho sai, nada é apagado); tentar agora (esperando rede, bloqueado); apagar rascunho recusado (confirma); dispensar recusa de início; abrir a O.S. (no `conflict`, para escolher o texto) | carregando, erro, tudo enviado |
| `/technician/profile` | Meu perfil | avatar, papel, empresa, email do login, versão do app | editar nome (obrigatório) e telefone; sair (confirma; com itens na fila, avisa quantos se perdem) | sem sinal: salvar desligado |

**Ação principal do detalhe:**

| Status | Botão |
| --- | --- |
| `open` | Iniciar serviço (inicia e abre a execução) |
| `rejected` | Iniciar novo envio |
| `in_progress` | Continuar execução, ou "Continuar rascunho · N foto(s)" |
| `pending_approval`, `approved` | Mandar complemento (na tentativa pendente ou aprovada) |
| envio da O.S. na fila | nenhum: "quando ele chegar, dá para mandar complemento" |
| `cancelled` | nenhum |

## Seções das telas

Cada bloco visual das telas grandes é um componente com nome, na ordem da tela, para apontar numa revisão.

| Rota | Pasta | Seções |
| --- | --- | --- |
| `/technician/orders/$orderId` | [`order-detail/`](../src/technician/order-detail/) | `OrderDetailHeader`; `StatusNotices` (`CancelledNotice`, `RejectedNotice`, `WaitingNotice`, `ApprovedNotice`); `QueueNotice` (fila ou problema, com "ver pendências"); `OrderSummarySection` (prazo, tipo, dupla); `InstructionsSection`; `AddressSection` (prévia de mapa); `ClientSection`; `MaterialsSection` ([`materials-section.tsx`](../src/technician/materials-section.tsx)); `OrderAttemptsSection` (envios); `PrimaryAction` (barra de ação) |

## Dados

| Parte | Real (`api/real/`) | Dados de exemplo |
| --- | --- | --- |
| Leituras | O.S. pelo RLS (03, R14) com o select do escritório (`src/lib/orders-query.ts`); cache do TanStack Query no Dexie (`cache`, por usuário, 3 dias) | `src/mocks` + estado em memória |
| Efeito local | rascunhos, fotos, fila e recusas do Dexie (`liveQuery`), juntos com o servidor em [`derive.ts`](../src/technician/derive.ts): iniciada no aparelho conta como em execução; materiais na fila e `conflict` por cima do texto do servidor | o mesmo, em memória |
| Ações | gravam no Dexie e acordam a fila (`processQueue` sob o `webLock`); o perfil é update direto, só com sinal | efeito em memória e aviso dos dados de exemplo |
| Fila | roda ao abrir, ao voltar o sinal, ao voltar para a aba e depois de cada ação; esperando rede, tenta de novo na hora marcada | — |
| Técnico logado | sessão real; o fuso é o da empresa | Marcos dos mocks |
| Câmera e galeria | `getUserMedia` (câmera traseira), posição pelo `watchPosition`, aviso de pouco espaço; galeria pelo seletor de arquivo; `src/photos` processa | visor e galeria de exemplo |
| Sem sinal | "online" = último request que deu certo (queue.md, Q7) | chave "Simular sem sinal" no perfil |
| "Nova" | tabela `seen` do Dexie, por usuário | em memória |
| Fotos do servidor | guardadas como arquivo ao abrir a O.S. e mostradas pelo arquivo, inclusive sem sinal ([photos.md](photos.md), F8 a F10) | URLs de exemplo |
| Mapa | desenho local, sem tiles | o mesmo |

## Decisões

- **2026-11-17** — Lista em grupos pelo que fazer (Refazer, A fazer, Aguardando, Encerradas recolhido), sem filtro. *Por quê:* poucas O.S. por técnico; o grupo já diz a próxima ação, e a rejeitada sobe com o motivo à vista.
- **2026-11-17** — Aprovadas e canceladas ficam em "Encerradas", não somem. *Por quê:* a aprovada ainda aceita complemento (04, R5) e a cancelada explica a recusa `order_closed` em Pendências.
- **2026-11-19** — "Encerradas" só com as dos últimos 7 dias depois do fechamento (`updated_at`, que nada muda depois de aprovar ou cancelar); a consulta já filtra e a lista em cache também. Com elas saem do aparelho as fotos guardadas ([photos.md](photos.md), F10). *Por quê:* a atribuição continua ativa depois de fechar (03, R14), então a lista e o cache cresceriam sem fim; a janela ainda cobre o complemento esquecido logo depois da aprovação e a explicação do `order_closed`.
- **2026-11-19** — Sem complemento em tentativa rejeitada, embora o 04 (R5) aceite: depois da rejeição, a tela só oferece tentativa nova. *Por quê:* o complemento não muda o status; a O.S. ficaria `rejected` e o escritório só daria ciência de um tardio, sem revisar de novo, enquanto o técnico acha que resolveu.
- **2026-11-17** — "Iniciar serviço" inicia e já abre a execução. *Por quê:* um toque a menos em campo; o início grava `client_started_at`, usado no alerta de foto da galeria.
- **2026-11-17** — Envio novo passa por um painel de revisão; complemento vai direto. *Por quê:* a tentativa é imutável e o escritório revisa por ela; o complemento só soma.
- **2026-11-17** — Participantes: a tentativa já vem com a dupla marcada; o complemento, só com quem envia. Quem saiu da O.S. aparece com o selo e pode ser marcado (R6). *Por quê:* a tentativa é feita em dupla; o complemento costuma ser de um só.
- **2026-11-17** — Com um envio da O.S. na fila, a tela não oferece envio novo nem complemento. *Por quê:* o complemento precisa da tentativa no servidor; um segundo envio viraria complemento (R4) sem o técnico querer.
- **2026-11-19** — Contrato explícito (`TechnicianApi`) com duas implementações, a real e a de exemplo, escolhidas pela mesma chave do escritório (`VITE_DATA_SOURCE`). *Por quê:* as telas não sabem de onde vêm os dados, e os dados de exemplo continuam úteis para testar as telas depois.
- **2026-11-19** — Enviar põe sempre na fila e volta ao detalhe; a fila manda em seguida. *Por quê:* um caminho só (queue.md), com ou sem sinal; a tela não espera as fotos subirem.
- **2026-11-19** — Texto e participantes do envio ficam na tela e vão para o rascunho a cada alteração, em ordem (uma gravação por vez). *Por quê:* o rascunho salvo volta pelo `liveQuery` com atraso, o que faria o cursor pular; em ordem, duas fotos seguidas não criam dois rascunhos.
- **2026-11-19** — O cache das leituras guarda só consultas com sucesso e só do usuário da sessão. *Por quê:* o técnico abre o app sem sinal com a lista da última vez, sem misturar usuários no mesmo aparelho (offline.md).
- **2026-11-19** — Depois de uma passada da fila com recusa, o app confere o vínculo ativo (a leitura de acesso); sem vínculo, a porta de entrada apaga o aparelho e sai. *Por quê:* a remoção do membro é detectada pelo app (queue.md, 2026-11-13); a recusa por regra é o sinal de que algo mudou.
- **2026-11-19** — O aviso de armazenamento não protegido fica em Minhas O.S., não no perfil. *Por quê:* é onde o técnico passa o dia; o perfil quase não é aberto, e o risco (a prova sumir com o celular cheio) só some quando ele instala o app.
