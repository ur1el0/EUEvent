# EUEvent Engineering Guide Index

Use these project notes together with the source code and tests. Older files under `architecture/` are historical design references; check the status note at the top before applying them.

## Product and system

- [Product requirements](PRD.md): user roles, current capabilities, limits, and out-of-scope work.
- [System architecture](ARCHITECTURE.md): current component responsibilities, offline workflow, and scale considerations.
- [Security notes](SECURITY.md): implemented protections and their known boundaries.
- [Domain glossary](GLOSSARY.md): agreed vocabulary for account, ticket, and sync behavior.
- [Engineering phases](PHASES.md) and [readiness backlog](backlog.md): current milestone and the evidence still needed.
- [Troubleshooting runbook](TROUBLESHOOTING.md): operator and development diagnostics.
- [Skills and commands](SKILLS.md): local development and verification commands.

## Rules for code changes

- [Architecture](rules/01-architecture.md): keep UI, API, and service responsibilities separated.
- [Laravel backend](rules/02-laravel-backend.md): validate input, use transactions and row locks, and preserve retry semantics.
- [React administrator app](rules/03-react-admin.md): accessible desktop dashboard practices.
- [Testing](rules/04-testing.md): PHPUnit and Node test commands; PostgreSQL concurrency must be tested on PostgreSQL.
- [Git workflow](rules/05-git-workflow.md): branch naming, separated commits, and secret hygiene.
- [Offline TOTP and sync](rules/06-offline-sync-totp.md): current QR format, replay limits, queue, and reconciliation.
- [Expo mobile](rules/07-expo-mobile.md): device storage, service boundaries, and scanner feedback.

## Current decisions that supersede earlier proposals

- [ADR 012: TOTP and screenshot replay boundary](../architecture/decisions/012-current-step-totp-and-replay-boundary.md)
- [ADR 013: manual exception procedure without a PIN override](../architecture/decisions/013-manual-exception-procedure-without-pin-override.md)

Use code, migrations, and tests as the live specification. Do not describe a planned or superseded design as an implemented feature.
