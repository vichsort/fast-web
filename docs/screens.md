# Telas

Um PWA, duas interfaces escolhidas pelo papel depois do login ([spec](../../fast/docs/spec.md#decisões-de-arquitetura)). O que cada tela pode fazer e os erros possíveis estão nos módulos do backend; aqui fica o que existe, para quem e como se navega. Rascunho inicial: cada tela ganha detalhe (campos, estados, offline) quando entrar no [roadmap](roadmap.md).

## Comum

| Tela            | Para                             | Backend                                                     |
| --------------- | -------------------------------- | ----------------------------------------------------------- |
| Login           | todos                            | Auth ([01](../../fast/docs/modules/01-foundation.md))       |
| Recuperar senha | todos                            | Auth                                                        |
| Definir senha   | quem chegou pelo link do convite | Auth ([06](../../fast/docs/modules/06-members.md))          |
| Meu perfil      | todos                            | `profiles` ([01](../../fast/docs/modules/01-foundation.md)) |

Depois do login: `technician` vai para a interface do técnico; `owner` e `manager`, para a do escritório.

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
| Importação de clientes | CSV com erros e possíveis duplicados por linha                                                                     | [02](../../fast/docs/modules/02-clients.md) (depois do primeiro deploy)      |
