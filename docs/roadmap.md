# Roadmap do front

Ordem de trabalho do front. Cada item é um comportamento: teste vermelho (quando tem regra própria), implementação e um commit. O técnico vem primeiro: fila e fotos são o maior risco e o valor central do produto. O roadmap do backend é o [dele](../../fast/docs/roadmap.md).

## 0. Fundação

- [x] Repositório, stack, Vitest (Node e Chromium), Biome, PWA com service worker próprio, tipos gerados do banco.
- [x] Docs: CLAUDE.md, telas, fila, fotos, roadmap.
- [x] Banco local (Dexie): rascunhos, fotos e fila.

## 1. Fila e fotos (em paralelo)

- [x] Fila offline: tipos de item, FIFO por O.S., envio do rascunho com fotos, classes de erro, espera crescente, lock, limpeza do usuário ([queue.md](queue.md)).
- [x] Fotos: compressão, `captured_at` e localização do EXIF, espaço, guardar e tirar do rascunho, alertas ([photos.md](photos.md)).

## 2. Base do app

- [x] Cliente Supabase com a sessão num storage do IndexedDB (a página e o service worker leem a mesma sessão).
- [x] Textos pt-BR (`t()`) com as chaves de erro do backend.
- [x] Rotas (TanStack Router), login, recuperar e definir senha, layout por papel.
- [x] shadcn/ui e tema.
- [ ] Service worker: fila no Background Sync, atualização do app.
- [x] Membro removido: conferir o vínculo ativo a cada recusa por regra da fila (ao abrir com sinal já confere); sem vínculo, `clearUser` e logout.
- [ ] ~~Playwright contra o stack local do backend.~~ Pausado (ver Decisões).

## 2b. Scratch visual (sem testes, dados de exemplo)

Esboço da estrutura visual do sistema inteiro, antes da integração real. Regras em [CLAUDE.md](../CLAUDE.md#scratch-visual). Os itens que faltam da etapa 2 (service worker com a fila, conferência do vínculo nas recusas da fila, Playwright) ficam para depois do scratch, junto com as etapas 3 e 4 de verdade.

- [x] Componentes reutilizáveis, dados de exemplo compartilhados e a vitrine em `/dev/components`.
- [x] Telas do técnico (etapa 3) em scratch ([screens-technician.md](screens-technician.md)).
- [x] Telas do escritório (etapa 4) em scratch ([screens-office.md](screens-office.md)).

## 3. Técnico

- [x] Minhas O.S. com cache persistido (TanStack Query no IndexedDB).
- [x] Detalhe da O.S. e materiais offline.
- [x] Execução: câmera, galeria, rascunho, enviar.
- [x] Complemento.
- [x] Pendências.
- [ ] Fotos já vistas no aparelho sem sinal (offline.md, "Fotos já vistas"): hoje as URLs assinadas vencem e a foto do servidor não abre offline.
- [ ] ~~E2E: execução offline com fotos chega ao servidor sem duplicar.~~ Pausado (ver Decisões).

## 4. Escritório

- [x] Base: fonte de dados por chave (`VITE_DATA_SOURCE`), API real tipada pela de exemplo, sessão real na moldura, erros das ações por classe.
- [x] Dashboard.
- [x] Clientes e endereços (a importação espera o `import_clients`, etapa 9 do backend).
- [x] O.S.: criar, editar, atribuir, cancelar, histórico.
- [x] Revisão: aprovar, rejeitar, ciência dos tardios, alertas.
- [x] Empresa, membros e auditoria (owner).
- [ ] Pendências do escritório: serviço de CEP (hoje a tabela de exemplo; decidido o ViaCEP em 2026-11-19, a fazer depois); importação de clientes (etapa 9 do backend). Email dos membros: decidido em 2026-11-19 não mostrar na lista ([screens-office.md](screens-office.md#decisões)).

## 5. Produção

- [ ] Ícones e manifest final.
- [ ] Cloudflare Pages ligado ao Supabase de produção.

## Decisões

- **2026-11-19** — Playwright de lado até segunda ordem: sem E2E, e o projeto `browser` do Vitest (que roda no Chromium do Playwright) sai do `npm test` e do `npm run check`, ficando em `npm run test:browser`. *Por quê:* pedido do usuário para entregar as funcionalidades primeiro; instalar e manter o navegador de teste fica para depois.
