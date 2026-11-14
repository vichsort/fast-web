export type PhotoErrorCode = 'storage_full' | 'draft_not_editable';

export class PhotoError extends Error {
  constructor(readonly code: PhotoErrorCode) {
    super(code);
    this.name = 'PhotoError';
  }
}
