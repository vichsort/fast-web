// Versão do app (docs/e2e.md, Versionamento): o momento do build em UTC, YYYY.MM.DD.HHmm, e o commit depois do +.
// Gerada no build (vite.config.ts), sem número para lembrar de subir; comparar o texto é comparar as datas, o mesmo
// formato de app_settings.min_client_version no backend (01, R8).

declare const __APP_VERSION__: string | undefined;

/** A versão deste build; nos testes, que não passam pelo Vite, `0000.00.00.0000+test`. */
export const APP_VERSION: string = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : '0000.00.00.0000+test';

const pad = (n: number, size = 2) => String(n).padStart(size, '0');

export function buildVersion(at: Date, commit: string | null): string {
  const number = `${at.getUTCFullYear()}.${pad(at.getUTCMonth() + 1)}.${pad(at.getUTCDate())}.${pad(at.getUTCHours())}${pad(at.getUTCMinutes())}`;
  return commit ? `${number}+${commit}` : number;
}

/** A parte comparável, sem o commit. */
export function versionNumber(version: string): string {
  return version.split('+')[0] ?? version;
}

export function isBelowMinimum(version: string, minimum: string): boolean {
  return versionNumber(version) < versionNumber(minimum);
}
