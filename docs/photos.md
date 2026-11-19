# Fotos

Do arquivo da câmera ou da galeria até a foto guardada no rascunho, os alertas da prova fotográfica e as fotos do servidor guardadas para abrir sem sinal. As regras da prova (origem, horário, alertas, compressão) são as do [04](../../fast/docs/modules/04-execution-photos.md#prova-fotográfica) do backend; aqui fica como o aparelho as cumpre. **Código:** `src/photos/` e [`src/offline/seen-photos.ts`](../src/offline/seen-photos.ts). **Banco local:** `photos` e `seenPhotos` em [`src/offline/db.ts`](../src/offline/db.ts).

## Regras

- **F1.** Compressão antes de guardar: JPEG, lado maior até 1600 px, qualidade ~80%. Se ainda passar de 5 MB (limite do R16 no backend), reduz a qualidade até caber. `width` e `height` são os da foto comprimida.
- **F2.** `captured_at`:

| Origem        | `source`  | `captured_at`                                                                                                                                                                   |
| ------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Câmera do app | `camera`  | relógio do aparelho no clique (a tela passa o horário)                                                                                                                          |
| Galeria       | `gallery` | `DateTimeOriginal` do EXIF, lido do arquivo original (a compressão apaga o EXIF); com `OffsetTimeOriginal`, usa o fuso dele, senão o fuso do aparelho. Sem data no EXIF: `null` |

- **F3.** Localização (só se o técnico permitir; dado da foto, não rastreamento): câmera usa a posição que a tela passa (Geolocation API, com a precisão); galeria usa o GPS do EXIF, se houver, com a precisão de `GPSHPositioningError` ou `null`. Latitude e longitude andam juntas: sem uma, as duas ficam `null`.
- **F4.** Espaço antes de capturar: `navigator.storage.estimate()`; com menos de 20 MB livres, a tela avisa antes de abrir a câmera. Sem a API, não bloqueia.
- **F5.** Guardar no rascunho só em rascunho `editing` do mesmo usuário. Se o IndexedDB recusar por falta de espaço (`QuotaExceededError`), a foto não é marcada como salva e o erro sobe tipado (`storage_full`), para a tela avisar na hora: o técnico ainda está no local.
- **F6.** Tirar foto do rascunho: só em `editing`.
- **F7.** Alertas, calculados no front a partir dos dados (funções puras, usadas na revisão do escritório e no aparelho):

| Alerta                       | Quando                                                                                                              |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `gallery_without_exif`       | foto da galeria sem `captured_at`                                                                                   |
| `gallery_before_start`       | foto da galeria com `captured_at` anterior ao `client_started_at` da execução (sem `client_started_at`, não avalia) |
| `submitted_before_rejection` | `client_submitted_at` da tentativa anterior ao `reviewed_at` da rejeição anterior da mesma O.S.                     |
| `late_delivery`              | `client_submitted_at` posterior ao `due_at` da O.S. (sem prazo, nunca)                                              |

A tela traduz o código (`t('alerts.<código>')`).

**Fotos já vistas** ([offline.md](../../fast/docs/offline.md#o-que-fica-no-aparelho): "como arquivo, nunca a URL assinada"):

- **F8.** Ao abrir a O.S. com sinal, as fotos dela que o usuário ainda não tem no aparelho são baixadas pela URL assinada, uma por vez, em segundo plano, e guardadas como arquivo (`seenPhotos`, com o usuário e a O.S.). Melhor esforço: download que falha pula a foto (vem na próxima abertura); gravação recusada (sem espaço) para, sem aviso.
- **F9.** A tela mostra a foto pelo arquivo do aparelho quando há; senão, pela URL assinada.
- **F10.** Saem junto com a O.S.: a cada leitura de "Minhas O.S." que dá certo, ficam só as fotos das O.S. da lista; logout e remoção apagam todas ([queue.md](queue.md), Q10).

## Fora daqui

- A tela da câmera (`getUserMedia`) e o seletor da galeria: entram com as telas do técnico ([screens.md](screens.md)). Este módulo recebe o arquivo (`Blob`), a origem, o horário do clique e a posição.
- Envio ao R2: é da fila ([queue.md](queue.md)).

## Decisões

- **2026-11-13** — Na galeria, a localização vem do GPS do EXIF. _Por quê:_ o 04 pede a posição "no momento da captura"; para foto da galeria, a posição atual do aparelho seria a de quem anexa, não a de onde a foto foi tirada.
- **2026-11-13** — Aviso de espaço com menos de 20 MB livres. _Por quê:_ cabe com folga um envio típico (fotos de ~400 KB) e avisa antes de o técnico perder uma captura.
- **2026-11-13** — A "rejeição anterior" do `submitted_before_rejection` é a rejeição mais recente da O.S. com `reviewed_at` anterior ao `received_at` da tentativa; tentativa ainda na fila do aparelho (sem `received_at`) compara com a mais recente. _Por quê:_ só existe uma tentativa principal pendente por O.S. (R8 do 04), então a rejeição que a tentativa deveria responder é a última antes de ela chegar; a rejeição da própria tentativa vem depois e não conta.
- **2026-11-13** — `estimate()` que falha ou volta sem `quota`/`usage` conta como "sem a API": não bloqueia. _Por quê:_ o aviso é uma ajuda; impedir a captura por falta de informação faria o técnico perder a prova, e o `QuotaExceededError` (F5) ainda avisa se o espaço acabar de fato.
- **2026-11-13** — Guardar ou tirar foto de rascunho que não existe, é de outro usuário ou não está `editing` sobe o erro tipado `draft_not_editable` (do aparelho, não do catálogo do backend). A checagem e a gravação são uma transação do Dexie em `drafts` e `photos`. _Por quê:_ a tela não oferece essas ações fora de `editing`; se acontecer (a fila mudou o rascunho para `queued` entre o toque e a gravação), a foto não pode entrar num envio que já saiu. O `orderId` e o `userId` da foto vêm do rascunho, nunca da tela.
- **2026-11-13** — Tirar uma foto que já não existe no aparelho não é erro: não faz nada. _Por quê:_ toque repetido no "remover" (tela lenta em celular fraco) não deve mostrar falha de algo que deu certo.
- **2026-11-13** — EXIF ilegível ou `DateTimeOriginal` inválido (ex.: `0000:00:00 00:00:00`, data fora do calendário) vira `captured_at` `null`, sem erro; `OffsetTimeOriginal` fora do formato `±HH:MM` é ignorado (fuso do aparelho). Só `DateTimeOriginal` conta: o `DateTime` do IFD0 é data de modificação. _Por quê:_ a foto continua sendo prova e entra com o alerta `gallery_without_exif`, em vez de o técnico perder a foto por um EXIF quebrado; uma data de edição passaria por data de captura.
- **2026-11-13** — Coordenada fora da faixa (latitude além de ±90, longitude além de ±180), não numérica ou sem a referência N/S/E/W zera a localização inteira; a precisão só fica com latitude e longitude, e só se for número ≥ 0. _Por quê:_ o banco recusa esses valores (CHECK de `service_order_photos`), e o `submit_execution` recusaria o envio todo com `invalid_input`: perder a localização é melhor que perder a prova.
- **2026-11-13** — Compressão com `browser-image-compression` sem web worker (`useWebWorker: false`). _Por quê:_ o worker da biblioteca baixa o próprio script de uma CDN, o que falha sem sinal, justamente onde o técnico está. A biblioteca também nunca devolve arquivo maior que o original (baixa a qualidade de ~80% até ficar menor): aceito, porque economiza banda e a foto de origem já era menor.
- **2026-11-13** — Acima de 5 MB (5.242.880 bytes, o CHECK do R16), a compressão baixa só a qualidade, nunca a resolução: a biblioteca tenta em passos de 5% e, se não bastar, recomeça do original com metade da qualidade, até caber. _Por quê:_ o F1 manda reduzir a qualidade; recomeçar do original evita compressão em cima de compressão. Com 1600 px, um JPEG de qualidade mínima tem poucas centenas de KB, então o laço sempre termina.
- **2026-11-19** — Fotos já vistas: guardadas ao abrir a O.S., não ao baixar a lista. *Por quê:* o offline.md guarda as fotos "já vistas"; baixar todas as fotos de todas as O.S. gastaria dados móveis e espaço com fotos que o técnico talvez nunca abra. O download é um `fetch` da página à URL assinada, que depende do CORS do storage no `GET`, como o upload da fila já depende no `PUT`.
