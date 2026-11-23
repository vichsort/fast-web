// Fotos da prova (04, "Prova fotográfica"): miniatura com origem, horário e alertas; grade; visualizador ampliado;
// e a área de "adicionar foto" (só visual no scratch: câmera e galeria reais entram com src/photos).
import {
  Camera,
  ChevronLeft,
  ChevronRight,
  Clock,
  Image,
  ImagePlus,
  MapPin,
  MapPinOff,
  TriangleExclamationPoint,
  Upload,
  X,
} from 'lucide-react';
import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import type { PhotoSource } from '@/lib/enums';
import { formatDateTime, formatTime } from '@/lib/format';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { PhotoAlert } from '@/photos/alerts';
import { AlertBadge, PhotoSourceBadge } from './badges';

/** O que os componentes de foto leem (PhotoView dos mocks satisfaz; no aparelho, o rascunho com a URL do blob). */
export interface PhotoData {
  id: string;
  url: string;
  source: PhotoSource;
  captured_at: string | null;
  uploaded_at?: string | null;
  accuracy_m?: number | null;
  latitude?: number | null;
  alerts: PhotoAlert[];
}

/**
 * Quem trata a foto que não carregou (URL assinada vencida, docs/photos.md, F11): cada área liga no layout
 * (`usePhotoUrlRenewal`); fora dele, nada acontece.
 */
const PhotoErrorContext = React.createContext<((photo: PhotoData) => void) | null>(null);
export const PhotoErrorProvider = PhotoErrorContext.Provider;

export interface PhotoThumbProps extends Omit<React.ComponentProps<'button'>, 'children'> {
  photo: PhotoData;
  timeZone: string;
  /** Posição e total, para o texto alternativo. */
  index?: number;
  total?: number;
  /** Esconde origem, horário e alerta sobre a imagem. */
  hideMeta?: boolean;
  /** Botão de remover (rascunho no aparelho). */
  onRemove?: () => void;
  size?: 'sm' | 'md' | 'lg';
}

/** Miniatura 4:3 com selo de origem, horário da captura e alerta. */
export function PhotoThumb({
  photo,
  timeZone,
  index = 0,
  total = 1,
  hideMeta,
  onRemove,
  size = 'md',
  className,
  ...props
}: PhotoThumbProps) {
  const hasAlert = photo.alerts.length > 0;
  const alt = t('ui.photos.alt', { n: index + 1, total });
  const onPhotoError = React.useContext(PhotoErrorContext);
  return (
    <div
      data-slot="photo-thumb"
      className={cn(
        'group/photo relative overflow-hidden rounded-lg border bg-muted',
        size === 'sm' && 'w-24',
        size === 'lg' && 'w-56',
        hasAlert &&
          'border-[color-mix(in_oklab,var(--tone-warning)_70%,transparent)] ring-1 ring-[color-mix(in_oklab,var(--tone-warning)_40%,transparent)]',
        className,
      )}
    >
      <button
        type="button"
        className="block aspect-[4/3] w-full outline-none focus-visible:ring-3 focus-visible:ring-ring/60 focus-visible:ring-inset"
        aria-label={alt}
        {...props}
      >
        <img
          src={photo.url}
          alt={alt}
          loading="lazy"
          decoding="async"
          onError={() => onPhotoError?.(photo)}
          className="size-full object-cover transition-transform group-hover/photo:scale-[1.03]"
        />
      </button>
      {!hideMeta && (
        <>
          <span
            className={cn(
              'pointer-events-none absolute top-1.5 left-1.5 flex size-6 items-center justify-center rounded-md text-white shadow-sm',
              photo.source === 'camera' ? 'bg-black/55' : 'bg-[color-mix(in_oklab,var(--tone-warning)_85%,black)]',
            )}
            title={t(`ui.photoSource.${photo.source}`)}
          >
            {photo.source === 'camera' ? (
              <Camera aria-hidden className="size-3.5" />
            ) : (
              <Image aria-hidden className="size-3.5" />
            )}
            <span className="sr-only">{t(`ui.photoSource.${photo.source}`)}</span>
          </span>
          {hasAlert && (
            <span
              className="tone-solid pointer-events-none absolute top-1.5 right-1.5 flex size-6 items-center justify-center rounded-md shadow-sm [--tone-on:var(--tone-contrast-warning)] [--tone:var(--tone-warning)]"
              title={photo.alerts.map((a) => t(`alerts.${a}`)).join(' ')}
            >
              <TriangleExclamationPoint aria-hidden className="size-3.5" />
              <span className="sr-only">{photo.alerts.map((a) => t(`alerts.${a}`)).join(' ')}</span>
            </span>
          )}
          {size !== 'sm' && (
            <span className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center gap-1 bg-linear-to-t from-black/70 to-transparent px-2 pt-4 pb-1.5 text-[0.6875rem] font-medium text-white tabular-nums">
              <Clock aria-hidden className="size-3" />
              {photo.captured_at ? formatTime(photo.captured_at, timeZone) : t('ui.photos.noCapture')}
            </span>
          )}
        </>
      )}
      {onRemove && (
        <Button
          variant="secondary"
          size="icon-sm"
          className="absolute right-1.5 bottom-1.5 rounded-full shadow"
          onClick={onRemove}
          aria-label={t('ui.actions.removePhoto')}
        >
          <X />
        </Button>
      )}
    </div>
  );
}

