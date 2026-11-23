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
| Toast cobre a barra inferior no celular | Sonner na interface do técnico | ~4 s em cima de "Pendências" logo depois de enviar; para a revisão de UX |
| Formulário de O.S. lê todos os clientes completos | `src/office/orders/form.tsx` (`useClients`) | usar a leitura enxuta (`useClientNames`) e os endereços só do cliente escolhido |
| `Notice` único nunca comparado no navegador | `src/components/notice.tsx` | conferir os dois visuais (escritório e técnico) |
| Perfil do técnico sem teste de tela | `src/technician/profile-page.tsx` | o Vitest browser não carrega o `virtual:pwa-register`; conferir à mão |
| `role="status"` só no `Notice` do escritório | `src/components/notice.tsx` | decidir um papel para os dois |
| Regra de atraso testada em dois lugares | `src/lib/order-detail.test.ts`, `src/office/derive.test.ts` | ficar com um |
| `AttemptsSection` fora da vitrine | `src/app/dev` | acrescentar a demonstração |
| Avisos do build que viram erro no próximo Vite | `vite.config.ts` | import sem extensão, `inlineDynamicImports` obsoleto, pedaço acima de 500 kB |

## Depois do MVP

| Item | O que |
| --- | --- |
| Fotos órfãs no R2 | limpeza das fotos confirmadas que nunca entraram num envio ([04](../../fast/docs/modules/04-execution-photos.md)) |
