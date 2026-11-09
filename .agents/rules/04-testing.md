---
trigger: always_on
---

# Rule 04: Testing & Quality Assurance

Add automated tests for new API behavior, business rules, and critical mobile logic. SQLite tests do not prove PostgreSQL locking behavior; use a real PostgreSQL integration test for that claim.

## Laravel backend

- Use the repository's PHPUnit feature tests with Laravel's test helpers.
- Cover role authorization, validation, state changes, retry/idempotency, revocation, and audit records for new endpoints and services.
- For offline reconciliation, test same-ID retries separately from distinct-ID duplicate claims. The latter should create a collision decision while preserving the records.
- Run focused tests with `php artisan test --compact tests/Feature/RelevantTest.php` from `backend/`.
- Run PHP formatting with `vendor/bin/pint --dirty --format agent` after backend edits.
- Use PostgreSQL multi-connection tests to evaluate lock ordering, contention, and transaction-pooler behavior. In-memory SQLite is not a substitute.

## Mobile scanner

- Keep core QR validation independently testable from camera/native UI.
- Current logic tests use Node's built-in test runner and TypeScript transpilation, not Jest:
  `node --test tests/ticketValidation.test.mjs` from `security-scanner/`.
- Cover malformed payloads, exact current-step validation, gate/event/ticket state, a screenshot replay within the same step, expiration at the next step, and repeated manifest lookup.
- Test queue persistence and acknowledgement/retry behavior separately from native UI when adding coverage.
- Before delivery, run `npx expo lint` and `npx tsc --noEmit` from `security-scanner/`.

## Web app and device validation

- Use the existing package scripts and build checks for admin-web changes.
- Test login, account recovery, event setup, and staff status changes against a local API; do not assume browser mocks prove server behavior.
- Verify camera, secure storage, app backgrounding, and offline restart on physical iOS/Android devices before describing a live demonstration as validated.
