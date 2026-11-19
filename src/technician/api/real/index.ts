// Implementação real do contrato do técnico (../types.ts): Supabase, Dexie e a fila offline.
import type { TechnicianApi } from '../types';
import { actions } from './actions';
import { pickFromGallery, RealCameraSheet } from './camera';
import {
  useDraft,
  useMyOrders,
  usePendingItems,
  useQueueDraft,
  useSyncStatus,
  useTechOrder,
  useTechSession,
  useTimeZone,
} from './reads';
import { useStorageProtection } from './storage';

export const realApi: TechnicianApi = {
  useTimeZone,
  useTechSession,
  useMyOrders,
  useTechOrder,
  usePendingItems,
  useQueueDraft,
  useSyncStatus,
  useDraft,
  useStorageProtection,
  useSimulatedOffline: () => null,
  ...actions,
  CameraSheet: RealCameraSheet,
  pickFromGallery,
};
