# EUEvent API Guide

This document records the API conventions for this project and marks which routes exist today. The detailed payload examples are in [`architecture/07-api-endpoint-contracts.md`](../architecture/07-api-endpoint-contracts.md); the route definitions are in [`backend/routes/api.php`](../backend/routes/api.php). The supplied Ingress API is not this project's endpoint contract.

## Base path and authentication

- API routes use `/api/v1`.
- JSON clients send `Accept: application/json`; JSON request bodies also send `Content-Type: application/json`.
- Protected routes use Laravel Sanctum bearer tokens and enforce roles and, where relevant, event/gate assignment on the server.
- The end-user roles are `student`, `security_staff`, and `administrator`.
- Current login uses `{ "identifier": "...", "password": "..." }`. Students use their student number; security staff and administrators use their institutional email. `device_name` is optional. Do not silently replace `identifier` with the different `email` field used by the supplied reference.
- Current login throttling is `throttle:6,1` on the route. The reference document's five-attempt policy is not active here.

## Implemented route inventory

| Method and path | Access | Implemented behavior |
| --- | --- | --- |
| `POST /api/v1/auth/login` | Public, throttled | Issues a Sanctum token and returns the user identity and role. |
| `POST /api/v1/auth/password/email` | Public, throttled | Returns the same 202 response for any email; emails a one-time reset token only to eligible student or security staff accounts. Delivery requires configured mail. |
| `POST /api/v1/auth/password/reset` | Public, throttled | Accepts email, one-time token, and confirmed new password. Successful reset revokes the user's existing API tokens. |
| `POST /api/v1/auth/logout` | Authenticated | Revokes the current token. |
| `PATCH /api/v1/auth/password` | Any active signed-in user, throttled | Changes a known password after checking the current one. Revokes every other API token for the account and keeps the token used for the request. |
| `GET /api/v1/auth/me` | Authenticated | Returns the current user identity and role. |
| `GET /api/v1/staff/gates` | Security staff | Lists only the authenticated staff member's assigned event gates with non-secret event and ticket-count metadata. Response includes `Cache-Control: private, no-store`. |
| `GET /api/v1/gates/{gateId}/manifest` | Assigned security staff | Returns the assigned gate's ticket manifest for scheduled or in-progress events. Response includes `Cache-Control: no-store`. |
| `GET /api/v1/student/tickets` | Student | Returns only the authenticated student's tickets; usable ticket secrets are restricted to scheduled/in-progress events. Response includes `Cache-Control: no-store`. |
| `POST /api/v1/sync/batch` | Security staff | Reconciles a batch of scanner records using client `scan_id` values. |
| `GET /api/v1/admin/metrics` | Administrator | Returns ticket/admission totals, gate capacity, and recent anomalies. `event_id` is an optional filter. |
| `GET /api/v1/admin/event-options` | Administrator | Returns venue gates and security staff choices for event setup. |
| `GET /api/v1/admin/events` | Administrator | Returns up to 100 events ordered by start time descending, with venue, gates, and assigned staff. |
| `POST /api/v1/admin/events` | Administrator | Creates a draft event and records configuration version 1. |
| `GET /api/v1/admin/events/{event}` | Administrator | Returns one event and its current configuration. |
| `PATCH /api/v1/admin/events/{event}` | Administrator | Updates details, schedule, or lifecycle status with a versioned change log. |
| `PUT /api/v1/admin/events/{event}/gates` | Administrator | Replaces draft assignments or adds gates/staff after scheduling while preserving existing offline scanner assignments. |
| `POST /api/v1/admin/events/{event}/tickets` | Administrator | Issues or reissues a ticket to an existing student account for a gate assigned to the event. |
| `GET /api/v1/admin/students` | Administrator | Returns a paginated student directory with optional name, email, or student-number search. |
| `POST /api/v1/admin/students` | Administrator | Creates a student account with a server-assigned student role and hashed initial password. |
| `GET /api/v1/admin/security-staff` | Administrator | Returns scanner staff accounts with active status. |
| `PATCH /api/v1/admin/security-staff/{staff}/status` | Administrator | Activates/deactivates one security staff account. Deactivation revokes server-side API tokens and writes an admin activity record. A disconnected scanner cannot receive the change until it reconnects. |
| `DELETE /api/v1/admin/security-staff/{staff}` | Administrator | Soft deletes a security staff account (see [Deleting accounts](#deleting-student-and-security-staff-accounts)). `204`; repeating it also returns `204`. |
| `DELETE /api/v1/admin/students/{student}` | Administrator | Soft deletes a student account and revokes its active tickets. `204`; repeating it also returns `204`. |
| `GET /api/v1/admin/venues` | Administrator | Lists venues with their gates. |
| `POST /api/v1/admin/venues` | Administrator | Creates a venue. `201`. |
| `PATCH /api/v1/admin/venues/{venue}` | Administrator | Updates a venue's name or location details. |
| `POST /api/v1/admin/venues/{venue}/gates` | Administrator | Adds a gate to a venue. `201`. |
| `PATCH /api/v1/admin/venues/{venue}/gates/{gate}` | Administrator | Updates a gate's code or name. |
| `GET /api/v1/admin/activity-logs` | Administrator | Returns recent account, event-change, scan-decision, and anomaly activity with filters. |

For exact response fields, inspect the matching Laravel controller and API Resource. The login response has `token` and `user`. `user` contains `id`, `student_number`, `name`, `email`, and `role`, and `GET /api/v1/auth/me` returns the same `user` object. `email` was added without renaming or removing any other field; a client talking to an older API may not receive it and must tolerate its absence. The response never contains a password, remember token, or other tokens, and it does not promise the extra `token_type`, `created_at`, or `student_id` fields shown in the reference. The metrics resource currently reports `pending_sync_estimate: null` because scanner heartbeat counts are not implemented. Clients must render this as unavailable, not zero.

## Mobile password recovery

`POST /api/v1/auth/password/email` accepts `{ "email": "..." }`. The route is limited to five requests per minute per client IP. It responds with HTTP 202 and the same message whether the account exists or is eligible. Student and Security Staff accounts receive a one-time token by mail; administrators are not eligible for this mobile flow. A working Laravel mail transport is required for real delivery.

`POST /api/v1/auth/password/reset` accepts `email`, `token`, `password`, and `password_confirmation`. Passwords must contain at least 12 characters and match. The token expires in 60 minutes and is single use. Success changes the password, rotates the remember token, deletes the user's Sanctum tokens, and returns a message to sign in again. An invalid, expired, already-used token, or ineligible account returns a generic 422 message.

## Signed-in password change

`PATCH /api/v1/auth/password` requires a Sanctum bearer token and an active student, security staff, or administrator account. It allows six requests per minute per user. The body contains `current_password`, `password`, and `password_confirmation`. The new password must have at least 12 characters and match its confirmation, the same rule as the reset flow.

A wrong current password returns 422 with the generic message `The current password is incorrect.` under `errors.current_password`. Other validation failures return the usual 422 field errors. A missing or revoked token, or an inactive account, returns 401.

On success the API stores the new password hash, rotates the remember token, deletes every other Sanctum token for the account, and records an `account_password_changed` row in `admin_activity_logs` with no password data. It keeps the token used for this request, so a scanner that holds encrypted pending scans stays signed in. The response is `{ "message": "Password updated. Other signed-in sessions were signed out." }`. Passwords are never returned or logged. A different phone whose token was revoked this way only finds out the next time it reaches the server. Its queued scans stay encrypted on that phone, and the same staff account can sync them after signing in again.

## Security staff account status

`PATCH /api/v1/admin/security-staff/{staff}/status` accepts `{ "is_active": true|false }`. Only an administrator may use it and the target must have the Security Staff role. Deactivation deletes the staff member's Sanctum tokens and records an `AdminActivityLog` action. It does not remove gate assignments or erase a disconnected phone's cached manifest. Re-activation allows a new login but does not restore deleted tokens. Deleting an account is a separate action; see [Deleting accounts](#deleting-student-and-security-staff-accounts).

## Administrator event setup contract

All routes below require a Sanctum bearer token and the `administrator` role. Responses are endpoint-specific JSON objects without a global `data` wrapper.

### `GET /api/v1/admin/event-options`

Returns `{ "venues": [{ "id", "name", "location_details", "gates": [{ "id", "code", "name" }] }], "security_staff": [{ "id", "name", "email", "is_active" }] }`. Gate IDs identify physical `venue_gates`; assignment IDs identify users whose role is exactly `security_staff`. The admin UI prevents adding inactive staff to a new assignment while retaining existing assignment details.

### Event listing and detail

- `GET /api/v1/admin/events` returns `{ "events": [Event] }`, newest event start time first, limited to 100 rows.
- `GET /api/v1/admin/events/{event}` returns one `Event`.
- An `Event` contains `id`, `venue_id`, `venue`, `name`, `description`, ISO-8601 `starts_at` and `ends_at`, `status`, `configuration_version`, and `event_gates`. Each event gate includes its physical `venue_gate_id`, code/name, optional capacity, and assigned security staff identity.

### `POST /api/v1/admin/events`

Creates an event in `draft` state at configuration version 1 and records the creation in `event_change_logs`. Request fields: `venue_id`, `name`, optional `description`, `starts_at`, and `ends_at`. The end must be later than the start. The response is the new `Event` with HTTP 201. Gate assignments are configured separately.

### `PATCH /api/v1/admin/events/{event}`

Accepts any non-empty subset of `name`, `description`, `starts_at`, `ends_at`, and `status`, plus optional `reason`. Supported transitions are `draft -> scheduled|cancelled`, `scheduled -> in_progress|postponed|cancelled`, `in_progress -> postponed|cancelled|completed`, and `postponed -> scheduled|cancelled`. `cancelled` and `completed` are terminal.

A reason is required when cancelling or postponing, when rescheduling a non-draft event, and when resuming a postponed event. Invalid transitions, terminal edits, invalid dates, or missing reasons return 422. Every actual change locks the event row, increments `configuration_version`, and writes one event change log in the same transaction. Repeating the same value does not create a new version.

### `PUT /api/v1/admin/events/{event}/gates`

The request supplies the desired gate configuration:

```json
{
  "gates": [
    { "venue_gate_id": 4, "capacity": 300, "security_staff_ids": [18, 23] }
  ],
  "reason": "Move overflow staff to the east entrance"
}
```

The gate must belong to the event venue; every staff ID must belong to a security-staff user. `capacity` may be `null` or a positive integer. The operation increments the event configuration version and records old/new gate snapshots if anything changed. In `draft`, the supplied collection replaces current gate assignments, but a gate referenced by tickets or scan history cannot be removed. After scheduling, existing gates and staff assignments cannot be removed through this endpoint because offline scanners may retain manifests; administrators can add gates or staff, and must provide a reason for a real change. Capacity cannot be reduced below admissions already synchronized. Because scanners can be offline, this value cannot account for scans still queued on devices and is not a hard real-time occupancy limit. Cancelled and completed events reject gate changes.

### Manifest availability

`GET /api/v1/gates/{gateId}/manifest` returns 409 unless the event is `scheduled` or `in_progress`. The manifest includes `gate_id`, `event_status`, `manifest_version`, `event_starts_at`, `event_ends_at`, `generated_at`, and `tickets`. The three time fields are ISO 8601 strings: the event's scheduled window and the server time when the response was built. They were added without renaming or removing any existing field. The scanner measures manifest age with its own clock from the moment it saved the download, and refuses or warns according to [ADR 014](../architecture/decisions/014-offline-manifest-freshness-policy.md). `generated_at` is stored for display and audit only; it is not used as a time source. The mobile scanner stores the entire manifest as authenticated AES-GCM ciphertext in SQLite; its 256-bit encryption key stays in SecureStore. A previously downloaded offline manifest cannot receive an immediate cancellation or postponement; local validation is provisional until reconciliation.

### Assigned gate discovery

`GET /api/v1/staff/gates` requires a Sanctum bearer token and the `security_staff` role. It returns an `assignments` array containing only gates assigned to the authenticated staff member. Each entry has `gate_id`, `gate_code`, `gate_name`, `event_id`, `event_name`, `event_status`, `starts_at`, `ends_at`, `manifest_version`, and `ticket_count` for issued or claimed tickets. The endpoint returns metadata only: it never returns ticket IDs, student numbers, QR material, or TOTP secrets. It includes assignments for events in any lifecycle state so staff can see the latest server status; only the manifest endpoint is limited to scheduled/in-progress events. If the staff member has no assignments, `assignments` is an empty array. Responses include `Cache-Control: private, no-store`.


### Student ticket wallet

`GET /api/v1/student/tickets` requires `auth:sanctum` and role `student`. It returns only tickets owned by the authenticated student, with event and gate display fields. Active TOTP secrets are present only while the event is scheduled or in progress; all other statuses return `totp_secret: null`. The response includes `Cache-Control: no-store`. On the phone, the student app saves each ticket snapshot in SecureStore and displays `EUEVENT1:<ticket_id>:<time_step>:<six_digit_code>` QR payloads; the secret itself is never encoded in the QR.

### Administrator ticket issuance

`POST /api/v1/admin/events/{event}/tickets` requires the administrator role and accepts `student_number` and `event_gate_id`. The student must already exist and the gate must be assigned to the event. The service enforces gate capacity, rejects duplicate active tickets, and permits reissue of a revoked ticket with a new secret. It increments the event configuration version and records a change log. Its 201 response contains ticket identity/status and the new configuration version, but no TOTP secret.

### Scanner sync proof and outcomes

Each `POST /api/v1/sync/batch` record contains `scan_id`, `ticket_id`, `gate_id`, `scanned_at`, `is_override`, optional `event_configuration_version`, `code_step`, and `code`. Laravel recomputes the six-digit HMAC-SHA1 code against the encrypted ticket secret and checks that the reported step is within one 30-second step of the client-provided scan time. That timestamp is untrusted and cannot prove when an offline scan physically occurred. The local scanner accepts only the exact current step (`drift = 0`). The one-time code is never written to scan logs. Requests with a true `is_override` are rejected because manual overrides are not implemented. Responses contain `acknowledged_scan_ids` and one `outcomes` entry per scan with `decision` (`accepted` or `rejected`) and `reason_code`; identical retries return their original decision.

The client encrypts queued records in SQLite, sends at most 50 per request, and erases each local code proof after the server acknowledges it. A valid offline scan remains provisional until this response arrives. Reconciliation rejects scans for cancelled/postponed events and can accept scans uploaded after an event is completed only when the device-reported scan time falls within the event schedule.

## Routes still to design

The current backend does **not** yet expose the full product API. Historical audit export/cursor pagination, and scanner heartbeat/pending-sync telemetry remain planned. The current activity endpoint is limited to the newest 100 matching records. Do not present the future capabilities as implemented. Do not copy the reference's `registrations`, `access_points`, `/me/tickets`, or `/staff/events/.../admissions` names without a deliberate schema and ADR review.


## Deleting student and security staff accounts

Both routes require a Sanctum bearer token and the `administrator` role. They soft delete the account ([ADR 015](../architecture/decisions/015-soft-delete-for-accounts.md), status Proposed).

`DELETE /api/v1/admin/security-staff/{staff}` and `DELETE /api/v1/admin/students/{student}` take no body and return `204 No Content`.

In one transaction the server deletes the account's Sanctum tokens and any pending password-reset token for its email, sets `deleted_at`, and writes one activity entry (`security_staff_deleted` or `student_deleted`). The account disappears from `GET /api/v1/admin/security-staff`, `GET /api/v1/admin/students` and the staff choices in `GET /api/v1/admin/event-options`, and can no longer sign in, use an old token, or receive or use a password reset.

- **Staff:** gate assignments are not removed, because phones may hold offline manifests. A deleted staff member keeps existing assignments, and a gate configuration may include them unchanged, but a deleted account cannot be newly assigned (`422`). Scan logs and assignments still show the person's name.
- **Students:** every `issued` or `claimed` ticket is revoked through the same service as the manual revoke endpoint, with the reason "Student account deleted by an administrator." Each revocation raises the event's configuration version and writes an event change log entry. Tickets and scan logs are never deleted; the ticket roster still shows the student's name and student number.
- **Repeat requests:** deleting an already deleted account returns `204` and changes nothing, so it writes no second activity entry and revokes nothing again.
- **Errors:** `401` no valid token; `403` not an administrator; `404` the id does not exist or belongs to the wrong role (a student id on the staff route, a staff or administrator id on the student route).
- **Reuse:** the deleted account keeps its real email and student number. Uniqueness only applies to accounts that are not deleted, so a new account can register the same email or student number.
- **Offline limit:** a scanner that is offline keeps its saved ticket list until it reconnects, and a deleted student's phone can keep showing a pass it already saved.

## Administrator venues and gates

All routes require a Sanctum bearer token and the `administrator` role. Venues and gates can be created and edited, never deleted. Ids never change and gates are never removed, because events, tickets and offline scanner manifests refer to `venue_gates` by id. Each create or update that changes something writes an activity entry (`venue_created`, `venue_updated`, `venue_gate_created`, `venue_gate_updated`). An update that changes nothing writes none. Venues appear in `GET /api/v1/admin/event-options` as soon as they are created.

| Method and path | Request body | Success response |
| --- | --- | --- |
| `GET /api/v1/admin/venues` | none | `200` `{ "venues": [{ "id", "name", "location_details", "gates": [{ "id", "code", "name" }] }] }`, ordered by name |
| `POST /api/v1/admin/venues` | `{ "name", "location_details" }` | `201` the venue: `{ "id", "name", "location_details", "gates": [] }` |
| `PATCH /api/v1/admin/venues/{venue}` | `{ "name"?, "location_details"? }`, at least one field | `200` the updated venue with its gates |
| `POST /api/v1/admin/venues/{venue}/gates` | `{ "code", "name" }` | `201` the gate: `{ "id", "code", "name" }` |
| `PATCH /api/v1/admin/venues/{venue}/gates/{gate}` | `{ "code"?, "name"? }`, at least one field | `200` the updated gate |

- **Validation (`422`, Laravel `message` and `errors`):**
  - A venue `name` is required, up to 150 characters, and unique ignoring case. `location_details` is optional and up to 500 characters; an empty string is stored as `null`.
  - A gate `code` is required, up to 32 characters, and unique within its venue ignoring case. A gate `name` is required and up to 120 characters.
  - An update with none of its fields returns `422`.
  - Text is trimmed before validation.
- **Other errors:** `401`, `403`, and `404` for an unknown venue. `PATCH .../gates/{gate}` returns `404` when the gate belongs to a different venue.
- **Not available:** `DELETE` on a venue or gate. The server answers `404` or `405`.
- **Concurrency:** gate creation and updates lock the venue row, so two requests for the same code serialize and the existing `unique(venue_id, code)` index backs the check. Venue names are validated only; there is no unique index, so two simultaneous requests for the same new name could both succeed.

## Rules for new endpoints

1. **Document before wiring a screen.** Record method, path, role, assignment scope, request fields, response fields, status codes, and retry/cache behavior in the endpoint contract.
2. **Keep validation and business rules server-side.** Use a Form Request for new request validation. Controllers stay thin; transaction, capacity, state-transition, and reconciliation rules belong in services.
3. **Preserve established payload shapes.** Existing endpoints return endpoint-specific JSON objects. Do not add a global `{ "data": ... }` wrapper or rename fields as cleanup without a versioned migration plan for every client.
4. **Return precise domain outcomes.** Use ordinary HTTP status codes and stable machine-readable outcomes for scan/sync results. Distinguish an identical idempotent retry from a new scan of an already admitted ticket and from a conflicting reuse of a scan ID.
5. **Make retry safety explicit.** Sync clients persist one UUID v4 `scan_id` per optical scan and resend that same ID after timeouts. The database uniqueness constraint and reconciliation service are authoritative.
6. **Protect event changes and admissions.** Use the existing database locking/transaction rules. Keep event lifecycle changes, gate assignment changes, ticket changes, and admissions in the same server-authoritative state model; document lock ordering for new concurrent writes.
7. **Minimize sensitive data.** Include only fields the caller needs. Never log bearer tokens, TOTP seeds, QR payloads, passwords, or full manifest responses. Only assigned gate staff may download their gate manifest.
8. **Choose caching per resource.** Sensitive ticket or manifest responses must not pass through shared caches. Use explicit `Cache-Control: no-store` for secret-bearing responses.
9. **Keep clients honest.** Screens render the server's status and timestamps; client-side role checks are navigation only. Offline scanner acceptance is provisional until the sync reconciliation completes.
10. **Test the contract.** New routes need feature coverage for role denial, validation, success, and the relevant failure/retry/concurrency paths, consistent with [the testing rule](../.agents/rules/04-testing.md) when available to the project team.

## Error behavior

- `401`: no valid authenticated user/token.
- `403`: authenticated user lacks the required role or assignment.
- `404`: requested resource is unavailable or outside the caller's resource scope, according to the route's privacy policy.
- `409`: conflicting use of an idempotency key or another concurrent state conflict.
- `422`: invalid input or a domain rule blocks the operation.
- `429`: route throttle limit reached.

Validation errors use Laravel's JSON `message` and `errors` fields. For scanner outcomes, clients should also receive and branch on a stable domain outcome; display copy may change without changing that outcome. Do not claim every listed status is already emitted by every current route: inspect the current controller/service before implementing a client branch.

## Contract review checklist

Before merging a new API change, verify that the route's role and resource scope are enforced in Laravel; the response does not expose unrelated student data or secrets; retries cannot double-apply a scan; and the route is listed as implemented here only after its code exists. Never commit `.env` files, Supabase keys, mobile secrets, or production tokens.

## Administrator student accounts and activity

`GET /api/v1/admin/students` accepts optional `search`, `page`, and `per_page` query parameters. `per_page` is capped at 100. The response contains `students` with `id`, `name`, `email`, `student_number`, and `created_at`, plus pagination metadata (`current_page`, `per_page`, `last_page`, `total`). Search matches name, institutional email, or student number. Only student-role accounts are returned.

`POST /api/v1/admin/students` accepts `name`, `email`, `student_number`, `password`, and `password_confirmation`; the role is fixed to `student` by Laravel. Email is lowercased, identifiers are unique, and passwords must be at least 12 characters. Account creation and its activity record share one transaction. The 201 response contains the student resource only; the password is never returned or logged. Administrators must deliver the initial password through an approved private channel.

`GET /api/v1/admin/activity-logs` accepts `type` (`all`, `account`, `event_change`, `scan`, or `anomaly`), `event_id`, inclusive `from`/`to` dates, and `limit` (default 50, maximum 100). It returns `entries`, `has_more`, and the effective `limit`. Entries include source-prefixed `id`, type/action/outcome, event and actor summaries, a subject label, optional detail, and server-side `occurred_at`. Account provisioning entries have no event association. The feed omits credentials, TOTP material, QR proofs, ticket IDs, and device identifiers.
