# Sharing EUEvent through tunnels

LAN mode (`npm run start:lan`) only works when every phone is on the same Wi-Fi as the computer running the API. Tunnels give each part of the system a public `https://` address, so phones on any network, including mobile data, can use it.

| Part | Tunnel | Public address |
| --- | --- | --- |
| Laravel API (port `8002`) | Cloudflare quick tunnel | `https://<random>.trycloudflare.com/api/v1` |
| Admin dashboard (Vite, port `5173`) | Cloudflare quick tunnel | `https://<random>.trycloudflare.com` |
| Expo app | Expo's built-in tunnel (`expo start --tunnel`) | QR code in the terminal |

Quick tunnels need no Cloudflare account. Their addresses change every time the script starts.

## Requirements

Install `cloudflared` on the computer that runs the API:

- Fedora: `sudo dnf install cloudflared`, or download it from <https://github.com/cloudflare/cloudflared/releases>
- Windows: `winget install --id Cloudflare.cloudflared`

## Run

1. Start the API on port `8002`, for example with `backend/scripts/start-presentation-demo.sh`.
2. Optional: start the dashboard with `npm run dev` in `admin-web/`. The script shares it only if it is running.
3. From the repository root:

   ```bash
   # Fedora / Linux
   bash scripts/start-tunnels.sh

   # Windows PowerShell
   powershell -ExecutionPolicy Bypass -File scripts\start-tunnels.ps1
   ```

   Add `--no-expo` (Linux) or `-NoExpo` (Windows) to open only the API and dashboard tunnels.

4. The script prints the public API and dashboard links, then starts Expo with the API link already set. Scan the Expo QR code with Expo Go from any network.
5. Press `Ctrl+C` to close Expo and every tunnel.

## Phones that used the app before

The app keeps the last saved server address. Because quick-tunnel addresses change on every run, open the app's **Server settings** and enter the new API link ending in `/api/v1`. Saving a different server signs the phone out.

## How the backend sees tunnel traffic

Requests through `cloudflared` reach Laravel from `127.0.0.1`. `backend/bootstrap/app.php` trusts forwarded headers from loopback only, so per-IP rate limits (for example, 6 login attempts per minute) apply to each phone instead of to everyone at once. Clients on other addresses cannot spoof `X-Forwarded-For`. `backend/tests/Feature/TunnelClientIpTest.php` covers this.

## Safety

- Anyone with a tunnel link can reach that service. Share links only with the team, use strong passwords, and keep real student data out of tunnelled demos.
- The dashboard tunnel exposes the Vite development server. Use it for testing and demos, not as a production deployment.
- Offline scanning still depends on manifests downloaded beforehand. A tunnel does not change the offline sync rules.
