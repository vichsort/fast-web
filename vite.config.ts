import { fileURLToPath, URL } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  // Porta do site_url do Auth local (../fast/supabase/config.toml): os links do convite e da senha abrem aqui.
  server: { host: '127.0.0.1', port: 3000, strictPort: true },
  preview: { host: '127.0.0.1', port: 3000, strictPort: true },
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  plugins: [
    react(),
    tailwindcss(),
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
});
