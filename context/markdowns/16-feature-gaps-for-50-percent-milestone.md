# Feature Gaps for the 30–50% Milestone

This note is a feature-focused snapshot of what is already available and what still needs a product decision or implementation for the first milestone. It excludes test execution, visual polish, deployment readiness, and defense preparation.

The target users are students, security staff, and administrators. The current codebase already has the main ticket issuance and offline scanning path, so this milestone should finish the most important account and event-operation gaps rather than expand into unrelated features.

**Status update (2026-11-10):** The four product gaps below are now closed in code or by documented decision, through PR #12 and the `feature/milestone-gaps` branch. What remains open is environment and device validation, listed at the end of this note.

## Features Already Implemented

### Administrators

- Create student and security-staff accounts.
- Configure venues and gates.
- Create, edit, schedule, postpone, cancel, and complete events.
- Assign event gates and security staff.
- Issue tickets, view an event's ticket roster, and revoke a ticket with a reason.
- View event metrics and administrator activity/audit records.
- Activate and deactivate security-staff accounts.

### Students

- Sign in to the mobile app and view tickets issued to their account.
- Generate a rotating QR code from the ticket secret stored for the mobile session.
- Hide the usable QR after the server marks a ticket as claimed.
- Recover a forgotten password and change a known password while signed in.

### Security staff

- Sign in and view assigned event gates.
- Download a gate-specific ticket manifest before losing connectivity.
- Validate rotating QR codes from the local manifest while offline.
- Store accepted scans in the local encrypted queue and upload them when connectivity returns.
- Receive server reconciliation outcomes and see relevant scan/anomaly records in the admin system.
- See a stale-manifest warning, and have scanning refused when the manifest is too old or the event window has ended.
- Recover a forgotten password and change a known password while signed in.

## Product Gap Status

### 1. Password recovery and password change: done

