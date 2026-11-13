# Post-MVP operational follow-up

The team considers the agreed product feature scope complete. This checklist covers deployment, policy approval, and evidence that must be collected in each real event environment. These items do not change the completion status of the implemented MVP. They do limit what can responsibly be claimed for a live production event until checked.

## Environment and account checks

- Verify that the selected database contains every committed migration and that the deployment uses the intended database credentials.
- Configure the approved mail transport and verify reset-token delivery, expiry, single use, and session revocation with test accounts.
- Confirm that local demo accounts and credentials remain limited to the isolated presentation environment.
- Review token lifetimes, database access, mail secrets, backups, retention, monitoring, and incident contacts for the target deployment.

## Physical device rehearsal

- Record device model, OS, app version/build, network layout, event status, gate assignment, and test account used.
- Download each assigned manifest before doors open and check its version/time against the event setup.
- Exercise student ticket display, valid scanning, expired QR, wrong gate, duplicate scan on one device, app background/restart, reconnection, and sync acknowledgment.
- Test cancellation or rescheduling while a scanner is offline and follow the event lead's manual procedure.
- Present the same ticket to two disconnected scanners, reconnect them, and review the resulting server conflict. The software cannot retroactively decide who physically entered.
- Exercise battery, camera permission, device clock, storage, and local-network failures on the phones intended for the event.

## Database and assurance checks

- Verify the PostgreSQL locking and reconciliation behavior with multiple connections against an isolated environment. SQLite feature tests do not prove PostgreSQL concurrency behavior.
- Measure scan latency, manifest size, queue volume, and sync throughput on representative hardware before publishing support limits.
- Complete accessibility/usability review, backup and restore drill, retention decision, and operational incident review before a production deployment.
- Obtain event-operator approval for the proposed freshness thresholds in [ADR 014](../../architecture/decisions/014-offline-manifest-freshness-policy.md).

## Completion reporting

Report the feature scope as complete and attach evidence to the operational checks above as it becomes available. Do not estimate project completion from language percentages or code volume. If a course rubric requires a numeric grade, map each rubric item to an implementation artifact and evidence, then state the rubric's weighting.
