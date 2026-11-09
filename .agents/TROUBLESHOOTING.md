# EUEvent Troubleshooting Runbook

## 1. Supabase or migration errors

- Check the current `.env` values without sharing secrets. Verify the host, port, database, username, and password match the Supabase connection mode selected for this project.
- Clear cached Laravel configuration after changing `.env`: `php artisan config:clear`.
- Use `php artisan migrate:status` to confirm migrations are applied to the database configured for this checkout. Laravel tests use in-memory SQLite and do not migrate Supabase.
- Row-locking behavior must be checked against PostgreSQL. A passing SQLite test does not prove Supabase locking behavior or throughput.

## 2. Student or staff cannot sign in

- Confirm the email/student number and account role are correct.
- Security staff must have `is_active = true`. An administrator can activate the account in the Staff page; activation does not restore previously revoked tokens, so staff sign in again.
- If a token was revoked or a password changed, sign in again to obtain a fresh token.
- Password recovery requires the server's mail transport to be configured. The API deliberately gives the same response for unknown and eligible emails. Check server mail logs and the recipient's spam/junk folder.

## 3. QR code rejected as expired or invalid

- Confirm the phone clock uses automatic date/time and compare it with the scanner. The scanner currently accepts the exact current 30-second step, with no previous/next-step tolerance.
- A QR screenshot can still work during the same active step. Once that 30-second step changes, it should be rejected.
- Check that the scanner has the correct event and gate manifest downloaded and that the event is scheduled or in progress.
- A stale manifest may not contain recent ticket revocations, schedule changes, or claims at other offline gates. Reconnect and refresh before continuing when the event has changed.

## 4. Offline scanner behavior

- A phone needs to download its gate manifest before going offline. Without a saved copy, it cannot validate tickets offline.
- A green/local accepted result is provisional until synchronization. It does not mean another disconnected gate has not accepted the same ticket.
- When two offline scans conflict, sync both devices and review the collision record. The software cannot determine physical admission order from untrusted device timestamps.
- Manual override is not supported. Follow the event lead's physical exception procedure.
- Expo Go may lose its JavaScript bundle if the network that provides Metro is unavailable. For a demonstration that must continue through Wi-Fi loss, use a built installed build.

## 5. Repeated sync records or collision alerts

- Queue retries must preserve their original `scan_id`. The same ID represents retry of one physical scan.
- A different ID for a ticket already claimed is treated as a possible duplicate and audited.
- `server_received_at` says when the server received a scan. It does not prove which disconnected device scanned physically first.
