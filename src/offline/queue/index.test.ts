import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as queue from './index';

describe('queue module', () => {
  it('Q11: the queue code imports no React and touches no DOM, so it also runs in the service worker', () => {
    const dir = fileURLToPath(new URL('.', import.meta.url));
    const sources = readdirSync(dir).filter((f) => f.endsWith('.ts') && !f.endsWith('.test.ts'));

    for (const file of sources) {
      const code = readFileSync(`${dir}/${file}`, 'utf8');
      expect([file, /from ['"]react|\bwindow\.|\bdocument\.|localStorage/.test(code)]).toEqual([file, false]);
    }
  });

  it('Q11: the public entry exposes the enqueue, processing, device and adapter functions', () => {
    expect(Object.keys(queue).sort()).toEqual(
      [
        'ApiError',
        'QUEUE_LOCK_NAME',
        'clearUser',
        'createSupabaseQueueApi',
        'dismissRefusal',
        'enqueueMaterials',
        'enqueueStart',
        'enqueueSubmit',
        'listRefusals',
        'pendingCount',
        'processQueue',
        'retryBlocked',
        'webLock',
      ].sort(),
    );
  });
});
