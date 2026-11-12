import assert from 'node:assert/strict';
import { createHash, createHmac } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import ts from 'typescript';

const { createRotatingTicketCodeCore, createTicketQrPayload } = await loadTypeScriptModule(
  new URL('../src/services/totpCore.ts', import.meta.url),
);

const RFC_SECRET = '3132333435363738393031323334353637383930';

test('generates the RFC 6238 SHA-1 six-digit code for a known 30-second step', async () => {
  const result = await createRotatingTicketCodeCore(RFC_SECRET, 59_000, sha1);

  assert.deepEqual(result, { step: 1, code: '287082' });
});

test('uses the same code throughout a step and advances at the exact 30-second boundary', async () => {
  const beforeBoundary = await createRotatingTicketCodeCore(RFC_SECRET, 59_999, sha1);
  const atBoundary = await createRotatingTicketCodeCore(RFC_SECRET, 60_000, sha1);

  assert.deepEqual(beforeBoundary, { step: 1, code: '287082' });
  assert.equal(atBoundary.step, 2);
  assert.match(atBoundary.code, /^\d{6}$/);
  assert.notEqual(atBoundary.code, beforeBoundary.code);
});

test('rejects invalid secrets before computing a code', async () => {
  await assert.rejects(createRotatingTicketCodeCore('not-hex', 59_000, sha1), /invalid rotating-code secret/);
  await assert.rejects(createRotatingTicketCodeCore('a'.repeat(38), 59_000, sha1), /invalid rotating-code secret/);
});

test('formats the rotating code as the versioned QR payload expected by the scanner', () => {
  assert.equal(createTicketQrPayload(314, 1_234, '028702'), 'EUEVENT1:314:1234:028702');
});

async function sha1(message) {
  return new Uint8Array(createHash('sha1').update(message).digest());
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
