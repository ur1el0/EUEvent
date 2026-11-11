import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import ts from 'typescript';

const {
  ALLOWED_EMAIL_DOMAINS,
  getConfirmationError,
  getEmailDomain,
  getEmailError,
  getNameError,
  getPasswordError,
  getStudentNumberError,
  isAllowedEmailDomain,
  isVerificationCodeComplete,
  normalizeStudentNumber,
  sanitizeVerificationCode,
  validateRegistration,
} = await loadModules(['registrationConstants.ts', 'registrationValidation.ts']);

const valid = {
  studentNumber: 'A12-34567',
  name: 'Ana Reyes',
  email: 'ana.reyes@student.mseuf.edu.ph',
  password: 'CorrectHorse123!',
  confirmation: 'CorrectHorse123!',
};

test('both school domains are allowed, in any case and with spaces around the address', () => {
  assert.deepEqual([...ALLOWED_EMAIL_DOMAINS], ['student.mseuf.edu.ph', 'mseuf.edu.ph']);
  assert.equal(isAllowedEmailDomain('ana@student.mseuf.edu.ph'), true);
  assert.equal(isAllowedEmailDomain('ana@mseuf.edu.ph'), true);
  assert.equal(isAllowedEmailDomain('  Ana@STUDENT.MSEUF.EDU.PH '), true);
});

test('lookalike domains are rejected because the domain must equal an allowed one', () => {
  for (const email of [
    'ana@evilmseuf.edu.ph',
    'ana@student.mseuf.edu.ph.evil.com',
    'ana@mseuf.edu.ph.evil.com',
    'ana@mseuf.edu.ph.',
    'ana@mail.student.mseuf.edu.ph',
    'ana@gmail.com',
    'ana@mseuf.edu.ph@evil.com',
    'mseuf.edu.ph@evil.com',
    'ana@xmseuf.edu.ph',
  ]) {
    assert.equal(isAllowedEmailDomain(email), false, email);
    assert.notEqual(getEmailError(email), '', email);
  }
});

test('the domain is read after the last at sign', () => {
  assert.equal(getEmailDomain('a@b@mseuf.edu.ph'), 'mseuf.edu.ph');
  assert.equal(getEmailDomain('no-at-sign'), null);
});

test('email errors explain what is wrong', () => {
  assert.equal(getEmailError(''), 'Enter your school email.');
  assert.equal(getEmailError('not-an-email'), 'Enter a valid email address.');
  assert.equal(getEmailError('@mseuf.edu.ph'), 'Enter a valid email address.');
  assert.equal(getEmailError('ana@'), 'Enter a valid email address.');
  assert.equal(getEmailError('an a@mseuf.edu.ph'), 'Enter a valid email address.');
  assert.match(getEmailError('ana@gmail.com'), /@student\.mseuf\.edu\.ph or @mseuf\.edu\.ph/);
  assert.equal(getEmailError('ana@mseuf.edu.ph'), '');
});

test('student numbers accept lowercase input and are uppercased', () => {
  assert.equal(normalizeStudentNumber('  b12-34567 '), 'B12-34567');
  assert.equal(getStudentNumberError('a12-34567'), '');
  assert.equal(getStudentNumberError('A12-34567'), '');
});

test('malformed student numbers are rejected', () => {
  assert.equal(getStudentNumberError(''), 'Enter your student number.');
  for (const value of ['2026-00001', 'A1-23456', 'A12-3456', 'A12-345678', 'AB2-34567', 'A1234567', 'A12 34567', 'A12-3456X']) {
    assert.match(getStudentNumberError(value), /^Use the format A12-34567/, value);
  }
});

test('the password needs 12 characters and the confirmation must match', () => {
  assert.equal(getPasswordError(''), 'Enter a password.');
  assert.equal(getPasswordError('short-pass1'), 'Use at least 12 characters.');
  assert.equal(getPasswordError('twelve-chars'), '');
  assert.equal(getConfirmationError('twelve-chars', ''), 'Enter your password again.');
  assert.equal(getConfirmationError('twelve-chars', 'twelve-chars!'), 'The passwords do not match.');
  assert.equal(getConfirmationError('twelve-chars', 'twelve-chars'), '');
});

test('the name needs at least two characters', () => {
  assert.equal(getNameError(' '), 'Enter your full name.');
  assert.equal(getNameError('A'), 'Enter your full name.');
  assert.equal(getNameError('Al'), '');
});

test('validateRegistration returns only the fields that have a problem', () => {
  assert.deepEqual(validateRegistration(valid), {});

  const errors = validateRegistration({ studentNumber: '2026-1', name: '', email: 'ana@evilmseuf.edu.ph', password: 'short', confirmation: 'other' });
  assert.deepEqual(Object.keys(errors).sort(), ['confirmation', 'email', 'name', 'password', 'studentNumber']);

  assert.deepEqual(Object.keys(validateRegistration({ ...valid, confirmation: 'different-password' })), ['confirmation']);
});

test('the verification code keeps six digits and ignores everything else', () => {
  assert.equal(sanitizeVerificationCode('123 456'), '123456');
  assert.equal(sanitizeVerificationCode('12-34ab56789'), '123456');
  assert.equal(sanitizeVerificationCode(''), '');
  assert.equal(isVerificationCodeComplete('12345'), false);
  assert.equal(isVerificationCodeComplete('123456'), true);
  assert.equal(isVerificationCodeComplete('12 34 56'), true);
});

async function loadModules(files) {
  const parts = [];

  for (const file of files) {
    const source = await readFile(new URL(`../src/services/${file}`, import.meta.url), 'utf8');
    const withoutImports = source.replace(/^import[\s\S]*?from '\.\/[^']+';\n/gm, '');
    parts.push(ts.transpileModule(withoutImports, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText);
  }

  return import(`data:text/javascript;base64,${Buffer.from(parts.join('\n')).toString('base64')}`);
}
