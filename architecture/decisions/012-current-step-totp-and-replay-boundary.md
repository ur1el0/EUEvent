# ADR 012: Current-Step TOTP Validation and Replay Boundary

## Status
Accepted

## Date
2026-11-09

## Context
Earlier notes specified a one-step clock-drift allowance and said screenshots become unusable immediately. The scanner source and its tests instead accept the exact current 30-second step, and an image from that step can be presented again while the same scanner still considers the ticket unclaimed. Offline devices do not share current claim state.

## Decision
Document and retain the implemented behavior: the scanner accepts only the current 30-second step (`ALLOWED_CLOCK_DRIFT_STEPS = 0`) for `EUEVENT1:{ticket_id}:{step}:{code}`. A screenshot may be accepted by a scanner whose local manifest has not claimed the ticket; that scanner rejects another scan after its first local claim. Separate disconnected scanners may each locally accept it. Server reconciliation keeps the first processed claim and records a later distinct scan ID as a collision; it cannot prove physical scan order or reverse entry.

The sync API checks that the reported code step is within one step of the client-provided `scanned_at` value, but that value is untrusted telemetry and does not attest when a physical scan occurred. Keep student and scanner clocks on automatic time and treat offline approvals as provisional.

## Alternatives Considered

### Allow previous/current/next scanner time steps
- **Pros:** More tolerant of device clock skew.
- **Cons:** Extends token replay opportunity and conflicts with the current scanner implementation and test suite.
- **Why not:** Current code intentionally accepts zero drift; changing this requires a separate measured security/usability decision.

### Claim screenshot-proof tickets
- **Pros:** Simpler operator message.
- **Cons:** False: the QR format contains no live-display or holder proof, and disconnected scanners cannot coordinate a ticket claim.
- **Why not:** Keep product and training claims aligned with observed behavior.

### Require online challenge for every scan
- **Pros:** Can consult current server state for each scan.
- **Cons:** Removes the core offline admission behavior and fails during venue connectivity loss.
- **Why not:** The MVP requires local validation from a preloaded gate manifest.

## Consequences

- **Positive:** Documentation, tests, and implementation agree about current-step validation and short screenshot replay.
- **Negative:** Device clock skew may reject legitimate scans; offline duplicates remain possible.
- **Operational:** Use automatic device time, prepare current manifests, and define a physical exception and collision-review procedure.
- **Risk:** A copied QR can admit another person during its active step. The short step narrows the replay interval but is not proof of identity or liveness.
