#!/usr/bin/env bash
# Opens EUEvent to phones on any network:
#   - Laravel API      -> Cloudflare quick tunnel (https://<random>.trycloudflare.com)
#   - Admin dashboard  -> Cloudflare quick tunnel (only if Vite is already running)
#   - Expo app         -> Expo's own tunnel, preconfigured with the API tunnel URL
#
# Start the API (and optionally `npm run dev` in admin-web) first, then run:
#   bash scripts/start-tunnels.sh            # tunnels + Expo app
#   bash scripts/start-tunnels.sh --no-expo  # tunnels only
#
# Quick-tunnel URLs change every run. Anyone with a URL can reach that service,
# so use demo data and strong passwords. Press Ctrl+C to close every tunnel.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
API_PORT="${API_PORT:-8002}"
DASHBOARD_PORT="${DASHBOARD_PORT:-5173}"
START_EXPO=1
[[ "${1:-}" == "--no-expo" ]] && START_EXPO=0

LOG_DIR="$(mktemp -d)"
TUNNEL_PIDS=()

cleanup() {
  for pid in "${TUNNEL_PIDS[@]}"; do
    kill "$pid" 2>/dev/null || true
  done
  rm -rf "$LOG_DIR"
}
trap cleanup EXIT
trap 'exit 130' INT TERM

if ! command -v cloudflared >/dev/null 2>&1; then
  echo "cloudflared is not installed."
  echo "Fedora: sudo dnf install cloudflared  (or download it from https://github.com/cloudflare/cloudflared/releases)"
  exit 1
fi

http_status() {
  curl --silent --output /dev/null --write-out '%{http_code}' \
    --connect-timeout 3 --max-time 6 --header 'Accept: application/json' "$1" || true
}

# Starts a quick tunnel to a local port and stores its public URL in TUNNEL_URL.
# (Not called through $(...) so the tunnel's PID stays in this shell for cleanup.)
TUNNEL_URL=""
start_tunnel() {
  local name="$1" port="$2" log="$LOG_DIR/$1.log"
  TUNNEL_URL=""
  cloudflared tunnel --no-autoupdate --url "http://localhost:$port" >"$log" 2>&1 &
  TUNNEL_PIDS+=("$!")
  for _ in $(seq 1 30); do
    TUNNEL_URL="$(grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' "$log" | head -n 1 || true)"
    [[ -n "$TUNNEL_URL" ]] && return 0
    sleep 1
  done
  echo "Could not open the $name tunnel. cloudflared output:" >&2
  cat "$log" >&2
  exit 1
}

LOCAL_API_STATUS="$(http_status "http://localhost:$API_PORT/api/v1/auth/me")"
if [[ "$LOCAL_API_STATUS" != "200" && "$LOCAL_API_STATUS" != "401" ]]; then
  echo "The EUEvent API is not answering on port $API_PORT (HTTP $LOCAL_API_STATUS)."
  echo "Start it first, for example: backend/scripts/start-presentation-demo.sh"
  exit 1
fi

echo "Opening the API tunnel..."
start_tunnel api "$API_PORT"
API_BASE_URL="$TUNNEL_URL/api/v1"

# New quick-tunnel hostnames can take a few seconds to resolve. Checking too early can
# cache a failed DNS lookup, so wait briefly first.
sleep 8
PUBLIC_STATUS=""
for _ in $(seq 1 20); do
  PUBLIC_STATUS="$(http_status "$API_BASE_URL/auth/me")"
  [[ "$PUBLIC_STATUS" == "200" || "$PUBLIC_STATUS" == "401" ]] && break
  sleep 2
done
if [[ "$PUBLIC_STATUS" != "200" && "$PUBLIC_STATUS" != "401" ]]; then
  echo "Note: this computer could not reach $API_BASE_URL yet (HTTP $PUBLIC_STATUS). Phones usually can; try the link in a phone browser."
fi

DASHBOARD_TUNNEL_URL=""
if [[ "$(http_status "http://localhost:$DASHBOARD_PORT/")" != "000" ]]; then
  echo "Opening the dashboard tunnel..."
  start_tunnel dashboard "$DASHBOARD_PORT"
  DASHBOARD_TUNNEL_URL="$TUNNEL_URL"
fi

echo
echo "================ EUEvent public links ================"
echo "API (enter in the app's Server settings): $API_BASE_URL"
if [[ -n "$DASHBOARD_TUNNEL_URL" ]]; then
  echo "Admin dashboard:                          $DASHBOARD_TUNNEL_URL"
else
  echo "Admin dashboard: not shared (start it with 'npm run dev' in admin-web/, then rerun)"
fi
echo "======================================================="
echo "Phones that saved an older server URL must update it in the app's Server settings."
echo

if [[ "$START_EXPO" == "1" ]]; then
  cd "$ROOT_DIR/security-scanner"
  EXPO_PUBLIC_API_BASE_URL="$API_BASE_URL" npx expo start --tunnel --go
else
  echo "Tunnels are open. Press Ctrl+C to close them."
  wait
fi
