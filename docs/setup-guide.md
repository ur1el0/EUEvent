# EUEvent setup guide

This guide brings together the common developer and presentation setups for Fedora. It covers the isolated Lerd demo, administrator dashboard, Expo Go app, shared Supabase development, and the most common connection errors.

## Choose a setup profile

| Profile | API and database | Use it for |
| --- | --- | --- |
| Local presentation (recommended for demos) | Laravel on Fedora at port `8002`; dedicated local PostgreSQL database in Lerd | Demonstrations, offline drills, and work when venue internet is unreliable. It is isolated from Supabase. |
| Shared development | Laravel connects to the team's Supabase project using local credentials | Coordinated development against shared data. Use only the team's agreed development project and follow its migration process. |
| Linked Lerd site | Lerd serves a linked Laravel directory at a `.test` domain | Individual local Laravel development that specifically needs Lerd's Nginx/PHP-FPM integration. The dashboard can proxy to `https://backend.test`. |

The local presentation profile is easiest to reproduce and safest for demos. It uses the repository's `backend/.env.demo` and does not change `backend/.env` or connect to Supabase.

## Requirements

- Fedora with PHP 8.5, Composer, Node.js 22, and npm.
- Git and the repository's dependencies installed.
- Lerd with its PostgreSQL service for the isolated demo database.
- Expo Go on an iOS or Android phone for development demos.
- Fedora and the phone on the same Wi-Fi network for Expo Go and LAN API access.

Check the local toolchain:

```bash
php -v
composer --version
node --version
npm --version
lerd status
```

The project currently targets PHP 8.5 and Node 22. If the versions are wrong, use the machine's version manager or Lerd configuration before installing dependencies.

## Clone and install dependencies

From the repository root:

```bash
cd backend
composer install

cd ../admin-web
npm ci

cd ../security-scanner
npm ci
```

`composer install` and `npm ci` use the checked-in lockfiles. They install dependencies; they do not configure a database, create demo accounts, or start servers.

Never commit `.env`, `.env.local`, `.env.demo`, database passwords, Laravel app keys, Supabase credentials, or mobile API secrets.

## Local presentation setup with Lerd

This is a dedicated database, separate from Supabase. The setup script creates a local database and demo admin on first setup, then applies migrations and runs the presentation seeder. The credentials are written to the ignored `backend/.env.demo` file.

### 1. Prepare the local database

From `backend/`:

```bash
lerd service start postgres
./scripts/setup-presentation-demo.sh
```

If `backend/.env.demo` already exists, the script keeps its existing credentials and database. Do not delete that file or manually drop the database as a first troubleshooting step; it contains the only local generated demo password and the script protects against replacing an existing local database.

The seeded administrator email is:

```text
demo-admin@euevent.test
```

Read the generated password locally from the repository root:

```bash
grep '^EUEVENT_DEMO_ADMIN_PASSWORD=' backend/.env.demo
```

Do not paste the password into chat, commit it, or use it in Supabase. The demo database also starts with a venue and Gate A. Create student and security-staff accounts through the dashboard before issuing tickets.

### 2. Start the Laravel API

In a dedicated terminal:

```bash
cd backend
./scripts/start-presentation-demo.sh
```

Keep the terminal open. The script verifies that `.env.demo` targets the isolated Lerd database, applies migrations and the idempotent demo seeder, and starts Laravel on port `8002` at `0.0.0.0`.

Check the API health route from Fedora in another terminal:

```bash
curl -i http://127.0.0.1:8002/up
```

An HTTP `200` indicates the Laravel app responds. This check does not test mobile LAN access; the phone must use Fedora's Wi-Fi address instead of `127.0.0.1`.

### 3. Start the administrator dashboard

In another terminal, from `admin-web/`, create a local-only Vite environment file if one is not already present:

```bash
test -f .env.local || cp .env.example .env.local
```

Set these values in `admin-web/.env.local`:

```dotenv
VITE_API_BASE_URL=/api/v1
VITE_BACKEND_ORIGIN=http://127.0.0.1:8002
```

Start Vite:

```bash
npm run dev -- --host 0.0.0.0
```

Open the Vite URL printed in the terminal, usually `http://localhost:5173`, and sign in with the local demo admin account. Vite forwards `/api/*` requests to `VITE_BACKEND_ORIGIN`.

Vite reads `.env.local` with higher priority than `.env`. If both files exist with different backend origins, `.env.local` wins. Restart Vite after changing an environment file; the running process does not automatically adopt all environment changes.

### 4. Start the Expo mobile app

In a third terminal, from `security-scanner/`:

```bash
npm run start:lan
```

The launcher checks the local API, detects Fedora's current LAN IP, and starts Expo in LAN mode with the matching API base URL. Scan the Expo development QR code with Expo Go while the phone is connected to the same Wi-Fi.

If the app has a stale API address, open Server settings and enter the full URL including `/api/v1`:

```text
http://<FEDORA_WIFI_IP>:8002/api/v1
```

Find Fedora's IPv4 addresses with:

```bash
ip -brief -4 addr
```

