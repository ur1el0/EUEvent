---
trigger: always_on
---

# Rule 07: React Native Expo Mobile Standards

These standards govern the two mobile end-user applications: the Student ticket app and the Security Staff offline scanner app. Administrators use the desktop web dashboard.

### 1. Model Layer: `expo-sqlite` & `expo-secure-store`
* **Rule:** Native database operations and keychain calls must be isolated in service abstractions.
* **Practice:**
  * Use `expo-sqlite` for structured local tables (`local_manifest`, `pending_sync_queue`). Never write raw SQLite queries inside UI components.
  * Use `expo-secure-store` exclusively for cryptographic ticket secrets and auth tokens.

### 2. Controller Layer: Custom Hooks & Service Handlers
* **Rule:** Screens must be pure declarative UI views.
* **Practice:**
  * Extract camera scanning and barcode evaluation into `useTicketScanner`.
  * Extract TOTP token calculation and timer updates into `useTotpTicket`.
  * Extract queue sync into `useSyncQueue`.

### 3. Scanner HUD & Feedback
* **Rule:** Scanner UI must provide unambiguous, immediate feedback after code capture.
* **Practice:**
  * Display text and high-contrast status treatments for accepted locally, invalid, expired, wrong gate, already claimed, and event inactive. Do not use color alone.
  * Make it clear that offline acceptance is provisional until server sync.
  * Manual admission overrides are not implemented; direct exceptions to the event lead's physical procedure.
  * Account deactivation and manifest refresh cannot reach a disconnected phone. State this limitation to administrators and gate operators.