export interface PhotoGridProps extends React.ComponentProps<'div'> {
  photos: PhotoData[];
  timeZone: string;
  /** Abre o visualizador embutido ao tocar (padrão). Passe `onOpen` para controlar fora. */
  onOpen?: (index: number) => void;
  hideMeta?: boolean;
  onRemove?: (photo: PhotoData) => void;
  /** Tile extra no fim (ex.: <AddPhotoTile />). */
  append?: React.ReactNode;
  /** `compact`: miniaturas menores, mais por linha. */
  density?: 'compact' | 'comfortable';
}

/** Grade de fotos com o visualizador ampliado embutido. */
export function PhotoGrid({
  photos,
  timeZone,
  onOpen,
  hideMeta,
  onRemove,
  append,
  density = 'comfortable',
  className,
  ...props
}: PhotoGridProps) {
  const [open, setOpen] = React.useState<number | null>(null);
  return (
    <div className="@container/photos">
      <div
        data-slot="photo-grid"
        className={cn(
          'grid gap-2',
          density === 'compact'
            ? 'grid-cols-4 @md/photos:grid-cols-6 @3xl/photos:grid-cols-8'
            : 'grid-cols-2 @sm/photos:grid-cols-3 @2xl/photos:grid-cols-4 @4xl/photos:grid-cols-5',
          className,
        )}
        {...props}
      >
        {photos.map((photo, index) => (
          <PhotoThumb
            key={photo.id}
            photo={photo}
            timeZone={timeZone}
            index={index}
            total={photos.length}
            hideMeta={hideMeta}
            size={density === 'compact' ? 'sm' : 'md'}
            className={density === 'compact' ? 'w-auto' : undefined}
            onClick={() => (onOpen ? onOpen(index) : setOpen(index))}
            onRemove={onRemove ? () => onRemove(photo) : undefined}
          />
        ))}
        {append}
      </div>
      {!onOpen && (
        <PhotoLightbox
          photos={photos}
          timeZone={timeZone}
          index={open ?? 0}
          open={open !== null}
          onOpenChange={(next) => !next && setOpen(null)}
          onIndexChange={setOpen}
        />
      )}
    </div>
  );
}

export interface PhotoLightboxProps {
  photos: PhotoData[];
  timeZone: string;
  index: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onIndexChange: (index: number) => void;
}

