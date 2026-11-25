import { execFileSync } from 'node:child_process';
import { fileURLToPath, URL } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import packageJson from './package.json' with { type: 'json' };
import { R2_ORIGIN, securityHeaderList, securityHeaders } from './src/lib/security-headers.ts';
import { buildVersion } from './src/lib/version.ts';

/** A versão semântica do app (`npm version` sobe no lançamento). */
const packageVersion = packageJson.version;

/** O commit do build: o do Cloudflare Pages, senão o do git local; sem nenhum, a versão vai sem ele. */
function commit(): string | null {
  const sha = process.env.CF_PAGES_COMMIT_SHA;
  if (sha) return sha.slice(0, 7);
  try {
    return execFileSync('git', ['rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).trim() || null;
  } catch {
    return null;
  }
}

/**
 * `_headers` do Cloudflare Pages (src/lib/security-headers.ts) com o Supabase deste build. As fotos vêm do R2;
 * `PHOTOS_ORIGIN` troca a origem (ex.: um domínio próprio do bucket). Sem Supabase (só dados de exemplo), não gera.
 */
function headersFile(): Plugin {
  let supabaseUrl: string | undefined;
  return {
    name: 'fast-security-headers',
    apply: 'build',
    configResolved(config) {
      supabaseUrl = config.env.VITE_SUPABASE_URL;
    },
    generateBundle() {
      if (!supabaseUrl) return this.warn('VITE_SUPABASE_URL ausente: _headers não gerado');
      const photosOrigin = process.env.PHOTOS_ORIGIN || R2_ORIGIN;
      this.emitFile({ type: 'asset', fileName: '_headers', source: securityHeaders({ supabaseUrl, photosOrigin }) });
    },
  };
}

function previewHeaders(mode: string): Record<string, string> | undefined {
  const supabaseUrl = loadEnv(mode, process.cwd(), 'VITE_').VITE_SUPABASE_URL;
  if (!supabaseUrl) return undefined;
  const list = securityHeaderList({ supabaseUrl, photosOrigin: process.env.PHOTOS_ORIGIN || R2_ORIGIN });
  // HSTS num preview em http não faz nada, e o navegador ignora; os outros valem.
  return Object.fromEntries(list);
}

export default defineConfig(({ mode }) => ({
  // Versão do app (src/lib/version.ts), a mesma na página e no service worker.
  define: { __APP_VERSION__: JSON.stringify(buildVersion(packageVersion, commit())) },
  // Porta do site_url do Auth local (../fast/supabase/config.toml): os links do convite e da senha abrem aqui.
  server: { host: '127.0.0.1', port: 3000, strictPort: true },
  // O preview (o dos E2E) serve com os mesmos cabeçalhos do Cloudflare Pages: a CSP quebrada aparece nos testes.
  preview: { host: '127.0.0.1', port: 3000, strictPort: true, headers: previewHeaders(mode) },
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  // Bibliotecas do pedaço inicial em grupos próprios: o hash delas só muda quando a versão muda, e o técnico não
  // baixa tudo de novo pelo service worker a cada deploy (antes, um pedaço só de ~570 kB com o código do app).
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: 'supabase', test: /node_modules[\\/]@supabase[\\/]/ },
            { name: 'react', test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/ },
            { name: 'tanstack', test: /node_modules[\\/]@tanstack[\\/]/ },
            { name: 'forms', test: /node_modules[\\/](zod|react-hook-form|@hookform)[\\/]/ },
          ],
        },
      },
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    headersFile(),
    // Service worker próprio (injectManifest): a fila offline roda nele com o Background Sync do Android.
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'prompt',
      injectRegister: false,
      // Ícones, favicon e os <link> do <head> saem de public/logo.svg (pwa-assets.config.ts).
      pwaAssets: { config: true, overrideManifestIcons: true },
      // O app inteiro no precache, ícones inclusive: abre e instala sem sinal.
      injectManifest: { globPatterns: ['**/*.{js,css,html,svg,png,ico}'] },
      manifest: {
        id: '/',
        name: 'Fast O.S.',
        short_name: 'Fast O.S.',
        description: 'Ordens de serviço da Fast: escritório e técnicos em campo, mesmo sem sinal.',
        lang: 'pt-BR',
        dir: 'ltr',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        // Cores do tema claro (src/index.css: --background e --primary).
        background_color: '#f5f7f9',
        theme_color: '#1a57ad',
      },
      devOptions: { enabled: false, type: 'module' },
    }),
  ],
}));
