import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import ts from 'typescript';

const { ADMIT_AUTO_RESUME_MS, getAutoResumeScanId, getDecisionHaptic } = await loadTypeScriptModule(
  new URL('../src/services/scanFeedback.ts', import.meta.url),
);

const admit = (scanId = 'scan-1', confirmation = 'local') => ({ verdict: 'admit', scanId, confirmation });
const deny = (scanId = null) => ({ verdict: 'deny', scanId, confirmation: null });

test('ADMIT resumes scanning after exactly two seconds', () => {
  assert.equal(ADMIT_AUTO_RESUME_MS, 2_000);
  assert.equal(getAutoResumeScanId(admit('scan-1'), null), 'scan-1');
});

test('DO NOT ADMIT and an empty panel never auto-resume', () => {
  assert.equal(getAutoResumeScanId(deny(), null), null);
  assert.equal(getAutoResumeScanId(deny('scan-1'), null), null);
  assert.equal(getAutoResumeScanId(null, null), null);
});

test('a tap holds that admission, and a later admission auto-resumes again', () => {
  assert.equal(getAutoResumeScanId(admit('scan-1'), 'scan-1'), null);
  assert.equal(getAutoResumeScanId(admit('scan-2'), 'scan-1'), 'scan-2');
});

test('server confirmation keeps the same auto-resume key so the countdown does not restart', () => {
  assert.equal(getAutoResumeScanId(admit('scan-1', 'server'), null), getAutoResumeScanId(admit('scan-1', 'local'), null));
});

test('a new decision buzzes success for ADMIT and error for DO NOT ADMIT', () => {
  assert.equal(getDecisionHaptic(null, admit()), 'success');
  assert.equal(getDecisionHaptic(null, deny()), 'error');
  assert.equal(getDecisionHaptic(admit(), null), null);
});

test('server confirmation of a shown ADMIT does not buzz again, but a server rejection does', () => {
  assert.equal(getDecisionHaptic(admit('scan-1', 'local'), admit('scan-1', 'server')), null);
  assert.equal(getDecisionHaptic(admit('scan-1', 'local'), deny('scan-1')), 'error');
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