- **Recovery (PR #12):** `POST /api/v1/auth/password/email` and `POST /api/v1/auth/password/reset` are rate-limited, do not reveal whether an account exists, and use 60-minute single-use tokens. A successful reset revokes the account's Sanctum tokens. Code: [`MobilePasswordResetController`](../../backend/app/Http/Controllers/Api/V1/MobilePasswordResetController.php), mobile [`ForgotPasswordScreen`](../../security-scanner/src/screens/ForgotPasswordScreen.tsx) and [`ResetPasswordScreen`](../../security-scanner/src/screens/ResetPasswordScreen.tsx). Tests: [`MobilePasswordRecoveryTest`](../../backend/tests/Feature/MobilePasswordRecoveryTest.php).
- **Signed-in change:** `PATCH /api/v1/auth/password` for any active signed-in user, at six requests per minute. It checks the current password, requires at least 12 characters with confirmation, revokes every other token, and keeps the current one so a scanner with pending scans stays signed in. It records an activity entry with no password data. Code: [`AccountPasswordController`](../../backend/app/Http/Controllers/Api/V1/AccountPasswordController.php), [`ChangeAccountPasswordRequest`](../../backend/app/Http/Requests/Api/V1/ChangeAccountPasswordRequest.php), [`AccountPasswordChangeService`](../../backend/app/Services/AccountPasswordChangeService.php), mobile [`ChangePasswordScreen`](../../security-scanner/src/screens/ChangePasswordScreen.tsx), reached from the student and scanner home headers. Tests: [`AccountPasswordChangeTest`](../../backend/tests/Feature/AccountPasswordChangeTest.php). Contract: [API guide](../../docs/api.md#signed-in-password-change).
- **Still open:** Real mail delivery for reset tokens has not been verified.

### 2. Staff account and assignment lifecycle: done

- `users.is_active` and `PATCH /api/v1/admin/security-staff/{staff}/status` (PR #12). Deactivation revokes tokens. Inactive staff are blocked by `RequireRole` and excluded from new gate assignments, and every change writes an activity log entry. Code: [`AdminSecurityStaffAccessService`](../../backend/app/Services/AdminSecurityStaffAccessService.php), [`RequireRole`](../../backend/app/Http/Middleware/RequireRole.php), [`SecurityStaffManagement`](../../admin-web/src/components/SecurityStaffManagement.tsx). Tests: [`StaffAccountLifecycleTest`](../../backend/tests/Feature/StaffAccountLifecycleTest.php).
- The lost-phone and event-day replacement procedure is in the [event-day runbook](../../docs/event-day-runbook.md#lost-or-stolen-scanner-phone-or-replacing-a-staff-member): deactivate the account, recover the device physically, and add a replacement assignment (adding is allowed after scheduling, removing is not). A disconnected phone cannot receive the revocation.
- **Still open:** PostgreSQL concurrency check of idempotent deactivation, and a dashboard run against the local API.

### 3. Supervisor-authorized exception handling: decided (deferred)

- [ADR 013](../../architecture/decisions/013-manual-exception-procedure-without-pin-override.md) defers any PIN or supervisor override. The API keeps rejecting `is_override = true`. Exceptions follow the event lead's [manual exception procedure](../../docs/event-day-runbook.md#manual-exception-procedure), which records the ticket or student reference, gate, time, device, reason, and decision. These records are never server-confirmed admissions.
- Do not restore a client-controlled `is_override` bypass. Any future in-app override needs its own reviewed design.

### 4. Offline event-change and revocation behavior: done (thresholds pending approval)

- **Freshness rule:** Gate manifests now include `event_starts_at`, `event_ends_at`, and `generated_at` ([`GateManifestResource`](../../backend/app/Http/Resources/Api/V1/GateManifestResource.php), tests in [`GateManifestFreshnessFieldsTest`](../../backend/tests/Feature/GateManifestFreshnessFieldsTest.php)). The scanner applies one rule in [`manifestFreshness.ts`](../../security-scanner/src/services/manifestFreshness.ts), using its own clock. It warns after 6 hours, and refuses after 24 hours or 60 minutes past the scheduled event end. Manifests cached before this change keep working but are treated as stale. Unit tests: [`manifestFreshness.test.mjs`](../../security-scanner/tests/manifestFreshness.test.mjs). Decision: [ADR 014](../../architecture/decisions/014-offline-manifest-freshness-policy.md). The thresholds are **proposed, pending team approval**.
- **Status checks (PR #12):** The scanner refuses manifests whose event is not scheduled or in progress. Sync reports `EVENT_NOT_ACTIVE`, `TICKET_REVOKED`, `GATE_MISMATCH`, and `SPLIT_BRAIN_COLLISION`.
- **Operating procedure:** The [event-day runbook](../../docs/event-day-runbook.md) covers cancellation or reschedule while offline, revocation after a scanner disconnects, who authorizes admission during a WAN outage (the event lead), and the offline limits.
- An isolated phone still cannot receive a remote cancellation or revocation, and a later sync cannot undo a physical admission. These are stated limits, not open work.

## Recommended 50% Milestone Boundary

The milestone is feature-complete when this core path is usable end to end:

1. An administrator creates an event, configures gates, assigns security staff, and issues a student ticket.
2. The student signs in and displays a rotating ticket QR.
3. Security staff download the assigned gate manifest, disconnect from the server, scan the QR, and receive a clear local decision.
4. The scan remains queued through app backgrounding or restart, then synchronizes after connectivity returns.
5. The administrator can see the resulting ticket state and scan/audit history.
6. The product explains its offline limits: event changes are not immediate on disconnected devices, and two independent offline scanners cannot coordinate single-use admission in real time.

All six steps are implemented in code. Point 6 is written down in the [event-day runbook](../../docs/event-day-runbook.md#offline-limits) and ADR 014.

## Still Open: Environment and Device Validation

These items need recorded evidence. Passing SQLite tests or an online dashboard check do not count.

- [ ] Team approval of the ADR 014 freshness thresholds.
- [ ] Real mail transport delivers a reset token; expiry, single use, and session revocation verified.
- [ ] Physical Android/iOS run: manifest download, app restart, offline scan, queue persistence, reconnect, and sync.
- [ ] Physical-device check of the stale warning and refusal, including a phone with an older cached manifest.
- [ ] Two disconnected scanners with the same current-step QR, then sync and review of the collision.
- [ ] Password change on a phone with pending scans: the phone stays signed in and the scans still sync.
- [ ] PostgreSQL multi-connection check of row locks and idempotent staff deactivation.
- [ ] Shared Supabase migration and deployment configuration verified.

## Source-of-Truth Note

`.agents/PHASES.md` and `.agents/backlog.md` track the same validation items. Check the current routes, services, and clients before treating any list as current status. This local note is a planning aid, not a replacement for source code or the approved course rubric.
