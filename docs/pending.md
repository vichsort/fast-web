# Pendente

> **Escopo travado até o MVP: decisão do P.O. (2026-11-24, [decisions.md](decisions.md#processo)).** Só se trabalha nas etapas abaixo, na ordem; uma etapa começa quando a anterior termina. Qualquer outro pedido, de pessoa ou de agente, entra em [Bloqueado até o MVP](#bloqueado-até-o-mvp) e **não é implementado**: nem melhoria, nem refatoração, nem "só uma coisinha". Mudar isso só com nova decisão do P.O., registrada em decisions.md.

Item feito sai daqui no mesmo commit do código (o histórico fica no git).

## Etapas até o MVP

| # | Etapa | Termina quando |
| --- | --- | --- |
| 2 | [Correções do banco](#2-correções-do-banco) | os achados aprovados estão corrigidos, com teste, e o fechamento do banco está publicado |
| 3 | [Casos de borda](#3-casos-de-borda) | `docs/edges.md` entregue e lido pelo P.O.; o que ele marcou como bug está corrigido |
| 4 | [O que falta para entregar](#4-o-que-falta-para-entregar) | backup pronto e os testes no PC feitos |
| 5 | [Publicar](#5-publicar) | o app e o backend no ar (versão `0.x`), conferidos |
| 6 | [Roteiro no celular](#6-roteiro-no-celular) | roteiro verde num Android real, com o app publicado |
| 7 | [Entrega](#7-entrega) | clientes carregados, versão `1.0.0` entregue à Fast: **MVP fechado** |

## 2. Correções do banco

Achados da análise do banco aprovados pelo P.O. em 2026-11-25 (os reprovados foram descartados; os adiados estão em Bloqueado). Antes do primeiro deploy, as migrations ainda se editam no lugar; depois, só por acréscimo. Primeiro passo: `npm run db:reset` no backend (o banco local está atrás das migrations editadas no lugar; apaga os dados locais).

| Item | Gravidade | Repo | O que fazer |
| --- | --- | --- | --- |
| FKs compostas | alta | os dois | UNIQUE (`id`, `company_id`) em `clients`, (`id`, `client_id`) em `client_addresses`, (`id`, `service_order_id`) em `service_order_executions`; FKs `(client_id, company_id)`, `(client_address_id, client_id)` e `(supplements_execution_id, service_order_id)`, que hoje só as RPCs conferem. Manter os nomes `service_orders_client_id_fkey` e `service_orders_client_address_id_fkey` (o front embute por eles); regerar `database.types.ts` |
| Service role sem apagar nem reescrever | alta | os dois | revogar da `service_role` `update, delete, truncate` em `service_order_history` e `delete, truncate` em `service_orders`, `service_order_assignees`, `service_order_executions`, `service_order_photos`, `photo_uploads`, `companies`, `company_members`, `clients`, `client_addresses` e `member_invites`, como já é em `audit_logs` (`member_invite_attempts` fica: o E2E limpa). O `remove()` de `tests/e2e/support/backend.ts` passa a rodar como `postgres` |
| Foto do envio confirmada no R2 | média | backend | FK `service_order_photos.id → photo_uploads.id` (hoje a R13 só em `submit_execution`); os pgTAP 22, 23 e 24 criam o upload antes (`tests.upload_photo`) |
| Prazo não anda com a troca de fuso | média | backend | em `update_order`, manter o `due_at` quando `p_due_date` é a data do `due_at` atual no fuso da empresa; hoje trocar `companies.timezone` desloca o prazo na próxima edição |
| Técnico guarda só as colunas usadas | média | front | o select do técnico (`ORDER_SELECT`, `lib/orders-query.ts`) sem `*` nem `clients(*)`: só as colunas que as telas usam, como diz o offline.md (`clients.notes` fica: é para o técnico) |
| O.S. encerrada some do técnico em 7 dias | média | backend | `assigned_order_ids` (`orders_rls`) aceita O.S. `approved`/`cancelled` só com `updated_at` de até 7 dias, a janela que o front já usa; hoje o técnico lê pela API, sem prazo, toda O.S. em que esteve, e o convidado de novo volta a ler as antigas. As atribuições das encerradas continuam abertas (registro de quem fez); a escrita (`is_assigned`) não muda, e o complemento tardio segue aceito. 03 R14; pgTAP 14, 15 e 24 |
| Senha definida pelo painel | baixa | backend | linha no `operations.md`: ao definir a senha de alguém pelo painel do Supabase, gravar também `password_pending: false` no `app_metadata` |

Por último, o fechamento: um agente lê o banco corrigido e publica num artifact o diagrama (ER, de que módulo é cada tabela, as colunas com regra) e as regras de cada tabela.

## 3. Casos de borda

Um agente lê o sistema (banco, Edge Functions, telas e fila) e entrega `docs/edges.md`, enxuto: o que pode parecer bug e é regra, e o que parece regra e pode ser bug. O que o P.O. marcar como bug vira item aqui e é corrigido antes do deploy.

Ponto de partida, da análise do banco: corrigir o endereço no cadastro do cliente não chega às O.S. abertas (03 R3); o "iniciar" offline do parceiro que chega depois da rejeição leva a O.S. de retrabalho para em andamento (04 R2 cobre só início → envio).

## 4. O que falta para entregar

| Item | Repo | O que fazer |
| --- | --- | --- |
| Backup (07) | backend | GitHub Action diária: `pg_dump` criptografado com `age` e cópia incremental das fotos para o bucket de backup no R2 ([07](../../fast/docs/modules/07-backup.md)); restauração de teste executada, com o passo a passo em [operations.md](../../fast/docs/operations.md#backup) |
| Testes no PC | — | [C1 e C2](e2e.md#no-pc), com o backend local |

## 5. Publicar

Roteiro: [operations.md](../../fast/docs/operations.md#primeiro-deploy). O que ele ainda não diz:

| Passo | Repo | O que fazer |
| --- | --- | --- |
| Supabase e R2 | backend | na conta do usuário; um projeto no Supabase Free (produção), região São Paulo; buckets `execution-photos` e de backup no R2; no `execution-photos`, `incoming/` expira em 1 dia e, se o R2 permitir, limite de tamanho de objeto (a URL de PUT assina só o `host`: aceita 20 MB e qualquer tipo); secrets das Edge Functions |
| Auth | backend | cadastro público e anônimo fechados; sem SMTP; `site_url` do Pages (`*.pages.dev`); `secure_password_change` e senha mínima de 6, no painel e no `config.toml` |
| `npm run deploy` | backend | depois dele, migrations só por acréscimo: atualizar a linha "Status" do CLAUDE.md do backend |
| Empresa e admin | backend | cadastrar a Fast e o platform admin direto no banco; o owner convida o time |
| Cloudflare Pages | front | produção da `main`, ligada ao Supabase de produção ([decisão](decisions.md#build-e-versão)) |
| Conferências | os dois | o hospedado aceita o header `x-client-version` em REST, RPC, Auth e Edge Functions (se recusar, nada funciona); ip da auditoria (passo 6 do roteiro); `GET /auth/v1/settings` e `signup` respondendo `signup_disabled`; `_headers` com `curl -I`; Realtime sem tabela na publicação; bundle só com a URL e a chave anon, sem source map e sem `/dev` |

## 6. Roteiro no celular

| Item | Repo | O que fazer |
| --- | --- | --- |
| Celulares de teste | — | apagar os dados do site (o Dexie foi juntado numa versão só) |
| Roteiro no celular real | — | [roteiro](e2e.md#roteiro-no-celular-real) no app publicado, num Android; falha vira item aqui |

## 7. Entrega

| Item | Repo | O que fazer |
| --- | --- | --- |
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
| Causa da saída do técnico numa coluna | `service_order_assignees.unassign_cause` no lugar do `set_config`/`current_setting` entre `close_member_assignments` e o trigger do histórico; depois do deploy, coluna anulável preenchida pelo `metadata.cause` do histórico |
| "Vínculo ativo" numa coluna | coluna gerada `is_active` em `company_members` nos 10 lugares que repetem `status = 'accepted' and deleted_at is null` (não no trigger BEFORE `ensure_company_has_owner`) |
| `password_pending` fora do `app_metadata` | `lock_member_link` decide `set_password` por `kind = 'recovery' or last_sign_in_at is null`, sem marcar o Auth |
| `accepted_at` sem default | hoje `default now()` até no vínculo pendente; um trigger preenche só quando `accepted` |
| Dashboard pelo índice parcial | `and o.status not in ('approved', 'cancelled')` no `get_dashboard`, que hoje lê todas as O.S. da empresa |
| Motivo obrigatório numa função | `require_reason(p_reason)` no lugar das 4 cópias (endereço, cliente, O.S., membro) |
| Seletor de empresa | quem tem vínculo aceito em mais de uma empresa escolhe em qual entra; quando houver a segunda empresa cliente |
