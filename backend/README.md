# EUEvent Laravel backend

This directory contains the PHP 8.5 / Laravel 13 API. It owns authentication, role checks, event and venue data, ticket issuance, encrypted ticket seeds, scan reconciliation, and audit history. The React dashboard and Expo app use its versioned `/api/v1` JSON endpoints.

## Main API areas

- Authentication and role-specific student, security-staff, and administrator access.
- Administrator management for students, staff, venues, gates, events, gate assignments, and ticket issuance.
- Administrator event-ticket roster and audited revocation workflow.
- Student ticket wallet and staff gate-manifest endpoints.
- Scanner batch synchronization with TOTP verification, gate/event checks, idempotent scan IDs, and anomaly logging.
- Administrator metrics and activity logs.

Sanctum bearer tokens expire after 24 hours by default. Set `SANCTUM_EXPIRATION_MINUTES` in `.env` to change that lifetime; mobile clients must sign in again after expiry before protected API calls or scan synchronization can continue.

Controllers handle HTTP input and responses. Form Requests validate and authorize requests; application services apply event and ticket rules in database transactions; Eloquent models map the PostgreSQL schema.

## Local development

Install dependencies and configure `.env` for the database and app key used by your local Laravel environment:

```bash
composer install
cp .env.example .env
php artisan key:generate
```

Set the local database values in `.env` before running migrations. Never commit `.env`, database credentials, or encryption keys.

