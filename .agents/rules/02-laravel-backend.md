---
trigger: always_on
---

# Rule 02: Laravel Authoritative Backend Standards

These standards ensure reliability, security, and concurrency safety on the Laravel REST API.

### 1. FormRequest Validation
* **Rule:** Never access raw `$request->all()` or unvalidated attributes in controllers or services.
* **Practice:** Create explicit `FormRequest` classes (e.g. `SyncBatchRequest`, `IssueTicketRequest`). Access input exclusively via `$request->validated()`.

### 2. Pessimistic Concurrency
* **Rule:** Always acquire row-level locks on tickets during sync reconciliation to prevent double-spending under concurrent multi-gate uploads.
* **Practice:**
  * Wrap updates inside database transactions using `DB::transaction()` and `$ticket = Ticket::where('id', $ticketId)->lockForUpdate()->first()`.
  * Sort ticket IDs ascending before locking to prevent deadlocks.
  * Verify the selected Supabase connection mode preserves transaction-scoped locks. Validate behavior with concurrent PostgreSQL connections; SQLite tests do not prove it.

### 3. Idempotent Sync Processing
* **Rule:** An opportunistic network retry must never trigger duplicate scan records or false anomaly flags.
* **Practice:**
  * Enforce `UNIQUE (scan_id)` on `scan_logs`.
  * Intercept incoming `scan_id` values: if a record exists with the same `scan_id`, acknowledge with 200 OK idempotently without creating an audit alert.

### 4. Cryptographic Seed Encryption
* **Rule:** TOTP secrets must never exist in plaintext in the database.
* **Practice:** Encrypt base32 secrets using Laravel's AES-256 cipher (`Crypt::encryptString`) before persisting, or use Eloquent encrypted casts:
  ```php
  protected $casts = [
      'totp_secret' => 'encrypted',
  ];
  ```
