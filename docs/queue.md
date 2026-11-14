# Fila offline

Implementação no aparelho da fila descrita em [offline.md](../../fast/docs/offline.md#fila) do backend: o que o técnico faz sem sinal é guardado e enviado quando a conexão volta, sem duplicar. As respostas e os códigos de erro são os do backend ([errors.md](../../fast/docs/errors.md), [04](../../fast/docs/modules/04-execution-photos.md), [03](../../fast/docs/modules/03-service-orders.md)). **Código:** `src/offline/`. **Banco local:** [`src/offline/db.ts`](../src/offline/db.ts).

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
| Servidor | HTTP 5xx, 540                       | igual a rede                                                                                                                                                                                       |
| Sessão   | HTTP 401, `PGRST301`, "JWT expired" | pede a renovação da sessão e tenta de novo; se a renovação falhar, para a fila inteira e avisa que precisa de login                                                                                |
| Regra    | `code = 'P0001'`                    | tira o item; no `submit`, o rascunho fica `refused` com o código; nos outros tipos, o motivo fica registrado para a tela mostrar (no `conflict` de materiais, junto com o texto atual do servidor) |
| Bug      | `42501`, `PGRST202`, outros         | item `blocked` com o erro; nunca descarta; a fila segue nas outras O.S.                                                                                                                            |

- **Q7.** Espera crescente: dobra a cada tentativa, começa em 5 s e para em 5 min. Uma resposta de sucesso em qualquer item zera a espera dos itens que esperavam por rede ("online" é um request que deu certo, nunca `navigator.onLine`).
- **Q8.** Upload com timeout generoso (5 min por foto: 400 KB em 2G leva minutos).
- **Q9.** Um processador por vez, mesmo com a página e o service worker acordados juntos: o processamento roda sob um lock (Web Locks API, `fast-queue`).
- **Q10.** Logout e remoção do membro apagam tudo do usuário no aparelho: rascunhos, fotos e fila. Antes do logout, a tela pergunta se há itens pendentes (contagem pela fila).
- **Q11.** A fila não conhece React nem DOM: roda na página e no service worker. Recebe a API (chamadas ao Supabase e o PUT), o lock e o relógio por injeção; os testes passam versões falsas.

## Rascunho

O rascunho (`drafts`) é editado pela tela até o técnico tocar em "Enviar"; aí vira `queued` e entra na fila (Q4). Recusado por regra, fica `refused`, visível com o motivo, até o técnico apagar ([offline.md](../../fast/docs/offline.md#recusa-definitiva)). Fotos são das telas e do módulo de fotos ([photos.md](photos.md)); a fila só lê, marca `uploaded` e apaga.

## Fora daqui

- Ligar a fila ao service worker e ao Background Sync, e a sessão do Supabase acessível no service worker: entram com a base do app ([roadmap](roadmap.md)).
- Telas: [screens.md](screens.md).

## Decisões

- **2026-11-13** — Um item por vez no aparelho todo, não um por O.S. em paralelo. _Por quê:_ sinal ruim é o normal; paralelismo só disputaria a mesma banda.
- **2026-11-13** — Fila independente de React e DOM, com API, lock e relógio injetados. _Por quê:_ o mesmo código roda na página e no service worker, e os testes não usam rede.
- **2026-11-13** — Nova edição de materiais com um item de materiais já na fila daquela O.S. troca o texto no lugar (mesma posição) e mantém o `expected` do item, o texto do servidor de onde a primeira edição partiu. _Por quê:_ o 03 manda guardar só a última edição; manter o `expected` original faz o `conflict` aparecer se alguém mudou o texto no servidor, em vez de sobrescrever o texto do outro com uma edição que partiu de uma versão velha.
- **2026-11-13** — `P0001` com `not_authenticated` é tratado como Sessão, não como Regra; o status HTTP vem antes do corpo (o 401 das Edge Functions traz `{ code: 'P0001', message: 'not_authenticated' }`). _Por quê:_ é token vencido, não recusa do banco; como Regra, o envio viraria `refused` por causa de um token, e o técnico poderia apagar a prova.
- **2026-11-13** — Sessão: uma renovação por item. Se o erro de sessão volta logo depois de uma renovação que deu certo, a fila para e pede login; se a renovação falha por rede ou servidor, o item espera como na rede. _Por quê:_ sem esse limite, um token que o servidor sempre recusa faria a fila renovar e tentar sem fim; e sem rede não dá para concluir que o login acabou.
- **2026-11-13** — Materiais editados enquanto o item estava no ar: aceito o envio, o item fica na fila com o texto novo e com o texto que o servidor devolveu como `expected`; recusado, a recusa guarda o texto mais novo. _Por quê:_ apagar o item no sucesso perderia a edição feita durante a chamada; e o texto que o próprio aparelho acabou de gravar não pode virar `conflict` na tentativa seguinte.
- **2026-11-13** — Recusas de `start` e `materials` ficam na tabela local `refusals` até a tela dispensar. _Por quê:_ esses itens não têm rascunho onde guardar o motivo, e a tela precisa mostrar o `conflict` com as duas versões.
- **2026-11-13** — O PUT feito com a confirmação pendente fica gravado no item (`stagedPhotoIds`): a retomada só confirma, sem reenviar o arquivo. Se a confirmação responder `photo_missing_in_storage` para uma foto de uma tentativa anterior, a marca sai e a foto é enviada de novo, sem recusar o rascunho. _Por quê:_ reenviar 400 KB em 2G custa minutos; e o staging expira em 1 dia (04, R18), então essa resposta depois de uma longa falta de sinal não é recusa da regra.
- **2026-11-13** — RPCs e Edge Functions da fila com timeout de 60 s (o PUT da foto tem os 5 min do Q8); estourou, é Rede. _Por quê:_ com um item por vez no aparelho (Q2), uma chamada pendurada sem timeout seguraria a fila inteira até o app fechar.
