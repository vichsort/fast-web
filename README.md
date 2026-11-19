# Fast O.S. — Front

PWA do sistema de ordens de serviço da Fast Monitoramento: uma interface para o escritório (computador, online) e outra para o técnico (celular, offline). O backend e os docs do sistema ficam no repositório irmão [`../fast`](../fast/README.md).

## Documentação

| Doc                                | Responde                               |
| ---------------------------------- | -------------------------------------- |
| [docs/screens.md](docs/screens.md) | telas por papel                        |
| [docs/queue.md](docs/queue.md)     | fila offline do técnico                |
| [docs/photos.md](docs/photos.md)   | fotos: compressão, EXIF, alertas       |
| [docs/components.md](docs/components.md) | componentes, tema e dados de exemplo |
| [docs/roadmap.md](docs/roadmap.md) | ordem de execução e o que já foi feito |
| [CLAUDE.md](CLAUDE.md)             | como desenvolver aqui                  |

## Pré-requisitos

Node 24 e o backend rodando localmente (`npm run db:start` em `../fast`) para gerar os tipos e para os testes de ponta a ponta.

```bash
npm install
npx playwright install chromium   # só para `npm run test:browser` e o Playwright (pausados)
npm run check                     # lint, tipos e Vitest
```

## Comandos

| Comando                   | O que faz                                                  |
| ------------------------- | ---------------------------------------------------------- |
| `npm run dev`             | servidor de desenvolvimento                                |
| `npm run build`           | tipos e build de produção (com o service worker)           |
| `npm test`                | Vitest: projeto `unit` (Node)                              |
| `npm run test:browser`    | Vitest: projeto `browser` (Chromium), pausado              |
| `npm run test:e2e`        | Playwright contra o stack local do backend, pausado        |
| `npm run lint` / `format` | Biome                                                      |
| `npm run types`           | gera `src/lib/database.types.ts` do banco local do backend |
| `npm run check`           | lint, tipos e Vitest                                       |

## Stack

TypeScript, React, Vite; shadcn/ui e Tailwind CSS; TanStack Router e Query; React Hook Form e Zod; `vite-plugin-pwa` (service worker próprio, `injectManifest`); Dexie; `browser-image-compression` e `exifr`; Vitest e Playwright; Biome. Hospedagem no Cloudflare Pages.
