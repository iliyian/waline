/* oxlint-disable vitest/prefer-called-with, vitest/prefer-spy-on */
import { createRequire } from 'node:module';

import { JSDOM } from 'jsdom';
import { describe, expect, it, vi } from 'vitest';

const require = createRequire(import.meta.url);
const { loginRelayScript } = require('../src/middleware/dashboard.js');

const createPopup = () => {
  const dom = new JSDOM(
    '<a href="https://waline.example/api/oauth?type=github&redirect=%2Fui%2Fprofile"><svg></svg></a>',
    {
      url: 'https://waline.example/ui/login?lng=zh-CN',
      runScripts: 'outside-only',
    },
  );
  const { window } = dom;
  const opener = { postMessage: vi.fn() };

  Object.defineProperty(opener, 'location', {
    get() {
      throw new Error('cross-origin');
    },
  });
  Object.defineProperty(window, 'opener', { configurable: true, value: opener });
  Object.defineProperty(window, 'close', { configurable: true, value: vi.fn() });
  window.open = vi.fn(() => ({}));
  window.fetch = vi.fn(async () => ({
    json: async () => ({
      errno: 0,
      data: { objectId: 'u1', display_name: 'Relay User', email: 'relay@example.com' },
    }),
  }));
  window.serverURL = 'https://waline.example/api/';

  return { dom, opener, window };
};

const dispatchStorage = (window, key, newValue) => {
  const event = new window.Event('storage');

  Object.defineProperties(event, {
    key: { value: key },
    newValue: { value: newValue },
  });
  window.dispatchEvent(event);
};

describe('admin login OAuth relay', () => {
  it('opens OAuth providers in a named child window', () => {
    const { window } = createPopup();

    window.eval(loginRelayScript);
    window.document
      .querySelector('a')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));

    expect(window.open).toHaveBeenCalledWith(
      'https://waline.example/api/oauth?type=github&redirect=%2Fui%2Fprofile',
      'waline_oauth',
      expect.any(String),
    );
  });

  it('forwards a relayed token to the article page', async () => {
    const { opener, window } = createPopup();

    window.eval(loginRelayScript);
    dispatchStorage(
      window,
      'WALINE_OAUTH_RELAY',
      JSON.stringify({ token: 'relay-token', at: Date.now() }),
    );

    await vi.waitFor(() => {
      expect(opener.postMessage).toHaveBeenCalledWith(
        {
          type: 'userInfo',
          data: expect.objectContaining({
            token: 'relay-token',
            objectId: 'u1',
            display_name: 'Relay User',
          }),
        },
        '*',
      );
    });
    expect(window.close).toHaveBeenCalled();
    expect(window.localStorage.getItem('WALINE_OAUTH_RELAY')).toBeNull();
  });

  it('writes the callback token from a named child window', async () => {
    const dom = new JSDOM('', {
      url: 'https://waline.example/ui/profile?token=child-token',
      runScripts: 'outside-only',
    });
    const { window } = dom;

    Object.defineProperty(window, 'close', { configurable: true, value: vi.fn() });
    window.name = 'waline_oauth';
    window.eval(loginRelayScript);

    const relay = JSON.parse(window.localStorage.getItem('WALINE_OAUTH_RELAY'));

    expect(relay.token).toBe('child-token');
    await vi.waitFor(() => expect(window.close).toHaveBeenCalled());
  });
});
