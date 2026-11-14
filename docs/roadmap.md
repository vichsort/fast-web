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
- [ ] Textos pt-BR (`t()`) com as chaves de erro do backend.
- [ ] Rotas (TanStack Router), login, recuperar e definir senha, layout por papel.
- [ ] shadcn/ui e tema.
- [ ] Service worker: fila no Background Sync, atualização do app.
- [ ] Membro removido: conferir o vínculo ativo ao abrir com sinal e a cada recusa por regra; sem vínculo, `clearUser` e logout.
- [ ] Playwright contra o stack local do backend.

## 3. Técnico

- [ ] Minhas O.S. com cache persistido (TanStack Query no IndexedDB).
- [ ] Detalhe da O.S. e materiais offline.
- [ ] Execução: câmera, galeria, rascunho, enviar.
- [ ] Complemento.
- [ ] Pendências.
- [ ] E2E: execução offline com fotos chega ao servidor sem duplicar.

## 4. Escritório

- [ ] Dashboard.
- [ ] Clientes e endereços.
- [ ] O.S.: criar, editar, atribuir, cancelar, histórico.
- [ ] Revisão: aprovar, rejeitar, ciência dos tardios, alertas.
- [ ] Empresa, membros e auditoria (owner).

## 5. Produção

- [ ] Ícones e manifest final.
- [ ] Cloudflare Pages ligado ao Supabase de produção.
