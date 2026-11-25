# Componentes

Componentes do domínio em [`src/components/`](../src/components/) (o catálogo é a vitrine `/dev/components`, só em desenvolvimento), tema em [`src/index.css`](../src/index.css), formatação em [`src/lib/format.ts`](../src/lib/format.ts), textos em [`src/lib/i18n/ui.ts`](../src/lib/i18n/ui.ts) e dados de exemplo em [`src/mocks/`](../src/mocks/).

## Convenções

- **Sem rota e sem dado próprio.** Componente recebe dados por props, com tipos estruturais (`OrderCardData`, `PhotoData`, `AttemptData`…) que as views de `src/lib/views.ts` satisfazem; a consulta real devolve a mesma forma.
- **Navegação por `render`.** Cartões, contadores, itens de menu e "voltar" recebem o elemento de navegação (`render={<Link to="..." />}`), ou `href`/`onClick`. O componente não importa o router.
- **Controlados.** Filtros, seletores e diálogos recebem `value`/`onValueChange` e `open`/`onOpenChange`. Diálogos também aceitam `trigger`. `onConfirm`/`onSubmit` podem devolver Promise: o botão mostra o envio e o diálogo fecha quando resolve.
- **Fuso.** Todo componente que mostra data recebe `timeZone` (o `companies.timezone`) e, opcionalmente, `now`.
- **Variantes comuns:** `size` (`sm`/`md`/`lg`), `density` (`compact`/`comfortable`/`touch`), `variant`, e `className` repassado ao elemento raiz.
- **Acessibilidade.** Selo sempre com texto (nunca só cor); só-ícone ganha `aria-label`; linhas e cartões clicáveis navegam por teclado; textos de leitor de tela em pt-BR.
- **Textos** em `ui.ts` (`t('ui.…')`); rótulos dos enums em `ui.status`, `ui.priority`, `ui.serviceType`, `ui.role`, `ui.review`, `ui.photoSource`; alertas em `alerts.<código>` (longo) e `ui.alertShort.<código>` (selo).
- **Formulários:** React Hook Form + Zod (`zodResolver`). O schema confere só o que a tela já conferia (obrigatório, formato); as peças comuns ficam em [`src/lib/forms.ts`](../src/lib/forms.ts) (`requiredText`, `emailText`, `requiredChoice`) e o endereço em [`address-schema.ts`](../src/office/clients/address-schema.ts). Input nativo por `register`; combobox, cartões, data e caixas de seleção por `Controller`. Os erros aparecem depois de tentar salvar e se refazem a cada mudança; as mensagens vêm do schema (`t()`). Todo campo que grava texto tem `maxLength` (`SHORT_TEXT_MAX` ou `LONG_TEXT_MAX`, de [`src/lib/input.ts`](../src/lib/input.ts)), o mesmo [limite](../../fast/docs/api.md#tamanho-do-texto) do banco.
- **shadcn/ui** (`src/components/ui/`) é a base; os componentes de domínio o compõem. Para algo genérico (input, select, tabs, tooltip…), use o de `ui/` direto.

## Tema

Tudo em [`src/index.css`](../src/index.css), claro em `:root` e escuro em `.dark`. Trocar a identidade é editar só ali.

| Camada | Tokens | Para |
| --- | --- | --- |
| Marca e superfícies | `--primary` (azul da marca), `--background`, `--card`, `--foreground`, `--muted-foreground`, `--border`, `--input`, `--ring`, `--sidebar-*` (lateral azul-marinho), `--chart-*` | padrão do shadcn; texto secundário e bordas mais fortes que o padrão, para o sol |
| Forma | `--radius` | cantos de tudo |
| Tons | `--tone-neutral`, `--tone-muted`, `--tone-brand`, `--tone-info`, `--tone-progress`, `--tone-warning`, `--tone-danger`, `--tone-success`; `--tone-soft-mix`, `--tone-text-mix`, `--tone-contrast`, `--tone-contrast-warning` | uma cor sólida por significado; o fundo suave e o texto dos selos saem dela por `color-mix` em oklab |
| Papéis semânticos | `--status-*` (6), `--priority-*` (4), `--service-*` (3), `--role-*` (3), `--review-*` (4), `--alert-*` (4 códigos), `--overdue`, `--unassigned`, `--late-supplement`, `--new-item`, `--sync-*` (5), `--whatsapp` | cada um aponta para um tom; trocar a cor de um status é trocar a linha dele |
| Densidade | `--density` por `data-density="compact"` (0,75), `comfortable` (1), `touch` (1,25); derivados `--space-row-y`, `--space-row-x`, `--space-card`, `--space-gap`, `--size-touch` | espaçamento de linhas, cartões e alvos; a interface do técnico usa `touch` |

**Utilitários de tom:** defina `--tone` (ex.: a classe `statusVar.open`, ou `[--tone:var(--tone-info)]`) e use `tone-soft` (fundo suave + texto + borda), `tone-solid`, `tone-outline`, `tone-text`, `tone-fill`, `tone-border` ou `tone-wash`. Selo sólido de tom claro (âmbar) usa `--tone-on` para o texto escuro.

**Como customizar:** cor da marca → `--primary` e `--sidebar-*` (nos dois modos); cor de um significado → o `--tone-*`; cor de um status ou alerta específico → a linha `--status-*`/`--alert-*` no bloco `:root, .dark`; arredondamento → `--radius`; aperto geral → os valores de `--density`.

## Dados de exemplo (`src/mocks/`)

Linhas tipadas por `database.types.ts` em `data.ts` (datas relativas ao carregamento, para "atrasada" e "há 5 min" valerem em qualquer dia), fotos SVG locais em `images.ts`; os tipos são as views de `src/lib/views.ts`. Só as implementações de exemplo das áreas (`src/office/mocks.ts`, `src/technician/api/mock.ts`) e a vitrine `/dev` importam de `@/mocks`; as telas usam a API da área. Fora do build de produção ([CLAUDE.md](../CLAUDE.md#convenções)).

| Conjunto | Conteúdo |
| --- | --- |
| Empresa | Fast Monitoramento, `America/Sao_Paulo` |
| Membros | dono (Ricardo), gestora (Juliana), 4 técnicos (Marcos, Diego, Paulo, Lucas), 1 removido com motivo (André) e 1 convite pendente (Rafael, só com o nome e o email do convite) |
| Clientes | 10, com 0 a 3 endereços (principal, sem endereço do cadastro rápido, endereço excluído) e 1 cliente excluído com O.S. antiga |
| O.S. | 15 (#0031–#0045): todos os status, prioridades e tipos; sem técnico, atrasadas (aberta, em execução, rejeitada), sem prazo, vencendo hoje, cancelada com tentativa anulada, uma com técnico tirado por remoção do membro |
| Execuções | pendente com complemento convertido e complemento com foto da galeria sem EXIF; rejeitada com motivo e nova tentativa enviada antes da rejeição (com foto da galeria anterior ao início); entregue com atraso; aprovada com comentário; complemento tardio visto e não visto |
| Histórico | eventos gerados de forma coerente com os dados (criação, atribuição, edição, troca de endereço, materiais, início, envios, revisões, ciência, cancelamento) |
| Auditoria | convite, troca de papel, remoção, edição da empresa |
| Aparelho do técnico (Marcos) | 6 itens de pendência (enviando com fotos, na fila, esperando rede, recusado `order_closed`, recusado `conflict`, bloqueado), estado da sincronização, O.S. "novas" no aparelho |
