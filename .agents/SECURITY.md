# EUEvent Security Notes

This file describes protections that exist in the MVP and their limits. It is not a claim of production certification.

## 1. Ticket secrets and rotating QR codes

- Ticket secrets are encrypted in PostgreSQL with Laravel encryption. The authorized student-ticket and scanner-manifest APIs return the secret only to the intended account or assigned scanner; scanner manifests are encrypted in the mobile app's local storage.
- The app generates a six-digit HMAC-SHA1 time-based code in a 30-second UTC epoch step. The QR payload is `EUEVENT1:{ticket_id}:{step}:{code}`.
- The scanner accepts only the exact current 30-second step (`ALLOWED_CLOCK_DRIFT_STEPS = 0`). Keep student and scanner device clocks set automatically. There is no grace step for device clock skew.
- A screenshot or photo copied in the current step can be accepted by a scanner whose local manifest has not already claimed that ticket. That scanner rejects another scan after its first local claim. A disconnected second scanner cannot see the claim and may also accept it until the step changes. This limits the replay interval; it does not eliminate screenshot fraud.
- Server reconciliation verifies the code for the reported step. The uploaded device timestamp is untrusted and cannot prove when a physical scan occurred. The API also uses the reported time to check the TOTP-step relationship and event window, so it must not be described as merely informational.

## 2. Offline admission limits

- Offline checks use a saved gate-specific manifest. They cannot receive later event changes, ticket revocations, staff deactivation, or other scanners' scans until the device reconnects.
- Two disconnected scanners can each accept the same unclaimed ticket from their local copies. The server serializes reconciliation with database locks, records the first processed claim, and marks a later distinct scan ID as a collision. It cannot undo a physical entry that already happened.
- A queued scan retry keeps its original UUID `scan_id`. This makes retries of the same queue item idempotent. A different scan ID for the same ticket is a possible duplicate and is audited.
- `is_override = true` is rejected by the API. No marshal PIN override is implemented. Exceptional entry must follow an event operator's documented manual procedure and be reviewed when connectivity returns.
- If an event is cancelled, rescheduled, or materially changed while scanners are disconnected, stop using stale manifests where practicable. The event lead must decide physical admission until scanners can refresh and synchronize.

## 3. Server-side reconciliation and authorization

- Sync batches run in database transactions and lock event, gate/assignment, and ticket rows in a consistent order. The first transaction to claim an issued ticket wins; later distinct claims become collision records. `server_received_at` records server ingestion time, it does not establish the true order of offline physical scans.
- Student and security staff tokens are role-scoped. Administrators manage events and accounts through administrator-only endpoints.
- Deactivating a security staff account revokes stored Sanctum tokens and blocks new logins and authenticated API access. A disconnected device may still use a cached manifest until the event operator retrieves it or connectivity returns.
- Password-reset requests return the same public response for known and unknown eligible accounts. Laravel reset tokens are single-use and expire after 60 minutes. A successful reset revokes the user's API tokens. Mail delivery still depends on a working server mail transport.
- Login and reset endpoints are rate-limited. Keep `APP_KEY`, database credentials, mail credentials, and any deployment secrets out of source control and client bundles.

## 4. Database and deployment

- PostgreSQL row locks require a direct/session-style connection that preserves transaction semantics. Verify the exact Supabase connection mode and behavior in the deployment environment before relying on lock-based reconciliation.
- Local PHP/SQLite tests validate application behavior but do not prove PostgreSQL concurrency behavior. Run a multi-connection PostgreSQL test before making scale or duplicate-prevention claims.
- A lost or compromised scanner device is an operational incident: deactivate its staff account, secure or wipe the device, and reconcile its outstanding queue if recoverable. Online token revocation cannot erase already cached data from a disconnected device.
