# EUEvent Domain Glossary

### End-user roles
The three roles are **Student** (presents a digital ticket on mobile), **Security Staff** (validates tickets at gates using the offline scanner), and **Administrator** (configures events, gates, and accounts on the desktop web dashboard).

### RFC 6238 / TOTP
A time-based one-time password computed from a shared secret and a 30-second Unix-time step. EUEvent places the ticket ID, step number, and six-digit code in the QR payload: `EUEVENT1:{ticket_id}:{step}:{code}`.

### Current-step validation
The scanner currently accepts the exact current step only. Its allowed drift is zero steps. A screenshot may be accepted by a scanner that has not locally claimed the ticket; that same scanner rejects a repeat after the first claim, but another disconnected scanner cannot see the claim. The image becomes stale after its 30-second step and the system is not fully screenshot-proof.

### Gate manifest
An encrypted, gate-scoped snapshot downloaded by an authenticated staff phone before the event. The scanner can validate tickets from this saved copy while disconnected. Later event or ticket changes do not reach the device until it reconnects and refreshes.

### Pending scan queue
Encrypted local records of scans that have not yet been acknowledged by the server. Every record keeps one UUID `scan_id` across retries so the server can recognize the same retry.

### Provisional offline acceptance
A ticket/code/gate match against one scanner's saved manifest. It is not a global reservation or server confirmation. Multiple disconnected scanners can accept the same ticket from separate stale copies.

### Split-brain collision
Two distinct scan IDs claim the same ticket. The server preserves the records and flags the later processed claim as a collision during reconciliation. It cannot reverse a physical entry already made offline.

### Server receive time
The server's `server_received_at` records when a scan record arrived. It cannot establish which device physically scanned first while the devices were disconnected. The uploaded `scanned_at` is client-provided, untrusted data, and current server checks use it for time-step/event-window validation.

### Staff deactivation
An administrator can deactivate a security staff account. This blocks online sign-in/API access and deletes server-side Sanctum tokens. A disconnected phone cannot receive that change and may still have cached offline data until recovered or reconnected.

### Password reset token
A one-time Laravel password-reset token delivered through the configured mail transport. It expires after 60 minutes; a successful reset changes the password and invalidates existing API sessions. Public request responses do not reveal whether an eligible account exists.

### Manual admission override
Not implemented. Sync API requests that claim an override are rejected. Event operators need an external physical exception procedure.
