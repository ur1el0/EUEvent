# 03 - Web Admin Dashboard Architecture (React + TypeScript)

> **Status:** Historical design reference. Some behavior below is planned or superseded. For current behavior, see [the current architecture](../docs/architecture.md), [API guide](../docs/api.md), and [security notes](../.agents/SECURITY.md); source code and tests are authoritative.

## 1. Overview
The desktop Administrator Web Dashboard lets administrators set up events, manage gate assignments, and monitor system activity. It shows server-recorded metrics and recent activity; it does not receive offline queue telemetry, provide a complete live occupancy count during an outage, or record marshal overrides. Security Staff use the separate offline mobile scanner app and do not use this dashboard as an end-user surface.

---

## 2. Technical Stack
* **Framework:** React 19 SPA initialized with Vite.
* **Language:** TypeScript (Strict Mode enabled).
* **Styling:** Tailwind CSS with accessible, high-contrast badges for live gate statuses.
* **Icons:** Lucide React.
* **Network Strategy:** Clean HTTP interval polling (`setInterval` / React Query) against `/api/v1/admin/metrics`. **Zero WebSocket dependency** to eliminate presentation-day deployment and firewall failures.

---

## 3. UI Component Hierarchy & Modularity

```
App
└── AdminDashboardLayout
    ├── NavigationHeader
    ├── EventSetupAndGateAssignment
    ├── MetricsSummaryGrid
    │   ├── TotalIssuedCard
    │   ├── TotalAdmittedCard
    │   └── AnomalyCountCard
    ├── GateThroughputPanel
    │   └── GateProgressBarCard (Gate 1, Gate 2, Gym)
    └── ActivityAndAuditLog
```

The dashboard is restricted to the `administrator` role. It supports event configuration, gate assignment management, periodically refreshed server metrics, and system/audit log review.

---

## 4. Polling Strategy & Reliability

* **Interval:** Dashboard metrics refresh periodically; see the current implementation for the configured interval.
* **Graceful Degradation:** If network polling fails momentarily, the UI displays a subtle "Reconnecting..." indicator without tearing down the existing metrics DOM tree or throwing unhandled JavaScript runtime errors.
* **Visual Anomaly Encoding:**
  * **Green (`bg-emerald-500`):** Normal, valid ticket admission.
  * **Amber (`bg-amber-500`):** Attention or pending review.
  * **Red (`bg-rose-500`):** A rejected or anomalous server-recorded outcome requiring review.
