import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import ts from 'typescript';

const { REGISTRATION_SUCCESS_NOTICE, getRegistrationErrorCopy, getResendLabel, getVerifyErrorCopy, secondsUntil } = await loadTypeScriptModule(
  new URL('../src/services/registrationCopy.ts', import.meta.url),
);

function apiError(message, status) {
  return Object.assign(new Error(message), { name: 'ApiError', status });
}

function networkError() {
  return Object.assign(new Error('Could not reach the event server. Check the server address and network.'), { name: 'NetworkError' });
}

const INVALID_CODE = 'The code is invalid or expired. Request a new code and try again.';

test('a field problem from the server is shown as it was sent', () => {
  const copy = getRegistrationErrorCopy(apiError('Use your MSEUF email address.', 422));

  assert.equal(copy.message, 'Use your MSEUF email address.');
  assert.equal(copy.spokenMessage, copy.message);
});

test('registration offline, rate-limit and server errors get their own plain messages', () => {
  const offline = getRegistrationErrorCopy(networkError());
  assert.match(offline.message, /^Can’t reach the event server/);
  assert.match(offline.spokenMessage, /Server message: Could not reach the event server/);
  assert.equal(getRegistrationErrorCopy(apiError('Too Many Attempts.', 429)).message, 'Too many attempts. Wait a minute, then try again.');
  assert.equal(getRegistrationErrorCopy(apiError('Server Error', 503)).message, 'The event server had a problem. Try again in a moment.');
});

test('registration fallbacks never throw for odd values', () => {
  assert.equal(getRegistrationErrorCopy('boom').message, 'Could not start your registration. Try again.');
  assert.equal(getRegistrationErrorCopy(null).message, 'Could not start your registration. Try again.');
  assert.equal(getRegistrationErrorCopy(Object.assign(new Error('Odd.'), { status: 500 })).message, 'Odd.');
});

test('every failed code check reads the same, so it never reveals why', () => {
  for (const message of [INVALID_CODE, 'Anything else the server said.']) {
    const copy = getVerifyErrorCopy(apiError(message, 422));
    assert.equal(copy.message, INVALID_CODE);
  }
  assert.equal(getVerifyErrorCopy(apiError(INVALID_CODE, 422)).spokenMessage, INVALID_CODE);
});

test('code checks handle offline, rate limits and server errors', () => {
  assert.match(getVerifyErrorCopy(networkError()).message, /^Can’t reach the event server/);
  assert.equal(getVerifyErrorCopy(apiError('Too Many Attempts.', 429)).message, 'Too many attempts. Wait a minute, then try again.');
  assert.equal(getVerifyErrorCopy(apiError('Server Error', 500)).message, 'The event server had a problem. Try again in a moment.');
  assert.equal(getVerifyErrorCopy(new Error('')).message, 'Could not check the code. Try again.');
});

test('the success notice tells the student to sign in with the student number', () => {
  assert.match(REGISTRATION_SUCCESS_NOTICE, /student number/);
  assert.doesNotMatch(REGISTRATION_SUCCESS_NOTICE, /email/i);
});

test('the resend countdown counts whole seconds down to zero and shows it in the label', () => {
  assert.equal(secondsUntil(61_000, 1_000), 60);
  assert.equal(secondsUntil(61_000, 1_001), 60);
  assert.equal(secondsUntil(61_000, 60_500), 1);
  assert.equal(secondsUntil(61_000, 61_000), 0);
  assert.equal(secondsUntil(61_000, 99_999), 0);
  assert.equal(getResendLabel(42), 'Send a new code in 42s');
  assert.equal(getResendLabel(0), 'Send a new code');
});

async function loadTypeScriptModule(sourceUrl) {
  const source = await readFile(sourceUrl, 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  });

  return import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
}
