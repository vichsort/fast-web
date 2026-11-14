// Diálogos e painéis genéricos: confirmação, ação destrutiva com motivo obrigatório (spec: "toda ação destrutiva
// exige motivo": cancelar O.S., rejeitar, excluir cliente ou endereço, remover membro), formulário em diálogo e
// painel lateral. Controlados (open/onOpenChange) ou com `trigger`.
import { TriangleExclamationPoint, X } from 'lucide-react';
import * as React from 'react';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { errorMessage, t } from '@/lib/i18n';
import { cn } from '@/lib/utils';

/** Abre/fecha controlado por fora ou pelo próprio componente. */
function useOpenState(open: boolean | undefined, onOpenChange: ((open: boolean) => void) | undefined) {
  const [inner, setInner] = React.useState(false);
  const isOpen = open ?? inner;
  const setOpen = (next: boolean) => {
    if (open === undefined) setInner(next);
    onOpenChange?.(next);
  };
  return [isOpen, setOpen] as const;
}

/** Roda a ação (síncrona ou Promise) com estado de envio; fecha se der certo. */
function usePending() {
  const [pending, setPending] = React.useState(false);
  async function run(action: () => unknown, onDone: () => void) {
    setPending(true);
    try {
      await action();
      onDone();
    } finally {
      setPending(false);
    }
  }
  return [pending, run] as const;
}

interface DialogBaseProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Elemento que abre o diálogo (recebe o comportamento por `render`). */
  trigger?: React.ReactElement;
  title: React.ReactNode;
  description?: React.ReactNode;
}

export interface ConfirmDialogProps extends DialogBaseProps {
  confirmLabel?: string;
  cancelLabel?: string;
  /** `destructive`: botão vermelho e ícone de alerta. */
  tone?: 'default' | 'destructive';
  /** Pode devolver Promise: o botão mostra o envio e o diálogo fecha quando ela resolve. */
  onConfirm: () => unknown;
  /** Conteúdo extra (ex.: comentário opcional da aprovação). */
  children?: React.ReactNode;
}

