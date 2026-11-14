# Fotos

Do arquivo da câmera ou da galeria até a foto guardada no rascunho, e os alertas da prova fotográfica. As regras da prova (origem, horário, alertas, compressão) são as do [04](../../fast/docs/modules/04-execution-photos.md#prova-fotográfica) do backend; aqui fica como o aparelho as cumpre. **Código:** `src/photos/`. **Banco local:** `photos` em [`src/offline/db.ts`](../src/offline/db.ts).

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

## Fora daqui

- A tela da câmera (`getUserMedia`) e o seletor da galeria: entram com as telas do técnico ([screens.md](screens.md)). Este módulo recebe o arquivo (`Blob`), a origem, o horário do clique e a posição.
- Envio ao R2: é da fila ([queue.md](queue.md)).

## Decisões

- **2026-11-13** — Na galeria, a localização vem do GPS do EXIF. _Por quê:_ o 04 pede a posição "no momento da captura"; para foto da galeria, a posição atual do aparelho seria a de quem anexa, não a de onde a foto foi tirada.
- **2026-11-13** — Aviso de espaço com menos de 20 MB livres. _Por quê:_ cabe com folga um envio típico (fotos de ~400 KB) e avisa antes de o técnico perder uma captura.
