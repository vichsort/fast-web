// Ícones do PWA gerados no build a partir de um arquivo só (public/logo.svg): favicon, apple-touch e os do
// manifest (any e maskable). Trocar a logo é trocar esse arquivo.
import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config';

export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    ...minimal2023Preset,
    // Maskable e apple com fundo da marca: o Android recorta o ícone num círculo ou "squircle".
    maskable: { ...minimal2023Preset.maskable, padding: 0.3, resizeOptions: { background: '#1a57ad' } },
    apple: { ...minimal2023Preset.apple, padding: 0.3, resizeOptions: { background: '#1a57ad' } },
  },
  images: ['public/logo.svg'],
});
