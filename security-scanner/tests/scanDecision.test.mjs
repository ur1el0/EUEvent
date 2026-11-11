import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import ts from 'typescript';

const {
  LOCAL_ADMIT_NOTE,
  SERVER_ADMIT_NOTE,
  applyServerOutcome,
  denyDecision,
  getConfirmationNote,
  getDecisionAnnouncement,
  getDecisionHeadline,
  localAdmitDecision,
} = await loadTypeScriptModule(new URL('../src/services/scanDecision.ts', import.meta.url));

const describeRejection = (code) => `rejected:${code}`;

test('a local admission says ADMIT and is labelled as not yet server-confirmed', () => {
  const decision = localAdmitDecision('scan-1', 'A23-12345');

  assert.equal(decision.verdict, 'admit');
  assert.equal(getDecisionHeadline(decision.verdict), 'ADMIT');
  assert.equal(decision.confirmation, 'local');
  assert.equal(getConfirmationNote(decision), LOCAL_ADMIT_NOTE);
  assert.equal(decision.studentNumber, 'A23-12345');
  assert.equal(decision.scanId, 'scan-1');
});

test('a rejection says DO NOT ADMIT, keeps the copy, and has no confirmation note or scan ID', () => {
  const decision = denyDecision({ title: 'Ticket belongs to another gate', detail: 'Direct the student.' });

  assert.equal(getDecisionHeadline(decision.verdict), 'DO NOT ADMIT');
  assert.equal(decision.reason, 'Ticket belongs to another gate');
  assert.equal(decision.detail, 'Direct the student.');
  assert.equal(getConfirmationNote(decision), null);
  assert.equal(decision.studentNumber, null);
  assert.equal(decision.scanId, null);
});

test('a server acceptance for the shown scan keeps ADMIT and switches to server confirmation', () => {
  const shown = localAdmitDecision('scan-1', 'A23-12345');
  const updated = applyServerOutcome(shown, [{ scan_id: 'scan-1', decision: 'accepted', reason_code: null }], describeRejection);

  assert.equal(updated.verdict, 'admit');
  assert.equal(updated.confirmation, 'server');
  assert.equal(getConfirmationNote(updated), SERVER_ADMIT_NOTE);
  assert.equal(updated.studentNumber, 'A23-12345');
});

test('a server rejection for the shown scan turns it into DO NOT ADMIT with the server reason', () => {
  const shown = localAdmitDecision('scan-1', 'A23-12345');
  const updated = applyServerOutcome(shown, [{ scan_id: 'scan-1', decision: 'rejected', reason_code: 'TICKET_REVOKED' }], describeRejection);

  assert.equal(updated.verdict, 'deny');
  assert.equal(updated.reason, 'Server rejected this scan');
  assert.equal(updated.detail, 'rejected:TICKET_REVOKED');
  assert.equal(updated.confirmation, null);
});

test('outcomes for other scans, rejections, or an empty panel leave the shown decision unchanged', () => {
  const shown = localAdmitDecision('scan-1', null);
  const denied = denyDecision({ title: 'Rotating code expired', detail: 'Scan again.' });
  const otherScan = [{ scan_id: 'scan-2', decision: 'rejected', reason_code: 'GATE_MISMATCH' }];

  assert.equal(applyServerOutcome(shown, otherScan, describeRejection), shown);
  assert.equal(applyServerOutcome(denied, otherScan, describeRejection), denied);
  assert.equal(applyServerOutcome(null, otherScan, describeRejection), null);
});

test('the announcement leads with the decision and includes the student number only when known', () => {
  assert.equal(
    getDecisionAnnouncement(localAdmitDecision('scan-1', 'A23-12345')),
    `ADMIT. Valid ticket for this gate. Student number A23-12345. ${LOCAL_ADMIT_NOTE}.`,
  );
  assert.equal(
    getDecisionAnnouncement(denyDecision({ title: 'Ticket already used', detail: 'x' })),
    'DO NOT ADMIT. Ticket already used.',
  );
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
