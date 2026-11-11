import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import ts from 'typescript';

const { canShowTicketPass, getEventStatusLabel, getTicketStatusLabel, sortTicketsForDisplay } = await loadTypeScriptModule(
  new URL('../src/services/ticketStatus.ts', import.meta.url),
);
const { getSignOutWarning } = await loadTypeScriptModule(
  new URL('../src/services/signOutWarning.ts', import.meta.url),
);

const SECRET = '0123456789abcdef0123456789abcdef01234567';

function makeTicket({ id = 1, status = 'issued', eventStatus = 'scheduled', startsAt = '2026-11-20T09:00:00+08:00', secret = SECRET } = {}) {
  return {
    id,
    status,
    totp_secret: secret,
    gate: { id: 4, code: 'A', name: 'Main gate' },
    event: { id: id + 100, name: `Event ${id}`, starts_at: startsAt, ends_at: startsAt, status: eventStatus, venue_name: 'Gym' },
  };
}

test('a pass can be shown only for an issued ticket to a scheduled or running event with a secret', () => {
  assert.equal(canShowTicketPass(makeTicket()), true);
  assert.equal(canShowTicketPass(makeTicket({ eventStatus: 'in_progress' })), true);
  assert.equal(canShowTicketPass(makeTicket({ status: 'claimed' })), false);
  assert.equal(canShowTicketPass(makeTicket({ status: 'revoked' })), false);
  assert.equal(canShowTicketPass(makeTicket({ eventStatus: 'postponed' })), false);
  assert.equal(canShowTicketPass(makeTicket({ secret: null })), false);
});

test('usable passes come first, soonest event first', () => {
  const later = makeTicket({ id: 1, startsAt: '2026-11-25T09:00:00+08:00' });
  const soonest = makeTicket({ id: 2, startsAt: '2026-11-12T09:00:00+08:00', eventStatus: 'in_progress' });
  const used = makeTicket({ id: 3, status: 'claimed', startsAt: '2026-11-01T09:00:00+08:00' });

  assert.deepEqual(sortTicketsForDisplay([later, used, soonest]).map((ticket) => ticket.id), [2, 1, 3]);
});

test('other tickets follow, most recent event first, with unreadable dates last', () => {
  const old = makeTicket({ id: 1, eventStatus: 'completed', startsAt: '2026-01-10T09:00:00+08:00' });
  const recent = makeTicket({ id: 2, eventStatus: 'cancelled', startsAt: '2026-10-10T09:00:00+08:00' });
  const unknown = makeTicket({ id: 3, status: 'revoked', startsAt: 'not a date' });
  const active = makeTicket({ id: 4 });

  assert.deepEqual(sortTicketsForDisplay([unknown, old, active, recent]).map((ticket) => ticket.id), [4, 2, 1, 3]);
});

test('sorting returns a new array and leaves the cached order alone', () => {
  const tickets = [makeTicket({ id: 1, status: 'claimed' }), makeTicket({ id: 2 })];
  const sorted = sortTicketsForDisplay(tickets);

  assert.notEqual(sorted, tickets);
  assert.deepEqual(tickets.map((ticket) => ticket.id), [1, 2]);
});

test('every event status gets a friendly label instead of the raw API word', () => {
  const labels = ['draft', 'scheduled', 'in_progress', 'postponed', 'cancelled', 'completed']
    .map((eventStatus) => getTicketStatusLabel(makeTicket({ eventStatus })));

  assert.deepEqual(labels, ['Not scheduled yet', 'Entry opens soon', 'Entry open', 'Postponed', 'Cancelled', 'Ended']);
});

test('staff gate cards use the same event labels as student tickets', () => {
  assert.equal(getEventStatusLabel('in_progress'), 'Entry open');
  assert.equal(getEventStatusLabel('completed'), 'Ended');
  assert.equal(getEventStatusLabel('scheduled'), getTicketStatusLabel(makeTicket({ eventStatus: 'scheduled' })));
});

test('a used or revoked ticket shows that status whatever the event status is', () => {
  assert.equal(getTicketStatusLabel(makeTicket({ status: 'claimed', eventStatus: 'in_progress' })), 'Used');
  assert.equal(getTicketStatusLabel(makeTicket({ status: 'revoked', eventStatus: 'scheduled' })), 'Revoked');
});

test('signing out always says the saved tickets are deleted from this phone', () => {
  const online = getSignOutWarning(false);

  assert.match(online.message, /deletes the tickets saved on this phone/);
  assert.equal(online.offlineWarning, null);
  assert.equal(online.confirmLabel, 'Sign out');
});

test('signing out while offline adds the stronger no-connection warning', () => {
  const offline = getSignOutWarning(true);

  assert.equal(offline.title, 'Sign out while offline?');
  assert.match(offline.message, /deletes the tickets saved on this phone/);
  assert.equal(offline.offlineWarning, 'You can’t sign back in without a connection; you’ll lose your ticket on this phone until then.');
  assert.equal(offline.confirmLabel, 'Sign out anyway');
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
