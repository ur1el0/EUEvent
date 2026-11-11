import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import ts from 'typescript';

const {
  CLOCK_ROLLBACK_TOLERANCE_MINUTES,
  MAX_MANIFEST_AGE_HOURS,
  POST_EVENT_GRACE_MINUTES,
  STALE_WARNING_HOURS,
  evaluateManifestFreshness,
  getManifestFreshnessCopy,
} = await loadTypeScriptModule(new URL('../src/services/manifestFreshness.ts', import.meta.url));

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DOWNLOADED_AT = Date.parse('2026-11-20T06:00:00.000Z');
const EVENT_ENDS_AT = Date.parse('2026-11-20T18:00:00.000Z');

function makeSnapshot({ downloadedAt = new Date(DOWNLOADED_AT).toISOString(), eventEndsAt = new Date(EVENT_ENDS_AT).toISOString(), legacy = false } = {}) {
  const manifest = { gate_id: 41, event_status: 'scheduled', manifest_version: 3, tickets: [] };
  if (!legacy) manifest.event_ends_at = eventEndsAt;
  return { downloadedAt, manifest };
}

test('proposed thresholds match ADR 014', () => {
  assert.equal(STALE_WARNING_HOURS, 6);
  assert.equal(MAX_MANIFEST_AGE_HOURS, 24);
  assert.equal(POST_EVENT_GRACE_MINUTES, 60);
  assert.equal(CLOCK_ROLLBACK_TOLERANCE_MINUTES, 5);
});

test('a recent manifest inside the event window is fresh', () => {
  assert.deepEqual(evaluateManifestFreshness(makeSnapshot(), DOWNLOADED_AT + HOUR), { decision: 'fresh' });
});

test('the stale warning starts after the warning threshold', () => {
  const atThreshold = DOWNLOADED_AT + STALE_WARNING_HOURS * HOUR;
  assert.equal(evaluateManifestFreshness(makeSnapshot(), atThreshold).decision, 'fresh');
  assert.deepEqual(
    evaluateManifestFreshness(makeSnapshot(), atThreshold + 1),
    { decision: 'warn', reason: 'downloaded_long_ago' },
  );
});

test('a manifest older than the maximum age is refused', () => {
  const snapshot = makeSnapshot({ eventEndsAt: '2026-11-25T18:00:00.000Z' });
  const atLimit = DOWNLOADED_AT + MAX_MANIFEST_AGE_HOURS * HOUR;
  assert.equal(evaluateManifestFreshness(snapshot, atLimit).decision, 'warn');
  assert.deepEqual(
    evaluateManifestFreshness(snapshot, atLimit + 1),
    { decision: 'refuse', reason: 'manifest_too_old' },
  );
});

test('scanning is refused after the event end plus grace period', () => {
  const snapshot = makeSnapshot({ downloadedAt: '2026-11-20T16:00:00.000Z' });
  const graceEnd = EVENT_ENDS_AT + POST_EVENT_GRACE_MINUTES * MINUTE;
  assert.equal(evaluateManifestFreshness(snapshot, EVENT_ENDS_AT + MINUTE).decision, 'fresh');
  assert.equal(evaluateManifestFreshness(snapshot, graceEnd).decision, 'fresh');
  assert.deepEqual(
    evaluateManifestFreshness(snapshot, graceEnd + 1),
    { decision: 'refuse', reason: 'event_ended' },
  );
});

test('a legacy manifest without an event window still works but is stale', () => {
  const legacy = makeSnapshot({ legacy: true });
  assert.equal('event_ends_at' in legacy.manifest, false);
  assert.deepEqual(
    evaluateManifestFreshness(legacy, DOWNLOADED_AT + MINUTE),
    { decision: 'warn', reason: 'missing_event_window' },
  );
});

test('a legacy manifest is still refused once it passes the maximum age', () => {
  const legacy = makeSnapshot({ legacy: true });
  assert.deepEqual(
    evaluateManifestFreshness(legacy, DOWNLOADED_AT + MAX_MANIFEST_AGE_HOURS * HOUR + 1),
    { decision: 'refuse', reason: 'manifest_too_old' },
  );
});

test('an unreadable event end time is treated like a legacy manifest', () => {
  assert.deepEqual(
    evaluateManifestFreshness(makeSnapshot({ eventEndsAt: 'not-a-date' }), DOWNLOADED_AT + MINUTE),
    { decision: 'warn', reason: 'missing_event_window' },
  );
});

test('an unreadable download time is refused', () => {
  assert.deepEqual(
    evaluateManifestFreshness(makeSnapshot({ downloadedAt: 'unknown' }), DOWNLOADED_AT),
    { decision: 'refuse', reason: 'unknown_download_time' },
  );
});

test('a phone clock moved back before the download time is refused', () => {
  const tolerance = CLOCK_ROLLBACK_TOLERANCE_MINUTES * MINUTE;
  assert.equal(evaluateManifestFreshness(makeSnapshot(), DOWNLOADED_AT - tolerance).decision, 'fresh');
  assert.deepEqual(
    evaluateManifestFreshness(makeSnapshot(), DOWNLOADED_AT - tolerance - 1),
    { decision: 'refuse', reason: 'unknown_download_time' },
  );
});

test('the maximum age check runs before the event window check', () => {
  const snapshot = makeSnapshot({ eventEndsAt: '2026-11-20T07:00:00.000Z' });
  assert.equal(
    evaluateManifestFreshness(snapshot, DOWNLOADED_AT + 30 * HOUR).reason,
    'manifest_too_old',
  );
});

test('warning copy asks staff to refresh when connected', () => {
  for (const reason of ['downloaded_long_ago', 'missing_event_window']) {
    const copy = getManifestFreshnessCopy({ decision: 'warn', reason });
    assert.match(copy.title, /manifest may be outdated, refresh when connected/i);
    assert.match(copy.detail, /connected/);
  }
});

test('refusal copy says not to admit and to refresh or ask the event lead', () => {
  for (const reason of ['unknown_download_time', 'manifest_too_old', 'event_ended']) {
    const copy = getManifestFreshnessCopy({ decision: 'refuse', reason });
    assert.match(copy.detail, /Do not admit/);
    assert.match(copy.detail, /refresh the manifest while connected, or ask the event lead/i);
  }
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
