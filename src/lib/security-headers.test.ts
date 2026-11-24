import { describe, expect, it } from 'vitest';
import { securityHeaders } from './security-headers';

const file = securityHeaders({
  supabaseUrl: 'https://abc.supabase.co/',
  photosOrigin: 'https://*.r2.cloudflarestorage.com',
});

/** As diretivas da CSP do bloco `/*`. */
function csp(text: string): Map<string, string[]> {
  const line = text.split('\n').find((l) => l.trim().startsWith('Content-Security-Policy:'));
  const value = line?.split('Content-Security-Policy:')[1] ?? '';
  return new Map(
    value
      .split(';')
      .map((d) => d.trim().split(/\s+/))
      .filter((parts) => parts[0])
      .map(([name, ...sources]) => [name as string, sources]),
  );
}

describe('securityHeaders', () => {
  it('applies to every path, in the Cloudflare Pages _headers format', () => {
    expect(file.split('\n')[0]).toBe('/*');
    expect(
      file
        .split('\n')
        .slice(1)
        .filter(Boolean)
        .every((l) => l.startsWith('  ')),
    ).toBe(true);
  });

  it('lets the app reach only itself, the Supabase project, the photo storage and ViaCEP', () => {
    const directives = csp(file);
    expect(directives.get('default-src')).toEqual(["'self'"]);
    expect(directives.get('script-src')).toEqual(["'self'"]);
    expect(directives.get('connect-src')).toEqual([
      "'self'",
      'https://abc.supabase.co',
      'https://*.r2.cloudflarestorage.com',
      'https://viacep.com.br',
    ]);
    expect(directives.get('img-src')).toEqual([
      "'self'",
      'blob:',
      'data:',
      'https://abc.supabase.co',
      'https://*.r2.cloudflarestorage.com',
    ]);
    expect(directives.get('worker-src')).toEqual(["'self'"]);
  });

  it('cannot be framed, sends no full referrer and keeps the browser on HTTPS', () => {
    expect(csp(file).get('frame-ancestors')).toEqual(["'none'"]);
    expect(csp(file).get('object-src')).toEqual(["'none'"]);
    expect(file).toContain('  X-Frame-Options: DENY');
    expect(file).toContain('  X-Content-Type-Options: nosniff');
    expect(file).toContain('  Referrer-Policy: strict-origin-when-cross-origin');
    expect(file).toContain('  Strict-Transport-Security: max-age=31536000; includeSubDomains');
  });

  it('allows the camera and the location only to the app itself', () => {
    expect(file).toContain('  Permissions-Policy: camera=(self), geolocation=(self), microphone=()');
  });
});
