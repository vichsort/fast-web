// Versão do app: a do package.json em semver, com o commit depois do +. O número sobe no
// lançamento (`npm version`); a mínima do backend (app_settings.min_client_version, 01 R8) é semver sem o commit.

declare const __APP_VERSION__: string | undefined;

/** A versão deste build; nos testes, que não passam pelo Vite, `0.0.0+test`. */
export const APP_VERSION: string = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : '0.0.0+test';

/**
 * Headers de toda chamada ao Supabase, da página e do worker: o backend vê qual build chamou (api.md do backend). As
 * Edge Functions liberam o header no CORS; sem isso, o navegador barraria as chamadas a elas.
 */
export const VERSION_HEADERS = { 'x-client-version': APP_VERSION };

export function buildVersion(packageVersion: string, commit: string | null): string {
  return commit ? `${packageVersion}+${commit}` : packageVersion;
}

/** A parte comparável, sem o commit. */
export function versionNumber(version: string): string {
  return version.split('+')[0] ?? version;
}

/** Negativo, zero ou positivo, número a número (1.10.0 > 1.9.0); o commit não conta. */
export function compareVersions(a: string, b: string): number {
  const parts = (v: string) =>
    versionNumber(v)
      .split('.')
      .map((n) => Number.parseInt(n, 10) || 0);
  const [x, y] = [parts(a), parts(b)];
  for (let i = 0; i < 3; i++) {
    const diff = (x[i] ?? 0) - (y[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

export function isBelowMinimum(version: string, minimum: string): boolean {
  return compareVersions(version, minimum) < 0;
}
