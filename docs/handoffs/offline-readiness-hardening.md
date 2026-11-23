# Offline Readiness Hardening: Developer Handoff

> **Historical handoff:** This document records the implementation plan and checks for the hardening branch/PR. The agreed MVP feature changes described here have since merged into `main`. Use [current system status](../../.agents/PHASES.md) and the [post-MVP operational backlog](../presentation/03-post-mvp-operational-follow-up.md) for present-day status; the open validation items below are evidence to collect, not missing MVP code features.

This handoff covers the account-recovery, scanner-staff lifecycle, and offline-scan changes in PR [#12](https://github.com/ur1el0/mseuf-offline-ticketing/pull/12). It is for developers who will review, integrate, configure, and validate those changes.

## Scope and current state

The branch adds:

- A persistent `users.is_active` flag for staff account access.
- Mobile password recovery for student and security-staff accounts.
- Administrator activation and deactivation of security-staff accounts.
- A cached ticket-ID index in scanner QR validation.
- Tests and decisions documenting the limits of offline replay protection.

Automated checks have passed for this branch. The remaining work is environment and device validation: verify mail delivery, exercise the offline flow on physical phones, and confirm row-lock behavior against PostgreSQL. The automated PHP suite uses in-memory SQLite; it does not prove PostgreSQL concurrency behavior.

## Code map

| Area | Files to start with | Responsibility |
| --- | --- | --- |
| Staff status storage | `backend/database/migrations/2026_11_09_030117_add_is_active_to_users_table.php`, `backend/app/Models/User.php` | Adds the status column, model default, and boolean cast. |
| Password reset API | `backend/routes/api.php`, `backend/app/Http/Controllers/Api/V1/MobilePasswordResetController.php`, `backend/app/Http/Requests/Api/V1/RequestMobilePasswordResetLinkRequest.php`, `backend/app/Http/Requests/Api/V1/ResetMobilePasswordRequest.php` | Validates and rate-limits reset requests, hides account eligibility, and resets passwords. |
| Reset email | `backend/app/Notifications/MobilePasswordResetNotification.php` | Sends the one-time token for entry in the mobile app. |
| Staff lifecycle API | `backend/app/Services/AdminSecurityStaffAccessService.php`, `backend/app/Http/Controllers/Api/V1/AdminSecurityStaffController.php`, `backend/app/Http/Middleware/RequireRole.php` | Serializes status changes, writes an activity record, revokes tokens, and blocks inactive accounts. |
| Admin UI | `admin-web/src/components/SecurityStaffManagement.tsx`, `admin-web/src/components/AdminEventManagement.tsx` | Shows status, allows activation/deactivation, and prevents new assignments to inactive staff. |
| Mobile recovery | `security-scanner/src/screens/ForgotPasswordScreen.tsx`, `security-scanner/src/screens/ResetPasswordScreen.tsx`, `security-scanner/src/services/passwordRecovery.ts` | Requests a token and submits a new password. |
| Scanner lookup | `security-scanner/src/services/ticketValidationCore.ts` | Indexes manifest tickets by ID and validates the current QR step. |
| Automated behavior | `backend/tests/Feature/MobilePasswordRecoveryTest.php`, `backend/tests/Feature/StaffAccountLifecycleTest.php`, `security-scanner/tests/ticketValidation.test.mjs` | Covers recovery, account lifecycle, and QR validation behavior. |
| API and security decisions | `docs/api.md`, `architecture/decisions/012-current-step-totp-and-replay-boundary.md`, `architecture/decisions/013-manual-exception-procedure-without-pin-override.md` | Records the current route contract and offline admission limits. |

## Account recovery

### API behavior

| Method and path | Limit | Purpose |
| --- | --- | --- |
| `POST /api/v1/auth/password/email` | 5 requests per minute | Accepts an email and returns the same `202` message for known, unknown, and ineligible accounts. Eligible student and security-staff accounts receive a reset token by email. |
| `POST /api/v1/auth/password/reset` | 10 requests per minute | Accepts `email`, `token`, `password`, and `password_confirmation`. Passwords must be at least 12 characters. A successful reset invalidates existing Sanctum tokens. |

Tokens expire after 60 minutes and can only be used once. Administrators are deliberately excluded from the mobile reset flow. Invalid and expired tokens receive a generic error response.

### Mail setup and smoke check

1. Use a controlled student or staff test account. Do not use a real student account for QA.
2. Configure the backend's ignored `.env` with the team's approved mail transport. `backend/.env.example` defaults to Laravel's `log` mailer for local development. Local developers may inspect the local Laravel log or an already configured Mailpit instance to retrieve a test token. Never use the log mailer for real users.
3. Clear cached configuration after changing local mail settings:

   ```bash
   cd backend
   php artisan config:clear
   ```

4. Start the backend and mobile app, request a token from **Forgot your password?**, and confirm that the message reaches the configured test mailbox.
5. Enter the exact account email and token in **I have a reset token**. Set a new password, then confirm the old password and existing app token fail while the new password can sign in.
6. Request another token and verify that an incorrect, expired, or already-used token is rejected. Avoid repeatedly triggering the endpoint; it is rate-limited.

Mail credentials belong in local or secret-managed environment configuration. Do not commit them, paste tokens into chat/PRs, or attach mailbox screenshots containing real account details.

## Security-staff activation and deactivation

An administrator can change status in the **Security staff** dashboard. The API is `PATCH /api/v1/admin/security-staff/{staff}/status` with `{ "is_active": false }` or `{ "is_active": true }`.

On deactivation, Laravel locks the staff row inside a transaction, updates status, records an admin activity entry, and deletes the staff member's Sanctum tokens. Inactive accounts cannot sign in or use role-protected routes. Reactivation permits a new sign-in; deleted tokens are not restored.

### Admin smoke check

1. Sign in as an administrator and deactivate a dedicated test staff account.
2. Confirm the dashboard shows **Inactive** and does not offer the account for a new event-gate assignment. Existing assignment history is retained.
3. Use the staff account's previously issued token against `/api/v1/auth/me`; it must receive `401`. Attempt login; it must fail.
4. Reactivate the account. Confirm a fresh login works and the old token still fails.
5. Confirm the admin activity log records the status change.

Deactivation takes effect on the server immediately. It cannot reach a phone that is disconnected. The staff app's saved offline manifest is not remotely erased; follow venue procedure to physically recover an inactive staff device before allowing further scans.

## Physical-device and offline scan validation

Run this with test tickets and two physical scanner phones. Keep device time set to automatic. Use a scheduled or in-progress event, issue tickets to test students, assign the test staff to the correct gate, sign in, and download the manifest while online **before** disconnecting.

| Scenario | Expected result |
| --- | --- |
| Valid QR at the assigned gate during its current 30-second step | The scanner accepts it locally and queues the decision for sync. |
| QR after its 30-second step rolls over | The scanner rejects it as expired. The scanner allows zero clock-drift steps. |
| Malformed QR, unknown ticket, or wrong gate | The scanner rejects it with the corresponding validation reason. |
| Same ticket scanned again on the same scanner after its local claim | The scanner rejects it as already used locally. |
| Same current-step QR presented to a second, disconnected scanner that has not claimed it | It may also be accepted locally. Offline scanners do not share claims. |
| Two distinct offline scans are later synced | The server reconciles them; later collisions can be rejected, but it cannot prove which person physically entered first. |
| Scanner reconnects after queued scans | The scanner submits queued records using their original stable `scan_id` values and displays server reconciliation results. |

The rotating QR narrows the replay window; it does not prove identity, liveness, or that a screenshot is being shown by the ticket holder. An offline approval is provisional until synced. A client-reported scan timestamp is telemetry, not proof of when entry occurred. Do not describe this feature as screenshot-proof or as a hard real-time occupancy counter.

For each device run, record app version/commit, OS version, event status, gate, online/offline transition, expected result, observed result, and sync outcome. Use test identities and redact QR images, tokens, and student details from evidence.

## PostgreSQL and concurrency validation

Use a dedicated non-production PostgreSQL/Supabase project or other isolated PostgreSQL environment. Do not run this exercise against production or the shared team database. Apply the branch migrations using the team's normal deployment process before testing.

The specific concurrency property to check is idempotent deactivation. Send two simultaneous requests to deactivate the same active test staff account. Because the service locks the row and checks its current value inside a transaction, both responses should show inactive, but only one effective state-change activity record should be written. Confirm the staff token is revoked and login is blocked afterward. Repeat with activation if needed; it should not restore old tokens.

Capture the database type/version, migration result, request timestamps, response status/body with tokens redacted, final account status, and count of matching activity records. If the result differs, file it with those details and the commit SHA. SQLite feature tests are not a substitute for this PostgreSQL check.

## Automated checks for follow-up changes

Run these from the relevant application directories after modifying the corresponding code:

```bash
cd backend
php artisan test --compact tests/Feature/MobilePasswordRecoveryTest.php
php artisan test --compact tests/Feature/StaffAccountLifecycleTest.php
```

```bash
cd security-scanner
npm test
npx tsc --noEmit
npx expo lint
```

```bash
cd admin-web
npm run build
```

For a full backend regression pass, run `php artisan test --compact` from `backend/`. Follow the repository testing rules for additional tests; cover permission denial, validation failures, successful behavior, and the relevant retry or concurrency path when changing these flows.

## Handoff record

For each environment/device check, add a short result to the PR or the team's approved issue tracker:

| Check | Owner | Environment/device | Result and evidence | Follow-up issue |
| --- | --- | --- | --- | --- |
| Reset email delivered and token lifecycle verified |  |  |  |  |
| Admin activation/deactivation verified |  |  |  |  |
| Offline scan and later sync verified |  |  |  |  |
| Two-scanner replay/collision behavior observed |  |  |  |  |
| PostgreSQL idempotent concurrent deactivation verified |  |  |  |  |

Do not mark a check complete based only on a passing SQLite test or a successful dashboard/API response while online. Record actual mail, device, or PostgreSQL evidence separately.
