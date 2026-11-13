# EUEvent student and security mobile app

This Expo / React Native app supports both student and security-staff accounts.

- **Students** sign in with their institutional account, load their tickets, and display a QR proof generated on-device. The proof rotates every 30 seconds; the ticket seed is kept in Expo SecureStore.
- **Security staff** sign in with their staff account, see only assigned gates, download a gate manifest, and scan student tickets. The scanner validates the rotating proof against the local manifest and queues scans while offline.
- **Offline sync** stores pending scan data in an encrypted SQLite queue. Each optical scan keeps the same UUID when retried. The app syncs batches when the Laravel API is reachable again.

The team considers the agreed MVP feature scope complete. Offline admission remains provisional until server reconciliation; see [the event-day runbook](../docs/event-day-runbook.md) before operating at a venue.

## Run on Fedora with Expo Go

For the isolated Lerd presentation setup, first prepare and start the local API as described in the [backend presentation guide](../backend/README.md#local-presentation-mode).

Then, from `security-scanner/`:

```bash
npm install
npm run start:lan
```

The LAN launcher checks the API on port 8002, detects Fedora's active LAN IPv4 address, and starts Expo Go with the matching `/api/v1` base URL. Keep the Metro terminal open during the demo and connect the phone to the same Wi-Fi as Fedora.

If the app has an old server address saved, open the app's server settings, enter the full API base URL including `/api/v1`, test it, and save it. For example:

```text
http://<FEDORA_LAN_IP>:8002/api/v1
```

Changing the server clears the saved sign-in because each API issues its own session token. Session tokens and student ticket seeds are kept in Expo SecureStore.

## Build and install an Android APK

The `preview` profile in `eas.json` creates an installable APK. The local Fedora flow below uses the installed Android SDK, embeds the JavaScript bundle, and allows cleartext HTTP only when `EUEVENT_LOCAL_DEMO_HTTP=true`. Use it only on a trusted local presentation network. Hosted or real-user deployments must use HTTPS.

From `security-scanner/`:

```bash
npm ci
export EUEVENT_LOCAL_DEMO_HTTP=true
export EXPO_PUBLIC_API_BASE_URL="http://<FEDORA_LAN_IP>:8002/api/v1"
npx expo prebuild --platform android
cd android
./gradlew assembleRelease
cd ..
adb devices -l
adb install -r android/app/build/outputs/apk/release/app-release.apk
```

Set `<FEDORA_LAN_IP>` to Fedora's active Wi-Fi address (`ip -brief -4 addr`). The local presentation API must be listening on port `8002`. The app's Server settings can update this address later if DHCP changes. `EUEVENT_LOCAL_DEMO_HTTP` is a build-time flag: do not enable it for builds that send credentials or ticket data across an untrusted network.

The generated APK is at `android/app/build/outputs/apk/release/app-release.apk`. Check that it is installed and launch it from the phone's app list. To install a downloaded APK over USB from Fedora, use `adb install -r /path/to/app-release.apk`; ADB must show the phone as `device` in `adb devices -l`.

For a cloud-signed APK, first link this app to the team's Expo project, then run:

```bash
npx eas-cli@latest build --platform android --profile preview
```

Expo's default Android build is an `.aab`; the `preview` profile explicitly requests an `.apk` for direct device installation. A local Gradle build and an EAS-signed build may use different signing keys, so keep each build lineage consistent when replacing an already-installed app.

## Before doors open

1. Sign in as security staff and download the manifest for the assigned event gate while connected.
2. Have students load their tickets before they approach the entrance.
3. The scanner can validate downloaded tickets and queue results without reaching Laravel. Reconnect later to submit pending batches and receive server decisions.

The scanner device clock is the time reference for validating a rotating QR code. A cancellation or revocation made while a scanner is offline cannot reach that device immediately; its local decision remains provisional until sync.

## Checks

```bash
npm run lint
npx tsc --noEmit
```

The APK build process and device install command are also summarized in the [Fedora setup guide](../docs/setup-guide.md#build-and-install-the-android-apk).
