// Servidor do build (dist/) só para um teste, em porta própria (outra origem, outro service worker): o teste muda o que
// ele serve sem afetar os outros, que rodam em paralelo contra o `vite preview`. O sw.js pode ganhar um sufixo, como se
// saísse uma versão nova do app (a busca do sw.js que o navegador faz para atualizar não passa pelo `route`).
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { extname, join, normalize } from 'node:path';

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

export async function serveDist(root = 'dist') {
  let swSuffix = '';
  const server = createServer(async (req, res) => {
    const path = normalize(decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname)).replace(
      /^(\.\.[/\\])+/,
      '',
    );
    let file = join(root, path);
    let body: Buffer;
    try {
      body = await readFile(file);
    } catch {
      // Rota do app: o index.html, como o Pages.
      file = join(root, 'index.html');
      body = await readFile(file);
    }
    if (path === '/sw.js' && swSuffix) body = Buffer.concat([body, Buffer.from(swSuffix)]);
    res.writeHead(200, {
      'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream',
      'Cache-Control': 'no-cache',
    });
    res.end(body);
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  return {
    url: `http://127.0.0.1:${(server.address() as AddressInfo).port}`,
    /** Daqui em diante, o sw.js é outro: uma versão nova do app. */
    publishNewVersion: () => {
      swSuffix = `\n// versão nova (E2E) ${Date.now()}\n`;
    },
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
}
