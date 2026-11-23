import { blankToNull, phoneDigits, phoneDigitsOrNull } from './input';

describe('blankToNull', () => {
  it('trims the text and turns empty or only spaces into null', () => {
    expect(blankToNull('  Rua A  ')).toBe('Rua A');
    expect(blankToNull('   ')).toBeNull();
    expect(blankToNull('')).toBeNull();
    expect(blankToNull(null)).toBeNull();
    expect(blankToNull(undefined)).toBeNull();
  });
});

describe('phoneDigits', () => {
  it('keeps only the digits of a masked phone', () => {
    expect(phoneDigits('(41) 99999-8888')).toBe('41999998888');
    expect(phoneDigits('')).toBe('');
  });

  it('turns a phone without digits into null for the database', () => {
    expect(phoneDigitsOrNull('(41) 99999-8888')).toBe('41999998888');
    expect(phoneDigitsOrNull(' ( ) - ')).toBeNull();
    expect(phoneDigitsOrNull(null)).toBeNull();
    expect(phoneDigitsOrNull(undefined)).toBeNull();
  });
});
