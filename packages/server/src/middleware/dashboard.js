const loginRelayScript = `
(function () {
  var RELAY_KEY = 'WALINE_OAUTH_RELAY';
  var CHILD_NAME = 'waline_oauth';
  var pathname = location.pathname.replace(/\\/+$/, '');
  var token = new URLSearchParams(location.search).get('token');

  function clearRelay() {
    try {
      localStorage.removeItem(RELAY_KEY);
    } catch (_) {}
  }

  if (window.name === CHILD_NAME) {
    if (token) {
      try {
        localStorage.setItem(RELAY_KEY, JSON.stringify({ token: token, at: Date.now() }));
      } catch (_) {}
      setTimeout(function () {
        try {
          window.close();
        } catch (_) {}
      }, 100);
    }
    return;
  }

  if (!pathname.endsWith('/ui/login') || !window.opener) return;

  var crossOrigin = false;
  try {
    void window.opener.location.href;
  } catch (_) {
    crossOrigin = true;
  }
  if (!crossOrigin) return;

  var delivering = false;

  function deliver(raw) {
    if (delivering || !raw || !window.opener) return;

    var payload;
    try {
      payload = JSON.parse(raw);
    } catch (_) {
      return;
    }

    if (!payload || !payload.token || !payload.at || Date.now() - payload.at > 300000) {
      clearRelay();
      return;
    }

    delivering = true;

    function finish(user) {
      try {
        window.opener.postMessage(
          {
            type: 'userInfo',
            data: Object.assign({ token: payload.token, remember: false }, user || {}),
          },
          '*'
        );
      } catch (_) {}
      clearRelay();
      try {
        window.close();
      } catch (_) {}
    }

    fetch((window.serverURL || '/api/') + 'token', {
      headers: { Authorization: 'Bearer ' + payload.token },
    })
      .then(function (response) {
        return response.json();
      })
      .then(function (data) {
        if (!data || data.errno || !data.data || !data.data.objectId) {
          throw new Error('invalid token');
        }
        finish(data.data);
      })
      .catch(function () {
        delivering = false;
      });
  }

  window.addEventListener('storage', function (event) {
    if (event.key === RELAY_KEY && event.newValue) deliver(event.newValue);
  });

  var existing = null;
  try {
    existing = localStorage.getItem(RELAY_KEY);
  } catch (_) {}
  if (existing) deliver(existing);

  document.addEventListener(
    'click',
    function (event) {
      var target = event.target;
      if (!(target instanceof Element)) return;
      var link = target.closest('a[href*="/oauth?type="]');
      if (!link) return;
      event.preventDefault();
      event.stopPropagation();
      var popup = window.open(
        link.href,
        CHILD_NAME,
        'width=1024,height=600,scrollbars=no,resizable=no,status=no,location=no,toolbar=no,menubar=no'
      );
      if (!popup) location.href = link.href;
    },
    true
  );
})();
`;

// oxlint-disable-next-line func-names
module.exports = function () {
  return (ctx) => {
    ctx.type = 'html';
    ctx.body = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <title>Waline Management System</title>
    <meta name="viewport" content="width=device-width,initial-scale=1">
  </head>
  <body>
    <script>
    window.SITE_URL = ${JSON.stringify(process.env.SITE_URL)};
    window.SITE_NAME = ${JSON.stringify(process.env.SITE_NAME)};
    window.recaptchaV3Key = ${JSON.stringify(process.env.RECAPTCHA_V3_KEY)};
    window.turnstileKey = ${JSON.stringify(process.env.TURNSTILE_KEY)};
    window.oauthServices = ${JSON.stringify(ctx.state.oauthServices || [])};
    window.serverURL = '${ctx.serverURL}/api/';
    </script>
    <script>${loginRelayScript}</script>
    <script src="${
      process.env.WALINE_ADMIN_MODULE_ASSET_URL || '//unpkg.com/@waline/admin'
    }"></script>
  </body>
</html>`;
  };
};

module.exports.loginRelayScript = loginRelayScript;
