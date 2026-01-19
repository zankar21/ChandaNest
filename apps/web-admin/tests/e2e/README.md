# Playwright E2E Setup (Phase 8)

## Start servers
Run these in separate terminals:
- `services/api`: `npm run dev`
- `apps/web-admin`: `npm run dev -- --host 127.0.0.1 --port 5174`
- `apps/web-public`: `npm run dev -- --host 127.0.0.1 --port 5175`

## Generate storage state (no credentials in repo)
1) Create local folder:
   - `mkdir apps/web-admin/.auth`
2) Run Playwright codegen:
   - `cd apps/web-admin`
   - `npx playwright codegen http://127.0.0.1:5174`
3) Login manually in the browser window.
4) Save storage state to:
   - `apps/web-admin/.auth/admin.json`
   - (optional) `apps/web-admin/.auth/user.json`

## Set env vars
PowerShell:
- `$env:PW_STORAGE_ADMIN="apps/web-admin/.auth/admin.json"`
- `$env:PW_STORAGE_USER="apps/web-admin/.auth/user.json"` (optional)
- `$env:PW_ADMIN_BASE_URL="http://127.0.0.1:5174"`
- `$env:PW_PUBLIC_BASE_URL="http://127.0.0.1:5175"`

Optional test data (skip if missing):
- `$env:PW_TEST_USER_B_UID="uid-for-member-add"`
- `$env:PW_TEST_OWNER_UID="ownerUid"`
- `$env:PW_TEST_OWNER_LISTING_ID="ownerListingId"`
- `$env:PW_TEST_PUBLIC_PROPERTY_ID="publicPropertyId"`
- `$env:PW_TEST_VERIFY_ORG_TYPE="agency"` or `"enterprise"`
- `$env:PW_TEST_VERIFY_ORG_ID="orgId"`

Run-state bootstrap (local-only):
- On first run, `globalSetup` will create an agency/enterprise/project/listing and save IDs to:
  - `apps/web-admin/.auth/run-state.json`
- Tests will prefer these IDs when env vars are missing.

## Run tests
- `npm run e2e:install`
- `npm run e2e`

## One-time auth setup (admin storageState)
Run:
- `PW_SKIP_GLOBAL_SETUP=1 npx playwright test tests/e2e/00_auth_setup.spec.ts --headed --project=admin`
After logging in as tenant_admin, click “Resume” in Playwright Inspector to save `.auth/admin.json`.

Notes:
- Auth storage files are local-only and gitignored.
- Tests skip gracefully when required env vars are missing.
