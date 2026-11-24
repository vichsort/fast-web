# Pendente

O que falta no front e no backend. Item feito sai daqui no mesmo commit do código (o histórico fica no git); a decisão que ele gerou vai para [decisions.md](decisions.md). Os itens das revisões de 2026-11-23 e 2026-11-24 levam o código do relatório ([segurança](reviews/2026-11-24-security.md): A, M, B; [UI/UX](reviews/2026-11-23-ux.md): UX).

## Resumo

| Fase | Itens | Trava a produção |
| --- | --- | --- |
| [1. Decisões em aberto](#1-decisões-em-aberto) | 3 | sim: mudam itens da fase 2 |
| [2. Código antes do primeiro deploy](#2-código-antes-do-primeiro-deploy) | 7 | sim |
| [3. Primeiro deploy](#3-primeiro-deploy) | 7 | sim |
| [4. Antes de entregar à Fast](#4-antes-de-entregar-à-fast) | 5 | sim |
| [5. Depois, sem travar](#5-depois-sem-travar) | 8 | não |

## 1. Decisões em aberto

| Pergunta | Opções | Muda |
| --- | --- | --- |
| "Aprovadas no mês" no dashboard do escritório abre todas as aprovadas, sem período; a partir do 2º mês o número não bate com a lista (UX 8) | filtrar a lista por "aprovada em" (filtro novo por data de aprovação, nos dois repos) ou tirar o link do contador (só front) | UX 8 na fase 2 |
| Convite a um email de outra empresa: o owner passa a ler nome e telefone dessa pessoa, e as flags `already`, `reactivated` e `created` da resposta permitem enumerar emails (seg. M1) | recusar o convite, ou não revelar o perfil até o aceite; nos dois casos, a resposta deixa de distinguir email existente de novo | M1 na fase 2; contrato do `invite_member` ([06](../../fast/docs/modules/06-members.md)) e tela de membros |
| Um membro renomeia o próprio perfil com o nome de outra pessoa, e o histórico passa a mostrar esse nome (seg. B1, 2ª parte) | guardar o nome de quem fez no evento (muda o `metadata` do histórico e da auditoria) ou aceitar o risco e registrar | contrato do [03](../../fast/docs/modules/03-service-orders.md#eventos-do-histórico) e do [05](../../fast/docs/modules/05-dashboard-audit.md) |

## 2. Código antes do primeiro deploy

Na ordem de gravidade. Custo do relatório: P = pequeno, M = médio.

| Item | Repo | O que fazer | Custo |
| --- | --- | --- | --- |
| Convite sem limite (seg. A2) | backend | limite por quem convida e por empresa na Edge Function `invite_member`; a admin API do Auth ignora o rate limit de email (9 convites viraram 9 emails, ~35 ms cada) | P a M |
| Convite revela perfil e emails (seg. M1) | os dois | conforme a [decisão](#1-decisões-em-aberto); tirar as flags da resposta | P a M |
| Fotos sem teto (seg. M3, código) | backend | teto de fotos por execução em `request_photo_upload` | P |
| Sem cabeçalhos de segurança (seg. M4) | front | `public/_headers` com CSP compatível com o service worker, o Supabase, as URLs assinadas do R2 e o ViaCEP; `frame-ancestors 'none'`, `Referrer-Policy`, `X-Content-Type-Options: nosniff`, HSTS | P |
| Ex-membro continua com conta (seg. B1) | backend | na Edge Function `remove_member`, banir a conta no Auth se ela não tem vínculo ativo em outra empresa; hoje ele loga, renova o token e gasta cota de Edge Function (o RLS já corta os dados) | P |
| "Aprovadas no mês" abre todas (UX 8) | front ou os dois | conforme a [decisão](#1-decisões-em-aberto) | P a M |
| Emails do Auth em inglês (UX 9) | backend | templates pt-BR de convite e de recuperação de senha, com o nome da empresa (hoje comentados no `config.toml`); no hospedado, os mesmos pelo painel | P |

## 3. Primeiro deploy

Roteiro: [operations.md](../../fast/docs/operations.md#primeiro-deploy). Abaixo, o que falta fazer, com o que o roteiro ainda não diz (checklist da seção 3 do [relatório de segurança](reviews/2026-11-24-security.md#3-checklist-do-primeiro-deploy)). Na ordem.

| Passo | Repo | O que fazer |
| --- | --- | --- |
| Supabase e R2 | backend | projeto no Supabase Free; buckets `execution-photos` e de backup no R2; no `execution-photos`, `incoming/` expira em 1 dia e, se o R2 permitir, limite de tamanho de objeto (a URL de PUT assina só o `host`: aceita 20 MB e `text/html`, seg. M3); chaves e secrets das Edge Functions |
| Auth | backend | cadastro público e anônimo fechados; `site_url` do Cloudflare Pages; `secure_password_change = true` (hoje troca a senha só com o access token) e senha mínima de 8 ou mais (seg. M2), no painel e no `config.toml` |
| SMTP | backend | Resend (100/dia) ou Brevo (300/dia), grátis; remetente "Fast O.S." (UX 9); limite próprio e monitoramento da cota |
| `npm run deploy` | backend | depois dele, migrations só por acréscimo (hoje se editam no lugar): atualizar a linha "Status" do CLAUDE.md do backend |
| Empresa e admin | backend | cadastrar a Fast e o platform admin direto no banco; o owner convida o time |
| Cloudflare Pages | front | ligado ao Supabase de produção; a versão do build vem de `CF_PAGES_COMMIT_SHA` (`vite.config.ts`) |
| Conferências | os dois | CORS: REST, RPC, Auth e Edge Functions do hospedado aceitam o `x-client-version` (o local aceita; se o hospedado recusar, nada funciona); ip da auditoria (passo 6 do roteiro); `GET /auth/v1/settings` e `signup` respondendo `signup_disabled`; `_headers` com `curl -I`; Realtime sem nenhuma tabela na publicação; bundle só com a URL e a chave anon, sem source map e sem `/dev` |

## 4. Antes de entregar à Fast

| Item | Repo | O que fazer |
| --- | --- | --- |
| Logo da Fast | front | trocar `public/logo.svg` (hoje a marca provisória); os ícones e o manifest saem dele no build (`pwa-assets.config.ts`). Já pedida à Fast |
| Backup (07) | backend | GitHub Action diária: `pg_dump` criptografado e cópia incremental das fotos para o bucket de backup no R2 ([07](../../fast/docs/modules/07-backup.md)); escolher a ferramenta de criptografia e registrar em [decisions.md](decisions.md#07-backup); restauração de teste executada, com o passo a passo em [operations.md](../../fast/docs/operations.md#backup). Só então o módulo está pronto (R5) |
| Importação de clientes (02) | backend | [abaixo](#importação-de-clientes-02); é migration nova, depois do primeiro deploy |
| Celulares de teste | — | apagar os dados do site (Dexie juntado numa versão só, [decisão](decisions.md#e2e) de 2026-11-19) |
| Roteiro no celular real | — | ~15 min: economia de bateria do fabricante, câmera e rádio de verdade, instalação do PWA |

### Importação de clientes (02)

O front não tem tela de importação ([decisão](decisions.md#telas-do-escritório) de 2026-11-19).

| Passo | O que fazer |
| --- | --- |
| CSV real | receber o arquivo exportado pela Fast |
| Contrato | `import_clients(p_company_id, p_rows jsonb, p_dry_run boolean, p_skip_duplicates boolean default true)`: valida todas as linhas; possíveis duplicados (mesmo nome normalizado e mesmo telefone, no arquivo ou já cadastrados) aparecem no resultado e são ignorados por padrão; `p_dry_run` só devolve o resultado; sem ele, grava tudo ou nada; o primeiro endereço de cada cliente vira principal. Definir o formato de `p_rows` e da saída a partir do CSV, e documentar em [02](../../fast/docs/modules/02-clients.md) |
| Implementação | validação por linha (inclusive o [tamanho do texto](../../fast/docs/api.md#tamanho-do-texto)), possíveis duplicados, `p_dry_run` e gravação tudo ou nada |
| Carga inicial | os clientes da Fast em produção |

## 5. Depois, sem travar

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

### Android emulado

O emulador roda o Chrome de verdade, com o service worker, o Background Sync e o Doze do sistema. O controle é pelo CDP (`adb forward tcp:9222 localabstract:chrome_devtools_remote` e `chromium.connectOverCDP` do Playwright, API estável; o `_android` do Playwright é experimental e fica fora) e pelo `adb` para o sistema.

| Cenário | Como no emulador | Prova |
| --- | --- | --- |
| Envio com o app fechado (T4) | envio sem sinal (`adb shell cmd connectivity airplane-mode enable`), fecha a aba pelo CDP, devolve o sinal | o envio chega ao banco sem abrir o app |
| Celular parado (T5, Doze) | `adb shell dumpsys deviceidle force-idle` com itens na fila; depois `unforce` e o sinal | o envio chega quando o sistema libera |
| Rede ruim de verdade (T3, D1) | console do emulador: `network speed edge`, `network delay gprs` | tempos do envio comparáveis às [Medições](e2e.md#medições) |
| Câmera e GPS | câmera virtual do emulador; `adb emu geo fix` | foto com `captured_at` e localização no banco |
| Armazenamento (P1) | encher o disco do emulador com itens na fila | o pedido de armazenamento persistente segura os dados |

| Custo e limite | |
| --- | --- |
| Montagem | SDK, imagem do Android com Chrome, KVM, scripts: ~1 a 2 dias; começar por um spike de meio dia só com o envio de app fechado |
| Rodada | minutos (boot do emulador); local antes de release, ou no CI (runners Linux com KVM) |
| Fica para o celular real | economia de bateria dos fabricantes (Xiaomi, Samsung matam o Chrome em segundo plano), câmera e rádio de verdade, instalação do PWA |
