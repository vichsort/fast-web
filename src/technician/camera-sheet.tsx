// Câmera do app (04, prova fotográfica: `source = camera`, `captured_at` = relógio no clique). Só visual no scratch:
// o visor mostra uma cena de exemplo e cada toque guarda uma foto fictícia. A real usa getUserMedia (src/photos).
import { Check, Crosshair, X } from 'lucide-react';
import * as React from 'react';
import type { PhotoData } from '@/components/photos';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { newSamplePhoto } from './mocks';

export function CameraSheet({
  open,
  onOpenChange,
  onCapture,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCapture: (photo: PhotoData) => void;
}) {
  const [preview, setPreview] = React.useState(() => newSamplePhoto('camera'));
  const [taken, setTaken] = React.useState<PhotoData[]>([]);
  const [flash, setFlash] = React.useState(false);

  React.useEffect(() => {
    if (open) setTaken([]);
  }, [open]);

  function shoot() {
    const photo = { ...preview, captured_at: new Date().toISOString() };
    onCapture(photo);
    setTaken((list) => [...list, photo]);
    setFlash(true);
    setTimeout(() => setFlash(false), 150);
    setPreview(newSamplePhoto('camera'));
  }

  const last = taken.at(-1);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="top-0 left-0 flex h-svh w-screen max-w-none translate-x-0 translate-y-0 flex-col gap-0 rounded-none bg-black p-0 text-white ring-0 sm:max-w-none"
      >
        <DialogTitle className="sr-only">{t('technician.camera.title')}</DialogTitle>
        <DialogDescription className="sr-only">{t('technician.camera.sample')}</DialogDescription>
        <div className="flex items-center justify-between gap-2 px-3 pt-[max(env(safe-area-inset-top),0.5rem)] pb-2">
          <Button
            variant="ghost"
            size="icon-lg"
            className="size-11 text-white hover:bg-white/15 hover:text-white"
            onClick={() => onOpenChange(false)}
            aria-label={t('ui.actions.close')}
          >
            <X className="size-6" />
          </Button>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-medium tabular-nums">
            <Crosshair aria-hidden className="size-3.5" />
            {t('technician.camera.location', { meters: preview.accuracy_m ?? 0 })}
          </span>
        </div>
        <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden">
          <img src={preview.url} alt="" className="size-full object-cover opacity-90" />
          <div aria-hidden className="pointer-events-none absolute inset-6 grid grid-cols-3 grid-rows-3">
            {Array.from({ length: 9 }, (_, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: grade decorativa
              <span key={i} className="border border-white/15" />
            ))}
          </div>
          <span
            aria-hidden
            className={cn(
              'pointer-events-none absolute inset-0 bg-white transition-opacity duration-150',
              flash ? 'opacity-80' : 'opacity-0',
            )}
          />
          <p className="absolute inset-x-4 bottom-3 rounded-lg bg-black/55 px-3 py-2 text-center text-xs text-white/90">
            {t('technician.camera.sample')}
          </p>
        </div>
        <div className="grid grid-cols-3 items-center gap-2 px-4 pt-4 pb-[max(env(safe-area-inset-bottom),1.25rem)]">
          <div className="flex items-center gap-2">
            {last && (
              <img
                src={last.url}
                alt=""
                className="size-12 rounded-lg border-2 border-white/80 object-cover animate-in zoom-in-50"
              />
            )}
            {taken.length > 0 && (
              <span className="text-xs text-white/80 tabular-nums">
                {t('technician.camera.taken', { count: taken.length })}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={shoot}
            aria-label={t('technician.camera.shutter')}
            className="mx-auto flex size-20 items-center justify-center rounded-full border-4 border-white outline-none focus-visible:ring-4 focus-visible:ring-white/50 active:scale-95"
          >
            <span className="size-16 rounded-full bg-white" />
          </button>
          <div className="flex justify-end">
            <Button
              className="h-11 rounded-full px-4 text-base"
              disabled={taken.length === 0}
              onClick={() => onOpenChange(false)}
            >
              <Check className="size-5" />
              {t('technician.camera.done')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
