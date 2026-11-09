# ADR 013: Manual Exception Procedure Without a PIN Override

## Status
Accepted

## Date
2026-11-09

## Context
The older marshal-PIN proposal assumes an offline scanner can safely recognize and audit supervisor authorization. The current scanner does not implement a supervisor credential or override flow, and the API rejects override requests. Adding a shared offline PIN without a provisioning, rotation, device-compromise, and audit design would weaken the admission boundary.

## Decision
Do not implement PIN-based forced admission in the current MVP. The API continues to reject `is_override = true`. For a real exception, security staff contact the event lead and follow the event's documented physical procedure; record the decision for later reconciliation. Any future in-app override requires a separate reviewed design for scoped supervisor authority, durable audit data, offline credential lifecycle, and recovery after device loss.

## Alternatives Considered

### Ship a shared master PIN
- **Pros:** Fast path for gate mismatch or device failures.
- **Cons:** Shared secrets are hard to revoke while offline, can be copied across devices, and blur staff authority. Audit attribution may be weak.
- **Why not:** No secure per-supervisor offline authorization or key lifecycle is implemented.

### Reject every exception with no operator path
- **Pros:** Keeps the software's admission rule simple.
- **Cons:** Leaves staff without a documented response to emergencies, cancelled/rescheduled events, or gate outages.
- **Why not:** The product needs an explicit human-led operational contingency.

### Use an event-lead physical procedure
- **Pros:** Works without inventing an insecure client-side credential and keeps the decision accountable to the event operator.
- **Cons:** Requires clear event-specific training and a post-event reconciliation record.
- **Why selected:** It is the smallest safe procedure for this MVP while online and offline authorization designs remain incomplete.

## Consequences

- **Positive:** No undocumented shared PIN bypass exists; API and UI can state the real behavior.
- **Negative:** Manual exception handling can slow entry and requires staff coordination.
- **Operational:** Each event must name an event lead and prepare a way to note the ticket/student reference, gate, time, device, reason, and decision without recording secrets.
- **Risk:** Paper or verbal exceptions can be inconsistent. Review and reconcile them after the event; never treat them as automatic server-confirmed admissions.
