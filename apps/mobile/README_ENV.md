# Environment Run Commands

Mock mode:
```bash
flutter run --dart-define=USE_MOCK=true
```

Real mode:
```bash
flutter run --dart-define=USE_MOCK=false --dart-define=API_BASE_URL=https://<your-api>
```

## App Check notes

- Debug builds use the App Check debug provider and do not block local dev.
- Release builds use Play Integrity (Android) and DeviceCheck (iOS).
- To test App Check debug tokens, run the app in debug and use the token printed in logs by the Firebase SDK to register it in the Firebase console.
- To add Android debug SHA-256 fingerprints:
  - From `apps/mobile/android`: `./gradlew signingReport`
  - Copy the SHA-256 for the debug keystore into the Firebase console.

## Config approach

- This app uses `--dart-define` for environment switching (no product flavors configured).
- Optional build metadata:
  - `--dart-define=APP_VERSION=<semver>`
  - `--dart-define=BUILD_NUMBER=<int>`
