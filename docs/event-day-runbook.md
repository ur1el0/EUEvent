# Event-day offline operations runbook

The agreed MVP feature scope is implemented. This runbook covers operational decisions the software cannot make for a disconnected venue; local scan approvals remain provisional until reconciliation.

This runbook is for event leads and gate staff using EUEvent scanners at a real event. It describes what the software does today and what people must handle themselves. It is based on [ADR 012](../architecture/decisions/012-current-step-totp-and-replay-boundary.md) (QR replay boundary), [ADR 013](../architecture/decisions/013-manual-exception-procedure-without-pin-override.md) (manual exceptions, no PIN override), [ADR 014](../architecture/decisions/014-offline-manifest-freshness-policy.md) (manifest freshness), and the [offline readiness handoff](handoffs/offline-readiness-hardening.md).

Read the [offline limits](#offline-limits) section before the event. The rest of this document depends on it.

## Roles

**Event lead.** Each event names one event lead before doors open, together with a backup if the lead is unavailable. The lead is the only person who can:

- decide whether gates keep admitting during a WAN or API outage, and when they stop;
- approve a manual exception at a gate (see [manual exception procedure](#manual-exception-procedure));
- tell gates to stop when an event is cancelled, postponed, or rescheduled.

Gate staff do not make these decisions alone. The app has no override, PIN, or supervisor bypass, and the API rejects override requests.

**Administrator.** Uses the desktop dashboard to manage the event, staff accounts, gate assignments, and tickets. The administrator may be the event lead, but both roles must be clear on the day.

**Gate staff.** Signed in to the scanner app with their own security-staff account and assigned to a gate.

Agree in advance how the lead reaches each gate if the network is down, for example by radio, phone call, or a runner.

## Before doors open

Do these steps while the venue network and API are working.

1. **Assign staff.** In the dashboard, assign each gate's security staff to the event. After an event is scheduled you can add gates and staff, but you cannot remove existing ones. Plan replacements by adding, not removing.
2. **Check staff accounts.** Make sure every assigned staff member is active in **Security staff** and can sign in.
3. **Set phone clocks to automatic.** On every scanner phone and, where possible, on student phones, turn on automatic date and time and automatic time zone. The scanner accepts only the current 30-second QR step and uses its own clock to measure manifest age. A wrong clock causes expired QR rejections or a manifest refusal.
4. **Download manifests while online.** The app calls a gate manifest the gate's **ticket list**. Each staff member opens the scanner app, refreshes assignments, and taps **Download ticket list** or **Update ticket list** on their gate. Do this on the day of the event. A manifest older than 24 hours is refused (proposed threshold, ADR 014).
5. **Check each gate card.** The card must say **Ready for offline** with today's save time, and **Scan** must be enabled. When the phone is online and the event changed after the ticket list was saved, **Scan** stays disabled with "Ticket list out of date, update it" until the list is updated. Open the scanner and confirm that no "Ticket list may be outdated" or "Scanning paused" banner is showing.
6. **Re-download after late changes.** If the administrator changes the event, its gates, or its tickets after manifests were downloaded, every affected gate downloads again.
7. **Charge and prepare backups.** Charge phones fully and bring power banks. Prepare at least one spare phone per entrance area, signed in and with a manifest downloaded, as described in [low battery or camera failure](#low-battery-or-camera-failure).
8. **Prepare the exception log.** Give each gate a paper or shared exception log for the [manual exception procedure](#manual-exception-procedure).

## During entry

A green **ADMIT** with "Saved on this phone, not yet confirmed by server" means the QR matched the manifest saved on this phone. It is provisional until the scan is sent to the server. Keep scanners on the gate screen so saved scans are sent in the background whenever the API is reachable.

### WAN or API outage

Scanning keeps working from the saved manifest, and scans queue on the phone. The event lead alone decides whether gates continue admitting. If the outage lasts longer than 6 hours since the manifest download, the scanner shows a stale warning. The lead may still allow admission until the scanner refuses (24 hours after download, or 60 minutes after the scheduled event end). After a refusal, the gate stops admitting until the manifest is refreshed online. The lead can then admit only through the manual exception procedure.

### Stale manifest warning or refusal

- **"Ticket list may be outdated, update when connected"**: scanning still works. When the network is available, close the scanner and tap **Update ticket list** on the gate. If the network is down, tell the event lead, who decides whether to continue.
- **"Scanning paused"** (manifest too old, event window ended, or manifest age unknown): do not admit from this phone. Refresh the manifest while connected. If you cannot, ask the event lead. If the message says the age is unknown, check that the phone uses automatic date and time before refreshing.

Manifests saved by an app version older than this rule always show the stale warning until they are refreshed.

### Wrong gate

**Ticket belongs to another gate**: send the student to the gate printed on the ticket. Do not admit. Exceptions such as a closed gate go to the event lead.

### Expired QR

**Rotating code expired** usually means the student showed an old screenshot or one of the phone clocks is wrong. Ask the student to open the live ticket in the app and check that their phone uses automatic time. Scan again. Do not admit from a screenshot that has expired.

### Ticket already used or unknown

Do not admit. **Ticket already used** or **already scanned** means this phone or its manifest already recorded the ticket. **Ticket not on this gate’s list** means the event or gate differs, or the manifest is out of date. Refer anything that cannot be resolved to the event lead.

### Low battery or camera failure

- Swap to a spare phone. The spare must be signed in with an assigned staff account and must already have its manifest downloaded. Downloading needs the network.
- If the camera permission is off, tap **Allow camera** or **Open settings** in the scanner.
- There is no manual ticket-number entry in the app. If no working scanner is available, stop admission at that gate or use the manual exception procedure with the event lead's approval.
- Do not sign out of a phone that has scans waiting to sync unless necessary. The queue stays on the phone for the same staff account, but it only syncs from that phone.

## Event changes while scanners are offline

### Event cancelled, postponed, or rescheduled

A disconnected scanner keeps the event status and time window it downloaded. It does not know about the change.

1. The event lead tells every gate directly to stop admitting.
2. Staff close the scanner and record the time they stopped.
3. When each phone reconnects, sync it. Scans of a cancelled or postponed event come back as **rejected after sync** (`EVENT_NOT_ACTIVE`).
4. For a reschedule, download fresh manifests before the new time. Old manifests stop admitting on their own 60 minutes after the old scheduled end, or 24 hours after download.

### Ticket revoked after a scanner went offline

The offline phone still holds the ticket as valid and can admit it. When the administrator revokes a ticket that must not be used, they tell the event lead, who passes the student or ticket reference to the gates. Gate staff refuse that reference. After sync, an admission of a revoked ticket appears as rejected (`TICKET_REVOKED`). Note it for the after-event review. The person is already inside; sync cannot reverse that.

### Lost or stolen scanner phone, or replacing a staff member

1. **Deactivate the account.** The administrator sets the staff member to **Inactive** in **Security staff**. This revokes the account's server tokens and blocks sign-in. The phone cannot receive this while it is offline. Its saved manifest is not erased remotely and can keep admitting locally until it is refused under ADR 014.
2. **Recover the device physically.** The event lead tries to recover the phone and makes sure nobody scans with it. Record when and where it was lost.
3. **Add a replacement assignment.** The administrator adds the replacement staff member, or a new spare phone's account, to the same gate. Adding staff after scheduling is allowed. Removing the old assignment is not, because other phones may still hold manifests. The replacement signs in, downloads the manifest while online, and starts scanning.
4. If the same person continues on a new phone, the administrator can reactivate the account later. Reactivation does not restore old tokens, so the person signs in again on the new phone.
5. Scans still queued on a lost phone are lost unless the phone is recovered and synced with that account. Treat admissions from that gate during the gap as unconfirmed in the after-event review.

## Manual exception procedure

This follows ADR 013. Use it only with the event lead's approval, for example when a gate scanner is unavailable or a case is not covered above.

Record each exception in the gate's exception log:

- ticket ID or student reference, such as the student number;
- gate;
- time, from the scanner phone clock if possible;
- scanner device or staff account involved;
- reason;
- decision (admitted or refused) and who approved it.

Do not write down QR codes, one-time codes, passwords, or tokens. Do not photograph student screens.

A manual exception is never a server-confirmed admission. It does not appear in the scan log and does not mark the ticket as claimed. The same ticket can still be scanned at another gate. Reconcile the log by hand after the event.

## After doors close

1. **Reconnect every scanner.** Bring each phone, including spares and any recovered phones, onto the network with the same staff account still signed in.
2. **Sync.** Open the scanner home or the gate scanner and let queued scans upload until the pending count reaches zero. On the scanner home, **Send to server** retries straight away. Do not sign out or clear manifests while scans are pending.
3. **Review rejected scans and collisions.** In the dashboard activity log, filter by scans and anomalies. Look for:
   - `SPLIT_BRAIN_COLLISION`: another scanner already claimed the ticket. Two people may have entered on one ticket.
   - `TICKET_REVOKED`, `EVENT_NOT_ACTIVE`, `GATE_MISMATCH`, `INVALID_TICKET_CODE`: the gate admitted locally but the server rejected the scan on sync.
4. **Reconcile the exception logs** against the scan history and note any follow-up.
5. **Clear manifests on shared phones.** Once every scan has synced, open **Advanced** at the bottom of the scanner home and use **Clear saved ticket lists** on phones that will be reused for other people.

## Offline limits

These are limits of the current system, not configuration problems.

- **Event changes are not instant on disconnected phones.** A phone without a connection cannot learn that an event was cancelled, postponed, or rescheduled, that a ticket was revoked, or that a staff account was deactivated. It keeps using the copy it downloaded until it reconnects and downloads again, or until the freshness rule refuses the copy.
- **Two offline scanners cannot coordinate single-use admission in real time.** If the same ticket or a screenshot taken in the same 30-second window is shown at two disconnected phones, both can accept it. The server keeps the first scan it processes and flags the other as a collision. It cannot tell which person physically entered first.
- **A sync cannot undo an admission.** Rejections after sync tell you what to review. The person is already through the gate.
- **The freshness thresholds are proposals.** The 6-hour warning, the 24-hour maximum age, and the 60-minute post-event grace period are pending team approval (ADR 014).
- **Phone clocks matter.** The scanner trusts its own clock for QR codes and manifest age. Keep scanner phones on automatic time.
