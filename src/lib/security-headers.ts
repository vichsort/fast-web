// Cabeçalhos de segurança do app no Cloudflare Pages (arquivo `_headers`, gerado no build pelo vite.config.ts com a URL
// do Supabase do build). Revisão de segurança, M4. A CSP libera só o próprio app, o Supabase, o armazenamento das
// fotos (as URLs assinadas: PUT do envio, download para o aparelho e as imagens) e o ViaCEP.

export interface SecurityHeadersInput {
  /** VITE_SUPABASE_URL do build. */
  supabaseUrl: string;
  /** Origem das URLs assinadas das fotos (o endpoint do R2; aceita o curinga de subdomínio da CSP). */
  photosOrigin: string;
}

/** Endpoint padrão do R2 (`S3_PUBLIC_ENDPOINT`, em ../fast/docs/operations.md). */
export const R2_ORIGIN = 'https://*.r2.cloudflarestorage.com';

/** Os cabeçalhos, nome e valor. */
export function securityHeaderList({ supabaseUrl, photosOrigin }: SecurityHeadersInput): [string, string][] {
  const supabase = new URL(supabaseUrl).origin;
  const csp = [
    "default-src 'self'",
    "script-src 'self'",
    // As bibliotecas de UI (toasts, diálogos) põem estilo inline.
    "style-src 'self' 'unsafe-inline'",
    `connect-src 'self' ${supabase} ${photosOrigin} https://viacep.com.br`,
    `img-src 'self' blob: data: ${supabase} ${photosOrigin}`,
    "font-src 'self' data:",
    "media-src 'self' blob:",
    "worker-src 'self'",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join('; ');
  return [
    ['Content-Security-Policy', csp],
    ['X-Frame-Options', 'DENY'],
    ['X-Content-Type-Options', 'nosniff'],
    ['Referrer-Policy', 'strict-origin-when-cross-origin'],
    ['Strict-Transport-Security', 'max-age=31536000; includeSubDomains'],
    ['Permissions-Policy', 'camera=(self), geolocation=(self), microphone=()'],
  ];
}

/** O arquivo `_headers` do Cloudflare Pages: os cabeçalhos em todos os caminhos. */
export function securityHeaders(input: SecurityHeadersInput): string {
  return ['/*', ...securityHeaderList(input).map(([name, value]) => `  ${name}: ${value}`), ''].join('\n');
}
