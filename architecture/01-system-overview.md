# 01 - System Overview & Distributed MVC Architecture

> **Status:** Historical design reference. Some behavior below is planned or superseded. For current behavior, see [the current architecture](../docs/architecture.md), [API guide](../docs/api.md), and [security notes](../.agents/SECURITY.md); source code and tests are authoritative.

## 1. Executive Summary
The **MSEUF Events Offline Ticketing System** is an offline-first cryptographic admissions management platform engineered for university events (e.g., Foundation Week, University Days, concerts, sporting meets) at Manuel S. Enverga University Foundation (MSEUF).

The system has exactly three end-user roles: Students use a mobile app to present securely stored rotating tickets; Security Staff use an offline mobile scanner app at venue doors to validate tickets and manage physical access; Administrators use a desktop web dashboard to set up events, manage gate assignments, and monitor system logs. Gate marshal override is a Security Staff duty, not a separate role.

The offline workflow is designed to keep a prepared scanner usable during an API outage. This document is a historical design reference, not a performance claim: latency has not been published from representative measurements. Offline approval is provisional, a screenshot from the active 30-second step may be replayed, and disconnected scanners can accept the same ticket before server reconciliation identifies a collision. Operators must follow the [event-day runbook](../docs/event-day-runbook.md) for event changes and exceptions.

---

## 2. Architectural Blueprint: Distributed Model-View-Controller (MVC)

To satisfy academic midterm assessment criteria requiring strict MVC adherence without leaking business logic into presentation layers, the system is architected as a **Distributed MVC**:

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                           AUTHORITATIVE SERVER MVC (Laravel)                            │
│  [Model: Eloquent + PostgreSQL]  <-->  [Controller: REST API]  <-->  [View: JSON / React] │
│   - Pessimistic Locking (5432)          - Sanctum Auth                 - Live Metrics   │
│   - Cryptographic Seed Issuance         - Sync Reconciliation          - HTTP Polling   │
│   - Authoritative Tie-Breakers          - Audit Logging                                 │
└────────────────────────────────────────────┬────────────────────────────────────────────┘
                                             │ Opportunistic batch synchronization
                                             ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                            CLIENT REPLICA MVC (React Native)                            │
│  [Model: expo-sqlite]            <-->  [Controller: TOTP / Sync] <--> [View: Vector QR / UI]│
│   - local_manifest                      - otpauth Engine (RFC 6238)    - react-native-   │
│   - pending_sync_queue (UUID v4)        - TOTP / scan decisions           qrcode-svg     │
│   - expo-secure-store (Seeds)           - Scanner Clock Trust Anchor   - Scanner HUD    │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

### 2.1 The Two MVC Realities

1. **Authoritative Server MVC (Laravel REST API & Supabase PostgreSQL):**
   - **Model:** PostgreSQL schema managed by Eloquent Models (`User`, `Ticket`, `ScanLog`, `AuditLog`). Acts as the single source of truth for ticket ownership, issuance, and audit logs.
   - **Controller:** REST API Controllers (`TicketSyncController`, `TicketIssuanceController`, `AuthController`) orchestrating validation via FormRequests and business rules via Domain Services.
   - **View:** Structured JSON API responses and the Administrator Web Dashboard (React + TypeScript) for event/gate configuration and log monitoring.

2. **Client Replica MVC (React Native Expo Mobile Applications):**
   - **Model:** Local persistent state stored in `expo-sqlite` (`local_manifest`, `pending_sync_queue`) and hardware-encrypted seeds stored in `expo-secure-store`.
   - **Controller:** Client services and hooks handle QR validation, local admission states, and store-and-forward syncing. No marshal PIN override is implemented; exceptional entry uses the event lead's manual procedure.
   - **View:** Student ticket screens and Security Staff scanner screens displaying rotating QR codes, camera HUDs, and admission status badges.

---

## 3. Physical Venue Topology & Operational Constraints

```
                                    MSEUF Campus
                       ┌─────────────────────────────────────┐
                       │   Main Gate (Gate 1) - Scanner 1A   │
                       │   Main Gate (Gate 1) - Scanner 1B   │
                       ├─────────────────────────────────────┤
                       │   Gymnasium Gate (Gate 2) - Scnr 2A │
                       │   Gymnasium Gate (Gate 2) - Scnr 2B │
                       ├─────────────────────────────────────┤
                       │   Sports Field (Gate 3) - Scnr 3A   │
                       └──────────────────┬──────────────────┘
                                          │
                  [Offline Period: Zero Cellular / Wi-Fi]
                  - Scanner validates against local_manifest
                  - Scans buffered in pending_sync_queue
                                          │
               [Connectivity Restored / Sync Retry]
                                          │
                                          ▼
                       ┌─────────────────────────────────────┐
                       │  Authoritative Supabase PostgreSQL  │
                       │  Session Pooler (Port 5432)         │
                       │  Pessimistic Locking / Deduplication│
                       └─────────────────────────────────────┘
```

### Key Venue Dynamics:
* **Dead Zones:** High-density crowd areas cause cellular tower saturation. Scanners cannot rely on HTTP calls at the moment of scanning.
* **Gate Partitioning:** Tickets are pre-allocated to specific gates (`gate_id`) to reduce fraud surfaces across disparate physical entrances.
* **Surge conditions:** A staff member cannot bypass a gate or ticket decision with a PIN. The event lead makes any exceptional physical admission decision using the manual procedure in the runbook; disconnected devices cannot report that decision to the server as an override.
