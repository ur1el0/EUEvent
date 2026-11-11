# ADR 014: Offline Manifest Freshness Policy

## Status
Proposed. The rule is implemented, but its thresholds are pending team approval.

## Date
2026-11-10

## Context
A scanner downloads an encrypted gate manifest while online and validates QR codes against it while offline. Before this decision the scanner trusted a saved manifest indefinitely. The manifest held no event time window, so a phone could keep admitting from it days after the event, and staff saw no warning that their copy might be stale.

An offline phone cannot learn about later server changes. If an administrator cancels or reschedules the event, revokes a ticket, deactivates a staff account, or another gate admits the ticket, the phone keeps using what it downloaded. The age of the saved copy is the only freshness signal the phone has.

[ADR 003](003-scanner-hardware-clock-as-trust-anchor.md) makes the scanner's own clock the trust anchor for QR validation. [ADR 012](012-current-step-totp-and-replay-boundary.md) replaced its drift allowance but kept that anchor. This policy uses the same clock and adds no network time source.

## Decision
The manifest response gains three additive fields: `event_starts_at`, `event_ends_at` (the event's scheduled window), and `generated_at` (server time when the response was built). All three are ISO 8601 strings. The scanner stores them inside the encrypted snapshot together with its own `downloadedAt`, the phone clock time when it saved the download.

Before each local admission decision, `security-scanner/src/services/manifestFreshness.ts` applies one rule using the phone clock. All thresholds are named constants in that file.

| Outcome | Condition | Scanner behavior |
| --- | --- | --- |
| Refuse | The manifest was downloaded more than `MAX_MANIFEST_AGE_HOURS` ago. | Does not admit. Tells staff to refresh the manifest while connected or ask the event lead. |
| Refuse | Phone time is later than `event_ends_at` plus `POST_EVENT_GRACE_MINUTES`. | Same as above. |
| Refuse | `downloadedAt` cannot be read, or lies more than `CLOCK_ROLLBACK_TOLERANCE_MINUTES` in the future, which means the phone clock was moved back. | Same as above, and also tells staff to set automatic date and time. |
| Warn | The manifest was downloaded more than `STALE_WARNING_HOURS` ago. | Scanning continues. Shows "Manifest may be outdated, refresh when connected". |
| Warn | The manifest has no readable `event_ends_at`, for example a copy saved by an older app version. | Scanning continues, but the copy is always treated as stale. The maximum-age refusal still applies. |
| Fresh | None of the above. | Normal validation. |

Refusal conditions are checked first. The warning banner is re-evaluated every minute while the gate scanner is open, and the refusal check runs again on every scan.

### Proposed thresholds (pending team approval)

| Constant | Proposed value | Reasoning |
| --- | --- | --- |
| `STALE_WARNING_HOURS` | 6 | A morning download is still trusted for an afternoon event, but staff are prompted to refresh during a long day. |
| `MAX_MANIFEST_AGE_HOURS` | 24 | Requires a fresh download for each event day. A manifest from a lost or retired phone stops admitting within one day. |
| `POST_EVENT_GRACE_MINUTES` | 60 | Covers late arrivals and an overrun. After that the phone stops admitting even if the event was never closed on the server. |
| `CLOCK_ROLLBACK_TOLERANCE_MINUTES` | 5 | Allows a small automatic clock correction without accepting a deliberate rollback that would hide manifest age. |

Changing a value means changing the constant, its unit test, this ADR, and the [event-day runbook](../../docs/event-day-runbook.md) together.

`generated_at` is stored for display and audit. It is not used for the age calculation, because comparing server time with the phone clock would mix two time sources and contradict ADR 003. `event_starts_at` is stored but does not block scanning, since doors can open before the scheduled start.

## Alternatives Considered

### Keep trusting manifests indefinitely
- **Pros:** No new refusals at the gate.
- **Cons:** A forgotten or recovered phone can admit from a copy that is days or weeks old.
- **Why not:** This is the gap that triggered the decision.

### Use server time or a network time check
- **Pros:** Detects a wrong phone clock.
- **Cons:** Needs connectivity at exactly the moment it is unavailable, and adds a second trust anchor.
- **Why not:** Conflicts with ADR 003. Staff set phones to automatic time before doors open instead.

### Refuse every manifest older than a few hours
- **Pros:** Smaller window for stale data.
- **Cons:** A WAN outage on a long event day would stop every gate, even when the event lead has authorized continued admission.
- **Why not:** A warning plus the event lead's decision fits the offline goal better below the 24-hour limit.

### Require an online refresh before every scan
- **Pros:** Always current.
- **Cons:** Removes offline admission.
- **Why not:** Same reason given in ADR 012.

## Consequences

- **Positive:** A saved manifest has a bounded lifetime. Staff see a visible stale warning, and a forgotten or recovered phone stops admitting after a day or an hour after the event ends.
- **Positive:** Older cached manifests keep working, and the app asks staff to refresh them.
- **Negative:** A legitimate event that runs more than an hour past its scheduled end, or a single manifest kept for more than 24 hours, requires a refresh while connected.
- **Operational:** Phones must use automatic date and time. The event lead decides whether gates keep admitting during an outage while warnings are showing. See the [event-day runbook](../../docs/event-day-runbook.md).

## Limits
- An offline phone cannot learn about a cancellation, a reschedule, a ticket revocation, or a staff deactivation until it reconnects and downloads a new manifest. The freshness rule limits how long a stale copy is used. It does not deliver changes.
- A wrong phone clock affects this rule just as it affects QR validation. The rollback check catches a clock moved back before the download time. It cannot detect a clock that was already wrong when the manifest was downloaded.
- A later sync can flag an admission as `EVENT_NOT_ACTIVE`, `TICKET_REVOKED`, `GATE_MISMATCH`, or `SPLIT_BRAIN_COLLISION`. It cannot undo a person already admitted through the gate.
- The thresholds limit exposure. They do not provide global single-use enforcement between disconnected scanners.
