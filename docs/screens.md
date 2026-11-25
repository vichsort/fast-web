# Telas

Um PWA, duas interfaces escolhidas pelo papel depois do login ([spec](decisions.md#arquitetura)). O que cada tela pode fazer e os erros possíveis estão nos módulos do backend; aqui fica o que existe, para quem e como se navega. O mapa detalhado (rotas, ações, estados) está em [screens-technician.md](screens-technician.md) e [screens-office.md](screens-office.md).

## Comum

| Tela            | Para                             | Backend                                                     |
| --------------- | -------------------------------- | ----------------------------------------------------------- |
| Login           | todos                            | Auth ([01](../../fast/docs/modules/01-foundation.md))       |
| Esqueci a senha | todos                            | nenhum: pede o link ao responsável ([06](../../fast/docs/modules/06-members.md), R14) |
| Link (`/link`)  | quem abriu o link do convite ou de "definir senha" | `open_link`, `use_link` ([06](../../fast/docs/modules/06-members.md), R12 a R14) |
| Convite         | quem tem convite pendente e nenhum vínculo aceito | `my_invites`, `accept_invite`, `decline_invite` ([06](../../fast/docs/modules/06-members.md), R10 e R11) |
| Meu perfil      | todos                            | `profiles` ([01](../../fast/docs/modules/01-foundation.md)); trocar a senha (pede a atual: entra de novo com ela e troca, [`change-password.ts`](../src/app/change-password.ts)) |
| Atualize o app  | quem está abaixo da versão mínima | `app_settings` ([01](../../fast/docs/modules/01-foundation.md), R8) |

Depois do login: `technician` vai para a interface do técnico; `owner` e `manager`, para a do escritório. Sem vínculo ativo e aceito (removido ou empresa excluída), o app apaga os dados do usuário e volta ao login com o aviso ([offline.md](../../fast/docs/offline.md#proteção-dos-dados-no-aparelho)); com convite pendente, apaga os dados, fica na conta e mostra "Convite" (aceitar leva à interface do papel; recusar o último sai da conta com o aviso de recusa). O convite não fica guardado no aparelho: sem sinal, vale o último acesso guardado. O sistema não manda email: o link do convite e o de "definir senha" são `/link#<token>`, que o owner gera na tela de membros. A página tira o token da URL; recuperação e convite de conta nova pedem a senha nova e entram; convite de conta com senha leva ao login com o email preenchido; link que não vale diz para pedir outro; com outra conta aberta, pede para sair dela antes. Abaixo da versão mínima (`app_settings`, lida com sinal a cada 10 min e ao voltar à aba), a guarda das duas interfaces (`RequireAccess`) mostra "Atualize o app" no lugar da interface: o botão ativa o worker novo, ou recarrega sem ele ([`min-version.ts`](../src/app/min-version.ts)). Sem resposta, nada é bloqueado.

## Técnico (celular, offline)

| Tela            | O que tem                                                                                                                                                               | Backend                                                                                                  |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Minhas O.S.     | lista das O.S. atribuídas, "atualizado às HH:MM", badge de não aberta neste aparelho, aviso de itens na fila                                                            | [03](../../fast/docs/modules/03-service-orders.md), [04](../../fast/docs/modules/04-execution-photos.md) |
| Detalhe da O.S. | instruções, endereço com link para o mapa, WhatsApp do cliente, materiais (editável offline), resultado e motivo da última rejeição, tentativas e complementos enviados | [03](../../fast/docs/modules/03-service-orders.md), [04](../../fast/docs/modules/04-execution-photos.md) |
| Execução        | iniciar, fotos (câmera ou galeria), descrição, participantes, enviar                                                                                                    | [04](../../fast/docs/modules/04-execution-photos.md), [photos.md](photos.md), [queue.md](queue.md)       |
| Complemento     | texto e fotos que somam a uma tentativa                                                                                                                                 | [04](../../fast/docs/modules/04-execution-photos.md)                                                     |
| Pendências      | cada item da fila e seu estado, recusas com o motivo, rascunhos recusados                                                                                               | [queue.md](queue.md)                                                                                     |

## Escritório (computador, online)

| Tela                   | O que tem                                                                                                          | Backend                                                                      |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| Dashboard              | contadores; listas aguardando aprovação, atrasadas e complementos tardios                                          | [05](../../fast/docs/modules/05-dashboard-audit.md)                          |
| O.S.                   | lista com filtros, criar, editar, atribuir, materiais, cancelar, histórico                                         | [03](../../fast/docs/modules/03-service-orders.md)                           |
| Revisão                | tentativa pendente, complementos e fotos com origem, horário e alertas; aprovar, rejeitar, dar ciência dos tardios | [04](../../fast/docs/modules/04-execution-photos.md), [photos.md](photos.md) |
| Clientes               | lista, cadastro, endereços, histórico de O.S., excluir                                                             | [02](../../fast/docs/modules/02-clients.md)                                  |
| Empresa (owner)        | dados cadastrais e fuso                                                                                            | [01](../../fast/docs/modules/01-foundation.md)                               |
| Membros (owner)        | convidar, trocar papel, remover                                                                                    | [06](../../fast/docs/modules/06-members.md)                                  |
| Auditoria (owner)      | quem mudou empresa, membros e papéis                                                                               | [05](../../fast/docs/modules/05-dashboard-audit.md)                          |
