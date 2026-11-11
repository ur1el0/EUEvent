import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import ts from 'typescript';

const { getGateScanState } = await loadTypeScriptModule(
  new URL('../src/services/gateScanAvailability.ts', import.meta.url),
);

const gate = (event_status = 'scheduled', manifest_version = 3) => ({ event_status, manifest_version });

test('an open event with a current saved ticket list can scan', () => {
  assert.deepEqual(getGateScanState(gate('scheduled'), 3, false), { canScan: true, reason: null, isListOutOfDate: false });
  assert.equal(getGateScanState(gate('in_progress'), 3, true).canScan, true);
});

test('a closed event cannot scan, whatever is saved', () => {
  for (const status of ['draft', 'postponed', 'cancelled', 'completed']) {
    assert.deepEqual(getGateScanState(gate(status), 3, false), { canScan: false, reason: 'Event not open', isListOutOfDate: false });
  }
});

test('no saved ticket list means no scanning, online or offline', () => {
  assert.equal(getGateScanState(gate(), undefined, false).reason, 'No ticket list saved yet');
  assert.equal(getGateScanState(gate(), undefined, true).reason, 'No ticket list saved yet');
});

test('an out-of-date list blocks scanning online but not offline', () => {
  assert.deepEqual(getGateScanState(gate('scheduled', 4), 3, false), { canScan: false, reason: 'Ticket list out of date, update it', isListOutOfDate: true });
  assert.deepEqual(getGateScanState(gate('scheduled', 4), 3, true), { canScan: true, reason: null, isListOutOfDate: true });
});

test('a closed event is the reason shown even when the list is also missing', () => {
  assert.equal(getGateScanState(gate('cancelled'), undefined, false).reason, 'Event not open');
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
