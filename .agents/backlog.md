# EUEvent Post-MVP Operational Backlog

The team considers the agreed MVP feature scope complete. This list tracks evidence, approvals, and deployment work after feature completion; it is not a list of missing MVP screens or flows. Do not check an item without recording its environment, date, and result.

## Event and account operations

- [ ] Verify reset-email delivery, expiry, single use, rate limits, and token revocation with the configured non-production mail transport.
- [ ] Rehearse staff activation/deactivation and event/gate assignment in the presentation environment.
- [ ] Confirm with event operators how long disconnected scanners may continue using a cached manifest and approve or revise ADR 014 thresholds.
- [ ] Rehearse the manual exception procedure and the lost/replaced scanner phone procedure with the event lead.

## Physical offline validation

- [ ] Record a full-device rehearsal: assigned manifest download, API loss, QR scan, app background/restart, reconnect, and server acknowledgment.
- [ ] Verify a QR from an earlier 30-second step is rejected and a screenshot from the active step has the documented short replay window.
- [ ] Present the same ticket to two disconnected scanners, reconnect both, and review the server collision records with the event lead.
- [ ] Verify cancellation, reschedule, ticket revocation, and staff deactivation behavior with a stale offline manifest.
- [ ] Exercise low battery, camera permission denial, app backgrounding, device clock skew, and local storage recovery on supported phones.

## Deployment and assurance

- [ ] Apply and verify migrations in the designated deployment database using the approved change process.
- [ ] Run multi-connection PostgreSQL concurrency checks in an isolated environment; SQLite tests alone do not prove database lock behavior.
- [ ] Measure manifest size, scan latency, queue growth, sync throughput, and lock contention on representative devices and infrastructure.
- [ ] Complete accessibility/usability review, backup/restore drill, monitoring, data-retention policy, incident contacts, and secret-management review before production use.
- [ ] Approve measurable support limits and deployment objectives; do not infer them from code size or language percentages.

## Completion reference

See [system status and phases](PHASES.md) for the implemented scope and known operating limits. The [event-day runbook](../docs/event-day-runbook.md) contains the current manual procedures. The checklist is intentionally unchecked until the team records evidence.
