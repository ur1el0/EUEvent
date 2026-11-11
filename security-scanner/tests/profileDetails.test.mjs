import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import ts from 'typescript';

const { EMAIL_UNAVAILABLE_TEXT, getProfileEmailText, getRoleLabel } = await loadTypeScriptModule(
  new URL('../src/services/profileDetails.ts', import.meta.url),
);

test('a profile shows the email the API sent', () => {
  assert.equal(getProfileEmailText('guard@school.edu.ph'), 'guard@school.edu.ph');
  assert.equal(getProfileEmailText('  guard@school.edu.ph '), 'guard@school.edu.ph');
});

test('a missing email from an older API shows as not available instead of failing', () => {
  assert.equal(EMAIL_UNAVAILABLE_TEXT, 'Not available');
  assert.equal(getProfileEmailText(undefined), 'Not available');
  assert.equal(getProfileEmailText(null), 'Not available');
  assert.equal(getProfileEmailText(''), 'Not available');
  assert.equal(getProfileEmailText('   '), 'Not available');
});

test('roles get readable labels and unknown roles fall back to the raw value', () => {
  assert.equal(getRoleLabel('security_staff'), 'Security staff');
  assert.equal(getRoleLabel('student'), 'Student');
  assert.equal(getRoleLabel('administrator'), 'Administrator');
  assert.equal(getRoleLabel('marshal'), 'marshal');
  assert.equal(getRoleLabel(undefined), '');
});

async function loadTypeScriptModule(sourceUrl) {
  const source = await readFile(sourceUrl, 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  });

  return import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
}
