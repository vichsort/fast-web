// Ponto único de dados do técnico: as telas importam daqui, nunca de ../mocks, do Dexie ou do Supabase direto.
// A fonte sai de src/lib/data-source.ts (VITE_DATA_SOURCE=mock liga os dados de exemplo).
import { realApi } from './real';
import type { TechnicianApi } from './types';

// Dados de exemplo por import dinâmico, com a chave lida aqui mesmo (não pelo `usingMocks`): o Vite troca a chave por
// literal no módulo e o build de produção descarta o ramo antes de gerar os pedaços, então o mock nem é empacotado.
const api: TechnicianApi = import.meta.env.VITE_DATA_SOURCE === 'mock' ? (await import('./mock')).mockApi : realApi;

export const {
  useTimeZone,
  useTechSession,
  useMyOrders,
  useTechOrder,
  usePendingItems,
  useQueueDraft,
  useSyncStatus,
  useDraft,
  useStorageProtection,
  useSimulatedOffline,
  notify,
  markSeen,
  start,
  saveDraft,
  addPhoto,
  removePhoto,
  discardDraft,
  submit,
  saveMaterials,
  resolveConflict,
  removePending,
  retryPending,
  canShare,
  shareRefused,
  saveProfile,
  CameraSheet,
  pickFromGallery,
} = api;

export { withAlerts } from '../derive';
export { TechnicianRuntime } from './real/runtime';
export * from './types';
