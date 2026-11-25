# Casos de borda

O P.O. lê isto antes de testar: o que vai parecer bug e é regra, e o que precisa da decisão dele (vira item no [pending.md](pending.md) se for bug).

## Precisam de decisão

| Onde | Situação | O que acontece | Tipo e proposta | Código |
| --- | --- | --- | --- | --- |
| Técnico e offline | Celular "conectado" sem dados de verdade (sinal fraco, 4G sem saldo, Wi-Fi sem internet): abrir Minhas O.S., abrir uma O.S. ou tocar "Atualizar" | a lista guardada some e aparece "sem conexão" (o aviso ainda diz "Sem sinal: lista de HH:MM"); a cópia guardada no aparelho perde a lista, e abrir de novo sem sinal fica vazio. Com o modo avião não acontece (o app espera a rede) | provável bug: mostrar o erro só quando não há lista guardada, e guardar a última leitura boa mesmo depois de uma falha. S | `technician/orders-page.tsx:119`, `order-detail-page.tsx:34`, `execution-page.tsx:49`, `technician/api/real/persist.ts:36` |
| Técnico e offline | Técnico tirou fotos na execução e ainda não tocou "Enviar"; nisso o parceiro envia, o escritório aprova ou cancela, ou o tira da O.S., e o celular relê com sinal | a O.S. passa a "Aguardando", "Aprovada" ou "Cancelada" (ou some), a execução diz "Esta O.S. não aceita envio novo agora", e o rascunho com as fotos fica inacessível: não aparece em Pendências nem tem "mandar ao escritório". Foto da câmera do app não está na galeria. O banco aceitaria (vira complemento ou fica registrada) | provável bug (04 R4 e R19: nenhuma prova fica presa no aparelho): deixar enviar o rascunho mesmo assim, ou listá-lo em Pendências com compartilhar e apagar. S–M | `technician/execution-page.tsx:55`, `order-detail/primary-action.tsx:31-40`, `technician/derive.ts:127` |
| Membros e acesso | Owner troca o papel de um técnico para gestor (ou owner) enquanto há envio na fila do celular dele | no próximo acesso com sinal, o app abre o escritório, que não tem Pendências: a prova fica no aparelho sem tela; se o Background Sync mandar, é recusada ("Você não tem permissão") sem ninguém ver | dúvida: (a) aceitar e orientar "trocar o papel só depois de o técnico sincronizar"; (b) o escritório mostra as pendências deixadas pelo papel de técnico, com compartilhar | `app/access.ts:37`, `app/pages/gate.tsx:50`, `offline/queue/sync.ts:57` |
| Técnico e offline | Parceiro aperta "Iniciar" sem sinal; o outro envia, o gestor rejeita, e só depois o celular do parceiro volta | a O.S. sai de "Retrabalho" e fica "Em execução" com a hora antiga do início; o dashboard tira de retrabalho sem ninguém ter recomeçado | dúvida: (a) aceitar (o 04 R2 só cobre início antes do envio); (b) ignorar o início de O.S. rejeitada quando ele é mais antigo que a rejeição | `fast: execution_start_execution.sql:19` |
| Escritório | Escritório corrige o endereço no cadastro do cliente (erro de digitação) | as O.S. abertas continuam com o endereço antigo, e o técnico vai ao endereço errado; para corrigir, editar cada O.S., trocar para outro endereço, salvar e voltar. Já nome, telefone e observações do cliente mudam na hora em todas as O.S., inclusive nas antigas | dúvida (03 R3): (a) manter e avisar na edição do endereço; (b) ao editar o endereço, oferecer recopiar nas O.S. abertas que o usam | `fast: orders_update_order.sql:114-118`, `office/api/supabase.ts:369`, `lib/orders-query.ts:12` |
| Técnico e offline | Técnico não abre o app por mais de 3 dias (fim de semana com feriado) e abre num local sem sinal | Minhas O.S. vem vazia ou "sem conexão": a cópia guardada vence em 3 dias contados da última gravação, mesmo sem nada pendente | dúvida, código × doc (o offline.md diz que a O.S. sai do aparelho só 7 dias depois de encerrada ou quando o técnico sai dela): (a) aceitar; (b) validade de ~10 dias (janela de 7 + 3 sem sinal) | `technician/api/real/persist.ts:8` |
| Escritório | Duas pessoas do escritório editam a mesma O.S. ao mesmo tempo | quem salva por último sobrescreve sem aviso título, instruções, prioridade, prazo e endereço que o outro acabou de mudar; só materiais têm conflito; o histórico mostra a volta | dúvida: (a) aceitar (volume pequeno, duas pessoas); (b) `conflict` quando a O.S. mudou desde que o formulário abriu | `fast: orders_update_order.sql:67`, `office/orders/edit.ts:29` |
| Membros e acesso | Ex-técnico reconvidado que esqueceu a senha | o link do convite leva ao login (a conta já tem senha) e o "Link para definir senha" só existe para membro ativo; só o platform admin resolve, pelo painel | dúvida: (a) aceitar e pôr o caso no operations.md; (b) permitir o link de senha ao convidado que já foi membro da empresa (risco: o owner entra na conta de quem não aceitou) | `fast: members_links.sql:125` |
| Técnico e offline | Técnico anota material usado sem sinal; antes de subir, a O.S. é aprovada, cancelada, ou ele sai dela | Pendências mostra só "Materiais" e o motivo ("O status atual da O.S. não permite isso."); o texto que ele escreveu não aparece em lugar nenhum, e "Dispensar" o apaga | dúvida: (a) aceitar (03 R9); (b) mostrar o texto recusado no cartão, com copiar ou compartilhar. S | `technician/pending-page.tsx:135,155`, `offline/queue/processor.ts:152-156` |
| Fotos | Parceiro que não tocou "Iniciar" no próprio celular manda fotos da galeria | sem a hora de início no aparelho dele, o alerta "tirada antes do início" não é calculado; a foto antiga com data passa sem alerta | dúvida: (a) aceitar (photos.md F7); (b) usar o início da O.S. (evento `started`) quando o aparelho não tem o próprio | `photos/alerts.ts:20`, `technician/api/real/actions.ts:52` |

