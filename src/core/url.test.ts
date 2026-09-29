import { describe, expect, it } from 'vitest';
import { displayUrl, isRestrictedUrl, normalizeUrl, parseNavigableInput } from './url';

describe('normalizeUrl', () => {
  it('ignores scheme, www, hash and trailing slash', () => {
    expect(normalizeUrl('https://www.GitHub.com/wxt-dev/#readme')).toBe('github.com/wxt-dev');
    expect(normalizeUrl('http://github.com/wxt-dev')).toBe('github.com/wxt-dev');
  });

  it('keeps the query string', () => {
    expect(normalizeUrl('https://youtube.com/watch?v=1')).not.toBe(normalizeUrl('https://youtube.com/watch?v=2'));
  });
});

describe('parseNavigableInput', () => {
  it.each([
    ['github.com', 'https://github.com'],
    ['docs.wxt.dev/guide', 'https://docs.wxt.dev/guide'],
    ['localhost:3000/api', 'http://localhost:3000/api'],
    ['192.168.1.1', 'http://192.168.1.1'],
    ['https://example.org/a?b=c', 'https://example.org/a?b=c'],
  ])('%s → %s', (input, expected) => {
    expect(parseNavigableInput(input)).toBe(expected);
  });

  it.each(['github', 'hello world', 'notes.', 'v1.2', ''])('"%s" is not a URL', (input) => {
    expect(parseNavigableInput(input)).toBeNull();
  });
});

describe('misc', () => {
  it('detects restricted pages', () => {
    expect(isRestrictedUrl('chrome://settings')).toBe(true);
    expect(isRestrictedUrl('https://chromewebstore.google.com/detail/x')).toBe(true);
    expect(isRestrictedUrl('https://github.com')).toBe(false);
  });

  it('displays URLs without noise', () => {
    expect(displayUrl('https://www.example.com/caf%C3%A9/')).toBe('example.com/café');
  });
});
