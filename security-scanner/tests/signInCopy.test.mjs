import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import ts from 'typescript';

const { getRoleRejectionMessage, getSignInErrorCopy, getSignInMissingHint, IDENTIFIER_LABEL } = await loadTypeScriptModule(
  new URL('../src/services/signInCopy.ts', import.meta.url),
);

function apiError(message, status) {
  return Object.assign(new Error(message), { name: 'ApiError', status });
}

function networkError() {
  return Object.assign(new Error('Could not reach the event server. Check the server address and network.'), { name: 'NetworkError' });
}

test('the single identifier field has a neutral label', () => {
  assert.equal(IDENTIFIER_LABEL, 'Student number or email');
});

test('students and security staff may use the mobile app and administrators may not', () => {
  assert.equal(getRoleRejectionMessage('student'), null);
  assert.equal(getRoleRejectionMessage('security_staff'), null);
  assert.equal(getRoleRejectionMessage('administrator'), 'Administrators sign in through the desktop dashboard.');
  assert.match(getRoleRejectionMessage('something_else'), /can’t sign in to the mobile app/);
});

test('the missing-field hint names what is still needed', () => {
  assert.equal(getSignInMissingHint('', ''), 'Enter your student number or email and password to continue.');
  assert.equal(getSignInMissingHint('  ', 'secret'), 'Enter your student number or email to continue.');
  assert.equal(getSignInMissingHint('2026-00001', ''), 'Enter your password to continue.');
  assert.equal(getSignInMissingHint('guard@school.edu.ph', 'secret'), null);
  assert.equal(getSignInMissingHint('2026-00001', 'secret'), null);
});

test('wrong credentials get a friendly message that keeps the server text for screen readers', () => {
  const copy = getSignInErrorCopy(apiError('Invalid credentials.', 401));

  assert.equal(copy.message, 'That student number or email and password don’t match an active account. Check both and try again.');
  assert.equal(copy.spokenMessage, `${copy.message} Server message: Invalid credentials.`);
  assert.match(getSignInErrorCopy(apiError('The identifier field is required.', 422)).message, /^That student number or email and password/);
});

test('rate limiting, server faults, and unreachable servers get their own messages', () => {
  assert.equal(getSignInErrorCopy(apiError('Too Many Attempts.', 429)).message, 'Too many sign-in attempts. Wait one minute, then try again.');
  assert.equal(getSignInErrorCopy(apiError('Server Error', 503)).message, 'The event server had a problem. Try again in a moment.');

  const offline = getSignInErrorCopy(networkError());
  assert.match(offline.message, /^Can’t reach the event server/);
  assert.match(offline.spokenMessage, /Server message: Could not reach the event server/);
});

test('messages that are already specific are shown unchanged', () => {
  const copy = getSignInErrorCopy(new Error('Administrators sign in through the desktop dashboard.'));

  assert.equal(copy.message, 'Administrators sign in through the desktop dashboard.');
  assert.equal(copy.spokenMessage, copy.message);
});

test('a status on a non-API error is ignored and a non-error value gets the fallback', () => {
  const lookalike = Object.assign(new Error('Something else.'), { status: 401 });

  assert.equal(getSignInErrorCopy(lookalike).message, 'Something else.');
  assert.equal(getSignInErrorCopy('boom').message, 'Sign-in failed. Try again.');
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
