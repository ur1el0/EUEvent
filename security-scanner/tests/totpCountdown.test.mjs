import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import ts from 'typescript';

const { NEW_CODE_WARNING_SECONDS, getNewCodeHint } = await loadTypeScriptModule(
  new URL('../src/services/totpCountdown.ts', import.meta.url),
);

test('the wait hint covers only the last three seconds of a step', () => {
  assert.equal(NEW_CODE_WARNING_SECONDS, 3);
  assert.equal(getNewCodeHint(30), null);
  assert.equal(getNewCodeHint(4), null);
  assert.equal(getNewCodeHint(3), 'New code in 3… wait before scanning');
  assert.equal(getNewCodeHint(2), 'New code in 2… wait before scanning');
  assert.equal(getNewCodeHint(1), 'New code in 1… wait before scanning');
});

test('out-of-range countdown values never show the hint', () => {
  assert.equal(getNewCodeHint(0), null);
  assert.equal(getNewCodeHint(-1), null);
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
