# 04 - Mobile Scanner Replica Architecture (React Native Expo)

> **Status:** Historical design reference. Some behavior below is planned or superseded. For current behavior, see [the current architecture](../docs/architecture.md), [API guide](../docs/api.md), and [security notes](../.agents/SECURITY.md); source code and tests are authoritative.

## 1. Overview
Security Staff use the Mobile Scanner application at physical venue entrances to validate student tickets and manage physical access. A prepared scanner checks a rotating TOTP token against its assigned local manifest and queues scans for synchronization. Its local decision is provisional; it cannot receive server changes or other scanners' claims while disconnected. The authenticated role is `security_staff`; a marshal PIN override is not implemented.

---

## 2. Technical Stack
* **Framework:** React Native with Expo (Managed Workflow, TypeScript).
* **Local Database:** `expo-sqlite` (chosen over native C++ SQLite bridges to avoid build compilation friction and runtime linking errors).
* **Camera Hardware Engine:** `expo-camera` with barcode scanner HUD callbacks.
* **Cryptographic Engine:** RFC 6238 TOTP. The current scanner accepts the exact current 30-second step only (`drift = 0`).

---

## 3. SQLite Client Schema & Table Lifecycles

### 3.1 `local_manifest`
Pre-populated prior to gate opening via `/api/v1/gates/{gate_id}/manifest`:
```sql
CREATE TABLE IF NOT EXISTS local_manifest (
    ticket_id INTEGER PRIMARY KEY,
    student_number TEXT NOT NULL,
    totp_secret TEXT NOT NULL,
    gate_id INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'unclaimed' -- 'unclaimed', 'claimed', 'revoked'
);
CREATE INDEX IF NOT EXISTS idx_manifest_student ON local_manifest(student_number);
```

### 3.2 `pending_sync_queue`
Local store-and-forward buffer populated at the moment of scan:
```sql
CREATE TABLE IF NOT EXISTS pending_sync_queue (
    scan_id TEXT PRIMARY KEY, -- Client-generated UUID v4
    ticket_id INTEGER NOT NULL,
    gate_id INTEGER NOT NULL,
    device_id TEXT NOT NULL,
    scanned_at INTEGER NOT NULL, -- Epoch milliseconds
    is_override BOOLEAN DEFAULT 0,
    synced BOOLEAN DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_pending_synced ON pending_sync_queue(synced);
```

---

## 4. Verification Workflow

```
[ Optical Capture of Barcode: MSEUF:{ticket_id}:{token} ]
                     │
                     ▼
[ Lookup ticket in SQLite local_manifest ]
   ├── Not Found ───────────────────────────────> Reject: INVALID_TICKET
   ├── Gate Mismatch & No Override ─────────────> Reject: GATE_MISMATCH
   ├── status == 'claimed' ─────────────────────> Reject: ALREADY_CLAIMED
   └── status == 'unclaimed' ───────────────────> Proceed to TOTP Check
                     │
                     ▼
[ Evaluate token with otpauth using Scanner Clock (Trust Anchor) ]
   ├── Token Expired / Invalid ─────────────────> Reject: TOKEN_EXPIRED
   └── Token Valid (within w = 1)
                     │
                     ▼
[ Atomic SQLite Transaction ]
   1. UPDATE local_manifest SET status = 'claimed' WHERE ticket_id = ?
   2. INSERT INTO pending_sync_queue (scan_id, ticket_id, ...) VALUES (UUIDv4(), ...)
   3. Trigger Audio/Visual Success Feedback on Scanner HUD
```

---

## 5. Exceptional physical admission

There is no in-app marshal PIN override. The API rejects `is_override = true`. During an outage, an event lead follows the [manual exception procedure](../docs/event-day-runbook.md#manual-exception-procedure) and reviews the decision after connectivity returns. A manual physical admission is not represented as a server-confirmed software approval.
