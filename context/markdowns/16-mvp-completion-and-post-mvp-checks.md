# EUEvent MVP completion and post-MVP checks

Last reviewed: 2026-11-13

The team considers the agreed EUEvent feature scope complete. The current system includes the Laravel API, administrator desktop dashboard, student ticket wallet, and security-staff scanner. This is a feature-completion statement; production readiness still depends on the real database, mail, device, and venue checks listed below.

## Implemented capabilities

### Administrators

- Create student and security-staff accounts and manage scanner staff activation.
- Configure venues, gates, events, event states, assignments, and ticket issuance/revocation.
- Review metrics, administrator activity, scan decisions, and anomalies.

### Students

- Sign in, recover or change a password, and view tickets issued to their own account.
- Display a rotating QR proof generated from the protected ticket secret on the phone.

### Security staff

- Sign in, see assigned gates, and download a gate-specific manifest while connected.
- Validate tickets from an encrypted local manifest, queue scans offline, and synchronize with stable scan IDs.
- Review server reconciliation results after reconnecting.

## Limits to explain and operate around

- A screenshot from the active 30-second code step may be replayed if a scanner has not already claimed the ticket.
- Two disconnected scanners cannot share claims. Both may provisionally accept a ticket; Laravel identifies the conflict after sync. The software cannot undo physical admission.
- Offline devices cannot receive cancellations, rescheduling, revocations, staff deactivation, or gate changes until they reconnect.
- Local acceptance is provisional until server reconciliation. Device clocks must be aligned because the scanner allows zero TOTP drift steps.
- No marshal PIN override exists; event leads use the manual exception procedure in the [event-day runbook](../../docs/event-day-runbook.md).
- Password reset email requires an operational mail transport. The dashboard does not include unsynchronized scanner queues in its server metrics.

## Post-MVP evidence checklist

These checks do not mean the agreed product features are missing. Record evidence from the target environment before claiming production readiness.

- [ ] Apply migrations and verify deployment configuration against the intended database.
- [ ] Verify password reset email delivery, token expiry, single use, and session revocation with test accounts.
- [ ] Rehearse manifest download, offline scan, app restart, reconnect, and synchronization on the actual event phones.
- [ ] Test active-step screenshot replay and two-scanner collision/reconciliation behavior with test tickets.
- [ ] Verify PostgreSQL concurrency behavior with multiple connections in an isolated environment.
- [ ] Review/approve the ADR 014 manifest freshness policy with venue operators.
- [ ] Measure performance and complete an accessibility/usability review before publishing support claims.
- [ ] Plan production backups, restore drills, monitoring, retention, and incident contacts.

## Source of truth

Use the tracked [system status](../../.agents/PHASES.md), [product requirements](../../.agents/PRD.md), [API guide](../../docs/api.md), and [event-day runbook](../../docs/event-day-runbook.md) as current references. This local learning note is not a substitute for source code or recorded validation evidence.
