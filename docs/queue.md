# Fila offline

Implementação no aparelho da fila descrita em [offline.md](../../fast/docs/offline.md#fila) do backend: o que o técnico faz sem sinal é guardado e enviado quando a conexão volta, sem duplicar. As respostas e os códigos de erro são os do backend ([errors.md](../../fast/docs/errors.md), [04](../../fast/docs/modules/04-execution-photos.md), [03](../../fast/docs/modules/03-service-orders.md)). **Código:** [`src/offline/queue/`](../src/offline/queue/) (entrada pública em `index.ts`). **Banco local:** [`src/offline/db.ts`](../src/offline/db.ts).

## Regras

- **Q1.** Três tipos de item: `start` (iniciar), `submit` (enviar ou complementar um rascunho) e `materials` (editar o texto de materiais). Cada item é de um usuário e de uma O.S.
- **Q2.** FIFO por O.S.: de cada O.S., só o item mais antigo pode ser tentado. Um problema numa O.S. não trava as outras. Um item por vez no aparelho todo (o sinal é ruim; uma foto por vez).
- **Q3.** Só o usuário logado envia, e só os itens dele. Itens de outro usuário ficam parados até ele voltar ou até a limpeza do aparelho.
- **Q4.** `submit`, em ordem, gravando cada passo no banco local (a fila pode parar em qualquer ponto e retomar dali):
  1. para cada foto do rascunho ainda não enviada: `request_photo_upload` (a URL é pedida na hora; `already_uploaded` já conta como enviada) → PUT do arquivo com `Content-Type: image/jpeg` → `confirm_photo_upload` → `uploaded = true`;
  2. com todas enviadas, `submit_execution` com os dados do rascunho e das fotos;
  3. aceito: apaga o rascunho, as fotos dele e o item.
- **Q5.** `client_submitted_at` é o relógio do aparelho quando o técnico tocou em "Enviar" (vai no item), não a hora em que a fila conseguiu mandar.
- **Q6.** Resposta → o que a fila faz (classes em [errors.md](../../fast/docs/errors.md#classes-de-erro)):

| Classe   | Exemplos                            | Fila                                                                                                                                                                                               |
| -------- | ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Rede     | `fetch` falhou, timeout             | mantém o item; espera crescente só naquela O.S.                                                                                                                                                    |
| Servidor | HTTP 5xx, 540, 429                  | igual a rede                                                                                                                                                                                       |
| Sessão   | HTTP 401, `PGRST301`, "JWT expired" | pede a renovação da sessão e tenta de novo; se a renovação falhar, para a fila inteira e avisa que precisa de login                                                                                |
| Regra    | `code = 'P0001'`                    | tira o item; no `submit`, o rascunho fica `refused` com o código; nos outros tipos, o motivo fica registrado para a tela mostrar (no `conflict` de materiais, junto com o texto atual do servidor) |
| Bug      | `42501`, `PGRST202`, outros         | item `blocked` com o erro; nunca descarta; a fila segue nas outras O.S.                                                                                                                            |

- **Q7.** Espera crescente: dobra a cada tentativa, começa em 5 s e para em 1 min. O item guarda se espera por rede ou por servidor. Uma resposta de sucesso em qualquer item zera a espera e a contagem dos itens em espera ("online" é um request que deu certo, nunca `navigator.onLine`). Um **indício de conexão** (fontes em [Service worker](#service-worker)) faz vencer já as esperas por rede do usuário, sem zerar a contagem: se o indício enganar, a próxima falha espera mais. A espera por servidor (5xx, 429) continua: o indício não diz nada dele.
- **Q8.** Upload com timeout generoso (5 min por foto: 400 KB em 2G leva minutos).
- **Q9.** Um processador por vez, mesmo com a página e o service worker acordados juntos: o processamento roda sob um lock (Web Locks API, `fast-queue`).
- **Q10.** Logout e remoção do membro apagam tudo do usuário no aparelho: rascunhos, fotos, fila, recusas, O.S. e fotos já vistas e o cache das leituras. As leituras em memória saem em toda troca de usuário da sessão ([`query-client.ts`](../src/app/query-client.ts)). Antes do logout, a tela pergunta se há itens pendentes (contagem por O.S.).
- **Q11.** A fila não conhece React nem DOM: roda na página e no service worker. Recebe a API (chamadas ao Supabase e o PUT), o lock e o relógio por injeção; os testes passam versões falsas.
- **Q12.** Armazenamento persistente: ao abrir a interface do técnico, o app pede `navigator.storage.persist()` (só se ainda não tem; [`persistence.ts`](../src/offline/persistence.ts)). Sem ele, o Chrome pode apagar o IndexedDB inteiro (rascunhos, fotos e fila) quando falta espaço. Negado, Minhas O.S. avisa e pede para instalar o app.
- **Q13.** Formato do item: todo item gravado leva `format` (`QUEUE_ITEM_FORMAT`, hoje 1, em [`db.ts`](../src/offline/db.ts)). A fila não toca no item de formato mais novo que o build dela (gravado por um build mais novo aberto em outra aba): a O.S. dele fica parada, com os itens de trás (Q2), até este build atualizar. Formato novo é versão nova do Dexie com um `upgrade()` que converte os itens gravados, testado a partir dos dados da versão anterior.

## Rascunho

O rascunho (`drafts`) é editado pela tela até o técnico tocar em "Enviar"; aí vira `queued` e entra na fila (Q4). Recusado por regra, fica `refused`, visível com o motivo, até o técnico apagar ([offline.md](../../fast/docs/offline.md#recusa-definitiva)). Fotos são das telas e do módulo de fotos ([photos.md](photos.md)); a fila só lê, marca `uploaded` e apaga.

## Service worker

A fila roda na página e no worker ([`src/sw.ts`](../src/sw.ts)), com o mesmo código ([`sync.ts`](../src/offline/queue/sync.ts)). O worker só é registrado na interface do técnico.

| Ponto | Como é |
| --- | --- |
| Passada | `runPass`: roda o `processQueue` sob o lock `fast-queue` (página e worker nunca juntos, Q9) e diz se algo saiu da fila (`sent`) e se houve recusa nova (`refused`) |
| Página | [`runner.ts`](../src/technician/api/real/runner.ts): ao abrir, ao voltar o sinal e a aba, depois de cada ação; esperando rede, timer até a hora marcada |
| Indício de conexão na página | o evento `online` e qualquer resposta HTTP do Supabase (o `fetch` do cliente avisa, [`supabase-fetch.ts`](../src/lib/supabase-fetch.ts)): as esperas por rede vencem e a fila roda (`hintConnectivity`, Q7). A resposta cobre o celular "conectado" sem dados, em que o `online` nunca dispara |
| Background Sync | cada ação que põe na fila (`queued()` em `actions.ts`) também registra a tag `fast-queue`; o evento `sync` do worker roda a passada (`syncInWorker`) |
| Fila esperando rede no worker | o `sync` é indício de conexão (Q7): as esperas por rede vencem antes da passada. Se ainda sobra item esperando, o evento falha de propósito e o navegador agenda outra tentativa; sem login (`needs_login`), termina: só a página entra de novo |
| Supabase no worker | cliente próprio, com a sessão do IndexedDB (`createAuthStorage()`), `detectSessionInUrl: false` e `autoRefreshToken: false` (renova quando uma chamada precisa); [`supabase.ts`](../src/lib/supabase.ts) lê `window.location` e não entra no worker |
| Usuário no worker | o da sessão guardada; sem sessão, não roda; só os itens dele (Q3) |
| Depois da passada do worker | `BroadcastChannel` `fast-queue` → a página aberta atualiza o indicador e faz o mesmo que depois da própria passada (invalida `['technician']`; com recusa, confere o vínculo). O `liveQuery` vê a escrita do worker pelo canal do próprio Dexie |
| Registro e atualização | `useRegisterSW` no `TechnicianRuntime` (`registerType: 'prompt'`, `injectRegister: false`). Versão nova: aviso fixo (toast) com "Atualizar"; só ao toque o worker novo entra (`SKIP_WAITING`) e a página recarrega, então nunca no meio da câmera. Recarregar não perde nada: rascunhos, fotos e fila estão no Dexie |
| Precache | o app inteiro, ícones e os pedaços de cada área inclusive (`globPatterns`): a tela do técnico, carregada sob demanda, vem do precache sem sinal; sem sinal, qualquer rota responde com o `index.html` do precache (`NavigationRoute`), então abrir direto numa O.S. funciona |
| Rodar | `devOptions.enabled: false`: o worker só existe no build (`npm run build && npm run preview`) |
| Versão mínima | abaixo dela, a interface não abre ([screens.md](screens.md#comum)), e a fila da página não roda; os itens ficam. O worker não confere: o Background Sync de um app velho ainda manda (a função antiga do backend fica no ar pelo prazo, P9 do [e2e.md](e2e.md)) |
| Playwright | `serviceWorkers: 'block'` nos testes comuns (o worker escapa do `page.route` e guarda arquivos velhos), liberado só nos do offline |

## Fora daqui

- Telas: [screens.md](screens.md).
- Classificação dos erros (Q6): [`src/lib/errors.ts`](../src/lib/errors.ts), comum às duas interfaces.
