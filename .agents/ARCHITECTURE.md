# EUEvent System Architecture

## 1. System components

```text
Administrator web app ──┐
Student mobile app ──────┼── Laravel versioned API ── PostgreSQL
Security scanner app ───┘          │
                                    └── Mail transport (password recovery)
```

The repository currently has three client experiences: a React/TypeScript desktop dashboard, a student ticket experience, and a security scanner built with Expo/React Native. Laravel owns durable accounts, events, gates, ticket state, scan reconciliation, and audit/activity records. The mobile clients can hold encrypted local data and work from a cached scanner manifest during a network outage.

## 2. Backend (Laravel)

- **HTTP layer:** Versioned API routes, authentication, role middleware, FormRequests, and API Resources.
- **Models and database:** Eloquent models backed by PostgreSQL. Migrations define users, venues/events/gates, tickets, scan logs, and audit/activity logs.
- **Services:** Ticket issuance and revocation, event configuration changes, staff gate assignment, password recovery, and scan reconciliation live in focused services.
- **Authentication:** Sanctum bearer tokens are issued to mobile and admin clients. Roles are `student`, `security_staff`, and `administrator`. Staff deactivation revokes API tokens; password reset also revokes existing tokens.
- **Reconciliation:** A batch is processed in a transaction. Event/gate/assignment and ticket rows are locked in a stable order. A unique scan ID makes retry of the same queued scan idempotent. Competing scan IDs for one ticket are recorded as a collision.
- **Email:** The password recovery endpoint sends the token through Laravel notifications and the configured mail transport. Development's log/array mailers do not deliver to a real inbox.

## 3. Administrator web app

The dashboard is a React SPA using TypeScript and a typed API client. It manages students, security staff, events, gates, ticket issuance/revocation, operational metrics, and logs. It should communicate when an account is inactive and preserve event assignments for reference; only active staff should be newly assignable.

## 4. Mobile clients

### Student ticket experience

- Authenticates with the Laravel API and retrieves only the signed-in student's tickets.
- Stores ticket secrets in secure device storage and creates a QR payload locally for the current 30-second step.
- Screenshots are replayable until that step expires; a rotating code does not prove that the code is being displayed live.

### Security scanner

- Signs in as security staff and downloads manifests only for assigned gates.
- Stores the encrypted gate manifest and pending scan queue on device. The app reports a local acceptance as provisional until synchronization is acknowledged by the server.
- Checks QR shape, ticket membership, gate, event state, local claim state, current step, and code. `ticketValidationCore.ts` builds an in-memory `Map` once per immutable manifest ticket array so repeated scans avoid linear ticket-list search.
- Queues each physical scan with a UUID `scan_id`; retry uses that same ID. Successful server acknowledgements update the local queue and claim state.
- Has no PIN/marshal override. API requests attempting an override are rejected.

## 5. Offline workflow and consistency boundary

1. Admins configure the event, issue tickets, assign gates/staff, and activate the event while online.
2. Staff sign in and download each assigned gate manifest before opening the gate.
3. Local scanning can proceed without an Internet connection using that saved snapshot.
4. The scanner uploads pending scans when it can reach the event server. Retried scan IDs receive the original server result.
5. The server locks each ticket while reconciling competing scan IDs. One claim is recorded; later distinct claims are preserved as collision/audit data for an operator to review.

This consistency boundary does not coordinate scanners that are offline at the same time. Each device can accept a ticket or screenshot from its own stale copy. Ticket/event updates and staff deactivation also cannot reach a disconnected device. Operators must use a physical exception procedure and resolve offline conflicts after sync.

## 6. Scalability considerations

- Local manifest lookup is now indexed in memory; measure the whole scan path on supported phones with realistic manifest sizes before setting a latency limit.
- The server locks the event rows as well as ticket rows. This provides conservative serialization for event mutations and scan batches, but may constrain write throughput for many scanners on one event. Benchmark on PostgreSQL with concurrent devices before optimizing lock scope.
- Do not claim global exactly-once physical admission: the system gives idempotent retry for one scan ID and detects multiple scan IDs after reconciliation.
- Record benchmarks for manifest size, local lookup p50/p95, queue volume, sync throughput, database lock wait, and collision rates. Use these measurements to set a supported event size.

## 7. Core domain records

The exact schema lives in Laravel migrations. The primary relationships are:

- `User` owns student tickets and security staff assignments; `role` and `is_active` govern account access.
- `Event` belongs to a `Venue`; `EventGate` connects an event to a venue gate.
- `Ticket` belongs to a student and event gate and carries its encrypted TOTP secret and current status.
- `ScanLog` stores the scan ID, ticket/gate/staff/device, client-reported scan time, server-received time, decision, and reason.
- `AuditLog` stores security anomalies such as gate mismatch, outdated manifest, and split-brain collision.
- `AdminActivityLog` records administrator actions such as account creation, staff activation/deactivation, and event changes.

Use migrations and model relationships as the source of truth; examples in older planning notes may not match the current schema.
