# EUEvent Engineering Phases

This roadmap tracks the current MVP, not a production readiness certification. Items marked implemented describe repository code; they still need the runtime validation listed in Phase 4.

## Phase 1 — Laravel foundation and roles

**Implemented in the repository:** Laravel API, PostgreSQL schema/migrations, Sanctum authentication, three roles, role middleware, student/staff/admin endpoints, and activity/audit records.

**Still to validate:** Apply all new migrations to the shared Supabase project and verify deployment configuration without exposing credentials.

## Phase 2 — Ticket issuance and gate operations

**Implemented in the repository:** Event/gate configuration, staff assignments, student ticket issuance and revocation, gate-scoped manifests, and administrator views for core workflows.

**Still to validate:** Exercise event creation through ticket display and gate assignment on the actual presentation setup; verify staff assignment and ticket counts are correct.

## Phase 3 — Offline scan and reconciliation

**Implemented in the repository:** Encrypted local gate manifests, current-step rotating QR validation, a persistent offline scan queue, same-ID retry behavior, server-side transactional reconciliation, and collision auditing.

**Known limits:** A screenshot can be replayed during its current 30-second step. Disconnected scanners cannot coordinate single use or receive event/ticket/staff updates. Server reconciliation flags duplicates after reconnect; it cannot reverse physical entry.

**Still to validate:** Complete offline scan → app restart → reconnect → queue sync on physical devices. Verify PostgreSQL lock behavior and multiple-scanner contention.

## Phase 4 — Client and account hardening

**Implemented on the hardening branch:** Mobile password recovery for students and staff, administrator activation/deactivation of scanner staff, API token revocation, a cached per-manifest ticket lookup index, tests, and corrected security/operating documentation.

**Still to validate:** Apply the staff migration in the target database; configure a real mail transport and receive a reset email; test account recovery and deactivation on the devices and dashboard used for the demonstration.

## Phase 5 — Readiness checks before the 30–50% milestone review

- [ ] Run the full backend test suite and client build/lint checks on the hardening branch.
- [ ] Test mobile login, reset email, reset-token entry, ticket display, screen-reader labels, and bottom safe-area behavior on actual phones.
- [ ] Test staff account activation/deactivation and gate assignment in the admin dashboard against the local API.
- [ ] Run offline scanning on two devices, including same-step screenshot replay and duplicate presentation, then synchronize and review the collision.
- [ ] Benchmark realistic manifest sizes and scan queues on supported phones and PostgreSQL; publish measured limits only after recording results.
- [ ] Document the manual admission procedure for cancellation, reschedule, stale manifest, lost phone, low battery, and offline collision.

## Beyond this MVP milestone

Production deployment automation, backups/restore drills, measured load guarantees, stronger online/device revocation controls, robust multi-device offline coordination, and comprehensive accessibility/usability evaluation remain future work.