## É regra

| Onde | Situação | O que acontece | Regra |
| --- | --- | --- | --- |
| Escritório | Prazo "25/11" | só atrasa depois da meia-noite do dia 25, no fuso da empresa; aguardando aprovação nunca atrasa; sem prazo, nunca | 03 R5, R6 |
| Escritório | Serviço feito no prazo, sem sinal | fica "atrasada" no dashboard até o envio chegar; o alerta "Entregue depois do prazo" usa a hora em que o técnico tocou "Enviar", não a da chegada | 03 R6; 04 (alertas); queue.md Q5 |
| Escritório | Gestor aprova enquanto um complemento ainda está no celular | o complemento chega depois como "Complemento tardio", não conta como aprovado e fica no contador até alguém dar ciência | 04 R11 |
| Escritório | A dupla envia cada um a sua tentativa | a segunda vira "Convertido em complemento" da primeira; se a primeira já foi aprovada, vira complemento tardio; nunca duas pendentes | 04 R4, R8 |
| Escritório | Complemento feito enquanto aguardava, que chega depois da rejeição | entra como complemento tardio da tentativa rejeitada (só "dar ciência"); a O.S. segue em retrabalho e precisa de tentativa nova | 04 R5, R11 |
| Escritório | Cancelar O.S. enquanto o técnico trabalha sem sinal | o envio dele não é recusado: entra "Anulada", com "enviou depois do cancelamento (registrado, sem revisão)"; o técnico não é avisado | 04 R19; 03 R10 |
| Escritório | Tirar o técnico da O.S. enquanto ele trabalha sem sinal | o envio é recusado ("Você não está mais atribuído a esta O.S."); a prova fica só no celular, que oferece "Mandar ao escritório" (compartilhar, ex.: WhatsApp). Até o celular reler, ele ainda vê e inicia a O.S. | offline.md (Recusa definitiva); decisions 2026-11-24 |
| Escritório | Revisão: chega complemento com a tela aberta, ou outro gestor revisa antes | faixa "Chegou um complemento novo", aprovar e rejeitar travam até recarregar; quem chega depois vê o status atual | 04 R10 |
| Escritório | Mudar instrução, prazo ou endereço, ou cancelar, com o técnico sem sinal | o celular mostra a versão antiga até reler com sinal; nada avisa a mudança, só o "Atualizado às HH:MM" | offline.md (O que fica no aparelho) |
| Escritório | O.S. nova atribuída | o técnico não é avisado (sem push nem email); aparece com "Nova" quando o app relê com sinal; "Enviar pelo WhatsApp" manda o link. "Nova" é por aparelho: reinstalar marca todas | spec (Fora do escopo); 04 (Funcionalidades) |
| Escritório | Auditoria | só empresa, membros e papéis, e só o owner vê; cancelar O.S., aprovar e excluir cliente ficam no histórico da O.S. e no cliente; recusa de convite não entra | 05 R5; 06 R11 |
| Técnico e offline | Técnico removido da empresa com serviço feito sem sinal | ao abrir com sinal, o app apaga tudo do celular, inclusive o envio e as fotos, e vai ao login com "Seu acesso foi removido"; não há "mandar ao escritório" | offline.md (Proteção dos dados); queue.md Q10 |
| Técnico e offline | Envio guardado e app fechado | pode subir só quando o técnico abrir o app; o escritório não sabe que existe. Uma O.S. com muitas fotos em 2G segura as outras (~9 min para 20 fotos) | offline.md (Riscos); e2e.md T3 a T5 |
| Técnico e offline | Outro técnico entra no mesmo celular (sessão vencida ou "Entrar de novo") | a fila do primeiro fica parada e invisível até ele entrar de novo naquele celular | queue.md Q3 |
| Técnico e offline | "Sair" em qualquer aparelho, inclusive no computador | derruba o login da conta em todos os aparelhos; o celular com fila pede "Entrar de novo" e não apaga nada | decisions 2026-11-19 (logout global) |
| Técnico e offline | "Sair" no celular | apaga O.S., rascunhos e fotos do aparelho; com fila, diz quantas O.S. se perdem. Foto da câmera do app não fica na galeria | offline.md; queue.md Q10 |
| Técnico e offline | App abaixo da versão mínima | "Atualize o app" no lugar de todas as telas, inclusive Pendências; a fila da tela para, o que está no aparelho fica. Sem sinal, nada bloqueia | screens.md (Comum); queue.md (Versão mínima) |
| Técnico e offline | O.S. aprovada ou cancelada | fica em "Encerradas" por 7 dias depois da última alteração e some, também pela API; depois disso não há como complementar pelo app | 03 R14; decisions 2026-11-25 |
| Fotos | Foto da galeria recebida pelo WhatsApp, ou print | sem data: alerta "Foto da galeria sem data de captura" na revisão | 04 (Prova fotográfica); photos.md F2, F7 |
| Fotos | Técnico nega a localização | as fotos vão sem posição, e o escritório não recebe alerta disso | 04 (Prova fotográfica) |
| Fotos | Relógio do celular errado | horário das fotos da câmera e os alertas "antes do início" e "entregue com atraso" saem errados; a hora de chegada no servidor vai junto | e2e.md S2; offline.md (Idempotência) |
| Fotos | Mais de 30 fotos | o botão de adicionar dá lugar ao aviso do limite; o resto vai num complemento (outras 30) | 04 R20 |
| Fotos | Detalhe pequeno na foto (número de série) | a foto chega com no máximo 1600 px; o detalhe pode ficar ilegível no escritório | 04 (Prova fotográfica); photos.md F1 |
| Fotos | Técnico sem sinal abre fotos do parceiro | só abrem as da O.S. que ele já abriu com sinal | photos.md F8 a F10 |
| Membros e acesso | Convidado que ainda não aceitou | não aparece para atribuir O.S. | 03 R7; decisions 2026-11-24 |
| Membros e acesso | Link do convite | aparece uma vez só; "Gerar link de novo" invalida o que já foi mandado e conta no limite (20 por hora por owner, 50 por dia na empresa: "Muitos convites em pouco tempo"); o link vale 7 dias, o convite pendente não expira | 06 R7, R12 |
| Membros e acesso | Convidar quem já é membro ativo | "já é membro": nada muda, nem o papel | 06 R2 |
| Membros e acesso | Link de "definir senha" | troca a senha, mas o celular já logado da pessoa continua entrando (para cortar, remover); o owner que usa o link no próprio computador precisa sair da conta dele antes | 06 R14 e `use_link`; decisions 2026-11-24 |
| Membros e acesso | Trocar técnico de papel, ou removê-lo | as atribuições dele em O.S. abertas fecham, e elas viram "sem técnico"; nas encerradas a atribuição fica | 06 R4; decisions 2026-11-25 |
| Membros e acesso | Removido sem outra empresa | a conta é banida; o celular só percebe ao abrir com sinal ou ao renovar a sessão | 06 R8; offline.md |
| Membros e acesso | "Esqueci a senha" | o app não manda email: pede o link ao owner; o owner sozinho que esqueceu depende do platform admin | 06 R14; operations.md |

