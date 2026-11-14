// Monta à mão um segmento APP1/EXIF mínimo (TIFF big-endian) para os testes de EXIF, sem arquivo binário.
// Só as tags que o módulo lê: DateTimeOriginal, OffsetTimeOriginal, DateTime, Orientation e o GPS.

export interface ExifSpec {
  /** 'YYYY:MM:DD HH:MM:SS' */
  dateTimeOriginal?: string;
  /** '+HH:MM' ou '-HH:MM' */
  offsetTimeOriginal?: string;
  /** IFD0 DateTime (data de modificação), que não é a da captura. */
  dateTime?: string;
  orientation?: number;
  gps?: {
    /** Graus decimais; o sinal escolhe a referência (N/S, E/W). */
    latitude?: number;
    longitude?: number;
    /** GPSHPositioningError, em metros. */
    hPositioningError?: number;
  };
}

const ASCII = 2;
const SHORT = 3;
const LONG = 4;
const RATIONAL = 5;

interface Entry {
  tag: number;
  type: number;
  count: number;
  /** Valor já codificado (big-endian). */
  data: Uint8Array;
}

const ascii = (tag: number, text: string): Entry => {
  const data = new TextEncoder().encode(`${text}\0`);
  return { tag, type: ASCII, count: data.length, data };
};

const short = (tag: number, value: number): Entry => {
  const data = new Uint8Array(2);
  new DataView(data.buffer).setUint16(0, value);
  return { tag, type: SHORT, count: 1, data };
};

const long = (tag: number, value: number): Entry => {
  const data = new Uint8Array(4);
  new DataView(data.buffer).setUint32(0, value);
  return { tag, type: LONG, count: 1, data };
};

const rationals = (tag: number, values: [number, number][]): Entry => {
  const data = new Uint8Array(values.length * 8);
  const view = new DataView(data.buffer);
  values.forEach(([num, den], i) => {
    view.setUint32(i * 8, num);
    view.setUint32(i * 8 + 4, den);
  });
  return { tag, type: RATIONAL, count: values.length, data };
};

/** Graus decimais (sem sinal) → [graus, minutos, segundos] em racionais. */
const dms = (decimal: number): [number, number][] => {
  const deg = Math.floor(decimal);
  const minutes = Math.floor((decimal - deg) * 60);
  const seconds = (decimal - deg - minutes / 60) * 3600;
  return [
    [deg, 1],
    [minutes, 1],
    [Math.round(seconds * 10000), 10000],
  ];
};

const ifdSize = (entries: Entry[]) =>
  2 + entries.length * 12 + 4 + entries.reduce((n, e) => n + (e.data.length > 4 ? e.data.length : 0), 0);

/** Escreve um IFD em `offset` (relativo ao início do TIFF), com os valores grandes logo depois dele. */
const writeIfd = (tiff: DataView, offset: number, entries: Entry[]) => {
  const sorted = [...entries].sort((a, b) => a.tag - b.tag);
  tiff.setUint16(offset, sorted.length);
  let dataOffset = offset + 2 + sorted.length * 12 + 4;
  sorted.forEach((e, i) => {
    const at = offset + 2 + i * 12;
    tiff.setUint16(at, e.tag);
    tiff.setUint16(at + 2, e.type);
    tiff.setUint32(at + 4, e.count);
    const target = e.data.length > 4 ? dataOffset : at + 8;
    if (e.data.length > 4) {
      tiff.setUint32(at + 8, dataOffset);
      dataOffset += e.data.length;
    }
    new Uint8Array(tiff.buffer, tiff.byteOffset + target, e.data.length).set(e.data);
  });
  tiff.setUint32(offset + 2 + sorted.length * 12, 0);
};

/** Segmento APP1 completo (FFE1, tamanho, 'Exif\0\0', TIFF). */
export function exifSegment(spec: ExifSpec): Uint8Array {
  const exifEntries: Entry[] = [];
  if (spec.dateTimeOriginal !== undefined) exifEntries.push(ascii(0x9003, spec.dateTimeOriginal));
  if (spec.offsetTimeOriginal !== undefined) exifEntries.push(ascii(0x9011, spec.offsetTimeOriginal));

  const gpsEntries: Entry[] = [];
  const { gps } = spec;
  if (gps?.latitude !== undefined) {
    gpsEntries.push(ascii(0x0001, gps.latitude < 0 ? 'S' : 'N'), rationals(0x0002, dms(Math.abs(gps.latitude))));
  }
  if (gps?.longitude !== undefined) {
    gpsEntries.push(ascii(0x0003, gps.longitude < 0 ? 'W' : 'E'), rationals(0x0004, dms(Math.abs(gps.longitude))));
  }
  if (gps?.hPositioningError !== undefined) {
    gpsEntries.push(rationals(0x001f, [[Math.round(gps.hPositioningError * 100), 100]]));
  }

  const ifd0: Entry[] = [];
  if (spec.orientation !== undefined) ifd0.push(short(0x0112, spec.orientation));
  if (spec.dateTime !== undefined) ifd0.push(ascii(0x0132, spec.dateTime));
  // Ponteiros com valor provisório: o tamanho do IFD0 não depende do valor.
  if (exifEntries.length > 0) ifd0.push(long(0x8769, 0));
  if (gpsEntries.length > 0) ifd0.push(long(0x8825, 0));

  const ifd0Offset = 8;
  const exifOffset = ifd0Offset + ifdSize(ifd0);
  const gpsOffset = exifOffset + (exifEntries.length > 0 ? ifdSize(exifEntries) : 0);
  const tiffSize = gpsOffset + (gpsEntries.length > 0 ? ifdSize(gpsEntries) : 0);
  for (const e of ifd0) {
    if (e.tag === 0x8769) new DataView(e.data.buffer).setUint32(0, exifOffset);
    if (e.tag === 0x8825) new DataView(e.data.buffer).setUint32(0, gpsOffset);
  }

  const segment = new Uint8Array(4 + 6 + tiffSize);
  const view = new DataView(segment.buffer);
  view.setUint16(0, 0xffe1);
  view.setUint16(2, segment.length - 2);
  segment.set(new TextEncoder().encode('Exif\0\0'), 4);
  const tiff = new DataView(segment.buffer, 10);
  tiff.setUint16(0, 0x4d4d); // 'MM'
  tiff.setUint16(2, 42);
  tiff.setUint32(4, ifd0Offset);
  writeIfd(tiff, ifd0Offset, ifd0);
  if (exifEntries.length > 0) writeIfd(tiff, exifOffset, exifEntries);
  if (gpsEntries.length > 0) writeIfd(tiff, gpsOffset, gpsEntries);
  return segment;
}

/** Insere o EXIF logo depois do SOI de um JPEG. */
export function withExif(jpeg: Uint8Array, spec: ExifSpec): Uint8Array {
  if (jpeg[0] !== 0xff || jpeg[1] !== 0xd8) throw new Error('not a JPEG');
  const segment = exifSegment(spec);
  const out = new Uint8Array(jpeg.length + segment.length);
  out.set(jpeg.subarray(0, 2), 0);
  out.set(segment, 2);
  out.set(jpeg.subarray(2), 2 + segment.length);
  return out;
}

/** JPEG só com SOI e EOI: basta para ler o EXIF, não para decodificar a imagem. */
export const EMPTY_JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]);

export const jpegBlob = (spec: ExifSpec, jpeg: Uint8Array = EMPTY_JPEG) =>
  new Blob([withExif(jpeg, spec) as Uint8Array<ArrayBuffer>], { type: 'image/jpeg' });
