# 05 - Mobile Student Ticket Wallet Architecture (React Native Expo)

> **Status:** Historical design reference. Some behavior below is planned or superseded. For current behavior, see [the current architecture](../docs/architecture.md), [API guide](../docs/api.md), and [security notes](../.agents/SECURITY.md); source code and tests are authoritative.

## 1. Overview
The Student Ticket Wallet provides a student's issued tickets and generates a rotating QR proof on-device. The proof changes every 30 seconds, which limits how long an old image can be used; it does not prevent a screenshot from being replayed during the same active time step.

---

## 2. Technical Stack
* **Framework:** React Native Expo (TypeScript).
* **Cryptographic Engine:** `otpauth` (RFC 6238 standard).
* **Hardware Storage:** `expo-secure-store` (iOS Keychain / Android Keystore).
* **QR Renderer:** `react-native-qrcode-svg` (pure vector rendering avoiding native bitmap compression artifacts).

---

## 3. Dynamic QR Payload & Lifecycle

### 3.1 QR String Payload Structure
```
EUEVENT1:{ticket_id}:{step}:{code}
Example: EUEVENT1:10492:59664480:839201
```

### 3.2 30-Second Refresh Cycle
1. `useTotpTicket` hook calculates remaining seconds until the next 30-second epoch step:
   $$\text{remaining} = 30 - (\text{Math.floor}(\text{Date.now}() / 1000) \pmod{30})$$
2. Computes the active 6-digit token using `otpauth.TOTP.generate()`.
3. Renders the QR vector code alongside a smooth visual circular progress bar indicating time until the token rotates.
4. When `remaining == 0`, generates the next token automatically without flickering or network calls.

---

## 4. Screenshot replay boundary

The scanner accepts only the exact current 30-second step (`drift = 0`). A screenshot copied during that step may still be accepted if the scanner has not already claimed the ticket. The same scanner blocks a later local duplicate, but another disconnected scanner cannot see that claim. Rotation narrows the replay window; it does not prove identity or that the student is holding the live app. Keep both device clocks set to automatic.