/** Visualizador em tela cheia: setas, teclado (← →), deslizar no celular e os dados da foto embaixo. */
export function PhotoLightbox({ photos, timeZone, index, open, onOpenChange, onIndexChange }: PhotoLightboxProps) {
  const photo = photos[index];
  const touchX = React.useRef<number | null>(null);
  const onPhotoError = React.useContext(PhotoErrorContext);
  const go = React.useCallback(
    (delta: number) => {
      if (photos.length === 0) return;
      onIndexChange((index + delta + photos.length) % photos.length);
    },
    [index, photos.length, onIndexChange],
  );

  React.useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight') go(1);
      if (event.key === 'ArrowLeft') go(-1);
    };
    // Captura: o diálogo do Base UI trata as teclas antes da fase de bolha.
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [open, go]);

  if (!photo) return null;
  const many = photos.length > 1;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="top-0 left-0 flex h-svh w-screen max-w-none translate-x-0 translate-y-0 flex-col gap-0 rounded-none bg-black p-0 text-white ring-0 sm:max-w-none"
      >
        <DialogTitle className="sr-only">{t('ui.photos.viewer')}</DialogTitle>
        <DialogDescription className="sr-only">
          {t('ui.photos.position', { n: index + 1, total: photos.length })}
        </DialogDescription>
        <div className="flex items-center justify-between gap-2 px-3 py-2">
          <span className="text-sm font-medium tabular-nums text-white/80">
            {t('ui.photos.position', { n: index + 1, total: photos.length })}
          </span>
          <Button
            variant="ghost"
            size="icon-lg"
            className="text-white hover:bg-white/15 hover:text-white"
            onClick={() => onOpenChange(false)}
            aria-label={t('ui.actions.close')}
          >
            <X />
          </Button>
        </div>
        <div
          className="relative flex min-h-0 flex-1 items-center justify-center"
          onTouchStart={(event) => {
            touchX.current = event.touches[0]?.clientX ?? null;
          }}
          onTouchEnd={(event) => {
            const start = touchX.current;
            const end = event.changedTouches[0]?.clientX;
            touchX.current = null;
            if (start === null || end === undefined) return;
            if (Math.abs(end - start) > 50) go(end < start ? 1 : -1);
          }}
        >
          <img
            key={photo.id}
            src={photo.url}
            alt={t('ui.photos.alt', { n: index + 1, total: photos.length })}
            className="max-h-full max-w-full object-contain animate-in fade-in-0"
            onError={() => onPhotoError?.(photo)}
          />
          {many && (
            <>
              <Button
                variant="ghost"
                size="icon-lg"
                className="absolute left-2 rounded-full bg-black/40 text-white hover:bg-black/60 hover:text-white max-sm:hidden"
                onClick={() => go(-1)}
                aria-label={t('ui.photos.previous')}
              >
                <ChevronLeft />
              </Button>
              <Button
                variant="ghost"
                size="icon-lg"
                className="absolute right-2 rounded-full bg-black/40 text-white hover:bg-black/60 hover:text-white max-sm:hidden"
                onClick={() => go(1)}
                aria-label={t('ui.photos.next')}
              >
                <ChevronRight />
              </Button>
            </>
          )}
        </div>
        <PhotoMeta
          photo={photo}
          timeZone={timeZone}
          className="dark bg-black px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]"
        />
        {many && (
          <div className="flex gap-1.5 overflow-x-auto bg-black px-4 pb-4 [scrollbar-width:none]">
            {photos.map((p, i) => (
              <button
                key={p.id}
                type="button"
                onClick={() => onIndexChange(i)}
                aria-label={t('ui.photos.alt', { n: i + 1, total: photos.length })}
                aria-current={i === index || undefined}
                className={cn(
                  'h-12 w-16 shrink-0 overflow-hidden rounded-md opacity-60 outline-none ring-white transition focus-visible:ring-2',
                  i === index && 'opacity-100 ring-2',
                )}
              >
                <img src={p.url} alt="" className="size-full object-cover" onError={() => onPhotoError?.(p)} />
              </button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** Dados da foto: origem, captura, chegada, localização e alertas com o texto completo. */
export function PhotoMeta({ photo, timeZone, className }: { photo: PhotoData; timeZone: string; className?: string }) {
  return (
    <div data-slot="photo-meta" className={cn('flex flex-col gap-2 text-sm', className)}>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-foreground/85">
        <PhotoSourceBadge source={photo.source} size="sm" />
        <span className="inline-flex items-center gap-1.5 tabular-nums">
          <Clock aria-hidden className="size-3.5" />
          {photo.captured_at
            ? t('ui.photos.capturedAt', { time: formatDateTime(photo.captured_at, timeZone) })
            : t('ui.photos.noCapture')}
        </span>
        {photo.uploaded_at && (
          <span className="inline-flex items-center gap-1.5 tabular-nums">
            <Upload aria-hidden className="size-3.5" />
            {t('ui.photos.uploadedAt', { time: formatDateTime(photo.uploaded_at, timeZone) })}
          </span>
        )}
        {photo.accuracy_m !== undefined && (
          <span className="inline-flex items-center gap-1.5">
            {photo.latitude != null && photo.accuracy_m != null ? (
              <>
                <MapPin aria-hidden className="size-3.5" />
                {t('ui.photos.location', { meters: Math.round(photo.accuracy_m) })}
              </>
            ) : (
              <>
                <MapPinOff aria-hidden className="size-3.5" />
                {t('ui.photos.noLocation')}
              </>
            )}
          </span>
        )}
      </div>
      {photo.alerts.length > 0 && (
        <ul className="flex flex-col gap-1">
          {photo.alerts.map((alert) => (
            <li key={alert} className="flex items-start gap-2">
              <AlertBadge code={alert} size="sm" />
              <span className="text-foreground/85">{t(`alerts.${alert}`)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export interface AddPhotoProps extends React.ComponentProps<'div'> {
  onCamera?: () => void;
  onGallery?: () => void;
  /** `tile`: quadrado na grade; `bar`: dois botões grandes lado a lado (tela de execução). */
  variant?: 'tile' | 'bar';
  /** Mostra a dica de preferir a câmera. */
  showHint?: boolean;
  disabled?: boolean;
}

/** Adicionar foto: câmera do app (preferida) ou galeria (pode gerar alerta). */
export function AddPhoto({
  onCamera,
  onGallery,
  variant = 'bar',
  showHint = variant === 'bar',
  disabled,
  className,
  ...props
}: AddPhotoProps) {
  if (variant === 'tile') {
    return (
      <div
        data-slot="add-photo"
        className={cn(
          'flex aspect-[4/3] flex-col overflow-hidden rounded-lg border border-dashed bg-muted/40 text-xs font-medium',
          className,
        )}
        {...props}
      >
        <button
          type="button"
          disabled={disabled}
          onClick={onCamera}
          className="flex flex-1 items-center justify-center gap-1.5 outline-none hover:bg-muted focus-visible:bg-muted disabled:opacity-50"
        >
          <Camera aria-hidden className="size-4" />
          {t('ui.actions.takePhoto')}
        </button>
        <span aria-hidden className="h-px bg-border" />
        <button
          type="button"
          disabled={disabled}
          onClick={onGallery}
          className="flex flex-1 items-center justify-center gap-1.5 text-muted-foreground outline-none hover:bg-muted focus-visible:bg-muted disabled:opacity-50"
        >
          <ImagePlus aria-hidden className="size-4" />
          {t('ui.actions.fromGallery')}
        </button>
      </div>
    );
  }
  return (
    <div data-slot="add-photo" className={cn('flex flex-col gap-2', className)} {...props}>
      <div className="grid grid-cols-[2fr_1fr] gap-2">
        <Button size="lg" className="h-14 text-base" onClick={onCamera} disabled={disabled}>
          <Camera className="size-5!" />
          {t('ui.actions.takePhoto')}
        </Button>
        <Button size="lg" variant="outline" className="h-14" onClick={onGallery} disabled={disabled}>
          <ImagePlus className="size-5!" />
          {t('ui.actions.fromGallery')}
        </Button>
      </div>
      {showHint && <p className="text-xs text-muted-foreground">{t('ui.photos.addHint')}</p>}
    </div>
  );
}
