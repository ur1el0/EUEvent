import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import ts from 'typescript';

const { validateSyncResponse } = await loadTypeScriptModule(
  new URL('../src/services/scanSyncContract.ts', import.meta.url),
);

const batch = [{ scan_id: 'scan-a' }, { scan_id: 'scan-b' }];
const accepted = { scan_id: 'scan-a', decision: 'accepted', reason_code: null };
const rejected = { scan_id: 'scan-b', decision: 'rejected', reason_code: 'TICKET_REVOKED' };

test('valid decisions are returned in the submitted scan order', () => {
  assert.deepEqual(
    validateSyncResponse({ acknowledged_scan_ids: ['scan-b', 'scan-a'], outcomes: [rejected, accepted] }, batch),
    [accepted, rejected],
  );
});

test('an incomplete acknowledgement keeps the batch unconfirmed', () => {
  assert.throws(
    () => validateSyncResponse({ acknowledged_scan_ids: ['scan-a'], outcomes: [accepted, rejected] }, batch),
    /acknowledged an incomplete scan batch/,
  );
});

test('duplicate acknowledgements are rejected even when every expected ID appears', () => {
  assert.throws(
    () => validateSyncResponse({ acknowledged_scan_ids: ['scan-a', 'scan-a'], outcomes: [accepted, rejected] }, batch),
    /acknowledged an incomplete scan batch/,
  );
});

test('unexpected acknowledgement IDs are rejected', () => {
  assert.throws(
    () => validateSyncResponse({ acknowledged_scan_ids: ['scan-a', 'scan-c'], outcomes: [accepted, rejected] }, batch),
    /acknowledged an incomplete scan batch/,
  );
});

test('incomplete outcomes are rejected', () => {
  assert.throws(
    () => validateSyncResponse({ acknowledged_scan_ids: ['scan-a', 'scan-b'], outcomes: [accepted] }, batch),
    /incomplete scan result/,
  );
});

test('duplicate outcome IDs are rejected', () => {
  assert.throws(
    () => validateSyncResponse({ acknowledged_scan_ids: ['scan-a', 'scan-b'], outcomes: [accepted, accepted] }, batch),
    /duplicate scan decisions/,
  );
});

test('outcomes for scans outside the submitted batch are rejected', () => {
  assert.throws(
    () => validateSyncResponse({
      acknowledged_scan_ids: ['scan-a', 'scan-b'],
      outcomes: [accepted, { ...rejected, scan_id: 'scan-c' }],
    }, batch),
    /invalid scan decision/,
  );
});

test('malformed responses are rejected', () => {
  for (const response of [null, {}, { acknowledged_scan_ids: [], outcomes: [] }]) {
    assert.throws(() => validateSyncResponse(response, batch), /invalid|did not return|acknowledged/);
  }
});

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