For a safe demo database isolated from Supabase, follow the [local presentation mode](#local-presentation-mode).

### Seed a test student (local testing only)

`LocalStudentSeeder` creates one student account (`student@euevent.test`, student number `2026-00001`) so you can sign in to the mobile app. It is **not** part of `php artisan db:seed` and runs only when you ask for it. It is for local testing only and must never be used in production or on a shared database.

1. Set a password of at least 12 characters in your ignored `.env`. `.env.example` leaves it blank on purpose:

   ```dotenv
   LOCAL_STUDENT_PASSWORD=your-own-local-password
   ```

2. Run the seeder:

   ```bash
   php artisan db:seed --class=LocalStudentSeeder
   ```

The seeder refuses to run in the `production` environment and when the password is missing or shorter than 12 characters. If `student@euevent.test` already exists it changes nothing. Do not commit the password.

## Sending real email with Brevo

EUEvent emails a verification code when a student registers and a token when a student or staff member resets a password. In local development the `log` mailer is the default, so nothing is delivered. To send real email, point Laravel at Brevo's SMTP relay. This section assumes you already use the code in this repository; Brevo's own pages are the authority for their menus, limits and pricing, so check them rather than relying on this guide.

Mail is sent immediately while the request is handled. The notifications are not queued, so you do **not** need to run `php artisan queue:work` for registration or password-reset email.

### 1. Set up Brevo

1. Create a Brevo account.
2. **Verify a sender.** Add the address you will send from and confirm it, or authenticate a domain you control. Brevo may reject or flag mail from a sender it has not verified.
3. **Generate an SMTP key.** In Brevo's SMTP settings, create an SMTP key. Brevo shows an SMTP login (not your account email) and the key; the key is your `MAIL_PASSWORD`. It is shown once, so store it in a password manager.
4. **Authorize the sending machine's IP address.** Brevo can block SMTP use from IP addresses you have not authorized. Add the public IP of the computer or server that runs the API in Brevo's security settings. A home or school connection can change address, so authorize the new one if sending stops working.

### 2. Configure `backend/.env`

Edit your own ignored `.env` (never `.env.example`, and never commit credentials):

```dotenv
MAIL_MAILER=smtp
MAIL_HOST=smtp-relay.brevo.com
MAIL_PORT=587
MAIL_SCHEME=smtp
MAIL_USERNAME=<your Brevo SMTP login>
MAIL_PASSWORD=<your Brevo SMTP key>
MAIL_FROM_ADDRESS=<a sender you verified in Brevo>
MAIL_FROM_NAME="EUEvent"
```

Port 587 uses STARTTLS, which the `smtp` scheme negotiates. `smtps` is for implicit TLS on port 465, so do not combine it with 587. Then clear the cached configuration:

```bash
php artisan config:clear
```

### 3. Test it

```bash
php artisan mail:test someone@student.mseuf.edu.ph
```

The command sends a short plain message and prints the mailer, host and from address it used. It never prints the username or password. It refuses to run when `MAIL_MAILER` is `log` or `array`, because nothing would be delivered, and it reports a failure with the server's message (credentials and addresses removed).

If sending fails during registration or password reset, the app still returns its normal generic response, so a person cannot tell whether an account exists. The failure is logged in `storage/logs/laravel.log` with the exception class and a redacted message, never the code or token. The person can request a new code straight away.

### Local development without sending

With `MAIL_MAILER=log` (the default in `.env.example`) the whole email, including the registration code or reset token, is written to `storage/logs/laravel.log`. Search the file for "verification code" or "reset". This is fine for development and must never be used for real users.

### Troubleshooting

- **The message is in the junk folder.** Outlook and Microsoft 365 often filter mail from a new sender. Ask the recipient to check junk, mark the message as not junk, and add the sender to their safe senders.
- **The sender is not verified.** Brevo can refuse or flag messages from an unverified `MAIL_FROM_ADDRESS`. Verify the exact address in Brevo.
- **The IP address is not authorized.** A connection or authentication error from a machine whose address changed usually means the new IP needs authorizing in Brevo.
- **A sending limit was reached.** Free plans have a daily sending limit. Check Brevo's own pages for the current limits and your usage.
- **SPF and DKIM.** If you send from a domain you control, authenticate it in Brevo by adding the SPF and DKIM records Brevo gives you to that domain's DNS. Without them, receivers are more likely to filter the mail.
- **Sending as the school's own domain can look like spoofing.** Using an `@student.mseuf.edu.ph` or `@mseuf.edu.ph` address as the sender means a third-party service is sending as that domain. Unless the school's mail administrator has authorized Brevo for that domain (SPF and DKIM), receivers may treat the mail as spoofed. A sender on a domain you control, with SPF and DKIM set up, is safer.
- **The school's mail administrator quarantined the sender.** An unknown sender can be held in quarantine without reaching the junk folder. Ask the mail administrator to release the message and allow the sender.
- **The command says nothing would be delivered.** `MAIL_MAILER` is still `log` or `array`. Fix `.env`, run `php artisan config:clear`, and try again.

## Tests and quality checks

From this directory:

```bash
php artisan test --compact
vendor/bin/pint --dirty --format agent
php artisan route:list --path=api/v1
```

The PHPUnit configuration uses in-memory SQLite. Tests cover student ticket access, assigned-gate manifests, offline scan reconciliation and retries, role checks, token expiry, ticket revocation, audit decisions, and presentation seeding without contacting Supabase.

## Local presentation mode

Use this mode when the venue's internet connection is unreliable. Fedora runs the API and a dedicated PostgreSQL database locally; a phone and dashboard computer reach them over the same Wi-Fi network. This database is separate from Supabase and contains local demo data.

### One-time setup

Install Composer dependencies, then from `backend/` run:

```bash
./scripts/setup-presentation-demo.sh
```

The script uses the Lerd PostgreSQL container, creates a dedicated `euevent_demo` database and login, generates local credentials, runs migrations, and seeds an administrator, a venue, and Gate A. It writes secrets to the ignored, owner-readable-only `.env.demo`. It does not change `.env` or contact Supabase. The seeder refuses to run outside Laravel's `demo` environment.

The demo administrator email is `demo-admin@euevent.test`. Read the generated password locally with:

```bash
grep '^EUEVENT_DEMO_ADMIN_PASSWORD=' .env.demo
```

Keep the password on the presentation computer. Create student and security-staff accounts in the dashboard before issuing tickets or testing scans.

### Start the API

From `backend/`:

```bash
./scripts/start-presentation-demo.sh
```

The API listens on port 8002 on Fedora's LAN interfaces. Keep that terminal open.

### Network behavior

The API, database, dashboard, and mobile traffic stay on the local network. A healthy local Wi-Fi connection is still needed for phones and other computers to reach Fedora. The mobile scanner must download its assigned gate manifest before operating offline. If the local Wi-Fi itself fails, Expo Go may also lose its JavaScript bundle connection to Metro; use an installed standalone build for a presentation that must survive loss of that Wi-Fi.

The scanner queues validated scans locally and syncs when the API becomes reachable. During a disconnection it cannot receive event cancellations, revocations, or changed gate assignments, so offline acceptance is provisional until server reconciliation.

The LAN IP may change when the router renews its DHCP lease. The scanner's `npm run start:lan` launcher detects the current address. A DHCP reservation can keep the address stable if the presentation router is under your control.
