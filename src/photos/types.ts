import type { PhotoSource } from '@/offline/db';

/** Foto pronta para guardar: JPEG comprimido e os dados da prova (docs/photos.md, F1–F3). */
export interface ProcessedPhoto {
  blob: Blob;
  source: PhotoSource;
  width: number;
  height: number;
  /** ISO 8601, ou `null` (galeria sem data no EXIF). */
  capturedAt: string | null;
  /** Juntas: sem uma, as três ficam `null`. */
  latitude: number | null;
  longitude: number | null;
  accuracyM: number | null;
}
