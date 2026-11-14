// Fila offline do técnico (docs/queue.md). Sem React e sem DOM: roda na página e no service worker (Q11).
export type { Clock, PhotoRef, QueueApi, QueueLock } from './api';
export { clearUser, dismissRefusal, listRefusals, pendingCount, retryBlocked } from './device';
export { enqueueMaterials, enqueueStart, enqueueSubmit } from './enqueue';
export { ApiError, type ErrorClass } from './errors';
export { QUEUE_LOCK_NAME, webLock } from './lock';
export { processQueue, type QueueDeps, type QueueStatus } from './processor';
export { createSupabaseQueueApi, type QueueApiOptions, type QueueSupabaseClient } from './supabase-api';
