import { createUpdateGate } from './app-update';

describe('when a new version goes in (decisions.md, Versão e atualização)', () => {
  it('waits for the next screen change, never in the middle of a screen', () => {
    const gate = createUpdateGate();
    const apply = vi.fn();
    gate.ready(apply);
    expect(apply).not.toHaveBeenCalled();
    expect(gate.screenChanged()).toBe(true);
    expect(apply).toHaveBeenCalledOnce();
  });

  it('does nothing on a screen change without a new version', () => {
    const gate = createUpdateGate();
    expect(gate.screenChanged()).toBe(false);
  });

  it('is held while the camera, the gallery picker or a photo being processed is in the way', () => {
    const gate = createUpdateGate();
    const apply = vi.fn();
    gate.ready(apply);
    const releaseCamera = gate.hold();
    const releasePhoto = gate.hold();
    expect(gate.screenChanged()).toBe(false);
    releaseCamera();
    releaseCamera(); // soltar duas vezes não solta o outro
    expect(gate.screenChanged()).toBe(false);
    releasePhoto();
    expect(gate.screenChanged()).toBe(true);
    expect(apply).toHaveBeenCalledOnce();
  });

  it('applies once: the page reloads', () => {
    const gate = createUpdateGate();
    const apply = vi.fn();
    gate.ready(apply);
    gate.screenChanged();
    gate.screenChanged();
    expect(apply).toHaveBeenCalledOnce();
  });
});
