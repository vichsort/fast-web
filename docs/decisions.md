# Decisões

Só as vigentes, com o porquê curto, por assunto; o histórico (inclusive o que foi substituído) fica no git. Decisão nova entra na seção do assunto, no mesmo commit do código; o que falta fica em [pending.md](pending.md).

## Processo

- **2026-11-24** — **Escopo travado até o MVP, por decisão do P.O.:** só se trabalha no que está em [pending.md](pending.md), na ordem das etapas. Pedido novo fora delas vai para "Bloqueado até o MVP" e não é implementado, nem por agente, nem "só uma coisinha". *Por quê:* os repositórios estão crescendo mais rápido que o produto; fechar o MVP vem antes de qualquer melhoria.
- **2026-11-25** — **Etapas até o MVP refeitas pelo P.O.:** a análise do banco também procura melhoria de schema, e o diagrama vira o fechamento da etapa 2, sobre o banco já corrigido; entra a etapa dos casos de borda antes do deploy; celular e entrega viram etapas separadas. *Por quê:* entender e discutir o banco antes de desenhá-lo, e achar bug de banco enquanto as migrations ainda se editam no lugar.
- **2026-11-24** — Docs enxutos: decisão vigente em uma ou duas linhas, sem histórico; o que o código ou o cabeçalho de um teste já diz não se repete em doc. *Por quê:* cada comportamento chegava a mexer em seis docs, e o mesmo fato vivia em três lugares.

## Front

### Build e versão

