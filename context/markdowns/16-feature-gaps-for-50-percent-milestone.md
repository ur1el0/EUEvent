# Feature Gaps for the 30–50% Milestone

This note is a feature-focused snapshot of what is already available and what still needs a product decision or implementation for the first milestone. It excludes test execution, visual polish, deployment readiness, and defense preparation.

The target users are students, security staff, and administrators. The current codebase already has the main ticket issuance and offline scanning path, so this milestone should finish the most important account and event-operation gaps rather than expand into unrelated features.

## Features Already Implemented

### Administrators

- Create student and security-staff accounts.
- Configure venues and gates.
- Create, edit, schedule, postpone, cancel, and complete events.
- Assign event gates and security staff.
- Issue tickets, view an event's ticket roster, and revoke a ticket with a reason.
- View event metrics and administrator activity/audit records.

### Students

- Sign in to the mobile app and view tickets issued to their account.
- Generate a rotating QR code from the ticket secret stored for the mobile session.
- Hide the usable QR after the server marks a ticket as claimed.

### Security staff

- Sign in and view assigned event gates.
- Download a gate-specific ticket manifest before losing connectivity.
- Validate rotating QR codes from the local manifest while offline.
- Store accepted scans in the local encrypted queue and upload them when connectivity returns.
- Receive server reconciliation outcomes and see relevant scan/anomaly records in the admin system.

## Remaining Product Features

### 1. Password recovery and password change

Students and security staff do not currently have self-service password reset or password change flows. Accounts are provisioned by an administrator with an initial password. Add a recovery flow that verifies control of the institutional account and does not disclose whether an email address is registered.

**Milestone priority:** High. A user who forgets their password otherwise needs administrator intervention.

### 2. Staff account and assignment lifecycle

Administrators can create staff accounts and assign staff to event gates. The current API does not provide a complete staff lifecycle such as deactivate/reactivate or safely revoke access after an event is scheduled. The event-assignment service prevents removing existing gates or staff from a scheduled event because scanner phones may already hold offline manifests.

**Milestone priority:** High for real event operations. Define what an administrator does when a scanner phone is lost or a staff member must be replaced during event day. The feature must state that a disconnected phone cannot receive an immediate revocation.

### 3. Supervisor-authorized exception handling

The older product requirements mention a marshal override for exceptional admission. The current implementation deliberately rejects override requests; a scanner-side flag or PIN alone is not sufficient authorization.

Decide one of the following before treating this as a milestone requirement:

- Defer override and document the manual admission procedure for wrong-gate or exceptional cases; or
- Implement an audited supervisor authorization flow with server-controlled permissions and a deliberate offline policy.

Do not restore a client-controlled `is_override` bypass. Any supported exception must retain the actor, reason, ticket, gate, device, and time in the audit history.

### 4. Offline event-change and revocation behavior

An offline scanner uses the event status and ticket data from its saved manifest. If an administrator cancels/reschedules an event or revokes a ticket after a scanner disconnects, that scanner cannot know about the change until it reconnects and refreshes. A later sync can audit stale configuration, but it cannot undo a physical admission already made.

Define and present a clear rule for:

- How old a manifest may be before scanning is refused or requires an operator decision.
- What staff should do when an event is cancelled or rescheduled while scanners are offline.
- Whether an event can continue admitting attendees during a WAN outage, and who can authorize that decision.
- What to do if a ticket is revoked after the scanner has gone offline.

An isolated phone cannot receive a remote cancellation. If immediate coordination is required, use a reachable local event network or a human operational procedure; do not promise instant remote revocation while fully disconnected.

## Recommended 50% Milestone Boundary

The milestone is feature-complete when this core path is usable end to end:

1. An administrator creates an event, configures gates, assigns security staff, and issues a student ticket.
2. The student signs in and displays a rotating ticket QR.
3. Security staff download the assigned gate manifest, disconnect from the server, scan the QR, and receive a clear local decision.
4. The scan remains queued through app backgrounding or restart, then synchronizes after connectivity returns.
5. The administrator can see the resulting ticket state and scan/audit history.
6. The product explains its offline limits: event changes are not immediate on disconnected devices, and two independent offline scanners cannot coordinate single-use admission in real time.

Password recovery and staff access lifecycle should be the next user-facing additions. Supervisor override should be included only if the course rubric or approved requirements demand it; otherwise document it as deferred. The offline event-change policy must be explicit even if the system cannot technically push changes to an isolated phone.

## Source-of-Truth Note

The checklist in `.agents/PHASES.md` and `.agents/backlog.md` still contains old unchecked items, including features already present and the now-disabled override path. Check the current routes, services, and clients before treating those lists as current status. This local note is a planning aid, not a replacement for source code or the approved course rubric.
