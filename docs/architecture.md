# EUEvent Architecture Guide

This is the entry point for the EUEvent architecture. The detailed files in [`architecture/`](../architecture/) include historical proposals and are not a claim that every described capability is shipped. For current behavior, check this guide, [`api.md`](api.md), the `.agents` security notes, and the source/tests. The supplied Ingress documents were reference material from a different design and do not replace our requirements.

## Product roles and clients

| End user | Client | Main responsibility |
| --- | --- | --- |
| Student | Mobile app | Display a securely stored, rotating digital ticket for venue entry. |
| Security Staff | Offline mobile scanner app | Validate student tickets at the door and manage physical access, including while disconnected. |
| Administrator | Desktop web dashboard | Set up events, manage gate assignments, and monitor system logs. |

These are the only portal roles: `student`, `security_staff`, and `administrator`. Gate or event assignment is scoped access for security staff; it does not create another end-user role.

## System boundaries

```text
Student mobile app ── ticket/auth API ─┐
                                       │
Offline scanner ── manifest + sync API ├── Laravel API ── Supabase PostgreSQL
                                       │
Admin web dashboard ── admin API ──────┘
```

- **Laravel** owns user identity, event and venue configuration, gate assignments, issued ticket records, audit history, and reconciliation of scanner batches.
- **Supabase PostgreSQL** is the shared server database for normal development and hosted use. Migrations in `backend/database/migrations` define its schema. Credentials and service keys stay in local environment files and the hosted secret store.
- **Local presentation PostgreSQL** is an isolated alternative for demonstrations on Fedora. It runs in Lerd's PostgreSQL service, uses the ignored `backend/.env.demo` environment, and is reachable by phones on the same Wi-Fi through the Laravel API. It does not replicate with Supabase; the demo has its own accounts and tickets. Setup and run instructions are in [the backend README](../backend/README.md#local-presentation-mode).
- **Admin web** is a React + TypeScript desktop client. It renders server data and sends administrator actions through the versioned API. The server remains responsible for authorization and business rules.
- **Student mobile** renders the student's own ticket. The QR token rotates every 30 seconds using the ticket's TOTP seed. A screenshot can still be replayed during its active 30-second step; rotation limits the replay window but does not prove a live display.
- **Security scanner mobile** signs in, downloads only its assigned gate's manifest, validates rotating tokens against its own clock, encrypts the manifest and pending scans before storing them locally, and syncs batches when connectivity returns. These flows are implemented in the Expo scanner services and screens.

## Offline admission and reconciliation

The scanner is allowed to validate against its preloaded manifest while offline; rejecting every scan whenever the server is unreachable would remove a core product requirement. Each scanner can only know its own local scan history while disconnected. Two disconnected gates can therefore accept the same ticket before either syncs. The server detects the conflict during reconciliation, records the anomaly, and preserves the evidence for review. The UI must not claim that offline admission prevents cross-gate replay in real time.

The scanner checks the exact current 30-second TOTP step; it currently has no clock-drift grace step, so student and scanner clocks should use automatic time. A `scan_id` is minted once per optical scan and reused on retries so a dropped acknowledgement does not create a second server record. Distinct offline scans of one ticket can both be locally accepted and become a collision only after sync. The first server transaction to claim the ticket is retained; server-received time does not reveal which offline scan happened physically first. See [TOTP and offline sync](../architecture/08-cryptographic-and-offline-sync-engine.md), [gate partitioning](../architecture/09-gate-partitioning-and-marshal-override.md), and [sync service code](../backend/app/Services/Sync/SyncScanProcessor.php).

## MVC responsibilities

- **Model/data layer:** Eloquent models and migrations represent persistent server state; Expo SQLite represents the scanner's offline manifest and pending queue.
- **Controller/API layer:** Laravel controllers handle HTTP input and responses. New request validation belongs in Form Requests. Domain services own transaction, scan reconciliation, TOTP, and authorization-sensitive business rules.
- **View/client layer:** React pages and React Native screens compose UI. Client hooks coordinate state; API, cryptographic, secure-storage, camera, and SQLite work stays in services or hooks rather than screen markup.

Do not move admission, capacity, assignment, or authorization rules into a view. Do not add microservices, WebSockets, or a second database without a measured requirement and an accepted ADR.

## Security boundaries

- The API checks role and resource assignment on every protected request. Hiding a button in a client is not authorization.
- Ticket QR data contains no student name, email, or student number.
- A TOTP seed is a secret. Never print it, the QR payload, bearer tokens, or `.env` values to logs, screenshots, analytics, or commits.
- Gate manifests are restricted to assigned security staff and must not be cached by shared HTTP caches.
- Mobile bearer tokens and cryptographic material use protected device storage.
- Scanner manifests and pending scan payloads are encrypted with AES-256-GCM before SQLite persistence; their encryption keys stay in Expo SecureStore. See [ADR 010](../architecture/decisions/010-encrypted-offline-ticket-and-scan-storage.md).
- Never enable predictable demo credentials by default. If demo accounts are added, gate them behind an explicit opt-in that cannot be enabled in production.

## Implementation status and scope

The team considers the agreed MVP implementation complete across all three clients. The shipped paths include administrator event, gate, staff, student, ticket, and activity management; a student wallet with a rotating QR; and assigned-gate scanner manifests, offline validation, encrypted local queueing, retry-safe synchronization, and server reconciliation. See [system status](../.agents/PHASES.md) for the completion summary and the remaining venue-readiness evidence.

Accepted limits remain part of the product behavior: screenshots from the current TOTP step can be replayed within that step; disconnected scanners cannot coordinate or receive server changes; and offline scan success stays provisional until reconciliation. The system detects some conflicts after reconnect but cannot reverse a physical admission.

Payments, general-purpose RBAC, cloud-to-edge replication, and service decomposition are outside the agreed scope. Do not describe them as unfinished MVP features unless an updated requirement adds them.

## How to read the specifications

- [`api.md`](api.md) is the endpoint inventory and API authoring guide.
- [`design-decisions.md`](design-decisions.md) records accepted choices, UI guidance, and how to add an ADR.
- [`architecture/`](../architecture/) holds detailed schemas, workflows, endpoint examples, and domain decisions.
- Code and migrations show current behavior. The numbered files in [`architecture/`](../architecture/) are historical design references where labeled; verify them against this guide, the API contract, and current source before presenting a detail as live behavior.
