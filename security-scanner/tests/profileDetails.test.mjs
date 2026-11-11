import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import ts from 'typescript';

const {
  EMAIL_UNAVAILABLE_TEXT,
  canOpenProfile,
  getProfileEmailText,
  getProfileFields,
  getRoleLabel,
  getSignOutNote,
} = await loadTypeScriptModule(new URL('../src/services/profileDetails.ts', import.meta.url));

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

test('a student profile lists name, student number, email and role', () => {
  const fields = getProfileFields({
    name: 'Ana Reyes',
    student_number: '2026-00001',
    email: 'student@euevent.test',
    role: 'student',
  });

  assert.deepEqual(fields, [
    { label: 'NAME', value: 'Ana Reyes' },
    { label: 'STUDENT NUMBER', value: '2026-00001' },
    { label: 'EMAIL', value: 'student@euevent.test' },
    { label: 'ROLE', value: 'Student' },
  ]);
});

test('a staff profile has no student number row', () => {
  const fields = getProfileFields({
    name: 'Gate Guard',
    student_number: null,
    email: 'guard@school.edu.ph',
    role: 'security_staff',
  });

  assert.deepEqual(fields.map((field) => field.label), ['NAME', 'EMAIL', 'ROLE']);
  assert.equal(fields[2].value, 'Security staff');
});

test('anything missing from a profile shows as not available', () => {
  const fields = getProfileFields({ name: '  ', student_number: undefined, role: 'student' });

  assert.deepEqual(fields, [
    { label: 'NAME', value: 'Not available' },
    { label: 'STUDENT NUMBER', value: 'Not available' },
    { label: 'EMAIL', value: 'Not available' },
    { label: 'ROLE', value: 'Student' },
  ]);
  assert.doesNotThrow(() => getProfileFields(null));
  assert.equal(getProfileFields(undefined)[0].value, 'Not available');
});

test('the sign-out note matches what signing out does for each role', () => {
  assert.match(getSignOutNote('student'), /removes your saved tickets/);
  assert.match(getSignOutNote('security_staff'), /keeps unsent scans/);
});

test('only signed-in students and security staff may open the profile', () => {
  assert.equal(canOpenProfile('student'), true);
  assert.equal(canOpenProfile('security_staff'), true);
  assert.equal(canOpenProfile('administrator'), false);
  assert.equal(canOpenProfile(undefined), false);
  assert.equal(canOpenProfile(null), false);
});

async function loadTypeScriptModule(sourceUrl) {
  const source = await readFile(sourceUrl, 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  });

  return import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
}
