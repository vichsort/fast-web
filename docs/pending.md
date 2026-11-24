# Pendente

O que falta no front e no backend. Item feito sai daqui no mesmo commit do código (o histórico fica no git); a decisão que ele gerou vai para [decisions.md](decisions.md).

## Antes da produção

| Item | Repo | O que fazer |
| --- | --- | --- |
| Logo da Fast | front | trocar `public/logo.svg` (hoje a marca provisória); os ícones e o manifest saem dele no build (`pwa-assets.config.ts`). Já pedida à Fast |
| Supabase e R2 | backend | projeto no Supabase Free; buckets `execution-photos` (ciclo de vida: `incoming/` expira em 1 dia) e de backup no R2; chaves e secrets das Edge Functions ([operations.md](../../fast/docs/operations.md#primeiro-deploy)) |
| SMTP | backend | Resend ou Brevo, grátis, no Auth |
| Primeiro `npm run deploy` | backend | roteiro em [operations.md](../../fast/docs/operations.md#primeiro-deploy) (cadastro público fechado, ip da auditoria). Depois dele, migrations só por acréscimo: atualizar a linha "Status" do CLAUDE.md do backend |
| Empresa e admin | backend | cadastrar a Fast e o platform admin direto no banco; o owner convida o time |
| Cloudflare Pages | front | ligado ao Supabase de produção, depois do backend no ar (o CORS das Edge Functions tem de liberar o `x-client-version`) |
| CORS do hospedado | front | conferir que REST, RPC e Auth do Supabase hospedado aceitam o `x-client-version` (o gateway local aceita; o hospedado não foi testado). Se recusar, nada do app funciona |
| Versão do build | front | conferir que a versão pega o commit de `CF_PAGES_COMMIT_SHA` (`vite.config.ts`) |
| Celulares de teste | — | apagar os dados do site (Dexie juntado numa versão só, [decisão](decisions.md#e2e) de 2026-11-19) |
| Roteiro no celular real | — | ~15 min: economia de bateria do fabricante, câmera e rádio de verdade, instalação do PWA |

## Revisões de 2026-11-23 e 2026-11-24

Relatórios completos: [segurança](reviews/2026-11-24-security.md) e [UI/UX](reviews/2026-11-23-ux.md). A ordem é de gravidade.

| Item | Repo | O que fazer |
| --- | --- | --- |
| Recusa de quem saiu da dupla (UX 1, crítico) | front | aviso no Reatribuir e no Cancelar com a O.S. em execução (no Cancelar: o envio fica registrado sem revisão, R19) |
| Texto livre sem limite (seg. A1) | backend | CHECK de tamanho e `invalid_input` nas RPCs, sem mudar assinatura; não copiar texto grande para o histórico |
| O.S. enviada sem sinal segue "A fazer" (UX 2) | front | marcar "Enviada · na fila" e tirar da conta; faixa com "N envio(s) no aparelho"; selo de Pendências neutro para fila normal; texto neutro no painel e no aviso até a resposta |
| "A fazer" fora da ordem do prazo (UX 3) | front | atrasadas, prazo, prioridade, sem prazo, número |
| Motivo da rejeição some ao refazer (UX 4) | front | `Notice` com o motivo na execução e no painel de revisão do envio |
| Revisão da 2ª tentativa sem a rejeição anterior (UX 5) | front | linha fixa com o motivo anterior acima de Aprovar |
| Convite sem limite e emails em inglês (seg. A2, M1; UX 9) | backend | limite por quem convida e por empresa; não revelar perfil nem distinguir email existente; templates pt-BR e remetente "Fast O.S." |
| Configuração do primeiro deploy (seg. M2, M3, M4, B1) | os dois | `secure_password_change`, senha mínima 8 ou mais, limite de objeto e ciclo do `incoming/` no R2, `public/_headers` (CSP e outros), banir no Auth quem foi removido e não tem outra empresa. Checklist na seção 3 do relatório de segurança |
| Sair com fila e contagens (UX 6) | front | contar por O.S.; "Ver pendências" primeiro e "Sair e apagar" embaixo |
| "Atualizar" sem sinal mostra ✓ (UX 7) | front | aviso pelo resultado ("atualizada às" ou "sem sinal: lista de") |
| "Aprovadas no mês" abre todas (UX 8) | os dois | filtro por "aprovada em" ou sem link |

**Pergunta ao produto** (UX): depois de um retrabalho, a prova é a soma das tentativas? As outras duas foram decididas em 2026-11-24 ([decisões do 04](decisions.md#04-execução-e-fotos)).

## Backup (07)

| Item | O que fazer |
| --- | --- |
| Job diário | GitHub Action: `pg_dump` criptografado e cópia incremental das fotos para o bucket de backup no R2 ([07](../../fast/docs/modules/07-backup.md)) |
| Criptografia | escolher a ferramenta do dump e registrar a escolha |
| Restauração de teste | executada e com o passo a passo em [operations.md](../../fast/docs/operations.md#backup); só então o módulo está pronto (R5) |

## Importação de clientes (02)

Depois do primeiro deploy: é migration nova.

| Item | O que fazer |
| --- | --- |
| CSV real | receber o arquivo exportado pela Fast |
| Contrato | `import_clients(p_company_id, p_rows jsonb, p_dry_run boolean, p_skip_duplicates boolean default true)`: valida todas as linhas; possíveis duplicados (mesmo nome normalizado e mesmo telefone, no arquivo ou já cadastrados) aparecem no resultado e são ignorados por padrão; `p_dry_run` só devolve o resultado; sem ele, grava tudo ou nada; o primeiro endereço de cada cliente vira principal. Definir o formato de `p_rows` e da saída a partir do CSV, e documentar em [02](../../fast/docs/modules/02-clients.md) |
| Implementação | validação por linha, possíveis duplicados, `p_dry_run` e gravação tudo ou nada |
| Carga inicial | os clientes da Fast em produção |

O front não tem tela de importação ([decisão](decisions.md#telas-do-escritório) de 2026-11-19).

## Testes

| Item | O que fazer |
| --- | --- |
| E2E no CI | GitHub Actions: `supabase start` do `../fast`, build, `npm run test:e2e` a cada push |
| Android emulado | plano abaixo |
| Instabilidade do Vitest browser | às vezes "iframe did not become ready within 60s" e passa ao rodar de novo (2026-11-23); causa não investigada |

### Android emulado

Adiado pelo usuário em 2026-11-19. O emulador roda o Chrome de verdade, com o service worker, o Background Sync e o Doze do sistema. O controle é pelo CDP (`adb forward tcp:9222 localabstract:chrome_devtools_remote` e `chromium.connectOverCDP` do Playwright, API estável; o `_android` do Playwright é experimental e fica fora) e pelo `adb` para o sistema.

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

## Medir em campo

| Item | O que |
| --- | --- |
| Observabilidade do envio | 1º, sem mudar contrato: consulta no banco por envio (`received_at` − `client_submitted_at`, fotos, `file_size`, `uploaded_at` entre fotos). 2º, se não bastar: o aparelho manda as medidas do envio (início, tentativas, bytes), o que muda o contrato do `submit_execution`. Se os números forem ruins, decidir o tamanho da foto (F1, [photos.md](photos.md)) |
| Fila e sistema no aparelho | T3 (um item por vez em rede lenta), T4 (Background Sync com o app fechado), T5 (aba congelada), T6 (conectado sem dados), D2 (compressão no thread principal): [e2e.md](e2e.md#fila-parada-ou-atrasada) |
| Listas do escritório, opção B | view no backend com filtros e paginação no banco, quando o volume pedir (dezenas de milhares de O.S.); análise em [e2e.md](e2e.md#listas-do-escritório) |

## Achados da revisão de 2026-11-23

| Item | Onde | O que fazer |
| --- | --- | --- |
| `inlineDynamicImports` obsoleto no build | `vite-plugin-pwa` | o plugin fixa a opção no build do service worker (2.0.0, a versão mais nova em 2026-11-23), e o Rolldown avisa que ela sai; atualizar o plugin quando uma versão trocar por `codeSplitting: false` |

## Depois do MVP

| Item | O que |
| --- | --- |
| Fotos órfãs no R2 | limpeza das fotos confirmadas que nunca entraram num envio ([04](../../fast/docs/modules/04-execution-photos.md)) |