- **2026-11-24** — Versão semântica no `package.json` dos dois repositórios, começando em `0.0.0`; a `1.0.0` é a release 1, entregue à Fast. Major quebra o contrato (a mínima sobe junto), minor é funcionalidade, patch é correção. Lançamento por `npm version` ([README](../README.md#lançar)). *Por quê:* número legível e igual nos dois repositórios; nada guarda a versão de cada aparelho (não vale o custo nem o controle sobre o técnico).
- **2026-11-24** — Até a `1.0.0`, a produção do Pages sai da `main`, sem branch `release`, sem prévia e com um projeto Supabase só. A partir dela: produção da `release`, prévia da `main` ligada a um Supabase de teste. *Por quê:* escolha do usuário, simples enquanto não há uso real.
- **2026-11-24** — A versão nova entra sozinha, sem botão: na abertura ou na próxima troca de tela, nunca no meio de uma tela; câmera, seletor da galeria e gravações do rascunho seguram ([`app-update.ts`](../src/app/app-update.ts)). O escritório sabe pelo `version.json` do build e recarrega uma vez por versão e sessão. Abaixo da mínima, o app tenta atualizar uma vez e depois mostra o botão. *Por quê:* ninguém fica em versão velha, e a troca de tela é onde nada digitado se perde; as travas por sessão evitam recarga em laço com CDN atrasada.
- **2026-11-19** — Um pedaço do build por área (`pages.ts` com `lazyRouteComponent`); bibliotecas em grupos próprios (`codeSplitting.groups`). Pedaço que sumiu num deploy faz o TanStack Router recarregar a página uma vez. *Por quê:* o técnico em 2G não baixa o escritório, e o hash das bibliotecas não muda a cada deploy.
- **2026-11-24** — Cabeçalhos de segurança gerados no build como `dist/_headers` ([`security-headers.ts`](../src/lib/security-headers.ts)), com a origem do Supabase de cada build; o `vite preview` serve os mesmos. Zod com `jitless` (a CSP barra eval). *Por quê:* a CSP depende do build, e os E2E quebram se ela barrar o app.
- **2026-11-24** — Ícone do app é a marca provisória (`public/logo.svg`, ícones gerados no build); a logo da Fast fica em `docs/assets/`, fora do precache. *Por quê:* o escudo da Fast vira borrão em 48 px, e no `public/` cada técnico baixaria 272 KB sem uso.

### Telas (as duas interfaces)

- **2026-11-13** — Sem sinal, o app abre com o último acesso guardado; falha de rede nunca é lida como remoção. A consulta do acesso vai sem as repetições do postgrest-js. *Por quê:* senão o app apagaria a prova de quem só está sem sinal, ou esperaria 7 s para decidir.
- **2026-11-13** — Usuário em mais de uma empresa entra na do vínculo aceito mais antigo; platform admin sem vínculo vê um aviso e "sair". *Por quê:* sem seletor de empresa enquanto a Fast é a única cliente.
- **2026-11-24** — Sem vínculo aceito e com convite pendente: apaga os dados do aparelho, fica na conta e mostra o convite; recusar o último sai da conta. *Por quê:* a prova e os clientes da empresa antiga não vão para a nova.
- **2026-11-24** — Uma página `/link#<token>` para convite e recuperação: o token sai da URL; com outra conta aberta, pede para sair antes; conta com senha vai ao login com o email preenchido. `detectSessionInUrl: false`. *Por quê:* nenhum link do Auth chega ao app, e entrar por cima de outra conta pularia a limpeza do sair.
- **2026-11-19** — Nenhuma área importa da outra: o comum fica em `src/lib`; telas grandes divididas por bloco visual (nomes em "Seções das telas" dos docs de tela). *Por quê:* trabalhos paralelos numa área não quebram a outra.
- **2026-11-23** — Leituras do escritório valem 30 s; as do técnico ficam velhas na hora (a abertura com sinal relê). *Por quê:* cada foco na aba relia as listas inteiras do escritório.
- **2026-11-23** — Formulários com React Hook Form + Zod; diálogo continua aberto quando falta campo ou a ação é recusada. *Por quê:* uma regra por formulário, e nada digitado se perde.
- **2026-11-19** — Dados de exemplo atrás de `VITE_DATA_SOURCE=mock`, com o contrato escrito à mão (`OfficeApi`, `TechnicianApi`) e cumprido pelas duas implementações. *Por quê:* testar telas sem o backend sem o mock virar a fonte da verdade.

### Telas do escritório

- **2026-11-17** — Revisão em tela própria, mais antiga primeiro, com "Próxima O.S."; filtros da lista de O.S. na URL; erros que pedem ação (`stale_review`, `client_has_open_orders`, `last_owner`, `conflict`) numa faixa, não só no toast. *Por quê:* fotos pedem largura; o dashboard linka para a lista filtrada; o usuário precisa do próximo passo.
- **2026-11-23** — Editar a O.S. é um `update_order` só (materiais com `expected` só se mudaram; técnicos só se o conjunto mudou); no `conflict`, mostra os dois textos e só salva depois da escolha. *Por quê:* três chamadas salvavam pela metade e o segundo clique sobrescrevia o técnico.
- **2026-11-24** — Reatribuir, editar e cancelar O.S. em execução ou refazendo avisam do possível trabalho feito sem sinal. *Por quê:* o escritório tirava o técnico ou cancelava sem saber.
- **2026-11-19** — Listas lidas em blocos de 1000 com ordem fixa (`readAll`); a de O.S. pede só as colunas da linha; o banco filtra status, prioridade, tipo, cliente e atrasada, e a tela filtra busca, técnico, sem técnico e prazo sobre o cache. *Por quê:* o PostgREST corta em 1000 sem aviso; o volume da Fast cabe numa leitura por anos. Paginação no banco só com volume (pending, bloqueado).
- **2026-11-19** — CEP pelo ViaCEP direto do navegador, só com os campos que vieram (sem o `complemento` dele). Telefone vai ao banco só com dígitos. Sem tela de importação de clientes. *Por quê:* grátis e sem backend; o `complemento` do ViaCEP descreve a faixa do CEP; WhatsApp e busca precisam dos dígitos; a importação é uma carga só.
- **2026-11-19** — URLs das fotos só no detalhe e na revisão, reaproveitadas até perto de vencer e renovadas quando a imagem falha. *Por quê:* expiram em 5 min e custam uma chamada por 100 fotos.
- **2026-11-24** — Membros: o link do convite e o de "definir senha" aparecem só ao serem gerados (copiar ou compartilhar), montados pelo app com a própria origem; "Gerar link de novo" refaz o convite. Email só do convite pendente; aceito, nenhum. *Por quê:* o banco guarda só o hash; sem `SITE_URL` nos secrets; o email fica no Auth.
- **2026-11-24** — "Aprovadas no mês" do dashboard não é link. *Por quê:* a lista não filtra por data de aprovação, e o número não bateria.

### Telas do técnico

- **2026-11-17** — Minhas O.S. em grupos pelo que fazer (Refazer, A fazer, Aguardando, Encerradas recolhido); Encerradas só dos últimos 7 dias. *Por quê:* o grupo diz a próxima ação; a atribuição continua depois de fechar, então a lista cresceria sem fim.
- **2026-11-17** — "Iniciar" já abre a execução; envio novo passa por um painel de revisão, complemento vai direto; com envio da O.S. na fila, nada de envio novo nem complemento; sem complemento em tentativa rejeitada. *Por quê:* um toque a menos; a tentativa é imutável; o segundo envio viraria complemento sem querer; o complemento na rejeitada não volta à revisão.
- **2026-11-19** — Enviar sempre põe na fila e volta ao detalhe; o aviso é neutro ("ficou guardado e sobe sozinho") até a resposta. *Por quê:* um caminho só, com ou sem sinal; "com sinal" é só o último pedido que deu certo.
- **2026-11-24** — Envio recusado tem "Mandar ao escritório" (Web Share com resumo e fotos) como botão principal; Pendências nomeia a O.S. por um retrato gravado no item. *Por quê:* a prova de quem foi tirado da O.S. só existia no celular, sem nome.
- **2026-11-24** — Depois de um retrabalho, a prova é a soma das tentativas, e as telas dizem isso. *Por quê:* refotografar tudo é impossível às vezes, e o banco não cobraria.
- **2026-11-23** — Toast no topo, abaixo da área segura. *Por quê:* embaixo, cobria a barra de ação logo depois de enviar.

### Componentes

- **2026-11-13** — Cores por tom com `color-mix` em oklab; componentes sem router (navegação por `render`); responsividade interna por container query; tabela própria, sem TanStack Table. *Por quê:* um lugar para trocar cor (oklch deixava o âmbar rosa); a mesma peça serve às duas interfaces e à vitrine; o volume não pede a biblioteca.
- **2026-11-23** — Um `Notice` só para as duas interfaces, sempre `role="status"`; alertas por extenso da revisão são `AlertList`. *Por quê:* era a mesma peça copiada em cada área.

### Fila offline

- **2026-11-13** — Um item por vez no aparelho todo; fila sem React nem DOM, com API, lock e relógio injetados; worker só na interface do técnico. *Por quê:* sinal ruim disputa banda; o mesmo código roda na página e no worker; o escritório trabalha online.
- **2026-11-13** — `not_authenticated` é Sessão, não Regra; 429 é Servidor; uma renovação de sessão por item. *Por quê:* token vencido não pode virar recusa da prova; limite passageiro não é bug; sem limite, renovaria em laço.
- **2026-11-13** — Materiais: nova edição com item na fila troca o texto no lugar e mantém o `expected` original. *Por quê:* o 03 guarda só a última edição, e o `conflict` tem de aparecer se o servidor mudou.
- **2026-11-13** — Foto com PUT feito e confirmação pendente fica marcada no item (`stagedPhotoIds`): a retomada só confirma. Timeout de 60 s nas chamadas (5 min no PUT), inclusive na renovação do Auth. *Por quê:* reenviar 400 KB em 2G custa minutos; uma chamada pendurada seguraria a fila toda.
- **2026-11-19** — Espera crescente de 5 s a 1 min; indício de conexão (evento `online`, `sync`, qualquer resposta do Supabase) vence as esperas por rede. *Por quê:* com sinal de volta e sem indício, o envio ficava parado até o fim da espera.
- **2026-11-13** — Remoção do membro detectada pelo app (leitura do vínculo), não por código de erro. *Por quê:* as RPCs respondem `not_found` de propósito para não revelar outra empresa.
- **2026-11-19** — Logout global; a sessão sai antes de apagar os dados; leituras em memória saem quando o usuário da sessão muda (`forgetOnUserChange`); fila parada pedindo login tem "Entrar de novo" (só este aparelho, sem apagar). *Por quê:* celular perdido perde o acesso; o cache não volta no meio do logout; o técnico seguinte não vê o anterior; "Sair" apagaria a prova.
- **2026-11-19** — Pedir armazenamento persistente; o aviso de negado fica em Minhas O.S. e pede para instalar o app. *Por quê:* sem ele, o Chrome apaga a origem quando o celular enche.
- **2026-11-19** — Dexie com uma versão só (1) até o primeiro deploy; depois dele, toda mudança é versão nova com `upgrade()` testado. *Por quê:* nada foi publicado; os celulares de teste apagam os dados do site.

### Fotos no aparelho

- **2026-11-13** — Compressão sem web worker; acima de 5 MB baixa só a qualidade, recomeçando do original. *Por quê:* o worker da biblioteca baixa script de CDN (falha sem sinal); compressão sobre compressão estraga a foto.
- **2026-11-13** — Na galeria, data e posição vêm do EXIF; EXIF ilegível ou coordenada inválida vira nulo, nunca erro. *Por quê:* a posição de quem anexa não é a da foto; perder metadado é melhor que perder a prova.
- **2026-11-13** — Aviso com menos de 20 MB livres; `estimate()` que falha não bloqueia. *Por quê:* avisa antes de perder captura, sem impedir por falta de informação.
- **2026-11-19** — Fotos já vistas guardadas ao abrir a O.S., não ao baixar a lista. *Por quê:* baixar todas gastaria dados com fotos que o técnico talvez nunca abra.

### Testes

- **2026-11-19** — E2E só para o que cruza camadas (tela, fila, worker, banco); regra isolada no unit, RLS no pgTAP. Nenhum E2E muda estado global (o `globalSetup` só zera as tentativas de convite do owner do seed). *Por quê:* cada regra num lugar só; os testes rodam em paralelo.

## Backend

### Arquitetura

- **2026-11-04** — Sem servidor próprio (Supabase: Postgres, Auth, Edge Functions); fotos no R2; sem envelope nas respostas. *Por quê:* custo zero; o Storage Free (1 GB) forçaria o Pro; erros têm formato próprio.
- **2026-11-13** — Um PWA, duas interfaces pelo papel; front em repositório próprio, com o contrato nos docs do backend. *Por quê:* um login e um deploy; históricos independentes.
- **2026-11-24** — Contas no nome do usuário; Supabase em São Paulo; app em `*.pages.dev`. *Por quê:* o produto é do usuário e será oferecido a outras empresas; domínio próprio não serve para nada sem email.
- **2026-11-19** — O que a fila chama (RPCs e Edge Functions de foto) só muda de forma retrocompatível; a mudança que quebra vira função nova e a antiga fica pelo prazo offline mais o ciclo de atualização. *Por quê:* celular fica 3 dias sem sinal com itens da versão velha; `PGRST202` travaria a prova.
- **2026-11-24** — Texto com limite: 200 (nomes, títulos, endereço) e 4000 (texto livre); CHECK na coluna e `invalid_input` na RPC. *Por quê:* uma chamada de 50 MB enchia o banco; na fila, `23514` seria bug.
- **2026-11-06** — Dados do aparelho apagados cedo, não criptografados. *Por quê:* num PWA, criptografia só com senha digitada a cada abertura.

### 01 Fundação

- **2026-11-24** — O sistema não manda email: convite e recuperação são links de uso único que o owner manda (convite 7 dias, recuperação 24 h; um link novo invalida o anterior). O owner pode usar o link de recuperação para entrar na conta do membro; aceito, com auditoria. *Por quê:* sem SMTP, cota, spam nem domínio; o owner já controla a empresa inteira.
- **2026-11-24** — Trocar a senha pede a atual (o app entra de novo e troca, `secure_password_change`); senha mínima de 6. *Por quê:* o access token sozinho trocava a senha; o técnico digita no celular, e o limite de tentativas do Auth segura a adivinhação.
- **2026-11-19** — Versão mínima numa tabela de uma linha (`app_settings`), em semver, lida por todo logado. *Por quê:* quem decide que o app ficou velho é o backend.
- **2026-11-19** — Policies de leitura por conjunto (`member_company_ids`, `colleague_ids`, `assigned_order_ids`), nunca função por linha nem `exists` correlacionado. *Por quê:* medido: 132 ms → 1,4 ms (escritório) e 40 s → 7 ms (lista com estatísticas velhas).
- **2026-11-04** — Papel no vínculo, platform admin como flag; empresa cadastrada direto no banco; cadastro público fechado. *Por quê:* uma pessoa pode ter papéis em empresas diferentes; um cliente só; app privado.
- **2026-11-04** — `last_owner` em trigger; vínculo imutável em `company_id`/`user_id`; sem `truncate` para a service role; soft delete exige autor e motivo. *Por quê:* protege inclusive contra a service role; toda exclusão tem autor.

### 02 Clientes

- **2026-11-06** — `p_id` gerado no front em toda criação; repetição com outro dono é `forbidden`. *Por quê:* resposta perdida com retry não duplica; não é a mesma chamada.
- **2026-11-04** — Vários endereços por cliente, opcionais na criação; excluir o principal não promove outro. *Por quê:* confirmado pela Fast; cadastro rápido; escolher o novo principal é do escritório.
- **2026-11-25** — O técnico lê as observações do cliente (`clients.notes`). *Por quê:* elas servem ao campo (acesso, interfone, cuidados).
- **2026-11-06** — `import_clients` depois do primeiro deploy, com o formato do CSV real da Fast. *Por quê:* o CSV ainda não chegou.

### 03 Ordens de serviço

- **2026-11-25** — O técnico lê a O.S. encerrada (aprovada ou cancelada) só até 7 dias depois da última alteração, também pela API; a atribuição dela não fecha na remoção nem na troca de papel. *Por quê:* o convidado de novo não relê as antigas, e a O.S. concluída continua mostrando quem a fez.
- **2026-11-04** — `address` é cópia; O.S. pode nascer sem técnico; atribuições nunca são apagadas; `materials_notes` é texto único com `p_expected`; `pending_approval` não trava a O.S. *Por quê:* registra onde foi feito; o escritório cria antes de decidir a dupla; fica quem esteve e quando; a Fast não controla estoque; o gestor corrige enquanto revisa.
- **2026-11-06** — Obrigatórios só título e tipo; `update_order` substitui todos os campos e, desde 2026-11-23, muda materiais (com `p_update_materials`) e técnicos na mesma transação. *Por quê:* criação rápida; `null` tem um significado só; três RPCs sem transação salvavam pela metade.
- **2026-11-06** — `approved` → `invalid_status`; `cancelled` → `order_closed`; técnico sem atribuição → `not_assigned`. *Por quê:* o técnico precisa saber que saiu da O.S., não que ela sumiu.
- **2026-11-13** — Técnico lê só o endereço escolhido na O.S.; troca de endereço é o evento `address_changed`, que ele não lê. *Por quê:* o RLS filtra linhas, não campos do `metadata`.
- **2026-11-24** — O histórico copia o texto anterior e o novo de instruções e materiais. *Por quê:* o limite de texto já limita a cópia, e o `from` é a prova quando o texto muda depois que o técnico saiu.

### 04 Execução e fotos

- **2026-11-04** — A execução nasce no envio; segundo envio da dupla vira complemento; complemento depois da revisão é aceito sem contar como aprovado; lock na O.S. antes de validar status. *Por quê:* início e envio chegam juntos offline; nenhuma prova fica presa; dois envios simultâneos criariam duas tentativas.
- **2026-11-06** — Upload em três passos (URL na hora do envio, PUT no staging, confirmação copia para o final); a URL assina só o host, e tipo e tamanho são conferidos na confirmação. *Por quê:* o banco não enxerga o R2; a URL expira em minutos; URL por query não prende tipo nem tamanho; o staging impede trocar a foto depois da confirmação.
- **2026-11-13** — `received_at` e `reviewed_at` com `clock_timestamp()` depois do lock. *Por quê:* `now()` é o início da transação e daria hora anterior à revisão.
- **2026-11-13** — Risco aceito: duas confirmações simultâneas da mesma foto podem copiar o staging duas vezes. *Por quê:* janela de milissegundos que o app não produz; fechar pediria três estados novos no fluxo offline.
- **2026-11-24** — Até 30 fotos por execução (`too_many_photos`); envio em O.S. cancelada fica registrado como `voided`, sem revisão; envio de quem saiu da O.S. continua recusado. *Por quê:* cada foto fica no R2 para sempre; o serviço feito sem sinal é prova para cobrança; o front oferece mandar a prova recusada ao escritório.

### 05 Dashboard e auditoria

- **2026-11-04** — `get_dashboard` é `security invoker`; `pending_approval` não conta como atrasada; contadores de status não se sobrepõem. *Por quê:* reaproveita o RLS; a demora passa a ser do gestor; o total é soma do front.
- **2026-11-24** — Histórico e auditoria guardam o nome de quem fez no momento (`actor_name`, por trigger). *Por quê:* renomear o perfil reescrevia o passado.
- **2026-11-13** — `audit_logs` imutável também para a service role (só `select` e `insert`); `is_late` gravado no envio. *Por quê:* a chave de serviço está nas Edge Functions e no backup; a lista não junta duas linhas.

### 06 Membros

- **2026-11-04** — Membros por Edge Function, com as regras em funções do banco só da service role, que recebem `p_actor_id` e o ip (o último do `x-forwarded-for`). *Por quê:* convite exige a service role; o banco decide; os valores anteriores do header vêm do cliente.
- **2026-11-24** — Convite só vale depois do aceite: conta nova aceita ao definir a senha pelo link; quem tem conta aceita ou recusa no app. Até o aceite, o owner vê só o nome e o email do convite (`member_invites`, só do owner), e a resposta do `invite_member` é igual para email novo e existente. *Por quê:* o convite revelava o perfil de quem é de outra empresa e permitia enumerar emails.
- **2026-11-24** — Pendente não recebe O.S. e não conta como owner; recusado fica visível e é reaberto pelo próximo convite; pendente não expira (o owner cancela pela remoção). *Por quê:* técnico que nunca entra deixaria O.S. presa; o owner sabe o que houve.
- **2026-11-24** — Um vínculo aceito por pessoa: o convite a quem está ativo em outra empresa fica escondido até ela sair de lá. *Por quê:* o app não troca de empresa.
- **2026-11-24** — Conta criada pelo convite marcada com `password_pending` no `app_metadata`; o link gasta o token e aceita antes de gravar a senha. Aceite pelo app vai à auditoria sem ip; recusa não vai. *Por quê:* o Auth grava senha aleatória na conta sem senha; uso único pela transação; o nome de quem recusou revelaria o perfil.
- **2026-11-24** — Quem a remoção deixa sem empresa (e sem convite pendente) tem a conta banida; o convite seguinte tira o banimento. *Por quê:* o ex-membro renovava o token e gastava cota.
- **2026-11-24** — Limite de convites: 20 por owner por hora, 50 por empresa em 24 h. *Por quê:* cada convite cria conta e serve para sondar emails.
- **2026-11-13** — Ordem dos locks: advisory por empresa, vínculo, depois as O.S. em ordem de id; `create_order`/`set_assignees` travam o vínculo do técnico (`for share`). *Por quê:* evita deadlock (reproduzido) e atribuição sobrando de quem saiu.

### 07 Backup

- **2026-11-24** — Backup próprio do banco e das fotos, no mesmo R2, criptografado com `age` (só a chave pública na Action). *Por quê:* nem o Pro cobre arquivos; custo zero; vazar os secrets do GitHub não abre o backup.
