# Fast O.S. — Front

PWA do sistema de ordens de serviço da Fast Monitoramento: uma interface para o escritório (computador, online) e outra para o técnico (celular, offline). O backend e os docs do sistema ficam no repositório irmão [`../fast`](../fast/README.md).

## Documentação

| Doc                                | Responde                               |
| ---------------------------------- | -------------------------------------- |
| [docs/screens.md](docs/screens.md) | telas por papel                        |
| [docs/queue.md](docs/queue.md)     | fila offline do técnico                |
| [docs/photos.md](docs/photos.md)   | fotos: compressão, EXIF, alertas       |
| [docs/components.md](docs/components.md) | componentes, tema e dados de exemplo |
| [docs/pending.md](docs/pending.md) | o que falta, no front e no backend |
| [docs/decisions.md](docs/decisions.md) | decisões do front e do backend, com o porquê |
| [CLAUDE.md](CLAUDE.md)             | como desenvolver aqui                  |

## Pré-requisitos

Node 24 e o backend rodando localmente (`npm run db:start` em `../fast`) para gerar os tipos e para os testes de ponta a ponta.

```bash
npm install
npx playwright install chromium   # navegador dos testes (Vitest browser e Playwright)
npm run check                     # lint, tipos e Vitest
```

## Comandos

| Comando                   | O que faz                                                  |
| ------------------------- | ---------------------------------------------------------- |
| `npm run dev`             | servidor de desenvolvimento                                |
| `npm run build`           | tipos e build de produção (com o service worker)           |
| `npm test`                | Vitest: projetos `unit` (Node) e `browser` (Chromium)      |
| `npm run test:e2e`        | Playwright contra o stack local do backend                 |
| `npm run lint` / `format` | Biome                                                      |
| `npm run types`           | gera `src/lib/database.types.ts` do banco local do backend |
| `npm run check`           | lint, tipos e Vitest                                       |

## Lançar

Versão semântica no `package.json`: começa em `0.0.0`, e a `1.0.0` é a primeira entregue à Fast. Major quebra o contrato (a versão mínima sobe junto), minor é funcionalidade nova, patch é correção ([decisões](docs/decisions.md#versão-e-atualização)).

1. O backend vai ao ar antes, se a versão nova depende dele ([operations.md](../fast/docs/operations.md#lançar)).
2. Com a árvore limpa e o `npm run check` e o `npm run test:e2e` verdes: `npm version patch|minor|major -m "chore: release v%s"` (sobe o número, commita e cria a tag `vX.Y.Z`).
3. `git push --follow-tags`: o Cloudflare Pages publica a `main`. Até a `1.0.0`, sem branch `release` nem prévia.
4. Os aparelhos atualizam sozinhos na próxima abertura ou troca de tela ([screens.md](docs/screens.md#comum)).

## Stack

TypeScript, React, Vite; shadcn/ui e Tailwind CSS; TanStack Router e Query; React Hook Form e Zod; `vite-plugin-pwa` (service worker próprio, `injectManifest`); Dexie; `browser-image-compression` e `exifr`; Vitest e Playwright; Biome. Hospedagem no Cloudflare Pages.
