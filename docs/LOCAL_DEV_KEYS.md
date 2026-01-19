Local Dev Keys

Firebase Admin Credentials (Local)
- Set GOOGLE_APPLICATION_CREDENTIALS to your local service account key.
- PowerShell example:
  $env:GOOGLE_APPLICATION_CREDENTIALS="D:\chandanest\secrets\chandanest-dev-sa.json"
  cd services/api
  npm run auth:create-test-users
- Keep the key file outside the repo and never commit it.

Firebase Web API Key (Localhost Referrers)
If web-admin login fails with API_KEY_HTTP_REFERRER_BLOCKED, update your Firebase Web API key referrers:
1) Google Cloud Console → APIs & Services → Credentials → Web API key used by web-admin.
2) Add these HTTP referrers:
   - http://localhost:5173/*
   - http://localhost:5174/*
   - http://127.0.0.1:5173/*
   - http://127.0.0.1:5174/*
3) Save and retry login.

Notes:
- The web-admin Firebase config lives in apps/web-admin/src/services/firebase.ts.
- The API key itself should remain in local env (VITE_FIREBASE_API_KEY) and not be committed.
