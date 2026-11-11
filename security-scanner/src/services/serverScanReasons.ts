export function serverReason(reasonCode: string | null): string {
  const reasons: Record<string, string> = {
    EVENT_NOT_ACTIVE: 'The event was cancelled, postponed, completed, or otherwise inactive before sync. Do not admit this ticket.',
    TICKET_REVOKED: 'The administrator revoked this ticket before the scan synchronized. Do not admit it.',
    GATE_MISMATCH: 'The server found this ticket assigned to a different gate. Do not admit it here.',
    SPLIT_BRAIN_COLLISION: 'Another scanner already accepted this ticket. Check the event log before allowing entry.',
    INVALID_TICKET_CODE: 'The server could not verify this QR code against the ticket secret. Do not admit it.',
  };
  return reasonCode ? reasons[reasonCode] ?? `The server rejected this scan (${reasonCode}). Do not admit this ticket.` : 'The server rejected this scan. Do not admit this ticket.';
}
