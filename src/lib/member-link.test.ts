import { describe, expect, it } from 'vitest';
import { linkToken, memberLink } from './member-link';

const TOKEN = 'Ab-_0123456789abcdefghijklmnopqrstuvwxyzABC';

describe('member link (06, R12)', () => {
  it('puts the token in the hash of the app link: it never reaches a server log or a Referer', () => {
    expect(memberLink('https://fast-os.pages.dev', TOKEN)).toBe(`https://fast-os.pages.dev/link#${TOKEN}`);
  });

  it('reads the token back from the hash', () => {
    expect(linkToken(`#${TOKEN}`)).toBe(TOKEN);
  });

  it('ignores a hash that is not a token', () => {
    expect(linkToken('')).toBeNull();
    expect(linkToken('#')).toBeNull();
    expect(linkToken('#access_token=x&type=recovery')).toBeNull();
  });
});
