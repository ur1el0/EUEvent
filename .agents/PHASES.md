# EUEvent System Status

Last reviewed: 2026-11-13

## Completion status

The team considers the agreed EUEvent MVP feature scope complete on `main`. The system includes the Laravel API, administrator dashboard, student ticket wallet, and security scanner. This status describes implemented product scope; it is not a production certification or a claim that every deployment and physical-device scenario has been independently verified.

## Completed product scope

- Laravel API with administrator, student, and security-staff roles, authentication, event and venue management, gate assignments, ticket issuance and revocation, activity records, and audit history.
- Student mobile login, password recovery and change, personal ticket wallet, and a 30-second rotating QR generated from a protected ticket secret.
- Security-staff mobile login, account activation/deactivation, assigned-gate manifests, encrypted local manifest and scan storage, offline validation and queueing, retry-safe synchronization, and server-side reconciliation.
- Administrator web workflows for accounts, venues, gates, event lifecycle, assignments, tickets, activity, and operational metrics.
- Local Fedora/Lerd presentation setup, team setup guidance, API and architecture documentation, and an event-day offline procedure.
- Automated backend, dashboard, and mobile checks for implemented workflows.

## Operating limits to explain

- A screenshot captured in the current 30-second step may still be accepted if that scanner has not already claimed the ticket.
- Disconnected scanners cannot share claims or receive cancellations, revocations, staff deactivation, or gate changes. Local acceptance is provisional until server reconciliation.
- Distinct offline scans of one ticket can both be accepted locally. The server detects and records the conflict after sync; it cannot reverse a physical entry.
- The student and scanner device clocks must agree because the scanner accepts only the exact current TOTP step.
- Password-reset email delivery depends on the deployment's mail transport. The project has not published performance, availability, PostgreSQL concurrency, or accessibility guarantees without recorded measurements.
- ADR 014 freshness thresholds remain a team/venue policy decision until formally approved.

## Post-completion operational validation

These are release and venue-readiness checks, not unimplemented MVP feature work. Record the build, environment, device, observed result, and evidence before marking a check complete.

- [ ] Confirm the target database has all migrations and verify deployment secrets through the team's approved process.
- [ ] Verify password-reset email delivery with the configured non-production mail transport.
- [ ] Rehearse manifest download, offline scan, app restart, reconnection, and queue synchronization on the event devices.
- [ ] Exercise screenshot replay and two-scanner collision behavior on physical devices; review the server audit results.
- [ ] Verify PostgreSQL locking and concurrent reconciliation against an isolated PostgreSQL environment.
- [ ] Approve or revise the ADR 014 freshness thresholds with event operators.
- [ ] Measure performance and review accessibility on the supported device set before making service-level claims.
- [ ] Complete deployment backup, restore, monitoring, retention, and incident-response plans before a production venue deployment.

## Source of truth

The current implementation is described in the root [README](../README.md), [product requirements](PRD.md), [architecture guide](../docs/architecture.md), [API contract](../docs/api.md), and the component READMEs. Historical design documents are labeled and should be read alongside those current guides. The [backlog](backlog.md) tracks the operational checks above.
