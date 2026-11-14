import { hasSpaceToCapture } from './storage';

const MB = 1024 * 1024;

describe('space to capture', () => {
  it('F4: with less than 20 MB free, there is no space to capture', async () => {
    const estimate = async () => ({ quota: 100 * MB, usage: 80 * MB + 1 });
    expect(await hasSpaceToCapture(estimate)).toBe(false);
  });

  it('F4: with 20 MB or more free, there is space to capture', async () => {
    const estimate = async () => ({ quota: 100 * MB, usage: 80 * MB });
    expect(await hasSpaceToCapture(estimate)).toBe(true);
  });

  it('F4: without the storage API, it does not block', async () => {
    expect(await hasSpaceToCapture(undefined)).toBe(true);
  });

  it('F4: when the estimate is incomplete or fails, it does not block', async () => {
    expect(await hasSpaceToCapture(async () => ({}))).toBe(true);
    expect(await hasSpaceToCapture(async () => ({ quota: 100 * MB }))).toBe(true);
    expect(
      await hasSpaceToCapture(async () => {
        throw new Error('boom');
      }),
    ).toBe(true);
  });

  it('F4: by default uses navigator.storage, and does not block where it does not exist (Node)', async () => {
    expect(await hasSpaceToCapture()).toBe(true);
  });
});
