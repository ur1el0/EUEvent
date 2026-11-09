# EUEvent MVP Readiness Backlog

The core MVP code is present. This is the remaining work to validate and harden the first demonstration milestone; checked items should be updated only after the corresponding evidence exists.

## Account and administrator flows

- [ ] Apply and verify the staff `is_active` migration on the shared PostgreSQL project.
- [ ] Configure and verify a real mail transport; check password reset delivery, expiry, single use, rate limiting, and session revocation.
- [ ] Exercise administrator staff activation/deactivation and event gate assignment in the actual desktop dashboard.
- [ ] Confirm offline account deactivation expectations with event operators and document device recovery steps.

## Offline ticket admission

- [ ] Test manifest download, app restart, offline ticket scan, queue persistence, reconnect, and server acknowledgement on real Android and iOS devices.
- [ ] Test current-step QR acceptance, expiration at the next 30-second step, and screenshot replay during the active step.
- [ ] Test duplicate presentation at two disconnected scanners and confirm both records reconcile with a collision for human review.
- [ ] Test cancelled/rescheduled events and revoked tickets with stale manifests; make the physical stop/continue procedure clear to staff.
- [ ] Test low battery, app background/foreground, camera permission loss, and local storage recovery.
- [ ] Validate gate/staff assignments before venue doors open and make the stale-manifest warning visible in training material.

## Reliability, performance, and security evidence

- [ ] Run all backend and mobile checks on the hardening branch and review failures before merging.
- [ ] Verify server-side row locking with concurrent PostgreSQL connections using the actual Supabase connection mode.
- [ ] Benchmark manifest sizes, local QR validation p50/p95, device memory, offline queue volume, sync throughput, and database lock waits.
- [ ] Establish supported event/device limits from recorded measurements; do not publish unmeasured throughput or latency promises.
- [ ] Review token expiry, reset rate limiting, admin authorization, audit log retention, and server secrets in the presentation deployment.
- [ ] Run a focused accessibility/usability review on sign-in, QR brightness/readability, scan feedback, errors, admin forms, and small screens.

## Presentation operations

- [ ] Use a standalone scanner build if the demo must continue when Metro is unavailable.
- [ ] Prepare a local network/server fallback and confirm every phone downloads its assigned manifest beforehand.
- [ ] Assign an event lead to handle manual exceptions; the application has no marshal PIN override.
- [ ] After doors close, reconnect every scanner, sync pending records, and review collisions/anomalies before treating admission counts as final.
