# ADR 015: Soft Delete for Student and Security Staff Accounts

## Status
Proposed. The behavior is implemented; the team has not yet approved it.

## Date
2026-11-12

## Context
Administrators need to remove accounts that should no longer exist: a student who left, or a staff member who no longer works events. The only control until now was deactivating staff, which is reversible and does not apply to students at all.

Accounts are referenced by history the project must keep. Tickets belong to students. Scan logs, audit logs and gate assignments point at the staff member who scanned. Event change logs and the administrator activity log name the people involved. `tickets`, `scan_logs`, and `event_gate_staff_assignments` all hold foreign keys to `users` that restrict deletion. Gate assignments cannot be removed after an event is scheduled, because phones may hold offline manifests ([ADR 014](014-offline-manifest-freshness-policy.md)).

Deleting an account must also stop it working: no sign-in, no API access with an old token, and no password reset.

## Decision
Accounts are soft deleted through `DELETE /api/v1/admin/security-staff/{staff}` and `DELETE /api/v1/admin/students/{student}`. The `users` table gains a `deleted_at` column and the `User` model uses Laravel `SoftDeletes`.

In one transaction a delete:

1. Deletes the account's Sanctum tokens and any pending password-reset token for its email.
2. Sets `deleted_at`.
3. For a student, revokes every issued or claimed ticket through `AdminEventTicketRevocationService` with the reason "Student account deleted by an administrator.". Each revocation raises the event's configuration version and writes an event change log entry, exactly like a manual revocation.
4. Writes one `admin_activity_logs` entry (`security_staff_deleted` or `student_deleted`).

Repeating a delete of an already deleted account returns `204` and changes nothing: no second activity entry and no second revocation. A missing id, or an account with the wrong role, returns `404`.

**Name, email and student number are not changed on delete.** The unique indexes on `users.email` and `users.student_number` are replaced with partial unique indexes that only cover rows where `deleted_at IS NULL`, and the create requests ignore deleted rows when checking uniqueness. A deleted email or student number can therefore be registered again as a new account, while the deleted row keeps its real values so history stays readable. Partial indexes are supported by PostgreSQL and SQLite.

**History keeps resolving deleted users.** Relations used to display history use `withTrashed()` (`Ticket::user`, `ScanLog::scannedBy`, `AuditLog::scannedBy`, `EventGateStaffAssignment::user`, `EventChangeLog::actor`, `AdminActivityLog::actor`), and the activity log queries join `users` directly. Lists of current accounts, event-option staff choices, sign-in, token resolution and password reset use the default scope, so deleted accounts do not appear there.

**Assignments are never removed.** A deleted staff member keeps existing gate assignments. Saving a gate configuration may include them unchanged, but a deleted account cannot be newly assigned.

## Alternatives Considered

### Hard delete
- **Pros:** Simple; nothing to filter.
- **Cons:** Foreign keys restrict it. Cascading would destroy tickets, scan logs and audit records, and scan history must be kept.
- **Why not:** It loses the evidence the system exists to keep.

### Anonymise the row (blank the name and email)
- **Pros:** Frees the email and removes personal data.
- **Cons:** A scan log or assignment would show an empty person, which defeats the audit. Deciding what must be kept versus erased is a retention policy the project has not set.
- **Why not:** It destroys the readable history that this decision protects. It can be added later as a separate retention step on top of soft delete.

### Rename the email and student number on delete (for example `deleted+7-guard@...`)
- **Pros:** Keeps the existing full unique indexes.
- **Cons:** The email column is 255 characters, so a long original plus a prefix can overflow. The real email is lost from the row, and any code that matches by email must know the convention.
- **Why not:** Partial unique indexes give the same reuse without changing stored data.

### A status flag only (extend deactivation)
- **Pros:** Already exists for staff.
- **Cons:** Does not exist for students, and a deactivated account still occupies its email, still appears in lists and can be reactivated.
- **Why not:** The need is a removal that frees the identity, not a pause.

## Consequences

- **Positive:** Deleted accounts cannot sign in, use an old token, or reset a password. History keeps real names. Emails and student numbers can be registered again.
- **Positive:** A deleted student's tickets stop reaching scanners that refresh their manifest, because revoked tickets are not in a manifest.
- **Negative:** Every query that should show only current accounts relies on the soft delete scope. New code that joins `users` directly must decide whether deleted rows belong.
- **Operational:** Use Deactivate for a lost phone or a temporary pause. Delete is for an account that should not come back. See the [event-day runbook](../../docs/event-day-runbook.md#lost-or-stolen-scanner-phone-or-replacing-a-staff-member).
- **Testing:** The feature tests run on in-memory SQLite. The partial indexes, row locks and lock ordering have not been exercised on PostgreSQL.

## Limits
- **A phone that is offline keeps its saved ticket list until it reconnects.** Deleting a staff member deletes their server tokens, but a scanner with a downloaded manifest and queued scans can keep scanning locally. The queued scans can only sync after a new sign-in, which a deleted account cannot do, so scans still on that phone are not recoverable by that account. The manifest freshness rule ([ADR 014](014-offline-manifest-freshness-policy.md)) eventually stops the phone from admitting.
- **A deleted student's phone can keep showing a pass it already saved.** Revocation reaches scanners only when they next download a manifest, and a sync cannot undo an admission that already happened.
- **Historical personal data remains.** Soft delete is not erasure. A retention or erasure policy for student data is separate work.
- **Venue names** are validated as unique ignoring case. There is no database index for that, so two requests at the same moment could both succeed.
