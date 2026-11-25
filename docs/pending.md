# Pendente

> **Escopo travado até o MVP: decisão do P.O. (2026-11-24, [decisions.md](decisions.md#processo)).** Só se trabalha nas etapas abaixo, na ordem; uma etapa começa quando a anterior termina. Qualquer outro pedido, de pessoa ou de agente, entra em [Bloqueado até o MVP](#bloqueado-até-o-mvp) e **não é implementado**: nem melhoria, nem refatoração, nem "só uma coisinha". Mudar isso só com nova decisão do P.O., registrada em decisions.md.

Item feito sai daqui no mesmo commit do código (o histórico fica no git).

## Etapas até o MVP

| # | Etapa | Termina quando |
| --- | --- | --- |
| 1 | [Análise do banco](#1-análise-do-banco) | o banco está lido de ponta a ponta, com o diagrama das tabelas e a lista de achados aprovada pelo P.O. |
| 2 | [Correções do banco](#2-correções-do-banco) | os achados aprovados estão corrigidos, com teste, antes do primeiro deploy |
| 3 | [O que falta para entregar](#3-o-que-falta-para-entregar) | backup pronto e os testes no PC feitos |
| 4 | [Publicar](#4-publicar) | o app e o backend no ar (versão `0.x`), conferidos |
| 5 | [Celular e entrega](#5-celular-e-entrega) | roteiro do celular verde, clientes carregados, versão `1.0.0` entregue à Fast: **MVP fechado** |

## 1. Análise do banco

Um agente lê o banco inteiro do backend (migrations, funções, RLS, triggers, Edge Functions) e entrega:

| Entrega | Como |
| --- | --- |
| Diagrama | as tabelas e as relações (ER), com as colunas que têm regra, num formato visual (Canva ou similar, ou um artifact); de que módulo é cada tabela |
| Achados | lista do que está frágil, repetido ou contornado, com o custo de corrigir; o P.O. decide o que entra na etapa 2 |

Achados já levantados em 2026-11-24 (ponto de partida):

| Achado | Onde | Por que incomoda | Correção sugerida |
| --- | --- | --- | --- |
| Causa da saída do técnico passada por variável de sessão | `close_member_assignments` grava `fast.unassign_cause` com `set_config`; o trigger do histórico (`orders_history`) lê com `current_setting` | parâmetro escondido: quem lê o trigger não vê de onde vem a causa | coluna `unassign_cause` em `service_order_assignees`, gravada no `update` que fecha a atribuição e lida pelo trigger |
| "Vínculo ativo" repetido em 15 lugares | `status = 'accepted' and deleted_at is null` em `member_role`, `member_company_ids`, `colleague_ids`, `actor_role`, `last_owner`, `check_order_technicians`, `lock_assignee_memberships`, `removed_user_to_ban`, `active_elsewhere`… | função nova esquece uma das condições (quase aconteceu no convite com aceite) | coluna gerada `is_active` em `company_members` (ou uma função só), usada em todos |
| `password_pending` no `app_metadata` do Auth | `invite_member` marca; `use_link` desmarca; `lock_member_link` lê | contorno do Auth (que grava senha aleatória); se o platform admin definir a senha pelo painel, a marca fica, e o link do convite ainda trocaria essa senha | aceitar e documentar no `operations.md`, ou desmarcar também quando a senha é definida por fora |

## 2. Correções do banco

Os achados aprovados na etapa 1. Antes do primeiro deploy, as migrations ainda se editam no lugar; depois, só por acréscimo.

## 3. O que falta para entregar

| Item | Repo | O que fazer |
| --- | --- | --- |
| Backup (07) | backend | GitHub Action diária: `pg_dump` criptografado com `age` e cópia incremental das fotos para o bucket de backup no R2 ([07](../../fast/docs/modules/07-backup.md)); restauração de teste executada, com o passo a passo em [operations.md](../../fast/docs/operations.md#backup) |
| Testes no PC | — | [C1 e C2](e2e.md#no-pc), com o backend local |

## 4. Publicar

Roteiro: [operations.md](../../fast/docs/operations.md#primeiro-deploy). O que ele ainda não diz:

| Passo | Repo | O que fazer |
| --- | --- | --- |
| Supabase e R2 | backend | na conta do usuário; um projeto no Supabase Free (produção), região São Paulo; buckets `execution-photos` e de backup no R2; no `execution-photos`, `incoming/` expira em 1 dia e, se o R2 permitir, limite de tamanho de objeto (a URL de PUT assina só o `host`: aceita 20 MB e qualquer tipo); secrets das Edge Functions |
| Auth | backend | cadastro público e anônimo fechados; sem SMTP; `site_url` do Pages (`*.pages.dev`); `secure_password_change` e senha mínima de 6, no painel e no `config.toml` |
| `npm run deploy` | backend | depois dele, migrations só por acréscimo: atualizar a linha "Status" do CLAUDE.md do backend |
| Empresa e admin | backend | cadastrar a Fast e o platform admin direto no banco; o owner convida o time |
| Cloudflare Pages | front | produção da `main`, ligada ao Supabase de produção ([decisão](decisions.md#build-e-versão)) |
| Conferências | os dois | o hospedado aceita o header `x-client-version` em REST, RPC, Auth e Edge Functions (se recusar, nada funciona); ip da auditoria (passo 6 do roteiro); `GET /auth/v1/settings` e `signup` respondendo `signup_disabled`; `_headers` com `curl -I`; Realtime sem tabela na publicação; bundle só com a URL e a chave anon, sem source map e sem `/dev` |

## 5. Celular e entrega

| Item | Repo | O que fazer |
| --- | --- | --- |
| Celulares de teste | — | apagar os dados do site (o Dexie foi juntado numa versão só) |
| Roteiro no celular real | — | [roteiro](e2e.md#roteiro-no-celular-real) no app publicado, num Android; falha vira item aqui |
| Importação de clientes (02) | backend | com o CSV real da Fast: `import_clients(p_company_id, p_rows jsonb, p_dry_run boolean, p_skip_duplicates boolean default true)`, que valida todas as linhas (inclusive o [tamanho do texto](../../fast/docs/api.md#tamanho-do-texto)), mostra os possíveis duplicados (nome normalizado e telefone iguais, no arquivo ou no banco) e os ignora por padrão, só devolve o resultado com `p_dry_run` e, sem ele, grava tudo ou nada; o primeiro endereço vira principal. Formato de `p_rows` e da saída a partir do CSV, documentado no [02](../../fast/docs/modules/02-clients.md). Migration nova (depois do deploy). Sem tela no front. Carga dos clientes em produção |
| Release 1 | os dois | `npm version major` (para `1.0.0`) nos dois repositórios ([README](../README.md#lançar)) e entrega à Fast |

## Bloqueado até o MVP

Decisão do P.O.: nada daqui é feito antes de o MVP fechar. Pedido novo entra nesta lista, com a data.

| Item | O que é |
| --- | --- |
| Branch `release` e prévia com Supabase de teste | começam na `1.0.0` |
| E2E no CI | GitHub Actions com o stack local a cada push |
| Android emulado | E2E do app fechado, Doze e instalação no emulador (~1 a 2 dias) |
| Vitest browser instável | às vezes "iframe did not become ready within 60s" e passa ao rodar de novo |
| Observabilidade do envio | medir em campo o tempo e o tamanho dos envios; se ruim, decidir o tamanho da foto (F1, [photos.md](photos.md)) |
| Listas do escritório no banco | view com filtros e paginação no backend, quando o volume pedir (dezenas de milhares de O.S.) |
| `inlineDynamicImports` obsoleto | atualizar o `vite-plugin-pwa` quando trocar a opção por `codeSplitting: false` |
| Fotos órfãs no R2 | limpar as fotos confirmadas que nunca entraram num envio |
| Seletor de empresa | quem tem vínculo aceito em mais de uma empresa escolhe em qual entra; quando houver a segunda empresa cliente |
