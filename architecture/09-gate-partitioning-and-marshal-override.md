# 09 - Gate Partitioning & Marshal Override Architecture

> **Status:** Historical design reference. The PIN override described here is superseded and is not implemented. For current behavior, see [the current architecture](../docs/architecture.md), [API guide](../docs/api.md), and [manual exception decision](decisions/013-manual-exception-procedure-without-pin-override.md).

## 1. Overview
In a multi-gate offline university environment, attendees attempting to enter through unassigned gates or physical crowd bottlenecks present severe operational risks. This document specifies the gate segregation logic, cross-gate rejection rules, and the Marshal Override PIN fail-safe.

---

## 2. Gate Partitioning Model

```
                       [ Venue Access Boundaries ]
                                    │
           ┌────────────────────────┼────────────────────────┐
           ▼                        ▼                        ▼
      [ Gate 1 ]               [ Gate 2 ]               [ Gate 3 ]
   (Main Entrance)          (Gymnasium Gate)         (Sports Complex)
          │                        │                        │
  local_manifest           local_manifest           local_manifest
  WHERE gate_id = 1        WHERE gate_id = 2        WHERE gate_id = 3
```

1. **Pre-Assignment:** Tickets are bound to an integer `gate_id` upon issuance based on ticket category, venue section, or student department.
2. **Scanner Partitioning:** Mobile scanners download only the manifest rows matching their assigned `gate_id`.
3. **Cross-Gate Defense:** If a student ticket assigned to Gate 1 is presented at Gate 2:
   - If Gate 2 does not have the ticket in `local_manifest`, scanner flags `UNKNOWN_TICKET`.
   - If a multi-gate manifest is deployed and ticket has `gate_id != scanner.gate_id`, scanner displays high-contrast yellow badge: `GATE_MISMATCH`.

---

## 3. Current exceptional-admission procedure

The historical PIN workflow above was rejected. There is no in-app marshal override and the API rejects requests that set `is_override = true`. Security staff contact the event lead and follow the [manual exception procedure](../docs/event-day-runbook.md#manual-exception-procedure). Record the physical decision through the event's agreed procedure and review it after connectivity returns; do not represent it as a software-approved admission.

The gate mismatch and assigned-manifest rules remain in force. If a ticket is missing, belongs to another gate, or its current state is uncertain while offline, refer the decision to the event lead rather than bypassing the scanner.
