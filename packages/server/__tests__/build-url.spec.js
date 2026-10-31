import { createRequire } from 'node:module';

import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const { buildUrl } = require('../src/extend/think.js');

describe('buildUrl', () => {
  it('appends query parameters before a URL hash', () => {
    expect(buildUrl('https://iliyian.com/posts/ba053c1c/#section', { token: 'abc' })).toBe(
      'https://iliyian.com/posts/ba053c1c/?token=abc#section',
    );
    expect(buildUrl('/ui/profile#section', { token: 'abc' })).toBe('/ui/profile?token=abc#section');
    expect(buildUrl('/ui/profile?from=mail#section', { token: 'abc' })).toBe(
      '/ui/profile?from=mail&token=abc#section',
    );
  });

  it('keeps the existing behavior when there is no hash', () => {
    expect(buildUrl('https://iliyian.com/posts/ba053c1c/', { token: 'abc' })).toBe(
      'https://iliyian.com/posts/ba053c1c/?token=abc',
    );
    expect(buildUrl('/ui/profile', { token: 'abc' })).toBe('/ui/profile?token=abc');
    expect(buildUrl('/ui/profile?from=mail', { token: 'abc' })).toBe(
      '/ui/profile?from=mail&token=abc',
    );
    expect(buildUrl('/ui/profile', { token: '' })).toBe('/ui/profile');
  });
});
