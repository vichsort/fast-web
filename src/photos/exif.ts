// Dados da prova lidos do EXIF do arquivo ORIGINAL da galeria (docs/photos.md, F2 e F3): a compressão apaga o EXIF.
import exifr from 'exifr';
import { NO_LOCATION, toLocation } from './location';

export interface ExifProof {
  /** ISO 8601 (UTC), ou `null` sem `DateTimeOriginal` válido. */
  capturedAt: string | null;
  latitude: number | null;
  longitude: number | null;
  accuracyM: number | null;
}

const NO_PROOF: ExifProof = { capturedAt: null, ...NO_LOCATION };

interface RawExif {
  DateTimeOriginal?: unknown;
  OffsetTimeOriginal?: unknown;
  GPSLatitude?: unknown;
  GPSLatitudeRef?: unknown;
  GPSLongitude?: unknown;
  GPSLongitudeRef?: unknown;
  GPSHPositioningError?: unknown;
}

/** Nunca lança: arquivo ilegível ou sem EXIF é foto sem data (o alerta `gallery_without_exif` avisa). */
export async function readExifProof(file: Blob): Promise<ExifProof> {
  let raw: RawExif | undefined;
  try {
    // ArrayBuffer, não Blob: o exifr lê Blob com FileReader, que não existe no service worker nem no Node.
    raw = await exifr.parse(await file.arrayBuffer(), {
      pick: [
        'DateTimeOriginal',
        'OffsetTimeOriginal',
        'GPSLatitude',
        'GPSLatitudeRef',
        'GPSLongitude',
        'GPSLongitudeRef',
        'GPSHPositioningError',
      ],
      reviveValues: false,
      translateValues: false,
    });
  } catch {
    return NO_PROOF;
  }
  if (!raw) return NO_PROOF;
  return {
    capturedAt: capturedAt(raw.DateTimeOriginal, raw.OffsetTimeOriginal),
    ...toLocation(
      degrees(raw.GPSLatitude, raw.GPSLatitudeRef, 'S'),
      degrees(raw.GPSLongitude, raw.GPSLongitudeRef, 'W'),
      raw.GPSHPositioningError,
    ),
  };
}

const DATE_TIME = /^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})$/;
const OFFSET = /^([+-])(\d{2}):(\d{2})$/;

/** `DateTimeOriginal` ('YYYY:MM:DD HH:MM:SS') no fuso de `OffsetTimeOriginal`, ou no do aparelho sem ele. */
function capturedAt(dateTime: unknown, offset: unknown): string | null {
  const match = typeof dateTime === 'string' ? DATE_TIME.exec(dateTime.trim()) : null;
  if (!match) return null;
  const [y, mo, d, h, mi, s] = match.slice(1).map(Number) as [number, number, number, number, number, number];
  // Confere a data no calendário (rejeita 0000:00:00, 30 de fevereiro) sem passar pelo fuso.
  const asUtc = new Date(Date.UTC(y, mo - 1, d, h, mi, s));
  if (
    asUtc.getUTCFullYear() !== y ||
    asUtc.getUTCMonth() !== mo - 1 ||
    asUtc.getUTCDate() !== d ||
    asUtc.getUTCHours() !== h ||
    asUtc.getUTCMinutes() !== mi ||
    asUtc.getUTCSeconds() !== s
  ) {
    return null;
  }
  const offsetMatch = typeof offset === 'string' ? OFFSET.exec(offset.trim()) : null;
  if (offsetMatch) {
    const sign = offsetMatch[1] === '-' ? -1 : 1;
    const minutes = Number(offsetMatch[2]) * 60 + Number(offsetMatch[3]);
    return new Date(asUtc.getTime() - sign * minutes * 60_000).toISOString();
  }
  return new Date(y, mo - 1, d, h, mi, s).toISOString();
}

/** [graus, minutos, segundos] e a referência (N/S, E/W) → graus decimais com sinal. */
function degrees(dms: unknown, ref: unknown, negativeRef: 'S' | 'W'): number | null {
  if (!Array.isArray(dms) || dms.length !== 3 || !dms.every((n) => typeof n === 'number')) return null;
  if (typeof ref !== 'string') return null;
  const [d, m, s] = dms as [number, number, number];
  const value = d + m / 60 + s / 3600;
  return ref.trim().toUpperCase() === negativeRef ? -value : value;
}
