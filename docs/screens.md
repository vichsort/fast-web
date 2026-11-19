# Telas

Um PWA, duas interfaces escolhidas pelo papel depois do login ([spec](../../fast/docs/spec.md#decisões-de-arquitetura)). O que cada tela pode fazer e os erros possíveis estão nos módulos do backend; aqui fica o que existe, para quem e como se navega. Rascunho inicial: cada tela ganha detalhe (campos, estados, offline) quando entrar no [roadmap](roadmap.md). O mapa detalhado do scratch visual está em [screens-technician.md](screens-technician.md) e [screens-office.md](screens-office.md).

## Comum

| Tela            | Para                             | Backend                                                     |
| --------------- | -------------------------------- | ----------------------------------------------------------- |
| Login           | todos                            | Auth ([01](../../fast/docs/modules/01-foundation.md))       |
| Recuperar senha | todos                            | Auth                                                        |
| Definir senha   | quem chegou pelo link do convite | Auth ([06](../../fast/docs/modules/06-members.md))          |
| Meu perfil      | todos                            | `profiles` ([01](../../fast/docs/modules/01-foundation.md)) |

Depois do login: `technician` vai para a interface do técnico; `owner` e `manager`, para a do escritório. Sem vínculo ativo (removido ou empresa excluída), o app apaga os dados do usuário e volta ao login com o aviso ([offline.md](../../fast/docs/offline.md#proteção-dos-dados-no-aparelho)). Os links de email do Auth (convite e recuperação) abrem a raiz do app (`site_url`), que leva a "definir senha"; link expirado ou já usado avisa no login.

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

## Decisões

- **2026-11-13** — Usuário em mais de uma empresa entra na do vínculo mais antigo; sem troca de empresa no MVP. *Por quê:* só há um cliente; a troca entra com o segundo.
- **2026-11-13** — Platform admin sem vínculo vê um aviso e o botão de sair, sem tela. *Por quê:* a spec deixa a administração de empresas para o painel do Supabase até o segundo cliente; sem o aviso, ele seria tratado como removido.
- **2026-11-13** — Sem sinal, o app abre com o último acesso guardado no aparelho; sem nada guardado, pede conexão. *Por quê:* falha de rede nunca pode ser lida como remoção, senão o app apagaria a prova de quem só está sem sinal.
- **2026-11-13** — Servidor de desenvolvimento na porta 3000 (`127.0.0.1`). *Por quê:* é o `site_url` do Auth local no backend; os links do convite e da senha abrem no app sem mudar o backend.

