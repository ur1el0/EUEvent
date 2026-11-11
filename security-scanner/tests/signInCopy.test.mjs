import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import ts from 'typescript';

const { getSignInErrorCopy, getSignInMissingHint, identifierFitsAccountType } = await loadTypeScriptModule(
  new URL('../src/services/signInCopy.ts', import.meta.url),
);

function apiError(message, status) {
  return Object.assign(new Error(message), { name: 'ApiError', status });
}

function networkError() {
  return Object.assign(new Error('Could not reach the event server. Check the server address and network.'), { name: 'NetworkError' });
}

test('an empty identifier fits both account types', () => {
  assert.equal(identifierFitsAccountType('', 'student'), true);
  assert.equal(identifierFitsAccountType('   ', 'security_staff'), true);
});

test('an email fits staff only and a student number fits students only', () => {
  assert.equal(identifierFitsAccountType(' guard@school.edu.ph ', 'security_staff'), true);
  assert.equal(identifierFitsAccountType('guard@school.edu.ph', 'student'), false);
  assert.equal(identifierFitsAccountType('2026-00001', 'student'), true);
  assert.equal(identifierFitsAccountType('2026-00001', 'security_staff'), false);
});

test('the missing-field hint names what is still needed for each account type', () => {
  assert.equal(getSignInMissingHint('student', '', ''), 'Enter your student number and password to continue.');
  assert.equal(getSignInMissingHint('security_staff', '  ', 'secret'), 'Enter your staff email to continue.');
  assert.equal(getSignInMissingHint('student', '2026-00001', ''), 'Enter your password to continue.');
  assert.equal(getSignInMissingHint('security_staff', 'guard@school.edu.ph', 'secret'), null);
});

test('wrong credentials get a friendly message that keeps the server text for screen readers', () => {
  const copy = getSignInErrorCopy(apiError('Invalid credentials.', 401), 'student');

  assert.equal(copy.message, 'That student number and password don’t match an active account. Check both and try again.');
  assert.equal(copy.spokenMessage, `${copy.message} Server message: Invalid credentials.`);
  assert.match(getSignInErrorCopy(apiError('The identifier field is required.', 422), 'security_staff').message, /^That staff email and password/);
});

test('rate limiting, server faults, and unreachable servers get their own messages', () => {
  assert.equal(getSignInErrorCopy(apiError('Too Many Attempts.', 429), 'student').message, 'Too many sign-in attempts. Wait one minute, then try again.');
  assert.equal(getSignInErrorCopy(apiError('Server Error', 503), 'student').message, 'The event server had a problem. Try again in a moment.');

  const offline = getSignInErrorCopy(networkError(), 'security_staff');
  assert.match(offline.message, /^Can’t reach the event server/);
  assert.match(offline.spokenMessage, /Server message: Could not reach the event server/);
});

test('messages that are already specific are shown unchanged', () => {
  const copy = getSignInErrorCopy(new Error('Administrators sign in through the desktop dashboard.'), 'security_staff');

  assert.equal(copy.message, 'Administrators sign in through the desktop dashboard.');
  assert.equal(copy.spokenMessage, copy.message);
});

test('a status on a non-API error is ignored and a non-error value gets the fallback', () => {
  const lookalike = Object.assign(new Error('Something else.'), { status: 401 });

  assert.equal(getSignInErrorCopy(lookalike, 'student').message, 'Something else.');
  assert.equal(getSignInErrorCopy('boom', 'student').message, 'Sign-in failed. Try again.');
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
