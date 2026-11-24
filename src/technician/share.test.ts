import { refusedShareText, sharePhotoName } from './share';

const TZ = 'America/Sao_Paulo';

describe('refusedShareText', () => {
  it('sums up the refused submission for the office: order, client, reason, times, what was done and the photos', () => {
    const share = refusedShareText({
      orderNumber: 42,
      orderTitle: 'Trocar DVR',
      clientName: 'Padaria Pão Quente',
      refusal: 'not_assigned',
      startedAt: '2026-11-24T12:10:00.000Z',
      submittedAt: '2026-11-24T13:30:00.000Z',
      description: 'DVR trocado e câmeras testadas.',
      photos: 2,
      timeZone: TZ,
    });
    expect(share.title).toBe('O.S. #0042 · Trocar DVR');
    expect(share.text).toBe(
      [
        'O.S. #0042 · Trocar DVR',
        'Cliente: Padaria Pão Quente',
        'Envio recusado: Você não está mais atribuído a esta O.S.',
        'Iniciado em 24/11/2026 09:10 · enviado em 24/11/2026 10:30',
        '',
        'O que foi feito:',
        'DVR trocado e câmeras testadas.',
        '',
        '2 foto(s) anexada(s).',
      ].join('\n'),
    );
  });

  it('leaves out what the draft does not have', () => {
    const share = refusedShareText({
      orderNumber: 42,
      orderTitle: 'Trocar DVR',
      clientName: null,
      refusal: 'not_assigned',
      startedAt: null,
      submittedAt: '2026-11-24T13:30:00.000Z',
      description: '  ',
      photos: 0,
      timeZone: TZ,
    });
    expect(share.text).toBe(
      [
        'O.S. #0042 · Trocar DVR',
        'Envio recusado: Você não está mais atribuído a esta O.S.',
        'Enviado em 24/11/2026 10:30',
      ].join('\n'),
    );
  });
});

describe('sharePhotoName', () => {
  it('names each photo by the order and its position', () => {
    expect(sharePhotoName(42, 0)).toBe('OS-0042-foto-1.jpg');
  });
});
