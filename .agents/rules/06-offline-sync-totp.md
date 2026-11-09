---
trigger: always_on
---

# Rule 06: Offline Tickets, TOTP, and Sync

## 1. QR format and replay window

- Ticket QR data uses `EUEVENT1:{ticket_id}:{step}:{six_digit_code}`.
- The code is derived from the ticket secret with a 30-second RFC 6238/HMAC-SHA1 time step.
- The scanner currently accepts only the exact current step (`ALLOWED_CLOCK_DRIFT_STEPS = 0`). Do not document a `w = 1` drift allowance unless implementation and tests change together.
- A screenshot remains valid for the rest of its active step. It becomes stale when that step expires; the design does not guarantee screenshot-proof admission.
- Since the scanner has no clock-drift grace step, supported phones should use automatic network time. Test both sides of a 30-second boundary.

## 2. Gate manifests and offline behavior

- The scanner must authenticate and download its assigned gate manifest before the event. It encrypts the saved snapshot locally and can validate against it without server connectivity.
- Local acceptance means the ticket matches the saved snapshot; it is provisional until server synchronization.
- A disconnected scanner cannot see later ticket revocations, event changes, staff account deactivation, or other devices' scans. Two disconnected scanners can both locally accept the same ticket or an in-window screenshot.
- Do not present offline validation as global single-use enforcement. The event lead needs a physical exception and conflict-resolution procedure.
- The API rejects manual override requests. Do not add or describe a marshal PIN override as an available feature.

## 3. Queue and server reconciliation

- Generate one UUID `scan_id` for each physical scan and persist it with the queue record. A retry must use the original ID.
- Upload pending scans in batches of 50 when the scanner can reach the server. The scanner retries sync while the gate scan view is active and also attempts sync when opening scanner home.
- Mark a queue item synchronized only after validating the server's acknowledgement and outcome for every scan in that batch.
- The server uses database transactions and row locks to serialize competing ticket claims. The first processed claim is retained; a later distinct scan ID is stored as a collision for review. Server ingestion time cannot reconstruct which disconnected scanner physically scanned first.
- `scanned_at` is untrusted client data. It is stored for audit and currently participates in server checks for the reported TOTP step and event time window; do not describe it as proof of physical scan time.