/** Confirmação simples (aprovar, dar ciência, sair com itens na fila). */
export function ConfirmDialog({
  open,
  onOpenChange,
  trigger,
  title,
  description,
  confirmLabel,
  cancelLabel,
  tone = 'default',
  onConfirm,
  children,
}: ConfirmDialogProps) {
  const [isOpen, setOpen] = useOpenState(open, onOpenChange);
  const [pending, run] = usePending();
  return (
    <AlertDialog open={isOpen} onOpenChange={setOpen}>
      {trigger && <AlertDialogTrigger render={trigger} />}
      <AlertDialogContent>
        <AlertDialogHeader>
          {tone === 'destructive' && (
            <AlertDialogMedia className="bg-destructive/10 text-destructive">
              <TriangleExclamationPoint />
            </AlertDialogMedia>
          )}
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description && <AlertDialogDescription>{description}</AlertDialogDescription>}
        </AlertDialogHeader>
        {children}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>{cancelLabel ?? t('ui.actions.cancel')}</AlertDialogCancel>
          <Button
            variant={tone === 'destructive' ? 'destructive' : 'default'}
            disabled={pending}
            onClick={() => run(onConfirm, () => setOpen(false))}
          >
            {pending && <Spinner aria-hidden />}
            {confirmLabel ?? t('ui.actions.confirm')}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export interface ReasonDialogProps extends DialogBaseProps {
  /** Rótulo do campo (padrão: "Motivo"). */
  label?: string;
  placeholder?: string;
  hint?: string;
  confirmLabel: string;
  cancelLabel?: string;
  /** Código do catálogo mostrado quando o motivo está vazio (`reason_required` ou `comment_required`). */
  requiredCode?: 'reason_required' | 'comment_required';
  /** Recebe o motivo já sem espaços nas pontas. Pode devolver Promise. */
  onConfirm: (reason: string) => unknown;
  /** Resumo do que vai ser afetado (ex.: número e título da O.S.). */
  children?: React.ReactNode;
}

/** Ação destrutiva com motivo obrigatório: não confirma com o campo vazio ou só com espaços. */
export function ReasonDialog({
  open,
  onOpenChange,
  trigger,
  title,
  description,
  label,
  placeholder,
  hint,
  confirmLabel,
  cancelLabel,
  requiredCode = 'reason_required',
  onConfirm,
  children,
}: ReasonDialogProps) {
  const id = React.useId();
  const [reason, setReason] = React.useState('');
  const [error, setError] = React.useState(false);
  const [pending, run] = usePending();
  const [isOpen, setOpen] = useOpenState(open, (next) => {
    if (!next) {
      setReason('');
      setError(false);
    }
    onOpenChange?.(next);
  });

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = reason.trim();
    if (!trimmed) {
      setError(true);
      return;
    }
    void run(
      () => onConfirm(trimmed),
      () => setOpen(false),
    );
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={setOpen}>
      {trigger && <AlertDialogTrigger render={trigger} />}
      <AlertDialogContent className="sm:max-w-md data-[size=default]:sm:max-w-md">
        <form onSubmit={submit} className="contents">
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-destructive/10 text-destructive">
              <TriangleExclamationPoint />
            </AlertDialogMedia>
            <AlertDialogTitle>{title}</AlertDialogTitle>
            {description && <AlertDialogDescription>{description}</AlertDialogDescription>}
          </AlertDialogHeader>
          {children}
          <Field data-invalid={error || undefined}>
            <FieldLabel htmlFor={id}>{label ?? t('ui.dialogs.reasonLabel')}</FieldLabel>
            <Textarea
              id={id}
              autoFocus
              value={reason}
              onChange={(event) => {
                setReason(event.target.value);
                if (error && event.target.value.trim()) setError(false);
              }}
              placeholder={placeholder ?? t('ui.dialogs.reasonPlaceholder')}
              aria-invalid={error || undefined}
              aria-required
              rows={3}
              className="min-h-24"
            />
            {error ? (
              <FieldError>{errorMessage(requiredCode)}</FieldError>
            ) : (
              <FieldDescription>{hint ?? t('ui.dialogs.reasonHint')}</FieldDescription>
            )}
          </Field>
          <AlertDialogFooter>
            <AlertDialogCancel type="button" disabled={pending}>
              {cancelLabel ?? t('ui.actions.cancel')}
            </AlertDialogCancel>
            <Button type="submit" variant="destructive" disabled={pending}>
              {pending && <Spinner aria-hidden />}
              {confirmLabel}
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export interface FormDialogProps extends DialogBaseProps {
  submitLabel?: string;
  cancelLabel?: string;
  /** Recebe o evento já com preventDefault. Pode devolver Promise; fecha quando resolve. */
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => unknown;
  /** Desabilita o botão (formulário inválido). */
  submitDisabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  className?: string;
}

const dialogWidth = { sm: 'sm:max-w-sm', md: 'sm:max-w-lg', lg: 'sm:max-w-2xl' } as const;

/** Formulário em diálogo (editar O.S., novo endereço, convidar membro). */
export function FormDialog({
  open,
  onOpenChange,
  trigger,
  title,
  description,
  submitLabel,
  cancelLabel,
  onSubmit,
  submitDisabled,
  size = 'md',
  children,
  className,
}: FormDialogProps) {
  const [isOpen, setOpen] = useOpenState(open, onOpenChange);
  const [pending, run] = usePending();
  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      {trigger && <DialogTrigger render={trigger} />}
      <DialogContent
        showCloseButton={false}
        className={cn('max-h-[90svh] gap-0 overflow-hidden p-0', dialogWidth[size], className)}
      >
        <form
          className="flex max-h-[90svh] flex-col"
          onSubmit={(event) => {
            event.preventDefault();
            void run(
              () => onSubmit(event),
              () => setOpen(false),
            );
          }}
        >
          <DialogHeader className="border-b p-4 pr-12">
            <DialogTitle>{title}</DialogTitle>
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>
          <DialogClose render={<Button {...closeIconProps} aria-label={t('ui.actions.close')} />}>
            <X />
          </DialogClose>
          <div className="flex-1 overflow-y-auto p-4">{children}</div>
          <DialogFooter className="m-0">
            <DialogClose render={<Button type="button" variant="outline" disabled={pending} />}>
              {cancelLabel ?? t('ui.actions.cancel')}
            </DialogClose>
            <Button type="submit" disabled={pending || submitDisabled}>
              {pending && <Spinner aria-hidden />}
              {submitLabel ?? t('ui.actions.save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const closeIconProps = {
  variant: 'ghost',
  size: 'icon-sm',
  className: 'absolute top-3 right-3',
} as const;

export interface SidePanelProps extends DialogBaseProps {
  /** Rodapé fixo (botões). */
  footer?: React.ReactNode;
  /** Lado de onde abre. No celular, `bottom` costuma ser melhor. */
  side?: 'right' | 'left' | 'bottom';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  className?: string;
}

const sheetWidth = { sm: 'sm:max-w-sm', md: 'sm:max-w-lg', lg: 'sm:max-w-2xl' } as const;

/** Painel lateral (sheet): detalhe rápido, filtros, formulário longo. */
export function SidePanel({
  open,
  onOpenChange,
  trigger,
  title,
  description,
  footer,
  side = 'right',
  size = 'md',
  children,
  className,
}: SidePanelProps) {
  const [isOpen, setOpen] = useOpenState(open, onOpenChange);
  return (
    <Sheet open={isOpen} onOpenChange={setOpen}>
      {trigger && <SheetTrigger render={trigger} />}
      <SheetContent
        side={side}
        showCloseButton={false}
        className={cn(
          'gap-0',
          side === 'bottom' ? 'max-h-[90svh] rounded-t-2xl' : cn('w-full', sheetWidth[size]),
          className,
        )}
      >
        <SheetHeader className="border-b pr-12">
          <SheetTitle>{title}</SheetTitle>
          {description ? (
            <SheetDescription>{description}</SheetDescription>
          ) : (
            <SheetDescription className="sr-only">{title}</SheetDescription>
          )}
        </SheetHeader>
        <SheetClose render={<Button {...closeIconProps} aria-label={t('ui.actions.close')} />}>
          <X />
        </SheetClose>
        <div className="flex-1 overflow-y-auto p-4">{children}</div>
        {footer && <SheetFooter className="border-t">{footer}</SheetFooter>}
      </SheetContent>
    </Sheet>
  );
}

export interface FormPanelProps extends Omit<SidePanelProps, 'footer'> {
  submitLabel?: string;
  cancelLabel?: string;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => unknown;
  submitDisabled?: boolean;
}

/** Formulário no painel lateral (criar/editar O.S. sem sair da lista). */
export function FormPanel({ submitLabel, cancelLabel, onSubmit, submitDisabled, children, ...props }: FormPanelProps) {
  const [isOpen, setOpen] = useOpenState(props.open, props.onOpenChange);
  const [pending, run] = usePending();
  const formId = React.useId();
  return (
    <SidePanel
      {...props}
      open={isOpen}
      onOpenChange={setOpen}
      footer={
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" disabled={pending} onClick={() => setOpen(false)}>
            {cancelLabel ?? t('ui.actions.cancel')}
          </Button>
          <Button type="submit" form={formId} disabled={pending || submitDisabled}>
            {pending && <Spinner aria-hidden />}
            {submitLabel ?? t('ui.actions.save')}
          </Button>
        </div>
      }
    >
      <form
        id={formId}
        onSubmit={(event) => {
          event.preventDefault();
          void run(
            () => onSubmit(event),
            () => setOpen(false),
          );
        }}
      >
        {children}
      </form>
    </SidePanel>
  );
}
