## Setting Firebase Custom Claims for Admin Access

Prerequisites:
- Ensure `GOOGLE_APPLICATION_CREDENTIALS` points to a service account JSON (or ADC is available).

Example:
```bash
cd services/api
node scripts/setClaims.mjs <FIREBASE_UID> tenant_admin powerpulsetech
```

Notes:
- Arguments: `<uid> [role] [tenantId]` (role defaults to `tenant_admin`, tenantId defaults to `powerpulsetech`).
- After setting claims, the user must logout/login (or refresh token) in web-admin for new claims to apply.
