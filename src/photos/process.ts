// Do arquivo da câmera ou da galeria à foto pronta para guardar (docs/photos.md, F1–F3).
import { type CompressedPhoto, compressPhoto } from './compress';
import { readExifProof } from './exif';
import { NO_LOCATION, toLocation } from './location';
import type { ProcessedPhoto } from './types';

/** O que a tela passa. Na câmera, `clickedAt` é o relógio do aparelho no clique e `coords` vem da Geolocation API. */
export type PhotoInput =
  | {
      source: 'camera';
      file: Blob;
      clickedAt: Date;
      /** `position.coords`; ausente ou `null` se o técnico não permitiu ou não houve posição. */
      coords?: Pick<GeolocationCoordinates, 'latitude' | 'longitude' | 'accuracy'> | null;
    }
  | { source: 'gallery'; file: Blob };

export async function processPhoto(
  input: PhotoInput,
  { compress = compressPhoto }: { compress?: (file: Blob) => Promise<CompressedPhoto> } = {},
): Promise<ProcessedPhoto> {
  // EXIF do arquivo original, antes da compressão (que o apaga).
  const proof =
    input.source === 'gallery'
      ? await readExifProof(input.file)
      : {
          capturedAt: input.clickedAt.toISOString(),
          ...(input.coords
            ? toLocation(input.coords.latitude, input.coords.longitude, input.coords.accuracy)
            : NO_LOCATION),
        };
  const { blob, width, height } = await compress(input.file);
  return { blob, source: input.source, width, height, ...proof };
}
