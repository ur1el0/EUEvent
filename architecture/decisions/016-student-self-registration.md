# ADR 016: Student Self-Registration with Email Verification

## Status
Proposed. The behavior is implemented; the team has not yet approved it.

## Date
2026-11-12

## Context
Student accounts were created one at a time by an administrator, who then had to deliver an initial password through a private channel. That does not scale to a campus and puts a shared secret in an administrator's hands. Students need to create their own account on the mobile app.

Self-registration is public, so it must not reveal which emails or student numbers already have accounts ([ADR 009](009-reference-guidance-adoption.md) asks for authorization, minimal data exposure and rate limits on endpoints like this). It must also not leave unverified rows in `users`, where they would take up emails and student numbers.

Two earlier decisions shape it. [ADR 015](015-soft-delete-for-accounts.md) made email and student number uniqueness ignore deleted accounts, so a deleted student can register again. [ADR 014](014-offline-manifest-freshness-policy.md) shows the project's view that an offline phone only learns about server changes when it reconnects, which applies to a new account too: nothing about registration reaches a phone that is offline.

## Decision
A student registers in two steps, with no token issued until they sign in normally.

1. `POST /api/v1/auth/register` takes `student_number`, `name`, `email`, `password` and `password_confirmation`. The server validates the format, then stores a row in `pending_registrations` and emails a six-digit code. **No `users` row is created.** The response is the same generic `202` whether or not the email or student number already belongs to an account, and no code is sent for an existing account.
2. `POST /api/v1/auth/register/verify` takes `email` and `code`. A correct code creates the student in a transaction (role `student`, active, with the name, email, student number and hashed password from the pending row), deletes the pending row and returns `201`. Any failure returns the same `422` message.

`POST /api/v1/auth/register/resend` sends a new code for a pending registration.

**Email rule.** The email is lowercased, and the text after the last `@` must equal one of the allowed domains exactly. The defaults are `student.mseuf.edu.ph` and `mseuf.edu.ph`, set with `REGISTRATION_ALLOWED_EMAIL_DOMAINS`. This is an equality check, not "ends with", so `evilmseuf.edu.ph`, `student.mseuf.edu.ph.evil.com`, a trailing dot and a subdomain all fail.

**Student number rule.** Input is case-insensitive and stored in uppercase. It must match `^[A-Z]\d{2}-\d{5}$` (the pattern can be changed in `config/registration.php`). This is a format check only.

**Code handling.** The code is six digits and lives 15 minutes. Only an HMAC of the email and code (keyed with the application key) is stored and it is compared with `hash_equals`. A code is single use. Five wrong attempts delete the pending row. A resend creates a new code, resets the attempt count and honours a 60-second cooldown. Registering again for the same email inside the cooldown changes nothing, and after it replaces the pending row. Expired rows are removed when they are looked up and by an hourly `registrations:prune` command.

**If the email or student number is taken between the request and the verification,** verification returns the same failure as a wrong code and creates nothing.

**Rate limits.** Each endpoint is limited per client address and per email (register: 5 per minute and 20 per hour per address, 3 per hour per email; verify: 10 per minute, 60 per hour, 15 per hour per email; resend: 5 per minute, 20 per hour, 5 per hour per email).

**Audit.** A successful verification writes an `student_self_registered` activity entry with the student number and name, and the new student as the actor. It holds no secrets.

The administrator `POST /api/v1/admin/students` endpoint is kept but the dashboard no longer uses it.

## Alternatives Considered

### Accounts added only by administrators
- **Pros:** An administrator vouches for each student.
- **Cons:** Does not scale. The initial password has to be handed over, and administrators become a bottleneck.
- **Why not:** It is the problem this decision addresses. The endpoint stays for exceptional cases.

### Import a roster and let students claim their row
- **Pros:** Proves the student number belongs to a real, enrolled person.
- **Cons:** Needs a trustworthy roster file or feed and a process to keep it current, which does not exist yet.
- **Why not yet:** It is the planned next step (see Limits).

### An administrator approval queue
- **Pros:** A person checks every registration.
- **Cons:** Brings back the administrator bottleneck and the same questions about what the administrator checks against.
- **Why not:** It adds work without a source of truth to check against.

### Sync with a school identity or student information system
- **Pros:** The strongest answer: the school confirms who is enrolled.
- **Cons:** Depends on an integration and access the project does not have.
- **Why not:** Out of scope for the MVP.

## Consequences

- **Positive:** Students create their own accounts. No password travels through an administrator, no unverified account exists, and the endpoints do not reveal who is already registered.
- **Positive:** Throttles and the attempt limit make guessing a six-digit code impractical within its lifetime.
- **Negative:** The mobile app needs a registration screen, and a working mail transport is required. With the `log` mailer used in local development the code appears in `storage/logs/laravel.log`; that is acceptable for development and must never be used for real users.
- **Operational:** The scheduler (`php artisan schedule:run`) must run for the hourly cleanup. Expired rows are also ignored when looked up, so a missing scheduler does not break registration.
- **Testing:** The feature tests run on in-memory SQLite with a fake mailer. Real mail delivery, and the unique-index and locking behavior on PostgreSQL, have not been exercised.

## Limits
- **Email verification proves the person has an MSEUF mailbox, not that the student number is theirs.** The allowed domains cover student and staff addresses, so anyone with an `@mseuf.edu.ph` address, including staff, can register with any student number that matches the format and is not already taken. Someone could register a classmate's number before the classmate does. An administrator issuing a ticket sees the registered name and email next to the student number, which helps catch a mismatch, but it is not a check.
- **A roster check is the planned fix:** verify the student number and name against the enrollment list before or after the code step, and optionally require the email to match the student record.
- **The student number format is a guess about how numbers are written.** Accounts created by an administrator before this decision, and the local test student, may not match it. The format is only enforced at self-registration.
- **Not fully uniform timing.** A request for an existing account skips sending an email, so its response can be faster. The response body and status are identical.
- **A new account does not reach a phone that is offline.** Signing in needs the server.
