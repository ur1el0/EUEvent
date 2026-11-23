# MSEUF Offline Ticketing — Product Requirements

## 1. Product and scope

EUEvent helps university event teams issue student tickets, configure gate-specific access, validate tickets at venue entrances, and reconcile admission records after connectivity returns. The system has a Laravel API backed by PostgreSQL, a React administrator dashboard, and an Expo mobile app for students and security staff.

The team considers implementation of the agreed MVP scope complete. The codebase provides a Laravel API, a React administrator dashboard, and an Expo mobile app for students and security staff. Operational readiness still depends on environment- and venue-specific checks; completion does not mean production certification.

Offline admission is **provisional until scanner records synchronize**. A disconnected scanner can validate only against the manifest and ticket state saved on that device. The system does not prevent every screenshot replay or globally enforce single use across disconnected scanners.

## 2. End-user roles

- **Students:** Use the mobile app to display their securely stored, rotating digital tickets for venue entry.
- **Security Staff:** Use the offline mobile scanner app at doors to validate student tickets and manage physical access.
- **Administrators:** Use the desktop web dashboard to set up events, manage gate assignments, and monitor system logs.

## 3. Current user-facing capabilities

### 3.1 Student tickets

- The server issues one ticket per eligible student and event gate, stores the ticket secret encrypted, and returns the secret only to that student and authorized scanner manifests.
- The mobile app stores ticket material in secure device storage and renders a QR payload that changes every 30 seconds.
- A QR image copied or photographed during its active 30-second step can still be accepted by a scanner whose local manifest has not already claimed that ticket. The same scanner blocks a repeat after its first local acceptance. Other disconnected scanners do not see that local claim, and the image is rejected after the step changes. This is a short replay window, not screenshot-proofing.
- A ticket can be revoked on the server. A scanner that is offline with an older manifest cannot learn about that revocation until it reconnects and downloads an updated manifest.

### 3.2 Security staff and offline scanning

- An administrator creates staff accounts, assigns staff to event gates, and can deactivate or reactivate staff accounts.
- Deactivation blocks new sign-ins, rejects active API credentials on the server, and records the action. A phone that is disconnected may still have a previously downloaded manifest and cannot receive remote deactivation until it reconnects.
- Before doors open, staff sign in and download the assigned gate manifest. The app encrypts the cached manifest on the device.
- The scanner checks QR format, ticket membership, gate, event status, claim status, current 30-second step, and code against the local manifest. A local success is shown as saved on the device, not server-confirmed.
- Scans are stored in an offline queue and retried with the same scan ID. On reconnect, the server reconciles records transactionally and flags duplicate claims from different scan IDs for review.
- Manual or marshal PIN overrides are not supported. The API rejects override requests. Events need a separate, documented human procedure for exceptional entry decisions.

### 3.3 Administrators

- Administrators can manage students and security staff, create and update events, configure gates and staff assignments, issue or revoke tickets, and review activity and scan logs.
- Event schedule or gate changes increment configuration data. An offline scanner may continue using an old snapshot; manifests should be refreshed before admission resumes after a change.

## 4. Offline admission procedure and limitations

1. Configure the event, gates, ticket assignments, and staff while connected.
2. Have each scanner sign in and download its assigned gate manifest shortly before doors open.
3. Confirm the event, gate, manifest version, and download time on each device.
4. If connected, let scanners synchronize frequently. If disconnected, local checks continue only from each device’s saved snapshot.
5. Treat offline approvals as provisional. If a ticket is revoked, an event is cancelled or rescheduled, a device is lost, or a cross-gate duplicate is suspected, follow the event lead’s physical admission procedure until the scanners reconnect and reconcile.
6. Reconnect scanners as soon as practical, synchronize the queue, and review rejected or anomalous records in the dashboard.

The system cannot coordinate single use between two devices that are both disconnected. Two scanners may each accept a screenshot or the same ticket from their local copy. The server later accepts one claim and records a collision for the other; staff must resolve physical admission decisions outside the software while disconnected.

## 5. Performance and reliability requirements to validate

- QR validation should remain responsive on supported phones with a realistic gate manifest. No latency or maximum manifest-size claim is made until measured on target devices.
- The API uses PostgreSQL transactions and row locks to serialize claims for a ticket during server reconciliation. Concurrent synchronization throughput and lock contention still need a multi-device PostgreSQL benchmark.
- The local scanner can check a cached manifest without Internet. It still needs the Expo app runtime available; Expo Go may lose its JavaScript bundle if the local Metro network is lost. Use an installed build for demonstrations that must survive Wi-Fi loss.
- Mail recovery requires a working mail transport configured on the event server. Password reset requests use a generic response so the API does not disclose whether an eligible account exists.

## 6. Accepted limits and out-of-scope capabilities

These are known limits of the completed MVP, not unfinished claims to hide from users or event operators:

- Screenshot-proof tickets or a global anti-replay guarantee across offline devices.
- Remote revocation delivery to disconnected phones.
- Marshal PIN overrides or automatic exception admission.
- Production load guarantees, high availability, multi-region deployment, or measured accessibility conformance. These require a separate deployment and assurance plan.
- Automatic physical resolution of conflicting offline admissions.

For current release and venue-readiness checks, see [system status](PHASES.md), the [post-MVP operational backlog](backlog.md), and the [event-day runbook](../docs/event-day-runbook.md).
