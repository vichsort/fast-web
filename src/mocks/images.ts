// Fotos de exemplo geradas localmente (SVG em data URL): cenas de instalação de CFTV, sem rede externa.
// O texto da legenda é parte da imagem (dado de exemplo), não da interface.

export type PhotoScene = 'bullet' | 'dome' | 'recorder' | 'cabling' | 'monitor' | 'power' | 'facade';

const palettes: [string, string][] = [
  ['#3b4a5f', '#1d2633'],
  ['#56606b', '#2b3138'],
  ['#4b5a48', '#262e25'],
  ['#5e5147', '#2f2924'],
  ['#3f4f66', '#1a2230'],
  ['#5a5a66', '#2a2a33'],
];

const scenes: Record<PhotoScene, string> = {
  bullet: `
    <rect x="0" y="0" width="400" height="300" fill="url(#wall)" opacity=".25"/>
    <rect x="150" y="70" width="18" height="70" rx="3" fill="#cfd5dc"/>
    <rect x="120" y="60" width="80" height="18" rx="4" fill="#e7ebef"/>
    <g transform="rotate(14 230 120)">
      <rect x="150" y="100" width="150" height="56" rx="12" fill="#f4f6f8"/>
      <rect x="282" y="104" width="28" height="48" rx="8" fill="#d9dee3"/>
      <circle cx="296" cy="128" r="16" fill="#1b2027"/>
      <circle cx="296" cy="128" r="9" fill="#33475e"/>
      <circle cx="292" cy="124" r="3" fill="#9fb6d1"/>
      <rect x="150" y="94" width="140" height="10" rx="5" fill="#e2e6ea"/>
    </g>
    <path d="M160 140 C 150 200, 120 220, 90 300" stroke="#20252b" stroke-width="5" fill="none"/>`,
  dome: `
    <rect x="0" y="0" width="400" height="90" fill="#e9ecef" opacity=".35"/>
    <ellipse cx="200" cy="92" rx="92" ry="14" fill="#f1f3f5"/>
    <path d="M118 92 A 82 82 0 0 0 282 92 Z" fill="#20262e" opacity=".85"/>
    <circle cx="200" cy="128" r="22" fill="#0f1318"/>
    <circle cx="200" cy="128" r="11" fill="#2d4258"/>
    <circle cx="195" cy="123" r="4" fill="#a9c1dc"/>
    <circle cx="232" cy="112" r="3" fill="#e5484d"/>`,
  recorder: `
    <rect x="70" y="60" width="260" height="190" rx="8" fill="#14181d"/>
    <rect x="86" y="78" width="228" height="46" rx="4" fill="#232a33"/>
    <rect x="86" y="134" width="228" height="46" rx="4" fill="#232a33"/>
    <rect x="86" y="190" width="228" height="46" rx="4" fill="#232a33"/>
    <circle cx="104" cy="101" r="4" fill="#30a46c"/><circle cx="118" cy="101" r="4" fill="#30a46c"/>
    <circle cx="132" cy="101" r="4" fill="#f5a524"/>
    <rect x="170" y="94" width="120" height="14" rx="2" fill="#0b0e11"/>
    <circle cx="104" cy="157" r="4" fill="#30a46c"/><circle cx="118" cy="157" r="4" fill="#30a46c"/>
    <rect x="170" y="150" width="120" height="14" rx="2" fill="#0b0e11"/>
    <g fill="#3e4a57">${Array.from({ length: 8 }, (_, i) => `<rect x="${100 + i * 26}" y="204" width="16" height="18" rx="2"/>`).join('')}</g>`,
  cabling: `
    <rect x="0" y="120" width="400" height="44" fill="#c9ced4" opacity=".7"/>
    <rect x="0" y="116" width="400" height="6" fill="#aab1b9"/>
    <g stroke-width="6" fill="none" stroke-linecap="round">
      <path d="M0 132 C 120 128, 240 140, 400 134" stroke="#2f6fd6"/>
      <path d="M0 142 C 120 146, 240 136, 400 144" stroke="#e5e7ea"/>
      <path d="M0 152 C 120 150, 260 158, 400 152" stroke="#2f2f33"/>
    </g>
    <rect x="180" y="104" width="40" height="76" rx="6" fill="#f2f4f6"/>
    <rect x="190" y="118" width="20" height="10" rx="2" fill="#30a46c"/>
    <path d="M200 180 L200 300" stroke="#2f6fd6" stroke-width="6"/>`,
  monitor: `
    <rect x="60" y="50" width="280" height="176" rx="8" fill="#0e1115"/>
    <rect x="72" y="62" width="126" height="74" fill="#3a4d63"/><rect x="202" y="62" width="126" height="74" fill="#4a5a44"/>
    <rect x="72" y="140" width="126" height="74" fill="#5b4f45"/><rect x="202" y="140" width="126" height="74" fill="#3f3f4f"/>
    <g fill="#ffffff" opacity=".55" font-family="monospace" font-size="9">
      <text x="78" y="74">CAM 01</text><text x="208" y="74">CAM 02</text><text x="78" y="152">CAM 03</text><text x="208" y="152">CAM 04</text>
    </g>
    <rect x="186" y="226" width="28" height="30" fill="#1b1f24"/><rect x="150" y="254" width="100" height="10" rx="3" fill="#1b1f24"/>`,
  power: `
    <rect x="110" y="50" width="180" height="210" rx="6" fill="#e8ebee"/>
    <rect x="124" y="66" width="152" height="178" rx="4" fill="#d3d8dd"/>
    <g fill="#1f242a">${Array.from({ length: 6 }, (_, i) => `<rect x="${136 + i * 22}" y="90" width="14" height="40" rx="2"/>`).join('')}</g>
    <rect x="136" y="150" width="128" height="34" rx="3" fill="#2a3038"/>
    <circle cx="150" cy="167" r="5" fill="#30a46c"/><circle cx="168" cy="167" r="5" fill="#e5484d"/>
    <g stroke="#e5484d" stroke-width="4"><path d="M150 244 L150 290"/></g><g stroke="#1f242a" stroke-width="4"><path d="M170 244 L170 290"/></g>`,
  facade: `
    <rect x="0" y="200" width="400" height="100" fill="#3a3f45" opacity=".6"/>
    <rect x="40" y="60" width="320" height="150" fill="#d8d2c6"/>
    <rect x="70" y="100" width="80" height="110" fill="#5b6f82"/><rect x="250" y="100" width="80" height="60" fill="#5b6f82"/>
    <rect x="160" y="80" width="80" height="24" fill="#b33a3a"/>
    <g transform="translate(300 70) rotate(20)"><rect width="44" height="16" rx="5" fill="#f4f6f8"/><circle cx="40" cy="8" r="5" fill="#1b2027"/></g>
    <g transform="translate(60 70) rotate(-20)"><rect width="44" height="16" rx="5" fill="#f4f6f8"/><circle cx="4" cy="8" r="5" fill="#1b2027"/></g>`,
};

