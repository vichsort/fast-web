// Localização da foto (docs/photos.md, F3): latitude e longitude andam juntas e dentro da faixa que o banco aceita
// (CHECK de service_order_photos); a precisão só existe com elas. Fora disso, as três ficam `null`, para um dado
// estranho não fazer o envio inteiro ser recusado com `invalid_input`.

export interface PhotoLocation {
  latitude: number | null;
  longitude: number | null;
  accuracyM: number | null;
}

export const NO_LOCATION: PhotoLocation = { latitude: null, longitude: null, accuracyM: null };

const isNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

export function toLocation(latitude: unknown, longitude: unknown, accuracyM: unknown): PhotoLocation {
  if (!isNumber(latitude) || !isNumber(longitude)) return NO_LOCATION;
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return NO_LOCATION;
  return { latitude, longitude, accuracyM: isNumber(accuracyM) && accuracyM >= 0 ? accuracyM : null };
}
