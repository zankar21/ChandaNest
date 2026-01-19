# Mobile Release Checklist

## Environment setup
- Dev (mock): `USE_MOCK=true`
- Dev (real API): `USE_MOCK=false` + `API_BASE_URL=https://<dev-api>`
- Staging: `USE_MOCK=false` + `API_BASE_URL=https://<staging-api>`
- Prod: `USE_MOCK=false` + `API_BASE_URL=https://<prod-api>`
- Optional build metadata: `APP_VERSION=<semver>` + `BUILD_NUMBER=<int>`

## Firebase config reminders
- Add `google-services.json` in `android/app` for each environment as needed.
- Add `GoogleService-Info.plist` in `ios/Runner` for each environment as needed.
- Verify Firebase project matches API base environment.

## App Check enablement
- Debug: use App Check debug provider; register debug token in Firebase console.
- Release Android: enable Play Integrity in Firebase console.
- Release iOS: enable DeviceCheck in Firebase console.
- Backend must allow App Check optional in dev if needed.

## Required permissions
- Android: photo picker or storage permissions for image selection if required by OS.
- iOS: photo library usage description if image selection is enabled.

## Manual test suite
- Public browse: Home, Explore, Map
- Details: gallery, location, nearby, enquiry CTA
- Enquiry: submit success and failure
- Owner CRUD: create, edit, save
- Upload: at least one image via signed PUT
- Publish/Unpublish: status changes and visibility in public browse

## Failure cases
- 401: token missing or expired
- Network offline
- App Check missing in production writes
- Token refresh retry once on 401

## Performance sanity checks
- Scroll performance on Home/Explore
- Image loading and caching behavior
- Details page rendering with multiple images

## Security checks
- No secrets or tokens stored in code or logs
- HTTPS only for API base URL
- Signed URLs used for media

## Release build commands
- Android APK: `flutter build apk --release --dart-define=USE_MOCK=false --dart-define=API_BASE_URL=https://<prod-api>`
- Android AAB: `flutter build appbundle --release --dart-define=USE_MOCK=false --dart-define=API_BASE_URL=https://<prod-api>`
- iOS: `flutter build ios --release --dart-define=USE_MOCK=false --dart-define=API_BASE_URL=https://<prod-api>`
