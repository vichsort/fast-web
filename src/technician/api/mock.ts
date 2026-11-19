// Adaptador dos dados de exemplo (../mocks.ts, estado em memória) para o contrato do técnico (./types.ts).
import { scratchToast } from '@/components/states';
import { t } from '@/lib/i18n';
import {
  newSamplePhoto,
  scratch,
  TZ,
  useMyOrders,
  usePendingItems,
  useQueueDraft,
  useScratch,
  useSyncStatus,
  useTechOrder,
  useTechSession,
} from '../mocks';
import { MockCameraSheet } from './mock-camera';
import type { TechnicianApi } from './types';

const wait = () => new Promise((resolve) => setTimeout(resolve, 0));

export const mockApi: TechnicianApi = {
  useTimeZone: () => TZ,
  useTechSession,
  useMyOrders,
  useTechOrder,
  usePendingItems,
  useQueueDraft,
  useSyncStatus,
  useDraft: (key) => useScratch().drafts[key] ?? null,
  useStorageProtection: () => 'persisted',
  useSimulatedOffline: () => ({ offline: useScratch().offline, setOffline: scratch.setOffline }),

  notify: scratchToast,
  markSeen: scratch.markSeen,
  async start(order) {
    scratch.start(order);
  },
  async saveDraft(key, fields) {
    scratch.saveDraft(key, { ...scratch.draftOrNew(key), ...fields });
  },
  async addPhoto(key, fields, input) {
    await wait();
    const photo = newSamplePhoto(input.source);
    const capturedAt = input.source === 'camera' ? input.clickedAt.toISOString() : photo.captured_at;
    const draft = scratch.draftOrNew(key);
    scratch.saveDraft(key, { ...draft, ...fields, photos: [...draft.photos, { ...photo, captured_at: capturedAt }] });
  },
  async removePhoto(key, photoId) {
    const draft = scratch.draftOrNew(key);
    scratch.saveDraft(key, { ...draft, photos: draft.photos.filter((p) => p.id !== photoId) });
  },
  async discardDraft(key) {
    scratch.discardDraft(key);
  },
  async submit(order, key, attemptId) {
    return scratch.submit(order, key, attemptId);
  },
  async saveMaterials(order, text) {
    scratch.saveMaterials(order, text);
  },
  async resolveConflict(order, text) {
    scratch.resolveConflict(order, text);
  },
  async removePending(id) {
    scratch.removePending(id);
  },
  async retryPending(id) {
    scratch.retryPending(id);
  },
  async saveProfile(profile) {
    scratch.saveProfile(profile);
  },
  CameraSheet: MockCameraSheet,
  async pickFromGallery() {
    scratchToast(t('technician.execution.galleryToast'));
    return [{ source: 'gallery', file: new Blob() }];
  },
};