Use the address for the active Wi-Fi interface, such as `wlp1s0`. Do not use `127.0.0.1`, Docker bridge addresses, or the Lerd loopback address on a physical phone. Saving a different server clears the current sign-in because each API has its own session tokens.

### 5. Prepare an event for testing

1. Sign in to the desktop dashboard as `demo-admin@euevent.test`.
2. Create student and security-staff accounts, or use existing demo accounts.
3. Create an event at the demo venue, assign Gate A and the staff account, and schedule the event.
4. Issue a ticket to a student for Gate A.
5. Sign in as the student on mobile, refresh tickets, and display the current QR.
6. Sign in as the assigned staff member on a separate phone and download the Gate A manifest while online.
7. Scan the student's current QR. To test offline queueing, stop only the API terminal while keeping Wi-Fi and Expo Metro active, scan another unclaimed ticket, restart the API, and sync.

An offline success means “locally validated and queued.” It remains provisional until the server reconciles it. Do not use the same ticket twice to demonstrate a second success; the scanner prevents repeat scans on that device.

## Shared Supabase development setup

Use this only when the team intentionally wants to work against its shared Supabase PostgreSQL project. Each developer needs authorized project access and their own local `backend/.env`; credentials are not shared in Git.

1. Install backend dependencies and create the ignored local environment file:

   ```bash
   cd backend
   composer install
   test -f .env || cp .env.example .env
   if ! grep -q '^APP_KEY=.' .env; then php artisan key:generate; fi
   ```

2. Put the team's approved connection settings in `backend/.env`. Never copy the database password, Supabase API keys, service-role key, or Laravel app key into source files or chat.
3. Confirm the connection target and credentials with the project owner before migrating. Then inspect migration state:

   ```bash
   php artisan config:clear
   php artisan migrate:status
   ```

4. Apply committed migrations only after coordinating with the team:

   ```bash
   php artisan migrate
   ```

Do **not** run `migrate:fresh`, reset the shared project, or run destructive seeders against a shared database. Migrations committed to Git are the schema source of truth. Teammates pull the migration files and apply outstanding migrations to the agreed development project. Keep presentation data in the isolated local profile.

The dashboard can proxy to the Lerd-linked backend instead of the demo server by setting `VITE_BACKEND_ORIGIN=https://backend.test` in its local Vite environment. That requires Lerd's site, DNS, Nginx, and PHP-FPM setup to be healthy. It is not required for the port `8002` presentation server.

## Common setup failures

### Admin login says `Request failed (502)`

This usually means the Vite proxy returned a gateway error because it could not reach the configured Laravel API. It is a connection failure, not proof that the password is wrong.

1. Check `VITE_BACKEND_ORIGIN` in `admin-web/.env.local`. For the local demo it should be `http://127.0.0.1:8002`.
2. Confirm the backend terminal is running and check `curl -i http://127.0.0.1:8002/up`.
3. For the demo profile, confirm Lerd PostgreSQL is running and start the API with `backend/scripts/start-presentation-demo.sh`.
4. Restart Vite after changing its environment file.

The demo account exists only in the local demo database. A Supabase-only admin account will not sign in to the local presentation profile. If Laravel is responding but login is rejected, verify which database/profile is active and retrieve the demo password from `backend/.env.demo` locally.

### The API launcher says PostgreSQL is not running

Start the Lerd service:

```bash
lerd service start postgres
```

If the command says the PostgreSQL preset is not installed, install the Lerd PostgreSQL service first. Do not delete `.env.demo` or recreate the database until checking the current local Lerd service and database state.

### The phone cannot reach the API

- Keep the API bound to `0.0.0.0:8002` with the presentation launcher.
- Put phone and Fedora on the same Wi-Fi network. Guest Wi-Fi may block device-to-device traffic.
- Confirm the phone's URL uses Fedora's active Wi-Fi address and ends in `/api/v1`.
- Check Fedora firewall rules for local TCP port `8002` if the phone and laptop share Wi-Fi but cannot connect.
- For Expo Go, keep the Metro terminal running; the mobile app and API use separate connections.

### Login returns `401` after the API is reachable

Now the request reached Laravel, so check the email/password and account role. Also check that the dashboard and mobile app are using the intended backend profile. Local demo users are not automatically copied from Supabase.

### Expo Go stops when Wi-Fi is turned off

Expo Go needs the Metro development server to load the JavaScript app. An API-only outage can be demonstrated while local Wi-Fi and Metro stay available. For full local-network loss, use an installed standalone app build instead of Expo Go.

## Stop the demo

- Stop Laravel, Vite, and Metro with `Ctrl+C` in their respective terminals.
- Leave the Lerd PostgreSQL service installed; stop it through Lerd only when it is no longer needed.
- Keep `backend/.env.demo` private. It holds generated demo credentials and is intentionally ignored by Git.

## More detailed guides

- [Backend setup and local demo database](../backend/README.md)
- [Admin dashboard setup](../admin-web/README.md)
- [Expo Go and scanner preparation](../security-scanner/README.md)
- [Presentation walkthrough and fault scenarios](presentation/README.md)
- [API contract](api.md)
- [Event-day offline operations runbook](event-day-runbook.md)
- [System architecture](architecture.md)
