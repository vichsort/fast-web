// Câmera do app (photos.md, F2–F4): visor da câmera traseira, horário do clique e a posição do aparelho (só se o
// técnico permitir). Cada clique vira um JPEG que a tela processa e guarda no rascunho. E o seletor da galeria.
import { Check, Crosshair, X } from 'lucide-react';
import * as React from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { PhotoInput } from '@/photos/process';
import { hasSpaceToCapture } from '@/photos/storage';
import type { CameraSheetProps } from '../types';

type Coords = Pick<GeolocationCoordinates, 'latitude' | 'longitude' | 'accuracy'>;

export function RealCameraSheet({ open, onOpenChange, onCapture }: CameraSheetProps) {
  const video = React.useRef<HTMLVideoElement>(null);
  const [failed, setFailed] = React.useState(false);
  const [coords, setCoords] = React.useState<Coords | null>(null);
  const [taken, setTaken] = React.useState<string[]>([]);
  const [flash, setFlash] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setTaken([]);
    setFailed(false);
    let stream: MediaStream | null = null;
    let cancelled = false;
    void hasSpaceToCapture().then((ok) => {
      if (!ok) toast.warning(t('technician.camera.lowSpace'));
    });
    navigator.mediaDevices
      ?.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1920 } }, audio: false })
      .then((s) => {
        if (cancelled) {
          for (const track of s.getTracks()) track.stop();
          return;
        }
        stream = s;
        if (video.current) video.current.srcObject = s;
      })
      .catch(() => setFailed(true));
    if (!navigator.mediaDevices) setFailed(true);
    const watch = navigator.geolocation?.watchPosition(
      (position) => setCoords(position.coords),
      () => setCoords(null),
      { enableHighAccuracy: true, maximumAge: 30_000 },
    );
    return () => {
      cancelled = true;
      for (const track of stream?.getTracks() ?? []) track.stop();
      if (watch !== undefined) navigator.geolocation.clearWatch(watch);
    };
  }, [open]);

  function shoot() {
    const v = video.current;
    if (!v || v.videoWidth === 0) return;
    const clickedAt = new Date();
    const canvas = document.createElement('canvas');
    canvas.width = v.videoWidth;
    canvas.height = v.videoHeight;
    canvas.getContext('2d')?.drawImage(v, 0, 0);
    const position = coords
      ? { latitude: coords.latitude, longitude: coords.longitude, accuracy: coords.accuracy }
      : null;
    canvas.toBlob(
      (file) => {
        if (!file) return;
        onCapture({ source: 'camera', file, clickedAt, coords: position });
        setTaken((list) => [...list, URL.createObjectURL(file)]);
      },
      'image/jpeg',
      0.92,
    );
    setFlash(true);
    setTimeout(() => setFlash(false), 150);
  }

  React.useEffect(
    () => () => {
      for (const url of taken) URL.revokeObjectURL(url);
    },
    [taken],
  );
  const last = taken.at(-1);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="top-0 left-0 flex h-svh w-screen max-w-none translate-x-0 translate-y-0 flex-col gap-0 rounded-none bg-black p-0 text-white ring-0 sm:max-w-none"
      >
        <DialogTitle className="sr-only">{t('technician.camera.title')}</DialogTitle>
        <DialogDescription className="sr-only">{t('technician.camera.title')}</DialogDescription>
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
            {coords
              ? t('technician.camera.location', { meters: Math.round(coords.accuracy) })
              : t('technician.camera.noLocation')}
          </span>
        </div>
        <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden">
          {failed ? (
            <p className="max-w-xs px-6 text-center text-sm text-white/85">{t('technician.camera.unavailable')}</p>
          ) : (
            <video ref={video} autoPlay playsInline muted className="size-full object-cover" />
          )}
          <span
            aria-hidden
            className={cn(
              'pointer-events-none absolute inset-0 bg-white transition-opacity duration-150',
              flash ? 'opacity-80' : 'opacity-0',
            )}
          />
        </div>
        <div className="grid grid-cols-3 items-center gap-2 px-4 pt-4 pb-[max(env(safe-area-inset-bottom),1.25rem)]">
          <div className="flex items-center gap-2">
            {last && (
              <img
                src={last}
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
            disabled={failed}
            aria-label={t('technician.camera.shutter')}
            className="mx-auto flex size-20 items-center justify-center rounded-full border-4 border-white outline-none focus-visible:ring-4 focus-visible:ring-white/50 active:scale-95 disabled:opacity-40"
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

/** Seletor de fotos da galeria (várias de uma vez); cancelar devolve a lista vazia. */
export function pickFromGallery(): Promise<PhotoInput[]> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true;
    input.addEventListener('change', () =>
      resolve([...(input.files ?? [])].map((file) => ({ source: 'gallery' as const, file }))),
    );
    input.addEventListener('cancel', () => resolve([]));
    input.click();
  });
}
