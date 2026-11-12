import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import ts from 'typescript';

const {
  ApiError,
  NetworkError,
  apiRequestAtUrl,
  normalizeApiBaseUrl,
  testApiConnectionAtUrl,
} = await loadTypeScriptModule(new URL('../src/services/apiClientCore.ts', import.meta.url));

const BASE_URL = 'http://192.168.1.50:8000/api/v1';

test('server URLs are trimmed and normalized, and non-API URLs are rejected', () => {
  assert.equal(normalizeApiBaseUrl('  http://192.168.1.50:8000/api/v1///  '), BASE_URL);

  for (const value of [
    'localhost:8000/api/v1',
    'http://192.168.1.50:8000',
    'http://192.168.1.50:8000/api/v2',
    'http://192.168.1.50:8000/api/v1?token=secret',
    'http://192.168.1.50:8000/api/v1 path',
  ]) {
    assert.throws(() => normalizeApiBaseUrl(value), /ending in \/api\/v1/);
  }
});

test('API requests send JSON headers, bearer token, body, and abort signal', async () => {
  let capturedUrl;
  let capturedOptions;
  const fetcher = async (url, options) => {
    capturedUrl = url;
    capturedOptions = options;
    return jsonResponse({ ok: true });
  };

  await assert.doesNotReject(apiRequestAtUrl(BASE_URL, '/sync/batch', {
    method: 'POST',
    token: 'staff-token',
    body: { scans: [{ scan_id: 'scan-1' }] },
  }, fetcher));

  assert.equal(capturedUrl, BASE_URL + '/sync/batch');
  assert.equal(capturedOptions.method, 'POST');
  assert.equal(capturedOptions.headers.Accept, 'application/json');
  assert.equal(capturedOptions.headers['Content-Type'], 'application/json');
  assert.equal(capturedOptions.headers.Authorization, 'Bearer staff-token');
  assert.equal(capturedOptions.body, JSON.stringify({ scans: [{ scan_id: 'scan-1' }] }));
  assert.ok(capturedOptions.signal instanceof AbortSignal);
});

test('HTTP failures preserve the server message and status code', async () => {
  await assert.rejects(
    apiRequestAtUrl(BASE_URL, '/auth/me', {}, async () => jsonResponse({ message: 'Unauthenticated.' }, 401)),
    (error) => error instanceof ApiError && error.status === 401 && error.message === 'Unauthenticated.',
  );
});

test('malformed error bodies fall back to the HTTP status', async () => {
  await assert.rejects(
    apiRequestAtUrl(BASE_URL, '/sync/batch', {}, async () => ({
      ok: false,
      status: 503,
      json: async () => { throw new Error('invalid JSON'); },
    })),
    (error) => error instanceof ApiError && error.status === 503 && error.message === 'The server returned HTTP 503.',
  );
});

test('network and timeout failures use a clear offline message', async () => {
  await assert.rejects(
    apiRequestAtUrl(BASE_URL, '/auth/me', {}, async () => { throw new Error('offline'); }),
    (error) => error instanceof NetworkError && /Could not reach the event server/.test(error.message),
  );
});

test('a 401 response still proves that the configured event API is reachable', async () => {
  let requestedUrl;
  const message = await testApiConnectionAtUrl(BASE_URL, async (url) => {
    requestedUrl = url;
    return jsonResponse({ message: 'Unauthenticated.' }, 401);
  });

  assert.equal(requestedUrl, BASE_URL + '/auth/me');
  assert.equal(message, 'The EUEvent API is reachable.');
});

test('connection checks distinguish server errors from an unreachable server', async () => {
  await assert.rejects(
    testApiConnectionAtUrl(BASE_URL, async () => jsonResponse({}, 503)),
    /HTTP 503/,
  );
  await assert.rejects(
    testApiConnectionAtUrl(BASE_URL, async () => { throw new Error('offline'); }),
    /Could not reach the server.*event network/,
  );
});

function jsonResponse(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  };
}

async function loadTypeScriptModule(sourceUrl) {
  const source = await readFile(sourceUrl, 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
  });
  const moduleUrl = `data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`;

  return import(moduleUrl);
}
