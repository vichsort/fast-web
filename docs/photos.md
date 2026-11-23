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

**URLs assinadas** (`get_photo_urls`, [04](../../fast/docs/modules/04-execution-photos.md#edge-function-get_photo_urls--quem-pode-ver-a-os): GET válido por 5 minutos), nas duas áreas, em [`orders-query.ts`](../src/lib/orders-query.ts):

- **F11.** Cada leitura do detalhe da O.S. reaproveita, por id da foto, a URL guardada na memória da aba enquanto faltar mais de 1 minuto para vencer; só as outras são assinadas de novo. O vencimento é o menor entre o `expires_at` e 5 minutos contados do pedido (relógio do aparelho atrasado). Imagem que não carrega (miniatura preguiçosa ou visualizador abertos depois do vencimento) esquece a URL e relê as O.S. abertas da área, que assinam só essa; URL com menos de 30 s não é renovada (a falha não é o vencimento, e renovar faria um laço). A foto guardada no aparelho (F9) não passa por aqui.

## Fora daqui

- A tela da câmera (`getUserMedia`) e o seletor da galeria: entram com as telas do técnico ([screens.md](screens.md)). Este módulo recebe o arquivo (`Blob`), a origem, o horário do clique e a posição.
- Envio ao R2: é da fila ([queue.md](queue.md)).
