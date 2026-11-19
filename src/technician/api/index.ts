// Ponto único de dados do técnico: as telas importam daqui, nunca de ../mocks, do Dexie ou do Supabase direto.
// A fonte sai de src/lib/data-source.ts (VITE_DATA_SOURCE=mock liga os dados de exemplo).
import { usingMocks } from '@/lib/data-source';
import { mockApi } from './mock';
import { realApi } from './real';
import type { TechnicianApi } from './types';

const api: TechnicianApi = usingMocks ? mockApi : realApi;

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
  saveProfile,
  CameraSheet,
  pickFromGallery,
} = api;

export { withAlerts } from '../derive';
export { TechnicianRuntime } from './real/runtime';
export * from './types';
