# Telas do técnico

Mapa das telas da interface do técnico ([screens.md](screens.md#técnico-celular-offline)): rota, o que mostra, ações e estados. As telas leem e chamam só [`src/technician/api`](../src/technician/api/types.ts) (`TechnicianApi`): a implementação real ([`api/real/`](../src/technician/api/real/)) ou, com `VITE_DATA_SOURCE=mock`, os dados de exemplo de [`src/technician/mocks.ts`](../src/technician/mocks.ts), em memória (recarregar volta ao início). Regras de cada ação: [03](../../fast/docs/modules/03-service-orders.md), [04](../../fast/docs/modules/04-execution-photos.md), [offline.md](../../fast/docs/offline.md), [queue.md](queue.md), [photos.md](photos.md).

## Moldura

`TechnicianShell` do kit, pensado para 390 px, densidade `touch`.

| Parte | O que tem |
| --- | --- |
| Topo | marca e `SyncIndicator` (pill), que leva a Pendências |
| Faixa | `ScratchBanner` (só nos dados de exemplo) |
| Barra inferior | Minhas O.S. (contador de "Nova"), Pendências (contador de itens: vermelho com recusado ou bloqueado, neutro se tudo só espera a vez ou a rede), Perfil |
| Barra de ação | botão principal da tela preso acima da barra inferior (`ActionBar`), alvo de 48 px |

## Telas

| Rota | Tela | Mostra | Ações | Estados |
| --- | --- | --- | --- | --- |
| `/technician` | Minhas O.S. | saudação, "N a fazer · N atrasada(s) · Atualizado às HH:MM"; aviso de armazenamento não protegido (o navegador negou o persistente, [queue.md](queue.md), Q12); um aviso só da fila, com "ver pendências": com recusados ou bloqueados, vermelho, com quantas O.S. precisam do técnico e quantas mais têm envio no aparelho; sem eles, "N O.S. com envio ainda no aparelho" (contagem por O.S., não por item da fila); grupos **Refazer** (rejeitadas, com o motivo colado no cartão), **A fazer** (abertas e em execução: atrasadas, prazo mais próximo com a prioridade desempatando, sem prazo pela prioridade, número), **Aguardando aprovação** (também a O.S. com envio novo ainda no aparelho, com o selo "Enviada · na fila", fora da conta de "a fazer" e sem atrasar) e **Encerradas** (aprovadas e canceladas nos últimos 7 dias, recolhido) | atualizar; abrir a O.S. | carregando, erro sem conexão, lista vazia, grupo vazio |
| `/technician/orders/$orderId` | Detalhe da O.S. | número, "Nova" (se ainda não aberta no aparelho), status, prioridade, atrasada; avisos de cancelada (com motivo), motivo da última rejeição (quem e quando), aguardando aprovação, aprovada, envios da O.S. na fila ou com problema; prazo, tipo, dupla; instruções; local com prévia de mapa; cliente com WhatsApp e ligar; materiais; envios (tentativas e complementos com fotos, do mais novo) | ação principal pelo status (abaixo); editar materiais; resolver `conflict`; complementar a tentativa pendente ou aprovada | carregando, erro, não encontrada |
| `/technician/orders/$orderId/execution` | Execução | ao refazer, o motivo da última rejeição, com quem e quando, e que as fotos e o texto da tentativa anterior continuam na O.S. (a prova é a soma das tentativas, [decisão](decisions.md#telas) de 2026-11-24); hora do início (ou aviso para registrar), "rascunho salvo no aparelho", fotos (câmera ou galeria, com origem, hora e alerta), o que foi feito, quem participou | registrar início; tirar foto (câmera de exemplo em tela cheia); da galeria; remover foto; descartar rascunho (confirma); revisar e enviar | sem foto: botão desligado com o motivo (R3); status que não aceita envio novo ou envio já na fila: aviso e voltar |
| — (painel) | Revisão do envio | ao refazer, "O escritório pediu: <motivo>"; fotos, texto, participantes, alertas que o escritório vai ver (fotos da galeria, entregue com atraso, antes da rejeição) e o aviso da fila | enviar para aprovação | com sinal: neutro até a resposta ("fica guardado no aparelho e sobe sozinho"); sem sinal: "entra na fila" |
| `/technician/orders/$orderId/supplement?attempt=` | Complemento | tentativa somada (número, revisão, quando, fotos); aviso de tardio se já revisada; fotos, texto, participantes | enviar complemento | sem texto e sem foto: botão desligado (R3); O.S. cancelada ou sem tentativa: aviso e voltar |
| `/technician/pending` | Pendências | indicador em faixa; **Precisam de você** (recusados com o motivo, bloqueados com o erro) e **Na fila** (enviando com o progresso das fotos, na fila, esperando rede); um cartão por serviço: o início e o envio da mesma O.S. (os dois na fila, ou os dois recusados) ficam num cartão só, "Início e envio para aprovação", com o estado do início, que vai à frente, e as ações valendo para os dois; número, título e cliente da O.S. em cada item, mesmo depois de ela sair do aparelho (o técnico tirado dela; vêm do retrato guardado ao agir, `OrderSnapshot` em [`db.ts`](../src/offline/db.ts)), com o aviso de que saiu; no `order_closed`, o motivo do cancelamento; o texto e as fotos de cada envio | entrar de novo, com a fila parada pedindo login (só a sessão deste aparelho sai, nada é apagado); tentar agora (esperando rede, bloqueado); mandar ao escritório o envio recusado (compartilhamento do celular, com o resumo de [`share.ts`](../src/technician/share.ts) e as fotos; só onde há Web Share), o destaque do cartão; apagar rascunho recusado (confirma); dispensar recusa de início; abrir a O.S. (só com ela no aparelho; no `conflict`, para escolher o texto) | carregando, erro, tudo enviado |
| `/technician/profile` | Meu perfil | avatar, papel, empresa, email do login, versão do app | editar nome (obrigatório) e telefone; sair (confirma; com pendências, diz quantas O.S. se perdem, e "Ver pendências" vem primeiro, "Sair e apagar" por último) | sem sinal: salvar desligado |

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
