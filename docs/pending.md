# Pendente

O que falta no front e no backend. Item feito sai daqui no mesmo commit do código (o histórico fica no git); a decisão que ele gerou vai para [decisions.md](decisions.md). Os itens das revisões de 2026-11-23 e 2026-11-24 levam o código do relatório ([segurança](reviews/2026-11-24-security.md): A, M, B; [UI/UX](reviews/2026-11-23-ux.md): UX).

## Resumo

| Fase | Itens | Trava a produção |
| --- | --- | --- |
| [1. Código antes do primeiro deploy](#1-código-antes-do-primeiro-deploy) | 3 | sim |
| [2. Primeiro deploy](#2-primeiro-deploy) | 6 | sim |
| [3. Antes de entregar à Fast](#3-antes-de-entregar-à-fast) | 5 | sim |
| [4. Depois, sem travar](#4-depois-sem-travar) | 9 | não |

## 1. Código antes do primeiro deploy

Na ordem de gravidade. Custo do relatório: P = pequeno, M = médio.

| Item | Repo | O que fazer | Custo |
| --- | --- | --- | --- |
| Convite com aceite (seg. M1) | os dois | [abaixo](#convite-com-aceite-seg-m1) | M |
| Sem email | os dois | [abaixo](#sem-email) | M |
| Versão e atualização automática | os dois | [abaixo](#versão-e-atualização-automática) | M |

### Convite com aceite (seg. M1)

Decisões de 2026-11-24 em [06 Membros](decisions.md#06-membros). Contrato em [01](../../fast/docs/modules/01-foundation.md), [03](../../fast/docs/modules/03-service-orders.md) e [06](../../fast/docs/modules/06-members.md), no mesmo commit do código.

| Parte | Repo | O que fazer |
| --- | --- | --- |
| Convite no app | front | sem vínculo ativo e com convite pendente: tela "A empresa X convidou você" (aceitar, recusar) no lugar do aviso de removido; "definir senha" pelo link do convite aceita |

### Sem email

Decisões de 2026-11-24 em [01 Fundação](decisions.md#01-fundação). Contrato em [01](../../fast/docs/modules/01-foundation.md) e [06](../../fast/docs/modules/06-members.md), e o roteiro de deploy em [operations.md](../../fast/docs/operations.md#primeiro-deploy) sem SMTP, no mesmo commit do código.

| Parte | Repo | O que fazer |
| --- | --- | --- |
| Link do convite e de recuperação | front | a página `/link#<token>` abre "definir senha" (conta nova e recuperação) ou "entre com sua senha para aceitar" (conta existente); a tela "esqueci a senha" vira "peça o link ao responsável". O backend (`open_link`, `use_link`) e a tela de membros já estão feitos |
| Trocar a senha | front | pede a senha atual e entra de novo com ela antes de trocar |

### Versão e atualização automática

Decisões de 2026-11-24 em [Versão e atualização](decisions.md#versão-e-atualização). [Versionamento](e2e.md#versionamento), [queue.md](queue.md#service-worker), [screens.md](screens.md) e o 01 do backend mudam no mesmo commit do código.

| Parte | Repo | O que fazer |
| --- | --- | --- |
| Versão | os dois | `package.json` em semver; `version.ts` lê a do `package.json`; comparação por número; `min_client_version` com o formato semver no CHECK (01, R8) |
| Técnico | front | o aviso "Versão nova" sai: o worker novo entra ao abrir o app e na troca de tela, fora da câmera e do seletor da galeria; procura versão nova de tempos em tempos e ao voltar à aba (hoje só ao abrir). "Atualize o app" (abaixo da mínima) atualiza sozinho; o botão fica só se falhar |
| Escritório | front | procura versão nova (arquivo de versão do build, de tempos em tempos e ao voltar à aba) e recarrega na troca de tela; tela que falha ao carregar recarrega uma vez |
| Lançamento | os dois | `npm version` nos dois; branch `release`; [operations.md](../../fast/docs/operations.md) e o README daqui com o passo a passo de lançar |
| Testes | front | unit da comparação e da escolha do momento; E2E da atualização sozinha com envio na fila |

## 2. Primeiro deploy

Roteiro: [operations.md](../../fast/docs/operations.md#primeiro-deploy). Abaixo, o que falta fazer, com o que o roteiro ainda não diz (checklist da seção 3 do [relatório de segurança](reviews/2026-11-24-security.md#3-checklist-do-primeiro-deploy)). Na ordem.

| Passo | Repo | O que fazer |
| --- | --- | --- |
| Supabase e R2 | backend | na conta do usuário ([decisão](decisions.md#arquitetura)); dois projetos no Supabase Free, produção e teste, região São Paulo; buckets `execution-photos` e de backup no R2; no `execution-photos`, `incoming/` expira em 1 dia e, se o R2 permitir, limite de tamanho de objeto (a URL de PUT assina só o `host`: aceita 20 MB e `text/html`, seg. M3); chaves e secrets das Edge Functions |
| Auth | backend | cadastro público e anônimo fechados; email do Auth desligado (sem SMTP, [decisão](decisions.md#01-fundação)); `site_url` do Cloudflare Pages (`*.pages.dev`); `secure_password_change = true` e senha mínima de 6 (seg. M2, [decisão](decisions.md#01-fundação)), no painel e no `config.toml` |
| `npm run deploy` | backend | depois dele, migrations só por acréscimo (hoje se editam no lugar): atualizar a linha "Status" do CLAUDE.md do backend |
| Empresa e admin | backend | cadastrar a Fast e o platform admin direto no banco; o owner convida o time |
| Cloudflare Pages | front | produção da branch `release`, ligada ao Supabase de produção; prévia da `main`, ligada ao de teste ([decisão](decisions.md#versão-e-atualização)) |
| Conferências | os dois | CORS: REST, RPC, Auth e Edge Functions do hospedado aceitam o `x-client-version` (o local aceita; se o hospedado recusar, nada funciona); ip da auditoria (passo 6 do roteiro); `GET /auth/v1/settings` e `signup` respondendo `signup_disabled`; `_headers` com `curl -I` (gerado no build; com domínio próprio no bucket de fotos, `PHOTOS_ORIGIN` no build do Pages); Realtime sem nenhuma tabela na publicação; bundle só com a URL e a chave anon, sem source map e sem `/dev` |

## 3. Antes de entregar à Fast

| Item | Repo | O que fazer |
| --- | --- | --- |
| Backup (07) | backend | GitHub Action diária: `pg_dump` criptografado e cópia incremental das fotos para o bucket de backup no R2 ([07](../../fast/docs/modules/07-backup.md)); criptografia com `age` ([decisão](decisions.md#07-backup)); restauração de teste executada, com o passo a passo em [operations.md](../../fast/docs/operations.md#backup). Só então o módulo está pronto (R5) |
| Importação de clientes (02) | backend | [abaixo](#importação-de-clientes-02); é migration nova, depois do primeiro deploy |
| Celulares de teste | — | apagar os dados do site (Dexie juntado numa versão só, [decisão](decisions.md#e2e) de 2026-11-19) |
| Testes no PC | — | [C1 a C3](e2e.md#no-pc), com o backend local |
| Roteiro no celular real | — | [roteiro](e2e.md#roteiro-no-celular-real), no app publicado, num Android (o iPhone cobre só as linhas marcadas) |

### Importação de clientes (02)

O front não tem tela de importação ([decisão](decisions.md#telas-do-escritório) de 2026-11-19).

| Passo | O que fazer |
| --- | --- |
| CSV real | receber o arquivo exportado pela Fast |
| Contrato | `import_clients(p_company_id, p_rows jsonb, p_dry_run boolean, p_skip_duplicates boolean default true)`: valida todas as linhas; possíveis duplicados (mesmo nome normalizado e mesmo telefone, no arquivo ou já cadastrados) aparecem no resultado e são ignorados por padrão; `p_dry_run` só devolve o resultado; sem ele, grava tudo ou nada; o primeiro endereço de cada cliente vira principal. Definir o formato de `p_rows` e da saída a partir do CSV, e documentar em [02](../../fast/docs/modules/02-clients.md) |
| Implementação | validação por linha (inclusive o [tamanho do texto](../../fast/docs/api.md#tamanho-do-texto)), possíveis duplicados, `p_dry_run` e gravação tudo ou nada |
| Carga inicial | os clientes da Fast em produção |

## 4. Depois, sem travar

| Item | Tipo | O que fazer |
| --- | --- | --- |
| E2E no CI | testes | GitHub Actions: `supabase start` do `../fast`, build, `npm run test:e2e` a cada push |
| Android emulado | testes | [plano abaixo](#android-emulado); adiado pelo usuário em 2026-11-19 |
| Vitest browser instável | testes | às vezes "iframe did not become ready within 60s" e passa ao rodar de novo (2026-11-23); causa não investigada |
| Observabilidade do envio | medir em campo | 1º, sem mudar contrato: consulta no banco por envio (`received_at` − `client_submitted_at`, fotos, `file_size`, `uploaded_at` entre fotos). 2º, se não bastar: o aparelho manda as medidas do envio (início, tentativas, bytes), o que muda o contrato do `submit_execution`. Se os números forem ruins, decidir o tamanho da foto (F1, [photos.md](photos.md)) |
| Fila e sistema no aparelho | medir em campo | T3 (um item por vez em rede lenta), T4 (Background Sync com o app fechado), T5 (aba congelada), T6 (conectado sem dados), D2 (compressão no thread principal): [e2e.md](e2e.md#fila-parada-ou-atrasada) |
| Listas do escritório, opção B | medir em campo | view no backend com filtros e paginação no banco, quando o volume pedir (dezenas de milhares de O.S.); análise em [e2e.md](e2e.md#listas-do-escritório) |
| `inlineDynamicImports` obsoleto no build | manutenção | o `vite-plugin-pwa` 2.0.0 (a versão mais nova em 2026-11-23) fixa a opção no build do service worker, e o Rolldown avisa que ela sai; atualizar o plugin quando uma versão trocar por `codeSplitting: false` |
| Fotos órfãs no R2 | manutenção | limpeza das fotos confirmadas que nunca entraram num envio ([04](../../fast/docs/modules/04-execution-photos.md)) |
| Seletor de empresa | produto | pessoa com vínculo aceito em mais de uma empresa escolhe em qual entra; até lá, um vínculo aceito por pessoa ([decisão](decisions.md#06-membros) de 2026-11-24). Quando houver a segunda empresa cliente |

### Android emulado

O emulador roda o Chrome de verdade, com o service worker, o Background Sync e o Doze do sistema. O controle é pelo CDP (`adb forward tcp:9222 localabstract:chrome_devtools_remote` e `chromium.connectOverCDP` do Playwright, API estável; o `_android` do Playwright é experimental e fica fora) e pelo `adb` para o sistema.

Os cenários estão em [e2e.md](e2e.md#android-emulado).

| Custo e limite | |
| --- | --- |
| Montagem | SDK, imagem do Android com Chrome, KVM, scripts: ~1 a 2 dias; começar por um spike de meio dia só com o envio de app fechado |
| Rodada | minutos (boot do emulador); local antes de release, ou no CI (runners Linux com KVM) |
| Fica para o celular real | economia de bateria dos fabricantes (Xiaomi, Samsung matam o Chrome em segundo plano), câmera e rádio de verdade, instalação do PWA |
