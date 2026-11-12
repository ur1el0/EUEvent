import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import ts from 'typescript';

const { isGateManifest } = await loadTypeScriptModule(
  new URL('../src/services/gateManifestContract.ts', import.meta.url),
);

const validManifest = {
  gate_id: 7,
  event_status: 'scheduled',
  manifest_version: 4,
  event_starts_at: '2026-12-18T10:00:00+08:00',
  event_ends_at: '2026-12-18T12:00:00+08:00',
  generated_at: '2026-12-17T12:00:00+08:00',
  tickets: [{
    ticket_id: 31,
    student_number: '2026-00031',
    totp_secret: 'a'.repeat(40),
    gate_id: 7,
    status: 'unclaimed',
  }],
};

test('accepts a valid current gate manifest and its ticket rows', () => {
  assert.equal(isGateManifest(validManifest), true);
});

test('accepts legacy manifests that predate optional freshness timestamps', () => {
  const legacy = { ...validManifest };
  delete legacy.event_starts_at;
  delete legacy.event_ends_at;
  delete legacy.generated_at;

  assert.equal(isGateManifest(legacy), true);
});

test('rejects malformed manifests and ticket rows', () => {
  for (const payload of [null, [], { ...validManifest, gate_id: '7' },
    { ...validManifest, event_status: 'cancelled' },
    { ...validManifest, generated_at: 'not-a-timestamp' },
    { ...validManifest, tickets: [{ ...validManifest.tickets[0], status: 'revoked' }] },
    { ...validManifest, tickets: [{ ...validManifest.tickets[0], ticket_id: null }] },
    { ...validManifest, tickets: [{ ...validManifest.tickets[0], totp_secret: '' }] }]) {
    assert.equal(isGateManifest(payload), false);
  }
});

async function loadTypeScriptModule(sourceUrl) {
  const source = await readFile(sourceUrl, 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  });
  const moduleUrl = `data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`;

  return import(moduleUrl);
}