function hash(text: string): number {
  let h = 0;
  for (const char of text) h = (h * 31 + char.charCodeAt(0)) | 0;
  return Math.abs(h);
}

function escapeXml(text: string): string {
  return text.replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' })[c] ?? c);
}

/** Data URL de uma foto de exemplo (4:3). `seed` varia as cores; `caption` vai no rodapé da imagem. */
export function samplePhotoUrl(scene: PhotoScene, seed: string, caption?: string): string {
  const [top, bottom] = palettes[hash(seed) % palettes.length] ?? ['#3b4a5f', '#1d2633'];
  const label = caption
    ? `<rect x="0" y="0" width="400" height="30" fill="#000" opacity=".45"/>
       <text x="200" y="20" fill="#fff" text-anchor="middle" font-family="system-ui, sans-serif" font-size="13">${escapeXml(caption)}</text>`
    : '';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="1600" height="1200">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${top}"/><stop offset="1" stop-color="${bottom}"/></linearGradient>
      <pattern id="wall" width="40" height="20" patternUnits="userSpaceOnUse"><rect width="40" height="20" fill="none" stroke="#fff" stroke-width=".6"/></pattern>
    </defs>
    <rect width="400" height="300" fill="url(#bg)"/>
    ${scenes[scene]}
    ${label}
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