O mapa de casos de borda está pronto: [docs/edges.md](docs/edges.md). Commitei junto a entrada dele na lista de docs do CLAUDE.md (`3ac9f8c`), para você ler pelo IDE ou do outro PC. O agente classificou 41 situações: 2 prováveis bugs, 8 dúvidas e 31 regras. As 31 regras não pedem nada de você, só servem para não estranhar durante os testes.

Conferi o primeiro bug no código e ele existe: com qualquer falha de rede, a tela de Minhas O.S. troca a lista guardada pelo erro ([orders-page.tsx:119](src/technician/orders-page.tsx#L119)). Como o aparelho só grava leituras que deram certo, a lista também some da cópia local ([persist.ts:36](src/technician/api/real/persist.ts#L36)).

## As 10 decisões

| # | Situação | Tipo | Recomendo |
| --- | --- | --- | --- |
| 1 | Celular "conectado" mas sem internet de verdade: a lista guardada some e, sem sinal, o app abre vazio | bug, S | **corrigir**: mostrar o erro só quando não há lista guardada e manter a última leitura boa |
| 2 | O técnico tirou fotos e não enviou; o parceiro envia, ou a O.S. é aprovada ou cancelada. O rascunho com as fotos fica preso no celular, sem tela para enviar | bug, S–M | **corrigir**: deixar enviar o rascunho e o servidor decide. Ele vira complemento ou fica registrado; se o técnico não está mais na O.S., cai em Pendências com "mandar ao escritório", que já existe |
| 3 | Técnico vira gestor com envio na fila: a prova fica no celular sem tela | dúvida | **aceitar** e pôr no `operations.md`: "troque o papel só depois de o técnico sincronizar". É raro, e a opção (b) seria tela nova |
| 4 | "Iniciar" atrasado do parceiro tira a O.S. do retrabalho | dúvida | **aceitar**: a opção (b) compara a hora do celular com a da rejeição, e o relógio do celular não é confiável (é a linha "Relógio do celular errado" das regras) |
| 5 | Corrigir o endereço no cadastro do cliente não chega às O.S. abertas | dúvida | **(a) avisar** na edição do endereço que as O.S. abertas mantêm o endereço antigo. S, só texto; a (b) é funcionalidade nova |
| 6 | A cópia no celular vence em 3 dias, mas o doc fala em 7 | dúvida | **(b) cerca de 10 dias** (os 7 da janela mais 3 sem sinal). Muda uma constante e alinha código e doc |
| 7 | Duas pessoas do escritório editam a mesma O.S.: o último a salvar vence | dúvida | **aceitar**: o escritório é pequeno, e o histórico mostra a volta |
| 8 | Ex-técnico convidado de novo que esqueceu a senha: só o platform admin resolve | dúvida | **aceitar** e pôr no `operations.md`. A (b) reabriria o risco que fechamos no A1 |
| 9 | Materiais recusados: o texto do técnico some, e "Dispensar" apaga | dúvida | **(b) mostrar o texto recusado** no cartão de Pendências, com copiar. S, e evita perder o que ele escreveu |
| 10 | Fotos da galeria do parceiro que não tocou "Iniciar" passam sem o alerta "tirada antes do início" | dúvida | **aceitar**: já é a regra F7 |

Se seguir as recomendações, a etapa 3 ganha 5 itens de código: os bugs 1 e 2, o aviso do endereço (5), a validade de 10 dias (6) e o texto dos materiais recusados (9). Ganha também 2 linhas no `operations.md` (3 e 8), além das observações do cliente na tela do técnico, que já estavam na etapa. Os 2 pontos de partida que estavam no pending (as dúvidas 4 e 5) saem de lá, porque agora estão no `edges.md`.

Segue as recomendações ou quer mudar alguma?

