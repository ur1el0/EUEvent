import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import ts from 'typescript';

const { isStudentTicket } = await loadTypeScriptModule(
  new URL('../src/services/studentTicketContract.ts', import.meta.url),
);

const validTicket = {
  id: 31,
  status: 'issued',
  totp_secret: 'a'.repeat(40),
  gate: { id: 7, code: 'NORTH', name: 'North Gate' },
  event: {
    id: 11,
    name: 'Winter Assembly',
    starts_at: '2026-12-18T10:00:00+08:00',
    ends_at: '2026-12-18T12:00:00+08:00',
    status: 'scheduled',
    venue_name: 'North Gym',
  },
};

test('accepts issued ticket payloads with their gate and event details', () => {
  assert.equal(isStudentTicket(validTicket), true);
});

test('accepts claimed tickets whose rotating secret is intentionally withheld', () => {
  assert.equal(isStudentTicket({ ...validTicket, status: 'claimed', totp_secret: null }), true);
});

test('rejects malformed ticket, gate, event, status, or secret values', () => {
  for (const payload of [null, [], { ...validTicket, id: '31' },
    { ...validTicket, status: 'pending' }, { ...validTicket, totp_secret: '' },
    { ...validTicket, gate: { ...validTicket.gate, id: '7' } },
    { ...validTicket, event: { ...validTicket.event, status: 'open' } },
    { ...validTicket, event: { ...validTicket.event, ends_at: null } }]) {
    assert.equal(isStudentTicket(payload), false);
  }
});

async function loadTypeScriptModule(sourceUrl) {
  const source = await readFile(sourceUrl, 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  });
  const moduleUrl = `data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`;

  return import(moduleUrl);
}
