const {
  createRequestHandler,
  formatStartupError,
  getHealthPayload
} = require('../start');
const landingServer = require('../server');

function createMockResponse() {
  return {
    statusCode: null,
    headers: null,
    body: null,
    writeHead(statusCode, headers) {
      this.statusCode = statusCode;
      this.headers = headers;
    },
    end(body) {
      this.body = body;
    }
  };
}

describe('startup hardening helpers', () => {
  test('startup health payload is 503 before server is listening', () => {
    const health = getHealthPayload(false, false, 3000);

    expect(health.statusCode).toBe(503);
    expect(health.body.status).toBe('starting');
  });

  test('startup health handler returns 200 once server is listening', () => {
    const state = { isListening: true };
    const context = { hasGitHubAppConfig: false, port: 3000 };
    const handler = createRequestHandler(state, context);
    const req = { method: 'GET', url: '/health', headers: {} };
    const res = createMockResponse();

    handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual(expect.objectContaining({
      status: 'ok',
      configured: false,
      port: 3000
    }));
  });

  test('startup formats port-in-use errors with readable guidance', () => {
    const payload = formatStartupError({ code: 'EADDRINUSE' }, {
      hasGitHubAppConfig: false,
      port: 3000
    });

    expect(payload.code).toBe('EADDRINUSE');
    expect(payload.message).toContain('Port 3000 is already in use');
  });

  test('landing health payload is 503 before listen and 200 after', () => {
    const beforeListen = landingServer.getHealthPayload(false);
    const afterListen = landingServer.getHealthPayload(true);

    expect(beforeListen.statusCode).toBe(503);
    expect(afterListen.statusCode).toBe(200);
  });

  test('landing server formats port-in-use errors with readable guidance', () => {
    const payload = landingServer.buildServerErrorPayload({ code: 'EADDRINUSE' });

    expect(payload.code).toBe('EADDRINUSE');
    expect(payload.message).toContain('already in use');
  });
});
